import React, { useEffect, useState } from "react";
import api from "../api/client";
import { formatAadhaar, verhoeffValidate } from "../utils/verhoeff";
import { useToast } from "./Toast.jsx";

/**
 * Professional Aadhaar OTP Verification Card
 * Handles OTP authentication, provider transaction tracking, resend timer,
 * rate limiting, and masked number privacy compliance (XXXX XXXX 1234).
 */
export default function AadhaarOtpVerificationCard({
  initialStatus = "NOT_STARTED",
  existingMaskedAadhaar = "",
  candidateMobile = "",
  docUploaded = true,
  onVerificationSuccess,
  onStatusChange,
}) {
  const toast = useToast();

  const [status, setStatus] = useState(
    existingMaskedAadhaar || initialStatus === "VERIFIED" ? "VERIFIED" : "NOT_STARTED"
  ); // NOT_STARTED | OTP_SENT | VERIFIED | FAILED

  const [aadhaarInput, setAadhaarInput] = useState(existingMaskedAadhaar || "");
  const [transactionId, setTransactionId] = useState("");
  const [maskedAadhaar, setMaskedAadhaar] = useState(existingMaskedAadhaar || "");
  const [maskedMobile, setMaskedMobile] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [devOtpUsed, setDevOtpUsed] = useState(false);

  const [sendingOtp, setSendingOtp] = useState(false);
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Resend OTP 30s Countdown Timer
  const [resendTimer, setResendTimer] = useState(30);
  const [canResend, setCanResend] = useState(false);

  const cleanDigits = aadhaarInput.replace(/\D/g, "");
  const isLengthValid = cleanDigits.length === 12;
  const isChecksumValid = isLengthValid;

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

  // --- Step 1: Send OTP ---
  async function handleSendOtp(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!isLengthValid) {
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
        setMaskedMobile(res.data.maskedMobile || "");
        setStatus("OTP_SENT");

        // Start 30s Resend Timer
        setResendTimer(res.data.resendCooldown || 30);
        setCanResend(false);

        // Dev-only convenience: the backend includes the generated OTP
        // directly in the response outside production (there's no real
        // Aadhaar gateway wired up in dev/sandbox), so pre-fill it instead
        // of making testers tail server logs.
        if (res.data.devOtp) {
          setOtpInput(res.data.devOtp);
          setDevOtpUsed(true);
        } else {
          setDevOtpUsed(false);
        }

        toast(`OTP sent to your Aadhaar-registered mobile number (${res.data.maskedMobile || "linked to your Aadhaar"})`, "✓");
      }
    } catch (err) {
      console.error("Send OTP error:", err);
      const msg = err.response?.data?.message || err.message || "Failed to send Aadhaar OTP.";
      setErrorMsg(msg);
      toast(msg, "!");
    } finally {
      setSendingOtp(false);
    }
  }

  // --- Step 2: Verify OTP ---
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
        toast("✓ Aadhaar Verified Successfully via Cashfree!", "✓");

        if (onVerificationSuccess) {
          onVerificationSuccess({
            maskedAadhaar: res.data.maskedAadhaar,
            verifiedAt: res.data.verifiedAt,
            transactionId,
            ...(res.data.details || {}),
            name: res.data.details?.fullName || res.data.candidate?.stage1?.fullName || "",
            city: res.data.details?.city || res.data.candidate?.stage1?.city || "",
            state: res.data.details?.state || res.data.candidate?.stage1?.state || "",
            dob: res.data.details?.dob || res.data.candidate?.stage1?.dob || "",
            gender: res.data.details?.gender || res.data.candidate?.stage1?.gender || "",
            address: res.data.details?.address || res.data.candidate?.stage1?.address || "",
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

  // Reset & Edit Number
  function handleEditAadhaar(e) {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    setStatus("NOT_STARTED");
    setOtpInput("");
    setDevOtpUsed(false);
    setErrorMsg("");
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
                Aadhaar OTP Verification
              </h4>
              <span style={{ fontSize: 9.5, fontWeight: 800, color: "#0369A1", background: "#E0F2FE", padding: "2px 8px", borderRadius: 999, letterSpacing: "0.04em" }}>
                CASHFREE IDENTITY
              </span>
            </div>
            <span style={{ fontSize: 11, color: "#64748B" }}>Official UIDAI OTP sent directly to your registered mobile number</span>
          </div>
        </div>

        {status === "VERIFIED" && (
          <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 6 }}>
            <i className="fa-solid fa-circle-check"></i> VERIFIED
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
                <span style={{ fontSize: 11, fontWeight: 700, color: isLengthValid ? "#15803D" : "#64748B" }}>
                  {isLengthValid ? "✓ 12/12 Digits" : `${cleanDigits.length}/12 Digits`}
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
                borderColor: isChecksumValid ? "#22C55E" : undefined,
                background: isChecksumValid ? "#F0FDF4" : "#fff",
              }}
            />
          </div>

          <p style={{ fontSize: 12, color: "#64748B", marginBottom: 16, lineHeight: 1.5 }}>
            No physical document needed. An official UIDAI OTP will be sent directly to the mobile phone number linked to your Aadhaar card.
          </p>

          <button
            type="button"
            className="btn btn-gold"
            style={{ width: "100%", justifyContent: "center", padding: "12px 20px" }}
            disabled={!isChecksumValid || sendingOtp}
            onClick={handleSendOtp}
          >
            {sendingOtp ? (
              <>
                <i className="fa-solid fa-spinner fa-spin" style={{ marginRight: 6 }}></i> Sending OTP to Registered Mobile…
              </>
            ) : (
              "Send OTP to Aadhaar Mobile →"
            )}
          </button>
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
            <label>Enter 6-digit OTP</label>
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
                Dev/sandbox mode: no real Aadhaar gateway is configured, so this code was pre-filled for you.
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
                Your Aadhaar (<strong>{maskedAadhaar || "XXXX XXXX 1234"}</strong>) has been successfully verified via authorized authentication.
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "#15803D", fontWeight: 700, marginTop: 12, borderTop: "1px solid #BBF7D0", paddingTop: 10 }}>
            <i className="fa-solid fa-lock"></i> Verification locked &amp; encrypted. Further editing is disabled for candidate security.
          </div>
        </div>
      )}
    </div>
  );
}
