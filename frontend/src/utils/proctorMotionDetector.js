/**
 * proctorMotionDetector.js
 * Real-time background motion analysis for AI Proctoring & Mock Interview.
 * 
 * Compares frame-by-frame background pixels outside of the candidate's
 * head and upper torso exclusion bounding box. Detects background movement
 * (e.g. people walking behind, secondary intruders, opening doors, waving)
 * while allowing normal candidate breathing, speech, and micro-movements.
 */

export function createMotionDetector(options = {}) {
  const width = options.width || 120;
  const height = options.height || 90;
  const checkIntervalMs = options.checkIntervalMs || 90; // Evaluate ~10 fps
  const lumaDiffThreshold = options.lumaDiffThreshold || 26; // Pixel delta (0-255)
  const motionRatioThreshold = options.motionRatioThreshold || 0.035; // 3.5% of background pixels
  const minPixelsThreshold = options.minPixelsThreshold || 140; // Absolute pixel count

  // Offscreen canvas for lightweight pixel extraction (~0.1ms per frame)
  let offscreenCanvas = null;
  let offscreenCtx = null;
  if (typeof document !== "undefined") {
    offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = width;
    offscreenCanvas.height = height;
    offscreenCtx = offscreenCanvas.getContext("2d", { willReadFrequently: true });
  }

  return {
    width,
    height,
    checkIntervalMs,
    lumaDiffThreshold,
    motionRatioThreshold,
    minPixelsThreshold,
    offscreenCanvas,
    offscreenCtx,
    prevLuma: new Uint8Array(width * height),
    hasPrevFrame: false,
    lastCheckTime: 0,
    consecutiveMotionFrames: 0,
    consecutiveStillFrames: 0,
    isMotionActive: false,
    lastRatio: 0,
    lastMovedPixels: 0,
  };
}

/**
 * Evaluates webcam frame for motion in the background.
 * 
 * @param {Object} detector - Detector instance created by createMotionDetector
 * @param {HTMLVideoElement} video - Active candidate video element
 * @param {Array} faceLandmarks - Array of normalized landmark points for primary face (or null)
 * @returns {Object} { isMotionDetected, motionRatio, movedPixels, totalBgPixels }
 */
export function detectBackgroundMotion(detector, video, faceLandmarks) {
  if (!detector || !detector.offscreenCtx || !video) {
    return { isMotionDetected: false, motionRatio: 0, movedPixels: 0, totalBgPixels: 0 };
  }

  if (video.readyState < 2 || video.videoWidth === 0 || video.paused) {
    return { isMotionDetected: false, motionRatio: 0, movedPixels: 0, totalBgPixels: 0 };
  }

  const now = performance.now();
  if (now - detector.lastCheckTime < detector.checkIntervalMs) {
    return {
      isMotionDetected: detector.isMotionActive,
      motionRatio: detector.lastRatio,
      movedPixels: detector.lastMovedPixels,
      totalBgPixels: 0,
    };
  }
  detector.lastCheckTime = now;

  const { width, height, offscreenCtx } = detector;

  try {
    offscreenCtx.drawImage(video, 0, 0, width, height);
    const imgData = offscreenCtx.getImageData(0, 0, width, height);
    const data = imgData.data;

    // Determine Candidate Exclusion Zone (head + torso region)
    let exclLeft = 0;
    let exclRight = 0;
    let exclTop = 0;
    let exclBottom = height - 1;
    let hasCandidateMask = false;

    if (faceLandmarks && faceLandmarks.length > 0) {
      let minX = 1;
      let maxX = 0;
      let minY = 1;
      let maxY = 0;

      for (let i = 0; i < faceLandmarks.length; i++) {
        const pt = faceLandmarks[i];
        if (pt.x < minX) minX = pt.x;
        if (pt.x > maxX) maxX = pt.x;
        if (pt.y < minY) minY = pt.y;
        if (pt.y > maxY) maxY = pt.y;
      }

      const faceW = maxX - minX;
      const faceH = maxY - minY;

      // Candidate's body bounds: from above forehead down to bottom of frame, plus shoulder width
      // (padding widened so normal shifting/gesturing stays inside the "candidate" mask
      // instead of being misread as background motion)
      exclLeft = Math.max(0, Math.floor((minX - faceW * 0.75) * width));
      exclRight = Math.min(width - 1, Math.ceil((maxX + faceW * 0.75) * width));
      exclTop = Math.max(0, Math.floor((minY - faceH * 0.5) * height));
      exclBottom = height - 1;
      hasCandidateMask = true;
    }

    let movedPixels = 0;
    let totalBgPixels = 0;
    const prevLuma = detector.prevLuma;
    const isFirstFrame = !detector.hasPrevFrame;

    for (let y = 0; y < height; y++) {
      const isRowCandidate = hasCandidateMask && y >= exclTop && y <= exclBottom;
      for (let x = 0; x < width; x++) {
        // Exclude candidate's face and body from background motion analysis
        if (isRowCandidate && x >= exclLeft && x <= exclRight) {
          continue;
        }

        totalBgPixels++;
        const idx = y * width + x;
        const dataIdx = idx * 4;

        // Fast perceptual luminance: 0.299R + 0.587G + 0.114B
        const luma = (data[dataIdx] * 299 + data[dataIdx + 1] * 587 + data[dataIdx + 2] * 114) >> 10;

        if (!isFirstFrame) {
          const prev = prevLuma[idx];
          const diff = Math.abs(luma - prev);
          if (diff > detector.lumaDiffThreshold) {
            movedPixels++;
          }
          // Adaptive background updating (EMA: 80% history, 20% current)
          prevLuma[idx] = (prev * 4 + luma) / 5;
        } else {
          prevLuma[idx] = luma;
        }
      }
    }

    if (isFirstFrame) {
      detector.hasPrevFrame = true;
      return { isMotionDetected: false, motionRatio: 0, movedPixels: 0, totalBgPixels };
    }

    const motionRatio = totalBgPixels > 50 ? movedPixels / totalBgPixels : 0;
    detector.lastRatio = motionRatio;
    detector.lastMovedPixels = movedPixels;

    // Motion trigger: exceed percentage threshold or significant absolute moved pixel count
    const frameMotion = motionRatio >= detector.motionRatioThreshold || movedPixels >= detector.minPixelsThreshold;

    if (frameMotion) {
      detector.consecutiveMotionFrames++;
      detector.consecutiveStillFrames = 0;
      // Trigger after 3 consecutive motion samples (~240ms) - was 2 (~180ms),
      // widened so brief/small movements don't immediately flag as sustained motion
      if (detector.consecutiveMotionFrames >= 3) {
        detector.isMotionActive = true;
      }
    } else {
      detector.consecutiveStillFrames++;
      // Clear after 3 consecutive clean samples (~270ms)
      if (detector.consecutiveStillFrames >= 3) {
        detector.consecutiveMotionFrames = 0;
        detector.isMotionActive = false;
      }
    }

    return {
      isMotionDetected: detector.isMotionActive,
      motionRatio,
      movedPixels,
      totalBgPixels,
      hasCandidateMask,
      exclBounds: { exclLeft, exclRight, exclTop, exclBottom },
    };
  } catch (err) {
    console.warn("Background motion detection error:", err);
    return { isMotionDetected: false, motionRatio: 0, movedPixels: 0, totalBgPixels: 0 };
  }
}
