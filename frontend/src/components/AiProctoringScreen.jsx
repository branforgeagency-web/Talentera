import React, { useState, useEffect, useRef, useCallback } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  AlertTriangle,
  CheckCircle2,
  ShieldAlert,
  ShieldCheck,
  Eye,
  Camera,
  ChevronRight,
  ChevronLeft,
  Bot,
  Sparkles,
  Clock,
  Flag,
  RotateCcw,
  Activity,
  Maximize2,
  Volume2,
} from "lucide-react";

/**
 * AI Proctoring and Assessment Screen Component
 * 
 * Requirements implemented:
 * 1. Candidate webcam feed via navigator.mediaDevices.getUserMedia (mirrored scale-x-[-1]).
 * 2. Google MediaPipe @mediapipe/tasks-vision Face Landmarker via WebAssembly (FilesetResolver.forVisionTasks)
 *    running on-device inference with GPU delegate (CPU fallback).
 * 3. runningMode: 'VIDEO' in synchronized requestAnimationFrame loop.
 * 4. Facial landmark geometric ratios:
 *    - Yaw (Head Turn): Nose (1) to Left Cheek (234) vs Right Cheek (454).
 *      * Ratio < 0.45 (Turned Right) -> "⚠️ Please look directly at the screen"
 *      * Ratio > 2.20 (Turned Left)  -> "⚠️ Please look directly at the screen"
 *    - Pitch (Tilt Up/Down): Nose (1) to Forehead (10) vs Chin (152).
 *      * Ratio < 0.50 or > 2.20      -> "⚠️ Keep your gaze centered on the interview"
 *    - Empty landmarks:              -> "⚠️ Face not detected! Please stay centered in frame"
 * 5. Debounced warning banner overlay positioned over candidate camera feed with glowing red alert borders.
 * 6. Numeric attentionWarningsCount logging all infractions.
 * 7. Clean unmount stopping all camera stream tracks and canceling animation frames.
 * 8. Split screen layout:
 *    - Left Pane (70%): Big candidate webcam feed, live status indicator, mirrored horizontal video, glowing red warning banner overlay.
 *    - Right Pane (30%): AI Interviewer side-panel with bot avatar card, dynamic question block, Next Question button, and real-time proctoring telemetry pill.
 */

const MEDIAPIPE_WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MEDIAPIPE_MODEL_PATH = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Calibrated geometric ratio thresholds with reduced tolerance (stricter detection)
export const DEFAULT_PROCTOR_THRESHOLDS = {
  YAW_MIN: 0.58,   // Ratio < 0.58 (Turned Right) - reduced tolerance from 0.45
  YAW_MAX: 1.75,   // Ratio > 1.75 (Turned Left)  - reduced tolerance from 2.20
  PITCH_MIN: 0.62, // Ratio < 0.62 (Looking Up)   - reduced tolerance from 0.50
  PITCH_MAX: 1.75, // Ratio > 1.75 (Looking Down) - reduced tolerance from 2.20
  CONSECUTIVE_ANOMALIES: 3, // 3 consecutive anomalous frames (~50ms) to trigger warning
  CONSECUTIVE_NORMALS: 2,   // 2 consecutive normal frames to clear
};

export default function AiProctoringScreen({
  questions = [],
  candidateName = "Candidate",
  candidateRole = "Candidate",
  domainTitle = "Healthcare RCM Assessment",
  timeLimitSeconds = 20 * 60,
  onSubmit,
  onCancel,
  initialAnswers = {},
  thresholds = DEFAULT_PROCTOR_THRESHOLDS,
}) {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. REFS & CAMERA / MEDIAPIPE STATE
  // ──────────────────────────────────────────────────────────────────────────
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const landmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  const consecutiveAnomaliesRef = useRef(0);
  const consecutiveNormalsRef = useRef(0);
  const lastInfractionTimestampRef = useRef(0);

  // ──────────────────────────────────────────────────────────────────────────
  // 2. QUESTION & TIMER STATE
  // ──────────────────────────────────────────────────────────────────────────
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState(initialAnswers);
  const [flagged, setFlagged] = useState({});
  const [timeRemaining, setTimeRemaining] = useState(timeLimitSeconds);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const activeQuestion = questions[currentQuestionIndex] || null;

  // Synchronized State Tracking Refs for Instant Auto-Submit
  const answersRef = useRef(initialAnswers);
  const timeRemainingRef = useRef(timeLimitSeconds);
  const attentionWarningsCountRef = useRef(0);
  const tabSwitchCountRef = useRef(0);
  const isSubmittingRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    timeRemainingRef.current = timeRemaining;
  }, [timeRemaining]);

  // Component & Model Lifecycle
  const [modelLoading, setModelLoading] = useState(true);
  const [modelError, setModelError] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [delegateUsed, setDelegateUsed] = useState("GPU");

  // Telemetry & Proctoring Metrics
  const [attentionWarningsCount, setAttentionWarningsCount] = useState(0);
  const [isWarningActive, setIsWarningActive] = useState(false);
  const [currentWarningMessage, setCurrentWarningMessage] = useState("");
  const [activeAnomalyType, setActiveAnomalyType] = useState(null); // 'turned_left' | 'turned_right' | 'pitch' | 'no_face'
  const [yawRatio, setYawRatio] = useState(1.0);
  const [pitchRatio, setPitchRatio] = useState(1.0);
  const [currentPosture, setCurrentPosture] = useState("centered"); // 'centered' | 'turned_left' | 'turned_right' | 'looking_up' | 'looking_down' | 'no_face'

  // Tab-Switching & Focus Anti-Cheat
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [tabSwitchWarningActive, setTabSwitchWarningActive] = useState(false);

  // ──────────────────────────────────────────────────────────────────────────
  // 3. CAMERA SETUP
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: "user",
          },
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.onloadedmetadata = () => {
            videoRef.current?.play?.().catch((e) => console.warn("Video play interrupted:", e));
            setCameraActive(true);
          };
        }
      } catch (err) {
        console.error("Camera access error:", err);
        if (isMounted) {
          setCameraError(
            err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
              ? "Webcam permission denied. Please allow camera access for AI proctoring."
              : "Unable to access camera. Please verify video device connectivity."
          );
        }
      }
    }

    initCamera();

    return () => {
      isMounted = false;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 4. MEDIAPIPE FACE LANDMARKER (GPU DELEGATE + CPU FALLBACK)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isMounted = true;

    async function initFaceLandmarker() {
      try {
        setModelLoading(true);
        setModelError(null);

        // Load WASM files from CDN
        const filesetResolver = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM_PATH);

        let landmarker;
        try {
          // Primary: GPU Delegate
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MEDIAPIPE_MODEL_PATH,
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          if (isMounted) setDelegateUsed("GPU");
        } catch (gpuErr) {
          console.warn("GPU delegate initialization failed; falling back to CPU delegate:", gpuErr);
          // Fallback: CPU Delegate
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: MEDIAPIPE_MODEL_PATH,
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 1,
            minFaceDetectionConfidence: 0.5,
            minFacePresenceConfidence: 0.5,
            minTrackingConfidence: 0.5,
          });
          if (isMounted) setDelegateUsed("CPU (Fallback)");
        }

        if (!isMounted) {
          try {
            landmarker.close?.();
          } catch (e) {}
          return;
        }

        landmarkerRef.current = landmarker;
        setModelLoading(false);
      } catch (err) {
        console.error("MediaPipe initialization error:", err);
        if (isMounted) {
          setModelError("Failed to load AI Face Landmarker model. Assessment can continue in fallback mode.");
          setModelLoading(false);
        }
      }
    }

    initFaceLandmarker();

    return () => {
      isMounted = false;
      if (landmarkerRef.current) {
        try {
          landmarkerRef.current.close?.();
        } catch (e) {}
        landmarkerRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 5. SYNCHRONIZED DETECTION LOOP & GEOMETRIC GAZE EVALUATION
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let isRunning = true;

    function processVideoFrame() {
      if (!isRunning) return;

      const video = videoRef.current;
      const landmarker = landmarkerRef.current;

      if (video && landmarker && video.readyState >= 2 && video.videoWidth > 0 && !video.paused) {
        if (video.currentTime !== lastVideoTimeRef.current) {
          lastVideoTimeRef.current = video.currentTime;
          const timestampMs = performance.now();

          try {
            const results = landmarker.detectForVideo(video, timestampMs);
            const landmarks = results.faceLandmarks?.[0];

            if (!landmarks || landmarks.length === 0) {
              // Face Not Detected
              handleLandmarkEvaluation({
                anomaly: "no_face",
                warningText: "⚠️ Face not detected! Please stay centered in frame",
                posture: "no_face",
                yaw: 1.0,
                pitch: 1.0,
                hud: null,
              });
            } else {
              // Extract Key Facial Landmarks:
              // Landmark 1:   Nose Tip
              // Landmark 234: Left Cheek
              // Landmark 454: Right Cheek
              // Landmark 10:  Forehead
              // Landmark 152: Chin
              const nose = landmarks[1];
              const leftCheek = landmarks[234];
              const rightCheek = landmarks[454];
              const forehead = landmarks[10];
              const chin = landmarks[152];

              // Head Turn (Yaw): Compare horizontal distance from nose to left cheek vs right cheek
              const distToLeftCheek = Math.hypot(nose.x - leftCheek.x, nose.y - leftCheek.y);
              const distToRightCheek = Math.hypot(rightCheek.x - nose.x, rightCheek.y - nose.y);
              const calculatedYawRatio = distToLeftCheek / Math.max(0.0001, distToRightCheek);

              // Head Tilt / Looking Up/Down (Pitch): Compare distance from nose to forehead vs chin
              const distToForehead = Math.hypot(nose.x - forehead.x, nose.y - forehead.y);
              const distToChin = Math.hypot(chin.x - nose.x, chin.y - nose.y);
              const calculatedPitchRatio = distToForehead / Math.max(0.0001, distToChin);

              // Trigger warning conditions:
              // - Ratio < 0.45 (Turned Right): "⚠️ Please look directly at the screen"
              // - Ratio > 2.20 (Turned Left):  "⚠️ Please look directly at the screen"
              // - Vertical ratio out of range [0.5, 2.2]: "⚠️ Keep your gaze centered on the interview"
              let detectedAnomaly = null;
              let warningText = "";
              let detectedPosture = "centered";

              if (calculatedYawRatio < thresholds.YAW_MIN) {
                detectedAnomaly = "turned_right";
                detectedPosture = "turned_right";
                warningText = "⚠️ Please look directly at the screen";
              } else if (calculatedYawRatio > thresholds.YAW_MAX) {
                detectedAnomaly = "turned_left";
                detectedPosture = "turned_left";
                warningText = "⚠️ Please look directly at the screen";
              } else if (calculatedPitchRatio < thresholds.PITCH_MIN) {
                detectedAnomaly = "pitch_up";
                detectedPosture = "looking_up";
                warningText = "⚠️ Keep your gaze centered on the interview";
              } else if (calculatedPitchRatio > thresholds.PITCH_MAX) {
                detectedAnomaly = "pitch_down";
                detectedPosture = "looking_down";
                warningText = "⚠️ Keep your gaze centered on the interview";
              }

              handleLandmarkEvaluation({
                anomaly: detectedAnomaly,
                warningText,
                posture: detectedPosture,
                yaw: calculatedYawRatio,
                pitch: calculatedPitchRatio,
              });
            }
          } catch (inferErr) {
            console.warn("FaceLandmarker detection loop error:", inferErr);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(processVideoFrame);
    }

    animFrameRef.current = requestAnimationFrame(processVideoFrame);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 6. SAFE SUBMISSION HANDLER WITH AUTO-SUBMIT LOCK
  // ──────────────────────────────────────────────────────────────────────────
  const triggerSubmit = useCallback(
    async (reason = "Candidate Completed") => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setIsSubmitting(true);

      const isViolation =
        reason.includes("Violation") ||
        reason.includes("Tab Switch") ||
        reason.includes("5 Attention Warnings") ||
        reason.includes("10 Attention Warnings") ||
        reason.includes("Attention Warnings Exceeded");

      try {
        if (onSubmit) {
          await onSubmit({
            answers: { ...answers, ...answersRef.current },
            attentionWarningsCount: attentionWarningsCountRef.current,
            tabSwitchCount: tabSwitchCountRef.current,
            timeSpentSeconds: timeLimitSeconds - timeRemainingRef.current,
            submissionReason: reason,
            isAutoSubmitted: isViolation,
          });
        }
      } catch (err) {
        console.error("Submission failed in AiProctoringScreen:", err);
      } finally {
        isSubmittingRef.current = false;
        setIsSubmitting(false);
      }
    },
    [onSubmit, timeLimitSeconds]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 7. DEBOUNCED WARNING & INFRACTION LOGGING (AUTO-SUBMITS AT 5 WARNINGS)
  // ──────────────────────────────────────────────────────────────────────────
  const handleLandmarkEvaluation = useCallback(
    ({ anomaly, warningText, posture, yaw, pitch }) => {
      setYawRatio(yaw);
      setPitchRatio(pitch);
      setCurrentPosture(posture);

      if (anomaly) {
        // Increment consecutive anomalous frame count
        consecutiveAnomaliesRef.current += 1;
        consecutiveNormalsRef.current = 0;

        // Debounce trigger: require consecutive anomalous frames to eliminate instantaneous blinks
        if (consecutiveAnomaliesRef.current >= (thresholds.CONSECUTIVE_ANOMALIES || 3)) {
          setIsWarningActive(true);
          setCurrentWarningMessage(warningText);
          setActiveAnomalyType(anomaly);

          // Log infraction with a 3.5s cooldown so continuous turning counts as 1 infraction rather than flooding state
          const now = Date.now();
          if (now - lastInfractionTimestampRef.current > 3500) {
            lastInfractionTimestampRef.current = now;
            attentionWarningsCountRef.current += 1;
            const currentCount = attentionWarningsCountRef.current;
            setAttentionWarningsCount(currentCount);

            // User requirement: "make it as 5 warning to autosubmit"
            if (currentCount >= 5) {
              setIsWarningActive(true);
              setCurrentWarningMessage("🚨 PROCTOR VIOLATION: Maximum 5 Attention Warnings Exceeded! Auto-submitting assessment...");
              setTimeout(() => {
                triggerSubmit("Proctor Policy Violation: Maximum 5 Attention Warnings Exceeded");
              }, 400);
            }
          }
        }
      } else {
        // Normal alignment detected
        consecutiveNormalsRef.current += 1;

        // Require consecutive normal frames to clear the warning banner
        if (consecutiveNormalsRef.current >= (thresholds.CONSECUTIVE_NORMALS || 2)) {
          consecutiveAnomaliesRef.current = 0;
          setIsWarningActive(false);
          setCurrentWarningMessage("");
          setActiveAnomalyType(null);
        }
      }
    },
    [thresholds, triggerSubmit]
  );

  // ──────────────────────────────────────────────────────────────────────────
  // 8. TAB SWITCHING / FOCUS ANTI-CHEAT (INSTANT AUTO-SUBMIT ON TAB SWITCH)
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    function handleVisibility() {
      if (document.hidden) {
        tabSwitchCountRef.current += 1;
        setTabSwitchCount((c) => c + 1);
        attentionWarningsCountRef.current += 1;
        setAttentionWarningsCount(attentionWarningsCountRef.current);
        setTabSwitchWarningActive(true);
        setIsWarningActive(true);
        setCurrentWarningMessage("🚨 ANTI-CHEAT VIOLATION: Tab switch detected! Auto-submitting assessment...");
        
        // User requirement: "if tab swiched auto submit the asseesment"
        triggerSubmit("Anti-Cheat Policy Violation: Tab Switch Detected");
      }
    }

    function handleBlur() {
      setTabSwitchWarningActive(true);
    }

    function handleFocus() {
      setTimeout(() => {
        setTabSwitchWarningActive(false);
      }, 3000);
    }

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
    };
  }, [triggerSubmit]);

  // ──────────────────────────────────────────────────────────────────────────
  // 8. ASSESSMENT COUNTDOWN TIMER
  // ──────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          triggerSubmit("Time Expired");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  function formatTime(secs) {
    const mins = Math.floor(secs / 60);
    const remainder = secs % 60;
    return `${String(mins).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 9. QUESTION ANSWERING & SUBMISSION HANDLERS
  // ──────────────────────────────────────────────────────────────────────────
  function handleSelectOption(optIdx) {
    if (!activeQuestion) return;
    setAnswers((prev) => {
      const next = {
        ...prev,
        [activeQuestion.id]: optIdx,
      };
      answersRef.current = next;
      return next;
    });
  }

  function handleToggleFlag() {
    if (!activeQuestion) return;
    setFlagged((prev) => ({
      ...prev,
      [activeQuestion.id]: !prev[activeQuestion.id],
    }));
  }

  function handleNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  }

  function handlePrevQuestion() {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  }


  const answeredCount = Object.keys(answers).length;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;

  // ──────────────────────────────────────────────────────────────────────────
  // 10. RENDER COMPONENT
  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#020617",
        color: "#f8fafc",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        userSelect: "none",
        overflow: "hidden",
      }}
    >
      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* TOP STATUS BAR                                                       */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <header
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 24px",
          backgroundColor: "rgba(15, 23, 42, 0.95)",
          borderBottom: "1px solid #1e293b",
          backdropFilter: "blur(12px)",
          flexShrink: 0,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 36,
              height: 36,
              borderRadius: 8,
              background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
              color: "#0f172a",
              fontWeight: 900,
              fontSize: 18,
              boxShadow: "0 4px 12px rgba(245, 158, 11, 0.2)",
            }}
          >
            T
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: "0.5px", textTransform: "uppercase", color: "#ffffff" }}>
                Talentera Secure AI Assessment
              </span>
              <span
                style={{
                  padding: "2px 8px",
                  fontSize: 10,
                  fontWeight: 700,
                  borderRadius: 9999,
                  backgroundColor: "rgba(16, 185, 129, 0.2)",
                  color: "#34d399",
                  border: "1px solid rgba(16, 185, 129, 0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34d399" }} />
                Live Proctor
              </span>
            </div>
            <p style={{ fontSize: 11, color: "#94a3b8", margin: 0, marginTop: 2 }}>
              Stage 04 · {domainTitle} · Candidate: <strong style={{ color: "#e2e8f0" }}>{candidateName}</strong>
            </p>
          </div>
        </div>

        {/* Real-time Telemetry & Time Pill */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {/* Proctor Warnings Pill */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 10,
              border: attentionWarningsCount === 0
                ? "1px solid #334155"
                : attentionWarningsCount < 3
                ? "1px solid rgba(245, 158, 11, 0.5)"
                : "1.5px solid #ef4444",
              backgroundColor: attentionWarningsCount === 0
                ? "rgba(30, 41, 59, 0.8)"
                : attentionWarningsCount < 3
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(239, 68, 68, 0.2)",
              color: attentionWarningsCount === 0
                ? "#cbd5e1"
                : attentionWarningsCount < 3
                ? "#fcd34d"
                : "#fca5a5",
              fontSize: 12,
              fontWeight: 700,
              transition: "all 0.3s ease",
            }}
          >
            {attentionWarningsCount === 0 ? (
              <ShieldCheck style={{ width: 16, height: 16, color: "#34d399" }} />
            ) : (
              <ShieldAlert style={{ width: 16, height: 16, color: "#fbbf24" }} />
            )}
            <span>
              Telemetry Warnings: <strong style={{ fontFamily: "monospace", fontSize: 13.5 }}>{attentionWarningsCount} / 5</strong>
            </span>
          </div>

          {/* Countdown Clock */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 14px",
              borderRadius: 10,
              border: timeRemaining < 300 ? "1px solid #dc2626" : "1px solid #334155",
              backgroundColor: timeRemaining < 300 ? "rgba(127, 29, 29, 0.6)" : "rgba(30, 41, 59, 0.9)",
              color: timeRemaining < 300 ? "#fca5a5" : "#fbbf24",
              fontFamily: "monospace",
              fontSize: 13,
              fontWeight: 800,
            }}
          >
            <Clock style={{ width: 15, height: 15 }} />
            <span>{formatTime(timeRemaining)}</span>
          </div>

          {/* Exit / Cancel */}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              style={{
                padding: "6px 12px",
                fontSize: 11,
                fontWeight: 600,
                borderRadius: 8,
                backgroundColor: "#1e293b",
                color: "#cbd5e1",
                border: "none",
                cursor: "pointer",
              }}
            >
              Exit
            </button>
          )}
        </div>
      </header>

      {/* Tab switch anti-cheat warning banner */}
      {tabSwitchWarningActive && (
        <div
          style={{
            backgroundColor: "#dc2626",
            color: "#ffffff",
            padding: "8px 24px",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />
            <span>
              ANTI-CHEAT WARNING: Tab switch or window blur detected! Tab switch count: {tabSwitchCount}. Please keep this window active.
            </span>
          </div>
          <button
            type="button"
            onClick={() => setTabSwitchWarningActive(false)}
            style={{
              padding: "2px 8px",
              backgroundColor: "#ffffff",
              color: "#b91c1c",
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 800,
              border: "none",
              cursor: "pointer",
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* MAIN SPLIT-SCREEN LAYOUT: 70% LEFT PANE / 30% RIGHT PANE            */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "7fr 3fr",
          gap: 16,
          padding: 16,
          minHeight: 0,
          overflow: "hidden",
          backgroundColor: "#020617",
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEFT PANE (70%): BIG WEBCAM FEED & GLOWING RED PROCTOR OVERLAYS    */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            borderRadius: 16,
            overflow: "hidden",
            backgroundColor: "#0f172a",
            border: isWarningActive
              ? "3.5px solid #ef4444"
              : "1.5px solid rgba(51, 65, 85, 0.8)",
            boxShadow: isWarningActive
              ? "0 0 45px rgba(239, 68, 68, 0.85), inset 0 0 25px rgba(239, 68, 68, 0.35)"
              : "0 20px 40px rgba(0, 0, 0, 0.5)",
            transition: "all 0.25s ease",
          }}
        >
          {/* Main Video Viewport (Mirrored scale-x-[-1]) */}
          <div
            style={{
              position: "relative",
              flex: 1,
              width: "100%",
              height: "100%",
              minHeight: 380,
              backgroundColor: "#000000",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {/* Candidate Live Stream - Mirrored */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
              }}
            />

            {/* Video Fallback / Loading Overlay */}
            {(!cameraActive || cameraError) && (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: "rgba(2, 6, 23, 0.9)",
                  textAlign: "center",
                  padding: 24,
                  zIndex: 20,
                }}
              >
                <Camera style={{ width: 44, height: 44, color: "#64748b", marginBottom: 12 }} />
                <p style={{ fontSize: 14, fontWeight: 700, color: "#cbd5e1", margin: 0 }}>
                  {cameraError || "Initializing candidate camera feed..."}
                </p>
                <p style={{ fontSize: 12, color: "#64748b", marginTop: 4, maxWidth: 380 }}>
                  Please verify camera permissions in your browser to maintain real-time proctored status.
                </p>
              </div>
            )}


            {/* ────────────────────────────────────────────────────────────── */}
            {/* TOP OVERLAYS: Live Status Indicator & Telemetry                */}
            {/* ────────────────────────────────────────────────────────────── */}
            <div
              style={{
                position: "absolute",
                top: 14,
                left: 16,
                right: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                pointerEvents: "none",
                zIndex: 30,
              }}
            >
              {/* Live Status Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "6px 14px",
                  borderRadius: 12,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  backdropFilter: "blur(12px)",
                  border: isWarningActive ? "1.5px solid #f87171" : "1px solid rgba(51, 65, 85, 0.8)",
                  backgroundColor: isWarningActive ? "rgba(220, 38, 38, 0.95)" : "rgba(15, 23, 42, 0.85)",
                  color: isWarningActive ? "#ffffff" : "#34d399",
                  boxShadow: isWarningActive ? "0 4px 20px rgba(239, 68, 68, 0.6)" : "0 4px 12px rgba(0,0,0,0.3)",
                }}
              >
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: isWarningActive ? "#ffffff" : "#34d399",
                  }}
                />
                <span>{isWarningActive ? "ATTENTION ALERT" : "LIVE PROCTOR ACTIVE"}</span>
              </div>

              {/* Model & Posture Telemetry Pill */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  backgroundColor: "rgba(15, 23, 42, 0.85)",
                  backdropFilter: "blur(12px)",
                  padding: "6px 12px",
                  borderRadius: 12,
                  border: "1px solid rgba(51, 65, 85, 0.8)",
                  fontSize: 11,
                  fontFamily: "monospace",
                  color: "#cbd5e1",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.25)",
                }}
              >
                <Activity style={{ width: 14, height: 14, color: "#38bdf8" }} />
                <span>Posture:</span>
                <span
                  style={{
                    fontWeight: 700,
                    textTransform: "capitalize",
                    color: currentPosture === "centered" ? "#34d399" : "#fcd34d",
                  }}
                >
                  {currentPosture.replace("_", " ")}
                </span>
                <span style={{ color: "#475569" }}>|</span>
                <span>Yaw: <strong style={{ color: "#ffffff" }}>{yawRatio.toFixed(2)}</strong></span>
                <span style={{ color: "#475569" }}>|</span>
                <span>Pitch: <strong style={{ color: "#ffffff" }}>{pitchRatio.toFixed(2)}</strong></span>
              </div>
            </div>

            {/* ────────────────────────────────────────────────────────────── */}
            {/* ATTENTION WARNING BANNER OVERLAY (DEBOUNCED & GLOWING RED)     */}
            {/* ────────────────────────────────────────────────────────────── */}
            {isWarningActive && (
              <div
                style={{
                  position: "absolute",
                  left: 20,
                  right: 20,
                  top: 70,
                  zIndex: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    maxWidth: 560,
                    background: "linear-gradient(135deg, rgba(220, 38, 38, 0.98), rgba(185, 28, 28, 0.98))",
                    color: "#ffffff",
                    padding: "14px 20px",
                    borderRadius: 14,
                    border: "2px solid #fca5a5",
                    boxShadow: "0 0 35px rgba(239, 68, 68, 0.9), 0 8px 24px rgba(0,0,0,0.5)",
                    display: "flex",
                    alignItems: "center",
                    gap: 16,
                    backdropFilter: "blur(14px)",
                  }}
                >
                  <div
                    style={{
                      width: 44,
                      height: 44,
                      borderRadius: 10,
                      backgroundColor: "rgba(255, 255, 255, 0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <AlertTriangle style={{ width: 26, height: 26, color: "#ffffff" }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          padding: "2px 6px",
                          borderRadius: 4,
                          backgroundColor: "rgba(0, 0, 0, 0.4)",
                          fontSize: 10,
                          fontWeight: 900,
                          textTransform: "uppercase",
                          color: "#fde68a",
                        }}
                      >
                        Proctor Violation
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: "#fee2e2" }}>
                        Infraction #{attentionWarningsCount}
                      </span>
                    </div>
                    <p style={{ fontSize: 14.5, fontWeight: 800, margin: "3px 0 0", color: "#ffffff", letterSpacing: "0.2px" }}>
                      {currentWarningMessage || "⚠️ Please keep your gaze centered on the screen"}
                    </p>
                    <p style={{ fontSize: 11, color: "#fee2e2", margin: "2px 0 0", opacity: 0.9 }}>
                      Head turns, tilting away, or leaving the camera frame are strictly recorded in proctor audit telemetry.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom-left Candidate Badge */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                left: 16,
                zIndex: 30,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 8,
                backgroundColor: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(12px)",
                padding: "6px 12px",
                borderRadius: 10,
                border: "1px solid #1e293b",
                fontSize: 11.5,
              }}
            >
              <div style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#34d399" }} />
              <div style={{ color: "#cbd5e1", fontWeight: 600 }}>
                {candidateName} <span style={{ color: "#64748b" }}>({candidateRole})</span>
              </div>
              <span style={{ color: "#475569" }}>·</span>
              <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "monospace" }}>
                Delegate: {delegateUsed}
              </span>
            </div>

            {/* Bottom-right Camera REC Badge */}
            <div
              style={{
                position: "absolute",
                bottom: 14,
                right: 16,
                zIndex: 30,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(12px)",
                padding: "5px 10px",
                borderRadius: 8,
                border: "1px solid #1e293b",
                fontSize: 11,
                fontFamily: "monospace",
                color: "#f87171",
                fontWeight: 700,
              }}
            >
              <span style={{ width: 7, height: 7, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              <span>REC 720p HD</span>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT PANE (30%): AI INTERVIEWER & DYNAMIC QUESTION PANEL          */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderRadius: 16,
            backgroundColor: "#0f172a",
            border: "1.5px solid rgba(51, 65, 85, 0.8)",
            padding: 18,
            overflowY: "auto",
          }}
        >
          {/* AI INTERVIEWER BOT CARD */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              borderRadius: 12,
              backgroundColor: "rgba(30, 41, 59, 0.7)",
              border: "1px solid rgba(51, 65, 85, 0.7)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
            }}
          >
            <div
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                color: "#0f172a",
                boxShadow: "0 4px 12px rgba(245, 158, 11, 0.3)",
                flexShrink: 0,
              }}
            >
              <Bot style={{ width: 22, height: 22 }} />
              <span
                style={{
                  position: "absolute",
                  top: -2,
                  right: -2,
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: "#10b981",
                  border: "2px solid #0f172a",
                }}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <h4 style={{ margin: 0, fontSize: 12, fontWeight: 800, textTransform: "uppercase", color: "#ffffff", letterSpacing: "0.5px" }}>
                  Talentera AI Proctor
                </h4>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: "#fbbf24",
                    padding: "2px 6px",
                    borderRadius: 4,
                    backgroundColor: "rgba(245, 158, 11, 0.15)",
                    border: "1px solid rgba(245, 158, 11, 0.3)",
                  }}
                >
                  Active
                </span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "#94a3b8" }}>
                Real-time vision &amp; telemetry proctor
              </p>
            </div>
          </div>

          {/* DYNAMIC QUESTION CARD */}
          {activeQuestion ? (
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                borderRadius: 12,
                backgroundColor: "rgba(2, 6, 23, 0.6)",
                border: "1px solid rgba(30, 41, 59, 0.9)",
                padding: 16,
              }}
            >
              <div>
                {/* Question Header & Flagging */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        backgroundColor: "rgba(245, 158, 11, 0.2)",
                        border: "1px solid rgba(245, 158, 11, 0.4)",
                        color: "#fbbf24",
                        fontSize: 11,
                        fontWeight: 800,
                      }}
                    >
                      Q {currentQuestionIndex + 1} of {questions.length}
                    </span>
                    <span style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 130 }}>
                      {activeQuestion.topic || activeQuestion.section || domainTitle}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={handleToggleFlag}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "4px 8px",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 700,
                      border: flagged[activeQuestion.id]
                        ? "1px solid rgba(245, 158, 11, 0.5)"
                        : "1px solid #334155",
                      backgroundColor: flagged[activeQuestion.id]
                        ? "rgba(245, 158, 11, 0.2)"
                        : "#1e293b",
                      color: flagged[activeQuestion.id] ? "#fbbf24" : "#94a3b8",
                      cursor: "pointer",
                    }}
                  >
                    <Flag style={{ width: 12, height: 12 }} />
                    <span>{flagged[activeQuestion.id] ? "Flagged" : "Flag"}</span>
                  </button>
                </div>

                {/* Question Text */}
                <h3
                  style={{
                    fontSize: 13.5,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.45,
                    marginBottom: 16,
                    marginTop: 0,
                  }}
                >
                  {activeQuestion.question}
                </h3>

                {/* Question Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {activeQuestion.options?.map((option, idx) => {
                    const isSelected = answers[activeQuestion.id] === idx;
                    const optionLetter = String.fromCharCode(65 + idx);

                    return (
                      <div
                        key={idx}
                        onClick={() => handleSelectOption(idx)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: isSelected
                            ? "1.5px solid #fbbf24"
                            : "1px solid #1e293b",
                          backgroundColor: isSelected
                            ? "rgba(245, 158, 11, 0.18)"
                            : "rgba(15, 23, 42, 0.8)",
                          color: isSelected ? "#ffffff" : "#cbd5e1",
                          fontSize: 12,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            width: 22,
                            height: 22,
                            borderRadius: "50%",
                            fontSize: 11,
                            fontWeight: 800,
                            flexShrink: 0,
                            backgroundColor: isSelected ? "#fbbf24" : "#1e293b",
                            color: isSelected ? "#0f172a" : "#94a3b8",
                          }}
                        >
                          {optionLetter}
                        </div>
                        <div style={{ flex: 1, fontWeight: isSelected ? 600 : 400, lineHeight: 1.4 }}>
                          {option}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Navigation & Submit Controls */}
              <div
                style={{
                  marginTop: 18,
                  paddingTop: 14,
                  borderTop: "1px solid #1e293b",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 8,
                }}
              >
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 12px",
                    borderRadius: 8,
                    backgroundColor: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: 11.5,
                    fontWeight: 600,
                    border: "none",
                    cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                    opacity: currentQuestionIndex === 0 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft style={{ width: 14, height: 14 }} />
                  <span>Previous</span>
                </button>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={() => triggerSubmit("Voluntary Candidate Final Submit")}
                    disabled={isSubmitting}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #10b981, #0d9488)",
                      color: "#020617",
                      fontSize: 12,
                      fontWeight: 800,
                      border: "none",
                      cursor: isSubmitting ? "wait" : "pointer",
                      boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
                    }}
                  >
                    <CheckCircle2 style={{ width: 15, height: 15 }} />
                    <span>{isSubmitting ? "Submitting..." : "Submit Assessment"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleNextQuestion}
                    style={{
                      flex: 1,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "8px 16px",
                      borderRadius: 8,
                      background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                      color: "#0f172a",
                      fontSize: 12,
                      fontWeight: 800,
                      border: "none",
                      cursor: "pointer",
                      boxShadow: "0 4px 12px rgba(245, 158, 11, 0.25)",
                    }}
                  >
                    <span>Next Question</span>
                    <ChevronRight style={{ width: 15, height: 15 }} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "#64748b" }}>
              No questions available.
            </div>
          )}

          {/* QUESTION PALETTE / NAVIGATION MAP */}
          <div
            style={{
              borderRadius: 12,
              backgroundColor: "rgba(2, 6, 23, 0.6)",
              border: "1px solid rgba(30, 41, 59, 0.9)",
              padding: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                Question Palette
              </span>
              <span style={{ fontSize: 11, color: "#fbbf24", fontFamily: "monospace" }}>
                {answeredCount} / {questions.length} answered
              </span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = answers[q.id] !== undefined;
                const isFlag = flagged[q.id];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    style={{
                      aspectRatio: "1/1",
                      borderRadius: 6,
                      fontSize: 11,
                      fontWeight: 800,
                      border: isCurrent
                        ? "2px solid #fbbf24"
                        : isAnswered
                        ? "1px solid rgba(16, 185, 129, 0.6)"
                        : isFlag
                        ? "1px solid rgba(245, 158, 11, 0.6)"
                        : "none",
                      backgroundColor: isCurrent
                        ? "#f59e0b"
                        : isAnswered
                        ? "rgba(16, 185, 129, 0.25)"
                        : isFlag
                        ? "rgba(245, 158, 11, 0.25)"
                        : "#1e293b",
                      color: isCurrent
                        ? "#0f172a"
                        : isAnswered
                        ? "#34d399"
                        : isFlag
                        ? "#fbbf24"
                        : "#94a3b8",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>

        </aside>
      </div>

    </div>
  );
}
