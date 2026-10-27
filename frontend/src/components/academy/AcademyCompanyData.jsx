import React, { useState, useEffect, useMemo } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };

export default function AcademyCompanyData({ getAuthHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");
  const [expandedJobs, setExpandedJobs] = useState({});

  const toggleExpand = (key) => {
    setExpandedJobs((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/academy/company-data", { headers: { ...getAuthHeader() } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Could not load company data.");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 60000); // keep it live
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hirings = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data?.hirings || []).filter((h) => {
      if (companyFilter && String(h.companyId) !== companyFilter) return false;
      if (!q) return true;
      return [h.companyName, h.roleTitle, h.location, h.specialty].some((v) => String(v || "").toLowerCase().includes(q));
    });
  }, [data, search, companyFilter]);

  const totals = data?.totals || {};
  const kpi = (label, val, color) => (
    <div style={{ ...card, padding: 14 }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: 0.4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 900, color: color || "#06152A", marginTop: 2 }}>{val ?? 0}</div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, gap: 12, flexWrap: "wrap" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: "#06152A" }}>Company Data</h3>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 2, maxWidth: 640 }}>
            Active hirings by RCM employers on Talentera, pulled live from the company and candidate dashboards - with how your own candidates are doing on each opening.
          </div>
        </div>
        <button onClick={load} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
          Refresh
        </button>
      </div>

      {error && <div style={{ padding: "10px 14px", background: "#FEF2F2", color: "#B91C1C", borderRadius: 8, fontSize: 12 }}>{error}</div>}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
        {kpi("ACTIVE HIRINGS", totals.activeHirings)}
        {kpi("RCM COMPANIES", totals.companies)}
        {kpi("YOUR APPLICATIONS", totals.myApplications, "#2563EB")}
        {kpi("SHORTLISTED / INTERVIEWING", (totals.myShortlisted || 0) + (totals.myInterviewing || 0), "#CA8A04")}
        {kpi("YOUR CANDIDATES HIRED", totals.myHired, "#15803D")}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 20, alignItems: "start" }}>
        {/* Main - active hirings */}
        <div style={card}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, gap: 10, flexWrap: "wrap" }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>Active hirings ({hirings.length})</h4>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search company, role or location"
              style={{ padding: "8px 10px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 12, width: 260 }}
            />
          </div>
          {companyFilter && (
            <div style={{ marginBottom: 10, fontSize: 12 }}>
              Showing one company.{" "}
              <button onClick={() => setCompanyFilter("")} style={{ border: "none", background: "none", color: "#2563EB", fontWeight: 700, cursor: "pointer" }}>Show all</button>
            </div>
          )}
          {loading && !data ? (
            <div style={{ padding: 24, color: "#64748B", fontSize: 12 }}>Loading...</div>
          ) : hirings.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "#64748B", fontSize: 12 }}>
              No active hirings to show right now. When RCM companies publish openings, they appear here automatically.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {hirings.map((h) => {
                const cardKey = `${h.companyId}-${h.jobId}`;
                const isExpanded = !!expandedJobs[cardKey];
                return (
                  <div
                    key={cardKey}
                    style={{
                      border: "1px solid #E2E8F0",
                      borderRadius: 12,
                      padding: 18,
                      background: "#FFFFFF",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.03)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    {/* Top Row: Logo, Title, Company Name, Verified, Location, Badges, and Job Match */}
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
                      <div style={{ display: "flex", gap: 14, alignItems: "flex-start", flex: "1 1 360px" }}>
                        {h.companyLogo ? (
                          <img
                            src={h.companyLogo}
                            alt=""
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              objectFit: "contain",
                              border: "1px solid #E2E8F0",
                              background: "#fff",
                              padding: 2,
                              flexShrink: 0,
                            }}
                          />
                        ) : (
                          <div
                            style={{
                              width: 48,
                              height: 48,
                              borderRadius: 10,
                              background: "#06152A",
                              color: "#E5A82E",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              fontWeight: 900,
                              fontSize: 18,
                              flexShrink: 0,
                            }}
                          >
                            {String(h.companyName || "?").slice(0, 1).toUpperCase()}
                          </div>
                        )}
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <div style={{ fontSize: 16, fontWeight: 800, color: "#0F172A", lineHeight: 1.25 }}>
                            {h.roleTitle || "Medical Coder Fresher"}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>{h.companyName}</span>
                            {h.verifiedEmployer && (
                              <span
                                style={{
                                  fontSize: 11,
                                  fontWeight: 700,
                                  color: "#059669",
                                  background: "#ECFDF5",
                                  border: "1px solid #A7F3D0",
                                  padding: "2px 8px",
                                  borderRadius: 12,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                }}
                              >
                                <i className="fa-solid fa-circle-check" style={{ fontSize: 11 }}></i> Verified
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "#64748B", flexWrap: "wrap", marginTop: 2 }}>
                            {h.location && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <i className="fa-solid fa-location-dot" style={{ color: "#3B82F6", fontSize: 11 }}></i>
                                {h.location}
                              </span>
                            )}
                            {h.specialty && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <i className="fa-solid fa-briefcase" style={{ color: "#3B82F6", fontSize: 11 }}></i>
                                {h.specialty}
                              </span>
                            )}
                            {h.workMode && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <i className="fa-solid fa-house-laptop" style={{ color: "#3B82F6", fontSize: 11 }}></i>
                                {h.workMode}
                              </span>
                            )}
                          </div>

                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginTop: 4 }}>
                            <span
                              style={{
                                background: "#EFF6FF",
                                color: "#1D4ED8",
                                border: "1px solid #BFDBFE",
                                padding: "3px 9px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <i className="fa-solid fa-user-group" style={{ fontSize: 10 }}></i>
                              {h.openings || 1} Opening{Number(h.openings) === 1 ? "" : "s"}
                            </span>

                            <span
                              style={{
                                background: "#F5F3FF",
                                color: "#6D28D9",
                                border: "1px solid #DDD6FE",
                                padding: "3px 9px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 4,
                              }}
                            >
                              <i className="fa-solid fa-graduation-cap" style={{ fontSize: 10 }}></i>
                              {h.experienceLevel || "Fresher"}
                            </span>

                            <span
                              style={{
                                background: "#F0FDFA",
                                color: "#0F766E",
                                border: "1px solid #99F6E4",
                                padding: "3px 9px",
                                borderRadius: 6,
                                fontSize: 11,
                                fontWeight: 700,
                              }}
                            >
                              {h.certPreference || "Certification: Preferred"}
                            </span>

                            {h.urgency && (
                              <span
                                style={{
                                  background: "#FEF2F2",
                                  color: "#B91C1C",
                                  border: "1px solid #FECACA",
                                  padding: "3px 9px",
                                  borderRadius: 6,
                                  fontSize: 11,
                                  fontWeight: 700,
                                }}
                              >
                                {h.urgency}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Job Match score box */}
                      <div
                        style={{
                          background: "#F0FDF4",
                          border: "1px solid #BBF7D0",
                          borderRadius: 10,
                          padding: "8px 14px",
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          flexShrink: 0,
                        }}
                      >
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 800, color: "#16A34A", textTransform: "uppercase", letterSpacing: "0.4px" }}>
                            Job Match
                          </div>
                          <div style={{ fontSize: 22, fontWeight: 900, color: "#15803D", lineHeight: 1.1 }}>
                            {h.matchScore || 65}%
                          </div>
                        </div>
                        <i className="fa-solid fa-chevron-right" style={{ color: "#16A34A", fontSize: 14 }}></i>
                      </div>
                    </div>

                    {/* Bottom Row: Your Academy's Candidates, Application Deadline, Salary (CTC), View More Details */}
                    <div
                      style={{
                        display: "flex",
                        gap: 12,
                        flexWrap: "wrap",
                        alignItems: "stretch",
                        marginTop: 16,
                        paddingTop: 14,
                        borderTop: "1px solid #F1F5F9",
                      }}
                    >
                      {/* Box 1: Your Academy's Candidates */}
                      <div
                        style={{
                          background: "#F8FAFC",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          padding: "10px 14px",
                          flex: "1 1 290px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 8 }}>
                          <i className="fa-solid fa-graduation-cap" style={{ color: "#2563EB", fontSize: 13 }}></i>
                          <span style={{ fontSize: 11, fontWeight: 800, color: "#1E293B" }}>Your Academy's Candidates</span>
                        </div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, textAlign: "center" }}>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Applied</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#2563EB", marginTop: 2 }}>{h.myApplicants || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Shortlisted</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#D97706", marginTop: 2 }}>{h.myShortlisted || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>In Interview</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#7C3AED", marginTop: 2 }}>{h.myInterviewing || 0}</div>
                          </div>
                          <div>
                            <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Selected</div>
                            <div style={{ fontSize: 18, fontWeight: 900, color: "#16A34A", marginTop: 2 }}>{h.myHired || 0}</div>
                          </div>
                        </div>
                      </div>

                      {/* Box 2: Application Deadline */}
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          padding: "10px 14px",
                          flex: "0 1 180px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="fa-solid fa-calendar-days" style={{ fontSize: 16 }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Application Deadline</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                            {h.deadline || "30 Jun 2025"}
                          </div>
                        </div>
                      </div>

                      {/* Box 3: Salary (CTC) */}
                      <div
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E2E8F0",
                          borderRadius: 10,
                          padding: "10px 14px",
                          flex: "0 1 190px",
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F0FDF4", color: "#16A34A", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                          <i className="fa-solid fa-indian-rupee-sign" style={{ fontSize: 16 }}></i>
                        </div>
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 700, color: "#64748B" }}>Salary (CTC)</div>
                          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A", marginTop: 2 }}>
                            {h.salary || "₹ 2.5 - 3.5 LPA"}
                          </div>
                          <div style={{ fontSize: 10, color: "#64748B" }}>(Expected)</div>
                        </div>
                      </div>

                      {/* Button: View More Details */}
                      <div style={{ display: "flex", alignItems: "center", marginLeft: "auto" }}>
                        <button
                          onClick={() => toggleExpand(cardKey)}
                          style={{
                            background: isExpanded ? "#1E293B" : "#2563EB",
                            color: "#FFFFFF",
                            border: "none",
                            borderRadius: 8,
                            padding: "10px 16px",
                            fontSize: 12,
                            fontWeight: 700,
                            cursor: "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                            transition: "all 0.15s ease",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {isExpanded ? "View Less Details" : "View More Details"}
                          <i className={`fa-solid ${isExpanded ? "fa-chevron-up" : "fa-chevron-down"}`} style={{ fontSize: 11 }}></i>
                        </button>
                      </div>
                    </div>

                    {/* Expandable Section: View More Details */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: 16,
                          paddingTop: 16,
                          borderTop: "1px dashed #CBD5E1",
                          display: "flex",
                          flexDirection: "column",
                          gap: 16,
                        }}
                      >
                        {/* Students count breakdown banner */}
                        <div
                          style={{
                            background: "#EFF6FF",
                            border: "1px solid #BFDBFE",
                            borderRadius: 8,
                            padding: "12px 16px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            flexWrap: "wrap",
                          }}
                        >
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <i className="fa-solid fa-users-viewfinder" style={{ color: "#2563EB", fontSize: 18 }}></i>
                            <div style={{ fontSize: 12, color: "#1E3A8A" }}>
                              <strong style={{ fontSize: 13 }}>Your Academy's Student Activity:</strong>{" "}
                              <span><strong>{h.myApplicants || 0}</strong> students applied</span> ·{" "}
                              <span><strong>{h.myShortlisted || 0}</strong> shortlisted</span> ·{" "}
                              <span><strong>{h.myInterviewing || 0}</strong> in interview</span> ·{" "}
                              <strong style={{ color: "#15803D" }}>{h.myHired || 0} selected</strong>
                            </div>
                          </div>
                          <div style={{ fontSize: 11, fontWeight: 700, color: "#1D4ED8" }}>
                            Total Applicants across Talentera: {h.totalApplicants || 0}
                          </div>
                        </div>

                        {/* 4 Cards Grid: Eligibility, Application Deadline, Salary, Hiring Process */}
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 14 }}>
                          {/* 1. Eligibility Criteria */}
                          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "#0F172A" }}>
                              <i className="fa-solid fa-list-check" style={{ color: "#2563EB", fontSize: 14 }}></i>
                              <span style={{ fontSize: 13, fontWeight: 800 }}>Eligibility Criteria</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11, color: "#334155" }}>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Education:</span>{" "}
                                <strong>{h.eligibility?.education || "Life Sciences / Any Graduate / Diploma"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Experience Level:</span>{" "}
                                <strong>{h.eligibility?.experience || h.experienceLevel || "Fresher"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Certifications:</span>{" "}
                                <strong>{h.eligibility?.certifications || "Preferred (CPC / COC / Non-certified eligible)"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Languages:</span>{" "}
                                <strong>{h.eligibility?.languages || "English"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Passout Year:</span>{" "}
                                <strong>{h.eligibility?.passoutYear || "2023, 2024, 2025, 2026"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Backlogs Policy:</span>{" "}
                                <strong>{h.eligibility?.backlogs || "No standing backlogs allowed"}</strong>
                              </div>
                              {h.eligibility?.mustHaves && (
                                <div style={{ marginTop: 4, padding: "6px 10px", background: "#FEF2F2", border: "1px solid #FEE2E2", borderRadius: 6, color: "#991B1B" }}>
                                  <strong>Mandatory Skills:</strong> {h.eligibility.mustHaves}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* 2. Application Deadline */}
                          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "#0F172A" }}>
                              <i className="fa-solid fa-clock" style={{ color: "#D97706", fontSize: 14 }}></i>
                              <span style={{ fontSize: 13, fontWeight: 800 }}>Application Deadline & Dates</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11, color: "#334155" }}>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Last Date to Apply:</span>{" "}
                                <span style={{ fontWeight: 800, color: "#DC2626", fontSize: 12 }}>{h.deadline || "30 Jun 2025"}</span>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Hiring Urgency:</span>{" "}
                                <strong style={{ color: h.urgency === "Critical" ? "#DC2626" : "#2563EB" }}>
                                  {h.urgency || "Standard (≤30 days)"}
                                </strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Work Mode:</span>{" "}
                                <strong>{h.workMode || "Remote / Onsite"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Location:</span>{" "}
                                <strong>{h.location || "Multiple locations"}</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Active Vacancies:</span>{" "}
                                <strong>{h.openings || 1} Positions</strong>
                              </div>
                            </div>
                          </div>

                          {/* 3. Salary & CTC */}
                          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "#0F172A" }}>
                              <i className="fa-solid fa-money-bill-wave" style={{ color: "#16A34A", fontSize: 14 }}></i>
                              <span style={{ fontSize: 13, fontWeight: 800 }}>Salary & Benefits</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 11, color: "#334155" }}>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Expected CTC:</span>{" "}
                                <span style={{ fontWeight: 900, color: "#16A34A", fontSize: 13 }}>{h.salary || "₹ 2.5 - 3.5 LPA"}</span>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Compensation Type:</span>{" "}
                                <strong>Annual CTC (Fixed + Variable Incentives)</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Shift:</span>{" "}
                                <strong>Day / Flexible Rotational</strong>
                              </div>
                              <div>
                                <span style={{ color: "#64748B", fontWeight: 600 }}>Additional Perks:</span>{" "}
                                <span>Health Insurance, Night Shift Allowance, Performance Bonus</span>
                              </div>
                            </div>
                          </div>

                          {/* 4. Hiring Process */}
                          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10, color: "#0F172A" }}>
                              <i className="fa-solid fa-diagram-project" style={{ color: "#7C3AED", fontSize: 14 }}></i>
                              <span style={{ fontSize: 13, fontWeight: 800 }}>Hiring Process</span>
                            </div>
                            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                              {(h.hiringProcess || []).map((step, idx) => (
                                <div key={idx} style={{ display: "flex", gap: 8, alignItems: "flex-start", fontSize: 11 }}>
                                  <div
                                    style={{
                                      width: 20,
                                      height: 20,
                                      borderRadius: "50%",
                                      background: "#7C3AED",
                                      color: "#fff",
                                      display: "flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                      fontSize: 10,
                                      fontWeight: 800,
                                      flexShrink: 0,
                                      marginTop: 1,
                                    }}
                                  >
                                    {idx + 1}
                                  </div>
                                  <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, color: "#0F172A" }}>{step.title || step.name || `Round ${idx + 1}`}</div>
                                    <div style={{ color: "#64748B", fontSize: 10 }}>
                                      {step.desc || "Assessment / Interview"} · <span style={{ color: "#2563EB", fontWeight: 600 }}>{step.mode || "Online"}</span>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Side - RCM companies & locations */}
        <div style={card}>
          <h4 style={{ margin: "0 0 4px", fontSize: 15, fontWeight: 800, color: "#06152A" }}>RCM companies on Talentera</h4>
          <div style={{ fontSize: 11, color: "#64748B", marginBottom: 12 }}>With their locations. Click one to see only its openings.</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 640, overflowY: "auto" }}>
            {(data?.companies || []).length === 0 && !loading && (
              <div style={{ fontSize: 12, color: "#64748B", padding: 10 }}>No companies listed yet.</div>
            )}
            {(data?.companies || []).map((c) => {
              const active = companyFilter === String(c.companyId);
              return (
                <div
                  key={c.companyId}
                  onClick={() => setCompanyFilter(active ? "" : String(c.companyId))}
                  style={{ padding: "10px 12px", borderRadius: 8, cursor: "pointer", background: active ? "#EFF6FF" : "#F8FAFC", border: `1px solid ${active ? "#93C5FD" : "transparent"}` }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <strong style={{ fontSize: 12, color: "#0F172A" }}>{c.companyName}</strong>
                    <span style={{ fontSize: 10, fontWeight: 800, color: c.activeJobs ? "#15803D" : "#94A3B8" }}>
                      {c.activeJobs ? `${c.activeJobs} hiring` : "no openings"}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    {(c.locations || []).length ? (c.locations || []).join(" · ") : "Location not provided"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
