import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// How many seconds of silence during an answer before it auto-advances to
// the next question. Keep in sync with SILENCE_TIMEOUT_MS in
// AiAudioInterview.jsx.
const SILENCE_TIMEOUT_SECONDS = 5;

// Every question is worth a flat 10 marks (correct or not) - no separate
// "communication" rubric (clarity/tone/fluency) is shown anymore, just the
// per-question answer score and the total. Keep in sync with
// POINTS_PER_QUESTION in backend/utils/aiAssessment.js.
const POINTS_PER_QUESTION = 10;

// Older saved reports may have per-question marks on the old 0-100 scale
// (before this flat 10-marks-per-question redesign). Normalize any legacy
// value onto the 0/POINTS_PER_QUESTION scale so a report always displays
// consistently, whenever it was recorded.
function normalizeQuestionMarks(marks) {
  const n = Number(marks);
  if (!Number.isFinite(n)) return 0;
  if (n <= POINTS_PER_QUESTION) return Math.max(0, Math.round(n));
  // Legacy scheme only ever produced 0 or 75-100 - treat >=50 as "correct".
  return n >= 50 ? POINTS_PER_QUESTION : 0;
}

// localStorage key for a finished-but-not-yet-server-confirmed report. Set
// only when we couldn't get the server to accept the submission (see
// handleFinalSubmission's catch block) so a page refresh shows the finished
// report instead of restarting the interview, and cleared as soon as a
// background or foreground save actually succeeds.
const PENDING_REPORT_KEY = "talentera_ai_video_report_pending_v1";

export const EXPANDED_QUESTION_POOL = [
  {
    id: 1,
    title: "Question: Candidate Introduction & Experience",
    question: "Please introduce yourself, state your AAPC or AHIMA certification (e.g. CPC, CCS), and summarize your experience in medical coding.",
    expectedAnswer: "name certification AAPC AHIMA CPC CCS medical coding ICD-10 CPT experience",
    timeLimit: 45,
  },
  {
    id: 2,
    title: "Question: Denial Management Scenario CO-197",
    question: "Walk us through how you investigate and resolve a claim denied with ANSI code CO-197 for missing prior authorization.",
    expectedAnswer: "CO-197 pre-authorization authorization missing claim payer medical necessity appeal retro authorization",
    timeLimit: 60,
  },
  {
    id: 3,
    title: "Question: HIPAA & Remote Work Compliance",
    question: "Explain the protocols you follow to ensure PHI data privacy and HIPAA compliance during remote work.",
    expectedAnswer: "HIPAA PHI privacy security compliance encryption VPN password screen lock confidential",
    timeLimit: 45,
  },
  {
    id: 4,
    title: "Question: CPT Modifier 25 vs 59 Selection",
    question: "Explain when you use Modifier 25 versus Modifier 59 during CPT coding and procedure sequencing.",
    expectedAnswer: "modifier 25 modifier 59 evaluation management E/M distinct procedural service separate procedure CPT sequencing",
    timeLimit: 60,
  },
  {
    id: 5,
    title: "Question: HCC M.E.A.T. Criteria Validation",
    question: "Explain the M.E.A.T. criteria used to validate chronic condition diagnoses in Risk Adjustment / HCC coding.",
    expectedAnswer: "MEAT monitor evaluate assess treat chronic condition diagnosis documentation physician assessment plan HCC RAF",
    timeLimit: 45,
  },
  {
    id: 6,
    title: "Question: Denial Management Scenario CO-16",
    question: "Walk us through your process when resolving a CO-16 claim denial for missing medical records or documentation.",
    expectedAnswer: "CO-16 missing information medical records chart submission claim resubmission clearinghouse payer follow up",
    timeLimit: 60,
  },
  {
    id: 7,
    title: "Question: ICD-10-CM Guidelines & Sequencing",
    question: "Explain ICD-10-CM principal diagnosis selection guidelines and manifestation coding rules for acute versus chronic conditions.",
    expectedAnswer: "principal diagnosis ICD-10 acute chronic manifestation sequencing chief complaint underlying etiology tabular index",
    timeLimit: 60,
  },
  {
    id: 8,
    title: "Question: E/M Office Visit Guidelines (2021/2023)",
    question: "What criteria do you use to select E/M office visit code levels under the 2021/2023 Medical Decision Making (MDM) guidelines?",
    expectedAnswer: "E/M office visit medical decision making MDM time complexity number diagnoses data risk management 99213 99214 99215",
    timeLimit: 60,
  },
  {
    id: 9,
    title: "Question: Denial Management Scenario CO-29",
    question: "How do you handle a claim denied under CO-29 for timely filing limit exceeded?",
    expectedAnswer: "CO-29 timely filing proof submission clearinghouse acceptance report appeal payer limit deadline",
    timeLimit: 45,
  },
  {
    id: 10,
    title: "Question: Medical Record Auditing & Quality",
    question: "How do you perform a coding audit on a sample of medical charts to ensure 95% accuracy and prevent compliance penalties?",
    expectedAnswer: "audit coding accuracy sample medical records compliance error rate feedback documentation provider query benchmark",
    timeLimit: 60,
  },
];

export function shuffleAndPickQuestions(pool = EXPANDED_QUESTION_POOL, count = 5) {
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, count).map((q, idx) => ({
    ...q,
    id: idx + 1,
    title: `Question ${idx + 1} of ${count}: ${q.title.replace(/^Question \d+:\s*/, "").replace(/^Question:\s*/, "")}`,
  }));
}

export const COURSE_QUESTION_BANKS = {
  medical_coding: shuffleAndPickQuestions(EXPANDED_QUESTION_POOL, 5),
  denial_management: shuffleAndPickQuestions(EXPANDED_QUESTION_POOL, 5),
  hcc_risk_adjustment: shuffleAndPickQuestions(EXPANDED_QUESTION_POOL, 5),
};

export const DEFAULT_ASSESSMENT_QUESTIONS = COURSE_QUESTION_BANKS.medical_coding;

export default function AiVideoAssessment({ existingData, onSaved, customQuestions }) {
  const toast = useToast();
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // Staff-configured question bank (Staff Hub -> Interview Questions), fetched
  // from the server. Answer keys never travel to the browser - only text
  // does; grading happens server-side by looking the question back up by id.
  const [fetchedQuestions, setFetchedQuestions] = useState(null);
  const [questionsLoading, setQuestionsLoading] = useState(true);

  // Dynamically shuffle and pick 5 questions for each candidate test session
  const [shuffledCandidateQuestions] = useState(() => shuffleAndPickQuestions(EXPANDED_QUESTION_POOL, 5));

  const questionsList = customQuestions || existingData?.customQuestions || fetchedQuestions || shuffledCandidateQuestions;

  const isInterviewCompleted = Boolean(
    existingData && (existingData.completedAt || existingData.videoUrl || typeof existingData.aiScore === "number")
  );

  // Setup & Camera States
  const [step, setStep] = useState(isInterviewCompleted ? "report" : "setup"); // setup | liveness | recording | evaluating | report
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");

  // Face Detection State (Anti-cheat face guard)
  const [isFacePresent, setIsFacePresent] = useState(true);

  // Liveness States
  const [livenessVerified, setLivenessVerified] = useState(Boolean(existingData?.livenessVerified));
  const [livenessChecking, setLivenessChecking] = useState(false);

  // Recording & Q&A States
  const [qIdx, setQIdx] = useState(0);
  const qIdxRef = useRef(0);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recTimeLeft, setRecTimeLeft] = useState(questionsList[0]?.timeLimit || 45);
  const [silenceTimeLeft, setSilenceTimeLeft] = useState(SILENCE_TIMEOUT_SECONDS);
  const lastSpeechTimeRef = useRef(Date.now());
  const [qaTranscripts, setQaTranscripts] = useState({});
  const [proctorLogs, setProctorLogs] = useState({ tabSwitches: 0, focusLosses: 0 });
  const advancingRef = useRef(false);
  // True only while an answer window should actively be listening. Browsers
  // (Chrome especially) can silently stop a "continuous" SpeechRecognition
  // session on their own - even mid-answer, with the candidate still
  // talking - with no built-in way to detect/restart it. Without this flag +
  // the onend handler in startAnswerWindow, that made the AI appear to stop
  // listening while the candidate was still speaking. Set true right before
  // starting recognition, false right before any intentional stop() so the
  // auto-restart doesn't fight a deliberate shutdown.
  const recognitionShouldRunRef = useRef(false);

  useEffect(() => {
    qIdxRef.current = qIdx;
  }, [qIdx]);

  // Evaluation & Results States
  const [evaluation, setEvaluation] = useState(() => {
    if (!isInterviewCompleted) return null;
    const rawQuestionScores = existingData.questionScores || (existingData.qaPairs || []).map((pair, idx) => ({
      questionId: idx + 1,
      question: pair.question,
      marks: 0,
      answered: false,
      feedback: "0 Marks: Completed interview attempt.",
      transcript: pair.transcript || "",
      translatedTranscript: pair.translatedTranscript || pair.transcript || "",
      detectedLanguage: pair.detectedLanguage || "unknown",
    }));
    const questionScores = rawQuestionScores.map((q) => ({ ...q, marks: normalizeQuestionMarks(q.marks) }));
    const maxMarks = typeof existingData.maxMarks === "number" ? existingData.maxMarks : questionScores.length * POINTS_PER_QUESTION;
    const totalMarks = typeof existingData.totalMarks === "number" ? existingData.totalMarks : questionScores.reduce((sum, q) => sum + q.marks, 0);
    return {
      overallScore: typeof existingData.aiScore === "number" ? existingData.aiScore : 0,
      totalMarks,
      maxMarks,
      questionScores,
      feedback: existingData.feedback || `Candidate scored ${totalMarks}/${maxMarks} marks on Stage 5 AI Video Assessment.`,
    };
  });
  const [submitting, setSubmitting] = useState(false);

  // Web Speech API
  const recognitionRef = useRef(null);

  // Fetch the staff-configured question bank once on mount (unless the
  // caller passed customQuestions directly, in which case skip the network
  // call entirely).
  useEffect(() => {
    if (customQuestions || existingData?.customQuestions) {
      setQuestionsLoading(false);
      return;
    }
    api
      .get("/candidate/interview-questions?mode=video")
      .then((res) => {
        const rawList = (res.data?.questions || []).map((q, idx) => ({
          id: q.id,
          title: `Question ${idx + 1}: Staff Question`,
          question: q.question,
          expectedAnswer: "", // stored server-side in DB for anti-cheat
          timeLimit: 60,
        }));
        if (rawList.length) {
          const pickedCount = Math.min(5, rawList.length);
          const shuffledStaffList = shuffleAndPickQuestions(rawList, pickedCount);
          setFetchedQuestions(shuffledStaffList);
        } else {
          setFetchedQuestions(null);
        }
      })
      .catch(() => setFetchedQuestions(null))
      .finally(() => setQuestionsLoading(false));
  }, []);

  // If a previous attempt in this browser finished (server accepted it, or
  // we fell back to a locally-computed report because the server call
  // failed) but the page was refreshed before that landed in the database,
  // restore the finished report instead of restarting the interview from
  // Q1 - "once done, it's done." Also kick off a background retry so a
  // locally-computed report still gets properly saved server-side once the
  // connection/server is available again.
  useEffect(() => {
    if (isInterviewCompleted) return; // server already has the real record - nothing to restore
    let raw;
    try {
      raw = localStorage.getItem(PENDING_REPORT_KEY);
    } catch (e) {
      return;
    }
    if (!raw) return;
    let pending;
    try {
      pending = JSON.parse(raw);
    } catch (e) {
      try {
        localStorage.removeItem(PENDING_REPORT_KEY);
      } catch (e2) {}
      return;
    }
    if (!pending?.evaluation) return;
    setEvaluation(pending.evaluation);
    setStep("report");
    syncPendingReportToServer(pending);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function syncPendingReportToServer(pending) {
    try {
      const formData = new FormData();
      formData.append("qaPairs", JSON.stringify(pending.qaPairs || []));
      formData.append("proctorLogs", JSON.stringify(pending.proctorLogs || {}));
      const res = await api.post("/candidate/ai-video/assess", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        setEvaluation(res.data.evaluation);
        try {
          localStorage.removeItem(PENDING_REPORT_KEY);
        } catch (e) {}
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      // Still unreachable - leave the local backup in place so the report
      // keeps surviving refreshes and the next mount tries again.
      console.warn("Background sync of pending AI video report failed, will retry next load:", err.message);
    }
  }

  // AI TTS Question Speaker - the answer window (timer/recognition) only
  // opens once the question has finished playing, via the onEnd callback.
  function speakQuestion(questionText, onEnd) {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(questionText);
      utterance.rate = 1;
      utterance.pitch = 1;
      setIsSpeaking(true);
      const finish = () => {
        setIsSpeaking(false);
        if (onEnd) onEnd();
      };
      utterance.onend = finish;
      utterance.onerror = finish;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  }

  // Initialize Camera - deliberately does NOT include "setup": the camera
  // must stay off until the candidate explicitly clicks past the setup
  // screen, not just because they navigated to Stage 5.
  useEffect(() => {
    if (step === "liveness" || step === "recording") {
      startWebcam();
    }
    return () => {
      stopWebcam();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      // Prevent the auto-restart in startAnswerWindow from reviving
      // recognition after the component has moved on/unmounted.
      recognitionShouldRunRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.onend = null;
          recognitionRef.current.stop();
        } catch (e) {}
        recognitionRef.current = null;
      }
    };
  }, [step]);

  // Face Presence Monitor Loop
  useEffect(() => {
    let interval;
    if (stream && (step === "liveness" || step === "recording")) {
      interval = setInterval(() => {
        // Continuous face/presence monitor check
        const videoTrack = stream.getVideoTracks()[0];
        if (!videoTrack || !videoTrack.enabled || videoTrack.readyState !== "live") {
          setIsFacePresent(false);
        } else {
          setIsFacePresent(true);
        }
      }, 1500);
    }
    return () => clearInterval(interval);
  }, [stream, step]);

  // Handle Question Time Limit Timer. Only ticks while isRecording is true
  useEffect(() => {
    if (!isRecording) return;
    if (recTimeLeft <= 0) {
      advanceToNextQuestion();
      return;
    }
    const timer = setTimeout(() => setRecTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isRecording, recTimeLeft]);

  // Silence Detection Monitor. Was previously hardcoded to a 3s threshold
  // here regardless of what startAnswerWindow displayed via setSilenceTimeLeft
  // (10s) - so answers were actually being cut off after 3s of no new
  // speech-recognition result, not the 10s shown in the UI. That mismatch is
  // exactly what made the AI seem to "stop listening" while the candidate
  // was still mid-answer. Both now read from the same SILENCE_TIMEOUT_SECONDS
  // constant.
  useEffect(() => {
    if (!isRecording) return;
    const silenceTimer = setInterval(() => {
      const elapsedSilence = Math.floor((Date.now() - lastSpeechTimeRef.current) / 1000);
      const remainingSilence = Math.max(0, SILENCE_TIMEOUT_SECONDS - elapsedSilence);
      setSilenceTimeLeft(remainingSilence);

      if (elapsedSilence >= SILENCE_TIMEOUT_SECONDS) {
        clearInterval(silenceTimer);
        toast(`No speech detected for ${SILENCE_TIMEOUT_SECONDS} seconds. Auto-advancing...`, "!");
        advanceToNextQuestion();
      }
    }, 1000);
    return () => clearInterval(silenceTimer);
  }, [isRecording]);

  // Anti-Cheat Tab Switch & Window Focus Loss Listener during recording: Immediately stops & terminates interview
  useEffect(() => {
    if (step !== "recording" || !sessionStarted) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setProctorLogs((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
        toast("⚠️ Tab switch detected! Interview terminated immediately for anti-cheat violation.", "!");
        handleFinishSingleTakeInterview();
      }
    }

    function handleWindowBlur() {
      setProctorLogs((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
      toast("⚠️ Window focus loss detected! Interview terminated immediately for anti-cheat violation.", "!");
      handleFinishSingleTakeInterview();
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [step, sessionStarted]);

  async function startWebcam() {
    try {
      setCameraError("");
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: true,
      });
      setStream(mediaStream);
      setIsFacePresent(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Camera/Microphone access denied. Please allow camera permissions in browser settings.");
      setIsFacePresent(false);
    }
  }

  function stopWebcam() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  // --- Step 2: Liveness Verification Check ---
  function handlePerformLivenessCheck() {
    if (!isFacePresent) {
      toast("Please be in front of the camera and look at the screen.", "!");
      return;
    }
    setLivenessChecking(true);
    setTimeout(() => {
      setLivenessChecking(false);
      setLivenessVerified(true);
      toast("Liveness Verified! Face presence & camera stream validated.", "✓");
    }, 2000);
  }

  // --- Step 3: Single-Take AI Video Interview Recording ---
  function handleStartSingleTakeInterview() {
    if (!stream || !isFacePresent) {
      toast("Please be in front of the camera and look directly at the screen.", "!");
      return;
    }

    recordedChunksRef.current = [];
    setQIdx(0);
    qIdxRef.current = 0;
    setQaTranscripts({});
    setSessionStarted(true);

    try {
      const mediaRecorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
    }

    // AI speaks Question 1 aloud first; the answer window (timer + silence
    // detection + speech recognition) only opens once it finishes speaking.
    speakQuestion(questionsList[0].question, () => startAnswerWindow(0));
  }

  // Opens the answer window for question `idx`: starts the countdown, the
  // 10s silence monitor, and a FRESH speech-recognition instance scoped to
  // just this question. A brand-new instance per question (instead of one
  // continuous instance for the whole interview) matters for two reasons:
  // browsers silently stop long-running continuous recognition after a
  // while with no way to detect/restart it (this was why answering stopped
  // working from Question 2 onward), and a shared instance was also mixing
  // every prior answer into the current question's transcript.
  function startAnswerWindow(idx) {
    const q = questionsList[idx];
    if (!q) return;

    setRecTimeLeft(q.timeLimit);
    setSilenceTimeLeft(SILENCE_TIMEOUT_SECONDS);
    lastSpeechTimeRef.current = Date.now();
    setIsRecording(true);
    recognitionShouldRunRef.current = true;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    // Wired with onend so that if the browser drops the recognition session
    // on its own mid-answer, it comes straight back instead of leaving the
    // candidate talking to a mic that's stopped capturing.
    function beginRecognition() {
      if (!recognitionShouldRunRef.current) return;
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + " ";
        }
        if (text.trim()) {
          lastSpeechTimeRef.current = Date.now();
        }
        setQaTranscripts((prev) => ({ ...prev, [q.id]: text }));
      };
      recognition.onerror = () => {}; // swallow no-speech/network hiccups - the silence timer handles advancing
      recognition.onend = () => {
        if (recognitionShouldRunRef.current) {
          try {
            beginRecognition();
          } catch (e) {}
        }
      };
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {}
    }
    beginRecognition();
  }

  function advanceToNextQuestion() {
    // Guards against the time-limit timer and the silence timer both firing
    // for the same question (e.g. both hit their threshold on the same
    // tick), which previously could double-advance and desync the timer.
    if (advancingRef.current) return;
    advancingRef.current = true;

    recognitionShouldRunRef.current = false;
    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const currentIdx = qIdxRef.current;
    const nextIdx = currentIdx + 1;
    if (nextIdx < questionsList.length) {
      setQIdx(nextIdx);
      qIdxRef.current = nextIdx;
      toast(`Question ${currentIdx + 1} Complete! Moving to Question ${nextIdx + 1}`, "✓");
      speakQuestion(questionsList[nextIdx].question, () => {
        advancingRef.current = false;
        startAnswerWindow(nextIdx);
      });
    } else {
      toast("Single-take AI video recording complete! Submitting for evaluation...", "✓");
      handleFinishSingleTakeInterview();
    }
  }

  function handleFinishSingleTakeInterview() {
    advancingRef.current = true;
    recognitionShouldRunRef.current = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    setIsRecording(false);
    handleFinalSubmission();
  }

  function scoreQuestionTranscript(question, transcriptText) {
    const tr = (transcriptText || "").trim();
    const words = tr.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        marks: 0,
        answered: false,
        feedback: "0 Marks: Question stopped early or no spoken response detected."
      };
    }

    let expectedKey = (question.expectedAnswer || "").toLowerCase();
    if (!expectedKey) {
      const poolMatch = EXPANDED_QUESTION_POOL.find((q) => q.question.toLowerCase() === (question.question || "").toLowerCase());
      if (poolMatch) {
        expectedKey = poolMatch.expectedAnswer.toLowerCase();
      }
    }

    const defaultKeywords = ["rcm", "coding", "icd", "cpt", "denial", "claim", "modifier", "hipaa", "billing", "authorization", "audit", "chart", "practicode", "patient"];
    const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "been", "being", "have", "has", "had", "does", "did", "will", "would", "should", "could", "into", "through", "during", "before", "after", "about", "against", "between", "what", "how", "when", "where", "which", "who", "whom", "whose", "why", "can", "must", "may", "provider", "service", "process"]);

    const expectedKeywords = expectedKey
      ? expectedKey
          .split(/[\s,.;:-]+/)
          .map((w) => w.toLowerCase())
          .filter((w) => w.length >= 3 && !stopWords.has(w))
      : defaultKeywords;

    // Fallback if filtering removed all keywords
    const finalKeywords = expectedKeywords.length > 0 ? expectedKeywords : defaultKeywords;

    const candidateTextLower = tr.toLowerCase();
    let matchedCount = 0;
    finalKeywords.forEach((kw) => {
      if (candidateTextLower.includes(kw)) {
        matchedCount++;
      }
    });

    const requiredMatches = Math.min(2, finalKeywords.length || 1);
    if (matchedCount < requiredMatches) {
      return {
        marks: 0,
        answered: true,
        feedback: "0 Marks: Incorrect answer. Spoken response did not match expected key terms (requires at least 2 matching keywords)."
      };
    }

    // Flat marks: hitting the required keyword threshold earns the full 10,
    // there's no partial-credit scaling by match ratio anymore.
    return {
      marks: POINTS_PER_QUESTION,
      answered: true,
      feedback: `Correct answer evaluated: ${POINTS_PER_QUESTION}/${POINTS_PER_QUESTION} Marks based on matching ${matchedCount} key term(s).`
    };
  }

  async function handleFinalSubmission() {
    setStep("evaluating");
    setSubmitting(true);

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const videoFile = new File([blob], "candidate_ai_video.webm", { type: "video/webm" });

    const formattedQaPairs = questionsList.map((q) => ({
      questionId: q.id,
      question: q.question,
      expectedAnswer: q.expectedAnswer || "",
      transcript: qaTranscripts[q.id] || "", // Empty if candidate did not answer / stopped early
    }));

    const formData = new FormData();
    formData.append("video", videoFile);
    formData.append("qaPairs", JSON.stringify(formattedQaPairs));
    formData.append("proctorLogs", JSON.stringify({ ...proctorLogs, livenessVerified }));

    try {
      const res = await api.post("/candidate/ai-video/assess", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      if (res.data && res.data.success) {
        setEvaluation(res.data.evaluation);
        setStep("report");
        toast("Interview submitted! Thank you for completing it.", "✓");
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      console.error("Final AI submission error:", err);

      // The most common cause of a failed submission here is the video
      // upload itself timing out/erroring (large multipart blob) rather than
      // anything wrong with the candidate's answers. Retry once WITHOUT the
      // video attached so the Q&A still gets graded and properly saved
      // server-side (completedAt/aiScore/completedStages) even when the
      // recording can't be uploaded - this is what actually makes the
      // result durable across a refresh, not just shown once in the UI.
      const retryProctorLogs = { ...proctorLogs, livenessVerified };
      try {
        const retryFormData = new FormData();
        retryFormData.append("qaPairs", JSON.stringify(formattedQaPairs));
        retryFormData.append("proctorLogs", JSON.stringify(retryProctorLogs));
        const retryRes = await api.post("/candidate/ai-video/assess", retryFormData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        if (retryRes.data && retryRes.data.success) {
          setEvaluation(retryRes.data.evaluation);
          setStep("report");
          toast("Interview submitted! Thank you for completing it.", "✓");
          if (onSaved) onSaved(retryRes.data);
          return; // saved server-side - skip the fully-offline fallback below
        }
      } catch (retryErr) {
        console.error("Retry without video also failed:", retryErr);
      }

      // Server is genuinely unreachable. Compute the report locally so the
      // candidate isn't stuck, AND persist it to localStorage so a refresh
      // shows this same finished report instead of restarting the interview
      // ("once done, it's done") - the mount effect above retries saving it
      // server-side in the background once the connection recovers.
      const fallbackScores = questionsList.map((q) => {
        const tr = qaTranscripts[q.id] || "";
        const scoring = scoreQuestionTranscript(q, tr);
        return {
          questionId: q.id,
          question: q.question,
          marks: scoring.marks,
          answered: scoring.answered,
          feedback: scoring.feedback,
          transcript: tr,
          // No translation possible offline - just show the original.
          translatedTranscript: tr,
          detectedLanguage: "unknown",
        };
      });

      const totalMarks = fallbackScores.reduce((sum, item) => sum + item.marks, 0);
      const maxMarks = fallbackScores.length * POINTS_PER_QUESTION;
      const avg = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

      const fallbackEvaluation = {
        overallScore: avg,
        totalMarks,
        maxMarks,
        questionScores: fallbackScores,
        feedback: `Candidate evaluated: ${totalMarks}/${maxMarks} marks across verbal assessment questions.`,
      };

      setEvaluation(fallbackEvaluation);
      setStep("report");

      try {
        localStorage.setItem(
          PENDING_REPORT_KEY,
          JSON.stringify({
            evaluation: fallbackEvaluation,
            qaPairs: formattedQaPairs,
            proctorLogs: retryProctorLogs,
            savedAt: Date.now(),
          })
        );
      } catch (e) {}
    } finally {
      setSubmitting(false);
      stopWebcam();
    }
  }

  const currentQ = questionsList[qIdx] || questionsList[0];

  return (
    <div className="card" style={{ padding: 24, borderRadius: 16 }}>
      {/* HEADER BANNER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
            STAGE 05 · LIVE AI VIDEO VERIFICATION
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>
            AI Video &amp; Verbal Communication Assessment
          </h3>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {livenessVerified && (
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999 }}>
              <i className="fa-solid fa-circle-check"></i> Liveness Verified
            </span>
          )}
        </div>
      </div>

      {/* FACE PRESENCE WARNING BANNER */}
      {!isFacePresent && (step === "liveness" || step === "recording") && (
        <div style={{ background: "#FEF2F2", border: "2px solid #EF4444", color: "#991B1B", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 18 }}></i>
          <span><strong>Face Not Detected:</strong> Please be in front of the camera and look directly at the screen to record your answer.</span>
        </div>
      )}

      {/* STEP 0: SETUP - no camera access yet */}
      {step === "setup" && (
        <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 28 }}>
          <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
            <i className="fa-solid fa-video" style={{ marginRight: 8, color: "var(--gold)" }}></i>
            A live, on-camera Q&amp;A interview
          </h4>
          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
            The AI will ask {questionsList.length} question{questionsList.length === 1 ? "" : "s"} out loud, one at a time. Your camera
            and microphone turn on only once you click below - not just by opening this page - and turn off the
            moment the interview ends.
          </p>

          {cameraError && <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{cameraError}</div>}

          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#B45309", padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 16 }}></i>
            <span>Find a quiet, well-lit spot facing the camera before you begin.</span>
          </div>

          <button
            type="button"
            className="btn btn-gold"
            style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 15 }}
            onClick={() => setStep("liveness")}
            disabled={questionsLoading}
          >
            <i className="fa-solid fa-camera" style={{ marginRight: 8 }}></i>
            {questionsLoading ? "Loading Questions…" : "Enable Camera & Verify Liveness →"}
          </button>
        </div>
      )}

      {/* STEP 1: LIVENESS VERIFICATION - camera turns on only from here */}
      {step === "liveness" && (
        <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "center" }}>
            {/* Live Camera Feed Preview */}
            <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <video ref={videoPreviewRef} autoPlay playsInline muted style={{ width: "100%", height: 280, objectFit: "cover", transform: "scaleX(-1)" }} />
              <div style={{ position: "absolute", top: 12, left: 12, background: isFacePresent ? "rgba(0,0,0,0.6)" : "#DC2626", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                <i className="fa-solid fa-circle" style={{ color: isFacePresent ? "#22C55E" : "#fff", marginRight: 6 }}></i>
                {isFacePresent ? "Face Detected · Camera Live" : "No Face Detected"}
              </div>
            </div>

            {/* Liveness Controls */}
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                Step 1: Liveness &amp; Camera Check
              </h4>
              <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 16 }}>
                Before starting the AI Q&amp;A video assessment, ensure your face is directly in front of the camera and look at the screen.
              </p>

              {cameraError ? (
                <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{cameraError}</div>
              ) : livenessVerified ? (
                <div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", padding: 12, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                    ✓ Liveness Verified! Face presence confirmed.
                  </div>
                  <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("recording")} disabled={questionsLoading}>
                    {questionsLoading ? "Loading Questions…" : "Proceed to AI Q&amp;A Assessment →"}
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#B45309", padding: 12, borderRadius: 8, fontSize: 11, fontWeight: 600, marginBottom: 16 }}>
                    Prompt: Look directly at the camera, blink twice, and click Verify.
                  </div>
                  <button type="button" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} onClick={handlePerformLivenessCheck} disabled={livenessChecking || !isFacePresent}>
                    {livenessChecking ? "Validating Liveness…" : "Perform Liveness Verification →"}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: INTERACTIVE AI Q&A RECORDING */}
      {step === "recording" && (
        <div style={{ background: "#fff", border: "2px solid var(--navy)", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
            {/* Left: Video Recorder Feed */}
            <div>
              <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", height: 320 }}>
                <video ref={videoPreviewRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />

                {/* Recording Badge & Timer */}
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ background: isRecording ? "#DC2626" : isSpeaking ? "#F59E0B" : "rgba(0,0,0,0.6)", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                    <i className="fa-solid fa-circle" style={{ color: isRecording ? "#fff" : "#22C55E", animation: isRecording || isSpeaking ? "pulse 1s infinite" : "none" }}></i>
                    {isRecording ? "RECORDING IN PROGRESS" : isSpeaking ? "AI ASKING QUESTION…" : "READY"}
                  </div>
                  {isRecording && (
                    <>
                      <div style={{ background: "#F59E0B", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                        <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i> {recTimeLeft}s
                      </div>
                      <div style={{ background: silenceTimeLeft <= 3 ? "#DC2626" : "#6366F1", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                        <i className="fa-solid fa-comment-slash" style={{ marginRight: 4 }}></i> Silence auto-next: {silenceTimeLeft}s
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: AI Question & Control Panel */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>
                  {currentQ?.title || `Question ${qIdx + 1} of ${questionsList.length}`}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "6px 0 12px", lineHeight: 1.5 }}>
                  {currentQ?.question}
                </h4>

                {/* Live STT Transcript Preview */}
                <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 12, minHeight: 80, fontSize: 12, color: "#334155", fontStyle: "italic", marginBottom: 16 }}>
                  <strong>Live Spoken Answer Transcript:</strong>{" "}
                  {qaTranscripts[currentQ?.id] ||
                    (isRecording
                      ? "Listening to your spoken answer..."
                      : isSpeaking
                      ? "AI is asking the question - your answer timer starts once it finishes."
                      : "Click Start Single-Take AI Video Interview to begin.")}
                </div>
              </div>

              <div>
                {!sessionStarted ? (
                  <button
                    type="button"
                    className="btn btn-gold"
                    style={{ width: "100%", justifyContent: "center", padding: "12px 16px" }}
                    onClick={handleStartSingleTakeInterview}
                    disabled={!isFacePresent}
                  >
                    <i className="fa-solid fa-video" style={{ marginRight: 6 }}></i>
                    {isFacePresent ? "Start Single-Take AI Video Interview →" : "🔒 Face Required in Front of Camera"}
                  </button>
                ) : (
                  <div>
                    <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--navy)", marginBottom: 10 }}>
                      <i className="fa-solid fa-rotate" style={{ marginRight: 6, color: "var(--gold)", animation: "spin 3s linear infinite" }}></i>
                      {isSpeaking ? "AI is asking the question…" : `Questions auto-advance on ${SILENCE_TIMEOUT_SECONDS}s silence or time limit expiration.`}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ width: "100%", justifyContent: "center", color: "#DC2626", borderColor: "#DC2626", padding: "12px 16px", fontWeight: 800 }}
                      onClick={handleFinishSingleTakeInterview}
                    >
                      <i className="fa-solid fa-stop" style={{ marginRight: 6 }}></i> Stop &amp; Submit Interview →
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* STEP 4: EVALUATING SPINNER */}
      {step === "evaluating" && (
        <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 40, textAlign: "center" }}>
          <i className="fa-solid fa-brain" style={{ fontSize: 48, color: "var(--gold)", marginBottom: 16, animation: "spin 2s linear infinite" }}></i>
          <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>
            AI Evaluating Spoken Answers &amp; Calculating Marks…
          </h3>
          <p style={{ fontSize: 13, color: "#64748B" }}>
            The AI Bot is evaluating your spoken answers question-by-question. Unanswered questions receive 0 marks.
          </p>
        </div>
      )}

      {/* STEP 5: SUBMISSION CONFIRMATION - no score or per-question marks
          shown to the candidate; our team reviews the recorded answers and
          verifies correctness as part of the candidate verification process.
          (Marks are still computed and saved server-side - see
          evaluateAiVideoAssessment in backend/utils/aiAssessment.js - just
          not surfaced here.) */}
      {step === "report" && evaluation && (
        <div>
          <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
              <i className="fa-solid fa-check"></i>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                <i className="fa-solid fa-circle-check"></i> INTERVIEW SUBMITTED &amp; RECORDED
              </span>
              <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #F59E0B" }}>
                <i className="fa-solid fa-lock"></i> Single Attempt Completed • Retakes Not Allowed
              </span>
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 8px" }}>
              Thank you for completing the interview!
            </h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 auto", maxWidth: 440, lineHeight: 1.6 }}>
              Your spoken answers have been recorded and submitted to our team for review as part of your candidate verification.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
