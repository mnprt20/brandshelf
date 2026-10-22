import { MemoryRepository } from "../repository/memory";
import { AuthService } from "../services/authService";
import { CatalogService } from "../services/catalogService";
import { OrderService } from "../services/orderService";
import { ReportService } from "../services/reportService";
import { CustomerService } from "../services/customerService";
import { AgentService } from "../agent/agentLoop";
import { FakeAdapter } from "../agent/fakeAdapter";
import { validateBrandColor, resolveTheme } from "../themes/registry";
import { computeCardGeometry } from "../utils/heroGeometry";

export interface TestResult {
  name: string;
  passed: boolean;
  message?: string;
}

export async function runAllDiagnostics(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const repo = new MemoryRepository();

  const auth = new AuthService(repo);
  const catalog = new CatalogService(repo);
  const order = new OrderService(repo);
  const report = new ReportService(repo);
  const customerService = new CustomerService(repo);
  const fakeAdapter = new FakeAdapter();
  const agent = new AgentService(repo, fakeAdapter, catalog, order, report);

  // TEST 1: Tenant isolation
  try {
    const { user: userA, store: storeA } = await auth.signup("ownerA", "pass", "A", "Shop A");
    const { user: userB, store: storeB } = await auth.signup("ownerB", "pass", "B", "Shop B");

    const sessionA = { userId: userA.id, storeId: storeA.id, role: "owner" as const };
    const sessionB = { userId: userB.id, storeId: storeB.id, role: "owner" as const };

    const catA = await catalog.saveCategory(sessionA, "Cat A");
    const prodA = await catalog.saveProduct(sessionA, {
      categoryId: catA.id,
      name: "Product A",
      description: "Desc",
      pricePaise: 1000,
      stock: 10,
      isAvailable: true
    });

    const foreignProd = await catalog.getProduct(sessionB, prodA.id);
    if (foreignProd !== null) throw new Error("Store B was able to read Store A product");

    let threwDelete = false;
    try {
      await catalog.deleteProduct(sessionB, prodA.id);
    } catch {
      threwDelete = true;
    }

    results.push({ name: "Tenant isolation", passed: foreignProd === null });
  } catch (err: any) {
    results.push({ name: "Tenant isolation", passed: false, message: err.message });
  }

  // TEST 2: Plan gating
  try {
    const { user: uOff, store: sOff } = await auth.signup("off_owner", "pass", "Off", "Off Shop");
    const offSession = { userId: uOff.id, storeId: sOff.id, role: "owner" as const };

    let staffBlocked = false;
    try {
      await auth.addStaff(offSession, { username: "staff_fail", displayName: "Staff", password: "p" });
    } catch {
      staffBlocked = true;
    }

    let reportBlocked = false;
    try {
      await report.generateReport(offSession);
    } catch {
      reportBlocked = true;
    }

    results.push({ name: "Plan gating", passed: staffBlocked && reportBlocked });
  } catch (err: any) {
    results.push({ name: "Plan gating", passed: false, message: err.message });
  }

  // TEST 3: Seat limit
  try {
    const { user: uFran, store: sFran } = await auth.signup("fran_owner", "pass", "Fran", "Fran Cafe");
    sFran.planSlug = "franchise";
    sFran.extraSeats = 0;
    await repo.saveStore(sFran);
    const fSession = { userId: uFran.id, storeId: sFran.id, role: "owner" as const };

    const staff1 = await auth.addStaff(fSession, { username: "fstaff1", displayName: "S1", password: "p" });
    let thirdBlocked = false;
    try {
      await auth.addStaff(fSession, { username: "fstaff2", displayName: "S2", password: "p" });
    } catch {
      thirdBlocked = true;
    }

    sFran.extraSeats = 1;
    await repo.saveStore(sFran);
    const staff2 = await auth.addStaff(fSession, { username: "fstaff2", displayName: "S2", password: "p" });

    await auth.setStaffActive(fSession, staff1.id, false);
    const staff3 = await auth.addStaff(fSession, { username: "fstaff3", displayName: "S3", password: "p" });

    results.push({ name: "Seat limit", passed: thirdBlocked && !!staff2 && !!staff3 });
  } catch (err: any) {
    results.push({ name: "Seat limit", passed: false, message: err.message });
  }

  // TEST 4 & 5: Staff isolation & Deactivated staff rejection
  try {
    const { user: uOwner, store: sTeam } = await auth.signup("t_owner", "pass", "TOwner", "Team Store");
    sTeam.planSlug = "franchise";
    sTeam.extraSeats = 5;
    await repo.saveStore(sTeam);
    const oSession = { userId: uOwner.id, storeId: sTeam.id, role: "owner" as const };

    const cat = await catalog.saveCategory(oSession, "General");
    const p1 = await catalog.saveProduct(oSession, {
      categoryId: cat.id,
      name: "Tee",
      description: "Cotton",
      pricePaise: 50000,
      stock: 10,
      isAvailable: true
    });

    const staffA = await auth.addStaff(oSession, { username: "st_a", displayName: "Staff A", password: "p" });
    const staffB = await auth.addStaff(oSession, { username: "st_b", displayName: "Staff B", password: "p" });
    const memA = await repo.getMembershipByUserAndStore(staffA.id, sTeam.id);

    const ordA = await order.createQrOrder(sTeam.id, {
      customerName: "Buyer",
      customerPhone: "12345",
      referralCode: memA?.referralCode,
      items: [{ productId: p1.id, quantity: 1 }]
    });

    const sSessionB = { userId: staffB.id, storeId: sTeam.id, role: "staff" as const };
    const bOrders = await order.listOrders(sSessionB);
    const sawAOrder = bOrders.some(o => o.id === ordA.id);

    let ownerOnlyBlocked = false;
    try {
      await catalog.saveProduct(sSessionB, {
        categoryId: cat.id,
        name: "Forbidden",
        description: "D",
        pricePaise: 100,
        stock: 1,
        isAvailable: true
      });
    } catch {
      ownerOnlyBlocked = true;
    }

    await auth.setStaffActive(oSession, staffA.id, false);
    let deactRejected = false;
    try {
      await auth.login("st_a", "p");
    } catch {
      deactRejected = true;
    }

    results.push({ name: "Staff isolation", passed: !sawAOrder && ownerOnlyBlocked });
    results.push({ name: "Deactivated staff are rejected", passed: deactRejected });
  } catch (err: any) {
    results.push({ name: "Staff isolation", passed: false, message: err.message });
    results.push({ name: "Deactivated staff are rejected", passed: false, message: err.message });
  }

  // TEST 6: Referral attribution
  try {
    const { user: uO, store: sRef } = await auth.signup("ref_owner", "pass", "RO", "Ref Store");
    sRef.planSlug = "franchise";
    await repo.saveStore(sRef);
    const sess = { userId: uO.id, storeId: sRef.id, role: "owner" as const };

    const c = await catalog.saveCategory(sess, "Cat");
    const p = await catalog.saveProduct(sess, { categoryId: c.id, name: "Juice", description: "Fresh", pricePaise: 12000, stock: 10, isAvailable: true });
    const sMember = await auth.addStaff(sess, { username: "seller1", displayName: "Seller", password: "p" });
    const mInfo = await repo.getMembershipByUserAndStore(sMember.id, sRef.id);

    const ordValid = await order.createQrOrder(sRef.id, {
      customerName: "Alice",
      customerPhone: "111",
      referralCode: mInfo?.referralCode,
      items: [{ productId: p.id, quantity: 1 }]
    });

    const ordInvalid = await order.createQrOrder(sRef.id, {
      customerName: "Bob",
      customerPhone: "222",
      referralCode: "NONEXISTENT",
      items: [{ productId: p.id, quantity: 1 }]
    });

    results.push({
      name: "Referral attribution",
      passed: ordValid.placedByUserId === sMember.id && ordInvalid.placedByUserId === null
    });
  } catch (err: any) {
    results.push({ name: "Referral attribution", passed: false, message: err.message });
  }

  // TEST 7: Money calculation & snapshot
  try {
    const { user: uM, store: sM } = await auth.signup("money_owner", "pass", "MO", "Money Store");
    const mSess = { userId: uM.id, storeId: sM.id, role: "owner" as const };
    const c = await catalog.saveCategory(mSess, "C");
    const p = await catalog.saveProduct(mSess, { categoryId: c.id, name: "Cookie", description: "Choc", pricePaise: 2500, stock: 10, isAvailable: true });

    const testOrder = await order.createQrOrder(sM.id, {
      customerName: "Charlie",
      customerPhone: "333",
      items: [{ productId: p.id, quantity: 3 }]
    });

    const expectedTotal = 2500 * 3;
    const initialMatch = testOrder.totalPaise === expectedTotal;

    await catalog.saveProduct(mSess, { id: p.id, categoryId: c.id, name: "Cookie", description: "Choc", pricePaise: 4000, stock: 10, isAvailable: true });

    const refetched = await repo.getOrderById(sM.id, testOrder.id);
    const snapshotPreserved = refetched?.items[0].unitPricePaise === 2500 && refetched.totalPaise === 7500;

    results.push({ name: "Money integer paise & price snapshot", passed: initialMatch && snapshotPreserved });
  } catch (err: any) {
    results.push({ name: "Money integer paise & price snapshot", passed: false, message: err.message });
  }

  // TEST 8: Report exact numbers fixture
  try {
    const { user: uRep, store: sRep } = await auth.signup("rep_owner", "pass", "RO", "Rep Store");
    sRep.planSlug = "franchise";
    await repo.saveStore(sRep);
    const rSess = { userId: uRep.id, storeId: sRep.id, role: "owner" as const };

    const c = await catalog.saveCategory(rSess, "C");
    const p = await catalog.saveProduct(rSess, { categoryId: c.id, name: "Mug", description: "Clay", pricePaise: 10000, stock: 100, isAvailable: true });

    const staff1 = await auth.addStaff(rSess, { username: "rep_s1", displayName: "Rep S1", password: "p" });
    const mem1 = await repo.getMembershipByUserAndStore(staff1.id, sRep.id);

    const o1 = await order.createQrOrder(sRep.id, { customerName: "C1", customerPhone: "1", items: [{ productId: p.id, quantity: 1 }] });
    await order.updateOrderStatus(rSess, o1.id, "confirmed");
    await order.updateOrderStatus(rSess, o1.id, "preparing");
    await order.updateOrderStatus(rSess, o1.id, "ready");
    await order.updateOrderStatus(rSess, o1.id, "completed");

    await order.createQrOrder(sRep.id, { customerName: "C2", customerPhone: "2", referralCode: mem1?.referralCode, items: [{ productId: p.id, quantity: 2 }] });

    const o3 = await order.createQrOrder(sRep.id, { customerName: "C3", customerPhone: "3", items: [{ productId: p.id, quantity: 5 }] });
    await order.updateOrderStatus(rSess, o3.id, "cancelled");

    const fullReport = await report.generateReport(rSess);
    const passed = fullReport.totalOrders === 2 &&
      fullReport.totalUnits === 3 &&
      fullReport.totalRevenuePaise === 10000 &&
      fullReport.totalPendingPaise === 20000;

    results.push({ name: "Report exact fixture numbers", passed });
  } catch (err: any) {
    results.push({ name: "Report exact fixture numbers", passed: false, message: err.message });
  }

  // TEST 9: Online checkout rules
  try {
    const { user: uOnl, store: sOnl } = await auth.signup("onl_owner", "pass", "OO", "Onl Store");
    sOnl.planSlug = "online";
    sOnl.onlineOpen = false;
    sOnl.deliveryFeePaise = 5000;
    sOnl.freeDeliveryAbovePaise = 50000;
    sOnl.minOrderPaise = 20000;
    await repo.saveStore(sOnl);
    const oSess = { userId: uOnl.id, storeId: sOnl.id, role: "owner" as const };

    const c = await catalog.saveCategory(oSess, "C");
    const p = await catalog.saveProduct(oSess, { categoryId: c.id, name: "Soap", description: "Bio", pricePaise: 10000, stock: 1, isAvailable: true });

    const cust = await customerService.register(sOnl.id, "Customer Test", "9000000001", "pass");

    let closedRejected = false;
    try {
      await order.createOnlineOrder(sOnl.id, cust.id, { fulfilment: "pickup", paymentMethod: "cod", items: [{ productId: p.id, quantity: 1 }] });
    } catch {
      closedRejected = true;
    }

    sOnl.onlineOpen = true;
    await repo.saveStore(sOnl);

    let minRejected = false;
    try {
      await order.createOnlineOrder(sOnl.id, cust.id, { fulfilment: "pickup", paymentMethod: "cod", items: [{ productId: p.id, quantity: 1 }] });
    } catch {
      minRejected = true;
    }

    let stockRejected = false;
    try {
      await order.createOnlineOrder(sOnl.id, cust.id, { fulfilment: "pickup", paymentMethod: "cod", items: [{ productId: p.id, quantity: 5 }] });
    } catch {
      stockRejected = true;
    }

    results.push({ name: "Online checkout rules", passed: closedRejected && minRejected && stockRejected });
  } catch (err: any) {
    results.push({ name: "Online checkout rules", passed: false, message: err.message });
  }

  // TEST 10: Stock decrement and single restoration
  try {
    const { user: uStk, store: sStk } = await auth.signup("stk_owner", "pass", "SO", "Stk Store");
    const stkSess = { userId: uStk.id, storeId: sStk.id, role: "owner" as const };
    const c = await catalog.saveCategory(stkSess, "C");
    const p = await catalog.saveProduct(stkSess, { categoryId: c.id, name: "Candle", description: "Wax", pricePaise: 1000, stock: 10, isAvailable: true });

    const o = await order.createQrOrder(sStk.id, { customerName: "Test", customerPhone: "123", items: [{ productId: p.id, quantity: 3 }] });
    const pAfterOrder = await repo.getProductById(sStk.id, p.id);
    const decremented = pAfterOrder?.stock === 7;

    await order.updateOrderStatus(stkSess, o.id, "cancelled");
    const pAfterCancel = await repo.getProductById(sStk.id, p.id);
    const restored = pAfterCancel?.stock === 10;

    results.push({ name: "Stock decrement & single cancel restoration", passed: decremented && restored });
  } catch (err: any) {
    results.push({ name: "Stock decrement & single cancel restoration", passed: false, message: err.message });
  }

  // TEST 11: Status flow transitions
  try {
    const { user: uFlow, store: sFlow } = await auth.signup("flow_owner", "pass", "FO", "Flow Store");
    const fSess = { userId: uFlow.id, storeId: sFlow.id, role: "owner" as const };
    const c = await catalog.saveCategory(fSess, "C");
    const p = await catalog.saveProduct(fSess, { categoryId: c.id, name: "Vase", description: "Ceramic", pricePaise: 5000, stock: 5, isAvailable: true });

    const o = await order.createQrOrder(sFlow.id, { customerName: "Test", customerPhone: "123", items: [{ productId: p.id, quantity: 1 }] });

    let invalidJumpBlocked = false;
    try {
      await order.updateOrderStatus(fSess, o.id, "completed");
    } catch {
      invalidJumpBlocked = true;
    }

    await order.updateOrderStatus(fSess, o.id, "confirmed");
    await order.updateOrderStatus(fSess, o.id, "preparing");
    await order.updateOrderStatus(fSess, o.id, "ready");
    await order.updateOrderStatus(fSess, o.id, "completed");

    const events = await repo.getStatusEvents(o.id);
    results.push({ name: "Status flow rules & events", passed: invalidJumpBlocked && events.length === 5 });
  } catch (err: any) {
    results.push({ name: "Status flow rules & events", passed: false, message: err.message });
  }

  // TEST 12: Customer lockout after 5 failed attempts
  try {
    const { user: uC, store: sC } = await auth.signup("cust_owner", "pass", "CO", "Cust Store");
    sC.planSlug = "online";
    await repo.saveStore(sC);

    await customerService.register(sC.id, "Lockout Target", "9111111111", "correct_pass");

    for (let i = 0; i < 5; i++) {
      try {
        await customerService.login(sC.id, "9111111111", "wrong_pass");
      } catch {}
    }

    let lockedOut = false;
    try {
      await customerService.login(sC.id, "9111111111", "correct_pass");
    } catch (e: any) {
      if (e.message.includes("Account locked")) lockedOut = true;
    }

    results.push({ name: "Customer lockout after 5 failed logins", passed: lockedOut });
  } catch (err: any) {
    results.push({ name: "Customer lockout after 5 failed logins", passed: false, message: err.message });
  }

  // TEST 13: Brand color validation
  try {
    const valid = validateBrandColor("#1A2B3C");
    const bad1 = !validateBrandColor("red");
    const bad2 = !validateBrandColor("#fff");
    const bad3 = !validateBrandColor("#12345");
    const bad4 = !validateBrandColor("#000;}body{display:none");

    results.push({ name: "Brand color validation strictness", passed: valid && bad1 && bad2 && bad3 && bad4 });
  } catch (err: any) {
    results.push({ name: "Brand color validation strictness", passed: false, message: err.message });
  }

  // TEST 14: Theme registry validation & unknown fallback
  try {
    const classicResolved = resolveTheme("classic").key === "classic";
    const unknownFallback = resolveTheme("unknown_weird_theme").key === "classic";
    results.push({ name: "Theme registry & fallback", passed: classicResolved && unknownFallback });
  } catch (err: any) {
    results.push({ name: "Theme registry & fallback", passed: false, message: err.message });
  }

  // TEST 15: Hero carousel geometry pure function
  try {
    const centerCard = computeCardGeometry(0);
    const centerCorrect = Math.round(centerCard.width) === 170 && Math.round(centerCard.leftHeight) === 280;

    const edgeCard = computeCardGeometry(706);
    const edgeWidthCorrect = Math.round(edgeCard.width) === 218;
    const edgeHeightCorrect = edgeCard.leftHeight > 360 && edgeCard.rightHeight > 360;
    const outerTaller = edgeCard.rightHeight > edgeCard.leftHeight;

    results.push({
      name: "Hero carousel geometry",
      passed: centerCorrect && edgeWidthCorrect && edgeHeightCorrect && outerTaller
    });
  } catch (err: any) {
    results.push({ name: "Hero carousel geometry", passed: false, message: err.message });
  }

  // TEST 16: Assistant security & FakeAdapter actions
  try {
    const { user: uAi, store: sAi } = await auth.signup("ai_owner", "pass", "AIO", "AI Store");
    const aiSess = { userId: uAi.id, storeId: sAi.id, role: "owner" as const };
    const c = await catalog.saveCategory(aiSess, "C");
    const p = await catalog.saveProduct(aiSess, { categoryId: c.id, name: "Bowl", description: "Ceramic", pricePaise: 3000, stock: 10, isAvailable: true });

    fakeAdapter.setScript([
      {
        toolCalls: [{
          name: "propose_price_change",
          args: { productId: p.id, newPricePaise: 9900, storeId: "malicious_injected_store_id" }
        }]
      },
      { text: "I have prepared the price change for Bowl to ₹99." }
    ]);

    await agent.handleUserMessage(aiSess, "Please change the price of bowl to 99 rupees");

    const pBeforeConfirm = await repo.getProductById(sAi.id, p.id);
    const unchanged = pBeforeConfirm?.pricePaise === 3000;

    const actions = await repo.getPendingActions(sAi.id);
    const targetAction = actions[0];
    await agent.confirmPendingAction(aiSess, targetAction.id);

    const pAfterConfirm = await repo.getProductById(sAi.id, p.id);
    const changedAfterConfirm = pAfterConfirm?.pricePaise === 9900;

    let secondConfirmFailed = false;
    try {
      await agent.confirmPendingAction(aiSess, targetAction.id);
    } catch {
      secondConfirmFailed = true;
    }

    results.push({
      name: "Assistant write tool confirmation gate",
      passed: unchanged && changedAfterConfirm && secondConfirmFailed
    });
  } catch (err: any) {
    results.push({ name: "Assistant write tool confirmation gate", passed: false, message: err.message });
  }

  return results;
}
