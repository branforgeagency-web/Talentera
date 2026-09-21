import React, { useState, useEffect } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";
import { ACADEMIES_DATA, ACADEMY_NAMES, ACADEMY_LOCATIONS } from "../../data/academiesData.js";

const DOMAINS = [
  {
    id: "Medical Coding",
    title: "Medical Coding",
    sub: "Assigning codes to charts (ICD, CPT, HCPCS)",
    icon: "🩺",
  },
  {
    id: "Medical Billing",
    title: "Medical Billing",
    sub: "Charge entry, payment posting, claims",
    icon: "💵",
  },
  {
    id: "Accounts Receivable",
    title: "Accounts Receivable",
    sub: "AR calling, denials, appeals",
    icon: "📞",
  },
  {
    id: "Front Office",
    title: "Front Office",
    sub: "Patient services, pre-auth, scheduling",
    icon: "🖥",
  },
];

const DOMAIN_TRAINING_LEVELS = {
  "Medical Coding": [
    "Non-Trained",
    "Basic Medical Coding",
    "Intermediate Medical Coding",
    "Advanced Medical Coding",
    "Auditor / QA Level",
  ],
  "Medical Billing": [
    "Non-Trained",
    "Basic Medical Billing",
    "Intermediate Medical Billing",
    "Advanced Medical Billing",
    "Auditor / QA Level",
  ],
  "Accounts Receivable": [
    "Non-Trained",
    "Basic Accounts Receivable",
    "Intermediate Accounts Receivable",
    "Advanced Accounts Receivable",
    "Auditor / QA Level",
  ],
  "Front Office": [
    "Non-Trained",
    "Basic Front Office",
    "Intermediate Front Office",
    "Advanced Front Office",
    "Auditor / QA Level",
  ],
};

const ALL_TRAINING_LEVELS = Array.from(
  new Set(Object.values(DOMAIN_TRAINING_LEVELS).flat())
);

const DEFAULT_TRAINING_LEVELS = DOMAIN_TRAINING_LEVELS["Medical Coding"];

const SELF_LEARNING_SOURCES = [
  "YouTube Channels (Medical Coding / AAPC / Anatomy)",
  "AAPC Official Study Guides, Books & Documentation",
  "AHIMA Study Guides & Textbooks",
  "Online Course Platforms (Udemy, Coursera, edX)",
  "Self-Study (ICD-10-CM / CPT / HCPCS Code Manuals)",
  "Medical Coding Blogs, Forums & Peer Community",
  "Hospital / Clinical On-the-Job Self-Learning",
  "Other Self-Learning Channels & Web Sources",
];

const ALL_SPECIALTIES = [
  "E/M",
  "HCC",
  "ED",
  "Surgery",
  "IP-DRG",
  "Home Health",
  "ObGyn",
  "Radiology",
  "Pediatrics",
  "Anesthesia",
  "Pathology",
  "Cardiology",
  "Inpatient Coding",
  "Outpatient Coding",
];

// Foundation topics for freshers (shown first in the Readiness Check)
const FRESHER_TOPICS = [
  "Anatomy",
  "Physiology",
  "Medical Terminology",
  "Pharmacology",
  "Pathology Basics",
  "ICD-10-CM Basics",
  "CPT / HCPCS Basics",
  "Medical Billing Basics",
  "Healthcare Insurance Basics",
  "Coding Guidelines",
];

const TRAINING_PATHS = [
  {
    id: "academy",
    title: "Path A · Academy",
    sub: "Completed / doing a course at an RCM training academy.",
    hint: "🟢 Academy-Verified",
    hintClass: "",
    ico: "🏫",
  },
  {
    id: "self",
    title: "Path B · Self-trained",
    sub: "Learned from books, YouTube, AAPC guides, online courses.",
    hint: "🟡 Talentera-Assessed",
    hintClass: "yellow",
    ico: "📚",
  },
  {
    id: "pursuing",
    title: "Path C · Pursuing",
    sub: "Currently in the middle of an academy course.",
    hint: "🟠 In Training",
    hintClass: "orange",
    ico: "⏳",
  },
];

const TRAINING_MODES = ["Classroom", "Online", "Hybrid", "Self-paced"];
const TOTAL_HOURS_OPTIONS = ["Less than 100 hrs", "100 – 200 hrs", "200 – 400 hrs", "400+ hrs"];
const CHART_PRACTICE_OPTIONS = ["0", "1 – 50", "51 – 200", "201 – 500", "500+"];
const START_TIMELINES = [
  { id: "immediately", label: "🚀 Immediately" },
  { id: "30_days", label: "Within 30 days" },
  { id: "60_days", label: "Within 60 days" },
  { id: "90_days", label: "90+ days" },
];
const SHIFT_OPTIONS = [
  { id: "day", label: "☀️ Day shift" },
  { id: "night", label: "🌙 US Night shift" },
  { id: "uk_evening", label: "🇬🇧 UK Evening shift" },
  { id: "rotational", label: "🔄 Rotational" },
];

const MONTH_OPTIONS = [
  { val: "01", label: "01 · Jan" },
  { val: "02", label: "02 · Feb" },
  { val: "03", label: "03 · Mar" },
  { val: "04", label: "04 · Apr" },
  { val: "05", label: "05 · May" },
  { val: "06", label: "06 · Jun" },
  { val: "07", label: "07 · Jul" },
  { val: "08", label: "08 · Aug" },
  { val: "09", label: "09 · Sep" },
  { val: "10", label: "10 · Oct" },
  { val: "11", label: "11 · Nov" },
  { val: "12", label: "12 · Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
const TRAINING_YEAR_OPTIONS = Array.from({ length: 25 }, (_, i) => String(CURRENT_YEAR + 2 - i));

export default function Stage2Training({ stage, existingData = {}, candidate = {}, onSaved }) {
  const toast = useToast();

  // STAGE 1 IDENTITY RECAP
  const s1 = candidate?.stage1 || {};
  const candidateName = s1.fullName || candidate.fullName || "Candidate";
  const candidateCity = s1.city || candidate.city || "—";
  const candidateExp = s1.experienceLevel || s1.experience || candidate.experience || "Fresher";

  // FORM STATES (Initialized from existingData or empty)
  const [domain, setDomain] = useState(existingData.domain || "");
  // A saved level that isn't one of the preset pills was typed in under "Others"
  const savedLevelIsCustom = Boolean(existingData.trainingLevel) && !ALL_TRAINING_LEVELS.includes(existingData.trainingLevel);
  const [trainingLevel, setTrainingLevel] = useState(savedLevelIsCustom ? "" : existingData.trainingLevel || "");
  const [levelOtherSelected, setLevelOtherSelected] = useState(savedLevelIsCustom);
  const [levelOtherText, setLevelOtherText] = useState(savedLevelIsCustom ? existingData.trainingLevel : "");
  const effectiveTrainingLevel = levelOtherSelected ? levelOtherText.trim() : trainingLevel;

  // Dynamic Training Levels matching selected domain
  const currentTrainingLevels = (domain && DOMAIN_TRAINING_LEVELS[domain]) ? DOMAIN_TRAINING_LEVELS[domain] : DEFAULT_TRAINING_LEVELS;

  function handleSelectDomain(newDomainId) {
    if (formErrors.domain) {
      setFormErrors((prev) => ({ ...prev, domain: "" }));
    }
    const nextDomain = newDomainId;
    const prevDomain = domain;
    setDomain(nextDomain);

    // If a preset training level was selected, dynamically map it to the corresponding tier in the newly selected domain
    if (!levelOtherSelected && trainingLevel) {
      const prevLevels = (prevDomain && DOMAIN_TRAINING_LEVELS[prevDomain]) ? DOMAIN_TRAINING_LEVELS[prevDomain] : DEFAULT_TRAINING_LEVELS;
      const nextLevels = (nextDomain && DOMAIN_TRAINING_LEVELS[nextDomain]) ? DOMAIN_TRAINING_LEVELS[nextDomain] : DEFAULT_TRAINING_LEVELS;
      const idx = prevLevels.indexOf(trainingLevel);
      if (idx !== -1 && nextLevels[idx]) {
        setTrainingLevel(nextLevels[idx]);
      } else if (!nextLevels.includes(trainingLevel)) {
        setTrainingLevel("");
      }
    }
  }
  const [specialties, setSpecialties] = useState(
    Array.isArray(existingData.specialties) && existingData.specialties.length > 0
      ? existingData.specialties
      : existingData.specialty
      ? [existingData.specialty]
      : []
  );
  // "Others" lets a candidate add their own specialty (e.g. Billing, AR Calling) as a tag
  const [specialtyOtherOpen, setSpecialtyOtherOpen] = useState(false);
  const [specialtyOtherText, setSpecialtyOtherText] = useState("");

  const [trainingPath, setTrainingPath] = useState(existingData.trainingPath || "academy");

  // Path A / C Details - Academy Name & Academy Location
  const [academyName, setAcademyName] = useState(existingData.academyName || "");
  const [academyLocation, setAcademyLocation] = useState(
    existingData.academyLocation || existingData.academyCity || existingData.instituteCity || existingData.location || ""
  );
  const [registeredAcademies, setRegisteredAcademies] = useState([]);
  const [batch, setBatch] = useState(existingData.batch || existingData.batchNumber || existingData.rollNumber || "");
  const [formErrors, setFormErrors] = useState({});

  // Load registered partner academies from backend API
  useEffect(() => {
    api
      .get("/candidate/academies")
      .then((res) => {
        if (res.data?.academies && Array.isArray(res.data.academies)) {
          setRegisteredAcademies(res.data.academies);
        }
      })
      .catch(() => {});
  }, []);

  // Merge registered academies with mapped directory
  const allAcademiesList = [
    ...registeredAcademies.map((a) => ({
      name: a.name,
      location: a.city || (Array.isArray(a.branches) && a.branches.length > 0 ? a.branches[0] : "Coimbatore, Tamil Nadu"),
      branches: a.branches || [],
      state: a.state || "Tamil Nadu",
      verified: true,
    })),
    ...ACADEMIES_DATA.filter(
      (a) => !registeredAcademies.some((ra) => ra.name.toLowerCase() === a.name.toLowerCase())
    ),
  ];

  const rawStart = String(existingData.startDate || "").trim();
  const [startMonth, setStartMonth] = useState(
    existingData.startMonth || (rawStart.includes("/") ? rawStart.split("/")[0].padStart(2, "0") : "")
  );
  const [startYear, setStartYear] = useState(
    existingData.startYear || (rawStart.includes("/") ? rawStart.split("/")[1] : rawStart)
  );

  const rawEnd = String(existingData.endDate || "").trim();
  const [endMonth, setEndMonth] = useState(
    existingData.endMonth || (rawEnd.includes("/") ? rawEnd.split("/")[0].padStart(2, "0") : "")
  );
  const [endYear, setEndYear] = useState(
    existingData.endYear || (rawEnd.includes("/") ? rawEnd.split("/")[1] : rawEnd)
  );
  const [totalHours, setTotalHours] = useState(existingData.totalHours || existingData.duration || "");
  const [modeOfTraining, setModeOfTraining] = useState(existingData.modeOfTraining || "");
  const [certificateId, setCertificateId] = useState(existingData.certificateId || "");
  const [academyScore] = useState(existingData.academyAssessmentScore || "—");

  // Section 4 · Practical Exposure
  const [practicedCharts, setPracticedCharts] = useState(
    existingData.practicedCharts !== undefined ? existingData.practicedCharts : null
  );
  const [chartsCount, setChartsCount] = useState(existingData.chartsCount || existingData.totalChartsCount || "");
  const [internshipDone, setInternshipDone] = useState(
    existingData.internshipDone !== undefined ? existingData.internshipDone : null
  );
  const [internshipWhere, setInternshipWhere] = useState(existingData.internshipWhere || "");
  const [internshipDuration, setInternshipDuration] = useState(existingData.internshipDuration || "");
  const [internshipRole, setInternshipRole] = useState(
    existingData.internshipRole || ""
  );

  // Section 5 · Readiness Check
  const [confidentSpecs, setConfidentSpecs] = useState(
    Array.isArray(existingData.confidentSpecialties) && existingData.confidentSpecialties.length > 0
      ? existingData.confidentSpecialties
      : []
  );
  const [learningSpecs, setLearningSpecs] = useState(
    Array.isArray(existingData.learningSpecialties) && existingData.learningSpecialties.length > 0
      ? existingData.learningSpecialties
      : []
  );
  const [startTimeline, setStartTimeline] = useState(existingData.startTimeline || "");
  const [selectedShifts, setSelectedShifts] = useState(
    Array.isArray(existingData.shifts) && existingData.shifts.length > 0
      ? existingData.shifts
      : []
  );
  const [openToTrainee, setOpenToTrainee] = useState(
    existingData.openToTrainee !== undefined ? existingData.openToTrainee : null
  );

  // UI / Submission state
  const [saving, setSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState("✓ Saved just now");
  const [error, setError] = useState("");

  function handleSelectAcademy(name) {
    setAcademyName(name);
    const found = allAcademiesList.find((a) => a.name.toLowerCase() === name.toLowerCase());
    if (found) {
      if (!academyLocation || academyLocation.trim() === "" || academyLocation === "—") {
        setAcademyLocation(found.location || (found.branches && found.branches[0]) || "");
      }
    }
  }

  // Handle Tag Picker (Max 3)
  function handleToggleSpecialty(spec) {
    if (formErrors.specialties) {
      setFormErrors((prev) => ({ ...prev, specialties: "" }));
    }
    if (specialties.includes(spec)) {
      setSpecialties(specialties.filter((s) => s !== spec));
    } else {
      if (specialties.length >= 3) {
        toast("You can select up to 3 specialties for your primary focus.", "!");
        return;
      }
      setSpecialties([...specialties, spec]);
    }
  }

  function handleAddCustomSpecialty() {
    const name = specialtyOtherText.replace(/\s+/g, " ").trim();
    if (name.length < 2) {
      toast("Type your specialty (at least 2 characters).", "!");
      return;
    }
    if (specialties.some((s) => s.toLowerCase() === name.toLowerCase())) {
      toast("That specialty is already added.", "!");
      return;
    }
    if (specialties.length >= 3) {
      toast("You can select up to 3 specialties for your primary focus.", "!");
      return;
    }
    if (formErrors.specialties) {
      setFormErrors((prev) => ({ ...prev, specialties: "" }));
    }
    setSpecialties([...specialties, name]);
    setSpecialtyOtherText("");
    setSpecialtyOtherOpen(false);
  }

  // Readiness Check pills: freshers see foundation topics (Anatomy, Physiology…)
  // first, then the specialties they picked in 1.3 (relevant match), then the
  // usual specialty list. Anything already selected always stays visible.
  const isFresherCandidate = /fresher|student|^0\b|no experience|trainee/i.test(String(candidateExp || ""));
  const readinessOptions = (() => {
    const seen = new Set();
    const out = [];
    const add = (name) => {
      const key = String(name || "").trim().toLowerCase();
      if (!key || seen.has(key)) return;
      seen.add(key);
      out.push(String(name).trim());
    };
    if (isFresherCandidate) FRESHER_TOPICS.forEach(add);
    specialties.forEach(add);
    ALL_SPECIALTIES.slice(0, 9).forEach(add);
    confidentSpecs.forEach(add);
    learningSpecs.forEach(add);
    return out;
  })();

  function handleToggleConfident(spec) {
    if (confidentSpecs.includes(spec)) {
      setConfidentSpecs(confidentSpecs.filter((s) => s !== spec));
    } else {
      setConfidentSpecs([...confidentSpecs, spec]);
    }
  }

  function handleToggleLearning(spec) {
    if (learningSpecs.includes(spec)) {
      setLearningSpecs(learningSpecs.filter((s) => s !== spec));
    } else {
      setLearningSpecs([...learningSpecs, spec]);
    }
  }

  function handleToggleShift(shiftId) {
    if (selectedShifts.includes(shiftId)) {
      if (selectedShifts.length === 1) {
        toast("Please keep at least one preferred shift selected.", "!");
        return;
      }
      setSelectedShifts(selectedShifts.filter((id) => id !== shiftId));
    } else {
      setSelectedShifts([...selectedShifts, shiftId]);
    }
  }

  // Build Payload
  function buildPayload(isDraft = false) {
    return {
      isDraft,
      domain,
      trainingLevel: effectiveTrainingLevel,
      specialties,
      specialty: specialties[0] || "HCC",
      courseName: domain ? `${domain} - ${specialties.join(", ") || effectiveTrainingLevel}` : (specialties.join(", ") || effectiveTrainingLevel),
      course: domain,
      trainingPath,
      academyName: academyName.trim(),
      academyLocation: academyLocation.trim(),
      academyCity: academyLocation.trim(),
      instituteCity: academyLocation.trim(),
      location: academyLocation.trim(),
      batch: batch.trim(),
      batchNumber: batch.trim(),
      rollNumber: batch.trim(),
      startMonth,
      startYear,
      startDate: startYear ? (startMonth ? `${startMonth}/${startYear}` : startYear) : "",
      endMonth,
      endYear,
      endDate: endYear ? (endMonth ? `${endMonth}/${endYear}` : endYear) : "",
      duration: totalHours,
      totalHours,
      modeOfTraining,
      certificateId: certificateId.trim(),
      academyAssessmentScore: academyScore,
      practicedCharts,
      chartsCount,
      totalChartsCount: chartsCount,
      internshipDone,
      internshipWhere: internshipWhere.trim(),
      internshipDuration: internshipDuration.trim(),
      internshipRole: internshipRole.trim(),
      confidentSpecialties: confidentSpecs,
      learningSpecialties: learningSpecs,
      startTimeline,
      shifts: selectedShifts,
      openToTrainee,
    };
  }

  // Draft Save Handler
  async function handleSaveDraft() {
    setSaving(true);
    setError("");
    try {
      const payload = buildPayload(true);
      const res = await api.put("/candidate/stage/2", payload);
      setSavedBadge("✓ Draft saved just now");
      toast("Stage 2 progress saved as draft.", "✓");
      if (onSaved) onSaved(res.data, { advance: false });
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Could not save draft.", "!");
    } finally {
      setSaving(false);
    }
  }

  // Final Submit & Advance to Stage 3
  async function handleSaveAndContinue() {
    setError("");
    const missing = [];
    const errs = {};

    if (!domain) {
      missing.push("Primary Domain (Section 1.1)");
      errs.domain = "Please select your primary domain";
    }
    if (!trainingLevel && !levelOtherSelected) {
      missing.push("Training Level (Section 1.2)");
      errs.trainingLevel = "Please select your training level";
    } else if (levelOtherSelected && !levelOtherText.trim()) {
      missing.push("Training Level - specify under Others (Section 1.2)");
      errs.levelOther = "Please type your training level";
    }
    if (specialties.length === 0) {
      missing.push("Primary Specialty (Section 1.3)");
      errs.specialties = "Please select at least 1 primary specialty";
    }
    if (trainingPath === "academy" && (!academyName || academyName.trim().length < 2)) {
      missing.push("Academy Name (Section 3)");
      errs.academyName = "Academy Name is mandatory";
    }
    if (trainingPath === "self" && (!academyName || academyName.trim().length < 2)) {
      missing.push("Primary Learning Source / Platform (Section 3)");
      errs.academyName = "Primary Learning Source / Platform is mandatory";
    }

    if (missing.length > 0) {
      setFormErrors(errs);
      const msg = `Please fill all mandatory fields highlighted in red: ${missing.join(", ")}.`;
      setError(msg);
      toast(msg, "error", { title: "Mandatory Fields Required" });
      if (errs.domain || errs.trainingLevel || errs.specialties || errs.levelOther) {
        window.scrollTo({ top: 200, behavior: "smooth" });
      } else {
        window.scrollTo({ top: 600, behavior: "smooth" });
      }
      return;
    }
    setFormErrors({});

    setSaving(true);
    try {
      const payload = buildPayload(false);
      const res = await api.put("/candidate/stage/2", payload);
      toast("Stage 02 · Foundation saved successfully! (+15 pts)", "✓");
      if (onSaved) onSaved(res.data, { advance: true, nextStage: 3 });
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to save Stage 2 details.");
      toast(err.response?.data?.message || "Could not save Stage 2.", "!");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="stage02-wrapper">
      <style>{`
        .stage02-wrapper {
          --navy: #0F1B3D;
          --navy-deep: #08122A;
          --navy-lite: #1A2A55;
          --gold: #F5B41A;
          --gold-deep: #C99413;
          --gold-pale: #FFF6E0;
          --gold-soft: #FFEBB0;
          --white: #FFFFFF;
          --bg: #F5F7FB;
          --card: #FFFFFF;
          --border: #E5E7EB;
          --gray-txt: #3A425A;
          --gray-mute: #8A91A3;
          --gray-soft: #F2F3F5;
          --green: #1F7A3C;
          --green-soft: #E8F5E9;
          --red: #C0392B;
          --red-soft: #FDECEA;
          --blue: #1A4FB8;
          --blue-soft: #EEF2FF;
          --amber: #E08E00;
          --amber-soft: #FFF3D6;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
          color: var(--gray-txt);
        }

        .stage02-shell {
          display: grid;
          grid-template-columns: 1fr 340px;
          gap: 24px;
          max-width: 1380px;
          margin: 0 auto;
          align-items: start;
        }
        @media (max-width: 1080px) {
          .stage02-shell {
            grid-template-columns: 1fr;
          }
        }

        /* BREADCRUMB */
        .s2-breadcrumb {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: var(--gray-mute);
          text-transform: uppercase;
          letter-spacing: 1px;
          margin-bottom: 14px;
          font-weight: 600;
        }
        .s2-breadcrumb .sep { color: var(--border); }

        /* HERO */
        .s2-hero {
          background: linear-gradient(135deg, var(--navy) 0%, #1E3A8A 60%, #2A54B5 100%);
          color: var(--white);
          border-radius: 18px;
          padding: 30px 32px;
          position: relative;
          overflow: hidden;
          margin-bottom: 20px;
          box-shadow: 0 8px 24px rgba(15,27,61,.15);
        }
        .s2-hero::before {
          content: '';
          position: absolute;
          right: -80px;
          top: -80px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, rgba(245,180,26,.16), transparent 60%);
        }
        .s2-hero-icon {
          width: 54px;
          height: 54px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 14px;
          display: grid;
          place-items: center;
          font-size: 26px;
          margin-bottom: 14px;
          box-shadow: 0 4px 12px rgba(245,180,26,.32);
        }
        .s2-hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 16px; }
        .s2-hero-chip {
          background: rgba(255,255,255,.14);
          padding: 5px 12px;
          border-radius: 20px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          backdrop-filter: blur(6px);
          color: #ffffff !important;
        }
        .s2-hero-chip.gold { background: var(--gold); color: var(--navy) !important; }
        .s2-hero-title,
        h1.s2-hero-title {
          font-size: 44px;
          font-weight: 800;
          letter-spacing: -1px;
          margin: 0;
          line-height: 1;
          color: #ffffff !important;
        }
        .s2-hero-subtitle {
          color: var(--gold-pale);
          font-style: italic;
          font-size: 17px;
          margin-top: 6px;
          font-weight: 500;
        }
        .s2-hero-desc {
          color: rgba(255,255,255,.85);
          font-size: 14px;
          margin-top: 16px;
          max-width: 640px;
          line-height: 1.6;
        }
        .s2-hero-tiles {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-top: 22px;
        }
        @media (max-width: 768px) {
          .s2-hero-tiles { grid-template-columns: 1fr 1fr; }
        }
        .s2-hero-tile {
          background: rgba(255,255,255,.12);
          padding: 16px 14px;
          border-radius: 12px;
          text-align: center;
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(8px);
        }
        .s2-hero-tile .big {
          font-size: 20px;
          font-weight: 800;
          color: var(--white);
          letter-spacing: -.3px;
        }
        .s2-hero-tile .small {
          font-size: 11px;
          color: rgba(255,255,255,.7);
          margin-top: 3px;
          letter-spacing: .3px;
        }

        /* IDENTITY RECAP BADGE */
        .s2-id-recap {
          background: linear-gradient(90deg, var(--green-soft), #F5FDF9);
          border: 1px solid var(--green);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .s2-id-recap .check {
          width: 36px;
          height: 36px;
          background: var(--green);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 18px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .s2-id-recap .txt { flex: 1; }
        .s2-id-recap .lbl {
          font-size: 11px;
          color: var(--green);
          font-weight: 700;
          letter-spacing: .6px;
          text-transform: uppercase;
        }
        .s2-id-recap .val {
          font-size: 14px;
          color: var(--navy);
          font-weight: 800;
          margin-top: 2px;
        }
        .s2-id-recap .small {
          font-size: 11.5px;
          color: var(--gray-mute);
          margin-top: 1px;
          font-style: italic;
        }
        .s2-id-recap .locked-badge {
          background: var(--gold);
          color: var(--navy);
          padding: 5px 10px;
          border-radius: 8px;
          font-size: 10.5px;
          font-weight: 800;
          letter-spacing: .6px;
        }

        /* RULES */
        .s2-card {
          background: var(--card);
          border-radius: 16px;
          padding: 24px 26px;
          box-shadow: 0 2px 10px rgba(15,27,61,.05);
          margin-bottom: 18px;
          border: 1px solid var(--border);
        }
        .s2-card-title { font-size: 20px; font-weight: 800; color: var(--navy); margin: 0; }
        .s2-card-eyebrow {
          font-size: 10.5px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-top: 8px;
        }
        .s2-rules-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 18px;
        }
        @media (max-width: 640px) {
          .s2-rules-grid { grid-template-columns: 1fr; }
        }
        .s2-rule-tile {
          background: var(--gold-pale);
          padding: 16px 18px;
          border-radius: 12px;
          border-left: 4px solid var(--gold);
        }
        .s2-rule-head { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
        .s2-rule-ico {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 15px;
          font-weight: 700;
          flex-shrink: 0;
        }
        .s2-rule-title { font-size: 13.5px; font-weight: 800; color: var(--navy); }
        .s2-rule-body { font-size: 12.5px; color: var(--gray-txt); line-height: 1.55; }
        .s2-consent-pill {
          background: var(--navy);
          color: var(--gold-pale);
          padding: 12px 16px;
          border-radius: 12px;
          font-style: italic;
          font-size: 12.5px;
          margin-top: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .s2-consent-pill .ico { color: var(--gold); font-size: 16px; }

        /* FORM TOOLBAR */
        .s2-form-toolbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: linear-gradient(135deg, var(--gold-pale), #FFF9E0);
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 16px;
          border: 1px solid var(--gold-soft);
        }
        .s2-progress-rail {
          display: flex;
          align-items: center;
          gap: 6px;
          background: var(--white);
          padding: 8px 14px;
          border-radius: 20px;
          border: 1px solid var(--border);
          font-size: 11.5px;
          color: var(--gray-mute);
          font-weight: 600;
        }
        .s2-rail-dot { width: 9px; height: 9px; border-radius: 50%; background: var(--border); }
        .s2-rail-dot.done { background: var(--gold); }
        .s2-rail-dot.active { background: var(--gold); box-shadow: 0 0 0 3px var(--gold-pale); }
        .s2-saved-badge {
          color: var(--green);
          font-weight: 700;
          font-size: 11.5px;
          margin-left: auto;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* FORM HEADERS & SECTIONS */
        .s2-form-header { margin-bottom: 16px; }
        .s2-form-header h2 { font-size: 22px; font-weight: 800; color: var(--navy); margin: 0; }
        .s2-form-header .sub {
          color: var(--gold-deep);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 1.5px;
          text-transform: uppercase;
          margin-top: 6px;
        }

        .s2-section {
          background: #FAFAF7;
          padding: 22px 24px;
          border-radius: 14px;
          margin-bottom: 16px;
          border: 1px solid var(--border);
          position: relative;
        }
        .s2-section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px dashed var(--border);
        }
        .s2-section-num {
          width: 32px;
          height: 32px;
          background: var(--gold);
          color: var(--navy);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          flex-shrink: 0;
        }
        .s2-section-title { font-size: 16px; font-weight: 800; color: var(--navy); flex: 1; }
        .s2-status-chip {
          background: var(--green-soft);
          color: var(--green);
          padding: 3px 10px;
          border-radius: 12px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: .5px;
        }
        .s2-status-chip.pending { background: var(--gray-soft); color: var(--gray-mute); }
        .s2-status-chip.active { background: var(--gold-pale); color: var(--gold-deep); }

        /* FIELDS & INPUTS */
        .s2-field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; position: relative; }
        .s2-row { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
        .s2-row-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; }
        @media (max-width: 640px) {
          .s2-row, .s2-row-3 { grid-template-columns: 1fr; }
        }
        .s2-field label {
          font-size: 12.5px;
          font-weight: 700;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .s2-field label .req { color: var(--red); font-weight: 700; }
        .s2-field label .lock { color: var(--gray-mute); font-size: 11px; font-weight: 500; }
        .s2-helper { font-size: 11px; color: var(--gray-mute); font-style: italic; margin-top: 2px; }

        .s2-field input[type="text"],
        .s2-field input[type="email"],
        .s2-field input[type="tel"],
        .s2-field input[type="number"],
        .s2-field select,
        .s2-field textarea {
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          padding: 11px 14px;
          font-size: 13.5px;
          color: var(--navy);
          outline: none;
          transition: .15s;
          width: 100%;
          box-sizing: border-box;
        }
        .s2-field input:focus,
        .s2-field select:focus,
        .s2-field textarea:focus {
          border-color: var(--gold);
          box-shadow: 0 0 0 3px rgba(245,180,26,.14);
        }
        .s2-field input:disabled,
        .s2-field input[readonly] {
          background: var(--gray-soft);
          color: var(--navy);
          font-weight: 600;
          cursor: not-allowed;
        }
        .s2-field input.locked {
          background: #FDF6E4;
          border-color: var(--gold-soft);
          color: var(--navy);
          font-weight: 700;
        }

        /* MANDATORY FIELD ERROR HIGHLIGHTING */
        .s2-field.has-error input, .s2-field.has-error select, .s2-field.has-error textarea,
        .s2-field.has-error .s2-tag-picker,
        .s2-field.has-error .s2-choice-grid-4,
        .s2-field.has-error .s2-level-pill-group,
        .has-error input, .has-error select {
          border: 2px solid #EF4444 !important;
          background-color: #FEF2F2 !important;
          border-radius: 12px;
          box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.18) !important;
        }
        .field-error-msg {
          color: #DC2626;
          font-size: 11.5px;
          font-weight: 700;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        /* CHOICE CARDS (4 Col) */
        .s2-choice-grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
        @media (max-width: 768px) {
          .s2-choice-grid-4 { grid-template-columns: 1fr 1fr; }
        }
        .s2-choice {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 14px 14px;
          cursor: pointer;
          transition: .15s;
          position: relative;
        }
        .s2-choice:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s2-choice.selected {
          border-color: var(--gold);
          background: var(--gold-pale);
          box-shadow: 0 4px 10px rgba(245,180,26,.15);
        }
        .s2-choice-icon {
          width: 34px;
          height: 34px;
          background: var(--navy);
          color: var(--gold);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 16px;
          margin-bottom: 6px;
        }
        .s2-choice.selected .s2-choice-icon { background: var(--gold); color: var(--navy); }
        .s2-choice-title { font-weight: 800; color: var(--navy); font-size: 13px; }
        .s2-choice-sub { font-size: 11px; color: var(--gray-mute); margin-top: 2px; line-height: 1.4; }
        .s2-choice-check {
          position: absolute;
          top: 10px;
          right: 10px;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: grid;
          place-items: center;
          font-size: 11px;
          font-weight: 800;
        }
        .s2-choice.selected .s2-choice-check { background: var(--gold); border-color: var(--gold); color: var(--navy); }

        /* PATH CARDS */
        .s2-path-row { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
        @media (max-width: 640px) {
          .s2-path-row { grid-template-columns: 1fr; }
        }
        .s2-path-card {
          background: var(--white);
          border: 2px solid var(--border);
          border-radius: 12px;
          padding: 16px;
          cursor: pointer;
          transition: .15s;
          position: relative;
        }
        .s2-path-card:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s2-path-card.selected {
          border-color: var(--gold);
          background: var(--gold-pale);
          box-shadow: 0 4px 10px rgba(245,180,26,.15);
        }
        .s2-path-card .ico {
          width: 38px;
          height: 38px;
          background: var(--navy);
          color: var(--gold);
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-size: 18px;
          margin-bottom: 8px;
        }
        .s2-path-card.selected .ico { background: var(--gold); color: var(--navy); }
        .s2-path-card .title { font-weight: 800; color: var(--navy); font-size: 14px; }
        .s2-path-card .sub { font-size: 11.5px; color: var(--gray-mute); margin-top: 4px; line-height: 1.4; }
        .s2-path-card .badge-hint {
          background: var(--green-soft);
          color: var(--green);
          font-size: 10px;
          padding: 2px 7px;
          border-radius: 6px;
          font-weight: 700;
          letter-spacing: .3px;
          margin-top: 8px;
          display: inline-block;
        }
        .s2-path-card .badge-hint.yellow { background: #FFF3D6; color: var(--amber); }
        .s2-path-card .badge-hint.orange { background: #FFE4CC; color: #B85B00; }

        /* TAG PICKER & PILLS */
        .s2-tag-picker {
          display: flex;
          flex-wrap: wrap;
          gap: 7px;
          padding: 10px 12px;
          min-height: 44px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
        }
        .s2-tag {
          background: var(--navy);
          color: var(--white);
          padding: 5px 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }
        .s2-tag .x { opacity: .7; cursor: pointer; font-weight: 700; margin-left: 2px; }
        .s2-tag .x:hover { opacity: 1; }
        .s2-tag-add {
          background: var(--gold-pale);
          color: var(--gold-deep);
          padding: 5px 11px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 700;
          cursor: pointer;
          border: 1px dashed var(--gold);
        }
        .s2-tag-pill {
          background: var(--white);
          color: var(--navy);
          border: 1.5px solid var(--border);
          padding: 6px 12px;
          border-radius: 16px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: .15s;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }
        .s2-tag-pill:hover { border-color: var(--gold); background: var(--gold-pale); }
        .s2-tag-pill.selected {
          background: var(--gold);
          color: var(--navy);
          border-color: var(--gold);
          font-weight: 700;
        }

        /* AUTOCOMPLETE DROPDOWN */
        .s2-autocomplete-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #FFFFFF;
          border: 1.5px solid var(--gold);
          border-radius: 8px;
          box-shadow: 0 8px 24px rgba(15,27,61,.18);
          z-index: 50;
          max-height: 180px;
          overflow-y: auto;
          margin-top: 4px;
        }
        .s2-autocomplete-item {
          padding: 10px 14px;
          font-size: 13px;
          font-weight: 600;
          color: var(--navy);
          cursor: pointer;
          border-bottom: 1px solid var(--gray-soft);
        }
        .s2-autocomplete-item:hover {
          background: var(--gold-pale);
        }

        /* OPTIONS LIST */
        .s2-option-list { display: flex; flex-direction: column; gap: 8px; }
        .s2-option-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 14px;
          background: var(--white);
          border: 1.5px solid var(--border);
          border-radius: 9px;
          cursor: pointer;
          transition: .15s;
          font-size: 13px;
          color: var(--navy);
          font-weight: 600;
        }
        .s2-option-item:hover { border-color: var(--gold-soft); background: #FDF6E4; }
        .s2-option-item.selected { background: var(--gold-pale); border-color: var(--gold); }
        .s2-option-item .dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          border: 2px solid var(--border);
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }
        .s2-option-item.selected .dot { border-color: var(--gold); background: var(--white); }
        .s2-option-item.selected .dot::after {
          content: '';
          width: 8px;
          height: 8px;
          background: var(--gold);
          border-radius: 50%;
        }
        .s2-option-item .box {
          width: 16px;
          height: 16px;
          border: 2px solid var(--border);
          border-radius: 4px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          font-size: 12px;
          font-weight: 800;
        }
        .s2-option-item.selected .box {
          background: var(--gold);
          border-color: var(--gold);
          color: var(--navy);
        }

        /* VERIFICATION BADGE STRIP */
        .s2-verify-strip {
          background: linear-gradient(90deg, var(--green-soft), #F5FDF9);
          border: 1.5px solid var(--green);
          border-radius: 12px;
          padding: 14px 18px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 14px;
        }
        .s2-verify-strip .badge-dot {
          width: 32px;
          height: 32px;
          background: var(--green);
          color: var(--white);
          border-radius: 50%;
          display: grid;
          place-items: center;
          font-size: 14px;
          font-weight: 800;
          flex-shrink: 0;
        }
        .s2-verify-strip .title { font-weight: 800; color: var(--navy); font-size: 13.5px; }
        .s2-verify-strip .body { font-size: 12px; color: var(--gray-txt); margin-top: 2px; }

        /* DOC LINK CARD */
        .s2-doclink {
          background: var(--white);
          border: 1.5px dashed var(--gold);
          border-radius: 10px;
          padding: 12px 14px;
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 8px;
        }
        .s2-doclink .ico {
          width: 32px;
          height: 32px;
          background: var(--gold-pale);
          color: var(--gold-deep);
          border-radius: 8px;
          display: grid;
          place-items: center;
          font-size: 16px;
          flex-shrink: 0;
        }
        .s2-doclink .txt { flex: 1; }
        .s2-doclink .title { font-weight: 800; color: var(--navy); font-size: 12.5px; }
        .s2-doclink .sub { font-size: 11px; color: var(--gray-mute); margin-top: 2px; }
        .s2-doclink .go { color: var(--gold-deep); font-weight: 800; font-size: 12px; cursor: pointer; }

        .s2-autocomplete-hint {
          background: var(--blue-soft);
          color: var(--blue);
          padding: 8px 12px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 600;
          margin-top: 6px;
        }

        /* RIGHT SIDEBAR */
        .s2-right {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }
        .s2-passport-card {
          background: linear-gradient(135deg, var(--navy), #1E3A8A);
          color: var(--white);
          padding: 20px;
          border-radius: 14px;
          position: relative;
          overflow: hidden;
        }
        .s2-passport-card::before {
          content: '';
          position: absolute;
          right: -30px;
          bottom: -30px;
          width: 120px;
          height: 120px;
          background: radial-gradient(circle, rgba(245,180,26,.18), transparent 60%);
        }
        .s2-passport-eyebrow { color: var(--gold); font-size: 9.5px; font-weight: 700; letter-spacing: 1.5px; text-transform: uppercase; }
        .s2-passport-title { font-size: 17px; font-weight: 800; margin-top: 4px; color: #ffffff !important; }
        .s2-passport-status {
          background: rgba(245,180,26,.14);
          color: var(--gold);
          padding: 6px 10px;
          border-radius: 8px;
          font-size: 11px;
          font-weight: 700;
          margin-top: 12px;
          display: inline-block;
        }
        .s2-passport-desc {
          font-size: 11.5px;
          color: rgba(255,255,255,.75);
          margin-top: 10px;
          line-height: 1.5;
        }
        .s2-side-card {
          background: var(--card);
          padding: 16px 18px;
          border-radius: 12px;
          border: 1px solid var(--border);
        }
        .s2-side-card .title {
          font-size: 11px;
          letter-spacing: 1.5px;
          color: var(--gold-deep);
          text-transform: uppercase;
          font-weight: 700;
          margin-bottom: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .s2-company-row {
          display: grid;
          grid-template-columns: 38px 1fr;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
          align-items: center;
        }
        .s2-company-row:last-child { border: none; padding-bottom: 0; }
        .s2-company-row:first-child { padding-top: 0; }
        .s2-company-logo {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: grid;
          place-items: center;
          font-weight: 800;
          font-size: 15px;
          color: var(--white);
        }
        .s2-company-name {
          font-size: 12.5px;
          font-weight: 800;
          color: var(--navy);
          display: flex;
          align-items: center;
          gap: 5px;
        }
        .s2-hot-pill {
          background: var(--red);
          color: var(--white);
          padding: 1px 6px;
          border-radius: 6px;
          font-size: 8.5px;
          letter-spacing: .5px;
          font-weight: 800;
        }
        .s2-company-meta { font-size: 10.5px; color: var(--gray-mute); margin-top: 1px; }
        .s2-company-tags { display: flex; gap: 4px; margin-top: 5px; flex-wrap: wrap; }
        .s2-comp-tag {
          background: var(--gold-pale);
          color: var(--gold-deep);
          font-size: 9.5px;
          padding: 1px 6px;
          border-radius: 5px;
          font-weight: 700;
        }
        .s2-comp-tag.blue { background: var(--blue-soft); color: var(--blue); }
        .s2-comp-tag.green { background: var(--green-soft); color: var(--green); }
        .s2-verified-line { font-size: 10px; color: var(--green); margin-top: 4px; font-weight: 700; }

        .s2-hot-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .s2-hot-stat {
          background: var(--gold-pale);
          padding: 12px;
          border-radius: 10px;
          text-align: center;
        }
        .s2-hot-stat .big { font-size: 18px; font-weight: 800; color: var(--navy); }
        .s2-hot-stat .small { font-size: 10px; color: var(--gray-txt); margin-top: 2px; }

        /* BOTTOM ACTION BAR */
        .s2-sticky-bar {
          background: var(--white);
          padding: 16px 24px;
          border: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 32px;
          margin-bottom: 32px;
          border-radius: 12px;
          box-shadow: 0 4px 16px rgba(15,27,61,.04);
        }
        .s2-sticky-progress {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 12.5px;
          color: var(--gray-txt);
        }
        .s2-stick-bar-inner {
          height: 8px;
          width: 180px;
          background: var(--gray-soft);
          border-radius: 4px;
          overflow: hidden;
        }
        .s2-stick-bar-fill {
          height: 100%;
          width: 25%;
          background: linear-gradient(90deg, var(--gold), var(--gold-deep));
          border-radius: 4px;
        }
        .s2-sticky-actions { display: flex; gap: 10px; }
        .s2-action-btn {
          background: var(--gold);
          color: var(--navy);
          padding: 11px 22px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 800;
          border: none;
          cursor: pointer;
          letter-spacing: .3px;
          transition: .15s;
        }
        .s2-action-btn:hover { background: var(--gold-soft); }
        .s2-link-btn {
          background: transparent;
          color: var(--gray-txt);
          padding: 11px 20px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 700;
          border: 1.5px solid var(--border);
          cursor: pointer;
          transition: .15s;
        }
        .s2-link-btn:hover { background: var(--white); border-color: var(--gray-mute); }
      `}</style>

      <div className="stage02-shell">
        {/* MAIN COLUMN */}
        <div className="s2-main">
          {/* BREADCRUMB */}
          <div className="s2-breadcrumb">
            <span>Home</span>
            <span className="sep">›</span>
            <span>My Career Passport</span>
            <span className="sep">›</span>
            <span style={{ color: "var(--navy)", fontWeight: 800 }}>Stage 02 · Foundation</span>
          </div>

          {/* HERO */}
          <div className="s2-hero">
            <div className="s2-hero-icon">🎓</div>
            <div className="s2-hero-badges">
              <span className="s2-hero-chip">STAGE 02 OF 08 · ACTIVE</span>
              <span className="s2-hero-chip gold">+15 POINTS</span>
              <span className="s2-hero-chip">~15 MIN</span>
            </div>
            <h1 className="s2-hero-title" style={{ color: "#ffffff" }}>Foundation</h1>
            <div className="s2-hero-subtitle">Where you learned it. Where you earned it.</div>
            <div className="s2-hero-desc">
              You tell us where you trained, what you specialized in, and how deeply.
              Your academy verifies it back from their Talentera dashboard — so your
              training pedigree carries real weight on every company shortlist.
            </div>
            <div className="s2-hero-tiles">
              <div className="s2-hero-tile">
                <div className="big">400+</div>
                <div className="small">RCM academies mapped</div>
              </div>
              <div className="s2-hero-tile">
                <div className="big">Verified</div>
                <div className="small">by your academy</div>
              </div>
              <div className="s2-hero-tile">
                <div className="big">Live sign-off</div>
                <div className="small">from academy dashboard</div>
              </div>
              <div className="s2-hero-tile">
                <div className="big">~15 min</div>
                <div className="small">your time</div>
              </div>
            </div>
          </div>

          {/* IDENTITY RECAP */}
          <div className="s2-id-recap">
            <div className="check">✓</div>
            <div className="txt">
              <div className="lbl">FROM YOUR STAGE 01 · IDENTITY</div>
              <div className="val">{candidateName} · {candidateCity} · 🎓 {candidateExp}</div>
              <div className="small">Locked in Stage 01. Cannot be changed here.</div>
            </div>
            <div className="locked-badge">🔒 LOCKED</div>
          </div>

          {/* HOW STAGE 02 WORKS */}
          <div className="s2-card">
            <div className="s2-card-title">How Stage 02 Works</div>
            <div className="s2-card-eyebrow">WHY IT MATTERS · WHAT WE VERIFY · WHAT COMPANIES SEE</div>

            <div className="s2-rules-grid">
              <div className="s2-rule-tile">
                <div className="s2-rule-head">
                  <div className="s2-rule-ico">?</div>
                  <div className="s2-rule-title">Why training pedigree matters</div>
                </div>
                <div className="s2-rule-body">
                  RCM companies hire based on where you trained. A verified academy background
                  carries a different weight than a self-taught candidate. Stage 02 lets you
                  claim your training — and lets your academy sign it off, so companies know
                  it's real.
                </div>
              </div>
              <div className="s2-rule-tile">
                <div className="s2-rule-head">
                  <div className="s2-rule-ico">🔒</div>
                  <div className="s2-rule-title">What we verify with the academy</div>
                </div>
                <div className="s2-rule-body">
                  Academy name, batch, course level, roll number, duration and — most
                  importantly — your assessment score. Your academy sees your claim in their
                  Talentera dashboard and confirms it directly. Your score field is read-only
                  until they do.
                </div>
              </div>
              <div className="s2-rule-tile">
                <div className="s2-rule-head">
                  <div className="s2-rule-ico">📚</div>
                  <div className="s2-rule-title">What if you didn't go to an academy</div>
                </div>
                <div className="s2-rule-body">
                  Self-trained is welcome. You'll take the Talentera Foundation Assessment
                  instead — proctored, on-platform. Clear it and you unlock Stage 03 with a
                  "Self-Trained · Talentera Validated" badge. No academy dependency.
                </div>
              </div>
              <div className="s2-rule-tile">
                <div className="s2-rule-head">
                  <div className="s2-rule-ico">👁</div>
                  <div className="s2-rule-title">What companies see</div>
                </div>
                <div className="s2-rule-body">
                  Companies see: academy name, level, specialty, duration, mode of training,
                  and the verified badge if confirmed. Your score is visible only if verified.
                  Un-verified academies appear as "self-declared" and are filtered out first.
                </div>
              </div>
            </div>

            <div className="s2-consent-pill">
              <span className="ico">🎓</span>
              <span><i>Your academy sees your claim in their Talentera Academy Dashboard. Only verified data feeds your public profile.</i></span>
            </div>
          </div>

          {/* FORM TOOLBAR */}
          <div className="s2-form-toolbar">
            <div className="s2-progress-rail">
              <span>Progress:</span>
              <span className="s2-rail-dot done"></span>
              <span className="s2-rail-dot active"></span>
              <span className="s2-rail-dot"></span>
              <span className="s2-rail-dot"></span>
              <span className="s2-rail-dot"></span>
              <span>Section 2 of 5</span>
            </div>
            <div className="s2-saved-badge">{savedBadge}</div>
          </div>

          <div className="s2-form-header">
            <h2>Your Stage 02 information</h2>
            <div className="sub">FILL IN · WE VERIFY · YOU EARN +15 POINTS</div>
          </div>

          {error && (
            <div style={{ background: "#FDECEA", color: "#C0392B", padding: "12px 16px", borderRadius: 10, fontWeight: 700, marginBottom: 16, border: "1px solid #F8D7DA" }}>
              ⚠️ {error}
            </div>
          )}

          {/* SECTION 1 · DOMAIN + LEVEL + SPECIALTIES */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">1</div>
              <div className="s2-section-title">What did you train for?</div>
              <div className="s2-status-chip">DONE · +3</div>
            </div>

            <div className={`s2-field ${formErrors.domain ? "has-error" : ""}`}>
              <label>
                1.1 · Primary Domain <span className="req">*</span>
              </label>
              <div className="s2-helper" style={{ marginBottom: 8 }}>Pick the primary RCM function you trained on.</div>
              <div className="s2-choice-grid-4">
                {DOMAINS.map((d) => (
                  <div
                    key={d.id}
                    className={`s2-choice ${domain === d.id ? "selected" : ""}`}
                    onClick={() => handleSelectDomain(d.id)}
                  >
                    <div className="s2-choice-check">{domain === d.id ? "✓" : ""}</div>
                    <div className="s2-choice-icon">{d.icon}</div>
                    <div className="s2-choice-title">{d.title}</div>
                    <div className="s2-choice-sub">{d.sub}</div>
                  </div>
                ))}
              </div>
              {formErrors.domain && (
                <div className="field-error-msg">⚠️ {formErrors.domain}</div>
              )}
            </div>

            <div className={`s2-field ${formErrors.trainingLevel ? "has-error" : ""}`}>
              <label>
                1.2 · Training Level <span className="req">*</span>
              </label>
              <div className="s2-helper" style={{ marginBottom: 8 }}>
                Different levels signal different depth to companies{domain ? ` for ${domain}` : ""}.
              </div>
              <div className="s2-level-pill-group" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {currentTrainingLevels.map((lvl) => (
                  <span
                    key={lvl}
                    className={`s2-tag-pill ${!levelOtherSelected && trainingLevel === lvl ? "selected" : ""}`}
                    onClick={() => {
                      if (formErrors.trainingLevel) setFormErrors((prev) => ({ ...prev, trainingLevel: "" }));
                      setLevelOtherSelected(false);
                      setTrainingLevel(lvl);
                    }}
                  >
                    {lvl}
                  </span>
                ))}
                <span
                  className={`s2-tag-pill ${levelOtherSelected ? "selected" : ""}`}
                  onClick={() => {
                    if (formErrors.trainingLevel) setFormErrors((prev) => ({ ...prev, trainingLevel: "" }));
                    setTrainingLevel("");
                    setLevelOtherSelected(!levelOtherSelected);
                  }}
                >
                  Others
                </span>
              </div>
              {formErrors.trainingLevel && (
                <div className="field-error-msg">⚠️ {formErrors.trainingLevel}</div>
              )}
              {levelOtherSelected && (
                <div style={{ marginTop: 10, maxWidth: 420 }} className={`s2-field ${formErrors.levelOther ? "has-error" : ""}`}>
                  <input
                    type="text"
                    value={levelOtherText}
                    maxLength={60}
                    autoFocus
                    onChange={(e) => {
                      setLevelOtherText(e.target.value);
                      if (formErrors.levelOther) setFormErrors((prev) => ({ ...prev, levelOther: "" }));
                    }}
                    placeholder={`Type your training level ${domain ? `(e.g. Certified in ${domain})` : "(e.g. Certificate in Medical Billing)"}`}
                  />
                  {formErrors.levelOther && (
                    <div className="field-error-msg">⚠️ {formErrors.levelOther}</div>
                  )}
                </div>
              )}
            </div>

            <div className={`s2-field ${formErrors.specialties ? "has-error" : ""}`}>
              <label>
                1.3 · Specialties within your domain <span className="req">*</span>
                <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (pick up to 3)</span>
              </label>
              <div className="s2-tag-picker">
                {specialties.map((spec) => (
                  <span key={spec} className="s2-tag">
                    {spec} <span className="x" onClick={() => handleToggleSpecialty(spec)}>×</span>
                  </span>
                ))}
                <span className="s2-tag-add" onClick={() => toast("Select from the available specialty tags below", "ℹ")}>
                  + Available tags below
                </span>
              </div>
              {formErrors.specialties && (
                <div className="field-error-msg">⚠️ {formErrors.specialties}</div>
              )}
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                {ALL_SPECIALTIES.map((spec) => (
                  <span
                    key={spec}
                    className={`s2-tag-pill ${specialties.includes(spec) ? "selected" : ""}`}
                    onClick={() => handleToggleSpecialty(spec)}
                  >
                    {spec}
                  </span>
                ))}
                <span
                  className={`s2-tag-pill ${specialtyOtherOpen ? "selected" : ""}`}
                  onClick={() => setSpecialtyOtherOpen(!specialtyOtherOpen)}
                >
                  Others
                </span>
              </div>
              {specialtyOtherOpen && (
                <div style={{ display: "flex", gap: 8, marginTop: 10, maxWidth: 460, alignItems: "center" }}>
                  <input
                    type="text"
                    value={specialtyOtherText}
                    maxLength={40}
                    autoFocus
                    onChange={(e) => setSpecialtyOtherText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddCustomSpecialty();
                      }
                    }}
                    placeholder="Type your specialty (e.g. Medical Billing, AR Calling)"
                  />
                  <button type="button" className="s2-action-btn" onClick={handleAddCustomSpecialty} style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, cursor: "pointer" }}>
                    Add
                  </button>
                </div>
              )}
              <div className="s2-helper" style={{ marginTop: 6 }}>
                Not in the list — e.g. Billing, AR Calling, Denial Management? Choose Others and add your own.
              </div>
              <div className="s2-helper" style={{ marginTop: 6 }}>
                Available for Coding: E/M · HCC · ED · Surgery · IP-DRG · Home Health · ObGyn · Radiology · Pediatrics · Anesthesia · Pathology
              </div>
            </div>
          </div>

          {/* SECTION 2 · PATH CHOOSER */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">2</div>
              <div className="s2-section-title">How did you train?</div>
              <div className="s2-status-chip active">IN PROGRESS · +1</div>
            </div>

            <div className="s2-field">
              <label>Choose your training path <span className="req">*</span></label>
              <div className="s2-helper" style={{ marginBottom: 10 }}>This shapes what we ask you next.</div>
              <div className="s2-path-row">
                {TRAINING_PATHS.map((p) => (
                  <div
                    key={p.id}
                    className={`s2-path-card ${trainingPath === p.id ? "selected" : ""}`}
                    onClick={() => setTrainingPath(p.id)}
                  >
                    <div className="ico">{p.ico}</div>
                    <div className="title">{p.title}</div>
                    <div className="sub">{p.sub}</div>
                    <span className={`badge-hint ${p.hintClass}`}>{p.hint}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION 3 · PATH DETAILS */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">3</div>
              <div className="s2-section-title">
                {trainingPath === "self" ? "Self-Trained Platform & Learning Sources" : "Academy Details"}
              </div>
              <div className="s2-status-chip pending">
                {trainingPath === "self" ? (academyName ? "COMPLETED" : "PENDING") : "PENDING · +5"}
              </div>
            </div>

            {trainingPath === "self" ? (
              /* Self-Trained: Only Training Source Dropdown */
              <div className={`s2-field ${formErrors.academyName ? "has-error" : ""}`} style={{ marginBottom: 8 }}>
                <label>
                  Primary Learning Source / Platform <span className="req">*</span>
                </label>
                <select
                  value={academyName}
                  onChange={(e) => {
                    setAcademyName(e.target.value);
                    if (formErrors.academyName) setFormErrors((prev) => ({ ...prev, academyName: "" }));
                  }}
                  style={{
                    background: formErrors.academyName ? "#FEF2F2" : "var(--white)",
                    border: formErrors.academyName ? "2px solid #EF4444" : "1.5px solid var(--border)",
                    borderRadius: "9px",
                    padding: "11px 14px",
                    fontSize: "13.5px",
                    color: "var(--navy)",
                    fontWeight: "600",
                    width: "100%",
                  }}
                >
                  <option value="">-- Select Self-Learning Source / Platform --</option>
                  {SELF_LEARNING_SOURCES.map((src) => (
                    <option key={src} value={src}>
                      {src}
                    </option>
                  ))}
                </select>
                {formErrors.academyName && (
                  <div className="field-error-msg">⚠️ {formErrors.academyName}</div>
                )}
                <div className="s2-helper">
                  Select your primary self-learning platform (e.g. YouTube channels, AAPC guides, or online courses).
                </div>
              </div>
            ) : (
              <>
                {/* Row 1: Academy Name (Dropdown List) & Academy Location (Input with Dropdown List) */}
                <div className="s2-row">
                  <div className={`s2-field ${formErrors.academyName ? "has-error" : ""}`}>
                    <label>
                      Academy Name <span className="req">*</span>
                    </label>
                    <select
                      value={academyName}
                      onChange={(e) => {
                        handleSelectAcademy(e.target.value);
                        if (formErrors.academyName) setFormErrors((prev) => ({ ...prev, academyName: "" }));
                      }}
                      style={{
                        background: formErrors.academyName ? "#FEF2F2" : "var(--white)",
                        border: formErrors.academyName ? "2px solid #EF4444" : "1.5px solid var(--border)",
                        borderRadius: "9px",
                        padding: "11px 14px",
                        fontSize: "13.5px",
                        color: "var(--navy)",
                        fontWeight: "600",
                      }}
                    >
                      <option value="">-- Select Academy from List --</option>
                      {allAcademiesList.map((a) => (
                        <option key={a.name} value={a.name}>
                          {a.name} ({a.location || "Pan-India"})
                        </option>
                      ))}
                    </select>
                    {formErrors.academyName && (
                      <div className="field-error-msg">⚠️ {formErrors.academyName}</div>
                    )}
                    <div className="s2-helper">
                      Select your training academy from the list.
                    </div>
                  </div>

                  <div className="s2-field">
                    <label>
                      Academy Location / Branch <span className="req">*</span>
                    </label>
                    <input
                      type="text"
                      list="academy-locations-datalist"
                      value={academyLocation}
                      onChange={(e) => setAcademyLocation(e.target.value)}
                      placeholder="Select from dropdown or type location (e.g. Coimbatore, Tamil Nadu)"
                    />
                    <datalist id="academy-locations-datalist">
                      {ACADEMY_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc} />
                      ))}
                    </datalist>
                    <div className="s2-helper">
                      Select your academy location from the list or type your specific branch.
                    </div>
                  </div>
                </div>

                {/* Row 2: Batch / Roll Number & Certificate ID */}
                <div className="s2-row">
                  <div className="s2-field">
                    <label>Batch / Roll Number <span className="req">*</span></label>
                    <input
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="e.g. APX-2601-012 / Roll No"
                    />
                    <div className="s2-helper">Your academy cross-checks this against their student roster.</div>
                  </div>
                  <div className="s2-field">
                    <label>Certificate ID <span className="req">*</span></label>
                    <input
                      type="text"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      placeholder="e.g. CERT-2026-HCC-0187"
                    />
                    <div className="s2-helper">Unique ID from your academy. Duplicate IDs are auto-flagged.</div>
                  </div>
                </div>

                {/* Row 3: Start Month/Year, End Month/Year, Total Training Hours */}
                <div className="s2-row-3">
                  <div className="s2-field">
                    <label>Start Month & Year <span className="req">*</span></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        value={startMonth}
                        onChange={(e) => setStartMonth(e.target.value)}
                      >
                        <option value="">Month…</option>
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={startYear}
                        onChange={(e) => setStartYear(e.target.value)}
                      >
                        <option value="">Year…</option>
                        {TRAINING_YEAR_OPTIONS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="s2-field">
                    <label>End Month & Year <span className="req">*</span></label>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <select
                        value={endMonth}
                        onChange={(e) => setEndMonth(e.target.value)}
                      >
                        <option value="">Month…</option>
                        {MONTH_OPTIONS.map((m) => (
                          <option key={m.val} value={m.val}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                      <select
                        value={endYear}
                        onChange={(e) => setEndYear(e.target.value)}
                      >
                        <option value="">Year…</option>
                        {TRAINING_YEAR_OPTIONS.map((yr) => (
                          <option key={yr} value={yr}>
                            {yr}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <div className="s2-field">
                    <label>Total Training Hours <span className="req">*</span></label>
                    <select value={totalHours} onChange={(e) => setTotalHours(e.target.value)}>
                      <option value="">Select hours…</option>
                      {TOTAL_HOURS_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Row 4: Mode of Training */}
                <div className="s2-field">
                  <label>Mode of Training <span className="req">*</span></label>
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    {TRAINING_MODES.map((mode) => (
                      <span
                        key={mode}
                        className={`s2-tag-pill ${modeOfTraining === mode ? "selected" : ""}`}
                        onClick={() => setModeOfTraining(mode)}
                      >
                        {mode}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="s2-field">
                  <label>
                    Academy Assessment Score <span className="lock">🔒 Populated by academy — read-only</span>
                  </label>
                  <input type="text" className="locked" value={academyScore} readOnly />
                  <div className="s2-helper">
                    Your score can only be set by your academy or by Talentera's proctored assessment. Never self-declared.
                  </div>
                </div>

                {/* DOC LINK */}
                <div className="s2-doclink">
                  <div className="ico">📁</div>
                  <div className="txt">
                    <div className="title">Your Certificate is stored in My Documents</div>
                    <div className="sub">HCC_Certificate.pdf · uploaded 15 Sep 2026 · verified by {academyName.split(" ")[0] || "Academy"}</div>
                  </div>
                  <span className="go" onClick={() => toast("Certificate verified and stored securely in platform vault.", "✓")}>
                    Open Vault →
                  </span>
                </div>

                {/* VERIFICATION STRIP */}
                <div className="s2-verify-strip">
                  <div className="badge-dot">🟢</div>
                  <div>
                    <div className="title">Academy-Verified · {academyName}</div>
                    <div className="body">
                      Your batch, roll number and score were confirmed by {academyName} via their Talentera Academy Dashboard.
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* SECTION 4 · PRACTICAL EXPOSURE */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">4</div>
              <div className="s2-section-title">Practical Exposure</div>
              <div className="s2-status-chip pending">PENDING · +3</div>
            </div>

            <div className="s2-field">
              <label>Have you practiced on real or mock charts? <span className="req">*</span></label>
              <div style={{ display: "flex", gap: 8, maxWidth: 280 }}>
                <div
                  className={`s2-option-item ${practicedCharts ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setPracticedCharts(true)}
                >
                  <div className="dot"></div>
                  <div>Yes</div>
                </div>
                <div
                  className={`s2-option-item ${!practicedCharts ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setPracticedCharts(false)}
                >
                  <div className="dot"></div>
                  <div>No</div>
                </div>
              </div>
            </div>

            {practicedCharts && (
              <div className="s2-field">
                <label>Total charts practiced <span className="req">*</span></label>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {CHART_PRACTICE_OPTIONS.map((cOpt) => (
                    <span
                      key={cOpt}
                      className={`s2-tag-pill ${chartsCount === cOpt ? "selected" : ""}`}
                      onClick={() => setChartsCount(cOpt)}
                    >
                      {cOpt}
                    </span>
                  ))}
                </div>
                <div className="s2-helper">Live coding platforms + hours will be verified in Stage 06 · Live Chart. Not asked here.</div>
              </div>
            )}

            <div className="s2-field">
              <label>Any internship / observership done?</label>
              <div style={{ display: "flex", gap: 8, maxWidth: 280, marginBottom: 10 }}>
                <div
                  className={`s2-option-item ${internshipDone ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setInternshipDone(true)}
                >
                  <div className="dot"></div>
                  <div>Yes</div>
                </div>
                <div
                  className={`s2-option-item ${!internshipDone ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setInternshipDone(false)}
                >
                  <div className="dot"></div>
                  <div>No</div>
                </div>
              </div>

              {internshipDone && (
                <div className="s2-row-3">
                  <div className="s2-field">
                    <label>Where</label>
                    <input
                      type="text"
                      value={internshipWhere}
                      onChange={(e) => setInternshipWhere(e.target.value)}
                      placeholder="Hospital / RCM firm / clinic"
                    />
                  </div>
                  <div className="s2-field">
                    <label>Duration</label>
                    <input
                      type="text"
                      value={internshipDuration}
                      onChange={(e) => setInternshipDuration(e.target.value)}
                      placeholder="e.g. 2 months"
                    />
                  </div>
                  <div className="s2-field">
                    <label>What you did</label>
                    <input
                      type="text"
                      value={internshipRole}
                      onChange={(e) => setInternshipRole(e.target.value)}
                      placeholder="1-2 lines"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SECTION 5 · READINESS CHECK */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">5</div>
              <div className="s2-section-title">Readiness Check</div>
              <div className="s2-status-chip pending">PENDING · +3</div>
            </div>

            <div className="s2-field">
              <label>I'm confident in <span className="req">*</span></label>
              <div className="s2-helper" style={{ marginBottom: 6 }}>Companies match you to these specialties first.{isFresherCandidate ? " As a fresher, pick the foundation topics you know well." : ""}</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {readinessOptions.map((spec) => (
                  <span
                    key={spec}
                    className={`s2-tag-pill ${confidentSpecs.includes(spec) ? "selected" : ""}`}
                    onClick={() => handleToggleConfident(spec)}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div className="s2-field">
              <label>I'd like more practice in</label>
              <div className="s2-helper" style={{ marginBottom: 6 }}>Our Learning Hub will recommend content on these.</div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {readinessOptions.map((spec) => (
                  <span
                    key={spec}
                    className={`s2-tag-pill ${learningSpecs.includes(spec) ? "selected" : ""}`}
                    onClick={() => handleToggleLearning(spec)}
                  >
                    {spec}
                  </span>
                ))}
              </div>
            </div>

            <div className="s2-row">
              <div className="s2-field">
                <label>When can you start? <span className="req">*</span></label>
                <div className="s2-option-list">
                  {START_TIMELINES.map((t) => (
                    <div
                      key={t.id}
                      className={`s2-option-item ${startTimeline === t.id ? "selected" : ""}`}
                      onClick={() => setStartTimeline(t.id)}
                    >
                      <div className="dot"></div>
                      <div>{t.label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="s2-field">
                <label>Open to shift work <span className="req">*</span></label>
                <div className="s2-option-list">
                  {SHIFT_OPTIONS.map((sh) => (
                    <div
                      key={sh.id}
                      className={`s2-option-item ${selectedShifts.includes(sh.id) ? "selected" : ""}`}
                      onClick={() => handleToggleShift(sh.id)}
                    >
                      <div className="box">{selectedShifts.includes(sh.id) ? "✓" : ""}</div>
                      <div>{sh.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="s2-field" style={{ marginTop: 8 }}>
              <label>Open to starting as a Trainee role? <span className="req">*</span></label>
              <div className="s2-helper" style={{ marginBottom: 6 }}>
                Many fresher roles are labelled "Trainee" for the first 3-6 months. Opening this widens your funnel.
              </div>
              <div style={{ display: "flex", gap: 8, maxWidth: 280 }}>
                <div
                  className={`s2-option-item ${openToTrainee ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setOpenToTrainee(true)}
                >
                  <div className="dot"></div>
                  <div>Yes</div>
                </div>
                <div
                  className={`s2-option-item ${!openToTrainee ? "selected" : ""}`}
                  style={{ flex: 1, justifyContent: "center" }}
                  onClick={() => setOpenToTrainee(false)}
                >
                  <div className="dot"></div>
                  <div>No</div>
                </div>
              </div>
            </div>
          </div>

          {/* STICKY BOTTOM BAR */}
          <div className="s2-sticky-bar">
            <div className="s2-sticky-progress">
              <div className="s2-stick-bar-inner">
                <div className="s2-stick-bar-fill"></div>
              </div>
              <div><b>25 / 100</b> · Stage 02 in progress</div>
            </div>
            <div className="s2-sticky-actions">
              <button
                type="button"
                className="s2-action-btn"
                onClick={handleSaveAndContinue}
                disabled={saving}
              >
                {saving ? "Saving…" : "Save & continue to Stage 03 →"}
              </button>
            </div>
          </div>
        </div>

        {/* RIGHT SIDEBAR COLUMN */}
        <div className="s2-right" style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={2} candidate={candidate} />
        </div>
      </div>
    </div>
  );
}
