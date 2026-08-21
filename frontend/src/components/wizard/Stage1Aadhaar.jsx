import React, { useRef, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { verhoeffValidate, formatAadhaar, formatMobile, isValidIndianMobile } from "../../utils/verhoeff";
import AadhaarOtpVerificationCard from "../AadhaarOtpVerificationCard.jsx";

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal",
  "Andaman and Nicobar Islands", "Chandigarh", "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi (NCT)", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

export default function Stage1Aadhaar({ stage, existingData, onSaved }) {
  const toast = useToast();
  const aadhaarFileInputRef = useRef(null);

  const [fullName, setFullName] = useState(existingData?.fullName || "");
  const [experience, setExperience] = useState(existingData?.experience || "fresher");
  const [currentRole, setCurrentRole] = useState(existingData?.currentRole || "Medical Coder");
  const [mobile, setMobile] = useState(existingData?.mobile ? formatMobile(existingData.mobile) : "");
  const [email, setEmail] = useState(existingData?.email || "");

  const [aadhaarInput, setAadhaarInput] = useState(existingData?.maskedAadhaar || (existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : ""));
  const [aadhaarState, setAadhaarState] = useState(existingData?.aadhaarVerified ? "valid" : "idle");

  // Aadhaar Document Photo / PDF Upload States
  const [aadhaarDocName, setAadhaarDocName] = useState(existingData?.docName || existingData?.aadhaarDocName || "");
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState(existingData?.docUrl || existingData?.aadhaarDocUrl || "");
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  const [state, setState] = useState(existingData?.state || "Tamil Nadu");
  const [city, setCity] = useState(existingData?.city || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isMobileValid = isValidIndianMobile(cleanMobileDigits);

  // --- Aadhaar Document (Photo / PDF) Upload Handler ---
  async function handleAadhaarFileUpload(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast("File size too large. 10MB max allowed.", "!");
      return;
    }

    setAadhaarUploading(true);
    setError("");

    try {
      const form = new FormData();
      form.append("doc", file);

      const res = await api.post(`/candidate/upload/doc/1`, form, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.docUrl) {
        setAadhaarDocName(res.data.docName || file.name);
        setAadhaarDocUrl(res.data.docUrl);
        toast(`✓ Aadhaar card document uploaded: ${file.name}`, "✓");
      }
    } catch (err) {
      console.error("Aadhaar document upload error:", err);
      const msg = err.response?.data?.message || "Aadhaar file upload failed.";
      setError(msg);
      toast(msg, "!");
    } finally {
      setAadhaarUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!fullName || fullName.trim().length < 2) {
      setError("Please enter your full legal name as on Aadhaar card.");
      toast("Full legal name is required.", "!");
      setSaving(false);
      return;
    }

    if (!isMobileValid) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      toast("Invalid mobile number. Must be 10 digits starting with 6, 7, 8, or 9.", "!");
      setSaving(false);
      return;
    }

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address.");
      toast("Valid email address is required.", "!");
      setSaving(false);
      return;
    }

    if (!aadhaarDocName && !aadhaarDocUrl) {
      setError("Please upload your Aadhaar Card (Photo image or PDF document) before submitting.");
      toast("Aadhaar Card Photo / PDF upload is required.", "!");
      setSaving(false);
      return;
    }

    if (!city || city.trim().length < 2) {
      setError("Please enter your City / Locality as on Aadhaar.");
      toast("City / Locality is required.", "!");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        fullName: fullName.trim(),
        experience,
        currentRole,
        mobile: cleanMobileDigits,
        email: email.trim(),
        aadhaarNumber: aadhaarInput,
        maskedAadhaar: aadhaarInput,
        aadhaarDocName,
        aadhaarDocUrl,
        docName: aadhaarDocName,
        docUrl: aadhaarDocUrl,
        state,
        city: city || "Bengaluru",
        aadhaarVerified: aadhaarState === "valid",
      };

      const res = await api.put("/candidate/stage/1", payload);
      toast("Stage 1 saved successfully!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      console.error("Save Stage 1 error:", err);
      const msg = err.response?.data?.message || err.message || "Could not save Stage 1.";
      setError(msg);
      toast(msg, "!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="wiz-form">
      {/* FULL LEGAL NAME */}
      <div className="wiz-field">
        <label>Full legal name (as on Aadhaar card) *</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Ananya Sharma"
          required
        />
      </div>

      {/* EXPERIENCE LEVEL */}
      <div className="wiz-field">
        <label>Experience level</label>
        <div className="wiz-pill-row">
          <button
            type="button"
            className={`wiz-pill ${experience === "fresher" ? "active" : ""}`}
            onClick={() => setExperience("fresher")}
          >
            <div className="wiz-pill-title"><i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }}></i> Fresher</div>
            <div className="wiz-pill-sub">Just graduated · No prior role</div>
          </button>
          <button
            type="button"
            className={`wiz-pill ${experience === "experienced" ? "active" : ""}`}
            onClick={() => setExperience("experienced")}
          >
            <div className="wiz-pill-title"><i className="fa-solid fa-briefcase" style={{ marginRight: 6 }}></i> Experienced</div>
            <div className="wiz-pill-sub">Prior RCM / healthcare role</div>
          </button>
        </div>
      </div>

      {/* MOBILE & EMAIL */}
      <div className="wiz-field-row">
        <div className="wiz-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mobile (10 digits) *</span>
            {cleanMobileDigits.length > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, color: isMobileValid ? "#15803D" : "#DC2626" }}>
                {isMobileValid ? "✓ Valid 10 Digits" : `✕ ${cleanMobileDigits.length}/10 digits`}
              </span>
            )}
          </label>
          <input
            type="tel"
            value={mobile}
            onChange={(e) => setMobile(formatMobile(e.target.value))}
            placeholder="98765 43210"
            maxLength={11}
            required
          />
        </div>
        <div className="wiz-field">
          <label>Email address *</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
        </div>
      </div>

      {/* ====== STEP 1: AADHAAR CARD PHOTO / PDF DOCUMENT UPLOAD CARD ====== */}
      <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <label style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-file-arrow-up" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            Upload Aadhaar Card (Photo Image or PDF Document) *
          </label>

          {aadhaarDocName && (
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              ✓ DOCUMENT UPLOADED
            </span>
          )}
        </div>

        <p style={{ fontSize: 12, color: "#64748B", marginBottom: 14, lineHeight: 1.5 }}>
          Upload a clear photo copy (Front/Back `.jpg`, `.png`) or PDF document (`.pdf`) of your Aadhaar Card before proceeding to OTP verification.
        </p>

        {aadhaarDocName ? (
          <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 10, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-file-pdf" style={{ fontSize: 24, color: "#15803D" }}></i>
              <div>
                <strong style={{ fontSize: 13, color: "#15803D" }}>{aadhaarDocName}</strong>
                <div style={{ fontSize: 11, color: "#166534" }}>Aadhaar document uploaded &amp; attached to profile</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-outline"
              style={{ fontSize: 11, padding: "6px 12px" }}
              onClick={() => aadhaarFileInputRef.current?.click()}
            >
              Re-upload File ↻
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn btn-outline"
            style={{ width: "100%", justifyContent: "center", padding: "14px 20px", fontSize: 13, background: "#ffffff" }}
            onClick={() => aadhaarFileInputRef.current?.click()}
            disabled={aadhaarUploading}
          >
            {aadhaarUploading ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Uploading Aadhaar Document…
              </>
            ) : (
              <>
                <i className="fa-solid fa-cloud-arrow-up" style={{ marginRight: 8, color: "var(--navy)" }}></i>
                Select &amp; Upload Aadhaar Card (Image or PDF)
              </>
            )}
          </button>
        )}

        <input
          ref={aadhaarFileInputRef}
          type="file"
          accept="image/*,.pdf"
          style={{ display: "none" }}
          onChange={handleAadhaarFileUpload}
        />
      </div>

      {/* ====== STEP 2: AADHAAR OTP AUTHENTICATION SECTION ====== */}
      <div>
        <AadhaarOtpVerificationCard
          existingMaskedAadhaar={existingData?.maskedAadhaar || ""}
          candidateMobile={mobile}
          initialStatus={existingData?.aadhaarVerified || aadhaarState === "valid" ? "VERIFIED" : "NOT_STARTED"}
          onVerificationSuccess={(data) => {
            setAadhaarState("valid");
            setAadhaarInput(data.maskedAadhaar);
            if (data.name) setFullName(data.name);
            if (data.state) setState(data.state);
            if (data.city) setCity(data.city);
          }}
        />
      </div>

      {/* STATE & CITY */}
      <div className="wiz-field-row">
        <div className="wiz-field">
          <label>State (as on Aadhaar) *</label>
          <select value={state} onChange={(e) => setState(e.target.value)}>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="wiz-field">
          <label>City · locality *</label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Bengaluru, Koramangala"
            required
          />
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" style={{ padding: "14px 28px", fontSize: 15 }} disabled={saving}>
          {saving ? "Saving…" : "Save & continue →"}
        </button>
      </div>
    </form>
  );
}
