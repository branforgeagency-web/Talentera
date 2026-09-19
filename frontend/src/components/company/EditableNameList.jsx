import React, { useEffect, useRef, useState } from "react";

/**
 * Interview-panel style member list.
 * - Members show as chips "Name (Role)" with a pen icon.
 * - Pen opens a small menu: Edit / Delete.
 * - Edit swaps the chip for Name + Role inputs; the green tick saves, the grey x cancels.
 * - "+ Add member" opens the same inputs for a new member; quick-add suggestions add one instantly.
 * Values are stored as plain strings: "Name (Role)" or "Name".
 * onChange fires with the raw list; onCommit (optional) fires after add / edit-save / delete
 * so callers that persist to a server don't save on every keystroke.
 */
const ROLE_RE = /^(.*?)\s*\(([^)]*)\)\s*$/;

function parseMember(str) {
  const m = ROLE_RE.exec(String(str || ""));
  return m ? { name: m[1].trim(), role: m[2].trim() } : { name: String(str || "").trim(), role: "" };
}
function formatMember(name, role) {
  const n = String(name || "").trim();
  const r = String(role || "").trim();
  return r ? `${n} (${r})` : n;
}

const inputStyle = {
  padding: "8px 11px",
  border: "1.5px solid #CBD5E1",
  borderRadius: 10,
  fontSize: 13.5,
  fontFamily: "inherit",
  minWidth: 0,
};

export default function EditableNameList({ value, onChange, onCommit, suggestions = [] }) {
  const list = (Array.isArray(value) ? value : []).filter((v) => String(v || "").trim());
  const [menuIdx, setMenuIdx] = useState(null);
  const [editIdx, setEditIdx] = useState(null); // index being edited, or list.length for a new member
  const [draftName, setDraftName] = useState("");
  const [draftRole, setDraftRole] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (menuIdx === null) return undefined;
    const close = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuIdx(null);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [menuIdx]);

  function apply(next) {
    onChange(next);
    if (onCommit) onCommit(next);
  }

  function startEdit(i) {
    const { name, role } = parseMember(list[i]);
    setDraftName(name);
    setDraftRole(role);
    setEditIdx(i);
    setMenuIdx(null);
  }

  function startAdd() {
    setDraftName("");
    setDraftRole("");
    setEditIdx(list.length);
    setMenuIdx(null);
  }

  function cancelEdit() {
    setEditIdx(null);
  }

  function saveEdit() {
    const formatted = formatMember(draftName, draftRole);
    if (!draftName.trim()) return; // name is required
    const next = [...list];
    if (editIdx >= list.length) next.push(formatted);
    else next[editIdx] = formatted;
    apply(next);
    setEditIdx(null);
  }

  function remove(i) {
    apply(list.filter((_, idx) => idx !== i));
    setMenuIdx(null);
    if (editIdx === i) setEditIdx(null);
  }

  const remainingSuggestions = suggestions.filter((s) => !list.includes(s));
  const isAdding = editIdx !== null && editIdx >= list.length;

  const editor = (
    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", width: "100%" }}>
      <input
        autoFocus
        type="text"
        value={draftName}
        placeholder="Name"
        onChange={(e) => setDraftName(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
        style={{ ...inputStyle, flex: "1 1 160px" }}
      />
      <input
        type="text"
        value={draftRole}
        placeholder="Role (e.g. HR)"
        onChange={(e) => setDraftRole(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); saveEdit(); } if (e.key === "Escape") cancelEdit(); }}
        style={{ ...inputStyle, flex: "1 1 140px" }}
      />
      <button
        type="button"
        title="Save"
        aria-label="Save member"
        onClick={saveEdit}
        disabled={!draftName.trim()}
        style={{ width: 34, height: 34, borderRadius: 8, border: "none", background: draftName.trim() ? "#16A34A" : "#BBF7D0", color: "#fff", fontSize: 17, fontWeight: 800, cursor: draftName.trim() ? "pointer" : "not-allowed", lineHeight: 1 }}
      >
        ✓
      </button>
      <button
        type="button"
        title="Cancel"
        aria-label="Cancel"
        onClick={cancelEdit}
        style={{ width: 34, height: 34, borderRadius: 8, border: "1.5px solid #E2E8F0", background: "#fff", color: "#64748B", fontSize: 16, fontWeight: 700, cursor: "pointer", lineHeight: 1 }}
      >
        ×
      </button>
    </div>
  );

  return (
    <div ref={wrapRef} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {list.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {list.map((member, i) =>
            editIdx === i ? (
              <div key={`edit-${i}`} style={{ flex: "1 1 100%" }}>{editor}</div>
            ) : (
              <div key={`${member}-${i}`} style={{ position: "relative", display: "inline-flex", alignItems: "center", gap: 6, padding: "6px 8px 6px 14px", borderRadius: 999, background: "var(--navy)", color: "#fff", fontSize: 12.5, fontWeight: 600 }}>
                <span>{member}</span>
                <button
                  type="button"
                  title="Edit or delete"
                  aria-label={`Options for ${member}`}
                  onClick={() => setMenuIdx(menuIdx === i ? null : i)}
                  style={{ width: 24, height: 24, borderRadius: "50%", border: "none", background: "rgba(255,255,255,0.18)", color: "#fff", fontSize: 12, cursor: "pointer", lineHeight: 1 }}
                >
                  ✎
                </button>
                {menuIdx === i && (
                  <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, zIndex: 20, minWidth: 130, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.14)", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() => startEdit(i)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", background: "#fff", color: "#0F172A", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      ✏️ Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(i)}
                      style={{ display: "block", width: "100%", textAlign: "left", padding: "9px 14px", border: "none", borderTop: "1px solid #F1F5F9", background: "#fff", color: "#DC2626", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
                    >
                      🗑 Delete
                    </button>
                  </div>
                )}
              </div>
            )
          )}
        </div>
      )}

      {isAdding && editor}

      {!isAdding && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            onClick={startAdd}
            style={{ padding: "6px 12px", borderRadius: 999, border: "1.5px dashed #94A3B8", background: "#fff", color: "#334155", fontSize: 12, fontWeight: 700, cursor: "pointer" }}
          >
            + Add member
          </button>
          {remainingSuggestions.map((s) => (
            <button
              type="button"
              key={s}
              onClick={() => apply([...list, s])}
              style={{ padding: "6px 12px", borderRadius: 999, border: "1.5px solid #E2E8F0", background: "#fff", color: "#475569", fontSize: 12, fontWeight: 600, cursor: "pointer" }}
            >
              + {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
