import React, { useState, useEffect } from "react";
import { Category } from "../../types";

export type SortOption = "relevance" | "newest" | "price_asc" | "price_desc" | "popular";

export interface FilterState {
  categoryIds: string[];
  minPriceRupees: string;
  maxPriceRupees: string;
  inStockOnly: boolean;
  sortBy: SortOption;
}

export const DEFAULT_FILTER_STATE: FilterState = {
  categoryIds: [],
  minPriceRupees: "",
  maxPriceRupees: "",
  inStockOnly: false,
  sortBy: "newest"
};

interface Props {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  onResetFilters: () => void;
  isSearching: boolean;
  brandColor?: string;
  totalResults: number;
}

export const FilterPanel: React.FC<Props> = ({
  isOpen,
  onClose,
  categories,
  filters,
  onFilterChange,
  onResetFilters,
  isSearching,
  brandColor = "var(--color-forest)",
  totalResults
}) => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 640);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  if (!isOpen) return null;

  const handleToggleCategory = (catId: string) => {
    const exists = filters.categoryIds.includes(catId);
    const updated = exists
      ? filters.categoryIds.filter(id => id !== catId)
      : [...filters.categoryIds, catId];
    onFilterChange({ ...filters, categoryIds: updated });
  };

  const content = (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5EADF", paddingBottom: "14px" }}>
        <div>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
            Filter & Sort
          </h3>
          <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
            {totalResults} {totalResults === 1 ? "product" : "products"} found
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            onClick={onResetFilters}
            style={{
              background: "none",
              border: "none",
              color: brandColor,
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              padding: "4px 8px"
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            style={{
              width: "32px",
              height: "32px",
              borderRadius: "50%",
              background: "#F0F4EC",
              border: "none",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "14px",
              fontWeight: 700
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sort Section */}
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--color-ink)" }}>
          Sort by
        </label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {[
            ...(isSearching ? [{ id: "relevance" as const, label: "Relevance" }] : []),
            { id: "newest" as const, label: "Newest" },
            { id: "popular" as const, label: "Popular" },
            { id: "price_asc" as const, label: "Price: Low to High" },
            { id: "price_desc" as const, label: "Price: High to Low" }
          ].map(opt => (
            <button
              key={opt.id}
              type="button"
              onClick={() => onFilterChange({ ...filters, sortBy: opt.id })}
              style={{
                padding: "7px 14px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: filters.sortBy === opt.id ? 700 : 500,
                backgroundColor: filters.sortBy === opt.id ? brandColor : "#FFFFFF",
                color: filters.sortBy === opt.id ? "#FFFFFF" : "var(--color-ink)",
                border: `1.5px solid ${filters.sortBy === opt.id ? brandColor : "#DCE3D6"}`,
                cursor: "pointer"
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Categories Multi-Select */}
      {categories.length > 0 && (
        <div>
          <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--color-ink)" }}>
            Categories ({filters.categoryIds.length ? `${filters.categoryIds.length} selected` : "All"})
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", maxHeight: "150px", overflowY: "auto", padding: "2px" }}>
            {categories.map(cat => {
              const isSelected = filters.categoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => handleToggleCategory(cat.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "12px",
                    fontWeight: isSelected ? 700 : 500,
                    backgroundColor: isSelected ? `${brandColor}18` : "#F8FAF5",
                    color: isSelected ? brandColor : "var(--color-ink)",
                    border: `1.5px solid ${isSelected ? brandColor : "#E5EADF"}`,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px"
                  }}
                >
                  <span>{isSelected ? "✓" : "+"}</span>
                  <span>{cat.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Range (in Rupees) */}
      <div>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px", color: "var(--color-ink)" }}>
          Price Range (₹)
        </label>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            value={filters.minPriceRupees}
            onChange={e => onFilterChange({ ...filters, minPriceRupees: e.target.value })}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #DCE3D6",
              fontSize: "13px"
            }}
          />
          <span style={{ color: "var(--color-muted)", fontSize: "14px" }}>—</span>
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            value={filters.maxPriceRupees}
            onChange={e => onFilterChange({ ...filters, maxPriceRupees: e.target.value })}
            style={{
              flex: 1,
              padding: "8px 12px",
              borderRadius: "10px",
              border: "1px solid #DCE3D6",
              fontSize: "13px"
            }}
          />
        </div>
      </div>

      {/* Availability / In Stock Only */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "4px 0" }}>
        <input
          type="checkbox"
          id="inStockCheck"
          checked={filters.inStockOnly}
          onChange={e => onFilterChange({ ...filters, inStockOnly: e.target.checked })}
          style={{ width: "18px", height: "18px", accentColor: brandColor, cursor: "pointer" }}
        />
        <label htmlFor="inStockCheck" style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", cursor: "pointer" }}>
          In stock only (hide sold out items)
        </label>
      </div>

      {/* Apply / Close button */}
      <button
        type="button"
        onClick={onClose}
        style={{
          width: "100%",
          padding: "12px",
          borderRadius: "9999px",
          backgroundColor: brandColor,
          color: "#FFFFFF",
          fontWeight: 700,
          fontSize: "14px",
          border: "none",
          cursor: "pointer",
          marginTop: "10px"
        }}
      >
        View {totalResults} {totalResults === 1 ? "Result" : "Results"}
      </button>
    </div>
  );

  if (isMobile) {
    // Bottom Sheet under 640px
    return (
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1040,
          backgroundColor: "rgba(0,0,0,0.5)",
          display: "flex",
          justifyContent: "flex-end",
          flexDirection: "column"
        }}
      >
        <div
          onClick={e => e.stopPropagation()}
          style={{
            background: "#FFFFFF",
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            padding: "24px 20px 32px",
            maxHeight: "85vh",
            overflowY: "auto",
            boxShadow: "0 -10px 25px rgba(0,0,0,0.15)"
          }}
        >
          <div style={{ width: "40px", height: "4px", backgroundColor: "#DCE3D6", borderRadius: "9999px", margin: "0 auto 16px" }} />
          {content}
        </div>
      </div>
    );
  }

  // Desktop / Tablet Modal
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1040,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          maxWidth: "460px",
          width: "100%",
          padding: "24px",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
        }}
      >
        {content}
      </div>
    </div>
  );
};

// Filter & Sort Engine
export function applyFiltersAndSort<T extends {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  pricePaise: number;
  stock: number | null;
  isAvailable: boolean;
  createdAt: number;
  soldCount?: number;
  isFeatured?: boolean;
}>(
  products: T[],
  filters: FilterState,
  searchQuery: string,
  categories: Category[]
): T[] {
  const categoryMap = new Map(categories.map(c => [c.id, c.name]));
  const tokens = searchQuery.trim().toLowerCase().split(/\s+/).filter(Boolean);

  let result = products.filter(p => {
    // 1. Availability check
    if (!p.isAvailable) return false;

    // 2. Token-based search
    if (tokens.length > 0) {
      const catName = categoryMap.get(p.categoryId) || "";
      const text = `${p.name} ${p.description || ""} ${catName}`.toLowerCase();
      const matchesAllTokens = tokens.every(tok => text.includes(tok));
      if (!matchesAllTokens) return false;
    }

    // 3. Category Multi-select
    if (filters.categoryIds.length > 0) {
      if (!filters.categoryIds.includes(p.categoryId)) return false;
    }

    // 4. In stock only
    if (filters.inStockOnly) {
      if (p.stock !== null && p.stock <= 0) return false;
    }

    // 5. Price range (rupees converted to paise)
    if (filters.minPriceRupees) {
      const minPaise = Math.round(parseFloat(filters.minPriceRupees) * 100);
      if (!isNaN(minPaise) && p.pricePaise < minPaise) return false;
    }
    if (filters.maxPriceRupees) {
      const maxPaise = Math.round(parseFloat(filters.maxPriceRupees) * 100);
      if (!isNaN(maxPaise) && p.pricePaise > maxPaise) return false;
    }

    return true;
  });

  // Sort
  result = [...result].sort((a, b) => {
    if (filters.sortBy === "relevance" && tokens.length > 0) {
      // Name starts with query gets highest priority
      const q = searchQuery.trim().toLowerCase();
      const aStarts = a.name.toLowerCase().startsWith(q) ? 1 : 0;
      const bStarts = b.name.toLowerCase().startsWith(q) ? 1 : 0;
      if (aStarts !== bStarts) return bStarts - aStarts;
      return (b.soldCount || 0) - (a.soldCount || 0);
    }
    if (filters.sortBy === "popular") {
      const countDiff = (b.soldCount || 0) - (a.soldCount || 0);
      if (countDiff !== 0) return countDiff;
      return b.createdAt - a.createdAt;
    }
    if (filters.sortBy === "price_asc") {
      return a.pricePaise - b.pricePaise;
    }
    if (filters.sortBy === "price_desc") {
      return b.pricePaise - a.pricePaise;
    }
    // Default newest
    return b.createdAt - a.createdAt;
  });

  return result;
}
