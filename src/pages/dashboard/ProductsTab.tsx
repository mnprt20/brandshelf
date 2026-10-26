import React, { useState, useEffect } from "react";
import { SessionContext, Product, Category, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";
import { formatPaise, parseRupeesToPaise } from "../../utils/money";
import { resizeImageToDataUrl, compressDataUrl } from "../../utils/image";
import { apiEnhancePhoto, EnhancePhotoResult } from "../../services/apiClient";
import {
  PRODUCT_TYPES,
  ProductType,
  PHOTO_STYLE_PRESETS,
  inferProductType
} from "../../config/photoStyles";

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

  // Studio Photo Modal State
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [studioTargetImage, setStudioTargetImage] = useState<string>("");
  const [studioTargetIndex, setStudioTargetIndex] = useState<number | null>(null);
  const [studioProductType, setStudioProductType] = useState<ProductType>("general");
  const [studioLoading, setStudioLoading] = useState(false);
  const [studioLoadingMessage, setStudioLoadingMessage] = useState("Setting up studio lights...");
  const [studioResult, setStudioResult] = useState<EnhancePhotoResult | null>(null);
  const [studioError, setStudioError] = useState<string | null>(null);

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
    setIsModalOpen(true);
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
      const pricePaise = parseRupeesToPaise(priceRupees);
      const stock = stockInput.trim() === "" ? null : parseInt(stockInput.trim(), 10);

      await catalogService.saveProduct(session, {
        id: editingProduct?.id,
        categoryId,
        name,
        description,
        pricePaise,
        stock,
        isAvailable,
        image: images[0] || undefined,
        images: images.length > 0 ? images : undefined
      });

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
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Products & Inventory</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Add, update prices in INR (stored as integer paise), and manage stock.
          </p>
        </div>
        <button
          onClick={openAddModal}
          style={{ padding: "10px 20px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px", cursor: "pointer" }}
        >
          + Add New Product
        </button>
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
                    <td style={{ padding: "14px 20px", fontWeight: 700, color: store?.brandColor }}>
                      {formatPaise(p.pricePaise)}
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      {p.stock === null ? (
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
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Price in Rupees (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={priceRupees}
                    onChange={e => setPriceRupees(e.target.value)}
                    placeholder="e.g. 250"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Stock (blank = unlimited)</label>
                  <input
                    type="number"
                    value={stockInput}
                    onChange={e => setStockInput(e.target.value)}
                    placeholder="e.g. 15"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                  />
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
    </div>
  );
};
