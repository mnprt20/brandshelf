import React, { useState, useEffect } from "react";
import { SessionContext, Store, Membership, User } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { AuthService } from "../../services/authService";
import { PLANS } from "../../config/constants";

interface Props {
  session: SessionContext;
}

export const StaffTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());

  // Add staff modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const authService = new AuthService(defaultRepository);

  const loadData = async () => {
    const s = await defaultRepository.getStoreById(session.storeId);
    setStore(s);
    const mems = await defaultRepository.getMembershipsByStore(session.storeId);
    setMemberships(mems);

    const uMap = new Map<string, User>();
    for (const m of mems) {
      const u = await defaultRepository.getUserById(m.userId);
      if (u) uMap.set(u.id, u);
    }
    setUsersMap(uMap);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  if (!store) return <div>Loading staff...</div>;

  if (store.planSlug === "offline") {
    return (
      <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "48px", textAlign: "center", border: "1px solid #E5EADF", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>Franchise Feature</h2>
        <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "24px" }}>
          Team member logins, seat expansion, and seller attribution are included on Franchise and Online plans.
        </p>
      </div>
    );
  }

  const plan = PLANS[store.planSlug];
  const maxSeats = plan.maxUsersIncluded + store.extraSeats;
  const activeMembers = memberships.filter(m => m.isActive);
  const seatsUsed = activeMembers.length;
  const seatsAvailable = maxSeats - seatsUsed;

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      await authService.addStaff(session, { username, displayName, password });
      setIsModalOpen(false);
      setUsername("");
      setDisplayName("");
      setPassword("");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to add staff");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStaffActive = async (userId: string, currentActive: boolean) => {
    try {
      await authService.setStaffActive(session, userId, !currentActive);
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  const staffMemberships = memberships.filter(m => m.role === "staff");

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0 }}>Team & Referrals</h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Add staff logins, allocate seller codes, and track attribution.
          </p>
        </div>
        <button
          onClick={() => {
            setError(null);
            setIsModalOpen(true);
          }}
          disabled={seatsAvailable <= 0}
          style={{
            padding: "10px 20px",
            borderRadius: "9999px",
            background: seatsAvailable > 0 ? store.brandColor : "#A8B3A8",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "14px"
          }}
        >
          + Add Staff Member
        </button>
      </div>

      {/* Seat Limit Card */}
      <div style={{ display: "flex", gap: "16px", marginBottom: "28px" }}>
        <div style={{ flex: 1, background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Plan Seats</div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>{maxSeats} Users Allowed</div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
            {plan.maxUsersIncluded} included on {store.planSlug} + {store.extraSeats} extra seats
          </div>
        </div>

        <div style={{ flex: 1, background: "#FFFFFF", padding: "20px", borderRadius: "18px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Seats In Use</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: store.brandColor, marginTop: "4px" }}>
            {seatsUsed} of {maxSeats} active
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
            1 Owner + {seatsUsed - 1} Staff members
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #E5EADF", fontWeight: 700, fontSize: "15px" }}>
          Staff Team ({staffMemberships.length})
        </div>

        {staffMemberships.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--color-muted)", fontSize: "14px" }}>
            No staff added yet. Click "+ Add Staff Member" to onboard your team.
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase" }}>
                <th style={{ padding: "14px 20px" }}>Staff Member</th>
                <th style={{ padding: "14px 20px" }}>Username</th>
                <th style={{ padding: "14px 20px" }}>Referral Code</th>
                <th style={{ padding: "14px 20px" }}>Status</th>
                <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staffMemberships.map(m => {
                const u = usersMap.get(m.userId);
                const refLink = `${window.location.origin}${window.location.pathname}#/store/${store.slug}?ref=${m.referralCode}`;
                return (
                  <tr key={m.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                    <td style={{ padding: "14px 20px", fontWeight: 700 }}>{u?.displayName || "Staff"}</td>
                    <td style={{ padding: "14px 20px", color: "var(--color-muted)" }}>@{u?.username}</td>
                    <td style={{ padding: "14px 20px" }}>
                      <span style={{ fontFamily: "monospace", fontWeight: 700, background: "#F5F8EF", padding: "4px 8px", borderRadius: "6px" }}>
                        {m.referralCode}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px" }}>
                      <span
                        style={{
                          padding: "3px 10px",
                          borderRadius: "9999px",
                          fontSize: "11px",
                          fontWeight: 700,
                          backgroundColor: m.isActive ? "#DCFCE7" : "#FEE2E2",
                          color: m.isActive ? "#166534" : "#991B1B"
                        }}
                      >
                        {m.isActive ? "Active" : "Deactivated"}
                      </span>
                    </td>
                    <td style={{ padding: "14px 20px", textAlign: "right" }}>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(refLink);
                          alert(`Copied link for ${u?.displayName}!`);
                        }}
                        style={{ background: "none", color: store.brandColor, fontSize: "13px", fontWeight: 600, marginRight: "12px" }}
                      >
                        Copy Link
                      </button>
                      <button
                        onClick={() => handleToggleStaffActive(m.userId, m.isActive)}
                        style={{ background: "none", color: m.isActive ? "#DC2626" : "var(--color-forest)", fontSize: "13px", fontWeight: 600 }}
                      >
                        {m.isActive ? "Deactivate" : "Activate"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Staff Modal */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "420px", width: "100%", padding: "32px" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Add Staff Member</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Creates login credentials and a unique referral attribution code.
            </p>

            {error && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
                {error}
              </div>
            )}

            <form onSubmit={handleAddStaff} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Display Name</label>
                <input
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Ramesh K."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Login Username</label>
                <input
                  required
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  placeholder="e.g. ramesh_cafe"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                >
                  {saving ? "Adding..." : "Add Staff"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
