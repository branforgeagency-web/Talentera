import React, { useMemo, useRef, useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { CERT_LIBRARY, CERT_ID_PATTERNS } from "../../data/certLibrary";

function currentYear() {
  return new Date().getFullYear();
}

export default function Stage3Certification({ stage, existingData, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [searchParams] = useSearchParams();

  const paramBody = searchParams.get("body");
  const paramCert = searchParams.get("cert");

  const initialCertType = existingData?.isCertified === false || existingData?.nonCertified === true || existingData?.certType === "non-certified" ? "non-certified" : "certified";
  const [certType, setCertType] = useState(initialCertType);

  const [body, setBody] = useState(
    paramBody && CERT_LIBRARY[paramBody] ? paramBody : existingData?.body || "aapc"
  );
  const [certCode, setCertCode] = useState(
    paramCert || existingData?.certCode || (paramBody && CERT_LIBRARY[paramBody] ? CERT_LIBRARY[paramBody].certs[0].code : CERT_LIBRARY.aapc.certs[0].code)
  );

  useEffect(() => {
    if (paramBody && CERT_LIBRARY[paramBody]) {
      setBody(paramBody);
      if (paramCert) {
        setCertCode(paramCert);
      } else {
        setCertCode(CERT_LIBRARY[paramBody].certs[0].code);
      }
    }
  }, [paramBody, paramCert]);
  const [memberId, setMemberId] = useState(existingData?.memberId || "");
  const initialIssueDate = existingData?.issueDate || "";
  const initialMonthMatch = initialIssueDate.match(/^[A-Za-z]+/);
  const initialYearMatch = initialIssueDate.match(/\d{4}/);

  const [issueMonth, setIssueMonth] = useState(initialMonthMatch ? initialMonthMatch[0] : "");
  const [issueYear, setIssueYear] = useState(initialYearMatch ? initialYearMatch[0] : "");
  const [issueDate, setIssueDate] = useState(initialIssueDate);

  function handleMonthYearChange(month, year) {
    setIssueMonth(month);
    setIssueYear(year);
    if (month && year) {
      setIssueDate(`${month} ${year}`);
    } else if (year) {
      setIssueDate(year);
    } else {
      setIssueDate("");
    }
  }

  const [docName, setDocName] = useState(existingData?.docName || "");
  const [docUrl, setDocUrl] = useState(existingData?.docUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bodyData = CERT_LIBRARY[body];
  const selectedCert = useMemo(() => bodyData?.certs?.find((c) => c.code === certCode) || bodyData?.certs?.[0] || {}, [bodyData, certCode]);
  const pattern = CERT_ID_PATTERNS[body] || { regex: /^[A-Za-z0-9]{8}$/ };

  const idState = memberId.length === 0 ? "idle" : pattern.regex.test(memberId) ? "valid" : "invalid";
  const yearMatch = issueDate.match(/\d{4}/);
  const year = yearMatch ? Number(yearMatch[0]) : null;
  const dateState = !issueDate ? "idle" : year && year >= 2010 && year <= currentYear() ? "valid" : "invalid";

  function handleBodyChange(key) {
    setBody(key);
    setCertCode(CERT_LIBRARY[key].certs[0].code);
    setMemberId("");
  }

  async function handleUpload() {
    fileRef.current?.click();
  }

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast("File too large · 5MB max", "!");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/${stage.num}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setDocName(file.name);
      setDocUrl(res.data.docUrl);
      toast(`✓ ${file.name}`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Upload failed.", "!");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (certType === "certified") {
      if (!memberId || memberId.trim().length !== 8) {
        setError("Please enter a valid 8-character Member / Certification ID.");
        toast("Member / Certification ID must be exactly 8 characters.", "!");
        return;
      }
      if (!issueMonth || !issueYear || !issueDate) {
        setError("Please select both the Issue Month and Year.");
        toast("Issue Month and Year are required.", "!");
        return;
      }
      if (!docName) {
        setError("Please verify online or upload your certificate document — this is what confirms it's genuine.");
        toast("Certificate document is required.", "!");
        return;
      }

      setSaving(true);
      try {
        const res = await api.put(`/candidate/stage/${stage.num}`, {
          isCertified: true,
          certType: "certified",
          body,
          certCode,
          certName: selectedCert.name,
          issuingBody: bodyData.name,
          memberId: memberId.trim(),
          issueDate: issueDate.trim(),
          docName,
          docUrl,
        });
        onSaved(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not save this stage.");
      } finally {
        setSaving(false);
      }
    } else {
      // Non-Certified Candidate submission
      setSaving(true);
      try {
        const res = await api.put(`/candidate/stage/${stage.num}`, {
          isCertified: false,
          nonCertified: true,
          certType: "non-certified",
          body: "none",
          certCode: "NON-CERT",
          certName: "Non-Certified / Trainee Coder",
          issuingBody: "None",
          memberId: "",
          issueDate: "",
          docName: "",
          docUrl: "",
        });
        toast("Saved as Non-Certified Candidate.", "✓");
        onSaved(res.data);
      } catch (err) {
        setError(err.response?.data?.message || "Could not save this stage.");
      } finally {
        setSaving(false);
      }
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/candidate/stage/${stage.num}/skip`);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not skip this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      {/* 1. PRIMARY SELECTION: CERTIFIED VS NON-CERTIFIED */}
      <div className="wiz-field" style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 8, display: "block" }}>
          Certification Status <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <button
            type="button"
            className={`wiz-pill ${certType === "certified" ? "active" : ""}`}
            onClick={() => setCertType("certified")}
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: 13.5,
              fontWeight: 800,
              borderRadius: 10,
              border: certType === "certified" ? "2px solid var(--navy)" : "1.5px solid #CBD5E1",
              background: certType === "certified" ? "var(--navy)" : "#FFFFFF",
              color: certType === "certified" ? "#FFFFFF" : "#334155",
              boxShadow: certType === "certified" ? "0 4px 12px rgba(10, 31, 61, 0.15)" : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fa-solid fa-award" style={{ color: certType === "certified" ? "var(--gold)" : "#64748B", fontSize: 16 }}></i>
            <span>Certified (AAPC / AHIMA)</span>
          </button>

          <button
            type="button"
            className={`wiz-pill ${certType === "non-certified" ? "active" : ""}`}
            onClick={() => setCertType("non-certified")}
            style={{
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              fontSize: 13.5,
              fontWeight: 800,
              borderRadius: 10,
              border: certType === "non-certified" ? "2px solid var(--navy)" : "1.5px solid #CBD5E1",
              background: certType === "non-certified" ? "var(--navy)" : "#FFFFFF",
              color: certType === "non-certified" ? "#FFFFFF" : "#334155",
              boxShadow: certType === "non-certified" ? "0 4px 12px rgba(10, 31, 61, 0.15)" : "none",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fa-solid fa-user-graduate" style={{ color: certType === "non-certified" ? "var(--gold)" : "#64748B", fontSize: 16 }}></i>
            <span>Non-Certified Candidate</span>
          </button>
        </div>
      </div>

      {/* NON-CERTIFIED CANDIDATE VIEW */}
      {certType === "non-certified" && (
        <div style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", borderRadius: 12, padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "#EFF6FF",
                color: "#2563EB",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                flexShrink: 0,
              }}
            >
              <i className="fa-solid fa-graduation-cap"></i>
            </div>
            <div>
              <h4 style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>
                Applying as a Non-Certified Candidate
              </h4>
              <p style={{ margin: "0 0 14px", fontSize: 13, color: "#475569", lineHeight: 1.5 }}>
                You are registering without an AAPC / AHIMA credential. This option is tailored for <strong>Freshers, Life Science graduates, and Academy-trained coders</strong> looking for entry-level Medical Coding, Billing, and AR roles.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10, marginBottom: 14 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#16A34A", fontSize: 14 }}></i>
                  <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>No Certificate or Member ID required</span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#16A34A", fontSize: 14 }}></i>
                  <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>Full access to Skill Tests &amp; AI Interviews</span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#16A34A", fontSize: 14 }}></i>
                  <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>Eligible for Non-Certified Coding Jobs</span>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px", display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-circle-check" style={{ color: "#16A34A", fontSize: 14 }}></i>
                  <span style={{ fontSize: 12, color: "#1E293B", fontWeight: 600 }}>Add certifications anytime later</span>
                </div>
              </div>

              <div style={{ background: "#FEF3C7", border: "1px solid #FCD34D", borderRadius: 8, padding: "8px 12px", fontSize: 11.5, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-lightbulb" style={{ color: "#D97706" }}></i>
                <span>You can click "Save &amp; continue →" below to advance directly to the Stage 4 Skills Assessment!</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CERTIFIED CANDIDATE VIEW */}
      {certType === "certified" && (
        <>
          <div className="wiz-field">
            <label>
              Step 1 — Issuing body <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <div className="wiz-pill-row">
              {Object.values(CERT_LIBRARY).map((b) => (
                <button key={b.key} type="button" className={`wiz-pill wiz-pill-compact ${body === b.key ? "active" : ""}`} onClick={() => handleBodyChange(b.key)}>
                  {b.name} <span className="wiz-pill-count">{b.certs.length}</span>
                </button>
              ))}
            </div>
          </div>

      <div className="wiz-field">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
          <label style={{ margin: 0 }}>
            Step 2 — Pick your certification <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <Link
            to={`/cert-library?body=${body}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontSize: 12, fontWeight: 700, color: "#2563EB", textDecoration: "none" }}
          >
            Browse Cert Library (49 certs) ↗
          </Link>
        </div>
        <select value={certCode} onChange={(e) => setCertCode(e.target.value)} required>
          {bodyData.certs.map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag ? "⭐ " : ""}{c.code} — {c.name}
            </option>
          ))}
        </select>
      </div>

      <div className="wiz-cert-detail" style={{ "--cert-accent": bodyData.color }}>
        <div className="wiz-cert-detail-head">
          <span className="wiz-cert-code">{selectedCert.code}</span>
          {selectedCert.flag && <span className="wiz-cert-flag">{selectedCert.flagText}</span>}
        </div>
        <div className="wiz-cert-name">{selectedCert.name}</div>
        <div className="wiz-cert-target">{selectedCert.target} · {bodyData.fullName}</div>
        <div className="wiz-cert-stats">
          <div><strong>{selectedCert.time}</strong><span>Exam time</span></div>
          <div><strong>{selectedCert.qs} Qs</strong><span>Questions</span></div>
          <div><strong>${selectedCert.usd}</strong><span>{selectedCert.inr}</span></div>
        </div>
        <p>{selectedCert.desc}</p>
        <div className="wiz-cert-meta">
          <div><strong>Prerequisites:</strong> {selectedCert.prereq}</div>
          <div><strong>Best for:</strong> {selectedCert.bestFor}</div>
        </div>
      </div>

      <div className="wiz-field">
        <label>
          Step 3 — Member / certification ID (8 characters) <span style={{ color: "#EF4444" }}>*</span>
        </label>
        <div style={{ position: "relative" }}>
          <input
            type="text"
            required
            maxLength={8}
            value={memberId}
            onChange={(e) => {
              // Limit strictly to 8 alphanumeric characters
              const val = e.target.value.replace(/[^A-Za-z0-9]/g, "").slice(0, 8);
              setMemberId(val);
            }}
            placeholder="e.g. 01234567"
            style={{
              fontWeight: 700,
              letterSpacing: "0.08em",
              borderColor: memberId.length === 8 ? "#22C55E" : memberId.length > 0 ? "#EAB308" : "#CBD5E1",
            }}
          />
          <span
            style={{
              position: "absolute",
              right: 12,
              top: "50%",
              transform: "translateY(-50%)",
              fontSize: 11,
              fontWeight: 700,
              color: memberId.length === 8 ? "#16A34A" : "#64748B",
            }}
          >
            {memberId.length}/8
          </span>
        </div>
        <span className={`wiz-inline-status wiz-inline-status-${idState}`}>
          {idState === "idle" && "Enter 8-digit/char ID"}
          {idState === "valid" && memberId.length === 8 && "✓ Format & length match"}
          {idState !== "valid" && memberId.length === 8 && "Check pattern"}
          {memberId.length > 0 && memberId.length < 8 && `Requires 8 characters (${8 - memberId.length} more)`}
        </span>
      </div>

      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, margin: "8px 0 16px 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13.5, color: "#1E293B", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🔍 Double-check it yourself</span>
            </div>
            <p style={{ fontSize: 12, color: "#64748B", margin: "2px 0 0 0" }}>
              {bodyData.verifyUrl
                ? `You can look your own Member ID up on the official ${bodyData.name} registry before submitting. Talentera staff verify it there too as part of reviewing your uploaded certificate.`
                : `Talentera staff verify your Member ID and uploaded certificate manually before it's marked confirmed.`}
            </p>
          </div>

          {bodyData.verifyUrl && (
            <a
              href={bodyData.verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-outline"
              style={{ fontSize: 13, padding: "8px 16px" }}
            >
              Open {bodyData.name} verification site ↗
            </a>
          )}
        </div>
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field" style={{ flex: 1 }}>
          <label>
            Issue date (Month &amp; Year) <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr", gap: 8 }}>
            <select
              required
              value={issueMonth}
              onChange={(e) => handleMonthYearChange(e.target.value, issueYear)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 600 }}
            >
              <option value="">Month</option>
              {[
                "Jan", "Feb", "Mar", "Apr", "May", "Jun",
                "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
              ].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            <select
              required
              value={issueYear}
              onChange={(e) => handleMonthYearChange(issueMonth, e.target.value)}
              style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 600 }}
            >
              <option value="">Year</option>
              {Array.from({ length: currentYear() - 2005 + 1 }, (_, i) => currentYear() - i).map((y) => (
                <option key={y} value={String(y)}>{y}</option>
              ))}
            </select>
          </div>
          {issueDate && (
            <span style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 4, display: "block" }}>
              ✓ Selected: {issueDate}
            </span>
          )}
        </div>

        <div className="wiz-field" style={{ minWidth: 280, flex: 1 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span>Certificate Document (PDF / Image) <span style={{ color: "#EF4444" }}>*</span></span>
            {docName && (
              <span style={{ fontSize: 10, fontWeight: 800, color: "#166534", background: "#DCFCE7", padding: "2px 8px", borderRadius: 999, textTransform: "uppercase" }}>
                ✓ Attached
              </span>
            )}
          </label>

          {docName ? (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                  <span style={{ fontSize: 20, color: "#15803D" }}>📄</span>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: "#15803D", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {docName}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#166534" }}>Certificate proof document attached</div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                  {docUrl && (
                    <a
                      href={docUrl.startsWith("http") ? docUrl : `${(import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "")}${docUrl}`}
                      target="_blank"
                      rel="noreferrer"
                      className="btn btn-ghost"
                      style={{ fontSize: 11.5, padding: "5px 10px", background: "#FFFFFF", border: "1px solid #CBD5E1", color: "#0F172A", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      👁 View / Download PDF
                    </a>
                  )}
                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={handleUpload}
                    disabled={uploading}
                    style={{ fontSize: 11.5, padding: "5px 10px", background: "#FFFFFF" }}
                    title="Upload a different certificate document"
                  >
                    🔄 {uploading ? "Uploading…" : "Change / Replace File"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    onClick={() => {
                      setDocName("");
                      setDocUrl("");
                      if (fileRef.current) fileRef.current.value = "";
                      toast("Document cleared. Select a new certificate document to attach.", "!");
                    }}
                    style={{ fontSize: 11.5, padding: "5px 10px", color: "#DC2626", border: "1px solid #FCA5A5", background: "#FEF2F2" }}
                    title="Remove this certificate document"
                  >
                    ✕ Clear File
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button
                type="button"
                className="btn btn-outline"
                onClick={handleUpload}
                disabled={uploading}
                style={{ width: "100%", justifyContent: "center", padding: "10px 16px", fontSize: 12.5, background: "#FFFFFF" }}
              >
                {uploading ? "Uploading Certificate Document…" : "📁 Choose Certificate Document (PDF / Image)"}
              </button>
            </div>
          )}
          <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png" style={{ display: "none" }} onChange={handleFileSelected} />
        </div>
      </div>

      <div className="cert-validation-panel">
        <div className="cert-validation-row">
          <span className={`cert-validation-icon ${idState === "valid" ? "pass" : idState === "invalid" ? "fail" : ""}`}>
            {idState === "valid" ? "✓" : idState === "invalid" ? "✕" : "·"}
          </span>
          Format matches {selectedCert.code} pattern <span className="cert-validation-tag">AUTO</span>
        </div>
        <div className="cert-validation-row">
          <span className={`cert-validation-icon ${dateState === "valid" ? "pass" : dateState === "invalid" ? "fail" : ""}`}>
            {dateState === "valid" ? "✓" : dateState === "invalid" ? "✕" : "·"}
          </span>
          Issue date is plausible (2010 — {currentYear()}) <span className="cert-validation-tag">AUTO</span>
        </div>
        <div className="cert-validation-row">
          <span className={`cert-validation-icon ${docName ? "pass" : ""}`}>{docName ? "✓" : "·"}</span>
          Certificate document uploaded <span className="cert-validation-tag">{docName ? "UPLOADED" : "REQUIRED"}</span>
        </div>
        <div className="cert-validation-row">
          <span className="cert-validation-icon">·</span>
          Reviewed by Talentera staff before it counts as verified <span className="cert-validation-tag" style={{ background: "#E2E8F0", color: "#475569" }}>MANUAL REVIEW</span>
        </div>
      </div>
    </>
  )}

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving}>
          {saving ? "Saving…" : certType === "non-certified" ? "Continue as Non-Certified →" : "Save & continue →"}
        </button>
        {stage.skippable && (
          <button type="button" className="btn btn-ghost" onClick={handleSkip} disabled={saving}>Skip this stage</button>
        )}
      </div>
    </form>
  );
}
