import React from "react";

function VerifiedBadge() {
  return (
    <span style={{ fontSize: "0.7rem", background: "var(--gold)", color: "var(--navy)", padding: "2px 8px", borderRadius: 999, fontWeight: 700, marginLeft: 8 }}>
      ✓ Verified
    </span>
  );
}

function Field({ label, value }) {
  if (!value) return null;
  return (
    <div style={{ marginBottom: 6 }}>
      <strong>{label}:</strong> {value} <VerifiedBadge />
    </div>
  );
}

export function ClassicTemplate({ data }) {
  const { basicInfo, training, certification, assessment, liveCharts, score, badgeTier } = data;
  return (
    <div style={{ fontFamily: "Georgia, serif", padding: 32, background: "#fff", color: "#111" }}>
      <h1 style={{ marginBottom: 0 }}>{basicInfo.fullName || "Candidate Name"}</h1>
      <p style={{ margin: "4px 0 16px", color: "#555" }}>
        {basicInfo.currentRole} · {basicInfo.city} · {basicInfo.mobile}
      </p>
      <div style={{ borderTop: "2px solid #0A1F3D", paddingTop: 12, marginBottom: 12 }}>
        <h3>Verification Summary</h3>
        <p>Talentera Score: {score}/100 — {badgeTier}</p>
      </div>
      <h3>Experience</h3>
      <Field label="Years of Experience" value={basicInfo.experience} />
      {training?.academyName && !training.skipped && (
        <>
          <h3>Training</h3>
          <Field label="Academy" value={training.academyName} />
          <Field label="Course" value={training.courseName} />
        </>
      )}
      {certification?.certificationName && !certification.skipped && (
        <>
          <h3>Certification</h3>
          <Field label="Certification" value={certification.certificationName} />
          <Field label="Issuing Body" value={certification.issuingBody} />
        </>
      )}
      {assessment?.assessmentType && (
        <>
          <h3>Assessment</h3>
          <Field label="Type" value={assessment.assessmentType} />
          <Field label="Score" value={assessment.score && `${assessment.score}%`} />
        </>
      )}
      {liveCharts?.chartType && (
        <>
          <h3>Practical Skills</h3>
          <Field label="Chart Type" value={liveCharts.chartType} />
          <Field label="Accuracy" value={liveCharts.accuracyPercent && `${liveCharts.accuracyPercent}%`} />
        </>
      )}
    </div>
  );
}

export function ModernTemplate({ data }) {
  const { basicInfo, training, certification, assessment, liveCharts, score, badgeTier } = data;
  return (
    <div style={{ fontFamily: "var(--font-body)", background: "#fff", display: "grid", gridTemplateColumns: "220px 1fr" }}>
      <div style={{ background: "var(--navy)", color: "#fff", padding: 24 }}>
        <h2 style={{ color: "#fff", fontFamily: "var(--font-heading)" }}>{basicInfo.fullName || "Candidate Name"}</h2>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{basicInfo.currentRole}</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{basicInfo.city}</p>
        <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "0.85rem" }}>{basicInfo.mobile}</p>
        <div style={{ marginTop: 20, background: "rgba(229,168,46,0.2)", padding: 10, borderRadius: 8 }}>
          <div style={{ fontWeight: 700, color: "var(--gold)" }}>{score}/100</div>
          <div style={{ fontSize: "0.75rem" }}>{badgeTier}</div>
        </div>
      </div>
      <div style={{ padding: 24 }}>
        <Section title="Experience"><Field label="Years" value={basicInfo.experience} /></Section>
        {training?.academyName && !training.skipped && (
          <Section title="Training">
            <Field label="Academy" value={training.academyName} />
            <Field label="Course" value={training.courseName} />
          </Section>
        )}
        {certification?.certificationName && !certification.skipped && (
          <Section title="Certification">
            <Field label="Name" value={certification.certificationName} />
            <Field label="Issuer" value={certification.issuingBody} />
          </Section>
        )}
        {assessment?.assessmentType && (
          <Section title="Assessment">
            <Field label="Type" value={assessment.assessmentType} />
            <Field label="Score" value={assessment.score && `${assessment.score}%`} />
          </Section>
        )}
        {liveCharts?.chartType && (
          <Section title="Practical Skills">
            <Field label="Chart Type" value={liveCharts.chartType} />
            <Field label="Accuracy" value={liveCharts.accuracyPercent && `${liveCharts.accuracyPercent}%`} />
          </Section>
        )}
      </div>
    </div>
  );
}

export function MinimalTemplate({ data }) {
  const { basicInfo, training, certification, assessment, liveCharts, score, badgeTier } = data;
  return (
    <div style={{ fontFamily: "var(--font-body)", background: "#fff", padding: 32, maxWidth: 640 }}>
      <h2 style={{ marginBottom: 0 }}>{basicInfo.fullName || "Candidate Name"}</h2>
      <p style={{ color: "#777", marginTop: 4 }}>{basicInfo.currentRole} — {basicInfo.city}</p>
      <p style={{ color: "#777", fontSize: "0.85rem" }}>{score}/100 · {badgeTier}</p>
      <hr style={{ border: "none", borderTop: "1px solid #eee", margin: "16px 0" }} />
      <Field label="Experience" value={basicInfo.experience && `${basicInfo.experience} yrs`} />
      {training?.academyName && !training.skipped && <Field label="Training" value={`${training.academyName} — ${training.courseName}`} />}
      {certification?.certificationName && !certification.skipped && <Field label="Certification" value={certification.certificationName} />}
      {assessment?.assessmentType && <Field label="Assessment" value={`${assessment.assessmentType} (${assessment.score}%)`} />}
      {liveCharts?.chartType && <Field label="Live Charts" value={`${liveCharts.chartType} — ${liveCharts.accuracyPercent}% accuracy`} />}
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <h4 style={{ marginBottom: 6, color: "var(--navy)" }}>{title}</h4>
      {children}
    </div>
  );
}
