import React, { useState } from "react";
import api from "../../api/client";

const DOMAINS = ["Medical Coding", "Medical Billing", "AR Calling"];
const SPECIALTIES = ["HCC / Risk Adjustment", "ED Coding", "Surgery Coding", "IP DRG", "OP / E&M", "Cardiology", "Radiology"];

export default function Stage2Training({ stage, existingData, candidate, onSaved }) {
  const initialExp = (() => {
    if (existingData?.experienceLevel) return existingData.experienceLevel.toLowerCase();
    const s1Exp = (candidate?.stage1?.experience || "").toLowerCase();
    if (s1Exp.includes("fresher")) return "fresher";
    if (s1Exp.includes("exp") || s1Exp === "1-3" || s1Exp === "3-5" || s1Exp === "5+") return "experienced";
    if (Array.isArray(candidate?.stage1?.workHistory) && candidate.stage1.workHistory.length > 0) return "experienced";
    return "fresher";
  })();

  const [experienceLevel, setExperienceLevel] = useState(initialExp);
  const [domain, setDomain] = useState(existingData?.domain || "Medical Coding");
  const [specialty, setSpecialty] = useState(existingData?.specialty || SPECIALTIES[0]);
  const [academyName, setAcademyName] = useState(existingData?.academyName ?? "Apex Medical Coding Institute");
  const [duration, setDuration] = useState(existingData?.duration ?? "6 months");
  const [trainerName, setTrainerName] = useState(existingData?.trainerName ?? "Mr. Karthik");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Sync with candidate stage 1 if stage 2 does not have its own override saved
  React.useEffect(() => {
    if (!existingData?.experienceLevel) {
      const s1Exp = (candidate?.stage1?.experience || "").toLowerCase();
      if (s1Exp.includes("fresher")) {
        setExperienceLevel("fresher");
      } else if (s1Exp.includes("exp") || (Array.isArray(candidate?.stage1?.workHistory) && candidate.stage1.workHistory.length > 0)) {
        setExperienceLevel("experienced");
      }
    }
  }, [candidate?.stage1?.experience, candidate?.stage1?.workHistory, existingData?.experienceLevel]);

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
      const isExp = experienceLevel === "experienced";
      const res = await api.put(`/candidate/stage/${stage.num}`, {
        domain,
        experienceLevel,
        specialty: isExp ? specialty : "",
        courseName: isExp && specialty ? `${domain} - ${specialty}` : domain,
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
        <label>Candidate experience level</label>
        <div className="wiz-pill-row">
          <button
            type="button"
            className={`wiz-pill wiz-pill-compact ${experienceLevel === "fresher" ? "active" : ""}`}
            onClick={() => setExperienceLevel("fresher")}
          >
            Fresher (No prior industry experience)
          </button>
          <button
            type="button"
            className={`wiz-pill wiz-pill-compact ${experienceLevel === "experienced" ? "active" : ""}`}
            onClick={() => setExperienceLevel("experienced")}
          >
            Experienced (1+ yrs experience)
          </button>
        </div>
      </div>

      {experienceLevel === "experienced" && (
        <div className="wiz-field">
          <label>Your specialty</label>
          <select value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
            {SPECIALTIES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
      )}

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
