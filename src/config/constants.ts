export const PROJECT_NAME = "MintShelf";

export const PLAN_PRICES: Record<"offline" | "franchise" | "online", number | null> = {
  offline: null,
  franchise: null,
  online: null
};

export interface PlanDefinition {
  slug: "offline" | "franchise" | "online";
  name: string;
  tagline: string;
  maxUsersIncluded: number;
  aiDailyQuota: number;
  features: string[];
}

export const PLANS: Record<"offline" | "franchise" | "online", PlanDefinition> = {
  offline: {
    slug: "offline",
    name: "Offline Catalogue",
    tagline: "For boutique counters & solo shops",
    maxUsersIncluded: 1,
    aiDailyQuota: 30,
    features: [
      "Max 1 user (owner only)",
      "Public catalogue & store QR code",
      "Scan-to-order with manual UPI confirmation",
      "AI assistant (30 messages / day)"
    ]
  },
  franchise: {
    slug: "franchise",
    name: "Franchise",
    tagline: "For stores with floor teams and affiliates",
    maxUsersIncluded: 2,
    aiDailyQuota: 100,
    features: [
      "2 users included + expandable seats",
      "Staff logins with personal QR codes",
      "Per-seller referral attribution",
      "Owner sales reports & breakdown",
      "AI assistant (100 messages / day)"
    ]
  },
  online: {
    slug: "online",
    name: "Online App",
    tagline: "For modern full-service digital businesses",
    maxUsersIncluded: 5,
    aiDailyQuota: 300,
    features: [
      "Everything in Franchise",
      "5 users included + expandable seats",
      "Customer accounts with saved addresses",
      "Pickup & delivery checkout with stock tracking",
      "Live order status tracker & Install App PWA assets",
      "AI assistant (300 messages / day)"
    ]
  }
};
