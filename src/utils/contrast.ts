/**
 * WCAG 2.1 Contrast Helper
 * Calculates relative luminance and contrast ratio, and adjusts brand color
 * to ensure at least 4.5:1 contrast against the surface background.
 */

interface RGB {
  r: number;
  g: number;
  b: number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

function parseHex(hex: string): RGB {
  let clean = hex.replace("#", "").trim();
  if (clean.length === 3) {
    clean = clean.split("").map((c) => c + c).join("");
  }
  const num = parseInt(clean, 16);
  if (isNaN(num)) return { r: 16, g: 185, b: 129 }; // Default emerald fallback
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

function rgbToHex(rgb: RGB): string {
  const toHex = (c: number) => {
    const clamped = Math.max(0, Math.min(255, Math.round(c)));
    return clamped.toString(16).padStart(2, "0");
  };
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}`;
}

function rgbToHsl(rgb: RGB): HSL {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
}

function hslToRgb(hsl: HSL): RGB {
  const h = hsl.h / 360;
  const s = hsl.s / 100;
  const l = hsl.l / 100;

  if (s === 0) {
    const val = Math.round(l * 255);
    return { r: val, g: val, b: val };
  }

  const hue2rgb = (p: number, q: number, t: number) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;

  return {
    r: Math.round(hue2rgb(p, q, h + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, h) * 255),
    b: Math.round(hue2rgb(p, q, h - 1 / 3) * 255)
  };
}

export function getRelativeLuminance(rgb: RGB): number {
  const transform = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * transform(rgb.r) + 0.7152 * transform(rgb.g) + 0.0722 * transform(rgb.b);
}

export function getContrastRatio(colorA: string, colorB: string): number {
  const rgbA = parseHex(colorA);
  const rgbB = parseHex(colorB);
  const lumA = getRelativeLuminance(rgbA);
  const lumB = getRelativeLuminance(rgbB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Ensures brandColor has at least `targetRatio` (default 4.5:1) against surfaceColor.
 * If surface is dark, lightness is stepped up; if surface is light, lightness is stepped down.
 */
export function ensureContrast(brandColor: string, surfaceColor: string, targetRatio = 4.5): string {
  if (!brandColor || !surfaceColor) return brandColor || "#10b981";

  const surfaceRgb = parseHex(surfaceColor);
  const surfaceLum = getRelativeLuminance(surfaceRgb);
  const isDarkSurface = surfaceLum < 0.4;

  let currentRatio = getContrastRatio(brandColor, surfaceColor);
  if (currentRatio >= targetRatio) {
    return brandColor;
  }

  const brandRgb = parseHex(brandColor);
  const hsl = rgbToHsl(brandRgb);

  // Iteratively adjust lightness
  let bestColor = brandColor;
  let bestRatio = currentRatio;

  for (let step = 1; step <= 30; step++) {
    const nextHsl: HSL = {
      ...hsl,
      l: isDarkSurface
        ? Math.min(95, hsl.l + step * 2.5) // Lighten for dark surface
        : Math.max(5, hsl.l - step * 2.5)  // Darken for light surface
    };
    const testRgb = hslToRgb(nextHsl);
    const testHex = rgbToHex(testRgb);
    const ratio = getContrastRatio(testHex, surfaceColor);

    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestColor = testHex;
    }
    if (ratio >= targetRatio) {
      return testHex;
    }
  }

  return bestColor;
}
