import React, { useState } from "react";
import { StoreProfile, Store } from "../../types";
import { calculateStoreOpenStatus } from "../../utils/istTime";

interface Props {
  store: Store;
  profile: StoreProfile | null;
  brandColor?: string;
  isDark?: boolean;
}

export const StoreProfileSections: React.FC<Props> = ({
  store,
  profile,
  brandColor = "#08482D",
  isDark = false
}) => {
  const [activePolicyModal, setActivePolicyModal] = useState<"returns" | "shipping" | "privacy" | "info" | null>(null);

  if (!profile) return null;

  const info = profile.info?.enabled ? profile.info : null;
  const story = profile.story?.enabled ? profile.story : null;
  const policies = profile.policies?.enabled ? profile.policies : null;

  const openStatus = calculateStoreOpenStatus(info?.hours, info?.holidays);

  return (
    <div style={{ width: "100%", marginTop: "32px" }}>
      {/* 1. Header Quick Contact & Open Status Bar (if info enabled) */}
      {info && (
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto 24px",
            padding: "0 20px",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          {/* Open / Closed IST Badge */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "6px",
                padding: "4px 12px",
                borderRadius: "9999px",
                fontSize: "12px",
                fontWeight: 700,
                background: openStatus.isOpen ? "#DCFCE7" : "#FEE2E2",
                color: openStatus.isOpen ? "#166534" : "#991B1B"
              }}
            >
              <span
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: openStatus.isOpen ? "#16A34A" : "#DC2626"
                }}
              />
              {openStatus.isOpen ? "Open Now" : "Closed"}
            </span>
            <span style={{ fontSize: "12px", color: isDark ? "#A0A89C" : "#6B7280" }}>
              {openStatus.message}
            </span>
          </div>

          {/* Call & WhatsApp Quick Buttons & Map */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            {info.phone && (
              <a
                href={`tel:${info.phone}`}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: isDark ? "#242B24" : "#F0F4EC",
                  color: isDark ? "#EDEFEA" : "var(--color-ink)",
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  border: isDark ? "1px solid #343E34" : "1px solid #DCE3D6"
                }}
              >
                <span>📞</span> Call Shop
              </a>
            )}

            {info.whatsapp && (
              <a
                href={`https://wa.me/${info.whatsapp.replace(/[^0-9]/g, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: "#25D366",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  textDecoration: "none"
                }}
              >
                <span>💬</span> WhatsApp
              </a>
            )}

            {info.mapUrl && info.mapUrl.startsWith("https://") && (
              <a
                href={info.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "6px 14px",
                  borderRadius: "9999px",
                  background: isDark ? "#242B24" : "#F0F4EC",
                  color: brandColor,
                  fontSize: "12px",
                  fontWeight: 600,
                  textDecoration: "none",
                  border: isDark ? "1px solid #343E34" : "1px solid #DCE3D6"
                }}
              >
                <span>📍</span> Open in Maps
              </a>
            )}
          </div>
        </div>
      )}

      {/* 2. Store Story & Certifications Card */}
      {story && (story.about || (story.certs && story.certs.length > 0) || story.ownerPhoto) && (
        <section
          style={{
            maxWidth: "1200px",
            margin: "0 auto 36px",
            padding: "0 20px"
          }}
        >
          <div
            style={{
              background: isDark ? "#1A1D1A" : "#FFFFFF",
              borderRadius: "20px",
              border: isDark ? "1px solid #2B332B" : "1px solid #E5EADF",
              padding: "24px 28px",
              display: "flex",
              flexDirection: "column",
              gap: "18px"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "16px", flexWrap: "wrap" }}>
              {story.ownerPhoto && (
                <div style={{ width: "68px", height: "68px", borderRadius: "50%", overflow: "hidden", border: `2px solid ${brandColor}`, flexShrink: 0 }}>
                  <img src={story.ownerPhoto} alt="Store owner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              )}
              <div>
                <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, color: isDark ? "#EDEFEA" : "var(--color-ink)" }}>
                  Our Story
                </h3>
                <p style={{ fontSize: "12px", color: isDark ? "#A0A89C" : "#6B7280", margin: "2px 0 0" }}>
                  Crafted with care at {store.name}
                </p>
              </div>
            </div>

            {story.about && (
              <p style={{ fontSize: "14px", lineHeight: "1.6", color: isDark ? "#D2D8CE" : "#374151", margin: 0, whiteSpace: "pre-line" }}>
                {story.about}
              </p>
            )}

            {/* Certifications & Badges (max 6) */}
            {story.certs && story.certs.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", paddingTop: "8px", borderTop: isDark ? "1px solid #2A322A" : "1px solid #F0F4EC" }}>
                {story.certs.slice(0, 6).map((cert, idx) => (
                  <span
                    key={idx}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      padding: "4px 12px",
                      borderRadius: "9999px",
                      background: isDark ? "rgba(255,255,255,0.06)" : "#F0FDF4",
                      color: isDark ? "#86EFAC" : "#166534",
                      border: isDark ? "1px solid rgba(134,239,172,0.2)" : "1px solid #BBF7D0",
                      fontSize: "12px",
                      fontWeight: 600
                    }}
                  >
                    <span>🛡️</span> {typeof cert === "string" ? cert : `${cert.label}${cert.number ? ` (${cert.number})` : ""}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Footer Links to Policies and Shop Info */}
      <footer
        style={{
          borderTop: isDark ? "1px solid #2A322A" : "1px solid #E5EADF",
          background: isDark ? "#141714" : "#F5F8EF",
          padding: "24px 20px",
          marginTop: "40px"
        }}
      >
        <div
          style={{
            maxWidth: "1200px",
            margin: "0 auto",
            display: "flex",
            flexWrap: "wrap",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "16px"
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: brandColor }}>{store.name}</div>
            {info?.address && (
              <div style={{ fontSize: "12px", color: isDark ? "#A0A89C" : "#6B7280", marginTop: "2px" }}>
                {info.address}
              </div>
            )}
            {(info?.gstin || info?.fssai) && (
              <div style={{ fontSize: "11px", color: isDark ? "#71796F" : "#9CA3AF", marginTop: "4px", display: "flex", gap: "10px" }}>
                {info.gstin && <span>GSTIN: {info.gstin}</span>}
                {info.fssai && <span>FSSAI: {info.fssai}</span>}
              </div>
            )}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", alignItems: "center" }}>
            {info && (
              <button
                type="button"
                onClick={() => setActivePolicyModal("info")}
                style={{ background: "none", border: "none", color: isDark ? "#EDEFEA" : "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Store Hours & Info
              </button>
            )}
            {policies?.returns && (
              <button
                type="button"
                onClick={() => setActivePolicyModal("returns")}
                style={{ background: "none", border: "none", color: isDark ? "#EDEFEA" : "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Return Policy
              </button>
            )}
            {policies?.shipping && (
              <button
                type="button"
                onClick={() => setActivePolicyModal("shipping")}
                style={{ background: "none", border: "none", color: isDark ? "#EDEFEA" : "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Shipping Policy
              </button>
            )}
            {policies?.privacy && (
              <button
                type="button"
                onClick={() => setActivePolicyModal("privacy")}
                style={{ background: "none", border: "none", color: isDark ? "#EDEFEA" : "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer", textDecoration: "underline" }}
              >
                Privacy Notice
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Policy / Info Modal */}
      {activePolicyModal && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.6)", padding: "20px" }}>
          <div style={{ background: isDark ? "#1E221E" : "#FFFFFF", color: isDark ? "#EDEFEA" : "#1A1D1A", borderRadius: "20px", maxWidth: "540px", width: "100%", padding: "28px", maxHeight: "85vh", overflowY: "auto" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, margin: 0, textTransform: "capitalize" }}>
                {activePolicyModal === "info" ? "Store Information & Hours" : `${activePolicyModal} Policy`}
              </h3>
              <button
                type="button"
                onClick={() => setActivePolicyModal(null)}
                style={{ background: "none", border: "none", fontSize: "18px", color: isDark ? "#A0A89C" : "#6B7280", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            {activePolicyModal === "info" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "14px", fontSize: "13px" }}>
                {info?.address && (
                  <div>
                    <b>Address:</b>
                    <div style={{ color: isDark ? "#A0A89C" : "#4B5563", marginTop: "2px" }}>{info.address}</div>
                  </div>
                )}
                {info?.hours && (
                  <div>
                    <b>Weekly Operating Hours (IST):</b>
                    <div style={{ marginTop: "6px", display: "flex", flexDirection: "column", gap: "4px" }}>
                      {Object.entries(info.hours).map(([day, h]) => (
                        <div key={day} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", borderBottom: isDark ? "1px solid #2B332B" : "1px solid #F0F4EC" }}>
                          <span>{day}</span>
                          <span style={{ fontWeight: 600 }}>{h.closed ? "Closed" : `${h.open} - ${h.close}`}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {info?.holidays && info.holidays.length > 0 && (
                  <div>
                    <b>Upcoming Holidays:</b>
                    <div style={{ color: isDark ? "#A0A89C" : "#4B5563", marginTop: "2px" }}>
                      {info.holidays.map(h => typeof h === "string" ? h : `${h.date}${h.label ? ` (${h.label})` : ""}`).join(", ")}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ fontSize: "14px", lineHeight: "1.6", color: isDark ? "#D2D8CE" : "#374151", whiteSpace: "pre-line" }}>
                {activePolicyModal === "returns" && ((typeof policies?.returns === "string" ? policies.returns : policies?.returns?.text) || "Standard 7-day return policy for unused and defective items.")}
                {activePolicyModal === "shipping" && ((typeof policies?.shipping === "string" ? policies.shipping : policies?.shipping?.text) || "Orders are processed and dispatched within 24 to 48 hours.")}
                {activePolicyModal === "privacy" && ((typeof policies?.privacy === "string" ? policies.privacy : policies?.privacy?.text) || "Customer contact and address information is solely used to fulfill your orders.")}
              </div>
            )}

            <button
              type="button"
              onClick={() => setActivePolicyModal(null)}
              style={{ marginTop: "20px", width: "100%", padding: "10px", borderRadius: "9999px", background: brandColor, color: "#FFFFFF", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
