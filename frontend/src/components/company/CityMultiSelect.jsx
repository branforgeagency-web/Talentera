import React, { useEffect, useMemo, useRef, useState } from "react";
import { INDIAN_CITIES } from "../../data/indianCities.js";

/**
 * Searchable multi-select dropdown of Indian cities with chips for the selected ones.
 * Anything not in the list can be typed and added as a custom entry.
 * value: array of city names (a legacy comma-separated string is also accepted).
 */
export function toCityList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "string") return value.split(",").map((v) => v.trim()).filter(Boolean);
  return [];
}

export default function CityMultiSelect({ value, onCommit, placeholder = "Select branch cities" }) {
  const selected = toCityList(value);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const wrapRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const query = q.trim().toLowerCase();
  const results = useMemo(() => {
    const list = query
      ? INDIAN_CITIES.filter((c) => c.city.toLowerCase().includes(query) || c.state.toLowerCase().includes(query) || (c.aliases || []).some((a) => a.toLowerCase().includes(query)))
      : INDIAN_CITIES;
    return list.slice(0, 200);
  }, [query]);

  const isSel = (city) => selected.some((s) => s.toLowerCase() === city.toLowerCase());
  const toggle = (city) => {
    const next = isSel(city) ? selected.filter((s) => s.toLowerCase() !== city.toLowerCase()) : [...selected, city];
    onCommit(next);
  };
  const exact = INDIAN_CITIES.some((c) => c.city.toLowerCase() === query) || selected.some((s) => s.toLowerCase() === query);
  const addCustom = () => {
    const name = q.trim().replace(/\s+/g, " ");
    if (!name) return;
    if (!isSel(name)) onCommit([...selected, name]);
    setQ("");
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      <div
        onClick={() => setOpen(true)}
        style={{ minHeight: 46, border: "1.5px solid #CBD5E1", borderRadius: 12, padding: "6px 10px", background: "#fff", display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", cursor: "text" }}
      >
        {selected.map((c) => (
          <span key={c} style={{ background: "#F1F5F9", border: "1px solid #E2E8F0", borderRadius: 999, padding: "4px 6px 4px 11px", fontSize: 13, fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 6 }}>
            {c}
            <button type="button" aria-label={`Remove ${c}`} onClick={(e) => { e.stopPropagation(); toggle(c); }} style={{ border: "none", background: "#E2E8F0", borderRadius: "50%", width: 18, height: 18, lineHeight: "16px", cursor: "pointer", fontSize: 12, padding: 0 }}>×</button>
          </span>
        ))}
        <span style={{ color: "#94A3B8", fontSize: 13.5, padding: "4px 4px" }}>{selected.length === 0 ? placeholder : "+ Add more"}</span>
        <span style={{ marginLeft: "auto", color: "#64748B", fontSize: 11 }}>▾</span>
      </div>

      {open && (
        <div style={{ position: "absolute", zIndex: 50, left: 0, right: 0, top: "calc(100% + 6px)", background: "#fff", border: "1.5px solid #CBD5E1", borderRadius: 12, boxShadow: "0 12px 28px rgba(15,27,61,0.16)", overflow: "hidden" }}>
          <div style={{ padding: 10, borderBottom: "1px solid #F1F5F9", display: "flex", gap: 8, alignItems: "center" }}>
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (results.length === 1 && !exact) toggle(results[0].city); else if (q.trim() && !exact) addCustom(); } if (e.key === "Escape") setOpen(false); }}
              placeholder="Search city or state — or type any location…"
              style={{ flex: 1, minWidth: 0, padding: "9px 12px", border: "1.5px solid #CBD5E1", borderRadius: 8, fontSize: 13.5, boxSizing: "border-box", outline: "none" }}
            />
            <button
              type="button"
              onClick={addCustom}
              disabled={!q.trim() || exact}
              style={{ border: "none", borderRadius: 8, padding: "9px 14px", fontSize: 13, fontWeight: 800, cursor: q.trim() && !exact ? "pointer" : "not-allowed", background: q.trim() && !exact ? "#0A1F3D" : "#E2E8F0", color: q.trim() && !exact ? "#fff" : "#94A3B8", whiteSpace: "nowrap" }}
            >
              + Add
            </button>
          </div>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {q.trim() && !exact && (
              <div onClick={addCustom} style={{ padding: "10px 14px", cursor: "pointer", fontSize: 13.5, fontWeight: 700, color: "#0A1F3D", borderBottom: "1px solid #F1F5F9", background: "#FFFBEB" }}>
                + Add "{q.trim()}" as a custom location
              </div>
            )}
            {results.map(({ city, state, aliases }) => (
              <div
                key={city}
                onClick={() => toggle(city)}
                style={{ padding: "8px 14px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", fontSize: 13.5, background: isSel(city) ? "rgba(229,168,46,0.12)" : "transparent" }}
              >
                <input type="checkbox" readOnly checked={isSel(city)} style={{ accentColor: "#B47E0E" }} />
                <span style={{ fontWeight: 600 }}>{city}</span>
                {query && (aliases || []).some((a) => a.toLowerCase().includes(query)) && (
                  <span style={{ color: "#B47E0E", fontSize: 12 }}>({(aliases || []).find((a) => a.toLowerCase().includes(query))})</span>
                )}
                <span style={{ color: "#94A3B8", fontSize: 12, marginLeft: "auto" }}>{state}</span>
              </div>
            ))}
            {results.length === 0 && <div style={{ padding: "14px", color: "#64748B", fontSize: 13 }}>No matching city — click "+ Add" to use what you typed.</div>}
          </div>
          <div style={{ padding: "8px 14px", borderTop: "1px solid #F1F5F9", display: "flex", justifyContent: "space-between", fontSize: 12, color: "#64748B" }}>
            <span>{selected.length} selected · can't find it? type it and click + Add</span>
            <button type="button" onClick={() => setOpen(false)} style={{ border: "none", background: "none", fontWeight: 800, color: "#0A1F3D", cursor: "pointer" }}>Done</button>
          </div>
        </div>
      )}
    </div>
  );
}
