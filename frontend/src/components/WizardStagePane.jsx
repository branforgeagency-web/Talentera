import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { HIRING_TICKER, HIRING_COMPANIES, RCM_INDUSTRY_STATS } from "../data/hiringCompanies";

const STAGE_ICONS = {
  user: <i className="fa-solid fa-user"></i>,
  book: <i className="fa-solid fa-book-open"></i>,
  award: <i className="fa-solid fa-award"></i>,
  clip: <i className="fa-solid fa-clipboard-list"></i>,
  video: <i className="fa-solid fa-video"></i>,
  activity: <i className="fa-solid fa-chart-simple"></i>,
  trend: <i className="fa-solid fa-chart-line"></i>,
};

const RULE_ICONS = {
  why: <i className="fa-solid fa-circle-question"></i>,
  check: <i className="fa-solid fa-circle-check"></i>,
  eye: <i className="fa-solid fa-eye"></i>,
  lock: <i className="fa-solid fa-lock"></i>
};

export default function WizardStagePane({ stage, isDone, children, onPrev, prevNum }) {
  const navigate = useNavigate();
  const [ticker, setTicker] = useState(HIRING_TICKER);
  const [companies, setCompanies] = useState(HIRING_COMPANIES);
  const [industryStats, setIndustryStats] = useState(RCM_INDUSTRY_STATS);

  useEffect(() => {
    let isMounted = true;
    api
      .get("/public/hiring-activity")
      .then((res) => {
        if (!isMounted || !res.data) return;
        if (res.data.ticker) setTicker(res.data.ticker);
        if (Array.isArray(res.data.companies) && res.data.companies.length > 0) {
          setCompanies(res.data.companies);
        }
        if (Array.isArray(res.data.industryStats) && res.data.industryStats.length > 0) {
          setIndustryStats(res.data.industryStats);
        }
      })
      .catch((err) => {
        // Graceful fallback to verified industry defaults on network error
        console.debug("Hiring activity live sync fallback:", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="wiz-layout-main">
      <main className="wiz-content" style={{ "--st-1": stage.theme.p1, "--st-2": stage.theme.p2 }}>
        <section className="wiz-hero">
          <div className="wiz-hero-icon">{STAGE_ICONS[stage.icon] || "•"}</div>
          <div className="wiz-hero-pills">
            <span className="wiz-meta-pill">STAGE 0{stage.num} OF 08 {!isDone && "· ACTIVE"}</span>
            <span className="wiz-meta-pill wiz-meta-pill-pts">+{stage.pts} POINTS</span>
            <span className="wiz-meta-pill">~{stage.mins} MIN</span>
            {isDone && <span className="wiz-meta-pill wiz-meta-pill-done">✓ COMPLETED</span>}
          </div>
          <h1 className="wiz-hero-title">{stage.long}</h1>
          <p className="wiz-hero-intro">{stage.intro}</p>
          <div className="wiz-trust-strip">
            {stage.trustChips.map((t) => (
              <div className="wiz-trust-chip" key={t.label}>
                <div className="wiz-trust-chip-num">{t.num}</div>
                <div className="wiz-trust-chip-label">{t.label}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="wiz-rules">
          <div className="wiz-rules-head">
            <div className="wiz-rules-title">Rules &amp; Regulations · Stage 0{stage.num}</div>
            <div className="wiz-rules-sub">WHY THIS EXISTS · WHAT WE VERIFY · WHAT COMPANIES SEE</div>
          </div>
          <div className="wiz-rule-list">
            {stage.rules.map((r) => (
              <div className="wiz-rule" key={r.title}>
                <span className={`wiz-rule-icon wiz-rule-icon-${r.type}`}>{RULE_ICONS[r.type]}</span>
                <div>
                  <div className="wiz-rule-title">{r.title}</div>
                  <div className="wiz-rule-body">{r.body}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="wiz-form-panel">
          <div className="wiz-form-panel-head">
            <div className="wiz-form-panel-title">Your Stage 0{stage.num} information</div>
            <div className="wiz-form-panel-sub">FILL IN · WE VERIFY · YOU EARN +{stage.pts} POINTS</div>
          </div>
          {children}
        </section>

        <div className="wiz-foot">
          {prevNum ? (
            <button type="button" className="btn btn-ghost" onClick={() => onPrev(prevNum)}>← Previous</button>
          ) : <span />}
          <span className="wiz-foot-note">You can jump to any stage from the sidebar at any time.</span>
        </div>
      </main>

      <aside className="wiz-companies-rail">
        <div className="wiz-rail-ticker">
          <span className="wiz-rail-dot" /> LIVE HIRING ACTIVITY
          <div className="wiz-rail-ticker-stats">
            <strong>{ticker.companiesHiring}</strong> {ticker.companiesHiring === 1 ? "company" : "companies"} hiring · <strong>{ticker.openRoles}</strong> open {ticker.openRoles === 1 ? "role" : "roles"}
          </div>
          <div className="wiz-rail-ticker-foot">Last hire from pool: <strong>{ticker.lastHire}</strong></div>
        </div>

        <div className="wiz-rail-context">
          <div className="wiz-rail-eyebrow">WHY THIS STAGE MATTERS</div>
          <p>{stage.context}</p>
        </div>

        <div className="wiz-rail-section-head">
          <span>HIRING RIGHT NOW</span>
          <Link to="/jobs" style={{ textDecoration: "none", color: "inherit", fontWeight: 600 }}>
            See all {ticker.companiesHiring} →
          </Link>
        </div>
        <div className="wiz-rail-companies">
          {companies.map((c) => (
            <div
              className="wiz-rail-company"
              key={c.name}
              onClick={() => navigate("/jobs")}
              style={{ cursor: "pointer" }}
              title="Click to explore open positions"
            >
              <div className="wiz-rail-company-avatar" style={{ background: c.gradient }}>{c.initial}</div>
              <div className="wiz-rail-company-body">
                <div className="wiz-rail-company-name">
                  {c.name} {c.hot && <span className="wiz-rail-hot"><i className="fa-solid fa-fire"></i> Hot</span>}
                </div>
                <div className="wiz-rail-company-meta">{c.location} · {c.salary}</div>
                <div className="wiz-rail-company-tags">
                  {c.tags && c.tags.map((t) => <span key={t} className="wiz-rail-tag">{t}</span>)}
                  <span className="wiz-rail-tag wiz-rail-tag-roles">{c.openRoles} roles</span>
                </div>
                <div className="wiz-rail-company-note">{c.note}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="wiz-rail-industry">
          <div className="wiz-rail-eyebrow">WHY RCM HIRING IS HOT</div>
          <div className="wiz-rail-industry-grid">
            {industryStats.map((s) => (
              <div key={s.label}>
                <div className="wiz-rail-industry-val">{s.value}</div>
                <div className="wiz-rail-industry-label">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </aside>
    </div>
  );
}

