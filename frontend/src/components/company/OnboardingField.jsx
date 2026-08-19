import React, { useRef, useState } from "react";
import companyApi from "../../api/companyClient";
import { useToast } from "../Toast.jsx";

const TAG_LABEL = { must: "MUST", opt: "OPT", cond: "COND" };

const VALIDATORS = {
  gstin: { re: /^[0-9A-Z]{15}$/, msg: "Enter a valid 15-character GSTIN." },
  pan: { re: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, msg: "Enter a valid 10-character PAN (e.g. AAAAA0000A)." },
  email: { re: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, msg: "Enter a valid email address." },
  url: { re: /^https?:\/\/.+/, msg: "URL must start with http:// or https://" },
  phone: { re: /^\d{10}$/, msg: "Enter a valid 10-digit mobile number." },
};

function badgeStyle(tag) {
  if (tag === "must") return { background: "#FEE2E2", color: "#DC2626" };
  if (tag === "cond") return { background: "#E2E8F0", color: "#475569" };
  return { background: "#FEF3C7", color: "#D97706" };
}

function isFieldEmpty(input, val) {
  if (val === undefined || val === null) return true;
  if (typeof val === "string") return val.trim() === "";
  if (Array.isArray(val)) return val.length === 0;
  if (typeof val === "object") {
    if (input === "name-email") return !val.name || !String(val.name).trim() || !val.email || !String(val.email).trim();
    if (input === "file") return !val.docName && !val.docUrl && !val.url && !val.fileUrl && !val.name;
  }
  return false;
}

export default function OnboardingField({ item, value, onSave, stageId, showStageErrors, isRejectedField }) {
  const toast = useToast();
  const isUpperType = item.input === "gstin" || item.input === "pan";
  const [text, setText] = useState(() => (typeof value === "string" ? value : ""));
  const [nameEmail, setNameEmail] = useState(() => (value && typeof value === "object" && !Array.isArray(value) ? value : { name: "", email: "" }));
  const [multiVal, setMultiVal] = useState(() => (Array.isArray(value) ? value : []));
  const [fileInfo, setFileInfo] = useState(() => {
    if (!value) return null;
    if (typeof value === "string" && value.trim() !== "") return { docUrl: value, docName: item.name };
    if (typeof value === "object" && (value.docName || value.docUrl || value.url || value.fileUrl)) return value;
    return null;
  });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  React.useEffect(() => {
    if (typeof value === "string") {
      setText(value);
    } else if (typeof value === "number") {
      setText(String(value));
    } else {
      setText("");
    }

    if (value && typeof value === "object" && !Array.isArray(value)) {
      setNameEmail(value);
      if (value.docName || value.docUrl || value.url || value.fileUrl) {
        setFileInfo(value);
      } else {
        setFileInfo(null);
      }
    } else if (typeof value === "string" && value.trim() !== "") {
      setFileInfo({ docUrl: value, docName: item.name });
    } else {
      setFileInfo(null);
    }

    if (Array.isArray(value)) {
      setMultiVal(value);
    } else {
      setMultiVal([]);
    }
  }, [value, item.name]);

  const isMissingMust = item.tag === "must" && isFieldEmpty(item.input, value);
  const isRequiredError = showStageErrors && isMissingMust;

  async function commit(nextValue) {
    setSaving(true);
    try {
      await onSave(item.id, nextValue);
    } catch (err) {
      console.error(err);
      toast(`Failed to save ${item.name}`, "!");
    } finally {
      setSaving(false);
    }
  }

  function handleTextBlur() {
    const val = typeof text === "string" ? text.trim() : text;
    let err = "";
    if (item.tag === "must" && isFieldEmpty(item.input, val)) {
      err = `"${item.name}" is a required field.`;
    } else if (val && VALIDATORS[item.input] && !VALIDATORS[item.input].re.test(val)) {
      err = VALIDATORS[item.input].msg;
    }
    setError(err);
    if (err) {
      toast(err, "!");
    } else {
      commit(val);
    }
  }

  function handleNameEmailBlur() {
    let err = "";
    if (item.tag === "must" && isFieldEmpty(item.input, nameEmail)) {
      err = `Both Name and Email are required for ${item.name}.`;
    }
    setError(err);
    if (err) {
      toast(err, "!");
    } else {
      commit(nameEmail);
    }
  }

  function toggleMultiOption(opt) {
    const next = multiVal.includes(opt) ? multiVal.filter((x) => x !== opt) : [...multiVal, opt];
    setMultiVal(next);
    commit(next);
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("doc", file);
      const res = await companyApi.post(`/company/upload/doc/${stageId}`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const info = { docUrl: res.data.docUrl, docName: res.data.docName };
      setFileInfo(info);
      await commit(info);
      toast(`File "${res.data.docName}" uploaded successfully!`, "✓");
    } catch (err) {
      const uploadErrMsg = err.response?.data?.message || "Upload failed.";
      setError(uploadErrMsg);
      toast(`Upload error for ${item.name}: ${uploadErrMsg}`, "!");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div
      className="conb-field"
      style={
        isRejectedField
          ? { border: "2px solid #EF4444", background: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 12 }
          : {}
      }
    >
      {isRejectedField && (
        <div style={{ fontSize: 11, color: "#DC2626", fontWeight: 800, background: "#FEE2E2", padding: "6px 10px", borderRadius: 6, marginBottom: 8, border: "1px solid #FCA5A5" }}>
          🔴 REVISION REQUIRED BY AUDITOR: Uploaded document image was marked invalid. Please re-upload a clear file.
        </div>
      )}
      <div className="conb-field-head">
        <label className="conb-field-label">{item.name.toUpperCase()}</label>
        <span className="conb-field-tag" style={badgeStyle(item.tag)}>{TAG_LABEL[item.tag]}</span>
      </div>

      {["text", "gstin", "pan", "email", "url", "number"].includes(item.input) && (
        <div>
          <input
            type={item.input === "number" ? "number" : item.input === "email" ? "email" : item.input === "url" ? "url" : "text"}
            className="conb-input"
            value={text}
            placeholder={item.placeholder}
            maxLength={item.input === "gstin" ? 15 : item.input === "pan" ? 10 : undefined}
            onChange={(e) => setText(isUpperType ? e.target.value.toUpperCase() : e.target.value)}
            onBlur={handleTextBlur}
          />
          {item.input === "gstin" && text.length === 15 && !error && (
            <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>✓ Valid 15-digit GSTIN Format</span>
            </div>
          )}
          {item.input === "pan" && text.length === 10 && !error && (
            <div style={{ fontSize: 11, color: "#16A34A", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
              <span>✓ Valid 10-digit PAN Format</span>
            </div>
          )}
        </div>
      )}

      {item.input === "phone" && (
        <div className="conb-input-prefix-wrap">
          <span className="conb-input-prefix">+91</span>
          <input
            type="tel"
            className="conb-input"
            value={text}
            placeholder="10-digit mobile"
            maxLength={10}
            onChange={(e) => setText(e.target.value.replace(/\D/g, ""))}
            onBlur={handleTextBlur}
          />
        </div>
      )}

      {item.input === "date" && (
        <input
          type="date"
          className="conb-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
        />
      )}

      {item.input === "select" && (
        <select
          className="conb-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            commit(e.target.value);
          }}
        >
          <option value="">Select…</option>
          {(item.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}

      {item.input === "textarea" && (
        <>
          <textarea
            className="conb-input conb-textarea"
            rows={3}
            value={text}
            placeholder={item.placeholder}
            maxLength={item.maxlength}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleTextBlur}
          />
          {item.maxlength && (
            <div className="conb-charcount">{text.length} / {item.maxlength}</div>
          )}
        </>
      )}

      {item.input === "multi" && (
        <div className="conb-chip-grid">
          {(item.options || []).map((opt) => (
            <button
              type="button"
              key={opt}
              className={`conb-chip ${multiVal.includes(opt) ? "conb-chip-active" : ""}`}
              onClick={() => toggleMultiOption(opt)}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {item.input === "file" && (
        <div className={`conb-dropzone ${fileInfo ? "conb-dropzone-done" : ""}`}>
          {fileInfo ? (
            <div className="conb-file-done">
              <span>📄 {fileInfo.docName}</span>
              <button type="button" className="conb-file-replace" onClick={() => fileInputRef.current?.click()}>
                Replace
              </button>
            </div>
          ) : (
            <button type="button" className="conb-upload-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? "Uploading…" : "⬆ Click to upload"}
            </button>
          )}
          <input ref={fileInputRef} type="file" style={{ display: "none" }} onChange={handleFileChange} />
        </div>
      )}

      {item.input === "name-email" && (
        <div className="conb-name-email">
          <input
            type="text"
            className="conb-input"
            placeholder="Full name"
            value={nameEmail.name || ""}
            onChange={(e) => setNameEmail({ ...nameEmail, name: e.target.value })}
            onBlur={() => commit(nameEmail)}
          />
          <input
            type="email"
            className="conb-input"
            placeholder="Email address"
            value={nameEmail.email || ""}
            onChange={(e) => setNameEmail({ ...nameEmail, email: e.target.value })}
            onBlur={() => commit(nameEmail)}
          />
        </div>
      )}

      {item.desc && <div className="conb-field-desc">{item.desc}</div>}
      {isRequiredError && (
        <div className="error-text" style={{ color: "#EF4444", fontWeight: 700, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span>⚠️ Required input: Please fill out {item.name} in this section.</span>
        </div>
      )}
      {error && <div className="error-text">{error}</div>}
      {saving && <div className="conb-field-saving">Saving…</div>}
    </div>
  );
}
