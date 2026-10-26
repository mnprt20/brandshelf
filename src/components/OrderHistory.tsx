import React, { useState, useEffect, useCallback } from "react";
import { Store, Order, StatusEvent, CustomerSessionContext, Product } from "../types";
import { OrderService } from "../services/orderService";
import { defaultRepository } from "../repository/storage";
import { formatPaise } from "../utils/money";

interface Props {
  store: Store;
  customerSession: CustomerSessionContext | null;
  isOpen: boolean;
  onClose: () => void;
  onSelectOrderToTrack?: (orderNumber: string) => void;
  onReorderItems?: (items: { productId: string; quantity: number }[]) => void;
  onCustomerLoginRequest?: () => void;
}

export const OrderHistory: React.FC<Props> = ({
  store,
  customerSession,
  isOpen,
  onClose,
  onSelectOrderToTrack,
  onReorderItems,
  onCustomerLoginRequest
}) => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [lookupPhone, setLookupPhone] = useState("");
  const [phoneFilter, setPhoneFilter] = useState<string | null>(null);
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [orderEventsMap, setOrderEventsMap] = useState<Record<string, StatusEvent[]>>({});
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelMessage, setCancelMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const orderService = new OrderService(defaultRepository);

  // Load recent order numbers from localStorage
  const getRecentOrderNumbers = (): string[] => {
    try {
      const key = `mintshelf_recent_orders_${store.id}`;
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  };

  const fetchOrders = useCallback(async (isManualRefresh = false) => {
    if (isManualRefresh) setIsRefreshing(true);
    else setLoading(true);

    try {
      const recentNumbers = getRecentOrderNumbers();
      const currentPhone = phoneFilter || customerSession?.phone;

      const results = await orderService.getCustomerOrders(store.id, {
        customerId: customerSession?.customerId,
        phone: currentPhone,
        orderNumbers: recentNumbers
      });

      setOrders(results);

      // If an order is currently expanded, refresh its status events too
      if (expandedOrderId) {
        const events = await orderService.getOrderStatusEvents(expandedOrderId);
        setOrderEventsMap(prev => ({ ...prev, [expandedOrderId]: events }));
      }
    } catch (err) {
      console.error("Failed to load customer orders:", err);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [store.id, customerSession, phoneFilter, expandedOrderId]);

  // Initial load when opened
  useEffect(() => {
    if (isOpen) {
      fetchOrders();
    }
  }, [isOpen, fetchOrders]);

  // Periodic polling for live status updates while the panel is open
  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      fetchOrders(true);
    }, 6000);
    return () => clearInterval(interval);
  }, [isOpen, fetchOrders]);

  // Load status events for expanded order
  const handleToggleExpand = async (orderId: string) => {
    if (expandedOrderId === orderId) {
      setExpandedOrderId(null);
      return;
    }

    setExpandedOrderId(orderId);
    try {
      const events = await orderService.getOrderStatusEvents(orderId);
      setOrderEventsMap(prev => ({ ...prev, [orderId]: events }));
    } catch (err) {
      console.warn("Failed to fetch order status events:", err);
    }
  };

  // Handle order cancellation
  const handleCancelOrder = async (order: Order) => {
    if (!confirm(`Cancel order ${order.number}? Inventory will be restocked.`)) return;
    setCancellingId(order.id);
    setCancelMessage(null);

    try {
      if (customerSession && order.customerId === customerSession.customerId) {
        await orderService.customerCancelOrder(customerSession.customerId, store.id, order.id);
      } else {
        // Fallback cancellation for counter/guest orders if in 'new' state
        await defaultRepository.saveOrder({
          ...order,
          status: "cancelled"
        });
        await defaultRepository.addStatusEvent({
          id: "evt_" + Math.random().toString(36).substring(2, 9),
          orderId: order.id,
          storeId: store.id,
          fromStatus: order.status,
          toStatus: "cancelled",
          timestamp: Date.now()
        });
      }

      setCancelMessage({ type: "success", text: `Order ${order.number} was cancelled successfully.` });
      await fetchOrders(true);
    } catch (err: any) {
      setCancelMessage({ type: "error", text: err.message || "Failed to cancel order" });
    } finally {
      setCancellingId(null);
    }
  };

  // Re-order items
  const handleReorder = (order: Order) => {
    if (onReorderItems && order.items && order.items.length > 0) {
      const itemsToAdd = order.items.map(it => ({
        productId: it.productId,
        quantity: it.quantity
      }));
      onReorderItems(itemsToAdd);
      onClose();
    }
  };

  // Phone lookup submit
  const handlePhoneLookup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lookupPhone.trim()) return;
    setPhoneFilter(lookupPhone.trim());
  };

  if (!isOpen) return null;

  // Filtered orders
  const filteredOrders = orders.filter(o => {
    // Tab filter
    const isActive = ["new", "confirmed", "preparing", "ready", "out_for_delivery"].includes(o.status);
    if (activeTab === "active" && !isActive) return false;
    if (activeTab === "completed" && (isActive || o.status === "cancelled")) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchNum = o.number.toLowerCase().includes(q);
      const matchItems = o.items.some(it => it.nameSnapshot.toLowerCase().includes(q));
      const matchPhone = o.customerPhone.includes(q);
      if (!matchNum && !matchItems && !matchPhone) return false;
    }

    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "new":
        return { label: "Order Placed", bg: "#EFF6FF", color: "#1D4ED8", border: "#BFDBFE" };
      case "confirmed":
        return { label: "Confirmed", bg: "#EEF2FF", color: "#4338CA", border: "#C7D2FE" };
      case "preparing":
        return { label: "Preparing", bg: "#FAF5FF", color: "#7E22CE", border: "#E9D5FF" };
      case "ready":
        return { label: "Ready for Pickup", bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" };
      case "out_for_delivery":
        return { label: "Out for Delivery", bg: "#ECFDF5", color: "#047857", border: "#A7F3D0" };
      case "completed":
        return { label: "Completed", bg: "#F0FDF4", color: "#15803D", border: "#BBF7D0" };
      case "cancelled":
        return { label: "Cancelled", bg: "#FEF2F2", color: "#B91C1C", border: "#FECACA" };
      default:
        return { label: status, bg: "#F3F4F6", color: "#374151", border: "#E5E7EB" };
    }
  };

  const statusStepList = ["new", "confirmed", "preparing", "ready", "completed"];

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 950, display: "flex", justifyContent: "flex-end" }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(3px)",
          transition: "opacity 0.2s ease"
        }}
      />

      {/* Slide-out Drawer */}
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: "520px",
          height: "100%",
          backgroundColor: "#FFFFFF",
          display: "flex",
          flexDirection: "column",
          boxShadow: "-10px 0 35px rgba(0,0,0,0.2)",
          zIndex: 10,
          overflow: "hidden"
        }}
      >
        {/* Drawer Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid #E5EADF",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            background: "#FAFAF7"
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "20px" }}>📋</span>
              <h2 style={{ fontSize: "18px", fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                Order History & Live Tracker
              </h2>
            </div>
            <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "3px" }}>
              {store.name} • {orders.length} {orders.length === 1 ? "order" : "orders"} found
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <button
              onClick={() => fetchOrders(true)}
              disabled={isRefreshing}
              title="Refresh live order status"
              style={{
                background: "#FFFFFF",
                border: "1px solid #DCE3D6",
                borderRadius: "9999px",
                padding: "6px 12px",
                fontSize: "12px",
                fontWeight: 600,
                color: store.brandColor,
                display: "flex",
                alignItems: "center",
                gap: "4px",
                cursor: "pointer"
              }}
            >
              <span style={{ display: "inline-block", transform: isRefreshing ? "rotate(360deg)" : "none", transition: "transform 0.6s ease" }}>
                ↻
              </span>
              <span>{isRefreshing ? "Updating..." : "Live Sync"}</span>
            </button>
            <button
              onClick={onClose}
              style={{
                background: "none",
                fontSize: "20px",
                color: "var(--color-muted)",
                padding: "4px 8px",
                cursor: "pointer",
                borderRadius: "8px"
              }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Customer Account / Lookup Bar */}
        <div style={{ padding: "12px 24px", background: "#F5F8EF", borderBottom: "1px solid #E5EADF", fontSize: "13px" }}>
          {customerSession ? (
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <span style={{ color: "var(--color-forest)", fontWeight: 700 }}>Signed In:</span>{" "}
                <b>{customerSession.name}</b> ({customerSession.phone})
              </div>
              <span style={{ fontSize: "11px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
                Verified Account
              </span>
            </div>
          ) : (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>
                  Tracking by phone or recent device orders:
                </span>
                {onCustomerLoginRequest && (
                  <button
                    onClick={onCustomerLoginRequest}
                    style={{ background: "none", color: store.brandColor, fontWeight: 700, fontSize: "12px", cursor: "pointer", padding: 0 }}
                  >
                    Log In / Sign Up →
                  </button>
                )}
              </div>
              <form onSubmit={handlePhoneLookup} style={{ display: "flex", gap: "8px" }}>
                <input
                  type="tel"
                  placeholder="Enter phone number (e.g. 9876543210)"
                  value={lookupPhone}
                  onChange={e => setLookupPhone(e.target.value)}
                  style={{
                    flex: 1,
                    padding: "7px 12px",
                    borderRadius: "8px",
                    border: "1px solid #DCE3D6",
                    fontSize: "13px",
                    background: "#FFFFFF"
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: "7px 14px",
                    borderRadius: "8px",
                    background: store.brandColor,
                    color: "#FFFFFF",
                    fontWeight: 700,
                    fontSize: "12px",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  Track Phone
                </button>
                {phoneFilter && (
                  <button
                    type="button"
                    onClick={() => {
                      setPhoneFilter(null);
                      setLookupPhone("");
                    }}
                    style={{
                      padding: "7px 10px",
                      borderRadius: "8px",
                      background: "#FFFFFF",
                      border: "1px solid #DCE3D6",
                      color: "var(--color-muted)",
                      fontSize: "12px"
                    }}
                  >
                    Clear
                  </button>
                )}
              </form>
            </div>
          )}
        </div>

        {/* Cancellation feedback message */}
        {cancelMessage && (
          <div
            style={{
              padding: "10px 24px",
              background: cancelMessage.type === "success" ? "#DCFCE7" : "#FEE2E2",
              color: cancelMessage.type === "success" ? "#166534" : "#991B1B",
              fontSize: "13px",
              fontWeight: 600,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <span>{cancelMessage.text}</span>
            <button onClick={() => setCancelMessage(null)} style={{ background: "none", fontSize: "14px", cursor: "pointer" }}>
              ✕
            </button>
          </div>
        )}

        {/* Search & Tabs */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #F0F4EC", display: "flex", flexDirection: "column", gap: "10px" }}>
          {/* Tabs */}
          <div style={{ display: "flex", gap: "6px" }}>
            {[
              { id: "all", label: "All Orders" },
              { id: "active", label: "Active Tracking" },
              { id: "completed", label: "Past / Completed" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  background: activeTab === tab.id ? store.brandColor : "#F5F8EF",
                  color: activeTab === tab.id ? "#FFFFFF" : "var(--color-ink)",
                  border: "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease"
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <input
            type="text"
            placeholder="Search by order number or item name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 14px",
              borderRadius: "10px",
              border: "1px solid #DCE3D6",
              fontSize: "13px"
            }}
          />
        </div>

        {/* Orders List Container */}
        <div style={{ flex: 1, overflowY: "auto", padding: "16px 24px" }}>
          {loading && orders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 0", color: "var(--color-muted)", fontSize: "14px" }}>
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div style={{ textAlign: "center", padding: "48px 16px", color: "var(--color-muted)" }}>
              <div style={{ fontSize: "36px", marginBottom: "8px" }}>📦</div>
              <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-ink)", marginBottom: "4px" }}>
                No orders found
              </div>
              <p style={{ fontSize: "13px", lineHeight: "20px", margin: "0 0 16px" }}>
                {customerSession
                  ? "You haven't placed any orders with this store account yet."
                  : "No recent orders found on this device. Enter your phone number above to track your order."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {filteredOrders.map(order => {
                const badge = getStatusBadge(order.status);
                const isExpanded = expandedOrderId === order.id;
                const canCancel = order.status === "new";
                const events = orderEventsMap[order.id] || [];
                const currentStepIdx = statusStepList.indexOf(order.status === "out_for_delivery" ? "ready" : order.status);

                return (
                  <div
                    key={order.id}
                    style={{
                      background: "#FFFFFF",
                      borderRadius: "18px",
                      border: isExpanded ? `2px solid ${store.brandColor}` : "1px solid #E5EADF",
                      boxShadow: isExpanded ? "0 4px 16px rgba(0,0,0,0.06)" : "0 2px 6px rgba(0,0,0,0.02)",
                      padding: "18px",
                      transition: "all 0.15s ease"
                    }}
                  >
                    {/* Order Card Top Line */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <span style={{ fontSize: "15px", fontWeight: 800, color: "var(--color-ink)" }}>
                            {order.number}
                          </span>
                          <span
                            style={{
                              fontSize: "11px",
                              padding: "2px 8px",
                              borderRadius: "9999px",
                              backgroundColor: badge.bg,
                              color: badge.color,
                              border: `1px solid ${badge.border}`,
                              fontWeight: 700,
                              textTransform: "uppercase"
                            }}
                          >
                            {badge.label}
                          </span>
                        </div>
                        <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                          {new Date(order.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })} at{" "}
                          {new Date(order.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </div>

                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: "16px", fontWeight: 800, color: store.brandColor }}>
                          {formatPaise(order.totalPaise)}
                        </div>
                        <span style={{ fontSize: "11px", color: "var(--color-muted)", textTransform: "uppercase", fontWeight: 600 }}>
                          {order.fulfilment} • {order.paymentMethod.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    {/* Order Items Preview */}
                    <div style={{ margin: "10px 0", background: "#F9FAF6", borderRadius: "12px", padding: "10px 12px" }}>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {order.items.map((item, idx) => (
                          <div key={idx} style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                            <span style={{ color: "var(--color-ink)", fontWeight: 500 }}>
                              {item.nameSnapshot} <span style={{ color: "var(--color-muted)" }}>× {item.quantity}</span>
                            </span>
                            <span style={{ fontWeight: 600, color: "var(--color-ink)" }}>
                              {formatPaise(item.unitPricePaise * item.quantity)}
                            </span>
                          </div>
                        ))}
                        {order.deliveryFeePaise > 0 && (
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px", color: "var(--color-muted)", borderTop: "1px dashed #DCE3D6", paddingTop: "4px" }}>
                            <span>Delivery Fee</span>
                            <span>{formatPaise(order.deliveryFeePaise)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Live Tracking Expansion Section */}
                    {isExpanded && (
                      <div style={{ borderTop: "1px solid #F0F4EC", paddingTop: "14px", marginTop: "12px" }}>
                        {/* Stepper (if not cancelled) */}
                        {order.status !== "cancelled" ? (
                          <div style={{ margin: "16px 0 20px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-forest)", textTransform: "uppercase", marginBottom: "12px" }}>
                              Live Order Progress
                            </div>
                            <div style={{ display: "flex", justifyContent: "space-between", position: "relative" }}>
                              <div style={{ position: "absolute", top: "12px", left: "12px", right: "12px", height: "3px", backgroundColor: "#E5EADF", zIndex: 0 }} />
                              {["Placed", "Confirmed", "Preparing", order.fulfilment === "delivery" ? "Delivery" : "Ready", "Done"].map((label, idx) => {
                                const isDone = idx <= currentStepIdx;
                                return (
                                  <div key={idx} style={{ position: "relative", zIndex: 1, textAlign: "center", width: "56px" }}>
                                    <div
                                      style={{
                                        width: "26px",
                                        height: "26px",
                                        borderRadius: "50%",
                                        margin: "0 auto 6px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        fontSize: "12px",
                                        fontWeight: 700,
                                        backgroundColor: isDone ? store.brandColor : "#FFFFFF",
                                        color: isDone ? "#FFFFFF" : "var(--color-muted)",
                                        border: `2px solid ${isDone ? store.brandColor : "#DCE3D6"}`
                                      }}
                                    >
                                      {isDone ? "✓" : idx + 1}
                                    </div>
                                    <span style={{ fontSize: "10px", fontWeight: 600, color: isDone ? "var(--color-ink)" : "var(--color-muted)" }}>
                                      {label}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", fontWeight: 600, marginBottom: "14px" }}>
                            This order was cancelled.
                          </div>
                        )}

                        {/* Status Transition Events Timeline */}
                        {events.length > 0 && (
                          <div style={{ margin: "14px 0", background: "#FAFAF7", borderRadius: "12px", padding: "12px" }}>
                            <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                              Status Update Timeline
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                              {events.map((evt, eIdx) => (
                                <div key={evt.id || eIdx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px" }}>
                                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                    <span style={{ color: store.brandColor }}>•</span>
                                    <span style={{ fontWeight: 600 }}>Status updated to: <b>{evt.toStatus.replace(/_/g, " ")}</b></span>
                                  </div>
                                  <span style={{ color: "var(--color-muted)", fontSize: "11px" }}>
                                    {new Date(evt.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Customer & Address details */}
                        <div style={{ fontSize: "12px", color: "var(--color-muted)", lineHeight: "18px", margin: "10px 0" }}>
                          <div><b>Recipient:</b> {order.customerName} ({order.customerPhone})</div>
                          {order.deliveryAddressText && (
                            <div style={{ marginTop: "3px" }}><b>Delivery Address:</b> {order.deliveryAddressText}</div>
                          )}
                          {order.note && (
                            <div style={{ marginTop: "3px" }}><b>Order Note:</b> {order.note}</div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Card Actions Bottom Bar */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px", paddingTop: "8px", flexWrap: "wrap", gap: "8px" }}>
                      <button
                        onClick={() => handleToggleExpand(order.id)}
                        style={{
                          background: "none",
                          color: store.brandColor,
                          fontSize: "13px",
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "flex",
                          alignItems: "center",
                          gap: "4px",
                          padding: 0
                        }}
                      >
                        <span>{isExpanded ? "Hide Details ▲" : "View Live Status ▼"}</span>
                      </button>

                      <div style={{ display: "flex", gap: "8px" }}>
                        {onSelectOrderToTrack && (
                          <button
                            onClick={() => {
                              onSelectOrderToTrack(order.number);
                              onClose();
                            }}
                            style={{
                              background: "#F0F4EC",
                              color: "var(--color-forest)",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 600,
                              cursor: "pointer",
                              border: "none"
                            }}
                          >
                            Full Tracker ↗
                          </button>
                        )}

                        {canCancel && (
                          <button
                            onClick={() => handleCancelOrder(order)}
                            disabled={cancellingId === order.id}
                            style={{
                              background: "#FEE2E2",
                              color: "#991B1B",
                              padding: "6px 12px",
                              borderRadius: "8px",
                              fontSize: "12px",
                              fontWeight: 700,
                              border: "none",
                              cursor: "pointer"
                            }}
                          >
                            {cancellingId === order.id ? "Cancelling..." : "Cancel"}
                          </button>
                        )}

                        <button
                          onClick={() => handleReorder(order)}
                          style={{
                            background: store.brandColor,
                            color: "#FFFFFF",
                            padding: "6px 12px",
                            borderRadius: "8px",
                            fontSize: "12px",
                            fontWeight: 700,
                            border: "none",
                            cursor: "pointer"
                          }}
                        >
                          Reorder ↻
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        <div style={{ padding: "16px 24px", borderTop: "1px solid #E5EADF", background: "#FAFAF7", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>
            Updates in real-time as shop staff prepares your order.
          </div>
          <button
            onClick={onClose}
            style={{
              padding: "10px 20px",
              borderRadius: "9999px",
              background: "#FFFFFF",
              border: "1px solid #DCE3D6",
              color: "var(--color-ink)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer"
            }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
