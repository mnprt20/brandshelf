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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobileView, setIsMobileView] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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

  const handleNavClick = (route: string) => {
    onNavigate(route);
    if (isMobileView) {
      setIsMobileMenuOpen(false);
    }
  };

  const navLinks = (
    <>
      <button
        onClick={() => handleNavClick("#/dashboard/overview")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "12px",
          background: currentSubroute === "overview" ? "var(--color-mint)" : "none",
          color: "var(--color-ink)",
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>📊</span> Overview
      </button>

      {isOwner && (
        <>
          <button
            onClick={() => handleNavClick("#/dashboard/products")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "products" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>📦</span> Products & Stock
          </button>
          <button
            onClick={() => handleNavClick("#/dashboard/categories")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "categories" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>🗂️</span> Categories
          </button>
        </>
      )}

      <button
        onClick={() => handleNavClick("#/dashboard/orders")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "12px",
          background: currentSubroute === "orders" ? "var(--color-mint)" : "none",
          color: "var(--color-ink)",
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>🛍️</span> Orders {session.role === "staff" ? "(Mine)" : ""}
      </button>

      <button
        onClick={() => handleNavClick("#/dashboard/qr-stands")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "12px",
          background: currentSubroute === "qr-stands" ? "var(--color-mint)" : "none",
          color: "var(--color-ink)",
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>📱</span> QR Stands & 3D
      </button>

      {isOwner && planSlug !== "offline" && (
        <>
          <button
            onClick={() => handleNavClick("#/dashboard/staff")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "staff" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>👥</span> Staff & Referrals
          </button>
          <button
            onClick={() => handleNavClick("#/dashboard/reports")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "reports" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>📈</span> Sales Reports
          </button>
        </>
      )}

      {isOwner && (
        <>
          <button
            onClick={() => handleNavClick("#/dashboard/settings")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "settings" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>⚙️</span> Shop Settings
          </button>
          <button
            onClick={() => handleNavClick("#/dashboard/plans")}
            style={{
              width: "100%",
              textAlign: "left",
              padding: "12px 14px",
              borderRadius: "12px",
              background: currentSubroute === "plans" ? "var(--color-mint)" : "none",
              color: "var(--color-ink)",
              fontWeight: 600,
              fontSize: "14px",
              display: "flex",
              alignItems: "center",
              gap: "10px"
            }}
          >
            <span>💳</span> Plan & Seats
          </button>
        </>
      )}

      <button
        onClick={() => handleNavClick("#/dashboard/ai-assistant")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "12px",
          background: currentSubroute === "ai-assistant" ? "var(--color-mint)" : "none",
          color: "var(--color-ink)",
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>🤖</span> AI Assistant
      </button>

      <button
        onClick={() => handleNavClick("#/diagnostics")}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "12px 14px",
          borderRadius: "12px",
          background: "none",
          color: "var(--color-muted)",
          fontWeight: 600,
          fontSize: "14px",
          display: "flex",
          alignItems: "center",
          gap: "10px"
        }}
      >
        <span>🧪</span> Test Suite
      </button>
    </>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh", backgroundColor: "var(--color-bg)" }}>
      {/* Mobile Top Navigation Header */}
      <header
        style={{
          display: isMobileView ? "flex" : "none",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 16px",
          backgroundColor: "#FFFFFF",
          borderBottom: "1px solid #E5EADF",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Toggle Navigation"
            style={{
              background: "none",
              fontSize: "22px",
              padding: "6px",
              borderRadius: "8px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--color-ink)"
            }}
          >
            {isMobileMenuOpen ? "✕" : "☰"}
          </button>
          <div>
            <div style={{ fontSize: "16px", fontWeight: 800, color: store?.brandColor || "var(--color-forest)", lineHeight: 1.2 }}>
              {store?.name || "MintShelf"}
            </div>
            <div style={{ fontSize: "10px", color: "var(--color-muted)", textTransform: "uppercase", fontWeight: 700 }}>
              {planSlug} • {session.role}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px" }}>
          {store && (
            <button
              onClick={() => onNavigate(`#/store/${store.slug}`)}
              style={{
                padding: "6px 12px",
                borderRadius: "9999px",
                background: "var(--color-mint)",
                color: "var(--color-forest)",
                fontSize: "12px",
                fontWeight: 700
              }}
            >
              Shop ↗
            </button>
          )}
        </div>
      </header>

      {/* Main Layout Body */}
      <div style={{ display: "flex", flex: 1, position: "relative" }}>
        {/* Mobile Backdrop Overlay */}
        {isMobileView && isMobileMenuOpen && (
          <div
            onClick={() => setIsMobileMenuOpen(false)}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.45)",
              zIndex: 200,
              backdropFilter: "blur(2px)"
            }}
          />
        )}

        {/* Sidebar / Off-canvas Drawer */}
        <aside
          style={{
            position: isMobileView ? "fixed" : "static",
            top: 0,
            bottom: 0,
            left: 0,
            width: "270px",
            backgroundColor: "#FFFFFF",
            borderRight: "1px solid #E5EADF",
            display: "flex",
            flexDirection: "column",
            zIndex: isMobileView ? 210 : 20,
            transform: isMobileView && !isMobileMenuOpen ? "translateX(-100%)" : "translateX(0)",
            transition: isMobileView ? "transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)" : "none",
            boxShadow: isMobileView && isMobileMenuOpen ? "4px 0 24px rgba(0,0,0,0.15)" : "none",
            maxHeight: "100vh"
          }}
        >
          {/* Store Info */}
          <div style={{ padding: "20px", borderBottom: "1px solid #E5EADF" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: "11px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>
                MintShelf Dashboard
              </div>
              {isMobileView && (
                <button
                  onClick={() => setIsMobileMenuOpen(false)}
                  style={{ background: "none", fontSize: "18px", color: "var(--color-muted)", padding: "2px" }}
                >
                  ✕
                </button>
              )}
            </div>
            <h2 style={{ fontSize: "18px", fontWeight: 700, margin: "6px 0 0", color: store?.brandColor || "var(--color-forest)" }}>
              {store?.name || "Loading..."}
            </h2>
            <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "11px", textTransform: "uppercase", background: "var(--color-mint)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
                {planSlug}
              </span>
              <span style={{ fontSize: "11px", color: "var(--color-muted)", fontWeight: 600 }}>
                Role: {session.role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav style={{ padding: "16px 12px", flex: 1, display: "flex", flexDirection: "column", gap: "4px", overflowY: "auto" }}>
            {navLinks}
          </nav>

          {/* Bottom user profile & Store link */}
          <div style={{ padding: "16px 20px", borderTop: "1px solid #E5EADF", backgroundColor: "#F9FAF6" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
              <div style={{ overflow: "hidden" }}>
                <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-ink)", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                  {user?.displayName || "User"}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-muted)" }}>@{user?.username}</div>
              </div>
              <button
                onClick={onLogout}
                style={{ background: "none", color: "#DC2626", fontSize: "12px", fontWeight: 700, padding: "4px 8px", borderRadius: "6px" }}
              >
                Log out
              </button>
            </div>

            {store && (
              <button
                onClick={() => onNavigate(`#/store/${store.slug}`)}
                style={{
                  width: "100%",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: store.brandColor,
                  color: "#FFFFFF",
                  fontSize: "13px",
                  fontWeight: 600,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "6px"
                }}
              >
                <span>View Public Store</span> ↗
              </button>
            )}
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          style={{
            flex: 1,
            padding: isMobileView ? "20px 16px 40px" : "32px 40px",
            overflowX: "hidden",
            width: "100%",
            maxWidth: "100%"
          }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};
