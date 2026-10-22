import React, { useState, useEffect } from "react";
import { SessionContext, Store, User } from "../../types";
import { defaultRepository } from "../../repository/storage";

interface Props {
  session: SessionContext;
  currentSubroute: string;
  onNavigate: (route: string) => void;
  onLogout: () => void;
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<Props> = ({ session, currentSubroute, onNavigate, onLogout, children }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const load = async () => {
      const s = await defaultRepository.getStoreById(session.storeId);
      const u = await defaultRepository.getUserById(session.userId);
      setStore(s);
      setUser(u);
    };
    load();
  }, [session]);

  const isOwner = session.role === "owner";
  const planSlug = store?.planSlug || "offline";

  return (
    <div style={{ display: "flex", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      {/* Sidebar */}
      <aside style={{ width: "260px", backgroundColor: "#FFFFFF", borderRight: "1px solid #E5EADF", display: "flex", flexDirection: "column" }}>
        <div style={{ padding: "24px 20px", borderBottom: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>MintShelf Shop</div>
          <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "4px 0 0", color: store?.brandColor || "var(--color-forest)" }}>
            {store?.name || "Loading..."}
          </h2>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "6px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", background: "var(--color-mint)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
              {planSlug}
            </span>
            <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 600 }}>
              Role: {session.role}
            </span>
          </div>
        </div>

        <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
          <button
            onClick={() => onNavigate("#/dashboard/overview")}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "overview" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
          >
            📊 Overview
          </button>

          {isOwner && (
            <>
              <button
                onClick={() => onNavigate("#/dashboard/products")}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "products" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
              >
                📦 Products & Stock
              </button>
              <button
                onClick={() => onNavigate("#/dashboard/categories")}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "categories" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
              >
                🗂️ Categories
              </button>
            </>
          )}

          <button
            onClick={() => onNavigate("#/dashboard/orders")}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "orders" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
          >
            🛍️ Orders {session.role === "staff" ? "(Mine)" : ""}
          </button>

          <button
            onClick={() => onNavigate("#/dashboard/qr-stands")}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "qr-stands" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
          >
            📱 QR Stands & Link
          </button>

          {isOwner && planSlug !== "offline" && (
            <>
              <button
                onClick={() => onNavigate("#/dashboard/staff")}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "staff" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
              >
                👥 Staff & Referrals
              </button>
              <button
                onClick={() => onNavigate("#/dashboard/reports")}
                style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "reports" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
              >
                📈 Sales Reports
              </button>
            </>
          )}

          {isOwner && (
            <button
              onClick={() => onNavigate("#/dashboard/settings")}
              style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "settings" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
            >
              ⚙️ Store Settings
            </button>
          )}

          <button
            onClick={() => onNavigate("#/dashboard/ai-assistant")}
            style={{ width: "100%", textAlign: "left", padding: "10px 14px", borderRadius: "10px", background: currentSubroute === "ai-assistant" ? "var(--color-mint)" : "none", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
          >
            ✨ AI Assistant
          </button>
        </nav>

        {/* User bar & Storefront Link */}
        <div style={{ padding: "16px 20px", borderTop: "1px solid #E5EADF" }}>
          {store && (
            <button
              onClick={() => onNavigate(`#/store/${store.slug}`)}
              style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", background: "#F5F8EF", color: "var(--color-forest)", fontWeight: 600, fontSize: "12px", marginBottom: "12px", textAlign: "center" }}
            >
              View Public Store ↗
            </button>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "13px", fontWeight: 700 }}>{user?.displayName || "User"}</div>
              <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>@{user?.username}</div>
            </div>
            <button
              onClick={onLogout}
              style={{ background: "none", color: "#DC2626", fontSize: "12px", fontWeight: 600 }}
            >
              Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main style={{ flex: 1, padding: "36px 40px", overflowY: "auto" }}>
        {children}
      </main>
    </div>
  );
};
