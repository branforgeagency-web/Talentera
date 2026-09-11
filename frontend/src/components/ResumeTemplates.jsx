import React from "react";

export function TalenteraVerifiedBadge({ variant = 'card', isMonochrome = false }) {
  if (variant === 'compact') {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 5,
          fontSize: '11px',
          background: isMonochrome ? '#FFFFFF' : '#F8FAFC',
          border: isMonochrome ? '1.5px solid #000000' : '1.5px solid #0A1F3D',
          color: isMonochrome ? '#000000' : '#0A1F3D',
          padding: '3px 10px',
          borderRadius: 6,
          fontWeight: 800,
          letterSpacing: '0.02em',
          verticalAlign: 'middle',
        }}
      >
        <i className="fa-solid fa-circle-check" style={{ color: isMonochrome ? '#000000' : '#0A1F3D' }}></i>
        <span>Talentera Verified Candidate</span>
      </span>
    );
  }

  return (
    <div
      style={{
        background: isMonochrome ? '#FFFFFF' : '#F8FAFC',
        border: isMonochrome ? '2px solid #000000' : '2px solid #0A1F3D',
        borderRadius: 10,
        padding: '8px 14px',
        display: 'inline-flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: isMonochrome ? '#000000' : '#0A1F3D', fontWeight: 900, fontSize: 11.5, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
        <i className="fa-solid fa-shield-halved" style={{ color: isMonochrome ? '#000000' : '#0A1F3D', fontSize: 13 }}></i>
        <span>TALENTERA VERIFIED</span>
      </div>
      <div style={{ fontSize: 10, fontWeight: 700, color: isMonochrome ? '#374151' : '#64748B', marginTop: 2 }}>
        Official Credential Profile
      </div>
    </div>
  );
}

export function VerifiedBadge({ text = 'Verified' }) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: '0.7rem',
        background: '#F8FAFC',
        border: '1px solid #0A1F3D',
        color: '#0A1F3D',
        padding: '2px 8px',
        borderRadius: 999,
        fontWeight: 700,
        marginLeft: 6,
        verticalAlign: 'middle',
      }}
    >
      <i className="fa-solid fa-circle-check" style={{ color: '#0A1F3D' }}></i> {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared Declaration Component (Appears at the very bottom of resumes)
// ---------------------------------------------------------------------------
export function DeclarationSection({ d, accentColor = "#0A1F3D", isMonochrome = false }) {
  const textColor = isMonochrome ? "#000000" : accentColor;
  const bodyColor = isMonochrome ? "#374151" : "#334155";
  const borderColor = isMonochrome ? "#000000" : "#E2E8F0";

  return (
    <div style={{ marginTop: 24, paddingTop: 14, borderTop: "1.5px solid " + borderColor }}>
      <h3 style={{ fontSize: 12.5, fontWeight: 800, color: textColor, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>
        Declaration
      </h3>
      <p style={{ fontSize: 11.5, lineHeight: 1.6, color: bodyColor, margin: "0 0 12px", fontStyle: "italic" }}>
        "{d.declarationText}"
      </p>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 12, fontSize: 11.5 }}>
        <div style={{ color: bodyColor }}>
          <div><strong>Place:</strong> {d.declarationPlace}</div>
          <div style={{ marginTop: 2 }}><strong>Date:</strong> {d.declarationDate}</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontWeight: 800, color: isMonochrome ? "#000000" : "#0A1F3D", fontSize: 12 }}>
            {d.fullName}
          </div>
          <div style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Candidate Signature
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Education Section Component (College / Degree, Class 12th, Class 10th)
// ---------------------------------------------------------------------------
export function EducationSection({ d, accentColor = "#0A1F3D", isMonochrome = false }) {
  const textColor = isMonochrome ? "#000000" : accentColor;
  const borderColor = isMonochrome ? "#000000" : "#E2E8F0";

  return (
    <div style={{ marginBottom: 20 }}>
      <h3 style={{ fontSize: 13, fontWeight: 800, color: textColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid " + borderColor, paddingBottom: 6, marginBottom: 10 }}>
        Education &amp; Academic Background
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 12 }}>
        {/* Graduation / College */}
        {d.degree && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", background: isMonochrome ? "#FFFFFF" : "#F8FAFC", border: "1px solid " + (isMonochrome ? "#D1D5DB" : "#E2E8F0"), borderRadius: 6, padding: "8px 12px" }}>
            <div>
              <strong style={{ fontSize: 12.5, color: isMonochrome ? "#000000" : "#0F172A" }}>{d.degree}</strong>
              <div style={{ color: isMonochrome ? "#374151" : "#64748B", marginTop: 1 }}>{d.collegeName}</div>
            </div>
            <div style={{ textAlign: "right", color: isMonochrome ? "#374151" : "#475569" }}>
              <span style={{ fontWeight: 700 }}>{d.graduationYear}</span>
              {d.cgpa ? <div style={{ fontSize: 11, fontWeight: 600 }}>CGPA: {d.cgpa}</div> : null}
            </div>
          </div>
        )}

        {/* Class 12th / Intermediate */}
        {(d.twelfthSchool || d.twelfthBoard || d.twelfthYear) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", background: isMonochrome ? "#FFFFFF" : "#F8FAFC", border: "1px solid " + (isMonochrome ? "#D1D5DB" : "#E2E8F0"), borderRadius: 6, padding: "8px 12px" }}>
            <div>
              <strong style={{ fontSize: 12, color: isMonochrome ? "#000000" : "#0F172A" }}>Class XII (Higher Secondary / Intermediate)</strong>
              <div style={{ color: isMonochrome ? "#374151" : "#64748B", marginTop: 1 }}>
                {d.twelfthSchool}{d.twelfthBoard ? " • " + d.twelfthBoard : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", color: isMonochrome ? "#374151" : "#475569" }}>
              {d.twelfthYear ? <span style={{ fontWeight: 700 }}>{d.twelfthYear}</span> : null}
              {d.twelfthPercentage ? <div style={{ fontSize: 11, fontWeight: 600 }}>Score: {d.twelfthPercentage}</div> : null}
            </div>
          </div>
        )}

        {/* Class 10th / Secondary School */}
        {(d.tenthSchool || d.tenthBoard || d.tenthYear) && (
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", background: isMonochrome ? "#FFFFFF" : "#F8FAFC", border: "1px solid " + (isMonochrome ? "#D1D5DB" : "#E2E8F0"), borderRadius: 6, padding: "8px 12px" }}>
            <div>
              <strong style={{ fontSize: 12, color: isMonochrome ? "#000000" : "#0F172A" }}>Class X (Secondary School / SSLC)</strong>
              <div style={{ color: isMonochrome ? "#374151" : "#64748B", marginTop: 1 }}>
                {d.tenthSchool}{d.tenthBoard ? " • " + d.tenthBoard : ""}
              </div>
            </div>
            <div style={{ textAlign: "right", color: isMonochrome ? "#374151" : "#475569" }}>
              {d.tenthYear ? <span style={{ fontWeight: 700 }}>{d.tenthYear}</span> : null}
              {d.tenthPercentage ? <div style={{ fontSize: 11, fontWeight: 600 }}>Score: {d.tenthPercentage}</div> : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Shared Data Extractor
// ---------------------------------------------------------------------------
export function extractResumeData(data = {}) {
  const manual = data.manualResume || {};
  const {
    basicInfo = {},
    training = {},
    certification = {},
    score = 90,
    badgeTier = "Gold Verified",
    manualWorkHistory = [],
  } = data;

  const cid = data.id || data._id || "VERIFIED-CANDIDATE";
  const publicUrl = typeof window !== "undefined" ? `${window.location.origin}/verify/${cid}` : `/verify/${cid}`;

  const fullName = manual.fullName || basicInfo.fullName || "Candidate Name";
  const email = manual.email || basicInfo.email || data.email || "candidate@talentera.com";
  const mobile = manual.mobile || basicInfo.mobile || "+91 98765 43210";
  const location = manual.location || `${basicInfo.city || "Bengaluru"}, ${basicInfo.state || "Karnataka"}${basicInfo.country ? `, ${basicInfo.country}` : ""}`;
  const linkedin = manual.linkedin || basicInfo.linkedin || "linkedin.com/in/medical-coder";
  const maskedAadhaar = manual.maskedAadhaar || basicInfo.maskedAadhaar || "";
  const currentRole = manual.currentRole || basicInfo.currentRole || "Medical Coding Professional";
  const experience = manual.experience || basicInfo.experience || "Experienced";
  const isFresher = String(experience).toLowerCase() === "fresher" || String(experience).toLowerCase().includes("fresher");
  const summaryTitle = isFresher ? "Career Objective" : "Professional Summary";

  const certName = manual.certName || certification.certName || certification.certificationName || certification.certCode || "CPC (Certified Professional Coder)";
  const issuingBody = manual.issuingBody || certification.issuingBody || certification.bodyName || "AAPC";
  const memberId = manual.memberId || certification.memberId || certification.certId || "AAPC-987654";
  const issueDate = manual.issueDate || certification.issueDate || "2021";
  const certDocName = manual.certDocName || certification.docName || "";

  const academyName = manual.academyName || training.academyName || "ThoughtFlows Medical Coding Academy";
  const courseName = manual.courseName || training.courseName || `${training.domain || "Medical Coding"} - ${training.specialty || "HCC"}`;
  const trainingDuration = manual.trainingDuration || training.duration || "6 months";
  const trainerName = manual.trainerName || training.trainerName || "";

  const defaultSummary = isFresher
    ? "To obtain a Medical Coder position where I can apply my knowledge of medical terminology, ICD-10-CM, CPT, and HCPCS to ensure accurate coding while growing my skills in the healthcare industry."
    : "Experienced Medical Coder skilled in accurate ICD-10-CM, CPT, and HCPCS coding with strong attention to detail, compliance, and documentation accuracy.";

  const summary = manual.summary !== undefined && manual.summary !== ""
    ? manual.summary
    : (basicInfo.summary || defaultSummary);

  const coreCompetencies = manual.coreCompetencies || basicInfo.coreCompetencies || "Anatomy & Physiology, Medical Terminology, Clinical Documentation Improvement (CDI), Denial & Audit Appeals Resolution";
  const codeSets = manual.codeSets || basicInfo.codeSets || "ICD-10-CM, CPT, HCPCS Level II, Coding Guidelines & Conventions";
  const softSkills = manual.softSkills || basicInfo.softSkills || "Attention to Detail, Analytical & Critical Thinking, Accuracy & Quality Focus, Communication Skills, Time Management";
  const codingPlatforms = manual.codingPlatforms || basicInfo.codingPlatforms || manual.ehrSoftware || basicInfo.ehrSoftware || "Codivia, 3M 360 Encompass, Optum EncoderPro";
  const specializedKnowledge = manual.specializedKnowledge || basicInfo.specializedKnowledge || "E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA Compliance, Medical Necessity, DRG Assignment, HCC Risk Adjustment";
  const ehrSoftware = codingPlatforms;

  const workHistoryList = (manual.workHistory && Array.isArray(manual.workHistory) && manual.workHistory.length > 0)
    ? manual.workHistory
    : (manualWorkHistory && manualWorkHistory.length > 0
        ? manualWorkHistory
        : (basicInfo.workHistory || [
            {
              title: "Senior Medical Coder II",
              company: "ThoughtFlows Healthcare RCM Ltd",
              location: "Bengaluru (Remote)",
              dates: "2022 – Present",
              workType: "Outpatient / ED Coding",
              metrics: "Maintained 98.4% accuracy on 65+ outpatient charts daily",
              description: "Coded complex ED and Surgery charts using ICD-10-CM and CPT modifiers. Queried physicians to resolve clinical documentation ambiguities, identified unbundled codes, and resolved CO-197 pre-authorization denials.",
            },
          ]));

  const collegeName = manual.collegeName || basicInfo.collegeName || "Bangalore University / Life Sciences Institute";
  const degree = manual.degree || basicInfo.degree || "B.Sc. Life Sciences / Healthcare Information Management";
  const graduationYear = manual.graduationYear || basicInfo.graduationYear || "2021";
  const cgpa = manual.cgpa || basicInfo.cgpa || manual.percentage || basicInfo.percentage || "8.4 CGPA";

  const schoolName = manual.schoolName || basicInfo.schoolName || "St. Joseph's Higher Secondary School";
  const schoolBoard = manual.schoolBoard || basicInfo.schoolBoard || "CBSE Board";
  const schoolYear = manual.schoolYear || basicInfo.schoolYear || "2018";

  const twelfthSchool = manual.twelfthSchool || basicInfo.twelfthSchool || schoolName || "St. Joseph's Higher Secondary School";
  const twelfthBoard = manual.twelfthBoard || basicInfo.twelfthBoard || schoolBoard || "CBSE Board";
  const twelfthYear = manual.twelfthYear || basicInfo.twelfthYear || schoolYear || "2018";
  const twelfthPercentage = manual.twelfthPercentage || basicInfo.twelfthPercentage || "86%";

  const tenthSchool = manual.tenthSchool || basicInfo.tenthSchool || "St. Mary's High School";
  const tenthBoard = manual.tenthBoard || basicInfo.tenthBoard || "State Board";
  const tenthYear = manual.tenthYear || basicInfo.tenthYear || "2016";
  const tenthPercentage = manual.tenthPercentage || basicInfo.tenthPercentage || "90%";

  const declarationText = manual.declarationText || "I hereby declare that all the statements and information provided in this resume are true, complete, and correct to the best of my knowledge and belief.";
  const declarationPlace = manual.declarationPlace || basicInfo.city || "Bengaluru";
  const declarationDate = manual.declarationDate || new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

  return {
    fullName,
    email,
    mobile,
    location,
    linkedin,
    maskedAadhaar,
    currentRole,
    experience,
    isFresher,
    summaryTitle,
    certName,
    issuingBody,
    memberId,
    issueDate,
    certDocName,
    academyName,
    courseName,
    trainingDuration,
    trainerName,
    summary,
    coreCompetencies,
    codeSets,
    softSkills,
    codingPlatforms,
    specializedKnowledge,
    ehrSoftware,
    workHistoryList,
    collegeName,
    degree,
    graduationYear,
    cgpa,
    schoolName,
    schoolBoard,
    schoolYear,
    twelfthSchool,
    twelfthBoard,
    twelfthYear,
    twelfthPercentage,
    tenthSchool,
    tenthBoard,
    tenthYear,
    tenthPercentage,
    declarationText,
    declarationPlace,
    declarationDate,
    score,
    badgeTier,
    publicUrl,
  };
}

// ---------------------------------------------------------------------------
// 1. EXECUTIVE GOLD TEMPLATE
// ---------------------------------------------------------------------------
export function ExecutiveTemplate({ data, accentColor = "#0A1F3D" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Manrope', sans-serif", padding: 36, background: "#fff", color: "#1E293B", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 900, color: accentColor, margin: 0, letterSpacing: "-0.02em" }}>
            {d.fullName}
          </h1>
          <p style={{ margin: "4px 0 0", color: "#64748B", fontWeight: 700, fontSize: 14 }}>
            {d.currentRole} • {d.experience} • {d.location}
          </p>
          <div style={{ fontSize: 11.5, color: "#475569", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span>📞 {d.mobile}</span>
            <span>✉️ {d.email}</span>
            <span>🔗 {d.linkedin}</span>
          </div>
        </div>

        <TalenteraVerifiedBadge />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
          {d.summaryTitle}
        </h3>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>
          {d.summary}
        </p>
      </div>

      {/* Verified Credentials */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
          <h3 style={{ fontSize: 12.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px" }}>
            AAPC / AHIMA Certification
          </h3>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{d.certName}</div>
          <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
            Issuing Body: <strong>{d.issuingBody}</strong> • Member ID: <strong>{d.memberId}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#15803D", fontWeight: 700, marginTop: 4 }}>
            ✓ Verified Active Credential ({d.issueDate})
          </div>
        </div>

        <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 14 }}>
          <h3 style={{ fontSize: 12.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 6px" }}>
            Specialty Academy Training
          </h3>
          <div style={{ fontSize: 13, fontWeight: 800, color: "#0F172A" }}>{d.academyName}</div>
          <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
            Course: <strong>{d.courseName}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
            Duration: {d.trainingDuration} {d.trainerName ? `• Lead: ${d.trainerName}` : ""}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 10 }}>
          Skills &amp; Technical Competencies
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
          <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 2, fontSize: 11 }}>CODE SETS &amp; CLASSIFICATION</strong>
            <span style={{ color: "#334155" }}>{d.codeSets}</span>
          </div>
          <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 2, fontSize: 11 }}>SPECIALIZED CLINICAL KNOWLEDGE</strong>
            <span style={{ color: "#334155" }}>{d.specializedKnowledge}</span>
          </div>
          <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 2, fontSize: 11 }}>EHR &amp; CODING PLATFORMS</strong>
            <span style={{ color: "#334155" }}>{d.ehrSoftware}</span>
          </div>
          <div style={{ background: "#F8FAFC", padding: 10, borderRadius: 6, border: "1px solid #E2E8F0" }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 2, fontSize: 11 }}>CORE COMPETENCIES</strong>
            <span style={{ color: "#334155" }}>{d.coreCompetencies}</span>
          </div>
        </div>
      </div>

      {/* Work History */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
          Professional Experience
        </h3>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 14, borderLeft: `3px solid ${accentColor}`, paddingLeft: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 13.5, color: "#0F172A" }}>{w.title}</strong>
              <span style={{ fontSize: 11.5, color: "#64748B", fontWeight: 700 }}>{w.dates}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, margin: "2px 0" }}>
              {w.company} {w.location ? `• ${w.location}` : ""}
            </div>
            {w.metrics && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "2px 6px", borderRadius: 4, display: "inline-block", marginBottom: 4 }}>
                {w.metrics}
              </div>
            )}
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#334155", margin: 0 }}>{w.description}</p>
          </div>
        ))}
      </div>

      {/* Education */}
      <EducationSection d={d} accentColor={accentColor} />

      {/* Declaration */}
      <DeclarationSection d={d} accentColor={accentColor} />

      {/* Audit Stamp */}
      <div style={{ marginTop: 20, background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>TALENTERA VERIFIED CREDENTIAL RESUME</div>
          <div style={{ fontSize: 10.5, color: "#64748B" }}>Audit trail: {d.publicUrl}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "3px 8px", borderRadius: 999 }}>
          <i className="fa-solid fa-shield-halved"></i> Proctored Audit Verified
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. MODERN SIDEBAR TEMPLATE
// ---------------------------------------------------------------------------
export function ModernTemplate({ data, accentColor = "#0A1F3D" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ display: "grid", gridTemplateColumns: "240px 1fr", borderRadius: 12, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.06)", minHeight: 800 }}>
      {/* Left Sidebar */}
      <div style={{ background: accentColor, color: "#FFFFFF", padding: "32px 20px" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#F5B41A", color: accentColor, fontSize: 24, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
          {d.fullName.charAt(0)}
        </div>

        <h2 style={{ fontSize: 20, fontWeight: 900, margin: 0, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
          {d.fullName}
        </h2>
        <div style={{ fontSize: 12, color: "#FDE68A", fontWeight: 700, marginTop: 4 }}>
          {d.currentRole}
        </div>

        <div style={{ marginTop: 16 }}>
          <TalenteraVerifiedBadge variant="compact" />
        </div>

        <div style={{ marginTop: 24, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16, fontSize: 11.5 }}>
          <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em", color: "#F5B41A", marginBottom: 8 }}>Contact</div>
          <div style={{ color: "#E2E8F0", marginBottom: 4 }}>📞 {d.mobile}</div>
          <div style={{ color: "#E2E8F0", marginBottom: 4, wordBreak: "break-word" }}>✉️ {d.email}</div>
          <div style={{ color: "#E2E8F0", marginBottom: 4 }}>📍 {d.location}</div>
          <div style={{ color: "#E2E8F0", wordBreak: "break-word" }}>🔗 {d.linkedin}</div>
        </div>

        <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
          <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em", color: "#F5B41A", marginBottom: 8 }}>Code Sets</div>
          <p style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.45, margin: 0 }}>{d.codeSets}</p>
        </div>

        <div style={{ marginTop: 20, borderTop: "1px solid rgba(255,255,255,0.15)", paddingTop: 16 }}>
          <div style={{ fontWeight: 800, textTransform: "uppercase", fontSize: 10.5, letterSpacing: "0.08em", color: "#F5B41A", marginBottom: 8 }}>Health IT &amp; EHR</div>
          <p style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.45, margin: 0 }}>{d.ehrSoftware}</p>
        </div>
      </div>

      {/* Main Column */}
      <div style={{ padding: "32px 36px" }}>
        {/* Summary */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            {d.summaryTitle}
          </h3>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
        </div>

        {/* Certifications */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            Verified Credentials &amp; Training
          </h3>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", marginBottom: 8, fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>{d.certName}</strong>
            <div style={{ color: "#475569", marginTop: 2 }}>{d.issuingBody} • Member: {d.memberId} ({d.issueDate})</div>
          </div>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>{d.academyName}</strong>
            <div style={{ color: "#475569", marginTop: 2 }}>{d.courseName} • Duration: {d.trainingDuration}</div>
          </div>
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 10 }}>
            Work Experience
          </h3>
          {d.workHistoryList.map((w, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, color: "#0F172A" }}>
                <span>{w.title}</span>
                <span style={{ color: "#64748B", fontSize: 11.5 }}>{w.dates}</span>
              </div>
              <div style={{ fontSize: 11.5, color: accentColor, fontWeight: 700 }}>{w.company}</div>
              <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0", lineHeight: 1.5 }}>{w.description}</p>
            </div>
          ))}
        </div>

        {/* Education */}
        <EducationSection d={d} accentColor={accentColor} />

        {/* Declaration */}
        <DeclarationSection d={d} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. CLASSIC CORPORATE TEMPLATE
// ---------------------------------------------------------------------------
export function ClassicTemplate({ data, accentColor = "#1E293B" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Georgia', 'Cambria', serif", padding: "40px 48px", background: "#FFFFFF", color: "#1E293B", borderRadius: 12 }}>
      {/* Centered Header */}
      <div style={{ textAlign: "center", borderBottom: `2px solid ${accentColor}`, paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: "normal", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0, color: accentColor }}>
          {d.fullName}
        </h1>
        <div style={{ fontSize: 13, color: "#475569", margin: "6px 0", fontStyle: "italic" }}>
          {d.currentRole} • {d.location}
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap", alignItems: "center" }}>
          <span>{d.mobile}</span>
          <span>•</span>
          <span>{d.email}</span>
          <span>•</span>
          <span>{d.linkedin}</span>
          <span>•</span>
          <TalenteraVerifiedBadge variant="compact" />
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
          {d.summaryTitle}
        </h3>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0, textAlign: "justify" }}>{d.summary}</p>
      </div>

      {/* Certifications & Training */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
            Certifications
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong>{d.certName}</strong>
            <div style={{ color: "#475569" }}>{d.issuingBody} • {d.memberId} ({d.issueDate})</div>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
            Academy Training
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong>{d.academyName}</strong>
            <div style={{ color: "#475569" }}>{d.courseName} ({d.trainingDuration})</div>
          </div>
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
          Technical Qualifications &amp; Systems
        </h3>
        <div style={{ fontSize: 12, lineHeight: 1.7, color: "#334155" }}>
          <div><strong>Coding Standards:</strong> {d.codeSets}</div>
          <div><strong>Specialized Knowledge:</strong> {d.specializedKnowledge}</div>
          <div><strong>Health IT Software:</strong> {d.ehrSoftware}</div>
        </div>
      </div>

      {/* Experience */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 12 }}>
          Experience
        </h3>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <strong>{w.title} — {w.company}</strong>
              <span style={{ color: "#64748B", fontStyle: "italic", fontSize: 12 }}>{w.dates}</span>
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#334155", margin: "4px 0 0" }}>{w.description}</p>
          </div>
        ))}
      </div>

      {/* Education */}
      <EducationSection d={d} accentColor={accentColor} />

      {/* Declaration */}
      <DeclarationSection d={d} accentColor={accentColor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. MINIMAL COMPACT TEMPLATE
// ---------------------------------------------------------------------------
export function MinimalTemplate({ data, accentColor = "#0F172A" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Inter', -apple-system, sans-serif", padding: 32, background: "#FFFFFF", color: "#334155", borderRadius: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: accentColor, margin: 0, letterSpacing: "-0.02em" }}>
            {d.fullName}
          </h1>
          <div style={{ fontSize: 13, fontWeight: 600, color: "#64748B", marginTop: 2 }}>
            {d.currentRole} • {d.location}
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 11.5, color: "#64748B", lineHeight: 1.5 }}>
          <div>{d.email}</div>
          <div>{d.mobile}</div>
          <div style={{ marginTop: 4 }}><TalenteraVerifiedBadge variant="compact" /></div>
        </div>
      </div>

      <div style={{ height: 1, background: "#E2E8F0", marginBottom: 18 }}></div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 24 }}>
        {/* Left column */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Certifications
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>
              <strong>{d.certName}</strong>
              <div style={{ color: "#64748B" }}>{d.issuingBody} ({d.issueDate})</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Training
            </div>
            <div style={{ fontSize: 11.5, lineHeight: 1.4 }}>
              <strong>{d.academyName}</strong>
              <div style={{ color: "#64748B" }}>{d.courseName}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Code Sets
            </div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{d.codeSets}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Software
            </div>
            <div style={{ fontSize: 11, color: "#475569", lineHeight: 1.5 }}>{d.ehrSoftware}</div>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              {d.summaryTitle}
            </div>
            <p style={{ fontSize: 12, lineHeight: 1.55, margin: 0, color: "#475569" }}>{d.summary}</p>
          </div>

          <div style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
              Experience
            </div>
            {d.workHistoryList.map((w, idx) => (
              <div key={idx} style={{ marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>
                  <span>{w.title} — {w.company}</span>
                  <span style={{ color: "#94A3B8", fontSize: 11 }}>{w.dates}</span>
                </div>
                <p style={{ fontSize: 11.5, color: "#475569", margin: "3px 0 0", lineHeight: 1.45 }}>{w.description}</p>
              </div>
            ))}
          </div>

          <EducationSection d={d} accentColor={accentColor} />
        </div>
      </div>

      <DeclarationSection d={d} accentColor={accentColor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CREATIVE SPLIT TEMPLATE
// ---------------------------------------------------------------------------
export function CreativeTemplate({ data, accentColor = "#6366F1" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", borderRadius: 14, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 8px 30px rgba(0,0,0,0.06)" }}>
      {/* Header Banner */}
      <div style={{ background: `linear-gradient(135deg, ${accentColor} 0%, #0A1F3D 100%)`, padding: "32px 36px", color: "#FFFFFF" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
          <div>
            <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
              VERIFIED TALENTERA PROFILE
            </span>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: "8px 0 4px", color: "#FFFFFF" }}>{d.fullName}</h1>
            <div style={{ fontSize: 14, color: "#FDE68A", fontWeight: 700 }}>{d.currentRole}</div>
          </div>
          <div>
            <TalenteraVerifiedBadge />
          </div>
        </div>
      </div>

      <div style={{ padding: "28px 36px" }}>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#475569", marginBottom: 24 }}>{d.summary}</p>

        {/* Credentials Row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div style={{ background: "#F8FAFC", borderLeft: `4px solid ${accentColor}`, padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Certification</div>
            <strong style={{ fontSize: 13, color: "#0F172A" }}>{d.certName}</strong>
            <div style={{ fontSize: 11.5, color: "#64748B" }}>{d.issuingBody} • Member: {d.memberId}</div>
          </div>
          <div style={{ background: "#F8FAFC", borderLeft: "4px solid #F5B41A", padding: 14, borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", textTransform: "uppercase" }}>Academy Training</div>
            <strong style={{ fontSize: 13, color: "#0F172A" }}>{d.academyName}</strong>
            <div style={{ fontSize: 11.5, color: "#64748B" }}>{d.courseName} • {d.trainingDuration}</div>
          </div>
        </div>

        {/* Timeline Experience */}
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", marginBottom: 12 }}>Experience Journey</h3>
          {d.workHistoryList.map((w, idx) => (
            <div key={idx} style={{ position: "relative", paddingLeft: 22, borderLeft: `2px solid #E2E8F0`, paddingBottom: 14 }}>
              <span style={{ position: "absolute", left: -6, top: 4, width: 10, height: 10, borderRadius: "50%", background: accentColor }}></span>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
                <span>{w.title} — {w.company}</span>
                <span style={{ fontSize: 11, color: "#64748B" }}>{w.dates}</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0" }}>{w.description}</p>
            </div>
          ))}
        </div>

        {/* Education & Skills */}
        <EducationSection d={d} accentColor={accentColor} />

        <div style={{ marginTop: 16 }}>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, textTransform: "uppercase", marginBottom: 8 }}>Code Sets</h3>
          <div style={{ fontSize: 12, color: "#475569" }}>{d.codeSets}</div>
        </div>

        <DeclarationSection d={d} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. NORDIC CLEAN TEMPLATE
// ---------------------------------------------------------------------------
export function NordicTemplate({ data, accentColor = "#0284C7" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: 36, background: "#F8FAFC", color: "#0F172A", borderRadius: 16 }}>
      <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#0F172A" }}>{d.fullName}</h1>
            <div style={{ fontSize: 13, color: accentColor, fontWeight: 700, marginTop: 4 }}>{d.currentRole}</div>
          </div>
          <TalenteraVerifiedBadge />
        </div>
        <div style={{ display: "flex", gap: 14, marginTop: 14, fontSize: 11.5, color: "#64748B", flexWrap: "wrap" }}>
          <span>📍 {d.location}</span>
          <span>✉️ {d.email}</span>
          <span>📞 {d.mobile}</span>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 8px" }}>
          {d.summaryTitle}
        </h3>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: accentColor, textTransform: "uppercase" }}>Certification</div>
          <strong style={{ fontSize: 13, color: "#0F172A", display: "block", marginTop: 4 }}>{d.certName}</strong>
          <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>{d.issuingBody} ({d.issueDate})</div>
        </div>
        <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: accentColor, textTransform: "uppercase" }}>Academy Training</div>
          <strong style={{ fontSize: 13, color: "#0F172A", display: "block", marginTop: 4 }}>{d.academyName}</strong>
          <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>{d.courseName}</div>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", marginBottom: 20 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.06em", margin: "0 0 14px" }}>
          Experience
        </h3>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700 }}>
              <span>{w.title}</span>
              <span style={{ fontSize: 11.5, color: "#64748B" }}>{w.dates}</span>
            </div>
            <div style={{ fontSize: 11.5, color: accentColor, fontWeight: 600 }}>{w.company}</div>
            <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0" }}>{w.description}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
        <EducationSection d={d} accentColor={accentColor} />
        <DeclarationSection d={d} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. TWO-COLUMN PRO TEMPLATE
// ---------------------------------------------------------------------------
export function TwoColumnTemplate({ data, accentColor = "#0F766E" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: 32, background: "#FFFFFF", color: "#1E293B", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ borderBottom: `2px solid ${accentColor}`, paddingBottom: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 900, color: accentColor, margin: 0 }}>{d.fullName}</h1>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#64748B", marginTop: 2 }}>{d.currentRole} • {d.location}</div>
        </div>
        <TalenteraVerifiedBadge />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 24 }}>
        {/* Left Col */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Contact</h4>
            <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.6, marginTop: 6 }}>
              <div>📞 {d.mobile}</div>
              <div>✉️ {d.email}</div>
              <div>🔗 {d.linkedin}</div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Credentials</h4>
            <div style={{ fontSize: 11.5, marginTop: 6 }}>
              <strong style={{ color: "#0F172A" }}>{d.certName}</strong>
              <div style={{ color: "#64748B" }}>{d.issuingBody} ({d.issueDate})</div>
            </div>
            <div style={{ fontSize: 11.5, marginTop: 8 }}>
              <strong style={{ color: "#0F172A" }}>{d.academyName}</strong>
              <div style={{ color: "#64748B" }}>{d.courseName}</div>
            </div>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Code Sets</h4>
            <p style={{ fontSize: 11.5, color: "#475569", margin: "6px 0 0" }}>{d.codeSets}</p>
          </div>

          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Software</h4>
            <p style={{ fontSize: 11.5, color: "#475569", margin: "6px 0 0" }}>{d.ehrSoftware}</p>
          </div>
        </div>

        {/* Right Col */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>{d.summaryTitle}</h4>
            <p style={{ fontSize: 12, lineHeight: 1.55, color: "#334155", margin: "6px 0 0" }}>{d.summary}</p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Experience</h4>
            {d.workHistoryList.map((w, idx) => (
              <div key={idx} style={{ marginTop: 8 }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: "#0F172A" }}>{w.title} — {w.company}</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{w.dates}</div>
                <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0" }}>{w.description}</p>
              </div>
            ))}
          </div>

          <EducationSection d={d} accentColor={accentColor} />
        </div>
      </div>

      <DeclarationSection d={d} accentColor={accentColor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. TECH MONOSPACE TEMPLATE
// ---------------------------------------------------------------------------
export function TechTemplate({ data, accentColor = "#1E293B" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Fira Code', monospace", padding: 32, background: "#0F172A", color: "#E2E8F0", borderRadius: 12 }}>
      <div style={{ borderBottom: "1px solid #334155", paddingBottom: 16, marginBottom: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div style={{ fontSize: 11, color: "#38BDF8" }}>// TALENTERA VERIFIED PROFILE</div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: "#F8FAFC", margin: "4px 0" }}>{d.fullName}</h1>
          <div style={{ fontSize: 12, color: "#94A3B8" }}>role: "{d.currentRole}" | exp: "{d.experience}"</div>
        </div>
        <TalenteraVerifiedBadge />
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ cat summary.txt</div>
        <p style={{ fontSize: 11.5, lineHeight: 1.6, color: "#CBD5E1", margin: "6px 0 0" }}>{d.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
        <div style={{ background: "#1E293B", padding: 12, borderRadius: 6, border: "1px solid #334155" }}>
          <div style={{ fontSize: 10.5, color: "#38BDF8" }}>$ check-cert</div>
          <div style={{ fontSize: 12, color: "#F8FAFC", fontWeight: "bold", marginTop: 2 }}>{d.certName}</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>{d.issuingBody} ({d.issueDate})</div>
        </div>
        <div style={{ background: "#1E293B", padding: 12, borderRadius: 6, border: "1px solid #334155" }}>
          <div style={{ fontSize: 10.5, color: "#38BDF8" }}>$ check-academy</div>
          <div style={{ fontSize: 12, color: "#F8FAFC", fontWeight: "bold", marginTop: 2 }}>{d.academyName}</div>
          <div style={{ fontSize: 11, color: "#94A3B8" }}>{d.courseName}</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ git log --experience</div>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginTop: 8, paddingLeft: 10, borderLeft: "2px solid #38BDF8" }}>
            <div style={{ fontSize: 12, color: "#F8FAFC", fontWeight: "bold" }}>{w.title} @ {w.company}</div>
            <div style={{ fontSize: 10.5, color: "#94A3B8" }}>[{w.dates}]</div>
            <p style={{ fontSize: 11, color: "#CBD5E1", margin: "2px 0 0" }}>{w.description}</p>
          </div>
        ))}
      </div>

      <EducationSection d={d} accentColor="#38BDF8" />
      <DeclarationSection d={d} accentColor="#38BDF8" />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. ELEGANT SERIF TEMPLATE
// ---------------------------------------------------------------------------
export function ElegantTemplate({ data, accentColor = "#854D0E" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Cinzel', 'Playfair Display', serif", padding: 40, background: "#FFFDF9", color: "#1C1917", borderRadius: 12, border: "1px solid #E7E5E4" }}>
      <div style={{ textAlign: "center", borderBottom: `1px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 26, letterSpacing: "0.1em", textTransform: "uppercase", color: accentColor, margin: 0 }}>
          {d.fullName}
        </h1>
        <div style={{ fontSize: 12, letterSpacing: "0.05em", color: "#78716C", marginTop: 6, fontStyle: "italic" }}>
          {d.currentRole} • {d.location}
        </div>
        <div style={{ fontSize: 11, color: "#A8A29E", marginTop: 8 }}>
          {d.email} • {d.mobile} • {d.linkedin}
        </div>
        <div style={{ marginTop: 10 }}>
          <TalenteraVerifiedBadge variant="compact" />
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h4 style={{ fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: accentColor, textAlign: "center", marginBottom: 8 }}>
          {d.summaryTitle}
        </h4>
        <p style={{ fontFamily: "serif", fontSize: 12.5, lineHeight: 1.7, color: "#44403C", textAlign: "justify", margin: 0 }}>
          {d.summary}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>
        <div style={{ border: "1px solid #E7E5E4", padding: 14, borderRadius: 6, background: "#FFFFFF" }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", color: accentColor, textTransform: "uppercase" }}>Certification</div>
          <strong style={{ fontSize: 12.5, color: "#1C1917", display: "block", marginTop: 4 }}>{d.certName}</strong>
          <div style={{ fontSize: 11, color: "#78716C" }}>{d.issuingBody} ({d.issueDate})</div>
        </div>
        <div style={{ border: "1px solid #E7E5E4", padding: 14, borderRadius: 6, background: "#FFFFFF" }}>
          <div style={{ fontSize: 10.5, letterSpacing: "0.08em", color: accentColor, textTransform: "uppercase" }}>Academy Training</div>
          <strong style={{ fontSize: 12.5, color: "#1C1917", display: "block", marginTop: 4 }}>{d.academyName}</strong>
          <div style={{ fontSize: 11, color: "#78716C" }}>{d.courseName}</div>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h4 style={{ fontSize: 11.5, letterSpacing: "0.1em", textTransform: "uppercase", color: accentColor, textAlign: "center", marginBottom: 12 }}>
          Experience
        </h4>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: "bold" }}>
              <span>{w.title} — {w.company}</span>
              <span style={{ fontSize: 11, color: "#78716C" }}>{w.dates}</span>
            </div>
            <p style={{ fontSize: 11.5, color: "#57534E", margin: "3px 0 0", lineHeight: 1.5 }}>{w.description}</p>
          </div>
        ))}
      </div>

      <EducationSection d={d} accentColor={accentColor} />
      <DeclarationSection d={d} accentColor={accentColor} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. BOLD HEADLINE TEMPLATE
// ---------------------------------------------------------------------------
export function BoldTemplate({ data, accentColor = "#BE123C" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Montserrat', sans-serif", borderRadius: 12, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
      <div style={{ background: accentColor, color: "#FFFFFF", padding: "28px 32px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "0.02em" }}>{d.fullName}</h1>
            <div style={{ fontSize: 13, fontWeight: 700, opacity: 0.9, marginTop: 4 }}>{d.currentRole} • {d.location}</div>
          </div>
          <TalenteraVerifiedBadge />
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 11.5, opacity: 0.85 }}>
          <span>{d.email}</span>
          <span>•</span>
          <span>{d.mobile}</span>
          <span>•</span>
          <span>{d.linkedin}</span>
        </div>
      </div>

      <div style={{ padding: "28px 32px" }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 6px" }}>
            // {d.summaryTitle}
          </h3>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
          <div style={{ border: `1.5px solid ${accentColor}`, padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: accentColor, textTransform: "uppercase" }}>Certification</div>
            <strong style={{ fontSize: 12.5, color: "#0F172A" }}>{d.certName}</strong>
            <div style={{ fontSize: 11, color: "#64748B" }}>{d.issuingBody} ({d.issueDate})</div>
          </div>
          <div style={{ border: `1.5px solid ${accentColor}`, padding: 12, borderRadius: 8 }}>
            <div style={{ fontSize: 10.5, fontWeight: 900, color: accentColor, textTransform: "uppercase" }}>Academy</div>
            <strong style={{ fontSize: 12.5, color: "#0F172A" }}>{d.academyName}</strong>
            <div style={{ fontSize: 11, color: "#64748B" }}>{d.courseName}</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, color: accentColor, textTransform: "uppercase", letterSpacing: "0.08em", margin: "0 0 10px" }}>
            // EXPERIENCE
          </h3>
          {d.workHistoryList.map((w, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 800 }}>
                <span>{w.title} — {w.company}</span>
                <span style={{ fontSize: 11, color: "#64748B" }}>{w.dates}</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: "3px 0 0" }}>{w.description}</p>
            </div>
          ))}
        </div>

        <EducationSection d={d} accentColor={accentColor} />
        <DeclarationSection d={d} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. GRID PORTFOLIO TEMPLATE
// ---------------------------------------------------------------------------
export function PortfolioTemplate({ data, accentColor = "#4338CA" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", padding: 32, background: "#F1F5F9", borderRadius: 12 }}>
      {/* Top Banner Card */}
      <div style={{ background: "#FFFFFF", padding: 24, borderRadius: 10, marginBottom: 16, border: "1px solid #CBD5E1", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 900, color: accentColor, margin: 0 }}>{d.fullName}</h1>
          <div style={{ fontSize: 13, fontWeight: 700, color: "#475569", marginTop: 2 }}>{d.currentRole} • {d.location}</div>
          <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>{d.email} • {d.mobile} • {d.linkedin}</div>
        </div>
        <TalenteraVerifiedBadge />
      </div>

      {/* Grid of Modular Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 10, border: "1px solid #CBD5E1" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>{d.summaryTitle}</h4>
          <p style={{ fontSize: 12, lineHeight: 1.55, color: "#334155", margin: 0 }}>{d.summary}</p>
        </div>

        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 10, border: "1px solid #CBD5E1" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Verified Credentials</h4>
          <div style={{ fontSize: 12, marginBottom: 6 }}>
            <strong style={{ color: "#0F172A" }}>{d.certName}</strong>
            <div style={{ color: "#64748B" }}>{d.issuingBody} ({d.issueDate})</div>
          </div>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>{d.academyName}</strong>
            <div style={{ color: "#64748B" }}>{d.courseName}</div>
          </div>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 10, border: "1px solid #CBD5E1", marginBottom: 16 }}>
        <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 10px" }}>Work Experience</h4>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 }}>
              <span>{w.title} — {w.company}</span>
              <span style={{ fontSize: 11, color: "#64748B" }}>{w.dates}</span>
            </div>
            <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0" }}>{w.description}</p>
          </div>
        ))}
      </div>

      <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 10, border: "1px solid #CBD5E1" }}>
        <EducationSection d={d} accentColor={accentColor} />
        <DeclarationSection d={d} accentColor={accentColor} />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. COMPACT ATS PRO TEMPLATE
// ---------------------------------------------------------------------------
export function AtsProTemplate({ data, accentColor = "#000000" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", padding: 32, background: "#FFFFFF", color: "#000000", borderRadius: 8, lineHeight: 1.4 }}>
      {/* Plain text ATS standard header */}
      <div style={{ textAlign: "center", borderBottom: "1px solid #000000", paddingBottom: 10, marginBottom: 14 }}>
        <h1 style={{ fontSize: 20, fontWeight: "bold", textTransform: "uppercase", margin: 0 }}>{d.fullName}</h1>
        <div style={{ fontSize: 11.5, marginTop: 4 }}>
          {d.location} | {d.mobile} | {d.email} | {d.linkedin}
        </div>
        <div style={{ fontSize: 10.5, fontWeight: "bold", marginTop: 4 }}>
          Talentera Verified Healthcare Candidate
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>{d.summaryTitle.toUpperCase()}</h3>
        <p style={{ fontSize: 11.5, margin: 0 }}>{d.summary}</p>
      </div>

      {/* Credentials */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>CERTIFICATIONS &amp; CREDENTIALS</h3>
        <div style={{ fontSize: 11.5 }}>
          • <strong>{d.certName}</strong> — {d.issuingBody} (Member ID: {d.memberId}, Issued: {d.issueDate})
        </div>
        <div style={{ fontSize: 11.5, marginTop: 2 }}>
          • <strong>{d.academyName}</strong> — {d.courseName} (Duration: {d.trainingDuration})
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>TECHNICAL SKILLS</h3>
        <div style={{ fontSize: 11.5 }}>• <strong>Code Sets:</strong> {d.codeSets}</div>
        <div style={{ fontSize: 11.5 }}>• <strong>Specialized Knowledge:</strong> {d.specializedKnowledge}</div>
        <div style={{ fontSize: 11.5 }}>• <strong>Software &amp; Tools:</strong> {d.ehrSoftware}</div>
      </div>

      {/* Experience */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>PROFESSIONAL EXPERIENCE</h3>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: "bold" }}>
              <span>{w.title} — {w.company}</span>
              <span>{w.dates}</span>
            </div>
            <p style={{ fontSize: 11, margin: "2px 0 0", lineHeight: 1.45 }}>{w.description}</p>
          </div>
        ))}
      </div>

      {/* Education */}
      <EducationSection d={d} isMonochrome={true} />

      {/* Declaration */}
      <DeclarationSection d={d} isMonochrome={true} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// 13. BLACK & WHITE / MONOCHROME NOIR TEMPLATE
// ---------------------------------------------------------------------------
export function MonochromeTemplate({ data }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Inter', -apple-system, sans-serif", padding: 40, background: "#FFFFFF", color: "#000000", borderRadius: 8, border: "1.5px solid #000000", position: "relative" }}>
      {/* Header */}
      <div style={{ borderBottom: "2.5px solid #000000", paddingBottom: 18, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 30, fontWeight: 900, color: "#000000", margin: 0, letterSpacing: "-0.02em", textTransform: "uppercase" }}>
            {d.fullName}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#374151", fontWeight: 700, fontSize: 15, letterSpacing: "0.02em" }}>
            {d.currentRole} • {d.experience} • {d.location}
          </p>
          <div style={{ fontSize: 12, color: "#4B5563", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 14 }}>
            <span>📞 {d.mobile}</span>
            <span>✉️ {d.email}</span>
            <span>🔗 {d.linkedin}</span>
          </div>
        </div>

        <TalenteraVerifiedBadge isMonochrome={true} />
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: 4, marginBottom: 8 }}>
          {d.summaryTitle}
        </h3>
        <p style={{ fontSize: 12.5, lineHeight: 1.65, color: "#1F2937", margin: 0 }}>
          {d.summary}
        </p>
      </div>

      {/* Certifications & Formal Training */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 22 }}>
        <div style={{ border: "1.5px solid #000000", borderRadius: 6, padding: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, color: "#000000", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px", borderBottom: "1px dashed #000000", paddingBottom: 4 }}>
            Core Certifications
          </h3>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#000000" }}>{d.certName}</div>
          <div style={{ fontSize: 11.5, color: "#374151", marginTop: 3 }}>
            Issuing Body: <strong>{d.issuingBody}</strong> • Member ID: <strong>{d.memberId}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#000000", fontWeight: 700, marginTop: 4 }}>
            Status: Active Verified ({d.issueDate})
          </div>
        </div>

        <div style={{ border: "1.5px solid #000000", borderRadius: 6, padding: 14 }}>
          <h3 style={{ fontSize: 12, fontWeight: 900, color: "#000000", letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 8px", borderBottom: "1px dashed #000000", paddingBottom: 4 }}>
            Formal Academy Training
          </h3>
          <div style={{ fontSize: 12.5, fontWeight: 800, color: "#000000" }}>{d.academyName}</div>
          <div style={{ fontSize: 11.5, color: "#374151", marginTop: 3 }}>
            Course: <strong>{d.courseName}</strong>
          </div>
          <div style={{ fontSize: 11, color: "#4B5563", marginTop: 4 }}>
            Duration: {d.trainingDuration} {d.trainerName ? "• Trainer: " + d.trainerName : ""}
          </div>
        </div>
      </div>

      {/* Skills Grid */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: 4, marginBottom: 10 }}>
          Technical &amp; Coding Competencies
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12 }}>
          <div style={{ border: "1px solid #D1D5DB", padding: 10, borderRadius: 4 }}>
            <strong style={{ color: "#000000", display: "block", marginBottom: 3, fontSize: 11 }}>CODE SETS</strong>
            <span style={{ color: "#374151" }}>{d.codeSets}</span>
          </div>
          <div style={{ border: "1px solid #D1D5DB", padding: 10, borderRadius: 4 }}>
            <strong style={{ color: "#000000", display: "block", marginBottom: 3, fontSize: 11 }}>SPECIALIZED KNOWLEDGE</strong>
            <span style={{ color: "#374151" }}>{d.specializedKnowledge}</span>
          </div>
          <div style={{ border: "1px solid #D1D5DB", padding: 10, borderRadius: 4 }}>
            <strong style={{ color: "#000000", display: "block", marginBottom: 3, fontSize: 11 }}>EHR &amp; CODING PLATFORMS</strong>
            <span style={{ color: "#374151" }}>{d.ehrSoftware}</span>
          </div>
          <div style={{ border: "1px solid #D1D5DB", padding: 10, borderRadius: 4 }}>
            <strong style={{ color: "#000000", display: "block", marginBottom: 3, fontSize: 11 }}>CORE COMPETENCIES</strong>
            <span style={{ color: "#374151" }}>{d.coreCompetencies}</span>
          </div>
        </div>
      </div>

      {/* Work History */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13, fontWeight: 900, color: "#000000", letterSpacing: "0.08em", textTransform: "uppercase", borderBottom: "1px solid #000000", paddingBottom: 4, marginBottom: 12 }}>
          Professional Experience
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {d.workHistoryList.map((job, idx) => (
            <div key={idx} style={{ borderLeft: "3px solid #000000", paddingLeft: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap" }}>
                <strong style={{ fontSize: 13.5, color: "#000000" }}>{job.title}</strong>
                <span style={{ fontSize: 12, color: "#4B5563", fontWeight: 700 }}>{job.dates}</span>
              </div>
              <div style={{ fontSize: 12, color: "#374151", fontWeight: 600, marginTop: 1 }}>
                {job.company} • {job.location}
              </div>
              {job.metrics && (
                <div style={{ fontSize: 11.5, color: "#000000", fontWeight: 700, marginTop: 3 }}>
                  • Key Metric: {job.metrics}
                </div>
              )}
              <p style={{ fontSize: 12, color: "#374151", margin: "4px 0 0", lineHeight: 1.55 }}>
                {job.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Education */}
      <EducationSection d={d} isMonochrome={true} />

      {/* Declaration */}
      <DeclarationSection d={d} isMonochrome={true} />
    </div>
  );
}
