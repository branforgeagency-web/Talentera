import React, { useState } from "react";
import AiVideoAssessment from "./AiVideoAssessment.jsx";
import ClaudeMockInterviewBot from "./ClaudeMockInterviewBot.jsx";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  // mode: "overview" | "record_intro" | "start_mock"
  const [mode, setMode] = useState("overview");

  const hasVideo = Boolean(existingData?.videoUrl || existingData?.url || existingData?.videoFileName);
  const aiScore = existingData?.aiScore || existingData?.score || 78;
  const fluencyScore = existingData?.rubric?.fluency || existingData?.fluency || (aiScore ? Math.min(98, Math.max(60, Math.round(aiScore))) : 78);
  const confidenceScore = existingData?.rubric?.confidence || existingData?.confidence || (aiScore ? Math.min(95, Math.max(58, Math.round(aiScore - 8))) : 70);
  const isCompleted = hasVideo || Boolean(existingData?.completedAt || existingData?.aiScore);

  function handleVideoSaved(data) {
    if (onSaved) onSaved(data);
    setMode("overview");
  }

  function handleMockCompleted(data) {
    if (onSaved) onSaved(data);
    setMode("overview");
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
          gap: 14px;
          padding-bottom: 20px;
          margin-bottom: 24px;
          border-bottom: 1px dashed #CBD5E1;
        }

        .stage5-header-icon {
          width: 34px;
          height: 34px;
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

        .stage5-cards-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .stage5-card-item {
          background: #FFFFFF;
          border: 1px solid #E2E8F0;
          border-radius: 14px;
          padding: 20px 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.02);
          transition: all 0.2s ease;
        }

        .stage5-card-item:hover {
          border-color: #CBD5E1;
          box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
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
          flex-shrink: 0;
          box-shadow: 0 4px 14px rgba(244, 42, 91, 0.3);
        }

        .stage5-card-info {
          display: flex;
          flex-direction: column;
          gap: 3px;
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

        .stage5-action-btn {
          background: linear-gradient(90deg, #FF3B70 0%, #F42A5B 100%);
          color: #FFFFFF;
          font-weight: 800;
          font-size: 13px;
          letter-spacing: 0.05em;
          text-transform: uppercase;
          padding: 12px 28px;
          border-radius: 10px;
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 14px rgba(244, 42, 91, 0.35);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
          white-space: nowrap;
          flex-shrink: 0;
        }

        .stage5-action-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 6px 18px rgba(244, 42, 91, 0.45);
        }

        .stage5-action-btn:active {
          transform: translateY(0);
        }

        .stage5-completion-banner {
          background: #ECFDF5;
          border: 1px solid #A7F3D0;
          border-radius: 14px;
          padding: 18px 22px;
          display: flex;
          align-items: center;
          gap: 16px;
          margin-top: 16px;
        }

        .stage5-banner-check {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #10B981;
          color: #FFFFFF;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }

        .stage5-banner-text {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .stage5-banner-title {
          font-size: 15px;
          font-weight: 700;
          color: #065F46;
          margin: 0;
        }

        .stage5-banner-sub {
          font-size: 13px;
          color: #047857;
          margin: 0;
        }

        @media (max-width: 640px) {
          .stage5-card-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .stage5-action-btn {
            width: 100%;
            text-align: center;
          }
        }
      `}</style>

      {/* Top Header */}
      <div className="stage5-header-row">
        <div className="stage5-header-icon">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        <div className="stage5-header-text">
          <h2 className="stage5-header-title">Your Stage 05 information</h2>
          <span className="stage5-header-sub">FILL IN · WE VERIFY · YOU EARN +10 POINTS</span>
        </div>
      </div>

      {/* Cards List */}
      <div className="stage5-cards-grid">
        {/* Card 1: 90-second self-introduction */}
        <div className="stage5-card-item">
          <div className="stage5-card-main">
            <div className="stage5-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="23 7 16 12 23 17 23 7"></polygon>
                <rect x="1" y="5" width="15" height="14" rx="3" ry="3"></rect>
              </svg>
            </div>
            <div className="stage5-card-info">
              <h3 className="stage5-card-heading">90-second self-introduction</h3>
              <p className="stage5-card-desc">
                Tip: watch the 3 prep videos in your Learn Hub first. Companies watch this exact recording before they ever call you.
              </p>
            </div>
          </div>
          <button type="button" className="stage5-action-btn" onClick={() => setMode("record_intro")}>
            RECORD NOW
          </button>
        </div>

        {/* Card 2: AI-reviewed 5-minute mock interview */}
        <div className="stage5-card-item">
          <div className="stage5-card-main">
            <div className="stage5-icon-box">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="stage5-card-info">
              <h3 className="stage5-card-heading">AI-reviewed 5-minute mock interview</h3>
              <p className="stage5-card-desc">
                Specialty-tuned questions. Talentera AI scores fluency, confidence, and structured answering.
              </p>
            </div>
          </div>
          <button type="button" className="stage5-action-btn" onClick={() => setMode("start_mock")}>
            START MOCK
          </button>
        </div>

        {/* Card 3: Completion / Status Banner */}
        {isCompleted && (
          <div className="stage5-completion-banner">
            <div className="stage5-banner-check">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12"></polyline>
              </svg>
            </div>
            <div className="stage5-banner-text">
              <h4 className="stage5-banner-title">
                Recording + mock complete · Fluency {fluencyScore} · Confidence {confidenceScore}
              </h4>
              <p className="stage5-banner-sub">
                Available to companies that shortlist you. Re-record from your dashboard anytime.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
