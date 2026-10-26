import React, { useEffect, useState } from "react";
import { Product, Store } from "../../types";
import { apiGetRelatedProducts } from "../../services/apiClient";
import { formatPaise } from "../../utils/money";
import { ProductBadges } from "./Badges";

interface RelatedProductsProps {
  store: Store;
  productId: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onAddMultipleToCart: (products: Product[]) => void;
}

export const RelatedProducts: React.FC<RelatedProductsProps> = ({
  store,
  productId,
  onSelectProduct,
  onAddToCart,
  onAddMultipleToCart
}) => {
  const [alsoBought, setAlsoBought] = useState<Product[]>([]);
  const [sameCategory, setSameCategory] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [addedAllSuccess, setAddedAllSuccess] = useState(false);

  useEffect(() => {
    let active = true;
    const fetchRelated = async () => {
      setLoading(true);
      try {
        const res = await apiGetRelatedProducts(store.id, productId);
        if (active) {
          setAlsoBought(res.alsoBought || []);
          setSameCategory(res.sameCategory || []);
        }
      } catch (err) {
        console.warn("Failed to load related products:", err);
      } finally {
        if (active) setLoading(false);
      }
    };

    fetchRelated();
    return () => {
      active = false;
    };
  }, [store.id, productId]);

  if (loading) {
    return (
      <div style={{ padding: "16px 0", color: "var(--color-muted)", fontSize: "13px" }}>
        Loading recommendations...
      </div>
    );
  }

  if (alsoBought.length === 0 && sameCategory.length === 0) {
    return null;
  }

  const brandColor = store.brandColor || "#1B3B2B";
  const brandType = store.brandType || "";
  const isFoodOrGift = ["food", "gift", "groceries", "bakery", "cafe"].includes(brandType.toLowerCase()) || brandType.includes("food") || brandType.includes("gift");

  // Calculate sum of alsoBought items for "Add all to cart"
  const alsoBoughtAvailable = alsoBought.filter(p => p.isAvailable && (p.stock === null || p.stock > 0));
  const alsoBoughtTotalPaise = alsoBoughtAvailable.reduce((acc, p) => acc + p.pricePaise, 0);

  const handleAddAll = () => {
    if (alsoBoughtAvailable.length === 0) return;
    onAddMultipleToCart(alsoBoughtAvailable);
    setAddedAllSuccess(true);
    setTimeout(() => setAddedAllSuccess(false), 2000);
  };

  return (
    <div style={{ marginTop: "24px", display: "flex", flexDirection: "column", gap: "28px" }}>
      {/* 1. Frequently Bought Together */}
      {alsoBought.length > 0 && (
        <div style={{ background: "#F5F8EF", borderRadius: "18px", padding: "18px", border: "1px solid #E5EADF" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px", flexWrap: "wrap", gap: "8px" }}>
            <div>
              <h4 style={{ fontSize: "15px", fontWeight: 800, margin: 0, color: "var(--color-ink)" }}>
                {isFoodOrGift ? "Frequently Bought Together 🍽️" : "Frequently Bought Together"}
              </h4>
              <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                Customers often buy these items together
              </p>
            </div>

            {alsoBoughtAvailable.length > 0 && (
              <button
                type="button"
                onClick={handleAddAll}
                style={{
                  padding: "8px 16px",
                  borderRadius: "9999px",
                  background: addedAllSuccess ? "#166534" : brandColor,
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  transition: "background 0.2s ease"
                }}
              >
                {addedAllSuccess ? "✓ Added All!" : `Add All (${alsoBoughtAvailable.length}) · ${formatPaise(alsoBoughtTotalPaise)}`}
              </button>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "12px" }}>
            {alsoBought.map(p => {
              const outOfStock = p.stock !== null && p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "12px",
                    border: "1px solid #DCE3D6",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    padding: "10px"
                  }}
                >
                  <div style={{ height: "90px", background: "#F0F4EC", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "8px" }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "24px" }}>🛍️</span>
                    )}
                  </div>
                  <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: "13px", fontWeight: 700, color: brandColor, marginBottom: "8px" }}>
                    {formatPaise(p.pricePaise)}
                  </div>
                  <button
                    type="button"
                    disabled={outOfStock}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToCart(p);
                    }}
                    style={{
                      marginTop: "auto",
                      width: "100%",
                      padding: "6px",
                      borderRadius: "8px",
                      background: outOfStock ? "#E5EADF" : brandColor,
                      color: outOfStock ? "#8C9688" : "#FFFFFF",
                      fontSize: "11px",
                      fontWeight: 700,
                      border: "none",
                      cursor: outOfStock ? "not-allowed" : "pointer"
                    }}
                  >
                    {outOfStock ? "Sold out" : "+ Add"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. You May Also Like */}
      {sameCategory.length > 0 && (
        <div>
          <h4 style={{ fontSize: "15px", fontWeight: 800, margin: "0 0 12px", color: "var(--color-ink)" }}>
            You May Also Like
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: "12px" }}>
            {sameCategory.map(p => {
              const outOfStock = p.stock !== null && p.stock <= 0;
              return (
                <div
                  key={p.id}
                  onClick={() => onSelectProduct(p)}
                  style={{
                    background: "#FFFFFF",
                    borderRadius: "14px",
                    border: "1px solid #E5EADF",
                    overflow: "hidden",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.03)"
                  }}
                >
                  <div style={{ height: "110px", background: "#F5F8EF", position: "relative", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                    {p.image ? (
                      <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ fontSize: "28px" }}>📦</span>
                    )}
                    <ProductBadges product={p} style={{ position: "absolute", top: "6px", left: "6px" }} />
                  </div>
                  <div style={{ padding: "10px", flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {p.name}
                    </div>
                    <div style={{ fontSize: "13px", fontWeight: 700, color: brandColor, marginBottom: "8px" }}>
                      {formatPaise(p.pricePaise)}
                    </div>
                    <button
                      type="button"
                      disabled={outOfStock}
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToCart(p);
                      }}
                      style={{
                        marginTop: "auto",
                        width: "100%",
                        padding: "6px 10px",
                        borderRadius: "9999px",
                        background: outOfStock ? "#E5EADF" : brandColor,
                        color: outOfStock ? "#8C9688" : "#FFFFFF",
                        fontSize: "12px",
                        fontWeight: 600,
                        border: "none",
                        cursor: outOfStock ? "not-allowed" : "pointer"
                      }}
                    >
                      {outOfStock ? "Sold out" : "+ Add"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
