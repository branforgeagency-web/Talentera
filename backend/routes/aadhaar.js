const express = require("express");
const { body, validationResult } = require("express-validator");
const Candidate = require("../models/Candidate");
const { requireAuth } = require("../middleware/auth");
const { aadhaarService } = require("../utils/aadhaarService");
const { calculateVerificationScore } = require("../utils/verificationScore");

const router = express.Router();
router.use(requireAuth); // All Aadhaar verification endpoints require JWT candidate auth

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

    const { aadhaar } = req.body;

    try {
      const candidate = await Candidate.findById(req.candidateId);
      const candidateMobile = candidate?.stage1?.mobile || candidate?.mobile || "";
      const candidateEmail = candidate?.stage1?.email || candidate?.email || "";

      const result = await aadhaarService.sendOtp(aadhaar, candidateMobile, candidateEmail);
      res.json({
        success: true,
        message: result.message,
        transactionId: result.transactionId,
        maskedAadhaar: result.maskedAadhaar,
        maskedMobile: result.maskedMobile,
        resendCooldown: result.resendCooldown,
      });
    } catch (err) {
      console.error("Aadhaar send-otp error:", err.message);
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
        verifiedAt: verification.verifiedAt,
      };

      if (verification.name && !candidate.stage1.fullName) {
        candidate.stage1.fullName = verification.name;
      }
      if (verification.state && !candidate.stage1.state) {
        candidate.stage1.state = verification.state;
      }
      if (verification.city && !candidate.stage1.city) {
        candidate.stage1.city = verification.city;
      }

      candidate.markModified("stage1");
      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);

      res.json({
        success: true,
        verified: true,
        maskedAadhaar: verification.maskedAadhaar,
        verifiedAt: verification.verifiedAt,
        candidate,
        ...scoring,
      });
    } catch (err) {
      console.error("Aadhaar verify-otp error:", err.message);
      res.status(400).json({ message: err.message || "Failed to verify Aadhaar OTP." });
    }
  }
);

/**
 * GET /api/aadhaar/status/:transactionId
 */
router.get("/status/:transactionId", async (req, res) => {
  const { transactionId } = req.params;
  const status = aadhaarService.getVerificationStatus(transactionId);
  res.json({ success: true, ...status });
});

module.exports = router;
