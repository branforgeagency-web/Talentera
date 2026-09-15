import React, { useState, useEffect } from "react";
import { safeJson } from "../../utils/safeJson.js";

export default function UploadAndInvitesEngine({ batches = [], courses = [], getAuthHeader, onUploadSuccess }) {
  const [activeTab, setActiveTab] = useState("bulk_csv"); // "bulk_csv" | "single_add" | "invites_tracker"

  // Bulk Upload State
  const [dragActive, setDragActive] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(batches[0]?.code || "JAN-HCC-01");
  const [selectedCourse, setSelectedCourse] = useState(courses[0]?.title || "HCC Coding Specialization");
  const [parsedData, setParsedData] = useState(null);
  const [excludedRowIndexes, setExcludedRowIndexes] = useState(new Set());
  const [parsing, setParsing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // Single Add State
  const [singleName, setSingleName] = useState("");
  const [singleEmail, setSingleEmail] = useState("");
  const [singleMobile, setSingleMobile] = useState("");
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
    setSingleSaving(true);
    try {
      const res = await fetch("/api/academy/students/add-single", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeader() },
        body: JSON.stringify({
          name: singleName,
          email: singleEmail,
          mobile: singleMobile,
          batchCode: selectedBatch,
          course: selectedCourse,
          type: singleType,
          preferredSpecialty: singleSpecialty,
          expectedSalaryLpa: singleSalary,
          preferredCities: [singleCity],
          branch: singleCity,
        }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message || "Student added and OTP invite sent!");
        setSingleName("");
        setSingleEmail("");
        setSingleMobile("");
        if (onUploadSuccess) onUploadSuccess();
        setActiveTab("invites_tracker");
      } else {
        alert(data.message || "Failed to add student.");
      }
    } catch (err) {
      console.error(err);
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

  return (
    <div>
      {/* Top Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: "#06152A" }}>Bulk Upload & Invite Engine</h2>
          <div style={{ fontSize: 12, color: "#64748B" }}>
            Upload batches of student candidates with live CSV row-level validation, multi-channel OTP invites (Email + SMS + WhatsApp), and live delivery tracking.
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, background: "#E2E8F0", padding: 3, borderRadius: 999 }}>
          <button
            onClick={() => setActiveTab("bulk_csv")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "bulk_csv" ? "#06152A" : "transparent",
              color: activeTab === "bulk_csv" ? "#fff" : "#475569",
            }}
          >
            📁 Bulk CSV Upload
          </button>
          <button
            onClick={() => setActiveTab("single_add")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
              background: activeTab === "single_add" ? "#06152A" : "transparent",
              color: activeTab === "single_add" ? "#fff" : "#475569",
            }}
          >
            👤 Add Single Student
          </button>
          <button
            onClick={() => setActiveTab("invites_tracker")}
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              border: "none",
              fontSize: 11,
              fontWeight: 700,
              cursor: "pointer",
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
          <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: "1px solid #E2E8F0", marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 2 }}>TARGET BATCH</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontWeight: 700 }}
                >
                  {batches.map((b) => (
                    <option key={b._id || b.code} value={b.code}>{b.code} ({b.course})</option>
                  ))}
                  <option value="JAN-HCC-01">JAN-HCC-01 (HCC Specialization)</option>
                  <option value="FEB-ED-02">FEB-ED-02 (ED Coding Foundation)</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 10, fontWeight: 800, color: "#64748B", display: "block", marginBottom: 2 }}>COURSE SPECIALTY</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                >
                  {courses.map((c) => (
                    <option key={c._id || c.title} value={c.title}>{c.title}</option>
                  ))}
                  <option value="HCC Coding Specialization">HCC Coding Specialization</option>
                  <option value="ED Coding Foundation">ED Coding Foundation</option>
                </select>
              </div>
            </div>

            <button
              onClick={downloadCsvTemplate}
              style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", padding: "6px 12px", borderRadius: 6, fontSize: 11, fontWeight: 700, color: "#2563EB", cursor: "pointer" }}
            >
              📥 Download Sample CSV Template
            </button>
          </div>

          {/* Drag and Drop Box */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            style={{
              background: dragActive ? "#EFF6FF" : "#fff",
              border: `2px dashed ${dragActive ? "#2563EB" : "#CBD5E1"}`,
              borderRadius: 14,
              padding: "36px 20px",
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
            <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: 36, color: "#2563EB", marginBottom: 10 }}></i>
            <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>
              {parsing ? "Parsing & Validating CSV rows..." : "Drag CSV here or click to browse"}
            </h4>
            <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
              Supports up to 500 rows · Columns: <code>name</code>, <code>email</code>, <code>mobile</code>, <code>batch_code</code>, <code>course_id</code>, <code>type</code>
            </p>
          </div>

          {/* LIVE ROW-BY-ROW PREVIEW TABLE */}
          {parsedData && (
            <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #E2E8F0" }}>
              {/* Summary Notification Banner */}
              <div
                style={{
                  background: parsedData.rejected_count > 0 ? "#FFFBEB" : "#F0FDF4",
                  border: `1px solid ${parsedData.rejected_count > 0 ? "#FDE68A" : "#BBF7D0"}`,
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 14,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <div>
                  <strong style={{ fontSize: 13, color: parsedData.rejected_count > 0 ? "#B45309" : "#15803D" }}>
                    📊 {parsedData.summary}
                  </strong>
                  <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                    {parsedData.accepted_count} students ready to receive instant OTP verification invites.
                  </div>
                </div>

                <button
                  className="btn btn-navy"
                  style={{ fontSize: 12, padding: "8px 16px" }}
                  onClick={handleConfirmUpload}
                  disabled={confirming || parsedData.accepted_count === 0}
                >
                  {confirming ? "Queueing Invites..." : `Upload & Invite ${parsedData.accepted_count - excludedRowIndexes.size} Students →`}
                </button>
              </div>

              {/* Rows Table */}
              <div style={{ maxHeight: 360, overflowY: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                  <thead>
                    <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textAlign: "left", textTransform: "uppercase", fontSize: 10, color: "#64748B" }}>
                      <th style={{ padding: "8px 10px", width: 36 }}>INCLUDE</th>
                      <th style={{ padding: "8px 10px" }}>ROW #</th>
                      <th style={{ padding: "8px 10px" }}>STUDENT NAME</th>
                      <th style={{ padding: "8px 10px" }}>EMAIL</th>
                      <th style={{ padding: "8px 10px" }}>MOBILE</th>
                      <th style={{ padding: "8px 10px" }}>TYPE</th>
                      <th style={{ padding: "8px 10px" }}>BATCH</th>
                      <th style={{ padding: "8px 10px" }}>VALIDATION STATUS</th>
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
                          <td style={{ padding: "8px 10px", textAlign: "center" }}>
                            <input
                              type="checkbox"
                              checked={row.isValid && !isExcluded}
                              disabled={!row.isValid}
                              onChange={() => toggleExcludeRow(row.rowIndex)}
                            />
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700 }}>#{row.rowIndex}</td>
                          <td style={{ padding: "8px 10px", fontWeight: 600 }}>{row.data.name}</td>
                          <td style={{ padding: "8px 10px" }}>{row.data.email}</td>
                          <td style={{ padding: "8px 10px" }}>{row.data.mobile}</td>
                          <td style={{ padding: "8px 10px" }}>
                            <span style={{ textTransform: "capitalize", background: "#F1F5F9", padding: "2px 6px", borderRadius: 4, fontSize: 10 }}>
                              {row.data.type}
                            </span>
                          </td>
                          <td style={{ padding: "8px 10px", fontWeight: 700 }}>{row.data.batchCode}</td>
                          <td style={{ padding: "8px 10px" }}>
                            {row.isValid ? (
                              <span style={{ color: "#15803D", fontWeight: 700 }}>✓ Valid · Ready to invite</span>
                            ) : (
                              <div>
                                <span style={{ color: "#DC2626", fontWeight: 800 }}>⚠️ Needs Fix</span>
                                <div style={{ color: "#B91C1C", fontSize: 10, marginTop: 2 }}>
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
        <div style={{ maxWidth: 600, background: "#fff", borderRadius: 14, padding: 22, border: "1px solid #E2E8F0" }}>
          <h4 style={{ margin: "0 0 4px", fontSize: 16, fontWeight: 800, color: "#06152A" }}>
            Add Individual Student Candidate
          </h4>
          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
            Triggers the same auto-invite flow via Email & SMS with pre-filled signup and Stage 1 verification.
          </p>

          <form onSubmit={handleSingleAddSubmit}>
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>FULL LEGAL NAME *</label>
              <input
                type="text"
                required
                value={singleName}
                onChange={(e) => setSingleName(e.target.value)}
                placeholder="e.g. Priya Subramanian"
                style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>EMAIL ADDRESS *</label>
                <input
                  type="email"
                  required
                  value={singleEmail}
                  onChange={(e) => setSingleEmail(e.target.value)}
                  placeholder="priya@example.com"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>MOBILE NUMBER (10 DIGITS) *</label>
                <input
                  type="tel"
                  required
                  value={singleMobile}
                  onChange={(e) => setSingleMobile(e.target.value)}
                  placeholder="9876543210"
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>ASSIGNED BATCH</label>
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                >
                  <option value="JAN-HCC-01">JAN-HCC-01</option>
                  <option value="FEB-ED-02">FEB-ED-02</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>EXPERIENCE TYPE</label>
                <select
                  value={singleType}
                  onChange={(e) => setSingleType(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                >
                  <option value="fresher">Fresher</option>
                  <option value="experienced">Experienced (1+ yrs)</option>
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>SPECIALTY</label>
                <select
                  value={singleSpecialty}
                  onChange={(e) => setSingleSpecialty(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                >
                  <option value="HCC">HCC / Risk Adjustment</option>
                  <option value="ED">ED Coding</option>
                  <option value="Surgery">Surgery Coding</option>
                  <option value="AR">AR Calling</option>
                  <option value="E&M">OP / E&M</option>
                  <option value="IPDRG">IP DRG</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: 11, fontWeight: 800, color: "#475569", display: "block", marginBottom: 4 }}>EXPECTED SALARY (LPA)</label>
                <input
                  type="number"
                  step="0.5"
                  value={singleSalary}
                  onChange={(e) => setSingleSalary(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-navy"
              style={{ width: "100%", justifyContent: "center", padding: "10px" }}
              disabled={singleSaving}
            >
              {singleSaving ? "Registering & Sending OTP Invite..." : "Register & Send OTP Invite →"}
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 3: LIVE INVITES TRACKER */}
      {activeTab === "invites_tracker" && (
        <div style={{ background: "#fff", borderRadius: 14, padding: 18, border: "1px solid #E2E8F0" }}>
          {/* Controls Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["All", "sent", "delivered", "opened", "signed_up", "stalled"].map((filterKey) => (
                <button
                  key={filterKey}
                  onClick={() => setInviteFilter(filterKey)}
                  style={{
                    padding: "4px 12px",
                    borderRadius: 999,
                    border: "none",
                    fontSize: 10,
                    fontWeight: 700,
                    cursor: "pointer",
                    textTransform: "capitalize",
                    background: inviteFilter === filterKey ? "#06152A" : "#F1F5F9",
                    color: inviteFilter === filterKey ? "#fff" : "#475569",
                  }}
                >
                  {filterKey.replace("_", " ")}
                </button>
              ))}
            </div>

            <button className="btn btn-outline" style={{ fontSize: 11 }} onClick={fetchInvites}>
              <i className="fa-solid fa-arrows-rotate" style={{ marginRight: 6 }}></i> Refresh
            </button>
          </div>

          {/* Invites Table */}
          <div style={{ maxHeight: 420, overflowY: "auto" }}>
            {invites.length === 0 ? (
              <div style={{ padding: "40px 14px", textAlign: "center", color: "#94A3B8", fontSize: 12 }}>
                <i className="fa-solid fa-envelope-open-text" style={{ fontSize: 28, marginBottom: 8, display: "block" }}></i>
                No invites found matching this filter.
              </div>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
                <thead>
                  <tr style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", fontSize: 10, color: "#64748B", textAlign: "left" }}>
                    <th style={{ padding: "10px 12px" }}>STUDENT</th>
                    <th style={{ padding: "10px 12px" }}>CONTACT INFO</th>
                    <th style={{ padding: "10px 12px" }}>BATCH</th>
                    <th style={{ padding: "10px 12px" }}>CHANNELS</th>
                    <th style={{ padding: "10px 12px" }}>INVITE STATUS</th>
                    <th style={{ padding: "10px 12px" }}>LAST EVENT</th>
                    <th style={{ padding: "10px 12px", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {invites
                    .filter((inv) => !inviteSearch || inv.name.toLowerCase().includes(inviteSearch.toLowerCase()) || inv.email.toLowerCase().includes(inviteSearch.toLowerCase()))
                    .map((inv) => {
                      const badge = getInviteStatusBadge(inv.status);
                      return (
                        <tr key={inv._id} style={{ borderBottom: "1px solid #F1F5F9" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 700, color: "#06152A" }}>
                            {inv.name}
                          </td>
                          <td style={{ padding: "10px 12px", color: "#475569" }}>
                            <div>{inv.email}</div>
                            <div style={{ fontSize: 10, color: "#94A3B8" }}>{inv.mobile}</div>
                          </td>
                          <td style={{ padding: "10px 12px", fontWeight: 700 }}>{inv.batchCode}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div style={{ display: "flex", gap: 4, fontSize: 11 }}>
                              <span title="Email (SendGrid)" style={{ color: "#2563EB" }}><i className="fa-solid fa-envelope"></i></span>
                              <span title="SMS (MSG91)" style={{ color: "#15803D" }}><i className="fa-solid fa-comment-sms"></i></span>
                              <span title="WhatsApp (Gupshup)" style={{ color: "#16A34A" }}><i className="fa-brands fa-whatsapp"></i></span>
                            </div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ background: badge.bg, color: badge.color, fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>
                              {badge.label}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px", color: "#64748B", fontSize: 10 }}>
                            {inv.signupCompletedAt ? "Signed up on portal" : inv.emailOpenedAt ? "Email link opened" : "SMS delivered (MSG91)"}
                          </td>
                          <td style={{ padding: "10px 12px", textAlign: "right" }}>
                            <button
                              className="btn btn-outline"
                              style={{ fontSize: 10, padding: "3px 8px" }}
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
