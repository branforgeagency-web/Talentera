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

export function ExecutiveTemplate({ data, accentColor = "#0A1F3D" }) {
  const { basicInfo = {}, training = {}, certification = {}, assessment = {}, liveCharts = {}, score = 90, badgeTier = "Gold Verified", manualWorkHistory, manualEducation, manualSkills } = data;
  const cid = data.id || data._id || "VERIFIED-CANDIDATE";
  const publicUrl = `${window.location.origin}/verify/${cid}`;

  return (
    <div style={{ fontFamily: "'Space Grotesk', 'Manrope', sans-serif", padding: 36, background: "#fff", color: "#1E293B", borderRadius: 12 }}>
      {/* Header Banner */}
      <div style={{ borderBottom: `3px solid ${accentColor}`, paddingBottom: 20, marginBottom: 24, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontFamily: "'Bricolage Grotesque', sans-serif", fontSize: 28, fontWeight: 800, color: accentColor, margin: 0 }}>
            {basicInfo.fullName || "Candidate Name"} <VerifiedBadge text="Aadhaar KYC" />
          </h1>
          <p style={{ margin: "6px 0 0", color: "#475569", fontWeight: 600, fontSize: 15 }}>
            {basicInfo.currentRole || "Medical Coding Professional"} • {basicInfo.experience || "3-5"} Years Experience • {basicInfo.city || "Bengaluru"}
          </p>
          <div style={{ fontSize: 12, color: "#64748B", marginTop: 4 }}>
            Mobile: {basicInfo.mobile || "+91 98765 43210"} • Email: {basicInfo.email || data.email || "candidate@talentera.com"}
          </div>
        </div>

        <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", borderRadius: 12, padding: "12px 18px", textAlign: "center", minWidth: 160 }}>
          <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.08em" }}>TALENTERA SCORE</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: accentColor }}>{score}<span style={{ fontSize: 14, color: "#94A3B8" }}>/100</span></div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "#B45309" }}><i className="fa-solid fa-award"></i> {badgeTier}</div>
        </div>
      </div>

      {/* Summary */}
      <div style={{ marginBottom: 24 }}>
        <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 8 }}>
          Professional Overview
        </h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155", margin: 0 }}>
          {basicInfo.summary || `Verified RCM specialist with proven track record in medical coding, chart auditing, and billing workflow. Verified via Talentera 4-layer gate system with AAPC/AHIMA accreditation and proctored assessment.`}
        </p>
      </div>

      {/* Manual Custom Work History */}
      {manualWorkHistory && manualWorkHistory.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
            Work Experience History
          </h3>
          {manualWorkHistory.map((w, idx) => (
            <div key={idx} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong style={{ fontSize: 14, color: "#0F172A" }}>{w.title}</strong>
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>{w.dates}</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: accentColor, marginBottom: 4 }}>{w.company}</div>
              <p style={{ fontSize: 12, lineHeight: 1.5, color: "#334155", margin: 0 }}>{w.description}</p>
            </div>
          ))}
        </div>
      )}

      {/* Skills Tag Cloud */}
      {manualSkills && (
        <div style={{ marginBottom: 24 }}>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 10 }}>
            Technical Competencies &amp; Skills
          </h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {String(manualSkills).split(",").map((s, i) => (
              <span key={i} style={{ background: "#F1F5F9", color: "#334155", fontSize: 11, fontWeight: 700, padding: "4px 10px", borderRadius: 6, border: "1px solid #CBD5E1" }}>
                {s.trim()}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 2-Column Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 24 }}>
        {/* Left Column: Certifications & Training */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
            Certifications &amp; Pedigree
          </h3>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
              {certification.certificationName || certification.name || "AAPC Certified Professional Coder (CPC)"} <VerifiedBadge />
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Issuing Body: {certification.issuingBody || "AAPC Direct Member Directory"}
            </div>
            {certification.certId && <div style={{ fontSize: 11, color: "#64748B" }}>Member ID: ****{String(certification.certId).slice(-4)}</div>}
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
              {training.academyName || "ThoughtFlows Medical Coding Institute"} <VerifiedBadge text="Academy Verified" />
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Course: {training.courseName || "Comprehensive RCM & Medical Coding"} ({training.batch || "Batch 2025"})
            </div>
          </div>
        </div>

        {/* Right Column: Practical Assessment */}
        <div>
          <h3 style={{ fontSize: 14, fontWeight: 800, color: accentColor, letterSpacing: "0.06em", textTransform: "uppercase", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, marginBottom: 12 }}>
            Proctored Scores &amp; Audit
          </h3>

          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
              Talentera Proctored Test <VerifiedBadge text={`${assessment.score || 90}% Score`} />
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Tested Modules: ICD-10-CM, CPT Modifiers, E/M Sequencing
            </div>
          </div>

          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>
              Live Chart Audit Exposure <VerifiedBadge text={`${liveCharts.accuracyScore || 96}% Accuracy`} />
            </div>
            <div style={{ fontSize: 12, color: "#64748B" }}>
              Audited Charts: {liveCharts.liveChartsAudited || 40} ED &amp; Surgery Charts (Practicode Sync)
            </div>
          </div>
        </div>
      </div>

      {/* Verification Audit Stamp Footer */}
      <div style={{ background: "#F8FAFC", border: "1px dashed #CBD5E1", borderRadius: 8, padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, color: accentColor }}>OFFICIAL TALENTERA VERIFIED CREDENTIAL</div>
          <div style={{ fontSize: 11, color: "#64748B" }}>Verify live audit trail: {publicUrl}</div>
        </div>
        <div style={{ fontSize: 10, fontWeight: 700, color: "#15803D", background: "#DCFCE7", padding: "4px 10px", borderRadius: 999 }}>
          <i className="fa-solid fa-shield-halved"></i> Audit Verified
        </div>
      </div>
    </div>
  );
}

export function ModernTemplate({ data, accentColor = "#0A1F3D" }) {
  const { basicInfo = {}, training = {}, certification = {}, assessment = {}, liveCharts = {}, score = 90, badgeTier = "Gold Verified", manualWorkHistory, manualSkills } = data;

  return (
    <div style={{ fontFamily: "var(--font-body)", background: "#fff", display: "grid", gridTemplateColumns: "240px 1fr", borderRadius: 12, overflow: "hidden" }}>
      {/* Dark Sidebar */}
      <div style={{ background: accentColor, color: "#fff", padding: 28, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <div style={{ width: 60, height: 60, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            {(basicInfo.fullName || "C").charAt(0)}
          </div>
          <h2 style={{ color: "#fff", fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, margin: 0 }}>
            {basicInfo.fullName || "Candidate Name"}
          </h2>
          <p style={{ color: "var(--gold)", fontSize: 13, fontWeight: 700, marginTop: 4 }}>
            {basicInfo.currentRole || "Medical Coder"}
          </p>

          <div style={{ marginTop: 24, fontSize: 12, color: "rgba(255,255,255,0.75)", display: "flex", flexDirection: "column", gap: 8 }}>
            <div><i className="fa-solid fa-location-dot" style={{ width: 16 }}></i> {basicInfo.city || "Bengaluru"}</div>
            <div><i className="fa-solid fa-phone" style={{ width: 16 }}></i> {basicInfo.mobile || "+91 98765 43210"}</div>
            <div><i className="fa-solid fa-envelope" style={{ width: 16 }}></i> {basicInfo.email || data.email || "user@talentera.com"}</div>
          </div>
        </div>

        <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: 14, textAlign: "center", border: "1px solid rgba(255,255,255,0.2)" }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: "var(--gold)" }}>{score}/100</div>
          <div style={{ fontSize: 11, color: "#fff", fontWeight: 700 }}>{badgeTier}</div>
        </div>
      </div>

      {/* Main Body */}
      <div style={{ padding: 32 }}>
        {manualWorkHistory && manualWorkHistory.length > 0 && (
          <div style={{ marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 800, color: accentColor, marginBottom: 12 }}>Work Experience History</h3>
            {manualWorkHistory.map((w, idx) => (
              <div key={idx} style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13, color: "#0F172A" }}>{w.title}</strong>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{w.dates}</span>
                </div>
                <div style={{ fontSize: 12, color: accentColor, fontWeight: 700 }}>{w.company}</div>
                <p style={{ fontSize: 12, color: "#475569", margin: "4px 0 0" }}>{w.description}</p>
              </div>
            ))}
          </div>
        )}

        <h3 style={{ fontSize: 16, fontWeight: 800, color: accentColor, marginBottom: 12 }}>Verified Professional Credentials</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 24 }}>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>CERTIFICATION</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{certification.certificationName || "AAPC CPC Certified"} <VerifiedBadge /></div>
          </div>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>ACADEMY TRAINING</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{training.academyName || "ThoughtFlows Coding Academy"} <VerifiedBadge /></div>
          </div>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>PROCTORED TEST</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{assessment.score || 90}% Test Score <VerifiedBadge /></div>
          </div>
          <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #E2E8F0" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>LIVE CHART AUDIT</div>
            <div style={{ fontWeight: 700, fontSize: 13, color: "#0F172A" }}>{liveCharts.accuracyScore || 96}% Chart Accuracy <VerifiedBadge /></div>
          </div>
        </div>

        <h3 style={{ fontSize: 16, fontWeight: 800, color: accentColor, marginBottom: 12 }}>Summary &amp; Background</h3>
        <p style={{ fontSize: 13, lineHeight: 1.6, color: "#334155" }}>
          {basicInfo.summary || "Candidate has completed all gate-verification stages with high accuracy scores in ICD-10-CM and CPT coding."}
        </p>
      </div>
    </div>
  );
}

export function ClassicTemplate({ data, accentColor = "#0A1F3D" }) {
  const { basicInfo = {}, training = {}, certification = {}, assessment = {}, liveCharts = {}, score = 90, badgeTier = "Gold Verified", manualWorkHistory } = data;

  return (
    <div style={{ fontFamily: "Georgia, serif", padding: 36, background: "#fff", color: "#111", borderRadius: 12 }}>
      <div style={{ textAlign: "center", borderBottom: `2px solid ${accentColor}`, paddingBottom: 16, marginBottom: 20 }}>
        <h1 style={{ fontSize: 26, margin: 0, color: accentColor }}>{basicInfo.fullName || "Candidate Name"}</h1>
        <p style={{ margin: "6px 0 0", color: "#555", fontSize: 14 }}>
          {basicInfo.currentRole} • {basicInfo.city} • {basicInfo.mobile} • {score}/100 Score ({badgeTier})
        </p>
      </div>

      {manualWorkHistory && manualWorkHistory.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <h3 style={{ borderBottom: "1px solid #ccc", paddingBottom: 4, color: accentColor }}>Work Experience</h3>
          {manualWorkHistory.map((w, idx) => (
            <div key={idx} style={{ marginBottom: 10 }}>
              <strong>{w.title}</strong> - <em>{w.company}</em> ({w.dates})
              <p style={{ margin: "2px 0 0", fontSize: 13, color: "#444" }}>{w.description}</p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginBottom: 16 }}>
        <h3 style={{ borderBottom: "1px solid #ccc", paddingBottom: 4, color: accentColor }}>Verification Credentials</h3>
        <ul style={{ paddingLeft: 20, fontSize: 13, lineHeight: 1.8 }}>
          <li>Aadhaar KYC: Verified <VerifiedBadge /></li>
          <li>Certification: {certification.certificationName || "AAPC CPC"} <VerifiedBadge /></li>
          <li>Academy Training: {training.academyName || "Verified Institution"} <VerifiedBadge /></li>
          <li>Proctored Test: {assessment.score || 90}% Score <VerifiedBadge /></li>
          <li>Chart Audit: {liveCharts.accuracyScore || 96}% Accuracy <VerifiedBadge /></li>
        </ul>
      </div>
    </div>
  );
}

export function MinimalTemplate({ data, accentColor = "#0A1F3D" }) {
  const { basicInfo = {}, training = {}, certification = {}, assessment = {}, liveCharts = {}, score = 90, badgeTier = "Gold Verified", manualWorkHistory } = data;

  return (
    <div style={{ fontFamily: "var(--font-body)", background: "#fff", padding: 32, borderRadius: 12, border: "1px solid #E2E8F0" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div>
          <h2 style={{ margin: 0, color: accentColor, fontSize: 22, fontWeight: 800 }}>{basicInfo.fullName || "Candidate Name"}</h2>
          <div style={{ fontSize: 13, color: "#64748B", marginTop: 2 }}>{basicInfo.currentRole} • {basicInfo.city}</div>
        </div>
        <div style={{ background: "var(--gold)", color: "var(--navy)", fontWeight: 800, padding: "6px 14px", borderRadius: 999, fontSize: 12 }}>
          {score}/100 • {badgeTier}
        </div>
      </div>
      <hr style={{ border: "none", borderTop: "1px solid #E2E8F0", margin: "16px 0" }} />

      {manualWorkHistory && manualWorkHistory.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong style={{ color: accentColor }}>Work Experience:</strong>
          {manualWorkHistory.map((w, idx) => (
            <div key={idx} style={{ marginTop: 6, fontSize: 13 }}>
              <strong>{w.title}</strong> at {w.company} ({w.dates})
              <div style={{ fontSize: 12, color: "#64748B" }}>{w.description}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ fontSize: 13, lineHeight: 1.8 }}>
        <div><strong>Certification:</strong> {certification.certificationName || "AAPC CPC"} <VerifiedBadge /></div>
        <div><strong>Training:</strong> {training.academyName || "Verified Academy"} <VerifiedBadge /></div>
        <div><strong>Test Score:</strong> {assessment.score || 90}% <VerifiedBadge /></div>
        <div><strong>Chart Accuracy:</strong> {liveCharts.accuracyScore || 96}% <VerifiedBadge /></div>
      </div>
    </div>
  );
}
