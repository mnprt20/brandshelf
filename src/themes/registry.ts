import { ThemeDescriptor } from "./types";

export const THEME_REGISTRY: Record<string, ThemeDescriptor> = {
  classic: {
    key: "classic",
    name: "Classic Grid",
    description: "Balanced, clean multi-column card layout with generous whitespace.",
    version: "1.0.0",
    tags: ["balanced", "retail", "universal"],
    palette: ["#08482D", "#DAE7C7", "#FFFFFF", "#101410"],
    defaultBrandColor: "#08482D",
    minPlan: "offline"
  },
  minimal: {
    key: "minimal",
    name: "Minimalist Studio",
    description: "Airy, typographic list layout with subtle imagery and sleek lines.",
    version: "1.0.0",
    tags: ["editorial", "boutique", "fashion"],
    palette: ["#232b2b", "#E8ECE9", "#FFFFFF", "#353839"],
    defaultBrandColor: "#1B3B2B",
    minPlan: "offline"
  },
  bold: {
    key: "bold",
    name: "Bold Showcase",
    description: "High-contrast visual hierarchy with immersive imagery and prominent CTAs.",
    version: "1.0.0",
    tags: ["vibrant", "food", "high-impact"],
    palette: ["#005F40", "#C5E0B4", "#FFFDF9", "#002010"],
    defaultBrandColor: "#005F40",
    minPlan: "offline"
  }
};

export function validateThemeKey(key: string): boolean {
  if (!key || typeof key !== "string") return false;
  const regex = /^[a-z0-9_-]{2,30}$/;
  return regex.test(key) && key in THEME_REGISTRY;
}

export function validateBrandColor(color: string): boolean {
  if (!color || typeof color !== "string") return false;
  // Must be strictly #RRGGBB (hex 6 characters)
  const regex = /^#[0-9A-Fa-f]{6}$/;
  if (!regex.test(color)) return false;
  if (color.includes(";") || color.includes("}") || color.includes("{")) return false;
  return true;
}

export function resolveTheme(key: string): ThemeDescriptor {
  if (validateThemeKey(key)) {
    return THEME_REGISTRY[key];
  }
  return THEME_REGISTRY["classic"];
}
