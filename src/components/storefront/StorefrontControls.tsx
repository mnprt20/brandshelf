import React, { useState } from "react";
import { Language, LANGUAGE_LABELS } from "../../i18n/useT";
import { usePwaInstall } from "../../utils/pwa";

export type ThemeMode = "system" | "light" | "dark";
export type TextSize = "normal" | "large" | "xlarge";

interface Props {
  language: Language;
  onSelectLanguage: (lang: Language) => void;
  themeMode: ThemeMode;
  onSelectThemeMode: (mode: ThemeMode) => void;
  textSize: TextSize;
  onSelectTextSize: (size: TextSize) => void;
  brandColor?: string;
  isDark?: boolean;
}

export const StorefrontControls: React.FC<Props> = ({
  language,
  onSelectLanguage,
  themeMode,
  onSelectThemeMode,
  textSize,
  onSelectTextSize,
  brandColor = "#08482D",
  isDark = false
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [showIosHint, setShowIosHint] = useState(false);
  const { canInstall, isInstalled, isIos, installApp } = usePwaInstall();

  const handleInstallClick = async () => {
    if (canInstall) {
      await installApp();
    } else if (isIos && !isInstalled) {
      setShowIosHint(true);
    }
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", position: "relative" }}>
      {/* Language Switcher Pills */}
      <div
        style={{
          display: "flex",
          background: isDark ? "rgba(255,255,255,0.08)" : "#F0F4EC",
          borderRadius: "9999px",
          padding: "3px",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #DCE3D6"
        }}
      >
        {(["en", "hi", "pa"] as Language[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => onSelectLanguage(l)}
            style={{
              padding: "4px 10px",
              borderRadius: "9999px",
              fontSize: "12px",
              fontWeight: 700,
              background: language === l ? brandColor : "transparent",
              color: language === l ? "#FFFFFF" : isDark ? "#EDEFEA" : "var(--color-ink)",
              border: "none",
              cursor: "pointer",
              transition: "background 0.15s ease"
            }}
          >
            {l === "en" ? "EN" : l === "hi" ? "हिन्दी" : "ਪੰਜਾਬੀ"}
          </button>
        ))}
      </div>

      {/* PWA Install Button (if installable or on iOS) */}
      {(canInstall || (isIos && !isInstalled)) && (
        <button
          type="button"
          onClick={handleInstallClick}
          title="Install app to home screen"
          style={{
            padding: "5px 12px",
            borderRadius: "9999px",
            background: brandColor,
            color: "#FFFFFF",
            fontSize: "12px",
            fontWeight: 700,
            border: "none",
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: "5px"
          }}
        >
          <span>📲</span> Install
        </button>
      )}

      {/* Display Settings Menu Trigger */}
      <button
        type="button"
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        title="Display & Accessibility Options"
        style={{
          width: "32px",
          height: "32px",
          borderRadius: "50%",
          background: isDark ? "rgba(255,255,255,0.08)" : "#F0F4EC",
          color: isDark ? "#EDEFEA" : "var(--color-ink)",
          border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #DCE3D6",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "15px",
          cursor: "pointer"
        }}
      >
        ⚙️
      </button>

      {/* Display Settings Popover */}
      {isMenuOpen && (
        <div
          style={{
            position: "absolute",
            top: "40px",
            right: 0,
            zIndex: 999,
            width: "240px",
            background: isDark ? "#1E221E" : "#FFFFFF",
            borderRadius: "16px",
            border: isDark ? "1px solid #2E362E" : "1px solid #E5EADF",
            boxShadow: "0 10px 25px rgba(0,0,0,0.2)",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "14px"
          }}
        >
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#EDEFEA" : "#1A1D1A" }}>
              Display Settings
            </span>
            <button
              type="button"
              onClick={() => setIsMenuOpen(false)}
              style={{ background: "none", border: "none", color: isDark ? "#A0A89C" : "#6B7280", fontSize: "14px", cursor: "pointer" }}
            >
              ✕
            </button>
          </div>

          {/* Theme Option */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: isDark ? "#A0A89C" : "#5E5E61", marginBottom: "6px", textTransform: "uppercase" }}>
              Theme Mode
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
              {(["system", "light", "dark"] as ThemeMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => onSelectThemeMode(mode)}
                  style={{
                    padding: "6px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    textTransform: "capitalize",
                    background: themeMode === mode ? brandColor : isDark ? "#141714" : "#F4F7F1",
                    color: themeMode === mode ? "#FFFFFF" : isDark ? "#EDEFEA" : "#374151",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {mode === "system" ? "Auto" : mode}
                </button>
              ))}
            </div>
          </div>

          {/* Text Size Option */}
          <div>
            <label style={{ display: "block", fontSize: "11px", fontWeight: 700, color: isDark ? "#A0A89C" : "#5E5E61", marginBottom: "6px", textTransform: "uppercase" }}>
              Text Size
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px" }}>
              {[
                { id: "normal", label: "100%" },
                { id: "large", label: "118%" },
                { id: "xlarge", label: "135%" }
              ].map((sz) => (
                <button
                  key={sz.id}
                  type="button"
                  onClick={() => onSelectTextSize(sz.id as TextSize)}
                  style={{
                    padding: "6px",
                    borderRadius: "8px",
                    fontSize: "11px",
                    fontWeight: 600,
                    background: textSize === sz.id ? brandColor : isDark ? "#141714" : "#F4F7F1",
                    color: textSize === sz.id ? "#FFFFFF" : isDark ? "#EDEFEA" : "#374151",
                    border: "none",
                    cursor: "pointer"
                  }}
                >
                  {sz.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* iOS Install Hint Modal */}
      {showIosHint && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "20px", maxWidth: "340px", width: "100%", padding: "24px", textAlign: "center" }}>
            <div style={{ fontSize: "36px", marginBottom: "12px" }}>📲</div>
            <h3 style={{ fontSize: "17px", fontWeight: 700, margin: "0 0 8px", color: "#111827" }}>
              Install this Storefront
            </h3>
            <p style={{ fontSize: "13px", color: "#4B5563", lineHeight: "1.5", margin: "0 0 16px" }}>
              To add this shop to your home screen:
              <br />
              1. Tap the <b>Share</b> button in Safari
              <br />
              2. Scroll down and choose <b>Add to Home Screen</b>
            </p>
            <button
              onClick={() => setShowIosHint(false)}
              style={{ width: "100%", padding: "10px", borderRadius: "9999px", background: brandColor, color: "#FFF", fontWeight: 700, border: "none", cursor: "pointer" }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
