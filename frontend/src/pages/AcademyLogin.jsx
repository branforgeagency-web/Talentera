import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { startOtpWidget } from "../utils/msg91Widget.js";

export default function AcademyLogin() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!fullName || !academyName) return;
    setError("");
    setLoading(true);
    try {
      const identifier = mobile || email || fullName;
      const accessToken = await startOtpWidget(identifier);
      const res = await fetch("/api/academy/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accessToken, fullName, academyName, email, mobile })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("talentera_academy_token", data.token);
        localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
        navigate("/academy/dashboard");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      setError(err.message || "OTP verification failed or was cancelled.");
    } finally {
      setLoading(false);
    }
  };

  // Reusable input wrapper style
  const inputWrapStyle = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    background: "rgba(255, 255, 255, 0.06)",
    border: "1.5px solid rgba(255, 255, 255, 0.15)",
    borderRadius: 12,
    padding: "0 16px",
    width: "100%",
    boxSizing: "border-box",
    transition: "all 0.2s"
  };

  const inputElementStyle = {
    flex: 1,
    width: "100%",
    background: "transparent",
    border: "none",
    outline: "none",
    boxShadow: "none",
    padding: "14px 0",
    color: "#ffffff",
    fontFamily: "inherit",
    fontSize: 15,
    fontWeight: 500
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 50%, #1A3358 100%)",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Orbs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          left: "-80px",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,168,46,0.25) 0%, transparent 60%)",
          pointerEvents: "none"
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-120px",
          right: "-50px",
          width: 460,
          height: 460,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 60%)",
          pointerEvents: "none"
        }}
      />

      {/* TOP HEADER BAR */}
      <header className="acad-login-header">
        <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
          <div>
            <img src="/logo.png" alt="Talentera" style={{ height: 40, width: "auto" }} />
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold-light)", marginTop: 4 }}>
              ACADEMY PARTNER PORTAL
            </div>
          </div>
        </div>

        <Link to="/" className="acad-login-exit-btn">
          ← Exit
        </Link>
      </header>

      {/* MAIN SPLIT CONTENT */}
      <main className="acad-login-main">
        {/* LEFT BRAND PANEL */}
        <div className="acad-login-left">
          <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", marginBottom: 16 }}>
            TALENTERA · ACADEMY PARTNER PORTAL
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(32px, 5vw, 56px)",
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              marginBottom: 20
            }}
          >
            Your students. <br />
            <span style={{ color: "var(--gold)" }}>Their careers.</span> <br />
            One dashboard.
          </h1>

          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, maxWidth: 500, marginBottom: 36 }}>
            Talentera is where the best RCM training academies prove their quality — with verified scores, bias-free assessments, and placement outcomes that companies trust.
          </p>

          {/* Feature Points */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20, marginBottom: 40 }}>
            {/* Feature 1 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(34,197,94,0.18)",
                  color: "#22C55E",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0
                }}
              >
                🛡️
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  Bias-free Path B assessments
                </h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Your questions, Talentera-conducted · companies trust the score
                </p>
              </div>
            </div>

            {/* Feature 2 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(229,168,46,0.2)",
                  color: "var(--gold)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0
                }}
              >
                📊
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  Anonymized peer benchmark
                </h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  See where you stand vs other academies · city-only labels
                </p>
              </div>
            </div>

            {/* Feature 3 */}
            <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "rgba(168,85,247,0.18)",
                  color: "#A855F7",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 16,
                  flexShrink: 0
                }}
              >
                💼
              </div>
              <div>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  Track every placement
                </h4>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)" }}>
                  Month-wise outcomes · top hiring cities · per-batch rates
                </p>
              </div>
            </div>
          </div>

          {/* Trust Banner */}
          <div
            style={{
              padding: "16px 20px",
              background: "rgba(255,255,255,0.04)",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 14,
              maxWidth: 480
            }}
          >
            <div style={{ color: "var(--gold)", fontSize: 16, letterSpacing: 2 }}>★★★★★</div>
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.8)" }}>
              177 verified academies trust Talentera · 35,000+ candidates placed
            </div>
          </div>
        </div>

        {/* RIGHT FORM CARD */}
        <div className="acad-login-card">
          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            <div>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                Sign in to your portal
              </h2>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
                Access your academy partner dashboard and student placements.
              </p>
            </div>

            {error && (
              <div style={{ background: "rgba(248,113,113,0.12)", border: "1px solid rgba(248,113,113,0.35)", borderRadius: 10, padding: 14, fontSize: 13, color: "#F87171" }}>
                {error}
              </div>
            )}

            {/* Full Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                YOUR FULL NAME
              </label>
              <div style={inputWrapStyle}>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>👤</span>
                <input
                  type="text"
                  style={inputElementStyle}
                  placeholder="e.g., Karthik Subramanian"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Academy Name */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                ACADEMY NAME
              </label>
              <div style={inputWrapStyle}>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>🎓</span>
                <input
                  type="text"
                  style={inputElementStyle}
                  placeholder="e.g., Apex Medical Coding Institute"
                  value={academyName}
                  onChange={(e) => setAcademyName(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Work Email */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                WORK EMAIL
              </label>
              <div style={inputWrapStyle}>
                <span style={{ fontSize: 16, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}>✉</span>
                <input
                  type="email"
                  style={inputElementStyle}
                  placeholder="director@academy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Mobile Number */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.55)" }}>
                MOBILE NUMBER
              </label>
              <div style={inputWrapStyle}>
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontWeight: 700,
                    fontSize: 14,
                    color: "rgba(255, 255, 255, 0.8)",
                    paddingRight: 10,
                    borderRight: "1px solid rgba(255, 255, 255, 0.15)",
                    flexShrink: 0
                  }}
                >
                  +91
                </span>
                <input
                  type="tel"
                  style={inputElementStyle}
                  placeholder="98765 43210"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                background: "var(--gold)",
                color: "var(--navy-deep)",
                fontSize: 14.5,
                fontWeight: 800,
                border: 0,
                borderRadius: 12,
                padding: "14px 18px",
                cursor: "pointer",
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8
              }}
            >
              {loading ? "Opening OTP..." : "Verify OTP & Sign In →"}
            </button>
          </form>

          {/* Footer Note */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 22,
              paddingTop: 20,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              fontSize: 12.5,
              color: "rgba(255,255,255,0.55)"
            }}
          >
            <span>Partner Academy Portal</span>
            <Link to="/" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
