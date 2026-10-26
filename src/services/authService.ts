import { IRepository } from "../repository/types";
import { User, Store, Membership, SessionContext } from "../types";
import { PLANS } from "../config/constants";
import { hashPassword, verifyPassword } from "../utils/crypto";

export class AuthService {
  constructor(private repo: IRepository) {}

  async generateOwnerUsername(businessName: string): Promise<string> {
    const clean = businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
    const base = `${clean}-owner`;
    let candidate = base;
    let count = 2;
    while (await this.repo.getUserByUsername(candidate)) {
      candidate = `${base}-${count++}`;
    }
    return candidate;
  }

  async generateStaffUsername(storeName: string, staffDisplayName: string): Promise<string> {
    const cleanStore = storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
    const cleanStaff = staffDisplayName.toLowerCase().trim().split(/\s+/)[0].replace(/[^a-z0-9]+/g, "") || "staff";
    const base = `${cleanStore}-${cleanStaff}`;
    let candidate = base;
    let count = 2;
    while (await this.repo.getUserByUsername(candidate)) {
      candidate = `${base}-${count++}`;
    }
    return candidate;
  }

  async signupFranchise(
    businessName: string,
    ownerName: string,
    password: string,
    options?: {
      brandType?: string;
      themeKey?: string;
      brandColor?: string;
      description?: string;
    }
  ): Promise<{ user: User; store: Store }> {
    if (!businessName.trim()) throw new Error("Business name is required");
    if (!ownerName.trim()) throw new Error("Owner name is required");
    if (!password) throw new Error("Password is required");

    const generatedUsername = await this.generateOwnerUsername(businessName);
    const { hash, salt } = await hashPassword(password);

    const user: User = {
      id: "user_" + Math.random().toString(36).substring(2, 9),
      username: generatedUsername,
      passwordHash: hash,
      salt,
      displayName: ownerName.trim(),
      isActive: true,
      createdAt: Date.now()
    };
    await this.repo.saveUser(user);

    const slug = businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "franchise-store";
    let finalSlug = slug;
    let counter = 1;
    while (await this.repo.getStoreBySlug(finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const store: Store = {
      id: "store_" + Math.random().toString(36).substring(2, 9),
      ownerUserId: user.id,
      name: businessName.trim(),
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
    await this.repo.saveStore(store);

    const membership: Membership = {
      id: "mem_" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      storeId: store.id,
      role: "owner",
      referralCode: "OWNER",
      isActive: true
    };
    await this.repo.saveMembership(membership);

    return { user, store };
  }

  async signup(
    username: string,
    password: string,
    displayName: string,
    storeName: string,
    options?: {
      brandType?: string;
      themeKey?: string;
      brandColor?: string;
      description?: string;
      planSlug?: string;
    }
  ): Promise<{ user: User; store: Store }> {
    const cleanUser = username.trim().toLowerCase();
    const existing = await this.repo.getUserByUsername(cleanUser);
    if (existing) throw new Error("Username already taken");

    const { hash, salt } = await hashPassword(password);
    const user: User = {
      id: "user_" + Math.random().toString(36).substring(2, 9),
      username: cleanUser,
      passwordHash: hash,
      salt,
      displayName: displayName.trim(),
      isActive: true,
      createdAt: Date.now()
    };
    await this.repo.saveUser(user);

    const slug = storeName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "my-shop";
    let finalSlug = slug;
    let counter = 1;
    while (await this.repo.getStoreBySlug(finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const store: Store = {
      id: "store_" + Math.random().toString(36).substring(2, 9),
      ownerUserId: user.id,
      name: storeName.trim(),
      slug: finalSlug,
      planSlug: (options?.planSlug as any) || "offline",
      themeKey: options?.themeKey || "classic",
      brandColor: options?.brandColor || "#08482D",
      brandType: options?.brandType || "custom",
      description: options?.description || "Welcome to our shop!",
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
    await this.repo.saveStore(store);

    const membership: Membership = {
      id: "mem_" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      storeId: store.id,
      role: "owner",
      referralCode: "OWNER",
      isActive: true
    };
    await this.repo.saveMembership(membership);

    return { user, store };
  }

  async login(username: string, password: string): Promise<{ user: User; memberships: Membership[] }> {
    const user = await this.repo.getUserByUsername(username.trim().toLowerCase());
    if (!user || !user.isActive) throw new Error("Invalid username or password");

    const isValid = await verifyPassword(password, user.passwordHash, user.salt);
    if (!isValid) throw new Error("Invalid username or password");

    const allMemberships: Membership[] = [];
    const stores = await this.repo.getAllStores();
    for (const s of stores) {
      const m = await this.repo.getMembershipByUserAndStore(user.id, s.id);
      if (m && m.isActive) allMemberships.push(m);
    }

    if (allMemberships.length === 0) {
      throw new Error("No active store memberships found for this account");
    }

    return { user, memberships: allMemberships };
  }

  async addStaff(session: SessionContext, staffData: { username: string; displayName: string; password: string }): Promise<User> {
    if (session.role !== "owner") throw new Error("Only the store owner can add staff");
    const store = await this.repo.getStoreById(session.storeId);
    if (!store) throw new Error("Store not found");

    if (store.planSlug === "offline") {
      throw new Error("Staff accounts are not supported on the Offline Catalogue plan");
    }

    const plan = PLANS[store.planSlug];
    const maxAllowedSeats = plan.maxUsersIncluded + store.extraSeats;
    const existingMembers = await this.repo.getMembershipsByStore(store.id);
    const activeMembers = existingMembers.filter(m => m.isActive);

    if (activeMembers.length >= maxAllowedSeats) {
      throw new Error(`Seat limit reached (${maxAllowedSeats} users allowed on your plan + extra seats)`);
    }

    const cleanUsername = staffData.username.trim().toLowerCase();
    let user = await this.repo.getUserByUsername(cleanUsername);
    if (!user) {
      const { hash, salt } = await hashPassword(staffData.password);
      user = {
        id: "user_" + Math.random().toString(36).substring(2, 9),
        username: cleanUsername,
        passwordHash: hash,
        salt,
        displayName: staffData.displayName.trim(),
        isActive: true,
        createdAt: Date.now()
      };
      await this.repo.saveUser(user);
    } else {
      user.isActive = true;
      await this.repo.saveUser(user);
    }

    const refCode = "REF-" + Math.random().toString(36).substring(2, 6).toUpperCase();
    const membership: Membership = {
      id: "mem_" + Math.random().toString(36).substring(2, 9),
      userId: user.id,
      storeId: store.id,
      role: "staff",
      referralCode: refCode,
      isActive: true
    };
    await this.repo.saveMembership(membership);

    return user;
  }

  async updateStaff(
    session: SessionContext,
    staffUserId: string,
    data: { displayName?: string; username?: string }
  ): Promise<User> {
    if (session.role !== "owner") throw new Error("Only the store owner can edit staff");
    const membership = await this.repo.getMembershipByUserAndStore(staffUserId, session.storeId);
    if (!membership || membership.role !== "staff") {
      throw new Error("Staff member not found in this store");
    }

    const user = await this.repo.getUserById(staffUserId);
    if (!user) throw new Error("User not found");

    if (data.displayName && data.displayName.trim()) {
      user.displayName = data.displayName.trim();
    }

    if (data.username && data.username.trim()) {
      const cleanNewUsername = data.username.trim().toLowerCase();
      if (cleanNewUsername !== user.username) {
        const existing = await this.repo.getUserByUsername(cleanNewUsername);
        if (existing && existing.id !== user.id) {
          throw new Error("Username already taken");
        }
        user.username = cleanNewUsername;
      }
    }

    await this.repo.saveUser(user);
    return user;
  }

  async resetStaffPassword(
    session: SessionContext,
    staffUserId: string,
    newPassword: string
  ): Promise<void> {
    if (session.role !== "owner") throw new Error("Only the store owner can reset staff password");
    const membership = await this.repo.getMembershipByUserAndStore(staffUserId, session.storeId);
    if (!membership || membership.role !== "staff") {
      throw new Error("Staff member not found in this store");
    }

    if (!newPassword || newPassword.trim().length === 0) {
      throw new Error("Password cannot be empty");
    }

    const user = await this.repo.getUserById(staffUserId);
    if (!user) throw new Error("User not found");

    const { hash, salt } = await hashPassword(newPassword);
    user.passwordHash = hash;
    user.salt = salt;
    await this.repo.saveUser(user);
  }

  async setStaffActive(session: SessionContext, staffUserId: string, isActive: boolean): Promise<void> {
    if (session.role !== "owner") throw new Error("Only owner can toggle staff active state");
    const membership = await this.repo.getMembershipByUserAndStore(staffUserId, session.storeId);
    if (!membership || membership.role === "owner") throw new Error("Cannot alter owner membership");

    if (isActive && !membership.isActive) {
      const store = await this.repo.getStoreById(session.storeId);
      if (store) {
        const plan = PLANS[store.planSlug];
        const maxAllowedSeats = plan.maxUsersIncluded + store.extraSeats;
        const existingMembers = await this.repo.getMembershipsByStore(store.id);
        const activeMembers = existingMembers.filter(m => m.isActive);
        if (activeMembers.length >= maxAllowedSeats) {
          throw new Error(`Seat limit reached (${maxAllowedSeats} users allowed on your plan + extra seats)`);
        }
      }
    }

    membership.isActive = isActive;
    await this.repo.saveMembership(membership);

    const user = await this.repo.getUserById(staffUserId);
    if (user) {
      user.isActive = isActive;
      await this.repo.saveUser(user);
    }
  }
}
