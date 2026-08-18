import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

export default function StaffLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState("anita.reddy@talentera.in");
  const [password, setPassword] = useState("••••••••");
  const [keepSignedIn, setKeepSignedIn] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/staff/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok) {
        localStorage.setItem("talentera_staff_token", data.token);
        localStorage.setItem("talentera_staff_info", JSON.stringify(data.staff));
        navigate("/staff/hub");
      } else {
        setError(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg, #0A1F3D 0%, #06152A 100%)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        position: "relative",
        overflow: "hidden"
      }}
    >
      {/* Background Grid Pattern */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: `linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)`,
          backgroundSize: "40px 40px",
          pointerEvents: "none"
        }}
      />

      {/* TOP LEFT BUTTON */}
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
            textDecoration: "none"
          }}
        >
          ← Back to Home
        </Link>
      </div>

      {/* CENTRAL FLOATING SPLIT CARD */}
      <div className="staff-login-card-shell">
        {/* LEFT PANEL */}
        <div
          style={{
            background: "linear-gradient(135deg, #06152A 0%, #0A1F3D 100%)",
            color: "#fff",
            padding: "52px 48px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            position: "relative"
          }}
        >
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", cursor: "pointer" }} onClick={() => navigate("/")}>
              <div>
                <img src="/logo.png" alt="Talentera" style={{ height: 40, width: "auto" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold-light)", marginTop: 4 }}>
                  STAFF OPERATIONS HUB
                </div>
              </div>
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, margin: "40px 0" }}>
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "clamp(32px, 3.5vw, 44px)",
                fontWeight: 800,
                lineHeight: 1.1,
                letterSpacing: "-0.02em",
                marginBottom: 24
              }}
            >
              You don't just <br />
              fill jobs. <br />
              <span style={{ color: "var(--gold)", fontStyle: "italic" }}>You build careers.</span>
            </h1>

            <div style={{ height: 1, background: "rgba(255,255,255,0.12)", marginBottom: 24, maxWidth: 360 }} />

            <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.14em", color: "rgba(255,255,255,0.6)", textTransform: "uppercase" }}>
              — TALENTERA MISSION
            </div>
          </div>

          <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, borderTop: "1px solid rgba(255,255,255,0.1)", paddingTop: 24 }}>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>12,480</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginTop: 6, textTransform: "uppercase" }}>VERIFIED CANDIDATES</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>423</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginTop: 6, textTransform: "uppercase" }}>PLACEMENTS / QUARTER</div>
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>68</div>
              <div style={{ fontSize: 9, fontWeight: 800, color: "rgba(255,255,255,0.6)", letterSpacing: "0.08em", marginTop: 6, textTransform: "uppercase" }}>ACADEMY PARTNERS</div>
            </div>
          </div>
        </div>

        {/* RIGHT PANEL - Staff Login Form */}
        <div style={{ padding: "52px 44px", display: "flex", flexDirection: "column", justifyContent: "center", background: "#fff" }}>
          <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.14em", marginBottom: 8, textTransform: "uppercase" }}>
            // STAFF LOGIN
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--navy)", marginBottom: 8, letterSpacing: "-0.02em" }}>
            Welcome back.
          </h2>

          <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.5, marginBottom: 32 }}>
            Sign in with your Talentera staff credentials.
          </p>

          {error && (
            <div style={{ background: "#FEF2F2", border: "1px solid #FECACA", color: "#B91C1C", padding: 12, borderRadius: 8, fontSize: 13, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", marginBottom: 8, textTransform: "uppercase" }}>
                EMPLOYEE ID OR EMAIL
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 14px" }}>
                <span style={{ color: "#94A3B8" }}>👤</span>
                <input
                  type="text"
                  placeholder="anita.reddy@talentera.in"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: "14px 0", fontSize: 14, fontFamily: "inherit", color: "var(--navy)" }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: "#64748B", marginBottom: 8, textTransform: "uppercase" }}>
                PASSWORD
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 10, background: "#F8FAFC", border: "1.5px solid #E2E8F0", borderRadius: 10, padding: "0 14px" }}>
                <span style={{ color: "#94A3B8" }}>🔒</span>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  style={{ flex: 1, border: "none", background: "transparent", outline: "none", padding: "14px 0", fontSize: 14, fontFamily: "inherit", color: "var(--navy)" }}
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 13 }}>
              <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", color: "var(--navy)", fontWeight: 600 }}>
                <input
                  type="checkbox"
                  checked={keepSignedIn}
                  onChange={(e) => setKeepSignedIn(e.target.checked)}
                  style={{ accentColor: "var(--gold)", width: 16, height: 16, cursor: "pointer" }}
                />
                Keep me signed in
              </label>

              <a href="#forgot" style={{ color: "var(--gold)", fontWeight: 700, textDecoration: "none" }} onClick={(e) => { e.preventDefault(); alert("Contact IT Helpdesk for password reset."); }}>
                Forgot password?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "16px",
                background: "var(--navy)",
                color: "var(--gold)",
                fontSize: 15,
                fontWeight: 800,
                borderRadius: 10,
                border: "none",
                cursor: "pointer",
                marginTop: 6,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                transition: "all 0.2s"
              }}
            >
              {loading ? "Authenticating..." : "Sign in to Staff Portal →"}
            </button>
          </form>

          <div style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", marginTop: 28, lineHeight: 1.6 }}>
            Need access? Contact your <strong style={{ color: "var(--navy)" }}>Department Head</strong> <br />
            or <strong style={{ color: "var(--navy)" }}>IT Helpdesk</strong>
          </div>
        </div>
      </div>
    </div>
  );
}
