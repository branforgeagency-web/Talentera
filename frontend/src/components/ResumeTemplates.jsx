import React from "react";

export function VerifiedBadge({ text = "Verified" }) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: "0.7rem",
        background: "#FEF3C7",
        border: "1px solid #F59E0B",
        color: "#B45309",
        padding: "2px 8px",
        borderRadius: 999,
        fontWeight: 700,
        marginLeft: 6,
        verticalAlign: "middle",
      }}
    >
      <i className="fa-solid fa-circle-check" style={{ color: "#D97706" }}></i> {text}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Shared Data Extractor
// Extracts, normalizes, and provides safe fallbacks for candidate profile data
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

  const certName = manual.certName || certification.certName || certification.certificationName || certification.certCode || "CPC (Certified Professional Coder)";
  const issuingBody = manual.issuingBody || certification.issuingBody || certification.bodyName || "AAPC";
  const memberId = manual.memberId || certification.memberId || certification.certId || "AAPC-987654";
  const issueDate = manual.issueDate || certification.issueDate || "2021";
  const certDocName = manual.certDocName || certification.docName || "";

  const academyName = manual.academyName || training.academyName || "ThoughtFlows Medical Coding Academy";
  const courseName = manual.courseName || training.courseName || `${training.domain || "Medical Coding"} - ${training.specialty || "HCC"}`;
  const trainingDuration = manual.trainingDuration || training.duration || "6 months";
  const trainerName = manual.trainerName || training.trainerName || "";

  const summary = manual.summary !== undefined && manual.summary !== ""
    ? manual.summary
    : (basicInfo.summary || "Healthcare RCM Specialist & Medical Coder with extensive experience in Outpatient, Inpatient, and ED Medical Coding. Proven track record maintaining 98% coding accuracy across daily charts while ensuring full HIPAA & CMS compliance.");

  const codeSets = manual.codeSets || basicInfo.codeSets || "ICD-10-CM, ICD-10-PCS, CPT, HCPCS Level II, CDT";
  const specializedKnowledge = manual.specializedKnowledge || basicInfo.specializedKnowledge || "E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA Compliance, Medical Necessity, DRG Assignment, HCC Risk Adjustment";
  const ehrSoftware = manual.ehrSoftware || basicInfo.ehrSoftware || "Epic Hyperspace, Cerner, Meditech, Athenahealth, 3M CodeRyte / Encoder Pro, Optum Encoder";
  const coreCompetencies = manual.coreCompetencies || basicInfo.coreCompetencies || "Anatomy & Physiology, Medical Terminology, Clinical Documentation Improvement (CDI), Denial & Audit Appeals Resolution";

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

  const schoolName = manual.schoolName || basicInfo.schoolName || "St. Joseph's Higher Secondary School";
  const schoolBoard = manual.schoolBoard || basicInfo.schoolBoard || "CBSE Board";
  const schoolYear = manual.schoolYear || basicInfo.schoolYear || "2018";

  return {
    fullName,
    email,
    mobile,
    location,
    linkedin,
    maskedAadhaar,
    currentRole,
    experience,
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
    codeSets,
    specializedKnowledge,
    ehrSoftware,
    coreCompetencies,
    workHistoryList,
    collegeName,
    degree,
    graduationYear,
    schoolName,
    schoolBoard,
    schoolYear,
    score,
    badgeTier,
    publicUrl,
  };
}

// ---------------------------------------------------------------------------
// 1. EXECUTIVE GOLD TEMPLATE
// Classic corporate header with prominent Talentera verified score badge
// ---------------------------------------------------------------------------
export function ExecutiveTemplate({ data, accentColor = "#0A1F3D" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Manrope', sans-serif", padding: 36, background: "#fff", color: "#1E293B", borderRadius: 12 }}>
      {/* Header */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: accentColor, margin: 0 }}>
            {d.fullName}
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 600, fontSize: 15 }}>
            {d.currentRole} • {d.experience} • {d.location}
          </p>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span><i className="fa-solid fa-phone" style={{ marginRight: 4, color: accentColor }}></i> {d.mobile}</span>
            <span><i className="fa-solid fa-envelope" style={{ marginRight: 4, color: accentColor }}></i> {d.email}</span>
            <span><i className="fa-brands fa-linkedin" style={{ marginRight: 4, color: accentColor }}></i> {d.linkedin}</span>
          </div>
        </div>

        <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", borderRadius: 12, padding: "12px 18px", textAlign: "center", minWidth: 150 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em" }}>TALENTERA SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>{d.score}<span style={{ fontSize: 14, color: "#94A3B8" }}>/100</span></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309" }}><i className="fa-solid fa-award"></i> {d.badgeTier}</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
          Professional Summary
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
      </div>

      {/* Certifications */}
      <div style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", borderRadius: 12, padding: 16, marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Core Certifications &amp; Credentials
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12.5 }}>
          <div>
            <strong style={{ color: "#0F172A", fontSize: 13.5 }}>{d.certName}</strong>
            <div style={{ color: "#475569", marginTop: 2 }}>Issuing Body: <strong>{d.issuingBody}</strong> • ID: <strong>{d.memberId}</strong></div>
          </div>
          <div style={{ color: "#475569" }}>
            <div>Status: <strong style={{ color: "#15803D" }}>Active Verified</strong></div>
            <div>Issue Date: <strong>{d.issueDate}</strong></div>
          </div>
        </div>
      </div>

      {/* Training */}
      <div style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", borderRadius: 12, padding: 16, marginBottom: 22 }}>
        <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 10px" }}>
          Academy &amp; Formal Training
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, fontSize: 12.5 }}>
          <div>
            <strong style={{ color: "#0F172A", fontSize: 13.5 }}>{d.academyName}</strong>
            <div style={{ color: "#475569", marginTop: 2 }}>Course: <strong>{d.courseName}</strong></div>
          </div>
          <div style={{ color: "#475569" }}>
            <div>Duration: <strong>{d.trainingDuration}</strong></div>
            {d.trainerName && <div>Trainer: <strong>{d.trainerName}</strong></div>}
          </div>
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 22 }}>
        <h3 style={{ fontSize: 13.5, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 10 }}>
          Technical &amp; Coding Skill Sets
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, fontSize: 12 }}>
          <div style={{ background: "#F1F5F9", padding: 10, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 3 }}>CODE SETS</strong>
            <span style={{ color: "#334155" }}>{d.codeSets}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 10, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 3 }}>SPECIALIZED KNOWLEDGE</strong>
            <span style={{ color: "#334155" }}>{d.specializedKnowledge}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 10, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 3 }}>EHR &amp; SOFTWARE</strong>
            <span style={{ color: "#334155" }}>{d.ehrSoftware}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 10, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 3 }}>CORE COMPETENCIES</strong>
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
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
            College Education
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>{d.degree}</strong>
            <div style={{ color: "#64748B" }}>{d.collegeName} ({d.graduationYear})</div>
          </div>
        </div>
        <div>
          <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
            Schooling
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>High School ({d.schoolBoard})</strong>
            <div style={{ color: "#64748B" }}>{d.schoolName} ({d.schoolYear})</div>
          </div>
        </div>
      </div>

      {/* Audit Stamp */}
      <div style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "10px 14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
// Distinct 30/70 split layout with dark/accent sidebar on left
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

        <h2 style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF", margin: "0 0 4px" }}>{d.fullName}</h2>
        <div style={{ fontSize: 12, color: "#F5B41A", fontWeight: 700, marginBottom: 16 }}>{d.currentRole}</div>

        <div style={{ fontSize: 11.5, color: "#CBD5E1", display: "flex", flexDirection: "column", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.15)", paddingBottom: 16, marginBottom: 18 }}>
          <div><i className="fa-solid fa-location-dot" style={{ width: 16 }}></i> {d.location}</div>
          <div><i className="fa-solid fa-phone" style={{ width: 16 }}></i> {d.mobile}</div>
          <div><i className="fa-solid fa-envelope" style={{ width: 16 }}></i> {d.email}</div>
          <div><i className="fa-brands fa-linkedin" style={{ width: 16 }}></i> {d.linkedin}</div>
        </div>

        {/* Talentera Score */}
        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 12, textAlign: "center", marginBottom: 20 }}>
          <div style={{ fontSize: 9.5, fontWeight: 800, color: "#F5B41A", letterSpacing: "0.08em" }}>TALENTERA SCORE</div>
          <div style={{ fontSize: 26, fontWeight: 900, color: "#FFFFFF" }}>{d.score}/100</div>
          <div style={{ fontSize: 10, color: "#E2E8F0" }}>{d.badgeTier}</div>
        </div>

        {/* Core Skills List */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#F5B41A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            Core Code Sets
          </div>
          <div style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.6 }}>{d.codeSets}</div>
        </div>

        <div>
          <div style={{ fontSize: 11.5, fontWeight: 800, color: "#F5B41A", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 }}>
            EHR &amp; Software
          </div>
          <div style={{ fontSize: 11, color: "#E2E8F0", lineHeight: 1.6 }}>{d.ehrSoftware}</div>
        </div>
      </div>

      {/* Right Content */}
      <div style={{ padding: "32px 28px", color: "#1E293B" }}>
        {/* Summary */}
        <div style={{ marginBottom: 22 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            Professional Summary
          </h3>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
        </div>

        {/* Certifications */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            Verified Certifications
          </h3>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0", fontSize: 12 }}>
            <strong style={{ color: "#0F172A" }}>{d.certName}</strong>
            <div style={{ color: "#475569", marginTop: 2 }}>{d.issuingBody} • Member ID: {d.memberId} • Issued: {d.issueDate}</div>
          </div>
        </div>

        {/* Academy Training */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            Academy Training
          </h3>
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
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", borderBottom: `2px solid ${accentColor}`, paddingBottom: 4, marginBottom: 8 }}>
            Education
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong>{d.degree}</strong>
            <div style={{ color: "#64748B" }}>{d.collegeName} ({d.graduationYear})</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. CLASSIC CORPORATE TEMPLATE
// Traditional centered serif layout, refined formal horizontal borders
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
        <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
          <span>{d.mobile}</span>
          <span>•</span>
          <span>{d.email}</span>
          <span>•</span>
          <span>{d.linkedin}</span>
          <span>•</span>
          <span style={{ color: "#B45309", fontWeight: "bold" }}>Score: {d.score}/100</span>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 20 }}>
        <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
          Professional Overview
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
      <div>
        <h3 style={{ fontSize: 13, fontWeight: "bold", textTransform: "uppercase", letterSpacing: "0.08em", color: accentColor, borderBottom: "1px solid #CBD5E1", paddingBottom: 4, marginBottom: 8 }}>
          Education
        </h3>
        <div style={{ fontSize: 12 }}>
          <strong>{d.degree}</strong> — {d.collegeName} ({d.graduationYear})
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 4. MINIMAL COMPACT TEMPLATE
// Ultra-clean, single-page density, high space efficiency
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
          <div style={{ color: "#B45309", fontWeight: 700 }}>Talentera Score: {d.score}/100</div>
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
              Summary
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

          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
              Education
            </div>
            <div style={{ fontSize: 12 }}>
              <strong>{d.degree}</strong>
              <div style={{ color: "#64748B" }}>{d.collegeName} ({d.graduationYear})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 5. CREATIVE SPLIT TEMPLATE
// Vibrant gradient header bar with timeline-style indicators
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
          <div style={{ background: "#FFFFFF", color: "#0A1F3D", padding: "12px 18px", borderRadius: 12, textAlign: "center" }}>
            <div style={{ fontSize: 9.5, fontWeight: 800, color: "#64748B" }}>VERIFICATION SCORE</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: accentColor }}>{d.score}/100</div>
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
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, textTransform: "uppercase", marginBottom: 8 }}>Education</h3>
            <div style={{ fontSize: 12 }}><strong>{d.degree}</strong> ({d.collegeName})</div>
          </div>
          <div>
            <h3 style={{ fontSize: 13, fontWeight: 800, color: accentColor, textTransform: "uppercase", marginBottom: 8 }}>Code Sets</h3>
            <div style={{ fontSize: 12, color: "#475569" }}>{d.codeSets}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 6. NORDIC CLEAN TEMPLATE
// Scandinavian minimalist design with soft rounded pill cards and gentle pastels
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
          <span style={{ background: "#E0F2FE", color: "#0369A1", padding: "6px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
            Score: {d.score}/100
          </span>
        </div>
        <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 12, display: "flex", gap: 14 }}>
          <span>{d.email}</span> • <span>{d.mobile}</span> • <span>{d.location}</span>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)", marginBottom: 20 }}>
        <h4 style={{ fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 8px" }}>Summary</h4>
        <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", margin: 0 }}>{d.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Certification</h4>
          <strong style={{ fontSize: 13 }}>{d.certName}</strong>
          <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>{d.issuingBody} • {d.memberId}</div>
        </div>
        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Academy Training</h4>
          <strong style={{ fontSize: 13 }}>{d.academyName}</strong>
          <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 2 }}>{d.courseName} • {d.trainingDuration}</div>
        </div>
      </div>

      <div style={{ background: "#FFFFFF", padding: 20, borderRadius: 14, boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
        <h4 style={{ fontSize: 12, fontWeight: 800, color: "#64748B", textTransform: "uppercase", margin: "0 0 10px" }}>Experience</h4>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 }}>
              <span>{w.title} — {w.company}</span>
              <span style={{ fontSize: 11, color: "#94A3B8" }}>{w.dates}</span>
            </div>
            <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0" }}>{w.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 7. TWO-COLUMN PRO TEMPLATE
// Balanced 40/60 dual-column structured layout
// ---------------------------------------------------------------------------
export function TwoColumnTemplate({ data, accentColor = "#0F766E" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Manrope', sans-serif", padding: 32, background: "#FFFFFF", borderRadius: 12 }}>
      <div style={{ borderBottom: `2px solid ${accentColor}`, paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, fontWeight: 900, color: accentColor, margin: 0 }}>{d.fullName}</h1>
        <div style={{ fontSize: 13, color: "#64748B", fontWeight: 700, marginTop: 4 }}>{d.currentRole} • {d.location}</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "38% 62%", gap: 24 }}>
        {/* Left Col */}
        <div>
          <div style={{ background: "#F0FDFA", border: "1px solid #CCFBF1", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: accentColor, textTransform: "uppercase" }}>Talentera Verified</div>
            <div style={{ fontSize: 24, fontWeight: 900, color: accentColor }}>{d.score}/100</div>
            <div style={{ fontSize: 11, color: "#0D9488" }}>{d.badgeTier}</div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Certification</h4>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <strong>{d.certName}</strong>
              <div style={{ color: "#64748B" }}>{d.issuingBody} • {d.memberId}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Training</h4>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <strong>{d.academyName}</strong>
              <div style={{ color: "#64748B" }}>{d.courseName}</div>
            </div>
          </div>

          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Skills</h4>
            <div style={{ fontSize: 11.5, color: "#475569", marginTop: 6, lineHeight: 1.5 }}>{d.codeSets}</div>
          </div>
        </div>

        {/* Right Col */}
        <div>
          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Summary</h4>
            <p style={{ fontSize: 12.5, color: "#334155", lineHeight: 1.6, margin: "6px 0 0" }}>{d.summary}</p>
          </div>

          <div style={{ marginBottom: 18 }}>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Work Experience</h4>
            {d.workHistoryList.map((w, idx) => (
              <div key={idx} style={{ marginTop: 8, borderLeft: `2px solid ${accentColor}`, paddingLeft: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700 }}>
                  <span>{w.title}</span>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{w.dates}</span>
                </div>
                <div style={{ fontSize: 11.5, color: accentColor, fontWeight: 600 }}>{w.company}</div>
                <p style={{ fontSize: 11.5, color: "#475569", margin: "2px 0 0", lineHeight: 1.5 }}>{w.description}</p>
              </div>
            ))}
          </div>

          <div>
            <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 4 }}>Education</h4>
            <div style={{ fontSize: 12, marginTop: 6 }}>
              <strong>{d.degree}</strong>
              <div style={{ color: "#64748B" }}>{d.collegeName} ({d.graduationYear})</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 8. TECH MONOSPACE TEMPLATE
// Developer & engineer styling with terminal code badges
// ---------------------------------------------------------------------------
export function TechTemplate({ data, accentColor = "#1E293B" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Space Mono', monospace, sans-serif", padding: 32, background: "#0F172A", color: "#E2E8F0", borderRadius: 12 }}>
      {/* Dark Terminal Header */}
      <div style={{ borderBottom: "1px dashed #334155", paddingBottom: 16, marginBottom: 20 }}>
        <div style={{ fontSize: 11, color: "#22C55E" }}>// TALENTERA_VERIFIED_CANDIDATE: [READY]</div>
        <h1 style={{ fontSize: 24, fontWeight: 900, color: "#F8FAFC", margin: "4px 0" }}>{d.fullName}</h1>
        <div style={{ fontSize: 12, color: "#94A3B8" }}>{d.currentRole} | {d.location}</div>
        <div style={{ fontSize: 11, color: "#F5B41A", marginTop: 4 }}>Score: {d.score}/100 ({d.badgeTier})</div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ cat overview.txt</div>
        <p style={{ fontSize: 11.5, lineHeight: 1.6, color: "#CBD5E1", margin: "4px 0 0" }}>{d.summary}</p>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ npm run inspect-credentials</div>
        <div style={{ background: "#1E293B", padding: 12, borderRadius: 6, marginTop: 6, fontSize: 11 }}>
          <div>[CERT]: {d.certName} - {d.issuingBody} (ID: {d.memberId})</div>
          <div>[ACADEMY]: {d.academyName} - {d.courseName}</div>
          <div>[STACK]: {d.codeSets}</div>
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ git log --oneline experience</div>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginTop: 6, fontSize: 11.5 }}>
            <span style={{ color: "#F5B41A" }}>commit-{idx + 1}</span> {w.title} @ {w.company} ({w.dates})
            <div style={{ color: "#94A3B8", fontSize: 11, marginLeft: 12 }}>{w.description}</div>
          </div>
        ))}
      </div>

      <div>
        <div style={{ fontSize: 11, color: "#38BDF8", fontWeight: "bold" }}>$ echo $EDUCATION</div>
        <div style={{ fontSize: 11.5, color: "#CBD5E1", marginTop: 4 }}>{d.degree} — {d.collegeName}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 9. ELEGANT SERIF TEMPLATE
// Luxury serif headings, fine gold/accent hairline rules, timeless elegance
// ---------------------------------------------------------------------------
export function ElegantTemplate({ data, accentColor = "#854D0E" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Playfair Display', 'Georgia', serif", padding: 40, background: "#FFFEFA", border: "1px solid #FEF08A", borderRadius: 12, color: "#292524" }}>
      <div style={{ textAlign: "center", borderBottom: `1px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24 }}>
        <h1 style={{ fontSize: 30, fontWeight: 700, color: accentColor, margin: 0, letterSpacing: "0.04em" }}>{d.fullName}</h1>
        <div style={{ fontSize: 13, color: "#78716C", fontStyle: "italic", marginTop: 6 }}>{d.currentRole} • {d.location}</div>
        <div style={{ fontSize: 11.5, color: "#A8A29E", marginTop: 6 }}>{d.email} • {d.mobile} • Score: {d.score}/100</div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accentColor, textAlign: "center", marginBottom: 10 }}>
          Executive Synopsis
        </h4>
        <p style={{ fontSize: 12.5, lineHeight: 1.7, color: "#44403C", margin: 0, textAlign: "justify" }}>{d.summary}</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 22 }}>
        <div style={{ border: "1px solid #E7E5E4", padding: 14, borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: accentColor, textTransform: "uppercase" }}>Verified Certification</div>
          <strong style={{ fontSize: 13 }}>{d.certName}</strong>
          <div style={{ fontSize: 11, color: "#78716C" }}>{d.issuingBody} ({d.memberId})</div>
        </div>
        <div style={{ border: "1px solid #E7E5E4", padding: 14, borderRadius: 6 }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: accentColor, textTransform: "uppercase" }}>Academy Training</div>
          <strong style={{ fontSize: 13 }}>{d.academyName}</strong>
          <div style={{ fontSize: 11, color: "#78716C" }}>{d.courseName}</div>
        </div>
      </div>

      <div style={{ marginBottom: 22 }}>
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accentColor, borderBottom: "1px solid #E7E5E4", paddingBottom: 4, marginBottom: 12 }}>
          Professional Experience
        </h4>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
              <strong>{w.title} — {w.company}</strong>
              <span style={{ fontSize: 11.5, color: "#78716C" }}>{w.dates}</span>
            </div>
            <p style={{ fontSize: 12, color: "#57534E", margin: "4px 0 0", lineHeight: 1.55 }}>{w.description}</p>
          </div>
        ))}
      </div>

      <div>
        <h4 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em", color: accentColor, borderBottom: "1px solid #E7E5E4", paddingBottom: 4, marginBottom: 8 }}>
          Academic Qualifications
        </h4>
        <div style={{ fontSize: 12 }}>{d.degree} — {d.collegeName} ({d.graduationYear})</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 10. BOLD HEADLINE TEMPLATE
// High-impact full-width colored header block with high contrast cards
// ---------------------------------------------------------------------------
export function BoldTemplate({ data, accentColor = "#BE123C" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Bricolage Grotesque', sans-serif", borderRadius: 14, overflow: "hidden", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(0,0,0,0.06)" }}>
      {/* Full Header Block */}
      <div style={{ background: accentColor, color: "#FFFFFF", padding: "28px 36px" }}>
        <h1 style={{ fontSize: 32, fontWeight: 900, textTransform: "uppercase", margin: 0, letterSpacing: "-0.02em" }}>
          {d.fullName}
        </h1>
        <div style={{ fontSize: 14, fontWeight: 700, marginTop: 4, color: "#FFE4E6" }}>
          {d.currentRole} • {d.location}
        </div>
        <div style={{ fontSize: 12, marginTop: 10, display: "flex", gap: 16 }}>
          <span>{d.email}</span> • <span>{d.mobile}</span> • <span>Score: {d.score}/100</span>
        </div>
      </div>

      <div style={{ padding: "28px 36px" }}>
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            // PROFILE SUMMARY
          </h3>
          <p style={{ fontSize: 13, color: "#334155", lineHeight: 1.6, margin: 0 }}>{d.summary}</p>
        </div>

        {/* Credentials Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 22 }}>
          <div style={{ background: "#FFF1F2", padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: accentColor }}>CERTIFICATION</div>
            <strong style={{ fontSize: 13.5, color: "#881337" }}>{d.certName}</strong>
            <div style={{ fontSize: 11.5, color: "#9F1239" }}>{d.issuingBody} ({d.memberId})</div>
          </div>
          <div style={{ background: "#FFF1F2", padding: 14, borderRadius: 10 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: accentColor }}>ACADEMY TRAINING</div>
            <strong style={{ fontSize: 13.5, color: "#881337" }}>{d.academyName}</strong>
            <div style={{ fontSize: 11.5, color: "#9F1239" }}>{d.courseName}</div>
          </div>
        </div>

        {/* Experience */}
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
            // WORK EXPERIENCE
          </h3>
          {d.workHistoryList.map((w, idx) => (
            <div key={idx} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13.5, fontWeight: 800 }}>
                <span>{w.title} @ {w.company}</span>
                <span style={{ color: "#881337", fontSize: 11.5 }}>{w.dates}</span>
              </div>
              <p style={{ fontSize: 12, color: "#475569", margin: "2px 0 0" }}>{w.description}</p>
            </div>
          ))}
        </div>

        <div>
          <h3 style={{ fontSize: 15, fontWeight: 900, color: accentColor, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>
            // EDUCATION
          </h3>
          <div style={{ fontSize: 12 }}><strong>{d.degree}</strong> ({d.collegeName})</div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 11. GRID PORTFOLIO TEMPLATE
// Modular cards layout showcasing verified stages in clean boxes
// ---------------------------------------------------------------------------
export function PortfolioTemplate({ data, accentColor = "#4338CA" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "'Space Grotesk', sans-serif", padding: 32, background: "#F1F5F9", borderRadius: 14 }}>
      {/* Top Banner Card */}
      <div style={{ background: "#FFFFFF", padding: 22, borderRadius: 12, border: "1px solid #E2E8F0", marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: accentColor, margin: 0 }}>{d.fullName}</h1>
            <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{d.currentRole} • {d.location}</div>
          </div>
          <div style={{ background: "#EEF2FF", border: "1px solid #C7D2FE", padding: "6px 14px", borderRadius: 10, textAlign: "center" }}>
            <div style={{ fontSize: 9, fontWeight: 800, color: accentColor }}>TALENTERA SCORE</div>
            <div style={{ fontSize: 20, fontWeight: 900, color: accentColor }}>{d.score}/100</div>
          </div>
        </div>
      </div>

      {/* 2-Column Grid of Modular Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Summary</h4>
          <p style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.5, margin: 0 }}>{d.summary}</p>
        </div>

        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Certification</h4>
          <strong style={{ fontSize: 12.5 }}>{d.certName}</strong>
          <div style={{ fontSize: 11, color: "#64748B" }}>{d.issuingBody} • {d.memberId}</div>
        </div>

        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Experience</h4>
          {d.workHistoryList.slice(0, 1).map((w, idx) => (
            <div key={idx} style={{ fontSize: 11.5 }}>
              <strong>{w.title}</strong> — {w.company}
              <div style={{ color: "#64748B", fontSize: 10.5 }}>{w.dates}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#FFFFFF", padding: 18, borderRadius: 12, border: "1px solid #E2E8F0" }}>
          <h4 style={{ fontSize: 12, fontWeight: 800, color: accentColor, textTransform: "uppercase", margin: "0 0 6px" }}>Education &amp; Training</h4>
          <div style={{ fontSize: 11.5 }}>
            <strong>{d.degree}</strong>
            <div style={{ color: "#64748B" }}>{d.academyName}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 12. COMPACT ATS PRO TEMPLATE
// Standard single-column format optimized for applicant tracking systems
// ---------------------------------------------------------------------------
export function AtsProTemplate({ data, accentColor = "#000000" }) {
  const d = extractResumeData(data);

  return (
    <div style={{ fontFamily: "Arial, Helvetica, sans-serif", padding: "36px 40px", background: "#FFFFFF", color: "#111827", borderRadius: 8 }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 18 }}>
        <h1 style={{ fontSize: 24, fontWeight: "bold", textTransform: "uppercase", margin: 0 }}>{d.fullName}</h1>
        <div style={{ fontSize: 12, color: "#374151", marginTop: 4 }}>
          {d.location} | {d.phone || d.mobile} | {d.email} | {d.linkedin}
        </div>
        <div style={{ fontSize: 11, fontWeight: "bold", color: "#4B5563", marginTop: 2 }}>
          Talentera Certified Candidate (ID: {d.memberId || "VERIFIED"}) • Score: {d.score}/100
        </div>
      </div>

      <div style={{ height: 1, background: "#9CA3AF", marginBottom: 14 }}></div>

      {/* Professional Summary */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>PROFESSIONAL SUMMARY</h3>
        <p style={{ fontSize: 11.5, lineHeight: 1.5, margin: 0, color: "#1F2937" }}>{d.summary}</p>
      </div>

      {/* Certifications */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>CREDENTIALS &amp; CERTIFICATIONS</h3>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          • <strong>{d.certName}</strong> — Issued by {d.issuingBody}, Member ID: {d.memberId}, Active Credential
        </div>
      </div>

      {/* Training */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>FORMAL TRAINING</h3>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          • <strong>{d.academyName}</strong> — Course: {d.courseName} ({d.trainingDuration})
        </div>
      </div>

      {/* Skills */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>SKILLS &amp; PROFICIENCIES</h3>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          • <strong>Code Sets:</strong> {d.codeSets}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          • <strong>Specialized:</strong> {d.specializedKnowledge}
        </div>
        <div style={{ fontSize: 11.5, lineHeight: 1.5 }}>
          • <strong>Systems:</strong> {d.ehrSoftware}
        </div>
      </div>

      {/* Experience */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 6px" }}>WORK EXPERIENCE</h3>
        {d.workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, fontWeight: "bold" }}>
              <span>{w.title} — {w.company}</span>
              <span>{w.dates}</span>
            </div>
            <p style={{ fontSize: 11, margin: "2px 0 0", lineHeight: 1.45 }}>{w.description}</p>
          </div>
        ))}
      </div>

      {/* Education */}
      <div>
        <h3 style={{ fontSize: 12.5, fontWeight: "bold", textTransform: "uppercase", margin: "0 0 4px" }}>EDUCATION</h3>
        <div style={{ fontSize: 11.5 }}>
          • <strong>{d.degree}</strong>, {d.collegeName} ({d.graduationYear})
        </div>
      </div>
    </div>
  );
}
