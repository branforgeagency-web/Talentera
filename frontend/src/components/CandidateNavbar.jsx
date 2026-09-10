import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import api from "../api/client";
import CandidateNotificationModal from "./CandidateNotificationModal.jsx";

export default function CandidateNavbar({
  activeTab = "home",
  onTabChange,
  candidate: propCandidate,
  counts: propCounts,
  onEditStage,
}) {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationModal, setShowNotificationModal] = useState(false);

  // Local candidate fallback if not passed directly
  const [candidateData, setCandidateData] = useState(propCandidate || null);
  const [countsData, setCountsData] = useState(
    propCounts || {
      filledFields: 0,
      totalFields: 38,
      jobsCount: 0,
      applicationsCount: 0,
      interviewsCount: 0,
    }
  );

  // Sync prop candidate/counts if updated
  useEffect(() => {
    if (propCandidate) setCandidateData(propCandidate);
  }, [propCandidate]);

  useEffect(() => {
    if (propCounts) setCountsData(propCounts);
  }, [propCounts]);

  // If candidate or counts not provided (e.g. on Learn page), fetch profile & counts
  useEffect(() => {
    if (!propCandidate || !propCounts) {
      api
        .get("/candidate/me")
        .then((res) => {
          if (res.data) {
            const cand = res.data.candidate || res.data;
            setCandidateData(cand);

            const apps = res.data.applications || [];
            const completed = Array.isArray(cand.completedStages) ? cand.completedStages : [];
            const interviewRecs = [];
            if (cand.stage8?.scheduledSlot) {
              interviewRecs.push({ id: "stage8", date: cand.stage8.scheduledSlot });
            }
            if (cand.stage5?.videoUrl || cand.stage5?.aiScore) {
              interviewRecs.push({ id: "stage5", date: "Stage 5 AI Voice" });
            }

            setCountsData((prev) => ({
              ...prev,
              applicationsCount: apps.length,
              interviewsCount: interviewRecs.length,
              filledFields: prev.filledFields || completed.length * 4,
            }));
          }
        })
        .catch(() => {});

      // Fetch public jobs count
      api
        .get("/public/jobs")
        .then((res) => {
          if (res.data?.jobs) {
            setCountsData((prev) => ({ ...prev, jobsCount: res.data.jobs.length }));
          }
        })
        .catch(() => {});
    }
  }, [propCandidate, propCounts]);

  // Fetch candidate notifications
  const fetchNotifications = () => {
    api
      .get("/candidate/notifications")
      .then((res) => {
        if (res.data?.notifications) {
          setNotifications(res.data.notifications);
          setUnreadCount(res.data.unreadCount ?? res.data.notifications.filter((n) => !n.read).length);
        }
      })
      .catch((err) => {
        console.warn("Could not load candidate notifications:", err);
      });
  };

  useEffect(() => {
    fetchNotifications();
    // Refresh notifications every 60s
    const interval = setInterval(fetchNotifications, 60000);
    return () => clearInterval(interval);
  }, []);

  const candidate = candidateData || user || {};
  const rawName =
    candidate?.stage1?.fullName || candidate?.name || (candidate?.email ? candidate.email.split("@")[0] : "Candidate");
  const firstName = rawName.split(" ")[0] || "Candidate";
  const fullName = rawName;
  const initial = (firstName[0] || "C").toUpperCase();
  const locality = candidate?.stage1?.city
    ? candidate.stage1.state
      ? `${candidate.stage1.city}, ${candidate.stage1.state}`
      : candidate.stage1.city
    : candidate?.email || "Locality not set";

  function handleLogout() {
    logout();
    navigate("/");
  }

  function handleNavClick(tabId) {
    if (onTabChange) {
      onTabChange(tabId);
    } else {
      navigate(`/dashboard?tab=${tabId}`);
    }
  }

  function handleNotificationAction(actionType) {
    if (!actionType) return;
    if (actionType === "applications") {
      handleNavClick("applications");
    } else if (actionType.startsWith("stage_")) {
      const stageNum = Number(actionType.replace("stage_", ""));
      if (onEditStage) {
        onEditStage(stageNum);
      } else {
        navigate(`/dashboard?stage=${stageNum}`);
      }
    }
  }

  const navItems = [
    { id: "home", label: "Home" },
    {
      id: "profile",
      label: countsData?.totalFields
        ? `Profile (${countsData.filledFields}/${countsData.totalFields})`
        : "Profile",
    },
    {
      id: "apply",
      label: countsData?.jobsCount !== undefined ? `Apply (${countsData.jobsCount})` : "Apply",
    },
    {
      id: "applications",
      label:
        countsData?.applicationsCount !== undefined
          ? `Applications (${countsData.applicationsCount})`
          : "Applications",
    },
    {
      id: "interviews",
      label:
        countsData?.interviewsCount !== undefined
          ? `Interviews (${countsData.interviewsCount})`
          : "Interviews",
    },
    { id: "learn", label: "Learn" },
  ];

  return (
    <>
      <header
        style={{
          background: "rgba(6, 21, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Left Brand Logo */}
        <div
          style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}
          onClick={() => handleNavClick("home")}
          title="Talentera Candidate Dashboard"
        >
          <img src="/logo-white.png" alt="Talentera" style={{ height: 34, width: "auto", objectFit: "contain" }} />
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavClick(item.id)}
                style={{
                  background: isActive ? "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)" : "transparent",
                  color: isActive ? "#06152A" : "rgba(255, 255, 255, 0.8)",
                  padding: isActive ? "6px 18px" : "6px 14px",
                  borderRadius: 20,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 13,
                  border: "none",
                  boxShadow: isActive ? "0 0 16px rgba(245, 184, 46, 0.35)" : "none",
                  cursor: "pointer",
                  transition: "all 0.15s ease",
                }}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Right Action Icons & User Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          {/* Notification Bell -> Opens Notification Modal */}
          <div
            style={{
              position: "relative",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: showNotificationModal ? "rgba(229, 168, 46, 0.2)" : "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              transition: "all 0.15s ease",
            }}
            onClick={() => setShowNotificationModal(true)}
            title="Open Notifications"
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(229, 168, 46, 0.15)";
              e.currentTarget.style.borderColor = "rgba(229, 168, 46, 0.4)";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = showNotificationModal
                ? "rgba(229, 168, 46, 0.2)"
                : "rgba(255, 255, 255, 0.05)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.1)";
            }}
          >
            <span style={{ fontSize: 16, color: "#E5A82E" }}>
              <i className="fa-solid fa-bell"></i>
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  position: "absolute",
                  top: -4,
                  right: -4,
                  background: "#EF4444",
                  color: "#FFFFFF",
                  fontSize: 10,
                  fontWeight: 900,
                  minWidth: 18,
                  height: 18,
                  padding: "0 4px",
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "2px solid #06152A",
                  boxShadow: "0 2px 6px rgba(239, 68, 68, 0.5)",
                }}
              >
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </div>

          {/* Profile Pill & Text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "4px 12px 4px 6px",
              borderRadius: 24,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
                boxShadow: "0 2px 8px rgba(139, 92, 246, 0.4)",
              }}
            >
              {initial}
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{fullName}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, lineHeight: 1.2 }}>{locality}</span>
            </div>
          </div>

          {/* Exit / Sign out button */}
          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
              e.currentTarget.style.color = "#FCA5A5";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Candidate Notification Modal */}
      <CandidateNotificationModal
        isOpen={showNotificationModal}
        onClose={() => setShowNotificationModal(false)}
        notifications={notifications}
        setNotifications={setNotifications}
        unreadCount={unreadCount}
        setUnreadCount={setUnreadCount}
        onActionClick={handleNotificationAction}
      />
    </>
  );
}
