import React, { useState, useEffect } from "react";

interface Props {
  value: string;
  onChange: (query: string) => void;
  brandColor?: string;
  placeholder?: string;
}

export const SearchBar: React.FC<Props> = ({
  value,
  onChange,
  brandColor = "var(--color-forest)",
  placeholder = "Search products by name, description, or category..."
}) => {
  const [localValue, setLocalValue] = useState(value);

  // Sync if external value is reset (e.g. clear filters)
  useEffect(() => {
    setLocalValue(value);
  }, [value]);

  // Debounce 200ms
  useEffect(() => {
    const handler = setTimeout(() => {
      if (localValue !== value) {
        onChange(localValue);
      }
    }, 200);

    return () => clearTimeout(handler);
  }, [localValue, onChange, value]);

  return (
    <div style={{ position: "relative", width: "100%", maxWidth: "600px" }}>
      <div
        style={{
          position: "absolute",
          left: "14px",
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--color-muted)",
          display: "flex",
          alignItems: "center",
          pointerEvents: "none",
          fontSize: "16px"
        }}
      >
        🔍
      </div>
      <input
        type="text"
        value={localValue}
        onChange={e => setLocalValue(e.target.value)}
        placeholder={placeholder}
        style={{
          width: "100%",
          padding: "11px 40px 11px 42px",
          borderRadius: "9999px",
          border: "1.5px solid #DCE3D6",
          fontSize: "14px",
          backgroundColor: "#FFFFFF",
          color: "var(--color-ink)",
          outline: "none",
          transition: "border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.03)"
        }}
        onFocus={e => {
          e.target.style.borderColor = brandColor;
          e.target.style.boxShadow = `0 0 0 3px ${brandColor}22`;
        }}
        onBlur={e => {
          e.target.style.borderColor = "#DCE3D6";
          e.target.style.boxShadow = "0 2px 8px rgba(0,0,0,0.03)";
        }}
      />
      {localValue && (
        <button
          type="button"
          onClick={() => {
            setLocalValue("");
            onChange("");
          }}
          aria-label="Clear search"
          style={{
            position: "absolute",
            right: "12px",
            top: "50%",
            transform: "translateY(-50%)",
            background: "#E2E8F0",
            border: "none",
            borderRadius: "50%",
            width: "22px",
            height: "22px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "11px",
            color: "#475569",
            cursor: "pointer",
            fontWeight: 700
          }}
        >
          ✕
        </button>
      )}
    </div>
  );
};

// Token-based matching utility: every typed word/token must match name, description, or category name
export function matchSearchTokens(
  searchQuery: string,
  product: { name: string; description?: string; categoryId?: string },
  categoryName?: string
): boolean {
  const trimmed = searchQuery.trim().toLowerCase();
  if (!trimmed) return true;
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const target = `${product.name} ${product.description || ""} ${categoryName || ""}`.toLowerCase();
  return tokens.every(token => target.includes(token));
}
