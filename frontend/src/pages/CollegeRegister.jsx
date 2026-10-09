import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";
import { filterColleges } from "../data/indianColleges.js";

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

const labelStyle = {
  display: "block",
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "rgba(255,255,255,0.65)",
  marginBottom: 6,
};
const inputStyle = {
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
};

// Initial registration is deliberately minimal: college name, type, placement email and a
// password. Everything else (state, city, university, placement head, panel...) is collected
// after sign-in on the College Profile tab.
export default function CollegeRegister() {
  const navigate = useNavigate();
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "Arts & Science",
    placementOfficerEmail: "",
    password: "",
  });

  const updateField = (k, v) => setFormData((prev) => ({ ...prev, [k]: v }));

  async function handleRegister(e) {
    if (e) e.preventDefault();
    setError("");

    if (!formData.name.trim()) return setError("Enter your college name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.placementOfficerEmail.trim())) return setError("Enter a valid placement email.");
    if (formData.password.length < 6) return setError("Password must be at least 6 characters.");

    setLoading(true);
    try {
      const res = await fetch("/api/college/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to register college.");

      localStorage.setItem("talentera_college_token", data.token);
      localStorage.setItem("talentera_college_info", JSON.stringify(data.college));
      toast("Registered! Complete your college profile to get started.", "✓");
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
            maxWidth: 520,
            background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "36px 40px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}
        >
          <h3 style={{ fontFamily: "var(--font-display)", fontSize: 21, fontWeight: 800, color: "#FAF7F0", margin: "0 0 6px" }}>
            Register your college
          </h3>
          <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", margin: "0 0 22px" }}>
            Just four details to start. You&apos;ll add the rest after signing in.
          </p>

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

          <form onSubmit={handleRegister} style={{ display: "grid", gap: 16 }}>
            <div style={{ position: "relative" }}>
              <label style={labelStyle}>College / University Name <span style={{ color: "#F87171" }}>*</span></label>
              <input
                type="text"
                required
                autoComplete="off"
                value={formData.name}
                onChange={(e) => {
                  updateField("name", e.target.value);
                  setSuggestions(filterColleges(e.target.value));
                }}
                onBlur={() => setTimeout(() => setSuggestions([]), 120)}
                placeholder="Start typing your college name…"
                style={inputStyle}
              />
              {suggestions.length > 0 && (
                <div
                  style={{
                    position: "absolute",
                    top: "calc(100% + 4px)",
                    left: 0,
                    right: 0,
                    background: "#FFFFFF",
                    border: "1.5px solid #CBD5E1",
                    borderRadius: 10,
                    boxShadow: "0 8px 24px rgba(15,23,42,0.25)",
                    zIndex: 50,
                    maxHeight: 240,
                    overflowY: "auto",
                  }}
                >
                  {suggestions.map((s) => (
                    <div
                      key={s}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        updateField("name", s);
                        setSuggestions([]);
                      }}
                      style={{ padding: "9px 14px", fontSize: 13.5, color: "#0F172A", cursor: "pointer", borderBottom: "1px solid #F1F5F9" }}
                    >
                      {s}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>College Type <span style={{ color: "#F87171" }}>*</span></label>
              <select value={formData.type} onChange={(e) => updateField("type", e.target.value)} style={inputStyle}>
                {COLLEGE_TYPES.map((t) => (
                  <option key={t} value={t} style={{ color: "#0F172A" }}>{t}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Placement Email <span style={{ color: "#F87171" }}>*</span></label>
              <input
                type="email"
                required
                value={formData.placementOfficerEmail}
                onChange={(e) => updateField("placementOfficerEmail", e.target.value)}
                placeholder="placement@college.edu.in"
                style={inputStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Password <span style={{ color: "#F87171" }}>*</span></label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={formData.password}
                  onChange={(e) => updateField("password", e.target.value)}
                  placeholder="Min 6 characters"
                  style={{ ...inputStyle, paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer" }}
                >
                  <i className={`fa-solid ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 6,
                padding: "13px 28px",
                background: "#E5A82E",
                color: "#0A1F3D",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 14.5,
                cursor: loading ? "not-allowed" : "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Registering…
                </>
              ) : (
                <>
                  Register College <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
