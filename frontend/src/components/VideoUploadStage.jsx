import React, { useState } from "react";
import api from "../api/client";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleUpload(e) {
    e.preventDefault();
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("video", file);
      const res = await api.post("/candidate/upload/video", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      onSaved(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="card">
      <h3>Stage {stage.id}: {stage.title}</h3>
      <p style={{ color: "var(--text-muted)", marginTop: -8 }}>{stage.subtitle}</p>

      {existingData?.videoUrl && (
        <div style={{ marginBottom: 16 }}>
          <video src={existingData.videoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
          <div className="badge-progress" style={{ marginTop: 8 }}>Uploaded</div>
        </div>
      )}

      <form onSubmit={handleUpload}>
        <div className="field">
          <label>Upload a short introduction video (max 10MB)</label>
          <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
        </div>
        {error && <div className="error-text">{error}</div>}
        <button type="submit" className="btn btn-gold" disabled={!file || uploading}>
          {uploading ? "Uploading…" : "Upload & Continue"}
        </button>
      </form>
    </div>
  );
}
