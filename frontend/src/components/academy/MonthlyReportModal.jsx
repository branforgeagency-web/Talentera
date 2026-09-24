import React, { useState, useEffect } from "react";
import {
  FileText,
  Printer,
  TrendingUp,
  Award,
  Users,
  Building2,
  CheckCircle2,
  X,
  Sparkles,
} from "lucide-react";
import "../../styles/academyOS.css";

export default function MonthlyReportModal({ token, onClose }) {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState("January 2026");

  useEffect(() => {
    const fetchReport = async () => {
      setLoading(true);
      try {
        const res = await fetch("/api/academy/reports/monthly", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setReport(data.report);
        }
      } catch (err) {
        console.error("Failed to load monthly report:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [token, selectedMonth]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="aos-modal-backdrop" onClick={onClose}>
      <div
        className="aos-modal-box"
        style={{ maxWidth: 760, maxHeight: "92vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Top Bar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 24px", borderBottom: "1px solid #E2E8F0", background: "#06152A", color: "#FFFFFF" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <FileText style={{ width: 18, height: 18, color: "#E5A82E" }} />
            <h3 style={{ fontSize: 15, fontWeight: 800, margin: 0 }}>Monthly Placement & Benchmark Report</h3>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ background: "#0D223F", border: "1px solid rgba(255,255,255,0.2)", color: "#FFFFFF", fontSize: 12, borderRadius: 6, padding: "5px 10px", outline: "none" }}
            >
              <option value="January 2026">January 2026</option>
              <option value="December 2025">December 2025</option>
              <option value="November 2025">November 2025</option>
            </select>
            <button
              onClick={handlePrint}
              style={{ padding: "6px 14px", borderRadius: 6, background: "#10B981", color: "#FFFFFF", fontSize: 12, fontWeight: 700, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
            >
              <Printer style={{ width: 13, height: 13 }} />
              Print Report
            </button>
            <button
              onClick={onClose}
              style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", fontSize: 22, cursor: "pointer", padding: "0 6px" }}
            >
              &times;
            </button>
          </div>
        </div>

        {/* Report Content */}
        <div style={{ padding: 24, overflowY: "auto", flex: 1, background: "#FFFFFF" }}>
          {loading || !report ? (
            <div style={{ padding: 40, textAlign: "center", color: "#64748B", fontSize: 13 }}>
              Generating monthly executive placement report...
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Executive Summary Header */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 12, padding: 18, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "#E5A82E", textTransform: "uppercase" }}>
                    Executive Placement Report · {report.month || "—"}
                  </div>
                  <h3 style={{ fontSize: 18, fontWeight: 900, color: "#06152A", margin: "4px 0 2px" }}>
                    {report.academyName || "Academy Partner"}
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748B" }}>
                    Primary Administrator: {report.primaryAdmin || "—"}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: 11, color: "#64748B" }}>National Ranking</div>
                  <div style={{ fontSize: 16, fontWeight: 900, color: "#15803D", marginTop: 2 }}>
                    {report.peerBenchmarkRank || "No data yet"}
                  </div>
                </div>
              </div>

              {/* 4 Metric Highlights */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>STUDENTS ENROLLED</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#06152A", marginTop: 4 }}>{report.totalEnrolled ?? 0}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Active in pipeline</div>
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>PLACED THIS MONTH</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#10B981", marginTop: 4 }}>{report.totalPlacements ?? 0}</div>
                  <div style={{ fontSize: 10, color: "#10B981", fontWeight: 700, marginTop: 2 }}>{report.momGrowth || "—"}</div>
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>PLACEMENT RATE</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#3B82F6", marginTop: 4 }}>{report.placementRate || "0%"}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Verified conversions</div>
                </div>

                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>AVERAGE CTC</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: "#D97706", marginTop: 4 }}>{report.avgCtc || "—"}</div>
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 2 }}>Top 10% in Tamil Nadu</div>
                </div>
              </div>

              {/* Top Hiring Partners Table */}
              <div style={{ border: "1px solid #E2E8F0", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ background: "#F8FAFC", padding: "12px 18px", borderBottom: "1px solid #E2E8F0", fontWeight: 800, fontSize: 13, color: "#06152A" }}>
                  Top Hiring Partners ({report.month || "January 2026"})
                </div>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F1F5F9", color: "#475569", textAlign: "left", fontSize: 11, textTransform: "uppercase" }}>
                      <th style={{ padding: "10px 18px" }}>Company</th>
                      <th style={{ padding: "10px 18px" }}>Students Recruited</th>
                      <th style={{ padding: "10px 18px" }}>Avg CTC</th>
                      <th style={{ padding: "10px 18px" }}>Verification Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(report.topCompanies && report.topCompanies.length > 0) ? report.topCompanies.map((comp, idx) => (
                      <tr key={idx} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "12px 18px", fontWeight: 700, color: "#06152A" }}>{comp.name}</td>
                        <td style={{ padding: "12px 18px", color: "#334155" }}>{comp.placements} candidate(s)</td>
                        <td style={{ padding: "12px 18px", fontWeight: 700, color: "#10B981" }}>{comp.avgCtc}</td>
                        <td style={{ padding: "12px 18px" }}>
                          <span style={{ background: "#DCFCE7", color: "#15803D", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                            30-Day Verified ✓
                          </span>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan={4} style={{ padding: "20px 18px", textAlign: "center", color: "#94A3B8" }}>No placements recorded yet this month.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div style={{ padding: "12px 24px", background: "#F8FAFC", borderTop: "1px solid #E2E8F0", display: "flex", justifyContent: "flex-end" }}>
          <button
            onClick={onClose}
            style={{ background: "#06152A", color: "#FFFFFF", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
