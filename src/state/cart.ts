import { useState, useEffect, useCallback, useMemo } from "react";
import { Product } from "../types";

export interface CartLine {
  lineId: string;
  productId: string;
  variantId: null;
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
  product: Product;
  quantity: number;
  note?: string;
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
            qty: prod.stock
          });
          continue;
        }
      }

      reconciled.push(line);
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

  const addToCart = useCallback((product: Product, quantity = 1, note?: string) => {
    updateLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const existing = next[idx];
        const newQty = existing.qty + quantity;
        const maxStock = product.stock;
        const finalQty = maxStock !== null && maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
        next[idx] = {
          ...existing,
          qty: finalQty,
          note: note !== undefined ? note : existing.note
        };
        return next;
      }
      const initialQty = product.stock !== null && product.stock !== undefined ? Math.min(quantity, product.stock) : quantity;
      return [
        ...prev,
        {
          lineId: "line_" + Math.random().toString(36).substring(2, 9),
          productId: product.id,
          variantId: null,
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
        const idx = current.findIndex((l) => l.productId === prod.id);
        if (idx >= 0) {
          const existing = current[idx];
          const newQty = existing.qty + 1;
          const maxStock = prod.stock;
          const finalQty = maxStock !== null && maxStock !== undefined ? Math.min(newQty, maxStock) : newQty;
          current[idx] = { ...existing, qty: finalQty };
        } else {
          current.push({
            lineId: "line_" + Math.random().toString(36).substring(2, 9),
            productId: prod.id,
            variantId: null,
            qty: 1
          });
        }
      }
      return current;
    });
  }, [updateLines]);

  const updateCartQty = useCallback((productId: string, delta: number) => {
    updateLines((prev) => {
      return prev
        .map((line) => {
          if (line.productId === productId) {
            const nextQty = line.qty + delta;
            if (nextQty <= 0) return null;
            return { ...line, qty: nextQty };
          }
          return line;
        })
        .filter(Boolean) as CartLine[];
    });
  }, [updateLines]);

  const updateLineNote = useCallback((productId: string, note: string) => {
    updateLines((prev) => {
      return prev.map((line) => {
        if (line.productId === productId) {
          const clean = note.slice(0, 140);
          return { ...line, note: clean.trim() ? clean : undefined };
        }
        return line;
      });
    });
  }, [updateLines]);

  const removeFromCart = useCallback((productId: string) => {
    updateLines((prev) => prev.filter((l) => l.productId !== productId));
  }, [updateLines]);

  const clearCart = useCallback(() => {
    updateLines(() => []);
    setReconcileNotice(null);
  }, [updateLines]);

  // Rebuild cart for reorder
  const rebuildCart = useCallback((items: { productId: string; quantity: number; note?: string }[]) => {
    const prodMap = new Map<string, Product>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    const skipped: string[] = [];
    const newLines: CartLine[] = [];

    for (const it of items) {
      const prod = prodMap.get(it.productId);
      if (!prod || !prod.isAvailable || (prod.stock !== null && prod.stock <= 0)) {
        skipped.push(prod?.name || "An item");
        continue;
      }
      let finalQty = it.quantity;
      if (prod.stock !== null && prod.stock !== undefined) {
        finalQty = Math.min(finalQty, prod.stock);
      }
      if (finalQty > 0) {
        newLines.push({
          lineId: "line_" + Math.random().toString(36).substring(2, 9),
          productId: prod.id,
          variantId: null,
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

  // Enriched Cart Items using live product data
  const enrichedItems: EnrichedCartItem[] = useMemo(() => {
    const prodMap = new Map<string, Product>();
    for (const p of products) {
      prodMap.set(p.id, p);
    }

    const items: EnrichedCartItem[] = [];
    for (const line of lines) {
      const p = prodMap.get(line.productId);
      if (p) {
        items.push({
          lineId: line.lineId,
          product: p,
          quantity: line.qty,
          note: line.note,
          lineTotalPaise: p.pricePaise * line.qty
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
