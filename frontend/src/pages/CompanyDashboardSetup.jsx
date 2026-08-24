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
  isFullyOnboarded,
} from "../data/companyOnboardingStages";
import OnboardingField from "../components/company/OnboardingField.jsx";

export default function CompanyDashboardSetup() {
  const navigate = useNavigate();
  const { company: authCompany, logout } = useCompanyAuth();
  const toast = useToast();

  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeStageId, setActiveStageId] = useState("1a");
  const [stageErrors, setStageErrors] = useState({});
  const [missingFields, setMissingFields] = useState(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState(false);
  const [submittingKyc, setSubmittingKyc] = useState(false);

  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);

  useEffect(() => {
    fetchCompany();
    fetchCompanyNotifications();
  }, []);

  const fetchCompany = () => {
    companyApi
      .get("/company/me")
      .then((res) => setCompany(res.data.company))
      .finally(() => setLoading(false));
  };

  const fetchCompanyNotifications = async () => {
    try {
      const res = await companyApi.get("/company/notifications");
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error("Failed to fetch notifications", err);
    }
  };

  const handleMarkNotifRead = async () => {
    try {
      await companyApi.post("/company/notifications/mark-read");
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  function checkMustFields(stageId, updatedCompany = company) {
    const st = ONBOARDING_STAGES.find((s) => s.id === stageId);
    if (!st || !updatedCompany) return [];
    const stData = updatedCompany[`stage${stageId}`] || {};
    const mustItems = st.items.filter((i) => i.tag === "must");
    return mustItems.filter((item) => {
      const val = stData[item.id];
      if (val === undefined || val === null) return true;
      if (typeof val === "string") return val.trim() === "";
      if (Array.isArray(val)) return val.length === 0;
      if (typeof val === "object") {
        if (item.input === "name-email") return !val.name || !String(val.name).trim() || !val.email || !String(val.email).trim();
        if (item.input === "file") return !val.docName && !val.docUrl;
      }
      return false;
    });
  }

  async function handleVerifyKyc() {
    const missing = checkMustFields("1a");
    if (missing.length > 0) {
      setStageErrors((prev) => ({ ...prev, "1a": missing.map((i) => i.name) }));
      toast(`Please fill all required inputs in Section 1A before submitting for KYC audit.`, "!");
      return;
    }

    setSubmittingKyc(true);
    try {
      const res = await companyApi.post("/company/verify-kyc");
      setCompany(res.data.company);
      setStageErrors((prev) => ({ ...prev, "1a": null }));
      toast(res.data.message || "Account & KYC submitted for verification!", "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Verification submission failed.", "!");
    } finally {
      setSubmittingKyc(false);
    }
  }

  if (loading || !company) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "var(--font-body)" }}>
        Loading your company account…
      </div>
    );
  }

  const activeStage = ONBOARDING_STAGES.find((s) => s.id === activeStageId);
  const banner = STAGE_BANNERS[activeStageId];
  let activeData = company[`stage${activeStageId}`] || {};
  if (activeStageId === "1a" && !activeData.legalname && (company.companyName || authCompany?.companyName)) {
    activeData = { ...activeData, legalname: company.companyName || authCompany?.companyName || "" };
  }
  if (activeStageId === "1b") {
    activeData = {
      ...activeData,
      pocname: activeData.pocname || company.contactName || authCompany?.contactName || "",
      pocemail: activeData.pocemail || company.email || authCompany?.email || "",
      pocmobile: activeData.pocmobile || company.mobile || authCompany?.mobile || "",
    };
  }

  const totalDone = ONBOARDING_STAGES.reduce((sum, s) => sum + stageDoneFields(s.id, company[`stage${s.id}`]), 0);
  const overallPct = Math.round((totalDone / TOTAL_FIELDS) * 100);

  async function saveField(itemId, value) {
    const res = await companyApi.put(`/company/stage/${activeStageId}`, { [itemId]: value });
    const updated = res.data.company;
    setCompany(updated);

    const remainingMissing = checkMustFields(activeStageId, updated);
    if (remainingMissing.length === 0) {
      setStageErrors((prev) => ({ ...prev, [activeStageId]: null }));
    } else if (stageErrors[activeStageId]) {
      setStageErrors((prev) => ({ ...prev, [activeStageId]: remainingMissing.map((i) => i.name) }));
    }
  }

  function goToStage(targetId) {
    const currentIdx = ONBOARDING_STAGES.findIndex((s) => s.id === activeStageId);
    const targetIdx = ONBOARDING_STAGES.findIndex((s) => s.id === targetId);

    // Only block if trying to move FORWARD to a future section
    if (targetIdx > currentIdx) {
      const missing = checkMustFields(activeStageId);
      if (missing.length > 0) {
        setStageErrors((prev) => ({ ...prev, [activeStageId]: missing.map((i) => i.name) }));
        toast(`Please complete all required (MUST) fields in Section ${activeStage.key} before advancing.`, "!");
        return;
      }
    }

    // Always allow moving backward to previous sections or switching to an earlier stage
    setActiveStageId(targetId);
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
      const missingNames = missing.map((i) => i.name);
      setMissingFields(missingNames);
      toast(`⚠️ Section 9 Incomplete: Please fill required fields (${missingNames.join(", ")})`, "!");
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

  // A submitted JD (company.jdPublished) still needs a Talentera staff
  // sign-off (company.jdApprovalStatus) before candidates can actually see
  // it - see routes/staff.js POST /verify-job and routes/public.js GET
  // /jobs. "Live" is reserved for the approved state so this dashboard
  // doesn't tell a company their JD is visible before it actually is.
  const jdApprovalStatus = company.jdApprovalStatus || "pending";
  const jdIsLive = company.jdPublished && jdApprovalStatus === "approved";
  const jdIsPendingApproval = company.jdPublished && jdApprovalStatus === "pending";
  const jdIsRejected = company.jdPublished && jdApprovalStatus === "rejected";

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)", fontFamily: "var(--font-body)" }}>
      {/* TOP STICKY DASHBOARD NAV */}
      <header className="conb-topnav">
        <div className="conb-topnav-brand" onClick={() => navigate("/companies/dashboard")} style={{ cursor: "pointer" }}>
          <div>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
            <div className="conb-topnav-tag">COMPANY DASHBOARD</div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/companies/directory"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Hire Verified Talent
          </Link>
          <Link
            to="/companies/jobs"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Job Posts
          </Link>
          <Link
            to="/companies/applicants"
            style={{
              color: "rgba(255,255,255,0.85)",
              fontSize: 13,
              fontWeight: 700,
              textDecoration: "none",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid rgba(255,255,255,0.15)",
            }}
          >
            Applicants
          </Link>
          {/* IN-APP NOTIFICATION BELL & DROPDOWN */}
          <div style={{ position: "relative" }}>
            <button
              type="button"
              style={{
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                borderRadius: "50%",
                width: 38,
                height: 38,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                position: "relative",
              }}
              onClick={() => {
                setShowNotifDropdown(!showNotifDropdown);
                if (unreadCount > 0) handleMarkNotifRead();
              }}
            >
              <span>🔔</span>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: -4,
                    right: -4,
                    background: "#EF4444",
                    color: "#fff",
                    borderRadius: "50%",
                    width: 18,
                    height: 18,
                    fontSize: 10,
                    fontWeight: 900,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    border: "2px solid var(--navy)",
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* NOTIFICATION PANEL */}
            {showNotifDropdown && (
              <div
                style={{
                  position: "absolute",
                  top: 48,
                  right: 0,
                  width: 340,
                  background: "#fff",
                  borderRadius: 14,
                  boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
                  border: "1px solid #E2E8F0",
                  zIndex: 9999,
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "12px 16px",
                    background: "var(--navy)",
                    color: "#fff",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <strong style={{ fontSize: 13 }}>COMPANY NOTIFICATIONS</strong>
                  <span style={{ fontSize: 10, background: "rgba(255,255,255,0.2)", padding: "2px 6px", borderRadius: 4 }}>
                    {notifications.length} Total
                  </span>
                </div>

                <div style={{ maxHeight: 320, overflowY: "auto" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                      No notifications yet
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n._id}
                        style={{
                          padding: "12px 16px",
                          borderBottom: "1px solid #F1F5F9",
                          background: n.read ? "#fff" : "#FEFCE8",
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.4 }}>{n.message}</div>
                        <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 4 }}>
                          {new Date(n.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                          {new Date(n.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

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
            {jdIsLive
              ? "JOB LIVE · SETUP IN PROGRESS"
              : jdIsPendingApproval
              ? "JOB AWAITING APPROVAL · SETUP IN PROGRESS"
              : jdIsRejected
              ? "JOB NEEDS REVISION · SETUP IN PROGRESS"
              : "ACCOUNT CREATED · SETUP IN PROGRESS"}
          </div>

          <h1 className="conb-hero-title">
            Welcome, <span className="gold-italic">{contactName}</span> — let's get{" "}
            <span className="gold-italic">{companyName}</span> hiring.
          </h1>

          <p className="conb-hero-sub">
            Complete your profile to unlock the full verified candidate pool. Most companies finish in{" "}
            <strong style={{ color: "var(--gold-light)" }}>~12 minutes</strong>. Your data is encrypted, never shared with competitors.
          </p>

          {company.intakeNotes && (
            <div
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(229,168,46,0.35)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.85)",
                lineHeight: 1.6,
              }}
            >
              <strong style={{ color: "var(--gold)" }}>What you told us when you signed up: </strong>
              {company.intakeNotes.flow === "job" ? (
                <span>
                  Hiring for <strong>{company.intakeNotes.jobTitle || "a role"}</strong>
                  {company.intakeNotes.jobSpecialty ? ` · ${company.intakeNotes.jobSpecialty}` : ""}
                  {company.intakeNotes.jobLocation ? ` · ${company.intakeNotes.jobLocation}` : ""}
                  {company.intakeNotes.jobExperience ? ` · ${company.intakeNotes.jobExperience}` : ""}
                  {company.intakeNotes.jobEmploymentType ? ` · ${company.intakeNotes.jobEmploymentType}` : ""}
                  {company.intakeNotes.jobSalaryRange ? ` · ${company.intakeNotes.jobSalaryRange}` : ""}
                </span>
              ) : (
                <span>
                  {company.intakeNotes.location ? `Hiring in ${company.intakeNotes.location}` : "Hiring"}
                  {company.intakeNotes.teamSize ? ` · Team size ${company.intakeNotes.teamSize}` : ""}
                  {company.intakeNotes.department ? ` · ${company.intakeNotes.department}` : ""}
                  {company.intakeNotes.frequency ? ` · ${company.intakeNotes.frequency}` : ""}
                </span>
              )}
              {" "}We've pre-filled what we could into the sections below.
            </div>
          )}

          {isFullyOnboarded(company) && (
            <div
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.4)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 20,
                fontSize: 12.5,
                color: "rgba(255,255,255,0.9)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <span>
                <strong style={{ color: "#4ADE80" }}>✓ Profile complete &amp; KYC verified — </strong>
                you don't need to come back here unless something changes. Post and manage roles from Job Posts instead.
              </span>
              <button
                type="button"
                onClick={() => navigate("/companies/jobs")}
                style={{ background: "var(--gold)", color: "var(--navy)", border: "none", padding: "8px 16px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer", whiteSpace: "nowrap" }}
              >
                Go to Job Posts →
              </button>
            </div>
          )}

          {(() => {
            let score = 25;
            if (company.stage1a && Object.keys(company.stage1a).length > 2) score += 20;
            if (company.kycStatus === "verified") score += 35;
            else if (company.kycStatus === "under_review") score += 15;
            if (company.stage2 && Object.keys(company.stage2).length > 2) score += 10;
            if (company.jdPublished) score += 10;
            const trustScore = Math.min(score, 100);

            const badge =
              trustScore >= 85
                ? { label: "GOLD TRUST 🛡️", color: "#15803D", bg: "#DCFCE7" }
                : trustScore >= 60
                ? { label: "SILVER TRUST ⭐", color: "#B45309", bg: "#FEF3C7" }
                : { label: "LOW TRUST ⚠️", color: "#B91C1C", bg: "#FEE2E2" };

            return (
              <div className="conb-hero-stats">
                <div style={{ background: badge.bg, border: `1.5px solid ${badge.color}`, borderRadius: 10, padding: "8px 12px", minWidth: 140 }}>
                  <div className="conb-hero-stat-val" style={{ color: badge.color, fontSize: 22, fontWeight: 900 }}>
                    {trustScore}%
                  </div>
                  <div className="conb-hero-stat-label" style={{ color: badge.color, fontWeight: 800 }}>
                    {badge.label}
                  </div>
                </div>
                <div>
                  <div className="conb-hero-stat-val">{overallPct}%</div>
                  <div className="conb-hero-stat-label">PROFILE COMPLETE</div>
                </div>
                <div>
                  <div className="conb-hero-stat-val">{totalDone}/{TOTAL_FIELDS}</div>
                  <div className="conb-hero-stat-label">FIELDS SAVED</div>
                </div>
                <div>
                  <div className="conb-hero-stat-val">
                    {company.kycStatus === "verified" ? "VERIFIED ✓" : company.kycStatus === "under_review" ? "REVIEW" : company.kycStatus === "rejected" ? "REVISION" : "PENDING"}
                  </div>
                  <div className="conb-hero-stat-label">ACCOUNT &amp; KYC</div>
                </div>
                <div>
                  <div className="conb-hero-stat-val">
                    {jdIsLive ? "LIVE" : jdIsPendingApproval ? "IN REVIEW" : jdIsRejected ? "REVISION" : "DRAFT"}
                  </div>
                  <div className="conb-hero-stat-label">FIRST JD STATUS</div>
                </div>
              </div>
            );
          })()}
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
              const isLive = st.id === "9" && jdIsLive;
              const isPendingJd = st.id === "9" && jdIsPendingApproval;
              const isKycStage = st.id === "1a";
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
                      <div className="conb-stage-item-status">
                        {isKycStage && company.kycStatus === "verified" ? "KYC VERIFIED ✓" : isKycStage && company.kycStatus === "under_review" ? "KYC AUDIT ⌛" : isLive ? "JOB LIVE ✓" : isPendingJd ? "AWAITING APPROVAL ⌛" : `${done} of ${total} done`}
                      </div>
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
            <div className="conb-banner-icon"><i className={banner.icon}></i></div>
            <div>
              <div className="conb-banner-eyebrow">STAGE {activeStage.key} · WHY THIS MATTERS</div>
              <h3 className="conb-banner-title">{banner.title}</h3>
              <p className="conb-banner-desc">{banner.desc}</p>
              <div className="conb-banner-unlocks">
                {banner.unlocks.map((u) => <span key={u}><i className="fa-solid fa-check" style={{ marginRight: 4, color: "var(--gold)" }}></i> {u}</span>)}
              </div>
            </div>
          </div>

          <div className="conb-form-card">
            <div className="conb-form-eyebrow">
              STAGE {activeStage.key} · {stageDoneFields(activeStageId, activeData)}/{stageTotalFields(activeStageId)} COMPLETE
            </div>
            <h2 className="conb-form-title">{activeStage.name}</h2>
            <p className="conb-form-sub">{activeStage.sub}</p>

            {/* STAGE 1A ACCOUNT & KYC VERIFICATION CARD */}
            {activeStageId === "1a" && (
              <div
                style={{
                  background:
                    company.kycStatus === "verified"
                      ? "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)"
                      : company.kycStatus === "under_review"
                      ? "linear-gradient(135deg, #FEF3C7 0%, #FFFBEB 100%)"
                      : company.kycStatus === "rejected"
                      ? "linear-gradient(135deg, #FEE2E2 0%, #FEF2F2 100%)"
                      : "linear-gradient(135deg, #F1F5F9 0%, #F8FAFC 100%)",
                  border:
                    company.kycStatus === "verified"
                      ? "1.5px solid #16A34A"
                      : company.kycStatus === "under_review"
                      ? "1.5px solid #D97706"
                      : company.kycStatus === "rejected"
                      ? "1.5px solid #DC2626"
                      : "1.5px solid #CBD5E1",
                  borderRadius: 12,
                  padding: 20,
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 26, lineHeight: 1 }}>
                      {company.kycStatus === "verified"
                        ? "🟢"
                        : company.kycStatus === "under_review"
                        ? "⏳"
                        : company.kycStatus === "rejected"
                        ? "🔴"
                        : "📝"}
                    </span>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", textTransform: "uppercase" }}>
                        OFFICIAL VERIFICATION AUDIT STATUS
                      </div>
                      <h4 style={{ margin: "2px 0 4px", fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>
                        Account &amp; KYC:{" "}
                        <span
                          style={{
                            color:
                              company.kycStatus === "verified"
                                ? "#15803D"
                                : company.kycStatus === "under_review"
                                ? "#B45309"
                                : company.kycStatus === "rejected"
                                ? "#B91C1C"
                                : "#475569",
                          }}
                        >
                          {company.kycStatus === "verified"
                            ? "VERIFIED ✓"
                            : company.kycStatus === "under_review"
                            ? "UNDER REVIEW ⌛"
                            : company.kycStatus === "rejected"
                            ? "REVISION REQUIRED ⚠️"
                            : "UNVERIFIED (ACTION NEEDED)"}
                        </span>
                      </h4>
                      <p style={{ margin: 0, fontSize: 13, color: "#475569", maxWidth: 520 }}>
                        {company.kycStatus === "verified"
                          ? "Your registered business entity, GSTIN, PAN, and KYC certificates are audited and verified."
                          : company.kycStatus === "under_review"
                          ? "Your Account & KYC details are submitted to Operations for document audit and validation."
                          : company.kycStatus === "rejected"
                          ? `Audit Feedback: ${company.kycRejectionReason || "Please verify your GSTIN/PAN details and re-upload documents."}`
                          : "Provide valid GSTIN, PAN, Legal Business Name, and upload KYC files to request verification."}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="conb-cta-btn"
                    style={{
                      padding: "10px 20px",
                      fontSize: 13,
                      background:
                        company.kycStatus === "verified"
                          ? "#16A34A"
                          : company.kycStatus === "under_review"
                          ? "#D97706"
                          : "var(--gold)",
                      color: company.kycStatus === "verified" || company.kycStatus === "under_review" ? "#fff" : "var(--navy)",
                    }}
                    disabled={submittingKyc || company.kycStatus === "under_review"}
                    onClick={handleVerifyKyc}
                  >
                    {submittingKyc
                      ? "Submitting…"
                      : company.kycStatus === "verified"
                      ? "KYC Verified ✓"
                      : company.kycStatus === "under_review"
                      ? "Under Audit ⌛"
                      : "Submit Account & KYC Data →"}
                  </button>
                </div>
              </div>
            )}

            {activeStageId === "9" && jdIsLive && (
              <div className="conb-jd-live-banner">
                <span>✓ JOB POST · LIVE</span>
                <span className="conb-jd-live-id">{company.jobId}</span>
              </div>
            )}
            {activeStageId === "9" && jdIsPendingApproval && (
              <div className="conb-jd-live-banner" style={{ background: "#FEF3C7", color: "#92400E" }}>
                <span>⏳ JOB POST · AWAITING TALENTERA APPROVAL</span>
                <span className="conb-jd-live-id">{company.jobId}</span>
              </div>
            )}
            {activeStageId === "9" && jdIsRejected && (
              <div className="conb-jd-live-banner" style={{ background: "#FEE2E2", color: "#B91C1C" }}>
                <span>✕ JOB POST · NOT APPROVED — {company.jdRejectionReason || "please review and resubmit"}</span>
                <span className="conb-jd-live-id">{company.jobId}</span>
              </div>
            )}

            {/* INLINE SECTION ERROR BANNER FOR MISSING MUST INPUTS */}
            {stageErrors[activeStageId] && stageErrors[activeStageId].length > 0 && (
              <div
                style={{
                  background: "#FEE2E2",
                  border: "1.5px solid #EF4444",
                  borderRadius: 10,
                  padding: "14px 18px",
                  marginBottom: 24,
                  color: "#991B1B",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                }}
              >
                <span style={{ fontSize: 22, lineHeight: 1 }}>⚠️</span>
                <div>
                  <strong style={{ fontSize: 14, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    SECTION {activeStage.key} INCOMPLETE: REQUIRED INPUTS MISSING
                  </strong>
                  <p style={{ margin: "4px 0 0", fontSize: 13, color: "#B91C1C", fontWeight: 600 }}>
                    Each required input in this section must be filled. Please enter values for:{" "}
                    <strong style={{ textDecoration: "underline" }}>{stageErrors[activeStageId].join(", ")}</strong>
                  </p>
                </div>
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
                  showStageErrors={Boolean(stageErrors[activeStageId])}
                  isRejectedField={Boolean(company.rejectedKycFields?.includes(item.id))}
                />
              ))}
            </div>

            <div className="conb-form-footer">
              {activeStageId === "9" ? (
                <button type="button" className="conb-cta-btn" onClick={handleJdButtonClick}>
                  {jdIsLive ? "View live JD →" : company.jdPublished ? "View submission →" : "Preview & Publish JD →"}
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
            <div className="conb-jd-preview-eyebrow">LIVE JOB LISTING PREVIEW &amp; REQUISITION REVIEW</div>
            <h2 className="conb-jd-preview-title">{company.stage9?.roletitle || "Untitled role"}</h2>
            <div className="conb-jd-preview-pills">
              {[
                company.stage9?.workmode,
                company.stage9?.shift,
                company.stage9?.level,
                company.stage9?.openings ? `${company.stage9.openings} openings` : null,
                company.stage9?.urgency,
              ]
                .filter(Boolean)
                .map((p) => (
                  <span key={p} className="conb-jd-pill">
                    {p}
                  </span>
                ))}
            </div>
            <p style={{ fontSize: 13.5, color: "#64748B", margin: "8px 0 16px" }}>
              {companyName} · {company.stage9?.location || "Location not set"}
            </p>

            {/* ALL REQUIRED MUST FIELDS REVIEW SUMMARY */}
            {(() => {
              const st9 = company.stage9 || {};
              return (
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1.5px solid #E2E8F0",
                    borderRadius: 12,
                    padding: 16,
                    marginBottom: 20,
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 800,
                      color: "var(--navy)",
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      marginBottom: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span>📋 REQUIRED (MUST) REQUISITION SUMMARY</span>
                    <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10, padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                      MUST FIELDS REVIEW
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))",
                      gap: "10px 16px",
                      fontSize: 12.5,
                      color: "var(--navy)",
                    }}
                  >
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>ROLE TITLE</span>
                      <strong>{st9.roletitle || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>PRIMARY SPECIALTY</span>
                      <strong>{st9.specialty || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>HIRING LEVEL</span>
                      <strong>{st9.level || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>EXPERIENCE RANGE</span>
                      <strong>{st9.expmin != null && st9.expmax != null ? `${st9.expmin} – ${st9.expmax} Years` : "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>COMPENSATION PACKAGE</span>
                      <strong>{st9.compmin != null && st9.compmax != null ? `₹${st9.compmin} – ${st9.compmax} LPA` : "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>WORK MODE &amp; SHIFT</span>
                      <strong>{st9.workmode || "—"} · {st9.shift || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>JOB LOCATION</span>
                      <strong>{st9.location || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>REQUIRED LANGUAGES</span>
                      <strong>{Array.isArray(st9.languages) ? st9.languages.join(", ") : st9.languages || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>NO. OF OPENINGS</span>
                      <strong>{st9.openings || "1"} Openings</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>HIRING URGENCY</span>
                      <strong>{st9.urgency || "—"}</strong>
                    </div>
                    <div>
                      <span style={{ color: "#64748B", fontSize: 10.5, fontWeight: 700, display: "block" }}>HIRING MANAGER</span>
                      <strong>{st9.hiringmanager || "—"}</strong>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                {publishing ? "Submitting…" : "✓ Confirm & submit for approval"}
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
            <h2>Submitted for approval</h2>
            <p style={{ color: "#64748B", marginBottom: 20 }}>
              Job ID <strong>{company.jobId}</strong> — Talentera staff review every job post before it goes live
              on the board and the matching engine starts scanning the verified pool. You'll be notified here as
              soon as it's approved.
            </p>
            <div className="conb-hero-stats" style={{ marginBottom: 24 }}>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>⏳</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>AWAITING STAFF REVIEW</div></div>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>~24 hrs</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>TYPICAL TURNAROUND</div></div>
              <div><div className="conb-hero-stat-val" style={{ color: "var(--navy)" }}>100%</div><div className="conb-hero-stat-label" style={{ color: "#94A3B8" }}>VERIFIED</div></div>
            </div>
            <button type="button" className="conb-cta-btn" onClick={() => navigate("/companies/applicants")}>
              View your applicants →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
