import React from "react";
import { HIRING_TICKER, HIRING_COMPANIES, RCM_INDUSTRY_STATS } from "../data/hiringCompanies";

const STAGE_ICONS = {
  user: "👤", book: "📘", award: "🏅", clip: "📋", video: "🎥", activity: "📊", trend: "📈",
};

const RULE_ICONS = { why: "❓", check: "✅", eye: "👁", lock: "🔒" };

export default function WizardStagePane({ stage, isDone, children, onPrev, prevNum }) {
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
            <strong>{HIRING_TICKER.companiesHiring}</strong> companies hiring · <strong>{HIRING_TICKER.openRoles}</strong> open roles
          </div>
          <div className="wiz-rail-ticker-foot">Last hire from pool: <strong>{HIRING_TICKER.lastHire}</strong></div>
        </div>

        <div className="wiz-rail-context">
          <div className="wiz-rail-eyebrow">WHY THIS STAGE MATTERS</div>
          <p>{stage.context}</p>
        </div>

        <div className="wiz-rail-section-head">
          <span>HIRING RIGHT NOW</span>
          <a href="#" onClick={(e) => e.preventDefault()}>See all {HIRING_TICKER.companiesHiring} →</a>
        </div>
        <div className="wiz-rail-companies">
          {HIRING_COMPANIES.map((c) => (
            <div className="wiz-rail-company" key={c.name}>
              <div className="wiz-rail-company-avatar" style={{ background: c.gradient }}>{c.initial}</div>
              <div className="wiz-rail-company-body">
                <div className="wiz-rail-company-name">
                  {c.name} {c.hot && <span className="wiz-rail-hot">🔥 Hot</span>}
                </div>
                <div className="wiz-rail-company-meta">{c.location} · {c.salary}</div>
                <div className="wiz-rail-company-tags">
                  {c.tags.map((t) => <span key={t} className="wiz-rail-tag">{t}</span>)}
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
            {RCM_INDUSTRY_STATS.map((s) => (
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
