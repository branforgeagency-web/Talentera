import React, { useState, useEffect, useRef, useMemo } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { ACADEMY_REGIONS, ACADEMY_LOCATIONS_BY_REGION, ACADEMY_LOCATIONS, ACADEMIES_BY_LOCATION, ACADEMY_STATE_BY_LOCATION } from "../../data/academiesData.js";

// Common healthcare RCM / medical coding employers. Candidates pick from this
// list; anything else goes through the "Other (not listed)" option.
const COMPANY_OTHER = "__other__";
const COMPANY_OPTIONS = [
  "Access Healthcare", "AGS Health", "Allied Digital", "Altruista Health", "Apollo Health & Lifestyle",
  "Apollo Hospitals", "Aspirion", "Athenahealth", "Cerner", "CitiusTech", "Clarus RCM",
  "Cognizant", "Conifer Health Solutions", "Dignity Health Global Education", "eClinicalWorks",
  "Episource", "Equinox Healthcare", "EXL Service", "Firstsource", "Fortis Healthcare",
  "GeBBS Healthcare Solutions", "Genpact", "HCL Technologies", "HGS (Hinduja Global Solutions)",
  "HealthAxis", "Healthcare Triangle", "Infosys BPM", "iMedX", "Ikigai Medical Billing", "Invensis",
  "IQVIA", "Maxim Healthcare", "MCI (Medical Coding Inc.)", "MedQuist", "MediBuddy", "Medusind",
  "Medi Assist", "Mphasis", "MTBC (CareCloud)", "Navigant (Guidehouse)", "Nuance", "nThrive",
  "Omega Healthcare", "Optum (UnitedHealth Group)", "Parexel", "R1 RCM", "Runwal Healthcare",
  "Sutherland Global", "SPi Global", "Sodexo Healthcare", "Tata Consultancy Services (TCS)",
  "TeamHealth", "Tech Mahindra", "Teleperformance", "Wipro", "WNS Global Services",
  "Xerox / Conduent", "Zenith Healthcare", "Zoho",
];

const DOMAINS = [
  {
    id: "Medical Coding",
    title: "Medical Coding",
    sub: "Assigning codes to charts (ICD, CPT, HCPCS)",
    icon: "fa-solid fa-stethoscope",
  },
  {
    id: "Medical Billing",
    title: "Medical Billing",
    sub: "Charge entry, payment posting, claims",
    icon: "fa-solid fa-file-invoice-dollar",
  },
  {
    id: "Accounts Receivable",
    title: "Accounts Receivable",
    sub: "AR calling, denials, appeals",
    icon: "fa-solid fa-headset",
  },
  {
    id: "Eligibility & Verification",
    title: "Eligibility & Verification",
    sub: "Insurance eligibility checks, pre-auth, benefits verification",
    icon: "fa-solid fa-clipboard-check",
  },
];

const DOMAINS_WITHOUT_SPECIALTIES = ["Accounts Receivable", "Eligibility & Verification"];

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
  "Eligibility & Verification": [
    "Non-Trained",
    "Basic Eligibility & Verification",
    "Intermediate Eligibility & Verification",
    "Advanced Eligibility & Verification",
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

const TRAINING_PATHS = [
  {
    id: "academy",
    title: "Path A · Academy",
    sub: "Completed / doing a course at an RCM training academy.",
    hint: "Academy-Verified",
    hintClass: "",
    ico: "fa-solid fa-school",
    badgeIcon: "fa-solid fa-circle-check",
  },
  {
    id: "self",
    title: "Path B · Self-trained",
    sub: "Learned from books, YouTube, AAPC guides, online courses.",
    hint: "Talentera-Assessed",
    hintClass: "yellow",
    ico: "fa-solid fa-book-open-reader",
    badgeIcon: "fa-solid fa-award",
  },
  {
    id: "pursuing",
    title: "Path C · Pursuing",
    sub: "Currently in the middle of an academy course.",
    hint: "In Training",
    hintClass: "orange",
    ico: "fa-solid fa-hourglass-half",
    badgeIcon: "fa-solid fa-clock",
  },
  {
    id: "non_trained",
    title: "Path D · Non-Trained",
    sub: "No formal RCM training or course taken yet. Entry-level fresher.",
    hint: "Direct Entry",
    hintClass: "blue",
    ico: "fa-solid fa-user-graduate",
    badgeIcon: "fa-solid fa-bolt",
  },
];

const TRAINING_MODES = ["Classroom", "Online", "Hybrid", "Self-paced"];
const TOTAL_EXPERIENCE_OPTIONS = ["Less than 1 year", "1 – 2 years", "2 – 3 years", "3 – 5 years", "5 – 8 years", "8+ years"];
const NOTICE_PERIOD_OPTIONS = ["Immediate Joiner", "15 Days", "30 Days", "45 Days", "60 Days", "90 Days"];
const TOTAL_HOURS_OPTIONS = ["Less than 100 hrs", "100 – 200 hrs", "200 – 400 hrs", "400+ hrs"];
const SHIFT_OPTIONS = [
  { id: "day", label: "Day shift", icon: "fa-solid fa-sun" },
  { id: "night", label: "US Night shift", icon: "fa-solid fa-moon" },
  { id: "uk_evening", label: "UK Evening shift", icon: "fa-solid fa-earth-europe" },
  { id: "rotational", label: "Rotational", icon: "fa-solid fa-arrows-rotate" },
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
  // Prioritise Stage 1 saved value; only fall back to root-level candidate.experience
  // if Stage 1 has not been saved yet. Numeric values (e.g. "5" from registration)
  // must not override an explicit Fresher selection in Stage 1.
  const candidateExp = s1.experience || s1.experienceLevel ||
    (typeof candidate.experience === "string" && /^(fresher|experienced)$/i.test(candidate.experience)
      ? candidate.experience
      : "Fresher");

  // FORM STATES (Initialized from existingData or empty)
  const [showHowItWorks, setShowHowItWorks] = useState(false);
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

    if (DOMAINS_WITHOUT_SPECIALTIES.includes(nextDomain) && specialties.length > 0) {
      setSpecialties([]);
      if (formErrors.specialties) setFormErrors((prev) => ({ ...prev, specialties: "" }));
    }

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

  // Experienced-candidate profile — replaces the Academy/Self-trained/Non-trained training path
  // questions (Sections 2 & 3) with real work-history fields, since an experienced hire doesn't
  // need to re-prove how they originally trained.
  const [expCompanyName, setExpCompanyName] = useState(existingData.currentCompany || "");
  // True when the candidate's company is not in COMPANY_OPTIONS (typed manually).
  const [expCompanyIsOther, setExpCompanyIsOther] = useState(
    !!existingData.currentCompany && !COMPANY_OPTIONS.includes(existingData.currentCompany)
  );
  const [expJobTitle, setExpJobTitle] = useState(existingData.jobTitle || "");
  const [expProjectDetails, setExpProjectDetails] = useState(existingData.projectDetails || "");
  const [expTotalYears, setExpTotalYears] = useState(existingData.totalExperience || "");
  const [expNoticePeriod, setExpNoticePeriod] = useState(existingData.noticePeriod || "");
  const [expCurrentSalary, setExpCurrentSalary] = useState(existingData.currentSalary || "");
  const [expSkills, setExpSkills] = useState(existingData.skills || "");
  const [expCertDocName, setExpCertDocName] = useState(existingData.certDocName || "");
  const [expCertDocUrl, setExpCertDocUrl] = useState(existingData.certDocUrl || "");
  const [uploadingExpCertDoc, setUploadingExpCertDoc] = useState(false);
  const expCertFileInputRef = useRef(null);
  // Employment status ("working" | "relieved"); relieved candidates can attach
  // their relieving letter and latest pay slip for staff verification.
  const [expEmploymentStatus, setExpEmploymentStatus] = useState(existingData.employmentStatus || "");
  const [expRelievingLetterName, setExpRelievingLetterName] = useState(existingData.relievingLetterName || "");
  const [expRelievingLetterUrl, setExpRelievingLetterUrl] = useState(existingData.relievingLetterUrl || "");
  const [expPayslipName, setExpPayslipName] = useState(existingData.payslipName || "");
  const [expPayslipUrl, setExpPayslipUrl] = useState(existingData.payslipUrl || "");
  const [uploadingExpDoc, setUploadingExpDoc] = useState("");
  const expRelievingFileInputRef = useRef(null);
  const expPayslipFileInputRef = useRef(null);
  const [nonTrainedBackground, setNonTrainedBackground] = useState(
    existingData.nonTrainedBackground || "Life Sciences / Medical / Allied Health Graduate"
  );
  const [nonTrainedExposure, setNonTrainedExposure] = useState(
    existingData.nonTrainedExposure || "Complete Beginner — Ready for company onboarding"
  );
  const [nonTrainedTargetRole, setNonTrainedTargetRole] = useState(
    existingData.nonTrainedTargetRole || "Trainee Medical Coder"
  );
  const [openToSponsorship, setOpenToSponsorship] = useState(
    existingData.openToSponsorship !== undefined ? existingData.openToSponsorship : true
  );

  // Path A / C Details - Academy Name, Academy Location & Region
  const [academyName, setAcademyName] = useState(existingData.academyName || "");
  const [academyLocation, setAcademyLocation] = useState(
    existingData.academyLocation || existingData.academyCity || existingData.instituteCity || existingData.location || ""
  );
  const [locationOtherMode, setLocationOtherMode] = useState(() => {
    const initLoc = existingData.academyLocation || existingData.academyCity || existingData.instituteCity || existingData.location || "";
    return !!initLoc && !ACADEMY_LOCATIONS.some((l) => l.name === initLoc);
  });
  const [academyRegion, setAcademyRegion] = useState(() => {
    const initLoc = existingData.academyLocation || existingData.academyCity || existingData.instituteCity || existingData.location || "";
    const match = ACADEMY_LOCATIONS.find((l) => l.name === initLoc);
    return match ? ACADEMY_STATE_BY_LOCATION[match.name] || "" : "";
  });
  const [registeredAcademies, setRegisteredAcademies] = useState([]);
  const [batch, setBatch] = useState(existingData.batch || existingData.batchNumber || existingData.rollNumber || "");
  const [formErrors, setFormErrors] = useState({});

  // Search / open state for the three searchable comboboxes (Region, Location, Academy Name)
  const [regionSearch, setRegionSearch] = useState("");
  const [regionDropdownOpen, setRegionDropdownOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [locationDropdownOpen, setLocationDropdownOpen] = useState(false);
  const [academyNameSearch, setAcademyNameSearch] = useState("");
  const [academyNameDropdownOpen, setAcademyNameDropdownOpen] = useState(false);

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

  // Locations available for the selected region
  const locationsForRegion = useMemo(() => {
    return ACADEMY_LOCATIONS_BY_REGION[academyRegion] || [];
  }, [academyRegion]);

  const filteredRegions = useMemo(() => {
    const q = regionSearch.trim().toLowerCase();
    if (!q) return ACADEMY_REGIONS;
    return ACADEMY_REGIONS.filter((r) => r.name.toLowerCase().includes(q));
  }, [regionSearch]);

  const filteredLocations = useMemo(() => {
    const q = locationSearch.trim().toLowerCase();
    const list = locationsForRegion.map((name) => ({
      name,
      count: (ACADEMY_LOCATIONS.find((l) => l.name === name)?.count) || 0,
    }));
    if (!q) return list;
    return list.filter((l) => l.name.toLowerCase().includes(q));
  }, [locationsForRegion, locationSearch]);

  // Academies available for the selected location (real directory + any backend-registered academies)
  const academiesForLocation = useMemo(() => {
    const base = ACADEMIES_BY_LOCATION[academyLocation] || [];
    const registeredNames = registeredAcademies.map((a) => a.name).filter((n) => n && !base.includes(n));
    return [...base, ...registeredNames];
  }, [academyLocation, registeredAcademies]);

  const filteredAcademyNames = useMemo(() => {
    const q = academyNameSearch.trim().toLowerCase();
    if (!q) return academiesForLocation;
    return academiesForLocation.filter((n) => n.toLowerCase().includes(q));
  }, [academiesForLocation, academyNameSearch]);

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
  const rawAcademyScore = existingData.academyAssessmentScore ?? existingData.assessmentScore ?? existingData.score;
  const [academyScore] = useState(
    rawAcademyScore !== undefined && rawAcademyScore !== null && rawAcademyScore !== "" ? rawAcademyScore : "—"
  );

  const step3Points = useMemo(() => {
    if (trainingPath === "non_trained") return 5;
    if (trainingPath === "self") return academyName ? 5 : 0;
    if (academyScore !== "—" && academyScore !== "" && academyScore !== null && academyScore !== undefined) {
      const num = Number(String(academyScore).replace(/[^0-9.]/g, ""));
      if (!isNaN(num)) {
        if (num >= 80) return 5;
        if (num >= 60) return 4;
        return 3;
      }
    }
    return 5;
  }, [trainingPath, academyName, academyScore]);

  // Section 4 · Practical Exposure
  const [practicedCharts, setPracticedCharts] = useState(
    existingData.practicedCharts !== undefined ? existingData.practicedCharts : null
  );
  const [chartsCount] = useState(existingData.chartsCount || existingData.totalChartsCount || "");
  const [internshipDone] = useState(
    existingData.internshipDone !== undefined ? existingData.internshipDone : null
  );
  const [internshipWhere] = useState(existingData.internshipWhere || "");
  const [internshipDuration] = useState(existingData.internshipDuration || "");
  const [internshipRole] = useState(
    existingData.internshipRole || ""
  );

  const [selectedShifts, setSelectedShifts] = useState(
    Array.isArray(existingData.shifts) && existingData.shifts.length > 0
      ? existingData.shifts
      : []
  );

  // UI / Submission state
  const [saving, setSaving] = useState(false);
  const [savedBadge, setSavedBadge] = useState("✓ Saved just now");
  const [error, setError] = useState("");

  function handleRegionChange(value) {
    if (value === "__other__") {
      setLocationOtherMode(true);
      setAcademyRegion("");
      setAcademyLocation("");
    } else {
      setLocationOtherMode(false);
      setAcademyRegion(value);
      setAcademyLocation("");
    }
    setAcademyName("");
  }

  function handleLocationSelect(value) {
    setAcademyLocation(value);
    setAcademyName("");
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

  function handleSelectTrainingPath(pathId) {
    setTrainingPath(pathId);
    if (formErrors.academyName) {
      setFormErrors((prev) => ({ ...prev, academyName: "" }));
    }
    if (pathId === "non_trained") {
      // Auto-set training level to "Non-Trained" if not custom-typed
      if (!levelOtherSelected) {
        setTrainingLevel("Non-Trained");
        if (formErrors.trainingLevel) setFormErrors((prev) => ({ ...prev, trainingLevel: "" }));
      }
      if (practicedCharts === null) setPracticedCharts(false);
      toast("Switched to Non-Trained · Direct Entry mode. Form sections updated.", <i className="fa-solid fa-circle-info" />);
    }
  }

  // Readiness Check pills: freshers & non-trained candidates see foundation topics (Anatomy, Physiology…)
  // first, then the specialties they picked in 1.3 (relevant match), then the
  // usual specialty list. Anything already selected always stays visible.
  // Default to Fresher unless the value explicitly says "Experienced" - candidates added via
  // company/bulk-import flows can have a legacy placeholder like "1-3" in stage1.experience
  // (a years-range string, not the Fresher/Experienced wording the wizard itself saves), and
  // that unrecognized value must never be treated as a positive "Experienced" signal - it
  // would wrongly show this Experienced-only section to a Fresher whose real choice just
  // hasn't been saved yet. Matches the same "exp" substring check the resume components use.
  const isFresherCandidate = !/exp/i.test(String(candidateExp || ""));
  const handleUploadExpCertDoc = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("Certificate file size must be less than 10 MB.", "!");
      return;
    }
    setUploadingExpCertDoc(true);
    try {
      const formData = new FormData();
      formData.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/2`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setExpCertDocName(file.name);
      setExpCertDocUrl(res.data?.docUrl || res.data?.url || "");
      toast(`${file.name} uploaded successfully!`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Certificate upload failed.", "!");
    } finally {
      setUploadingExpCertDoc(false);
    }
  };

  const handleUploadExpEmploymentDoc = async (e, kind) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast("File size must be less than 10 MB.", "!");
      return;
    }
    setUploadingExpDoc(kind);
    try {
      const formData = new FormData();
      formData.append("doc", file);
      const res = await api.post(`/candidate/upload/doc/2`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      const url = res.data?.docUrl || res.data?.url || "";
      if (kind === "relieving") {
        setExpRelievingLetterName(file.name);
        setExpRelievingLetterUrl(url);
      } else {
        setExpPayslipName(file.name);
        setExpPayslipUrl(url);
      }
      toast(`${file.name} uploaded successfully!`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Upload failed.", "!");
    } finally {
      setUploadingExpDoc("");
    }
  };

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
    const isNonTrained = trainingPath === "non_trained";
    const resolvedLevel = isNonTrained ? (trainingLevel || "Non-Trained") : (effectiveTrainingLevel || (!isFresherCandidate ? "Experienced" : ""));
    return {
      isDraft,
      domain,
      trainingLevel: resolvedLevel,
      specialties,
      specialty: specialties[0] || (domain ? `${domain} General` : "RCM General"),
      // Experienced-candidate work history — replaces the training-path questions for them (Section 2)
      currentCompany: isFresherCandidate ? "" : expCompanyName.trim(),
      jobTitle: isFresherCandidate ? "" : expJobTitle.trim(),
      projectDetails: isFresherCandidate ? "" : expProjectDetails.trim(),
      totalExperience: isFresherCandidate ? "" : expTotalYears,
      noticePeriod: isFresherCandidate ? "" : expNoticePeriod,
      currentSalary: isFresherCandidate ? "" : expCurrentSalary.trim(),
      skills: isFresherCandidate ? "" : expSkills.trim(),
      employmentStatus: isFresherCandidate ? "" : expEmploymentStatus,
      relievingLetterName: isFresherCandidate || expEmploymentStatus !== "relieved" ? "" : expRelievingLetterName,
      relievingLetterUrl: isFresherCandidate || expEmploymentStatus !== "relieved" ? "" : expRelievingLetterUrl,
      payslipName: isFresherCandidate || expEmploymentStatus !== "relieved" ? "" : expPayslipName,
      payslipUrl: isFresherCandidate || expEmploymentStatus !== "relieved" ? "" : expPayslipUrl,
      certDocName: isFresherCandidate ? "" : expCertDocName,
      certDocUrl: isFresherCandidate ? "" : expCertDocUrl,
      courseName: domain ? `${domain} - ${specialties.join(", ") || resolvedLevel}` : (specialties.join(", ") || resolvedLevel),
      course: domain,
      trainingPath,
      isNonTrained,
      isSelfTrained: trainingPath === "self" || isNonTrained,
      academyName: isNonTrained ? "Non-Trained / Direct Entry" : academyName.trim(),
      academyLocation: isNonTrained ? (candidateCity || "—") : academyLocation.trim(),
      academyCity: isNonTrained ? (candidateCity || "—") : academyLocation.trim(),
      instituteCity: isNonTrained ? (candidateCity || "—") : academyLocation.trim(),
      location: isNonTrained ? (candidateCity || "—") : academyLocation.trim(),
      batch: isNonTrained ? "Direct Entry" : batch.trim(),
      batchNumber: isNonTrained ? "Direct Entry" : batch.trim(),
      rollNumber: isNonTrained ? "Direct Entry" : batch.trim(),
      startMonth: isNonTrained ? "" : startMonth,
      startYear: isNonTrained ? "" : startYear,
      startDate: isNonTrained ? "" : (startYear ? (startMonth ? `${startMonth}/${startYear}` : startYear) : ""),
      endMonth: isNonTrained ? "" : endMonth,
      endYear: isNonTrained ? "" : endYear,
      endDate: isNonTrained ? "" : (endYear ? (endMonth ? `${endMonth}/${endYear}` : endYear) : ""),
      duration: isNonTrained ? "0 hrs" : totalHours,
      totalHours: isNonTrained ? "0 hrs" : totalHours,
      modeOfTraining: isNonTrained ? "Direct Entry" : modeOfTraining,
      certificateId: isNonTrained ? "" : certificateId.trim(),
      academyAssessmentScore: isNonTrained ? "—" : academyScore,
      nonTrainedBackground: isNonTrained ? nonTrainedBackground : undefined,
      nonTrainedExposure: isNonTrained ? nonTrainedExposure : undefined,
      nonTrainedTargetRole: isNonTrained ? nonTrainedTargetRole : undefined,
      practicedCharts: practicedCharts === null ? false : practicedCharts,
      chartsCount: practicedCharts !== true ? "0" : (chartsCount || "0"),
      totalChartsCount: practicedCharts !== true ? "0" : (chartsCount || "0"),
      internshipDone: internshipDone === null ? false : internshipDone,
      internshipWhere: internshipWhere.trim(),
      internshipDuration: internshipDuration.trim(),
      internshipRole: internshipRole.trim(),
      shifts: selectedShifts,
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
    if (isFresherCandidate && !trainingLevel && !levelOtherSelected && trainingPath !== "non_trained") {
      missing.push("Training Level (Section 1.2)");
      errs.trainingLevel = "Please select your training level";
    } else if (isFresherCandidate && levelOtherSelected && !levelOtherText.trim()) {
      missing.push("Training Level - specify under Others (Section 1.2)");
      errs.levelOther = "Please type your training level";
    }
    if (isFresherCandidate && trainingPath === "academy" && (!academyName || academyName.trim().length < 2)) {
      missing.push("Academy Name (Section 3)");
      errs.academyName = "Academy Name is mandatory";
    }
    if (isFresherCandidate && trainingPath === "self" && (!academyName || academyName.trim().length < 2)) {
      missing.push("Primary Learning Source / Platform (Section 3)");
      errs.academyName = "Primary Learning Source / Platform is mandatory";
    }
    if (!isFresherCandidate) {
      if (!expCompanyName || expCompanyName.trim().length < 2) {
        missing.push("Current / Most Recent Company (Section 2)");
        errs.expCompanyName = "Company name is mandatory";
      }
      if (!expJobTitle || expJobTitle.trim().length < 2) {
        missing.push("Job Title (Section 2)");
        errs.expJobTitle = "Job title is mandatory";
      }
      if (!expTotalYears) {
        missing.push("Total Experience (Section 2)");
        errs.expTotalYears = "Please select your total experience";
      }
    }

    if (missing.length > 0) {
      setFormErrors(errs);
      const msg = `Please fill all mandatory fields highlighted in red: ${missing.join(", ")}.`;
      setError(msg);
      toast(msg, "error", { title: "Mandatory Fields Required" });
      if (errs.domain || errs.trainingLevel || errs.levelOther) {
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
          width: 100%;
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
          grid-template-columns: repeat(3, 1fr);
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
        .s2-path-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
        @media (max-width: 960px) {
          .s2-path-row { grid-template-columns: 1fr 1fr; }
        }
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
          display: inline-flex;
          align-items: center;
        }
        .s2-path-card .badge-hint.yellow { background: #FFF3D6; color: var(--amber); }
        .s2-path-card .badge-hint.orange { background: #FFE4CC; color: #B85B00; }
        .s2-path-card .badge-hint.blue { background: #EEF2FF; color: #1D4ED8; }

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

          {/* HERO */}
          <div className="s2-hero">
            <div className="s2-hero-icon"><i className="fa-solid fa-graduation-cap" /></div>
            <div className="s2-hero-badges">
              <span className="s2-hero-chip">STAGE 02 OF 07 · ACTIVE</span>
              <span className="s2-hero-chip gold">+15 POINTS</span>
            </div>
            <h1 className="s2-hero-title" style={{ color: "#ffffff" }}>Foundation</h1>
            <div className="s2-hero-subtitle">Where you learned it. Where you earned it.</div>
            <div className="s2-hero-desc">
              Where you trained and what you specialized in — verified by your academy, carrying real weight on every company shortlist.
            </div>
          </div>

          {/* IDENTITY RECAP */}
          <div className="s2-id-recap">
            <div className="check">✓</div>
            <div className="txt">
              <div className="lbl">FROM YOUR STAGE 01 · IDENTITY</div>
              <div className="val">{candidateName} · {candidateCity} · {candidateExp}</div>
              <div className="small">Locked in Stage 01. Cannot be changed here.</div>
            </div>
            <div className="locked-badge">LOCKED</div>
          </div>

          {/* HOW STAGE 02 WORKS */}
          <div className="s2-card">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div className="s2-card-title">How Stage 02 Works</div>
              <button type="button" onClick={() => setShowHowItWorks((p) => !p)} style={{ background: "transparent", border: "none", color: "#64748B", fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                {showHowItWorks ? "Hide Details" : "Show Details"}
              </button>
            </div>
            {showHowItWorks && (
            <>
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
                  <div className="s2-rule-ico"><i className="fa-solid fa-lock" /></div>
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
                  <div className="s2-rule-ico"><i className="fa-solid fa-book" /></div>
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
                  <div className="s2-rule-ico"><i className="fa-solid fa-eye" /></div>
                  <div className="s2-rule-title">What companies see</div>
                </div>
                <div className="s2-rule-body">
                  Companies see: academy name, level, specialty, duration, mode of training,
                  and the verified badge if confirmed. Your score is visible only if verified.
                  Un-verified academies appear as "self-declared" and are filtered out first.
                </div>
              </div>
            </div>
            </>
            )}

            <div className="s2-consent-pill">
              <span className="ico"><i className="fa-solid fa-graduation-cap" /></span>
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
              {error}
            </div>
          )}

          {/* SECTION 1 · DOMAIN + LEVEL + SPECIALTIES */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">1</div>
              <div className="s2-section-title">{isFresherCandidate ? "What did you train for?" : "Your Domain"}</div>
              <div className="s2-status-chip">DONE · +3</div>
            </div>

            <div className={`s2-field ${formErrors.domain ? "has-error" : ""}`}>
              <label>
                1.1 · Primary Domain <span className="req">*</span>
              </label>
              <div className="s2-helper" style={{ marginBottom: 8 }}>{isFresherCandidate ? "Pick the primary RCM function you trained on." : "Pick the primary RCM domain you work in."}</div>
              <div className="s2-choice-grid-4">
                {DOMAINS.map((d) => (
                  <div
                    key={d.id}
                    className={`s2-choice ${domain === d.id ? "selected" : ""}`}
                    onClick={() => handleSelectDomain(d.id)}
                  >
                    <div className="s2-choice-check">{domain === d.id ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} /> : ""}</div>
                    <div className="s2-choice-icon"><i className={d.icon} /></div>
                    <div className="s2-choice-title">{d.title}</div>
                    <div className="s2-choice-sub">{d.sub}</div>
                  </div>
                ))}
              </div>
              {formErrors.domain && (
                <div className="field-error-msg">{formErrors.domain}</div>
              )}
            </div>

            {isFresherCandidate && (
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
                <div className="field-error-msg">{formErrors.trainingLevel}</div>
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
                    <div className="field-error-msg">{formErrors.levelOther}</div>
                  )}
                </div>
              )}
            </div>
            )}

            {!DOMAINS_WITHOUT_SPECIALTIES.includes(domain) && (
            <div className="s2-field">
              <label>
                1.3 · Specialties within your domain
                <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal", color: "var(--gray-mute)" }}> (Optional — pick up to 3)</span>
              </label>
              <div className="s2-tag-picker">
                {specialties.map((spec) => (
                  <span key={spec} className="s2-tag">
                    {spec} <span className="x" onClick={() => handleToggleSpecialty(spec)}>×</span>
                  </span>
                ))}
                <span className="s2-tag-add" onClick={() => toast("Select from the available specialty tags below", <i className="fa-solid fa-circle-info" />)}>
                  + Available tags below
                </span>
              </div>
              {formErrors.specialties && (
                <div className="field-error-msg">{formErrors.specialties}</div>
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
            )}
          </div>

          {isFresherCandidate ? (
            <>
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
                    onClick={() => handleSelectTrainingPath(p.id)}
                  >
                    <div className="s2-choice-check">{trainingPath === p.id ? <i className="fa-solid fa-check" style={{ fontSize: 10 }} /> : ""}</div>
                    <div className="ico"><i className={p.ico} /></div>
                    <div className="title">{p.title}</div>
                    <div className="sub">{p.sub}</div>
                    <span className={`badge-hint ${p.hintClass}`}>
                      <i className={p.badgeIcon} style={{ marginRight: 5, fontSize: 9 }} />
                      {p.hint}
                    </span>
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
                {trainingPath === "non_trained"
                  ? "Direct Entry & Trainee Profile"
                  : trainingPath === "self"
                  ? "Self-Trained Platform & Learning Sources"
                  : "Academy Details"}
              </div>
              <div className={`s2-status-chip ${trainingPath === "non_trained" || (trainingPath === "self" && academyName) || (academyScore !== "—" && academyScore !== "") ? "completed" : "pending"}`}>
                {trainingPath === "non_trained"
                  ? "COMPLETED · +5"
                  : trainingPath === "self"
                  ? (academyName ? "COMPLETED · +5" : "PENDING")
                  : (academyScore !== "—" && academyScore !== "" ? `VERIFIED · +${step3Points}` : "PENDING · +5")}
              </div>
            </div>

            {trainingPath === "non_trained" ? (
              /* Non-Trained / Direct Entry Profile */
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div
                  style={{
                    background: "linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%)",
                    border: "1.5px solid #86EFAC",
                    borderRadius: 12,
                    padding: "16px 20px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 14,
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "#16A34A",
                      color: "#FFFFFF",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    <i className="fa-solid fa-user-graduate" />
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: "#14532D" }}>
                      Direct Entry Candidate · No Academy Certificate Required
                    </div>
                    <div style={{ fontSize: 12, color: "#166534", marginTop: 4, lineHeight: 1.5 }}>
                      You have selected <strong>Non-Trained</strong>. Healthcare RCM employers actively recruit fresh graduates directly for in-house training batches with 30–90 days of paid onboarding. You do not need to provide academy certificates, batch numbers, or training hours.
                    </div>
                  </div>
                </div>

                <div className="s2-row">
                  <div className="s2-field">
                    <label>
                      Academic / Educational Foundation <span className="req">*</span>
                    </label>
                    <select
                      value={nonTrainedBackground}
                      onChange={(e) => setNonTrainedBackground(e.target.value)}
                    >
                      <option value="Life Sciences / Medical / Allied Health Graduate">Life Sciences / Medical / Allied Health Graduate</option>
                      <option value="Non-Life Science Graduate">Non-Life Science Graduate</option>
                      <option value="Pharmacy / Nursing / Physiotherapy Graduate">Pharmacy / Nursing / Physiotherapy Graduate</option>
                      <option value="Commerce / Finance / Accounts Graduate (B.Com, BBA)">Commerce / Finance / Accounts Graduate (B.Com, BBA)</option>
                      <option value="Engineering / Computer Science / IT / BCA Graduate">Engineering / Computer Science / IT / BCA Graduate</option>
                      <option value="Arts / Humanities / Science Graduate">Arts / Humanities / Science Graduate</option>
                      <option value="Career Transitioner (Switching from another domain)">Career Transitioner (Switching from another domain)</option>
                    </select>
                    <div className="s2-helper">Highlights your foundational educational strength to hiring managers.</div>
                  </div>

                  <div className="s2-field">
                    <label>
                      Prior Familiarity with Healthcare / RCM <span className="req">*</span>
                    </label>
                    <select
                      value={nonTrainedExposure}
                      onChange={(e) => setNonTrainedExposure(e.target.value)}
                    >
                      <option value="Complete Beginner — Ready for company onboarding">Complete Beginner — Ready for company onboarding</option>
                      <option value="Basic knowledge of Human Anatomy & Physiology">Basic knowledge of Human Anatomy & Physiology</option>
                      <option value="Basic familiarity with Medical Terminology">Basic familiarity with Medical Terminology</option>
                      <option value="Self-studied ICD-10 / CPT / Billing overviews">Self-studied ICD-10 / CPT / Billing overviews</option>
                      <option value="Watched introductory YouTube / web webinars">Watched introductory YouTube / web webinars</option>
                    </select>
                    <div className="s2-helper">Helps recruiters match you to the right beginner training track.</div>
                  </div>
                </div>

                <div className="s2-row">
                  <div className="s2-field">
                    <label>Target Trainee Role <span className="req">*</span></label>
                    <select
                      value={nonTrainedTargetRole}
                      onChange={(e) => setNonTrainedTargetRole(e.target.value)}
                    >
                      <option value="Trainee Medical Coder">Trainee Medical Coder</option>
                      <option value="Trainee Medical Biller">Trainee Medical Biller</option>
                      <option value="AR Caller / Junior Associate">AR Caller / Junior Associate</option>
                      <option value="Eligibility & Verification Trainee">Eligibility & Verification Trainee</option>
                      <option value="Open to any RCM Trainee position">Open to any RCM Trainee position</option>
                    </select>
                    <div className="s2-helper">The entry-level role you want recruiters to evaluate you for.</div>
                  </div>

                  <div className="s2-field">
                    <label>Open to Company-Sponsored Training & Certification? <span className="req">*</span></label>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      <div
                        className={`s2-option-item ${openToSponsorship ? "selected" : ""}`}
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => setOpenToSponsorship(true)}
                      >
                        <div className="dot"></div>
                        <div>Yes, definitely</div>
                      </div>
                      <div
                        className={`s2-option-item ${!openToSponsorship ? "selected" : ""}`}
                        style={{ flex: 1, justifyContent: "center" }}
                        onClick={() => setOpenToSponsorship(false)}
                      >
                        <div className="dot"></div>
                        <div>Self-sponsored</div>
                      </div>
                    </div>
                    <div className="s2-helper">Most top RCM employers sponsor CPC/CIC exams after 6 months.</div>
                  </div>
                </div>
              </div>
            ) : trainingPath === "self" ? (
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
                  <div className="field-error-msg">{formErrors.academyName}</div>
                )}
                <div className="s2-helper">
                  Select your primary self-learning platform (e.g. YouTube channels, AAPC guides, or online courses).
                </div>
              </div>
            ) : (
              <>
                {/* Row 1: Region, Academy Location & Academy Name — cascading, all searchable */}
                <div className="s2-row-3">
                  <div className="s2-field" style={{ position: "relative" }}>
                    <label>
                      Region / State <span className="req">*</span>
                    </label>
                    {locationOtherMode ? (
                      <>
                        <input type="text" value="Other / Not Listed" disabled style={{ background: "#F1F5F9", color: "var(--gray-mute)" }} />
                        <button
                          type="button"
                          onClick={() => {
                            setLocationOtherMode(false);
                            setAcademyRegion("");
                            setAcademyLocation("");
                            setAcademyName("");
                          }}
                          style={{ fontSize: 12, color: "var(--gold)", background: "none", border: "none", cursor: "pointer", padding: "4px 0 0", fontWeight: 700 }}
                        >
                          ← Back to region list
                        </button>
                      </>
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search region..."
                          value={regionDropdownOpen ? regionSearch : academyRegion}
                          onFocus={() => { setRegionDropdownOpen(true); setRegionSearch(""); }}
                          onChange={(e) => { setRegionSearch(e.target.value); setRegionDropdownOpen(true); }}
                          onBlur={() => setTimeout(() => setRegionDropdownOpen(false), 150)}
                          style={{
                            background: "var(--white)",
                            border: "1.5px solid var(--border)",
                            borderRadius: "9px",
                            padding: "11px 14px",
                            fontSize: "13.5px",
                            color: "var(--navy)",
                            fontWeight: "600",
                            width: "100%",
                          }}
                        />
                        {regionDropdownOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                            {filteredRegions.length === 0 && (
                              <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13 }}>
                                {`No regions match "${regionSearch}"`}
                              </div>
                            )}
                            {filteredRegions.map((r) => (
                              <div
                                key={r.name}
                                onMouseDown={() => {
                                  handleRegionChange(r.name);
                                  setRegionDropdownOpen(false);
                                  setRegionSearch("");
                                }}
                                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: academyRegion === r.name ? "#FDF6E4" : "transparent", fontWeight: academyRegion === r.name ? 700 : 400 }}
                              >
                                <span>{r.name}</span>
                                <span style={{ fontSize: 11, color: "#94A3B8" }}>{r.count}</span>
                              </div>
                            ))}
                            <div
                              onMouseDown={() => {
                                handleRegionChange("__other__");
                                setRegionDropdownOpen(false);
                                setRegionSearch("");
                              }}
                              style={{ padding: "10px 14px", cursor: "pointer", borderTop: "1px solid #E2E8F0", color: "var(--gray-mute)", fontWeight: 600 }}
                            >
                              Other / Not Listed
                            </div>
                          </div>
                        )}
                      </>
                    )}
                    <div className="s2-helper">{"Select your academy's state / region first."}</div>
                  </div>

                  <div className="s2-field" style={{ position: "relative" }}>
                    <label>
                      Academy Location / Branch <span className="req">*</span>
                    </label>
                    {locationOtherMode ? (
                      <input
                        type="text"
                        value={academyLocation}
                        onChange={(e) => setAcademyLocation(e.target.value)}
                        placeholder="Type your academy's location (e.g. city, state)"
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search location..."
                          value={locationDropdownOpen ? locationSearch : academyLocation}
                          onFocus={() => { setLocationDropdownOpen(true); setLocationSearch(""); }}
                          onChange={(e) => { setLocationSearch(e.target.value); setLocationDropdownOpen(true); }}
                          onBlur={() => setTimeout(() => setLocationDropdownOpen(false), 150)}
                          disabled={!academyRegion}
                          style={{
                            background: academyRegion ? "var(--white)" : "#F1F5F9",
                            border: "1.5px solid var(--border)",
                            borderRadius: "9px",
                            padding: "11px 14px",
                            fontSize: "13.5px",
                            color: "var(--navy)",
                            fontWeight: "600",
                            width: "100%",
                          }}
                        />
                        {locationDropdownOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                            {filteredLocations.length === 0 && (
                              <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13 }}>
                                {`No locations match "${locationSearch}"`}
                              </div>
                            )}
                            {filteredLocations.map((l) => (
                              <div
                                key={l.name}
                                onMouseDown={() => {
                                  handleLocationSelect(l.name);
                                  setLocationDropdownOpen(false);
                                  setLocationSearch("");
                                }}
                                style={{ padding: "10px 14px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: academyLocation === l.name ? "#FDF6E4" : "transparent", fontWeight: academyLocation === l.name ? 700 : 400 }}
                              >
                                <span>{l.name}</span>
                                <span style={{ fontSize: 11, color: "#94A3B8" }}>{l.count}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    <div className="s2-helper">
                      {locationOtherMode
                        ? "Type your academy's location (e.g. city, state)."
                        : academyRegion
                        ? "Select your academy's location to filter the academy list."
                        : "Select a region first."}
                    </div>
                  </div>

                  <div className={`s2-field ${formErrors.academyName ? "has-error" : ""}`} style={{ position: "relative" }}>
                    <label>
                      Academy Name <span className="req">*</span>
                    </label>
                    {locationOtherMode ? (
                      <input
                        type="text"
                        value={academyName}
                        onChange={(e) => {
                          setAcademyName(e.target.value);
                          if (formErrors.academyName) setFormErrors((prev) => ({ ...prev, academyName: "" }));
                        }}
                        placeholder="Type your academy's name"
                        style={{
                          background: formErrors.academyName ? "#FEF2F2" : "var(--white)",
                          border: formErrors.academyName ? "2px solid #EF4444" : "1.5px solid var(--border)",
                        }}
                      />
                    ) : (
                      <>
                        <input
                          type="text"
                          placeholder="Search academy..."
                          value={academyNameDropdownOpen ? academyNameSearch : academyName}
                          onFocus={() => {
                            setAcademyNameDropdownOpen(true);
                            setAcademyNameSearch("");
                          }}
                          onChange={(e) => {
                            setAcademyNameSearch(e.target.value);
                            setAcademyNameDropdownOpen(true);
                            if (formErrors.academyName) setFormErrors((prev) => ({ ...prev, academyName: "" }));
                          }}
                          onBlur={() => setTimeout(() => setAcademyNameDropdownOpen(false), 150)}
                          disabled={!academyLocation}
                          style={{
                            background: formErrors.academyName ? "#FEF2F2" : academyLocation ? "var(--white)" : "#F1F5F9",
                            border: formErrors.academyName ? "2px solid #EF4444" : "1.5px solid var(--border)",
                            borderRadius: "9px",
                            padding: "11px 14px",
                            fontSize: "13.5px",
                            color: "var(--navy)",
                            fontWeight: "600",
                            width: "100%",
                          }}
                        />
                        {academyNameDropdownOpen && (
                          <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 20, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 4, maxHeight: 280, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
                            {filteredAcademyNames.length === 0 && (
                              <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13 }}>
                                {academyLocation
                                  ? `No academies match "${academyNameSearch}"`
                                  : "Select a location first"}
                              </div>
                            )}
                            {filteredAcademyNames.map((name) => (
                              <div
                                key={name}
                                onMouseDown={() => {
                                  setAcademyName(name);
                                  if (formErrors.academyName) setFormErrors((prev) => ({ ...prev, academyName: "" }));
                                  setAcademyNameDropdownOpen(false);
                                  setAcademyNameSearch("");
                                }}
                                style={{ padding: "10px 14px", cursor: "pointer", background: academyName === name ? "#FDF6E4" : "transparent", fontWeight: academyName === name ? 700 : 400 }}
                              >
                                {name}
                              </div>
                            ))}
                          </div>
                        )}
                      </>
                    )}
                    {formErrors.academyName && (
                      <div className="field-error-msg">{formErrors.academyName}</div>
                    )}
                    <div className="s2-helper">
                      {locationOtherMode
                        ? "Type your academy's name — it will be reviewed and added to our directory."
                        : "Academies filtered to your selected location."}
                    </div>
                  </div>
                </div>

                {/* Row 2: Batch / Roll Number & Certificate ID */}
                <div className="s2-row">
                  <div className="s2-field">
                    <label>
                      Batch / Roll Number
                      <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal", color: "var(--gray-mute)", marginLeft: 6 }}>
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={batch}
                      onChange={(e) => setBatch(e.target.value)}
                      placeholder="e.g. APX-2601-012 / Roll No (Optional)"
                    />
                    <div className="s2-helper">Optional: Cross-checked against student roster if available.</div>
                  </div>
                  <div className="s2-field">
                    <label>
                      Certificate ID
                      <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal", color: "var(--gray-mute)", marginLeft: 6 }}>
                        (Optional)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={certificateId}
                      onChange={(e) => setCertificateId(e.target.value)}
                      placeholder="e.g. CERT-2026-HCC-0187 (Optional)"
                    />
                    <div className="s2-helper">Optional: Unique ID from your academy if issued. Duplicate IDs are auto-flagged.</div>
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
                    Academy Assessment Score <span className="lock">Populated by academy — read-only</span>
                  </label>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <input
                      type="text"
                      className="locked"
                      value={academyScore !== "—" && !String(academyScore).includes("%") ? `${academyScore}%` : academyScore}
                      readOnly
                      style={{ maxWidth: 140, fontWeight: 700 }}
                    />
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "6px 12px",
                        borderRadius: 6,
                        background: step3Points === 5 ? "#DCFCE7" : step3Points === 4 ? "#FEF3C7" : "#FEE2E2",
                        color: step3Points === 5 ? "#15803D" : step3Points === 4 ? "#D97706" : "#DC2626",
                        border: `1px solid ${step3Points === 5 ? "#86EFAC" : step3Points === 4 ? "#FDE68A" : "#FECACA"}`,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <span>Allocates +{step3Points} pts</span>
                    </span>
                  </div>
                  <div className="s2-helper" style={{ marginTop: 6, display: "flex", flexDirection: "column", gap: 4 }}>
                    <div>Your score can only be set by your academy or by Talentera's proctored assessment. Never self-declared.</div>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", fontSize: 11, marginTop: 2 }}>
                      <span style={{ background: "#F1F5F9", padding: "2px 7px", borderRadius: 4, color: "#334155" }}>
                        ≥ 80% → <strong>5 points</strong>
                      </span>
                      <span style={{ background: "#F1F5F9", padding: "2px 7px", borderRadius: 4, color: "#334155" }}>
                        60% – 80% → <strong>4 points</strong>
                      </span>
                      <span style={{ background: "#F1F5F9", padding: "2px 7px", borderRadius: 4, color: "#334155" }}>
                        &lt; 60% → <strong>3 points</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* DOC LINK */}
                <div className="s2-doclink">
                  <div className="ico"><i className="fa-solid fa-folder" /></div>
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
                  <div className="badge-dot"><i className="fa-solid fa-circle" /></div>
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
            </>
          ) : (
            <>
          {/* SECTION 2 · YOUR WORK EXPERIENCE (Experienced candidates) */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">2</div>
              <div className="s2-section-title">Your Work Experience</div>
              <div className="s2-status-chip pending">PENDING · +8</div>
            </div>

            <div className="s2-row">
              <div className={`s2-field ${formErrors.expCompanyName ? "has-error" : ""}`}>
                <label>
                  Current / Most Recent Company <span className="req">*</span>
                </label>
                <select
                  value={expCompanyIsOther ? COMPANY_OTHER : expCompanyName}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === COMPANY_OTHER) {
                      setExpCompanyIsOther(true);
                      setExpCompanyName("");
                    } else {
                      setExpCompanyIsOther(false);
                      setExpCompanyName(v);
                    }
                    if (formErrors.expCompanyName) setFormErrors((prev) => ({ ...prev, expCompanyName: "" }));
                  }}
                >
                  <option value="">-- Select company --</option>
                  {COMPANY_OPTIONS.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value={COMPANY_OTHER}>Other (company not listed)</option>
                </select>
                {expCompanyIsOther && (
                  <input
                    type="text"
                    style={{ marginTop: 8 }}
                    value={expCompanyName}
                    onChange={(e) => {
                      setExpCompanyName(e.target.value);
                      if (formErrors.expCompanyName) setFormErrors((prev) => ({ ...prev, expCompanyName: "" }));
                    }}
                    placeholder="Type your company name"
                  />
                )}
                {formErrors.expCompanyName && (
                  <div className="field-error-msg">{formErrors.expCompanyName}</div>
                )}
              </div>

              <div className={`s2-field ${formErrors.expTotalYears ? "has-error" : ""}`}>
                <label>
                  Total Experience <span className="req">*</span>
                </label>
                <select
                  value={expTotalYears}
                  onChange={(e) => {
                    setExpTotalYears(e.target.value);
                    if (formErrors.expTotalYears) setFormErrors((prev) => ({ ...prev, expTotalYears: "" }));
                  }}
                >
                  <option value="">-- Select --</option>
                  {TOTAL_EXPERIENCE_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {formErrors.expTotalYears && (
                  <div className="field-error-msg">{formErrors.expTotalYears}</div>
                )}
              </div>
            </div>

            <div className="s2-row">
              <div className={`s2-field ${formErrors.expJobTitle ? "has-error" : ""}`}>
                <label>
                  Job Title / Designation <span className="req">*</span>
                </label>
                <input
                  type="text"
                  value={expJobTitle}
                  onChange={(e) => {
                    setExpJobTitle(e.target.value);
                    if (formErrors.expJobTitle) setFormErrors((prev) => ({ ...prev, expJobTitle: "" }));
                  }}
                  placeholder="e.g. Senior AR Caller, HCC Coder, Billing Executive"
                />
                {formErrors.expJobTitle && (
                  <div className="field-error-msg">{formErrors.expJobTitle}</div>
                )}
              </div>

              <div className="s2-field">
                <label>
                  Key Skills
                  <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
                </label>
                <input
                  type="text"
                  value={expSkills}
                  onChange={(e) => setExpSkills(e.target.value)}
                  placeholder="e.g. ICD-10-CM, CPT coding, denial management, AR follow-up"
                />
              </div>
            </div>

            <div className="s2-field">
              <label>
                Project / Client Details
                <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
              </label>
              <div className="s2-helper" style={{ marginBottom: 8 }}>
                What did you work on — client type, process, specialty focus.
              </div>
              <textarea
                rows={3}
                value={expProjectDetails}
                onChange={(e) => setExpProjectDetails(e.target.value)}
                placeholder="e.g. AR follow-up for a US multispecialty client — denial management and payer calling on outpatient claims"
              />
            </div>

            <div className="s2-row">
              <div className={`s2-field ${formErrors.expNoticePeriod ? "has-error" : ""}`}>
                <label>
                  Notice Period
                  <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
                </label>
                <select
                  value={expNoticePeriod}
                  onChange={(e) => {
                    setExpNoticePeriod(e.target.value);
                    if (formErrors.expNoticePeriod) setFormErrors((prev) => ({ ...prev, expNoticePeriod: "" }));
                  }}
                >
                  <option value="">-- Select --</option>
                  {NOTICE_PERIOD_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
                {formErrors.expNoticePeriod && (
                  <div className="field-error-msg">{formErrors.expNoticePeriod}</div>
                )}
              </div>

              <div className="s2-field">
                <label>
                  Current Salary (₹ LPA)
                  <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
                </label>
                <input
                  type="text"
                  value={expCurrentSalary}
                  onChange={(e) => setExpCurrentSalary(e.target.value)}
                  placeholder="e.g. 3.6"
                />
              </div>
            </div>

            <div className="s2-field">
              <label>
                Employment Status
                <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
              </label>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 6 }}>
                {[
                  { id: "working", label: "Currently working here" },
                  { id: "relieved", label: "Relieved / left this company" },
                ].map((o) => (
                  <label
                    key={o.id}
                    style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 10, cursor: "pointer", fontWeight: 700, fontSize: 13, border: `1.5px solid ${expEmploymentStatus === o.id ? "var(--gold)" : "#E2E8F0"}`, background: expEmploymentStatus === o.id ? "#FFFBEB" : "#fff" }}
                  >
                    <input
                      type="checkbox"
                      checked={expEmploymentStatus === o.id}
                      onChange={() => setExpEmploymentStatus(expEmploymentStatus === o.id ? "" : o.id)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
              {expEmploymentStatus === "relieved" && (
                <div style={{ marginTop: 8 }}>
                  <div className="s2-helper">Upload your relieving letter and latest pay slip — PDF, JPG or PNG, up to 10 MB each. Our team will verify them.</div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
                  <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
                    <div style={{ fontWeight: 800, color: "var(--navy)" }}>Relieving Letter</div>
                    {expRelievingLetterName ? `${expRelievingLetterName}` : "No file attached yet."}
                  </div>
                  <input
                    ref={expRelievingFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={(e) => handleUploadExpEmploymentDoc(e, "relieving")}
                  />
                  <button
                    type="button"
                    className="s2-action-btn"
                    onClick={() => expRelievingFileInputRef.current?.click()}
                    disabled={uploadingExpDoc === "relieving"}
                    style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, cursor: "pointer", opacity: uploadingExpDoc === "relieving" ? 0.7 : 1 }}
                  >
                    {uploadingExpDoc === "relieving" ? "Uploading…" : expRelievingLetterName ? "Change File" : "Choose File →"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px", marginTop: 8 }}>
                  <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
                    <div style={{ fontWeight: 800, color: "var(--navy)" }}>Latest Pay Slip</div>
                    {expPayslipName ? `${expPayslipName}` : "No file attached yet."}
                  </div>
                  <input
                    ref={expPayslipFileInputRef}
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    style={{ display: "none" }}
                    onChange={(e) => handleUploadExpEmploymentDoc(e, "payslip")}
                  />
                  <button
                    type="button"
                    className="s2-action-btn"
                    onClick={() => expPayslipFileInputRef.current?.click()}
                    disabled={uploadingExpDoc === "payslip"}
                    style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, cursor: "pointer", opacity: uploadingExpDoc === "payslip" ? 0.7 : 1 }}
                  >
                    {uploadingExpDoc === "payslip" ? "Uploading…" : expPayslipName ? "Change File" : "Choose File →"}
                  </button>
                </div>
                </div>
              )}
            </div>

            <div className="s2-field">
              <label>
                Additional Certification Attachment
                <span className="s2-helper" style={{ fontWeight: 500, fontStyle: "normal" }}> (optional)</span>
              </label>
              <div className="s2-helper" style={{ marginBottom: 8 }}>
                Upload any certificate that supports your work experience (CPC, CPB, CRC, offer/relieving letter, etc.) — PDF, JPG or PNG, up to 10 MB.
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 14px" }}>
                <div style={{ fontSize: 12.5, color: "#475569", fontWeight: 600 }}>
                  {expCertDocName ? `${expCertDocName}` : "No file attached yet."}
                </div>
                <input
                  ref={expCertFileInputRef}
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  style={{ display: "none" }}
                  onChange={handleUploadExpCertDoc}
                />
                <button
                  type="button"
                  className="s2-action-btn"
                  onClick={() => expCertFileInputRef.current?.click()}
                  disabled={uploadingExpCertDoc}
                  style={{ whiteSpace: "nowrap", padding: "9px 16px", borderRadius: 8, border: "none", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, cursor: uploadingExpCertDoc ? "default" : "pointer", opacity: uploadingExpCertDoc ? 0.7 : 1 }}
                >
                  {uploadingExpCertDoc ? "Uploading…" : expCertDocName ? "Change File" : "Choose File →"}
                </button>
              </div>
            </div>
          </div>
            </>
          )}

          {/* SECTION 4 · SHIFT PREFERENCE */}
          <div className="s2-section">
            <div className="s2-section-header">
              <div className="s2-section-num">4</div>
              <div className="s2-section-title">Preferred Shift</div>
              <div className="s2-status-chip pending">PENDING · +3</div>
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
                    <div className="box">{selectedShifts.includes(sh.id) ? <i className="fa-solid fa-check" style={{ fontSize: 9 }} /> : ""}</div>
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {sh.icon && <i className={sh.icon} style={{ fontSize: 13, color: "#64748B" }} />}
                      <span>{sh.label}</span>
                    </div>
                  </div>
                ))}
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

      </div>
    </div>
  );
}
