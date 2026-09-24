import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

export default function BatchInterviewHeatmap({ batchCode = "", batches = [], token, getAuthHeader, onSelectStudent, onSelectCandidate }) {
  const [selectedBatchCode, setSelectedBatchCode] = useState(batchCode || "ALL");
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState("all"); // 'all' (matrix), 'summary' (cohort roll-up)
  const [searchTerm, setSearchTerm] = useState("");

  const selectHandler = onSelectStudent || onSelectCandidate;

  const authHeaders = getAuthHeader
    ? getAuthHeader()
    : token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const queryParam = selectedBatchCode && selectedBatchCode !== "ALL" ? `?batchCode=${selectedBatchCode}` : "";
      const res = await fetch(`/api/academy/interviews/heatmap${queryParam}`, {
        headers: { ...authHeaders },
      });
      const data = await safeJson(res);
      if (data) setHeatmapData(data);
    } catch (err) {
      console.error("Heatmap fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHeatmap();
  }, [selectedBatchCode]);

  const pipelineColumns = [
    "Profile Viewed",
    "Profile Locked",
    "Applied",
    "Shortlisted",
    "Interview",
    "Offer Extended",
    "Joined",
  ];

  const getCellColor = (count, stageName) => {
    if (!count || count === 0) return { bg: "#F1F5F9", color: "#94A3B8" };
    if (stageName === "Joined") return { bg: "#22C55E", color: "#fff" };
    if (stageName === "Offer Extended") return { bg: "#16A34A", color: "#fff" };
    if (stageName === "Interview") return { bg: "#E5A82E", color: "#06152A" };
    if (stageName === "Shortlisted") return { bg: "#C084FC", color: "#fff" };
    if (stageName === "Profile Locked") return { bg: "#F87171", color: "#fff" };
    if (count >= 3) return { bg: "#3B82F6", color: "#fff" };
    return { bg: "#93C5FD", color: "#1E3A8A" };
  };

  if (loading && !heatmapData) {
    return (
      <div style={{ background: "#fff", borderRadius: 14, padding: 36, textAlign: "center", border: "1px solid #E2E8F0", color: "#64748B" }}>
        <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 22, color: "#2563EB", marginBottom: 10, display: "block" }}></i>
        Loading overall academy batch hiring progress heatmap...
      </div>
    );
  }

  const matrix = (heatmapData?.matrix || []).filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (r.name && r.name.toLowerCase().includes(term)) ||
      (r.batch && r.batch.toLowerCase().includes(term)) ||
      (r.course && r.course.toLowerCase().includes(term))
    );
  });

  const batchSummary = heatmapData?.batchSummary || [];
  const totals = heatmapData?.overallTotals || {
    totalStudents: matrix.length,
    active: matrix.filter((r) => Object.values(r.stages || {}).reduce((a, b) => a + b, 0) > 0).length,
    interview: matrix.filter((r) => (r.stages?.Interview || 0) > 0).length,
    offers: matrix.filter((r) => (r.stages?.["Offer Extended"] || 0) > 0).length,
    joined: matrix.filter((r) => (r.stages?.Joined || 0) > 0).length,
  };

  const isAllBatches = selectedBatchCode === "ALL";

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
      {/* Top Header & Batch Selector */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: isAllBatches ? "#2563EB" : "#10B981" }}></span>
            <h4 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "#06152A" }}>
              {isAllBatches ? "Overall Academy Batch Hiring Progress" : `Batch Pipeline Traction Heatmap · ${selectedBatchCode}`}
            </h4>
          </div>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
            {isAllBatches
              ? "Comprehensive hiring momentum across all academy student cohorts & batches."
              : `Tracking candidate momentum across hiring stages for batch ${selectedBatchCode}.`}
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
          {/* Search by student or batch */}
          <input
            type="text"
            placeholder="Filter by student or batch..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              fontSize: 12,
              width: 190,
            }}
          />

          {/* Batch Selector Dropdown */}
          <select
            value={selectedBatchCode}
            onChange={(e) => setSelectedBatchCode(e.target.value)}
            style={{
              padding: "7px 12px",
              borderRadius: 8,
              border: "1px solid #2563EB",
              fontSize: 12,
              background: "#F8FAFC",
              fontWeight: 700,
              color: "#0F172A",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Batches (Overall Academy)</option>
            {batches.map((b) => (
              <option key={b._id || b.code} value={b.code}>
                Batch: {b.code} {b.course ? `(${b.course})` : ""}
              </option>
            ))}
          </select>

          {/* Refresh button */}
          <button
            onClick={fetchHeatmap}
            className="btn btn-outline"
            style={{ fontSize: 12, padding: "6px 12px" }}
            title="Refresh heatmap data"
          >
            <i className="fa-solid fa-arrows-rotate"></i>
          </button>
        </div>
      </div>

      {/* Overall Progress KPI Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 10,
          background: "#F8FAFC",
          border: "1px solid #E2E8F0",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
        }}
      >
        <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: 8 }}>
          <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>Total Students</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#06152A" }}>{totals.totalStudents}</div>
        </div>
        <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: 8 }}>
          <div style={{ fontSize: 10.5, color: "#2563EB", fontWeight: 700, textTransform: "uppercase" }}>Active Pipeline</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#2563EB" }}>{totals.active}</div>
        </div>
        <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: 8 }}>
          <div style={{ fontSize: 10.5, color: "#B45309", fontWeight: 700, textTransform: "uppercase" }}>Interviewing</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#B45309" }}>{totals.interview}</div>
        </div>
        <div style={{ borderRight: "1px solid #E2E8F0", paddingRight: 8 }}>
          <div style={{ fontSize: 10.5, color: "#16A34A", fontWeight: 700, textTransform: "uppercase" }}>Offers Extended</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#16A34A" }}>{totals.offers}</div>
        </div>
        <div>
          <div style={{ fontSize: 10.5, color: "#15803D", fontWeight: 700, textTransform: "uppercase" }}>Placed &amp; Joined</div>
          <div style={{ fontSize: 18, fontWeight: 800, color: "#15803D" }}>{totals.joined} ✓</div>
        </div>
      </div>

      {/* Cohorts Roll-up Table (shown when viewing all batches) */}
      {isAllBatches && batchSummary.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <h5 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1E293B" }}>
              Cohort Roll-Up Summary ({batchSummary.length} Batches)
            </h5>
            <span style={{ fontSize: 11, color: "#64748B" }}>
              Aggregated batch performance overview
            </span>
          </div>
          <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
              <thead>
                <tr style={{ background: "#F1F5F9", textAlign: "center", borderBottom: "1px solid #E2E8F0" }}>
                  <th style={{ padding: "8px 12px", textAlign: "left", color: "#475569" }}>BATCH / COHORT</th>
                  <th style={{ padding: "8px 10px", color: "#475569" }}>COURSE</th>
                  <th style={{ padding: "8px 10px", color: "#475569" }}>STUDENTS</th>
                  <th style={{ padding: "8px 10px", color: "#475569" }}>VIEWED</th>
                  <th style={{ padding: "8px 10px", color: "#475569" }}>APPLIED</th>
                  <th style={{ padding: "8px 10px", color: "#475569" }}>SHORTLISTED</th>
                  <th style={{ padding: "8px 10px", color: "#B45309" }}>INTERVIEWS</th>
                  <th style={{ padding: "8px 10px", color: "#16A34A" }}>OFFERS</th>
                  <th style={{ padding: "8px 10px", color: "#15803D" }}>JOINED</th>
                  <th style={{ padding: "8px 10px", color: "#06152A" }}>ACTION</th>
                </tr>
              </thead>
              <tbody>
                {batchSummary.map((b) => (
                  <tr
                    key={b.batch}
                    style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                    onClick={() => setSelectedBatchCode(b.batch)}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#0F172A" }}>
                      <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "2px 8px", borderRadius: 4, fontWeight: 800 }}>
                        {b.batch}
                      </span>
                    </td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#64748B" }}>{b.course}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", fontWeight: 700 }}>{b.totalStudents}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{b.viewed}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>{b.applied}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#7E22CE", fontWeight: 700 }}>{b.shortlisted}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#B45309", fontWeight: 800 }}>{b.interview}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#16A34A", fontWeight: 800 }}>{b.offer}</td>
                    <td style={{ padding: "8px 10px", textAlign: "center", color: "#15803D", fontWeight: 800 }}>{b.joined} ✓</td>
                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedBatchCode(b.batch);
                        }}
                        style={{
                          background: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: 6,
                          fontSize: 10.5,
                          fontWeight: 700,
                          padding: "3px 8px",
                          color: "#2563EB",
                          cursor: "pointer",
                        }}
                      >
                        View Matrix →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend & Table Header Title */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h5 style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#1E293B" }}>
          Student Hiring Traction Matrix ({matrix.length} Candidates)
        </h5>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#64748B" }}>
          <span>Intensity:</span>
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#F1F5F9", borderRadius: 2 }}></span> 0
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#93C5FD", borderRadius: 2 }}></span> 1-2
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#3B82F6", borderRadius: 2 }}></span> 3+
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#E5A82E", borderRadius: 2 }}></span> Interview
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#22C55E", borderRadius: 2 }}></span> Joined
        </div>
      </div>

      {/* Matrix Table */}
      <div style={{ overflowX: "auto", border: "1px solid #E2E8F0", borderRadius: 8 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "#64748B", minWidth: 180 }}>
                STUDENT &amp; BATCH
              </th>
              {pipelineColumns.map((col) => (
                <th key={col} style={{ padding: "8px 10px", fontSize: 10, color: "#64748B", minWidth: 80 }}>
                  {col.toUpperCase()}
                </th>
              ))}
              <th style={{ padding: "8px 10px", fontSize: 10, color: "#64748B", minWidth: 90 }}>TRACTION</th>
            </tr>
          </thead>
          <tbody>
            {matrix.length === 0 ? (
              <tr>
                <td colSpan={pipelineColumns.length + 2} style={{ padding: 32, textAlign: "center", color: "#94A3B8" }}>
                  No candidates found matching the selected filter.
                </td>
              </tr>
            ) : (
              matrix.map((row) => {
                const totalInteractions = Object.values(row.stages || {}).reduce((sum, v) => sum + v, 0);
                const hasJoined = (row.stages && row.stages["Joined"]) > 0;
                const hasInterview = (row.stages && row.stages["Interview"]) > 0;
                const statusTag = hasJoined ? "Joined ✓" : hasInterview ? "Interviewing" : totalInteractions > 2 ? "Active" : "Low Traction";

                return (
                  <tr
                    key={row.studentId || row.email}
                    style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer", transition: "background 0.1s" }}
                    onClick={() => selectHandler && selectHandler(row.studentId ? { _id: row.studentId, ...row } : row)}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "#F8FAFC")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                  >
                    <td style={{ padding: "8px 12px", fontWeight: 700, color: "#06152A" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: "50%",
                            background: "#FEF08A",
                            color: "#854D0E",
                            fontSize: 10,
                            fontWeight: 800,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}
                        >
                          {(row.name || "ST").slice(0, 2).toUpperCase()}
                        </span>
                        <div>
                          <div style={{ fontSize: 12 }}>{row.name}</div>
                          <div style={{ fontSize: 10, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ background: "#EFF6FF", color: "#2563EB", padding: "1px 5px", borderRadius: 3, fontWeight: 700 }}>
                              {row.batch}
                            </span>
                            <span>{row.course}</span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {pipelineColumns.map((col) => {
                      const count = (row.stages && row.stages[col]) || 0;
                      const cellStyle = getCellColor(count, col);
                      return (
                        <td key={col} style={{ padding: "6px 8px", textAlign: "center" }}>
                          <span
                            style={{
                              display: "inline-block",
                              width: 24,
                              height: 24,
                              lineHeight: "24px",
                              borderRadius: 6,
                              background: cellStyle.bg,
                              color: cellStyle.color,
                              fontWeight: 800,
                              fontSize: 10,
                            }}
                          >
                            {count > 0 ? count : "—"}
                          </span>
                        </td>
                      );
                    })}

                    <td style={{ padding: "8px 10px", textAlign: "center" }}>
                      <span
                        style={{
                          padding: "2px 8px",
                          borderRadius: 999,
                          fontSize: 9,
                          fontWeight: 800,
                          background: hasJoined ? "#DCFCE7" : hasInterview ? "#FEF3C7" : totalInteractions > 2 ? "#EFF6FF" : "#FEE2E2",
                          color: hasJoined ? "#15803D" : hasInterview ? "#B45309" : totalInteractions > 2 ? "#2563EB" : "#DC2626",
                        }}
                      >
                        {statusTag}
                      </span>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

