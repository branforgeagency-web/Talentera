import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function Stage4Assessment({ stage, existingData, onSaved }) {
  const [profileData, setProfileData] = useState(existingData || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Refresh profile state when stage loads
    api.get("/candidate/me").then((res) => {
      if (res.data.candidate?.stage4) {
        setProfileData(res.data.candidate.stage4);
      }
    }).catch(() => {});
  }, []);

  const isCompleted = profileData?.foundationScore !== undefined;
  const scorePercent = profileData?.foundationScore || 0;

  function handleTakeTest() {
    // Open assessment runner in a new tab or current window
    window.open("/assessment/run", "_blank");
  }

  return (
    <div className="wiz-form">
      {/* NOT COMPLETED YET */}
      {!isCompleted ? (
        <div style={{ background: "#F8FAFC", border: "2px solid var(--navy)", borderRadius: 16, padding: 28, boxShadow: "0 10px 30px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
            <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              STAGE 04 · MANDATORY PROCTORED ASSESSMENT
            </span>
            <span style={{ fontSize: 12, color: "#64748B", fontWeight: 700 }}>10 Questions • 15 Minutes • Single Attempt</span>
          </div>

          <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "4px 0 8px" }}>
            Talentera AAPC / RCM Proctored Assessment
          </h2>

          <p style={{ fontSize: 13, color: "#475569", lineHeight: 1.6, margin: "0 0 16px" }}>
            Click <strong>Take the Test</strong> to open the proctored assessment in a dedicated window.
            This test evaluates ICD-10-CM sequencing, CPT modifiers, E/M MDM guidelines, HCC Risk Adjustment MEAT criteria, and RCM denial management.
          </p>

          <div style={{ background: "#FEF3C7", border: "1px solid #F59E0B", color: "#B45309", padding: "12px 16px", borderRadius: 10, fontSize: 12, fontWeight: 700, marginBottom: 20, display: "flex", alignItems: "center", gap: 8 }}>
            <i className="fa-solid fa-triangle-exclamation" style={{ fontSize: 16 }}></i>
            <span><strong>Anti-Cheat Proctored Test:</strong> If you switch browser tabs or navigate away from the test page, your assessment will automatically submit instantly.</span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
            <div style={{ background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #CBD5E1", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>10 Qs</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Domain Competency</div>
            </div>
            <div style={{ background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #CBD5E1", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>15 Mins</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Timed Countdown</div>
            </div>
            <div style={{ background: "#fff", padding: 14, borderRadius: 8, border: "1px solid #CBD5E1", textAlign: "center" }}>
              <div style={{ fontSize: 18, fontWeight: 800, color: "#15803D" }}>Single Attempt</div>
              <div style={{ fontSize: 11, color: "#64748B" }}>Score Auto-Locked</div>
            </div>
          </div>

          <button type="button" className="btn btn-gold" style={{ width: "100%", justifyContent: "center", padding: "14px 24px", fontSize: 15 }} onClick={handleTakeTest}>
            <i className="fa-solid fa-arrow-up-right-from-square" style={{ marginRight: 8 }}></i> Take the Test →
          </button>
        </div>
      ) : (
        /* ALREADY COMPLETED - no score shown here; our team reviews the
           recorded responses and verifies correctness as part of the
           candidate verification process. */
        <div>
          <div style={{ background: "#fff", border: "2px solid #22C55E", borderRadius: 16, padding: 24, marginBottom: 20, boxShadow: "0 10px 30px rgba(0,0,0,0.04)", textAlign: "center" }}>
            <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#DCFCE7", color: "#15803D", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 14px" }}>
              <i className="fa-solid fa-check"></i>
            </div>
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              <i className="fa-solid fa-circle-check"></i> PROCTORED TEST SUBMITTED &amp; RECORDED
            </span>
            <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--navy)", margin: "10px 0 6px" }}>
              Thank you for completing the assessment!
            </h2>
            <p style={{ fontSize: 13, color: "#475569", margin: "0 auto", maxWidth: 440, lineHeight: 1.6 }}>
              Your responses have been recorded and submitted to our team for review as part of your candidate verification.
            </p>
          </div>

          <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 10, padding: "14px 18px", display: "flex", alignItems: "center", gap: 12 }}>
            <i className="fa-solid fa-lock" style={{ color: "var(--navy)", fontSize: 16 }}></i>
            <span style={{ fontSize: 13, color: "var(--navy)", fontWeight: 700 }}>
              Single-Attempt Policy Enforced: Test complete &amp; submitted. Retakes are not permitted.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
