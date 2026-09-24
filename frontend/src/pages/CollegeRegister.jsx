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

// Common RCM-feeder department names for the picker below - the college
// can also always type a custom name ("Other"). No default selection or
// student count is ever pre-filled; every entry here must be added by the
// college itself.
const DEPARTMENT_NAME_OPTIONS = [
  "Life Sciences & Biotechnology",
  "Allied Health Sciences",
  "Nursing",
  "Pharmacy",
  "Paramedical Sciences",
  "Medical Lab Technology",
  "Physiotherapy",
  "Commerce & Management",
  "Computer Science & IT",
  "Arts & Humanities",
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
    departments: [],
  });

  const updateField = (k, v) => setFormData((prev) => ({ ...prev, [k]: v }));

  // --- Department picker: dropdown + manual "Other" typing, and each
  // added department stays editable (student count) or removable. Nothing
  // is added until the college explicitly clicks "Add Department".
  const [deptNameChoice, setDeptNameChoice] = useState("");
  const [deptNameOther, setDeptNameOther] = useState("");
  const [deptIsOther, setDeptIsOther] = useState(false);
  const [deptStudentCount, setDeptStudentCount] = useState("");
  const [editingDeptIndex, setEditingDeptIndex] = useState(null);

  const resetDeptPicker = () => {
    setDeptNameChoice("");
    setDeptNameOther("");
    setDeptIsOther(false);
    setDeptStudentCount("");
    setEditingDeptIndex(null);
  };

  const handleAddOrUpdateDepartment = () => {
    const name = (deptIsOther ? deptNameOther : deptNameChoice).trim();
    if (!name) {
      toast("Select or type a department name.", "!");
      return;
    }
    const count = Math.max(0, Number(deptStudentCount) || 0);

    setFormData((prev) => {
      const departments = [...prev.departments];
      const dupIndex = departments.findIndex((d, i) => d.name.toLowerCase() === name.toLowerCase() && i !== editingDeptIndex);
      if (dupIndex !== -1) {
        toast(`"${name}" is already in your department list.`, "!");
        return prev;
      }
      if (editingDeptIndex !== null) {
        departments[editingDeptIndex] = { ...departments[editingDeptIndex], name, studentCount: count };
      } else {
        departments.push({ name, degrees: [], studentCount: count });
      }
      return { ...prev, departments };
    });
    resetDeptPicker();
  };

  const handleEditDepartment = (i) => {
    const d = formData.departments[i];
    const isKnown = DEPARTMENT_NAME_OPTIONS.includes(d.name);
    setEditingDeptIndex(i);
    setDeptIsOther(!isKnown);
    setDeptNameChoice(isKnown ? d.name : "");
    setDeptNameOther(isKnown ? "" : d.name);
    setDeptStudentCount(String(d.studentCount ?? ""));
  };

  const handleRemoveDepartment = (i) => {
    setFormData((prev) => ({ ...prev, departments: prev.departments.filter((_, idx) => idx !== i) }));
    if (editingDeptIndex === i) resetDeptPicker();
  };

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");

    if (formData.departments.length === 0) {
      setError("Add at least one participating department.");
      toast("Add at least one participating department.", "!");
      return;
    }

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
                      inputMode="numeric"
                      required
                      maxLength={10}
                      value={formData.placementOfficerMobile}
                      onChange={(e) => updateField("placementOfficerMobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="9876543210"
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
                    type="tel"
                    inputMode="tel"
                    maxLength={12}
                    value={formData.collegeContactPhone}
                    onChange={(e) => updateField("collegeContactPhone", e.target.value.replace(/[^\d-]/g, "").slice(0, 12))}
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

                {formData.departments.length === 0 ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 10 }}>
                    No departments added yet — pick one below and click Add.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 12 }}>
                    {formData.departments.map((d, i) => (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 8,
                          background: editingDeptIndex === i ? "rgba(229,168,46,0.15)" : "rgba(255,255,255,0.06)",
                          border: editingDeptIndex === i ? "1px solid #E5A82E" : "1px solid rgba(255,255,255,0.12)",
                          padding: "5px 8px 5px 12px",
                          borderRadius: 6,
                          fontSize: 12,
                          color: "#FAF7F0",
                          fontWeight: 600,
                        }}
                      >
                        <i className="fa-solid fa-graduation-cap" style={{ color: "#E5A82E" }}></i>
                        {d.name} ({d.studentCount} students)
                        <button
                          type="button"
                          onClick={() => handleEditDepartment(i)}
                          title="Edit"
                          style={{ background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", padding: 2, fontSize: 12, lineHeight: 1 }}
                        >
                          <i className="fa-solid fa-pen"></i>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRemoveDepartment(i)}
                          title="Remove"
                          style={{ background: "none", border: "none", color: "#F87171", cursor: "pointer", padding: 2, fontSize: 13, lineHeight: 1 }}
                        >
                          <i className="fa-solid fa-xmark"></i>
                        </button>
                      </span>
                    ))}
                  </div>
                )}

                {/* Add / Edit picker - dropdown with a manual "Other" option */}
                <div style={{ display: "grid", gridTemplateColumns: "1.3fr 0.8fr auto", gap: 8, alignItems: "end" }}>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4, textTransform: "uppercase" }}>
                      Department
                    </label>
                    <select
                      value={deptIsOther ? "__other__" : deptNameChoice}
                      onChange={(e) => {
                        if (e.target.value === "__other__") {
                          setDeptIsOther(true);
                          setDeptNameChoice("");
                        } else {
                          setDeptIsOther(false);
                          setDeptNameChoice(e.target.value);
                        }
                      }}
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        color: "#FAF7F0",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="" disabled>Select department…</option>
                      {DEPARTMENT_NAME_OPTIONS.map((n) => (
                        <option key={n} value={n} style={{ color: "#0A1F3D" }}>{n}</option>
                      ))}
                      <option value="__other__" style={{ color: "#0A1F3D" }}>Other (type below)</option>
                    </select>
                    {deptIsOther && (
                      <input
                        type="text"
                        value={deptNameOther}
                        onChange={(e) => setDeptNameOther(e.target.value)}
                        placeholder="Type department name"
                        style={{
                          width: "100%",
                          marginTop: 6,
                          padding: "9px 10px",
                          background: "rgba(0,0,0,0.3)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          borderRadius: 8,
                          color: "#FAF7F0",
                          fontSize: 13,
                          boxSizing: "border-box",
                        }}
                      />
                    )}
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,0.5)", marginBottom: 4, textTransform: "uppercase" }}>
                      Student Count
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={deptStudentCount}
                      onChange={(e) => setDeptStudentCount(e.target.value)}
                      placeholder="e.g. 60"
                      style={{
                        width: "100%",
                        padding: "9px 10px",
                        background: "rgba(0,0,0,0.3)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        borderRadius: 8,
                        color: "#FAF7F0",
                        fontSize: 13,
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div style={{ display: "flex", gap: 6 }}>
                    <button
                      type="button"
                      onClick={handleAddOrUpdateDepartment}
                      style={{
                        background: "#E5A82E",
                        color: "#0A1F3D",
                        border: "none",
                        padding: "9px 14px",
                        borderRadius: 8,
                        fontSize: 12,
                        fontWeight: 800,
                        cursor: "pointer",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {editingDeptIndex !== null ? "Save" : "+ Add"}
                    </button>
                    {editingDeptIndex !== null && (
                      <button
                        type="button"
                        onClick={resetDeptPicker}
                        style={{
                          background: "rgba(255,255,255,0.08)",
                          color: "#FAF7F0",
                          border: "1px solid rgba(255,255,255,0.15)",
                          padding: "9px 12px",
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    )}
                  </div>
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
