import React from "react";
import { Link } from "react-router-dom";
import { WIZARD_STAGES } from "../data/wizardStages";

const STAGE_ICONS = {
  user: <i className="fa-solid fa-user"></i>,
  book: <i className="fa-solid fa-book-open"></i>,
  award: <i className="fa-solid fa-award"></i>,
  clip: <i className="fa-solid fa-clipboard-list"></i>,
  video: <i className="fa-solid fa-video"></i>,
  activity: <i className="fa-solid fa-chart-simple"></i>,
  trend: <i className="fa-solid fa-chart-line"></i>,
};

export default function WizardSidebar({ completedStages, activeStageId, onSelect, earnedPoints, onSubmit, onSaveExit }) {
  const earnedPct = Math.round((earnedPoints / 100) * 100);

  const isStage1Done = completedStages.includes(1);

  return (
    <aside className="wiz-sidebar">
      <div className="wiz-sidebar-brand">
        <img src="/logo.png" alt="Talentera" style={{ height: 28, width: "auto" }} />
      </div>

      <div className="wiz-progress-strip">
        <div className="wiz-progress-eyebrow">YOUR VERIFICATION SCORE</div>
        <div className="wiz-progress-num">{earnedPoints} <span>/ 100 POINTS</span></div>
        <div className="wiz-progress-bar-track">
          <div className="wiz-progress-bar-fill" style={{ width: `${earnedPct}%` }} />
        </div>
      </div>

      <nav className="wiz-nav-list">
        {WIZARD_STAGES.map((s) => {
          const isDone = completedStages.includes(s.num);
          const isActive = activeStageId === s.num;
          const isLocked = s.num > 1 && !isStage1Done;

          return (
            <button
              key={s.num}
              type="button"
              className={`wiz-nav-item ${isActive ? "active" : ""} ${isDone ? "complete" : ""} ${isLocked ? "locked" : ""}`}
              style={{
                "--st-1": s.theme.p1,
                "--st-2": s.theme.p2,
                opacity: isLocked ? 0.55 : 1,
                cursor: isLocked ? "not-allowed" : "pointer"
              }}
              title={isLocked ? "Complete Stage 1 to unlock this stage" : ""}
              onClick={() => onSelect(s.num)}
            >
              <span className="wiz-nav-item-icon">{isDone ? <i className="fa-solid fa-check"></i> : isLocked ? <i className="fa-solid fa-lock"></i> : STAGE_ICONS[s.icon] || "•"}</span>
              <span className="wiz-nav-item-info">
                <span className="wiz-nav-item-num">STAGE 0{s.num} {isLocked ? "(LOCKED)" : ""}</span>
                <span className="wiz-nav-item-title">{s.short}</span>
              </span>
              <span className="wiz-nav-item-pts">+{s.pts}</span>
            </button>
          );
        })}
      </nav>

      <div className="wiz-sidebar-foot">
        <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onSubmit}>
          Submit for verification →
        </button>
        <Link
          to="/jobs"
          className="btn btn-ghost"
          style={{ width: "100%", justifyContent: "center", color: "#fff", borderColor: "rgba(255,255,255,0.3)", textDecoration: "none", boxSizing: "border-box" }}
        >
          Browse open jobs
        </Link>
        <button type="button" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onSaveExit}>
          Save & exit
        </button>
      </div>
    </aside>
  );
}
