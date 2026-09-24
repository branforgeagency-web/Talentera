const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Candidate = require("../models/Candidate");
const StudentInvite = require("../models/StudentInvite");
const { signToken, requireAuth } = require("../middleware/auth");
const { authLimiter, otpLimiter } = require("../middleware/rateLimit");
const { generateResetOtp, verifyAndConsumeResetOtp } = require("../utils/passwordReset");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");
const logger = require("../utils/logger");

const router = express.Router();

function getMobileQueryVariants(mobiles) {
  if (!mobiles) return [];
  const list = Array.isArray(mobiles) ? mobiles : [mobiles];
  const variants = new Set();
  for (const m of list) {
    if (!m) continue;
    const str = String(m).trim();
    if (!str) continue;
    variants.add(str);
    const digitsOnly = str.replace(/\D/g, "");
    if (!digitsOnly) continue;
    variants.add(digitsOnly);
    if (digitsOnly.length >= 10) {
      const last10 = digitsOnly.slice(-10);
      variants.add(last10);
      variants.add(`+91${last10}`);
      variants.add(`+91 ${last10}`);
      variants.add(`91${last10}`);
      variants.add(`0${last10}`);
    }
  }
  return Array.from(variants);
}

function buildMobileRegexFilters(mobiles) {
  if (!mobiles) return [];
  const list = Array.isArray(mobiles) ? mobiles : [mobiles];
  const filters = [];
  const seenLast10 = new Set();
  for (const m of list) {
    if (!m) continue;
    const digitsOnly = String(m).replace(/\D/g, "");
    if (digitsOnly.length >= 10) {
      const last10 = digitsOnly.slice(-10);
      if (!seenLast10.has(last10)) {
        seenLast10.add(last10);
        const pattern = new RegExp(last10.split("").join("\\D*"));
        filters.push({ mobile: pattern });
        filters.push({ "stage1.mobile": pattern });
      }
    }
  }
  return filters;
}

// POST /api/auth/register
//
// Two entry paths:
//  - Normal signup: OTP-verified via accessToken (MSG91 widget), as before.
//  - Invite signup (inviteToken in the body): the student clicked the link
//    from their academy's invite email (routes/academy.js sendInviteEmail /
//    GET /invite/:token). The academy already vouches for them and a
//    Candidate record already exists (created at upload/add time, see
//    routes/academy.js upload-confirm & add-single) with a shared
//    placeholder password and isVerified:false — this is the step where
//    they set their OWN password and the account actually becomes
//    loginable. No OTP widget round-trip for this path: that's the whole
//    point of an academy-trusted invite (see IMPROVEMENT_ROADMAP-adjacent
//    Academy Dashboard roadmap, Phase 1 "invite link ... skips
//    verification friction").
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

    const { email, password, mobile, accessToken, inviteToken } = req.body;
    const cleanEmail = (email || "").toLowerCase().trim();
    const rawMobile = mobile || "";
    const mobileVariants = getMobileQueryVariants([rawMobile]);
    const mobileRegexes = buildMobileRegexFilters([rawMobile]);

    try {
      if (inviteToken) {
        const invite = await StudentInvite.findOne({ inviteToken });
        if (!invite) {
          return res.status(400).json({ message: "This invite link is invalid or has expired." });
        }
        if (invite.status === "signed_up") {
          return res.status(409).json({ message: "This invite has already been used. Please log in instead." });
        }

        const inviteMobileVariants = getMobileQueryVariants([invite.mobile, rawMobile]);
        const inviteMobileRegexes = buildMobileRegexFilters([invite.mobile, rawMobile]);

        let candidate = invite.candidateId ? await Candidate.findById(invite.candidateId) : null;
        if (!candidate) {
          candidate = await Candidate.findOne({
            $or: [
              { email: invite.email.toLowerCase().trim() },
              ...(cleanEmail ? [{ email: cleanEmail }] : []),
              ...(inviteMobileVariants.length > 0 ? [
                { mobile: { $in: inviteMobileVariants } },
                { "stage1.mobile": { $in: inviteMobileVariants } },
              ] : []),
              ...inviteMobileRegexes,
            ],
          });
        }
        if (!candidate) {
          return res.status(404).json({ message: "We couldn't find the profile your academy created for this invite. Please ask them to resend it." });
        }
        if (candidate.isVerified) {
          return res.status(409).json({ message: "An account with this email already exists. Please log in instead." });
        }

        candidate.passwordHash = await bcrypt.hash(password, 10);
        candidate.mobile = rawMobile || candidate.mobile || "";
        candidate.isVerified = true;
        candidate.verifiedAt = new Date();
        await candidate.save();

        invite.status = "signed_up";
        invite.signupCompletedAt = new Date();
        invite.candidateId = candidate._id;
        if (rawMobile && !invite.mobile) invite.mobile = rawMobile;
        await invite.save();

        const token = signToken(candidate._id, "candidate");
        return res.status(201).json({ token, candidate });
      }

      if (!accessToken) {
        return res.status(400).json({ message: "OTP verification is required before creating your student account." });
      }

      await verifyWidgetAccessToken(accessToken);

      const findCandOr = [
        { email: cleanEmail },
        ...(mobileVariants.length > 0 ? [
          { mobile: { $in: mobileVariants } },
          { "stage1.mobile": { $in: mobileVariants } },
        ] : []),
        ...mobileRegexes,
      ];

      const existing = await Candidate.findOne({ $or: findCandOr });
      if (existing && existing.isVerified) {
        return res.status(409).json({ message: "An account with this email or mobile number already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      let candidate;
      if (existing && !existing.isVerified) {
        existing.passwordHash = passwordHash;
        existing.mobile = rawMobile || existing.mobile || "";
        existing.isVerified = true;
        existing.verifiedAt = new Date();
        candidate = await existing.save();
      } else {
        candidate = await Candidate.create({
          email: cleanEmail,
          passwordHash,
          mobile: rawMobile || "",
          isVerified: true,
          verifiedAt: new Date(),
          completedStages: [],
        });
      }

      // Link any existing StudentInvite for this email OR mobile
      const inviteFindOr = [
        { email: cleanEmail },
        ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
        ...mobileRegexes,
      ];
      const matchingInvites = await StudentInvite.find({ $or: inviteFindOr });
      for (const inv of matchingInvites) {
        inv.status = "signed_up";
        inv.signupCompletedAt = new Date();
        inv.candidateId = candidate._id;
        if (rawMobile && !inv.mobile) inv.mobile = rawMobile;
        await inv.save();
      }

      const token = signToken(candidate._id, "candidate");
      res.status(201).json({ token, candidate });
    } catch (err) {
      if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
        return res.status(400).json({ message: err.message });
      }
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
        return res.status(401).json({ message: "No account found with this email. Please sign up and verify your OTP first." });
      }

      if (!candidate.isVerified) {
        return res.status(403).json({
          message: "This account has not completed OTP verification. Please sign up and verify your OTP first.",
        });
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

// POST /api/auth/demo-login - 1-Click Sandbox Candidate Login
router.post("/demo-login", async (req, res) => {
  try {
    const demoEmail = "demo.candidate@talentera.in";
    let candidate = await Candidate.findOne({ email: demoEmail });

    if (!candidate) {
      const passwordHash = await bcrypt.hash("DemoCandidate2026", 10);
      candidate = await Candidate.create({
        email: demoEmail,
        passwordHash,
        fullName: "Ananya Sharma",
        mobile: "+91 9876543210",
        isVerified: true,
        verifiedAt: new Date(),
        completedStages: [1, 2, 3, 4, 5],
        stage1: { fullName: "Ananya Sharma", mobile: "+91 9876543210" },
      });
    } else if (!candidate.isVerified) {
      candidate.isVerified = true;
      candidate.verifiedAt = new Date();
      await candidate.save();
    }

    const token = signToken(candidate._id, "candidate");
    res.json({
      token,
      candidate,
      message: "Logged in as Demo Candidate Sandbox.",
    });
  } catch (err) {
    logger.error(`Demo candidate login error: ${err.message}`);
    res.status(500).json({ message: "Failed to launch demo candidate sandbox." });
  }
});

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
