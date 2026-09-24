import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";
import "../styles/forAcademies.css";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { safeJson } from "../utils/safeJson.js";

export default function ForAcademies() {
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("signup"); // "signup" | "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePartnerAuth = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const cleanEmailStr = email.trim().toLowerCase();
    if (!cleanEmailStr || !cleanEmailStr.includes("@")) {
      setError("A valid email address is required.");
      setLoading(false);
      return;
    }

    try {
      if (authMode === "signup") {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
        if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
          throw new Error("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        }

        const accessToken = await startOtpWidget(cleanEmailStr, {
          email: cleanEmailStr,
          title: "Academy Account Verification",
          submitLabel: "Verify & Create Account →",
        });

        const res = await fetch("/api/academy/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            email: cleanEmailStr,
            password,
            mobile: cleanMobile,
          }),
        });

        const data = await safeJson(res);
        if (res.ok && data.token) {
          localStorage.setItem("talentera_academy_token", data.token);
          localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
          navigate("/academy/dashboard");
        } else {
          setError(data.message || "Registration failed. Please try again.");
        }
      } else {
        // Log in
        if (!password) {
          throw new Error("Please enter your password.");
        }

        const res = await fetch("/api/academy/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmailStr,
            password,
          }),
        });

        const data = await safeJson(res);
        if (res.ok && data.token) {
          localStorage.setItem("talentera_academy_token", data.token);
          localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
          navigate("/academy/dashboard");
        } else {
          setError(data.message || "Login failed. Please check your email and password.");
        }
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "Authentication failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    document.title = "Medical Coding Institute Partnership | Talentera";
  }, []);

  const faqs = [
    {
      q: "1. What is a medical coding institute partnership?",
      a: "A medical coding institute partnership connects your academy with Talentera's healthcare talent and hiring ecosystem, helping qualified students move from training and certification toward verified employment opportunities."
    },
    {
      q: "2. How can my medical coding institute partner with Talentera?",
      a: "Your institute can partner with Talentera to onboard student batches, verify credentials, assess candidate readiness, and connect eligible medical coding professionals with verified healthcare employers."
    },
    {
      q: "3. Can Talentera help with medical coding student placements?",
      a: "Yes. Talentera helps create a structured pathway between medical coding students and healthcare employers, giving qualified candidates access to relevant medical coding and US healthcare RCM opportunities."
    },
    {
      q: "4. Can we upload an entire student batch at once?",
      a: "Yes. Partner institutes can use batch upload to add multiple student profiles through supported Excel or CSV formats, reducing manual data entry and simplifying student onboarding."
    },
    {
      q: "5. Does Talentera verify AAPC and AHIMA certifications?",
      a: "Talentera's verification process is designed to help validate relevant AAPC and AHIMA credentials, giving employers greater confidence when evaluating certified medical coding candidates."
    },
    {
      q: "6. What types of healthcare roles can our students find?",
      a: "Depending on qualifications and employer requirements, students may find opportunities across medical coding, medical billing, US healthcare RCM, risk adjustment, HCC coding, and related healthcare operations."
    },
    {
      q: "7. Why should a medical coding academy partner with Talentera?",
      a: "A medical coding academy partnership with Talentera can help strengthen your placement ecosystem by combining batch onboarding, candidate verification, assessments, employer connections, and structured medical coding placement opportunities."
    }
  ];
  const [openFaq, setOpenFaq] = useState(0);

  return (
    <div className="fa-page">
      {/* HERO SECTION */}
      <section className="fa-hero">
        {/* Top Left Corner Back to Home Button */}
        <Link
          to="/"
          className="fa-btn-outline"
          style={{
            position: "absolute",
            top: 20,
            left: 24,
            zIndex: 100,
            display: "inline-flex",
            alignItems: "center",
            gap: 6
          }}
        >
          ← Back to Home
        </Link>
        <div className="fc-hero-bg-grid" />
        <div className="hero-clean-glow-1" />
        <div className="hero-clean-glow-2" />

        <div className="hero-particles">
          <span className="hero-particle hero-particle-1" />
          <span className="hero-particle hero-particle-2" />
          <span className="hero-particle hero-particle-3" />
          <span className="hero-particle hero-particle-4" />
          <span className="hero-particle hero-particle-5" />
          <span className="hero-particle hero-particle-6" />
        </div>

        <div className="container" style={{ position: "relative", zIndex: 2, paddingTop: 60 }}>
          <div className="fa-eyebrow">
            <i className="fa-solid fa-graduation-cap" /> MEDICAL CODING INSTITUTE PARTNERSHIP
          </div>

          <h1 className="fa-hero-title">
            Your Students. <span style={{ color: "var(--gold-bright)" }}>Their Careers.</span> <br />
            One Powerful Medical Coding Institute Partnership.
          </h1>

          <p className="fa-hero-sub">
            Partner with India's #1 RCM talent platform. Upload student batches, verify AAPC/AHIMA credentials, assess candidate readiness, and connect qualified graduates with 342+ verified hiring companies.
            <span style={{ display: "block", marginTop: 10, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
              From classroom to career — build your institute's placement network with Talentera.
            </span>
          </p>

          <div className="fa-stats-grid">
            <div>
              <div className="fa-stat-num">₹2,500</div>
              <div className="fa-stat-lbl">Placement Reward Per Candidate</div>
            </div>
            <div>
              <div className="fa-stat-num">342+</div>
              <div className="fa-stat-lbl">Verified Hiring Companies</div>
            </div>
            <div>
              <div className="fa-stat-num">1-Click</div>
              <div className="fa-stat-lbl">Batch Profile Upload</div>
            </div>
            <div>
              <div className="fa-stat-num">Instant</div>
              <div className="fa-stat-lbl">AAPC & AHIMA Verification</div>
            </div>
          </div>
        </div>
      </section>

      {/* WHY PARTNER SECTION */}
      <section className="fa-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fa-section-head">
            <div className="fa-section-eyebrow">WHY MEDICAL CODING INSTITUTES CHOOSE TALENTERA</div>
            <h2 className="fa-section-title">
              A medical coding institute partnership built for{" "}
              <span style={{ color: "var(--gold)" }}>student placement and career growth.</span>
            </h2>
          </div>

          <div className="fa-cards-grid">
            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-upload" /></div>
              <h3 className="fa-card-title">1-Click Batch Upload</h3>
              <p className="fa-card-desc">
                Upload 50+ medical coding student profiles through Excel or CSV in seconds. Bring your entire batch onto Talentera without manual form filling.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-shield-halved" /></div>
              <h3 className="fa-card-title">Instant AAPC & AHIMA Verification</h3>
              <p className="fa-card-desc">
                Verify AAPC and AHIMA credentials through automated verification, helping healthcare employers identify qualified and certified medical coding professionals.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-building-user" /></div>
              <h3 className="fa-card-title">Direct Recruiter Access</h3>
              <p className="fa-card-desc">
                Connect your medical coding academy with verified healthcare employers actively hiring medical coding and US healthcare RCM professionals.
              </p>
            </div>

            <div className="fa-card">
              <div className="fa-card-icon"><i className="fa-solid fa-sack-dollar" /></div>
              <h3 className="fa-card-title">₹2,500 Placement Reward</h3>
              <p className="fa-card-desc">
                Strengthen your medical coding placement program and earn ₹2,500 for every eligible candidate hired through your academy partnership.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FORM & LOGIN SECTION */}
      <section id="partner-form" className="fa-section" style={{ background: "#06152A", padding: "80px 20px" }}>
        <div className="container" style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
          {/* Main Centered Auth Modal Card */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 20,
              padding: "40px 36px",
              maxWidth: 440,
              width: "100%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
              position: "relative",
              zIndex: 5,
              textAlign: "left",
            }}
          >
            {/* Top Academy Login Title & Logo */}
            <div style={{ textAlign: "center", marginBottom: 20 }}>
              <div
                style={{
                  color: "#E5A82E",
                  fontSize: 18,
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 12,
                }}
              >
                🎓 Academy Login
              </div>
              <div style={{ cursor: "pointer" }} onClick={() => navigate("/")}>
                <img src="/logo-white.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 40, width: "auto" }} />
              </div>
            </div>

            {/* Title & Subtitle */}
            <h2
              style={{
                fontFamily: "var(--font-display, inherit)",
                fontWeight: 800,
                fontSize: 22,
                color: "#FAF7F0",
                textAlign: "center",
                marginBottom: 6,
                letterSpacing: "-0.01em",
              }}
            >
              Start your verification journey
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.55)", textAlign: "center", marginBottom: 24 }}>
              Create your account or log in to begin.
            </p>

            {/* Tab Pill Switcher */}
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "rgba(0,0,0,0.25)",
                padding: 4,
                borderRadius: 10,
                marginBottom: 20,
              }}
            >
              <div
                onClick={() => {
                  setAuthMode("login");
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 14,
                  color: authMode === "login" ? "#FAF7F0" : "rgba(255,255,255,0.55)",
                  background: authMode === "login" ? "#1A2F4D" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                Log in
              </div>
              <div
                onClick={() => {
                  setAuthMode("signup");
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "10px",
                  textAlign: "center",
                  cursor: "pointer",
                  borderRadius: 7,
                  fontWeight: 700,
                  fontSize: 14,
                  color: authMode === "signup" ? "#FAF7F0" : "rgba(255,255,255,0.55)",
                  background: authMode === "signup" ? "#1A2F4D" : "transparent",
                  transition: "all 0.2s",
                }}
              >
                Sign up
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div
                style={{
                  background: "rgba(248,113,113,0.1)",
                  border: "1px solid rgba(248,113,113,0.3)",
                  color: "#F87171",
                  padding: 12,
                  borderRadius: 8,
                  fontSize: 13,
                  marginBottom: 14,
                }}
              >
                {error}
              </div>
            )}

            {/* Auth Form */}
            <form onSubmit={handlePartnerAuth}>
              {/* EMAIL */}
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 6,
                  }}
                >
                  EMAIL
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "#FAF7F0",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* PASSWORD */}
              <div style={{ marginBottom: authMode === "signup" ? 16 : 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.55)",
                    marginBottom: 6,
                  }}
                >
                  PASSWORD {authMode === "signup" && <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>(min 6 chars)</span>}
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  placeholder="••••••••"
                  required
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    borderRadius: 10,
                    color: "#FAF7F0",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              {/* MOBILE (signup only) */}
              {authMode === "signup" && (
                <div style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.55)",
                      marginBottom: 6,
                    }}
                  >
                    MOBILE (10 DIGITS) <span style={{ color: "#E5A82E" }}>*</span>
                  </label>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 10,
                      padding: "0 14px",
                    }}
                  >
                    <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>+91</span>
                    <input
                      type="tel"
                      required
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="98765 43210"
                      style={{
                        flex: 1,
                        padding: "12px 0",
                        background: "transparent",
                        border: "none",
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: 14,
                  background: "#E5A82E",
                  color: "#0A1F3D",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 15,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  marginTop: 4,
                  transition: "all 0.2s",
                  opacity: loading ? 0.6 : 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading
                  ? "Processing..."
                  : authMode === "signup"
                  ? "Verify Email & Create Account →"
                  : "Log In"}
              </button>
            </form>

            {/* Back to landing */}
            <div style={{ textAlign: "center", marginTop: 18 }}>
              <button
                type="button"
                onClick={() => navigate("/")}
                style={{
                  background: "none",
                  border: "none",
                  color: "rgba(255,255,255,0.5)",
                  fontSize: 12,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  textDecoration: "underline",
                }}
              >
                Back to landing
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="fa-section" style={{ background: "var(--cream)" }}>
        <div className="container">
          <div className="fa-section-head">
            <div className="fa-section-eyebrow">FREQUENTLY ASKED QUESTIONS</div>
            <h2 className="fa-section-title">Frequently asked questions.</h2>
          </div>

          <div style={{ maxWidth: 800, margin: "0 auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {faqs.map((faq, idx) => (
              <div key={idx} style={{ background: "#fff", borderRadius: 14, border: "1px solid #e2e8f0", overflow: "hidden" }}>
                <div
                  style={{ padding: "18px 24px", fontWeight: 700, fontSize: 16, cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                  onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
                >
                  <span>{faq.q}</span>
                  <span style={{ color: "var(--gold)" }}>{openFaq === idx ? "▲" : "▼"}</span>
                </div>
                {openFaq === idx && (
                  <div style={{ padding: "0 24px 18px", color: "var(--text-muted)", fontSize: 14.5, lineHeight: 1.6 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ====== FOOTER ====== */}
      <Footer />
    </div>
  );
}
