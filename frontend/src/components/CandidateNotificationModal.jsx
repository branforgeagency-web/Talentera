import React, { useState, useEffect } from "react";
import api from "../api/client";

export default function CandidateNotificationModal({
  isOpen,
  onClose,
  onActionClick,
  notifications = [],
  setNotifications,
  unreadCount = 0,
  setUnreadCount,
}) {
  const [filter, setFilter] = useState("all"); // "all" | "application" | "verification" | "unread"

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleMarkAllRead = async () => {
    try {
      await api.post("/candidate/notifications/mark-read");
    } catch (err) {
      console.warn("Could not mark notifications read on server:", err);
    }
    if (setNotifications) {
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
    if (setUnreadCount) {
      setUnreadCount(0);
    }
  };

  const handleItemClick = (item) => {
    // Mark individual as read in local state
    if (!item.read && setNotifications) {
      setNotifications((prev) =>
        prev.map((n) => (n._id === item._id ? { ...n, read: true } : n))
      );
      if (setUnreadCount) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    }

    if (item.actionType && onActionClick) {
      onActionClick(item.actionType);
      onClose();
    }
  };

  // Filter list
  const filtered = notifications.filter((item) => {
    if (filter === "unread") return !item.read;
    if (filter === "application") return item.category === "application";
    if (filter === "verification") return item.category === "verification" || item.category === "stage";
    return true;
  });

  const getIconConfig = (type) => {
    switch (type) {
      case "application_shortlisted":
        return { icon: "fa-bullseye", bg: "#FEF3C7", color: "#D97706", label: "Shortlisted" };
      case "interview_scheduled":
        return { icon: "fa-calendar-check", bg: "#EFF6FF", color: "#2563EB", label: "Interview" };
      case "offer_received":
        return { icon: "fa-award", bg: "#DCFCE7", color: "#16A34A", label: "Job Offer" };
      case "application_submitted":
        return { icon: "fa-paper-plane", bg: "#F1F5F9", color: "#0A1F3D", label: "Application" };
      case "application_update":
        return { icon: "fa-briefcase", bg: "#F3F4F6", color: "#64748B", label: "Update" };
      case "kyc_verified":
        return { icon: "fa-id-card", bg: "#ECFDF5", color: "#059669", label: "KYC Verified" };
      case "assessment_passed":
        return { icon: "fa-chart-simple", bg: "#EEF2FF", color: "#4F46E5", label: "Assessment" };
      case "ai_interview_done":
        return { icon: "fa-microphone", bg: "#FEF2F2", color: "#DC2626", label: "AI Interview" };
      case "resume_ready":
        return { icon: "fa-file-lines", bg: "#FDF4FF", color: "#9333EA", label: "Resume" };
      default:
        return { icon: "fa-bell", bg: "#FEF9C3", color: "#CA8A04", label: "Notification" };
    }
  };

  const formatTimestamp = (dateStr) => {
    if (!dateStr) return "Just now";
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const diffMs = now - d;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    } catch {
      return "Recently";
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(6, 21, 42, 0.72)",
        backdropFilter: "blur(6px)",
        padding: "16px",
        animation: "modalFadeIn 0.2s ease-out",
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { opacity: 0; transform: translateY(16px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
      <div
        style={{
          width: "100%",
          maxWidth: 580,
          background: "#FFFFFF",
          borderRadius: 20,
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(10, 31, 61, 0.08)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          maxHeight: "88vh",
          animation: "modalSlideUp 0.25s ease-out",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* MODAL HEADER */}
        <div
          style={{
            padding: "20px 24px 16px",
            background: "linear-gradient(135deg, #0A1F3D 0%, #06152A 100%)",
            color: "#FFFFFF",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                color: "#06152A",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 18,
                boxShadow: "0 4px 12px rgba(245, 184, 46, 0.35)",
              }}
            >
              <i className="fa-solid fa-bell"></i>
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
                  Notifications
                </h3>
                {unreadCount > 0 ? (
                  <span
                    style={{
                      background: "#EF4444",
                      color: "#FFFFFF",
                      fontSize: 10.5,
                      fontWeight: 800,
                      padding: "2px 8px",
                      borderRadius: 12,
                      letterSpacing: "0.2px",
                    }}
                  >
                    {unreadCount} New
                  </span>
                ) : (
                  <span
                    style={{
                      background: "rgba(255, 255, 255, 0.15)",
                      color: "#E2E8F0",
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: 12,
                    }}
                  >
                    All caught up ✓
                  </span>
                )}
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "rgba(255, 255, 255, 0.65)" }}>
                Live updates on your job applications, interviews &amp; verified stages
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  color: "#F5B82E",
                  borderRadius: 8,
                  padding: "5px 10px",
                  fontSize: 11,
                  fontWeight: 700,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.15s ease",
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.background = "rgba(245, 184, 46, 0.18)";
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
                }}
              >
                <i className="fa-solid fa-check-double"></i> Mark read
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              style={{
                background: "rgba(255, 255, 255, 0.08)",
                border: "none",
                color: "#FFFFFF",
                width: 32,
                height: 32,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                fontSize: 14,
                transition: "all 0.15s ease",
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.08)";
              }}
              title="Close modal (Esc)"
            >
              <i className="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>

        {/* FILTER TABS */}
        <div
          style={{
            display: "flex",
            gap: 8,
            padding: "12px 20px",
            background: "#F8FAFC",
            borderBottom: "1px solid #E2E8F0",
            overflowX: "auto",
          }}
        >
          {[
            { id: "all", label: `All (${notifications.length})` },
            {
              id: "application",
              label: `Applications (${notifications.filter((n) => n.category === "application").length})`,
            },
            {
              id: "verification",
              label: `Verifications (${
                notifications.filter((n) => n.category === "verification" || n.category === "stage").length
              })`,
            },
            { id: "unread", label: `Unread (${unreadCount})` },
          ].map((tab) => {
            const active = filter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilter(tab.id)}
                style={{
                  background: active ? "#0A1F3D" : "#FFFFFF",
                  color: active ? "#FFFFFF" : "#475569",
                  border: active ? "1px solid #0A1F3D" : "1px solid #CBD5E1",
                  borderRadius: 20,
                  padding: "5px 12px",
                  fontSize: 11.5,
                  fontWeight: active ? 700 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  transition: "all 0.15s ease",
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* NOTIFICATIONS LIST BODY */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            maxHeight: "52vh",
            padding: "8px 12px",
          }}
        >
          {filtered.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: "50%",
                  background: "#F1F5F9",
                  color: "#94A3B8",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 22,
                  margin: "0 auto 14px",
                }}
              >
                <i className="fa-solid fa-bell-slash"></i>
              </div>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "#0A1F3D" }}>
                {filter === "unread" ? "No unread notifications" : "No notifications yet"}
              </h4>
              <p style={{ margin: 0, fontSize: 12.5, color: "#64748B", maxWidth: 360, marginInline: "auto" }}>
                {filter === "unread"
                  ? "You are completely up to date. New updates will appear here."
                  : "Updates regarding your job applications, shortlisted employers, and verified stages will appear here automatically."}
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {filtered.map((n) => {
                const conf = getIconConfig(n.type);
                const isUnread = !n.read;
                return (
                  <div
                    key={n._id}
                    onClick={() => handleItemClick(n)}
                    style={{
                      background: isUnread ? "#FEFDF8" : "#FFFFFF",
                      border: isUnread ? "1px solid #FDE68A" : "1px solid #E2E8F0",
                      borderLeft: isUnread ? "4px solid #E5A82E" : "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 12,
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.background = isUnread ? "#FFFBEB" : "#F8FAFC";
                      e.currentTarget.style.borderColor = "#CBD5E1";
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.background = isUnread ? "#FEFDF8" : "#FFFFFF";
                      e.currentTarget.style.borderColor = isUnread ? "#FDE68A" : "#E2E8F0";
                    }}
                  >
                    {/* TYPE ICON */}
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: conf.bg,
                        color: conf.color,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 14,
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    >
                      <i className={`fa-solid ${conf.icon}`}></i>
                    </div>

                    {/* CONTENT */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 3 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>
                            {n.title}
                          </span>
                          {isUnread && (
                            <span
                              style={{
                                width: 7,
                                height: 7,
                                borderRadius: "50%",
                                background: "#E5A82E",
                                display: "inline-block",
                              }}
                              title="Unread notification"
                            />
                          )}
                        </div>
                        <span style={{ fontSize: 10.5, color: "#94A3B8", fontWeight: 600, flexShrink: 0 }}>
                          {formatTimestamp(n.createdAt)}
                        </span>
                      </div>

                      <p style={{ margin: "0 0 6px", fontSize: 12, color: "#475569", lineHeight: 1.45 }}>
                        {n.message}
                      </p>

                      {n.actionType && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontSize: 11,
                              fontWeight: 800,
                              color: "#2563EB",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: 4,
                            }}
                          >
                            {n.actionLabel || "View details"} <i className="fa-solid fa-arrow-right" style={{ fontSize: 9 }}></i>
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div
          style={{
            padding: "12px 20px",
            background: "#F8FAFC",
            borderTop: "1px solid #E2E8F0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <span style={{ fontSize: 11.5, color: "#64748B" }}>
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 5, color: "#E5A82E" }}></i>
            Talentera Verified Candidate Updates
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "#0A1F3D",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "7px 18px",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
            onMouseOver={(e) => (e.currentTarget.style.background = "#132D54")}
            onMouseOut={(e) => (e.currentTarget.style.background = "#0A1F3D")}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
