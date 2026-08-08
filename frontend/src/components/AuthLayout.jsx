import React from "react";
import { Link } from "react-router-dom";

export default function AuthLayout({ title, subtitle, children }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--navy)" }}>
      <div className="card" style={{ width: 400, maxWidth: "90vw" }}>
        <Link to="/" style={{ textDecoration: "none" }}>
          <div className="display" style={{ fontSize: "1.2rem", fontWeight: 800, marginBottom: 4 }}>
            TALENT<span className="gold">ERA</span>
          </div>
        </Link>
        <h2 style={{ marginBottom: 4 }}>{title}</h2>
        <p style={{ color: "var(--text-muted)", marginTop: 0, marginBottom: 24 }}>{subtitle}</p>
        {children}
      </div>
    </div>
  );
}
