import React, { useEffect, useRef, useState } from "react";
import { loadColleges, searchColleges, searchLocations } from "../utils/collegeData.js";

/**
 * Searchable dropdown fed by the college sheets.
 *  mode="college"  → searches college names; onPick(record)
 *  mode="location" → searches districts (optionally within `state`); onPick({district, state})
 * Free text is always allowed (value/onChange), so a college that is not in the list can still be typed.
 */
export default function CollegePicker({ mode = "college", value, onChange, onPick, state = "", placeholder, inputStyle, className, required, disabled }) {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(false);
  const [hi, setHi] = useState(-1);
  const [failed, setFailed] = useState(false);
  const wrap = useRef(null);

  useEffect(() => {
    function away(e) { if (wrap.current && !wrap.current.contains(e.target)) setOpen(false); }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  function ensure() {
    if (!data && !failed) loadColleges().then(setData).catch(() => setFailed(true));
  }

  const q = String(value || "");
  const results = !open || !data ? [] : mode === "college"
    ? searchColleges(data, q, { state })
    : searchLocations(data, q, { state });

  function pick(r) {
    if (mode === "college") { onChange(r.name); onPick && onPick(r); }
    else { onChange(r.district); onPick && onPick(r); }
    setOpen(false); setHi(-1);
  }

  function key(e) {
    if (!open) return;
    if (e.key === "ArrowDown") { e.preventDefault(); setHi((h) => Math.min(h + 1, results.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { if (hi >= 0 && results[hi]) { e.preventDefault(); pick(results[hi]); } else { e.preventDefault(); setOpen(false); } }
    else if (e.key === "Escape") setOpen(false);
  }

  const lower = q.trim().toLowerCase();
  function hl(text) {
    const i = lower ? text.toLowerCase().indexOf(lower) : -1;
    if (i < 0) return text;
    return <>{text.slice(0, i)}<strong style={{ color: "#1D4ED8" }}>{text.slice(i, i + lower.length)}</strong>{text.slice(i + lower.length)}</>;
  }

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <input
        type="text"
        className={className}
        style={inputStyle}
        required={required}
        disabled={disabled}
        autoComplete="off"
        value={q}
        placeholder={placeholder || (mode === "college" ? "Search your college…" : "Search district / city…")}
        onFocus={() => { ensure(); setOpen(true); }}
        onChange={(e) => { ensure(); onChange(e.target.value); setOpen(true); setHi(-1); }}
        onKeyDown={key}
      />
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #CBD5E1", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.18)", zIndex: 9999, maxHeight: 280, overflowY: "auto", textAlign: "left" }}>
          {!data && <div style={{ padding: "10px 14px", fontSize: 13, color: "#64748B" }}>{failed ? "List unavailable — type it manually." : "Loading list…"}</div>}
          {data && results.length === 0 && (
            <div style={{ padding: "10px 14px", fontSize: 13, color: "#334155" }}>
              {q.trim() ? <>No match in the list. Use <strong style={{ color: "#1D4ED8" }}>{q.trim()}</strong> as entered.</> : "Start typing to search…"}
            </div>
          )}
          {results.map((r, idx) => (
            <div
              key={mode === "college" ? `${r.name}|${r.district}|${idx}` : `${r.district}|${r.state}`}
              onMouseDown={(e) => { e.preventDefault(); pick(r); }}
              onMouseEnter={() => setHi(idx)}
              style={{ padding: "8px 14px", cursor: "pointer", background: idx === hi ? "#F1F5F9" : "transparent", borderBottom: "1px solid #F1F5F9" }}
            >
              {mode === "college" ? (
                <>
                  <div style={{ fontSize: 13.5, color: "#0F172A", lineHeight: 1.3 }}>{hl(r.name)}</div>
                  <div style={{ fontSize: 11.5, color: "#64748B" }}>{[r.district, r.state].filter(Boolean).join(", ")}{r.type ? ` · ${r.type}` : ""}</div>
                </>
              ) : (
                <div style={{ fontSize: 13.5, color: "#0F172A" }}>{hl(r.district)}<span style={{ color: "#64748B", fontSize: 11.5 }}>{state ? "" : `, ${r.state}`}</span></div>
              )}
            </div>
          ))}
          {data && results.length >= 100 && <div style={{ padding: "6px 14px", fontSize: 11.5, color: "#94A3B8" }}>Showing top 100 — keep typing to narrow down.</div>}
        </div>
      )}
    </div>
  );
}
