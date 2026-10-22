import { IRepository } from "../repository/types";
import { User, Store, Membership, SessionContext } from "../types";
import { PLANS } from "../config/constants";
import { hashPassword, verifyPassword } from "../utils/crypto";

export class AuthService {
  constructor(private repo: IRepository) {}

  async signup(username: string, password: string, displayName: string, storeName: string): Promise<{ user: User; store: Store }> {
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
      planSlug: "offline",
      themeKey: "classic",
      brandColor: "#08482D",
      description: "Welcome to our shop!",
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

  async setStaffActive(session: SessionContext, staffUserId: string, isActive: boolean): Promise<void> {
    if (session.role !== "owner") throw new Error("Only owner can toggle staff active state");
    const membership = await this.repo.getMembershipByUserAndStore(staffUserId, session.storeId);
    if (!membership || membership.role === "owner") throw new Error("Cannot alter owner membership");

    membership.isActive = isActive;
    await this.repo.saveMembership(membership);

    const user = await this.repo.getUserById(staffUserId);
    if (user && !isActive) {
      user.isActive = false;
      await this.repo.saveUser(user);
    }
  }
}
