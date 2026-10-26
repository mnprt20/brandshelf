import React, { useState, useEffect } from "react";
import { SessionContext, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { StoreService } from "../../services/storeService";
import { THEME_REGISTRY, validateBrandColor } from "../../themes/registry";

interface Props {
  session: SessionContext;
}

export const SettingsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [brandColor, setBrandColor] = useState("#08482D");
  const [themeKey, setThemeKey] = useState("classic");
  const [upiId, setUpiId] = useState("");
  const [planSlug, setPlanSlug] = useState<"offline" | "franchise" | "online">("offline");
  const [extraSeats, setExtraSeats] = useState(0);

  // Online Settings
  const [onlineOpen, setOnlineOpen] = useState(true);
  const [pickupEnabled, setPickupEnabled] = useState(true);
  const [deliveryEnabled, setDeliveryEnabled] = useState(false);
  const [deliveryFeeRupees, setDeliveryFeeRupees] = useState("40");
  const [freeDeliveryAboveRupees, setFreeDeliveryAboveRupees] = useState("500");
  const [minOrderRupees, setMinOrderRupees] = useState("100");
  const [deliveryNote, setDeliveryNote] = useState("");

  const [saving, setSaving] = useState(false);
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const storeService = new StoreService(defaultRepository);

  const loadStore = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    if (!s) return;
    setStore(s);
    setName(s.name);
    setDescription(s.description);
    setBrandColor(s.brandColor);
    setThemeKey(s.themeKey);
    setUpiId(s.upiId);
    setPlanSlug(s.planSlug);
    setExtraSeats(s.extraSeats);
    setOnlineOpen(s.onlineOpen);
    setPickupEnabled(s.pickupEnabled);
    setDeliveryEnabled(s.deliveryEnabled);
    setDeliveryFeeRupees((s.deliveryFeePaise / 100).toString());
    setFreeDeliveryAboveRupees((s.freeDeliveryAbovePaise / 100).toString());
    setMinOrderRupees((s.minOrderPaise / 100).toString());
    setDeliveryNote(s.deliveryNote);
  };

  useEffect(() => {
    loadStore();
  }, [session]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSavedMessage(null);

    if (!validateBrandColor(brandColor)) {
      setError("Brand color must be a valid 6-character hex code (e.g. #08482D)");
      return;
    }

    setSaving(true);
    try {
      await storeService.updateStoreSettings(session, {
        name,
        description,
        brandColor,
        themeKey,
        upiId,
        onlineOpen,
        pickupEnabled,
        deliveryEnabled,
        deliveryFeePaise: Math.round(parseFloat(deliveryFeeRupees || "0") * 100),
        freeDeliveryAbovePaise: Math.round(parseFloat(freeDeliveryAboveRupees || "0") * 100),
        minOrderPaise: Math.round(parseFloat(minOrderRupees || "0") * 100),
        deliveryNote
      });

      setSavedMessage("Settings saved successfully!");
      loadStore();
      setTimeout(() => setSavedMessage(null), 4000);
    } catch (err: any) {
      setError(err.message || "Failed to update store settings");
    } finally {
      setSaving(false);
    }
  };

  if (!store) return <div>Loading settings...</div>;

  return (
    <div style={{ maxWidth: "800px" }}>
      <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: "0 0 8px" }}>Store Settings</h1>
      <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "28px" }}>
        Configure branding, theme layout, UPI payment details, and fulfilment options.
      </p>

      {savedMessage && (
        <div style={{ background: "var(--color-mint)", color: "var(--color-forest)", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontWeight: 700 }}>
          {savedMessage}
        </div>
      )}

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px 16px", borderRadius: "12px", marginBottom: "20px", fontWeight: 600 }}>
          {error}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* General Details Card */}
        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", padding: "28px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>General Store Profile</h3>
          
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Store Name</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Tagline / Description</label>
              <input
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Store UPI ID (Receives Direct Customer Payments)</label>
              <input
                required
                value={upiId}
                onChange={e => setUpiId(e.target.value)}
                placeholder="e.g. yourshop@upi"
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
              />
            </div>
          </div>
        </div>

        {/* Theme & Brand Color Card */}
        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", padding: "28px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>Appearance & Branding</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Brand Primary Color</label>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <input
                  type="color"
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  style={{ width: "44px", height: "44px", borderRadius: "8px", border: "none", cursor: "pointer", background: "none" }}
                />
                <input
                  value={brandColor}
                  onChange={e => setBrandColor(e.target.value)}
                  placeholder="#08482D"
                  style={{ width: "120px", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", fontFamily: "monospace" }}
                />
                <div style={{ width: "24px", height: "24px", borderRadius: "50%", backgroundColor: brandColor, border: "1px solid #DCE3D6" }} />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "8px" }}>Storefront Theme Layout</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px" }}>
                {Object.values(THEME_REGISTRY).map(t => (
                  <div
                    key={t.key}
                    onClick={() => setThemeKey(t.key)}
                    style={{
                      padding: "16px",
                      borderRadius: "14px",
                      border: themeKey === t.key ? "2px solid var(--color-forest)" : "1px solid #DCE3D6",
                      backgroundColor: themeKey === t.key ? "#F5F8EF" : "#FFFFFF",
                      cursor: "pointer"
                    }}
                  >
                    <div style={{ fontWeight: 700, fontSize: "14px" }}>{t.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>{t.description}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Plan & Seats Configuration Card */}
        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0 }}>Subscription Plan & Seats</h3>
            <span style={{ fontSize: "12px", color: "var(--color-muted)", background: "#F5F8EF", padding: "4px 10px", borderRadius: "9999px" }}>
              Managed by Platform Admin
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Active Plan</label>
              <select
                disabled
                value={planSlug}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", background: "#F9FAF8", cursor: "not-allowed" }}
              >
                <option value="offline">Offline Catalogue</option>
                <option value="franchise">Franchise (Team logins & referrals)</option>
                <option value="online">Online App (Checkout, addresses & delivery)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "4px" }}>Extra Seats Added</label>
              <input
                disabled
                type="number"
                min="0"
                value={extraSeats}
                style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", background: "#F9FAF8", cursor: "not-allowed" }}
              />
            </div>
          </div>
        </div>

        {/* Online Ordering & Delivery Options (Always visible or configurable) */}
        <div style={{ background: "#FFFFFF", borderRadius: "20px", border: "1px solid #E5EADF", padding: "28px" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 700, margin: "0 0 16px" }}>Online Delivery & Pickup Settings</h3>

          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "flex", gap: "24px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={onlineOpen}
                  onChange={e => setOnlineOpen(e.target.checked)}
                />
                Store is Open for Online Orders
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={pickupEnabled}
                  onChange={e => setPickupEnabled(e.target.checked)}
                />
                Enable Pickup
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "14px", fontWeight: 500 }}>
                <input
                  type="checkbox"
                  checked={deliveryEnabled}
                  onChange={e => setDeliveryEnabled(e.target.checked)}
                />
                Enable Delivery
              </label>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Delivery Fee (₹)</label>
                <input
                  type="number"
                  value={deliveryFeeRupees}
                  onChange={e => setDeliveryFeeRupees(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Free Delivery Above (₹)</label>
                <input
                  type="number"
                  value={freeDeliveryAboveRupees}
                  onChange={e => setFreeDeliveryAboveRupees(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Minimum Order (₹)</label>
                <input
                  type="number"
                  value={minOrderRupees}
                  onChange={e => setMinOrderRupees(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Delivery Note</label>
              <input
                value={deliveryNote}
                onChange={e => setDeliveryNote(e.target.value)}
                placeholder="e.g. Delivered within 45 mins. Local addresses only."
                style={{ width: "100%", padding: "8px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          style={{ padding: "16px 32px", borderRadius: "9999px", background: brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "16px", alignSelf: "flex-start" }}
        >
          {saving ? "Saving Changes..." : "Save Store Settings"}
        </button>
      </form>
    </div>
  );
};
