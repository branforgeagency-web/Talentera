import React, { useState, useEffect } from "react";
import api from "../api/client";
import AiVideoAssessment from "./AiVideoAssessment.jsx";
import ClaudeMockInterviewBot from "./ClaudeMockInterviewBot.jsx";
import AiProctoringInterviewScreen from "./AiProctoringInterviewScreen.jsx";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  // mode: "overview" | "record_intro" | "start_mock" | "proctor_mock"
  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const initialMode = searchParams?.get("mode") || "overview";
  const [mode, setMode] = useState(initialMode);
  const [mockSession, setMockSession] = useState(null);
  const [loadingMockState, setLoadingMockState] = useState(true);

  // Retake Request state
  const [retakeRequest, setRetakeRequest] = useState(null);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [retakeError, setRetakeError] = useState("");
  const [retakeSuccessMsg, setRetakeSuccessMsg] = useState("");

  // Fetch the latest mock interview session state & retake request from backend
  useEffect(() => {
    let active = true;
    api
      .get("/candidate/ai-interview/state")
      .then((res) => {
        if (!active) return;
        if (res.data?.session) {
          setMockSession(res.data.session);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoadingMockState(false);
      });

    api
      .get("/candidate/retake-request?stage=5")
      .then((res) => {
        if (!active) return;
        if (res.data?.request) {
          setRetakeRequest(res.data.request);
        } else {
          setRetakeRequest(null);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [mode]);

  // Card 1: Self-Introduction Video state
  const hasSelfIntro = Boolean(
    existingData?.videoUrl ||
    existingData?.url ||
    existingData?.videoFileName ||
    existingData?.selfIntroCompleted ||
    existingData?.aiVideoAssessmentCompleted
  );

  // Card 2: AI Mock Interview state
  const isMockCompleted = Boolean(
    (mockSession && (mockSession.status === "COMPLETED" || mockSession.status === "STOPPED")) ||
    existingData?.stage8?.aiInterview?.status === "COMPLETED" ||
    existingData?.stage8?.aiInterview?.status === "STOPPED" ||
    existingData?.aiInterview?.status === "COMPLETED" ||
    existingData?.aiInterview?.status === "STOPPED" ||
    existingData?.mockInterviewCompleted ||
    existingData?.stage5?.mockInterviewCompleted
  );

  const isMockEndedEarly = Boolean(
    mockSession?.status === "STOPPED" ||
    mockSession?.endedReason === "USER_ENDED" ||
    existingData?.stage5?.endedReason === "USER_ENDED" ||
    existingData?.stage5?.status === "STOPPED" ||
    existingData?.stage5?.endedEarly ||
    existingData?.stage8?.aiInterview?.status === "STOPPED" ||
    existingData?.aiInterview?.status === "STOPPED"
  );

  const isMockInProgress = Boolean(mockSession?.status === "IN_PROGRESS");
  const isTerminatedTabSwitch = Boolean(
    existingData?.stage5?.terminatedDueToTabSwitch ||
    existingData?.terminatedDueToTabSwitch ||
    mockSession?.status === "TERMINATED_TAB_SWITCH" ||
    existingData?.stage8?.aiInterview?.status === "TERMINATED_TAB_SWITCH"
  );
  const mockScore = mockSession?.result?.overallScore ?? existingData?.stage8?.aiInterview?.result?.overallScore ?? existingData?.mockScore ?? existingData?.stage5?.mockScore ?? null;

  // Both must be complete to unlock next stage
  const bothCompleted = hasSelfIntro && isMockCompleted;
  const completedCount = (hasSelfIntro ? 1 : 0) + (isMockCompleted ? 1 : 0);

  function handleVideoSaved(data) {
    if (onSaved) onSaved(data, { advance: false });
    setMode("overview");
  }

  function handleMockCompleted(data) {
    if (onSaved) onSaved(data, { advance: false });
    setMode("overview");
  }

  async function handleSubmitRetakeRequest(e) {
    if (e) e.preventDefault();
    if (!retakeReason.trim()) {
      setRetakeError("Please provide a reason for requesting a retake.");
      return;
    }
    if (retakeReason.trim().length < 10) {
      setRetakeError("Please provide a more detailed reason (minimum 10 characters).");
      return;
    }
    setSubmittingRetake(true);
    setRetakeError("");
    setRetakeSuccessMsg("");

    try {
      const res = await api.post("/candidate/retake-request", {
        stage: 5,
        assessmentType: "Talentera AI Mock Interview (Stage 5)",
        reason: retakeReason.trim(),
      });

      if (res.data?.success || res.data?.request) {
        setRetakeRequest(res.data.request);
        setRetakeSuccessMsg("Your retake request has been submitted to Talentera employees!");
        setShowRetakeModal(false);
        setRetakeReason("");
      }
    } catch (err) {
      setRetakeError(err.response?.data?.message || "Failed to submit retake request. Please try again.");
    } finally {
      setSubmittingRetake(false);
    }
  }

  async function handleProceedToStage6() {
    if (!bothCompleted) return;
    try {
      const res = await api.put("/candidate/stage/5", {
        completed: true,
        selfIntroCompleted: true,
        mockInterviewCompleted: true,
      });
      if (onSaved) {
        onSaved(res.data, { advance: true, nextStage: 6 });
      }
    } catch (err) {
      console.warn("Stage 5 save notice:", err?.message);
      if (onSaved) {
        onSaved(
          {
            ...existingData,
            stage: 5,
            completed: true,
            selfIntroCompleted: true,
            mockInterviewCompleted: true,
          },
          { advance: true, nextStage: 6 }
        );
      }
    }
  }

  if (mode === "record_intro") {
    return (
      <div className="wiz-stage-container">
        <div style={{ marginBottom: 16 }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode("overview")}
            style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>← Back to Stage 05 Hub</span>
          </button>
        </div>
        <AiVideoAssessment existingData={existingData} onSaved={handleVideoSaved} />
      </div>
    );
  }

  if (mode === "proctor_mock" || mode === "start_mock") {
    return (
      <div className="wiz-stage-container" style={{ maxWidth: 1400, margin: "0 auto", padding: "0 12px" }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => setMode("overview")}
            style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
          >
            <span>← Back to Stage 05 Hub</span>
          </button>
          <span style={{ fontSize: 12, color: "#64748B", fontWeight: 600 }}>
            <i className="fa-solid fa-shield-halved" style={{ color: "#2563EB", marginRight: 6 }}></i>
            Real-Time AI Vision Proctoring Active
          </span>
        </div>
        <AiProctoringInterviewScreen candidateData={existingData} onCompleted={handleMockCompleted} />
      </div>
    );
  }

  return (
    <div className="stage5-wrapper">
      <style>{`
        .stage5-wrapper {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 16px;
          padding: 28px 32px;
          box-shadow: 0 4px 20px rgba(15, 23, 42, 0.03);
          font-family: inherit;
        }

        .stage5-header-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 1px dashed #CBD5E1;
          gap: 16px;
          flex-wrap: wrap;
        }

        .stage5-header-left {
          display: flex;
          align-items: flex-start;
          gap: 14px;
        }

        .stage5-header-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: #DCFCE7;
          color: #16A34A;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 16px;
          font-weight: 700;
          flex-shrink: 0;
          margin-top: 2px;
        }

        .stage5-header-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stage5-header-title {
          font-size: 20px;
          font-weight: 800;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .stage5-header-sub {
          font-size: 11px;
          font-weight: 700;
          color: #64748B;
          letter-spacing: 0.06em;
          text-transform: uppercase;
        }

        .stage5-progress-badge {
          background: ${bothCompleted ? "#DCFCE7" : "#EFF6FF"};
          color: ${bothCompleted ? "#15803D" : "#1D4ED8"};
          border: 1px solid ${bothCompleted ? "#86EFAC" : "#BFDBFE"};
          padding: 6px 14px;
          border-radius: 999px;
          font-size: 12px;
          font-weight: 800;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .stage5-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stage5-card-item {
          background: #FFFFFF;
          border: 1.5px solid #E2E8F0;
          border-radius: 14px;
          padding: 22px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
          transition: all 0.2s ease;
        }

        .stage5-card-item.is-completed {
          border-color: #86EFAC;
          background: #F0FDF4;
        }

        .stage5-card-main {
          display: flex;
          align-items: center;
          gap: 16px;
          flex: 1;
        }

        .stage5-icon-box {
          width: 52px;
          height: 52px;
          border-radius: 14px;
          background: linear-gradient(135deg, #FF3B70 0%, #F42A5B 100%);
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(244, 42, 91, 0.3);
        }

        .stage5-icon-box.is-completed {
          background: #16A34A;
          box-shadow: 0 4px 14px rgba(22, 163, 74, 0.3);
        }

        .stage5-card-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .stage5-card-heading-row {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }

        .stage5-card-heading {
          font-size: 17.5px;
          font-weight: 700;
          color: #0F172A;
          margin: 0;
          letter-spacing: -0.01em;
        }

        .stage5-card-desc {
          font-size: 13.5px;
          color: #64748B;
          line-height: 1.45;
          margin: 0;
        }

        .stage5-tag-completed {
          background: #DCFCE7;
          color: #15803D;
          border: 1px solid #86EFAC;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .stage5-tag-required {
          background: #FEF3C7;
          color: #B45309;
          border: 1px solid #FDE68A;
          font-size: 11px;
          font-weight: 800;
          padding: 2px 8px;
          border-radius: 6px;
        }

        .stage5-action-btn {
          background: linear-gradient(90deg, #FF3B70 0%, #F42A5B 100%);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 12px 26px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(244, 42, 91, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .stage5-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(244, 42, 91, 0.45);
        }

        .stage5-view-score-btn {
          background: #FFFFFF;
          color: #0F172A;
          border: 1.5px solid #0F172A;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 11px 24px;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .stage5-view-score-btn:hover {
          background: #0F172A;
          color: #FFFFFF;
        }

        .stage5-recorded-pill {
          background: #DCFCE7;
          color: #15803D;
          border: 1.5px solid #86EFAC;
          font-weight: 800;
          font-size: 12.5px;
          letter-spacing: 0.04em;
          padding: 10px 20px;
          border-radius: 10px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .stage5-footer {
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          flex-wrap: wrap;
        }

        .stage5-footer-msg {
          font-size: 13px;
          color: #64748B;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .stage5-next-btn {
          background: linear-gradient(135deg, #10B981 0%, #059669 100%);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 14px;
          padding: 14px 32px;
          border-radius: 12px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(16, 185, 129, 0.35);
          transition: all 0.15s ease;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        .stage5-next-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(16, 185, 129, 0.45);
        }

        .stage5-locked-btn {
          background: #E2E8F0;
          color: #94A3B8;
          font-weight: 700;
          font-size: 13.5px;
          padding: 13px 26px;
          border-radius: 12px;
          border: none;
          cursor: not-allowed;
          display: inline-flex;
          align-items: center;
          gap: 8px;
        }

        @media (max-width: 640px) {
          .stage5-card-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .stage5-action-btn, .stage5-view-score-btn, .stage5-recorded-pill {
            width: 100%;
            justify-content: center;
          }
          .stage5-footer {
            flex-direction: column;
            align-items: stretch;
          }
          .stage5-next-btn, .stage5-locked-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="stage5-header-row">
        <div className="stage5-header-left">
          <div className="stage5-header-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
          <div className="stage5-header-text">
            <h2 className="stage5-header-title">Stage 05 · Communication & Video Assessment</h2>
            <span className="stage5-header-sub">MANDATORY · COMPLETE BOTH ASSESSMENTS TO UNLOCK NEXT STAGE</span>
          </div>
        </div>

        <div className="stage5-progress-badge">
          {bothCompleted ? (
            <>
              <i className="fa-solid fa-circle-check"></i>
              <span>2 of 2 Completed</span>
            </>
          ) : (
            <>
              <i className="fa-solid fa-lock"></i>
              <span>{completedCount} of 2 Completed</span>
            </>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="stage5-cards-grid">
        {/* Card 1: 60-second self-introduction */}
        <div className={`stage5-card-item ${hasSelfIntro ? "is-completed" : ""}`}>
          <div className="stage5-card-main">
            <div className={`stage5-icon-box ${hasSelfIntro ? "is-completed" : ""}`}>
              {hasSelfIntro ? (
                <i className="fa-solid fa-check"></i>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <polygon points="23 7 16 12 23 17 23 7"></polygon>
                  <rect x="1" y="5" width="15" height="14" rx="3" ry="3"></rect>
                </svg>
              )}
            </div>
            <div className="stage5-card-info">
              <div className="stage5-card-heading-row">
                <h3 className="stage5-card-heading">1. 60-Second Self-Introduction</h3>
                {hasSelfIntro ? (
                  <span className="stage5-tag-completed">
                    <i className="fa-solid fa-circle-check"></i> COMPLETED
                  </span>
                ) : (
                  <span className="stage5-tag-required">REQUIRED</span>
                )}
              </div>
              <p className="stage5-card-desc">
                {hasSelfIntro
                  ? "Self-introduction video submitted and waiting for verification."
                  : "Record live or upload your pre-recorded 60-second self-introduction video. Employers watch this recording before shortlisting."}
              </p>
            </div>
          </div>

          {hasSelfIntro ? (
            <div className="stage5-recorded-pill">
              <i className="fa-solid fa-circle-check"></i>
              <span>RECORDED</span>
            </div>
          ) : (
            <button type="button" className="stage5-action-btn" onClick={() => setMode("record_intro")}>
              <i className="fa-solid fa-video"></i>
              <span>RECORD / UPLOAD</span>
            </button>
          )}
        </div>

        {/* Card 2: AI-reviewed 5-minute mock interview */}
        <div className={`stage5-card-item ${isMockCompleted ? "is-completed" : ""}`}>
          <div className="stage5-card-main">
            <div className={`stage5-icon-box ${isMockCompleted ? "is-completed" : ""}`}>
              {isMockCompleted ? (
                <i className="fa-solid fa-check"></i>
              ) : (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
              )}
            </div>
            <div className="stage5-card-info">
              <div className="stage5-card-heading-row">
                <h3 className="stage5-card-heading">2. AI-Reviewed Mock Interview</h3>
                {isMockEndedEarly ? (
                  <span className="stage5-tag-completed" style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D" }}>
                    <i className="fa-solid fa-flag-checkered"></i> ENDED EARLY
                  </span>
                ) : isMockCompleted ? (
                  <span className="stage5-tag-completed">
                    <i className="fa-solid fa-circle-check"></i> COMPLETED
                  </span>
                ) : isTerminatedTabSwitch ? (
                  <span className="stage5-tag-required" style={{ background: "#FEE2E2", color: "#B91C1C", border: "1px solid #FCA5A5" }}>
                    <i className="fa-solid fa-triangle-exclamation"></i> TAB SWITCH AUTO-SUBMITTED
                  </span>
                ) : isMockInProgress ? (
                  <span className="stage5-tag-required" style={{ background: "#FEF3C7", color: "#B45309" }}>
                    IN PROGRESS
                  </span>
                ) : (
                  <span className="stage5-tag-required">REQUIRED</span>
                )}
              </div>
              <p className="stage5-card-desc">
                {isMockEndedEarly
                  ? `Interview was ended early${mockScore !== null ? ` · Score: ${mockScore}/100` : ""}. You can submit a retake request to Talentera employees to attempt the interview again.`
                  : isMockCompleted
                  ? `Mock interview completed successfully${mockScore !== null ? ` · Score: ${mockScore}/100` : ""}. Verified technical & communication evaluation saved.`
                  : isTerminatedTabSwitch
                  ? "Interview auto-submitted due to browser tab switch anti-cheat violation. Request a retake to have Talentera staff review and approve a new attempt."
                  : "Interactive AI mock interview covering 5 student/fresher topics: Introduction, Education, Skills, Projects, and Career Goals."}
              </p>
            </div>
          </div>

          {isMockEndedEarly || isTerminatedTabSwitch ? (
            retakeRequest?.status === "PENDING" ? (
              <button
                type="button"
                disabled
                className="stage5-action-btn"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1.5px solid #F59E0B",
                  color: "#B45309",
                  cursor: "not-allowed",
                }}
              >
                <i className="fa-solid fa-hourglass-half"></i>
                <span>RETAKE PENDING</span>
              </button>
            ) : (
              <button
                type="button"
                className="stage5-action-btn"
                onClick={() => {
                  setRetakeError("");
                  setShowRetakeModal(true);
                }}
                style={{
                  background: "linear-gradient(135deg, #F59E0B 0%, #D97706 100%)",
                  boxShadow: "0 4px 14px rgba(217, 119, 6, 0.35)",
                }}
              >
                <i className="fa-solid fa-rotate-right"></i>
                <span>REQUEST RETAKE</span>
              </button>
            )
          ) : isMockCompleted ? (
            retakeRequest?.status === "PENDING" ? (
              <button
                type="button"
                disabled
                className="stage5-action-btn"
                style={{
                  background: "rgba(245, 158, 11, 0.15)",
                  border: "1.5px solid #F59E0B",
                  color: "#B45309",
                  cursor: "not-allowed",
                }}
              >
                <i className="fa-solid fa-hourglass-half"></i>
                <span>RETAKE PENDING</span>
              </button>
            ) : (
              <button
                type="button"
                className="stage5-action-btn"
                onClick={() => {
                  setRetakeError("");
                  setShowRetakeModal(true);
                }}
                style={{
                  background: "#F1F5F9",
                  border: "1.5px solid #CBD5E1",
                  color: "#0A1F3D",
                  fontWeight: 800,
                }}
              >
                <i className="fa-solid fa-rotate-right"></i>
                <span>REQUEST RETAKE</span>
              </button>
            )
          ) : isMockInProgress ? (
            <button type="button" className="stage5-action-btn" onClick={() => setMode("start_mock")}>
              <i className="fa-solid fa-play"></i>
              <span>RESUME MOCK</span>
            </button>
          ) : (
            <button type="button" className="stage5-action-btn" onClick={() => setMode("start_mock")}>
              <i className="fa-solid fa-play"></i>
              <span>START MOCK</span>
            </button>
          )}
        </div>
      </div>

      {/* Retake Request Notification Banner if submitted */}
      {retakeSuccessMsg && (
        <div style={{ margin: "20px 0 0", background: "#ECFDF5", border: "1px solid #10B981", color: "#065F46", padding: "12px 18px", borderRadius: 12, fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-circle-check" style={{ color: "#10B981", fontSize: 16 }}></i>
          <span>{retakeSuccessMsg}</span>
        </div>
      )}

      {/* Footer / Gated Next Progression */}
      <div className="stage5-footer">
        <div className="stage5-footer-msg">
          {bothCompleted ? (
            <span style={{ color: "#15803D", fontWeight: 700 }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
              Both assessments completed successfully! You can proceed to the next stage.
            </span>
          ) : (
            <span style={{ color: "#64748B" }}>
              <i className="fa-solid fa-lock" style={{ marginRight: 6 }}></i>
              Complete both the 60s Self-Introduction and AI Mock Interview to unlock the next stage.
            </span>
          )}
        </div>

        {bothCompleted ? (
          <button type="button" className="stage5-next-btn" onClick={handleProceedToStage6}>
            <span>Continue to Stage 06 (Live Charts)</span>
            <i className="fa-solid fa-arrow-right"></i>
          </button>
        ) : (
          <button type="button" className="stage5-locked-btn" disabled>
            <i className="fa-solid fa-lock"></i>
            <span>Complete Both to Unlock Next</span>
          </button>
        )}
      </div>

      {/* RETAKE REQUEST MODAL */}
      {showRetakeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 21, 42, 0.8)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#081B33",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
            padding: 24,
            color: "#F8FAFC",
            fontFamily: "inherit",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245, 180, 26, 0.2)", border: "1px solid #F5B41A", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C95B", fontSize: 16 }}>
                  <i className="fa-solid fa-rotate-right"></i>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}>
                    Request AI Mock Interview Retake
                  </h4>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    Stage 5 Mock Assessment
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.55, margin: "0 0 16px" }}>
              Please describe the reason for your retake request (e.g. accidentally ended early, microphone issue, network glitch, emergency). Your request will be submitted to Talentera staff for review and approval.
            </p>

            <form onSubmit={handleSubmitRetakeRequest}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F5C95B", marginBottom: 6 }}>
                  Reason for Retake Request *
                </label>
                <textarea
                  rows={4}
                  value={retakeReason}
                  onChange={(e) => setRetakeReason(e.target.value)}
                  placeholder="Explain why you are requesting a retake (e.g. ended interview early by mistake, wanted to re-record answers)..."
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  disabled={submittingRetake}
                />
              </div>

              {retakeError && (
                <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #EF4444", color: "#FCA5A5", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                  {retakeError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowRetakeModal(false)}
                  disabled={submittingRetake}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.8)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRetake || !retakeReason.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                    color: "#06152A",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: submittingRetake || !retakeReason.trim() ? "not-allowed" : "pointer",
                    opacity: submittingRetake || !retakeReason.trim() ? 0.6 : 1,
                  }}
                >
                  {submittingRetake ? "Submitting Request…" : "Submit to Talentera Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
