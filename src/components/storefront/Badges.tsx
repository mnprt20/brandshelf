import React from "react";
import { Product } from "../../types";

export type BadgeType = "featured" | "best_seller" | "new";

export interface BadgeInfo {
  type: BadgeType;
  label: string;
  bg: string;
  color: string;
}

export function getProductBadges(product: Product): BadgeInfo[] {
  const badges: BadgeInfo[] = [];

  if (product.isFeatured) {
    badges.push({
      type: "featured",
      label: "Featured",
      bg: "#FEF3C7",
      color: "#92400E"
    });
  }

  const isBest = product.isBestSeller || (typeof product.soldCount === "number" && product.soldCount >= 10);
  if (isBest) {
    badges.push({
      type: "best_seller",
      label: "Best Seller",
      bg: "#FEE2E2",
      color: "#991B1B"
    });
  }

  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;
  const isNew = typeof product.createdAt === "number" && (Date.now() - product.createdAt <= FOURTEEN_DAYS_MS);
  if (isNew && badges.length < 2) {
    badges.push({
      type: "new",
      label: "New",
      bg: "#DCFCE7",
      color: "#166534"
    });
  }

  // Max 2 badges per product card
  return badges.slice(0, 2);
}

export const ProductBadges: React.FC<{ product: Product; style?: React.CSSProperties }> = ({ product, style }) => {
  const badges = getProductBadges(product);
  if (badges.length === 0) return null;

  return (
    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", ...style }}>
      {badges.map((b) => (
        <span
          key={b.type}
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.04em",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: b.bg,
            color: b.color,
            lineHeight: "16px"
          }}
        >
          {b.label}
        </span>
      ))}
    </div>
  );
};
