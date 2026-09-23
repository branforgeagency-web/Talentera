import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "../components/Toast.jsx";

export default function CollegeLogin() {
  const navigate = useNavigate();
  const toast = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e) {
    if (e) e.preventDefault();
    setError("");

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !password) {
      setError("Please enter your placement officer email and password.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/college/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || "Failed to log in.");
      }

      localStorage.setItem("talentera_college_token", data.token);
      localStorage.setItem("talentera_college_info", JSON.stringify(data.college));
      toast(`Welcome back, ${data.college.placementOfficerName || data.college.name}!`, "✓");
      navigate("/college/dashboard");
    } catch (err) {
      setError(err.message);
      toast(err.message, "!");
    } finally {
      setLoading(false);
    }
  }

  function handleDemoLogin() {
    localStorage.setItem("talentera_college_token", "demo_college_token_12345");
    localStorage.setItem(
      "talentera_college_info",
      JSON.stringify({
        name: "PSG Institute of Technology & Allied Health Sciences",
        city: "Coimbatore",
        state: "Tamil Nadu",
        placementOfficerName: "Prof. S. Ranganathan",
        placementOfficerEmail: "placement@demo-college.edu.in",
        tier: "Gold RCM Center of Excellence",
        verificationStatus: "VERIFIED",
      })
    );
    toast("Logged in as Demo Placement Officer", "✓");
    navigate("/college/dashboard");
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0A1F3D 0%, #0F284E 100%)", display: "flex", flexDirection: "column" }}>
      {/* Top Navbar */}
      <header style={{ padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <Link to="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: "#F5B41A", display: "grid", placeItems: "center", color: "#0A1F3D", fontWeight: 900, fontSize: 18 }}>
            T
          </div>
          <span style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF", letterSpacing: "0.5px" }}>
            TALENTERA <span style={{ color: "#F5B41A", fontSize: 13, fontWeight: 600 }}>CAMPUS OS</span>
          </span>
        </Link>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link to="/colleges" style={{ color: "rgba(255,255,255,0.8)", textDecoration: "none", fontSize: 13, fontWeight: 600 }}>
            About Institutional Program
          </Link>
          <Link to="/college/register" style={{ background: "#F5B41A", color: "#0A1F3D", padding: "8px 16px", borderRadius: 8, textDecoration: "none", fontWeight: 800, fontSize: 13 }}>
            Register College →
          </Link>
        </div>
      </header>

      {/* Main Form Center */}
      <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "30px 20px" }}>
        <div style={{ width: "100%", maxWidth: 440, background: "#FFFFFF", borderRadius: 18, padding: "36px 32px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.35)", border: "1px solid rgba(245,180,26,0.2)" }}>
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div style={{ width: 54, height: 54, borderRadius: "50%", background: "rgba(10,31,61,0.06)", color: "#0A1F3D", display: "grid", placeItems: "center", fontSize: 24, margin: "0 auto 12px" }}>
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px" }}>College Placement Login</h2>
            <p style={{ fontSize: 13, color: "#64748B", margin: 0 }}>
              Access student RCM batches, assessments, and corporate placement drives.
            </p>
          </div>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FCA5A5", color: "#991B1B", padding: "10px 14px", borderRadius: 8, fontSize: 13, marginBottom: 18, display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 6 }}>
                Placement Officer Email <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. placement@college.edu.in"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 14, outline: "none", color: "#0A1F3D", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: "block", fontSize: 12.5, fontWeight: 700, color: "#0A1F3D", marginBottom: 6 }}>
                Password <span style={{ color: "#EF4444" }}>*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ width: "100%", padding: "11px 14px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 14, outline: "none", color: "#0A1F3D", boxSizing: "border-box" }}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{ width: "100%", padding: "13px", borderRadius: 9, background: "#0A1F3D", color: "#F5B41A", border: "none", fontWeight: 800, fontSize: 14, cursor: loading ? "not-allowed" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "0.2s" }}
            >
              {loading ? (
                <>
                  <i className="fa-solid fa-circle-notch fa-spin"></i> Authenticating…
                </>
              ) : (
                <>
                  Sign In to Dashboard <i className="fa-solid fa-arrow-right"></i>
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Access */}
          <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px dashed #E2E8F0", textAlign: "center" }}>
            <button
              type="button"
              onClick={handleDemoLogin}
              style={{ width: "100%", padding: "10px", borderRadius: 8, background: "#FFFBEB", color: "#B45309", border: "1px solid #FCD34D", fontWeight: 700, fontSize: 12.5, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
            >
              <i className="fa-solid fa-bolt"></i> Instant Demo College Access (1-Click)
            </button>
          </div>

          <div style={{ marginTop: 22, textAlign: "center", fontSize: 13, color: "#64748B" }}>
            New to Talentera?{" "}
            <Link to="/college/register" style={{ color: "#0A1F3D", fontWeight: 700, textDecoration: "none" }}>
              Register Your College Cell →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
