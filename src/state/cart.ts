import { useState, useEffect, useCallback, useMemo } from "react";
import { Product, Variant } from "../types";

export interface CartLine {
  lineId: string;
  productId: string;
  variantId: string | null;
  variantLabel?: string;
  qty: number;
  note?: string;
}

export interface StoredCart {
  v: 1;
  lines: CartLine[];
  updatedAt: number;
}

export interface EnrichedCartItem {
  lineId: string;
  productId: string;
  product: Product;
  variantId: string | null;
  variantLabel?: string;
  quantity: number;
  note?: string;
  unitPricePaise: number;
  lineTotalPaise: number;
}

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

function getCartStorageKey(storeId: string): string {
  return `mintshelf_cart_${storeId}`;
}

function loadStoredCart(storeId: string): CartLine[] {
  if (!storeId) return [];
  try {
    const raw = localStorage.getItem(getCartStorageKey(storeId));
    if (!raw) return [];
    const parsed: StoredCart = JSON.parse(raw);
    if (!parsed || parsed.v !== 1 || !Array.isArray(parsed.lines)) {
      return [];
    }
    // Check 30-day expiry
    if (parsed.updatedAt && Date.now() - parsed.updatedAt > THIRTY_DAYS_MS) {
      localStorage.removeItem(getCartStorageKey(storeId));
      return [];
    }
    return parsed.lines;
  } catch {
    return [];
  }
}

function saveStoredCart(storeId: string, lines: CartLine[]) {
  if (!storeId) return;
  try {
    const payload: StoredCart = {
      v: 1,
      lines,
      updatedAt: Date.now()
    };
    localStorage.setItem(getCartStorageKey(storeId), JSON.stringify(payload));
  } catch (err) {
    console.warn("Failed to persist cart:", err);
  }
}

export function useCart(storeId: string, products: Product[] = []) {
  const [lines, setLines] = useState<CartLine[]>(() => loadStoredCart(storeId));
  const [reconcileNotice, setReconcileNotice] = useState<string | null>(null);

  // Sync state when storeId changes
  useEffect(() => {
    if (storeId) {
      setLines(loadStoredCart(storeId));
    }
  }, [storeId]);

  // Sync across browser tabs with the storage event
  useEffect(() => {
    if (!storeId) return;
    const handleStorage = (e: StorageEvent) => {
      if (e.key === getCartStorageKey(storeId)) {
        try {
          if (!e.newValue) {
            setLines([]);
            return;
          }
          const parsed: StoredCart = JSON.parse(e.newValue);
          if (parsed && parsed.v === 1 && Array.isArray(parsed.lines)) {
            setLines(parsed.lines);
          }
        } catch {}
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, [storeId]);

  // Reconcile on load when products are loaded
  useEffect(() => {
    if (products.length === 0 || lines.length === 0) return;

    const prodMap = new Map<string, Product>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    let modified = false;
    const droppedNames: string[] = [];
    const adjustedNames: string[] = [];

    const reconciled: CartLine[] = [];
    for (const line of lines) {
      const prod = prodMap.get(line.productId);
      if (!prod || !prod.isAvailable) {
        modified = true;
        droppedNames.push(prod?.name || "An item");
        continue;
      }

      const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;

      if (hasVariants) {
        if (!line.variantId) {
          // Product now has variants but line didn't specify one
          modified = true;
          droppedNames.push(prod.name);
          continue;
        }

        const v = prod.variants!.find(variant => variant.id === line.variantId);
        if (!v || !v.isAvailable || (v.stock !== null && v.stock <= 0)) {
          modified = true;
          droppedNames.push(`${prod.name} (${line.variantLabel || v?.label || "Variant"})`);
          continue;
        }

        if (v.stock !== null && v.stock !== undefined && line.qty > v.stock) {
          modified = true;
          adjustedNames.push(`${prod.name} (${v.label}) (adjusted to ${v.stock})`);
          reconciled.push({
            ...line,
            variantLabel: v.label,
            qty: v.stock
          });
          continue;
        }

        // Keep with up-to-date label
        reconciled.push({
          ...line,
          variantLabel: v.label
        });
      } else {
        if (prod.stock !== null && prod.stock !== undefined) {
          if (prod.stock <= 0) {
            modified = true;
            droppedNames.push(prod.name);
            continue;
          }
          if (line.qty > prod.stock) {
            modified = true;
            adjustedNames.push(`${prod.name} (adjusted to ${prod.stock})`);
            reconciled.push({
              ...line,
              variantId: null,
              variantLabel: undefined,
              qty: prod.stock
            });
            continue;
          }
        }

        reconciled.push({
          ...line,
          variantId: null,
          variantLabel: undefined
        });
      }
    }

    if (modified) {
      setLines(reconciled);
      saveStoredCart(storeId, reconciled);
      const parts: string[] = [];
      if (droppedNames.length > 0) {
        parts.push(`Unavailable items removed: ${droppedNames.join(", ")}`);
      }
      if (adjustedNames.length > 0) {
        parts.push(`Quantities adjusted for stock: ${adjustedNames.join(", ")}`);
      }
      setReconcileNotice(parts.join(". "));
    }
  }, [products, storeId]);

  // Helper to commit new lines to state + localStorage
  const updateLines = useCallback((updater: (prev: CartLine[]) => CartLine[]) => {
    setLines((prev) => {
      const next = updater(prev);
      saveStoredCart(storeId, next);
      return next;
    });
  }, [storeId]);

  const addToCart = useCallback((
    product: Product,
    quantity = 1,
    variantId?: string | null,
    variantLabel?: string,
    note?: string
  ) => {
    updateLines((prev) => {
      const vId = variantId || null;
      let targetVariant: Variant | undefined;
      if (vId && Array.isArray(product.variants)) {
        targetVariant = product.variants.find(v => v.id === vId);
      }
      const label = variantLabel || targetVariant?.label;

      const idx = prev.findIndex((l) => l.productId === product.id && (l.variantId || null) === vId);
      const maxStock = targetVariant ? targetVariant.stock : product.stock;

      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        const newQty = existing.qty + quantity;
        const finalQty = maxStock !== null && maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
        next[idx] = {
          ...existing,
          variantLabel: label || existing.variantLabel,
          qty: Math.max(1, finalQty),
          note: note !== undefined ? note : existing.note
        };
        return next;
      }

      const initialQty = maxStock !== null && maxStock !== undefined ? Math.min(quantity, maxStock) : quantity;
      return [
        ...prev,
        {
          lineId: "line_" + Math.random().toString(36).substring(2, 9),
          productId: product.id,
          variantId: vId,
          variantLabel: label,
          qty: Math.max(1, initialQty),
          note: note?.trim() || undefined
        }
      ];
    });
  }, [updateLines]);

  const addMultipleToCart = useCallback((prods: Product[]) => {
    updateLines((prev) => {
      let current = [...prev];
      for (const prod of prods) {
        // If product has variants, select the first available variant by default
        let vId: string | null = null;
        let vLabel: string | undefined = undefined;
        let maxStock = prod.stock;
        if (Array.isArray(prod.variants) && prod.variants.length > 0) {
          const avail = prod.variants.find(v => v.isAvailable && (v.stock === null || v.stock > 0)) || prod.variants[0];
          if (avail) {
            vId = avail.id;
            vLabel = avail.label;
            maxStock = avail.stock;
          }
        }

        const idx = current.findIndex((l) => l.productId === prod.id && (l.variantId || null) === vId);
        if (idx >= 0) {
          const existing = current[idx];
          const newQty = existing.qty + 1;
          const finalQty = maxStock !== null && maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
          current[idx] = { ...existing, qty: Math.max(1, finalQty) };
        } else {
          current.push({
            lineId: "line_" + Math.random().toString(36).substring(2, 9),
            productId: prod.id,
            variantId: vId,
            variantLabel: vLabel,
            qty: 1
          });
        }
      }
      return current;
    });
  }, [updateLines]);

  const updateCartQty = useCallback((lineIdOrProductId: string, delta: number, variantId?: string | null) => {
    updateLines((prev) => {
      return prev
        .map((line) => {
          const match = line.lineId === lineIdOrProductId || (line.productId === lineIdOrProductId && (variantId === undefined || (line.variantId || null) === (variantId || null)));
          if (match) {
            const nextQty = line.qty + delta;
            if (nextQty <= 0) return null;
            return { ...line, qty: nextQty };
          }
          return line;
        })
        .filter(Boolean) as CartLine[];
    });
  }, [updateLines]);

  const updateLineNote = useCallback((lineIdOrProductId: string, note: string, variantId?: string | null) => {
    updateLines((prev) => {
      return prev.map((line) => {
        const match = line.lineId === lineIdOrProductId || (line.productId === lineIdOrProductId && (variantId === undefined || (line.variantId || null) === (variantId || null)));
        if (match) {
          const clean = note.slice(0, 140);
          return { ...line, note: clean.trim() ? clean : undefined };
        }
        return line;
      });
    });
  }, [updateLines]);

  const removeFromCart = useCallback((lineIdOrProductId: string, variantId?: string | null) => {
    updateLines((prev) => prev.filter((l) => {
      if (l.lineId === lineIdOrProductId) return false;
      if (l.productId === lineIdOrProductId && (variantId === undefined || (l.variantId || null) === (variantId || null))) return false;
      return true;
    }));
  }, [updateLines]);

  const clearCart = useCallback(() => {
    updateLines(() => []);
    setReconcileNotice(null);
  }, [updateLines]);

  // Rebuild cart for reorder
  const rebuildCart = useCallback((items: { productId: string; quantity: number; variantId?: string; variantLabel?: string; note?: string }[]) => {
    const prodMap = new Map<string, Product>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    const skipped: string[] = [];
    const newLines: CartLine[] = [];

    for (const it of items) {
      const prod = prodMap.get(it.productId);
      if (!prod || !prod.isAvailable) {
        skipped.push(prod?.name || "An item");
        continue;
      }

      const hasVariants = Array.isArray(prod.variants) && prod.variants.length > 0;
      let finalQty = it.quantity;
      let vLabel = it.variantLabel;

      if (hasVariants) {
        if (!it.variantId) {
          skipped.push(prod.name);
          continue;
        }
        const v = prod.variants!.find(variant => variant.id === it.variantId);
        if (!v || !v.isAvailable || (v.stock !== null && v.stock <= 0)) {
          skipped.push(`${prod.name} (${it.variantLabel || v?.label || "Variant"})`);
          continue;
        }
        vLabel = v.label;
        if (v.stock !== null && v.stock !== undefined) {
          finalQty = Math.min(finalQty, v.stock);
        }
      } else {
        if (prod.stock !== null && prod.stock <= 0) {
          skipped.push(prod.name);
          continue;
        }
        if (prod.stock !== null && prod.stock !== undefined) {
          finalQty = Math.min(finalQty, prod.stock);
        }
      }

      if (finalQty > 0) {
        newLines.push({
          lineId: "line_" + Math.random().toString(36).substring(2, 9),
          productId: prod.id,
          variantId: it.variantId || null,
          variantLabel: vLabel,
          qty: finalQty,
          note: it.note ? it.note.slice(0, 140) : undefined
        });
      }
    }

    updateLines(() => newLines);
    if (skipped.length > 0) {
      setReconcileNotice(`Unavailable items could not be reordered: ${skipped.join(", ")}`);
    } else {
      setReconcileNotice(null);
    }
    return { successCount: newLines.length, skippedCount: skipped.length };
  }, [products, updateLines]);

  // Enriched Cart Items using live product and variant data
  const enrichedItems: EnrichedCartItem[] = useMemo(() => {
    const prodMap = new Map<string, Product>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    const items: EnrichedCartItem[] = [];
    for (const line of lines) {
      const p = prodMap.get(line.productId);
      if (p) {
        let unitPrice = p.pricePaise;
        let vLabel = line.variantLabel;

        if (line.variantId && Array.isArray(p.variants)) {
          const v = p.variants.find(variant => variant.id === line.variantId);
          if (v) {
            unitPrice = v.pricePaise;
            vLabel = v.label;
          }
        }

        items.push({
          lineId: line.lineId,
          productId: line.productId,
          product: p,
          variantId: line.variantId,
          variantLabel: vLabel,
          quantity: line.qty,
          note: line.note,
          unitPricePaise: unitPrice,
          lineTotalPaise: unitPrice * line.qty
        });
      }
    }
    return items;
  }, [lines, products]);

  const totalPaiseSubtotal = useMemo(() => {
    return enrichedItems.reduce((acc, item) => acc + item.lineTotalPaise, 0);
  }, [enrichedItems]);

  const totalItemCount = useMemo(() => {
    return enrichedItems.reduce((acc, item) => acc + item.quantity, 0);
  }, [enrichedItems]);

  return {
    lines,
    enrichedItems,
    totalPaiseSubtotal,
    totalItemCount,
    reconcileNotice,
    clearNotice: () => setReconcileNotice(null),
    addToCart,
    addMultipleToCart,
    updateCartQty,
    updateLineNote,
    removeFromCart,
    clearCart,
    rebuildCart
  };
}
