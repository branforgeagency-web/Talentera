import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

export default function Stage8Track({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [consent, setConsent] = useState(existingData?.consent ?? true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, { consent });
      onSaved(res.data);
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

      <div className="wiz-action-card">
        <div className="wiz-action-title">Optional: schedule your first Talentera Mock Interview</div>
        <div className="wiz-action-sub">Free, AI-driven, specialty-tuned. Gets the first interview on your track and boosts your readiness signal.</div>
        <button type="button" className="btn btn-outline" onClick={() => toast("Mock interview scheduling coming soon.", "ℹ")}>
          Pick a slot
        </button>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving || !consent}>
          {saving ? "Saving…" : "Submit for verification →"}
        </button>
      </div>
    </form>
  );
}
