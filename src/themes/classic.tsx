import React from "react";
import { ThemeSharedProps } from "./types";
import { formatPaise } from "../utils/money";

export const ClassicTheme: React.FC<ThemeSharedProps> = ({
  store,
  categories,
  products,
  activeCategoryId,
  onSelectCategory,
  cartCount,
  onOpenCart,
  onAddToCart,
  isDemo
}) => {
  const filtered = activeCategoryId
    ? products.filter(p => p.categoryId === activeCategoryId && (isDemo || p.isAvailable))
    : products.filter(p => isDemo || p.isAvailable);

  return (
    <div style={{ backgroundColor: "#F9FAF6", minHeight: "100vh", color: "#101410" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #E5EADF", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#FFFFFF" }}>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 700, margin: 0, color: store.brandColor }}>{store.name}</h1>
          <p style={{ fontSize: "13px", color: "#5E5E61", margin: "2px 0 0" }}>{store.description}</p>
        </div>
        <button 
          onClick={onOpenCart}
          style={{ background: store.brandColor, color: "#fff", padding: "10px 18px", borderRadius: "9999px", fontWeight: 600, display: "flex", alignItems: "center", gap: "8px" }}
        >
          <span>🛒 Cart</span>
          <span style={{ background: "rgba(255,255,255,0.25)", padding: "2px 8px", borderRadius: "12px", fontSize: "12px" }}>{cartCount}</span>
        </button>
      </header>

      {/* Category Pills */}
      <nav style={{ padding: "16px 24px", display: "flex", gap: "8px", overflowX: "auto" }}>
        <button
          onClick={() => onSelectCategory(null)}
          style={{
            padding: "8px 16px",
            borderRadius: "9999px",
            background: activeCategoryId === null ? store.brandColor : "#FFFFFF",
            color: activeCategoryId === null ? "#FFFFFF" : "#101410",
            border: "1px solid #DCE3D6",
            fontWeight: 500
          }}
        >
          All Items
        </button>
        {categories.map(c => (
          <button
            key={c.id}
            onClick={() => onSelectCategory(c.id)}
            style={{
              padding: "8px 16px",
              borderRadius: "9999px",
              background: activeCategoryId === c.id ? store.brandColor : "#FFFFFF",
              color: activeCategoryId === c.id ? "#FFFFFF" : "#101410",
              border: "1px solid #DCE3D6",
              fontWeight: 500
            }}
          >
            {c.name}
          </button>
        ))}
      </nav>

      {/* Product Grid */}
      <main style={{ padding: "16px 24px", maxWidth: "1200px", margin: "0 auto" }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 20px", color: "#5E5E61" }}>
            No products available in this category yet.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "20px" }}>
            {filtered.map(p => (
              <div key={p.id} style={{ background: "#FFFFFF", borderRadius: "16px", border: "1px solid #E5EADF", overflow: "hidden", display: "flex", flexDirection: "column" }}>
                <div style={{ height: "160px", backgroundColor: "#E9F0E1", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {p.image ? (
                    <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "36px" }}>📦</span>
                  )}
                </div>
                <div style={{ padding: "16px", flex: 1, display: "flex", flexDirection: "column" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 6px" }}>{p.name}</h3>
                  <p style={{ fontSize: "13px", color: "#5E5E61", margin: "0 0 12px", flex: 1 }}>{p.description}</p>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "auto" }}>
                    <span style={{ fontSize: "18px", fontWeight: 700, color: store.brandColor }}>{formatPaise(p.pricePaise)}</span>
                    <button
                      disabled={isDemo || (p.stock !== null && p.stock <= 0)}
                      onClick={() => onAddToCart(p)}
                      style={{
                        background: store.brandColor,
                        color: "#FFFFFF",
                        padding: "8px 14px",
                        borderRadius: "9999px",
                        fontSize: "13px",
                        fontWeight: 600,
                        opacity: (isDemo || (p.stock !== null && p.stock <= 0)) ? 0.6 : 1
                      }}
                    >
                      {p.stock !== null && p.stock <= 0 ? "Out of stock" : "Add to Cart"}
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
