import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import AuthLayout from "../components/AuthLayout.jsx";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Enter your credentials to access your candidate portal."
    >
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
