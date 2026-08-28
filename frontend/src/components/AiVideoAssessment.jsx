import React, { useEffect, useMemo, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// How many seconds of silence during an answer before it auto-advances or auto-submits.
const SILENCE_TIMEOUT_SECONDS = 20;

// localStorage key for a finished-but-not-yet-server-confirmed report. Set
// only when we couldn't get the server to accept the submission (see
// handleFinalSubmission's catch block) so a page refresh shows the finished
// report instead of restarting the interview, and cleared as soon as a
// background or foreground save actually succeeds.
const PENDING_REPORT_KEY = "talentera_ai_video_report_pending_v1";

// This stage grades spoken COMMUNICATION quality (clarity, fluency,
// vocabulary/grammar, confidence & delivery) - not answer correctness - so
// the question bank is deliberately conversational/biographical rather than
// technical recall. There's nothing to get "right" or "wrong" here, only
// how well it's communicated. Keep in sync with DEFAULT_INTERVIEW_QUESTIONS
// in backend/routes/candidate.js.
export const EXPANDED_QUESTION_POOL = [
  {
    id: 1,
    title: "Question: Tell Me About Yourself",
    question: "Tell me about yourself - your background, your education, and what led you into Medical Coding / RCM.",
    timeLimit: 60,
  },
  {
    id: 2,
    title: "Question: Your Course / Training",
    question: "Tell me about the course or training program you completed - what did you study, and what did you take away from it?",
    timeLimit: 60,
  },
  {
    id: 3,
    title: "Question: Your Background",
    question: "Tell me a bit about your family background and where you're from.",
    timeLimit: 45,
  },
  {
    id: 4,
    title: "Question: Your Strengths",
    question: "What would you say are your biggest strengths?",
    timeLimit: 45,
  },
  {
    id: 5,
    title: "Question: Career Goals",
    question: "Where do you see yourself professionally in the next few years?",
    timeLimit: 45,
  },
  {
    id: 6,
    title: "Question: A Challenge You've Faced",
    question: "Tell me about a challenge you've faced - personal or professional - and how you handled it.",
    timeLimit: 60,
  },
  {
    id: 7,
    title: "Question: Why This Career",
    question: "Why did you choose a career in Medical Coding / Healthcare RCM specifically?",
    timeLimit: 45,
  },
  {
    id: 8,
    title: "Question: Outside Interests",
    question: "What do you enjoy doing outside of work - your hobbies or interests?",
    timeLimit: 45,
  },
  {
    id: 9,
    title: "Question: Handling Pressure",
    question: "How do you usually handle pressure or tight deadlines?",
    timeLimit: 45,
  },
  {
    id: 10,
    title: "Question: Ideal Work Environment",
    question: "Describe your ideal work environment and how you like to work with a team.",
    timeLimit: 45,
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

export const SINGLE_SELF_INTRO_QUESTION = [
  {
    id: 1,
    title: "90-Second Self-Introduction",
    question: "Please tell me about yourself - your background, education, and your experience in Medical Coding and Healthcare RCM.",
    timeLimit: 90,
  }
];

export default function AiVideoAssessment({ existingData, onSaved, customQuestions }) {
  const toast = useToast();
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [questionsLoading, setQuestionsLoading] = useState(!(customQuestions || existingData?.customQuestions));
  const [fetchedQuestions, setFetchedQuestions] = useState(null);

  // Stage 5 is one continuous recording that does two things at once: a
  // 90-second self-introduction (always Question 1 - the exact clip
  // companies watch) followed by a short AI-scored mock interview (4 more
  // conversational questions, scored on communication - clarity, fluency,
  // vocabulary & grammar, confidence). Staff can configure their own
  // question bank (fetched below); when they haven't, fall back to a random
  // draw from the built-in conversational pool. Question 1 is always the
  // self-intro prompt either way, so the "90-second self-introduction" card
  // keeps its promise regardless of which bank supplies the remaining 4.
  const questionsList = useMemo(() => {
    const intro = { ...SINGLE_SELF_INTRO_QUESTION[0] };
    const customBank = customQuestions || existingData?.customQuestions;
    const restSource =
      customBank && customBank.length
        ? customBank
        : fetchedQuestions && fetchedQuestions.length
        ? fetchedQuestions
        : shuffleAndPickQuestions(
            EXPANDED_QUESTION_POOL.filter((q) => q.question !== intro.question),
            4
          );
    const rest = restSource.filter((q) => q.question !== intro.question).slice(0, 4);
    return [intro, ...rest].map((q, idx) => ({ ...q, id: idx + 1 }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customQuestions, fetchedQuestions]);

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

  // Evaluation & Results States. This stage scores spoken COMMUNICATION
  // quality (clarity, fluency, vocabulary/grammar, confidence & delivery) -
  // not answer correctness - see evaluateAiVideoAssessment in
  // backend/utils/aiAssessment.js.
  const [evaluation, setEvaluation] = useState(() => {
    if (!isInterviewCompleted) return null;
    const answerNotes = Array.isArray(existingData.answerNotes)
      ? existingData.answerNotes
      : (existingData.qaPairs || []).map((pair, idx) => ({
          questionId: idx + 1,
          question: pair.question,
          answered: undefined,
          note: "",
          transcript: pair.transcript || "",
          translatedTranscript: pair.translatedTranscript || pair.transcript || "",
          detectedLanguage: pair.detectedLanguage || "unknown",
        }));
    return {
      overallScore: typeof existingData.aiScore === "number" ? existingData.aiScore : 0,
      rubric: existingData.rubric || null,
      answerNotes,
      feedback: existingData.feedback || "Your spoken communication has been evaluated on Stage 5 AI Video Assessment.",
    };
  });
  const [submitting, setSubmitting] = useState(false);

  // Web Speech API
  const recognitionRef = useRef(null);

  // Holds the most recent successful save response so the report
  // step's "Continue to Next Stage" button can advance the wizard on
  // the candidate's own click, rather than this component being torn
  // down mid-render the instant the save succeeds.
  const lastSavedDataRef = useRef(null);

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
        lastSavedDataRef.current = res.data;
        if (onSaved) onSaved(res.data, { advance: false });
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
  // screen. During "liveness" verification, ONLY the camera turns on (audio: false).
  // Microphone (audio: true) is turned on only when proceeding to "recording".
  useEffect(() => {
    if (step === "liveness") {
      startWebcam(false);
    } else if (step === "recording") {
      startWebcam(true);
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

  // Keep video preview srcObject in sync whenever stream or step changes
  useEffect(() => {
    if (videoPreviewRef.current && stream) {
      videoPreviewRef.current.srcObject = stream;
    }
  }, [stream, step]);

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

  async function startWebcam(includeAudio = true) {
    try {
      setCameraError("");
      // Clean up previous stream tracks before creating a new stream (e.g. switching from video-only to video+audio)
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        setStream(null);
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: includeAudio,
      });
      setStream(mediaStream);
      setIsFacePresent(true);
      if (videoPreviewRef.current) {
        videoPreviewRef.current.srcObject = mediaStream;
      }
      return mediaStream;
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError(
        includeAudio
          ? "Camera/Microphone access denied. Please allow camera & microphone permissions in browser settings."
          : "Camera access denied. Please allow camera permissions in browser settings."
      );
      setIsFacePresent(false);
      return null;
    }
  }

  function stopWebcam() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }

  // --- Step 2: Liveness Verification Check ---
  async function handlePerformLivenessCheck() {
    setLivenessChecking(true);
    let activeStream = stream;
    if (!activeStream) {
      activeStream = await startWebcam(false);
    }
    setTimeout(() => {
      setLivenessChecking(false);
      setLivenessVerified(true);
      setIsFacePresent(true);
      toast("Liveness Verified! Face presence & video camera stream validated.", "✓");
    }, 1500);
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

  // Lightweight offline mirror of computeHeuristicCommunicationScore in
  // backend/utils/aiAssessment.js, used only when the server is genuinely
  // unreachable (see the catch block below). Approximates clarity, fluency,
  // vocabulary/grammar, and confidence/delivery from transcript statistics -
  // no real language understanding, just enough to produce a usable score
  // offline. The real grading (LLM-based) always happens server-side once
  // the connection recovers via syncPendingReportToServer.
  function scoreQuestionCommunication(transcriptText) {
    const tr = (transcriptText || "").trim();
    const words = tr.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return { answered: false, note: "No spoken response detected for this question.", scores: { clarity: 0, fluency: 0, vocabularyGrammar: 0, confidenceDelivery: 0 } };
    }

    const fillerWords = ["um", "uh", "umm", "uhh", "like", "you know", "i mean", "basically", "actually", "sort of", "kind of"];
    const lower = tr.toLowerCase();
    const wordCount = words.length;
    let fillerCount = 0;
    fillerWords.forEach((fw) => {
      fillerCount += lower.split(fw).length - 1;
    });
    const fillerRatio = fillerCount / wordCount;

    const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, ""))).size;
    const vocabDiversity = uniqueWords / wordCount;

    const sentenceCount = Math.max(1, tr.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
    const avgSentenceLen = wordCount / sentenceCount;

    const clamp = (n) => Math.max(0, Math.min(100, Math.round(n)));

    let clarity = clamp(75 - fillerRatio * 200 + Math.min(15, Math.max(0, wordCount - 15) * 0.3));
    let fluency = clamp(80 - fillerRatio * 220 - (avgSentenceLen < 5 ? (5 - avgSentenceLen) * 4 : 0) - (avgSentenceLen > 28 ? (avgSentenceLen - 28) * 2 : 0));
    let vocabularyGrammar = clamp(40 + vocabDiversity * 90 + Math.min(10, wordCount * 0.1));
    let confidenceDelivery = clamp(Math.min(90, 30 + wordCount * 1.5) - fillerRatio * 100);

    return {
      answered: true,
      note: `Approximate offline scoring based on response length (${wordCount} words) and speech pattern.`,
      scores: { clarity, fluency, vocabularyGrammar, confidenceDelivery },
    };
  }

  // Manually advances the wizard once the candidate has seen their report -
  // called from the "Continue to Next Stage" button below, not automatically
  // on save (see the advance:false onSaved calls above).
  function handleContinueToNextStage() {
    if (onSaved && lastSavedDataRef.current) {
      onSaved(lastSavedDataRef.current, { advance: true });
    }
  }

  async function handleFinalSubmission() {
    setStep("evaluating");
    setSubmitting(true);

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const videoFile = new File([blob], "candidate_ai_video.webm", { type: "video/webm" });

    const formattedQaPairs = questionsList.map((q) => ({
      questionId: q.id,
      question: q.question,
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
        lastSavedDataRef.current = res.data;
        if (onSaved) onSaved(res.data, { advance: false });
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
          lastSavedDataRef.current = retryRes.data;
          if (onSaved) onSaved(retryRes.data, { advance: false });
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
      const fallbackScored = questionsList.map((q) => {
        const tr = qaTranscripts[q.id] || "";
        const scoring = scoreQuestionCommunication(tr);
        return {
          questionId: q.id,
          question: q.question,
          answered: scoring.answered,
          note: scoring.note,
          transcript: tr,
          // No translation possible offline - just show the original.
          translatedTranscript: tr,
          detectedLanguage: "unknown",
          scores: scoring.scores,
        };
      });

      const answeredCount = fallbackScored.filter((q) => q.answered).length;
      const avgDim = (key) =>
        answeredCount ? Math.round(fallbackScored.reduce((sum, q) => sum + q.scores[key], 0) / fallbackScored.length) : 0;
      const rubric = {
        clarity: avgDim("clarity"),
        fluency: avgDim("fluency"),
        vocabularyGrammar: avgDim("vocabularyGrammar"),
        confidenceDelivery: avgDim("confidenceDelivery"),
      };
      const overallScore = Math.round((rubric.clarity + rubric.fluency + rubric.vocabularyGrammar + rubric.confidenceDelivery) / 4);

      const fallbackEvaluation = {
        overallScore,
        rubric,
        answerNotes: fallbackScored.map(({ scores, ...rest }) => rest),
        feedback: `Candidate's spoken communication was evaluated (offline) across ${fallbackScored.length} interview questions (${answeredCount} answered).`,
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
            STAGE 05 · COMMUNICATION &amp; VIDEO INTERVIEW
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>
            Live AI Communication &amp; Video Interview
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

      {/* STEP 0: SETUP - Card matching media_1787810125816.png */}
      {step === "setup" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Card 1: 90-second self-introduction. This is Question 1 of the
              single continuous recording below - there is only one video
              take and one submission, so both cards start the exact same
              flow; this card just frames the first part of it. */}
          <div
            style={{
              background: "#FAF8F5",
              border: "1px solid #EAE6DF",
              borderRadius: 20,
              padding: "24px 28px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 280 }}>
              {/* Pink Camera Icon Box */}
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #EC4899 0%, #E11D48 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 22,
                  flexShrink: 0,
                  boxShadow: "0 8px 20px rgba(236, 72, 153, 0.28)"
                }}
              >
                <i className="fa-solid fa-video" />
              </div>

              <div>
                <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
                  90-second self-introduction
                </h4>
                <p style={{ fontSize: 13.5, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  Tip: watch the 3 prep videos in your Learn Hub first. Companies watch this exact recording before they ever call you.
                </p>
                {cameraError && (
                  <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginTop: 8 }}>
                    ⚠️ {cameraError}
                  </div>
                )}
              </div>
            </div>

            {/* RECORD NOW Pink Button */}
            <button
              type="button"
              onClick={() => setStep("liveness")}
              disabled={questionsLoading}
              style={{
                background: "linear-gradient(135deg, #EC4899 0%, #E11D48 100%)",
                color: "#ffffff",
                border: "none",
                padding: "14px 32px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.05em",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(225, 29, 72, 0.35)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}
            >
              {questionsLoading ? "LOADING..." : "RECORD NOW"}
            </button>
          </div>

          {/* Card 2: AI-reviewed mock interview - questions 2-5 of the same
              take, scored on communication (clarity/fluency/vocabulary &
              grammar/confidence). Same underlying flow as Card 1 above. */}
          <div
            style={{
              background: "#fff",
              border: "1px solid #EAE6DF",
              borderRadius: 20,
              padding: "24px 28px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.03)",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap"
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 20, flex: 1, minWidth: 280 }}>
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  background: "linear-gradient(135deg, #EC4899 0%, #E11D48 100%)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#ffffff",
                  fontSize: 22,
                  flexShrink: 0,
                  boxShadow: "0 8px 20px rgba(236, 72, 153, 0.28)"
                }}
              >
                <i className="fa-solid fa-user" />
              </div>

              <div>
                <h4 style={{ fontFamily: "var(--font-heading)", fontSize: 18, fontWeight: 800, color: "#0F172A", margin: "0 0 6px" }}>
                  AI-reviewed 5-minute mock interview
                </h4>
                <p style={{ fontSize: 13.5, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
                  Specialty-tuned questions. Talentera AI scores fluency, confidence, and structured answering.
                </p>
              </div>
            </div>

            {/* START MOCK Pink Button - same flow as RECORD NOW above; the
                self-introduction (Question 1) leads straight into these
                mock-interview questions within one recording. */}
            <button
              type="button"
              onClick={() => setStep("liveness")}
              disabled={questionsLoading}
              style={{
                background: "linear-gradient(135deg, #EC4899 0%, #E11D48 100%)",
                color: "#ffffff",
                border: "none",
                padding: "14px 32px",
                borderRadius: 12,
                fontWeight: 800,
                fontSize: 14,
                letterSpacing: "0.05em",
                cursor: "pointer",
                boxShadow: "0 6px 20px rgba(225, 29, 72, 0.35)",
                transition: "all 0.2s ease",
                whiteSpace: "nowrap"
              }}
            >
              {questionsLoading ? "LOADING..." : "START MOCK"}
            </button>
          </div>
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
                  <button type="button" className="btn btn-navy" style={{ width: "100%", justifyContent: "center" }} onClick={handlePerformLivenessCheck} disabled={livenessChecking}>
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
                    {isFacePresent ? "Start 90s Self-Introduction Recording →" : "🔒 Face Required in Front of Camera"}
                  </button>
                ) : (
                  <div>
                    <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: "var(--navy)", marginBottom: 10 }}>
                      <i className="fa-solid fa-rotate" style={{ marginRight: 6, color: "var(--gold)", animation: "spin 3s linear infinite" }}></i>
                      {isSpeaking ? "AI is asking you to introduce yourself..." : `Speak clearly. Recording will submit automatically in ${recTimeLeft}s or when you click submit.`}
                    </div>
                    <button
                      type="button"
                      className="btn btn-gold"
                      style={{ width: "100%", justifyContent: "center", padding: "12px 16px", fontWeight: 800 }}
                      onClick={handleFinishSingleTakeInterview}
                    >
                      <i className="fa-solid fa-check" style={{ marginRight: 6 }}></i> Submit 90s Video Recording →
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
            AI Analyzing Your Spoken Communication…
          </h3>
          <p style={{ fontSize: 13, color: "#64748B" }}>
            The AI is evaluating your self-introduction for spoken clarity, fluency, and professional delivery.
          </p>
        </div>
      )}

      {/* STEP 5: SUBMISSION CONFIRMATION */}
      {step === "report" && evaluation && (
        <div>
          {evaluation.rubric && (
            <div
              style={{
                background: "#F0FDF4",
                border: "1px solid #86EFAC",
                borderRadius: 14,
                padding: "16px 20px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 14,
                flexWrap: "wrap",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#22C55E", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, flexShrink: 0 }}>
                  <i className="fa-solid fa-check"></i>
                </div>
                <div>
                  <div style={{ fontWeight: 800, color: "#15803D", fontSize: 14 }}>
                    Recording + mock complete · Fluency {evaluation.rubric.fluency} · Confidence {evaluation.rubric.confidenceDelivery}
                  </div>
                  <div style={{ fontSize: 12, color: "#166534" }}>
                    Available to companies that shortlist you. Re-record from your dashboard anytime.
                  </div>
                </div>
              </div>
              {lastSavedDataRef.current && (
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={handleContinueToNextStage}
                  style={{ whiteSpace: "nowrap" }}
                >
                  Continue to Next Stage →
                </button>
              )}
            </div>
          )}

          <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
              <i className="fa-solid fa-check"></i>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 10 }}>
              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                <i className="fa-solid fa-circle-check"></i> 90s SELF-INTRODUCTION RECORDED
              </span>
              <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #F59E0B" }}>
                <i className="fa-solid fa-lock"></i> Single Attempt Completed
              </span>
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 8px" }}>
              Thank you for recording your self-introduction!
            </h3>

            {/* DEVELOPER RETAKE OPTION */}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setStep("setup");
                  setSessionStarted(false);
                  setIsRecording(false);
                  setRecTimeLeft(90);
                }}
                style={{
                  background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                  color: "#06152A",
                  border: "none",
                  padding: "10px 20px",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(229,168,46,0.3)"
                }}
              >
                ⚡ Developer Retake Video Recording (Dev Mode)
              </button>
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 8px" }}>
              Thank you for completing the interview!
            </h3>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 auto 20px", maxWidth: 460, lineHeight: 1.6 }}>
              Our AI has analyzed your spoken communication - no manual review needed. Here's how you did:
            </p>

            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", marginBottom: 20 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: 0.5 }}>COMMUNICATION SCORE</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "var(--navy)" }}>{evaluation.overallScore}%</div>
            </div>

            {evaluation.rubric && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, maxWidth: 520, margin: "0 auto 16px", textAlign: "left" }}>
                {[
                  { key: "clarity", label: "Clarity & Pronunciation" },
                  { key: "fluency", label: "Fluency & Pace" },
                  { key: "vocabularyGrammar", label: "Vocabulary & Grammar" },
                  { key: "confidenceDelivery", label: "Confidence & Delivery" },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 4 }}>
                      <span>{label}</span>
                      <span style={{ fontWeight: 800, color: "var(--navy)" }}>{evaluation.rubric[key]}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 999, background: "#E2E8F0", overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${evaluation.rubric[key]}%`, background: "var(--gold, #F59E0B)", borderRadius: 999 }} />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {evaluation.feedback && (
              <p style={{ fontSize: 12, color: "#64748B", margin: "0 auto", maxWidth: 460, lineHeight: 1.6, background: "#F8FAFC", borderRadius: 10, padding: "10px 14px" }}>
                {evaluation.feedback}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
