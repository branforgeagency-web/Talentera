import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

export default function StaffHub() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("overview"); // see NAV_ITEMS below for the full id list - "overview" | "kyc" | "certifications" | "jobapprovals" | "questions" | "reports" | "activity"
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  // Which company/candidate/job is open in each queue tab's list+detail
  // (inbox style) layout - null falls back to the first item in that queue.
  const [selectedKycId, setSelectedKycId] = useState(null);
  const [selectedCertId, setSelectedCertId] = useState(null);
  const [selectedJobId, setSelectedJobId] = useState(null);

  const [auditModal, setAuditModal] = useState(null);
  const [certAuditModal, setCertAuditModal] = useState(null);
  const [jobAuditModal, setJobAuditModal] = useState(null);
  const [staffNotifications, setStaffNotifications] = useState([]);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [showStaffNotif, setShowStaffNotif] = useState(false);

  // Staff activity log (who verified/edited what, and when) - see
  // backend/models/AuditLog.js and GET /api/staff/audit-log. Previously
  // there was no record of staff actions at all; loaded lazily, page by
  // page, the first time this tab is opened.
  const [activityEntries, setActivityEntries] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);
  const [activityPage, setActivityPage] = useState(1);
  const [activityTotalPages, setActivityTotalPages] = useState(1);

  // Interview Questions (Stage 5 AI Video / AI Audio interview bank)
  const [interviewQuestions, setInterviewQuestions] = useState([]);
  const [questionsLoading, setQuestionsLoading] = useState(true);
  const [questionModal, setQuestionModal] = useState(null); // { id?, text, correctAnswer, mode, order, active }
  const [questionModeFilter, setQuestionModeFilter] = useState("all"); // "all" | "video" | "audio" | "both"

  const getAuthHeader = () => {
    const token = localStorage.getItem("talentera_staff_token");
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  useEffect(() => {
    fetchDashboard();
    fetchStaffNotifications();
    fetchInterviewQuestions();
  }, []);

  useEffect(() => {
    if (activeNav === "activity" && !activityLoaded) {
      fetchActivityLog(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNav]);

  const fetchActivityLog = async (page) => {
    setActivityLoading(true);
    try {
      const res = await fetch(`/api/staff/audit-log?page=${page}&limit=25`, {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setActivityEntries(data.entries || []);
      setActivityPage(data.page || 1);
      setActivityTotalPages(data.totalPages || 1);
      setActivityLoaded(true);
    } catch (err) {
      console.error(err);
    } finally {
      setActivityLoading(false);
    }
  };

  const fetchInterviewQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/staff/interview-questions", { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setInterviewQuestions(data.questions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setQuestionsLoading(false);
    }
  };

  const openCreateQuestionModal = () => {
    setQuestionModal({ text: "", correctAnswer: "", mode: "both", order: (interviewQuestions.length || 0) * 10, active: true });
  };

  const openEditQuestionModal = (q) => {
    setQuestionModal({ id: q._id, text: q.text, correctAnswer: q.correctAnswer, mode: q.mode, order: q.order, active: q.active });
  };

  const submitQuestionModal = async () => {
    if (!questionModal) return;
    const { id, text, correctAnswer, mode, order, active } = questionModal;
    if (!text.trim()) {
      alert("Question text is required.");
      return;
    }
    setProcessingId(id || "new-question");
    try {
      const res = await fetch(id ? `/api/staff/interview-questions/${id}` : "/api/staff/interview-questions", {
        method: id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ text, correctAnswer, mode, order, active }),
      });
      if (!res.ok) {
        const data = await safeJson(res);
        alert(data.message || "Failed to save the interview question.");
        return;
      }
      setQuestionModal(null);
      fetchInterviewQuestions();
    } catch (err) {
      console.error(err);
      alert("Failed to save the interview question.");
    } finally {
      setProcessingId(null);
    }
  };

  const handleDeleteQuestion = async (q) => {
    if (!window.confirm(`Delete this interview question?\n\n"${q.text}"`)) return;
    setProcessingId(q._id);
    try {
      await fetch(`/api/staff/interview-questions/${q._id}`, {
        method: "DELETE",
        headers: { ...getAuthHeader() },
      });
      fetchInterviewQuestions();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleToggleQuestionActive = async (q) => {
    setProcessingId(q._id);
    try {
      await fetch(`/api/staff/interview-questions/${q._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ active: !q.active }),
      });
      fetchInterviewQuestions();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const fetchStaffNotifications = async () => {
    try {
      const res = await fetch("/api/staff/notifications", {
        headers: { ...getAuthHeader() },
      });
      if (res.ok) {
        const data = await safeJson(res);
        setStaffNotifications(data.notifications || []);
        setStaffUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const markStaffNotifRead = async () => {
    try {
      await fetch("/api/staff/notifications/mark-read", {
        method: "POST",
        headers: { ...getAuthHeader() },
      });
      setStaffUnreadCount(0);
      setStaffNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/staff/dashboard", {
        headers: { ...getAuthHeader() },
      });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await safeJson(res);
      setDashData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCandidate = async (candidateId, action) => {
    setProcessingId(candidateId);
    try {
      const res = await fetch("/api/staff/verify-candidate", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ candidateId, action })
      });
      const data = await safeJson(res);
      fetchDashboard();
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyCompany = (comp, action) => {
    setAuditModal({
      company: comp,
      action,
      notes: action === "verify" ? "Account & KYC documents audited and verified by Staff Officer." : "",
      reason: action === "reject" ? "KYC document image unreadable or invalid format. Please re-upload clear certificate." : "",
    });
  };

  const submitAuditModal = async () => {
    if (!auditModal) return;
    setProcessingId(auditModal.company.id);
    try {
      const res = await fetch("/api/staff/verify-company", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          companyId: auditModal.company.id,
          action: auditModal.action,
          notes: auditModal.notes,
          rejectionReason: auditModal.reason,
        }),
      });
      const data = await safeJson(res);
      fetchDashboard();
      setAuditModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Certification (Stage 3) document audit — mirrors handleVerifyCompany /
  // submitAuditModal above, scoped to a candidate's certification claim
  // instead of a company's KYC documents.
  const handleAuditCertification = (cert, action) => {
    setCertAuditModal({
      cert,
      action,
      notes: action === "verify" ? "Certificate document reviewed and confirmed genuine by Staff Auditor." : "",
      reason: action === "reject" ? "Certificate document could not be confirmed as genuine. Please re-upload a clear, valid document." : "",
    });
  };

  const submitCertAuditModal = async () => {
    if (!certAuditModal) return;
    setProcessingId(certAuditModal.cert.id);
    try {
      await fetch("/api/staff/verify-certification", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          candidateId: certAuditModal.cert.id,
          action: certAuditModal.action,
          notes: certAuditModal.notes,
          rejectionReason: certAuditModal.reason,
        }),
      });
      fetchDashboard();
      setCertAuditModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  // Job Post Approval (onboarding first-JD or a later "Job Posts" posting)
  // — mirrors handleAuditCertification / submitCertAuditModal above, scoped
  // to a company's job post instead of a candidate's certification claim.
  const handleAuditJob = (job, action) => {
    setJobAuditModal({
      job,
      action,
      reason: action === "reject" ? "Job post did not meet Talentera's listing guidelines. Please review and resubmit." : "",
    });
  };

  const submitJobAuditModal = async () => {
    if (!jobAuditModal) return;
    setProcessingId(jobAuditModal.job.id);
    try {
      await fetch("/api/staff/verify-job", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          source: jobAuditModal.job.source,
          id: jobAuditModal.job.id,
          action: jobAuditModal.action,
          rejectionReason: jobAuditModal.reason,
        }),
      });
      fetchDashboard();
      setJobAuditModal(null);
    } catch (err) {
      console.error(err);
    } finally {
      setProcessingId(null);
    }
  };

  const handleVerifyDoc = async (companyId, docId, isValid) => {
    try {
      const res = await fetch("/api/staff/verify-document", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({ companyId, docId, isValid })
      });
      const data = await safeJson(res);
      fetchDashboard();
      if (previewDoc && previewDoc.docId === docId) {
        setPreviewDoc((prev) => prev ? { ...prev, isValid } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>Loading Staff Operations Hub...</div>;

  const { stats, pipeline, incomingBucket, companyKycQueue, certificationQueue, jobApprovalQueue, reportsData, tasks, leaderboard, liveQueueCount } = dashData || {};

  // Per-queue status breakdowns - KYC, Certifications, and Job Approvals
  // each got their own dedicated tab (previously all three were stacked
  // into one long "Audit Queue" page); these power the stat pills on each
  // tab's own header and the quick-access cards on Overview.
  const kycCounts = {
    pending: (companyKycQueue || []).filter((c) => c.kycStatus === "pending" || c.kycStatus === "under_review").length,
    verified: (companyKycQueue || []).filter((c) => c.kycStatus === "verified").length,
    rejected: (companyKycQueue || []).filter((c) => c.kycStatus === "rejected").length,
  };
  const certCounts = {
    pending: (certificationQueue || []).filter((c) => c.certStatus === "pending").length,
    verified: (certificationQueue || []).filter((c) => c.certStatus === "verified").length,
    rejected: (certificationQueue || []).filter((c) => c.certStatus === "rejected").length,
  };
  const jobCounts = {
    pending: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "pending").length,
    approved: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "approved").length,
    rejected: (jobApprovalQueue || []).filter((j) => j.approvalStatus === "rejected").length,
  };

  // Sidebar nav + the header's "Active Module" label are both driven off
  // this one list so the two never drift out of sync.
  const NAV_ITEMS = [
    { id: "overview", label: "Overview", icon: "⚡" },
    { id: "kyc", label: "KYC Verification", icon: "🔍" },
    { id: "certifications", label: "Certifications", icon: "🎓" },
    { id: "jobapprovals", label: "Job Approvals", icon: "📋" },
    { id: "questions", label: "Interview Questions", icon: "🎤" },
    { id: "reports", label: "Reports & Metrics", icon: "📊" },
    { id: "activity", label: "Activity Log", icon: "🗒️" },
  ];
  const activeNavLabel = NAV_ITEMS.find((n) => n.id === activeNav)?.label || activeNav;

  // Small stat pill used on each queue tab's page header (KYC /
  // Certifications / Job Approvals) to show a pending/approved/rejected
  // breakdown at a glance.
  function StatPill({ count, label, tone }) {
    const tones = {
      pending: {
        bg: "linear-gradient(135deg, #FFFBEB 0%, #FEF3C7 100%)",
        border: "rgba(245, 158, 11, 0.3)",
        color: "#92400E",
        dot: "#F59E0B",
        glow: "rgba(245, 158, 11, 0.12)",
      },
      good: {
        bg: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
        border: "rgba(34, 197, 94, 0.3)",
        color: "#15803D",
        dot: "#22C55E",
        glow: "rgba(34, 197, 94, 0.12)",
      },
      bad: {
        bg: "linear-gradient(135deg, #FEF2F2 0%, #FEE2E2 100%)",
        border: "rgba(239, 68, 68, 0.3)",
        color: "#B91C1C",
        dot: "#EF4444",
        glow: "rgba(239, 68, 68, 0.12)",
      },
    };
    const t = tones[tone] || tones.pending;
    return (
      <div
        style={{
          background: t.bg,
          border: `1px solid ${t.border}`,
          borderRadius: 14,
          padding: "10px 18px",
          textAlign: "center",
          minWidth: 96,
          boxShadow: `0 2px 8px ${t.glow}`,
          transition: "all 0.15s ease",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: t.dot, display: "inline-block" }} />
          <span style={{ fontSize: 9.5, fontWeight: 800, color: t.color, letterSpacing: "0.08em", textTransform: "uppercase" }}>{label}</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 800, color: t.color, fontFamily: "var(--font-display)", lineHeight: 1.1 }}>{count}</div>
      </div>
    );
  }

  // Page header used at the top of each standalone queue tab.
  function QueuePageHeader({ icon, title, subtitle, accent = "#2563EB", pills }) {
    return (
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 18,
          border: "1px solid #E2E8F0",
          boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)",
          padding: "20px 24px",
          marginBottom: 24,
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top Accent Gradient Bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: `linear-gradient(90deg, ${accent} 0%, ${accent}66 100%)`,
          }}
        />

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16, maxWidth: 640 }}>
            {/* Dual-ring Styled Icon Badge */}
            <div
              style={{
                width: 52,
                height: 52,
                flexShrink: 0,
                borderRadius: 14,
                background: `linear-gradient(135deg, ${accent}1A 0%, ${accent}0D 100%)`,
                border: `1px solid ${accent}33`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 24,
                boxShadow: `0 4px 12px ${accent}15`,
              }}
            >
              {icon}
            </div>

            <div>
              {/* Module Tag Pill */}
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: accent, background: `${accent}12`, padding: "2px 8px", borderRadius: 999 }}>
                  Staff Moderation Module
                </span>
              </div>

              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#0F172A", margin: 0, letterSpacing: "-0.01em" }}>
                {title}
              </h2>
              <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B", lineHeight: 1.5 }}>
                {subtitle}
              </p>
            </div>
          </div>

          {/* Stat Pills */}
          <div style={{ display: "flex", gap: 12, alignItems: "center" }}>{pills}</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* Shell */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        {/* Dark Navy Sidebar */}
        <aside style={{ background: "linear-gradient(180deg, #06152A 0%, #0A1F3D 100%)", color: "#fff", padding: 20, borderRight: "1px solid rgba(229,168,46,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 18, cursor: "pointer" }} onClick={() => navigate("/")}>
            <div>
              <img src="/logo.png" alt="Talentera" style={{ height: 30, width: "auto" }} />
              <div style={{ fontSize: 9, color: "var(--gold-light)", letterSpacing: "0.14em", fontWeight: 700, marginTop: 4 }}>
                OPERATIONS HUB
              </div>
            </div>
          </div>

          <div style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 8, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22C55E" }} />
              <span>LIVE QUEUE</span>
            </div>
            <strong style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>{liveQueueCount || 0}</strong>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(229,168,46,0.7)", letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase" }}>
            NAVIGATION
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {NAV_ITEMS.map((nav) => {
              // Pending-count badges for the three review queues, so staff
              // can see where the work is without opening each tab.
              const badgeCount =
                nav.id === "kyc" ? kycCounts.pending :
                nav.id === "certifications" ? certCounts.pending :
                nav.id === "jobapprovals" ? jobCounts.pending :
                0;
              return (
                <button
                  key={nav.id}
                  type="button"
                  onClick={() => setActiveNav(nav.id)}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    background: activeNav === nav.id ? "rgba(229,168,46,0.15)" : "transparent",
                    color: activeNav === nav.id ? "var(--gold)" : "rgba(255,255,255,0.7)",
                    fontWeight: activeNav === nav.id ? 700 : 500,
                    fontSize: 13,
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    border: activeNav === nav.id ? "1px solid rgba(229,168,46,0.3)" : "none",
                    cursor: "pointer",
                    textAlign: "left",
                    transition: "all 0.15s",
                  }}
                >
                  <span>{nav.icon}</span>
                  <span style={{ flex: 1 }}>{nav.label}</span>
                  {badgeCount > 0 && (
                    <span
                      style={{
                        background: activeNav === nav.id ? "var(--gold)" : "rgba(229,168,46,0.25)",
                        color: activeNav === nav.id ? "#0A1F3D" : "var(--gold)",
                        fontSize: 10,
                        fontWeight: 800,
                        borderRadius: 999,
                        padding: "2px 7px",
                        minWidth: 18,
                        textAlign: "center",
                      }}
                    >
                      {badgeCount}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <button
            style={{ marginTop: 40, width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            onClick={() => {
              localStorage.removeItem("talentera_staff_token");
              localStorage.removeItem("talentera_staff_info");
              navigate("/staff/login");
            }}
          >
            Logout Staff Session
          </button>
        </aside>

        {/* Main Hub Area */}
        <main style={{ padding: 28 }}>
          {/* Welcome Header */}
          <div style={{ background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 50%, #1A3358 100%)", color: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid rgba(229,168,46,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                STAFF VERIFICATION CONSOLE
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
                Welcome back, Senior Auditor
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                Active Module: <strong style={{ color: "var(--gold)" }}>{activeNavLabel}</strong> • 24 Verifications Approved Today
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* STAFF IN-APP NOTIFICATION BELL */}
              <div style={{ position: "relative" }}>
                <button
                  type="button"
                  style={{
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 42,
                    height: 42,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    position: "relative",
                  }}
                  onClick={() => {
                    setShowStaffNotif(!showStaffNotif);
                    if (staffUnreadCount > 0) markStaffNotifRead();
                  }}
                >
                  <span style={{ fontSize: 18 }}>🔔</span>
                  {staffUnreadCount > 0 && (
                    <span
                      style={{
                        position: "absolute",
                        top: -3,
                        right: -3,
                        background: "#EF4444",
                        color: "#fff",
                        borderRadius: "50%",
                        width: 20,
                        height: 20,
                        fontSize: 10,
                        fontWeight: 900,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        border: "2px solid #0A1F3D",
                      }}
                    >
                      {staffUnreadCount}
                    </span>
                  )}
                </button>

                {/* NOTIFICATION DROPDOWN */}
                {showStaffNotif && (
                  <div
                    style={{
                      position: "absolute",
                      top: 52,
                      right: 0,
                      width: 360,
                      background: "#fff",
                      borderRadius: 14,
                      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)",
                      border: "1px solid #E2E8F0",
                      zIndex: 9999,
                      overflow: "hidden",
                      color: "var(--navy)",
                      textAlign: "left",
                    }}
                  >
                    <div style={{ padding: "12px 16px", background: "#0A1F3D", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: 13 }}>AUDIT NOTIFICATIONS</strong>
                      <span style={{ fontSize: 10, background: "rgba(229,168,46,0.2)", color: "var(--gold)", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                        {staffNotifications.length} Total
                      </span>
                    </div>

                    <div style={{ maxHeight: 340, overflowY: "auto" }}>
                      {staffNotifications.length === 0 ? (
                        <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                          No staff audit notifications yet
                        </div>
                      ) : (
                        staffNotifications.map((n) => (
                          <div key={n._id} style={{ padding: "12px 16px", borderBottom: "1px solid #F1F5F9", background: n.read ? "#fff" : "#EFF6FF" }}>
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#1E40AF", marginBottom: 2 }}>{n.title}</div>
                            <div style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 4 }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>{stats?.pendingVerifications || 0}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>PENDING QUEUE</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>{stats?.verifiedToday || 0}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>VERIFIED TODAY</div>
              </div>
            </div>
          </div>

          {/* TAB MODULE 1: OVERVIEW & BUCKET */}
          {activeNav === "overview" && (
            <div>
              {/* Quick-access cards for the three dedicated review queues -
                  KYC, Certifications, and Job Approvals used to be stacked
                  together on one long "Audit Queue" page; each is now its
                  own tab (see NAV_ITEMS above), and this is the landing
                  page's jumping-off point into them. */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 24 }}>
                {[
                  { id: "kyc", icon: "🔍", title: "KYC Verification", desc: "Company Account & GSTIN/PAN documents", accent: "#0A1F3D", counts: kycCounts, pendingLabel: "pending" },
                  { id: "certifications", icon: "🎓", title: "Certifications", desc: "Candidate AAPC/AHIMA certificate uploads", accent: "#9333EA", counts: certCounts, pendingLabel: "pending" },
                  { id: "jobapprovals", icon: "📋", title: "Job Approvals", desc: "Employer job posts awaiting listing approval", accent: "#2563EB", counts: jobCounts, pendingLabel: "pending" },
                ].map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setActiveNav(q.id)}
                    style={{
                      textAlign: "left",
                      background: "#fff",
                      border: "1px solid #E8EAEE",
                      borderRadius: 18,
                      padding: 20,
                      boxShadow: "0 1px 3px rgba(15,23,42,0.04)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 12,
                      transition: "box-shadow 0.15s, transform 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <span
                        style={{
                          fontSize: 20,
                          width: 40,
                          height: 40,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          borderRadius: 12,
                          background: `${q.accent}14`,
                        }}
                      >
                        {q.icon}
                      </span>
                      {q.counts.pending > 0 ? (
                        <span style={{ background: "#FEF3C7", color: "#92400E", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>
                          {q.counts.pending} PENDING
                        </span>
                      ) : (
                        <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>
                          ALL CLEAR
                        </span>
                      )}
                    </div>
                    <div>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>{q.title}</div>
                      <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 3 }}>{q.desc}</div>
                    </div>
                    <div style={{ fontSize: 11.5, fontWeight: 700, color: q.accent }}>Open queue →</div>
                  </button>
                ))}
              </div>

              {/* Core Pipeline Visualization */}
              <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", marginBottom: 24 }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
                  Core Verification Pipeline Stages
                </h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                  {pipeline && pipeline.map((p, idx) => (
                    <div key={idx} style={{ background: p.isPlaced ? "#F0FDF4" : "#FAFBFC", border: "1px solid #F1F5F9", borderRadius: 8, padding: 12, textAlign: "center" }}>
                      <div style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: p.isPlaced ? "#15803D" : "var(--navy)" }}>{p.count}</div>
                      <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase", marginTop: 4 }}>{p.stage}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Grid: Incoming Academy Bucket & Staff Tasks */}
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 24 }}>
                {/* Incoming Bucket */}
                <div style={{ background: "#FEFCF6", border: "1px solid #F3E4BE", borderRadius: 18, padding: 24, boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                      Incoming Academy Uploads Bucket
                    </h3>
                    <span style={{ background: "#FDECC8", color: "#92400E", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                      ACTION REQUIRED ({incomingBucket ? incomingBucket.length : 0})
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {incomingBucket && incomingBucket.map((item) => (
                      <div key={item.id} style={{ background: "#fff", border: "1px solid #EEE3C6", borderRadius: 12, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <div>
                          <div style={{ fontWeight: 700, color: "var(--navy)", fontSize: 14 }}>{item.studentName}</div>
                          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>{item.academy} • {item.course}</div>
                        </div>

                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 13, color: "var(--navy)", marginRight: 8 }}>{item.score}%</span>
                          <button
                            className="btn-gold"
                            style={{ padding: "6px 12px", fontSize: 11 }}
                            disabled={processingId === item.id}
                            onClick={() => handleVerifyCandidate(item.id, "verify")}
                          >
                            Approve & Verify →
                          </button>
                          <button
                            style={{ padding: "6px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #E5E7EB", color: "#64748B" }}
                            disabled={processingId === item.id}
                            onClick={() => handleVerifyCandidate(item.id, "skip")}
                          >
                            Skip
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Operations Task Queue */}
                <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
                    Operations Task Queue
                  </h3>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {tasks && tasks.map((tsk) => (
                      <div key={tsk.id} style={{ padding: 10, background: "#F8FAFC", borderRadius: 8, borderLeft: `3px solid ${tsk.priority === "P1" ? "#EF4444" : "#F59E0B"}` }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{tsk.time} • {tsk.category}</div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", marginTop: 2 }}>{tsk.title}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB MODULE 2A: KYC VERIFICATION (own tab) */}
          {activeNav === "kyc" && (
            <div>
              <QueuePageHeader
                icon="🔍"
                accent="#0A1F3D"
                title="KYC Verification"
                subtitle="Audit business registration, GSTIN, PAN, and KYC certificates submitted by employer accounts before granting the Gold Trust Badge."
                pills={
                  <>
                    <StatPill count={kycCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={kycCounts.verified} label="VERIFIED" tone="good" />
                    <StatPill count={kycCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              {/* Inbox-style list + detail panel: a narrow list of
                  companies on the left, the selected company's full KYC
                  detail (fields, documents, actions) on the right - swapped
                  in for the old one-full-card-per-company stack per staff
                  feedback that the stacked layout was hard to scan. */}
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", overflow: "hidden" }}>
                {!(companyKycQueue && companyKycQueue.length) ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                    No companies in the verification queue.
                  </div>
                ) : (() => {
                  const selectedComp = companyKycQueue.find((c) => c.id === selectedKycId) || companyKycQueue[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 520 }}>
                      {/* LEFT: company list */}
                      <div style={{ borderRight: "1px solid #EEF0F3", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 800, color: "var(--navy)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Registered Companies
                          </h3>
                          <span style={{ background: "#EEF2F7", color: "#0A1F3D", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                            {companyKycQueue.length}
                          </span>
                        </div>
                        <div style={{ overflowY: "auto", maxHeight: 560 }}>
                          {companyKycQueue.map((comp) => {
                            const isSelected = selectedComp && selectedComp.id === comp.id;
                            return (
                              <button
                                key={comp.id}
                                type="button"
                                onClick={() => setSelectedKycId(comp.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "12px 16px",
                                  border: "none",
                                  borderLeft: isSelected ? "3px solid #0A1F3D" : "3px solid transparent",
                                  borderBottom: "1px solid #F5F6F8",
                                  background: isSelected ? "#F5F7FB" : "transparent",
                                  cursor: "pointer",
                                  display: "block",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {comp.companyName}
                                </div>
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: comp.kycStatus === "verified" ? "#DCFCE7" : comp.kycStatus === "under_review" ? "#FEF3C7" : comp.kycStatus === "rejected" ? "#FEE2E2" : "#E2E8F0",
                                    color: comp.kycStatus === "verified" ? "#15803D" : comp.kycStatus === "under_review" ? "#B45309" : comp.kycStatus === "rejected" ? "#B91C1C" : "#475569",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {comp.kycStatus}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT: detail panel for the selected company */}
                      <div style={{ padding: 24, overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: 18 }}>{selectedComp.companyName}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "3px 8px",
                                borderRadius: 4,
                                background: selectedComp.kycStatus === "verified" ? "#DCFCE7" : selectedComp.kycStatus === "under_review" ? "#FEF3C7" : selectedComp.kycStatus === "rejected" ? "#FEE2E2" : "#E2E8F0",
                                color: selectedComp.kycStatus === "verified" ? "#15803D" : selectedComp.kycStatus === "under_review" ? "#B45309" : selectedComp.kycStatus === "rejected" ? "#B91C1C" : "#475569",
                                textTransform: "uppercase",
                              }}
                            >
                              {selectedComp.kycStatus}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === selectedComp.id}
                              onClick={() => handleVerifyCompany(selectedComp, "verify")}
                            >
                              Approve KYC & Grant Badge →
                            </button>
                            <button
                              style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === selectedComp.id}
                              onClick={() => handleVerifyCompany(selectedComp, "reject")}
                            >
                              Request Revision ✖
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", background: "#F8FAFC", padding: 14, borderRadius: 10, border: "1px solid #EEF0F3" }}>
                          <div><strong>Legal Name:</strong> {selectedComp.legalName}</div>
                          <div><strong>Entity:</strong> {selectedComp.entity}</div>
                          <div><strong>GSTIN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{selectedComp.gstin}</code></div>
                          <div><strong>PAN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{selectedComp.pan}</code></div>
                          <div><strong>POC:</strong> {selectedComp.contactName} ({selectedComp.email})</div>
                          <div><strong>Mobile:</strong> {selectedComp.mobile}</div>
                        </div>

                        {/* Document Verification Row */}
                        <div style={{ marginTop: 16 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 8 }}>DOCUMENT CERTIFICATES AUDIT</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {selectedComp.docs.map((doc) => (
                              <div key={doc.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, display: "flex", alignItems: "center", gap: 8 }}>
                                <span>{doc.label}</span>
                                {doc.uploaded ? (
                                  <span style={{ color: doc.isValid ? "#22C55E" : doc.isValid === false ? "#EF4444" : "#B45309", fontWeight: 700 }}>
                                    {doc.isValid ? "✓ Valid" : doc.isValid === false ? "✖ Invalid" : "⏳ Pending"}
                                  </span>
                                ) : (
                                  <span style={{ color: "#94A3B8" }}>Not Uploaded</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB MODULE 2B: CERTIFICATIONS (own tab) — makes the
              candidate's professional accreditation claim (AAPC/AHIMA etc.)
              mean something: a staff member reviews the actual uploaded
              certificate before it counts as verified, same spirit as the
              KYC Verification tab. */}
          {activeNav === "certifications" && (
            <div>
              <QueuePageHeader
                icon="🎓"
                accent="#9333EA"
                title="Certifications"
                subtitle="Confirm each candidate's uploaded AAPC/AHIMA (or other) certificate is genuine before it shows as verified on their profile."
                pills={
                  <>
                    <StatPill count={certCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={certCounts.verified} label="VERIFIED" tone="good" />
                    <StatPill count={certCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              {/* Inbox-style list + detail panel, matching the KYC
                  Verification tab's layout: a narrow candidate list on the
                  left, the selected candidate's full certification detail
                  on the right. */}
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)", overflow: "hidden" }}>
                {!(certificationQueue && certificationQueue.length) ? (
                  <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                    No certification submissions in the queue.
                  </div>
                ) : (() => {
                  const selectedCert = certificationQueue.find((c) => c.id === selectedCertId) || certificationQueue[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", minHeight: 520 }}>
                      {/* LEFT: candidate list */}
                      <div style={{ borderRight: "1px solid #EEF0F3", display: "flex", flexDirection: "column" }}>
                        <div style={{ padding: "14px 16px", borderBottom: "1px solid #EEF0F3", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 12.5, fontWeight: 800, color: "var(--navy)", margin: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                            Submissions
                          </h3>
                          <span style={{ background: "#F5F0FF", color: "#7C3AED", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                            {certificationQueue.length}
                          </span>
                        </div>
                        <div style={{ overflowY: "auto", maxHeight: 560 }}>
                          {certificationQueue.map((cert) => {
                            const isSelected = selectedCert && selectedCert.id === cert.id;
                            return (
                              <button
                                key={cert.id}
                                type="button"
                                onClick={() => setSelectedCertId(cert.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "12px 16px",
                                  border: "none",
                                  borderLeft: isSelected ? "3px solid #9333EA" : "3px solid transparent",
                                  borderBottom: "1px solid #F5F6F8",
                                  background: isSelected ? "#F5F7FB" : "transparent",
                                  cursor: "pointer",
                                  display: "block",
                                }}
                              >
                                <div style={{ fontWeight: 700, fontSize: 13, color: "var(--navy)", marginBottom: 5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                  {cert.studentName}
                                </div>
                                <span
                                  style={{
                                    fontSize: 9.5,
                                    fontWeight: 800,
                                    padding: "2px 7px",
                                    borderRadius: 4,
                                    background: cert.certStatus === "verified" ? "#DCFCE7" : cert.certStatus === "rejected" ? "#FEE2E2" : "#FEF3C7",
                                    color: cert.certStatus === "verified" ? "#15803D" : cert.certStatus === "rejected" ? "#B91C1C" : "#B45309",
                                    textTransform: "uppercase",
                                  }}
                                >
                                  {cert.certStatus}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT: detail panel for the selected candidate */}
                      <div style={{ padding: 24, overflowY: "auto" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: 18 }}>{selectedCert.studentName}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "3px 8px",
                                borderRadius: 4,
                                background: selectedCert.certStatus === "verified" ? "#DCFCE7" : selectedCert.certStatus === "rejected" ? "#FEE2E2" : "#FEF3C7",
                                color: selectedCert.certStatus === "verified" ? "#15803D" : selectedCert.certStatus === "rejected" ? "#B91C1C" : "#B45309",
                                textTransform: "uppercase",
                              }}
                            >
                              {selectedCert.certStatus}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            {selectedCert.docUrl && (
                              <a
                                href={selectedCert.docUrl}
                                target="_blank"
                                rel="noreferrer"
                                style={{ background: "#fff", color: "var(--navy)", border: "1px solid #CBD5E1", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, textDecoration: "none" }}
                              >
                                View Certificate ↗
                              </a>
                            )}
                            <button
                              style={{ background: "#ECFDF5", color: "#047857", border: "1px solid #A7F3D0", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === selectedCert.id || selectedCert.certStatus === "verified"}
                              onClick={() => handleAuditCertification(selectedCert, "verify")}
                            >
                              {selectedCert.certStatus === "verified" ? "Verified ✓" : "Confirm Genuine →"}
                            </button>
                            <button
                              style={{ background: "#FEF2F2", color: "#B91C1C", border: "1px solid #FECACA", padding: "7px 14px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === selectedCert.id}
                              onClick={() => handleAuditCertification(selectedCert, "reject")}
                            >
                              Reject ✖
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", background: "#F8FAFC", padding: 14, borderRadius: 10, border: "1px solid #EEF0F3" }}>
                          <div><strong>Certification:</strong> {selectedCert.certName || "N/A"}</div>
                          <div><strong>Issuing Body:</strong> {selectedCert.issuingBody || "N/A"}</div>
                          <div><strong>Member ID:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{selectedCert.memberId || "N/A"}</code></div>
                          <div><strong>Issue Date:</strong> {selectedCert.issueDate || "N/A"}</div>
                          <div><strong>Email:</strong> {selectedCert.email}</div>
                          <div><strong>Document:</strong> {selectedCert.docName ? `${selectedCert.docName} ✓` : "Not uploaded"}</div>
                        </div>

                        {selectedCert.certStatus === "rejected" && selectedCert.certRejectionReason && (
                          <div style={{ marginTop: 16, fontSize: 12, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: 10 }}>
                            <strong>Rejection reason:</strong> {selectedCert.certRejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB MODULE 2C: JOB APPROVALS (own tab) — every job a company
              has submitted (onboarding first-JD or an additional Job Posts
              screen posting) waits here until staff approve it; only then
              does it show on the public job board (see routes/public.js
              GET /jobs). */}
          {activeNav === "jobapprovals" && (
            <div>
              <QueuePageHeader
                icon="📋"
                accent="#2563EB"
                title="Job Approvals"
                subtitle="Approve or reject each job post before it appears on the public job board for candidates."
                pills={
                  <>
                    <StatPill count={jobCounts.pending} label="PENDING" tone="pending" />
                    <StatPill count={jobCounts.approved} label="APPROVED" tone="good" />
                    <StatPill count={jobCounts.rejected} label="REJECTED" tone="bad" />
                  </>
                }
              />
              {/* Inbox-style list + detail panel, matching the KYC
                  Verification tab's layout: a narrow job list on the left,
                  the selected job's full detail on the right. */}
              <div style={{ background: "#fff", borderRadius: 18, border: "1px solid #E2E8F0", boxShadow: "0 4px 20px -2px rgba(15, 23, 42, 0.04)", overflow: "hidden" }}>
                {!(jobApprovalQueue && jobApprovalQueue.length) ? (
                  <div style={{ padding: "60px 20px", textAlign: "center", background: "#FAFBFD" }}>
                    <div style={{ fontSize: 36, marginBottom: 10 }}>📋</div>
                    <div style={{ fontSize: 16, fontWeight: 700, color: "#0F172A", marginBottom: 4 }}>No Job Posts in Queue</div>
                    <div style={{ fontSize: 13, color: "#64748B" }}>Employer job listings waiting for staff review will appear here.</div>
                  </div>
                ) : (() => {
                  const selectedJob = jobApprovalQueue.find((j) => j.id === selectedJobId) || jobApprovalQueue[0];
                  return (
                    <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", minHeight: 540 }}>
                      {/* LEFT: job list */}
                      <div style={{ borderRight: "1px solid #EEF0F3", display: "flex", flexDirection: "column", background: "#FAFBFD" }}>
                        <div style={{ padding: "16px 18px", borderBottom: "1px solid #EEF0F3", display: "flex", justifyContent: "space-between", alignItems: "center", background: "#FFFFFF" }}>
                          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 12, fontWeight: 800, color: "#0F172A", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                            Job Posts Queue
                          </h3>
                          <span style={{ background: "#EFF6FF", color: "#2563EB", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                            {jobApprovalQueue.length} {jobApprovalQueue.length === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <div style={{ overflowY: "auto", maxHeight: 580 }}>
                          {jobApprovalQueue.map((job) => {
                            const isSelected = selectedJob && selectedJob.id === job.id;
                            const initial = (job.companyName || "C").charAt(0).toUpperCase();
                            return (
                              <button
                                key={`${job.source}-${job.id}`}
                                type="button"
                                onClick={() => setSelectedJobId(job.id)}
                                style={{
                                  width: "100%",
                                  textAlign: "left",
                                  padding: "14px 18px",
                                  border: "none",
                                  borderLeft: isSelected ? "4px solid #2563EB" : "4px solid transparent",
                                  borderBottom: "1px solid #EEF0F3",
                                  background: isSelected ? "#FFFFFF" : "transparent",
                                  cursor: "pointer",
                                  display: "flex",
                                  alignItems: "flex-start",
                                  gap: 12,
                                  transition: "all 0.15s ease",
                                  boxShadow: isSelected ? "0 2px 8px rgba(37, 99, 235, 0.06)" : "none",
                                }}
                              >
                                <div
                                  style={{
                                    width: 34,
                                    height: 34,
                                    borderRadius: 10,
                                    background: isSelected ? "#2563EB" : "#E2E8F0",
                                    color: isSelected ? "#FFFFFF" : "#475569",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    fontWeight: 800,
                                    fontSize: 13,
                                    flexShrink: 0,
                                  }}
                                >
                                  {initial}
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? "#0F172A" : "#334155", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {job.roleTitle}
                                  </div>
                                  <div style={{ fontSize: 11, color: "#64748B", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                    {job.companyName}
                                  </div>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      padding: "2px 8px",
                                      borderRadius: 999,
                                      background: job.approvalStatus === "approved" ? "#DCFCE7" : job.approvalStatus === "rejected" ? "#FEE2E2" : "#FEF3C7",
                                      color: job.approvalStatus === "approved" ? "#15803D" : job.approvalStatus === "rejected" ? "#B91C1C" : "#B45309",
                                      textTransform: "uppercase",
                                      letterSpacing: "0.04em",
                                    }}
                                  >
                                    ● {job.approvalStatus}
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* RIGHT: detail panel for the selected job */}
                      <div style={{ padding: 28, overflowY: "auto", background: "#FFFFFF" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 16 }}>
                          <div>
                            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                              <h3 style={{ fontWeight: 800, color: "#0F172A", fontSize: 20, margin: 0, fontFamily: "var(--font-display)" }}>{selectedJob.roleTitle}</h3>
                              <span
                                style={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  padding: "3px 10px",
                                  borderRadius: 999,
                                  background: selectedJob.approvalStatus === "approved" ? "#DCFCE7" : selectedJob.approvalStatus === "rejected" ? "#FEE2E2" : "#FEF3C7",
                                  color: selectedJob.approvalStatus === "approved" ? "#15803D" : selectedJob.approvalStatus === "rejected" ? "#B91C1C" : "#B45309",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.04em",
                                }}
                              >
                                ● {selectedJob.approvalStatus}
                              </span>
                              {selectedJob.source === "onboarding" && (
                                <span style={{ fontSize: 10, fontWeight: 700, color: "#2563EB", background: "#EFF6FF", padding: "2px 8px", borderRadius: 6 }}>
                                  From Onboarding
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                              Posted by <strong>{selectedJob.companyName}</strong>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: 10 }}>
                            <button
                              style={{
                                background: selectedJob.approvalStatus === "approved" ? "#F1F5F9" : "#ECFDF5",
                                color: selectedJob.approvalStatus === "approved" ? "#64748B" : "#047857",
                                border: selectedJob.approvalStatus === "approved" ? "1px solid #E2E8F0" : "1px solid #A7F3D0",
                                padding: "8px 16px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: selectedJob.approvalStatus === "approved" ? "default" : "pointer",
                                transition: "all 0.15s ease",
                              }}
                              disabled={processingId === selectedJob.id || selectedJob.approvalStatus === "approved"}
                              onClick={() => handleAuditJob(selectedJob, "verify")}
                            >
                              {selectedJob.approvalStatus === "approved" ? "Approved ✓" : "Approve Job Post →"}
                            </button>
                            <button
                              style={{
                                background: "#FEF2F2",
                                color: "#B91C1C",
                                border: "1px solid #FECACA",
                                padding: "8px 16px",
                                borderRadius: 10,
                                fontSize: 12,
                                fontWeight: 700,
                                cursor: "pointer",
                                transition: "all 0.15s ease",
                              }}
                              disabled={processingId === selectedJob.id}
                              onClick={() => handleAuditJob(selectedJob, "reject")}
                            >
                              Reject ✖
                            </button>
                          </div>
                        </div>

                        {/* Metadata Box */}
                        <div style={{ fontSize: 12, color: "#475569", display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px", background: "#F8FAFC", padding: 18, borderRadius: 14, border: "1px solid #E2E8F0" }}>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>COMPANY</span><strong>{selectedJob.companyName}</strong></div>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>JOB ID</span><code style={{ background: "#E2E8F0", padding: "2px 6px", borderRadius: 4, fontFamily: "var(--font-mono)", fontSize: 11 }}>{selectedJob.jobId}</code></div>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>SPECIALTY</span><strong>{selectedJob.specialty || "N/A"}</strong></div>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>LOCATION</span><strong>📍 {selectedJob.location || "N/A"}</strong></div>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>WORK MODE</span><strong>💼 {selectedJob.workMode || "N/A"}</strong></div>
                          <div><span style={{ color: "#64748B", fontSize: 11, display: "block" }}>OPENINGS</span><strong>👥 {selectedJob.openings ?? "N/A"}</strong></div>
                        </div>

                        {selectedJob.approvalStatus === "rejected" && selectedJob.rejectionReason && (
                          <div style={{ marginTop: 20, fontSize: 12, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 10, padding: 14 }}>
                            <strong style={{ display: "block", marginBottom: 2 }}>Rejection Reason:</strong>
                            {selectedJob.rejectionReason}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}

          {/* TAB MODULE: INTERVIEW QUESTIONS (Stage 5 AI Video / AI Audio interview bank) */}
          {activeNav === "questions" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                    🎤 Stage 5 Interview Questions &amp; Answer Key
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B", maxWidth: 640 }}>
                    These are the exact questions the AI asks candidates in the Live AI Video Assessment and AI Audio Interview.
                    This stage scores spoken COMMUNICATION quality (clarity, fluency, vocabulary/grammar, confidence &amp; delivery) -
                    not answer correctness - so keep questions conversational (e.g. "tell me about yourself", your training, your background)
                    rather than technical recall. There's no answer key to grade against.
                  </p>
                </div>
                <button type="button" className="btn-gold" style={{ padding: "8px 16px", fontSize: 12, flexShrink: 0 }} onClick={openCreateQuestionModal}>
                  + Add Question
                </button>
              </div>

              {/* Mode filter */}
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {[
                  { id: "all", label: "All" },
                  { id: "video", label: "Video only" },
                  { id: "audio", label: "Audio only" },
                  { id: "both", label: "Both" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setQuestionModeFilter(f.id)}
                    style={{
                      padding: "6px 12px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      cursor: "pointer",
                      border: questionModeFilter === f.id ? "1px solid var(--navy)" : "1px solid #E2E8F0",
                      background: questionModeFilter === f.id ? "var(--navy)" : "#fff",
                      color: questionModeFilter === f.id ? "#fff" : "#64748B",
                    }}
                  >
                    {f.label}
                  </button>
                ))}
              </div>

              {questionsLoading ? (
                <div style={{ padding: 30, textAlign: "center", color: "#64748B" }}>Loading interview questions…</div>
              ) : interviewQuestions.filter((q) => questionModeFilter === "all" || q.mode === questionModeFilter).length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", background: "#F8FAFC", borderRadius: 12, border: "1px dashed #CBD5E1", color: "#64748B" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎤</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>No Interview Questions Configured Yet</div>
                  <div style={{ fontSize: 13, marginBottom: 16 }}>
                    Until you add questions here, candidates are asked a small built-in default set of conversational questions.
                  </div>
                  <button type="button" className="btn-gold" style={{ padding: "8px 16px", fontSize: 12 }} onClick={openCreateQuestionModal}>
                    + Add Your First Question
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {interviewQuestions
                    .filter((q) => questionModeFilter === "all" || q.mode === questionModeFilter)
                    .map((q) => (
                      <div key={q._id} style={{ background: q.active ? "#F8FAFC" : "#FAFAFA", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, opacity: q.active ? 1 : 0.6 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                              <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "#E0E7FF", color: "#3730A3", textTransform: "uppercase" }}>
                                {q.mode}
                              </span>
                              <span style={{ fontSize: 10, color: "#94A3B8" }}>Order {q.order}</span>
                              {!q.active && (
                                <span style={{ fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 4, background: "#FEE2E2", color: "#B91C1C" }}>DISABLED</span>
                              )}
                            </div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: "var(--navy)", marginBottom: 4 }}>{q.text}</div>
                            {q.correctAnswer && (
                              <div style={{ fontSize: 12, color: "#64748B" }}>
                                <strong>Staff notes (not used for grading):</strong> {q.correctAnswer}
                              </div>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                            <button
                              type="button"
                              style={{ padding: "6px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#64748B", cursor: "pointer" }}
                              disabled={processingId === q._id}
                              onClick={() => handleToggleQuestionActive(q)}
                            >
                              {q.active ? "Disable" : "Enable"}
                            </button>
                            <button
                              type="button"
                              style={{ padding: "6px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "var(--navy)", cursor: "pointer" }}
                              onClick={() => openEditQuestionModal(q)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              style={{ padding: "6px 10px", fontSize: 11, borderRadius: 6, border: "1px solid #FCA5A5", background: "#fff", color: "#DC2626", cursor: "pointer" }}
                              disabled={processingId === q._id}
                              onClick={() => handleDeleteQuestion(q)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          )}

          {/* TAB MODULE 4: REPORTS & METRICS */}
          {activeNav === "reports" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
                <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: "0 0 6px 0" }}>
                  📊 System Performance & Operations Metrics
                </h3>
                <p style={{ fontSize: 13, color: "#64748B", marginBottom: 24 }}>
                  Comprehensive audit statistics across candidate verifications, employer KYC approvals, and placement conversion rates.
                </p>

                {/* Key Reports Metric Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 28 }}>
                  <div style={{ background: "#F8FAFC", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>TOTAL CANDIDATES</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--navy)" }}>{reportsData?.totalCandidates || 0}</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>FULLY VERIFIED TALENT</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#22C55E" }}>{reportsData?.verifiedCandidates || 0}</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>VERIFIED EMPLOYERS</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--gold)" }}>{reportsData?.verifiedCompanies || 0}</div>
                  </div>
                  <div style={{ background: "#F8FAFC", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 4 }}>VERIFIED PLACEMENT RATE</div>
                    <div style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "#15803D" }}>{reportsData?.placementRate || "86%"}</div>
                  </div>
                </div>

                {/* Candidate Verification Funnel - real per-stage counts from
                    `pipeline` (see backend/routes/staff.js), not the sample
                    monthlyVerifications numbers below. Plain CSS bars so
                    this doesn't need a charting dependency. */}
                {pipeline && pipeline.length > 0 && (
                  <div style={{ marginBottom: 28 }}>
                    <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                      📈 Candidate Verification Funnel
                    </h4>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 }}>
                      {(() => {
                        const maxCount = Math.max(1, ...pipeline.map((p) => p.count || 0));
                        return pipeline.map((p) => (
                          <div key={p.stage} style={{ display: "grid", gridTemplateColumns: "150px 1fr 44px", alignItems: "center", gap: 12 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)" }}>{p.stage}</div>
                            <div style={{ background: "#E2E8F0", borderRadius: 6, height: 14, overflow: "hidden" }}>
                              <div
                                style={{
                                  width: `${Math.max(2, ((p.count || 0) / maxCount) * 100)}%`,
                                  height: "100%",
                                  borderRadius: 6,
                                  background: p.isPlaced ? "linear-gradient(90deg, #15803D, #22C55E)" : "linear-gradient(90deg, var(--gold), var(--gold-light))",
                                  transition: "width 0.3s ease",
                                }}
                              />
                            </div>
                            <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 800, color: "var(--navy)", textAlign: "right" }}>{p.count || 0}</div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}

                {/* Staff Auditor Leaderboard */}
                <div>
                  <h4 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 12 }}>
                    🏆 Top Auditor Performance Leaderboard
                  </h4>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {leaderboard && leaderboard.map((ldr) => (
                      <div key={ldr.rank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: 14, background: "#F8FAFC", borderRadius: 8, border: "1px solid #E2E8F0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                          <span style={{ fontWeight: 800, fontSize: 14, color: "var(--gold)", width: 24 }}>#{ldr.rank}</span>
                          <div>
                            <div style={{ fontWeight: 700, color: "var(--navy)" }}>{ldr.name}</div>
                            <div style={{ fontSize: 11, color: "#64748B" }}>{ldr.dept}</div>
                          </div>
                        </div>
                        <div style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "#22C55E" }}>{ldr.score} Pts</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeNav === "activity" && (
            <div style={{ background: "#fff", borderRadius: 18, padding: 24, border: "1px solid #E8EAEE", boxShadow: "0 1px 3px rgba(15,23,42,0.04)" }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: "0 0 6px 0" }}>
                🗒️ Staff Activity Log
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
                Every consequential staff action - candidate/company verification, document sign-off, interview
                question bank edits, plan assignment - recorded with who did it and when.
              </p>

              {activityLoading ? (
                <div style={{ padding: 24, textAlign: "center", color: "#64748B", fontSize: 13 }}>Loading activity…</div>
              ) : activityEntries.length === 0 ? (
                <div style={{ padding: 24, textAlign: "center", color: "#64748B", fontSize: 13 }}>No staff actions recorded yet.</div>
              ) : (
                <>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5 }}>
                      <thead>
                        <tr style={{ textAlign: "left", borderBottom: "2px solid #E2E8F0" }}>
                          <th style={{ padding: "8px 10px", color: "#64748B", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>When</th>
                          <th style={{ padding: "8px 10px", color: "#64748B", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Staff</th>
                          <th style={{ padding: "8px 10px", color: "#64748B", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Action</th>
                          <th style={{ padding: "8px 10px", color: "#64748B", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Target</th>
                          <th style={{ padding: "8px 10px", color: "#64748B", fontSize: 10.5, letterSpacing: "0.06em", textTransform: "uppercase" }}>Summary</th>
                        </tr>
                      </thead>
                      <tbody>
                        {activityEntries.map((entry) => (
                          <tr key={entry._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                            <td style={{ padding: "10px", color: "#64748B", whiteSpace: "nowrap" }}>
                              {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : "—"}
                            </td>
                            <td style={{ padding: "10px", fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap" }}>
                              {entry.staffName || "Staff"}
                            </td>
                            <td style={{ padding: "10px" }}>
                              <span style={{ background: "rgba(229,168,46,0.12)", color: "var(--gold)", padding: "3px 8px", borderRadius: 6, fontWeight: 700, fontSize: 11 }}>
                                {entry.action}
                              </span>
                            </td>
                            <td style={{ padding: "10px", color: "#334155" }}>
                              {entry.targetType && entry.targetType !== "other" ? `${entry.targetType}${entry.targetId ? ` #${String(entry.targetId).slice(-6)}` : ""}` : "—"}
                            </td>
                            <td style={{ padding: "10px", color: "#334155" }}>{entry.summary || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 18 }}>
                    <button
                      type="button"
                      disabled={activityPage <= 1 || activityLoading}
                      onClick={() => fetchActivityLog(activityPage - 1)}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", cursor: activityPage <= 1 ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, color: "#334155", opacity: activityPage <= 1 ? 0.5 : 1 }}
                    >
                      ← Newer
                    </button>
                    <span style={{ fontSize: 12, color: "#64748B" }}>
                      Page {activityPage} of {activityTotalPages}
                    </span>
                    <button
                      type="button"
                      disabled={activityPage >= activityTotalPages || activityLoading}
                      onClick={() => fetchActivityLog(activityPage + 1)}
                      style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", cursor: activityPage >= activityTotalPages ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 700, color: "#334155", opacity: activityPage >= activityTotalPages ? 0.5 : 1 }}
                    >
                      Older →
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </main>
      </div>

      {/* AUDIT APPROVAL MODAL */}
      {auditModal && (
        <div className="modal-overlay" onClick={() => setAuditModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {auditModal.action === "verify" ? "Approve Company KYC Verification" : "Request KYC Document Revision"}
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
                Company: <strong style={{ color: "var(--navy)" }}>{auditModal.company.companyName}</strong>
              </p>

              {auditModal.action === "verify" ? (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>AUDIT NOTES</label>
                  <textarea
                    rows={3}
                    value={auditModal.notes}
                    onChange={(e) => setAuditModal({ ...auditModal, notes: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>REVISION REASON & INSTRUCTIONS</label>
                  <textarea
                    rows={3}
                    value={auditModal.reason}
                    onChange={(e) => setAuditModal({ ...auditModal, reason: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5E7EB" }} onClick={() => setAuditModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={processingId === auditModal.company.id}
                  onClick={submitAuditModal}
                >
                  {processingId === auditModal.company.id ? "Processing..." : "Confirm Action →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFICATION AUDIT MODAL */}
      {certAuditModal && (
        <div className="modal-overlay" onClick={() => setCertAuditModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {certAuditModal.action === "verify" ? "Confirm Certificate Is Genuine" : "Reject Certification Claim"}
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
                Candidate: <strong style={{ color: "var(--navy)" }}>{certAuditModal.cert.studentName}</strong>
                {" · "}{certAuditModal.cert.certName || "Certification"} ({certAuditModal.cert.memberId || "no ID on file"})
              </p>

              {certAuditModal.action === "verify" ? (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>AUDIT NOTES</label>
                  <textarea
                    rows={3}
                    value={certAuditModal.notes}
                    onChange={(e) => setCertAuditModal({ ...certAuditModal, notes: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>REJECTION REASON</label>
                  <textarea
                    rows={3}
                    value={certAuditModal.reason}
                    onChange={(e) => setCertAuditModal({ ...certAuditModal, reason: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5E7EB" }} onClick={() => setCertAuditModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={processingId === certAuditModal.cert.id}
                  onClick={submitCertAuditModal}
                >
                  {processingId === certAuditModal.cert.id ? "Processing..." : "Confirm Action →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* JOB POST APPROVAL MODAL */}
      {jobAuditModal && (
        <div className="modal-overlay" onClick={() => setJobAuditModal(null)}>
          <div className="modal-content" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {jobAuditModal.action === "verify" ? "Approve Job Post" : "Reject Job Post"}
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
                {jobAuditModal.job.companyName}
                {" · "}{jobAuditModal.job.roleTitle} ({jobAuditModal.job.jobId})
              </p>

              {jobAuditModal.action === "reject" && (
                <div style={{ marginBottom: 18 }}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>REJECTION REASON</label>
                  <textarea
                    rows={3}
                    value={jobAuditModal.reason}
                    onChange={(e) => setJobAuditModal({ ...jobAuditModal, reason: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1" }}
                  />
                </div>
              )}

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5E7EB" }} onClick={() => setJobAuditModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={processingId === jobAuditModal.job.id}
                  onClick={submitJobAuditModal}
                >
                  {processingId === jobAuditModal.job.id ? "Processing..." : "Confirm Action →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* INTERVIEW QUESTION CREATE/EDIT MODAL */}
      {questionModal && (
        <div className="modal-overlay" onClick={() => setQuestionModal(null)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {questionModal.id ? "Edit Interview Question" : "Add Interview Question"}
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
                This stage grades spoken COMMUNICATION (clarity, fluency, vocabulary/grammar, confidence &amp; delivery) - not
                whether the answer is "correct". Prefer conversational/biographical questions candidates can just talk about.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>QUESTION (spoken to the candidate)</label>
                <textarea
                  rows={2}
                  value={questionModal.text}
                  onChange={(e) => setQuestionModal({ ...questionModal, text: e.target.value })}
                  placeholder='e.g. "Tell me about yourself and your background."'
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>STAFF NOTES (optional - not used for grading, never shown to candidate)</label>
                <textarea
                  rows={3}
                  value={questionModal.correctAnswer}
                  onChange={(e) => setQuestionModal({ ...questionModal, correctAnswer: e.target.value })}
                  placeholder="Optional context for other staff, e.g. what a strong answer tends to cover. This is not graded."
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>ASK IN</label>
                  <select
                    value={questionModal.mode}
                    onChange={(e) => setQuestionModal({ ...questionModal, mode: e.target.value })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  >
                    <option value="both">Both video &amp; audio</option>
                    <option value="video">Video assessment only</option>
                    <option value="audio">Audio interview only</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>ORDER (lower asked first)</label>
                  <input
                    type="number"
                    value={questionModal.order}
                    onChange={(e) => setQuestionModal({ ...questionModal, order: Number(e.target.value) })}
                    style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                  />
                </div>
              </div>

              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, marginBottom: 20, cursor: "pointer" }}>
                <input type="checkbox" checked={questionModal.active} onChange={(e) => setQuestionModal({ ...questionModal, active: e.target.checked })} />
                Active (asked to candidates)
              </label>

              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" style={{ flex: 1, padding: 10, borderRadius: 8, border: "1px solid #E5E7EB" }} onClick={() => setQuestionModal(null)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn-gold"
                  style={{ flex: 1, justifyContent: "center" }}
                  disabled={processingId === (questionModal.id || "new-question")}
                  onClick={submitQuestionModal}
                >
                  {processingId === (questionModal.id || "new-question") ? "Saving..." : questionModal.id ? "Save Changes →" : "Add Question →"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
