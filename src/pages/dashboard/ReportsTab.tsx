import React, { useState, useEffect } from "react";
import { SessionContext, Store } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { ReportService, FullSalesReport } from "../../services/reportService";
import { formatPaise } from "../../utils/money";

interface Props {
  session: SessionContext;
}

export const ReportsTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [report, setReport] = useState<FullSalesReport | null>(null);
  const [loading, setLoading] = useState(true);

  const reportService = new ReportService(defaultRepository);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const s = await defaultRepository.getStoreById(session.storeId);
      setStore(s);
      if (s && s.planSlug !== "offline") {
        try {
          const r = await reportService.generateReport(session);
          setReport(r);
        } catch (e: any) {
          console.error(e);
        }
      }
      setLoading(false);
    };
    load();
  }, [session]);

  if (loading) return <div>Loading reports...</div>;

  if (store?.planSlug === "offline") {
    return (
      <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "48px", textAlign: "center", border: "1px solid #E5EADF", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>Franchise Feature</h2>
        <p style={{ color: "var(--color-muted)", fontSize: "14px" }}>
          Sales breakdown reports, seller attribution tracking, and product analysis are available on Franchise and Online plans.
        </p>
      </div>
    );
  }

  const exportCsv = () => {
    if (!report) return;
    let csv = "Seller Name,Orders,Units Sold,Collected Revenue (Rs),Pending (Rs)\n";
    report.rows.forEach(r => {
      csv += `"${r.sellerName}",${r.orderCount},${r.unitsSold},${(r.revenuePaise / 100).toFixed(2)},${(r.pendingPaise / 100).toFixed(2)}\n`;
    });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${store?.slug}-sales-report.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: "1000px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Sales Reports & Breakdown</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Real-time analytics per floor seller and product line.
          </p>
        </div>
        <button
          onClick={exportCsv}
          style={{ padding: "10px 18px", borderRadius: "9999px", background: "#FFFFFF", border: "1px solid #DCE3D6", color: "var(--color-ink)", fontWeight: 600, fontSize: "13px" }}
        >
          Export CSV ⤓
        </button>
      </div>

      {/* Summary KPI Banner */}
      {report && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Total Orders</div>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{report.totalOrders}</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Total Units Sold</div>
            <div style={{ fontSize: "28px", fontWeight: 800, marginTop: "4px" }}>{report.totalUnits}</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Collected Revenue</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: store?.brandColor, marginTop: "4px" }}>{formatPaise(report.totalRevenuePaise)}</div>
          </div>
          <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
            <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Pending Payment</div>
            <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-muted)", marginTop: "4px" }}>{formatPaise(report.totalPendingPaise)}</div>
          </div>
        </div>
      )}

      {/* Seller Attribution Breakdown Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden", marginBottom: "32px" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5EADF", fontWeight: 700, fontSize: "16px" }}>
          Per-Seller Breakdown
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 20px" }}>Staff Member</th>
              <th style={{ padding: "14px 20px" }}>Orders</th>
              <th style={{ padding: "14px 20px" }}>Units Sold</th>
              <th style={{ padding: "14px 20px" }}>Collected Revenue</th>
              <th style={{ padding: "14px 20px" }}>Pending Payment</th>
            </tr>
          </thead>
          <tbody>
            {report?.rows.map((row, idx) => (
              <tr key={idx} style={{ borderBottom: "1px solid #F0F4EC" }}>
                <td style={{ padding: "14px 20px", fontWeight: 700 }}>{row.sellerName}</td>
                <td style={{ padding: "14px 20px" }}>{row.orderCount}</td>
                <td style={{ padding: "14px 20px" }}>{row.unitsSold}</td>
                <td style={{ padding: "14px 20px", fontWeight: 700, color: store?.brandColor }}>{formatPaise(row.revenuePaise)}</td>
                <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>{formatPaise(row.pendingPaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Product Breakdown Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5EADF", fontWeight: 700, fontSize: "16px" }}>
          Top Products Performance
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
              <th style={{ padding: "14px 20px" }}>Product Name</th>
              <th style={{ padding: "14px 20px" }}>Units Sold</th>
              <th style={{ padding: "14px 20px" }}>Revenue Generated</th>
            </tr>
          </thead>
          <tbody>
            {report?.productRows.map(pRow => (
              <tr key={pRow.productId} style={{ borderBottom: "1px solid #F0F4EC" }}>
                <td style={{ padding: "14px 20px", fontWeight: 600 }}>{pRow.productName}</td>
                <td style={{ padding: "14px 20px" }}>{pRow.unitsSold}</td>
                <td style={{ padding: "14px 20px", fontWeight: 700, color: store?.brandColor }}>{formatPaise(pRow.revenuePaise)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
