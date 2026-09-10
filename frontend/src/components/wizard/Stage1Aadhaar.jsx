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

  // 1. Contact Information
  const [fullName, setFullName] = useState(existingData?.fullName || "");
  const [experience, setExperience] = useState(existingData?.experience || (existingData?.workHistory?.length > 0 ? "Experienced" : "Fresher"));
  const [currentRole, setCurrentRole] = useState(existingData?.currentRole || "");
  const [mobile, setMobile] = useState(existingData?.mobile ? formatMobile(existingData.mobile) : "");
  const [email, setEmail] = useState(existingData?.email || "");
  const [state, setState] = useState(existingData?.state || "");
  const [city, setCity] = useState(existingData?.city || "");
  const [country, setCountry] = useState(existingData?.country || "India");
  const [linkedin, setLinkedin] = useState(existingData?.linkedin || "");

  // Aadhaar Document & Verification States
  const [aadhaarInput, setAadhaarInput] = useState(existingData?.maskedAadhaar || (existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : ""));
  const cleanAadhaarDigits = aadhaarInput.replace(/\D/g, "");
  const isAadhaarChecksumValid = verhoeffValidate(cleanAadhaarDigits);
  const [aadhaarDocName, setAadhaarDocName] = useState(existingData?.docName || existingData?.aadhaarDocName || "");
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState(existingData?.docUrl || existingData?.aadhaarDocUrl || "");
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  // 2. Professional Summary
  const [summary, setSummary] = useState(existingData?.summary || "");

  // 3. Technical & Coding Skill Set
  const [codeSets, setCodeSets] = useState(existingData?.codeSets || "");
  const [specializedKnowledge, setSpecializedKnowledge] = useState(existingData?.specializedKnowledge || "");
  const [ehrSoftware, setEhrSoftware] = useState(existingData?.ehrSoftware || "");
  const [coreCompetencies, setCoreCompetencies] = useState(existingData?.coreCompetencies || "");

  // 4. Professional Experience
  const [workHistory, setWorkHistory] = useState(
    existingData?.workHistory && existingData.workHistory.length > 0
      ? existingData.workHistory
      : []
  );

  // 5. Education & Academic Details
  const [degree, setDegree] = useState(existingData?.degree || "");
  const [collegeName, setCollegeName] = useState(existingData?.collegeName || "");
  const [graduationYear, setGraduationYear] = useState(existingData?.graduationYear || "");

  const [schoolName, setSchoolName] = useState(existingData?.schoolName || "");
  const [schoolBoard, setSchoolBoard] = useState(existingData?.schoolBoard || "");
  const [schoolYear, setSchoolYear] = useState(existingData?.schoolYear || "");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isMobileValid = isValidIndianMobile(cleanMobileDigits);

  // Dynamic Work History Handlers
  function handleAddWorkHistory() {
    setExperience("Experienced");
    setWorkHistory((prev) => [
      ...prev,
      { title: "", company: "", location: "", dates: "", workType: "", metrics: "", description: "" },
    ]);
  }

  function handleRemoveWorkHistory(index) {
    setWorkHistory((prev) => prev.filter((_, i) => i !== index));
  }

  function handleWorkHistoryChange(index, field, value) {
    setWorkHistory((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  // File upload handler
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

    if (!isAadhaarChecksumValid) {
      setError("Please enter a valid 12-digit Aadhaar number with correct UIDAI checksum.");
      toast("Valid 12-digit Aadhaar number is required.", "!");
      setSaving(false);
      return;
    }

    if (!city || city.trim().length < 2) {
      setError("Please enter your City / Locality as on Aadhaar.");
      toast("City / Locality is required.", "!");
      setSaving(false);
      return;
    }

    // 5. Education & Academic Qualifications Mandatory Validation
    if (!degree || degree.trim().length < 2) {
      setError("Please enter your Degree Name (e.g. B.Sc. Life Sciences / B.Com / B.Tech).");
      toast("Degree Name is required.", "!");
      setSaving(false);
      return;
    }

    if (!collegeName || collegeName.trim().length < 2) {
      setError("Please enter your University / College Name.");
      toast("University / College Name is required.", "!");
      setSaving(false);
      return;
    }

    if (!graduationYear || !/^\d{4}$/.test(String(graduationYear).trim())) {
      setError("Please enter a valid 4-digit Graduation Year (e.g. 2022).");
      toast("Valid 4-digit Graduation Year is required.", "!");
      setSaving(false);
      return;
    }

    if (!schoolName || schoolName.trim().length < 2) {
      setError("Please enter your High School Name.");
      toast("High School Name is required.", "!");
      setSaving(false);
      return;
    }

    if (!schoolBoard || schoolBoard.trim().length < 2) {
      setError("Please enter your Schooling Board (e.g. CBSE / ICSE / State Board).");
      toast("Schooling Board is required.", "!");
      setSaving(false);
      return;
    }

    if (!schoolYear || !/^\d{4}$/.test(String(schoolYear).trim())) {
      setError("Please enter a valid 4-digit High School Completion Year (e.g. 2018).");
      toast("Valid 4-digit School Completion Year is required.", "!");
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
        state,
        city: city || "Bengaluru",
        country,
        linkedin,
        aadhaarNumber: cleanAadhaarDigits,
        maskedAadhaar: aadhaarInput,
        aadhaarDocName,
        aadhaarDocUrl,
        docName: aadhaarDocName,
        docUrl: aadhaarDocUrl,
        aadhaarVerified: isAadhaarChecksumValid,

        summary,

        codeSets,
        specializedKnowledge,
        ehrSoftware,
        coreCompetencies,

        workHistory: workHistory.filter((w) => w.title?.trim() || w.company?.trim()),

        degree,
        collegeName,
        graduationYear,
        schoolName,
        schoolBoard,
        schoolYear,

        education: [
          ...(degree || collegeName ? [{ degree, school: collegeName, year: graduationYear }] : []),
          ...(schoolName || schoolBoard ? [{ degree: schoolBoard ? `High School (${schoolBoard})` : "High School", school: schoolName, year: schoolYear }] : []),
        ],
        skills: [codeSets, specializedKnowledge, ehrSoftware].filter(Boolean).join(", "),
      };

      const res = await api.put(`/candidate/stage/1`, payload);
      toast("Stage 1 details saved successfully!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to save Stage 1.");
      toast("Failed to save. Please check required fields.", "!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="wiz-stage-form">
      {error && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: 14, borderRadius: 10, marginBottom: 20, fontSize: 13, fontWeight: 700 }}>
          <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 8 }}></i>
          {error}
        </div>
      )}

      {/* 1. CONTACT INFORMATION & AADHAAR NUMBER */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-address-card" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            1. Contact &amp; Identity Details
          </h4>
          {isAadhaarChecksumValid && (
            <span style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i className="fa-solid fa-circle-check"></i> AADHAAR VERIFIED
            </span>
          )}
        </div>

        {/* Real-time validating Aadhaar Number Input */}
        <div className="wiz-field" style={{ marginBottom: 14 }}>
          <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span>
              12-Digit Aadhaar Number <span style={{ color: "#EF4444" }}>*</span>
            </span>
            {cleanAadhaarDigits.length > 0 && (
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 700,
                  color: isAadhaarChecksumValid ? "#16A34A" : cleanAadhaarDigits.length === 12 ? "#DC2626" : "#64748B",
                }}
              >
                {isAadhaarChecksumValid
                  ? "✓ Valid Aadhaar Number"
                  : cleanAadhaarDigits.length === 12
                  ? "✕ Invalid Aadhaar Checksum"
                  : `${cleanAadhaarDigits.length}/12 Digits`}
              </span>
            )}
          </label>
          <div style={{ position: "relative" }}>
            <input
              type="text"
              required
              maxLength={14}
              value={aadhaarInput}
              onChange={(e) => setAadhaarInput(formatAadhaar(e.target.value))}
              placeholder="XXXX XXXX XXXX"
              style={{
                width: "100%",
                paddingRight: 40,
                borderColor: isAadhaarChecksumValid
                  ? "#22C55E"
                  : cleanAadhaarDigits.length === 12
                  ? "#EF4444"
                  : "#CBD5E1",
                background: isAadhaarChecksumValid
                  ? "#F0FDF4"
                  : cleanAadhaarDigits.length === 12
                  ? "#FEF2F2"
                  : "#FFFFFF",
                boxShadow: isAadhaarChecksumValid
                  ? "0 0 0 3px rgba(34, 197, 94, 0.2)"
                  : cleanAadhaarDigits.length === 12
                  ? "0 0 0 3px rgba(239, 68, 68, 0.15)"
                  : "none",
                fontWeight: 700,
                letterSpacing: "0.08em",
                color: isAadhaarChecksumValid ? "#15803D" : "#082553",
                transition: "all 0.2s ease",
              }}
            />
            {isAadhaarChecksumValid ? (
              <i
                className="fa-solid fa-circle-check"
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#16A34A",
                  fontSize: 18,
                }}
              />
            ) : cleanAadhaarDigits.length === 12 ? (
              <i
                className="fa-solid fa-circle-xmark"
                style={{
                  position: "absolute",
                  right: 14,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#DC2626",
                  fontSize: 18,
                }}
              />
            ) : null}
          </div>
        </div>

        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>
            Full legal name (as on Aadhaar card) <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ananya Sharma" required />
        </div>

        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>
            Experience Level <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <div className="wiz-pill-row">
            <button
              type="button"
              className={`wiz-pill wiz-pill-compact ${String(experience).toLowerCase() === "fresher" ? "active" : ""}`}
              onClick={() => setExperience("Fresher")}
            >
              Fresher (New to Industry)
            </button>
            <button
              type="button"
              className={`wiz-pill wiz-pill-compact ${String(experience).toLowerCase() === "experienced" ? "active" : ""}`}
              onClick={() => setExperience("Experienced")}
            >
              Experienced (1+ yrs in Coding/RCM)
            </button>
          </div>
        </div>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>
              Professional Email <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
          </div>
          <div className="wiz-field">
            <label>
              Mobile Number (10 digits) <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input type="tel" value={mobile} onChange={(e) => setMobile(formatMobile(e.target.value))} placeholder="98765 43210" maxLength={11} required />
          </div>
        </div>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>
              State <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <select value={state} onChange={(e) => setState(e.target.value)} required>
              <option value="">-- Select State --</option>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="wiz-field">
            <label>
              City / Locality <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} placeholder="e.g. Bengaluru, Koramangala" required />
          </div>
          <div className="wiz-field">
            <label>Country</label>
            <input type="text" value={country} onChange={(e) => setCountry(e.target.value)} placeholder="India" />
          </div>
        </div>

        <div className="wiz-field">
          <label>LinkedIn Profile / Portfolio Link</label>
          <input type="text" value={linkedin} onChange={(e) => setLinkedin(e.target.value)} placeholder="linkedin.com/in/yourprofile" />
        </div>
      </div>

      {/* OPTIONAL: AADHAAR CARD ATTACHMENT */}
      <div style={{ background: "#FFFFFF", border: "1px dashed #CBD5E1", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "var(--navy)" }}>
            <i className="fa-solid fa-paperclip" style={{ color: "#64748B", marginRight: 8 }}></i>
            Optional: Attach Aadhaar Card Copy (Photo / PDF)
          </label>
          {aadhaarDocName && (
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>
              ✓ ATTACHED
            </span>
          )}
        </div>

        {aadhaarDocName ? (
          <div style={{ background: "#F0FDF4", border: "1px solid #22C55E", borderRadius: 8, padding: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-file-pdf" style={{ fontSize: 20, color: "#15803D" }}></i>
              <strong style={{ fontSize: 12, color: "#15803D" }}>{aadhaarDocName}</strong>
            </div>
            <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: "5px 10px" }} onClick={() => aadhaarFileInputRef.current?.click()}>
              Replace ↻
            </button>
          </div>
        ) : (
          <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", padding: "11px 16px", fontSize: 12.5 }} onClick={() => aadhaarFileInputRef.current?.click()} disabled={aadhaarUploading}>
            <i className="fa-solid fa-paperclip" style={{ marginRight: 6 }}></i>
            {aadhaarUploading ? "Uploading file…" : "+ Attach Aadhaar File (Optional)"}
          </button>
        )}
        <input ref={aadhaarFileInputRef} type="file" accept="image/*,.pdf" style={{ display: "none" }} onChange={handleAadhaarFileUpload} />
      </div>

      {/* 2. PROFESSIONAL SUMMARY */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-align-left" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          2. Professional Summary (2-3 Sentences Overview)
        </h4>
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder="Core coding specialties, accuracy rate %, and years of experience..."
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, lineHeight: 1.5 }}
        />
      </div>

      {/* 3. TECHNICAL & CODING SKILL SET */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-code-compare" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          3. Technical &amp; Coding Skill Set
        </h4>

        <div className="wiz-field" style={{ marginBottom: 10 }}>
          <label>Code Sets (ICD-10-CM, ICD-10-PCS, CPT, HCPCS Level II, CDT)</label>
          <input type="text" value={codeSets} onChange={(e) => setCodeSets(e.target.value)} placeholder="ICD-10-CM, CPT, HCPCS Level II" />
        </div>

        <div className="wiz-field" style={{ marginBottom: 10 }}>
          <label>Specialized Knowledge (E/M leveling, Modifiers, NCCI edits, HIPAA, Medical Necessity, DRG, HCC)</label>
          <input type="text" value={specializedKnowledge} onChange={(e) => setSpecializedKnowledge(e.target.value)} placeholder="E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA" />
        </div>

        <div className="wiz-field-row">
          <div className="wiz-field">
            <label>EHR &amp; Billing Software (Epic, Cerner, Meditech, Athenahealth, 3M CodeRyte, Optum)</label>
            <input type="text" value={ehrSoftware} onChange={(e) => setEhrSoftware(e.target.value)} placeholder="Epic, 3M CodeRyte, Cerner" />
          </div>
          <div className="wiz-field">
            <label>Core Competencies (Anatomy, Medical Terminology, CDI, Denial Resolution)</label>
            <input type="text" value={coreCompetencies} onChange={(e) => setCoreCompetencies(e.target.value)} placeholder="Anatomy & Physiology, Medical Terminology, CDI" />
          </div>
        </div>
      </div>

      {/* 4. PROFESSIONAL EXPERIENCE */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-briefcase" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            4. Professional Experience &amp; Metrics
          </h4>
          <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleAddWorkHistory}>
            <i className="fa-solid fa-plus" style={{ marginRight: 4 }}></i> Add Position
          </button>
        </div>

        {workHistory.length === 0 && (
          <div style={{ padding: "14px 16px", textAlign: "center", color: "#64748B", fontSize: 12.5, background: "#FFFFFF", borderRadius: 8, border: "1px dashed #CBD5E1" }}>
            No work experience added yet. Click &quot;+ Add Position&quot; above to add your employment history (optional for freshers).
          </div>
        )}

        {workHistory.map((item, idx) => (
          <div key={idx} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)" }}>Position #{idx + 1}</span>
              <button type="button" onClick={() => handleRemoveWorkHistory(idx)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                ✕ Remove Position
              </button>
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 8 }}>
              <div className="wiz-field">
                <label>
                  Job Title &amp; Employer <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input type="text" value={item.title || ""} onChange={(e) => handleWorkHistoryChange(idx, "title", e.target.value)} placeholder="e.g. Senior Medical Coder II" required />
              </div>
              <div className="wiz-field">
                <label>
                  Facility / Employer Name &amp; Location <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input type="text" value={item.company || ""} onChange={(e) => handleWorkHistoryChange(idx, "company", e.target.value)} placeholder="e.g. ABC Healthcare RCM, Bengaluru" required />
              </div>
              <div className="wiz-field">
                <label>
                  Employment Dates <span style={{ color: "#EF4444" }}>*</span>
                </label>
                <input type="text" value={item.dates || ""} onChange={(e) => handleWorkHistoryChange(idx, "dates", e.target.value)} placeholder="e.g. 2022 – Present" required />
              </div>
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 8 }}>
              <div className="wiz-field">
                <label>Work Type (Inpatient, Outpatient, ASC, Remote/On-site)</label>
                <input type="text" value={item.workType || ""} onChange={(e) => handleWorkHistoryChange(idx, "workType", e.target.value)} placeholder="e.g. Outpatient / ED Coding (Remote)" />
              </div>
              <div className="wiz-field">
                <label>Volume &amp; Accuracy Metrics (e.g. 98% accuracy on 60+ charts/day)</label>
                <input type="text" value={item.metrics || ""} onChange={(e) => handleWorkHistoryChange(idx, "metrics", e.target.value)} placeholder="e.g. Maintained 98.4% accuracy on 65+ outpatient charts daily" />
              </div>
            </div>

            <div className="wiz-field">
              <label>Key Responsibilities (Physician queries, unbundling, appeals, HIPAA &amp; CMS compliance)</label>
              <textarea
                rows={2}
                value={item.description || ""}
                onChange={(e) => handleWorkHistoryChange(idx, "description", e.target.value)}
                placeholder="Querying physicians, identifying unbundled codes, processing appeals, HIPAA & CMS adherence..."
                style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* 5. EDUCATION & ACADEMIC DETAILS */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-graduation-cap" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          5. Education &amp; Academic Qualifications <span style={{ color: "#EF4444", fontSize: 12 }}>* (All fields mandatory)</span>
        </h4>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>
              Degree Name (B.S./B.Sc. in Life Sciences, HIM, Nursing, etc.) <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={degree}
              onChange={(e) => setDegree(e.target.value)}
              placeholder="e.g. B.Sc. Life Sciences / Healthcare Administration"
            />
          </div>
          <div className="wiz-field">
            <label>
              University / College Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              placeholder="e.g. Bangalore University"
            />
          </div>
          <div className="wiz-field">
            <label>
              Graduation Year <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={4}
              value={graduationYear}
              onChange={(e) => setGraduationYear(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 2021"
            />
          </div>
        </div>

        <div className="wiz-field-row">
          <div className="wiz-field">
            <label>
              High School Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="e.g. St. Joseph's Higher Secondary School"
            />
          </div>
          <div className="wiz-field">
            <label>
              Schooling Board <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={schoolBoard}
              onChange={(e) => setSchoolBoard(e.target.value)}
              placeholder="e.g. CBSE Board / State Board"
            />
          </div>
          <div className="wiz-field">
            <label>
              Completion Year <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              maxLength={4}
              value={schoolYear}
              onChange={(e) => setSchoolYear(e.target.value.replace(/\D/g, ""))}
              placeholder="e.g. 2018"
            />
          </div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" style={{ padding: "14px 28px", fontSize: 15 }} disabled={saving}>
          {saving ? "Saving Basic Info…" : "Save & continue →"}
        </button>
      </div>
    </form>
  );
}
