import React, { useState, useEffect, useRef } from "react";
import api from "../api/client";
import { useToast } from "./Toast.jsx";

const DOC_TYPES = [
  { id: "AAPC / Professional Certification", label: "AAPC / Professional Certification", icon: "🎓" },
  { id: "Degree Certificate / Diploma", label: "Degree Certificate / Diploma", icon: "📜" },
  { id: "Academic Marksheet / Transcript", label: "Academic Marksheet / Transcript", icon: "📊" },
  { id: "Training Institute Completion Certificate", label: "Training Institute Certificate", icon: "🏫" },
  { id: "Government ID Proof", label: "Government ID Proof", icon: "🪪" },
  { id: "Experience / Relieving Letter", label: "Experience / Relieving Letter", icon: "💼" },
  { id: "Other Credential", label: "Other Professional Credential", icon: "📁" },
];

const MONTH_OPTIONS = [
  { val: "01", label: "01 · Jan" },
  { val: "02", label: "02 · Feb" },
  { val: "03", label: "03 · Mar" },
  { val: "04", label: "04 · Apr" },
  { val: "05", label: "05 · May" },
  { val: "06", label: "06 · Jun" },
  { val: "07", label: "07 · Jul" },
  { val: "08", label: "08 · Aug" },
  { val: "09", label: "09 · Sep" },
  { val: "10", label: "10 · Oct" },
  { val: "11", label: "11 · Nov" },
  { val: "12", label: "12 · Dec" },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 30 }, (_, i) => String(CURRENT_YEAR - i));

export default function DocumentVaultModal({
  isOpen,
  onClose,
  candidate,
  onVaultUpdated,
  readOnly = false,
}) {
  const toast = useToast();
  const fileInputRef = useRef(null);

  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Upload Form State
  const [selectedFile, setSelectedFile] = useState(null);
  const [docTitle, setDocTitle] = useState("");
  const [docType, setDocType] = useState(DOC_TYPES[0].id);
  const [issueMonth, setIssueMonth] = useState("");
  const [issueYear, setIssueYear] = useState("");
  const [filterType, setFilterType] = useState("all");

  // Extract and merge stage3 certificates with vault items
  const mergeCertsWithVault = (vaultList = []) => {
    const list = Array.isArray(vaultList) ? [...vaultList] : [];
    const s3Certs = Array.isArray(candidate?.stage3?.certifications) && candidate.stage3.certifications.length > 0
      ? candidate.stage3.certifications
      : (candidate?.stage3?.certCode && candidate?.stage3?.memberId ? [candidate.stage3] : []);

    s3Certs.forEach((cert, idx) => {
      const cCode = cert.code || cert.certCode || "CPC";
      const cName = cert.name || cert.certName || "Certified Professional Coder";
      const cBody = cert.body || cert.issuingBody || "AAPC";
      const cMemberId = cert.memberId || "";
      const certDocId = `cert_${cCode.toLowerCase()}_${cMemberId || idx}`;

      const alreadyExists = list.some((d) =>
        d.id === certDocId ||
        (d.code === cCode && (cMemberId ? d.memberId === cMemberId : true)) ||
        (d.title && d.title.includes(cCode) && (cMemberId ? d.title.includes(cMemberId) : true))
      );

      if (!alreadyExists) {
        list.push({
          id: certDocId,
          title: `${cBody.toUpperCase()} ${cCode} — ${cName}${cMemberId ? ` (ID: ${cMemberId})` : ""}`,
          docType: "AAPC / Professional Certification",
          docUrl: cert.docUrl || candidate?.stage3?.docUrl || null,
          certUrl: cert.certUrl || candidate?.stage3?.certUrl || null,
          docName: cert.docName || candidate?.stage3?.docName || `${cCode}_Certificate.pdf`,
          memberId: cMemberId,
          code: cCode,
          body: cBody,
          issueDate: cert.issueDate || cert.issueYear || "",
          expiryDate: cert.expiryDate || cert.expiryYear || "",
          status: candidate?.stage3?.certStatus === "verified" ? "verified" : (cert.status || "API-Verified"),
          verified: true,
          isRegisteredCert: true,
        });
      }
    });

    return list;
  };

  // Load vault documents
  const fetchVault = async () => {
    try {
      setLoading(true);
      const res = await api.get("/candidate/vault");
      if (res.data?.documentVault) {
        setDocuments(mergeCertsWithVault(res.data.documentVault));
      } else if (Array.isArray(candidate?.documentVault)) {
        setDocuments(mergeCertsWithVault(candidate.documentVault));
      } else {
        setDocuments(mergeCertsWithVault([]));
      }
    } catch (err) {
      console.warn("Could not fetch vault directly, fallback to candidate object:", err);
      if (Array.isArray(candidate?.documentVault)) {
        setDocuments(mergeCertsWithVault(candidate.documentVault));
      } else {
        setDocuments(mergeCertsWithVault([]));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchVault();
    }
  }, [isOpen, candidate]);

  if (!isOpen) return null;

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast("File size exceeds 10MB limit.", "!");
        return;
      }
      setSelectedFile(file);
      if (!docTitle) {
        setDocTitle(file.name.replace(/\.[^/.]+$/, ""));
      }
    }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      toast("Please select a file to upload.", "!");
      return;
    }
    if (!docTitle.trim()) {
      toast("Please enter a document title.", "!");
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("doc", selectedFile);
      formData.append("title", docTitle.trim());
      formData.append("docType", docType);
      formData.append("issueDate", issueYear ? (issueMonth ? `${issueMonth}/${issueYear}` : issueYear) : "");

      const res = await api.post("/candidate/upload/vault-doc", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast("✓ Document uploaded to vault successfully!", "✓");
      setSelectedFile(null);
      setDocTitle("");
      if (fileInputRef.current) fileInputRef.current.value = "";

      if (res.data?.documentVault) {
        setDocuments(res.data.documentVault);
      } else {
        await fetchVault();
      }

      if (onVaultUpdated) {
        onVaultUpdated(res.data);
      }
    } catch (err) {
      console.error("Vault upload error:", err);
      toast(err.response?.data?.message || "Failed to upload document to vault.", "!");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId) => {
    if (!window.confirm("Are you sure you want to remove this document from your vault?")) return;
    try {
      const res = await api.delete(`/candidate/vault/document/${docId}`);
      toast("Document removed from vault.", "✓");
      if (res.data?.documentVault) {
        setDocuments(res.data.documentVault);
      } else {
        setDocuments((prev) => prev.filter((d) => d.id !== docId && d._id !== docId));
      }
      if (onVaultUpdated) onVaultUpdated(res.data);
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to delete document.", "!");
    }
  };

  const filteredDocs = filterType === "all"
    ? documents
    : documents.filter((d) => d.docType === filterType);

  const formatFileSize = (bytes) => {
    if (!bytes) return "—";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="doc-vault-overlay" onClick={onClose}>
      <div className="doc-vault-modal" onClick={(e) => e.stopPropagation()}>
        <style>{`
          .doc-vault-overlay {
            position: fixed;
            inset: 0;
            background: rgba(10, 25, 47, 0.7);
            backdrop-filter: blur(6px);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
            animation: fadeInVault 0.2s ease-out;
          }
          @keyframes fadeInVault {
            from { opacity: 0; transform: scale(0.98); }
            to { opacity: 1; transform: scale(1); }
          }
          .doc-vault-modal {
            background: #FFFFFF;
            width: 100%;
            max-width: 900px;
            max-height: 90vh;
            border-radius: 18px;
            box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            border: 1px solid #E2E8F0;
          }
          .doc-vault-header {
            background: linear-gradient(135deg, #0A1F3D 0%, #152E52 100%);
            color: #FFFFFF;
            padding: 20px 26px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          }
          .doc-vault-title {
            font-size: 19px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 10px;
            letter-spacing: -0.2px;
          }
          .doc-vault-close {
            background: rgba(255, 255, 255, 0.15);
            border: none;
            color: #FFFFFF;
            width: 34px;
            height: 34px;
            border-radius: 50%;
            display: grid;
            place-items: center;
            font-size: 18px;
            font-weight: 700;
            cursor: pointer;
            transition: 0.15s;
          }
          .doc-vault-close:hover {
            background: rgba(255, 255, 255, 0.3);
          }
          .doc-vault-summary {
            background: #F8FAFC;
            padding: 12px 26px;
            border-bottom: 1px solid #E2E8F0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            font-size: 13px;
          }
          .doc-vault-body {
            padding: 22px 26px;
            overflow-y: auto;
            flex: 1;
          }
          .doc-vault-upload-box {
            background: #FAF8F2;
            border: 1.5px dashed #F5B41A;
            border-radius: 14px;
            padding: 18px 20px;
            margin-bottom: 22px;
          }
          .doc-vault-upload-title {
            font-size: 14px;
            font-weight: 800;
            color: #0F1B3D;
            margin-bottom: 12px;
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .doc-vault-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 14px;
          }
          .doc-card {
            background: #FFFFFF;
            border: 1.5px solid #E2E8F0;
            border-radius: 12px;
            padding: 14px 16px;
            transition: 0.15s;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
          }
          .doc-card:hover {
            border-color: #00E599;
            box-shadow: 0 4px 12px rgba(0, 229, 153, 0.12);
          }
          .doc-card-top {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            margin-bottom: 12px;
          }
          .doc-card-ico {
            width: 40px;
            height: 40px;
            background: #EFF6FF;
            border-radius: 10px;
            display: grid;
            place-items: center;
            font-size: 20px;
            flex-shrink: 0;
          }
          .doc-card-title {
            font-size: 14px;
            font-weight: 700;
            color: #0F172A;
            line-height: 1.3;
          }
          .doc-card-meta {
            font-size: 11.5px;
            color: #64748B;
            margin-top: 3px;
          }
          .doc-card-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #059669;
            background: #ECFDF5;
            padding: 2px 8px;
            border-radius: 6px;
            align-self: flex-start;
            margin-bottom: 12px;
          }
          .doc-card-actions {
            display: flex;
            align-items: center;
            gap: 8px;
            border-top: 1px solid #F1F5F9;
            padding-top: 10px;
          }
          .doc-btn {
            background: #0A1F3D;
            color: #FFFFFF;
            border: none;
            border-radius: 6px;
            padding: 6px 12px;
            font-size: 12px;
            font-weight: 700;
            cursor: pointer;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            gap: 4px;
          }
          .doc-btn.secondary {
            background: #F1F5F9;
            color: #334155;
          }
          .doc-btn.danger {
            background: #FEF2F2;
            color: #DC2626;
            margin-left: auto;
          }
        `}</style>

        {/* Header */}
        <div className="doc-vault-header">
          <div className="doc-vault-title">
            <span>🗄️</span>
            <div>
              Academic & Certification Document Vault
              <div style={{ fontSize: 12, fontWeight: 500, opacity: 0.8, marginTop: 2 }}>
                Tamper-proof encrypted credential storage & audit registry
              </div>
            </div>
          </div>
          <button type="button" className="doc-vault-close" onClick={onClose} title="Close Vault">
            ✕
          </button>
        </div>

        {/* Summary Bar */}
        <div className="doc-vault-summary">
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <span style={{ fontWeight: 700, color: "#0F172A" }}>
              Total Documents: <span style={{ color: "#00E599", fontWeight: 800 }}>{documents.length}</span>
            </span>
            <span style={{ color: "#94A3B8" }}>|</span>
            <span style={{ color: "#059669", fontWeight: 700 }}>
              🛡️ Audit Verified Storage Active
            </span>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "#64748B" }}>Filter:</span>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              style={{ fontSize: 12, padding: "4px 8px", borderRadius: 6, border: "1px solid #CBD5E1" }}
            >
              <option value="all">All Documents ({documents.length})</option>
              {DOC_TYPES.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Modal Body */}
        <div className="doc-vault-body">
          {/* Upload Section (Hidden in readOnly mode) */}
          {!readOnly && (
            <div className="doc-vault-upload-box">
              <div className="doc-vault-upload-title">
                <span>📤</span> Upload New Certificate or Academic Document
              </div>
              <form onSubmit={handleUpload}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Document Category <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <select
                      value={docType}
                      onChange={(e) => setDocType(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13 }}
                    >
                      {DOC_TYPES.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.icon} {t.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Document Title / Name <span style={{ color: "#EF4444" }}>*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. AAPC CPC Official Certificate, B.Sc Degree"
                      value={docTitle}
                      onChange={(e) => setDocTitle(e.target.value)}
                      style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13 }}
                      required
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginBottom: 14, alignItems: "flex-end" }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Issue Month
                    </label>
                    <select
                      value={issueMonth}
                      onChange={(e) => setIssueMonth(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13 }}
                    >
                      <option value="">Month…</option>
                      {MONTH_OPTIONS.map((m) => (
                        <option key={m.val} value={m.val}>
                          {m.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: "#334155", display: "block", marginBottom: 4 }}>
                      Issue Year
                    </label>
                    <select
                      value={issueYear}
                      onChange={(e) => setIssueYear(e.target.value)}
                      style={{ width: "100%", padding: "8px 10px", borderRadius: 8, border: "1.5px solid #CBD5E1", fontSize: 13 }}
                    >
                      <option value="">Year…</option>
                      {YEAR_OPTIONS.map((yr) => (
                        <option key={yr} value={yr}>
                          {yr}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png"
                      style={{ display: "none" }}
                      id="vault-file-picker"
                    />
                    <label
                      htmlFor="vault-file-picker"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 6,
                        background: selectedFile ? "#ECFDF5" : "#FFFFFF",
                        border: selectedFile ? "1.5px solid #10B981" : "1.5px solid #CBD5E1",
                        color: selectedFile ? "#059669" : "#334155",
                        padding: "8px 12px",
                        borderRadius: 8,
                        fontSize: 13,
                        fontWeight: 700,
                        cursor: "pointer",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {selectedFile ? `✓ ${selectedFile.name}` : "📁 Choose File (PDF/Image)"}
                    </label>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={uploading || !selectedFile}
                    style={{
                      background: "#0A1F3D",
                      color: "#FFFFFF",
                      border: "none",
                      padding: "9px 20px",
                      borderRadius: 8,
                      fontSize: 13,
                      fontWeight: 800,
                      cursor: uploading || !selectedFile ? "not-allowed" : "pointer",
                      opacity: uploading || !selectedFile ? 0.6 : 1,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    {uploading ? "Uploading to Vault…" : "⬆ Upload to Vault"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Document List */}
          <div>
            <div style={{ fontSize: 15, fontWeight: 800, color: "#0F172A", marginBottom: 12 }}>
              Stored Credentials & Certificates ({filteredDocs.length})
            </div>

            {loading ? (
              <div style={{ padding: "30px", textAlign: "center", color: "#64748B" }}>
                Loading Document Vault…
              </div>
            ) : filteredDocs.length === 0 ? (
              <div style={{ padding: "40px 20px", textAlign: "center", background: "#F8FAFC", borderRadius: 14, border: "1px dashed #CBD5E1" }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🗄️</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#334155" }}>
                  No documents in this vault view
                </div>
                <div style={{ fontSize: 13, color: "#64748B", marginTop: 4 }}>
                  {readOnly
                    ? "The candidate has not attached any documents to this category."
                    : "Upload your official AAPC/AHIMA certificates, degree diplomas, or academic marksheets above."}
                </div>
              </div>
            ) : (
              <div className="doc-vault-grid">
                {filteredDocs.map((doc, idx) => {
                  const typeObj = DOC_TYPES.find((t) => t.id === doc.docType) || { icon: "📁", label: doc.docType || "Document" };
                  return (
                    <div key={doc.id || doc._id || idx} className="doc-card">
                      <div>
                        <div className="doc-card-top">
                          <div className="doc-card-ico">{typeObj.icon}</div>
                          <div>
                            <div className="doc-card-title">{doc.title || doc.docName || "Certificate"}</div>
                            <div className="doc-card-meta">
                              {typeObj.label} · {doc.issueDate ? `Issued ${doc.issueDate}` : formatFileSize(doc.fileSize)}
                            </div>
                          </div>
                        </div>
                        <div className="doc-card-badge">
                          <span>{doc.isRegisteredCert ? "🟢" : "✓"}</span>{" "}
                          {doc.isRegisteredCert ? "Registered & Verified Credential" : "Verified Talentera Document"}
                        </div>
                      </div>

                      <div className="doc-card-actions">
                        {doc.docUrl ? (
                          <>
                            <a
                              href={doc.docUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="doc-btn"
                            >
                              👁 View
                            </a>
                            <a
                              href={doc.docUrl}
                              download={doc.docName || "certificate"}
                              className="doc-btn secondary"
                            >
                              ⬇ Download
                            </a>
                          </>
                        ) : null}

                        {doc.certUrl && (
                          <a
                            href={doc.certUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="doc-btn secondary"
                            style={{ color: "#2563EB", borderColor: "#BFDBFE" }}
                          >
                            🔗 Verification Link ↗
                          </a>
                        )}

                        {!doc.docUrl && (
                          <div style={{ fontSize: 11, color: "#15803D", fontWeight: 700, padding: "4px 8px", background: "#DCFCE7", borderRadius: 6 }}>
                            ✓ Active on Profile
                          </div>
                        )}
                        {!readOnly && !doc.isRegisteredCert && (
                          <button
                            type="button"
                            className="doc-btn danger"
                            onClick={() => handleDeleteDoc(doc.id || doc._id || doc.docUrl)}
                            title="Remove from vault"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
