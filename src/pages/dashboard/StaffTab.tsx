import React, { useState, useEffect } from "react";
import { SessionContext, Store, Membership, User, Order } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { AuthService } from "../../services/authService";
import { PLANS } from "../../config/constants";
import { formatPaise } from "../../utils/money";
import { apiAddStaff, apiUpdateStaff, apiResetStaffPassword, apiSetStaffActive } from "../../services/apiClient";

interface Props {
  session: SessionContext;
}

export const StaffTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [usersMap, setUsersMap] = useState<Map<string, User>>(new Map());
  const [orders, setOrders] = useState<Order[]>([]);

  // 1. Add Staff Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [createdStaffNotice, setCreatedStaffNotice] = useState<string | null>(null);

  // 2. Edit Staff Modal state
  const [editingStaff, setEditingStaff] = useState<{ userId: string; displayName: string; username: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  // 3. Reset Password Modal state
  const [resetStaff, setResetStaff] = useState<{ userId: string; displayName: string; username: string } | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingReset, setSavingReset] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // 4. View Staff Orders Modal state
  const [viewingOrdersStaff, setViewingOrdersStaff] = useState<{
    userId: string;
    displayName: string;
    username: string;
    referralCode: string;
  } | null>(null);

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

    const allOrders = await defaultRepository.getOrders(session.storeId);
    setOrders(allOrders);
  };

  useEffect(() => {
    loadData();
  }, [session]);

  // Live auto-generate Staff User ID when owner types Display Name in Add Modal
  useEffect(() => {
    if (!store || !isAddModalOpen || !displayName.trim()) {
      if (isAddModalOpen && !displayName.trim()) setUsername("");
      return;
    }
    let isCancelled = false;
    authService.generateStaffUsername(store.name, displayName).then(genId => {
      if (!isCancelled) {
        setUsername(genId);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [displayName, store, isAddModalOpen]);

  if (!store) return <div>Loading staff...</div>;

  if (store.planSlug === "offline") {
    return (
      <div style={{ background: "#FFFFFF", borderRadius: "24px", padding: "48px", textAlign: "center", border: "1px solid #E5EADF", maxWidth: "600px" }}>
        <h2 style={{ fontSize: "22px", fontWeight: 700, margin: "0 0 8px" }}>Franchise Feature</h2>
        <p style={{ color: "var(--color-muted)", fontSize: "14px", marginBottom: "24px" }}>
          Team member logins, automatic staff IDs, seat expansion, and individual order tracking are included on Franchise and Online plans.
        </p>
      </div>
    );
  }

  const plan = PLANS[store.planSlug];
  const maxSeats = plan.maxUsersIncluded + store.extraSeats;
  const activeMembers = memberships.filter(m => m.isActive);
  const seatsUsed = activeMembers.length;
  const seatsAvailable = maxSeats - seatsUsed;
  const staffMemberships = memberships.filter(m => m.role === "staff");

  // Calculate order metrics per staff member
  const getStaffMetrics = (userId: string) => {
    const staffOrders = orders.filter(o => o.placedByUserId === userId);
    const orderCount = staffOrders.length;
    const totalSalesPaise = staffOrders
      .filter(o => o.status !== "cancelled")
      .reduce((sum, o) => sum + o.totalPaise, 0);
    return { staffOrders, orderCount, totalSalesPaise };
  };

  // Aggregated team stats
  const totalStaffOrders = staffMemberships.reduce((sum, m) => sum + getStaffMetrics(m.userId).orderCount, 0);
  const totalStaffSalesPaise = staffMemberships.reduce((sum, m) => sum + getStaffMetrics(m.userId).totalSalesPaise, 0);

  // Handlers
  const handleAddStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);
    setSavingAdd(true);
    try {
      const finalUsername = username.trim() || (await authService.generateStaffUsername(store.name, displayName));
      let newUser: any;

      try {
        const res = await apiAddStaff(session.storeId, displayName.trim(), password, finalUsername);
        newUser = res.user;
      } catch {
        newUser = await authService.addStaff(session, {
          username: finalUsername,
          displayName: displayName.trim(),
          password
        });
      }

      setIsAddModalOpen(false);
      setDisplayName("");
      setUsername("");
      setPassword("");
      setCreatedStaffNotice(`Staff member "${newUser.displayName}" added successfully! Login User ID: @${newUser.username}`);
      setTimeout(() => setCreatedStaffNotice(null), 7000);
      loadData();
    } catch (err: any) {
      setAddError(err.message || "Failed to add staff member");
    } finally {
      setSavingAdd(false);
    }
  };

  const handleEditStaffSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    setEditError(null);
    setSavingEdit(true);
    try {
      try {
        await apiUpdateStaff(editingStaff.userId, {
          displayName: editingStaff.displayName,
          username: editingStaff.username
        });
      } catch {
        await authService.updateStaff(session, editingStaff.userId, {
          displayName: editingStaff.displayName,
          username: editingStaff.username
        });
      }
      setEditingStaff(null);
      loadData();
    } catch (err: any) {
      setEditError(err.message || "Failed to update staff member");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleResetPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetStaff) return;
    setResetError(null);
    setSavingReset(true);
    try {
      try {
        await apiResetStaffPassword(resetStaff.userId, newPassword);
      } catch {
        await authService.resetStaffPassword(session, resetStaff.userId, newPassword);
      }
      setResetSuccess(`Password for @${resetStaff.username} has been reset successfully!`);
      setTimeout(() => {
        setResetStaff(null);
        setNewPassword("");
        setResetSuccess(null);
      }, 2000);
      loadData();
    } catch (err: any) {
      setResetError(err.message || "Failed to reset password");
    } finally {
      setSavingReset(false);
    }
  };

  const handleToggleStaffActive = async (userId: string, currentActive: boolean) => {
    try {
      try {
        await apiSetStaffActive(userId, session.storeId, !currentActive);
      } catch {
        await authService.setStaffActive(session, userId, !currentActive);
      }
      loadData();
    } catch (err: any) {
      alert(err.message || "Failed to toggle status");
    }
  };

  return (
    <div style={{ maxWidth: "1050px" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontFamily: "var(--font-headline)", fontSize: "32px", margin: 0, color: "var(--color-ink)" }}>
            Franchise Team & Staff
          </h1>
          <p style={{ color: "var(--color-muted)", fontSize: "14px", marginTop: "4px" }}>
            Add staff logins with auto-generated IDs, manage permissions, reset credentials, and inspect individual orders & sales.
          </p>
        </div>
        <button
          onClick={() => {
            setAddError(null);
            setDisplayName("");
            setUsername("");
            setPassword("");
            setIsAddModalOpen(true);
          }}
          disabled={seatsAvailable <= 0}
          style={{
            padding: "12px 24px",
            borderRadius: "9999px",
            background: seatsAvailable > 0 ? store.brandColor : "#A8B3A8",
            color: "#FFFFFF",
            fontWeight: 700,
            fontSize: "14px",
            boxShadow: seatsAvailable > 0 ? "0 4px 12px rgba(8, 72, 45, 0.2)" : "none",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
        >
          <span>+</span> Add Staff Member
        </button>
      </div>

      {createdStaffNotice && (
        <div style={{ padding: "14px 20px", borderRadius: "16px", background: "#DCFCE7", color: "#166534", marginBottom: "20px", fontWeight: 600, border: "1px solid #BBF7D0", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span>✓ {createdStaffNotice}</span>
          <button onClick={() => setCreatedStaffNotice(null)} style={{ background: "none", color: "#166534", fontWeight: 700, fontSize: "16px" }}>×</button>
        </div>
      )}

      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "28px" }}>
        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Plan Seats</div>
          <div style={{ fontSize: "24px", fontWeight: 800, marginTop: "4px" }}>{maxSeats} Users Allowed</div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
            {plan.maxUsersIncluded} included + {store.extraSeats} extra seats
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Active Seats</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: store.brandColor, marginTop: "4px" }}>
            {seatsUsed} of {maxSeats} in use
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
            1 Owner + {seatsUsed - 1} Active Staff
          </div>
        </div>

        <div style={{ background: "#FFFFFF", padding: "20px", borderRadius: "20px", border: "1px solid #E5EADF" }}>
          <div style={{ fontSize: "12px", textTransform: "uppercase", color: "var(--color-muted)", fontWeight: 700 }}>Staff Sales</div>
          <div style={{ fontSize: "24px", fontWeight: 800, color: "#166534", marginTop: "4px" }}>
            {formatPaise(totalStaffSalesPaise)}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "2px" }}>
            Across {totalStaffOrders} attributed orders
          </div>
        </div>
      </div>

      {/* Staff Table */}
      <div style={{ background: "#FFFFFF", borderRadius: "24px", border: "1px solid #E5EADF", overflow: "hidden", boxShadow: "0 4px 16px rgba(0,0,0,0.02)" }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #E5EADF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "var(--color-ink)" }}>
              Staff Accounts ({staffMemberships.length})
            </h3>
            <span style={{ fontSize: "12px", color: "var(--color-muted)" }}>
              Each staff member works individually and has dedicated login credentials.
            </span>
          </div>
        </div>

        {staffMemberships.length === 0 ? (
          <div style={{ padding: "48px 24px", textAlign: "center", color: "var(--color-muted)" }}>
            <div style={{ fontSize: "32px", marginBottom: "8px" }}>👥</div>
            <div style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-ink)", marginBottom: "4px" }}>No Staff Users Yet</div>
            <p style={{ fontSize: "13px", maxWidth: "380px", margin: "0 auto 16px" }}>
              Add staff members to take counter orders, share unique referral attribution codes, and track individual sales performance.
            </p>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{ padding: "10px 20px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "13px" }}
            >
              + Add First Staff Member
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: "14px" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid #E5EADF", color: "var(--color-muted)", fontSize: "12px", textTransform: "uppercase", background: "#FAFDF7" }}>
                  <th style={{ padding: "14px 20px" }}>Staff Member</th>
                  <th style={{ padding: "14px 20px" }}>Login User ID</th>
                  <th style={{ padding: "14px 20px" }}>Attributed Orders</th>
                  <th style={{ padding: "14px 20px" }}>Total Sales</th>
                  <th style={{ padding: "14px 20px" }}>Status</th>
                  <th style={{ padding: "14px 20px", textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffMemberships.map(m => {
                  const u = usersMap.get(m.userId);
                  const metrics = getStaffMetrics(m.userId);
                  const refLink = `${window.location.origin}${window.location.pathname}#/store/${store.slug}?ref=${m.referralCode}`;

                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid #F0F4EC" }}>
                      {/* Name & Referral */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                          <div style={{ width: "36px", height: "36px", borderRadius: "9999px", background: "var(--color-mint)", color: "var(--color-forest)", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>
                            {u?.displayName ? u.displayName.charAt(0).toUpperCase() : "S"}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--color-ink)" }}>{u?.displayName || "Staff Member"}</div>
                            <span style={{ fontSize: "11px", color: "var(--color-muted)", fontFamily: "monospace" }}>
                              Code: <b>{m.referralCode}</b>
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Login User ID */}
                      <td style={{ padding: "16px 20px" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", background: "#F5F8EF", padding: "4px 10px", borderRadius: "8px", border: "1px solid #DAE7C7" }}>
                          <span style={{ fontFamily: "monospace", fontWeight: 700, color: "var(--color-ink)", fontSize: "13px" }}>
                            @{u?.username}
                          </span>
                          <button
                            onClick={() => {
                              if (u?.username) {
                                navigator.clipboard.writeText(u.username);
                                alert(`Copied User ID @${u.username}`);
                              }
                            }}
                            title="Copy User ID"
                            style={{ background: "none", color: "var(--color-forest)", fontSize: "12px", padding: 0 }}
                          >
                            📋
                          </button>
                        </div>
                      </td>

                      {/* Orders */}
                      <td style={{ padding: "16px 20px" }}>
                        <button
                          onClick={() => setViewingOrdersStaff({ userId: m.userId, displayName: u?.displayName || "Staff", username: u?.username || "", referralCode: m.referralCode })}
                          style={{ background: "none", color: store.brandColor, fontWeight: 700, textDecoration: "underline", fontSize: "13px", padding: 0 }}
                        >
                          {metrics.orderCount} {metrics.orderCount === 1 ? "order" : "orders"} ➔
                        </button>
                      </td>

                      {/* Sales */}
                      <td style={{ padding: "16px 20px", fontWeight: 800, color: "#166534" }}>
                        {formatPaise(metrics.totalSalesPaise)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "16px 20px" }}>
                        <span
                          style={{
                            padding: "4px 10px",
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

                      {/* Actions */}
                      <td style={{ padding: "16px 20px", textAlign: "right" }}>
                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", flexWrap: "wrap" }}>
                          {/* View Orders button */}
                          <button
                            onClick={() => setViewingOrdersStaff({ userId: m.userId, displayName: u?.displayName || "Staff", username: u?.username || "", referralCode: m.referralCode })}
                            title="View Staff Orders"
                            style={{ padding: "6px 10px", borderRadius: "8px", background: "#F5F8EF", color: "var(--color-forest)", fontSize: "12px", fontWeight: 600, border: "1px solid #DCE3D6" }}
                          >
                            Orders ({metrics.orderCount})
                          </button>

                          {/* Edit button */}
                          <button
                            onClick={() => {
                              if (u) {
                                setEditingStaff({ userId: u.id, displayName: u.displayName, username: u.username });
                                setEditError(null);
                              }
                            }}
                            title="Edit Staff Member"
                            style={{ padding: "6px 10px", borderRadius: "8px", background: "#FFFFFF", color: "var(--color-ink)", fontSize: "12px", fontWeight: 600, border: "1px solid #DCE3D6" }}
                          >
                            Edit
                          </button>

                          {/* Reset Password button */}
                          <button
                            onClick={() => {
                              if (u) {
                                setResetStaff({ userId: u.id, displayName: u.displayName, username: u.username });
                                setNewPassword("");
                                setResetError(null);
                                setResetSuccess(null);
                              }
                            }}
                            title="Reset Password"
                            style={{ padding: "6px 10px", borderRadius: "8px", background: "#FFFFFF", color: "var(--color-forest)", fontSize: "12px", fontWeight: 600, border: "1px solid #DCE3D6" }}
                          >
                            Reset Password
                          </button>

                          {/* Deactivate/Activate button */}
                          <button
                            onClick={() => handleToggleStaffActive(m.userId, m.isActive)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: "8px",
                              background: m.isActive ? "#FEE2E2" : "#DCFCE7",
                              color: m.isActive ? "#991B1B" : "#166534",
                              fontSize: "12px",
                              fontWeight: 600
                            }}
                          >
                            {m.isActive ? "Deactivate" : "Activate"}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 1. ADD STAFF MODAL */}
      {isAddModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "460px", width: "100%", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Add Franchise Staff Member</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Creates an individual staff login. Each staff user gets a unique login ID generated from your business name.
            </p>

            {addError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px", fontWeight: 500 }}>
                {addError}
              </div>
            )}

            <form onSubmit={handleAddStaffSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Staff Member Name</label>
                <input
                  required
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="e.g. Ravi"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", outline: "none" }}
                />
              </div>

              {/* Generated ID Box */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Staff Login User ID (Generated from Business Name)
                </label>
                <div style={{ display: "flex", alignItems: "center", background: "#F5F8EF", borderRadius: "10px", border: "1px solid #DAE7C7", padding: "0 12px" }}>
                  <span style={{ color: "var(--color-muted)", fontWeight: 700, fontSize: "14px" }}>@</span>
                  <input
                    required
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    placeholder="e.g. blue-cafe-ravi"
                    style={{ width: "100%", padding: "10px 8px", background: "transparent", border: "none", fontSize: "14px", fontFamily: "monospace", fontWeight: 700, outline: "none" }}
                  />
                </div>
                <span style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "4px", display: "block" }}>
                  Auto-generated from "{store.name}" + staff name (e.g. blue-cafe-ravi). You can customize it if needed.
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Create a password for this staff member"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={savingAdd}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                >
                  {savingAdd ? "Adding Staff..." : "Create Staff Account"}
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EDIT STAFF MODAL */}
      {editingStaff && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "440px", width: "100%", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Edit Staff Member</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Update staff display name or login User ID.
            </p>

            {editError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
                {editError}
              </div>
            )}

            <form onSubmit={handleEditStaffSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Display Name</label>
                <input
                  required
                  value={editingStaff.displayName}
                  onChange={e => setEditingStaff({ ...editingStaff, displayName: e.target.value })}
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", outline: "none" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Login User ID</label>
                <div style={{ display: "flex", alignItems: "center", background: "#F5F8EF", borderRadius: "10px", border: "1px solid #DAE7C7", padding: "0 12px" }}>
                  <span style={{ color: "var(--color-muted)", fontWeight: 700, fontSize: "14px" }}>@</span>
                  <input
                    required
                    value={editingStaff.username}
                    onChange={e => setEditingStaff({ ...editingStaff, username: e.target.value })}
                    style={{ width: "100%", padding: "10px 8px", background: "transparent", border: "none", fontSize: "14px", fontFamily: "monospace", fontWeight: 700, outline: "none" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={savingEdit}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                >
                  {savingEdit ? "Saving..." : "Save Changes"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStaff(null)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. RESET PASSWORD MODAL */}
      {resetStaff && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "440px", width: "100%", padding: "32px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" }}>
            <h2 style={{ fontSize: "20px", fontWeight: 700, margin: "0 0 4px" }}>Reset Staff Password</h2>
            <p style={{ color: "var(--color-muted)", fontSize: "13px", margin: "0 0 20px" }}>
              Set a new login password for <b>{resetStaff.displayName}</b> (@{resetStaff.username}).
            </p>

            {resetError && (
              <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
                {resetError}
              </div>
            )}

            {resetSuccess && (
              <div style={{ background: "#DCFCE7", color: "#166534", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px", fontWeight: 600 }}>
                {resetSuccess}
              </div>
            )}

            <form onSubmit={handleResetPasswordSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                  style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "14px", outline: "none" }}
                />
              </div>

              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  type="submit"
                  disabled={savingReset || !!resetSuccess}
                  style={{ flex: 1, padding: "12px", borderRadius: "9999px", background: store.brandColor, color: "#FFFFFF", fontWeight: 700, fontSize: "14px" }}
                >
                  {savingReset ? "Resetting..." : "Save New Password"}
                </button>
                <button
                  type="button"
                  onClick={() => setResetStaff(null)}
                  style={{ padding: "12px 20px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", fontWeight: 600, fontSize: "14px" }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. VIEW STAFF ORDERS MODAL */}
      {viewingOrdersStaff && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.5)", padding: "20px" }}>
          <div style={{ background: "#FFFFFF", borderRadius: "24px", maxWidth: "700px", width: "100%", maxHeight: "85vh", display: "flex", flexDirection: "column", overflow: "hidden", boxShadow: "0 24px 48px rgba(0,0,0,0.2)" }}>
            {/* Modal Header */}
            <div style={{ padding: "24px 28px", borderBottom: "1px solid #E5EADF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ fontSize: "20px", fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
                  Orders & Sales: {viewingOrdersStaff.displayName}
                </h2>
                <span style={{ fontSize: "13px", color: "var(--color-muted)", fontFamily: "monospace" }}>
                  Login ID: @{viewingOrdersStaff.username} • Referral: {viewingOrdersStaff.referralCode}
                </span>
              </div>
              <button
                onClick={() => setViewingOrdersStaff(null)}
                style={{ width: "32px", height: "32px", borderRadius: "9999px", background: "#F0F4EC", color: "var(--color-ink)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: 700 }}
              >
                ×
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: "24px 28px", overflowY: "auto", flex: 1 }}>
              {(() => {
                const { staffOrders, orderCount, totalSalesPaise } = getStaffMetrics(viewingOrdersStaff.userId);

                return (
                  <div>
                    {/* Summary Row */}
                    <div style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
                      <div style={{ flex: 1, padding: "16px", borderRadius: "16px", background: "#F5F8EF", border: "1px solid #DAE7C7" }}>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-forest)" }}>Total Orders</div>
                        <div style={{ fontSize: "22px", fontWeight: 800, marginTop: "2px" }}>{orderCount}</div>
                      </div>
                      <div style={{ flex: 1, padding: "16px", borderRadius: "16px", background: "#F5F8EF", border: "1px solid #DAE7C7" }}>
                        <div style={{ fontSize: "11px", textTransform: "uppercase", fontWeight: 700, color: "var(--color-forest)" }}>Total Sales</div>
                        <div style={{ fontSize: "22px", fontWeight: 800, color: "#166534", marginTop: "2px" }}>{formatPaise(totalSalesPaise)}</div>
                      </div>
                    </div>

                    {/* Orders List */}
                    {staffOrders.length === 0 ? (
                      <div style={{ padding: "36px", textAlign: "center", color: "var(--color-muted)", fontSize: "14px" }}>
                        No orders recorded for this staff member yet.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        {staffOrders.map(order => (
                          <div key={order.id} style={{ padding: "14px 18px", borderRadius: "14px", border: "1px solid #E5EADF", background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                <strong style={{ color: "var(--color-ink)", fontSize: "14px" }}>{order.number}</strong>
                                <span style={{ fontSize: "11px", padding: "2px 8px", borderRadius: "9999px", background: order.status === "completed" ? "#DCFCE7" : "#F5F8EF", color: order.status === "completed" ? "#166534" : "var(--color-forest)", fontWeight: 700, textTransform: "capitalize" }}>
                                  {order.status.replace(/_/g, " ")}
                                </span>
                              </div>
                              <div style={{ fontSize: "12px", color: "var(--color-muted)", marginTop: "4px" }}>
                                Customer: <b>{order.customerName}</b> ({order.customerPhone}) • {order.items.length} items
                              </div>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 800, fontSize: "15px", color: "var(--color-ink)" }}>
                                {formatPaise(order.totalPaise)}
                              </div>
                              <span style={{ fontSize: "11px", color: order.paymentStatus === "received" ? "#166534" : "var(--color-muted)", fontWeight: 600, textTransform: "capitalize" }}>
                                Payment: {order.paymentStatus}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div style={{ padding: "16px 28px", borderTop: "1px solid #E5EADF", background: "#FAFDF7", display: "flex", justifyContent: "flex-end" }}>
              <button
                onClick={() => setViewingOrdersStaff(null)}
                style={{ padding: "10px 24px", borderRadius: "9999px", background: "var(--color-forest)", color: "#FFFFFF", fontWeight: 700, fontSize: "13px" }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
