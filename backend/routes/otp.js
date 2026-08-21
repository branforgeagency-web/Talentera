const express = require("express");
const axios = require("axios");
const logger = require("../utils/logger");
const { otpLimiter } = require("../middleware/rateLimit");

const router = express.Router();

// Memory cache for active email OTP codes
const localOtpStore = new Map();

function cleanEmail(identifier) {
  if (!identifier) return "";
  return identifier.trim().toLowerCase();
}

// Only ever log a real OTP code outside production. Previously this logged
// unconditionally, meaning anyone with access to production logs (hosting
// dashboard, log aggregator, a misconfigured public endpoint) could read
// live login OTP codes and take over any account mid-login. See
// IMPROVEMENT_ROADMAP.md "OTP codes are written to server logs."
function logOtpForDev(label, email, otp) {
  if (process.env.NODE_ENV === "production") return;
  logger.info(`[DEV ONLY - ${label}] Email: ${email} | OTP: ${otp}`);
}

// POST /api/otp/send - Sends 6-digit OTP via Brevo Email REST API
router.post("/send", otpLimiter, async (req, res) => {
  const { identifier, email: reqEmail } = req.body;
  const email = cleanEmail(reqEmail || identifier);

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "A valid email address is required for OTP verification." });
  }

  const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
  localOtpStore.set(email, { otp: generatedOtp, expiresAt: Date.now() + 10 * 60 * 1000 });

  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@talentera.in";
  const senderName = process.env.BREVO_SENDER_NAME || "Talentera Verification";

  const isPlaceholderKey = !brevoApiKey || brevoApiKey.includes("your_brevo_api_key");

  if (!isPlaceholderKey) {
    try {
      logger.info(`Dispatching Brevo Email OTP to ${email}`);

      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: senderName, email: senderEmail },
          to: [{ email }],
          subject: "Your Talentera Verification OTP Code",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0A1F3D; margin-top: 0; font-size: 22px;">Talentera Verification Code</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the following 6-digit OTP code to complete your verification:</p>
              <div style="background: #0A1F3D; color: #E5A82E; padding: 18px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">
                ${generatedOtp}
              </div>
              <p style="color: #64748B; font-size: 13px; margin-bottom: 0;">This OTP code is valid for 10 minutes. If you did not request this code, please ignore this email.</p>
            </div>
          `,
        },
        {
          headers: {
            "api-key": brevoApiKey,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          timeout: 10000,
        }
      );

      return res.json({
        success: true,
        message: `OTP sent successfully to ${email} via Brevo Email.`,
      });
    } catch (err) {
      const errorData = err.response?.data || err.message;
      logger.error(`Brevo Email OTP send error: ${typeof errorData === "object" ? JSON.stringify(errorData) : errorData}`);
      const errMsg = typeof errorData === "object" ? (errorData.message || errorData.code || JSON.stringify(errorData)) : errorData;

      logOtpForDev("BREVO OTP FALLBACK", email, generatedOtp);

      // In production, never hand the raw OTP back in the response either -
      // if Brevo failed to actually deliver it, the candidate has no way to
      // receive the code, but leaking it into the JSON response/network tab
      // would be exactly the same exposure as logging it.
      if (process.env.NODE_ENV === "production") {
        return res.status(502).json({
          success: false,
          message: "We couldn't send your verification email right now. Please try again in a moment.",
        });
      }

      return res.json({
        success: true,
        fallback: true,
        otpCode: generatedOtp,
        message: `Brevo Delivery Note: ${errMsg} (Development Backup Code: ${generatedOtp})`,
      });
    }
  }

  // Fallback for local development when Brevo key is not configured
  logOtpForDev("BREVO DEV OTP", email, generatedOtp);

  if (process.env.NODE_ENV === "production") {
    // A production deploy with no Brevo key configured is a config error,
    // not something to silently paper over by handing out the OTP in the
    // response body.
    return res.status(503).json({
      success: false,
      message: "Email verification is temporarily unavailable. Please try again later.",
    });
  }

  return res.json({
    success: true,
    fallback: true,
    otpCode: generatedOtp,
    message: `OTP sent to ${email} (Development Code: ${generatedOtp})`,
  });
});

// POST /api/otp/verify - Verifies Brevo Email OTP
router.post("/verify", otpLimiter, async (req, res) => {
  const { identifier, email: reqEmail, otp } = req.body;
  const email = cleanEmail(reqEmail || identifier);

  if (!email || !otp) {
    return res.status(400).json({ message: "Email and OTP code are required." });
  }

  const record = localOtpStore.get(email);

  if (!record) {
    return res.status(400).json({ message: "No OTP was requested for this email or it has expired." });
  }

  if (Date.now() > record.expiresAt) {
    localOtpStore.delete(email);
    return res.status(400).json({ message: "OTP has expired. Please request a new OTP." });
  }

  if (record.otp.trim() === otp.trim()) {
    localOtpStore.delete(email);
    const token = `brevo_token_${Date.now()}_${otp.trim()}`;
    return res.json({ success: true, accessToken: token, message: "Email OTP verified successfully." });
  }

  return res.status(400).json({ message: "Invalid OTP verification code. Please check and try again." });
});

module.exports = router;
