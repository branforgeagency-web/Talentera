import React, { useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";
import Vapi from "@vapi-ai/web";
import api from "../api/client";
import { useToast } from "./Toast.jsx";
import { createMotionDetector, detectBackgroundMotion } from "../utils/proctorMotionDetector";

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
  incorrect: { label: "Review Recommended", color: "#B91C1C", bg: "#FEE2E2" },
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
  const isInterview = size === "interview";
  const containerWidth = isInterview ? "100%" : isCompact ? "160px" : "240px";
  const containerHeight = isInterview ? "180px" : isCompact ? "140px" : "190px";

  return (
    <div
      className="interviewer-video-wrap"
      style={{
        position: "relative",
        width: containerWidth,
        height: containerHeight,
        borderRadius: isCompact ? 14 : 16,
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
            JESSY ASKING
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
            JESSY (AI INTERVIEWER)
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

  // Candidate's own camera + mic preview.
  const candidateVideoRef = useRef(null);
  const candidateCanvasRef = useRef(null);
  const candidateStreamRef = useRef(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState("");

  // AI Proctoring & Malpractice Detection States
  const [proctorStatus, setProctorStatus] = useState("ok"); // "ok" | "head_turned" | "looking_away" | "no_face" | "multiple_faces" | "tab_switch" | "background_movement"
  const [proctorAlertMsg, setProctorAlertMsg] = useState("");
  const [isMalpracticeActive, setIsMalpracticeActive] = useState(false);
  const [proctorViolationsCount, setProctorViolationsCount] = useState(0);
  const [attentionWarningsCount, setAttentionWarningsCount] = useState(0);
  const [yawRatioVal, setYawRatioVal] = useState(1.0);
  const [pitchRatioVal, setPitchRatioVal] = useState(1.0);
  const [gazePosture, setGazePosture] = useState("centered"); // "centered" | "turned_left" | "turned_right" | "looking_up" | "looking_down" | "away" | "multiple_faces" | "bg_movement"
  const [facialLandmarks, setFacialLandmarks] = useState(null); // { leftCheek, rightCheek, forehead, chin, nose, leftEye, rightEye, mouth }
  const [bgMovementActive, setBgMovementActive] = useState(false);
  const [faceCountVal, setFaceCountVal] = useState(1);
  const motionDetectorRef = useRef(null);
  const landmarkerRef = useRef(null);
  const animFrameRef = useRef(null);
  const proctorConsecutiveAnomaliesRef = useRef(0);
  const proctorConsecutiveNormalsRef = useRef(0);
  const lastToastTimeRef = useRef(0);
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

  // Continuous MediaPipe FaceLandmarker Proctoring Monitor Loop:
  // Runs on-device GPU inference using requestAnimationFrame
  // Detection Logic:
  // - Head Turn (Yaw): Horizontal distance from nose tip (1) to left cheek (234) vs right cheek (454)
  //   - Ratio < 0.45 (Turned Right): "⚠️ Please look directly at the screen"
  //   - Ratio > 2.20 (Turned Left): "⚠️ Please look directly at the screen"
  // - Head Tilt (Pitch): Distance from nose tip (1) to forehead (10) vs chin (152)
  //   - Vertical ratio out of [0.50, 2.20]: "⚠️ Keep your gaze centered on the interview"
  // - Empty Landmarks: "⚠️ Face not detected! Please stay centered in frame"
  useEffect(() => {
    if (step !== "interview" || !cameraReady) {
      setIsMalpracticeActive(false);
      setProctorStatus("ok");
      return;
    }

    let isRunning = true;
    let faceLandmarkerInstance = null;
    let lastVideoTime = -1;

    async function initMediaPipe() {
      try {
        const filesetResolver = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        let landmarker;
        try {
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "GPU",
            },
            runningMode: "VIDEO",
            numFaces: 4,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        } catch (gpuErr) {
          console.warn("GPU delegate failed, falling back to CPU delegate:", gpuErr);
          landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
            baseOptions: {
              modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
              delegate: "CPU",
            },
            runningMode: "VIDEO",
            numFaces: 4,
            minFaceDetectionConfidence: 0.45,
            minFacePresenceConfidence: 0.45,
            minTrackingConfidence: 0.45,
          });
        }
        if (!isRunning) {
          try { landmarker.close?.(); } catch (e) {}
          return;
        }
        faceLandmarkerInstance = landmarker;
        landmarkerRef.current = landmarker;
        startDetectionLoop();
      } catch (err) {
        console.error("Failed to initialize MediaPipe FaceLandmarker:", err);
      }
    }

    function startDetectionLoop() {
      function processFrame() {
        if (!isRunning) return;
        const video = candidateVideoRef.current;
        if (video && video.readyState >= 2 && video.videoWidth > 0) {
          if (video.currentTime !== lastVideoTime && faceLandmarkerInstance) {
            lastVideoTime = video.currentTime;
            const startTimeMs = performance.now();
            try {
              const result = faceLandmarkerInstance.detectForVideo(video, startTimeMs);
              const faceLandmarksList = result.faceLandmarks || [];
              const faceCount = faceLandmarksList.length;
              setFaceCountVal(faceCount);

              let detectedIssue = null;
              let posture = "centered";
              let alertText = "";

              // 1. STRICT SINGLE PERSON RULE: Exactly 1 person allowed in the frame
              if (faceCount === 0) {
                detectedIssue = "no_face";
                alertText = "⚠️ Candidate face not detected! Only 1 person is allowed in the frame";
                posture = "away";
              } else if (faceCount > 1) {
                detectedIssue = "multiple_faces";
                alertText = `🚨 Multiple persons detected in frame (${faceCount})! Only 1 person is allowed in the interview`;
                posture = "multiple_faces";
              } else {
                const landmarks = faceLandmarksList[0];
                const nose = landmarks[1];
                const forehead = landmarks[10];
                const chin = landmarks[152];
                const leftCheek = landmarks[234];
                const rightCheek = landmarks[454];
                const leftEye = landmarks[33];
                const rightEye = landmarks[263];
                const mouth = landmarks[13];

                const distToLeftCheek = Math.hypot(nose.x - leftCheek.x, nose.y - leftCheek.y);
                const distToRightCheek = Math.hypot(rightCheek.x - nose.x, rightCheek.y - nose.y);
                const yawRatio = distToLeftCheek / Math.max(0.0001, distToRightCheek);

                const distToForehead = Math.hypot(nose.x - forehead.x, nose.y - forehead.y);
                const distToChin = Math.hypot(chin.x - nose.x, chin.y - nose.y);
                const pitchRatio = distToForehead / Math.max(0.0001, distToChin);

                setYawRatioVal(yawRatio);
                setPitchRatioVal(pitchRatio);

                if (yawRatio < 0.58) {
                  detectedIssue = "head_turned";
                  posture = "turned_right";
                  alertText = "⚠️ Please look directly at the screen";
                } else if (yawRatio > 1.75) {
                  detectedIssue = "head_turned";
                  posture = "turned_left";
                  alertText = "⚠️ Please look directly at the screen";
                } else if (pitchRatio < 0.62 || pitchRatio > 1.75) {
                  detectedIssue = pitchRatio < 0.62 ? "looking_up" : "looking_down";
                  posture = detectedIssue;
                  alertText = "⚠️ Keep your gaze centered on the interview";
                }
              }

              // 2. STRICT BACKGROUND STILLNESS RULE: No movement allowed in the background
              const motionResult = detectBackgroundMotion(
                motionDetectorRef.current,
                video,
                faceCount > 0 ? faceLandmarksList[0] : null
              );

              setBgMovementActive(motionResult.isMotionDetected);

              if (motionResult.isMotionDetected) {
                if (!detectedIssue || detectedIssue === "looking_up" || detectedIssue === "looking_down") {
                  detectedIssue = "background_movement";
                  alertText = "🚨 Background movement / person detected! Background must remain completely still — only 1 person permitted.";
                  posture = "bg_movement";
                }
              }

              handleDetectionResult({
                issue: detectedIssue,
                alertText,
                posture,
                landmarks: faceCount > 0 ? {
                  nose: { x: (1 - faceLandmarksList[0][1].x) * 100, y: faceLandmarksList[0][1].y * 100 },
                  forehead: { x: (1 - faceLandmarksList[0][10].x) * 100, y: faceLandmarksList[0][10].y * 100 },
                  chin: { x: (1 - faceLandmarksList[0][152].x) * 100, y: faceLandmarksList[0][152].y * 100 },
                  leftCheek: { x: (1 - faceLandmarksList[0][234].x) * 100, y: faceLandmarksList[0][234].y * 100 },
                  rightCheek: { x: (1 - faceLandmarksList[0][454].x) * 100, y: faceLandmarksList[0][454].y * 100 },
                  leftEye: { x: (1 - faceLandmarksList[0][33].x) * 100, y: faceLandmarksList[0][33].y * 100 },
                  rightEye: { x: (1 - faceLandmarksList[0][263].x) * 100, y: faceLandmarksList[0][263].y * 100 },
                  mouth: { x: (1 - faceLandmarksList[0][13].x) * 100, y: faceLandmarksList[0][13].y * 100 },
                } : null,
              });

              // Real-time Visual Facial Landmark Tracking Dots & Boundary Canvas Render
              const canvas = candidateCanvasRef.current;
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
            } catch (evalErr) {
              console.warn("FaceLandmarker eval error:", evalErr);
            }
          }
        }
        animFrameRef.current = requestAnimationFrame(processFrame);
      }
      animFrameRef.current = requestAnimationFrame(processFrame);
    }

    function handleDetectionResult({ issue, alertText, posture, landmarks }) {
      setGazePosture(posture);
      setFacialLandmarks(landmarks);

      if (issue) {
        proctorConsecutiveAnomaliesRef.current += 1;
        proctorConsecutiveNormalsRef.current = 0;

        const requiredFrames = (issue === "multiple_faces" || issue === "background_movement") ? 2 : 4;
        if (proctorConsecutiveAnomaliesRef.current >= requiredFrames) {
          setIsMalpracticeActive(true);
          setProctorStatus(issue);
          setProctorAlertMsg(alertText);

          const now = Date.now();
          if (now - lastToastTimeRef.current > 4000) {
            lastToastTimeRef.current = now;
            setAttentionWarningsCount((c) => c + 1);
            setProctorViolationsCount((c) => c + 1);
            toast(alertText, "!");
          }
        }
      } else {
        proctorConsecutiveNormalsRef.current += 1;
        if (proctorConsecutiveNormalsRef.current >= 2) {
          proctorConsecutiveAnomaliesRef.current = 0;
          setIsMalpracticeActive(false);
          setProctorStatus("ok");
          setProctorAlertMsg("");
        }
      }
    }

    initMediaPipe();

    // Anti-Cheat Tab Switching & Window Blur listeners (Silent visual warnings only)
    function handleVisibilityChange() {
      if (document.hidden) {
        setIsMalpracticeActive(true);
        setProctorStatus("tab_switch");
        setProctorAlertMsg("🚨 MALPRACTICE VIOLATION: Tab switch detected!");
        setAttentionWarningsCount((c) => c + 1);
        setProctorViolationsCount((c) => c + 1);
        toast("🚨 Malpractice Alert: Tab switching is prohibited!", "!");
      }
    }

    function handleWindowBlur() {
      setIsMalpracticeActive(true);
      setProctorStatus("tab_switch");
      setProctorAlertMsg("🚨 MALPRACTICE WARNING: Window focus lost!");
    }

    function handleWindowFocus() {
      setTimeout(() => {
        setIsMalpracticeActive(false);
        setProctorStatus("ok");
        setProctorAlertMsg("");
      }, 1000);
    }

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleWindowBlur);
    window.addEventListener("focus", handleWindowFocus);

    return () => {
      isRunning = false;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (faceLandmarkerInstance) {
        try {
          faceLandmarkerInstance.close?.();
        } catch (e) {}
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleWindowBlur);
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [step, cameraReady]);

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
  // question - starts the 30s inactivity countdown
  function openAnswerWindow() {
    liveInterimRef.current = "";
    setLiveInterim("");
    lastSpeechAtRef.current = 0;
    stoppingAnswerRef.current = false;
    setLoadingTurn(false);
    startInactivityCountdown();
  }

  // Advances the interview for typed, skipped, and auto-advance turns
  async function advanceViaRest(text) {
    if (loadingTurn) return;
    clearInactivityTimer();
    setIsWaitingForAnswerStart(false);
    setHasStartedAnswering(false);
    stoppingAnswerRef.current = false;
    isSwitchingCallRef.current = true;

    const finalAnswer = (text || "").trim() || (inputText || "").trim() || "(no answer)";
    setTranscript((prev) => [...prev, { speaker: "you", text: finalAnswer }]);
    setLiveInterim("");
    liveInterimRef.current = "";
    setLoadingTurn(true);

    try {
      if (vapiRef.current) {
        vapiRef.current.stop();
      }
    } catch (e) {}

    // Allow Daily.co WebRTC peer connections and audio tracks to cleanly release
    await new Promise((resolve) => setTimeout(resolve, 800));

    const authToken = localStorage.getItem("talentera_token");
    const currentQIdx = sessionRef.current?.currentQuestionIndex ?? session?.currentQuestionIndex ?? 0;

    try {
      const res = await api.post("/candidate/ai-interview/turn", {
        candidateUtterance: finalAnswer,
        expectedQuestionIndex: currentQIdx,
      });
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
    const answer = (inputText || "").trim() || "(no answer)";
    advanceViaRest(answer);
  }

  function handleTextChange(val) {
    setInputText(val);
    if (val.trim()) {
      markAnswerStarted(); // User started typing! Cancel 30s timer
    }
  }

  // Typed-answer fallback for when a candidate's mic isn't cooperating.
  function handleTextSubmit(e) {
    if (e) e.preventDefault();
    const text = (inputText || "").trim();
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
          clearInactivityTimer();
          setIsListening(false);
          setIsWaitingForAnswerStart(false);
          setLoadingTurn(false);
          setStep("report");
          stopCandidateCamera();
          const finalResult = s.result;
          if (typeof finalResult?.overallScore === "number" && onCompleted) {
            onCompleted({ score: finalResult.overallScore });
          }
          toast(`Mock interview completed! Score: ${finalResult?.overallScore ?? "-"} / 100`, "✓");
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
      // Interviewer has started speaking.
      setIsSpeaking(true);
      clearInactivityTimer();
      setIsWaitingForAnswerStart(false);
    });

    vapi.on("speech-end", () => {
      setIsSpeaking(false);
      // Only open answer window if interview is still in progress AND we haven't answered all questions
      const currentS = sessionRef.current;
      const totalQ = currentS?.questions?.length || 5;
      const answeredQ = currentS?.questionRecords?.length || 0;
      if (currentS?.status === "IN_PROGRESS" && answeredQ < totalQ) {
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
            setLoadingTurn(true);
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

      {/* 3. LIVE INTERVIEW SCREEN (70% Candidate Camera & AI Proctor / 30% Interviewer & Telemetry) */}
      {step === "interview" && (
        <div style={{ width: "100%", background: "#06152A", color: "#F8FAFC", display: "flex", flexDirection: "column" }}>
          {/* Question Indicator & Breadcrumbs Top Header */}
          <div style={{ background: "#0B192C", borderBottom: "1px solid #1E293B", padding: "16px 24px" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ background: "#F5B41A", color: "#0A1F3D", fontSize: 12, fontWeight: 900, padding: "4px 12px", borderRadius: 8, textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Question {currentQNumber} / {totalQuestions}
                </span>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#94A3B8" }}>
                  ({remainingQuestions === 0 ? "Final Question" : `${remainingQuestions} remaining`})
                </span>
              </div>

              {/* Live Inactivity Countdown Pill */}
              {isWaitingForAnswerStart && (
                <div
                  style={{
                    padding: "4px 14px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 800,
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.3s",
                    background: inactivitySecondsLeft <= 2 ? "rgba(239, 68, 68, 0.2)" : "rgba(245, 180, 26, 0.15)",
                    color: inactivitySecondsLeft <= 2 ? "#EF4444" : "#F5B41A",
                    border: `1px solid ${inactivitySecondsLeft <= 2 ? "#EF4444" : "rgba(245, 180, 26, 0.4)"}`,
                  }}
                >
                  <i className="fa-solid fa-stopwatch"></i>
                  <span>Start answering within: <strong style={{ color: "#FFFFFF" }}>{inactivitySecondsLeft}s</strong></span>
                </div>
              )}

              {hasStartedAnswering && (
                <div style={{ background: "rgba(16, 185, 129, 0.15)", color: "#34D399", border: "1px solid rgba(16, 185, 129, 0.4)", padding: "4px 14px", borderRadius: 999, fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
                  <i className="fa-solid fa-microphone" style={{ color: "#34D399" }}></i>
                  <span>Answering Question {currentQNumber}…</span>
                </div>
              )}
            </div>

            {/* Step Breadcrumbs */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
              {(session?.questions && session.questions.length > 0 ? session.questions : TOPIC_CONFIG).map((topic, idx) => {
                const isPassed = idx < currentQIndex;
                const isCurrent = idx === currentQIndex;
                const label = topic.topicLabel || topic.label || `Q${idx + 1}`;
                const key = topic.topic || topic.key || `Q${idx + 1}`;

                return (
                  <div
                    key={topic.id || topic.key || idx}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 8,
                      textAlign: "center",
                      fontSize: 11,
                      fontWeight: isCurrent ? 900 : 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      transition: "all 0.2s",
                      background: isCurrent ? "#F5B41A" : isPassed ? "rgba(16, 185, 129, 0.15)" : "#1E293B",
                      color: isCurrent ? "#0A1F3D" : isPassed ? "#34D399" : "#64748B",
                      border: isCurrent ? "1px solid #F5B41A" : isPassed ? "1px solid rgba(16, 185, 129, 0.3)" : "1px solid #334155",
                      boxShadow: isCurrent ? "0 2px 8px rgba(245, 180, 26, 0.3)" : "none",
                    }}
                    title={label}
                  >
                    {isPassed ? (
                      <i className="fa-solid fa-check" style={{ fontSize: 10 }}></i>
                    ) : (
                      <span style={{ fontSize: 10 }}>{idx + 1}.</span>
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{key}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AUTO-ADVANCE NOTICE BANNER */}
          {autoAdvanceNotice && (
            <div style={{ background: "rgba(153, 27, 27, 0.95)", borderBottom: "1px solid #DC2626", padding: "10px 24px", color: "#FCA5A5", fontSize: 12, fontWeight: 800, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-circle-exclamation" style={{ color: "#F87171" }}></i>
              <span>{autoAdvanceNotice}</span>
            </div>
          )}

          {/* MAIN SPLIT-SCREEN CONTAINER (70% Candidate Video Proctoring / 30% AI Interviewer & Chat) */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20, padding: 24, background: "#06152A", alignItems: "stretch" }}>
            {/* ===================== LEFT PANE: 70% ===================== */}
            <div style={{ flex: "1 1 580px", minWidth: 320, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Candidate Webcam Feed Container */}
              <div
                style={{
                  position: "relative",
                  width: "100%",
                  height: 480,
                  borderRadius: 16,
                  overflow: "hidden",
                  background: "#0B192C",
                  border: isMalpracticeActive ? "3px solid #EF4444" : "2px solid #1E293B",
                  boxShadow: isMalpracticeActive ? "0 0 35px rgba(239, 68, 68, 0.6)" : "0 12px 30px rgba(0,0,0,0.4)",
                  transition: "all 0.3s ease",
                }}
              >
                {/* Mirrored candidate camera feed */}
                <video
                  ref={candidateVideoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    display: cameraReady ? "block" : "none",
                  }}
                />

                {/* Real-time Facial Landmark Tracking Dots Canvas Overlay */}
                <canvas
                  ref={candidateCanvasRef}
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    transform: "scaleX(-1)",
                    pointerEvents: "none",
                    zIndex: 15,
                    display: cameraReady ? "block" : "none",
                  }}
                />

                {!cameraReady && (
                  <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", color: "#94A3B8", padding: 24, background: "#0B192C" }}>
                    <i className="fa-solid fa-video-slash" style={{ fontSize: 32, marginBottom: 12, color: "#64748B" }}></i>
                    <p style={{ fontSize: 13, fontWeight: 700, margin: 0 }}>{cameraError || "Initializing proctored camera feed…"}</p>
                  </div>
                )}

                {/* Top-Left Live Proctoring Indicator */}
                {cameraReady && (
                  <div style={{ position: "absolute", top: 14, left: 14, zIndex: 20, display: "flex", alignItems: "center", gap: 6, background: "rgba(220, 38, 38, 0.95)", color: "#FFFFFF", fontSize: 11, fontWeight: 900, padding: "5px 12px", borderRadius: 999, boxShadow: "0 4px 12px rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#FFFFFF", display: "inline-block" }}></span>
                    <span>LIVE · PROCTORING</span>
                  </div>
                )}

                {/* Top-Right Multi-Telemetry Pills: 1-Person Security, Background Stillness & Posture */}
                {cameraReady && (
                  <div style={{ position: "absolute", top: 14, right: 14, zIndex: 20, display: "flex", alignItems: "center", gap: 6 }}>
                    {/* 1 Person Verified Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: "5px 10px",
                        borderRadius: 999,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        border: `1px solid ${faceCountVal > 1 ? "#EF4444" : faceCountVal === 0 ? "#F59E0B" : "rgba(52, 211, 153, 0.4)"}`,
                        fontSize: 11,
                        fontWeight: 800,
                        color: faceCountVal > 1 ? "#EF4444" : faceCountVal === 0 ? "#FCD34D" : "#34D399",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: faceCountVal > 1 ? "#EF4444" : faceCountVal === 0 ? "#F59E0B" : "#34D399" }} />
                      <span>{faceCountVal > 1 ? "🚨 MULTIPLE PERSONS" : faceCountVal === 0 ? "⚠️ NO PERSON" : "👤 1 PERSON"}</span>
                    </div>

                    {/* Background Movement Stillness Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        backgroundColor: "rgba(15, 23, 42, 0.9)",
                        padding: "5px 10px",
                        borderRadius: 999,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        border: `1px solid ${bgMovementActive ? "#EF4444" : "rgba(52, 211, 153, 0.4)"}`,
                        fontSize: 11,
                        fontWeight: 800,
                        color: bgMovementActive ? "#EF4444" : "#34D399",
                      }}
                    >
                      <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: bgMovementActive ? "#EF4444" : "#34D399" }} />
                      <span>{bgMovementActive ? "🚨 BG MOTION / PERSON" : "🛡️ BG STILL"}</span>
                    </div>

                    {/* Posture Pill */}
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontSize: 11,
                        fontWeight: 800,
                        padding: "5px 12px",
                        borderRadius: 999,
                        boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                        background: isMalpracticeActive ? "rgba(239, 68, 68, 0.95)" : "rgba(15, 23, 42, 0.9)",
                        color: isMalpracticeActive ? "#FFFFFF" : "#34D399",
                        border: `1px solid ${isMalpracticeActive ? "#FCA5A5" : "rgba(52, 211, 153, 0.4)"}`,
                      }}
                    >
                      <i className={`fa-solid ${isMalpracticeActive ? "fa-triangle-exclamation" : "fa-shield-halved"}`} style={{ color: isMalpracticeActive ? "#FEF08A" : "#34D399" }}></i>
                      <span>
                        {isMalpracticeActive
                          ? gazePosture === "turned_left"
                            ? "TURNED LEFT"
                            : gazePosture === "turned_right"
                            ? "TURNED RIGHT"
                            : gazePosture === "looking_up"
                            ? "LOOKING UP"
                            : gazePosture === "looking_down"
                            ? "LOOKING DOWN"
                            : gazePosture === "away"
                            ? "NO FACE DETECTED"
                            : gazePosture === "multiple_faces"
                            ? "MULTIPLE PERSONS"
                            : gazePosture === "bg_movement"
                            ? "BG MOTION / PERSON"
                            : "OFF CENTER"
                          : "GAZE CENTERED ✓"}
                      </span>
                    </div>
                  </div>
                )}

                {/* Debounced Warning Banner Overlay (Positioned over candidate camera feed) */}
                {isMalpracticeActive && (
                  <div style={{ position: "absolute", top: 60, left: 16, right: 16, zIndex: 30, background: "rgba(220, 38, 38, 0.95)", color: "#FFFFFF", padding: "12px 18px", borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, fontWeight: 800, fontSize: 13, border: "1px solid #FCA5A5", boxShadow: "0 8px 24px rgba(0,0,0,0.5)" }}>
                    <i className="fa-solid fa-triangle-exclamation" style={{ color: "#FEF08A", fontSize: 18 }}></i>
                    <span style={{ letterSpacing: "0.02em" }}>
                      {proctorAlertMsg || "⚠️ Please look directly at the screen"}
                    </span>
                  </div>
                )}

              </div>

            </div>

            {/* ===================== RIGHT PANE: 30% ===================== */}
            <div style={{ flex: "0 0 360px", width: 360, maxWidth: "100%", display: "flex", flexDirection: "column", gap: 14 }}>
              {/* 1. AI Interviewer Card */}
              <div style={{ width: "100%", background: "#0B192C", border: "1px solid #1E293B", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <InterviewerVideoAvatar state={avatarState} size="interview" />
              </div>

              {/* 2. Current Question Block & Dynamic Question State */}
              <div style={{ background: "#0B192C", border: "1px solid #1E293B", borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 10, boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 900, textTransform: "uppercase", letterSpacing: "0.04em", padding: "4px 10px", borderRadius: 6, background: "#F5B41A", color: "#0A1F3D" }}>
                    {currentQuestionObj?.topicLabel || currentQuestionObj?.topic || `Topic ${currentQNumber}`}
                  </span>
                  {isSpeaking && (
                    <span style={{ color: "#F5B41A", fontSize: 11, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                      <i className="fa-solid fa-volume-high"></i> Asking…
                    </span>
                  )}
                </div>
                <h4 style={{ fontSize: 13.5, fontWeight: 600, color: "#F1F5F9", lineHeight: 1.55, margin: 0 }}>
                  {currentQuestionObj?.question || "Please listen carefully to the interviewer's question..."}
                </h4>
              </div>

              {/* 3. Action Buttons & Real-Time Proctoring Telemetry Pill */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ background: "#0B192C", border: "1px solid #1E293B", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, color: "#CBD5E1", flex: 1, boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}>
                  <span style={{ fontSize: 14 }}>🚨</span>
                  <span>
                    Warnings: <strong style={{ color: attentionWarningsCount > 0 ? "#F87171" : "#34D399" }}>{attentionWarningsCount}</strong>
                  </span>
                </div>

                {/* Next Question Action Button */}
                <button
                  type="button"
                  onClick={handleManualSkip}
                  disabled={loadingTurn || isSpeaking}
                  style={{
                    background: "#F5B41A",
                    color: "#0A1F3D",
                    border: "none",
                    fontWeight: 800,
                    padding: "9px 16px",
                    borderRadius: 10,
                    fontSize: 12,
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    cursor: (loadingTurn || isSpeaking) ? "not-allowed" : "pointer",
                    opacity: (loadingTurn || isSpeaking) ? 0.5 : 1,
                    boxShadow: "0 4px 12px rgba(245,180,26,0.3)",
                    transition: "all 0.2s",
                  }}
                  title="Move to the next question"
                >
                  <span>Next Question</span>
                  <i className="fa-solid fa-arrow-right" style={{ fontSize: 11 }}></i>
                </button>
              </div>

              {/* 4. Live Conversation Thread */}
              <div style={{ background: "#0B192C", border: "1px solid #1E293B", borderRadius: 16, padding: 14, display: "flex", flexDirection: "column", gap: 10, height: 260, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.25)" }}>
                <div style={{ fontSize: 10.5, fontWeight: 900, textTransform: "uppercase", color: "#64748B", letterSpacing: "0.05em", paddingBottom: 8, borderBottom: "1px solid #1E293B", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span>Conversation Thread</span>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    {isCallConnected ? (
                      <span style={{ color: "#34D399", display: "flex", alignItems: "center", gap: 6, fontWeight: 800, fontSize: 10 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#34D399", display: "inline-block" }}></span>
                        Voice Live
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startVapiCall(localStorage.getItem("talentera_token"))}
                        disabled={loadingTurn || isConnectingCall}
                        style={{
                          fontSize: 10,
                          color: "#F5B41A",
                          background: "rgba(245, 180, 26, 0.15)",
                          border: "1px solid rgba(245, 180, 26, 0.4)",
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontWeight: 800,
                          cursor: "pointer",
                        }}
                      >
                        {isConnectingCall ? "Connecting…" : "🎙️ Reconnect"}
                      </button>
                    )}
                  </div>
                </div>

                {transcript.map((line, idx) => {
                  const isMessi = line.speaker === "messi";
                  return (
                    <div key={idx} style={{ display: "flex", flexDirection: "column", alignItems: isMessi ? "flex-start" : "flex-end" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: isMessi ? "#F5B41A" : "#64748B", marginBottom: 2 }}>
                        {isMessi ? "JESSY (AI)" : "YOU"}
                      </span>
                      <div
                        style={{
                          maxWidth: "90%",
                          fontSize: 12,
                          padding: "8px 12px",
                          borderRadius: 10,
                          lineHeight: 1.45,
                          background: isMessi ? "#1E293B" : "#F5B41A",
                          color: isMessi ? "#E2E8F0" : "#0A1F3D",
                          border: isMessi ? "1px solid #334155" : "none",
                          fontWeight: isMessi ? 500 : 600,
                        }}
                      >
                        {line.text}
                      </div>
                    </div>
                  );
                })}

                {liveInterim && (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                    <span style={{ fontSize: 9, fontWeight: 800, color: "#34D399", marginBottom: 2 }}>TRANSCRIBING LIVE…</span>
                    <div style={{ maxWidth: "90%", fontSize: 12, padding: "8px 12px", borderRadius: 10, background: "#1E293B", border: "1px dashed #10B981", color: "#34D399", fontStyle: "italic" }}>
                      {liveInterim}
                    </div>
                  </div>
                )}

                {loadingTurn && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 700, color: "#F5B41A", padding: 4 }}>
                    <i className="fa-solid fa-spinner fa-spin"></i>
                    <span>AI is acknowledging your response…</span>
                  </div>
                )}
                <div ref={chatEndRef} />
              </div>

              {/* Response Input Form */}
              <form onSubmit={handleTextSubmit} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="text"
                  value={inputText}
                  onChange={(e) => handleTextChange(e.target.value)}
                  placeholder={
                    isWaitingForAnswerStart
                      ? "Speak into mic or type here (30s timeout)…"
                      : isListening
                      ? "Speaking… (you can also type here)"
                      : "Type your response, or speak into mic…"
                  }
                  disabled={loadingTurn}
                  style={{
                    flex: 1,
                    background: "#0B192C",
                    border: "1px solid #334155",
                    color: "#FFFFFF",
                    fontSize: 12,
                    padding: "10px 14px",
                    borderRadius: 10,
                    outline: "none",
                  }}
                />
                <button
                  type="submit"
                  disabled={!inputText.trim() || loadingTurn}
                  style={{
                    background: "#F5B41A",
                    color: "#0A1F3D",
                    border: "none",
                    fontWeight: 800,
                    padding: "10px 14px",
                    borderRadius: 10,
                    fontSize: 12,
                    cursor: (!inputText.trim() || loadingTurn) ? "not-allowed" : "pointer",
                    opacity: (!inputText.trim() || loadingTurn) ? 0.4 : 1,
                    boxShadow: "0 2px 8px rgba(245,180,26,0.3)",
                  }}
                  title="Send answer"
                >
                  <i className="fa-solid fa-paper-plane"></i>
                </button>
              </form>
            </div>
          </div>
        </div>
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
