import React, { useState, useEffect } from "react";
import { SessionContext, Store, Membership } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { generateQrSvg, downloadQrPng } from "../../utils/qr";
import { ThreeCounterStand } from "../../components/ThreeCounterStand";

interface Props {
  session: SessionContext;
}

export const QrStandsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);
  const [activeView, setActiveView] = useState<"2d" | "3d">("3d");

  useEffect(() => {
    const load = async () => {
      const s = await defaultRepository.getStoreById(session.storeId);
      const m = await defaultRepository.getMembershipByUserAndStore(session.userId, session.storeId);
      setStore(s);
      setMembership(m);
    };
    load();
  }, [session]);

  if (!store) return <div style={{ padding: "20px" }}>Loading QR stands...</div>;

  const baseUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;
  const staffUrl = membership?.referralCode && membership.role === "staff"
    ? `${baseUrl}?ref=${membership.referralCode}`
    : null;

  return (
    <div style={{ maxWidth: "880px", paddingBottom: "40px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "8px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "28px", margin: "0 0 6px" }}>QR Stands & Store Links</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: 0 }}>
            Print your counter stand, place it on display tables, or send your link directly to customers.
          </p>
        </div>

        {/* 2D / 3D Switcher */}
        <div style={{ background: "#E5EADF", padding: "3px", borderRadius: "9999px", display: "flex", gap: "2px" }}>
          <button
            onClick={() => setActiveView("3d")}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 700,
              background: activeView === "3d" ? "#FFFFFF" : "transparent",
              color: activeView === "3d" ? "var(--color-forest)" : "var(--color-muted)",
              boxShadow: activeView === "3d" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
            }}
          >
            ✨ 3D Counter Stand
          </button>
          <button
            onClick={() => setActiveView("2d")}
            style={{
              padding: "6px 14px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 700,
              background: activeView === "2d" ? "#FFFFFF" : "transparent",
              color: activeView === "2d" ? "var(--color-forest)" : "var(--color-muted)",
              boxShadow: activeView === "2d" ? "0 2px 6px rgba(0,0,0,0.06)" : "none"
            }}
          >
            📄 2D Printable
          </button>
        </div>
      </div>

      {/* 3D Stand Preview Container */}
      {activeView === "3d" && (
        <div style={{ margin: "24px 0" }}>
          <ThreeCounterStand
            storeName={store.name}
            brandColor={store.brandColor}
            storeUrl={baseUrl}
            height={360}
          />
        </div>
      )}

      {/* Main Counter Display Stand Details Card */}
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: "24px",
          border: "1px solid #E5EADF",
          padding: "24px",
          display: "flex",
          flexWrap: "wrap",
          gap: "28px",
          alignItems: "center",
          marginBottom: "32px",
          marginTop: activeView === "2d" ? "24px" : "0"
        }}
      >
        <div style={{ textAlign: "center", flexShrink: 0, margin: "0 auto" }}>
          <div
            dangerouslySetInnerHTML={{ __html: generateQrSvg(baseUrl, 200, store.brandColor) }}
            style={{ width: "200px", height: "200px", borderRadius: "16px", overflow: "hidden", border: "1px solid #E5EADF" }}
          />
          <div style={{ marginTop: "10px", fontSize: "12px", color: "var(--color-muted)", fontWeight: 600 }}>
            Scan with any phone camera
          </div>
        </div>

        <div style={{ flex: 1, minWidth: "260px" }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
            Public Store Stand
          </span>
          <h2 style={{ fontSize: "24px", fontWeight: 800, margin: "8px 0 6px", color: store.brandColor }}>
            {store.name}
          </h2>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 16px", lineHeight: "20px" }}>
            {store.description}
          </p>

          <div
            style={{
              background: "#F5F8EF",
              padding: "10px 14px",
              borderRadius: "12px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "8px",
              marginBottom: "16px"
            }}
          >
            <span
              style={{
                fontFamily: "monospace",
                fontSize: "12px",
                color: "var(--color-ink)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap"
              }}
            >
              {baseUrl}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(baseUrl);
                alert("Copied store link to clipboard!");
              }}
              style={{
                background: "#FFFFFF",
                border: "1px solid #DCE3D6",
                padding: "6px 12px",
                borderRadius: "8px",
                fontSize: "12px",
                fontWeight: 600,
                flexShrink: 0
              }}
            >
              Copy
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              onClick={() => downloadQrPng(baseUrl, `${store.slug}-counter-stand.png`, store.brandColor)}
              style={{
                padding: "12px 22px",
                borderRadius: "9999px",
                background: store.brandColor,
                color: "#FFFFFF",
                fontWeight: 700,
                fontSize: "14px"
              }}
            >
              Download Stand PNG
            </button>
            <button
              onClick={() => window.open(baseUrl, "_blank")}
              style={{
                padding: "12px 20px",
                borderRadius: "9999px",
                background: "#F0F4EC",
                color: "var(--color-ink)",
                fontWeight: 600,
                fontSize: "14px"
              }}
            >
              Preview Live Store ↗
            </button>
          </div>
        </div>
      </div>

      {/* Staff Personal Stand (if staff user) */}
      {staffUrl && (
        <div
          style={{
            background: "#FFFFFF",
            borderRadius: "24px",
            border: "2px dashed var(--color-forest)",
            padding: "24px",
            display: "flex",
            flexWrap: "wrap",
            gap: "28px",
            alignItems: "center"
          }}
        >
          <div style={{ textAlign: "center", flexShrink: 0, margin: "0 auto" }}>
            <div
              dangerouslySetInnerHTML={{ __html: generateQrSvg(staffUrl, 180, store.brandColor) }}
              style={{ width: "180px", height: "180px", borderRadius: "16px", overflow: "hidden", border: "1px solid #E5EADF" }}
            />
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-forest)", fontWeight: 700 }}>
              Code: {membership?.referralCode}
            </div>
          </div>

          <div style={{ flex: 1, minWidth: "260px" }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
              Staff Personal QR
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "8px 0 6px" }}>Your Personal Referral Code</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 16px", lineHeight: "20px" }}>
              When customers scan this code or use your link, orders and commissions are automatically attributed to you.
            </p>

            <div
              style={{
                background: "#F5F8EF",
                padding: "10px 14px",
                borderRadius: "12px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "8px",
                marginBottom: "16px"
              }}
            >
              <span style={{ fontFamily: "monospace", fontSize: "12px", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {staffUrl}
              </span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(staffUrl);
                  alert("Copied personal referral link!");
                }}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #DCE3D6",
                  padding: "6px 12px",
                  borderRadius: "8px",
                  fontSize: "12px",
                  fontWeight: 600,
                  flexShrink: 0
                }}
              >
                Copy
              </button>
            </div>

            <button
              onClick={() => downloadQrPng(staffUrl, `${store.slug}-staff-${membership?.referralCode}.png`, store.brandColor)}
              style={{ padding: "10px 20px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "13px" }}
            >
              Download My Stand PNG
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
