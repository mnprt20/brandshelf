import React, { useState, useEffect } from "react";
import { StoreAnnouncementModule } from "../../types";
import { isAnnouncementActive } from "../../utils/istTime";

interface Props {
  announcement?: StoreAnnouncementModule;
  isOnline: boolean;
  brandColor?: string;
}

export const StorefrontBanner: React.FC<Props> = ({
  announcement,
  isOnline,
  brandColor = "#08482D"
}) => {
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem("mintshelf_announcement_dismissed") === "true") {
        setIsDismissed(true);
      }
    } catch {}
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    try {
      sessionStorage.setItem("mintshelf_announcement_dismissed", "true");
    } catch {}
  };

  const showAnnouncement =
    announcement &&
    announcement.enabled &&
    announcement.text &&
    !isDismissed &&
    isAnnouncementActive(announcement.startsAt, announcement.endsAt);

  const getToneStyle = (tone?: "info" | "offer" | "warning") => {
    switch (tone) {
      case "offer":
        return {
          bg: "#ECFDF5",
          border: "#A7F3D0",
          text: "#065F46",
          icon: "🏷️"
        };
      case "warning":
        return {
          bg: "#FFFBEB",
          border: "#FDE68A",
          text: "#92400E",
          icon: "⚠️"
        };
      case "info":
      default:
        return {
          bg: "#EFF6FF",
          border: "#BFDBFE",
          text: "#1E40AF",
          icon: "📢"
        };
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%" }}>
      {/* Offline Status Warning */}
      {!isOnline && (
        <div
          style={{
            background: "#FEF3C7",
            borderBottom: "1px solid #FCD34D",
            color: "#92400E",
            padding: "8px 16px",
            fontSize: "12px",
            fontWeight: 600,
            textAlign: "center",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          <span>📶</span>
          <span>You are currently offline. You can browse and add items to your cart, but checkout requires an active internet connection.</span>
        </div>
      )}

      {/* Store Announcement Banner */}
      {showAnnouncement && (
        <div
          style={{
            background: getToneStyle(announcement?.tone).bg,
            borderBottom: `1px solid ${getToneStyle(announcement?.tone).border}`,
            color: getToneStyle(announcement?.tone).text,
            padding: "9px 16px",
            fontSize: "13px",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: "12px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", flex: 1, justifyContent: "center" }}>
            <span>{getToneStyle(announcement?.tone).icon}</span>
            <span>{announcement.text}</span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            title="Dismiss announcement"
            style={{
              background: "none",
              border: "none",
              color: getToneStyle(announcement?.tone).text,
              fontSize: "15px",
              cursor: "pointer",
              padding: "0 4px"
            }}
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
};
