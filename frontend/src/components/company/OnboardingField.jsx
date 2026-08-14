import React, { useRef, useState } from "react";
import companyApi from "../../api/companyClient";

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

export default function OnboardingField({ item, value, onSave, stageId }) {
  const isUpperType = item.input === "gstin" || item.input === "pan";
  const [text, setText] = useState(() => (typeof value === "string" ? value : ""));
  const [nameEmail, setNameEmail] = useState(() => (value && typeof value === "object" && !Array.isArray(value) ? value : { name: "", email: "" }));
  const [multiVal, setMultiVal] = useState(() => (Array.isArray(value) ? value : []));
  const [fileInfo, setFileInfo] = useState(() => (value && value.docName ? value : null));
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  async function commit(nextValue) {
    setSaving(true);
    try {
      await onSave(item.id, nextValue);
      setError("");
    } catch (err) {
      setError(err.response?.data?.message || "Couldn't save this field.");
    } finally {
      setSaving(false);
    }
  }

  function validateAndCommit(raw) {
    const validator = VALIDATORS[item.input];
    if (validator && raw.trim() !== "" && !validator.re.test(raw)) {
      setError(validator.msg);
      return;
    }
    setError("");
    commit(raw);
  }

  function handleTextBlur() {
    const raw = isUpperType ? text.toUpperCase() : text;
    if (isUpperType && raw !== text) setText(raw);
    validateAndCommit(raw);
  }

  function toggleMultiOption(opt) {
    const next = multiVal.includes(opt) ? multiVal.filter((o) => o !== opt) : [...multiVal, opt];
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
    } catch (err) {
      setError(err.response?.data?.message || "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="conb-field">
      <div className="conb-field-head">
        <label className="conb-field-label">{item.name.toUpperCase()}</label>
        <span className="conb-field-tag" style={badgeStyle(item.tag)}>{TAG_LABEL[item.tag]}</span>
      </div>

      {["text", "gstin", "pan", "email", "url", "number"].includes(item.input) && (
        <input
          type={item.input === "number" ? "number" : item.input === "email" ? "email" : item.input === "url" ? "url" : "text"}
          className="conb-input"
          value={text}
          placeholder={item.placeholder}
          maxLength={item.input === "gstin" ? 15 : item.input === "pan" ? 10 : undefined}
          onChange={(e) => setText(isUpperType ? e.target.value.toUpperCase() : e.target.value)}
          onBlur={handleTextBlur}
        />
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
      {error && <div className="error-text">{error}</div>}
      {saving && <div className="conb-field-saving">Saving…</div>}
    </div>
  );
}
