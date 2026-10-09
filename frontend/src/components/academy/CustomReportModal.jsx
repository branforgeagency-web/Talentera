import React, { useState } from "react";

const inputStyle = { padding: "9px 11px", border: "1px solid #CBD5E1", borderRadius: 8, fontSize: 13, boxSizing: "border-box" };
const iso = (d) => d.toISOString().slice(0, 10);

const csvCell = (v) => {
  const t = String(v ?? "");
  return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

export default function CustomReportModal({ getAuthHeader, onClose }) {
  const now = new Date();
  const [from, setFrom] = useState(iso(new Date(now.getFullYear(), now.getMonth(), 1)));
  const [to, setTo] = useState(iso(now));
  const [report, setReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const generate = async () => {
    setBusy(true);
    setError("");
    setReport(null);
    try {
      const res = await fetch(`/api/academy/reports/custom?from=${from}&to=${to}`, { headers: { ...getAuthHeader() } });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.message || "Could not generate the report.");
      setReport(data.report);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };

  const downloadCsv = () => {
    if (!report) return;
    const sm = report.summary;
    const lines = [
      [`${report.academyName} - Custom Report`],
      [`Period`, `${report.from} to ${report.to}`],
      [`Generated`, new Date(report.generatedAt).toLocaleString("en-IN")],
      [],
      ["Summary"],
      ["Enrolled in period", sm.enrolledInPeriod],
      ["Students active in period", sm.activeInPeriod],
      ["Total students (all time)", sm.totalStudents],
      ["Verification complete", sm.verificationComplete],
      ["Job applications", sm.applications],
      ["Shortlisted", sm.shortlisted],
      ["Interviewing", sm.interviewing],
      ["Hired", sm.hired],
      ["Academy assessment scores recorded", sm.assessmentsRecorded],
      [],
      ["Name", "Email", "Phone", "Batch", "Specialty", "Branch", "Enrolled on", "Enrolled in period", "Verification complete", "Talentera score", "Academy assessment score", "Placement status"],
      ...report.rows.map((r) => [
        r.name, r.email, r.phone, r.batch, r.specialty, r.branch,
        r.enrolledOn ? new Date(r.enrolledOn).toLocaleDateString("en-IN") : "",
        r.enrolledInPeriod ? "Yes" : "No",
        r.verified ? "Yes" : "No",
        r.talenteraScore, r.academyAssessmentScore, r.placementStatus,
      ]),
    ];
    const csv = "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `academy_report_${report.from}_to_${report.to}.csv`;
    a.click();
  };

  const kpi = (label, val) => (
    <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "10px 12px" }}>
      <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 900, color: "#06152A" }}>{val}</div>
    </div>
  );

  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(6,21,42,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: "#fff", borderRadius: 14, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: "#06152A" }}>Custom Report</h3>
          <button onClick={onClose} style={{ border: "none", background: "#F1F5F9", borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontWeight: 700 }}>Close</button>
        </div>
        <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>Pick the dates you want the report for, then download it as a spreadsheet-ready CSV.</div>

        <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 14 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>FROM</div>
            <input type="date" style={inputStyle} value={from} max={to} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#475569", marginBottom: 4 }}>TO</div>
            <input type="date" style={inputStyle} value={to} min={from} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button disabled={busy || !from || !to} onClick={generate} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#06152A", color: "#E5A82E", fontWeight: 800, fontSize: 12, cursor: "pointer", opacity: busy ? 0.6 : 1 }}>
            {busy ? "Generating..." : "Generate"}
          </button>
        </div>

        {error && <div style={{ color: "#B91C1C", fontSize: 12, marginBottom: 10 }}>{error}</div>}

        {report && (
          <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10, marginBottom: 14 }}>
              {kpi("ENROLLED IN PERIOD", report.summary.enrolledInPeriod)}
              {kpi("ACTIVE IN PERIOD", report.summary.activeInPeriod)}
              {kpi("VERIFICATION COMPLETE", report.summary.verificationComplete)}
              {kpi("APPLICATIONS", report.summary.applications)}
              {kpi("SHORTLISTED / INTERVIEWING", `${report.summary.shortlisted} / ${report.summary.interviewing}`)}
              {kpi("HIRED", report.summary.hired)}
            </div>
            <button onClick={downloadCsv} style={{ padding: "10px 18px", borderRadius: 8, border: "none", background: "#15803D", color: "#fff", fontWeight: 800, fontSize: 12, cursor: "pointer" }}>
              Download report (CSV) - {report.rows.length} students
            </button>
          </>
        )}
      </div>
    </div>
  );
}
