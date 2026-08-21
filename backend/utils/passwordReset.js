const logger = require("./logger");

/**
 * Shared OTP-based password-reset flow for both candidate (auth.js) and
 * company (companyAuth.js) accounts.
 *
 * Before this module existed, companyAuth.js's /forgot-password generated
 * and logged an OTP but /reset-password never actually checked it - it just
 * accepted { email, newPassword } and reset the password unconditionally.
 * That meant anyone who knew (or guessed) a company's email address could
 * take over the account with no code, no proof of email/SMS access, nothing.
 * This module makes the OTP a real gate: /reset-password now MUST be called
 * with the code from /forgot-password, verified server-side, one-time-use.
 *
 * In-memory store (same tradeoff as the existing OTP stores in otp.js /
 * aadhaarService.js) - fine for a single-process deployment; move to Redis
 * or a DB collection with a TTL index if this ever runs multi-instance.
 */
const resetStore = new Map();
const OTP_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

function storeKey(accountType, email) {
  return `${accountType}:${String(email || "").toLowerCase().trim()}`;
}

// accountType is "candidate" | "company" - keeps the two flows' OTPs in
// separate namespaces so there's no cross-account-type confusion.
function generateResetOtp(accountType, email) {
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  resetStore.set(storeKey(accountType, email), {
    otp,
    expiresAt: Date.now() + OTP_TTL_MS,
    attempts: 0,
  });

  // Never log the raw OTP outside development - see
  // IMPROVEMENT_ROADMAP.md "OTP codes are written to server logs."
  if (process.env.NODE_ENV !== "production") {
    logger.info(`[DEV ONLY] Password reset OTP for ${accountType}:${email} = ${otp}`);
  }

  return otp;
}

// Verifies the OTP and, on success, consumes it immediately so the same
// code can never be replayed for a second reset.
function verifyAndConsumeResetOtp(accountType, email, otp) {
  const k = storeKey(accountType, email);
  const record = resetStore.get(k);

  if (!record) {
    return { ok: false, message: "No password reset was requested for this email, or the code has expired. Please request a new one." };
  }
  if (Date.now() > record.expiresAt) {
    resetStore.delete(k);
    return { ok: false, message: "Reset code has expired. Please request a new one." };
  }
  if (record.attempts >= MAX_ATTEMPTS) {
    resetStore.delete(k);
    return { ok: false, message: "Too many incorrect attempts. Please request a new reset code." };
  }

  record.attempts += 1;
  if (String(otp || "").trim() !== record.otp) {
    return { ok: false, message: "Incorrect reset code." };
  }

  resetStore.delete(k);
  return { ok: true };
}

module.exports = { generateResetOtp, verifyAndConsumeResetOtp };
