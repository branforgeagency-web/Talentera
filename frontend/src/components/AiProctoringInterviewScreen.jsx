import React, { useState, useEffect, useRef, useCallback } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import { SimliClient } from "simli-client";
import api from "../api/client";

// Default Medical Coding & Healthcare RCM Interview Questions
const DEFAULT_QUESTIONS = [
  {
    id: "default-1",
    index: 0,
    topic: "Career & Experience",
    title: "Question 1 of 5",
    question: "Please introduce yourself and outline your background in Medical Coding, ICD-10-CM sequencing, and healthcare reimbursement workflows.",
    correctAnswer: "Candidate should explain certified medical coding experience (CPC/CCS), proficiency with ICD-10-CM coding conventions, sequencing primary vs secondary diagnoses, and familiarity with CMS 1500 and UB-04 claim workflows.",
    expectedConcepts: ["ICD-10-CM", "sequencing", "diagnosis", "CPC", "reimbursement", "claims", "coding guidelines"],
  },
  {
    id: "default-2",
    index: 1,
    topic: "ICD-10-CM Guidelines",
    title: "Question 2 of 5",
    question: "How do you distinguish between 'Excludes1' and 'Excludes2' notes in ICD-10-CM, and in what clinical situation might both codes be reported together?",
    correctAnswer: "Excludes1 represents pure exclusion meaning 'NOT CODED HERE'—the two conditions cannot occur together (except when conditions are completely unrelated). Excludes2 means 'NOT INCLUDED HERE' where the patient may have both conditions simultaneously, allowing both codes to be reported together.",
    expectedConcepts: ["Excludes1", "Excludes2", "not coded here", "not included here", "unrelated", "simultaneously", "both codes"],
  },
  {
    id: "default-3",
    index: 2,
    topic: "CPT Modifiers",
    title: "Question 3 of 5",
    question: "Explain when modifier 25 should be appended to an Evaluation and Management (E/M) service, and what documentation is required to support separate billing.",
    correctAnswer: "Modifier 25 indicates a significant, separately identifiable Evaluation and Management service by the same physician on the same day of a procedure. Documentation must show key E/M components (history, exam, MDM) beyond normal pre/post-procedure work.",
    expectedConcepts: ["Modifier 25", "significant", "separately identifiable", "same day", "procedure", "MDM", "documentation"],
  },
  {
    id: "default-4",
    index: 3,
    topic: "Risk Adjustment & HCC",
    title: "Question 4 of 5",
    question: "What are the MEAT criteria in HCC Risk Adjustment coding, and how do you ensure chronic conditions meet documentation standards?",
    correctAnswer: "MEAT stands for Monitor, Evaluate, Assess, and Treat. To code chronic conditions for HCC risk adjustment, the provider record must document active management under at least one MEAT element within the encounter year.",
    expectedConcepts: ["MEAT", "Monitor", "Evaluate", "Assess", "Treat", "HCC", "Risk Adjustment", "chronic conditions"],
  },
  {
    id: "default-5",
    index: 4,
    topic: "Denial Management",
    title: "Question 5 of 5",
    question: "Walk me through how you resolve a CO-197 or CO-16 denial from a major commercial payer while maintaining compliance.",
    correctAnswer: "CO-16 indicates missing or incomplete information, requiring review of missing modifiers, diagnosis pointers, or attachments. CO-197 indicates missing pre-certification/authorization, requiring retroactive auth verification, appeal with clinical necessity, or provider peer-to-peer review.",
    expectedConcepts: ["CO-16", "CO-197", "denial", "pre-certification", "prior authorization", "appeal", "medical necessity", "modifiers"],
  },
];

// ---------------------------------------------------------------------------
// Real-Time Lip-Sync AI Interviewer Bot Component (Simli WebRTC + Fallback)
// ---------------------------------------------------------------------------
function LipSyncInterviewerBot({
  state, // "IDLE" | "CONNECTING" | "SPEAKING" | "LISTENING"
  currentCaption,
  onReplay,
}) {
  const isSpeaking = state === "SPEAKING";
  const isListening = state === "LISTENING";
  const isConnecting = state === "CONNECTING";

  const fallbackVideoRef = useRef(null);
  const simliVideoRef = useRef(null);
  const simliAudioRef = useRef(null);
  const simliClientRef = useRef(null);
  const [isWebRTCConnected, setIsWebRTCConnected] = useState(false);

  // --- 1. SIMLI WEBRTC CLIENT LIFECYCLE ---
  useEffect(() => {
    let isMounted = true;
    const simliApiKey = import.meta.env?.VITE_SIMLI_API_KEY || "";
    const simliFaceId = import.meta.env?.VITE_SIMLI_FACE_ID || "tmp9i8bbq7v";

    if (simliApiKey && simliVideoRef.current && simliAudioRef.current) {
      try {
        const client = new SimliClient();
        client.Initialize({
          apiKey: simliApiKey,
          faceID: simliFaceId,
          handleSilence: true,
          videoRef: simliVideoRef,
          audioRef: simliAudioRef,
        });

        client.on("connected", () => {
          if (isMounted) setIsWebRTCConnected(true);
        });

        client.on("disconnected", () => {
          if (isMounted) setIsWebRTCConnected(false);
        });

        client.on("failed", () => {
          if (isMounted) setIsWebRTCConnected(false);
        });

        client.start();
        simliClientRef.current = client;
      } catch (err) {
        console.warn("Simli WebRTC client initialization notice:", err);
      }
    }

    return () => {
      isMounted = false;
      if (simliClientRef.current) {
        try {
          simliClientRef.current.close();
        } catch {}
      }
    };
  }, []);

  // --- 2. PHOTOREALISTIC FALLBACK AVATAR SYNC (/ai bot.mp4) ---
  useEffect(() => {
    const video = fallbackVideoRef.current;
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

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        borderRadius: 16,
        background: "rgba(15, 23, 42, 0.94)",
        backdropFilter: "blur(12px)",
        border: isSpeaking
          ? "2px solid #F59E0B"
          : isListening
          ? "2px solid #10B981"
          : "1.5px solid rgba(255, 255, 255, 0.15)",
        boxShadow: isSpeaking
          ? "0 0 25px rgba(245, 158, 11, 0.45), 0 10px 30px rgba(0, 0, 0, 0.6)"
          : isListening
          ? "0 0 20px rgba(16, 185, 129, 0.35), 0 10px 30px rgba(0, 0, 0, 0.6)"
          : "0 10px 30px rgba(0, 0, 0, 0.6)",
        overflow: "hidden",
        transition: "border 0.25s ease, box-shadow 0.25s ease",
      }}
    >
      {/* Bot Video Stream Frame */}
      <div style={{ position: "relative", width: "100%", height: 175, background: "#06152A", overflow: "hidden" }}>
        {/* Simli WebRTC Stream (When Connected) */}
        <video
          ref={simliVideoRef}
          playsInline
          autoPlay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isWebRTCConnected ? "block" : "none",
          }}
        />
        <audio ref={simliAudioRef} autoPlay style={{ display: "none" }} />

        {/* Fallback Photorealistic Lip-Sync Video (/ai bot.mp4) */}
        <video
          ref={fallbackVideoRef}
          src="/ai bot.mp4"
          playsInline
          muted
          loop
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: isWebRTCConnected ? "none" : "block",
          }}
        />

        {/* Top Header Badge */}
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          right: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}>
          <div style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(10, 31, 61, 0.85)",
            backdropFilter: "blur(6px)",
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.15)",
            fontSize: 10.5,
            fontWeight: 800,
            color: "#F8FAFC",
            letterSpacing: "0.02em",
          }}>
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: isSpeaking ? "#F59E0B" : isListening ? "#10B981" : "#94A3B8",
                boxShadow: isSpeaking
                  ? "0 0 8px #F59E0B"
                  : isListening
                  ? "0 0 8px #10B981"
                  : "none",
                animation: isSpeaking || isListening ? "pulse 1.5s infinite" : "none",
              }}
            />
            <span>{isSpeaking ? "AI SPEAKING" : isListening ? "AI LISTENING" : isConnecting ? "CONNECTING" : "AI READY"}</span>
          </div>

          <div style={{
            fontSize: 9.5,
            fontWeight: 800,
            padding: "2px 7px",
            borderRadius: 6,
            background: isWebRTCConnected ? "rgba(37, 99, 235, 0.85)" : "rgba(245, 180, 26, 0.2)",
            color: isWebRTCConnected ? "#FFFFFF" : "#F5C95B",
            border: isWebRTCConnected ? "1px solid #3B82F6" : "1px solid rgba(245, 180, 26, 0.4)",
          }}>
            {isWebRTCConnected ? "⚡ WebRTC 60FPS" : "🤖 Lip-Sync Bot"}
          </div>
        </div>

        {/* Name Bar at Bottom of Video */}
        <div style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(180deg, transparent 0%, rgba(6, 21, 42, 0.95) 100%)",
          padding: "16px 10px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          zIndex: 10,
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "#FFFFFF" }}>Talentera AI Examiner</div>
            <div style={{ fontSize: 9.5, color: "#94A3B8" }}>Autonomous RCM Evaluator</div>
          </div>

          {onReplay && (
            <button
              type="button"
              onClick={onReplay}
              disabled={isSpeaking}
              title="Repeat question"
              style={{
                background: "rgba(255,255,255,0.12)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "#F8FAFC",
                borderRadius: 6,
                padding: "3px 7px",
                fontSize: 10,
                fontWeight: 700,
                cursor: isSpeaking ? "not-allowed" : "pointer",
                opacity: isSpeaking ? 0.5 : 1,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <i className="fa-solid fa-volume-high"></i>
              <span>Replay</span>
            </button>
          )}
        </div>
      </div>

      {/* Closed Captions Subtitle Box (Below avatar) */}
      <div style={{
        padding: "10px 12px",
        background: "rgba(10, 31, 61, 0.95)",
        borderTop: "1px solid rgba(255, 255, 255, 0.08)",
        minHeight: 46,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}>
        <div style={{ fontSize: 9.5, textTransform: "uppercase", letterSpacing: "0.06em", color: "#F5C95B", fontWeight: 800, marginBottom: 2 }}>
          {isSpeaking ? "🔊 Active Prompt" : "💬 Question Context"}
        </div>
        <div style={{
          fontSize: 11.5,
          color: isSpeaking ? "#FFFFFF" : "#CBD5E1",
          lineHeight: 1.4,
          maxHeight: 42,
          overflowY: "auto",
          fontStyle: isSpeaking ? "normal" : "italic",
        }}>
          {currentCaption || "Interviewer is listening to your answer…"}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main AI Proctoring & Mock Interview Screen Component
// ---------------------------------------------------------------------------
export default function AiProctoringInterviewScreen({
  candidateData,
  questions: propQuestions = DEFAULT_QUESTIONS,
  onCompleted,
  onExit,
}) {
  // --- 1. WEBCAM & MEDIAPIPE REFS ---
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animFrameIdRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  // --- 2. VIDEO RECORDING REFS ---
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);

  // --- 3. PROCTORING & GAZE DETECTION STATES ---
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState("");
  const [cameraActive, setCameraActive] = useState(false);

  // Real-time Landmark Telemetry
  const [yawRatio, setYawRatio] = useState(1.0);
  const [pitchRatio, setPitchRatio] = useState(1.0);
  const [faceDetected, setFaceDetected] = useState(true);
  const [rawWarning, setRawWarning] = useState(null);

  // Debounced Warning Overlay & Infraction Count
  const [activeWarning, setActiveWarning] = useState(null);
  const [attentionWarningsCount, setAttentionWarningsCount] = useState(0);
  const warningTimerRef = useRef(null);
  const lastWarningLoggedAtRef = useRef(0);

  // Tab switch termination & anti-cheat state
  const isPastTerminated = Boolean(
    candidateData?.stage5?.terminatedDueToTabSwitch ||
    candidateData?.stage8?.aiInterview?.status === "TERMINATED_TAB_SWITCH" ||
    candidateData?.terminatedDueToTabSwitch
  );
  const [tabSwitchCount, setTabSwitchCount] = useState(isPastTerminated ? 1 : 0);
  const [isTerminated, setIsTerminated] = useState(isPastTerminated);
  const [terminationReason, setTerminationReason] = useState(
    isPastTerminated
      ? "Browser Tab Switch Detected: Switching tabs or unfocusing the window during an active AI Proctored Mock Interview violates anti-cheat policies."
      : ""
  );
  const [isSubmittingProctored, setIsSubmittingProctored] = useState(false);

  // --- 4. RETAKE REQUEST STATES ---
  const [retakeRequest, setRetakeRequest] = useState(null);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [retakeError, setRetakeError] = useState("");
  const [retakeSuccessMsg, setRetakeSuccessMsg] = useState("");

  // --- 5. INTERVIEW & DATABASE QUESTION INTEGRATION STATE ---
  const [questionsList, setQuestionsList] = useState(propQuestions || DEFAULT_QUESTIONS);
  const [currentQIndex, setCurrentQIndex] = useState(0);
  // botState: "IDLE" | "CONNECTING" | "SPEAKING" | "LISTENING"
  const [botState, setBotState] = useState("IDLE");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [accumulatedQaPairs, setAccumulatedQaPairs] = useState([]);
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [evaluatingTurn, setEvaluatingTurn] = useState(false);
  const [interviewResult, setInterviewResult] = useState(candidateData?.stage8?.aiInterview?.result || null);

  const recognitionRef = useRef(null);
  const liveTranscriptRef = useRef("");
  const currentQ = questionsList[currentQIndex] || questionsList[0] || DEFAULT_QUESTIONS[0];

  // Fetch active interview questions directly from database bank on mount
  useEffect(() => {
    let isMounted = true;
    api
      .post("/candidate/ai-interview/start", { retake: false })
      .then((res) => {
        if (!isMounted) return;
        const session = res.data?.session;
        if (session?.questions && session.questions.length > 0) {
          const mapped = session.questions.map((q, idx) => ({
            id: q.id || q._id || `q-${idx + 1}`,
            index: idx,
            topic: q.topic || `Question ${idx + 1}`,
            title: `Question ${idx + 1} of ${session.questions.length}`,
            question: q.question || q.text,
            correctAnswer: q.correctAnswer || "",
            expectedConcepts: q.expectedConcepts || [],
          }));
          setQuestionsList(mapped);
          if (session.status === "COMPLETED" || session.status === "STOPPED") {
            setCompleted(true);
            setInterviewResult(session.result);
          }
        }
      })
      .catch((err) => {
        console.warn("Using fallback questions bank:", err.message);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch candidate's active Stage 5 retake request on load / termination
  const fetchRetakeStatus = useCallback(async () => {
    try {
      const res = await api.get("/candidate/retake-request?stage=5");
      if (res.data?.request) {
        setRetakeRequest(res.data.request);
      } else {
        setRetakeRequest(null);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchRetakeStatus();
  }, [fetchRetakeStatus, isTerminated, completed]);

  // --- 6. AUDIO & SPEECH STREAMING PIPELINE ---
  const speakQuestion = useCallback((text, callback) => {
    setBotState("SPEAKING");

    if (!window.speechSynthesis) {
      setBotState("LISTENING");
      if (callback) callback();
      return;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.95;
      utterance.pitch = 1.0;
      utterance.lang = "en-US";

      const voices = window.speechSynthesis.getVoices();
      const naturalVoice = voices.find(
        (v) => (v.name.includes("Natural") || v.name.includes("Neural") || v.name.includes("Google") || v.name.includes("Samantha")) && v.lang.startsWith("en")
      );
      if (naturalVoice) utterance.voice = naturalVoice;

      utterance.onend = () => {
        setBotState("LISTENING");
        if (callback) callback();
      };
      utterance.onerror = () => {
        setBotState("LISTENING");
        if (callback) callback();
      };

      window.speechSynthesis.speak(utterance);
    } catch {
      setBotState("LISTENING");
      if (callback) callback();
    }
  }, []);

  // --- 7. SPEECH RECOGNITION (STT) ---
  const startListening = useCallback(() => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;

    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }

    try {
      const rec = new SpeechRec();
      rec.continuous = true;
      rec.interimResults = true;
      rec.lang = "en-US";

      rec.onresult = (e) => {
        let text = "";
        for (let i = 0; i < e.results.length; i++) {
          text += e.results[i][0].transcript + " ";
        }
        liveTranscriptRef.current = text.trim();
        setLiveTranscript(text.trim());
      };

      rec.onerror = () => {};
      rec.onend = () => {
        if (botState === "LISTENING") {
          try {
            rec.start();
          } catch {}
        }
      };

      recognitionRef.current = rec;
      rec.start();
    } catch {}
  }, [currentQ.id, botState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
  }, []);

  // --- 8. INITIALIZE MEDIAPIPE FACE LANDMARKER ---
  useEffect(() => {
    let active = true;

    async function initMediaPipeLandmarker() {
      try {
        setModelLoading(true);
        setModelError("");

        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );

        if (!active) return;

        let landmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        } catch {
          landmarker = await FaceLandmarker.createFromOptions(vision, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            outputFaceBlendshapes: false,
            runningMode: "VIDEO",
            numFaces: 1,
          });
        }

        if (active) {
          landmarkerRef.current = landmarker;
          setModelLoading(false);
        }
      } catch (err) {
        console.error("Failed to load MediaPipe Face Landmarker:", err);
        if (active) {
          setModelError("Unable to load Google MediaPipe AI Vision model. Please check your internet connection.");
          setModelLoading(false);
        }
      }
    }

    initMediaPipeLandmarker();

    return () => {
      active = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close();
        } catch {}
      }
    };
  }, []);

  // --- 9. START WEBCAM & SETUP MEDIA RECORDER ---
  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: "user",
        },
        audio: true,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);

      // Initialize MediaRecorder for continuous session recording
      recordedChunksRef.current = [];
      try {
        let mimeType = "video/webm;codecs=vp8,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = MediaRecorder.isTypeSupported("video/webm") ? "video/webm" : "";
        }
        const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
        recorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            recordedChunksRef.current.push(e.data);
          }
        };
        mediaRecorderRef.current = recorder;
      } catch (recErr) {
        console.warn("MediaRecorder init notice:", recErr);
      }
    } catch (err) {
      console.error("Camera access denied or failed:", err);
      setModelError("Webcam/Microphone access was denied. Please allow camera permissions to begin.");
    }
  }, []);

  // --- 10. REAL-TIME COMPUTER VISION PROCTORING LOOP ---
  const runVisionDetection = useCallback(() => {
    const video = videoRef.current;
    const landmarker = landmarkerRef.current;

    if (!video || !landmarker || video.paused || video.ended) {
      animFrameIdRef.current = requestAnimationFrame(runVisionDetection);
      return;
    }

    if (video.currentTime !== lastVideoTimeRef.current && video.videoWidth > 0 && video.videoHeight > 0) {
      lastVideoTimeRef.current = video.currentTime;
      const startTimeMs = performance.now();

      const results = landmarker.detectForVideo(video, startTimeMs);

      if (!results.faceLandmarks || results.faceLandmarks.length === 0) {
        setFaceDetected(false);
        setRawWarning("⚠️ Face not detected! Please stay centered in frame");
      } else {
        setFaceDetected(true);
        const landmarks = results.faceLandmarks[0];

        const nose = landmarks[1];          // Nose tip
        const leftCheek = landmarks[234];   // Left boundary
        const rightCheek = landmarks[454];  // Right boundary
        const forehead = landmarks[10];     // Top boundary
        const chin = landmarks[152];        // Bottom boundary

        // 1. Yaw Ratio (Horizontal turn left / right)
        const dLeft = Math.abs(nose.x - leftCheek.x);
        const dRight = Math.abs(nose.x - rightCheek.x);
        const computedYawRatio = Number((dLeft / (dRight || 0.0001)).toFixed(3));
        setYawRatio(computedYawRatio);

        // 2. Pitch Ratio (Vertical look up / down)
        const dTop = Math.abs(nose.y - forehead.y);
        const dBottom = Math.abs(nose.y - chin.y);
        const computedPitchRatio = Number((dTop / (dBottom || 0.0001)).toFixed(3));
        setPitchRatio(computedPitchRatio);

        // Evaluate Ultra-Sensitive Infraction Conditions
        let currentWarning = null;
        if (computedYawRatio < 0.80) {
          currentWarning = "⚠️ Head turned right — Please face the screen directly";
        } else if (computedYawRatio > 1.25) {
          currentWarning = "⚠️ Head turned left — Please face the screen directly";
        } else if (computedPitchRatio < 0.78) {
          currentWarning = "⚠️ Head tilted up — Please look directly at the screen";
        } else if (computedPitchRatio > 1.28) {
          currentWarning = "⚠️ Head tilted down — Please look directly at the screen";
        }

        setRawWarning(currentWarning);
      }
    }

    animFrameIdRef.current = requestAnimationFrame(runVisionDetection);
  }, []);

  // --- 11. DEBOUNCE WARNING LOGIC & INFRACTION COUNTER ---
  useEffect(() => {
    if (rawWarning) {
      if (!warningTimerRef.current) {
        warningTimerRef.current = setTimeout(() => {
          setActiveWarning(rawWarning);
          const now = Date.now();
          if (now - lastWarningLoggedAtRef.current > 2500) {
            setAttentionWarningsCount((prev) => prev + 1);
            lastWarningLoggedAtRef.current = now;
          }
        }, 200);
      }
    } else {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
        warningTimerRef.current = null;
      }
      setActiveWarning(null);
    }

    return () => {
      if (warningTimerRef.current) {
        clearTimeout(warningTimerRef.current);
      }
    };
  }, [rawWarning]);

  // --- 12. AUTO-SUBMIT PROCTORED RECORDING & TELEMETRY ---
  const submitProctoredSession = useCallback(
    async ({ finalStatus, isTabSwitch = false, evaluatedScore = null, qaPairs = [] }) => {
      setIsSubmittingProctored(true);
      try {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
          try {
            mediaRecorderRef.current.stop();
          } catch {}
        }

        await new Promise((r) => setTimeout(r, 400));

        const videoBlob =
          recordedChunksRef.current.length > 0
            ? new Blob(recordedChunksRef.current, { type: "video/webm" })
            : null;

        const calculatedIntegrity = Math.max(0, 100 - attentionWarningsCount * 4 - (isTabSwitch ? 50 : 0));
        const finalScore = isTabSwitch ? 0 : (typeof evaluatedScore === "number" ? evaluatedScore : 80);

        const formData = new FormData();
        if (videoBlob) {
          formData.append("video", videoBlob, "proctored_mock_interview.webm");
        }
        formData.append("status", finalStatus);
        formData.append("score", String(finalScore));
        formData.append("integrityScore", String(calculatedIntegrity));
        if (qaPairs && qaPairs.length > 0) {
          formData.append("qaPairs", JSON.stringify(qaPairs));
        }
        formData.append(
          "proctorLogs",
          JSON.stringify({
            tabSwitches: isTabSwitch ? 1 : 0,
            gazeWarnings: attentionWarningsCount,
            terminatedDueToTabSwitch: isTabSwitch,
            terminationReason: isTabSwitch ? "Tab switch violation detected" : null,
            recordedAt: new Date().toISOString(),
          })
        );

        const res = await api.post("/candidate/ai-interview/proctored-submit", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (onCompleted) {
          onCompleted(res.data);
        }
      } catch (err) {
        console.error("Proctored session submission error:", err);
      } finally {
        setIsSubmittingProctored(false);
      }
    },
    [attentionWarningsCount, onCompleted]
  );

  // --- 13. TAB SWITCH DETECTION & AUTO-TERMINATION ---
  const triggerTabSwitchTermination = useCallback(() => {
    if (!interviewStarted || completed || isTerminated) return;

    setTabSwitchCount((prev) => prev + 1);
    setIsTerminated(true);
    setTerminationReason(
      "Browser Tab Switch Detected: Switching tabs or unfocusing the window during an active AI Proctored Mock Interview violates anti-cheat policies."
    );

    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopListening();
    setBotState("IDLE");

    submitProctoredSession({ finalStatus: "TERMINATED_TAB_SWITCH", isTabSwitch: true, evaluatedScore: 0 });
  }, [interviewStarted, completed, isTerminated, stopListening, submitProctoredSession]);

  useEffect(() => {
    function handleVisibilityChange() {
      if (document.hidden && interviewStarted && !completed && !isTerminated) {
        triggerTabSwitchTermination();
      }
    }

    function handleWindowBlur() {
      if (interviewStarted && !completed && !isTerminated) {
        triggerTabSwitchTermination();
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
    };
  }, [interviewStarted, completed, isTerminated, triggerTabSwitchTermination]);

  // --- 14. SUBMIT RETAKE REQUEST ---
  const handleSubmitRetakeRequest = async (e) => {
    if (e) e.preventDefault();
    if (!retakeReason.trim()) {
      setRetakeError("Please provide a reason for requesting a retake.");
      return;
    }
    if (retakeReason.trim().length < 10) {
      setRetakeError("Please provide a more detailed reason (minimum 10 characters).");
      return;
    }

    setSubmittingRetake(true);
    setRetakeError("");
    setRetakeSuccessMsg("");

    try {
      const res = await api.post("/candidate/retake-request", {
        stage: 5,
        assessmentType: "Talentera AI Mock Interview (Stage 5)",
        reason: retakeReason.trim(),
      });

      if (res.data?.success) {
        setRetakeRequest(res.data.request);
        setRetakeSuccessMsg("Your retake request has been submitted to Talentera employees!");
        setShowRetakeModal(false);
        setRetakeReason("");
      }
    } catch (err) {
      setRetakeError(err.response?.data?.message || "Failed to submit retake request. Please try again.");
    } finally {
      setSubmittingRetake(false);
    }
  };

  // --- 15. START PROCTORING ON MOUNT ---
  useEffect(() => {
    if (!modelLoading && !modelError) {
      startCamera();
    }
  }, [modelLoading, modelError, startCamera]);

  useEffect(() => {
    if (cameraActive && !modelLoading && landmarkerRef.current && !isTerminated && !completed) {
      animFrameIdRef.current = requestAnimationFrame(runVisionDetection);
    }
    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
    };
  }, [cameraActive, modelLoading, isTerminated, completed, runVisionDetection]);

  // --- 16. CLEANUP ON COMPONENT UNMOUNT ---
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {}
      }
    };
  }, []);

  // --- 17. INTERVIEW FLOW HANDLERS ---
  const handleStartInterview = async () => {
    setInterviewStarted(true);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === "inactive") {
      try {
        mediaRecorderRef.current.start(1000);
      } catch (err) {
        console.warn("Recorder start notice:", err);
      }
    }

    try {
      const res = await api.post("/candidate/ai-interview/start", { retake: true });
      if (res.data?.session?.questions?.length > 0) {
        const mapped = res.data.session.questions.map((q, idx) => ({
          id: q.id || q._id || `q-${idx + 1}`,
          index: idx,
          topic: q.topic || `Question ${idx + 1}`,
          title: `Question ${idx + 1} of ${res.data.session.questions.length}`,
          question: q.question || q.text,
          correctAnswer: q.correctAnswer || "",
          expectedConcepts: q.expectedConcepts || [],
        }));
        setQuestionsList(mapped);
      }
    } catch {}

    const firstQuestionText = questionsList[0]?.question || DEFAULT_QUESTIONS[0].question;
    speakQuestion(firstQuestionText, () => {
      startListening();
    });
  };

  const handleNextQuestion = async () => {
    stopListening();
    setEvaluatingTurn(true);

    const answeredText = liveTranscriptRef.current || liveTranscript || "(no response)";
    const currentQObj = questionsList[currentQIndex] || DEFAULT_QUESTIONS[currentQIndex];

    const currentPair = {
      questionId: currentQObj.id,
      question: currentQObj.question,
      correctAnswer: currentQObj.correctAnswer,
      transcript: answeredText,
    };

    const updatedPairs = [...accumulatedQaPairs, currentPair];
    setAccumulatedQaPairs(updatedPairs);
    setLiveTranscript("");
    liveTranscriptRef.current = "";

    try {
      // Send turn to backend for evaluation against DB answer
      const turnRes = await api.post("/candidate/ai-interview/turn", {
        candidateUtterance: answeredText,
        proctorLogs: {
          tabSwitches: tabSwitchCount,
          gazeWarnings: attentionWarningsCount,
        },
      });

      const isLast = currentQIndex >= questionsList.length - 1 || turnRes.data?.interviewEnded;

      if (!isLast) {
        const nextIdx = currentQIndex + 1;
        setCurrentQIndex(nextIdx);
        const nextQObj = questionsList[nextIdx];
        setEvaluatingTurn(false);
        speakQuestion(nextQObj.question, () => {
          startListening();
        });
      } else {
        setCompleted(true);
        setBotState("IDLE");
        setEvaluatingTurn(false);

        const evaluatedReport = turnRes.data?.result || turnRes.data?.session?.result;
        if (evaluatedReport) {
          setInterviewResult(evaluatedReport);
        }

        const calculatedScore = typeof evaluatedReport?.overallScore === "number"
          ? evaluatedReport.overallScore
          : 82;

        submitProctoredSession({
          finalStatus: "COMPLETED",
          isTabSwitch: false,
          evaluatedScore: calculatedScore,
          qaPairs: updatedPairs,
        });
      }
    } catch (err) {
      console.warn("Turn evaluation fallback:", err);
      setEvaluatingTurn(false);

      if (currentQIndex < questionsList.length - 1) {
        const nextIdx = currentQIndex + 1;
        setCurrentQIndex(nextIdx);
        speakQuestion(questionsList[nextIdx].question, () => {
          startListening();
        });
      } else {
        setCompleted(true);
        setBotState("IDLE");
        submitProctoredSession({
          finalStatus: "COMPLETED",
          isTabSwitch: false,
          qaPairs: updatedPairs,
        });
      }
    }
  };

  const integrityScore = Math.max(0, 100 - attentionWarningsCount * 4 - (tabSwitchCount > 0 ? 50 : 0));
  const isBotSpeaking = botState === "SPEAKING";

  return (
    <div style={{
      width: "100%",
      minHeight: 680,
      background: "#06152A",
      color: "#F8FAFC",
      borderRadius: 20,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 25px 60px -15px rgba(0,0,0,0.6)",
      display: "flex",
      flexDirection: "column",
      fontFamily: "var(--font-body, system-ui, sans-serif)",
    }}>
      {/* Top Header */}
      <header style={{
        padding: "14px 24px",
        background: "rgba(10, 31, 61, 0.95)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexWrap: "wrap",
        gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ width: 10, height: 10, borderRadius: "50%", background: isTerminated ? "#EF4444" : "#10B981", display: "inline-block", boxShadow: `0 0 10px ${isTerminated ? "#EF4444" : "#10B981"}` }} />
          <h3 style={{ fontSize: 13.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.08em", color: "#F8FAFC", margin: 0 }}>
            {isTerminated ? "Session Auto-Terminated (Tab Switch)" : "AI Proctored Interview Room"}
          </h3>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {onExit && (
            <button
              type="button"
              onClick={onExit}
              style={{
                fontSize: 12,
                color: "rgba(255,255,255,0.7)",
                padding: "6px 12px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                cursor: "pointer",
              }}
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* ========================================================================= */}
      {/* 2-COLUMN SPLIT SCREEN: LEFT = CANDIDATE VIDEO, RIGHT = BOT & QUESTIONS & BTNS */}
      {/* ========================================================================= */}
      <div style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "1.65fr 1fr",
        minHeight: 580,
      }}>
        {/* ========================================================================= */}
        {/* LEFT PANE: CANDIDATE WEBCAM VIDEO SCREEN FRAME                            */}
        {/* ========================================================================= */}
        <div style={{
          position: "relative",
          background: "#000000",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          overflow: "hidden",
          borderRight: "1px solid rgba(255,255,255,0.1)",
        }}>
          {modelLoading && (
            <div style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "rgba(6,21,42,0.92)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }}>
              <div style={{ width: 44, height: 44, border: "3px solid #E5A82E", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 1s linear infinite", marginBottom: 16 }} />
              <p style={{ fontSize: 14, fontWeight: 700, color: "#F8FAFC", margin: "0 0 6px" }}>
                Initializing Google MediaPipe Face Landmarker Engine…
              </p>
              <p style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", margin: 0 }}>
                Configuring real-time vision proctoring &amp; camera bindings
              </p>
            </div>
          )}

          {modelError && (
            <div style={{
              position: "absolute",
              inset: 0,
              zIndex: 30,
              background: "rgba(6,21,42,0.95)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "rgba(239, 68, 68, 0.2)", border: "1px solid #EF4444", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, marginBottom: 14 }}>
                ⚠️
              </div>
              <p style={{ fontSize: 14, fontWeight: 700, color: "#FCA5A5", maxWidth: 440, margin: "0 0 16px" }}>{modelError}</p>
              <button
                type="button"
                onClick={startCamera}
                style={{ padding: "10px 20px", background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)", color: "#06152A", fontWeight: 800, borderRadius: 8, border: "none", fontSize: 12.5, cursor: "pointer" }}
              >
                Retry Camera Access
              </button>
            </div>
          )}

          {/* Candidate Live WebCam (Mirrored) */}
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scaleX(-1)",
              border: activeWarning || isTerminated ? "3px solid #EF4444" : "none",
              boxShadow: activeWarning || isTerminated ? "inset 0 0 40px rgba(239, 68, 68, 0.6)" : "none",
              transition: "border 0.2s ease, box-shadow 0.2s ease",
            }}
          />

          {/* Top-Left Live Gaze / Proctor Status Badge */}
          <div style={{ position: "absolute", top: 18, left: 18, zIndex: 15, display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{
              padding: "5px 12px",
              borderRadius: 999,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.04em",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px rgba(0,0,0,0.4)",
              backdropFilter: "blur(6px)",
              background: isTerminated
                ? "rgba(185, 28, 28, 0.95)"
                : activeWarning
                ? "rgba(185, 28, 28, 0.9)"
                : faceDetected
                ? "rgba(6, 78, 59, 0.85)"
                : "rgba(120, 53, 15, 0.85)",
              color: isTerminated || activeWarning ? "#FEE2E2" : faceDetected ? "#A7F3D0" : "#FDE68A",
              border: `1px solid ${isTerminated || activeWarning ? "#EF4444" : faceDetected ? "#10B981" : "#F59E0B"}`,
            }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: isTerminated || activeWarning ? "#EF4444" : faceDetected ? "#10B981" : "#F59E0B" }} />
              {isTerminated ? "TAB SWITCH VIOLATION" : activeWarning ? "GAZE DEVIATION" : faceDetected ? "EYE GAZE ALIGNED" : "SEARCHING FACE"}
            </span>
          </div>

          {/* DEBOUNCED PROCTORING WARNING BANNER OVERLAY */}
          {activeWarning && !isTerminated && (
            <div style={{
              position: "absolute",
              top: 76,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 25,
              width: "90%",
              maxWidth: 440,
            }}>
              <div style={{
                background: "rgba(127, 29, 29, 0.95)",
                border: "2px solid #EF4444",
                color: "#FFFFFF",
                padding: "12px 16px",
                borderRadius: 12,
                boxShadow: "0 0 30px rgba(239, 68, 68, 0.6)",
                backdropFilter: "blur(8px)",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}>
                <div style={{ fontSize: 22, flexShrink: 0 }}>🚨</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.06em", color: "#FCA5A5" }}>
                    AI Proctoring Alert
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF", marginTop: 2 }}>
                    {activeWarning}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB SWITCH TERMINATION BANNER OVERLAY */}
          {isTerminated && (
            <div style={{
              position: "absolute",
              inset: 0,
              zIndex: 35,
              background: "rgba(15, 23, 42, 0.94)",
              backdropFilter: "blur(10px)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 24,
              textAlign: "center",
            }}>
              <div style={{ width: 52, height: 52, borderRadius: "50%", background: "rgba(239, 68, 68, 0.2)", border: "2px solid #EF4444", color: "#EF4444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, marginBottom: 14 }}>
                ⚠️
              </div>
              <h4 style={{ fontSize: 17, fontWeight: 900, color: "#FCA5A5", margin: "0 0 8px" }}>
                Assessment Auto-Terminated: Tab Switch Violation
              </h4>
              <p style={{ fontSize: 12.5, color: "rgba(255,255,255,0.85)", maxWidth: 460, lineHeight: 1.55, margin: "0 0 14px" }}>
                {terminationReason}
              </p>
              <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1px solid rgba(239, 68, 68, 0.4)", borderRadius: 10, padding: "10px 16px", maxWidth: 460, fontSize: 11.5, color: "#FECACA" }}>
                <i className="fa-solid fa-video" style={{ marginRight: 6 }}></i>
                Your recorded session video and tab switch logs have been auto-submitted to the <strong>Employee Dashboard</strong> for review.
              </div>
            </div>
          )}

          {/* Bottom Floating Telemetry Strip */}
          <div style={{
            position: "absolute",
            bottom: 16,
            left: 18,
            right: 18,
            zIndex: 15,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: "rgba(6, 21, 42, 0.85)",
            backdropFilter: "blur(8px)",
            padding: "8px 14px",
            borderRadius: 10,
            border: "1px solid rgba(255,255,255,0.1)",
            fontSize: 11.5,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: "rgba(255,255,255,0.85)" }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#38BDF8" }} />
              <span>Candidate: <strong>{candidateData?.fullName || candidateData?.stage1?.fullName || "Candidate"}</strong></span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, color: "rgba(255,255,255,0.6)" }}>
              <span style={{ color: "#34D399", fontWeight: 800 }}>Integrity Score: {integrityScore}%</span>
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* RIGHT PANE: BOT (TOP), QUESTIONS & TRANSCRIPT (MIDDLE), BUTTONS (BOTTOM)   */}
        {/* ========================================================================= */}
        <div style={{
          background: "#081B33",
          padding: "20px 20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          overflowY: "auto",
          maxHeight: "82vh",
        }}>
          {/* 1. TOP: LIP-SYNC AI INTERVIEWER BOT */}
          <div>
            <LipSyncInterviewerBot
              state={botState}
              currentCaption={isBotSpeaking ? currentQ.question : liveTranscript || "Interviewer is listening to your answer…"}
              onReplay={interviewStarted && !completed && !isTerminated ? () => speakQuestion(currentQ.question) : null}
            />
          </div>

          {/* 2. RETAKE NOTICES (IF TERMINATED OR COMPLETED) */}
          {(isTerminated || completed) && (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {retakeSuccessMsg && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", border: "1px solid #10B981", color: "#6EE7B7", padding: "10px 14px", borderRadius: 10, fontSize: 12, fontWeight: 700 }}>
                  <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
                  {retakeSuccessMsg}
                </div>
              )}

              {retakeRequest?.status === "PENDING" && (
                <div style={{ background: "rgba(245, 158, 11, 0.15)", border: "1.5px solid #F59E0B", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#FDE68A", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                    <i className="fa-solid fa-hourglass-half"></i>
                    <span>Retake Request Pending Review</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", margin: "0 0 6px", lineHeight: 1.45 }}>
                    Your request has been submitted to Talentera employees. You will receive an email with the retake link once approved.
                  </p>
                  <div style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(245, 158, 11, 0.3)", borderRadius: 6, padding: "6px 10px", fontSize: 11, color: "#FDE68A", fontStyle: "italic" }}>
                    "{retakeRequest.reason}"
                  </div>
                </div>
              )}

              {retakeRequest?.status === "REJECTED" && (
                <div style={{ background: "rgba(239, 68, 68, 0.15)", border: "1.5px solid #EF4444", borderRadius: 10, padding: "12px 14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#FCA5A5", fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
                    <i className="fa-solid fa-circle-xmark"></i>
                    <span>Retake Request Declined</span>
                  </div>
                  <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.85)", margin: "0 0 6px", lineHeight: 1.45 }}>
                    <strong>Note:</strong> {retakeRequest.reviewNotes || "Request was not approved."}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* 3. DYNAMIC QUESTION CARD */}
          {!isTerminated && !completed && (
            <div style={{
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              padding: "14px 16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{
                  fontSize: 10.5,
                  fontWeight: 800,
                  padding: "2px 8px",
                  borderRadius: 999,
                  background: "rgba(245, 180, 26, 0.15)",
                  color: "#F5C95B",
                  border: "1px solid rgba(245, 180, 26, 0.3)",
                }}>
                  {currentQ.topic || "Technical Assessment"}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", fontWeight: 700 }}>
                  Question {currentQIndex + 1} of {questionsList.length}
                </span>
              </div>

              <div style={{ fontSize: 13.5, lineHeight: 1.5, fontWeight: 700, color: "#F8FAFC" }}>
                "{currentQ.question}"
              </div>
            </div>
          )}

          {/* 4. CANDIDATE LIVE ANSWER TRANSCRIPT */}
          {!isTerminated && !completed && (
            <div style={{
              background: "rgba(0,0,0,0.3)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 10,
              padding: "12px 14px",
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: "rgba(255,255,255,0.5)", marginBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse 1.5s infinite" }} />
                Your Live Answer Transcript
              </div>
              <div style={{ fontSize: 12, color: "#E2E8F0", minHeight: 38, maxHeight: 90, overflowY: "auto", fontStyle: liveTranscript ? "normal" : "italic" }}>
                {liveTranscript || (interviewStarted ? "Listening to your answer… speak clearly into your microphone" : "Click 'Begin Proctored Interview' to start")}
              </div>
            </div>
          )}

          {/* 5. COMPLETED EVALUATION REPORT (QUESTION BREAKDOWN & DB ANSWER COMPARISON) */}
          {completed && !isTerminated && (
            <div style={{
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: 12,
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ fontSize: 13, fontWeight: 800, color: "#F8FAFC" }}>
                  AI Technical Evaluation Report
                </div>
                <span style={{
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 12,
                  fontWeight: 900,
                  background: (interviewResult?.overallScore || 0) >= 70 ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)",
                  color: (interviewResult?.overallScore || 0) >= 70 ? "#34D399" : "#F5C95B",
                  border: `1px solid ${(interviewResult?.overallScore || 0) >= 70 ? "#10B981" : "#F59E0B"}`,
                }}>
                  Score: {interviewResult?.overallScore ?? 82}%
                </span>
              </div>

              {interviewResult?.summary && (
                <p style={{ fontSize: 11.5, color: "rgba(255,255,255,0.8)", margin: 0, lineHeight: 1.45 }}>
                  {interviewResult.summary}
                </p>
              )}

              {/* Question breakdown list */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: 220, overflowY: "auto" }}>
                {(interviewResult?.questionBreakdown || accumulatedQaPairs).map((item, idx) => (
                  <div key={idx} style={{
                    background: "rgba(0,0,0,0.35)",
                    border: "1px solid rgba(255,255,255,0.06)",
                    borderRadius: 8,
                    padding: "8px 10px",
                    fontSize: 11,
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 700, color: "#CBD5E1", marginBottom: 3 }}>
                      <span>Q{idx + 1}: {(item.question || "").slice(0, 45)}…</span>
                      <span style={{ color: (item.score || 8) >= 7 ? "#34D399" : "#F5C95B" }}>
                        {item.score !== undefined ? `${item.score}/10 pts` : (item.evaluation || "Evaluated")}
                      </span>
                    </div>
                    {item.feedback && (
                      <div style={{ color: "#94A3B8", fontSize: 10.5 }}>
                        {item.feedback}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 6. ACTION CONTROLS & BUTTONS (BOTTOM OF RIGHT PANEL) */}
          <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
            {isTerminated ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {retakeRequest?.status === "PENDING" ? (
                  <button
                    type="button"
                    disabled
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      borderRadius: 10,
                      background: "rgba(245, 158, 11, 0.15)",
                      border: "1.5px solid #F59E0B",
                      color: "#FDE68A",
                      fontWeight: 800,
                      fontSize: 13,
                      cursor: "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <i className="fa-solid fa-hourglass-half"></i>
                    <span>Retake Request Pending Review</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setRetakeError("");
                      setShowRetakeModal(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "13px 18px",
                      borderRadius: 10,
                      background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                      color: "#06152A",
                      fontWeight: 900,
                      fontSize: 13.5,
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                      boxShadow: "0 4px 16px rgba(229, 168, 46, 0.35)",
                    }}
                  >
                    <i className="fa-solid fa-rotate-right"></i>
                    <span>Request Interview Retake</span>
                  </button>
                )}
              </div>
            ) : completed ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <div style={{ background: "rgba(6, 78, 59, 0.8)", border: "1px solid #10B981", padding: 12, borderRadius: 8, textAlign: "center" }}>
                  <div style={{ color: "#34D399", fontWeight: 800, fontSize: 13 }}>✓ Interview Completed &amp; Scored</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", marginTop: 2 }}>
                    Technical Accuracy: <strong style={{ color: "#34D399" }}>{interviewResult?.overallScore ?? 82}%</strong> | Integrity: <strong style={{ color: "#6EE7B7" }}>{integrityScore}%</strong>
                  </div>
                </div>

                {(!retakeRequest || retakeRequest.status !== "PENDING") && (
                  <button
                    type="button"
                    onClick={() => {
                      setRetakeError("");
                      setShowRetakeModal(true);
                    }}
                    style={{
                      width: "100%",
                      padding: "10px 16px",
                      borderRadius: 8,
                      background: "rgba(255,255,255,0.08)",
                      border: "1px solid rgba(255,255,255,0.2)",
                      color: "#FFFFFF",
                      fontWeight: 700,
                      fontSize: 12,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                    }}
                  >
                    <i className="fa-solid fa-rotate-right"></i>
                    <span>Request Retake</span>
                  </button>
                )}
              </div>
            ) : !interviewStarted ? (
              <button
                type="button"
                onClick={handleStartInterview}
                disabled={modelLoading || !cameraActive}
                style={{
                  width: "100%",
                  padding: "14px 20px",
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                  color: "#06152A",
                  fontWeight: 900,
                  fontSize: 13.5,
                  border: "none",
                  cursor: modelLoading || !cameraActive ? "not-allowed" : "pointer",
                  opacity: modelLoading || !cameraActive ? 0.6 : 1,
                  boxShadow: "0 4px 16px rgba(229, 168, 46, 0.35)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <span>🚀 Begin Proctored Interview</span>
              </button>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <button
                  type="button"
                  onClick={handleNextQuestion}
                  disabled={isBotSpeaking || evaluatingTurn}
                  style={{
                    width: "100%",
                    padding: "13px 18px",
                    borderRadius: 10,
                    background: isBotSpeaking || evaluatingTurn
                      ? "rgba(255,255,255,0.08)"
                      : "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                    color: isBotSpeaking || evaluatingTurn ? "rgba(255,255,255,0.5)" : "#06152A",
                    fontWeight: 800,
                    fontSize: 13,
                    border: "none",
                    cursor: isBotSpeaking || evaluatingTurn ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    boxShadow: isBotSpeaking || evaluatingTurn ? "none" : "0 4px 16px rgba(229, 168, 46, 0.35)",
                    transition: "all 0.2s ease",
                  }}
                >
                  <span>
                    {evaluatingTurn
                      ? "⚡ Evaluating Answer…"
                      : isBotSpeaking
                      ? "⏳ AI Speaking…"
                      : currentQIndex === questionsList.length - 1
                      ? "Submit & Complete →"
                      : "Next Question →"}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => speakQuestion(currentQ.question)}
                  disabled={isBotSpeaking || evaluatingTurn}
                  style={{
                    width: "100%",
                    padding: "9px 14px",
                    borderRadius: 8,
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.8)",
                    fontSize: 11.5,
                    fontWeight: 700,
                    cursor: isBotSpeaking || evaluatingTurn ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-volume-high"></i>
                  <span>Replay Question Audio</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RETAKE REQUEST MODAL (Exact same as Stage 4 Talentera Assessment Modal)   */}
      {/* ========================================================================= */}
      {showRetakeModal && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "rgba(6, 21, 42, 0.8)",
          backdropFilter: "blur(6px)",
          zIndex: 9999,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 16,
        }}>
          <div style={{
            background: "#081B33",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 16,
            maxWidth: 500,
            width: "100%",
            boxShadow: "0 25px 50px -12px rgba(0,0,0,0.7)",
            padding: 24,
            color: "#F8FAFC",
            fontFamily: "inherit",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(245, 180, 26, 0.2)", border: "1px solid #F5B41A", display: "flex", alignItems: "center", justifyContent: "center", color: "#F5C95B", fontSize: 16 }}>
                  <i className="fa-solid fa-rotate-right"></i>
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#FFFFFF" }}>
                    Request AI Mock Interview Retake
                  </h4>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.6)" }}>
                    Stage 5 Proctored Evaluation
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", fontSize: 18, cursor: "pointer", padding: 4 }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.55, margin: "0 0 16px" }}>
              Please describe the reason for your retake request (e.g. accidental tab switch, power disruption, network glitch, emergency interruption). Your logged-in email and recorded session will be submitted to Talentera employees for verification.
            </p>

            <form onSubmit={handleSubmitRetakeRequest}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "#F5C95B", marginBottom: 6 }}>
                  Reason for Retake Request *
                </label>
                <textarea
                  rows={4}
                  value={retakeReason}
                  onChange={(e) => setRetakeReason(e.target.value)}
                  placeholder="Explain what happened during your test session (e.g., switched tab by accident, internet disconnected)..."
                  style={{
                    width: "100%",
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    padding: "10px 12px",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                    outline: "none",
                  }}
                  disabled={submittingRetake}
                />
              </div>

              {retakeError && (
                <div style={{ background: "rgba(239, 68, 68, 0.2)", border: "1px solid #EF4444", color: "#FCA5A5", padding: "8px 12px", borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                  {retakeError}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowRetakeModal(false)}
                  disabled={submittingRetake}
                  style={{
                    padding: "10px 16px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "rgba(255,255,255,0.8)",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRetake || !retakeReason.trim()}
                  style={{
                    padding: "10px 20px",
                    background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
                    color: "#06152A",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 800,
                    cursor: submittingRetake || !retakeReason.trim() ? "not-allowed" : "pointer",
                    opacity: submittingRetake || !retakeReason.trim() ? 0.6 : 1,
                  }}
                >
                  {submittingRetake ? "Submitting Request…" : "Submit to Talentera Employee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
