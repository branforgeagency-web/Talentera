import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";
import { getStage } from "../data/companyOnboardingStages";

const STAGE9 = getStage("9");
const REQUIRED_IDS = new Set(STAGE9.items.filter((i) => i.tag === "must").map((i) => i.id));

function emptyFormState() {
  const state = {};
  STAGE9.items.forEach((item) => {
    state[item.id] = item.input === "multi" ? [] : "";
  });
  return state;
}

// The "post another job" screen for companies that are already fully
// onboarded and KYC-verified - see companyOnboardingStages.js's
// isFullyOnboarded(). Previously a company could only ever have exactly one
// live JD (the one captured during onboarding Stage 9); this reuses that
// same field vocabulary against the new POST /api/company/jobs endpoint so
// a verified company can publish as many roles as it actually has open.
export default function CompanyJobs() {
  const navigate = useNavigate();
  const toast = useToast();
  const { company: authCompany, logout } = useCompanyAuth();

  const [jobs, setJobs] = useState([]);
  const [canPostMoreJobs, setCanPostMoreJobs] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyFormState);
  const [submitting, setSubmitting] = useState(false);
  const [togglingId, setTogglingId] = useState(null);

  useEffect(() => {
    fetchJobs();
  }, []);

  async function fetchJobs() {
    setLoading(true);
    try {
      const res = await companyApi.get("/company/jobs");
      setJobs(res.data?.jobs || []);
      setCanPostMoreJobs(Boolean(res.data?.canPostMoreJobs));
    } catch (err) {
      console.error(err);
      toast("Couldn't load your job posts.", "!");
    } finally {
      setLoading(false);
    }
  }

  function setField(id, value) {
    setForm((prev) => ({ ...prev, [id]: value }));
  }

  function toggleMulti(id, opt) {
    setForm((prev) => {
      const current = prev[id] || [];
      const next = current.includes(opt) ? current.filter((o) => o !== opt) : [...current, opt];
      return { ...prev, [id]: next };
    });
  }

  function isEmpty(v) {
    if (v === undefined || v === null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    return false;
  }

  async function handlePost(e) {
    e.preventDefault();
    const missing = STAGE9.items.filter((i) => REQUIRED_IDS.has(i.id) && isEmpty(form[i.id]));
    if (missing.length > 0) {
      toast(`Fill in: ${missing.map((i) => i.name).join(", ")}`, "!");
      return;
    }
    setSubmitting(true);
    try {
      await companyApi.post("/company/jobs", form);
      toast("Submitted for Talentera's approval ✓", "✓");
      setShowForm(false);
      setForm(emptyFormState());
      fetchJobs();
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't post this job.", "!");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleJob(job) {
    if (job.source !== "posted") return; // the onboarding first-JD has no close toggle
    setTogglingId(job.id);
    try {
      await companyApi.put(`/company/jobs/${job.id}`, { published: !job.published });
      fetchJobs();
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't update this job.", "!");
    } finally {
      setTogglingId(null);
    }
  }

  const inputStyle = { width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, color: "var(--navy)", outline: "none", boxSizing: "border-box" };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)" }}>
      <header style={{ background: "var(--navy)", padding: "16px 48px", display: "flex", justifyContent: "space-between", alignItems: "center", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ cursor: "pointer" }} onClick={() => navigate("/companies/jobs")}>
          <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
            JOB POSTS
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/companies/directory" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Hire Verified Talent
          </Link>
          <Link to="/companies/jobs" style={{ color: "var(--gold)", fontSize: 13, fontWeight: 700, textDecoration: "none", padding: "6px 12px", background: "rgba(229,168,46,0.12)", borderRadius: 6 }}>
            Job Posts
          </Link>
          <Link to="/companies/applicants" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Applicants
          </Link>
          <Link to="/companies/dashboard" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            Edit Profile
          </Link>
          {authCompany && (
            <button
              type="button"
              onClick={() => { logout(); navigate("/companies"); }}
              style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "#fff", padding: "8px 14px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
            >
              Logout
            </button>
          )}
        </div>
      </header>

      <main style={{ maxWidth: 800, margin: "0 auto", padding: "32px 24px 80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Job Posts</h1>
            <p style={{ fontSize: 13.5, color: "#64748B" }}>
              Your profile is complete and verified — post as many open roles as you need. Every job post is
              reviewed by Talentera staff before it appears on the public job board.
            </p>
          </div>
          {canPostMoreJobs ? (
            <button
              type="button"
              onClick={() => setShowForm((v) => !v)}
              style={{ background: "var(--gold)", color: "var(--navy)", border: "none", padding: "12px 20px", borderRadius: 10, fontWeight: 800, fontSize: 13.5, cursor: "pointer" }}
            >
              {showForm ? "Cancel" : "+ Post a new job"}
            </button>
          ) : (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, maxWidth: 320 }}>
              🔒 Complete Account &amp; KYC verification to post additional jobs.{" "}
              <Link to="/companies/dashboard" style={{ color: "#92400E", fontWeight: 800 }}>Verify now →</Link>
            </div>
          )}
        </div>

        {showForm && (
          <form onSubmit={handlePost} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 16, padding: 24, marginBottom: 28 }}>
            <h2 style={{ fontSize: 16, fontWeight: 800, marginBottom: 16 }}>New job details</h2>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {STAGE9.items.map((item) => {
                const isFullWidth = item.input === "textarea" || item.input === "multi";
                return (
                  <div key={item.id} style={{ gridColumn: isFullWidth ? "1 / -1" : "auto" }}>
                    <label style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase", color: "#475569", marginBottom: 6 }}>
                      {item.name}
                      {REQUIRED_IDS.has(item.id) && <span style={{ color: "#DC2626" }}>*</span>}
                    </label>

                    {["text", "number"].includes(item.input) && (
                      <input
                        type={item.input}
                        style={inputStyle}
                        placeholder={item.placeholder}
                        value={form[item.id]}
                        onChange={(e) => setField(item.id, e.target.value)}
                      />
                    )}

                    {item.input === "select" && (
                      <select style={{ ...inputStyle, background: "#fff" }} value={form[item.id]} onChange={(e) => setField(item.id, e.target.value)}>
                        <option value="">Select…</option>
                        {(item.options || []).map((opt) => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    )}

                    {item.input === "textarea" && (
                      <textarea
                        style={{ ...inputStyle, minHeight: 70 }}
                        placeholder={item.placeholder}
                        maxLength={item.maxlength}
                        value={form[item.id]}
                        onChange={(e) => setField(item.id, e.target.value)}
                      />
                    )}

                    {item.input === "multi" && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                        {(item.options || []).map((opt) => {
                          const active = (form[item.id] || []).includes(opt);
                          return (
                            <button
                              type="button"
                              key={opt}
                              onClick={() => toggleMulti(item.id, opt)}
                              style={{
                                padding: "6px 12px",
                                borderRadius: 999,
                                border: active ? "1.5px solid var(--navy)" : "1.5px solid #E2E8F0",
                                background: active ? "var(--navy)" : "#fff",
                                color: active ? "#fff" : "#475569",
                                fontSize: 12,
                                fontWeight: 600,
                                cursor: "pointer",
                              }}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              type="submit"
              disabled={submitting}
              style={{ marginTop: 20, width: "100%", padding: 14, background: "var(--gold)", color: "var(--navy)", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer" }}
            >
              {submitting ? "Submitting…" : "Submit for approval →"}
            </button>
          </form>
        )}

        {loading && <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading your job posts…</div>}

        {!loading && jobs.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
            No jobs posted yet.
          </div>
        )}

        {!loading &&
          jobs.map((job) => {
            const f = job.fields || {};
            const isOpen = job.published && !job.closedAt;
            const approvalStatus = job.approvalStatus || "pending";

            // Approval status takes priority over Open/Closed - a job isn't
            // visible to candidates at all until Talentera staff approve it,
            // however the company itself is toggling published/closed.
            let statusLabel = isOpen ? "Open" : "Closed";
            let statusBg = isOpen ? "#DCFCE7" : "#F1F5F9";
            let statusColor = isOpen ? "#166534" : "#64748B";
            if (isOpen && approvalStatus === "pending") {
              statusLabel = "⏳ Waiting for approval";
              statusBg = "#FEF3C7";
              statusColor = "#92400E";
            } else if (isOpen && approvalStatus === "rejected") {
              statusLabel = "✕ Rejected";
              statusBg = "#FEE2E2";
              statusColor = "#B91C1C";
            }

            return (
              <div key={job.jobId} style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 14, padding: "18px 20px", marginBottom: 14, display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                    <strong style={{ fontSize: 15.5 }}>{f.roletitle || "Untitled role"}</strong>
                    <span style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", padding: "2px 9px", borderRadius: 999, background: statusBg, color: statusColor }}>
                      {statusLabel}
                    </span>
                    {job.source === "onboarding" && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: "#94A3B8" }}>· From onboarding</span>
                    )}
                  </div>
                  <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 6 }}>
                    {job.jobId} {f.location ? `· ${f.location}` : ""} {f.workmode ? `· ${f.workmode}` : ""}
                  </div>
                  {isOpen && approvalStatus === "pending" && (
                    <div style={{ fontSize: 12, color: "#92400E", marginBottom: 6 }}>
                      Talentera staff are reviewing this job post — it isn't visible on the public job board yet.
                    </div>
                  )}
                  {approvalStatus === "rejected" && job.rejectionReason && (
                    <div style={{ fontSize: 12, color: "#B91C1C", background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 6, padding: "6px 10px", marginBottom: 6, maxWidth: 480 }}>
                      <strong>Not approved:</strong> {job.rejectionReason}
                      {job.source === "posted" && " Fix the issue and use Reopen listing below to resubmit."}
                    </div>
                  )}
                  <Link to="/companies/applicants" style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
                    {job.applicantsCount} applicant{job.applicantsCount === 1 ? "" : "s"} →
                  </Link>
                </div>

                {job.source === "posted" && (
                  <button
                    type="button"
                    disabled={togglingId === job.id}
                    onClick={() => toggleJob(job)}
                    style={{ alignSelf: "flex-start", padding: "8px 16px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", color: "var(--navy)", fontWeight: 700, fontSize: 12.5, cursor: "pointer" }}
                  >
                    {isOpen ? "Close listing" : approvalStatus === "rejected" ? "Reopen & resubmit" : "Reopen listing"}
                  </button>
                )}
              </div>
            );
          })}
      </main>
    </div>
  );
}
