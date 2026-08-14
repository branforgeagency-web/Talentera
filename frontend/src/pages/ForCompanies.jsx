import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";
import { useToast } from "../components/Toast.jsx";

export default function ForCompanies() {
  const navigate = useNavigate();
  const { register, login } = useCompanyAuth();
  const toast = useToast();
  const [activeTab, setActiveTab] = useState("register");
  const [submitting, setSubmitting] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState("");
  const [regMobile, setRegMobile] = useState("");
  const [regCompany, setRegCompany] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regPasswordConfirm, setRegPasswordConfirm] = useState("");

  // Login Form State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  const handleSubmitReg = async (e) => {
    e.preventDefault();
    if (regPassword.length < 6) {
      toast("Password must be at least 6 characters.", "!");
      return;
    }
    if (regPassword !== regPasswordConfirm) {
      toast("Passwords don't match.", "!");
      return;
    }
    setSubmitting(true);
    try {
      await register(regName, regMobile, regCompany, regEmail, regPassword);
      toast("Account created — let's get you set up.", "✓");
      navigate("/companies/onboarding");
    } catch (err) {
      toast(err.response?.data?.message || "Couldn't create your account. Please try again.", "!");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitLogin = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      navigate("/companies/onboarding");
    } catch (err) {
      toast(err.response?.data?.message || "Invalid email or password.", "!");
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
                <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E"/>
                <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF"/>
                <path d="M32 8L46 18H32V8Z" fill="#F5C95B"/>
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

            {/* Back Link */}
            <Link to="/" className="cauth-brand-back">
              ← Back to Talentera Home
            </Link>
          </div>
        </div>

        {/* RIGHT PANEL — AUTH FORM SIDE */}
        <div className="cauth-form-side">
          <div className="cauth-form-shell">
            {/* Tabs Selector */}
            <div className="cauth-tabs">
              <button
                className={`cauth-tab ${activeTab === "register" ? "active" : ""}`}
                onClick={() => setActiveTab("register")}
              >
                Register
              </button>
              <button
                className={`cauth-tab ${activeTab === "login" ? "active" : ""}`}
                onClick={() => setActiveTab("login")}
              >
                Login
              </button>
            </div>

            {/* REGISTER TAB FORM */}
            {activeTab === "register" ? (
              <form onSubmit={handleSubmitReg}>
                <div className="cauth-step-eyebrow">STEP 1 OF 3 · YOUR DETAILS</div>
                <h2 className="cauth-form-title">Create your hiring account</h2>
                <p className="cauth-form-sub">
                  Free to register, pay only when you hire. Takes 90 seconds.
                </p>

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
                      onChange={(e) => setRegMobile(e.target.value)}
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

                {/* Password */}
                <div className="cauth-field">
                  <label className="cauth-label">PASSWORD</label>
                  <input
                    type="password"
                    className="cauth-input"
                    placeholder="At least 6 characters"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    required
                  />
                </div>

                {/* Confirm Password */}
                <div className="cauth-field">
                  <label className="cauth-label">CONFIRM PASSWORD</label>
                  <input
                    type="password"
                    className="cauth-input"
                    placeholder="••••••••"
                    value={regPasswordConfirm}
                    onChange={(e) => setRegPasswordConfirm(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="cauth-btn" disabled={submitting}>
                  {submitting ? "Creating account…" : "Create hiring account →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
                  Already have an account?{" "}
                  <span
                    style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => setActiveTab("login")}
                  >
                    Login here
                  </span>
                </div>
              </form>
            ) : (
              /* LOGIN TAB FORM */
              <form onSubmit={handleSubmitLogin}>
                <div className="cauth-step-eyebrow">EMPLOYER PORTAL</div>
                <h2 className="cauth-form-title">Welcome back</h2>
                <p className="cauth-form-sub">
                  Sign in to access your saved candidates and active requirements.
                </p>

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
                  {submitting ? "Signing in…" : "Sign in to Portal →"}
                </button>

                <div style={{ textAlign: "center", marginTop: 18, fontSize: 13, color: "#64748B" }}>
                  Don't have an account yet?{" "}
                  <span
                    style={{ color: "var(--gold)", fontWeight: 700, cursor: "pointer" }}
                    onClick={() => setActiveTab("register")}
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
