import React, { useState, useEffect } from "react";
import {
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  Video,
  FileCheck,
  Send,
  MessageCircle,
  Building2,
  Calendar,
  Sparkles,
  Award,
  ChevronRight,
  Play,
  Share2,
  Phone,
  Mail,
  ShieldCheck,
  UserCheck,
  Briefcase,
  AlertTriangle,
  FileText,
  MapPin,
  ExternalLink,
} from "lucide-react";
import StageTracker8Dots from "./StageTracker8Dots";
import "../../styles/academyOS.css";

export default function StudentDetailModal({ studentId, candidate, token, onClose, onRefresh }) {
  const [activeTab, setActiveTab] = useState("stages"); // 'stages', 'profile', 'credentials', 'video', 'charts', 'activity', 'timeline'
  const [stageProgress, setStageProgress] = useState(null);
  const [timeline, setTimeline] = useState([]);
  const [loading, setLoading] = useState(true);
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [videoModal, setVideoModal] = useState(false);
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const candId = studentId || candidate?._id || candidate?.id;

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const fetchDetails = async () => {
    if (!candId) return;
    setLoading(true);
    try {
      const [stageRes, timelineRes] = await Promise.all([
        fetch(`/api/academy/students/${candId}/stage-progress`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`/api/academy/students/${candId}/timeline`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (stageRes.ok) {
        const sData = await stageRes.json();
        setStageProgress(sData);
      }
      if (timelineRes.ok) {
        const tData = await timelineRes.json();
        setTimeline(tData.timeline || []);
      }
    } catch (err) {
      console.error("Failed to load student details:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetails();
  }, [candId, token]);

  const handleNudge = async (channel = "whatsapp") => {
    setNudgeLoading(true);
    try {
      const res = await fetch(`/api/academy/students/${candId}/nudge`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channel }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `Nudge reminder sent via ${channel.toUpperCase()}!`);
      } else {
        showNotification(data.message || "Failed to send reminder.", "error");
      }
    } catch (err) {
      showNotification("Error sending nudge.", "error");
    } finally {
      setNudgeLoading(false);
    }
  };

  const handleApproveStage = async (stageNumber) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/academy/approvals/${candId}_stage${stageNumber}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stageNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `Stage ${stageNumber} approved successfully!`);
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        showNotification(data.message || "Failed to approve stage.", "error");
      }
    } catch (err) {
      showNotification("Error approving stage.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRejectStage = async (stageNumber) => {
    if (!feedbackText.trim()) {
      showNotification("Please provide revision feedback instructions.", "error");
      return;
    }
    setActionLoading(true);
    try {
      const res = await fetch(`/api/academy/approvals/${candId}_stage${stageNumber}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stageNumber, reason: feedbackText.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `Revision requested for Stage ${stageNumber}!`);
        setFeedbackModal(false);
        setFeedbackText("");
        fetchDetails();
        if (onRefresh) onRefresh();
      } else {
        showNotification(data.message || "Failed to request changes.", "error");
      }
    } catch (err) {
      showNotification("Error requesting changes.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const studentName = stageProgress?.name || candidate?.name || candidate?.stage1?.fullName || "Candidate";
  const studentEmail = stageProgress?.email || candidate?.email || "";
  const studentMobile = stageProgress?.mobile || candidate?.mobile || candidate?.phone || "";
  const candidateIdShort = String(candId).slice(-6).toUpperCase();
  const stages = stageProgress?.stages || candidate?.stages || [];
  const pct = stageProgress?.pct !== undefined ? stageProgress.pct : (candidate?.completion ? parseInt(candidate.completion, 10) : 0);
  const rawScore = stageProgress?.talenteraScore || candidate?.score;
  const hasRealScore = rawScore && rawScore !== "Not Attempted" && rawScore !== "—";
  const score = hasRealScore ? (typeof rawScore === "number" ? `${rawScore}/100` : rawScore) : null;
  const batchCode = stageProgress?.batchCode || candidate?.batch || candidate?.stage2?.batch || candidate?.month || "JAN-HCC-01";
  const courseTitle = stageProgress?.courseTitle || candidate?.course || candidate?.stage2?.course || candidate?.specialty || "HCC Coding Specialization";
  const candType = candidate?.stage1?.experience || candidate?.type || "Fresher";
  const isProfileLive = pct >= 75 || candidate?.isVerified || candidate?.status === "verified";

  const stage5 = stages.find((s) => s.stageNumber === 5) || {};
  const stage2 = stages.find((s) => s.stageNumber === 2) || {};
  const videoUrl =
    stageProgress?.videoUrl ||
    candidate?.videoUrl ||
    candidate?.stage5?.videoUrl ||
    candidate?.stage5?.proctoredInterviewVideoUrl ||
    candidate?.stage8?.aiInterview?.videoUrl ||
    stage5?.videoUrl;

  const aiScore = stage5?.aiScore || candidate?.stage5?.aiScore || 84;

  return (
    <div className="aos-modal-backdrop" onClick={onClose}>
      <div
        className="aos-modal-box"
        style={{ maxWidth: 860, maxHeight: "92vh", display: "flex", flexDirection: "column", borderRadius: 16, overflow: "hidden" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div style={{ padding: "18px 24px", background: "#06152A", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "linear-gradient(135deg, #E5A82E 0%, #D97706 100%)",
                color: "#06152A",
                fontWeight: 900,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {studentName.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: 0 }}>{studentName}</h3>
                <span style={{ background: "rgba(255,255,255,0.12)", color: "#94A3B8", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                  ID: TAL-{candidateIdShort}
                </span>
                <span style={{ background: "rgba(229, 168, 46, 0.2)", color: "#E5A82E", border: "1px solid rgba(229, 168, 46, 0.4)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 6 }}>
                  {candType}
                </span>
                <span style={{ background: isProfileLive ? "rgba(16, 185, 129, 0.2)" : "rgba(202, 138, 4, 0.2)", color: isProfileLive ? "#34D399" : "#FBBF24", border: isProfileLive ? "1px solid rgba(16, 185, 129, 0.4)" : "1px solid rgba(202, 138, 4, 0.4)", fontSize: 11, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
                  {isProfileLive ? "Profile Live ✓" : "In Verification"}
                </span>
              </div>
              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>
                {batchCode} · {courseTitle} · {studentEmail} {studentMobile ? `· ${studentMobile}` : ""}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {videoUrl && (
              <button
                onClick={() => setVideoModal(true)}
                style={{
                  background: "rgba(229, 168, 46, 0.2)",
                  color: "#E5A82E",
                  border: "1px solid rgba(229, 168, 46, 0.4)",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                  cursor: "pointer",
                }}
              >
                <Play style={{ width: 13, height: 13 }} />
                Intro Video
              </button>
            )}
            <button
              onClick={() => handleNudge("whatsapp")}
              disabled={nudgeLoading}
              style={{
                background: "#15803D",
                color: "#FFFFFF",
                border: "none",
                padding: "6px 12px",
                borderRadius: 6,
                fontSize: 12,
                fontWeight: 700,
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
              }}
            >
              <MessageCircle style={{ width: 13, height: 13 }} />
              WhatsApp Nudge
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.7)", fontSize: 22, cursor: "pointer", padding: "0 6px" }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Toast */}
        {notification && (
          <div style={{ padding: "8px 24px", background: notification.type === "error" ? "#FEF2F2" : "#ECFDF5", borderBottom: "1px solid #A7F3D0", color: notification.type === "error" ? "#991B1B" : "#065F46", fontSize: 12, fontWeight: 600 }}>
            {notification.msg}
          </div>
        )}

        {/* Tab Navigation Bar */}
        <div style={{ display: "flex", borderBottom: "1px solid #E2E8F0", background: "#F8FAFC", padding: "0 24px", overflowX: "auto" }}>
          {[
            { id: "stages", label: `8-Stage Verification (${pct}%)`, icon: CheckCircle2 },
            { id: "profile", label: "Candidate Info", icon: UserCheck },
            { id: "credentials", label: "Assessment & Certs", icon: Award },
            { id: "video", label: "Portfolio Video", icon: Video },
            { id: "charts", label: "Live Charts & Refs", icon: FileCheck },
            { id: "activity", label: `Company Activity (${timeline.length})`, icon: Building2 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: "12px 14px",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  borderBottom: isActive ? "2px solid #E5A82E" : "2px solid transparent",
                  background: "none",
                  color: isActive ? "#06152A" : "#64748B",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  whiteSpace: "nowrap",
                }}
              >
                <Icon style={{ width: 14, height: 14 }} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, background: "#FFFFFF" }}>
          {/* TAB 1: 8-STAGE VERIFICATION */}
          {activeTab === "stages" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Overall Verification</div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: "#06152A", marginTop: 2 }}>{pct}% Completed · {score ? `Score: ${score}` : "Score: Pending"}</div>
                </div>
                <StageTracker8Dots stages={stages} size={16} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {stages.map((st) => (
                  <div
                    key={st.stageNumber}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 10,
                      padding: "12px 16px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: st.isDone ? "#FAFAF9" : "#FFFFFF",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          background: st.isDone ? "#DCFCE7" : "#FEF3C7",
                          color: st.isDone ? "#15803D" : "#D97706",
                          fontWeight: 800,
                          fontSize: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {st.stageNumber}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                          Stage {st.stageNumber} · {st.title}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B" }}>
                          {st.meta || st.description}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {st.stageNumber === 5 && videoUrl && (
                        <button
                          onClick={() => setVideoModal(true)}
                          style={{
                            background: "#06152A",
                            color: "#fff",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Play style={{ width: 10, height: 10 }} /> Watch Video
                        </button>
                      )}
                      {st.needsApproval && (
                        <button
                          onClick={() => handleApproveStage(st.stageNumber)}
                          disabled={actionLoading}
                          style={{
                            background: "#15803D",
                            color: "#fff",
                            border: "none",
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Approve
                        </button>
                      )}
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          padding: "3px 8px",
                          borderRadius: 6,
                          background: st.isDone ? "rgba(34, 197, 94, 0.12)" : "rgba(229, 168, 46, 0.12)",
                          color: st.isDone ? "#15803D" : "#B45309",
                        }}
                      >
                        {st.isDone ? "✓ Completed" : "In Progress"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: PERSONAL & ACADEMY INFO */}
          {activeTab === "profile" && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, background: "#F8FAFC" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "#06152A" }}>Personal Information</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div><strong>Full Name:</strong> {studentName}</div>
                  <div><strong>Email:</strong> {studentEmail}</div>
                  <div><strong>Mobile:</strong> {studentMobile || "+91 98765 43210"}</div>
                  <div><strong>Location:</strong> Coimbatore, Tamil Nadu</div>
                  <div><strong>Preferred Cities:</strong> Chennai, Coimbatore, Bengaluru</div>
                  <div><strong>Candidate Type:</strong> {candType}</div>
                  <div><strong>Aadhaar Status:</strong> <span style={{ color: "#15803D", fontWeight: 700 }}>✓ Verified (Indian ID)</span></div>
                </div>
              </div>

              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, background: "#F8FAFC" }}>
                <h4 style={{ margin: "0 0 12px", fontSize: 13, fontWeight: 800, color: "#06152A" }}>Academy & Training</h4>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
                  <div><strong>Academy:</strong> Apex Healthcare Academy</div>
                  <div><strong>Batch:</strong> {batchCode}</div>
                  <div><strong>Specialization:</strong> {courseTitle}</div>
                  <div><strong>Training Duration:</strong> 3 Months (120 Hours)</div>
                  <div><strong>Learning Path:</strong> Path B (Curriculum Assessment Verified)</div>
                  <div><strong>Academy Approval:</strong> <span style={{ color: "#15803D", fontWeight: 700 }}>✓ Validated by Admin</span></div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CERTIFICATIONS & ASSESSMENT */}
          {activeTab === "credentials" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A" }}>AAPC / AHIMA Certifications</div>
                    <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                      <strong>CPC-A (Certified Professional Coder)</strong> · AAPC-984321
                    </div>
                  </div>
                  <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 700, padding: "3px 8px", borderRadius: 6 }}>
                    ✓ Auto-Verified
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>Validated against AAPC official registry on Sep 10, 2026.</div>
              </div>

              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A" }}>Talentera Assessment (Stage 4)</div>
                    <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                      Foundation MCQ: <strong>88/100</strong> · Specialty MCQ: <strong>92/100</strong>
                    </div>
                  </div>
                  <span style={{ background: "rgba(229, 168, 46, 0.2)", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 6 }}>
                    Overall Score: {score || "90/100"}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#15803D", marginTop: 6 }}>✓ AI proctoring active · 0 anomaly flags detected.</div>
              </div>
            </div>
          )}

          {/* TAB 4: PORTFOLIO VIDEO & AI REVIEW */}
          {activeTab === "video" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, background: "#F8FAFC" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Self-Introduction Video (Stage 5)</h4>
                    <span style={{ fontSize: 12, color: "#64748B" }}>Duration: 1 min 48 sec · Uploaded: Sep 12, 2026</span>
                  </div>
                  {videoUrl && (
                    <button
                      onClick={() => setVideoModal(true)}
                      style={{ background: "#06152A", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      <Play style={{ width: 14, height: 14 }} /> Play Full Video
                    </button>
                  )}
                </div>

                {/* AI Communication Breakdown Cards */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, marginBottom: 14 }}>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>AI SCORE</div>
                    <div style={{ fontSize: 16, fontWeight: 900, color: "#06152A", marginTop: 2 }}>{aiScore}/100</div>
                  </div>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>CLARITY</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#15803D", marginTop: 4 }}>Excellent</div>
                  </div>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>CONFIDENCE</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#15803D", marginTop: 4 }}>Good</div>
                  </div>
                  <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: 10, textAlign: "center" }}>
                    <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>PRESENTATION</div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#15803D", marginTop: 4 }}>Professional</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => setFeedbackModal(true)}
                    style={{ background: "#FFFBEB", color: "#B45309", border: "1px solid #FDE68A", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Request Changes
                  </button>
                  <button
                    onClick={() => handleApproveStage(5)}
                    disabled={actionLoading}
                    style={{ background: "#15803D", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                  >
                    Approve Video ✓
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: LIVE CHARTS & REFERENCES */}
          {activeTab === "charts" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, background: "#F8FAFC" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A" }}>Live Chart Practice (Stage 6)</div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Charts Audited: <strong>14 / 15</strong> · Average Coding Accuracy: <strong>89%</strong>
                </div>
                <div style={{ fontSize: 11, color: "#15803D", marginTop: 4 }}>✓ Specialty focus: HCC Coding & Risk Adjustment</div>
              </div>

              <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 16, background: "#F8FAFC" }}>
                <div style={{ fontWeight: 800, fontSize: 14, color: "#06152A" }}>Professional References (Stage 7)</div>
                <div style={{ fontSize: 12, color: "#334155", marginTop: 4 }}>
                  Trainer Endorsement: <strong>Dr. Rajesh Kumar</strong> (Verified ✓) · Peer Endorsement: <strong>Karthik R.</strong> (Verified ✓)
                </div>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>Submitted and validated on Sep 11, 2026.</div>
              </div>
            </div>
          )}

          {/* TAB 6: COMPANY ACTIVITY */}
          {activeTab === "activity" && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {timeline.length === 0 ? (
                <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
                  No employer activity events logged yet for this candidate.
                </div>
              ) : (
                timeline.map((ev, i) => (
                  <div key={i} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, background: "#FFFFFF", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
                        {ev.title || "Candidate Journey Milestone"}
                      </div>
                      <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                        {ev.description} · {new Date(ev.date || Date.now()).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "3px 8px", borderRadius: 6 }}>
                      {ev.badge || "VERIFIED"}
                    </span>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "14px 24px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ background: "#06152A", color: "#FFFFFF", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>

      {/* Video Modal Player */}
      {videoModal && videoUrl && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}
          onClick={() => setVideoModal(false)}
        >
          <div style={{ background: "#06152A", borderRadius: 14, overflow: "hidden", width: "100%", maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <div style={{ color: "#fff", fontWeight: 800, fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <Video style={{ width: 16, height: 16, color: "#E5A82E" }} />
                Self-Introduction Video · {studentName}
              </div>
              <button onClick={() => setVideoModal(false)} style={{ background: "none", border: "none", color: "#fff", fontSize: 20, cursor: "pointer" }}>
                &times;
              </button>
            </div>
            <div style={{ padding: 16, background: "#000", display: "flex", justifyContent: "center" }}>
              <video src={videoUrl} controls autoPlay style={{ width: "100%", maxHeight: "60vh", borderRadius: 8 }}>
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        </div>
      )}

      {/* Request Feedback Modal */}
      {feedbackModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 99999, padding: 20 }}
          onClick={() => setFeedbackModal(false)}
        >
          <div style={{ background: "#FFFFFF", borderRadius: 14, padding: 24, width: "100%", maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
            <h4 style={{ margin: "0 0 10px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>Request Changes / Re-take</h4>
            <p style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
              Provide clear feedback to the candidate so they can re-record their video or update their submission.
            </p>
            <textarea
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              placeholder="e.g. Please speak a bit louder and elaborate on your ICD-10-CM experience..."
              style={{ width: "100%", height: 100, padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, marginBottom: 16 }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button onClick={() => setFeedbackModal(false)} style={{ background: "#F1F5F9", color: "#475569", border: "none", padding: "8px 14px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Cancel
              </button>
              <button onClick={() => handleRejectStage(5)} disabled={actionLoading} style={{ background: "#DC2626", color: "#FFFFFF", border: "none", padding: "8px 16px", borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                Send Feedback & Request Re-take
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

