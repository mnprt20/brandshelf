import React, { useState, useEffect } from "react";
import { SessionContext, Category, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { CatalogService } from "../../services/catalogService";

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

  const catalogService = new CatalogService(defaultRepository);

  const loadCategories = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    const c = await defaultRepository.getCategories(session.storeId);
    setStore(s);
    setCategories(c);
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

  return (
    <div style={{ maxWidth: "700px" }}>
      <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: "0 0 8px" }}>Categories</h1>
      <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "28px" }}>
        Organize items into browsable tabs and pills on your public storefront.
      </p>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
          {error}
        </div>
      )}

      {/* Add New Category Card */}
      <form onSubmit={handleAddCategory} style={{ display: "flex", gap: "10px", marginBottom: "28px" }}>
        <input
          required
          placeholder="New Category Name (e.g. Daily Specials)"
          value={newCatName}
          onChange={e => setNewCatName(e.target.value)}
          style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "14px" }}
        />
        <button
          type="submit"
          style={{ padding: "12px 24px", borderRadius: "9999px", background: store?.brandColor || "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
        >
          Add Category
        </button>
      </form>

      {/* Category List Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        {categories.length === 0 ? (
          <div style={{ padding: "36px", textAlign: "center", color: "var(--color-muted)" }}>
            No categories yet. Create your first category above!
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {categories.map((c, idx) => (
              <div key={c.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: idx < categories.length - 1 ? "1px solid #F0F4EC" : "none" }}>
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
                      style={{ background: "none", color: store?.brandColor, fontSize: "13px", fontWeight: 600 }}
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
