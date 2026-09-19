import React, { useState, useMemo, useRef } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";
import { exportResumePdf, exportResumeWord } from "../utils/resumeExport.js";
import { joinUnique } from "../utils/resumeSubtitle.js";
import { buildCareerObjectives, getCertStatus, getExperienceLevel, isLegacyAutoObjective } from "../utils/careerObjective.js";

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
    headerBg: "#111827",
    accentColor: "#374151",
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

// Rich Color Theme Palettes
export const THEME_PALETTES = [
  { id: "gold_navy", name: "Talentera Gold", headerBg: "#0F1B3D", accentColor: "#F5B41A", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "sapphire", name: "Sapphire Royal", headerBg: "#1E3A8A", accentColor: "#2563EB", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "emerald", name: "Emerald Forest", headerBg: "#064E3B", accentColor: "#10B981", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "amethyst", name: "Imperial Purple", headerBg: "#4C1D95", accentColor: "#8B5CF6", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "crimson", name: "Ruby Crimson", headerBg: "#7F1D1D", accentColor: "#DC2626", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "charcoal", name: "Slate Charcoal", headerBg: "#1E293B", accentColor: "#64748B", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "onyx_mono", name: "ATS Monochrome", headerBg: "#111827", accentColor: "#374151", paperBg: "#FFFFFF", textColor: "#111827" },
  { id: "teal", name: "Nordic Teal", headerBg: "#134E4A", accentColor: "#0D9488", paperBg: "#FFFFFF", textColor: "#1E293B" },
  { id: "rose_gold", name: "Rose Gold", headerBg: "#4A1525", accentColor: "#E11D48", paperBg: "#FFFDFD", textColor: "#1E293B" },
  { id: "corporate_cyan", name: "Steel Cyan", headerBg: "#0C4A6E", accentColor: "#0284C7", paperBg: "#FFFFFF", textColor: "#0F172A" },
];

// Paper Surface Tones
export const PAPER_TONES = [
  { id: "white", name: "Pure White", color: "#FFFFFF", border: "#E2E8F0" },
  { id: "cream", name: "Soft Cream", color: "#FCFBF7", border: "#E8E2D5" },
  { id: "ivory", name: "Warm Ivory", color: "#FFFDF5", border: "#EFE6CE" },
  { id: "slate", name: "Cool Slate", color: "#F8FAFC", border: "#E2E8F0" },
  { id: "mint", name: "Mint Ice", color: "#F0FDF4", border: "#DCFCE7" },
];

// Font Families
export const FONT_OPTIONS = [
  { id: "sans", name: "Modern Sans (Inter)", fontFamily: "'Inter', sans-serif" },
  { id: "serif", name: "Classic Editorial (Georgia)", fontFamily: "Georgia, 'Times New Roman', serif" },
  { id: "grotesk", name: "Tech Grotesk (Space)", fontFamily: "'Space Grotesk', sans-serif" },
  { id: "arial", name: "ATS Clean (Arial)", fontFamily: "Arial, Helvetica, sans-serif" },
  { id: "playfair", name: "Executive Serif (Playfair)", fontFamily: "'Playfair Display', Georgia, serif" },
  { id: "roboto", name: "Clean Modern (Roboto)", fontFamily: "'Roboto', sans-serif" },
];

// Header Styles
export const HEADER_STYLES = [
  { id: "split_stamp", name: "Badge & QR (Default)", desc: "Left info block with right Talentera Verification stamp" },
  { id: "solid_banner", name: "Full Solid Banner", desc: "Top colored banner with white/accent header text" },
  { id: "centered_exec", name: "Centered Executive", desc: "Centered candidate profile with accent divider" },
  { id: "modern_boxed", name: "Modern Frame Card", desc: "Minimalist boxed header with integrated badge" },
];

// Outer Border Styles
export const BORDER_STYLES = [
  { id: "accent_solid", name: "Solid Accent (2.5px)", desc: "Prominent outer border in accent color" },
  { id: "thin_subtle", name: "Thin Slate (1px)", desc: "Subtle minimalist card border" },
  { id: "left_bar", name: "Left Accent Bar", desc: "Bold vertical accent stripe on left edge only" },
  { id: "frameless", name: "Frameless Clean", desc: "No border, soft float shadow" },
];

// Section Heading Styles
export const SECTION_STYLES = [
  { id: "bottom_line", name: "Classic Underline", desc: "Clean line beneath section title" },
  { id: "pill_badge", name: "Solid Pill Tag", desc: "Filled colored badge behind section title" },
  { id: "left_stripe", name: "Left Accent Stripe", desc: "Vertical colored bar next to section title" },
  { id: "minimal_bold", name: "Minimalist Bold", desc: "Simple clean bold uppercase title" },
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
  const preferredCities = useMemo(() => {
    if (Array.isArray(stage1.preferredCities) && stage1.preferredCities.length > 0) {
      return stage1.preferredCities.filter(Boolean).join(" · ");
    }
    if (Array.isArray(stage1.preferredLocations) && stage1.preferredLocations.length > 0) {
      return stage1.preferredLocations.filter(Boolean).join(" · ");
    }
    if (typeof stage1.preferredLocations === "string" && stage1.preferredLocations.trim()) {
      return stage1.preferredLocations.trim();
    }
    if (typeof stage1.preferredCities === "string" && stage1.preferredCities.trim()) {
      return stage1.preferredCities.trim();
    }
    return city ? city : "Open to Relocation";
  }, [stage1, city]);
  const shiftPreference = stage1.shiftPreference || "Day shift";
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
  const [customPaperBg, setCustomPaperBg] = useState(initialTheme.paperBg || "#FFFFFF");
  const [customTextColor, setCustomTextColor] = useState(initialTheme.textColor || "#1E293B");
  const [customFontScale, setCustomFontScale] = useState(initialTheme.fontScale || "normal"); // compact, normal, large
  const [customLineHeight, setCustomLineHeight] = useState(initialTheme.lineHeight || "normal"); // compact, normal, relaxed
  const [customHeaderStyle, setCustomHeaderStyle] = useState(initialTheme.headerStyle || "split_stamp");
  const [customBorderStyle, setCustomBorderStyle] = useState(initialTheme.borderStyle || "accent_solid");
  const [customSectionHeadingStyle, setCustomSectionHeadingStyle] = useState(initialTheme.sectionHeadingStyle || "bottom_line");
  const [themeActiveTab, setThemeActiveTab] = useState("colors"); // colors, typography, layout, visibility

  // Section visibility toggles
  const initialSections = initialTheme.sections || {
    objective: true,
    scorecard: true,
    certifications: true,
    training: true,
    liveCharts: true,
    videoPitch: true,
    education: true,
    preferences: true,
    qrStamp: true,
  };
  const [visibleSections, setVisibleSections] = useState(initialSections);

  function toggleSection(secKey) {
    setVisibleSections((prev) => ({
      ...prev,
      [secKey]: !prev[secKey],
    }));
  }

  const activeTmpl = useMemo(() => {
    return {
      ...baseTemplateObj,
      accentColor: customAccent || baseTemplateObj.accentColor,
      headerBg: customHeaderBg || baseTemplateObj.headerBg,
      fontFamily: customFont || baseTemplateObj.fontFamily,
    };
  }, [baseTemplateObj, customAccent, customHeaderBg, customFont]);

  // Career Objective - tailored to experience level + Stage 3 certification status (utils/careerObjective.js)
  const defaultObjective = useMemo(() => {
    const { level, years } = getExperienceLevel(stage1, candidateObj);
    return buildCareerObjectives({
      level,
      years,
      status: getCertStatus(stage3, certificationsList),
      certCodes: certificationsList.map((c) => c.code || c.name),
      pursuingCert: stage3.pursuingDetails?.cert || stage3.pursuingCert || "",
      expectedExam: stage3.pursuingDetails?.expectedDate || "",
      totalCharts,
      accuracy: overallAccuracy,
      specialties: specialtyCharts.length > 0 ? specialtyCharts.map((sc) => sc.name).filter(Boolean).slice(0, 3).join(", ") : domainName,
      roleTitle: stage1.currentRole || "",
      academyName,
      assessmentScore,
    }).options[0].text;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage1, stage3, certificationsList, totalCharts, overallAccuracy, specialtyCharts, domainName, academyName, assessmentScore]);
  const [careerObjective, setCareerObjective] = useState(() => {
    const saved = stage7Data.objective || stage7Data.summary;
    const raw = saved && !isLegacyAutoObjective(saved) ? saved : defaultObjective;
    return raw
      .replace(/Talentera[- ]verified/gi, "Qualified")
      .replace(/Talentera[- ]validated/gi, "Qualified")
      .replace(/Talentera skillset/gi, "skillset")
      .replace(/Talentera/gi, "")
      .replace(/\s+/g, " ")
      .trim();
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
    if (pal.paperBg) setCustomPaperBg(pal.paperBg);
    if (pal.textColor) setCustomTextColor(pal.textColor);
    toast(`Applied "${pal.name}" palette!`, "✓");
  }

  // Reset theme
  function handleResetTheme() {
    setCustomAccent(baseTemplateObj.accentColor);
    setCustomHeaderBg(baseTemplateObj.headerBg);
    setCustomFont(baseTemplateObj.fontFamily);
    setCustomPaperBg("#FFFFFF");
    setCustomTextColor("#1E293B");
    setCustomFontScale("normal");
    setCustomLineHeight("normal");
    setCustomHeaderStyle("split_stamp");
    setCustomBorderStyle("accent_solid");
    setCustomSectionHeadingStyle("bottom_line");
    setVisibleSections({
      objective: true,
      scorecard: true,
      certifications: true,
      training: true,
      liveCharts: true,
      videoPitch: true,
      education: true,
      preferences: true,
      qrStamp: true,
    });
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
          paperBg: customPaperBg,
          textColor: customTextColor,
          fontScale: customFontScale,
          lineHeight: customLineHeight,
          headerStyle: customHeaderStyle,
          borderStyle: customBorderStyle,
          sectionHeadingStyle: customSectionHeadingStyle,
          sections: visibleSections,
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
      toast("Resume custom theme & settings saved successfully!", "✓");
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

  // Download PDF directly without print pop-up
  async function handleDownloadPdf() {
    setDownloading(true);
    toast("Generating verified high-resolution PDF...", "i");

    try {
      if (!resumePrintRef.current) {
        throw new Error("Resume sheet is not ready.");
      }
      await exportResumePdf(resumePrintRef.current, fullName);
      toast("Verified PDF downloaded successfully!", "✓");
    } catch (err) {
      console.error("PDF generation error:", err);
      toast("PDF export failed: " + (err.message || "Unknown error"), "!");
    } finally {
      setDownloading(false);
    }
  }

  // Download Word DOC with Full XML Formatting
  function handleDownloadWord() {
    try {
      exportResumeWord({
        fullName,
        currentRoleTitle,
        expLabel,
        locality,
        mobile,
        email,
        verificationId,
        liveResumeUrl,
        careerObjective,
        totalPoints,
        assessmentScore,
        assessmentMedal,
        videoScore,
        videoMedal,
        clarityScore,
        fluencyScore,
        confidenceScore,
        totalCharts,
        overallAccuracy,
        certificationsList,
        academyName,
        academyLocality,
        domainName,
        trainingSpecialties,
        trainingDuration,
        specialtyCharts,
        degree,
        collegeName,
        graduationYear,
        cgpa,
        preferredCities,
        relocationPref,
        shiftPreference,
        templateId: selectedTemplate,
        headerBg: activeTmpl.headerBg,
        accentColor: activeTmpl.accentColor,
      });
      toast("Word document (.doc) downloaded with verified formatting!", "✓");
    } catch (err) {
      console.error("Word export error:", err);
      toast("Word export failed: " + (err.message || "Unknown error"), "!");
    }
  }

  // ATS Plain Text
  function handleDownloadTxt() {
    const text = [
      `TALENTERA VERIFIED RESUME - ID: ${verificationId} (Score: ${totalPoints}/100)`,
      `NAME: ${fullName.toUpperCase()}`,
      `ROLE: ${currentRoleTitle} | LOCATION: ${locality}`,
      `CONTACT: Mobile: ${mobile} | Email: ${email} | Live: ${liveResumeUrl}`,
      "",
      visibleSections.objective ? `CAREER OBJECTIVE:\n${careerObjective}\n` : "",
      visibleSections.scorecard ? `TALENTERA VERIFIED SCORECARD:\n* Foundation Assessment: ${assessmentScore}/100 (${assessmentMedal})\n* Video Pitch AI Score: ${videoScore}/100 (${videoMedal})\n* Live Charts: ${totalCharts} charts (${overallAccuracy}% accuracy)\n` : "",
      visibleSections.training ? `TRAINING FOUNDATION:\n* Academy: ${academyName} (${academyLocality}) - ${trainingSpecialties} (${trainingDuration})\n` : "",
      visibleSections.education ? `EDUCATION:\n* ${degree} - ${collegeName} (${graduationYear}) ${cgpa ? `[${cgpa}]` : ""}\n` : "",
      visibleSections.preferences ? `WORK PREFERENCES:\n* Cities: ${preferredCities} | Shifts: ${shiftPreference}\n` : "",
    ].filter(Boolean).join("\n");

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

  // Derived style parameters based on user selections
  const fontScaleMultipliers = {
    compact: { base: 11.5, title: 26, sub: 12.5, section: 10.5, gap: 14 },
    normal: { base: 12.5, title: 30, sub: 13.5, section: 11.5, gap: 18 },
    large: { base: 13.5, title: 34, sub: 14.5, section: 12.5, gap: 22 },
  };
  const scale = fontScaleMultipliers[customFontScale] || fontScaleMultipliers.normal;

  const lineHeights = {
    compact: 1.35,
    normal: 1.55,
    relaxed: 1.75,
  };
  const lineHeightVal = lineHeights[customLineHeight] || 1.55;

  // Paper Border Style calculation
  const getContainerBorder = () => {
    switch (customBorderStyle) {
      case "thin_subtle":
        return { border: "1px solid #CBD5E1", boxShadow: "0 4px 20px rgba(15,27,61,0.04)" };
      case "left_bar":
        return { border: "1px solid #E2E8F0", borderLeft: `7px solid ${activeTmpl.accentColor || "#F5B41A"}`, boxShadow: "0 6px 25px rgba(15,27,61,0.05)" };
      case "frameless":
        return { border: "none", boxShadow: "0 10px 35px rgba(15,27,61,0.08)" };
      case "accent_solid":
      default:
        return { border: `2.5px solid ${activeTmpl.accentColor || "#F5B41A"}`, boxShadow: "0 8px 30px rgba(15,27,61,0.06)" };
    }
  };

  // Section Heading Dynamic Renderer
  const renderSectionHeader = (title, icon, actionButton = null) => {
    const isPill = customSectionHeadingStyle === "pill_badge";
    const isStripe = customSectionHeadingStyle === "left_stripe";
    const isMinimal = customSectionHeadingStyle === "minimal_bold";

    return (
      <div style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        borderBottom: (!isPill && !isStripe) ? `1.5px solid ${activeTmpl.headerBg || "#0F1B3D"}` : "none",
        paddingBottom: (!isPill && !isStripe) ? 4 : 0,
        marginBottom: 8,
      }}>
        <div style={{
          fontSize: scale.section,
          fontWeight: 800,
          color: isPill ? (activeTmpl.accentColor || "#F5B41A") : (activeTmpl.headerBg || "#0F1B3D"),
          background: isPill ? (activeTmpl.headerBg || "#0F1B3D") : "transparent",
          padding: isPill ? "4px 10px" : (isStripe ? "2px 0 2px 8px" : 0),
          borderRadius: isPill ? 6 : 0,
          borderLeft: isStripe ? `4px solid ${activeTmpl.accentColor || "#F5B41A"}` : "none",
          letterSpacing: isMinimal ? "2px" : "1.2px",
          textTransform: "uppercase",
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
        }}>
          <span>{icon}</span>
          <span>{title}</span>
        </div>
        {actionButton}
      </div>
    );
  };

  return (
    <div className="candidate-resume-sheet-view" style={{ maxWidth: 900, margin: "0 auto", paddingBottom: 40 }}>
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
            width: 40,
            height: 40,
            background: activeTmpl.accentColor || "#F5B41A",
            color: activeTmpl.headerBg || "#0F1B3D",
            borderRadius: 10,
            display: "grid",
            placeItems: "center",
            fontSize: 20,
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
            <span>{showThemeDrawer ? "Hide Custom Themes" : "Customize Theme"}</span>
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

      {/* Expandable Theme & Style Customizer Drawer */}
      {showThemeDrawer && (
        <div style={{
          background: "#FFFFFF",
          border: `2px solid ${activeTmpl.accentColor || "#F5B41A"}`,
          borderRadius: 14,
          padding: "18px 20px",
          marginBottom: 20,
          boxShadow: "0 8px 24px rgba(15,27,61,0.08)",
        }}>
          {/* Header Bar */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: "1px solid #E2E8F0", paddingBottom: 10, flexWrap: "wrap", gap: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 800, color: "#0F1B3D", display: "flex", alignItems: "center", gap: 6 }}>
              <span>🎨 Resume Custom Theme Studio</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={handleResetTheme}
                style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 6, padding: "5px 12px", fontSize: 11, fontWeight: 700, color: "#475569", cursor: "pointer" }}
              >
                ↺ Reset All
              </button>
              <button
                type="button"
                onClick={handleSaveThemeSettings}
                disabled={savingTheme}
                style={{ background: "#0F1B3D", color: "#F5B41A", border: "none", borderRadius: 6, padding: "5px 14px", fontSize: 11.5, fontWeight: 800, cursor: "pointer" }}
              >
                {savingTheme ? "Saving..." : "✓ Save Theme Settings"}
              </button>
            </div>
          </div>

          {/* Theme Studio Tab Selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "1.5px solid #F1F5F9", paddingBottom: 8, overflowX: "auto" }}>
            {[
              { id: "colors", label: "🎨 Colors & Paper Tone" },
              { id: "typography", label: "🔤 Typography & Sizing" },
              { id: "layout", label: "📐 Layout & Headers" },
              { id: "visibility", label: "👁 Section Visibility" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setThemeActiveTab(tab.id)}
                style={{
                  padding: "6px 14px",
                  borderRadius: 8,
                  border: themeActiveTab === tab.id ? `2px solid ${activeTmpl.headerBg || "#0F1B3D"}` : "1px solid #E2E8F0",
                  background: themeActiveTab === tab.id ? "#FFFDF5" : "#FAFAFA",
                  color: themeActiveTab === tab.id ? (activeTmpl.headerBg || "#0F1B3D") : "#64748B",
                  fontSize: 12,
                  fontWeight: themeActiveTab === tab.id ? 800 : 600,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* TAB 1: COLORS & PAPER TONE */}
          {themeActiveTab === "colors" && (
            <div>
              {/* Template Presets */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  1. Template Archetypes
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {RESUME_TEMPLATES.map((tmpl) => (
                    <button
                      key={tmpl.id}
                      type="button"
                      onClick={() => handleSelectTemplate(tmpl)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: selectedTemplate === tmpl.id ? `2px solid #0F1B3D` : "1px solid #CBD5E1",
                        background: selectedTemplate === tmpl.id ? "#FFF6E0" : "#FAFAFA",
                        color: "#0F1B3D",
                        fontSize: 11.5,
                        fontWeight: selectedTemplate === tmpl.id ? 800 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {tmpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Curated 1-Click Brand Palettes */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  2. 1-Click Curated Brand Palettes
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
                        gap: 6,
                        padding: "5px 10px",
                        borderRadius: 6,
                        border: (customAccent === pal.accentColor && customHeaderBg === pal.headerBg) ? "2px solid #0F1B3D" : "1px solid #E2E8F0",
                        background: (customAccent === pal.accentColor && customHeaderBg === pal.headerBg) ? "#F8FAFC" : "#FFFFFF",
                        cursor: "pointer",
                        fontSize: 11.5,
                        fontWeight: 700,
                        color: "#0F1B3D",
                      }}
                    >
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: pal.headerBg }}></span>
                      <span style={{ width: 12, height: 12, borderRadius: "50%", background: pal.accentColor }}></span>
                      <span>{pal.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Paper Surface Tones */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
                  3. Resume Surface Tone &amp; Background
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {PAPER_TONES.map((pt) => (
                    <button
                      key={pt.id}
                      type="button"
                      onClick={() => setCustomPaperBg(pt.color)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "5px 12px",
                        borderRadius: 6,
                        border: customPaperBg === pt.color ? "2px solid #0F1B3D" : `1.5px solid ${pt.border}`,
                        background: pt.color,
                        cursor: "pointer",
                        fontSize: 11.5,
                        fontWeight: customPaperBg === pt.color ? 800 : 600,
                        color: "#0F1B3D",
                      }}
                    >
                      <span style={{ width: 14, height: 14, borderRadius: 4, background: pt.color, border: "1px solid #CBD5E1" }}></span>
                      <span>{pt.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Exact Color Pickers */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: 12,
                paddingTop: 10,
                borderTop: "1px dashed #E2E8F0",
              }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                    Header &amp; Title Color
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
                      style={{ width: 85, padding: "4px 6px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                    Accent Highlight Color
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
                      style={{ width: 85, padding: "4px 6px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                    Body Text Color
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="color"
                      value={customTextColor}
                      onChange={(e) => setCustomTextColor(e.target.value)}
                      style={{ width: 34, height: 30, border: "1px solid #CBD5E1", borderRadius: 6, cursor: "pointer", padding: 2 }}
                    />
                    <input
                      type="text"
                      value={customTextColor}
                      onChange={(e) => setCustomTextColor(e.target.value)}
                      style={{ width: 85, padding: "4px 6px", borderRadius: 6, border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 700, fontFamily: "monospace" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: TYPOGRAPHY & SIZING */}
          {themeActiveTab === "typography" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Typography Font Family
                </label>
                <select
                  value={customFont}
                  onChange={(e) => setCustomFont(e.target.value)}
                  style={{ width: "100%", padding: "7px 10px", borderRadius: 6, border: "1.5px solid #CBD5E1", fontSize: 12, fontWeight: 600, color: "#0F1B3D", background: "#fff" }}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.id} value={f.fontFamily}>{f.name}</option>
                  ))}
                </select>
                <div style={{ fontSize: 11, color: "#64748B", marginTop: 4 }}>
                  Preview: <span style={{ fontFamily: customFont, fontWeight: 700 }}>Talentera Verified Healthcare Coder</span>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Font Scale / Size
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "compact", label: "Compact (92%)" },
                    { id: "normal", label: "Standard (100%)" },
                    { id: "large", label: "Large (108%)" },
                  ].map((fs) => (
                    <button
                      key={fs.id}
                      type="button"
                      onClick={() => setCustomFontScale(fs.id)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: customFontScale === fs.id ? `2px solid #0F1B3D` : "1px solid #CBD5E1",
                        background: customFontScale === fs.id ? "#FFF6E0" : "#FFFFFF",
                        color: "#0F1B3D",
                        fontSize: 11,
                        fontWeight: customFontScale === fs.id ? 800 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {fs.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Line Spacing / Density
                </label>
                <div style={{ display: "flex", gap: 6 }}>
                  {[
                    { id: "compact", label: "Tight" },
                    { id: "normal", label: "Balanced" },
                    { id: "relaxed", label: "Relaxed" },
                  ].map((lh) => (
                    <button
                      key={lh.id}
                      type="button"
                      onClick={() => setCustomLineHeight(lh.id)}
                      style={{
                        flex: 1,
                        padding: "6px 8px",
                        borderRadius: 6,
                        border: customLineHeight === lh.id ? `2px solid #0F1B3D` : "1px solid #CBD5E1",
                        background: customLineHeight === lh.id ? "#FFF6E0" : "#FFFFFF",
                        color: "#0F1B3D",
                        fontSize: 11,
                        fontWeight: customLineHeight === lh.id ? 800 : 600,
                        cursor: "pointer",
                      }}
                    >
                      {lh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LAYOUT & HEADERS */}
          {themeActiveTab === "layout" && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Header Layout Variant
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {HEADER_STYLES.map((hs) => (
                    <button
                      key={hs.id}
                      type="button"
                      onClick={() => setCustomHeaderStyle(hs.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: customHeaderStyle === hs.id ? `2px solid #0F1B3D` : "1px solid #E2E8F0",
                        background: customHeaderStyle === hs.id ? "#FFFDF5" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F1B3D" }}>{hs.name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>{hs.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Outer Border &amp; Frame Style
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {BORDER_STYLES.map((bs) => (
                    <button
                      key={bs.id}
                      type="button"
                      onClick={() => setCustomBorderStyle(bs.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: customBorderStyle === bs.id ? `2px solid #0F1B3D` : "1px solid #E2E8F0",
                        background: customBorderStyle === bs.id ? "#FFFDF5" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F1B3D" }}>{bs.name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>{bs.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748B", textTransform: "uppercase", marginBottom: 4 }}>
                  Section Heading Style
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {SECTION_STYLES.map((ss) => (
                    <button
                      key={ss.id}
                      type="button"
                      onClick={() => setCustomSectionHeadingStyle(ss.id)}
                      style={{
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 6,
                        border: customSectionHeadingStyle === ss.id ? `2px solid #0F1B3D` : "1px solid #E2E8F0",
                        background: customSectionHeadingStyle === ss.id ? "#FFFDF5" : "#FFFFFF",
                        cursor: "pointer",
                      }}
                    >
                      <div style={{ fontSize: 12, fontWeight: 800, color: "#0F1B3D" }}>{ss.name}</div>
                      <div style={{ fontSize: 10.5, color: "#64748B" }}>{ss.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: SECTION VISIBILITY */}
          {themeActiveTab === "visibility" && (
            <div>
              <div style={{ fontSize: 11.5, color: "#64748B", marginBottom: 10 }}>
                Choose which verified sections to show or hide on the rendered resume:
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 8 }}>
                {[
                  { key: "objective", label: "📝 Career Objective" },
                  { key: "scorecard", label: "⏳ Talentera Scorecard" },
                  { key: "certifications", label: "📜 Core Certifications" },
                  { key: "training", label: "🎓 Training Foundation" },
                  { key: "liveCharts", label: "💻 Live Chart Practice Table" },
                  { key: "videoPitch", label: "🎤 Video Pitch Scorecard" },
                  { key: "education", label: "🎓 Academic Education" },
                  { key: "preferences", label: "📍 Work Preferences" },
                  { key: "qrStamp", label: "🛡 Talentera QR Stamp & ID" },
                ].map((sec) => (
                  <label
                    key={sec.key}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "8px 12px",
                      borderRadius: 8,
                      border: visibleSections[sec.key] ? "1.5px solid #0F1B3D" : "1px solid #CBD5E1",
                      background: visibleSections[sec.key] ? "#FFFDF5" : "#F8FAFC",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: visibleSections[sec.key] ? 800 : 500,
                      color: visibleSections[sec.key] ? "#0F1B3D" : "#64748B",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={!!visibleSections[sec.key]}
                      onChange={() => toggleSection(sec.key)}
                      style={{ accentColor: activeTmpl.headerBg || "#0F1B3D", width: 16, height: 16 }}
                    />
                    <span>{sec.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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

      {/* DYNAMIC RESUME SHEET WITH CUSTOM THEME ENGINE */}
      <div
        ref={resumePrintRef}
        className="resume-sheet-paper"
        style={{
          background: customPaperBg,
          borderRadius: 14,
          padding: "36px 42px",
          ...getContainerBorder(),
          color: customTextColor,
          fontFamily: activeTmpl.fontFamily,
          position: "relative",
          lineHeight: lineHeightVal,
        }}
      >
        {/* HEADER SECTION VARIANT 1: SOLID FULL BANNER */}
        {customHeaderStyle === "solid_banner" && (
          <div style={{
            background: activeTmpl.headerBg || "#0F1B3D",
            color: "#FFFFFF",
            padding: "20px 24px",
            borderRadius: 10,
            marginBottom: scale.gap,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "center",
          }}>
            <div>
              <h1 style={{
                fontSize: scale.title,
                fontWeight: 900,
                color: "#FFFFFF",
                margin: "0 0 4px 0",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}>
                {fullName.toUpperCase()}
              </h1>
              <div style={{ fontSize: scale.sub, fontWeight: 700, color: activeTmpl.accentColor || "#F5B41A", marginBottom: 6 }}>
                {joinUnique(currentRoleTitle, expLabel)}
              </div>
              <div style={{ fontSize: scale.base, color: "#E2E8F0", display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                {mobile && <span>📞 {mobile}</span>}
                {email && <span>✉ {email}</span>}
                <span style={{ color: activeTmpl.accentColor || "#F5B41A", fontWeight: 700 }}>🔗 {liveResumeUrl}</span>
              </div>
            </div>

            {visibleSections.qrStamp && (
              <div style={{
                background: "rgba(255,255,255,0.1)",
                border: `1.5px solid ${activeTmpl.accentColor || "#F5B41A"}`,
                borderRadius: 8,
                padding: "8px 12px",
                textAlign: "center",
                color: "#FFFFFF",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: activeTmpl.accentColor || "#F5B41A", letterSpacing: "1px" }}>
                  TALENTERA VERIFIED
                </div>
                <div style={{ fontSize: 9, fontFamily: "monospace", opacity: 0.9 }}>
                  ID: {verificationId}
                </div>
                <div
                  onClick={() => setShowQrModal(true)}
                  style={{
                    width: 44,
                    height: 44,
                    background: activeTmpl.accentColor || "#F5B41A",
                    color: activeTmpl.headerBg || "#0F1B3D",
                    margin: "5px auto 0",
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 20,
                    cursor: "pointer",
                  }}
                  title="Click to view QR"
                >
                  <i className="fa-solid fa-qrcode"></i>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HEADER SECTION VARIANT 2: CENTERED EXECUTIVE */}
        {customHeaderStyle === "centered_exec" && (
          <div style={{
            textAlign: "center",
            paddingBottom: 16,
            borderBottom: `2.5px solid ${activeTmpl.accentColor || "#F5B41A"}`,
            marginBottom: scale.gap,
          }}>
            <h1 style={{
              fontSize: scale.title + 2,
              fontWeight: 900,
              color: activeTmpl.headerBg || "#0F1B3D",
              margin: "0 0 4px 0",
              letterSpacing: "1px",
              lineHeight: 1.1,
            }}>
              {fullName.toUpperCase()}
            </h1>
            <div style={{ fontSize: scale.sub, fontWeight: 700, color: activeTmpl.headerBg || "#0F1B3D", marginBottom: 6 }}>
              {joinUnique(currentRoleTitle, expLabel)}
            </div>
            <div style={{
              fontSize: scale.base,
              color: "#475569",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
            }}>
              {mobile && <span>📞 {mobile}</span>}
              <span>•</span>
              {email && <span>✉ {email}</span>}
              <span>•</span>
              <span style={{ color: "#1D4ED8", fontWeight: 700 }}>🔗 {liveResumeUrl}</span>
              {visibleSections.qrStamp && (
                <>
                  <span>•</span>
                  <span style={{ fontWeight: 800, color: activeTmpl.headerBg || "#0F1B3D" }}>🛡 ID: {verificationId}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* HEADER SECTION VARIANT 3: MODERN BOXED FRAME */}
        {customHeaderStyle === "modern_boxed" && (
          <div style={{
            background: "#FAFAF8",
            border: `1.5px solid #CBD5E1`,
            borderLeft: `6px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            borderRadius: 8,
            padding: "16px 20px",
            marginBottom: scale.gap,
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 16,
            alignItems: "center",
          }}>
            <div>
              <div style={{ fontSize: 10.5, fontWeight: 800, color: activeTmpl.accentColor || "#F5B41A", letterSpacing: "1px", textTransform: "uppercase" }}>
                Talentera Verified Candidate
              </div>
              <h1 style={{
                fontSize: scale.title,
                fontWeight: 900,
                color: activeTmpl.headerBg || "#0F1B3D",
                margin: "2px 0 4px 0",
                lineHeight: 1.1,
              }}>
                {fullName.toUpperCase()}
              </h1>
              <div style={{ fontSize: scale.sub, fontWeight: 600, color: "#475569", marginBottom: 6 }}>
                {joinUnique(currentRoleTitle, expLabel)}
              </div>
              <div style={{ fontSize: scale.base, color: "#334155", display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                {mobile && <span>📞 {mobile}</span>}
                {email && <span>✉ {email}</span>}
                <span style={{ color: "#1D4ED8", fontWeight: 700 }}>🔗 {liveResumeUrl}</span>
              </div>
            </div>

            {visibleSections.qrStamp && (
              <div style={{
                border: `1.5px solid #CBD5E1`,
                borderRadius: 8,
                padding: "8px 12px",
                textAlign: "center",
                background: "#FFFFFF",
              }}>
                <div style={{ fontSize: 9.5, fontWeight: 800, color: activeTmpl.headerBg || "#0F1B3D" }}>
                  VERIFIED ID
                </div>
                <div style={{ fontSize: 9, fontFamily: "monospace", color: "#64748B" }}>
                  {verificationId}
                </div>
                <div
                  onClick={() => setShowQrModal(true)}
                  style={{
                    width: 42,
                    height: 42,
                    background: activeTmpl.headerBg || "#0F1B3D",
                    color: activeTmpl.accentColor || "#F5B41A",
                    margin: "5px auto 0",
                    borderRadius: 6,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    cursor: "pointer",
                  }}
                  title="Click to view QR"
                >
                  <i className="fa-solid fa-qrcode"></i>
                </div>
              </div>
            )}
          </div>
        )}

        {/* HEADER SECTION VARIANT 4 (DEFAULT): SPLIT STAMP */}
        {(!customHeaderStyle || customHeaderStyle === "split_stamp") && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "1fr auto",
            gap: 20,
            paddingBottom: 16,
            borderBottom: `2px solid ${activeTmpl.headerBg || "#0F1B3D"}`,
            alignItems: "center",
            marginBottom: scale.gap,
          }}>
            <div>
              <h1 style={{
                fontSize: scale.title,
                fontWeight: 900,
                color: activeTmpl.headerBg || "#0F1B3D",
                margin: "0 0 6px 0",
                letterSpacing: "-0.5px",
                lineHeight: 1.1,
              }}>
                {fullName.toUpperCase()}
              </h1>
              <div style={{ fontSize: scale.sub, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                {joinUnique(currentRoleTitle, expLabel)}
              </div>
              <div style={{
                fontSize: scale.base,
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
            {visibleSections.qrStamp && (
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
            )}
          </div>
        )}

        {/* 1. CAREER OBJECTIVE */}
        {visibleSections.objective && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader(
              "CAREER OBJECTIVE",
              "📝",
              <button
                type="button"
                onClick={() => setIsEditingObjective(true)}
                style={{ background: "none", border: "none", color: "#C99413", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
              >
                ✎ Edit
              </button>
            )}
            <p style={{ fontSize: scale.base, lineHeight: lineHeightVal, color: "#334155", fontStyle: "italic", margin: 0 }}>
              "{careerObjective}"
            </p>
          </div>
        )}

        {/* 2. TALENTERA VERIFIED SCORECARD */}
        {visibleSections.scorecard && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("TALENTERA VERIFIED SCORECARD", "⏳")}

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
                fontSize: scale.base,
                fontWeight: 800,
              }}>
                🎯 {assessmentMedal} · {assessmentScore}
              </span>

              <span style={{
                background: "#1E3A8A",
                color: "#93C5FD",
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: scale.base,
                fontWeight: 800,
              }}>
                🎤 {videoMedal} · {videoScore}
              </span>

              <span style={{
                background: "#E0F2FE",
                color: "#0369A1",
                padding: "5px 12px",
                borderRadius: 8,
                fontSize: scale.base,
                fontWeight: 800,
              }}>
                💻 {totalCharts} charts · {overallAccuracy}%
              </span>

              <span style={{
                background: activeTmpl.accentColor || "#F5B41A",
                color: activeTmpl.headerBg || "#0F1B3D",
                padding: "5px 14px",
                borderRadius: 8,
                fontSize: scale.base,
                fontWeight: 800,
              }}>
                🏆 {totalPoints}/100 Total
              </span>

              <span style={{ fontSize: 11, color: "#64748B", fontStyle: "italic", marginLeft: "auto" }}>
                Scan QR above to verify live
              </span>
            </div>
          </div>
        )}

        {/* 3. CORE CERTIFICATIONS (if present) */}
        {visibleSections.certifications && certificationsList.length > 0 && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("CORE CERTIFICATIONS", "📜")}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
              {certificationsList.map((cert, idx) => (
                <div key={idx} style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 10, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>{cert.body || "AAPC"} · {cert.code || cert.name}</div>
                  <div style={{ fontSize: scale.base + 0.5, fontWeight: 800, color: "#0F1B3D", marginTop: 2 }}>Member ID {cert.memberId ? `****${String(cert.memberId).slice(-4)}` : "Verified Credential"}</div>
                  <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 600, marginTop: 2 }}>🟢 Active Verified Credential</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 4. TRAINING FOUNDATION */}
        {visibleSections.training && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("TRAINING FOUNDATION", "🎓")}
            <div style={{
              background: "#FAFAF8",
              border: "1px solid #E2E8F0",
              borderRadius: 8,
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                {academyName} · {academyLocality}
              </div>
              <div style={{ fontSize: scale.base + 1, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>
                {trainingSpecialties}
              </div>
              <div style={{ fontSize: scale.base, color: "#475569", marginTop: 3 }}>
                {trainingDuration} · Classroom · <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 Academy-Verified</span>
              </div>
            </div>
          </div>
        )}

        {/* 5. LIVE CHART PRACTICE - DEPARTMENT-WISE */}
        {visibleSections.liveCharts && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("LIVE CHART PRACTICE · DEPARTMENT-WISE", "💻")}

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: scale.base }}>
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
                    <td style={{ padding: "8px 12px", color: Number(sc.count) > 0 ? "#16A34A" : "#64748B", fontWeight: 600 }}>
                      {Number(sc.count) > 0 ? (sc.lastCodedDate ? `🟢 ${new Date(sc.lastCodedDate).toLocaleDateString()}` : "🟢 Active") : "—"}
                    </td>
                  </tr>
                ))}
                <tr style={{ background: "#FFFDF5", fontWeight: 800, color: "#0F1B3D" }}>
                  <td style={{ padding: "8px 12px" }}>TOTAL</td>
                  <td style={{ padding: "8px 12px" }}>{totalCharts}</td>
                  <td style={{ padding: "8px 12px" }}>{overallAccuracy}%</td>
                  <td style={{ padding: "8px 12px" }}>{totalCharts > 0 ? "5.0 min avg" : "—"}</td>
                  <td style={{ padding: "8px 12px", color: totalCharts > 0 ? "#16A34A" : "#64748B" }}>
                    {totalCharts > 0 ? "🟢 Active" : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
            <div style={{ fontSize: 11, color: "#64748B", marginTop: 6 }}>
              Platforms verified: {selectedPlatforms.join(" 🟢 · ")} 🟢 · <b>Scan Live Chart QR to verify current data ↗</b>
            </div>
          </div>
        )}

        {/* 6. VIDEO PITCH SCORECARD */}
        {visibleSections.videoPitch && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("VIDEO PITCH SCORECARD", "🎤")}

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", position: "relative" }}>
                <div style={{ position: "absolute", right: 12, top: 12, width: 34, height: 34, background: activeTmpl.headerBg || "#0F1B3D", color: activeTmpl.accentColor || "#F5B41A", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 14 }}>
                  ▶
                </div>
                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>SELF-INTRODUCTION (60 SEC)</div>
                <div style={{ fontSize: scale.base + 1.5, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>Video Pitch Score · {videoScore}/100</div>
                <div style={{ fontSize: scale.base - 0.5, color: "#475569", marginTop: 3 }}>
                  Clarity {clarityScore} · Fluency {fluencyScore} · Confidence {confidenceScore} · <span style={{ color: "#16A34A", fontWeight: 700 }}>🟢 Live Verified</span> · Scan to play
                </div>
              </div>

              <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px", position: "relative" }}>
                <div style={{ position: "absolute", right: 12, top: 12, width: 34, height: 34, background: activeTmpl.headerBg || "#0F1B3D", color: activeTmpl.accentColor || "#F5B41A", borderRadius: 6, display: "grid", placeItems: "center", fontSize: 14 }}>
                  ☰
                </div>
                <div style={{ fontSize: 10.5, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>5-QUESTION AI MOCK</div>
                <div style={{ fontSize: scale.base + 1.5, fontWeight: 800, color: "#0F1B3D", marginTop: 3 }}>Avg {videoScore}/100</div>
                <div style={{ fontSize: scale.base - 0.5, color: "#475569", marginTop: 3 }}>
                  Auto-transcribed · Searchable · Scan to review answers
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 7. EDUCATION */}
        {visibleSections.education && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("EDUCATION", "🎓")}

            <div style={{ background: "#FAFAF8", border: "1px solid #E2E8F0", borderRadius: 8, padding: "12px 14px" }}>
              <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700, textTransform: "uppercase" }}>
                {degree} · {graduationYear}
              </div>
              <div style={{ fontSize: scale.base + 1, fontWeight: 800, color: "#0F1B3D", marginTop: 2 }}>
                {collegeName}
              </div>
              <div style={{ fontSize: scale.base, color: "#475569", marginTop: 2 }}>
                {cgpa} · Verified Academic Record
              </div>
            </div>
          </div>
        )}

        {/* 8. WORK PREFERENCES */}
        {visibleSections.preferences && (
          <div style={{ marginTop: scale.gap }}>
            {renderSectionHeader("WORK PREFERENCES", "📍")}

            <div style={{ fontSize: scale.base, color: "#0F1B3D", lineHeight: lineHeightVal }}>
              <div><b>Cities open to:</b> {preferredCities}</div>
              <div><b>Relocation:</b> {relocationPref} · <b>Availability:</b> Immediately</div>
              <div><b>Shifts:</b> {shiftPreference} · <b>Trainee-role open:</b> Yes</div>
            </div>
          </div>
        )}

        {/* FOOTER WATERMARK */}
        {visibleSections.qrStamp && (
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
        )}
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
            }}
            >
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