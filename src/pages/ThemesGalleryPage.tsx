import React from "react";
import { THEME_REGISTRY } from "../themes/registry";

interface Props {
  onNavigate: (route: string) => void;
}

export const ThemesGalleryPage: React.FC<Props> = ({ onNavigate }) => {
  return (
    <div style={{ maxWidth: "1200px", margin: "40px auto", padding: "0 24px" }}>
      <button onClick={() => onNavigate("#/")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600, fontSize: "14px", marginBottom: "16px" }}>
        ← Back to Home
      </button>
      <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "36px", margin: "0 0 8px" }}>Storefront Theme Gallery</h1>
      <p style={{ color: "var(--color-muted)", fontSize: "15px", marginBottom: "40px" }}>
        Each theme is an independent layout designed to work across all device widths.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "32px" }}>
        {Object.values(THEME_REGISTRY).map(theme => (
          <div key={theme.key} style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden", display: "flex", flexDirection: "column" }}>
            <div style={{ height: "160px", backgroundColor: theme.palette[1], display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ display: "flex", gap: "8px" }}>
                {theme.palette.map((hex, i) => (
                  <div key={i} style={{ width: "32px", height: "32px", borderRadius: "50%", backgroundColor: hex, border: "2px solid #FFFFFF" }} />
                ))}
              </div>
            </div>
            <div style={{ padding: "24px", flex: 1, display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <h3 style={{ fontSize: "20px", fontWeight: 700, margin: 0 }}>{theme.name}</h3>
                <span style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "1px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "2px 8px", borderRadius: "9999px", fontWeight: 700 }}>
                  Min: {theme.minPlan}
                </span>
              </div>
              <p style={{ fontSize: "14px", color: "var(--color-muted)", margin: "0 0 20px", flex: 1 }}>{theme.description}</p>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => onNavigate(`#/themes/${theme.key}`)}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 600, fontSize: "14px" }}
                >
                  Interactive Preview
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
