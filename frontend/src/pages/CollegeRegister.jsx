import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

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

export default function CollegeRegister() {
  const navigate = useNavigate();
  const toast = useToast();

  const [step, setStep] = useState(1); // 1: Institutional Profile, 2: Placement Officer, 3: Departments & Security
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    type: "Arts & Science",
    affiliation: "",
    yearEstablished: "2008",
    website: "",
    address: "",
    city: "",
    state: "Tamil Nadu",
    pincode: "",
    collegeContactPhone: "",
    placementOfficerName: "",
    placementOfficerEmail: "",
    placementOfficerMobile: "",
    alternateContact: "",
    password: "",
    confirmPassword: "",
    departments: DEFAULT_DEPARTMENTS,
  });

  const updateField = (k, v) => setFormData((prev) => ({ ...prev, [k]: v }));

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/college/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
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

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 60%, #152A4A 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background ambient glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-100px",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,168,46,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-120px",
          left: "-100px",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(37,99,235,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />

      {/* Top Navbar */}
      <header
        style={{
          padding: "16px 32px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          background: "rgba(6,21,42,0.6)",
          backdropFilter: "blur(12px)",
          zIndex: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Link
            to="/"
            style={{
              textDecoration: "none",
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <img
              src="/logo-white.png"
              alt="Talentera — The Era of Talent Begins Here"
              style={{ height: 38, width: "auto" }}
            />
            <span
              style={{
                background: "rgba(229,168,46,0.15)",
                color: "#E5A82E",
                border: "1px solid rgba(229,168,46,0.35)",
                padding: "3px 9px",
                borderRadius: 6,
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              CAMPUS ONBOARDING
            </span>
          </Link>

          <Link
            to="/"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#FAF7F0",
              padding: "7px 14px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 600,
              textDecoration: "none",
              transition: "all 0.2s ease",
            }}
          >
            <i className="fa-solid fa-arrow-left" style={{ fontSize: 11 }}></i> Go to Homepage
          </Link>
        </div>

        <Link
          to="/college/login"
          style={{
            color: "#E5A82E",
            textDecoration: "none",
            fontSize: 13,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          Already Registered? Log in →
        </Link>
      </header>

      {/* Main Container */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "36px 20px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 680,
            background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "36px 40px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          {/* Step Progress Indicators */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 28,
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              paddingBottom: 18,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: step >= 1 ? "#FAF7F0" : "rgba(255,255,255,0.45)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: step >= 1 ? "#E5A82E" : "rgba(255,255,255,0.1)",
                  color: step >= 1 ? "#0A1F3D" : "rgba(255,255,255,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                1
              </span>
              Institution Profile
            </div>
            <div
              style={{
                height: 2,
                flex: 1,
                background: step >= 2 ? "#E5A82E" : "rgba(255,255,255,0.15)",
                margin: "0 12px",
                transition: "all 0.3s ease",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: step >= 2 ? "#FAF7F0" : "rgba(255,255,255,0.45)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: step >= 2 ? "#E5A82E" : "rgba(255,255,255,0.1)",
                  color: step >= 2 ? "#0A1F3D" : "rgba(255,255,255,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                2
              </span>
              Placement Office
            </div>
            <div
              style={{
                height: 2,
                flex: 1,
                background: step >= 3 ? "#E5A82E" : "rgba(255,255,255,0.15)",
                margin: "0 12px",
                transition: "all 0.3s ease",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                color: step >= 3 ? "#FAF7F0" : "rgba(255,255,255,0.45)",
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: step >= 3 ? "#E5A82E" : "rgba(255,255,255,0.1)",
                  color: step >= 3 ? "#0A1F3D" : "rgba(255,255,255,0.5)",
                  display: "grid",
                  placeItems: "center",
                  fontSize: 12,
                  fontWeight: 900,
                }}
              >
                3
              </span>
              Departments & Auth
            </div>
          </div>

          {error && (
            <div
              style={{
                background: "rgba(248,113,113,0.1)",
                border: "1px solid rgba(248,113,113,0.3)",
                color: "#F87171",
                padding: "12px 14px",
                borderRadius: 8,
                fontSize: 13,
                marginBottom: 18,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Institutional Profile */}
          {step === 1 && (
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#FAF7F0",
                  margin: "0 0 6px",
                }}
              >
                Institutional Details
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  margin: "0 0 20px",
                }}
              >
                Provide foundational information about your college or university.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
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
                    College / University Full Name <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. PSG College of Arts & Science"
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
                      College Type <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      style={{
                        width: "100%",
                        padding: "11px 14px",
                        background: "#0A1F3D",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 10,
                        color: "#FAF7F0",
                        fontFamily: "inherit",
                        fontSize: 14,
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    >
                      {COLLEGE_TYPES.map((t) => (
                        <option
                          key={t}
                          value={t}
                          style={{ background: "#0A1F3D", color: "#FAF7F0" }}
                        >
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
                      Affiliation / University
                    </label>
                    <input
                      type="text"
                      value={formData.affiliation}
                      onChange={(e) => updateField("affiliation", e.target.value)}
                      placeholder="e.g. Bharathiar University / Autonomous"
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
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
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
                      City <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g. Coimbatore"
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
                      State <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="e.g. Tamil Nadu"
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
                      Year Estd
                    </label>
                    <input
                      type="number"
                      value={formData.yearEstablished}
                      onChange={(e) => updateField("yearEstablished", e.target.value)}
                      placeholder="e.g. 1998"
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
                    College Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://www.college.edu.in"
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
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.name || !formData.city || !formData.state) {
                      setError("Please provide College Name, City, and State.");
                      return;
                    }
                    setError("");
                    setStep(2);
                  }}
                  style={{
                    padding: "13px 26px",
                    background: "#E5A82E",
                    color: "#0A1F3D",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    transition: "all 0.2s ease",
                  }}
                >
                  Continue to Placement Office <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Placement Officer */}
          {step === 2 && (
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#FAF7F0",
                  margin: "0 0 6px",
                }}
              >
                Placement Officer & Contact
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  margin: "0 0 20px",
                }}
              >
                Primary point of contact for corporate campus drives and student batches.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
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
                    Placement Officer / Dean Name <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.placementOfficerName}
                    onChange={(e) => updateField("placementOfficerName", e.target.value)}
                    placeholder="e.g. Dr. K. Venkataraman"
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

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
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
                      Official Placement Email <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.placementOfficerEmail}
                      onChange={(e) => updateField("placementOfficerEmail", e.target.value)}
                      placeholder="placement@college.edu.in"
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
                    <span style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", marginTop: 4, display: "block" }}>
                      This will be your dashboard login email.
                    </span>
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
                      Mobile Number <span style={{ color: "#F87171" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.placementOfficerMobile}
                      onChange={(e) => updateField("placementOfficerMobile", e.target.value)}
                      placeholder="+91 9876543210"
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
                    College Campus Landline / Desk Phone
                  </label>
                  <input
                    type="text"
                    value={formData.collegeContactPhone}
                    onChange={(e) => updateField("collegeContactPhone", e.target.value)}
                    placeholder="0422-2574000"
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
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{
                    padding: "12px 20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#FAF7F0",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!formData.placementOfficerName || !formData.placementOfficerEmail || !formData.placementOfficerMobile) {
                      setError("Please provide Placement Officer Name, Email, and Mobile number.");
                      return;
                    }
                    setError("");
                    setStep(3);
                  }}
                  style={{
                    padding: "13px 26px",
                    background: "#E5A82E",
                    color: "#0A1F3D",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  Continue to Credentials <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Departments & Security Password */}
          {step === 3 && (
            <div>
              <h3
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 19,
                  fontWeight: 800,
                  color: "#FAF7F0",
                  margin: "0 0 6px",
                }}
              >
                Departments & Access Credentials
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "rgba(255,255,255,0.65)",
                  margin: "0 0 18px",
                }}
              >
                Configure participating RCM talent departments and set your secure access password.
              </p>

              {/* Department Highlights */}
              <div
                style={{
                  background: "rgba(0,0,0,0.25)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: 12,
                  padding: "14px 16px",
                  marginBottom: 18,
                }}
              >
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: "#E5A82E",
                    marginBottom: 8,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Selected Participating Departments ({formData.departments.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {formData.departments.map((d, i) => (
                    <span
                      key={i}
                      style={{
                        background: "rgba(255,255,255,0.06)",
                        border: "1px solid rgba(255,255,255,0.12)",
                        padding: "5px 12px",
                        borderRadius: 6,
                        fontSize: 12,
                        color: "#FAF7F0",
                        fontWeight: 600,
                      }}
                    >
                      <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6, color: "#E5A82E" }}></i>
                      {d.name} ({d.studentCount} students)
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 18 }}>
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
                    Create Password <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Min 6 characters"
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
                    Confirm Password <span style={{ color: "#F87171" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    placeholder="Repeat password"
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
              </div>

              <div
                style={{
                  background: "rgba(59,130,246,0.12)",
                  border: "1px solid rgba(59,130,246,0.25)",
                  borderRadius: 10,
                  padding: "12px 16px",
                  fontSize: 12.5,
                  color: "#93C5FD",
                  lineHeight: 1.5,
                  marginBottom: 22,
                }}
              >
                <i className="fa-solid fa-shield-halved" style={{ marginRight: 8, color: "#60A5FA" }}></i>
                Institutional registration places your college in <strong>Under Review</strong> status while our academic audit team verifies institutional credentials. You will have full access to student enrollment and mock drives immediately.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{
                    padding: "12px 20px",
                    background: "rgba(255,255,255,0.08)",
                    border: "1px solid rgba(255,255,255,0.15)",
                    color: "#FAF7F0",
                    borderRadius: 10,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: "pointer",
                  }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRegister}
                  style={{
                    padding: "13px 28px",
                    background: "#E5A82E",
                    color: "#0A1F3D",
                    border: "none",
                    borderRadius: 10,
                    fontWeight: 800,
                    fontSize: 14,
                    cursor: loading ? "not-allowed" : "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {loading ? (
                    <>
                      <i className="fa-solid fa-circle-notch fa-spin"></i> Submitting…
                    </>
                  ) : (
                    <>
                      Submit Institutional Registration <i className="fa-solid fa-check"></i>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
