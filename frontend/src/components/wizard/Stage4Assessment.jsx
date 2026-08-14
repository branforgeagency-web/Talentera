import React, { useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

/**
 * Static/mock, matching the prototype exactly: there is no real proctored
 * test engine yet (flagged as a roadmap item in both the prototype and the
 * original handoff doc). "Start Test" is a stub. Saving this stage records
 * the same mock scores the prototype always shows.
 */
export default function Stage4Assessment({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const completed = !!existingData?.foundationScore;

  function handleStartTest(which) {
    toast(`${which} test engine coming soon — this is a roadmap item.`, "ℹ");
  }

  async function handleSubmit() {
    setError("");
    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        foundationScore: 78,
        specialtyScore: 82,
        icdScore: 85,
        cptScore: 70,
        rafScore: 88,
      });
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="wiz-form">
      <div className="wiz-action-card">
        <div className="wiz-action-title">Foundation Test · 15 Qs · 20 min</div>
        <div className="wiz-action-sub">ICD-10-CM rules, CPT basics, modifiers, sequencing. Proctored, browser-locked.</div>
        <button type="button" className="btn btn-outline" onClick={() => handleStartTest("Foundation")}>Start Test</button>
      </div>

      <div className="wiz-action-card">
        <div className="wiz-action-title">Specialty Test · 10 Qs · 25 min</div>
        <div className="wiz-action-sub">HCC RAF math, MEAT documentation, scenario coding. Per-topic scores stored.</div>
        <button type="button" className="btn btn-outline" onClick={() => handleStartTest("Specialty")}>Start Test</button>
      </div>

      <div className="wiz-result-card">
        <span className="wiz-result-check">✓</span>
        <div>
          <div className="wiz-result-title">Both tests complete · Foundation 78% · Specialty 82%</div>
          <div className="wiz-result-sub">Per-topic: ICD 85 / CPT 70 / RAF 88. One CPT gap will surface in your Learn Hub.</div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="button" className="btn btn-gold" onClick={handleSubmit} disabled={saving}>
          {saving ? "Saving…" : completed ? "Continue →" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}
