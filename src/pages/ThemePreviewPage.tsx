import React, { useState } from "react";
import { resolveTheme } from "../themes/registry";
import { ClassicTheme } from "../themes/classic";
import { MinimalTheme } from "../themes/minimal";
import { BoldTheme } from "../themes/bold";
import { Product, Category, Store } from "../types";

interface Props {
  themeKey: string;
  onNavigate: (route: string) => void;
}

export const ThemePreviewPage: React.FC<Props> = ({ themeKey, onNavigate }) => {
  const [deviceWidth, setDeviceWidth] = useState<"mobile" | "tablet" | "desktop">("desktop");
  const theme = resolveTheme(themeKey);

  const demoStore: Store = {
    id: "demo_preview_store",
    ownerUserId: "demo_user",
    name: "Artisan Studio Demo",
    slug: "demo-preview",
    planSlug: "offline",
    themeKey: theme.key,
    brandColor: theme.defaultBrandColor,
    description: "Sample storefront showing layout and palette in action.",
    extraSeats: 0,
    isActive: true,
    onlineOpen: true,
    pickupEnabled: true,
    deliveryEnabled: true,
    deliveryFeePaise: 4000,
    freeDeliveryAbovePaise: 50000,
    minOrderPaise: 10000,
    deliveryNote: "Local deliveries within 5km.",
    acceptUpiQr: true,
    acceptCod: true,
    upiId: "demo@upi",
    createdAt: Date.now()
  };

  const demoCategories: Category[] = [
    { id: "c1", storeId: "demo", name: "Featured", sortOrder: 1 },
    { id: "c2", storeId: "demo", name: "Signature Crafts", sortOrder: 2 },
    { id: "c3", storeId: "demo", name: "Everyday Essentials", sortOrder: 3 }
  ];

  const demoProducts: Product[] = Array.from({ length: 12 }).map((_, i) => ({
    id: `demo_prod_${i + 1}`,
    storeId: "demo",
    categoryId: i < 4 ? "c1" : i < 8 ? "c2" : "c3",
    name: `Studio Piece #${i + 1}`,
    description: "Carefully proportioned with organic finishes and tactile texture.",
    pricePaise: (i + 1) * 25000,
    stock: i === 5 ? 0 : 10,
    isAvailable: true,
    createdByUserId: "demo",
    createdAt: Date.now()
  }));

  const [activeCat, setActiveCat] = useState<string | null>(null);

  const widthStyle = {
    mobile: "375px",
    tablet: "768px",
    desktop: "100%"
  }[deviceWidth];

  const renderActiveTheme = () => {
    const props = {
      store: demoStore,
      categories: demoCategories,
      products: demoProducts,
      activeCategoryId: activeCat,
      onSelectCategory: setActiveCat,
      cartCount: 2,
      onOpenCart: () => {},
      onAddToCart: () => {},
      isDemo: true
    };

    if (theme.key === "minimal") return <MinimalTheme {...props} />;
    if (theme.key === "bold") return <BoldTheme {...props} />;
    return <ClassicTheme {...props} />;
  };

  return (
    <div style={{ backgroundColor: "#1A1D1A", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <div style={{ background: "#0E110E", color: "#FFFFFF", padding: "12px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid #2A302A" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <button onClick={() => onNavigate("#/themes")} style={{ background: "none", color: "#A8B3A8", fontSize: "14px", fontWeight: 600 }}>
            ← All Themes
          </button>
          <span style={{ fontWeight: 700, fontSize: "15px" }}>Theme Preview: {theme.name}</span>
        </div>

        <div style={{ display: "flex", gap: "8px", background: "#1C241C", padding: "4px", borderRadius: "9999px" }}>
          {(["mobile", "tablet", "desktop"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDeviceWidth(d)}
              style={{
                padding: "6px 14px",
                borderRadius: "9999px",
                background: deviceWidth === d ? "var(--color-forest)" : "none",
                color: "#FFFFFF",
                fontSize: "12px",
                fontWeight: 600,
                textTransform: "capitalize"
              }}
            >
              {d}
            </button>
          ))}
        </div>

        <button
          onClick={() => onNavigate("#/signup")}
          style={{ background: "var(--color-mint)", color: "var(--color-forest)", padding: "8px 18px", borderRadius: "9999px", fontWeight: 700, fontSize: "13px" }}
        >
          Use this theme
        </button>
      </div>

      <div style={{ backgroundColor: "#F59E0B", color: "#000000", textAlign: "center", padding: "6px", fontSize: "12px", fontWeight: 700 }}>
        Demo preview mode (in-memory sample data only · cart & checkout disabled)
      </div>

      <div style={{ flex: 1, display: "flex", justifyContent: "center", overflowY: "auto", padding: deviceWidth === "desktop" ? "0" : "24px 0" }}>
        <div style={{ width: widthStyle, background: "#FFFFFF", minHeight: "100%", boxShadow: deviceWidth === "desktop" ? "none" : "0 8px 30px rgba(0,0,0,0.5)", borderRadius: deviceWidth === "desktop" ? "0" : "16px", overflow: "hidden" }}>
          {renderActiveTheme()}
        </div>
      </div>
    </div>
  );
};
