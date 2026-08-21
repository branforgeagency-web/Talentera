import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import AuthLayout from "../components/AuthLayout.jsx";
import api from "../api/client";

/**
 * Shared forgot/reset-password flow for both candidate and company accounts
 * (?type=candidate|company - defaults to candidate). Neither account type
 * had a working password-reset UI before this - see
 * IMPROVEMENT_ROADMAP.md "Candidates can't reset a forgotten password" and
 * the companyAuth.js fix notes for why the company backend route needed a
 * real fix (not just a UI) alongside this page.
 */
export default function ForgotPassword() {
  const [searchParams] = useSearchParams();
  const accountType = searchParams.get("type") === "company" ? "company" : "candidate";
  const navigate = useNavigate();

  const [step, setStep] = useState("request"); // "request" | "reset" | "done"
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const basePath = accountType === "company" ? "/company/auth" : "/auth";
  const loginPath = accountType === "company" ? "/companies/login" : "/login";

  async function handleRequestCode(e) {
    e.preventDefault();
    setError("");
    setInfo("");
    setSubmitting(true);
    try {
      const res = await api.post(`${basePath}/forgot-password`, { email });
      setInfo(res.data?.message || "If an account exists for this email, a reset code has been sent.");
      setStep("reset");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't send a reset code. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError("");
    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`${basePath}/reset-password`, { email, otp, newPassword });
      setStep("done");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't reset your password. Please check the code and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout
      title={accountType === "company" ? "Reset employer account password" : "Reset your password"}
      subtitle={
        step === "request"
          ? "Enter your email and we'll send you a 6-digit reset code."
          : step === "reset"
          ? "Enter the code we sent you and choose a new password."
          : "Your password has been updated."
      }
    >
      {step === "request" && (
        <form onSubmit={handleRequestCode}>
          <div className="form-group">
            <label>EMAIL ADDRESS</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={submitting}>
            {submitting ? "Sending code…" : "Send reset code"}
          </button>
        </form>
      )}

      {step === "reset" && (
        <form onSubmit={handleResetPassword}>
          {info && <div style={{ fontSize: 13, color: "#166534", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, padding: 10, marginBottom: 16 }}>{info}</div>}
          <div className="form-group">
            <label>6-DIGIT RESET CODE</label>
            <input type="text" inputMode="numeric" maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))} placeholder="123456" required />
          </div>
          <div className="form-group">
            <label>NEW PASSWORD</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          <div className="form-group">
            <label>CONFIRM NEW PASSWORD</label>
            <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" required />
          </div>
          {error && <div className="error-text">{error}</div>}
          <button type="submit" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={submitting}>
            {submitting ? "Resetting…" : "Reset password"}
          </button>
          <button
            type="button"
            onClick={() => setStep("request")}
            style={{ width: "100%", background: "none", border: "none", color: "#64748B", fontSize: 12.5, marginTop: 12, cursor: "pointer" }}
          >
            Didn't get a code? Send again
          </button>
        </form>
      )}

      {step === "done" && (
        <div>
          <div style={{ fontSize: 13, color: "#166534", background: "#DCFCE7", border: "1px solid #86EFAC", borderRadius: 8, padding: 12, marginBottom: 20 }}>
            Your password has been updated. You can now log in with your new password.
          </div>
          <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center" }} onClick={() => navigate(loginPath)}>
            Go to login
          </button>
        </div>
      )}

      {step === "request" && (
        <p style={{ textAlign: "center", marginTop: 18, fontSize: "0.9rem" }}>
          Remembered it? <Link to={loginPath}>Back to login</Link>
        </p>
      )}
    </AuthLayout>
  );
}
