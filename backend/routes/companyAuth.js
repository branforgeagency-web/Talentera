const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Company = require("../models/Company");
const { signToken, requireCompanyAuth } = require("../middleware/auth");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");
const { authLimiter, otpLimiter } = require("../middleware/rateLimit");
const { generateResetOtp, verifyAndConsumeResetOtp } = require("../utils/passwordReset");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

const VALID_STAGE_IDS = ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"];

// Merge a small, whitelisted set of pre-fill values (collected by the
// "Post a Requirement" / "Post a Job" wizard before an account exists) into
// the matching onboarding stage Mixed objects, so a company doesn't have to
// retype what it already told us. Anything outside VALID_STAGE_IDS, or
// where the payload isn't a plain object, is ignored rather than throwing -
// this is best-effort convenience, not a required part of registration.
function buildStagePrefill(prefillStages) {
  const stages = {};
  if (!prefillStages || typeof prefillStages !== "object") return stages;
  for (const stageId of Object.keys(prefillStages)) {
    const key = String(stageId).toLowerCase();
    if (!VALID_STAGE_IDS.includes(key)) continue;
    const value = prefillStages[stageId];
    if (!value || typeof value !== "object" || Array.isArray(value)) continue;
    stages[`stage${key}`] = value;
  }
  return stages;
}

// POST /api/company/auth/register
router.post(
  "/register",
  authLimiter,
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Your name is required."),
    body("companyName").trim().isLength({ min: 2 }).withMessage("Company name is required."),
    body("mobile")
      .notEmpty()
      .withMessage("Valid 10-digit mobile number is required.")
      .matches(/^[6-9]\d{9}$/)
      .withMessage("Enter a valid 10-digit mobile number starting with 6, 7, 8, or 9."),
    body("email").isEmail().withMessage("Valid work email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, companyName, mobile, email, password, accessToken, intake, prefillStages } = req.body;

    try {
      if (accessToken) {
        await verifyWidgetAccessToken(accessToken);
      }

      const existing = await Company.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const stagePrefill = buildStagePrefill(prefillStages);
      const defaultStage1a = { legalname: companyName || "" };
      const defaultStage1b = { pocname: name || "", pocemail: email || "", pocmobile: mobile || "" };

      const company = await Company.create({
        email,
        passwordHash,
        contactName: name,
        companyName,
        mobile,
        completedStages: ["1a", "1b"],
        intakeNotes: intake && typeof intake === "object" ? intake : null,
        stage1a: { ...defaultStage1a, ...(stagePrefill.stage1a || {}) },
        stage1b: { ...defaultStage1b, ...(stagePrefill.stage1b || {}) },
        ...stagePrefill,
      });

      const token = signToken(company._id, "company");
      res.status(201).json({ token, company });
    } catch (err) {
      if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
        return res.status(400).json({ message: err.message });
      }
      logger.error(`Company register error: ${err.message}`);
      res.status(500).json({ message: err.message || "Server error during registration." });
    }
  }
);

// POST /api/company/auth/login - Step 1: Check credentials
router.post(
  "/login",
  authLimiter,
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").exists().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const company = await Company.findOne({ email });
      if (!company) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, company.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(company._id, "company");
      res.json({ token, company });
    } catch (err) {
      logger.error(`Company login error: ${err.message}`);
      res.status(500).json({ message: "Server error during login." });
    }
  }
);

// POST /api/company/auth/verify-login-otp - Step 2: Verify MSG91 OTP access token & issue session JWT
router.post("/verify-login-otp", async (req, res) => {
  const { companyId, accessToken } = req.body;
  if (!companyId || !accessToken) {
    return res.status(400).json({ message: "companyId and accessToken are required." });
  }

  try {
    await verifyWidgetAccessToken(accessToken);

    const company = await Company.findById(companyId);
    if (!company) {
      return res.status(404).json({ message: "Company not found." });
    }

    const token = signToken(company._id, "company");
    res.json({ token, company });
  } catch (err) {
    if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    logger.error(`Verify company login OTP error: ${err.message}`);
    res.status(500).json({ message: err.message || "Server error verifying OTP." });
  }
});

// POST /api/company/auth/forgot-password - Request password reset OTP
//
// IMPORTANT FIX: this endpoint previously generated and logged an OTP, but
// /reset-password below never actually checked it - it accepted
// { email, newPassword } and reset the password unconditionally. That meant
// anyone who knew (or guessed) a company's work email could take over the
// account with zero proof of access to that inbox. Both routes now go
// through backend/utils/passwordReset.js, which makes the OTP a real,
// one-time-use gate. See IMPROVEMENT_ROADMAP.md's CORS/OTP findings for the
// same class of issue elsewhere in this codebase.
router.post("/forgot-password", otpLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "A valid corporate email address is required." });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const company = await Company.findOne({ email: cleanEmail });
    if (company) {
      const otp = generateResetOtp("company", cleanEmail);
      await sendTransactionalEmail({
        to: cleanEmail,
        toName: company.contactName,
        subject: "Your Talentera employer account password reset code",
        html: wrapEmailTemplate(
          "Reset your employer account password",
          `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the following 6-digit code to reset your Talentera employer account password. It expires in 10 minutes.</p>
           <div style="background: #0A1F3D; color: #E5A82E; padding: 18px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">${otp}</div>
           <p style="color: #64748B; font-size: 13px; margin-bottom: 0;">If you didn't request this, you can safely ignore this email.</p>`
        ),
      });
    }

    // Same response whether or not the account exists - avoids leaking
    // which work emails have registered employer accounts.
    res.json({
      success: true,
      message: `If an employer account exists for ${cleanEmail}, a password reset code has been sent.`,
    });
  } catch (err) {
    logger.error(`Company forgot-password error: ${err.message}`);
    res.status(500).json({ message: "Failed to process password reset request." });
  }
});

// POST /api/company/auth/reset-password - Reset password using the verified code
router.post("/reset-password", otpLimiter, async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!email || !otp || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ message: "Email, reset code, and a new password (min 6 characters) are required." });
  }

  const cleanEmail = email.toLowerCase().trim();

  try {
    const verification = verifyAndConsumeResetOtp("company", cleanEmail, otp);
    if (!verification.ok) {
      return res.status(400).json({ message: verification.message });
    }

    const company = await Company.findOne({ email: cleanEmail });
    if (!company) {
      return res.status(404).json({ message: "Employer account not found." });
    }

    company.passwordHash = await bcrypt.hash(newPassword, 10);
    await company.save();

    res.json({
      success: true,
      message: "Password updated successfully. You can now log in with your new password.",
    });
  } catch (err) {
    logger.error(`Company reset-password error: ${err.message}`);
    res.status(500).json({ message: "Failed to reset password." });
  }
});

// POST /api/company/auth/demo-login - 1-Click Sandbox Employer Login
router.post("/demo-login", async (req, res) => {
  try {
    const demoEmail = "demo.employer@talentera.in";
    let company = await Company.findOne({ email: demoEmail });

    if (!company) {
      const passwordHash = await bcrypt.hash("DemoEmployer2026", 10);
      company = await Company.create({
        email: demoEmail,
        passwordHash,
        contactName: "Rohan Varma (Demo Recruiter)",
        companyName: "Access RCM Solutions (Demo)",
        mobile: "+91 98765 00000",
        completedStages: ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"],
        kycStatus: "verified",
        kycVerifiedAt: new Date(),
        stage1a: { legalname: "Access RCM Solutions Pvt Ltd", gstin: "29AAAAA0000A1Z5", kycStatus: "verified" },
        stage1b: { pocname: "Rohan Varma", pocemail: demoEmail, pocmobile: "+91 98765 00000" },
      });
    }

    const token = signToken(company._id, "company");
    res.json({
      token,
      company,
      message: "Logged in as Demo Employer Sandbox.",
    });
  } catch (err) {
    logger.error(`Demo login error: ${err.message}`);
    res.status(500).json({ message: "Failed to launch demo employer sandbox." });
  }
});

// GET /api/company/auth/me - restores session on refresh
router.get("/me", requireCompanyAuth, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });
    res.json({ company });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
