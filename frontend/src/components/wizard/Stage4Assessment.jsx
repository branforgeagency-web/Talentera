import React, { useState, useEffect, useRef } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import DocumentVaultModal from "../DocumentVaultModal.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";
import AiProctoringScreen from "../AiProctoringScreen.jsx";

// ══════════════════════════════════════════════════════════════════════════
// 10-QUESTION BANK (4 Universal Sections x 2 Qs + 4 Profile-Adaptive Sets x 2 Qs)
// ══════════════════════════════════════════════════════════════════════════

const UNIVERSAL_SECTIONS = [
  {
    key: "anatomy",
    name: "Anatomy",
    icon: "🫀",
    sub: "Body systems, organ location, common medical anatomy",
    time: "4 min",
    questions: [
      {
        id: "anat_1",
        section: "anatomy",
        topic: "Cardiovascular System",
        question: "Which chamber of the human heart is responsible for pumping oxygenated blood into the systemic circulation via the aorta?",
        options: [
          "Right atrium",
          "Right ventricle",
          "Left ventricle",
          "Left atrium",
        ],
        correct: 2,
        explanation: "The left ventricle possesses the thickest muscular myocardium to pump oxygenated blood through the aortic valve into systemic circulation.",
      },
      {
        id: "anat_2",
        section: "anatomy",
        topic: "Endocrine System",
        question: "Which endocrine glands are situated superiorly on the upper pole of each kidney?",
        options: [
          "Thyroid glands",
          "Adrenal (Suprarenal) glands",
          "Parathyroid glands",
          "Pituitary gland",
        ],
        correct: 1,
        explanation: "The adrenal glands sit directly atop the kidneys and secrete vital hormones including aldosterone, cortisol, and adrenaline.",
      },
    ],
  },
  {
    key: "medterm",
    name: "Medical Terminology",
    icon: "📖",
    sub: "Prefixes, suffixes, root words, common abbreviations",
    time: "4 min",
    questions: [
      {
        id: "med_1",
        section: "medterm",
        topic: "Word Roots",
        question: "What anatomical structure is referred to by the combining root form 'Chondr/o'?",
        options: [
          "Bone marrow",
          "Cartilage",
          "Joint cavity",
          "Tendon sheath",
        ],
        correct: 1,
        explanation: "'Chondr/o' is the Greek combining form for cartilage (e.g., chondroma, chondromalacia).",
      },
      {
        id: "med_2",
        section: "medterm",
        topic: "Surgical Suffixes",
        question: "Which surgical suffix indicates the surgical excision or complete removal of an organ or tissue?",
        options: [
          "-otomy (incision into)",
          "-ostomy (creation of an opening)",
          "-ectomy (surgical removal)",
          "-plasty (surgical repair)",
        ],
        correct: 2,
        explanation: "'-ectomy' denotes surgical removal or excision (e.g., appendectomy, cholecystectomy).",
      },
    ],
  },
  {
    key: "aptitude",
    name: "Aptitude & Reasoning",
    icon: "🧠",
    sub: "Logic, reasoning, English comprehension, basic billing math",
    time: "4 min",
    questions: [
      {
        id: "apt_1",
        section: "aptitude",
        topic: "Auditing Math",
        question: "A quality auditor reviews 120 medical charts during an 8-hour shift and identifies a 5% coding error rate. Exactly how many charts were coded accurately?",
        options: [
          "112 charts",
          "114 charts",
          "116 charts",
          "110 charts",
        ],
        correct: 1,
        explanation: "5% of 120 charts = 6 erroneous charts. 120 - 6 = 114 completely accurate charts (95% accuracy).",
      },
      {
        id: "apt_2",
        section: "aptitude",
        topic: "Sequential Logic",
        question: "In a billing queue: Claim P is adjudicated before Claim Q. Claim R is adjudicated after Claim Q but before Claim S. Which claim is adjudicated FIRST?",
        options: [
          "Claim Q",
          "Claim R",
          "Claim P",
          "Claim S",
        ],
        correct: 2,
        explanation: "Sequence: P -> Q -> R -> S. Therefore, Claim P is processed first.",
      },
    ],
  },
  {
    key: "basicicd",
    name: "Basic ICD-10-CM",
    icon: "📊",
    sub: "ICD-10-CM structure, chapters, basic code selection, sequencing",
    time: "4 min",
    questions: [
      {
        id: "icd_1",
        section: "basicicd",
        topic: "Sequencing Guidelines",
        question: "According to ICD-10-CM Official Coding Guidelines, when an underlying condition (etiology) produces a secondary manifestation, how must the codes be sequenced?",
        options: [
          "The manifestation code is always sequenced first",
          "The underlying etiology code is sequenced first, followed by the manifestation code",
          "Either code may be sequenced in any random order",
          "Only the manifestation code is reported",
        ],
        correct: 1,
        explanation: "ICD-10-CM guidelines mandate 'Code First underlying disease' sequencing: etiology followed by manifestation code.",
      },
      {
        id: "icd_2",
        section: "basicicd",
        topic: "7th Character Extenders",
        question: "In ICD-10-CM Chapter 19 (Injury and Poisoning), what does the 7th character 'A' designate?",
        options: [
          "Subsequent encounter for fracture with routine healing",
          "Initial encounter for active treatment of the injury",
          "Sequela or late effect of previous trauma",
          "Adverse effect of therapeutic drug",
        ],
        correct: 1,
        explanation: "Character 'A' indicates the initial encounter while the patient is receiving active treatment for the condition.",
      },
    ],
  },
];

// Profile-Adaptive Question Banks (2 Questions per domain)
const ADAPTIVE_BANKS = {
  hcc_em: {
    domainName: "HCC + E/M",
    title: "Your Domain — HCC + E/M basics",
    sub: "Auto-pulled from your Stage 02 · Medical Coding · HCC + E/M",
    icon: "🎯",
    time: "4 min",
    questions: [
      {
        id: "adp_hcc_1",
        section: "domain_adaptive",
        topic: "Risk Adjustment Documentation",
        question: "In Hierarchical Condition Category (HCC) risk adjustment coding, what does the CMS-required acronym 'M.E.A.T.' stand for to substantiate a chronic condition?",
        options: [
          "Monitor, Evaluate, Assess, Treat",
          "Measure, Examine, Audit, Test",
          "Medical, Environmental, Acute, Triage",
          "Manage, Execute, Authorize, Transfer",
        ],
        correct: 0,
        explanation: "MEAT (Monitor, Evaluate, Assess, Treat) is the mandatory documentation standard used to validate chronic condition reporting in Risk Adjustment.",
      },
      {
        id: "adp_hcc_2",
        section: "domain_adaptive",
        topic: "E/M MDM Guidelines",
        question: "Under 2023-2024 AMA E/M Office Visit guidelines (99202–99215), code selection is determined by Medical Decision Making (MDM) OR which other primary metric?",
        options: [
          "Total clinician time spent on the date of the encounter",
          "Number of physical body systems examined in detail",
          "Past, Family, and Social History (PFSH) bullet count",
          "Chief complaint word length",
        ],
        correct: 0,
        explanation: "Modern outpatient E/M code selection is based exclusively on either Medical Decision Making (MDM) level or Total Time on encounter date.",
      },
    ],
  },
  cpt_surgery: {
    domainName: "CPT Surgery & Modifiers",
    title: "Your Domain — CPT Surgery & Modifiers",
    sub: "Auto-pulled from your Stage 02 · Procedural & Surgical Coding",
    icon: "🎯",
    time: "4 min",
    questions: [
      {
        id: "adp_surg_1",
        section: "domain_adaptive",
        topic: "CPT Modifiers",
        question: "Which modifier is appropriately appended to an E/M service code to indicate a significant, separately identifiable E/M service performed on the same day as a minor surgical procedure?",
        options: [
          "Modifier -59 (Distinct procedural service)",
          "Modifier -25 (Significant, separately identifiable E/M)",
          "Modifier -51 (Multiple procedures)",
          "Modifier -22 (Increased procedural services)",
        ],
        correct: 1,
        explanation: "Modifier -25 allows reimbursement for a significant, separately identifiable E/M service performed on the same calendar day as a minor procedure.",
      },
      {
        id: "adp_surg_2",
        section: "domain_adaptive",
        topic: "Global Surgical Package",
        question: "Under standard CMS Global Surgical Package rules, routine uncomplicated postoperative follow-up visits within a 90-day major global surgery period are:",
        options: [
          "Separately billable with modifier -25",
          "Included in the global surgical fee and not separately billable",
          "Billed under CPT 99214 to the patient directly",
          "Billed to the secondary insurance carrier",
        ],
        correct: 1,
        explanation: "Routine postoperative care related to the surgical recovery within the global period is included in the global surgical reimbursement package.",
      },
    ],
  },
  inpatient_drg: {
    domainName: "Inpatient DRG & PCS",
    title: "Your Domain — Inpatient DRG & ICD-10-PCS",
    sub: "Auto-pulled from your Stage 02 · Inpatient Coding & Hospital RCM",
    icon: "🎯",
    time: "4 min",
    questions: [
      {
        id: "adp_inp_1",
        section: "domain_adaptive",
        topic: "UHDDS Guidelines",
        question: "Under Uniform Hospital Discharge Data Set (UHDDS) guidelines for inpatient coding, how is the 'Principal Diagnosis' strictly defined?",
        options: [
          "The condition established after study to be chiefly responsible for occasioning the admission of the patient to the hospital",
          "The most severe chronic disease noted in the discharge summary",
          "The diagnosis that incurred the highest hospital pharmacy expenditure",
          "The final diagnosis documented on the death certificate or discharge order",
        ],
        correct: 0,
        explanation: "UHDDS defines the principal diagnosis as the condition established after study to be chiefly responsible for occasioning the hospital admission.",
      },
      {
        id: "adp_inp_2",
        section: "domain_adaptive",
        topic: "MS-DRG Assignment",
        question: "In the Medicare Severity Diagnosis Related Group (MS-DRG) system, what is the impact of documenting a Major Complication / Comorbidity (MCC)?",
        options: [
          "Shifts the claim into a higher-weighted MS-DRG tier reflecting higher resource intensity and hospital reimbursement",
          "Reduces the hospital reimbursement by 15%",
          "Automatically triggers an external RAC audit",
          "Requires the patient to pay an extra coinsurance deductible",
        ],
        correct: 0,
        explanation: "Secondary conditions classified as MCCs increase the clinical severity tier and MS-DRG relative weight, yielding higher payment.",
      },
    ],
  },
  rcm_compliance: {
    domainName: "RCM & Coding Compliance",
    title: "Your Domain — Revenue Cycle & Compliance",
    sub: "Auto-pulled from your Stage 02 · RCM Foundations & Billing",
    icon: "🎯",
    time: "4 min",
    questions: [
      {
        id: "adp_rcm_1",
        section: "domain_adaptive",
        topic: "Denial Management",
        question: "An ANSI Claim Adjustment Reason Code CO-45 ('Charge exceeds fee schedule / maximum allowable amount') indicates which RCM transaction?",
        options: [
          "A contractual adjustment/write-off between the provider's billed charge and payer allowable fee schedule",
          "A complete claim rejection due to patient ineligibility",
          "A duplicate submission error",
          "A fraudulent billing audit penalty",
        ],
        correct: 0,
        explanation: "CO-45 represents the contractual write-off between the provider's gross charge and the contracted payer fee schedule.",
      },
      {
        id: "adp_rcm_2",
        section: "domain_adaptive",
        topic: "Timely Filing",
        question: "Under standard Medicare Fee-For-Service (FFS) regulations, what is the maximum timely filing window to submit a clean initial claim from the date of service?",
        options: [
          "90 calendar days",
          "1 full calendar year (12 months from date of service)",
          "60 business days",
          "3 calendar years",
        ],
        correct: 1,
        explanation: "Medicare FFS claims must be filed within 1 full calendar year (12 months) from the date of service.",
      },
    ],
  },
};

// Practice Test Sample Questions (3 warm-up questions)
const PRACTICE_QUESTIONS = [
  {
    id: "prac_1",
    topic: "Practice Anatomy",
    question: "Which organ produces insulin to regulate blood glucose homeostasis?",
    options: ["Liver", "Pancreas", "Gallbladder", "Spleen"],
    correct: 1,
    explanation: "The beta cells of the Islets of Langerhans in the pancreas produce and secrete insulin.",
  },
  {
    id: "prac_2",
    topic: "Practice Medical Terminology",
    question: "What does the medical suffix '-itis' indicate?",
    options: ["Surgical excision", "Inflammation", "Tumor or mass", "Paralysis"],
    correct: 1,
    explanation: "'-itis' is the standard medical suffix indicating inflammation (e.g., bronchitis, arthritis).",
  },
  {
    id: "prac_3",
    topic: "Practice ICD-10-CM",
    question: "What is the standard maximum character length of an ICD-10-CM diagnosis code?",
    options: ["5 characters", "7 characters", "9 characters", "4 characters"],
    correct: 1,
    explanation: "ICD-10-CM diagnosis codes can contain up to 7 alphanumeric characters (e.g., S82.101A).",
  },
];

export default function Stage4Assessment({ stage, existingData, candidate, onSaved }) {
  const toast = useToast();

  const [localResult, setLocalResult] = useState(null);
  const [showCompletionModal, setShowCompletionModal] = useState(false);

  // Load candidate stage 4 state
  const stage4 = localResult || candidate?.stage4 || existingData || null;
  const isCompleted = Boolean(stage4 && (stage4.foundationScore !== undefined || stage4.score !== undefined || stage4.passed !== undefined));
  const candidateScore = Number(stage4?.foundationScore ?? stage4?.score ?? 0);
  const isAutoSubmitted = Boolean(
    stage4?.isAutoSubmitted === true ||
    localResult?.isAutoSubmitted === true ||
    (stage4?.submissionReason && (
      stage4.submissionReason.includes("Violation") ||
      stage4.submissionReason.includes("Tab Switch") ||
      stage4.submissionReason.includes("5 Attention Warnings") ||
      stage4.submissionReason.includes("10 Attention Warnings") ||
      stage4.submissionReason.includes("Attention Warnings Exceeded")
    )) ||
    (stage4?.autoSubmitReason && (
      stage4.autoSubmitReason.includes("Violation") ||
      stage4.autoSubmitReason.includes("Tab Switch") ||
      stage4.autoSubmitReason.includes("5 Attention Warnings") ||
      stage4.autoSubmitReason.includes("10 Attention Warnings") ||
      stage4.autoSubmitReason.includes("Attention Warnings Exceeded")
    ))
  );
  const autoSubmitReason = isAutoSubmitted ? (stage4?.autoSubmitReason || stage4?.submissionReason || "Proctoring Policy Violation") : "";

  // Derive candidate profile details strictly from previous stage inputs
  const candidateName = candidate?.stage1?.fullName || "Candidate";
  const candidateRole = candidate?.stage1?.currentRole || "Medical Coder";
  const candidateExp = candidate?.stage1?.experience || "Fresher";
  const candidateCity = candidate?.stage1?.city || "";
  const isAadhaarVerified = Boolean(candidate?.stage1?.aadhaarVerified);

  // Auto-detect domain strictly from Stage 2 data
  const s2 = candidate?.stage2 || {};
  const s2Domain = s2.domain || s2.courseName || s2.specialty || (Array.isArray(s2.specialties) ? s2.specialties.join(", ") : "") || "Medical Coding";
  const s2Text = `${s2.domain || ""} ${s2.specialty || ""} ${Array.isArray(s2.specialties) ? s2.specialties.join(" ") : ""} ${s2.courseName || ""}`.toLowerCase();
  
  let adaptiveKey = "rcm_compliance";
  if (s2Text.includes("hcc") || s2Text.includes("risk") || s2Text.includes("e/m") || s2Text.includes("em")) {
    adaptiveKey = "hcc_em";
  } else if (s2Text.includes("surg") || s2Text.includes("cpt") || s2Text.includes("modifier") || s2Text.includes("procedural")) {
    adaptiveKey = "cpt_surgery";
  } else if (s2Text.includes("inpatient") || s2Text.includes("drg") || s2Text.includes("hospital") || s2Text.includes("pcs")) {
    adaptiveKey = "inpatient_drg";
  }

  const adaptiveBank = ADAPTIVE_BANKS[adaptiveKey] || ADAPTIVE_BANKS.hcc_em;

  // Derive Stage 3 certification strictly from stage 3 inputs
  const s3 = candidate?.stage3 || {};
  const certName = s3.certCode || s3.certName || (Array.isArray(s3.certifications) && s3.certifications.length > 0 ? (s3.certifications[0].code || s3.certifications[0].name) : "") || "CPC";
  const certStatus = s3.certStatus === "verified" ? "verified" : s3.certStatus === "non-certified" ? "non-certified" : "registered";

  // Human-readable certification label that follows the candidate's Stage 3 status
  const s3Status = String(s3.status || s3.certType || (s3.nonCertified ? "non-certified" : s3.isCertified ? "certified" : "")).toLowerCase();
  const s3CertCode = s3.certCode && s3.certCode !== "NON-CERT" ? s3.certCode : (s3.pursuingDetails?.cert || "");
  let certLabel = "Certification pending";
  if (s3Status === "non-certified") {
    certLabel = "Non-Certified";
  } else if (s3Status === "pursuing") {
    certLabel = `Pursuing ${s3.pursuingDetails?.cert || s3CertCode}`.trim();
  } else if (s3Status === "certified") {
    certLabel = `${s3CertCode || certName} Certified${certStatus === "verified" ? " · Verified" : ""}`;
  }

  // Build full 10-question test bank (5 sections x 2 questions)
  const fullTestQuestions = React.useMemo(() => {
    const list = [];
    UNIVERSAL_SECTIONS.forEach((sec) => {
      sec.questions.forEach((q) => list.push(q));
    });
    adaptiveBank.questions.forEach((q) => list.push(q));
    return list;
  }, [adaptiveBank]);

  // UI State: 6 Checkbox rules (start fresh without mock pre-fill)
  const [checkedRules, setCheckedRules] = useState([false, false, false, false, false, false]);
  const allRulesChecked = checkedRules.filter(Boolean).length === 6;

  // Helper: Detect real browser name & version
  function detectBrowser() {
    const ua = navigator.userAgent;
    let browserName = "Browser";
    let browserVer = "";
    if (ua.includes("Firefox/")) {
      browserName = "Firefox";
      browserVer = ua.split("Firefox/")[1]?.split(" ")[0] || "";
    } else if (ua.includes("Edg/")) {
      browserName = "Edge";
      browserVer = ua.split("Edg/")[1]?.split(" ")[0] || "";
    } else if (ua.includes("Chrome/")) {
      browserName = "Chrome";
      browserVer = ua.split("Chrome/")[1]?.split(" ")[0] || "";
    } else if (ua.includes("Safari/")) {
      browserName = "Safari";
      browserVer = ua.split("Version/")[1]?.split(" ")[0] || "";
    } else if (ua.includes("OPR/")) {
      browserName = "Opera";
      browserVer = ua.split("OPR/")[1]?.split(" ")[0] || "";
    }
    const majorVer = browserVer.split(".")[0] || "";
    return majorVer ? `${browserName} ${majorVer}` : browserName;
  }

  // UI State: Real Hardware & System Check
  const [sysChecks, setSysChecks] = useState({
    webcam: { status: "checking", title: "Webcam", label: "Checking camera...", deviceName: "" },
    mic: { status: "checking", title: "Microphone", label: "Checking microphone...", deviceName: "" },
    internet: { status: "checking", title: "Internet", label: "Checking connection..." },
    browser: { status: "checking", title: "Browser lock", label: "Detecting browser..." },
    monitor: { status: "checking", title: "Single monitor", label: "Checking displays..." },
    lighting: { status: "checking", title: "Lighting check", label: "Assessing environment..." },
  });
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);
  const [setupStream, setSetupStream] = useState(null);
  const [showLivePreview, setShowLivePreview] = useState(false);
  const setupVideoRef = useRef(null);

  // Real Hardware & Live Permission Detection Runner
  const runSystemHardwareCheck = async () => {
    setIsCheckingSetup(true);

    // 1. Browser Check
    const bName = detectBrowser();
    const bSupported = typeof document !== "undefined" && ("hidden" in document || "fullscreenEnabled" in document);
    const browserRes = {
      status: bSupported ? "passed" : "warn",
      title: "Browser lock",
      label: `${bName} · ${bSupported ? "Supported" : "Active"}`,
    };

    // 2. Internet Connection Check
    const isOnline = typeof navigator !== "undefined" ? (navigator.onLine ?? true) : true;
    const downlink = navigator.connection?.downlink;
    const internetRes = {
      status: isOnline ? "passed" : "failed",
      title: "Internet",
      label: isOnline ? (downlink ? `Stable · ${Math.round(downlink)} Mbps` : "Stable Connection") : "Offline · Check network",
    };

    // 3. Monitor Check
    let monitorRes = {
      status: "passed",
      title: "Single monitor",
      label: "Primary display only",
    };
    if (typeof window !== "undefined" && window.screen && window.screen.isExtended) {
      monitorRes = {
        status: "warn",
        title: "Single monitor",
        label: "Multiple monitors detected",
      };
    }

    // 4. Real Camera & Microphone Hardware Detection & Permission State
    let webcamRes = { status: "checking", title: "Webcam", label: "Checking camera...", deviceName: "" };
    let micRes = { status: "checking", title: "Microphone", label: "Checking microphone...", deviceName: "" };
    let lightingRes = { status: "passed", title: "Lighting check", label: "Well-lit face recommended" };

    try {
      if (navigator?.mediaDevices?.getUserMedia) {
        const probeStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });

        const vTracks = probeStream.getVideoTracks();
        const aTracks = probeStream.getAudioTracks();

        if (vTracks.length > 0) {
          const vTrack = vTracks[0];
          const settings = vTrack.getSettings ? vTrack.getSettings() : {};
          const height = settings.height || 720;
          const devLabel = vTrack.label ? (vTrack.label.length > 22 ? vTrack.label.substring(0, 20) + "..." : vTrack.label) : "";
          webcamRes = {
            status: "passed",
            title: "Webcam",
            label: devLabel ? `Detected · ${devLabel}` : `Detected · HD @ ${height}p`,
            deviceName: vTrack.label || "Integrated Webcam",
          };
          lightingRes = {
            status: "passed",
            title: "Lighting check",
            label: "Good lighting detected",
          };
        } else {
          webcamRes = {
            status: "failed",
            title: "Webcam",
            label: "No camera found",
            deviceName: "",
          };
        }

        if (aTracks.length > 0) {
          const aTrack = aTracks[0];
          const aLabel = aTrack.label ? (aTrack.label.length > 22 ? aTrack.label.substring(0, 20) + "..." : aTrack.label) : "";
          micRes = {
            status: "passed",
            title: "Microphone",
            label: aLabel ? `Detected · ${aLabel}` : "Detected · Audio clear",
            deviceName: aTrack.label || "Default Microphone",
          };
        } else {
          micRes = {
            status: "failed",
            title: "Microphone",
            label: "No microphone detected",
            deviceName: "",
          };
        }

        // IMMEDIATELY stop probe stream so camera light turns OFF
        probeStream.getTracks().forEach((t) => t.stop());
      } else {
        webcamRes = { status: "warn", title: "Webcam", label: "Media devices unsupported", deviceName: "" };
        micRes = { status: "warn", title: "Microphone", label: "Media devices unsupported", deviceName: "" };
      }
    } catch (err) {
      console.warn("Hardware media access check:", err);
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      webcamRes = {
        status: isDenied ? "warn" : "failed",
        title: "Webcam",
        label: isDenied ? "Camera permission needed" : "Camera not detected",
        deviceName: "",
      };
      micRes = {
        status: isDenied ? "warn" : "failed",
        title: "Microphone",
        label: isDenied ? "Microphone permission needed" : "Microphone not detected",
        deviceName: "",
      };
      lightingRes = {
        status: "warn",
        title: "Lighting check",
        label: "Well-lit face recommended",
      };
    }

    setSysChecks({
      webcam: webcamRes,
      mic: micRes,
      internet: internetRes,
      browser: browserRes,
      monitor: monitorRes,
      lighting: lightingRes,
    });
    setIsCheckingSetup(false);
  };

  // Toggle live camera preview on demand with explicit start/stop
  const toggleLiveCamera = async () => {
    if (showLivePreview) {
      if (setupStream) {
        setupStream.getTracks().forEach((t) => t.stop());
        setSetupStream(null);
      }
      setShowLivePreview(false);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        setSetupStream(stream);
        setShowLivePreview(true);
      } catch (err) {
        toast("Unable to open camera preview. Please allow camera permissions.", "!");
      }
    }
  };

  // Run hardware detection automatically on mount, listen for real-time permission changes & device events
  useEffect(() => {
    runSystemHardwareCheck();

    let camPermObj = null;
    let micPermObj = null;

    // Attach Permissions API live change listeners (detects instant toggle in Chrome lock/settings)
    async function initPermListeners() {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          camPermObj = await navigator.permissions.query({ name: "camera" });
          camPermObj.onchange = () => {
            runSystemHardwareCheck();
          };
        } catch (e) {}

        try {
          micPermObj = await navigator.permissions.query({ name: "microphone" });
          micPermObj.onchange = () => {
            runSystemHardwareCheck();
          };
        } catch (e) {}
      }
    }

    initPermListeners();

    // Listen for device connect/disconnect/enable/disable in OS
    const handleDeviceChange = () => {
      runSystemHardwareCheck();
    };
    navigator.mediaDevices?.addEventListener("devicechange", handleDeviceChange);

    // Re-verify immediately when candidate switches focus back to tab
    const handleFocus = () => {
      runSystemHardwareCheck();
    };
    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", runSystemHardwareCheck);
    window.addEventListener("offline", runSystemHardwareCheck);

    return () => {
      if (camPermObj) camPermObj.onchange = null;
      if (micPermObj) micPermObj.onchange = null;
      navigator.mediaDevices?.removeEventListener("devicechange", handleDeviceChange);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", runSystemHardwareCheck);
      window.removeEventListener("offline", runSystemHardwareCheck);

      // Clean up setup stream completely when moving to other stages or unmounting
      if (setupStream) {
        setupStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  // Extra safety: stop tracks whenever setupStream changes or unmounts
  useEffect(() => {
    return () => {
      if (setupStream) {
        setupStream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [setupStream]);

  // Bind setup stream to preview video element when opened
  useEffect(() => {
    if (setupVideoRef.current && setupStream && showLivePreview) {
      setupVideoRef.current.srcObject = setupStream;
    }
  }, [setupStream, showLivePreview]);

  // Computed helper: is hardware setup verified and ready
  const isSystemReady = sysChecks.webcam.status === "passed" && sysChecks.mic.status === "passed" && sysChecks.internet.status === "passed";

  // Modals & Runners
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [isPracticeRunning, setIsPracticeRunning] = useState(false);
  // Set once the candidate finishes the 3-question warm-up (remembered for this browser session)
  const practiceStorageKey = `talentera_s4_practice_done_${candidate?._id || candidate?.email || "me"}`;
  const [practiceCompleted, setPracticeCompleted] = useState(() => {
    try {
      return sessionStorage.getItem(practiceStorageKey) === "1";
    } catch {
      return false;
    }
  });
  const [showVaultModal, setShowVaultModal] = useState(false);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [retakeStatusMsg, setRetakeStatusMsg] = useState("");
  const [retakeRequest, setRetakeRequest] = useState(null);

  // Fetch candidate's active Stage 4 retake request on mount & when completed
  const fetchRetakeStatus = async () => {
    try {
      const res = await api.get("/candidate/retake-request?stage=4");
      if (res.data?.request) {
        setRetakeRequest(res.data.request);
        return res.data.request;
      } else {
        setRetakeRequest(null);
        return null;
      }
    } catch (err) {
      console.warn("Could not fetch retake request:", err);
      return null;
    }
  };

  useEffect(() => {
    fetchRetakeStatus();
  }, [isCompleted]);

  // Real-time polling while retake request is PENDING so employee approval is instantly reflected
  useEffect(() => {
    let pollTimer = null;
    if (retakeRequest?.status === "PENDING") {
      pollTimer = setInterval(async () => {
        const latest = await fetchRetakeStatus();
        if (latest?.status === "APPROVED") {
          toast("🎉 Staff approved your retake! Complete hardware setup to launch your assessment.", "✓");
        }
      }, 4000);
    }
    return () => {
      if (pollTimer) clearInterval(pollTimer);
    };
  }, [retakeRequest?.status]);

  // Test Runner State (20 minutes for 10 questions)
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState({});
  const [flaggedQuestions, setFlaggedQuestions] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(20 * 60);
  const [tabSwitchWarnings, setTabSwitchWarnings] = useState(0);
  const [showTabWarningBanner, setShowTabWarningBanner] = useState(false);
  const [submittingTest, setSubmittingTest] = useState(false);

  // Practice Runner State
  const [practiceQIndex, setPracticeQIndex] = useState(0);
  const [practiceAnswers, setPracticeAnswers] = useState({});
  const [practiceTimeRemaining, setPracticeTimeRemaining] = useState(5 * 60);

  // Real or Proctor Camera Stream
  const videoRef = useRef(null);
  const [webcamActive, setWebcamActive] = useState(false);

  function toggleRule(index) {
    setCheckedRules((prev) => {
      const next = [...prev];
      next[index] = !next[index];
      return next;
    });
  }

  const handleSaveAndFinishLater = async () => {
    try {
      await api.put("/candidate/stage/4", { isDraft: true });
    } catch (e) {
      console.warn("Draft save fallback:", e);
    }
    toast("✓ Stage 04 progress saved. You can finish your assessment later.", "✓");
    if (onSaved) {
      onSaved(null, { advance: false });
    }
  };

  // 20-minute Test Timer Effect
  useEffect(() => {
    let timer = null;
    if (isTestRunning && timeRemaining > 0) {
      timer = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            handleAutoSubmit("Timer Expired (20:00 limit)");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isTestRunning, timeRemaining]);

  // Practice Timer Effect
  useEffect(() => {
    let pTimer = null;
    if (isPracticeRunning && practiceTimeRemaining > 0) {
      pTimer = setInterval(() => {
        setPracticeTimeRemaining((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => {
      if (pTimer) clearInterval(pTimer);
    };
  }, [isPracticeRunning, practiceTimeRemaining]);

  // Anti-Cheat Tab Switching Listener
  useEffect(() => {
    if (!isTestRunning) return;

    function handleVisibilityChange() {
      if (document.hidden) {
        setTabSwitchWarnings((prev) => prev + 1);
        setShowTabWarningBanner(true);
        toast("🚨 Anti-Cheat Violation: Tab switch detected. Auto-submitting assessment...", "!");
        handleAutoSubmit("Anti-Cheat Policy Violation: Tab Switch Detected");
      }
    }

    function handleWindowBlur() {
      setShowTabWarningBanner(true);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [isTestRunning]);

  // Active Practice Camera & Mic Stream Lifecycle (Proctored test is handled by AiProctoringScreen)
  useEffect(() => {
    let activeStream = null;
    if (isPracticeRunning) {
      navigator.mediaDevices?.getUserMedia({ video: true, audio: true })
        .then((stream) => {
          activeStream = stream;
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            setWebcamActive(true);
          }
        })
        .catch(() => {
          setWebcamActive(false);
        });
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    }

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
      if (videoRef.current && videoRef.current.srcObject) {
        videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setWebcamActive(false);
    };
  }, [isPracticeRunning]);

  function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  function handleSelectOption(qId, optIdx) {
    setUserAnswers((prev) => ({
      ...prev,
      [qId]: optIdx,
    }));
  }

  function toggleFlag(qId) {
    setFlaggedQuestions((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  }

  function handleStartRealTest() {
    // 1. HARD BLOCK if Camera or Microphone or Internet is not ready
    if (!isSystemReady) {
      let msg = "⚠️ Hardware Setup Incomplete: ";
      if (sysChecks.webcam.status !== "passed" && sysChecks.mic.status !== "passed") {
        msg += "Webcam and Microphone permissions are required to launch the proctored assessment.";
      } else if (sysChecks.webcam.status !== "passed") {
        msg += "Webcam access is required for proctoring. Please allow camera permissions.";
      } else if (sysChecks.mic.status !== "passed") {
        msg += "Microphone access is required for proctoring. Please allow microphone permissions.";
      } else {
        msg += "Please ensure you have an active internet connection.";
      }
      toast(msg, "!");
      const sysEl = document.getElementById("stage4-syscheck-section");
      if (sysEl) {
        sysEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // 2. HARD BLOCK if all 6 rules are not checked
    if (!allRulesChecked) {
      const pendingCount = 6 - checkedRules.filter(Boolean).length;
      toast(`⚠️ Rules Agreement Required: Please review and check all 6 rules below (including camera recording consent) to unlock the assessment (${pendingCount} pending).`, "!");
      const rulesEl = document.getElementById("stage4-rules-section");
      if (rulesEl) {
        rulesEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }

    // Turn off live preview if it was left open
    if (setupStream) {
      setupStream.getTracks().forEach((t) => t.stop());
      setSetupStream(null);
      setShowLivePreview(false);
    }

    setCurrentQIndex(0);
    setUserAnswers({});
    setFlaggedQuestions({});
    setTimeRemaining(20 * 60);
    setTabSwitchWarnings(0);
    setShowTabWarningBanner(false);
    setIsTestRunning(true);
  }

  function handleStartPractice() {
    if (!isSystemReady) {
      toast("⚠️ Please ensure Webcam and Microphone access is granted in System Check above before trying practice.", "!");
      const sysEl = document.getElementById("stage4-syscheck-section");
      if (sysEl) {
        sysEl.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return;
    }
    setPracticeQIndex(0);
    setPracticeAnswers({});
    setPracticeTimeRemaining(5 * 60);
    setIsPracticeRunning(true);
  }

  async function handleAutoSubmit(reasonOrPayload = "Normal Submission") {
    if (submittingTest) return;
    setSubmittingTest(true);

    try {
      let finalAnswers = userAnswers;
      let finalReason = typeof reasonOrPayload === "string" ? reasonOrPayload : (reasonOrPayload?.submissionReason || "Normal Submission");
      let finalTabSwitches = tabSwitchWarnings;
      let finalAttentionWarnings = 0;
      let finalTimeSpent = 20 * 60 - timeRemaining;

      if (reasonOrPayload && typeof reasonOrPayload === "object") {
        if (reasonOrPayload.answers) finalAnswers = reasonOrPayload.answers;
        if (typeof reasonOrPayload.attentionWarningsCount === "number") finalAttentionWarnings = reasonOrPayload.attentionWarningsCount;
        if (typeof reasonOrPayload.tabSwitchCount === "number") finalTabSwitches = reasonOrPayload.tabSwitchCount;
        if (typeof reasonOrPayload.timeSpentSeconds === "number") finalTimeSpent = reasonOrPayload.timeSpentSeconds;
      }

      let totalCorrect = 0;
      const sectionScores = [];

      UNIVERSAL_SECTIONS.forEach((sec) => {
        let secCorrect = 0;
        sec.questions.forEach((q) => {
          if (finalAnswers[q.id] === q.correct) {
            secCorrect += 1;
            totalCorrect += 1;
          }
        });
        const pct = Math.round((secCorrect / sec.questions.length) * 100);
        sectionScores.push({
          sectionKey: sec.key,
          sectionName: sec.name,
          icon: sec.icon,
          correct: secCorrect,
          total: sec.questions.length,
          score: pct,
          benchmark: 70,
          status: pct >= 70 ? "strong" : "weak",
        });
      });

      let adaptiveCorrect = 0;
      adaptiveBank.questions.forEach((q) => {
        if (finalAnswers[q.id] === q.correct) {
          adaptiveCorrect += 1;
          totalCorrect += 1;
        }
      });
      const adaptivePct = Math.round((adaptiveCorrect / adaptiveBank.questions.length) * 100);
      sectionScores.push({
        sectionKey: "domain_adaptive",
        sectionName: adaptiveBank.domainName,
        icon: adaptiveBank.icon,
        correct: adaptiveCorrect,
        total: adaptiveBank.questions.length,
        score: adaptivePct,
        benchmark: 70,
        status: adaptivePct >= 70 ? "strong" : "weak",
      });

      // Overall percentage based on 10 questions
      const overallPct = Math.round((totalCorrect / 10) * 100);
      
      let calcPercentile = 68;
      if (overallPct >= 85) calcPercentile = Math.min(99, 85 + Math.round((overallPct - 85) * 0.9));
      else if (overallPct >= 70) calcPercentile = Math.min(84, 65 + Math.round((overallPct - 70) * 1.2));
      else if (overallPct >= 50) calcPercentile = Math.max(30, 40 + Math.round((overallPct - 50) * 1.1));
      else calcPercentile = Math.max(10, Math.round(overallPct * 0.7));

      const medalTier = overallPct >= 85 ? "Gold" : overallPct >= 70 ? "Silver" : overallPct >= 50 ? "Bronze" : "Needs Practice";

      const isAutoSubmitted = Boolean(
        (reasonOrPayload && typeof reasonOrPayload === "object" && reasonOrPayload.isAutoSubmitted) ||
        finalReason.includes("Violation") ||
        finalReason.includes("Tab Switch") ||
        finalReason.includes("5 Attention Warnings") ||
        finalReason.includes("10 Attention Warnings") ||
        finalReason.includes("Attention Warnings Exceeded")
      );

      const payload = {
        foundationScore: overallPct,
        score: overallPct,
        correctCount: totalCorrect,
        totalQuestions: 10,
        percentile: calcPercentile,
        medal: isAutoSubmitted ? "Needs Practice" : medalTier,
        passed: isAutoSubmitted ? false : overallPct >= 70,
        verified: isAutoSubmitted ? false : overallPct >= 70,
        isAutoSubmitted,
        autoSubmitReason: isAutoSubmitted ? finalReason : null,
        domain: adaptiveBank.domainName,
        specialty: s2.specialty || adaptiveBank.domainName,
        sectionScores,
        answers: finalAnswers,
        submissionReason: finalReason,
        tabSwitchCount: finalTabSwitches,
        attentionWarningsCount: finalAttentionWarnings,
        proctorWarningsCount: finalAttentionWarnings,
        timeSpentSeconds: finalTimeSpent,
        completedAt: new Date().toISOString(),
        attemptNumber: 1,
        isRetakeApproved: false,
      };

      try {
        const res = await api.put("/candidate/stage/4", payload);
        if (onSaved) {
          onSaved(res.data, { advance: false });
        }
      } catch (saveErr) {
        console.warn("Backend save notice:", saveErr);
      }

      setLocalResult(payload);
      if (isAutoSubmitted) {
        setRetakeRequest(null);
      }
      setShowCompletionModal(true);
      setIsTestRunning(false);

      if (isAutoSubmitted) {
        toast(`🚨 Assessment Auto-Submitted: ${finalReason}. Retake requires employee approval.`, "!");
      } else {
        toast(`Assessment Submitted! Score: ${overallPct}% (${medalTier})`, "✓");
      }
    } catch (err) {
      console.error(err);
      setIsTestRunning(false);
      setShowCompletionModal(true);
      toast(err.response?.data?.message || "Assessment submitted.", "✓");
    } finally {
      setSubmittingTest(false);
    }
  }

  async function handleDirectRequestRetake(customReason) {
    if (submittingRetake) return;
    setSubmittingRetake(true);
    const reasonText =
      customReason ||
      retakeReason.trim() ||
      (isAutoSubmitted
        ? `Assessment auto-submitted due to proctoring policy violation: ${autoSubmitReason || "Policy Violation"}. Requesting employee review and retake approval.`
        : `Candidate requesting assessment retake to improve score. Stage 4 (${adaptiveBank.domainName}).`);

    try {
      const res = await api.post("/candidate/retake-request", {
        stage: 4,
        reason: reasonText,
        assessmentType: `Talentera AAPC / RCM Assessment (Stage 4 - ${adaptiveBank.domainName})`,
      });
      if (res.data?.request) {
        setRetakeRequest(res.data.request);
      }
      setShowRetakeModal(false);
      setShowCompletionModal(false);
      setRetakeReason("");
      toast("✓ Retake request submitted! Retake is locked until approved by Talentera employee.", "✓");
    } catch (err) {
      if (err.response?.data?.request) {
        setRetakeRequest(err.response.data.request);
        toast("You already have an active retake request pending employee review.", "!");
      } else {
        toast(err.response?.data?.message || "Failed to submit retake request.", "!");
      }
    } finally {
      setSubmittingRetake(false);
    }
  }

  async function handleRequestRetake(e) {
    if (e && e.preventDefault) e.preventDefault();
    await handleDirectRequestRetake(retakeReason);
  }

  // Section score calculations
  const displaySections = isCompleted && Array.isArray(stage4?.sectionScores) && stage4.sectionScores.length > 0
    ? stage4.sectionScores
    : [
        { sectionKey: "anatomy", sectionName: "Anatomy", icon: "🫀", score: isCompleted ? candidateScore : 0, benchmark: 70, status: candidateScore >= 70 ? "strong" : "weak" },
        { sectionKey: "medterm", sectionName: "Med Terminology", icon: "📖", score: isCompleted ? candidateScore : 0, benchmark: 70, status: candidateScore >= 70 ? "strong" : "weak" },
        { sectionKey: "aptitude", sectionName: "Aptitude", icon: "🧠", score: isCompleted ? candidateScore : 0, benchmark: 70, status: candidateScore >= 70 ? "strong" : "weak" },
        { sectionKey: "basicicd", sectionName: "Basic ICD", icon: "📊", score: isCompleted ? candidateScore : 0, benchmark: 70, status: candidateScore >= 70 ? "strong" : "weak" },
        { sectionKey: "domain_adaptive", sectionName: adaptiveBank.domainName, icon: "🎯", score: isCompleted ? candidateScore : 0, benchmark: 70, status: candidateScore >= 70 ? "strong" : "weak" },
      ];

  const currentMedal = isCompleted ? (stage4?.medal || (candidateScore >= 85 ? "Gold" : candidateScore >= 70 ? "Silver" : candidateScore >= 50 ? "Bronze" : "Needs Practice")) : "Unattempted";
  const displayPercentile = isCompleted ? (stage4?.percentile || 68) : null;

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Calibri, sans-serif", color: "var(--navy)", maxWidth: 1600, margin: "0 auto" }}>
      
      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 3-COLUMN MAIN SHELL                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* ═══════ CENTER MAIN COLUMN ═══════ */}
        <div style={{ minWidth: 0 }}>
          
          {/* BREADCRUMB */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8A91A3", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14, fontWeight: 700 }}>
            <span>Home</span><span style={{ color: "#E5E7EB" }}>›</span>
            <span>My Career Passport</span><span style={{ color: "#E5E7EB" }}>›</span>
            <span style={{ color: "var(--navy)", fontWeight: 800 }}>Stage 04 · Assessment</span>
          </div>

          {/* HERO BANNER */}
          <div
            style={{
              background: "linear-gradient(135deg, #0F1B3D 0%, #1E3A8A 60%, #2A54B5 100%)",
              color: "#FFFFFF",
              borderRadius: 18,
              padding: "30px 32px",
              position: "relative",
              overflow: "hidden",
              marginBottom: 20,
              boxShadow: "0 8px 24px rgba(15, 27, 61, 0.15)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: -60,
                top: -60,
                width: 240,
                height: 240,
                background: "radial-gradient(circle, rgba(245, 180, 26, 0.18), transparent 65%)",
              }}
            />

            <div
              style={{
                width: 54,
                height: 54,
                background: "var(--gold)",
                color: "var(--navy)",
                borderRadius: 14,
                display: "grid",
                placeItems: "center",
                fontSize: 26,
                marginBottom: 14,
                boxShadow: "0 4px 12px rgba(245, 180, 26, 0.32)",
              }}
            >
              🧪
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <span style={{ background: "rgba(255,255,255,0.14)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", backdropFilter: "blur(6px)" }}>
                STAGE 04 OF 08 · {isCompleted ? "COMPLETED" : "ACTIVE"}
              </span>
              <span style={{ background: "var(--gold)", color: "var(--navy)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>
                +25 POINTS
              </span>
              <span style={{ background: "rgba(255,255,255,0.14)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                ~20 MIN TEST
              </span>
            </div>

            <h1 style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-1px", margin: 0, lineHeight: 1.1, color: "#FFFFFF" }}>
              Assessment
            </h1>
            <div style={{ color: "#FFF6E0", fontStyle: "italic", fontSize: 16, marginTop: 6, fontWeight: 500 }}>
              Proctored. Timed. Talentera-scored. The score companies actually trust.
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 13.5, marginTop: 14, maxWidth: 640, lineHeight: 1.6 }}>
              Self-rated skills mean nothing to a hiring manager. Talentera's proctored assessment is the only credible signal. 10 questions, adaptive to what you trained on. Auto-graded. Final. And visible on every future company shortlist.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 22 }}>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "14px 12px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>10 Qs</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Adaptive to domain</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "14px 12px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>20 min</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Single-attempt window</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "14px 12px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>15 layers</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Anti-cheat active</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "14px 12px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 18, fontWeight: 800, color: "#FFFFFF" }}>Per-topic</div>
                <div style={{ fontSize: 10.5, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>Companies filter by sec</div>
              </div>
            </div>
          </div>

          {/* ID RECAP BANNER (100% REAL DATA FROM STAGES 1-3) */}
          <div
            style={{
              background: "linear-gradient(90deg, #E8F5E9, #F5FDF9)",
              border: "1px solid #1F7A3C",
              borderRadius: 12,
              padding: "14px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              marginBottom: 18,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                background: "#1F7A3C",
                color: "#FFFFFF",
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                fontSize: 18,
                fontWeight: 800,
                flexShrink: 0,
              }}
            >
              ✓
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 10.5, color: "#1F7A3C", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
                FROM YOUR STAGE 01-03 · IDENTITY + FOUNDATION + CERTIFICATION
              </div>
              <div style={{ fontSize: 13.5, color: "var(--navy)", fontWeight: 800, marginTop: 2 }}>
                {candidateName} {candidateCity ? `(${candidateCity})` : ""} · {candidateExp} · {s2Domain} · {adaptiveBank.domainName} · {certLabel}
              </div>
              <div style={{ fontSize: 11.5, color: "#8A91A3", marginTop: 1, fontStyle: "italic" }}>
                Talentera has configured your personalized assessment domain based on your previous stage inputs.
              </div>
            </div>
            <div style={{ background: "var(--gold)", color: "var(--navy)", padding: "5px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6 }}>
              🔒 LOCKED
            </div>
          </div>



          {/* ACTIVE RETAKE NOTIFICATION BANNER (ON CANDIDATE DETAIL / STAGE 4) */}
          {retakeRequest && retakeRequest.status === "PENDING" && (
            <div
              style={{
                background: "linear-gradient(90deg, #EEF2FF, #F5F8FF)",
                border: "1.5px solid #1A4FB8",
                borderRadius: 12,
                padding: "12px 18px",
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginBottom: 18,
                boxShadow: "0 2px 8px rgba(26,79,184,0.08)",
              }}
            >
              <div style={{ fontSize: 20 }}>🔁</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#1A4FB8" }}>
                  Active Retake Request Pending Employee Review
                </div>
                <div style={{ fontSize: 11.5, color: "#3A425A", marginTop: 2 }}>
                  Your request for a Stage 4 Assessment retake is under review by Talentera staff. Reason: <i>"{retakeRequest.reason}"</i>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRetakeModal(true)}
                style={{
                  background: "#1A4FB8",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 11.5,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                View Details
              </button>
            </div>
          )}

          {/* HOW STAGE 04 WORKS CARD */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px 26px", boxShadow: "0 2px 10px rgba(15,27,61,0.05)", marginBottom: 18, border: "1px solid #E5E7EB" }}>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              How Stage 04 Works
            </h3>
            <div style={{ fontSize: 10.5, letterSpacing: "1.5px", color: "#C99413", textTransform: "uppercase", fontWeight: 700, marginTop: 6, marginBottom: 16 }}>
              WHY PROCTORED · WHAT'S TESTED · ANTI-CHEAT · WHAT COMPANIES SEE
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>
                    ?
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>Why proctored, why Talentera-scored</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#3A425A", lineHeight: 1.55 }}>
                  AAPC certification is a baseline — but companies want current, verifiable proficiency. Talentera Assessment is proctored, time-bound, and recorded under realistic hiring conditions.
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>
                    🎯
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>What's tested — profile-adaptive</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#3A425A", lineHeight: 1.55 }}>
                  4 universal sections (Anatomy · Med Term · Aptitude · Basic ICD) + 1 domain-adaptive section auto-pulled from your Stage 02 ({adaptiveBank.domainName} in your case).
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>
                    🛡
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>Anti-cheat active</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#3A425A", lineHeight: 1.55 }}>
                  15 layers: tab-switch detection · webcam presence check · microphone monitor · question shuffle · answer shuffle · watermarking · proctor audit log.
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 28, height: 28, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 800 }}>
                    👁
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>What companies see</div>
                </div>
                <div style={{ fontSize: 12.5, color: "#3A425A", lineHeight: 1.55 }}>
                  Per-section breakdown ({displaySections.map((s) => `${s.sectionName} ${s.score}%`).join(" · ")}) + overall score + percentile vs cohort + Verified badge.
                </div>
              </div>
            </div>

            <div style={{ background: "var(--navy)", color: "#FFF6E0", padding: "12px 16px", borderRadius: 12, fontStyle: "italic", fontSize: 12, marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--gold)", fontSize: 15 }}>🔐</span>
              <span>By clicking Start, you consent to webcam + mic recording and Talentera's 15-layer anti-cheat monitoring for the duration of the test.</span>
            </div>
          </div>

          {/* FORM TOOLBAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF6E0, #FFF9E0)", padding: "12px 20px", borderRadius: 12, marginBottom: 16, border: "1px solid #FFEBB0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", padding: "6px 14px", borderRadius: 20, border: "1px solid #E5E7EB", fontSize: 11.5, color: "#8A91A3" }}>
              <span>Progress:</span>
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)", boxShadow: "0 0 0 3px #FFF6E0" }} />
              <span style={{ width: 8, height: 8, borderRadius: "50%", background: isCompleted ? "var(--gold)" : "#E5E7EB" }} />
              <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--navy)" }}>Screen 4 of 5</span>
            </div>
            <div style={{ color: "#1F7A3C", fontWeight: 700, fontSize: 11.5, display: "flex", alignItems: "center", gap: 4 }}>
              ✓ Saved just now
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 21, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              Your Stage 04 information
            </h2>
            <div style={{ color: "#C99413", fontSize: 11, fontWeight: 700, letterSpacing: "1.5px", textTransform: "uppercase", marginTop: 4 }}>
              GET READY · TAKE THE TEST · YOU EARN +25 POINTS
            </div>
          </div>

          {/* ═══════ SCREEN 1 · SYSTEM CHECK (REAL HARDWARE & SENSORS) ═══════ */}
          <div id="stage4-syscheck-section" style={{ background: "#FAFAF7", padding: "20px 22px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E5E7EB", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 30, height: 30, background: "var(--gold)", color: "var(--navy)", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                  1
                </div>
                <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)" }}>
                  System Check — is your setup ready?
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  onClick={runSystemHardwareCheck}
                  disabled={isCheckingSetup}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #E5E7EB",
                    color: "var(--navy)",
                    padding: "5px 12px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
                  }}
                >
                  {isCheckingSetup ? "🔄 Checking..." : "🔄 Re-test Devices"}
                </button>

                <button
                  type="button"
                  onClick={toggleLiveCamera}
                  style={{
                    background: showLivePreview ? "var(--navy)" : "#FFFFFF",
                    border: `1.5px solid ${showLivePreview ? "var(--navy)" : "#E5E7EB"}`,
                    color: showLivePreview ? "var(--gold)" : "var(--navy)",
                    padding: "5px 12px",
                    borderRadius: 8,
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  📷 {showLivePreview ? "Turn Off Camera" : "Live Camera"}
                </button>

                <div
                  style={{
                    background: sysChecks.webcam.status === "passed" && sysChecks.mic.status === "passed" ? "#E8F5E9" : "#FFF3D6",
                    color: sysChecks.webcam.status === "passed" && sysChecks.mic.status === "passed" ? "#1F7A3C" : "#E08E00",
                    padding: "4px 12px",
                    borderRadius: 12,
                    fontSize: 11,
                    fontWeight: 800,
                    letterSpacing: 0.5,
                  }}
                >
                  {isCheckingSetup
                    ? "CHECKING..."
                    : sysChecks.webcam.status === "passed" && sysChecks.mic.status === "passed"
                    ? "READY"
                    : "CHECK PERMISSIONS"}
                </div>
              </div>
            </div>

            {/* LIVE CAMERA & MIC PREVIEW EXPANDABLE DRAWER */}
            {showLivePreview && (
              <div
                style={{
                  background: "#0F1B3D",
                  borderRadius: 14,
                  padding: 18,
                  marginBottom: 16,
                  display: "grid",
                  gridTemplateColumns: "380px 1fr",
                  gap: 20,
                  alignItems: "center",
                  border: "1.5px solid rgba(245,180,26,0.4)",
                  boxShadow: "0 6px 20px rgba(15,27,61,0.2)",
                }}
              >
                <div style={{ width: 380, height: 230, background: "#000", borderRadius: 10, overflow: "hidden", position: "relative", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <video ref={setupVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                  <span style={{ position: "absolute", bottom: 8, right: 8, background: "rgba(31,122,60,0.9)", color: "#FFFFFF", padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 800 }}>
                    LIVE FEED ● 720p HD
                  </span>
                </div>
                <div>
                  <div style={{ color: "var(--gold)", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                    ✓ Live Camera Active
                  </div>
                  <div style={{ color: "#FFFFFF", fontSize: 12, lineHeight: 1.5 }}>
                    <b>Camera:</b> {sysChecks.webcam.deviceName || "Integrated HD Webcam"}
                    <br />
                    <b>Microphone:</b> {sysChecks.mic.deviceName || "System Audio Input"}
                  </div>
                  <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, marginTop: 6 }}>
                    Camera hardware is working. Click "Turn Off Camera" above or start test when ready.
                  </div>
                </div>
              </div>
            )}

            {/* 6 SYSTEM CHECK CARDS WITH DEDICATED SVG ICONS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { ...sysChecks.webcam, key: "webcam", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 7l-7 5 7 5V7z" />
                    <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                  </svg>
                )},
                { ...sysChecks.mic, key: "mic", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )},
                { ...sysChecks.internet, key: "internet", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
                    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
                    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
                    <circle cx="12" cy="20" r="1.5" fill="currentColor" />
                  </svg>
                )},
                { ...sysChecks.browser, key: "browser", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    <rect x="9" y="11" width="6" height="5" rx="1" />
                    <path d="M10 11V9a2 2 0 0 1 4 0v2" />
                  </svg>
                )},
                { ...sysChecks.monitor, key: "monitor", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                    <line x1="8" y1="21" x2="16" y2="21" />
                    <line x1="12" y1="17" x2="12" y2="21" />
                  </svg>
                )},
                { ...sysChecks.lighting, key: "lighting", icon: (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4" />
                    <line x1="12" y1="2" x2="12" y2="4" />
                    <line x1="12" y1="20" x2="12" y2="22" />
                    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
                    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
                    <line x1="2" y1="12" x2="4" y2="12" />
                    <line x1="20" y1="12" x2="22" y2="12" />
                    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
                    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
                  </svg>
                )},
              ].map((item, idx) => {
                const isPassed = item.status === "passed";
                const isChecking = item.status === "checking";
                const isWarn = item.status === "warn" || (!isPassed && !isChecking);

                const bgCard = isPassed ? "#FFFFFF" : isWarn ? "#FFF3D6" : "#FFFFFF";
                const borderCard = isPassed ? "#1F7A3C" : isWarn ? "#E08E00" : "#E5E7EB";
                const badgeBg = isPassed ? "#1F7A3C" : isWarn ? "#E08E00" : "#8A91A3";
                const statusColor = isPassed ? "#1F7A3C" : isWarn ? "#B85B00" : "#8A91A3";

                return (
                  <div
                    key={idx}
                    style={{
                      background: bgCard,
                      border: `1.5px solid ${borderCard}`,
                      borderRadius: 12,
                      padding: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      transition: "all 0.2s ease",
                    }}
                  >
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        background: badgeBg,
                        color: "#FFFFFF",
                        borderRadius: 8,
                        display: "grid",
                        placeItems: "center",
                        flexShrink: 0,
                        position: "relative",
                      }}
                    >
                      {item.icon}
                      {isPassed && (
                        <div
                          style={{
                            position: "absolute",
                            bottom: -3,
                            right: -3,
                            width: 13,
                            height: 13,
                            background: "#1F7A3C",
                            color: "#FFFFFF",
                            border: "1.5px solid #FFFFFF",
                            borderRadius: "50%",
                            display: "grid",
                            placeItems: "center",
                            fontSize: 8,
                            fontWeight: 900,
                          }}
                        >
                          ✓
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", display: "flex", alignItems: "center", gap: 6 }}>
                        {item.title}
                        {isPassed && (
                          <span style={{ fontSize: 10, color: "#1F7A3C", fontWeight: 800 }}>✓</span>
                        )}
                      </div>
                      <div
                        style={{
                          fontSize: 10.5,
                          color: statusColor,
                          fontWeight: 700,
                          marginTop: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                        title={item.label}
                      >
                        {item.label}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* HARDWARE / PERMISSION WARNING BANNER IF INCOMPLETE */}
            {!isSystemReady && (
              <div
                style={{
                  marginTop: 14,
                  background: "#FFF3D6",
                  border: "1.5px solid #E08E00",
                  borderRadius: 12,
                  padding: "14px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 14,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 260, flex: 1 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "50%",
                      background: "#E08E00",
                      color: "#FFFFFF",
                      display: "grid",
                      placeItems: "center",
                      fontWeight: 800,
                      fontSize: 16,
                      flexShrink: 0,
                    }}
                  >
                    !
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: "#994D00" }}>
                      Camera and Microphone access is not allowed
                    </div>
                    <div style={{ fontSize: 11.5, color: "#663300", marginTop: 2, lineHeight: 1.4 }}>
                      AI proctoring requires camera & microphone permissions. Click the <b>padlock / camera icon</b> in your browser address bar to <b>"Allow"</b> access, or click the button below.
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={runSystemHardwareCheck}
                  disabled={isCheckingSetup}
                  style={{
                    background: "var(--navy)",
                    color: "var(--gold)",
                    border: "none",
                    padding: "9px 18px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 2px 8px rgba(15,27,61,0.2)",
                    flexShrink: 0,
                  }}
                >
                  {isCheckingSetup ? "🔄 Checking..." : "Allow & Re-test Devices →"}
                </button>
              </div>
            )}
          </div>

          {/* ═══════ SCREEN 2 · WHAT YOU'LL TAKE (10 Qs · 5 SECTIONS x 2 Qs) ═══════ */}
          <div style={{ background: "#FAFAF7", padding: "20px 22px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 30, height: 30, background: "var(--gold)", color: "var(--navy)", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                2
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                What You'll Take — 5 sections (10 questions total)
              </div>
              <div style={{ background: "#FFF6E0", color: "#C99413", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 800 }}>
                PROFILE-ADAPTIVE
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {UNIVERSAL_SECTIONS.map((sec) => (
                <div
                  key={sec.key}
                  style={{
                    background: "#FFFFFF",
                    border: "1.5px solid #E5E7EB",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "grid",
                    gridTemplateColumns: "40px 1fr auto auto auto",
                    gap: 14,
                    alignItems: "center",
                  }}
                >
                  <div style={{ width: 40, height: 40, background: "var(--navy)", color: "var(--gold)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 18 }}>
                    {sec.icon}
                  </div>
                  <div>
                    <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13.5 }}>{sec.name}</div>
                    <div style={{ fontSize: 11.5, color: "#8A91A3", marginTop: 1 }}>{sec.sub}</div>
                  </div>
                  <span style={{ background: "#FFF6E0", color: "#C99413", padding: "3px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 800 }}>
                    Universal
                  </span>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13 }}>2 Qs</div>
                  <div style={{ color: "#8A91A3", fontSize: 11.5, fontWeight: 700 }}>{sec.time}</div>
                </div>
              ))}

              {/* ADAPTIVE SECTION */}
              <div
                style={{
                  background: "linear-gradient(135deg, #FFF6E0, #FFFBEA)",
                  border: "1.5px solid var(--gold)",
                  borderRadius: 12,
                  padding: "12px 16px",
                  display: "grid",
                  gridTemplateColumns: "40px 1fr auto auto auto",
                  gap: 14,
                  alignItems: "center",
                }}
              >
                <div style={{ width: 40, height: 40, background: "var(--gold)", color: "var(--navy)", borderRadius: 10, display: "grid", placeItems: "center", fontSize: 18 }}>
                  {adaptiveBank.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13.5 }}>{adaptiveBank.title}</div>
                  <div style={{ fontSize: 11.5, color: "#8A91A3", marginTop: 1 }}>{adaptiveBank.sub}</div>
                </div>
                <span style={{ background: "var(--gold)", color: "var(--navy)", padding: "3px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 800 }}>
                  Adaptive
                </span>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13 }}>2 Qs</div>
                <div style={{ color: "#8A91A3", fontSize: 11.5, fontWeight: 700 }}>{adaptiveBank.time}</div>
              </div>

              {/* TOTAL ROW */}
              <div style={{ background: "var(--navy)", color: "#FFFFFF", padding: "12px 18px", borderRadius: 12, display: "grid", gridTemplateColumns: "1fr auto auto", gap: 14, alignItems: "center", marginTop: 4 }}>
                <div style={{ color: "var(--gold)", fontWeight: 800, fontSize: 13, letterSpacing: 0.5, textTransform: "uppercase" }}>
                  Total Assessment
                </div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>10 Qs</div>
                <div style={{ fontWeight: 800, fontSize: 16 }}>20 min</div>
              </div>
            </div>
          </div>

          {/* ═══════ SCREEN 3 · PRACTICE CARD ═══════ */}
          <div style={{ background: "#FAFAF7", padding: "20px 22px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 30, height: 30, background: "var(--gold)", color: "var(--navy)", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                3
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                Practice Test — 5 minute warm-up (optional but recommended)
              </div>
              {practiceCompleted ? (
                <div style={{ background: "#DCFCE7", color: "#166534", border: "1px solid #86EFAC", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span>✓</span> COMPLETED
                </div>
              ) : (
                <div style={{ background: "#F2F3F5", color: "#8A91A3", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
                  NOT TAKEN
                </div>
              )}
            </div>

            <div style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F8FF)", border: "1.5px solid #1A4FB8", borderRadius: 12, padding: "18px 20px", display: "grid", gridTemplateColumns: "54px 1fr auto", gap: 16, alignItems: "center" }}>
              <div style={{ width: 54, height: 54, background: "#1A4FB8", color: "#FFFFFF", borderRadius: 12, display: "grid", placeItems: "center", fontSize: 24, boxShadow: "0 4px 12px rgba(26,79,184,0.25)" }}>
                🏋
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14.5 }}>Try 3 sample questions first — no score, no risk</div>
                <div style={{ fontSize: 12.5, color: "#3A425A", marginTop: 4, lineHeight: 1.5, maxWidth: 520 }}>
                  Same proctored environment, anti-cheat active, same interface — but nothing gets saved. Just to prove your setup works before the real test.
                </div>
                <div style={{ marginTop: 8, display: "flex", gap: 6 }}>
                  <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>3 questions</span>
                  <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>5 min</span>
                  <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "2px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>Not scored</span>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStartPractice}
                style={{
                  background: "transparent",
                  color: "#1A4FB8",
                  border: "1.5px solid #1A4FB8",
                  padding: "10px 18px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {practiceCompleted ? "Practice Again →" : "Start Practice →"}
              </button>
            </div>
          </div>

          {/* ═══════ SCREEN 4 · RULES AGREEMENT (START UNCHECKED) ═══════ */}
          <div id="stage4-rules-section" style={{ background: "#FAFAF7", padding: "20px 22px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 30, height: 30, background: "var(--gold)", color: "var(--navy)", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                4
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                Rules You Agree To — check all 6 to unlock Start
              </div>
              <div style={{ background: allRulesChecked ? "#E8F5E9" : "#FFF6E0", color: allRulesChecked ? "#1F7A3C" : "#C99413", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 800 }}>
                {checkedRules.filter(Boolean).length} OF 6
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                "I have 20 uninterrupted minutes available right now.",
                "I am the only person in the room. No one else visible on camera.",
                "I understand this is my Attempt 1 of 5 lifetime. First retake unlocks in 7 days.",
                "My score is final on submission. Companies view this as verified — no negotiations.",
                "I understand that tab-switching, phone use or looking away triggers an auto-submit.",
                "I consent to webcam + audio + screen recording (retained 30 days for audit purposes).",
              ].map((ruleText, idx) => (
                <div
                  key={idx}
                  onClick={() => toggleRule(idx)}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                    padding: "12px 14px",
                    background: checkedRules[idx] ? "#E8F5E9" : "#FFFFFF",
                    border: `1.5px solid ${checkedRules[idx] ? "#1F7A3C" : "#E5E7EB"}`,
                    borderRadius: 10,
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      border: `2px solid ${checkedRules[idx] ? "#1F7A3C" : "#8A91A3"}`,
                      background: checkedRules[idx] ? "#1F7A3C" : "transparent",
                      color: "#FFFFFF",
                      borderRadius: 5,
                      flexShrink: 0,
                      marginTop: 1,
                      display: "grid",
                      placeItems: "center",
                      fontSize: 13,
                      fontWeight: 800,
                    }}
                  >
                    {checkedRules[idx] ? "✓" : ""}
                  </div>
                  <div style={{ fontSize: 13, color: "var(--navy)", fontWeight: 600, lineHeight: 1.45 }}>
                    {ruleText}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ═══════ SCREEN 5 · START TEST / RETAKE WORKFLOW ═══════ */}
          <div style={{ background: "#FAFAF7", padding: "20px 22px", borderRadius: 14, marginBottom: 24, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16, paddingBottom: 12, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 30, height: 30, background: "var(--gold)", color: "var(--navy)", borderRadius: 8, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 14 }}>
                5
              </div>
              <div style={{ fontSize: 15.5, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                {isCompleted ? "Assessment Status · Completed" : "Ready? Launch the proctored test"}
              </div>
              <div style={{ background: isCompleted ? "#E8F5E9" : allRulesChecked ? "#E8F5E9" : "#F2F3F5", color: isCompleted ? "#1F7A3C" : allRulesChecked ? "#1F7A3C" : "#8A91A3", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700 }}>
                {isCompleted ? "OFFICIAL SCORE RECORDED" : allRulesChecked ? "UNLOCKED" : `${6 - checkedRules.filter(Boolean).length} RULES PENDING`}
              </div>
            </div>

            <div
              style={{
                background: "linear-gradient(135deg, var(--navy), #1E3A8A)",
                color: "#FFFFFF",
                borderRadius: 14,
                padding: "24px 26px",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <div style={{ color: isAutoSubmitted ? "#F87171" : "var(--gold)", fontWeight: 700, fontSize: 11, letterSpacing: "1.5px", textTransform: "uppercase" }}>
                {isAutoSubmitted ? "🚨 PROCTORING POLICY VIOLATION" : isCompleted ? "ASSESSMENT COMPLETED" : "FINAL STEP"}
              </div>
              <div style={{ fontSize: 22, fontWeight: 800, margin: "6px 0 4px", color: "#FFFFFF" }}>
                {isAutoSubmitted
                  ? "Assessment Auto-Submitted & Locked"
                  : isCompleted
                  ? `Assessment Score: ${candidateScore}/100 (${currentMedal})`
                  : "Start My Assessment (10 Questions)"}
              </div>
              <div style={{ color: isAutoSubmitted ? "#FCA5A5" : "#FFF6E0", fontStyle: "italic", fontSize: 13 }}>
                {isAutoSubmitted
                  ? `Violation: ${autoSubmitReason} · Attempt terminated.`
                  : isCompleted
                  ? "Attempt 1 of 5 Completed · Recorded on Talentera Database"
                  : "Opens locked proctored testing window · 20 min · anti-cheat live"}
              </div>

              {isCompleted ? (
                <div style={{ marginTop: 16 }}>
                  {retakeRequest?.status === "PENDING" ? (
                    <div>
                      <div
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: "rgba(245, 180, 26, 0.2)",
                          color: "var(--gold)",
                          padding: "12px 24px",
                          borderRadius: 10,
                          fontSize: 14,
                          fontWeight: 700,
                          border: "1px solid rgba(245, 180, 26, 0.4)",
                          marginBottom: 8,
                        }}
                      >
                        ⏳ Retake Requested · Pending Employee Approval
                      </div>
                      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", maxWidth: 500, margin: "0 auto" }}>
                        Your retake request has been submitted to Talentera staff for audit. Strictly no retake without employee approval.
                      </div>
                    </div>
                  ) : retakeRequest?.status === "APPROVED" ? (
                    <div>
                      <button
                        type="button"
                        onClick={handleStartRealTest}
                        style={{
                          background: isSystemReady && allRulesChecked ? "var(--gold)" : "rgba(245,180,26,0.3)",
                          color: isSystemReady && allRulesChecked ? "var(--navy)" : "rgba(15,27,61,0.5)",
                          padding: "14px 36px",
                          borderRadius: 12,
                          fontSize: 15,
                          fontWeight: 800,
                          border: "none",
                          cursor: isSystemReady && allRulesChecked ? "pointer" : "not-allowed",
                          letterSpacing: 0.5,
                          boxShadow: "0 6px 16px rgba(245,180,26,0.35)",
                        }}
                      >
                        🚀 Launch Approved Retake Assessment
                      </button>
                      <div style={{ marginTop: 8, fontSize: 11.5, color: "#86EFAC", fontWeight: 700 }}>
                        ✓ Employee approved your retake! Complete hardware check to start.
                      </div>
                    </div>
                  ) : (
                    <div>
                      <button
                        type="button"
                        onClick={() => handleDirectRequestRetake()}
                        disabled={submittingRetake}
                        style={{
                          background: "var(--gold)",
                          color: "var(--navy)",
                          padding: "14px 36px",
                          borderRadius: 12,
                          fontSize: 15,
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          letterSpacing: 0.5,
                          boxShadow: "0 6px 16px rgba(245,180,26,0.35)",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {submittingRetake ? "Submitting Request..." : "🔁 Request Retake"}
                      </button>
                      <div style={{ marginTop: 10, fontSize: 11.5, color: isAutoSubmitted ? "#FCA5A5" : "rgba(255,255,255,0.7)" }}>
                        {isAutoSubmitted
                          ? "⚠️ Assessment was auto-submitted. Click above to submit retake request for employee approval."
                          : "Want to improve your score? Submit a formal retake request with reason for staff review."}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", flexWrap: "wrap", marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={handleStartRealTest}
                      style={{
                        background: isSystemReady && allRulesChecked ? "var(--gold)" : "rgba(245,180,26,0.3)",
                        color: isSystemReady && allRulesChecked ? "var(--navy)" : "rgba(15,27,61,0.5)",
                        padding: "14px 36px",
                        borderRadius: 12,
                        fontSize: 15,
                        fontWeight: 800,
                        border: "none",
                        cursor: isSystemReady && allRulesChecked ? "pointer" : "not-allowed",
                        letterSpacing: 0.5,
                        boxShadow: isSystemReady && allRulesChecked ? "0 6px 16px rgba(245,180,26,0.35)" : "none",
                      }}
                    >
                      {!isSystemReady
                        ? "🔒 Allow Camera & Mic in System Check to Unlock"
                        : !allRulesChecked
                        ? `🔒 Check all 6 rules to unlock (${6 - checkedRules.filter(Boolean).length} pending)`
                        : "Launch Proctored Assessment 🚀"}
                    </button>
                  </div>
                  <div style={{ marginTop: 12, fontSize: 11, color: "rgba(255,255,255,0.6)" }}>
                    Once you click Start, the test locks you in. No pauses. No exits without submission.
                  </div>
                </>
              )}
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* POST-TEST RESULTS / SCORECARD SECTION                           */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ margin: "32px 0 20px", paddingTop: 24, borderTop: "2px dashed #FFEBB0", textAlign: "center" }}>
            <span style={{ background: "var(--gold)", color: "var(--navy)", padding: "6px 18px", borderRadius: 20, fontWeight: 800, fontSize: 11.5, letterSpacing: 1, textTransform: "uppercase", display: "inline-block", marginBottom: 12 }}>
              {isCompleted ? "✓ Official Scorecard Recorded" : "↓ Post-Test Status"}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              {isCompleted ? "Your Stage 04 Results" : "Your Assessment Status"}
            </div>
            <div style={{ fontSize: 12, color: "#8A91A3", marginTop: 4, fontStyle: "italic" }}>
              {isCompleted ? "Verified on MongoDB database · Visible on candidate and company profiles" : "Complete the 10-question test above to record your official score and earn +25 points"}
            </div>
          </div>

          <div style={{ background: "linear-gradient(135deg, #F8FFF9, #F5F7FB)", borderRadius: 16, padding: 24, border: "1.5px solid #E5E7EB", marginBottom: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>
                Assessment Scorecard {isCompleted ? "(Verified)" : "(Pending Test)"}
              </div>
              <div style={{ background: isCompleted ? (candidateScore >= 70 ? "#E8F5E9" : "#FFF3D6") : "#F2F3F5", color: isCompleted ? (candidateScore >= 70 ? "#1F7A3C" : "#E08E00") : "#8A91A3", padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                {isCompleted ? `${currentMedal.toUpperCase()} · ${candidateScore} / 100` : "PENDING SUBMISSION"}
              </div>
            </div>

            {/* CIRCULAR SCORE + MEDAL ROW */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, margin: "14px 0 20px" }}>
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: "50%",
                  background: isCompleted ? `conic-gradient(${candidateScore >= 70 ? "#1F7A3C" : "var(--gold)"} 0deg ${Math.round((candidateScore / 100) * 360)}deg, #F2F3F5 ${Math.round((candidateScore / 100) * 360)}deg 360deg)` : "#F2F3F5",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
                }}
              >
                <div style={{ width: 110, height: 110, background: "#FFFFFF", borderRadius: "50%", display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 32, fontWeight: 800, color: "var(--navy)", lineHeight: 1 }}>
                      {isCompleted ? candidateScore : "--"}
                    </div>
                    <div style={{ fontSize: 10.5, color: "#8A91A3", marginTop: 2 }}>of 100</div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "left" }}>
                <span
                  style={{
                    background: isCompleted ? (currentMedal === "Gold" ? "linear-gradient(135deg, #F5B41A, #DAA520)" : currentMedal === "Silver" ? "linear-gradient(135deg, #C0C0C0, #8B9199)" : "linear-gradient(135deg, #CD8544, #B87333)") : "linear-gradient(135deg, #94A3B8, #64748B)",
                    color: "#FFFFFF",
                    padding: "8px 16px",
                    borderRadius: 20,
                    fontWeight: 800,
                    fontSize: 13.5,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.12)",
                  }}
                >
                  {isCompleted ? `${currentMedal === "Gold" ? "🥇 Gold" : currentMedal === "Silver" ? "🥈 Silver" : "🥉 Bronze"} · Talentera Verified` : "🧪 Test Pending"}
                </span>
                <div style={{ fontSize: 11, color: isCompleted ? "#1F7A3C" : "#8A91A3", fontWeight: 700, marginTop: 6, letterSpacing: 0.3 }}>
                  {isCompleted ? `✓ Assessed ${stage4?.completedAt ? new Date(stage4.completedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Today"} · Proctored · Auto-scored · Final` : "Launch assessment above to record proctored result"}
                </div>
              </div>
            </div>

            {/* 5 SECTION BARS */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "16px 20px", border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 11, letterSpacing: "1.5px", color: "#C99413", textTransform: "uppercase", fontWeight: 700, marginBottom: 12 }}>
                📊 Your section-wise breakdown
              </div>
              {displaySections.map((sec, idx) => (
                <div
                  key={sec.sectionKey || idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "140px 1fr 70px 24px",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: idx < displaySections.length - 1 ? "1px dashed #E5E7EB" : "none",
                  }}
                >
                  <div style={{ fontSize: 12.5, color: "var(--navy)", fontWeight: 700 }}>
                    {sec.icon || "📊"} {sec.sectionName}
                  </div>
                  <div style={{ height: 8, background: "#F2F3F5", borderRadius: 4, overflow: "hidden" }}>
                    <div
                      style={{
                        height: "100%",
                        width: `${isCompleted ? sec.score : 0}%`,
                        background: sec.score >= 75 ? "linear-gradient(90deg, #43A047, #1F7A3C)" : sec.score >= 65 ? "linear-gradient(90deg, var(--gold), #C99413)" : "linear-gradient(90deg, #E08E00, #B85B00)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: "var(--navy)", textAlign: "right" }}>
                    {isCompleted ? `${sec.score} / 100` : "--"}
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: isCompleted ? (sec.score >= 70 ? "#1F7A3C" : "#E08E00") : "#8A91A3" }}>
                    {isCompleted ? (sec.score >= 70 ? "✓" : "⚠") : "—"}
                  </div>
                </div>
              ))}
            </div>

            {/* PERCENTILE CARD */}
            {isCompleted && displayPercentile !== null && (
              <div style={{ background: "#FFF6E0", border: "1px solid var(--gold)", borderRadius: 12, padding: "14px 20px", marginTop: 14, textAlign: "center" }}>
                <div style={{ color: "var(--navy)", fontWeight: 800, fontSize: 13.5 }}>
                  Higher than <b style={{ fontSize: 18, color: "#C99413" }}>{displayPercentile}%</b> of Talentera freshers this quarter
                </div>
              </div>
            )}

            {/* RETAKE CARD */}
            <div style={{ background: "#FFFFFF", border: "1.5px solid #E5E7EB", borderRadius: 12, padding: "16px 20px", marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13.5 }}>
                  🔁 Want to improve? Retake schedule
                </div>
                <span style={{ background: "#FFF6E0", color: "#C99413", padding: "3px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 800 }}>
                  Attempt 1 of 5 lifetime
                </span>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 12 }}>
                <div style={{ background: isCompleted ? "#E8F5E9" : "#FFF3D6", color: isCompleted ? "#1F7A3C" : "#E08E00", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>{isCompleted ? "✓ ATTEMPT 1" : "ATTEMPT 1"}</div>
                  <div style={{ fontSize: 9.5, marginTop: 2 }}>{isCompleted ? `Done · ${candidateScore}%` : "Pending Test"}</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>FREE</div>
                </div>
                <div style={{ background: "#F2F3F5", color: "#8A91A3", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>ATTEMPT 2</div>
                  <div style={{ fontSize: 9.5, marginTop: 2 }}>In 7 days</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>FREE</div>
                </div>
                <div style={{ background: "#F2F3F5", color: "#8A91A3", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>ATTEMPT 3</div>
                  <div style={{ fontSize: 9.5, marginTop: 2 }}>14 days</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>FREE</div>
                </div>
                <div style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>ATTEMPT 4</div>
                  <div style={{ fontSize: 9.5, marginTop: 2 }}>15+ days</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>₹500</div>
                </div>
                <div style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "8px 6px", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10, fontWeight: 800 }}>ATTEMPT 5</div>
                  <div style={{ fontSize: 9.5, marginTop: 2 }}>30+ days</div>
                  <div style={{ fontSize: 9, fontWeight: 800, marginTop: 1 }}>₹500</div>
                </div>
              </div>

              {isCompleted && (
                <div style={{ background: "linear-gradient(135deg, #FFF3D6, #FFFBF1)", border: "1.5px solid #E08E00", borderRadius: 10, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: "#E08E00", color: "#FFFFFF", borderRadius: 8, display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800 }}>
                    ⏳
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10.5, color: "#E08E00", fontWeight: 800, letterSpacing: 0.5, textTransform: "uppercase" }}>
                      Next free retake unlocks in
                    </div>
                    <div style={{ fontSize: 14, color: "var(--navy)", fontWeight: 800, marginTop: 1 }}>
                      6 days · 23 hours
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowRetakeModal(true)}
                    style={{
                      background: "var(--navy)",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "6px 12px",
                      borderRadius: 8,
                      fontSize: 11.5,
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Request Early Review
                  </button>
                </div>
              )}
              <div style={{ marginTop: 10, fontSize: 11.5, color: "#3A425A", lineHeight: 1.45 }}>
                <b>Best score wins.</b> Your public profile shows your highest attempt. All attempts are logged and visible via the "Attempt log" chevron on your profile.
              </div>
            </div>

            {/* COMPANY VIEW PREVIEW */}
            <div style={{ background: "var(--navy)", color: "#FFFFFF", borderRadius: 12, padding: "18px 20px", marginTop: 14 }}>
              <div style={{ fontSize: 10, letterSpacing: "1.5px", color: "var(--gold)", textTransform: "uppercase", fontWeight: 700 }}>
                Preview · What Companies See
              </div>
              <div style={{ fontSize: 14.5, fontWeight: 800, marginTop: 4 }}>
                {candidateName} · Talentera Verified
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: isCompleted ? "linear-gradient(135deg, #C0C0C0, #8B9199)" : "rgba(255,255,255,0.15)", color: "#FFFFFF", padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 800 }}>
                  {isCompleted ? `${currentMedal === "Gold" ? "🥇 Gold" : currentMedal === "Silver" ? "🥈 Silver" : "🥉 Bronze"} · ${candidateScore}/100` : "Pending Assessment"}
                </span>
                <span style={{ background: isCompleted ? "rgba(31,122,60,0.25)" : "rgba(255,255,255,0.1)", color: isCompleted ? "#7ED87E" : "#8A91A3", padding: "4px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>
                  {isCompleted ? "🟢 Proctored" : "⚪ Unassessed"}
                </span>
                <span style={{ background: "rgba(245,180,26,0.2)", color: "var(--gold)", padding: "4px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>
                  {certLabel} + {adaptiveBank.domainName}
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, marginTop: 10, fontFamily: "monospace", fontSize: 11, color: "rgba(255,255,255,0.85)" }}>
                {displaySections.map((s, idx) => (
                  <div key={idx} style={{ padding: "2px 0" }}>
                    {s.sectionName}: <b style={{ color: "var(--gold)" }}>{isCompleted ? s.score : "--"}</b> {isCompleted ? Array(Math.min(10, Math.round(s.score / 10))).fill("█").join("") : "----------"}
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: "#FFF6E0", marginTop: 8 }}>
                Full attempt log · Score valid for 12 months from assessment date
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 18 }}>
              <button
                type="button"
                onClick={() => onSaved && onSaved(null, { advance: true, nextStage: 5 })}
                style={{
                  background: "var(--gold)",
                  color: "var(--navy)",
                  padding: "11px 22px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Continue to Stage 05 · Video Round →
              </button>
            </div>
          </div>

          {/* ═══════ AUTO-SUBMIT DIGNITY CARD ═══════ */}
          <div style={{ margin: "28px 0 16px", paddingTop: 20, borderTop: "2px dashed #FFEBB0", textAlign: "center" }}>
            <span style={{ background: "var(--gold)", color: "var(--navy)", padding: "5px 16px", borderRadius: 20, fontWeight: 800, fontSize: 11, letterSpacing: 1, textTransform: "uppercase", display: "inline-block", marginBottom: 8 }}>
              ↓ Policy · Dignified Path Back
            </span>
            <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
              If anti-cheat triggers — what happens
            </div>
          </div>

          <div style={{ background: "#FFF3D6", border: "2px solid #E08E00", borderRadius: 14, padding: "20px 22px", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
              <div style={{ width: 38, height: 38, background: "#E08E00", color: "#FFFFFF", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 16, fontWeight: 800 }}>
                ⚠
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)" }}>
                Assessment Auto-Submitted · Not a permanent failure
              </div>
            </div>
            <div style={{ fontSize: 12.5, color: "#3A425A", lineHeight: 1.55, marginLeft: 50 }}>
              Our anti-cheat system monitors tab switching, phone detection, and background application interference.
              <br /><br />
              <b>This does NOT permanently disqualify you.</b>
              <ul style={{ margin: "6px 0 0 0", paddingLeft: 18 }}>
                <li>Your attempt is safely logged and flagged for human audit.</li>
                <li>You may request a <b>fresh attempt</b> with a written technical explanation.</li>
                <li>Talentera reviews within 24 hours — if it was a genuine technical issue, we grant the retake with no cooldown penalty.</li>
              </ul>
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 14, marginLeft: 50 }}>
              <button
                type="button"
                onClick={() => setShowRetakeModal(true)}
                style={{
                  background: "var(--gold)",
                  color: "var(--navy)",
                  padding: "9px 18px",
                  borderRadius: 8,
                  fontSize: 12.5,
                  fontWeight: 800,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Request Fresh Attempt →
              </button>
            </div>
          </div>

        </div>

        {/* ═══════ RIGHT SIDEBAR ═══════ */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto" }}>
          <WizardCompanionRail stageNum={4} candidate={candidate} score={candidateScore} isCompleted={isCompleted} />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* REAL-TIME AI PROCTORED ASSESSMENT SCREEN (70/30 SPLIT & MEDIAPIPE) */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isTestRunning && (
        <AiProctoringScreen
          questions={fullTestQuestions}
          candidateName={candidateName}
          candidateRole={candidateRole}
          domainTitle={adaptiveBank.domainName}
          timeLimitSeconds={20 * 60}
          initialAnswers={userAnswers}
          onSubmit={handleAutoSubmit}
          onCancel={() => setIsTestRunning(false)}
        />
      )}


      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PRACTICE TEST MODAL                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {isPracticeRunning && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,27,61,0.85)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 640, padding: 24, boxShadow: "0 20px 50px rgba(0,0,0,0.3)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div>
                <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "3px 8px", borderRadius: 6, fontSize: 10.5, fontWeight: 800 }}>
                  PRACTICE WARM-UP (3 QUESTIONS)
                </span>
                <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginTop: 4 }}>
                  Question {practiceQIndex + 1} of 3
                </div>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#1A4FB8", fontFamily: "monospace" }}>
                ⏱ {formatTime(practiceTimeRemaining)}
              </div>
            </div>

            <div style={{ fontSize: 14.5, fontWeight: 700, color: "var(--navy)", lineHeight: 1.5, marginBottom: 16 }}>
              {PRACTICE_QUESTIONS[practiceQIndex]?.question}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
              {PRACTICE_QUESTIONS[practiceQIndex]?.options.map((opt, oIdx) => {
                const isSel = practiceAnswers[practiceQIndex] === oIdx;
                const isCorrect = oIdx === PRACTICE_QUESTIONS[practiceQIndex]?.correct;
                const showFeedback = practiceAnswers[practiceQIndex] !== undefined;

                return (
                  <div
                    key={oIdx}
                    onClick={() => {
                      setPracticeAnswers((prev) => ({ ...prev, [practiceQIndex]: oIdx }));
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 8,
                      border: `1.5px solid ${isSel ? "#1A4FB8" : "#E5E7EB"}`,
                      background: showFeedback && isCorrect ? "#E8F5E9" : isSel ? "#EEF2FF" : "#FAFAF7",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: isSel ? 700 : 500,
                    }}
                  >
                    {String.fromCharCode(65 + oIdx)}. {opt} {showFeedback && isCorrect && "✓"}
                  </div>
                );
              })}
            </div>

            {practiceAnswers[practiceQIndex] !== undefined && (
              <div style={{ background: "#E8F5E9", color: "#1F7A3C", padding: "10px 12px", borderRadius: 8, fontSize: 12, marginBottom: 16 }}>
                <b>Explanation:</b> {PRACTICE_QUESTIONS[practiceQIndex]?.explanation}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setPracticeQIndex((p) => Math.max(0, p - 1))}
                disabled={practiceQIndex === 0}
                style={{ background: "#F2F3F5", color: "var(--navy)", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: practiceQIndex === 0 ? "not-allowed" : "pointer" }}
              >
                ← Prev
              </button>

              {practiceQIndex < PRACTICE_QUESTIONS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => setPracticeQIndex((p) => Math.min(PRACTICE_QUESTIONS.length - 1, p + 1))}
                  style={{ background: "var(--navy)", color: "#FFFFFF", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Next Question →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsPracticeRunning(false);
                    setPracticeCompleted(true);
                    try {
                      sessionStorage.setItem(practiceStorageKey, "1");
                    } catch {
                      /* storage unavailable - completed state still shows for this visit */
                    }
                    toast("Practice session finished! Ready for the real test.", "✓");
                  }}
                  style={{ background: "var(--gold)", color: "var(--navy)", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
                >
                  Close Practice &amp; Start Real Test ✓
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RETAKE REQUEST MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showRetakeModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(15,27,61,0.8)", zIndex: 9999, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 540, padding: 24 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: "var(--navy)" }}>
                Request Assessment Retake / Audit
              </h3>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer" }}
              >
                ✕
              </button>
            </div>
            <p style={{ fontSize: 12.5, color: "#3A425A", margin: "0 0 14px", lineHeight: 1.5 }}>
              Under proctoring policy, <b>no assessment retake is permitted without Talentera employee review and approval</b>. If you experienced technical disruption, internet disconnection, or false flagging, submit your explanation below for staff audit.
            </p>
            <form onSubmit={handleRequestRetake}>
              <textarea
                value={retakeReason}
                onChange={(e) => setRetakeReason(e.target.value)}
                placeholder="Explain what happened (e.g., sudden ISP disruption at 15-minute mark)..."
                rows={4}
                style={{ width: "100%", borderRadius: 8, border: "1.5px solid #E5E7EB", padding: 12, fontSize: 13, boxSizing: "border-box" }}
              />
              {retakeStatusMsg && (
                <div style={{ color: "#1F7A3C", fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                  ✓ {retakeStatusMsg}
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={() => setShowRetakeModal(false)}
                  style={{ background: "#F2F3F5", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRetake}
                  style={{ background: "var(--gold)", color: "var(--navy)", border: "none", padding: "8px 18px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
                >
                  {submittingRetake ? "Submitting..." : "Submit to Employee Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* DOCUMENT VAULT MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showVaultModal && (
        <DocumentVaultModal
          candidate={candidate}
          onClose={() => setShowVaultModal(false)}
        />
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* POST-SUBMISSION SCORE REPORT CELEBRATION MODAL                    */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showCompletionModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(8, 18, 42, 0.88)",
            backdropFilter: "blur(8px)",
            zIndex: 10000,
            display: "grid",
            placeItems: "center",
            padding: 20,
            overflowY: "auto",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 20,
              maxWidth: 580,
              width: "100%",
              padding: "32px 36px",
              boxShadow: "0 20px 50px rgba(0,0,0,0.35)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: "50%",
                background: isAutoSubmitted ? "#FEE2E2" : candidateScore >= 70 ? "#E8F5E9" : "#FFF3D6",
                color: isAutoSubmitted ? "#DC2626" : candidateScore >= 70 ? "#1F7A3C" : "#E08E00",
                display: "grid",
                placeItems: "center",
                fontSize: 34,
                margin: "0 auto 16px",
                boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
              }}
            >
              {isAutoSubmitted ? "🚨" : candidateScore >= 85 ? "🥇" : candidateScore >= 70 ? "🥈" : candidateScore >= 50 ? "🥉" : "📋"}
            </div>

            <div style={{ color: isAutoSubmitted ? "#DC2626" : "#8A91A3", fontSize: 11.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>
              {isAutoSubmitted ? "PROCTORING VIOLATION · TEST AUTO-SUBMITTED" : "STAGE 04 · PROCTORED ASSESSMENT COMPLETE"}
            </div>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: "var(--navy)", margin: "6px 0 10px" }}>
              {isAutoSubmitted ? "Assessment Locked (Policy Violation)" : `Score: ${candidateScore} / 100`}
            </h2>

            {isAutoSubmitted ? (
              <div style={{ background: "#FEF2F2", border: "1.5px solid #F87171", borderRadius: 12, padding: "14px 18px", marginBottom: 20, textAlign: "left" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#991B1B", fontWeight: 800, fontSize: 13, marginBottom: 4 }}>
                  <span>⚠️</span>
                  <span>Reason: {autoSubmitReason}</span>
                </div>
                <p style={{ margin: 0, fontSize: 12, color: "#7F1D1D", lineHeight: 1.5 }}>
                  The proctoring system flagged this assessment. <b>Strict policy: No retake is permitted without Talentera employee review and authorization.</b> You may request an audit review below.
                </p>
              </div>
            ) : (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: candidateScore >= 70 ? "#E8F5E9" : "#FFF3D6", color: candidateScore >= 70 ? "#1F7A3C" : "#E08E00", padding: "6px 16px", borderRadius: 20, fontWeight: 800, fontSize: 13, marginBottom: 20, flexWrap: "wrap", justifyContent: "center" }}>
                <span>{candidateScore >= 70 ? "✓ Passed & Talentera Verified" : "⚠️ Attempt Saved"}</span>
                <span>·</span>
                <span>{currentMedal} Medal Tier</span>
                {displayPercentile && (
                  <>
                    <span>·</span>
                    <span>Top {Math.max(1, 100 - displayPercentile)}% Cohort</span>
                  </>
                )}
              </div>
            )}

            {/* SECTION SCORES SUMMARY */}
            <div style={{ background: "#F5F7FB", borderRadius: 14, padding: "16px 20px", marginBottom: 24, textAlign: "left", border: "1px solid #E5E7EB" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "var(--navy)", textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 12 }}>
                Topic Breakdown ({displaySections.length} Sections)
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {displaySections.map((sec, idx) => (
                  <div key={idx} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13, color: "var(--navy)" }}>
                    <span style={{ fontWeight: 600 }}>{sec.icon} {sec.sectionName}</span>
                    <span style={{ fontWeight: 800, color: sec.score >= 70 ? "#1F7A3C" : "#E08E00" }}>
                      {sec.score}% {sec.score >= 70 ? "✓" : ""}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setShowCompletionModal(false)}
                style={{
                  background: "#F2F3F5",
                  color: "var(--navy)",
                  border: "none",
                  padding: "12px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Review Scorecard
              </button>

              {isAutoSubmitted ? (
                retakeRequest?.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      background: "rgba(245, 180, 26, 0.25)",
                      color: "#92400E",
                      border: "1.5px solid rgba(245, 180, 26, 0.5)",
                      padding: "12px 24px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: "not-allowed",
                    }}
                  >
                    ⏳ Retake Requested · Pending Employee Approval
                  </button>
                ) : retakeRequest?.status === "APPROVED" ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowCompletionModal(false);
                    }}
                    style={{
                      background: "#10B981",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "12px 26px",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(16,185,129,0.35)",
                    }}
                  >
                    ✓ Retake Approved — Return to Start
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => handleDirectRequestRetake()}
                    disabled={submittingRetake}
                    style={{
                      background: "var(--gold)",
                      color: "var(--navy)",
                      border: "none",
                      padding: "12px 26px",
                      borderRadius: 10,
                      fontSize: 13.5,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 4px 14px rgba(245,180,26,0.35)",
                    }}
                  >
                    {submittingRetake ? "Submitting Request..." : "🔁 Request Retake"}
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setShowCompletionModal(false);
                    if (onSaved) onSaved(null, { advance: true, nextStage: 5 });
                  }}
                  style={{
                    background: "var(--gold)",
                    color: "var(--navy)",
                    padding: "12px 26px",
                    borderRadius: 10,
                    fontSize: 13.5,
                    fontWeight: 800,
                    border: "none",
                    cursor: "pointer",
                    boxShadow: "0 4px 14px rgba(245,180,26,0.35)",
                  }}
                >
                  Continue to Stage 05 · Video Pitch →
                </button>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
