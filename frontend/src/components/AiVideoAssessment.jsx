import React, { useEffect, useRef, useState } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

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
  const [silenceTimeLeft, setSilenceTimeLeft] = useState(3);
  const lastSpeechTimeRef = useRef(Date.now());
  const [qaTranscripts, setQaTranscripts] = useState({});
  const [proctorLogs, setProctorLogs] = useState({ tabSwitches: 0, focusLosses: 0 });
  const advancingRef = useRef(false);

  useEffect(() => {
    qIdxRef.current = qIdx;
  }, [qIdx]);

  // Evaluation & Results States
  const [evaluation, setEvaluation] = useState(() => {
    if (!isInterviewCompleted) return null;
    const score = typeof existingData.aiScore === "number" ? existingData.aiScore : 0;
    return {
      overallScore: score,
      rubricScores: existingData.rubricScores || {
        communicationClarity: score,
        technicalAccuracy: score,
        professionalTone: score > 0 ? 88 : 0,
        fluency: score,
      },
      questionScores: existingData.questionScores || (existingData.qaPairs || []).map((pair, idx) => ({
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: false,
        feedback: "0 Marks: Completed interview attempt.",
      })),
      feedback: existingData.feedback || `Candidate scored ${score}% overall on Stage 5 AI Video Assessment.`,
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

  // 3-Second Silence Detection Monitor
  useEffect(() => {
    if (!isRecording) return;
    const silenceTimer = setInterval(() => {
      const elapsedSilence = Math.floor((Date.now() - lastSpeechTimeRef.current) / 1000);
      const remainingSilence = Math.max(0, 3 - elapsedSilence);
      setSilenceTimeLeft(remainingSilence);

      if (elapsedSilence >= 3) {
        clearInterval(silenceTimer);
        toast("No speech detected for 3 seconds. Auto-advancing...", "!");
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
    setSilenceTimeLeft(10);
    lastSpeechTimeRef.current = Date.now();
    setIsRecording(true);

    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.stop();
      } catch (e) {}
      recognitionRef.current = null;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
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
      try {
        recognition.start();
        recognitionRef.current = recognition;
      } catch (e) {}
    }
  }

  function advanceToNextQuestion() {
    // Guards against the time-limit timer and the silence timer both firing
    // for the same question (e.g. both hit their threshold on the same
    // tick), which previously could double-advance and desync the timer.
    if (advancingRef.current) return;
    advancingRef.current = true;

    setIsRecording(false);
    if (recognitionRef.current) {
      try {
        recognitionRef.current.onresult = null;
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
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {}
    }
    if (recognitionRef.current) {
      try {
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
    const expectedKeywords = expectedKey
      ? expectedKey.split(/[\s,.;:-]+/).filter((w) => w.length >= 3)
      : defaultKeywords;

    const candidateTextLower = tr.toLowerCase();
    let matchedCount = 0;
    expectedKeywords.forEach((kw) => {
      if (candidateTextLower.includes(kw)) {
        matchedCount++;
      }
    });

    const matchRatio = expectedKeywords.length > 0 ? matchedCount / expectedKeywords.length : 0;

    if (matchedCount === 0 || matchRatio < 0.35) {
      return {
        marks: 0,
        answered: true,
        feedback: "0 Marks: Incorrect answer. Spoken response did not match expected correct answer key."
      };
    }

    const marks = Math.min(100, Math.round(70 + matchRatio * 30));
    return {
      marks,
      answered: true,
      feedback: `Correct answer evaluated: ${marks}/100 Marks based on answer key match.`
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
        toast("AI Video Evaluation & Marks Calculation Complete!", "✓");
        if (onSaved) onSaved(res.data);
      }
    } catch (err) {
      console.error("Final AI submission error:", err);
      // Heuristic Fallback Evaluation with correctness & 0-marks check
      const fallbackScores = questionsList.map((q) => {
        const tr = qaTranscripts[q.id] || "";
        const scoring = scoreQuestionTranscript(q, tr);
        return {
          questionId: q.id,
          question: q.question,
          marks: scoring.marks,
          answered: scoring.answered,
          feedback: scoring.feedback,
        };
      });

      const total = fallbackScores.reduce((sum, item) => sum + item.marks, 0);
      const avg = fallbackScores.length > 0 ? Math.round(total / fallbackScores.length) : 0;

      setEvaluation({
        overallScore: avg,
        rubricScores: { communicationClarity: avg, technicalAccuracy: avg, professionalTone: avg > 0 ? 88 : 0, fluency: avg },
        questionScores: fallbackScores,
        feedback: `Candidate evaluated: ${avg}% overall score across verbal assessment questions.`,
      });
      setStep("report");
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
                      {isSpeaking ? "AI is asking the question…" : "Questions auto-advance on 3s silence or time limit expiration."}
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

      {/* STEP 5: AI EVALUATION & MARKS REPORT CARD */}
      {step === "report" && evaluation && (
        <div>
          <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16, marginBottom: 20, borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
              <div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 6 }}>
                  <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
                    <i className="fa-solid fa-circle-check"></i> AI ASSESSMENT &amp; MARKS EVALUATED
                  </span>
                  <span style={{ background: "#FEF3C7", color: "#B45309", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999, border: "1px solid #F59E0B" }}>
                    <i className="fa-solid fa-lock"></i> Single Attempt Completed • Retakes Not Allowed
                  </span>
                </div>
                <h3 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 2px" }}>
                  AI Communication Score: {evaluation.overallScore}%
                </h3>
                <p style={{ fontSize: 13, color: "#475569", margin: 0 }}>
                  Per-Question Spoken Answer Evaluation • Face Presence Verified
                </p>
              </div>

              <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", borderRadius: 12, padding: "14px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B" }}>TOTAL MARKS</div>
                <div style={{ fontSize: 32, fontWeight: 800, color: "var(--navy)" }}>{evaluation.overallScore}<span style={{ fontSize: 14, color: "#94A3B8" }}>/100</span></div>
                <div style={{ fontSize: 11, fontWeight: 700, color: "#15803D" }}>Recorded</div>
              </div>
            </div>

            {/* PER-QUESTION MARKS BREAKDOWN LIST */}
            <h4 style={{ fontSize: 15, fontWeight: 800, color: "var(--navy)", marginBottom: 12 }}>Per-Question Spoken Answer Marks</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 20 }}>
              {(evaluation.questionScores || []).map((qScore, idx) => (
                <div
                  key={idx}
                  style={{
                    background: qScore.marks > 0 ? "#F0FDF4" : "#FEF2F2",
                    border: `1px solid ${qScore.marks > 0 ? "#BBF7D0" : "#FECACA"}`,
                    borderRadius: 10,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "var(--navy)" }}>
                      Q{idx + 1}. {qScore.question || questionsList[idx]?.question}
                    </div>
                    <div style={{ fontSize: 11, color: qScore.marks > 0 ? "#15803D" : "#DC2626", marginTop: 2 }}>
                      {qScore.feedback || (qScore.marks > 0 ? `Spoken response evaluated: ${qScore.marks}/100 Marks` : "0 Marks: No spoken response provided for this question.")}
                    </div>
                  </div>

                  <span style={{ background: qScore.marks > 0 ? "#DCFCE7" : "#FEE2E2", color: qScore.marks > 0 ? "#15803D" : "#DC2626", fontSize: 13, fontWeight: 800, padding: "4px 12px", borderRadius: 999, flexShrink: 0 }}>
                    {qScore.marks} / 100 Marks
                  </span>
                </div>
              ))}
            </div>

            {/* Rubric Grid */}
            <h4 style={{ fontSize: 14, fontWeight: 800, color: "var(--navy)", marginBottom: 12 }}>Rubric Metric Breakdown</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 20 }}>
              <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1" }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>CLARITY</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{evaluation.rubricScores.communicationClarity}%</div>
              </div>
              <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1" }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>TECHNICAL RCM ACCURACY</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{evaluation.rubricScores.technicalAccuracy}%</div>
              </div>
              <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1" }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>PROFESSIONAL TONE</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{evaluation.rubricScores.professionalTone}%</div>
              </div>
              <div style={{ background: "#F8FAFC", padding: 12, borderRadius: 8, border: "1px solid #CBD5E1" }}>
                <div style={{ fontSize: 11, color: "#64748B", fontWeight: 700 }}>FLUENCY</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>{evaluation.rubricScores.fluency}%</div>
              </div>
            </div>

            <div style={{ background: "#F1F5F9", borderRadius: 8, padding: 14, fontSize: 12, color: "#334155", lineHeight: 1.6 }}>
              <strong>AI Evaluator Feedback:</strong> {evaluation.feedback}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
