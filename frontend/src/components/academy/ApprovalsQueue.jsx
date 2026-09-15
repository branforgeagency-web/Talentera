import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  XCircle,
  Play,
  Video,
  BookOpen,
  Clock,
  UserCheck,
  AlertTriangle,
  Search,
  RefreshCw,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import "../../styles/academyOS.css";

export default function ApprovalsQueue({ token, onApprovalChanged }) {
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedVideo, setSelectedVideo] = useState(null);
  const [rejectModal, setRejectModal] = useState({ open: false, item: null, reason: "" });
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  const fetchApprovals = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/academy/approvals", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setApprovals(data.pendingApprovals || []);
      }
    } catch (err) {
      console.error("Failed to fetch approvals:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApprovals();
  }, [token]);

  const showNotification = (msg, type = "success") => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleApprove = async (item) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/academy/approvals/${item.id}/approve`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ stageNumber: item.stageNumber }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || `Approved ${item.stageTitle} for ${item.candidateName}`);
        setApprovals((prev) => prev.filter((a) => a.id !== item.id));
        if (onApprovalChanged) onApprovalChanged();
      } else {
        showNotification(data.message || "Failed to approve.", "error");
      }
    } catch (err) {
      showNotification("Error approving stage.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.item) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/academy/approvals/${rejectModal.item.id}/reject`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason: rejectModal.reason,
          stageNumber: rejectModal.item.stageNumber,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        showNotification(data.message || "Feedback returned to candidate.");
        setApprovals((prev) => prev.filter((a) => a.id !== rejectModal.item.id));
        setRejectModal({ open: false, item: null, reason: "" });
        if (onApprovalChanged) onApprovalChanged();
      } else {
        showNotification(data.message || "Failed to reject.", "error");
      }
    } catch (err) {
      showNotification("Error rejecting stage.", "error");
    } finally {
      setActionLoading(false);
    }
  };

  const filteredApprovals = approvals.filter((item) => {
    if (filterType === "stage2" && item.stageNumber !== 2) return false;
    if (filterType === "stage5" && item.stageNumber !== 5) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        item.candidateName.toLowerCase().includes(q) ||
        (item.batchCode && item.batchCode.toLowerCase().includes(q)) ||
        (item.courseTitle && item.courseTitle.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Toast Notification */}
      {notification && (
        <div
          style={{
            padding: "12px 18px",
            borderRadius: 10,
            border: notification.type === "error" ? "1px solid #FECACA" : "1px solid #A7F3D0",
            background: notification.type === "error" ? "#FEF2F2" : "#ECFDF5",
            color: notification.type === "error" ? "#991B1B" : "#065F46",
            fontSize: 13,
            fontWeight: 600,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{notification.msg}</span>
          <button
            onClick={() => setNotification(null)}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "inherit" }}
          >
            &times;
          </button>
        </div>
      )}

      {/* Header Row */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#06152A", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <UserCheck style={{ width: 24, height: 24, color: "#CA8A04" }} />
              Awaiting My Approval Queue
            </h2>
            <span
              style={{
                background: "rgba(202, 138, 4, 0.15)",
                color: "#92400E",
                border: "1px solid rgba(202, 138, 4, 0.3)",
                fontSize: 11,
                fontWeight: 800,
                padding: "3px 10px",
                borderRadius: 999,
              }}
            >
              {approvals.length} Pending
            </span>
          </div>
          <p style={{ fontSize: 13, color: "#64748B", margin: "4px 0 0" }}>
            Review and verify student training hours (Stage 2) and portfolio introduction videos (Stage 5) to unblock live profile matching.
          </p>
        </div>

        <div>
          <button
            onClick={fetchApprovals}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              background: "#FFFFFF",
              border: "1px solid #CBD5E1",
              color: "#334155",
              fontSize: 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: 6,
              cursor: "pointer",
              boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
            }}
          >
            <RefreshCw style={{ width: 14, height: 14, animation: loading ? "spin 1s linear infinite" : "none" }} />
            Refresh Queue
          </button>
        </div>
      </div>

      {/* Educational Explainer Callout: Why the Approval Queue Exists */}
      <div
        style={{
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "14px 18px",
          display: "flex",
          gap: 14,
          alignItems: "flex-start",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: "rgba(229, 168, 46, 0.15)",
            color: "#B45309",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <ShieldCheck style={{ width: 18, height: 18 }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#06152A" }}>
            Why the Approval Queue Exists in Your Academy Dashboard
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 3, lineHeight: 1.5 }}>
            In Talentera's model, your academy is the primary accreditor and certifying authority. Automated platform APIs verify Government IDs (Stage 1) and AAPC/AHIMA credentials (Stage 3), while <strong>Stage 2 (Course & 120+ Training Hours)</strong> and <strong>Stage 5 (Portfolio Video Quality)</strong> are delegated directly to your academy to ensure presentation readiness before external recruiters match with candidates.
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "#FFFFFF",
          border: "1px solid #E2E8F0",
          borderRadius: 12,
          padding: "12px 16px",
          gap: 16,
          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.04)",
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={() => setFilterType("all")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              border: filterType === "all" ? "1px solid #06152A" : "1px solid #E2E8F0",
              background: filterType === "all" ? "#06152A" : "#F8FAFC",
              color: filterType === "all" ? "#FFFFFF" : "#475569",
              transition: "all 0.15s ease",
            }}
          >
            All Pending ({approvals.length})
          </button>
          <button
            onClick={() => setFilterType("stage2")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: filterType === "stage2" ? "1px solid #1D4ED8" : "1px solid #E2E8F0",
              background: filterType === "stage2" ? "rgba(59, 130, 246, 0.15)" : "#F8FAFC",
              color: filterType === "stage2" ? "#1D4ED8" : "#475569",
              transition: "all 0.15s ease",
            }}
          >
            <BookOpen style={{ width: 14, height: 14 }} />
            Stage 2: Training Validation ({approvals.filter((a) => a.stageNumber === 2).length})
          </button>
          <button
            onClick={() => setFilterType("stage5")}
            style={{
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              border: filterType === "stage5" ? "1px solid #6D28D9" : "1px solid #E2E8F0",
              background: filterType === "stage5" ? "rgba(139, 92, 246, 0.15)" : "#F8FAFC",
              color: filterType === "stage5" ? "#6D28D9" : "#475569",
              transition: "all 0.15s ease",
            }}
          >
            <Video style={{ width: 14, height: 14 }} />
            Stage 5: Video Review ({approvals.filter((a) => a.stageNumber === 5).length})
          </button>
        </div>

        {/* Search Input Box */}
        <div style={{ position: "relative", minWidth: 240 }}>
          <Search style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 14, height: 14, color: "#94A3B8" }} />
          <input
            type="text"
            placeholder="Search student or batch..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "8px 12px 8px 32px",
              fontSize: 12,
              border: "1px solid #CBD5E1",
              borderRadius: 8,
              background: "#FFFFFF",
              color: "#0F172A",
              outline: "none",
            }}
          />
        </div>
      </div>

      {/* Main Content List */}
      {loading ? (
        <div style={{ padding: "60px 20px", textAlign: "center", color: "#64748B", background: "#FFFFFF", borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <RefreshCw style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "#CA8A04", margin: "0 auto 12px" }} />
          <p style={{ fontSize: 13, fontWeight: 600 }}>Loading verification approval queue...</p>
        </div>
      ) : filteredApprovals.length === 0 ? (
        <div
          style={{
            padding: "50px 20px",
            textAlign: "center",
            background: "#FFFFFF",
            borderRadius: 12,
            border: "1px dashed #CBD5E1",
          }}
        >
          <CheckCircle2 style={{ width: 44, height: 44, color: "#10B981", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", margin: 0 }}>All Caught Up!</h3>
          <p style={{ fontSize: 13, color: "#64748B", margin: "6px auto 0", maxWidth: 400 }}>
            No verification tasks are currently awaiting your approval. Your students are progressing smoothly.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filteredApprovals.map((item) => (
            <div
              key={item.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #E2E8F0",
                borderRadius: 12,
                padding: "16px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 20,
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.03)",
                flexWrap: "wrap",
              }}
            >
              {/* Left Side Details */}
              <div style={{ display: "flex", gap: 16, alignItems: "flex-start", flex: 1, minWidth: 280 }}>
                {/* Avatar Icon */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "#06152A",
                    color: "#E5A82E",
                    fontWeight: 800,
                    fontSize: 15,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {item.candidateName ? item.candidateName.slice(0, 2).toUpperCase() : "ST"}
                </div>

                {/* Info Text */}
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {/* Stage Tag & Timestamp */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        fontWeight: 700,
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 6,
                        background: item.stageNumber === 2 ? "rgba(59, 130, 246, 0.1)" : "rgba(139, 92, 246, 0.1)",
                        color: item.stageNumber === 2 ? "#1D4ED8" : "#6D28D9",
                        border: item.stageNumber === 2 ? "1px solid rgba(59, 130, 246, 0.25)" : "1px solid rgba(139, 92, 246, 0.25)",
                      }}
                    >
                      {item.stageNumber === 2 ? <BookOpen style={{ width: 12, height: 12 }} /> : <Video style={{ width: 12, height: 12 }} />}
                      {item.stageTitle}
                    </span>

                    <span style={{ color: "#94A3B8", fontSize: 11, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <Clock style={{ width: 12, height: 12 }} />
                      {new Date(item.submittedAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Candidate Name & Email */}
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", margin: 0 }}>
                      {item.candidateName}
                    </h3>
                    <span style={{ fontSize: 12, color: "#64748B" }}>{item.candidateEmail}</span>
                  </div>

                  {/* Batch & Course */}
                  <div style={{ fontSize: 12, color: "#334155", fontWeight: 600 }}>
                    <span style={{ background: "#F1F5F9", padding: "1px 6px", borderRadius: 4, marginRight: 6, fontFamily: "monospace" }}>
                      {item.batchCode || "JAN-HCC-01"}
                    </span>
                    {item.courseTitle || "HCC Coding Specialization"}
                  </div>

                  {/* Description & Video link if stage 5 */}
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 2 }}>
                    {item.itemDescription}
                  </div>

                  {/* Stage 2 Details */}
                  {item.stageNumber === 2 && (
                    <div style={{ display: "flex", gap: 14, marginTop: 6, flexWrap: "wrap", fontSize: 11, color: "#334155" }}>
                      <span style={{ background: "#EFF6FF", padding: "3px 8px", borderRadius: 6, border: "1px solid #BFDBFE", fontWeight: 700, color: "#1D4ED8" }}>
                        Training Hours: 120 hrs (Path B)
                      </span>
                      <span style={{ background: "#F0FDF4", padding: "3px 8px", borderRadius: 6, border: "1px solid #BBF7D0", fontWeight: 700, color: "#15803D" }}>
                        Attendance: 96%
                      </span>
                      <span style={{ color: "#64748B" }}>
                        Batch Duration: 12 Weeks · Active
                      </span>
                    </div>
                  )}

                  {/* Stage 5 Details */}
                  {item.stageNumber === 5 && (
                    <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6, flexWrap: "wrap" }}>
                      <div style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "#059669", fontWeight: 700 }}>
                        <Sparkles style={{ width: 14, height: 14 }} />
                        <span>AI Speech & Fluency Score: <strong>{item.aiScore || "8.5"}/10</strong></span>
                      </div>
                      {item.videoUrl && (
                        <button
                          onClick={() => setSelectedVideo({ url: item.videoUrl, name: item.candidateName })}
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            background: "#FAF5FF",
                            color: "#6B21A8",
                            fontSize: 11,
                            fontWeight: 700,
                            cursor: "pointer",
                            border: "1px solid #E9D5FF",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 5,
                          }}
                        >
                          <Play style={{ width: 11, height: 11, fill: "currentColor" }} />
                          Preview Video (2m)
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Side Action Buttons */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
                <button
                  disabled={actionLoading}
                  onClick={() => handleApprove(item)}
                  style={{
                    background: "#10B981",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "9px 16px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    boxShadow: "0 1px 3px rgba(16, 185, 129, 0.3)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <CheckCircle2 style={{ width: 15, height: 15 }} />
                  {item.stageNumber === 2 ? "Approve Course Hours" : "Approve Video"}
                </button>
                <button
                  disabled={actionLoading}
                  onClick={() => setRejectModal({ open: true, item, reason: "" })}
                  style={{
                    background: "#FFFFFF",
                    color: "#DC2626",
                    border: "1px solid #FCA5A5",
                    padding: "9px 14px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <XCircle style={{ width: 15, height: 15 }} />
                  {item.stageNumber === 2 ? "Reject with Reason" : "Request Re-take"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div className="aos-modal-backdrop" onClick={() => setSelectedVideo(null)}>
          <div className="aos-modal-box" style={{ maxWidth: 640 }} onClick={(e) => e.stopPropagation()}>
            <div className="aos-modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Video style={{ width: 18, height: 18, color: "#E5A82E" }} />
                <h3 className="aos-modal-title">Stage 5 Video Review · {selectedVideo.name}</h3>
              </div>
              <button className="aos-modal-close" onClick={() => setSelectedVideo(null)}>
                &times;
              </button>
            </div>
            <div style={{ padding: 16, background: "#000", textAlign: "center" }}>
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                style={{ width: "100%", maxHeight: 380, borderRadius: 8, outline: "none" }}
              />
            </div>
            <div className="aos-modal-footer" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 12, color: "#64748B" }}>Duration: 02:00 max · Self-intro video</span>
              <button
                onClick={() => setSelectedVideo(null)}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#06152A",
                  color: "#FFFFFF",
                  fontWeight: 700,
                  fontSize: 12,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject / Feedback Modal */}
      {rejectModal.open && (
        <div className="aos-modal-backdrop" onClick={() => setRejectModal({ open: false, item: null, reason: "" })}>
          <div className="aos-modal-box" style={{ maxWidth: 500 }} onClick={(e) => e.stopPropagation()}>
            <div className="aos-modal-header" style={{ background: "#991B1B" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <AlertTriangle style={{ width: 18, height: 18, color: "#FEE2E2" }} />
                <h3 className="aos-modal-title">Return for Student Revision</h3>
              </div>
              <button className="aos-modal-close" onClick={() => setRejectModal({ open: false, item: null, reason: "" })}>
                &times;
              </button>
            </div>
            <div className="aos-modal-body" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                Provide constructive feedback to <strong>{rejectModal.item?.candidateName}</strong> explaining what needs correction before Stage {rejectModal.item?.stageNumber} can be approved.
              </p>
              <textarea
                rows={4}
                placeholder="e.g. Please re-record introduction video in good lighting with clear audio, or re-upload the 120-hour attendance sheet."
                value={rejectModal.reason}
                onChange={(e) => setRejectModal({ ...rejectModal, reason: e.target.value })}
                style={{
                  width: "100%",
                  padding: 12,
                  fontSize: 13,
                  border: "1px solid #CBD5E1",
                  borderRadius: 8,
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
            <div className="aos-modal-footer">
              <button
                onClick={() => setRejectModal({ open: false, item: null, reason: "" })}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#F1F5F9",
                  color: "#475569",
                  fontSize: 12,
                  fontWeight: 600,
                  border: "1px solid #CBD5E1",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading}
                style={{
                  padding: "8px 16px",
                  borderRadius: 8,
                  background: "#DC2626",
                  color: "#FFFFFF",
                  fontSize: 12,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Send Feedback & Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
