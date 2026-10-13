import React, { useEffect, useRef, useState } from "react";

/**
 * Dropdown with a search box. The user must pick one of `options` (type to filter, click to choose).
 * Props: value, options[], onChange(value), placeholder, inputStyle
 */
export default function SearchableSelect({ value, options = [], onChange, placeholder = "Search and select…", inputStyle }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [hi, setHi] = useState(-1);
  const wrap = useRef(null);

  useEffect(() => {
    function away(e) { if (wrap.current && !wrap.current.contains(e.target)) { setOpen(false); setQ(""); } }
    document.addEventListener("mousedown", away);
    return () => document.removeEventListener("mousedown", away);
  }, []);

  const needle = q.trim().toLowerCase();
  const list = needle ? options.filter((o) => o.toLowerCase().includes(needle)) : options;

  function pick(o) { onChange(o); setOpen(false); setQ(""); setHi(-1); }

  function key(e) {
    if (e.key === "ArrowDown") { e.preventDefault(); setOpen(true); setHi((h) => Math.min(h + 1, list.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHi((h) => Math.max(h - 1, 0)); }
    else if (e.key === "Enter") { e.preventDefault(); if (open && hi >= 0 && list[hi]) pick(list[hi]); else if (open && list.length === 1) pick(list[0]); }
    else if (e.key === "Escape") { setOpen(false); setQ(""); }
  }

  return (
    <div ref={wrap} style={{ position: "relative" }}>
      <input
        type="text"
        style={inputStyle}
        autoComplete="off"
        value={open ? q : (value || "")}
        placeholder={open && value ? value : placeholder}
        onFocus={() => { setOpen(true); setQ(""); }}
        onClick={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); setHi(-1); }}
        onKeyDown={key}
      />
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1.5px solid #CBD5E1", borderRadius: 10, boxShadow: "0 8px 24px rgba(15,23,42,0.18)", zIndex: 9999, maxHeight: 280, overflowY: "auto", textAlign: "left" }}>
          {list.length === 0 && <div style={{ padding: "10px 14px", fontSize: 13, color: "#64748B" }}>No match. Try another word, or pick an “Other …” option.</div>}
          {list.map((o, i) => (
            <div
              key={o}
              onMouseDown={(e) => { e.preventDefault(); pick(o); }}
              onMouseEnter={() => setHi(i)}
              style={{ padding: "8px 14px", fontSize: 13.5, color: "#0F172A", cursor: "pointer", background: i === hi ? "#F1F5F9" : o === value ? "#EFF6FF" : "transparent", borderBottom: "1px solid #F1F5F9", fontWeight: o === value ? 700 : 400 }}
            >
              {o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
