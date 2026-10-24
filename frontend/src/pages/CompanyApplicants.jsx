import React, { useEffect, useState } from "react";
import { effectivePlan } from "../utils/billing";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import AcademyProfileModal from "../components/AcademyProfileModal.jsx";

import HeadOnly from "../components/company/HeadOnly.jsx";
const STATUS_OPTIONS = ["applied", "shortlisted", "interviewing", "hired", "on_hold", "rejected"];
const statusLabel = (s) => (s === "on_hold" ? "On Hold (Selected)" : s === "all" ? "all" : String(s).charAt(0).toUpperCase() + String(s).slice(1));

const STATUS_STYLE = {
  applied: { bg: "#F1F5F9", color: "#334155" },
  shortlisted: { bg: "#DBEAFE", color: "#1D4ED8" },
  interviewing: { bg: "#FEF3C7", color: "#B45309" },
  hired: { bg: "#DCFCE7", color: "#166534" },
  on_hold: { bg: "#FEF3C7", color: "#92400E" },
  rejected: { bg: "#FEE2E2", color: "#B91C1C" },
};

// The company-facing half of the ATS loop that backend/routes/company.js
// already had fully built (GET /company/applications,
// PUT /company/applications/:id/status) but nothing in the frontend ever
// called - a company could publish a JD and then had no page to see who
// applied to it.
function getAssetUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

export default function CompanyApplicants() {
  const navigate = useNavigate();
  const toast = useToast();
  const { company, logout, refreshCompany } = useCompanyAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isKycVerified, setIsKycVerified] = useState(() => company?.kycStatus === "verified" || Boolean(company?.kycVerifiedAt));
  const [canViewScoresAndCerts, setCanViewScoresAndCerts] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);
  const [rejectingApp, setRejectingApp] = useState(null);

  // "Matched by JD": candidates auto-pulled from the verified pool who fit a job's requirements
  const [view, setView] = useState("applicants");
  const [postedJobs, setPostedJobs] = useState([]);
  const [matchJobId, setMatchJobId] = useState("");
  const [matched, setMatched] = useState([]);
  const [matchTotal, setMatchTotal] = useState(0);
  const [minMatch, setMinMatch] = useState(0); // only show matched profiles scoring at or above this %
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchError, setMatchError] = useState("");
  const [callingApp, setCallingApp] = useState(null); // candidate being called for interview (opens the schedule box)
  const [hiddenMatches, setHiddenMatches] = useState(() => new Set()); // matched candidates the recruiter marked "not a fit" (this session)
  const showApplicants = view === "applicants";

  useEffect(() => {
    companyApi.get("/company/jobs").then((res) => {
      const list = (res.data?.jobs || []).filter((j) => j.published);
      setPostedJobs(list);
      if (list.length > 0) setMatchJobId((prev) => prev || list[0].jobId);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (view !== "matched" || !matchJobId) return;
    let cancelled = false;
    setMatchLoading(true);
    setMatchError("");
    companyApi.get("/company/matched-candidates", { params: { jobId: matchJobId } })
      .then((res) => {
        if (cancelled) return;
        setMatched(res.data?.candidates || []);
        setMatchTotal(res.data?.total || 0);
        setMinMatch(Number(res.data?.defaultMinScore) || 0);
      })
      .catch((err) => { if (!cancelled) setMatchError(err.response?.data?.message || "Couldn't load matched candidates."); })
      .finally(() => { if (!cancelled) setMatchLoading(false); });
    return () => { cancelled = true; };
  }, [view, matchJobId]);

  useEffect(() => {
    fetchApplications();
    if (refreshCompany) {
      refreshCompany().then((c) => {
        if (c && (c.kycStatus === "verified" || c.kycVerifiedAt)) {
          setIsKycVerified(true);
        }
      });
    }
  }, []);

  useEffect(() => {
    if (company?.kycStatus === "verified" || company?.kycVerifiedAt) {
      setIsKycVerified(true);
    }
  }, [company]);

  async function fetchApplications() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await companyApi.get("/company/applications");
      setApplications(res.data?.applications || []);
      const verified = Boolean(res.data?.isKycVerified || company?.kycStatus === "verified" || company?.kycVerifiedAt);
      setIsKycVerified(verified);
      setCanViewScoresAndCerts(res.data?.canViewScoresAndCerts ?? (effectivePlan(company?.plan) !== "free"));
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load your applicants. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(appId, status, customReason = null, customDetails = null) {
    setUpdatingId(appId);
    try {
      const res = await companyApi.put(`/company/applications/${appId}/status`, {
        status,
        reason: customReason || undefined,
        details: customDetails || undefined,
      });
      const updatedApp = res.data.application;
      const nextStatus = updatedApp?.status || status;
      const finalReason = customReason !== null ? customReason : (updatedApp?.rejectionReason || "");
      const finalDetails = customDetails !== null ? customDetails : (updatedApp?.rejectionDetails || "");

      setApplications((prev) =>
        prev.map((a) =>
          a._id === appId
            ? {
                ...a,
                ...updatedApp,
                status: nextStatus,
                rejectionReason: status === "rejected" ? finalReason : a.rejectionReason,
                rejectionDetails: status === "rejected" ? finalDetails : a.rejectionDetails,
              }
            : a
        )
      );
      setSelectedApp((prev) =>
        prev && prev._id === appId
          ? {
              ...prev,
              ...updatedApp,
              status: nextStatus,
              rejectionReason: status === "rejected" ? finalReason : prev.rejectionReason,
              rejectionDetails: status === "rejected" ? finalDetails : prev.rejectionDetails,
            }
          : prev
      );
      toast(status === "rejected" ? "Application rejected & reason recorded." : `Marked as ${status}.`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't update status.", "!");
    } finally {
      setUpdatingId(null);
    }
  }

  // "Shortlist for interview" button at the end of a candidate profile. A matched (not-yet-applied) candidate
  // first gets an application record, then goes through the normal status route (notification + email + academy event).
  async function shortlistCandidate(app) {
    setUpdatingId(app._id);
    try {
      let appId = app._id;
      if (app.status === "matched") {
        const cid = String(app._id).replace(/^match-/, "");
        const r = await companyApi.post("/company/matched-candidates/application", { jobId: app.jobId, candidateId: cid });
        appId = r.data.applicationId;
      }
      await companyApi.put(`/company/applications/${appId}/status`, { status: "shortlisted" });
      toast("Shortlisted for interview. The candidate has been notified - find them under Applicants → Shortlisted.", "✓");
      setMatched((prev) => prev.map((m) => (m._id === app._id ? { ...m, alreadyApplied: true } : m)));
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't shortlist this candidate.", "!");
    } finally {
      setUpdatingId(null);
    }
  }

  // "Call for interview": shortlists (creating the application first for a matched candidate) and sets the interview slot.
  async function callForInterview(app, { when, type, link }) {
    setUpdatingId(app._id);
    try {
      let appId = app._id;
      if (app.status === "matched") {
        const cid = String(app._id).replace(/^match-/, "");
        const r = await companyApi.post("/company/matched-candidates/application", { jobId: app.jobId, candidateId: cid });
        appId = r.data.applicationId;
      }
      await companyApi.put(`/company/applications/${appId}/status`, {
        status: "interviewing",
        interviewTime: when || undefined,
        interviewType: type || undefined,
        meetingLink: link || undefined,
      });
      toast("Interview scheduled. The candidate has been notified.", "✓");
      setMatched((prev) => prev.map((m) => (m._id === app._id ? { ...m, alreadyApplied: true } : m)));
      setCallingApp(null);
      setSelectedApp(null);
      fetchApplications();
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't schedule the interview.", "!");
    } finally {
      setUpdatingId(null);
    }
  }

  function handleStatusSelect(app, nextStatus) {
    if (nextStatus === "rejected") {
      setRejectingApp(app);
    } else {
      updateStatus(app._id, nextStatus);
    }
  }

  async function handleConfirmRejection(reason, details) {
    if (!rejectingApp) return;
    const appId = rejectingApp._id;
    await updateStatus(appId, "rejected", reason, details);
    setRejectingApp(null);
  }

  const jobOptions = [...new Set(applications.map((a) => a.jobId))].map((jobId) => ({
    jobId,
    jobTitle: applications.find((a) => a.jobId === jobId)?.jobTitle || jobId,
  }));

  const filtered = applications
    .filter((a) => statusFilter === "all" || a.status === statusFilter)
    .filter((a) => jobFilter === "all" || a.jobId === jobFilter);

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)" }}>
      <header
        style={{
          background: "var(--navy)",
          padding: "16px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/companies/dashboard")}>
          <img src="/logo-white.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
            APPLICANTS
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/companies/directory" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Hire Verified Talent
          </Link>
          <Link to="/companies/jobs" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Job Posts
          </Link>
          <Link to="/companies/applicants" style={{ color: "var(--gold)", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "6px 12px", background: "rgba(229,168,46,0.12)", borderRadius: 6 }}>
            Applicants
          </Link>
          <Link to="/companies/hiring" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Hiring Flow
          </Link>
          <HeadOnly><Link to="/companies/team" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>Team Logins</Link></HeadOnly>
          <HeadOnly><Link to="/companies/dashboard" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Edit Profile
          </Link></HeadOnly>
          {company && (
            <button
              type="button"
              onClick={() => {
                logout();
                navigate("/companies");
              }}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 20 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>
              Applicants
            </h1>
            <p style={{ fontSize: 13.5, color: "#64748B" }}>
              Candidates who applied to your published requisitions.
            </p>
          </div>

          {!isKycVerified && !loading && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, maxWidth: 340 }}>
              🔒 Complete Account &amp; KYC verification to see full candidate contact details.{" "}
              <HeadOnly><Link to="/companies/dashboard" style={{ color: "#92400E", fontWeight: 800 }}>Verify now →</Link></HeadOnly>
            </div>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {[["applicants", `Applicants (${applications.length})`], ["matched", "Matched by JD"]].map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setView(key)}
              style={{
                padding: "8px 18px",
                borderRadius: 10,
                border: view === key ? "1.5px solid var(--navy)" : "1.5px solid #E2E8F0",
                background: view === key ? "var(--navy)" : "#fff",
                color: view === key ? "#fff" : "#475569",
                fontSize: 13,
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "matched" && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
              <select
                value={matchJobId}
                onChange={(e) => setMatchJobId(e.target.value)}
                style={{ fontSize: 13, padding: "8px 14px", borderRadius: 10, border: "1.5px solid #E2E8F0", fontWeight: 700, color: "var(--navy)", background: "#fff" }}
              >
                {postedJobs.length === 0 && <option value="">No live job posts yet</option>}
                {postedJobs.map((j) => (
                  <option key={j.jobId} value={j.jobId}>{(j.fields || {}).roletitle || "Untitled role"} · {j.jobId}</option>
                ))}
              </select>
              <span style={{ fontSize: 12.5, color: "#64748B" }}>
                Auto-pulled from the verified pool using this job&apos;s hiring level and certification requirements.
                {!matchLoading && matchJobId ? ` ${matched.filter((m) => m.matchScore >= minMatch).length} of ${matchTotal} candidate${matchTotal === 1 ? "" : "s"} shown.` : ""}
              </span>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, fontWeight: 700, color: "var(--navy)" }}>
                Minimum score
                <input
                  type="number" min="0" max="100" value={minMatch}
                  onChange={(e) => setMinMatch(Math.min(100, Math.max(0, Number(e.target.value) || 0)))}
                  style={{ width: 64, padding: "6px 8px", borderRadius: 8, border: "1.5px solid #E2E8F0", fontWeight: 700 }}
                />%
              </label>
            </div>

            {matchLoading && <div style={{ textAlign: "center", padding: 40, color: "#64748B" }}>Finding matching candidates…</div>}
            {!matchLoading && matchError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 16, borderRadius: 10, fontSize: 13.5 }}>{matchError}</div>
            )}
            {!matchLoading && !matchError && matchJobId && matched.filter((m) => m.matchScore >= minMatch).length === 0 && (
              <div style={{ textAlign: "center", padding: 50, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
                {matched.length === 0 ? "No candidates in the pool match this job yet." : `No candidates score ${minMatch}% or above for this job. Lower the minimum score to see ${matched.length} other profile${matched.length === 1 ? "" : "s"}.`}
              </div>
            )}
            {!matchLoading && !matchError && matched.filter((m) => !hiddenMatches.has(m._id) && m.matchScore >= minMatch).map((m) => {
              const c = m.candidate || {};
              const basic = c.basicInfo || {};
              return (
                <div
                  key={m._id}
                  onClick={() => setSelectedApp(m)}
                  style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "16px 20px", marginBottom: 12, cursor: "pointer" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                        <strong style={{ fontSize: 15.5 }}>{basic.fullName || "Candidate"}</strong>
                        {m.alreadyApplied && (
                          <span style={{ fontSize: 10, fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 999 }}>APPLIED</span>
                        )}
                      </div>
                      <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 6 }}>
                        {[basic.city, basic.experience].filter(Boolean).join(" · ")}{c.email ? ` · ${c.email}` : ""}
                      </div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {(m.matchReasons || []).map((r) => (
                          <span key={r} style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8", background: "#DBEAFE", padding: "3px 10px", borderRadius: 999 }}>{r}</span>
                        ))}
                      </div>
                      <MatchBreakdown application={m} compact />
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div title={(m.matchBreakdown || []).map((b) => `${b.label}: ${b.points}/${b.max}`).join("\n")} style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", cursor: "help" }}>{m.matchScore}%</div>
                      <div style={{ fontSize: 11, color: "#94A3B8" }}>JD match</div>
                      <span style={{ fontSize: 11, color: "#94A3B8" }}>View full profile →</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {showApplicants && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {["all", ...STATUS_OPTIONS].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStatusFilter(s)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 999,
                  border: statusFilter === s ? "1.5px solid var(--navy)" : "1.5px solid #E2E8F0",
                  background: statusFilter === s ? "var(--navy)" : "#fff",
                  color: statusFilter === s ? "#fff" : "#475569",
                  fontSize: 12,
                  fontWeight: 700,
                  textTransform: "capitalize",
                  cursor: "pointer",
                }}
              >
                {statusLabel(s)} {s !== "all" ? `(${applications.filter((a) => a.status === s).length})` : `(${applications.length})`}
              </button>
            ))}
          </div>

          {jobOptions.length > 1 && (
            <select
              value={jobFilter}
              onChange={(e) => setJobFilter(e.target.value)}
              style={{ fontSize: 12.5, padding: "7px 12px", borderRadius: 999, border: "1.5px solid #E2E8F0", fontWeight: 700, color: "#475569", background: "#fff" }}
            >
              <option value="all">All roles</option>
              {jobOptions.map((j) => (
                <option key={j.jobId} value={j.jobId}>{j.jobTitle}</option>
              ))}
            </select>
          )}
        </div>
        )}

        {showApplicants && loading && <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading applicants…</div>}

        {showApplicants && !loading && loadError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 16, borderRadius: 10, fontSize: 13.5 }}>
            {loadError}
          </div>
        )}

        {showApplicants && !loading && !loadError && applications.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
            No applications yet. Once your published JD is live, candidates who apply will show up here.
          </div>
        )}

        {showApplicants &&
          !loading &&
          !loadError &&
          filtered.map((app) => {
            const c = app.candidate || {};
            const basic = c.basicInfo || {};
            const style = STATUS_STYLE[app.status] || STATUS_STYLE.applied;
            return (
              <div
                key={app._id}
                onClick={() => setSelectedApp(app)}
                style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "18px 20px", marginBottom: 14, cursor: "pointer", transition: "box-shadow 0.15s" }}
                onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 6px 20px rgba(10,31,61,0.08)")}
                onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
              >
                <div style={{ display: "flex", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                      <strong style={{ fontSize: 15.5 }}>{basic.fullName || "Candidate"}</strong>
                      {c.badge && (
                        <span style={{ fontSize: 10, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "2px 8px", borderRadius: 999 }}>
                          {c.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", marginBottom: 2 }}>
                      Applied for: {app.jobTitle || app.jobId}
                    </div>
                    <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 6 }}>
                      {c.email} · {c.mobile}
                    </div>
                    <div style={{ fontSize: 12, color: "#94A3B8" }}>
                      Job ID {app.jobId} · Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""} · Verification score: {c.score != null ? c.score : (!canViewScoresAndCerts ? "🔒 Locked (Free Plan)" : "—")}
                    </div>
                    {app.coverNote && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: "#334155", background: "#F8FAFC", padding: "8px 10px", borderRadius: 8 }}>
                        {app.coverNote}
                      </div>
                    )}

                    {(app.status === "rejected" || app.rejectionReason) && (
                      <div
                        style={{
                          marginTop: 8,
                          background: "#FEF2F2",
                          border: "1px solid #FECACA",
                          borderRadius: 8,
                          padding: "8px 12px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#991B1B", display: "inline-flex", alignItems: "center", gap: 5 }}>
                            <i className="fa-solid fa-circle-xmark"></i> Rejection Reason:
                          </span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setRejectingApp(app);
                            }}
                            style={{
                              background: "none",
                              border: "none",
                              color: "#DC2626",
                              fontSize: 10.5,
                              fontWeight: 700,
                              cursor: "pointer",
                              textDecoration: "underline",
                              padding: 0,
                            }}
                          >
                            Edit Reason
                          </button>
                        </div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: "#B91C1C" }}>
                          {app.rejectionReason || "Qualifications / Criteria mismatch"}
                        </div>
                        {app.rejectionDetails && (
                          <div style={{ fontSize: 11, color: "#7F1D1D", marginTop: 4, background: "#FFF", padding: "4px 8px", borderRadius: 4, border: "1px dashed #FCA5A5" }}>
                            <strong>Notes:</strong> {app.rejectionDetails}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", background: style.bg, color: style.color, padding: "4px 12px", borderRadius: 999 }}>
                      {statusLabel(app.status)}
                    </span>
                    <select
                      value={app.status}
                      disabled={updatingId === app._id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => handleStatusSelect(app, e.target.value)}
                      style={{ fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontWeight: 600, color: "var(--navy)" }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{statusLabel(s)}</option>
                      ))}
                    </select>
                    <span style={{ fontSize: 11, color: "#94A3B8" }}>View full profile →</span>
                  </div>
                </div>
              </div>
            );
          })}
      </main>

      {selectedApp && (
        <ApplicantDetailModal
          application={selectedApp}
          canViewScoresAndCerts={canViewScoresAndCerts}
          updatingId={updatingId}
          onStatusChange={(status) => handleStatusSelect(selectedApp, status)}
          onShortlist={() => shortlistCandidate(selectedApp)}
          onCallInterview={() => setCallingApp(selectedApp)}
          onReject={() => {
            if (selectedApp.status === "matched") {
              // Not applied yet, so there is nothing to reject or notify - just take it off the matched list.
              setHiddenMatches((prev) => new Set(prev).add(selectedApp._id));
              toast("Removed from your matched list.", "✓");
              setSelectedApp(null);
            } else {
              handleStatusSelect(selectedApp, "rejected");
            }
          }}
          onEditRejection={() => setRejectingApp(selectedApp)}
          onClose={() => setSelectedApp(null)}
        />
      )}

      {callingApp && (
        <CallInterviewModal
          application={callingApp}
          busy={updatingId === callingApp._id}
          onClose={() => setCallingApp(null)}
          onConfirm={(details) => callForInterview(callingApp, details)}
        />
      )}

      {rejectingApp && (
        <RejectionReasonModal
          application={rejectingApp}
          initialReason={rejectingApp.rejectionReason || ""}
          initialDetails={rejectingApp.rejectionDetails || ""}
          updating={updatingId === rejectingApp._id}
          onClose={() => setRejectingApp(null)}
          onConfirm={(reason, details) => handleConfirmRejection(reason, details)}
        />
      )}
    </div>
  );
}

// Full-detail view for a single applicant. The list card only ever showed a
// name, masked contact line and a one-line score - everything the company
// onboarding pipeline actually collects about a candidate (training,
// certification, assessment, video intro, live-chart audit, self summary,
// employment status) was already coming back from GET /company/applications
// but had nowhere to render. Clicking a card opens this instead.
function ApplicantDetailModal({ application, canViewScoresAndCerts = true, updatingId, onStatusChange, onShortlist, onCallInterview, onReject, onEditRejection, onClose }) {
  const c = application.candidate || {};
  const [showAcademyProfile, setShowAcademyProfile] = useState(false);
  const basic = c.basicInfo || {};
  const training = c.training || {};
  const certification = c.certification || c.stage3 || {};
  const assessment = c.assessment || c.stage4 || {};
  const videoIntro = c.videoIntro || c.stage5 || {};
  const liveCharts = c.liveCharts || c.stage6 || {};
  const summary = c.summary || {};
  const employment = c.employmentStatus || {};
  const style = STATUS_STYLE[application.status] || STATUS_STYLE.applied;
  const isScoresLocked = !canViewScoresAndCerts || assessment.scoreLocked || liveCharts.locked;

  const Section = ({ title, children }) => (
    <div style={{ marginBottom: 22 }}>
      <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#94A3B8", marginBottom: 8 }}>
        {title}
      </div>
      {children}
    </div>
  );

  const Row = ({ label, value }) =>
    value ? (
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px solid #F1F5F9", fontSize: 13.5 }}>
        <span style={{ color: "#64748B" }}>{label}</span>
        <span style={{ color: "var(--navy)", fontWeight: 600, textAlign: "right" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(10,31,61,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, zIndex: 1000 }}
    >
      {showAcademyProfile && training.academyId && (
        <div onClick={(e) => e.stopPropagation()}>
          <AcademyProfileModal academyId={training.academyId} onClose={() => setShowAcademyProfile(false)} />
        </div>
      )}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: "#fff", borderRadius: 18, maxWidth: 640, width: "100%", maxHeight: "88vh", overflowY: "auto", boxShadow: "0 30px 70px rgba(0,0,0,0.35)" }}
      >
        <div style={{ padding: "22px 26px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "flex-start", position: "sticky", top: 0, background: "#fff", zIndex: 1 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, margin: 0, color: "var(--navy)" }}>{basic.fullName || "Candidate"}</h2>
              {c.badge && (
                <span style={{ fontSize: 10.5, fontWeight: 800, color: "#92400E", background: "#FEF3C7", padding: "3px 9px", borderRadius: 999 }}>
                  {c.badge}
                </span>
              )}
              <span style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", background: style.bg, color: style.color, padding: "3px 10px", borderRadius: 999 }}>
                {statusLabel(application.status)}
              </span>
            </div>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", marginBottom: 2 }}>
              Applied for: {application.jobTitle || application.jobId}
            </div>
            <div style={{ fontSize: 13, color: "#64748B" }}>{c.email} · {c.mobile}</div>
          </div>
          <button type="button" onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#94A3B8", lineHeight: 1 }}>
            ✕
          </button>
        </div>

        <div style={{ padding: "20px 26px 26px" }}>
          {isScoresLocked && (
            <div style={{ background: "#EFF6FF", border: "1.5px solid #3B82F6", borderRadius: 12, padding: "14px 18px", marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1E40AF" }}>
                  🔒 CANDIDATE ASSESSMENT SCORES & AUDITS GATED (FREE TIER)
                </div>
                <div style={{ fontSize: 12, color: "#1D4ED8", marginTop: 2 }}>
                  Upgrade to Growth Tier (₹4,999/mo) to unlock complete proctored test scorecards, live chart accuracy breakdowns, and AAPC/AHIMA verification.
                </div>
              </div>
            </div>
          )}

          {!application.isKycVerified && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 20 }}>
              🔒 Contact details are masked until your company completes Account &amp; KYC verification.
            </div>
          )}

          {application.status === "matched" && Array.isArray(application.matchBreakdown) && application.matchBreakdown.length > 0 && (
            <Section title={`Match score · ${application.matchScore}%`}>
              <MatchBreakdown application={application} />
            </Section>
          )}

          <Section title="Basic info">
            <Row label="City" value={basic.city} />
            <Row label="Experience" value={basic.experience} />
            <Row label="Current role" value={basic.currentRole} />
            <Row label="Aadhaar verified" value={basic.aadhaarVerified ? "Yes ✓" : "Not verified"} />
          </Section>

          {!training.skipped && (
            <Section title="Training">
              <Row label="Academy" value={training.academyName} />
              {training.academyId && (
                <div style={{ margin: "4px 0 6px" }}>
                  <button type="button" onClick={() => setShowAcademyProfile(true)} style={{ border: "none", background: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer", fontSize: 12, padding: 0 }}>
                    View academy profile (pictures &amp; videos)
                  </button>
                </div>
              )}
              <Row label="Batch" value={training.batch} />
              <Row label="Verified" value={training.verified ? "Yes ✓" : "Self-reported"} />
            </Section>
          )}

          {(training.certDocUrl || training.relievingLetterUrl) && (
            <Section title="Experience proof (attached by candidate)">
              {training.certDocUrl && (
                <div style={{ padding: "6px 0", fontSize: 13.5 }}>
                  <a href={training.certDocUrl} target="_blank" rel="noreferrer" style={{ color: "#2563EB", fontWeight: 700 }}>
                    View {training.certDocName || "experience / certification document"} →
                  </a>
                </div>
              )}
              {training.relievingLetterUrl && (
                <div style={{ padding: "6px 0", fontSize: 13.5 }}>
                  <a href={training.relievingLetterUrl} target="_blank" rel="noreferrer" style={{ color: "#2563EB", fontWeight: 700 }}>
                    View {training.relievingLetterName || "relieving letter"} →
                  </a>
                </div>
              )}
            </Section>
          )}

          {!certification.skipped && (
            <Section title="Certification">
              <Row label="Certification" value={certification.name} />
              <Row label="Certificate ID" value={isScoresLocked ? "🔒 Locked (Free Tier)" : certification.certId} />
              <Row label="Verified" value={isScoresLocked ? "🔒 Locked (Free Tier)" : (certification.verified ? "Yes ✓" : "Self-reported")} />
            </Section>
          )}

          {/* DOCUMENT VAULT & ATTACHMENTS */}
          {Array.isArray(c.documentVault) && c.documentVault.length > 0 && (
            <Section title={`Document Vault & Verified Attachments (${c.documentVault.length})`}>
              {isScoresLocked ? (
                <Row label="Document Vault" value="🔒 Locked (Upgrade to Growth to view certificates)" />
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                  {c.documentVault.map((doc, idx) => (
                    <div
                      key={doc.id || idx}
                      style={{
                        background: "#F8FAFC",
                        border: "1px solid #E2E8F0",
                        borderRadius: 8,
                        padding: "10px 12px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                      }}
                    >
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700, color: "var(--navy)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {doc.title || doc.docName || `Document #${idx + 1}`}
                        </div>
                        <div style={{ fontSize: 11, color: "#64748B", textTransform: "capitalize" }}>
                          {(doc.docType || "Document").replace("_", " ")} {doc.issueYear ? `· ${doc.issueYear}` : ""}
                        </div>
                      </div>
                      {doc.docUrl && (
                        <a
                          href={getAssetUrl(doc.docUrl)}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            background: "var(--navy)",
                            color: "#fff",
                            textDecoration: "none",
                            padding: "5px 10px",
                            borderRadius: 6,
                            fontSize: 11,
                            fontWeight: 700,
                            whiteSpace: "nowrap",
                          }}
                        >
                          View ↗
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {isScoresLocked ? (
            <Section title="Assessment">
              <Row label="Proctored Assessment Score" value="🔒 Locked (Free Tier)" />
              <Row label="Scorecard" value="Upgrade to Growth Tier to unlock" />
            </Section>
          ) : (assessment.score !== undefined || assessment.foundationScore !== undefined) ? (
            <Section title="Assessment">
              <Row label="Topic / Domain" value={assessment.domain || assessment.topic || "RCM & Coding"} />
              <Row label="Proctored Score" value={`${assessment.foundationScore ?? assessment.score}%`} />
              <Row label="Medal Tier" value={assessment.medal && !String(assessment.medal).toLowerCase().includes("practice") ? `${assessment.medal === "Gold" ? "🥇 Gold" : assessment.medal === "Silver" ? "🥈 Silver" : assessment.medal === "Bronze" ? "🥉 Bronze" : assessment.medal} (${assessment.medal})` : (assessment.foundationScore >= 85 ? "🥇 Gold" : assessment.foundationScore >= 70 ? "🥈 Silver" : assessment.foundationScore >= 50 ? "🥉 Bronze" : `Assessment (${assessment.foundationScore ?? assessment.score ?? 0}%)`)} />
              <Row label="Percentile" value={assessment.percentile ? `Top ${100 - assessment.percentile}% (${assessment.percentile}th percentile)` : "68th percentile"} />
              <Row label="Passed / Verified" value={(assessment.passed ?? (assessment.foundationScore >= 70)) ? "Yes ✓" : "No"} />
              {Array.isArray(assessment.sectionScores) && assessment.sectionScores.length > 0 && (
                <div style={{ marginTop: 10, background: "#F8FAFC", padding: 10, borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", marginBottom: 6 }}>
                    Section-wise Breakdown:
                  </div>
                  {assessment.sectionScores.map((sec, sIdx) => (
                    <div key={sIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0" }}>
                      <span>{sec.icon || "📊"} {sec.sectionName}</span>
                      <b style={{ color: sec.score >= 70 ? "#15803D" : "#B45309" }}>{sec.score}%</b>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          ) : null}

          <Section title="AI Video Introduction & Assessment">
            {(videoIntro.videoUrl || c.videoUrl) ? (
              <div>
                <video controls src={getAssetUrl(videoIntro.videoUrl || c.videoUrl)} style={{ width: "100%", maxHeight: 300, borderRadius: 10, background: "#000", display: "block" }} />
                {videoIntro.aiScore !== undefined && (
                  <div style={{ marginTop: 8, fontSize: 13, color: "#15803D", fontWeight: 700 }}>
                    AI Communication Score: {videoIntro.aiScore}%
                  </div>
                )}
                {videoIntro.duration && <Row label="Duration" value={videoIntro.duration} />}
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#64748B", background: "#F8FAFC", padding: 12, borderRadius: 8, textAlign: "center" }}>
                No video introduction recorded yet
              </div>
            )}
          </Section>

          {isScoresLocked ? (
            <Section title="Live chart audit">
              <Row label="Live Chart Accuracy" value="🔒 Locked (Free Tier)" />
              <Row label="Audit Breakdown" value="Upgrade to Growth Tier to unlock" />
            </Section>
          ) : !(Number(liveCharts.realChartCount ?? liveCharts.totalCharts ?? liveCharts.liveChartsAudited) > 0) ? (
            <Section title="Live chart audit">
              <div style={{ fontSize: 13, color: "#64748B", background: "#F8FAFC", padding: 12, borderRadius: 8, textAlign: "center" }}>
                No live chart exposure recorded by this candidate
              </div>
            </Section>
          ) : (
            <Section title="Live chart audit">
              {liveCharts.tier && (
                <Row label="Live Chart Tier" value={`${liveCharts.tier === "Platinum" ? "🏆 Platinum" : liveCharts.tier === "Gold" ? "🥇 Gold" : liveCharts.tier === "Silver" ? "🥈 Silver" : "🥉 Bronze"} (${liveCharts.tier})`} />
              )}
              <Row label="Total charts coded" value={liveCharts.totalCharts ?? liveCharts.liveChartsAudited} />
              {(liveCharts.overallAccuracy ?? liveCharts.accuracyScore) != null && (
                <Row label="Overall accuracy" value={`${liveCharts.overallAccuracy ?? liveCharts.accuracyScore}%`} />
              )}
              {liveCharts.timePracticedHours > 0 && <Row label="Time practised" value={`${liveCharts.timePracticedHours} hrs`} />}
              <Row label="Verification method" value={liveCharts.verificationMethod || (liveCharts.verified ? "Verified ✓" : "Self-reported")} />
              {Array.isArray(liveCharts.selectedPlatforms) && liveCharts.selectedPlatforms.length > 0 && (
                <Row label="Platforms used" value={liveCharts.selectedPlatforms.join(", ")} />
              )}
              {Array.isArray(liveCharts.specialtyCharts) && liveCharts.specialtyCharts.length > 0 && (
                <div style={{ marginTop: 10, background: "#F8FAFC", border: "1px solid #E2E8F0", padding: "10px 12px", borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", marginBottom: 6 }}>
                    Specialty Chart Counts:
                  </div>
                  {liveCharts.specialtyCharts.map((sc, scIdx) => (
                    <div key={scIdx} style={{ display: "flex", justifyContent: "space-between", fontSize: 12, padding: "3px 0", borderBottom: scIdx < liveCharts.specialtyCharts.length - 1 ? "1px solid #F1F5F9" : "none" }}>
                      <span style={{ color: "var(--navy)", fontWeight: 600 }}>{sc.name}</span>
                      <span style={{ color: "#334155", fontWeight: 700 }}>{sc.count} charts ({sc.accuracy}%)</span>
                    </div>
                  ))}
                </div>
              )}
            </Section>
          )}

          {summary.summary && (
            <Section title="Candidate summary">
              <p style={{ fontSize: 13.5, color: "#334155", lineHeight: 1.6, margin: 0 }}>{summary.summary}</p>
            </Section>
          )}

          <Section title="Employment status">
            <Row label="Notice period" value={employment.status} />
            <Row label="Expected CTC" value={employment.expectedCtc} />
          </Section>

          <Section title="Verification">
            <Row label="Score" value={isScoresLocked ? "🔒 Locked (Free Tier)" : (c.score !== undefined ? `${c.score} / 100` : null)} />
            <Row label="Completed stages" value={(c.completedStages || []).length ? c.completedStages.join(", ") : "None yet"} />
          </Section>

          {(application.status === "rejected" || application.rejectionReason) && (
            <Section title="Rejection reason & notes">
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "12px 14px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#991B1B", display: "inline-flex", alignItems: "center", gap: 5 }}>
                    <i className="fa-solid fa-circle-xmark"></i> Status: Rejected
                  </span>
                  {onEditRejection && (
                    <button
                      type="button"
                      onClick={onEditRejection}
                      style={{
                        background: "#FFFFFF",
                        border: "1px solid #FCA5A5",
                        color: "#DC2626",
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "3px 8px",
                        borderRadius: 5,
                        cursor: "pointer",
                      }}
                    >
                      Edit Reason
                    </button>
                  )}
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#B91C1C" }}>
                  {application.rejectionReason || "Qualifications / Criteria mismatch"}
                </div>
                {application.rejectionDetails && (
                  <div style={{ fontSize: 12, color: "#7F1D1D", marginTop: 6, background: "#FFF", padding: "8px 10px", borderRadius: 6, border: "1px dashed #FCA5A5", lineHeight: 1.4 }}>
                    <strong>Feedback / Details:</strong> {application.rejectionDetails}
                  </div>
                )}
              </div>
            </Section>
          )}

          {(application.status === "matched" || application.status === "applied") && onShortlist && (
            <Section title="Recruiter decision">
              <div style={{ background: "#EFF6FF", border: "1.5px solid #BFDBFE", borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div style={{ fontSize: 13, color: "#1E3A8A", lineHeight: 1.45, flex: 1, minWidth: 220 }}>
                  Like this profile? Shortlist {basic.fullName || "this candidate"} for an interview{application.status === "matched" ? " - they will be added to your applicants and notified" : ""}. Not a fit? {application.status === "matched" ? "Remove them from this list." : "Reject with a reason."}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={updatingId === application._id}
                  onClick={onShortlist}
                  style={{ background: "var(--navy)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: updatingId === application._id ? "wait" : "pointer", whiteSpace: "nowrap" }}
                >
                  {updatingId === application._id ? "Shortlisting…" : "Shortlist for interview"}
                </button>
                {onCallInterview && (
                  <button
                    type="button"
                    disabled={updatingId === application._id}
                    onClick={onCallInterview}
                    style={{ background: "#F59E0B", color: "#0F172A", border: "none", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    Shortlist &amp; call for interview
                  </button>
                )}
                {onReject && (
                  <button
                    type="button"
                    disabled={updatingId === application._id}
                    onClick={onReject}
                    style={{ background: "#fff", color: "#B91C1C", border: "1.5px solid #FCA5A5", borderRadius: 10, padding: "10px 18px", fontSize: 13, fontWeight: 800, cursor: "pointer", whiteSpace: "nowrap" }}
                  >
                    {application.status === "matched" ? "Not a fit" : "Reject"}
                  </button>
                )}
                </div>
              </div>
            </Section>
          )}

          {application.status !== "matched" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Move to:</span>
            <select
              value={application.status}
              disabled={updatingId === application._id}
              onChange={(e) => onStatusChange(e.target.value)}
              style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontWeight: 600, color: "var(--navy)" }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{statusLabel(s)}</option>
              ))}
            </select>
          </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Small schedule box for "Shortlist & call for interview": date/time, mode and optional meeting link / address.
// Visible split of the JD match percentage: one bar per factor, points out of its maximum.
function MatchBreakdown({ application, compact = false }) {
  const rows = application?.matchBreakdown;
  if (!Array.isArray(rows) || rows.length === 0) return null;
  return (
    <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: compact ? "8px 10px" : "12px 14px", marginTop: compact ? 8 : 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 800, letterSpacing: "0.06em", color: "#475569", marginBottom: 6 }}>
        <span>MATCH SCORE SPLIT</span><span>{application.matchScore} / 100</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: compact ? "repeat(auto-fill, minmax(150px, 1fr))" : "1fr", gap: compact ? "6px 14px" : 8 }}>
        {rows.map((b) => (
          <div key={b.key} title={b.note}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 700, color: "#0F172A" }}>
              <span>{b.label}</span><span>{b.points}/{b.max}</span>
            </div>
            <div style={{ height: 5, background: "#E2E8F0", borderRadius: 4 }}>
              <div style={{ height: 5, borderRadius: 4, width: `${b.max ? (b.points / b.max) * 100 : 0}%`, background: b.points >= b.max * 0.7 ? "#22C55E" : b.points > 0 ? "var(--gold)" : "#CBD5E1" }} />
            </div>
            {!compact && <div style={{ fontSize: 10.5, color: "#64748B", marginTop: 1 }}>{b.note}</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function CallInterviewModal({ application, busy = false, onClose, onConfirm }) {
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [dtError, setDtError] = useState("");
  const [type, setType] = useState("Online");
  const [link, setLink] = useState("");
  const name = application?.candidate?.basicInfo?.fullName || "the candidate";
  const field = { width: "100%", boxSizing: "border-box", padding: "9px 12px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontWeight: 600 };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.65)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 10000, padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, maxWidth: 460, width: "100%", padding: 22 }} onClick={(e) => e.stopPropagation()}>
        <h3 style={{ margin: "0 0 4px", fontSize: 17, color: "var(--navy)" }}>Call {name} for interview</h3>
        <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 14 }}>{application?.jobTitle || application?.jobId}. {name} is shortlisted and notified with these details.</div>
        <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>DATE &amp; TIME</label>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <input type="date" value={date} min={new Date().toISOString().slice(0, 10)} onChange={(e) => { setDate(e.target.value); setDtError(""); }} style={{ ...field, flex: 1 }} />
          <input type="time" value={time} onChange={(e) => { setTime(e.target.value); setDtError(""); }} style={{ ...field, flex: 1 }} />
        </div>
        {dtError ? <div style={{ fontSize: 11.5, color: "#B91C1C", marginBottom: 12, fontWeight: 700 }}>{dtError}</div>
          : <div style={{ fontSize: 11.5, color: "#94A3B8", marginBottom: 12 }}>Optional. Leave both empty to send the link now and agree the time with the candidate.</div>}
        <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>MODE OF INTERVIEW</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{ ...field, marginBottom: 12 }}>
          {["Online", "Offline (walk-in)", "Hybrid"].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
        <label style={{ fontSize: 11, fontWeight: 800, color: "#475569" }}>{type === "Online" ? "MEETING LINK" : "ADDRESS / MEETING LINK"} (OPTIONAL)</label>
        <input type="text" value={link} onChange={(e) => setLink(e.target.value)} placeholder={type === "Online" ? "https://meet.google.com/..." : "Office address or link"} style={{ ...field, marginBottom: 16 }} />
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose} style={{ background: "#fff", border: "1px solid #CBD5E1", borderRadius: 10, padding: "9px 16px", fontWeight: 700, cursor: "pointer" }}>Cancel</button>
          <button type="button" disabled={busy} onClick={() => {
            if ((date && !time) || (!date && time)) { setDtError(date ? "Pick a time as well as the date." : "Pick a date as well as the time."); return; }
            onConfirm({ when: date && time ? `${date}T${time}` : "", type, link: link.trim() });
          }} style={{ background: "var(--navy)", color: "#fff", border: "none", borderRadius: 10, padding: "9px 18px", fontWeight: 800, cursor: busy ? "not-allowed" : "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Scheduling…" : "Schedule & notify"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Dedicated modal for companies to input and refine the rejection reason and details
function RejectionReasonModal({ application, initialReason = "", initialDetails = "", updating = false, onClose, onConfirm }) {
  const PRESET_REASONS = [
    "Education Mismatch (Non-Life Science / Ineligible Degree)",
    "Missing Mandatory Certifications / Keywords (CPC / ICD-10 / CPT / HCPCS)",
    "Experience Criteria Mismatch (Fresher drive requires 0–2 yrs)",
    "Location / Relocation Mismatch (Outside preferred cities)",
    "Assessment / Technical Coding Score Below Bar (<70%)",
    "Candidate Communication / Language Requirement Not Met",
    "Position Already Filled / Requisition Closed",
    "Notice Period / Immediate Joining Required",
    "Other / Custom Reason",
  ];

  const [selectedPreset, setSelectedPreset] = useState(
    PRESET_REASONS.includes(initialReason) ? initialReason : (initialReason ? "Other / Custom Reason" : PRESET_REASONS[0])
  );
  const [customReason, setCustomReason] = useState(
    initialReason || PRESET_REASONS[0]
  );
  const [details, setDetails] = useState(initialDetails || "");

  const candidateName =
    application?.candidate?.basicInfo?.fullName ||
    application?.candidate?.basic?.fullName ||
    application?.candidateName ||
    "the candidate";
  const jobTitle = application?.jobTitle || application?.jobId || "Role";

  const handleSelectPreset = (preset) => {
    setSelectedPreset(preset);
    if (preset !== "Other / Custom Reason") {
      setCustomReason(preset);
    } else {
      setCustomReason("");
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const finalReason = customReason.trim() || selectedPreset || "Qualifications / Criteria mismatch";
    onConfirm(finalReason, details.trim());
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(15, 23, 42, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          maxWidth: 540,
          width: "100%",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08)",
          overflow: "hidden",
          border: "1px solid #FECACA",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ background: "#FEF2F2", padding: "18px 22px", borderBottom: "1px solid #FEE2E2", display: "flex", alignItems: "flex-start", gap: 14 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: "50%",
              background: "#FEE2E2",
              color: "#DC2626",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              flexShrink: 0,
            }}
          >
            <i className="fa-solid fa-circle-xmark"></i>
          </div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#991B1B" }}>
              Reject Application
            </h3>
            <p style={{ margin: "4px 0 0", fontSize: 12.5, color: "#7F1D1D", lineHeight: 1.4 }}>
              Record rejection reason for <strong>{candidateName}</strong> for <strong>{jobTitle}</strong>. This feedback will be displayed on the candidate pipeline and the academy&apos;s dashboard.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{ background: "none", border: "none", color: "#991B1B", fontSize: 18, cursor: "pointer", padding: "0 4px" }}
          >
            ✕
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} style={{ padding: "20px 24px" }}>
          {/* Quick Preset Selector */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Select Reason Category / Preset:
            </label>
            <select
              value={selectedPreset}
              onChange={(e) => handleSelectPreset(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 13,
                fontWeight: 600,
                color: "#0F172A",
                background: "#F8FAFC",
              }}
            >
              {PRESET_REASONS.map((reason) => (
                <option key={reason} value={reason}>
                  {reason}
                </option>
              ))}
            </select>
          </div>

          {/* Reason Input Box */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Reason for Rejection <span style={{ color: "#DC2626" }}>*</span>:
            </label>
            <input
              type="text"
              required
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="e.g. Education mismatch - requires B.Sc / B.Pharm degree"
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 13,
                color: "#0F172A",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Additional Details Textarea */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#334155", marginBottom: 6 }}>
              Additional Details / Constructive Notes (Optional):
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Add specific notes, test scores, or guidance for the academy coordinator..."
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                fontSize: 13,
                color: "#0F172A",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
            <span style={{ fontSize: 11, color: "#64748B", display: "block", marginTop: 4 }}>
              Visible to the partner academy to help coach and redirect talent.
            </span>
          </div>

          {/* Actions */}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 14, borderTop: "1px solid #F1F5F9" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={updating}
              style={{
                padding: "9px 18px",
                borderRadius: 8,
                border: "1px solid #CBD5E1",
                background: "#FFF",
                color: "#475569",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updating || !customReason.trim()}
              style={{
                padding: "9px 20px",
                borderRadius: 8,
                border: "none",
                background: "#DC2626",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                cursor: updating ? "not-allowed" : "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                boxShadow: "0 2px 4px rgba(220, 38, 38, 0.25)",
              }}
            >
              {updating ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin"></i> Saving...
                </>
              ) : (
                <>
                  <i className="fa-solid fa-circle-xmark"></i> Confirm Rejection
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
