import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

export default function BatchInterviewHeatmap({ batchCode = "", batches = [], token, getAuthHeader, onSelectStudent, onSelectCandidate }) {
  const [selectedBatchCode, setSelectedBatchCode] = useState(batchCode || batches[0]?.code || "");
  const [heatmapData, setHeatmapData] = useState(null);
  const [loading, setLoading] = useState(true);

  const selectHandler = onSelectStudent || onSelectCandidate;

  const authHeaders = getAuthHeader
    ? getAuthHeader()
    : token
    ? { Authorization: `Bearer ${token}` }
    : {};

  const fetchHeatmap = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/academy/interviews/heatmap?batchCode=${selectedBatchCode}`, {
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
    return <div style={{ padding: 20, textAlign: "center", color: "#64748B", fontSize: 12 }}>Loading batch interview heatmap...</div>;
  }

  const matrix = heatmapData?.matrix || [];

  return (
    <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#06152A" }}>
              Batch Pipeline Traction Heatmap · {selectedBatchCode}
            </h4>
            <div style={{ fontSize: 11, color: "#64748B" }}>
              Identify student momentum across hiring stages · Darker cells indicate higher company engagement.
            </div>
          </div>
          {batches.length > 0 && (
            <select
              value={selectedBatchCode}
              onChange={(e) => setSelectedBatchCode(e.target.value)}
              style={{ padding: "5px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, background: "#fff", fontWeight: 700 }}
            >
              {batches.map((b) => (
                <option key={b._id || b.code} value={b.code}>
                  {b.code} ({b.course})
                </option>
              ))}
            </select>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 10, color: "#64748B" }}>
          <span>Intensity legend:</span>
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#F1F5F9", borderRadius: 2 }}></span> 0
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#93C5FD", borderRadius: 2 }}></span> 1-2
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#3B82F6", borderRadius: 2 }}></span> 3+
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#E5A82E", borderRadius: 2 }}></span> Interview
          <span style={{ display: "inline-block", width: 12, height: 12, background: "#22C55E", borderRadius: 2 }}></span> Joined
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "center" }}>
              <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 10, color: "#64748B", minWidth: 150 }}>
                STUDENT ({matrix.length})
              </th>
              {pipelineColumns.map((col) => (
                <th key={col} style={{ padding: "8px 10px", fontSize: 10, color: "#64748B", minWidth: 80 }}>
                  {col.toUpperCase()}
                </th>
              ))}
              <th style={{ padding: "8px 10px", fontSize: 10, color: "#64748B" }}>TRACTION</th>
            </tr>
          </thead>
          <tbody>
            {matrix.map((row) => {
              const totalInteractions = Object.values(row.stages || {}).reduce((sum, v) => sum + v, 0);
              const hasJoined = (row.stages && row.stages["Joined"]) > 0;
              const hasInterview = (row.stages && row.stages["Interview"]) > 0;
              const statusTag = hasJoined ? "Joined ✓" : hasInterview ? "Interviewing" : totalInteractions > 2 ? "Active" : "Low Traction";

              return (
                <tr
                  key={row.studentId || row.email}
                  style={{ borderBottom: "1px solid #F1F5F9", cursor: "pointer" }}
                  onClick={() => onSelectStudent && onSelectStudent(row.studentId)}
                >
                  <td style={{ padding: "8px 12px", fontWeight: 700, color: "#06152A" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span>{row.name}</span>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
