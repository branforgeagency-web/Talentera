import React from "react";
import { Link, useNavigate } from "react-router-dom";
import HireVerifiedTalentContent from "../components/HireVerifiedTalentContent.jsx";

export default function CompaniesHire() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: "100vh", background: "var(--navy-deep)" }}>
      {/* ====== SLIM TOP BAR ====== */}
      <header className="nav">
        <div className="nav-container container">
          <div className="nav-logo" onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" />
          </div>

          <div className="nav-actions">
            <Link to="/companies" className="nav-login-link">
              Already registered? Login
            </Link>
            <Link to="/companies/register" className="btn-gold nav-cta-btn">
              Register Free →
            </Link>
          </div>
        </div>
      </header>

      {/* ====== MAIN MARKETING CONTENT ====== */}
      <HireVerifiedTalentContent />
    </div>
  );
}
