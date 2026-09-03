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
  const [experience, setExperience] = useState(existingData?.experience || "experienced");
  const [currentRole, setCurrentRole] = useState(existingData?.currentRole || "Medical Coder II");
  const [mobile, setMobile] = useState(existingData?.mobile ? formatMobile(existingData.mobile) : "");
  const [email, setEmail] = useState(existingData?.email || "");
  const [state, setState] = useState(existingData?.state || "Tamil Nadu");
  const [city, setCity] = useState(existingData?.city || "");
  const [country, setCountry] = useState(existingData?.country || "India");
  const [linkedin, setLinkedin] = useState(existingData?.linkedin || "linkedin.com/in/medical-coder");

  // Aadhaar Document & Verification States
  const [aadhaarInput, setAadhaarInput] = useState(existingData?.maskedAadhaar || (existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : ""));
  const [aadhaarState, setAadhaarState] = useState(existingData?.aadhaarVerified ? "valid" : "idle");
  const [aadhaarDocName, setAadhaarDocName] = useState(existingData?.docName || existingData?.aadhaarDocName || "");
  const [aadhaarDocUrl, setAadhaarDocUrl] = useState(existingData?.docUrl || existingData?.aadhaarDocUrl || "");
  const [aadhaarUploading, setAadhaarUploading] = useState(false);

  // 2. Professional Summary
  const [summary, setSummary] = useState(
    existingData?.summary || "Healthcare RCM Specialist & Medical Coder with 3+ years experience in Outpatient, Inpatient, and ED Medical Coding. Proven track record maintaining 98% coding accuracy across 60+ charts daily while ensuring full HIPAA & CMS compliance."
  );

  // 3. Technical & Coding Skill Set
  const [codeSets, setCodeSets] = useState(existingData?.codeSets || "ICD-10-CM, ICD-10-PCS, CPT, HCPCS Level II, CDT");
  const [specializedKnowledge, setSpecializedKnowledge] = useState(existingData?.specializedKnowledge || "E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA Compliance, Medical Necessity, DRG Assignment, HCC Risk Adjustment");
  const [ehrSoftware, setEhrSoftware] = useState(existingData?.ehrSoftware || "Epic Hyperspace, Cerner, Meditech, Athenahealth, 3M CodeRyte / Encoder Pro, Optum Encoder");
  const [coreCompetencies, setCoreCompetencies] = useState(existingData?.coreCompetencies || "Anatomy & Physiology, Medical Terminology, Clinical Documentation Improvement (CDI), Denial & Audit Appeals Resolution");

  // 4. Professional Experience
  const [workHistory, setWorkHistory] = useState(
    existingData?.workHistory && existingData.workHistory.length > 0
      ? existingData.workHistory
      : [
          {
            title: "Senior Medical Coder II",
            company: "ThoughtFlows Healthcare RCM Ltd",
            location: "Bengaluru",
            dates: "2022 – Present",
            workType: "Outpatient / ED Coding (Remote)",
            metrics: "Maintained 98.4% accuracy on 65+ outpatient charts daily",
            description: "Coded complex ED and Surgery charts using ICD-10-CM and CPT modifiers. Queried physicians to resolve clinical documentation ambiguities, identified unbundled codes, and resolved CO-197 pre-authorization denials.",
          },
        ]
  );

  // 5. Education & Academic Details
  const [degree, setDegree] = useState(existingData?.degree || "B.Sc. Life Sciences / Healthcare Information Management");
  const [collegeName, setCollegeName] = useState(existingData?.collegeName || "Bangalore University / Life Sciences Institute");
  const [graduationYear, setGraduationYear] = useState(existingData?.graduationYear || "2021");

  const [schoolName, setSchoolName] = useState(existingData?.schoolName || "St. Joseph's Higher Secondary School");
  const [schoolBoard, setSchoolBoard] = useState(existingData?.schoolBoard || "CBSE Board");
  const [schoolYear, setSchoolYear] = useState(existingData?.schoolYear || "2018");

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isMobileValid = isValidIndianMobile(cleanMobileDigits);

  // Dynamic Work History Handlers
  function handleAddWorkHistory() {
    setWorkHistory((prev) => [
      ...prev,
      { title: "Inpatient Medical Coder", company: "Apex RCM Solutions", location: "Bengaluru", dates: "2021 – 2022", workType: "Inpatient / ASC", metrics: "98% accuracy on 50+ records daily", description: "Processed DRG assignments, physician queries, and claims appeals." },
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

    if (!existingData?.aadhaarVerified && aadhaarState !== "valid" && !aadhaarInput && !aadhaarDocName && !aadhaarDocUrl) {
      setError("Please verify your 12-digit Aadhaar Number via Mobile OTP.");
      toast("Aadhaar OTP verification is required.", "!");
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
        state,
        city: city || "Bengaluru",
        country,
        linkedin,
        aadhaarNumber: aadhaarInput,
        maskedAadhaar: aadhaarInput,
        aadhaarDocName,
        aadhaarDocUrl,
        docName: aadhaarDocName,
        docUrl: aadhaarDocUrl,
        aadhaarVerified: aadhaarState === "valid" || existingData?.aadhaarVerified,

        summary,

        codeSets,
        specializedKnowledge,
        ehrSoftware,
        coreCompetencies,

        workHistory,

        degree,
        collegeName,
        graduationYear,
        schoolName,
        schoolBoard,
        schoolYear,

        education: [
          { degree, school: collegeName, year: graduationYear },
          { degree: `High School (${schoolBoard})`, school: schoolName, year: schoolYear },
        ],
        skills: `${codeSets}, ${specializedKnowledge}, ${ehrSoftware}`,
      };

      const res = await api.put(`/candidate/stage/1`, payload);
      toast("Stage 1 details saved successfully!", "✓");
      if (onSaved) onSaved(res.data.candidate);
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

      {/* 1. INSTANT AADHAAR OTP VERIFICATION CARD (PRIMARY) */}
      <div style={{ marginBottom: 24 }}>
        <AadhaarOtpVerificationCard
          existingMaskedAadhaar={existingData?.maskedAadhaar || (existingData?.aadhaarNumber ? formatAadhaar(existingData.aadhaarNumber) : "")}
          candidateMobile={mobile}
          docUploaded={true}
          initialStatus={existingData?.aadhaarVerified || aadhaarState === "valid" ? "VERIFIED" : "NOT_STARTED"}
          onVerificationSuccess={(data) => {
            setAadhaarState("valid");
            setAadhaarInput(data.maskedAadhaar);
            if (data.name) setFullName(data.name);
            if (data.city) setCity(data.city);
            if (data.state) setState(data.state);
            toast("✓ Profile details auto-filled from verified Aadhaar record", "✓");
          }}
        />
      </div>

      {/* 2. CONTACT INFORMATION */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-address-card" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            1. Contact &amp; Identity Details
          </h4>
          {aadhaarState === "valid" && (
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              ✓ UIDAI VERIFIED IDENTITY
            </span>
          )}
        </div>

        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>Full legal name (as on Aadhaar card) *</label>
          <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Ananya Sharma" required />
        </div>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>Professional Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" required />
          </div>
          <div className="wiz-field">
            <label>Mobile Number (10 digits) *</label>
            <input type="tel" value={mobile} onChange={(e) => setMobile(formatMobile(e.target.value))} placeholder="98765 43210" maxLength={11} required />
          </div>
        </div>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>State *</label>
            <select value={state} onChange={(e) => setState(e.target.value)}>
              {INDIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div className="wiz-field">
            <label>City / Locality *</label>
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
          required
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

        {workHistory.map((item, idx) => (
          <div key={idx} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)" }}>Position #{idx + 1}</span>
              {workHistory.length > 1 && (
                <button type="button" onClick={() => handleRemoveWorkHistory(idx)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                  ✕ Remove Position
                </button>
              )}
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 8 }}>
              <div className="wiz-field">
                <label>Job Title &amp; Employer *</label>
                <input type="text" value={item.title} onChange={(e) => handleWorkHistoryChange(idx, "title", e.target.value)} placeholder="Medical Coder II" required />
              </div>
              <div className="wiz-field">
                <label>Facility / Employer Name &amp; Location *</label>
                <input type="text" value={item.company} onChange={(e) => handleWorkHistoryChange(idx, "company", e.target.value)} placeholder="ThoughtFlows RCM, Bengaluru" required />
              </div>
              <div className="wiz-field">
                <label>Employment Dates *</label>
                <input type="text" value={item.dates} onChange={(e) => handleWorkHistoryChange(idx, "dates", e.target.value)} placeholder="2022 – Present" required />
              </div>
            </div>

            <div className="wiz-field-row" style={{ marginBottom: 8 }}>
              <div className="wiz-field">
                <label>Work Type (Inpatient, Outpatient, ASC, Remote/On-site)</label>
                <input type="text" value={item.workType || ""} onChange={(e) => handleWorkHistoryChange(idx, "workType", e.target.value)} placeholder="Outpatient / ED Coding (Remote)" />
              </div>
              <div className="wiz-field">
                <label>Volume &amp; Accuracy Metrics (e.g. 98% accuracy on 60+ charts/day)</label>
                <input type="text" value={item.metrics || ""} onChange={(e) => handleWorkHistoryChange(idx, "metrics", e.target.value)} placeholder="Maintained 98.4% accuracy on 65+ outpatient charts daily" />
              </div>
            </div>

            <div className="wiz-field">
              <label>Key Responsibilities (Physician queries, unbundling, appeals, HIPAA &amp; CMS compliance)</label>
              <textarea
                rows={2}
                value={item.description}
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
          5. Education &amp; Academic Qualifications
        </h4>

        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>Degree Name (B.S./B.Sc. in Life Sciences, HIM, Nursing, etc.) *</label>
            <input type="text" value={degree} onChange={(e) => setDegree(e.target.value)} placeholder="B.Sc. Life Sciences / Healthcare Administration" required />
          </div>
          <div className="wiz-field">
            <label>University / College Name *</label>
            <input type="text" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} placeholder="Bangalore University" required />
          </div>
          <div className="wiz-field">
            <label>Graduation Year *</label>
            <input type="text" value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} placeholder="2021" required />
          </div>
        </div>

        <div className="wiz-field-row">
          <div className="wiz-field">
            <label>High School Name</label>
            <input type="text" value={schoolName} onChange={(e) => setSchoolName(e.target.value)} placeholder="St. Joseph's Higher Secondary School" />
          </div>
          <div className="wiz-field">
            <label>Schooling Board</label>
            <input type="text" value={schoolBoard} onChange={(e) => setSchoolBoard(e.target.value)} placeholder="CBSE Board" />
          </div>
          <div className="wiz-field">
            <label>Completion Year</label>
            <input type="text" value={schoolYear} onChange={(e) => setSchoolYear(e.target.value)} placeholder="2018" />
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
