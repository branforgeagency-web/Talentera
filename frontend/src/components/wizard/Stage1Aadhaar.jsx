import React, { useRef, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { verhoeffValidate, formatAadhaar, formatMobile, isValidIndianMobile } from "../../utils/verhoeff";

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
  const ekycZipInputRef = useRef(null);

  const [fullName, setFullName] = useState(existingData?.fullName || "");
  const [experience, setExperience] = useState(existingData?.experience || "fresher");
  const [currentRole, setCurrentRole] = useState(existingData?.currentRole || "Medical Coder");
  const [mobile, setMobile] = useState(existingData?.mobile ? formatMobile(existingData.mobile) : "");
  const [email, setEmail] = useState(existingData?.email || "");

  const [aadhaarInput, setAadhaarInput] = useState(existingData?.maskedAadhaar || (existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : ""));
  const [aadhaarState, setAadhaarState] = useState(existingData?.aadhaarVerified ? "valid" : "idle");

  // Offline e-KYC ZIP States
  const [ekycFile, setEkycFile] = useState(null);
  const [ekycShareCode, setEkycShareCode] = useState("");
  const [ekycVerifying, setEkycVerifying] = useState(false);
  const [ekycVerifiedData, setEkycVerifiedData] = useState(existingData?.aadhaarVerified ? existingData : null);

  const [state, setState] = useState(existingData?.state || "Tamil Nadu");
  const [city, setCity] = useState(existingData?.city || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isMobileValid = isValidIndianMobile(cleanMobileDigits);

  function handleAadhaarInput(raw) {
    const digits = raw.replace(/\D/g, "").slice(0, 12);
    setAadhaarInput(formatAadhaar(digits));
    if (digits.length === 0) setAadhaarState("idle");
    else if (digits.length < 12) setAadhaarState("typing");
    else setAadhaarState(verhoeffValidate(digits) ? "valid" : "invalid");
  }

  function matchIndianState(stateStr) {
  if (!stateStr) return null;
  const s = String(stateStr).trim().toLowerCase();
  const found = INDIAN_STATES.find((st) => st.toLowerCase() === s || st.toLowerCase().includes(s) || s.includes(st.toLowerCase()));
  if (found) return found;
  if (s.includes("tamil")) return "Tamil Nadu";
  if (s.includes("karnataka")) return "Karnataka";
  if (s.includes("kerala")) return "Kerala";
  if (s.includes("andhra")) return "Andhra Pradesh";
  if (s.includes("telangana")) return "Telangana";
  if (s.includes("maharashtra")) return "Maharashtra";
  if (s.includes("delhi")) return "Delhi (NCT)";
  if (s.includes("uttar pradesh")) return "Uttar Pradesh";
  if (s.includes("gujarat")) return "Gujarat";
  if (s.includes("bengal")) return "West Bengal";
  if (s.includes("punjab")) return "Punjab";
  if (s.includes("haryana")) return "Haryana";
  if (s.includes("rajasthan")) return "Rajasthan";
  if (s.includes("bihar")) return "Bihar";
  if (s.includes("madhya pradesh")) return "Madhya Pradesh";
  return null;
}

// --- Offline e-KYC / e-Aadhaar Handler ---
  async function handleVerifyEkycZip() {
    if (!ekycFile) {
      toast("Please select your myAadhaar e-Aadhaar .pdf or .zip file", "!");
      return;
    }

    setEkycVerifying(true);
    setError("");

    const formData = new FormData();
    formData.append("ekycZip", ekycFile);
    formData.append("shareCode", ekycShareCode.trim());
    formData.append("mobile", mobile);
    formData.append("experience", experience);
    formData.append("currentRole", currentRole);

    try {
      const res = await api.post("/candidate/ekyc/verify", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.success) {
        const decoded = res.data.decoded;
        setEkycVerifiedData(decoded);
        if (decoded.fullName) setFullName(decoded.fullName);
        if (decoded.city) setCity(decoded.city);
        if (decoded.state) {
          const matched = matchIndianState(decoded.state);
          if (matched) setState(matched);
          else setState(decoded.state);
        }
        setAadhaarInput(decoded.maskedAadhaar || "XXXX XXXX 8821");
        setAadhaarState("valid");
        toast(`e-Aadhaar Verified! Auto-selected State: ${decoded.state || state}, City: ${decoded.city || city}`, "✓");
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      console.error("e-KYC error:", err);
      const msg = err.response?.data?.message || "Could not process e-Aadhaar file.";
      setError(msg);
      toast(msg, "!");
    } finally {
      setEkycVerifying(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setError("");

    if (!fullName || !fullName.trim()) {
      setError("Please enter your full legal name.");
      toast("Please enter your full legal name.", "!");
      setSaving(false);
      return;
    }

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
        state,
        city: city || "Bengaluru",
        aadhaarVerified: aadhaarState === "valid" || Boolean(ekycVerifiedData),
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
    <form onSubmit={handleSubmit} className="wiz-stage-form">
      <div className="wiz-field">
        <label>Full legal name (as on Aadhaar card)</label>
        <input
          type="text"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Ananya Sharma"
          required
        />
      </div>

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

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>Mobile (10 digits)</span>
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
          <label>Email address</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
        </div>
      </div>

      <div className="wiz-field">
        <label>Aadhaar number (12 digits) · real-time checksum</label>
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
            {aadhaarState === "valid" ? "✓ Valid Format" : aadhaarState === "invalid" ? "✕ Invalid" : "Checksum Check"}
          </span>
        </div>
      </div>

      {/* ====== OFFICIAL AADHAAR e-KYC VERIFICATION SECTION ====== */}
      <div className="aadhaar-verify-section">
        <div className="aadhaar-verify-head">
          <div className="aadhaar-verify-title">
            <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: "var(--gold)" }}></i>
            Official Aadhaar Identity Verification (e-Aadhaar PDF or Offline ZIP)
          </div>
          <div className="aadhaar-verify-sub">Official free digital verification via UIDAI myAadhaar portal</div>
        </div>

        {/* VERIFIED SUCCESS CARD */}
        {ekycVerifiedData ? (
          <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", borderRadius: 12, padding: 18, marginBottom: 20, display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ width: 44, height: 44, borderRadius: "50%", background: "#22C55E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: "bold" }}>
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, color: "#15803D", fontSize: 16 }}>Aadhaar Identity Verified</div>
              <div style={{ fontSize: 13, color: "#374151", marginTop: 2 }}>Name: <strong>{ekycVerifiedData.fullName}</strong> • Locality: <strong>{ekycVerifiedData.city}</strong> • Gender: {ekycVerifiedData.gender}</div>
              <div style={{ fontSize: 11, color: "#6B7280", marginTop: 2 }}>Method: {ekycVerifiedData.verificationMethod}</div>
            </div>
          </div>
        ) : (
          <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <p style={{ fontSize: 13, color: "#334155", margin: "0 0 14px", lineHeight: 1.5 }}>
              Upload your official <strong>e-Aadhaar PDF</strong> or <strong>Offline e-KYC ZIP</strong> downloaded directly from UIDAI’s official <strong>myAadhaar</strong> portal (`myAadhaar.uidai.gov.in`).
            </p>

            <div style={{ background: "#fff", border: "1px solid #CBD5E1", borderRadius: 8, padding: 18, marginBottom: 14 }}>
              <a href="https://myaadhaar.uidai.gov.in/" target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 700, color: "var(--navy)", textDecoration: "none", marginBottom: 16, background: "rgba(229,168,46,0.15)", border: "1px solid var(--gold)", padding: "10px 16px", borderRadius: 8, width: "100%", justifyContent: "center" }}>
                <i className="fa-solid fa-arrow-up-right-from-square" style={{ color: "var(--gold)" }}></i> Step 1: Open myAadhaar Portal &amp; Download e-Aadhaar PDF / ZIP ↗
              </a>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 14 }}>
                <div>
                  <label className="wiz-mini-label">Step 2: Select e-Aadhaar .pdf or .zip file</label>
                  <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", fontSize: 12 }} onClick={() => ekycZipInputRef.current?.click()}>
                    <i className="fa-solid fa-file-pdf" style={{ marginRight: 6, color: "#EF4444" }}></i>
                    {ekycFile ? ekycFile.name : "Select e-Aadhaar PDF / ZIP"}
                  </button>
                  <input ref={ekycZipInputRef} type="file" accept=".pdf,.zip,image/*" style={{ display: "none" }} onChange={(e) => setEkycFile(e.target.files?.[0] || null)} />
                </div>

                <div>
                  <label className="wiz-mini-label">Step 3: Password / Share Code</label>
                  <input
                    type="password"
                    placeholder="PDF Password or 4-digit code"
                    value={ekycShareCode}
                    onChange={(e) => setEkycShareCode(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13, fontWeight: 700 }}
                  />
                  <div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>
                    {ekycFile?.name.toLowerCase().endsWith(".pdf")
                      ? "PDF password: First 4 letters of your name (UPPERCASE) + Year of birth (e.g. ANAN1996)"
                      : "For ZIP files: Enter 4-digit share code (e.g. 1234)"}
                  </div>
                </div>
              </div>

              <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontSize: 14 }} onClick={handleVerifyEkycZip} disabled={ekycVerifying}>
                {ekycVerifying ? "Processing e-Aadhaar Verification…" : "Step 4: Verify e-Aadhaar Identity →"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>State (as on Aadhaar)</span>
            {ekycVerifiedData?.state && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i> Auto-selected
              </span>
            )}
          </label>
          <select value={state} onChange={(e) => setState(e.target.value)} style={ekycVerifiedData?.state ? { borderColor: "#22C55E", background: "#F0FDF4" } : {}}>
            {INDIAN_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="wiz-field">
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>City · locality</span>
            {ekycVerifiedData?.city && (
              <span style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>
                <i className="fa-solid fa-circle-check" style={{ marginRight: 4 }}></i> Auto-filled
              </span>
            )}
          </label>
          <input
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="e.g., Bengaluru, Koramangala"
            style={ekycVerifiedData?.city ? { borderColor: "#22C55E", background: "#F0FDF4" } : {}}
          />
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
