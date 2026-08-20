import React from "react";
import { Link } from "react-router-dom";
import Stage7Resume from "../components/wizard/Stage7Resume.jsx";

export default function ResumeBuilder() {
  return (
    <div style={{ minHeight: "100vh", background: "#F1F5F9" }}>
      <header className="no-print" style={{ background: "var(--navy)", padding: "16px 0", marginBottom: 24 }}>
        <div className="container" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Link to="/dashboard" style={{ color: "#fff", textDecoration: "none", fontWeight: 700, fontSize: 14 }}>
            ← Back to Verification Wizard
          </Link>
          <div style={{ color: "var(--gold)", fontWeight: 800, fontSize: 16 }}>
            TALENTERA <span style={{ color: "#fff", fontWeight: 400, fontSize: 13 }}>Verified Resume Builder</span>
          </div>
        </div>
      </header>

      <div className="container" style={{ maxWidth: 1000, margin: "0 auto", padding: "0 24px 40px" }}>
        <div style={{ background: "#fff", borderRadius: 16, padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
          <Stage7Resume />
        </div>
      </div>
    </div>
  );
}
