import {
  Store, User, Membership, Category, Product, Customer,
  CustomerAddress, Order, StatusEvent, AiMessage, PendingAction, AiUsage
} from "../types";

export interface IRepository {
  // Stores
  getStoreById(id: string): Promise<Store | null>;
  getStoreBySlug(slug: string): Promise<Store | null>;
  getAllStores(): Promise<Store[]>;
  saveStore(store: Store): Promise<void>;

  // Users & Memberships
  getUserById(id: string): Promise<User | null>;
  getUserByUsername(username: string): Promise<User | null>;
  saveUser(user: User): Promise<void>;
  getMembershipsByStore(storeId: string): Promise<Membership[]>;
  getMembershipByUserAndStore(userId: string, storeId: string): Promise<Membership | null>;
  getMembershipByReferralCode(storeId: string, code: string): Promise<Membership | null>;
  saveMembership(membership: Membership): Promise<void>;

  // Catalog
  getCategories(storeId: string): Promise<Category[]>;
  saveCategory(category: Category): Promise<void>;
  deleteCategory(storeId: string, categoryId: string): Promise<void>;
  getProducts(storeId: string): Promise<Product[]>;
  getProductById(storeId: string, id: string): Promise<Product | null>;
  saveProduct(product: Product): Promise<void>;
  deleteProduct(storeId: string, productId: string): Promise<void>;

  // Customers
  getCustomerByPhone(storeId: string, phone: string): Promise<Customer | null>;
  getCustomerById(storeId: string, id: string): Promise<Customer | null>;
  saveCustomer(customer: Customer): Promise<void>;
  getAddresses(customerId: string): Promise<CustomerAddress[]>;
  saveAddress(address: CustomerAddress): Promise<void>;
  deleteAddress(customerId: string, addressId: string): Promise<void>;

  // Orders
  getOrders(storeId: string): Promise<Order[]>;
  getOrderById(storeId: string, orderId: string): Promise<Order | null>;
  getOrderByNumber(storeId: string, orderNumber: string): Promise<Order | null>;
  saveOrder(order: Order): Promise<void>;
  addStatusEvent(event: StatusEvent): Promise<void>;
  getStatusEvents(orderId: string): Promise<StatusEvent[]>;

  // AI & Pending actions
  getAiMessages(storeId: string, userId: string): Promise<AiMessage[]>;
  saveAiMessage(message: AiMessage): Promise<void>;
  clearAiMessages(storeId: string, userId: string): Promise<void>;
  getPendingActions(storeId: string): Promise<PendingAction[]>;
  getPendingActionById(storeId: string, actionId: string): Promise<PendingAction | null>;
  savePendingAction(action: PendingAction): Promise<void>;
  getAiUsage(storeId: string, dateStr: string): Promise<AiUsage | null>;
  incrementAiUsage(storeId: string, dateStr: string): Promise<number>;

  // Maintenance
  clearAll(): Promise<void>;
}
