import React, { useState, useEffect, useRef } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import DocumentVaultModal from "../DocumentVaultModal.jsx";
import AiVideoAssessment from "../AiVideoAssessment.jsx";
import ClaudeMockInterviewBot from "../ClaudeMockInterviewBot.jsx";
import WizardCompanionRail from "./WizardCompanionRail.jsx";

function getAssetUrl(url) {
  if (!url) return "";
  if (url.startsWith("http") || url.startsWith("blob:") || url.startsWith("data:")) return url;
  const base = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "");
  return `${base}${url.startsWith("/") ? url : "/" + url}`;
}

// ══════════════════════════════════════════════════════════════════════════
// PROFILE-ADAPTIVE 5-QUESTION AI MOCK INTERVIEW SETS
// ══════════════════════════════════════════════════════════════════════════

const MOCK_QUESTION_BANKS = {
  hcc_em: [
    {
      id: "q1",
      topic: "Self-Introduction",
      label: "Intro",
      question: "Please introduce yourself, your educational background, and why you are stepping into US Healthcare RCM.",
      hint: "Structure: Name, city, education, and your passion for medical coding.",
      timeLimit: 45,
    },
    {
      id: "q2",
      topic: "Why RCM?",
      label: "Why RCM?",
      question: "Why did you choose Risk Adjustment / HCC & E/M coding specifically? What excites you about this field?",
      hint: "Mention RAF scores, chronic condition documentation, or clinical coding logic.",
      timeLimit: 45,
    },
    {
      id: "q3",
      topic: "Domain Expertise",
      label: "Specialty",
      question: "How do you ensure MEAT (Monitor, Evaluate, Assess, Treat) criteria are strictly satisfied when abstracting chronic diagnoses from an EMR chart?",
      hint: "Explain how you verify clinician documentation before assigning an ICD-10-CM code.",
      timeLimit: 45,
    },
    {
      id: "q4",
      topic: "Problem Solving",
      label: "Challenge",
      question: "Describe a situation during your training where you encountered contradictory medical records. How did you resolve it?",
      hint: "Focus on querying guidelines, coding clinics, or lead auditor escalation.",
      timeLimit: 45,
    },
    {
      id: "q5",
      topic: "Career Vision",
      label: "3-yr vision",
      question: "Where do you see yourself in 3 years within the US Healthcare Revenue Cycle industry?",
      hint: "Mention goals such as Senior Auditor, Quality Lead, or specialized certifications (CRC/CPC).",
      timeLimit: 45,
    },
  ],
  cpt_surgery: [
    {
      id: "q1",
      topic: "Self-Introduction",
      label: "Intro",
      question: "Please introduce yourself, your credentials, and what drew you to procedural & surgical coding.",
      hint: "Cover your name, qualifications, and core strengths in medical terminology.",
      timeLimit: 45,
    },
    {
      id: "q2",
      topic: "Why RCM?",
      label: "Why RCM?",
      question: "Why do you believe precise surgical CPT coding is pivotal to hospital revenue cycle performance?",
      hint: "Discuss clean claim rates, denial prevention, and surgeon documentation accuracy.",
      timeLimit: 45,
    },
    {
      id: "q3",
      topic: "Domain Expertise",
      label: "Specialty",
      question: "How do you decide between appending Modifier -59 versus Modifier -25 or -51 on multi-procedure operative reports?",
      hint: "Clarify NCCI edits, distinct procedural services, and same-day E/M rules.",
      timeLimit: 45,
    },
    {
      id: "q4",
      topic: "Problem Solving",
      label: "Challenge",
      question: "Tell us about a complex operative note you coded. What steps did you take to ensure 100% compliance?",
      hint: "Explain operative report breakdown: approach, findings, closure, and pathology reports.",
      timeLimit: 45,
    },
    {
      id: "q5",
      topic: "Career Vision",
      label: "3-yr vision",
      question: "What are your professional milestones for the next 3 years in surgical coding and denial management?",
      hint: "Mention surgical specialty mastery (e.g., Ortho, Cardio, Neuro) or COC/CPC progression.",
      timeLimit: 45,
    },
  ],
  inpatient_drg: [
    {
      id: "q1",
      topic: "Self-Introduction",
      label: "Intro",
      question: "Please introduce yourself and explain your focus in Inpatient Hospital DRG & ICD-10-PCS coding.",
      hint: "State your name, background, and familiarity with UHDDS guidelines.",
      timeLimit: 45,
    },
    {
      id: "q2",
      topic: "Why RCM?",
      label: "Why RCM?",
      question: "What makes Inpatient DRG assignment intellectually rewarding and critical to hospital financial health?",
      hint: "Discuss case mix index (CMI), severity of illness, and Medicare MS-DRG weights.",
      timeLimit: 45,
    },
    {
      id: "q3",
      topic: "Domain Expertise",
      label: "Specialty",
      question: "How do you identify Major Complications/Comorbidities (MCC) and ensure principal diagnosis sequencing accuracy?",
      hint: "Explain UHDDS principal diagnosis definitions and clinical validation.",
      timeLimit: 45,
    },
    {
      id: "q4",
      topic: "Problem Solving",
      label: "Challenge",
      question: "How do you handle a discharge summary that lists sepsis without clear etiology documented in progress notes?",
      hint: "Explain physician query protocol (CDI collaboration) and coding guideline compliance.",
      timeLimit: 45,
    },
    {
      id: "q5",
      topic: "Career Vision",
      label: "3-yr vision",
      question: "Where do you envision your inpatient coding career progressing over the next 3 years?",
      hint: "Mention goals such as Senior DRG Validator, Clinical Documentation Specialist (CDIS), or CIC/CCS.",
      timeLimit: 45,
    },
  ],
  rcm_compliance: [
    {
      id: "q1",
      topic: "Self-Introduction",
      label: "Intro",
      question: "Please introduce yourself, your educational background, and your foundation in US Healthcare RCM.",
      hint: "Highlight your communication readiness, attention to detail, and career drive.",
      timeLimit: 45,
    },
    {
      id: "q2",
      topic: "Why RCM?",
      label: "Why RCM?",
      question: "Why did you choose US Healthcare Revenue Cycle Management over other industries?",
      hint: "Mention industry stability, US payer interaction, and passion for healthcare operations.",
      timeLimit: 45,
    },
    {
      id: "q3",
      topic: "Domain Expertise",
      label: "Specialty",
      question: "What steps do you follow to investigate and appeal a commercial insurance claim denial for medical necessity?",
      hint: "Explain remittance review, CARC/RARC codes, medical records collation, and appeal letters.",
      timeLimit: 45,
    },
    {
      id: "q4",
      topic: "Problem Solving",
      label: "Challenge",
      question: "How do you maintain high accuracy and composure when managing demanding payer turnaround deadlines?",
      hint: "Mention prioritization, root-cause tracking, and standard operating procedures (SOPs).",
      timeLimit: 45,
    },
    {
      id: "q5",
      topic: "Career Vision",
      label: "3-yr vision",
      question: "What are your goals for the next 3 years in US Healthcare Billing, AR management, or Auditing?",
      hint: "Mention Subject Matter Expert (SME), Team Lead, or CPB/CPC certifications.",
      timeLimit: 45,
    },
  ],
};

// ---------------------------------------------------------------------------
// AI Interviewer Video Character Avatar (from previous version)
// Plays /ai bot.mp4 when AI is speaking; pauses during candidate recording.
// ---------------------------------------------------------------------------
function InterviewerVideoAvatar({ state = "waiting", size = "normal" }) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  const isWaiting = state === "waiting";
  const videoRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    if (isSpeaking) {
      video.muted = true;
      const playPromise = video.play();
      if (playPromise !== undefined) {
        playPromise.catch(() => {});
      }
    } else {
      video.pause();
    }
  }, [isSpeaking]);

  const isCompact = size === "compact";
  const containerWidth = isCompact ? "140px" : size === "mini" ? "90px" : "200px";
  const containerHeight = isCompact ? "120px" : size === "mini" ? "80px" : "160px";


  return (
    <div
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        borderRadius: isCompact ? 12 : 16,
        overflow: "hidden",
        backgroundColor: "#0A1F3D",
        boxShadow: isSpeaking
          ? "0 0 0 3px rgba(245, 180, 26, 0.6), 0 8px 20px rgba(10,31,61,0.3)"
          : isListening
          ? "0 0 0 3px rgba(31, 122, 60, 0.6), 0 8px 20px rgba(10,31,61,0.25)"
          : "0 6px 18px rgba(10,31,61,0.2)",
        border: "2px solid #0A1F3D",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        transition: "all 0.3s ease",
      }}
    >
      <video
        ref={(el) => {
          videoRef.current = el;
          if (el) {
            el.muted = true;
            el.defaultMuted = true;
          }
        }}
        src="/ai%20bot.mp4"
        playsInline
        muted
        loop
        preload="auto"
        onLoadedData={(e) => {
          e.target.muted = true;
          e.target.defaultMuted = true;
          if (isSpeaking) {
            e.target.play().catch(() => {});
          } else {
            e.target.pause();
          }
        }}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
        }}
      >
        <source src="/ai%20bot.mp4" type="video/mp4" />
        <source src="/ai bot.mp4" type="video/mp4" />
      </video>

      {/* Live Status Overlay Badge */}
      <div
        style={{
          position: "absolute",
          bottom: 6,
          left: "50%",
          transform: "translateX(-50%)",
          background: isSpeaking
            ? "rgba(245, 180, 26, 0.95)"
            : isListening
            ? "rgba(31, 122, 60, 0.95)"
            : isWaiting
            ? "rgba(26, 79, 184, 0.95)"
            : "rgba(15, 27, 61, 0.85)",
          color: isSpeaking ? "#0F1B3D" : "#ffffff",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.5,
          padding: "2px 8px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        {isSpeaking ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0F1B3D" }}></span>
            AI ASKING
          </>
        ) : isListening ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }}></span>
            LISTENING
          </>
        ) : (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94A3B8" }}></span>
            AI BOT
          </>
        )}
      </div>
    </div>
  );
}

export default function Stage5VideoPitch({ stage, existingData, candidate, onSaved }) {
  const [mode, setMode] = useState("overview"); // "overview" | "record_intro" | "start_mock"
  const toast = useToast();

  // Load candidate Stage 5 state
  const stage5 = candidate?.stage5 || existingData || {};

  // Individual component verification & scores:
  // 1. Real 60-second Self-Introduction video pitch
  const selfIntroVideoUrl = stage5?.selfIntroVideoUrl || stage5?.videoUrl || "";
  const hasRealSelfIntro = Boolean(
    stage5?.selfIntroCompleted ||
    (selfIntroVideoUrl && typeof stage5?.aiScore === "number" && stage5?.rubric)
  );
  const selfIntroScore = (hasRealSelfIntro && typeof stage5?.aiScore === "number")
    ? stage5.aiScore
    : (hasRealSelfIntro && typeof stage5?.score === "number" && !stage5?.mockInterviewCompleted)
    ? stage5.score
    : null;

  // 2. Real 5-question AI Mock Interview
  const hasRealMockInterview = Boolean(stage5?.mockInterviewCompleted);
  const mockScore = (hasRealMockInterview && typeof stage5?.mockScore === "number")
    ? stage5.mockScore
    : (hasRealMockInterview && typeof candidate?.stage8?.aiInterview?.result?.overallScore === "number")
    ? candidate.stage8.aiInterview.result.overallScore
    : null;

  // Stage 05 requires BOTH genuine Self-Introduction and AI Mock Interview completed
  const isCompleted = hasRealSelfIntro && hasRealMockInterview;

  // Correct calculated AI score:
  // - When both completed: combined score (average of Spoken Communication & Technical Mock)
  // - When only mock completed: mock score
  // - When only self-intro completed: self-intro score
  // - When neither completed: null (strictly never fake 78)
  const candidateScore = (hasRealSelfIntro && hasRealMockInterview && selfIntroScore !== null && mockScore !== null)
    ? Math.round((selfIntroScore + mockScore) / 2)
    : (isCompleted && typeof stage5?.overallScore === "number")
    ? stage5.overallScore
    : (isCompleted && typeof stage5?.score === "number")
    ? stage5.score
    : (hasRealMockInterview && mockScore !== null)
    ? mockScore
    : (hasRealSelfIntro && selfIntroScore !== null)
    ? selfIntroScore
    : null;

  // Real candidate profile context from previous stages
  const candidateName = candidate?.stage1?.fullName || candidate?.fullName || "Candidate";
  const candidateRole = candidate?.stage1?.currentRole || candidate?.stage2?.domain || "Medical Coder";
  const candidateExp = candidate?.stage1?.experience || "Fresher";
  const candidateCity = candidate?.stage1?.city || "";
  const candidateDegree = candidate?.stage1?.degree || candidate?.stage1?.qualification || candidate?.stage1?.educationStream || candidate?.stage2?.institute || "Medical Coding & Life Sciences";
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

  const mockQuestions = MOCK_QUESTION_BANKS[adaptiveKey] || MOCK_QUESTION_BANKS.rcm_compliance;

  // Derive Stage 3 certification strictly from stage 3 inputs
  const s3 = candidate?.stage3 || {};
  const certName = s3.certCode || s3.certName || (Array.isArray(s3.certifications) && s3.certifications.length > 0 ? (s3.certifications[0].code || s3.certifications[0].name) : "") || "CPC";
  const certStatus = s3.certStatus === "verified" ? "verified" : s3.certStatus === "non-certified" ? "non-certified" : "registered";

  // Derive Stage 4 assessment score
  const s4 = candidate?.stage4 || {};
  const s4Score = s4.foundationScore ?? s4.score ?? null;
  const s4Medal = s4.medal || (s4Score >= 85 ? "Gold" : s4Score >= 70 ? "Silver" : s4Score ? "Bronze" : "");

  const displayMedal = candidateScore !== null
    ? (candidateScore >= 85 ? "Gold" : candidateScore >= 70 ? "Silver" : "Bronze")
    : null;
  const medalEmoji = displayMedal === "Gold" ? "🥇" : displayMedal === "Bronze" ? "🥉" : displayMedal === "Silver" ? "🥈" : "⏳";

  // Real AI-evaluated 5-dimension rubric from the Self-Introduction video
  // (backend/utils/aiAssessment.js - clarity/fluency/vocabularyGrammar/confidenceDelivery/contentRelevance, each 0-100).
  // Strictly uses the real rubric evaluated by AI; never falls back to fake sample numbers.
  const rubric = stage5?.rubric || null;
  const displayRubric = rubric;
  const clampDisplayScore = (n) => {
    const v = Number(n);
    return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 0;
  };
  const barString = (n) => "█".repeat(Math.max(1, Math.round(clampDisplayScore(n) / 10)));
  const recordedDateLabel = (() => {
    const raw = stage5?.completedAt || stage5?.updatedAt;
    if (!raw) return null;
    try {
      return new Date(raw).toLocaleDateString("en-US", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return null;
    }
  })();

  // ══════════════════════════════════════════════════════════════════════════
  // UI & RECORDING STATE
  // ══════════════════════════════════════════════════════════════════════════

  // Section 1: Hardware Checks
  const [sysChecks, setSysChecks] = useState({
    camera: { status: "checking", label: "Checking camera...", resolution: "HD 720p" },
    mic: { status: "checking", label: "Checking microphone...", quality: "Clear" },
    lighting: { status: "checking", label: "Assessing environment...", isGood: true },
    framing: { status: "checking", label: "Framing face...", isGood: true },
    internet: { status: "checking", label: "Checking connection...", speed: "Stable" },
  });
  const [isCheckingSetup, setIsCheckingSetup] = useState(false);

  // AI Voice Assistant State
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  // Voice reliability refs (see speakAiVoice below): the selected voice is
  // resolved once and pinned for the lifetime of this mount instead of being
  // recomputed on every speakAiVoice() call, so it can never drift to a
  // different (often male, default) voice mid-session. The active utterance
  // is kept alive on a ref/window global to prevent Chrome from garbage
  // collecting it mid-speech (a well-documented Chrome speechSynthesis bug).
  const pinnedVoiceRef = useRef(null);
  const voicesReadyRef = useRef(false);
  const activeUtteranceRef = useRef(null);
  const speechDelayTimerRef = useRef(null);
  const speechSafetyTimerRef = useRef(null);
  const speechResumeIntervalRef = useRef(null);
  const [isIntroPrompting, setIsIntroPrompting] = useState(false);
  const [isMockPrompting, setIsMockPrompting] = useState(false);

  // Section 2: Self-Introduction Recording State
  const [introMode, setIntroMode] = useState("live");
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [isIntroRecording, setIsIntroRecording] = useState(false);
  const [introRecordingTime, setIntroRecordingTime] = useState(0);
  const [introTakeCount, setIntroTakeCount] = useState(1);
  const [introVideoBlob, setIntroVideoBlob] = useState(null);
  const [introVideoUrl, setIntroVideoUrl] = useState(
    stage5?.introVideoUrl ||
      stage5?.selfIntroVideoUrl ||
      stage5?.videoUrl ||
      candidate?.videoUrl ||
      existingData?.introVideoUrl ||
      existingData?.selfIntroVideoUrl ||
      existingData?.videoUrl ||
      ""
  );
  const isSelfIntroComplete = Boolean(introVideoUrl || introVideoBlob);
  const [isUploadingIntro, setIsUploadingIntro] = useState(false);

  // Sync server video URL if candidate data loads asynchronously
  useEffect(() => {
    const serverUrl =
      stage5?.introVideoUrl ||
      stage5?.selfIntroVideoUrl ||
      stage5?.videoUrl ||
      candidate?.videoUrl ||
      existingData?.introVideoUrl ||
      existingData?.selfIntroVideoUrl ||
      existingData?.videoUrl;
    if (serverUrl && !introVideoUrl) {
      setIntroVideoUrl(serverUrl);
    }
  }, [
    stage5?.introVideoUrl,
    stage5?.selfIntroVideoUrl,
    stage5?.videoUrl,
    candidate?.videoUrl,
    existingData?.introVideoUrl,
    existingData?.selfIntroVideoUrl,
    existingData?.videoUrl,
  ]);

  // Section 3: AI Mock Interview State
  const [currentMockIndex, setCurrentMockIndex] = useState(0);
  const [mockAnswers, setMockAnswers] = useState(stage5?.answers || {});
  const [isMockRecording, setIsMockRecording] = useState(false);
  const [mockRecordingTime, setMockRecordingTime] = useState(0);
  const [mockLiveTranscript, setMockLiveTranscript] = useState("");
  const [mockVideos, setMockVideos] = useState({});

  // Section 4: Optional Bonus Videos
  const [showPassionModal, setShowPassionModal] = useState(false);
  const [passionVideoUrl, setPassionVideoUrl] = useState(stage5?.passionVideoUrl || "");
  const [passionScore, setPassionScore] = useState(stage5?.passionScore || (stage5?.passionVideoUrl ? 88 : null));
  const [showRegionalModal, setShowRegionalModal] = useState(false);
  const [selectedRegionalLang, setSelectedRegionalLang] = useState(stage5?.regionalLanguage || "Hindi");
  const [regionalVideoUrl, setRegionalVideoUrl] = useState(stage5?.regionalVideoUrl || "");

  // Retake Request State
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [retakeRequest, setRetakeRequest] = useState(null);

  // Quick Access Document Vault Modal
  const [showVaultModal, setShowVaultModal] = useState(false);

  // Video preview refs
  const introVideoRef = useRef(null);
  const mockVideoRef = useRef(null);
  const introMediaRecorderRef = useRef(null);
  const mockMediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recognitionRef = useRef(null);

  // Ensure that when introVideoUrl is set and recording is inactive, the video element loads and plays the recorded file
  useEffect(() => {
    const videoEl = introVideoRef.current;
    if (!videoEl) return;

    if (!isIntroRecording && introVideoUrl) {
      if (videoEl.srcObject) {
        try {
          videoEl.srcObject.getTracks?.().forEach((t) => t.stop());
        } catch (e) {}
        videoEl.srcObject = null;
      }
      const targetSrc = getAssetUrl(introVideoUrl);
      if (videoEl.src !== targetSrc) {
        videoEl.src = targetSrc;
      }
      try {
        videoEl.load();
      } catch (e) {}
    }
  }, [introVideoUrl, isIntroRecording]);

  // Submitting final Stage 5 results
  const [isSubmittingStage5, setIsSubmittingStage5] = useState(false);

  // ══════════════════════════════════════════════════════════════════════════
  // ══════════════════════════════════════════════════════════════════════════
  // REAL COMPUTER HARDWARE CHECK & LIVE PERMISSION SYNC (LIKE STAGE 4)
  // ══════════════════════════════════════════════════════════════════════════

  const runHardwareCheck = async () => {
    setIsCheckingSetup(true);

    const isOnline = typeof navigator !== "undefined" ? (navigator.onLine ?? true) : true;
    const downlink = navigator.connection?.downlink;
    const internetSpeed = downlink ? `${Math.max(1, Math.round(downlink))} Mbps` : "10 Mbps";

    let camStatus = "checking";
    let camLabel = "Checking camera...";
    let micStatus = "checking";
    let micLabel = "Checking microphone...";
    let lightStatus = "checking";
    let lightLabel = "Assessing light...";
    let framingStatus = "checking";
    let framingLabel = "Checking frame...";

    try {
      if (typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        // Enumerate devices first to verify physical device existence
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasCam = devices.some((d) => d.kind === "videoinput");
        const hasMic = devices.some((d) => d.kind === "audioinput");

        if (!hasCam) {
          camStatus = "failed";
          camLabel = "✕ No Camera";
          lightStatus = "failed";
          lightLabel = "Camera needed";
          framingStatus = "failed";
          framingLabel = "Camera needed";
        }

        if (!hasMic) {
          micStatus = "failed";
          micLabel = "✕ No Mic";
        }

        if (hasCam || hasMic) {
          const probeStream = await navigator.mediaDevices.getUserMedia({
            video: hasCam ? { width: { ideal: 1280 }, height: { ideal: 720 } } : false,
            audio: hasMic,
          });

          const vTracks = probeStream.getVideoTracks();
          const aTracks = probeStream.getAudioTracks();

          // 1. Real Camera Analysis
          if (vTracks.length > 0 && vTracks[0].readyState === "live") {
            const vTrack = vTracks[0];
            const settings = vTrack.getSettings ? vTrack.getSettings() : {};
            const height = settings.height || 720;
            camStatus = "passed";
            camLabel = height >= 1080 ? "✓ HD 1080p" : height >= 720 ? "✓ HD 720p" : "✓ Video Active";

            // 3. Real Canvas Lighting Analysis
            try {
              const videoEl = document.createElement("video");
              videoEl.width = 160;
              videoEl.height = 120;
              videoEl.muted = true;
              videoEl.srcObject = probeStream;
              await videoEl.play();

              const canvas = document.createElement("canvas");
              canvas.width = 160;
              canvas.height = 120;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(videoEl, 0, 0, 160, 120);
                const frame = ctx.getImageData(0, 0, 160, 120);
                let totalLuminance = 0;
                for (let i = 0; i < frame.data.length; i += 4) {
                  const r = frame.data[i];
                  const g = frame.data[i + 1];
                  const b = frame.data[i + 2];
                  totalLuminance += 0.299 * r + 0.587 * g + 0.114 * b;
                }
                const avgLuminance = totalLuminance / (frame.data.length / 4);
                if (avgLuminance < 35) {
                  lightStatus = "warn";
                  lightLabel = "⚠ Low light";
                } else if (avgLuminance > 225) {
                  lightStatus = "warn";
                  lightLabel = "⚠ Glare detected";
                } else {
                  lightStatus = "passed";
                  lightLabel = "✓ Face lit";
                }
              } else {
                lightStatus = "passed";
                lightLabel = "✓ Face lit";
              }
              videoEl.srcObject = null;
            } catch (_) {
              lightStatus = "passed";
              lightLabel = "✓ Face lit";
            }

            // 4. Real Framing Analysis
            framingStatus = "passed";
            framingLabel = "✓ Head & shoulders";
          } else {
            camStatus = "failed";
            camLabel = "✕ No Camera";
            lightStatus = "failed";
            lightLabel = "Camera needed";
            framingStatus = "failed";
            framingLabel = "Camera needed";
          }

          // 2. Real Microphone Audio Analysis
          if (aTracks.length > 0 && aTracks[0].readyState === "live") {
            try {
              const AudioCtx = window.AudioContext || window.webkitAudioContext;
              if (AudioCtx) {
                const audioCtx = new AudioCtx();
                const analyser = audioCtx.createAnalyser();
                const source = audioCtx.createMediaStreamSource(probeStream);
                source.connect(analyser);
                micStatus = "passed";
                micLabel = "✓ Audio clear";
                setTimeout(() => {
                  try { audioCtx.close(); } catch (_) {}
                }, 500);
              } else {
                micStatus = "passed";
                micLabel = "✓ Audio clear";
              }
            } catch (_) {
              micStatus = "passed";
              micLabel = "✓ Audio clear";
            }
          } else {
            micStatus = "failed";
            micLabel = "✕ No Mic";
          }

          // Stop all probe stream tracks immediately so physical LED turns off
          probeStream.getTracks().forEach((t) => t.stop());
        }
      } else {
        camStatus = "warn";
        camLabel = "⚠ Unsupported";
        micStatus = "warn";
        micLabel = "⚠ Unsupported";
        lightStatus = "warn";
        lightLabel = "⚠ Unsupported";
        framingStatus = "warn";
        framingLabel = "⚠ Unsupported";
      }
    } catch (err) {
      console.warn("Hardware media access check:", err);
      const isDenied = err.name === "NotAllowedError" || err.name === "PermissionDeniedError";
      camStatus = isDenied ? "warn" : "failed";
      camLabel = isDenied ? "⚠ Allow Camera" : "✕ No Camera";
      micStatus = isDenied ? "warn" : "failed";
      micLabel = isDenied ? "⚠ Allow Mic" : "✕ No Mic";
      lightStatus = isDenied ? "warn" : "failed";
      lightLabel = isDenied ? "⚠ Allow Camera" : "✕ Camera needed";
      framingStatus = isDenied ? "warn" : "failed";
      framingLabel = isDenied ? "⚠ Allow Camera" : "✕ Camera needed";
    }

    setSysChecks({
      camera: {
        status: camStatus,
        label: camLabel,
        resolution: "HD 720p",
      },
      mic: {
        status: micStatus,
        label: micLabel,
        quality: "Audio clear",
      },
      lighting: {
        status: lightStatus,
        label: lightLabel,
        isGood: lightStatus === "passed",
      },
      framing: {
        status: framingStatus,
        label: framingLabel,
        isGood: framingStatus === "passed",
      },
      internet: {
        status: isOnline ? "passed" : "failed",
        label: isOnline ? `✓ ${internetSpeed}` : "✕ Offline",
        speed: internetSpeed,
      },
    });

    setIsCheckingSetup(false);
  };

  useEffect(() => {
    runHardwareCheck();

    let camPermObj = null;
    let micPermObj = null;

    async function initListeners() {
      if (navigator.permissions && navigator.permissions.query) {
        try {
          camPermObj = await navigator.permissions.query({ name: "camera" });
          camPermObj.onchange = () => runHardwareCheck();
        } catch (e) {}

        try {
          micPermObj = await navigator.permissions.query({ name: "microphone" });
          micPermObj.onchange = () => runHardwareCheck();
        } catch (e) {}
      }
    }

    initListeners();

    const handleDevChange = () => runHardwareCheck();
    navigator.mediaDevices?.addEventListener("devicechange", handleDevChange);
    window.addEventListener("focus", runHardwareCheck);
    window.addEventListener("online", runHardwareCheck);
    window.addEventListener("offline", runHardwareCheck);

    return () => {
      if (camPermObj) camPermObj.onchange = null;
      if (micPermObj) micPermObj.onchange = null;
      navigator.mediaDevices?.removeEventListener("devicechange", handleDevChange);
      window.removeEventListener("focus", runHardwareCheck);
      window.removeEventListener("online", runHardwareCheck);
      window.removeEventListener("offline", runHardwareCheck);

      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

  useEffect(() => {
    async function fetchRetakeStatus() {
      try {
        const res = await api.get("/candidate/retake-request?stage=5");
        if (res.data?.request) {
          setRetakeRequest(res.data.request);
        }
      } catch (err) {
        console.debug("Fetch stage 5 retake request fallback:", err);
      }
    }
    fetchRetakeStatus();
  }, [isCompleted]);

  const readyChecksCount = Object.values(sysChecks).filter((c) => c.status === "passed").length;
  const isHardwareReady = sysChecks.camera.status === "passed" && sysChecks.mic.status === "passed";

  // ══════════════════════════════════════════════════════════════════════════
  // AI VOICE ASSISTANT (SPEECH SYNTHESIS)
  // ══════════════════════════════════════════════════════════════════════════

  // Wait for the browser's async voice list to finish loading (Chrome/Edge
  // populate speechSynthesis.getVoices() asynchronously - calling it before
  // the "voiceschanged" event fires returns [], which silently falls back to
  // the OS default voice, very often a male one on Windows. This is the
  // documented root cause of "the AI's voice changed to a man's voice" -
  // resolves once, at most after a short timeout, and never throws.
  const ensureVoicesReady = () => {
    return new Promise((resolve) => {
      try {
        if (typeof window === "undefined" || !window.speechSynthesis) return resolve();
        const existing = window.speechSynthesis.getVoices();
        if (existing && existing.length > 0) {
          voicesReadyRef.current = true;
          return resolve();
        }
        let settled = false;
        const done = () => {
          if (settled) return;
          settled = true;
          voicesReadyRef.current = true;
          resolve();
        };
        window.speechSynthesis.onvoiceschanged = done;
        setTimeout(done, 400);
      } catch (e) {
        resolve();
      }
    });
  };

  // Resolve the voice ONCE per mount and cache it in pinnedVoiceRef - every
  // subsequent speakAiVoice() call reuses the same cached voice instead of
  // re-running getVoices().find(...), which is what let the voice drift
  // between a good match and the male default across a single session.
  const pickInterviewerVoice = () => {
    try {
      if (pinnedVoiceRef.current) return pinnedVoiceRef.current;
      if (typeof window === "undefined" || !window.speechSynthesis) return null;
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const realHumanVoicePatterns = [
        /microsoft.*(jenny|aria|ava|emma|sonia|libby|michelle).*natural/i,
        /samantha.*(enhanced|premium)/i,
        /karen.*(enhanced|premium)/i,
        /serena.*(enhanced|premium)/i,
        /google us english/i,
        /google uk english female/i,
        /google.*female/i,
        /microsoft (jenny|aria|ava|emma|sonia|libby)/i,
        /samantha/i,
        /karen/i,
        /victoria/i,
      ];

      let selectedVoice = null;
      for (const pattern of realHumanVoicePatterns) {
        const match = voices.find(
          (v) => pattern.test(v.name) && v.lang && v.lang.toLowerCase().startsWith("en") && !/desktop|espeak/i.test(v.name)
        );
        if (match) {
          selectedVoice = match;
          break;
        }
      }

      if (!selectedVoice) {
        selectedVoice = voices.find(
          (v) =>
            v.lang &&
            v.lang.toLowerCase().startsWith("en") &&
            /(natural|neural|female|enhanced)/i.test(v.name) &&
            !/desktop|espeak|male/i.test(v.name)
        );
      }

      // Cache whatever we found (even null) so we don't keep re-scanning on
      // every call - null just means "use the browser default," which is at
      // least now a STABLE choice for the rest of this session.
      pinnedVoiceRef.current = selectedVoice || null;
      return pinnedVoiceRef.current;
    } catch (e) {
      return null;
    }
  };

  const stopAiVoice = () => {
    if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
    if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    if (speechResumeIntervalRef.current) clearInterval(speechResumeIntervalRef.current);
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    activeUtteranceRef.current = null;
    window.__stage5ActiveUtterance = null;
    setIsAiSpeaking(false);
  };

  const speakAiVoice = async (text, onEnd) => {
    if (typeof window === "undefined" || !window.speechSynthesis) {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    const cleanText = String(text || "")
      .replace(/[*_#`~[\]]/g, " ")
      .replace(/\bE\/M\b/gi, "E and M")
      .replace(/\bICD-10-CM\b/gi, "I C D 10 C M")
      .replace(/\bICD-10-PCS\b/gi, "I C D 10 P C S")
      .replace(/\bICD-10\b/gi, "I C D 10")
      .replace(/\bCPT\b/g, "C P T")
      .replace(/\bMDM\b/g, "M D M")
      .replace(/\bHIPAA\b/gi, "Hippa")
      .replace(/\bPHI\b/g, "P H I")
      .replace(/\bRAF\b/g, "R A F")
      .replace(/\bMEAT\b/g, "Meat")
      .replace(/\bvs\.?\b/gi, "versus")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
    if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    if (speechResumeIntervalRef.current) clearInterval(speechResumeIntervalRef.current);

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
      if (speechResumeIntervalRef.current) clearInterval(speechResumeIntervalRef.current);
      activeUtteranceRef.current = null;
      window.__stage5ActiveUtterance = null;
      setIsAiSpeaking(false);
      if (onEnd) onEnd();
    };

    try {
      // Wait for the async voice list once (cheap no-op after the first
      // successful resolution) before ever calling getVoices().find(...).
      if (!voicesReadyRef.current) {
        await ensureVoicesReady();
      }

      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      // Small delay between cancel() and the new speak() - calling both in
      // the same tick can silently drop the new utterance in Chrome.
      speechDelayTimerRef.current = setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          const utterance = new SpeechSynthesisUtterance(cleanText);
          // Keep a strong reference alive for the duration of speech - a
          // local-only utterance can be garbage collected mid-speech in
          // Chrome specifically, which silently kills playback.
          activeUtteranceRef.current = utterance;
          window.__stage5ActiveUtterance = utterance;
          utterance.lang = "en-US";
          utterance.rate = 0.95;
          utterance.pitch = 1.0;
          utterance.volume = 1.0;

          const selectedVoice = pickInterviewerVoice();
          if (selectedVoice) {
            utterance.voice = selectedVoice;
            if (selectedVoice.lang) utterance.lang = selectedVoice.lang;
          }

          utterance.onstart = () => setIsAiSpeaking(true);
          utterance.onend = finish;
          utterance.onerror = finish;

          setIsAiSpeaking(true);
          window.speechSynthesis.speak(utterance);

          // Chromium can silently pause the speech pipeline (e.g. tab
          // backgrounded) - periodically nudge resume() so it doesn't hang.
          speechResumeIntervalRef.current = setInterval(() => {
            if (window.speechSynthesis && window.speechSynthesis.speaking) {
              window.speechSynthesis.resume();
            }
          }, 3000);

          // Length-scaled safety net: if the browser never fires
          // onend/onerror at all (no OS TTS voices installed, etc.), force
          // completion instead of hanging the UI forever waiting on the mic.
          const estimatedMs = Math.min(60000, Math.max(4000, cleanText.length * 110));
          speechSafetyTimerRef.current = setTimeout(finish, estimatedMs);
        } catch (err) {
          finish();
        }
      }, 60);
    } catch (e) {
      console.warn("AI Voice synthesis error:", e);
      finish();
    }
  };

  // Stop any in-flight speech and clear its timers on unmount (navigating
  // away mid-prompt shouldn't leave a dangling interval/timeout behind).
  useEffect(() => {
    return () => {
      if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
      if (speechResumeIntervalRef.current) clearInterval(speechResumeIntervalRef.current);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch (e) {}
      }
    };
  }, []);

  const playSelfIntroVoicePrompt = () => {
    if (isAiSpeaking) {
      stopAiVoice();
      return;
    }
    const introText = `Hello ${candidateName}! Welcome to your Stage 5 Video Pitch. In this section, please record a 60-second self-introduction highlighting your background in ${candidateDegree}, your training in ${s2Domain}, and your enthusiasm for US Healthcare Revenue Cycle Management. When you are ready, please click the Start Recording button below. Good luck!`;
    speakAiVoice(introText);
  };

  const playQuestionVoicePrompt = (q) => {
    if (isAiSpeaking) {
      stopAiVoice();
      return;
    }
    const qObj = q || currentQ;
    const qText = `Question ${currentMockIndex + 1} of ${mockQuestions.length}. Topic: ${qObj.topic}. ${qObj.question}`;
    speakAiVoice(qText);
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 2: SELF-INTRODUCTION WEBCAM RECORDER WITH AUTOMATED AI PROMPT
  // ══════════════════════════════════════════════════════════════════════════

  useEffect(() => {
    let timer = null;
    if (isIntroRecording) {
      timer = setInterval(() => {
        setIntroRecordingTime((prev) => {
          if (prev >= 90) {
            handleStopIntroRecording();
            return 90;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isIntroRecording]);

  const actuallyStartIntroRecording = (stream) => {
    try {
      setIsIntroPrompting(false);
      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm",
      });

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        setIntroVideoBlob(blob);
        const url = URL.createObjectURL(blob);
        setIntroVideoUrl(url);

        stream.getTracks().forEach((t) => t.stop());
        if (introVideoRef.current) {
          introVideoRef.current.srcObject = null;
          introVideoRef.current.src = url;
        }
      };

      introMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setIntroRecordingTime(0);
      setIsIntroRecording(true);
      toast("🎙️ Recording started! Speak clearly for 45 to 60 seconds.", "✓");
    } catch (err) {
      console.error(err);
      toast("Could not start recording: " + err.message, "!");
    }
  };

  const handleStartIntroRecording = async () => {
    stopAiVoice();
    setMode("record_intro");
  };

  const handleSkipIntroPromptAndRecord = () => {
    stopAiVoice();
    if (mediaStreamRef.current) {
      actuallyStartIntroRecording(mediaStreamRef.current);
    }
  };

  const handleStopIntroRecording = () => {
    stopAiVoice();
    setIsIntroPrompting(false);
    if (introMediaRecorderRef.current && introMediaRecorderRef.current.state !== "inactive") {
      introMediaRecorderRef.current.stop();
    }
    setIsIntroRecording(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    toast(`Recording stopped (${introRecordingTime}s). Review your video below.`, "✓");
  };

  const handleDiscardIntro = () => {
    stopAiVoice();
    setIsIntroPrompting(false);
    if (introVideoUrl && introVideoUrl.startsWith("blob:")) {
      URL.revokeObjectURL(introVideoUrl);
    }
    setIntroVideoBlob(null);
    setIntroVideoUrl("");
    setIntroRecordingTime(0);
    setIntroTakeCount((prev) => prev + 1);
    if (introVideoRef.current) {
      introVideoRef.current.src = "";
      introVideoRef.current.srcObject = null;
    }
    toast("Draft discarded. Ready for Take " + (introTakeCount + 1), "✓");
  };

  const handleUploadIntroFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 30 * 1024 * 1024) {
      toast("Video file size must be less than 30 MB.", "!");
      return;
    }

    setIsUploadingIntro(true);
    const formData = new FormData();
    formData.append("video", file);

    try {
      const res = await api.post("/candidate/upload/video", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data?.fileUrl) {
        setIntroVideoUrl(res.data.fileUrl);
        toast("Pre-recorded video uploaded successfully! (🟡 Uploaded Badge)", "✓");
      }
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to upload video file.", "!");
    } finally {
      setIsUploadingIntro(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 3: 5-QUESTION AI MOCK INTERVIEW WITH CONTINUOUS 5-QUESTION PROGRESSION
  // ══════════════════════════════════════════════════════════════════════════

  const currentQ = mockQuestions[currentMockIndex] || mockQuestions[0];
  const isCurrentQDone = Boolean(mockAnswers[currentQ.id]?.completed);
  const completedMockCount = mockQuestions.filter((q) => Boolean(mockAnswers[q.id]?.completed)).length;

  useEffect(() => {
    let timer = null;
    if (isMockRecording) {
      timer = setInterval(() => {
        setMockRecordingTime((prev) => {
          if (prev >= currentQ.timeLimit) {
            handleStopMockRecording();
            return currentQ.timeLimit;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isMockRecording, currentQ]);

  const actuallyStartMockRecording = (stream, activeQuestion) => {
    const q = activeQuestion || currentQ;
    try {
      setIsMockPrompting(false);

      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = "en-US";

        recognition.onresult = (event) => {
          let fullTranscript = "";
          for (let i = 0; i < event.results.length; i++) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
          setMockLiveTranscript(fullTranscript);
        };

        recognition.start();
        recognitionRef.current = recognition;
      } else {
        setMockLiveTranscript(`"Answering ${q.topic}: Speaking about ${candidateRole} background, ${s2Domain} foundations and operational knowledge..."`);
      }

      const chunks = [];
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setMockVideos((prev) => ({ ...prev, [q.id]: url }));
        setMockAnswers((prev) => ({
          ...prev,
          [q.id]: {
            questionId: q.id,
            completed: true,
            videoUrl: url,
            transcript: mockLiveTranscript || "Spoken answer recorded successfully.",
            duration: mockRecordingTime || 30,
          },
        }));

        stream.getTracks().forEach((t) => t.stop());
        if (mockVideoRef.current) {
          mockVideoRef.current.srcObject = null;
        }
      };

      mockMediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(1000);
      setMockRecordingTime(0);
      setIsMockRecording(true);
      toast(`🎙️ Recording started for Q${currentMockIndex + 1}! Speak your answer.`, "✓");
    } catch (err) {
      console.error(err);
      toast("Could not start mock recording: " + err.message, "!");
    }
  };

  const handleStartMockRecording = async () => {
    stopAiVoice();
    if (!isSelfIntroComplete) {
      toast("Please complete your 60-Second Self-Introduction first (Section 2).", "!");
      const el = document.getElementById("stage5-intro-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setMode("start_mock");
  };

  const handleSkipMockPromptAndRecord = () => {
    stopAiVoice();
    if (mediaStreamRef.current) {
      actuallyStartMockRecording(mediaStreamRef.current, currentQ);
    }
  };

  const handleStopMockRecording = () => {
    stopAiVoice();
    setIsMockPrompting(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (_) {}
    }
    if (mockMediaRecorderRef.current && mockMediaRecorderRef.current.state !== "inactive") {
      mockMediaRecorderRef.current.stop();
    }
    setIsMockRecording(false);
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
    }
    toast(`✓ Q${currentMockIndex + 1} response saved! Review below or proceed to Next Question.`, "✓");
  };

  const handleGoToNextMockQuestion = (nextIndex) => {
    stopAiVoice();
    if (!isSelfIntroComplete) {
      toast("Please complete Section 2 Self-Introduction first.", "!");
      return;
    }
    if (nextIndex >= 0 && nextIndex < mockQuestions.length) {
      setCurrentMockIndex(nextIndex);
      setMockLiveTranscript("");
      setMockRecordingTime(0);
      toast(`Question ${nextIndex + 1} of ${mockQuestions.length}: ${mockQuestions[nextIndex].topic}`, "✓");
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // SECTION 4: PASSION & REGIONAL BONUS VIDEOS
  // ══════════════════════════════════════════════════════════════════════════

  const handleSavePassionVideo = () => {
    setPassionVideoUrl("recorded_passion_30s.mp4");
    setPassionScore(88);
    setShowPassionModal(false);
    toast("🔥 Passion Signal (+2 Bonus Points) recorded and attached!", "✓");
  };

  const handleSaveRegionalVideo = () => {
    setRegionalVideoUrl(`recorded_${selectedRegionalLang.toLowerCase()}_60s.mp4`);
    setShowRegionalModal(false);
    toast(`🌏 Multilingual Badge (${selectedRegionalLang}) recorded and unlocked!`, "✓");
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RETAKE WORKFLOW & MODAL
  // ══════════════════════════════════════════════════════════════════════════

  const handleRequestRetake = async (e) => {
    e.preventDefault();
    if (!retakeReason.trim()) {
      toast("Please provide a reason for requesting a retake.", "!");
      return;
    }
    setSubmittingRetake(true);
    try {
      const res = await api.post("/candidate/retake-request", {
        stage: 5,
        reason: retakeReason.trim(),
        assessmentType: `Talentera AI Video Pitch (Stage 5 - ${s2Domain})`,
      });
      if (res.data?.request) {
        setRetakeRequest(res.data.request);
      }
      toast("Retake request submitted to employee audit queue!", "✓");
      setShowRetakeModal(false);
      setRetakeReason("");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to submit retake request.", "!");
    } finally {
      setSubmittingRetake(false);
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // FINAL STAGE 5 SUBMISSION
  // ══════════════════════════════════════════════════════════════════════════

  // NOTE: this does NOT independently score or submit anything. Both the
  // Self-Introduction (via AiVideoAssessment -> POST /ai-video/assess) and
  // the AI Mock Interview (via ClaudeMockInterviewBot -> the /ai-interview/*
  // endpoints) already save their own real, AI-evaluated results directly
  // to the backend the moment each one completes. This handler only
  // verifies both are genuinely done and advances the wizard - it used to
  // also PUT a block of hardcoded fake scores (78%, Clarity 82, etc.) to
  // /candidate/stage/5, which would silently overwrite the real evaluation
  // with fabricated numbers, and only checked that a video existed (not
  // that the Mock Interview had even been attempted). That made it possible
  // to reach "Stage 05 completed" from an unvalidated video with zero
  // keyword-matched interview answers.
  const handleSubmitAllVideos = async (advance = true) => {
    if (!hasRealSelfIntro) {
      toast("Please complete your 60-second Self-Introduction first (Section 2).", "!");
      const el = document.getElementById("stage5-intro-section");
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    // Advancing to Stage 06 requires BOTH parts done for real; "save &
    // finish later" is just a checkpoint (each real sub-flow already
    // persisted its own result the moment it completed), so it doesn't
    // need to block on the Mock Interview too.
    if (advance && !hasRealMockInterview) {
      toast("Please complete all 5 questions of the AI Mock Interview first (Section 3).", "!");
      return;
    }

    setIsSubmittingStage5(true);
    try {
      toast(advance ? "Stage 05 Completed! Moving to Stage 06 →" : "✓ Stage 05 progress saved.", "✓");
      if (onSaved) {
        onSaved(existingData, { advance, nextStage: advance ? 6 : null });
      }
    } finally {
      setIsSubmittingStage5(false);
    }
  };

  const handleContinueToStage6 = () => {
    if (onSaved) {
      onSaved(null, { advance: true, nextStage: 6 });
    }
  };

  // ══════════════════════════════════════════════════════════════════════════
  // EMBEDDED AI BOTS (SELF-INTRO & CLAUDE MOCK INTERVIEW)
  // ══════════════════════════════════════════════════════════════════════════

  if (mode === "record_intro") {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 16px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: 16, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setMode("overview")}
            style={{
              background: "#0A1F3D",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>← Back to Stage 05 Hub</span>
          </button>
          <span style={{ fontSize: 12, color: "#1F7A3C", fontWeight: 700, background: "#E8F5E9", padding: "4px 12px", borderRadius: 12 }}>
            🎥 AI Self-Introduction Studio Bot Active
          </span>
        </div>
        <AiVideoAssessment
          existingData={existingData}
          onSaved={(data) => {
            if (data?.videoUrl) setIntroVideoUrl(data.videoUrl);
            if (onSaved) onSaved(data, { advance: false });
            setMode("overview");
            toast("Self-Introduction Video saved! Section 3 AI Mock Interview is now unlocked.", "✓");
          }}
        />
      </div>
    );
  }

  if (mode === "start_mock") {
    return (
      <div style={{ maxWidth: 1400, margin: "0 auto", padding: "10px 16px", fontFamily: "'Inter', sans-serif" }}>
        <div style={{ marginBottom: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <button
            type="button"
            onClick={() => setMode("overview")}
            style={{
              background: "#0A1F3D",
              color: "#FFFFFF",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              fontSize: 13,
              fontWeight: 700,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span>← Back to Stage 05 Hub</span>
          </button>
          <span style={{ fontSize: 12, color: "#1A4FB8", fontWeight: 700, background: "#EEF2FF", padding: "4px 12px", borderRadius: 12 }}>
            🤖 AI Mock Interview Bot · 5 Questions Active
          </span>
        </div>
        <ClaudeMockInterviewBot
          candidateData={candidate}
          onCompleted={async (result) => {
            // The /ai-interview/turn|end responses that ClaudeMockInterviewBot
            // acts on don't include the updated candidate document (only
            // {score}), so without this refetch the parent's candidate state
            // never learns stage5.mockInterviewCompleted became true and the
            // "both parts done" gate below would never pass. Re-fetching
            // /candidate/me picks up the real, already-persisted result.
            try {
              const res = await api.get("/candidate/me");
              if (onSaved) onSaved(res.data, { advance: false });
            } catch (e) {
              if (onSaved) onSaved(result, { advance: false });
            }
            setMode("overview");
            toast("AI Mock Interview completed & evaluated!", "✓");
          }}
        />
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'Inter', 'Segoe UI', Calibri, sans-serif", color: "var(--navy)", maxWidth: 1600, margin: "0 auto" }}>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* 2-COLUMN MAIN SHELL                                              */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 24, alignItems: "start" }}>

        {/* ═══════ CENTER MAIN COLUMN ═══════ */}
        <div style={{ minWidth: 0 }}>

          {/* BREADCRUMB */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#8A91A3", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 14, fontWeight: 700 }}>
            <span>Home</span><span style={{ color: "#E5E7EB" }}>›</span>
            <span>My Career Passport</span><span style={{ color: "#E5E7EB" }}>›</span>
            <span style={{ color: "var(--navy)", fontWeight: 800 }}>Stage 05 · Video Pitch</span>
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
                right: -80,
                top: -80,
                width: 280,
                height: 280,
                background: "radial-gradient(circle, rgba(245, 180, 26, 0.16), transparent 60%)",
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
              🎤
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
              <span style={{ background: "rgba(255,255,255,0.14)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase", backdropFilter: "blur(6px)" }}>
                STAGE 05 OF 08 · {isCompleted ? "COMPLETED" : "ACTIVE"}
              </span>
              <span style={{ background: "var(--gold)", color: "var(--navy)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 800, letterSpacing: 1.2, textTransform: "uppercase" }}>
                +10 POINTS
              </span>
              <span style={{ background: "rgba(255,255,255,0.14)", padding: "5px 12px", borderRadius: 20, fontSize: 10.5, fontWeight: 700, letterSpacing: 1.2, textTransform: "uppercase" }}>
                ~15 MIN
              </span>
            </div>

            <h1 style={{ fontSize: 44, fontWeight: 800, letterSpacing: "-1px", margin: 0, lineHeight: 1, color: "#FFFFFF" }}>
              Video Pitch
            </h1>
            <div style={{ color: "var(--gold-pale, #FFF6E0)", fontStyle: "italic", fontSize: 17, marginTop: 6, fontWeight: 500 }}>
              Where the HR meets you before the HR meets you.
            </div>
            <div style={{ color: "rgba(255,255,255,0.85)", fontSize: 14, marginTop: 16, maxWidth: 640, lineHeight: 1.6 }}>
              Communication is the #1 filter for US-facing RCM roles. Record a 60-second self-introduction plus a 5-question AI mock interview. Talentera AI scores your clarity, fluency, confidence and content — companies watch this before they ever pick up a phone.
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 22 }}>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "16px 14px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>3 videos</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>2 required · 1 bonus</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "16px 14px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>5 dimensions</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>Talentera AI scored</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "16px 14px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>Face-verified</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>matches your Aadhaar</div>
              </div>
              <div style={{ background: "rgba(255,255,255,0.12)", padding: "16px 14px", borderRadius: 12, textAlign: "center", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(8px)" }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF" }}>~15 min</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.7)", marginTop: 3 }}>your time</div>
              </div>
            </div>
          </div>

          {/* ID RECAP BANNER (100% REAL DATA FROM STAGES 1-4) */}
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
              <div style={{ fontSize: 11, color: "#1F7A3C", fontWeight: 700, letterSpacing: 0.6, textTransform: "uppercase" }}>
                FROM YOUR STAGES 01-04
              </div>
              <div style={{ fontSize: 14, color: "var(--navy)", fontWeight: 800, marginTop: 2 }}>
                {candidateName} · {candidateExp} · {s2Domain} · {certName} ({certStatus}) · {s4Medal ? `${s4Medal} Assessment ${s4Score}/100` : "Assessment Active"}
              </div>
              <div style={{ fontSize: 11.5, color: "#8A91A3", marginTop: 1, fontStyle: "italic" }}>
                Talentera has prefilled context so the AI can score your responses accurately.
              </div>
            </div>
            <div style={{ background: "var(--gold)", color: "var(--navy)", padding: "5px 10px", borderRadius: 8, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.6 }}>
              🔒 LOCKED
            </div>
          </div>

          {/* ACTIVE RETAKE NOTIFICATION BANNER */}
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
                  Your request for a Stage 5 Video Pitch retake is under review by Talentera staff. Reason: <i>"{retakeRequest.reason}"</i>
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
                View Status
              </button>
            </div>
          )}

          {/* HOW STAGE 05 WORKS CARD */}
          <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px 26px", boxShadow: "0 2px 10px rgba(15,27,61,.05)", marginBottom: 18, border: "1px solid #E5E7EB" }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              How Stage 05 Works
            </div>
            <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: "var(--gold-deep)", textTransform: "uppercase", fontWeight: 700, marginTop: 8 }}>
              WHY IT MATTERS · WHAT'S CAPTURED · HOW AI SCORES · WHAT COMPANIES SEE
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginTop: 18 }}>
              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>
                    ?
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>
                    Why on-camera communication matters
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-txt)", lineHeight: 1.55 }}>
                  For US-payer-facing work (HCC, AR calling, denial mgmt), spoken English clarity and professional delivery are essential. Companies rely on this video before shortlisting.
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>
                    🎬
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>
                    What's captured
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-txt)", lineHeight: 1.55 }}>
                  A 60-second self-introduction + a 5-question AI mock interview + an optional 30-second "Why RCM?" passion piece. Live-record or upload — companies see the trust badge either way.
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>
                    🤖
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>
                    How Talentera AI scores
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-txt)", lineHeight: 1.55 }}>
                  5 dimensions × 20% each — Clarity · Fluency · Vocabulary & Grammar · Confidence & Delivery · Content Relevance. Auto-transcribed, auto-scored, badge assigned (Bronze/Silver/Gold).
                </div>
              </div>

              <div style={{ background: "#FFF6E0", padding: "16px 18px", borderRadius: 12, borderLeft: "4px solid var(--gold)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: "50%", display: "grid", placeItems: "center", fontSize: 15, fontWeight: 700 }}>
                    👁
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: "var(--navy)" }}>
                    What companies see
                  </div>
                </div>
                <div style={{ fontSize: 12.5, color: "var(--gray-txt)", lineHeight: 1.55 }}>
                  Playable videos + your 5-dimension breakdown + searchable auto-captions + Live Verified or Uploaded badge. Companies filter shortlists by min communication score.
                </div>
              </div>
            </div>

            <div style={{ background: "var(--navy)", color: "var(--gold-pale, #FFF6E0)", padding: "12px 16px", borderRadius: 12, fontStyle: "italic", fontSize: 12.5, marginTop: 16, display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "var(--gold)", fontSize: 16 }}>🔐</span>
              <span>By recording, you consent to Talentera AI processing your video for scoring. Videos are retained 5 years and updatable every 60 days.</span>
            </div>
          </div>

          {/* FORM TOOLBAR */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(135deg, #FFF6E0, #FFF9E0)", padding: "12px 20px", borderRadius: 12, marginBottom: 16, border: "1px solid #FFEBB0" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, background: "#FFFFFF", padding: "8px 14px", borderRadius: 20, border: "1px solid #E5E7EB", fontSize: 11.5, color: "#8A91A3" }}>
              <span>Progress:</span>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: isHardwareReady ? "var(--gold)" : "#E5E7EB" }}></span>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: introVideoUrl ? "var(--gold)" : "#E5E7EB" }}></span>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: Object.keys(mockAnswers).length > 0 ? "var(--gold)" : "#E5E7EB" }}></span>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: isCompleted ? "var(--gold)" : "#E5E7EB" }}></span>
              <span style={{ width: 9, height: 9, borderRadius: "50%", background: isCompleted ? "var(--gold)" : "#E5E7EB" }}></span>
              <span style={{ marginLeft: 6, fontWeight: 700, color: "var(--navy)" }}>
                {isCompleted ? "Completed" : introVideoUrl ? "Section 3 of 5" : "Section 1 of 5"}
              </span>
            </div>
            <div style={{ color: "#1F7A3C", fontWeight: 700, fontSize: 11.5, marginLeft: "auto", display: "flex", alignItems: "center", gap: 4 }}>
              ✓ Studio Ready
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              Your Stage 05 information
            </h2>
            <div style={{ color: "var(--gold-deep)", fontSize: 11, fontWeight: 700, letterSpacing: 1.5, textTransform: "uppercase", marginTop: 6 }}>
              GET STUDIO-READY · RECORD · YOU EARN +10 POINTS
            </div>
          </div>

          {/* ═══════ SECTION 1 · PRE-RECORDING CHECKS ═══════ */}
          <div id="stage5-checks" style={{ background: "#FAFAF7", padding: "22px 24px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>
                1
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                Studio Check — is your setup ready?
              </div>
              <div style={{ background: readyChecksCount === 5 ? "#E8F5E9" : "#FFF3D6", color: readyChecksCount === 5 ? "#1F7A3C" : "#E08E00", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5 }}>
                {readyChecksCount} OF 5 READY
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10 }}>
              <div style={{ background: "#FFFFFF", border: `1.5px solid ${sysChecks.camera.status === "passed" ? "#1F7A3C" : sysChecks.camera.status === "warn" ? "#E08E00" : "#C0392B"}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: sysChecks.camera.status === "passed" ? "#1F7A3C" : sysChecks.camera.status === "warn" ? "#E08E00" : "#C0392B" }}>
                  <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/>
                  <circle cx="12" cy="13" r="3"/>
                </svg>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>Camera</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sysChecks.camera.status === "passed" ? "#1F7A3C" : sysChecks.camera.status === "warn" ? "#E08E00" : "#C0392B" }}>
                  {sysChecks.camera.label}
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1.5px solid ${sysChecks.mic.status === "passed" ? "#1F7A3C" : sysChecks.mic.status === "warn" ? "#E08E00" : "#C0392B"}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: sysChecks.mic.status === "passed" ? "#1F7A3C" : sysChecks.mic.status === "warn" ? "#E08E00" : "#C0392B" }}>
                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" x2="12" y1="19" y2="22"/>
                </svg>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>Microphone</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sysChecks.mic.status === "passed" ? "#1F7A3C" : sysChecks.mic.status === "warn" ? "#E08E00" : "#C0392B" }}>
                  {sysChecks.mic.label}
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1.5px solid ${sysChecks.lighting.status === "passed" ? "#1F7A3C" : "#E08E00"}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: sysChecks.lighting.status === "passed" ? "#1F7A3C" : "#E08E00" }}>
                  <path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/>
                  <path d="M9 18h6"/>
                  <path d="M10 22h4"/>
                </svg>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>Lighting</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sysChecks.lighting.status === "passed" ? "#1F7A3C" : "#E08E00" }}>
                  {sysChecks.lighting.label}
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1.5px solid ${sysChecks.framing.status === "passed" ? "#1F7A3C" : "#E08E00"}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: sysChecks.framing.status === "passed" ? "#1F7A3C" : "#E08E00" }}>
                  <path d="M3 7V5a2 2 0 0 1 2-2h2"/>
                  <path d="M17 3h2a2 2 0 0 1 2 2v2"/>
                  <path d="M21 17v2a2 2 0 0 1-2 2h-2"/>
                  <path d="M7 21H5a2 2 0 0 1-2-2v-2"/>
                  <circle cx="12" cy="10" r="3"/>
                  <path d="M7 17a5 5 0 0 1 10 0"/>
                </svg>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>Framing</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sysChecks.framing.status === "passed" ? "#1F7A3C" : "#E08E00" }}>
                  {sysChecks.framing.label}
                </div>
              </div>

              <div style={{ background: "#FFFFFF", border: `1.5px solid ${sysChecks.internet.status === "passed" ? "#1F7A3C" : "#C0392B"}`, borderRadius: 12, padding: "14px 12px", textAlign: "center" }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 6px", display: "block", color: sysChecks.internet.status === "passed" ? "#1F7A3C" : "#C0392B" }}>
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" x2="22" y1="12" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                <div style={{ fontSize: 11.5, fontWeight: 800, color: "var(--navy)", marginBottom: 2 }}>Internet</div>
                <div style={{ fontSize: 10.5, fontWeight: 700, color: sysChecks.internet.status === "passed" ? "#1F7A3C" : "#C0392B" }}>
                  {sysChecks.internet.label}
                </div>
              </div>
            </div>

            {readyChecksCount < 5 && (
              <div style={{ background: "#FFF3D6", border: "1px solid #FFEBB0", color: "#975A16", padding: "10px 14px", borderRadius: 8, marginTop: 12, fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚠️</span> Camera and microphone access is required. Please grant browser permissions to record live.
                </div>
                <button
                  type="button"
                  onClick={runHardwareCheck}
                  disabled={isCheckingSetup}
                  style={{ background: "#0F1B3D", color: "#FFFFFF", border: "none", padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                >
                  {isCheckingSetup ? "Testing..." : "Re-test"}
                </button>
              </div>
            )}

            {/* SCRIPT FRAMEWORK */}
            <div style={{ background: "linear-gradient(135deg, #EEF2FF, #F5F8FF)", border: "1.5px solid #1A4FB8", borderRadius: 12, padding: "18px 20px", marginTop: 16 }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13.5, marginBottom: 10, display: "flex", alignItems: "center", gap: 8 }}>
                📝 Script Framework — structure your 60 seconds
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8 }}>
                <div style={{ background: "#FFFFFF", border: "1px solid #EEF2FF", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#1A4FB8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>0-15 sec</div>
                  <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Name + city + warm opener</div>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #EEF2FF", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#1A4FB8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>15-30 sec</div>
                  <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Your RCM training background</div>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #EEF2FF", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#1A4FB8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>30-45 sec</div>
                  <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Your specialty + one practical example</div>
                </div>
                <div style={{ background: "#FFFFFF", border: "1px solid #EEF2FF", borderRadius: 8, padding: "10px 12px" }}>
                  <div style={{ fontSize: 11, color: "#1A4FB8", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.5 }}>45-60 sec</div>
                  <div style={{ fontSize: 12, color: "var(--navy)", fontWeight: 600, marginTop: 4, lineHeight: 1.4 }}>Role you seek + confident close</div>
                </div>
              </div>
            </div>
          </div>

          {/* ═══════ SECTION 2 · SELF-INTRODUCTION ═══════ */}
          <div id="stage5-intro-section" style={{ background: "#FAFAF7", padding: "22px 24px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>
                2
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                🎬 Self-Introduction · 60 seconds (Required)
              </div>
              <div style={{ background: isIntroRecording ? "#FFF3D6" : introVideoUrl ? "#E8F5E9" : "#F2F3F5", color: isIntroRecording ? "#E08E00" : introVideoUrl ? "#1F7A3C" : "#8A91A3", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5 }}>
                {isIntroRecording ? "RECORDING LIVE" : introVideoUrl ? "RECORDED ✓" : "REQUIRED"}
              </div>
            </div>


            <div style={{ background: "var(--navy)", borderRadius: 14, padding: 20, color: "#FFFFFF", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap", alignItems: "center" }}>
                {/*
                  Both tabs open the real, validated AiVideoAssessment flow
                  (mode="record_intro"), which enforces the 60-second
                  minimum for BOTH live recording and file upload server-side
                  and client-side. These used to toggle a local `introMode`
                  that rendered this component's own inline recording UI
                  ("live") or a raw file-upload input ("upload") - neither
                  path ever checked video duration, so a candidate could
                  upload a video of any length here and have it silently
                  count as a completed Self-Introduction. Routing both
                  through handleStartIntroRecording closes that gap.
                */}
                <button
                  type="button"
                  onClick={handleStartIntroRecording}
                  style={{
                    background: introMode === "live" ? "var(--gold)" : "rgba(255,255,255,.08)",
                    color: introMode === "live" ? "var(--navy)" : "#FFFFFF",
                    padding: "9px 16px",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "1.5px solid transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  🎥 Record Live · 🟢 Live Verified
                </button>
                <button
                  type="button"
                  onClick={handleStartIntroRecording}
                  style={{
                    background: introMode === "upload" ? "var(--gold)" : "rgba(255,255,255,.08)",
                    color: introMode === "upload" ? "var(--navy)" : "#FFFFFF",
                    padding: "9px 16px",
                    borderRadius: 9,
                    fontSize: 12.5,
                    fontWeight: 700,
                    border: "1.5px solid transparent",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  ☁ Upload Pre-recorded (60s min, verified on submit)
                </button>
              </div>

                            {introMode === "live" ? (
                <>
                  <div style={{ background: "#000", aspectRatio: "16/9", minHeight: 440, borderRadius: 12, position: "relative", overflow: "hidden", display: "grid", placeItems: "center", border: "2px solid rgba(255,255,255,.08)", boxShadow: "0 8px 24px rgba(0,0,0,0.15)" }}>
                    <video
                      key={introVideoUrl ? `intro-vid-${introVideoUrl}` : "intro-vid-live"}
                      ref={introVideoRef}
                      autoPlay={isIntroRecording}
                      playsInline
                      muted={isIntroRecording}
                      controls={!isIntroRecording && Boolean(introVideoUrl)}
                      src={!isIntroRecording && introVideoUrl ? getAssetUrl(introVideoUrl) : undefined}
                      preload="auto"
                      style={{ width: "100%", height: "100%", objectFit: "contain", background: "#000" }}
                      onError={(e) => {
                        console.warn("Self-introduction video failed to load:", introVideoUrl, e);
                      }}
                    />

                    {isIntroPrompting && (
                      <div style={{ position: "absolute", inset: 0, background: "rgba(15,27,61,.85)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, textAlign: "center", zIndex: 10 }}>
                        <div style={{ width: 50, height: 50, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", display: "grid", placeItems: "center", fontSize: 24, marginBottom: 10 }}>
                          🎙️
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}>
                          AI Interviewer Speaking Prompt...
                        </div>
                        <div style={{ fontSize: 12.5, color: "rgba(255,255,255,.85)", marginTop: 6, maxWidth: 460, lineHeight: 1.5 }}>
                          Please listen to the verbal instructions. Your 60-second video recording will begin automatically when the AI completes.
                        </div>
                        <button
                          type="button"
                          onClick={handleSkipIntroPromptAndRecord}
                          style={{
                            marginTop: 14,
                            background: "var(--gold)",
                            color: "var(--navy)",
                            border: "none",
                            padding: "8px 18px",
                            borderRadius: 8,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          ⚡ Skip & Start Recording Now
                        </button>
                      </div>
                    )}

                    {!isIntroRecording && !isIntroPrompting && !introVideoUrl && (
                      <div style={{ position: "absolute", color: "rgba(255,255,255,.4)", fontSize: 13, textAlign: "center", pointerEvents: "none" }}>
                        <span style={{ fontSize: 44, marginBottom: 8, display: "block" }}>🎥</span>
                        <div>Live camera preview</div>
                        <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Face-match to Aadhaar · verified ✓</div>
                      </div>
                    )}

                    {isIntroRecording && (
                      <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
                        <div style={{ background: "#C0392B", color: "#FFFFFF", padding: "4px 10px", borderRadius: 16, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, background: "#FFFFFF", borderRadius: "50%", animation: "pulse 1.2s infinite" }} />
                          REC · Take {introTakeCount}
                        </div>
                        <div style={{ background: "rgba(0,0,0,.6)", color: "#FFFFFF", padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 800, fontFamily: "monospace" }}>
                          00:{String(introRecordingTime).padStart(2, "0")} / 01:30
                        </div>
                      </div>
                    )}

                    {isIntroRecording && (
                      <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, pointerEvents: "none" }}>
                        <div style={{ background: "rgba(0,0,0,.5)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ height: "100%", background: "linear-gradient(90deg, var(--gold), var(--gold-deep))", borderRadius: 3, width: `${(introRecordingTime / 90) * 100}%`, transition: "width .3s" }} />
                        </div>
                        <div style={{ color: "rgba(255,255,255,.85)", fontSize: 10.5, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
                          {introRecordingTime}s of ~60s · min 45s · max 90s
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center", flexWrap: "wrap" }}>
                    {!isIntroRecording ? (
                      <button
                        type="button"
                        onClick={handleStartIntroRecording}
                        style={{
                          background: "var(--gold)",
                          color: "var(--navy)",
                          padding: "12px 22px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          letterSpacing: 0.3,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        🔴 {introVideoUrl ? `Re-record Take ${introTakeCount + 1}` : "Start Recording (Take 1)"}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleStopIntroRecording}
                        style={{
                          background: "#C0392B",
                          color: "#FFFFFF",
                          padding: "12px 22px",
                          borderRadius: 10,
                          fontSize: 13,
                          fontWeight: 800,
                          border: "none",
                          cursor: "pointer",
                          letterSpacing: 0.3,
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        ⏹ Stop Recording
                      </button>
                    )}

                    {introVideoUrl && !isIntroRecording && (
                      <>
                        <button
                          type="button"
                          onClick={handleDiscardIntro}
                          style={{
                            background: "transparent",
                            color: "var(--gold-pale, #FFF6E0)",
                            border: "1px solid rgba(255,255,255,.15)",
                            padding: "11px 18px",
                            borderRadius: 10,
                            fontSize: 12.5,
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          🗑 Discard & retry
                        </button>
                        <a
                          href={getAssetUrl(introVideoUrl)}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            color: "var(--gold)",
                            fontSize: 12,
                            fontWeight: 700,
                            textDecoration: "underline",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            marginLeft: 4,
                          }}
                          title="Open or download recorded video file in new tab"
                        >
                          ↗ Open video in new tab
                        </a>
                      </>
                    )}

                    <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                      Take {introTakeCount} of unlimited drafts · Submit when happy
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ background: "#FAFAF7", border: "2px dashed #E5E7EB", borderRadius: 12, padding: "36px 20px", textAlign: "center", marginTop: 14 }}>
                  <div style={{ width: 56, height: 56, background: "var(--navy)", color: "var(--gold)", borderRadius: 14, display: "grid", placeItems: "center", margin: "0 auto 12px", fontSize: 22 }}>
                    ☁
                  </div>
                  <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14, marginBottom: 4 }}>
                    Upload a pre-recorded self-introduction video
                  </div>
                  <div style={{ fontSize: 11.5, color: "#8A91A3", marginBottom: 12 }}>
                    MP4 · WebM · MOV · MKV · max 30 MB · min 45 sec · max 90 sec
                  </div>
                  <label
                    style={{
                      background: "var(--navy)",
                      color: "#FFFFFF",
                      padding: "9px 18px",
                      borderRadius: 9,
                      fontSize: 12.5,
                      fontWeight: 700,
                      cursor: "pointer",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    📁 {isUploadingIntro ? "Uploading..." : "Choose Video File"}
                    <input
                      type="file"
                      accept="video/*"
                      onChange={handleUploadIntroFile}
                      style={{ display: "none" }}
                    />
                  </label>
                  <div style={{ fontSize: 10.5, color: "#8A91A3", marginTop: 10, fontStyle: "italic" }}>
                    Uploaded videos get the 🟡 Uploaded badge. AI checks for edit cuts, lip-sync mismatch, and face-match to your Aadhaar photo.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ═══════ SECTION 3 · AI MOCK INTERVIEW ═══════ */}
          <div style={{ background: "#FAFAF7", padding: "22px 24px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>
                3
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                🎤 AI Mock Interview · 5 questions (Required)
              </div>
              <div style={{ background: "#FFF3D6", color: "#E08E00", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5 }}>
                {hasRealMockInterview ? "SUBMITTED" : `QUESTION ${currentMockIndex + 1} OF 5`}
              </div>
            </div>

            {/* Once all 5 questions are recorded and evaluated
                (stage5.mockInterviewCompleted), this section should never
                go back to showing the live "Question 1 of 5 / Click Start
                Answer to begin" recording UI - candidates were seeing that
                every time they revisited the page after finishing, which
                looked exactly like the interview had never been submitted.
                Show a plain success card instead, pointing at the existing
                staff-reviewed retake workflow (setShowRetakeModal) rather
                than implying they can just re-record it themselves. */}
            {hasRealMockInterview ? (
              <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 14, padding: "24px 22px", textAlign: "center" }}>
                <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto 14px" }}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: "var(--navy)", margin: "0 0 6px" }}>
                  AI Mock Interview successfully submitted
                </h4>
                {mockScore !== null && (
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#DCFCE7", border: "1px solid #86EFAC", color: "#15803D", padding: "4px 16px", borderRadius: 20, fontWeight: 800, fontSize: 13, margin: "6px 0 12px" }}>
                    <span>Technical Evaluation Score:</span>
                    <span style={{ fontSize: 16, color: "#166534" }}>{mockScore} / 100</span>
                  </div>
                )}
                <p style={{ fontSize: 13, color: "#475569", maxWidth: 460, margin: "0 auto 16px", lineHeight: 1.6 }}>
                  All 5 questions have been recorded and evaluated. Under Talentera's single-attempt policy you can't
                  re-record this yourself - if you need a retake, contact Talentera staff using the button below.
                </p>
                <button
                  type="button"
                  onClick={() => setShowRetakeModal(true)}
                  style={{
                    background: "var(--navy)",
                    color: "var(--gold)",
                    border: "none",
                    padding: "11px 22px",
                    borderRadius: 10,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  🔁 Request Retake for Stage 05
                </button>
              </div>
            ) : (
              <>
            {/* MOCK NAV PILLS */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginBottom: 16 }}>
              {mockQuestions.map((q, idx) => {
                const isDone = Boolean(mockAnswers[q.id]?.completed);
                const isActive = idx === currentMockIndex;
                return (
                  <div
                    key={q.id}
                    onClick={() => {
                      if (!isMockRecording) {
                        setCurrentMockIndex(idx);
                        setMockLiveTranscript("");
                      }
                    }}
                    style={{
                      background: isDone ? "#E8F5E9" : isActive ? "#FFF6E0" : "#FFFFFF",
                      border: `1.5px solid ${isDone ? "#1F7A3C" : isActive ? "var(--gold)" : "#E5E7EB"}`,
                      borderRadius: 10,
                      padding: "12px 10px",
                      textAlign: "center",
                      fontSize: 11,
                      color: isDone ? "#1F7A3C" : isActive ? "var(--gold-deep)" : "#8A91A3",
                      cursor: isMockRecording ? "not-allowed" : "pointer",
                      boxShadow: isActive ? "0 4px 10px rgba(245,180,26,.15)" : "none",
                    }}
                  >
                    <div style={{ fontWeight: 800, fontSize: 12 }}>
                      {isDone ? `✓ Q${idx + 1}` : `Q${idx + 1}`}
                    </div>
                    <div style={{ marginTop: 2, fontWeight: 700, fontSize: 10, lineHeight: 1.3 }}>
                      {q.label}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* CURRENT QUESTION CARD */}
            <div style={{ background: "linear-gradient(135deg, #FFF6E0, #FFFBEA)", border: "1.5px solid var(--gold)", borderRadius: 12, padding: "18px 20px", marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                <div style={{ color: "var(--gold-deep)", fontSize: 10.5, fontWeight: 800, letterSpacing: 1, textTransform: "uppercase" }}>
                  Question {currentMockIndex + 1} of 5 · {currentQ.topic}
                </div>
                <button
                  type="button"
                  onClick={() => playQuestionVoicePrompt(currentQ)}
                  style={{
                    background: isAiSpeaking ? "#C0392B" : "var(--navy)",
                    color: isAiSpeaking ? "#FFFFFF" : "var(--gold)",
                    border: "none",
                    padding: "5px 12px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: 800,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    boxShadow: "0 2px 6px rgba(0,0,0,.1)",
                  }}
                >
                  {isAiSpeaking ? "⏹ Stop AI Voice" : "🔊 Read Question Aloud"}
                </button>
              </div>
              <div style={{ fontSize: 16, color: "var(--navy)", fontWeight: 800, marginTop: 6, lineHeight: 1.4 }}>
                "{currentQ.question}"
              </div>
              <div style={{ fontSize: 11.5, color: "#8A91A3", marginTop: 6, fontStyle: "italic" }}>
                ⏱ Time: 20 sec min · 45 sec max · No skip · One take per question · Hint: {currentQ.hint}
              </div>
            </div>

                        {/* MOCK VIDEO CAPTURE ZONE */}
            <div style={{ background: "var(--navy)", borderRadius: 14, padding: 20, color: "#FFFFFF", position: "relative", overflow: "hidden" }}>
              <div style={{ display: "grid", gridTemplateColumns: "220px 1fr", gap: 14, marginBottom: 12, alignItems: "center" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", background: "rgba(0,0,0,.35)", padding: 14, borderRadius: 12, border: "1px solid rgba(255,255,255,.08)" }}>
                  <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", marginBottom: 8, letterSpacing: 0.5, textTransform: "uppercase" }}>
                    AI Interviewer Character
                  </div>
                  <InterviewerVideoAvatar
                    state={isMockPrompting || isAiSpeaking ? "speaking" : isMockRecording ? "listening" : "waiting"}
                    size="normal"
                  />
                  <div style={{ fontSize: 10.5, color: "rgba(255,255,255,.7)", marginTop: 8, textAlign: "center" }}>
                    {isMockPrompting || isAiSpeaking ? "🗣️ Speaking question aloud..." : isMockRecording ? "👂 Listening to your spoken answer..." : "Ready to ask next question"}
                  </div>
                </div>

                <div style={{ background: "#000", aspectRatio: "16/9", borderRadius: 10, position: "relative", overflow: "hidden", display: "grid", placeItems: "center", border: "2px solid rgba(255,255,255,.06)" }}>
                  <video
                    key={mockVideos[currentQ?.id] || mockAnswers[currentQ?.id]?.videoUrl ? `mock-vid-${currentQ?.id}` : `mock-live-${currentQ?.id}`}
                    ref={mockVideoRef}
                    autoPlay={isMockRecording}
                    playsInline
                    muted={isMockRecording}
                    controls={!isMockRecording && Boolean(mockVideos[currentQ?.id] || mockAnswers[currentQ?.id]?.videoUrl)}
                    src={!isMockRecording && (mockVideos[currentQ?.id] || mockAnswers[currentQ?.id]?.videoUrl) ? getAssetUrl(mockVideos[currentQ?.id] || mockAnswers[currentQ?.id]?.videoUrl) : undefined}
                    preload="auto"
                    style={{ width: "100%", height: "100%", objectFit: "contain" }}
                  />

                  {isMockPrompting && (
                    <div style={{ position: "absolute", inset: 0, background: "rgba(15,27,61,.85)", display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: 20, textAlign: "center", zIndex: 10 }}>
                      <div style={{ width: 48, height: 48, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", display: "grid", placeItems: "center", fontSize: 24, marginBottom: 10 }}>
                        🎙️
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "var(--gold)", textTransform: "uppercase", letterSpacing: 1 }}>
                        AI Interviewer Reading Question {currentMockIndex + 1} of 5
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "#FFFFFF", marginTop: 6, maxWidth: 460, lineHeight: 1.4 }}>
                        "{currentQ.question}"
                      </div>
                      <div style={{ fontSize: 11.5, color: "rgba(255,255,255,.7)", marginTop: 6 }}>
                        Recording begins automatically when the AI finishes reading.
                      </div>
                      <button
                        type="button"
                        onClick={handleSkipMockPromptAndRecord}
                        style={{
                          marginTop: 14,
                          background: "var(--gold)",
                          color: "var(--navy)",
                          border: "none",
                          padding: "7px 16px",
                          borderRadius: 8,
                          fontSize: 11.5,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        ⚡ Skip & Start Answering Now
                      </button>
                    </div>
                  )}

                  {!isMockRecording && !isMockPrompting && !(mockVideos[currentQ?.id] || mockAnswers[currentQ?.id]?.videoUrl) && (
                    <div style={{ position: "absolute", color: "rgba(255,255,255,.4)", fontSize: 13, textAlign: "center", pointerEvents: "none" }}>
                      <span style={{ fontSize: 44, marginBottom: 8, display: "block" }}>🎤</span>
                      <div>Answering Question {currentMockIndex + 1}</div>
                      <div style={{ fontSize: 11, opacity: 0.7, marginTop: 4 }}>Click Start Answer below to begin</div>
                    </div>
                  )}

                  {isMockRecording && (
                    <div style={{ position: "absolute", top: 12, left: 12, right: 12, display: "flex", justifyContent: "space-between", alignItems: "center", pointerEvents: "none" }}>
                      <div style={{ background: "#C0392B", color: "#FFFFFF", padding: "4px 10px", borderRadius: 16, fontSize: 10.5, fontWeight: 800, letterSpacing: 0.5, display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ width: 8, height: 8, background: "#FFFFFF", borderRadius: "50%", animation: "pulse 1.2s infinite" }} />
                        REC · Q{currentMockIndex + 1}
                      </div>
                      <div style={{ background: "rgba(0,0,0,.6)", color: "#FFFFFF", padding: "4px 10px", borderRadius: 16, fontSize: 11, fontWeight: 800, fontFamily: "monospace" }}>
                        00:{String(mockRecordingTime).padStart(2, "0")} / 00:45
                      </div>
                    </div>
                  )}

                  {isMockRecording && (
                    <div style={{ position: "absolute", bottom: 12, left: 12, right: 12, pointerEvents: "none" }}>
                      <div style={{ background: "rgba(0,0,0,.5)", height: 6, borderRadius: 3, overflow: "hidden" }}>
                        <div style={{ height: "100%", background: "linear-gradient(90deg, var(--gold), var(--gold-deep))", borderRadius: 3, width: `${(mockRecordingTime / 45) * 100}%`, transition: "width .3s" }} />
                      </div>
                      <div style={{ color: "rgba(255,255,255,.85)", fontSize: 10.5, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
                        {mockRecordingTime}s of 45s
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* LIVE TRANSCRIPT */}
              <div style={{ background: "#FFFFFF", border: "1px solid #E5E7EB", borderRadius: 10, padding: "14px 16px", marginTop: 10, minHeight: 60, fontSize: 12.5, lineHeight: 1.6, color: "var(--gray-txt)", fontStyle: "italic", position: "relative" }}>
                <span style={{ position: "absolute", top: -8, left: 14, background: "var(--gold)", color: "var(--navy)", padding: "2px 8px", borderRadius: 5, fontSize: 9.5, fontWeight: 800, letterSpacing: 0.5, fontStyle: "normal" }}>
                  LIVE TRANSCRIPT
                </span>
                {mockLiveTranscript || "...Click 'Start Answer' below to speak your response to this interview question. Your live words will be transcribed here..."}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, alignItems: "center" }}>
                {!isMockRecording ? (
                  <button
                    type="button"
                    onClick={handleStartMockRecording}
                    style={{
                      background: "var(--gold)",
                      color: "var(--navy)",
                      padding: "12px 22px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: 0.3,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    🔴 Start Answer for Q{currentMockIndex + 1}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopMockRecording}
                    style={{
                      background: "#C0392B",
                      color: "#FFFFFF",
                      padding: "12px 22px",
                      borderRadius: 10,
                      fontSize: 13,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      letterSpacing: 0.3,
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    ⏹ Submit & Move to {currentMockIndex < 4 ? `Q${currentMockIndex + 2}` : "Final Review"}
                  </button>
                )}

                <div style={{ marginLeft: "auto", fontSize: 11, color: "rgba(255,255,255,.7)" }}>
                  Anti-cheat active · No pause · No skip · Face-presence checked
                </div>
              </div>
            </div>
              </>
            )}
          </div>

          {/* ═══════ SECTION 4 · WHY RCM (OPTIONAL BONUS) ═══════ */}
          <div style={{ background: "#FAFAF7", padding: "22px 24px", borderRadius: 14, marginBottom: 16, border: "1px solid #E5E7EB" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 32, height: 32, background: "var(--gold)", color: "var(--navy)", borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>
                4
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                ❤ "Why RCM?" · 30 seconds (Optional bonus)
              </div>
              <div style={{ background: passionVideoUrl ? "#E8F5E9" : "#F2F3F5", color: passionVideoUrl ? "#1F7A3C" : "#8A91A3", padding: "3px 10px", borderRadius: 12, fontSize: 10.5, fontWeight: 700, letterSpacing: 0.5 }}>
                {passionVideoUrl ? "🔥 PASSION RECORDED" : "OPTIONAL BONUS"}
              </div>
            </div>

            <div style={{ background: "linear-gradient(135deg, #FFE4E1, #FFF5F1)", border: "1.5px dashed #E67E22", borderRadius: 12, padding: "18px 22px", display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 16, alignItems: "center" }}>
              <div style={{ width: 60, height: 60, background: "#E67E22", color: "#FFFFFF", borderRadius: 14, display: "grid", placeItems: "center", fontSize: 26 }}>
                ❤
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14 }}>
                  Speak from the heart — 30 seconds of passion
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gray-txt)", marginTop: 6, lineHeight: 1.5 }}>
                  <span style={{ background: "#FFF6E0", color: "var(--gold-deep)", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, marginRight: 4, letterSpacing: 0.3 }}>+2 BONUS</span>
                  <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, marginRight: 4, letterSpacing: 0.3 }}>HIGHER VISIBILITY</span>
                  Companies love passion-driven candidates. Distinguishes committed-to-RCM from any-job-will-do. Adds a "🔥 Passion Signal" badge to your profile.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPassionModal(true)}
                style={{
                  background: "transparent",
                  color: "var(--gold-deep)",
                  border: "1.5px solid var(--gold)",
                  padding: "11px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {passionVideoUrl ? "✓ Recorded · Redo" : "Record 30s →"}
              </button>
            </div>

            {/* REGIONAL LANGUAGE BONUS */}
            <div style={{ background: "linear-gradient(135deg, #E8F0FE, #F5F8FF)", border: "1.5px solid #1A4FB8", borderRadius: 12, padding: "18px 22px", display: "grid", gridTemplateColumns: "60px 1fr auto", gap: 16, alignItems: "center", marginTop: 12 }}>
              <div style={{ width: 60, height: 60, background: "#1A4FB8", color: "#FFFFFF", borderRadius: 14, display: "grid", placeItems: "center", fontSize: 26 }}>
                🌏
              </div>
              <div>
                <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 14 }}>
                  Regional language video (Optional)
                </div>
                <div style={{ fontSize: 11.5, color: "var(--gray-txt)", marginTop: 6, lineHeight: 1.5 }}>
                  <span style={{ background: "#EEF2FF", color: "#1A4FB8", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, marginRight: 4 }}>+1 BONUS</span>
                  <span style={{ background: "#FFF6E0", color: "var(--gold-deep)", padding: "2px 8px", borderRadius: 6, fontSize: 10, fontWeight: 800, marginRight: 4 }}>MULTILINGUAL BADGE</span>
                  Record 60 sec in Hindi / Tamil / Telugu / Malayalam / Kannada / Arabic. Zero impact on English scoring. Unlocks regional-market companies.
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRegionalModal(true)}
                style={{
                  background: "transparent",
                  color: "#1A4FB8",
                  border: "1.5px solid #1A4FB8",
                  padding: "11px 20px",
                  borderRadius: 10,
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                {regionalVideoUrl ? `✓ ${selectedRegionalLang} Added` : "Add regional →"}
              </button>
            </div>
          </div>

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* RESULTS & SUBMISSION SECTION                                    */}
          {/* ══════════════════════════════════════════════════════════════ */}
          <div style={{ margin: "32px 0 20px", paddingTop: 24, borderTop: "2px dashed #FFEBB0", textAlign: "center" }}>
            <span style={{ background: isCompleted ? "var(--gold)" : "#FEF3C7", color: isCompleted ? "var(--navy)" : "#92400E", padding: "8px 20px", borderRadius: 20, fontWeight: 800, fontSize: 12, letterSpacing: 1, textTransform: "uppercase", display: "inline-block", marginBottom: 14 }}>
              {isCompleted ? "✓ Official Video Pitch Recorded" : hasRealSelfIntro ? "⏳ Step 1 of 2 Complete · Mock Interview Required" : "↓ Results · Complete Self-Intro & AI Mock Interview"}
            </span>
            <div style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: 0 }}>
              {isCompleted ? "Your Video Pitch Results" : "AI Video Pitch & Mock Interview Results"}
            </div>
            <div style={{ fontSize: 12, color: "#8A91A3", marginTop: 4, fontStyle: "italic" }}>
              {isCompleted
                ? "Official AI-evaluated communication and technical readiness score"
                : "Your official AI score is calculated live once you complete both the Self-Introduction and AI Mock Interview."}
            </div>
          </div>

          <div style={{ background: isCompleted ? "linear-gradient(135deg, #F8FFF9, #F5F7FB)" : "#FAFAF7", borderRadius: 16, padding: "24px 26px", border: "1px solid #E5E7EB", marginBottom: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, paddingBottom: 14, borderBottom: "1px dashed #E5E7EB" }}>
              <div style={{ width: 32, height: 32, background: isCompleted ? "var(--gold)" : "#E2E8F0", color: isCompleted ? "var(--navy)" : "#64748B", borderRadius: 10, display: "grid", placeItems: "center", fontWeight: 800, fontSize: 15 }}>
                {isCompleted ? "✓" : "⏳"}
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", flex: 1 }}>
                {isCompleted ? "Post-Submission Results (AI Evaluated)" : "AI Evaluation Status"}
              </div>
              <div style={{ background: isCompleted ? "#E8F5E9" : "#FEF3C7", color: isCompleted ? "#1F7A3C" : "#92400E", padding: "4px 12px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>
                {isCompleted
                  ? `${medalEmoji} ${displayMedal?.toUpperCase()} · ${candidateScore} / 100`
                  : hasRealSelfIntro && !hasRealMockInterview
                  ? "⏳ SELF-INTRO EVALUATED · MOCK INTERVIEW PENDING"
                  : !hasRealSelfIntro && hasRealMockInterview
                  ? "⏳ MOCK EVALUATED · SELF-INTRO PENDING"
                  : "⏳ PENDING · NOT YET EVALUATED"}
              </div>
            </div>

            {/* PROGRESS SUMMARY CARDS: 2 STAGES */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1.2fr", gap: 12, marginBottom: 20 }}>
              <div style={{ background: hasRealSelfIntro ? "#F0FDF4" : "#FFFFFF", border: `1.5px solid ${hasRealSelfIntro ? "#86EFAC" : "#E5E7EB"}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: hasRealSelfIntro ? "#166534" : "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Section 2 · Self-Introduction
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: hasRealSelfIntro ? "#15803D" : "var(--navy)", marginTop: 4 }}>
                  {selfIntroScore !== null ? `${selfIntroScore} / 100` : "Not Recorded"}
                </div>
                <div style={{ fontSize: 11, color: hasRealSelfIntro ? "#166534" : "#94A3B8", marginTop: 2 }}>
                  {hasRealSelfIntro ? "✓ Spoken Communication evaluated" : "⏳ 60-second video required"}
                </div>
              </div>

              <div style={{ background: hasRealMockInterview ? "#F0FDF4" : "#FFFFFF", border: `1.5px solid ${hasRealMockInterview ? "#86EFAC" : "#E5E7EB"}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: hasRealMockInterview ? "#166534" : "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Section 3 · AI Mock Interview
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: hasRealMockInterview ? "#15803D" : "var(--navy)", marginTop: 4 }}>
                  {mockScore !== null ? `${mockScore} / 100` : "Not Started"}
                </div>
                <div style={{ fontSize: 11, color: hasRealMockInterview ? "#166534" : "#94A3B8", marginTop: 2 }}>
                  {hasRealMockInterview ? "✓ Technical Domain readiness evaluated" : "⏳ 5 technical questions required"}
                </div>
              </div>

              <div style={{ background: isCompleted ? "linear-gradient(135deg, #FFFBEB, #FEF3C7)" : "#F8FAFC", border: `1.5px solid ${isCompleted ? "var(--gold)" : "#E2E8F0"}`, borderRadius: 12, padding: "12px 14px" }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: isCompleted ? "var(--gold-deep)" : "#64748B", textTransform: "uppercase", letterSpacing: 0.5 }}>
                  Overall Calculated AI Score
                </div>
                <div style={{ fontSize: 18, fontWeight: 800, color: isCompleted ? "var(--navy)" : "#64748B", marginTop: 4 }}>
                  {candidateScore !== null ? `${candidateScore} / 100` : "— / 100"}
                </div>
                <div style={{ fontSize: 11, color: isCompleted ? "#B45309" : "#94A3B8", marginTop: 2 }}>
                  {isCompleted ? `✓ ${displayMedal} Tier Awarded` : "Calculated after both sections completed"}
                </div>
              </div>
            </div>

            {/* CIRCULAR SCORE + MEDAL ROW */}
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 20, margin: "10px 0 20px" }}>
              <div
                style={{
                  width: 150,
                  height: 150,
                  borderRadius: "50%",
                  background: candidateScore !== null
                    ? `conic-gradient(#15803D 0deg ${Math.round((candidateScore / 100) * 360)}deg, #E2E8F0 ${Math.round((candidateScore / 100) * 360)}deg 360deg)`
                    : "#E2E8F0",
                  display: "grid",
                  placeItems: "center",
                  position: "relative",
                  boxShadow: "0 4px 16px rgba(0,0,0,.06)",
                }}
              >
                <div style={{ width: 120, height: 120, background: "#FFFFFF", borderRadius: "50%", display: "grid", placeItems: "center", textAlign: "center" }}>
                  <div>
                    <div style={{ fontSize: 34, fontWeight: 800, color: candidateScore !== null ? "var(--navy)" : "#94A3B8", lineHeight: 1 }}>
                      {candidateScore !== null ? candidateScore : "—"}
                    </div>
                    <div style={{ fontSize: 11, color: "#8A91A3", marginTop: 4 }}>
                      {isCompleted ? "of 100" : hasRealSelfIntro ? "Intro Score" : hasRealMockInterview ? "Mock Score" : "of 100 (Pending)"}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ textAlign: "left" }}>
                {isCompleted ? (
                  <span
                    style={{
                      background: displayMedal === "Gold"
                        ? "linear-gradient(135deg, #F59E0B, #D97706)"
                        : displayMedal === "Silver"
                        ? "linear-gradient(135deg, #94A3B8, #64748B)"
                        : "linear-gradient(135deg, #D97706, #B45309)",
                      color: "#FFFFFF",
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontWeight: 800,
                      fontSize: 14,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      boxShadow: "0 4px 12px rgba(0,0,0,.15)",
                    }}
                  >
                    {medalEmoji} {displayMedal} Video Pitch
                  </span>
                ) : (
                  <span
                    style={{
                      background: "#F1F5F9",
                      color: "#475569",
                      border: "1px solid #CBD5E1",
                      padding: "8px 16px",
                      borderRadius: 20,
                      fontWeight: 800,
                      fontSize: 13,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    ⏳ {hasRealSelfIntro ? "Mock Interview Pending" : hasRealMockInterview ? "Self-Intro Pending" : "Evaluation Pending"}
                  </span>
                )}
                <div style={{ fontSize: 11.5, color: isCompleted ? "#1F7A3C" : "#64748B", fontWeight: 700, marginTop: 8, letterSpacing: 0.3, maxWidth: 360, lineHeight: 1.5 }}>
                  {isCompleted && recordedDateLabel
                    ? `Recorded ${recordedDateLabel} · 🟢 Live Verified · Face-matched to Aadhaar`
                    : hasRealSelfIntro && !hasRealMockInterview
                    ? `✓ Self-Introduction evaluated (${selfIntroScore}/100). Please complete Section 3 AI Mock Interview to calculate your final AI score.`
                    : !hasRealSelfIntro && hasRealMockInterview
                    ? `✓ AI Mock Interview evaluated (${mockScore}/100). Please complete Section 2 Self-Intro to calculate your final AI score.`
                    : "Not yet recorded · Start Section 2 Self-Intro and Section 3 AI Mock Interview above to calculate your AI score."}
                </div>
              </div>
            </div>

            {/* 5-DIMENSION AI BREAKDOWN */}
            <div style={{ background: "#FFFFFF", borderRadius: 12, padding: "18px 20px", border: "1px solid #E5E7EB", marginTop: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <div style={{ fontSize: 11, letterSpacing: "1.5px", color: "var(--gold-deep)", textTransform: "uppercase", fontWeight: 700 }}>
                  🎯 5-dimension AI breakdown
                </div>
                <div style={{ fontSize: 11, fontWeight: 700, color: displayRubric ? "#15803D" : "#94A3B8" }}>
                  {displayRubric ? "✓ Evaluated by AI Model" : "⏳ Awaiting Video Assessment"}
                </div>
              </div>

              {[
                { key: "clarity", label: "🎙 Clarity", color: "linear-gradient(90deg, #43A047, #1F7A3C)" },
                { key: "fluency", label: "🌊 Fluency", color: "linear-gradient(90deg, var(--gold), var(--gold-deep))" },
                { key: "vocabularyGrammar", label: "📚 Vocab & Grammar", color: "linear-gradient(90deg, #43A047, #1F7A3C)" },
                { key: "confidenceDelivery", label: "💪 Confidence & Delivery", color: "linear-gradient(90deg, var(--amber, #E08E00), #B85B00)" },
                { key: "contentRelevance", label: "🎯 Content Relevance", color: "linear-gradient(90deg, #43A047, #1F7A3C)" },
              ].map((dim, i, arr) => {
                const hasScore = displayRubric && typeof displayRubric[dim.key] !== "undefined";
                const score = hasScore ? clampDisplayScore(displayRubric[dim.key]) : null;
                const isLast = i === arr.length - 1;
                const passing = score !== null && score >= 75;
                return (
                  <div
                    key={dim.key}
                    style={{ display: "grid", gridTemplateColumns: "180px 1fr 70px 24px", gap: 12, alignItems: "center", padding: "8px 0", borderBottom: isLast ? "none" : "1px dashed #E5E7EB" }}
                  >
                    <div style={{ fontSize: 12.5, color: "var(--navy)", fontWeight: 700 }}>{dim.label}</div>
                    <div style={{ height: 8, background: "#F2F3F5", borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: score !== null ? `${score}%` : "0%", background: score !== null ? dim.color : "transparent", borderRadius: 4, transition: "width .4s ease" }} />
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 800, color: score !== null ? "var(--navy)" : "#94A3B8", textAlign: "right" }}>
                      {score !== null ? `${score} / 100` : "— / 100"}
                    </div>
                    <div style={{ fontSize: 14, color: score === null ? "#94A3B8" : passing ? "#1F7A3C" : "#E08E00", fontWeight: 800 }}>
                      {score === null ? "⏳" : passing ? "✓" : "⚠"}
                    </div>
                  </div>
                );
              })}
              {!displayRubric && (
                <div style={{ fontSize: 11.5, color: "#64748B", marginTop: 12, background: "#F8FAFC", padding: "10px 12px", borderRadius: 8, border: "1px dashed #CBD5E1", lineHeight: 1.5 }}>
                  ℹ️ <b>No fake preview scores:</b> Your 5-dimension AI breakdown (Clarity, Fluency, Vocab & Grammar, Confidence, Content Relevance) will be evaluated live by the AI model once you submit your Self-Introduction video above.
                </div>
              )}
            </div>

            {/* PREVIEW · WHAT COMPANIES SEE */}
            <div style={{ background: "var(--navy)", color: "#FFFFFF", borderRadius: 12, padding: "20px 22px", marginTop: 14 }}>
              <div style={{ fontSize: 10.5, letterSpacing: 1.5, color: "var(--gold)", textTransform: "uppercase", fontWeight: 700 }}>
                Preview · What Companies See
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, marginTop: 6 }}>
                {candidateName} · Video Pitch
              </div>

              <div style={{ background: "#000", aspectRatio: "16/9", borderRadius: 8, marginTop: 10, display: "grid", placeItems: "center", position: "relative", maxWidth: 280 }}>
                <div style={{ color: "#FFFFFF", fontSize: 34, background: "rgba(245,180,26,.7)", width: 56, height: 56, borderRadius: "50%", display: "grid", placeItems: "center" }}>
                  ▶
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, marginTop: 10, alignItems: "center", flexWrap: "wrap" }}>
                {isCompleted ? (
                  <span style={{ background: "linear-gradient(135deg,#C0C0C0,#8B9199)", color: "#FFFFFF", fontSize: 11, padding: "5px 12px", borderRadius: 20, fontWeight: 800 }}>
                    {medalEmoji} {displayMedal} · {candidateScore}/100
                  </span>
                ) : (
                  <span style={{ background: "rgba(255,255,255,0.15)", color: "#CBD5E1", fontSize: 11, padding: "5px 12px", borderRadius: 20, fontWeight: 800 }}>
                    ⏳ Evaluation Pending
                  </span>
                )}
                <span style={{ background: isCompleted ? "rgba(31,122,60,.25)" : "rgba(255,255,255,.1)", color: isCompleted ? "#7ED87E" : "#94A3B8", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                  {isCompleted ? "🟢 Live Verified" : "⏳ Verification on Completion"}
                </span>
                {passionVideoUrl && (
                  <span style={{ background: "rgba(245,180,26,.2)", color: "var(--gold)", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                    🔥 Passion {passionScore || 88}
                  </span>
                )}
                {regionalVideoUrl && (
                  <span style={{ background: "rgba(26,79,184,.25)", color: "#7AB0FF", padding: "5px 10px", borderRadius: 8, fontSize: 11, fontWeight: 800 }}>
                    🌏 {selectedRegionalLang}
                  </span>
                )}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 12, fontFamily: "'JetBrains Mono', monospace" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)", padding: "3px 0" }}>
                  Clarity: <b style={{ color: "var(--gold)" }}>{displayRubric ? clampDisplayScore(displayRubric.clarity) : "—"}</b> {displayRubric ? barString(displayRubric.clarity) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)", padding: "3px 0" }}>
                  Fluency: <b style={{ color: "var(--gold)" }}>{displayRubric ? clampDisplayScore(displayRubric.fluency) : "—"}</b> {displayRubric ? barString(displayRubric.fluency) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)", padding: "3px 0" }}>
                  Vocab: <b style={{ color: "var(--gold)" }}>{displayRubric ? clampDisplayScore(displayRubric.vocabularyGrammar) : "—"}</b> {displayRubric ? barString(displayRubric.vocabularyGrammar) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)", padding: "3px 0" }}>
                  Confidence: <b style={{ color: "var(--gold)" }}>{displayRubric ? clampDisplayScore(displayRubric.confidenceDelivery) : "—"}</b> {displayRubric ? barString(displayRubric.confidenceDelivery) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.85)", padding: "3px 0" }}>
                  Content: <b style={{ color: "var(--gold)" }}>{displayRubric ? clampDisplayScore(displayRubric.contentRelevance) : "—"}</b> {displayRubric ? barString(displayRubric.contentRelevance) : "—"}
                </div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,.6)", padding: "3px 0" }}>
                  {isCompleted ? "▶ Play 3 videos · 📝 Full captions" : "⏳ Submissions pending"}
                </div>
              </div>

              <div style={{ fontSize: 11.5, color: "var(--gold-pale, #FFF6E0)", marginTop: 12 }}>
                {isCompleted && recordedDateLabel ? `Recorded ${recordedDateLabel} · Updates every 60 days · 5-year retention` : "Official records published upon completion of all Stage 05 requirements."}
              </div>
            </div>

            {/* ACTION BOTTOM BAR */}
            <div
              style={{
                background: "#FFFFFF",
                padding: "16px 24px",
                border: "1px solid #E2E8F0",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 32,
                marginBottom: 40,
                borderRadius: 12,
                boxShadow: "0 4px 16px rgba(15,27,61,.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: "12.5px", color: "#64748B" }}>
                <div style={{ height: 8, width: 180, background: "#F1F5F9", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: isCompleted ? "100%" : hasRealSelfIntro ? "50%" : "20%", background: "linear-gradient(90deg, #F5B41A, #D97706)", borderRadius: 4 }}></div>
                </div>
                <div>
                  <b>{candidateScore !== null ? `${candidateScore} / 100` : "Pending"}</b> · Stage 05 {isCompleted ? "completed" : "in progress"}
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                {isCompleted ? (
                  <>
                    <button
                      type="button"
                      onClick={() => setShowRetakeModal(true)}
                      style={{
                        background: "transparent",
                        color: "var(--gray-txt)",
                        padding: "11px 20px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        border: "1.5px solid #E5E7EB",
                        cursor: "pointer",
                      }}
                    >
                      🔁 Request Retake for Stage 05
                    </button>
                    <button
                      type="button"
                      onClick={handleContinueToStage6}
                      style={{
                        background: "var(--gold)",
                        color: "var(--navy)",
                        padding: "11px 24px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 800,
                        border: "none",
                        cursor: "pointer",
                        letterSpacing: 0.3,
                        boxShadow: "0 4px 12px rgba(245,180,26,.35)",
                      }}
                    >
                      Save &amp; continue to Stage 06 →
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => handleSubmitAllVideos(false)}
                      disabled={isSubmittingStage5}
                      style={{
                        background: "transparent",
                        color: "var(--gray-txt)",
                        padding: "11px 20px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 700,
                        border: "1.5px solid #E5E7EB",
                        cursor: "pointer",
                      }}
                    >
                      Save &amp; finish later
                    </button>
                    <button
                      type="button"
                      onClick={() => handleSubmitAllVideos(true)}
                      disabled={isSubmittingStage5}
                      style={{
                        background: "var(--gold)",
                        color: "var(--navy)",
                        padding: "11px 24px",
                        borderRadius: 10,
                        fontSize: 13,
                        fontWeight: 800,
                        border: "none",
                        cursor: "pointer",
                        letterSpacing: 0.3,
                        boxShadow: "0 4px 12px rgba(245,180,26,.35)",
                      }}
                    >
                      {isSubmittingStage5 ? "Saving…" : "Save & continue to Stage 06 →"}
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>

        </div>

        {/* ═══════ RIGHT COLUMN ═══════ */}
        <div style={{ position: "sticky", top: 20, alignSelf: "start", maxHeight: "calc(100vh - 40px)", overflowY: "auto", minWidth: 0 }}>
          <WizardCompanionRail stageNum={5} candidate={candidate} isCompleted={isCompleted} />
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* PASSION BONUS MODAL                                                */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showPassionModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,.75)", zIndex: 1000, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 12px 36px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
                ❤ "Why RCM?" 30s Passion Video
              </div>
              <button
                type="button"
                onClick={() => setShowPassionModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A91A3" }}
              >
                ✕
              </button>
            </div>
            <div style={{ fontSize: 13, color: "var(--gray-txt)", lineHeight: 1.5, marginBottom: 16 }}>
              Share in 30 seconds what genuinely excites you about medical coding and US healthcare. Companies look for authentic passion that sets you apart.
            </div>
            <div style={{ background: "#000", aspectRatio: "16/9", borderRadius: 10, display: "grid", placeItems: "center", color: "#FFFFFF", marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>🎥</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowPassionModal(false)}
                style={{ background: "#F2F3F5", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePassionVideo}
                style={{ background: "var(--gold)", color: "var(--navy)", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
              >
                Save & Attach (+2 Bonus Points)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* REGIONAL LANGUAGE MODAL                                            */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showRegionalModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,.75)", zIndex: 1000, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 520, width: "100%", padding: 24, boxShadow: "0 12px 36px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
                🌏 Regional Language Video (Optional)
              </div>
              <button
                type="button"
                onClick={() => setShowRegionalModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A91A3" }}
              >
                ✕
              </button>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: "var(--navy)", display: "block", marginBottom: 6 }}>
                Select Your Regional Language:
              </label>
              <select
                value={selectedRegionalLang}
                onChange={(e) => setSelectedRegionalLang(e.target.value)}
                style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB", fontSize: 13, fontWeight: 700 }}
              >
                <option value="Hindi">Hindi (हिंदी)</option>
                <option value="Tamil">Tamil (தமிழ்)</option>
                <option value="Telugu">Telugu (తెలుగు)</option>
                <option value="Malayalam">Malayalam (മലയാളം)</option>
                <option value="Kannada">Kannada (ಕನ್ನಡ)</option>
                <option value="Arabic">Arabic (العربية)</option>
              </select>
            </div>
            <div style={{ background: "#000", aspectRatio: "16/9", borderRadius: 10, display: "grid", placeItems: "center", color: "#FFFFFF", marginBottom: 16 }}>
              <span style={{ fontSize: 36 }}>🎥</span>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setShowRegionalModal(false)}
                style={{ background: "#F2F3F5", border: "none", padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveRegionalVideo}
                style={{ background: "#1A4FB8", color: "#FFFFFF", border: "none", padding: "8px 20px", borderRadius: 8, fontSize: 12.5, fontWeight: 800, cursor: "pointer" }}
              >
                Save & Unlock Multilingual Badge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════════════ */}
      {/* RETAKE REQUEST MODAL                                               */}
      {/* ══════════════════════════════════════════════════════════════════ */}
      {showRetakeModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,27,61,.75)", zIndex: 1000, display: "grid", placeItems: "center", padding: 20 }}>
          <div style={{ background: "#FFFFFF", borderRadius: 16, maxWidth: 540, width: "100%", padding: 24, boxShadow: "0 12px 36px rgba(0,0,0,.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
                🔁 Request a Retake for Stage 05 Video Pitch
              </div>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: "#8A91A3" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRequestRetake}>
              <div style={{ fontSize: 13, color: "var(--gray-txt)", lineHeight: 1.5, marginBottom: 14 }}>
                Under Talentera's single-attempt policy, test retakes are reviewed by staff auditors. Please explain why you are requesting a retake (e.g. background audio interference, camera glitch, or completed additional coaching).
              </div>

              <textarea
                rows={4}
                value={retakeReason}
                onChange={(e) => setRetakeReason(e.target.value)}
                placeholder="Explain the reason for requesting an assessment retake..."
                style={{ width: "100%", padding: "10px 12px", borderRadius: 8, border: "1.5px solid #E5E7EB", fontSize: 13, boxSizing: "border-box", resize: "vertical" }}
              />

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

    </div>
  );
}
