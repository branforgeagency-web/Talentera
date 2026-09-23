import React from "react";
import { Link } from "react-router-dom";
import LiquidNavCapsule from "../components/LiquidNavCapsule";
import Footer from "../components/Footer.jsx";

export default function ForColleges() {
  return (
    <div style={{ minHeight: "100vh", background: "#FFFFFF", fontFamily: "var(--font-body)" }}>
      <LiquidNavCapsule />

      {/* Hero Section */}
      <section style={{ background: "linear-gradient(135deg, #0A1F3D 0%, #0F284E 100%)", color: "#FFFFFF", padding: "120px 24px 80px", textAlign: "center", position: "relative" }}>
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(245,180,26,0.15)", border: "1px solid #F5B41A", color: "#F5B41A", padding: "6px 16px", borderRadius: 24, fontSize: 13, fontWeight: 800, marginBottom: 20 }}>
            <i className="fa-solid fa-graduation-cap"></i> TALENTERA CAMPUS PLACEMENT ECOSYSTEM
          </div>
          <h1 style={{ fontSize: "clamp(32px, 5vw, 48px)", fontWeight: 900, lineHeight: 1.2, margin: "0 0 20px", letterSpacing: "-0.5px" }}>
            Bridge Your Students Directly to <span style={{ color: "#F5B41A" }}>US Healthcare RCM Careers</span>
          </h1>
          <p style={{ fontSize: 17, color: "rgba(255,255,255,0.85)", lineHeight: 1.6, maxWidth: 720, margin: "0 auto 36px" }}>
            Empower Life Sciences, Allied Health, Commerce & IT graduates with structured RCM Domain training, proctored assessments, and direct campus-to-corporate hiring drives with 200+ healthcare employers.
          </p>
          <div style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}>
            <Link
              to="/college/register"
              style={{ background: "#F5B41A", color: "#0A1F3D", padding: "14px 30px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Onboard Your College Now <i className="fa-solid fa-arrow-right"></i>
            </Link>
            <Link
              to="/college/login"
              style={{ background: "rgba(255,255,255,0.08)", color: "#FFFFFF", border: "1.5px solid rgba(255,255,255,0.2)", padding: "14px 26px", borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: 15 }}
            >
              Placement Cell Login
            </Link>
          </div>
        </div>
      </section>

      {/* 3 Pillars Section */}
      <section style={{ padding: "80px 24px", maxWidth: 1140, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 50 }}>
          <h2 style={{ fontSize: 32, fontWeight: 900, color: "#0A1F3D", margin: "0 0 12px" }}>
            Why Leading Colleges Partner with Talentera
          </h2>
          <p style={{ fontSize: 16, color: "#64748B", maxWidth: 600, margin: "0 auto" }}>
            A complete end-to-end framework designed for Placement Officers, Department Heads, and Students.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 24 }}>
          {/* Card 1 */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "32px 28px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0A1F3D", color: "#F5B41A", display: "grid", placeItems: "center", fontSize: 20, marginBottom: 18 }}>
              <i className="fa-solid fa-laptop-code"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#0A1F3D", margin: "0 0 10px" }}>3 High-Demand RCM Tracks</h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
              Curated modules for <strong>Medical Coding</strong> (ICD-10-CM, CPT, HCPCS, E&M), <strong>Medical Billing</strong> (Denial management, Claims), and <strong>AR Calling</strong> (Voice/Non-voice).
            </p>
          </div>

          {/* Card 2 */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "32px 28px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0A1F3D", color: "#F5B41A", display: "grid", placeItems: "center", fontSize: 20, marginBottom: 18 }}>
              <i className="fa-solid fa-file-excel"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#0A1F3D", margin: "0 0 10px" }}>Instant Excel Bulk Enrollment</h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
              Upload entire student rosters via CSV/Excel in 1-click. Automated credential dispatch, duplicate detection, and candidate ID allocation.
            </p>
          </div>

          {/* Card 3 */}
          <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 16, padding: "32px 28px" }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: "#0A1F3D", color: "#F5B41A", display: "grid", placeItems: "center", fontSize: 20, marginBottom: 18 }}>
              <i className="fa-solid fa-chart-line"></i>
            </div>
            <h3 style={{ fontSize: 19, fontWeight: 800, color: "#0A1F3D", margin: "0 0 10px" }}>NAAC & NBA Accreditation Reports</h3>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, margin: 0 }}>
              One-click verified placement logs, package distributions (₹3 LPA – ₹6 LPA), department placement percentages, and offer letter vaults.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section style={{ background: "#0A1F3D", color: "#FFFFFF", padding: "60px 24px", textAlign: "center" }}>
        <div style={{ maxWidth: 700, margin: "0 auto" }}>
          <h2 style={{ fontSize: 28, fontWeight: 900, margin: "0 0 14px" }}>Ready to Launch Your College's RCM Center of Excellence?</h2>
          <p style={{ fontSize: 15, color: "rgba(255,255,255,0.8)", lineHeight: 1.6, margin: "0 0 28px" }}>
            Join 45+ premier institutions already placing students with Optum, Omega, AGS Health, Access Healthcare, and CorroHealth.
          </p>
          <Link
            to="/college/register"
            style={{ background: "#F5B41A", color: "#0A1F3D", padding: "13px 32px", borderRadius: 10, textDecoration: "none", fontWeight: 800, fontSize: 15, display: "inline-block" }}
          >
            Start Free Institutional Onboarding →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
