import React from "react";

// Small "about N minutes" pill used on the registration / onboarding screens of every dashboard.
export default function TimeEstimate({ children, dark = false, style }) {
  return (
    <span
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 700, lineHeight: 1.3,
        padding: "4px 10px", borderRadius: 999,
        background: dark ? "rgba(255,255,255,0.12)" : "#FEF3C7",
        color: dark ? "rgba(255,255,255,0.9)" : "#92400E",
        ...style,
      }}
    >
      <i className="fa-regular fa-clock" /> {children}
    </span>
  );
}
