import React, { useState } from "react";

/**
 * Operating address list: one address per branch. Add the first address, then
 * "+ Add another branch address" for each additional branch.
 * Value = array of { branch, address }. A legacy plain-text value is shown as one entry.
 */
export function normalizeAddresses(value) {
  if (Array.isArray(value)) {
    return value
      .map((v) => (typeof v === "string" ? { branch: "", address: v } : { branch: String(v?.branch || ""), address: String(v?.address || "") }))
      .filter((v) => v.address.trim());
  }
  if (typeof value === "string" && value.trim()) {
    return value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean).map((l) => {
      const m = /^([^:]{1,40}):\s*(.+)$/.exec(l);
      return m ? { branch: m[1].trim(), address: m[2].trim() } : { branch: "", address: l };
    });
  }
  return [];
}

const input = { width: "100%", padding: "10px 12px", border: "1.5px solid #CBD5E1", borderRadius: 10, fontSize: 13.5, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" };

export default function AddressListField({ value, onCommit }) {
  const list = normalizeAddresses(value);
  const [editing, setEditing] = useState(list.length === 0 ? "new" : null); // "new" | index | null
  const [branch, setBranch] = useState("");
  const [address, setAddress] = useState("");
  const [error, setError] = useState("");

  function open(idx) {
    if (idx === "new") { setBranch(""); setAddress(""); } else { setBranch(list[idx].branch); setAddress(list[idx].address); }
    setError("");
    setEditing(idx);
  }

  function save() {
    const a = address.trim();
    if (!a) { setError("Enter the address."); return; }
    const entry = { branch: branch.trim(), address: a };
    const next = editing === "new" ? [...list, entry] : list.map((x, i) => (i === editing ? entry : x));
    onCommit(next);
    setEditing(null);
    setBranch(""); setAddress(""); setError("");
  }

  function remove(idx) {
    const next = list.filter((_, i) => i !== idx);
    onCommit(next);
    if (next.length === 0) open("new");
  }

  return (
    <div>
      {list.map((a, idx) => (
        editing === idx ? null : (
          <div key={idx} style={{ border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "11px 14px", marginBottom: 10, background: "#F8FAFC", display: "flex", gap: 12, alignItems: "flex-start" }}>
            <i className="fa-solid fa-location-dot" style={{ color: "#B47E0E", marginTop: 3 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 13 }}>{a.branch || `Address ${idx + 1}`}</div>
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.45, wordBreak: "break-word" }}>{a.address}</div>
            </div>
            <button type="button" onClick={() => open(idx)} style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Edit</button>
            <button type="button" onClick={() => remove(idx)} style={{ background: "none", border: "none", color: "#DC2626", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Remove</button>
          </div>
        )
      ))}

      {editing !== null && (
        <div style={{ border: "1.5px dashed #CBD5E1", borderRadius: 12, padding: 14, marginBottom: 10, background: "#fff" }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#475569", marginBottom: 8 }}>
            {editing === "new" ? (list.length === 0 ? "Address" : `Address ${list.length + 1}`) : "Edit address"}
          </div>
          <input style={{ ...input, marginBottom: 8 }} value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="Branch / city (e.g. Hyderabad)" />
          <textarea style={{ ...input, minHeight: 74, resize: "vertical" }} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Full address (floor, building, street, city, state, PIN)" />
          {error && <div style={{ color: "#DC2626", fontSize: 12, marginTop: 6 }}>{error}</div>}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" onClick={save} style={{ background: "#0A1F3D", color: "#E5A82E", border: "none", padding: "9px 16px", borderRadius: 8, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
              {editing === "new" ? "Save address" : "Update address"}
            </button>
            {list.length > 0 && (
              <button type="button" onClick={() => { setEditing(null); setError(""); }} style={{ background: "#fff", border: "1.5px solid #CBD5E1", padding: "9px 14px", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
                Cancel
              </button>
            )}
          </div>
        </div>
      )}

      {editing === null && (
        <button type="button" onClick={() => open("new")} style={{ background: "#fff", border: "1.5px solid #0A1F3D", color: "#0A1F3D", padding: "9px 16px", borderRadius: 10, fontWeight: 800, fontSize: 13, cursor: "pointer" }}>
          + Add another branch address
        </button>
      )}
    </div>
  );
}
