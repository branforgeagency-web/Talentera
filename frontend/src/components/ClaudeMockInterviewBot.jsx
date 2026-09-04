import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// Maximum seconds of inactivity allowed before auto-advancing to next question
const INACTIVITY_TIMEOUT_SECONDS = 5;

// Once candidate starts speaking, how many ms of silence after answering before auto-submitting
const SILENCE_TIMEOUT_AFTER_ANSWER_MS = 4000;

const STOP_COMMAND_RE = /\b(stop|end|quit|terminate)\b[\s\S]*\binterview\b|^(stop|end)( it| this)?$/i;

const TOPIC_CONFIG = [
  { key: "Introduction", label: "1. Introduction", icon: "fa-user" },
  { key: "Education", label: "2. Education", icon: "fa-graduation-cap" },
  { key: "Skills", label: "3. Skills", icon: "fa-code" },
  { key: "Projects", label: "4. Projects", icon: "fa-folder-open" },
  { key: "Career Goals", label: "5. Career Goals", icon: "fa-bullseye" },
];

const EVAL_LABELS = {
  correct: { label: "Strong Answer", color: "#15803D", bg: "#DCFCE7" },
  partial: { label: "Good Foundation", color: "#B45309", bg: "#FEF3C7" },
  incorrect: { label: "Needs Practice", color: "#B91C1C", bg: "#FEE2E2" },
  no_answer: { label: "No Response (5s)", color: "#64748B", bg: "#F1F5F9" },
};

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// AI Interviewer Video Avatar
// Plays /ai bot.mp4 when the AI is speaking; pauses during listening/waiting.
// ---------------------------------------------------------------------------
function InterviewerVideoAvatar({ state, size = "large" }) {
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
  const containerWidth = isCompact ? "160px" : "240px";
  const containerHeight = isCompact ? "140px" : "190px";

  return (
    <div
      className="interviewer-video-wrap"
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        borderRadius: isCompact ? 16 : 20,
        overflow: "hidden",
        backgroundColor: "#0A1F3D",
        boxShadow: isSpeaking
          ? "0 0 0 4px rgba(245, 180, 26, 0.5), 0 10px 25px rgba(10,31,61,0.3)"
          : isListening
          ? "0 0 0 4px rgba(34, 197, 94, 0.45), 0 10px 25px rgba(10,31,61,0.25)"
          : isWaiting
          ? "0 0 0 3px rgba(59, 130, 246, 0.4), 0 10px 25px rgba(10,31,61,0.2)"
          : "0 8px 24px rgba(10,31,61,0.2)",
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
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          background: isSpeaking
            ? "rgba(245, 180, 26, 0.95)"
            : isListening
            ? "rgba(34, 197, 94, 0.95)"
            : isWaiting
            ? "rgba(59, 130, 246, 0.95)"
            : "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(4px)",
          color: isSpeaking ? "#0A1F3D" : "#ffffff",
          fontSize: 9.5,
          fontWeight: 800,
          letterSpacing: 0.5,
          padding: "3px 9px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 5,
          boxShadow: "0 2px 6px rgba(0,0,0,0.25)",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        {isSpeaking ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#0A1F3D", animation: "pulse 1s infinite" }}></span>
            AI ASKING
          </>
        ) : isListening ? (
          <>
            <i className="fa-solid fa-microphone" style={{ fontSize: 9 }}></i>
            LISTENING TO YOU
          </>
        ) : isWaiting ? (
          <>
            <i className="fa-solid fa-hourglass-half" style={{ fontSize: 8 }}></i>
            READY FOR RESPONSE
          </>
        ) : (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#94A3B8" }}></span>
            AI INTERVIEWER
          </>
        )}
      </div>
    </div>
  );
}

export default function ClaudeMockInterviewBot({ candidateData, onCompleted }) {
  const toast = useToast();
  const chatEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const recognitionShouldRunRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const stoppingAnswerRef = useRef(false);
  const startedAtRef = useRef(null);
  const speechDelayTimerRef = useRef(null);
  const speechSafetyTimerRef = useRef(null);
  const accumulatedTranscriptRef = useRef("");
  const liveInterimRef = useRef("");

  // Inactivity countdown refs & state
  const inactivityIntervalRef = useRef(null);
  const answerStartedRef = useRef(false);

  // loading | setup | interview | report
  const [step, setStep] = useState("loading");
  const [session, setSession] = useState(null);
  const [transcript, setTranscript] = useState([]); // [{ speaker: "messi"|"you", text }]
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [liveInterim, setLiveInterim] = useState("");
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Inactivity state
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(INACTIVITY_TIMEOUT_SECONDS);
  const [isWaitingForAnswerStart, setIsWaitingForAnswerStart] = useState(false);
  const [hasStartedAnswering, setHasStartedAnswering] = useState(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState("");

  const speechSupported = typeof window !== "undefined" && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);

  const avatarState = isSpeaking
    ? "speaking"
    : isListening
    ? "listening"
    : isWaitingForAnswerStart
    ? "waiting"
    : "idle";

  // Auto-scroll chat transcript
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, loadingTurn, liveInterim]);

  // Load existing session on mount
  useEffect(() => {
    let cancelled = false;
    api
      .get("/candidate/ai-interview/state")
      .then((res) => {
        if (cancelled) return;
        const s = res.data?.session;
        if (s && (s.status === "COMPLETED" || s.status === "STOPPED")) {
          setSession(s);
          setStep("report");
        } else if (s && s.status === "IN_PROGRESS") {
          setSession(s);
          setTranscript(hydrateTranscript(s));
          setStep("setup");
        } else {
          setStep("setup");
        }
      })
      .catch(() => setStep("setup"))
      .finally(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function hydrateTranscript(s) {
    const lines = [];
    (s.turns || []).forEach((t) => {
      lines.push({ speaker: "you", text: t.candidateAnswer || "(no answer)" });
      lines.push({ speaker: "messi", text: t.messiReply });
    });
    return lines;
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearInactivityTimer();
      stopListening();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    };
  }, []);

  // Duration timer
  useEffect(() => {
    if (step !== "interview") return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Post-answering silence auto-submit: once the candidate has actually started speaking
  // and provided words, if they pause for 4s, auto-submit their answer.
  const handleStopAnswerRef = useRef(() => {});
  useEffect(() => {
    handleStopAnswerRef.current = handleStopAnswer;
  });

  useEffect(() => {
    if (!isListening || !hasStartedAnswering) return;
    const timer = setInterval(() => {
      if (lastSpeechAtRef.current > 0 && Date.now() - lastSpeechAtRef.current >= SILENCE_TIMEOUT_AFTER_ANSWER_MS) {
        const words = (liveInterimRef.current || liveInterim).trim().split(/\s+/).filter(Boolean);
        if (words.length >= 3) {
          handleStopAnswerRef.current();
        }
      }
    }, 400);
    return () => clearInterval(timer);
  }, [isListening, hasStartedAnswering, liveInterim]);

  function clearInactivityTimer() {
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current);
      inactivityIntervalRef.current = null;
    }
  }

  // Starts the 5-second countdown to start answering
  function startInactivityCountdown() {
    clearInactivityTimer();
    answerStartedRef.current = false;
    setHasStartedAnswering(false);
    setIsWaitingForAnswerStart(true);
    setInactivitySecondsLeft(INACTIVITY_TIMEOUT_SECONDS);
    setAutoAdvanceNotice("");

    let secondsLeft = INACTIVITY_TIMEOUT_SECONDS;
    inactivityIntervalRef.current = setInterval(() => {
      if (answerStartedRef.current) {
        clearInactivityTimer();
        return;
      }
      secondsLeft -= 1;
      setInactivitySecondsLeft(secondsLeft);

      if (secondsLeft <= 0) {
        clearInactivityTimer();
        handleInactivityTimeout();
      }
    }, 1000);
  }

  // Triggered when 5 seconds pass with no speech or typing
  function handleInactivityTimeout() {
    if (answerStartedRef.current || stoppingAnswerRef.current) return;
    stoppingAnswerRef.current = true;
    setIsWaitingForAnswerStart(false);
    setHasStartedAnswering(false);
    stopListening();
    setAutoAdvanceNotice("5 seconds of inactivity — moving to the next question...");
    toast("5 seconds of inactivity — moving to next question.", "!");

    setTimeout(() => {
      setAutoAdvanceNotice("");
      submitUtterance("(no answer)");
    }, 1200);
  }

  // Candidate started speaking or typing
  function markAnswerStarted() {
    if (!answerStartedRef.current) {
      answerStartedRef.current = true;
      clearInactivityTimer();
      setIsWaitingForAnswerStart(false);
      setHasStartedAnswering(true);
      setAutoAdvanceNotice("");
    }
  }

  // Text-To-Speech with human-like voice selection
  function speakText(text, onEnd) {
    if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
    if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);

    const cleanText = String(text || "")
      .replace(/[*_#`~[\]]/g, " ")
      .replace(/Question\s*(\d+)\s*of\s*(\d+):?/gi, "Question $1 of $2. ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (e) {}

    speechDelayTimerRef.current = setTimeout(() => {
      try {
        window.speechSynthesis.resume();
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = "en-US";
        utterance.rate = 0.96; // warm, natural conversational cadence
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const naturalVoice = voices.find(
          (v) =>
            v.lang &&
            v.lang.toLowerCase().startsWith("en") &&
            /natural|neural|jenny|aria|samantha|serena|google/i.test(v.name)
        );
        if (naturalVoice) utterance.voice = naturalVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = finish;
        utterance.onerror = finish;

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        const estimatedMs = Math.min(60000, Math.max(5000, cleanText.length * 120));
        speechSafetyTimerRef.current = setTimeout(finish, estimatedMs);
      } catch (err) {
        finish();
      }
    }, 60);
  }

  function openAnswerWindow() {
    accumulatedTranscriptRef.current = "";
    liveInterimRef.current = "";
    setLiveInterim("");
    lastSpeechAtRef.current = 0;
    stoppingAnswerRef.current = false;

    // Start 5-second inactivity countdown
    startInactivityCountdown();

    if (!micDenied && speechSupported) {
      recognitionShouldRunRef.current = true;
      setIsListening(true);
      startSpeechRecognition();
    }
  }

  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionShouldRunRef.current) return;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (e) => {
        let interim = "";
        let finalChunk = "";
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const tr = e.results[i][0].transcript;
          if (e.results[i].isFinal) {
            finalChunk += tr + " ";
          } else {
            interim += tr + " ";
          }
        }
        if (finalChunk) {
          accumulatedTranscriptRef.current += finalChunk;
        }
        const fullText = (accumulatedTranscriptRef.current + " " + interim).replace(/\s+/g, " ").trim();

        if (fullText) {
          lastSpeechAtRef.current = Date.now();
          markAnswerStarted(); // User started speaking! Cancel 5s timer
        }

        liveInterimRef.current = fullText;
        setLiveInterim(fullText);
      };

      recognition.onerror = (e) => {
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          setMicDenied(true);
          recognitionShouldRunRef.current = false;
          setIsListening(false);
          toast("Microphone access blocked — you can type your answers below.", "!");
        }
      };

      recognition.onend = () => {
        if (recognitionShouldRunRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {}
  }

  function stopListening() {
    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsListening(false);
  }

  function handleStopAnswer() {
    if (stoppingAnswerRef.current) return;
    stoppingAnswerRef.current = true;
    clearInactivityTimer();
    stopListening();
    const text = (liveInterimRef.current || liveInterim || inputText).trim();
    setLiveInterim("");
    liveInterimRef.current = "";
    accumulatedTranscriptRef.current = "";
    setInputText("");
    submitUtterance(text);
  }

  function handleTextChange(val) {
    setInputText(val);
    if (val.trim()) {
      markAnswerStarted(); // User started typing! Cancel 5s timer
    }
  }

  function handleTextSubmit(e) {
    if (e) e.preventDefault();
    const text = (inputText.trim() || liveInterimRef.current || liveInterim).trim();
    if (!text || loadingTurn) return;
    stoppingAnswerRef.current = true;
    clearInactivityTimer();
    stopListening();
    setInputText("");
    setLiveInterim("");
    liveInterimRef.current = "";
    accumulatedTranscriptRef.current = "";
    submitUtterance(text);
  }

  async function submitUtterance(text) {
    setTranscript((prev) => [...prev, { speaker: "you", text: text || "(no answer)" }]);
    setLoadingTurn(true);
    clearInactivityTimer();
    setIsWaitingForAnswerStart(false);
    setHasStartedAnswering(false);

    try {
      const endpoint = STOP_COMMAND_RE.test(text) ? "/candidate/ai-interview/end" : "/candidate/ai-interview/turn";
      const body = endpoint.endsWith("/end") ? {} : { candidateUtterance: text };

      const res = await api.post(endpoint, body);
      let acknowledgment = res.data.messiReply || "Thank you for sharing that!";
      const interviewEnded = Boolean(res.data.interviewEnded) || Boolean(res.data.result);
      const nextSession = res.data.session;

      let speechToPlay = acknowledgment;

      // If next question exists, stitch acknowledgment + next question seamlessly
      if (!interviewEnded && nextSession) {
        const nextQIndex = nextSession.currentQuestionIndex;
        const nextQ = nextSession.questions?.[nextQIndex];
        if (nextQ?.question) {
          const nextQHeader = `Question ${nextQIndex + 1} of ${nextSession.questions.length}: ${nextQ.question}`;
          speechToPlay = `${acknowledgment}\n\n${nextQHeader}`;
        }
      }

      setTranscript((prev) => [...prev, { speaker: "messi", text: speechToPlay }]);
      if (nextSession) setSession(nextSession);
      stoppingAnswerRef.current = false;

      if (interviewEnded) {
        speakText(speechToPlay, () => {});
        setStep("report");
        const finalResult = res.data.result || nextSession?.result;
        if (typeof finalResult?.overallScore === "number" && onCompleted) {
          onCompleted({ score: finalResult.overallScore });
        }
        toast(`Mock interview completed! Score: ${finalResult?.overallScore ?? "-"} / 100`, "✓");
      } else {
        // Speak acknowledgment and next question, then start 5s window
        speakText(speechToPlay, () => openAnswerWindow());
      }
    } catch (err) {
      console.error("AI Interview turn error:", err);
      toast("Connection issue reaching AI interviewer — please try again.", "!");
      stoppingAnswerRef.current = false;
      setInputText(text);
      openAnswerWindow();
    } finally {
      setLoadingTurn(false);
    }
  }

  async function handleStart(retake) {
    setStarting(true);
    try {
      const res = await api.post("/candidate/ai-interview/start", retake ? { retake: true } : {});
      const nextSession = res.data.session;
      setSession(nextSession);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      const messiReply = res.data.messiReply || "Welcome! Let's begin.";
      setTranscript(retake ? [{ speaker: "messi", text: messiReply }] : [...hydrateTranscript(nextSession), { speaker: "messi", text: messiReply }]);
      setStep("interview");
      speakText(messiReply, () => openAnswerWindow());
    } catch (err) {
      console.error("AI Interview start error:", err);
      toast(err.response?.data?.message || "Couldn't start the AI Interview — please try again.", "!");
    } finally {
      setStarting(false);
    }
  }

  function handleEndNow() {
    if (!window.confirm("End the interview now? The AI will generate your feedback report from the answered questions.")) return;
    submitUtterance("Please end the interview.");
  }

  const result = session?.result;
  const totalQuestions = session?.questions?.length || 5;
  const currentQIndex = session?.currentQuestionIndex ?? 0;
  const currentQNumber = Math.min(currentQIndex + 1, totalQuestions);
  const remainingQuestions = Math.max(0, totalQuestions - currentQNumber);
  const currentQuestionObj = session?.questions?.[currentQIndex] || null;

  return (
    <div className="card" style={{ padding: 0, borderRadius: 16, border: "2px solid #0A1F3D", overflow: "hidden", background: "#FFFFFF", boxShadow: "0 10px 30px rgba(10,31,61,0.06)" }}>
      {/* 1. TOP HEADER BAR */}
      <div style={{ background: "#0A1F3D", color: "#FFFFFF", padding: "16px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 42, height: 42, borderRadius: "50%", background: "#F5B41A", color: "#0A1F3D", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 3px 10px rgba(245,180,26,0.3)" }}>
            <i className="fa-solid fa-user-tie"></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16.5, fontWeight: 800, color: "#FFFFFF", letterSpacing: "-0.01em" }}>
              AI Mock Interview · Candidate Dashboard
            </h4>
            <span style={{ fontSize: 11.5, color: "#F5B41A", fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#F5B41A", display: "inline-block" }}></span>
              Real-time Human-like Interview for Students & Freshers
            </span>
          </div>
        </div>

        {step === "interview" && (
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ background: "rgba(255,255,255,0.08)", padding: "5px 12px", borderRadius: 8, fontSize: 12, fontWeight: 700, color: "#E2E8F0", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fa-regular fa-clock" style={{ color: "#F5B41A" }}></i>
              <span>{formatDuration(elapsedSeconds)}</span>
            </div>
            <button
              type="button"
              onClick={handleEndNow}
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid #EF4444",
                color: "#FCA5A5",
                borderRadius: 8,
                padding: "6px 12px",
                fontSize: 11.5,
                fontWeight: 700,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <i className="fa-solid fa-flag-checkered" style={{ marginRight: 6 }}></i>
              Finish Early
            </button>
          </div>
        )}
      </div>

      {step === "loading" && (
        <div style={{ padding: 60, textAlign: "center", color: "#64748B", fontSize: 14 }}>
          <i className="fa-solid fa-spinner fa-spin" style={{ fontSize: 24, marginBottom: 12, color: "#0A1F3D", display: "block" }}></i>
          Connecting to AI Interviewer…
        </div>
      )}

      {/* 2. SETUP / WELCOME SCREEN */}
      {step === "setup" && (
        <div style={{ padding: "40px 32px", textAlign: "center", background: "#F8FAFC" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 20 }}>
            <InterviewerVideoAvatar state="idle" size="large" />
          </div>

          {session?.status === "IN_PROGRESS" ? (
            <>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "#0A1F3D", margin: "0 0 8px" }}>
                Resume Your AI Mock Interview
              </h3>
              <p style={{ fontSize: 13.5, color: "#64748B", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.6 }}>
                You were currently on <strong>Question {currentQNumber} of {totalQuestions}</strong>. Click below to continue right where you left off.
              </p>
              <button
                type="button"
                className="btn btn-gold"
                style={{ padding: "13px 30px", fontSize: 14, fontWeight: 800, borderRadius: 10 }}
                disabled={starting}
                onClick={() => handleStart(false)}
              >
                {starting ? "Reconnecting…" : `Resume Question ${currentQNumber} of ${totalQuestions} →`}
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 21, fontWeight: 800, color: "#0A1F3D", margin: "0 0 10px", letterSpacing: "-0.01em" }}>
                Ready for Your 1-on-1 AI Mock Interview?
              </h3>
              <p style={{ fontSize: 13.5, color: "#475569", maxWidth: 560, margin: "0 auto 24px", lineHeight: 1.6 }}>
                The AI interviewer will ask you <strong>5 simple interview questions</strong> one by one, covering:
              </p>

              {/* 5 Topic preview chips */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 640, margin: "0 auto 28px" }}>
                {TOPIC_CONFIG.map((t, idx) => (
                  <span
                    key={t.key}
                    style={{
                      background: "#FFFFFF",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: 10,
                      padding: "8px 14px",
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#0A1F3D",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                    }}
                  >
                    <i className={`fa-solid ${t.icon}`} style={{ color: "#F5B41A" }}></i>
                    {t.label}
                  </span>
                ))}
              </div>

              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", maxWidth: 540, margin: "0 auto 26px", textAlign: "left", fontSize: 12.5, color: "#1E40AF", lineHeight: 1.55 }}>
                <strong><i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>How It Works:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>The AI asks each question out loud with natural voice speech.</li>
                  <li>You have up to <strong>5 seconds of inactivity</strong> to start answering (speak into mic or type).</li>
                  <li>If no response starts within 5s, the interview automatically moves to the next question.</li>
                  <li>The AI briefly acknowledges your response before presenting the next question.</li>
                </ul>
              </div>

              <button
                type="button"
                className="btn btn-gold"
                style={{ padding: "14px 34px", fontSize: 14.5, fontWeight: 800, borderRadius: 12, boxShadow: "0 4px 16px rgba(245,180,26,0.35)" }}
                disabled={starting}
                onClick={() => handleStart(false)}
              >
                {starting ? "Starting Interview…" : "Start AI Interview →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* 3. LIVE INTERVIEW SCREEN */}
      {step === "interview" && (
        <>
          {/* QUESTION INDICATOR HEADER */}
          <div style={{ background: "#F8FAFC", borderBottom: "1px solid #E2E8F0", padding: "14px 24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
              {/* Question Number (e.g., 2/5) */}
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ background: "#0A1F3D", color: "#FFFFFF", fontSize: 12.5, fontWeight: 800, padding: "4px 12px", borderRadius: 8, letterSpacing: "0.02em" }}>
                  Question {currentQNumber} / {totalQuestions}
                </span>
                <span style={{ fontSize: 12.5, color: "#475569", fontWeight: 700 }}>
                  ({remainingQuestions === 0 ? "Final Question" : `${remainingQuestions} remaining`})
                </span>
              </div>

              {/* Live Inactivity Countdown Pill */}
              {isWaitingForAnswerStart && (
                <div
                  style={{
                    background: inactivitySecondsLeft <= 2 ? "#FEE2E2" : "#FEF3C7",
                    color: inactivitySecondsLeft <= 2 ? "#B91C1C" : "#92400E",
                    border: `1.5px solid ${inactivitySecondsLeft <= 2 ? "#FCA5A5" : "#FDE68A"}`,
                    padding: "4px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    animation: inactivitySecondsLeft <= 2 ? "pulse 0.8s infinite" : "none",
                  }}
                >
                  <i className="fa-solid fa-stopwatch"></i>
                  <span>Start answering within: <strong>{inactivitySecondsLeft}s</strong></span>
                </div>
              )}

              {hasStartedAnswering && (
                <div style={{ background: "#DCFCE7", color: "#15803D", border: "1px solid #86EFAC", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                  <i className="fa-solid fa-microphone"></i>
                  <span>Answering Question {currentQNumber}…</span>
                </div>
              )}
            </div>

            {/* Step Breadcrumbs (1. Intro, 2. Education, 3. Skills, 4. Projects, 5. Career Goals) */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8, marginTop: 4 }}>
              {TOPIC_CONFIG.map((topic, idx) => {
                const isPassed = idx < currentQIndex;
                const isCurrent = idx === currentQIndex;

                return (
                  <div
                    key={topic.key}
                    style={{
                      padding: "6px 8px",
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: isCurrent ? 800 : 700,
                      background: isCurrent ? "#0A1F3D" : isPassed ? "#DCFCE7" : "#FFFFFF",
                      color: isCurrent ? "#FFFFFF" : isPassed ? "#15803D" : "#94A3B8",
                      border: `1.5px solid ${isCurrent ? "#0A1F3D" : isPassed ? "#86EFAC" : "#E2E8F0"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "all 0.2s ease",
                    }}
                    title={topic.label}
                  >
                    {isPassed ? (
                      <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i>
                    ) : (
                      <span style={{ fontSize: 9.5 }}>{idx + 1}.</span>
                    )}
                    <span>{topic.key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CURRENT QUESTION SHOWCASE */}
          {currentQuestionObj && (
            <div style={{ padding: "20px 24px 12px", background: "#FFFFFF", borderBottom: "1px dashed #E2E8F0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ background: "#F1F5F9", color: "#0A1F3D", border: "1px solid #CBD5E1", fontSize: 11, fontWeight: 800, padding: "2px 8px", borderRadius: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  {currentQuestionObj.topicLabel || currentQuestionObj.topic || `Topic ${currentQNumber}`}
                </span>
                {isSpeaking && (
                  <span style={{ color: "#F5B41A", fontSize: 11.5, fontWeight: 800, display: "flex", alignItems: "center", gap: 5 }}>
                    <i className="fa-solid fa-volume-high"></i> Asking out loud…
                  </span>
                )}
              </div>
              <h3 style={{ margin: 0, fontSize: 17.5, fontWeight: 700, color: "#0F172A", lineHeight: 1.5 }}>
                {currentQuestionObj.question}
              </h3>
            </div>
          )}

          {/* AUTO-ADVANCE NOTICE BANNER */}
          {autoAdvanceNotice && (
            <div style={{ background: "#FEF2F2", borderBottom: "1px solid #FCA5A5", padding: "10px 24px", color: "#991B1B", fontSize: 12.5, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-circle-exclamation"></i>
              <span>{autoAdvanceNotice}</span>
            </div>
          )}

          {/* MAIN INTERACTION SPLIT: AVATAR + LIVE CONVERSATION */}
          <div style={{ display: "grid", gridTemplateColumns: "170px 1fr", gap: 16, padding: "16px 24px 8px", alignItems: "flex-start" }}>
            {/* Left: Avatar & State */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <InterviewerVideoAvatar state={avatarState} size="compact" />
              {isWaitingForAnswerStart && (
                <div style={{ width: "100%", background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 8, padding: 8, textAlign: "center" }}>
                  <div style={{ fontSize: 10.5, fontWeight: 800, color: "#64748B", textTransform: "uppercase", marginBottom: 3 }}>
                    Inactivity Timer
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 900, color: inactivitySecondsLeft <= 2 ? "#DC2626" : "#0A1F3D" }}>
                    {inactivitySecondsLeft}s
                  </div>
                </div>
              )}
            </div>

            {/* Right: Live Transcript Console */}
            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 12, padding: 14, minHeight: 140, maxHeight: 240, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0A1F3D", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, display: "flex", justifyContent: "space-between" }}>
                <span>Conversation Thread</span>
                {isListening && (
                  <span style={{ color: "#16A34A", display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16A34A", animation: "pulse 1s infinite" }}></span>
                    Mic Active
                  </span>
                )}
              </div>

              {transcript.map((line, idx) => {
                const isMessi = line.speaker === "messi";
                return (
                  <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isMessi ? "flex-start" : "flex-end" }}>
                    <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, marginBottom: 2 }}>
                      {isMessi ? "AI INTERVIEWER" : "YOU"}
                    </div>
                    <div
                      style={{
                        maxWidth: "88%",
                        padding: "8px 12px",
                        borderRadius: isMessi ? "12px 12px 12px 2px" : "12px 12px 2px 12px",
                        background: isMessi ? "#FFFFFF" : "#0A1F3D",
                        color: isMessi ? "#1E293B" : "#FFFFFF",
                        border: isMessi ? "1px solid #CBD5E1" : "none",
                        fontSize: 12.5,
                        lineHeight: 1.5,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {line.text}
                    </div>
                  </div>
                );
              })}

              {/* Real-time interim transcription */}
              {liveInterim && (
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ fontSize: 9.5, color: "#16A34A", fontWeight: 800, marginBottom: 2 }}>
                    TRANSCRIBING LIVE…
                  </div>
                  <div style={{ maxWidth: "88%", padding: "8px 12px", borderRadius: "12px 12px 2px 12px", background: "rgba(10,31,61,0.06)", border: "1.5px dashed #0A1F3D", color: "#0A1F3D", fontSize: 12.5, fontStyle: "italic" }}>
                    {liveInterim}
                  </div>
                </div>
              )}

              {loadingTurn && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#0A1F3D", fontSize: 12, fontWeight: 700, padding: 4 }}>
                  <i className="fa-solid fa-spinner fa-spin" style={{ color: "#F5B41A" }}></i>
                  AI is acknowledging your response…
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
          </div>

          {/* 4. INPUT & ACTION CONTROLS */}
          <form
            onSubmit={handleTextSubmit}
            style={{
              padding: "12px 24px 18px",
              background: "#FFFFFF",
              borderTop: "1px solid #CBD5E1",
              display: "flex",
              gap: 10,
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            {speechSupported && !micDenied && (
              <button
                type="button"
                onClick={() => (isListening ? handleStopAnswer() : openAnswerWindow())}
                disabled={loadingTurn || isSpeaking}
                style={{
                  background: isListening ? "#DC2626" : "#F1F5F9",
                  color: isListening ? "#FFFFFF" : "#0A1F3D",
                  border: isListening ? "none" : "1.5px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "10px 16px",
                  cursor: loadingTurn || isSpeaking ? "not-allowed" : "pointer",
                  fontSize: 13,
                  fontWeight: 800,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loadingTurn || isSpeaking ? 0.6 : 1,
                  boxShadow: isListening ? "0 3px 10px rgba(220,38,38,0.3)" : "none",
                }}
                title={isListening ? "Submit your spoken answer" : "Answer by voice"}
              >
                <i className={`fa-solid ${isListening ? "fa-check" : "fa-microphone"}`}></i>
                <span>{isListening ? "Done Answering" : "Voice"}</span>
              </button>
            )}

            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                isWaitingForAnswerStart
                  ? "Speak into your mic or start typing to answer (5s timeout)…"
                  : isListening
                  ? "Speaking… (you can also type here)"
                  : "Type your response, or speak into your microphone…"
              }
              disabled={loadingTurn}
              style={{
                flex: 1,
                minWidth: 200,
                padding: "11px 16px",
                borderRadius: 10,
                border: "1.5px solid #CBD5E1",
                fontSize: 13,
                outline: "none",
                background: isWaitingForAnswerStart ? "#FFFBEB" : "#FFFFFF",
              }}
            />

            <button
              type="submit"
              className="btn btn-gold"
              disabled={(!inputText.trim() && !liveInterim.trim()) || loadingTurn}
              style={{ padding: "11px 22px", fontSize: 13, fontWeight: 800, borderRadius: 10 }}
            >
              Send Answer <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6 }}></i>
            </button>

            {/* Skip button for quick manual skip if candidate chooses */}
            <button
              type="button"
              onClick={() => submitUtterance("(no answer)")}
              disabled={loadingTurn || isSpeaking}
              style={{
                background: "none",
                border: "1px solid #CBD5E1",
                color: "#64748B",
                borderRadius: 10,
                padding: "10px 14px",
                fontSize: 12,
                fontWeight: 700,
                cursor: loadingTurn || isSpeaking ? "not-allowed" : "pointer",
              }}
            >
              Skip →
            </button>
          </form>
        </>
      )}

      {/* 5. INTERVIEW SUMMARY & FEEDBACK (REPORT) */}
      {step === "report" && result && (
        <div style={{ padding: 28 }}>
          {/* Main Score Hero Card */}
          <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", borderRadius: 16, padding: "26px 20px", textAlign: "center", marginBottom: 24, boxShadow: "0 4px 16px rgba(34,197,94,0.08)" }}>
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
              <i className="fa-solid fa-circle-check"></i>
              MOCK INTERVIEW COMPLETED
            </span>
            <h3 style={{ margin: "12px 0 6px", fontSize: 32, fontWeight: 900, color: "#15803D" }}>
              {result.overallScore} / 100
            </h3>
            <p style={{ margin: "0 auto", fontSize: 13.5, color: "#166534", maxWidth: 560, lineHeight: 1.6 }}>
              {result.finalFeedback}
            </p>
          </div>

          {/* Competency Breakdown Bars */}
          <h4 style={{ fontSize: 13.5, fontWeight: 800, color: "#0A1F3D", margin: "0 0 12px", letterSpacing: "0.02em" }}>
            Performance Breakdown
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 12, marginBottom: 24 }}>
            {Object.entries(result.breakdown || {}).map(([key, val]) => (
              <div key={key} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: "#64748B", textTransform: "capitalize", marginBottom: 6 }}>
                  {key.replace(/([A-Z])/g, " $1")}
                </div>
                <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${val}%`, background: "#0A1F3D" }}></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>{val}%</div>
              </div>
            ))}
          </div>

          {/* Strengths & Areas for Improvement Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16, marginBottom: 24 }}>
            {/* Strengths */}
            <div style={{ background: "#F0FDF4", border: "1.5px solid #BBF7D0", borderRadius: 12, padding: 16 }}>
              <h5 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#15803D", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fa-solid fa-star"></i> Key Strengths
              </h5>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#166534", lineHeight: 1.7 }}>
                {(result.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div style={{ background: "#FFF7ED", border: "1.5px solid #FED7AA", borderRadius: 12, padding: 16 }}>
              <h5 style={{ margin: "0 0 10px", fontSize: 13, fontWeight: 800, color: "#B45309", display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fa-solid fa-arrow-trend-up"></i> Areas for Improvement
              </h5>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: "#92400E", lineHeight: 1.7 }}>
                {(result.areasToImprove || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* 5-Question Analysis Breakdown */}
          <h4 style={{ fontSize: 13.5, fontWeight: 800, color: "#0A1F3D", margin: "0 0 12px", letterSpacing: "0.02em" }}>
            Question-by-Question Review (5 Questions)
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 26 }}>
            {(result.questionAnalysis || []).map((q, idx) => {
              const tag = EVAL_LABELS[q.evaluation] || EVAL_LABELS.no_answer;
              return (
                <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 10, padding: 14, fontSize: 12.5 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ color: "#0A1F3D", fontSize: 13 }}>
                      Q{q.questionNumber || idx + 1}. {q.question}
                    </strong>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ background: tag.bg, color: tag.color, fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontSize: 10.5 }}>
                        {tag.label}
                      </span>
                      <span style={{ background: "#F1F5F9", color: "#0A1F3D", fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontSize: 10.5 }}>
                        {q.score}/10
                      </span>
                    </div>
                  </div>
                  <div style={{ color: "#475569", marginBottom: 6 }}>
                    <strong>Your Response:</strong> {q.candidateAnswer || "(No response within 5s window)"}
                  </div>
                  <div style={{ color: "#334155", fontStyle: "italic", background: "#F8FAFC", padding: "8px 10px", borderRadius: 8, borderLeft: "3px solid #0A1F3D" }}>
                    <strong>Feedback:</strong> {q.feedback}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Bottom Controls */}
          <div style={{ display: "flex", gap: 12, alignItems: "center", justifyContent: "center", paddingTop: 18, borderTop: "1px solid #E2E8F0", flexWrap: "wrap" }}>
            <button
              type="button"
              disabled={starting}
              onClick={() => handleStart(true)}
              style={{
                background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                color: "#0A1F3D",
                border: "none",
                padding: "12px 26px",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 13.5,
                cursor: "pointer",
                boxShadow: "0 4px 12px rgba(229,168,46,0.3)",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className={`fa-solid ${starting ? "fa-spinner fa-spin" : "fa-rotate-right"}`}></i>
              {starting ? "Starting Fresh Session…" : "Retake Mock Interview"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
