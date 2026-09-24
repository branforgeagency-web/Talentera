import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";
import { useToast } from "../components/Toast.jsx";
import { safeJson } from "../utils/safeJson.js";

const COLLEGE_TYPES = [
  "Arts & Science",
  "Engineering & Technology",
  "Pharmacy",
  "Allied Health Sciences",
  "Nursing",
  "Medical",
  "Management & Commerce",
  "Polytechnic",
  "Autonomous University",
  "Other",
];

const DEFAULT_DEPARTMENTS = [
  { name: "Life Sciences & Biotechnology", degrees: ["B.Sc Biotechnology", "M.Sc Biochemistry"], studentCount: 120 },
  { name: "Allied Health Sciences", degrees: ["B.Sc Allied Health", "BPT"], studentCount: 90 },
  { name: "Commerce & Management", degrees: ["B.Com", "BBA"], studentCount: 150 },
  { name: "Computer Science & IT", degrees: ["BCA", "B.Sc CS"], studentCount: 110 },
];

export default function ForColleges() {
  const navigate = useNavigate();
  const toast = useToast();

  const [authMode, setAuthMode] = useState("login"); // "login" | "register"
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Login form state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Register form state
  const [regData, setRegData] = useState({
    name: "",
    type: "Arts & Science",
    affiliation: "",
    city: "",
    state: "Tamil Nadu",
    placementOfficerName: "",
    placementOfficerEmail: "",
    placementOfficerMobile: "",
    password: "",
    confirmPassword: "",
  });

  const updateRegField = (k, v) => setRegData((prev) => ({ ...prev, [k]: v }));

  // Handle Login
  async function handleLogin(e) {
    if (e) e.preventDefault();
    setError("");

    const cleanEmail = loginEmail.trim().toLowerCase();
    if (!cleanEmail || !loginPassword) {
      setError("Please enter your placement officer email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/college/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: loginPassword }),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      localStorage.setItem("talentera_college_token", data.token);
      localStorage.setItem("talentera_college_info", JSON.stringify(data.college));
      toast(`Welcome back, ${data.college.placementOfficerName || data.college.name}!`, "✓");
      navigate("/college/dashboard");
    } catch (err) {
      setError(err.message);
      toast(err.message, "!");
    } finally {
      setLoading(false);
    }
  }

  // Handle Demo Login
  function handleDemoLogin() {
    localStorage.setItem("talentera_college_token", "demo_college_token_12345");
    localStorage.setItem(
      "talentera_college_info",
      JSON.stringify({
        name: "PSG Institute of Technology & Allied Health Sciences",
        city: "Coimbatore",
        state: "Tamil Nadu",
        placementOfficerName: "Prof. S. Ranganathan",
        placementOfficerEmail: "placement@demo-college.edu.in",
        tier: "Gold RCM Center of Excellence",
        verificationStatus: "VERIFIED",
      })
    );
    toast("Logged in as Demo Placement Officer", "✓");
    navigate("/college/dashboard");
  }

  // Handle Register
  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");

    if (!regData.name.trim() || !regData.city.trim() || !regData.state.trim()) {
      setError("Please provide College Name, City, and State.");
      return;
    }

    if (!regData.placementOfficerName.trim() || !regData.placementOfficerEmail.trim() || !regData.placementOfficerMobile.trim()) {
      setError("Please provide Placement Officer Name, Email, and Mobile number.");
      return;
    }

    if (regData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    if (regData.password !== regData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name: regData.name.trim(),
        type: regData.type,
        affiliation: regData.affiliation.trim(),
        city: regData.city.trim(),
        state: regData.state.trim(),
        placementOfficerName: regData.placementOfficerName.trim(),
        placementOfficerEmail: regData.placementOfficerEmail.trim().toLowerCase(),
        placementOfficerMobile: regData.placementOfficerMobile.trim(),
        password: regData.password,
        departments: DEFAULT_DEPARTMENTS,
      };

      const res = await fetch("/api/college/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await safeJson(res);
      if (!res.ok) {
        throw new Error(data.message || "Failed to register college.");
      }

      localStorage.setItem("talentera_college_token", data.token);
      localStorage.setItem("talentera_college_info", JSON.stringify(data.college));
      toast("Institutional onboarding completed! Welcome to Talentera Campus OS.", "✓");
      navigate("/college/dashboard");
    } catch (err) {
      setError(err.message);
      toast(err.message, "!");
    } finally {
      setLoading(false);
    }
  }

  // FAQ Accordion State
  const [openFaq, setOpenFaq] = useState(0);

  const faqs = [
    {
      q: "1. How does Talentera help college placement cells?",
      a: "Talentera provides an end-to-end institutional operating system connecting placement officers, academic departments, and graduating students directly with 200+ verified healthcare RCM employers. We enable 1-click batch Excel onboarding, domain skill matching, proctored assessments, and direct corporate interview drives."
    },
    {
      q: "2. Which student streams are eligible for US Healthcare RCM placements?",
      a: "Students from Life Sciences (Biotechnology, Microbiology, Biochemistry), Allied Health Sciences, Nursing, Pharmacy, Commerce (B.Com, BBA), and Computer Science/IT are eligible. Tracks are automatically matched: Life Sciences to Medical Coding, Commerce to Billing/AR, and CS/IT to RCM Systems."
    },
    {
      q: "3. Can we upload our entire student graduating roster at once?",
      a: "Yes. Our 1-Click Excel/CSV Bulk Onboarding parses hundreds of student records instantly, generates candidate profiles, and provisions verified login credentials for every enrolled student automatically."
    },
    {
      q: "4. Is there any registration fee for colleges or placement cells?",
      a: "No. Institutional registration, student batch enrollment, proctored assessments, and corporate matching on Talentera Campus OS are 100% free for educational institutions."
    },
    {
      q: "5. How do NAAC and NBA accreditation audits benefit from Talentera?",
      a: "Talentera automatically compiles verified placement records, salary distribution matrices (₹3 LPA - ₹6 LPA), domain-wise hiring logs, and employer offer letters for seamless submission during NAAC Criterion 5 and NBA audits."
    }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#06152A", color: "#FAF7F0", fontFamily: "var(--font-body)", overflowX: "hidden" }}>
      {/* Top Floating Liquid Navigation Capsule */}
      <LiquidNavCapsule activeTab={3} />

      {/* Back to Home Button (Top Left Corner) */}
      <div style={{ position: "fixed", top: 22, left: 24, zIndex: 999 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 7,
            background: "rgba(6, 21, 42, 0.75)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.15)",
            color: "#FAF7F0",
            padding: "8px 16px",
            borderRadius: 8,
            fontSize: 12.5,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
            transition: "all 0.2s ease",
          }}
        >
          <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }}></i> Back to Home
        </Link>
      </div>

      {/* HERO SECTION */}
      <section
        style={{
          position: "relative",
          padding: "130px 24px 70px",
          background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 55%, #152A4A 100%)",
          overflow: "hidden",
        }}
      >
        {/* Ambient atmospheric glow orbs */}
        <div
          style={{
            position: "absolute",
            top: "-150px",
            right: "-120px",
            width: 550,
            height: 550,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(229,168,46,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            left: "-120px",
            width: 550,
            height: 550,
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ maxWidth: 1140, margin: "0 auto", position: "relative", zIndex: 2 }}>
          <div style={{ textAlign: "center", maxWidth: 860, margin: "0 auto 40px" }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(229,168,46,0.12)",
                border: "1px solid rgba(229,168,46,0.35)",
                color: "#E5A82E",
                padding: "6px 16px",
                borderRadius: 24,
                fontSize: 12.5,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                marginBottom: 20,
              }}
            >
              <i className="fa-solid fa-building-columns"></i> TALENTERA CAMPUS PLACEMENT ECOSYSTEM
            </div>

            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 5vw, 50px)",
                fontWeight: 900,
                lineHeight: 1.15,
                margin: "0 0 20px",
                letterSpacing: "-0.5px",
                color: "#FAF7F0",
              }}
            >
              Bridge Your Students Directly to <br />
              <span style={{ color: "#E5A82E" }}>US Healthcare RCM Careers</span>
            </h1>

            <p
              style={{
                fontSize: 16.5,
                color: "rgba(255,255,255,0.75)",
                lineHeight: 1.6,
                maxWidth: 720,
                margin: "0 auto 30px",
              }}
            >
              Empower Life Sciences, Allied Health, Commerce & IT graduates with structured RCM Domain pathways, proctored assessments, and direct campus-to-corporate hiring drives with 200+ healthcare employers.
            </p>

            {/* Quick jump to auth form */}
            <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
              <a
                href="#college-portal-auth"
                style={{
                  background: "#E5A82E",
                  color: "#0A1F3D",
                  padding: "13px 28px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 800,
                  fontSize: 14.5,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  boxShadow: "0 4px 16px rgba(229,168,46,0.3)",
                }}
              >
                Access Placement Portal ↓
              </a>
              <a
                href="#why-colleges"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  color: "#FAF7F0",
                  padding: "13px 24px",
                  borderRadius: 10,
                  textDecoration: "none",
                  fontWeight: 700,
                  fontSize: 14.5,
                }}
              >
                Explore Institutional Benefits ↓
              </a>
            </div>
          </div>

          {/* Key Metric Stats Banner */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 16,
              background: "rgba(10,31,61,0.7)",
              backdropFilter: "blur(12px)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 18,
              padding: "24px 28px",
              boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
            }}
          >
            <div style={{ textAlign: "center", padding: "10px" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#E5A82E", marginBottom: 4 }}>₹3.2 - ₹6 LPA</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Campus Placement Packages</div>
            </div>
            <div style={{ textAlign: "center", padding: "10px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#FAF7F0", marginBottom: 4 }}>200+</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Verified RCM Employers</div>
            </div>
            <div style={{ textAlign: "center", padding: "10px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#E5A82E", marginBottom: 4 }}>1-Click</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>Excel Roster Batch Upload</div>
            </div>
            <div style={{ textAlign: "center", padding: "10px", borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: "#FAF7F0", marginBottom: 4 }}>100%</div>
              <div style={{ fontSize: 12.5, color: "rgba(255,255,255,0.65)", fontWeight: 600 }}>NAAC / NBA Audit Compliant</div>
            </div>
          </div>
        </div>
      </section>

      {/* EMBEDDED AUTH SECTION (LOGIN & REGISTER) */}
      <section
        id="college-portal-auth"
        style={{
          padding: "70px 20px",
          background: "#06152A",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          position: "relative",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: authMode === "login" ? 460 : 660,
            background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "36px 36px",
            boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            transition: "max-width 0.3s ease",
          }}
        >
          {/* Header Brand */}
          <div style={{ textAlign: "center", marginBottom: 20 }}>
            <div style={{ cursor: "pointer", display: "inline-block", marginBottom: 12 }} onClick={() => navigate("/")}>
              <img src="/logo-white.png" alt="Talentera" style={{ height: 38, width: "auto" }} />
            </div>
            <div
              style={{
                color: "#E5A82E",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              COLLEGE PLACEMENT PORTAL
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 21,
                color: "#FAF7F0",
                margin: "6px 0 4px",
              }}
            >
              {authMode === "login" ? "Placement Cell Sign In" : "Register Your College Cell"}
            </h2>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", margin: 0 }}>
              {authMode === "login"
                ? "Access student batches, proctored exams, and corporate placement drives."
                : "Join the Talentera network to empower your graduates with RCM careers."}
            </p>
          </div>

          {/* Pill Tab Switcher */}
          <div
            style={{
              display: "flex",
              gap: 4,
              background: "rgba(0,0,0,0.3)",
              padding: 4,
              borderRadius: 10,
              marginBottom: 22,
            }}
          >
            <div
              onClick={() => {
                setAuthMode("login");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "9px",
                textAlign: "center",
                cursor: "pointer",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                color: authMode === "login" ? "#FAF7F0" : "rgba(255,255,255,0.5)",
                background: authMode === "login" ? "#1A2F4D" : "transparent",
                transition: "all 0.2s",
                boxShadow: authMode === "login" ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
              }}
            >
              <i className="fa-solid fa-right-to-bracket" style={{ marginRight: 6 }}></i> Log In
            </div>
            <div
              onClick={() => {
                setAuthMode("register");
                setError("");
              }}
              style={{
                flex: 1,
                padding: "9px",
                textAlign: "center",
                cursor: "pointer",
                borderRadius: 8,
                fontWeight: 700,
                fontSize: 13.5,
                color: authMode === "register" ? "#FAF7F0" : "rgba(255,255,255,0.5)",
                background: authMode === "register" ? "#1A2F4D" : "transparent",
                transition: "all 0.2s",
                boxShadow: authMode === "register" ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
              }}
            >
              <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6 }}></i> Register College
            </div>
          </div>

          {/* Error Banner */}
          {error && (
            <div
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                color: "#F87171",
                padding: "11px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* TAB 1: LOGIN FORM */}
          {authMode === "login" ? (
            <form onSubmit={handleLogin}>
              <div style={{ marginBottom: 16 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    marginBottom: 6,
                  }}
                >
                  PLACEMENT OFFICER EMAIL <span style={{ color: "#F87171" }}>*</span>
                </label>
                <input
                  type="email"
                  required
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="placement@college.edu.in"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    color: "#FAF7F0",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 11,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "rgba(255,255,255,0.65)",
                    marginBottom: 6,
                  }}
                >
                  PASSWORD <span style={{ color: "#F87171" }}>*</span>
                </label>
                <input
                  type="password"
                  required
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    background: "rgba(0,0,0,0.3)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    borderRadius: 10,
                    color: "#FAF7F0",
                    fontFamily: "inherit",
                    fontSize: 14,
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: "#E5A82E",
                  color: "#0A1F3D",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating…
                  </>
                ) : (
                  <>
                    Sign In to Dashboard <i className="fa-solid fa-arrow-right"></i>
                  </>
                )}
              </button>

              {/* Quick Demo Access */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "18px 0 12px" }}>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
                <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>OR</span>
                <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
              </div>

              <button
                type="button"
                onClick={handleDemoLogin}
                style={{
                  width: "100%",
                  padding: "11px",
                  background: "rgba(229,168,46,0.12)",
                  color: "#E5A82E",
                  border: "1.5px dashed #E5A82E",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                <i className="fa-solid fa-bolt"></i> Instant Demo College Access (1-Click)
              </button>
            </form>
          ) : (
            /* TAB 2: REGISTER FORM */
            <form onSubmit={handleRegister}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 6,
                    }}
                  >
                    COLLEGE / UNIVERSITY NAME <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.name}
                    onChange={(e) => updateRegField("name", e.target.value)}
                    placeholder="e.g. PSG College of Technology"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#FAF7F0",
                      fontFamily: "inherit",
                      fontSize: 14,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      COLLEGE TYPE <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <select
                      value={regData.type}
                      onChange={(e) => updateRegField("type", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "#0A1F3D",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      {COLLEGE_TYPES.map((t) => (
                        <option key={t} value={t} style={{ background: "#0A1F3D", color: "#FAF7F0" }}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      AFFILIATION / UNIVERSITY
                    </label>
                    <input
                      type="text"
                      value={regData.affiliation}
                      onChange={(e) => updateRegField("affiliation", e.target.value)}
                      placeholder="e.g. Autonomous / Anna Univ"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      CITY <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regData.city}
                      onChange={(e) => updateRegField("city", e.target.value)}
                      placeholder="e.g. Coimbatore"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      STATE <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={regData.state}
                      onChange={(e) => updateRegField("state", e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "rgba(255,255,255,0.65)",
                      marginBottom: 6,
                    }}
                  >
                    PLACEMENT OFFICER / DEAN NAME <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={regData.placementOfficerName}
                    onChange={(e) => updateRegField("placementOfficerName", e.target.value)}
                    placeholder="e.g. Dr. K. Venkataraman"
                    style={{
                      width: "100%",
                      padding: "11px 14px",
                      background: "rgba(0,0,0,0.3)",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 10,
                      color: "#FAF7F0",
                      fontFamily: "inherit",
                      fontSize: 13.5,
                      outline: "none",
                      boxSizing: "border-box",
                    }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      PLACEMENT EMAIL <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={regData.placementOfficerEmail}
                      onChange={(e) => updateRegField("placementOfficerEmail", e.target.value)}
                      placeholder="placement@college.edu.in"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      MOBILE NUMBER <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={regData.placementOfficerMobile}
                      onChange={(e) => updateRegField("placementOfficerMobile", e.target.value)}
                      placeholder="+91 9876543210"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      CREATE PASSWORD <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={regData.password}
                      onChange={(e) => updateRegField("password", e.target.value)}
                      placeholder="Min 6 chars"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div>
                    <label
                      style={{
                        display: "block",
                        fontSize: 11,
                        fontWeight: 700,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "rgba(255,255,255,0.65)",
                        marginBottom: 6,
                      }}
                    >
                      CONFIRM PASSWORD <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="password"
                      required
                      value={regData.confirmPassword}
                      onChange={(e) => updateRegField("confirmPassword", e.target.value)}
                      placeholder="Repeat password"
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 13.5,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "13px",
                  background: "#E5A82E",
                  color: "#0A1F3D",
                  border: "none",
                  borderRadius: 10,
                  fontWeight: 800,
                  fontSize: 14.5,
                  cursor: loading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 8,
                }}
              >
                {loading ? (
                  <>
                    <i className="fa-solid fa-circle-notch fa-spin"></i> Registering Institution…
                  </>
                ) : (
                  <>
                    Complete Institutional Onboarding <i className="fa-solid fa-check"></i>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* WHY PARTNER SECTION */}
      <section id="why-colleges" style={{ padding: "80px 24px", maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <div
            style={{
              color: "#E5A82E",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            PURPOSE-BUILT FOR HIGHER EDUCATION
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 900,
              color: "#FAF7F0",
              margin: "0 0 12px",
            }}
          >
            Why Premier Colleges Partner with Talentera
          </h2>
          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.65)", maxWidth: 640, margin: "0 auto" }}>
            A complete end-to-end framework designed for Placement Officers, Department Heads, and Students.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Card 1 */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A1F3D 0%, #152A4A 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "32px 28px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(229,168,46,0.15)",
                color: "#E5A82E",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                marginBottom: 18,
              }}
            >
              <i className="fa-solid fa-laptop-code"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#FAF7F0", margin: "0 0 10px" }}>3 High-Demand RCM Tracks</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
              Curated modules for <strong>Medical Coding</strong> (ICD-10-CM, CPT, HCPCS, E&M), <strong>Medical Billing</strong> (Denial management, Claims adjudication), and <strong>AR Calling</strong> (Voice/Non-voice).
            </p>
          </div>

          {/* Card 2 */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A1F3D 0%, #152A4A 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "32px 28px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(229,168,46,0.15)",
                color: "#E5A82E",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                marginBottom: 18,
              }}
            >
              <i className="fa-solid fa-file-excel"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#FAF7F0", margin: "0 0 10px" }}>Instant Excel Bulk Enrollment</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
              Upload entire student rosters via CSV/Excel in 1-click. Automated credential dispatch, duplicate detection, and candidate ID allocation for entire departments.
            </p>
          </div>

          {/* Card 3 */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A1F3D 0%, #152A4A 100%)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 16,
              padding: "32px 28px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.3)",
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(229,168,46,0.15)",
                color: "#E5A82E",
                display: "grid",
                placeItems: "center",
                fontSize: 20,
                marginBottom: 18,
              }}
            >
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#FAF7F0", margin: "0 0 10px" }}>NAAC & NBA Accreditation Reports</h3>
            <p style={{ fontSize: 14, color: "rgba(255,255,255,0.65)", lineHeight: 1.6, margin: 0 }}>
              One-click verified placement logs, package distributions (₹3 LPA – ₹6 LPA), department placement percentages, and offer letter vaults ready for compliance audits.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS / PIPELINE SECTION */}
      <section style={{ padding: "70px 24px", background: "#051122" }}>
        <div style={{ maxWidth: 1140, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 50 }}>
            <div
              style={{
                color: "#E5A82E",
                fontSize: 12,
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                marginBottom: 10,
              }}
            >
              CAMPUS TO CORPORATE FLOW
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                fontWeight: 900,
                color: "#FAF7F0",
                margin: "0 0 12px",
              }}
            >
              How Talentera Campus OS Powers Placements
            </h2>
            <p style={{ fontSize: 15, color: "rgba(255,255,255,0.65)", maxWidth: 600, margin: "0 auto" }}>
              A proven 4-stage pipeline that transitions college students into corporate RCM professionals.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 20 }}>
            {[
              {
                step: "01",
                title: "Roster Enrollment",
                desc: "Placement Cell registers institution and uploads graduating batch via Excel or manual entry.",
                icon: "fa-solid fa-file-csv",
              },
              {
                step: "02",
                title: "Domain Selection",
                desc: "Students build verified profiles and specialize in Medical Coding, Billing, or AR Calling.",
                icon: "fa-solid fa-sliders",
              },
              {
                step: "03",
                title: "Proctored Assessments",
                desc: "Candidates complete AAPC/AHIMA verification, coding chart audits, and mock interview simulations.",
                icon: "fa-solid fa-shield-check",
              },
              {
                step: "04",
                title: "Corporate Drives & Offers",
                desc: "200+ healthcare employers interview pre-verified talent, issue offers, and dispatch joining letters.",
                icon: "fa-solid fa-handshake",
              },
            ].map((p, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(10,31,61,0.5)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 14,
                  padding: "28px 24px",
                  position: "relative",
                }}
              >
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 900,
                    color: "#E5A82E",
                    letterSpacing: "0.1em",
                    marginBottom: 12,
                  }}
                >
                  PHASE {p.step}
                </div>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(229,168,46,0.12)",
                    color: "#E5A82E",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                    marginBottom: 14,
                  }}
                >
                  <i className={p.icon}></i>
                </div>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: "#FAF7F0", margin: "0 0 8px" }}>{p.title}</h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.5, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ SECTION */}
      <section style={{ padding: "80px 24px", maxWidth: 860, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 44 }}>
          <div
            style={{
              color: "#E5A82E",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            FREQUENTLY ASKED QUESTIONS
          </div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              fontWeight: 900,
              color: "#FAF7F0",
              margin: 0,
            }}
          >
            Everything Placement Officers Need to Know
          </h2>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {faqs.map((faq, idx) => (
            <div
              key={idx}
              style={{
                background: "linear-gradient(135deg, #0A1F3D 0%, #152A4A 100%)",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.1)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  padding: "18px 24px",
                  fontWeight: 700,
                  fontSize: 15,
                  cursor: "pointer",
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  color: "#FAF7F0",
                }}
                onClick={() => setOpenFaq(openFaq === idx ? -1 : idx)}
              >
                <span>{faq.q}</span>
                <span style={{ color: "#E5A82E", fontSize: 13 }}>{openFaq === idx ? "▲" : "▼"}</span>
              </div>
              {openFaq === idx && (
                <div
                  style={{
                    padding: "0 24px 18px",
                    color: "rgba(255,255,255,0.65)",
                    fontSize: 14,
                    lineHeight: 1.6,
                    borderTop: "1px solid rgba(255,255,255,0.06)",
                    paddingTop: 14,
                  }}
                >
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <Footer />
    </div>
  );
}
