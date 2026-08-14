import React from "react";
import { WIZARD_STAGES } from "../data/wizardStages";

const STAGE_ICONS = {
  user: "👤",
  book: "📘",
  award: "🏅",
  clip: "📋",
  video: "🎥",
  activity: "📊",
  trend: "📈",
};

export default function WizardSidebar({ completedStages, activeStageId, onSelect, earnedPoints, onSubmit, onSaveExit }) {
  const earnedPct = Math.round((earnedPoints / 100) * 100);

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
          return (
            <button
              key={s.num}
              type="button"
              className={`wiz-nav-item ${isActive ? "active" : ""} ${isDone ? "complete" : ""}`}
              style={{ "--st-1": s.theme.p1, "--st-2": s.theme.p2 }}
              onClick={() => onSelect(s.num)}
            >
              <span className="wiz-nav-item-icon">{isDone ? "✓" : STAGE_ICONS[s.icon] || "•"}</span>
              <span className="wiz-nav-item-info">
                <span className="wiz-nav-item-num">STAGE 0{s.num}</span>
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
        <button type="button" className="btn btn-ghost" style={{ width: "100%", justifyContent: "center", color: "#fff", borderColor: "rgba(255,255,255,0.3)" }} onClick={onSaveExit}>
          Save & exit
        </button>
      </div>
    </aside>
  );
}
