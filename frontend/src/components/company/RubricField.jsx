import React, { useEffect, useState } from "react";

/**
 * Custom scoring rubric: for "All roles (default)" and each role the company
 * picked, set how many of the 100 points go to each criterion used to analyse
 * a student's profile.  Value = { [roleName]: { [criterion]: points } }
 */
export const RUBRIC_DEFAULT_ROLE = "All roles (default)";

export const RUBRIC_CRITERIA = [
  "ICD-10 coding", "CPT / HCPCS coding", "Specialty knowledge", "Communication",
  "Aptitude / logic", "Behaviour & attitude", "Typing speed & accuracy", "Experience / internships",
  "Certifications", "Education & training", "AI video interview", "Resume quality",
];

const input = { padding: "8px 10px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13, fontFamily: "inherit", boxSizing: "border-box", background: "#fff" };

function cleanValue(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out = {};
  Object.keys(value).forEach((role) => {
    const row = value[role];
    if (row && typeof row === "object" && !Array.isArray(row)) out[role] = row;
  });
  return out;
}

function total(row) {
  return Object.values(row || {}).reduce((s, n) => s + (Number(n) || 0), 0);
}

export default function RubricField({ value, roles = [], onCommit }) {
  const [data, setData] = useState(() => cleanValue(value));
  const [custom, setCustom] = useState({});
  const roleList = [RUBRIC_DEFAULT_ROLE, ...(Array.isArray(roles) ? roles.filter((r) => r && r !== "Other") : [])];

  useEffect(() => { setData(cleanValue(value)); }, [value]);

  function push(next) {
    setData(next);
    onCommit(next);
  }

  function setWeight(role, crit, raw) {
    const n = String(raw).replace(/\D/g, "").slice(0, 3);
    setData({ ...data, [role]: { ...(data[role] || {}), [crit]: n === "" ? "" : Math.min(100, Number(n)) } });
  }

  function addCriterion(role, crit) {
    const name = String(crit || "").trim();
    if (!name || (data[role] && name in data[role])) return;
    push({ ...data, [role]: { ...(data[role] || {}), [name]: 0 } });
  }

  function removeCriterion(role, crit) {
    const row = { ...(data[role] || {}) };
    delete row[crit];
    const next = { ...data };
    if (Object.keys(row).length) next[role] = row; else delete next[role];
    push(next);
  }

  function equalSplit(role) {
    const keys = Object.keys(data[role] || {});
    if (!keys.length) return;
    const base = Math.floor(100 / keys.length);
    const row = {};
    keys.forEach((k, i) => { row[k] = i === 0 ? 100 - base * (keys.length - 1) : base; });
    push({ ...data, [role]: row });
  }

  return (
    <div>
      {roleList.map((role) => {
        const row = data[role] || {};
        const keys = Object.keys(row);
        const sum = total(row);
        const ok = sum === 100;
        const free = RUBRIC_CRITERIA.filter((c) => !(c in row));
        return (
          <div key={role} style={{ border: "1.5px solid #E2E8F0", borderRadius: 12, padding: 14, marginBottom: 12, background: "#F8FAFC" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: keys.length ? 10 : 6, flexWrap: "wrap" }}>
              <div style={{ fontWeight: 800, fontSize: 13.5, flex: 1, minWidth: 140 }}>{role}</div>
              {keys.length > 0 && (
                <>
                  <button type="button" onClick={() => equalSplit(role)} style={{ background: "none", border: "none", color: "#2563EB", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Split equally</button>
                  <span style={{ fontSize: 12, fontWeight: 800, padding: "3px 9px", borderRadius: 999, background: ok ? "#DCFCE7" : "#FEE2E2", color: ok ? "#15803D" : "#B91C1C" }}>
                    {sum} / 100 pts
                  </span>
                </>
              )}
            </div>

            {keys.map((crit) => (
              <div key={crit} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                <div style={{ flex: 1, fontSize: 13, color: "#334155" }}>{crit}</div>
                <input
                  style={{ ...input, width: 70, textAlign: "right" }}
                  inputMode="numeric"
                  value={row[crit]}
                  onChange={(e) => setWeight(role, crit, e.target.value)}
                  onBlur={() => onCommit(data)}
                />
                <span style={{ fontSize: 12, color: "#64748B" }}>pts</span>
                <button type="button" onClick={() => removeCriterion(role, crit)} aria-label={`Remove ${crit}`} style={{ background: "none", border: "none", color: "#DC2626", fontWeight: 800, cursor: "pointer", fontSize: 15 }}>×</button>
              </div>
            ))}
            {keys.length > 0 && !ok && (
              <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 6 }}>Weights should add up to exactly 100 (currently {sum}).</div>
            )}

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
              <select
                style={{ ...input, flex: 1, minWidth: 160 }}
                value=""
                onChange={(e) => { addCriterion(role, e.target.value); }}
              >
                <option value="">+ Add criterion…</option>
                {free.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <input
                style={{ ...input, flex: 1, minWidth: 140 }}
                placeholder="Or type your own criterion"
                value={custom[role] || ""}
                onChange={(e) => setCustom({ ...custom, [role]: e.target.value })}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCriterion(role, custom[role]); setCustom({ ...custom, [role]: "" }); } }}
              />
              <button
                type="button"
                onClick={() => { addCriterion(role, custom[role]); setCustom({ ...custom, [role]: "" }); }}
                style={{ background: "#0A1F3D", color: "#E5A82E", border: "none", padding: "8px 14px", borderRadius: 8, fontWeight: 800, fontSize: 12.5, cursor: "pointer" }}
              >Add</button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
