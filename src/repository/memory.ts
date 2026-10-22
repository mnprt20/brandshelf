import { IRepository } from "./types";
import {
  Store, User, Membership, Category, Product, Customer,
  CustomerAddress, Order, StatusEvent, AiMessage, PendingAction, AiUsage
} from "../types";

export class MemoryRepository implements IRepository {
  public stores: Map<string, Store> = new Map();
  public users: Map<string, User> = new Map();
  public memberships: Map<string, Membership> = new Map();
  public categories: Map<string, Category> = new Map();
  public products: Map<string, Product> = new Map();
  public customers: Map<string, Customer> = new Map();
  public addresses: Map<string, CustomerAddress> = new Map();
  public orders: Map<string, Order> = new Map();
  public statusEvents: StatusEvent[] = [];
  public aiMessages: AiMessage[] = [];
  public pendingActions: Map<string, PendingAction> = new Map();
  public aiUsage: Map<string, AiUsage> = new Map();

  async getStoreById(id: string): Promise<Store | null> {
    return this.stores.get(id) || null;
  }
  async getStoreBySlug(slug: string): Promise<Store | null> {
    for (const s of this.stores.values()) {
      if (s.slug.toLowerCase() === slug.toLowerCase()) return s;
    }
    return null;
  }
  async getAllStores(): Promise<Store[]> {
    return Array.from(this.stores.values());
  }
  async saveStore(store: Store): Promise<void> {
    this.stores.set(store.id, { ...store });
  }

  async getUserById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }
  async getUserByUsername(username: string): Promise<User | null> {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) return u;
    }
    return null;
  }
  async saveUser(user: User): Promise<void> {
    this.users.set(user.id, { ...user });
  }

  async getMembershipsByStore(storeId: string): Promise<Membership[]> {
    return Array.from(this.memberships.values()).filter(m => m.storeId === storeId);
  }
  async getMembershipByUserAndStore(userId: string, storeId: string): Promise<Membership | null> {
    for (const m of this.memberships.values()) {
      if (m.userId === userId && m.storeId === storeId) return m;
    }
    return null;
  }
  async getMembershipByReferralCode(storeId: string, code: string): Promise<Membership | null> {
    for (const m of this.memberships.values()) {
      if (m.storeId === storeId && m.referralCode === code && m.isActive) return m;
    }
    return null;
  }
  async saveMembership(membership: Membership): Promise<void> {
    this.memberships.set(membership.id, { ...membership });
  }

  async getCategories(storeId: string): Promise<Category[]> {
    return Array.from(this.categories.values())
      .filter(c => c.storeId === storeId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
  }
  async saveCategory(category: Category): Promise<void> {
    this.categories.set(category.id, { ...category });
  }
  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    const c = this.categories.get(categoryId);
    if (c && c.storeId === storeId) this.categories.delete(categoryId);
  }

  async getProducts(storeId: string): Promise<Product[]> {
    return Array.from(this.products.values()).filter(p => p.storeId === storeId);
  }
  async getProductById(storeId: string, id: string): Promise<Product | null> {
    const p = this.products.get(id);
    return (p && p.storeId === storeId) ? { ...p } : null;
  }
  async saveProduct(product: Product): Promise<void> {
    this.products.set(product.id, { ...product });
  }
  async deleteProduct(storeId: string, productId: string): Promise<void> {
    const p = this.products.get(productId);
    if (p && p.storeId === storeId) this.products.delete(productId);
  }

  async getCustomerByPhone(storeId: string, phone: string): Promise<Customer | null> {
    for (const c of this.customers.values()) {
      if (c.storeId === storeId && c.phone === phone) return { ...c };
    }
    return null;
  }
  async getCustomerById(storeId: string, id: string): Promise<Customer | null> {
    const c = this.customers.get(id);
    return (c && c.storeId === storeId) ? { ...c } : null;
  }
  async saveCustomer(customer: Customer): Promise<void> {
    this.customers.set(customer.id, { ...customer });
  }

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    return Array.from(this.addresses.values()).filter(a => a.customerId === customerId);
  }
  async saveAddress(address: CustomerAddress): Promise<void> {
    this.addresses.set(address.id, { ...address });
  }
  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    const a = this.addresses.get(addressId);
    if (a && a.customerId === customerId) this.addresses.delete(addressId);
  }

  async getOrders(storeId: string): Promise<Order[]> {
    return Array.from(this.orders.values())
      .filter(o => o.storeId === storeId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  async getOrderById(storeId: string, orderId: string): Promise<Order | null> {
    const o = this.orders.get(orderId);
    return (o && o.storeId === storeId) ? { ...o } : null;
  }
  async getOrderByNumber(storeId: string, orderNumber: string): Promise<Order | null> {
    for (const o of this.orders.values()) {
      if (o.storeId === storeId && o.number.toLowerCase() === orderNumber.toLowerCase()) return { ...o };
    }
    return null;
  }
  async saveOrder(order: Order): Promise<void> {
    this.orders.set(order.id, { ...order });
  }

  async addStatusEvent(event: StatusEvent): Promise<void> {
    this.statusEvents.push({ ...event });
  }
  async getStatusEvents(orderId: string): Promise<StatusEvent[]> {
    return this.statusEvents.filter(e => e.orderId === orderId).sort((a, b) => a.timestamp - b.timestamp);
  }

  async getAiMessages(storeId: string, userId: string): Promise<AiMessage[]> {
    return this.aiMessages.filter(m => m.storeId === storeId && m.userId === userId);
  }
  async saveAiMessage(message: AiMessage): Promise<void> {
    this.aiMessages.push({ ...message });
  }
  async clearAiMessages(storeId: string, userId: string): Promise<void> {
    this.aiMessages = this.aiMessages.filter(m => !(m.storeId === storeId && m.userId === userId));
  }

  async getPendingActions(storeId: string): Promise<PendingAction[]> {
    return Array.from(this.pendingActions.values())
      .filter(p => p.storeId === storeId)
      .sort((a, b) => b.createdAt - a.createdAt);
  }
  async getPendingActionById(storeId: string, actionId: string): Promise<PendingAction | null> {
    const a = this.pendingActions.get(actionId);
    return (a && a.storeId === storeId) ? { ...a } : null;
  }
  async savePendingAction(action: PendingAction): Promise<void> {
    this.pendingActions.set(action.id, { ...action });
  }

  async getAiUsage(storeId: string, dateStr: string): Promise<AiUsage | null> {
    return this.aiUsage.get(`${storeId}_${dateStr}`) || null;
  }
  async incrementAiUsage(storeId: string, dateStr: string): Promise<number> {
    const key = `${storeId}_${dateStr}`;
    const cur = this.aiUsage.get(key) || { id: key, storeId, dateStr, count: 0 };
    cur.count += 1;
    this.aiUsage.set(key, cur);
    return cur.count;
  }

  async clearAll(): Promise<void> {
    this.stores.clear();
    this.users.clear();
    this.memberships.clear();
    this.categories.clear();
    this.products.clear();
    this.customers.clear();
    this.addresses.clear();
    this.orders.clear();
    this.statusEvents = [];
    this.aiMessages = [];
    this.pendingActions.clear();
    this.aiUsage.clear();
  }
}
