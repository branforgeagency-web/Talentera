import React, { useState } from "react";
import api from "../../api/client";

const DOMAINS = ["Medical Coding", "Medical Billing", "AR Calling"];
const SPECIALTIES = ["HCC / Risk Adjustment", "ED Coding", "Surgery Coding", "IP DRG", "OP / E&M", "Cardiology", "Radiology"];

export default function Stage2Training({ stage, existingData, onSaved }) {
  const [domain, setDomain] = useState(existingData?.domain || "Medical Coding");
  const [specialty, setSpecialty] = useState(existingData?.specialty || SPECIALTIES[0]);
  const [academyName, setAcademyName] = useState(existingData?.academyName ?? "ThoughtFlows Medical Coding Academy");
  const [duration, setDuration] = useState(existingData?.duration ?? "6 months");
  const [trainerName, setTrainerName] = useState(existingData?.trainerName ?? "Mr. Karthik");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    if (!academyName || academyName.trim().length < 2) {
      setError("Please enter the Academy / Training Institute name.");
      return;
    }
    if (!duration || duration.trim().length < 1) {
      setError("Please enter the training duration.");
      return;
    }
    if (!trainerName || trainerName.trim().length < 2) {
      setError("Please enter the Trainer / Mentor name.");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        domain,
        specialty,
        courseName: `${domain} - ${specialty}`,
        academyName: academyName.trim(),
        duration: duration.trim(),
        trainerName: trainerName.trim(),
      });
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/candidate/stage/${stage.num}/skip`);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not skip this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="wiz-form" onSubmit={handleSubmit}>
      <div className="wiz-field">
        <label>Your domain · what you trained for</label>
        <div className="wiz-pill-row">
          {DOMAINS.map((d) => (
            <button key={d} type="button" className={`wiz-pill wiz-pill-compact ${domain === d ? "active" : ""}`} onClick={() => setDomain(d)}>
              {d}
            </button>
          ))}
        </div>
      </div>

      <div className="wiz-field">
        <label>Your specialty</label>
        <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
          {SPECIALTIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="wiz-field">
        <label>Academy where you trained</label>
        <input type="text" value={academyName} onChange={(e) => setAcademyName(e.target.value)} />
      </div>

      <div className="wiz-field-row">
        <div className="wiz-field">
          <label>Duration</label>
          <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} />
        </div>
        <div className="wiz-field">
          <label>Trainer name</label>
          <input type="text" value={trainerName} onChange={(e) => setTrainerName(e.target.value)} />
        </div>
      </div>

      <div className="wiz-result-card">
        <span className="wiz-result-check">✓</span>
        <div>
          <div className="wiz-result-title">Academy verified · {academyName.split(" ")[0]} confirmed your enrollment</div>
          <div className="wiz-result-sub">Trainer {trainerName} confirmed completion. Verified-by-academy badge attached to your profile.</div>
        </div>
      </div>

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save & continue →"}</button>
        {stage.skippable && (
          <button type="button" className="btn btn-ghost" onClick={handleSkip} disabled={saving}>Skip this stage</button>
        )}
      </div>
    </form>
  );
}
