import { IRepository } from "../repository/types";
import { SessionContext } from "../types";

export interface SalesReportRow {
  sellerId: string | null;
  sellerName: string;
  orderCount: number;
  unitsSold: number;
  revenuePaise: number;
  pendingPaise: number;
}

export interface ProductReportRow {
  productId: string;
  productName: string;
  unitsSold: number;
  revenuePaise: number;
}

export interface FullSalesReport {
  rows: SalesReportRow[];
  productRows: ProductReportRow[];
  totalOrders: number;
  totalUnits: number;
  totalRevenuePaise: number;
  totalPendingPaise: number;
}

export class ReportService {
  constructor(private repo: IRepository) {}

  async generateReport(session: SessionContext, dateFrom?: number, dateTo?: number): Promise<FullSalesReport> {
    if (session.role !== "owner") throw new Error("Only owners can view sales reports");
    const store = await this.repo.getStoreById(session.storeId);
    if (!store) throw new Error("Store not found");
    if (store.planSlug === "offline") {
      throw new Error("Reports are not available on the Offline Catalogue plan");
    }

    const members = await this.repo.getMembershipsByStore(session.storeId);
    const users = await Promise.all(members.map(m => this.repo.getUserById(m.userId)));
    const userMap = new Map<string, string>();
    users.forEach(u => {
      if (u) userMap.set(u.id, u.displayName);
    });

    const orders = await this.repo.getOrders(session.storeId);
    const start = dateFrom || 0;
    const end = dateTo || Date.now() + 86400000;

    const filtered = orders.filter(o => o.createdAt >= start && o.createdAt <= end);

    const sellerMap = new Map<string | null, SalesReportRow>();
    sellerMap.set(null, {
      sellerId: null,
      sellerName: "Direct / Unattributed",
      orderCount: 0,
      unitsSold: 0,
      revenuePaise: 0,
      pendingPaise: 0
    });

    members.forEach(m => {
      sellerMap.set(m.userId, {
        sellerId: m.userId,
        sellerName: userMap.get(m.userId) || "Staff",
        orderCount: 0,
        unitsSold: 0,
        revenuePaise: 0,
        pendingPaise: 0
      });
    });

    const productMap = new Map<string, ProductReportRow>();

    let totalOrders = 0;
    let totalUnits = 0;
    let totalRevenuePaise = 0;
    let totalPendingPaise = 0;

    for (const order of filtered) {
      if (order.status === "cancelled") continue;

      const isPaidOrCompleted = order.paymentStatus === "received" || order.status === "completed";
      const sellerKey = order.placedByUserId;
      let sellerRow = sellerMap.get(sellerKey);
      if (!sellerRow) {
        sellerRow = {
          sellerId: sellerKey,
          sellerName: sellerKey ? (userMap.get(sellerKey) || "Former Staff") : "Direct",
          orderCount: 0,
          unitsSold: 0,
          revenuePaise: 0,
          pendingPaise: 0
        };
        sellerMap.set(sellerKey, sellerRow);
      }

      sellerRow.orderCount += 1;
      totalOrders += 1;

      const orderUnits = order.items.reduce((s, it) => s + it.quantity, 0);
      sellerRow.unitsSold += orderUnits;
      totalUnits += orderUnits;

      if (isPaidOrCompleted) {
        sellerRow.revenuePaise += order.totalPaise;
        totalRevenuePaise += order.totalPaise;
      } else {
        sellerRow.pendingPaise += order.totalPaise;
        totalPendingPaise += order.totalPaise;
      }

      for (const item of order.items) {
        let pRow = productMap.get(item.productId);
        if (!pRow) {
          pRow = {
            productId: item.productId,
            productName: item.nameSnapshot,
            unitsSold: 0,
            revenuePaise: 0
          };
          productMap.set(item.productId, pRow);
        }
        pRow.unitsSold += item.quantity;
        if (isPaidOrCompleted) {
          pRow.revenuePaise += item.unitPricePaise * item.quantity;
        }
      }
    }

    return {
      rows: Array.from(sellerMap.values()).filter(r => r.orderCount > 0 || r.sellerId !== null),
      productRows: Array.from(productMap.values()),
      totalOrders,
      totalUnits,
      totalRevenuePaise,
      totalPendingPaise
    };
  }
}
