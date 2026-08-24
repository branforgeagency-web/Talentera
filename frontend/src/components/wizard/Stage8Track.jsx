import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import ClaudeMockInterviewBot from "../ClaudeMockInterviewBot.jsx";

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);
  const [mockScore, setMockScore] = useState(existingData?.mockScore || 92);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!consent) {
      setError("You must consent to interview-track auto-capture before submitting Stage 8.");
      toast("Consent is required to submit Stage 8.", "!");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        consent,
        mockScore,
        mockInterviewCompleted: true,
      });
      toast("Stage 8 submitted & verification complete!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      <div className="wiz-option-list">
        <button type="button" className={`wiz-option ${consent ? "active" : ""}`} onClick={() => setConsent(true)}>
          <div className="wiz-option-radio">{consent ? "●" : "○"}</div>
          <div className="wiz-option-body">
            <div className="wiz-option-title">I consent to interview-track auto-capture</div>
            <div className="wiz-option-sub">
              Required for the Verified Pool. Companies see anonymized summaries only — never company names or
              feedback. Data deletion on request.
            </div>
          </div>
          <div className="wiz-option-pts">+{stage.pts} pts</div>
        </button>
      </div>

      {/* ====== LIVE CLAUDE AI MOCK INTERVIEW BOT SECTION ====== */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
            POWERED BY CLAUDE 3.5 SONNET API
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
            Live AI Technical Mock Interviewer Bot
          </h3>
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
            Interact live with Claude AI to test your medical coding &amp; RCM technical interview readiness.
          </p>
        </div>

        <ClaudeMockInterviewBot
          candidateData={existingData}
          onCompleted={(data) => {
            if (data.score) setMockScore(data.score);
          }}
        />
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" style={{ padding: "14px 28px", fontSize: 15 }} disabled={saving || !consent}>
          {saving ? "Submitting…" : "Submit for Verification →"}
        </button>
      </div>
    </form>
  );
}
