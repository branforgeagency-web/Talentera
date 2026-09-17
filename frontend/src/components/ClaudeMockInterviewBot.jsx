import React, { useEffect, useRef, useState } from "react";
import Vapi from "@vapi-ai/web";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// Maximum seconds of inactivity allowed before auto-advancing to next question
const INACTIVITY_TIMEOUT_SECONDS = 30;

const TOPIC_CONFIG = [
  { key: "ICD-10-CM", label: "1. ICD-10-CM Coding", icon: "fa-notes-medical" },
  { key: "CPT Codes", label: "2. CPT Procedure Codes", icon: "fa-file-medical" },
  { key: "E/M Coding", label: "3. E/M Coding", icon: "fa-user-doctor" },
  { key: "Billing", label: "4. Billing & Claims", icon: "fa-file-invoice-dollar" },
  { key: "HIPAA", label: "5. HIPAA & Compliance", icon: "fa-shield-halved" },
];

const EVAL_LABELS = {
  correct: { label: "Strong Answer", color: "#15803D", bg: "#DCFCE7" },
  partial: { label: "Good Foundation", color: "#B45309", bg: "#FEF3C7" },
  incorrect: { label: "Needs Practice", color: "#B91C1C", bg: "#FEE2E2" },
  no_answer: { label: "No Response (30s)", color: "#64748B", bg: "#F1F5F9" },
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
  const vapiRef = useRef(null);
  const vapiEventsWiredRef = useRef(false);
  const lastSpeechAtRef = useRef(0);
  const stoppingAnswerRef = useRef(false);
  const startedAtRef = useRef(null);
  const liveInterimRef = useRef("");
  const sessionRef = useRef(null);

  // Inactivity countdown refs & state
  const inactivityIntervalRef = useRef(null);
  const answerStartedRef = useRef(false);
  const isSwitchingCallRef = useRef(false);
  // Re-entrancy guard for startVapiCall. Without this, two overlapping
  // invocations (double-clicking "Reconnect Voice", or advanceViaRest's
  // catch-path racing a still-in-flight call from handleStart) could each
  // create their own `new Vapi(...)` instance before the other's stop()
  // finished tearing down its Daily.co WebRTC session - two live call
  // objects at once, which is exactly what produced the "attempting to use
  // multiple call instances simultaneously" / "KrispSDK is duplicated" /
  // "Meeting ended due to ejection" errors. Every call site now funnels
  // through this single mutex.
  const isConnectingCallRef = useRef(false);

  // loading | setup | interview | report
  const [step, setStep] = useState("loading");
  const [session, setSession] = useState(null);
  const [transcript, setTranscript] = useState([]); // [{ speaker: "messi"|"you", text }]
  const [inputText, setInputText] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isCallConnected, setIsCallConnected] = useState(false);
  const [liveInterim, setLiveInterim] = useState("");
  const [loadingTurn, setLoadingTurn] = useState(false);
  const [starting, setStarting] = useState(false);
  const [micDenied, setMicDenied] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isConnectingCall, setIsConnectingCall] = useState(false);

  // Candidate's own camera + mic preview. Per the AI Mock Interview
  // requirements, the candidate's camera and microphone should automatically
  // turn on (after the browser permission prompt) once the interview
  // starts. This is a self-view only, separate from the Vapi call's own
  // microphone capture used for the actual interview audio below.
  const candidateVideoRef = useRef(null);
  const candidateStreamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // Inactivity state
  const [inactivitySecondsLeft, setInactivitySecondsLeft] = useState(INACTIVITY_TIMEOUT_SECONDS);
  const [isWaitingForAnswerStart, setIsWaitingForAnswerStart] = useState(false);
  const [hasStartedAnswering, setHasStartedAnswering] = useState(false);
  const [autoAdvanceNotice, setAutoAdvanceNotice] = useState("");

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

  // Keep a ref mirror of session so event callbacks registered once on the
  // Vapi instance (see wireVapiEvents) always see the latest value instead
  // of a stale closure from whenever they were registered.
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

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
      try {
        vapiRef.current?.stop();
      } catch (e) {}
      stopCandidateCamera();
    };
  }, []);

  // Request camera + microphone access and start a live self-view preview.
  // Called right when the mock interview starts (handleStart), so the
  // candidate's camera/mic turn on automatically once the browser
  // permission prompt is answered - it never blocks the interview from
  // starting if the candidate declines or no camera is available, it just
  // shows a small banner instead (same graceful-degradation pattern as the
  // Self-Introduction recorder).
  async function startCandidateCamera() {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError("Camera is not supported in this browser.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      candidateStreamRef.current = stream;
      if (candidateVideoRef.current) {
        candidateVideoRef.current.srcObject = stream;
      }
      setCameraReady(true);
      setCameraError("");
    } catch (err) {
      console.warn("Camera/mic access error:", err);
      setCameraReady(false);
      setCameraError(
        err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError"
          ? "Camera/microphone access denied. Please allow permissions to be proctored on camera during the interview."
          : "Could not access your camera/microphone."
      );
    }
  }

  function stopCandidateCamera() {
    if (candidateStreamRef.current) {
      candidateStreamRef.current.getTracks().forEach((t) => t.stop());
      candidateStreamRef.current = null;
    }
    if (candidateVideoRef.current) {
      candidateVideoRef.current.srcObject = null;
    }
    setCameraReady(false);
  }

  // Duration timer
  useEffect(() => {
    if (step !== "interview") return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

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

  // Triggered when 30 seconds pass with no speech or typing
  function handleInactivityTimeout() {
    if (answerStartedRef.current || stoppingAnswerRef.current) return;
    stoppingAnswerRef.current = true;
    setIsWaitingForAnswerStart(false);
    setHasStartedAnswering(false);
    setAutoAdvanceNotice("30 seconds of inactivity — moving to the next question...");
    toast("30 seconds of inactivity — moving to next question.", "!");

    setTimeout(() => {
      setAutoAdvanceNotice("");
      advanceViaRest("(no answer)");
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

  // Opens the "start answering" window after Messi finishes asking a
  // question - mirrors the old browser-TTS onEnd() callback, just triggered
  // from Vapi's speech-end event instead (see wireVapiEvents below).
  function openAnswerWindow() {
    liveInterimRef.current = "";
    setLiveInterim("");
    lastSpeechAtRef.current = 0;
    stoppingAnswerRef.current = false;
    setLoadingTurn(false);
    startInactivityCountdown();
  }

  // Advances the interview for anything that ISN'T a real spoken answer
  // Vapi itself picked up: the 5-second-inactivity auto-advance, the manual
  // Skip button, and the typed-answer fallback. These go through the same
  // REST /ai-interview/turn endpoint the pre-Vapi version of this component
  // used (routes/candidate.js - proven reliable), rather than trying to
  // inject a fake turn into the live Vapi call: an earlier attempt at that
  // (vapi.send with an "add-message"/triggerResponseEnabled combination)
  // turned out to not be a real, safe Vapi Web SDK feature - it got the
  // whole call ejected ("Meeting ended due to ejection") instead of just
  // skipping one question. Real spoken answers still go straight through
  // the live call + the Vapi webhook (routes/vapiInterview.js), unaffected
  // by this - only these three non-voice paths use REST.
  //
  // Because the turn is applied server-side outside the live call, the
  // current Vapi call is stopped and a fresh one started right after so
  // Messi can voice-ask whatever the (now-advanced) current question is.
  async function advanceViaRest(text) {
    if (loadingTurn) return;
    clearInactivityTimer();
    setIsWaitingForAnswerStart(false);
    setHasStartedAnswering(false);
    stoppingAnswerRef.current = false;
    isSwitchingCallRef.current = true;
    setTranscript((prev) => [...prev, { speaker: "you", text: text || "(no answer)" }]);
    setLoadingTurn(true);

    try {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    } catch (e) {}

    // Allow Daily.co WebRTC peer connections and audio tracks to cleanly release
    await new Promise((resolve) => setTimeout(resolve, 800));

    const authToken = localStorage.getItem("talentera_token");

    try {
      const res = await api.post("/candidate/ai-interview/turn", { candidateUtterance: text });
      const messiReply = res.data.messiReply || "Thanks — let's continue.";
      const interviewEnded = Boolean(res.data.interviewEnded) || Boolean(res.data.result);
      const nextSession = res.data.session;
      if (nextSession) setSession(nextSession);
      setTranscript((prev) => [...prev, { speaker: "messi", text: messiReply }]);

      if (interviewEnded) {
        setStep("report");
        stopCandidateCamera();
        const finalResult = res.data.result || nextSession?.result;
        if (typeof finalResult?.overallScore === "number" && onCompleted) {
          onCompleted({ score: finalResult.overallScore });
        }
        toast(`Mock interview completed! Score: ${finalResult?.overallScore ?? "-"} / 100`, "✓");
      } else {
        await startVapiCall(authToken);
      }
    } catch (err) {
      console.error("AI Interview turn error:", err);
      toast("Connection issue reaching the AI interviewer — reconnecting…", "!");
      // Give the candidate another shot at the same question via voice.
      await startVapiCall(authToken);
    } finally {
      isSwitchingCallRef.current = false;
      setLoadingTurn(false);
    }
  }

  function handleManualSkip() {
    if (loadingTurn) return;
    advanceViaRest("(no answer)");
  }

  function handleTextChange(val) {
    setInputText(val);
    if (val.trim()) {
      markAnswerStarted(); // User started typing! Cancel 30s timer
    }
  }

  // Typed-answer fallback for when a candidate's mic isn't cooperating.
  // Voice (captured automatically by the live Vapi call) is the primary
  // path - see the note on advanceViaRest above for why this doesn't try
  // to inject the typed text into the live call.
  function handleTextSubmit(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loadingTurn) return;
    setInputText("");
    setLiveInterim("");
    liveInterimRef.current = "";
    advanceViaRest(text);
  }

  // Re-pulls the authoritative session (current question index, breadcrumb
  // progress, status) from the backend after each of Messi's finished
  // lines, since the actual turn-by-turn grading/advancement now happens
  // server-side inside the Vapi webhook (routes/vapiInterview.js) rather
  // than in response to a REST call this component makes directly.
  async function refreshSessionState() {
    try {
      const res = await api.get("/candidate/ai-interview/state");
      const s = res.data?.session;
      if (s) {
        setSession(s);
        if (s.status === "COMPLETED" || s.status === "STOPPED") {
          // Interview is done - stop the call ourselves in case Vapi's
          // endCallPhrases match didn't fire for some reason. handleVapiCallEnd
          // (wired to the "call-end" event) takes it from here either way.
          try {
            vapiRef.current?.stop();
          } catch (e) {}
        }
      }
    } catch (err) {
      console.error("Failed to refresh AI interview session state:", err);
    }
  }

  async function handleVapiCallEnd() {
    setIsCallConnected(false);
    clearInactivityTimer();
    setIsListening(false);
    setIsSpeaking(false);
    setIsWaitingForAnswerStart(false);
    setLoadingTurn(false);

    if (isSwitchingCallRef.current) {
      // Normal internal transition to the next question - do not treat as a drop
      return;
    }

    try {
      const res = await api.get("/candidate/ai-interview/state");
      const s = res.data?.session;
      if (s) {
        setSession(s);
        if (s.status === "COMPLETED" || s.status === "STOPPED") {
          setStep("report");
          stopCandidateCamera();
          const finalResult = s.result;
          if (typeof finalResult?.overallScore === "number" && onCompleted) {
            onCompleted({ score: finalResult.overallScore });
          }
          toast(`Mock interview completed! Score: ${finalResult?.overallScore ?? "-"} / 100`, "✓");
        } else {
          toast("The AI voice call was disconnected — you can continue typing or click Reconnect Voice Call.", "!");
        }
      }
    } catch (err) {
      console.error("Failed to refresh interview state after call end:", err);
    }
  }

  // Registers every Vapi call-lifecycle listener on the active Vapi client.
  function wireVapiEvents(vapi) {
    if (vapiEventsWiredRef.current) return;
    vapiEventsWiredRef.current = true;

    vapi.on("call-start", () => {
      setIsCallConnected(true);
    });

    vapi.on("speech-start", () => {
      // Messi has started speaking.
      setIsSpeaking(true);
      clearInactivityTimer();
      setIsWaitingForAnswerStart(false);
    });

    vapi.on("speech-end", () => {
      setIsSpeaking(false);
      // Messi just finished a line. If the interview is still in progress,
      // open the 30-second "start answering" window.
      if (sessionRef.current?.status === "IN_PROGRESS") {
        openAnswerWindow();
      }
    });

    vapi.on("message", (msg) => {
      if (!msg) return;

      if (msg.type === "transcript") {
        if (msg.role === "user") {
          if (msg.transcriptType === "final") {
            if (msg.transcript && msg.transcript.trim()) {
              markAnswerStarted();
            }
            setTranscript((prev) => [...prev, { speaker: "you", text: msg.transcript || "(no answer)" }]);
            setLiveInterim("");
            liveInterimRef.current = "";
          } else {
            // partial / interim
            if (msg.transcript && msg.transcript.trim()) {
              lastSpeechAtRef.current = Date.now();
              markAnswerStarted();
            }
            liveInterimRef.current = msg.transcript || "";
            setLiveInterim(msg.transcript || "");
          }
        } else if (msg.role === "assistant" && msg.transcriptType === "final" && msg.transcript) {
          setTranscript((prev) => [...prev, { speaker: "messi", text: msg.transcript }]);
          setLoadingTurn(false);
          refreshSessionState();
        }
      } else if (msg.type === "speech-update" && msg.role === "user") {
        setIsListening(msg.status === "started");
        if (msg.status === "started") {
          markAnswerStarted();
        }
      }
    });

    vapi.on("call-end", () => {
      handleVapiCallEnd();
    });

    vapi.on("error", (err) => {
      const errorMsg = String(err?.errorMsg || err?.error?.message || err?.message || "");
      console.warn("Vapi call event:", err);
      // Normal Daily.co meeting end / ejection event - do not alarm user with error toast
      if (/meeting has ended|ejection/i.test(errorMsg)) {
        return;
      }
      if (/permission|denied|mic/i.test(errorMsg)) {
        setMicDenied(true);
        toast("Microphone access blocked — please allow microphone access and try again.", "!");
      } else {
        toast("Voice connection issue with the AI interviewer — please try again.", "!");
      }
    });
  }

  async function startVapiCall(authToken) {
    // Mutex: never let two calls run this function's body concurrently.
    // A second caller arriving while one is already connecting is a no-op
    // rather than a second `new Vapi(...)` instance racing the first one.
    if (isConnectingCallRef.current) return;
    isConnectingCallRef.current = true;
    setIsConnectingCall(true);

    try {
      const assistantId = import.meta.env.VITE_VAPI_ASSISTANT_ID;
      const publicKey = import.meta.env.VITE_VAPI_PUBLIC_KEY;
      if (!assistantId || !publicKey) {
        toast("The AI interviewer's voice isn't configured yet — please contact support.", "!");
        return;
      }

      if (vapiRef.current) {
        const previousVapi = vapiRef.current;
        // Clear the ref before tearing down so nothing else can treat the
        // dying instance as "the current call" while we wait for it to
        // actually release its Daily.co WebRTC session and Krisp SDK.
        vapiRef.current = null;
        try {
          previousVapi.stop();
        } catch (e) {}
        await new Promise((r) => setTimeout(r, 600));
      }

      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapiEventsWiredRef.current = false;
      wireVapiEvents(vapi);

      try {
        await vapi.start(assistantId, {
          variableValues: { authToken: authToken || "" },
        });
        setIsCallConnected(true);
      } catch (err) {
        console.error("Vapi start error:", err);
        const errMsg = String(err?.message || "");
        if (!/meeting has ended|ejection/i.test(errMsg)) {
          toast("Couldn't connect to the AI interviewer's voice — please try again.", "!");
        }
      }
    } finally {
      isConnectingCallRef.current = false;
      setIsConnectingCall(false);
    }
  }

  async function handleStart(retake) {
    setStarting(true);
    try {
      // Camera + mic preview turn on automatically as the interview starts
      // (fires the browser permission prompt if not already granted); this
      // runs in parallel with starting the session so one slow permission
      // prompt doesn't stall the other.
      startCandidateCamera();
      const res = await api.post("/candidate/ai-interview/start", retake ? { retake: true } : {});
      const nextSession = res.data.session;
      setSession(nextSession);
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      setTranscript(retake ? [] : hydrateTranscript(nextSession));
      setStep("interview");

      // Messi's actual opening line is spoken by the live Vapi call itself
      // (dynamically generated server-side by the Custom LLM webhook - see
      // routes/vapiInterview.js), not synthesized here.
      const authToken = localStorage.getItem("talentera_token");
      await startVapiCall(authToken);
    } catch (err) {
      console.error("AI Interview start error:", err);
      toast(err.response?.data?.message || "Couldn't start the AI Interview — please try again.", "!");
    } finally {
      setStarting(false);
    }
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
            <div style={{ background: "rgba(245,180,26,0.15)", padding: "5px 12px", borderRadius: 8, fontSize: 11.5, fontWeight: 800, color: "#F5B41A", display: "flex", alignItems: "center", gap: 6 }}>
              <i className="fa-solid fa-lock"></i>
              All 5 questions required - no early finish
            </div>
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
                The AI interviewer will ask you <strong>{totalQuestions} interview questions</strong> from our official question bank, one by one.
              </p>

              {/* Topic preview chips */}
              <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 10, maxWidth: 640, margin: "0 auto 28px" }}>
                {(session?.questions && session.questions.length > 0 ? session.questions : TOPIC_CONFIG).slice(0, 6).map((t, idx) => (
                  <span
                    key={t.id || t.key || idx}
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
                    <i className="fa-solid fa-circle-question" style={{ color: "#F5B41A" }}></i>
                    {t.topicLabel || t.label || `Question ${idx + 1}`}
                  </span>
                ))}
              </div>

              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "14px 18px", maxWidth: 540, margin: "0 auto 26px", textAlign: "left", fontSize: 12.5, color: "#1E40AF", lineHeight: 1.55 }}>
                <strong><i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>How It Works:</strong>
                <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                  <li>The AI asks each question out loud with natural voice speech.</li>
                  <li>You have up to <strong>30 seconds</strong> to start answering (speak into mic or type).</li>
                  <li>If no response starts within 30s, the interview automatically moves to the next question.</li>
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

            {/* Step Breadcrumbs */}
            <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(totalQuestions, 8)}, 1fr)`, gap: 8, marginTop: 4 }}>
              {(session?.questions && session.questions.length > 0 ? session.questions : TOPIC_CONFIG).map((topic, idx) => {
                const isPassed = idx < currentQIndex;
                const isCurrent = idx === currentQIndex;
                const label = topic.topicLabel || topic.label || `Q${idx + 1}`;
                const key = topic.topic || topic.key || `Q${idx + 1}`;

                return (
                  <div
                    key={topic.id || topic.key || idx}
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
                    title={label}
                  >
                    {isPassed ? (
                      <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i>
                    ) : (
                      <span style={{ fontSize: 9.5 }}>{idx + 1}.</span>
                    )}
                    <span>{key}</span>
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

              {/* Candidate's own camera self-view - confirms camera+mic are
                  live for proctoring, per the AI Mock Interview requirements. */}
              <div style={{ width: 160, height: 110, borderRadius: 12, overflow: "hidden", background: "#0A1F3D", position: "relative", border: "2px solid #E2E8F0" }}>
                <video ref={candidateVideoRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)", display: cameraReady ? "block" : "none" }} />
                {!cameraReady && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,.6)", fontSize: 10, textAlign: "center", padding: 6 }}>
                    <i className="fa-solid fa-video-slash" style={{ fontSize: 16, marginBottom: 4 }}></i>
                    {cameraError || "Starting camera…"}
                  </div>
                )}
                {cameraReady && (
                  <span style={{ position: "absolute", top: 6, left: 6, background: "#DC2626", color: "#fff", fontSize: 8.5, fontWeight: 800, padding: "2px 6px", borderRadius: 6, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#fff" }} />
                    LIVE
                  </span>
                )}
              </div>

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
              <div style={{ fontSize: 11, fontWeight: 800, color: "#0A1F3D", textTransform: "uppercase", letterSpacing: "0.04em", borderBottom: "1px solid #E2E8F0", paddingBottom: 6, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span>Conversation Thread</span>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {isCallConnected ? (
                    <span style={{ color: isListening ? "#16A34A" : "#0284C7", display: "flex", alignItems: "center", gap: 5, fontSize: 10.5, fontWeight: 700 }}>
                      <span style={{ width: 6, height: 6, borderRadius: "50%", background: isListening ? "#16A34A" : "#0284C7", animation: isListening ? "pulse 1s infinite" : "none" }}></span>
                      {isListening ? "Listening…" : "Voice Live ✓"}
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => startVapiCall(localStorage.getItem("talentera_token"))}
                      disabled={loadingTurn || isConnectingCall}
                      style={{
                        background: "#FEF3C7",
                        color: "#92400E",
                        border: "1px solid #FCD34D",
                        borderRadius: 6,
                        padding: "2px 8px",
                        fontSize: 10,
                        fontWeight: 800,
                        cursor: "pointer",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                      title="Click to reconnect the AI interviewer voice call"
                    >
                      <span>{isConnectingCall ? "⏳ Connecting…" : "⚡ Reconnect Voice"}</span>
                    </button>
                  )}
                </div>
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
            <input
              type="text"
              value={inputText}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder={
                isWaitingForAnswerStart
                  ? "Speak into your mic, or type here to answer (30s timeout)…"
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
              disabled={!inputText.trim() || loadingTurn}
              style={{ padding: "11px 22px", fontSize: 13, fontWeight: 800, borderRadius: 10 }}
            >
              Send Answer <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6 }}></i>
            </button>

            {!isCallConnected && (
              <button
                type="button"
                onClick={() => startVapiCall(localStorage.getItem("talentera_token"))}
                disabled={loadingTurn || isConnectingCall}
                style={{
                  background: "#FFFBEB",
                  border: "1.5px solid #F59E0B",
                  color: "#B45309",
                  borderRadius: 10,
                  padding: "10px 14px",
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
                title="Reconnect voice connection with AI interviewer"
              >
                {isConnectingCall ? "⏳ Connecting…" : "🎙️ Reconnect Voice"}
              </button>
            )}

            {/* Skip button for quick manual skip if candidate chooses */}
            <button
              type="button"
              onClick={handleManualSkip}
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
                    <div style={{ display: "flex", gap: 6, flexShrink: 0, flexWrap: "wrap" }}>
                      <span style={{ background: tag.bg, color: tag.color, fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontSize: 10.5 }}>
                        {tag.label}
                      </span>
                      {Number.isFinite(q.keywordMatchCount) && (
                        <span style={{ background: "#EEF2FF", color: "#3730A3", fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontSize: 10.5 }}>
                          Keyword Match: {q.keywordMatchCount}/{q.totalKeywords || 3}
                        </span>
                      )}
                      <span style={{ background: "#F1F5F9", color: "#0A1F3D", fontWeight: 800, padding: "3px 8px", borderRadius: 999, fontSize: 10.5 }}>
                        {q.score}/10
                      </span>
                    </div>
                  </div>
                  <div style={{ color: "#475569", marginBottom: 6 }}>
                    <strong>Your Response:</strong> {q.candidateAnswer || "(No response within 30s window)"}
                  </div>
                  {Array.isArray(q.matchedKeywords) && q.matchedKeywords.length > 0 && (
                    <div style={{ color: "#166534", marginBottom: 6, fontSize: 11.5 }}>
                      <strong>Matched keywords:</strong> {q.matchedKeywords.join(", ")}
                      {Array.isArray(q.missingKeywords) && q.missingKeywords.length > 0 && (
                        <>
                          {" "}· <strong style={{ color: "#991B1B" }}>Missed:</strong> <span style={{ color: "#991B1B" }}>{q.missingKeywords.join(", ")}</span>
                        </>
                      )}
                    </div>
                  )}
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
