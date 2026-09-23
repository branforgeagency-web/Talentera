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
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A1F3D 0%, #0F284E 100%)", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <header style={{ padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F5B41A", display: "grid", placeItems: "center", color: "#0A1F3D", fontWeight: 900, fontSize: 18 }}>
            T
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.5px" }}>
            TALENTERA <span style={{ color: "#F5B41A", fontSize: 13, fontWeight: 600 }}>CAMPUS ONBOARDING</span>
          </span>
        </Link>
        <Link to="/college/login" style={{ color: "#F5B41A", textDecoration: "none", fontSize: 13, fontWeight: 700 }}>
          Already Registered? Log in →
        </Link>
      </header>

      {/* Main Container */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 20px" }}>
        <div style={{ width: "100%", maxWidth: 640, background: "#FFFFFF", borderRadius: 18, padding: "36px 36px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", border: "1px solid rgba(245,180,26,0.2)" }}>
          {/* Step Progress Indicators */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, borderBottom: "1px solid #E2E8F0", paddingBottom: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: step >= 1 ? "#0A1F3D" : "#94A3B8", fontWeight: 800, fontSize: 13 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: step >= 1 ? "#0A1F3D" : "#E2E8F0", color: step >= 1 ? "#F5B41A" : "#64748B", display: "grid", placeItems: "center", fontSize: 12 }}>
                1
              </span>
              Institution Profile
            </div>
            <div style={{ height: 2, flex: 1, background: step >= 2 ? "#0A1F3D" : "#E2E8F0", margin: "0 10px" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: step >= 2 ? "#0A1F3D" : "#94A3B8", fontWeight: 800, fontSize: 13 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: step >= 2 ? "#0A1F3D" : "#E2E8F0", color: step >= 2 ? "#F5B41A" : "#64748B", display: "grid", placeItems: "center", fontSize: 12 }}>
                2
              </span>
              Placement Office
            </div>
            <div style={{ height: 2, flex: 1, background: step >= 3 ? "#0A1F3D" : "#E2E8F0", margin: "0 10px" }}></div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, color: step >= 3 ? "#0A1F3D" : "#94A3B8", fontWeight: 800, fontSize: 13 }}>
              <span style={{ width: 26, height: 26, borderRadius: "50%", background: step >= 3 ? "#0A1F3D" : "#E2E8F0", color: step >= 3 ? "#F5B41A" : "#64748B", display: "grid", placeItems: "center", fontSize: 12 }}>
                3
              </span>
              Departments & Auth
            </div>
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: Institutional Profile */}
          {step === 1 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px" }}>Institutional Details</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
                Provide foundational information about your college or university.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    College / University Full Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => updateField("name", e.target.value)}
                    placeholder="e.g. PSG College of Arts & Science"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      College Type <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <select
                      value={formData.type}
                      onChange={(e) => updateField("type", e.target.value)}
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, background: "#FFF", boxSizing: "border-box" }}
                    >
                      {COLLEGE_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      Affiliation / University
                    </label>
                    <input
                      type="text"
                      value={formData.affiliation}
                      onChange={(e) => updateField("affiliation", e.target.value)}
                      placeholder="e.g. Bharathiar University / Autonomous"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      City <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.city}
                      onChange={(e) => updateField("city", e.target.value)}
                      placeholder="e.g. Coimbatore"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      State <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.state}
                      onChange={(e) => updateField("state", e.target.value)}
                      placeholder="e.g. Tamil Nadu"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      Year Estd
                    </label>
                    <input
                      type="number"
                      value={formData.yearEstablished}
                      onChange={(e) => updateField("yearEstablished", e.target.value)}
                      placeholder="e.g. 1998"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    College Website
                  </label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => updateField("website", e.target.value)}
                    placeholder="https://www.college.edu.in"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
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
                  style={{ padding: "11px 24px", background: "#0A1F3D", color: "#F5B41A", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  Continue to Placement Office <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Placement Officer */}
          {step === 2 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px" }}>Placement Officer & Contact</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px" }}>
                Primary point of contact for corporate campus drives and student batches.
              </p>

              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 14 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    Placement Officer / Dean Name <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.placementOfficerName}
                    onChange={(e) => updateField("placementOfficerName", e.target.value)}
                    placeholder="e.g. Dr. K. Venkataraman"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      Official Placement Email <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.placementOfficerEmail}
                      onChange={(e) => updateField("placementOfficerEmail", e.target.value)}
                      placeholder="placement@college.edu.in"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                    <span style={{ fontSize: 11, color: "#64748B" }}>This will be your dashboard login email.</span>
                  </div>

                  <div>
                    <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                      Mobile Number <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.placementOfficerMobile}
                      onChange={(e) => updateField("placementOfficerMobile", e.target.value)}
                      placeholder="+91 9876543210"
                      style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    College Campus Landline / Desk Phone
                  </label>
                  <input
                    type="text"
                    value={formData.collegeContactPhone}
                    onChange={(e) => updateField("collegeContactPhone", e.target.value)}
                    placeholder="0422-2574000"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ marginTop: 24, display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  style={{ padding: "11px 20px", background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
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
                  style={{ padding: "11px 24px", background: "#0A1F3D", color: "#F5B41A", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 13.5, cursor: "pointer", display: "flex", alignItems: "center", gap: 8 }}
                >
                  Continue to Credentials <i className="fa-solid fa-arrow-right"></i>
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: Departments & Security Password */}
          {step === 3 && (
            <div>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", margin: "0 0 4px" }}>Departments & Access Credentials</h3>
              <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 18px" }}>
                Configure participating RCM talent departments and set your secure access password.
              </p>

              {/* Department Highlights */}
              <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 10, padding: "12px 16px", marginBottom: 18 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "#0A1F3D", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.5px" }}>
                  Selected Participating Departments ({formData.departments.length})
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {formData.departments.map((d, i) => (
                    <span key={i} style={{ background: "#FFFFFF", border: "1px solid #CBD5E1", padding: "4px 10px", borderRadius: 6, fontSize: 12, color: "#1E293B", fontWeight: 600 }}>
                      <i className="fa-solid fa-graduation-cap" style={{ marginRight: 6, color: "#0A1F3D" }}></i>
                      {d.name} ({d.studentCount} students)
                    </span>
                  ))}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 18 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    Create Password <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    placeholder="Min 6 characters"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 5 }}>
                    Confirm Password <span style={{ color: "#EF4444" }}>*</span>
                  </label>
                  <input
                    type="password"
                    required
                    value={formData.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    placeholder="Repeat password"
                    style={{ width: "100%", padding: "10px 13px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13.5, boxSizing: "border-box" }}
                  />
                </div>
              </div>

              <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 8, padding: "10px 14px", fontSize: 12.5, color: "#1E40AF", marginBottom: 20 }}>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: 6 }}></i>
                Institutional registration places your college in <strong>Under Review</strong> status while our academic audit team verifies institutional credentials. You will have full access to student enrollment and mock drives immediately.
              </div>

              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  style={{ padding: "11px 20px", background: "#F1F5F9", color: "#475569", border: "none", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}
                >
                  ← Back
                </button>
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleRegister}
                  style={{ padding: "12px 28px", background: "#0A1F3D", color: "#F5B41A", border: "none", borderRadius: 8, fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: 8 }}
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
