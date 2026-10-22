import { IRepository } from "../repository/types";
import { Order, OrderStatus, SessionContext, OrderItemSnapshot } from "../types";

export class OrderService {
  constructor(private repo: IRepository) {}

  async createQrOrder(storeId: string, payload: {
    customerName: string;
    customerPhone: string;
    note?: string;
    items: { productId: string; quantity: number }[];
    referralCode?: string;
  }): Promise<Order> {
    const store = await this.repo.getStoreById(storeId);
    if (!store || !store.isActive) throw new Error("Store is currently unavailable");

    if (!payload.items || payload.items.length === 0) {
      throw new Error("Order items cannot be empty");
    }

    let placedByUserId: string | null = null;
    if (payload.referralCode) {
      const member = await this.repo.getMembershipByReferralCode(storeId, payload.referralCode);
      if (member && member.isActive) {
        placedByUserId = member.userId;
      }
    }

    let subtotalPaise = 0;
    const snapshots: OrderItemSnapshot[] = [];

    for (const item of payload.items) {
      const product = await this.repo.getProductById(storeId, item.productId);
      if (!product || !product.isAvailable) throw new Error("Product is no longer available");
      if (product.stock !== null && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      const lineTotal = product.pricePaise * item.quantity;
      subtotalPaise += lineTotal;
      snapshots.push({
        productId: product.id,
        nameSnapshot: product.name,
        unitPricePaise: product.pricePaise,
        quantity: item.quantity
      });

      if (product.stock !== null) {
        product.stock -= item.quantity;
        await this.repo.saveProduct(product);
      }
    }

    const orderCount = (await this.repo.getOrders(storeId)).length + 1;
    const orderNumber = `ORD-${String(orderCount).padStart(4, "0")}`;

    const order: Order = {
      id: "ord_" + Math.random().toString(36).substring(2, 9),
      storeId,
      number: orderNumber,
      customerName: payload.customerName.trim(),
      customerPhone: payload.customerPhone.trim(),
      note: payload.note?.trim(),
      status: "new",
      paymentStatus: "pending",
      subtotalPaise,
      deliveryFeePaise: 0,
      totalPaise: subtotalPaise,
      source: "qr",
      fulfilment: "counter",
      paymentMethod: "upi",
      placedByUserId,
      customerId: null,
      items: snapshots,
      createdAt: Date.now()
    };

    await this.repo.saveOrder(order);
    await this.repo.addStatusEvent({
      id: "evt_" + Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      storeId,
      fromStatus: "new",
      toStatus: "new",
      timestamp: Date.now()
    });

    return order;
  }

  async createOnlineOrder(storeId: string, customerId: string, payload: {
    fulfilment: "pickup" | "delivery";
    addressId?: string;
    paymentMethod: "upi" | "cod";
    paymentReference?: string;
    note?: string;
    items: { productId: string; quantity: number }[];
    referralCode?: string;
  }): Promise<Order> {
    const store = await this.repo.getStoreById(storeId);
    if (!store || !store.isActive) throw new Error("Store is currently unavailable");
    if (store.planSlug !== "online") throw new Error("Online orders are only supported on the Online plan");
    if (!store.onlineOpen) throw new Error("Store is currently closed for online orders");

    if (payload.fulfilment === "delivery" && !store.deliveryEnabled) {
      throw new Error("Delivery is disabled for this store");
    }
    if (payload.fulfilment === "pickup" && !store.pickupEnabled) {
      throw new Error("Pickup is disabled for this store");
    }

    const customer = await this.repo.getCustomerById(storeId, customerId);
    if (!customer) throw new Error("Customer account not found");

    let deliveryAddressText: string | undefined = undefined;
    if (payload.fulfilment === "delivery") {
      if (!payload.addressId) throw new Error("Delivery address is required");
      const addresses = await this.repo.getAddresses(customerId);
      const addr = addresses.find(a => a.id === payload.addressId);
      if (!addr) throw new Error("Selected address not found");
      deliveryAddressText = `${addr.label}: ${addr.street}, Landmark: ${addr.landmark || "N/A"}, PIN: ${addr.pincode}`;
    }

    let subtotalPaise = 0;
    const snapshots: OrderItemSnapshot[] = [];

    for (const item of payload.items) {
      const product = await this.repo.getProductById(storeId, item.productId);
      if (!product || !product.isAvailable) throw new Error("Product unavailable");
      if (product.stock !== null && product.stock < item.quantity) {
        throw new Error(`Insufficient stock for ${product.name}`);
      }
      subtotalPaise += product.pricePaise * item.quantity;
      snapshots.push({
        productId: product.id,
        nameSnapshot: product.name,
        unitPricePaise: product.pricePaise,
        quantity: item.quantity
      });
    }

    if (subtotalPaise < store.minOrderPaise) {
      throw new Error(`Minimum order amount is ₹${store.minOrderPaise / 100}`);
    }

    for (const item of payload.items) {
      const product = await this.repo.getProductById(storeId, item.productId);
      if (product && product.stock !== null) {
        product.stock -= item.quantity;
        await this.repo.saveProduct(product);
      }
    }

    let deliveryFeePaise = 0;
    if (payload.fulfilment === "delivery") {
      deliveryFeePaise = subtotalPaise >= store.freeDeliveryAbovePaise ? 0 : store.deliveryFeePaise;
    }

    const totalPaise = subtotalPaise + deliveryFeePaise;

    let placedByUserId: string | null = null;
    if (payload.referralCode) {
      const member = await this.repo.getMembershipByReferralCode(storeId, payload.referralCode);
      if (member && member.isActive) placedByUserId = member.userId;
    }

    const orderCount = (await this.repo.getOrders(storeId)).length + 1;
    const orderNumber = `ORD-${String(orderCount).padStart(4, "0")}`;

    const order: Order = {
      id: "ord_" + Math.random().toString(36).substring(2, 9),
      storeId,
      number: orderNumber,
      customerName: customer.name,
      customerPhone: customer.phone,
      note: payload.note?.trim(),
      status: "new",
      paymentStatus: "pending",
      subtotalPaise,
      deliveryFeePaise,
      totalPaise,
      source: "online",
      fulfilment: payload.fulfilment,
      deliveryAddressText,
      paymentMethod: payload.paymentMethod,
      paymentReference: payload.paymentReference?.trim(),
      placedByUserId,
      customerId,
      items: snapshots,
      createdAt: Date.now()
    };

    await this.repo.saveOrder(order);
    await this.repo.addStatusEvent({
      id: "evt_" + Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      storeId,
      fromStatus: "new",
      toStatus: "new",
      timestamp: Date.now()
    });

    return order;
  }

  async listOrders(session: SessionContext, filterStaffId?: string): Promise<Order[]> {
    const orders = await this.repo.getOrders(session.storeId);
    if (session.role === "staff") {
      return orders.filter(o => o.placedByUserId === session.userId);
    }
    if (filterStaffId) {
      return orders.filter(o => o.placedByUserId === filterStaffId);
    }
    return orders;
  }

  async updateOrderStatus(session: SessionContext, orderNumberOrId: string, newStatus: OrderStatus): Promise<Order> {
    let order = await this.repo.getOrderById(session.storeId, orderNumberOrId);
    if (!order) {
      order = await this.repo.getOrderByNumber(session.storeId, orderNumberOrId);
    }
    if (!order) throw new Error("Order not found");

    if (session.role === "staff" && order.placedByUserId !== session.userId) {
      throw new Error("Staff can only update their own orders");
    }

    if (order.status === newStatus) return order;

    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
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

    const previousStatus = order.status;
    order.status = newStatus;

    if (newStatus === "cancelled") {
      for (const item of order.items) {
        const product = await this.repo.getProductById(session.storeId, item.productId);
        if (product && product.stock !== null) {
          product.stock += item.quantity;
          await this.repo.saveProduct(product);
        }
      }
    }

    await this.repo.saveOrder(order);
    await this.repo.addStatusEvent({
      id: "evt_" + Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      storeId: session.storeId,
      fromStatus: previousStatus,
      toStatus: newStatus,
      changedByUserId: session.userId,
      timestamp: Date.now()
    });

    return order;
  }

  async updatePaymentStatus(session: SessionContext, orderId: string, paymentStatus: "received" | "failed"): Promise<Order> {
    const order = await this.repo.getOrderById(session.storeId, orderId);
    if (!order) throw new Error("Order not found");
    if (session.role === "staff" && order.placedByUserId !== session.userId) {
      throw new Error("Staff cannot update payment for other orders");
    }
    order.paymentStatus = paymentStatus;
    await this.repo.saveOrder(order);
    return order;
  }

  async customerCancelOrder(customerId: string, storeId: string, orderId: string): Promise<Order> {
    const order = await this.repo.getOrderById(storeId, orderId);
    if (!order || order.customerId !== customerId) throw new Error("Order not found");
    if (order.status !== "new") throw new Error("Only new orders can be cancelled by customers");

    order.status = "cancelled";

    for (const item of order.items) {
      const product = await this.repo.getProductById(storeId, item.productId);
      if (product && product.stock !== null) {
        product.stock += item.quantity;
        await this.repo.saveProduct(product);
      }
    }

    await this.repo.saveOrder(order);
    await this.repo.addStatusEvent({
      id: "evt_" + Math.random().toString(36).substring(2, 9),
      orderId: order.id,
      storeId,
      fromStatus: "new",
      toStatus: "cancelled",
      timestamp: Date.now()
    });

    return order;
  }
}
