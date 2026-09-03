import React, { useMemo, useRef, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { CERT_LIBRARY, CERT_ID_PATTERNS } from "../../data/certLibrary";

function currentYear() {
  return new Date().getFullYear();
}

export default function Stage3Certification({ stage, existingData, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);

  const [body, setBody] = useState(existingData?.body || "aapc");
  const [certCode, setCertCode] = useState(existingData?.certCode || CERT_LIBRARY.aapc.certs[0].code);
  const [memberId, setMemberId] = useState(existingData?.memberId || "");
  const [issueDate, setIssueDate] = useState(existingData?.issueDate || "");
  const [docName, setDocName] = useState(existingData?.docName || "");
  const [docUrl, setDocUrl] = useState(existingData?.docUrl || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const bodyData = CERT_LIBRARY[body];
  const selectedCert = useMemo(() => bodyData.certs.find((c) => c.code === certCode) || bodyData.certs[0], [bodyData, certCode]);
  const pattern = CERT_ID_PATTERNS[body];

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
    if (!memberId || memberId.trim().length < 2) {
      setError("Please enter your Member / Certification ID.");
      toast("Member / Certification ID is required.", "!");
      return;
    }
    if (!issueDate || issueDate.trim().length < 2) {
      setError("Please enter the Issue Date.");
      toast("Issue Date is required.", "!");
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
      <div className="wiz-field">
        <label>Step 1 — Issuing body</label>
        <div className="wiz-pill-row">
          {Object.values(CERT_LIBRARY).map((b) => (
            <button key={b.key} type="button" className={`wiz-pill wiz-pill-compact ${body === b.key ? "active" : ""}`} onClick={() => handleBodyChange(b.key)}>
              {b.name} <span className="wiz-pill-count">{b.certs.length}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="wiz-field">
        <label>Step 2 — Pick your certification</label>
        <select value={certCode} onChange={(e) => setCertCode(e.target.value)}>
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
        <label>Step 3 — Member / certification ID</label>
        <input
          type="text"
          value={memberId}
          onChange={(e) => {
            setMemberId(e.target.value);
          }}
          placeholder={pattern.placeholder}
        />
        <span className={`wiz-inline-status wiz-inline-status-${idState}`}>
          {idState === "idle" && "Enter ID"}
          {idState === "valid" && "Format matches"}
          {idState === "invalid" && `Expected: ${pattern.description}`}
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
        <div className="wiz-field">
          <label>Issue date (month / year)</label>
          <input type="text" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="e.g., Mar 2024" />
        </div>
        <div className="wiz-field" style={{ minWidth: 280, flex: 1 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
            <span>Certificate Document (PDF / Image) <span style={{ color: "#E5A82E" }}>*</span></span>
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

      <p style={{ fontSize: 12.5, color: "#64748B", marginTop: -4, marginBottom: 4 }}>
        Upload your real certificate document above — a Talentera staff member reviews it (and checks your Member ID
        against the official {bodyData.name} registry) within 1–2 business days before it's marked verified.
      </p>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save & continue →"}</button>
        {stage.skippable && (
          <button type="button" className="btn btn-ghost" onClick={handleSkip} disabled={saving}>Skip this stage</button>
        )}
      </div>
    </form>
  );
}
