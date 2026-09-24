import React, { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { startOtpWidget } from "../utils/msg91Widget.js";
import { safeJson } from "../utils/safeJson.js";

export default function AcademyLogin() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get("mode") === "login" ? "login" : "signup";

  const [authMode, setAuthMode] = useState(initialMode); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => {
    document.title = authMode === "signup" ? "Academy Sign Up | Talentera" : "Academy Login | Talentera";
  }, [authMode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSuccessMsg("");
    setLoading(true);

    const cleanEmail = email.trim().toLowerCase();

    try {
      if (authMode === "signup") {
        if (!password || password.length < 6) {
          throw new Error("Password must be at least 6 characters.");
        }
        const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
        if (!cleanMobile || !/^[6-9]\d{9}$/.test(cleanMobile)) {
          throw new Error("Please enter a valid 10-digit Indian mobile number starting with 6, 7, 8, or 9.");
        }

        const accessToken = await startOtpWidget(cleanEmail, {
          email: cleanEmail,
          title: "Academy Account Verification",
          submitLabel: "Verify & Create Account →",
        });

        const res = await fetch("/api/academy/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            accessToken,
            email: cleanEmail,
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
          setError(data.message || "Academy registration failed. Please try again.");
        }
      } else {
        // Log in flow
        if (!cleanEmail || !password) {
          throw new Error("Please enter your email and password.");
        }

        const res = await fetch("/api/academy/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: cleanEmail,
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
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 60%, #152A4A 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Top Left Home Link */}
      <div style={{ position: "absolute", top: 24, left: 24, zIndex: 20 }}>
        <Link
          to="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.15)",
            color: "#fff",
            padding: "8px 18px",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            transition: "all 0.2s ease",
          }}
        >
          ← Back to Home
        </Link>
      </div>

      {/* Background Orbs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          left: "-80px",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,168,46,0.2) 0%, transparent 60%)",
          pointerEvents: "none",
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
          background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%)",
          pointerEvents: "none",
        }}
      />

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

        {/* Success Message */}
        {successMsg && (
          <div
            style={{
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ADE80",
              padding: 12,
              borderRadius: 8,
              fontSize: 13,
              marginBottom: 14,
            }}
          >
            {successMsg}
          </div>
        )}

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
        <form onSubmit={handleSubmit}>
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
  );
}
