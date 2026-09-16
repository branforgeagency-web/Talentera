const express = require("express");
const fs = require("fs");
const path = require("path");
const { body, validationResult } = require("express-validator");
const Candidate = require("../models/Candidate");
const { requireAuth } = require("../middleware/auth");
const { aadhaarService } = require("../utils/aadhaarService");
const { startLiveVerifySession, captureLiveVerifyResult, closeLiveVerifySession } = require("../utils/aadhaarLiveVerifySession");
const { isCloudinaryConfigured, uploadBufferToCloudinary } = require("../config/cloudinary");
const { validateAadhaarNumber } = require("../utils/verhoeffBackend");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { messageCentralService } = require("../utils/messageCentralService");
const logger = require("../utils/logger");

const router = express.Router();
router.use(requireAuth); // All Aadhaar verification endpoints require JWT candidate auth

/**
 * POST /api/aadhaar/live-verify/start
 *
 * Opens a REAL, human-operated remote browser session on UIDAI's own
 * official, free "Verify an Aadhaar Number" tool
 * (myaadhaar.uidai.gov.in/verifyAadhaar) - the only genuine UIDAI service
 * that confirms an Aadhaar number exists and returns age band/gender/state
 * without a full eKYC OTP flow. It's CAPTCHA-protected with no API, so the
 * candidate drives this session themselves (see utils/aadhaarLiveVerifySession.js
 * for why, and for why an earlier version of this endpoint that fabricated
 * these fields from the Aadhaar number's own digits was wrong). This never
 * sets aadhaarVerified - that only happens after a successful capture below
 * confirms a real result was shown.
 *
 * Request: { aadhaar: "123456789012" }
 * Response: { success: true, sessionId, liveViewUrl, verifyUrl, maskedAadhaar }
 */
router.post(
  "/live-verify/start",
  [
    body("aadhaar")
      .notEmpty()
      .withMessage("Aadhaar number is required.")
      .custom((val) => {
        const check = validateAadhaarNumber(val);
        if (!check.valid) {
          throw new Error(check.error);
        }
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    try {
      const result = await startLiveVerifySession({
        candidateId: req.candidateId,
        aadhaarNumber: req.body.aadhaar,
      });
      res.json({ success: true, ...result });
    } catch (err) {
      logger.error(`Aadhaar live-verify start error: ${err.message}`);
      res.status(400).json({ message: err.message || "Could not start live Aadhaar verification." });
    }
  }
);

/**
 * POST /api/aadhaar/live-verify/:sessionId/capture
 *
 * Takes a screenshot + the visible page text from the candidate's
 * in-progress live UIDAI session (after they've solved the CAPTCHA and
 * submitted on the real site) and makes a best-effort attempt to read the
 * Age Band / Gender / State values back out of the result. Only marks
 * aadhaarVerified when that extraction is confident (see
 * aadhaarLiveVerifySession.js's `confirmed` logic) - otherwise the real
 * captured evidence is still returned so the candidate can see exactly
 * what UIDAI's page showed and retry.
 *
 * Response: { success: true, confirmed, maskedAadhaar, ageBand, gender,
 *   state, currentUrl, pageText, evidenceUrl, candidate?, ...scoring? }
 */
router.post("/live-verify/:sessionId/capture", async (req, res) => {
  try {
    const { maskedAadhaar, pageText, screenshotBuffer, currentUrl, extracted, confirmed } =
      await captureLiveVerifyResult(req.params.sessionId);

    let evidenceUrl = null;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadBufferToCloudinary(screenshotBuffer, {
        folder: `talentera/aadhaar-live-verify-evidence/${req.candidateId}`,
        resource_type: "image",
      });
      evidenceUrl = uploaded.secure_url;
    } else {
      const dir = path.join(__dirname, "..", "uploads", "aadhaar-live-verify-evidence", String(req.candidateId));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}.png`;
      fs.writeFileSync(path.join(dir, filename), screenshotBuffer);
      evidenceUrl = `/uploads/aadhaar-live-verify-evidence/${req.candidateId}/${filename}`;
    }

    let candidate = null;
    let scoring = {};
    if (confirmed) {
      candidate = await Candidate.findById(req.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate profile not found." });
      }

      candidate.stage1 = {
        ...(candidate.stage1 || {}),
        aadhaarVerified: true,
        aadhaarStatus: "NUMBER_VERIFIED",
        maskedAadhaar,
        verificationMethod: "UIDAI Official Verification Portal (myaadhaar.uidai.gov.in) - candidate-confirmed",
        ageBand: extracted.ageBand || candidate.stage1?.ageBand,
        gender: extracted.gender || candidate.stage1?.gender,
        state: extracted.state || candidate.stage1?.state,
        aadhaarLiveVerificationEvidenceUrl: evidenceUrl,
        aadhaarLiveVerificationText: pageText,
        aadhaarLiveVerificationCapturedAt: new Date(),
        aadhaarLiveVerificationSourceUrl: currentUrl,
      };

      candidate.markModified("stage1");
      await candidate.save();
      scoring = calculateVerificationScore(candidate.completedStages);
    }

    res.json({
      success: true,
      confirmed,
      maskedAadhaar,
      ageBand: extracted.ageBand || null,
      gender: extracted.gender || null,
      state: extracted.state || null,
      currentUrl,
      pageText,
      evidenceUrl,
      message: confirmed
        ? "UIDAI confirmed this Aadhaar number exists."
        : "Couldn't automatically confirm a result on the page yet - if you've already solved the CAPTCHA and submitted on the official site, wait for its result to render, then try Capture Result again.",
      ...(candidate ? { candidate } : {}),
      ...scoring,
    });
  } catch (err) {
    logger.error(`Aadhaar live-verify capture error: ${err.message}`);
    res.status(400).json({ message: err.message || "Could not capture the verification result." });
  }
});

/**
 * POST /api/aadhaar/live-verify/:sessionId/close
 * Candidate is done with (or abandoning) a live session; releases the
 * remote browser. Sessions also self-expire after 10 minutes if this is
 * never called.
 */
router.post("/live-verify/:sessionId/close", async (req, res) => {
  await closeLiveVerifySession(req.params.sessionId);
  res.json({ success: true });
});

/**
 * POST /api/aadhaar/send-otp
 * Request: { aadhaar: "123456789012" }
 * Response: { success: true, transactionId: "...", maskedAadhaar: "XXXX XXXX 1234", resendCooldown: 30 }
 */
router.post(
  "/send-otp",
  [
    body("aadhaar")
      .notEmpty()
      .withMessage("Aadhaar number is required.")
      .custom((val) => {
        const clean = String(val).replace(/\D/g, "");
        if (clean.length !== 12) {
          throw new Error("Aadhaar number must contain exactly 12 digits.");
        }
        return true;
      }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { aadhaar, mobile: reqMobile, email: reqEmail } = req.body;

    try {
      const candidate = await Candidate.findById(req.candidateId);
      const candidateMobile = reqMobile || candidate?.stage1?.mobile || candidate?.mobile || "";
      const candidateEmail = reqEmail || candidate?.stage1?.email || candidate?.email || "";

      const result = await aadhaarService.sendOtp(aadhaar, candidateMobile, candidateEmail);
      res.json({
        success: true,
        message: result.message,
        transactionId: result.transactionId,
        maskedAadhaar: result.maskedAadhaar,
        maskedMobile: result.maskedMobile,
        resendCooldown: result.resendCooldown,
        // Only present outside production - see aadhaarService.sendOtp().
        ...(result.devOtp ? { devOtp: result.devOtp } : {}),
      });
    } catch (err) {
      logger.error(`Aadhaar send-otp error: ${err.message}`);
      res.status(400).json({ message: err.message || "Failed to send Aadhaar OTP." });
    }
  }
);

/**
 * POST /api/aadhaar/verify-otp
 * Request: { transactionId: "...", otp: "123456" }
 * Response: { success: true, verified: true, maskedAadhaar: "XXXX XXXX 1234", verifiedAt: "..." }
 */
router.post(
  "/verify-otp",
  [
    body("transactionId").notEmpty().withMessage("Transaction ID is required."),
    body("otp")
      .notEmpty()
      .withMessage("OTP is required.")
      .matches(/^\d{6}$/)
      .withMessage("OTP must be a 6-digit number."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { transactionId, otp } = req.body;

    try {
      const verification = await aadhaarService.verifyOtp(transactionId, otp);

      // On successful verification, update candidate's Stage 1 profile in MongoDB
      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) {
        return res.status(404).json({ message: "Candidate profile not found." });
      }

      candidate.stage1 = {
        ...(candidate.stage1 || {}),
        aadhaarVerified: true,
        aadhaarStatus: "VERIFIED",
        maskedAadhaar: verification.maskedAadhaar,
        aadhaarTransactionId: transactionId,
        verificationMethod: verification.verificationMethod || "Cashfree Aadhaar OKYC (UIDAI Certified)",
        verifiedAt: verification.verifiedAt,
      };

      if (verification.name) {
        candidate.stage1.fullName = verification.name;
      }
      if (verification.dob) {
        candidate.stage1.dob = verification.dob;
      }
      if (verification.gender) {
        candidate.stage1.gender = verification.gender;
      }
      if (verification.state) {
        candidate.stage1.state = verification.state;
      }
      if (verification.city) {
        candidate.stage1.city = verification.city;
      }
      if (verification.district) {
        candidate.stage1.district = verification.district;
      }
      if (verification.pincode) {
        candidate.stage1.pincode = verification.pincode;
      }
      if (verification.address) {
        candidate.stage1.address = verification.address;
      }
      if (verification.photoUrl) {
        candidate.stage1.photoUrl = verification.photoUrl;
      }

      // Sync aadhaarLockedData so that wizard stage 1 reflects verified locks
      candidate.stage1.aadhaarLockedData = {
        fullName: candidate.stage1.fullName || "",
        dob: candidate.stage1.dob || "",
        gender: candidate.stage1.gender || "",
        locality: candidate.stage1.address || "",
        district: verification.district || candidate.stage1.city || "",
        state: candidate.stage1.state || "",
        pincode: candidate.stage1.pincode || "",
      };

      if (!candidate.completedStages.includes(1)) {
        candidate.completedStages.push(1);
      }

      candidate.markModified("stage1");
      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);

      res.json({
        success: true,
        verified: true,
        maskedAadhaar: verification.maskedAadhaar,
        maskedMobile: verification.maskedMobile || null,
        verificationMethod: candidate.stage1.verificationMethod,
        verifiedAt: verification.verifiedAt,
        details: {
          fullName: candidate.stage1.fullName,
          dob: candidate.stage1.dob,
          gender: candidate.stage1.gender,
          careOf: verification.careOf || null,
          city: candidate.stage1.city,
          district: verification.district || candidate.stage1.city,
          state: candidate.stage1.state,
          pincode: candidate.stage1.pincode || null,
          address: candidate.stage1.address,
          photoUrl: candidate.stage1.photoUrl || null,
          maskedMobile: verification.maskedMobile || null,
          maskedAadhaar: verification.maskedAadhaar,
        },
        candidate,
        ...scoring,
      });
    } catch (err) {
      logger.error(`Aadhaar verify-otp error: ${err.message}`);
      res.status(400).json({ message: err.message || "Failed to verify Aadhaar OTP." });
    }
  }
);

/**
 * POST /api/aadhaar/messagecentral/start
 * Generates Message Central DigiLocker session URL
 */
router.post("/messagecentral/start", async (req, res) => {
  try {
    const rawOrigin = req.headers.origin || process.env.APP_URL || "https://localhost:5173";
    const defaultRedirect = `${rawOrigin.replace(/^http:\/\//i, "https://")}/wizard?stage=1&mc_done=1`;
    const redirectionUrl = req.body.redirectionUrl || defaultRedirect;
    const result = await messageCentralService.generateDigilockerUrl(redirectionUrl, req.body.userFlow || "signup");

    // Persist pending session on candidate profile so fetch can recover it across tabs/redirects
    try {
      const candidate = await Candidate.findById(req.candidateId);
      if (candidate) {
        candidate.stage1 = {
          ...(candidate.stage1 || {}),
          pendingMcSession: {
            verificationId: result.verificationId,
            referenceId: result.referenceId,
            startedAt: new Date(),
          },
        };
        candidate.markModified("stage1");
        await candidate.save();
      }
    } catch (saveErr) {
      logger.warn(`Could not persist pendingMcSession: ${saveErr.message}`);
    }

    res.json({
      success: true,
      url: result.url,
      verificationId: result.verificationId,
      referenceId: result.referenceId,
      status: result.status,
    });
  } catch (err) {
    logger.error(`Message Central start error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to initiate Message Central verification." });
  }
});

/**
 * POST /api/aadhaar/messagecentral/fetch-document
 * Fetches verified Aadhaar document after candidate completes OTP on DigiLocker
 */
router.post("/messagecentral/fetch-document", async (req, res) => {
  let { referenceId, verificationId } = req.body;

  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) {
    return res.status(404).json({ message: "Candidate profile not found." });
  }

  // Fallback to candidate's stored pending session if either ID is missing
  if (!referenceId && candidate.stage1?.pendingMcSession?.referenceId) {
    referenceId = candidate.stage1.pendingMcSession.referenceId;
  }
  if (!verificationId && candidate.stage1?.pendingMcSession?.verificationId) {
    verificationId = candidate.stage1.pendingMcSession.verificationId;
  }

  if (!referenceId && !verificationId) {
    return res.status(400).json({ message: "No active Message Central verification found. Please click 'Verify with Aadhaar DigiLocker' first." });
  }

  try {
    const verification = await messageCentralService.getDocument(referenceId, verificationId);

    // Save into candidate stage1
    candidate.stage1 = {
      ...(candidate.stage1 || {}),
      aadhaarVerified: true,
      aadhaarStatus: "VERIFIED",
      maskedAadhaar: verification.maskedAadhaar,
      aadhaarTransactionId: String(referenceId || verificationId),
      verificationMethod: "Message Central eKYCNow (DigiLocker UIDAI Verified)",
      verifiedAt: verification.verifiedAt,
      pendingMcSession: null,
    };

    if (verification.name) candidate.stage1.fullName = verification.name;
    if (verification.dob) candidate.stage1.dob = verification.dob;
    if (verification.gender) candidate.stage1.gender = verification.gender;
    if (verification.state) candidate.stage1.state = verification.state;
    if (verification.city) candidate.stage1.city = verification.city;
    if (verification.district) candidate.stage1.district = verification.district;
    if (verification.pincode) candidate.stage1.pincode = verification.pincode;
    if (verification.address) candidate.stage1.address = verification.address;
    if (verification.photoUrl) candidate.stage1.photoUrl = verification.photoUrl;
    if (verification.careOf) candidate.stage1.careOf = verification.careOf;

    candidate.stage1.permanentState = verification.state || candidate.stage1.state || "";
    candidate.stage1.permanentDistrict = verification.district || candidate.stage1.city || "";
    candidate.stage1.permanentLocality = verification.address || candidate.stage1.address || "";

    candidate.stage1.aadhaarLockedData = {
      fullName: candidate.stage1.fullName || "",
      dob: candidate.stage1.dob || "",
      gender: candidate.stage1.gender || "",
      locality: candidate.stage1.address || "",
      district: verification.district || candidate.stage1.city || "",
      state: candidate.stage1.state || "",
      pincode: candidate.stage1.pincode || "",
      careOf: verification.careOf || candidate.stage1.careOf || "",
      photoUrl: verification.photoUrl || candidate.stage1.photoUrl || null,
      maskedAadhaar: verification.maskedAadhaar || candidate.stage1.maskedAadhaar || "",
      maskedMobile: candidate.stage1.maskedMobile || "",
    };

    candidate.markModified("stage1");
    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);

    res.json({
      success: true,
      verified: true,
      maskedAadhaar: verification.maskedAadhaar,
      verificationMethod: candidate.stage1.verificationMethod,
      verifiedAt: verification.verifiedAt,
      details: {
        fullName: candidate.stage1.fullName,
        dob: candidate.stage1.dob,
        gender: candidate.stage1.gender,
        careOf: verification.careOf || null,
        city: candidate.stage1.city,
        district: verification.district || candidate.stage1.city,
        state: candidate.stage1.state,
        pincode: candidate.stage1.pincode || null,
        address: candidate.stage1.address,
        photoUrl: candidate.stage1.photoUrl || null,
        maskedAadhaar: verification.maskedAadhaar,
      },
      candidate,
      ...scoring,
    });
  } catch (err) {
    logger.error(`Message Central fetch-document error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to retrieve verified Aadhaar document." });
  }
});

/**
 * GET /api/aadhaar/status/:transactionId
 */
router.get("/status/:transactionId", async (req, res) => {
  const { transactionId } = req.params;
  const status = aadhaarService.getVerificationStatus(transactionId);
  res.json({ success: true, ...status });
});

module.exports = router;
