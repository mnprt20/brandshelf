import React, { useState, useEffect } from "react";
import { AuthService } from "../services/authService";
import { CatalogService } from "../services/catalogService";
import { defaultRepository } from "../repository/storage";
import { SessionContext, User, Store } from "../types";

interface Props {
  onNavigate: (route: string) => void;
  onLoginSuccess: (session: SessionContext) => void;
}

export const FranchiseSignupPage: React.FC<Props> = ({ onNavigate, onLoginSuccess }) => {
  const [ownerName, setOwnerName] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [password, setPassword] = useState("");
  const [previewUserId, setPreviewUserId] = useState("your-business-owner");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Success state
  const [createdInfo, setCreatedInfo] = useState<{
    user: User;
    store: Store;
    session: SessionContext;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Live preview calculation for User ID
  useEffect(() => {
    if (!businessName.trim()) {
      setPreviewUserId("your-business-owner");
      return;
    }
    const clean = businessName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "store";
    setPreviewUserId(`${clean}-owner`);
  }, [businessName]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!ownerName.trim()) {
      setError("Please enter the owner's name");
      return;
    }
    if (!businessName.trim()) {
      setError("Please enter the business name");
      return;
    }
    if (!password || password.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }

    setLoading(true);
    try {
      const auth = new AuthService(defaultRepository);
      const catalog = new CatalogService(defaultRepository);

      // Create store on franchise plan with generated owner user ID
      const { user, store } = await auth.signupFranchise(businessName, ownerName, password, {
        brandType: "cafe",
        themeKey: "classic",
        brandColor: "#08482D",
        description: `Welcome to ${businessName.trim()}! Specializing in quality products and dedicated customer service.`
      });

      const session: SessionContext = {
        userId: user.id,
        storeId: store.id,
        role: "owner"
      };

      // Create initial starter categories so the catalog is ready to receive products
      try {
        const cat1 = await catalog.saveCategory(session, "Featured Specials");
        await catalog.saveCategory(session, "Everyday Favorites");
        await catalog.saveProduct(session, {
          categoryId: cat1.id,
          name: `${businessName.trim()} Signature Item`,
          description: "Our signature customer favorite, handcrafted fresh daily.",
          pricePaise: 25000,
          stock: 25,
          isAvailable: true
        });
      } catch (catErr) {
        console.warn("Starter catalog creation:", catErr);
      }

      setCreatedInfo({ user, store, session });
    } catch (err: any) {
      setError(err.message || "Failed to create franchise store");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyUserId = () => {
    if (!createdInfo) return;
    navigator.clipboard.writeText(createdInfo.user.username);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleEnterDashboard = () => {
    if (!createdInfo) return;
    onLoginSuccess(createdInfo.session);
    onNavigate("#/dashboard/overview");
  };

  return (
    <div style={{ backgroundColor: "var(--color-bg)", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #E5EADF" }}>
        <div onClick={() => onNavigate("#/")} style={{ cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM4 12C4 7.58 7.58 4 12 4C14.07 4 15.94 4.79 17.36 6.07L6.07 17.36C4.79 15.94 4 14.07 4 12ZM12 20C9.93 20 8.06 19.21 6.64 17.93L17.93 6.64C19.21 8.06 20 9.93 20 12C20 16.42 16.42 20 12 20Z" fill="var(--color-forest)"/>
          </svg>
          <span style={{ fontSize: "20px", fontWeight: 800, color: "var(--color-ink)", letterSpacing: "-0.03em" }}>MintShelf</span>
          <span style={{ marginLeft: "8px", padding: "2px 8px", background: "var(--color-forest)", color: "#FFFFFF", borderRadius: "9999px", fontSize: "11px", fontWeight: 700, textTransform: "uppercase" }}>Franchise</span>
        </div>
        <button
          onClick={() => onNavigate("#/login")}
          style={{ background: "none", color: "var(--color-forest)", fontSize: "14px", fontWeight: 600 }}
        >
          Already have an account? Log in
        </button>
      </header>

      {/* Main Container */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ maxWidth: "520px", width: "100%", background: "#FFFFFF", borderRadius: "28px", border: "1px solid #E5EADF", padding: "40px", boxShadow: "0 12px 32px rgba(0,0,0,0.06)" }}>
          
          {!createdInfo ? (
            /* Signup Form View */
            <div>
              <div style={{ display: "inline-block", padding: "6px 14px", backgroundColor: "#DCFCE7", color: "#166534", borderRadius: "9999px", fontSize: "12px", fontWeight: 700, marginBottom: "16px" }}>
                🏢 Franchise Plan Onboarding
              </div>
              <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 8px", color: "var(--color-ink)", letterSpacing: "-0.02em" }}>
                Start Your Franchise
              </h1>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "20px", margin: "0 0 24px" }}>
                Create your multi-staff franchise business. Your owner login ID will be automatically generated from your business name.
              </p>

              {error && (
                <div style={{ padding: "12px 16px", borderRadius: "12px", background: "#FEE2E2", color: "#991B1B", fontSize: "13px", marginBottom: "20px", fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "6px" }}>
                    Owner Name
                  </label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={e => setOwnerName(e.target.value)}
                    placeholder="e.g. Arun Sharma"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "15px", outline: "none" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px", display: "block" }}>
                    Your personal full name as the franchise owner.
                  </span>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "6px" }}>
                    Business Name
                  </label>
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={e => setBusinessName(e.target.value)}
                    placeholder="e.g. Blue Cafe"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "15px", outline: "none" }}
                  />
                  <span style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px", display: "block" }}>
                    Your brand or franchise store title.
                  </span>
                </div>

                {/* Live Generated User ID Banner */}
                <div style={{ padding: "14px 16px", borderRadius: "14px", background: "#F5F8EF", border: "1px solid #DAE7C7" }}>
                  <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-forest)", letterSpacing: "0.05em" }}>
                    Generated Login User ID (Auto)
                  </div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "var(--color-ink)", marginTop: "4px", fontFamily: "monospace" }}>
                    @{previewUserId}
                  </div>
                  <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>
                    This unique ID will be created for your owner login. (A number is added automatically if already taken).
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "6px" }}>
                    Password
                  </label>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Create a strong password"
                    style={{ width: "100%", padding: "12px 16px", borderRadius: "12px", border: "1px solid #DCE3D6", fontSize: "15px", outline: "none" }}
                  />
                </div>

                <div style={{ marginTop: "12px" }}>
                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      width: "100%",
                      padding: "16px",
                      borderRadius: "9999px",
                      background: "var(--color-forest)",
                      color: "#FFFFFF",
                      fontSize: "16px",
                      fontWeight: 700,
                      boxShadow: "0 6px 16px rgba(8, 72, 45, 0.25)",
                      cursor: loading ? "wait" : "pointer"
                    }}
                  >
                    {loading ? "Creating Franchise Store..." : "Create My Franchise ➔"}
                  </button>
                </div>

                <div style={{ textAlign: "center", marginTop: "12px" }}>
                  <button
                    type="button"
                    onClick={() => onNavigate("#/signup")}
                    style={{ background: "none", color: "var(--color-muted)", fontSize: "13px", fontWeight: 500 }}
                  >
                    Looking for a single-catalogue store instead? Standard Signup
                  </button>
                </div>
              </form>
            </div>
          ) : (
            /* Success View */
            <div style={{ textAlign: "center" }}>
              <div style={{ width: "64px", height: "64px", borderRadius: "9999px", background: "#DCFCE7", color: "#166534", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontSize: "28px" }}>
                ✓
              </div>

              <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 8px", color: "var(--color-ink)" }}>
                Franchise Store Created!
              </h1>
              <p style={{ color: "var(--color-muted)", fontSize: "14px", lineHeight: "20px", margin: "0 0 24px" }}>
                Your store <b>{createdInfo.store.name}</b> is set up on the <b>Franchise Plan</b>. Save your generated owner login User ID below.
              </p>

              {/* Highlighted Credentials Card */}
              <div style={{ background: "#F5F8EF", borderRadius: "20px", border: "2px solid #DAE7C7", padding: "24px", textAlign: "left", marginBottom: "24px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "16px" }}>
                  <div>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-forest)" }}>
                      Your Owner Login User ID
                    </div>
                    <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--color-ink)", fontFamily: "monospace", marginTop: "4px" }}>
                      {createdInfo.user.username}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyUserId}
                    style={{
                      padding: "8px 14px",
                      borderRadius: "9999px",
                      background: copied ? "#166534" : "var(--color-forest)",
                      color: "#FFFFFF",
                      fontSize: "12px",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      gap: "6px"
                    }}
                  >
                    {copied ? "✓ Copied!" : "Copy User ID"}
                  </button>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", paddingTop: "12px", borderTop: "1px solid #DCE3D6", fontSize: "13px" }}>
                  <div>
                    <span style={{ color: "var(--color-muted)", display: "block" }}>Business:</span>
                    <strong style={{ color: "var(--color-ink)" }}>{createdInfo.store.name}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-muted)", display: "block" }}>Plan:</span>
                    <strong style={{ color: "var(--color-forest)", textTransform: "capitalize" }}>{createdInfo.store.planSlug}</strong>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-muted)", display: "block" }}>Storefront:</span>
                    <span style={{ color: "var(--color-forest)", fontWeight: 600 }}>/store/{createdInfo.store.slug}</span>
                  </div>
                  <div>
                    <span style={{ color: "var(--color-muted)", display: "block" }}>Team Seats:</span>
                    <strong style={{ color: "var(--color-ink)" }}>3 Included Users</strong>
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <button
                  onClick={handleEnterDashboard}
                  style={{
                    width: "100%",
                    padding: "16px",
                    borderRadius: "9999px",
                    background: "var(--color-forest)",
                    color: "#FFFFFF",
                    fontSize: "16px",
                    fontWeight: 700,
                    boxShadow: "0 6px 16px rgba(8, 72, 45, 0.25)"
                  }}
                >
                  Enter Owner Dashboard ➔
                </button>

                <button
                  onClick={() => onNavigate(`#/store/${createdInfo.store.slug}`)}
                  style={{
                    width: "100%",
                    padding: "12px",
                    borderRadius: "9999px",
                    background: "#FFFFFF",
                    border: "1px solid #DCE3D6",
                    color: "var(--color-forest)",
                    fontSize: "14px",
                    fontWeight: 600
                  }}
                >
                  Preview Customer Storefront
                </button>
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
};
