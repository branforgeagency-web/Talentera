import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { safeJson } from "../utils/safeJson.js";

export default function VerifyCandidate() {
  const { candidateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/public/verify/candidate/${candidateId}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Verification record not found.");
        return safeJson(res);
      })
      .then((resData) => {
        setData(resData);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [candidateId]);

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAF7F0] flex items-center justify-center p-6" style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ border: "3px solid #0A1F3D", borderTopColor: "transparent", borderRadius: "50%", width: 40, height: 40, animation: "spin 1s linear infinite", margin: "0 auto 16px" }}></div>
          <p style={{ color: "#0A1F3D", fontWeight: 600 }}>Verifying Credential on Talentera...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ minHeight: "100vh", background: "#FAF7F0", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <div style={{ maxWidth: 440, width: "100%", background: "#fff", padding: 32, borderRadius: 24, boxShadow: "0 10px 25px rgba(0,0,0,0.05)", border: "1px solid #FECACA", textAlign: "center" }}>
          <div style={{ width: 64, height: 64, background: "#FEE2E2", color: "#DC2626", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", fontWeight: "bold", fontSize: 24 }}>
            ✕
          </div>
          <h2 style={{ fontSize: 22, fontWeight: "bold", color: "#0A1F3D", marginBottom: 8 }}>Credential Not Found</h2>
          <p style={{ color: "#4B5563", marginBottom: 24, fontSize: 14 }}>The credential verification link you provided is invalid or has expired.</p>
          <Link
            to="/"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "#0A1F3D", color: "#fff", padding: "12px 24px", borderRadius: 12, fontWeight: 600, textDecoration: "none" }}
          >
            ← Back to Talentera
          </Link>
        </div>
      </div>
    );
  }

  const { name, email, mobile, city, currentRole, experience, aadhaarVerified, scoring, academy, certification, assessment, videoIntro, liveCharts, summary, verifiedAt, completedStages: rawCompletedStages } = data;
  // BUG FIX: this used to read scoring?.badge, but calculateVerificationScore()
  // returns isGoldBadge, not badge - so the Gold Verified Badge here never
  // actually showed even for genuinely gold-tier candidates.
  const isGold = scoring?.isGoldBadge === true;
  const completedStages = rawCompletedStages || [];

  // Every stage card below used to render an unconditional green checkmark
  // with hardcoded fallback text ("Batch 2025", "VERIFIED-8821", "Proctored
  // Score: 90/100"...) regardless of whether the candidate actually
  // completed, skipped, or was ever reviewed on that stage - meaning this
  // PUBLIC credential page (the one thing meant to let an employer confirm
  // a profile is genuine) could show a fabricated "verified" trail for a
  // candidate who hadn't actually done most of it. Each card now renders
  // only when the stage is genuinely complete; a small helper keeps that
  // check consistent across all of them.
  function StageStatusRow({ done, icon, color, bg, title, detail, points }) {
    if (!done) {
      return (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "#F8FAFC", border: "1px dashed #E2E8F0" }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: "#E2E8F0", color: "#94A3B8", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
            ·
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#94A3B8" }}>{title}</div>
            <p style={{ fontSize: 13, color: "#9CA3AF", margin: "2px 0 0" }}>Not yet completed</p>
          </div>
          <span style={{ fontSize: 11, fontWeight: 800, color: "#94A3B8", background: "#F1F5F9", padding: "4px 10px", borderRadius: 999 }}>+0 Pts</span>
        </div>
      );
    }
    return (
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: bg, border: `1px solid ${color}33` }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: color, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
          {icon}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 700, color: "#111827" }}>{title}</div>
          <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>{detail}</p>
        </div>
        <span style={{ fontSize: 11, fontWeight: 800, color, background: `${color}22`, padding: "4px 10px", borderRadius: 999 }}>+{points} Pts</span>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", color: "#0A1F3D", paddingBottom: 64 }}>
      {/* Top Header Navbar */}
      <header style={{ background: "#0A1F3D", color: "#fff", padding: "16px 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#fff" }}>
            <img src="/logo.png" alt="Talentera — The Era of Talent Begins Here" style={{ height: 36, width: "auto" }} />
            <span style={{ color: "#E5A82E", fontWeight: 700, fontSize: 13, fontFamily: "var(--font-mono)", letterSpacing: "0.12em" }}>VERIFY</span>
          </Link>

          <button
            onClick={copyShareLink}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {copied ? "✓ Link Copied!" : <span><i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }}></i> Share Verification</span>}
          </button>
        </div>
      </header>

      {/* Main Verification Container */}
      <main style={{ maxWidth: 1000, margin: "0 auto", padding: "40px 24px 0" }}>
        {/* Verification Status Banner */}
        <div style={{ background: "#fff", borderRadius: 24, padding: 32, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", border: "1px solid #E5E7EB", marginBottom: 32, position: "relative", overflow: "hidden" }}>
          <div style={{ display: "flex", flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative" }}>
                <div style={{ width: 80, height: 80, background: "#0A1F3D", color: "#fff", borderRadius: 18, display: "flex", alignItems: "center", justifyCenter: "center", fontWeight: 800, fontSize: 32, border: "2px solid #E5A82E", textAlign: "center", lineHeight: "80px" }}>
                  {name.charAt(0)}
                </div>
                {aadhaarVerified && (
                  <span style={{ position: "absolute", bottom: -6, right: -6, background: "#10B981", color: "#fff", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyCenter: "center", fontSize: 14, fontWeight: "bold" }} title="Aadhaar KYC Verified">
                    ✓
                  </span>
                )}
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 4 }}>
                  <h1 style={{ fontSize: 28, fontWeight: 800, color: "#0A1F3D", margin: 0 }}>{name}</h1>
                  {isGold ? (
                    <span style={{ background: "#E5A82E", color: "#0A1F3D", fontWeight: 800, fontSize: 11, padding: "4px 12px", borderRadius: 999, display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <i className="fa-solid fa-award"></i> GOLD VERIFIED BADGE
                    </span>
                  ) : (
                    <span style={{ background: "#DBEAFE", color: "#1E40AF", fontWeight: 800, fontSize: 11, padding: "4px 12px", borderRadius: 999 }}>
                      VERIFIED CANDIDATE
                    </span>
                  )}
                </div>
                <p style={{ color: "#4B5563", fontWeight: 500, margin: 0, fontSize: 15 }}>{currentRole} • {experience} Experience • {city}</p>
                <p style={{ fontSize: 12, color: "#9CA3AF", marginTop: 4, margin: 0 }}>Verified on {new Date(verifiedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" })}</p>
              </div>
            </div>

            {/* Verification Score Card */}
            <div style={{ background: "#FAF7F0", border: "2px solid rgba(229,168,46,0.4)", padding: 20, borderRadius: 16, textAlign: "center", minWidth: 200 }}>
              <div style={{ fontSize: 10, fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.1em", color: "#6B7280", marginBottom: 4 }}>Verification Score</div>
              <div style={{ fontSize: 36, fontWeight: 800, color: "#0A1F3D", lineHeight: 1 }}>
                {scoring?.score || 0}<span style={{ fontSize: 18, color: "#9CA3AF", fontWeight: 400 }}>/100</span>
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color: "#047857", marginTop: 6 }}>
                <i className="fa-solid fa-shield-halved" style={{ marginRight: 4 }}></i> Authenticity Guaranteed
              </div>
            </div>
          </div>
        </div>

        {/* 2-Column Grid Details */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 32 }}>
          {/* Left Column: Stage Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Professional Summary */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", marginBottom: 12, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-file-contract"></i> Verified Candidate Summary
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{summary}</p>
            </div>

            {/* Verified Stages Breakdown */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-shield-halved"></i> Audit & Verification Trail
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Aadhaar Identity */}
                <StageStatusRow
                  done={completedStages.includes(1)}
                  icon="✓" color="#059669" bg="rgba(16,185,129,0.06)"
                  title="Stage 1: Government Identity (e-KYC)"
                  detail={`Aadhaar verified • Name: ${name} • Phone: ${mobile}`}
                  points={5}
                />

                {/* Academy Training */}
                <StageStatusRow
                  done={completedStages.includes(2) && !academy?.skipped}
                  icon="✓" color="#2563EB" bg="rgba(37,99,235,0.06)"
                  title="Stage 2: Academy Training Certification"
                  detail={`${academy?.academyName || "Verified Training Institution"} (${academy?.duration || academy?.batch || "duration not on file"})`}
                  points={15}
                />

                {/* Professional Certifications — three-way status (verified /
                    pending staff review / rejected), not just done/not-done,
                    since a submitted-but-unreviewed certificate isn't the
                    same as a genuinely confirmed one. */}
                {completedStages.includes(3) && !certification?.skipped ? (
                  certification?.certStatus === "verified" ? (
                    <StageStatusRow
                      done icon="✓" color="#9333EA" bg="rgba(147,51,234,0.06)"
                      title="Stage 3: Professional Accreditation — Staff Verified"
                      detail={`${certification?.certName || certification?.name || "Certification"} (${certification?.issuingBody || "Issuing body"} · ID ending ${String(certification?.memberId || "").slice(-4) || "****"})`}
                      points={20}
                    />
                  ) : certification?.certStatus === "rejected" ? (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.25)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#DC2626", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                        ✕
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>Stage 3: Professional Accreditation — Not Verified</div>
                        <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>
                          {certification?.certName || certification?.name || "Certification"} claim submitted but could not be confirmed by Talentera staff.
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#DC2626", background: "#FEE2E2", padding: "4px 10px", borderRadius: 999 }}>+0 Pts</span>
                    </div>
                  ) : (
                    <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.25)" }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: "#D97706", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                        ⏳
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: "#111827" }}>Stage 3: Professional Accreditation — Pending Staff Review</div>
                        <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>
                          {certification?.certName || certification?.name || "Certification"} submitted with a certificate document; awaiting confirmation by Talentera staff.
                        </p>
                      </div>
                      <span style={{ fontSize: 11, fontWeight: 800, color: "#B45309", background: "#FEF3C7", padding: "4px 10px", borderRadius: 999 }}>Counted, pending review</span>
                    </div>
                  )
                ) : (
                  <StageStatusRow done={false} title="Stage 3: Professional Accreditation" points={0} />
                )}

                {/* Proctored Assessment */}
                <StageStatusRow
                  done={completedStages.includes(4)}
                  icon="✓" color="#D97706" bg="rgba(217,119,6,0.06)"
                  title="Stage 4: Skill Assessment Score"
                  detail={`Proctored Score: ${assessment?.foundationScore ?? assessment?.score ?? "N/A"}/100 • Topic: ${assessment?.topic || "Domain Competency"}`}
                  points={25}
                />

                {/* Live Charts Performance */}
                <StageStatusRow
                  done={completedStages.includes(6)}
                  icon="✓" color="#4F46E5" bg="rgba(79,70,229,0.06)"
                  title="Stage 6: Live Performance Audit"
                  detail={`Accuracy Score: ${liveCharts?.accuracyScore ?? "N/A"}% • Charts Audited: ${liveCharts?.liveChartsAudited ?? liveCharts?.chartsAudited ?? "N/A"}`}
                  points={10}
                />
              </div>
            </div>

            {/* Video Intro Player */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                <i className="fa-solid fa-video"></i> Stage 5: Video Introduction
              </h3>
              {videoIntro?.videoUrl ? (
                <div style={{ borderRadius: 12, overflow: "hidden", background: "#000", aspectRatio: "16/9" }}>
                  <video src={videoIntro.videoUrl} controls style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
              ) : (
                <div style={{ padding: 40, background: "#F3F4F6", borderRadius: 12, textAlign: "center", color: "#9CA3AF", fontSize: 14 }}>
                  Video Preview Not Uploaded
                </div>
              )}
            </div>

            {/* Quick Contact / Hire Card */}
            <div style={{ background: "#0A1F3D", color: "#fff", padding: 28, borderRadius: 20, border: "1px solid rgba(229,168,46,0.3)", textAlign: "center" }}>
              <h4 style={{ fontSize: 20, fontWeight: 800, margin: "0 0 8px" }}>Want to Hire {name}?</h4>
              <p style={{ color: "#D1D5DB", fontSize: 14, margin: "0 0 20px" }}>Access pre-verified candidates with instant hiring confidence.</p>
              <Link
                to="/companies/register"
                style={{ display: "block", width: "100%", background: "#E5A82E", color: "#0A1F3D", fontWeight: 800, padding: 14, borderRadius: 12, textDecoration: "none", boxShadow: "0 4px 12px rgba(229,168,46,0.2)" }}
              >
                Hire Verified Talent
              </Link>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
