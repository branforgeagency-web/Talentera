import React, { useRef, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";

const OPTIONS = [
  {
    id: "practicode",
    title: "Link your Practicode account",
    sub: "We pull chart count, accuracy %, specialty mix automatically. Read-only — we never write to your account.",
    pts: 10,
  },
  {
    id: "upload",
    title: "Upload academy live-chart log",
    sub: "PDF / Excel from your academy showing charts you've coded during training.",
    pts: 7,
  },
  {
    id: "declare",
    title: "Declare for later",
    sub: "Mark as in-progress. Complete from your dashboard; companies see partial credit.",
    pts: 3,
  },
];

export default function Stage6LiveCharts({ stage, existingData, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [option, setOption] = useState(existingData?.option || "practicode");
  const [practicodeId, setPracticodeId] = useState(existingData?.practicodeId || "");
  const [docName, setDocName] = useState(existingData?.docName || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleFileSelected(e) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.append("doc", file);
      await api.post(`/candidate/upload/doc/${stage.num}`, form, { headers: { "Content-Type": "multipart/form-data" } });
      setDocName(file.name);
      toast(`✓ ${file.name} uploaded`, "✓");
    } catch (err) {
      toast(err.response?.data?.message || "Upload failed.", "!");
    } finally {
      setUploading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");

    if (option === "practicode" && (!practicodeId || practicodeId.trim().length < 2)) {
      setError("Please enter your Practicode Account ID or Email.");
      toast("Practicode ID / Email is required.", "!");
      return;
    }
    if (option === "upload" && !docName) {
      setError("Please upload your academy live-chart log document.");
      toast("Academy live-chart log is required.", "!");
      return;
    }

    setSaving(true);
    try {
      const res = await api.put(`/candidate/stage/${stage.num}`, { option, practicodeId: practicodeId.trim(), docName });
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
        {OPTIONS.map((o) => (
          <button
            type="button"
            key={o.id}
            className={`wiz-option ${option === o.id ? "active" : ""}`}
            onClick={() => setOption(o.id)}
          >
            <div className="wiz-option-radio">{option === o.id ? "●" : "○"}</div>
            <div className="wiz-option-body">
              <div className="wiz-option-title">{o.title}</div>
              <div className="wiz-option-sub">{o.sub}</div>
            </div>
            <div className="wiz-option-pts">+{o.pts} pts</div>
          </button>
        ))}
      </div>

      {option === "practicode" && (
        <div className="wiz-field">
          <label>Practicode account ID / email</label>
          <input type="text" value={practicodeId} onChange={(e) => setPracticodeId(e.target.value)} placeholder="you@example.com" />
        </div>
      )}

      {option === "upload" && (
        <div className="wiz-field">
          <label>Academy live-chart log (PDF / Excel)</label>
          <button type="button" className="btn btn-outline" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading…" : docName ? `✓ ${docName}` : "Choose file"}
          </button>
          <input ref={fileRef} type="file" accept=".pdf,.xls,.xlsx" style={{ display: "none" }} onChange={handleFileSelected} />
        </div>
      )}

      {error && <div className="error-text">{error}</div>}

      <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
        <button type="submit" className="btn btn-gold" disabled={saving}>{saving ? "Saving…" : "Save & continue →"}</button>
      </div>
    </form>
  );
}
