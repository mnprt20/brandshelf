import React, { useState } from "react";
import { AuthService } from "../services/authService";
import { CatalogService } from "../services/catalogService";
import { defaultRepository } from "../repository/storage";
import { SessionContext } from "../types";
import { BRAND_TYPES, BrandTypeDefinition } from "../config/brandTypes";
import { THEME_REGISTRY } from "../themes/registry";

interface Props {
  onNavigate: (route: string) => void;
  onLoginSuccess: (session: SessionContext) => void;
}

export const SignupPage: React.FC<Props> = ({ onNavigate, onLoginSuccess }) => {
  // Wizard steps: 1 = basics, 2 = brand type selection, 3 = tailored recommendations & confirmation
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Basics
  const [storeName, setStoreName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  // Step 2: Selected Brand Type
  const [selectedBrandTypeId, setSelectedBrandTypeId] = useState<string>("apparel");

  // Step 3: Customized recommendations
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [newCustomCategory, setNewCustomCategory] = useState("");
  const [seedStarterProducts, setSeedStarterProducts] = useState(true);
  const [selectedThemeKey, setSelectedThemeKey] = useState<"classic" | "minimal" | "bold">("minimal");
  const [selectedBrandColor, setSelectedBrandColor] = useState<string>("#1B3B2B");

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // When selecting a brand type, populate recommended settings
  const handleSelectBrandType = (brandId: string) => {
    setSelectedBrandTypeId(brandId);
    const def = BRAND_TYPES[brandId] || BRAND_TYPES.custom;
    setSelectedCategories([...def.recommendedCategories]);
    setSelectedThemeKey(def.recommendedTheme);
    setSelectedBrandColor(def.recommendedBrandColor);
  };

  const handleStep1Next = (e: React.FormEvent) => {
    e.preventDefault();
    if (!storeName.trim() || !displayName.trim() || !username.trim() || !password.trim()) {
      setError("Please fill in all account fields");
      return;
    }
    setError(null);
    // Initialize defaults if not set
    handleSelectBrandType(selectedBrandTypeId || "apparel");
    setStep(2);
  };

  const handleStep2Next = () => {
    setError(null);
    setStep(3);
  };

  const handleToggleCategory = (categoryName: string) => {
    if (selectedCategories.includes(categoryName)) {
      setSelectedCategories(selectedCategories.filter(c => c !== categoryName));
    } else {
      setSelectedCategories([...selectedCategories, categoryName]);
    }
  };

  const handleAddCustomCategory = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCustomCategory.trim();
    if (trimmed && !selectedCategories.includes(trimmed)) {
      setSelectedCategories([...selectedCategories, trimmed]);
      setNewCustomCategory("");
    }
  };

  const handleFinalSubmit = async () => {
    setError(null);
    setLoading(true);

    try {
      const auth = new AuthService(defaultRepository);
      const catalog = new CatalogService(defaultRepository);
      const brandDef = BRAND_TYPES[selectedBrandTypeId] || BRAND_TYPES.custom;

      // 1. Create user and store with brand metadata
      const { user, store } = await auth.signup(username, password, displayName, storeName, {
        brandType: selectedBrandTypeId,
        themeKey: selectedThemeKey,
        brandColor: selectedBrandColor,
        description: brandDef.tagline
      });

      const session: SessionContext = {
        userId: user.id,
        storeId: store.id,
        role: "owner"
      };

      // 2. Create the recommended categories
      const categoryMap = new Map<string, string>(); // categoryName -> categoryId
      for (const catName of selectedCategories) {
        const cat = await catalog.saveCategory(session, catName);
        categoryMap.set(catName, cat.id);
      }

      // 3. Seed starter products if selected
      if (seedStarterProducts && brandDef.starterProducts?.length > 0) {
        for (const prod of brandDef.starterProducts) {
          // Find matching category or fall back to the first created category
          let catId = categoryMap.get(prod.categoryName);
          if (!catId && selectedCategories.length > 0) {
            catId = categoryMap.get(selectedCategories[0]);
          }
          if (catId) {
            await catalog.saveProduct(session, {
              categoryId: catId,
              name: prod.name,
              description: prod.description,
              pricePaise: prod.pricePaise,
              stock: prod.stock,
              isAvailable: true,
              image: prod.image
            });
          }
        }
      }

      // 4. Log in and navigate
      onLoginSuccess(session);
      onNavigate("#/dashboard/overview");
    } catch (err: any) {
      setError(err.message || "Failed to create store");
      setLoading(false);
    }
  };

  const currentBrandDef = BRAND_TYPES[selectedBrandTypeId] || BRAND_TYPES.custom;

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px 16px",
        background: "var(--color-bg)"
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: step === 2 ? "680px" : step === 3 ? "640px" : "460px",
          background: "#FFFFFF",
          borderRadius: "24px",
          border: "1px solid #E5EADF",
          padding: "32px 24px",
          boxShadow: "0 10px 30px rgba(0,0,0,0.04)",
          transition: "max-width 0.2s ease"
        }}
      >
        {/* Step Indicator */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px" }}>
          <button
            onClick={() => {
              if (step === 3) setStep(2);
              else if (step === 2) setStep(1);
              else onNavigate("#/");
            }}
            style={{
              background: "none",
              color: "var(--color-forest)",
              fontWeight: 600,
              fontSize: "14px",
              padding: "4px 8px 4px 0"
            }}
          >
            ← {step === 1 ? "Home" : "Back"}
          </button>

          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {[1, 2, 3].map(s => (
              <div
                key={s}
                style={{
                  width: s === step ? "24px" : "8px",
                  height: "8px",
                  borderRadius: "9999px",
                  background: s === step ? "var(--color-forest)" : s < step ? "var(--color-mint)" : "#E5EADF",
                  transition: "all 0.2s ease"
                }}
              />
            ))}
            <span style={{ fontSize: "12px", color: "var(--color-muted)", fontWeight: 600, marginLeft: "6px" }}>
              Step {step} of 3
            </span>
          </div>
        </div>

        {error && (
          <div
            style={{
              background: "#FEE2E2",
              color: "#991B1B",
              padding: "10px 14px",
              borderRadius: "12px",
              fontSize: "13px",
              marginBottom: "16px",
              fontWeight: 500
            }}
          >
            {error}
          </div>
        )}

        {/* STEP 1: Basic Account & Store Name */}
        {step === 1 && (
          <div>
            <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 6px", color: "var(--color-ink)" }}>
              Create your brand store
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 24px", lineHeight: "20px" }}>
              Set up your shop details. Next, we will tailor product categories and styling to your industry.
            </p>

            <form onSubmit={handleStep1Next} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Brand / Shop Name
                </label>
                <input
                  required
                  value={storeName}
                  onChange={e => setStoreName(e.target.value)}
                  placeholder="e.g. Lotus Clay Studio or North Threads"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid #DCE3D6",
                    fontSize: "15px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Your Full Name
                </label>
                <input
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Maya Rao"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid #DCE3D6",
                    fontSize: "15px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Username
                </label>
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="Choose a login username"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid #DCE3D6",
                    fontSize: "15px"
                  }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px" }}>
                  Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a secure password"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: "12px",
                    border: "1px solid #DCE3D6",
                    fontSize: "15px"
                  }}
                />
              </div>

              <button
                type="submit"
                style={{
                  marginTop: "10px",
                  width: "100%",
                  padding: "14px",
                  borderRadius: "9999px",
                  background: "var(--color-forest)",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: "15px"
                }}
              >
                Continue to Industry Selection →
              </button>
            </form>

            <div style={{ marginTop: "24px", textAlign: "center", fontSize: "13px", color: "var(--color-muted)" }}>
              Already have a shop?{" "}
              <button
                onClick={() => onNavigate("#/login")}
                style={{ background: "none", color: "var(--color-forest)", fontWeight: 700 }}
              >
                Log in
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Ask for Which Type of Brand */}
        {step === 2 && (
          <div>
            <div style={{ display: "inline-block", padding: "4px 10px", borderRadius: "9999px", background: "var(--color-mint)", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "8px" }}>
              Industry Selection
            </div>
            <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "26px", margin: "0 0 6px", color: "var(--color-ink)" }}>
              What type of brand is {storeName || "your shop"}?
            </h1>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 20px", lineHeight: "20px" }}>
              Select your primary business type. We will generate tailored product categories (such as Men's, Women's, Upper Wear & Lowers for Apparel), starter items, and a complementary theme.
            </p>

            {/* Grid of brand types */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: "12px",
                maxHeight: "360px",
                overflowY: "auto",
                padding: "2px",
                marginBottom: "20px"
              }}
            >
              {Object.values(BRAND_TYPES).map((bt: BrandTypeDefinition) => {
                const isSelected = selectedBrandTypeId === bt.id;
                return (
                  <div
                    key={bt.id}
                    onClick={() => handleSelectBrandType(bt.id)}
                    style={{
                      border: isSelected ? "2px solid var(--color-forest)" : "1px solid #E5EADF",
                      background: isSelected ? "#F3F7EE" : "#FFFFFF",
                      borderRadius: "16px",
                      padding: "14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "4px",
                      transition: "all 0.15s ease",
                      position: "relative"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontSize: "24px" }}>{bt.emoji}</span>
                      {isSelected && (
                        <span style={{ background: "var(--color-forest)", color: "#FFFFFF", borderRadius: "50%", width: "20px", height: "20px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "12px" }}>
                          ✓
                        </span>
                      )}
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-ink)" }}>
                      {bt.title}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", lineHeight: "16px" }}>
                      {bt.tagline}
                    </div>
                    <div style={{ marginTop: "6px", fontSize: "11px", color: "var(--color-forest)", fontWeight: 600 }}>
                      Includes {bt.recommendedCategories.length} smart categories
                    </div>
                  </div>
                );
              })}
            </div>

            <button
              onClick={handleStep2Next}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "9999px",
                background: "var(--color-forest)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "15px"
              }}
            >
              Review Tailored Recommendations →
            </button>
          </div>
        )}

        {/* STEP 3: Tailored Recommendations & Confirmation */}
        {step === 3 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" }}>
              <span style={{ fontSize: "28px" }}>{currentBrandDef.emoji}</span>
              <div>
                <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "24px", margin: 0, color: "var(--color-ink)" }}>
                  Tailored for {currentBrandDef.title}
                </h1>
                <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: 0 }}>
                  Review recommendations for <b>{storeName}</b>
                </p>
              </div>
            </div>

            <div style={{ maxHeight: "420px", overflowY: "auto", paddingRight: "4px", display: "flex", flexDirection: "column", gap: "20px", margin: "16px 0 20px" }}>
              {/* Recommended Categories */}
              <div style={{ background: "#F9FAF6", borderRadius: "16px", padding: "16px", border: "1px solid #E5EADF" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--color-forest)" }}>
                    Recommended Product Categories ({selectedCategories.length} selected)
                  </div>
                  <span style={{ fontSize: "11px", color: "var(--color-muted)" }}>Tap to toggle</span>
                </div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "12px" }}>
                  {currentBrandDef.recommendedCategories.map(cat => {
                    const checked = selectedCategories.includes(cat);
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => handleToggleCategory(cat)}
                        style={{
                          padding: "6px 12px",
                          borderRadius: "9999px",
                          fontSize: "13px",
                          fontWeight: checked ? 700 : 500,
                          background: checked ? "var(--color-forest)" : "#FFFFFF",
                          color: checked ? "#FFFFFF" : "var(--color-ink)",
                          border: checked ? "1px solid var(--color-forest)" : "1px solid #DCE3D6",
                          display: "flex",
                          alignItems: "center",
                          gap: "6px"
                        }}
                      >
                        {checked && <span>✓</span>}
                        {cat}
                      </button>
                    );
                  })}
                </div>

                {/* Add a custom category right here */}
                <form onSubmit={handleAddCustomCategory} style={{ display: "flex", gap: "8px" }}>
                  <input
                    value={newCustomCategory}
                    onChange={e => setNewCustomCategory(e.target.value)}
                    placeholder="+ Add custom category"
                    style={{
                      flex: 1,
                      padding: "8px 12px",
                      borderRadius: "10px",
                      border: "1px solid #DCE3D6",
                      fontSize: "13px",
                      background: "#FFFFFF"
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      padding: "8px 14px",
                      borderRadius: "10px",
                      background: "var(--color-mint)",
                      color: "var(--color-forest)",
                      fontWeight: 700,
                      fontSize: "13px"
                    }}
                  >
                    Add
                  </button>
                </form>
              </div>

              {/* Starter Products Option */}
              {currentBrandDef.starterProducts && currentBrandDef.starterProducts.length > 0 && (
                <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "16px", border: "1px solid #E5EADF" }}>
                  <label style={{ display: "flex", alignItems: "flex-start", gap: "10px", cursor: "pointer" }}>
                    <input
                      type="checkbox"
                      checked={seedStarterProducts}
                      onChange={e => setSeedStarterProducts(e.target.checked)}
                      style={{ marginTop: "4px", accentColor: "var(--color-forest)", width: "16px", height: "16px" }}
                    />
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "14px" }}>
                        Pre-load sample {currentBrandDef.title.toLowerCase()} products
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
                        Includes {currentBrandDef.starterProducts.length} starter items (e.g.{" "}
                        {currentBrandDef.starterProducts.slice(0, 2).map(p => `"${p.name}"`).join(", ")}) to preview your shelf immediately. You can edit or delete them anytime.
                      </div>
                    </div>
                  </label>
                </div>
              )}

              {/* Theme & Brand Color Recommendation */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "14px", border: "1px solid #E5EADF" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Recommended Theme
                  </label>
                  <select
                    value={selectedThemeKey}
                    onChange={e => setSelectedThemeKey(e.target.value as any)}
                    style={{ width: "100%", padding: "8px 10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", fontWeight: 600 }}
                  >
                    {Object.values(THEME_REGISTRY).map(t => (
                      <option key={t.key} value={t.key}>
                        {t.name} ({t.key === currentBrandDef.recommendedTheme ? "Recommended" : t.name})
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ background: "#FFFFFF", borderRadius: "16px", padding: "14px", border: "1px solid #E5EADF" }}>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--color-muted)", textTransform: "uppercase", marginBottom: "8px" }}>
                    Brand Accent Color
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <input
                      type="color"
                      value={selectedBrandColor}
                      onChange={e => setSelectedBrandColor(e.target.value)}
                      style={{ width: "36px", height: "36px", borderRadius: "8px", border: "none", cursor: "pointer", background: "none" }}
                    />
                    <span style={{ fontFamily: "monospace", fontSize: "13px", fontWeight: 600 }}>{selectedBrandColor}</span>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={handleFinalSubmit}
              disabled={loading || selectedCategories.length === 0}
              style={{
                width: "100%",
                padding: "14px",
                borderRadius: "9999px",
                background: "var(--color-forest)",
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "15px",
                boxShadow: "0 4px 14px rgba(8, 72, 45, 0.2)"
              }}
            >
              {loading ? "Generating Your Store..." : "Launch Store with Selected Shelf Setup 🚀"}
            </button>
            {selectedCategories.length === 0 && (
              <p style={{ color: "#DC2626", fontSize: "12px", textAlign: "center", marginTop: "8px" }}>
                Please select at least one product category.
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
