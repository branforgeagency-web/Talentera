import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import ClaudeMockInterviewBot from "../ClaudeMockInterviewBot.jsx";

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);
  // Only true score data goes here - no fabricated default. mockScore stays
  // null/mockCompleted stays false unless the candidate actually finishes a
  // live session with ClaudeMockInterviewBot (see onCompleted below), so we
  // never submit a made-up "92%" for someone who never opened the bot.
  const [mockScore, setMockScore] = useState(typeof existingData?.mockScore === "number" ? existingData.mockScore : null);
  const [mockCompleted, setMockCompleted] = useState(Boolean(existingData?.mockInterviewCompleted));
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
        // The mock interview is an optional practice tool, not a
        // requirement to finish this stage - only send real results if the
        // candidate actually completed a session.
        mockScore: mockCompleted ? mockScore : null,
        mockInterviewCompleted: mockCompleted,
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
              Required for the Verified Pool. From your first Talentera-routed interview onward, companies will see
              anonymized summaries only — never company names or feedback. Data deletion on request.
            </div>
          </div>
          <div className="wiz-option-pts">+{stage.pts} pts</div>
        </button>
      </div>

      {/* ====== LIVE AI MOCK INTERVIEWER (MESSI) SECTION ======
          This is an optional practice tool, not a requirement to complete
          this stage - the submit button below only checks `consent`, so
          mockScore/mockCompleted stay whatever they actually are (including
          untouched) rather than being forced to look "done". */}
      <div style={{ marginTop: 24, marginBottom: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <span style={{ background: "var(--gold)", color: "var(--navy)", fontSize: 10, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
            POWERED BY CLAUDE AI · OPTIONAL PRACTICE
          </span>
          <h3 style={{ margin: "4px 0 0", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
            Live AI Technical Mock Interviewer Bot
          </h3>
          <p style={{ fontSize: 12, color: "#64748B", margin: 0 }}>
            Practice a realistic live voice interview with Messi, our AI interviewer, to rehearse your medical coding &amp; RCM technical
            interview readiness before the real thing. This is for your own preparation - it&rsquo;s not required to finish this stage and
            isn&rsquo;t shown to companies.
          </p>
        </div>

        <ClaudeMockInterviewBot
          candidateData={existingData}
          onCompleted={(data) => {
            if (typeof data.score === "number") {
              setMockScore(data.score);
              setMockCompleted(true);
            }
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
