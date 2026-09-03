import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { startOtpWidget } from "../utils/msg91Widget.js";

export default function CompanyRegister() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { register, login, company } = useCompanyAuth();

  const [activeTab, setActiveTab] = useState(searchParams.get("tab") === "login" ? "login" : "register");
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Registration details
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [otpToken, setOtpToken] = useState(null);

  // Step 2: Password
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // If already logged in, offer quick jump to dashboard
  useEffect(() => {
    if (company && step !== 3) {
      navigate("/companies/dashboard", { replace: true });
    }
  }, [company, navigate, step]);

  const handleStep1Submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!regName.trim() || regName.trim().length < 2) {
      setError("Please enter your full name.");
      return;
    }

    if (!regMobile || !/^[6-9]\d{9}$/.test(regMobile)) {
      setError("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
      return;
    }

    if (!regCompany.trim() || regCompany.trim().length < 2) {
      setError("Please enter your registered company name.");
      return;
    }

    if (!regEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(regEmail)) {
      setError("Please enter a valid work email address.");
      return;
    }

    setSubmitting(true);
    try {
      const accessToken = await startOtpWidget(regEmail);
      setOtpToken(accessToken);
      setStep(2);
    } catch (err) {
      setError(err.message || "Email OTP verification failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleStep2Submit = async (e) => {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);
    try {
      const data = await register(
        regName.trim(),
        regMobile.trim(),
        regCompany.trim(),
        regEmail.trim().toLowerCase(),
        password,
        otpToken
      );

      if (data?.token) {
        localStorage.setItem("talentera_company_token", data.token);
        localStorage.setItem("talentera_company_info", JSON.stringify(data.company));
      }

      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Registration failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(loginEmail.trim().toLowerCase(), loginPassword);
      navigate("/companies/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Invalid work email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--cream)" }}>
      <div className="cauth-shell">
        {/* LEFT PANEL — BRAND BANNER */}
        <div className="cauth-brand">
          <div className="cauth-brand-inner">
            {/* Logo */}
            <div className="cauth-brand-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
              <svg width="40" height="40" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E" />
                <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF" />
                <path d="M32 8L46 18H32V8Z" fill="#F5C95B" />
              </svg>
              <div>
                <div className="cauth-brand-name">Talentera</div>
                <div className="cauth-brand-tagline">COMPANY HIRING PORTAL</div>
              </div>
            </div>

            {/* Eyebrow */}
            <div className="cauth-brand-eyebrow">
              <span className="cauth-brand-dot" />
              <span>THE ERA OF TALENT</span>
            </div>

            {/* Headline */}
            <h1 className="cauth-brand-title">
              Hire RCM talent that's <br />
              <em>actually verified.</em>
            </h1>

            {/* Subtext */}
            <p className="cauth-brand-sub">
              5 hand-curated, specialty-precise verified candidates — in 24 hours. Pay only when you hire.
            </p>

            {/* Bullets */}
            <ul className="cauth-brand-bullets">
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>12,480+ verified candidates</span>
              </li>
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>14-day average time-to-hire</span>
              </li>
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>4-layer verification (KYC + cert + assessment + video)</span>
              </li>
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>Cross-company verified backgrounds</span>
              </li>
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>Pay-on-hire pricing — no setup fee</span>
              </li>
              <li>
                <span className="cauth-brand-check">✓</span>
                <span>30-day replacement guarantee</span>
              </li>
            </ul>

            {/* Quote Card */}
            <div className="cauth-brand-quote">
              "We filled 12 ED Coder seats in 14 days — would've taken our team 60 days the old way."
              <div className="cauth-brand-quote-meta">— Director, Talent Acquisition · 800+ coders</div>
            </div>

            {/* Back Links */}
            <div style={{ display: "flex", gap: 20, alignItems: "center", flexWrap: "wrap" }}>
              <Link to="/companies" className="cauth-brand-back">
                ← Back to For Companies
              </Link>
              <Link to="/" className="cauth-brand-back" style={{ opacity: 0.75 }}>
                ← Talentera Home
              </Link>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL — AUTH FORM SIDE */}
        <div className="cauth-form-side">
          <div className="cauth-form-shell">
            {/* Tabs Selector */}
            <div className="cauth-tabs">
              <button
                type="button"
                className={`cauth-tab ${activeTab === "register" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("register");
                  setError("");
                }}
              >
                Register
              </button>
              <button
                type="button"
                className={`cauth-tab ${activeTab === "login" ? "active" : ""}`}
                onClick={() => {
                  setActiveTab("login");
                  setError("");
                }}
              >
                Login
              </button>
            </div>

            {activeTab === "register" ? (
              /* REGISTRATION WIZARD */
              step === 1 ? (
                <form onSubmit={handleStep1Submit}>
                  <div className="cauth-step-eyebrow">STEP 1 OF 3 · YOUR DETAILS</div>
                  <h2 className="cauth-form-title">Create your hiring account</h2>
                  <p className="cauth-form-sub">
                    Free to register, pay only when you hire. Takes 90 seconds.
                  </p>

                  {error && (
                    <div
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        color: "#B91C1C",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 18,
                        lineHeight: 1.4,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  {/* Name */}
                  <div className="cauth-field">
                    <label className="cauth-label">YOUR NAME</label>
                    <input
                      type="text"
                      className="cauth-input"
                      placeholder="e.g. Anita Reddy"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  {/* Mobile */}
                  <div className="cauth-field">
                    <label className="cauth-label">MOBILE NUMBER</label>
                    <div className="cauth-input-prefix-wrap">
                      <span className="cauth-input-prefix">+91</span>
                      <input
                        type="tel"
                        className="cauth-input"
                        placeholder="10-digit mobile"
                        value={regMobile}
                        onChange={(e) => setRegMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                        required
                      />
                    </div>
                  </div>

                  {/* Company Name */}
                  <div className="cauth-field">
                    <label className="cauth-label">COMPANY NAME</label>
                    <input
                      type="text"
                      className="cauth-input"
                      placeholder="e.g. Acme Healthcare Pvt Ltd"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      required
                    />
                  </div>

                  {/* Work Email */}
                  <div className="cauth-field">
                    <label className="cauth-label">WORK EMAIL</label>
                    <input
                      type="email"
                      className="cauth-input"
                      placeholder="anita@acme.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="cauth-btn" disabled={submitting}>
                    {submitting ? "Sending OTP…" : "Send OTP →"}
                  </button>

                  <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
                    Already have an account?{" "}
                    <span
                      style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
                      onClick={() => {
                        setActiveTab("login");
                        setError("");
                      }}
                    >
                      Login here
                    </span>
                  </div>
                </form>
              ) : step === 2 ? (
                <form onSubmit={handleStep2Submit}>
                  <div className="cauth-step-eyebrow">STEP 2 OF 3 · SECURITY</div>
                  <h2 className="cauth-form-title">Set account password</h2>
                  <p className="cauth-form-sub">
                    Work email verified! Create a secure password for{" "}
                    <strong style={{ color: "var(--navy)" }}>{regCompany}</strong>.
                  </p>

                  {error && (
                    <div
                      style={{
                        background: "#FEF2F2",
                        border: "1px solid #FECACA",
                        color: "#B91C1C",
                        padding: "10px 14px",
                        borderRadius: 8,
                        fontSize: 13,
                        marginBottom: 18,
                        lineHeight: 1.4,
                      }}
                    >
                      {error}
                    </div>
                  )}

                  <div
                    style={{
                      background: "#F0FDF4",
                      border: "1px solid #BBF7D0",
                      borderRadius: 10,
                      padding: "12px 16px",
                      marginBottom: 18,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ color: "#16A34A", fontSize: 16, fontWeight: 800 }}>✓</span>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#166534", textTransform: "uppercase" }}>
                          Verified Work Email
                        </div>
                        <div style={{ fontSize: 13, color: "#15803D", fontWeight: 700 }}>{regEmail}</div>
                      </div>
                    </div>
                    <span style={{ fontSize: 11, background: "#DCFCE7", color: "#15803D", padding: "3px 8px", borderRadius: 6, fontWeight: 700 }}>
                      OTP Verified
                    </span>
                  </div>

                  {/* Password */}
                  <div className="cauth-field">
                    <label className="cauth-label">CREATE PASSWORD</label>
                    <input
                      type="password"
                      className="cauth-input"
                      placeholder="At least 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      minLength={6}
                      autoFocus
                    />
                  </div>

                  {/* Confirm Password */}
                  <div className="cauth-field">
                    <label className="cauth-label">CONFIRM PASSWORD</label>
                    <input
                      type="password"
                      className="cauth-input"
                      placeholder="Re-enter your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      minLength={6}
                    />
                  </div>

                  <div style={{ display: "flex", gap: 10, marginTop: 12 }}>
                    <button
                      type="button"
                      disabled={submitting}
                      onClick={() => {
                        setStep(1);
                        setError("");
                      }}
                      style={{
                        padding: "14px 20px",
                        background: "#F1F5F9",
                        border: "1px solid #E2E8F0",
                        borderRadius: 10,
                        fontWeight: 700,
                        fontSize: 14,
                        color: "var(--navy)",
                        cursor: "pointer",
                      }}
                    >
                      ← Back
                    </button>
                    <button
                      type="submit"
                      className="cauth-btn"
                      style={{ flex: 1, marginTop: 0 }}
                      disabled={submitting}
                    >
                      {submitting ? "Creating account…" : "Complete Registration →"}
                    </button>
                  </div>
                </form>
              ) : (
                /* STEP 3 - SUCCESS STATE */
                <div style={{ textAlign: "center", padding: "20px 0" }}>
                  <div
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: "50%",
                      background: "#DCFCE7",
                      color: "#16A34A",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 32,
                      marginBottom: 16,
                    }}
                  >
                    ✓
                  </div>
                  <div className="cauth-step-eyebrow">STEP 3 OF 3 · ACCOUNT READY</div>
                  <h2 className="cauth-form-title">Hiring Account Created!</h2>
                  <p className="cauth-form-sub" style={{ maxWidth: 420, margin: "0 auto 24px" }}>
                    Welcome aboard, <strong style={{ color: "var(--navy)" }}>{regName}</strong>! Your account for{" "}
                    <strong style={{ color: "var(--gold)" }}>{regCompany}</strong> has been registered. You can now browse verified RCM candidates and post requirements.
                  </p>

                  <button
                    type="button"
                    onClick={() => navigate("/companies/dashboard")}
                    className="cauth-btn"
                    style={{
                      background: "linear-gradient(135deg, var(--gold) 0%, var(--gold-bright) 100%)",
                      color: "var(--navy)",
                      fontSize: 16,
                    }}
                  >
                    Proceed to Company Dashboard →
                  </button>
                </div>
              )
            ) : (
              /* LOGIN TAB FORM */
              <form onSubmit={handleLoginSubmit}>
                <div className="cauth-step-eyebrow">EMPLOYER PORTAL</div>
                <h2 className="cauth-form-title">Welcome back</h2>
                <p className="cauth-form-sub">
                  Sign in to access your candidate pipeline and active requirements.
                </p>

                {error && (
                  <div
                    style={{
                      background: "#FEF2F2",
                      border: "1px solid #FECACA",
                      color: "#B91C1C",
                      padding: "10px 14px",
                      borderRadius: 8,
                      fontSize: 13,
                      marginBottom: 18,
                      lineHeight: 1.4,
                    }}
                  >
                    {error}
                  </div>
                )}

                {/* Email */}
                <div className="cauth-field">
                  <label className="cauth-label">WORK EMAIL</label>
                  <input
                    type="email"
                    className="cauth-input"
                    placeholder="anita@acme.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    autoFocus
                  />
                </div>

                {/* Password */}
                <div className="cauth-field">
                  <label className="cauth-label">PASSWORD</label>
                  <input
                    type="password"
                    className="cauth-input"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="cauth-btn" disabled={submitting}>
                  {submitting ? "Signing In…" : "Sign in to Portal →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
                  Don't have an account yet?{" "}
                  <span
                    style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => {
                      setActiveTab("register");
                      setError("");
                    }}
                  >
                    Register here
                  </span>
                </div>
              </form>
            )}

            {/* Trust Badges */}
            <div className="cauth-trust">
              <span>🔒 256-BIT ENCRYPTED</span>
              <span>✓ DPDP ACT</span>
              <span>🇮🇳 INDIA-FIRST</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
