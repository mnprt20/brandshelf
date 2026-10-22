import { IRepository } from "../repository/types";
import { AuthService } from "./authService";
import { CatalogService } from "./catalogService";
import { OrderService } from "./orderService";
import { CustomerService } from "./customerService";

export async function seedDemoData(repo: IRepository, force = false): Promise<void> {
  const existingStores = await repo.getAllStores();
  if (existingStores.length > 0 && !force) return;

  await repo.clearAll();

  const auth = new AuthService(repo);
  const catalog = new CatalogService(repo);
  const order = new OrderService(repo);
  const customerService = new CustomerService(repo);

  // 1. STORE 1: Demo Bakery (Offline plan)
  const { user: bakeryOwner, store: bakeryStore } = await auth.signup(
    "bakery_owner", "pass123", "Chef Priya", "Demo Bakery"
  );
  bakeryStore.planSlug = "offline";
  bakeryStore.description = "Handcrafted artisan sourdough and morning pastries.";
  bakeryStore.upiId = "bakery@upi";
  await repo.saveStore(bakeryStore);

  const bakerySession = { userId: bakeryOwner.id, storeId: bakeryStore.id, role: "owner" as const };
  const bCatBreads = await catalog.saveCategory(bakerySession, "Breads");
  const bCatPastries = await catalog.saveCategory(bakerySession, "Pastries");
  const bCatCoffee = await catalog.saveCategory(bakerySession, "Coffee");

  const b1 = await catalog.saveProduct(bakerySession, {
    categoryId: bCatBreads.id,
    name: "Classic Country Sourdough",
    description: "24-hour slow fermented artisan loaf.",
    pricePaise: 28000,
    stock: 12,
    isAvailable: true
  });
  const b2 = await catalog.saveProduct(bakerySession, {
    categoryId: bCatPastries.id,
    name: "Butter Croissant",
    description: "Flaky French layers baked fresh every dawn.",
    pricePaise: 16000,
    stock: 20,
    isAvailable: true
  });
  await catalog.saveProduct(bakerySession, {
    categoryId: bCatCoffee.id,
    name: "Oat Cortado",
    description: "Double espresso cut with warm steamed oat milk.",
    pricePaise: 22000,
    stock: null,
    isAvailable: true
  });

  await order.createQrOrder(bakeryStore.id, {
    customerName: "Rohan V.",
    customerPhone: "9876543210",
    items: [{ productId: b1.id, quantity: 1 }, { productId: b2.id, quantity: 2 }]
  });

  // 2. STORE 2: Demo Franchise Cafe (Franchise plan)
  const { user: cafeOwner, store: cafeStore } = await auth.signup(
    "cafe_owner", "pass123", "Amit Kumar", "Demo Franchise Cafe"
  );
  cafeStore.planSlug = "franchise";
  cafeStore.themeKey = "minimal";
  cafeStore.brandColor = "#1B3B2B";
  cafeStore.description = "Specialty roasters with community franchise kiosks.";
  cafeStore.upiId = "cafekiosk@upi";
  await repo.saveStore(cafeStore);

  const cafeSession = { userId: cafeOwner.id, storeId: cafeStore.id, role: "owner" as const };
  const cafeStaff = await auth.addStaff(cafeSession, {
    username: "cafe_staff",
    displayName: "Ananya Floor Lead",
    password: "pass"
  });
  const cafeStaffMem = await repo.getMembershipByUserAndStore(cafeStaff.id, cafeStore.id);

  const cCatCold = await catalog.saveCategory(cafeSession, "Cold Brews");
  const cCatHot = await catalog.saveCategory(cafeSession, "Hot Brews");
  await catalog.saveCategory(cafeSession, "Quick Bites");

  const c1 = await catalog.saveProduct(cafeSession, {
    categoryId: cCatCold.id,
    name: "Cascara Tonic Brew",
    description: "Sparkling cascara infusion with Meyer lemon notes.",
    pricePaise: 26000,
    stock: 15,
    isAvailable: true
  });
  const c2 = await catalog.saveProduct(cafeSession, {
    categoryId: cCatHot.id,
    name: "Monsooned Malabar Pour-Over",
    description: "Earthy, low acidity cup from single-origin beans.",
    pricePaise: 29000,
    stock: 18,
    isAvailable: true
  });

  // Direct order
  await order.createQrOrder(cafeStore.id, {
    customerName: "Sanya Gupta",
    customerPhone: "9811122233",
    items: [{ productId: c1.id, quantity: 2 }]
  });

  // Staff attributed order
  await order.createQrOrder(cafeStore.id, {
    customerName: "Vikram Sen",
    customerPhone: "9822233344",
    referralCode: cafeStaffMem?.referralCode,
    items: [{ productId: c2.id, quantity: 1 }]
  });

  // 3. STORE 3: Demo Online Mart (Online plan)
  const { user: martOwner, store: martStore } = await auth.signup(
    "mart_owner", "pass123", "Neha Sharma", "Demo Online Mart"
  );
  martStore.planSlug = "online";
  martStore.themeKey = "bold";
  martStore.brandColor = "#005F40";
  martStore.onlineOpen = true;
  martStore.pickupEnabled = true;
  martStore.deliveryEnabled = true;
  martStore.deliveryFeePaise = 5000;
  martStore.freeDeliveryAbovePaise = 50000;
  martStore.minOrderPaise = 15000;
  martStore.upiId = "onlinemart@upi";
  await repo.saveStore(martStore);

  const martSession = { userId: martOwner.id, storeId: martStore.id, role: "owner" as const };
  const mCatPantry = await catalog.saveCategory(martSession, "Organics & Pantry");
  const mCatWellness = await catalog.saveCategory(martSession, "Cold Pressed & Wellness");

  await catalog.saveProduct(martSession, {
    categoryId: mCatPantry.id,
    name: "Cold-Pressed Mustard Oil 1L",
    description: "Traditional stone mill crushed pure oil.",
    pricePaise: 38000,
    stock: 2,
    isAvailable: true
  });
  const m2 = await catalog.saveProduct(martSession, {
    categoryId: mCatWellness.id,
    name: "Wild Forest Raw Honey 500g",
    description: "Unpasteurised nectar harvested from Corbett foothills.",
    pricePaise: 49000,
    stock: 14,
    isAvailable: true
  });

  // Seed online customer
  const cust1 = await customerService.register(martStore.id, "Kavita Rao", "9988776655", "pass123");
  const cust1Addr = await customerService.addAddress(cust1.id, {
    label: "Home",
    street: "Flat 402, Green Meadows",
    landmark: "Behind Central Park",
    pincode: "560001",
    isDefault: true
  });

  // Online delivery order
  await order.createOnlineOrder(martStore.id, cust1.id, {
    fulfilment: "delivery",
    addressId: cust1Addr.id,
    paymentMethod: "upi",
    paymentReference: "UPI-TXN-998811",
    items: [{ productId: m2.id, quantity: 1 }]
  });
}
