import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  query,
  where
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "../services/firebase";
import { BrowserStorageRepository } from "./baseStorage";
import {
  Store,
  User,
  Membership,
  Category,
  Product,
  Customer,
  CustomerAddress,
  Order,
  StatusEvent,
  AiMessage,
  PendingAction,
  AiUsage
} from "../types";

export class FirestoreRepository extends BrowserStorageRepository {
  private isOnline = true;

  constructor() {
    super();
  }

  // --- STORES ---
  async getStoreById(id: string): Promise<Store | null> {
    const cached = await super.getStoreById(id);
    if (!this.isOnline) return cached;
    const path = `stores/${id}`;
    try {
      const snap = await getDoc(doc(db, "stores", id));
      if (!snap.exists()) return cached;
      const data = snap.data() as Store;
      await super.saveStore(data);
      return data;
    } catch (err) {
      console.warn("Firestore getStoreById error, using cache:", err);
      return cached;
    }
  }

  async getStoreBySlug(slug: string): Promise<Store | null> {
    const cached = await super.getStoreBySlug(slug);
    if (!this.isOnline) return cached;
    const path = "stores";
    try {
      const q = query(collection(db, "stores"), where("slug", "==", slug));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const data = snap.docs[0].data() as Store;
      await super.saveStore(data);
      return data;
    } catch (err) {
      console.warn("Firestore getStoreBySlug error, using cache:", err);
      return cached;
    }
  }

  async getAllStores(): Promise<Store[]> {
    const cached = await super.getAllStores();
    if (!this.isOnline) return cached;
    try {
      const snap = await getDocs(collection(db, "stores"));
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as Store);
      for (const s of list) {
        await super.saveStore(s);
      }
      return list;
    } catch (err) {
      console.warn("Firestore getAllStores error, using cache:", err);
      return cached;
    }
  }

  async saveStore(store: Store): Promise<void> {
    await super.saveStore(store);
    const path = `stores/${store.id}`;
    try {
      await setDoc(doc(db, "stores", store.id), store);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // --- USERS & MEMBERSHIPS ---
  async getUserById(id: string): Promise<User | null> {
    const cached = await super.getUserById(id);
    try {
      const snap = await getDoc(doc(db, "users", id));
      if (!snap.exists()) return cached;
      const u = snap.data() as User;
      await super.saveUser(u);
      return u;
    } catch (err) {
      return cached;
    }
  }

  async getUserByUsername(username: string): Promise<User | null> {
    const cached = await super.getUserByUsername(username);
    try {
      const q = query(collection(db, "users"), where("username", "==", username.toLowerCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const u = snap.docs[0].data() as User;
      await super.saveUser(u);
      return u;
    } catch (err) {
      return cached;
    }
  }

  async saveUser(user: User): Promise<void> {
    await super.saveUser(user);
    const path = `users/${user.id}`;
    try {
      await setDoc(doc(db, "users", user.id), user);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async getMembershipsByStore(storeId: string): Promise<Membership[]> {
    const cached = await super.getMembershipsByStore(storeId);
    try {
      const q = query(collection(db, "memberships"), where("storeId", "==", storeId));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as Membership);
      for (const m of list) await super.saveMembership(m);
      return list;
    } catch (err) {
      return cached;
    }
  }

  async getMembershipByUserAndStore(userId: string, storeId: string): Promise<Membership | null> {
    const cached = await super.getMembershipByUserAndStore(userId, storeId);
    try {
      const q = query(collection(db, "memberships"), where("userId", "==", userId), where("storeId", "==", storeId));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const m = snap.docs[0].data() as Membership;
      await super.saveMembership(m);
      return m;
    } catch (err) {
      return cached;
    }
  }

  async getMembershipByReferralCode(storeId: string, code: string): Promise<Membership | null> {
    const cached = await super.getMembershipByReferralCode(storeId, code);
    try {
      const q = query(collection(db, "memberships"), where("storeId", "==", storeId), where("referralCode", "==", code.toUpperCase().trim()));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const m = snap.docs[0].data() as Membership;
      await super.saveMembership(m);
      return m;
    } catch (err) {
      return cached;
    }
  }

  async saveMembership(m: Membership): Promise<void> {
    await super.saveMembership(m);
    const path = `memberships/${m.id}`;
    try {
      await setDoc(doc(db, "memberships", m.id), m);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  // --- CATALOG (CATEGORIES & PRODUCTS) ---
  async getCategories(storeId: string): Promise<Category[]> {
    const cached = await super.getCategories(storeId);
    try {
      const snap = await getDocs(collection(db, "stores", storeId, "categories"));
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as Category);
      for (const c of list) await super.saveCategory(c);
      return list;
    } catch (err) {
      return cached;
    }
  }

  async saveCategory(c: Category): Promise<void> {
    await super.saveCategory(c);
    const path = `stores/${c.storeId}/categories/${c.id}`;
    try {
      await setDoc(doc(db, "stores", c.storeId, "categories", c.id), c);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async deleteCategory(storeId: string, categoryId: string): Promise<void> {
    await super.deleteCategory(storeId, categoryId);
    const path = `stores/${storeId}/categories/${categoryId}`;
    try {
      await deleteDoc(doc(db, "stores", storeId, "categories", categoryId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  async getProducts(storeId: string): Promise<Product[]> {
    const cached = await super.getProducts(storeId);
    try {
      const snap = await getDocs(collection(db, "stores", storeId, "products"));
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as Product);
      for (const p of list) await super.saveProduct(p);
      return list;
    } catch (err) {
      return cached;
    }
  }

  async getProductById(storeId: string, id: string): Promise<Product | null> {
    const cached = await super.getProductById(storeId, id);
    try {
      const snap = await getDoc(doc(db, "stores", storeId, "products", id));
      if (!snap.exists()) return cached;
      const p = snap.data() as Product;
      await super.saveProduct(p);
      return p;
    } catch (err) {
      return cached;
    }
  }

  async saveProduct(p: Product): Promise<void> {
    await super.saveProduct(p);
    const path = `stores/${p.storeId}/products/${p.id}`;
    try {
      await setDoc(doc(db, "stores", p.storeId, "products", p.id), p);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async deleteProduct(storeId: string, productId: string): Promise<void> {
    await super.deleteProduct(storeId, productId);
    const path = `stores/${storeId}/products/${productId}`;
    try {
      await deleteDoc(doc(db, "stores", storeId, "products", productId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // --- CUSTOMERS ---
  async getCustomerByPhone(storeId: string, phone: string): Promise<Customer | null> {
    const cached = await super.getCustomerByPhone(storeId, phone);
    try {
      const q = query(collection(db, "customers"), where("storeId", "==", storeId), where("phone", "==", phone.trim()));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const c = snap.docs[0].data() as Customer;
      await super.saveCustomer(c);
      return c;
    } catch (err) {
      return cached;
    }
  }

  async getCustomerById(storeId: string, id: string): Promise<Customer | null> {
    const cached = await super.getCustomerById(storeId, id);
    try {
      const snap = await getDoc(doc(db, "customers", id));
      if (!snap.exists()) return cached;
      const c = snap.data() as Customer;
      await super.saveCustomer(c);
      return c;
    } catch (err) {
      return cached;
    }
  }

  async saveCustomer(c: Customer): Promise<void> {
    await super.saveCustomer(c);
    const path = `customers/${c.id}`;
    try {
      await setDoc(doc(db, "customers", c.id), c);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async getAddresses(customerId: string): Promise<CustomerAddress[]> {
    const cached = await super.getAddresses(customerId);
    try {
      const snap = await getDocs(collection(db, "customers", customerId, "addresses"));
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as CustomerAddress);
      for (const a of list) await super.saveAddress(a);
      return list;
    } catch (err) {
      return cached;
    }
  }

  async saveAddress(a: CustomerAddress): Promise<void> {
    await super.saveAddress(a);
    const path = `customers/${a.customerId}/addresses/${a.id}`;
    try {
      await setDoc(doc(db, "customers", a.customerId, "addresses", a.id), a);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }

  async deleteAddress(customerId: string, addressId: string): Promise<void> {
    await super.deleteAddress(customerId, addressId);
    const path = `customers/${customerId}/addresses/${addressId}`;
    try {
      await deleteDoc(doc(db, "customers", customerId, "addresses", addressId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, path);
    }
  }

  // --- ORDERS ---
  async getOrders(storeId: string): Promise<Order[]> {
    const cached = await super.getOrders(storeId);
    try {
      const snap = await getDocs(collection(db, "stores", storeId, "orders"));
      if (snap.empty) return cached;
      const list = snap.docs.map(d => d.data() as Order);
      for (const o of list) await super.saveOrder(o);
      return list;
    } catch (err) {
      return cached;
    }
  }

  async getOrderById(storeId: string, orderId: string): Promise<Order | null> {
    const cached = await super.getOrderById(storeId, orderId);
    try {
      const snap = await getDoc(doc(db, "stores", storeId, "orders", orderId));
      if (!snap.exists()) return cached;
      const o = snap.data() as Order;
      await super.saveOrder(o);
      return o;
    } catch (err) {
      return cached;
    }
  }

  async getOrderByNumber(storeId: string, orderNumber: string): Promise<Order | null> {
    const cached = await super.getOrderByNumber(storeId, orderNumber);
    try {
      const q = query(collection(db, "stores", storeId, "orders"), where("number", "==", orderNumber));
      const snap = await getDocs(q);
      if (snap.empty) return cached;
      const o = snap.docs[0].data() as Order;
      await super.saveOrder(o);
      return o;
    } catch (err) {
      return cached;
    }
  }

  async saveOrder(o: Order): Promise<void> {
    await super.saveOrder(o);
    const path = `stores/${o.storeId}/orders/${o.id}`;
    try {
      await setDoc(doc(db, "stores", o.storeId, "orders", o.id), o);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, path);
    }
  }
}
