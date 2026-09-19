import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

const DEFAULT_BATCHES = [
  { code: "JAN-HCC-01", course: "HCC Coding Specialization" },
  { code: "FEB-ED-02", course: "ED Coding Foundation" },
  { code: "MAR-SURG-03", course: "Surgery & IP-DRG Coding" },
];

const DEFAULT_COURSES = [
  { title: "HCC Coding Specialization" },
  { title: "ED Coding Foundation" },
  { title: "Surgery & IP-DRG Coding" },
  { title: "Outpatient E&M Coding" },
  { title: "AR & Denial Management" },
];

const POPULAR_CITIES = [
  "Coimbatore",
  "Chennai",
  "Bengaluru",
  "Hyderabad",
  "Mumbai",
  "Pune",
  "Kochi",
  "Delhi NCR",
];

const SPECIALTIES = [
  { id: "HCC", name: "HCC / Risk Adjustment" },
  { id: "ED", name: "Emergency Department (ED)" },
  { id: "Surgery", name: "Surgery & Orthopedics" },
  { id: "E&M", name: "Evaluation & Management (E&M)" },
  { id: "IPDRG", name: "Inpatient DRG" },
  { id: "AR", name: "AR Calling & Denial Management" },
];

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

  const availableBatches = batches && batches.length > 0 ? batches : DEFAULT_BATCHES;
  const availableCourses = courses && courses.length > 0 ? courses : DEFAULT_COURSES;

  // Bulk Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(availableBatches[0]?.code || "JAN-HCC-01");
  const [selectedCourse, setSelectedCourse] = useState(availableCourses[0]?.title || "HCC Coding Specialization");
  const [parsedData, setParsedData] = useState(null);
  const [excludedRowIndexes, setExcludedRowIndexes] = useState(new Set());
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Single Add State
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleMobile, setSingleMobile] = useState("");
  const [singleBatch, setSingleBatch] = useState(availableBatches[0]?.code || "JAN-HCC-01");
  const [singleCourse, setSingleCourse] = useState(availableCourses[0]?.title || "HCC Coding Specialization");
  const [singleType, setSingleType] = useState("fresher");
  const [singleSpecialty, setSingleSpecialty] = useState("HCC");
  const [singleSalary, setSingleSalary] = useState("5.0");
  const [singleCity, setSingleCity] = useState("Coimbatore");
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
        "name,email,mobile,batch_code,course_id,type,preferred_specialty,expected_salary_lpa,preferred_cities\n" +
        "Priya Subramanian,priya.s@example.com,9876543201,JAN-HCC-01,HCC Coding Specialization,fresher,HCC,5.5,Chennai;Coimbatore\n" +
        "Karthik Raja,karthik.r@example.com,9876543202,JAN-HCC-01,HCC Coding Specialization,experienced,HCC,6.0,Chennai\n" +
        "Ananya Roy,ananya.r@example.com,9876543203,JAN-HCC-01,HCC Coding Specialization,fresher,ED,5.0,Bengaluru\n"
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
    setParsing(true);
    setExcludedRowIndexes(new Set());
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("batch_id", selectedBatch);
      formData.append("course", selectedCourse);

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
        alert(`✅ ${data.message || `${acceptedRows.length} invites queued successfully!`}`);
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
    const cleanMobile = singleMobile.replace(/\D/g, "");
    if (cleanMobile.length !== 10) {
      alert("Please enter a valid 10-digit mobile number.");
      return;
    }

    setSingleSaving(true);
    try {
      const res = await fetch("/api/academy/students/add-single", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          name: singleName.trim(),
          email: singleEmail.trim(),
          mobile: cleanMobile,
          batchCode: singleBatch,
          course: singleCourse,
          type: singleType,
          preferredSpecialty: singleSpecialty,
          expectedSalaryLpa: singleSalary,
          preferredCities: [singleCity],
          branch: singleCity,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(`✅ ${data.message || "Student added and invite sent!"}`);
        setSingleName("");
        setSingleEmail("");
        setSingleMobile("");
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
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  style={{ padding: "8px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 700, minWidth: 180 }}
                >
                  {availableBatches.map((b) => (
                    <option key={b._id || b.code} value={b.code}>
                      {b.code} {b.course ? `(${b.course})` : ""}
                    </option>
                  ))}
                </select>
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
              accept=".csv"
              style={{ display: "none" }}
              onChange={(e) => handleFileUpload(e.target.files?.[0])}
            />
            <div style={{ fontSize: 40, color: "#2563EB", marginBottom: 12 }}>
              <i className="fa-solid fa-cloud-arrow-up"></i>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>
              {parsing ? "Parsing & Validating CSV rows..." : "Drag & drop CSV file here, or click to browse"}
            </h4>
            <p style={{ fontSize: 12, color: "#64748B", margin: "0 0 8px" }}>
              Supports up to 500 rows per batch · Automatically checks duplicate emails and valid 10-digit mobile numbers
            </p>
            <div style={{ fontSize: 11, color: "#94A3B8" }}>
              Expected Columns: <code>name</code>, <code>email</code>, <code>mobile</code>, <code>batch_code</code>, <code>course_id</code>, <code>type</code>, <code>preferred_specialty</code>, <code>expected_salary_lpa</code>, <code>preferred_cities</code>
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
                      <th style={{ padding: "10px 12px" }}>MOBILE</th>
                      <th style={{ padding: "10px 12px" }}>TYPE</th>
                      <th style={{ padding: "10px 12px" }}>BATCH</th>
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
                          <td style={{ padding: "10px 12px" }}>{row.data.mobile || "—"}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ textTransform: "capitalize", background: "#F1F5F9", padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600 }}>
                              {row.data.type}
                            </span>
                          </td>
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
                FULL LEGAL NAME *
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

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  EMAIL ADDRESS *
                </label>
                <input
                  type="email"
                  required
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="priya@example.com"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  MOBILE NUMBER (10 DIGITS) *
                </label>
                <input
                  type="tel"
                  required
                  maxLength={10}
                  value={singleMobile}
                  onChange={(e) => setSingleMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="9876543210"
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  ASSIGNED BATCH *
                </label>
                <select
                  value={singleBatch}
                  onChange={(e) => setSingleBatch(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                >
                  {availableBatches.map((b) => (
                    <option key={b._id || b.code} value={b.code}>
                      {b.code} {b.course ? `(${b.course})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  TRAINING COURSE *
                </label>
                <select
                  value={singleCourse}
                  onChange={(e) => setSingleCourse(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                >
                  {availableCourses.map((c) => (
                    <option key={c._id || c.title} value={c.title}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  EXPERIENCE LEVEL
                </label>
                <select
                  value={singleType}
                  onChange={(e) => setSingleType(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                >
                  <option value="fresher">Fresher (New Graduate)</option>
                  <option value="experienced">Experienced (1+ Years)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  PRIMARY SPECIALTY
                </label>
                <select
                  value={singleSpecialty}
                  onChange={(e) => setSingleSpecialty(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                >
                  {SPECIALTIES.map((sp) => (
                    <option key={sp.id} value={sp.id}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 20 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  EXPECTED CTC (LPA)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min="2"
                  max="30"
                  value={singleSalary}
                  onChange={(e) => setSingleSalary(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                />
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 6 }}>
                  PREFERRED CITY / BRANCH
                </label>
                <select
                  value={singleCity}
                  onChange={(e) => setSingleCity(e.target.value)}
                  style={{ width: "100%", padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13 }}
                >
                  {POPULAR_CITIES.map((city) => (
                    <option key={city} value={city}>
                      {city}
                    </option>
                  ))}
                </select>
              </div>
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
    </div>
  );
}
