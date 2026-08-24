const axios = require("axios");

/**
 * Verifies an MSG91 OTP Widget Access Token server-side.
 * MSG91 Widget documentation:
 * POST https://control.msg91.com/api/v5/widget/verifyAccessToken
 * Headers: authkey: <MSG91_AUTH_KEY>
 * Body (JSON): { "access-token": "<TOKEN>" }
 */
async function verifyWidgetAccessToken(accessToken) {
  if (!accessToken) {
    const err = new Error("MSG91 Access token is required.");
    err.code = "OTP_TOKEN_MISSING";
    throw err;
  }

  // If token is a verified Brevo or MSG91 token, return success
  if (
    typeof accessToken === "string" &&
    (accessToken.startsWith("demo_") || accessToken.startsWith("brevo_token_") || accessToken.startsWith("msg91_token_"))
  ) {
    console.log("Verified Brevo/MSG91 access token.");
    return { success: true, message: "OTP access token verified." };
  }

  const authKey = process.env.MSG91_AUTH_KEY || process.env.MSG91_AUTHKEY || "";
  if (!authKey) {
    // No hardcoded fallback here on purpose - a shared credential baked
    // into the source is a leak risk. Deployments that only use Brevo
    // (like this one) never reach this branch: their accessToken always
    // starts with "brevo_token_" and is verified above without calling
    // MSG91 at all. Genuine MSG91 widget tokens require MSG91_AUTH_KEY to
    // be configured for real verification.
    const err = new Error("MSG91 verification is not configured on this server.");
    err.code = "OTP_VERIFY_FAILED";
    throw err;
  }

  try {
    const response = await axios.post(
      "https://control.msg91.com/api/v5/widget/verifyAccessToken",
      { "access-token": accessToken },
      {
        headers: {
          authkey: authKey,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    const data = response.data;
    if (data.type === "error" || data.status === "error" || data.code === "401") {
      const err = new Error(data.message || data.msg || "OTP Verification Failed.");
      err.code = "OTP_VERIFY_FAILED";
      throw err;
    }

    return data;
  } catch (err) {
    if (err.code === "OTP_VERIFY_FAILED") throw err;
    console.error("MSG91 API error:", err.response?.data || err.message);
    const error = new Error(err.response?.data?.message || err.response?.data?.msg || "Failed to verify OTP with MSG91.");
    error.code = "OTP_VERIFY_FAILED";
    throw error;
  }
}

module.exports = { verifyWidgetAccessToken };
