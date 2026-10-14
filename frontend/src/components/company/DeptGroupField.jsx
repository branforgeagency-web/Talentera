import React, { useEffect, useRef, useState } from "react";
import { COMPANY_DEPT_GROUPS } from "../../data/companyDepartments.js";

/**
 * Departments with their specialties nested underneath, both as searchable multi-select dropdowns.
 * Pick departments in the first dropdown; a specialties dropdown for each chosen department then appears below.
 * Value stays a flat array of strings (department names + specialty names) so existing readers keep working.
 */

function MultiDropdown({ options, selected, onToggle, placeholder, allowCustom, onAddCustom }) {
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

  return (
    <div ref={ref} style={{ position: "relative" }}>
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
  const known = new Set(COMPANY_DEPT_GROUPS.flatMap((g) => [g.name, ...g.specialties]));
  const chosenGroups = COMPANY_DEPT_GROUPS.filter((g) => has(g.name));
  const strayCustom = selected.filter((v) => !known.has(v));

  function toggleDept(name) {
    const g = COMPANY_DEPT_GROUPS.find((x) => x.name === name);
    if (has(name)) {
      const drop = new Set([name, ...g.specialties]);
      onCommit(selected.filter((x) => !drop.has(x)));
    } else {
      onCommit([...selected, name]);
    }
  }

  return (
    <div>
      <div style={{ fontSize: 12, color: "#64748B", marginBottom: 6 }}>
        1. Choose the departments you hire for — 2. then choose the specialties under each one.
      </div>
      <MultiDropdown
        options={deptNames}
        selected={selected}
        onToggle={toggleDept}
        placeholder="Search & select departments…"
      />
      <Chips items={chosenGroups.map((g) => g.name)} onRemove={toggleDept} />

      {chosenGroups.map((g) => {
        const picked = g.specialties.filter(has);
        return (
          <div key={g.name} style={{ marginTop: 14, padding: "12px 14px", border: "1.5px solid #E2E8F0", borderRadius: 10, background: "#F8FAFC" }}>
            <div style={{ fontWeight: 800, fontSize: 13, color: "#0F172A", marginBottom: 8 }}>{g.name} — specialties</div>
            <MultiDropdown
              options={g.specialties}
              selected={selected}
              onToggle={toggle}
              onAddCustom={(t) => { if (!has(t)) onCommit([...selected, t]); }}
              allowCustom
              placeholder={`Search & select ${g.name} specialties (or type to add your own)…`}
            />
            <Chips items={picked} onRemove={toggle} />
          </div>
        );
      })}

      {strayCustom.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 12, color: "#64748B" }}>Your added specialties (click to remove)</div>
          <Chips items={strayCustom} onRemove={toggle} />
        </div>
      )}
    </div>
  );
}
