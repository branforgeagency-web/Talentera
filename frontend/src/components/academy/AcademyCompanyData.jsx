import React, { useState, useEffect, useMemo } from "react";

const card = { background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18 };

export default function AcademyCompanyData({ getAuthHeader }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [companyFilter, setCompanyFilter] = useState("");

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
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {hirings.map((h) => (
                <div key={`${h.companyId}-${h.jobId}`} style={{ border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {h.companyLogo ? (
                        <img src={h.companyLogo} alt="" style={{ width: 38, height: 38, borderRadius: 8, objectFit: "contain", border: "1px solid #E2E8F0", background: "#fff" }} />
                      ) : (
                        <div style={{ width: 38, height: 38, borderRadius: 8, background: "#06152A", color: "#E5A82E", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>
                          {String(h.companyName || "?").slice(0, 1).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: "#06152A" }}>{h.roleTitle || "Open role"}</div>
                        <div style={{ fontSize: 12, color: "#475569" }}>
                          {h.companyName}
                          {h.verifiedEmployer && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: "#15803D", background: "#DCFCE7", padding: "1px 6px", borderRadius: 4 }}>VERIFIED</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: "right", fontSize: 11, color: "#64748B" }}>
                      {h.location || "Location not set"}
                      <div>{h.workMode || ""}{h.workMode && h.specialty ? " · " : ""}{h.specialty || ""}</div>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10, fontSize: 11, fontWeight: 700 }}>
                    <span style={{ background: "#F1F5F9", padding: "3px 9px", borderRadius: 6 }}>{h.openings || 1} opening{Number(h.openings) === 1 ? "" : "s"}</span>
                    <span style={{ background: "#F1F5F9", padding: "3px 9px", borderRadius: 6 }}>{h.totalApplicants || 0} total applicants</span>
                    <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "3px 9px", borderRadius: 6 }}>{h.myApplicants || 0} from your academy</span>
                    {h.myShortlisted > 0 && <span style={{ background: "#FEF9C3", color: "#A16207", padding: "3px 9px", borderRadius: 6 }}>{h.myShortlisted} shortlisted</span>}
                    {h.myInterviewing > 0 && <span style={{ background: "#F3E8FF", color: "#7E22CE", padding: "3px 9px", borderRadius: 6 }}>{h.myInterviewing} interviewing</span>}
                    {h.myHired > 0 && <span style={{ background: "#DCFCE7", color: "#15803D", padding: "3px 9px", borderRadius: 6 }}>{h.myHired} hired</span>}
                    {h.urgency && <span style={{ background: "#FEF2F2", color: "#B91C1C", padding: "3px 9px", borderRadius: 6 }}>{h.urgency}</span>}
                  </div>
                </div>
              ))}
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
