import React, { useState, useEffect, useCallback } from "react";
import { Store, Category, Product, Order, Customer, CustomerAddress, CustomerSessionContext } from "../types";
import { defaultRepository } from "../repository/storage";
import { OrderService } from "../services/orderService";
import { CustomerService } from "../services/customerService";
import { resolveTheme } from "../themes/registry";
import { ClassicTheme } from "../themes/classic";
import { MinimalTheme } from "../themes/minimal";
import { BoldTheme } from "../themes/bold";
import { formatPaise } from "../utils/money";
import { generateQrSvg } from "../utils/qr";
import { OrderHistory } from "../components/OrderHistory";
import {
  apiCreateOrder,
  apiTrackOrder,
  apiCustomerCancelOrder,
  apiCustomerLogin,
  apiCustomerRegister
} from "../services/apiClient";

interface Props {
  slug: string;
  orderNumber?: string;
  referralCode?: string;
  customerSession: CustomerSessionContext | null;
  onCustomerLogin: (session: CustomerSessionContext) => void;
  onCustomerLogout: () => void;
  onNavigate: (route: string) => void;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export const StorefrontPage: React.FC<Props> = ({
  slug,
  orderNumber,
  referralCode,
  customerSession,
  onCustomerLogin,
  onCustomerLogout,
  onNavigate
}) => {
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  // Cart & Drawer
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Order History state
  const [isOrderHistoryOpen, setIsOrderHistoryOpen] = useState(false);
  const [orderCount, setOrderCount] = useState(0);

  // Counter Checkout state (Offline / Franchise)
  const [counterName, setCounterName] = useState("");
  const [counterPhone, setCounterPhone] = useState("");
  const [counterNote, setCounterNote] = useState("");
  const [placingOrder, setPlacingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  // Online Checkout state
  const [fulfilment, setFulfilment] = useState<"pickup" | "delivery">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("upi");
  const [paymentRef, setPaymentRef] = useState("");
  const [onlineNote, setOnlineNote] = useState("");
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>("");

  // Customer Auth Modal State (when checking out online while not logged in)
  const [authTab, setAuthTab] = useState<"login" | "signup">("login");
  const [authName, setAuthName] = useState("");
  const [authPhone, setAuthPhone] = useState("");
  const [authPass, setAuthPass] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);

  // Address creation form inside checkout
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [newAddrLabel, setNewAddrLabel] = useState("Home");
  const [newAddrStreet, setNewAddrStreet] = useState("");
  const [newAddrLandmark, setNewAddrLandmark] = useState("");
  const [newAddrPincode, setNewAddrPincode] = useState("");

  // Order tracking view state (when route is #/store/:slug/order/:orderNumber)
  const [trackedOrder, setTrackedOrder] = useState<Order | null>(null);

  const orderService = new OrderService(defaultRepository);
  const customerService = new CustomerService(defaultRepository);

  const recordOrderNumber = useCallback((storeId: string, orderNum: string) => {
    try {
      const key = `mintshelf_recent_orders_${storeId}`;
      const raw = localStorage.getItem(key);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(orderNum)) {
        list.unshift(orderNum);
        localStorage.setItem(key, JSON.stringify(list.slice(0, 50)));
      }
      setOrderCount(prev => prev + 1);
    } catch {}
  }, []);

  const refreshOrderCount = useCallback(async (storeId: string) => {
    try {
      const key = `mintshelf_recent_orders_${storeId}`;
      const raw = localStorage.getItem(key);
      const recent: string[] = raw ? JSON.parse(raw) : [];
      const myOrders = await orderService.getCustomerOrders(storeId, {
        customerId: customerSession?.customerId,
        phone: customerSession?.phone,
        orderNumbers: recent
      });
      setOrderCount(myOrders.length);
    } catch {}
  }, [customerSession]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const s = await defaultRepository.getStoreBySlug(slug);
      if (!s) {
        setStore(null);
        setLoading(false);
        return;
      }
      setStore(s);
      const cats = await defaultRepository.getCategories(s.id);
      const prods = await defaultRepository.getProducts(s.id);
      setCategories(cats);
      setProducts(prods);

      if (s.pickupEnabled) setFulfilment("pickup");
      else if (s.deliveryEnabled) setFulfilment("delivery");

      if (orderNumber) {
        let ord = await apiTrackOrder(s.id, orderNumber);
        if (!ord) ord = await defaultRepository.getOrderByNumber(s.id, orderNumber);
        setTrackedOrder(ord);
      }

      await refreshOrderCount(s.id);
      setLoading(false);
    };
    load();
  }, [slug, orderNumber, refreshOrderCount]);

  // Load customer addresses if logged in & refresh order count
  useEffect(() => {
    if (customerSession && store) {
      const loadAddresses = async () => {
        const list = await defaultRepository.getAddresses(customerSession.customerId);
        setAddresses(list);
        const def = list.find(a => a.isDefault) || list[0];
        if (def) setSelectedAddressId(def.id);
      };
      loadAddresses();
      refreshOrderCount(store.id);
    }
  }, [customerSession, store, refreshOrderCount]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#F5F8EF" }}>
        <p style={{ color: "var(--color-muted)", fontSize: "16px" }}>Loading storefront...</p>
      </div>
    );
  }

  if (!store || !store.isActive) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#F5F8EF", padding: "24px", textAlign: "center" }}>
        <h1 style={{ fontSize: "28px", fontWeight: 700, margin: "0 0 8px" }}>Store Unavailable</h1>
        <p style={{ color: "var(--color-muted)", marginBottom: "20px" }}>This shop does not exist or has been paused by the owner.</p>
        <button onClick={() => onNavigate("#/")} style={{ background: "var(--color-forest)", color: "#FFFFFF", padding: "10px 20px", borderRadius: "9999px", fontWeight: 600 }}>
          Back to MintShelf
        </button>
      </div>
    );
  }

  // --- ORDER TRACKER VIEW ---
  if (orderNumber) {
    const isOnline = store.planSlug === "online";
    const canCancel = trackedOrder && trackedOrder.status === "new" && customerSession && trackedOrder.customerId === customerSession.customerId;

    const handleCancelOrder = async () => {
      if (!trackedOrder || !customerSession) return;
      try {
        let updated: Order;
        try {
          updated = await apiCustomerCancelOrder(store.id, trackedOrder.id);
        } catch {
          updated = await orderService.customerCancelOrder(customerSession.customerId, store.id, trackedOrder.id);
        }
        setTrackedOrder(updated);
      } catch (err: any) {
        alert(err.message || "Cannot cancel order");
      }
    };

    const statusSteps = ["new", "confirmed", "preparing", "ready", "completed"];
    const currentStepIdx = trackedOrder ? statusSteps.indexOf(trackedOrder.status === "out_for_delivery" ? "ready" : trackedOrder.status) : 0;

    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F7FAF4", padding: "32px 20px" }}>
        <div style={{ maxWidth: "680px", margin: "0 auto", background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: "32px" }}>
          <button onClick={() => onNavigate(`#/store/${slug}`)} style={{ background: "none", color: store.brandColor, fontWeight: 600, fontSize: "14px", marginBottom: "16px" }}>
            ← Back to Shop
          </button>

          {!trackedOrder ? (
            <div style={{ textAlign: "center", padding: "40px 0" }}>
              <h2>Order #{orderNumber} not found</h2>
              <p style={{ color: "var(--color-muted)" }}>Please check the order number.</p>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
                <div>
                  <span style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Live Tracker</span>
                  <h1 style={{ fontSize: "28px", fontWeight: 800, margin: "4px 0" }}>Order {trackedOrder.number}</h1>
                  <p style={{ fontSize: "14px", color: "var(--color-muted)", margin: 0 }}>Placed on {new Date(trackedOrder.createdAt).toLocaleDateString()} at {new Date(trackedOrder.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                </div>
                <span
                  style={{
                    padding: "6px 14px",
                    borderRadius: "9999px",
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    backgroundColor: trackedOrder.status === "cancelled" ? "#FEE2E2" : "#DCFCE7",
                    color: trackedOrder.status === "cancelled" ? "#991B1B" : "#166534"
                  }}
                >
                  {trackedOrder.status.replace(/_/g, " ")}
                </span>
              </div>

              {/* Progress Stepper (if not cancelled) */}
              {trackedOrder.status !== "cancelled" ? (
                <div style={{ margin: "32px 0", display: "flex", justifyContent: "space-between", position: "relative" }}>
                  <div style={{ position: "absolute", top: "14px", left: "20px", right: "20px", height: "3px", backgroundColor: "#E5EADF", zIndex: 0 }} />
                  {["Received", "Confirmed", "Preparing", trackedOrder.fulfilment === "delivery" ? "Out for Delivery" : "Ready", "Completed"].map((label, idx) => {
                    const isDone = idx <= currentStepIdx;
                    return (
                      <div key={idx} style={{ position: "relative", zIndex: 1, textAlign: "center", width: "80px" }}>
                        <div
                          style={{
                            width: "30px",
                            height: "30px",
                            borderRadius: "50%",
                            margin: "0 auto 8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "13px",
                            fontWeight: 700,
                            backgroundColor: isDone ? store.brandColor : "#FFFFFF",
                            color: isDone ? "#FFFFFF" : "var(--color-muted)",
                            border: `2px solid ${isDone ? store.brandColor : "#DCE3D6"}`
                          }}
                        >
                          {isDone ? "✓" : idx + 1}
                        </div>
                        <span style={{ fontSize: "11px", fontWeight: 600, color: isDone ? "var(--color-ink)" : "var(--color-muted)" }}>{label}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "16px", borderRadius: "16px", marginBottom: "24px", fontSize: "14px", fontWeight: 600 }}>
                  This order has been cancelled and inventory was returned to shelf.
                </div>
              )}

              {/* Details */}
              <div style={{ borderTop: "1px solid #E5EADF", paddingTop: "20px", marginTop: "24px" }}>
                <h3 style={{ fontSize: "16px", fontWeight: 700, margin: "0 0 12px" }}>Items Ordered</h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {trackedOrder.items.map((it, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
                      <span>{it.nameSnapshot} <b>× {it.quantity}</b></span>
                      <span style={{ fontWeight: 600 }}>{formatPaise(it.unitPricePaise * it.quantity)}</span>
                    </div>
                  ))}
                  {trackedOrder.deliveryFeePaise > 0 && (
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "14px", color: "var(--color-muted)" }}>
                      <span>Delivery Fee</span>
                      <span>{formatPaise(trackedOrder.deliveryFeePaise)}</span>
                    </div>
                  )}
                  <div style={{ borderTop: "1px dashed #DCE3D6", paddingTop: "10px", marginTop: "6px", display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: 800 }}>
                    <span>Total Amount</span>
                    <span style={{ color: store.brandColor }}>{formatPaise(trackedOrder.totalPaise)}</span>
                  </div>
                </div>
              </div>

              {/* Fulfilment info */}
              <div style={{ background: "#F9FAF6", borderRadius: "16px", padding: "16px", marginTop: "24px", fontSize: "13px" }}>
                <div><b>Customer:</b> {trackedOrder.customerName} ({trackedOrder.customerPhone})</div>
                <div style={{ marginTop: "4px" }}><b>Fulfilment:</b> {trackedOrder.fulfilment.toUpperCase()}</div>
                {trackedOrder.deliveryAddressText && (
                  <div style={{ marginTop: "4px" }}><b>Delivery Address:</b> {trackedOrder.deliveryAddressText}</div>
                )}
                <div style={{ marginTop: "4px" }}><b>Payment:</b> {trackedOrder.paymentMethod.toUpperCase()} ({trackedOrder.paymentStatus})</div>
              </div>

              {canCancel && (
                <div style={{ marginTop: "24px", textAlign: "right" }}>
                  <button
                    onClick={handleCancelOrder}
                    style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 20px", borderRadius: "9999px", fontSize: "13px", fontWeight: 700 }}
                  >
                    Cancel Order
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Cart operations
  const handleAddToCart = (product: Product) => {
    setCart(prev => {
      const idx = prev.findIndex(item => item.product.id === product.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx].quantity += 1;
        return next;
      }
      return [...prev, { product, quantity: 1 }];
    });
    setIsCartOpen(true);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[];
    });
  };

  const totalPaiseSubtotal = cart.reduce((sum, item) => sum + item.product.pricePaise * item.quantity, 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Delivery fee calculation
  let deliveryFeePaise = 0;
  if (store.planSlug === "online" && fulfilment === "delivery") {
    deliveryFeePaise = totalPaiseSubtotal >= store.freeDeliveryAbovePaise ? 0 : store.deliveryFeePaise;
  }
  const grandTotalPaise = totalPaiseSubtotal + deliveryFeePaise;

  // Counter Checkout Submission (Offline / Franchise)
  const handleCounterCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    setPlacingOrder(true);
    setCheckoutError(null);

    try {
      let ord: Order;
      try {
        ord = await apiCreateOrder({
          storeId: store.id,
          source: "qr",
          customerName: counterName,
          customerPhone: counterPhone,
          note: counterNote,
          referralCode: referralCode,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity }))
        });
      } catch {
        ord = await orderService.createQrOrder(store.id, {
          customerName: counterName,
          customerPhone: counterPhone,
          note: counterNote,
          referralCode: referralCode,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity }))
        });
      }

      recordOrderNumber(store.id, ord.number);
      setCompletedOrder(ord);
      setCart([]);
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to place order");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Online Checkout Submission
  const handleOnlineCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!customerSession) return;
    setPlacingOrder(true);
    setCheckoutError(null);

    try {
      let ord: Order;
      try {
        ord = await apiCreateOrder({
          storeId: store.id,
          source: "online",
          customerId: customerSession.customerId,
          fulfilment,
          addressId: fulfilment === "delivery" ? selectedAddressId : undefined,
          paymentMethod,
          paymentReference: paymentRef,
          note: onlineNote,
          referralCode: referralCode,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity }))
        });
      } catch {
        ord = await orderService.createOnlineOrder(store.id, customerSession.customerId, {
          fulfilment,
          addressId: fulfilment === "delivery" ? selectedAddressId : undefined,
          paymentMethod,
          paymentReference: paymentRef,
          note: onlineNote,
          referralCode: referralCode,
          items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity }))
        });
      }

      recordOrderNumber(store.id, ord.number);
      setCart([]);
      setIsCartOpen(false);
      onNavigate(`#/store/${slug}/order/${ord.number}`);
    } catch (err: any) {
      setCheckoutError(err.message || "Failed to place online order");
    } finally {
      setPlacingOrder(false);
    }
  };

  // Re-order past order items into cart
  const handleReorderItems = (items: { productId: string; quantity: number }[]) => {
    setCart(prev => {
      const next = [...prev];
      for (const it of items) {
        const prod = products.find(p => p.id === it.productId);
        if (!prod) continue;
        const existingIdx = next.findIndex(ci => ci.product.id === it.productId);
        if (existingIdx >= 0) {
          next[existingIdx].quantity += it.quantity;
        } else {
          next.push({ product: prod, quantity: it.quantity });
        }
      }
      return next;
    });
    setIsCartOpen(true);
  };

  // Inline customer login / register
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    try {
      if (authTab === "login") {
        try {
          const custSession = await apiCustomerLogin(store.id, authPhone, authPass);
          onCustomerLogin(custSession);
        } catch {
          const cust = await customerService.login(store.id, authPhone, authPass);
          onCustomerLogin({
            customerId: cust.id,
            storeId: store.id,
            name: cust.name,
            phone: cust.phone
          });
        }
      } else {
        try {
          const custSession = await apiCustomerRegister(store.id, authName, authPhone, authPass);
          onCustomerLogin(custSession);
        } catch {
          const cust = await customerService.register(store.id, authName, authPhone, authPass);
          onCustomerLogin({
            customerId: cust.id,
            storeId: store.id,
            name: cust.name,
            phone: cust.phone
          });
        }
      }
    } catch (err: any) {
      setAuthError(err.message || "Authentication failed");
    }
  };

  // Add Address inside checkout
  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerSession) return;
    try {
      const created = await customerService.addAddress(customerSession.customerId, {
        label: newAddrLabel,
        street: newAddrStreet,
        landmark: newAddrLandmark,
        pincode: newAddrPincode,
        isDefault: true
      });
      setAddresses(prev => [created, ...prev]);
      setSelectedAddressId(created.id);
      setIsAddingAddress(false);
      setNewAddrStreet("");
      setNewAddrLandmark("");
      setNewAddrPincode("");
    } catch (err: any) {
      alert("Failed to add address: " + err.message);
    }
  };

  // Render storefront through selected theme
  const theme = resolveTheme(store.themeKey);
  const themeProps = {
    store,
    categories,
    products,
    activeCategoryId: activeCategory,
    onSelectCategory: setActiveCategory,
    cartCount: totalItemCount,
    onOpenCart: () => setIsCartOpen(true),
    onAddToCart: handleAddToCart,
    onOpenOrderHistory: () => setIsOrderHistoryOpen(true),
    orderCount: orderCount
  };

  return (
    <div style={{ position: "relative" }}>
      {/* Referral Banner if active */}
      {referralCode && (
        <div style={{ backgroundColor: store.brandColor, color: "#FFFFFF", padding: "8px 16px", textAlign: "center", fontSize: "13px", fontWeight: 600 }}>
          Assisted by Seller Code: <b>{referralCode}</b>
        </div>
      )}

      {/* Render active Theme */}
      {theme.key === "minimal" ? (
        <MinimalTheme {...themeProps} />
      ) : theme.key === "bold" ? (
        <BoldTheme {...themeProps} />
      ) : (
        <ClassicTheme {...themeProps} />
      )}

      {/* Sticky Bottom Cart Bar for Mobile Viewports */}
      {totalItemCount > 0 && !isCartOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            left: "16px",
            right: "16px",
            zIndex: 800,
            display: "flex",
            justifyContent: "center"
          }}
        >
          <button
            onClick={() => setIsCartOpen(true)}
            style={{
              width: "100%",
              maxWidth: "480px",
              padding: "14px 20px",
              borderRadius: "9999px",
              backgroundColor: store.brandColor || "var(--color-forest)",
              color: "#FFFFFF",
              fontWeight: 700,
              fontSize: "15px",
              boxShadow: "0 8px 24px rgba(0,0,0,0.28)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              border: "none",
              cursor: "pointer"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  background: "rgba(255,255,255,0.22)",
                  padding: "3px 10px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 800
                }}
              >
                {totalItemCount} {totalItemCount === 1 ? "item" : "items"}
              </span>
              <span>View Cart & Checkout</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span>{formatPaise(totalPaiseSubtotal)}</span>
              <span style={{ fontSize: "16px" }}>→</span>
            </div>
          </button>
        </div>
      )}

      {/* Floating Track Orders Pill when cart is empty */}
      {totalItemCount === 0 && orderCount > 0 && !isCartOpen && !isOrderHistoryOpen && (
        <div
          style={{
            position: "fixed",
            bottom: "20px",
            right: "16px",
            zIndex: 800
          }}
        >
          <button
            onClick={() => setIsOrderHistoryOpen(true)}
            style={{
              padding: "12px 20px",
              borderRadius: "9999px",
              backgroundColor: "#FFFFFF",
              color: store.brandColor,
              fontWeight: 700,
              fontSize: "14px",
              boxShadow: "0 6px 20px rgba(0,0,0,0.18)",
              border: `1.5px solid ${store.brandColor}`,
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer"
            }}
          >
            <span>📋 Track Orders</span>
            <span
              style={{
                background: store.brandColor,
                color: "#FFFFFF",
                padding: "2px 8px",
                borderRadius: "9999px",
                fontSize: "11px",
                fontWeight: 800
              }}
            >
              {orderCount}
            </span>
          </button>
        </div>
      )}

      {/* Cart Drawer & Checkout Modal */}
      {isCartOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 900, display: "flex", justifyContent: "flex-end" }}>
          {/* Backdrop */}
          <div
            onClick={() => setIsCartOpen(false)}
            style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(2px)" }}
          />

          {/* Drawer Sheet */}
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: "460px",
              height: "100%",
              backgroundColor: "#FFFFFF",
              display: "flex",
              flexDirection: "column",
              boxShadow: "-8px 0 30px rgba(0,0,0,0.2)",
              zIndex: 10
            }}
          >
            {/* Drawer Header */}
            <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5EADF", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FAFAF7" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <h2 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Your Cart ({totalItemCount})</h2>
                {orderCount > 0 && (
                  <button
                    onClick={() => {
                      setIsCartOpen(false);
                      setIsOrderHistoryOpen(true);
                    }}
                    style={{
                      background: "none",
                      color: store.brandColor,
                      fontSize: "12px",
                      fontWeight: 700,
                      textDecoration: "underline",
                      cursor: "pointer",
                      padding: "2px 4px",
                      border: "none"
                    }}
                  >
                    Past Orders ({orderCount})
                  </button>
                )}
              </div>
              <button onClick={() => setIsCartOpen(false)} style={{ background: "none", fontSize: "20px", color: "var(--color-muted)", padding: "4px", border: "none", cursor: "pointer" }}>
                ✕
              </button>
            </div>

            {/* Cart Items List */}
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 24px" }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)" }}>
                  Your cart is empty.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                  {cart.map(item => (
                    <div key={item.product.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", paddingBottom: "12px", borderBottom: "1px solid #F0F4EC" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "15px" }}>{item.product.name}</div>
                        <div style={{ color: "var(--color-muted)", fontSize: "13px" }}>{formatPaise(item.product.pricePaise)} each</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <button
                          onClick={() => updateCartQty(item.product.id, -1)}
                          style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#F0F4EC", fontWeight: 700, fontSize: "14px" }}
                        >
                          −
                        </button>
                        <span style={{ fontWeight: 600, fontSize: "14px", minWidth: "18px", textAlign: "center" }}>{item.quantity}</span>
                        <button
                          onClick={() => updateCartQty(item.product.id, 1)}
                          style={{ width: "28px", height: "28px", borderRadius: "50%", background: "#F0F4EC", fontWeight: 700, fontSize: "14px" }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Checkout Form Area */}
              {cart.length > 0 && (
                <div style={{ marginTop: "24px", paddingTop: "20px", borderTop: "2px solid #E5EADF" }}>
                  {checkoutError && (
                    <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "12px", fontSize: "13px", marginBottom: "16px", fontWeight: 500 }}>
                      {checkoutError}
                    </div>
                  )}

                  {/* BRANCH A: Counter Mode (Offline / Franchise plans) */}
                  {store.planSlug !== "online" ? (
                    <form onSubmit={handleCounterCheckout} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                      <div style={{ fontSize: "14px", fontWeight: 700, color: store.brandColor }}>Counter Scan-To-Order</div>
                      <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "0 0 4px" }}>
                        Pay directly at counter or via UPI QR.
                      </p>

                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Your Name</label>
                        <input
                          required
                          value={counterName}
                          onChange={e => setCounterName(e.target.value)}
                          placeholder="e.g. Ramesh"
                          style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Phone Number</label>
                        <input
                          required
                          value={counterPhone}
                          onChange={e => setCounterPhone(e.target.value)}
                          placeholder="10-digit mobile"
                          style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                        />
                      </div>
                      <div>
                        <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Special Note (Optional)</label>
                        <input
                          value={counterNote}
                          onChange={e => setCounterNote(e.target.value)}
                          placeholder="Less sugar, packing, etc."
                          style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                        />
                      </div>

                      {/* Store UPI display */}
                      <div style={{ background: "#F5F8EF", padding: "12px", borderRadius: "12px", display: "flex", alignItems: "center", gap: "12px", marginTop: "8px" }}>
                        <div style={{ width: "48px", height: "48px", background: "#FFFFFF", borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <span style={{ fontSize: "24px" }}>📱</span>
                        </div>
                        <div>
                          <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>Pay shop directly via UPI:</div>
                          <div style={{ fontSize: "14px", fontWeight: 700, color: store.brandColor }}>{store.upiId}</div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={placingOrder}
                        style={{ marginTop: "12px", width: "100%", padding: "14px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "15px" }}
                      >
                        {placingOrder ? "Placing Order..." : `Confirm Order · ${formatPaise(grandTotalPaise)}`}
                      </button>
                    </form>
                  ) : (
                    /* BRANCH B: Online Checkout (Online Plan) */
                    <div>
                      {!store.onlineOpen ? (
                        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "14px", borderRadius: "12px", fontSize: "13px", fontWeight: 600 }}>
                          This store is currently closed for online orders.
                        </div>
                      ) : !customerSession ? (
                        /* Customer Auth Prompt */
                        <div>
                          <div style={{ display: "flex", borderBottom: "1px solid #E5EADF", marginBottom: "16px" }}>
                            <button
                              onClick={() => setAuthTab("login")}
                              style={{ flex: 1, padding: "8px", background: "none", borderBottom: authTab === "login" ? `2px solid ${store.brandColor}` : "none", fontWeight: 700, color: authTab === "login" ? store.brandColor : "var(--color-muted)" }}
                            >
                              Log In
                            </button>
                            <button
                              onClick={() => setAuthTab("signup")}
                              style={{ flex: 1, padding: "8px", background: "none", borderBottom: authTab === "signup" ? `2px solid ${store.brandColor}` : "none", fontWeight: 700, color: authTab === "signup" ? store.brandColor : "var(--color-muted)" }}
                            >
                              Create Account
                            </button>
                          </div>

                          {authError && (
                            <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "10px", fontSize: "12px", marginBottom: "12px" }}>
                              {authError}
                            </div>
                          )}

                          <form onSubmit={handleAuthSubmit} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                            {authTab === "signup" && (
                              <div>
                                <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Your Full Name</label>
                                <input
                                  required
                                  value={authName}
                                  onChange={e => setAuthName(e.target.value)}
                                  placeholder="e.g. Kavita"
                                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                />
                              </div>
                            )}
                            <div>
                              <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Mobile Phone</label>
                              <input
                                required
                                value={authPhone}
                                onChange={e => setAuthPhone(e.target.value)}
                                placeholder="10-digit mobile"
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                              />
                            </div>
                            <div>
                              <label style={{ display: "block", fontSize: "12px", fontWeight: 600 }}>Password</label>
                              <input
                                type="password"
                                required
                                value={authPass}
                                onChange={e => setAuthPass(e.target.value)}
                                placeholder="••••••••"
                                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                              />
                            </div>
                            <button
                              type="submit"
                              style={{ marginTop: "6px", width: "100%", padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                            >
                              {authTab === "login" ? "Sign In & Continue" : "Create Account & Continue"}
                            </button>
                          </form>
                        </div>
                      ) : (
                        /* Authenticated Online Checkout */
                        <form onSubmit={handleOnlineCheckout} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <span style={{ fontSize: "13px", fontWeight: 600 }}>Ordering as <b>{customerSession.name}</b></span>
                            <button type="button" onClick={onCustomerLogout} style={{ background: "none", fontSize: "12px", color: "#DC2626", fontWeight: 600 }}>
                              Log out
                            </button>
                          </div>

                          {/* Fulfilment Toggle */}
                          <div style={{ display: "flex", gap: "8px" }}>
                            {store.pickupEnabled && (
                              <button
                                type="button"
                                onClick={() => setFulfilment("pickup")}
                                style={{ flex: 1, padding: "10px", borderRadius: "10px", background: fulfilment === "pickup" ? store.brandColor : "#F0F4EC", color: fulfilment === "pickup" ? "#FFF" : "var(--color-ink)", fontWeight: 700, fontSize: "13px" }}
                              >
                                Store Pickup
                              </button>
                            )}
                            {store.deliveryEnabled && (
                              <button
                                type="button"
                                onClick={() => setFulfilment("delivery")}
                                style={{ flex: 1, padding: "10px", borderRadius: "10px", background: fulfilment === "delivery" ? store.brandColor : "#F0F4EC", color: fulfilment === "delivery" ? "#FFF" : "var(--color-ink)", fontWeight: 700, fontSize: "13px" }}
                              >
                                Home Delivery
                              </button>
                            )}
                          </div>

                          {/* Delivery Address Selection */}
                          {fulfilment === "delivery" && (
                            <div>
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                                <label style={{ fontSize: "12px", fontWeight: 700 }}>Delivery Address</label>
                                <button type="button" onClick={() => setIsAddingAddress(!isAddingAddress)} style={{ background: "none", fontSize: "12px", color: store.brandColor, fontWeight: 700 }}>
                                  {isAddingAddress ? "Cancel" : "+ New"}
                                </button>
                              </div>

                              {isAddingAddress ? (
                                <div style={{ background: "#F5F8EF", padding: "12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                                  <input
                                    placeholder="Label (e.g. Home, Office)"
                                    value={newAddrLabel}
                                    onChange={e => setNewAddrLabel(e.target.value)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                  />
                                  <input
                                    required
                                    placeholder="Street / Flat / House"
                                    value={newAddrStreet}
                                    onChange={e => setNewAddrStreet(e.target.value)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                  />
                                  <input
                                    placeholder="Landmark"
                                    value={newAddrLandmark}
                                    onChange={e => setNewAddrLandmark(e.target.value)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                  />
                                  <input
                                    required
                                    placeholder="PIN Code"
                                    value={newAddrPincode}
                                    onChange={e => setNewAddrPincode(e.target.value)}
                                    style={{ padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleAddAddress}
                                    style={{ padding: "8px", borderRadius: "8px", background: store.brandColor, color: "#fff", fontWeight: 700, fontSize: "12px" }}
                                  >
                                    Save Address
                                  </button>
                                </div>
                              ) : addresses.length === 0 ? (
                                <div style={{ fontSize: "12px", color: "#DC2626", padding: "8px 0" }}>
                                  Please add a delivery address above.
                                </div>
                              ) : (
                                <select
                                  value={selectedAddressId}
                                  onChange={e => setSelectedAddressId(e.target.value)}
                                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                                >
                                  {addresses.map(a => (
                                    <option key={a.id} value={a.id}>
                                      {a.label}: {a.street}, {a.pincode}
                                    </option>
                                  ))}
                                </select>
                              )}

                              {store.deliveryNote && (
                                <p style={{ fontSize: "11px", color: "var(--color-muted)", margin: "4px 0 0" }}>{store.deliveryNote}</p>
                              )}
                            </div>
                          )}

                          {/* Payment Method */}
                          <div>
                            <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px" }}>Payment Method</label>
                            <div style={{ display: "flex", gap: "8px" }}>
                              {store.acceptUpiQr && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("upi")}
                                  style={{ flex: 1, padding: "8px", borderRadius: "8px", background: paymentMethod === "upi" ? store.brandColor : "#F0F4EC", color: paymentMethod === "upi" ? "#FFF" : "var(--color-ink)", fontWeight: 700, fontSize: "12px" }}
                                >
                                  UPI Payment
                                </button>
                              )}
                              {store.acceptCod && (
                                <button
                                  type="button"
                                  onClick={() => setPaymentMethod("cod")}
                                  style={{ flex: 1, padding: "8px", borderRadius: "8px", background: paymentMethod === "cod" ? store.brandColor : "#F0F4EC", color: paymentMethod === "cod" ? "#FFF" : "var(--color-ink)", fontWeight: 700, fontSize: "12px" }}
                                >
                                  Cash on Delivery
                                </button>
                              )}
                            </div>

                            {paymentMethod === "upi" && (
                              <div style={{ marginTop: "8px", background: "#F5F8EF", padding: "10px", borderRadius: "10px" }}>
                                <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>Pay {store.upiId}:</div>
                                <input
                                  placeholder="UPI Transaction ID / Ref #"
                                  value={paymentRef}
                                  onChange={e => setPaymentRef(e.target.value)}
                                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "12px", marginTop: "4px" }}
                                />
                              </div>
                            )}
                          </div>

                          {/* Price summary */}
                          <div style={{ background: "#FAFAF9", padding: "12px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "4px", fontSize: "13px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between" }}>
                              <span>Subtotal</span>
                              <span>{formatPaise(totalPaiseSubtotal)}</span>
                            </div>
                            {fulfilment === "delivery" && (
                              <div style={{ display: "flex", justifyContent: "space-between" }}>
                                <span>Delivery Fee</span>
                                <span>{deliveryFeePaise === 0 ? "FREE" : formatPaise(deliveryFeePaise)}</span>
                              </div>
                            )}
                            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px", borderTop: "1px dashed #DCE3D6", paddingTop: "6px", marginTop: "4px" }}>
                              <span>Total</span>
                              <span style={{ color: store.brandColor }}>{formatPaise(grandTotalPaise)}</span>
                            </div>
                          </div>

                          <button
                            type="submit"
                            disabled={placingOrder}
                            style={{ marginTop: "8px", width: "100%", padding: "14px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "15px" }}
                          >
                            {placingOrder ? "Placing Order..." : `Place Order · ${formatPaise(grandTotalPaise)}`}
                          </button>
                        </form>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Completed Counter Order Receipt Modal */}
      {completedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "440px", width: "100%", padding: "32px", textAlign: "center", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#DCFCE7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", margin: "0 auto 16px" }}>
              ✓
            </div>
            <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "0 0 4px" }}>Order Placed!</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 20px" }}>
              Order Number: <b style={{ color: "var(--color-ink)" }}>{completedOrder.number}</b>
            </p>

            <div style={{ background: "#F5F8EF", padding: "16px", borderRadius: "16px", marginBottom: "20px", textAlign: "left", fontSize: "13px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>Amount to pay:</span>
                <b style={{ color: store.brandColor }}>{formatPaise(completedOrder.totalPaise)}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                <span>UPI ID:</span>
                <b>{store.upiId}</b>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>Items:</span>
                <span>{completedOrder.items.length} items</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button
                onClick={() => {
                  const num = completedOrder.number;
                  setCompletedOrder(null);
                  setIsCartOpen(false);
                  onNavigate(`#/store/${slug}/order/${num}`);
                }}
                style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#fff", fontWeight: 700, fontSize: "13px" }}
              >
                Track Order
              </button>
              <button
                onClick={() => {
                  setCompletedOrder(null);
                  setIsCartOpen(false);
                }}
                style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 700, fontSize: "13px" }}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order History Component */}
      <OrderHistory
        store={store}
        customerSession={customerSession}
        isOpen={isOrderHistoryOpen}
        onClose={() => setIsOrderHistoryOpen(false)}
        onSelectOrderToTrack={(orderNum) => {
          setIsOrderHistoryOpen(false);
          onNavigate(`#/store/${slug}/order/${orderNum}`);
        }}
        onReorderItems={handleReorderItems}
        onCustomerLoginRequest={() => {
          setIsOrderHistoryOpen(false);
          setIsCartOpen(true);
        }}
      />
    </div>
  );
};
