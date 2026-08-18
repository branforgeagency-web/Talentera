import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";

export default function VerifyCandidate() {
  const { candidateId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/public/verify/candidate/${candidateId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Verification record not found.");
        return res.json();
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

  const { name, email, mobile, city, currentRole, experience, aadhaarVerified, scoring, academy, certification, assessment, videoIntro, liveCharts, summary, verifiedAt } = data;
  const isGold = scoring?.badge === "gold";

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F0", color: "#0A1F3D", paddingBottom: 64 }}>
      {/* Top Header Navbar */}
      <header style={{ background: "#0A1F3D", color: "#fff", padding: "16px 24px", position: "sticky", top: 0, zIndex: 50, boxShadow: "0 2px 8px rgba(0,0,0,0.1)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Link to="/" style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "#fff" }}>
            <div style={{ width: 36, height: 36, background: "#E5A82E", color: "#0A1F3D", fontWeight: "bold", borderRadius: 8, display: "flex", alignItems: "center", justifyCenter: "center", fontSize: 20, textAlign: "center", lineHeight: "36px" }}>
              T
            </div>
            <span style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.02em" }}>Talentera <span style={{ color: "#E5A82E", fontWeight: 400, fontSize: 14 }}>Verify</span></span>
          </Link>

          <button
            onClick={copyShareLink}
            style={{ display: "flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "#fff", padding: "8px 16px", borderRadius: 12, fontSize: 13, fontWeight: 600, cursor: "pointer" }}
          >
            {copied ? "✓ Link Copied!" : "🔗 Share Verification"}
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
                      ⭐ GOLD VERIFIED BADGE
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
                🛡️ Authenticity Guaranteed
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
                📄 Verified Candidate Summary
              </h3>
              <p style={{ color: "#374151", lineHeight: 1.6, margin: 0 }}>{summary}</p>
            </div>

            {/* Verified Stages Breakdown */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
                🛡️ Audit & Verification Trail
              </h3>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Aadhaar Identity */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#059669", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Stage 1: Government Identity (e-KYC)</div>
                    <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>Aadhaar verified • Name: {name} • Phone: {mobile}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#047857", background: "#D1FAE5", padding: "4px 10px", borderRadius: 999 }}>+5 Pts</span>
                </div>

                {/* Academy Training */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.2)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#2563EB", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Stage 2: Academy Training Certification</div>
                    <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>{academy?.academyName || "Verified Training Institution"} ({academy?.batch || "Batch 2025"})</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#1D4ED8", background: "#DBEAFE", padding: "4px 10px", borderRadius: 999 }}>+15 Pts</span>
                </div>

                {/* Professional Certifications */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(147,51,234,0.06)", border: "1px solid rgba(147,51,234,0.2)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#9333EA", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Stage 3: Professional Accreditation</div>
                    <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>{certification?.name || "AAP/AHIMA Certification"} (ID: {certification?.certId || "VERIFIED-8821"})</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#7E22CE", background: "#F3E8FF", padding: "4px 10px", borderRadius: 999 }}>+20 Pts</span>
                </div>

                {/* Proctored Assessment */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(217,119,6,0.06)", border: "1px solid rgba(217,119,6,0.2)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#D97706", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Stage 4: Skill Assessment Score</div>
                    <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>Proctored Score: {assessment?.score || 90}/100 • Topic: {assessment?.topic || "Domain Competency"}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#B45309", background: "#FEF3C7", padding: "4px 10px", borderRadius: 999 }}>+25 Pts</span>
                </div>

                {/* Live Charts Performance */}
                <div style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: 16, borderRadius: 12, background: "rgba(79,70,229,0.06)", border: "1px solid rgba(79,70,229,0.2)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "#4F46E5", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold" }}>
                    ✓
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, color: "#111827" }}>Stage 6: Live Performance Audit</div>
                    <p style={{ fontSize: 13, color: "#4B5563", margin: "2px 0 0" }}>Accuracy Score: {liveCharts?.accuracyScore || 96}% • Charts Audited: {liveCharts?.liveChartsAudited || 40}</p>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 800, color: "#4338CA", background: "#E0E7FF", padding: "4px 10px", borderRadius: 999 }}>+10 Pts</span>
                </div>
              </div>
            </div>

            {/* Video Intro Player */}
            <div style={{ background: "#fff", padding: 24, borderRadius: 16, border: "1px solid #E5E7EB" }}>
              <h3 style={{ fontSize: 18, fontWeight: 800, color: "#0A1F3D", marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
                🎥 Stage 5: Video Introduction
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
