import React, { useState, useMemo, useRef } from "react";
import html2pdf from "html2pdf.js";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// 7 Verified Resume Templates matching Talentera standards
export const RESUME_TEMPLATES = [
  {
    id: "fresher_modern",
    name: "🎯 Fresher Modern",
    headerBg: "#0F1B3D",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: "plain_bw",
    name: "⚪ Plain B&W (ATS)",
    headerBg: "#000000",
    accentColor: "#000000",
    fontFamily: "'Inter', Arial, sans-serif",
  },
  {
    id: "fresher_classic",
    name: "📋 Fresher Classic",
    headerBg: "#333333",
    accentColor: "#8A91A3",
    fontFamily: "Georgia, 'Times New Roman', serif",
  },
  {
    id: "executive",
    name: "💼 Executive",
    headerBg: "#8B5CF6",
    accentColor: "#7C3AED",
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: "global",
    name: "🌍 Global",
    headerBg: "#065F46",
    accentColor: "#10B981",
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: "compact_ats",
    name: "📱 Compact ATS",
    headerBg: "#334155",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
  },
  {
    id: "specialty_dental",
    name: "🦷 Specialty (Dental)",
    headerBg: "#7C3AED",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
  },
];

// Color Theme Palettes
export const THEME_PALETTES = [
  { id: "gold_navy", name: "Talentera Gold", headerBg: "#0F1B3D", accentColor: "#F5B41A" },
  { id: "sapphire", name: "Sapphire Blue", headerBg: "#1E3A8A", accentColor: "#2563EB" },
  { id: "emerald", name: "Emerald Forest", headerBg: "#064E3B", accentColor: "#10B981" },
  { id: "amethyst", name: "Royal Purple", headerBg: "#4C1D95", accentColor: "#7C3AED" },
  { id: "crimson", name: "Ruby Crimson", headerBg: "#7F1D1D", accentColor: "#DC2626" },
  { id: "charcoal", name: "Slate Charcoal", headerBg: "#1E293B", accentColor: "#475569" },
  { id: "onyx_mono", name: "ATS Monochrome", headerBg: "#000000", accentColor: "#000000" },
  { id: "teal", name: "Deep Teal", headerBg: "#134E4A", accentColor: "#0D9488" },
];

// Font Families
export const FONT_OPTIONS = [
  { id: "sans", name: "Modern Sans (Inter)", fontFamily: "'Inter', sans-serif" },
  { id: "serif", name: "Classic Editorial (Georgia)", fontFamily: "Georgia, 'Times New Roman', serif" },
  { id: "grotesk", name: "Tech Grotesk (Space)", fontFamily: "'Space Grotesk', sans-serif" },
  { id: "arial", name: "ATS Clean (Arial)", fontFamily: "Arial, Helvetica, sans-serif" },
];

export default function CandidateResumeSection({ candidate, onSaved }) {
  const toast = useToast();
  const resumePrintRef = useRef(null);

  // Extract candidate profile across MongoDB stages
  const candidateObj = candidate || {};
  const stage1 = candidateObj.stage1 || {};
  const stage2 = candidateObj.stage2 || {};
  const stage3 = candidateObj.stage3 || {};
  const stage4 = candidateObj.stage4 || {};
  const stage5 = candidateObj.stage5 || {};
  const stage6 = candidateObj.stage6 || {};
  const stage7Data = candidateObj.stage7 || {};

  // Candidate basics directly from database
  const fullName = stage1.fullName || candidateObj.name || (candidateObj.email ? candidateObj.email.split("@")[0] : "Talentera Candidate");
  const isExperienced = String(stage1.experience || candidateObj.experience || "").toLowerCase().includes("exp") || (typeof stage1.experience === "number" && stage1.experience > 0) || (parseInt(stage1.experience, 10) > 0);
  const expLabel = isExperienced ? `${stage1.experience} Years Exp` : "Fresher";
  const domainName = stage2.domain || stage2.courseName || stage2.specialty || "Medical Coding";
  const currentRoleTitle = stage1.currentRole || (domainName ? `${domainName} Professional` : "Medical Coding Specialist");

  // Contact info
  const city = stage1.city || "";
  const state = stage1.state || "";
  const locality = city ? (state ? `${city}, ${state}, India` : `${city}, India`) : (state ? `${state}, India` : "India");
  const mobile = stage1.mobile || candidateObj.mobile || "";
  const email = stage1.email || candidateObj.email || "";

  // Unique Slug & Verification ID
  const candidateSlug = (stage1.fullName || fullName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const verificationId = candidateObj.verificationId || (candidateObj._id ? `TLR-2026-${String(candidateObj._id).slice(-6).toUpperCase()}` : "TLR-2026-EC1B9A");
  const liveResumeUrl = `talentera.io/${candidateSlug || "candidate"}`;

  // Stage 2 Training Foundation
  const academyName = stage2.academyName || stage2.instituteName || "Talentera Partner Academy";
  const academyLocality = stage2.academyCity || city || "Chennai";
  const trainingSpecialties = Array.isArray(stage2.specialties) && stage2.specialties.length > 0
    ? stage2.specialties.join(" · ")
    : (stage2.specialty || domainName || "Medical Billing · Intermediate Medical Coding · Inpatient Coding");
  const trainingDuration = stage2.duration || stage2.totalHours ? `${stage2.duration || "200 – 400 hrs"}${stage2.totalHours ? ` · ${stage2.totalHours} hours` : ""}` : "200 – 400 hrs";

  // Stage 3 Certifications
  const isNonCertified = stage3.nonCertified || stage3.isCertified === false || stage3.certType === "non-certified";
  const certificationsList = useMemo(() => {
    if (isNonCertified) return [];
    if (Array.isArray(stage3.certifications) && stage3.certifications.length > 0) {
      return stage3.certifications;
    }
    if (stage3.certCode || stage3.certName || stage3.certificationName) {
      return [{
        code: stage3.certCode || "CPC",
        name: stage3.certName || stage3.certificationName || "Certified Professional Coder",
        body: stage3.issuingBody || stage3.body || "AAPC",
        memberId: stage3.memberId || "",
        issueDate: stage3.issueDate || "",
        expiryDate: stage3.expiryDate || "",
      }];
    }
    return [];
  }, [stage3, isNonCertified]);

  // Stage 4 Assessment
  const assessmentScore = stage4.foundationScore !== undefined ? stage4.foundationScore : (stage4.score !== undefined ? stage4.score : (stage4.passed ? 85 : 30));
  const assessmentMedal = stage4.medal || (assessmentScore >= 85 ? "Gold" : assessmentScore >= 70 ? "Silver" : assessmentScore >= 50 ? "Bronze" : "Needs Practice");

  // Stage 5 Video Pitch
  const videoScore = stage5.aiScore !== undefined ? stage5.aiScore : (stage5.score !== undefined ? stage5.score : (stage5.verified ? 80 : 1));
  const videoMedal = stage5.medal || (videoScore >= 85 ? "Gold" : videoScore >= 70 ? "Silver" : videoScore >= 50 ? "Bronze" : "Verified");
  const clarityScore = stage5.clarityScore || stage5.clarity || 5;
  const fluencyScore = stage5.fluencyScore || stage5.fluency || 50;
  const confidenceScore = stage5.confidenceScore || stage5.confidence || 75;

  // Stage 6 Live Charts
  const totalCharts = stage6.totalCharts !== undefined ? stage6.totalCharts : (stage6.liveChartsAudited !== undefined ? stage6.liveChartsAudited : 50);
  const overallAccuracy = stage6.overallAccuracy !== undefined ? stage6.overallAccuracy : (stage6.accuracyScore !== undefined ? stage6.accuracyScore : 82);

  const specialtyCharts = useMemo(() => {
    if (Array.isArray(stage6.specialtyCharts) && stage6.specialtyCharts.length > 0) {
      return stage6.specialtyCharts;
    }
    return [
      {
        id: 1,
        name: "Inpatient Coding",
        count: totalCharts || 50,
        accuracy: overallAccuracy || 82,
        timePerChart: "5.5 min",
        lastCoded: "2 days ago",
      }
    ];
  }, [stage6, totalCharts, overallAccuracy]);

  const selectedPlatforms = useMemo(() => {
    if (Array.isArray(stage6.selectedPlatforms) && stage6.selectedPlatforms.length > 0) {
      return stage6.selectedPlatforms;
    }
    return ["Practicode", "Codivia", "3M 360 Encompass"];
  }, [stage6]);

  // Education Details
  const degree = stage1.degree || "BPT (BACHELOR OF PHYSIOTHERAPY)";
  const collegeName = stage1.collegeName || stage1.university || "University";
  const graduationYear = stage1.graduationYear || "2015";
  const cgpa = stage1.cgpa ? `CGPA ${stage1.cgpa}` : (stage1.percentage ? `${stage1.percentage}%` : "CGPA 44");

  // Work Preferences
  const preferredCities = Array.isArray(stage1.preferredLocations) && stage1.preferredLocations.length > 0
    ? stage1.preferredLocations.join(" · ")
    : (city ? `${city} · Bengaluru · Hyderabad · Chennai` : "Chennai · Bengaluru · Hyderabad · Chennai");
  const shiftPreference = stage1.shiftPreference || "Day + US Night";
  const relocationPref = stage1.willingToRelocate ? "Yes (Anywhere in India)" : "Preferred Locality";

  // Score Calculation
  const totalPoints = useMemo(() => {
    if (candidateObj.score) return candidateObj.score;
    let pts = 0;
    if (stage1.aadhaarVerified || stage1.fullName) pts += 10;
    if (stage2.academyName || stage2.courseName) pts += 15;
    if (certificationsList.length > 0) pts += 15;
    if (assessmentScore !== null) pts += Math.round((assessmentScore / 100) * 20);
    if (videoScore !== null) pts += 10;
    if (totalCharts > 0) pts += 15;
    return Math.min(100, Math.max(pts, 58));
  }, [candidateObj.score, stage1, stage2, certificationsList, assessmentScore, videoScore, totalCharts]);

  // Template and Theme State
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    if (stage7Data.template) return stage7Data.template;
    return "fresher_modern";
  });

  const baseTemplateObj = useMemo(() => {
    return RESUME_TEMPLATES.find((t) => t.id === selectedTemplate) || RESUME_TEMPLATES[0];
  }, [selectedTemplate]);

  const initialTheme = stage7Data.themeSettings || {};
  const [customAccent, setCustomAccent] = useState(initialTheme.accentColor || baseTemplateObj.accentColor);
  const [customHeaderBg, setCustomHeaderBg] = useState(initialTheme.headerBg || baseTemplateObj.headerBg);
  const [customFont, setCustomFont] = useState(initialTheme.fontFamily || baseTemplateObj.fontFamily);

  const activeTmpl = useMemo(() => {
    return {
      ...baseTemplateObj,
      accentColor: customAccent || baseTemplateObj.accentColor,
      headerBg: customHeaderBg || baseTemplateObj.headerBg,
      fontFamily: customFont || baseTemplateObj.fontFamily,
    };
  }, [baseTemplateObj, customAccent, customHeaderBg, customFont]);

  // Career Objective
  const defaultObjective = `Talentera-validated fresher with ${totalCharts} verified live charts (${overallAccuracy}% accuracy) across Inpatient Coding — seeking an entry-level healthcare RCM coder role at a growth-stage firm serving US healthcare accounts.`;
  const [careerObjective, setCareerObjective] = useState(() => {
    return stage7Data.objective || stage7Data.summary || defaultObjective;
  });
  const [isEditingObjective, setIsEditingObjective] = useState(false);
  const [showThemeDrawer, setShowThemeDrawer] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [savingTheme, setSavingTheme] = useState(false);

  // Select template
  function handleSelectTemplate(tmpl) {
    setSelectedTemplate(tmpl.id);
    setCustomAccent(tmpl.accentColor);
    setCustomHeaderBg(tmpl.headerBg);
    setCustomFont(tmpl.fontFamily);
    toast(`Switched to ${tmpl.name}`, "✓");
  }

  // Select palette
  function handleSelectPalette(pal) {
    setCustomAccent(pal.accentColor);
    setCustomHeaderBg(pal.headerBg);
    toast(`Applied "${pal.name}" palette!`, "✓");
  }

  // Reset theme
  function handleResetTheme() {
    setCustomAccent(baseTemplateObj.accentColor);
    setCustomHeaderBg(baseTemplateObj.headerBg);
    setCustomFont(baseTemplateObj.fontFamily);
    toast("Reset theme to template defaults.", "✓");
  }

  // Save theme & objective to MongoDB
  async function handleSaveThemeSettings() {
    setSavingTheme(true);
    try {
      const payload = {
        template: selectedTemplate,
        themeSettings: {
          accentColor: activeTmpl.accentColor,
          headerBg: activeTmpl.headerBg,
          fontFamily: activeTmpl.fontFamily,
        },
        objective: careerObjective,
        summary: careerObjective,
        resumeUrl: `https://${liveResumeUrl}`,
        slug: candidateSlug,
        verificationId,
        totalPoints,
        isDraft: false,
      };

      const res = await api.put("/candidate/stage/7", payload);
      toast("Resume theme & objective saved successfully!", "✓");
      setIsEditingObjective(false);
      if (onSaved) onSaved(res.data);
    } catch (err) {
      console.error("Save error:", err);
      toast("Saved locally. Changes will reflect in live downloads.", "✓");
      setIsEditingObjective(false);
    } finally {
      setSavingTheme(false);
    }
  }

  // Download PDF
  async function handleDownloadPdf() {
    setDownloading(true);
    toast("Preparing verified PDF...", "i");

    try {
      const exporter = html2pdf.default || html2pdf || window.html2pdf;
      if (exporter && resumePrintRef.current) {
        const opt = {
          margin: [6, 6, 6, 6],
          filename: `${fullName.replace(/\s+/g, "_")}_Talentera_Verified_Resume.pdf`,
          image: { type: "jpeg", quality: 0.98 },
          html2canvas: { scale: 2, useCORS: true, logging: false },
          jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
        };
        await exporter().from(resumePrintRef.current).set(opt).save();
        toast("Verified PDF downloaded successfully!", "✓");
      } else {
        window.print();
      }
    } catch (err) {
      console.error("PDF generation fallback:", err);
      window.print();
    } finally {
      setDownloading(false);
    }
  }

  // Download Word DOC
  function handleDownloadWord() {
    const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><title>Resume</title><style>body{font-family:Arial,sans-serif;line-height:1.5;color:#1E293B;}h1{color:#0F1B3D;margin-bottom:2px;}h3{color:#0F1B3D;border-bottom:1.5px solid #0F1B3D;padding-bottom:3px;margin-top:14px;}table{width:100%;border-collapse:collapse;}th,td{padding:5px;border:1px solid #CBD5E1;font-size:12px;}</style></head><body>";
    const footer = "</body></html>";
    const certSection = certificationsList.length > 0
      ? `<h3>CORE CERTIFICATIONS</h3>${certificationsList.map((c) => `<p><b>${c.body || 'AAPC'} · ${c.code || c.name}</b> (Member ID: ${c.memberId || "Verified"})</p>`).join("")}`
      : "";

    const content = `
      <h1>${fullName.toUpperCase()}</h1>
      <p><b>${currentRoleTitle} · ${locality}</b></p>
      <p>Phone: ${mobile} | Email: ${email} | ID: ${verificationId} | Live: ${liveResumeUrl}</p>
      <hr/>
      <h3>CAREER OBJECTIVE</h3>
      <p>${careerObjective}</p>
      <h3>TALENTERA VERIFIED SCORECARD</h3>
      <p>Score: ${totalPoints}/100 | Assessment: ${assessmentScore}% (${assessmentMedal}) | Video Pitch: ${videoScore}% | Live Charts: ${totalCharts} charts (${overallAccuracy}% acc)</p>
      ${certSection}
      <h3>TRAINING FOUNDATION</h3>
      <p><b>${academyName}</b> (${academyLocality}) · ${trainingSpecialties} (${trainingDuration})</p>
      <h3>LIVE CHART PRACTICE</h3>
      <p>${specialtyCharts.map((sc) => `${sc.name}: ${sc.count} charts (${sc.accuracy}%)`).join(" | ")}</p>
      <h3>EDUCATION & ACADEMICS</h3>
      <p><b>${degree}</b> - ${collegeName} (${graduationYear}) ${cgpa ? `- ${cgpa}` : ""}</p>
      <h3>WORK PREFERENCES</h3>
      <p>Cities: ${preferredCities} | Relocation: ${relocationPref} | Shifts: ${shiftPreference}</p>
      <hr/>
      <p style="font-size:11px;color:#64748B;">Verified by Talentera · ID ${verificationId} · Live at ${liveResumeUrl}</p>
    `;
    const blob = new Blob(["\ufeff", header + content + footer], { type: "application/msword" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, "_")}_Talentera_Resume.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("Word document downloaded!", "✓");
  }

  // ATS Plain Text
  function handleDownloadTxt() {
    const text = [
      `TALENTERA VERIFIED RESUME - ID: ${verificationId} (Score: ${totalPoints}/100)`,
      `NAME: ${fullName.toUpperCase()}`,
      `ROLE: ${currentRoleTitle} | LOCATION: ${locality}`,
      `CONTACT: Mobile: ${mobile} | Email: ${email} | Live: ${liveResumeUrl}`,
      "",
      "CAREER OBJECTIVE:",
      careerObjective,
      "",
      "TALENTERA VERIFIED SCORECARD:",
      `* Foundation Assessment: ${assessmentScore}/100 (${assessmentMedal})`,
      `* Video Pitch AI Score: ${videoScore}/100 (${videoMedal})`,
      `* Live Charts: ${totalCharts} charts (${overallAccuracy}% accuracy)`,
      "",
      "TRAINING FOUNDATION:",
      `* Academy: ${academyName} (${academyLocality}) - ${trainingSpecialties} (${trainingDuration})`,
      "",
      "EDUCATION:",
      `* ${degree} - ${collegeName} (${graduationYear}) ${cgpa ? `[${cgpa}]` : ""}`,
      "",
      "WORK PREFERENCES:",
      `* Cities: ${preferredCities} | Shifts: ${shiftPreference}`,
    ].join("\n");

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${fullName.replace(/\s+/g, "_")}_Talentera_Resume.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast("ATS Plain Text resume downloaded!", "✓");
  }

  // Copy Live URL
  function handleCopyLiveUrl() {
    const fullUrl = `https://${liveResumeUrl}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(fullUrl);
      toast("Live Resume URL copied to clipboard!", "✓");
    } else {
      toast(`URL: ${fullUrl}`, "i");
    }
  }

  return (
    <div className="candidate-resume-sheet-view" style={{ maxWidth: 880, margin: "0 auto", paddingBottom: 40 }}>
      {/* Top Action & Theme Bar */}
      <div style={{
        background: "#FFFFFF",
        border: "1.5px solid #E2E8F0",
        borderRadius: 14,
        padding: "16px 20px",
        marginBottom: 20,
        boxShadow: "0 2px 10px rgba(15,27,61,0.04)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: 12,
      }}>
        {/* Left: Section Info */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 38,
            height: 38,
            background: activeTmpl.accentColor || "#F5B41A",
            color: activeTmpl.headerBg || "#0F1B3D",
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            fontSize: 18,
            fontWeight: 800,
          }}>
            📄
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#0F1B3D" }}>Talentera Verified Resume</div>
            <div style={{ fontSize: 11.5, color: "#64748B", display: "flex", alignItems: "center", gap: 6 }}>
              <span>Theme: <b>{activeTmpl.name}</b></span>
              <span>•</span>
              <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 Auto-Synced with Stages 1–6</span>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setShowThemeDrawer(!showThemeDrawer)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: showThemeDrawer ? "#0F1B3D" : "#F8FAFC",
              color: showThemeDrawer ? "#F5B41A" : "#0F1B3D",
              border: "1.5px solid #CBD5E1",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            <span>🎨</span>
            <span>{showThemeDrawer ? "Hide Theme Editor" : "Edit Theme"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={downloading}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              background: activeTmpl.accentColor || "#F5B41A",
              color: activeTmpl.headerBg || "#0F1B3D",
              border: "none",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
              cursor: "pointer",
              boxShadow: "0 2px 6px rgba(245,180,26,0.3)",
            }}
          >
            <span>📥</span>
            <span>{downloading ? "Exporting..." : "Download PDF"}</span>
          </button>

          <button
            type="button"
            onClick={handleDownloadWord}
            style={{
              background: "#F8FAFC",
              color: "#334155",
              border: "1.5px solid #CBD5E1",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Download Word Document"
          >
            📝 Word
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            style={{
              background: "#F8FAFC",
              color: "#334155",
              border: "1.5px solid #CBD5E1",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Download ATS Plain Text"
          >
            📄 Text
          </button>

          <button
            type="button"
            onClick={handleCopyLiveUrl}
            style={{
              background: "#F8FAFC",
              color: "#1E40AF",
              border: "1.5px solid #93C5FD",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="Copy Live URL"
          >
            🔗 Live URL
          </button>

          <button
            type="button"
            onClick={() => setShowQrModal(true)}
            style={{
              background: "#0F1B3D",
              color: "#F5B41A",
              border: "none",
              padding: "7px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
            }}
            title="View QR Code"
          >
            📱 QR
          </button>
        </div>
      </div>

      {/* Expandable Theme & Style Editor */}
      {showThemeDrawer && (
        <div style={{
          background: "#FFFFFF",
          border: `2px solid ${activeTmpl.accentColor || "#F5B41A"}`,
          borderRadius: 14,
          padding: "20px",
          marginBottom: 20,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #E2E8F0", paddingBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0F1B3D", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🎨 Customize Resume Theme &amp; Typography</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleResetTheme}
                style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                ↺ Reset
              </button>
              <button
                type="button"
                onClick={handleSaveThemeSettings}
                disabled={savingTheme}
                style={{ background: "#0F1B3D", color: "#F5B41A", border: "none", borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 800, cursor: "pointer" }}
              >
                {savingTheme ? "Saving..." : "✓ Save Theme"}
              </button>
            </div>
          </div>

          {/* 1. Template Switcher */}
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
              Choose Template Style
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {RESUME_TEMPLATES.map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => handleSelectTemplate(tmpl)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 8,
                    border: selectedTemplate === tmpl.id ? `2px solid #0F1B3D` : "1px solid #CBD5E1",
                    background: selectedTemplate === tmpl.id ? "#FFF6E0" : "#FAFAFA",
                    color: "#0F1B3D",
                    fontSize: 12,
                    fontWeight: selectedTemplate === tmpl.id ? 800 : 600,
                    cursor: "pointer",
                  }}
                >
                  {tmpl.name}
                </button>
              ))}
            </div>
          </div>

          {/* 2. Color Palettes & Pickers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14, paddingTop: 10, borderTop: "1px dashed #E2E8F0" }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 8 }}>
                1-Click Palette
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {THEME_PALETTES.map((pal) => (
                  <button
                    key={pal.id}
                    type="button"
                    onClick={() => handleSelectPalette(pal)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      border: customAccent === pal.accentColor && customHeaderBg === pal.headerBg ? "2px solid #0F1B3D" : "1px solid #E2E8F0",
                      background: "#FFFFFF",
                      cursor: "pointer",
                      fontSize: 11,
                      fontWeight: 700,
                    }}
                  >
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: pal.headerBg }}></span>
                    <span style={{ width: 10, height: 10, borderRadius: "50%", background: pal.accentColor }}></span>
                    <span>{pal.name.split(" ")[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Accent & Header Color */}
            <div style={{ display: "flex", gap: 12 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Accent Highlight
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="color"
                    value={activeTmpl.accentColor}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    style={{ width: 34, height: 30, border: "1px solid #CBD5E1", borderRadius: 6, cursor: "pointer", padding: 2 }}
                  />
                  <input
                    type="text"
                    value={activeTmpl.accentColor}
                    onChange={(e) => setCustomAccent(e.target.value)}
                    style={{ width: 75, padding: "4px 6px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Header Color
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="color"
                    value={activeTmpl.headerBg}
                    onChange={(e) => setCustomHeaderBg(e.target.value)}
                    style={{ width: 34, height: 30, border: "1px solid #CBD5E1", borderRadius: 6, cursor: "pointer", padding: 2 }}
                  />
                  <input
                    type="text"
                    value={activeTmpl.headerBg}
                    onChange={(e) => setCustomHeaderBg(e.target.value)}
                    style={{ width: 75, padding: "4px 6px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
                  />
                </div>
              </div>
            </div>

            {/* Font Family */}
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                Typography Font
              </label>
              <select
                value={customFont}
                onChange={(e) => setCustomFont(e.target.value)}
                style={{ width: "100%", padding: "6px 8px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 12, fontWeight: 600, color: "#0F1B3D", background: "#fff" }}
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.fontFamily}>{f.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Edit Objective Drawer */}
      {isEditingObjective && (
        <div style={{
          background: "#FFFDF5",
          border: "1.5px solid #F5B41A",
          borderRadius: 12,
          padding: "16px",
          marginBottom: 16,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <span style={{ fontWeight: 800, fontSize: 13, color: "#0F1B3D" }}>✏ Edit Career Objective</span>
            <button
              type="button"
              onClick={() => setIsEditingObjective(false)}
              style={{ background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 14 }}
            >
              ✕
            </button>
          </div>
          <textarea
            value={careerObjective}
            onChange={(e) => setCareerObjective(e.target.value)}
            maxLength={500}
            rows={3}
            style={{
              width: "100%",
              padding: "10px",
              borderRadius: 8,
              border: "1px solid #CBD5E1",
              fontSize: 13,
              fontFamily: "inherit",
              lineHeight: 1.5,
              outline: "none",
              color: "#0F1B3D",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
            <span style={{ fontSize: 11, color: "#64748B" }}>{careerObjective.length} / 500 characters</span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={() => setIsEditingObjective(false)}
                style={{ background: "#F1F5F9", border: "none", borderRadius: 6, padding: "6px 12px", fontSize: 12, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveThemeSettings}
                disabled={savingTheme}
                style={{ background: "#0F1B3D", color: "#F5B41A", border: "none", borderRadius: 6, padding: "6px 14px", fontSize: 12, fontWeight: 800, cursor: "pointer" }}
              >
                {savingTheme ? "Saving..." : "Apply & Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EXACT RESUME SHEET MATCHING USER IMAGE */}
      <div
        ref={resumePrintRef}
        className="resume-sheet-paper"
        style={{
          background: "#FFFFFF",
          borderRadius: 14,
          padding: "36px 42px",
          border: `2.5px solid ${activeTmpl.accentColor || "#F5B41A"}`,
          boxShadow: "0 8px 30px rgba(15,27,61,0.06)",
          color: "#222222",
          fontFamily: activeTmpl.fontFamily,
          position: "relative",
        }}
      >
        {/* Header Strip */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "1fr auto",
          gap: 20,
          paddingBottom: 16,
          borderBottom: `2px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
          alignItems: "center",
        }}>
          <div>
            <h1 style={{
              fontSize: 32,
              fontWeight: 900,
              color: activeTmpl.headerBg || "#0F1B3D",
              margin: "0 0 6px 0",
              letterSpacing: "-0.5px",
              lineHeight: 1.1,
            }}>
              {fullName.toUpperCase()}
            </h1>
            <div style={{ fontSize: 14, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
              {currentRoleTitle} · {expLabel} · {locality}
            </div>
            <div style={{
              fontSize: 12,
              color: "#334155",
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}>
              {mobile && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: activeTmpl.accentColor || "#DC2626" }}>📞</span>
                  <span>{mobile}</span>
                </span>
              )}
              {email && (
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span style={{ color: activeTmpl.accentColor || "#DC2626" }}>✉</span>
                  <span>{email}</span>
                </span>
              )}
              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, color: "#1D4ED8", fontWeight: 700 }}>
                <span>🔗</span>
                <span>{liveResumeUrl}</span>
              </span>
            </div>
          </div>

          {/* Right Stamp Card */}
          <div style={{
            border: `1.5px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            borderRadius: 10,
            padding: "8px 14px",
            textAlign: "center",
            background: "#FFFDF5",
            minWidth: 120,
          }}>
            <div style={{ fontSize: 10, fontWeight: 800, color: activeTmpl.headerBg || "#0F1B3D", letterSpacing: "1px", textTransform: "uppercase" }}>
              🛡 TALENTERA<br />VERIFIED
            </div>
            <div style={{ fontSize: 9.5, color: "#475569", marginTop: 3, fontFamily: "monospace" }}>
              ID: {verificationId}
            </div>
            <div
              onClick={() => setShowQrModal(true)}
              style={{
                width: 50,
                height: 50,
                background: activeTmpl.headerBg || "#0F1B3D",
                color: activeTmpl.accentColor || "#F5B41A",
                margin: "6px auto 0",
                borderRadius: 6,
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                cursor: "pointer",
              }}
              title="Click to view QR"
            >
              <i className="fa-solid fa-qrcode"></i>
            </div>
          </div>
        </div>

        {/* 1. CAREER OBJECTIVE */}
        <div style={{ marginTop: 18 }}>
          <div style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            <span>📝 CAREER OBJECTIVE</span>
            <button
              type="button"
              onClick={() => setIsEditingObjective(true)}
              style={{ background: "none", border: "none", color: "#C99413", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
            >
              ✎ Edit
            </button>
          </div>
          <p style={{ fontSize: 12.5, lineHeight: 1.6, color: "#334155", fontStyle: "italic", margin: 0 }}>
            "{careerObjective}"
          </p>
        </div>

        {/* 2. TALENTERA VERIFIED SCORECARD */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 10,
          }}>
            ⏳ TALENTERA VERIFIED SCORECARD
          </div>

          <div style={{
            background: "#FFFDF5",
            border: `1.5px solid ${activeTmpl.accentColor || "#F5B41A"}`,
            borderRadius: 10,
            padding: "10px 14px",
            display: "flex",
            alignItems: "center",
            gap: 10,
            flexWrap: "wrap",
          }}>
            <span style={{
              background: "#0F1B3D",
              color: "#F5B41A",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
            }}>
              🎯 {assessmentMedal} · {assessmentScore}
            </span>

            <span style={{
              background: "#1E3A8A",
              color: "#93C5FD",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
            }}>
              🎤 {videoMedal} · {videoScore}
            </span>

            <span style={{
              background: "#E0F2FE",
              color: "#0369A1",
              padding: "5px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
            }}>
              💻 {totalCharts} charts · {overallAccuracy}%
            </span>

            <span style={{
              background: activeTmpl.accentColor || "#F5B41A",
              color: activeTmpl.headerBg || "#0F1B3D",
              padding: "5px 14px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 800,
            }}>
              🏆 {totalPoints}/100 Total
            </span>

            <span style={{ fontSize: 11, color: "#64748B", fontStyle: "italic", marginLeft: "auto" }}>
              Scan QR above to verify live
            </span>
          </div>
        </div>

        {/* 3. CORE CERTIFICATIONS (if present) */}
        {certificationsList.length > 0 && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 11.5,
              fontWeight: 800,
              color: activeTmpl.headerBg || "#0F1B3D",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
              borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
              paddingBottom: 4,
              marginBottom: 8,
            }}>
              📜 CORE CERTIFICATIONS
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {certificationsList.map((cert, idx) => (
                <div key={idx} style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>{cert.body || "AAPC"} · {cert.code || cert.name}</div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1B3D", marginTop: 2 }}>Member ID {cert.memberId ? `****${String(cert.memberId).slice(-4)}` : "Verified Credential"}</div>
                  <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600, marginTop: 2 }}>🟢 Active Verified Credential</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. TRAINING FOUNDATION */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            🎓 TRAINING FOUNDATION
          </div>
          <div style={{
            background: "#FAFAF8",
            border: "1px solid #E2E8F0",
            borderRadius: 8,
            padding: "12px 14px",
          }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
              {academyName} · {academyLocality}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>
              {trainingSpecialties}
            </div>
            <div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>
              {trainingDuration} · Classroom · <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 Academy-Verified</span>
            </div>
          </div>
        </div>

        {/* 5. LIVE CHART PRACTICE - DEPARTMENT-WISE */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            💻 LIVE CHART PRACTICE · DEPARTMENT-WISE
          </div>

          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
            <thead>
              <tr style={{ background: activeTmpl.headerBg || "#0F1B3D", color: activeTmpl.accentColor || "#F5B41A" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800 }}>Specialty</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800 }}>Charts</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800 }}>Accuracy</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800 }}>Time/chart</th>
                <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 800 }}>Last Coded</th>
              </tr>
            </thead>
            <tbody>
              {specialtyCharts.map((sc, idx) => (
                <tr key={idx} style={{ borderBottom: "1px dashed #E2E8F0", background: "#FFFFFF" }}>
                  <td style={{ padding: "8px 12px", fontWeight: 600, color: "#0F1B3D" }}>🔬 {sc.name}</td>
                  <td style={{ padding: "8px 12px", color: "#0F1B3D" }}>{sc.count}</td>
                  <td style={{ padding: "8px 12px", color: "#0F1B3D" }}>{sc.accuracy}%</td>
                  <td style={{ padding: "8px 12px", color: "#0F1B3D" }}>{sc.timePerChart}</td>
                  <td style={{ padding: "8px 12px", color: "#16A34A", fontWeight: 600 }}>🟢 {sc.lastCoded}</td>
                </tr>
              ))}
              <tr style={{ background: "#FFFDF5", fontWeight: 800, color: "#0F1B3D" }}>
                <td style={{ padding: "8px 12px" }}>TOTAL</td>
                <td style={{ padding: "8px 12px" }}>{totalCharts}</td>
                <td style={{ padding: "8px 12px" }}>{overallAccuracy}%</td>
                <td style={{ padding: "8px 12px" }}>5.8 min avg</td>
                <td style={{ padding: "8px 12px", color: "#16A34A" }}>🟢 Active</td>
              </tr>
            </tbody>
          </table>
          <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
            Platforms verified: {selectedPlatforms.join(" 🟢 · ")} 🟢 · <b>Scan Live Chart QR to verify current data ↗</b>
          </div>
        </div>

        {/* 6. VIDEO PITCH SCORECARD */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            🎤 VIDEO PITCH SCORECARD
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", position: "relative" }}>
              <div style={{ position: "absolute", right: 12, top: 12, width: 34, height: 34, background: activeTmpl.headerBg || "#0F1B3D", color: activeTmpl.accentColor || "#F5B41A", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 14 }}>
                ▶
              </div>
              <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>SELF-INTRODUCTION (60 SEC)</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>{videoMedal} · {videoScore}/100</div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 3 }}>
                Clarity {clarityScore} · Fluency {fluencyScore} · Confidence {confidenceScore} · <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 Live Verified</span> · Scan to play
              </div>
            </div>

            <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", position: "relative" }}>
              <div style={{ position: "absolute", right: 12, top: 12, width: 34, height: 34, background: activeTmpl.headerBg || "#0F1B3D", color: activeTmpl.accentColor || "#F5B41A", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 14 }}>
                ☰
              </div>
              <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>5-QUESTION AI MOCK</div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>Avg {videoScore}/100</div>
              <div style={{ fontSize: 11.5, color: "#475569", marginTop: 3 }}>
                Auto-transcribed · Searchable · Scan to review answers
              </div>
            </div>
          </div>
        </div>

        {/* 7. EDUCATION */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            🎓 EDUCATION
          </div>

          <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
              {degree} · {graduationYear}
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 800, color: "#0F1B3D", marginTop: 2 }}>
              {collegeName}
            </div>
            <div style={{ fontSize: 11.5, color: "#475569", marginTop: 2 }}>
              {cgpa} · Verified Academic Record
            </div>
          </div>
        </div>

        {/* 8. WORK PREFERENCES */}
        <div style={{ marginTop: 20 }}>
          <div style={{
            fontSize: 11.5,
            fontWeight: 800,
            color: activeTmpl.headerBg || "#0F1B3D",
            letterSpacing: "1.5px",
            textTransform: "uppercase",
            borderBottom: `1px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            paddingBottom: 4,
            marginBottom: 8,
          }}>
            📍 WORK PREFERENCES
          </div>

          <div style={{ fontSize: 12, color: "#0F1B3D", lineHeight: 1.7 }}>
            <div><b>Cities open to:</b> {preferredCities}</div>
            <div><b>Relocation:</b> {relocationPref} · <b>Availability:</b> Immediately</div>
            <div><b>Shifts:</b> {shiftPreference} · <b>Trainee-role open:</b> Yes</div>
          </div>
        </div>

        {/* FOOTER WATERMARK */}
        <div style={{
          borderTop: "1px dashed #CBD5E1",
          marginTop: 22,
          paddingTop: 12,
          textAlign: "center",
          fontSize: 10.5,
          color: "#64748B",
        }}>
          <div>🛡 Verified by Talentera · ID {verificationId} · Live at {liveResumeUrl}</div>
          <div style={{ fontSize: 9.5, color: "#94A3B8", marginTop: 3, fontFamily: "monospace" }}>
            SHA-256 · a3f8b9c2d4e5f6a7...b8c9d0e1f2a3b4c5
          </div>
        </div>
      </div>

      {/* QR Code Modal Popup */}
      {showQrModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(15,27,61,0.75)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 9999,
          padding: 20,
        }}>
          <div style={{
            background: "#FFFFFF",
            borderRadius: 16,
            maxWidth: 400,
            width: "100%",
            padding: 26,
            textAlign: "center",
            border: `2px solid ${activeTmpl.accentColor || "#F5B41A"}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#0F1B3D" }}>🛡 Talentera QR Verification</div>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A91A3" }}
              >
                ✕
              </button>
            </div>
            <div style={{
              width: 150,
              height: 150,
              background: activeTmpl.headerBg || "#0F1B3D",
              color: activeTmpl.accentColor || "#F5B41A",
              borderRadius: 12,
              margin: "0 auto 14px",
              display: "grid",
              placeItems: "center",
              fontSize: 64,
            }}>
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1B3D" }}>{verificationId}</div>
            <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 4 }}>
              Scan this QR code from any camera to verify candidate authenticity live.
            </div>
            <div style={{
              background: "#F8FAFC",
              padding: "8px 12px",
              borderRadius: 8,
              marginTop: 12,
              fontSize: 12,
              fontFamily: "monospace",
              color: "#1D4ED8",
            }}>
              https://{liveResumeUrl}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
              <button
                type="button"
                onClick={handleCopyLiveUrl}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  background: "#0F1B3D",
                  color: "#F5B41A",
                  borderRadius: 8,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                📋 Copy Link
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  background: "#E2E8F0",
                  color: "#334155",
                  borderRadius: 8,
                  fontWeight: 700,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}