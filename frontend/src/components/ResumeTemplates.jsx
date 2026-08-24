import React from "react";

export function VerifiedBadge({ text = "Verified" }) {
  return (
    <span style={{
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
      marginLeft: 6
    }}>
      <i className="fa-solid fa-circle-check" style={{ color: "#D97706" }}></i> {text}
    </span>
  );
}

/**
 * EXECUTIVE GOLD TEMPLATE
 * Complete 8-Stage & Comprehensive Medical Coding Resume
 */
export function ExecutiveTemplate({ data, accentColor = "#0A1F3D" }) {
  const {
    basicInfo = {},
    training = {},
    certification = {},
    assessment = {},
    videoIntro = {},
    liveCharts = {},
    score = 90,
    badgeTier = "Gold Verified",
    manualWorkHistory = [],
    manualEducation = [],
  } = data;

  const cid = data.id || data._id || "VERIFIED-CANDIDATE";
  const publicUrl = `${window.location.origin}/verify/${cid}`;

  // Contact Info
  const fullName = basicInfo.fullName || "Candidate Name";
  const email = basicInfo.email || data.email || "candidate@talentera.com";
  const mobile = basicInfo.mobile || "+91 98765 43210";
  const location = `${basicInfo.city || "Bengaluru"}, ${basicInfo.state || "Karnataka"}${basicInfo.country ? `, ${basicInfo.country}` : ""}`;
  const linkedin = basicInfo.linkedin || "linkedin.com/in/medical-coder";
  const maskedAadhaar = basicInfo.maskedAadhaar || "";

  // Certification Details
  const certName = certification.certName || certification.certificationName || basicInfo.certName || "CPC (Certified Professional Coder)";
  const issuingBody = certification.issuingBody || basicInfo.issuingBody || "AAPC";
  const memberId = certification.memberId || basicInfo.memberId || "AAPC-987654";
  const certStatus = basicInfo.certStatus || "Active";
  const issueDate = certification.issueDate || basicInfo.issueDate || "2021";
  const expiryDate = basicInfo.expiryDate || "Active & Current";
  const apprenticeStatus = basicInfo.apprenticeStatus || "CPC Full Status (Apprentice Removed)";

  // Summary
  const summary = basicInfo.summary || "AAPC Certified Professional Coder (CPC) with 3+ years experience in Outpatient, Inpatient, and ED Medical Coding. Proven track record maintaining 98% coding accuracy across 60+ charts daily while ensuring full HIPAA & CMS compliance.";

  // Technical & Coding Skill Sets
  const codeSets = basicInfo.codeSets || "ICD-10-CM, ICD-10-PCS, CPT, HCPCS Level II, CDT";
  const specializedKnowledge = basicInfo.specializedKnowledge || "E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA Compliance, Medical Necessity, DRG Assignment, HCC Risk Adjustment";
  const ehrSoftware = basicInfo.ehrSoftware || "Epic Hyperspace, Cerner, Meditech, Athenahealth, 3M CodeRyte / Encoder Pro, Optum Encoder";
  const coreCompetencies = basicInfo.coreCompetencies || "Anatomy & Physiology, Medical Terminology, Clinical Documentation Improvement (CDI), Denial & Audit Appeals Resolution";

  // Work History
  const workHistoryList = manualWorkHistory && manualWorkHistory.length > 0
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
      ]);

  // Education Details
  const collegeName = basicInfo.collegeName || training.academyName || "Bangalore University / Life Sciences Institute";
  const degree = basicInfo.degree || "B.Sc. Life Sciences / Healthcare Information Management";
  const graduationYear = basicInfo.graduationYear || "2021";

  const schoolName = basicInfo.schoolName || "St. Joseph's Higher Secondary School";
  const schoolBoard = basicInfo.schoolBoard || "CBSE Board";
  const schoolYear = basicInfo.schoolYear || "2018";

  // Proctored Scores
  const testScore = assessment.foundationScore !== undefined ? assessment.foundationScore : (assessment.score || 90);
  const aiVideoScore = videoIntro.aiScore || 88;
  const chartAccuracy = liveCharts.accuracyScore || 96;
  const chartCount = liveCharts.liveChartsAudited || 40;

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Manrope', sans-serif", padding: 36, background: "#fff", color: "#1E293B", borderRadius: 12 }}>
      {/* 1. CONTACT INFORMATION HEADER */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: accentColor, margin: 0 }}>
            {fullName}
            <VerifiedBadge text={maskedAadhaar ? `Aadhaar ${maskedAadhaar}` : "Aadhaar KYC Verified"} />
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 600, fontSize: 15 }}>
            {basicInfo.currentRole || "Medical Coding Professional"} • {basicInfo.experience || "Experienced"} • {location}
          </p>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 6, display: "flex", flexWrap: "wrap", gap: 12 }}>
            <span><i className="fa-solid fa-phone" style={{ marginRight: 4, color: accentColor }}></i> {mobile}</span>
            <span><i className="fa-solid fa-envelope" style={{ marginRight: 4, color: accentColor }}></i> {email}</span>
            <span><i className="fa-brands fa-linkedin" style={{ marginRight: 4, color: accentColor }}></i> {linkedin}</span>
          </div>
        </div>

        <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", borderRadius: 12, padding: "12px 18px", textAlign: "center", minWidth: 160 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em" }}>TALENTERA SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>{score}<span style={{ fontSize: 14, color: "#94A3B8" }}>/100</span></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309" }}><i className="fa-solid fa-award"></i> {badgeTier}</div>
        </div>
      </div>

      {/* 2. PROFESSIONAL SUMMARY */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
          Professional Summary
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>
          {summary}
        </p>
      </div>

      {/* 3. CORE CERTIFICATIONS & LICENSING */}
      <div style={{ background: "#F8FAFC", border: "1.5px solid #CBD5E1", borderRadius: 12, padding: 18, marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", margin: "0 0 12px" }}>
          Core Certifications &amp; Credentials (Verified)
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14, color: "#0F172A" }}>
              {certName} <VerifiedBadge text="Verified Active" />
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
              Issuing Body: <strong>{issuingBody}</strong> • Member ID: <strong>{memberId}</strong>
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#475569" }}>
            <div>Status: <strong style={{ color: "#15803D" }}>{certStatus}</strong> ({apprenticeStatus})</div>
            <div>Valid From: <strong>{issueDate}</strong> • Expiry: <strong>{expiryDate}</strong></div>
          </div>
        </div>
      </div>

      {/* 4. TECHNICAL & CODING SKILL SET */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
          Technical &amp; Coding Skill Set
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontSize: 12 }}>
          <div style={{ background: "#F1F5F9", padding: 12, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 4 }}>CODE SETS</strong>
            <span style={{ color: "#334155" }}>{codeSets}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 12, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 4 }}>SPECIALIZED KNOWLEDGE</strong>
            <span style={{ color: "#334155" }}>{specializedKnowledge}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 12, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 4 }}>EHR &amp; BILLING SOFTWARE</strong>
            <span style={{ color: "#334155" }}>{ehrSoftware}</span>
          </div>
          <div style={{ background: "#F1F5F9", padding: 12, borderRadius: 8 }}>
            <strong style={{ color: accentColor, display: "block", marginBottom: 4 }}>CORE COMPETENCIES</strong>
            <span style={{ color: "#334155" }}>{coreCompetencies}</span>
          </div>
        </div>
      </div>

      {/* 5. PROFESSIONAL EXPERIENCE */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 14 }}>
          Professional Experience
        </h3>
        {workHistoryList.map((w, idx) => (
          <div key={idx} style={{ marginBottom: 16, borderLeft: `3px solid ${accentColor}`, paddingLeft: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong style={{ fontSize: 14, color: "#0F172A" }}>{w.title}</strong>
              <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>{w.dates}</span>
            </div>
            <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, margin: "2px 0 4px" }}>
              {w.company} {w.location ? `• ${w.location}` : ""} {w.workType ? `(${w.workType})` : ""}
            </div>
            {w.metrics && (
              <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "2px 8px", borderRadius: 4, display: "inline-block", marginBottom: 6 }}>
                Metrics: {w.metrics}
              </div>
            )}
            <p style={{ fontSize: 12, lineHeight: 1.5, color: "#334155", margin: 0 }}>{w.description}</p>
          </div>
        ))}
      </div>

      {/* 6. EDUCATION & FORMAL TRAINING */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
            College &amp; Academic Qualifications
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong style={{ fontSize: 13, color: "#0F172A" }}>{degree}</strong>
            <div style={{ color: "#64748B", marginTop: 2 }}>{collegeName} ({graduationYear})</div>
          </div>
        </div>

        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
            Schooling &amp; High School
          </h3>
          <div style={{ fontSize: 12 }}>
            <strong style={{ fontSize: 13, color: "#0F172A" }}>High School / Secondary ({schoolBoard})</strong>
            <div style={{ color: "#64748B", marginTop: 2 }}>{schoolName} ({schoolYear})</div>
          </div>
        </div>
      </div>

      {/* VERIFIED AUDIT AUDITING & SCORES SUMMARY */}
      <div style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>OFFICIAL TALENTERA VERIFIED CREDENTIAL</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>Verify live audit trail: {publicUrl}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "4px 10px", borderRadius: 999 }}>
          <i className="fa-solid fa-shield-halved"></i> Proctored Audit Verified
        </div>
      </div>
    </div>
  );
}

/**
 * MODERN TECH TEMPLATE
 */
export function ModernTemplate({ data, accentColor = "#0A1F3D" }) {
  return <ExecutiveTemplate data={data} accentColor={accentColor} />;
}

/**
 * CLASSIC CORPORATE TEMPLATE
 */
export function ClassicTemplate({ data, accentColor = "#0A1F3D" }) {
  return <ExecutiveTemplate data={data} accentColor={accentColor} />;
}

/**
 * MINIMAL COMPACT TEMPLATE
 */
export function MinimalTemplate({ data, accentColor = "#0A1F3D" }) {
  return <ExecutiveTemplate data={data} accentColor={accentColor} />;
}
