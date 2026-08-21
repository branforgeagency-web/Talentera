import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { isFullyOnboarded } from "../data/companyOnboardingStages";
import { safeJson } from "../utils/safeJson.js";

export default function CompanyLogin() {
  const { loginStart, verifyLoginOtp, company } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Forgot password state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [resetStep, setResetStep] = useState(1); // 1 = request, 2 = reset password
  const [resetCode, setResetCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [forgotMsg, setForgotMsg] = useState("");
  const [forgotErr, setForgotErr] = useState("");

  useEffect(() => {
    if (company) {
      navigate(isFullyOnboarded(company) ? "/companies/jobs" : "/companies/dashboard", { replace: true });
    }
  }, [company, navigate]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const { company: pendingCompany } = await loginStart(email, password);
      const accessToken = await startOtpWidget(email);
      const loggedInCompany = await verifyLoginOtp(pendingCompany._id, accessToken);
      navigate(isFullyOnboarded(loggedInCompany) ? "/companies/jobs" : "/companies/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  const handleDemoEmployerLogin = async () => {
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/company/auth/demo-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const data = await safeJson(res);
      if (res.ok && data.token) {
        localStorage.setItem("talentera_company_token", data.token);
        localStorage.setItem("talentera_company_info", JSON.stringify(data.company));
        window.location.href = "/companies/jobs";
      } else {
        setError(data.message || "Demo login failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Demo login error.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRequestForgot = async (e) => {
    e.preventDefault();
    setForgotErr("");
    setForgotMsg("");
    try {
      const res = await fetch("/api/company/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        setForgotMsg(data.message);
        setResetStep(2);
      } else {
        setForgotErr(data.message || "Request failed.");
      }
    } catch (err) {
      console.error(err);
      setForgotErr("Error sending reset request.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setForgotErr("");
    setForgotMsg("");
    try {
      const res = await fetch("/api/company/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // FIX: this used to send { email, newPassword } with no code at all,
        // which only "worked" because the backend didn't check one either
        // (see companyAuth.js's reset-password route comment). Now that the
        // backend requires and verifies the OTP, it has to be included here
        // too, or every reset attempt gets a 400.
        body: JSON.stringify({ email: forgotEmail, otp: resetCode, newPassword }),
      });
      const data = await safeJson(res);
      if (res.ok) {
        alert(data.message);
        setShowForgotModal(false);
        setEmail(forgotEmail);
        setPassword(newPassword);
      } else {
        setForgotErr(data.message || "Password reset failed.");
      }
    } catch (err) {
      console.error(err);
      setForgotErr("Error resetting password.");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 60%, #152A4A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative"
      }}
    >
      <div style={{ position: "absolute", top: 24, left: 24, zIndex: 20 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s ease"
          }}
        >
          ← Back to Home
        </Link>
      </div>
      <div
        style={{
          background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "40px 36px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24, cursor: "pointer" }} onClick={() => navigate("/")}>
          <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 40, width: "auto" }} />
        </div>

        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#FAF7F0", textAlign: "center", marginBottom: 6 }}>
          Employer Portal Log In
        </h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", marginBottom: 24 }}>
          Sign in to your Talentera company dashboard.
        </p>

        {error && (
          <div style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
              WORK EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              style={{ width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#FAF7F0", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
              <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                PASSWORD
              </label>
              <button
                type="button"
                onClick={() => { setShowForgotModal(true); setForgotEmail(email); }}
                style={{ background: "none", border: "none", color: "var(--gold)", fontSize: 11.5, fontWeight: 700, cursor: "pointer" }}
              >
                Forgot password?
              </button>
            </div>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              style={{ width: "100%", padding: "12px 14px", background: "rgba(0,0,0,0.3)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 10, color: "#FAF7F0", fontFamily: "inherit", fontSize: 14, outline: "none", boxSizing: "border-box" }}
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{ width: "100%", padding: 14, background: "#E5A82E", color: "#0A1F3D", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit", marginTop: 8 }}
          >
            {submitting ? "Verifying OTP…" : "Log In →"}
          </button>
        </form>

        <div style={{ marginTop: 12 }}>
          <button
            type="button"
            disabled={submitting}
            onClick={handleDemoEmployerLogin}
            style={{
              width: "100%",
              padding: 12,
              background: "rgba(255,255,255,0.08)",
              color: "#FAF7F0",
              border: "1px solid rgba(255,255,255,0.2)",
              borderRadius: 10,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            ⚡ Try Demo Employer Sandbox
          </button>
        </div>

        <div style={{ textAlign: "center", marginTop: 22 }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>New company? </span>
          <Link to="/companies/register" style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
            Register here
          </Link>
        </div>
      </div>

      {/* FORGOT PASSWORD MODAL */}
      {showForgotModal && (
        <div className="modal-overlay" onClick={() => setShowForgotModal(false)}>
          <div className="modal-content" style={{ maxWidth: 440, background: "#0A1F3D", color: "#fff", border: "1px solid rgba(229,168,46,0.3)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ padding: 32 }}>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, margin: "0 0 6px 0", color: "#fff" }}>
                Reset Employer Password
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", marginBottom: 20 }}>
                {resetStep === 1
                  ? "Enter your corporate work email to receive a password reset verification code."
                  : `Enter the verification code sent to ${forgotEmail} and your new password.`}
              </p>

              {forgotMsg && (
                <div style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#4ADE80", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                  {forgotMsg}
                </div>
              )}

              {forgotErr && (
                <div style={{ background: "rgba(248,113,113,0.15)", border: "1px solid rgba(248,113,113,0.3)", color: "#F87171", padding: 10, borderRadius: 8, fontSize: 12, marginBottom: 14 }}>
                  {forgotErr}
                </div>
              )}

              {resetStep === 1 ? (
                <form onSubmit={handleRequestForgot}>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>WORK EMAIL</label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                      style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setShowForgotModal(false)} style={{ flex: 1, padding: 10, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>
                      Cancel
                    </button>
                    <button type="submit" className="btn-gold" style={{ flex: 1, justifyContent: "center" }}>
                      Send Code →
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handleResetPassword}>
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>VERIFICATION CODE</label>
                    <input
                      type="text"
                      value={resetCode}
                      onChange={(e) => setResetCode(e.target.value)}
                      placeholder="6-digit code"
                      required
                      style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff" }}
                    />
                  </div>
                  <div style={{ marginBottom: 20 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.6)", marginBottom: 6 }}>NEW PASSWORD</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      style={{ width: "100%", padding: 12, background: "rgba(0,0,0,0.4)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, color: "#fff" }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 10 }}>
                    <button type="button" onClick={() => setResetStep(1)} style={{ flex: 1, padding: 10, background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.2)", borderRadius: 8, cursor: "pointer" }}>
                      Back
                    </button>
                    <button type="submit" className="btn-gold" style={{ flex: 1, justifyContent: "center" }}>
                      Update Password
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
