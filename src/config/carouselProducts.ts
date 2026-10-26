export interface CarouselProduct {
  id: string;
  category: string;
  title: string;
  price: string;
  image: string;
  tag: string;
  theme: string;
}

export const HERO_CAROUSEL_PRODUCTS: CarouselProduct[] = [
  {
    id: "hero-1",
    category: "Artisan Bakery",
    title: "Country Sourdough Loaf",
    price: "₹280",
    image: "https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80",
    tag: "36h Ferment",
    theme: "Classic"
  },
  {
    id: "hero-2",
    category: "Apparel & Fashion",
    title: "Heavyweight Cotton Tee",
    price: "₹1,499",
    image: "https://images.unsplash.com/photo-1521572267360-ee0c2909d518?w=600&auto=format&fit=crop&q=80",
    tag: "240 GSM",
    theme: "Minimalist"
  },
  {
    id: "hero-3",
    category: "Specialty Coffee",
    title: "Monsooned Malabar",
    price: "₹550",
    image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=600&auto=format&fit=crop&q=80",
    tag: "Single Estate",
    theme: "Bold"
  },
  {
    id: "hero-4",
    category: "Footwear & Shoes",
    title: "Leather Court Sneaker",
    price: "₹3,999",
    image: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=600&auto=format&fit=crop&q=80",
    tag: "Full-Grain",
    theme: "Bold"
  },
  {
    id: "hero-5",
    category: "Pottery & Decor",
    title: "Wabi-Sabi Fluted Vase",
    price: "₹1,650",
    image: "https://images.unsplash.com/photo-1612196808214-b8e1d6145a8c?w=600&auto=format&fit=crop&q=80",
    tag: "Handcrafted",
    theme: "Minimalist"
  },
  {
    id: "hero-6",
    category: "Beauty & Wellness",
    title: "Botanical Glow Elixir",
    price: "₹1,250",
    image: "https://images.unsplash.com/photo-1608248597359-57e750e33ef7?w=600&auto=format&fit=crop&q=80",
    tag: "Cold-Pressed",
    theme: "Classic"
  },
  {
    id: "hero-7",
    category: "Pastries & Cafe",
    title: "Flaky Butter Croissant",
    price: "₹160",
    image: "https://images.unsplash.com/photo-1555507036-ab1f4038808a?w=600&auto=format&fit=crop&q=80",
    tag: "Normandy Butter",
    theme: "Classic"
  },
  {
    id: "hero-8",
    category: "Jewelry & Silver",
    title: "Sterling Hammered Band",
    price: "₹1,899",
    image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=600&auto=format&fit=crop&q=80",
    tag: "925 Silver",
    theme: "Minimalist"
  },
  {
    id: "hero-9",
    category: "Bags & Carry",
    title: "Canvas Field Tote",
    price: "₹899",
    image: "https://images.unsplash.com/photo-1544816155-12df9643f363?w=600&auto=format&fit=crop&q=80",
    tag: "Heavy Canvas",
    theme: "Minimalist"
  },
  {
    id: "hero-10",
    category: "Electronics",
    title: "Braided Fast Cable",
    price: "₹799",
    image: "https://images.unsplash.com/photo-1583863788434-e58a36330cf0?w=600&auto=format&fit=crop&q=80",
    tag: "100W PD",
    theme: "Bold"
  }
];
