import React, { useEffect, useState } from "react";
import api from "../api/client";
import { formatAadhaar, validateAadhaarNumber } from "../utils/verhoeff";
import { useToast } from "./Toast.jsx";

/**
 * Authorized UIDAI Aadhaar Verification Card
 * Method:
 * 1. Aadhaar number verification via UIDAI's own official, free "Verify an
 *    Aadhaar Number" tool (myaadhaar.uidai.gov.in/verifyAadhaar) - the only
 *    genuine UIDAI service that confirms an Aadhaar number exists and
 *    returns age band/gender/state without a full OTP e-KYC. It's
 *    CAPTCHA-protected with no API, so this opens it in a real embedded
 *    browser session that the candidate drives themselves - see
 *    backend/utils/aadhaarLiveVerifySession.js for the full rationale.
 * 2. OTP Detection & Verification:
 *    Sends OTP to the Aadhaar-linked mobile via the real Cashfree Aadhaar
 *    OKYC integration and verifies it. UIDAI never discloses the mobile
 *    number itself to anyone - only the OTP proves possession of it.
 */
export default function AadhaarOtpVerificationCard({
  initialStatus = "NOT_STARTED",
  existingMaskedAadhaar = "",
  candidateMobile = "",
  onVerificationSuccess,
  onStatusChange,
}) {
  const toast = useToast();

  const [status, setStatus] = useState(
    existingMaskedAadhaar || initialStatus === "VERIFIED" ? "VERIFIED" : "NOT_STARTED"
  ); // NOT_STARTED | NUMBER_VERIFIED | OTP_SENT | VERIFIED

  const [aadhaarInput, setAadhaarInput] = useState(existingMaskedAadhaar || "");
  const [transactionId, setTransactionId] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState(existingMaskedAadhaar || "");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [devOtpUsed, setDevOtpUsed] = useState(false);

  // Live UIDAI verification session (real embedded browser on UIDAI's own
  // official checker - see aadhaarLiveVerifySession.js)
  const [liveSession, setLiveSession] = useState(null); // { sessionId, liveViewUrl, verifyUrl }
  const [uidaiInfo, setUidaiInfo] = useState(null); // { ageBand, gender, state } - real, from UIDAI's page
  const [verifiedVia, setVerifiedVia] = useState(null); // "live" (real UIDAI page) | "format" (checksum-only fallback)

  const [startingLiveVerify, setStartingLiveVerify] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Resend OTP 30s Countdown Timer
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const cleanDigits = aadhaarInput.replace(/\D/g, "");
  const aadhaarValidation = validateAadhaarNumber(cleanDigits);
  const isAadhaarValid = aadhaarValidation.valid;

  // Notify parent on status changes
  useEffect(() => {
    if (onStatusChange) onStatusChange(status);
  }, [status, onStatusChange]);

  // Resend Countdown Interval
  useEffect(() => {
    let interval;
    if (status === "OTP_SENT" && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [status, resendTimer]);

  function handleAadhaarChange(e) {
    const formatted = formatAadhaar(e.target.value);
    setAadhaarInput(formatted);
    setErrorMsg("");
  }

  // --- Step 1a: Open a real, human-driven UIDAI verification session ---
  async function handleStartLiveVerify(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAadhaarValid) {
      setErrorMsg(aadhaarValidation.error || "Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    setErrorMsg("");
    setUidaiInfo(null);
    setStartingLiveVerify(true);

    try {
      const res = await api.post("/aadhaar/live-verify/start", { aadhaar: cleanDigits });
      if (res.data && res.data.success) {
        setLiveSession({
          sessionId: res.data.sessionId,
          liveViewUrl: res.data.liveViewUrl,
          verifyUrl: res.data.verifyUrl,
        });
        setMaskedAadhaar(res.data.maskedAadhaar);
        setStatus("LIVE_VERIFY");
      }
    } catch (err) {
      console.error("Live verify start error:", err);
      const msg = err.response?.data?.message || err.message || "Could not open UIDAI's verification page.";
      setErrorMsg(msg);
      toast(msg, "!");
    } finally {
      setStartingLiveVerify(false);
    }
  }

  // --- Step 1b: Capture the real result once the candidate has solved
  // UIDAI's CAPTCHA and submitted on the live embedded page ---
  async function handleCaptureLiveVerify(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!liveSession?.sessionId) return;

    setErrorMsg("");
    setCapturing(true);

    try {
      const res = await api.post(`/aadhaar/live-verify/${liveSession.sessionId}/capture`);
      if (res.data?.confirmed) {
        setUidaiInfo({
          ageBand: res.data.ageBand,
          gender: res.data.gender,
          state: res.data.state,
        });
        setMaskedAadhaar(res.data.maskedAadhaar || maskedAadhaar);
        setVerifiedVia("live");
        setStatus("NUMBER_VERIFIED");
        toast("✓ UIDAI confirmed this Aadhaar number exists!", "✓");
        api.post(`/aadhaar/live-verify/${liveSession.sessionId}/close`).catch(() => {});
        setLiveSession(null);
      } else {
        setErrorMsg(res.data?.message || "Couldn't confirm a result yet - finish solving the CAPTCHA and submit on the page below, then try again.");
      }
    } catch (err) {
      console.error("Live verify capture error:", err);
      const msg = err.response?.data?.message || err.message || "Could not capture the verification result.";
      setErrorMsg(msg);
      toast(msg, "!");
    } finally {
      setCapturing(false);
    }
  }

  // Fallback for when live UIDAI verification isn't available (e.g. no
  // Browserbase proxy plan) or the candidate just wants to move on: falls
  // back to what's actually verifiable without contacting UIDAI at all -
  // the 12-digit format + Verhoeff checksum. No age/gender/state/mobile is
  // claimed here, since none of that can be honestly known this way.
  function handleSkipToFormatCheck(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAadhaarValid) {
      setErrorMsg(aadhaarValidation.error || "Please enter a valid 12-digit Aadhaar number.");
      return;
    }
    const last4 = cleanDigits.slice(-4);
    setMaskedAadhaar(`XXXX XXXX ${last4}`);
    setUidaiInfo(null);
    setVerifiedVia("format");
    setErrorMsg("");
    if (liveSession?.sessionId) {
      api.post(`/aadhaar/live-verify/${liveSession.sessionId}/close`).catch(() => {});
    }
    setLiveSession(null);
    setStatus("NUMBER_VERIFIED");
  }

  function handleCancelLiveVerify(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const sessionId = liveSession?.sessionId;
    setLiveSession(null);
    setStatus("NOT_STARTED");
    setErrorMsg("");
    if (sessionId) {
      api.post(`/aadhaar/live-verify/${sessionId}/close`).catch(() => {});
    }
  }

  // --- Step 2: Send OTP to Registered Mobile Number ---
  async function handleSendOtp(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isAadhaarValid) {
      setErrorMsg("Please enter a valid 12-digit Aadhaar number.");
      return;
    }

    setErrorMsg("");
    setSendingOtp(true);

    try {
      const res = await api.post("/aadhaar/send-otp", {
        aadhaar: cleanDigits,
        mobile: candidateMobile,
      });

      if (res.data && res.data.success) {
        setTransactionId(res.data.transactionId);
        setMaskedAadhaar(res.data.maskedAadhaar);
        setMaskedMobile(res.data.maskedMobile || maskedMobile);
        setStatus("OTP_SENT");

        setResendTimer(res.data.resendCooldown || 30);
        setCanResend(false);

        if (res.data.devOtp) {
          setOtpInput(res.data.devOtp);
          setDevOtpUsed(true);
        } else {
          setDevOtpUsed(false);
        }

        toast(`OTP sent to registered mobile (${res.data.maskedMobile || "linked to your Aadhaar"})`, "✓");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to send OTP.";
      setErrorMsg(msg);
      toast(msg, "!");
    } finally {
      setSendingOtp(false);
    }
  }

  // --- Step 3: Verify OTP ---
  async function handleVerifyOtp(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const cleanOtp = otpInput.trim();
    if (!cleanOtp || cleanOtp.length !== 6 || !/^\d{6}$/.test(cleanOtp)) {
      setErrorMsg("Please enter a valid 6-digit OTP.");
      return;
    }

    setErrorMsg("");
    setVerifyingOtp(true);

    try {
      const res = await api.post("/aadhaar/verify-otp", {
        transactionId,
        otp: cleanOtp,
      });

      if (res.data && res.data.verified) {
        setStatus("VERIFIED");
        setMaskedAadhaar(res.data.maskedAadhaar);
        toast("✓ Aadhaar Identity Verified via UIDAI Service!", "✓");

        if (onVerificationSuccess) {
          onVerificationSuccess({
            maskedAadhaar: res.data.maskedAadhaar,
            verifiedAt: res.data.verifiedAt,
            transactionId,
            // Real name/dob/gender/city/state/address come from verify-otp's
            // "details" - the only point genuine UIDAI-sourced data exists.
            ...(res.data.details || {}),
          });
        }
      }
    } catch (err) {
      console.error("Verify OTP error:", err);
      const msg = err.response?.data?.message || err.message || "Invalid or expired OTP.";
      setErrorMsg(msg);
      toast(msg, "!");
    } finally {
      setVerifyingOtp(false);
    }
  }

  function handleEditAadhaar(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStatus("NOT_STARTED");
    setOtpInput("");
    setDevOtpUsed(false);
    setErrorMsg("");
    setUidaiInfo(null);
    if (liveSession?.sessionId) {
      api.post(`/aadhaar/live-verify/${liveSession.sessionId}/close`).catch(() => {});
    }
    setLiveSession(null);
  }

  return (
    <div className="card" style={{ padding: 24, borderRadius: 16, border: "1.5px solid var(--border-light)" }}>
      {/* CARD HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: "rgba(7, 26, 53, 0.08)", color: "var(--navy)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>
            <i className="fa-solid fa-shield-halved"></i>
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--navy)" }}>
                Aadhaar Identity Verification
              </h4>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.04em" }}>
                UIDAI AUTHORIZED
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#64748B" }}>
              Aadhaar number verification &amp; registered mobile OTP detection
            </span>
          </div>
        </div>

        {status === "VERIFIED" && (
          <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="fa-solid fa-circle-check"></i> UIDAI VERIFIED
          </span>
        )}
      </div>

      {/* ERROR BANNER */}
      {errorMsg && (
        <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#DC2626", padding: 12, borderRadius: 8, fontSize: 12, fontWeight: 700, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <i className="fa-solid fa-circle-exclamation"></i>
          <span>{errorMsg}</span>
        </div>
      )}

      {/* --- STATE 1: NOT_STARTED (Enter 12-digit Aadhaar Number) --- */}
      {status === "NOT_STARTED" && (
        <div>
          <div className="field" style={{ marginBottom: 16 }}>
            <label style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span>Enter 12-Digit Aadhaar Number</span>
              {cleanDigits.length > 0 && (
                <span style={{ fontSize: 11, fontWeight: 700, color: isAadhaarValid ? "#15803D" : "#DC2626" }}>
                  {isAadhaarValid ? "✓ Valid UIDAI Format" : `${cleanDigits.length}/12 Digits`}
                </span>
              )}
            </label>

            <input
              type="text"
              inputMode="numeric"
              maxLength={14}
              value={aadhaarInput}
              onChange={handleAadhaarChange}
              placeholder="e.g. 5482 1234 5678"
              style={{
                fontSize: 16,
                letterSpacing: "0.08em",
                fontWeight: 700,
                borderColor: cleanDigits.length === 12 ? (isAadhaarValid ? "#22C55E" : "#EF4444") : undefined,
                background: cleanDigits.length === 12 ? (isAadhaarValid ? "#F0FDF4" : "#FEF2F2") : "#fff",
              }}
            />

            {cleanDigits.length === 12 && !isAadhaarValid && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#DC2626", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fa-solid fa-triangle-exclamation"></i>
                <span>{aadhaarValidation.error || "Invalid Aadhaar number: Failed UIDAI Verhoeff checksum."}</span>
              </div>
            )}

            {isAadhaarValid && (
              <div style={{ marginTop: 6, fontSize: 12, color: "#15803D", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                <i className="fa-solid fa-check-double"></i>
                <span>Mathematically valid 12-digit Aadhaar check digit (Verhoeff verified). Ready for UIDAI verification.</span>
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
            We'll open UIDAI's own official "Verify an Aadhaar Number" page for you to check this number yourself - you'll solve UIDAI's CAPTCHA on the real government site, then confirm the result back here.
          </p>

          <button
            type="button"
            className="btn btn-navy"
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
            disabled={!isAadhaarValid || startingLiveVerify}
            onClick={handleStartLiveVerify}
          >
            {startingLiveVerify ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Opening UIDAI's Verification Page…
              </>
            ) : (
              "Verify with Official UIDAI Portal →"
            )}
          </button>

          <button
            type="button"
            onClick={handleSkipToFormatCheck}
            disabled={!isAadhaarValid}
            style={{ display: "block", width: "100%", textAlign: "center", marginTop: 10, background: "none", border: "none", color: "#64748B", fontSize: 11.5, fontWeight: 600, textDecoration: "underline", cursor: isAadhaarValid ? "pointer" : "not-allowed" }}
          >
            UIDAI's page unavailable or having trouble? Skip to format-only verification
          </button>
        </div>
      )}

      {/* --- STATE 1B: LIVE_VERIFY (real embedded UIDAI session - candidate solves the CAPTCHA themselves) --- */}
      {status === "LIVE_VERIFY" && liveSession && (
        <div>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF", padding: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 12 }}>
            <i className="fa-solid fa-circle-info" style={{ marginRight: 6 }}></i>
            This is UIDAI's real official site, opened just for you. Enter your Aadhaar number (pre-filled where possible) and solve the CAPTCHA below, then click "I've Verified - Capture Result" once you see UIDAI's result.
          </div>

          <div style={{ borderRadius: 10, overflow: "hidden", border: "1.5px solid var(--border-light)", marginBottom: 14, height: 480 }}>
            <iframe
              src={liveSession.liveViewUrl}
              title="UIDAI Aadhaar Verification"
              style={{ width: "100%", height: "100%", border: "none" }}
              allow="clipboard-read; clipboard-write"
            />
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ flex: 1, justifyContent: "center", padding: "12px 20px" }}
              disabled={capturing}
              onClick={handleCaptureLiveVerify}
            >
              {capturing ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Reading Result…
                </>
              ) : (
                "✓ I've Verified - Capture Result"
              )}
            </button>
            <button
              type="button"
              onClick={handleCancelLiveVerify}
              style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 14px", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>

          <button
            type="button"
            onClick={handleSkipToFormatCheck}
            style={{ display: "block", width: "100%", textAlign: "center", marginTop: 10, background: "none", border: "none", color: "#64748B", fontSize: 11.5, fontWeight: 600, textDecoration: "underline", cursor: "pointer" }}
          >
            Page not loading? Skip to format-only verification instead
          </button>
        </div>
      )}

      {/* --- STATE 1C: NUMBER_VERIFIED (UIDAI's official page confirmed this Aadhaar number, with the real values it displayed) --- */}
      {status === "NUMBER_VERIFIED" && (
        <div>
          <div style={{ background: "#F0FDF4", border: "1.5px solid #86EFAC", borderRadius: 10, padding: 14, marginBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <i className="fa-solid fa-circle-check" style={{ color: "#15803D", fontSize: 16 }}></i>
              <strong style={{ color: "#15803D", fontSize: 13.5 }}>
                {verifiedVia === "live" ? "Confirmed on UIDAI's Official Portal" : "Aadhaar Number Format Verified"}
              </strong>
            </div>
            <p style={{ margin: uidaiInfo && (uidaiInfo.ageBand || uidaiInfo.gender || uidaiInfo.state) ? "0 0 10px" : 0, fontSize: 12, color: "#166534" }}>
              {verifiedVia === "live" ? (
                <>UIDAI's own verification page confirmed this Aadhaar number (<strong>{maskedAadhaar}</strong>) exists.</>
              ) : (
                <>Aadhaar (<strong>{maskedAadhaar}</strong>) passed UIDAI's 12-digit Verhoeff checksum. (UIDAI's live portal wasn't reachable, so no age/gender/state could be confirmed this way.)</>
              )}
            </p>

            {uidaiInfo && (uidaiInfo.ageBand || uidaiInfo.gender || uidaiInfo.state) && (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8, marginTop: 10 }}>
                {uidaiInfo.ageBand && (
                  <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #DCFCE7" }}>
                    <span style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Age Band</span>
                    <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13 }}>{uidaiInfo.ageBand}</div>
                  </div>
                )}
                {uidaiInfo.gender && (
                  <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #DCFCE7" }}>
                    <span style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>Gender</span>
                    <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13 }}>{uidaiInfo.gender}</div>
                  </div>
                )}
                {uidaiInfo.state && (
                  <div style={{ background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #DCFCE7" }}>
                    <span style={{ fontSize: 10, color: "#64748B", textTransform: "uppercase", fontWeight: 700 }}>State</span>
                    <div style={{ fontWeight: 800, color: "var(--navy)", fontSize: 13 }}>{uidaiInfo.state}</div>
                  </div>
                )}
              </div>
            )}
          </div>

          <p style={{ fontSize: 12, color: "#475569", marginBottom: 14 }}>
            Next, we'll send a one-time password straight to the mobile number linked to this Aadhaar with UIDAI - entering it correctly is what proves you're its holder. (UIDAI never discloses that number itself to us or anyone else.)
          </p>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              className="btn btn-gold"
              style={{ flex: 1, justifyContent: "center", padding: "12px 20px" }}
              disabled={sendingOtp}
              onClick={handleSendOtp}
            >
              {sendingOtp ? (
                <>
                  <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Dispatching OTP…
                </>
              ) : (
                "Send OTP to Aadhaar-Registered Mobile →"
              )}
            </button>
            <button
              type="button"
              onClick={handleEditAadhaar}
              style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 8, padding: "0 14px", color: "#475569", fontWeight: 600, fontSize: 12, cursor: "pointer" }}
            >
              Change
            </button>
          </div>
        </div>
      )}

      {/* --- STATE 2: OTP_SENT (Enter 6-digit OTP & Resend Timer) --- */}
      {status === "OTP_SENT" && (
        <div>
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", color: "#1E40AF", padding: 12, borderRadius: 8, fontSize: 12, fontWeight: 600, marginBottom: 16 }}>
            <i className="fa-solid fa-mobile-screen-button" style={{ marginRight: 6 }}></i>
            OTP sent to your Aadhaar-registered mobile number (<strong style={{ color: "var(--navy)" }}>{maskedMobile || "+91 ######3210"}</strong>) linked with Aadhaar <strong>{maskedAadhaar}</strong>.
          </div>

          <div className="field" style={{ marginBottom: 16 }}>
            <label>Enter 6-digit OTP received on registered mobile</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={6}
              value={otpInput}
              onChange={(e) => {
                setOtpInput(e.target.value.replace(/\D/g, "").slice(0, 6));
                setErrorMsg("");
              }}
              placeholder="_ _ _ _ _ _"
              style={{ fontSize: 20, letterSpacing: "0.25em", textAlign: "center", fontWeight: 800 }}
              autoFocus
            />
            {devOtpUsed && (
              <span style={{ display: "block", marginTop: 6, fontSize: 11, color: "#94A3B8", textAlign: "center" }}>
                Dev/sandbox mode: code was pre-filled for testing.
              </span>
            )}
          </div>

          <button
            type="button"
            className="btn btn-navy"
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px", marginBottom: 14 }}
            disabled={otpInput.length !== 6 || verifyingOtp}
            onClick={handleVerifyOtp}
          >
            {verifyingOtp ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Verifying OTP…
              </>
            ) : (
              "Verify OTP →"
            )}
          </button>

          {/* Resend OTP & Edit Number Actions */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12 }}>
            <button
              type="button"
              onClick={handleEditAadhaar}
              style={{ color: "var(--navy)", fontWeight: 700, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
            >
              ← Edit Aadhaar Number
            </button>

            <div>
              {!canResend ? (
                <span style={{ color: "#64748B", fontWeight: 700 }}>
                  Resend OTP in <strong style={{ color: "var(--navy)" }}>{resendTimer}s</strong>
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp}
                  style={{ color: "var(--gold-bright)", fontWeight: 800, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                >
                  Resend OTP ↻
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* --- STATE 3: VERIFIED (Green Success Banner & Locked Masked Display) --- */}
      {status === "VERIFIED" && (
        <div style={{ background: "#F0FDF4", border: "2px solid #22C55E", borderRadius: 12, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, fontWeight: 800 }}>
              ✓
            </div>
            <div>
              <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "#15803D" }}>
                Aadhaar Verified Successfully
              </h4>
              <p style={{ margin: "2px 0 0", fontSize: 12, color: "#166534" }}>
                Aadhaar (<strong>{maskedAadhaar || "XXXX XXXX 1234"}</strong>) confirmed via authorized UIDAI service.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#15803D", fontWeight: 700, marginTop: 12, borderTop: "1px solid #BBF7D0", paddingTop: 10 }}>
            <i className="fa-solid fa-lock"></i> Verified identity locked &amp; confirmed.
          </div>
        </div>
      )}
    </div>
  );
}
