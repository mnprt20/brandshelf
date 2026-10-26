import { IRepository } from "../repository/types";
import { Store, SessionContext } from "../types";
import { validateBrandColor, validateThemeKey } from "../themes/registry";

export class StoreService {
  constructor(private repo: IRepository) {}

  async createStore(ownerUserId: string, name: string): Promise<Store> {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    
    let finalSlug = slug || "store";
    let counter = 1;
    while (await this.repo.getStoreBySlug(finalSlug)) {
      finalSlug = `${slug}-${counter++}`;
    }

    const store: Store = {
      id: "store_" + Math.random().toString(36).substring(2, 9),
      ownerUserId,
      name,
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
      deliveryFeePaise: 4000,
      freeDeliveryAbovePaise: 50000,
      minOrderPaise: 10000,
      deliveryNote: "Delivered directly from our store.",
      acceptUpiQr: true,
      acceptCod: true,
      upiId: "shop@upi",
      createdAt: Date.now()
    };

    await this.repo.saveStore(store);
    return store;
  }

  async getStoreBySlug(slug: string): Promise<Store | null> {
    const store = await this.repo.getStoreBySlug(slug);
    if (!store || !store.isActive) return null;
    return store;
  }

  async getStoreById(session: SessionContext): Promise<Store> {
    const store = await this.repo.getStoreById(session.storeId);
    if (!store) throw new Error("Store not found");
    return store;
  }

  async updateStoreSettings(session: SessionContext, update: Partial<Store>): Promise<Store> {
    if (session.role !== "owner") throw new Error("Only owner can update store settings");
    const store = await this.repo.getStoreById(session.storeId);
    if (!store) throw new Error("Store not found");

    if (update.brandColor !== undefined) {
      if (!validateBrandColor(update.brandColor)) {
        throw new Error("Invalid brand color. Must be in #RRGGBB format.");
      }
      store.brandColor = update.brandColor;
    }

    if (update.themeKey !== undefined) {
      if (!validateThemeKey(update.themeKey)) {
        throw new Error("Invalid theme key");
      }
      store.themeKey = update.themeKey;
    }

    if (update.name !== undefined) store.name = update.name.trim();
    if (update.description !== undefined) store.description = update.description.trim();
    if (update.upiId !== undefined) store.upiId = update.upiId.trim();
    if (update.upiQrImage !== undefined) store.upiQrImage = update.upiQrImage;
    if (update.logo !== undefined) store.logo = update.logo;
    if (update.onlineOpen !== undefined) store.onlineOpen = !!update.onlineOpen;
    if (update.pickupEnabled !== undefined) store.pickupEnabled = !!update.pickupEnabled;
    if (update.deliveryEnabled !== undefined) store.deliveryEnabled = !!update.deliveryEnabled;
    if (update.deliveryFeePaise !== undefined) store.deliveryFeePaise = Math.max(0, update.deliveryFeePaise);
    if (update.freeDeliveryAbovePaise !== undefined) store.freeDeliveryAbovePaise = Math.max(0, update.freeDeliveryAbovePaise);
    if (update.minOrderPaise !== undefined) store.minOrderPaise = Math.max(0, update.minOrderPaise);
    if (update.deliveryNote !== undefined) store.deliveryNote = update.deliveryNote;
    if (update.acceptUpiQr !== undefined) store.acceptUpiQr = !!update.acceptUpiQr;
    if (update.acceptCod !== undefined) store.acceptCod = !!update.acceptCod;

    await this.repo.saveStore(store);
    return store;
  }
}
