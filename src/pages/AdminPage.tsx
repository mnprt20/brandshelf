import React, { useEffect, useState } from "react";
import { Store, User } from "../types";
import { defaultRepository } from "../repository/storage";

interface Props {
  onNavigate: (route: string) => void;
  onSelectStoreSession: (storeId: string, userId: string, role: "owner" | "staff") => void;
}

export const AdminPage: React.FC<Props> = ({ onNavigate, onSelectStoreSession }) => {
  const [stores, setStores] = useState<Store[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());

  const loadStores = async () => {
    const list = await defaultRepository.getAllStores();
    setStores(list);
    const uMap = new Map<string, User>();
    for (const s of list) {
      const u = await defaultRepository.getUserById(s.ownerUserId);
      if (u) uMap.set(u.id, u);
    }
    setUsers(uMap);
  };

  useEffect(() => {
    loadStores();
  }, []);

  const handleToggleActive = async (store: Store) => {
    store.isActive = !store.isActive;
    await defaultRepository.saveStore(store);
    loadStores();
  };

  const handlePlanChange = async (store: Store, newPlan: "offline" | "franchise" | "online") => {
    store.planSlug = newPlan;
    await defaultRepository.saveStore(store);
    loadStores();
  };

  return (
    <div style={{ maxWidth: "1100px", margin: "40px auto", padding: "0 24px" }}>
      <button onClick={() => onNavigate("#/")} style={{ background: "none", color: "var(--color-forest)", fontWeight: 600, fontSize: "14px", marginBottom: "16px" }}>
        ← Back to Landing Page
      </button>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "28px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Platform Administration</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Inspect all tenant stores, switch plans on the fly, and test isolation boundaries.
          </p>
        </div>
        <span style={{ fontSize: "12px", background: "var(--color-mint)", color: "var(--color-forest)", padding: "4px 12px", borderRadius: "9999px", fontWeight: 700 }}>
          {stores.length} Active Tenants
        </span>
      </div>

      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)" }}>
              <th style={{ padding: "16px 20px" }}>Store Name</th>
              <th style={{ padding: "16px 20px" }}>Slug / URL</th>
              <th style={{ padding: "16px 20px" }}>Owner</th>
              <th style={{ padding: "16px 20px" }}>Plan</th>
              <th style={{ padding: "16px 20px" }}>Status</th>
              <th style={{ padding: "16px 20px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {stores.map(store => {
              const owner = users.get(store.ownerUserId);
              return (
                <tr key={store.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                  <td style={{ padding: "16px 20px", fontWeight: 700 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                      <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: store.brandColor }} />
                      <span>{store.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: "16px 20px", color: "var(--color-forest)", fontFamily: "monospace" }}>
                    <button
                      onClick={() => onNavigate(`#/store/${store.slug}`)}
                      style={{ background: "none", color: "var(--color-forest)", textDecoration: "underline", fontWeight: 600 }}
                    >
                      /store/{store.slug}
                    </button>
                  </td>
                  <td style={{ padding: "16px 20px" }}>{owner?.displayName || "Unknown"}</td>
                  <td style={{ padding: "16px 20px" }}>
                    <select
                      value={store.planSlug}
                      onChange={e => handlePlanChange(store, e.target.value as any)}
                      style={{ padding: "6px 10px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "12px", fontWeight: 600, textTransform: "capitalize" }}
                    >
                      <option value="offline">Offline</option>
                      <option value="franchise">Franchise</option>
                      <option value="online">Online</option>
                    </select>
                  </td>
                  <td style={{ padding: "16px 20px" }}>
                    <button
                      onClick={() => handleToggleActive(store)}
                      style={{
                        padding: "4px 10px",
                        borderRadius: "9999px",
                        fontSize: "12px",
                        fontWeight: 700,
                        backgroundColor: store.isActive ? "#DCFCE7" : "#FEE2E2",
                        color: store.isActive ? "#166534" : "#991B1B"
                      }}
                    >
                      {store.isActive ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td style={{ padding: "16px 20px", textAlign: "right" }}>
                    <button
                      onClick={() => {
                        onSelectStoreSession(store.id, store.ownerUserId, "owner");
                        onNavigate("#/dashboard/overview");
                      }}
                      style={{ padding: "6px 14px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 600, fontSize: "12px" }}
                    >
                      Enter Dashboard →
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
