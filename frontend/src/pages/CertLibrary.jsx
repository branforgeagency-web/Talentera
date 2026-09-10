import React, { useState, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { CERT_LIBRARY } from "../data/certLibrary";
import { useToast } from "../components/Toast.jsx";
import api from "../api/client";

export default function CertLibrary() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const toast = useToast();

  const initialBody = searchParams.get("body");
  const [activeBodyKey, setActiveBodyKey] = useState(
    initialBody && CERT_LIBRARY[initialBody] ? initialBody : "aapc"
  );
  const [specialtyFilter, setSpecialtyFilter] = useState("All");
  const [selectedCertForModal, setSelectedCertForModal] = useState(null);
  const [savedGoals, setSavedGoals] = useState({});
  const [userEmail, setUserEmail] = useState(null);

  // Sync activeBodyKey if URL param changes
  useEffect(() => {
    const paramBody = searchParams.get("body");
    if (paramBody && CERT_LIBRARY[paramBody] && paramBody !== activeBodyKey) {
      setActiveBodyKey(paramBody);
    }
  }, [searchParams]);

  // Check user auth for top-bar status
  useEffect(() => {
    api
      .get("/candidate/me")
      .then((res) => {
        const email = res.data?.candidate?.email || res.data?.email;
        if (email) setUserEmail(email);
      })
      .catch(() => {
        // Guest mode / not logged in
      });
  }, []);

  const handleSelectBody = (key) => {
    setActiveBodyKey(key);
    setSpecialtyFilter("All");
    setSearchParams({ body: key });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const activeBody = CERT_LIBRARY[activeBodyKey] || CERT_LIBRARY.aapc;

  // Filter certs for Specialty tab if subFilter selected
  const displayedCerts = useMemo(() => {
    if (activeBodyKey === "specialty" && specialtyFilter !== "All") {
      return activeBody.certs.filter((c) => c.subBody === specialtyFilter);
    }
    return activeBody.certs;
  }, [activeBody, activeBodyKey, specialtyFilter]);

  const handleAddToGoals = (certItem) => {
    setSavedGoals((prev) => ({ ...prev, [certItem.code]: true }));
    toast(`✓ Added ${certItem.code} to your career goals!`, "✓");
  };

  const handleSelectForStage3 = (certItem) => {
    navigate(`/dashboard?stage=3&body=${activeBodyKey}&cert=${certItem.code}`);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#070E1E",
        color: "#F8FAFC",
        fontFamily: "Inter, system-ui, -apple-system, sans-serif",
      }}
    >
      {/* 01. TOP NAVIGATION BAR */}
      <header
        style={{
          borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
          background: "rgba(10, 17, 34, 0.95)",
          backdropFilter: "blur(12px)",
          position: "sticky",
          top: 0,
          zIndex: 50,
          padding: "12px 24px",
        }}
      >
        <div
          style={{
            maxWidth: 1240,
            margin: "0 auto",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          {/* Brand */}
          <Link
            to="/"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
              color: "#FFFFFF",
            }}
          >
            <img
              src="/logo-white.png"
              alt="Talentera"
              style={{ height: 32, width: "auto", objectFit: "contain" }}
            />
            {/* <span
              style={{
                fontSize: 15,
                fontWeight: 900,
                letterSpacing: "0.5px",
                color: "#F59E0B",
              }}
            >
              · CERT LIBRARY
            </span> */}
          </Link>

          {/* Right actions */}
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {userEmail && (
              <span style={{ fontSize: 12, color: "#94A3B8" }}>
                Signed in: <span style={{ color: "#38BDF8" }}>{userEmail}</span>
              </span>
            )}
            <button
              type="button"
              onClick={() => navigate("/learn")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: "rgba(255, 255, 255, 0.06)",
                border: "1px solid rgba(255, 255, 255, 0.14)",
                color: "#FFFFFF",
                fontSize: 13,
                fontWeight: 700,
                padding: "8px 16px",
                borderRadius: 10,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
              }}
            >
              <span>←</span>
              <span>Back to home</span>
            </button>
          </div>
        </div>
      </header>

      {/* 02. HERO HEADER */}
      <section
        style={{
          padding: "48px 24px 28px",
          maxWidth: 1240,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        {/* Eyebrow badge */}
        <div style={{ display: "inline-block", marginBottom: 16 }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 16px",
              borderRadius: 24,
              border: "1px solid rgba(245, 158, 11, 0.35)",
              background: "rgba(245, 158, 11, 0.08)",
              color: "#F59E0B",
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.8px",
            }}
          >
            <span>●</span>
            <span>CERTIFICATION LIBRARY · 49 REAL CERTS · 4 ISSUING BODIES</span>
          </div>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "clamp(28px, 4.5vw, 46px)",
            fontWeight: 900,
            lineHeight: 1.15,
            color: "#FFFFFF",
            margin: "0 0 16px 0",
          }}
        >
          Every cert that matters in{" "}
          <span
            style={{
              background: "linear-gradient(90deg, #F59E0B 0%, #FBBF24 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            RCM hiring.
          </span>
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: 14,
            lineHeight: 1.6,
            color: "#94A3B8",
            maxWidth: 760,
            margin: "0 auto 24px",
          }}
        >
          From AAPC's flagship CPC to BMSC's BCHH-C for home health. Pick your path, see exam time, fees,
          prerequisites, and exactly which roles each cert unlocks in Indian RCM hiring.
        </p>

        {/* Feature Pills */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 36,
          }}
        >
          {[
            "49 certs cataloged",
            "USD & INR pricing",
            "Prerequisites mapped",
            "India-hiring guidance",
          ].map((feat) => (
            <div
              key={feat}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "5px 14px",
                borderRadius: 20,
                background: "rgba(255, 255, 255, 0.04)",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                fontSize: 12,
                color: "#CBD5E1",
                fontWeight: 600,
              }}
            >
              <span style={{ color: "#10B981" }}>✓</span>
              <span>{feat}</span>
            </div>
          ))}
        </div>

        {/* 03. ISSUING BODY TABS (4 CARDS) */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: 14,
            marginBottom: 24,
            textAlign: "left",
          }}
        >
          {Object.values(CERT_LIBRARY).map((body) => {
            const isActive = body.key === activeBodyKey;
            return (
              <button
                key={body.key}
                type="button"
                onClick={() => handleSelectBody(body.key)}
                style={{
                  background: isActive ? body.gradient : "rgba(15, 23, 42, 0.7)",
                  border: isActive ? `1px solid ${body.color}` : "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 16,
                  padding: "16px 18px",
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  transition: "all 0.2s ease",
                  boxShadow: isActive ? `0 8px 24px ${body.color}33` : "none",
                  transform: isActive ? "translateY(-2px)" : "none",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
                  <span
                    style={{
                      fontSize: 18,
                      fontWeight: 900,
                      color: "#FFFFFF",
                    }}
                  >
                    {body.name}
                  </span>
                  <span
                    style={{
                      background: isActive ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.1)",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 800,
                      padding: "3px 9px",
                      borderRadius: 12,
                    }}
                  >
                    {body.certs.length}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    color: isActive ? "rgba(255, 255, 255, 0.85)" : "#64748B",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {body.tabSub}
                </span>
              </button>
            );
          })}
        </div>

        {/* 04. "NOT SURE WHICH PATH?" ALERT CALLOUT */}
        <div
          style={{
            background: "rgba(245, 158, 11, 0.06)",
            border: "1px solid rgba(245, 158, 11, 0.25)",
            borderRadius: 14,
            padding: "14px 20px",
            display: "flex",
            alignItems: "center",
            gap: 14,
            textAlign: "left",
            marginBottom: 32,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "rgba(245, 158, 11, 0.15)",
              color: "#F59E0B",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 900,
              flexShrink: 0,
            }}
          >
            ?
          </div>
          <div style={{ fontSize: 13, lineHeight: 1.5, color: "#E2E8F0" }}>
            <strong style={{ color: "#FFFFFF", marginRight: 6 }}>Not sure which path?</strong>
            Most ThoughtFlows freshers start with{" "}
            <span style={{ color: "#FDE047", fontWeight: 700 }}>AAPC CPC-A</span> or{" "}
            <span style={{ color: "#4ADE80", fontWeight: 700 }}>AHIMA CCA</span>. HCC-focused career → add{" "}
            <span style={{ color: "#F87171", fontWeight: 700 }}>CRC</span> in year 2. Home health →{" "}
            <span style={{ color: "#FBBF24", fontWeight: 700 }}>ThoughtFlows BCHH-C track</span>.
          </div>
        </div>

        {/* 05. ACTIVE BODY HERO CARD */}
        <div
          style={{
            background: activeBody.heroGradient,
            borderRadius: 20,
            border: `1px solid ${activeBody.color}55`,
            padding: "26px 30px",
            textAlign: "left",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: 24,
            marginBottom: 36,
            flexWrap: "wrap",
            boxShadow: `0 10px 30px ${activeBody.color}22`,
          }}
        >
          {/* Left info */}
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flex: "1 1 500px" }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: 16,
                background: activeBody.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 900,
                color: "#FFFFFF",
                boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
                flexShrink: 0,
                textTransform: "uppercase",
              }}
            >
              {activeBody.name}
            </div>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 900, color: "#FFFFFF", margin: "0 0 4px 0" }}>
                {activeBody.fullName}
              </h2>
              {activeBody.officialUrl && (
                <div style={{ fontSize: 12, color: "rgba(255, 255, 255, 0.7)", marginBottom: 8 }}>
                  {activeBody.officialUrl.replace("https://", "")}
                </div>
              )}
              <p
                style={{
                  fontSize: 13,
                  lineHeight: 1.5,
                  color: "rgba(255, 255, 255, 0.85)",
                  margin: "0 0 14px 0",
                  maxWidth: 620,
                }}
              >
                {activeBody.heroDesc}
              </p>
              {activeBody.officialUrl && (
                <a
                  href={activeBody.officialUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    padding: "6px 14px",
                    borderRadius: 8,
                    background: "rgba(255, 255, 255, 0.15)",
                    border: "1px solid rgba(255, 255, 255, 0.3)",
                    color: "#FFFFFF",
                    fontSize: 12,
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  <span>Visit official site</span>
                  <span>↗</span>
                </a>
              )}
            </div>
          </div>

          {/* Right stats or sub-filters */}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            {activeBodyKey === "specialty" ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,0.7)" }}>
                  SUB-BODY FILTER:
                </span>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["All", "BMSC", "AMBA", "PMI", "NHA"].map((sb) => {
                    const isSubActive = specialtyFilter === sb;
                    return (
                      <button
                        key={sb}
                        type="button"
                        onClick={() => setSpecialtyFilter(sb)}
                        style={{
                          background: isSubActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.12)",
                          color: isSubActive ? "#EA580C" : "#FFFFFF",
                          border: "none",
                          borderRadius: 8,
                          padding: "6px 12px",
                          fontSize: 11,
                          fontWeight: 800,
                          cursor: "pointer",
                          transition: "all 0.15s ease",
                        }}
                      >
                        {sb}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <>
                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: "12px 18px",
                    borderRadius: 12,
                    textAlign: "center",
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF" }}>
                    {activeBody.memberCount}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255, 255, 255, 0.7)" }}>
                    MEMBERS
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: "12px 18px",
                    borderRadius: 12,
                    textAlign: "center",
                    minWidth: 100,
                  }}
                >
                  <div style={{ fontSize: 18, fontWeight: 900, color: "#FFFFFF" }}>
                    {activeBody.established}
                  </div>
                  <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255, 255, 255, 0.7)" }}>
                    ESTABLISHED
                  </div>
                </div>

                <div
                  style={{
                    background: "rgba(0, 0, 0, 0.25)",
                    padding: "12px 18px",
                    borderRadius: 12,
                    textAlign: "center",
                    minWidth: 120,
                  }}
                >
                  <div style={{ fontSize: 14, fontWeight: 900, color: "#FFFFFF" }}>
                    {activeBody.standard}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* 06. CERTIFICATIONS CARDS GRID */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))",
            gap: 20,
            textAlign: "left",
          }}
        >
          {displayedCerts.map((certItem) => {
            const isGoalSaved = savedGoals[certItem.code];
            return (
              <div
                key={certItem.code}
                style={{
                  background: "#0C1427",
                  border: "1px solid rgba(255, 255, 255, 0.08)",
                  borderRadius: 18,
                  padding: "22px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 16,
                  transition: "all 0.2s ease",
                  boxShadow: "0 4px 16px rgba(0, 0, 0, 0.3)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = `${activeBody.color}88`;
                  e.currentTarget.style.transform = "translateY(-2px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = "rgba(255, 255, 255, 0.08)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {/* Card Top: Code badge + category flag */}
                <div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 12,
                    }}
                  >
                    <span
                      style={{
                        background: activeBody.color,
                        color: "#FFFFFF",
                        padding: "4px 12px",
                        borderRadius: 8,
                        fontSize: 14,
                        fontWeight: 900,
                        letterSpacing: "0.5px",
                      }}
                    >
                      {certItem.code}
                    </span>

                    {certItem.flagText && (
                      <span
                        style={{
                          background:
                            certItem.flag === "popular"
                              ? "rgba(245, 158, 11, 0.15)"
                              : certItem.flag === "fresher"
                              ? "rgba(16, 185, 129, 0.15)"
                              : certItem.flag === "required"
                              ? "rgba(239, 68, 68, 0.15)"
                              : "rgba(139, 92, 246, 0.15)",
                          color:
                            certItem.flag === "popular"
                              ? "#F59E0B"
                              : certItem.flag === "fresher"
                              ? "#34D399"
                              : certItem.flag === "required"
                              ? "#F87171"
                              : "#A78BFA",
                          border: `1px solid ${
                            certItem.flag === "popular"
                              ? "rgba(245, 158, 11, 0.3)"
                              : certItem.flag === "fresher"
                              ? "rgba(16, 185, 129, 0.3)"
                              : certItem.flag === "required"
                              ? "rgba(239, 68, 68, 0.3)"
                              : "rgba(139, 92, 246, 0.3)"
                          }`,
                          padding: "2px 8px",
                          borderRadius: 6,
                          fontSize: 10,
                          fontWeight: 800,
                          letterSpacing: "0.5px",
                        }}
                      >
                        {certItem.flagText}
                      </span>
                    )}
                  </div>

                  {/* Title & Target */}
                  <h3
                    style={{
                      fontSize: 17,
                      fontWeight: 800,
                      color: "#FFFFFF",
                      margin: "0 0 4px 0",
                      lineHeight: 1.3,
                    }}
                  >
                    {certItem.name}
                  </h3>
                  <div style={{ fontSize: 12, color: "#64748B", marginBottom: 14 }}>
                    {certItem.target}
                  </div>

                  {/* 3 Stats row */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3, 1fr)",
                      gap: 8,
                      background: "rgba(15, 23, 42, 0.6)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                      borderRadius: 10,
                      padding: "10px 8px",
                      marginBottom: 14,
                      textAlign: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>
                        ⏱ {certItem.time}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#64748B" }}>EXAM TIME</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#FFFFFF" }}>
                        📝 {certItem.qs}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#64748B" }}>QUESTIONS</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: "#10B981" }}>
                        {certItem.inr}
                      </div>
                      <div style={{ fontSize: 9, fontWeight: 700, color: "#64748B" }}>
                        ${certItem.usd}
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <p
                    style={{
                      fontSize: 12.5,
                      lineHeight: 1.5,
                      color: "#94A3B8",
                      margin: "0 0 14px 0",
                    }}
                  >
                    {certItem.desc}
                  </p>

                  {/* Prerequisites */}
                  <div style={{ marginBottom: 12 }}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: "#475569",
                        letterSpacing: "0.5px",
                        marginBottom: 3,
                      }}
                    >
                      PREREQUISITES
                    </div>
                    <div style={{ fontSize: 11.5, color: "#CBD5E1", lineHeight: 1.4 }}>
                      {certItem.prereq}
                    </div>
                  </div>

                  {/* Best For Box */}
                  <div
                    style={{
                      background: "rgba(30, 41, 59, 0.5)",
                      border: "1px solid rgba(255, 255, 255, 0.06)",
                      borderRadius: 8,
                      padding: "8px 12px",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 800,
                        color: activeBody.accentColor,
                        marginBottom: 2,
                      }}
                    >
                      BEST FOR
                    </div>
                    <div style={{ fontSize: 11.5, color: "#E2E8F0", lineHeight: 1.4 }}>
                      {certItem.bestFor}
                    </div>
                  </div>
                </div>

                {/* Card Actions: Learn More & Add to Goals */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 10,
                    marginTop: 6,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedCertForModal(certItem)}
                    style={{
                      background: "rgba(255, 255, 255, 0.06)",
                      border: "1px solid rgba(255, 255, 255, 0.15)",
                      color: "#FFFFFF",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.12)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = "rgba(255, 255, 255, 0.06)";
                    }}
                  >
                    Learn More →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleAddToGoals(certItem)}
                    style={{
                      background: isGoalSaved
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(245, 158, 11, 0.12)",
                      border: isGoalSaved
                        ? "1px solid #10B981"
                        : "1px solid rgba(245, 158, 11, 0.3)",
                      color: isGoalSaved ? "#34D399" : "#F59E0B",
                      borderRadius: 8,
                      padding: "8px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      textAlign: "center",
                    }}
                  >
                    {isGoalSaved ? "✓ In Goals" : "+ Add to Goals"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 07. DEEP-DIVE MODAL FOR "LEARN MORE" */}
      {selectedCertForModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(3, 7, 18, 0.8)",
            backdropFilter: "blur(8px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            zIndex: 100,
          }}
          onClick={() => setSelectedCertForModal(null)}
        >
          <div
            style={{
              background: "#0F172A",
              border: "1px solid rgba(255, 255, 255, 0.15)",
              borderRadius: 20,
              maxWidth: 640,
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: 28,
              position: "relative",
              boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal close */}
            <button
              type="button"
              onClick={() => setSelectedCertForModal(null)}
              style={{
                position: "absolute",
                top: 18,
                right: 18,
                background: "rgba(255, 255, 255, 0.1)",
                border: "none",
                borderRadius: "50%",
                width: 32,
                height: 32,
                color: "#FFFFFF",
                fontSize: 16,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              ✕
            </button>

            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
              <span
                style={{
                  background: activeBody.color,
                  color: "#FFFFFF",
                  padding: "4px 12px",
                  borderRadius: 8,
                  fontSize: 16,
                  fontWeight: 900,
                }}
              >
                {selectedCertForModal.code}
              </span>
              <span style={{ fontSize: 13, color: "#94A3B8", fontWeight: 700 }}>
                {activeBody.fullName}
              </span>
            </div>

            <h2 style={{ fontSize: 22, fontWeight: 900, color: "#FFFFFF", margin: "0 0 6px 0" }}>
              {selectedCertForModal.name}
            </h2>
            <p style={{ fontSize: 13, color: "#64748B", margin: "0 0 20px 0" }}>
              {selectedCertForModal.target}
            </p>

            {/* Exam Pattern Specs */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 10,
                background: "rgba(30, 41, 59, 0.7)",
                borderRadius: 12,
                padding: "14px 12px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF" }}>
                  ⏱ {selectedCertForModal.time}
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>Exam Duration</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#FFFFFF" }}>
                  📝 {selectedCertForModal.qs}
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>Exam Format</div>
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: "#10B981" }}>
                  {selectedCertForModal.inr}
                </div>
                <div style={{ fontSize: 10, color: "#94A3B8" }}>
                  ${selectedCertForModal.usd} exam fee
                </div>
              </div>
            </div>

            {/* Full description */}
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: "#F59E0B", marginBottom: 6 }}>
                CREDENTIAL OVERVIEW
              </h4>
              <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.6, margin: 0 }}>
                {selectedCertForModal.desc}
              </p>
            </div>

            {/* Syllabus breakdown */}
            {selectedCertForModal.syllabus && (
              <div style={{ marginBottom: 18 }}>
                <h4 style={{ fontSize: 12, fontWeight: 800, color: "#38BDF8", marginBottom: 8 }}>
                  SYLLABUS & DOMAINS TESTED
                </h4>
                <ul
                  style={{
                    margin: 0,
                    paddingLeft: 18,
                    fontSize: 12.5,
                    color: "#94A3B8",
                    lineHeight: 1.6,
                  }}
                >
                  {selectedCertForModal.syllabus.map((s, idx) => (
                    <li key={idx} style={{ marginBottom: 4 }}>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Prerequisites */}
            <div style={{ marginBottom: 18 }}>
              <h4 style={{ fontSize: 12, fontWeight: 800, color: "#A78BFA", marginBottom: 6 }}>
                PREREQUISITES & ELIGIBILITY
              </h4>
              <p style={{ fontSize: 13, color: "#CBD5E1", lineHeight: 1.5, margin: 0 }}>
                {selectedCertForModal.prereq}
              </p>
            </div>

            {/* Indian RCM Career Impact */}
            <div
              style={{
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.25)",
                borderRadius: 12,
                padding: "12px 16px",
                marginBottom: 24,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 800, color: "#34D399", marginBottom: 4 }}>
                CAREER & HIRING OUTLOOK IN INDIAN RCM
              </div>
              <div style={{ fontSize: 12.5, color: "#E2E8F0", lineHeight: 1.5 }}>
                {selectedCertForModal.bestFor}
              </div>
            </div>

            {/* Modal actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button
                type="button"
                onClick={() => setSelectedCertForModal(null)}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  background: "transparent",
                  border: "1px solid rgba(255,255,255,0.2)",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => handleSelectForStage3(selectedCertForModal)}
                style={{
                  padding: "10px 20px",
                  borderRadius: 8,
                  background: "#2563EB",
                  border: "none",
                  color: "#FFFFFF",
                  fontSize: 13,
                  fontWeight: 800,
                  cursor: "pointer",
                  boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
                }}
              >
                Select for Stage 3 Verification →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
