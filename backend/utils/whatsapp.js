const axios = require("axios");
const { formatMobileNumber, sendTransactionalSms } = require("./sms");
const logger = require("./logger");

const BREVO_WHATSAPP_URL = "https://api.brevo.com/v3/whatsapp/sendMessage";

/**
 * Send a transactional WhatsApp message via Brevo WhatsApp API / MSG91 WhatsApp API.
 * Falls back to transactional SMS if WhatsApp service is unconfigured or encounters an error,
 * guaranteeing the candidate receives the alert on their phone.
 */
async function sendWhatsAppMessage({ mobile, message, candidateName, smsFallback = true }) {
  const recipient = formatMobileNumber(mobile);
  if (!recipient) {
    return { sent: false, reason: "invalid_mobile" };
  }

  const cleanMessage = String(message || "").trim();
  if (!cleanMessage) {
    return { sent: false, reason: "empty_content" };
  }

  const apiKey = process.env.BREVO_API_KEY;
  const isConfigured = Boolean(apiKey) && !apiKey.includes("your_brevo_api_key");

  // 1. Attempt Brevo WhatsApp API if configured
  if (isConfigured) {
    try {
      const senderNumber = process.env.BREVO_WHATSAPP_SENDER || process.env.WHATSAPP_SENDER || "";
      const payload = {
        contactNumber: recipient,
        text: cleanMessage,
      };
      if (senderNumber) {
        payload.senderNumber = senderNumber;
      }

      const res = await axios.post(
        BREVO_WHATSAPP_URL,
        payload,
        {
          headers: {
            "api-key": apiKey,
            "Content-Type": "application/json",
            accept: "application/json",
          },
          timeout: 10000,
        }
      );

      logger.info(`[WHATSAPP SENT via Brevo] To: ${recipient} | Ref: ${res.data?.reference || res.data?.messageId || "ok"}`);
      return { sent: true, provider: "brevo_whatsapp", reference: res.data?.reference };
    } catch (brevoErr) {
      logger.warn(`Brevo WhatsApp API call log (${recipient}): ${brevoErr.response?.data?.message || brevoErr.message}`);
    }
  }

  // 2. Attempt MSG91 WhatsApp Outbound API if configured
  const msg91AuthKey = process.env.MSG91_AUTHKEY || process.env.MSG91_AUTH_KEY;
  if (msg91AuthKey) {
    try {
      const tenDigit = recipient.slice(-10);
      await axios.post(
        "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/",
        {
          integrated_number: process.env.MSG91_WHATSAPP_NUMBER || "919876543210",
          content_type: "text",
          payload: {
            to: `91${tenDigit}`,
            type: "text",
            text: {
              body: cleanMessage,
            },
          },
        },
        {
          headers: {
            authkey: msg91AuthKey,
            "Content-Type": "application/json",
          },
          timeout: 10000,
        }
      );
      logger.info(`[WHATSAPP SENT via MSG91] To: 91${tenDigit}`);
      return { sent: true, provider: "msg91_whatsapp" };
    } catch (msg91Err) {
      logger.warn(`MSG91 WhatsApp API call log: ${msg91Err.response?.data?.message || msg91Err.message}`);
    }
  }

  if (!smsFallback) return { sent: false, provider: "none", reason: "whatsapp_not_configured" };

  // 3. Fallback: Dispatch via high-priority transactional SMS so candidate is notified on phone
  logger.info(`[WHATSAPP FALLBACK TO SMS] Delivering notification to ${recipient} via SMS...`);
  const smsResult = await sendTransactionalSms({ mobile, content: cleanMessage });
  return {
    sent: smsResult.sent,
    provider: smsResult.sent ? "sms_fallback" : "failed",
    reason: smsResult.reason,
  };
}

module.exports = {
  sendWhatsAppMessage,
};
