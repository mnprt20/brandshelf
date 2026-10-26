import React, { useState, useEffect } from "react";
import { SessionContext, Category, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";
import { BRAND_TYPES, BrandTypeDefinition } from "../../config/brandTypes";

interface Props {
  session: SessionContext;
}

export const CategoriesTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCatName, setNewCatName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [recommendationsOpen, setRecommendationsOpen] = useState(true);
  const [selectedBrandType, setSelectedBrandType] = useState<string>("apparel");

  const catalogService = new CatalogService(defaultRepository);

  const loadCategories = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    const c = await defaultRepository.getCategories(session.storeId);
    setStore(s);
    setCategories(c);
    if (s?.brandType && BRAND_TYPES[s.brandType]) {
      setSelectedBrandType(s.brandType);
    }
  };

  useEffect(() => {
    loadCategories();
  }, [session]);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    setError(null);
    try {
      await catalogService.saveCategory(session, newCatName);
      setNewCatName("");
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to create category");
    }
  };

  const handleAddSingleRecommendation = async (catName: string) => {
    setError(null);
    try {
      await catalogService.saveCategory(session, catName);
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to add recommended category");
    }
  };

  const handleAddAllMissingRecommendations = async () => {
    setError(null);
    const def = BRAND_TYPES[selectedBrandType] || BRAND_TYPES.apparel;
    const existingNames = new Set(categories.map(c => c.name.toLowerCase().trim()));
    const missing = def.recommendedCategories.filter(name => !existingNames.has(name.toLowerCase().trim()));

    try {
      for (const name of missing) {
        await catalogService.saveCategory(session, name);
      }
      await loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to import categories");
    }
  };

  const handleUpdate = async (id: string) => {
    if (!editName.trim()) return;
    setError(null);
    try {
      await catalogService.saveCategory(session, editName, id);
      setEditingId(null);
      loadCategories();
    } catch (err: any) {
      setError(err.message || "Failed to update category");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this category? Items inside will remain in the catalogue uncategorized.")) return;
    try {
      await catalogService.deleteCategory(session, id);
      loadCategories();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const currentBrandDef = BRAND_TYPES[selectedBrandType] || BRAND_TYPES.apparel;
  const existingNames = new Set(categories.map(c => c.name.toLowerCase().trim()));
  const missingCategories = currentBrandDef.recommendedCategories.filter(
    name => !existingNames.has(name.toLowerCase().trim())
  );

  return (
    <div style={{ maxWidth: "760px", paddingBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 6px" }}>Categories</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: 0 }}>
            Organize items into browsable tabs and shelves on your mobile and web storefront.
          </p>
        </div>

        {store?.brandType && (
          <div style={{ background: "var(--color-mint)", color: "var(--color-forest)", padding: "4px 12px", borderRadius: "9999px", fontSize: "12px", fontWeight: 700, display: "flex", alignItems: "center", gap: "6px" }}>
            <span>{currentBrandDef.emoji}</span>
            <span>{currentBrandDef.title}</span>
          </div>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "13px", margin: "16px 0" }}>
          {error}
        </div>
      )}

      {/* Brand Industry Recommendations Banner */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "20px",
          border: "1px solid #DCE3D6",
          padding: "20px",
          margin: "20px 0 28px",
          boxShadow: "0 4px 16px rgba(0,0,0,0.02)"
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "20px" }}>💡</span>
            <div>
              <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--color-ink)" }}>
                Industry Category Recommendations
              </div>
              <div style={{ fontSize: "12px", color: "var(--color-muted)" }}>
                Tailored shelves for your business type
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <select
              value={selectedBrandType}
              onChange={e => setSelectedBrandType(e.target.value)}
              style={{
                padding: "6px 10px",
                borderRadius: "10px",
                border: "1px solid #DCE3D6",
                fontSize: "13px",
                fontWeight: 600,
                background: "#F5F8EF"
              }}
            >
              {Object.values(BRAND_TYPES).map(b => (
                <option key={b.id} value={b.id}>
                  {b.emoji} {b.title}
                </option>
              ))}
            </select>

            {missingCategories.length > 0 && (
              <button
                onClick={handleAddAllMissingRecommendations}
                style={{
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: "var(--color-forest)",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700
                }}
              >
                + Add All ({missingCategories.length})
              </button>
            )}
          </div>
        </div>

        {/* List of recommended categories */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {currentBrandDef.recommendedCategories.map(catName => {
            const isAdded = existingNames.has(catName.toLowerCase().trim());
            return (
              <div
                key={catName}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 12px",
                  borderRadius: "9999px",
                  fontSize: "13px",
                  fontWeight: 600,
                  background: isAdded ? "#E8F5E9" : "#F5F8EF",
                  color: isAdded ? "#1B5E20" : "var(--color-ink)",
                  border: isAdded ? "1px solid #C8E6C9" : "1px solid #DCE3D6"
                }}
              >
                {isAdded ? (
                  <span>✓ {catName}</span>
                ) : (
                  <>
                    <span>{catName}</span>
                    <button
                      onClick={() => handleAddSingleRecommendation(catName)}
                      style={{
                        background: "var(--color-forest)",
                        color: "#FFFFFF",
                        borderRadius: "50%",
                        width: "18px",
                        height: "18px",
                        fontSize: "12px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0
                      }}
                      title="Add category"
                    >
                      +
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add New Custom Category Card */}
      <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
        <input
          required
          placeholder="New Category Name (e.g. Daily Specials)"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          style={{
            flex: 1,
            padding: "12px 14px",
            borderRadius: "12px",
            border: "1px solid #DCE3D6",
            fontSize: "14px",
            background: "#FFFFFF"
          }}
        />
        <button
          type="submit"
          style={{
            padding: "12px 22px",
            borderRadius: "9999px",
            background: store?.brandColor || "var(--color-forest)",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "14px",
            whiteSpace: "nowrap"
          }}
        >
          Add Custom
        </button>
      </form>

      {/* Category List Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #F0F4EC", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase" }}>
            Active Categories ({categories.length})
          </span>
        </div>

        {categories.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--color-muted)", fontSize: "14px" }}>
            No categories yet. Click "+ Add All" above or type a name to get started!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categories.map((c, idx) => (
              <div
                key={c.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 20px",
                  borderBottom: idx < categories.length - 1 ? "1px solid #F0F4EC" : "none"
                }}
              >
                {editingId === c.id ? (
                  <div style={{ display: "flex", gap: "8px", flex: 1, marginRight: "12px" }}>
                    <input
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ flex: 1, padding: "6px 10px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                    />
                    <button
                      onClick={() => handleUpdate(c.id)}
                      style={{ padding: "6px 12px", borderRadius: "8px", background: store?.brandColor || "var(--color-forest)", color: "#FFF", fontSize: "12px", fontWeight: 700 }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      style={{ padding: "6px 12px", borderRadius: "8px", background: "#F0F4EC", fontSize: "12px" }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <span style={{ fontWeight: 600, fontSize: "15px" }}>{c.name}</span>
                )}

                {editingId !== c.id && (
                  <div style={{ display: "flex", gap: "10px" }}>
                    <button
                      onClick={() => {
                        setEditingId(c.id);
                        setEditName(c.name);
                      }}
                      style={{ background: "none", color: store?.brandColor || "var(--color-forest)", fontSize: "13px", fontWeight: 600 }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(c.id)}
                      style={{ background: "none", color: "#DC2626", fontSize: "13px", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
