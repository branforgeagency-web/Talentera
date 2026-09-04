import React, { useState, useEffect } from "react";
import api from "../api/client";
import AiVideoAssessment from "./AiVideoAssessment.jsx";
import ClaudeMockInterviewBot from "./ClaudeMockInterviewBot.jsx";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  // mode: "overview" | "record_intro" | "start_mock"
  const [mode, setMode] = useState("overview");
  const [mockSession, setMockSession] = useState(null);
  const [loadingMockState, setLoadingMockState] = useState(true);

  // Fetch the latest mock interview session state from backend
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
    existingData?.aiInterview?.status === "COMPLETED" ||
    existingData?.mockInterviewCompleted ||
    existingData?.stage5?.mockInterviewCompleted
  );

  const isMockInProgress = Boolean(mockSession?.status === "IN_PROGRESS");
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

  async function handleProceedToStage6() {
    if (!bothCompleted) return;
    try {
      // Deliberately NOT sending videoUrl/aiScore here: the real self-intro
      // video + score were already saved by AiVideoAssessment's own call to
      // /candidate/ai-video/assess (or the mock interview's own save) before
      // this ever runs. The backend does a raw shallow merge on stage5
      // (`{...existing, ...req.body}`), so sending a placeholder fallback
      // value here would silently overwrite the real recording/score with
      // fake data if `existingData` hasn't been refreshed yet with the
      // latest candidate doc. This call's only job is to flip the two
      // completion flags so the wizard can advance.
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

  if (mode === "start_mock") {
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
        <ClaudeMockInterviewBot candidateData={existingData} onCompleted={handleMockCompleted} />
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
        {/* Card 1: 90-second self-introduction */}
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
                <h3 className="stage5-card-heading">1. 90-Second Self-Introduction</h3>
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
                  ? "Self-introduction recorded and waiting for verification."
                  : "Tip: watch the prep guidelines first. Companies watch this exact recording before shortlisting."}
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
              <span>RECORD NOW</span>
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
                {isMockCompleted ? (
                  <span className="stage5-tag-completed">
                    <i className="fa-solid fa-circle-check"></i> COMPLETED
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
                {isMockCompleted
                  ? `Mock interview complete${mockScore !== null ? ` · Score: ${mockScore}/100` : ""}. Click View Score to inspect feedback.`
                  : "Interactive AI mock interview covering 5 student/fresher topics: Introduction, Education, Skills, Projects, and Career Goals."}
              </p>
            </div>
          </div>

          {isMockCompleted ? (
            <button type="button" className="stage5-view-score-btn" onClick={() => setMode("start_mock")}>
              <i className="fa-solid fa-chart-simple"></i>
              <span>VIEW SCORE</span>
            </button>
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
              Complete both the 90s Self-Introduction and AI Mock Interview to unlock the next stage.
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
    </div>
  );
}
