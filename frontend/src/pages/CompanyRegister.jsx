import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function CompanyRegister() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("hero"); // "hero" or "steps"
  const [currentStep, setCurrentStep] = useState(1);
  const [typewriterText, setTypewriterText] = useState("in your city.");

  // Form State
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [teamSize, setTeamSize] = useState("20-100");
  const [department, setDepartment] = useState("Medical Coding (CPC)");
  const [frequency, setFrequency] = useState("Immediate (Within 7 days)");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");

  const stepsList = [
    { id: 1, key: "NAME", label: "NAME", title: "What's your company's name?", subtitle: "Use the official registered name — we'll verify GSTIN later. Free to register, pay only when you hire.", placeholder: "e.g. Acme Healthcare Pvt Ltd" },
    { id: 2, key: "LOCATIONS", label: "LOCATIONS", title: "Where are your hiring locations?", subtitle: "Select the primary cities where your RCM or medical coding teams operate.", placeholder: "e.g. Bengaluru, Hyderabad, Chennai" },
    { id: 3, key: "TEAM", label: "TEAM", title: "What is your RCM team size?", subtitle: "Helps us match talent accustomed to your operational scale.", placeholder: "Select team size" },
    { id: 4, key: "DEPTS", label: "DEPTS", title: "Which departments are you hiring for?", subtitle: "Select your primary RCM specialty requirement.", placeholder: "Select primary department" },
    { id: 5, key: "FREQUENCY", label: "FREQUENCY", title: "What is your hiring frequency?", subtitle: "Tell us how urgent or recurring your hiring needs are.", placeholder: "Select hiring frequency" },
    { id: 6, key: "CONTACT", label: "CONTACT", title: "Enter your contact details", subtitle: "We'll send an OTP to verify your official work profile and unlock verified talent.", placeholder: "Contact details" }
  ];

  // Typewriter rotation effect for "in your city."
  useEffect(() => {
    const phrases = ["in your city.", "actually verified.", "ready in 24 hrs."];
    let phraseIdx = 0;
    let charIdx = phrases[0].length;
    let isDeleting = false;
    let timer;

    const tick = () => {
      const currentPhrase = phrases[phraseIdx];
      if (!isDeleting) {
        setTypewriterText(currentPhrase.substring(0, charIdx));
        charIdx++;
        if (charIdx > currentPhrase.length) {
          timer = setTimeout(() => {
            isDeleting = true;
            tick();
          }, 2400);
          return;
        }
        timer = setTimeout(tick, 90);
      } else {
        setTypewriterText(currentPhrase.substring(0, charIdx));
        charIdx--;
        if (charIdx < 0) {
          isDeleting = false;
          charIdx = 0;
          phraseIdx = (phraseIdx + 1) % phrases.length;
          timer = setTimeout(tick, 250);
          return;
        }
        timer = setTimeout(tick, 45);
      }
    };

    timer = setTimeout(tick, 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleNextStep = (e) => {
    e.preventDefault();
    if (currentStep < 6) {
      setCurrentStep(currentStep + 1);
    } else {
      navigate("/companies/directory");
    }
  };

  const startHireFlow = (initialStep = 1) => {
    setCurrentStep(initialStep);
    setViewMode("steps");
  };

  // Mode 1: Main Company Hiring Landing Hero (Shown First on "Hire Verified Talent →")
  if (viewMode === "hero") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--navy-deep)", color: "#fff", display: "flex", flexDirection: "column" }}>
        {/* Navbar */}
        <header
          style={{
            background: "var(--navy)",
            padding: "18px 48px",
            borderBottom: "1px solid var(--border-dark)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/")}>
            <svg width="40" height="40" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E" />
              <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF" />
              <path d="M32 8L46 18H32V8Z" fill="#F5C95B" />
            </svg>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#fff", lineHeight: 1 }}>
                TALENT<span style={{ color: "var(--gold)" }}>ERA</span>
              </div>
              <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
                COMPANY HIRING PORTAL
              </div>
            </div>
          </div>

          <Link
            to="/"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "8px 18px",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none"
            }}
          >
            ← Back to Home
          </Link>
        </header>

        {/* Hero Section */}
        <section className="compl-hero" style={{ flex: 1 }}>
          <div className="compl-hero-glow" />
          <div className="compl-hero-grid" />
          <div className="container compl-hero-inner">
            {/* Eyebrow */}
            <div className="compl-eyebrow">
              <span className="compl-eyebrow-dot" />
              <span>FOR RCM HIRING TEAMS · INDIA-FIRST · PAY ON HIRE</span>
            </div>

            {/* Headline */}
            <h1 className="compl-hero-title">
              Hire RCM talent that's <br />
              <span className="compl-hero-accent">{typewriterText}</span>
              <span className="compl-tw-cursor" />
            </h1>

            {/* Subtitle */}
            <p className="compl-hero-sub">
              Stop sifting 200 resumes for 1 hire. Talentera sends you <strong>5 verified, specialty-precise candidates</strong> — ready to interview in 24 hours.
              <br />
              <span className="compl-sub-light" style={{ display: "inline-block", marginTop: 8 }}>
                14-day average time-to-hire · 88% offer-acceptance rate · Pay only when you hire.
              </span>
            </p>

            {/* Action Buttons */}
            <div className="compl-hero-ctas">
              <button className="compl-btn-primary" onClick={() => startHireFlow(1)}>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                Post a Job
              </button>

              <button className="compl-btn-secondary" onClick={() => startHireFlow(1)}>
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
                Hire Verified Candidates
              </button>
            </div>

            {/* Secondary Register Pill */}
            <div className="compl-register-row">
              <span>New to Talentera?</span>
              <div className="compl-register-pill" onClick={() => startHireFlow(1)} style={{ cursor: "pointer" }}>
                <span className="compl-register-dot" />
                <span>Register your company free →</span>
              </div>
            </div>

            {/* 4 Trust Metrics Box */}
            <div className="compl-hero-trust">
              <div className="compl-trust-stat">
                <strong>14</strong>
                <span>Days to Hire</span>
              </div>
              <div className="compl-trust-stat">
                <strong>88%</strong>
                <span>Offer Acceptance</span>
              </div>
              <div className="compl-trust-stat">
                <strong>4-Layer</strong>
                <span>Verification</span>
              </div>
              <div className="compl-trust-stat">
                <strong>30-Day</strong>
                <span>Replacement</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    );
  }

  // Mode 2: 6-Step Job Posting / Requirement Wizard
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "radial-gradient(ellipse at top left, #FAF5EA 0%, #FAF7F2 40%, #F5EFE6 100%)",
        color: "var(--navy)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* TOP HEADER BAR */}
      <header
        style={{
          background: "var(--navy)",
          padding: "16px 48px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-dark)",
          position: "relative",
          zIndex: 50
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => setViewMode("hero")}>
          <svg width="40" height="40" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E" />
            <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF" />
            <path d="M32 8L46 18H32V8Z" fill="#F5C95B" />
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#fff", lineHeight: 1 }}>
              TALENTERA
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 4 }}>
              COMPANY REGISTRATION
            </div>
          </div>
        </div>

        <button
          onClick={() => setViewMode("hero")}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer"
          }}
        >
          ← Back to Landing
        </button>
      </header>

      {/* 6-STEP PROGRESS TRACKER (TOP CENTER) */}
      <div style={{ padding: "28px 24px 10px", display: "flex", justifyContent: "center", position: "relative", zIndex: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 0, maxWidth: 680, width: "100%", justifyContent: "space-between" }}>
          {stepsList.map((st, idx) => {
            const isActive = currentStep === st.id;
            const isDone = currentStep > st.id;
            return (
              <React.Fragment key={st.id}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" }} onClick={() => setCurrentStep(st.id)}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      background: isActive ? "var(--gold)" : isDone ? "#22C55E" : "#fff",
                      border: isActive ? "2px solid var(--gold)" : isDone ? "2px solid #22C55E" : "1.5px solid #CBD5E1",
                      color: isActive ? "var(--navy)" : isDone ? "#fff" : "#94A3B8",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 800,
                      fontSize: 14,
                      fontFamily: "var(--font-display)",
                      boxShadow: isActive ? "0 4px 14px rgba(229,168,46,0.4)" : "none",
                      transition: "all 0.2s"
                    }}
                  >
                    {isDone ? "✓" : st.id}
                  </div>
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: isActive ? "var(--navy)" : "#94A3B8" }}>
                    {st.label}
                  </span>
                </div>

                {idx < stepsList.length - 1 && (
                  <div
                    style={{
                      flex: 1,
                      height: 2,
                      background: isDone ? "#22C55E" : "#E2E8F0",
                      margin: "0 8px 18px 8px",
                      transition: "all 0.2s"
                    }}
                  />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* FORM CARD */}
      <main style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px 24px 60px", position: "relative", zIndex: 10 }}>
        <div
          style={{
            background: "#fff",
            border: "1px solid #E5E7EB",
            borderRadius: 20,
            padding: "44px 40px",
            maxWidth: 540,
            width: "100%",
            boxShadow: "0 20px 60px -15px rgba(10,31,61,0.08)",
            textAlign: "left"
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.14em", color: "var(--gold)", textTransform: "uppercase", marginBottom: 8 }}>
            STEP {currentStep} OF 6 · {stepsList[currentStep - 1].key}
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {stepsList[currentStep - 1].title}
          </h2>

          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28, lineHeight: 1.5 }}>
            {stepsList[currentStep - 1].subtitle}
          </p>

          <form onSubmit={handleNextStep}>
            {currentStep === 1 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  COMPANY NAME
                </label>
                <input
                  type="text"
                  placeholder={stepsList[0].placeholder}
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--navy)",
                    outline: "none"
                  }}
                />
              </div>
            )}

            {currentStep === 2 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  HIRING LOCATIONS
                </label>
                <input
                  type="text"
                  placeholder={stepsList[1].placeholder}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--navy)",
                    outline: "none"
                  }}
                />
              </div>
            )}

            {currentStep === 3 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  SELECT TEAM SIZE
                </label>
                <select
                  value={teamSize}
                  onChange={(e) => setTeamSize(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--navy)",
                    outline: "none",
                    background: "white"
                  }}
                >
                  <option value="1-20">1 - 20 Employees</option>
                  <option value="20-100">20 - 100 Employees</option>
                  <option value="100-500">100 - 500 Employees</option>
                  <option value="500+">500+ Employees (Enterprise)</option>
                </select>
              </div>
            )}

            {currentStep === 4 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  HIRING DEPARTMENT
                </label>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--navy)",
                    outline: "none",
                    background: "white"
                  }}
                >
                  <option value="Medical Coding (CPC)">Medical Coding (CPC / ED / Surgery)</option>
                  <option value="Medical Billing & Payment Posting">Medical Billing & Payment Posting</option>
                  <option value="AR Calling & Denial Management">AR Calling & Denial Management</option>
                  <option value="All RCM Roles">All RCM Roles</option>
                </select>
              </div>
            )}

            {currentStep === 5 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  HIRING FREQUENCY
                </label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "14px 16px",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    fontSize: 15,
                    fontWeight: 600,
                    color: "var(--navy)",
                    outline: "none",
                    background: "white"
                  }}
                >
                  <option value="Immediate (Within 7 days)">Immediate (Within 7 days)</option>
                  <option value="Monthly Ongoing Batches">Monthly Ongoing Batches</option>
                  <option value="Quarterly Scaling">Quarterly Scaling</option>
                </select>
              </div>
            )}

            {currentStep === 6 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    YOUR NAME
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Anita Reddy"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--navy)",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    MOBILE NUMBER (+91)
                  </label>
                  <input
                    type="tel"
                    placeholder="10-digit mobile"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--navy)",
                      outline: "none"
                    }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    WORK EMAIL
                  </label>
                  <input
                    type="email"
                    placeholder="anita@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    style={{
                      width: "100%",
                      padding: "14px 16px",
                      border: "1.5px solid #CBD5E1",
                      borderRadius: 10,
                      fontSize: 15,
                      fontWeight: 600,
                      color: "var(--navy)",
                      outline: "none"
                    }}
                  />
                </div>
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                type="button"
                onClick={() => {
                  if (currentStep > 1) {
                    setCurrentStep(currentStep - 1);
                  } else {
                    setViewMode("hero");
                  }
                }}
                style={{
                  padding: "14px 22px",
                  background: "white",
                  border: "1.5px solid #CBD5E1",
                  borderRadius: 10,
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--navy)",
                  cursor: "pointer"
                }}
              >
                Back
              </button>

              <button
                type="submit"
                style={{
                  flex: 1,
                  padding: "14px 22px",
                  background: "var(--gold)",
                  color: "var(--navy)",
                  border: "none",
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: 800,
                  cursor: "pointer"
                }}
              >
                {currentStep === 6 ? "Unlock Verified Talent →" : "Continue →"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
