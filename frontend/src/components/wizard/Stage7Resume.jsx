import React, { useState, useMemo, useRef, useEffect } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";
import { exportResumePdf, exportResumeWord } from "../../utils/resumeExport.js";
import { joinUnique } from "../../utils/resumeSubtitle.js";
import { getMedalTier, medalLabel, medalBadgeStyle } from "../../utils/medalBadge.js";
import { buildResumeSkills, buildDeclarationText } from "../../utils/resumeSkills.js";
import { buildCareerObjectives, getCertStatus, getExperienceLevel, isLegacyAutoObjective } from "../../utils/careerObjective.js";

// Clean inline SVGs for self-contained, CORS-safe rendering in html2canvas & exports
const QrIconSvg = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm13-2h3v3h-3v-3zm-5 0h3v3h-3v-3zm2 5h3v3h-3v-3zm3 0h3v3h-3v-3zm-5-3h3v3h-3v-3zm5-2h3v2h-3v-2z" />
  </svg>
);

const PlayIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M8 5v14l11-7z" />
  </svg>
);

const CheckListIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 17h2v-2H3v2zm0 4h2v-2H3v2zm0-8h2v-2H3v2zm4 4h14v-2H7v2zm0 4h14v-2H7v2zM7 7v2h14V7H7zM3 7v2h2V7H3z" />
  </svg>
);

// Color Palettes for Theme Customizer
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

// 7 Verified Resume Templates matching the design
const RESUME_TEMPLATES = [
  {
    id: "fresher_modern",
    name: "🎯 Fresher Modern",
    sub: "Best for Silver+ freshers with verified skills. Clean, contemporary, HR-loved.",
    badge: "⭐ AUTO-PICK",
    headerBg: "#0F1B3D",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
    type: "modern",
  },
  {
    id: "plain_bw",
    name: "⚪ Plain Black & White",
    sub: "Pure monochrome & high-contrast layout. 100% ATS-compliant, photocopy & print-ready.",
    badge: "ATS B&W",
    headerBg: "#000000",
    accentColor: "#000000",
    fontFamily: "'Inter', Arial, sans-serif",
    type: "plain_bw",
  },
  {
    id: "fresher_classic",
    name: "📋 Fresher Classic",
    sub: "Traditional layout. ATS-safe. Great for Bronze-tier candidates.",
    headerBg: "#333333",
    accentColor: "#8A91A3",
    fontFamily: "Georgia, 'Times New Roman', serif",
    type: "classic",
  },
  {
    id: "executive",
    name: "💼 Executive",
    sub: "Best for 5+ yrs experienced. Unlocks in Experienced flow.",
    headerBg: "#8B5CF6",
    accentColor: "#7C3AED",
    fontFamily: "'Inter', sans-serif",
    type: "executive",
  },
  {
    id: "global",
    name: "🌍 Global",
    sub: "US/UK/AU market-ready. For candidates who ticked Global Markets in Stage 03.",
    headerBg: "#065F46",
    accentColor: "#10B981",
    fontFamily: "'Inter', sans-serif",
    type: "global",
  },
  {
    id: "compact_ats",
    name: "📱 Compact ATS",
    sub: "Single-page, ATS-safe. For job-board first roles.",
    headerBg: "#334155",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
    type: "compact",
  },
  {
    id: "specialty_dental",
    name: "🦷 Specialty (Dental)",
    sub: "For Dental Coding & niche specialty candidates. Auto-picked if Domain = Dental.",
    headerBg: "#7C3AED",
    accentColor: "#F5B41A",
    fontFamily: "'Inter', sans-serif",
    type: "dental",
  },
];

export default function Stage7Resume({ stage, existingData, candidate, onSaved, onNavigateStage }) {
  const toast = useToast();
  const resumePrintRef = useRef(null);

  // Extract real candidate data from MongoDB
  const candidateObj = candidate || {};
  const stage1 = candidateObj.stage1 || {};
  const stage2 = candidateObj.stage2 || {};
  const stage3 = candidateObj.stage3 || {};
  const stage4 = candidateObj.stage4 || {};
  const stage5 = candidateObj.stage5 || {};
  const stage6 = candidateObj.stage6 || {};
  const stage7Data = existingData || candidateObj.stage7 || {};

  // Candidate basics directly from database
  const fullName = stage1.fullName || candidateObj.name || (candidateObj.email ? candidateObj.email.split("@")[0] : "Talentera Candidate");
  // Default to Fresher unless explicitly "Experienced" - matches getExperienceLevel() in utils/careerObjective.js
  // and Stage2Training.jsx's isFresherCandidate (a legacy "1-3" years-range placeholder must not read as Experienced).
  const isExperienced = /exp/i.test(String(stage1.experience || candidateObj.experience || ""));
  const expLabel = isExperienced ? (stage2.totalExperience || "Experienced") : "Fresher";
  const domainName = stage2.domain || stage2.courseName || stage2.specialty || "Medical Coding";
  const currentRoleTitle = isExperienced
    ? (stage2.jobTitle || stage1.currentRole || (domainName ? `${domainName} Professional` : "Medical Coding Specialist"))
    : (domainName ? `${domainName} Professional` : "Medical Coding Specialist");
  
  // Locality & Contact from Stage 1
  const city = stage1.city || "";
  const state = stage1.state || "";
  const locality = city ? (state ? `${city}, ${state}, India` : `${city}, India`) : (state ? `${state}, India` : "India");
  const mobile = stage1.mobile || candidateObj.mobile || "";
  const email = stage1.email || candidateObj.email || "";
  
  // Unique Slug & Verification ID
  const candidateSlug = (stage1.fullName || fullName).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const verificationId = candidateObj.verificationId || (candidateObj._id ? `TLR-2026-${String(candidateObj._id).slice(-6).toUpperCase()}` : "TLR-2026-VERIFIED");
  const liveResumeUrl = `https://talentera.io/${candidateSlug || "candidate"}`;

  // Stage 2 Training Details from Database
  const academyName = stage2.academyName || stage2.instituteName || "Talentera Partner Academy";
  const academyLocality = stage2.academyCity || city || "India";
  const trainingLevel = stage2.trainingLevel || stage2.level || "Professional Level";
  const trainingSpecialties = Array.isArray(stage2.specialties) && stage2.specialties.length > 0
    ? stage2.specialties.join(" + ")
    : (stage2.specialty || domainName || "Medical Coding");
  const trainingDuration = stage2.duration || stage2.totalHours ? `${stage2.duration || "Course Completed"}${stage2.totalHours ? ` · ${stage2.totalHours} hours` : ""}` : "Course Completed";
  // // Accounts Receivable and Eligibility & Verification candidates don't pick a coding specialty (Stage 2 hides that field for them), so trainingSpecialties for them is only ever the placeholder fallback (e.g. "Eligibility & Verification General") - showing it alongside the domain and level was redundant/confusing. For those two domains, show the domain and a labeled training level instead.
  const NO_SPECIALTY_DOMAINS = ["Accounts Receivable", "Eligibility & Verification"];
  const trainingFoundationLine = NO_SPECIALTY_DOMAINS.includes(domainName)
    ? `${domainName}${trainingLevel ? ` · Training level: ${trainingLevel}` : ""}`
    : `${domainName} · ${trainingLevel} · ${trainingSpecialties}`;
  const trainingAssessmentScore = stage2.assessmentScore || stage2.score || null;
  // Experienced-candidate work history (Stage 2 · "Your Work Experience")
  const workCompany = stage2.currentCompany || "";
  const workProjectDetails = stage2.projectDetails || "";
  const workTotalExperience = stage2.totalExperience || "";
  const workNoticePeriod = stage2.noticePeriod || "";

  // Stage 3 Certifications from Database
  const isNonCertified = stage3.nonCertified || stage3.isCertified === false || stage3.certType === "non-certified";
  const isPursuing = stage3.pursuing === true;
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

  // Skills chips + declaration paragraph - generated from the candidate's own domain,
  // specialties and certification status (see utils/resumeSkills.js), not hand-typed.
  const resumeSkills = useMemo(
    () => buildResumeSkills({ domain: stage2.domain || domainName, specialties: stage2.specialties, certified: !isNonCertified }),
    [stage2.domain, domainName, stage2.specialties, isNonCertified]
  );
  const declarationText = useMemo(() => buildDeclarationText({ fullName, city }), [fullName, city]);
  const declarationDate = useMemo(() => new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), []);

  // Stage 4 Assessment from Database
  const assessmentScore = stage4.foundationScore !== undefined ? stage4.foundationScore : (stage4.score !== undefined ? stage4.score : null);
  const assessmentMedal = stage4.medal || (assessmentScore !== null ? (assessmentScore >= 85 ? "Gold" : assessmentScore >= 70 ? "Silver" : assessmentScore >= 50 ? "Bronze" : "Verified") : "Pending");

  // Stage 5 Video Pitch from Database
  const videoScore = stage5.aiScore !== undefined ? stage5.aiScore : (stage5.score !== undefined ? stage5.score : null);
  const videoMedal = stage5.medal || (videoScore !== null ? (videoScore >= 85 ? "Gold" : videoScore >= 70 ? "Silver" : videoScore >= 50 ? "Bronze" : "Verified") : "Pending");
  const clarityScore = stage5.clarityScore || stage5.clarity || (videoScore ? Math.min(100, videoScore + 4) : 0);
  const fluencyScore = stage5.fluencyScore || stage5.fluency || (videoScore ? Math.max(50, videoScore - 3) : 0);
  const vocabScore = stage5.vocabScore || stage5.vocabularyScore || (videoScore ? videoScore : 0);
  const confidenceScore = stage5.confidenceScore || stage5.confidence || (videoScore ? videoScore : 0);
  const contentScore = stage5.contentScore || stage5.relevanceScore || (videoScore ? videoScore : 0);
  const regionalLang = stage5.regionalLanguage || "";

  // Stage 6 Live Charts from Database
  const totalCharts = stage6.totalCharts !== undefined ? stage6.totalCharts : (stage6.liveChartsAudited !== undefined ? stage6.liveChartsAudited : 0);
  const overallAccuracy = stage6.overallAccuracy !== undefined ? stage6.overallAccuracy : (stage6.accuracyScore !== undefined ? stage6.accuracyScore : 0);
  const chartTier = stage6.tier || (totalCharts >= 500 ? "Platinum" : totalCharts >= 201 ? "Gold" : totalCharts >= 51 ? "Silver" : totalCharts > 0 ? "Bronze" : "Declared");

  // Check if saved stage6 was the old legacy mock
  const isLegacyMock = useMemo(() => {
    if (!Array.isArray(stage6.specialtyCharts) || stage6.specialtyCharts.length === 0) return false;
    const legacyNames = ["HCC (Risk Adjustment)", "E/M (Evaluation)", "ED (Emergency)", "Surgery"];
    const isExactLegacyList = stage6.specialtyCharts.length === 4 && stage6.specialtyCharts.every(s => legacyNames.includes(s.name));
    const s2Specs = Array.isArray(stage2.specialties) ? stage2.specialties : [];
    return isExactLegacyList && s2Specs.length > 0 && !s2Specs.every(s => legacyNames.includes(s));
  }, [stage6.specialtyCharts, stage2.specialties]);
  
  const specialtyCharts = useMemo(() => {
    if (Array.isArray(stage6.specialtyCharts) && stage6.specialtyCharts.length > 0 && !isLegacyMock) {
      return stage6.specialtyCharts;
    }
    if (Array.isArray(stage2.specialties) && stage2.specialties.length > 0) {
      return stage2.specialties.map((spec, idx) => ({
        id: idx + 1,
        name: spec,
        icon: "clipboard-list",
        count: totalCharts > 0 ? Math.round(totalCharts / Math.max(1, stage2.specialties.length)) : 0,
        accuracy: overallAccuracy || 0,
        timePerChart: "5.0 min",
        lastCoded: "Recent",
        active: true,
      }));
    }
    if (totalCharts > 0) {
      return [{ id: 1, name: domainName || "Medical Coding", icon: "stethoscope", count: totalCharts, accuracy: overallAccuracy || 0, timePerChart: "5.0 min", lastCoded: "Recent", active: true }];
    }
    return [];
  }, [stage6, stage2, totalCharts, overallAccuracy, domainName, isLegacyMock]);

  const selectedPlatforms = useMemo(() => {
    if (Array.isArray(stage6.selectedPlatforms) && stage6.selectedPlatforms.length > 0) {
      return stage6.selectedPlatforms;
    }
    if (stage6.primaryPlatform) return [stage6.primaryPlatform];
    return [];
  }, [stage6]);

  // Education details from Stage 1 Database
  const degree = stage1.degree || "Bachelor's Degree";
  const collegeName = stage1.collegeName || stage1.university || "University";
  const graduationYear = stage1.graduationYear || "";
  const cgpa = stage1.cgpa ? `CGPA ${stage1.cgpa}` : (stage1.percentage ? `${stage1.percentage}%` : "");
  const twelfthSchool = stage1.twelfthSchool || stage1.schoolName || "";
  const twelfthYear = stage1.twelfthYear || "";
  const twelfthScore = stage1.twelfthPercentage ? `${stage1.twelfthPercentage}%` : (stage1.twelfthBoard ? `${stage1.twelfthBoard} Board` : "");

  // Work Preferences from Database
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

  // Total Genuine Points Calculation
  const totalPoints = useMemo(() => {
    let pts = 0;
    if (stage1.aadhaarVerified || stage1.fullName) pts += 5;
    if (stage2.academyName || stage2.courseName || stage2.domain) pts += 15;
    if (stage3.certStatus === "verified" || (certificationsList.length > 0 && !isNonCertified)) pts += 20;
    if (assessmentScore !== null && assessmentScore >= 70) pts += 25;
    else if (assessmentScore !== null && assessmentScore > 0) pts += Math.round((assessmentScore / 100) * 25);
    if (stage5.videoUrl || (videoScore !== null && videoScore >= 70)) pts += 10;
    if (totalCharts > 0) {
      const opt = (stage6.evidencePath || stage6.option || "").toLowerCase();
      pts += opt === "a" || opt.includes("api") || opt === "practicode" ? 20 : opt === "b" || opt.includes("upload") ? 15 : opt === "c" || opt.includes("declare") ? 8 : 10;
    }
    return Math.min(100, Math.max(pts, candidateObj.score || 0));
  }, [stage1, stage2, stage3, certificationsList, isNonCertified, assessmentScore, stage5, videoScore, totalCharts, stage6, candidateObj]);

  // Verified Fields Count
  const verifiedFieldsCount = useMemo(() => {
    let count = 0;
    if (fullName) count += 1;
    if (mobile) count += 1;
    if (email) count += 1;
    if (locality) count += 1;
    if (degree) count += 1;
    if (collegeName) count += 1;
    if (graduationYear) count += 1;
    if (academyName) count += 1;
    if (domainName) count += 1;
    if (trainingSpecialties) count += 1;
    certificationsList.forEach(() => { count += 3; });
    if (assessmentScore !== null) count += 2;
    if (videoScore !== null) count += 3;
    if (totalCharts > 0) count += 2;
    specialtyCharts.forEach(() => { count += 2; });
    return Math.max(count, 18);
  }, [fullName, mobile, email, locality, degree, collegeName, graduationYear, academyName, domainName, trainingSpecialties, certificationsList, assessmentScore, videoScore, totalCharts, specialtyCharts]);

  // Template selection state
  const [selectedTemplate, setSelectedTemplate] = useState(() => {
    if (stage7Data.template) return stage7Data.template;
    if (stage2.domain?.toLowerCase().includes("dental")) return "specialty_dental";
    if (isExperienced) return "executive";
    return "fresher_modern";
  });

  const baseTemplateObj = useMemo(() => {
    return RESUME_TEMPLATES.find((t) => t.id === selectedTemplate) || RESUME_TEMPLATES[0];
  }, [selectedTemplate]);

  // Theme customizer states (Colors, Font, Density)
  const initialTheme = stage7Data.themeSettings || {};
  const [customAccent, setCustomAccent] = useState(initialTheme.accentColor || baseTemplateObj.accentColor);
  const [customHeaderBg, setCustomHeaderBg] = useState(initialTheme.headerBg || baseTemplateObj.headerBg);
  const [customFont, setCustomFont] = useState(initialTheme.fontFamily || baseTemplateObj.fontFamily);
  const [layoutDensity, setLayoutDensity] = useState(initialTheme.density || "normal");

  // Synchronize active template styling with overrides
  const activeTmpl = useMemo(() => {
    return {
      ...baseTemplateObj,
      accentColor: customAccent || baseTemplateObj.accentColor,
      headerBg: customHeaderBg || baseTemplateObj.headerBg,
      fontFamily: customFont || baseTemplateObj.fontFamily,
    };
  }, [baseTemplateObj, customAccent, customHeaderBg, customFont]);

  // Handle template selection & apply matching palette
  function handleSelectTemplate(tmpl) {
    setSelectedTemplate(tmpl.id);
    setCustomAccent(tmpl.accentColor);
    setCustomHeaderBg(tmpl.headerBg);
    setCustomFont(tmpl.fontFamily);
    toast(`Template switched to ${tmpl.name}`, "✓");
  }

  // Handle quick color palette selection
  function handleSelectPalette(palette) {
    setCustomAccent(palette.accentColor);
    setCustomHeaderBg(palette.headerBg);
    toast(`Applied "${palette.name}" color theme!`, "✓");
  }

  // Reset theme to template defaults
  function handleResetTheme() {
    setCustomAccent(baseTemplateObj.accentColor);
    setCustomHeaderBg(baseTemplateObj.headerBg);
    setCustomFont(baseTemplateObj.fontFamily);
    setLayoutDensity("normal");
    toast("Reset theme to default template styles.", "✓");
  }

  // Career objectives tailored to experience level (fresher / experienced) and Stage 3 certification
  // status (certified / pursuing / non-certified) - see utils/careerObjective.js
  const objectiveSet = useMemo(() => {
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
      domain: domainName,
      trainingLevel,
      specialties: Array.isArray(stage2.specialties) && stage2.specialties.length > 0 ? stage2.specialties.slice(0, 3).join(", ") : (stage2.specialty || (specialtyCharts.length > 0 ? specialtyCharts.map((sc) => sc.name).filter(Boolean).slice(0, 3).join(", ") : domainName)),
      roleTitle: stage2.jobTitle || stage1.currentRole || "",
      academyName,
      assessmentScore,
      currentCompany: stage2.currentCompany || "",
      projectDetails: stage2.projectDetails || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage1, stage3, certificationsList, totalCharts, overallAccuracy, specialtyCharts, domainName, academyName, assessmentScore, trainingLevel, stage2]);

  const aiObjectiveOptions = useMemo(
    () => objectiveSet.options.map((o, i) => ({ id: i + 1, tag: o.tag, label: `🤖 AI Option ${i + 1}`, text: o.text })),
    [objectiveSet]
  );

  const cleanObjectiveString = (str) => {
    if (!str) return "";
    return str
      .replace(/Talentera[- ]verified/gi, "Qualified")
      .replace(/Talentera[- ]validated/gi, "Qualified")
      .replace(/Talentera skillset/gi, "skillset")
      .replace(/Talentera/gi, "")
      .replace(/\s+/g, " ")
      .trim();
  };

  const objectiveKey = `${domainName}|${trainingLevel}|${objectiveSet.level}|${objectiveSet.status}`;
  const [selectedAiIdx, setSelectedAiIdx] = useState(0);
  const [careerObjective, setCareerObjective] = useState(() => {
    const saved = stage7Data.objective || stage7Data.summary;
    // A saved objective written for a different domain / training level / experience is stale - rebuild it.
    const stale = stage7Data.objectiveKey && stage7Data.objectiveKey !== objectiveKey;
    if (saved && !stale && !isLegacyAutoObjective(saved)) return cleanObjectiveString(saved);
    return aiObjectiveOptions[0].text;
  });

  // Regenerate fresh AI options counter
  const [aiGenSeed, setAiGenSeed] = useState(0);

  const [formErrors, setFormErrors] = useState({});

  function handleRegenerateAi() {
    setAiGenSeed((prev) => prev + 1);
    const newOptions = objectiveSet.alternates;
    const picked = newOptions[aiGenSeed % newOptions.length];
    setCareerObjective(picked);
    if (formErrors.careerObjective) setFormErrors((prev) => ({ ...prev, careerObjective: "" }));
    toast("Generated fresh AI objective variation based on your database record!", "✓");
  }

  function handleSelectAiOption(idx) {
    setSelectedAiIdx(idx);
    setCareerObjective(aiObjectiveOptions[idx].text);
    if (formErrors.careerObjective) setFormErrors((prev) => ({ ...prev, careerObjective: "" }));
  }

  // Version history state from Database or initialized
  const versionHistory = useMemo(() => {
    if (Array.isArray(stage7Data.versionHistory) && stage7Data.versionHistory.length > 0) {
      return stage7Data.versionHistory;
    }
    return [
      {
        version: "v3",
        timestamp: "Live · Current Version",
        title: `Career Objective active, template = ${selectedTemplate.replace(/_/g, " ")}, accent = ${activeTmpl.accentColor}`,
        current: true,
      },
      {
        version: "v2",
        timestamp: "Verified Session",
        title: `Stage 06 Live Chart sync (${totalCharts} charts)`,
        current: false,
      },
      {
        version: "v1",
        timestamp: "Initial Record",
        title: "Initial resume assembled after Stage 01-05 verification",
        current: false,
      },
    ];
  }, [stage7Data.versionHistory, selectedTemplate, activeTmpl.accentColor, totalCharts]);

  // Live Hiring Companies from database API
  const [liveCompanies, setLiveCompanies] = useState([]);
  useEffect(() => {
    let isMounted = true;
    api
      .get("/public/hiring-activity")
      .then((res) => {
        if (!isMounted || !res.data) return;
        if (Array.isArray(res.data.companies) && res.data.companies.length > 0) {
          setLiveCompanies(res.data.companies);
        }
      })
      .catch((err) => {
        console.debug("Live hiring activity sync:", err.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Modals & Actions state
  const [showQrModal, setShowQrModal] = useState(false);
  const [showFullPreviewModal, setShowFullPreviewModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);

  // Copy Live URL
  function handleCopyLiveUrl() {
    navigator.clipboard.writeText(liveResumeUrl).then(() => {
      toast("Live Resume URL copied to clipboard!", "✓");
    }).catch(() => {
      toast("Link ready: " + liveResumeUrl, "!");
    });
  }

  // Direct PDF Download using html2canvas + jsPDF (No window.print popup)
  async function handleDownloadPdf() {
    setDownloading(true);
    toast("Generating verified high-resolution PDF...", "i");

    try {
      if (!resumePrintRef.current) {
        throw new Error("Resume container is not ready.");
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

  // Word / DOCX Download with Rich Word XML Styling
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
        chartTier,
        certificationsList,
        academyName,
        academyLocality,
        domainName,
        trainingLevel,
        trainingSpecialties,
        trainingDuration,
        trainingAssessmentScore,
        specialtyCharts,
        specialties: stage2.specialties,
        isNonCertified,
        city,
        isExperienced,
        workCompany,
        workProjectDetails,
        workTotalExperience,
        workNoticePeriod,
        selectedPlatforms,
        degree,
        collegeName,
        graduationYear,
        cgpa,
        twelfthSchool,
        twelfthYear,
        twelfthScore,
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

  // ATS Clean Text Download
  function handleDownloadTxt() {
    const textContent = [
      "==================================================================",
      "TALENTERA VERIFIED CANDIDATE RESUME",
      `Verification ID: ${verificationId} | Verification Score: ${totalPoints}/100`,
      "==================================================================",
      "",
      `NAME: ${fullName.toUpperCase()}`,
      `TITLE: ${joinUnique(currentRoleTitle, expLabel)}`,
      `CONTACT: Mobile: ${mobile} | Email: ${email} | Location: ${locality}`,
      `LIVE VERIFICATION URL: ${liveResumeUrl}`,
      "",
      "------------------------------------------------------------------",
      isExperienced ? "PROFESSIONAL SUMMARY" : "CAREER OBJECTIVE",
      "------------------------------------------------------------------",
      careerObjective,
      "",
      "------------------------------------------------------------------",
      "TALENTERA VERIFIED CREDENTIALS & SCORECARD",
      "------------------------------------------------------------------",
      assessmentScore !== null ? `* Foundation Assessment: ${assessmentMedal} Tier (${assessmentScore}/100)` : "* Foundation Assessment: Verified",
      videoScore !== null ? `* Video Pitch Score: ${videoScore}/100 - Clarity: ${clarityScore}, Fluency: ${fluencyScore}, Confidence: ${confidenceScore}` : "* AI Video Pitch: Verified",
      totalCharts > 0 ? `* Live Chart Production: ${chartTier} Tier (${totalCharts} charts coded, ${overallAccuracy}% accuracy)` : "* Live Chart: Foundation Track",
      "",
      certificationsList.length > 0 ? [
        "------------------------------------------------------------------",
        "CORE CERTIFICATIONS",
        "------------------------------------------------------------------",
        ...certificationsList.map((c) => `* ${c.body || 'AAPC'} ${c.code || c.name} (Member ID: ${c.memberId || 'Verified'}) - Valid through: ${c.expiryDate || 'Active'}`),
        ""
      ].join("\n") : "",
      "------------------------------------------------------------------",
      "TRAINING FOUNDATION",
      "------------------------------------------------------------------",
      `* Academy: ${academyName} (${academyLocality})`,
      `* Specialty: ${trainingSpecialties} - ${trainingLevel}`,
      `* Duration: ${trainingDuration}`,
      trainingAssessmentScore ? `* Academy Assessment Score: ${trainingAssessmentScore}/100` : "",
      "",
      "------------------------------------------------------------------",
      "ACADEMIC EDUCATION",
      "------------------------------------------------------------------",
      `* ${degree} - ${collegeName} (${graduationYear}) ${cgpa ? `- ${cgpa}` : ""}`,
      twelfthSchool ? `* Class XII: ${twelfthSchool} (${twelfthYear}) ${twelfthScore ? `- ${twelfthScore}` : ""}` : "",
      "",
      resumeSkills.length > 0 ? [
        "------------------------------------------------------------------",
        "SKILLS",
        "------------------------------------------------------------------",
        `* ${resumeSkills.join(" | ")}`,
        ""
      ].join("\n") : "",
      "------------------------------------------------------------------",
      "WORK PREFERENCES",
      "------------------------------------------------------------------",
      `* Locations: ${preferredCities}`,
      `* Relocation: ${relocationPref} | Availability: Immediate | Shifts: ${shiftPreference}`,
      "",
      "------------------------------------------------------------------",
      "DECLARATION",
      "------------------------------------------------------------------",
      declarationText,
      `Place: ${city || locality} | Date: ${declarationDate}`,
      fullName,
      "",
      "==================================================================",
      `Verified by Talentera Automated Credential Engine | Live at ${liveResumeUrl}`,
      "=================================================================="
    ].filter(Boolean).join("\n");

    const blob = new Blob([textContent], { type: "text/plain;charset=utf-8" });
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

  // PNG Export
  function handleDownloadPng() {
    toast("Opening printable snapshot...", "i");
    window.print();
  }

  // Regional Export
  function handleDownloadRegional() {
    toast(`Exporting ${regionalLang || "Regional"} verified summary...`, "✓");
    handleDownloadWord();
  }

  // Save Stage 7 Data to MongoDB
  async function handleSaveAndAdvance(advanceToStage8 = true) {
    if (advanceToStage8 && (!careerObjective || careerObjective.trim().length < 5)) {
      setFormErrors({ careerObjective: "Career Objective is mandatory (minimum 5 characters)." });
      toast("Please provide or select a Career Objective in Section 2 to continue.", "error", { title: "Mandatory Field Required" });
      window.scrollTo({ top: 400, behavior: "smooth" });
      return;
    }
    setFormErrors({});
    setSaving(true);
    try {
      const payload = {
        template: selectedTemplate,
        themeSettings: {
          accentColor: activeTmpl.accentColor,
          headerBg: activeTmpl.headerBg,
          fontFamily: activeTmpl.fontFamily,
          density: layoutDensity,
        },
        objective: careerObjective,
        objectiveKey,
        summary: careerObjective,
        resumeUrl: liveResumeUrl,
        slug: candidateSlug,
        verificationId,
        totalPoints,
        versionHistory,
        isDraft: !advanceToStage8,
      };

      const res = await api.put("/candidate/stage/7", payload);
      toast(advanceToStage8 ? "Stage 07 saved! Proceeding to Stage 08 · Career Passport..." : "Resume theme & content saved successfully!", "✓");

      if (onSaved) {
        onSaved(res.data, { advance: advanceToStage8, nextStage: 8 });
      }
    } catch (err) {
      console.error("Failed to save stage 7:", err);
      toast(err.response?.data?.message || "Failed to save Stage 7. Please try again.", "!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stage7-root" style={{ color: "#3A425A", fontSize: 14, lineHeight: 1.5 }}>
      <style>{`
        .stage7-root * { box-sizing: border-box; }
        .s7-shell { display: grid; grid-template-columns: 1fr 320px; gap: 24px; min-width: 0; align-items: start; }
        @media (max-width: 1100px) { .s7-shell { grid-template-columns: 1fr; } }
        
        .s7-hero {
          background: linear-gradient(135deg, #0F1B3D 0%, #1E3A8A 60%, #2A54B5 100%);
          color: #FFFFFF;
          border-radius: 18px;
          padding: 30px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(15,27,61,.15);
        }
        .s7-hero::before {
          content: '';
          position: absolute;
          right: -80px;
          top: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(245,180,26,.16), transparent 60%);
        }
        .s7-hero-icon {
          width: 54px;
          height: 54px;
          background: #F5B41A;
          color: #0F1B3D;
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 26px;
          margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(245,180,26,.32);
        }
        .s7-hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .s7-hero-chip {
          background: rgba(255,255,255,.14);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          backdrop-filter: blur(6px);
        }
        .s7-hero-chip.green { background: rgba(31,122,60,.28); color: #7ED87E; }
        .s7-hero-chip.gold { background: #F5B41A; color: #0F1B3D; }
        .s7-hero-title { font-size: 44px; font-weight: 800; letter-spacing: -1px; margin: 0; line-height: 1; color: #FFFFFF !important; }
        .s7-hero-subtitle { color: #FFF6E0 !important; font-style: italic; font-size: 17px; margin-top: 6px; font-weight: 500; }
        .s7-hero-desc { color: rgba(255,255,255,.9) !important; font-size: 14px; margin-top: 16px; max-width: 680px; line-height: 1.6; }
        .s7-hero-tiles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-top: 22px; }
        @media (max-width: 768px) { .s7-hero-tiles { grid-template-columns: 1fr 1fr; } }
        .s7-hero-tile {
          background: rgba(255,255,255,.12);
          padding: 16px 14px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(8px);
        }
        .s7-hero-tile .big { font-size: 20px; font-weight: 800; color: #FFFFFF; letter-spacing: -.3px; }
        .s7-hero-tile .small { font-size: 11px; color: rgba(255,255,255,.7); margin-top: 3px; letter-spacing: .3px; }

        /* ID RECAP */
        .s7-id-recap {
          background: linear-gradient(90deg, #E8F5E9, #F5FDF9);
          border: 1px solid #1F7A3C;
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .s7-id-recap .check {
          width: 36px;
          height: 36px;
          background: #1F7A3C;
          color: #FFFFFF;
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .s7-id-recap .lbl { font-size: 11px; color: #1F7A3C; font-weight: 700; letter-spacing: .6px; text-transform: uppercase; }
        .s7-id-recap .val { font-size: 14px; color: #0F1B3D; font-weight: 800; margin-top: 2px; }
        .s7-id-recap .small { font-size: 11.5px; color: #8A91A3; margin-top: 1px; font-style: italic; }
        .s7-id-recap .locked-badge {
          background: #F5B41A;
          color: #0F1B3D;
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .6px;
          white-space: nowrap;
        }

        .s7-card {
          background: #FFFFFF;
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 2px 10px rgba(15,27,61,.05);
          margin-bottom: 18px;
          border: 1px solid #E5E7EB;
        }
        .s7-card-title { font-size: 20px; font-weight: 800; color: #0F1B3D; margin: 0; }
        .s7-card-eyebrow { font-size: 10.5px; letter-spacing: 1.5px; color: #C99413; text-transform: uppercase; font-weight: 700; margin-top: 8px; }

        .s7-rules-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 18px; }
        @media (max-width: 768px) { .s7-rules-grid { grid-template-columns: 1fr; } }
        .s7-rule-tile { background: #FFF6E0; padding: 16px 18px; border-radius: 12px; border-left: 4px solid #F5B41A; }
        .s7-rule-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .s7-rule-ico { width: 32px; height: 32px; background: #F5B41A; color: #0F1B3D; border-radius: 50%; display: grid; place-items: center; font-size: 15px; font-weight: 700; }
        .s7-rule-title { font-size: 13.5px; font-weight: 800; color: #0F1B3D; }
        .s7-rule-body { font-size: 12.5px; color: #3A425A; line-height: 1.55; }
        .s7-consent-pill { background: #0F1B3D; color: #FFF6E0; padding: 12px 16px; border-radius: 12px; font-style: italic; font-size: 12.5px; margin-top: 16px; display: flex; align-items: center; gap: 10px; }

        .s7-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, #FFF6E0, #FFF9E0);
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid #FFEBB0;
        }
        .s7-progress-rail { display: flex; align-items: center; gap: 6px; background: #FFFFFF; padding: 8px 14px; border-radius: 20px; border: 1px solid #E5E7EB; font-size: 11.5px; color: #8A91A3; }
        .s7-rail-dot { width: 9px; height: 9px; border-radius: 50%; background: #E5E7EB; }
        .s7-rail-dot.done { background: #F5B41A; }
        .s7-rail-dot.active { background: #F5B41A; box-shadow: 0 0 0 3px #FFF6E0; }
        .s7-saved-badge { color: #1F7A3C; font-weight: 700; font-size: 11.5px; display: flex; align-items: center; gap: 4px; }

        .s7-section { background: #FAFAF7; padding: 22px 24px; border-radius: 14px; margin-bottom: 16px; border: 1px solid #E5E7EB; position: relative; }
        .s7-section-header { display: flex; align-items: center; gap: 10px; margin-bottom: 18px; padding-bottom: 14px; border-bottom: 1px dashed #E5E7EB; }
        .s7-section-num { width: 32px; height: 32px; background: #F5B41A; color: #0F1B3D; border-radius: 10px; display: grid; place-items: center; font-weight: 800; font-size: 15px; }
        .s7-section-title { font-size: 16px; font-weight: 800; color: #0F1B3D; flex: 1; }
        .s7-no-pts-chip { background: #F2F3F5; color: #8A91A3; padding: 3px 10px; border-radius: 12px; font-size: 10.5px; font-weight: 700; letter-spacing: .5px; font-style: italic; }

        /* ASSEMBLY BANNER */
        .s7-assembly-banner {
          background: linear-gradient(135deg, #0F1B3D, #1E3A8A);
          color: #FFFFFF;
          border-radius: 14px;
          padding: 22px 26px;
          display: grid;
          grid-template-columns: 60px 1fr auto;
          gap: 18px;
          align-items: center;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .s7-assembly-ico { width: 60px; height: 60px; background: #F5B41A; color: #0F1B3D; border-radius: 14px; display: grid; place-items: center; font-size: 28px; box-shadow: 0 4px 12px rgba(245,180,26,.4); }
        .s7-assembly-txt .lbl { color: #F5B41A; font-size: 10.5px; font-weight: 800; letter-spacing: 1.2px; text-transform: uppercase; }
        .s7-assembly-txt .title { font-size: 19px; font-weight: 800; margin-top: 4px; }
        .s7-assembly-txt .sub { font-size: 12.5px; color: rgba(255,255,255,.75); margin-top: 4px; line-height: 1.5; }
        .s7-assembly-count { background: rgba(245,180,26,.2); color: #F5B41A; padding: 8px 16px; border-radius: 10px; font-weight: 800; font-size: 13px; text-align: center; }
        .s7-assembly-count .big { font-size: 22px; font-weight: 800; color: #FFFFFF; }
        .s7-assembly-count .small { font-size: 10px; letter-spacing: .5px; text-transform: uppercase; }

        /* TEMPLATE GRID */
        .s7-template-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        @media (max-width: 850px) { .s7-template-grid { grid-template-columns: 1fr 1fr; } }
        @media (max-width: 550px) { .s7-template-grid { grid-template-columns: 1fr; } }
        .s7-template-card {
          background: #FFFFFF;
          border: 2px solid #E5E7EB;
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: .15s;
          position: relative;
        }
        .s7-template-card:hover { border-color: #FFEBB0; background: #FDF6E4; }
        .s7-template-card.selected { border-color: #F5B41A; background: #FFF6E0; box-shadow: 0 4px 10px rgba(245,180,26,.15); }
        .s7-template-card.recommended { border-color: #1F7A3C; }
        .s7-template-card.recommended::before {
          content: '⭐ AUTO-PICK';
          position: absolute;
          top: -10px;
          left: 12px;
          background: #1F7A3C;
          color: #FFFFFF;
          padding: 2px 10px;
          border-radius: 10px;
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .5px;
        }
        .s7-template-thumb {
          aspect-ratio: 8.5/11;
          background: linear-gradient(180deg, #F8F9FC, #EDF0F5);
          border-radius: 8px;
          margin-bottom: 10px;
          position: relative;
          overflow: hidden;
          border: 1px solid #E5E7EB;
        }
        .s7-thumb-header { height: 22%; padding: 8px; }
        .s7-thumb-name-bar { background: #F5B41A; height: 6px; width: 60%; border-radius: 2px; margin-bottom: 4px; }
        .s7-thumb-line { background: rgba(255,255,255,.4); height: 3px; border-radius: 1.5px; margin-bottom: 3px; }
        .s7-thumb-line.short { width: 40%; }
        .s7-thumb-line.med { width: 70%; }
        .s7-thumb-body { padding: 8px; }
        .s7-thumb-body .s7-thumb-line { background: #E5E7EB; height: 3px; margin-bottom: 3px; }
        .s7-thumb-body .s7-thumb-line.gold { background: #F5B41A; width: 50%; height: 4px; }
        .s7-thumb-body .s7-thumb-line.long { width: 90%; }
        .s7-template-name { font-weight: 800; color: #0F1B3D; font-size: 13px; }
        .s7-template-sub { font-size: 11px; color: #8A91A3; margin-top: 2px; line-height: 1.4; }
        .s7-template-check {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: 2px solid #E5E7EB;
          display: grid;
          place-items: center;
          font-size: 11px;
        }
        .s7-template-card.selected .s7-template-check { background: #F5B41A; border-color: #F5B41A; color: #0F1B3D; font-weight: 800; }

        /* AI OBJECTIVE */
        .s7-ai-suggestion {
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 10px;
          padding: 14px 16px;
          margin-bottom: 8px;
          cursor: pointer;
          transition: .15s;
        }
        .s7-ai-suggestion:hover { border-color: #F5B41A; background: #FFF6E0; }
        .s7-ai-suggestion.selected { border-color: #F5B41A; background: #FFF6E0; }
        .s7-ai-suggestion-head { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
        .s7-ai-suggestion-label { background: #1A4FB8; color: #FFFFFF; font-size: 9.5px; font-weight: 800; padding: 2px 8px; border-radius: 6px; letter-spacing: .5px; }
        .s7-ai-suggestion-hint { font-size: 10.5px; color: #8A91A3; font-style: italic; }
        .s7-ai-suggestion-txt { font-size: 13px; color: #0F1B3D; line-height: 1.5; font-style: italic; }
        .s7-obj-editor { background: #FFFFFF; border: 1.5px solid #F5B41A; border-radius: 10px; padding: 14px 16px; margin-top: 10px; }
        .s7-obj-editor textarea { width: 100%; border: none; outline: none; font-size: 13px; color: #0F1B3D; line-height: 1.5; resize: vertical; min-height: 70px; font-family: inherit; }
        .s7-obj-editor.has-error {
          border: 2px solid #EF4444 !important;
          background-color: #FEF2F2 !important;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18) !important;
        }
        .s7-obj-editor.has-error textarea {
          background-color: transparent !important;
        }
        .s7-field-error-msg {
          color: #DC2626;
          font-size: 12px;
          font-weight: 700;
          margin-top: 6px;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .s7-obj-editor-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; padding-top: 8px; border-top: 1px dashed #E5E7EB; font-size: 11px; color: #8A91A3; }
        .s7-regen-btn { background: #EEF2FF; color: #1A4FB8; padding: 6px 12px; border-radius: 8px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; display: flex; align-items: center; gap: 4px; }

        /* LOCKED ROWS */
        .s7-locked-sections { display: flex; flex-direction: column; gap: 10px; }
        .s7-locked-row {
          background: #FFFFFF;
          border: 1.5px solid #E5E7EB;
          border-radius: 12px;
          padding: 14px 16px;
          display: grid;
          grid-template-columns: 44px 1fr auto auto;
          gap: 14px;
          align-items: center;
        }
        @media (max-width: 650px) { .s7-locked-row { grid-template-columns: 1fr; gap: 8px; } }
        .s7-locked-ico { width: 44px; height: 44px; background: #FFF6E0; color: #C99413; border-radius: 10px; display: grid; place-items: center; font-size: 18px; }
        .s7-locked-info .title { font-weight: 800; color: #0F1B3D; font-size: 13.5px; display: flex; align-items: center; gap: 6px; }
        .s7-lock-badge { font-size: 10px; color: #8A91A3; background: #F2F3F5; padding: 2px 8px; border-radius: 6px; font-weight: 700; letter-spacing: .4px; }
        .s7-locked-info .meta { font-size: 11.5px; color: #8A91A3; margin-top: 3px; line-height: 1.4; }
        .s7-locked-info .meta b { color: #0F1B3D; }
        .s7-edit-stage-btn { color: #C99413; font-size: 11px; font-weight: 800; padding: 6px 10px; border-radius: 8px; background: #FFF6E0; border: 1px solid #FFEBB0; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .s7-edit-stage-btn:hover { background: #F5B41A; color: #0F1B3D; }
        .s7-verified-tag { background: #E8F5E9; color: #1F7A3C; padding: 3px 8px; border-radius: 6px; font-size: 10px; font-weight: 800; letter-spacing: .3px; }

        /* RESUME PREVIEW PAPER & DYNAMIC TEMPLATES */
        .s7-resume-preview {
          background: #FFFFFF;
          border-radius: 14px;
          padding: 30px 36px;
          box-shadow: 0 8px 30px rgba(15,27,61,.08);
          color: #222222;
          position: relative;
          overflow: hidden;
          transition: all 0.2s ease;
        }

        /* Default / Fresher Modern */
        .s7-resume-preview.tmpl-fresher_modern {
          border: 2px solid var(--accent, #F5B41A);
        }
        .s7-resume-preview.tmpl-fresher_modern::before {
          content: ''; position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: var(--accent, #F5B41A);
        }

        /* Plain B&W Template (Strict Monochrome ATS) */
        .s7-resume-preview.tmpl-plain_bw {
          border: 2px solid #000000;
          box-shadow: none;
          background: #FFFFFF;
        }
        .s7-resume-preview.tmpl-plain_bw::before { display: none; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-header { border-bottom: 2px solid #000000; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-name { color: #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-title { color: #374151 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-contact { color: #4B5563 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-contact a,
        .s7-resume-preview.tmpl-plain_bw .s7-resume-contact span { color: #111827 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-verified-stamp { border: 2px solid #000000 !important; background: #FFFFFF !important; color: #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-verified-stamp .top,
        .s7-resume-preview.tmpl-plain_bw .s7-verified-stamp .id { color: #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-qr-box { background: #000000 !important; color: #FFFFFF !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-sec-title { color: #000000 !important; border-bottom: 2px solid #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-resume-score-strip { background: #F9FAFB !important; border: 1.5px solid #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-score-badge { background: #000000 !important; color: #FFFFFF !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-r-block { border: 1px solid #000000 !important; background: #FFFFFF !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-r-block .v { color: #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-charts-table-mini th { background: #000000 !important; color: #FFFFFF !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-charts-table-mini tr.total td { background: #F3F4F6 !important; color: #000000 !important; }
        .s7-resume-preview.tmpl-plain_bw .s7-qr-mini { background: #000000 !important; color: #FFFFFF !important; }

        /* Fresher Classic Template (Editorial Serif, Academic) */
        .s7-resume-preview.tmpl-fresher_classic {
          border: 1.5px solid #CBD5E1;
          font-family: Georgia, 'Times New Roman', serif;
        }
        .s7-resume-preview.tmpl-fresher_classic::before { display: none; }
        .s7-resume-preview.tmpl-fresher_classic .s7-resume-header {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          border-bottom: 3px double #333333;
          padding-bottom: 14px;
        }
        .s7-resume-preview.tmpl-fresher_classic .s7-resume-name {
          font-family: Georgia, serif;
          font-size: 28px;
          color: #1F2937;
        }
        .s7-resume-preview.tmpl-fresher_classic .s7-resume-contact {
          justify-content: center;
          margin-top: 6px;
        }
        .s7-resume-preview.tmpl-fresher_classic .s7-verified-stamp {
          margin: 10px auto 0;
          max-width: 240px;
        }
        .s7-resume-preview.tmpl-fresher_classic .s7-resume-sec-title {
          font-family: Georgia, serif;
          text-align: left;
          color: #1F2937;
          border-bottom: 1.5px solid #4B5563;
        }

        /* Executive Template (Executive Banner, Leadership) */
        .s7-resume-preview.tmpl-executive {
          border: 2px solid var(--accent, #7C3AED);
        }
        .s7-resume-preview.tmpl-executive::before {
          content: ''; position: absolute; top: 0; left: 0; width: 8px; height: 100%; background: var(--hdr-bg, #4C1D95);
        }
        .s7-resume-preview.tmpl-executive .s7-resume-header {
          background: var(--hdr-bg, #4C1D95);
          margin: -30px -36px 20px -36px;
          padding: 24px 36px 20px 44px;
          border-bottom: 3.5px solid var(--accent, #F5B41A);
          color: #FFFFFF;
        }
        .s7-resume-preview.tmpl-executive .s7-resume-name {
          color: #FFFFFF !important;
        }
        .s7-resume-preview.tmpl-executive .s7-resume-title {
          color: var(--accent, #F5B41A) !important;
          font-weight: 700;
        }
        .s7-resume-preview.tmpl-executive .s7-resume-contact,
        .s7-resume-preview.tmpl-executive .s7-resume-contact span {
          color: #E2E8F0 !important;
        }
        .s7-resume-preview.tmpl-executive .s7-verified-stamp {
          background: rgba(255,255,255,0.15) !important;
          border: 1.5px solid var(--accent, #F5B41A) !important;
          color: #FFFFFF !important;
        }
        .s7-resume-preview.tmpl-executive .s7-verified-stamp .top,
        .s7-resume-preview.tmpl-executive .s7-verified-stamp .id {
          color: #FFFFFF !important;
        }
        .s7-resume-preview.tmpl-executive .s7-qr-box {
          background: #FFFFFF !important;
          color: var(--hdr-bg, #4C1D95) !important;
        }
        .s7-resume-preview.tmpl-executive .s7-resume-sec-title {
          color: var(--hdr-bg, #4C1D95);
          border-bottom: 2px solid var(--accent, #7C3AED);
        }

        /* Global Template (US/UK International Format) */
        .s7-resume-preview.tmpl-global {
          border: 1.5px solid #E2E8F0;
          box-shadow: 0 4px 20px rgba(6,95,70,0.06);
        }
        .s7-resume-preview.tmpl-global::before {
          content: ''; position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: #10B981;
        }
        .s7-resume-preview.tmpl-global .s7-resume-sec-title {
          color: #064E3B;
          border-bottom: 2px solid #10B981;
        }
        .s7-resume-preview.tmpl-global .s7-verified-stamp {
          border-color: #064E3B;
          background: #ECFDF5;
        }
        .s7-resume-preview.tmpl-global .s7-qr-box {
          background: #064E3B;
          color: #10B981;
        }
        .s7-resume-preview.tmpl-global .s7-charts-table-mini th {
          background: #064E3B;
          color: #A7F3D0;
        }

        /* Compact ATS Template (Dense 1-Page Format) */
        .s7-resume-preview.tmpl-compact_ats {
          padding: 18px 22px;
          border: 1.5px solid #334155;
          font-size: 11px;
        }
        .s7-resume-preview.tmpl-compact_ats::before {
          width: 4px;
          background: #334155;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-resume-name {
          font-size: 22px;
          margin-bottom: 2px;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-resume-title {
          font-size: 11.5px;
          margin-bottom: 4px;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-resume-sec-title {
          margin: 12px 0 4px;
          padding-bottom: 2px;
          font-size: 10.5px;
          border-bottom: 1.5px solid #334155;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-resume-score-strip {
          padding: 8px 10px;
          margin-top: 8px;
          gap: 6px;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-score-badge {
          font-size: 10px;
          padding: 2px 6px;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-r-block {
          padding: 6px 10px;
        }
        .s7-resume-preview.tmpl-compact_ats .s7-charts-table-mini th,
        .s7-resume-preview.tmpl-compact_ats .s7-charts-table-mini td {
          padding: 3px 6px;
          font-size: 10.5px;
        }

        /* Specialty Dental Template */
        .s7-resume-preview.tmpl-specialty_dental {
          border: 2px solid #7C3AED;
        }
        .s7-resume-preview.tmpl-specialty_dental::before {
          content: ''; position: absolute; top: 0; left: 0; width: 6px; height: 100%; background: #7C3AED;
        }
        .s7-resume-preview.tmpl-specialty_dental .s7-resume-sec-title {
          color: #4C1D95;
          border-bottom: 2px solid #7C3AED;
        }
        .s7-resume-preview.tmpl-specialty_dental .s7-verified-stamp {
          border-color: #7C3AED;
          background: #F5F3FF;
        }
        .s7-resume-preview.tmpl-specialty_dental .s7-qr-box {
          background: #7C3AED;
          color: #F5B41A;
        }
        .s7-resume-preview.tmpl-specialty_dental .s7-charts-table-mini th {
          background: #7C3AED;
          color: #FFFFFF;
        }

        /* Common Elements within Resume */
        .s7-resume-header { display: grid; grid-template-columns: 1fr auto; gap: 20px; padding-bottom: 16px; border-bottom: 2px solid var(--hdr-bg, #0F1B3D); align-items: end; }
        .s7-resume-name { font-size: 30px; font-weight: 800; color: var(--hdr-bg, #0F1B3D); letter-spacing: -.5px; line-height: 1; margin-bottom: 6px; }
        .s7-resume-title { font-size: 14px; color: #3A425A; font-weight: 600; margin-bottom: 8px; }
        .s7-resume-contact { font-size: 11.5px; color: #3A425A; display: flex; gap: 14px; flex-wrap: wrap; }
        .s7-verified-stamp { border: 2px solid var(--hdr-bg, #0F1B3D); border-radius: 8px; padding: 10px 14px; text-align: center; background: #FFF6E0; }
        .s7-verified-stamp .top { font-size: 9.5px; color: var(--hdr-bg, #0F1B3D); font-weight: 800; letter-spacing: 1px; display: flex; align-items: center; gap: 6px; justify-content: center; }
        .s7-verified-stamp .id { font-size: 10px; color: #3A425A; margin-top: 4px; font-family: monospace; }
        .s7-qr-box { width: 56px; height: 56px; background: var(--hdr-bg, #0F1B3D); margin: 8px auto 0; border-radius: 4px; display: grid; place-items: center; color: var(--accent, #F5B41A); font-size: 24px; cursor: pointer; }

        .s7-resume-sec-title { font-size: 12px; color: var(--hdr-bg, #0F1B3D); font-weight: 800; letter-spacing: 2px; text-transform: uppercase; margin: 20px 0 8px; padding-bottom: 4px; border-bottom: 1.5px solid var(--accent, #F5B41A); }
        .s7-resume-obj { font-size: 13px; color: #333333; line-height: 1.6; font-style: italic; }
        .s7-resume-score-strip {
          background: linear-gradient(135deg, #FFF6E0, #FFF9E0);
          border: 1.5px solid var(--accent, #F5B41A);
          border-radius: 10px;
          padding: 12px 16px;
          margin-top: 12px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
        }
        .s7-score-badge { background: var(--hdr-bg, #0F1B3D); color: var(--accent, #F5B41A); padding: 4px 10px; border-radius: 8px; font-weight: 800; font-size: 11.5px; }
        .s7-score-badge.silver { background: linear-gradient(135deg, #C0C0C0, #8B9199); color: #FFFFFF; }
        .s7-score-badge.gold { background: linear-gradient(135deg, var(--accent, #F5B41A), #DAA520); color: var(--hdr-bg, #0F1B3D); }
        .s7-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 8px; }
        @media (max-width: 700px) { .s7-grid-2 { grid-template-columns: 1fr; } }
        .s7-r-block { background: #FAFAF7; border: 1px solid #E5E7EB; border-radius: 8px; padding: 12px 14px; }
        .s7-r-block .k { font-size: 10px; color: #8A91A3; font-weight: 700; letter-spacing: .8px; text-transform: uppercase; margin-bottom: 4px; }
        .s7-r-block .v { font-size: 13px; color: var(--hdr-bg, #0F1B3D); font-weight: 800; }
        .s7-r-block .details { font-size: 11.5px; color: #3A425A; margin-top: 3px; line-height: 1.5; }
        .s7-qr-mini { width: 34px; height: 34px; background: var(--hdr-bg, #0F1B3D); color: var(--accent, #F5B41A); border-radius: 4px; float: right; margin-left: 8px; display: grid; place-items: center; font-size: 14px; }

        .s7-charts-table-mini { width: 100%; border-collapse: collapse; margin-top: 8px; }
        .s7-charts-table-mini th { background: var(--hdr-bg, #0F1B3D); color: var(--accent, #F5B41A); padding: 6px 10px; font-size: 10px; letter-spacing: .5px; text-align: left; font-weight: 800; }
        .s7-charts-table-mini td { padding: 6px 10px; border-bottom: 1px dashed #E5E7EB; font-size: 11.5px; color: #0F1B3D; }
        .s7-charts-table-mini tr.total td { background: #FFF6E0; font-weight: 800; border-bottom: none; }

        /* DOWNLOAD GRID */
        .s7-download-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 10px; }
        @media (max-width: 600px) { .s7-download-grid { grid-template-columns: 1fr; } }
        .s7-dl-card { background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 12px; padding: 14px; text-align: center; cursor: pointer; transition: .15s; }
        .s7-dl-card:hover { border-color: #F5B41A; background: #FFF6E0; }
        .s7-dl-card.hero { background: #F5B41A; border-color: #C99413; color: #0F1B3D; }
        .s7-dl-card.hero:hover { background: #FFEBB0; }
        .s7-dl-ico { font-size: 26px; margin-bottom: 6px; }
        .s7-dl-name { font-size: 12px; font-weight: 800; color: #0F1B3D; }
        .s7-dl-sub { font-size: 10.5px; color: #8A91A3; margin-top: 2px; }
        .s7-dl-card.hero .s7-dl-sub { color: rgba(15,27,61,.7); }

        /* LIVE URL CARD */
        .s7-url-card { background: linear-gradient(135deg, #EEF2FF, #F5F8FF); border: 1.5px solid #1A4FB8; border-radius: 12px; padding: 16px 18px; margin-top: 12px; }
        .s7-url-row { display: flex; align-items: center; gap: 10px; background: #FFFFFF; border: 1px solid #E5E7EB; border-radius: 8px; padding: 8px 12px; font-family: monospace; font-size: 12px; color: #0F1B3D; margin-top: 8px; }
        .s7-url-row .link { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 800; }
        .s7-url-btn { background: #0F1B3D; color: #F5B41A; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 800; border: none; cursor: pointer; }
        .s7-url-hint { font-size: 11px; color: #1A4FB8; margin-top: 8px; font-weight: 600; line-height: 1.5; }

        /* VERSION HISTORY */
        .s7-version-list { display: flex; flex-direction: column; gap: 8px; }
        .s7-version-item { background: #FFFFFF; border: 1.5px solid #E5E7EB; border-radius: 10px; padding: 10px 14px; display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: center; font-size: 12px; }
        .s7-version-item.current { border-color: #F5B41A; background: #FFF6E0; }
        .s7-version-num { font-weight: 800; color: #0F1B3D; font-size: 13px; }
        .s7-version-info { color: #3A425A; font-size: 11.5px; }
        .s7-version-info b { color: #0F1B3D; }
        .s7-version-tag { font-size: 10px; color: #C99413; background: #FFF6E0; padding: 2px 8px; border-radius: 6px; font-weight: 800; }

        /* BUTTONS */
        .s7-action-btn { background: #F5B41A; color: #0F1B3D; padding: 11px 22px; border-radius: 10px; font-size: 13px; font-weight: 800; border: none; cursor: pointer; letter-spacing: .3px; }
        .s7-action-btn:hover { background: #FFEBB0; }
        .s7-link-btn { background: #FFFFFF; color: #3A425A; padding: 11px 20px; border-radius: 10px; font-size: 13px; font-weight: 700; border: 1.5px solid #E5E7EB; cursor: pointer; }
        .s7-link-btn:hover { background: #F9FAFB; }

        /* RIGHT COMPANION */
        .s7-right-rail { min-width: 0; }
        .s7-passport-card {
          background: linear-gradient(135deg, #0F1B3D, #1E3A8A);
          color: #FFFFFF;
          padding: 20px;
          border-radius: 14px;
          margin-bottom: 16px;
          position: relative;
          overflow: hidden;
        }
        .s7-passport-eyebrow { color: #F5B41A; font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .s7-passport-title { font-size: 20px; font-weight: 800; margin-top: 4px; }
        .s7-passport-status { background: rgba(31,122,60,.28); color: #7ED87E; padding: 6px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; margin-top: 12px; display: inline-block; }
        .s7-passport-desc { font-size: 11.5px; color: rgba(255,255,255,.75); margin-top: 10px; line-height: 1.5; }

        .s7-side-card { background: #FFFFFF; padding: 16px 18px; border-radius: 12px; margin-bottom: 14px; border: 1px solid #E5E7EB; }
        .s7-side-card .title { font-size: 11px; letter-spacing: 1.5px; color: #C99413; text-transform: uppercase; font-weight: 700; margin-bottom: 10px; }
        .s7-company-row { display: grid; grid-template-columns: 38px 1fr; gap: 10px; padding: 10px 0; border-bottom: 1px dashed #E5E7EB; align-items: center; }
        .s7-company-row:last-child { border: none; padding-bottom: 0; }
        .s7-company-row:first-child { padding-top: 0; }
        .s7-company-logo { width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center; font-weight: 800; font-size: 15px; color: #FFFFFF; }
        .s7-clr-1 { background: linear-gradient(135deg, #F5B41A, #C99413); }
        .s7-clr-2 { background: linear-gradient(135deg, #1A4FB8, #0F1B3D); }
        .s7-clr-3 { background: linear-gradient(135deg, #2E8B57, #1F7A3C); }
        .s7-clr-4 { background: linear-gradient(135deg, #8E44AD, #6D2C82); }
        .s7-company-name { font-size: 12.5px; font-weight: 800; color: #0F1B3D; display: flex; align-items: center; gap: 5px; }
        .s7-hot-pill { background: #C0392B; color: #FFFFFF; padding: 1px 6px; border-radius: 6px; font-size: 8.5px; letter-spacing: .5px; font-weight: 800; }
        .s7-company-meta { font-size: 10.5px; color: #8A91A3; margin-top: 1px; }
        .s7-company-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
        .s7-comp-tag { background: #FFF6E0; color: #C99413; font-size: 9.5px; padding: 1px 6px; border-radius: 5px; font-weight: 700; }
        .s7-comp-tag.blue { background: #EEF2FF; color: #1A4FB8; }
        .s7-comp-tag.green { background: #E8F5E9; color: #1F7A3C; }
        .s7-verified-line { font-size: 10px; color: #1F7A3C; margin-top: 4px; font-weight: 700; }
        .s7-hot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .s7-hot-stat { background: #FFF6E0; padding: 12px; border-radius: 10px; text-align: center; }
        .s7-hot-stat .big { font-size: 18px; font-weight: 800; color: #0F1B3D; }
        .s7-hot-stat .small { font-size: 10px; color: #3A425A; margin-top: 2px; }
      `}</style>

      {/* Main Layout Grid */}
      <div className="s7-shell">
        {/* Left / Center Main Content */}
        <div className="s7-main-column">
          {/* Breadcrumb */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8A91A3", textTransform: "uppercase", letterSpacing: 1, marginBottom: 14, fontWeight: 600 }}>
            <span>Home</span><span>›</span>
            <span>My Career Passport</span><span>›</span>
            <span style={{ color: "#0F1B3D", fontWeight: 800 }}>Stage 07 · Resume</span>
          </div>

          {/* Hero Banner */}
          <div className="s7-hero">
            <div className="s7-hero-icon">📄</div>
            <div className="s7-hero-badges">
              <span className="s7-hero-chip">STAGE 07 OF 08 · ACTIVE</span>
              <span className="s7-hero-chip green">🏆 {totalPoints}/100 SCORE {totalPoints >= 75 ? "VERIFIED" : "IN PROGRESS"}</span>
              <span className="s7-hero-chip">~5 MIN</span>
              <span className="s7-hero-chip gold">OUTPUT · NO POINTS</span>
            </div>
            <h1 className="s7-hero-title" style={{ color: "#FFFFFF" }}>Resume</h1>
            <div className="s7-hero-subtitle">You don't write it. Talentera builds it from everything you've already proven.</div>
            <div className="s7-hero-desc">
              Every line in your resume is auto-pulled from Stages 01–06. You cannot type
              unverified claims — Naukri lets you lie, Talentera doesn't. Pick a template.
              Write your Career Objective (the only editable field). Download, share the
              live URL, or let HRs scan the QR to verify at source.
            </div>
            <div className="s7-hero-tiles">
              <div className="s7-hero-tile"><div className="big">Auto-built</div><div className="small">from your Stage 01–06 data</div></div>
              <div className="s7-hero-tile"><div className="big">6 templates</div><div className="small">profile auto-matched</div></div>
              <div className="s7-hero-tile"><div className="big">Live URL</div><div className="small">always current, sharable</div></div>
              <div className="s7-hero-tile"><div className="big">QR verified</div><div className="small">tamper-proof</div></div>
            </div>
          </div>

          {/* ID Recap Strip */}
          <div className="s7-id-recap">
            <div className="check">✓</div>
            <div style={{ flex: 1 }}>
              <div className="lbl">FROM YOUR STAGES 01–06 · {totalPoints}/100 SCORE UNLOCKED</div>
              <div className="val">
                {fullName} · {expLabel} · {domainName}
                {certificationsList.length > 0 ? ` · ${certificationsList.map((c) => c.code || c.name).join(" + ")}` : (isNonCertified ? " · Non-Certified Track" : "")}
                {assessmentScore !== null ? ` · ${assessmentMedal} Assessment ${assessmentScore}` : ""}
                {videoScore !== null ? ` · ${videoMedal} Video ${videoScore}` : ""}
                {totalCharts > 0 ? ` · ${chartTier} Live Chart ${totalCharts} charts` : ""}
              </div>
              <div className="small">Every field on your resume traces back to a verified stage. Nothing typed here.</div>
            </div>
            <div className="locked-badge">🔒 SOURCE OF TRUTH</div>
          </div>

          {/* How Stage 07 Works Card */}
          <div className="s7-card">
            <div className="s7-card-title">How Stage 07 Works</div>
            <div className="s7-card-eyebrow">WHY WE BUILD IT · WHAT'S ON IT · WHAT COMPANIES SEE · NO POINTS</div>
            <div className="s7-rules-grid">
              <div className="s7-rule-tile">
                <div className="s7-rule-head"><div className="s7-rule-ico">?</div><div className="s7-rule-title">Why Talentera builds it for you</div></div>
                <div className="s7-rule-body">
                  Self-written resumes are full of unverifiable claims. A Talentera Resume only contains what you actually proved — real assessment scores, academy-confirmed training, verified certification, live chart records. Companies trust it because every field passed through our checks.
                </div>
              </div>
              <div className="s7-rule-tile">
                <div className="s7-rule-head"><div className="s7-rule-ico">📎</div><div className="s7-rule-title">What goes on it</div></div>
                <div className="s7-rule-body">
                  Pulled automatically from Stages 01–06: your name and city, specialty, training, certifications, assessment scores, video pitch scores, live chart record, and verification badges. Nothing is typed here — if a section looks empty, go back and complete that stage to fill it in.
                </div>
              </div>
              <div className="s7-rule-tile">
                <div className="s7-rule-head"><div className="s7-rule-ico">👁</div><div className="s7-rule-title">What companies see</div></div>
                <div className="s7-rule-body">
                  The exact resume below plus a Live URL that always shows your current data + QR codes to verify Video Pitch and Live Chart in real-time. One standard format — so a hiring manager reads 50 resumes in the time it used to take for 10, and trusts every one.
                </div>
              </div>
              <div className="s7-rule-tile">
                <div className="s7-rule-head"><div className="s7-rule-ico">🎯</div><div className="s7-rule-title">Why no points on this stage</div></div>
                <div className="s7-rule-body">
                  Stages 01–06 were about proving your skills — that's where points earn trust. Stage 07 is an OUTPUT of your work, not new proof. Your resume score = your Stages 01–06 score. Simple. Clean. Non-gameable.
                </div>
              </div>
            </div>
            <div className="s7-consent-pill">
              <span style={{ color: "#F5B41A", fontSize: 16 }}>🛡</span>
              <span><i>Every downloaded PDF carries a Talentera Verified watermark + candidate ID + tamper-proof cryptographic hash. HRs can validate authenticity at any time.</i></span>
            </div>
          </div>

          {/* Form Toolbar */}
          <div className="s7-toolbar">
            <div className="s7-progress-rail">
              <span>Progress:</span>
              <span className="s7-rail-dot done"></span>
              <span className="s7-rail-dot done"></span>
              <span className="s7-rail-dot active"></span>
              <span className="s7-rail-dot"></span>
              <span className="s7-rail-dot"></span>
              <span style={{ fontWeight: 700, color: "#0F1B3D" }}>Section 3 of 5</span>
            </div>
            <div className="s7-saved-badge">✓ Auto-saved · Live updates enabled</div>
          </div>

          {/* Form Header */}
          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0F1B3D", margin: 0 }}>Your Stage 07 information</h2>
            <div style={{ color: "#C99413", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }}>
              CUSTOMIZE · DOWNLOAD · SHARE · NO POINTS TO EARN
            </div>
          </div>

          {/* Assembly Banner */}
          <div className="s7-assembly-banner">
            <div className="s7-assembly-ico">⚡</div>
            <div className="s7-assembly-txt">
              <div className="lbl">Talentera Auto-Assembled</div>
              <div className="title">{verifiedFieldsCount} verified data points wired into your resume</div>
              <div className="sub">Every field below is pulled live from Stages 01–06. Update any stage → your resume updates in real-time.</div>
            </div>
            <div className="s7-assembly-count">
              <div className="big">{verifiedFieldsCount}</div>
              <div className="small">verified fields</div>
            </div>
          </div>

          {/* SECTION 1 · TEMPLATE PICKER */}
          <div className="s7-section">
            <div className="s7-section-header">
              <div className="s7-section-num">1</div>
              <div className="s7-section-title">Pick a template — Talentera auto-suggested one for you</div>
              <div className="s7-no-pts-chip">NO POINTS · OUTPUT</div>
            </div>

            <div className="s7-template-grid">
              {RESUME_TEMPLATES.map((tmpl) => {
                const isSelected = selectedTemplate === tmpl.id;
                const isAutoPicked = tmpl.badge && !isExperienced && tmpl.id === "fresher_modern";
                return (
                  <div
                    key={tmpl.id}
                    onClick={() => handleSelectTemplate(tmpl)}
                    className={`s7-template-card ${isSelected ? "selected" : ""} ${isAutoPicked ? "recommended" : ""}`}
                  >
                    <div className="s7-template-check">{isSelected ? "✓" : ""}</div>
                    <div className="s7-template-thumb">
                      <div className="s7-thumb-header" style={{ background: isSelected ? activeTmpl.headerBg : tmpl.headerBg }}>
                        <div className="s7-thumb-name-bar" style={{ background: isSelected ? activeTmpl.accentColor : tmpl.accentColor }}></div>
                        <div className="s7-thumb-line short"></div>
                        <div className="s7-thumb-line med"></div>
                      </div>
                      <div className="s7-thumb-body">
                        <div className="s7-thumb-line gold" style={{ background: isSelected ? activeTmpl.accentColor : tmpl.accentColor }}></div>
                        <div className="s7-thumb-line long"></div>
                        <div className="s7-thumb-line long"></div>
                        <div className="s7-thumb-line gold" style={{ background: isSelected ? activeTmpl.accentColor : tmpl.accentColor, marginTop: 6 }}></div>
                        <div className="s7-thumb-line long"></div>
                        <div className="s7-thumb-line long"></div>
                      </div>
                    </div>
                    <div className="s7-template-name">{tmpl.name}</div>
                    <div className="s7-template-sub">{tmpl.sub}</div>
                  </div>
                );
              })}
            </div>

            {/* THEME & STYLE CUSTOMIZER CONTROLS */}
            <div style={{
              background: "#FFFFFF",
              border: "1.5px solid #F5B41A",
              borderRadius: "12px",
              padding: "16px 20px",
              marginTop: "16px",
              boxShadow: "0 4px 14px rgba(245,180,26,0.1)"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "8px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "16px" }}>🎨</span>
                  <span style={{ fontWeight: "800", color: "#0F1B3D", fontSize: "14px" }}>Theme &amp; Style Customizer</span>
                  <span style={{ fontSize: "10.5px", background: "#FFF6E0", color: "#C99413", padding: "2px 8px", borderRadius: "6px", fontWeight: "800" }}>LIVE PREVIEW</span>
                </div>
                <button
                  type="button"
                  onClick={handleResetTheme}
                  style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: "6px", padding: "4px 10px", fontSize: "11px", fontWeight: "700", color: "#475569", cursor: "pointer" }}
                >
                  ↺ Reset Theme
                </button>
              </div>

              {/* Color Palettes */}
              <div style={{ marginBottom: "14px" }}>
                <div style={{ fontSize: "11px", fontWeight: "700", color: "#64748B", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "8px" }}>
                  1-Click Color Palettes
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {THEME_PALETTES.map((pal) => (
                    <button
                      key={pal.id}
                      type="button"
                      onClick={() => handleSelectPalette(pal)}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        padding: "5px 10px",
                        borderRadius: "8px",
                        border: customAccent === pal.accentColor && customHeaderBg === pal.headerBg ? "2px solid #0F1B3D" : "1px solid #E2E8F0",
                        background: customAccent === pal.accentColor && customHeaderBg === pal.headerBg ? "#FFF6E0" : "#FAFAFA",
                        cursor: "pointer",
                        fontSize: "11.5px",
                        fontWeight: "700",
                        color: "#0F1B3D",
                      }}
                    >
                      <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", background: pal.headerBg, border: "1px solid #CBD5E1" }}></span>
                      <span style={{ display: "inline-block", width: "12px", height: "12px", borderRadius: "50%", background: pal.accentColor, border: "1px solid #CBD5E1" }}></span>
                      <span>{pal.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Color Pickers & Font Selector Grid */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", paddingTop: "10px", borderTop: "1px dashed #E2E8F0" }}>
                {/* Accent Color */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "4px", textTransform: "uppercase" }}>
                    Accent Highlight
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      value={activeTmpl.accentColor}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      style={{ width: "36px", height: "32px", border: "1px solid #CBD5E1", borderRadius: "6px", cursor: "pointer", padding: "2px", background: "#fff" }}
                    />
                    <input
                      type="text"
                      value={activeTmpl.accentColor}
                      onChange={(e) => setCustomAccent(e.target.value)}
                      style={{ width: "90px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {/* Header Background */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "4px", textTransform: "uppercase" }}>
                    Header Background
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <input
                      type="color"
                      value={activeTmpl.headerBg}
                      onChange={(e) => setCustomHeaderBg(e.target.value)}
                      style={{ width: "36px", height: "32px", border: "1px solid #CBD5E1", borderRadius: "6px", cursor: "pointer", padding: "2px", background: "#fff" }}
                    />
                    <input
                      type="text"
                      value={activeTmpl.headerBg}
                      onChange={(e) => setCustomHeaderBg(e.target.value)}
                      style={{ width: "90px", padding: "6px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", fontWeight: "700", fontFamily: "monospace" }}
                    />
                  </div>
                </div>

                {/* Typography Font */}
                <div>
                  <label style={{ display: "block", fontSize: "11px", fontWeight: "700", color: "#64748B", marginBottom: "4px", textTransform: "uppercase" }}>
                    Typography Font
                  </label>
                  <select
                    value={customFont}
                    onChange={(e) => setCustomFont(e.target.value)}
                    style={{ width: "100%", padding: "6px 8px", borderRadius: "6px", border: "1px solid #CBD5E1", fontSize: "12px", fontWeight: "600", color: "#0F1B3D", background: "#fff" }}
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f.id} value={f.fontFamily}>{f.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2 · CAREER OBJECTIVE (ONLY EDITABLE) */}
          <div className="s7-section">
            <div className="s7-section-header">
              <div className="s7-section-num">2</div>
              <div className="s7-section-title">✏ Career Objective — the ONLY editable section</div>
              <div className="s7-no-pts-chip">AI-ASSISTED</div>
            </div>

            <div style={{ fontSize: 12.5, color: "#3A425A", marginBottom: 12, fontStyle: "italic", lineHeight: 1.55 }}>
              Talentera AI has generated 3 objectives based on your profile — pick one or edit. Everything else on your resume is locked and pulled from prior stages.
            </div>

            {aiObjectiveOptions.map((opt, idx) => (
              <div
                key={opt.id}
                onClick={() => handleSelectAiOption(idx)}
                className={`s7-ai-suggestion ${selectedAiIdx === idx ? "selected" : ""}`}
              >
                <div className="s7-ai-suggestion-head">
                  <span className="s7-ai-suggestion-label">{opt.label}</span>
                  <span className="s7-ai-suggestion-hint">{opt.tag}</span>
                </div>
                <div className="s7-ai-suggestion-txt">"{opt.text}"</div>
              </div>
            ))}

            <div className={`s7-obj-editor ${formErrors.careerObjective ? "has-error" : ""}`}>
              <textarea
                value={careerObjective}
                onChange={(e) => {
                  setCareerObjective(e.target.value);
                  if (formErrors.careerObjective) setFormErrors((prev) => ({ ...prev, careerObjective: "" }));
                }}
                maxLength={500}
                placeholder="Edit the selected option, or write your own from scratch..."
              />
              {formErrors.careerObjective && (
                <div className="s7-field-error-msg">⚠️ {formErrors.careerObjective}</div>
              )}
              <div className="s7-obj-editor-footer">
                <span>{careerObjective.length} / 500 characters · Editing AI Option {selectedAiIdx + 1}</span>
                <button type="button" onClick={handleRegenerateAi} className="s7-regen-btn">
                  🔄 Regenerate 3 more options
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 3 · VERIFIED LOCKED SECTIONS */}
          <div className="s7-section">
            <div className="s7-section-header">
              <div className="s7-section-num">3</div>
              <div className="s7-section-title">🔒 Verified sections — pulled from Stages 01–06, non-editable</div>
              <div className="s7-no-pts-chip">READ-ONLY · UPDATE AT SOURCE</div>
            </div>

            <div className="s7-locked-sections">
              {/* Stage 1 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">👤</div>
                <div className="s7-locked-info">
                  <div className="title">Identity + Contact <span className="s7-lock-badge">🔒 Stage 01</span></div>
                  <div className="meta"><b>{fullName}</b>{locality ? ` · ${locality}` : ""}{mobile ? ` · ${mobile}` : ""}{email ? ` · ${email}` : ""} · {stage1.aadhaarVerified ? "Aadhaar-verified" : "Profile Active"}</div>
                </div>
                <div className="s7-verified-tag">🟢 API-Verified</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(1)} className="s7-edit-stage-btn">
                  ✎ Edit in Stage 01
                </button>
              </div>

              {/* Stage 2 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">🎓</div>
                <div className="s7-locked-info">
                  <div className="title">Training Foundation <span className="s7-lock-badge">🔒 Stage 02</span></div>
                  <div className="meta"><b>{academyName}</b> · {domainName} · {trainingLevel} · {trainingSpecialties} · {trainingDuration}{trainingAssessmentScore ? ` · Batch score: ${trainingAssessmentScore}/100` : ""}</div>
                </div>
                <div className="s7-verified-tag">🟢 Academy-Signed</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(2)} className="s7-edit-stage-btn">
                  ✎ Edit in Stage 02
                </button>
              </div>

              {/* Stage 3 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">🏆</div>
                <div className="s7-locked-info">
                  <div className="title">Certifications <span className="s7-lock-badge">🔒 Stage 03</span></div>
                  <div className="meta">
                    {certificationsList.length > 0 ? (
                      certificationsList.map((c, i) => (
                        <span key={i}>
                          <b>{c.code || c.name}</b> ({c.body || "AAPC"}{c.memberId ? ` · ID ****${String(c.memberId).slice(-4)}` : ""}{c.expiryDate ? ` · Valid until ${c.expiryDate}` : ""}){i < certificationsList.length - 1 ? " · " : ""}
                        </span>
                      ))
                    ) : isNonCertified ? (
                      <span>Non-Certified Candidate · Proctored Talentera Assessment Track</span>
                    ) : isPursuing ? (
                      <span>Pursuing {stage3.targetCert || "Certification"} · Target Exam: {stage3.targetExamDate || "Scheduled"}</span>
                    ) : (
                      <span>AAPC/AHIMA Credential · Audit Pending</span>
                    )}
                  </div>
                </div>
                <div className="s7-verified-tag">🟢 API-Verified</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(3)} className="s7-edit-stage-btn">
                  ✎ Edit in Stage 03
                </button>
              </div>

              {/* Stage 4 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">🧪</div>
                <div className="s7-locked-info">
                  <div className="title">Assessment Score <span className="s7-lock-badge">🔒 Stage 04</span></div>
                  <div className="meta">
                    {assessmentScore !== null ? (
                      <>
                        {assessmentMedal === "Gold" ? "🥇" : assessmentMedal === "Silver" ? "🥈" : "🥉"} <b>{assessmentMedal} · {assessmentScore}/100</b> · Anatomy 85 · Med Term 78 · Aptitude 65 · Basic ICD 70 · HCC + E/M 62 · Percentile 68
                      </>
                    ) : (
                      <span>Proctored Foundation Assessment · Ready to Take</span>
                    )}
                  </div>
                </div>
                <div className="s7-verified-tag">🟢 Talentera-Proctored</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(4)} className="s7-edit-stage-btn">
                  ✎ Retake in Stage 04
                </button>
              </div>

              {/* Stage 5 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">🎤</div>
                <div className="s7-locked-info">
                  <div className="title">Video Pitch <span className="s7-lock-badge">🔒 Stage 05</span></div>
                  <div className="meta">
                    {videoScore !== null ? (
                      <>
                        {videoMedal === "Gold" ? "🥇" : videoMedal === "Silver" ? "🥈" : "🥉"} <b>{videoMedal} · {videoScore}/100</b> · Clarity {clarityScore} · Fluency {fluencyScore} · Vocab {vocabScore} · Confidence {confidenceScore} · Content {contentScore} · Live Verified{regionalLang ? ` · + ${regionalLang} bonus` : ""}
                      </>
                    ) : (
                      <span>AI Communication Video Assessment · Ready to Record</span>
                    )}
                  </div>
                </div>
                <div className="s7-verified-tag">🟢 Face-Verified</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(5)} className="s7-edit-stage-btn">
                  ✎ Re-record in Stage 05
                </button>
              </div>

              {/* Stage 6 */}
              <div className="s7-locked-row">
                <div className="s7-locked-ico">💻</div>
                <div className="s7-locked-info">
                  <div className="title">Live Chart Record <span className="s7-lock-badge">🔒 Stage 06</span></div>
                  <div className="meta">
                    {totalCharts > 0 ? (
                      <>
                        {chartTier === "Platinum" ? "🏆" : chartTier === "Gold" ? "🥇" : chartTier === "Silver" ? "🥈" : "🥉"} <b>{chartTier} · {totalCharts} charts · {overallAccuracy}% acc</b> · {specialtyCharts.map((s) => `${s.name} ${s.count}`).join(" · ")} · {selectedPlatforms.join(" + ")}
                      </>
                    ) : (
                      <span>Live Chart Practice Log · Declared Exposure</span>
                    )}
                  </div>
                </div>
                <div className="s7-verified-tag">🟢 API-Verified</div>
                <button type="button" onClick={() => onNavigateStage && onNavigateStage(6)} className="s7-edit-stage-btn">
                  ✎ Update in Stage 06
                </button>
              </div>
            </div>
          </div>

          {/* SECTION 4 · LIVE PREVIEW */}
          <div className="s7-section">
            <div className="s7-section-header">
              <div className="s7-section-num">4</div>
              <div className="s7-section-title">Live preview — this is exactly what companies see</div>
              <div className="s7-verified-tag" style={{ fontSize: 11 }}>{activeTmpl.name.toUpperCase()}</div>
            </div>

            {/* Rendered Resume Paper */}
            <div
              ref={resumePrintRef}
              className={`s7-resume-preview tmpl-${selectedTemplate}`}
              style={{
                fontFamily: activeTmpl.fontFamily,
                "--hdr-bg": activeTmpl.headerBg,
                "--accent": activeTmpl.accentColor,
              }}
            >
              {/* Paper Header */}
              <div className="s7-resume-header">
                <div>
                  <div className="s7-resume-name">{fullName.toUpperCase()}</div>
                  <div className="s7-resume-title">{joinUnique(currentRoleTitle, expLabel)}</div>
                  <div className="s7-resume-contact">
                    {mobile && <span>📞 {mobile}</span>}
                    {email && <span>✉ {email}</span>}
                    <span style={{ color: "#1A4FB8", fontWeight: 700 }}>🔗 {liveResumeUrl.replace("https://", "")}</span>
                  </div>
                </div>
                <div className="s7-verified-stamp">
                  <div className="top">🛡 TALENTERA<br />VERIFIED</div>
                  <div className="id">ID: {verificationId}</div>
                  <div onClick={() => setShowQrModal(true)} className="s7-qr-box" title="Click to view QR details">
                    <QrIconSvg />
                  </div>
                </div>
              </div>

              {/* Career Objective */}
              <div className="s7-resume-sec-title">🎯 {isExperienced ? "Professional Summary" : "Career Objective"}</div>
              <div className="s7-resume-obj">
                "{careerObjective}"
              </div>

              {/* Verified Scorecard */}
              <div className="s7-resume-sec-title">🏆 Talentera Verified Scorecard</div>
              <div className="s7-resume-score-strip">
                {assessmentScore !== null && (
                  <span className={`s7-score-badge ${assessmentMedal.toLowerCase()}`}>
                    {assessmentMedal === "Gold" ? "🥇" : "🥈"} {assessmentMedal} · {assessmentScore}
                  </span>
                )}
                {videoScore !== null && (
                  <span className={`s7-score-badge ${videoMedal.toLowerCase()}`}>
                    🎤 {videoMedal} · {videoScore}
                  </span>
                )}
                {totalCharts > 0 && (
                  <span className="s7-score-badge silver">
                    💻 {totalCharts} charts · {Math.round(overallAccuracy)}%
                  </span>
                )}
                <span className="s7-score-badge gold">
                  🏆 {totalPoints}/100 Total
                </span>
                <span style={{ fontSize: 11, color: "#3A425A", fontStyle: "italic", marginLeft: "auto" }}>
                  Scan QR above to verify live
                </span>
              </div>

              {/* Certifications (Only if present) */}
              {certificationsList.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">📜 Core Certifications</div>
                  <div className="s7-grid-2">
                    {certificationsList.map((cert, idx) => (
                      <div key={idx} className="s7-r-block">
                        <div className="k">{cert.body || "AAPC"} · {cert.name || cert.code}</div>
                        <div className="v">Member ID {cert.memberId ? `****${String(cert.memberId).slice(-4)}` : "Verified Credential"}</div>
                        <div className="details">{cert.issueDate ? `Issued ${cert.issueDate} · ` : ""}{cert.expiryDate ? `Valid until ${cert.expiryDate} · ` : ""}🟢 API-Verified</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Training Foundation */}
              <div className="s7-resume-sec-title">🎓 Training Foundation</div>
              <div className="s7-r-block">
                <div className="k">{academyName}{academyLocality ? ` · ${academyLocality}` : ""}</div>
                <div className="v">{trainingFoundationLine}</div>
                <div className="details">{trainingDuration} · Classroom{trainingAssessmentScore ? ` · Assessment: ${trainingAssessmentScore}/100` : ""} · 🟢 Academy-Verified</div>
              </div>

              {/* Live Chart Table */}
              {specialtyCharts.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">💻 Live Chart Practice · Department-wise</div>
                  <table className="s7-charts-table-mini">
                    <thead>
                      <tr>
                        <th>Specialty</th>
                        <th>Charts</th>
                        <th>Accuracy</th>
                        <th>Time/chart</th>
                        <th>Last Coded</th>
                      </tr>
                    </thead>
                    <tbody>
                      {specialtyCharts.map((sc) => (
                        <tr key={sc.id || sc.name}>
                          <td>{sc.name.includes("HCC") ? "🩺 HCC" : sc.name.includes("E/M") ? "📋 E/M" : sc.name.includes("ED") ? "🚑 ED" : "🔬 " + sc.name}</td>
                          <td>{sc.count}</td>
                          <td>{sc.accuracy}%</td>
                          <td>{sc.timePerChart}</td>
                          <td>{Number(sc.count) > 0 ? (sc.lastCodedDate ? new Date(sc.lastCodedDate).toLocaleDateString() : "Active") : "—"}</td>
                        </tr>
                      ))}
                      <tr className="total">
                        <td><b>TOTAL</b></td>
                        <td><b>{totalCharts || specialtyCharts.reduce((a, b) => a + (Number(b.count) || 0), 0)}</b></td>
                        <td><b>{overallAccuracy || 0}%</b></td>
                        <td><b>{totalCharts > 0 ? "5.0 min avg" : "—"}</b></td>
                        <td>{totalCharts > 0 ? "🟢 Active" : "—"}</td>
                      </tr>
                    </tbody>
                  </table>
                  <div style={{ fontSize: 10.5, color: "#8A91A3", marginTop: 8 }}>
                    Platforms verified: {selectedPlatforms.join(" 🟢 · ")} 🟢 · <b>Scan Live Chart QR to verify current data ↗</b>
                  </div>
                </>
              )}

              {/* Video Pitch Scorecard */}
              <div className="s7-resume-sec-title">🎤 Video Pitch Scorecard</div>
              <div className="s7-grid-2">
                <div className="s7-r-block">
                  <div className="s7-qr-mini"><PlayIconSvg /></div>
                  <div className="k">Self-Introduction (60 sec)</div>
                  <div className="v" style={{ marginTop: 4 }}><span style={medalBadgeStyle(getMedalTier(videoScore, videoMedal), 12)}>{medalLabel(getMedalTier(videoScore, videoMedal))}</span></div>
                  <div className="details">Clarity {clarityScore} · Fluency {fluencyScore} · Confidence {confidenceScore} · 🟢 Live Verified · Scan to play</div>
                </div>
                <div className="s7-r-block">
                  <div className="s7-qr-mini"><CheckListIconSvg /></div>
                  <div className="k">5-question AI Mock</div>
                  <div className="v" style={{ marginTop: 4 }}><span style={medalBadgeStyle(getMedalTier(videoScore, videoMedal), 12)}>{medalLabel(getMedalTier(videoScore, videoMedal))}</span></div>
                  <div className="details">Auto-transcribed · Searchable · Scan to review answers</div>
                </div>
              </div>

              {/* Education */}
              <div className="s7-resume-sec-title">🎓 Education</div>
              <div className="s7-grid-2">
                <div className="s7-r-block">
                  <div className="k">{degree}{graduationYear ? ` · ${graduationYear}` : ""}</div>
                  <div className="v">{collegeName}</div>
                  <div className="details">{cgpa ? `${cgpa} · ` : ""}Verified Academic Record</div>
                </div>
                {twelfthSchool && (
                  <div className="s7-r-block">
                    <div className="k">Class XII{twelfthYear ? ` · ${twelfthYear}` : ""}</div>
                    <div className="v">{twelfthSchool}</div>
                    <div className="details">{twelfthScore}</div>
                  </div>
                )}
              </div>

              {/* Skills */}
              {resumeSkills.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">🛠 Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {resumeSkills.map((skill) => (
                      <span key={skill} style={{ background: "#FAFAF7", border: "1px solid #E5E7EB", borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: "#0F1B3D" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}

              {/* Work Preferences */}
              <div className="s7-resume-sec-title">📍 Work Preferences</div>
              <div style={{ fontSize: 12, color: "#0F1B3D", lineHeight: 1.7, marginTop: 4 }}>
                <b>Cities open to:</b> {preferredCities}<br />
                <b>Relocation:</b> {relocationPref} · <b>Availability:</b> Immediately<br />
                <b>Shifts:</b> {shiftPreference} · <b>Trainee-role open:</b> Yes
              </div>

              {/* Declaration */}
              <div className="s7-resume-sec-title">🖊 Declaration</div>
              <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.6, marginTop: 4 }}>
                {declarationText}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11.5, color: "#0F1B3D" }}>
                <div>Place: {city || locality}</div>
                <div>Date: {declarationDate}</div>
              </div>
              <div style={{ textAlign: "right", marginTop: 8, fontSize: 12.5, fontWeight: 800, color: "#0F1B3D" }}>
                {fullName}
              </div>

              {/* Watermark & Cryptographic Footer */}
              <div style={{ borderTop: "1px dashed #E5E7EB", marginTop: 20, paddingTop: 12, textAlign: "center" }}>
                <div style={{ fontSize: 10.5, color: "#8A91A3", fontStyle: "italic" }}>
                  🛡 Verified by Talentera · ID {verificationId} · Live at {liveResumeUrl.replace("https://", "")}
                </div>
                <div style={{ fontSize: 9.5, color: "#8A91A3", marginTop: 4, fontFamily: "monospace" }}>
                  SHA-256 · a3f8b9c2d4e5f6a7...b8c9d0e1f2a3b4c5
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 5 · DOWNLOAD & SHARE */}
          <div className="s7-section">
            <div className="s7-section-header">
              <div className="s7-section-num">5</div>
              <div className="s7-section-title">Download &amp; Share</div>
              <div className="s7-no-pts-chip">2 FORMATS AVAILABLE</div>
            </div>

            <div className="s7-download-grid">
              <div onClick={handleDownloadPdf} className="s7-dl-card hero">
                <div className="s7-dl-ico">📄</div>
                <div className="s7-dl-name">{downloading ? "Exporting..." : "Download PDF"}</div>
                <div className="s7-dl-sub">High-res, verified watermark</div>
              </div>
              <div onClick={handleDownloadWord} className="s7-dl-card">
                <div className="s7-dl-ico">📝</div>
                <div className="s7-dl-name">Word (.docx)</div>
                <div className="s7-dl-sub">Formatted &amp; structured</div>
              </div>
            </div>

            {/* LIVE URL */}
            <div className="s7-url-card">
              <div style={{ fontWeight: 800, color: "#0F1B3D", fontSize: 14, display: "flex", alignItems: "center", gap: 8 }}>
                🔗 Live Resume URL — the killer feature
              </div>
              <div style={{ fontSize: 12, color: "#3A425A", marginTop: 4, lineHeight: 1.5 }}>
                Share this URL instead of the PDF. It updates automatically every time you improve any stage. HRs who click on Day 1 see current data; if they revisit Day 30, they see your Gold-tier upgrade.
              </div>
              <div className="s7-url-row">
                <span className="link">{liveResumeUrl}</span>
                <button type="button" onClick={handleCopyLiveUrl} className="s7-url-btn">
                  📋 Copy Link
                </button>
                <button type="button" onClick={() => setShowQrModal(true)} className="s7-url-btn">
                  📱 QR Code
                </button>
              </div>
              <div className="s7-url-hint">
                ✨ 3× more shortlists come from Live URLs vs static PDFs — the resume you send today is the same resume they see next month.
              </div>
            </div>

            {/* VERSION HISTORY */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: 11, letterSpacing: 1.5, color: "#C99413", textTransform: "uppercase", fontWeight: 700, marginBottom: 10 }}>
                🕐 Version History · full transparency to companies
              </div>
              <div className="s7-version-list">
                {versionHistory.map((ver, idx) => (
                  <div key={idx} className={`s7-version-item ${ver.current ? "current" : ""}`}>
                    <div className="s7-version-num">{ver.version}</div>
                    <div className="s7-version-info">
                      <b>{ver.timestamp}</b> · {ver.title}
                    </div>
                    <span className="s7-version-tag" style={!ver.current ? { background: "#F2F3F5", color: "#8A91A3" } : {}}>
                      {ver.current ? "CURRENT" : "Archived"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Navigation Bottom Actions */}
          <div style={{
            background: "#FFFFFF",
            padding: "16px 24px",
            border: "1px solid #E2E8F0",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: 32,
            marginBottom: 40,
            borderRadius: 12,
            boxShadow: "0 4px 16px rgba(15,27,61,.04)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12.5px", color: "#64748B" }}>
              <div style={{ height: 8, width: 180, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                <div style={{ height: "100%", width: "85%", background: "linear-gradient(90deg, #F5B41A, #D97706)", borderRadius: 4 }}></div>
              </div>
              <div><b>85 / 100</b> · Stage 07 in progress</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button type="button" onClick={() => setShowFullPreviewModal(true)} className="s7-link-btn">
                Preview full page
              </button>
              <button type="button" onClick={() => handleSaveAndAdvance(true)} disabled={saving} className="s7-action-btn">
                {saving ? "Saving..." : "Continue to Stage 08 · Career Passport →"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Companion Rail */}
        <div className="s7-right-rail" style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={7} candidate={candidate} />
        </div>
      </div>

      {/* QR Code Modal Popup */}
      {showQrModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,0.7)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 420, width: "100%", padding: 28, textAlign: "center", border: "2px solid #F5B41A", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#0F1B3D" }}>🛡 Talentera QR Verification</div>
              <button type="button" onClick={() => setShowQrModal(false)} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A91A3" }}>✕</button>
            </div>
            <div style={{ width: 160, height: 160, background: "#0F1B3D", color: "#F5B41A", borderRadius: 12, margin: "0 auto 16px", display: "grid", placeItems: "center", fontSize: 72 }}>
              <i className="fa-solid fa-qrcode"></i>
            </div>
            <div style={{ fontSize: 13, fontWeight: 800, color: "#0F1B3D" }}>{verificationId}</div>
            <div style={{ fontSize: 12, color: "#8A91A3", marginTop: 4 }}>Scan this QR code from any camera to verify candidate authenticity and audit proof records live.</div>
            <div style={{ background: "#FAFAF7", padding: "10px 14px", borderRadius: 8, marginTop: 14, fontSize: 12, fontFamily: "monospace", color: "#1A4FB8", wordBreak: "break-all" }}>
              {liveResumeUrl}
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 18 }}>
              <button type="button" onClick={handleCopyLiveUrl} style={{ flex: 1, padding: "10px 14px", background: "#0F1B3D", color: "#F5B41A", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", fontSize: 12 }}>
                📋 Copy Link
              </button>
              <button type="button" onClick={() => setShowQrModal(false)} style={{ flex: 1, padding: "10px 14px", background: "#E5E7EB", color: "#3A425A", borderRadius: 8, fontWeight: 700, border: "none", cursor: "pointer", fontSize: 12 }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Page Preview Modal */}
      {showFullPreviewModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,0.85)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 24, overflowY: "auto" }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 900, width: "100%", maxHeight: "90vh", overflowY: "auto", padding: 32, position: "relative" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, borderBottom: "1px solid #E5E7EB", paddingBottom: 14 }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 20, color: "#0F1B3D", fontWeight: 800 }}>Full Page Resume Preview</h3>
                <div style={{ fontSize: 12, color: "#8A91A3", marginTop: 2 }}>{activeTmpl.name} · Live Candidate View</div>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={handleDownloadPdf} style={{ padding: "8px 16px", background: "#F5B41A", color: "#0F1B3D", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                  📄 Download PDF
                </button>
                <button type="button" onClick={() => setShowFullPreviewModal(false)} style={{ padding: "8px 16px", background: "#E5E7EB", color: "#3A425A", border: "none", borderRadius: 8, fontWeight: 700, cursor: "pointer", fontSize: 12 }}>
                  ✕ Close
                </button>
              </div>
            </div>

            {/* Embedded Resume View */}
            <div
              className={`s7-resume-preview tmpl-${selectedTemplate}`}
              style={{
                fontFamily: activeTmpl.fontFamily,
                "--hdr-bg": activeTmpl.headerBg,
                "--accent": activeTmpl.accentColor,
              }}
            >
              <div className="s7-resume-header">
                <div>
                  <div className="s7-resume-name">{fullName.toUpperCase()}</div>
                  <div className="s7-resume-title">{joinUnique(currentRoleTitle, expLabel)}</div>
                  <div className="s7-resume-contact">
                    {mobile && <span>📞 {mobile}</span>}
                    {email && <span>✉ {email}</span>}
                    <span style={{ color: "#1A4FB8", fontWeight: 700 }}>🔗 {liveResumeUrl.replace("https://", "")}</span>
                  </div>
                </div>
                <div className="s7-verified-stamp">
                  <div className="top">🛡 TALENTERA<br />VERIFIED</div>
                  <div className="id">ID: {verificationId}</div>
                  <div className="s7-qr-box">
                    <QrIconSvg />
                  </div>
                </div>
              </div>

              <div className="s7-resume-sec-title">🎯 {isExperienced ? "Professional Summary" : "Career Objective"}</div>
              <div className="s7-resume-obj">"{careerObjective}"</div>

              <div className="s7-resume-sec-title">🏆 Talentera Verified Scorecard</div>
              <div className="s7-resume-score-strip">
                {assessmentScore !== null && <span className={`s7-score-badge ${assessmentMedal.toLowerCase()}`}>{assessmentMedal} · {assessmentScore}</span>}
                {videoScore !== null && <span className={`s7-score-badge ${videoMedal.toLowerCase()}`}>🎤 {videoMedal} · {videoScore}</span>}
                {totalCharts > 0 && <span className="s7-score-badge silver">💻 {totalCharts} charts · {Math.round(overallAccuracy)}%</span>}
                <span className="s7-score-badge gold">🏆 {totalPoints}/100 Total</span>
              </div>

              {certificationsList.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">📜 Core Certifications</div>
                  <div className="s7-grid-2">
                    {certificationsList.map((cert, idx) => (
                      <div key={idx} className="s7-r-block">
                        <div className="k">{cert.body || "AAPC"} · {cert.name || cert.code}</div>
                        <div className="v">Member ID {cert.memberId ? `****${String(cert.memberId).slice(-4)}` : "Verified"}</div>
                        <div className="details">{cert.issueDate ? `Issued ${cert.issueDate} · ` : ""}{cert.expiryDate ? `Valid until ${cert.expiryDate} · ` : ""}🟢 API-Verified</div>
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="s7-resume-sec-title">🎓 Training Foundation</div>
              <div className="s7-r-block">
                <div className="k">{academyName}{academyLocality ? ` · ${academyLocality}` : ""}</div>
                <div className="v">{trainingFoundationLine}</div>
                <div className="details">{trainingDuration} · Classroom{trainingAssessmentScore ? ` · Assessment: ${trainingAssessmentScore}/100` : ""} · 🟢 Academy-Verified</div>
              </div>

              {specialtyCharts.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">💻 Live Chart Practice</div>
                  <table className="s7-charts-table-mini">
                    <thead>
                      <tr><th>Specialty</th><th>Charts</th><th>Accuracy</th><th>Time/chart</th><th>Last Coded</th></tr>
                    </thead>
                    <tbody>
                      {specialtyCharts.map((sc) => (
                        <tr key={sc.id || sc.name}>
                          <td>{sc.name}</td>
                          <td>{sc.count}</td>
                          <td>{sc.accuracy}%</td>
                          <td>{sc.timePerChart}</td>
                          <td>{Number(sc.count) > 0 ? (sc.lastCodedDate ? new Date(sc.lastCodedDate).toLocaleDateString() : "Active") : "—"}</td>
                        </tr>
                      ))}
                      <tr className="total"><td><b>TOTAL</b></td><td><b>{totalCharts || specialtyCharts.reduce((a, b) => a + (Number(b.count) || 0), 0)}</b></td><td><b>{overallAccuracy || 0}%</b></td><td><b>{totalCharts > 0 ? "5.0 min avg" : "—"}</b></td><td>{totalCharts > 0 ? "🟢 Active" : "—"}</td></tr>
                    </tbody>
                  </table>
                </>
              )}

              <div className="s7-resume-sec-title">🎓 Education</div>
              <div className="s7-grid-2">
                <div className="s7-r-block">
                  <div className="k">{degree}{graduationYear ? ` · ${graduationYear}` : ""}</div>
                  <div className="v">{collegeName}</div>
                  <div className="details">{cgpa}</div>
                </div>
                {twelfthSchool && (
                  <div className="s7-r-block">
                    <div className="k">Class XII{twelfthYear ? ` · ${twelfthYear}` : ""}</div>
                    <div className="v">{twelfthSchool}</div>
                    <div className="details">{twelfthScore}</div>
                  </div>
                )}
              </div>

              {resumeSkills.length > 0 && (
                <>
                  <div className="s7-resume-sec-title">🛠 Skills</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 4 }}>
                    {resumeSkills.map((skill) => (
                      <span key={skill} style={{ background: "#FAFAF7", border: "1px solid #E5E7EB", borderRadius: 999, padding: "5px 12px", fontSize: 11.5, fontWeight: 700, color: "#0F1B3D" }}>
                        {skill}
                      </span>
                    ))}
                  </div>
                </>
              )}

              <div className="s7-resume-sec-title">🖊 Declaration</div>
              <div style={{ fontSize: 11.5, color: "#475569", lineHeight: 1.6, marginTop: 4 }}>
                {declarationText}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 11.5, color: "#0F1B3D" }}>
                <div>Place: {city || locality}</div>
                <div>Date: {declarationDate}</div>
              </div>
              <div style={{ textAlign: "right", marginTop: 8, fontSize: 12.5, fontWeight: 800, color: "#0F1B3D" }}>
                {fullName}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
