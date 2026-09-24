import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

export default function LiveActivityFeed({ initialEvents = [], onSelectStudent, onSelectCandidate, getAuthHeader, token }) {
  const [events, setEvents] = useState(initialEvents);
  const [filterType, setFilterType] = useState("all");
  const [loading, setLoading] = useState(false);

  const getHeaders = () => {
    if (typeof getAuthHeader === "function") {
      return getAuthHeader();
    }
    const t = token || localStorage.getItem("talentera_academy_token") || "";
    return t ? { Authorization: `Bearer ${t}` } : {};
  };

  const fetchLiveEvents = async () => {
    try {
      const url = filterType === "all" ? "/api/academy/activity?limit=30" : `/api/academy/activity?eventType=${filterType}&limit=30`;
      const res = await fetch(url, { headers: { ...getHeaders() } });
      const data = await safeJson(res);
      if (data && data.events) {
        setEvents(data.events);
      }
    } catch (err) {
      console.error("Live activity fetch error:", err);
    }
  };

  useEffect(() => {
    if (initialEvents.length > 0 && filterType === "all") {
      setEvents(initialEvents);
    } else {
      fetchLiveEvents();
    }

    const interval = setInterval(() => {
      fetchLiveEvents();
    }, 25000); // 25s auto-refresh
    return () => clearInterval(interval);
  }, [filterType, initialEvents]);

  const getEventBadge = (type) => {
    switch (type) {
      case "offer_extended":
      case "offer_accepted":
        return { bg: "#DCFCE7", color: "#15803D", icon: "fa-award", label: "Offer" };
      case "interview_scheduled":
      case "interview_completed":
        return { bg: "#FEF3C7", color: "#B45309", icon: "fa-calendar-check", label: "Interview" };
      case "shortlisted":
        return { bg: "#F3E8FF", color: "#7E22CE", icon: "fa-star", label: "Shortlisted" };
      case "locked":
        return { bg: "#FEE2E2", color: "#DC2626", icon: "fa-lock", label: "Locked" };
      case "chatted":
        return { bg: "#E0F2FE", color: "#0369A1", icon: "fa-comment-dots", label: "Chat Active" };
      case "applied":
        return { bg: "#EFF6FF", color: "#2563EB", icon: "fa-paper-plane", label: "Applied" };
      case "rejected":
        return { bg: "#FEF2F2", color: "#DC2626", icon: "fa-circle-xmark", label: "Rejected" };
      default:
        return { bg: "#F1F5F9", color: "#475569", icon: "fa-eye", label: "Viewed" };
    }
  };

  const formatTimeAgo = (dateStr) => {
    if (!dateStr) return "Just now";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "Just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const filterTabs = [
    { id: "all", label: `All Events (${events.length})` },
    { id: "offer_extended", label: "Offers" },
    { id: "interview_scheduled", label: "Interviews" },
    { id: "shortlisted", label: "Shortlisted" },
    { id: "rejected", label: "Rejected" },
    { id: "locked", label: "Locks" },
    { id: "viewed", label: "Views" },
  ];

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E", display: "inline-block" }}></span>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Live Employer Activity Feed</h4>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
            Real-time pipeline transitions from hiring companies across all student cohorts
          </div>
        </div>

        <div style={{ display: "flex", gap: 6 }}>
          <button
            className="btn btn-outline"
            style={{ fontSize: 11, padding: "4px 10px" }}
            onClick={fetchLiveEvents}
            title="Refresh live activity feed"
          >
            <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 5 }}></i> Refresh Feed
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: 4, marginBottom: 12, overflowX: "auto" }}>
        {filterTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            style={{
              padding: "4px 10px",
              borderRadius: 999,
              border: "none",
              fontSize: 10,
              fontWeight: 700,
              cursor: "pointer",
              background: filterType === tab.id ? "#06152A" : "#F1F5F9",
              color: filterType === tab.id ? "#fff" : "#475569",
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Live Event Stream List */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
        {events.length === 0 ? (
          <div style={{ padding: "32px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
            <i className="fa-solid fa-radar" style={{ fontSize: 24, marginBottom: 6, display: "block" }}></i>
            No activity events recorded yet. Student profile views, locks, and interviews will stream here in real time.
          </div>
        ) : (
          events.map((ev, idx) => {
            const badge = getEventBadge(ev.eventType);
            return (
              <div
                key={ev._id || idx}
                onClick={() => {
                  if (onSelectStudent) onSelectStudent(ev.candidateId);
                  else if (onSelectCandidate) onSelectCandidate(ev.candidateId);
                }}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "10px 12px",
                  borderRadius: 10,
                  background: "#F8FAFC",
                  border: "1px solid #E2E8F0",
                  cursor: "pointer",
                  transition: "background 0.15s ease",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#EFF6FF")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "#F8FAFC")}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                  <span
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: badge.bg,
                      color: badge.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 12,
                      flexShrink: 0,
                    }}
                  >
                    <i className={`fa-solid ${badge.icon}`}></i>
                  </span>

                  <div>
                    <div style={{ fontSize: 12, color: "#06152A" }}>
                      <strong>{ev.candidateName}</strong> {ev.eventType === "offer_extended" ? "received offer from" : ev.eventType === "interview_scheduled" ? "interview scheduled at" : ev.eventType === "locked" ? "profile locked by" : ev.eventType === "shortlisted" ? "shortlisted by" : ev.eventType === "rejected" ? "application closed / rejected by" : ev.eventType === "chatted" ? "chat initiated by" : "viewed by"}{" "}
                      <strong style={{ color: ev.eventType === "rejected" ? "#DC2626" : "#2563EB" }}>{ev.companyName}</strong>
                      {ev.eventMeta?.salary && <span style={{ marginLeft: 6, color: "#15803D", fontWeight: 800 }}>({ev.eventMeta.salary})</span>}
                      {ev.eventMeta?.interviewTime && <span style={{ marginLeft: 6, color: "#B45309", fontWeight: 700 }}>· {ev.eventMeta.interviewTime}</span>}
                      {ev.eventMeta?.lockExpiresIn && <span style={{ marginLeft: 6, color: "#DC2626", fontSize: 10 }}>· Expires in {ev.eventMeta.lockExpiresIn}</span>}
                    </div>
                    {ev.eventType === "rejected" && (ev.eventMeta?.reason || ev.eventMeta?.details) && (
                      <div style={{ fontSize: 10.5, color: "#991B1B", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 4, padding: "2px 6px", marginTop: 3, display: "inline-block" }}>
                        <strong>Reason:</strong> {ev.eventMeta.reason || "Qualifications mismatch"}
                        {ev.eventMeta.details && <span style={{ color: "#7F1D1D", marginLeft: 4 }}>· {ev.eventMeta.details}</span>}
                      </div>
                    )}
                    <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>
                      {ev.batchCode || "JAN-HCC-01"} · {ev.jobTitle || ev.courseTitle || "Medical Coder"}
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: "right", flexShrink: 0, marginLeft: 12 }}>
                  <span style={{ fontSize: 10, color: "#94A3B8" }}>{formatTimeAgo(ev.createdAt)}</span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
