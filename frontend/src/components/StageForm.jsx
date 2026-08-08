import React, { useState } from "react";
import api from "../api/client";

export default function StageForm({ stage, existingData, onSaved }) {
  const isSkipped = existingData?.skipped === true;
  const [values, setValues] = useState(() => {
    const initial = {};
    stage.fields.forEach((f) => (initial[f.name] = existingData?.[f.name] ?? ""));
    return initial;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function handleChange(name, value) {
    setValues((v) => ({ ...v, [name]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.id}`, values);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save this stage. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSkip() {
    setSaving(true);
    setError("");
    try {
      const res = await api.post(`/candidate/stage/${stage.id}/skip`);
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Could not skip this stage.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h3>Stage {stage.id}: {stage.title}</h3>
          <p style={{ color: "var(--text-muted)", marginTop: -8 }}>{stage.subtitle}</p>
        </div>
        {isSkipped && <span className="badge-progress">Skipped</span>}
      </div>

      {stage.note && (
        <div style={{ background: "rgba(229,168,46,0.1)", padding: "10px 14px", borderRadius: 8, fontSize: "0.85rem", marginBottom: 16 }}>
          {stage.note}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {stage.fields.map((f) => (
          <div className="field" key={f.name}>
            <label>{f.label}{f.required && " *"}</label>
            {f.type === "select" ? (
              <select value={values[f.name]} onChange={(e) => handleChange(f.name, e.target.value)} required={f.required}>
                <option value="">Select…</option>
                {f.options.map((opt) => (
                  <option key={opt} value={opt}>{opt}</option>
                ))}
              </select>
            ) : f.type === "textarea" ? (
              <textarea rows={3} value={values[f.name]} onChange={(e) => handleChange(f.name, e.target.value)} required={f.required} />
            ) : (
              <input
                type={f.type}
                value={values[f.name]}
                onChange={(e) => handleChange(f.name, e.target.value)}
                required={f.required}
              />
            )}
          </div>
        ))}

        {error && <div className="error-text">{error}</div>}

        <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
          <button type="submit" className="btn btn-gold" disabled={saving}>
            {saving ? "Saving…" : "Save & Continue"}
          </button>
          {stage.skippable && (
            <button type="button" className="btn btn-ghost" onClick={handleSkip} disabled={saving}>
              Skip this stage
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
