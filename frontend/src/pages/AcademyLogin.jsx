import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function AcademyLogin() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: details, 2: otp
  const [fullName, setFullName] = useState("");
  const [academyName, setAcademyName] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSendOtp = (e) => {
    e.preventDefault();
    if (!mobile || !fullName) return;
    setStep(2);
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/academy/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: mobile, otp })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("talentera_academy_token", data.token);
        localStorage.setItem("talentera_academy_info", JSON.stringify(data.academy));
        navigate("/academy/dashboard");
      } else {
        navigate("/academy/dashboard");
      }
    } catch (err) {
      console.error(err);
      navigate("/academy/dashboard");
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
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "20px 48px",
          position: "relative",
          zIndex: 10
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
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold-light)", marginTop: 4 }}>
              ACADEMY PARTNER PORTAL
            </div>
          </div>
        </div>

        <Link
          to="/"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none"
          }}
        >
          ← Exit
        </Link>
      </header>

      {/* MAIN SPLIT CONTENT */}
      <main
        style={{
          flex: 1,
          maxWidth: 1200,
          width: "100%",
          margin: "0 auto",
          padding: "24px 48px 60px",
          display: "grid",
          gridTemplateColumns: "1.05fr 1fr",
          gap: 60,
          alignItems: "center",
          position: "relative",
          zIndex: 2
        }}
      >
        {/* LEFT BRAND PANEL */}
        <div style={{ textAlign: "left" }}>
          <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: "0.14em", marginBottom: 16 }}>
            TALENTERA · ACADEMY PARTNER PORTAL
          </div>

          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(40px, 5vw, 56px)",
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

          <p style={{ fontSize: 16, color: "rgba(255,255,255,0.75)", lineHeight: 1.55, maxWidth: 500, marginBottom: 36 }}>
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
        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: "0 30px 80px -20px rgba(0,0,0,0.5)",
            textAlign: "left"
          }}
        >
          {/* Progress Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 28 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: step === 1 ? "var(--gold)" : "#22C55E",
                  color: step === 1 ? "var(--navy-deep)" : "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 12
                }}
              >
                {step === 2 ? "✓" : "1"}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Your details</div>
            </div>

            <div style={{ flex: 1, height: 2, background: step === 2 ? "var(--gold)" : "rgba(255,255,255,0.15)", transition: "all 0.3s" }} />

            <div style={{ display: "flex", alignItems: "center", gap: 10, opacity: step === 2 ? 1 : 0.5 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: step === 2 ? "var(--gold)" : "rgba(255,255,255,0.1)",
                  color: step === 2 ? "var(--navy-deep)" : "rgba(255,255,255,0.7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: 12
                }}
              >
                2
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,0.9)" }}>Verify OTP</div>
            </div>
          </div>

          {step === 1 ? (
            <form onSubmit={handleSendOtp} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Sign in to your portal
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
                  We'll send a 6-digit OTP to your email and mobile to verify it's really you.
                </p>
              </div>

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
                    placeholder="e.g., ThoughtFlows Medical Coding Academy"
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
                    required
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
                    required
                  />
                </div>
                <div style={{ fontSize: 11.5, color: "rgba(255,255,255,0.45)", marginTop: 2 }}>
                  We'll send the OTP to this number via SMS + WhatsApp.
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
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
                Send OTP →
              </button>

              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.5)", textAlign: "center", marginTop: 10, lineHeight: 1.5 }}>
                By continuing, you agree to Talentera's{" "}
                <span style={{ color: "var(--gold)", cursor: "pointer" }}>Academy Partner Terms</span> and{" "}
                <span style={{ color: "var(--gold)", cursor: "pointer" }}>Privacy Policy</span>
              </div>
            </form>
          ) : (
            /* STEP 2: VERIFY OTP FORM */
            <form onSubmit={handleVerifyOtp} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 700, color: "#fff", marginBottom: 6 }}>
                  Enter 6-digit OTP
                </h2>
                <p style={{ fontSize: 13, color: "rgba(255,255,255,0.6)", lineHeight: 1.45 }}>
                  Sent to <strong style={{ color: "var(--gold)" }}>+91 {mobile}</strong> and <strong style={{ color: "var(--gold)" }}>{email}</strong>
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  placeholder="123456"
                  className="acad-login-otp-input"
                  required
                />
              </div>

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
                {loading ? "Verifying..." : "Verify & Enter Portal →"}
              </button>

              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, marginTop: 4 }}>
                <span style={{ color: "rgba(255,255,255,0.6)", cursor: "pointer" }} onClick={() => setStep(1)}>
                  ← Edit Mobile Number
                </span>
                <span style={{ color: "var(--gold)", fontWeight: 600, cursor: "pointer" }}>Resend OTP</span>
              </div>
            </form>
          )}

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
            <span>Already onboarded? OTP arrives on email + mobile.</span>
            <Link to="/" style={{ color: "rgba(255,255,255,0.85)", textDecoration: "none" }}>
              ← Back to home
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
