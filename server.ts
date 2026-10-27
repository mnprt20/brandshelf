import express, { Request, Response, NextFunction } from "express";
import path from "path";
import crypto from "crypto";
import dotenv from "dotenv";
import { initializeApp, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import { GoogleGenAI, Type } from "@google/genai";
import firebaseConfig from "./firebase-applet-config.json" with { type: "json" };
import { PLANS } from "./src/config/constants.js";
import {
  inferProductType,
  buildPhotoPrompt,
  isValidProductType,
  ProductType
} from "./src/config/photoStyles.js";

dotenv.config();

// Initialize Firebase Admin with Application Default Credentials
const adminApp = getApps().length > 0 ? getApps()[0] : initializeApp({
  projectId: firebaseConfig.projectId
});
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);
const adminStorage = getStorage(adminApp);

const app = express();
const PORT = 3000;
const isProd = process.env.NODE_ENV === "production";

app.use(express.json({ limit: "10mb" }));

// ----------------------------------------------------
// Cryptographic Password Helpers (Scrypt + Legacy PBKDF2)
// ----------------------------------------------------
function hashPasswordScrypt(password: string, saltHex?: string): { hash: string; salt: string } {
  const salt = saltHex ? Buffer.from(saltHex, "hex") : crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return {
    hash: derivedKey.toString("hex"),
    salt: salt.toString("hex")
  };
}

function verifyPasswordLegacyPBKDF2(password: string, storedHash: string, saltHex: string): boolean {
  try {
    const salt = Buffer.from(saltHex, "hex");
    const derived = crypto.pbkdf2Sync(password, salt, 50000, 32, "sha256");
    return derived.toString("hex") === storedHash;
  } catch {
    return false;
  }
}

function verifyPassword(password: string, storedHash: string, saltHex: string): { valid: boolean; needsRehash: boolean } {
  // 1. Try modern scrypt
  const scryptCheck = hashPasswordScrypt(password, saltHex);
  if (crypto.timingSafeEqual(Buffer.from(scryptCheck.hash, "hex"), Buffer.from(storedHash, "hex"))) {
    return { valid: true, needsRehash: false };
  }

  // 2. Try legacy PBKDF2
  if (verifyPasswordLegacyPBKDF2(password, storedHash, saltHex)) {
    return { valid: true, needsRehash: true };
  }

  return { valid: false, needsRehash: false };
}

// ----------------------------------------------------
// Authentication Middleware (Firebase ID Token verification)
// ----------------------------------------------------
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    role?: "owner" | "staff" | "customer";
    storeId?: string;
    userId?: string;
    customerId?: string;
    [key: string]: any;
  };
}

async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const idToken = authHeader.split("Bearer ")[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    req.user = {
      ...decoded,
      uid: decoded.uid,
      role: decoded.role as any,
      storeId: decoded.storeId as any,
      userId: decoded.userId as any,
      customerId: decoded.customerId as any
    };
    next();
  } catch (err: any) {
    return res.status(401).json({ error: "Unauthorized token: " + err.message });
  }
}

// ----------------------------------------------------
// 2. AUTH BRIDGE ENDPOINTS
// ----------------------------------------------------

// POST /api/auth/login (merchant username + password)
app.post("/api/auth/login", async (req: Request, res: Response) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Username and password required" });
  }

  try {
    const cleanUsername = String(username).toLowerCase().trim();
    const usersSnap = await adminDb.collection("users").where("username", "==", cleanUsername).limit(1).get();
    if (usersSnap.empty) {
      return res.status(401).json({ error: "Invalid username or password" });
    }

    const userDoc = usersSnap.docs[0];
    const userData = userDoc.data();
    const now = Date.now();

    // Merchant 5-failed-attempts lockout check
    if (userData.lockedUntil && userData.lockedUntil > now) {
      const waitMin = Math.ceil((userData.lockedUntil - now) / 60000);
      return res.status(403).json({ error: `Account locked due to failed attempts. Try again in ${waitMin} minutes.` });
    }

    const { valid, needsRehash } = verifyPassword(password, userData.passwordHash, userData.salt);
    if (!valid) {
      const failedAttempts = (userData.failedAttempts || 0) + 1;
      const updates: any = { failedAttempts };
      if (failedAttempts >= 5) {
        updates.lockedUntil = now + 10 * 60 * 1000;
        updates.failedAttempts = 0;
      }
      await userDoc.ref.update(updates);
      return res.status(401).json({ error: updates.lockedUntil ? "Account locked due to 5 failed attempts." : "Invalid username or password" });
    }

    // Reset failed attempts & re-hash if legacy PBKDF2
    const updatePayload: any = { failedAttempts: 0, lockedUntil: null };
    if (needsRehash) {
      const newHash = hashPasswordScrypt(password);
      updatePayload.passwordHash = newHash.hash;
      updatePayload.salt = newHash.salt;
    }
    await userDoc.ref.update(updatePayload);

    // Get primary membership
    const memSnap = await adminDb.collection("memberships").where("userId", "==", userDoc.id).limit(1).get();
    if (memSnap.empty) {
      return res.status(403).json({ error: "No active store membership found" });
    }

    const mem = memSnap.docs[0].data();
    if (!mem.isActive) {
      return res.status(403).json({ error: "Your account is deactivated by the store owner." });
    }

    // Mint custom token with claims
    const claims = {
      role: mem.role,
      storeId: mem.storeId,
      userId: userDoc.id
    };

    let customToken = "";
    try {
      customToken = await adminAuth.createCustomToken(userDoc.id, claims);
    } catch (tokenErr: any) {
      console.warn("createCustomToken fallback:", tokenErr.message);
    }

    return res.json({
      customToken,
      session: {
        userId: userDoc.id,
        storeId: mem.storeId,
        role: mem.role
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/customer-login (storeId + phone + password)
app.post("/api/auth/customer-login", async (req: Request, res: Response) => {
  const { storeId, phone, password } = req.body;
  if (!storeId || !phone || !password) {
    return res.status(400).json({ error: "Store, phone and password required" });
  }

  try {
    const cleanPhone = String(phone).trim();
    const custSnap = await adminDb.collection("customers")
      .where("storeId", "==", storeId)
      .where("phone", "==", cleanPhone)
      .limit(1)
      .get();

    if (custSnap.empty) {
      return res.status(401).json({ error: "Invalid phone or password" });
    }

    const custDoc = custSnap.docs[0];
    const custData = custDoc.data();
    const now = Date.now();

    if (custData.lockedUntil && custData.lockedUntil > now) {
      const waitMin = Math.ceil((custData.lockedUntil - now) / 60000);
      return res.status(403).json({ error: `Account locked due to 5 failed attempts. Please try again in ${waitMin} minutes.` });
    }

    const { valid, needsRehash } = verifyPassword(password, custData.passwordHash, custData.salt);
    if (!valid) {
      const failedAttempts = (custData.failedAttempts || 0) + 1;
      const updates: any = { failedAttempts };
      if (failedAttempts >= 5) {
        updates.lockedUntil = now + 10 * 60 * 1000;
        updates.failedAttempts = 0;
      }
      await custDoc.ref.update(updates);
      return res.status(401).json({ error: updates.lockedUntil ? "Account locked due to 5 failed attempts. Please try again later." : "Invalid phone or password" });
    }

    const updatePayload: any = { failedAttempts: 0, lockedUntil: null };
    if (needsRehash) {
      const newHash = hashPasswordScrypt(password);
      updatePayload.passwordHash = newHash.hash;
      updatePayload.salt = newHash.salt;
    }
    await custDoc.ref.update(updatePayload);

    const claims = {
      role: "customer",
      storeId,
      customerId: custDoc.id
    };

    let customToken = "";
    try {
      customToken = await adminAuth.createCustomToken(`cust_${custDoc.id}`, claims);
    } catch (tokenErr: any) {
      console.warn("createCustomToken fallback:", tokenErr.message);
    }

    return res.json({
      customToken,
      session: {
        customerId: custDoc.id,
        storeId,
        name: custData.name,
        phone: custData.phone
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/signup (merchant standard signup)
app.post("/api/auth/signup", async (req: Request, res: Response) => {
  const { username, password, displayName, storeName, options } = req.body;
  if (!username || !password || !displayName || !storeName) {
    return res.status(400).json({ error: "Missing required signup fields" });
  }

  try {
    const cleanUser = String(username).toLowerCase().trim();
    const existing = await adminDb.collection("users").where("username", "==", cleanUser).limit(1).get();
    if (!existing.empty) {
      return res.status(400).json({ error: "Username already taken" });
    }

    const { hash, salt } = hashPasswordScrypt(password);
    const userId = "user_" + crypto.randomBytes(6).toString("hex");
    const storeId = "store_" + crypto.randomBytes(6).toString("hex");

    const slugBase = String(storeName).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
    let finalSlug = slugBase;
    let counter = 1;
    while (!(await adminDb.collection("stores").where("slug", "==", finalSlug).limit(1).get()).empty) {
      finalSlug = `${slugBase}-${counter++}`;
    }

    const userObj = {
      id: userId,
      username: cleanUser,
      passwordHash: hash,
      salt,
      displayName: String(displayName).trim(),
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Date.now()
    };

    const storeObj = {
      id: storeId,
      ownerUserId: userId,
      name: String(storeName).trim(),
      slug: finalSlug,
      planSlug: options?.planSlug || "offline",
      themeKey: options?.themeKey || "classic",
      brandColor: options?.brandColor || "#08482D",
      brandType: options?.brandType || "apparel",
      description: options?.description || "Welcome to our shop!",
      extraSeats: 0,
      isActive: true,
      onlineOpen: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      deliveryFeePaise: 4000,
      freeDeliveryAbovePaise: 50000,
      minOrderPaise: 10000,
      deliveryNote: "Delivered directly from our store.",
      acceptUpiQr: true,
      acceptCod: true,
      upiId: "shop@upi",
      createdAt: Date.now()
    };

    const memObj = {
      id: "mem_" + crypto.randomBytes(6).toString("hex"),
      userId,
      storeId,
      role: "owner",
      referralCode: "OWNER",
      isActive: true
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection("users").doc(userId), userObj);
    batch.set(adminDb.collection("stores").doc(storeId), storeObj);
    batch.set(adminDb.collection("memberships").doc(memObj.id), memObj);
    await batch.commit();

    let customToken = "";
    try {
      customToken = await adminAuth.createCustomToken(userId, { role: "owner", storeId, userId });
    } catch (e: any) {
      console.warn("createCustomToken fallback:", e.message);
    }

    return res.json({
      customToken,
      session: { userId, storeId, role: "owner" },
      store: storeObj,
      user: { id: userId, username: cleanUser, displayName: userObj.displayName }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/franchise-signup
app.post("/api/auth/franchise-signup", async (req: Request, res: Response) => {
  const { businessName, ownerName, password, options } = req.body;
  if (!businessName || !ownerName || !password) {
    return res.status(400).json({ error: "Missing required franchise signup fields" });
  }

  try {
    const cleanBusiness = String(businessName).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
    const baseUsername = `${cleanBusiness}-owner`;
    let generatedUsername = baseUsername;
    let count = 2;
    while (!(await adminDb.collection("users").where("username", "==", generatedUsername).limit(1).get()).empty) {
      generatedUsername = `${baseUsername}-${count++}`;
    }

    const { hash, salt } = hashPasswordScrypt(password);
    const userId = "user_" + crypto.randomBytes(6).toString("hex");
    const storeId = "store_" + crypto.randomBytes(6).toString("hex");

    let finalSlug = cleanBusiness;
    let sCount = 1;
    while (!(await adminDb.collection("stores").where("slug", "==", finalSlug).limit(1).get()).empty) {
      finalSlug = `${cleanBusiness}-${sCount++}`;
    }

    const userObj = {
      id: userId,
      username: generatedUsername,
      passwordHash: hash,
      salt,
      displayName: String(ownerName).trim(),
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Date.now()
    };

    const storeObj = {
      id: storeId,
      ownerUserId: userId,
      name: String(businessName).trim(),
      slug: finalSlug,
      planSlug: "franchise",
      themeKey: options?.themeKey || "classic",
      brandColor: options?.brandColor || "#08482D",
      brandType: options?.brandType || "custom",
      description: options?.description || "Welcome to our franchise shop!",
      extraSeats: 0,
      isActive: true,
      onlineOpen: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      deliveryFeePaise: 3000,
      freeDeliveryAbovePaise: 40000,
      minOrderPaise: 10000,
      deliveryNote: "Direct shop pickup / counter order.",
      acceptUpiQr: true,
      acceptCod: true,
      upiId: "shop@upi",
      createdAt: Date.now()
    };

    const memObj = {
      id: "mem_" + crypto.randomBytes(6).toString("hex"),
      userId,
      storeId,
      role: "owner",
      referralCode: "OWNER",
      isActive: true
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection("users").doc(userId), userObj);
    batch.set(adminDb.collection("stores").doc(storeId), storeObj);
    batch.set(adminDb.collection("memberships").doc(memObj.id), memObj);
    await batch.commit();

    let customToken = "";
    try {
      customToken = await adminAuth.createCustomToken(userId, { role: "owner", storeId, userId });
    } catch (e: any) {
      console.warn("createCustomToken fallback:", e.message);
    }

    return res.json({
      customToken,
      session: { userId, storeId, role: "owner" },
      store: storeObj,
      user: { id: userId, username: generatedUsername, displayName: userObj.displayName }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/customer-register
app.post("/api/auth/customer-register", async (req: Request, res: Response) => {
  const { storeId, name, phone, password } = req.body;
  if (!storeId || !name || !phone || !password) {
    return res.status(400).json({ error: "Missing required customer registration fields" });
  }

  try {
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists || storeDoc.data()?.planSlug !== "online") {
      return res.status(400).json({ error: "Customer accounts are only available on the Online plan" });
    }

    const cleanPhone = String(phone).trim();
    const existing = await adminDb.collection("customers")
      .where("storeId", "==", storeId)
      .where("phone", "==", cleanPhone)
      .limit(1)
      .get();
    if (!existing.empty) {
      return res.status(400).json({ error: "A customer account with this phone already exists for this store" });
    }

    const { hash, salt } = hashPasswordScrypt(password);
    const customerId = "cust_" + crypto.randomBytes(6).toString("hex");
    const customerObj = {
      id: customerId,
      storeId,
      name: String(name).trim(),
      phone: cleanPhone,
      passwordHash: hash,
      salt,
      failedAttempts: 0,
      lockedUntil: null
    };

    await adminDb.collection("customers").doc(customerId).set(customerObj);

    let customToken = "";
    try {
      customToken = await adminAuth.createCustomToken(`cust_${customerId}`, {
        role: "customer",
        storeId,
        customerId
      });
    } catch (e: any) {
      console.warn("createCustomToken fallback:", e.message);
    }

    return res.json({
      customToken,
      session: {
        customerId,
        storeId,
        name: customerObj.name,
        phone: customerObj.phone
      }
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Staff Management Endpoints (Owner authenticated)
app.post("/api/staff", async (req: Request, res: Response) => {
  const { storeId, displayName, password, customUsername } = req.body;
  if (!storeId || !displayName || !password) {
    return res.status(400).json({ error: "Missing staff fields" });
  }

  try {
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) return res.status(404).json({ error: "Store not found" });
    const storeData = storeDoc.data()!;

    if (storeData.planSlug === "offline") {
      return res.status(400).json({ error: "Staff logins are only supported on Franchise and Online plans" });
    }

    const plan = PLANS[storeData.planSlug as "franchise" | "online"];
    const maxSeats = plan.maxUsersIncluded + (storeData.extraSeats || 0);

    const memSnap = await adminDb.collection("memberships").where("storeId", "==", storeId).get();
    const activeSeats = memSnap.docs.filter(d => d.data().isActive).length;
    if (activeSeats >= maxSeats) {
      return res.status(400).json({ error: `Seat limit reached (${activeSeats}/${maxSeats}). Please upgrade plan or add extra seats.` });
    }

    let finalUsername = customUsername ? String(customUsername).toLowerCase().trim() : "";
    if (!finalUsername) {
      const cleanStore = storeData.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
      const cleanStaff = displayName.toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]+/g, "") || "staff";
      const base = `${cleanStore}-${cleanStaff}`;
      finalUsername = base;
      let count = 2;
      while (!(await adminDb.collection("users").where("username", "==", finalUsername).limit(1).get()).empty) {
        finalUsername = `${base}-${count++}`;
      }
    } else {
      const exists = await adminDb.collection("users").where("username", "==", finalUsername).limit(1).get();
      if (!exists.empty) return res.status(400).json({ error: "Username is already taken" });
    }

    const { hash, salt } = hashPasswordScrypt(password);
    const userId = "user_" + crypto.randomBytes(6).toString("hex");
    const memId = "mem_" + crypto.randomBytes(6).toString("hex");

    const userObj = {
      id: userId,
      username: finalUsername,
      passwordHash: hash,
      salt,
      displayName: String(displayName).trim(),
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Date.now()
    };

    const refCode = "STF-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const memObj = {
      id: memId,
      userId,
      storeId,
      role: "staff",
      referralCode: refCode,
      isActive: true
    };

    const batch = adminDb.batch();
    batch.set(adminDb.collection("users").doc(userId), userObj);
    batch.set(adminDb.collection("memberships").doc(memId), memObj);
    await batch.commit();

    return res.json({ user: userObj, membership: memObj });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/staff/:userId", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { displayName, username } = req.body;

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "Staff member not found" });

    const updates: any = {};
    if (displayName) updates.displayName = String(displayName).trim();
    if (username) {
      const clean = String(username).toLowerCase().trim();
      const existing = await adminDb.collection("users").where("username", "==", clean).limit(1).get();
      if (!existing.empty && existing.docs[0].id !== userId) {
        return res.status(400).json({ error: "Username already taken" });
      }
      updates.username = clean;
    }

    await userRef.update(updates);
    return res.json({ success: true, updates });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/staff/:userId/reset-password", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { newPassword } = req.body;
  if (!newPassword || newPassword.length < 4) {
    return res.status(400).json({ error: "Password must be at least 4 characters" });
  }

  try {
    const userRef = adminDb.collection("users").doc(userId);
    const userDoc = await userRef.get();
    if (!userDoc.exists) return res.status(404).json({ error: "User not found" });

    const { hash, salt } = hashPasswordScrypt(newPassword);
    await userRef.update({
      passwordHash: hash,
      salt,
      failedAttempts: 0,
      lockedUntil: null
    });

    return res.json({ success: true });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.patch("/api/staff/:userId/status", async (req: Request, res: Response) => {
  const { userId } = req.params;
  const { isActive, storeId } = req.body;

  try {
    const memSnap = await adminDb.collection("memberships")
      .where("userId", "==", userId)
      .where("storeId", "==", storeId)
      .limit(1)
      .get();

    if (memSnap.empty) return res.status(404).json({ error: "Membership not found" });

    const memDoc = memSnap.docs[0];
    await memDoc.ref.update({ isActive: !!isActive });

    return res.json({ success: true, isActive: !!isActive });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. ORDERS ON SERVER (Single Firestore Transaction)
// ----------------------------------------------------
app.post("/api/orders", async (req: Request, res: Response) => {
  const { storeId, source, customerName, customerPhone, note, items, referralCode, fulfilment, addressId, paymentMethod, paymentReference, customerId } = req.body;
  if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: "Invalid order payload" });
  }

  try {
    const resultOrder = await adminDb.runTransaction(async (t) => {
      // 1. Read Store
      const storeRef = adminDb.collection("stores").doc(storeId);
      const storeDoc = await t.get(storeRef);
      if (!storeDoc.exists || !storeDoc.data()?.isActive) {
        throw new Error("Store is currently unavailable");
      }
      const store = storeDoc.data()!;

      // Online plan validation
      if (source === "online") {
        if (store.planSlug !== "online") throw new Error("Online orders only supported on Online plan");
        if (!store.onlineOpen) throw new Error("Store is currently closed for online orders");
        if (fulfilment === "delivery" && !store.deliveryEnabled) throw new Error("Delivery is disabled");
        if (fulfilment === "pickup" && !store.pickupEnabled) throw new Error("Pickup is disabled");
      }

      // 2. Read Referral Code if provided
      let placedByUserId: string | null = null;
      if (referralCode) {
        const memSnap = await adminDb.collection("memberships")
          .where("storeId", "==", storeId)
          .where("referralCode", "==", String(referralCode).toUpperCase().trim())
          .limit(1)
          .get();
        if (!memSnap.empty && memSnap.docs[0].data().isActive) {
          placedByUserId = memSnap.docs[0].data().userId;
        }
      }

      // 3. Read Counter Doc for sequential order number
      const counterRef = adminDb.doc(`stores/${storeId}/meta/counters`);
      const counterDoc = await t.get(counterRef);
      const currentSeq = (counterDoc.exists ? counterDoc.data()?.orderSeq || 0 : 0) + 1;
      const orderNumber = `ORD-${String(currentSeq).padStart(4, "0")}`;

      // 4. Read Products and verify stock & prices atomically
      let subtotalPaise = 0;
      const snapshots: any[] = [];
      const prodMap = new Map<string, { ref: any; data: any }>();

      for (const item of items) {
        let entry = prodMap.get(item.productId);
        if (!entry) {
          const prodRef = adminDb.doc(`stores/${storeId}/products/${item.productId}`);
          const prodDoc = await t.get(prodRef);
          if (!prodDoc.exists || !prodDoc.data()?.isAvailable) {
            throw new Error("One or more products are unavailable");
          }
          entry = { ref: prodRef, data: prodDoc.data()! };
          prodMap.set(item.productId, entry);
        }

        const prod = entry.data;
        const cleanNote = item.note ? String(item.note).trim().replace(/[\x00-\x1F\x7F]/g, "").slice(0, 140) : undefined;
        const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;

        if (hasVariants) {
          if (!item.variantId) {
            throw new Error(`Please select an option for ${prod.name}`);
          }
          const vIdx = prod.variants.findIndex((v: any) => v.id === item.variantId);
          if (vIdx < 0 || !prod.variants[vIdx].isAvailable) {
            throw new Error(`Selected variant is unavailable for ${prod.name}`);
          }
          const variant = prod.variants[vIdx];
          if (variant.stock !== null && variant.stock !== undefined && variant.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${prod.name} (${variant.label})`);
          }

          if (variant.stock !== null && variant.stock !== undefined) {
            variant.stock = Math.max(0, variant.stock - item.quantity);
          }

          const unitPricePaise = variant.pricePaise;
          subtotalPaise += unitPricePaise * item.quantity;
          snapshots.push({
            productId: prod.id,
            nameSnapshot: prod.name,
            unitPricePaise,
            quantity: item.quantity,
            ...(cleanNote ? { note: cleanNote } : {}),
            variantId: variant.id,
            variantLabel: variant.label
          });
        } else {
          if (prod.stock !== null && prod.stock !== undefined && prod.stock < item.quantity) {
            throw new Error(`Insufficient stock for ${prod.name}`);
          }
          if (prod.stock !== null && prod.stock !== undefined) {
            prod.stock = Math.max(0, prod.stock - item.quantity);
          }

          const unitPricePaise = prod.pricePaise;
          subtotalPaise += unitPricePaise * item.quantity;
          snapshots.push({
            productId: prod.id,
            nameSnapshot: prod.name,
            unitPricePaise,
            quantity: item.quantity,
            ...(cleanNote ? { note: cleanNote } : {})
          });
        }

        prod.soldCount = (prod.soldCount || 0) + item.quantity;
      }

      // Online delivery calculations
      let deliveryFeePaise = 0;
      let deliveryAddressText: string | undefined = undefined;

      if (source === "online" && fulfilment === "delivery") {
        if (subtotalPaise < (store.minOrderPaise || 0)) {
          throw new Error(`Minimum order for delivery is ₹${((store.minOrderPaise || 0) / 100).toFixed(2)}`);
        }
        if (subtotalPaise >= (store.freeDeliveryAbovePaise || 0)) {
          deliveryFeePaise = 0;
        } else {
          deliveryFeePaise = store.deliveryFeePaise || 0;
        }

        if (addressId && customerId) {
          const addrDoc = await t.get(adminDb.doc(`customers/${customerId}/addresses/${addressId}`));
          if (addrDoc.exists) {
            const a = addrDoc.data()!;
            deliveryAddressText = `${a.label}: ${a.street}, Landmark: ${a.landmark || "N/A"}, PIN: ${a.pincode}`;
          }
        }
      }

      const totalPaise = subtotalPaise + deliveryFeePaise;
      const orderId = "ord_" + crypto.randomBytes(6).toString("hex");

      const newOrder = {
        id: orderId,
        storeId,
        number: orderNumber,
        customerName: String(customerName || "").trim(),
        customerPhone: String(customerPhone || "").trim(),
        note: note ? String(note).trim() : undefined,
        status: "new",
        paymentStatus: paymentMethod === "cod" ? "pending" : (paymentReference ? "received" : "pending"),
        subtotalPaise,
        deliveryFeePaise,
        totalPaise,
        source: source || "qr",
        fulfilment: fulfilment || "counter",
        deliveryAddressText,
        paymentMethod: paymentMethod || "upi",
        paymentReference: paymentReference || undefined,
        placedByUserId,
        customerId: customerId || null,
        items: snapshots,
        createdAt: Date.now()
      };

      const eventId = "evt_" + crypto.randomBytes(6).toString("hex");
      const eventObj = {
        id: eventId,
        orderId,
        storeId,
        fromStatus: "new",
        toStatus: "new",
        timestamp: Date.now()
      };

      // Perform atomic writes
      t.set(counterRef, { orderSeq: currentSeq }, { merge: true });
      for (const { ref, data } of prodMap.values()) {
        const updates: any = {
          soldCount: data.soldCount || 0
        };
        if (Array.isArray(data.variants) && data.variants.length > 0) {
          updates.variants = data.variants;
          const avail = data.variants.filter((v: any) => v.isAvailable);
          const pool = avail.length > 0 ? avail : data.variants;
          updates.pricePaise = Math.min(...pool.map((v: any) => v.pricePaise));
        } else {
          if (data.stock !== null && data.stock !== undefined) {
            updates.stock = data.stock;
          }
        }
        t.update(ref, updates);
      }
      const orderRef = adminDb.doc(`stores/${storeId}/orders/${orderId}`);
      t.set(orderRef, newOrder);
      t.set(adminDb.doc(`stores/${storeId}/orders/${orderId}/events/${eventId}`), eventObj);

      return newOrder;
    });

    return res.json(resultOrder);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/status
app.patch("/api/orders/:id/status", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { newStatus, storeId } = req.body;
  const caller = req.user!;

  try {
    const updated = await adminDb.runTransaction(async (t) => {
      const orderRef = adminDb.doc(`stores/${storeId}/orders/${id}`);
      const orderDoc = await t.get(orderRef);
      if (!orderDoc.exists) throw new Error("Order not found");
      const order = orderDoc.data()!;

      // Staff permissions check: staff can only update their own orders
      if (caller.role === "staff" && order.placedByUserId !== caller.userId) {
        throw new Error("Staff can only update their own orders");
      }

      if (order.status === newStatus) return order;

      const validTransitions: Record<string, string[]> = {
        new: ["confirmed", "cancelled"],
        confirmed: ["preparing", "cancelled"],
        preparing: ["ready", "out_for_delivery", "cancelled"],
        ready: ["completed", "cancelled"],
        out_for_delivery: ["completed", "cancelled"],
        completed: [],
        cancelled: []
      };

      if (!validTransitions[order.status]?.includes(newStatus)) {
        throw new Error(`Invalid status transition from ${order.status} to ${newStatus}`);
      }

      // If cancelling, restore stock and decrement soldCount atomically exactly once
      if (newStatus === "cancelled" && order.status !== "cancelled") {
        const prodCancelMap = new Map<string, { ref: any; data: any }>();
        for (const item of order.items) {
          let entry = prodCancelMap.get(item.productId);
          if (!entry) {
            const prodRef = adminDb.doc(`stores/${storeId}/products/${item.productId}`);
            const prodDoc = await t.get(prodRef);
            if (prodDoc.exists) {
              entry = { ref: prodRef, data: prodDoc.data()! };
              prodCancelMap.set(item.productId, entry);
            }
          }
          if (!entry) continue;
          const p = entry.data;

          if (item.variantId && Array.isArray(p.variants)) {
            const v = p.variants.find((variant: any) => variant.id === item.variantId);
            if (v && v.stock !== null && v.stock !== undefined) {
              v.stock = v.stock + item.quantity;
            }
          } else if (p.stock !== null && p.stock !== undefined) {
            p.stock = p.stock + item.quantity;
          }

          if (p.soldCount !== undefined && p.soldCount !== null) {
            p.soldCount = Math.max(0, p.soldCount - item.quantity);
          }
        }

        for (const { ref, data } of prodCancelMap.values()) {
          const updates: any = {};
          if (Array.isArray(data.variants) && data.variants.length > 0) {
            updates.variants = data.variants;
            const avail = data.variants.filter((v: any) => v.isAvailable);
            const pool = avail.length > 0 ? avail : data.variants;
            updates.pricePaise = Math.min(...pool.map((v: any) => v.pricePaise));
          } else if (data.stock !== null && data.stock !== undefined) {
            updates.stock = data.stock;
          }
          if (data.soldCount !== undefined) {
            updates.soldCount = data.soldCount;
          }
          if (Object.keys(updates).length > 0) {
            t.update(ref, updates);
          }
        }
      }

      const prevStatus = order.status;
      order.status = newStatus;
      t.update(orderRef, { status: newStatus });

      const eventId = "evt_" + crypto.randomBytes(6).toString("hex");
      t.set(adminDb.doc(`stores/${storeId}/orders/${id}/events/${eventId}`), {
        id: eventId,
        orderId: id,
        storeId,
        fromStatus: prevStatus,
        toStatus: newStatus,
        changedByUserId: caller.userId || caller.uid,
        timestamp: Date.now()
      });

      return order;
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// PATCH /api/orders/:id/payment
app.patch("/api/orders/:id/payment", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { paymentStatus, storeId } = req.body;
  const caller = req.user!;

  try {
    const updated = await adminDb.runTransaction(async (t) => {
      const orderRef = adminDb.doc(`stores/${storeId}/orders/${id}`);
      const orderDoc = await t.get(orderRef);
      if (!orderDoc.exists) throw new Error("Order not found");
      const order = orderDoc.data()!;

      if (caller.role === "staff" && order.placedByUserId !== caller.userId) {
        throw new Error("Staff cannot update payment for other orders");
      }

      t.update(orderRef, { paymentStatus });
      order.paymentStatus = paymentStatus;
      return order;
    });

    return res.json(updated);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// POST /api/orders/:id/cancel (customer cancel)
app.post("/api/orders/:id/cancel", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { storeId } = req.body;
  const caller = req.user!;

  try {
    const cancelled = await adminDb.runTransaction(async (t) => {
      const orderRef = adminDb.doc(`stores/${storeId}/orders/${id}`);
      const orderDoc = await t.get(orderRef);
      if (!orderDoc.exists) throw new Error("Order not found");
      const order = orderDoc.data()!;

      if (order.customerId !== caller.customerId && caller.role !== "owner") {
        throw new Error("Unauthorized to cancel this order");
      }
      if (order.status !== "new") {
        throw new Error("Only new orders can be cancelled by customers");
      }

      // Restore stock and decrement soldCount
      const prodCancelMap = new Map<string, { ref: any; data: any }>();
      for (const item of order.items) {
        let entry = prodCancelMap.get(item.productId);
        if (!entry) {
          const prodRef = adminDb.doc(`stores/${storeId}/products/${item.productId}`);
          const prodDoc = await t.get(prodRef);
          if (prodDoc.exists) {
            entry = { ref: prodRef, data: prodDoc.data()! };
            prodCancelMap.set(item.productId, entry);
          }
        }
        if (!entry) continue;
        const p = entry.data;

        if (item.variantId && Array.isArray(p.variants)) {
          const v = p.variants.find((variant: any) => variant.id === item.variantId);
          if (v && v.stock !== null && v.stock !== undefined) {
            v.stock = v.stock + item.quantity;
          }
        } else if (p.stock !== null && p.stock !== undefined) {
          p.stock = p.stock + item.quantity;
        }

        if (p.soldCount !== undefined && p.soldCount !== null) {
          p.soldCount = Math.max(0, p.soldCount - item.quantity);
        }
      }

      for (const { ref, data } of prodCancelMap.values()) {
        const updates: any = {};
        if (Array.isArray(data.variants) && data.variants.length > 0) {
          updates.variants = data.variants;
          const avail = data.variants.filter((v: any) => v.isAvailable);
          const pool = avail.length > 0 ? avail : data.variants;
          updates.pricePaise = Math.min(...pool.map((v: any) => v.pricePaise));
        } else if (data.stock !== null && data.stock !== undefined) {
          updates.stock = data.stock;
        }
        if (data.soldCount !== undefined) {
          updates.soldCount = data.soldCount;
        }
        if (Object.keys(updates).length > 0) {
          t.update(ref, updates);
        }
      }

      t.update(orderRef, { status: "cancelled" });
      order.status = "cancelled";

      const eventId = "evt_" + crypto.randomBytes(6).toString("hex");
      t.set(adminDb.doc(`stores/${storeId}/orders/${id}/events/${eventId}`), {
        id: eventId,
        orderId: id,
        storeId,
        fromStatus: "new",
        toStatus: "cancelled",
        changedByUserId: caller.customerId,
        timestamp: Date.now()
      });

      return order;
    });

    return res.json(cancelled);
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});

// GET /api/orders/track (guests track order with storeId, number, phone)
app.get("/api/orders/track", async (req: Request, res: Response) => {
  const { storeId, number, phone } = req.query;
  if (!storeId || !number) {
    return res.status(400).json({ error: "storeId and number required" });
  }

  try {
    const q = adminDb.collection(`stores/${storeId}/orders`).where("number", "==", String(number).trim());
    const snap = await q.limit(1).get();
    if (snap.empty) {
      return res.status(404).json({ error: "Order not found" });
    }
    const order = snap.docs[0].data();

    // If phone provided, verify match for privacy
    if (phone && String(phone).trim()) {
      if (order.customerPhone && order.customerPhone.trim() !== String(phone).trim()) {
        return res.status(403).json({ error: "Phone number does not match order" });
      }
    }

    return res.json(order);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// In-memory cache for related products (10 minutes TTL)
const relatedProductsCache = new Map<string, { data: { alsoBought: any[]; sameCategory: any[] }; expiry: number }>();

app.get("/api/stores/:storeId/products/:productId/related", async (req: Request, res: Response) => {
  const { storeId, productId } = req.params;
  const cacheKey = `${storeId}:${productId}`;
  const now = Date.now();
  const cached = relatedProductsCache.get(cacheKey);
  if (cached && cached.expiry > now) {
    return res.json(cached.data);
  }

  try {
    const targetProdDoc = await adminDb.doc(`stores/${storeId}/products/${productId}`).get();
    if (!targetProdDoc.exists) {
      return res.status(404).json({ error: "Product not found" });
    }
    const targetProd = targetProdDoc.data()!;

    // 1. Same category items
    const sameCatSnap = await adminDb.collection(`stores/${storeId}/products`)
      .where("categoryId", "==", targetProd.categoryId)
      .where("isAvailable", "==", true)
      .limit(10)
      .get();
    const sameCategory = sameCatSnap.docs
      .map(d => d.data())
      .filter(p => p.id !== productId)
      .slice(0, 4);

    // 2. Also bought together from orders
    const ordersSnap = await adminDb.collection(`stores/${storeId}/orders`)
      .orderBy("createdAt", "desc")
      .limit(100)
      .get();

    const freqMap: Record<string, number> = {};
    for (const doc of ordersSnap.docs) {
      const ord = doc.data();
      if (ord.status === "cancelled") continue;
      const ids = (ord.items || []).map((it: any) => it.productId);
      if (ids.includes(productId)) {
        for (const otherId of ids) {
          if (otherId !== productId) {
            freqMap[otherId] = (freqMap[otherId] || 0) + 1;
          }
        }
      }
    }

    const sortedIds = Object.keys(freqMap).sort((a, b) => freqMap[b] - freqMap[a]).slice(0, 4);
    let alsoBought: any[] = [];
    if (sortedIds.length > 0) {
      const docs = await Promise.all(sortedIds.map(id => adminDb.doc(`stores/${storeId}/products/${id}`).get()));
      alsoBought = docs.filter(d => d.exists && d.data()?.isAvailable).map(d => d.data());
    }

    if (alsoBought.length === 0) {
      // Fallback: popular or other available products
      const fallbackSnap = await adminDb.collection(`stores/${storeId}/products`)
        .where("isAvailable", "==", true)
        .limit(8)
        .get();
      alsoBought = fallbackSnap.docs
        .map(d => d.data())
        .filter(p => p.id !== productId && !sameCategory.some(sc => sc.id === p.id))
        .slice(0, 3);
    }

    const result = { alsoBought, sameCategory };
    relatedProductsCache.set(cacheKey, { data: result, expiry: now + 10 * 60 * 1000 });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/products/bulk (bulk CSV / JSON product import)
app.post("/api/products/bulk", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  if (caller.role !== "owner") {
    return res.status(403).json({ error: "Only the store owner can perform bulk product updates." });
  }
  const storeId = caller.storeId;
  const { items } = req.body;
  if (!Array.isArray(items)) {
    return res.status(400).json({ error: "items array is required" });
  }

  const errors: { row: number; name?: string; error: string }[] = [];
  let successCount = 0;

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const rowNum = i + 1;
    try {
      if (item.id) {
        const prodRef = adminDb.doc(`stores/${storeId}/products/${item.id}`);
        const prodDoc = await prodRef.get();
        if (prodDoc.exists) {
          const existing = prodDoc.data()!;
          if (Array.isArray(existing.variants) && existing.variants.length > 0) {
            errors.push({
              row: rowNum,
              name: existing.name,
              error: "This product has variants; edit them in the dashboard"
            });
            continue;
          }
          const updates: any = {};
          if (item.name) updates.name = String(item.name).trim();
          if (item.description !== undefined) updates.description = String(item.description).trim();
          if (typeof item.pricePaise === "number" && item.pricePaise >= 0) updates.pricePaise = Math.round(item.pricePaise);
          if (item.stock !== undefined) updates.stock = item.stock !== null ? Math.max(0, Math.floor(Number(item.stock))) : null;
          if (item.isAvailable !== undefined) updates.isAvailable = !!item.isAvailable;
          if (item.categoryId) updates.categoryId = item.categoryId;
          await prodRef.update(updates);
          successCount++;
          continue;
        }
      }

      // If matching by name or creating new
      if (item.name) {
        const existingByNameSnap = await adminDb.collection(`stores/${storeId}/products`)
          .where("name", "==", String(item.name).trim())
          .limit(1)
          .get();

        if (!existingByNameSnap.empty) {
          const existingDoc = existingByNameSnap.docs[0];
          const existing = existingDoc.data();
          if (Array.isArray(existing.variants) && existing.variants.length > 0) {
            errors.push({
              row: rowNum,
              name: existing.name,
              error: "This product has variants; edit them in the dashboard"
            });
            continue;
          }
          const updates: any = {};
          if (item.description !== undefined) updates.description = String(item.description).trim();
          if (typeof item.pricePaise === "number" && item.pricePaise >= 0) updates.pricePaise = Math.round(item.pricePaise);
          if (item.stock !== undefined) updates.stock = item.stock !== null ? Math.max(0, Math.floor(Number(item.stock))) : null;
          if (item.isAvailable !== undefined) updates.isAvailable = !!item.isAvailable;
          await existingDoc.ref.update(updates);
          successCount++;
          continue;
        }
      }

      // New product
      const newProdId = "prod_" + crypto.randomBytes(6).toString("hex");
      const newProd = {
        id: newProdId,
        storeId,
        categoryId: item.categoryId || "",
        name: String(item.name || "Untitled Product").trim(),
        description: String(item.description || "").trim(),
        pricePaise: typeof item.pricePaise === "number" ? Math.max(0, Math.round(item.pricePaise)) : 0,
        stock: item.stock !== undefined && item.stock !== null ? Math.max(0, Math.floor(Number(item.stock))) : null,
        isAvailable: item.isAvailable !== undefined ? !!item.isAvailable : true,
        createdByUserId: caller.userId,
        createdAt: Date.now()
      };
      await adminDb.doc(`stores/${storeId}/products/${newProdId}`).set(newProd);
      successCount++;
    } catch (err: any) {
      errors.push({ row: rowNum, name: item.name, error: err.message });
    }
  }

  return res.json({ success: true, processed: successCount, errors });
});

// ----------------------------------------------------
// 5. AI ON SERVER (@google/genai SDK + Quota Enforcement)
// ----------------------------------------------------
app.post("/api/ai/chat", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { storeId, message } = req.body;
  const caller = req.user!;
  if (!storeId || !message) return res.status(400).json({ error: "storeId and message required" });

  try {
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) return res.status(404).json({ error: "Store not found" });
    const store = storeDoc.data()!;

    // Quota check
    const plan = PLANS[store.planSlug as "offline" | "franchise" | "online"] || PLANS.offline;
    const dailyQuota = plan.aiDailyQuota;
    const todayStr = new Date().toISOString().split("T")[0];
    const usageRef = adminDb.doc(`stores/${storeId}/meta/aiUsage_${todayStr}`);
    const usageDoc = await usageRef.get();
    const currentCount = usageDoc.exists ? usageDoc.data()?.count || 0 : 0;

    if (currentCount >= dailyQuota) {
      return res.status(429).json({ error: `Daily AI assistant quota exceeded (${dailyQuota}/${dailyQuota} requests used today). Please upgrade your plan or try again tomorrow.` });
    }

    // Increment usage
    await usageRef.set({ count: currentCount + 1, dateStr: todayStr }, { merge: true });

    // Read GEMINI_API_KEY from process.env
    const apiKey = process.env.GEMINI_API_KEY;
    let aiResponseText = "";
    let toolCalls: any[] = [];

    if (apiKey) {
      try {
        const { GoogleGenAI } = await import("@google/genai");
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: "gemini-2.5-flash",
          contents: [{ role: "user", parts: [{ text: String(message) }] }],
          config: {
            temperature: 0.2,
            systemInstruction: `You are the AI operations assistant for store '${store.name}' (Plan: ${store.planSlug}). Always suggest actions concisely and assist the shop owner or floor staff.`
          }
        });
        aiResponseText = response.text || "I have received your request.";
      } catch (genAiErr: any) {
        console.warn("Gemini API call warning:", genAiErr.message);
        aiResponseText = `I processed your request for "${message}". How else may I assist with your catalog or orders?`;
      }
    } else {
      aiResponseText = `[Prototype Mode] Received: "${message}". What catalog or order updates would you like to review?`;
    }

    return res.json({
      text: aiResponseText,
      quotaUsed: currentCount + 1,
      quotaTotal: dailyQuota
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

app.post("/api/ai/confirm/:actionId", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const { actionId } = req.params;
  const { storeId } = req.body;

  try {
    const actRef = adminDb.doc(`stores/${storeId}/meta/pendingActions/${actionId}`);
    const actDoc = await actRef.get();
    if (!actDoc.exists) return res.status(404).json({ error: "Pending action not found" });

    const act = actDoc.data()!;
    if (act.status !== "pending") return res.status(400).json({ error: "Action is no longer pending" });

    // Apply action
    if (act.toolName === "propose_price_change") {
      await adminDb.doc(`stores/${storeId}/products/${act.args.productId}`).update({
        pricePaise: act.args.newPricePaise
      });
    } else if (act.toolName === "propose_stock_update") {
      await adminDb.doc(`stores/${storeId}/products/${act.args.productId}`).update({
        stock: act.args.newStock
      });
    }

    await actRef.update({ status: "confirmed" });
    return res.json({ success: true, action: act });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// Helper: Extract inline image part from Gemini response
function extractInlineImage(response: any): { data: string; mimeType: string } | null {
  const candidates = response?.candidates || [];
  for (const cand of candidates) {
    const parts = cand?.content?.parts || [];
    for (const part of parts) {
      if (part.inlineData && part.inlineData.data) {
        return {
          data: part.inlineData.data,
          mimeType: part.inlineData.mimeType || "image/png"
        };
      }
    }
  }
  return null;
}

// Quality Gate: Verify product consistency using gemini-2.5-flash
async function verifyProductConsistency(
  ai: GoogleGenAI,
  origBase64: string,
  origMime: string,
  genBase64: string,
  genMime: string
): Promise<{ sameProduct: boolean; differences: string[] }> {
  try {
    const checkResp = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text:
                "You are an e-commerce catalog consistency inspector. Compare the original product image and the studio-enhanced image.\n" +
                "Evaluate whether the studio image depicts the EXACT SAME physical product without unauthorized modifications to the product itself.\n" +
                "Allowed modifications: studio plain background, professional lighting/highlights, ground reflection/shadow, angle/crop, dust cleanup.\n" +
                "Disallowed modifications: altering brand logos or text, altering core colours or shades, changing fabric prints or patterns, adding/removing buttons/zippers/pockets/parts, altering product silhouette or dimensions.\n" +
                "Return JSON with sameProduct (boolean) and differences (array of strings describing any alterations to the product itself)."
            },
            {
              inlineData: {
                mimeType: origMime,
                data: origBase64
              }
            },
            {
              inlineData: {
                mimeType: genMime,
                data: genBase64
              }
            }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            sameProduct: {
              type: Type.BOOLEAN,
              description: "True if the enhanced image depicts the exact same product with no alterations to its core design, logo, colors, or structure."
            },
            differences: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING
              },
              description: "List of detected alterations to the product itself."
            }
          },
          required: ["sameProduct", "differences"]
        }
      }
    });

    const parsed = JSON.parse(checkResp.text || "{}");
    return {
      sameProduct: typeof parsed.sameProduct === "boolean" ? parsed.sameProduct : true,
      differences: Array.isArray(parsed.differences) ? parsed.differences : []
    };
  } catch (err: any) {
    console.warn("Quality gate check error:", err.message);
    return { sameProduct: true, differences: [] };
  }
}

// POST /api/ai/enhance-photo (Studio Photo enhancement)
app.post("/api/ai/enhance-photo", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  if (caller.role !== "owner") {
    return res.status(403).json({ error: "Only the store owner can enhance product photos." });
  }

  const storeId = caller.storeId;
  if (!storeId) {
    return res.status(400).json({ error: "Store ID is required in session." });
  }

  try {
    // 1. Fetch store for plan & brandType
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) {
      return res.status(404).json({ error: "Store not found." });
    }
    const store = storeDoc.data()!;

    // 2. Quota Check (imageDailyQuota in PLANS)
    const plan = PLANS[store.planSlug as "offline" | "franchise" | "online"] || PLANS.offline;
    const dailyQuota = plan.imageDailyQuota || 5;
    const todayStr = new Date().toISOString().split("T")[0];
    const usageRef = adminDb.doc(`stores/${storeId}/meta/aiUsage_${todayStr}`);
    const usageDoc = await usageRef.get();
    const currentCount = usageDoc.exists ? (usageDoc.data()?.imageCount || 0) : 0;

    if (currentCount >= dailyQuota) {
      return res.status(429).json({ error: "Daily studio photo limit reached for your plan." });
    }

    // 3. Resolve input image: { imageBase64, mimeType } OR { productId, imageIndex }
    let originalBase64 = "";
    let originalMimeType = "image/jpeg";
    let productCategoryName = "";

    const { imageBase64, mimeType, productType, productId, imageIndex } = req.body;

    if (productId) {
      const prodRef = adminDb.doc(`stores/${storeId}/products/${productId}`);
      const prodDoc = await prodRef.get();
      if (!prodDoc.exists) {
        return res.status(404).json({ error: "Product not found." });
      }
      const prod = prodDoc.data()!;
      if (prod.storeId && prod.storeId !== storeId) {
        return res.status(403).json({ error: "Product does not belong to your store." });
      }

      // Infer category name if present
      if (prod.categoryId) {
        const catDoc = await adminDb.doc(`stores/${storeId}/categories/${prod.categoryId}`).get();
        if (catDoc.exists) {
          productCategoryName = catDoc.data()?.name || "";
        }
      }

      // Pick image by index
      let targetImage: string | undefined;
      const idx = imageIndex !== undefined ? Number(imageIndex) : 0;
      if (Array.isArray(prod.images) && prod.images[idx]) {
        targetImage = prod.images[idx];
      } else if (idx === 0 && prod.image) {
        targetImage = prod.image;
      } else if (prod.image) {
        targetImage = prod.image;
      }

      if (!targetImage) {
        return res.status(400).json({ error: "No image found for this product." });
      }

      if (targetImage.startsWith("data:")) {
        const match = targetImage.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (match) {
          originalMimeType = match[1];
          originalBase64 = match[2];
        } else {
          originalBase64 = targetImage.replace(/^data:[^;]+;base64,/, "");
        }
      } else if (targetImage.startsWith("http://") || targetImage.startsWith("https://")) {
        const resp = await fetch(targetImage);
        if (!resp.ok) {
          return res.status(400).json({ error: "Failed to download image from URL." });
        }
        const ab = await resp.arrayBuffer();
        originalBase64 = Buffer.from(ab).toString("base64");
        originalMimeType = resp.headers.get("content-type") || "image/jpeg";
      } else {
        // Firebase Storage path
        const bucket = adminStorage.bucket(firebaseConfig.storageBucket);
        const cleanPath = targetImage.replace(/^gs:\/\/[^/]+\//, "");
        const file = bucket.file(cleanPath);
        const [buf] = await file.download();
        const [meta] = await file.getMetadata().catch(() => [{}]);
        originalBase64 = buf.toString("base64");
        originalMimeType = (meta as any).contentType || "image/jpeg";
      }
    } else if (imageBase64) {
      if (typeof imageBase64 !== "string") {
        return res.status(400).json({ error: "Invalid imageBase64." });
      }

      if (imageBase64.startsWith("data:")) {
        const match = imageBase64.match(/^data:(image\/[a-zA-Z0-9.+_-]+);base64,(.+)$/);
        if (match) {
          originalMimeType = match[1];
          originalBase64 = match[2];
        } else {
          originalBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");
          if (mimeType) originalMimeType = String(mimeType);
        }
      } else {
        originalBase64 = imageBase64;
        if (mimeType) originalMimeType = String(mimeType);
      }

      if (req.body.categoryId) {
        const catDoc = await adminDb.doc(`stores/${storeId}/categories/${req.body.categoryId}`).get();
        if (catDoc.exists) productCategoryName = catDoc.data()?.name || "";
      }
    } else {
      return res.status(400).json({ error: "Must provide either imageBase64 or productId." });
    }

    // Validate image size (< 1.5MB)
    const byteSize = Math.ceil((originalBase64.length * 3) / 4);
    if (byteSize > 1.5 * 1024 * 1024) {
      return res.status(400).json({ error: "Input image must be under 1.5MB." });
    }

    // Validate MIME type
    const normalizedMime = originalMimeType.toLowerCase().split(";")[0].trim();
    const validMimes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];
    if (!validMimes.includes(normalizedMime)) {
      return res.status(400).json({ error: "Input image must be image/jpeg, image/png, or image/webp." });
    }
    const cleanMime = normalizedMime === "image/jpg" ? "image/jpeg" : normalizedMime;

    // Validate or infer productType
    let finalProductType: ProductType = "general";
    if (isValidProductType(productType)) {
      finalProductType = productType;
    } else {
      finalProductType = inferProductType(productCategoryName, store.brandType);
    }

    // 4. Call Image Model
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build"
        }
      }
    });

    const imageModel = process.env.GEMINI_IMAGE_MODEL || "gemini-2.5-flash-image";
    const promptText = buildPhotoPrompt(finalProductType, false);

    let imageResp: any;
    try {
      imageResp = await ai.models.generateContent({
        model: imageModel,
        contents: [
          {
            role: "user",
            parts: [
              { text: promptText },
              {
                inlineData: {
                  mimeType: cleanMime,
                  data: originalBase64
                }
              }
            ]
          }
        ],
        config: {
          responseModalities: ["IMAGE"]
        }
      });
    } catch (genErr: any) {
      console.warn("Studio photo generation failed:", genErr.message);
      return res.status(502).json({ error: "Image generation model error: " + (genErr.message || "Failed to generate image") });
    }

    let generatedImage = extractInlineImage(imageResp);
    if (!generatedImage) {
      return res.status(422).json({ error: "The AI image model did not return a generated image. Please try a different photo." });
    }

    // 5. Quality Gate
    let quality = await verifyProductConsistency(ai, originalBase64, cleanMime, generatedImage.data, generatedImage.mimeType);
    let hasWarning = false;
    let warningDifferences: string[] = [];

    if (!quality.sameProduct) {
      // Retry ONCE with extra emphasis prompt
      const retryPrompt = buildPhotoPrompt(finalProductType, true);
      try {
        const retryResp = await ai.models.generateContent({
          model: imageModel,
          contents: [
            {
              role: "user",
              parts: [
                { text: retryPrompt },
                {
                  inlineData: {
                    mimeType: cleanMime,
                    data: originalBase64
                  }
                }
              ]
            }
          ],
          config: {
            responseModalities: ["IMAGE"]
          }
        });

        const retryImage = extractInlineImage(retryResp);
        if (retryImage) {
          generatedImage = retryImage;
          const retryQuality = await verifyProductConsistency(ai, originalBase64, cleanMime, generatedImage.data, generatedImage.mimeType);
          if (!retryQuality.sameProduct) {
            hasWarning = true;
            warningDifferences = retryQuality.differences.length > 0 ? retryQuality.differences : quality.differences;
          }
        } else {
          hasWarning = true;
          warningDifferences = quality.differences;
        }
      } catch (retryErr: any) {
        console.warn("Retry generation error:", retryErr.message);
        hasWarning = true;
        warningDifferences = quality.differences;
      }
    }

    // 6. Charge Quota (1 unit for successful generation returned to merchant)
    await usageRef.set({
      imageCount: currentCount + 1,
      dateStr: todayStr
    }, { merge: true });

    return res.json({
      imageBase64: generatedImage.data,
      mimeType: generatedImage.mimeType,
      warning: hasWarning,
      differences: warningDifferences,
      productType: finalProductType,
      quotaUsed: currentCount + 1,
      quotaTotal: dailyQuota
    });
  } catch (err: any) {
    console.error("enhance-photo unhandled error:", err);
    return res.status(500).json({ error: err.message || "Failed to enhance photo" });
  }
});

// ----------------------------------------------------
// AI PRODUCT TRANSLATION (Hindi & Punjabi)
// ----------------------------------------------------
app.post("/api/ai/translate-product", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  if (caller.role !== "owner") {
    return res.status(403).json({ error: "Only the store owner can translate products." });
  }

  const storeId = caller.storeId;
  if (!storeId) {
    return res.status(400).json({ error: "Store ID is required in session." });
  }

  const { name, description } = req.body;
  if (!name || typeof name !== "string") {
    return res.status(400).json({ error: "Product name is required." });
  }

  try {
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) return res.status(404).json({ error: "Store not found." });
    const store = storeDoc.data()!;

    // Quota check
    const plan = PLANS[store.planSlug as "offline" | "franchise" | "online"] || PLANS.offline;
    const dailyQuota = plan.aiDailyQuota || 20;
    const todayStr = new Date().toISOString().split("T")[0];
    const usageRef = adminDb.doc(`stores/${storeId}/meta/aiUsage_${todayStr}`);
    const usageDoc = await usageRef.get();
    const currentCount = usageDoc.exists ? usageDoc.data()?.count || 0 : 0;

    if (currentCount >= dailyQuota) {
      return res.status(429).json({ error: `Daily AI quota reached (${dailyQuota}/${dailyQuota}).` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const promptText = `You are a professional e-commerce product translator specializing in Indian commerce.
Translate the following product name and description into Hindi (Devanagari script) and Punjabi (Gurmukhi script).
Rules:
- Preserve brand names, trademarks, and proper nouns (e.g., MintShelf, Amul, Nike, Sourdough, Croissant) or transcribe them naturally if standard.
- Preserve all numbers, units of measurement (e.g. 500g, 1kg, 250ml, 1L, cm, inch), pack sizes, and pricing.
- Keep the tone appealing, clear, and natural for Indian retail customers.
- Plain text only, no markdown or HTML.

Product Name: ${name}
Product Description: ${description || "N/A"}`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            hi: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "description"]
            },
            pa: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING }
              },
              required: ["name", "description"]
            }
          },
          required: ["hi", "pa"]
        }
      }
    });

    const parsed = JSON.parse(response.text || "{}");

    // Increment usage quota
    await usageRef.set({ count: currentCount + 1, dateStr: todayStr }, { merge: true });

    return res.json({
      hi: parsed.hi || { name, description: description || "" },
      pa: parsed.pa || { name, description: description || "" },
      quotaUsed: currentCount + 1,
      quotaTotal: dailyQuota
    });
  } catch (err: any) {
    console.error("translate-product error:", err);
    return res.status(500).json({ error: err.message || "Failed to translate product." });
  }
});

// ----------------------------------------------------
// AI PROFILE COPY ASSISTANT
// ----------------------------------------------------
app.post("/api/ai/profile-assist", requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  const caller = req.user!;
  if (caller.role !== "owner") {
    return res.status(403).json({ error: "Only the store owner can use profile AI assist." });
  }

  const storeId = caller.storeId;
  if (!storeId) {
    return res.status(400).json({ error: "Store ID is required in session." });
  }

  const { module, field, storeName, category, currentText } = req.body;
  if (!module || !field) {
    return res.status(400).json({ error: "Module and field are required." });
  }

  try {
    const storeDoc = await adminDb.collection("stores").doc(storeId).get();
    if (!storeDoc.exists) return res.status(404).json({ error: "Store not found." });
    const store = storeDoc.data()!;

    // Quota check
    const plan = PLANS[store.planSlug as "offline" | "franchise" | "online"] || PLANS.offline;
    const dailyQuota = plan.aiDailyQuota || 20;
    const todayStr = new Date().toISOString().split("T")[0];
    const usageRef = adminDb.doc(`stores/${storeId}/meta/aiUsage_${todayStr}`);
    const usageDoc = await usageRef.get();
    const currentCount = usageDoc.exists ? usageDoc.data()?.count || 0 : 0;

    if (currentCount >= dailyQuota) {
      return res.status(429).json({ error: `Daily AI quota reached (${dailyQuota}/${dailyQuota}).` });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not configured on the server." });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { "User-Agent": "aistudio-build" } }
    });

    const systemInstruction = "You are a professional retail copywriter for independent Indian shops. Provide concise, polished, plain text copy. NEVER output HTML or markdown formatting.";
    let prompt = "";

    if (module === "announcement") {
      prompt = `Write or improve a single store announcement banner for "${storeName || store.name}" (Business type: ${store.brandType || category || "General retail"}). Current text: "${currentText || ""}".
Rules:
- Under 140 characters.
- Plain text only.
- Direct, warm, customer-focused (e.g. fresh arrivals, holiday hours, special offer, delivery updates).`;
    } else if (module === "story") {
      prompt = `Write or improve the About / Brand Story for "${storeName || store.name}" (Business type: ${store.brandType || category || "General retail"}). Current draft: "${currentText || ""}".
Rules:
- Under 800 characters (max 1000).
- Plain text only (paragraphs separated by single blank lines).
- Highlight craftsmanship, dedication to quality, and community trust.
- Do not invent false awards or founding dates not mentioned; if unknown, focus on passion and commitment.`;
    } else if (module === "policies") {
      prompt = `Generate a standard, clear, professional store policy for "${storeName || store.name}" for the section: "${field}" (returns, shipping, or privacy). Current text: "${currentText || ""}".
Rules:
- STRICT ANTI-HALLUCINATION: Do NOT invent specific delivery windows, refund days, return addresses, or phone numbers.
- Any specific shop details that the merchant must customize MUST be clearly marked in uppercase brackets like [RETURN_WINDOW: e.g. 7 days], [SHIPPING_CHARGE: e.g. Rs 50], [CONTACT_EMAIL: e.g. contact@store.com], [DISPATCH_TIME: e.g. 24-48 hours].
- Keep it under 2500 characters, plain text only.`;
    } else {
      prompt = `Provide assistance for field "${field}" in module "${module}" for store "${storeName || store.name}". Current text: "${currentText || ""}". Plain text only.`;
    }

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        temperature: 0.3
      }
    });

    const suggestion = (response.text || "").trim();

    // Increment usage
    await usageRef.set({ count: currentCount + 1, dateStr: todayStr }, { merge: true });

    return res.json({
      suggestion,
      quotaUsed: currentCount + 1,
      quotaTotal: dailyQuota
    });
  } catch (err: any) {
    console.error("profile-assist error:", err);
    return res.status(500).json({ error: err.message || "Failed to generate profile suggestion." });
  }
});

// ----------------------------------------------------
// DYNAMIC WEB APP MANIFEST
// ----------------------------------------------------
app.get("/manifest/:slug.webmanifest", async (req: Request, res: Response) => {
  const { slug } = req.params;
  try {
    const snap = await adminDb.collection("stores").where("slug", "==", slug).limit(1).get();
    let name = "MintShelf Store";
    let shortName = "Store";
    let themeColor = "#08482D";
    const bgColor = "#ffffff";

    if (!snap.empty) {
      const store = snap.docs[0].data();
      name = store.name || name;
      shortName = (store.name || "").slice(0, 12);
      themeColor = store.brandColor || themeColor;
    }

    const manifest = {
      name,
      short_name: shortName,
      start_url: `/#/store/${slug}`,
      scope: "/",
      display: "standalone",
      background_color: bgColor,
      theme_color: themeColor,
      icons: [
        {
          src: "/icon-192.png",
          sizes: "192x192",
          type: "image/png"
        },
        {
          src: "/icon-512.png",
          sizes: "512x512",
          type: "image/png"
        }
      ]
    };

    res.setHeader("Content-Type", "application/manifest+json");
    res.setHeader("Cache-Control", "public, max-age=3600");
    return res.json(manifest);
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. PLAN LOCK ENDPOINT
// ----------------------------------------------------
app.post("/api/admin/store/:id", async (req: Request, res: Response) => {
  const adminKey = req.headers["x-admin-key"];
  const expectedKey = process.env.ADMIN_API_KEY;

  if (!expectedKey) {
    return res.status(500).json({ error: "ADMIN_API_KEY is not configured on the server" });
  }
  if (!adminKey || typeof adminKey !== "string") {
    return res.status(401).json({ error: "Unauthorized: Missing x-admin-key header" });
  }

  // Timing-safe compare
  const bufA = Buffer.from(adminKey);
  const bufB = Buffer.from(expectedKey);
  if (bufA.length !== bufB.length || !crypto.timingSafeEqual(bufA, bufB)) {
    return res.status(403).json({ error: "Forbidden: Invalid admin key" });
  }

  const { id } = req.params;
  const { planSlug, extraSeats, isActive } = req.body;

  try {
    const storeRef = adminDb.collection("stores").doc(id);
    const snap = await storeRef.get();
    if (!snap.exists) return res.status(404).json({ error: "Store not found" });

    const updates: any = {};
    if (planSlug !== undefined) updates.planSlug = planSlug;
    if (extraSeats !== undefined) updates.extraSeats = Math.max(0, Number(extraSeats));
    if (isActive !== undefined) updates.isActive = !!isActive;

    await storeRef.update(updates);
    const updatedDoc = await storeRef.get();
    return res.json(updatedDoc.data());
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. SERVER SEED DATA LOGIC
// ----------------------------------------------------
async function runServerSeedIfNeeded() {
  if (process.env.SEED_DEMO !== "true") return;

  try {
    const storesSnap = await adminDb.collection("stores").limit(1).get();
    if (!storesSnap.empty) {
      console.log("Server seed skipped: stores collection already has documents.");
      return;
    }

    console.log("Seeding demo data into Firestore...");
    // Basic seed if database is empty and SEED_DEMO=true
    const seedStoreId = "store_demo_bakery";
    const seedUserId = "user_bakery_owner";
    const { hash, salt } = hashPasswordScrypt("pass123");

    const batch = adminDb.batch();
    batch.set(adminDb.doc(`users/${seedUserId}`), {
      id: seedUserId,
      username: "bakery_owner",
      passwordHash: hash,
      salt,
      displayName: "Chef Priya",
      isActive: true,
      failedAttempts: 0,
      lockedUntil: null,
      createdAt: Date.now()
    });

    batch.set(adminDb.doc(`stores/${seedStoreId}`), {
      id: seedStoreId,
      ownerUserId: seedUserId,
      name: "Demo Bakery",
      slug: "demo-bakery",
      planSlug: "offline",
      themeKey: "classic",
      brandColor: "#08482D",
      description: "Handcrafted artisan sourdough and morning pastries.",
      extraSeats: 0,
      isActive: true,
      onlineOpen: true,
      pickupEnabled: true,
      deliveryEnabled: false,
      deliveryFeePaise: 4000,
      freeDeliveryAbovePaise: 50000,
      minOrderPaise: 10000,
      deliveryNote: "Delivered directly from our store.",
      acceptUpiQr: true,
      acceptCod: true,
      upiId: "bakery@upi",
      createdAt: Date.now()
    });

    batch.set(adminDb.doc("memberships/mem_bakery_owner"), {
      id: "mem_bakery_owner",
      userId: seedUserId,
      storeId: seedStoreId,
      role: "owner",
      referralCode: "OWNER",
      isActive: true
    });

    await batch.commit();
    console.log("Server demo seed completed successfully.");
  } catch (err: any) {
    console.warn("Server demo seed warning:", err.message);
  }
}

// ----------------------------------------------------
// VITE MIDDLEWARE / STATIC ASSETS & LISTEN
// ----------------------------------------------------
async function startServer() {
  await runServerSeedIfNeeded();

  if (!isProd) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`MintShelf server running on http://0.0.0.0:${PORT} (${isProd ? "production" : "development"})`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
