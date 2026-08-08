import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function CompanyDashboardSetup() {
  const navigate = useNavigate();
  const [activeStage, setActiveStage] = useState("1A");

  // Form Field State
  const [companyLegalName, setCompanyLegalName] = useState("Acme Healthcare Pvt Ltd");
  const [gstin, setGstin] = useState("33AAAAA0000A1Z5");
  const [pan, setPan] = useState("AAAAA0000A");
  const [entityType, setEntityType] = useState("Pvt Ltd");
  const [dateOfIncorporation, setDateOfIncorporation] = useState("2018-04-12");
  const [companySize, setCompanySize] = useState("20-100");
  const [registeredAddress, setRegisteredAddress] = useState("Floor 4, Building B, Tidel Park, Coimbatore, Tamil Nadu 641014");
  const [operatingAddress, setOperatingAddress] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("https://acmehealthcare.com");
  const [signatoryName, setSignatoryName] = useState("Srithar V");
  const [signatoryEmail, setSignatoryEmail] = useState("srithar@acmehealthcare.com");

  // Stages List
  const stages = [
    { id: "1A", key: "1A", title: "Account & KYC", status: "1 of 15 done" },
    { id: "1B", key: "1B", title: "Point of Contact", status: "0 of 4 done" },
    { id: "2", key: "2", title: "Company Profile", status: "0 of 12 done" },
    { id: "3", key: "3", title: "Team Setup", status: "0 of 7 done" },
    { id: "4", key: "4", title: "Branding", status: "0 of 5 done" },
    { id: "5", key: "5", title: "Question Bank", status: "0 of 2 done" },
    { id: "6", key: "6", title: "Custom Rubric", status: "0 of 3 done" },
    { id: "7", key: "7", title: "Pre-Candidate Action", status: "0 of 7 done" },
    { id: "8", key: "8", title: "Settings & Integrations", status: "0 of 10 done" },
    { id: "9", key: "9", title: "First JD", status: "0 of 24 done" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2", color: "var(--navy)", fontFamily: "var(--font-body)" }}>
      {/* TOP STICKY DASHBOARD NAV */}
      <header
        style={{
          background: "var(--navy-deep)",
          padding: "14px 48px",
          color: "#fff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 100
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate("/")}>
          <svg width="36" height="36" viewBox="0 0 52 52" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 8H46V18H32V44H20V18H6V8Z" fill="#E5A82E" />
            <path d="M6 8L20 18V44L6 34V8Z" fill="#FFFFFF" />
            <path d="M32 8L46 18H32V8Z" fill="#F5C95B" />
          </svg>
          <div>
            <div style={{ fontFamily: "var(--font-display)", fontWeight: 800, fontSize: 20, color: "#fff", lineHeight: 1 }}>
              TALENT<span style={{ color: "var(--gold)" }}>ERA</span>
            </div>
            <div style={{ fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: 9, letterSpacing: "0.14em", color: "var(--gold)", marginTop: 2 }}>
              COMPANY DASHBOARD
            </div>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              padding: "6px 14px",
              borderRadius: 20,
              fontSize: 13,
              fontWeight: 600
            }}
          >
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--gold)" }} />
            <span>
              <strong style={{ color: "var(--gold)" }}>Srithar</strong> · Acme Healthcare
            </span>
          </div>

          <button
            onClick={() => navigate("/companies")}
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.15)",
              color: "#fff",
              padding: "7px 16px",
              borderRadius: 8,
              fontSize: 12.5,
              fontWeight: 700,
              cursor: "pointer"
            }}
          >
            Logout
          </button>
        </div>
      </header>

      {/* TOP WELCOME BANNER (NAVY GRADIENT) */}
      <section
        style={{
          background: "linear-gradient(165deg, #06152A 0%, #0A1F3D 60%, #15294A 100%)",
          color: "#fff",
          padding: "48px 48px 24px",
          position: "relative",
          overflow: "hidden"
        }}
      >
        <div style={{ maxWidth: 1280, margin: "0 auto", position: "relative", zIndex: 2 }}>
          {/* Status Eyebrow Tag */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              background: "rgba(34,197,94,0.15)",
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#86EFAC",
              padding: "5px 14px",
              borderRadius: 999,
              fontSize: 10,
              fontFamily: "var(--font-mono)",
              fontWeight: 800,
              letterSpacing: "0.14em",
              marginBottom: 16
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#22C55E", boxShadow: "0 0 6px #22C55E" }} />
            ACCOUNT CREATED · SETUP IN PROGRESS
          </div>

          {/* Title & Subtitle */}
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 3.5vw, 42px)",
              fontWeight: 800,
              letterSpacing: "-0.02em",
              marginBottom: 10,
              lineHeight: 1.1
            }}
          >
            Welcome, <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Srithar</span> — let's get{" "}
            <span style={{ color: "var(--gold)", fontStyle: "italic" }}>Acme Healthcare</span> hiring.
          </h1>

          <p style={{ fontSize: 14.5, color: "rgba(200,209,224,0.85)", maxWidth: 740, lineHeight: 1.5, marginBottom: 32 }}>
            Complete your profile to unlock the full verified candidate pool. Most companies finish in{" "}
            <strong style={{ color: "var(--gold-light)" }}>~12 minutes</strong>. Your data is encrypted, never shared with competitors.
          </p>

          {/* Timeline / Progress Line */}
          <div style={{ position: "relative", margin: "40px 20px 24px" }}>
            <div style={{ height: 3, background: "rgba(255,255,255,0.12)", borderRadius: 4, width: "100%" }} />
            <div style={{ position: "absolute", top: 0, left: 0, height: 3, background: "var(--gold)", borderRadius: 4, width: "1%" }} />

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: -9, position: "relative" }}>
              <div style={{ textAlign: "left" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "var(--gold)", border: "2px solid var(--gold-light)", margin: "0 0 6px 0" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--gold)" }}>0%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Start</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#0A1F3D", border: "2px solid rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>25%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Account verified</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#0A1F3D", border: "2px solid rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>50%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Pricing unlocked</div>
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#0A1F3D", border: "2px solid rgba(255,255,255,0.2)", margin: "0 auto 6px" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>75%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Job posting unlocked</div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ width: 15, height: 15, borderRadius: "50%", background: "#0A1F3D", border: "2px solid rgba(255,255,255,0.2)", margin: "0 0 6px auto" }} />
                <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>100%</div>
                <div style={{ fontSize: 10, color: "rgba(255,255,255,0.5)", textTransform: "uppercase", letterSpacing: "0.06em" }}>Live to candidates</div>
              </div>
            </div>
          </div>

          {/* 4 Stat Counter Blocks */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 20,
              paddingTop: 28,
              borderTop: "1px solid rgba(255,255,255,0.08)",
              marginBottom: 16
            }}
          >
            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>0%</div>
              <div style={{ fontSize: 11, color: "rgba(200,209,224,0.7)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
                PROFILE COMPLETE
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>12m</div>
              <div style={{ fontSize: 11, color: "rgba(200,209,224,0.7)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
                ESTIMATED TO GO LIVE
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>0/4</div>
              <div style={{ fontSize: 11, color: "rgba(200,209,224,0.7)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
                BENEFITS UNLOCKED
              </div>
            </div>

            <div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, fontWeight: 800, color: "var(--gold)", lineHeight: 1 }}>12,480</div>
              <div style={{ fontSize: 11, color: "rgba(200,209,224,0.7)", fontFamily: "var(--font-mono)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 4 }}>
                CANDIDATES WAITING
              </div>
            </div>
          </div>
        </div>

        {/* Ticker Bar */}
        <div
          style={{
            background: "rgba(0,0,0,0.3)",
            margin: "24px -48px -24px",
            padding: "10px 48px",
            borderTop: "1px solid rgba(229,168,46,0.15)",
            display: "flex",
            alignItems: "center",
            gap: 16
          }}
        >
          <div
            style={{
              background: "rgba(229,168,46,0.12)",
              border: "1px solid rgba(229,168,46,0.3)",
              color: "var(--gold)",
              padding: "3px 10px",
              borderRadius: 4,
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              fontWeight: 800,
              letterSpacing: "0.14em"
            }}
          >
            ● LIVE
          </div>
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.9)", fontWeight: 500 }}>
            💥 Visionary RCM just made 4 offers · all accepted · 0 ghosting
          </div>
        </div>
      </section>

      {/* MAIN TWO-COLUMN WORKSPACE */}
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "40px 48px", display: "grid", gridTemplateColumns: "320px 1fr", gap: 36, alignItems: "start" }}>
        {/* LEFT SIDEBAR NAVIGATION CARD */}
        <aside
          style={{
            background: "var(--navy-deep)",
            color: "#fff",
            borderRadius: 20,
            padding: "28px 24px",
            boxShadow: "0 20px 50px rgba(10,31,61,0.15)",
            position: "sticky",
            top: 90
          }}
        >
          <div style={{ color: "var(--gold)", fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, letterSpacing: "0.16em", marginBottom: 8 }}>
            ONBOARDING
          </div>

          <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 16, lineHeight: 1.25 }}>
            Register yourself with <span style={{ color: "var(--gold)" }}>Talentera</span>
          </h2>

          {/* Progress Bar */}
          <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 8 }}>
              <span style={{ fontFamily: "var(--font-mono)", fontWeight: 800, color: "var(--gold)" }}>1%</span>
              <span style={{ color: "rgba(255,255,255,0.6)" }}>1 of 89 done</span>
            </div>
            <div style={{ height: 6, background: "rgba(255,255,255,0.1)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ width: "1%", height: "100%", background: "var(--gold)", borderRadius: 999 }} />
            </div>
          </div>

          <div style={{ fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 800, letterSpacing: "0.14em", color: "rgba(255,255,255,0.4)", marginBottom: 14 }}>
            SECTIONS
          </div>

          {/* 9 Stage Accordion Items */}
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 28 }}>
            {stages.map((st) => {
              const isActive = activeStage === st.id;
              return (
                <div
                  key={st.id}
                  onClick={() => setActiveStage(st.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    padding: "12px 14px",
                    borderRadius: 10,
                    cursor: "pointer",
                    background: isActive ? "rgba(229,168,46,0.12)" : "rgba(255,255,255,0.03)",
                    border: isActive ? "1px solid var(--gold)" : "1px solid rgba(255,255,255,0.06)",
                    transition: "all 0.2s"
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 6,
                        background: isActive ? "var(--gold)" : "rgba(255,255,255,0.1)",
                        color: isActive ? "var(--navy-deep)" : "#fff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        fontSize: 10,
                        fontFamily: "var(--font-mono)"
                      }}
                    >
                      {st.key}
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: isActive ? "#fff" : "rgba(255,255,255,0.8)" }}>{st.title}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>{st.status}</div>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: isActive ? "var(--gold)" : "rgba(255,255,255,0.3)" }}>›</div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ padding: 14, background: "rgba(0,0,0,0.2)", borderRadius: 10, fontSize: 11, marginBottom: 20 }}>
            <div style={{ fontWeight: 800, color: "rgba(255,255,255,0.5)", marginBottom: 8, letterSpacing: "0.08em" }}>LEGEND</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6, color: "rgba(255,255,255,0.7)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#EF4444" }} />
                <span>MUST · Required to go live</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#F59E0B" }} />
                <span>Optional · Defer to week 2</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#94A3B8" }} />
                <span>Conditional · Only if relevant</span>
              </div>
            </div>
          </div>

          <div style={{ textAlign: "center", fontSize: 12 }}>
            <Link to="/companies/directory" style={{ color: "var(--gold)", textDecoration: "none", fontWeight: 600 }}>
              Skip for now — Browse candidates →
            </Link>
          </div>
        </aside>

        {/* RIGHT MAIN WORKSPACE PANEL */}
        <main>
          {/* Header Banner for Stage 1A */}
          <div
            style={{
              background: "linear-gradient(135deg, #0A1F3D 0%, #1A3358 100%)",
              color: "#fff",
              borderRadius: 16,
              padding: "24px 28px",
              marginBottom: 24,
              display: "flex",
              alignItems: "flex-start",
              gap: 16,
              boxShadow: "0 12px 30px rgba(10,31,61,0.1)"
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 12,
                background: "rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0
              }}
            >
              🛡️
            </div>
            <div>
              <div style={{ fontFamily: "var(--font-mono)", fontSize: 10, fontWeight: 800, color: "var(--gold-light)", letterSpacing: "0.14em", marginBottom: 4 }}>
                STAGE 1A · WHY THIS MATTERS
              </div>
              <h3 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "#fff", marginBottom: 6 }}>
                Verify your business once. Get trusted forever.
              </h3>
              <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.45, marginBottom: 12 }}>
                Companies with verified KYC get a permanent trust badge. Candidates apply 3x more often to verified profiles.
              </p>
              <div style={{ display: "flex", gap: 12, fontSize: 11.5, color: "var(--gold)" }}>
                <span>✔ Save drafts & multi-user access</span>
                <span>✔ Pay on hire pricing locked</span>
              </div>
            </div>
          </div>

          {/* Form Card */}
          <div style={{ background: "#fff", borderRadius: 20, padding: 36, border: "1px solid #E5E7EB", boxShadow: "0 10px 30px -10px rgba(0,0,0,0.05)" }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.14em", marginBottom: 6 }}>
              STAGE 1A · 1/15 COMPLETE
            </div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>
              Account & KYC
            </h2>
            <p style={{ fontSize: 13.5, color: "#64748B", marginBottom: 28 }}>Legal, compliance & financial documents</p>

            <form style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Field 1: Company legal name */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>COMPANY LEGAL NAME</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                </div>
                <input
                  type="text"
                  value={companyLegalName}
                  onChange={(e) => setCompanyLegalName(e.target.value)}
                  placeholder="e.g. Acme Healthcare Pvt Ltd"
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                />
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Exact registered name as on GST</div>
              </div>

              {/* Row 2: GSTIN & PAN */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>GSTIN</label>
                    <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                  </div>
                  <input
                    type="text"
                    value={gstin}
                    onChange={(e) => setGstin(e.target.value)}
                    placeholder="33AAAAA0000A1Z5"
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>15-char GST registration number</div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>PAN</label>
                    <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                  </div>
                  <input
                    type="text"
                    value={pan}
                    onChange={(e) => setPan(e.target.value)}
                    placeholder="AAAAA0000A"
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>10-char company PAN</div>
                </div>
              </div>

              {/* Entity Type */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>TYPE OF ENTITY</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                </div>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff" }}
                >
                  <option value="Pvt Ltd">Pvt Ltd / LLP / Partnership / OPC</option>
                  <option value="Sole Proprietorship">Sole Proprietorship</option>
                  <option value="Public Ltd">Public Ltd</option>
                </select>
              </div>

              {/* Row 4: Date of Incorporation & Size */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>DATE OF INCORPORATION</label>
                    <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                  </div>
                  <input
                    type="date"
                    value={dateOfIncorporation}
                    onChange={(e) => setDateOfIncorporation(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                  />
                  <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>When the company was registered</div>
                </div>

                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>COMPANY SIZE</label>
                    <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                  </div>
                  <select
                    value={companySize}
                    onChange={(e) => setCompanySize(e.target.value)}
                    style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none", background: "#fff" }}
                  >
                    <option value="1-20">1 - 20 Employees</option>
                    <option value="20-100">20 - 100 Employees</option>
                    <option value="100-500">100 - 500 Employees</option>
                    <option value="500+">500+ Employees</option>
                  </select>
                </div>
              </div>

              {/* Registered Address */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>REGISTERED ADDRESS</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                </div>
                <textarea
                  rows={2}
                  value={registeredAddress}
                  onChange={(e) => setRegisteredAddress(e.target.value)}
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Address as on GST certificate</div>
              </div>

              {/* Operating Address */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>OPERATING ADDRESS</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEF3C7", color: "#D97706", padding: "2px 6px", borderRadius: 4 }}>OPT</span>
                </div>
                <textarea
                  rows={2}
                  value={operatingAddress}
                  onChange={(e) => setOperatingAddress(e.target.value)}
                  placeholder="Leave blank if same as registered"
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none", fontFamily: "inherit" }}
                />
              </div>

              {/* Website URL */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>COMPANY WEBSITE URL</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEF3C7", color: "#D97706", padding: "2px 6px", borderRadius: 4 }}>OPT</span>
                </div>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  placeholder="https://acme.com"
                  style={{ width: "100%", padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                />
              </div>

              {/* Authorized Signatory */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <label style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.08em", color: "var(--navy)" }}>AUTHORIZED SIGNATORY</label>
                  <span style={{ fontSize: 9, fontWeight: 800, background: "#FEE2E2", color: "#DC2626", padding: "2px 6px", borderRadius: 4 }}>MUST</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <input
                    type="text"
                    value={signatoryName}
                    onChange={(e) => setSignatoryName(e.target.value)}
                    placeholder="Full name"
                    style={{ padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                  />
                  <input
                    type="email"
                    value={signatoryEmail}
                    onChange={(e) => setSignatoryEmail(e.target.value)}
                    placeholder="Email address"
                    style={{ padding: "12px 14px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 14, outline: "none" }}
                  />
                </div>
                <div style={{ fontSize: 11, color: "#94A3B8", marginTop: 4 }}>Person who signs MOU + invoices</div>
              </div>

              {/* DOCUMENTS UPLOAD GRID */}
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ fontSize: 12, fontWeight: 800, color: "var(--navy)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
                  DOCUMENTATION & VERIFICATION
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                  {/* GST */}
                  <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: 16, background: "#FAF7F2", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      <span>KYC: GST certificate</span>
                      <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "1px 5px", borderRadius: 4 }}>MUST</span>
                    </div>
                    <button type="button" style={{ background: "#0A1F3D", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      ⬆ Click to upload
                    </button>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>PDF/JPG ≤ 2MB</div>
                  </div>

                  {/* PAN */}
                  <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: 16, background: "#FAF7F2", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      <span>KYC: PAN card</span>
                      <span style={{ background: "#FEE2E2", color: "#DC2626", padding: "1px 5px", borderRadius: 4 }}>MUST</span>
                    </div>
                    <button type="button" style={{ background: "#0A1F3D", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      ⬆ Click to upload
                    </button>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>PDF/JPG ≤ 2MB</div>
                  </div>

                  {/* Incorporation */}
                  <div style={{ border: "1.5px solid #22C55E", borderRadius: 12, padding: 16, background: "rgba(34,197,94,0.05)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      <span>KYC: Cert. of Incorporation</span>
                      <span style={{ background: "#22C55E", color: "#fff", padding: "1px 6px", borderRadius: 10, fontSize: 10 }}>VERIFIED ✓</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#fff", padding: "8px 12px", borderRadius: 8, border: "1px solid #E5E7EB" }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: "var(--navy)" }}>📄 Certificate_of_incorporation.pdf</span>
                      <span style={{ fontSize: 11, color: "var(--gold)", cursor: "pointer", fontWeight: 700 }}>Replace</span>
                    </div>
                  </div>

                  {/* Cheque */}
                  <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: 16, background: "#FAF7F2", textAlign: "center" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                      <span>KYC: Cancelled cheque</span>
                      <span style={{ background: "#E2E8F0", color: "#475569", padding: "1px 5px", borderRadius: 4 }}>COND</span>
                    </div>
                    <button type="button" style={{ background: "#0A1F3D", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                      ⬆ Click to upload
                    </button>
                    <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>For direct bank transfers</div>
                  </div>
                </div>

                {/* MSME Certificate */}
                <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: 16, background: "#FAF7F2", textAlign: "center" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, marginBottom: 8 }}>
                    <span>MSME / Startup India certificate</span>
                    <span style={{ background: "#FEF3C7", color: "#D97706", padding: "1px 5px", borderRadius: 4 }}>OPT</span>
                  </div>
                  <button type="button" style={{ background: "#0A1F3D", color: "#fff", border: 0, padding: "8px 16px", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: "pointer" }}>
                    ⬆ Click to upload
                  </button>
                  <div style={{ fontSize: 10, color: "#94A3B8", marginTop: 6 }}>Optional — unlocks pricing benefits</div>
                </div>
              </div>

              {/* BOTTOM FLOATING CTA BUTTON */}
              <div style={{ marginTop: 20 }}>
                <button
                  type="button"
                  onClick={() => setActiveStage("1B")}
                  style={{
                    width: "100%",
                    background: "var(--gold)",
                    color: "var(--navy-deep)",
                    border: 0,
                    borderRadius: 12,
                    padding: "16px",
                    fontSize: 15,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px -6px rgba(229,168,46,0.4)"
                  }}
                >
                  Stage 1B: Point of Contact →
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
