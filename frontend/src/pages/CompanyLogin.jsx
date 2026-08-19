import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { isFullyOnboarded } from "../data/companyOnboardingStages";

export default function CompanyLogin() {
  const { loginStart, verifyLoginOtp, company } = useCompanyAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState(location.state?.email || "");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // A company that already filled every onboarding field and is KYC
  // verified has nothing left to do in the 9-section wizard - send it
  // straight to Job Posts instead (see isFullyOnboarded's comment).
  useEffect(() => {
    if (company) {
      navigate(isFullyOnboarded(company) ? "/companies/jobs" : "/companies/dashboard", { replace: true });
    }
  }, [company, navigate]);

  // Two-step, OTP-gated login (matches every other login flow in the app -
  // see AcademyLogin.jsx / README "Login OTP" section): step 1 checks the
  // password without starting a session, step 2 requires the OTP widget to
  // resolve with a verified access token before verify-login-otp actually
  // issues the session JWT.
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 60%, #152A4A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
    >
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
          Company Log In
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
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)", marginBottom: 6 }}>
              PASSWORD
            </label>
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
            style={{ width: "100%", padding: 14, background: "#E5A82E", color: "#0A1F3D", border: "none", borderRadius: 10, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}
          >
            {submitting ? "Verifying OTP…" : "Log In"}
          </button>
        </form>

        <div style={{ textAlign: "center", marginTop: 18 }}>
          <span style={{ fontSize: 12.5, color: "rgba(255,255,255,0.5)" }}>New company? </span>
          <Link to="/companies/register" style={{ fontSize: 12.5, color: "var(--gold)", fontWeight: 700, textDecoration: "none" }}>
            Register here
          </Link>
        </div>
      </div>
    </div>
  );
}
