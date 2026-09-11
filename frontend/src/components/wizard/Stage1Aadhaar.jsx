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

const LIFE_SCIENCE_COURSES = [
  "B.Sc. Biotechnology",
  "B.Sc. Microbiology",
  "B.Sc. Biochemistry",
  "B.Sc. Nursing",
  "B.Sc. Zoology / Botany / Biology",
  "B.Sc. Chemistry / Life Sciences",
  "B.Sc. MLT (Medical Lab Technology)",
  "B.Sc. HIM / Health Information Management",
  "B.Sc. Genetics / Bioinformatics",
  "B.Pharm / M.Pharm (Pharmacy)",
  "Pharm.D (Doctor of Pharmacy)",
  "BPT (Bachelor of Physiotherapy)",
  "BAMS / BHMS / BDS / MBBS (Medical / Allied Health)",
  "M.Sc. Life Sciences / Biotech / Microbiology",
  "Other Life Science Degree",
];

const NON_LIFE_SCIENCE_COURSES = [
  "B.Com (General / Computer Applications / Finance)",
  "B.Sc. Computer Science / IT / Maths / Physics",
  "B.Tech / B.E. (Engineering - Any Branch)",
  "BCA (Bachelor of Computer Applications)",
  "BBA / BBM (Business Administration)",
  "B.A. (Bachelor of Arts)",
  "MCA / M.Tech / MBA",
  "Diploma in Any Branch",
  "Other Non-Life Science Degree",
];

const STANDARD_DOC_VAULT = [
  {
    id: "doc_10th",
    category: "10th Marksheet / Pass Certificate",
    subtitle: "SSLC / 10th Board Certificate or Marksheet",
    required: false,
    icon: "fa-file-lines",
  },
  {
    id: "doc_12th",
    category: "12th / Intermediate Certificate",
    subtitle: "12th Standard / Intermediate / +2 Board Certificate",
    required: true,
    icon: "fa-file-lines",
  },
  {
    id: "doc_ug",
    category: "UG Course Degree / Provisional Certificate",
    subtitle: "Undergraduate Degree / Consolidated Marksheet / Provisional Certificate",
    required: true,
    icon: "fa-graduation-cap",
  },
  {
    id: "doc_pg",
    category: "PG Course Degree / Provisional Certificate",
    subtitle: "Postgraduate Degree / Provisional (M.Sc., M.Pharm, MBA, MCA - if applicable)",
    required: false,
    icon: "fa-user-graduate",
  },
  {
    id: "doc_cpc",
    category: "CPC Certification / Official Credential",
    subtitle: "CPC, COC, CIC, CRC, CPMA, CCS or AHIMA Official Certificate",
    required: false,
    icon: "fa-award",
  },
  {
    id: "doc_academy",
    category: "Academy Course Completion Certificate",
    subtitle: "Medical Coding Training Academy / Institute Certificate",
    required: false,
    icon: "fa-certificate",
  },
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
  const [coreCompetencies, setCoreCompetencies] = useState(existingData?.coreCompetencies || "");
  const [codeSets, setCodeSets] = useState(existingData?.codeSets || "");
  const [softSkills, setSoftSkills] = useState(existingData?.softSkills || "");
  const [codingPlatforms, setCodingPlatforms] = useState(existingData?.codingPlatforms || existingData?.ehrSoftware || "");
  const [specializedKnowledge, setSpecializedKnowledge] = useState(existingData?.specializedKnowledge || "");

  // 4. Professional Experience
  const [workHistory, setWorkHistory] = useState(
    existingData?.workHistory && existingData.workHistory.length > 0
      ? existingData.workHistory
      : []
  );

  // 5. Education & Academic Details
  const initialStream = existingData?.educationStream || (existingData?.degree && NON_LIFE_SCIENCE_COURSES.includes(existingData.degree) ? "Non-Life Science" : "Life Science");
  const [educationStream, setEducationStream] = useState(initialStream);
  const [degree, setDegree] = useState(existingData?.degree || "");
  const [customDegree, setCustomDegree] = useState(
    existingData?.degree && !LIFE_SCIENCE_COURSES.includes(existingData.degree) && !NON_LIFE_SCIENCE_COURSES.includes(existingData.degree)
      ? existingData.degree
      : ""
  );
  const [collegeName, setCollegeName] = useState(existingData?.collegeName || "");
  const [graduationYear, setGraduationYear] = useState(existingData?.graduationYear || "");
  const [cgpa, setCgpa] = useState(existingData?.cgpa || existingData?.percentage || "");

  // 6. Candidate Document Vault (All Academic, Educational & Certifications)
  const initializeVaultDocs = () => {
    const saved = existingData?.documentVault || existingData?.documents || [];
    const savedMap = new Map();
    const customDocs = [];

    saved.forEach((item) => {
      if (item.id && STANDARD_DOC_VAULT.some((s) => s.id === item.id)) {
        savedMap.set(item.id, item);
      } else if (item.category || item.customLabel || item.docUrl) {
        customDocs.push({
          id: item.id || `doc_custom_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          category: item.category || item.customLabel || "Other Relevant Document",
          subtitle: item.subtitle || "Additional Academic or Professional Certificate",
          required: false,
          isCustom: true,
          docName: item.docName || "",
          docUrl: item.docUrl || "",
          fileSize: item.fileSize || 0,
          uploadedAt: item.uploadedAt || "",
          icon: "fa-file-circle-check",
        });
      }
    });

    const standardWithSaved = STANDARD_DOC_VAULT.map((std) => {
      const match = savedMap.get(std.id);
      return {
        ...std,
        docName: match?.docName || "",
        docUrl: match?.docUrl || "",
        fileSize: match?.fileSize || 0,
        uploadedAt: match?.uploadedAt || "",
      };
    });

    return [...standardWithSaved, ...customDocs];
  };

  const [vaultDocs, setVaultDocs] = useState(initializeVaultDocs);
  const [uploadingDocId, setUploadingDocId] = useState(null);
  const [newCustomTitle, setNewCustomTitle] = useState("");
  const [showAddCustom, setShowAddCustom] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const cleanMobileDigits = mobile.replace(/\D/g, "");
  const isMobileValid = isValidIndianMobile(cleanMobileDigits);

  // Dynamic Work History Handlers
  function handleAddWorkHistory() {
    setWorkHistory((prev) => [
      ...prev,
      { title: "", company: "", location: "", dates: "", domain: "", workType: "", metrics: "", description: "" },
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

  // Vault document upload handler
  async function handleVaultDocUpload(docId, file) {
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast("File size too large. 10MB max allowed.", "!");
      return;
    }

    setUploadingDocId(docId);
    setError("");

    try {
      const form = new FormData();
      form.append("doc", file);

      let res;
      try {
        res = await api.post(`/candidate/upload/vault-doc`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } catch (e) {
        res = await api.post(`/candidate/upload/doc/1`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }

      const uploadedUrl = res.data?.docUrl;
      const uploadedName = res.data?.docName || file.name;
      const uploadedSize = res.data?.fileSize || file.size;

      if (uploadedUrl) {
        setVaultDocs((prev) =>
          prev.map((doc) =>
            doc.id === docId
              ? {
                  ...doc,
                  docName: uploadedName,
                  docUrl: uploadedUrl,
                  fileSize: uploadedSize,
                  uploadedAt: new Date().toISOString(),
                }
              : doc
          )
        );
        toast(`✓ Successfully uploaded "${uploadedName}"`, "✓");
      }
    } catch (err) {
      console.error("Document vault upload error:", err);
      const msg = err.response?.data?.message || "Failed to upload document.";
      setError(msg);
      toast(msg, "!");
    } finally {
      setUploadingDocId(null);
    }
  }

  function handleRemoveVaultDoc(docId) {
    setVaultDocs((prev) =>
      prev
        .map((doc) => {
          if (doc.id === docId) {
            if (doc.isCustom) return null; // remove custom item entirely
            return { ...doc, docName: "", docUrl: "", fileSize: 0, uploadedAt: "" };
          }
          return doc;
        })
        .filter(Boolean)
    );
    toast("Document removed from vault.", "ℹ");
  }

  function handleAddCustomDoc() {
    if (!newCustomTitle.trim()) {
      toast("Please enter a document title.", "!");
      return;
    }
    const newDoc = {
      id: `doc_custom_${Date.now()}`,
      category: newCustomTitle.trim(),
      subtitle: "Custom Academic / Certification Document",
      required: false,
      isCustom: true,
      docName: "",
      docUrl: "",
      fileSize: 0,
      uploadedAt: "",
      icon: "fa-file-circle-check",
    };
    setVaultDocs((prev) => [...prev, newDoc]);
    setNewCustomTitle("");
    setShowAddCustom(false);
    toast(`Added "${newDoc.category}" to your document folder. Upload file now!`, "✓");
  }

  function formatBytes(bytes) {
    if (!bytes || bytes === 0) return "";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
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
    const finalDegree = (degree === "Other Life Science Degree" || degree === "Other Non-Life Science Degree" || degree === "Other")
      ? customDegree.trim()
      : (degree || customDegree).trim();

    if (!finalDegree || finalDegree.length < 2) {
      setError("Please select or enter your Degree / Course Name.");
      toast("Degree / Course Name is required.", "!");
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

    if (!cgpa || String(cgpa).trim().length === 0) {
      setError("Please enter your CGPA or Percentage (e.g. 8.2 CGPA or 82%).");
      toast("CGPA / Percentage is required.", "!");
      setSaving(false);
      return;
    }

    // 6. Mandatory Document Vault Uploads Enforcement (12th & UG Certificates)
    const doc12th = vaultDocs.find((d) => d.id === "doc_12th");
    if (!doc12th || !doc12th.docUrl) {
      setError("12th / Intermediate Certificate is mandatory. Please upload it in Section 6 (Document Vault).");
      toast("12th / Intermediate Certificate is mandatory.", "!");
      setSaving(false);
      return;
    }

    const docUg = vaultDocs.find((d) => d.id === "doc_ug");
    if (!docUg || !docUg.docUrl) {
      setError("UG Course Degree / Provisional Certificate is mandatory. Please upload it in Section 6 (Document Vault).");
      toast("UG Course Degree / Provisional Certificate is mandatory.", "!");
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

        coreCompetencies,
        codeSets,
        softSkills,
        codingPlatforms,
        ehrSoftware: codingPlatforms,
        specializedKnowledge,

        workHistory: workHistory.filter((w) => w.title?.trim() || w.company?.trim()),

        educationStream,
        degree: finalDegree,
        collegeName: collegeName.trim(),
        graduationYear: graduationYear.trim(),
        cgpa: cgpa.trim(),
        percentage: cgpa.trim(),

        education: [
          ...(finalDegree || collegeName ? [{ degree: finalDegree, school: collegeName.trim(), year: graduationYear.trim(), cgpa: cgpa.trim(), stream: educationStream }] : []),
        ],
        skills: [codeSets, specializedKnowledge, codingPlatforms, coreCompetencies].filter(Boolean).join(", "),

        // 6. Candidate Document Vault
        documents: vaultDocs,
        documentVault: vaultDocs,
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
              Email ID <span style={{ color: "#EF4444" }}>*</span>
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
      </div>

      {/* 2. PROFESSIONAL SUMMARY / CAREER OBJECTIVE */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 10px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-align-left" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          {String(experience).toLowerCase() === "fresher"
            ? "2. Career Objective (For Freshers)"
            : "2. Professional Summary (2-3 Sentences Overview)"}
        </h4>
        <textarea
          rows={3}
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          placeholder={
            String(experience).toLowerCase() === "fresher"
              ? "Eg : To obtain a Medical Coder position where I can apply my knowledge of medical terminology, ICD-10-CM, CPT, and HCPCS to ensure accurate coding while growing my skills in the healthcare industry."
              : "Eg : Experienced Medical Coder skilled in accurate ICD-10-CM, CPT, and HCPCS coding with strong attention to detail, compliance, and documentation accuracy."
          }
          style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 13, lineHeight: 1.5 }}
        />
      </div>

      {/* 3. TECHNICAL & CODING SKILL SET */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-code-compare" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          3. Technical &amp; Coding Skill Set
        </h4>

        {/* 1st Field: Core Competencies */}
        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>Core Competencies</label>
          <input
            type="text"
            value={coreCompetencies}
            onChange={(e) => setCoreCompetencies(e.target.value)}
            placeholder="Eg : Anatomy & Physiology, Medical Terminology, CDI, Denial Resolution"
          />
        </div>

        {/* 2nd Field: Code Sets */}
        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>Code Sets</label>
          <input
            type="text"
            value={codeSets}
            onChange={(e) => setCodeSets(e.target.value)}
            placeholder="Eg : ICD-10-CM, CPT, HCPCS Level II, Coding Guidelines & Conventions"
          />
        </div>

        {/* 3rd Field: Soft Skills */}
        <div className="wiz-field" style={{ marginBottom: 12 }}>
          <label>Soft Skills</label>
          <input
            type="text"
            value={softSkills}
            onChange={(e) => setSoftSkills(e.target.value)}
            placeholder="Eg : Attention to Detail, Analytical & Critical Thinking, Accuracy & Quality Focus, Communication Skills, Time Management"
          />
        </div>

        {/* 4th Field: Live Coding Platforms (Optional) */}
        <div className="wiz-field">
          <label>Live Coding Platforms (Optional)</label>
          <input
            type="text"
            value={codingPlatforms}
            onChange={(e) => setCodingPlatforms(e.target.value)}
            placeholder="Eg : Codivia, 3M 360 Encompass, Optum EncoderPro, and other live coding platforms"
          />
        </div>
      </div>

      {/* 4. PROFESSIONAL EXPERIENCE / OTHER DOMAIN EXPERIENCE FOR FRESHERS */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
              <i className="fa-solid fa-briefcase" style={{ color: "var(--gold)", marginRight: 8 }}></i>
              {String(experience).toLowerCase() === "fresher"
                ? "4. Experience in Other Domain / Prior Work (Optional for Freshers)"
                : "4. Professional Experience & Metrics"}
            </h4>
            {String(experience).toLowerCase() === "fresher" && (
              <p style={{ margin: "4px 0 0", fontSize: 11.5, color: "#64748B" }}>
                Have prior work or internship experience in non-coding domains (BPO, Clinical/Nursing, IT, Sales, Admin)? Add it below.
              </p>
            )}
          </div>
          <button type="button" className="btn btn-outline" style={{ fontSize: 12, padding: "6px 14px" }} onClick={handleAddWorkHistory}>
            <i className="fa-solid fa-plus" style={{ marginRight: 4 }}></i>
            {String(experience).toLowerCase() === "fresher" ? "Add Other Domain Experience" : "Add Position"}
          </button>
        </div>

        {workHistory.length === 0 && (
          <div style={{ padding: "14px 16px", textAlign: "center", color: "#64748B", fontSize: 12.5, background: "#FFFFFF", borderRadius: 8, border: "1px dashed #CBD5E1" }}>
            {String(experience).toLowerCase() === "fresher"
              ? "No other domain experience added. As a fresher in Medical Coding / Healthcare RCM, this is completely optional. If you worked in another industry (BPO, Healthcare, Customer Care, IT, etc.), click '+ Add Other Domain Experience' above."
              : "No work experience added yet. Click '+ Add Position' above to add your employment history."}
          </div>
        )}

        {workHistory.map((item, idx) => (
          <div key={idx} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)" }}>
                {String(experience).toLowerCase() === "fresher" ? `Other Domain Position #${idx + 1}` : `Position #${idx + 1}`}
              </span>
              <button type="button" onClick={() => handleRemoveWorkHistory(idx)} style={{ background: "none", border: "none", color: "#DC2626", fontSize: 11, cursor: "pointer", fontWeight: 700 }}>
                ✕ Remove Position
              </button>
            </div>

            {String(experience).toLowerCase() === "fresher" ? (
              <>
                <div className="wiz-field-row" style={{ marginBottom: 8 }}>
                  <div className="wiz-field">
                    <label>Job Title / Role</label>
                    <input
                      type="text"
                      value={item.title || ""}
                      onChange={(e) => handleWorkHistoryChange(idx, "title", e.target.value)}
                      placeholder="e.g. Customer Support Executive, Staff Nurse, Data Entry Operator"
                    />
                  </div>
                  <div className="wiz-field">
                    <label>Company / Organization Name & Location</label>
                    <input
                      type="text"
                      value={item.company || ""}
                      onChange={(e) => handleWorkHistoryChange(idx, "company", e.target.value)}
                      placeholder="e.g. Infosys BPM, Apollo Clinic, Chennai"
                    />
                  </div>
                  <div className="wiz-field">
                    <label>Employment / Internship Dates</label>
                    <input
                      type="text"
                      value={item.dates || ""}
                      onChange={(e) => handleWorkHistoryChange(idx, "dates", e.target.value)}
                      placeholder="e.g. 2023 – 2024 (6 months)"
                    />
                  </div>
                </div>

                <div className="wiz-field-row" style={{ marginBottom: 8 }}>
                  <div className="wiz-field">
                    <label>Domain / Industry</label>
                    <input
                      type="text"
                      value={item.domain || item.workType || ""}
                      onChange={(e) => {
                        handleWorkHistoryChange(idx, "domain", e.target.value);
                        handleWorkHistoryChange(idx, "workType", e.target.value);
                      }}
                      placeholder="e.g. BPO / Non-Voice, Healthcare / Nursing, IT / Operations"
                    />
                  </div>
                  <div className="wiz-field">
                    <label>Transferable Skills & Highlights (Optional)</label>
                    <input
                      type="text"
                      value={item.metrics || ""}
                      onChange={(e) => handleWorkHistoryChange(idx, "metrics", e.target.value)}
                      placeholder="e.g. 99% accuracy in data processing, fast typing, client communication"
                    />
                  </div>
                </div>

                <div className="wiz-field">
                  <label>Key Responsibilities / Role Description</label>
                  <textarea
                    rows={2}
                    value={item.description || ""}
                    onChange={(e) => handleWorkHistoryChange(idx, "description", e.target.value)}
                    placeholder="Brief overview of duties performed, processes handled, and transferable skills..."
                    style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                  />
                </div>
              </>
            ) : (
              <>
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
              </>
            )}
          </div>
        ))}
      </div>

      {/* 5. EDUCATION & ACADEMIC DETAILS */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
          <i className="fa-solid fa-graduation-cap" style={{ color: "var(--gold)", marginRight: 8 }}></i>
          5. Education &amp; Academic Qualifications <span style={{ color: "#EF4444", fontSize: 12 }}>* (All fields mandatory)</span>
        </h4>

        {/* Stream Selector Pills */}
        <div className="wiz-field" style={{ marginBottom: 14 }}>
          <label>
            Academic Stream <span style={{ color: "#EF4444" }}>*</span>
          </label>
          <div className="wiz-pill-row">
            <button
              type="button"
              className={`wiz-pill wiz-pill-compact ${educationStream === "Life Science" ? "active" : ""}`}
              onClick={() => {
                setEducationStream("Life Science");
                if (NON_LIFE_SCIENCE_COURSES.includes(degree)) setDegree("");
              }}
            >
              <i className="fa-solid fa-dna" style={{ marginRight: 6 }}></i>
              Life Science (B.Sc., Pharmacy, Nursing, Allied Health)
            </button>
            <button
              type="button"
              className={`wiz-pill wiz-pill-compact ${educationStream === "Non-Life Science" ? "active" : ""}`}
              onClick={() => {
                setEducationStream("Non-Life Science");
                if (LIFE_SCIENCE_COURSES.includes(degree)) setDegree("");
              }}
            >
              <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }}></i>
              Non-Life Science (B.Com, B.Tech, BCA, BBA, Arts)
            </button>
          </div>
        </div>

        {/* Degree Dropdown & Custom Degree */}
        <div className="wiz-field-row" style={{ marginBottom: 12 }}>
          <div className="wiz-field">
            <label>
              Degree / Course Name <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <select
              value={degree}
              onChange={(e) => {
                setDegree(e.target.value);
                if (!e.target.value.startsWith("Other")) {
                  setCustomDegree("");
                }
              }}
              required
            >
              <option value="">-- Select Degree / Course --</option>
              {educationStream === "Life Science" ? (
                <optgroup label="Life Science Courses">
                  {LIFE_SCIENCE_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              ) : (
                <optgroup label="Non-Life Science Courses">
                  {NON_LIFE_SCIENCE_COURSES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {(degree.startsWith("Other") || (!LIFE_SCIENCE_COURSES.includes(degree) && !NON_LIFE_SCIENCE_COURSES.includes(degree) && degree !== "")) && (
            <div className="wiz-field">
              <label>
                Specify Degree / Specialization <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="text"
                required
                value={customDegree}
                onChange={(e) => setCustomDegree(e.target.value)}
                placeholder="e.g. M.Sc. Human Genetics / B.Sc. Clinical Nutrition"
              />
            </div>
          )}

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
        </div>

        <div className="wiz-field-row">
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
              placeholder="e.g. 2023"
            />
          </div>
          <div className="wiz-field">
            <label>
              CGPA / Percentage <span style={{ color: "#EF4444" }}>*</span>
            </label>
            <input
              type="text"
              required
              value={cgpa}
              onChange={(e) => setCgpa(e.target.value)}
              placeholder="e.g. 8.5 CGPA or 85%"
            />
          </div>
        </div>
      </div>

      {/* 6. CANDIDATE DOCUMENT VAULT (ACADEMIC, EDUCATIONAL & CERTIFICATIONS FOLDER) */}
      <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
          <h4 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy)" }}>
            <i className="fa-solid fa-folder-open" style={{ color: "var(--gold)", marginRight: 8 }}></i>
            6. Academic, Educational &amp; Certifications Document Vault
          </h4>
          <span
            style={{
              background: vaultDocs.filter((d) => Boolean(d.docUrl)).length >= 3 ? "#DCFCE7" : "#EFF6FF",
              color: vaultDocs.filter((d) => Boolean(d.docUrl)).length >= 3 ? "#15803D" : "#1D4ED8",
              border: `1px solid ${vaultDocs.filter((d) => Boolean(d.docUrl)).length >= 3 ? "#86EFAC" : "#BFDBFE"}`,
              fontSize: 11,
              fontWeight: 800,
              padding: "4px 12px",
              borderRadius: 999,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <i className="fa-solid fa-folder-tree"></i>
            {vaultDocs.filter((d) => Boolean(d.docUrl)).length} of {vaultDocs.length} Documents Uploaded
          </span>
        </div>

        <p style={{ margin: "0 0 14px 0", fontSize: 12, color: "#64748B", lineHeight: 1.5 }}>
          Collectively upload and organize all your educational marksheets, degree certificates, and professional certifications in one unified folder for 1-click recruiter verification.
        </p>

        <div style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 8, padding: "8px 12px", marginBottom: 16, fontSize: 11, color: "#475569", display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fa-solid fa-circle-info" style={{ color: "var(--gold)", fontSize: 13 }}></i>
          <span>
            Accepted formats: <strong>PDF, JPG, PNG, DOCX</strong> (Up to 10MB per document). Verified directly by Talentera audit specialists.
          </span>
        </div>

        {/* Document Cards Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(310px, 1fr))", gap: 12 }}>
          {vaultDocs.map((doc) => {
            const hasUploaded = Boolean(doc.docUrl);
            const isUploading = uploadingDocId === doc.id;

            return (
              <div
                key={doc.id}
                style={{
                  background: hasUploaded ? "#FFFFFF" : "#FFFFFF",
                  border: hasUploaded ? "1.5px solid #10B981" : doc.required ? "1.5px solid #FCD34D" : "1px solid #E2E8F0",
                  borderRadius: 10,
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  boxShadow: hasUploaded ? "0 2px 8px rgba(16, 185, 129, 0.08)" : "0 1px 3px rgba(0,0,0,0.04)",
                  transition: "all 0.2s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 6 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 8,
                          background: hasUploaded ? "#DCFCE7" : "#F1F5F9",
                          color: hasUploaded ? "#15803D" : "#64748B",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 14,
                          flexShrink: 0,
                        }}
                      >
                        <i className={`fa-solid ${doc.icon || "fa-file-lines"}`}></i>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: "#0F172A", lineHeight: 1.3 }}>
                          {doc.category}
                        </div>
                        {doc.subtitle && (
                          <div style={{ fontSize: 11, color: "#64748B", marginTop: 2 }}>
                            {doc.subtitle}
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      {hasUploaded ? (
                        <span style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                          ✓ Uploaded
                        </span>
                      ) : doc.required ? (
                        <span style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                          Required *
                        </span>
                      ) : (
                        <span style={{ background: "#F1F5F9", color: "#64748B", border: "1px solid #E2E8F0", fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>
                          Optional
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Upload Status / Actions */}
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid #F1F5F9" }}>
                  {hasUploaded ? (
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#0F172A", fontWeight: 600, marginBottom: 8, wordBreak: "break-all" }}>
                        <i className="fa-solid fa-file-pdf" style={{ color: "#EF4444" }}></i>
                        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {doc.docName || "Document Uploaded"}
                        </span>
                        {doc.fileSize ? (
                          <span style={{ fontSize: 10, color: "#64748B", fontWeight: 400 }}>
                            ({formatBytes(doc.fileSize)})
                          </span>
                        ) : null}
                      </div>

                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <a
                          href={doc.docUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-sm"
                          style={{
                            background: "#EFF6FF",
                            color: "#1D4ED8",
                            border: "1px solid #BFDBFE",
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: 6,
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square"></i> View / Download
                        </a>

                        <label
                          className="btn btn-sm"
                          style={{
                            background: "#F8FAFC",
                            color: "#475569",
                            border: "1px solid #CBD5E1",
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: 6,
                            cursor: isUploading ? "not-allowed" : "pointer",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            margin: 0,
                          }}
                        >
                          <i className={`fa-solid ${isUploading ? "fa-spinner fa-spin" : "fa-arrow-rotate-right"}`}></i>
                          {isUploading ? "Uploading..." : "Replace"}
                          <input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                            style={{ display: "none" }}
                            disabled={isUploading}
                            onChange={(e) => {
                              const f = e.target.files?.[0];
                              e.target.value = "";
                              if (f) handleVaultDocUpload(doc.id, f);
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={() => handleRemoveVaultDoc(doc.id)}
                          style={{
                            background: "transparent",
                            border: "none",
                            color: "#94A3B8",
                            cursor: "pointer",
                            padding: "4px 6px",
                            fontSize: 12,
                            marginLeft: "auto",
                          }}
                          title="Remove document"
                        >
                          <i className="fa-solid fa-trash-can" style={{ color: "#EF4444" }}></i>
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 8,
                          padding: "8px 12px",
                          background: doc.required ? "#FFFBEB" : "#F8FAFC",
                          border: doc.required ? "1px dashed #F59E0B" : "1px dashed #CBD5E1",
                          borderRadius: 6,
                          cursor: isUploading ? "not-allowed" : "pointer",
                          fontSize: 12,
                          fontWeight: 700,
                          color: doc.required ? "#B45309" : "#475569",
                          margin: 0,
                          transition: "all 0.15s ease",
                        }}
                      >
                        <i className={`fa-solid ${isUploading ? "fa-spinner fa-spin" : "fa-cloud-arrow-up"}`} style={{ fontSize: 13 }}></i>
                        <span>{isUploading ? "Uploading..." : `Upload ${doc.required ? "Document *" : "Document"}`}</span>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.webp,.docx"
                          style={{ display: "none" }}
                          disabled={isUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = "";
                            if (f) handleVaultDocUpload(doc.id, f);
                          }}
                        />
                      </label>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Other Relevant Document Section */}
        <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px dashed #CBD5E1" }}>
          {!showAddCustom ? (
            <button
              type="button"
              className="wiz-add-btn"
              onClick={() => setShowAddCustom(true)}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: "var(--navy)",
                background: "#F1F5F9",
                border: "1px dashed #94A3B8",
                padding: "8px 16px",
                borderRadius: 8,
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <i className="fa-solid fa-plus-circle" style={{ color: "var(--gold)" }}></i>
              + Add Other Relevant Certificate / Document
            </button>
          ) : (
            <div style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", borderRadius: 10, padding: 14 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", marginBottom: 6 }}>
                Add Custom Certificate / Relevant Document
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <input
                  type="text"
                  value={newCustomTitle}
                  onChange={(e) => setNewCustomTitle(e.target.value)}
                  placeholder="e.g. HIPAA Compliance / Prior Experience Letter / ICD-10 Specialty Certificate"
                  style={{
                    flex: 1,
                    minWidth: 260,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid #CBD5E1",
                    fontSize: 12,
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCustomDoc();
                    }
                  }}
                />
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleAddCustomDoc}
                  style={{ padding: "8px 16px", fontSize: 12, fontWeight: 700 }}
                >
                  <i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Add to Folder
                </button>
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={() => {
                    setShowAddCustom(false);
                    setNewCustomTitle("");
                  }}
                  style={{ padding: "8px 14px", fontSize: 12 }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" style={{ padding: "14px 28px", fontSize: 15 }} disabled={saving}>
          {saving ? "Saving Basic Info & Vault Documents…" : "Save & continue →"}
        </button>
      </div>
    </form>
  );
}
