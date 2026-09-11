import React, { useEffect, useState } from "react";
import api from "../../api/client";

export default function Stage4Assessment({ stage, existingData, onSaved }) {
  const [profileData, setProfileData] = useState(existingData || null);
  const [loading, setLoading] = useState(false);
  const [retakeRequest, setRetakeRequest] = useState(null);
  const [showRetakeModal, setShowRetakeModal] = useState(false);
  const [retakeReason, setRetakeReason] = useState("");
  const [submittingRetake, setSubmittingRetake] = useState(false);
  const [retakeError, setRetakeError] = useState("");
  const [retakeSuccessMsg, setRetakeSuccessMsg] = useState("");

  const loadProfile = () => {
    api
      .get("/candidate/me")
      .then((res) => {
        if (res.data.candidate?.stage4) {
          setProfileData(res.data.candidate.stage4);
        } else {
          setProfileData(null);
        }
        if (res.data.candidate?.completedStages?.includes(4) && onSaved) {
          onSaved(res.data, { advance: false });
        }
      })
      .catch(() => {});

    // Fetch active retake request status
    api
      .get("/candidate/retake-request?stage=4")
      .then((res) => {
        if (res.data?.request) {
          setRetakeRequest(res.data.request);
        } else {
          setRetakeRequest(null);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadProfile();
    const handleFocus = () => loadProfile();
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  const isCompleted = profileData?.foundationScore !== undefined;
  const scorePercent = profileData?.foundationScore || 0;

  function handleTakeTest() {
    window.open("/assessment/run", "_blank");
  }

  function handleContinue() {
    if (onSaved) {
      onSaved(profileData, { advance: true, nextStage: 5 });
    }
  }

  async function handleSubmitRetakeRequest(e) {
    e.preventDefault();
    if (!retakeReason.trim()) {
      setRetakeError("Please provide a reason for requesting a retake.");
      return;
    }
    setSubmittingRetake(true);
    setRetakeError("");

    try {
      const res = await api.post("/candidate/retake-request", {
        reason: retakeReason.trim(),
        stage: 4,
        assessmentType: "Talentera AAPC / RCM Assessment (Stage 4)",
      });

      if (res.data?.request) {
        setRetakeRequest(res.data.request);
        setRetakeSuccessMsg("Your retake request has been submitted to Talentera employees!");
        setShowRetakeModal(false);
        setRetakeReason("");
      }
    } catch (err) {
      setRetakeError(err.response?.data?.message || "Failed to submit retake request. Please try again.");
    } finally {
      setSubmittingRetake(false);
    }
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
        /* ALREADY COMPLETED - Score Display & Retake Request Options */
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

            <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", margin: "8px 0 6px" }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: "#64748B", letterSpacing: 0.5 }}>YOUR SCORE</div>
              <div style={{ fontSize: 40, fontWeight: 800, color: "var(--navy)" }}>{scorePercent}%</div>
              {typeof profileData?.correctCount === "number" && typeof profileData?.totalQuestions === "number" && (
                <div style={{ fontSize: 12, color: "#64748B" }}>{profileData.correctCount} of {profileData.totalQuestions} correct</div>
              )}
            </div>

            <p style={{ fontSize: 13, color: "#475569", margin: "0 auto", maxWidth: 440, lineHeight: 1.6 }}>
              Scored automatically and final the moment you submitted. Employers and academies view this verified score.
            </p>
          </div>

          {/* RETAKE REQUEST STATUS PANELS */}
          {retakeSuccessMsg && (
            <div style={{ background: "#F0FDF4", border: "1px solid #86EFAC", color: "#15803D", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 700, marginBottom: 16 }}>
              <i className="fa-solid fa-circle-check" style={{ marginRight: 6 }}></i>
              {retakeSuccessMsg}
            </div>
          )}

          {retakeRequest?.status === "PENDING" && (
            <div style={{ background: "#FEF3C7", border: "1.5px solid #F59E0B", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#B45309", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                <i className="fa-solid fa-hourglass-half"></i>
                <span>Assessment Retake Request Pending Review</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#78350F", margin: "0 0 8px", lineHeight: 1.5 }}>
                Your request has been submitted to Talentera employees. A Talentera employee will review your reason and process your request. You will receive an email notification with the retake link once approved.
              </p>
              <div style={{ background: "#FFFFFF", border: "1px solid #FDE68A", borderRadius: 8, padding: "8px 12px", fontSize: 12, color: "#92400E", fontStyle: "italic" }}>
                <strong>Submitted Reason:</strong> "{retakeRequest.reason}"
              </div>
            </div>
          )}

          {retakeRequest?.status === "REJECTED" && (
            <div style={{ background: "#FEF2F2", border: "1.5px solid #EF4444", borderRadius: 12, padding: "16px 20px", marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#991B1B", fontWeight: 800, fontSize: 13, marginBottom: 6 }}>
                <i className="fa-solid fa-circle-xmark"></i>
                <span>Retake Request Declined by Reviewer</span>
              </div>
              <p style={{ fontSize: 12.5, color: "#7F1D1D", margin: "0 0 8px", lineHeight: 1.5 }}>
                <strong>Employee Review Note:</strong> {retakeRequest.reviewNotes || "Request was not approved at this time."}
              </p>
              <button
                type="button"
                onClick={() => setShowRetakeModal(true)}
                style={{
                  background: "#DC2626",
                  color: "#FFFFFF",
                  border: "none",
                  padding: "6px 14px",
                  borderRadius: 6,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Submit New Request with Additional Reason
              </button>
            </div>
          )}

          {/* RETAKE ACTION BAR */}
          <div style={{ background: "#F1F5F9", border: "1px solid #CBD5E1", borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <i className="fa-solid fa-shield-halved" style={{ color: "var(--navy)", fontSize: 18 }}></i>
              <div>
                <div style={{ fontSize: 13, color: "var(--navy)", fontWeight: 800 }}>
                  Need to Retake This Assessment?
                </div>
                <div style={{ fontSize: 11.5, color: "#64748B" }}>
                  Submit a retake request with your reason for review by Talentera employees.
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              {(!retakeRequest || retakeRequest.status !== "PENDING") && (
                <button
                  type="button"
                  onClick={() => {
                    setRetakeError("");
                    setShowRetakeModal(true);
                  }}
                  style={{
                    background: "var(--navy)",
                    color: "#FFFFFF",
                    border: "none",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontWeight: 800,
                    fontSize: 12.5,
                    cursor: "pointer",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  <i className="fa-solid fa-paper-plane" style={{ color: "var(--gold)" }}></i>
                  <span>Request Retake</span>
                </button>
              )}
            </div>
          </div>

          <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
            <button
              type="button"
              className="btn btn-gold"
              onClick={handleContinue}
              style={{ padding: "14px 28px", fontSize: 14.5, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 8 }}
            >
              Continue to Stage 05 (Communication &amp; Video) →
            </button>
          </div>
        </div>
      )}

      {/* MODAL: INPUT REASON FOR RETAKE */}
      {showRetakeModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(10, 31, 61, 0.75)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: 16,
              maxWidth: 520,
              width: "100%",
              padding: 28,
              boxShadow: "0 20px 50px rgba(0,0,0,0.3)",
              border: "2px solid var(--navy)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <div>
                <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>
                  STAGE 04 · RETAKE REQUEST
                </span>
                <h3 style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
                  Request Assessment Retake
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRetakeModal(false)}
                style={{ background: "transparent", border: "none", fontSize: 18, color: "#64748B", cursor: "pointer" }}
              >
                ✕
              </button>
            </div>

            <p style={{ fontSize: 12.5, color: "#475569", lineHeight: 1.5, margin: "0 0 16px" }}>
              Please describe the reason for your retake request (e.g. power disruption, network glitch, emergency interruption). Your logged-in email and assessment record will be submitted to Talentera employees for review.
            </p>

            <form onSubmit={handleSubmitRetakeRequest}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: 12, fontWeight: 800, color: "var(--navy)", marginBottom: 6 }}>
                  Reason for Retake Request *
                </label>
                <textarea
                  rows={4}
                  value={retakeReason}
                  onChange={(e) => setRetakeReason(e.target.value)}
                  placeholder="E.g. Experienced sudden power/Wi-Fi disconnection during question 4, causing the anti-cheat timer to auto-submit prematurely."
                  style={{
                    width: "100%",
                    padding: "10px 14px",
                    borderRadius: 8,
                    border: "1.5px solid #CBD5E1",
                    fontSize: 13,
                    fontFamily: "inherit",
                    resize: "vertical",
                    boxSizing: "border-box",
                  }}
                  required
                />
              </div>

              {retakeError && (
                <div style={{ color: "#DC2626", fontSize: 12, fontWeight: 700, marginBottom: 14 }}>
                  <i className="fa-solid fa-circle-exclamation" style={{ marginRight: 6 }}></i>
                  {retakeError}
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setShowRetakeModal(false)}
                  style={{
                    background: "#F1F5F9",
                    color: "#475569",
                    border: "1px solid #CBD5E1",
                    padding: "10px 18px",
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingRetake || !retakeReason.trim()}
                  className="btn btn-navy"
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    fontWeight: 800,
                    opacity: submittingRetake || !retakeReason.trim() ? 0.6 : 1,
                  }}
                >
                  {submittingRetake ? "Submitting Request…" : "Submit Request →"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

