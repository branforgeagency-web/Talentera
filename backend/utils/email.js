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
function wrapEmailTemplate(title, bodyHtml, opts = {}) {
  const cta = opts && opts.cta && opts.cta.url ? opts.cta : null;
  const pre = opts && opts.preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${opts.preheader}</div>` : "";
  const button = cta
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:22px 0 4px;"><tr><td style="background:#F5B41A;border-radius:8px;"><a href="${cta.url}" style="display:inline-block;padding:12px 26px;font-family:Arial,Helvetica,sans-serif;font-size:14px;font-weight:700;color:#0F172A;text-decoration:none;">${cta.label || "Open Talentera"}</a></td></tr></table>`
    : "";
  return `
    ${pre}
    <div style="background:#F1F5F9;padding:28px 12px;font-family:Arial,Helvetica,sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0A1F3D;padding:18px 28px;">
          <span style="font-size:20px;font-weight:800;color:#ffffff;letter-spacing:.3px;">Talent<span style="color:#F5B41A;">era</span></span>
        </td></tr>
        <tr><td style="padding:28px 28px 8px;">
          <h2 style="margin:0 0 14px;color:#0A1F3D;font-size:20px;line-height:1.3;">${title}</h2>
          <div style="color:#334155;font-size:14.5px;line-height:1.6;">${bodyHtml}</div>
          ${button}
        </td></tr>
        <tr><td style="padding:18px 28px 24px;">
          <div style="border-top:1px solid #E2E8F0;padding-top:14px;color:#94A3B8;font-size:11.5px;line-height:1.5;">
            This is an automated message from Talentera. Please do not reply to this email.<br/>Talentera &middot; The Era of Talent Begins Here
          </div>
        </td></tr>
      </table>
    </div>
  `;
}

module.exports = { sendTransactionalEmail, wrapEmailTemplate, isBrevoConfigured };
