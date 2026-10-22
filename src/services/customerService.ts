import { IRepository } from "../repository/types";
import { Customer, CustomerAddress } from "../types";
import { hashPassword, verifyPassword } from "../utils/crypto";

export class CustomerService {
  constructor(private repo: IRepository) {}

  async register(storeId: string, name: string, phone: string, password: string): Promise<Customer> {
    const store = await this.repo.getStoreById(storeId);
    if (!store || store.planSlug !== "online") {
      throw new Error("Customer accounts are only available on the Online plan");
    }

    const cleanPhone = phone.trim();
    const existing = await this.repo.getCustomerByPhone(storeId, cleanPhone);
    if (existing) throw new Error("A customer account with this phone already exists for this store");

    const { hash, salt } = await hashPassword(password);
    const customer: Customer = {
      id: "cust_" + Math.random().toString(36).substring(2, 9),
      storeId,
      name: name.trim(),
      phone: cleanPhone,
      passwordHash: hash,
      salt,
      failedAttempts: 0,
      lockedUntil: null
    };

    await this.repo.saveCustomer(customer);
    return customer;
  }

  async login(storeId: string, phone: string, password: string): Promise<Customer> {
    const customer = await this.repo.getCustomerByPhone(storeId, phone.trim());
    if (!customer) throw new Error("Invalid phone or password");

    const now = Date.now();
    if (customer.lockedUntil && customer.lockedUntil > now) {
      const waitMin = Math.ceil((customer.lockedUntil - now) / 60000);
      throw new Error(`Account locked due to 5 failed attempts. Please try again in ${waitMin} minutes.`);
    }

    const isValid = await verifyPassword(password, customer.passwordHash, customer.salt);
    if (!isValid) {
      customer.failedAttempts += 1;
      if (customer.failedAttempts >= 5) {
        customer.lockedUntil = now + 10 * 60 * 1000;
        customer.failedAttempts = 0;
      }
      await this.repo.saveCustomer(customer);
      throw new Error(customer.lockedUntil ? "Account locked due to 5 failed attempts. Please try again later." : "Invalid phone or password");
    }

    customer.failedAttempts = 0;
    customer.lockedUntil = null;
    await this.repo.saveCustomer(customer);
    return customer;
  }

  async addAddress(customerId: string, address: Omit<CustomerAddress, "id" | "customerId">): Promise<CustomerAddress> {
    const addresses = await this.repo.getAddresses(customerId);
    const isFirst = addresses.length === 0;

    const newAddr: CustomerAddress = {
      id: "addr_" + Math.random().toString(36).substring(2, 9),
      customerId,
      label: address.label.trim(),
      street: address.street.trim(),
      landmark: address.landmark?.trim(),
      pincode: address.pincode.trim(),
      isDefault: address.isDefault || isFirst
    };

    if (newAddr.isDefault) {
      for (const a of addresses) {
        if (a.isDefault) {
          a.isDefault = false;
          await this.repo.saveAddress(a);
        }
      }
    }

    await this.repo.saveAddress(newAddr);
    return newAddr;
  }
}
