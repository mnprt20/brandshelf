import { MemoryRepository } from "./memory";

const STORAGE_KEY = "mintshelf_prototype_db_v1";

export class BrowserStorageRepository extends MemoryRepository {
  constructor() {
    super();
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data.stores) this.stores = new Map(data.stores);
      if (data.users) this.users = new Map(data.users);
      if (data.memberships) this.memberships = new Map(data.memberships);
      if (data.categories) this.categories = new Map(data.categories);
      if (data.products) this.products = new Map(data.products);
      if (data.customers) this.customers = new Map(data.customers);
      if (data.addresses) this.addresses = new Map(data.addresses);
      if (data.orders) this.orders = new Map(data.orders);
      if (data.statusEvents) this.statusEvents = data.statusEvents;
      if (data.aiMessages) this.aiMessages = data.aiMessages;
      if (data.pendingActions) this.pendingActions = new Map(data.pendingActions);
      if (data.aiUsage) this.aiUsage = new Map(data.aiUsage);
    } catch (err) {
      console.warn("Storage load error:", err);
    }
  }

  public saveToStorage(): void {
    if (typeof window === "undefined") return;
    try {
      const dump = {
        stores: Array.from(this.stores.entries()),
        users: Array.from(this.users.entries()),
        memberships: Array.from(this.memberships.entries()),
        categories: Array.from(this.categories.entries()),
        products: Array.from(this.products.entries()),
        customers: Array.from(this.customers.entries()),
        addresses: Array.from(this.addresses.entries()),
        orders: Array.from(this.orders.entries()),
        statusEvents: this.statusEvents,
        aiMessages: this.aiMessages,
        pendingActions: Array.from(this.pendingActions.entries()),
        aiUsage: Array.from(this.aiUsage.entries()),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dump));
    } catch (err) {
      console.warn("Storage save error:", err);
    }
  }

  async saveStore(store: any): Promise<void> { await super.saveStore(store); this.saveToStorage(); }
  async saveUser(user: any): Promise<void> { await super.saveUser(user); this.saveToStorage(); }
  async saveMembership(m: any): Promise<void> { await super.saveMembership(m); this.saveToStorage(); }
  async saveCategory(c: any): Promise<void> { await super.saveCategory(c); this.saveToStorage(); }
  async deleteCategory(sId: any, cId: any): Promise<void> { await super.deleteCategory(sId, cId); this.saveToStorage(); }
  async saveProduct(p: any): Promise<void> { await super.saveProduct(p); this.saveToStorage(); }
  async deleteProduct(sId: any, pId: any): Promise<void> { await super.deleteProduct(sId, pId); this.saveToStorage(); }
  async saveCustomer(c: any): Promise<void> { await super.saveCustomer(c); this.saveToStorage(); }
  async saveAddress(a: any): Promise<void> { await super.saveAddress(a); this.saveToStorage(); }
  async deleteAddress(cId: any, aId: any): Promise<void> { await super.deleteAddress(cId, aId); this.saveToStorage(); }
  async saveOrder(o: any): Promise<void> { await super.saveOrder(o); this.saveToStorage(); }
  async addStatusEvent(e: any): Promise<void> { await super.addStatusEvent(e); this.saveToStorage(); }
  async saveAiMessage(m: any): Promise<void> { await super.saveAiMessage(m); this.saveToStorage(); }
  async clearAiMessages(sId: any, uId: any): Promise<void> { await super.clearAiMessages(sId, uId); this.saveToStorage(); }
  async savePendingAction(a: any): Promise<void> { await super.savePendingAction(a); this.saveToStorage(); }
  async incrementAiUsage(sId: any, d: any): Promise<number> { const res = await super.incrementAiUsage(sId, d); this.saveToStorage(); return res; }
  async clearAll(): Promise<void> { await super.clearAll(); if (typeof window !== "undefined") localStorage.removeItem(STORAGE_KEY); }
}
