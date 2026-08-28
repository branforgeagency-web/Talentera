import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";

export default function Login() {
  const { login, demoLogin } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [demoSubmitting, setDemoSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDemoLogin() {
    setError("");
    setDemoSubmitting(true);
    try {
      await demoLogin();
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || "Demo login failed. Please try again.");
    } finally {
      setDemoSubmitting(false);
    }
  }

  const fillDemoCreds = () => {
    setEmail("demo.candidate@talentera.com");
    setPassword("demo123456");
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your candidate portal."
    >
      {/* DEVELOPER DEMO LOGIN BOX */}
      <div style={{
        background: "rgba(229, 168, 46, 0.1)",
        border: "1px solid rgba(229, 168, 46, 0.35)",
        borderRadius: 12,
        padding: "14px 16px",
        marginBottom: 20,
        textAlign: "center"
      }}>
        <div style={{ fontSize: 11, fontWeight: 800, color: "#F5C95B", letterSpacing: "0.08em", marginBottom: 6 }}>
          ⚡ DEVELOPER / DEMO ACCESS
        </div>
        <button
          type="button"
          onClick={handleDemoLogin}
          disabled={demoSubmitting}
          style={{
            width: "100%",
            background: "linear-gradient(135deg, #F5B41A 0%, #E5A82E 100%)",
            color: "#06152A",
            border: "none",
            borderRadius: 8,
            padding: "10px 14px",
            fontWeight: 800,
            fontSize: 13.5,
            cursor: "pointer",
            marginBottom: 8
          }}
        >
          {demoSubmitting ? "Logging in Demo Candidate..." : "⚡ 1-Click Demo Candidate Login"}
        </button>
        <button
          type="button"
          onClick={fillDemoCreds}
          style={{
            background: "transparent",
            color: "rgba(255,255,255,0.7)",
            border: "none",
            fontSize: 11.5,
            cursor: "pointer",
            textDecoration: "underline"
          }}
        >
          Auto-fill Demo Credentials (demo.candidate@talentera.com)
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>EMAIL ADDRESS</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>
        <div className="form-group">
          <label>PASSWORD</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", marginTop: 8 }} disabled={submitting}>
          {submitting ? "Logging in…" : "Log In"}
        </button>
      </form>
      <p style={{ textAlign: "center", marginTop: 16, fontSize: "0.85rem" }}>
        <Link to="/forgot-password" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none" }}>Forgot password?</Link>
      </p>
      <p style={{ textAlign: "center", marginTop: 10, fontSize: "0.9rem", color: "rgba(255,255,255,0.75)" }}>
        New to Talentera? <Link to="/register" style={{ color: "#E5A82E", fontWeight: 700, textDecoration: "none" }}>Create an account</Link>
      </p>
      <div style={{ textAlign: "center", marginTop: 18, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link to="/" style={{ color: "rgba(255,255,255,0.65)", textDecoration: "none", fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: 4 }}>
          ← Back to Home
        </Link>
      </div>
    </AuthLayout>
  );
}
