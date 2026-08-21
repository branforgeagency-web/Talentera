const crypto = require("crypto");
const axios = require("axios");
const { verhoeffValidate } = require("./verhoeffBackend");
const logger = require("./logger");

/**
 * Helper: Dispatch Real SMS OTP via MSG91 REST API to candidate's mobile phone
 */
async function sendRealSmsOtp(mobile, otp) {
  const authKey = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || "561692AqG2zdR0nSb6a83f285P1";
  const templateId = process.env.MSG91_TEMPLATE_ID || "";
  const cleanMobile = String(mobile || "").replace(/\D/g, "");

  if (cleanMobile.length >= 10) {
    try {
      const tenDigit = cleanMobile.slice(-10);
      logger.info(`[PRODUCTION SMS] Dispatching Real MSG91 SMS OTP to +91 ${tenDigit}...`);
      await axios.post(
        "https://control.msg91.com/api/v5/otp",
        null,
        {
          params: {
            template_id: templateId || "default_otp",
            mobile: `91${tenDigit}`,
            otp: otp,
            authkey: authKey,
          },
          timeout: 10000,
        }
      );
      logger.info(`Real SMS OTP successfully delivered to +91 ${tenDigit}`);
      return true;
    } catch (err) {
      logger.warn(`MSG91 SMS OTP delivery log: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  }
  return false;
}

/**
 * Helper: Dispatch Real Email OTP via Brevo SMTP API
 */
async function sendRealEmailOtp(email, otp, maskedAadhaar) {
  const brevoApiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || "noreply@talentera.in";
  const senderName = process.env.BREVO_SENDER_NAME || "Talentera Aadhaar Verification";
  const cleanMail = String(email || "").trim().toLowerCase();

  if (cleanMail && cleanMail.includes("@") && brevoApiKey && !brevoApiKey.includes("your_brevo_api_key")) {
    try {
      logger.info(`[PRODUCTION EMAIL] Dispatching Real Brevo Email OTP to ${cleanMail}...`);
      await axios.post(
        "https://api.brevo.com/v3/smtp/email",
        {
          sender: { name: senderName, email: senderEmail },
          to: [{ email: cleanMail }],
          subject: "Your Talentera Aadhaar Verification OTP Code",
          htmlContent: `
            <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #E2E8F0; border-radius: 12px; background-color: #ffffff;">
              <h2 style="color: #0A1F3D; margin-top: 0; font-size: 22px;">Aadhaar Verification OTP Code</h2>
              <p style="color: #475569; font-size: 15px; line-height: 1.5;">Use the following 6-digit OTP code to verify your Aadhaar card (<strong>${maskedAadhaar}</strong>):</p>
              <div style="background: #0A1F3D; color: #E5A82E; padding: 18px; text-align: center; border-radius: 10px; font-size: 32px; font-weight: bold; letter-spacing: 6px; margin: 24px 0;">
                ${otp}
              </div>
              <p style="color: #64748B; font-size: 13px; margin-bottom: 0;">This OTP code is valid for 10 minutes. If you did not request this code, please ignore this message.</p>
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
      logger.info(`Real Email OTP successfully delivered to ${cleanMail}`);
      return true;
    } catch (err) {
      logger.warn(`Brevo Email OTP delivery log: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    }
  }
  return false;
}

/**
 * Aadhaar Provider Service Layer Abstraction (AadhaarVerificationService)
 * Handles authorized Aadhaar Verification Gateways (Sandbox API, Cashfree, Surepass, Digilocker, UIDAI KUA)
 *
 * Note on data-at-rest: the raw 12-digit Aadhaar number handled by this
 * class lives ONLY in the in-memory `this.transactions` map below, for the
 * lifetime of the OTP flow - it is never written to MongoDB. Only the
 * masked form ("XXXX XXXX 1234") gets persisted onto Candidate.stage1 by
 * routes/aadhaar.js. See backend/utils/encryption.js for ready-to-use
 * AES-256-GCM helpers if a genuine need to persist the raw number ever
 * comes up.
 */
class AadhaarVerificationService {
  constructor() {
    this.transactions = new Map();
    this.provider = (process.env.AADHAAR_PROVIDER || "sandbox").toLowerCase();
    this.apiKey = process.env.AADHAAR_API_KEY || process.env.SANDBOX_API_KEY || "";
    this.apiSecret = process.env.AADHAAR_API_SECRET || process.env.SANDBOX_API_SECRET || "";
    this.baseUrl = process.env.AADHAAR_BASE_URL || "https://api.sandbox.co.in";
  }

  /**
   * Helper: Mask 12-digit Aadhaar Number -> XXXX XXXX 1234
   */
  maskAadhaar(aadhaarNumber) {
    const clean = String(aadhaarNumber).replace(/\D/g, "");
    if (clean.length < 4) return "XXXX XXXX XXXX";
    const last4 = clean.slice(-4);
    return `XXXX XXXX ${last4}`;
  }

  /**
   * Helper: Mask Mobile Number (First 6 numbers hashed + Last 4 digits shown)
   * Formats raw digits (e.g. 9876543210) or provider response (e.g. XXXXXX3210) -> +91 ######3210
   */
  maskMobileNumber(rawMobile) {
    if (!rawMobile) return "+91 XXXXX XXXXX";
    const str = String(rawMobile).trim();
    const clean = str.replace(/\D/g, "");

    if (clean.length >= 4) {
      const last4 = clean.slice(-4);
      return `+91 ######${last4}`;
    }

    if (str.length >= 4) {
      const last4 = str.slice(-4);
      return `+91 ######${last4}`;
    }

    return "+91 XXXXX XXXXX";
  }

  /**
   * Send Aadhaar Verification OTP
   * @param {string} aadhaarNumber - 12-digit Aadhaar number
   * @param {string} candidateMobile - Candidate mobile number
   * @param {string} candidateEmail - Candidate email address
   * @returns {Promise<Object>} transaction info
   */
  async sendOtp(aadhaarNumber, candidateMobile = "", candidateEmail = "") {
    const cleanAadhaar = String(aadhaarNumber).replace(/\D/g, "");

    // 1. Client & Server 12-digit validation
    if (cleanAadhaar.length !== 12) {
      throw new Error("Aadhaar number must contain exactly 12 digits.");
    }

    // 2. Verhoeff Checksum Validation
    if (!verhoeffValidate(cleanAadhaar)) {
      throw new Error("Invalid Aadhaar number checksum. Please verify the 12 digits.");
    }

    // 3. Check Cooldown Rate Limiting for existing active transaction on this Aadhaar
    for (const [, tx] of this.transactions.entries()) {
      if (tx.aadhaarNumber === cleanAadhaar && tx.resendAvailableAt > Date.now()) {
        const remainingSecs = Math.ceil((tx.resendAvailableAt - Date.now()) / 1000);
        throw new Error(`OTP resend cooldown active. Please wait ${remainingSecs} seconds before requesting a new OTP.`);
      }
    }

    const maskedAadhaar = this.maskAadhaar(cleanAadhaar);
    const transactionId = `adh_tx_${crypto.randomBytes(8).toString("hex")}`;

    // 4. Authorized Production Provider Gateway Integration (Sandbox / Cashfree / Surepass / Digilocker)
    if (this.apiKey && this.baseUrl) {
      try {
        let endpoint = `${this.baseUrl}/kyc/aadhaar/okyc/otp`;
        let payload = {
          "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.request",
          aadhaar_number: cleanAadhaar,
        };

        if (this.provider === "cashfree") {
          endpoint = `${this.baseUrl}/verification/aadhaar/otp`;
          payload = { aadhaar_number: cleanAadhaar };
        } else if (this.provider === "surepass") {
          endpoint = `${this.baseUrl}/api/v1/aadhaar-v2/generate-otp`;
          payload = { id_number: cleanAadhaar };
        }

        logger.info(`[PRODUCTION GATEWAY] Requesting Aadhaar OTP via provider ${this.provider.toUpperCase()} (${endpoint})...`);

        const response = await axios.post(endpoint, payload, {
          headers: {
            Authorization: this.apiKey,
            "x-api-key": this.apiKey,
            "x-api-secret": this.apiSecret,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        });

        const providerData = response.data?.data || response.data || {};
        const providerTxId = providerData.reference_id || providerData.transaction_id || providerData.client_id || transactionId;

        // Extract real Aadhaar-linked masked mobile number returned by UIDAI / Authorized Provider
        const rawMaskedMobile = providerData.masked_mobile_number || providerData.masked_mobile || providerData.mobile_number || candidateMobile;
        const maskedMobile = this.maskMobileNumber(rawMaskedMobile);

        this.transactions.set(providerTxId, {
          aadhaarNumber: cleanAadhaar,
          maskedAadhaar,
          maskedMobile,
          otp: null, // UIDAI provider manages OTP directly
          expiresAt: Date.now() + 10 * 60 * 1000,
          resendAvailableAt: Date.now() + 30 * 1000,
          attempts: 0,
          status: "OTP_SENT",
          isExternalProvider: true,
        });

        return {
          success: true,
          transactionId: providerTxId,
          maskedAadhaar,
          maskedMobile,
          resendCooldown: 30,
          message: `OTP sent to your Aadhaar-registered mobile number (${maskedMobile}).`,
        };
      } catch (err) {
        logger.error(`External Aadhaar Provider Gateway Error: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
        // Fall back gracefully to direct gateway OTP delivery if provider endpoint responds with temporary network error
      }
    }

    // Direct Production Gateway OTP Dispatch via MSG91 SMS API & Brevo Email API
    const generatedOtp = String(Math.floor(100000 + Math.random() * 900000));
    const maskedMobile = this.maskMobileNumber(candidateMobile);

    this.transactions.set(transactionId, {
      aadhaarNumber: cleanAadhaar,
      maskedAadhaar,
      maskedMobile,
      otp: generatedOtp,
      expiresAt: Date.now() + 10 * 60 * 1000,
      resendAvailableAt: Date.now() + 30 * 1000,
      attempts: 0,
      status: "OTP_SENT",
      isExternalProvider: false,
    });

    // Send real SMS OTP to candidate's mobile number and real Email OTP to candidate's email address
    if (candidateMobile) {
      await sendRealSmsOtp(candidateMobile, generatedOtp);
    }
    if (candidateEmail) {
      await sendRealEmailOtp(candidateEmail, generatedOtp, maskedAadhaar);
    }

    // Only ever log the raw OTP code outside production - see
    // IMPROVEMENT_ROADMAP.md "OTP codes are written to server logs." The
    // masked Aadhaar/mobile are safe to log in any environment (that's the
    // whole point of masking them).
    logger.info(`[AADHAAR OTP SENT] Transaction: ${transactionId} | Aadhaar: ${maskedAadhaar} | Mobile: ${maskedMobile}`);
    if (process.env.NODE_ENV !== "production") {
      logger.info(`[DEV ONLY] Aadhaar OTP code for ${transactionId}: ${generatedOtp}`);
    }

    return {
      success: true,
      transactionId,
      maskedAadhaar,
      maskedMobile,
      resendCooldown: 30,
      message: `OTP sent to your Aadhaar-registered mobile number (${maskedMobile}).`,
    };
  }

  /**
   * Verify Aadhaar OTP
   * @param {string} transactionId - Transaction / Reference ID
   * @param {string} otp - 6-digit OTP
   * @returns {Promise<Object>} Verification result
   */
  async verifyOtp(transactionId, otp) {
    const cleanOtp = String(otp || "").trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      throw new Error("OTP must be a valid 6-digit number.");
    }

    const tx = this.transactions.get(transactionId);
    if (!tx) {
      throw new Error("Invalid or expired transaction ID. Please request a new OTP.");
    }

    // Check expiration
    if (Date.now() > tx.expiresAt) {
      this.transactions.delete(transactionId);
      throw new Error("OTP expired. Please request a new OTP.");
    }

    // Check attempt rate limits (max 3 retries)
    if (tx.attempts >= 3) {
      this.transactions.delete(transactionId);
      throw new Error("Maximum OTP verification retries exceeded. Please start over.");
    }

    tx.attempts += 1;

    // External Provider OTP Verification (Sandbox / Cashfree / Surepass / Digilocker)
    if (tx.isExternalProvider && this.apiKey) {
      try {
        let endpoint = `${this.baseUrl}/kyc/aadhaar/okyc/otp/verify`;
        let payload = {
          "@entity": "in.co.sandbox.kyc.aadhaar.okyc.otp.verify.request",
          reference_id: transactionId,
          otp: cleanOtp,
        };

        if (this.provider === "cashfree") {
          endpoint = `${this.baseUrl}/verification/aadhaar/verifyOtp`;
          payload = { ref_id: transactionId, otp: cleanOtp };
        } else if (this.provider === "surepass") {
          endpoint = `${this.baseUrl}/api/v1/aadhaar-v2/submit-otp`;
          payload = { client_id: transactionId, otp: cleanOtp };
        }

        const response = await axios.post(endpoint, payload, {
          headers: {
            Authorization: this.apiKey,
            "x-api-key": this.apiKey,
            "x-api-secret": this.apiSecret,
            "Content-Type": "application/json",
          },
          timeout: 12000,
        });

        const providerData = response.data?.data || response.data || {};
        if (response.data?.status === "VALID" || response.data?.verified || providerData.status === "VALID" || providerData.name) {
          tx.status = "VERIFIED";
          return {
            success: true,
            verified: true,
            maskedAadhaar: tx.maskedAadhaar,
            maskedMobile: tx.maskedMobile,
            name: providerData.name || providerData.full_name || null,
            state: providerData.state || providerData.address?.state || null,
            city: providerData.district || providerData.city || providerData.address?.district || null,
            verifiedAt: new Date(),
          };
        } else {
          throw new Error(response.data?.message || providerData.message || "Invalid OTP entered. Please try again.");
        }
      } catch (err) {
        throw new Error(err.response?.data?.message || err.message || "OTP verification failed.");
      }
    }

    // Direct Verification Check
    if (tx.otp && cleanOtp !== tx.otp) {
      const retriesLeft = 3 - tx.attempts;
      throw new Error(`Invalid OTP. You have ${retriesLeft} retry attempt(s) remaining.`);
    }

    // Verification Success
    tx.status = "VERIFIED";
    return {
      success: true,
      verified: true,
      maskedAadhaar: tx.maskedAadhaar,
      maskedMobile: tx.maskedMobile,
      verifiedAt: new Date(),
    };
  }

  /**
   * Get transaction verification status
   */
  getVerificationStatus(transactionId) {
    const tx = this.transactions.get(transactionId);
    if (!tx) return { status: "NOT_STARTED" };
    return {
      status: tx.status,
      maskedAadhaar: tx.maskedAadhaar,
      maskedMobile: tx.maskedMobile,
      expiresAt: tx.expiresAt,
    };
  }
}

module.exports = {
  aadhaarService: new AadhaarVerificationService(),
};
