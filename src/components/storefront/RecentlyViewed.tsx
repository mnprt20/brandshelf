import React, { useEffect, useState } from "react";
import { Product } from "../../types";
import { formatPaise } from "../../utils/money";

interface RecentlyViewedProps {
  storeId: string;
  allProducts: Product[];
  currentProductId?: string;
  brandColor?: string;
  onSelectProduct: (product: Product) => void;
  onAddToCart: (product: Product) => void;
}

export function recordRecentlyViewed(storeId: string, productId: string) {
  if (!storeId || !productId) return;
  try {
    const key = `mintshelf_recent_${storeId}`;
    const raw = localStorage.getItem(key);
    let list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list)) list = [];
    list = [productId, ...list.filter(id => id !== productId)].slice(0, 10);
    localStorage.setItem(key, JSON.stringify(list));
  } catch (err) {
    console.warn("Failed to save recently viewed:", err);
  }
}

export function getRecentlyViewedIds(storeId: string): string[] {
  try {
    const key = `mintshelf_recent_${storeId}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

export const RecentlyViewed: React.FC<RecentlyViewedProps> = ({
  storeId,
  allProducts,
  currentProductId,
  brandColor = "#1B3B2B",
  onSelectProduct,
  onAddToCart
}) => {
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  useEffect(() => {
    const ids = getRecentlyViewedIds(storeId);
    if (ids.length === 0) {
      setRecentProducts([]);
      return;
    }

    const map = new Map<string, Product>();
    for (const p of allProducts) {
      map.set(p.id, p);
    }

    // Filter: must exist, must be available, must not be current product
    const resolved: Product[] = [];
    for (const id of ids) {
      if (id === currentProductId) continue;
      const prod = map.get(id);
      if (prod && prod.isAvailable) {
        resolved.push(prod);
      }
    }

    setRecentProducts(resolved.slice(0, 10));
  }, [storeId, allProducts, currentProductId]);

  if (recentProducts.length === 0) {
    return null;
  }

  return (
    <div style={{ marginTop: "32px", marginBottom: "24px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px", padding: "0 4px" }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
          Recently Viewed
        </h3>
        <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
          {recentProducts.length} item{recentProducts.length > 1 ? "s" : ""}
        </span>
      </div>

      <div
        style={{
          display: "flex",
          gap: "14px",
          overflowX: "auto",
          paddingBottom: "8px",
          scrollbarWidth: "thin",
          WebkitOverflowScrolling: "touch"
        }}
      >
        {recentProducts.map(p => {
          const outOfStock = p.stock !== null && p.stock <= 0;
          return (
            <div
              key={p.id}
              onClick={() => onSelectProduct(p)}
              style={{
                width: "180px",
                flexShrink: 0,
                background: "#FFFFFF",
                borderRadius: "14px",
                border: "1px solid #E5EADF",
                overflow: "hidden",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 2px 8px rgba(0,0,0,0.04)"
              }}
            >
              <div style={{ width: "100%", height: "120px", background: "#F5F8EF", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
                {p.image ? (
                  <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                ) : (
                  <span style={{ fontSize: "28px" }}>📦</span>
                )}
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
  );
};
