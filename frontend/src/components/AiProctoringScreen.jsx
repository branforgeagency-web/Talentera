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
import { createMotionDetector, detectBackgroundMotion } from "../utils/proctorMotionDetector";

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

// Calibrated geometric ratio thresholds with increased tolerance for left/right head turn
export const DEFAULT_PROCTOR_THRESHOLDS = {
  YAW_MIN: 0.44,   // Ratio < 0.44 (Turned Right) - reverted to original, moderate tolerance
  YAW_MAX: 2.66,   // Ratio > 2.66 (Turned Left)  - a bit more liberal than the original 2.28
  PITCH_MIN: 0.62, // Ratio < 0.62 (Looking Up)   - kept as is
  PITCH_MAX: 1.75, // Ratio > 1.75 (Looking Down) - kept as is
  CONSECUTIVE_ANOMALIES: 3, // 3 consecutive anomalous frames (~50ms) to trigger warning
  CONSECUTIVE_NORMALS: 2,   // 2 consecutive normal frames to clear
  MIN_WARNING_DISPLAY_MS: 2500, // Warning banner stays visible at least this long, even if posture corrects immediately
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
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const landmarkerRef = useRef(null);
  const lastVideoTimeRef = useRef(-1);

  const consecutiveAnomaliesRef = useRef(0);
  const consecutiveNormalsRef = useRef(0);
  const lastInfractionTimestampRef = useRef(0);
  const warningShownAtRef = useRef(0); // timestamp the warning banner last became visible - used to enforce a minimum on-screen duration

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
  const [activeAnomalyType, setActiveAnomalyType] = useState(null); // 'turned_left' | 'turned_right' | 'pitch' | 'no_face' | 'multiple_faces' | 'background_movement'
  const [yawRatio, setYawRatio] = useState(1.0);
  const [pitchRatio, setPitchRatio] = useState(1.0);
  const [currentPosture, setCurrentPosture] = useState("centered"); // 'centered' | 'turned_left' | 'turned_right' | 'looking_up' | 'looking_down' | 'no_face' | 'multiple_faces' | 'bg_movement'
  const [bgMovementActive, setBgMovementActive] = useState(false);
  const [faceCountVal, setFaceCountVal] = useState(1);
  const motionDetectorRef = useRef(null);
  const audioContextRef = useRef(null);

  useEffect(() => {
    motionDetectorRef.current = createMotionDetector({
      width: 120,
      height: 90,
      checkIntervalMs: 80,
      lumaDiffThreshold: 26,
      motionRatioThreshold: 0.035,
      minPixelsThreshold: 140,
    });
  }, []);

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
            numFaces: 4,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
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
            numFaces: 4,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
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
            const faceLandmarksList = results.faceLandmarks || [];
            const faceCount = faceLandmarksList.length;
            setFaceCountVal(faceCount);

            let detectedAnomaly = null;
            let warningText = "";
            let detectedPosture = "centered";
            let calculatedYawRatio = 1.0;
            let calculatedPitchRatio = 1.0;

            // 1. STRICT SINGLE PERSON RULE: Exactly 1 person allowed in the frame
            if (faceCount === 0) {
              detectedAnomaly = "no_face";
              warningText = "⚠️ Candidate face not detected! Only 1 person is allowed in the frame";
              detectedPosture = "no_face";
            } else if (faceCount > 1) {
              detectedAnomaly = "multiple_faces";
              warningText = `🚨 Multiple persons detected (${faceCount})! Only 1 person is allowed in the assessment`;
              detectedPosture = "multiple_faces";
            } else {
              const landmarks = faceLandmarksList[0];
              const nose = landmarks[1];
              const leftCheek = landmarks[234];
              const rightCheek = landmarks[454];
              const forehead = landmarks[10];
              const chin = landmarks[152];

              // Head Turn (Yaw): Compare horizontal distance from nose to left cheek vs right cheek
              const distToLeftCheek = Math.hypot(nose.x - leftCheek.x, nose.y - leftCheek.y);
              const distToRightCheek = Math.hypot(rightCheek.x - nose.x, rightCheek.y - nose.y);
              calculatedYawRatio = distToLeftCheek / Math.max(0.0001, distToRightCheek);

              // Head Tilt / Looking Up/Down (Pitch): Compare distance from nose to forehead vs chin
              const distToForehead = Math.hypot(nose.x - forehead.x, nose.y - forehead.y);
              const distToChin = Math.hypot(chin.x - nose.x, chin.y - nose.y);
              calculatedPitchRatio = distToForehead / Math.max(0.0001, distToChin);

              // Trigger warning conditions:
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
                warningText = "⚠️ Keep your gaze centered on the assessment";
              } else if (calculatedPitchRatio > thresholds.PITCH_MAX) {
                detectedAnomaly = "pitch_down";
                detectedPosture = "looking_down";
                warningText = "⚠️ Keep your gaze centered on the assessment";
              }
            }

            // 2. STRICT BACKGROUND STILLNESS RULE: No movement allowed in the background
            const motionResult = detectBackgroundMotion(
              motionDetectorRef.current,
              video,
              faceCount > 0 ? faceLandmarksList[0] : null
            );

            setBgMovementActive(motionResult.isMotionDetected);

            // If background motion is active, trigger proctoring warning
            if (motionResult.isMotionDetected) {
              if (!detectedAnomaly || detectedAnomaly === "pitch_up" || detectedAnomaly === "pitch_down") {
                detectedAnomaly = "background_movement";
                warningText = "🚨 Background movement / person detected! Background must remain completely still — only 1 person permitted.";
                detectedPosture = "bg_movement";
              }
            }

            handleLandmarkEvaluation({
              anomaly: detectedAnomaly,
              warningText,
              posture: detectedPosture,
              yaw: calculatedYawRatio,
              pitch: calculatedPitchRatio,
            });

            // Real-time Visual Facial Landmark Tracking Dots & Boundary Canvas Render
            const canvas = canvasRef.current;
            if (canvas) {
              const dWidth = video.videoWidth || 640;
              const dHeight = video.videoHeight || 480;
              if (canvas.width !== dWidth || canvas.height !== dHeight) {
                canvas.width = dWidth;
                canvas.height = dHeight;
              }
              const ctx = canvas.getContext("2d");
              ctx.clearRect(0, 0, canvas.width, canvas.height);

              // Visual Red Perimeter Alert when Background Movement is Detected
              if (motionResult.isMotionDetected) {
                ctx.save();
                ctx.strokeStyle = "rgba(239, 68, 68, 0.9)";
                ctx.lineWidth = 6;
                ctx.strokeRect(0, 0, canvas.width, canvas.height);

                ctx.fillStyle = "rgba(220, 38, 38, 0.9)";
                ctx.fillRect(canvas.width / 2 - 190, 16, 380, 32);
                ctx.fillStyle = "#ffffff";
                ctx.font = "bold 12px sans-serif";
                ctx.textAlign = "center";
                ctx.fillText("🚨 ALERT: BACKGROUND MOVEMENT / PERSON DETECTED", canvas.width / 2, 37);
                ctx.restore();
              }

              if (faceCount > 0) {
                faceLandmarksList.forEach((face, fIdx) => {
                  const isPrimary = fIdx === 0;

                  // Label extra person if detected
                  if (!isPrimary) {
                    const foreheadPt = face[10];
                    if (foreheadPt) {
                      ctx.save();
                      ctx.font = "bold 13px sans-serif";
                      ctx.fillStyle = "#ef4444";
                      ctx.shadowColor = "rgba(0,0,0,0.9)";
                      ctx.shadowBlur = 4;
                      ctx.fillText(`🚨 UNAUTHORIZED PERSON #${fIdx + 1}`, foreheadPt.x * canvas.width - 60, Math.max(20, foreheadPt.y * canvas.height - 12));
                      ctx.restore();
                    }
                  }
                });
              }
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

  const playAlertTone = useCallback(() => {
    try {
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (AudioCtx) audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx && ctx.state === "suspended") {
        ctx.resume().catch(() => {});
      }
      if (ctx && ctx.state === "running") {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(587.33, ctx.currentTime);
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.28);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.3);
      }
    } catch (e) {}
  }, []);

  // ──────────────────────────────────────────────────────────────────────────
  // 7. DEBOUNCED WARNING & INFRACTION LOGGING (AUTO-SUBMITS AT 10 WARNINGS)
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

        // Debounce trigger: require consecutive anomalous frames (fast 2-frame trigger for multiple faces and background movement)
        const requiredFrames = (anomaly === "multiple_faces" || anomaly === "background_movement") ? 2 : (thresholds.CONSECUTIVE_ANOMALIES || 3);
        if (consecutiveAnomaliesRef.current >= requiredFrames) {
          if (consecutiveAnomaliesRef.current === requiredFrames) {
            warningShownAtRef.current = Date.now();
          }
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
            playAlertTone();

            // Increased tolerance for natural movement/distraction - auto-submit
            // only after 10 logged attention warnings (was 5).
            if (currentCount >= 10) {
              setIsWarningActive(true);
              setCurrentWarningMessage("🚨 PROCTOR VIOLATION: Maximum 10 Attention Warnings Exceeded! Auto-submitting assessment...");
              setTimeout(() => {
                triggerSubmit("Proctor Policy Violation: Maximum 10 Attention Warnings Exceeded");
              }, 400);
            }
          }
        }
      } else {
        // Normal alignment detected
        consecutiveNormalsRef.current += 1;

        // Require consecutive normal frames AND a minimum on-screen duration
        // before clearing the warning banner, so it stays readable a bit
        // longer instead of flashing away the instant posture corrects.
        const heldLongEnough = Date.now() - warningShownAtRef.current >= (thresholds.MIN_WARNING_DISPLAY_MS || 0);
        if (consecutiveNormalsRef.current >= (thresholds.CONSECUTIVE_NORMALS || 2) && heldLongEnough) {
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
                : attentionWarningsCount < 6
                ? "1px solid rgba(245, 158, 11, 0.5)"
                : "1.5px solid #ef4444",
              backgroundColor: attentionWarningsCount === 0
                ? "rgba(30, 41, 59, 0.8)"
                : attentionWarningsCount < 6
                ? "rgba(245, 158, 11, 0.15)"
                : "rgba(239, 68, 68, 0.2)",
              color: attentionWarningsCount === 0
                ? "#cbd5e1"
                : attentionWarningsCount < 6
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
              Telemetry Warnings: <strong style={{ fontFamily: "monospace", fontSize: 13.5 }}>{attentionWarningsCount} / 10</strong>
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
      {/* MAIN SPLIT-SCREEN LAYOUT: 60% LEFT PANE (QUESTIONS) / 40% RIGHT PANE (CAMERA & TABS) */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateColumns: "6fr 4fr",
          gap: 16,
          padding: 16,
          minHeight: 0,
          overflow: "hidden",
          backgroundColor: "#020617",
        }}
      >
        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* LEFT PANE (60%): QUESTION, OPTIONS, NEXT & SUBMIT BUTTONS         */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <section
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRadius: 16,
            backgroundColor: "#0f172a",
            border: "1.5px solid rgba(51, 65, 85, 0.8)",
            padding: 24,
            overflowY: "auto",
            minHeight: 0,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          {activeQuestion ? (
            <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              {/* Question Header & Flagging */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  marginBottom: 16,
                  paddingBottom: 14,
                  borderBottom: "1px solid rgba(51, 65, 85, 0.6)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span
                    style={{
                      padding: "4px 12px",
                      borderRadius: 8,
                      backgroundColor: "rgba(245, 158, 11, 0.2)",
                      border: "1.5px solid rgba(245, 158, 11, 0.5)",
                      color: "#fbbf24",
                      fontSize: 12,
                      fontWeight: 800,
                      letterSpacing: "0.4px",
                    }}
                  >
                    Question {currentQuestionIndex + 1} of {questions.length}
                  </span>
                  <span
                    style={{
                      padding: "4px 10px",
                      borderRadius: 8,
                      backgroundColor: "rgba(30, 41, 59, 0.8)",
                      border: "1px solid #334155",
                      fontSize: 12,
                      color: "#94a3b8",
                      fontWeight: 600,
                    }}
                  >
                    {activeQuestion.topic || activeQuestion.section || domainTitle}
                  </span>
                  {answers[activeQuestion.id] !== undefined && (
                    <span
                      style={{
                        padding: "3px 8px",
                        borderRadius: 6,
                        backgroundColor: "rgba(16, 185, 129, 0.2)",
                        color: "#34d399",
                        fontSize: 11,
                        fontWeight: 700,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      <CheckCircle2 style={{ width: 13, height: 13 }} />
                      Answered
                    </span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleToggleFlag}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontSize: 12,
                    fontWeight: 700,
                    border: flagged[activeQuestion.id]
                      ? "1.5px solid rgba(245, 158, 11, 0.6)"
                      : "1px solid #334155",
                    backgroundColor: flagged[activeQuestion.id]
                      ? "rgba(245, 158, 11, 0.25)"
                      : "#1e293b",
                    color: flagged[activeQuestion.id] ? "#fbbf24" : "#94a3b8",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <Flag style={{ width: 14, height: 14 }} />
                  <span>{flagged[activeQuestion.id] ? "Flagged for Review" : "Flag Question"}</span>
                </button>
              </div>

              {/* Question Text */}
              <div style={{ marginBottom: 20 }}>
                <h3
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "#ffffff",
                    lineHeight: 1.55,
                    margin: 0,
                    letterSpacing: "0.2px",
                  }}
                >
                  {activeQuestion.question}
                </h3>
              </div>

              {/* Question Options */}
              <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
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
                        gap: 14,
                        padding: "14px 16px",
                        borderRadius: 12,
                        border: isSelected
                          ? "2px solid #fbbf24"
                          : "1.5px solid rgba(51, 65, 85, 0.8)",
                        backgroundColor: isSelected
                          ? "rgba(245, 158, 11, 0.16)"
                          : "rgba(15, 23, 42, 0.7)",
                        color: isSelected ? "#ffffff" : "#cbd5e1",
                        fontSize: 13.5,
                        cursor: "pointer",
                        transition: "all 0.15s ease",
                        boxShadow: isSelected ? "0 4px 16px rgba(245, 158, 11, 0.12)" : "none",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          width: 28,
                          height: 28,
                          borderRadius: "50%",
                          fontSize: 12.5,
                          fontWeight: 800,
                          flexShrink: 0,
                          backgroundColor: isSelected ? "#fbbf24" : "#1e293b",
                          color: isSelected ? "#0f172a" : "#94a3b8",
                          border: isSelected ? "none" : "1px solid #475569",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {optionLetter}
                      </div>
                      <div style={{ flex: 1, fontWeight: isSelected ? 600 : 400, lineHeight: 1.5, paddingTop: 3 }}>
                        {option}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons: Previous, Next Question, and Submit Assessment */}
              <div
                style={{
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: "1px solid rgba(51, 65, 85, 0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                {/* Previous Button */}
                <button
                  type="button"
                  onClick={handlePrevQuestion}
                  disabled={currentQuestionIndex === 0}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "10px 18px",
                    borderRadius: 10,
                    backgroundColor: "#1e293b",
                    color: "#cbd5e1",
                    fontSize: 13,
                    fontWeight: 700,
                    border: "1px solid #334155",
                    cursor: currentQuestionIndex === 0 ? "not-allowed" : "pointer",
                    opacity: currentQuestionIndex === 0 ? 0.35 : 1,
                    transition: "all 0.15s ease",
                  }}
                >
                  <ChevronLeft style={{ width: 16, height: 16 }} />
                  <span>Previous</span>
                </button>

                {/* Right-aligned Next & Submit Buttons */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {!isLastQuestion && (
                    <button
                      type="button"
                      onClick={handleNextQuestion}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "10px 22px",
                        borderRadius: 10,
                        background: "linear-gradient(135deg, #f59e0b, #fbbf24)",
                        color: "#0f172a",
                        fontSize: 13,
                        fontWeight: 800,
                        border: "none",
                        cursor: "pointer",
                        boxShadow: "0 4px 14px rgba(245, 158, 11, 0.3)",
                        transition: "all 0.15s ease",
                      }}
                    >
                      <span>Next Question</span>
                      <ChevronRight style={{ width: 16, height: 16 }} />
                    </button>
                  )}

                  {/* Submit Assessment Button */}
                  <button
                    type="button"
                    onClick={() => triggerSubmit("Voluntary Candidate Final Submit")}
                    disabled={isSubmitting}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 7,
                      padding: "10px 22px",
                      borderRadius: 10,
                      background: isLastQuestion
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "linear-gradient(135deg, #059669, #047857)",
                      color: "#ffffff",
                      fontSize: 13,
                      fontWeight: 800,
                      border: "none",
                      cursor: isSubmitting ? "wait" : "pointer",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.35)",
                      transition: "all 0.15s ease",
                    }}
                  >
                    <CheckCircle2 style={{ width: 16, height: 16 }} />
                    <span>{isSubmitting ? "Submitting..." : isLastQuestion ? "Submit Assessment" : "Submit Test"}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#64748b" }}>
              No questions available.
            </div>
          )}
        </section>

        {/* ══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT PANE (40%): CAMERA SCREEN & QUESTION NUMBER TABS             */}
        {/* ══════════════════════════════════════════════════════════════════ */}
        <aside
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 14,
            borderRadius: 16,
            backgroundColor: "#0f172a",
            border: "1.5px solid rgba(51, 65, 85, 0.8)",
            padding: 16,
            overflowY: "auto",
            minHeight: 0,
            boxShadow: "0 10px 30px rgba(0, 0, 0, 0.4)",
          }}
        >
          {/* CAMERA FEED (PROCTOR MONITOR) */}
          <div
            style={{
              position: "relative",
              width: "100%",
              height: 240,
              minHeight: 220,
              borderRadius: 14,
              overflow: "hidden",
              backgroundColor: "#000000",
              border: isWarningActive
                ? "3.5px solid #ef4444"
                : "1.5px solid rgba(51, 65, 85, 0.8)",
              boxShadow: isWarningActive
                ? "0 0 35px rgba(239, 68, 68, 0.85), inset 0 0 20px rgba(239, 68, 68, 0.35)"
                : "0 8px 24px rgba(0, 0, 0, 0.5)",
              transition: "all 0.25s ease",
              flexShrink: 0,
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

            {/* Real-time Facial Landmark Tracking Dots Canvas Overlay */}
            <canvas
              ref={canvasRef}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                pointerEvents: "none",
                zIndex: 15,
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
                  padding: 16,
                  zIndex: 20,
                }}
              >
                <Camera style={{ width: 36, height: 36, color: "#64748b", marginBottom: 8 }} />
                <p style={{ fontSize: 12.5, fontWeight: 700, color: "#cbd5e1", margin: 0 }}>
                  {cameraError || "Initializing candidate camera feed..."}
                </p>
                <p style={{ fontSize: 11, color: "#64748b", marginTop: 4, maxWidth: 300 }}>
                  Please verify camera permissions to maintain proctored status.
                </p>
              </div>
            )}

            {/* Top HUD: Live Status Pill & Posture Telemetry */}
            <div
              style={{
                position: "absolute",
                top: 10,
                left: 12,
                right: 12,
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
                  gap: 6,
                  padding: "4px 10px",
                  borderRadius: 10,
                  fontSize: 10,
                  fontWeight: 800,
                  letterSpacing: "0.5px",
                  textTransform: "uppercase",
                  backdropFilter: "blur(12px)",
                  border: isWarningActive ? "1.5px solid #f87171" : "1px solid rgba(51, 65, 85, 0.8)",
                  backgroundColor: isWarningActive ? "rgba(220, 38, 38, 0.95)" : "rgba(15, 23, 42, 0.85)",
                  color: isWarningActive ? "#ffffff" : "#34d399",
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    backgroundColor: isWarningActive ? "#ffffff" : "#34d399",
                  }}
                />
                <span>{isWarningActive ? "ATTENTION" : "LIVE PROCTOR"}</span>
              </div>

              {/* Multi-Telemetry Pills: 1-Person Security, Background Stillness & Posture */}
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {/* 1 Person Verified Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(12px)",
                    padding: "4px 8px",
                    borderRadius: 10,
                    border: `1px solid ${faceCountVal > 1 ? "#ef4444" : faceCountVal === 0 ? "#f59e0b" : "rgba(52, 211, 153, 0.4)"}`,
                    fontSize: 10,
                    fontWeight: 800,
                    color: faceCountVal > 1 ? "#ef4444" : faceCountVal === 0 ? "#fcd34d" : "#34d399",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: faceCountVal > 1 ? "#ef4444" : faceCountVal === 0 ? "#f59e0b" : "#34d399" }} />
                  <span>{faceCountVal > 1 ? "🚨 MULTIPLE PERSONS" : faceCountVal === 0 ? "⚠️ NO PERSON" : "👤 1 PERSON"}</span>
                </div>

                {/* Background Movement Stillness Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(12px)",
                    padding: "4px 8px",
                    borderRadius: 10,
                    border: `1px solid ${bgMovementActive ? "#ef4444" : "rgba(52, 211, 153, 0.4)"}`,
                    fontSize: 10,
                    fontWeight: 800,
                    color: bgMovementActive ? "#ef4444" : "#34d399",
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: bgMovementActive ? "#ef4444" : "#34d399" }} />
                  <span>{bgMovementActive ? "🚨 BG MOTION / PERSON" : "🛡️ BG STILL"}</span>
                </div>

                {/* Posture Telemetry Pill */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: "rgba(15, 23, 42, 0.85)",
                    backdropFilter: "blur(12px)",
                    padding: "4px 8px",
                    borderRadius: 10,
                    border: "1px solid rgba(51, 65, 85, 0.8)",
                    fontSize: 10,
                    fontFamily: "monospace",
                    color: "#cbd5e1",
                  }}
                >
                  <Activity style={{ width: 12, height: 12, color: currentPosture === "multiple_faces" || currentPosture === "bg_movement" ? "#ef4444" : "#38bdf8" }} />
                  <span style={{ color: currentPosture === "centered" ? "#34d399" : currentPosture === "multiple_faces" || currentPosture === "bg_movement" ? "#ef4444" : "#fcd34d", fontWeight: 700 }}>
                    {currentPosture === "multiple_faces"
                      ? "MULTIPLE PERSONS"
                      : currentPosture === "bg_movement"
                      ? "BG MOTION / PERSON"
                      : currentPosture.replace("_", " ")}
                  </span>
                  {currentPosture !== "multiple_faces" && currentPosture !== "bg_movement" && (
                    <>
                      <span style={{ color: "#475569" }}>|</span>
                      <span>Y: {yawRatio.toFixed(2)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Glowing Red Warning Overlay */}
            {isWarningActive && (
              <div
                style={{
                  position: "absolute",
                  left: 12,
                  right: 12,
                  top: 50,
                  zIndex: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <div
                  style={{
                    width: "100%",
                    background: "linear-gradient(135deg, rgba(220, 38, 38, 0.98), rgba(185, 28, 28, 0.98))",
                    color: "#ffffff",
                    padding: "10px 14px",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(239, 68, 68, 0.7)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <AlertTriangle style={{ width: 22, height: 22, color: "#ffffff", flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 9.5, fontWeight: 900, textTransform: "uppercase", color: "#fde68a" }}>
                      Warning #{attentionWarningsCount} / 10
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 800, margin: "2px 0 0", color: "#ffffff" }}>
                      {currentWarningMessage || "⚠️ Please keep your gaze centered"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Bottom-left Candidate Badge */}
            <div
              style={{
                position: "absolute",
                bottom: 10,
                left: 12,
                zIndex: 30,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                backgroundColor: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(12px)",
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #1e293b",
                fontSize: 10.5,
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#34d399" }} />
              <div style={{ color: "#cbd5e1", fontWeight: 600 }}>
                {candidateName}
              </div>
            </div>

            {/* Bottom-right Camera REC Badge */}
            <div
              style={{
                position: "absolute",
                bottom: 10,
                right: 12,
                zIndex: 30,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                gap: 5,
                backgroundColor: "rgba(2, 6, 23, 0.85)",
                backdropFilter: "blur(12px)",
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid #1e293b",
                fontSize: 10,
                fontFamily: "monospace",
                color: "#f87171",
                fontWeight: 700,
              }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#ef4444" }} />
              <span>REC</span>
            </div>
          </div>

          {/* NUMBER OF QUESTIONS TABS (QUESTION PALETTE) */}
          <div
            style={{
              borderRadius: 12,
              backgroundColor: "rgba(2, 6, 23, 0.7)",
              border: "1px solid rgba(30, 41, 59, 0.9)",
              padding: 14,
              flex: 1,
              display: "flex",
              flexDirection: "column",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#cbd5e1", textTransform: "uppercase", letterSpacing: "0.6px" }}>
                Questions Navigator
              </span>
              <span style={{ fontSize: 11, color: "#fbbf24", fontWeight: 700, fontFamily: "monospace" }}>
                {answeredCount} / {questions.length} answered
              </span>
            </div>

            {/* Grid of question number tabs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 8,
                maxHeight: 240,
                overflowY: "auto",
                paddingRight: 2,
              }}
            >
              {questions.map((q, idx) => {
                const isCurrent = idx === currentQuestionIndex;
                const isAnswered = answers[q.id] !== undefined;
                const isFlag = flagged[q.id];

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCurrentQuestionIndex(idx)}
                    title={`Question ${idx + 1}${isAnswered ? " (Answered)" : ""}${isFlag ? " (Flagged)" : ""}`}
                    style={{
                      height: 38,
                      borderRadius: 8,
                      fontSize: 12,
                      fontWeight: 800,
                      border: isCurrent
                        ? "2px solid #fbbf24"
                        : isAnswered
                        ? "1.5px solid rgba(16, 185, 129, 0.7)"
                        : isFlag
                        ? "1.5px solid rgba(245, 158, 11, 0.7)"
                        : "1px solid rgba(51, 65, 85, 0.6)",
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
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      position: "relative",
                    }}
                  >
                    <span>{idx + 1}</span>
                    {isFlag && !isCurrent && (
                      <span
                        style={{
                          position: "absolute",
                          top: 2,
                          right: 2,
                          width: 5,
                          height: 5,
                          borderRadius: "50%",
                          backgroundColor: "#f59e0b",
                        }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Question status legend */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginTop: 14,
                paddingTop: 10,
                borderTop: "1px dashed rgba(51, 65, 85, 0.7)",
                fontSize: 10.5,
                color: "#94a3b8",
                flexWrap: "wrap",
                gap: 6,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#34d399" }} />
                <span>Answered</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                <span>Current</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#fbbf24" }} />
                <span>Flagged</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#475569" }} />
                <span>Pending</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

    </div>
  );
}
