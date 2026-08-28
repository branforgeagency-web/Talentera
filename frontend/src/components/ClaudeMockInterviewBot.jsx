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
// AI Interviewer Video Avatar
// Uses the video from public/ai bot.mp4.
// Plays the video when the AI audio is speaking (isSpeaking === true)
// and pauses the video when the audio stops / candidate answers / idle.
// ---------------------------------------------------------------------------
function InterviewerVideoAvatar({ state, size = "large" }) {
  const isSpeaking = state === "speaking";
  const isListening = state === "listening";
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
        playPromise.catch((err) => {
          console.warn("Video play error:", err?.message);
        });
      }
    } else {
      video.pause();
    }
  }, [isSpeaking]);

  const isCompact = size === "compact";
  const containerWidth = isCompact ? "170px" : "260px";
  const containerHeight = isCompact ? "150px" : "200px";

  return (
    <div
      className={`interviewer-video-wrap ${isSpeaking ? "interviewer-speaking" : isListening ? "interviewer-listening" : ""}`}
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        borderRadius: isCompact ? 16 : 20,
        overflow: "hidden",
        backgroundColor: "#0A1F3D",
        boxShadow: isSpeaking
          ? "0 0 0 4px rgba(245, 158, 11, 0.45), 0 10px 25px rgba(10,31,61,0.3)"
          : isListening
          ? "0 0 0 4px rgba(34, 197, 94, 0.4), 0 10px 25px rgba(10,31,61,0.25)"
          : "0 8px 24px rgba(10,31,61,0.2)",
        border: "2px solid var(--navy)",
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
        <source src="/ai-bot.mp4" type="video/mp4" />
        <source src="/ai_bot.mp4" type="video/mp4" />
      </video>

      {/* Live State Badge Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: "50%",
          transform: "translateX(-50%)",
          background: isSpeaking ? "rgba(245, 158, 11, 0.9)" : isListening ? "rgba(34, 197, 94, 0.9)" : "rgba(15, 23, 42, 0.8)",
          backdropFilter: "blur(4px)",
          color: "#fff",
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: 0.5,
          padding: "3px 8px",
          borderRadius: 999,
          display: "flex",
          alignItems: "center",
          gap: 4,
          boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
          whiteSpace: "nowrap",
          zIndex: 2,
        }}
      >
        {isSpeaking ? (
          <>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#fff", animation: "pulse 1s infinite" }}></span>
            SPEAKING
          </>
        ) : isListening ? (
          <>
            <i className="fa-solid fa-microphone" style={{ fontSize: 8 }}></i>
            LISTENING
          </>
        ) : (
          <>
            <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#94A3B8" }}></span>
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

    const cleanText = String(text)
      .replace(/[*_#`~[\]]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }

    let finished = false;
    let keepAliveTimer = null;

    const finish = () => {
      if (finished) return;
      finished = true;
      if (keepAliveTimer) {
        clearInterval(keepAliveTimer);
        keepAliveTimer = null;
      }
      if (speechSafetyTimerRef.current) {
        clearTimeout(speechSafetyTimerRef.current);
        speechSafetyTimerRef.current = null;
      }
      setIsSpeaking(false);
      if (onEnd) onEnd();
    };

    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch (err) {
      // Nothing was speaking - fine to continue.
    }

    speechDelayTimerRef.current = setTimeout(() => {
      try {
        window.speechSynthesis.resume();

        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.rate = 0.92; // natural, articulate Indian English conversational pace
        utterance.pitch = 1.05; // soft, polite, warm tone
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];

        // Priority list for soft Indian English voices (en-IN), followed by natural soft female voices
        const indianFemalePatterns = [
          /heera/i,
          /neerja/i,
          /veena/i,
          /ananya/i,
          /kavya/i,
          /swara/i,
          /priya/i,
          /english \(india\)/i,
          /en[-_]in/i,
          /microsoft heera.*natural/i,
          /microsoft neerja.*natural/i,
        ];

        let indianVoice = null;
        for (const pattern of indianFemalePatterns) {
          const match = voices.find((v) => pattern.test(v.name) || (v.lang && pattern.test(v.lang)));
          if (match) {
            indianVoice = match;
            break;
          }
        }

        if (!indianVoice) {
          // If no specific en-IN voice, check any en-IN locale
          indianVoice = voices.find((v) => v.lang && /en[-_]in/i.test(v.lang));
        }

        if (!indianVoice) {
          // Fallback to soft natural voices
          const softFallbackPatterns = [/microsoft jenny/i, /microsoft aria/i, /google uk english female/i, /samantha/i];
          for (const pattern of softFallbackPatterns) {
            const match = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith("en") && pattern.test(v.name));
            if (match) {
              indianVoice = match;
              break;
            }
          }
        }

        if (indianVoice) utterance.voice = indianVoice;

        utteranceRef.current = utterance;
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        utterance.onend = finish;
        utterance.onerror = finish;

        setIsSpeaking(true);
        window.speechSynthesis.speak(utterance);

        // Keep-alive for Chrome 14s silence bug
        keepAliveTimer = setInterval(() => {
          if (window.speechSynthesis && window.speechSynthesis.speaking) {
            window.speechSynthesis.pause();
            window.speechSynthesis.resume();
          }
        }, 10000);

        const estimatedMs = Math.min(90000, Math.max(6000, cleanText.length * 130));
        speechSafetyTimerRef.current = setTimeout(finish, estimatedMs);
      } catch (err) {
        finish();
      }
    }, 50);
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
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}>
            <InterviewerVideoAvatar state="idle" size="large" />
          </div>
          {session?.status === "IN_PROGRESS" ? (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>Resume your interview with your AI Interviewer</h3>
              <p style={{ fontSize: 13, color: "#64748B", maxWidth: 480, margin: "0 auto 20px" }}>
                You were on question {(session.currentQuestionIndex ?? 0) + 1} of {session.questions.length}. The AI Interviewer will pick up right where you left off.
              </p>
              <button type="button" className="btn btn-gold" style={{ padding: "12px 24px", fontSize: 14 }} disabled={starting} onClick={() => handleStart(false)}>
                {starting ? "Reconnecting…" : `Resume at Question ${(session.currentQuestionIndex ?? 0) + 1} →`}
              </button>
            </>
          ) : (
            <>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>Ready for a live mock interview?</h3>
              <p style={{ fontSize: 13, color: "#64748B", maxWidth: 480, margin: "0 auto 20px", lineHeight: 1.6 }}>
                The AI Interviewer will ask you 5 technical questions built around your role and experience, one at a time, out loud. Answer by speaking naturally
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

          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 16, alignItems: "center", padding: "16px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8 }}>
              <InterviewerVideoAvatar state={avatarState} size="compact" />
            </div>

            <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 10, padding: 12, fontSize: 12, color: "#334155", fontStyle: "italic", minHeight: 60 }}>
              <strong style={{ fontStyle: "normal", color: "var(--navy)" }}>Live transcript: </strong>
              {liveInterim || (isListening ? "Listening…" : loadingTurn ? "AI Interviewer is thinking…" : micDenied || !speechSupported ? "Type your answer below." : "")}
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
