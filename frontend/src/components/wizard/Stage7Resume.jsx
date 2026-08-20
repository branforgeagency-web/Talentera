import React, { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { ExecutiveTemplate, ModernTemplate, ClassicTemplate, MinimalTemplate } from "../ResumeTemplates.jsx";

const TEMPLATES = [
  { id: "executive", name: "Executive Gold", icon: "fa-award", Component: ExecutiveTemplate },
  { id: "modern", name: "Modern Tech", icon: "fa-id-card", Component: ModernTemplate },
  { id: "classic", name: "Classic Corporate", icon: "fa-file-lines", Component: ClassicTemplate },
  { id: "minimal", name: "Minimal Compact", icon: "fa-table-cells", Component: MinimalTemplate },
];

const ACCENT_COLORS = [
  { id: "navy", color: "#0A1F3D", label: "Navy Royal" },
  { id: "emerald", color: "#15803D", label: "Emerald Green" },
  { id: "amber", color: "#B45309", label: "Gold Amber" },
  { id: "purple", color: "#7E22CE", label: "Deep Purple" },
];

export default function Stage7Resume({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [profileData, setProfileData] = useState(null);
  const [mode, setMode] = useState("auto"); // "auto" | "manual"

  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [selectedColor, setSelectedColor] = useState("#0A1F3D");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Manual Edit State
  const [manualData, setManualData] = useState({
    fullName: "",
    jobTitle: "Senior Medical Coder & AR Specialist",
    mobile: "",
    email: "",
    city: "",
    state: "",
    summary: "",
    skills: "ICD-10-CM, CPT Modifiers, E/M MDM Guidelines, HCC RAF Coding, Epic Hyperspace, Denial Management, Claims Appeals",
    certifications: "AAPC Certified Professional Coder (CPC), AHIMA Certified Coding Specialist (CCS)",
    education: [{ degree: "B.Sc. Healthcare Administration / Science", school: "Bangalore University", year: "2021" }],
    workHistory: [
      {
        title: "Senior Medical Coder & Auditor",
        company: "ThoughtFlows Healthcare RCM",
        dates: "2022 – Present",
        description: "Assigned ICD-10-CM and CPT codes for inpatient/ED charts. Audited claim submissions to reduce CO-197 denials by 35%.",
      },
      {
        title: "RCM Billing Specialist",
        company: "Apex RCM Solutions",
        dates: "2021 – 2022",
        description: "Managed AR follow-ups, resolved Medicare/Medicaid billing rejections, and verified pre-authorization documentation.",
      },
    ],
  });

  useEffect(() => {
    api.get("/candidate/resume-data")
      .then((res) => {
        const d = res.data;
        setProfileData(d);
        if (d.template) setSelectedTemplate(d.template);

        // Pre-fill manual data from stage 1 basic info if empty
        const bInfo = d.basicInfo || {};
        setManualData((prev) => ({
          ...prev,
          fullName: d.manualResume?.fullName || bInfo.fullName || prev.fullName,
          jobTitle: d.manualResume?.jobTitle || bInfo.currentRole || prev.jobTitle,
          mobile: d.manualResume?.mobile || bInfo.mobile || prev.mobile,
          email: d.manualResume?.email || d.email || prev.email,
          city: d.manualResume?.city || bInfo.city || prev.city,
          state: d.manualResume?.state || bInfo.state || prev.state,
          summary: d.manualResume?.summary || bInfo.summary || prev.summary || "Certified Medical Coding and RCM professional with expertise in ICD-10-CM, CPT modifiers, E/M documentation guidelines, and denial management.",
          skills: d.manualResume?.skills || prev.skills,
          certifications: d.manualResume?.certifications || (d.certification?.certificationName ? d.certification.certificationName : prev.certifications),
          workHistory: d.manualResume?.workHistory || prev.workHistory,
          education: d.manualResume?.education || prev.education,
        }));

        if (d.manualResume) {
          setMode("manual");
        }
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectTemplate(tplId) {
    setSelectedTemplate(tplId);
    try {
      await api.put("/candidate/resume-template", { template: tplId });
    } catch (e) {}
  }

  function handleCopyShareLink() {
    if (!profileData) return;
    const cid = profileData.id || profileData._id;
    const shareUrl = `${window.location.origin}/verify/${cid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast("Verified resume link copied to clipboard!", "✓");
    setTimeout(() => setCopiedLink(false), 3000);
  }

  function handleDownloadPdf() {
    window.print();
  }

  // --- Manual Work History Handlers ---
  function handleAddWorkHistory() {
    setManualData((prev) => ({
      ...prev,
      workHistory: [
        ...prev.workHistory,
        { title: "Medical Coder", company: "Healthcare RCM Ltd", dates: "2023 – Present", description: "Coded charts and resolved claims." },
      ],
    }));
  }

  function handleRemoveWorkHistory(index) {
    setManualData((prev) => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, i) => i !== index),
    }));
  }

  function handleWorkHistoryChange(index, field, value) {
    setManualData((prev) => {
      const updated = [...prev.workHistory];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workHistory: updated };
    });
  }

  // --- Manual Education Handlers ---
  function handleAddEducation() {
    setManualData((prev) => ({
      ...prev,
      education: [...prev.education, { degree: "B.Sc. Science", school: "State University", year: "2020" }],
    }));
  }

  function handleRemoveEducation(index) {
    setManualData((prev) => ({
      ...prev,
      education: prev.education.filter((_, i) => i !== index),
    }));
  }

  function handleEducationChange(index, field, value) {
    setManualData((prev) => {
      const updated = [...prev.education];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, education: updated };
    });
  }

  async function handleSaveAndContinue() {
    setSaving(true);
    try {
      if (mode === "manual") {
        await api.put("/candidate/manual-resume", manualData);
        toast("Custom Manual Resume saved successfully!", "✓");
      }
      const res = await api.post("/candidate/stage/7/skip");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      toast("Error saving resume.", "!");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profileData) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading candidate resume builder...</div>;
  }

  const activeTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const TemplateComponent = activeTpl.Component;

  // Construct Data for Template Preview
  const displayData = mode === "manual" ? {
    ...profileData,
    basicInfo: {
      fullName: manualData.fullName || profileData.basicInfo?.fullName || "Candidate Name",
      currentRole: manualData.jobTitle || "Medical Coding Professional",
      mobile: manualData.mobile || profileData.basicInfo?.mobile || "+91 98765 43210",
      email: manualData.email || profileData.email || "candidate@talentera.com",
      city: manualData.city || profileData.basicInfo?.city || "Bengaluru",
      state: manualData.state || profileData.basicInfo?.state || "Karnataka",
      summary: manualData.summary,
    },
    certification: {
      certificationName: manualData.certifications,
      issuingBody: "AAPC / AHIMA Direct Member",
    },
    training: {
      academyName: manualData.education[0]?.school || "Medical Coding Institute",
      courseName: manualData.education[0]?.degree || "Comprehensive RCM",
    },
    manualWorkHistory: manualData.workHistory,
    manualEducation: manualData.education,
    manualSkills: manualData.skills,
  } : profileData;

  return (
    <div className="wiz-stage7-container">
      {/* MODE SWITCHER TAB BAR */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }} className="no-print">
        <button
          type="button"
          onClick={() => setMode("auto")}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            border: mode === "auto" ? "2px solid var(--navy)" : "1px solid #CBD5E1",
            background: mode === "auto" ? "var(--navy)" : "#fff",
            color: mode === "auto" ? "#fff" : "var(--navy)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-[#0A1F3D] fa-certificate" style={{ color: mode === "auto" ? "var(--gold)" : "#64748B" }}></i>
          Auto-Generated Verified Resume (Stages 1–6 Data)
        </button>

        <button
          type="button"
          onClick={() => setMode("manual")}
          style={{
            flex: 1,
            padding: "12px 16px",
            borderRadius: 10,
            border: mode === "manual" ? "2px solid var(--navy)" : "1px solid #CBD5E1",
            background: mode === "manual" ? "var(--navy)" : "#fff",
            color: mode === "manual" ? "#fff" : "var(--navy)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-pen-to-square" style={{ color: mode === "manual" ? "var(--gold)" : "#64748B" }}></i>
          Manual Edit Resume Builder (Create &amp; Custom Edit)
        </button>
      </div>

      {/* TOP TEMPLATE & ACCENT CUSTOMIZATION BAR */}
      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }} className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.08em" }}>STAGE 07 · PROFESSIONAL RESUME BUILDER</div>
            <h3 style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
              {mode === "manual" ? "Manually Edit & Customize Professional Resume Templates" : "Select Your Verified ATS Resume Template"}
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={handleCopyShareLink}>
              <i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }}></i>
              {copiedLink ? "Link Copied!" : "Share Audit Link"}
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={handleDownloadPdf}>
              <i className="fa-solid fa-file-pdf" style={{ marginRight: 6 }}></i> Download PDF
            </button>
          </div>
        </div>

        {/* 4 Professional Basic Templates */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTemplate(t.id)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: selectedTemplate === t.id ? "2px solid var(--navy)" : "1px solid #CBD5E1",
                background: selectedTemplate === t.id ? "rgba(10,31,61,0.08)" : "#fff",
                color: "var(--navy)",
                fontWeight: selectedTemplate === t.id ? 800 : 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className={`fa-solid ${t.icon}`} style={{ color: selectedTemplate === t.id ? "var(--gold)" : "#64748B" }}></i>
              {t.name}
            </button>
          ))}
        </div>

        {/* Accent Color Palette */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Accent Style Color:</span>
          <div style={{ display: "flex", gap: 8 }}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.color)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c.color,
                  border: selectedColor === c.color ? "3px solid var(--gold)" : "none",
                  cursor: "pointer",
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* MANUAL RESUME FORM EDITOR DRAWER */}
      {mode === "manual" && (
        <div style={{ background: "#fff", border: "2px solid var(--navy)", borderRadius: 16, padding: 24, marginBottom: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }} className="no-print">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid #E2E8F0", paddingBottom: 12 }}>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>
              <i className="fa-solid fa-user-pen" style={{ color: "var(--gold)", marginRight: 8 }}></i>
              Manual Resume Data Editor (Type &amp; Custom Edit Below)
            </h4>
            <span style={{ fontSize: 11, color: "#15803D", fontWeight: 700 }}>✓ Live Real-Time Preview Below</span>
          </div>

          {/* Section 1: Personal & Contact Info */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <label className="wiz-mini-label">Full Legal Name</label>
              <input type="text" value={manualData.fullName} onChange={(e) => setManualData({ ...manualData, fullName: e.target.value })} placeholder="e.g. Ananya Sharma" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>

            <div>
              <label className="wiz-mini-label">Target Professional Role / Title</label>
              <input type="text" value={manualData.jobTitle} onChange={(e) => setManualData({ ...manualData, jobTitle: e.target.value })} placeholder="e.g. Senior Medical Coder & AR Specialist" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>

            <div>
              <label className="wiz-mini-label">Mobile Phone Number</label>
              <input type="text" value={manualData.mobile} onChange={(e) => setManualData({ ...manualData, mobile: e.target.value })} placeholder="+91 98765 43210" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>

            <div>
              <label className="wiz-mini-label">Email Address</label>
              <input type="email" value={manualData.email} onChange={(e) => setManualData({ ...manualData, email: e.target.value })} placeholder="ananya@example.com" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>

            <div>
              <label className="wiz-mini-label">City / Locality</label>
              <input type="text" value={manualData.city} onChange={(e) => setManualData({ ...manualData, city: e.target.value })} placeholder="Bengaluru" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>

            <div>
              <label className="wiz-mini-label">State</label>
              <input type="text" value={manualData.state} onChange={(e) => setManualData({ ...manualData, state: e.target.value })} placeholder="Karnataka" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
            </div>
          </div>

          {/* Section 2: Summary */}
          <div style={{ marginBottom: 16 }}>
            <label className="wiz-mini-label">Professional Summary &amp; Background</label>
            <textarea rows={3} value={manualData.summary} onChange={(e) => setManualData({ ...manualData, summary: e.target.value })} placeholder="Write a short summary highlighting your RCM experience..." style={{ width: "100%", padding: 10, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 13 }} />
          </div>

          {/* Section 3: Work History */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
              <label className="wiz-mini-label" style={{ margin: 0 }}>Work Experience History</label>
              <button type="button" className="btn btn-outline" style={{ fontSize: 11, padding: "4px 10px" }} onClick={handleAddWorkHistory}>
                + Add Work Experience
              </button>
            </div>

            {manualData.workHistory.map((work, idx) => (
              <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 14, marginBottom: 10 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong style={{ fontSize: 12, color: "var(--navy)" }}>Experience #{idx + 1}</strong>
                  {manualData.workHistory.length > 1 && (
                    <button type="button" style={{ color: "#DC2626", background: "none", border: "none", cursor: "pointer", fontSize: 11, fontWeight: 700 }} onClick={() => handleRemoveWorkHistory(idx)}>
                      Remove
                    </button>
                  )}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 140px", gap: 10, marginBottom: 8 }}>
                  <input type="text" value={work.title} onChange={(e) => handleWorkHistoryChange(idx, "title", e.target.value)} placeholder="Job Title (e.g. Senior Medical Coder)" style={{ padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
                  <input type="text" value={work.company} onChange={(e) => handleWorkHistoryChange(idx, "company", e.target.value)} placeholder="Company (e.g. ThoughtFlows RCM)" style={{ padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
                  <input type="text" value={work.dates} onChange={(e) => handleWorkHistoryChange(idx, "dates", e.target.value)} placeholder="Dates (e.g. 2022 – Present)" style={{ padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
                </div>
                <textarea rows={2} value={work.description} onChange={(e) => handleWorkHistoryChange(idx, "description", e.target.value)} placeholder="Key responsibilities and achievements..." style={{ width: "100%", padding: 8, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
              </div>
            ))}
          </div>

          {/* Section 4: Education & Certifications */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 16 }}>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <label className="wiz-mini-label" style={{ margin: 0 }}>Education &amp; Academics</label>
                <button type="button" className="btn btn-outline" style={{ fontSize: 10, padding: "2px 8px" }} onClick={handleAddEducation}>+ Add</button>
              </div>

              {manualData.education.map((edu, idx) => (
                <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 10, marginBottom: 8 }}>
                  <input type="text" value={edu.degree} onChange={(e) => handleEducationChange(idx, "degree", e.target.value)} placeholder="Degree (e.g. B.Sc. Science)" style={{ width: "100%", padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12, marginBottom: 6 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 90px", gap: 8 }}>
                    <input type="text" value={edu.school} onChange={(e) => handleEducationChange(idx, "school", e.target.value)} placeholder="Institution / College" style={{ padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
                    <input type="text" value={edu.year} onChange={(e) => handleEducationChange(idx, "year", e.target.value)} placeholder="Year" style={{ padding: 6, borderRadius: 4, border: "1px solid #CBD5E1", fontSize: 12 }} />
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="wiz-mini-label">Certifications &amp; Credentials</label>
              <textarea rows={3} value={manualData.certifications} onChange={(e) => setManualData({ ...manualData, certifications: e.target.value })} placeholder="e.g. AAPC Certified Professional Coder (CPC)" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, marginBottom: 12 }} />

              <label className="wiz-mini-label">Technical Skills (Comma Separated)</label>
              <input type="text" value={manualData.skills} onChange={(e) => setManualData({ ...manualData, skills: e.target.value })} placeholder="ICD-10-CM, CPT Modifiers, E/M MDM, HCC RAF" style={{ width: "100%", padding: 8, borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }} />
            </div>
          </div>
        </div>
      )}

      {/* LIVE RESUME SHEET PREVIEW */}
      <div style={{ background: "#E2E8F0", padding: 20, borderRadius: 16, marginBottom: 24, border: "1px solid #CBD5E1" }}>
        <div style={{ boxShadow: "0 10px 30px rgba(0,0,0,0.08)", borderRadius: 12, overflow: "hidden" }}>
          <TemplateComponent data={displayData} accentColor={selectedColor} />
        </div>
      </div>

      {/* SAVE & ADVANCE ACTION BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24 }} className="no-print">
        <div style={{ fontSize: 13, color: "#64748B" }}>
          <i className="fa-solid fa-circle-check" style={{ color: "#15803D", marginRight: 6 }}></i>
          {mode === "manual" ? "Custom Manual Edit Resume ready for PDF export & profile saving." : "Resume auto-generated from your verified Stages 1–6 data."}
        </div>
        <button type="button" className="btn btn-gold" style={{ padding: "12px 24px", fontSize: 14 }} onClick={handleSaveAndContinue} disabled={saving}>
          {saving ? "Saving Resume…" : "Save & Continue to Stage 08 →"}
        </button>
      </div>

      <style>{`@media print { .no-print { display: none !important; } body { background: #fff !important; } }`}</style>
    </div>
  );
}
