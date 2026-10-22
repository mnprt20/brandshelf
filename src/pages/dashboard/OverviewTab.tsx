import React, { useState, useEffect } from "react";
import { SessionContext, Store, Order, Product } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { formatPaise } from "../../utils/money";
import { generateQrSvg, downloadQrPng } from "../../utils/qr";

interface Props {
  session: SessionContext;
  onNavigate: (route: string) => void;
}

export const OverviewTab: React.FC<Props> = ({ session, onNavigate }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    const load = async () => {
      const s = await defaultRepository.getStoreById(session.storeId);
      const o = await defaultRepository.getOrders(session.storeId);
      const p = await defaultRepository.getProducts(session.storeId);
      setStore(s);
      setOrders(session.role === "staff" ? o.filter(it => it.placedByUserId === session.userId) : o);
      setProducts(p);
    };
    load();
  }, [session]);

  if (!store) return <div>Loading overview...</div>;

  const publicStoreUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;
  const totalRevenuePaise = orders
    .filter(o => o.status !== "cancelled" && (o.paymentStatus === "received" || o.status === "completed"))
    .reduce((sum, o) => sum + o.totalPaise, 0);

  const pendingOrdersCount = orders.filter(o => o.status === "new" || o.status === "confirmed" || o.status === "preparing").length;
  const lowStockProducts = products.filter(p => p.stock !== null && p.stock <= 5);

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Dashboard Overview</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Welcome back to {store.name}. Here is what's happening today.
          </p>
        </div>
        <button
          onClick={() => onNavigate(`#/store/${store.slug}`)}
          style={{ padding: "10px 20px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "13px" }}
        >
          Open Live Store ↗
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "20px", marginBottom: "32px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Total Orders</div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>{orders.length}</div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>{pendingOrdersCount} pending fulfilment</div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Collected Revenue</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: store.brandColor, marginTop: "6px" }}>{formatPaise(totalRevenuePaise)}</div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>Across completed payments</div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Active Catalogue</div>
          <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "6px" }}>{products.filter(p => p.isAvailable).length}</div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>{products.length} total items</div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Low Stock Alert</div>
          <div style={{ fontSize: "28px", fontWeight: 800, color: lowStockProducts.length > 0 ? "#DC2626" : "var(--color-forest)", marginTop: "6px" }}>
            {lowStockProducts.length}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>≤ 5 units remaining</div>
        </div>
      </div>

      {/* Counter Stand Quick Share Card */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: "28px", display: "flex", gap: "28px", alignItems: "center", marginBottom: "32px" }}>
        <div
          dangerouslySetInnerHTML={{ __html: generateQrSvg(publicStoreUrl, 140, store.brandColor) }}
          style={{ width: "140px", height: "140px", flexShrink: 0 }}
        />
        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
            Counter Display QR
          </span>
          <h3 style={{ fontSize: "20px", fontWeight: 700, margin: "6px 0 4px" }}>Share Your Store QR Code</h3>
          <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 16px" }}>
            Place this QR at your counter, billing table, or send the direct link to customers.
          </p>
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => downloadQrPng(publicStoreUrl, `${store.slug}-counter-qr.png`, store.brandColor)}
              style={{ padding: "8px 16px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontSize: "13px", fontWeight: 600 }}
            >
              Download Stand PNG
            </button>
            <button
              onClick={() => {
                navigator.clipboard.writeText(publicStoreUrl);
                alert("Copied store link to clipboard!");
              }}
              style={{ padding: "8px 16px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontSize: "13px", fontWeight: 600 }}
            >
              Copy Link
            </button>
          </div>
        </div>
      </div>

      {/* Recent Orders List */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5EADF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>Recent Orders</h3>
          <button onClick={() => onNavigate("#/dashboard/orders")} style={{ background: "none", color: store.brandColor, fontWeight: 700, fontSize: "13px" }}>
            View all ({orders.length}) →
          </button>
        </div>
        {orders.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--color-muted)", fontSize: "14px" }}>
            No orders placed yet. Share your QR stand to start taking orders!
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #F0F4EC", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "12px 20px" }}>Order</th>
                <th style={{ padding: "12px 20px" }}>Customer</th>
                <th style={{ padding: "12px 20px" }}>Items</th>
                <th style={{ padding: "12px 20px" }}>Total</th>
                <th style={{ padding: "12px 20px" }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 5).map(ord => (
                <tr key={ord.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>{ord.number}</td>
                  <td style={{ padding: "14px 20px" }}>{ord.customerName}</td>
                  <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>{ord.items.length} items</td>
                  <td style={{ padding: "14px 20px", fontWeight: 700 }}>{formatPaise(ord.totalPaise)}</td>
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
                      {ord.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
