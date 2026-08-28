import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// Messi listens for this many seconds of silence before auto-submitting the
// candidate's current answer - same convention (and same constant value) as
// the Stage 5 AI Audio Interview (frontend/src/components/AiAudioInterview.jsx).
const SILENCE_TIMEOUT_MS = 5000;

// A fast client-side pre-check so "stop the interview" always works
// instantly, without waiting on a full backend round-trip - belt-and-
// suspenders on top of the same classification the backend also runs
// (backend/utils/claudeInterview.js detectQuickIntent).
const STOP_COMMAND_RE = /\b(stop|end|quit|terminate)\b[\s\S]*\binterview\b|^(stop|end)( it| this)?$/i;

const EVAL_LABELS = {
  correct: { label: "Correct", color: "#15803D", bg: "#DCFCE7" },
  partial: { label: "Partial", color: "#B45309", bg: "#FEF3C7" },
  incorrect: { label: "Incorrect", color: "#B91C1C", bg: "#FEE2E2" },
  no_answer: { label: "No Answer", color: "#64748B", bg: "#F1F5F9" },
};

function formatDuration(totalSeconds) {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// ---------------------------------------------------------------------------
// Messi's animated avatar - pure SVG + CSS, no external dependency. Three
// visual states: idle (slow breathing/blink loop), speaking (mouth
// animation while window.speechSynthesis is active), listening (pulsing mic
// ring while SpeechRecognition is running).
// ---------------------------------------------------------------------------
function MessiAvatar({ state }) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
  return (
    <div className={`messi-avatar-wrap ${isListening ? "messi-listening" : ""}`}>
      <svg viewBox="0 0 120 120" width="96" height="96" className={`messi-avatar-svg ${isSpeaking ? "messi-speaking" : "messi-idle"}`}>
        <circle cx="60" cy="60" r="56" fill="var(--navy)" />
        <circle cx="60" cy="60" r="56" fill="url(#messiGradient)" opacity="0.9" />
        <defs>
          <radialGradient id="messiGradient" cx="35%" cy="30%" r="75%">
            <stop offset="0%" stopColor="#173B6C" />
            <stop offset="100%" stopColor="#0A1F3D" />
          </radialGradient>
        </defs>
        {/* Face */}
        <circle cx="60" cy="58" r="34" fill="#F4E4C1" />
        {/* Eyes */}
        <ellipse className="messi-eye" cx="48" cy="54" rx="4.2" ry="5.4" fill="#0A1F3D" />
        <ellipse className="messi-eye" cx="72" cy="54" rx="4.2" ry="5.4" fill="#0A1F3D" />
        {/* Eyebrows */}
        <path d="M42 44 Q48 40 54 44" stroke="#6B4A2A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        <path d="M66 44 Q72 40 78 44" stroke="#6B4A2A" strokeWidth="2.4" fill="none" strokeLinecap="round" />
        {/* Mouth */}
        <rect className="messi-mouth" x="48" y="72" width="24" height="6" rx="3" fill="#0A1F3D" />
        {/* Headset / collar hint to read as "professional interviewer" */}
        <path d="M30 78 Q60 100 90 78" stroke="var(--gold)" strokeWidth="3" fill="none" strokeLinecap="round" opacity="0.85" />
      </svg>
      {isListening && (
        <div className="messi-mic-badge">
          <i className="fa-solid fa-microphone"></i>
        </div>
      )}
      {isSpeaking && (
        <div className="messi-wave">
          <span></span>
          <span></span>
          <span></span>
          <span></span>
        </div>
      )}
      <style>{`
        .messi-avatar-wrap { position: relative; width: 104px; height: 104px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .messi-avatar-svg { border-radius: 50%; box-shadow: 0 8px 24px rgba(10,31,61,0.25); }
        .messi-idle { animation: messiBreathe 3.2s ease-in-out infinite; }
        .messi-speaking { animation: messiBreathe 1.4s ease-in-out infinite; }
        @keyframes messiBreathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.035); } }
        .messi-eye { animation: messiBlink 4.5s ease-in-out infinite; transform-origin: center; }
        @keyframes messiBlink { 0%, 92%, 100% { transform: scaleY(1); } 95% { transform: scaleY(0.12); } }
        .messi-mouth { transform-origin: center; }
        .messi-speaking .messi-mouth { animation: messiTalk 0.42s ease-in-out infinite; }
        @keyframes messiTalk { 0%, 100% { transform: scaleY(1); } 50% { transform: scaleY(2.4) translateY(-2px); } }
        .messi-listening .messi-avatar-svg { box-shadow: 0 0 0 4px rgba(34,197,94,0.35), 0 8px 24px rgba(10,31,61,0.25); animation: messiListenPulse 1.6s ease-in-out infinite; }
        @keyframes messiListenPulse { 0%, 100% { box-shadow: 0 0 0 4px rgba(34,197,94,0.35), 0 8px 24px rgba(10,31,61,0.25); } 50% { box-shadow: 0 0 0 9px rgba(34,197,94,0.12), 0 8px 24px rgba(10,31,61,0.25); } }
        .messi-mic-badge { position: absolute; bottom: -2px; right: -2px; width: 26px; height: 26px; border-radius: 50%; background: #22C55E; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 11px; box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
        .messi-wave { position: absolute; bottom: -14px; left: 50%; transform: translateX(-50%); display: flex; gap: 3px; align-items: flex-end; height: 14px; }
        .messi-wave span { width: 3px; background: var(--gold); border-radius: 2px; animation: messiWaveBar 0.9s ease-in-out infinite; }
        .messi-wave span:nth-child(1) { animation-delay: 0s; }
        .messi-wave span:nth-child(2) { animation-delay: 0.15s; }
        .messi-wave span:nth-child(3) { animation-delay: 0.3s; }
        .messi-wave span:nth-child(4) { animation-delay: 0.45s; }
        @keyframes messiWaveBar { 0%, 100% { height: 4px; } 50% { height: 14px; } }
      `}</style>
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
  const utteranceRef = useRef(null);
  const speechDelayTimerRef = useRef(null);
  const speechSafetyTimerRef = useRef(null);

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
  const [proctorLogs, setProctorLogs] = useState({ tabSwitches: 0, focusLosses: 0 });
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const avatarState = isSpeaking ? "speaking" : isListening ? "listening" : "idle";
  const speechSupported = typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  // Auto-scroll the live transcript
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, loadingTurn]);

  // Load any existing session on mount (resume-on-refresh, or jump straight
  // to a completed report if the candidate already finished one).
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
          if (typeof s.result?.overallScore === "number" && onCompleted) {
            onCompleted({ score: s.result.overallScore });
          }
        } else if (s && s.status === "IN_PROGRESS") {
          setSession(s);
          setTranscript(hydrateTranscript(s));
          setStep("setup"); // candidate explicitly resumes via the button below
        } else {
          setStep("setup");
        }
      })
      .catch(() => setStep("setup"))
      .finally(() => {});
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function hydrateTranscript(s) {
    const lines = [];
    (s.turns || []).forEach((t) => {
      lines.push({ speaker: "you", text: t.candidateAnswer || "(no answer)" });
      lines.push({ speaker: "messi", text: t.messiReply });
    });
    return lines;
  }

  useEffect(() => {
    return () => {
      recognitionShouldRunRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Already stopped/never started - nothing to clean up.
        }
      }
      if (window.speechSynthesis) window.speechSynthesis.cancel();
      if (speechDelayTimerRef.current) clearTimeout(speechDelayTimerRef.current);
      if (speechSafetyTimerRef.current) clearTimeout(speechSafetyTimerRef.current);
    };
  }, []);

  // Anti-cheat: tab-switch / focus-loss tracking during the live interview,
  // same pattern as AiAudioInterview.jsx - logged and shown in the report
  // only, never auto-terminates this (optional practice) interview.
  useEffect(() => {
    if (step !== "interview") return;
    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setProctorLogs((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
      }
    }
    function handleBlur() {
      setProctorLogs((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
    }
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
    };
  }, [step]);

  // Interview duration timer
  useEffect(() => {
    if (step !== "interview") return;
    if (!startedAtRef.current) startedAtRef.current = Date.now();
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [step]);

  // Silence auto-submit: while listening, if SILENCE_TIMEOUT_MS passes with
  // no new speech, submit whatever's been transcribed so far.
  //
  // BUG FIX: this effect only re-runs when `isListening` flips, so the
  // setInterval callback used to close over whatever `handleStopAnswer`
  // (and, inside it, whatever `liveInterim`) existed at the exact render
  // where listening started - almost always "" fresh off openAnswerWindow's
  // reset. Every silence-triggered auto-submit was firing with an empty
  // answer no matter what the candidate actually said (the on-screen live
  // transcript still updated fine, since that's a normal render, but the
  // interval's closure never saw it) - candidates saw their words appear
  // and still got graded "no answer" on every question. Routing the call
  // through a ref that's refreshed every render fixes it: the interval
  // always invokes the CURRENT handleStopAnswer/liveInterim, not a stale one.
  const handleStopAnswerRef = useRef(() => {});
  useEffect(() => {
    handleStopAnswerRef.current = handleStopAnswer;
  });

  useEffect(() => {
    if (!isListening) return;
    const timer = setInterval(() => {
      if (Date.now() - lastSpeechAtRef.current >= SILENCE_TIMEOUT_MS) {
        handleStopAnswerRef.current();
      }
    }, 500);
    return () => clearInterval(timer);
  }, [isListening]);

  // Web Speech API TTS is notoriously flaky in Chrome in ways that fail
  // completely silently (no error, onend/onerror never fire), which used to
  // leave the interview hung forever waiting on a callback that was never
  // coming - looking exactly like "voice not working" with no obvious
  // symptom. Three known Chrome bugs, all worked around below:
  //  1. Calling speak() in the same tick as cancel() (or right after a prior
  //     utterance) can silently drop the new utterance - a short delay fixes it.
  //  2. speechSynthesis can get stuck "paused" (e.g. after the tab was
  //     backgrounded) so a later speak() just queues forever - resume()
  //     first as a defensive no-op.
  //  3. An utterance with no live reference besides a local variable can be
  //     garbage-collected mid-speech, killing playback with zero events -
  //     keeping it on a ref keeps it alive for the duration.
  // On top of all three, a safety timeout guarantees onEnd always fires
  // eventually even if the browser never calls onend/onerror at all, so the
  // interview can't get stuck silently mid-question.
  function speakText(text, onEnd) {
    if (speechDelayTimerRef.current) {
      clearTimeout(speechDelayTimerRef.current);
      speechDelayTimerRef.current = null;
    }
    if (speechSafetyTimerRef.current) {
      clearTimeout(speechSafetyTimerRef.current);
      speechSafetyTimerRef.current = null;
    }

    if (!window.speechSynthesis || !text) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      if (speechSafetyTimerRef.current) {
        clearTimeout(speechSafetyTimerRef.current);
        speechSafetyTimerRef.current = null;
      }
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    try {
      window.speechSynthesis.cancel();
    } catch (err) {
      // Nothing was speaking - fine to continue.
    }

    speechDelayTimerRef.current = setTimeout(() => {
      try {
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1;
        utterance.pitch = 1;
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const englishVoice = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en"));
        if (englishVoice) utterance.voice = englishVoice;

        utteranceRef.current = utterance; // keep alive - see note above
        utterance.onend = finish;
        utterance.onerror = finish;

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        const estimatedMs = Math.min(30000, Math.max(4000, text.length * 90));
        speechSafetyTimerRef.current = setTimeout(finish, estimatedMs);
      } catch (err) {
        finish();
      }
    }, 60);
  }

  function openAnswerWindow() {
    if (micDenied || !speechSupported) return;
    setLiveInterim("");
    lastSpeechAtRef.current = Date.now();
    stoppingAnswerRef.current = false;
    recognitionShouldRunRef.current = true;
    setIsListening(true);
    startSpeechRecognition();
  }

  // Starts (or, via onend, restarts) live transcription. Chrome can
  // silently stop a "continuous" SpeechRecognition session on its own even
  // mid-answer - this restart-on-end pattern (with the
  // recognitionShouldRunRef guard so it doesn't fight an intentional stop)
  // is the fix, reused verbatim from AiAudioInterview.jsx.
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionShouldRunRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript + " ";
      }
      lastSpeechAtRef.current = Date.now();
      setLiveInterim(text.trim());
    };
    recognition.onerror = (e) => {
      if (e.error === "not-allowed" || e.error === "service-not-allowed") {
        setMicDenied(true);
        recognitionShouldRunRef.current = false;
        setIsListening(false);
        toast("Microphone access was blocked - you can still answer by typing below.", "!");
      }
      // Other errors (no-speech, network, aborted) are expected during
      // normal pauses - swallow them and let onend decide whether to restart.
    };
    recognition.onend = () => {
      if (recognitionShouldRunRef.current) {
        try {
          startSpeechRecognition();
        } catch (e) {
          // Browser refused the restart (e.g. torn down mid-navigation) - give up quietly.
        }
      }
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {
      // Another recognition session may already be starting - safe to ignore.
    }
  }

  function stopListening() {
    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // Already stopped/never started - nothing to clean up.
      }
    }
    setIsListening(false);
  }

  function handleStopAnswer() {
    if (stoppingAnswerRef.current) return;
    stoppingAnswerRef.current = true;
    stopListening();
    const text = liveInterim.trim();
    setLiveInterim("");
    submitUtterance(text);
  }

  function handleTextSubmit(e) {
    if (e) e.preventDefault();
    const text = inputText.trim();
    if (!text || loadingTurn) return;
    stoppingAnswerRef.current = true;
    stopListening();
    setInputText("");
    setLiveInterim("");
    submitUtterance(text);
  }

  async function submitUtterance(text) {
    setTranscript((prev) => [...prev, { speaker: "you", text: text || "(no answer)" }]);
    setLoadingTurn(true);

    try {
      // Instant client-side "stop" pre-check - don't wait on a full /turn
      // round-trip for a safety-critical command. The backend runs the same
      // classification server-side too, as a second safety net.
      const endpoint = STOP_COMMAND_RE.test(text) ? "/candidate/ai-interview/end" : "/candidate/ai-interview/turn";
      const body = endpoint.endsWith("/end") ? { proctorLogs } : { candidateUtterance: text, proctorLogs };

      const res = await api.post(endpoint, body);
      const messiReply = res.data.messiReply || (res.data.result ? "Thanks - that wraps up the interview." : "Let's continue.");
      const interviewEnded = Boolean(res.data.interviewEnded) || Boolean(res.data.result);
      const nextSession = res.data.session;

      setTranscript((prev) => [...prev, { speaker: "messi", text: messiReply }]);
      if (nextSession) setSession(nextSession);
      stoppingAnswerRef.current = false;

      if (interviewEnded) {
        speakText(messiReply, () => {});
        setStep("report");
        const finalResult = res.data.result || nextSession?.result;
        if (typeof finalResult?.overallScore === "number" && onCompleted) {
          onCompleted({ score: finalResult.overallScore });
        }
        toast(`Interview complete! Overall score: ${finalResult?.overallScore ?? "-"} / 100`, "✓");
      } else {
        speakText(messiReply, () => openAnswerWindow());
      }
    } catch (err) {
      console.error("AI Interview turn error:", err);
      toast("Connection issue reaching Messi - please try answering again.", "!");
      stoppingAnswerRef.current = false;
      // Don't lose the candidate's words - let them retry the same answer.
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
      setProctorLogs({ tabSwitches: 0, focusLosses: 0 });
      startedAtRef.current = Date.now();
      setElapsedSeconds(0);
      const messiReply = res.data.messiReply || "Let's begin.";
      setTranscript(retake ? [{ speaker: "messi", text: messiReply }] : [...hydrateTranscript(nextSession), { speaker: "messi", text: messiReply }]);
      setStep("interview");
      speakText(messiReply, () => openAnswerWindow());
    } catch (err) {
      console.error("AI Interview start error:", err);
      toast(err.response?.data?.message || "Couldn't start the AI Interview - please try again.", "!");
    } finally {
      setStarting(false);
    }
  }

  function handleEndNow() {
    if (!window.confirm("End the interview now? Messi will generate your report from what's been answered so far.")) return;
    submitUtterance("Please stop the interview.");
  }

  const result = session?.result;
  const totalQuestions = session?.questions?.length || 5;
  const currentQNumber = Math.min((session?.currentQuestionIndex ?? 0) + 1, totalQuestions);
  const progressPercent = session?.questionRecords ? Math.round((session.questionRecords.length / totalQuestions) * 100) : 0;

  return (
    <div className="card" style={{ padding: 0, borderRadius: 16, border: "2px solid var(--navy)", overflow: "hidden", background: "#fff" }}>
      {/* HEADER BANNER */}
      <div style={{ background: "var(--navy)", color: "#fff", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: "50%", background: "var(--gold)", color: "var(--navy)", fontWeight: 800, fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <i className="fa-solid fa-user-tie"></i>
          </div>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#fff" }}>Meet Messi, your AI Interviewer</h4>
            <span style={{ fontSize: 11, color: "var(--gold)", fontWeight: 700 }}>
              <i className="fa-solid fa-bolt" style={{ marginRight: 4 }}></i>
              Live voice interview · 5 dynamic questions
            </span>
          </div>
        </div>
        {step === "interview" && (
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#CBD5E1" }}>
              <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i>
              {formatDuration(elapsedSeconds)}
            </span>
            <button type="button" onClick={handleEndNow} style={{ background: "none", border: "1px solid #F87171", color: "#F87171", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
              <i className="fa-solid fa-flag-checkered" style={{ marginRight: 4 }}></i> End Interview
            </button>
          </div>
        )}
      </div>

      {step === "loading" && (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading your AI Interview…</div>
      )}

      {/* SETUP / RESUME */}
      {step === "setup" && (
        <div style={{ padding: 32, textAlign: "center", background: "#F8FAFC" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 16 }}>
            <MessiAvatar state="idle" />
          </div>
          {session?.status === "IN_PROGRESS" ? (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>Resume your interview with Messi</h3>
              <p style={{ fontSize: 13, color: "#64748B", maxWidth: 480, margin: "0 auto 20px" }}>
                You were on question {(session.currentQuestionIndex ?? 0) + 1} of {session.questions.length}. Messi will pick up right where you left off.
              </p>
              <button type="button" className="btn btn-gold" style={{ padding: "12px 24px", fontSize: 14 }} disabled={starting} onClick={() => handleStart(false)}>
                {starting ? "Reconnecting…" : `Resume at Question ${(session.currentQuestionIndex ?? 0) + 1} →`}
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>Ready for a live mock interview?</h3>
              <p style={{ fontSize: 13, color: "#64748B", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
                Messi will ask you 5 technical questions built around your role and experience, one at a time, out loud. Answer by speaking naturally
                &mdash; you can also type if you&rsquo;d rather. Say things like &ldquo;repeat that&rdquo;, &ldquo;give me a hint&rdquo;, or
                &ldquo;stop the interview&rdquo; any time.
                {!speechSupported && " Your browser doesn't support live speech recognition, so you'll answer by typing - everything else still works."}
              </p>
              <button type="button" className="btn btn-gold" style={{ padding: "12px 24px", fontSize: 14 }} disabled={starting} onClick={() => handleStart(false)}>
                {starting ? "Getting ready…" : "Start AI Interview →"}
              </button>
            </>
          )}
        </div>
      )}

      {/* LIVE INTERVIEW */}
      {step === "interview" && (
        <>
          <div style={{ padding: "16px 20px 4px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "var(--navy)" }}>
                QUESTION {currentQNumber} OF {totalQuestions}
              </span>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>{progressPercent}% complete</span>
            </div>
            <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${progressPercent}%`, background: "var(--gold)", transition: "width 0.4s ease" }}></div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: 16, alignItems: "center", padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <MessiAvatar state={avatarState} />
              <span style={{ fontSize: 10, fontWeight: 800, color: isSpeaking ? "var(--gold)" : isListening ? "#22C55E" : "#94A3B8" }}>
                {isSpeaking ? "SPEAKING" : isListening ? "LISTENING" : "READY"}
              </span>
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 10, padding: 12, fontSize: 12, color: "#334155", fontStyle: "italic", minHeight: 60 }}>
              <strong style={{ fontStyle: "normal", color: "var(--navy)" }}>Live transcript: </strong>
              {liveInterim || (isListening ? "Listening…" : loadingTurn ? "Messi is thinking…" : micDenied || !speechSupported ? "Type your answer below." : "")}
            </div>
          </div>

          {/* CONVERSATION THREAD */}
          <div style={{ padding: "0 20px 12px", maxHeight: 300, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
            {transcript.map((line, idx) => {
              const isMessi = line.speaker === "messi";
              return (
                <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isMessi ? "flex-start" : "flex-end" }}>
                  <div style={{ fontSize: 10, color: "#94A3B8", fontWeight: 800, marginBottom: 3, padding: "0 4px" }}>{isMessi ? "MESSI" : "YOU"}</div>
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "10px 14px",
                      borderRadius: isMessi ? "14px 14px 14px 4px" : "14px 14px 4px 14px",
                      background: isMessi ? "#ffffff" : "var(--navy)",
                      color: isMessi ? "#1E293B" : "#ffffff",
                      border: isMessi ? "1px solid #CBD5E1" : "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
                      fontSize: 13,
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                    }}
                  >
                    {line.text}
                  </div>
                </div>
              );
            })}
            {loadingTurn && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--navy)", fontSize: 12, fontWeight: 700, padding: 4 }}>
                <i className="fa-solid fa-brain fa-spin" style={{ color: "var(--gold)" }}></i>
                Messi is thinking…
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* INPUT BAR */}
          <form onSubmit={handleTextSubmit} style={{ padding: 14, background: "#ffffff", borderTop: "1px solid #CBD5E1", display: "flex", gap: 10, alignItems: "center" }}>
            {speechSupported && !micDenied && (
              <button
                type="button"
                onClick={() => (isListening ? handleStopAnswer() : openAnswerWindow())}
                disabled={loadingTurn || isSpeaking}
                style={{
                  background: isListening ? "#DC2626" : "#F1F5F9",
                  color: isListening ? "#ffffff" : "var(--navy)",
                  border: isListening ? "none" : "1px solid #CBD5E1",
                  borderRadius: 10,
                  padding: "10px 14px",
                  cursor: loadingTurn || isSpeaking ? "not-allowed" : "pointer",
                  fontSize: 14,
                  fontWeight: 700,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  opacity: loadingTurn || isSpeaking ? 0.6 : 1,
                }}
                title={isListening ? "Submit your spoken answer now" : "Answer by voice"}
              >
                <i className={`fa-solid ${isListening ? "fa-stop" : "fa-microphone"}`}></i>
                {isListening ? "Done" : "Voice"}
              </button>
            )}
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder={isListening ? "Speaking… or type here instead" : "Type your answer, or use voice…"}
              disabled={loadingTurn}
              style={{ flex: 1, padding: "10px 14px", borderRadius: 10, border: "1px solid #CBD5E1", fontSize: 13, outline: "none" }}
            />
            <button type="submit" className="btn btn-gold" disabled={!inputText.trim() || loadingTurn} style={{ padding: "10px 18px", fontSize: 13 }}>
              Send <i className="fa-solid fa-paper-plane" style={{ marginLeft: 6 }}></i>
            </button>
          </form>
        </>
      )}

      {/* REPORT */}
      {step === "report" && result && (
        <div style={{ padding: 24 }}>
          <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", borderRadius: 16, padding: 24, textAlign: "center", marginBottom: 20 }}>
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              ✓ AI INTERVIEW COMPLETE
            </span>
            <h3 style={{ margin: "10px 0 4px", fontSize: 28, fontWeight: 800, color: "#15803D" }}>{result.overallScore} / 100</h3>
            <p style={{ margin: 0, fontSize: 13, color: "#166534", maxWidth: 520, marginLeft: "auto", marginRight: "auto" }}>{result.finalFeedback}</p>
          </div>

          {/* BREAKDOWN BARS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12, marginBottom: 24 }}>
            {Object.entries(result.breakdown || {}).map(([key, val]) => (
              <div key={key} style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12 }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", textTransform: "capitalize", marginBottom: 6 }}>
                  {key.replace(/([A-Z])/g, " $1")}
                </div>
                <div style={{ height: 6, background: "#E2E8F0", borderRadius: 999, overflow: "hidden", marginBottom: 4 }}>
                  <div style={{ height: "100%", width: `${val}%`, background: "var(--navy)" }}></div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)" }}>{val}%</div>
              </div>
            ))}
          </div>

          {/* STRENGTHS / AREAS / TOPICS */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#F0FDF4", border: "1px solid #BBF7D0", borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#15803D" }}>
                <i className="fa-solid fa-star" style={{ marginRight: 6 }}></i>Strengths
              </h5>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#166534", lineHeight: 1.7 }}>
                {(result.strengths || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#FFF7ED", border: "1px solid #FED7AA", borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#B45309" }}>
                <i className="fa-solid fa-arrow-trend-up" style={{ marginRight: 6 }}></i>Areas to Improve
              </h5>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#92400E", lineHeight: 1.7 }}>
                {(result.areasToImprove || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
            <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 10, padding: 14 }}>
              <h5 style={{ margin: "0 0 8px", fontSize: 12, fontWeight: 800, color: "#1D4ED8" }}>
                <i className="fa-solid fa-book" style={{ marginRight: 6 }}></i>Recommended Topics
              </h5>
              <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#1E40AF", lineHeight: 1.7 }}>
                {(result.recommendedTopics || []).map((s, i) => (
                  <li key={i}>{s}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* PER-QUESTION ANALYSIS */}
          <h4 style={{ fontSize: 13, fontWeight: 800, color: "var(--navy)", marginBottom: 10 }}>Question-by-Question Analysis</h4>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24 }}>
            {(result.questionAnalysis || []).map((q, idx) => {
              const tag = EVAL_LABELS[q.evaluation] || EVAL_LABELS.no_answer;
              return (
                <div key={idx} style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, padding: 12, fontSize: 12 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6, gap: 8, flexWrap: "wrap" }}>
                    <strong style={{ color: "var(--navy)" }}>
                      Q{q.questionNumber || idx + 1}. {q.question}
                    </strong>
                    <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                      <span style={{ background: tag.bg, color: tag.color, fontWeight: 800, padding: "2px 8px", borderRadius: 999, fontSize: 10 }}>{tag.label}</span>
                      <span style={{ background: "#F1F5F9", color: "var(--navy)", fontWeight: 800, padding: "2px 8px", borderRadius: 999, fontSize: 10 }}>{q.score}/10</span>
                    </div>
                  </div>
                  <div style={{ color: "#475569", marginBottom: 4 }}>
                    <strong>Your answer:</strong> {q.candidateAnswer || "(no answer)"}
                  </div>
                  {q.missingConcepts?.length > 0 && (
                    <div style={{ color: "#B45309", marginBottom: 4 }}>
                      <strong>Missing:</strong> {q.missingConcepts.join(", ")}
                    </div>
                  )}
                  <div style={{ color: "#334155", fontStyle: "italic", background: "#F8FAFC", padding: 6, borderRadius: 6 }}>{q.feedback}</div>
                </div>
              );
            })}
          </div>

          {/* <button type="button" className="btn btn-outline" style={{ padding: "10px 20px", fontSize: 13 }} disabled={starting} onClick={() => handleStart(true)}>
            <i className="fa-solid fa-rotate-right" style={{ marginRight: 6 }}></i> {starting ? "Restarting…" : "Retake Interview"}
          </button> */}
        </div>
      )}
    </div>
  );
}
