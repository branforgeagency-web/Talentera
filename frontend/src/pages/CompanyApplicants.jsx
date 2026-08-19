import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import companyApi from "../api/companyClient";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

const STATUS_OPTIONS = ["applied", "shortlisted", "interviewing", "hired", "rejected"];

const STATUS_STYLE = {
  applied: { bg: "#F1F5F9", color: "#334155" },
  shortlisted: { bg: "#DBEAFE", color: "#1D4ED8" },
  interviewing: { bg: "#FEF3C7", color: "#B45309" },
  hired: { bg: "#DCFCE7", color: "#166534" },
  rejected: { bg: "#FEE2E2", color: "#B91C1C" },
};

// The company-facing half of the ATS loop that backend/routes/company.js
// already had fully built (GET /company/applications,
// PUT /company/applications/:id/status) but nothing in the frontend ever
// called - a company could publish a JD and then had no page to see who
// applied to it.
export default function CompanyApplicants() {
  const navigate = useNavigate();
  const toast = useToast();
  const { company, logout } = useCompanyAuth();

  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [isKycVerified, setIsKycVerified] = useState(false);
  const [statusFilter, setStatusFilter] = useState("all");
  const [jobFilter, setJobFilter] = useState("all");
  const [updatingId, setUpdatingId] = useState(null);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    fetchApplications();
  }, []);

  async function fetchApplications() {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await companyApi.get("/company/applications");
      setApplications(res.data?.applications || []);
      setIsKycVerified(Boolean(res.data?.isKycVerified));
    } catch (err) {
      console.error(err);
      setLoadError("Couldn't load your applicants. Please refresh the page.");
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(appId, status) {
    setUpdatingId(appId);
    try {
      const res = await companyApi.put(`/company/applications/${appId}/status`, { status });
      const nextStatus = res.data.application.status;
      setApplications((prev) => prev.map((a) => (a._id === appId ? { ...a, status: nextStatus } : a)));
      setSelectedApp((prev) => (prev && prev._id === appId ? { ...prev, status: nextStatus } : prev));
      toast(`Marked as ${status}.`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't update status.", "!");
    } finally {
      setUpdatingId(null);
    }
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
          <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
          <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
            APPLICANTS
          </div>
        </div>
        <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
          <Link to="/companies/dashboard" style={{ color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 700, textDecoration: "none" }}>
            ← Dashboard
          </Link>
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
              <Link to="/companies/dashboard" style={{ color: "#92400E", fontWeight: 800 }}>Verify now →</Link>
            </div>
          )}
        </div>

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
                {s} {s !== "all" ? `(${applications.filter((a) => a.status === s).length})` : `(${applications.length})`}
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

        {loading && <div style={{ textAlign: "center", padding: 60, color: "#64748B" }}>Loading applicants…</div>}

        {!loading && loadError && (
          <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 16, borderRadius: 10, fontSize: 13.5 }}>
            {loadError}
          </div>
        )}

        {!loading && !loadError && applications.length === 0 && (
          <div style={{ textAlign: "center", padding: 60, color: "#64748B", background: "#fff", borderRadius: 16, border: "1px dashed #E2E8F0" }}>
            No applications yet. Once your published JD is live, candidates who apply will show up here.
          </div>
        )}

        {!loading &&
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
                      Job ID {app.jobId} · Applied {app.createdAt ? new Date(app.createdAt).toLocaleDateString() : ""} · Verification score {c.score ?? "—"}
                    </div>
                    {app.coverNote && (
                      <div style={{ marginTop: 8, fontSize: 12.5, color: "#334155", background: "#F8FAFC", padding: "8px 10px", borderRadius: 8 }}>
                        {app.coverNote}
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 800, textTransform: "uppercase", background: style.bg, color: style.color, padding: "4px 12px", borderRadius: 999 }}>
                      {app.status}
                    </span>
                    <select
                      value={app.status}
                      disabled={updatingId === app._id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => updateStatus(app._id, e.target.value)}
                      style={{ fontSize: 12.5, padding: "6px 10px", borderRadius: 8, border: "1px solid #CBD5E1", fontWeight: 600, color: "var(--navy)" }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
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
          updatingId={updatingId}
          onStatusChange={(status) => updateStatus(selectedApp._id, status)}
          onClose={() => setSelectedApp(null)}
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
function ApplicantDetailModal({ application, updatingId, onStatusChange, onClose }) {
  const c = application.candidate || {};
  const basic = c.basicInfo || {};
  const training = c.training || {};
  const certification = c.certification || {};
  const assessment = c.assessment || {};
  const videoIntro = c.videoIntro || {};
  const liveCharts = c.liveCharts || {};
  const summary = c.summary || {};
  const employment = c.employmentStatus || {};
  const style = STATUS_STYLE[application.status] || STATUS_STYLE.applied;

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
                {application.status}
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
          {!application.isKycVerified && (
            <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", color: "#92400E", padding: "10px 14px", borderRadius: 10, fontSize: 12.5, marginBottom: 20 }}>
              🔒 Contact details are masked until your company completes Account &amp; KYC verification.
            </div>
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
              <Row label="Batch" value={training.batch} />
              <Row label="Verified" value={training.verified ? "Yes ✓" : "Self-reported"} />
            </Section>
          )}

          {!certification.skipped && (
            <Section title="Certification">
              <Row label="Certification" value={certification.name} />
              <Row label="Certificate ID" value={certification.certId} />
              <Row label="Verified" value={certification.verified ? "Yes ✓" : "Self-reported"} />
            </Section>
          )}

          {assessment.score !== undefined && (
            <Section title="Assessment">
              <Row label="Topic" value={assessment.topic} />
              <Row label="Score" value={assessment.total ? `${assessment.score} / ${assessment.total}` : assessment.score} />
              <Row label="Passed" value={assessment.passed ? "Yes ✓" : "No"} />
            </Section>
          )}

          {(videoIntro.videoUrl || videoIntro.duration) && (
            <Section title="Video introduction">
              {videoIntro.videoUrl ? (
                <video controls src={videoIntro.videoUrl} style={{ width: "100%", borderRadius: 10, background: "#000" }} />
              ) : (
                <div style={{ fontSize: 13, color: "#64748B" }}>Not uploaded</div>
              )}
              <Row label="Duration" value={videoIntro.duration} />
            </Section>
          )}

          {liveCharts.liveChartsAudited !== undefined && (
            <Section title="Live chart audit">
              <Row label="Charts audited" value={liveCharts.liveChartsAudited} />
              <Row label="Accuracy score" value={liveCharts.accuracyScore !== undefined ? `${liveCharts.accuracyScore}%` : null} />
              <Row label="Verified" value={liveCharts.verified ? "Yes ✓" : "Self-reported"} />
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
            <Row label="Score" value={c.score !== undefined ? `${c.score} / 100` : null} />
            <Row label="Completed stages" value={(c.completedStages || []).length ? c.completedStages.join(", ") : "None yet"} />
          </Section>

          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, paddingTop: 16, borderTop: "1px solid #E5E7EB" }}>
            <span style={{ fontSize: 12.5, fontWeight: 700, color: "#64748B" }}>Move to:</span>
            <select
              value={application.status}
              disabled={updatingId === application._id}
              onChange={(e) => onStatusChange(e.target.value)}
              style={{ fontSize: 13, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontWeight: 600, color: "var(--navy)" }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
