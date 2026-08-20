import React, { useState } from "react";
import api from "../api/client";
import AiVideoAssessment from "./AiVideoAssessment.jsx";

export default function VideoUploadStage({ stage, existingData, onSaved }) {
  const [activeTab, setActiveTab] = useState("ai"); // "ai" | "manual"
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  async function handleManualUpload(e) {
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
    <div className="wiz-stage-container">
      {/* Mode Switcher Tabs */}
      <div style={{ display: "flex", gap: 10, marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => setActiveTab("ai")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: activeTab === "ai" ? "2px solid var(--navy)" : "1px solid #CBD5E1",
            background: activeTab === "ai" ? "var(--navy)" : "#fff",
            color: activeTab === "ai" ? "#fff" : "var(--navy)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-robot" style={{ color: activeTab === "ai" ? "var(--gold)" : "#64748B" }}></i>
          Live AI Video &amp; Verbal Assessment (Recommended)
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("manual")}
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: 8,
            border: activeTab === "manual" ? "2px solid var(--navy)" : "1px solid #CBD5E1",
            background: activeTab === "manual" ? "var(--navy)" : "#fff",
            color: activeTab === "manual" ? "#fff" : "var(--navy)",
            fontWeight: 800,
            fontSize: 13,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <i className="fa-solid fa-cloud-arrow-up" style={{ color: activeTab === "manual" ? "var(--gold)" : "#64748B" }}></i>
          Upload Pre-recorded Video File
        </button>
      </div>

      {activeTab === "ai" ? (
        <AiVideoAssessment existingData={existingData} onSaved={onSaved} />
      ) : (
        <div className="card" style={{ padding: 24, borderRadius: 16 }}>
          <h3 style={{ margin: "0 0 8px", color: "var(--navy)" }}>Upload Introduction Video File</h3>
          <p style={{ color: "var(--text-muted)", fontSize: 13, marginBottom: 16 }}>
            Upload a short 1-minute video introducing yourself and your RCM / Medical Coding experience.
          </p>

          {existingData?.videoUrl && (
            <div style={{ marginBottom: 16 }}>
              <video src={existingData.videoUrl} controls style={{ width: "100%", borderRadius: 8 }} />
              <div className="badge-progress" style={{ marginTop: 8 }}>Uploaded</div>
            </div>
          )}

          <form onSubmit={handleManualUpload}>
            <div className="field" style={{ marginBottom: 16 }}>
              <label>Select Video File (.mp4, .webm, .mov)</label>
              <input type="file" accept="video/*" onChange={(e) => setFile(e.target.files[0])} />
            </div>
            {error && <div className="error-text" style={{ marginBottom: 12 }}>{error}</div>}
            <button type="submit" className="btn btn-gold" disabled={!file || uploading}>
              {uploading ? "Uploading…" : "Upload Video & Continue →"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
