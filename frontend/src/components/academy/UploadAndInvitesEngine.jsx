import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";
import ChartStatsUpload from "./ChartStatsUpload.jsx";

// Broad RCM "Domain" buckets - kept deliberately short (this is the coarse
// grouping used by the Domain field, and by AcademyPortal.jsx's Edit Candidate
// modal via its own DOMAIN_OPTIONS copy of this same list).
const DEFAULT_COURSES = [
  { title: "Medical Coding" },
  { title: "Medical Billing" },
  { title: "AR Calling" },
  { title: "Other" },
];

// Default Course / Training Course options - the specific curriculum a batch or
// candidate is enrolled in, one level more specific than the Domain buckets above.
// "Medical Coding" (general) is listed first since a fresher usually hasn't picked
// a specialization yet; the rest cover the common RCM (Revenue Cycle Management)
// training tracks an academy is likely to run.
const TRAINING_COURSE_OPTIONS = [
  { title: "Medical Coding" },
  { title: "Basic Medical Coding" },
  { title: "Medical Billing" },
  { title: "AR Calling" },
  { title: "AMCT" },
  { title: "CPC" },
  { title: "HCC Coding / Risk Adjustment" },
  { title: "E/M Coding" },
  { title: "IP-DRG Coding" },
  { title: "Surgery Coding" },
  { title: "ED Coding" },
  { title: "Denial Management" },
  { title: "Payment Posting" },
  { title: "Charge Entry" },
  { title: "Eligibility & Benefits Verification" },
  { title: "Prior Authorization" },
  { title: "Credentialing" },
  { title: "Other" },
];

// Ready-made "Batch 1(<Month> <Year>)" names for the current and next year, so
// staff can pick a correctly-formatted batch name instead of typing it out by
// hand. The Assigned/Target Batch fields stay free text underneath this picker,
// so a second/third batch in the same month (Batch 2, Batch 3, ...) or a custom
// name can still be typed or edited in directly.
const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function getBatchNameOptions() {
  const year = new Date().getFullYear();
  return [
    ...MONTH_ABBR.map((m) => `Batch 1(${m} ${year})`),
    ...MONTH_ABBR.map((m) => `Batch 1(${m} ${year + 1})`),
  ];
}
const BATCH_NAME_OPTIONS = getBatchNameOptions();

export default function UploadAndInvitesEngine({
  batches = [],
  courses = [],
  getAuthHeader,
  onUploadSuccess,
  defaultTab = "bulk_csv",
}) {
  const [activeTab, setActiveTab] = useState(defaultTab || "bulk_csv");

  useEffect(() => {
    if (defaultTab) {
      setActiveTab(defaultTab);
    }
  }, [defaultTab]);

  // The academy's full course library (academy.courses, with category/duration/
  // syllabus) is a separate concept from what goes in this screen's course pickers.
  // Default Course / Training Course use the broader RCM training-track list so a
  // fresher can pick plain "Medical Coding" instead of being forced into a
  // specialization they don't know yet - always the fixed TRAINING_COURSE_OPTIONS
  // list here rather than the (possibly old-seeded) `courses` prop.
  const availableCourses = TRAINING_COURSE_OPTIONS;

  // Bulk Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedCourse, setSelectedCourse] = useState(availableCourses[0]?.title || "Medical Coding");
  const [selectedCourseOther, setSelectedCourseOther] = useState("");
  const [parsedData, setParsedData] = useState(null);
  const [excludedRowIndexes, setExcludedRowIndexes] = useState(new Set());
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Single Add State
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleBatch, setSingleBatch] = useState("");
  const [singleAdmission, setSingleAdmission] = useState("");
  const [singleAadhaar, setSingleAadhaar] = useState("");
  const [singleSaving, setSingleSaving] = useState(false);

  // Invites Tracker State
  const [invites, setInvites] = useState([]);
  const [inviteFilter, setInviteFilter] = useState("All");
  const [inviteSearch, setInviteSearch] = useState("");
  const [invitesLoading, setInvitesLoading] = useState(false);
  const [resendingId, setResendingId] = useState(null);

  const fetchInvites = async () => {
    try {
      setInvitesLoading(true);
      const url = inviteFilter === "All" ? "/api/academy/invites" : `/api/academy/invites?status=${inviteFilter}`;
      const res = await fetch(url, { headers: { ...getAuthHeader() } });
      const data = await safeJson(res);
      if (data && data.invites) {
        setInvites(data.invites);
      }
    } catch (err) {
      console.error("Fetch invites error:", err);
    } finally {
      setInvitesLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === "invites_tracker") {
      fetchInvites();
    }
  }, [activeTab, inviteFilter]);

  const downloadCsvTemplate = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      encodeURIComponent(
        "Academy batch unique id,Aadhaar_last4,Name,Email,Month & Year of admission\n" +
        "VH0102,3456,Priya Subramanian,priya.s@example.com,Jan-26\n" +
        "VH0103,7890,Karthik Raja,karthik.r@example.com,May-26\n" +
        "VH0104,1122,Ananya Roy,ananya.r@example.com,Aug-26\n"
      );
    const link = document.createElement("a");
    link.setAttribute("href", csvContent);
    link.setAttribute("download", "talentera_student_upload_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleFileUpload = async (file) => {
    if (!file) return;
    if (selectedCourse === "Other" && !selectedCourseOther.trim()) {
      alert("Please type the course name for \"Other\".");
      return;
    }
    setParsing(true);
    setExcludedRowIndexes(new Set());
    try {
      const effectiveCourse = selectedCourse === "Other" ? selectedCourseOther.trim() || "Other" : selectedCourse;
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batch_id", selectedBatch);
      formData.append("course", effectiveCourse);

      const res = await fetch("/api/academy/students/upload-csv", {
        method: "POST",
        headers: { ...getAuthHeader() },
        body: formData,
      });
      const data = await safeJson(res);
      if (res.ok && data) {
        setParsedData(data);
      } else {
        alert(data?.message || "Failed to validate CSV file.");
      }
    } catch (err) {
      console.error(err);
      alert("Error parsing CSV file.");
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

  const toggleExcludeRow = (rowIdx) => {
    setExcludedRowIndexes((prev) => {
      const next = new Set(prev);
      if (next.has(rowIdx)) next.delete(rowIdx);
      else next.add(rowIdx);
      return next;
    });
  };

  const handleConfirmUpload = async () => {
    if (!parsedData || !parsedData.preview_rows) return;
    const acceptedRows = parsedData.preview_rows
      .filter((r) => r.isValid && !excludedRowIndexes.has(r.rowIndex))
      .map((r) => r.data);

    if (acceptedRows.length === 0) {
      alert("No valid rows selected to invite.");
      return;
    }

    // Rows the uploaded file had but that will NOT get invited - either the CSV
    // validator flagged them (duplicate email/mobile/Aadhaar, bad format, etc.) or the
    // academy manually unchecked them. Called out explicitly in the success alert below
    // so "I uploaded 6 but only 5 showed up" is never a silent surprise - the row and the
    // exact reason are right there at confirm time, not just buried in the preview table.
    const skippedRows = parsedData.preview_rows.filter(
      (r) => !r.isValid || excludedRowIndexes.has(r.rowIndex)
    );

    setConfirming(true);
    try {
      const res = await fetch("/api/academy/students/upload-confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          upload_id: parsedData.upload_id,
          rows_to_accept: acceptedRows,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        let msg = `✅ ${data.message || `${acceptedRows.length} invites queued successfully!`}`;
        if (skippedRows.length > 0) {
          const details = skippedRows
            .map((r) => {
              const reason = !r.isValid ? r.errors.join("; ") : "unchecked before confirming";
              return `Row #${r.rowIndex} - ${r.data.name}: ${reason}`;
            })
            .join("\n");
          msg += `\n\n⚠️ ${skippedRows.length} row(s) from your file were NOT invited:\n${details}`;
        }
        alert(msg);
        setParsedData(null);
        if (onUploadSuccess) onUploadSuccess();
        setActiveTab("invites_tracker");
      } else {
        alert(data?.message || "Failed to confirm upload.");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConfirming(false);
    }
  };

  const handleSingleAddSubmit = async (e) => {
    e.preventDefault();
    if (!singleBatch.trim()) {
      alert("Please enter the Academy batch unique ID (e.g. VH0102).");
      return;
    }
    if (singleAadhaar.replace(/\D/g, "").length < 4) {
      alert("Please enter the Aadhaar last 4 digits.");
      return;
    }

    setSingleSaving(true);
    try {
      const res = await fetch("/api/academy/students/add-single", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          batchCode: singleBatch.trim(),
          aadhaar: singleAadhaar,
          name: singleName.trim(),
          email: singleEmail.trim(),
          admissionMonthYear: singleAdmission.trim(),
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        const icon = data?.isNewCandidate && data?.isNewInvite ? "✅" : "ℹ️";
        alert(`${icon} ${data.message || "Student added and invite sent!"}`);
        setSingleName("");
        setSingleEmail("");
        setSingleAdmission("");
        setSingleAadhaar("");
        if (onUploadSuccess) onUploadSuccess();
        setActiveTab("invites_tracker");
      } else {
        alert(data?.message || "Failed to add student.");
      }
    } catch (err) {
      console.error(err);
      alert("Error adding student.");
    } finally {
      setSingleSaving(false);
    }
  };

  const handleResendInvite = async (inviteId) => {
    setResendingId(inviteId);
    try {
      const res = await fetch(`/api/academy/invites/${inviteId}/resend`, {
        method: "POST",
        headers: { ...getAuthHeader() },
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(`✅ ${data.message || "Invite resent successfully!"}`);
        fetchInvites();
      } else {
        alert(data?.message || "Failed to resend invite.");
      }
    } catch (err) {
      console.error(err);
      alert("Error resending invite.");
    } finally {
      setResendingId(null);
    }
  };

  const getInviteStatusBadge = (st) => {
    switch (st) {
      case "signed_up":
        return { bg: "#DCFCE7", color: "#15803D", label: "Signed Up ✓" };
      case "opened":
        return { bg: "#EFF6FF", color: "#2563EB", label: "Opened" };
      case "delivered":
        return { bg: "#FEF3C7", color: "#B45309", label: "Delivered" };
      case "sent":
        return { bg: "#F1F5F9", color: "#475569", label: "Sent" };
      default:
        return { bg: "#FEE2E2", color: "#DC2626", label: "Stalled (72h)" };
    }
  };

  const filteredInvites = invites.filter((inv) => {
    if (!inviteSearch.trim()) return true;
    const q = inviteSearch.toLowerCase().trim();
    return (
      (inv.name || "").toLowerCase().includes(q) ||
      (inv.email || "").toLowerCase().includes(q) ||
      (inv.mobile || "").includes(q) ||
      (inv.batchCode || "").toLowerCase().includes(q)
    );
  });

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Bulk Upload & Invite Engine</h2>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
            Enroll student batches with live CSV row-level validation, multi-channel verification invites (Email + SMS), and live delivery tracking.
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, background: "#E2E8F0", padding: 4, borderRadius: 999 }}>
          <button
            onClick={() => setActiveTab("bulk_csv")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "bulk_csv" ? "#06152A" : "transparent",
              color: activeTab === "bulk_csv" ? "#fff" : "#475569",
            }}
          >
            📁 Bulk CSV Upload
          </button>
          <button
            onClick={() => setActiveTab("single_add")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "single_add" ? "#06152A" : "transparent",
              color: activeTab === "single_add" ? "#fff" : "#475569",
            }}
          >
            👤 Add Single Student
          </button>
          <button
            onClick={() => setActiveTab("invites_tracker")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "invites_tracker" ? "#06152A" : "transparent",
              color: activeTab === "invites_tracker" ? "#fff" : "#475569",
            }}
          >
            📡 Live Invites Tracker
          </button>
          <button
            onClick={() => setActiveTab("chart_stats")}
            style={{
              padding: "7px 16px",
              borderRadius: 999,
              border: "none",
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "chart_stats" ? "#06152A" : "transparent",
              color: activeTab === "chart_stats" ? "#fff" : "#475569",
            }}
          >
            📊 Chart Stats Upload
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: BULK CSV UPLOAD */}
      {activeTab === "bulk_csv" && (
        <div>
          {/* Config Bar */}
          <div
            style={{
              background: "#fff",
              borderRadius: 12,
              padding: 16,
              border: "1px solid #E2E8F0",
              marginBottom: 16,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
            }}
          >
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
                  TARGET BATCH
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  <input
                    type="text"
                    value={selectedBatch}
                    onChange={(e) => setSelectedBatch(e.target.value)}
                    placeholder="ex: Batch 1(Jan 2026)"
                    style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 700, minWidth: 180 }}
                  />
                  <select
                    value=""
                    onChange={(e) => { if (e.target.value) setSelectedBatch(e.target.value); }}
                    title="Quick pick a correctly-formatted batch name"
                    style={{ padding: "8px 8px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12, color: "#64748B" }}
                  >
                    <option value="">Quick pick...</option>
                    {BATCH_NAME_OPTIONS.map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 4, textTransform: "uppercase" }}>
                  DEFAULT COURSE
                </label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, minWidth: 220 }}
                >
                  {availableCourses.map((c) => (
                    <option key={c._id || c.title} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
                {selectedCourse === "Other" && (
                  <input
                    type="text"
                    value={selectedCourseOther}
                    onChange={(e) => setSelectedCourseOther(e.target.value)}
                    placeholder="Type the course name"
                    style={{ marginTop: 6, padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, minWidth: 220 }}
                  />
                )}
              </div>
            </div>

            <button
              onClick={downloadCsvTemplate}
              style={{
                background: "#F1F5F9",
                border: "1px solid #CBD5E1",
                padding: "8px 14px",
                borderRadius: 8,
                fontSize: 12,
                fontWeight: 700,
                color: "#2563EB",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              📥 Download Sample CSV Template
            </button>
          </div>

          {/* Drag and Drop Box */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            style={{
              background: dragActive ? "#EFF6FF" : "#fff",
              border: `2px dashed ${dragActive ? "#2563EB" : "#CBD5E1"}`,
              borderRadius: 14,
              padding: "40px 24px",
              textAlign: "center",
              cursor: "pointer",
              marginBottom: 16,
              transition: "all 0.15s ease",
            }}
            onClick={() => document.getElementById("csv_file_input").click()}
          >
            <input
              id="csv_file_input"
              type="file"
              accept=".csv,.xlsx"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
            <div style={{ fontSize: 40, color: "#2563EB", marginBottom: 12 }}>
              <i className="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>
              {parsing ? "Parsing & Validating rows..." : "Drag & drop CSV or Excel (.xlsx) file here, or click to browse"}
            </h4>
            <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px" }}>
              Supports up to 500 rows per batch · Automatically checks duplicate emails and Aadhaar (last 4 digits)
            </p>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Columns: <code>Academy batch unique id</code>, <code>Aadhaar_last4</code>, <code>Name</code>, <code>Email</code>, <code>Month &amp; Year of admission</code>
            </div>
          </div>

          {/* LIVE ROW-BY-ROW PREVIEW TABLE */}
          {parsedData && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
              {/* Summary Notification Banner */}
              <div
                style={{
                  background: parsedData.rejected_count > 0 ? "#FFFBEB" : "#F0FDF4",
                  border: `1px solid ${parsedData.rejected_count > 0 ? "#FDE68A" : "#BBF7D0"}`,
                  borderRadius: 10,
                  padding: "14px 18px",
                  marginBottom: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <strong style={{ fontSize: 14, color: parsedData.rejected_count > 0 ? "#B45309" : "#15803D" }}>
                    📊 {parsedData.summary}
                  </strong>
                  <div style={{ fontSize: 12, color: "#64748B", marginTop: 3 }}>
                    {parsedData.accepted_count} students ready to receive instant transactional invite emails with prefilled Stage 1 & Stage 2 onboarding.
                  </div>
                </div>

                <button
                  className="btn btn-navy"
                  style={{ fontSize: 13, padding: "10px 20px", fontWeight: 800 }}
                  onClick={handleConfirmUpload}
                  disabled={confirming || parsedData.accepted_count === 0}
                >
                  {confirming ? "Queueing Invites..." : `Upload & Invite ${Math.max(0, parsedData.accepted_count - excludedRowIndexes.size)} Students →`}
                </button>
              </div>

              {/* Rows Table */}
              <div style={{ maxHeight: 380, overflowY: "auto", border: "1px solid #F1F5F9", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", textTransform: "uppercase", fontSize: 10, color: "#64748B" }}>
                      <th style={{ padding: "10px 12px", width: 44, textAlign: "center" }}>INCLUDE</th>
                      <th style={{ padding: "10px 12px" }}>ROW #</th>
                      <th style={{ padding: "10px 12px" }}>STUDENT NAME</th>
                      <th style={{ padding: "10px 12px" }}>EMAIL</th>
                      <th style={{ padding: "10px 12px" }}>AADHAAR (LAST 4)</th>
                      <th style={{ padding: "10px 12px" }}>ADMISSION</th>
                      <th style={{ padding: "10px 12px" }}>BATCH ID</th>
                      <th style={{ padding: "10px 12px" }}>VALIDATION STATUS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedData.preview_rows.map((row) => {
                      const isExcluded = excludedRowIndexes.has(row.rowIndex);
                      return (
                        <tr
                          key={row.rowIndex}
                          style={{
                            borderBottom: "1px solid #F1F5F9",
                            background: !row.isValid ? "#FEF2F2" : isExcluded ? "#F8FAFC" : "#fff",
                            color: isExcluded ? "#94A3B8" : "#0F172A",
                          }}
                        >
                          <td style={{ padding: "10px 12px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={row.isValid && !isExcluded}
                              disabled={!row.isValid}
                              onChange={() => toggleExcludeRow(row.rowIndex)}
                              style={{ cursor: row.isValid ? "pointer" : "not-allowed" }}
                            />
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700 }}>#{row.rowIndex}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{row.data.name}</td>
                          <td style={{ padding: "10px 12px" }}>{row.data.email}</td>
                          <td style={{ padding: "10px 12px" }}>{row.data.aadhaarLast4 ? `•••• ${row.data.aadhaarLast4}` : "—"}</td>
                          <td style={{ padding: "10px 12px" }}>{row.data.admissionMonthYear || "—"}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 700 }}>{row.data.batchCode}</td>
                          <td style={{ padding: "10px 12px" }}>
                            {row.isValid ? (
                              <span style={{ color: "#15803D", fontWeight: 700 }}>✓ Valid · Ready to invite</span>
                            ) : (
                              <div>
                                <span style={{ color: "#DC2626", fontWeight: 800 }}>⚠️ Needs Fix</span>
                                <div style={{ color: "#B91C1C", fontSize: 11, marginTop: 2 }}>
                                  {row.errors.join(" • ")}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 2: ADD SINGLE STUDENT */}
      {activeTab === "single_add" && (
        <div style={{ maxWidth: 640, background: "#fff", borderRadius: 14, padding: 26, border: "1px solid #E2E8F0" }}>
          <h4 style={{ margin: "0 0 4px", fontSize: 17, fontWeight: 800, color: "#06152A" }}>
            Add Individual Student Candidate
          </h4>
          <p style={{ fontSize: 13, color: "#64748B", marginBottom: 20 }}>
            Triggers an instant transactional invite email with a unique activation link. Pre-fills Stage 1 & Academy Stage 2 verification.
          </p>

          <form onSubmit={handleSingleAddSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                ACADEMY BATCH UNIQUE ID *
              </label>
              <input
                type="text"
                required
                list="single-batch-ids"
                value={singleBatch}
                onChange={(e) => setSingleBatch(e.target.value)}
                placeholder="e.g. VH0102"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              />
              <datalist id="single-batch-ids">
                {(batches || []).map((b) => (
                  <option key={b._id || b.code} value={b.code} />
                ))}
              </datalist>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                AADHAAR LAST 4 DIGITS *
              </label>
              <input
                type="text"
                required
                inputMode="numeric"
                maxLength={12}
                value={singleAadhaar}
                onChange={(e) => setSingleAadhaar(e.target.value.replace(/[^\d]/g, "").slice(0, 12))}
                placeholder="e.g. 3456"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              />
              <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>
                Only the last 4 digits are stored (used to flag duplicate entries); if you type the full number only that part is kept.
              </div>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                NAME *
              </label>
              <input
                type="text"
                required
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="e.g. Priya Subramanian"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                EMAIL *
              </label>
              <input
                type="email"
                required
                value={singleEmail}
                onChange={(e) => setSingleEmail(e.target.value)}
                placeholder="e.g. priya.s@gmail.com"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                MONTH &amp; YEAR OF ADMISSION
              </label>
              <input
                type="text"
                value={singleAdmission}
                onChange={(e) => setSingleAdmission(e.target.value)}
                placeholder="e.g. Jan-26"
                style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
              />
            </div>

            <button
              type="submit"
              className="btn btn-navy"
              style={{ width: "100%", justifyContent: "center", padding: "12px", fontSize: 14, fontWeight: 800 }}
              disabled={singleSaving}
            >
              {singleSaving ? "Registering & Sending Invite..." : "Register Student & Send Activation Invite →"}
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: LIVE INVITES TRACKER */}
      {activeTab === "invites_tracker" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 20, border: "1px solid #E2E8F0" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["All", "sent", "delivered", "opened", "signed_up", "stalled"].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setInviteFilter(filterKey)}
                  style={{
                    padding: "6px 14px",
                    borderRadius: 999,
                    border: "none",
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    transition: "all 0.15s ease",
                    background: inviteFilter === filterKey ? "#06152A" : "#F1F5F9",
                    color: inviteFilter === filterKey ? "#fff" : "#475569",
                  }}
                >
                  {filterKey === "signed_up" ? "Signed Up ✓" : filterKey.replace("_", " ")}
                </button>
              ))}
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ position: "relative" }}>
                <input
                  type="text"
                  placeholder="Search by name, email, or mobile..."
                  value={inviteSearch}
                  onChange={(e) => setInviteSearch(e.target.value)}
                  style={{
                    padding: "6px 12px 6px 30px",
                    borderRadius: 8,
                    border: "1px solid #CBD5E1",
                    fontSize: 12,
                    width: 240,
                  }}
                />
                <i
                  className="fa-solid fa-magnifying-glass"
                  style={{ position: "absolute", left: 10, top: 9, color: "#94A3B8", fontSize: 11 }}
                ></i>
              </div>

              <button className="btn btn-outline" style={{ fontSize: 11, padding: "6px 12px" }} onClick={fetchInvites}>
                <i className={`fa-solid fa-arrows-rotate ${invitesLoading ? "fa-spin" : ""}`} style={{ marginRight: 6 }}></i>
                Refresh
              </button>
            </div>
          </div>

          {/* Invites Table */}
          <div style={{ maxHeight: 440, overflowY: "auto", border: "1px solid #F1F5F9", borderRadius: 8 }}>
            {filteredInvites.length === 0 ? (
              <div style={{ padding: "48px 16px", textAlign: "center", color: "#94A3B8", fontSize: 13 }}>
                <i className="fa-solid fa-envelope-open-text" style={{ fontSize: 32, marginBottom: 10, display: "block", color: "#CBD5E1" }}></i>
                {invitesLoading ? "Loading invites..." : "No student invites found matching this filter or search query."}
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                    <th style={{ padding: "10px 14px" }}>STUDENT</th>
                    <th style={{ padding: "10px 14px" }}>CONTACT INFO</th>
                    <th style={{ padding: "10px 14px" }}>BATCH / COURSE</th>
                    <th style={{ padding: "10px 14px" }}>CHANNELS</th>
                    <th style={{ padding: "10px 14px" }}>INVITE STATUS</th>
                    <th style={{ padding: "10px 14px" }}>LAST EVENT</th>
                    <th style={{ padding: "10px 14px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInvites.map((inv) => {
                    const badge = getInviteStatusBadge(inv.status);
                    return (
                      <tr key={inv._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                        <td style={{ padding: "10px 14px", fontWeight: 700, color: "#06152A" }}>
                          <div>{inv.name}</div>
                          <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 400 }}>
                            {inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) : ""}
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#475569" }}>
                          <div style={{ fontWeight: 500 }}>{inv.email}</div>
                          <div style={{ fontSize: 11, color: "#94A3B8" }}>{inv.mobile || "—"}</div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ fontWeight: 700, color: "#0F172A" }}>{inv.batchCode}</div>
                          <div style={{ fontSize: 10, color: "#64748B" }}>{inv.course || "Specialization"}</div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <div style={{ display: "flex", gap: 6, fontSize: 12 }}>
                            <span title="Email (SendGrid)" style={{ color: "#2563EB" }}>
                              <i className="fa-solid fa-envelope"></i>
                            </span>
                            <span title="SMS (MSG91)" style={{ color: "#15803D" }}>
                              <i className="fa-solid fa-comment-sms"></i>
                            </span>
                          </div>
                        </td>
                        <td style={{ padding: "10px 14px" }}>
                          <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>
                            {badge.label}
                          </span>
                        </td>
                        <td style={{ padding: "10px 14px", color: "#64748B", fontSize: 11 }}>
                          {inv.signupCompletedAt
                            ? "Signed up on portal ✓"
                            : inv.emailOpenedAt
                            ? "Invite link opened"
                            : inv.emailSentAt
                            ? "Invite email dispatched"
                            : "Delivered"}
                        </td>
                        <td style={{ padding: "10px 14px", textAlign: "right" }}>
                          <button
                            className="btn btn-outline"
                            style={{ fontSize: 11, padding: "4px 10px", borderRadius: 6 }}
                            onClick={() => handleResendInvite(inv._id)}
                            disabled={resendingId === inv._id}
                          >
                            {resendingId === inv._id ? "Sending..." : "🔄 Resend"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: CHART STATS UPLOAD (Stage 6 bulk upload) */}
      {activeTab === "chart_stats" && (
        <div>
          <h3 style={{ margin: "0 0 14px", fontSize: 17, fontWeight: 800, color: "#06152A" }}>
            Stage 6 Chart Stats — Bulk Upload
          </h3>
          <ChartStatsUpload getAuthHeader={getAuthHeader} onUploadSuccess={onUploadSuccess} />
        </div>
      )}
    </div>
  );
}
