import React, { useState, useEffect } from "react";
import { SessionContext, Order, OrderStatus, Store, Membership, User } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { OrderService } from "../../services/orderService";
import { formatPaise } from "../../utils/money";
import { apiUpdateOrderStatus, apiUpdatePaymentStatus } from "../../services/apiClient";

interface Props {
  session: SessionContext;
}

export const OrdersTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("");
  const [members, setMembers] = useState<Membership[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const orderService = new OrderService(defaultRepository);

  const loadData = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    setStore(s);
    const ords = await orderService.listOrders(session, staffFilter || undefined);
    setOrders(ords);

    if (session.role === "owner") {
      const mems = await defaultRepository.getMembershipsByStore(session.storeId);
      setMembers(mems);
      const uMap = new Map<string, User>();
      for (const m of mems) {
        const u = await defaultRepository.getUserById(m.userId);
        if (u) uMap.set(u.id, u);
      }
      setUsersMap(uMap);
    }
  };

  useEffect(() => {
    loadData();
  }, [session, staffFilter]);

  const handleStatusChange = async (orderId: string, nextStatus: OrderStatus) => {
    try {
      try {
        await apiUpdateOrderStatus(session.storeId, orderId, nextStatus);
      } catch {
        await orderService.updateOrderStatus(session, orderId, nextStatus);
      }
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await defaultRepository.getOrderById(session.storeId, orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert("Status change failed: " + err.message);
    }
  };

  const handlePaymentStatusChange = async (orderId: string, status: "received" | "failed") => {
    try {
      try {
        await apiUpdatePaymentStatus(session.storeId, orderId, status);
      } catch {
        await orderService.updatePaymentStatus(session, orderId, status);
      }
      loadData();
      if (selectedOrder && selectedOrder.id === orderId) {
        const updated = await defaultRepository.getOrderById(session.storeId, orderId);
        setSelectedOrder(updated);
      }
    } catch (err: any) {
      alert("Payment status change failed: " + err.message);
    }
  };

  const filteredOrders = statusFilter === "all"
    ? orders
    : orders.filter(o => o.status === statusFilter);

  // Allowed transitions
  const getNextTransitions = (status: OrderStatus): OrderStatus[] => {
    const validTransitions: Record<OrderStatus, OrderStatus[]> = {
      new: ["confirmed", "cancelled"],
      confirmed: ["preparing", "cancelled"],
      preparing: ["ready", "out_for_delivery", "cancelled"],
      ready: ["completed", "cancelled"],
      out_for_delivery: ["completed", "cancelled"],
      completed: [],
      cancelled: []
    };
    return validTransitions[status] || [];
  };

  return (
    <div style={{ maxWidth: "1050px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Orders Management</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            {session.role === "staff" ? "Orders attributed to your seller account." : "Track incoming orders, status transitions, and payments."}
          </p>
        </div>

        {session.role === "owner" && (
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "12px", color: "var(--color-muted)", fontWeight: 600 }}>Filter Seller:</span>
            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              style={{ padding: "8px 12px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
            >
              <option value="">All Sellers & Direct</option>
              {members.map(m => (
                <option key={m.userId} value={m.userId}>
                  {usersMap.get(m.userId)?.displayName || m.userId} ({m.role})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Status Filter Pills */}
      <div style={{ display: "flex", gap: "8px", overflowX: "auto", marginBottom: "20px", paddingBottom: "4px" }}>
        {["all", "new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"].map(st => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              background: statusFilter === st ? (store?.brandColor || "var(--color-forest)") : "#FFFFFF",
              color: statusFilter === st ? "#FFFFFF" : "var(--color-ink)",
              border: "1px solid #DCE3D6",
              fontSize: "12px",
              fontWeight: 600,
              textTransform: "capitalize",
              whiteSpace: "nowrap"
            }}
          >
            {st.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {/* Orders List */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--color-muted)" }}>
            No orders found in this status.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 20px" }}>Order #</th>
                <th style={{ padding: "14px 20px" }}>Customer</th>
                <th style={{ padding: "14px 20px" }}>Type</th>
                <th style={{ padding: "14px 20px" }}>Total</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
                <th style={{ padding: "14px 20px" }}>Payment</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map(ord => {
                const nextTransitions = getNextTransitions(ord.status);
                return (
                  <tr key={ord.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                      <button
                        onClick={() => setSelectedOrder(ord)}
                        style={{ background: "none", color: store?.brandColor, fontWeight: 700, textDecoration: "underline" }}
                      >
                        {ord.number}
                      </button>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div>{ord.customerName}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>{ord.customerPhone}</div>
                    </td>
                    <td style={{ padding: "14px 20px", textTransform: "capitalize", color: "var(--color-muted)" }}>
                      {ord.source} · {ord.fulfilment}
                    </td>
                    <td style={{ padding: "14px 20px", fontWeight: 700 }}>
                      {formatPaise(ord.totalPaise)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          padding: "3px 8px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          backgroundColor: ord.status === "completed" ? "#DCFCE7" : ord.status === "cancelled" ? "#FEE2E2" : "#FEF3C7",
                          color: ord.status === "completed" ? "#166534" : ord.status === "cancelled" ? "#991B1B" : "#92400E"
                        }}
                      >
                        {ord.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span
                          style={{
                            padding: "3px 8px",
                            borderRadius: "9999px",
                            fontSize: "11px",
                            fontWeight: 700,
                            textTransform: "uppercase",
                            backgroundColor: ord.paymentStatus === "received" ? "#DCFCE7" : "#FEE2E2",
                            color: ord.paymentStatus === "received" ? "#166534" : "#991B1B"
                          }}
                        >
                          {ord.paymentStatus}
                        </span>
                        {ord.paymentStatus !== "received" && (
                          <button
                            onClick={() => handlePaymentStatusChange(ord.id, "received")}
                            title="Mark payment as received"
                            style={{ background: "#F0F4EC", borderRadius: "4px", padding: "2px 6px", fontSize: "11px", fontWeight: 700 }}
                          >
                            Mark Paid
                          </button>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                        {nextTransitions.map(nt => (
                          <button
                            key={nt}
                            onClick={() => handleStatusChange(ord.id, nt)}
                            style={{
                              padding: "4px 8px",
                              borderRadius: "6px",
                              fontSize: "11px",
                              fontWeight: 700,
                              textTransform: "capitalize",
                              backgroundColor: nt === "cancelled" ? "#FEE2E2" : (store?.brandColor || "var(--color-forest)"),
                              color: nt === "cancelled" ? "#991B1B" : "#FFFFFF"
                            }}
                          >
                            → {nt.replace(/_/g, " ")}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "520px", width: "100%", padding: "32px", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "16px" }}>
              <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>Order {selectedOrder.number}</h2>
              <button onClick={() => setSelectedOrder(null)} style={{ background: "none", fontSize: "20px", color: "var(--color-muted)" }}>✕</button>
            </div>

            <div style={{ background: "#F5F8EF", padding: "14px", borderRadius: "14px", marginBottom: "20px", fontSize: "13px" }}>
              <div><b>Customer:</b> {selectedOrder.customerName} ({selectedOrder.customerPhone})</div>
              {selectedOrder.note && <div style={{ marginTop: "4px" }}><b>Note:</b> {selectedOrder.note}</div>}
              <div style={{ marginTop: "4px" }}><b>Fulfilment:</b> {selectedOrder.source.toUpperCase()} / {selectedOrder.fulfilment.toUpperCase()}</div>
              {selectedOrder.deliveryAddressText && (
                <div style={{ marginTop: "4px" }}><b>Address:</b> {selectedOrder.deliveryAddressText}</div>
              )}
              {selectedOrder.paymentReference && (
                <div style={{ marginTop: "4px" }}><b>UPI Ref:</b> {selectedOrder.paymentReference}</div>
              )}
              <div style={{ marginTop: "4px" }}><b>Date:</b> {new Date(selectedOrder.createdAt).toLocaleString()}</div>
            </div>

            <h4 style={{ fontSize: "14px", fontWeight: 700, margin: "0 0 8px" }}>Ordered Items</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "20px" }}>
              {selectedOrder.items.map((it, i) => (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: "2px", fontSize: "13px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      {it.nameSnapshot}
                      {it.variantLabel && (
                        <span style={{ color: "var(--color-muted)", fontWeight: 500, marginLeft: "4px" }}>
                          ({it.variantLabel})
                        </span>
                      )}{" "}
                      <b>× {it.quantity}</b>
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatPaise(it.unitPricePaise * it.quantity)}</span>
                  </div>
                  {it.note && (
                    <div style={{ fontSize: "11px", color: "var(--color-muted)", fontStyle: "italic", paddingLeft: "4px" }}>
                      Note: {it.note}
                    </div>
                  )}
                </div>
              ))}
              {selectedOrder.deliveryFeePaise > 0 && (
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px", color: "var(--color-muted)" }}>
                  <span>Delivery Fee</span>
                  <span>{formatPaise(selectedOrder.deliveryFeePaise)}</span>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800, fontSize: "15px", borderTop: "1px dashed #DCE3D6", paddingTop: "8px" }}>
                <span>Total Amount</span>
                <span style={{ color: store?.brandColor }}>{formatPaise(selectedOrder.totalPaise)}</span>
              </div>
            </div>

            <button
              onClick={() => setSelectedOrder(null)}
              style={{ width: "100%", padding: "12px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 700, fontSize: "14px" }}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
