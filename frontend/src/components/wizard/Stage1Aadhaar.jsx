import React, { useEffect, useRef, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { verhoeffValidate, formatAadhaar, formatMobile, isValidIndianMobile } from "../../utils/verhoeff";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "West Bengal (UT excluded)",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
].filter((v, i, arr) => arr.indexOf(v) === i && v !== "West Bengal (UT excluded)");

const FRAUD_SIGNALS = [
  { label: "Verhoeff checksum — format validity", tag: "LIVE", done: true },
  { label: "10-digit Indian mobile format check", tag: "LIVE", done: true },
  { label: "Aadhaar name vs. resume name fuzzy match", tag: "ROADMAP", done: false },
  { label: "Aadhaar state vs. claimed work location", tag: "ROADMAP", done: false },
  { label: "Browser fingerprint · dup-profile", tag: "ROADMAP", done: false },
  { label: "IP geolocation · VPN flag", tag: "ROADMAP", done: false },
  { label: "Time-on-form · bot detection", tag: "ROADMAP", done: false },
  { label: "DigiLocker UIDAI verification · auto-pull address", tag: "NEXT", done: false },
];

function formatFileSize(bytes) {
  if (bytes > 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  return `${Math.round(bytes / 1024)}KB`;
}

export default function Stage1Aadhaar({ stage, existingData, onSaved }) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [fullName, setFullName] = useState(existingData?.fullName || "");
  const [experience, setExperience] = useState(existingData?.experience || "");
  const [mobile, setMobile] = useState(existingData?.mobile ? formatMobile(existingData.mobile) : "");
  const [email, setEmail] = useState(existingData?.email || "");

  const [aadhaarInput, setAadhaarInput] = useState(existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : "");
  const [aadhaarState, setAadhaarState] = useState(() => {
    const digits = (existingData?.aadhaarNumber || "").replace(/\D/g, "");
    if (!digits) return "idle";
    return verhoeffValidate(digits) ? "valid" : digits.length === 12 ? "invalid" : "typing";
  });

  const [otpEmail, setOtpEmail] = useState(existingData?.email || "");
  const [otpCode, setOtpCode] = useState("");
  const [otpStatus, setOtpStatus] = useState(existingData?.aadhaarVerifiedVia === "otp" ? "verified" : "idle"); // idle | sent | verified | failed | expired
  const [otpSection, setOtpSection] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [otpShake, setOtpShake] = useState(false);
  const cooldownTimerRef = useRef(null);

  const [docStatus, setDocStatus] = useState(existingData?.docUrl ? "uploaded" : "idle");
  const [docShortName, setDocShortName] = useState(existingData?.docName || "");
  const [docSizeLabel, setDocSizeLabel] = useState("");
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const [state, setState] = useState(existingData?.state || "Tamil Nadu");
  const [city, setCity] = useState(existingData?.city || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    return () => clearInterval(cooldownTimerRef.current);
  }, []);

  function handleAadhaarInput(raw) {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    setAadhaarInput(formatAadhaar(digits));
    if (digits.length === 0) setAadhaarState("idle");
    else if (digits.length < 12) setAadhaarState("typing");
    else setAadhaarState(verhoeffValidate(digits) ? "valid" : "invalid");
  }

  function startResendCountdown(seconds) {
    setResendCooldown(seconds);
    clearInterval(cooldownTimerRef.current);
    cooldownTimerRef.current = setInterval(() => {
      setResendCooldown((s) => {
        if (s <= 1) {
          clearInterval(cooldownTimerRef.current);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
  }

  async function handleSendOtp() {
    const targetEmail = (otpEmail || email).trim();
    if (!targetEmail || !targetEmail.includes("@")) {
      toast("Enter a valid email address for OTP", "!");
      return;
    }
    setOtpSection(true);
    try {
      const res = await api.post("/otp/send", { identifier: targetEmail });
      setOtpStatus("sent");
      setOtpCode("");
      startResendCountdown(30);
      if (res.data?.fallback && res.data?.otpCode) {
        toast(`DEV OTP Code: ${res.data.otpCode}`, "✓");
      } else {
        toast(`OTP sent to email ${targetEmail} via Brevo`, "✓");
      }
    } catch (err) {
      toast(err.response?.data?.message || "Failed to send Email OTP", "!");
    }
  }

  async function handleVerifyOtp() {
    if (otpCode.length !== 6) return;
    const targetEmail = (otpEmail || email).trim();
    try {
      const res = await api.post("/otp/verify", { identifier: targetEmail, otp: otpCode });
      if (res.data?.success) {
        setOtpStatus("verified");
        clearInterval(cooldownTimerRef.current);
        toast("Email OTP verified ✓", "✓");
      } else {
        setOtpStatus("failed");
        setOtpShake(true);
        setTimeout(() => setOtpShake(false), 600);
        toast(res.data?.message || "Wrong OTP", "!");
      }
    } catch (err) {
      setOtpStatus("failed");
      setOtpShake(true);
      setTimeout(() => setOtpShake(false), 600);
      toast(err.response?.data?.message || "Wrong OTP code", "!");
    }
  }

  function handlePickDoc() {
    fileInputRef.current?.click();
  }

  async function handleDocSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("File too large · 10MB max", "!");
      return;
    }
    setUploadingDoc(true);
    try {
      const form = new FormData();
      form.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/${stage.num}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const shortName = file.name.length > 21 ? file.name.slice(0, 21) + "…" : file.name;
      setDocStatus("uploaded");
      setDocShortName(shortName);
      setDocSizeLabel(formatFileSize(file.size));
      toast("Aadhaar document uploaded", "✓");
      void res;
    } catch (err) {
      toast(err.response?.data?.message || "Upload failed. Please try again.", "!");
    } finally {
      setUploadingDoc(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        fullName,
        experience,
        mobile: mobile.replace(/\D/g, ""),
        email,
        aadhaarNumber: aadhaarInput.replace(/\D/g, ""),
        aadhaarFormatValid: aadhaarState === "valid",
        aadhaarVerified: otpStatus === "verified" || docStatus === "uploaded",
        aadhaarVerifiedVia: otpStatus === "verified" ? "otp" : docStatus === "uploaded" ? "document" : null,
        state,
        city,
      };
      const res = await api.put(`/candidate/stage/${stage.num}`, payload);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  const aadhaarPillCopy = {
    idle: "Enter 12 digits",
    typing: `${aadhaarInput.replace(/\D/g, "").length}/12 digits`,
    valid: "Format valid · math checksum passed",
    invalid: "Invalid Aadhaar — check digits",
  }[aadhaarState];

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      <div className="wiz-field">
        <label>Full name (as on Aadhaar)</label>
        <input type="text" placeholder="e.g., Priya Sharma" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
      </div>

      <div className="wiz-field">
        <label>Experience level</label>
        <div className="wiz-pill-row">
          <button
            type="button"
            className={`wiz-pill ${experience === "fresher" ? "active" : ""}`}
            onClick={() => setExperience("fresher")}
          >
            <div className="wiz-pill-title">🎓 Fresher</div>
            <div className="wiz-pill-sub">Just graduated · No prior role</div>
          </button>
          <button
            type="button"
            className={`wiz-pill ${experience === "experienced" ? "active" : ""}`}
            onClick={() => setExperience("experienced")}
          >
            <div className="wiz-pill-title">💼 Experienced</div>
            <div className="wiz-pill-sub">Prior RCM / healthcare role</div>
          </button>
        </div>
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label>Mobile (10 digits)</label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(formatMobile(e.target.value))}
            placeholder="98765 43210"
            required
          />
        </div>
        <div className="wiz-field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
        </div>
      </div>

      <div className="wiz-field">
        <label>Aadhaar number (12 digits) · real-time validation</label>
        <div className="adh-input-row">
          <input
            className={`adh-input ${aadhaarState === "valid" ? "adh-input-valid" : ""} ${aadhaarState === "invalid" ? "adh-input-invalid" : ""}`}
            type="text"
            inputMode="numeric"
            maxLength={14}
            placeholder="XXXX XXXX XXXX"
            value={aadhaarInput}
            onChange={(e) => handleAadhaarInput(e.target.value)}
          />
          <span className={`adh-status-pill adh-status-${aadhaarState}`}>
            {aadhaarState === "valid" ? "✓" : aadhaarState === "invalid" ? "✕" : ""} {aadhaarPillCopy}
          </span>
        </div>
        <p className="wiz-hint">
          Format validated mathematically via Verhoeff checksum (UIDAI algorithm). This confirms the number is
          well-formed — but only your actual Aadhaar document proves real ownership. Upload it below.
        </p>
      </div>

      <div className="aadhaar-verify-section">
        <div className="aadhaar-verify-head">
          <div className="aadhaar-verify-title">🛡 Verify your Profile (choose either method)</div>
          <div className="aadhaar-verify-sub">Brevo Email OTP — fastest · or upload e-Aadhaar document</div>
        </div>

        <div className="aadhaar-methods">
          <div className="aadhaar-method aadhaar-method-otp">
            <span className="aadhaar-method-badge">RECOMMENDED</span>
            <div className="aadhaar-method-title">Brevo Email OTP verification</div>
            <div className="aadhaar-method-sub">Official email OTP · 30 seconds</div>

            <label className="wiz-mini-label">Email address for OTP verification</label>
            <div className="aadhaar-otp-phone-row">
              <span className="aadhaar-otp-prefix">📧</span>
              <input
                type="email"
                value={otpEmail || email}
                onChange={(e) => setOtpEmail(e.target.value)}
                placeholder="name@example.com"
                disabled={otpStatus === "verified"}
              />
              <button
                type="button"
                className="btn btn-gold"
                disabled={otpStatus === "verified" || resendCooldown > 0}
                onClick={handleSendOtp}
              >
                {otpStatus === "verified" ? "✓ Verified" : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : otpSection ? "Resend OTP" : "Send OTP"}
              </button>
            </div>

            {otpSection && (
              <div className="aadhaar-otp-code-section">
                <label className="wiz-mini-label">Enter the 6-digit OTP sent to your email</label>
                <div className="aadhaar-otp-code-row">
                  <input
                    className={otpShake ? "aadhaar-otp-code-wrong" : ""}
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="••••••"
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    disabled={otpStatus === "verified"}
                  />
                  <button
                    type="button"
                    className="btn btn-outline"
                    disabled={otpStatus === "verified" || otpCode.length !== 6}
                    onClick={handleVerifyOtp}
                  >
                    {otpStatus === "verified" ? "✓ Verified" : "Verify"}
                  </button>
                </div>
              </div>
            )}

            <div className={`aadhaar-method-status aadhaar-method-status-${otpStatus === "idle" ? "idle" : otpStatus === "verified" ? "valid" : otpStatus === "failed" || otpStatus === "expired" ? "invalid" : "typing"}`}>
              {otpStatus === "idle" && "Not yet verified"}
              {otpStatus === "sent" && `OTP sent to ${otpEmail || email} · valid for 10 min`}
              {otpStatus === "verified" && <strong>{otpEmail || email} verified</strong>}
              {otpStatus === "failed" && "Wrong OTP · try again"}
              {otpStatus === "expired" && "OTP expired · click Resend"}
            </div>
          </div>

          <div className="aadhaar-method aadhaar-method-doc">
            <div className="aadhaar-method-title">Upload e-Aadhaar document</div>
            <div className="aadhaar-method-sub">From UIDAI · PDF or photo · works on mobile</div>
            <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noreferrer" className="wiz-link-step">
              Step 1: Open UIDAI · download e-Aadhaar PDF ↗
            </a>
            <button type="button" className="btn btn-outline" style={{ marginTop: 10 }} onClick={handlePickDoc} disabled={uploadingDoc}>
              {uploadingDoc ? "Uploading…" : "Step 2: Upload document"}
            </button>
            <input ref={fileInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleDocSelected} />
            <div className={`aadhaar-method-status aadhaar-method-status-${docStatus === "uploaded" ? "valid" : "idle"}`}>
              {docStatus === "uploaded" ? (
                <span>
                  <strong>{docShortName}</strong>{docSizeLabel ? ` (${docSizeLabel})` : ""} uploaded
                </span>
              ) : (
                "No document uploaded yet"
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label>State (as on Aadhaar)</label>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="wiz-field">
          <label>City · locality</label>
          <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g., Coimbatore, RS Puram" />
        </div>
      </div>

      <div className="adh-fraud-panel">
        <div className="adh-fraud-panel-head">Talentera anti-fraud architecture · live + roadmap</div>
        <div className="adh-fraud-grid">
          {FRAUD_SIGNALS.map((f) => (
            <div className="adh-fraud-row" key={f.label}>
              <span className={`adh-fraud-dot ${f.done ? "done" : ""}`}>{f.done ? "✓" : "○"}</span>
              <span className="adh-fraud-label">{f.label}</span>
              <span className={`adh-fraud-tag adh-fraud-tag-${f.tag.toLowerCase()}`}>{f.tag}</span>
            </div>
          ))}
        </div>
        <div className="adh-fraud-footer">
          <strong>Shipping today:</strong> Verhoeff format validation catches typos, random 12-digit guesses,
          and obviously fake Aadhaar numbers. <strong>Coming next:</strong> DigiLocker integration enables
          real-time UIDAI verification with auto-pulled address.
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving}>
          {saving ? "Saving…" : "Save & continue →"}
        </button>
      </div>
    </form>
  );
}
