import React, { useEffect, useRef, useState } from "react";
import { COMPANY_DEPT_GROUPS } from "../../data/companyDepartments.js";

/**
 * Departments as a searchable multi-select dropdown with quick select all / clear all and custom department addition.
 * Value stays an array of department strings.
 */

function MultiDropdown({ options, selected, onToggle, placeholder, allowCustom, onAddCustom, onSelectAll, onClearAll }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(""); } };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);

  const query = q.trim().toLowerCase();
  const list = options.filter((o) => !query || o.toLowerCase().includes(query));
  const count = options.filter((o) => selected.includes(o)).length;
  const canAdd = allowCustom && query && !options.some((o) => o.toLowerCase() === query) && !selected.some((o) => o.toLowerCase() === query);

  const allOn = options.length > 0 && count === options.length;
  const linkBtn = { background: "none", border: "none", padding: 0, cursor: "pointer", fontSize: 12, fontWeight: 700, color: "#B45309", textDecoration: "underline" };

  return (
    <div ref={ref} style={{ position: "relative" }}>
      {onSelectAll && onClearAll && options.length > 1 && (
        <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 6 }}>
          <button type="button" style={linkBtn} disabled={allOn} onClick={() => onSelectAll(options)}>
            {allOn ? "✓ All selected" : `Select all (${options.length})`}
          </button>
          {count > 0 && (
            <button type="button" style={{ ...linkBtn, color: "#64748B" }} onClick={() => onClearAll(options)}>
              Clear all
            </button>
          )}
        </div>
      )}
      <input
        type="text"
        className="conb-input"
        placeholder={count ? `${count} selected — ${placeholder}` : placeholder}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canAdd) { e.preventDefault(); onAddCustom(q.trim()); setQ(""); }
        }}
      />
      {open && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 30, background: "#fff", border: "1px solid #E2E8F0", borderRadius: 8, marginTop: 4, maxHeight: 260, overflowY: "auto", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {list.length === 0 && !canAdd && <div style={{ padding: "10px 14px", color: "#64748B", fontSize: 13 }}>No matches</div>}
          {list.map((o) => {
            const on = selected.includes(o);
            return (
              <div
                key={o}
                onMouseDown={(e) => { e.preventDefault(); onToggle(o); }}
                style={{ padding: "9px 14px", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, fontSize: 13, background: on ? "#FDF6E4" : "transparent", fontWeight: on ? 700 : 400 }}
              >
                <input type="checkbox" readOnly checked={on} style={{ pointerEvents: "none" }} />
                <span>{o}</span>
              </div>
            );
          })}
          {canAdd && (
            <div
              onMouseDown={(e) => { e.preventDefault(); onAddCustom(q.trim()); setQ(""); }}
              style={{ padding: "9px 14px", cursor: "pointer", fontSize: 13, fontWeight: 700, color: "#B45309", borderTop: "1px solid #F1F5F9" }}
            >
              + Add "{q.trim()}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Chips({ items, onRemove }) {
  if (!items.length) return null;
  return (
    <div className="conb-chip-grid" style={{ marginTop: 8 }}>
      {items.map((s) => (
        <button type="button" key={s} className="conb-chip conb-chip-active" onClick={() => onRemove(s)}>{s} ✕</button>
      ))}
    </div>
  );
}

export default function DeptGroupField({ value, onCommit }) {
  const selected = Array.isArray(value) ? value : [];
  const has = (v) => selected.includes(v);
  const toggle = (v) => onCommit(has(v) ? selected.filter((x) => x !== v) : [...selected, v]);

  const deptNames = COMPANY_DEPT_GROUPS.map((g) => g.name);

  function selectAllDepts(names) {
    onCommit([...selected, ...names.filter((n) => !has(n))]);
  }
  function clearAllDepts(names) {
    const drop = new Set(names);
    onCommit(selected.filter((x) => !drop.has(x)));
  }

  return (
    <div>
      <MultiDropdown
        options={deptNames}
        selected={selected}
        onToggle={toggle}
        onSelectAll={selectAllDepts}
        onClearAll={clearAllDepts}
        allowCustom
        onAddCustom={(t) => { if (!has(t)) onCommit([...selected, t]); }}
        placeholder="Search & select departments…"
      />
      <Chips items={selected} onRemove={toggle} />
    </div>
  );
}
