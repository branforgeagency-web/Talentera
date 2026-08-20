import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function StaffHub() {
  const navigate = useNavigate();
  const [activeNav, setActiveNav] = useState("overview"); // "overview" | "audit" | "video" | "questions" | "reports"
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [previewVideo, setPreviewVideo] = useState(null);

  const [auditModal, setAuditModal] = useState(null);
  const [staffNotifications, setStaffNotifications] = useState([]);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [showStaffNotif, setShowStaffNotif] = useState(false);

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

  const fetchInterviewQuestions = async () => {
    setQuestionsLoading(true);
    try {
      const res = await fetch("/api/staff/interview-questions", { headers: { ...getAuthHeader() } });
      if (res.status === 401) {
        navigate("/staff/login");
        return;
      }
      const data = await res.json();
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
    if (!text.trim() || !correctAnswer.trim()) {
      alert("Both the question text and the correct answer are required.");
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
        const data = await res.json().catch(() => ({}));
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
        const data = await res.json();
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
      const data = await res.json();
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
      const data = await res.json();
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
      const data = await res.json();
      fetchDashboard();
      setAuditModal(null);
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
      const data = await res.json();
      fetchDashboard();
      if (previewDoc && previewDoc.docId === docId) {
        setPreviewDoc((prev) => prev ? { ...prev, isValid } : null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) return <div style={{ padding: 40, textAlign: "center", fontFamily: "sans-serif" }}>Loading Staff Operations Hub...</div>;

  const { stats, pipeline, incomingBucket, companyKycQueue, videoIntrosQueue, reportsData, tasks, leaderboard, liveQueueCount } = dashData || {};

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
            {[
              { id: "overview", label: "Overview & Bucket", icon: "⚡" },
              { id: "audit", label: "Audit Queue", icon: "🔍" },
              { id: "video", label: "Video Introductions", icon: "📹" },
              { id: "questions", label: "Interview Questions", icon: "🎤" },
              { id: "reports", label: "Reports & Metrics", icon: "📊" },
            ].map((nav) => (
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
                <span>{nav.label}</span>
              </button>
            ))}
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
                Active Module: <strong style={{ color: "var(--gold)" }}>{activeNav.toUpperCase()}</strong> • 24 Verifications Approved Today
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
              {/* Core Pipeline Visualization */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid var(--border-light)", borderTop: "3px solid var(--gold)", marginBottom: 24 }}>
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
                <div style={{ background: "linear-gradient(135deg, #FFF8E7 0%, #FFFCF5 100%)", border: "2px solid var(--gold)", borderRadius: 14, padding: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                      Incoming Academy Uploads Bucket
                    </h3>
                    <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 999 }}>
                      ACTION REQUIRED ({incomingBucket ? incomingBucket.length : 0})
                    </span>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {incomingBucket && incomingBucket.map((item) => (
                      <div key={item.id} style={{ background: "#fff", border: "1px solid rgba(229,168,46,0.3)", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
                <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid var(--border-light)" }}>
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

          {/* TAB MODULE 2: AUDIT QUEUE */}
          {activeNav === "audit" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Dedicated Company Account & KYC Verification Queue */}
              <div style={{ background: "#fff", borderRadius: 14, padding: 22, border: "1px solid var(--border-light)", borderTop: "3px solid #0A1F3D" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                      🔍 Company Account & KYC Document Audit Queue
                    </h3>
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
                      Audit business registration, GSTIN, PAN, and KYC certificates submitted by employer accounts.
                    </p>
                  </div>
                  <span style={{ background: "#0A1F3D", color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                    {(companyKycQueue || []).length} REGISTERED COMPANIES
                  </span>
                </div>

                {!(companyKycQueue && companyKycQueue.length) ? (
                  <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                    No companies in the verification queue.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    {companyKycQueue.map((comp) => (
                      <div
                        key={comp.id}
                        style={{
                          background: comp.kycStatus === "verified" ? "#F0FDF4" : comp.kycStatus === "rejected" ? "#FEF2F2" : "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          padding: 16,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: 16 }}>{comp.companyName}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 800,
                                padding: "3px 8px",
                                borderRadius: 4,
                                background: comp.kycStatus === "verified" ? "#DCFCE7" : comp.kycStatus === "under_review" ? "#FEF3C7" : comp.kycStatus === "rejected" ? "#FEE2E2" : "#E2E8F0",
                                color: comp.kycStatus === "verified" ? "#15803D" : comp.kycStatus === "under_review" ? "#B45309" : comp.kycStatus === "rejected" ? "#B91C1C" : "#475569",
                                textTransform: "uppercase",
                              }}
                            >
                              {comp.kycStatus}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              style={{ background: "#22C55E", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === comp.id}
                              onClick={() => handleVerifyCompany(comp, "verify")}
                            >
                              Approve KYC & Grant Badge →
                            </button>
                            <button
                              style={{ background: "#EF4444", color: "#fff", border: "none", padding: "6px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                              disabled={processingId === comp.id}
                              onClick={() => handleVerifyCompany(comp, "reject")}
                            >
                              Request Revision ✖
                            </button>
                          </div>
                        </div>

                        <div style={{ fontSize: 12, color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "6px 16px", background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
                          <div><strong>Legal Name:</strong> {comp.legalName}</div>
                          <div><strong>Entity:</strong> {comp.entity}</div>
                          <div><strong>GSTIN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{comp.gstin}</code></div>
                          <div><strong>PAN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{comp.pan}</code></div>
                          <div><strong>POC:</strong> {comp.contactName} ({comp.email})</div>
                          <div><strong>Mobile:</strong> {comp.mobile}</div>
                        </div>

                        {/* Document Verification Row */}
                        <div style={{ marginTop: 12 }}>
                          <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 6 }}>DOCUMENT CERTIFICATES AUDIT</div>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {comp.docs.map((doc) => (
                              <div key={doc.id} style={{ background: "#fff", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 8 }}>
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB MODULE 3: VIDEO INTRODUCTIONS */}
          {activeNav === "video" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid var(--border-light)", borderTop: "3px solid #A855F7" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                    📹 Candidate Video Introduction Review Console
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B" }}>
                    Audit Stage 5 video self-introductions for communication clarity, audio quality, and candidate authenticity.
                  </p>
                </div>
                <span style={{ background: "#A855F7", color: "#fff", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999 }}>
                  {(videoIntrosQueue || []).length} VIDEO INTROS IN QUEUE
                </span>
              </div>

              {!(videoIntrosQueue && videoIntrosQueue.length) ? (
                <div style={{ padding: 40, textAlign: "center", background: "#F8FAFC", borderRadius: 12, border: "1px dashed #CBD5E1", color: "#64748B" }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>📹</div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: "var(--navy)", marginBottom: 4 }}>No Video Introductions Submitted Yet</div>
                  <div style={{ fontSize: 13 }}>Candidates who submit their Stage 5 video introduction recording during verification will appear here for staff audit.</div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                  {videoIntrosQueue.map((vid) => (
                    <div key={vid.id} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                      <div>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                          <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "var(--navy)" }}>{vid.studentName}</div>
                            <div style={{ fontSize: 12, color: "#64748B" }}>{vid.role}</div>
                          </div>
                          <span style={{
                            padding: "2px 8px", borderRadius: 4, fontSize: 10, fontWeight: 800,
                            background: vid.verified ? "#DCFCE7" : "#FEF3C7",
                            color: vid.verified ? "#15803D" : "#B45309"
                          }}>
                            {vid.status}
                          </span>
                        </div>

                        {/* Video Player Box */}
                        <div style={{ borderRadius: 8, overflow: "hidden", background: "#06152A", marginBottom: 12 }}>
                          {vid.videoUrl && (vid.videoUrl.endsWith(".mp4") || vid.videoUrl.endsWith(".webm") || vid.videoUrl.startsWith("blob:") || vid.videoUrl.startsWith("http") || vid.videoUrl.startsWith("/uploads")) ? (
                            <video controls src={vid.videoUrl} style={{ width: "100%", maxHeight: 180, borderRadius: 8 }} />
                          ) : (
                            <div style={{ height: 140, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#fff" }}>
                              <div style={{ fontSize: 28, marginBottom: 4 }}>📹</div>
                              <div style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>Recorded Video File Attached</div>
                            </div>
                          )}
                        </div>

                        <div style={{ fontSize: 11, color: "#475569", display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
                          <span>Communication Score: <strong style={{ color: "var(--navy)" }}>{vid.score}%</strong></span>
                          <span>Duration: <strong>{vid.duration}</strong></span>
                        </div>
                      </div>

                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          className="btn-gold"
                          style={{ flex: 1, padding: 8, fontSize: 11, justifyContent: "center" }}
                          disabled={vid.verified}
                          onClick={() => handleVerifyCandidate(vid.id, "verify")}
                        >
                          {vid.verified ? "Approved ✓" : "Approve Video →"}
                        </button>
                        <button
                          style={{ padding: 8, fontSize: 11, borderRadius: 6, border: "1px solid #CBD5E1", background: "#fff", color: "#64748B", cursor: "pointer" }}
                          onClick={() => alert("Re-recording request sent to candidate email.")}
                        >
                          Flag Re-record
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB MODULE: INTERVIEW QUESTIONS (Stage 5 AI Video / AI Audio interview bank) */}
          {activeNav === "questions" && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid var(--border-light)", borderTop: "3px solid #F59E0B" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                    🎤 Stage 5 Interview Questions &amp; Answer Key
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#64748B", maxWidth: 640 }}>
                    These are the exact questions the AI asks candidates in the Live AI Video Assessment and AI Audio Interview.
                    The correct answer is used server-side to grade each spoken response - candidates never see it.
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
                    Until you add questions here, candidates are asked a small built-in default set with no answer key (graded generically).
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
                            <div style={{ fontSize: 12, color: "#64748B" }}>
                              <strong>Correct answer:</strong> {q.correctAnswer}
                            </div>
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
              <div style={{ background: "#fff", borderRadius: 14, padding: 24, border: "1px solid var(--border-light)", borderTop: "3px solid #22C55E" }}>
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

      {/* INTERVIEW QUESTION CREATE/EDIT MODAL */}
      {questionModal && (
        <div className="modal-overlay" onClick={() => setQuestionModal(null)}>
          <div className="modal-content" style={{ maxWidth: 560 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 28 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginBottom: 6 }}>
                {questionModal.id ? "Edit Interview Question" : "Add Interview Question"}
              </h3>
              <p style={{ fontSize: 13, color: "#64748B", marginBottom: 18 }}>
                The correct answer is only used to grade the candidate's spoken response - it's never shown to them.
              </p>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>QUESTION (spoken to the candidate)</label>
                <textarea
                  rows={2}
                  value={questionModal.text}
                  onChange={(e) => setQuestionModal({ ...questionModal, text: e.target.value })}
                  style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 6 }}>CORRECT ANSWER (used to grade - never shown to candidate)</label>
                <textarea
                  rows={3}
                  value={questionModal.correctAnswer}
                  onChange={(e) => setQuestionModal({ ...questionModal, correctAnswer: e.target.value })}
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
