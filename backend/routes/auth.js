const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Candidate = require("../models/Candidate");
const { signToken, requireAuth } = require("../middleware/auth");
const { authLimiter, otpLimiter } = require("../middleware/rateLimit");
const { generateResetOtp, verifyAndConsumeResetOtp } = require("../utils/passwordReset");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

// POST /api/auth/register
router.post(
  "/register",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("mobile")
      .notEmpty()
      .withMessage("Valid 10-digit mobile number is required for registration.")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Mobile number must be a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password, mobile } = req.body;
    const cleanEmail = (email || "").toLowerCase().trim();

    try {
      const existing = await Candidate.findOne({ email: cleanEmail });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const candidate = await Candidate.create({
        email: cleanEmail,
        passwordHash,
        mobile: mobile || "",
        completedStages: [],
      });

      const token = signToken(candidate._id, "candidate");
      res.status(201).json({ token, candidate });
    } catch (err) {
      logger.error(`Register error: ${err.message}`);
      res.status(500).json({ message: err.message || "Server error during registration." });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").exists().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;
    const cleanEmail = (email || "").toLowerCase().trim();

    try {
      const candidate = await Candidate.findOne({ email: cleanEmail });
      if (!candidate) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      if (!candidate.passwordHash) {
        return res.status(401).json({ message: "Account has no password set. Please reset password or contact support." });
      }

      const isMatch = await bcrypt.compare(password, candidate.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(candidate._id, "candidate");
      res.json({ token, candidate });
    } catch (err) {
      logger.error(`Candidate login error: ${err.message}`);
      res.status(500).json({ message: err.message || "Server error during login." });
    }
  }
);

// POST /api/auth/forgot-password - request a reset code by email.
// Candidates previously had no way to recover a forgotten password at all
// (only companies had this flow) - see IMPROVEMENT_ROADMAP.md "Candidates
// can't reset a forgotten password." Always responds success (even for an
// unknown email) so this endpoint can't be used to enumerate registered
// candidate emails.
router.post("/forgot-password", otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const candidate = await Candidate.findOne({ email: cleanEmail });
    if (candidate) {
      const otp = generateResetOtp("candidate", cleanEmail);
      await sendTransactionalEmail({
        to: cleanEmail,
        subject: "Your Talentera password reset code",
        html: wrapEmailTemplate(
          "Reset your password",
          `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the following 6-digit code to reset your Talentera candidate account password. It expires in 10 minutes.</p>
           <div style="background: #0A1F3D; color: #E5A82E; padding: 18px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">${otp}</div>
           <p style="color: #64748B; font-size: 13px; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>`
        ),
      });
    }
    // Same response whether or not the account exists - avoids leaking
    // which emails are registered.
    res.json({
      success: true,
      message: `If an account exists for ${cleanEmail}, a password reset code has been sent.`,
    });
  } catch (err) {
    logger.error(`Candidate forgot-password error: ${err.message}`);
    res.status(500).json({ message: "Failed to process password reset request." });
  }
});

// POST /api/auth/reset-password - complete the reset using the code from
// /forgot-password. Unlike the company flow this was modeled after, this
// one actually verifies the code server-side before touching the password -
// see backend/utils/passwordReset.js for why that check matters.
router.post("/reset-password", otpLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Email, reset code, and a new password (min 6 characters) are required." });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const verification = verifyAndConsumeResetOtp("candidate", cleanEmail, otp);
    if (!verification.ok) {
      return res.status(400).json({ message: verification.message });
    }

    const candidate = await Candidate.findOne({ email: cleanEmail });
    if (!candidate) {
      return res.status(404).json({ message: "Candidate account not found." });
    }

    candidate.passwordHash = await bcrypt.hash(newPassword, 10);
    await candidate.save();

    res.json({ success: true, message: "Password updated successfully. You can now log in with your new password." });
  } catch (err) {
    logger.error(`Candidate reset-password error: ${err.message}`);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

// GET /api/auth/me - restores session on refresh (replaces Firebase's persistent session)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    res.json({ candidate });
  } catch (err) {
    logger.error(`Auth me error: ${err.message}`);
    res.status(500).json({ message: "Server error restoring candidate session." });
  }
});

module.exports = router;
