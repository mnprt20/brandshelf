export const PRODUCT_TYPES = [
  "apparel",
  "footwear",
  "food",
  "eyewear",
  "jewellery",
  "bags",
  "cosmetics",
  "electronics",
  "home",
  "general"
] as const;

export type ProductType = (typeof PRODUCT_TYPES)[number];

export interface PhotoStylePreset {
  label: string;
  background: string;
  lighting: string;
  cameraAngle: string;
  presentation: string;
}

export const PHOTO_STYLE_PRESETS: Record<ProductType, PhotoStylePreset> = {
  apparel: {
    label: "Apparel & Clothing",
    background: "seamless warm-white (#F7F5F2) backdrop",
    lighting: "large soft-box lighting with even illumination",
    cameraAngle: "front-facing flat-lay or invisible-mannequin look",
    presentation: "NO human model, fabric texture and stitching visible, wrinkles gently smoothed"
  },
  footwear: {
    label: "Footwear & Shoes",
    background: "pure white seamless sweep",
    lighting: "diffuse overhead and key studio lighting",
    cameraAngle: "3/4 side angle showcasing the silhouette and sole profile",
    presentation: "soft contact shadow under the shoe grounding the product"
  },
  food: {
    label: "Food, Bakery & Cafe",
    background: "clean light-neutral surface and backdrop",
    lighting: "soft side window light highlighting natural freshness and textures",
    cameraAngle: "30-45 degree appetising angle",
    presentation: "true-to-life colour, NO added garnish, props, steam, sauces or extra pieces"
  },
  eyewear: {
    label: "Eyewear & Glasses",
    background: "pure white to very light grey gradient",
    lighting: "clean diffuse lighting with crisp specular highlights on frames",
    cameraAngle: "3/4 front angle showcasing bridge and temples",
    presentation: "clean undistorted lenses with their ORIGINAL tint, faint soft floor reflection"
  },
  jewellery: {
    label: "Jewellery & Ornaments",
    background: "light grey graduated backdrop",
    lighting: "macro-style soft diffuse light with subtle pinpoint sparkle",
    cameraAngle: "elegant top-angled or 3/4 hero view",
    presentation: "velvet/acrylic display riser or flat-lay on stone, highlight metal lustre and gemstone facets"
  },
  bags: {
    label: "Bags & Luggage",
    background: "neutral off-white studio background",
    lighting: "dual soft-box lighting defining material depth and shape",
    cameraAngle: "straight-on or slight 3/4 front view showing structure",
    presentation: "strap neatly arranged, subtle drop shadow grounding the bag"
  },
  cosmetics: {
    label: "Cosmetics & Skincare",
    background: "pristine pastel or crisp white backdrop",
    lighting: "high-key clean beauty lighting",
    cameraAngle: "upright or 15-degree tilt showing brand label clearly",
    presentation: "delicate soft reflection below, spotless clean finish"
  },
  electronics: {
    label: "Electronics & Gadgets",
    background: "matte grey or crisp white seamless background",
    lighting: "precision edge lighting defining contours and materials (brushed metal, matte plastic, glass)",
    cameraAngle: "3/4 angle showcasing primary face and depth",
    presentation: "ports, screens, and buttons sharp and unaltered"
  },
  home: {
    label: "Home & Living",
    background: "warm off-white or soft linen backdrop",
    lighting: "natural daylight from the side",
    cameraAngle: "clean eye-level or slight 45-degree angle",
    presentation: "staged simply without unrelated clutter, honest material depiction"
  },
  general: {
    label: "General Studio White",
    background: "neutral studio white background",
    lighting: "balanced diffuse three-point lighting",
    cameraAngle: "clean 3/4 hero angle",
    presentation: "soft natural contact shadow, true-to-life materials"
  }
};

export const STANDARD_RULES =
  "Standard studio rules:\n" +
  "- Plain solid-tone studio background, no busy room or outdoor environment.\n" +
  "- No human faces, hands, or models unless the preset specifically permits invisible-mannequin.\n" +
  "- No added props, accessories, text, watermarks, stickers, or store logos.\n" +
  "- Square 1:1 framing with 10% breathing room padding, output 1024x1024.";

export const DETAIL_PRESERVATION_PROMPT =
  "Keep the product itself EXACTLY identical to the original image in every detail: " +
  "same shape, colours, materials, patterns, branding, logos, text, defects, and proportions. " +
  "Do NOT redesign, replace, augment, or stylise the product. " +
  "ONLY change the background, lighting, crop/centering, and gently clean up dust/camera glare.";

export function isValidProductType(val: unknown): val is ProductType {
  return typeof val === "string" && PRODUCT_TYPES.includes(val as ProductType);
}

export function inferProductType(categoryName?: string, brandType?: string): ProductType {
  const cat = (categoryName || "").toLowerCase();

  // Keyword mappings for category name
  if (/\b(sunglass|sunglasses|goggle|goggles|frame|frames|specs|eyewear|spectacles|lens)\b/i.test(cat)) {
    return "eyewear";
  }
  if (/\b(bread|cake|snack|coffee|tea|beverage|pastry|bake|croissant|cookie|brownie|tart|sourdough|toast|food|drink|meal|dessert)\b/i.test(cat)) {
    return "food";
  }
  if (/\b(shirt|tee|t-shirt|jeans|kurta|saree|dress|pant|pants|trouser|trousers|jacket|top|tops|wear|cloth|apparel|hoodie|suit|blazer|skirt)\b/i.test(cat)) {
    return "apparel";
  }
  if (/\b(shoe|shoes|sneaker|sneakers|sandal|sandals|boot|boots|heel|heels|slipper|slippers|footwear|loafers)\b/i.test(cat)) {
    return "footwear";
  }
  if (/\b(ring|necklace|earring|earrings|bracelet|pendant|jewel|jewellery|jewelry|gold|silver|diamond|bangle)\b/i.test(cat)) {
    return "jewellery";
  }
  if (/\b(bag|bags|backpack|wallet|tote|purse|handbag|clutch|luggage|duffle)\b/i.test(cat)) {
    return "bags";
  }
  if (/\b(serum|lotion|cream|lipstick|makeup|perfume|cosmetic|cosmetics|skincare|cleanser|oil|shampoo|wellness|beauty)\b/i.test(cat)) {
    return "cosmetics";
  }
  if (/\b(phone|laptop|headphone|headphones|earbuds|speaker|charger|cable|watch|electronic|gadget|device)\b/i.test(cat)) {
    return "electronics";
  }
  if (/\b(cushion|bedsheet|decor|lamp|vase|candle|linen|pillow|pottery|ceramic|home|kitchen|rug)\b/i.test(cat)) {
    return "home";
  }

  // Fallback to store brandType
  const bt = (brandType || "").toLowerCase();
  if (bt === "apparel") return "apparel";
  if (bt === "footwear") return "footwear";
  if (bt === "bakery" || bt === "coffee" || bt === "grocery") return "food";
  if (bt === "jewelry") return "jewellery";
  if (bt === "beauty") return "cosmetics";
  if (bt === "electronics") return "electronics";
  if (bt === "pottery") return "home";

  return "general";
}

export function buildPhotoPrompt(productType: ProductType, isRetry = false): string {
  const preset = PHOTO_STYLE_PRESETS[productType] || PHOTO_STYLE_PRESETS.general;

  let prompt =
    `Professional e-commerce commercial studio product photography transformation.\n\n` +
    `CRITICAL INSTRUCTION - PRODUCT PRESERVATION:\n${DETAIL_PRESERVATION_PROMPT}\n\n` +
    `STUDIO STYLE SPECIFICATIONS (${preset.label}):\n` +
    `- Background: ${preset.background}\n` +
    `- Lighting: ${preset.lighting}\n` +
    `- Camera Angle & Composition: ${preset.cameraAngle}\n` +
    `- Presentation & Finish: ${preset.presentation}\n\n` +
    `${STANDARD_RULES}\n`;

  if (isRetry) {
    prompt +=
      `\nCRITICAL: You altered the product on the previous try. ` +
      `Do NOT alter the product. Keep every colour, text, and detail identical.\n`;
  }

  return prompt;
}
