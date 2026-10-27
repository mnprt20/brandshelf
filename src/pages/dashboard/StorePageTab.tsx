import React, { useState, useEffect } from "react";
import { SessionContext, Store, StoreProfile } from "../../types";
import { defaultRepository } from "../../repository/storage";
import { profileService, DEFAULT_STORE_PROFILE } from "../../services/profileService";
import { apiProfileAssist } from "../../services/apiClient";
import { resizeImageToDataUrl } from "../../utils/image";

interface Props {
  session: SessionContext;
}

export const StorePageTab: React.FC<Props> = ({ session }) => {
  const [store, setStore] = useState<Store | null>(null);
  const [profile, setProfile] = useState<StoreProfile>({
    storeId: session.storeId,
    ...DEFAULT_STORE_PROFILE
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // AI Assist State
  const [aiLoadingField, setAiLoadingField] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  // Cert input state
  const [certInput, setCertInput] = useState("");

  // Holiday input state
  const [holidayInput, setHolidayInput] = useState("");

  const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

  const getPolicyText = (p?: any): string => {
    if (!p) return "";
    return typeof p === "string" ? p : (p.text || "");
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const s = await defaultRepository.getStoreById(session.storeId);
        setStore(s);
        const p = await profileService.getProfile(session.storeId);
        setProfile(p);
      } catch (err: any) {
        setError(err.message || "Failed to load store profile");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [session]);

  const handleAiAssist = async (module: "info" | "policies" | "announcement" | "story", field: string, currentText?: string) => {
    setAiLoadingField(`${module}.${field}`);
    setAiError(null);
    try {
      const res = await apiProfileAssist({
        module,
        field,
        storeName: store?.name,
        category: store?.brandType,
        currentText: currentText || ""
      });

      // Populate field for user review only
      if (module === "announcement" && field === "text") {
        setProfile(prev => ({
          ...prev,
          announcement: {
            ...prev.announcement!,
            text: res.suggestion.slice(0, 160)
          }
        }));
      } else if (module === "story" && field === "about") {
        setProfile(prev => ({
          ...prev,
          story: {
            ...prev.story!,
            about: res.suggestion.slice(0, 1000)
          }
        }));
      } else if (module === "policies") {
        setProfile(prev => ({
          ...prev,
          policies: {
            ...prev.policies!,
            [field]: res.suggestion.slice(0, 5000)
          }
        }));
      }
    } catch (err: any) {
      setAiError(err.message || "AI assist failed");
    } finally {
      setAiLoadingField(null);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await resizeImageToDataUrl(file, 400);
        setProfile(prev => ({
          ...prev,
          story: {
            ...prev.story!,
            ownerPhoto: dataUrl
          }
        }));
      } catch (err: any) {
        alert("Photo upload error: " + err.message);
      }
    }
  };

  const handleAddCert = () => {
    const clean = certInput.trim();
    if (!clean) return;
    const current = profile.story?.certs || [];
    if (current.length >= 6) {
      alert("A maximum of 6 certifications or badges is allowed.");
      return;
    }
    if (current.some(c => (typeof c === "string" ? c : c.label) === clean)) {
      setCertInput("");
      return;
    }
    setProfile(prev => ({
      ...prev,
      story: {
        ...prev.story!,
        certs: [...current, clean]
      }
    }));
    setCertInput("");
  };

  const handleRemoveCert = (cert: string) => {
    setProfile(prev => ({
      ...prev,
      story: {
        ...prev.story!,
        certs: (prev.story?.certs || []).filter(c => (typeof c === "string" ? c : c.label) !== cert)
      }
    }));
  };

  const handleAddHoliday = () => {
    const clean = holidayInput.trim();
    if (!clean) return;
    // Validate format YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
      alert("Please enter holiday in YYYY-MM-DD format (e.g. 2026-12-25)");
      return;
    }
    const current = profile.info?.holidays || [];
    if (current.some(h => (typeof h === "string" ? h : h.date) === clean)) {
      setHolidayInput("");
      return;
    }
    setProfile(prev => ({
      ...prev,
      info: {
        ...prev.info!,
        holidays: [...current, clean]
      }
    }));
    setHolidayInput("");
  };

  const handleRemoveHoliday = (h: string) => {
    setProfile(prev => ({
      ...prev,
      info: {
        ...prev.info!,
        holidays: (prev.info?.holidays || []).filter(date => (typeof date === "string" ? date : date.date) !== h)
      }
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaveSuccess(false);

    // 1. Validation for GSTIN (15 chars)
    if (profile.info?.gstin && profile.info.gstin.trim()) {
      const cleanGstin = profile.info.gstin.trim();
      if (cleanGstin.length !== 15) {
        setError("GSTIN must be exactly 15 characters long (e.g. 07AAAAA0000A1Z5).");
        return;
      }
    }

    // 2. Validation for FSSAI (14 digits)
    if (profile.info?.fssai && profile.info.fssai.trim()) {
      const cleanFssai = profile.info.fssai.trim();
      if (!/^\d{14}$/.test(cleanFssai)) {
        setError("FSSAI license must be exactly 14 numeric digits.");
        return;
      }
    }

    // 3. Validation for mapUrl (must be https://)
    if (profile.info?.mapUrl && profile.info.mapUrl.trim()) {
      if (!profile.info.mapUrl.trim().startsWith("https://")) {
        setError("Map URL must start with https:// (e.g. https://maps.google.com/...)");
        return;
      }
    }

    // 4. Placeholder check in Policies
    const policyTexts = [
      getPolicyText(profile.policies?.returns),
      getPolicyText(profile.policies?.shipping),
      getPolicyText(profile.policies?.privacy)
    ];
    const hasUnresolvedPlaceholders = policyTexts.some(txt => /\[.+?\]/.test(txt));
    if (hasUnresolvedPlaceholders && profile.policies?.enabled) {
      const confirmSave = window.confirm(
        "One or more policies still contain bracketed placeholders like [PLACEHOLDER] or [RETURN_WINDOW]. Do you wish to save anyway?"
      );
      if (!confirmSave) return;
    }

    setSaving(true);
    try {
      await profileService.saveProfile(session.storeId, profile);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div style={{ padding: "32px", textAlign: "center", color: "var(--color-muted)" }}>Loading store page modules...</div>;
  }

  return (
    <div style={{ maxWidth: "860px", margin: "0 auto", paddingBottom: "60px" }}>
      {/* Title & Preview Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 700, margin: 0, color: "var(--color-ink)" }}>
            Store Page Modules
          </h1>
          <p style={{ fontSize: "14px", color: "var(--color-muted)", margin: "4px 0 0" }}>
            Add announcements, operating hours, policies, brand story, and contact details to your customer storefront.
          </p>
        </div>

        {store?.slug && (
          <a
            href={`#/store/${store.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              padding: "10px 18px",
              borderRadius: "9999px",
              background: "#F0F4EC",
              color: "var(--color-forest)",
              fontSize: "13px",
              fontWeight: 700,
              textDecoration: "none",
              display: "inline-flex",
              alignItems: "center",
              gap: "6px"
            }}
          >
            <span>👁️</span> Preview Storefront
          </a>
        )}
      </div>

      {error && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", marginBottom: "20px" }}>
          {error}
        </div>
      )}

      {saveSuccess && (
        <div style={{ background: "#DCFCE7", color: "#166534", padding: "12px 16px", borderRadius: "12px", fontSize: "13px", marginBottom: "20px" }}>
          Store page modules saved successfully!
        </div>
      )}

      {aiError && (
        <div style={{ background: "#FEE2E2", color: "#991B1B", padding: "10px 14px", borderRadius: "10px", fontSize: "12px", marginBottom: "16px" }}>
          AI Assist: {aiError}
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* MODULE 1: ANNOUNCEMENT BANNER */}
        <div style={{ background: "#FFFFFF", borderRadius: "18px", border: "1px solid #E5EADF", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>📢 Storefront Announcement Banner</h2>
              <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                Displays a prominent notice at the very top of your catalogue (under 160 characters).
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={profile.announcement?.enabled || false}
                onChange={e => setProfile(prev => ({
                  ...prev,
                  announcement: { ...prev.announcement!, enabled: e.target.checked }
                }))}
              />
              <span>Enabled</span>
            </label>
          </div>

          {profile.announcement?.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px", paddingTop: "12px", borderTop: "1px solid #F0F4EC" }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Banner Text (max 160)</label>
                  <button
                    type="button"
                    onClick={() => handleAiAssist("announcement", "text", profile.announcement?.text)}
                    disabled={aiLoadingField === "announcement.text"}
                    style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    ✨ {aiLoadingField === "announcement.text" ? "Drafting..." : "Write with AI"}
                  </button>
                </div>
                <input
                  maxLength={160}
                  value={profile.announcement?.text || ""}
                  onChange={e => setProfile(prev => ({
                    ...prev,
                    announcement: { ...prev.announcement!, text: e.target.value }
                  }))}
                  placeholder="e.g. Fresh batch out of the oven! 15% off sourdough loaves this weekend."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
                <span style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "2px", display: "block" }}>
                  {(profile.announcement?.text || "").length}/160 characters
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Tone Style</label>
                  <select
                    value={profile.announcement?.tone || "info"}
                    onChange={e => setProfile(prev => ({
                      ...prev,
                      announcement: { ...prev.announcement!, tone: e.target.value as any }
                    }))}
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  >
                    <option value="info">Info (Blue)</option>
                    <option value="offer">Special Offer (Green)</option>
                    <option value="warning">Important Notice (Amber)</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Starts At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={profile.announcement?.startsAt || ""}
                    onChange={e => setProfile(prev => ({
                      ...prev,
                      announcement: { ...prev.announcement!, startsAt: e.target.value }
                    }))}
                    style={{ width: "100%", padding: "9px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Ends At (Optional)</label>
                  <input
                    type="datetime-local"
                    value={profile.announcement?.endsAt || ""}
                    onChange={e => setProfile(prev => ({
                      ...prev,
                      announcement: { ...prev.announcement!, endsAt: e.target.value }
                    }))}
                    style={{ width: "100%", padding: "9px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 2: SHOP INFO & OPERATING HOURS */}
        <div style={{ background: "#FFFFFF", borderRadius: "18px", border: "1px solid #E5EADF", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>📍 Store Info & Weekly Hours</h2>
              <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                Physical location, Google Maps link, phone, WhatsApp, and 7-day operating hours.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={profile.info?.enabled || false}
                onChange={e => setProfile(prev => ({
                  ...prev,
                  info: { ...prev.info!, enabled: e.target.checked }
                }))}
              />
              <span>Enabled</span>
            </label>
          </div>

          {profile.info?.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "12px", borderTop: "1px solid #F0F4EC" }}>
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Physical Store Address</label>
                <textarea
                  rows={2}
                  value={profile.info?.address || ""}
                  onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, address: e.target.value } }))}
                  placeholder="e.g. 14 MG Road, Indiranagar, Bengaluru, Karnataka 560038"
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Google Maps Link (https://)</label>
                  <input
                    value={profile.info?.mapUrl || ""}
                    onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, mapUrl: e.target.value } }))}
                    placeholder="https://maps.google.com/..."
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Phone Number</label>
                  <input
                    value={profile.info?.phone || ""}
                    onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, phone: e.target.value } }))}
                    placeholder="+91 98765 43210"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>WhatsApp Number</label>
                  <input
                    value={profile.info?.whatsapp || ""}
                    onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, whatsapp: e.target.value } }))}
                    placeholder="919876543210"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>GSTIN (15 chars)</label>
                  <input
                    maxLength={15}
                    value={profile.info?.gstin || ""}
                    onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, gstin: e.target.value.toUpperCase() } }))}
                    placeholder="07AAAAA0000A1Z5"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>FSSAI (14 digits)</label>
                  <input
                    maxLength={14}
                    value={profile.info?.fssai || ""}
                    onChange={e => setProfile(prev => ({ ...prev, info: { ...prev.info!, fssai: e.target.value.replace(/\D/g, "") } }))}
                    placeholder="12345678901234"
                    style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                </div>
              </div>

              {/* 7-Day Hours Table */}
              <div style={{ marginTop: "10px" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: 700, marginBottom: "8px" }}>Weekly Hours (IST)</label>
                <div style={{ background: "#F9FAF7", padding: "12px", borderRadius: "12px", border: "1px solid #E5EADF", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {daysOfWeek.map(day => {
                    const curHour = profile.info?.hours?.[day] || { open: "09:00", close: "21:00", closed: false };
                    return (
                      <div key={day} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
                        <span style={{ width: "100px", fontSize: "13px", fontWeight: 600 }}>{day}</span>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <input
                            type="time"
                            disabled={curHour.closed}
                            value={curHour.open}
                            onChange={e => {
                              const val = e.target.value;
                              setProfile(prev => ({
                                ...prev,
                                info: {
                                  ...prev.info!,
                                  hours: { ...prev.info!.hours, [day]: { ...curHour, open: val } }
                                }
                              }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                          />
                          <span>to</span>
                          <input
                            type="time"
                            disabled={curHour.closed}
                            value={curHour.close}
                            onChange={e => {
                              const val = e.target.value;
                              setProfile(prev => ({
                                ...prev,
                                info: {
                                  ...prev.info!,
                                  hours: { ...prev.info!.hours, [day]: { ...curHour, close: val } }
                                }
                              }));
                            }}
                            style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #DCE3D6", fontSize: "12px" }}
                          />
                          <label style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", cursor: "pointer", marginLeft: "8px" }}>
                            <input
                              type="checkbox"
                              checked={curHour.closed || false}
                              onChange={e => {
                                const isClosed = e.target.checked;
                                setProfile(prev => ({
                                  ...prev,
                                  info: {
                                    ...prev.info!,
                                    hours: { ...prev.info!.hours, [day]: { ...curHour, closed: isClosed } }
                                  }
                                }));
                              }}
                            />
                            <span>Closed</span>
                          </label>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Holidays Section */}
              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>Store Holidays (YYYY-MM-DD)</label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    type="date"
                    value={holidayInput}
                    onChange={e => setHolidayInput(e.target.value)}
                    style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddHoliday}
                    style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--color-forest)", color: "#FFF", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" }}
                  >
                    + Add Holiday
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(profile.info?.holidays || []).map(h => {
                    const dateStr = typeof h === "string" ? h : h.date;
                    const labelStr = typeof h === "string" ? h : (h.label ? `${h.date} (${h.label})` : h.date);
                    return (
                      <span
                        key={dateStr}
                        style={{ background: "#FEE2E2", color: "#991B1B", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        {labelStr}
                        <button
                          type="button"
                          onClick={() => handleRemoveHoliday(dateStr)}
                          style={{ background: "none", border: "none", color: "#991B1B", cursor: "pointer", fontSize: "12px", padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 3: BRAND STORY & CERTIFICATIONS */}
        <div style={{ background: "#FFFFFF", borderRadius: "18px", border: "1px solid #E5EADF", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>📖 Story & Certifications</h2>
              <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                Founder story, store photo, and up to 6 quality badges or certifications.
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={profile.story?.enabled || false}
                onChange={e => setProfile(prev => ({
                  ...prev,
                  story: { ...prev.story!, enabled: e.target.checked }
                }))}
              />
              <span>Enabled</span>
            </label>
          </div>

          {profile.story?.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "12px", borderTop: "1px solid #F0F4EC" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div style={{ width: "80px", height: "80px", borderRadius: "50%", background: "#F0F4EC", border: "1px solid #DCE3D6", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  {profile.story?.ownerPhoto ? (
                    <img src={profile.story.ownerPhoto} alt="Owner" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: "28px" }}>👤</span>
                  )}
                </div>
                <div>
                  <label style={{ display: "inline-flex", padding: "6px 14px", borderRadius: "8px", background: "#F0F4EC", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                    📷 Upload Owner / Store Photo
                    <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
                  </label>
                  <p style={{ fontSize: "11px", color: "var(--color-muted)", margin: "4px 0 0" }}>
                    Displayed alongside your brand story.
                  </p>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Brand Story / About (max 1000)</label>
                  <button
                    type="button"
                    onClick={() => handleAiAssist("story", "about", profile.story?.about)}
                    disabled={aiLoadingField === "story.about"}
                    style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    ✨ {aiLoadingField === "story.about" ? "Drafting..." : "Write with AI"}
                  </button>
                </div>
                <textarea
                  rows={4}
                  maxLength={1000}
                  value={profile.story?.about || ""}
                  onChange={e => setProfile(prev => ({ ...prev, story: { ...prev.story!, about: e.target.value } }))}
                  placeholder="Share how your shop began, your craft process, and why customers love you..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", lineHeight: "1.5" }}
                />
                <span style={{ fontSize: "11px", color: "var(--color-muted)", marginTop: "2px", display: "block" }}>
                  {(profile.story?.about || "").length}/1000 characters
                </span>
              </div>

              <div>
                <label style={{ display: "block", fontSize: "12px", fontWeight: 600, marginBottom: "4px" }}>
                  Quality Certifications & Badges (max 6)
                </label>
                <div style={{ display: "flex", gap: "8px", alignItems: "center", marginBottom: "8px" }}>
                  <input
                    value={certInput}
                    onChange={e => setCertInput(e.target.value)}
                    placeholder="e.g. 100% Organic, Certified Artisan Baker..."
                    style={{ flex: 1, padding: "8px 12px", borderRadius: "8px", border: "1px solid #DCE3D6", fontSize: "13px" }}
                  />
                  <button
                    type="button"
                    onClick={handleAddCert}
                    style={{ padding: "8px 16px", borderRadius: "8px", background: "var(--color-forest)", color: "#FFF", fontSize: "12px", fontWeight: 600, border: "none", cursor: "pointer" }}
                  >
                    + Add Badge
                  </button>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {(profile.story?.certs || []).map(c => {
                    const certStr = typeof c === "string" ? c : `${c.label}${c.number ? ` (${c.number})` : ""}`;
                    const certKey = typeof c === "string" ? c : c.label;
                    return (
                      <span
                        key={certKey}
                        style={{ background: "#DCFCE7", color: "#166534", padding: "4px 10px", borderRadius: "9999px", fontSize: "12px", fontWeight: 600, display: "inline-flex", alignItems: "center", gap: "6px" }}
                      >
                        🛡️ {certStr}
                        <button
                          type="button"
                          onClick={() => handleRemoveCert(certKey)}
                          style={{ background: "none", border: "none", color: "#166534", cursor: "pointer", fontSize: "12px", padding: 0 }}
                        >
                          ✕
                        </button>
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* MODULE 4: POLICIES (RETURNS, SHIPPING, PRIVACY) */}
        <div style={{ background: "#FFFFFF", borderRadius: "18px", border: "1px solid #E5EADF", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <div>
              <h2 style={{ fontSize: "16px", fontWeight: 700, margin: 0 }}>📜 Store Policies</h2>
              <p style={{ fontSize: "12px", color: "var(--color-muted)", margin: "2px 0 0" }}>
                Clear customer policies for returns, shipping dispatch, and customer privacy (plain text only).
              </p>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: 700, fontSize: "13px" }}>
              <input
                type="checkbox"
                checked={profile.policies?.enabled || false}
                onChange={e => setProfile(prev => ({
                  ...prev,
                  policies: { ...prev.policies!, enabled: e.target.checked }
                }))}
              />
              <span>Enabled</span>
            </label>
          </div>

          {profile.policies?.enabled && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "12px", borderTop: "1px solid #F0F4EC" }}>
              {/* Return Policy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Return & Refund Policy</label>
                  <button
                    type="button"
                    onClick={() => handleAiAssist("policies", "returns", getPolicyText(profile.policies?.returns))}
                    disabled={aiLoadingField === "policies.returns"}
                    style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    ✨ {aiLoadingField === "policies.returns" ? "Drafting..." : "Draft Template with AI"}
                  </button>
                </div>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={getPolicyText(profile.policies?.returns)}
                  onChange={e => setProfile(prev => ({ ...prev, policies: { ...prev.policies!, returns: e.target.value } }))}
                  placeholder="Outline refund eligibility, return window, condition of returned items..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", lineHeight: "1.4" }}
                />
              </div>

              {/* Shipping Policy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Shipping & Delivery Policy</label>
                  <button
                    type="button"
                    onClick={() => handleAiAssist("policies", "shipping", getPolicyText(profile.policies?.shipping))}
                    disabled={aiLoadingField === "policies.shipping"}
                    style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    ✨ {aiLoadingField === "policies.shipping" ? "Drafting..." : "Draft Template with AI"}
                  </button>
                </div>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={getPolicyText(profile.policies?.shipping)}
                  onChange={e => setProfile(prev => ({ ...prev, policies: { ...prev.policies!, shipping: e.target.value } }))}
                  placeholder="Dispatch turnaround times, delivery areas covered, tracking info..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", lineHeight: "1.4" }}
                />
              </div>

              {/* Privacy Policy */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <label style={{ fontSize: "12px", fontWeight: 600 }}>Customer Privacy Notice</label>
                  <button
                    type="button"
                    onClick={() => handleAiAssist("policies", "privacy", getPolicyText(profile.policies?.privacy))}
                    disabled={aiLoadingField === "policies.privacy"}
                    style={{ background: "none", border: "none", color: "var(--color-forest)", fontSize: "12px", fontWeight: 700, cursor: "pointer" }}
                  >
                    ✨ {aiLoadingField === "policies.privacy" ? "Drafting..." : "Draft Template with AI"}
                  </button>
                </div>
                <textarea
                  rows={3}
                  maxLength={5000}
                  value={getPolicyText(profile.policies?.privacy)}
                  onChange={e => setProfile(prev => ({ ...prev, policies: { ...prev.policies!, privacy: e.target.value } }))}
                  placeholder="Explain how customer delivery addresses and phone numbers are securely handled..."
                  style={{ width: "100%", padding: "10px", borderRadius: "10px", border: "1px solid #DCE3D6", fontSize: "13px", lineHeight: "1.4" }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "12px 28px",
              borderRadius: "9999px",
              background: store?.brandColor || "var(--color-forest)",
              color: "#FFFFFF",
              fontSize: "14px",
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(8, 72, 45, 0.2)"
            }}
          >
            {saving ? "Saving Modules..." : "Save Store Page Modules"}
          </button>
        </div>
      </form>
    </div>
  );
};
