import React, { useState, useEffect } from "react";
import { SessionContext, Product, Category, Store, Variant, ProductTranslations } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";
import { formatPaise, parseRupeesToPaise } from "../../utils/money";
import { resizeImageToDataUrl, compressDataUrl, createThumbnail } from "../../utils/image";
import { apiEnhancePhoto, EnhancePhotoResult, apiBulkImportProducts, apiTranslateProduct } from "../../services/apiClient";
import {
  PRODUCT_TYPES,
  ProductType,
  PHOTO_STYLE_PRESETS,
  inferProductType
} from "../../config/photoStyles";

interface VariantRow {
  id: string;
  label: string;
  options: Record<string, string>;
  priceRupees: string;
  stockInput: string;
  isAvailable: boolean;
}

function generateVariantRows(
  optionNames: string[],
  optionValues: Record<string, string[]>,
  existingRows: VariantRow[],
  defaultPriceRupees: string
): VariantRow[] {
  const activeNames = optionNames.filter(n => n.trim() && (optionValues[n] || []).length > 0);
  if (activeNames.length === 0) return [];

  let combos: Record<string, string>[] = [{}];
  for (const name of activeNames) {
    const vals = optionValues[name] || [];
    const next: Record<string, string>[] = [];
    for (const c of combos) {
      for (const val of vals) {
        next.push({ ...c, [name]: val });
      }
    }
    combos = next;
  }

  const cappedCombos = combos.slice(0, 30);

  return cappedCombos.map((combo, idx) => {
    const label = activeNames.map(n => combo[n]).join(" / ");
    const existing = existingRows.find(r => {
      return activeNames.every(n => r.options[n] === combo[n]);
    });

    if (existing) {
      return {
        ...existing,
        label,
        options: combo
      };
    }

    return {
      id: `var_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      label,
      options: combo,
      priceRupees: defaultPriceRupees || "",
      stockInput: "",
      isAvailable: true
    };
  });
}

function parseCsv(text: string): any[] {
  const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/^["']|["']$/g, ""));
  const nameIdx = headers.findIndex(h => h === "name" || h === "title");
  const catIdx = headers.findIndex(h => h === "category" || h === "categoryid");
  const priceIdx = headers.findIndex(h => h === "price" || h === "pricepaise" || h === "rupees");
  const stockIdx = headers.findIndex(h => h === "stock" || h === "quantity");
  const descIdx = headers.findIndex(h => h === "description" || h === "desc");
  const availIdx = headers.findIndex(h => h === "isavailable" || h === "available");
  const idIdx = headers.findIndex(h => h === "id" || h === "productid");

  const rows: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const rawLine = lines[i];
    const cells: string[] = [];
    let cur = "";
    let inQuotes = false;
    for (let c = 0; c < rawLine.length; c++) {
      const char = rawLine[c];
      if (char === '"' || char === "'") {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        cells.push(cur.trim());
        cur = "";
      } else {
        cur += char;
      }
    }
    cells.push(cur.trim());

    const name = nameIdx >= 0 ? cells[nameIdx] : cells[0];
    if (!name) continue;

    let pricePaise = 0;
    if (priceIdx >= 0 && cells[priceIdx]) {
      const num = parseFloat(cells[priceIdx].replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) {
        pricePaise = Math.round(num * 100);
      }
    }

    let stock: number | null = null;
    if (stockIdx >= 0 && cells[stockIdx] !== "" && cells[stockIdx] !== undefined) {
      const parsedStock = parseInt(cells[stockIdx], 10);
      if (!isNaN(parsedStock)) stock = parsedStock;
    }

    rows.push({
      id: idIdx >= 0 ? cells[idIdx] || undefined : undefined,
      name,
      categoryId: catIdx >= 0 ? cells[catIdx] : undefined,
      description: descIdx >= 0 ? cells[descIdx] : "",
      pricePaise,
      stock,
      isAvailable: availIdx >= 0 ? cells[availIdx].toLowerCase() !== "false" && cells[availIdx] !== "0" : true
    });
  }
  return rows;
}

interface Props {
  session: SessionContext;
}

export const ProductsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilterCat, setActiveFilterCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Product Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Variants Builder State
  const [hasVariants, setHasVariants] = useState(false);
  const [optionNames, setOptionNames] = useState<string[]>(["Size"]);
  const [optionValues, setOptionValues] = useState<Record<string, string[]>>({ "Size": ["S", "M", "L"] });
  const [variantRows, setVariantRows] = useState<VariantRow[]>([]);
  const [chipInputs, setChipInputs] = useState<Record<string, string>>({});

  // Bulk Import State
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkParsedItems, setBulkParsedItems] = useState<any[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkImporting, setBulkImporting] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ processed: number; errors: { row: number; name?: string; error: string }[] } | null>(null);
  const [bulkError, setBulkError] = useState<string | null>(null);

  // Studio Photo Modal State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioTargetImage, setStudioTargetImage] = useState<string>("");
  const [studioTargetIndex, setStudioTargetIndex] = useState<number | null>(null);
  const [studioProductType, setStudioProductType] = useState<ProductType>("general");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioLoadingMessage, setStudioLoadingMessage] = useState("Setting up studio lights...");
  const [studioResult, setStudioResult] = useState<EnhancePhotoResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);

  // Translation State
  const [hiName, setHiName] = useState("");
  const [hiDescription, setHiDescription] = useState("");
  const [paName, setPaName] = useState("");
  const [paDescription, setPaDescription] = useState("");
  const [translating, setTranslating] = useState(false);
  const [translationQuota, setTranslationQuota] = useState<{ used: number; total: number } | null>(null);
  const [translationError, setTranslationError] = useState<string | null>(null);
  const [showTranslationSection, setShowTranslationSection] = useState(false);

  const catalogService = new CatalogService(defaultRepository);

  const loadData = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    const p = await defaultRepository.getProducts(session.storeId);
    const c = await defaultRepository.getCategories(session.storeId);
    setStore(s);
    setProducts(p);
    setCategories(c);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  const handleTranslateWithAi = async () => {
    if (!name.trim()) {
      alert("Please enter a Product Title first to translate.");
      return;
    }
    setTranslating(true);
    setTranslationError(null);
    try {
      const res = await apiTranslateProduct({ name, description });
      if (res.hi) {
        setHiName(res.hi.name || "");
        setHiDescription(res.hi.description || "");
      }
      if (res.pa) {
        setPaName(res.pa.name || "");
        setPaDescription(res.pa.description || "");
      }
      setTranslationQuota({ used: res.quotaUsed, total: res.quotaTotal });
      setShowTranslationSection(true);
    } catch (err: any) {
      setTranslationError(err.message || "Failed to translate product");
    } finally {
      setTranslating(false);
    }
  };

  // Rotate loading message during studio enhancement
  useEffect(() => {
    if (!studioLoading) return;
    const messages = [
      "Setting up studio lights...",
      "Preserving product details...",
      "Evaluating quality..."
    ];
    let idx = 0;
    setStudioLoadingMessage(messages[0]);
    const interval = setInterval(() => {
      idx = (idx + 1) % messages.length;
      setStudioLoadingMessage(messages[idx]);
    }, 2200);
    return () => clearInterval(interval);
  }, [studioLoading]);

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setCategoryId(categories[0]?.id || "");
    setDescription("");
    setPriceRupees("");
    setStockInput("");
    setIsAvailable(true);
    setImages([]);
    setError(null);
    setHasVariants(false);
    setOptionNames(["Size"]);
    setOptionValues({ "Size": ["S", "M", "L"] });
    setVariantRows([]);
    setChipInputs({});
    setHiName("");
    setHiDescription("");
    setPaName("");
    setPaDescription("");
    setTranslationError(null);
    setShowTranslationSection(false);
    setIsModalOpen(true);
  };

  const openEditModal = (p: Product) => {
    setEditingProduct(p);
    setName(p.name);
    setCategoryId(p.categoryId);
    setDescription(p.description);
    setPriceRupees((p.pricePaise / 100).toString());
    setStockInput(p.stock !== null ? p.stock.toString() : "");
    setIsAvailable(p.isAvailable);
    const currentImgs = Array.isArray(p.images) && p.images.length > 0 ? [...p.images] : (p.image ? [p.image] : []);
    setImages(currentImgs);
    setError(null);
    setHiName(p.translations?.hi?.name || "");
    setHiDescription(p.translations?.hi?.description || "");
    setPaName(p.translations?.pa?.name || "");
    setPaDescription(p.translations?.pa?.description || "");
    setShowTranslationSection(!!(p.translations?.hi || p.translations?.pa));
    setTranslationError(null);

    const prodHasVariants = Array.isArray(p.variants) && p.variants.length > 0;
    setHasVariants(prodHasVariants);

    if (prodHasVariants) {
      const names = p.optionNames && p.optionNames.length > 0 ? p.optionNames : [];
      const vals: Record<string, string[]> = {};
      names.forEach(n => { vals[n] = []; });
      p.variants!.forEach(v => {
        Object.entries(v.options || {}).forEach(([k, val]) => {
          if (!vals[k]) vals[k] = [];
          if (!vals[k].includes(val)) vals[k].push(val);
        });
      });
      const finalNames = names.length > 0 ? names : Object.keys(vals);
      setOptionNames(finalNames.length > 0 ? finalNames : ["Size"]);
      setOptionValues(vals);
      setVariantRows(p.variants!.map(v => ({
        id: v.id,
        label: v.label,
        options: v.options,
        priceRupees: (v.pricePaise / 100).toString(),
        stockInput: v.stock !== null && v.stock !== undefined ? v.stock.toString() : "",
        isAvailable: v.isAvailable
      })));
    } else {
      setOptionNames(["Size"]);
      setOptionValues({ "Size": ["S", "M", "L"] });
      setVariantRows([]);
    }
    setChipInputs({});
    setIsModalOpen(true);
  };

  const handleAddChip = (optName: string) => {
    const rawVal = chipInputs[optName] || "";
    const cleanVal = rawVal.trim();
    if (!cleanVal) return;
    const current = optionValues[optName] || [];
    if (current.includes(cleanVal)) {
      setChipInputs(prev => ({ ...prev, [optName]: "" }));
      return;
    }
    const nextVals = { ...optionValues, [optName]: [...current, cleanVal] };
    setOptionValues(nextVals);
    setChipInputs(prev => ({ ...prev, [optName]: "" }));
    setVariantRows(prev => generateVariantRows(optionNames, nextVals, prev, priceRupees));
  };

  const handleRemoveChip = (optName: string, valToRemove: string) => {
    const current = optionValues[optName] || [];
    const filtered = current.filter(v => v !== valToRemove);
    const nextVals = { ...optionValues, [optName]: filtered };
    setOptionValues(nextVals);
    setVariantRows(prev => generateVariantRows(optionNames, nextVals, prev, priceRupees));
  };

  const handleAddOptionName = () => {
    if (optionNames.length >= 2) return;
    const newName = optionNames.includes("Colour") ? "Style" : "Colour";
    const nextNames = [...optionNames, newName];
    const nextVals = { ...optionValues, [newName]: [] };
    setOptionNames(nextNames);
    setOptionValues(nextVals);
  };

  const handleRemoveOptionName = (idx: number) => {
    const toRemove = optionNames[idx];
    const nextNames = optionNames.filter((_, i) => i !== idx);
    const nextVals = { ...optionValues };
    delete nextVals[toRemove];
    setOptionNames(nextNames);
    setOptionValues(nextVals);
    setVariantRows(prev => generateVariantRows(nextNames, nextVals, prev, priceRupees));
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBulkFileName(file.name);
    setBulkError(null);
    setBulkResult(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const rows = parseCsv(text);
        if (rows.length === 0) {
          setBulkError("No valid product rows found in the CSV. Make sure you have a header row with name and price.");
          return;
        }
        setBulkParsedItems(rows);
      } catch (err: any) {
        setBulkError("Failed to parse CSV: " + err.message);
      }
    };
    reader.onerror = () => {
      setBulkError("Failed to read file.");
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleRunBulkImport = async () => {
    if (bulkParsedItems.length === 0) return;
    setBulkImporting(true);
    setBulkError(null);
    setBulkResult(null);

    try {
      const res = await apiBulkImportProducts(bulkParsedItems);
      setBulkResult(res);
      await loadData();
    } catch (err: any) {
      setBulkError(err.message || "Failed to import products");
    } finally {
      setBulkImporting(false);
    }
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (images.length >= 5) {
        alert("A product can have a maximum of 5 photos. Remove one to add a new photo.");
        e.target.value = "";
        return;
      }
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        setImages(prev => [...prev, dataUrl]);
      } catch (err: any) {
        alert("Failed to load image: " + err.message);
      } finally {
        e.target.value = "";
      }
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages(prev => prev.filter((_, i) => i !== indexToRemove));
  };

  const triggerEnhancement = async (imgUrl: string, idx: number | null, pType: ProductType) => {
    setStudioLoading(true);
    setStudioError(null);
    setStudioResult(null);

    try {
      let payload: any = {
        productType: pType,
        categoryId: categoryId || undefined
      };

      if (editingProduct?.id && idx !== null && !imgUrl.startsWith("data:")) {
        payload.productId = editingProduct.id;
        payload.imageIndex = idx;
      } else {
        payload.imageBase64 = imgUrl;
      }

      const result = await apiEnhancePhoto(payload);
      setStudioResult(result);
    } catch (err: any) {
      setStudioError(err.message || "Failed to enhance photo");
    } finally {
      setStudioLoading(false);
    }
  };

  const openStudioModal = (imgUrl: string, idx: number) => {
    const activeCategory = categories.find(c => c.id === categoryId);
    const inferred = inferProductType(activeCategory?.name, store?.brandType);
    setStudioTargetImage(imgUrl);
    setStudioTargetIndex(idx);
    setStudioProductType(inferred);
    setStudioResult(null);
    setStudioError(null);
    setIsStudioOpen(true);
    triggerEnhancement(imgUrl, idx, inferred);
  };

  const handleUseStudioPhoto = async () => {
    if (!studioResult) return;
    try {
      const rawDataUrl = `data:${studioResult.mimeType};base64,${studioResult.imageBase64}`;
      const compressed = await compressDataUrl(rawDataUrl, 1024, 0.85);

      const originalImg = studioTargetImage;
      const otherImgs = images.filter((_, i) => i !== studioTargetIndex);

      // Enhanced image goes to index 0 (cover), original is preserved as index 1
      let nextImages = [compressed, originalImg, ...otherImgs.filter(img => img !== originalImg)];

      if (nextImages.length > 5) {
        const proceed = window.confirm(
          `This product already has ${images.length} images. Adding this studio photo as cover will remove the last image. Continue?`
        );
        if (!proceed) return;
        nextImages = nextImages.slice(0, 5);
      }

      setImages(nextImages);
      setIsStudioOpen(false);
      setStudioResult(null);
    } catch (err: any) {
      alert("Error applying studio photo: " + err.message);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      if (hasVariants) {
        const activeNames = optionNames.filter(n => n.trim() && (optionValues[n] || []).length > 0);
        if (activeNames.length === 0) {
          throw new Error("Please add at least one option name with values (e.g. Size -> S, M, L).");
        }
        if (variantRows.length === 0) {
          throw new Error("No variants generated. Please check your option values.");
        }
        if (variantRows.length > 30) {
          throw new Error("A maximum of 30 variants is allowed per product.");
        }

        const variants: Variant[] = [];
        for (const r of variantRows) {
          if (!r.priceRupees || isNaN(parseFloat(r.priceRupees)) || parseFloat(r.priceRupees) < 0) {
            throw new Error(`Variant "${r.label}" requires a valid price >= 0.`);
          }
          const variantPricePaise = parseRupeesToPaise(r.priceRupees);
          const variantStock = r.stockInput.trim() === "" ? null : Math.max(0, parseInt(r.stockInput.trim(), 10));
          variants.push({
            id: r.id,
            label: r.label,
            options: r.options,
            pricePaise: variantPricePaise,
            stock: variantStock,
            isAvailable: r.isAvailable
          });
        }

        const avail = variants.filter(v => v.isAvailable);
        const pool = avail.length > 0 ? avail : variants;
        const lowestPricePaise = Math.min(...pool.map(v => v.pricePaise));

        // Generate 400px WebP thumbnails for all images
        const thumbs: string[] = [];
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          try {
            const t = await createThumbnail(img, 400, 0.75);
            thumbs.push(t);
          } catch {
            thumbs.push(img);
          }
        }

        const translations: ProductTranslations = {};
        if (hiName.trim() || hiDescription.trim()) {
          translations.hi = {
            name: hiName.trim() || name,
            description: hiDescription.trim() || description
          };
        }
        if (paName.trim() || paDescription.trim()) {
          translations.pa = {
            name: paName.trim() || name,
            description: paDescription.trim() || description
          };
        }

        await catalogService.saveProduct(session, {
          id: editingProduct?.id,
          categoryId,
          name,
          description,
          pricePaise: lowestPricePaise,
          stock: null,
          isAvailable,
          image: images[0] || undefined,
          images: images.length > 0 ? images : undefined,
          thumbs: thumbs.length > 0 ? thumbs : undefined,
          translations: Object.keys(translations).length > 0 ? translations : undefined,
          optionNames: activeNames,
          variants
        });
      } else {
        const pricePaise = parseRupeesToPaise(priceRupees);
        const stock = stockInput.trim() === "" ? null : parseInt(stockInput.trim(), 10);

        // Generate 400px WebP thumbnails for all images
        const thumbs: string[] = [];
        for (let i = 0; i < images.length; i++) {
          const img = images[i];
          try {
            const t = await createThumbnail(img, 400, 0.75);
            thumbs.push(t);
          } catch {
            thumbs.push(img);
          }
        }

        const translations: ProductTranslations = {};
        if (hiName.trim() || hiDescription.trim()) {
          translations.hi = {
            name: hiName.trim() || name,
            description: hiDescription.trim() || description
          };
        }
        if (paName.trim() || paDescription.trim()) {
          translations.pa = {
            name: paName.trim() || name,
            description: paDescription.trim() || description
          };
        }

        await catalogService.saveProduct(session, {
          id: editingProduct?.id,
          categoryId,
          name,
          description,
          pricePaise,
          stock,
          isAvailable,
          image: images[0] || undefined,
          images: images.length > 0 ? images : undefined,
          thumbs: thumbs.length > 0 ? thumbs : undefined,
          translations: Object.keys(translations).length > 0 ? translations : undefined,
          optionNames: undefined,
          variants: undefined
        });
      }

      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to save product");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (productId: string) => {
    if (!confirm("Delete this product from your catalogue?")) return;
    try {
      await catalogService.deleteProduct(session, productId);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to delete");
    }
  };

  const handleQuickToggleAvailability = async (p: Product) => {
    try {
      await catalogService.saveProduct(session, {
        ...p,
        isAvailable: !p.isAvailable
      });
      loadData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const filtered = products
    .filter(p => !activeFilterCat || p.categoryId === activeFilterCat)
    .filter(p => !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.description.toLowerCase().includes(searchQuery.toLowerCase()));

  const categoryMap = new Map(categories.map(c => [c.id, c.name]));

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Products & Inventory</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Add, update prices in INR (stored as integer paise), and manage stock.
          </p>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <button
            onClick={() => {
              setBulkParsedItems([]);
              setBulkFileName("");
              setBulkResult(null);
              setBulkError(null);
              setIsBulkModalOpen(true);
            }}
            style={{ padding: "10px 18px", borderRadius: "9999px", background: "#FFFFFF", color: store?.brandColor || "var(--color-forest)", border: `1.5px solid ${store?.brandColor || "var(--color-forest)"}`, fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
          >
            <span>📄</span> Bulk Import (CSV)
          </button>
          <button
            onClick={openAddModal}
            style={{ padding: "10px 20px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
          >
            + Add New Product
          </button>
        </div>
      </div>

      {/* Filters & Search */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <input
          placeholder="Search products..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", minWidth: "240px" }}
        />
        <div style={{ display: "flex", gap: "6px", overflowX: "auto" }}>
          <button
            onClick={() => setActiveFilterCat(null)}
            style={{ padding: "6px 12px", borderRadius: "9999px", background: activeFilterCat === null ? (store?.brandColor || "var(--color-forest)") : "#FFFFFF", color: activeFilterCat === null ? "#FFF" : "var(--color-ink)", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
          >
            All ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveFilterCat(c.id)}
              style={{ padding: "6px 12px", borderRadius: "9999px", background: activeFilterCat === c.id ? (store?.brandColor || "var(--color-forest)") : "#FFFFFF", color: activeFilterCat === c.id ? "#FFF" : "var(--color-ink)", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Products Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        {filtered.length === 0 ? (
          <div style={{ padding: "48px 20px", textAlign: "center", color: "var(--color-muted)" }}>
            No products match your criteria.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 20px" }}>Item</th>
                <th style={{ padding: "14px 20px" }}>Category</th>
                <th style={{ padding: "14px 20px" }}>Price</th>
                <th style={{ padding: "14px 20px" }}>Stock</th>
                <th style={{ padding: "14px 20px" }}>Available</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(p => {
                const coverImg = p.image || (p.images && p.images[0]);
                const prodHasVariants = Array.isArray(p.variants) && p.variants.length > 0;
                return (
                  <tr key={p.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "#F5F8EF", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                          {coverImg ? (
                            <img src={coverImg} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <span>📦</span>
                          )}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700 }}>{p.name}</div>
                          <div style={{ fontSize: "12px", color: "var(--color-muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.description}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: "14px 20px", color: "var(--color-muted)", fontSize: "13px" }}>
                      {categoryMap.get(p.categoryId) || "Uncategorized"}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <div style={{ fontWeight: 700, color: store?.brandColor }}>
                        {prodHasVariants ? `From ${formatPaise(p.pricePaise)}` : formatPaise(p.pricePaise)}
                      </div>
                      {prodHasVariants && (
                        <span style={{ display: "inline-block", background: "#F0F4EC", color: "#374151", fontSize: "11px", fontWeight: 600, padding: "2px 6px", borderRadius: "4px", marginTop: "3px" }}>
                          {p.variants!.length} variants
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {prodHasVariants ? (
                        <div>
                          {p.variants!.some(v => v.stock !== null) ? (
                            <span style={{ fontWeight: 600, color: "var(--color-ink)", fontSize: "13px" }}>
                              {p.variants!.reduce((acc, v) => acc + (v.stock || 0), 0)} total
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>Unlimited</span>
                          )}
                        </div>
                      ) : p.stock === null ? (
                        <span style={{ color: "var(--color-muted)", fontSize: "12px" }}>Unlimited</span>
                      ) : (
                        <span style={{ fontWeight: 600, color: p.stock <= 5 ? "#DC2626" : "var(--color-ink)" }}>
                          {p.stock} units
                        </span>
                      )}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <button
                        onClick={() => handleQuickToggleAvailability(p)}
                        style={{
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: p.isAvailable ? "#DCFCE7" : "#F3F4F6",
                          color: p.isAvailable ? "#166534" : "#6B7280",
                          cursor: "pointer"
                        }}
                      >
                        {p.isAvailable ? "Active" : "Hidden"}
                      </button>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => openEditModal(p)}
                        style={{ background: "none", color: store?.brandColor, fontWeight: 600, fontSize: "13px", marginRight: "12px", cursor: "pointer" }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p.id)}
                        style={{ background: "none", color: "#DC2626", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Product Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "560px", width: "100%", padding: "32px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>
              {editingProduct ? "Edit Product" : "New Product"}
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Configure product details, multi-angle photos, and studio enhancement.
            </p>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Product Title</label>
                <input
                  required
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="e.g. Sourdough Loaf"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Category</label>
                <select
                  required
                  value={categoryId}
                  onChange={e => setCategoryId(e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    {hasVariants ? "Default Base Price (₹)" : "Price in Rupees (₹)"}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required={!hasVariants}
                    value={priceRupees}
                    onChange={e => {
                      const val = e.target.value;
                      setPriceRupees(val);
                      if (hasVariants && variantRows.length > 0) {
                        setVariantRows(prev => prev.map(r => (!r.priceRupees ? { ...r, priceRupees: val } : r)));
                      }
                    }}
                    placeholder={hasVariants ? "Default for variants" : "e.g. 250"}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                  />
                  {hasVariants && (
                    <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>Shows as "From ₹X" on storefront</span>
                  )}
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                    {hasVariants ? "Stock" : "Stock (blank = unlimited)"}
                  </label>
                  <input
                    type="number"
                    disabled={hasVariants}
                    value={hasVariants ? "" : stockInput}
                    onChange={e => setStockInput(e.target.value)}
                    placeholder={hasVariants ? "Set per variant below" : "e.g. 15"}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", background: hasVariants ? "#F5F8EF" : "#FFFFFF" }}
                  />
                  {hasVariants && (
                    <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>Managed per variant below</span>
                  )}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Notes, ingredients, sizing or materials..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>

              {/* Options & Variants Builder Section */}
              <div style={{ borderTop: "1px solid #E5EADF", paddingTop: "14px", marginTop: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-ink)" }}>Product Options & Variants</span>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                      Configure sizes, colours or styles with individual prices and stock (max 30 variants).
                    </p>
                  </div>
                  <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 700 }}>
                    <input
                      type="checkbox"
                      checked={hasVariants}
                      onChange={e => {
                        const next = e.target.checked;
                        setHasVariants(next);
                        if (next && variantRows.length === 0) {
                          const defName = optionNames[0] || "Size";
                          const defVals = (optionValues[defName] && optionValues[defName].length > 0) ? optionValues[defName] : ["S", "M", "L"];
                          const nextNames = optionNames.length > 0 ? optionNames : [defName];
                          const nextVals = { ...optionValues, [defName]: defVals };
                          setOptionNames(nextNames);
                          setOptionValues(nextVals);
                          setVariantRows(generateVariantRows(nextNames, nextVals, [], priceRupees));
                        }
                      }}
                    />
                    <span>Has Variants</span>
                  </label>
                </div>

                {hasVariants && (
                  <div style={{ marginTop: "12px", background: "#F9FAF7", padding: "14px", borderRadius: "14px", border: "1px solid #E5EADF", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Option names & chips */}
                    {optionNames.map((optName, idx) => {
                      const chips = optionValues[optName] || [];
                      const curInput = chipInputs[optName] || "";
                      return (
                        <div key={idx} style={{ background: "#FFFFFF", padding: "12px", borderRadius: "10px", border: "1px solid #E5EADF" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                              <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase" }}>Option {idx + 1}:</span>
                              <input
                                value={optName}
                                placeholder="e.g. Size or Colour"
                                onChange={e => {
                                  const newName = e.target.value;
                                  const nextNames = [...optionNames];
                                  nextNames[idx] = newName;
                                  const nextVals = { ...optionValues };
                                  if (optName !== newName) {
                                    nextVals[newName] = nextVals[optName] || [];
                                    delete nextVals[optName];
                                  }
                                  setOptionNames(nextNames);
                                  setOptionValues(nextVals);
                                  setVariantRows(prev => generateVariantRows(nextNames, nextVals, prev, priceRupees));
                                }}
                                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600 }}
                              />
                            </div>
                            {optionNames.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveOptionName(idx)}
                                style={{ background: "none", color: "#DC2626", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer" }}
                              >
                                Remove Option
                              </button>
                            )}
                          </div>

                          {/* Chips */}
                          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                            {chips.map(val => (
                              <span
                                key={val}
                                style={{
                                  background: "#F0F4EC",
                                  color: "var(--color-ink)",
                                  padding: "4px 8px",
                                  borderRadius: "9999px",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: "6px"
                                }}
                              >
                                {val}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveChip(optName, val)}
                                  style={{ background: "none", border: "none", color: "var(--color-muted)", cursor: "pointer", fontSize: "12px", padding: 0 }}
                                >
                                  ✕
                                </button>
                              </span>
                            ))}
                            <div style={{ display: "inline-flex", gap: "4px", alignItems: "center" }}>
                              <input
                                placeholder="Add value (e.g. S)..."
                                value={curInput}
                                onChange={e => setChipInputs(prev => ({ ...prev, [optName]: e.target.value }))}
                                onKeyDown={e => {
                                  if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAddChip(optName);
                                  }
                                }}
                                style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px", width: "130px" }}
                              />
                              <button
                                type="button"
                                onClick={() => handleAddChip(optName)}
                                style={{ padding: "4px 8px", borderRadius: "6px", background: "#E5EADF", fontSize: "11px", fontWeight: 600, border: "none", cursor: "pointer" }}
                              >
                                + Add
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {optionNames.length < 2 && (
                      <button
                        type="button"
                        onClick={handleAddOptionName}
                        style={{ alignSelf: "flex-start", padding: "6px 12px", borderRadius: "8px", background: "#FFFFFF", border: "1px dashed #B8C7AE", fontSize: "12px", fontWeight: 600, color: store?.brandColor || "var(--color-forest)", cursor: "pointer" }}
                      >
                        + Add 2nd Option (e.g. Colour)
                      </button>
                    )}

                    {/* Variant Matrix Table */}
                    {variantRows.length > 0 && (
                      <div style={{ marginTop: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                          <span style={{ fontSize: "12px", fontWeight: 700 }}>
                            Variant Matrix ({variantRows.length} of max 30)
                          </span>
                          <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>
                            Blank stock = unlimited
                          </span>
                        </div>

                        <div style={{ background: "#FFFFFF", borderRadius: "10px", border: "1px solid #E5EADF", overflowX: "auto", maxHeight: "240px" }}>
                          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px" }}>
                            <thead>
                              <tr style={{ background: "#F5F8EF", borderBottom: "1px solid #E5EADF", color: "var(--color-muted)" }}>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Variant</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Price (₹)</th>
                                <th style={{ padding: "8px 10px", textAlign: "left" }}>Stock</th>
                                <th style={{ padding: "8px 10px", textAlign: "center" }}>Active</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variantRows.map((row, rIdx) => (
                                <tr key={row.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                                  <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.label}</td>
                                  <td style={{ padding: "8px 10px" }}>
                                    <input
                                      type="number"
                                      step="0.01"
                                      required
                                      value={row.priceRupees}
                                      placeholder="Price ₹"
                                      onChange={e => {
                                        const val = e.target.value;
                                        setVariantRows(prev => {
                                          const next = [...prev];
                                          next[rIdx] = { ...next[rIdx], priceRupees: val };
                                          return next;
                                        });
                                      }}
                                      style={{ width: "90px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                                    />
                                  </td>
                                  <td style={{ padding: "8px 10px" }}>
                                    <input
                                      type="number"
                                      value={row.stockInput}
                                      placeholder="Unlimited"
                                      onChange={e => {
                                        const val = e.target.value;
                                        setVariantRows(prev => {
                                          const next = [...prev];
                                          next[rIdx] = { ...next[rIdx], stockInput: val };
                                          return next;
                                        });
                                      }}
                                      style={{ width: "85px", padding: "4px 6px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                                    />
                                  </td>
                                  <td style={{ padding: "8px 10px", textAlign: "center" }}>
                                    <input
                                      type="checkbox"
                                      checked={row.isAvailable}
                                      onChange={e => {
                                        const val = e.target.checked;
                                        setVariantRows(prev => {
                                          const next = [...prev];
                                          next[rIdx] = { ...next[rIdx], isAvailable: val };
                                          return next;
                                        });
                                      }}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Multilingual Catalogue Section (Hindi & Punjabi) */}
              <div style={{ borderTop: "1px solid #E5EADF", paddingTop: "14px", marginTop: "2px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-ink)" }}>Multilingual Catalogue (Hindi & Punjabi)</span>
                    <p style={{ fontSize: "11px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                      Localize title and description for Hindi & Punjabi regional shoppers.
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <button
                      type="button"
                      onClick={handleTranslateWithAi}
                      disabled={translating}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        background: "#EEF8F1",
                        color: "#166534",
                        border: "1px solid #BBF7D0",
                        fontSize: "12px",
                        fontWeight: 700,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px"
                      }}
                    >
                      <span>🌐</span> {translating ? "Translating..." : "Translate with AI"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowTranslationSection(!showTranslationSection)}
                      style={{ background: "none", border: "none", fontSize: "11px", color: "var(--color-muted)", cursor: "pointer", textDecoration: "underline" }}
                    >
                      {showTranslationSection ? "Hide" : "Edit manually"}
                    </button>
                  </div>
                </div>

                {translationError && (
                  <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "8px 12px", borderRadius: "8px", fontSize: "12px", marginTop: "8px" }}>
                    {translationError}
                  </div>
                )}

                {translationQuota && (
                  <div style={{ fontSize: "11px", color: "#166534", marginTop: "6px" }}>
                    AI Quota used: {translationQuota.used}/{translationQuota.total} today
                  </div>
                )}

                {showTranslationSection && (
                  <div style={{ marginTop: "12px", background: "#F9FAF7", padding: "14px", borderRadius: "14px", border: "1px solid #E5EADF", display: "flex", flexDirection: "column", gap: "12px" }}>
                    {/* Hindi Section */}
                    <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "10px", border: "1px solid #E5EADF" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#B45309", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🇮🇳</span> हिन्दी (Hindi)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "2px" }}>शीर्षक (Title in Hindi)</label>
                          <input
                            value={hiName}
                            onChange={e => setHiName(e.target.value)}
                            placeholder="उत्पाद का नाम..."
                            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "2px" }}>विवरण (Description in Hindi)</label>
                          <textarea
                            rows={2}
                            value={hiDescription}
                            onChange={e => setHiDescription(e.target.value)}
                            placeholder="उत्पाद का विवरण..."
                            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                          />
                        </div>
                      </div>
                    </div>

                    {/* Punjabi Section */}
                    <div style={{ background: "#FFFFFF", padding: "12px", borderRadius: "10px", border: "1px solid #E5EADF" }}>
                      <div style={{ fontSize: "12px", fontWeight: 700, color: "#1D4ED8", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                        <span>🌾</span> ਪੰਜਾਬੀ (Punjabi)
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "2px" }}>ਸਿਰਲੇਖ (Title in Punjabi)</label>
                          <input
                            value={paName}
                            onChange={e => setPaName(e.target.value)}
                            placeholder="ਉਤਪਾਦ ਦਾ ਨਾਮ..."
                            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: "11px", color: "var(--color-muted)", marginBottom: "2px" }}>ਵੇਰਵਾ (Description in Punjabi)</label>
                          <textarea
                            rows={2}
                            value={paDescription}
                            onChange={e => setPaDescription(e.target.value)}
                            placeholder="ਉਤਪਾਦ ਦਾ ਵੇਰਵਾ..."
                            style={{ width: "100%", padding: "6px 10px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Product Photos Section */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Product Photos ({images.length}/5)</label>
                  <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>First photo is the storefront cover</span>
                </div>

                {images.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(105px, 1fr))", gap: "10px", marginBottom: "12px" }}>
                    {images.map((img, idx) => (
                      <div
                        key={idx}
                        style={{
                          borderRadius: "12px",
                          border: idx === 0 ? `2px solid ${store?.brandColor || "var(--color-forest)"}` : "1px solid #DCE3D6",
                          background: "#F9FAF7",
                          padding: "6px",
                          position: "relative",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center"
                        }}
                      >
                        <div style={{ width: "100%", height: "85px", borderRadius: "8px", overflow: "hidden", position: "relative" }}>
                          <img src={img} alt={`Product ${idx + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          {idx === 0 && (
                            <span style={{ position: "absolute", top: "4px", left: "4px", background: "rgba(0,0,0,0.75)", color: "#FFF", fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px" }}>
                              COVER
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            title="Remove photo"
                            style={{ position: "absolute", top: "4px", right: "4px", width: "18px", height: "18px", borderRadius: "50%", background: "rgba(0,0,0,0.6)", color: "#FFF", border: "none", fontSize: "10px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
                          >
                            ✕
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => openStudioModal(img, idx)}
                          style={{
                            marginTop: "6px",
                            width: "100%",
                            padding: "4px 6px",
                            borderRadius: "6px",
                            background: "#EEF8F1",
                            color: "#166534",
                            border: "1px solid #BBF7D0",
                            fontSize: "11px",
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: "4px"
                          }}
                        >
                          <span>✨</span> Studio
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {images.length < 5 && (
                  <div style={{ marginTop: "4px" }}>
                    <label style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", borderRadius: "10px", background: "#F0F4EC", color: "var(--color-ink)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                      <span>📷</span> Pick / Upload Photo
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleImageFileChange}
                        style={{ display: "none" }}
                      />
                    </label>
                  </div>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "4px" }}>
                <input
                  type="checkbox"
                  id="availCheck"
                  checked={isAvailable}
                  onChange={e => setIsAvailable(e.target.checked)}
                />
                <label htmlFor="availCheck" style={{ fontSize: "13px", fontWeight: 500 }}>Available on storefront catalogue</label>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Studio Photo Modal */}
      {isStudioOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.65)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "680px", width: "100%", padding: "28px", maxHeight: "92vh", overflowY: "auto", boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>✨</span> Studio Photo Enhancement
                </h2>
                <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "4px 0 0" }}>
                  Professional plain studio backdrop, calibrated lighting, and 100% detail preservation.
                </p>
              </div>
              {studioResult && (
                <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#166534", fontSize: "11px", fontWeight: 600, padding: "4px 10px", borderRadius: "9999px" }}>
                  Quota: {studioResult.quotaUsed}/{studioResult.quotaTotal} today
                </div>
              )}
            </div>

            {/* Product Type Preset Selector */}
            <div style={{ marginBottom: "18px", background: "#F9FAF7", padding: "12px 16px", borderRadius: "14px", border: "1px solid #E5EADF" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 700, marginBottom: "6px", color: "var(--color-ink)" }}>
                Photography Style Preset:
              </label>
              <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                <select
                  value={studioProductType}
                  disabled={studioLoading}
                  onChange={e => {
                    const newType = e.target.value as ProductType;
                    setStudioProductType(newType);
                    triggerEnhancement(studioTargetImage, studioTargetIndex, newType);
                  }}
                  style={{ flex: 1, padding: "8px 12px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", background: "#FFFFFF", fontWeight: 600 }}
                >
                  {PRODUCT_TYPES.map(pt => (
                    <option key={pt} value={pt}>
                      {PHOTO_STYLE_PRESETS[pt].label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={studioLoading}
                  onClick={() => triggerEnhancement(studioTargetImage, studioTargetIndex, studioProductType)}
                  style={{ padding: "8px 14px", borderRadius: "10px", background: "#FFFFFF", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600, cursor: studioLoading ? "not-allowed" : "pointer" }}
                >
                  {studioLoading ? "Enhancing..." : "🔄 Re-apply"}
                </button>
              </div>
              <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "6px" }}>
                Preset setup: {PHOTO_STYLE_PRESETS[studioProductType].background} • {PHOTO_STYLE_PRESETS[studioProductType].cameraAngle}
              </div>
            </div>

            {/* Error Banner */}
            {studioError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", marginBottom: "16px", border: "1px solid #FECACA" }}>
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>Enhancement Note</div>
                <div>{studioError}</div>
              </div>
            )}

            {/* Warning Banner (Quality Gate Difference Notice) */}
            {studioResult?.warning && (
              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", marginBottom: "16px" }}>
                <div style={{ fontWeight: 700, marginBottom: "2px" }}>⚠️ Visual Check Notice</div>
                <div>
                  The AI noticed slight differences: {studioResult.differences.join("; ") || "Minor variance in details"}. Please verify before saving.
                </div>
              </div>
            )}

            {/* Side-by-Side Comparison */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
              {/* Original Photo */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Original Photo
                </div>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "16px", overflow: "hidden", background: "#F5F8EF", border: "1px solid #DCE3D6", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <img
                    src={studioTargetImage}
                    alt="Original"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />
                </div>
              </div>

              {/* Studio Photo */}
              <div>
                <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--color-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Studio Photo
                </div>
                <div style={{ width: "100%", aspectRatio: "1/1", borderRadius: "16px", overflow: "hidden", background: "#FFFFFF", border: "1px solid #DCE3D6", display: "flex", alignItems: "center", justifyContent: "center", position: "relative" }}>
                  {studioLoading ? (
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "20px", textAlign: "center" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          border: "3px solid #E5EADF",
                          borderTop: `3px solid ${store?.brandColor || "var(--color-forest)"}`,
                          borderRadius: "50%",
                          animation: "spin 1s linear infinite",
                          marginBottom: "12px"
                        }}
                      />
                      <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                      <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--color-ink)" }}>
                        {studioLoadingMessage}
                      </div>
                      <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "4px" }}>
                        Generating 1024x1024 studio shot
                      </div>
                    </div>
                  ) : studioResult ? (
                    <img
                      src={`data:${studioResult.mimeType};base64,${studioResult.imageBase64}`}
                      alt="Studio Enhanced"
                      style={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ color: "var(--color-muted)", fontSize: "13px", textAlign: "center", padding: "20px" }}>
                      Studio photo will appear here
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => {
                  setIsStudioOpen(false);
                  setStudioResult(null);
                }}
                disabled={studioLoading}
                style={{ padding: "10px 18px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "13px", cursor: studioLoading ? "not-allowed" : "pointer" }}
              >
                Discard
              </button>

              <button
                type="button"
                disabled={studioLoading}
                onClick={() => triggerEnhancement(studioTargetImage, studioTargetIndex, studioProductType)}
                style={{ padding: "10px 18px", borderRadius: "9999px", background: "#FFFFFF", border: "1px solid #DCE3D6", color: "var(--color-ink)", fontWeight: 600, fontSize: "13px", cursor: studioLoading ? "not-allowed" : "pointer" }}
              >
                {studioLoading ? "Working..." : "Regenerate"}
              </button>

              <button
                type="button"
                disabled={studioLoading || !studioResult}
                onClick={handleUseStudioPhoto}
                style={{
                  padding: "10px 22px",
                  borderRadius: "9999px",
                  background: (!studioLoading && studioResult) ? (store?.brandColor || "var(--color-forest)") : "#CBD5E1",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "13px",
                  cursor: (!studioLoading && studioResult) ? "pointer" : "not-allowed"
                }}
              >
                Use this photo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk CSV Import Modal */}
      {isBulkModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1100, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "560px", width: "100%", padding: "28px", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
                  <span>📄</span> Bulk Import Products (CSV)
                </h2>
                <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "4px 0 0" }}>
                  Upload a CSV file with columns: <code>name, category, price, stock, description, isAvailable</code>
                </p>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                style={{ background: "none", border: "none", fontSize: "20px", color: "var(--color-muted)", cursor: "pointer", padding: "2px" }}
              >
                ✕
              </button>
            </div>

            {/* Format Hint */}
            <div style={{ background: "#F5F8EF", padding: "12px 16px", borderRadius: "12px", fontSize: "12px", color: "var(--color-ink)", marginBottom: "16px" }}>
              <div style={{ fontWeight: 700, marginBottom: "4px" }}>Sample CSV Format:</div>
              <code style={{ fontSize: "11px", display: "block", background: "#FFFFFF", padding: "8px", borderRadius: "6px", border: "1px solid #DCE3D6", overflowX: "auto" }}>
                name,category,price,stock,description,isAvailable<br />
                Classic Cotton T-Shirt,Apparel,499,50,Premium crewneck,true<br />
                Cold Brew Coffee,Beverages,180,,Single origin steep,true
              </code>
              <div style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "6px" }}>
                Note: Products with variants cannot be modified through bulk import and must be managed in the dashboard.
              </div>
            </div>

            {/* File Input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "6px" }}>Choose CSV File</label>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleCsvFileChange}
                style={{ fontSize: "13px" }}
              />
              {bulkFileName && (
                <div style={{ fontSize: "12px", color: "var(--color-forest)", fontWeight: 600, marginTop: "4px" }}>
                  Selected: {bulkFileName} ({bulkParsedItems.length} rows parsed)
                </div>
              )}
            </div>

            {/* Error banner */}
            {bulkError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "14px" }}>
                {bulkError}
              </div>
            )}

            {/* Result banner */}
            {bulkResult && (
              <div style={{ marginBottom: "16px" }}>
                <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", fontWeight: 600, marginBottom: bulkResult.errors.length > 0 ? "8px" : 0 }}>
                  ✓ Successfully processed {bulkResult.processed} products!
                </div>
                {bulkResult.errors.length > 0 && (
                  <div style={{ background: "#FEF3C7", color: "#92400E", padding: "10px 14px", borderRadius: "10px", fontSize: "12px" }}>
                    <div style={{ fontWeight: 700, marginBottom: "4px" }}>
                      {bulkResult.errors.length} skipped with warnings/errors:
                    </div>
                    <ul style={{ margin: 0, paddingLeft: "16px" }}>
                      {bulkResult.errors.map((e, idx) => (
                        <li key={idx}>
                          Row {e.row}{e.name ? ` (${e.name})` : ""}: {e.error}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "20px" }}>
              <button
                type="button"
                disabled={bulkImporting || bulkParsedItems.length === 0}
                onClick={handleRunBulkImport}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: "9999px",
                  background: (bulkParsedItems.length > 0 && !bulkImporting) ? (store?.brandColor || "var(--color-forest)") : "#CBD5E1",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: (bulkParsedItems.length > 0 && !bulkImporting) ? "pointer" : "not-allowed"
                }}
              >
                {bulkImporting ? "Importing Products..." : `Import ${bulkParsedItems.length > 0 ? `${bulkParsedItems.length} Products` : ""}`}
              </button>
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
