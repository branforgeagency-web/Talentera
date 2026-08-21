const rateLimit = require("express-rate-limit");

/**
 * Login/register throttling. Previously nothing on these routes was rate
 * limited at all - see IMPROVEMENT_ROADMAP.md "No rate limiting anywhere."
 * Keyed by IP (express-rate-limit's default), which is a coarse but
 * standard first line of defense against scripted brute-forcing.
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many attempts from this device. Please wait a few minutes and try again." },
});

/**
 * Tighter limit for OTP send/verify and password-reset-code endpoints -
 * these are the most brute-forceable (6-digit codes) and the most damaging
 * if abused (account takeover, and for /send, SMS/email delivery cost).
 */
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many OTP requests. Please wait a few minutes before trying again." },
});

module.exports = { authLimiter, otpLimiter };
