const axios = require("axios");
const logger = require("./logger");

const BREVO_URL = "https://api.brevo.com/v3/smtp/email";

function isBrevoConfigured() {
  const key = process.env.BREVO_API_KEY;
  return Boolean(key) && !key.includes("your_brevo_api_key");
}

/**
 * Shared transactional-email sender (candidate lifecycle emails - see
 * IMPROVEMENT_ROADMAP.md "No transactional email on funnel events" - and
 * anything else that wants to send a one-off email via Brevo). Mirrors the
 * fallback behavior already used for OTP email in routes/otp.js: if Brevo
 * isn't configured, this logs instead of throwing, so local dev and demo
 * environments keep working without an API key.
 */
async function sendTransactionalEmail({ to, toName, subject, html }) {
  if (!to || !to.includes("@")) {
    return { sent: false, reason: "invalid_recipient" };
  }

  if (!isBrevoConfigured()) {
    logger.info(`[EMAIL SKIPPED - Brevo not configured] To: ${to} | Subject: ${subject}`);
    return { sent: false, reason: "not_configured" };
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@talentera.in";
  const senderName = process.env.BREVO_SENDER_NAME || "Talentera";

  try {
    await axios.post(
      BREVO_URL,
      {
        sender: { name: senderName, email: senderEmail },
        to: [{ email: to, name: toName || undefined }],
        subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 10000,
      }
    );
    return { sent: true };
  } catch (err) {
    logger.error(`Transactional email failed (to ${to}, subject "${subject}"): ${err.response?.data?.message || err.message}`);
    return { sent: false, reason: "send_failed" };
  }
}

// Wraps a title + inner HTML in the same visual shell used by the OTP
// emails, so lifecycle emails look consistent with the rest of the product.
function wrapEmailTemplate(title, bodyHtml) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff;">
      <h2 style="color: #0A1F3D; margin-top: 0; font-size: 20px;">${title}</h2>
      ${bodyHtml}
      <p style="color: #94A3B8; font-size: 11px; margin-top: 24px; margin-bottom: 0;">Talentera &middot; The Era of Talent Begins Here</p>
    </div>
  `;
}

module.exports = { sendTransactionalEmail, wrapEmailTemplate, isBrevoConfigured };
