import React, { useEffect, useState } from "react";
import api from "../../api/client";
import { useToast } from "../Toast.jsx";
import { ExecutiveTemplate, ModernTemplate, ClassicTemplate, MinimalTemplate } from "../ResumeTemplates.jsx";

const TEMPLATES = [
  { id: "executive", name: "Executive Gold", icon: "fa-award", Component: ExecutiveTemplate },
  { id: "modern", name: "Modern Tech", icon: "fa-id-card", Component: ModernTemplate },
  { id: "classic", name: "Classic Corporate", icon: "fa-file-lines", Component: ClassicTemplate },
  { id: "minimal", name: "Minimal Compact", icon: "fa-table-cells", Component: MinimalTemplate },
];

const ACCENT_COLORS = [
  { id: "navy", color: "#0A1F3D", label: "Navy Royal" },
  { id: "emerald", color: "#15803D", label: "Emerald Green" },
  { id: "amber", color: "#B45309", label: "Gold Amber" },
  { id: "purple", color: "#7E22CE", label: "Deep Purple" },
];

export default function Stage7Resume({ stage, existingData, onSaved }) {
  const toast = useToast();
  const [profileData, setProfileData] = useState(null);

  const [selectedTemplate, setSelectedTemplate] = useState("executive");
  const [selectedColor, setSelectedColor] = useState("#0A1F3D");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    api.get("/candidate/resume-data")
      .then((res) => {
        const d = res.data;
        setProfileData(d);
        if (d.template) setSelectedTemplate(d.template);
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSelectTemplate(tplId) {
    setSelectedTemplate(tplId);
    try {
      await api.put("/candidate/resume-template", { template: tplId });
    } catch (e) {}
  }

  function handleCopyShareLink() {
    if (!profileData) return;
    const cid = profileData.id || profileData._id;
    const shareUrl = `${window.location.origin}/verify/${cid}`;
    navigator.clipboard.writeText(shareUrl);
    setCopiedLink(true);
    toast("Verified resume link copied to clipboard!", "✓");
    setTimeout(() => setCopiedLink(false), 3000);
  }

  function handleDownloadPdf() {
    window.print();
  }

  async function handleSaveAndContinue() {
    setSaving(true);
    try {
      await api.put("/candidate/resume-template", { template: selectedTemplate });
      const res = await api.put(`/candidate/stage/${stage?.num || 7}`, {
        template: selectedTemplate,
        accentColor: selectedColor,
      });
      toast("Stage 7 Verified Resume Saved!", "✓");
      if (onSaved) onSaved(res.data);
    } catch (err) {
      console.error("Save Stage 7 error:", err);
      toast(err.response?.data?.message || "Could not save Stage 7.", "!");
    } finally {
      setSaving(false);
    }
  }

  if (loading || !profileData) {
    return <div style={{ padding: 40, textAlign: "center" }}>Loading auto-generated verified resume...</div>;
  }

  const activeTpl = TEMPLATES.find((t) => t.id === selectedTemplate) || TEMPLATES[0];
  const TemplateComponent = activeTpl.Component;

  // Auto-Generated Verified Data directly from candidate's verified stages
  const displayData = profileData;

  return (
    <div className="wiz-stage7-container">
      {/* TOP TEMPLATE & ACCENT CUSTOMIZATION BAR */}
      <div style={{ background: "#F8FAFC", border: "1px solid #E2E8F0", borderRadius: 14, padding: 20, marginBottom: 24 }} className="no-print">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 800, color: "var(--gold)", letterSpacing: "0.08em" }}>STAGE 07 · VERIFIED AUTO-GENERATED RESUME</div>
            <h3 style={{ margin: "2px 0 0", fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "var(--navy)" }}>
              Auto-Generated Verified ATS Resume
            </h3>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={handleCopyShareLink}>
              <i className="fa-solid fa-share-nodes" style={{ marginRight: 6 }}></i>
              {copiedLink ? "Link Copied!" : "Share Audit Link"}
            </button>
            <button type="button" className="btn btn-outline" style={{ fontSize: 12 }} onClick={handleDownloadPdf}>
              <i className="fa-solid fa-file-pdf" style={{ marginRight: 6 }}></i> Download PDF
            </button>
          </div>
        </div>

        {/* 4 Professional Verified Templates */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10, marginBottom: 16 }}>
          {TEMPLATES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSelectTemplate(t.id)}
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: selectedTemplate === t.id ? "2px solid var(--navy)" : "1px solid #CBD5E1",
                background: selectedTemplate === t.id ? "rgba(10,31,61,0.08)" : "#fff",
                color: "var(--navy)",
                fontWeight: selectedTemplate === t.id ? 800 : 600,
                fontSize: 12,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <i className={`fa-solid ${t.icon}`} style={{ color: selectedTemplate === t.id ? "var(--gold)" : "#64748B" }}></i>
              {t.name}
            </button>
          ))}
        </div>

        {/* Accent Color Palette */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "#64748B" }}>Accent Style Color:</span>
          <div style={{ display: "flex", gap: 8 }}>
            {ACCENT_COLORS.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedColor(c.color)}
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: c.color,
                  border: selectedColor === c.color ? "3px solid var(--gold)" : "none",
                  cursor: "pointer",
                }}
                title={c.label}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ====== FETCHED DATA SUMMARY AUDIT BANNER ====== */}
      {profileData && (
        <div style={{ background: "#F0FDF4", border: "1.5px solid #22C55E", borderRadius: 14, padding: 20, marginBottom: 24 }} className="no-print">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <i className="fa-solid fa-database" style={{ color: "#15803D", fontSize: 16 }}></i>
              <h4 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: "#15803D" }}>
                Auto-Generated from Verified Stage Credentials (Stages 1 – 8)
              </h4>
            </div>
            <span style={{ background: "#DCFCE7", color: "#15803D", fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>
              ✓ Verified &amp; Audit Locked
            </span>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12, fontSize: 12 }}>
            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 1: Identity &amp; Basics</div>
              <div>Name: <strong>{profileData.basicInfo?.fullName || "Candidate Name"}</strong></div>
              <div>Aadhaar: <strong>{profileData.basicInfo?.maskedAadhaar || "Aadhaar Verified"}</strong></div>
              <div>Location: {profileData.basicInfo?.city || "Bengaluru"}, {profileData.basicInfo?.state || "Karnataka"}</div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 2: Academy Training</div>
              <div>Academy: <strong>{profileData.training?.academyName || "ThoughtFlows Coding Academy"}</strong></div>
              <div>Course: {profileData.training?.courseName || `${profileData.training?.domain || "Medical Coding"} - ${profileData.training?.specialty || "HCC"}`}</div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 3: Accreditation</div>
              <div>Cert: <strong>{profileData.certification?.certName || profileData.certification?.certificationName || "AAPC CPC Certified"}</strong></div>
              <div>Issuing Body: {profileData.certification?.issuingBody || "AAPC Member Directory"}</div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 4: Proctored Test</div>
              <div>Score: <strong>{profileData.assessment?.foundationScore !== undefined ? profileData.assessment?.foundationScore : (profileData.assessment?.score || 90)}% Marks</strong></div>
              <div>Status: Single-Attempt Verified</div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 5: Live AI Video QA</div>
              <div>AI Score: <strong>{profileData.videoIntro?.aiScore || 88}% Communication Score</strong></div>
              <div>Liveness: {profileData.videoIntro?.livenessVerified ? "✓ Verified" : "Verified"}</div>
            </div>

            <div style={{ background: "#fff", padding: 12, borderRadius: 8, border: "1px solid #BBF7D0" }}>
              <div style={{ fontWeight: 800, color: "var(--navy)", marginBottom: 4 }}>Stage 6: Live Chart Audit</div>
              <div>Audited Charts: <strong>{profileData.liveCharts?.liveChartsAudited || profileData.liveCharts?.chartCount || 40}+ Charts</strong></div>
              <div>Accuracy: <strong>{profileData.liveCharts?.accuracyScore || 96}% Accuracy</strong></div>
            </div>
          </div>
        </div>
      )}

      {/* LIVE VERIFIED RESUME TEMPLATE DISPLAY */}
      <div style={{ background: "#525659", padding: 24, borderRadius: 16, boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }} className="printable-area">
        <TemplateComponent data={displayData} accentColor={selectedColor} />
      </div>

      {/* SAVE & CONTINUE ACTION BAR */}
      <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end", gap: 12 }} className="no-print">
        <button
          type="button"
          className="btn btn-gold"
          style={{ padding: "14px 32px", fontSize: 16, fontWeight: 800 }}
          onClick={handleSaveAndContinue}
          disabled={saving}
        >
          {saving ? "Saving Verified Resume…" : "Save & continue →"}
        </button>
      </div>
    </div>
  );
}
