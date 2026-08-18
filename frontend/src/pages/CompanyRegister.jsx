import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import HireVerifiedTalentContent from "../components/HireVerifiedTalentContent.jsx";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { useCompanyAuth } from "../context/CompanyAuthContext.jsx";

export default function CompanyRegister() {
  const navigate = useNavigate();
  const { register } = useCompanyAuth();
  const [viewMode, setViewMode] = useState("hero"); // "hero" or "steps"
  const [flowType, setFlowType] = useState("hire"); // "hire" (company onboarding) or "job" (post a job)
  const [currentStep, setCurrentStep] = useState(1);
  const [maxStepUnlocked, setMaxStepUnlocked] = useState(1);
  const [typewriterText, setTypewriterText] = useState("in your city.");
  const [submitting, setSubmitting] = useState(false);
  const [otpError, setOtpError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  // Form State — Hire Verified Candidates flow (company onboarding)
  const [companyName, setCompanyName] = useState("");
  const [location, setLocation] = useState("");
  const [teamSize, setTeamSize] = useState("20-100");
  const [department, setDepartment] = useState("Medical Coding (CPC)");
  const [frequency, setFrequency] = useState("Immediate (Within 7 days)");
  const [contactName, setContactName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Form State — Post a Job flow
  const [jobTitle, setJobTitle] = useState("");
  const [jobSpecialty, setJobSpecialty] = useState("Medical Coding (CPC)");
  const [jobLocation, setJobLocation] = useState("");
  const [jobExperience, setJobExperience] = useState("1-3 Years (Associate)");
  const [jobEmploymentType, setJobEmploymentType] = useState("Full-time");
  const [jobSalaryRange, setJobSalaryRange] = useState("");

  const stepsList = [
    { id: 1, key: "NAME", label: "NAME", title: "What's your company's name?", subtitle: "Use the official registered name — we'll verify GSTIN later. Free to register, pay only when you hire.", placeholder: "e.g. Acme Healthcare Pvt Ltd" },
    { id: 2, key: "LOCATIONS", label: "LOCATIONS", title: "Where are your hiring locations?", subtitle: "Select the primary cities where your RCM or medical coding teams operate.", placeholder: "e.g. Bengaluru, Hyderabad, Chennai" },
    { id: 3, key: "TEAM", label: "TEAM", title: "What is your RCM team size?", subtitle: "Helps us match talent accustomed to your operational scale.", placeholder: "Select team size" },
    { id: 4, key: "DEPTS", label: "DEPTS", title: "Which departments are you hiring for?", subtitle: "Select your primary RCM specialty requirement.", placeholder: "Select primary department" },
    { id: 5, key: "FREQUENCY", label: "FREQUENCY", title: "What is your hiring frequency?", subtitle: "Tell us how urgent or recurring your hiring needs are.", placeholder: "Select hiring frequency" },
    { id: 6, key: "CONTACT", label: "CONTACT", title: "Enter your contact details", subtitle: "We'll send an OTP to verify your official work profile and unlock verified talent.", placeholder: "Contact details" }
  ];

  const jobStepsList = [
    { id: 1, key: "TITLE", label: "TITLE", title: "What role are you hiring for?", subtitle: "Give the role a clear title — this is what verified candidates will see first.", placeholder: "e.g. Senior Medical Coder (CPC)" },
    { id: 2, key: "SPECIALTY", label: "SPECIALTY", title: "Which RCM specialty does this role need?", subtitle: "Select the primary specialty so we match the right verified profiles.", placeholder: "Select primary specialty" },
    { id: 3, key: "LOCATION", label: "LOCATION", title: "Where is this role based?", subtitle: "Tell us the work location, or note if it's remote / hybrid.", placeholder: "e.g. Chennai (Hybrid) or Remote — India" },
    { id: 4, key: "EXPERIENCE", label: "EXPERIENCE", title: "What experience level are you looking for?", subtitle: "Helps us filter candidates by relevant years in RCM.", placeholder: "Select experience level" },
    { id: 5, key: "COMPENSATION", label: "COMPENSATION", title: "What's the employment type & compensation?", subtitle: "Setting a range up front means faster, better-matched offers.", placeholder: "Employment type & salary range" },
    { id: 6, key: "CONTACT", label: "CONTACT", title: "Enter your contact details", subtitle: "We'll send an OTP to verify your official work profile and start matching candidates to this role.", placeholder: "Contact details" }
  ];

  const activeSteps = flowType === "job" ? jobStepsList : stepsList;

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

  const handleNextStep = async (e) => {
    e.preventDefault();
    setOtpError("");
    if (currentStep < 6) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setMaxStepUnlocked((prev) => Math.max(prev, nextStep));
    } else {
      if (password !== confirmPassword) {
        setOtpError("Password and Confirm Password do not match.");
        return;
      }
      if (password.length < 6) {
        setOtpError("Password must be at least 6 characters.");
        return;
      }

      setSubmitting(true);
      try {
        const identifier = email;
        const accessToken = await startOtpWidget(identifier);
        await register(
          contactName || "Employer",
          mobile || "9876543210",
          companyName || "Partner Company",
          email || `employer_${Date.now()}@company.com`,
          password,
          accessToken
        );
        setRegSuccess(true);
      } catch (err) {
        setOtpError(err.response?.data?.message || err.message || "OTP verification or registration failed.");
      } finally {
        setSubmitting(false);
      }
    }
  };

  const startHireFlow = (initialStep = 1, flow = "hire") => {
    setFlowType(flow);
    setCurrentStep(initialStep);
    setMaxStepUnlocked(initialStep);
    setViewMode("steps");
  };

  if (regSuccess) {
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
            border: "1px solid rgba(229,168,46,0.35)",
            borderRadius: 20,
            padding: "44px 36px",
            maxWidth: 480,
            width: "100%",
            textAlign: "center",
            boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
            color: "#FAF7F0"
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎉</div>
          <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, marginBottom: 10, color: "#fff" }}>
            Company Registered Successfully!
          </h2>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,0.75)", lineHeight: 1.6, marginBottom: 24 }}>
            Your account for <strong style={{ color: "var(--gold)" }}>{companyName || "your company"}</strong> has been created.
            Please log in with your email and password to access your dashboard.
          </p>

          <button
            onClick={() => navigate("/companies/login", { state: { email } })}
            style={{
              width: "100%",
              padding: "14px 20px",
              background: "var(--gold)",
              color: "#0A1F3D",
              border: "none",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 15,
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            Proceed to Employer Login →
          </button>
        </div>
      </div>
    );
  }

  // Mode 1: Main Company Hiring Landing Hero (Shown First on "Hire Verified Talent →")
  if (viewMode === "hero") {
    return (
      <div style={{ minHeight: "100vh", background: "var(--navy-deep)", color: "#fff", display: "flex", flexDirection: "column" }}>
        {/* Sticky Header */}
        <header
          style={{
            background: "var(--navy)",
            padding: "16px 48px",
            borderBottom: "1px solid var(--border-dark)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            position: "sticky",
            top: 0,
            zIndex: 100
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

          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <Link
              to="/companies"
              style={{
                color: "rgba(255,255,255,0.8)",
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              Employer Login
            </Link>
            <button
              className="hv-btn-gold"
              style={{ padding: "8px 18px", fontSize: 13 }}
              onClick={() => startHireFlow(1, "hire")}
            >
              Post a Requirement →
            </button>
            <Link
              to="/"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.15)",
                color: "#fff",
                padding: "8px 16px",
                borderRadius: 8,
                fontSize: 13,
                fontWeight: 600,
                textDecoration: "none"
              }}
            >
              ← Back Home
            </Link>
          </div>
        </header>

        {/* Complete 10-Section Hire Verified Talent Content */}
        <HireVerifiedTalentContent
          onPostRequirement={() => startHireFlow(1, "hire")}
          onPostJob={() => startHireFlow(1, "job")}
        />
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
              {flowType === "job" ? "JOB REQUIREMENT" : "COMPANY REGISTRATION"}
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
          {activeSteps.map((st, idx) => {
            const isActive = currentStep === st.id;
            const isDone = currentStep > st.id;
            const isUnlocked = st.id <= maxStepUnlocked;
            return (
              <React.Fragment key={st.id}>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 6,
                    cursor: isUnlocked ? "pointer" : "not-allowed",
                    opacity: isUnlocked ? 1 : 0.45,
                    transition: "all 0.2s"
                  }}
                  onClick={() => {
                    if (isUnlocked) {
                      setCurrentStep(st.id);
                    }
                  }}
                  title={isUnlocked ? `Step ${st.id}: ${st.label}` : `Complete step ${currentStep} first to unlock`}
                >
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
                  <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.08em", color: isActive ? "var(--navy)" : isDone ? "#166534" : "#94A3B8" }}>
                    {st.label}
                  </span>
                </div>

                {idx < activeSteps.length - 1 && (
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
            STEP {currentStep} OF 6 · {activeSteps[currentStep - 1].key}
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 8, letterSpacing: "-0.01em" }}>
            {activeSteps[currentStep - 1].title}
          </h2>

          <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28, lineHeight: 1.5 }}>
            {activeSteps[currentStep - 1].subtitle}
          </p>

          <form onSubmit={handleNextStep}>
            {flowType === "hire" && currentStep === 1 && (
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

            {flowType === "job" && currentStep === 1 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  JOB TITLE
                </label>
                <input
                  type="text"
                  placeholder={jobStepsList[0].placeholder}
                  value={jobTitle}
                  onChange={(e) => setJobTitle(e.target.value)}
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

            {flowType === "hire" && currentStep === 2 && (
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

            {flowType === "job" && currentStep === 2 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  ROLE SPECIALTY
                </label>
                <select
                  value={jobSpecialty}
                  onChange={(e) => setJobSpecialty(e.target.value)}
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

            {flowType === "hire" && currentStep === 3 && (
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

            {flowType === "job" && currentStep === 3 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  ROLE LOCATION
                </label>
                <input
                  type="text"
                  placeholder={jobStepsList[2].placeholder}
                  value={jobLocation}
                  onChange={(e) => setJobLocation(e.target.value)}
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

            {flowType === "hire" && currentStep === 4 && (
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

            {flowType === "job" && currentStep === 4 && (
              <div style={{ marginBottom: 24 }}>
                <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                  EXPERIENCE LEVEL
                </label>
                <select
                  value={jobExperience}
                  onChange={(e) => setJobExperience(e.target.value)}
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
                  <option value="0-1 Years (Entry Level)">0 - 1 Years (Entry Level)</option>
                  <option value="1-3 Years (Associate)">1 - 3 Years (Associate)</option>
                  <option value="3-6 Years (Senior)">3 - 6 Years (Senior)</option>
                  <option value="6+ Years (Lead / SME)">6+ Years (Lead / SME)</option>
                </select>
              </div>
            )}

            {flowType === "hire" && currentStep === 5 && (
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

            {flowType === "job" && currentStep === 5 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 14, marginBottom: 24 }}>
                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    EMPLOYMENT TYPE
                  </label>
                  <select
                    value={jobEmploymentType}
                    onChange={(e) => setJobEmploymentType(e.target.value)}
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
                    <option value="Full-time">Full-time</option>
                    <option value="Contract">Contract</option>
                    <option value="Contract-to-hire">Contract-to-hire</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    SALARY RANGE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. ₹4,00,000 - ₹6,00,000 / year"
                    value={jobSalaryRange}
                    onChange={(e) => setJobSalaryRange(e.target.value)}
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

                <div>
                  <label style={{ display: "block", fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--navy)", marginBottom: 6 }}>
                    CREATE PASSWORD
                  </label>
                  <input
                    type="password"
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
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
                    CONFIRM PASSWORD
                  </label>
                  <input
                    type="password"
                    placeholder="Re-enter password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
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

            {otpError && (
              <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 12, borderRadius: 8, fontSize: 13, marginTop: 12 }}>
                {otpError}
              </div>
            )}

            <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
              <button
                type="button"
                disabled={submitting}
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
                disabled={submitting}
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
                {submitting
                  ? "Verifying OTP..."
                  : currentStep === 6
                  ? (flowType === "job" ? "Verify & Publish Job →" : "Verify OTP & Register →")
                  : "Continue →"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
