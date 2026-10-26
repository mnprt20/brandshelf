import React from "react";
import { ThemeSharedProps } from "./types";
import { formatPaise } from "../utils/money";

export const MinimalTheme: React.FC<ThemeSharedProps> = ({
  store,
  categories,
  products,
  activeCategoryId,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onAddToCart,
  isDemo,
  onOpenOrderHistory,
  orderCount
}) => {
  const filtered = activeCategoryId
    ? products.filter(p => p.categoryId === activeCategoryId && (isDemo || p.isAvailable))
    : products.filter(p => isDemo || p.isAvailable);

  return (
    <div style={{ backgroundColor: "#FAFAF9", minHeight: "100vh", color: "#1C1917", fontFamily: "Georgia, serif" }}>
      {/* Typographic Header */}
      <header style={{ borderBottom: "1px solid #E7E5E4", padding: "32px 32px 24px", maxWidth: "960px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h1 style={{ fontSize: "28px", letterSpacing: "-0.02em", margin: 0, fontWeight: 500, color: store.brandColor }}>{store.name}</h1>
          <p style={{ fontSize: "14px", color: "#78716C", fontStyle: "italic", marginTop: "6px" }}>{store.description}</p>
        </div>
        <div style={{ display: "flex", gap: "16px", alignItems: "baseline" }}>
          {onOpenOrderHistory && (
            <button
              onClick={onOpenOrderHistory}
              style={{ background: "transparent", border: "none", borderBottom: "1px solid #A8A29E", padding: "4px 6px", fontSize: "13px", color: "#78716C", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}
            >
              <span>Orders</span>
              {typeof orderCount === "number" && orderCount > 0 && (
                <span style={{ fontSize: "11px", fontWeight: 700, color: store.brandColor }}>({orderCount})</span>
              )}
            </button>
          )}
          <button
            onClick={onOpenCart}
            style={{ background: "transparent", border: "none", borderBottom: `2px solid ${store.brandColor}`, padding: "4px 8px", fontSize: "14px", color: store.brandColor, fontWeight: 600, cursor: "pointer" }}
          >
            Bag ({cartCount})
          </button>
        </div>
      </header>

      {/* Minimal category line */}
      <div style={{ maxWidth: "960px", margin: "0 auto", padding: "20px 32px", display: "flex", gap: "24px", overflowX: "auto" }}>
        <button
          onClick={() => onSelectCategory(null)}
          style={{ background: "none", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: activeCategoryId === null ? 700 : 400, color: activeCategoryId === null ? store.brandColor : "#A8A29E" }}
        >
          All
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            style={{ background: "none", fontSize: "13px", textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: activeCategoryId === c.id ? 700 : 400, color: activeCategoryId === c.id ? store.brandColor : "#A8A29E", whiteSpace: "nowrap" }}
          >
            {c.name}
          </button>
        ))}
      </div>

      {/* Editorial List */}
      <main style={{ maxWidth: "960px", margin: "0 auto", padding: "0 32px 64px" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "48px 0", color: "#78716C", fontStyle: "italic" }}>
            Nothing currently listed in this section.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {filtered.map(p => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 0", borderBottom: "1px dashed #E7E5E4" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: "64px", height: "64px", objectFit: "cover", borderRadius: "4px" }} />
                  ) : (
                    <div style={{ width: "64px", height: "64px", background: "#F5F5F4", borderRadius: "4px", display: "flex", alignItems: "center", justifyContent: "center" }}>🌾</div>
                  )}
                  <div>
                    <h4 style={{ margin: "0 0 4px", fontSize: "16px", fontWeight: 600 }}>{p.name}</h4>
                    <p style={{ margin: 0, fontSize: "13px", color: "#78716C" }}>{p.description}</p>
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600 }}>{formatPaise(p.pricePaise)}</span>
                  <button
                    disabled={isDemo || (p.stock !== null && p.stock <= 0)}
                    onClick={() => onAddToCart(p)}
                    style={{ border: `1px solid ${store.brandColor}`, color: store.brandColor, background: "#FFF", padding: "6px 14px", borderRadius: "2px", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.05em", opacity: (isDemo || (p.stock !== null && p.stock <= 0)) ? 0.6 : 1 }}
                  >
                    {p.stock !== null && p.stock <= 0 ? "Unavailable" : "+ Add"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};
