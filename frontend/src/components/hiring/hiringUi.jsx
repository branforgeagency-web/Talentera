import React from "react";

export const STAGE_META = {
  applied: { label: "Applied", bg: "#F1F5F9", color: "#334155" },
  exam: { label: "Round 1 · Exam", bg: "#DBEAFE", color: "#1D4ED8" },
  technical: { label: "Round 2 · Technical", bg: "#EDE9FE", color: "#6D28D9" },
  hr: { label: "Round 3 · HR", bg: "#FEF3C7", color: "#B45309" },
  approval: { label: "Awaiting approval", bg: "#FFEDD5", color: "#C2410C" },
  offered: { label: "Offered", bg: "#DCFCE7", color: "#166534" },
  hold: { label: "On hold", bg: "#FEF9C3", color: "#854D0E" },
  rejected: { label: "Rejected", bg: "#FEE2E2", color: "#B91C1C" },
};

export function StageBadge({ stage }) {
  const m = STAGE_META[stage] || STAGE_META.applied;
  return <span style={{ background: m.bg, color: m.color, padding: "2px 9px", borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{m.label}</span>;
}

export function Pill({ children, bg = "#F1F5F9", color = "#334155" }) {
  return <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 800, whiteSpace: "nowrap" }}>{children}</span>;
}

export function Card({ title, right, children, style }) {
  return (
    <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 12, padding: 16, marginBottom: 14, ...style }}>
      {(title || right) && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 10 }}>
          <h3 style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "var(--navy, #0A1F3D)" }}>{title}</h3>
          <div>{right}</div>
        </div>
      )}
      {children}
    </div>
  );
}

export function Btn({ children, onClick, kind = "navy", disabled, small, style, type = "button", title }) {
  const kinds = {
    navy: { background: "var(--navy, #0A1F3D)", color: "#fff", border: "1px solid var(--navy, #0A1F3D)" },
    gold: { background: "var(--gold, #E5A82E)", color: "#0A1F3D", border: "1px solid var(--gold, #E5A82E)" },
    ghost: { background: "#fff", color: "#334155", border: "1px solid #CBD5E1" },
    green: { background: "#15803D", color: "#fff", border: "1px solid #15803D" },
    red: { background: "#fff", color: "#B91C1C", border: "1px solid #FCA5A5" },
  };
  return (
    <button
      type={type}
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{ ...kinds[kind], padding: small ? "5px 10px" : "8px 14px", borderRadius: 8, fontSize: small ? 11.5 : 12.5, fontWeight: 800, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.55 : 1, ...style }}
    >
      {children}
    </button>
  );
}

export const inputStyle = { padding: "7px 10px", fontSize: 12.5, borderRadius: 8, border: "1px solid #CBD5E1", background: "#fff", boxSizing: "border-box" };

export function Field({ label, children, style }) {
  return (
    <label style={{ display: "block", ...style }}>
      <span style={{ display: "block", fontSize: 10.5, fontWeight: 800, color: "#64748B", letterSpacing: "0.04em", marginBottom: 4 }}>{label}</span>
      {children}
    </label>
  );
}

export function Modal({ title, onClose, children, width = 560 }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(15,23,42,0.55)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }} onClick={onClose}>
      <div style={{ background: "#fff", borderRadius: 14, padding: 22, width: "100%", maxWidth: width, maxHeight: "90vh", overflowY: "auto" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--navy, #0A1F3D)" }}>{title}</h3>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", fontSize: 20, cursor: "pointer", color: "#64748B" }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Table({ head, children, empty }) {
  const rows = React.Children.toArray(children);
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, textAlign: "left" }}>
        <thead>
          <tr style={{ background: "var(--navy, #0A1F3D)", color: "#fff" }}>
            {head.map((h, i) => <th key={i} style={{ padding: "9px 10px", fontSize: 11, letterSpacing: "0.03em", whiteSpace: "nowrap" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={head.length} style={{ padding: 26, textAlign: "center", color: "#94A3B8" }}>{empty || "Nothing here yet."}</td></tr>
          ) : rows}
        </tbody>
      </table>
    </div>
  );
}

export const td = { padding: "9px 10px", borderBottom: "1px solid #F1F5F9", verticalAlign: "top" };
export const fmtDate = (d) => (d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "—");
export const fmtDay = (d) => (d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—");
