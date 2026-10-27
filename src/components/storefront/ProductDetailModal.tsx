import React, { useState, useEffect, useMemo } from "react";
import { Product, Variant } from "../../types";
import { formatPaise } from "../../utils/money";
import { ProductBadges } from "./Badges";
import { recordRecentlyViewed } from "./RecentlyViewed";
import { VariantPicker, findMatchingVariant } from "./VariantPicker";

interface Props {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, quantity?: number, variantId?: string | null, variantLabel?: string) => void;
  storeId?: string;
  brandColor?: string;
  categoryName?: string;
  extraContent?: React.ReactNode;
}

export const ProductDetailModal: React.FC<Props> = ({
  product,
  isOpen,
  onClose,
  onAddToCart,
  storeId,
  brandColor = "var(--color-forest)",
  categoryName,
  extraContent
}) => {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    setSelectedImageIndex(0);
    setSelectedOptions({});
    if (product && storeId) {
      recordRecentlyViewed(storeId, product.id);
    }
  }, [product?.id, storeId]);

  const hasVariants = Array.isArray(product?.variants) && product!.variants.length > 0;
  const optionNames = useMemo(() => {
    if (!product || !hasVariants) return [];
    if (product.optionNames && product.optionNames.length > 0) return product.optionNames;
    const s = new Set<string>();
    product.variants?.forEach(v => Object.keys(v.options || {}).forEach(k => s.add(k)));
    return Array.from(s);
  }, [product, hasVariants]);

  const selectedVariant = useMemo(() => {
    if (!product || !hasVariants) return null;
    return findMatchingVariant(product.variants, optionNames, selectedOptions);
  }, [product, hasVariants, optionNames, selectedOptions]);

  const allOptionsSelected = useMemo(() => {
    if (!hasVariants) return true;
    return optionNames.every(name => !!selectedOptions[name]);
  }, [hasVariants, optionNames, selectedOptions]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product) return null;

  const allImages: string[] = [];
  if (Array.isArray(product.images) && product.images.length > 0) {
    allImages.push(...product.images);
  } else if (product.image) {
    allImages.push(product.image);
  }

  const allThumbs: string[] = [];
  if (Array.isArray(product.thumbs) && product.thumbs.length > 0) {
    allThumbs.push(...product.thumbs);
  } else {
    allThumbs.push(...allImages);
  }

  const currentImage = allImages[selectedImageIndex] || product.image;
  const isOutOfStock = product.stock !== null && product.stock <= 0;

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1050,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        padding: "16px"
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          maxWidth: "540px",
          width: "100%",
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35)",
          display: "flex",
          flexDirection: "column",
          position: "relative"
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close details"
          style={{
            position: "absolute",
            top: "16px",
            right: "16px",
            width: "36px",
            height: "36px",
            borderRadius: "50%",
            backgroundColor: "rgba(255, 255, 255, 0.9)",
            border: "1px solid #E5EADF",
            color: "var(--color-ink)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
            fontSize: "16px",
            fontWeight: 700,
            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
          }}
        >
          ✕
        </button>

        {/* Gallery Section */}
        <div style={{ backgroundColor: "#F5F8EF", position: "relative" }}>
          <div style={{ width: "100%", height: "300px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            {currentImage ? (
              <img
                src={currentImage}
                alt={product.name}
                loading="eager"
                decoding="async"
                width={520}
                height={300}
                style={{ width: "100%", height: "100%", objectFit: "contain", background: "#FFFFFF", aspectRatio: "16/9" }}
              />
            ) : (
              <span style={{ fontSize: "64px" }}>📦</span>
            )}
          </div>

          {/* Thumbnail Strip */}
          {allImages.length > 1 && (
            <div style={{ display: "flex", gap: "8px", padding: "10px 16px", overflowX: "auto", backgroundColor: "#FFFFFF", borderBottom: "1px solid #E5EADF" }}>
              {allImages.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedImageIndex(idx)}
                  style={{
                    width: "52px",
                    height: "52px",
                    borderRadius: "8px",
                    overflow: "hidden",
                    border: idx === selectedImageIndex ? `2px solid ${brandColor}` : "1px solid #DCE3D6",
                    padding: 0,
                    background: "#F5F8EF",
                    cursor: "pointer",
                    flexShrink: 0
                  }}
                >
                  <img
                    src={allThumbs[idx] || img}
                    alt={`${product.name} ${idx + 1}`}
                    loading="lazy"
                    decoding="async"
                    width={52}
                    height={52}
                    style={{ width: "100%", height: "100%", objectFit: "cover", aspectRatio: "1/1" }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info Section */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "12px", flex: 1 }}>
          {categoryName && (
            <div style={{ fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-muted)", fontWeight: 700 }}>
              {categoryName}
            </div>
          )}

          <ProductBadges product={product} />

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <h2 style={{ fontSize: "22px", fontWeight: 800, margin: 0, color: "var(--color-ink)", lineHeight: 1.25 }}>
              {product.name}
            </h2>
            <div style={{ fontSize: "22px", fontWeight: 900, color: brandColor, whiteSpace: "nowrap" }}>
              {hasVariants
                ? selectedVariant
                  ? formatPaise(selectedVariant.pricePaise)
                  : `From ${formatPaise(product.pricePaise)}`
                : formatPaise(product.pricePaise)}
            </div>
          </div>

          {/* Stock Tag (for non-variant products) */}
          {!hasVariants && (
            <div>
              {isOutOfStock ? (
                <span style={{ display: "inline-block", background: "#FEE2E2", color: "#991B1B", padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                  Out of Stock
                </span>
              ) : product.stock !== null && product.stock <= 5 ? (
                <span style={{ display: "inline-block", background: "#FEF3C7", color: "#92400E", padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                  Only {product.stock} left in stock
                </span>
              ) : (
                <span style={{ display: "inline-block", background: "#DCFCE7", color: "#166534", padding: "3px 10px", borderRadius: "9999px", fontSize: "11px", fontWeight: 700 }}>
                  In Stock
                </span>
              )}
            </div>
          )}

          {/* Description */}
          {product.description && (
            <p style={{ fontSize: "14px", color: "var(--color-muted)", lineHeight: 1.6, margin: "6px 0 0" }}>
              {product.description}
            </p>
          )}

          {/* Variant Selector (if product has variants) */}
          {hasVariants && (
            <VariantPicker
              product={product}
              brandColor={brandColor}
              selectedOptions={selectedOptions}
              onChangeOption={(optName, val) => {
                setSelectedOptions(prev => ({ ...prev, [optName]: val }));
              }}
              selectedVariant={selectedVariant}
            />
          )}

          {/* Extra Content (Related Products, Bought Together) */}
          {extraContent}

          {/* Action Row */}
          {(() => {
            let canAdd = false;
            let buttonLabel = "";

            if (hasVariants) {
              if (!allOptionsSelected) {
                canAdd = false;
                buttonLabel = "Select Options";
              } else if (!selectedVariant || !selectedVariant.isAvailable) {
                canAdd = false;
                buttonLabel = "Unavailable";
              } else if (selectedVariant.stock !== null && selectedVariant.stock <= 0) {
                canAdd = false;
                buttonLabel = "Out of Stock";
              } else {
                canAdd = true;
                buttonLabel = `Add to Cart • ${formatPaise(selectedVariant.pricePaise)}`;
              }
            } else {
              canAdd = !isOutOfStock;
              buttonLabel = isOutOfStock ? "Out of Stock" : `Add to Cart • ${formatPaise(product.pricePaise)}`;
            }

            return (
              <div style={{ marginTop: "16px", paddingTop: "16px", borderTop: "1px solid #E5EADF", display: "flex", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (hasVariants) {
                      if (selectedVariant) {
                        onAddToCart(product, 1, selectedVariant.id, selectedVariant.label);
                        onClose();
                      }
                    } else {
                      onAddToCart(product, 1);
                      onClose();
                    }
                  }}
                  disabled={!canAdd}
                  style={{
                    flex: 1,
                    padding: "14px 20px",
                    borderRadius: "9999px",
                    backgroundColor: !canAdd ? "#E2E8F0" : brandColor,
                    color: !canAdd ? "#94A3B8" : "#FFFFFF",
                    fontSize: "15px",
                    fontWeight: 700,
                    border: "none",
                    cursor: !canAdd ? "not-allowed" : "pointer",
                    boxShadow: !canAdd ? "none" : "0 4px 14px rgba(0, 0, 0, 0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px"
                  }}
                >
                  <span>🛒</span>
                  <span>{buttonLabel}</span>
                </button>
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
};
