import React, { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function StaffHub() {
  const navigate = useNavigate();
  const [dashData, setDashData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);

  const [auditModal, setAuditModal] = useState(null);
  const [staffNotifications, setStaffNotifications] = useState([]);
  const [staffUnreadCount, setStaffUnreadCount] = useState(0);
  const [showStaffNotif, setShowStaffNotif] = useState(false);

  useEffect(() => {
    fetchDashboard();
    fetchStaffNotifications();
  }, []);

  const fetchStaffNotifications = async () => {
    try {
      const res = await fetch("/api/staff/notifications");
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
      await fetch("/api/staff/notifications/mark-read", { method: "POST" });
      setStaffUnreadCount(0);
      setStaffNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDashboard = async () => {
    try {
      const res = await fetch("/api/staff/dashboard");
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
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

  if (loading) return <div style={{ padding: 40, textAlign: "center" }}>Loading Staff Operations Hub...</div>;

  const { stats, pipeline, incomingBucket, tasks, leaderboard, liveQueueCount } = dashData || {};

  return (
    <div style={{ minHeight: "100vh", background: "#F4F6FA" }}>
      {/* Shell */}
      <div style={{ display: "grid", gridTemplateColumns: "260px 1fr", minHeight: "100vh" }}>
        {/* Dark Navy Sidebar */}
        <aside style={{ background: "linear-gradient(180deg, #06152A 0%, #0A1F3D 100%)", color: "#fff", padding: 20, borderRight: "1px solid rgba(229,168,46,0.15)" }}>
          <div style={{ display: "flex", alignItems: "center", paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,0.08)", marginBottom: 18 }}>
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
            <strong style={{ color: "var(--gold)", fontFamily: "var(--font-mono)" }}>{liveQueueCount}</strong>
          </div>

          <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(229,168,46,0.7)", letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase" }}>
            NAVIGATION
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ padding: "10px 12px", borderRadius: 8, background: "rgba(229,168,46,0.15)", color: "#fff", fontWeight: 700, fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-bolt" style={{ color: "var(--gold)" }}></i> Overview & Bucket
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-magnifying-glass"></i> Audit Queue
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-video"></i> Video Introductions
            </div>
            <div style={{ padding: "10px 12px", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 13, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-chart-column"></i> Reports & Metrics
            </div>
          </div>

          <button style={{ marginTop: 40, width: "100%", padding: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: 600, cursor: "pointer" }} onClick={() => navigate("/staff/login")}>
            Logout Staff Session
          </button>
        </aside>

        {/* Main Hub Area */}
        <main style={{ padding: 28 }}>
          {/* Welcome Banner */}
          <div style={{ background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 50%, #1A3358 100%)", color: "#fff", borderRadius: 16, padding: 24, marginBottom: 24, border: "1px solid rgba(229,168,46,0.2)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "inline-block", background: "rgba(229,168,46,0.15)", color: "var(--gold)", padding: "4px 10px", borderRadius: 4, fontSize: 10, fontWeight: 800, letterSpacing: "0.1em", marginBottom: 8, textTransform: "uppercase" }}>
                STAFF VERIFICATION CONSOLE
              </div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, margin: 0 }}>
                Welcome back, Vikram Malhotra
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4 }}>
                Lead Verification Officer • 24 Verifications Approved Today
              </p>
            </div>

            <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              {/* STAFF IN-APP NOTIFICATION BELL & DROPDOWN */}
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

                {/* STAFF NOTIFICATION DROPDOWN */}
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
                    <div
                      style={{
                        padding: "12px 16px",
                        background: "#0A1F3D",
                        color: "#fff",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <strong style={{ fontSize: 13 }}>AUDIT &amp; SYSTEM NOTIFICATIONS</strong>
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
                          <div
                            key={n._id}
                            style={{
                              padding: "12px 16px",
                              borderBottom: "1px solid #F1F5F9",
                              background: n.read ? "#fff" : "#EFF6FF",
                            }}
                          >
                            <div style={{ fontSize: 12, fontWeight: 800, color: "#1E40AF", marginBottom: 2 }}>
                              {n.title}
                            </div>
                            <div style={{ fontSize: 11.5, color: "#334155", lineHeight: 1.4 }}>{n.message}</div>
                            <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 4 }}>
                              {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                              {new Date(n.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "var(--gold)" }}>{stats.pendingVerifications}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>PENDING QUEUE</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.06)", padding: "10px 16px", borderRadius: 10, textAlign: "center", border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color: "#22C55E" }}>{stats.verifiedToday}</div>
                <div style={{ fontSize: 9, color: "rgba(255,255,255,0.6)", fontWeight: 700 }}>VERIFIED TODAY</div>
              </div>
            </div>
          </div>

          {/* Core Pipeline Visualization */}
          <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid var(--border-light)", borderTop: "3px solid var(--gold)", marginBottom: 24 }}>
            <h3 style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, marginBottom: 16 }}>
              Core Verification Pipeline Stages
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
              {pipeline.map((p, idx) => (
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
                  ACTION REQUIRED ({incomingBucket.length})
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {incomingBucket.map((item) => (
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

            {/* Company Account & KYC Verification Audit Queue */}
            <div style={{ gridColumn: "1 / -1", background: "#fff", borderRadius: 14, padding: 22, border: "1px solid var(--border-light)", borderTop: "3px solid #0A1F3D", marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
                    🏢 Company Account &amp; KYC Verification Queue
                  </h3>
                  <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748B" }}>
                    Audit business registration, GSTIN, PAN, and KYC certificates submitted by employer accounts.
                  </p>
                </div>
                <span style={{ background: "#0A1F3D", color: "#fff", fontSize: 10, fontWeight: 800, padding: "4px 10px", borderRadius: 999 }}>
                  {(dashData?.companyKycQueue || []).length} REGISTERED COMPANIES
                </span>
              </div>

              {!(dashData?.companyKycQueue && dashData.companyKycQueue.length) ? (
                <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                  No companies in the verification queue.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {dashData.companyKycQueue.map((comp) => (
                    <div
                      key={comp.id}
                      style={{
                        background: comp.kycStatus === "verified" ? "#F0FDF4" : comp.kycStatus === "rejected" ? "#FEF2F2" : "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        padding: 16,
                        display: "flex",
                        justify: "space-between",
                        alignItems: "center",
                        gap: 16,
                        flexWrap: "wrap",
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 260 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <span style={{ fontWeight: 800, color: "var(--navy)", fontSize: 15 }}>{comp.companyName}</span>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 800,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: comp.kycStatus === "verified" ? "#DCFCE7" : comp.kycStatus === "under_review" ? "#FEF3C7" : comp.kycStatus === "rejected" ? "#FEE2E2" : "#E2E8F0",
                              color: comp.kycStatus === "verified" ? "#15803D" : comp.kycStatus === "under_review" ? "#B45309" : comp.kycStatus === "rejected" ? "#B91C1C" : "#475569",
                              textTransform: "uppercase",
                            }}
                          >
                            {comp.kycStatus}
                          </span>
                        </div>
                        <div style={{ fontSize: 12, color: "#475569", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "4px 16px" }}>
                          <div><strong>Legal Name:</strong> {comp.legalName}</div>
                          <div><strong>Entity:</strong> {comp.entity}</div>
                          <div><strong>GSTIN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{comp.gstin}</code></div>
                          <div><strong>PAN:</strong> <code style={{ background: "#E2E8F0", padding: "1px 4px", borderRadius: 3 }}>{comp.pan}</code></div>
                          <div><strong>POC:</strong> {comp.contactName} ({comp.email})</div>
                          <div><strong>Signatory:</strong> {typeof comp.signatory === "object" ? comp.signatory.name || "N/A" : comp.signatory}</div>
                        </div>

                        {comp.kycRejectionReason && (
                          <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 6, fontWeight: 600 }}>
                            ⚠️ Audit Note: {comp.kycRejectionReason}
                          </div>
                        )}

                        {/* UPLOADED KYC DOCUMENTS & PROOFS INSPECTION SECTION */}
                        <div style={{ marginTop: 14, paddingTop: 12, borderTop: "1px dashed #CBD5E1" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--navy)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
                              📑 UPLOADED VERIFICATION DOCUMENTS &amp; PROOFS
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 700, color: comp.docs?.some(d => d.uploaded) ? "#16A34A" : "#DC2626" }}>
                              {comp.docs ? comp.docs.filter((d) => d.uploaded).length : 0} of {comp.docs ? comp.docs.length : 0} Uploaded
                            </span>
                          </div>

                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 10 }}>
                            {(comp.docs || []).map((doc) => (
                              <div
                                key={doc.id}
                                style={{
                                  background: doc.uploaded ? "#ffffff" : "#F8FAFC",
                                  border: doc.uploaded ? "1.5px solid #22C55E" : "1px dashed #CBD5E1",
                                  borderRadius: 8,
                                  padding: 8,
                                  display: "flex",
                                  flexDirection: "column",
                                  justifyContent: "space-between",
                                }}
                              >
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }} title={doc.label}>
                                    {doc.label}
                                  </span>
                                  <span
                                    style={{
                                      fontSize: 9,
                                      fontWeight: 800,
                                      padding: "1px 5px",
                                      borderRadius: 3,
                                      background: doc.isValid === true ? "#DCFCE7" : doc.isValid === false ? "#FEE2E2" : doc.uploaded ? "#FEF3C7" : "#F1F5F9",
                                      color: doc.isValid === true ? "#15803D" : doc.isValid === false ? "#B91C1C" : doc.uploaded ? "#B45309" : "#64748B",
                                    }}
                                  >
                                    {doc.isValid === true ? "VALID IMAGE ✓" : doc.isValid === false ? "INVALID IMAGE ❌" : doc.uploaded ? "NEEDS AUDIT ⌛" : "MISSING ❌"}
                                  </span>
                                </div>

                                {doc.uploaded ? (
                                  <div>
                                    <div
                                      style={{
                                        width: "100%",
                                        height: 60,
                                        borderRadius: 6,
                                        overflow: "hidden",
                                        background: "#F1F5F9",
                                        margin: "4px 0",
                                        border: doc.isValid === true ? "1.5px solid #22C55E" : doc.isValid === false ? "1.5px solid #EF4444" : "1px solid #E2E8F0",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        cursor: "pointer",
                                      }}
                                      onClick={() => setPreviewDoc({ title: `${comp.companyName} — ${doc.label}`, url: doc.docUrl, name: doc.docName, companyId: comp.id, docId: doc.id, isValid: doc.isValid })}
                                    >
                                      {doc.docUrl && (doc.docUrl.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || doc.docUrl.startsWith("data:image")) ? (
                                        <img
                                          src={doc.docUrl}
                                          alt={doc.label}
                                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                                          onError={(e) => {
                                            e.target.onerror = null;
                                            e.target.style.display = "none";
                                          }}
                                        />
                                      ) : (
                                        <span style={{ fontSize: 20 }}>📄</span>
                                      )}
                                    </div>

                                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginTop: 4 }}>
                                      <button
                                        type="button"
                                        style={{
                                          width: "100%",
                                          padding: "4px 6px",
                                          fontSize: 10,
                                          fontWeight: 700,
                                          borderRadius: 4,
                                          background: "#0A1F3D",
                                          color: "#fff",
                                          border: "none",
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          justifyContent: "center",
                                          gap: 4,
                                        }}
                                        onClick={() => setPreviewDoc({ title: `${comp.companyName} — ${doc.label}`, url: doc.docUrl, name: doc.docName, companyId: comp.id, docId: doc.id, isValid: doc.isValid, isCompanyVerified: comp.kycStatus === "verified" })}
                                      >
                                        👁️ Inspect Image
                                      </button>
                                      {doc.isValid !== true && comp.kycStatus !== "verified" && (
                                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                                          <button
                                            type="button"
                                            style={{
                                              padding: "3px 2px",
                                              fontSize: 9,
                                              fontWeight: 800,
                                              borderRadius: 4,
                                              background: "#F0FDF4",
                                              color: "#16A34A",
                                              border: "1px solid #16A34A",
                                              cursor: "pointer",
                                            }}
                                            onClick={() => handleVerifyDoc(comp.id, doc.id, true)}
                                          >
                                            Valid ✓
                                          </button>
                                          <button
                                            type="button"
                                            style={{
                                              padding: "3px 2px",
                                              fontSize: 9,
                                              fontWeight: 800,
                                              borderRadius: 4,
                                              background: doc.isValid === false ? "#DC2626" : "#FEF2F2",
                                              color: doc.isValid === false ? "#fff" : "#DC2626",
                                              border: "1px solid #DC2626",
                                              cursor: "pointer",
                                            }}
                                            onClick={() => handleVerifyDoc(comp.id, doc.id, false)}
                                          >
                                            Invalid ❌
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ fontSize: 10, color: "#94A3B8", fontStyle: "italic", textAlign: "center", padding: "8px 0" }}>
                                    No document file uploaded
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {(() => {
                        const isVerified = comp.kycStatus === "verified";
                        const isRejected = comp.kycStatus === "rejected";
                        const hasInvalidMustDoc = comp.docs?.some((d) => d.uploaded && d.isValid === false);
                        const missingMustDoc = comp.docs?.some((d) => (d.id === "kycgst" || d.id === "kycpan") && !d.uploaded);

                        return (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8, alignItems: "stretch", minWidth: 160 }}>
                            {isVerified ? (
                              <div style={{ background: "#DCFCE7", color: "#15803D", padding: "10px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, border: "1px solid #86EFAC" }}>
                                <span>🟢 KYC VERIFIED ✓</span>
                              </div>
                            ) : isRejected ? (
                              <div style={{ background: "#FEE2E2", color: "#B91C1C", padding: "10px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, border: "1px solid #FCA5A5", textAlign: "center" }}>
                                <span>🔴 REVISION REQUESTED</span>
                                <span style={{ fontSize: 9.5, fontWeight: 700, color: "#991B1B" }}>(Awaiting Employer Re-upload)</span>
                              </div>
                            ) : (
                              <>
                                {hasInvalidMustDoc && (
                                  <div style={{ fontSize: 10, color: "#DC2626", fontWeight: 800, background: "#FEE2E2", padding: "5px 8px", borderRadius: 6, textAlign: "center", border: "1px solid #FCA5A5" }}>
                                    ⚠️ Invalid Image Detected<br />(Approve Blocked)
                                  </div>
                                )}
                                {!hasInvalidMustDoc && !missingMustDoc && (
                                  <button
                                    type="button"
                                    style={{ padding: "10px 14px", fontSize: 12, borderRadius: 6, background: "#16A34A", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                    disabled={processingId === comp.id}
                                    onClick={() => handleVerifyCompany(comp, "verify")}
                                  >
                                    Approve KYC ✓
                                  </button>
                                )}
                                <button
                                  type="button"
                                  style={{ padding: "10px 14px", fontSize: 12, borderRadius: 6, background: "#EF4444", color: "#fff", fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
                                  disabled={processingId === comp.id}
                                  onClick={() => handleVerifyCompany(comp, "reject")}
                                >
                                  Request Revision ⚠️
                                </button>
                              </>
                            )}
                          </div>
                        );
                      })()}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Staff Tasks & Leaderboard */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  Today's Task Queue
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {tasks.map((t) => (
                    <div key={t.id} style={{ fontSize: 12, paddingBottom: 8, borderBottom: "1px solid #F1F5F9" }}>
                      <div style={{ display: "flex", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--gold)" }}>{t.time}</span>
                        <span style={{ background: t.priority === "P1" ? "#FEE2E2" : "#DBEAFE", color: t.priority === "P1" ? "#DC2626" : "#1E40AF", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 4 }}>
                          {t.priority}
                        </span>
                      </div>
                      <div style={{ fontWeight: 600, color: "var(--navy)", marginTop: 2 }}>{t.title}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid var(--border-light)" }}>
                <h4 style={{ fontFamily: "var(--font-display)", fontSize: 15, fontWeight: 700, marginBottom: 12 }}>
                  Verification Leaderboard
                </h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {leaderboard.map((lb) => (
                    <div key={lb.rank} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ width: 22, height: 22, borderRadius: "50%", background: lb.rank === 1 ? "var(--gold)" : "#F1F5F9", color: lb.rank === 1 ? "var(--navy)" : "#64748B", display: "flex", alignItems: "center", justifyCenter: "center", fontWeight: 800, fontSize: 11, textAlign: "center", lineHeight: "22px" }}>
                          {lb.rank}
                        </span>
                        <span style={{ fontWeight: 700, color: "var(--navy)" }}>{lb.name}</span>
                      </div>
                      <span style={{ fontFamily: "var(--font-mono)", fontWeight: 700 }}>{lb.score} pts</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* FULLSCREEN DOCUMENT PREVIEW MODAL */}
      {previewDoc && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(6, 21, 42, 0.85)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setPreviewDoc(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              maxWidth: 800,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: "1px solid rgba(229,168,46,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #E2E8F0", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{previewDoc.title}</h3>
                <span style={{ fontSize: 12, color: "#64748B" }}>File: {previewDoc.name || "Verification Proof Document"}</span>
              </div>
              <button
                type="button"
                style={{ background: "#EF4444", color: "#fff", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                onClick={() => setPreviewDoc(null)}
              >
                Close ✕
              </button>
            </div>

            <div style={{ textAlign: "center", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 20, minHeight: 250, display: "flex", alignItems: "center", justifyContent: "center" }}>
              {previewDoc.url && (previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp|svg)/i) || previewDoc.url.startsWith("data:image")) ? (
                <img
                  src={previewDoc.url}
                  alt={previewDoc.title}
                  style={{ maxWidth: "100%", maxHeight: "65vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 10px 15px -3px rgba(0,0,0,0.1)" }}
                />
              ) : (
                <iframe
                  src={previewDoc.url}
                  title={previewDoc.title}
                  style={{ width: "100%", height: "60vh", border: "none", borderRadius: 8 }}
                />
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18, flexWrap: "wrap", gap: 12 }}>
              <a
                href={previewDoc.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontSize: 13, color: "#2563EB", fontWeight: 700, textDecoration: "underline" }}
              >
                🔗 Open Original File in New Tab ↗
              </a>

              {previewDoc.companyId && previewDoc.docId && previewDoc.isValid !== true && !previewDoc.isCompanyVerified ? (
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>AUDIT IMAGE VALIDITY:</span>
                  <button
                    type="button"
                    style={{
                      background: "#F0FDF4",
                      color: "#16A34A",
                      border: "1.5px solid #16A34A",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    onClick={() => handleVerifyDoc(previewDoc.companyId, previewDoc.docId, true)}
                  >
                    Valid Image ✓
                  </button>
                  <button
                    type="button"
                    style={{
                      background: previewDoc.isValid === false ? "#DC2626" : "#FEF2F2",
                      color: previewDoc.isValid === false ? "#fff" : "#DC2626",
                      border: "1.5px solid #DC2626",
                      borderRadius: 8,
                      padding: "8px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                    }}
                    onClick={() => handleVerifyDoc(previewDoc.companyId, previewDoc.docId, false)}
                  >
                    Invalid Image ❌
                  </button>
                </div>
              ) : previewDoc.isValid === true || previewDoc.isCompanyVerified ? (
                <div style={{ background: "#DCFCE7", color: "#15803D", padding: "6px 12px", borderRadius: 6, fontWeight: 800, fontSize: 12, border: "1px solid #86EFAC" }}>
                  🟢 Verified Valid Image ✓
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* AUDIT APPROVAL & REVISION REQUEST MODAL */}
      {auditModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(6, 21, 42, 0.85)",
            backdropFilter: "blur(4px)",
            zIndex: 99999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setAuditModal(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 24,
              maxWidth: 600,
              width: "100%",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
              border: auditModal.action === "verify" ? "2px solid #22C55E" : "2px solid #EF4444",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #E2E8F0", paddingBottom: 12 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: auditModal.action === "verify" ? "#15803D" : "#B91C1C" }}>
                  {auditModal.action === "verify" ? "🟢 APPROVE ACCOUNT & KYC VERIFICATION" : "🔴 REQUEST KYC DOCUMENT REVISION"}
                </h3>
                <span style={{ fontSize: 12, color: "#64748B" }}>
                  Company: <strong>{auditModal.company.companyName}</strong>
                </span>
              </div>
              <button
                type="button"
                style={{ background: "#F1F5F9", color: "#64748B", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                onClick={() => setAuditModal(null)}
              >
                ✕ Cancel
              </button>
            </div>

            <div style={{ background: "#F8FAFC", borderRadius: 10, padding: 14, marginBottom: 16, border: "1px solid #E2E8F0", fontSize: 12.5 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span><strong>Legal Name:</strong> {auditModal.company.legalName}</span>
                <span><strong>GSTIN:</strong> <code>{auditModal.company.gstin}</code></span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span><strong>POC:</strong> {auditModal.company.contactName}</span>
                <span style={{ color: "#2563EB", fontWeight: 700 }}>📧 Email: {auditModal.company.email}</span>
              </div>
            </div>

            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 6, textTransform: "uppercase" }}>
                {auditModal.action === "verify" ? "Audit Notes (Dispatched via Email):" : "Revision Reason / Instructions (Dispatched via Email):"}
              </label>
              <textarea
                style={{ width: "100%", borderRadius: 8, border: "1.5px solid #CBD5E1", padding: 10, fontSize: 13, minHeight: 90, fontFamily: "inherit" }}
                placeholder={auditModal.action === "verify" ? "Enter verification notes for company..." : "Explain which document or detail requires revision..."}
                value={auditModal.action === "verify" ? auditModal.notes : auditModal.reason}
                onChange={(e) => {
                  const val = e.target.value;
                  setAuditModal((prev) => (prev ? { ...prev, [prev.action === "verify" ? "notes" : "reason"]: val } : null));
                }}
              />
            </div>

            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", marginBottom: 20, fontSize: 12, color: "#1E40AF", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 16 }}>📩</span>
              <span>
                An official verification status email will be automatically sent to <strong>{auditModal.company.email}</strong>.
              </span>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                style={{ padding: "10px 18px", borderRadius: 8, background: "#F1F5F9", color: "#475569", border: "none", fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                onClick={() => setAuditModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                style={{
                  padding: "10px 22px",
                  borderRadius: 8,
                  background: auditModal.action === "verify" ? "#16A34A" : "#DC2626",
                  color: "#fff",
                  border: "none",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
                disabled={processingId === auditModal.company.id}
                onClick={submitAuditModal}
              >
                {processingId === auditModal.company.id
                  ? "Processing & Sending Email…"
                  : auditModal.action === "verify"
                  ? "✓ Confirm & Approve KYC (Send Email)"
                  : "⚠️ Send Revision Request (Send Email)"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
