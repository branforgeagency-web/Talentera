import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

// Answers are capped by a hard time limit AND cut short automatically after
// this many seconds of silence - whichever comes first. Keep in sync with
// AiVideoAssessment.jsx.
const ANSWER_TIME_LIMIT = 60;
const SILENCE_TIMEOUT_MS = 20000;

// Every question is worth a flat 10 marks (correct or not) - no separate
// "communication" rubric (clarity/tone/fluency) is shown anymore, just the
// per-question answer score and the total. Keep in sync with
// POINTS_PER_QUESTION in backend/utils/aiAssessment.js and AiVideoAssessment.jsx.
const POINTS_PER_QUESTION = 10;

// Older saved reports may have per-question marks on the old 0-100 scale
// (before this flat 10-marks-per-question redesign). Normalize any legacy
// value onto the 0/POINTS_PER_QUESTION scale so a report always displays
// consistently, whenever it was recorded.
function normalizeQuestionMarks(marks) {
  const n = Number(marks);
  if (!Number.isFinite(n)) return 0;
  if (n <= POINTS_PER_QUESTION) return Math.max(0, Math.round(n));
  return n >= 50 ? POINTS_PER_QUESTION : 0;
}

// If the candidate's browser refreshes, loses connection, or crashes
// mid-interview, we don't want to make them start over from Question 1 -
// already-recorded answers are saved here as soon as each one is captured,
// and handleStartInterview picks the resume point back up from it. Only the
// TEXT transcripts survive a break this way (see saveInterviewProgress) -
// the audio/video recording itself is only ever in-memory, so a resumed
// session starts a fresh recording for the remaining questions.
const AUDIO_INTERVIEW_PROGRESS_KEY = "talentera_ai_audio_interview_progress_v1";

function loadInterviewProgress() {
  try {
    const raw = window.localStorage?.getItem(AUDIO_INTERVIEW_PROGRESS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !parsed.qaTranscripts) return null;
    return parsed;
  } catch (e) {
    return null;
  }
}

function saveInterviewProgress(qaTranscripts, nextQIdx) {
  try {
    window.localStorage?.setItem(
      AUDIO_INTERVIEW_PROGRESS_KEY,
      JSON.stringify({ qaTranscripts, qIdx: nextQIdx, savedAt: Date.now() })
    );
  } catch (e) {}
}

function clearInterviewProgress() {
  try {
    window.localStorage?.removeItem(AUDIO_INTERVIEW_PROGRESS_KEY);
  } catch (e) {}
}

export default function AiAudioInterview({ existingData, onSaved }) {
  const toast = useToast();
  const videoPreviewRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const lastSpeechAtRef = useRef(0);
  const stoppingAnswerRef = useRef(false);
  // True only while an answer window should actively be listening. Browsers
  // (Chrome in particular) can silently stop a "continuous" SpeechRecognition
  // session on their own after a while - even mid-answer, with the candidate
  // still talking - with no built-in way to detect/restart it. Without this
  // flag + the onend handler below, that made the AI appear to stop
  // listening while the candidate was still speaking. Set true right before
  // starting recognition, set false right before any intentional stop() so
  // the auto-restart doesn't fight a deliberate shutdown.
  const recognitionShouldRunRef = useRef(false);

  const hasExistingAudioReport = existingData?.aiScore !== undefined && existingData?.interviewMode === "audio";

  // setup | interview | evaluating | report
  const [step, setStep] = useState(hasExistingAudioReport ? "report" : "setup");
  const [stream, setStream] = useState(null);
  const [mediaError, setMediaError] = useState("");

  // Staff-configured question bank (fetched from the server - see
  // GET /api/candidate/interview-questions?mode=audio). Never hardcoded here.
  const [questions, setQuestions] = useState([]); // [{ id, question }]
  const [questionsLoading, setQuestionsLoading] = useState(true);

  const [qIdx, setQIdx] = useState(0);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [qaTranscripts, setQaTranscripts] = useState({});
  const [liveTranscript, setLiveTranscript] = useState("");
  const [timeLeft, setTimeLeft] = useState(ANSWER_TIME_LIMIT);
  const [proctorLogs, setProctorLogs] = useState({ tabSwitches: 0, focusLosses: 0 });
  const [resumedFromSave, setResumedFromSave] = useState(false);

  const [evaluation, setEvaluation] = useState(() => {
    if (!hasExistingAudioReport) return null;
    const rawQuestionScores =
      existingData.questionScores ||
      existingData.qaPairs?.map((qa, idx) => ({
        questionId: idx + 1,
        question: qa.question,
        marks: existingData.aiScore,
        answered: Boolean(qa.transcript),
        feedback: "",
        transcript: qa.transcript || "",
        translatedTranscript: qa.translatedTranscript || qa.transcript || "",
        detectedLanguage: qa.detectedLanguage || "unknown",
      })) ||
      [];
    const questionScores = rawQuestionScores.map((q) => ({ ...q, marks: normalizeQuestionMarks(q.marks) }));
    const maxMarks = typeof existingData.maxMarks === "number" ? existingData.maxMarks : questionScores.length * POINTS_PER_QUESTION;
    const totalMarks = typeof existingData.totalMarks === "number" ? existingData.totalMarks : questionScores.reduce((sum, q) => sum + q.marks, 0);
    return {
      overallScore: existingData.aiScore,
      totalMarks,
      maxMarks,
      questionScores,
      feedback: existingData.feedback || "",
    };
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch the staff-configured question bank once on mount
  useEffect(() => {
    api
      .get("/candidate/interview-questions?mode=audio")
      .then((res) => setQuestions(res.data?.questions || []))
      .catch(() => {
        toast("Couldn't load interview questions. Please refresh and try again.", "!");
        setQuestions([]);
      })
      .finally(() => setQuestionsLoading(false));
  }, []);

  // Resume detection: once the question bank is in, check for a save left
  // behind by an earlier attempt that never finished (refresh/crash/lost
  // connection). Only trust it if it lines up with today's question bank
  // (same question ids) and there's actually unfinished progress to resume -
  // otherwise it's stale (a different question bank, or a fully-answered
  // save that just never got cleared) and is discarded.
  useEffect(() => {
    if (!questions.length || hasExistingAudioReport) {
      if (hasExistingAudioReport) clearInterviewProgress();
      return;
    }
    const saved = loadInterviewProgress();
    if (!saved) return;

    const currentIds = new Set(questions.map((q) => String(q.id)));
    const savedIds = Object.keys(saved.qaTranscripts || {}).filter((id) => currentIds.has(String(id)));
    if (!savedIds.length || savedIds.length >= questions.length) {
      clearInterviewProgress();
      return;
    }

    setQaTranscripts(saved.qaTranscripts);
    const resumeIdx = Math.min(Math.max(0, saved.qIdx ?? savedIds.length), questions.length - 1);
    setQIdx(resumeIdx);
    setResumedFromSave(true);
    toast(`Resuming your previous interview attempt - continuing from Question ${resumeIdx + 1}.`, "!");
  }, [questions, hasExistingAudioReport]);

  useEffect(() => {
    return () => {
      stopMedia();
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    };
  }, []);

  // Anti-cheat: same tab-switch / focus-loss tracking as the video assessment
  useEffect(() => {
    if (step !== "interview") return;

    function handleVisibilityChange() {
      if (document.visibilityState === "hidden") {
        setProctorLogs((prev) => ({ ...prev, tabSwitches: prev.tabSwitches + 1 }));
        toast("⚠️ Tab switch detected during AI audio interview.", "!");
      }
    }
    function handleWindowBlur() {
      setProctorLogs((prev) => ({ ...prev, focusLosses: prev.focusLosses + 1 }));
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [step]);

  // Answer countdown timer + silence auto-advance: whichever hits first ends
  // the answer. The "hit the limit" check is kept OUTSIDE the setTimeLeft
  // updater (rather than calling handleStopAnswer from inside it) - nesting
  // further setState calls inside a state updater is fragile and can desync
  // the timer after the first auto-advance.
  useEffect(() => {
    if (!isRecording) return;
    const elapsedSilence = Math.floor((Date.now() - lastSpeechAtRef.current) / 1000);
    if (elapsedSilence * 1000 >= SILENCE_TIMEOUT_MS || timeLeft <= 0) {
      handleStopAnswer();
      return;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [isRecording, timeLeft]);

  function stopMedia() {
    recognitionShouldRunRef.current = false;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
  }

  async function handleStartInterview() {
    if (!questions.length) return;
    setMediaError("");

    let mediaStream;
    try {
      // Camera + mic are requested ONLY here, when the interview actually
      // starts - never during the setup screen - and released the moment
      // the interview ends (handleFinalSubmission / stopMedia). The camera
      // is for identity/proctoring only - this is a voice-led interview,
      // there's no per-question on-camera framing or liveness gate.
      mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: { width: 640, height: 480 } });
    } catch (err) {
      console.error("Camera/microphone access error:", err);
      setMediaError("Camera or microphone access denied. Please allow both permissions in browser settings.");
      return;
    }

    setStream(mediaStream);
    if (videoPreviewRef.current) videoPreviewRef.current.srcObject = mediaStream;

    // One continuous recording spans the whole interview - both audio and
    // video tracks - simpler and more representative of a real interview
    // than a fresh recorder per question.
    recordedChunksRef.current = [];
    try {
      const mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "video/webm" });
      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data);
      };
      mediaRecorder.start(1000);
    } catch (err) {
      console.error("MediaRecorder start error:", err);
    }

    setStep("interview");
    // qIdx is 0 for a fresh start, or the resume point restored by the
    // resume-detection effect above if a prior attempt broke off partway
    // through - either way, pick up from wherever it currently points.
    const startIdx = qIdx;
    // The answer window (timer + recognition) opens automatically once the
    // AI finishes asking - the candidate never has to click a separate
    // "Start Answer" button.
    speakQuestion(questions[startIdx].question, () => handleStartAnswer());
  }

  function speakQuestion(question, onEnd) {
    if (!window.speechSynthesis) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
      return;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(question);
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
    } catch (err) {
      setIsSpeaking(false);
      if (onEnd) onEnd();
    }
  }

  function handleStartAnswer() {
    setLiveTranscript("");
    setTimeLeft(ANSWER_TIME_LIMIT);
    lastSpeechAtRef.current = Date.now();
    setIsRecording(true);

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionShouldRunRef.current = true;
      startSpeechRecognition();
    } else {
      toast("Your browser doesn't support live speech-to-text. You can still answer - your response just won't auto-transcribe.", "!");
    }
  }

  // Starts (or restarts) live transcription for the current answer window.
  // Wired with onend/onerror so that if the browser drops the recognition
  // session on its own mid-answer, it comes straight back instead of leaving
  // the candidate talking to a mic that's stopped capturing. See
  // recognitionShouldRunRef above for why the guard is needed.
  function startSpeechRecognition() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition || !recognitionShouldRunRef.current) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.onresult = (e) => {
      let text = "";
      for (let i = 0; i < e.results.length; i++) {
        text += e.results[i][0].transcript + " ";
      }
      lastSpeechAtRef.current = Date.now();
      setLiveTranscript(text);
    };
    // "no-speech"/"network"/"aborted" are expected during normal pauses -
    // swallow them here and let onend decide whether to restart.
    recognition.onerror = () => {};
    recognition.onend = () => {
      if (recognitionShouldRunRef.current) {
        try {
          startSpeechRecognition();
        } catch (e) {}
      }
    };
    try {
      recognition.start();
      recognitionRef.current = recognition;
    } catch (e) {}
  }

  function handleStopAnswer() {
    // Guards against the time-limit check and a manual "Done Answering"
    // click both firing for the same question, which could otherwise
    // double-advance and skip a question.
    if (stoppingAnswerRef.current) return;
    stoppingAnswerRef.current = true;

    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);

    const currentQ = questions[qIdx];
    const updatedTranscripts = { ...qaTranscripts, [currentQ.id]: liveTranscript.trim() };
    setQaTranscripts(updatedTranscripts);

    if (qIdx < questions.length - 1) {
      const nextIdx = qIdx + 1;
      // Persist what's answered so far - if the browser refreshes or the
      // connection drops before the interview finishes, the candidate picks
      // back up at nextIdx instead of Question 1 (see the resume-detection
      // effect above).
      saveInterviewProgress(updatedTranscripts, nextIdx);
      setQIdx(nextIdx);
      toast(`Answer ${qIdx + 1} recorded! Moving to Question ${nextIdx + 1}`, "✓");
      speakQuestion(questions[nextIdx].question, () => {
        stoppingAnswerRef.current = false;
        handleStartAnswer();
      });
    } else {
      toast("All AI Audio Interview Questions Recorded! Evaluating…", "✓");
      handleFinalSubmission(updatedTranscripts);
    }
  }

  // Ends the interview immediately, wherever the candidate currently is.
  // Every question that was never asked/answered is submitted with an empty
  // transcript, which the evaluator grades as 0 marks.
  function handleEndInterviewNow() {
    if (!window.confirm("End the interview now? Any remaining questions will be recorded as 0 marks.")) {
      return;
    }
    stoppingAnswerRef.current = true; // block any in-flight auto-advance timer
    recognitionShouldRunRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {}
    }
    setIsRecording(false);
    const currentQ = questions[qIdx];
    const updatedTranscripts = isRecording ? { ...qaTranscripts, [currentQ.id]: liveTranscript.trim() } : qaTranscripts;
    handleFinalSubmission(updatedTranscripts);
  }

  async function handleFinalSubmission(transcriptsSoFar) {
    setStep("evaluating");
    setSubmitting(true);
    if (window.speechSynthesis) window.speechSynthesis.cancel();

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }

    // Give the recorder a beat to flush its final chunk before we read it,
    // then release the camera/mic immediately - access stops the instant
    // the interview ends.
    await new Promise((resolve) => setTimeout(resolve, 300));
    stopMedia();

    const blob = new Blob(recordedChunksRef.current, { type: "video/webm" });
    const recordingFile = new File([blob], "candidate_ai_audio_interview.webm", { type: "video/webm" });

    const formattedQaPairs = questions.map((q) => ({
      questionId: q.id,
      question: q.question,
      transcript: transcriptsSoFar[q.id] || "", // Empty if never asked/answered
    }));

    const formData = new FormData();
    formData.append("video", recordingFile);
    formData.append("qaPairs", JSON.stringify(formattedQaPairs));
    formData.append("proctorLogs", JSON.stringify(proctorLogs));

    try {
      const res = await api.post("/candidate/ai-audio/assess", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (res.data && res.data.success) {
        setEvaluation(res.data.evaluation);
        setStep("report");
        toast("Interview submitted! Thank you for completing it.", "✓");
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      console.error("Final AI audio submission error:", err);
      const fallbackQuestionScores = formattedQaPairs.map((qa) => {
        const answered = qa.transcript.split(/\s+/).filter(Boolean).length >= 3;
        return {
          questionId: qa.questionId,
          question: qa.question,
          marks: answered ? POINTS_PER_QUESTION : 0,
          answered,
          feedback: "Evaluated locally - server evaluation was unavailable.",
          transcript: qa.transcript || "",
          // No translation possible offline - just show the original.
          translatedTranscript: qa.transcript || "",
          detectedLanguage: "unknown",
        };
      });
      const totalMarks = fallbackQuestionScores.reduce((sum, q) => sum + q.marks, 0);
      const maxMarks = fallbackQuestionScores.length * POINTS_PER_QUESTION;
      const avg = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;
      setEvaluation({
        overallScore: avg,
        totalMarks,
        maxMarks,
        questionScores: fallbackQuestionScores,
        feedback: `Candidate evaluated: ${totalMarks}/${maxMarks} marks across the audio interview (offline fallback scoring).`,
      });
      setStep("report");
      toast("Couldn't reach the AI evaluator - your interview is recorded locally, please contact support if this persists.", "!");
    } finally {
      setSubmitting(false);
      stopMedia();
      // The interview has concluded one way or another (submitted, or shown
      // as a local fallback report) - nothing left to resume.
      clearInterviewProgress();
    }
  }

  const currentQ = questions[qIdx];

  return (
    <div className="card" style={{ padding: 24, borderRadius: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
        <div>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
            STAGE 05 · LIVE AI AUDIO INTERVIEW
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 20, fontWeight: 800, color: "var(--navy)" }}>
            AI Audio Interview <span style={{ fontWeight: 500, color: "#64748B", fontSize: 14 }}>(voice-led, camera on for proctoring)</span>
          </h3>
        </div>
      </div>

      {questionsLoading && step !== "report" ? (
        <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading interview questions…</div>
      ) : (
        <>
          {/* STEP 1: SETUP (no camera/mic access yet) */}
          {step === "setup" && (
            <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 28 }}>
              <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", marginBottom: 8 }}>
                <i className="fa-solid fa-microphone" style={{ marginRight: 8, color: "var(--gold)" }}></i>
                A live, spoken conversation with our AI interviewer
              </h4>
              <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
                The AI will ask {questions.length} questions out loud, one at a time. Each answer has a {ANSWER_TIME_LIMIT}-second limit, and
                staying silent for {Math.round(SILENCE_TIMEOUT_MS / 1000)} seconds automatically moves you to the next question. Your camera and
                microphone turn on only once you click Start below, and turn off the moment the interview ends.
              </p>

              {mediaError && <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginBottom: 16 }}>{mediaError}</div>}

              {resumedFromSave && (
                <div style={{ background: "#EFF6FF", border: "1px solid #3B82F6", color: "#1D4ED8", padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-clock-rotate-left" style={{ fontSize: 16 }}></i>
                  <span>
                    We found your previous attempt - you'll continue from Question {qIdx + 1} of {questions.length}. Your earlier answers are already saved.
                  </span>
                </div>
              )}

              <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#B45309", padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 16 }}></i>
                <span>Find a quiet, well-lit spot. Switching tabs or losing focus during the interview is logged and may affect your score. You can end the interview early at any question - anything left unanswered scores 0.</span>
              </div>

              <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 15 }} onClick={handleStartInterview} disabled={!questions.length}>
                <i className="fa-solid fa-microphone" style={{ marginRight: 8 }}></i> {resumedFromSave ? `Resume at Question ${qIdx + 1} →` : "Start AI Audio Interview →"}
              </button>
            </div>
          )}

          {/* STEP 2: LIVE CONVERSATIONAL LOOP */}
          {step === "interview" && currentQ && (
            <div style={{ background: "#fff", border: "2px solid var(--navy)", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>
                  QUESTION {qIdx + 1} OF {questions.length}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {isRecording && (
                    <div style={{ background: "#F59E0B", color: "#fff", padding: "4px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                      <i className="fa-solid fa-clock" style={{ marginRight: 4 }}></i> {timeLeft}s
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={handleEndInterviewNow}
                    style={{ background: "none", border: "1px solid #DC2626", color: "#DC2626", borderRadius: 6, padding: "4px 10px", fontSize: 11, fontWeight: 700, cursor: "pointer" }}
                  >
                    <i className="fa-solid fa-flag-checkered" style={{ marginRight: 4 }}></i> End Interview Now
                  </button>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 16, alignItems: "flex-start", marginBottom: 16 }}>
                {/* Small proctoring camera preview - not the focus of the UI, just visible for transparency */}
                <div style={{ background: "#000", borderRadius: 10, overflow: "hidden", width: 120, height: 90, flexShrink: 0, position: "relative" }}>
                  <video ref={videoPreviewRef} autoPlay playsInline muted style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }} />
                  <div style={{ position: "absolute", bottom: 4, left: 4, background: "rgba(0,0,0,0.6)", color: "#fff", fontSize: 8, fontWeight: 800, padding: "2px 5px", borderRadius: 999 }}>
                    <i className="fa-solid fa-circle" style={{ color: "#EF4444", fontSize: 6, marginRight: 3 }}></i> PROCTOR CAM
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: "50%",
                      background: isSpeaking ? "var(--gold)" : isRecording ? "#DC2626" : "#0A1F3D",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#fff",
                      flexShrink: 0,
                      animation: isSpeaking || isRecording ? "pulse 1.2s infinite" : "none",
                    }}
                  >
                    <i className={`fa-solid ${isSpeaking ? "fa-volume-high" : "fa-microphone"}`}></i>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: isSpeaking ? "var(--gold)" : isRecording ? "#DC2626" : "#64748B" }}>
                      {isSpeaking ? "AI Interviewer is speaking…" : isRecording ? "Recording your answer…" : "Ready"}
                    </div>
                    <h4 style={{ fontSize: 16, fontWeight: 800, color: "var(--navy)", margin: "2px 0 0", lineHeight: 1.5 }}>{currentQ.question}</h4>
                  </div>
                </div>
              </div>

              <div style={{ background: "#F8FAFC", border: "1px solid #CBD5E1", borderRadius: 8, padding: 12, minHeight: 70, fontSize: 12, color: "#334155", fontStyle: "italic", marginBottom: 16 }}>
                <strong>Live transcript:</strong> {liveTranscript || (isRecording ? "Listening…" : "Your answer timer starts automatically once the question finishes playing.")}
              </div>

              {isRecording && (
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 12 }}>
                  <i className="fa-solid fa-circle-info" style={{ marginRight: 4 }}></i>
                  Staying silent for {Math.round(SILENCE_TIMEOUT_MS / 1000)}s automatically moves to the next question.
                </div>
              )}

              {isRecording ? (
                <button type="button" className="btn btn-outline" style={{ width: "100%", justifyContent: "center", color: "#DC2626", borderColor: "#DC2626", padding: "12px 16px" }} onClick={handleStopAnswer}>
                  <i className="fa-solid fa-stop" style={{ marginRight: 6 }}></i> Done Answering →
                </button>
              ) : (
                <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "12px 16px" }} disabled>
                  <i className="fa-solid fa-volume-high" style={{ marginRight: 6 }}></i> Listen to the question…
                </button>
              )}
            </div>
          )}

          {/* STEP 3: EVALUATING */}
          {step === "evaluating" && (
            <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 40, textAlign: "center" }}>
              <i className="fa-solid fa-brain" style={{ fontSize: 48, color: "var(--gold)", marginBottom: 16, animation: "spin 2s linear infinite" }}></i>
              <h3 style={{ fontSize: 20, fontWeight: 800, color: "var(--navy)", margin: "0 0 8px" }}>
                AI Evaluating Your Interview…
              </h3>
              <p style={{ fontSize: 13, color: "#64748B" }}>Grading your spoken answers against the correct-answer key, question by question.</p>
            </div>
          )}

          {/* STEP 4: SUBMISSION CONFIRMATION - no score or per-question marks
              shown to the candidate; our team reviews the recorded answers
              and verifies correctness as part of the candidate verification
              process. (Marks are still computed and saved server-side - see
              evaluateAiVideoAssessment in backend/utils/aiAssessment.js -
              just not surfaced here.) */}
          {step === "report" && evaluation && (
            <div>
              <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 16, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", textAlign: "center" }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>
                  <i className="fa-solid fa-check"></i>
                </div>

                <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                  <i className="fa-solid fa-circle-check"></i> INTERVIEW SUBMITTED &amp; RECORDED
                </span>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "12px 0 8px" }}>
                  Thank you for completing the interview!
                </h3>
                <p style={{ fontSize: 13, color: "#475569", margin: "0 auto 16px", maxWidth: 440, lineHeight: 1.6 }}>
                  Your spoken answers have been recorded and submitted to our team for review as part of your candidate verification.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setStep("setup");
                    setEvaluation(null);
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
                  ⚡ Retake AI Verbal Interview (Dev Mode)
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
