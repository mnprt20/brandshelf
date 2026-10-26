export interface RecommendedProduct {
  name: string;
  categoryName: string;
  description: string;
  pricePaise: number;
  stock: number | null;
  image?: string;
}

export interface BrandTypeDefinition {
  id: string;
  title: string;
  emoji: string;
  tagline: string;
  recommendedTheme: "classic" | "minimal" | "bold";
  recommendedBrandColor: string;
  recommendedCategories: string[];
  starterProducts: RecommendedProduct[];
}

export const BRAND_TYPES: Record<string, BrandTypeDefinition> = {
  apparel: {
    id: "apparel",
    title: "Apparel & Fashion",
    emoji: "👕",
    tagline: "Clothing, streetwear, outerwear and fashion accessories",
    recommendedTheme: "minimal",
    recommendedBrandColor: "#1B3B2B",
    recommendedCategories: [
      "Men's Wear",
      "Women's Wear",
      "Upper Wear & Tops",
      "Lowers & Trousers",
      "Outerwear & Jackets",
      "Accessories & Bags"
    ],
    starterProducts: [
      {
        name: "Oversized Heavyweight Cotton Tee",
        categoryName: "Upper Wear & Tops",
        description: "240 GSM organic combed cotton with dropped shoulder silhouette.",
        pricePaise: 149900,
        stock: 25,
        image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Relaxed Fit Pleated Chinos",
        categoryName: "Lowers & Trousers",
        description: "Breathable cotton twill with deep front pleats and tapered ankle.",
        pricePaise: 249900,
        stock: 18,
        image: "https://images.unsplash.com/photo-1624378439575-d8705ad7ae80?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Washed Linen Camp Shirt",
        categoryName: "Men's Wear",
        description: "Pure European linen with notched resort collar and corozo buttons.",
        pricePaise: 219900,
        stock: 15,
        image: "https://images.unsplash.com/photo-1596755094514-f87e34085b2c?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Canvas Field Tote Bag",
        categoryName: "Accessories & Bags",
        description: "Heavy canvas tote with reinforced handles and interior zip pocket.",
        pricePaise: 89900,
        stock: 30,
        image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  bakery: {
    id: "bakery",
    title: "Bakery & Desserts",
    emoji: "🥐",
    tagline: "Artisan sourdough, pastries, cookies, and specialty morning bakes",
    recommendedTheme: "classic",
    recommendedBrandColor: "#08482D",
    recommendedCategories: [
      "Breads & Sourdough",
      "Pastries & Croissants",
      "Cookies & Brownies",
      "Cakes & Tarts",
      "Savory Bakes",
      "Hot Beverages"
    ],
    starterProducts: [
      {
        name: "Country Sourdough Loaf",
        categoryName: "Breads & Sourdough",
        description: "36-hour cold fermented wild sourdough with blistered crust.",
        pricePaise: 28000,
        stock: 14,
        image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Golden Flaky Butter Croissant",
        categoryName: "Pastries & Croissants",
        description: "Laminated French pastry layers with Normandy cultured butter.",
        pricePaise: 16000,
        stock: 20,
        image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Sea Salt Dark Chocolate Chunk Cookie",
        categoryName: "Cookies & Brownies",
        description: "Crispy edges, gooey center infused with 70% dark Belgian cocoa.",
        pricePaise: 12000,
        stock: 35,
        image: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  coffee: {
    id: "coffee",
    title: "Specialty Coffee & Cafe",
    emoji: "☕",
    tagline: "Single-origin pour-overs, cold brews, whole beans and barista drinks",
    recommendedTheme: "minimal",
    recommendedBrandColor: "#1F2923",
    recommendedCategories: [
      "Hot Brews & Espresso",
      "Cold Brews & Tonics",
      "Roasted Whole Beans",
      "Specialty Teas",
      "Snacks & Toasties"
    ],
    starterProducts: [
      {
        name: "Monsooned Malabar Whole Beans (250g)",
        categoryName: "Roasted Whole Beans",
        description: "Mellow acidity, spice notes, and thick crema from shade-grown estates.",
        pricePaise: 55000,
        stock: 20,
        image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Citrus Nitro Cold Brew",
        categoryName: "Cold Brews & Tonics",
        description: "18-hour steep infused with nitrogen and Meyer lemon peel.",
        pricePaise: 26000,
        stock: null,
        image: "https://images.unsplash.com/photo-1517701604599-bb29b565090c?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  grocery: {
    id: "grocery",
    title: "Organics, Farm & Grocery",
    emoji: "🥗",
    tagline: "Cold-pressed oils, grains, raw honey, spices and healthy pantry items",
    recommendedTheme: "bold",
    recommendedBrandColor: "#005F40",
    recommendedCategories: [
      "Cold-Pressed Oils",
      "Grains, Rice & Flours",
      "Raw Honey & Natural Sweeteners",
      "Spices & Seasonings",
      "Superfoods & Nuts"
    ],
    starterProducts: [
      {
        name: "Wood-Pressed Yellow Mustard Oil (1L)",
        categoryName: "Cold-Pressed Oils",
        description: "Single-press stone mill extracted without heat or chemical solvents.",
        pricePaise: 38000,
        stock: 30,
        image: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Raw Himalayan Forest Honey (500g)",
        categoryName: "Raw Honey & Natural Sweeteners",
        description: "Unfiltered, unpasteurized amber nectar collected by wild bees.",
        pricePaise: 49000,
        stock: 25,
        image: "https://images.unsplash.com/photo-1587049352846-4a222e784d38?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  pottery: {
    id: "pottery",
    title: "Pottery, Crafts & Home Decor",
    emoji: "🏺",
    tagline: "Handcrafted ceramics, dinnerware, home accents and artisanal gifts",
    recommendedTheme: "minimal",
    recommendedBrandColor: "#2D4A3E",
    recommendedCategories: [
      "Ceramic Tableware",
      "Mugs & Cups",
      "Vases & Planters",
      "Home Linens & Soft Decor",
      "Gift Sets"
    ],
    starterProducts: [
      {
        name: "Hand-Thrown Speckled Ceramic Mug",
        categoryName: "Mugs & Cups",
        description: "Stoneware clay finished with non-toxic satin matte glaze.",
        pricePaise: 75000,
        stock: 12,
        image: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80"
      },
      {
        name: "Wabi-Sabi Fluted Vase",
        categoryName: "Vases & Planters",
        description: "Sculptural tabletop vase with organic fluted ribs and rough clay finish.",
        pricePaise: 165000,
        stock: 8,
        image: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  beauty: {
    id: "beauty",
    title: "Beauty, Skincare & Wellness",
    emoji: "💄",
    tagline: "Natural serums, bath essentials, aromatherapy and personal care",
    recommendedTheme: "classic",
    recommendedBrandColor: "#1A4D3B",
    recommendedCategories: [
      "Facial Care & Serums",
      "Body & Bath",
      "Haircare Oils & Masks",
      "Aromatherapy & Candles",
      "Wellness Bundles"
    ],
    starterProducts: [
      {
        name: "Botanical Glow Face Elixir (30ml)",
        categoryName: "Facial Care & Serums",
        description: "Cold-pressed rosehip, jojoba, and saffron essential oil blend.",
        pricePaise: 125000,
        stock: 20,
        image: "https://images.unsplash.com/photo-1608248597359-57e750e33ef7?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  footwear: {
    id: "footwear",
    title: "Footwear & Shoes",
    emoji: "👟",
    tagline: "Sneakers, leather formal shoes, sandals, and shoe care",
    recommendedTheme: "bold",
    recommendedBrandColor: "#0D2E1F",
    recommendedCategories: [
      "Sneakers & Casual",
      "Formal & Loafers",
      "Sandals & Slides",
      "Shoe Care & Insoles"
    ],
    starterProducts: [
      {
        name: "Minimalist Leather Court Sneaker",
        categoryName: "Sneakers & Casual",
        description: "Full-grain calfskin with cushioned natural rubber cupsole.",
        pricePaise: 399900,
        stock: 15,
        image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  jewelry: {
    id: "jewelry",
    title: "Jewelry & Accessories",
    emoji: "💍",
    tagline: "Rings, necklaces, bracelets, silver jewelry, and fine adornments",
    recommendedTheme: "minimal",
    recommendedBrandColor: "#1B3B2B",
    recommendedCategories: [
      "Rings & Bands",
      "Necklaces & Chains",
      "Earrings & Studs",
      "Bracelets & Cuffs",
      "Silver Collectibles"
    ],
    starterProducts: [
      {
        name: "Handcrafted 925 Sterling Hammered Band",
        categoryName: "Rings & Bands",
        description: "Solid silver band with artisanal hammered facets.",
        pricePaise: 189900,
        stock: 10,
        image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  electronics: {
    id: "electronics",
    title: "Gadgets & Accessories",
    emoji: "📱",
    tagline: "Cases, chargers, wireless audio, stands and desk gear",
    recommendedTheme: "bold",
    recommendedBrandColor: "#004D36",
    recommendedCategories: [
      "Phone Cases & Covers",
      "Cables & Fast Chargers",
      "Wireless Audio & Earbuds",
      "Desk Accessories & Mounts"
    ],
    starterProducts: [
      {
        name: "Braided 100W USB-C Fast Cable (2M)",
        categoryName: "Cables & Fast Chargers",
        description: "Reinforced nylon aramid weave with aluminum shell connectors.",
        pricePaise: 79900,
        stock: 40,
        image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=500&auto=format&fit=crop&q=80"
      }
    ]
  },
  custom: {
    id: "custom",
    title: "General Boutique / Custom",
    emoji: "✨",
    tagline: "Custom store tailored to any unique product collection",
    recommendedTheme: "classic",
    recommendedBrandColor: "#08482D",
    recommendedCategories: [
      "Featured Collection",
      "Best Sellers",
      "New Arrivals",
      "Special Offers"
    ],
    starterProducts: [
      {
        name: "Signature Collection Item",
        categoryName: "Featured Collection",
        description: "Premium product curated specially for your shop.",
        pricePaise: 99900,
        stock: 20
      }
    ]
  }
};
