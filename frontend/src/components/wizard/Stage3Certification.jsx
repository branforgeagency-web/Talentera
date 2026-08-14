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
      await api.post(`/candidate/upload/doc/${stage.num}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setDocName(file.name);
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
    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        body, certCode, certName: selectedCert.name, issuingBody: bodyData.name, memberId, issueDate, docName,
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
          onChange={(e) => setMemberId(e.target.value)}
          placeholder={pattern.placeholder}
        />
        <span className={`wiz-inline-status wiz-inline-status-${idState}`}>
          {idState === "idle" && "Enter ID"}
          {idState === "valid" && "Format matches"}
          {idState === "invalid" && `Expected: ${pattern.description}`}
        </span>
        {bodyData.verifyUrl && (
          <a href={bodyData.verifyUrl} target="_blank" rel="noreferrer" className="wiz-link-step">
            Verify yourself on {bodyData.name} ↗
          </a>
        )}
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label>Issue date (month / year)</label>
          <input type="text" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} placeholder="e.g., Mar 2024" />
        </div>
        <div className="wiz-field">
          <label>Upload certificate (PDF / image)</label>
          <button type="button" className="btn btn-outline" onClick={handleUpload} disabled={uploading}>
            {uploading ? "Uploading…" : docName ? `✓ ${docName}` : "Choose file"}
          </button>
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
          Certificate uploaded as evidence <span className="cert-validation-tag">OPTIONAL</span>
        </div>
      </div>

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
