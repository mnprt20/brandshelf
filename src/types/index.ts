export type PlanSlug = "offline" | "franchise" | "online";
export type UserRole = "owner" | "staff";
export type OrderSource = "qr" | "online";
export type OrderFulfilment = "pickup" | "delivery" | "counter";
export type OrderStatus = "new" | "confirmed" | "preparing" | "ready" | "out_for_delivery" | "completed" | "cancelled";
export type PaymentStatus = "pending" | "received" | "failed";
export type PaymentMethodType = "upi" | "cod";

export interface Store {
  id: string;
  ownerUserId: string;
  name: string;
  slug: string;
  planSlug: PlanSlug;
  themeKey: string;
  brandColor: string;
  logo?: string;
  description: string;
  extraSeats: number;
  isActive: boolean;
  onlineOpen: boolean;
  pickupEnabled: boolean;
  deliveryEnabled: boolean;
  deliveryFeePaise: number;
  freeDeliveryAbovePaise: number;
  minOrderPaise: number;
  deliveryNote: string;
  acceptUpiQr: boolean;
  acceptCod: boolean;
  upiId: string;
  upiQrImage?: string;
  brandType?: string;
  createdAt: number;
}

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  displayName: string;
  isActive: boolean;
  createdAt: number;
}

export interface Membership {
  id: string;
  userId: string;
  storeId: string;
  role: UserRole;
  referralCode: string;
  isActive: boolean;
}

export interface Category {
  id: string;
  storeId: string;
  name: string;
  sortOrder: number;
}

export interface Product {
  id: string;
  storeId: string;
  categoryId: string;
  name: string;
  description: string;
  pricePaise: number;
  stock: number | null;
  isAvailable: boolean;
  image?: string;
  images?: string[];
  isFeatured?: boolean;
  isBestSeller?: boolean;
  soldCount?: number;
  createdByUserId: string;
  createdAt: number;
}

export interface Customer {
  id: string;
  storeId: string;
  name: string;
  phone: string;
  passwordHash: string;
  salt: string;
  failedAttempts: number;
  lockedUntil: number | null;
}

export interface CustomerAddress {
  id: string;
  customerId: string;
  label: string;
  street: string;
  landmark?: string;
  pincode: string;
  isDefault: boolean;
}

export interface OrderItemSnapshot {
  productId: string;
  nameSnapshot: string;
  unitPricePaise: number;
  quantity: number;
  note?: string;
}

export interface Order {
  id: string;
  storeId: string;
  number: string;
  customerName: string;
  customerPhone: string;
  note?: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotalPaise: number;
  deliveryFeePaise: number;
  totalPaise: number;
  source: OrderSource;
  fulfilment: OrderFulfilment;
  deliveryAddressText?: string;
  paymentMethod: PaymentMethodType;
  paymentReference?: string;
  placedByUserId: string | null;
  customerId: string | null;
  items: OrderItemSnapshot[];
  createdAt: number;
}

export interface StatusEvent {
  id: string;
  orderId: string;
  storeId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
  changedByUserId?: string;
  timestamp: number;
}

export interface AiMessage {
  id: string;
  storeId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
}

export interface PendingAction {
  id: string;
  storeId: string;
  userId: string;
  toolName: string;
  summary: string;
  args: Record<string, any>;
  status: "pending" | "confirmed" | "cancelled" | "expired";
  createdAt: number;
  expiresAt: number;
}

export interface AiUsage {
  id: string;
  storeId: string;
  dateStr: string; // YYYY-MM-DD
  count: number;
}

export interface SessionContext {
  userId: string;
  storeId: string;
  role: UserRole;
}

export interface CustomerSessionContext {
  customerId: string;
  storeId: string;
  name: string;
  phone: string;
}
