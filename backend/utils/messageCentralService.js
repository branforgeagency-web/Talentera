const axios = require("axios");
const logger = require("./logger");

/**
 * Message Central (eKYCNow) Identity Verification Service
 * Documentation: https://ekyc.messagecentral.com
 *
 * Supported Flow:
 * 1. POST /aadhaar/digilocker-url -> Generates DigiLocker verification URL
 * 2. GET /aadhaar/url-status -> Checks if candidate verified via UIDAI OTP
 * 3. GET /aadhaar/get-document -> Fetches full verified Name, DOB, Gender, and Address
 */
class MessageCentralService {
  constructor() {
    this.apiKey = (process.env.MESSAGECENTRAL_API_KEY || "").trim();
    this.customerId = (process.env.CUSTOMER_ID || process.env.MESSAGECENTRAL_CUSTOMER_ID || "").trim();
    this.baseUrl = "https://ekyc.messagecentral.com/ekycbusiness/api/v1";
  }

  /**
   * Helper: Build standard Message Central headers
   */
  getHeaders(extraHeaders = {}) {
    const rawApiKey = this.apiKey.replace(/^Bearer\s+/i, "");
    return {
      api_key: `Bearer ${rawApiKey}`,
      customer_id: String(this.customerId),
      "Content-Type": "application/json",
      accept: "application/json",
      ...extraHeaders,
    };
  }

  /**
   * Check if credentials are configured
   */
  hasCredentials() {
    return Boolean(this.apiKey && this.customerId);
  }

  /**
   * Helper: Mask 12-digit Aadhaar Number -> XXXX XXXX 1234
   */
  maskAadhaar(aadhaarNumber) {
    const clean = String(aadhaarNumber || "").replace(/\D/g, "");
    if (clean.length < 4) return "XXXX XXXX XXXX";
    return `XXXX XXXX ${clean.slice(-4)}`;
  }

  /**
   * 1. Generate DigiLocker Aadhaar Verification URL
   * @param {string} redirectionUrl - URL to redirect candidate after verification
   * @param {string} userFlow - 'signup' or 'signin'
   */
  async generateDigilockerUrl(redirectionUrl, userFlow = "signup") {
    if (!this.hasCredentials()) {
      throw new Error("Message Central credentials (MESSAGECENTRAL_API_KEY / CUSTOMER_ID) not configured.");
    }

    let safeRedirect = (
      redirectionUrl ||
      process.env.MESSAGECENTRAL_REDIRECT_URL ||
      "https://localhost:5173/wizard?stage=1&mc_done=1" ||
      "https://talentera-nine.vercel.app/wizard?stage=1&mc_done=1"
    ).trim();

    // Message Central strictly requires redirect_url to start with https://
    if (safeRedirect.startsWith("http://")) {
      safeRedirect = safeRedirect.replace(/^http:\/\//i, "https://");
    } else if (!safeRedirect.startsWith("https://")) {
      safeRedirect = `https://${safeRedirect}`;
    }

    const endpoint = `${this.baseUrl}/aadhaar/digilocker-url`;
    logger.info(`[MESSAGECENTRAL] Requesting DigiLocker URL via ${endpoint} for Customer ${this.customerId}...`);

    try {
      const response = await axios.post(
        endpoint,
        {},
        {
          headers: this.getHeaders({
            redirection_url: safeRedirect,
            user_flow: userFlow || "signup",
          }),
          timeout: 20000,
        }
      );

      const respData = response.data || {};
      if (respData.response_code && respData.response_code !== 200) {
        const errMsg =
          respData.error_message ||
          respData.message ||
          (respData.error_data && JSON.stringify(respData.error_data)) ||
          `Message Central rejected request (code ${respData.response_code})`;
        logger.error(`[MESSAGECENTRAL ERROR] generateDigilockerUrl: ${errMsg}`);
        throw new Error(errMsg);
      }

      const data = respData.api_data || respData.data || respData;
      const verificationId = data.verification_id || respData.request_id || "";
      const referenceId = data.reference_id || "";
      const url = data.url || "";

      if (!url) {
        throw new Error(respData.error_message || respData.message || "Failed to generate verification URL from Message Central.");
      }

      logger.info(`[MESSAGECENTRAL] DigiLocker URL generated successfully: ${url}`);

      return {
        success: true,
        verificationId,
        referenceId,
        url,
        status: data.status || "PENDING",
      };
    } catch (err) {
      if (!err.response) {
        if (!err.message.includes("[MESSAGECENTRAL ERROR]")) {
          logger.error(`[MESSAGECENTRAL ERROR] generateDigilockerUrl: ${err.message}`);
        }
        throw err;
      }

      const statusCode = err.response?.status;
      const errData = err.response?.data;
      const errorMsg = errData?.error_message || errData?.message || JSON.stringify(errData) || err.message;
      logger.error(
        `[MESSAGECENTRAL ERROR] generateDigilockerUrl HTTP ${statusCode}: ${errorMsg}`
      );
      if (statusCode === 402) {
        throw new Error(
          `Message Central account has insufficient credits or the eKYC plan is not activated. ` +
          `Please top up your account at https://ekyc.messagecentral.com and ensure the Aadhaar/DigiLocker product is enabled. ` +
          `(Raw: ${JSON.stringify(errData)})`
        );
      }
      if (statusCode === 401) {
        throw new Error(
          `Message Central API authentication failed. Please check MESSAGECENTRAL_API_KEY and CUSTOMER_ID in backend/.env. ` +
          `(Raw: ${JSON.stringify(errData)})`
        );
      }
      throw new Error(errData?.error_message || errData?.message || err.message || "Failed to initiate Aadhaar verification session.");
    }
  }

  /**
   * 2. Check Verification URL Status
   * @param {string|number} referenceId
   * @param {string} digilockerRequestId
   */
  async getUrlStatus(referenceId, digilockerRequestId) {
    if (!this.hasCredentials()) {
      throw new Error("Message Central credentials not configured.");
    }

    const endpoint = `${this.baseUrl}/aadhaar/url-status`;
    logger.info(`[MESSAGECENTRAL] Checking URL status for Ref: ${referenceId}, Req: ${digilockerRequestId}...`);

    try {
      const response = await axios.get(endpoint, {
        headers: this.getHeaders({
          ...(referenceId ? { reference_id: String(referenceId) } : {}),
          ...(digilockerRequestId ? {
            digilocker_request_id: String(digilockerRequestId),
            verification_id: String(digilockerRequestId),
          } : {}),
        }),
        timeout: 15000,
      });

      const respData = response.data || {};
      if (respData.response_code && respData.response_code !== 200) {
        const errMsg = respData.error_message || respData.message || "Failed to check verification status.";
        throw new Error(errMsg);
      }

      return respData.api_data || respData.data || respData;
    } catch (err) {
      if (!err.response) throw err;
      const errData = err.response?.data;
      const errMsg = errData?.error_message || errData?.message || JSON.stringify(errData) || err.message;
      logger.error(`[MESSAGECENTRAL ERROR] getUrlStatus: ${errMsg}`);
      throw new Error(errData?.error_message || errData?.message || err.message || "Failed to check verification status.");
    }
  }

  /**
   * 3. Fetch Decrypted Aadhaar Document & Demographics
   * @param {string|number} referenceId
   * @param {string} digilockerRequestId
   */
  async getDocument(referenceId, digilockerRequestId) {
    if (!this.hasCredentials()) {
      throw new Error("Message Central credentials not configured.");
    }

    const endpoint = `${this.baseUrl}/aadhaar/get-document`;
    logger.info(`[MESSAGECENTRAL] Fetching Aadhaar document for Ref: ${referenceId}, Req: ${digilockerRequestId}...`);

    try {
      const response = await axios.get(endpoint, {
        headers: this.getHeaders({
          ...(referenceId ? { reference_id: String(referenceId) } : {}),
          ...(digilockerRequestId ? {
            digilocker_request_id: String(digilockerRequestId),
            verification_id: String(digilockerRequestId),
          } : {}),
        }),
        timeout: 20000,
      });

      const respData = response.data || {};
      if (respData.response_code && respData.response_code !== 200) {
        if (respData.response_code === 202 || respData.error_data?.code === "validation_pending") {
          throw new Error("DigiLocker verification is still in progress. Please enter your OTP on the official UIDAI page and try again.");
        }
        const errMsg = respData.error_message || respData.message || "Failed to retrieve verified Aadhaar document.";
        throw new Error(errMsg);
      }

      const rootData = respData.api_data || respData.data || respData;
      return this.parseDemographics(rootData);
    } catch (err) {
      if (!err.response) throw err;
      const errData = err.response?.data;
      const errMsg = errData?.error_message || errData?.message || JSON.stringify(errData) || err.message;
      logger.error(`[MESSAGECENTRAL ERROR] getDocument: ${errMsg}`);
      throw new Error(errData?.error_message || errData?.message || err.message || "Failed to retrieve verified Aadhaar document.");
    }
  }

  /**
   * Helper: Parse demographics across varied UIDAI XML/JSON formats
   */
  parseDemographics(data) {
    const raw = data.document_data || data.aadhaar_data || data.user_data || data;
    const splitAddr = raw.split_address || raw.splitAddress || raw.address_split || {};

    const fullName = raw.name || raw.full_name || raw.user_name || raw.candidate_name || "Verified Candidate";
    const dob = raw.dob || raw.date_of_birth || raw.birth_date || "";
    
    let gender = raw.gender || "Not Specified";
    if (gender === "M" || gender === "m") gender = "Male";
    if (gender === "F" || gender === "f") gender = "Female";
    if (gender === "T" || gender === "t") gender = "Transgender";

    const careOf = raw.care_of || raw.careof || raw.father_name || splitAddr.care_of || "";

    const fullAddress = raw.address || raw.full_address || [
      splitAddr.house || splitAddr.building,
      splitAddr.street,
      splitAddr.landmark,
      splitAddr.locality || splitAddr.vtc || splitAddr.district || splitAddr.city,
      splitAddr.state,
      splitAddr.pincode,
    ].filter(Boolean).join(", ") || "";

    const city = splitAddr.district || splitAddr.city || splitAddr.vtc || raw.district || raw.city || "Chennai";
    const district = splitAddr.district || raw.district || city;
    const state = splitAddr.state || raw.state || "Tamil Nadu";
    const pincode = splitAddr.pincode || raw.pincode || raw.zip || "";
    const photoUrl = raw.photo || raw.photo_link || raw.image || null;

    const rawAadhaar = raw.aadhaar_number || raw.masked_aadhaar || raw.uid || "";
    const maskedAadhaar = rawAadhaar ? this.maskAadhaar(rawAadhaar) : "XXXX XXXX 1234";

    return {
      success: true,
      verified: true,
      status: "VERIFIED",
      maskedAadhaar,
      name: fullName,
      fullName,  // alias for convenience
      dob,
      gender,
      careOf,
      address: fullAddress,
      city,
      district,
      state,
      pincode,
      photoUrl,
      verificationMethod: "Message Central eKYCNow (DigiLocker UIDAI Verified)",
      verifiedAt: new Date(),
    };
  }
}

const messageCentralService = new MessageCentralService();

module.exports = {
  MessageCentralService,
  messageCentralService,
};
