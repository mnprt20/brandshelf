import React, { useState, useEffect } from "react";
import { SessionContext, Product, Category, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";
import { formatPaise, parseRupeesToPaise } from "../../utils/money";
import { resizeImageToDataUrl } from "../../utils/image";

interface Props {
  session: SessionContext;
}

export const ProductsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeFilterCat, setActiveFilterCat] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [name, setName] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [description, setDescription] = useState("");
  const [priceRupees, setPriceRupees] = useState("");
  const [stockInput, setStockInput] = useState("");
  const [isAvailable, setIsAvailable] = useState(true);
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  const openAddModal = () => {
    setEditingProduct(null);
    setName("");
    setCategoryId(categories[0]?.id || "");
    setDescription("");
    setPriceRupees("");
    setStockInput("");
    setIsAvailable(true);
    setImageDataUrl(undefined);
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
    setImageDataUrl(p.image);
    setError(null);
    setIsModalOpen(true);
  };

  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await resizeImageToDataUrl(file);
        setImageDataUrl(dataUrl);
      } catch (err: any) {
        alert("Failed to load image: " + err.message);
      }
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
        image: imageDataUrl
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
          style={{ padding: "10px 20px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
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
            style={{ padding: "6px 12px", borderRadius: "9999px", background: activeFilterCat === null ? (store?.brandColor || "var(--color-forest)") : "#FFFFFF", color: activeFilterCat === null ? "#FFF" : "var(--color-ink)", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600 }}
          >
            All ({products.length})
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveFilterCat(c.id)}
              style={{ padding: "6px 12px", borderRadius: "9999px", background: activeFilterCat === c.id ? (store?.brandColor || "var(--color-forest)") : "#FFFFFF", color: activeFilterCat === c.id ? "#FFF" : "var(--color-ink)", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600 }}
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
              {filtered.map(p => (
                <tr key={p.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                      <div style={{ width: "40px", height: "40px", borderRadius: "8px", background: "#F5F8EF", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        {p.image ? (
                          <img src={p.image} alt={p.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span>📦</span>
                        )}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700 }}>{p.name}</div>
                        <div style={{ fontSize: "12px", color: "var(--color-muted)", maxWidth: "260px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.description}</div>
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
                        color: p.isAvailable ? "#166534" : "#6B7280"
                      }}
                    >
                      {p.isAvailable ? "Active" : "Hidden"}
                    </button>
                  </td>
                  <td style={{ padding: "14px 20px", textAlign: "right" }}>
                    <button
                      onClick={() => openEditModal(p)}
                      style={{ background: "none", color: store?.brandColor, fontWeight: 600, fontSize: "13px", marginRight: "12px" }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(p.id)}
                      style={{ background: "none", color: "#DC2626", fontWeight: 600, fontSize: "13px" }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "480px", width: "100%", padding: "32px", maxHeight: "90vh", overflowY: "auto" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>
              {editingProduct ? "Edit Product" : "New Product"}
            </h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Configure product details for your storefront catalogue.
            </p>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSaveProduct} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
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
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Stock Count (leave blank for unlimited)</label>
                <input
                  type="number"
                  value={stockInput}
                  onChange={e => setStockInput(e.target.value)}
                  placeholder="e.g. 15"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Notes, ingredients, or sizing..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Photo (Automatic resize)</label>
                <input type="file" accept="image/*" onChange={handleImageFileChange} style={{ fontSize: "13px" }} />
                {imageDataUrl && (
                  <div style={{ marginTop: "8px", width: "64px", height: "64px", borderRadius: "8px", overflow: "hidden", border: "1px solid #DCE3D6" }}>
                    <img src={imageDataUrl} alt="Preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
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
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                >
                  {saving ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
