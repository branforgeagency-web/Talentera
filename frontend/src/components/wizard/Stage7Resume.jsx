import React, { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import {
  ExecutiveTemplate,
  ModernTemplate,
  ClassicTemplate,
  MinimalTemplate,
  CreativeTemplate,
  NordicTemplate,
  TwoColumnTemplate,
  TechTemplate,
  ElegantTemplate,
  BoldTemplate,
  PortfolioTemplate,
  AtsProTemplate,
} from "../ResumeTemplates.jsx";

const TEMPLATES = [
  { id: "executive", name: "Executive Gold", category: "Executive", icon: "fa-award", desc: "Signature verified executive styling with score card", Component: ExecutiveTemplate },
  { id: "modern", name: "Modern Sidebar", category: "Modern", icon: "fa-id-card", desc: "Two-tone split with left contact & skills sidebar", Component: ModernTemplate },
  { id: "classic", name: "Classic Corporate", category: "Corporate", icon: "fa-file-lines", desc: "Traditional serif editorial with formal rules", Component: ClassicTemplate },
  { id: "minimal", name: "Minimal Compact", category: "Minimal", icon: "fa-table-cells", desc: "Ultra-clean high-density single-page layout", Component: MinimalTemplate },
  { id: "creative", name: "Creative Split", category: "Creative", icon: "fa-palette", desc: "Dynamic header banner with timeline accents", Component: CreativeTemplate },
  { id: "nordic", name: "Nordic Clean", category: "Minimal", icon: "fa-compass", desc: "Scandinavian minimalist aesthetic with pill cards", Component: NordicTemplate },
  { id: "twocolumn", name: "Two-Column Pro", category: "Modern", icon: "fa-columns", desc: "Balanced 40/60 dual-column structured layout", Component: TwoColumnTemplate },
  { id: "tech", name: "Tech Monospace", category: "Tech", icon: "fa-terminal", desc: "Developer & engineer style with code badges", Component: TechTemplate },
  { id: "elegant", name: "Elegant Serif", category: "Executive", icon: "fa-feather-pointed", desc: "Refined luxury typography with gold borders", Component: ElegantTemplate },
  { id: "bold", name: "Bold Headline", category: "Creative", icon: "fa-heading", desc: "High-contrast full-width colored header banner", Component: BoldTemplate },
  { id: "portfolio", name: "Grid Portfolio", category: "Modern", icon: "fa-border-all", desc: "Modular card grid showcasing verified credentials", Component: PortfolioTemplate },
  { id: "atspro", name: "Compact ATS Pro", category: "Corporate", icon: "fa-check-double", desc: "Standard single-column optimized for ATS parsers", Component: AtsProTemplate },
];

const CATEGORIES = ["All (12)", "Executive", "Modern", "Corporate", "Minimal", "Creative", "Tech"];

const ACCENT_COLORS = [
  { id: "navy", color: "#0A1F3D", label: "Navy Royal" },
  { id: "emerald", color: "#15803D", label: "Emerald Green" },
  { id: "amber", color: "#B45309", label: "Gold Amber" },
  { id: "purple", color: "#7E22CE", label: "Deep Purple" },
  { id: "crimson", color: "#BE123C", label: "Ruby Crimson" },
  { id: "teal", color: "#0F766E", label: "Teal Pro" },
];

const EDITOR_SECTIONS = [
  { id: "personal", label: "Contact & Personal", icon: "fa-user" },
  { id: "summary", label: "Professional Summary", icon: "fa-align-left" },
  { id: "experience", label: "Work Experience", icon: "fa-briefcase" },
  { id: "skills", label: "Skills & Systems", icon: "fa-code" },
  { id: "certifications", label: "Certifications & Training", icon: "fa-certificate" },
  { id: "education", label: "Education", icon: "fa-graduation-cap" },
];

export default function Stage7Resume({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [profileData, setProfileData] = useState(null);

  // View state
  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [selectedCategory, setSelectedCategory] = useState("All (12)");
  const [selectedColor, setSelectedColor] = useState("#0A1F3D");
  const [activeTab, setActiveTab] = useState("preview"); // "preview" | "edit"
  const [activeEditorSection, setActiveEditorSection] = useState("personal");

  // Loading & actions state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCustom, setSavingCustom] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  // Editable resume data state
  const [editForm, setEditForm] = useState({
    fullName: "",
    currentRole: "",
    experience: "",
    location: "",
    email: "",
    mobile: "",
    linkedin: "",
    summary: "",
    codeSets: "",
    specializedKnowledge: "",
    ehrSoftware: "",
    coreCompetencies: "",
    certName: "",
    issuingBody: "",
    memberId: "",
    issueDate: "",
    academyName: "",
    courseName: "",
    trainingDuration: "",
    trainerName: "",
    degree: "",
    collegeName: "",
    graduationYear: "",
    schoolName: "",
    schoolBoard: "",
    schoolYear: "",
    workHistory: [],
  });

  useEffect(() => {
    api.get("/candidate/resume-data")
      .then((res) => {
        const d = res.data;
        setProfileData(d);
        if (d.template) setSelectedTemplate(d.template);
        initializeEditForm(d);
      })
      .finally(() => setLoading(false));
  }, []);

  function initializeEditForm(d) {
    const manual = d.manualResume || {};
    const b = d.basicInfo || {};
    const t = d.training || {};
    const c = d.certification || {};

    setEditForm({
      fullName: manual.fullName || b.fullName || "Candidate Name",
      currentRole: manual.currentRole || b.currentRole || "Medical Coding Professional",
      experience: manual.experience || b.experience || "Experienced",
      location: manual.location || `${b.city || "Bengaluru"}, ${b.state || "Karnataka"}${b.country ? `, ${b.country}` : ""}`,
      email: manual.email || b.email || d.email || "candidate@talentera.com",
      mobile: manual.mobile || b.mobile || "+91 98765 43210",
      linkedin: manual.linkedin || b.linkedin || "linkedin.com/in/medical-coder",
      summary: manual.summary !== undefined ? manual.summary : (b.summary || "Healthcare RCM Specialist & Medical Coder with extensive experience in Outpatient, Inpatient, and ED Medical Coding. Proven track record maintaining 98% coding accuracy across daily charts while ensuring full HIPAA & CMS compliance."),
      codeSets: manual.codeSets || b.codeSets || "ICD-10-CM, ICD-10-PCS, CPT, HCPCS Level II, CDT",
      specializedKnowledge: manual.specializedKnowledge || b.specializedKnowledge || "E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA Compliance, Medical Necessity, DRG Assignment, HCC Risk Adjustment",
      ehrSoftware: manual.ehrSoftware || b.ehrSoftware || "Epic Hyperspace, Cerner, Meditech, Athenahealth, 3M CodeRyte / Encoder Pro, Optum Encoder",
      coreCompetencies: manual.coreCompetencies || b.coreCompetencies || "Anatomy & Physiology, Medical Terminology, Clinical Documentation Improvement (CDI), Denial & Audit Appeals Resolution",
      certName: manual.certName || c.certName || c.certificationName || c.certCode || "CPC (Certified Professional Coder)",
      issuingBody: manual.issuingBody || c.issuingBody || c.bodyName || "AAPC",
      memberId: manual.memberId || c.memberId || c.certId || "AAPC-987654",
      issueDate: manual.issueDate || c.issueDate || "2021",
      academyName: manual.academyName || t.academyName || "ThoughtFlows Medical Coding Academy",
      courseName: manual.courseName || t.courseName || `${t.domain || "Medical Coding"} - ${t.specialty || "HCC"}`,
      trainingDuration: manual.trainingDuration || t.duration || "6 months",
      trainerName: manual.trainerName || t.trainerName || "",
      degree: manual.degree || b.degree || "B.Sc. Life Sciences / Healthcare Information Management",
      collegeName: manual.collegeName || b.collegeName || "Bangalore University / Life Sciences Institute",
      graduationYear: manual.graduationYear || b.graduationYear || "2021",
      schoolName: manual.schoolName || b.schoolName || "St. Joseph's Higher Secondary School",
      schoolBoard: manual.schoolBoard || b.schoolBoard || "CBSE Board",
      schoolYear: manual.schoolYear || b.schoolYear || "2018",
      workHistory: manual.workHistory && Array.isArray(manual.workHistory) && manual.workHistory.length > 0
        ? manual.workHistory
        : (b.workHistory && b.workHistory.length > 0
            ? b.workHistory
            : [
                {
                  title: "Senior Medical Coder II",
                  company: "ThoughtFlows Healthcare RCM Ltd",
                  location: "Bengaluru (Remote)",
                  dates: "2022 – Present",
                  workType: "Outpatient / ED Coding",
                  metrics: "Maintained 98.4% accuracy on 65+ outpatient charts daily",
                  description: "Coded complex ED and Surgery charts using ICD-10-CM and CPT modifiers. Queried physicians to resolve clinical documentation ambiguities, identified unbundled codes, and resolved CO-197 pre-authorization denials.",
                },
              ]),
    });
  }

  function handleFieldChange(field, value) {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleWorkHistoryChange(index, field, value) {
    setEditForm((prev) => {
      const updated = [...prev.workHistory];
      updated[index] = { ...updated[index], [field]: value };
      return { ...prev, workHistory: updated };
    });
  }

  function handleAddWorkExperience() {
    setEditForm((prev) => ({
      ...prev,
      workHistory: [
        ...prev.workHistory,
        {
          title: "Medical Coding Specialist",
          company: "Healthcare Solutions Pvt Ltd",
          location: "Bengaluru (Hybrid)",
          dates: "2020 – 2022",
          workType: "Full-time",
          metrics: "97% audit accuracy on 50+ charts daily",
          description: "Responsible for reviewing clinical documents and assigning accurate diagnostic and procedure codes.",
        },
      ],
    }));
    toast("New work experience entry added! Scroll down to edit details.", "✓");
  }

  function handleDeleteWorkExperience(index) {
    setEditForm((prev) => ({
      ...prev,
      workHistory: prev.workHistory.filter((_, idx) => idx !== index),
    }));
    toast("Work experience entry removed.", "!");
  }

  function handleResetDefaults() {
    if (!window.confirm("Reset all edits and restore original verified stage credentials?")) return;
    if (profileData) {
      const fresh = { ...profileData, manualResume: null };
      initializeEditForm(fresh);
      toast("Reset back to verified stage credentials.", "i");
    }
  }

  async function handleSaveCustomResume() {
    setSavingCustom(true);
    try {
      await api.put("/candidate/manual-resume", editForm);
      setProfileData((prev) => ({
        ...prev,
        manualResume: editForm,
      }));
      toast("Custom resume edits saved successfully!", "✓");
    } catch (err) {
      console.error("Save custom resume error:", err);
      toast(err.response?.data?.message || "Failed to save resume edits.", "!");
    } finally {
      setSavingCustom(false);
    }
  }

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

  async function handleDownloadPdf() {
    const resumeEl = document.getElementById("printable-resume");
    if (!resumeEl) {
      toast("Resume preview not ready.", "!");
      return;
    }

    setDownloadingPdf(true);
    toast("Generating your PDF resume...", "i");

    const candidateName = editForm.fullName || profileData?.basicInfo?.fullName || "Candidate";
    const cleanFileName = `${candidateName.replace(/[^a-zA-Z0-9_-]/g, "_")}_Resume.pdf`;

    try {
      const html2pdfModule = await import("html2pdf.js");
      const html2pdf = html2pdfModule.default || html2pdfModule;

      const opt = {
        margin: [6, 6, 6, 6],
        filename: cleanFileName,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          letterRendering: true,
          logging: false,
          scrollY: 0,
        },
        jsPDF: {
          unit: "mm",
          format: "a4",
          orientation: "portrait",
        },
        pagebreak: { mode: ["avoid-all", "css", "legacy"] },
      };

      await html2pdf().set(opt).from(resumeEl).save();
      toast("PDF resume downloaded successfully!", "✓");
    } catch (err) {
      console.error("Direct PDF generation error:", err);
      toast("Could not generate PDF. Please try again.", "!");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleSaveAndContinue() {
    setSaving(true);
    try {
      await api.put("/candidate/manual-resume", editForm);
      await api.put("/candidate/resume-template", { template: selectedTemplate });
      const res = await api.put(`/candidate/stage/${stage?.num || 7}`, {
        template: selectedTemplate,
        accentColor: selectedColor,
      });
      toast("Stage 7 Verified Resume Saved!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      console.error("Save Stage 7 error:", err);
      toast(err.response?.data?.message || "Could not save Stage 7.", "!");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profileData) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading auto-generated verified resume...</div>;
  }

  const filteredTemplates = selectedCategory === "All (12)"
    ? TEMPLATES
    : TEMPLATES.filter((t) => t.category === selectedCategory);

  const activeTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const TemplateComponent = activeTpl.Component;

  // Real-time reactive data merged with user's live edits
  const displayData = {
    ...profileData,
    manualResume: editForm,
  };

  return (
    <div className="wiz-stage7-container">
      {/* 1. TOP HEADER & PRIMARY ACTION CONTROLS */}
      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "20px 24px", marginBottom: 20 }} className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.08em" }}>
              STAGE 07 · VERIFIED RESUME BUILDER &amp; LIVE EDITOR
            </div>
            <h3 style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800, color: "var(--navy)" }}>
              Customize, Edit &amp; Preview Your Professional Resume
            </h3>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {/* View Mode Toggle: Preview vs Edit */}
            <div style={{ display: "flex", background: "#E2E8F0", borderRadius: 10, padding: 3 }}>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "preview" ? "#FFFFFF" : "transparent",
                  color: activeTab === "preview" ? "var(--navy)" : "#64748B",
                  boxShadow: activeTab === "preview" ? "0 2px 4px rgba(0,0,0,0.08)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <i className="fa-solid fa-eye"></i> Full Preview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("edit")}
                style={{
                  padding: "7px 14px",
                  borderRadius: 8,
                  fontSize: 12,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  background: activeTab === "edit" ? "var(--navy)" : "transparent",
                  color: activeTab === "edit" ? "#FFFFFF" : "#64748B",
                  boxShadow: activeTab === "edit" ? "0 2px 4px rgba(10,31,61,0.2)" : "none",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  transition: "all 0.15s ease",
                }}
              >
                <i className="fa-solid fa-pen-to-square"></i> Edit &amp; Preview Below
              </button>
            </div>

            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={handleCopyShareLink}>
              <i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }}></i>
              {copiedLink ? "Copied!" : "Share Audit Link"}
            </button>

            <button
              type="button"
              className="btn btn-gold"
              style={{ fontSize: 12, padding: "8px 16px", fontWeight: 800 }}
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              <i className={`fa-solid ${downloadingPdf ? "fa-spinner fa-spin" : "fa-download"}`} style={{ marginRight: 6 }}></i>
              {downloadingPdf ? "Downloading…" : "Download PDF"}
            </button>
          </div>
        </div>

        {/* 2. TEMPLATE SELECTION TABS & PALETTE (ACTIVE IN BOTH MODES) */}
        <div style={{ borderTop: "1px solid #E2E8F0", paddingTop: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: "4px 10px",
                    borderRadius: 999,
                    fontSize: 11,
                    fontWeight: 700,
                    border: "none",
                    cursor: "pointer",
                    background: selectedCategory === cat ? "var(--navy)" : "#FFFFFF",
                    color: selectedCategory === cat ? "#FFFFFF" : "#64748B",
                    boxShadow: selectedCategory === cat ? "0 2px 5px rgba(10,31,61,0.15)" : "0 1px 2px rgba(0,0,0,0.05)",
                    whiteSpace: "nowrap",
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Accent Color Palette Selector */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Color Accent:</span>
              <div style={{ display: "flex", gap: 6 }}>
                {ACCENT_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setSelectedColor(c.color)}
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: c.color,
                      border: selectedColor === c.color ? "2.5px solid var(--gold)" : "1.5px solid #FFFFFF",
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      cursor: "pointer",
                    }}
                    title={c.label}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* 12 Templates Grid Slider */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))", gap: 8 }}>
            {filteredTemplates.map((t) => {
              const isSelected = selectedTemplate === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleSelectTemplate(t.id)}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: isSelected ? "2px solid var(--navy)" : "1px solid #CBD5E1",
                    background: isSelected ? "rgba(10,31,61,0.06)" : "#FFFFFF",
                    color: "var(--navy)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11.5,
                    fontWeight: isSelected ? 800 : 600,
                  }}
                >
                  <i className={`fa-solid ${t.icon}`} style={{ color: isSelected ? "var(--gold)" : "#64748B", fontSize: 12 }}></i>
                  <span style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{t.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: EDIT ON TOP, LIVE PREVIEW DIRECTLY BELOW */}
      {activeTab === "edit" ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {/* TOP: INTERACTIVE RESUME EDITOR FORM (FULL WIDTH) */}
          <div style={{ background: "#FFFFFF", border: "1.5px solid #CBD5E1", borderRadius: 16, padding: "24px 28px", boxShadow: "0 4px 18px rgba(0,0,0,0.04)" }} className="no-print">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-sliders" style={{ color: "var(--gold)" }}></i>
                Edit &amp; Add Resume Details
              </h4>
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleResetDefaults}
                  style={{ fontSize: 11, color: "#64748B", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                  title="Restore default verified stage information"
                >
                  Reset Defaults
                </button>
                <button
                  type="button"
                  onClick={handleSaveCustomResume}
                  disabled={savingCustom}
                  style={{
                    background: "var(--navy)",
                    color: "#FFFFFF",
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    border: "none",
                  }}
                >
                  {savingCustom ? "Saving…" : "Save Edits"}
                </button>
              </div>
            </div>

            {/* Editor Section Category Pills */}
            <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 10, marginBottom: 14 }}>
              {EDITOR_SECTIONS.map((sec) => (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveEditorSection(sec.id)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    border: activeEditorSection === sec.id ? "1.5px solid var(--navy)" : "1px solid #E2E8F0",
                    background: activeEditorSection === sec.id ? "rgba(10,31,61,0.08)" : "#F8FAFC",
                    color: activeEditorSection === sec.id ? "var(--navy)" : "#64748B",
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className={`fa-solid ${sec.icon}`}></i>
                  {sec.label}
                </button>
              ))}
            </div>

            {/* SECTION 1: PERSONAL & CONTACT */}
            {activeEditorSection === "personal" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>Full Name</label>
                    <input
                      type="text"
                      value={editForm.fullName}
                      onChange={(e) => handleFieldChange("fullName", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>Current Professional Role</label>
                    <input
                      type="text"
                      value={editForm.currentRole}
                      onChange={(e) => handleFieldChange("currentRole", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>Email Address</label>
                    <input
                      type="email"
                      value={editForm.email}
                      onChange={(e) => handleFieldChange("email", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>Mobile / Phone</label>
                    <input
                      type="text"
                      value={editForm.mobile}
                      onChange={(e) => handleFieldChange("mobile", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>Location (City, State)</label>
                    <input
                      type="text"
                      value={editForm.location}
                      onChange={(e) => handleFieldChange("location", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>LinkedIn Profile</label>
                    <input
                      type="text"
                      value={editForm.linkedin}
                      onChange={(e) => handleFieldChange("linkedin", e.target.value)}
                      style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 2: PROFESSIONAL SUMMARY */}
            {activeEditorSection === "summary" && (
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 4 }}>
                  Executive Summary / Professional Bio
                </label>
                <textarea
                  rows={5}
                  value={editForm.summary}
                  onChange={(e) => handleFieldChange("summary", e.target.value)}
                  style={{ width: "100%", padding: "10px", borderRadius: 8, border: "1px solid #CBD5E1", fontSize: 12.5, lineHeight: 1.5, resize: "vertical" }}
                  placeholder="Write a concise overview highlighting your core strengths, accuracy rates, and domain experience..."
                />
                <span style={{ fontSize: 11, color: "#64748B", marginTop: 4, display: "block" }}>
                  {editForm.summary.length} characters · Updates live in the preview below.
                </span>
              </div>
            )}

            {/* SECTION 3: WORK EXPERIENCE */}
            {activeEditorSection === "experience" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)" }}>
                    Job Roles ({editForm.workHistory.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleAddWorkExperience}
                    style={{ background: "rgba(229,168,46,0.15)", border: "1px solid var(--gold)", color: "#B45309", padding: "5px 12px", borderRadius: 6, fontSize: 11.5, fontWeight: 800, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}
                  >
                    <i className="fa-solid fa-plus"></i> Add Experience
                  </button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {editForm.workHistory.map((job, idx) => (
                    <div key={idx} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)" }}>
                          Role #{idx + 1}: {job.title || "Untitled Role"}
                        </span>
                        {editForm.workHistory.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteWorkExperience(idx)}
                            style={{ color: "#EF4444", background: "none", border: "none", cursor: "pointer", fontSize: 12 }}
                            title="Delete this role"
                          >
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        )}
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Job Title</label>
                          <input
                            type="text"
                            value={job.title}
                            onChange={(e) => handleWorkHistoryChange(idx, "title", e.target.value)}
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Company Name</label>
                          <input
                            type="text"
                            value={job.company}
                            onChange={(e) => handleWorkHistoryChange(idx, "company", e.target.value)}
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                          />
                        </div>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Dates / Duration</label>
                          <input
                            type="text"
                            value={job.dates}
                            onChange={(e) => handleWorkHistoryChange(idx, "dates", e.target.value)}
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                          />
                        </div>
                        <div>
                          <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Key Metrics / Accuracy</label>
                          <input
                            type="text"
                            value={job.metrics || ""}
                            onChange={(e) => handleWorkHistoryChange(idx, "metrics", e.target.value)}
                            placeholder="e.g. 98% accuracy on 60+ charts"
                            style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                          />
                        </div>
                      </div>

                      <div>
                        <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Responsibilities &amp; Achievements</label>
                        <textarea
                          rows={3}
                          value={job.description}
                          onChange={(e) => handleWorkHistoryChange(idx, "description", e.target.value)}
                          style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, lineHeight: 1.4 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SECTION 4: SKILLS & SYSTEMS */}
            {activeEditorSection === "skills" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>
                    Code Sets &amp; Standards
                  </label>
                  <input
                    type="text"
                    value={editForm.codeSets}
                    onChange={(e) => handleFieldChange("codeSets", e.target.value)}
                    placeholder="ICD-10-CM, CPT, HCPCS Level II, etc."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>
                    Specialized Knowledge
                  </label>
                  <input
                    type="text"
                    value={editForm.specializedKnowledge}
                    onChange={(e) => handleFieldChange("specializedKnowledge", e.target.value)}
                    placeholder="E/M MDM Leveling, CPT Modifiers, NCCI Edits, HIPAA..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>
                    EHR &amp; Billing Systems
                  </label>
                  <input
                    type="text"
                    value={editForm.ehrSoftware}
                    onChange={(e) => handleFieldChange("ehrSoftware", e.target.value)}
                    placeholder="Epic, Cerner, 3M CodeRyte, Athenahealth..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 800, color: "#475569", marginBottom: 3 }}>
                    Core Clinical Competencies
                  </label>
                  <input
                    type="text"
                    value={editForm.coreCompetencies}
                    onChange={(e) => handleFieldChange("coreCompetencies", e.target.value)}
                    placeholder="Anatomy & Physiology, Medical Terminology, CDI..."
                    style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12.5 }}
                  />
                </div>
              </div>
            )}

            {/* SECTION 5: CERTIFICATIONS & TRAINING */}
            {activeEditorSection === "certifications" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                    Certification Details (Stage 3)
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Cert Name</label>
                      <input
                        type="text"
                        value={editForm.certName}
                        onChange={(e) => handleFieldChange("certName", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Issuing Body</label>
                      <input
                        type="text"
                        value={editForm.issuingBody}
                        onChange={(e) => handleFieldChange("issuingBody", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Member ID</label>
                      <input
                        type="text"
                        value={editForm.memberId}
                        onChange={(e) => handleFieldChange("memberId", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Issue Date</label>
                      <input
                        type="text"
                        value={editForm.issueDate}
                        onChange={(e) => handleFieldChange("issueDate", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                    Academy &amp; Training (Stage 2)
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Academy Name</label>
                      <input
                        type="text"
                        value={editForm.academyName}
                        onChange={(e) => handleFieldChange("academyName", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Course Name</label>
                      <input
                        type="text"
                        value={editForm.courseName}
                        onChange={(e) => handleFieldChange("courseName", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Duration</label>
                    <input
                      type="text"
                      value={editForm.trainingDuration}
                      onChange={(e) => handleFieldChange("trainingDuration", e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: EDUCATION */}
            {activeEditorSection === "education" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                    College &amp; Higher Education
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Degree</label>
                      <input
                        type="text"
                        value={editForm.degree}
                        onChange={(e) => handleFieldChange("degree", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Graduation Year</label>
                      <input
                        type="text"
                        value={editForm.graduationYear}
                        onChange={(e) => handleFieldChange("graduationYear", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>College / University Name</label>
                    <input
                      type="text"
                      value={editForm.collegeName}
                      onChange={(e) => handleFieldChange("collegeName", e.target.value)}
                      style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                    />
                  </div>
                </div>

                <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 12 }}>
                  <span style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", display: "block", marginBottom: 8 }}>
                    High Schooling
                  </span>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>School Name</label>
                      <input
                        type="text"
                        value={editForm.schoolName}
                        onChange={(e) => handleFieldChange("schoolName", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 10.5, fontWeight: 700, color: "#64748B", marginBottom: 2 }}>Board &amp; Year</label>
                      <input
                        type="text"
                        value={editForm.schoolBoard}
                        onChange={(e) => handleFieldChange("schoolBoard", e.target.value)}
                        style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* BOTTOM: REAL-TIME LIVE PREVIEW (DIRECTLY BELOW THE EDIT SECTION) */}
          <div>
            <div style={{ background: "#0A1F3D", color: "#FFFFFF", padding: "12px 22px", borderRadius: "16px 16px 0 0", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }} className="no-print">
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: "#22C55E", animation: "pulse 1.2s infinite", display: "inline-block" }}></span>
                <span style={{ fontSize: 13, fontWeight: 800 }}>
                  Live Real-Time Preview ({activeTpl.name})
                </span>
                <span style={{ fontSize: 11, color: "#F5B41A", fontWeight: 700, marginLeft: 6 }}>
                  ✓ Updates instantly as you edit above
                </span>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  onClick={handleSaveCustomResume}
                  disabled={savingCustom}
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.3)",
                    color: "#FFFFFF",
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                  }}
                >
                  {savingCustom ? "Saving…" : "Save Edits"}
                </button>

                <button
                  type="button"
                  onClick={handleDownloadPdf}
                  disabled={downloadingPdf}
                  style={{
                    background: "var(--gold)",
                    color: "var(--navy)",
                    border: "none",
                    fontSize: 11.5,
                    fontWeight: 800,
                    padding: "6px 14px",
                    borderRadius: 6,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className={`fa-solid ${downloadingPdf ? "fa-spinner fa-spin" : "fa-download"}`}></i>
                  {downloadingPdf ? "Downloading…" : "Download PDF"}
                </button>
              </div>
            </div>

            <div style={{ background: "#525659", padding: 24, borderRadius: "0 0 16px 16px", boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }} className="printable-area">
              <div id="printable-resume">
                <TemplateComponent data={displayData} accentColor={selectedColor} />
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* FULL WIDTH PREVIEW MODE */
        <>
          {/* VERIFIED AUDIT BADGE SUMMARY BANNER */}
          {profileData && (
            <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 14, padding: 18, marginBottom: 20 }} className="no-print">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-shield-check" style={{ color: "#15803D", fontSize: 16 }}></i>
                  <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 800, color: "#15803D" }}>
                    Verified Credentials Linked to Your Resume
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("edit")}
                  style={{
                    background: "rgba(21,128,61,0.12)",
                    border: "1px solid #86EFAC",
                    color: "#15803D",
                    padding: "4px 10px",
                    borderRadius: 6,
                    fontSize: 11.5,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <i className="fa-solid fa-pen-to-square"></i> Edit Any Section
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: 11.5 }}>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #BBF7D0" }}>
                  <strong style={{ color: "var(--navy)", display: "block" }}>Identity &amp; Aadhaar (Stage 1)</strong>
                  <div>{displayData.basicInfo?.fullName || "Candidate"} · {displayData.basicInfo?.maskedAadhaar || "Aadhaar Verified"}</div>
                </div>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #BBF7D0" }}>
                  <strong style={{ color: "var(--navy)", display: "block" }}>Training &amp; Specialty (Stage 2)</strong>
                  <div>{displayData.training?.academyName || "ThoughtFlows Academy"}</div>
                </div>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #BBF7D0" }}>
                  <strong style={{ color: "var(--navy)", display: "block" }}>Accreditation (Stage 3)</strong>
                  <div>{displayData.certification?.certName || "AAPC CPC Certified"}</div>
                </div>
                <div style={{ background: "#fff", padding: 10, borderRadius: 8, border: "1px solid #BBF7D0" }}>
                  <strong style={{ color: "var(--navy)", display: "block" }}>Proctored Test (Stage 4)</strong>
                  <div>{displayData.assessment?.foundationScore || displayData.assessment?.score || 90}% Foundation Score</div>
                </div>
              </div>
            </div>
          )}

          {/* LIVE VERIFIED RESUME TEMPLATE DISPLAY */}
          <div style={{ background: "#525659", padding: 24, borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }} className="printable-area">
            <div id="printable-resume">
              <TemplateComponent data={displayData} accentColor={selectedColor} />
            </div>
          </div>
        </>
      )}

      {/* 4. BOTTOM SAVE & PROGRESSION ACTION BAR */}
      <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }} className="no-print">
        <button
          type="button"
          onClick={() => setActiveTab(activeTab === "edit" ? "preview" : "edit")}
          style={{
            background: "none",
            border: "1.5px solid #CBD5E1",
            color: "var(--navy)",
            padding: "10px 18px",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 800,
            cursor: "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <i className={`fa-solid ${activeTab === "edit" ? "fa-eye" : "fa-pen-to-square"}`}></i>
          {activeTab === "edit" ? "Switch to Full Preview" : "Edit or Add Anything in Resume"}
        </button>

        <button
          type="button"
          className="btn btn-gold"
          style={{ padding: "13px 32px", fontSize: 15, fontWeight: 800, borderRadius: 10 }}
          onClick={handleSaveAndContinue}
          disabled={saving}
        >
          {saving ? "Saving Verified Resume…" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}
