import { useEffect, useRef, useState } from "react";
import { FilesetResolver, FaceLandmarker } from "@mediapipe/tasks-vision";

const WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm";
const MODEL_PATH =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// A covered / closed camera produces an almost black frame (mean luma well
// under this on a 0-255 scale), so it is rejected even before the AI model runs.
const DARK_FRAME_LUMA = 14;

let sharedLandmarkerPromise = null;
function loadLandmarker() {
  if (!sharedLandmarkerPromise) {
    sharedLandmarkerPromise = (async () => {
      const fileset = await FilesetResolver.forVisionTasks(WASM_PATH);
      const make = (delegate) =>
        FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: MODEL_PATH, delegate },
          runningMode: "VIDEO",
          numFaces: 3,
          minFaceDetectionConfidence: 0.5,
          minFacePresenceConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });
      try {
        return await make("GPU");
      } catch {
        return await make("CPU");
      }
    })().catch((err) => {
      sharedLandmarkerPromise = null;
      throw err;
    });
  }
  return sharedLandmarkerPromise;
}

/**
 * Real face-presence check for a live <video> element.
 * Returns { facePresent, faceCount, covered, modelReady, modelFailed }.
 * facePresent is true only when exactly one real face is visible in a lit frame
 * (a covered/closed lens, a dark frame or an empty chair all report false).
 */
export default function useFacePresence(videoRef, active, intervalMs = 500) {
  const [state, setState] = useState({
    facePresent: false,
    faceCount: 0,
    covered: false,
    modelReady: false,
    modelFailed: false,
  });
  const landmarkerRef = useRef(null);
  const canvasRef = useRef(null);
  const missesRef = useRef(0);
  const [modelStatus, setModelStatus] = useState("loading");

  useEffect(() => {
    if (!active) return undefined;
    let cancelled = false;
    loadLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarkerRef.current = lm;
        setModelStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setModelStatus("failed");
      });
    return () => {
      cancelled = true;
    };
  }, [active]);

  useEffect(() => {
    if (!active) return undefined;
    missesRef.current = 0;
    const timer = setInterval(() => {
      const video = videoRef.current;
      if (!video || video.readyState < 2 || !video.videoWidth) {
        setState((p) => ({ ...p, facePresent: false, faceCount: 0 }));
        return;
      }

      // 1. Brightness check - catches a closed shutter / covered lens instantly.
      let covered = false;
      try {
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
          canvasRef.current.width = 32;
          canvasRef.current.height = 24;
        }
        const ctx = canvasRef.current.getContext("2d", { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, 32, 24);
        const data = ctx.getImageData(0, 0, 32, 24).data;
        let sum = 0;
        for (let i = 0; i < data.length; i += 4) {
          sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
        }
        covered = sum / (data.length / 4) < DARK_FRAME_LUMA;
      } catch {
        covered = false;
      }

      // 2. AI face detection (exactly one real face required).
      let faceCount = 0;
      const failed = modelStatus === "failed";
      if (!covered && landmarkerRef.current) {
        try {
          const res = landmarkerRef.current.detectForVideo(video, performance.now());
          faceCount = (res?.faceLandmarks || []).length;
        } catch {
          faceCount = 0;
        }
      }
      const modelReady = Boolean(landmarkerRef.current);
      // If the AI model could not load at all, fall back to the brightness check only.
      const hit = covered ? false : modelReady ? faceCount >= 1 : failed;

      if (hit) missesRef.current = 0;
      else missesRef.current += 1;
      // Present immediately on a hit; absent after 2 consecutive misses (~1s) to avoid flicker.
      const facePresent = hit || missesRef.current < 2;

      setState({
        facePresent: modelReady || failed ? facePresent : false,
        faceCount: covered ? 0 : faceCount,
        covered,
        modelReady,
        modelFailed: failed,
      });
    }, intervalMs);
    return () => clearInterval(timer);
  }, [active, videoRef, intervalMs, modelStatus]);

  return state;
}
