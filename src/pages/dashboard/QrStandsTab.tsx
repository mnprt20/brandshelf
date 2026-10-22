import React, { useState, useEffect } from "react";
import { SessionContext, Store, Membership } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { generateQrSvg, downloadQrPng } from "../../utils/qr";

interface Props {
  session: SessionContext;
}

export const QrStandsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null);

  useEffect(() => {
    const load = async () => {
      const s = await defaultRepository.getStoreById(session.storeId);
      const m = await defaultRepository.getMembershipByUserAndStore(session.userId, session.storeId);
      setStore(s);
      setMembership(m);
    };
    load();
  }, [session]);

  if (!store) return <div>Loading QR stands...</div>;

  const baseUrl = `${window.location.origin}${window.location.pathname}#/store/${store.slug}`;
  const staffUrl = membership?.referralCode && membership.role === "staff"
    ? `${baseUrl}?ref=${membership.referralCode}`
    : null;

  return (
    <div style={{ maxWidth: "880px" }}>
      <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: "0 0 8px" }}>QR Stands & Store Links</h1>
      <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "32px" }}>
        Print your counter stand, place it on display tables, or send your link directly to customers.
      </p>

      {/* Main Counter Display Stand */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", padding: "36px", display: "flex", gap: "36px", alignItems: "center", marginBottom: "32px" }}>
        <div style={{ textAlign: "center", flexShrink: 0 }}>
          <div
            dangerouslySetInnerHTML={{ __html: generateQrSvg(baseUrl, 220, store.brandColor) }}
            style={{ width: "220px", height: "220px", borderRadius: "16px", overflow: "hidden", border: "1px solid #E5EADF" }}
          />
          <div style={{ marginTop: "12px", fontSize: "12px", color: "var(--color-muted)", fontWeight: 600 }}>Scan with any phone camera</div>
        </div>

        <div style={{ flex: 1 }}>
          <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
            Public Store Stand
          </span>
          <h2 style={{ fontSize: "26px", fontWeight: 800, margin: "8px 0 6px", color: store.brandColor }}>{store.name}</h2>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 20px" }}>{store.description}</p>

          <div style={{ background: "#F5F8EF", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
            <span style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--color-ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "340px" }}>
              {baseUrl}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(baseUrl);
                alert("Copied store link to clipboard!");
              }}
              style={{ background: "#FFFFFF", border: "1px solid #DCE3D6", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}
            >
              Copy
            </button>
          </div>

          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={() => downloadQrPng(baseUrl, `${store.slug}-counter-stand.png`, store.brandColor)}
              style={{ padding: "12px 24px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
            >
              Download Stand PNG
            </button>
          </div>
        </div>
      </div>

      {/* Staff Personal Stand (if staff user) */}
      {staffUrl && (
        <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "2px dashed var(--color-forest)", padding: "36px", display: "flex", gap: "36px", alignItems: "center" }}>
          <div style={{ textAlign: "center", flexShrink: 0 }}>
            <div
              dangerouslySetInnerHTML={{ __html: generateQrSvg(staffUrl, 180, store.brandColor) }}
              style={{ width: "180px", height: "180px", borderRadius: "16px", overflow: "hidden", border: "1px solid #E5EADF" }}
            />
            <div style={{ marginTop: "8px", fontSize: "12px", color: "var(--color-forest)", fontWeight: 700 }}>Code: {membership?.referralCode}</div>
          </div>

          <div style={{ flex: 1 }}>
            <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "#FEF3C7", color: "#92400E", padding: "4px 10px", borderRadius: "9999px", fontWeight: 700 }}>
              Staff Personal QR
            </span>
            <h3 style={{ fontSize: "20px", fontWeight: 800, margin: "8px 0 6px" }}>Your Personal Referral Code</h3>
            <p style={{ color: "var(--color-muted)", fontSize: "14px", margin: "0 0 16px" }}>
              When customers scan this code or use your link, orders and commissions are automatically attributed to you.
            </p>

            <div style={{ background: "#F5F8EF", padding: "12px 16px", borderRadius: "12px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <span style={{ fontFamily: "monospace", fontSize: "13px", color: "var(--color-ink)" }}>{staffUrl}</span>
              <button
                onClick={() => {
                  navigator.clipboard.writeText(staffUrl);
                  alert("Copied personal referral link!");
                }}
                style={{ background: "#FFFFFF", border: "1px solid #DCE3D6", padding: "6px 12px", borderRadius: "8px", fontSize: "12px", fontWeight: 600 }}
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
