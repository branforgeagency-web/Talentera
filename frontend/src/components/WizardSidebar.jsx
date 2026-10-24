import React, { useEffect, useRef } from "react";
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

function isStageUnlocked(stageNum, completedStages = [], isSelfTrained = false) {
  if (stageNum <= 1) return true;
  for (let i = 1; i < stageNum; i++) {
    if (isSelfTrained && i === 6) continue;
    if (!completedStages.includes(i)) {
      return false;
    }
  }
  return true;
}

export default function WizardSidebar({ completedStages = [], activeStageId, onSelect, earnedPoints, onSubmit, onSaveExit, onViewDashboard, isSelfTrained = false, hiddenStages = [], bonusStages = [], stageScores = null, experienced = false }) {
  const earnedPct = Math.round((earnedPoints / 100) * 100);
  const navRef = useRef(null);

  // Keep the active stage highlighted AND in view without manual scrolling.
  useEffect(() => {
    const nav = navRef.current;
    if (!nav) return undefined;
    const t = setTimeout(() => {
      const el = nav.querySelector(".wiz-nav-item.active");
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "smooth" });
      }
    }, 50);
    return () => clearTimeout(t);
  }, [activeStageId, hiddenStages.length, completedStages.length]);

  // Points chip: the real server-awarded points once a stage is done (so the sidebar always matches
  // the Live Profile breakdown); before that, the points on offer. Certification is 15 pending
  // verification / 20 once verified (40 for experienced), so it shows the range.
  const ptsLabel = (st, done) => {
    const earned = stageScores && typeof stageScores === "object" ? Number(stageScores[st.num]) : NaN;
    if (bonusStages.includes(st.num)) return done && earned > 0 ? `+${earned} BONUS` : "BONUS";
    if (done && Number.isFinite(earned) && st.pts > 0) return `+${earned}`;
    if (st.num === 3) return experienced ? "+30–40" : "+15–20";
    return st.pts > 0 ? `+${st.pts}` : "0";
  };

  return (
    <aside className="wiz-sidebar">
      <div className="wiz-sidebar-brand">
        <img src="/logo-white.png" alt="Talentera" style={{ height: 28, width: "auto" }} />
      </div>

      <div className="wiz-progress-strip">
        <div className="wiz-progress-eyebrow">YOUR VERIFICATION SCORE</div>
        <div className="wiz-progress-num">{earnedPoints} <span>/ 100 POINTS</span></div>
        <div className="wiz-progress-bar-track">
          <div className="wiz-progress-bar-fill" style={{ width: `${earnedPct}%` }} />
        </div>
      </div>

      <nav className="wiz-nav-list" ref={navRef}>
        {WIZARD_STAGES.filter((s) => !hiddenStages.includes(s.num)).map((s, visIdx) => {
          // Sequential label numbers: if a stage is hidden (e.g. Stage 4 for experienced candidates)
          // the following stages shift up so the list reads 01, 02, 03, 04...
          const dispNum = visIdx + 1;
          const isDone = completedStages.includes(s.num);
          const isOptional = s.num === 6 && isSelfTrained;
          const isUnlocked = isStageUnlocked(s.num, completedStages, isSelfTrained) || isDone;
          const isLocked = !isUnlocked;
          const isActive = activeStageId === s.num;

          return (
            <button
              key={s.num}
              type="button"
              className={`wiz-nav-item ${isActive ? "active" : ""} ${isDone ? "complete" : ""} ${isLocked ? "locked" : ""}`}
              style={{
                "--st-1": s.theme.p1,
                "--st-2": s.theme.p2,
                opacity: isLocked ? 0.45 : 1,
                cursor: isLocked ? "not-allowed" : "pointer"
              }}
              title={isLocked ? `Complete the previous stage first to unlock Stage 0${dispNum}` : (isDone ? `Stage 0${dispNum} Completed (Click to review/edit)` : (isOptional ? `Stage 0${dispNum} Optional for Self-Trained` : `Stage 0${dispNum} Active`))}
              onClick={() => onSelect(s.num)}
            >
              <span className="wiz-nav-item-icon">{isDone ? <i className="fa-solid fa-check"></i> : isLocked ? <i className="fa-solid fa-lock"></i> : STAGE_ICONS[s.icon] || "•"}</span>
              <span className="wiz-nav-item-info">
                <span className="wiz-nav-item-num">STAGE 0{dispNum} {isLocked ? "(LOCKED)" : (isDone ? "✓ DONE" : (isOptional ? "· OPTIONAL" : ""))}</span>
                <span className="wiz-nav-item-title">{s.short}</span>
              </span>
              <span className="wiz-nav-item-pts">{ptsLabel(s, isDone)}</span>
            </button>
          );
        })}
      </nav>

      <div className="wiz-sidebar-foot">
        {onViewDashboard && (
          <button
            type="button"
            className="btn btn-navy-ghost"
            style={{ width: "100%", justifyContent: "center", fontWeight: 700 }}
            onClick={onViewDashboard}
          >
            ← Back to My Dashboard
          </button>
        )}
        <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={onSubmit}>
          Submit for verification →
        </button>
        <Link
          to="/jobs"
          className="btn btn-navy-ghost"
          style={{ width: "100%", justifyContent: "center", textDecoration: "none", boxSizing: "border-box" }}
        >
          Browse open jobs
        </Link>
        <button type="button" className="btn btn-navy-ghost" style={{ width: "100%", justifyContent: "center" }} onClick={onSaveExit}>
          <i className="fa-solid fa-floppy-disk" style={{ marginRight: 6 }}></i> Save &amp; finish later
        </button>
      </div>
    </aside>
  );
}
