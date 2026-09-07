import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

// 12 Resume templates definition matching Stage7Resume and the screenshot
const RESUME_TEMPLATES = [
  { id: "executive", name: "Executive Gold", category: "Certified CPC/CIC", tag: "Signature ATS", accent: "#E5A82E", popular: true },
  { id: "modern", name: "Modern Clean", category: "Fresher-Friendly", tag: "Split Layout", accent: "#3B82F6" },
  { id: "atspro", name: "Compact ATS Pro", category: "ATS Pro", tag: "High Density", accent: "#10B981", popular: true },
  { id: "classic", name: "Classic Corporate", category: "5+ Yrs Experience", tag: "Editorial Serif", accent: "#64748B" },
  { id: "nordic", name: "Nordic Minimal", category: "Fresher-Friendly", tag: "Clean Minimal", accent: "#0D9488" },
  { id: "twocolumn", name: "Two-Column Pro", category: "Certified CPC/CIC", tag: "Balanced Split", accent: "#8B5CF6" },
  { id: "tech", name: "Tech Monospace", category: "ATS Pro", tag: "Code Badges", accent: "#0A1F3D" },
  { id: "elegant", name: "Elegant Serif", category: "5+ Yrs Experience", tag: "Refined Luxury", accent: "#D97706" },
  { id: "bold", name: "Bold Headline", category: "Fresher-Friendly", tag: "High Contrast", accent: "#EF4444" },
  { id: "minimal", name: "Minimal Compact", category: "ATS Pro", tag: "Ultra Clean", accent: "#1E293B" },
  { id: "portfolio", name: "Grid Portfolio", category: "Certified CPC/CIC", tag: "Credential Cards", accent: "#0284C7" },
  { id: "creative", name: "Creative Split", category: "Fresher-Friendly", tag: "Dynamic Banner", accent: "#F59E0B" },
];

const CLINICAL_MODULES = [
  {
    id: 1,
    category: "Foundation Refresher",
    title: "Foundation Anatomy & Physiology",
    desc: "Medical terminology, body systems & root words essential for accurate diagnostic coding.",
    duration: "25 mins",
    questions: "15 questions",
  },
  {
    id: 2,
    category: "Modifiers & CPT",
    title: "CPT Fundamentals Refresher",
    desc: "Category I, II, III structure, surgical package rules, unbundling edits and basic modifiers.",
    duration: "20 mins",
    questions: "12 questions",
  },
  {
    id: 3,
    category: "ICD-10-CM",
    title: "ICD-10-CM Coding Conventions",
    desc: "Chapters 1-22 conventions, etiology/manifestation, Excludes1 vs Excludes2 rules.",
    duration: "30 mins",
    questions: "20 questions",
  },
  {
    id: 4,
    category: "Risk Adjustment / HCC",
    title: "HCC & RAF Risk Adjustment",
    desc: "CMS-HCC model, V24 vs V28 transition, chronic disease capture and MEAT criteria.",
    duration: "35 mins",
    questions: "24 questions",
  },
  {
    id: 5,
    category: "E/M Coding",
    title: "2024 E/M Guidelines & MDM Grid",
    desc: "Time vs MDM scoring, problem complexity, risk level, and prescription drug management.",
    duration: "30 mins",
    questions: "18 questions",
  },
  {
    id: 6,
    category: "Modifiers & CPT",
    title: "Radiology & Lab Coding Essentials",
    desc: "Modifiers -26, -TC, global service billing, diagnostic imaging vs interventional rules.",
    duration: "22 mins",
    questions: "14 questions",
  },
  {
    id: 7,
    category: "Foundation Refresher",
    title: "Pathophysiology for Coders",
    desc: "Disease mechanisms: hypertension, heart failure, CKD stages, and diabetes manifestations.",
    duration: "28 mins",
    questions: "16 questions",
  },
  {
    id: 8,
    category: "Modifiers & CPT",
    title: "Outpatient Surgery (Same-Day)",
    desc: "Multiple endoscopy rules, excision vs destruction, integumentary and musculoskeletal procedures.",
    duration: "32 mins",
    questions: "18 questions",
  },
  {
    id: 9,
    category: "CPC Prep",
    title: "Inpatient DRG & ICD-10-PCS",
    desc: "MS-DRG assignment, Principal Diagnosis selection, CC/MCC impact, and root operations.",
    duration: "40 mins",
    questions: "25 questions",
  },
  {
    id: 10,
    category: "Modifiers & CPT",
    title: "Modifier Mastery: -25, -59, -91, -79",
    desc: "Deep-dive on repeat tests, distinct procedural services, and unbundling justification.",
    duration: "25 mins",
    questions: "15 questions",
  },
  {
    id: 11,
    category: "CPC Prep",
    title: "HIPAA & HITECH Compliance",
    desc: "PHI privacy regulations, minimum necessary rule, electronic safeguard requirements.",
    duration: "18 mins",
    questions: "10 questions",
  },
  {
    id: 12,
    category: "Risk Adjustment / HCC",
    title: "Denial Management & AR Basics",
    desc: "CARC/RARC code analysis, first-pass appeal strategies, and timely filing rules.",
    duration: "25 mins",
    questions: "14 questions",
  },
];

export default function Learn() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const [resumeFilter, setResumeFilter] = useState("All 12");
  const [clinicalFilter, setClinicalFilter] = useState("All");
  const [activeModal, setActiveModal] = useState(null);

  const rawName = user?.stage1?.fullName || user?.name || "Priya";
  const firstName = rawName.split(" ")[0] || "Priya";
  const fullName = rawName.length > 2 ? rawName : "Priya S.";
  const initial = (firstName[0] || "P").toUpperCase();
  const email = user?.email || "priya.s@gmail.com";

  const filteredTemplates = resumeFilter === "All 12"
    ? RESUME_TEMPLATES
    : RESUME_TEMPLATES.filter((t) => t.category.includes(resumeFilter.split(" (")[0]) || t.tag.includes(resumeFilter));

  const filteredModules = clinicalFilter === "All"
    ? CLINICAL_MODULES
    : CLINICAL_MODULES.filter((m) => m.category === clinicalFilter);

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <div style={{ minHeight: "100vh", background: "radial-gradient(1200px 800px at 50% -10%, #0d274c 0%, #06152A 60%, #040D1A 100%)", color: "#FFFFFF", fontFamily: "var(--font-body, 'Manrope', sans-serif)" }}>
      {/* 01. TOP NAVIGATION BAR */}
      <header
        style={{
          background: "rgba(6, 21, 42, 0.95)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          padding: "12px 32px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        {/* Brand Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/dashboard")}>
          <img src="/logo.png" alt="Talentera" style={{ height: 34, width: "auto", objectFit: "contain" }} />
          {/* <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ color: "#FFFFFF", fontWeight: 800, fontSize: 18, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
              Talentera
            </span>
            <span style={{ color: "#E5A82E", fontWeight: 800, fontSize: 9, letterSpacing: "1.4px" }}>
              CANDIDATE DASHBOARD
            </span>
          </div> */}
        </div>

        {/* Center Nav Links */}
        <nav style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=home")}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
            }}
          >
            Home
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=profile")}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
            }}
          >
            Profile
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=apply")}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
            }}
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=applications")}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
            }}
          >
            Applications
          </button>
          <button
            type="button"
            onClick={() => navigate("/dashboard?tab=interviews")}
            style={{
              background: "transparent",
              color: "rgba(255, 255, 255, 0.8)",
              padding: "6px 14px",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
              border: "none",
            }}
          >
            Interviews
          </button>
          <button
            type="button"
            style={{
              background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
              color: "#06152A",
              padding: "6px 18px",
              borderRadius: 20,
              fontWeight: 800,
              fontSize: 13,
              border: "none",
              boxShadow: "0 0 16px rgba(245, 184, 46, 0.35)",
              cursor: "pointer",
            }}
          >
            Learn
          </button>
        </nav>

        {/* Right Info & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div style={{ position: "relative", cursor: "pointer", display: "flex", alignItems: "center" }}>
            <span style={{ fontSize: 18, color: "#E5A82E" }}>
              <i className="fa-solid fa-bell"></i>
            </span>
            <span
              style={{
                position: "absolute",
                top: -6,
                right: -8,
                background: "#E5A82E",
                color: "#08162B",
                fontSize: 10,
                fontWeight: 900,
                width: 16,
                height: 16,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              3
            </span>
          </div>

          {/* Profile Pill & Text */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              padding: "4px 12px 4px 6px",
              borderRadius: 24,
            }}
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
                color: "#FFFFFF",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 800,
                fontSize: 13,
                boxShadow: "0 2px 8px rgba(139, 92, 246, 0.4)",
              }}
            >
              {initial}
            </div>
            <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
              <span style={{ color: "#FFFFFF", fontWeight: 700, fontSize: 13, lineHeight: 1.2 }}>{fullName}</span>
              <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 11, lineHeight: 1.2 }}>{email}</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              color: "#FFFFFF",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 700,
              cursor: "pointer",
              transition: "all 0.15s ease",
              whiteSpace: "nowrap",
            }}
            onMouseOver={(e) => {
              e.currentTarget.style.background = "rgba(239, 68, 68, 0.18)";
              e.currentTarget.style.borderColor = "rgba(239, 68, 68, 0.5)";
              e.currentTarget.style.color = "#FCA5A5";
            }}
            onMouseOut={(e) => {
              e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.2)";
              e.currentTarget.style.color = "#FFFFFF";
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* 02. HERO BANNER */}
      <section
        style={{
          background: "linear-gradient(135deg, #07152B 0%, #0A1C36 60%, #0E284E 100%)",
          color: "#FFFFFF",
          padding: "40px 32px 46px",
        }}
      >
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 340px", gap: 36, alignItems: "center" }}>
          <div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: "rgba(245, 184, 46, 0.12)",
                border: "1px solid rgba(245, 184, 46, 0.4)",
                color: "#F5B82E",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: "0.6px",
                padding: "4px 12px",
                borderRadius: 20,
                marginBottom: 14,
              }}
            >
              CLINICAL &amp; SPECIALTY · TOP 15% LEARNING TRACK
            </div>

            <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.2, margin: "0 0 14px 0", letterSpacing: "-0.02em" }}>
              Pick up where you left off, <span style={{ color: "#F5B82E" }}>{firstName}</span>
            </h1>

            <p style={{ color: "rgba(255, 255, 255, 0.8)", fontSize: 14, lineHeight: 1.6, maxWidth: 640, margin: "0 0 24px 0" }}>
              Your mock interview flagged 2 technical gaps: CPT modifiers and RAF math. 12 bite-sized exercises queued for you tonight; completing unlocks +6 pts on your profile.
            </p>

            <button
              type="button"
              onClick={() => setActiveModal({ title: "RAF Math & CPT Modifiers Module", duration: "14 mins" })}
              style={{
                background: "#F5B82E",
                color: "#08162B",
                border: "none",
                borderRadius: 24,
                padding: "12px 28px",
                fontWeight: 800,
                fontSize: 13,
                letterSpacing: "0.5px",
                cursor: "pointer",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                boxShadow: "0 4px 16px rgba(245, 184, 46, 0.35)",
              }}
            >
              CONTINUE RAF MODULE (14 MIN) →
            </button>
          </div>

          {/* Right Stats Box */}
          <div
            style={{
              background: "rgba(255, 255, 255, 0.05)",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              backdropFilter: "blur(14px)",
              borderRadius: 18,
              padding: "24px 26px",
              display: "grid",
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 16,
              textAlign: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>12/30</div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", marginTop: 6, fontWeight: 600 }}>Exercises done</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#FFFFFF", lineHeight: 1 }}>4.5 hrs</div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", marginTop: 6, fontWeight: 600 }}>Time spent</div>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 900, color: "#F5B82E", lineHeight: 1 }}>3 / 6</div>
              <div style={{ fontSize: 11, color: "rgba(255, 255, 255, 0.65)", marginTop: 6, fontWeight: 600 }}>Modules clear</div>
            </div>
          </div>
        </div>
      </section>

      {/* MAIN CONTAINER WITH WARM CREAM DOT-GRID BACKGROUND */}
      <section className="cand-cream-dot-bg" style={{ minHeight: "80vh", borderTop: "1px solid #E5E0D5" }}>
        <main style={{ maxWidth: 1200, margin: "0 auto", padding: "36px 32px 64px", display: "flex", flexDirection: "column", gap: 48 }}>
          
          {/* 03. 26 CERTIFICATIONS ACROSS 4 LEADING BODIES */}
          <section>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap", gap: 14 }}>
              <div>
                <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
                  ● CERTIFICATIONS · AAPC · AHIMA · HIMAA · SPECIALTY
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
                  26 certifications across 4 leading bodies
                </h2>
                <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
                  Browse requirements, exam patterns, passing marks, and preparation paths. All 26 mapped to our question bank and resume builder.
                </p>
              </div>
              <button
                type="button"
                onClick={() => navigate("/dashboard?stage=3")}
                style={{
                  color: "#0A1F3D",
                  fontSize: 13,
                  fontWeight: 800,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Open Full Cert Library →
              </button>
            </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {/* Card 1: AAPC */}
            <div
              style={{
                background: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
                borderRadius: 16,
                padding: "22px 20px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 14px rgba(37, 99, 235, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>AAPC</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>12 certs</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", minHeight: 34 }}>
                American Academy of Professional Coders
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["CPC", "CIC", "COC", "CPMA", "CRC", "+7 more"].map((c) => (
                  <span key={c} style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {c}
                  </span>
                ))}
              </div>
              <div
                onClick={() => navigate("/dashboard?stage=3")}
                style={{ fontSize: 12, fontWeight: 800, color: "#FDE047", cursor: "pointer", marginTop: 4 }}
              >
                Browse all 12 body →
              </div>
            </div>

            {/* Card 2: AHIMA */}
            <div
              style={{
                background: "linear-gradient(135deg, #064E3B 0%, #059669 100%)",
                borderRadius: 16,
                padding: "22px 20px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 14px rgba(5, 150, 105, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>AHIMA</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>8 certs</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", minHeight: 34 }}>
                American Health Information Management Association
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["CCA", "CCS", "CCS-P", "RHIA", "CDIP", "+3 more"].map((c) => (
                  <span key={c} style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {c}
                  </span>
                ))}
              </div>
              <div
                onClick={() => navigate("/dashboard?stage=3")}
                style={{ fontSize: 12, fontWeight: 800, color: "#A7F3D0", cursor: "pointer", marginTop: 4 }}
              >
                Browse all 8 body →
              </div>
            </div>

            {/* Card 3: HIMAA */}
            <div
              style={{
                background: "linear-gradient(135deg, #155E75 0%, #0891B2 100%)",
                borderRadius: 16,
                padding: "22px 20px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 14px rgba(8, 145, 178, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>HIMAA</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>3 certs</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", minHeight: 34 }}>
                Health Information Management Association of Australia
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["CHIM", "CC", "HIM"].map((c) => (
                  <span key={c} style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {c}
                  </span>
                ))}
              </div>
              <div
                onClick={() => navigate("/dashboard?stage=3")}
                style={{ fontSize: 12, fontWeight: 800, color: "#BAE6FD", cursor: "pointer", marginTop: 4 }}
              >
                Browse all 3 body →
              </div>
            </div>

            {/* Card 4: Specialty */}
            <div
              style={{
                background: "linear-gradient(135deg, #9A3412 0%, #EA580C 100%)",
                borderRadius: 16,
                padding: "22px 20px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                gap: 12,
                boxShadow: "0 4px 14px rgba(234, 88, 12, 0.2)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 20, fontWeight: 900 }}>Specialty</span>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 11, fontWeight: 800 }}>3 certs</span>
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.85)", minHeight: 34 }}>
                Multi-body specialty tracks: HCC, Inpatient, Risk Adjust.
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {["HCC Specialty", "Inpatient DRG", "E/M Expert"].map((c) => (
                  <span key={c} style={{ background: "rgba(255,255,255,0.15)", padding: "2px 8px", borderRadius: 8, fontSize: 11, fontWeight: 700 }}>
                    {c}
                  </span>
                ))}
              </div>
              <div
                onClick={() => navigate("/dashboard?stage=3")}
                style={{ fontSize: 12, fontWeight: 800, color: "#FED7AA", cursor: "pointer", marginTop: 4 }}
              >
                Browse 3 tracks →
              </div>
            </div>
          </div>
        </section>

        {/* 04. NEXT 24 HOURS FOR YOU (3 THINGS TO DO BEFORE TOMORROW) */}
        <section>
          <div style={{ marginBottom: 18 }}>
            <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
              ● NEXT 24 HOURS FOR YOU
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
              3 things to do before tomorrow
            </h2>
            <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
              Generated from your real mock interview weaknesses, assessment scores, and live chart exposure.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Card 1: Red */}
            <div
              style={{
                background: "linear-gradient(135deg, #B91C1C 0%, #EF4444 100%)",
                borderRadius: 18,
                padding: "24px 22px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 6px 18px rgba(239, 68, 68, 0.25)",
              }}
            >
              <div>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800, letterSpacing: "0.5px" }}>
                  CLINICAL KNOWLEDGE
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "10px 0 6px 0", lineHeight: 1.3 }}>
                  Overcome mock interview weak-spot
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", margin: "0 0 14px 0", lineHeight: 1.45 }}>
                  Your trial rating 58% flagged: CPT/HCPCS modifiers (Stage 8).
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                  <div>✓ 8-question mini-quiz (6 min)</div>
                  <div>✓ Key cheat-sheet: -25 vs -59 vs -79 vs -91 (3 min)</div>
                  <div>✓ Re-try speech trial question #4 (5 min)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal({ title: "Clinical Knowledge Mini-Quiz", duration: "14 mins" })}
                style={{
                  background: "#FFFFFF",
                  color: "#B91C1C",
                  border: "none",
                  borderRadius: 20,
                  padding: "10px 20px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Start 14-min pack →
              </button>
            </div>

            {/* Card 2: Blue */}
            <div
              style={{
                background: "linear-gradient(135deg, #1D4ED8 0%, #3B82F6 100%)",
                borderRadius: 18,
                padding: "24px 22px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 6px 18px rgba(59, 130, 246, 0.25)",
              }}
            >
              <div>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800, letterSpacing: "0.5px" }}>
                  ASSESSMENT BOOST
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "10px 0 6px 0", lineHeight: 1.3 }}>
                  Move CPT modifier score to 90%
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", margin: "0 0 14px 0", lineHeight: 1.45 }}>
                  Assessment score: 70% in modifier section. Target for top 10% search rank: 85%+.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                  <div>✓ CPT Modifiers deep-dive (12 min)</div>
                  <div>✓ Interactive 15-case practice (15 min)</div>
                  <div>✓ Score update pushed to profile (+3 pts)</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveModal({ title: "CPT Modifier Practice", duration: "15 mins" })}
                style={{
                  background: "#FFFFFF",
                  color: "#1D4ED8",
                  border: "none",
                  borderRadius: 20,
                  padding: "10px 20px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Start topic →
              </button>
            </div>

            {/* Card 3: Green */}
            <div
              style={{
                background: "linear-gradient(135deg, #0F766E 0%, #14B8A6 100%)",
                borderRadius: 18,
                padding: "24px 22px",
                color: "#FFFFFF",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                gap: 16,
                boxShadow: "0 6px 18px rgba(20, 184, 166, 0.25)",
              }}
            >
              <div>
                <span style={{ background: "rgba(255,255,255,0.2)", padding: "3px 10px", borderRadius: 12, fontSize: 10, fontWeight: 800, letterSpacing: "0.5px" }}>
                  RESUME REFRESH
                </span>
                <h3 style={{ fontSize: 17, fontWeight: 800, margin: "10px 0 6px 0", lineHeight: 1.3 }}>
                  Export with HCC Coder / Executive template
                </h3>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.9)", margin: "0 0 14px 0", lineHeight: 1.45 }}>
                  Auto-populated with your verified credentials and updated video intro link.
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.9)" }}>
                  <div>✓ 12 HR-approved layout templates</div>
                  <div>✓ ATS 95+ format; zero extra formatting</div>
                  <div>✓ One-click sharing with verified recruiters</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => navigate("/resume")}
                style={{
                  background: "#FFFFFF",
                  color: "#0F766E",
                  border: "none",
                  borderRadius: 20,
                  padding: "10px 20px",
                  fontWeight: 800,
                  fontSize: 12,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                Open builder →
              </button>
            </div>
          </div>
        </section>

        {/* 05. BUILD A RESUME · 12 HR-APPROVED FORMATS */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
                ● BUILD A RESUME · 12 HR-APPROVED FORMATS · LIVE PREVIEWS
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
                Pick a template, click any text to edit, download as PDF
              </h2>
              <p style={{ color: "#64748B", fontSize: 13, margin: 0, maxWidth: 840 }}>
                All resumes are gate-verified — fill automatically with your Stage 1-6 verified data. Full preview below. Click any card to edit in the Resume Builder. Free, zero watermarks. Live ATS-tested for Indian &amp; US RCM recruiters.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/resume")}
              style={{
                background: "#0A1F3D",
                color: "#FFFFFF",
                border: "none",
                padding: "8px 20px",
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(10, 31, 61, 0.2)",
              }}
            >
              Open Designer Gallery →
            </button>
          </div>

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["All 12", "Fresher-Friendly (4)", "Certified CPC/CIC (6)", "5+ Yrs Experience (3)", "ATS Pro (5)"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setResumeFilter(cat)}
                style={{
                  background: resumeFilter === cat ? "#0A1F3D" : "#FFFFFF",
                  color: resumeFilter === cat ? "#FFFFFF" : "#475569",
                  border: resumeFilter === cat ? "1px solid #0A1F3D" : "1px solid #CBD5E1",
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Resume Templates Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {filteredTemplates.map((tpl) => (
              <div
                key={tpl.id}
                onClick={() => navigate("/resume")}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  border: "1px solid #E2E8F0",
                  padding: "16px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                }}
              >
                {/* Mini Resume Header & Mockup Preview */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <span style={{ fontSize: 13, fontWeight: 800, color: "#0A1F3D" }}>{tpl.name}</span>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{tpl.tag}</div>
                  </div>
                  {tpl.popular && (
                    <span style={{ background: "#FEF3C7", color: "#B45309", border: "1px solid #FDE68A", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 8 }}>
                      POPULAR
                    </span>
                  )}
                </div>

                {/* Mockup Preview Sheet */}
                <div
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 8,
                    height: 120,
                    padding: 10,
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    position: "relative",
                    overflow: "hidden",
                  }}
                >
                  <div style={{ height: 6, width: "50%", background: tpl.accent, borderRadius: 3 }} />
                  <div style={{ height: 4, width: "35%", background: "rgba(0, 0, 0, 0.15)", borderRadius: 2 }} />
                  <div style={{ borderBottom: "1px dashed #CBD5E1", margin: "4px 0" }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 6 }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.08)", borderRadius: 2 }} />
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.08)", borderRadius: 2 }} />
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.08)", borderRadius: 2 }} />
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.12)", borderRadius: 2 }} />
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.08)", borderRadius: 2 }} />
                      <div style={{ height: 4, background: "rgba(0, 0, 0, 0.08)", borderRadius: 2 }} />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, color: "#64748B" }}>{tpl.category}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: "#0A1F3D" }}>Open in builder →</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 06. INTERVIEW GUIDE */}
        <section>
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
              ● INTERVIEW GUIDE
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
              How to record, crack, and relieve — by industry experts
            </h2>
            <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
              Practical instructions to prepare, record, and clear the 8 verification stages and corporate interviews.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
            {/* Guide Col 1 */}
            <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px 22px", border: "1px solid #E2E8F0", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF2F2", color: "#DC2626", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  <i className="fa-solid fa-video"></i>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>AI VIDEO INTRO</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D" }}>How to record your video intro</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Setup your camera & lighting (facing light source)",
                  "Introduce yourself in 90 seconds (elevator pitch)",
                  "Articulate your coding domain & specialty clearly",
                  "Review AI fluency feedback & re-record if below 70%",
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, fontSize: 12, color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guide Col 2 */}
            <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px 22px", border: "1px solid #E2E8F0", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF3C7", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  <i className="fa-solid fa-microphone"></i>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>LIVE MOCK TRIAL</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D" }}>How to handle live questions</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Stay calm and listen to the complete question",
                  "Structure answers: Scenario → Rule → Code selection",
                  "Clarify doubts before answering complicated cases",
                  "Conclude with confidence and clinical rationale",
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, fontSize: 12, color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Guide Col 3 */}
            <div style={{ background: "#FFFFFF", borderRadius: 16, padding: "24px 22px", border: "1px solid #E2E8F0", boxShadow: "0 4px 14px rgba(0,0,0,0.03)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F5F3FF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>
                  <i className="fa-solid fa-clipboard-question"></i>
                </div>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "#64748B", letterSpacing: "0.5px" }}>TECHNICAL ROUND</div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D" }}>How to answer scenario questions</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {[
                  "Break down patient chart into diagnosis & procedure",
                  "Watch for bundling edits (CCI) and modifier criteria",
                  "Quote relevant ICD-10-CM / CPT guidelines",
                  "Explain reasoning step-by-step for the interviewer",
                ].map((step, idx) => (
                  <div key={idx} style={{ display: "flex", gap: 8, fontSize: 12, color: "#334155" }}>
                    <span style={{ color: "#059669", fontWeight: 800 }}>✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 07. SPECIALTY CLINICAL CONTENT */}
        <section>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 16, flexWrap: "wrap", gap: 14 }}>
            <div>
              <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
                ● CLINICAL CONTENT
              </div>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
                Specialty deep-dives, foundation refreshers, exam prep
              </h2>
              <p style={{ color: "#64748B", fontSize: 13, margin: 0, maxWidth: 840 }}>
                The exact syllabi used by AAPC (CPC, CIC), AHIMA (CCS), and India's top 10 RCM companies (Omega, Coronis, AGS Health).
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate("/dashboard?stage=4")}
              style={{
                color: "#0A1F3D",
                fontSize: 13,
                fontWeight: 800,
                background: "none",
                border: "none",
                cursor: "pointer",
              }}
            >
              View full library →
            </button>
          </div>

          {/* Filter chips */}
          <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            {["All", "Foundation Refresher", "Risk Adjustment / HCC", "Modifiers & CPT", "ICD-10-CM", "E/M Coding", "CPC Prep"].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setClinicalFilter(cat)}
                style={{
                  background: clinicalFilter === cat ? "#0A1F3D" : "#FFFFFF",
                  color: clinicalFilter === cat ? "#FFFFFF" : "#475569",
                  border: clinicalFilter === cat ? "1px solid #0A1F3D" : "1px solid #CBD5E1",
                  padding: "6px 16px",
                  borderRadius: 20,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.03)",
                  transition: "all 0.15s ease",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Modules Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
            {filteredModules.map((m) => (
              <div
                key={m.id}
                style={{
                  background: "#FFFFFF",
                  borderRadius: 16,
                  padding: "20px",
                  border: "1px solid #E2E8F0",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                  transition: "transform 0.15s ease, box-shadow 0.15s ease",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-2px)";
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
                }}
              >
                <div>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "#D97706", letterSpacing: "0.5px" }}>
                    {m.category.toUpperCase()}
                  </span>
                  <h3 style={{ fontSize: 15, fontWeight: 800, color: "#0A1F3D", margin: "6px 0 6px 0", lineHeight: 1.3 }}>
                    {m.title}
                  </h3>
                  <p style={{ fontSize: 12, color: "#64748B", margin: 0, lineHeight: 1.45 }}>
                    {m.desc}
                  </p>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid #F1F5F9", paddingTop: 12 }}>
                  <span style={{ fontSize: 11, color: "#94A3B8" }}>{m.duration} · {m.questions}</span>
                  <button
                    type="button"
                    onClick={() => setActiveModal({ title: m.title, duration: m.duration })}
                    style={{
                      background: "#0A1F3D",
                      color: "#FFFFFF",
                      border: "none",
                      borderRadius: 10,
                      padding: "6px 14px",
                      fontSize: 12,
                      fontWeight: 800,
                      cursor: "pointer",
                      boxShadow: "0 2px 8px rgba(10, 31, 61, 0.2)",
                    }}
                  >
                    Start →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 08. LEARNING IS A PLACEMENT SIGNAL */}
        <section
          style={{
            background: "#FFFFFF",
            borderRadius: 20,
            padding: "32px 36px",
            border: "1px solid #E2E8F0",
            boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ marginBottom: 20 }}>
            <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
              ● PLACEMENT ANALYTICS
            </div>
            <h2 style={{ fontSize: 24, fontWeight: 800, color: "#0A1F3D", margin: "0 0 6px 0" }}>
              Learning is a placement signal
            </h2>
            <p style={{ color: "#64748B", fontSize: 13, margin: 0 }}>
              Companies see your learning streak, mock interview progress, and recent deep-dive completions on your profile.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32 }}>
            {/* Left Stats & Badges */}
            <div style={{ background: "#F8FAFC", borderRadius: 16, padding: "24px", border: "1px solid #E2E8F0" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, textAlign: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0A1F3D" }}>12</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Exercises completed</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#0A1F3D" }}>4.5 hrs</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Learning time</div>
                </div>
                <div>
                  <div style={{ fontSize: 26, fontWeight: 900, color: "#D97706" }}>3/6</div>
                  <div style={{ fontSize: 11, color: "#64748B" }}>Modules cleared</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
                {[
                  { label: "Streak 5 Days", icon: "fa-fire", color: "#EF4444" },
                  { label: "Mock Interview", icon: "fa-video", color: "#3B82F6" },
                  { label: "Assessment", icon: "fa-chart-line", color: "#10B981" },
                  { label: "Cert Ready", icon: "fa-award", color: "#F59E0B" },
                ].map((b, idx) => (
                  <div key={idx} style={{ background: "#FFFFFF", border: "1px solid #E2E8F0", borderRadius: 12, padding: "12px 8px", textAlign: "center" }}>
                    <div style={{ color: b.color, fontSize: 16, marginBottom: 4 }}>
                      <i className={`fa-solid ${b.icon}`}></i>
                    </div>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "#0A1F3D" }}>{b.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Recommended */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <h4 style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>Recommended for you</h4>
              {[
                { title: "1. HCC RAF Math — advanced quiz", note: "Takes 12 min · +3 pts verification" },
                { title: "2. Modifier -59 vs XS/XE/XP/XU", note: "Takes 8 min · +2 pts verification" },
                { title: "3. Mock interview speech practice", note: "Takes 6 min · Stage 5 refresh" },
                { title: "4. Inpatient DRG — basic concepts", note: "Takes 15 min · +2 pts verification" },
              ].map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => setActiveModal({ title: item.title, duration: item.note.split(" · ")[0] })}
                  style={{
                    background: "#F8FAFC",
                    border: "1px solid #E2E8F0",
                    borderRadius: 12,
                    padding: "12px 16px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "#CBD5E1")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                >
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 13, color: "#0A1F3D" }}>{item.title}</div>
                    <div style={{ fontSize: 11, color: "#64748B" }}>{item.note}</div>
                  </div>
                  <span style={{ fontSize: 14, color: "#0A1F3D", fontWeight: 800 }}>→</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 09. JUMP STRAIGHT TO WHAT MATTERS */}
        <section style={{ marginBottom: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ color: "#D97706", fontSize: 11, fontWeight: 800, letterSpacing: "0.8px", marginBottom: 6 }}>
              ● QUICK ACCESS
            </div>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>
              Jump straight to what matters
            </h2>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16 }}>
            {/* 1. AAPC / AHIMA Cert Guide */}
            <div
              onClick={() => navigate("/dashboard?stage=3")}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#EFF6FF", color: "#2563EB", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 10 }}>
                <i className="fa-solid fa-graduation-cap"></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", marginBottom: 4 }}>
                AAPC / AHIMA Cert Guide
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                26 certs, requirements &amp; exam format
              </div>
            </div>

            {/* 2. Interactive Resume Builder */}
            <div
              onClick={() => navigate("/resume")}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#FEF3C7", color: "#B45309", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 10 }}>
                <i className="fa-solid fa-file-pdf"></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", marginBottom: 4 }}>
                Interactive Resume Builder
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                12 templates, ATS-optimized, instant PDF
              </div>
            </div>

            {/* 3. Verified Jobs Board */}
            <div
              onClick={() => navigate("/jobs")}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#ECFDF5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 10 }}>
                <i className="fa-solid fa-briefcase"></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", marginBottom: 4 }}>
                Verified Jobs Board
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                47 active RCM jobs matching your specialty
              </div>
            </div>

            {/* 4. AI Mock Interview Prep */}
            <div
              onClick={() => navigate("/dashboard?stage=5")}
              style={{
                background: "#FFFFFF",
                borderRadius: 14,
                padding: "18px 20px",
                border: "1px solid #E2E8F0",
                cursor: "pointer",
                boxShadow: "0 4px 14px rgba(0,0,0,0.03)",
                transition: "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-2px)";
                e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "0 4px 14px rgba(0,0,0,0.03)";
              }}
            >
              <div style={{ width: 32, height: 32, borderRadius: 8, background: "#F5F3FF", color: "#7C3AED", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, marginBottom: 10 }}>
                <i className="fa-solid fa-microphone-lines"></i>
              </div>
              <div style={{ fontSize: 14, fontWeight: 800, color: "#0A1F3D", marginBottom: 4 }}>
                AI Mock Interview Prep
              </div>
              <div style={{ fontSize: 12, color: "#64748B" }}>
                24 practice questions &amp; live speech analysis
              </div>
            </div>
          </div>
        </section>
      </main>
    </section>

      {/* QUICK LEARNING MODAL */}
      {activeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(4, 13, 26, 0.75)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 20,
          }}
          onClick={() => setActiveModal(null)}
        >
          <div
            style={{
              background: "#0B1C38",
              borderRadius: 20,
              padding: "32px 36px",
              maxWidth: 520,
              width: "100%",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: "#F5B82E", letterSpacing: "0.8px" }}>
                INTERACTIVE CLINICAL MODULE
              </span>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: "rgba(255, 255, 255, 0.6)" }}
              >
                ✕
              </button>
            </div>
            <h3 style={{ fontSize: 20, fontWeight: 800, color: "#FFFFFF", margin: "0 0 10px 0" }}>
              {activeModal.title}
            </h3>
            <p style={{ color: "rgba(255, 255, 255, 0.75)", fontSize: 13, lineHeight: 1.5, margin: "0 0 20px 0" }}>
              Estimated time: {activeModal.duration}. This exercise tests real clinical scenarios used in employer interviews. All points earned sync automatically to your verification score.
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                style={{
                  background: "rgba(255, 255, 255, 0.08)",
                  color: "#FFFFFF",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 18px",
                  fontWeight: 700,
                  fontSize: 13,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  alert(`Starting ${activeModal.title}! Good luck.`);
                  setActiveModal(null);
                }}
                style={{
                  background: "linear-gradient(135deg, #F5B82E 0%, #E5A82E 100%)",
                  color: "#06152A",
                  border: "none",
                  borderRadius: 10,
                  padding: "10px 22px",
                  fontWeight: 800,
                  fontSize: 13,
                  cursor: "pointer",
                  boxShadow: "0 4px 16px rgba(245, 184, 46, 0.35)",
                }}
              >
                Start Now →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
