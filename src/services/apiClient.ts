import { signInWithCustomToken } from "firebase/auth";
import { auth } from "./firebase";
import { SessionContext, CustomerSessionContext, Store, User, Order } from "../types";

async function getAuthHeaders(): Promise<Record<string, string>> {
  const user = auth.currentUser;
  if (!user) return {};
  try {
    const token = await user.getIdToken();
    return { Authorization: `Bearer ${token}` };
  } catch {
    return {};
  }
}

// ---------------- AUTH ----------------
export async function apiMerchantLogin(username: string, password: string): Promise<SessionContext> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");

  if (data.customToken) {
    try {
      const cred = await signInWithCustomToken(auth, data.customToken);
      const tokenResult = await cred.user.getIdTokenResult();
      return {
        userId: (tokenResult.claims.userId as string) || data.session.userId,
        storeId: (tokenResult.claims.storeId as string) || data.session.storeId,
        role: (tokenResult.claims.role as "owner" | "staff") || data.session.role
      };
    } catch (e: any) {
      console.warn("signInWithCustomToken note:", e.message);
    }
  }
  return data.session;
}

export async function apiCustomerLogin(storeId: string, phone: string, password: string): Promise<CustomerSessionContext> {
  const res = await fetch("/api/auth/customer-login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId, phone, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Login failed");

  if (data.customToken) {
    try {
      const cred = await signInWithCustomToken(auth, data.customToken);
      const tokenResult = await cred.user.getIdTokenResult();
      return {
        customerId: (tokenResult.claims.customerId as string) || data.session.customerId,
        storeId: (tokenResult.claims.storeId as string) || data.session.storeId,
        name: data.session.name,
        phone: data.session.phone
      };
    } catch (e: any) {
      console.warn("signInWithCustomToken note:", e.message);
    }
  }
  return data.session;
}

export async function apiSignup(username: string, password: string, displayName: string, storeName: string, options?: any) {
  const res = await fetch("/api/auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, displayName, storeName, options })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Signup failed");

  if (data.customToken) {
    try {
      await signInWithCustomToken(auth, data.customToken);
    } catch (e: any) {
      console.warn("signInWithCustomToken note:", e.message);
    }
  }
  return data;
}

export async function apiFranchiseSignup(businessName: string, ownerName: string, password: string, options?: any) {
  const res = await fetch("/api/auth/franchise-signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessName, ownerName, password, options })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Franchise signup failed");

  if (data.customToken) {
    try {
      await signInWithCustomToken(auth, data.customToken);
    } catch (e: any) {
      console.warn("signInWithCustomToken note:", e.message);
    }
  }
  return data;
}

export async function apiCustomerRegister(storeId: string, name: string, phone: string, password: string): Promise<CustomerSessionContext> {
  const res = await fetch("/api/auth/customer-register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ storeId, name, phone, password })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Customer registration failed");

  if (data.customToken) {
    try {
      await signInWithCustomToken(auth, data.customToken);
    } catch (e: any) {
      console.warn("signInWithCustomToken note:", e.message);
    }
  }
  return data.session;
}

// ---------------- STAFF ----------------
export async function apiAddStaff(storeId: string, displayName: string, password: string, customUsername?: string) {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/staff", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId, displayName, password, customUsername })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to add staff");
  return data;
}

export async function apiUpdateStaff(userId: string, update: { displayName?: string; username?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/staff/${userId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(update)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update staff");
  return data;
}

export async function apiResetStaffPassword(userId: string, newPassword: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/staff/${userId}/reset-password`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ newPassword })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to reset password");
  return data;
}

export async function apiSetStaffActive(userId: string, storeId: string, isActive: boolean) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/staff/${userId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ userId, storeId, isActive })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update status");
  return data;
}

// ---------------- ORDERS ----------------
export async function apiCreateOrder(payload: any): Promise<Order> {
  const res = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to place order");
  return data;
}

export async function apiUpdateOrderStatus(storeId: string, orderId: string, newStatus: string): Promise<Order> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/orders/${orderId}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId, newStatus })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update order status");
  return data;
}

export async function apiUpdatePaymentStatus(storeId: string, orderId: string, paymentStatus: "received" | "failed"): Promise<Order> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/orders/${orderId}/payment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId, paymentStatus })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to update payment status");
  return data;
}

export async function apiCustomerCancelOrder(storeId: string, orderId: string): Promise<Order> {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/orders/${orderId}/cancel`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to cancel order");
  return data;
}

export async function apiTrackOrder(storeId: string, number: string, phone?: string): Promise<Order | null> {
  const query = new URLSearchParams({ storeId, number });
  if (phone) query.set("phone", phone);
  const res = await fetch(`/api/orders/track?${query.toString()}`);
  if (!res.ok) return null;
  return res.json();
}

// ---------------- AI ASSISTANT ----------------
export async function apiAiChat(storeId: string, message: string): Promise<{ text: string; quotaUsed: number; quotaTotal: number }> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/ai/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId, message })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "AI chat failed");
  return data;
}

export async function apiAiConfirmAction(storeId: string, actionId: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`/api/ai/confirm/${actionId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ storeId })
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to confirm AI action");
  return data;
}

// ---------------- ADMIN STORE SETTINGS ----------------
export async function apiAdminUpdateStore(storeId: string, adminKey: string, payload: { planSlug?: string; extraSeats?: number; isActive?: boolean }): Promise<Store> {
  const res = await fetch(`/api/admin/store/${storeId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey
    },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Admin update failed");
  return data;
}

// ---------------- STUDIO PHOTO (AI PHOTO ENHANCEMENT) ----------------
export interface EnhancePhotoParams {
  imageBase64?: string;
  mimeType?: string;
  productType?: string;
  productId?: string;
  imageIndex?: number;
  categoryId?: string;
}

export interface EnhancePhotoResult {
  imageBase64: string;
  mimeType: string;
  warning: boolean;
  differences: string[];
  productType: string;
  quotaUsed: number;
  quotaTotal: number;
}

export async function apiEnhancePhoto(params: EnhancePhotoParams): Promise<EnhancePhotoResult> {
  const headers = await getAuthHeaders();
  const res = await fetch("/api/ai/enhance-photo", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(params)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to enhance product photo");
  return data;
}

// ---------------- RELATED PRODUCTS ----------------
export async function apiGetRelatedProducts(storeId: string, productId: string): Promise<{ alsoBought: Product[]; sameCategory: Product[] }> {
  const res = await fetch(`/api/stores/${encodeURIComponent(storeId)}/products/${encodeURIComponent(productId)}/related`);
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Failed to fetch related products");
  return data;
}

