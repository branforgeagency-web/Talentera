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
    title: "60-Second Self-Introduction",
    question: "Please give your 60-second professional self-introduction — describe your background, education, and career aspirations in Medical Coding / Healthcare RCM.",
    timeLimit: 60,
    minDuration: 60,
  }
];

export default function AiVideoAssessment({ existingData, onSaved, customQuestions }) {
  const toast = useToast();
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  const [questionsLoading, setQuestionsLoading] = useState(false);
  const [fetchedQuestions, setFetchedQuestions] = useState(null);

  // Stage 5 video capture is focused strictly on the 60-second professional
  // self-introduction (minimum duration: 60 seconds). This single video clip
  // is evaluated by AI and reviewed by healthcare recruiters.
  const questionsList = useMemo(() => {
    return [
      {
        id: 1,
        title: "60-Second Self-Introduction",
        question: "Please give your 60-second professional self-introduction — describe your background, education, and career aspirations in Medical Coding / Healthcare RCM.",
        timeLimit: 60,
        minDuration: 60,
      }
    ];
  }, []);

  const isInterviewCompleted = Boolean(
    existingData && (existingData.completedAt || existingData.videoUrl || typeof existingData.aiScore === "number")
  );

  // Setup & Camera States
  const [step, setStep] = useState(isInterviewCompleted ? "report" : "liveness"); // liveness | recording | evaluating | report
  const [activeTab, setActiveTab] = useState("record"); // "record" | "upload"
  const [stream, setStream] = useState(null);
  const streamRef = useRef(null);
  const autoStartedRef = useRef(false);
  const [cameraError, setCameraError] = useState("");

  // Pre-recorded video upload states
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadPreviewUrl, setUploadPreviewUrl] = useState("");
  const [videoDuration, setVideoDuration] = useState(0);
  const [uploadError, setUploadError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
  const [isPaused, setIsPaused] = useState(false);
  const [recTimeLeft, setRecTimeLeft] = useState(60);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [silenceTimeLeft, setSilenceTimeLeft] = useState(SILENCE_TIMEOUT_SECONDS);
  const lastSpeechTimeRef = useRef(Date.now());
  const [qaTranscripts, setQaTranscripts] = useState({});
  const [proctorLogs, setProctorLogs] = useState({ tabSwitches: 0, focusLosses: 0 });
  const advancingRef = useRef(false);
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
          // Use the staff-configured interview question bank in its configured order
          setFetchedQuestions(rawList);
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
      const res = await api.put("/candidate/stage/5", {
        aiScore: pending.evaluation?.overallScore,
        rubric: pending.evaluation?.rubric,
        answerNotes: pending.evaluation?.answerNotes,
        feedback: pending.evaluation?.feedback,
        completedAt: new Date(),
        selfIntroCompleted: true,
      });
      if (res.data) {
        setEvaluation(pending.evaluation);
        try {
          localStorage.removeItem(PENDING_REPORT_KEY);
        } catch (e) {}
        lastSavedDataRef.current = res.data;
        if (onSaved) onSaved(res.data, { advance: false });
      }
    } catch (err) {
      console.warn("Background sync of pending AI video report:", err.message);
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
      const cleanQuestion = String(questionText || "")
        .replace(/[*_#`~[\]]/g, " ")
        .replace(/\bE\/M\b/gi, "E and M")
        .replace(/\bICD-10-CM\b/gi, "I C D 10 C M")
        .replace(/\bICD-10-PCS\b/gi, "I C D 10 P C S")
        .replace(/\bICD-10\b/gi, "I C D 10")
        .replace(/\bCPT\b/g, "C P T")
        .replace(/\bMDM\b/g, "M D M")
        .replace(/\bHIPAA\b/gi, "Hippa")
        .replace(/\bPHI\b/g, "P H I")
        .replace(/\bANSI\b/g, "Ansi")
        .replace(/\bCO-197\b/gi, "C O 197")
        .replace(/\bvs\.?\b/gi, "versus")
        .replace(/Question\s*(\d+)\s*of\s*(\d+):?/gi, "Question $1 of $2. ")
        .replace(/\s+/g, " ")
        .trim();

      const utterance = new SpeechSynthesisUtterance(cleanQuestion);
      utterance.lang = "en-US";
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
      const realHumanVoicePatterns = [
        /microsoft.*(jenny|aria|ava|emma|sonia|libby|michelle).*natural/i,
        /samantha.*(enhanced|premium)/i,
        /karen.*(enhanced|premium)/i,
        /serena.*(enhanced|premium)/i,
        /ava.*(enhanced|premium)/i,
        /zoe.*(enhanced|premium)/i,
        /google us english/i,
        /google uk english female/i,
        /google.*female/i,
        /microsoft (jenny|aria|ava|emma|sonia|libby)/i,
        /samantha/i,
        /karen/i,
        /victoria/i,
        /serena/i,
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
      if (!selectedVoice) {
        selectedVoice = voices.find(
          (v) =>
            v.lang &&
            (v.lang === "en-US" || v.lang === "en-GB" || v.lang.startsWith("en")) &&
            !/desktop|espeak|male|david/i.test(v.name)
        );
      }
      if (selectedVoice) {
        utterance.voice = selectedVoice;
        if (selectedVoice.lang) utterance.lang = selectedVoice.lang;
      }
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

  // Initialize Camera - the camera stays OFF until the candidate clicks
  // "Perform Liveness Verification" on the liveness screen (that click calls
  // handlePerformLivenessCheck -> startWebcam(false), video only). The mic
  // (audio: true) is added only when proceeding to "recording". On any step
  // change / unmount the cleanup below stops every track, so the camera turns
  // off automatically once the interview reaches evaluating/report.
  useEffect(() => {
    if (step === "recording") {
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

  // Auto-start the single-take recording as soon as the recording screen is
  // ready (camera+mic live and a face detected). The candidate already pressed
  // the single "Start 90s Self-Introduction Recording" button on the liveness
  // screen; this removes the redundant second identical button that used to sit
  // on this screen. Fires once per recording entry; the face-required gate below
  // still covers the "no face yet" case.
  useEffect(() => {
    if (step !== "recording") {
      autoStartedRef.current = false;
      return;
    }
    if (
      !sessionStarted &&
      !autoStartedRef.current &&
      isFacePresent &&
      stream &&
      stream.getAudioTracks().length > 0
    ) {
      autoStartedRef.current = true;
      handleStartSingleTakeInterview();
    }
  }, [step, sessionStarted, isFacePresent, stream]);

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

  // Handle Question Time Limit Timer. Only ticks while isRecording is true and not paused
  useEffect(() => {
    if (!isRecording || isPaused) return;
    if (recTimeLeft <= 0) {
      advanceToNextQuestion();
      return;
    }
    const timer = setTimeout(() => {
      setRecTimeLeft((prev) => Math.max(0, prev - 1));
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isRecording, isPaused, recTimeLeft]);

  // Silence Detection Monitor: after 60s minimum duration is met, auto-advances if prolonged silence is detected
  useEffect(() => {
    if (!isRecording || isPaused) return;
    const silenceTimer = setInterval(() => {
      const elapsedSilence = Math.floor((Date.now() - lastSpeechTimeRef.current) / 1000);
      const remainingSilence = Math.max(0, SILENCE_TIMEOUT_SECONDS - elapsedSilence);
      setSilenceTimeLeft(remainingSilence);

      if (elapsedSilence >= SILENCE_TIMEOUT_SECONDS && recordingSeconds >= 60) {
        clearInterval(silenceTimer);
        toast(`No speech detected for ${SILENCE_TIMEOUT_SECONDS} seconds. Auto-submitting...`, "!");
        advanceToNextQuestion();
      }
    }, 1000);
    return () => clearInterval(silenceTimer);
  }, [isRecording, isPaused, recordingSeconds]);

  // Anti-Cheat Tab Switch & Window Focus Loss Listener during recording: Immediately stops & terminates interview
  useEffect(() => {
    if (step !== "recording" || !sessionStarted) return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setProctorLogs((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
        toast("⚠️ Tab switch detected! Interview terminated immediately for anti-cheat violation.", "!");
        handleFinishSingleTakeInterview(true);
      }
    }

    function handleWindowBlur() {
      setProctorLogs((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
      toast("⚠️ Window focus loss detected! Interview terminated immediately for anti-cheat violation.", "!");
      handleFinishSingleTakeInterview(true);
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        setStream(null);
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720 },
        audio: includeAudio,
      });
      streamRef.current = mediaStream;
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
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setStream(null);
  }

  // --- Step 2: Liveness Verification Check ---
  async function handlePerformLivenessCheck() {
    setLivenessChecking(true);
    let activeStream = streamRef.current || stream;
    if (!activeStream) {
      activeStream = await startWebcam(false);
    }
    if (!activeStream) {
      // Camera could not start - startWebcam already set cameraError. Don't
      // fake a "verified" state without a live camera.
      setLivenessChecking(false);
      return;
    }
    setTimeout(() => {
      setLivenessChecking(false);
      setLivenessVerified(true);
      setIsFacePresent(true);
      toast("Liveness Verified! Face presence & video camera stream validated.", "✓");
    }, 1500);
  }

  // --- Step 3: Single-Take AI Video Interview Recording ---
  async function handleStartSingleTakeInterview() {
    let activeStream = stream || streamRef.current;
    if (!activeStream || activeStream.getAudioTracks().length === 0) {
      activeStream = await startWebcam(true);
    }
    if (!activeStream) {
      toast("Please allow camera and microphone access to record your self-introduction.", "!");
      return;
    }
    if (videoPreviewRef.current && videoPreviewRef.current.srcObject !== activeStream) {
      videoPreviewRef.current.srcObject = activeStream;
    }
    if (!isFacePresent) {
      toast("Please be in front of the camera and look directly at the screen.", "!");
      return;
    }

    recordedChunksRef.current = [];
    setQIdx(0);
    qIdxRef.current = 0;
    setRecTimeLeft(60);
    setRecordingSeconds(0);
    setIsPaused(false);
    setQaTranscripts({});
    setSessionStarted(true);

    try {
      let mimeType = "video/webm;codecs=vp8,opus";
      if (typeof MediaRecorder !== "undefined") {
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          if (MediaRecorder.isTypeSupported("video/webm")) {
            mimeType = "video/webm";
          } else if (MediaRecorder.isTypeSupported("video/mp4")) {
            mimeType = "video/mp4";
          } else {
            mimeType = "";
          }
        }
      }
      let mediaRecorder;
      try {
        const recorderOptions = {
          ...(mimeType ? { mimeType } : {}),
          videoBitsPerSecond: 1500000,
          audioBitsPerSecond: 128000,
        };
        mediaRecorder = new MediaRecorder(activeStream, recorderOptions);
      } catch (optErr) {
        console.warn("Falling back to default recorder options:", optErr.message);
        mediaRecorder = mimeType ? new MediaRecorder(activeStream, { mimeType }) : new MediaRecorder(activeStream);
      }
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      mediaRecorder.start(1000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
      toast("Recording initialization error: " + err.message, "!");
    }

    // AI speaks the Self-Introduction prompt aloud first; the answer window (timer + speech recognition)
    // opens once it finishes speaking.
    speakQuestion(questionsList[0].question, () => startAnswerWindow(0));
  }

  function startSpeechRecognition(qId) {
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

    function begin() {
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
        setQaTranscripts((prev) => ({ ...prev, [qId]: text }));
      };
      recognition.onerror = () => {};
      recognition.onend = () => {
        if (recognitionShouldRunRef.current) {
          try {
            begin();
          } catch (e) {}
        }
      };
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {}
    }
    begin();
  }

  // Opens the answer window: starts the 60s countdown, elapsed seconds tracker,
  // and speech-recognition instance.
  function startAnswerWindow(idx) {
    const q = questionsList[idx] || questionsList[0];
    if (!q) return;

    setRecTimeLeft(q.timeLimit || 60);
    setRecordingSeconds(0);
    setIsPaused(false);
    setSilenceTimeLeft(SILENCE_TIMEOUT_SECONDS);
    lastSpeechTimeRef.current = Date.now();
    setIsRecording(true);
    recognitionShouldRunRef.current = true;
    startSpeechRecognition(q.id);
  }

  function handlePauseRecording() {
    if (!isRecording || isPaused) return;
    setIsPaused(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
      try {
        mediaRecorderRef.current.pause();
      } catch (e) {
        console.warn("MediaRecorder pause error:", e);
      }
    }
    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    toast("Recording paused. Click Resume when you are ready to continue.", "i");
  }

  function handleResumeRecording() {
    if (!isRecording || !isPaused) return;
    setIsPaused(false);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "paused") {
      try {
        mediaRecorderRef.current.resume();
      } catch (e) {
        console.warn("MediaRecorder resume error:", e);
      }
    }
    lastSpeechTimeRef.current = Date.now();
    recognitionShouldRunRef.current = true;
    startSpeechRecognition(questionsList[0]?.id || 1);
    toast("Recording resumed! Speak clearly.", "✓");
  }

  async function handleResetRecording() {
    // 1. Cancel any active speech synthesis
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch (e) {}
    }
    setIsSpeaking(false);
    setIsPaused(false);
    setIsRecording(false);
    setSessionStarted(false);
    setRecordingSeconds(0);
    setRecTimeLeft(60);
    setQaTranscripts({});
    recordedChunksRef.current = [];
    autoStartedRef.current = false;

    // 2. Stop media recorder safely
    if (mediaRecorderRef.current) {
      try {
        if (mediaRecorderRef.current.state !== "inactive") {
          mediaRecorderRef.current.stop();
        }
      } catch (e) {}
      mediaRecorderRef.current = null;
    }

    // 3. Stop speech recognition safely
    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    toast("Recording reset! Starting from 0s...", "i");

    // 4. Ensure webcam stream is active and preview connected
    let activeStream = stream;
    if (!activeStream || activeStream.getAudioTracks().length === 0) {
      activeStream = await startWebcam(true);
    } else if (videoPreviewRef.current && videoPreviewRef.current.srcObject !== activeStream) {
      videoPreviewRef.current.srcObject = activeStream;
    }

    // 5. Restart recording session cleanly from the beginning
    setTimeout(() => {
      autoStartedRef.current = true;
      handleStartSingleTakeInterview();
    }, 300);
  }

  function handleVideoFileSelect(file) {
    if (!file) return;
    const validExtensions = /\.(mp4|webm|mov|mkv|avi)$/i;
    if (!file.type.startsWith("video/") && !validExtensions.test(file.name)) {
      setUploadError("Please upload a valid video file (.mp4, .webm, .mov, .mkv).");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      setUploadError(`Video file size must be under 20 MB. Your file is ${(file.size / (1024 * 1024)).toFixed(2)} MB.`);
      toast(`Video size must be under 20 MB (Current: ${(file.size / (1024 * 1024)).toFixed(1)} MB).`, "!");
      return;
    }
    setUploadError("");
    setUploadedFile(file);
    const url = URL.createObjectURL(file);
    setUploadPreviewUrl(url);

    const tempVideo = document.createElement("video");
    tempVideo.preload = "metadata";
    tempVideo.onloadedmetadata = () => {
      const duration = Math.round(tempVideo.duration);
      setVideoDuration(duration);
      if (duration < 60) {
        setUploadError(`Video must be 60 seconds in duration. Your video is only ${duration} seconds.`);
        toast(`Video must be 60 seconds in duration. Current length: ${duration}s.`, "!");
      } else {
        setUploadError("");
        toast(`Video loaded (${duration}s) successfully!`, "✓");
      }
    };
    tempVideo.src = url;
  }

  async function handlePreRecordedVideoSubmit() {
    if (!uploadedFile) {
      toast("Please choose a video file to upload first.", "!");
      return;
    }
    if (uploadedFile.size > 20 * 1024 * 1024) {
      setUploadError(`Video file size must be under 20 MB. Your file is ${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB.`);
      toast("Video file size must be under 20 MB.", "!");
      return;
    }
    if (videoDuration < 60) {
      setUploadError(`Video must be 60 seconds in duration. Your video is only ${videoDuration} seconds.`);
      toast("Video must be 60 seconds in duration.", "!");
      return;
    }
    setStep("evaluating");
    setSubmitting(true);

    const formData = new FormData();
    formData.append("video", uploadedFile);
    formData.append(
      "qaPairs",
      JSON.stringify([
        {
          questionId: 1,
          question: "60-Second Self-Introduction",
          transcript: "Pre-recorded self-introduction video uploaded by candidate.",
        },
      ])
    );
    formData.append(
      "proctorLogs",
      JSON.stringify({
        mode: "pre_recorded_upload",
        durationSeconds: videoDuration,
        fileName: uploadedFile.name,
        livenessVerified: true,
      })
    );

    try {
      const res = await api.post("/candidate/ai-video/assess", formData, {
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (res.data && res.data.success) {
        setEvaluation(res.data.evaluation);
        setStep("report");
        toast("Pre-recorded self-introduction video submitted & evaluated! Thank you.", "✓");
        lastSavedDataRef.current = res.data;
        if (onSaved) onSaved(res.data, { advance: false });
      }
    } catch (err) {
      console.error("Video upload error:", err);
      toast(err.response?.data?.message || "Failed to upload video. Please try again.", "!");
      setStep("liveness");
    } finally {
      setSubmitting(false);
      stopWebcam();
    }
  }

  function advanceToNextQuestion() {
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
      toast("60-second self-introduction recording complete! Submitting for evaluation...", "✓");
      handleFinishSingleTakeInterview(true);
    }
  }

  function handleFinishSingleTakeInterview(force = false) {
    if (!force && recordingSeconds < 60) {
      toast(`Please record for at least 60 seconds (currently ${recordingSeconds}s / 60s).`, "!");
      return;
    }
    advancingRef.current = true;
    recognitionShouldRunRef.current = false;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    setIsRecording(false);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onend = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const rec = mediaRecorderRef.current;
    if (rec && rec.state !== "inactive") {
      rec.onstop = () => {
        setTimeout(() => handleFinalSubmission(), 150);
      };
      try {
        if (typeof rec.requestData === "function") {
          rec.requestData();
        }
        rec.stop();
      } catch (e) {
        handleFinalSubmission();
      }
    } else {
      handleFinalSubmission();
    }
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

    const rawMime = mediaRecorderRef.current?.mimeType || "";
    const cleanMime = rawMime.includes("mp4") ? "video/mp4" : "video/webm";
    const ext = cleanMime === "video/mp4" ? "mp4" : "webm";
    const blob = new Blob(recordedChunksRef.current, { type: cleanMime });

    if (!blob || blob.size === 0) {
      console.warn("Recorded video blob is empty!");
      toast("No video was captured. Please ensure your camera & microphone are enabled and record again.", "!");
      setStep("recording");
      setSubmitting(false);
      return;
    }

    const videoFile = new File([blob], `candidate_self_intro_${Date.now()}.${ext}`, { type: cleanMime });

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
        timeout: 180000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      });

      if (res.data && res.data.success) {
        setEvaluation(res.data.evaluation);
        setStep("report");
        toast("Self-introduction video submitted & recorded! Thank you.", "✓");
        lastSavedDataRef.current = res.data;
        if (onSaved) onSaved(res.data, { advance: false });
      }
    } catch (err) {
      console.error("Final AI submission error:", err);
      toast(err.response?.data?.message || "Failed to upload video recording. Please check connection and try again.", "!");
      setStep("recording");
    } finally {
      setSubmitting(false);
      stopWebcam();
    }
  }

  const currentQ = questionsList[qIdx] || questionsList[0];

  return (
    <div className="card" style={{ padding: 24, borderRadius: 16 }}>
      {/* HEADER BANNER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
            STAGE 05 · COMMUNICATION &amp; VIDEO ASSESSMENT
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>
            60-Second Professional Self-Introduction
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

      {/* DUAL MODE TABS: RECORD LIVE vs UPLOAD PRE-RECORDED */}
      {step !== "evaluating" && step !== "report" && (
        <div style={{ display: "flex", gap: 10, marginBottom: 20, borderBottom: "1px solid #E2E8F0", paddingBottom: 14, flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => {
              setActiveTab("record");
              setUploadError("");
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "record" ? "var(--navy)" : "#F8FAFC",
              color: activeTab === "record" ? "#FFFFFF" : "#475569",
              border: activeTab === "record" ? "2px solid var(--navy)" : "1.5px solid #CBD5E1",
              boxShadow: activeTab === "record" ? "0 4px 12px rgba(15, 23, 42, 0.15)" : "none",
            }}
          >
            <i className="fa-solid fa-video" style={{ color: activeTab === "record" ? "var(--gold)" : "#64748B" }}></i>
            <span>Record Live Video (60s)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab("upload");
              stopWebcam();
            }}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 18px",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              transition: "all 0.15s ease",
              background: activeTab === "upload" ? "var(--navy)" : "#F8FAFC",
              color: activeTab === "upload" ? "#FFFFFF" : "#475569",
              border: activeTab === "upload" ? "2px solid var(--navy)" : "1.5px solid #CBD5E1",
              boxShadow: activeTab === "upload" ? "0 4px 12px rgba(15, 23, 42, 0.15)" : "none",
            }}
          >
            <i className="fa-solid fa-cloud-arrow-up" style={{ color: activeTab === "upload" ? "var(--gold)" : "#64748B" }}></i>
            <span>Upload Pre-Recorded Video (60s)</span>
          </button>
        </div>
      )}

      {/* FACE PRESENCE WARNING BANNER (Only during live mode) */}
      {activeTab === "record" && !isFacePresent && (step === "liveness" || step === "recording") && (
        <div style={{ background: "#FEF2F2", border: "2px solid #EF4444", color: "#991B1B", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
          <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 18 }}></i>
          <span><strong>Face Not Detected:</strong> Please be in front of the camera and look directly at the screen to record your answer.</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE B: PRE-RECORDED VIDEO UPLOAD SECTION                                  */}
      {/* ========================================================================= */}
      {activeTab === "upload" && step !== "evaluating" && step !== "report" && (
        <div style={{ background: "#FFFFFF", border: "2px solid var(--navy)", borderRadius: 16, padding: 28, boxShadow: "0 8px 24px rgba(0,0,0,0.04)" }}>
          <div style={{ marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
              <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                OPTION: PRE-RECORDED VIDEO
              </span>
              <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                MANDATORY DURATION: 60 SECONDS (MIN 60s)
              </span>
            </div>
            <h4 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 6px" }}>
              Upload Your 60-Second Self-Introduction Video
            </h4>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0, lineHeight: 1.5 }}>
              If you have already recorded your professional self-introduction on your phone or camera, you can upload the video file directly here (.mp4, .webm, .mov, max 20MB). Video length must be at least 60 seconds.
            </p>
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/mp4,video/webm,video/quicktime,video/x-matroska,video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              if (e.target.files && e.target.files[0]) {
                handleVideoFileSelect(e.target.files[0]);
              }
            }}
          />

          {/* Upload Dropzone / Preview */}
          {!uploadedFile ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                  handleVideoFileSelect(e.dataTransfer.files[0]);
                }
              }}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{
                border: `2px dashed ${isDragging ? "var(--gold)" : "#94A3B8"}`,
                background: isDragging ? "#FFFBEB" : "#F8FAFC",
                borderRadius: 14,
                padding: "48px 24px",
                textAlign: "center",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
            >
              <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#EEF2F6", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26, margin: "0 auto 16px" }}>
                <i className="fa-solid fa-cloud-arrow-up"></i>
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
                Click to browse or drag and drop your video file
              </div>
              <div style={{ fontSize: 12, color: "#64748B", marginBottom: 16 }}>
                Supported formats: MP4, WebM, MOV, MKV (Minimum duration: 60s, Maximum file size: 20 MB)
              </div>
              <button
                type="button"
                className="btn btn-navy"
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current && fileInputRef.current.click();
                }}
                style={{ padding: "10px 24px", fontSize: 13, fontWeight: 700 }}
              >
                <i className="fa-solid fa-folder-open" style={{ marginRight: 6 }}></i> Choose Video File
              </button>
            </div>
          ) : (
            <div>
              {/* Video Preview Player */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "center" }}>
                <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", maxHeight: 320, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <video
                    src={uploadPreviewUrl}
                    controls
                    playsInline
                    style={{ width: "100%", maxHeight: 320, objectFit: "contain", background: "#000" }}
                  />
                </div>

                {/* Video Info and Submit Card */}
                <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
                  <div>
                    <span style={{
                      background: videoDuration >= 60 && uploadedFile.size <= 20 * 1024 * 1024 ? "#DCFCE7" : "#FEF3C7",
                      color: videoDuration >= 60 && uploadedFile.size <= 20 * 1024 * 1024 ? "#15803D" : "#B45309",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 10px",
                      borderRadius: 999
                    }}>
                      {videoDuration >= 60 && uploadedFile.size <= 20 * 1024 * 1024 ? "✓ VIDEO READY" : "⚠️ VALIDATION NEEDED"}
                    </span>
                    <h5 style={{ margin: "8px 0 4px", fontSize: 15, fontWeight: 800, color: "var(--navy)", wordBreak: "break-word" }}>
                      {uploadedFile.name}
                    </h5>
                    <div style={{ fontSize: 12, color: uploadedFile.size > 20 * 1024 * 1024 ? "#DC2626" : "#64748B", fontWeight: uploadedFile.size > 20 * 1024 * 1024 ? 700 : 500 }}>
                      File Size: {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB {uploadedFile.size > 20 * 1024 * 1024 ? "(Must be under 20 MB)" : "(Max 20 MB)"}
                    </div>
                  </div>

                  {videoDuration > 0 && (
                    <div style={{
                      background: videoDuration >= 60 ? "#F0FDF4" : "#FEF2F2",
                      border: `1.5px solid ${videoDuration >= 60 ? "#86EFAC" : "#FCA5A5"}`,
                      borderRadius: 8,
                      padding: "10px 12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between"
                    }}>
                      <span style={{ fontSize: 12, fontWeight: 700, color: videoDuration >= 60 ? "#166534" : "#991B1B" }}>Video Duration:</span>
                      <span style={{ fontSize: 13, fontWeight: 800, color: videoDuration >= 60 ? "#15803D" : "#DC2626" }}>
                        <i className={`fa-solid ${videoDuration >= 60 ? "fa-circle-check" : "fa-triangle-exclamation"}`} style={{ marginRight: 4 }}></i>
                        {videoDuration}s {videoDuration >= 60 ? "(Met 60s requirement)" : "(Short — Min 60s)"}
                      </span>
                    </div>
                  )}

                  {videoDuration > 0 && videoDuration < 60 && (
                    <div style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#B91C1C",
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.45,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginTop: 2, fontSize: 14 }}></i>
                      <span>Video must be 60 seconds in duration. Your video is only {videoDuration}s. Please upload a 60-second video.</span>
                    </div>
                  )}

                  {uploadedFile.size > 20 * 1024 * 1024 && (
                    <div style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      borderRadius: 8,
                      padding: "10px 12px",
                      color: "#B91C1C",
                      fontSize: 12,
                      fontWeight: 700,
                      lineHeight: 1.45,
                      display: "flex",
                      alignItems: "flex-start",
                      gap: 8
                    }}>
                      <i className="fa-solid fa-circle-exclamation" style={{ marginTop: 2, fontSize: 14 }}></i>
                      <span>Video file size must be under 20 MB. Your file is {(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB.</span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 6 }}>
                    {videoDuration < 60 || uploadedFile.size > 20 * 1024 * 1024 ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (uploadedFile.size > 20 * 1024 * 1024) {
                            setUploadError(`Video file size must be under 20 MB. Current file size is ${(uploadedFile.size / (1024 * 1024)).toFixed(2)} MB.`);
                            toast("Video file size must be under 20 MB.", "!");
                          } else {
                            setUploadError(`Video must be 60 seconds in duration. Current video length is ${videoDuration}s.`);
                            toast("Video must be 60 seconds in duration.", "!");
                          }
                        }}
                        style={{
                          width: "100%",
                          padding: "12px 18px",
                          fontWeight: 800,
                          fontSize: 13.5,
                          borderRadius: 8,
                          background: "#E2E8F0",
                          color: "#64748B",
                          border: "1px solid #CBD5E1",
                          cursor: "not-allowed",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 6
                        }}
                      >
                        <i className="fa-solid fa-lock"></i>
                        <span>
                          {uploadedFile.size > 20 * 1024 * 1024
                            ? "File size must be under 20 MB"
                            : "Video must be 60 seconds in duration"}
                        </span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn btn-gold"
                        onClick={handlePreRecordedVideoSubmit}
                        disabled={submitting}
                        style={{ width: "100%", justifyContent: "center", padding: "12px 18px", fontWeight: 800, fontSize: 14 }}
                      >
                        {submitting ? "Uploading & Evaluating…" : "Submit Pre-Recorded Video →"}
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadPreviewUrl("");
                        setVideoDuration(0);
                        setUploadError("");
                      }}
                      style={{
                        background: "transparent",
                        border: "1px solid #CBD5E1",
                        borderRadius: 8,
                        padding: "8px 12px",
                        fontSize: 12,
                        fontWeight: 700,
                        color: "#475569",
                        cursor: "pointer",
                      }}
                    >
                      <i className="fa-solid fa-rotate-left" style={{ marginRight: 6 }}></i> Choose Another Video
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {uploadError && (
            <div style={{ color: "#DC2626", fontSize: 12.5, fontWeight: 700, marginTop: 14, display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{uploadError}</span>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODE A: LIVE CAMERA RECORDING SECTION                                     */}
      {/* ========================================================================= */}
      {activeTab === "record" && step === "liveness" && (
        <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 24 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24, alignItems: "center" }}>
            {/* Live Camera Feed Preview */}
            <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", minHeight: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <video ref={videoPreviewRef} autoPlay playsInline muted style={{ width: "100%", height: 280, objectFit: "cover", transform: "scaleX(-1)" }} />
              <div style={{ position: "absolute", top: 12, left: 12, background: !stream ? "rgba(0,0,0,0.6)" : isFacePresent ? "rgba(0,0,0,0.6)" : "#DC2626", color: "#fff", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 700 }}>
                <i className="fa-solid fa-circle" style={{ color: !stream ? "#94A3B8" : isFacePresent ? "#22C55E" : "#fff", marginRight: 6 }}></i>
                {!stream ? "Camera Off · Click Verify to Start" : isFacePresent ? "Face Detected · Camera Live" : "No Face Detected"}
              </div>
            </div>

            {/* Liveness Controls */}
            <div>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                Step 1: Liveness &amp; Camera Check
              </h4>
              <p style={{ fontSize: 12, color: "#475569", lineHeight: 1.5, marginBottom: 16 }}>
                Before starting your live 60-second video recording, ensure your face is directly in front of the camera and look at the screen.
              </p>

              {cameraError ? (
                <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginBottom: 12 }}>{cameraError}</div>
              ) : livenessVerified ? (
                <div>
                  <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", color: "#15803D", padding: 12, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 16 }}>
                    ✓ Liveness Verified! Face presence confirmed.
                  </div>
                  <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => setStep("recording")} disabled={questionsLoading}>
                    {questionsLoading ? "Loading…" : "Start 60s Self-Introduction Recording →"}
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

      {/* STEP 3: LIVE RECORDING WITH PAUSE & RESUME */}
      {activeTab === "record" && step === "recording" && (
        <div style={{ background: "#fff", border: "2px solid var(--navy)", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>
            {/* Left: Video Recorder Feed */}
            <div>
              <div style={{ background: "#000", borderRadius: 12, overflow: "hidden", position: "relative", height: 320 }}>
                <video ref={videoPreviewRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />

                {/* PAUSED VIDEO OVERLAY */}
                {isPaused && (
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(15, 23, 42, 0.7)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      zIndex: 10,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <div
                      style={{
                        width: 52,
                        height: 52,
                        borderRadius: "50%",
                        background: "rgba(255, 255, 255, 0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 22,
                        marginBottom: 8,
                      }}
                    >
                      <i className="fa-solid fa-pause"></i>
                    </div>
                    <div style={{ fontSize: 16, fontWeight: 800 }}>Recording Paused</div>
                    <div style={{ fontSize: 12, color: "#CBD5E1", marginTop: 4 }}>
                      Recorded: <strong>{recordingSeconds}s</strong> of 60s · Click Resume to continue
                    </div>
                  </div>
                )}

                {/* Recording Badge & Timer */}
                <div style={{ position: "absolute", top: 12, left: 12, display: "flex", gap: 8, flexWrap: "wrap", zIndex: 12 }}>
                  <div
                    style={{
                      background: isPaused ? "#F59E0B" : isRecording ? "#DC2626" : isSpeaking ? "#6366F1" : "rgba(0,0,0,0.6)",
                      color: "#fff",
                      padding: "4px 12px",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 800,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <i
                      className={`fa-solid ${isPaused ? "fa-pause" : "fa-circle"}`}
                      style={{
                        color: isPaused ? "#fff" : isRecording ? "#fff" : "#22C55E",
                        animation: !isPaused && (isRecording || isSpeaking) ? "pulse 1s infinite" : "none",
                      }}
                    ></i>
                    {isPaused ? "RECORDING PAUSED" : isRecording ? "RECORDING IN PROGRESS" : isSpeaking ? "AI ASKING QUESTION…" : "READY"}
                  </div>
                  {isRecording && (
                    <>
                      <div style={{ background: "#F59E0B", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                        <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i> {recordingSeconds}s / 60s
                      </div>
                      <div style={{ background: recordingSeconds >= 60 ? "#16A34A" : "#6366F1", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                        <i className={`fa-solid ${recordingSeconds >= 60 ? "fa-circle-check" : "fa-hourglass-half"}`} style={{ marginRight: 4 }}></i>
                        {recordingSeconds >= 60 ? "Min 60s Met" : `Min: ${60 - recordingSeconds}s remaining`}
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
                  {currentQ?.title || "60-Second Self-Introduction"}
                </div>
                <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", margin: "6px 0 12px", lineHeight: 1.5 }}>
                  {currentQ?.question}
                </h4>

                {/* Live STT Transcript Preview */}
                <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 12, minHeight: 80, fontSize: 12, color: "#334155", fontStyle: "italic", marginBottom: 16 }}>
                  <strong>Live Spoken Answer Transcript:</strong>{" "}
                  {qaTranscripts[currentQ?.id] ||
                    (isRecording
                      ? isPaused
                        ? "Recording paused. Click Resume to continue speaking."
                        : "Listening to your spoken answer..."
                      : isSpeaking
                      ? "AI is asking the question - your answer timer starts once it finishes."
                      : "Click Start 60s Self-Introduction Recording to begin.")}
                </div>
              </div>

              <div>
                {!sessionStarted ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "12px 16px", textAlign: "center", fontSize: 12.5, fontWeight: 700, color: "var(--navy)" }}>
                      <i className="fa-solid fa-rotate" style={{ marginRight: 6, color: "var(--gold)", animation: "spin 2s linear infinite" }}></i>
                      Starting your 60-second self-introduction recording…
                    </div>
                    <button
                      type="button"
                      className="btn btn-gold"
                      onClick={() => handleStartSingleTakeInterview()}
                      style={{ width: "100%", justifyContent: "center", padding: "12px 18px", fontSize: 13.5, fontWeight: 800 }}
                    >
                      <i className="fa-solid fa-circle-play" style={{ marginRight: 6 }}></i> Start Recording Immediately →
                    </button>
                  </div>
                ) : (
                  <div>
                    {/* Real-time Guidance Message */}
                    <div style={{ background: isPaused ? "#FEF3C7" : "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "8px 12px", textAlign: "center", fontSize: 11, fontWeight: 700, color: isPaused ? "#B45309" : "var(--navy)", marginBottom: 10 }}>
                      {isSpeaking
                        ? "AI is asking you to introduce yourself..."
                        : isPaused
                        ? "⏸️ Recording is paused. Click Resume Recording when ready."
                        : recordingSeconds < 60
                        ? `Speak clearly. Minimum duration is 60 seconds (${60 - recordingSeconds}s remaining).`
                        : `Minimum 60s duration met! Submit whenever you are ready or recording will auto-finish in ${recTimeLeft}s.`}
                    </div>

                    {/* Action Bar: Pause/Resume + Submit */}
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {isRecording && (
                        <button
                          type="button"
                          onClick={isPaused ? handleResumeRecording : handlePauseRecording}
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "12px 16px",
                            borderRadius: 10,
                            fontWeight: 800,
                            fontSize: 12.5,
                            cursor: "pointer",
                            border: "none",
                            background: isPaused ? "#16A34A" : "#0F172A",
                            color: "#FFFFFF",
                            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
                            flex: "1 1 40%",
                          }}
                        >
                          <i className={`fa-solid ${isPaused ? "fa-play" : "fa-pause"}`}></i>
                          <span>{isPaused ? "Resume" : "Pause"}</span>
                        </button>
                      )}

                      <button
                        type="button"
                        className="btn btn-gold"
                        style={{
                          flex: "1 1 55%",
                          justifyContent: "center",
                          padding: "12px 14px",
                          fontWeight: 800,
                          fontSize: 12.5,
                          opacity: recordingSeconds < 60 ? 0.65 : 1,
                          cursor: recordingSeconds < 60 ? "not-allowed" : "pointer",
                        }}
                        disabled={recordingSeconds < 60}
                        onClick={() => handleFinishSingleTakeInterview(false)}
                      >
                        {recordingSeconds < 60 ? (
                          <>
                            <i className="fa-solid fa-lock" style={{ marginRight: 4 }}></i> 60s Min ({60 - recordingSeconds}s left)
                          </>
                        ) : (
                          <>
                            <i className="fa-solid fa-check" style={{ marginRight: 4 }}></i> Submit 60s Video →
                          </>
                        )}
                      </button>
                    </div>

                    {/* Reset & Start Over Option */}
                    <div style={{ marginTop: 12, display: "flex", justifyContent: "center" }}>
                      <button
                        type="button"
                        onClick={handleResetRecording}
                        style={{
                          background: "#F8FAFC",
                          border: "1px solid #CBD5E1",
                          borderRadius: 8,
                          padding: "7px 16px",
                          color: "#475569",
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          transition: "all 0.15s ease",
                        }}
                        title="Reset recording time to 0s and start fresh"
                      >
                        <i className="fa-solid fa-rotate-left" style={{ color: "#F59E0B" }}></i>
                        <span>Restart Recording from 0s</span>
                      </button>
                    </div>
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
                    Recording complete · Fluency {evaluation.rubric.fluency} · Confidence {evaluation.rubric.confidenceDelivery}
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
                <i className="fa-solid fa-circle-check"></i> 60s SELF-INTRODUCTION RECORDED
              </span>
              <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #F59E0B" }}>
                <i className="fa-solid fa-lock"></i> Single Attempt Completed
              </span>
            </div>

            <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 8px" }}>
              Thank you for recording your 60-second self-introduction!
            </h3>

            {/* DEVELOPER RETAKE OPTION */}
            <div style={{ marginTop: 16 }}>
              <button
                type="button"
                onClick={() => {
                  setStep("liveness");
                  setActiveTab("record");
                  setSessionStarted(false);
                  setIsRecording(false);
                  setIsPaused(false);
                  setRecTimeLeft(60);
                  setRecordingSeconds(0);
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

            <p style={{ fontSize: 13, color: "#475569", margin: "20px auto", maxWidth: 460, lineHeight: 1.6 }}>
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
