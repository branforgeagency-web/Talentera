import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Register() {
  const { register, login } = useAuth();
  const navigate = useNavigate();
  const [authMode, setAuthMode] = useState("signup"); // "signup" or "login"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (authMode === "signup") {
        await register(email, password);
      } else {
        await login(email, password);
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || err.message || "Authentication failed. Please try again.");
    } finally {
      setSubmitting(false);
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
          background: "radial-gradient(circle, rgba(229,168,46,0.2) 0%, transparent 60%)",
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
          background: "radial-gradient(circle, rgba(14,165,233,0.15) 0%, transparent 60%)",
          pointerEvents: "none"
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
          textAlign: "left"
        }}
      >
        {/* Brand Logo Header */}
        <div style={{ textAlign: "center", marginBottom: 24 }} onClick={() => navigate("/")}>
          <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 24, color: "#FAF7F0", letterSpacing: "0.02em", cursor: "pointer" }}>
            TALENT<span style={{ color: "#E5A82E" }}>ERA</span>
          </div>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "rgba(255,255,255,0.5)", letterSpacing: "0.2em", marginTop: 4 }}>
            THE ERA OF TALENT BEGINS HERE
          </div>
        </div>

        {/* Title & Subtitle */}
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 22,
            color: "#FAF7F0",
            textAlign: "center",
            marginBottom: 6,
            letterSpacing: "-0.01em"
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
            marginBottom: 20
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
              transition: "all 0.2s"
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
              transition: "all 0.2s"
            }}
          >
            Sign up
          </div>
        </div>

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
              marginBottom: 14
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
                marginBottom: 6
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
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* PASSWORD */}
          <div style={{ marginBottom: 20 }}>
            <label
              style={{
                display: "block",
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.55)",
                marginBottom: 6
              }}
            >
              PASSWORD <span style={{ textTransform: "none", letterSpacing: 0, fontWeight: 400, color: "rgba(255,255,255,0.4)" }}>(min 6 chars)</span>
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
                boxSizing: "border-box"
              }}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
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
              transition: "all 0.2s"
            }}
          >
            {submitting ? "Processing..." : authMode === "signup" ? "Create account" : "Log in"}
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
              textDecoration: "underline"
            }}
          >
            Back to landing
          </button>
        </div>
      </div>
    </div>
  );
}
