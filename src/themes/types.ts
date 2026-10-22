import { Product, Category, Store } from "../types";

export interface ThemeDescriptor {
  key: string;
  name: string;
  description: string;
  version: string;
  tags: string[];
  palette: string[];
  defaultBrandColor: string;
  minPlan: "offline" | "franchise" | "online";
}

export interface ThemeSharedProps {
  store: Store;
  categories: Category[];
  products: Product[];
  activeCategoryId: string | null;
  onSelectCategory: (id: string | null) => void;
  cartCount: number;
  onOpenCart: () => void;
  onAddToCart: (product: Product) => void;
  isDemo?: boolean;
}
