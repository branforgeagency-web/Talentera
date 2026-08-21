import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api/client";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { buildJobSearchParams } from "../utils/jobFilters.js";

const STATUS_CONFIG = {
  rejected: {
    label: "✕ Application Rejected",
    badgeLabel: "Rejected",
    bg: "#FEE2E2",
    color: "#B91C1C",
    border: "#FCA5A5",
    icon: "✕",
    message: "The employer reviewed your profile and updated your status to Rejected.",
  },
  shortlisted: {
    label: "★ Shortlisted",
    badgeLabel: "Shortlisted",
    bg: "#DBEAFE",
    color: "#1D4ED8",
    border: "#93C5FD",
    icon: "★",
    message: "Great news! The employer shortlisted your profile for this role.",
  },
  interviewing: {
    label: "🗓 Interviewing",
    badgeLabel: "Interviewing",
    bg: "#FEF3C7",
    color: "#B45309",
    border: "#FDE68A",
    icon: "🗓",
    message: "An interview stage has been scheduled by the employer.",
  },
  hired: {
    label: "🎉 Hired / Offered",
    badgeLabel: "Hired",
    bg: "#DCFCE7",
    color: "#166534",
    border: "#86EFAC",
    icon: "🎉",
    message: "Congratulations! You have been selected and hired for this position.",
  },
  applied: {
    label: "✓ Applied",
    badgeLabel: "Applied",
    bg: "#F1F5F9",
    color: "#334155",
    border: "#CBD5E1",
    icon: "✓",
    message: "Your application has been submitted and is currently under employer review.",
  },
};

// Work modes shown in onboarding Stage 9 (frontend/src/data/companyOnboardingStages.js) -
// kept as a plain list here rather than importing that config, since this is
// just a filter dropdown and doesn't need the full stage field definitions.
const WORK_MODE_OPTIONS = ["Remote", "Hybrid", "On-site"];

export default function Jobs() {
  const navigate = useNavigate();
  const toast = useToast();
  const { candidate, loading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState("jobs"); // "jobs" | "applications"
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // Search/filter state - previously candidates had no way to narrow the
  // open-roles list at all, despite the landing page promising companies
  // could filter candidates "by score, location, domain." See
  // IMPROVEMENT_ROADMAP.md "No job search or filtering."
  const [searchInput, setSearchInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [workModeFilter, setWorkModeFilter] = useState("");

  const [myApplications, setMyApplications] = useState([]);
  const [appliedJobIds, setAppliedJobIds] = useState([]);
  const [applyingJobId, setApplyingJobId] = useState(null);

  useEffect(() => {
    fetchJobs({});
  }, []);

  useEffect(() => {
    if (candidate) fetchMyApplications();
  }, [candidate]);

  async function fetchJobs({ q, location, workMode } = {}) {
    setLoading(true);
    setLoadError(null);
    try {
      const params = buildJobSearchParams({ q, location, workMode });
      const res = await api.get("/public/jobs", { params });
      setJobs(res.data?.jobs || []);
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load open roles. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  function handleSearchSubmit(e) {
    e.preventDefault();
    fetchJobs({ q: searchInput, location: locationInput, workMode: workModeFilter });
  }

  function handleClearFilters() {
    setSearchInput("");
    setLocationInput("");
    setWorkModeFilter("");
    fetchJobs({});
  }

  const hasActiveFilters = Boolean(searchInput || locationInput || workModeFilter);

  async function fetchMyApplications() {
    try {
      const res = await api.get("/candidate/applications");
      const apps = res.data?.applications || [];
      setMyApplications(apps);
      setAppliedJobIds(apps.map((a) => a.jobId));
    } catch (err) {
      console.error(err);
    }
  }

  async function handleApply(jobId) {
    if (authLoading) return;
    if (!candidate) {
      toast("Create your free candidate profile to apply.", "!");
      navigate("/register", { state: { redirectTo: "/jobs" } });
      return;
    }
    setApplyingJobId(jobId);
    try {
      const res = await api.post(`/candidate/apply/${jobId}`);
      if (res.data?.application) {
        setMyApplications((prev) => [res.data.application, ...prev]);
      }
      setAppliedJobIds((prev) => [...prev, jobId]);
      toast("Application submitted successfully!", "✓");
    } catch (err) {
      const msg = err.response?.data?.message || "Couldn't submit your application.";
      if (err.response?.status === 400 && /already applied/i.test(msg)) {
        setAppliedJobIds((prev) => (prev.includes(jobId) ? prev : [...prev, jobId]));
      }
      toast(msg, "!");
    } finally {
      setApplyingJobId(null);
    }
  }

  const cardStyle = {
    background: "#fff",
    border: "1px solid #E5E7EB",
    borderRadius: 16,
    padding: "22px 24px",
    marginBottom: 16,
    boxShadow: "0 4px 16px rgba(10,31,61,0.04)",
  };

  const appMap = myApplications.reduce((acc, app) => {
    if (app.jobId) acc[app.jobId] = app;
    return acc;
  }, {});

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream, #FAF7F0)" }}>
      {/* Navbar */}
      <header
        style={{
          background: "var(--navy, #0A1F3D)",
          padding: "16px 48px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          {candidate && (
            <Link to="/dashboard" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
              My Candidate Portal
            </Link>
          )}
          <Link to="/" style={{ color: "rgba(255,255,255,0.8)", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
            ← Back Home
          </Link>
          {!candidate && (
            <Link
              to="/register"
              style={{
                background: "var(--gold, #E5A82E)",
                color: "var(--navy, #0A1F3D)",
                padding: "9px 18px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 800,
                textDecoration: "none",
              }}
            >
              Create free profile →
            </Link>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 880, margin: "0 auto", padding: "40px 24px 80px" }}>
        {/* Title Header */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 11, letterSpacing: "0.14em", color: "var(--gold, #E5A82E)", marginBottom: 8 }}>
            CANDIDATE CAREERS & TRACKING
          </div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--navy, #0A1F3D)", marginBottom: 8 }}>
            Roles from verified RCM employers
          </h1>
          <p style={{ fontSize: 14, color: "#64748B" }}>
            Every listing here comes from a company that completed Talentera onboarding and published a live requisition.
          </p>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20 }}>
          <button
            type="button"
            onClick={() => setActiveTab("jobs")}
            style={{
              padding: "10px 20px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 14,
              cursor: "pointer",
              border: activeTab === "jobs" ? "1.5px solid var(--navy, #0A1F3D)" : "1.5px solid #CBD5E1",
              background: activeTab === "jobs" ? "var(--navy, #0A1F3D)" : "#fff",
              color: activeTab === "jobs" ? "#fff" : "#475569",
              transition: "all 0.2s",
            }}
          >
            🏢 Open Roles ({jobs.length})
          </button>
          {candidate && (
            <button
              type="button"
              onClick={() => {
                setActiveTab("applications");
                fetchMyApplications();
              }}
              style={{
                padding: "10px 20px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14,
                cursor: "pointer",
                border: activeTab === "applications" ? "1.5px solid var(--navy, #0A1F3D)" : "1.5px solid #CBD5E1",
                background: activeTab === "applications" ? "var(--navy, #0A1F3D)" : "#fff",
                color: activeTab === "applications" ? "#fff" : "#475569",
                transition: "all 0.2s",
              }}
            >
              📋 My Applications ({myApplications.length})
            </button>
          )}
        </div>

        {/* Search / Filter bar */}
        {activeTab === "jobs" && (
          <form
            onSubmit={handleSearchSubmit}
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              alignItems: "center",
              background: "#fff",
              border: "1px solid #E5E7EB",
              borderRadius: 14,
              padding: 12,
              marginBottom: 24,
            }}
          >
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search role, specialty, or company…"
              style={{ flex: "2 1 220px", minWidth: 180, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 13.5 }}
            />
            <input
              type="text"
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              placeholder="Location"
              style={{ flex: "1 1 140px", minWidth: 120, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 13.5 }}
            />
            <select
              value={workModeFilter}
              onChange={(e) => setWorkModeFilter(e.target.value)}
              style={{ flex: "1 1 130px", minWidth: 120, border: "1.5px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", fontSize: 13.5, background: "#fff" }}
            >
              <option value="">Any work mode</option>
              {WORK_MODE_OPTIONS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <button
              type="submit"
              style={{ padding: "10px 20px", borderRadius: 8, border: "none", fontWeight: 800, fontSize: 13.5, cursor: "pointer", background: "var(--navy, #0A1F3D)", color: "#fff" }}
            >
              Search
            </button>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                style={{ padding: "10px 14px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontWeight: 700, fontSize: 13, cursor: "pointer", background: "#fff", color: "#475569" }}
              >
                Clear
              </button>
            )}
          </form>
        )}

        {/* TAB 1: OPEN ROLES */}
        {activeTab === "jobs" && (
          <>
            {loading && <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading open roles…</div>}

            {!loading && loadError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 16, borderRadius: 10, fontSize: 13.5 }}>
                {loadError}
              </div>
            )}

            {!loading && !loadError && jobs.length === 0 && (
              <div style={{ textAlign: "center", padding: 60, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
                {hasActiveFilters ? (
                  <>
                    No roles match your search.{" "}
                    <button type="button" onClick={handleClearFilters} style={{ color: "var(--gold, #E5A82E)", fontWeight: 700, background: "none", border: "none", cursor: "pointer", padding: 0, font: "inherit" }}>
                      Clear filters
                    </button>{" "}
                    to see all open roles.
                  </>
                ) : (
                  <>
                    No roles are live right now — check back soon, or{" "}
                    <Link to="/register" style={{ color: "var(--gold, #E5A82E)", fontWeight: 700 }}>
                      build your verified profile
                    </Link>{" "}
                    so you're first in line when one opens.
                  </>
                )}
              </div>
            )}

            {!loading &&
              !loadError &&
              jobs.map((job) => {
                const app = appMap[job.jobId];
                const hasApplied = Boolean(app || appliedJobIds.includes(job.jobId));
                const st = app ? STATUS_CONFIG[app.status || "applied"] : STATUS_CONFIG.applied;

                return (
                  <div key={job.jobId} style={cardStyle}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy, #0A1F3D)", margin: 0 }}>{job.roleTitle}</h3>
                          {job.verifiedEmployer && (
                            <span style={{ fontSize: 10, fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 999 }}>
                              ✓ VERIFIED EMPLOYER
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 13.5, color: "#475569", marginBottom: 10 }}>
                          {job.companyName}
                          {job.specialty ? ` · ${job.specialty}` : ""}
                          {job.location ? ` · ${job.location}` : ""}
                          {job.workMode ? ` · ${job.workMode}` : ""}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11.5, color: "#334155" }}>
                          {job.expMin !== null && job.expMax !== null && (
                            <span style={{ background: "#F1F5F9", padding: "4px 10px", borderRadius: 999 }}>
                              {job.expMin}–{job.expMax} yrs exp
                            </span>
                          )}
                          {job.compMin !== null && job.compMax !== null && (
                            <span style={{ background: "#F1F5F9", padding: "4px 10px", borderRadius: 999 }}>
                              ₹{job.compMin}–{job.compMax} LPA
                            </span>
                          )}
                          {job.openings !== null && (
                            <span style={{ background: "#F1F5F9", padding: "4px 10px", borderRadius: 999 }}>
                              {job.openings} opening{job.openings === 1 ? "" : "s"}
                            </span>
                          )}
                          {job.urgency && <span style={{ background: "#FEF3C7", color: "#B45309", padding: "4px 10px", borderRadius: 999 }}>{job.urgency}</span>}
                        </div>
                      </div>

                      {hasApplied ? (
                        <div style={{ textAlign: "right" }}>
                          <span
                            style={{
                              display: "inline-block",
                              padding: "10px 18px",
                              borderRadius: 10,
                              border: `1.5px solid ${st.border}`,
                              fontWeight: 800,
                              fontSize: 13,
                              background: st.bg,
                              color: st.color,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {st.label}
                          </span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={applyingJobId === job.jobId}
                          onClick={() => handleApply(job.jobId)}
                          style={{
                            padding: "12px 22px",
                            borderRadius: 10,
                            border: "none",
                            fontWeight: 800,
                            fontSize: 13.5,
                            cursor: "pointer",
                            background: "var(--gold, #E5A82E)",
                            color: "var(--navy, #0A1F3D)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {applyingJobId === job.jobId ? "Applying…" : "Apply →"}
                        </button>
                      )}
                    </div>

                    {job.mustHaves && (
                      <div style={{ marginTop: 12, fontSize: 12.5, color: "#64748B", borderTop: "1px solid #F1F5F9", paddingTop: 10 }}>
                        <strong style={{ color: "#334155" }}>Must-haves: </strong>
                        {job.mustHaves}
                      </div>
                    )}
                  </div>
                );
              })}
          </>
        )}

        {/* TAB 2: MY APPLICATIONS */}
        {activeTab === "applications" && (
          <div>
            {myApplications.length === 0 ? (
              <div style={{ textAlign: "center", padding: 60, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
                You haven't submitted any job applications yet. Switch to the <strong>Open Roles</strong> tab above to browse and apply!
              </div>
            ) : (
              myApplications.map((app) => {
                const st = STATUS_CONFIG[app.status || "applied"] || STATUS_CONFIG.applied;
                const companyName = app.companyId?.companyName || "Employer";
                const roleTitle = app.companyId?.stage9?.roletitle || "Applied Position";
                const location = app.companyId?.stage9?.location || "";
                const appliedDate = app.createdAt ? new Date(app.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

                return (
                  <div key={app._id} style={{ ...cardStyle, borderLeft: `5px solid ${st.color}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                          <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy, #0A1F3D)", margin: 0 }}>{roleTitle}</h3>
                          <span
                            style={{
                              padding: "4px 12px",
                              borderRadius: 999,
                              fontWeight: 800,
                              fontSize: 11.5,
                              background: st.bg,
                              color: st.color,
                              border: `1px solid ${st.border}`,
                            }}
                          >
                            {st.badgeLabel}
                          </span>
                        </div>

                        <div style={{ fontSize: 13.5, color: "#475569", marginBottom: 12 }}>
                          🏢 <strong>{companyName}</strong> {location ? `· ${location}` : ""} {appliedDate ? `· Applied on ${appliedDate}` : ""}
                        </div>

                        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", fontSize: 13, color: "#334155" }}>
                          <span style={{ fontWeight: 700, color: st.color }}>{st.icon} Status Note: </span>
                          {st.message}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>
    </div>
  );
}
