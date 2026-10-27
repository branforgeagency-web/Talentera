const axios = require("axios");
const logger = require("./logger");

const BREVO_SMS_URL = "https://api.brevo.com/v3/transactionalSMS/sms";

/**
 * Format a phone number into international digits format (e.g. 919876543210).
 */
function formatMobileNumber(mobile) {
  const digits = String(mobile || "").replace(/\D/g, "");
  if (!digits) return null;
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  if (digits.length >= 10) return digits;
  return null;
}

/**
 * Send a transactional SMS via Brevo (with MSG91 fallback if configured).
 */
async function sendTransactionalSms({ mobile, content }) {
  const recipient = formatMobileNumber(mobile);
  if (!recipient) {
    return { sent: false, reason: "invalid_mobile" };
  }

  const cleanContent = String(content || "").trim();
  if (!cleanContent) {
    return { sent: false, reason: "empty_content" };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const isConfigured = Boolean(apiKey) && !apiKey.includes("your_brevo_api_key");

  if (!isConfigured) {
    logger.info(`[SMS SKIPPED - Brevo not configured] To: ${recipient} | Content: ${cleanContent}`);
    return { sent: false, reason: "not_configured" };
  }

  const sender = (process.env.BREVO_SMS_SENDER || "Talentera").replace(/[^a-zA-Z0-9]/g, "").slice(0, 11) || "Talentera";

  try {
    const res = await axios.post(
      BREVO_SMS_URL,
      {
        type: "transactional",
        sender,
        recipient,
        content: cleanContent,
      },
      {
        headers: {
          "api-key": apiKey,
          "Content-Type": "application/json",
          accept: "application/json",
        },
        timeout: 10000,
      }
    );
    logger.info(`[SMS SENT] To: ${recipient} | Reference: ${res.data?.reference || res.data?.messageId || "ok"}`);
    return { sent: true, provider: "brevo", reference: res.data?.reference };
  } catch (err) {
    logger.warn(`Brevo transactional SMS failed (to ${recipient}): ${err.response?.data?.message || err.message}`);

    // Try MSG91 fallback if configured
    const msg91AuthKey = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY;
    if (msg91AuthKey) {
      try {
        const tenDigit = recipient.slice(-10);
        await axios.post(
          "https://control.msg91.com/api/v5/otp",
          null,
          {
            params: {
              template_id: process.env.MSG91_TEMPLATE_ID || "default_otp",
              mobile: `91${tenDigit}`,
              authkey: msg91AuthKey,
              otp: cleanContent,
            },
            timeout: 10000,
          }
        );
        logger.info(`[MSG91 FALLBACK SMS SENT] To: 91${tenDigit}`);
        return { sent: true, provider: "msg91" };
      } catch (msg91Err) {
        logger.warn(`MSG91 SMS fallback failed: ${msg91Err.response?.data?.message || msg91Err.message}`);
      }
    }

    return { sent: false, reason: "send_failed", error: err.message };
  }
}

module.exports = {
  sendTransactionalSms,
  formatMobileNumber,
};
