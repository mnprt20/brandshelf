import React, { useMemo } from "react";
import { Product, Variant } from "../../types";
import { formatPaise } from "../../utils/money";

interface VariantPickerProps {
  product: Product;
  brandColor?: string;
  selectedOptions: Record<string, string>;
  onChangeOption: (optionName: string, value: string) => void;
  selectedVariant: Variant | null;
}

export function findMatchingVariant(
  variants: Variant[] | undefined,
  optionNames: string[] | undefined,
  selectedOptions: Record<string, string>
): Variant | null {
  if (!variants || variants.length === 0 || !optionNames || optionNames.length === 0) {
    return null;
  }
  // Check that all option names have a selected value
  for (const name of optionNames) {
    if (!selectedOptions[name]) return null;
  }

  return (
    variants.find((v) => {
      for (const name of optionNames) {
        if (v.options[name] !== selectedOptions[name]) return false;
      }
      return true;
    }) || null
  );
}

export const VariantPicker: React.FC<VariantPickerProps> = ({
  product,
  brandColor = "var(--color-forest)",
  selectedOptions,
  onChangeOption,
  selectedVariant
}) => {
  const optionNames = useMemo(() => {
    if (product.optionNames && product.optionNames.length > 0) {
      return product.optionNames;
    }
    // Infer option names from variants if optionNames not explicitly stored
    if (product.variants && product.variants.length > 0) {
      const keys = new Set<string>();
      product.variants.forEach((v) => {
        Object.keys(v.options || {}).forEach((k) => keys.add(k));
      });
      return Array.from(keys);
    }
    return [];
  }, [product]);

  const variants = product.variants;

  if (!variants || variants.length === 0 || optionNames.length === 0) {
    return null;
  }

  // Check if every option is selected
  const allOptionsSelected = optionNames.every((name) => !!selectedOptions[name]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "12px", marginBottom: "16px" }}>
      {optionNames.map((name) => {
        // Collect unique values for this option
        const uniqueValues: string[] = [];
        variants.forEach((v) => {
          const val = v.options[name];
          if (val && !uniqueValues.includes(val)) {
            uniqueValues.push(val);
          }
        });

        const currentValue = selectedOptions[name];

        return (
          <div key={name} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-ink)", textTransform: "capitalize" }}>
                {name}: <span style={{ fontWeight: 500, color: "var(--color-muted)" }}>{currentValue || "Select"}</span>
              </span>
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              {uniqueValues.map((val) => {
                const isSelected = currentValue === val;

                // Check if this option value is possible and available given other current selections
                let isCombinationAvailable = true;
                const hypotheticalOptions = { ...selectedOptions, [name]: val };
                const match = variants.find((v) => {
                  for (const [k, vVal] of Object.entries(hypotheticalOptions)) {
                    if (v.options[k] !== vVal) return false;
                  }
                  return true;
                });

                if (match) {
                  isCombinationAvailable = match.isAvailable && (match.stock === null || match.stock > 0);
                } else {
                  // If other options are already selected and no variant exists with this combo
                  const otherOptionsChosen = Object.keys(selectedOptions).filter((k) => k !== name).length > 0;
                  if (otherOptionsChosen) {
                    isCombinationAvailable = false;
                  }
                }

                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => onChangeOption(name, val)}
                    style={{
                      padding: "8px 16px",
                      borderRadius: "10px",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: "pointer",
                      border: isSelected ? `2px solid ${brandColor}` : "1px solid #DCE3D6",
                      backgroundColor: isSelected ? brandColor : isCombinationAvailable ? "#FFFFFF" : "#F3F4F6",
                      color: isSelected ? "#FFFFFF" : isCombinationAvailable ? "var(--color-ink)" : "#9CA3AF",
                      opacity: !isCombinationAvailable && !isSelected ? 0.6 : 1,
                      textDecoration: !isCombinationAvailable && !isSelected ? "line-through" : "none",
                      transition: "all 0.15s ease",
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    <span>{val}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Selected Combination Info: Price & Stock */}
      <div
        style={{
          background: "#F5F8EF",
          borderRadius: "14px",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          border: "1px solid #E5EADF"
        }}
      >
        <div>
          <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-muted)", letterSpacing: "0.5px" }}>
            {allOptionsSelected ? (selectedVariant?.label || "Selected Option") : "Choose options"}
          </div>
          <div style={{ fontSize: "18px", fontWeight: 800, color: brandColor, marginTop: "2px" }}>
            {selectedVariant
              ? formatPaise(selectedVariant.pricePaise)
              : `From ${formatPaise(product.pricePaise)}`}
          </div>
        </div>

        <div>
          {selectedVariant ? (
            !selectedVariant.isAvailable ? (
              <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                Unavailable
              </span>
            ) : selectedVariant.stock !== null && selectedVariant.stock <= 0 ? (
              <span style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                Out of Stock
              </span>
            ) : selectedVariant.stock !== null && selectedVariant.stock <= 5 ? (
              <span style={{ background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                Only {selectedVariant.stock} left
              </span>
            ) : (
              <span style={{ background: "#DCFCE7", color: "#166534", padding: "4px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                In Stock {selectedVariant.stock !== null ? `(${selectedVariant.stock})` : ""}
              </span>
            )
          ) : (
            <span style={{ fontSize: "12px", color: "var(--color-muted)", fontStyle: "italic" }}>
              Select {optionNames.filter((n) => !selectedOptions[n]).join(", ")}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
