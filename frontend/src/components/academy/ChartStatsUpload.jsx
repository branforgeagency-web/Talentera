import React, { useState } from "react";
import { safeJson } from "../../utils/safeJson.js";

// Bulk uploads Stage 6 "Live Charts" stats (specialty, charts coded, accuracy %,
// min/chart, last coded date) for many of an academy's own students in one CSV,
// instead of each student re-typing numbers the academy's own training records
// already have. There is no public API from the practice platforms (Practicode,
// Codivia, 3M 360 Encompass, SuperCoder, FlashCode, HCC Coder) to pull this
// automatically, so this is the closest thing to automatic: the academy reports
// the real numbers once, in bulk.
//
// Two-step flow, mirroring the Bulk CSV Upload (candidate onboarding) tab:
//   1) upload a CSV -> preview + validate (no writes yet)
//   2) review the preview -> Confirm Upload applies it
//
// Students who already completed Stage 6 are always skipped, never overwritten.

const SAMPLE_CSV_ROWS = [
  "email,specialty,charts_coded,accuracy_pct,min_per_chart,last_coded_date",
  "priya.s@example.com,HCC (Risk Adjustment),180,92,9,2026-09-20",
  "priya.s@example.com,ICD-10-CM Diagnosis,60,88,7,2026-09-18",
  "karthik.r@example.com,E/M (Evaluation & Management),95,85,11,2026-09-15",
];

export default function ChartStatsUpload({ getAuthHeader, onUploadSuccess }) {
  const [dragActive, setDragActive] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [previewData, setPreviewData] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [confirmResult, setConfirmResult] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");

  const downloadSampleCsv = () => {
    const csvContent = "data:text/csv;charset=utf-8," + encodeURIComponent(SAMPLE_CSV_ROWS.join("\n") + "\n");
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "talentera_chart_stats_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    setParsing(true);
    setErrorMsg("");
    setConfirmResult(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/academy/students/chart-stats/upload-csv", {
        method: "POST",
        headers: { ...getAuthHeader() },
        body: formData,
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setPreviewData(data);
      } else {
        setErrorMsg(data?.message || "Failed to validate CSV file.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error parsing CSV file.");
    } finally {
      setParsing(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleConfirm = async () => {
    if (!previewData) return;
    const readyCandidates = previewData.preview_candidates.filter((c) => c.status === "ready");
    if (readyCandidates.length === 0) return;
    setConfirming(true);
    setErrorMsg("");
    try {
      const res = await fetch("/api/academy/students/chart-stats/upload-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          filename: previewData.filename,
          candidates: readyCandidates.map((c) => ({ candidateId: c.candidateId, email: c.email, rows: c.rows })),
        }),
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setConfirmResult(data);
        setPreviewData(null);
        if (onUploadSuccess) onUploadSuccess();
      } else {
        setErrorMsg(data?.message || "Failed to apply chart-stats upload.");
      }
    } catch (err) {
      console.error(err);
      setErrorMsg("Error applying chart-stats upload.");
    } finally {
      setConfirming(false);
    }
  };

  const startOver = () => {
    setPreviewData(null);
    setConfirmResult(null);
    setErrorMsg("");
  };

  const STATUS_STYLE = {
    ready: { bg: "#ECFDF5", border: "#A7F3D0", color: "#047857", label: "✅ Ready" },
    already_completed: { bg: "#FFF7ED", border: "#FED7AA", color: "#C2410C", label: "⏭️ Already completed — skipped" },
    not_applicable: { bg: "#F1F5F9", border: "#CBD5E1", color: "#475569", label: "➖ Not required (Billing / AR role)" },
    not_found: { bg: "#FEF2F2", border: "#FECACA", color: "#B91C1C", label: "❓ Not found" },
  };

  const readyCount = previewData ? previewData.preview_candidates.filter((c) => c.status === "ready").length : 0;

  return (
    <div>
      <div style={{ fontSize: 13, color: "#64748B", marginBottom: 16, lineHeight: 1.6 }}>
        Practice platforms (Practicode, Codivia, 3M 360 Encompass, SuperCoder, FlashCode, HCC Coder) don&apos;t offer a public
        API, so Talentera can&apos;t pull chart counts live from them. Instead, upload your own training records here in bulk —
        your students no longer need to hand-type their chart counts into Stage 6 one by one. Students who already
        completed Stage 6 are always skipped, so a bulk upload can never overwrite their own verified submission. Medical-coding charts only: Billing and AR Calling students are not required to submit charts and are skipped automatically.
      </div>

      {errorMsg && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, padding: "10px 14px", color: "#B91C1C", fontSize: 13, fontWeight: 600, marginBottom: 14 }}>
          {errorMsg}
        </div>
      )}

      {confirmResult && (
        <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 10, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#047857", marginBottom: 6 }}>
            ✅ {confirmResult.message}
          </div>
          {confirmResult.updated?.length > 0 && (
            <div style={{ fontSize: 12.5, color: "#065F46", marginBottom: confirmResult.skipped?.length ? 8 : 0 }}>
              Updated: {confirmResult.updated.map((u) => `${u.email} (${u.totalCharts} charts, ${u.tier})`).join(", ")}
            </div>
          )}
          {confirmResult.skipped?.length > 0 && (
            <div style={{ fontSize: 12.5, color: "#92400E" }}>
              Skipped: {confirmResult.skipped.map((s) => `${s.email} — ${s.reason}`).join("; ")}
            </div>
          )}
          <button
            onClick={startOver}
            style={{ marginTop: 12, background: "#06152A", color: "#fff", border: "none", borderRadius: 6, padding: "8px 16px", fontSize: 12.5, fontWeight: 700, cursor: "pointer" }}
          >
            Upload another file
          </button>
        </div>
      )}

      {!previewData && !confirmResult && (
        <>
          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
            <button
              onClick={downloadSampleCsv}
              style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#334155", cursor: "pointer" }}
            >
              ⬇️ Download sample CSV template
            </button>
          </div>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            style={{
              border: `2px dashed ${dragActive ? "#06152A" : "#CBD5E1"}`,
              borderRadius: 12,
              padding: "40px 20px",
              textAlign: "center",
              background: dragActive ? "#F1F5F9" : "#F8FAFC",
              transition: "all 0.15s ease",
            }}
          >
            <div style={{ fontSize: 32, marginBottom: 8 }}>📊</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#06152A", marginBottom: 4 }}>
              {parsing ? "Parsing CSV..." : "Drag & drop your chart-stats CSV here"}
            </div>
            <div style={{ fontSize: 12.5, color: "#64748B", marginBottom: 14 }}>
              Columns: email, specialty, charts_coded, accuracy_pct, min_per_chart, last_coded_date — one row per
              student per specialty.
            </div>
            <label
              style={{
                display: "inline-block",
                background: "#06152A",
                color: "#fff",
                borderRadius: 6,
                padding: "8px 18px",
                fontSize: 12.5,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Browse file
              <input
                type="file"
                accept=".csv"
                style={{ display: "none" }}
                disabled={parsing}
                onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
              />
            </label>
          </div>
        </>
      )}

      {previewData && (
        <div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {[
              { label: "Ready to update", value: readyCount, color: "#047857" },
              { label: "Already completed / not applicable (skipped)", value: previewData.skipped_count, color: "#C2410C" },
              { label: "Not found", value: previewData.not_found_count, color: "#B91C1C" },
              { label: "Row errors", value: previewData.row_errors?.length || 0, color: "#92400E" },
            ].map((s) => (
              <div key={s.label} style={{ flex: "1 1 160px", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 14px" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 11.5, color: "#64748B", fontWeight: 600 }}>{s.label}</div>
              </div>
            ))}
          </div>

          <div style={{ border: "1px solid #E2E8F0", borderRadius: 10, overflow: "hidden", marginBottom: 16 }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#F1F5F9" }}>
                  <th style={{ textAlign: "left", padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Student</th>
                  <th style={{ textAlign: "left", padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Specialties</th>
                  <th style={{ textAlign: "right", padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Total charts</th>
                  <th style={{ textAlign: "left", padding: "9px 14px", fontSize: 11.5, fontWeight: 700, color: "#475569" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {previewData.preview_candidates.map((c, idx) => {
                  const st = STATUS_STYLE[c.status] || STATUS_STYLE.not_found;
                  return (
                    <tr key={idx} style={{ borderTop: "1px solid #E2E8F0" }}>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, color: "#0F172A" }}>
                        <div style={{ fontWeight: 700 }}>{c.candidateName || c.email}</div>
                        <div style={{ fontSize: 11, color: "#94A3B8" }}>{c.email}</div>
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12, color: "#334155" }}>
                        {c.rows.map((r) => `${r.name} (${r.count})`).join(", ")}
                      </td>
                      <td style={{ padding: "9px 14px", fontSize: 12.5, color: "#0F172A", textAlign: "right", fontWeight: 700 }}>
                        {c.totalCharts}
                      </td>
                      <td style={{ padding: "9px 14px" }}>
                        <span style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.color, borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 700 }}>
                          {st.label}
                        </span>
                        {c.reason && <div style={{ fontSize: 10.5, color: "#94A3B8", marginTop: 2 }}>{c.reason}</div>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {previewData.row_errors?.length > 0 && (
            <div style={{ background: "#FFFBEB", border: "1px solid #FDE68A", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 12, color: "#92400E" }}>
              <div style={{ fontWeight: 700, marginBottom: 4 }}>{previewData.row_errors.length} row(s) could not be read:</div>
              {previewData.row_errors.slice(0, 8).map((e, i) => (
                <div key={i}>Row {e.row} ({e.email || "no email"}): {e.errors.join(" ")}</div>
              ))}
            </div>
          )}

          <div style={{ display: "flex", gap: 10 }}>
            <button
              onClick={handleConfirm}
              disabled={confirming || readyCount === 0}
              style={{
                background: readyCount === 0 ? "#CBD5E1" : "#06152A",
                color: "#fff",
                border: "none",
                borderRadius: 6,
                padding: "10px 20px",
                fontSize: 13,
                fontWeight: 700,
                cursor: readyCount === 0 ? "not-allowed" : "pointer",
              }}
            >
              {confirming ? "Applying..." : `Confirm Upload (${readyCount} student${readyCount === 1 ? "" : "s"})`}
            </button>
            <button
              onClick={startOver}
              disabled={confirming}
              style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "10px 20px", fontSize: 13, fontWeight: 700, color: "#334155", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
