import React, { useState, useEffect, useRef } from "react";

// A dropdown you can type into to filter the options (used for company and work-location pickers).
// `value` is the selected option (or `otherValue` when the "Other" entry is chosen).
export default function SearchableSelect({
  value,
  options = [],
  onChange,
  placeholder = "Select",
  searchPlaceholder = "Type to search…",
  otherValue,
  otherLabel,
  disabled = false,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const wrapRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const q = query.trim().toLowerCase();
  const tokens = q.split(/[^a-z0-9]+/).filter(Boolean);
  const filtered = q
    ? options.filter((o) => {
        const ol = o.toLowerCase();
        return ol.includes(q) || tokens.every((t) => ol.includes(t));
      })
    : options;
  // Names that start with the search text come first
  const shown = q ? [...filtered.filter((o) => o.toLowerCase().startsWith(q)), ...filtered.filter((o) => !o.toLowerCase().startsWith(q))] : filtered;
  const showOther = otherValue !== undefined && (!q || (otherLabel || "other").toLowerCase().includes(q) || shown.length === 0);
  const rows = [...shown, ...(showOther ? [otherValue] : [])];

  const selectedLabel = value === otherValue && otherValue !== undefined ? otherLabel : value;

  const choose = (v) => {
    onChange(v);
    setOpen(false);
    setQuery("");
  };

  const openList = () => {
    if (disabled) return;
    setOpen(true);
    setHighlight(0);
    setTimeout(() => inputRef.current && inputRef.current.focus(), 0);
  };

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, rows.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (rows[highlight] !== undefined) choose(rows[highlight]);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div ref={wrapRef} style={{ position: "relative" }}>
      {open ? (
        <input
          ref={inputRef}
          type="text"
          value={query}
          autoComplete="off"
          placeholder={searchPlaceholder}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlight(0);
          }}
          onKeyDown={onKeyDown}
          style={{ width: "100%", boxSizing: "border-box" }}
        />
      ) : (
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          onClick={openList}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
              e.preventDefault();
              openList();
            }
          }}
          style={{
            width: "100%",
            boxSizing: "border-box",
            padding: "12px 38px 12px 14px",
            border: "1.5px solid #E2E8F0",
            borderRadius: 10,
            background: disabled ? "#F1F5F9" : "#FFFFFF",
            color: selectedLabel ? "#0F172A" : "#94A3B8",
            fontSize: 14,
            cursor: disabled ? "not-allowed" : "pointer",
            position: "relative",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {selectedLabel || placeholder}
          <i className="fa-solid fa-chevron-down" style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: "#94A3B8" }} />
        </div>
      )}
      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            background: "#FFFFFF",
            border: "1.5px solid #CBD5E1",
            borderRadius: 10,
            boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
            zIndex: 9999,
            maxHeight: 260,
            overflowY: "auto",
          }}
        >
          {rows.length === 0 && <div style={{ padding: "10px 14px", fontSize: 13, color: "#94A3B8" }}>No matches</div>}
          {rows.map((o, idx) => (
            <div
              key={o}
              onMouseDown={(e) => {
                e.preventDefault();
                choose(o);
              }}
              onMouseEnter={() => setHighlight(idx)}
              style={{
                padding: "10px 14px",
                cursor: "pointer",
                fontSize: 13.5,
                color: o === otherValue ? "#1D4ED8" : "#334155",
                fontWeight: o === value ? 700 : 400,
                background: idx === highlight ? "#F1F5F9" : "transparent",
                borderTop: o === otherValue && idx > 0 ? "1px solid #F1F5F9" : "none",
              }}
            >
              {o === otherValue ? otherLabel : o}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
