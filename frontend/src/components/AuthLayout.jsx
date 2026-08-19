import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy-deep)", padding: 20 }}>
      <div
        style={{
          background: "linear-gradient(135deg, #0A1F3D 0%, #1A2F4D 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: "40px 36px",
          maxWidth: 440,
          width: "100%",
          boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          color: "#fff"
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 24 }}>
          <Link to="/" style={{ textDecoration: "none", display: "inline-block" }}>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 40, width: "auto" }} />
          </Link>
        </div>
        <h2 style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 22, color: "#FAF7F0", textAlign: "center", marginBottom: 6 }}>{title}</h2>
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.65)", textAlign: "center", marginTop: 0, marginBottom: 24 }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
