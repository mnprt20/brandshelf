import React from "react";
import { ThemeSharedProps } from "./types";
import { formatPaise } from "../utils/money";

export const BoldTheme: React.FC<ThemeSharedProps> = ({
  store,
  categories,
  products,
  activeCategoryId,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onAddToCart,
  onSelectProduct,
  isDemo,
  onOpenOrderHistory,
  orderCount
}) => {
  const filtered = activeCategoryId
    ? products.filter(p => p.categoryId === activeCategoryId && (isDemo || p.isAvailable))
    : products.filter(p => isDemo || p.isAvailable);

  return (
    <div style={{ backgroundColor: "#0C120C", minHeight: "100vh", color: "#F7FBF6", fontFamily: "sans-serif" }}>
      {/* High Contrast Banner */}
      <header style={{ padding: "32px 24px", background: store.brandColor, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <span style={{ textTransform: "uppercase", letterSpacing: "2px", fontSize: "12px", fontWeight: 700, color: "#DAE7C7" }}>Featured Storefront</span>
          <h1 style={{ fontSize: "36px", fontWeight: 900, margin: "4px 0 0", color: "#FFFFFF" }}>{store.name}</h1>
          <p style={{ fontSize: "14px", color: "#F0F5EC", margin: "4px 0 0" }}>{store.description}</p>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          {onOpenOrderHistory && (
            <button
              onClick={onOpenOrderHistory}
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#FFFFFF", padding: "12px 20px", borderRadius: "9999px", fontWeight: 800, fontSize: "14px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            >
              <span>ORDERS</span>
              {typeof orderCount === "number" && orderCount > 0 && (
                <span style={{ background: "#DAE7C7", color: "#0C120C", padding: "1px 6px", borderRadius: "9999px", fontSize: "11px", fontWeight: 900 }}>
                  {orderCount}
                </span>
              )}
            </button>
          )}
          <button
            onClick={onOpenCart}
            style={{ background: "#FFFFFF", color: store.brandColor, padding: "14px 24px", borderRadius: "9999px", fontWeight: 800, fontSize: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.2)", border: "none", cursor: "pointer" }}
          >
            CART ({cartCount})
          </button>
        </div>
      </header>

      {/* Category Buttons */}
      <div style={{ padding: "20px 24px", display: "flex", gap: "10px", overflowX: "auto", borderBottom: "1px solid #1E291E" }}>
        <button
          onClick={() => onSelectCategory(null)}
          style={{ padding: "10px 20px", borderRadius: "12px", background: activeCategoryId === null ? "#FFFFFF" : "#1A261A", color: activeCategoryId === null ? "#0C120C" : "#FFFFFF", fontWeight: 700 }}
        >
          ALL
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            style={{ padding: "10px 20px", borderRadius: "12px", background: activeCategoryId === c.id ? "#FFFFFF" : "#1A261A", color: activeCategoryId === c.id ? "#0C120C" : "#FFFFFF", fontWeight: 700, whiteSpace: "nowrap" }}
          >
            {c.name.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Bold Big-Card Grid */}
      <main style={{ padding: "32px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "#9DB29D" }}>
            NO ITEMS FOUND IN THIS CATEGORY.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "28px" }}>
            {filtered.map(p => (
              <div
                key={p.id}
                onClick={() => onSelectProduct?.(p)}
                style={{
                  background: "#162016",
                  borderRadius: "24px",
                  overflow: "hidden",
                  border: "1px solid #223322",
                  display: "flex",
                  flexDirection: "column",
                  cursor: onSelectProduct ? "pointer" : "default"
                }}
              >
                <div style={{ height: "200px", background: "#1E2B1E", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "54px" }}>⚡</span>
                  )}
                </div>
                <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "0 0 8px" }}>{p.name}</h3>
                  <p style={{ fontSize: "14px", color: "#9DB29D", margin: "0 0 16px", flex: 1 }}>{p.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "22px", fontWeight: 900, color: "#9EE493" }}>{formatPaise(p.pricePaise)}</span>
                    <button
                      disabled={isDemo || (p.stock !== null && p.stock <= 0)}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(p);
                      }}
                      style={{ background: "#9EE493", color: "#0C120C", padding: "12px 20px", borderRadius: "14px", fontWeight: 800, fontSize: "14px", border: "none", cursor: (isDemo || (p.stock !== null && p.stock <= 0)) ? "not-allowed" : "pointer", opacity: (isDemo || (p.stock !== null && p.stock <= 0)) ? 0.6 : 1 }}
                    >
                      {p.stock !== null && p.stock <= 0 ? "SOLD OUT" : "GRAB IT"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
