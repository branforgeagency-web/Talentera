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
      {/* Ambient background glow orbs */}
      <div
        style={{
          position: "absolute",
          top: "-120px",
          right: "-100px",
          width: 450,
          height: 450,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(229,168,46,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-100px",
          left: "-100px",
          width: 450,
          height: 450,
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
              CAMPUS OS
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

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <Link
            to="/college/register"
            style={{
              background: "#E5A82E",
              color: "#0A1F3D",
              padding: "8px 18px",
              borderRadius: 8,
              textDecoration: "none",
              fontWeight: 800,
              fontSize: 13,
              boxShadow: "0 2px 8px rgba(229,168,46,0.3)",
              transition: "transform 0.15s ease",
            }}
          >
            Register College →
          </Link>
        </div>
      </header>

      {/* Main Form Center */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 20px",
          zIndex: 10,
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: 440,
            background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 20,
            padding: "40px 36px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
            position: "relative",
          }}
        >
          <div style={{ textAlign: "center", marginBottom: 24 }}>
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: "50%",
                background: "rgba(229,168,46,0.12)",
                border: "1px solid rgba(229,168,46,0.3)",
                color: "#E5A82E",
                display: "grid",
                placeItems: "center",
                fontSize: 22,
                margin: "0 auto 14px",
              }}
            >
              <i className="fa-solid fa-building-columns"></i>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 22,
                color: "#FAF7F0",
                margin: "0 0 6px",
              }}
            >
              College Placement Login
            </h2>
            <p
              style={{
                fontSize: 13,
                color: "rgba(255,255,255,0.65)",
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              Access student RCM batches, assessments, and corporate placement drives.
            </p>
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
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className="fa-solid fa-triangle-exclamation"></i>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
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
                PLACEMENT OFFICER EMAIL <span style={{ color: "#F87171" }}>*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="placement@college.edu.in"
                style={{
                  width: "100%",
                  padding: "12px 14px",
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

            <div style={{ marginBottom: 20 }}>
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
                PASSWORD <span style={{ color: "#F87171" }}>*</span>
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: "100%",
                  padding: "12px 14px",
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

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "14px",
                background: "#E5A82E",
                color: "#0A1F3D",
                border: "none",
                borderRadius: 10,
                fontWeight: 800,
                fontSize: 15,
                cursor: loading ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s ease",
              }}
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
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "20px 0 14px" }}>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
            <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.4)", letterSpacing: "0.08em" }}>OR</span>
            <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.12)" }} />
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            style={{
              width: "100%",
              padding: "13px",
              background: "rgba(229,168,46,0.12)",
              color: "#E5A82E",
              border: "1.5px dashed #E5A82E",
              borderRadius: 10,
              fontWeight: 800,
              fontSize: 13,
              cursor: "pointer",
              fontFamily: "inherit",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
            }}
            title="1-Click Instant Demo Access as Verified Placement Officer"
          >
            <i className="fa-solid fa-bolt"></i> Instant Demo College Access (1-Click)
          </button>

          <div
            style={{
              marginTop: 24,
              textAlign: "center",
              fontSize: 13,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            New to Talentera?{" "}
            <Link
              to="/college/register"
              style={{
                color: "#E5A82E",
                fontWeight: 700,
                textDecoration: "none",
              }}
            >
              Register Your College Cell →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
