import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import {
  ONBOARDING_STAGES,
  STAGE_BANNERS,
  STAGE_COLORS,
  TOTAL_FIELDS,
  stageDoneFields,
  stageTotalFields,
} from "../data/companyOnboardingStages";
import OnboardingField from "../components/company/OnboardingField.jsx";

export default function CompanyDashboardSetup() {
  const navigate = useNavigate();
  const { company: authCompany, logout } = useCompanyAuth();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStageId, setActiveStageId] = useState("1a");
  const [missingFields, setMissingFields] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);

  useEffect(() => {
    companyApi
      .get("/company/me")
      .then((res) => setCompany(res.data.company))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !company) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        Loading your company account…
      </div>
    );
  }

  const activeStage = ONBOARDING_STAGES.find((s) => s.id === activeStageId);
  const banner = STAGE_BANNERS[activeStageId];
  const activeData = company[`stage${activeStageId}`] || {};

  const totalDone = ONBOARDING_STAGES.reduce((sum, s) => sum + stageDoneFields(s.id, company[`stage${s.id}`]), 0);
  const overallPct = Math.round((totalDone / TOTAL_FIELDS) * 100);

  async function saveField(itemId, value) {
    const res = await companyApi.put(`/company/stage/${activeStageId}`, { [itemId]: value });
    setCompany(res.data.company);
  }

  function goToStage(id) {
    setActiveStageId(id);
    setMissingFields(null);
    setPreviewOpen(false);
  }

  function handleJdButtonClick() {
    const stage9 = company.stage9 || {};
    const mustItems = ONBOARDING_STAGES.find((s) => s.id === "9").items.filter((i) => i.tag === "must");
    const missing = mustItems.filter((i) => {
      const v = stage9[i.id];
      if (v === undefined || v === null) return true;
      if (typeof v === "string") return v.trim() === "";
      if (Array.isArray(v)) return v.length === 0;
      return false;
    });
    if (missing.length > 0) {
      setMissingFields(missing.map((i) => i.name));
      return;
    }
    setPreviewOpen(true);
  }

  async function confirmPublish() {
    setPublishing(true);
    try {
      const res = await companyApi.post("/company/publish-jd");
      setCompany(res.data.company);
      setPreviewOpen(false);
      setPublishSuccess(true);
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't publish the JD.", "!");
    } finally {
      setPublishing(false);
    }
  }

  const contactName = (authCompany?.contactName || company.contactName || "there").split(" ")[0];
  const companyName = authCompany?.companyName || company.companyName || "your company";

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)", fontFamily: "var(--font-body)" }}>
      {/* TOP STICKY DASHBOARD NAV */}
      <header className="conb-topnav">
        <div className="conb-topnav-brand" onClick={() => navigate("/")}>
          <svg width="36" height="36" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E" />
            <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF" />
            <path d="M32 8L46 18H32V8Z" fill="#F5C95B" />
          </svg>
          <div>
            <div className="conb-topnav-name">TALENT<span style={{ color: "var(--gold)" }}>ERA</span></div>
            <div className="conb-topnav-tag">COMPANY DASHBOARD</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="conb-topnav-user">
            <span className="conb-topnav-dot" />
            <span><strong style={{ color: "var(--gold)" }}>{contactName}</strong> · {companyName}</span>
          </div>
          <button
            className="conb-topnav-logout"
            onClick={() => {
              logout();
              navigate("/companies");
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* WELCOME BANNER */}
      <section className="conb-hero">
        <div className="conb-hero-inner">
          <div className="conb-hero-eyebrow">
            <span className="conb-hero-eyebrow-dot" />
            {company.jdPublished ? "JOB LIVE · SETUP IN PROGRESS" : "ACCOUNT CREATED · SETUP IN PROGRESS"}
          </div>

          <h1 className="conb-hero-title">
            Welcome, <span className="gold-italic">{contactName}</span> — let's get{" "}
            <span className="gold-italic">{companyName}</span> hiring.
          </h1>

          <p className="conb-hero-sub">
            Complete your profile to unlock the full verified candidate pool. Most companies finish in{" "}
            <strong style={{ color: "var(--gold-light)" }}>~12 minutes</strong>. Your data is encrypted, never shared with competitors.
          </p>

          <div className="conb-hero-stats">
            <div>
              <div className="conb-hero-stat-val">{overallPct}%</div>
              <div className="conb-hero-stat-label">PROFILE COMPLETE</div>
            </div>
            <div>
              <div className="conb-hero-stat-val">{totalDone}/{TOTAL_FIELDS}</div>
              <div className="conb-hero-stat-label">FIELDS SAVED</div>
            </div>
            <div>
              <div className="conb-hero-stat-val">{company.jdPublished ? "LIVE" : "DRAFT"}</div>
              <div className="conb-hero-stat-label">FIRST JD STATUS</div>
            </div>
            <div>
              <div className="conb-hero-stat-val">12,480</div>
              <div className="conb-hero-stat-label">CANDIDATES WAITING</div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div className="conb-workspace">
        {/* LEFT SIDEBAR */}
        <aside className="conb-sidebar">
          <div className="conb-sidebar-eyebrow">ONBOARDING</div>
          <h2 className="conb-sidebar-title">
            Register yourself with <span style={{ color: "var(--gold)" }}>Talentera</span>
          </h2>

          <div className="conb-sidebar-progress">
            <div className="conb-sidebar-progress-row">
              <span style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontWeight: 800 }}>{overallPct}%</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>{totalDone} of {TOTAL_FIELDS} done</span>
            </div>
            <div className="conb-sidebar-progress-track">
              <div className="conb-sidebar-progress-fill" style={{ width: `${overallPct}%` }} />
            </div>
          </div>

          <div className="conb-sidebar-section-label">SECTIONS</div>

          <div className="conb-stage-list">
            {ONBOARDING_STAGES.map((st) => {
              const isActive = activeStageId === st.id;
              const done = stageDoneFields(st.id, company[`stage${st.id}`]);
              const total = stageTotalFields(st.id);
              const isLive = st.id === "9" && company.jdPublished;
              return (
                <div
                  key={st.id}
                  onClick={() => goToStage(st.id)}
                  className={`conb-stage-item ${isActive ? "conb-stage-item-active" : ""}`}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div className="conb-stage-badge" style={{ background: isActive ? "var(--gold)" : "rgba(255,255,255,0.1)", color: isActive ? "var(--navy-deep)" : "#fff" }}>
                      {st.key}
                    </div>
                    <div>
                      <div className="conb-stage-item-title">{st.name}</div>
                      <div className="conb-stage-item-status">{isLive ? "JOB LIVE ✓" : `${done} of ${total} done`}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: isActive ? "var(--gold)" : "rgba(255,255,255,0.3)" }}>›</div>
                </div>
              );
            })}
          </div>

          <div className="conb-legend">
            <div className="conb-legend-title">LEGEND</div>
            <div className="conb-legend-row"><span className="conb-legend-dot" style={{ background: "#EF4444" }} />MUST · Required to go live</div>
            <div className="conb-legend-row"><span className="conb-legend-dot" style={{ background: "#F59E0B" }} />Optional · Defer to week 2</div>
            <div className="conb-legend-row"><span className="conb-legend-dot" style={{ background: "#94A3B8" }} />Conditional · Only if relevant</div>
          </div>

          <div style={{ textAlign: "center", fontSize: 12 }}>
            <Link to="/companies/directory" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
              Skip for now — Browse candidates →
            </Link>
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE */}
        <main>
          <div className="conb-banner" style={{ "--banner-color": STAGE_COLORS[activeStageId] }}>
            <div className="conb-banner-icon">{banner.icon}</div>
            <div>
              <div className="conb-banner-eyebrow">STAGE {activeStage.key} · WHY THIS MATTERS</div>
              <h3 className="conb-banner-title">{banner.title}</h3>
              <p className="conb-banner-desc">{banner.desc}</p>
              <div className="conb-banner-unlocks">
                {banner.unlocks.map((u) => <span key={u}>✔ {u}</span>)}
              </div>
            </div>
          </div>

          <div className="conb-form-card">
            <div className="conb-form-eyebrow">
              STAGE {activeStage.key} · {stageDoneFields(activeStageId, activeData)}/{stageTotalFields(activeStageId)} COMPLETE
            </div>
            <h2 className="conb-form-title">{activeStage.name}</h2>
            <p className="conb-form-sub">{activeStage.sub}</p>

            {activeStageId === "9" && company.jdPublished && (
              <div className="conb-jd-live-banner">
                <span>✓ JOB POST · LIVE</span>
                <span className="conb-jd-live-id">{company.jobId}</span>
              </div>
            )}

            <div className="conb-field-list">
              {activeStage.items.map((item) => (
                <OnboardingField
                  key={`${activeStageId}-${item.id}`}
                  item={item}
                  value={activeData[item.id]}
                  stageId={activeStageId}
                  onSave={saveField}
                />
              ))}
            </div>

            <div className="conb-form-footer">
              {activeStageId === "9" ? (
                <button type="button" className="conb-cta-btn" onClick={handleJdButtonClick}>
                  {company.jdPublished ? "View live JD →" : "Preview & Publish JD →"}
                </button>
              ) : (
                <button
                  type="button"
                  className="conb-cta-btn"
                  onClick={() => {
                    const idx = ONBOARDING_STAGES.findIndex((s) => s.id === activeStageId);
                    const next = ONBOARDING_STAGES[idx + 1];
                    if (next) goToStage(next.id);
                  }}
                >
                  Continue: {(() => {
                    const idx = ONBOARDING_STAGES.findIndex((s) => s.id === activeStageId);
                    const next = ONBOARDING_STAGES[idx + 1];
                    return next ? `Stage ${next.key}: ${next.name} →` : "Done";
                  })()}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* MISSING FIELDS MODAL */}
      {missingFields && (
        <div className="conb-modal-backdrop" onClick={() => setMissingFields(null)}>
          <div className="conb-modal" onClick={(e) => e.stopPropagation()}>
            <h3>A few required fields are still missing</h3>
            <ul className="conb-modal-list">
              {missingFields.map((f) => <li key={f}>{f}</li>)}
            </ul>
            <button type="button" className="conb-cta-btn" onClick={() => setMissingFields(null)}>
              Got it — let me fill them
            </button>
          </div>
        </div>
      )}

      {/* JD PREVIEW MODAL */}
      {previewOpen && !publishSuccess && (
        <div className="conb-modal-backdrop" onClick={() => setPreviewOpen(false)}>
          <div className="conb-modal conb-modal-wide" onClick={(e) => e.stopPropagation()}>
            <div className="conb-jd-preview-eyebrow">LIVE JOB LISTING PREVIEW</div>
            <h2 className="conb-jd-preview-title">{company.stage9?.roletitle || "Untitled role"}</h2>
            <div className="conb-jd-preview-pills">
              {[company.stage9?.workmode, company.stage9?.shift, company.stage9?.level, company.stage9?.openings ? `${company.stage9.openings} openings` : null, company.stage9?.urgency]
                .filter(Boolean)
                .map((p) => <span key={p} className="conb-jd-pill">{p}</span>)}
            </div>
            <p style={{ fontSize: 13.5, color: "#64748B", margin: "8px 0 20px" }}>
              {companyName} · {company.stage9?.location || "Location not set"}
            </p>

            <div className="conb-jd-preview-section">
              <div className="conb-jd-preview-heading">Required skills &amp; certifications</div>
              <div style={{ fontSize: 13.5, color: "var(--navy)" }}>
                {[...(company.stage9?.certs || []), ...(company.stage9?.reqtools || []), ...(company.stage9?.languages || [])].join(", ") || "None specified"}
              </div>
            </div>

            <div className="conb-jd-preview-section">
              <div className="conb-jd-preview-heading">Must-haves <span className="conb-jd-tag-hardfilter">Hard filter</span></div>
              <div style={{ fontSize: 13.5, color: "var(--navy)" }}>{company.stage9?.musthaves || "—"}</div>
            </div>

            <div className="conb-jd-preview-section">
              <div className="conb-jd-preview-heading">Nice-to-haves <span className="conb-jd-tag-scoreboost">Score boost</span></div>
              <div style={{ fontSize: 13.5, color: "var(--navy)" }}>{company.stage9?.nicetohaves || "—"}</div>
            </div>

            <div className="conb-jd-preview-internal">
              <div className="conb-jd-preview-heading">Internal — visible to your team only</div>
              <div style={{ fontSize: 13, color: "#64748B" }}>
                Hiring manager: {company.stage9?.hiringmanager || "—"} · Urgency: {company.stage9?.urgency || "—"}
                {company.stage9?.panel?.length ? ` · Panel: ${company.stage9.panel.join(", ")}` : ""}
              </div>
            </div>

            <div className="conb-jd-preview-footer">
              <button type="button" className="btn btn-ghost" onClick={() => setPreviewOpen(false)}>← Edit JD</button>
              <button type="button" className="conb-cta-btn" onClick={confirmPublish} disabled={publishing}>
                {publishing ? "Publishing…" : "✓ Confirm & publish"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLISH SUCCESS MODAL */}
      {publishSuccess && (
        <div className="conb-modal-backdrop">
          <div className="conb-modal conb-modal-success" onClick={(e) => e.stopPropagation()}>
            <div className="conb-success-check">✓</div>
            <h2>Your JD is live</h2>
            <p style={{ color: "#64748B", marginBottom: 20 }}>
              Job ID <strong>{company.jobId}</strong> — matching engine is scanning the verified pool.
            </p>
            <div className="conb-hero-stats" style={{ marginBottom: 24 }}>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>~4 hrs</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>FIRST MATCH</div></div>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>24 hrs</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>FULL FIRST BATCH</div></div>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>100%</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>VERIFIED</div></div>
            </div>
            <button type="button" className="conb-cta-btn" onClick={() => navigate("/companies/directory")}>
              Enter your Company Dashboard →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
