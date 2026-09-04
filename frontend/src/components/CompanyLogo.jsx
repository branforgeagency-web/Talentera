import React, { useState } from "react";

// Known top Healthcare RCM & Medical Coding employers branding palette
const BRAND_PRESETS = [
  {
    pattern: /omega\s*healthcare/i,
    name: "Omega Healthcare",
    short: "Ω",
    sub: "OMEGA",
    bg: "linear-gradient(135deg, #4C1D95 0%, #7C3AED 100%)",
    color: "#FFFFFF",
    accent: "#DDD6FE",
  },
  {
    pattern: /optum/i,
    name: "Optum",
    short: "O",
    sub: "OPTUM",
    bg: "linear-gradient(135deg, #C2410C 0%, #F97316 100%)",
    color: "#FFFFFF",
    accent: "#FED7AA",
  },
  {
    pattern: /cognizant/i,
    name: "Cognizant",
    short: "C",
    sub: "CTS",
    bg: "linear-gradient(135deg, #0A2540 0%, #0066FF 100%)",
    color: "#FFFFFF",
    accent: "#BFDBFE",
  },
  {
    pattern: /access\s*healthcare/i,
    name: "Access Healthcare",
    short: "AH",
    sub: "ACCESS",
    bg: "linear-gradient(135deg, #14532D 0%, #16A34A 100%)",
    color: "#FFFFFF",
    accent: "#BBF7D0",
  },
  {
    pattern: /r1\s*rcm/i,
    name: "R1 RCM",
    short: "R1",
    sub: "RCM",
    bg: "linear-gradient(135deg, #991B1B 0%, #DC2626 100%)",
    color: "#FFFFFF",
    accent: "#FECACA",
  },
  {
    pattern: /ags\s*health/i,
    name: "AGS Health",
    short: "AGS",
    sub: "HEALTH",
    bg: "linear-gradient(135deg, #0E7490 0%, #06B6D4 100%)",
    color: "#FFFFFF",
    accent: "#CFFAFE",
  },
  {
    pattern: /gebbs/i,
    name: "GeBBS Healthcare",
    short: "GB",
    sub: "GEBBS",
    bg: "linear-gradient(135deg, #1E3A8A 0%, #2563EB 100%)",
    color: "#FFFFFF",
    accent: "#BFDBFE",
  },
  {
    pattern: /corrohealth/i,
    name: "CorroHealth",
    short: "CH",
    sub: "CORRO",
    bg: "linear-gradient(135deg, #9A3412 0%, #EA580C 100%)",
    color: "#FFFFFF",
    accent: "#FFEDD5",
  },
  {
    pattern: /vee\s*tech/i,
    name: "Vee Technologies",
    short: "VT",
    sub: "VEE",
    bg: "linear-gradient(135deg, #312E81 0%, #4F46E5 100%)",
    color: "#FFFFFF",
    accent: "#C7D2FE",
  },
  {
    pattern: /thoughtflows/i,
    name: "ThoughtFlows",
    short: "TF",
    sub: "RCM",
    bg: "linear-gradient(135deg, #0A1F3D 0%, #1E3A8A 100%)",
    color: "#FFFFFF",
    accent: "#FDE68A",
  },
];

// Fallback palette generator for arbitrary company names
const GENERIC_PALETTES = [
  { bg: "linear-gradient(135deg, #0F172A 0%, #334155 100%)", color: "#F8FAFC" },
  { bg: "linear-gradient(135deg, #065F46 0%, #059669 100%)", color: "#ECFDF5" },
  { bg: "linear-gradient(135deg, #1E40AF 0%, #3B82F6 100%)", color: "#EFF6FF" },
  { bg: "linear-gradient(135deg, #581C87 0%, #9333EA 100%)", color: "#FAF5FF" },
  { bg: "linear-gradient(135deg, #831843 0%, #DB2777 100%)", color: "#FDF2F8" },
  { bg: "linear-gradient(135deg, #78350F 0%, #D97706 100%)", color: "#FFFBEB" },
];

function getBrandPreset(companyName = "") {
  const clean = String(companyName).trim();
  for (const p of BRAND_PRESETS) {
    if (p.pattern.test(clean)) return p;
  }
  // Deterministic fallback based on char code sum
  let hash = 0;
  for (let i = 0; i < clean.length; i++) hash += clean.charCodeAt(i);
  const pal = GENERIC_PALETTES[hash % GENERIC_PALETTES.length];

  // Extract up to 2 initials
  const parts = clean.split(/\s+/).filter(Boolean);
  let short = parts[0] ? parts[0][0].toUpperCase() : "CO";
  if (parts.length > 1 && parts[1]) {
    short += parts[1][0].toUpperCase();
  } else if (parts[0] && parts[0].length > 1) {
    short += parts[0][1].toUpperCase();
  }

  return {
    name: clean,
    short,
    sub: parts[0]?.substring(0, 5).toUpperCase() || "CORP",
    bg: pal.bg,
    color: pal.color,
    accent: "rgba(255,255,255,0.75)",
  };
}

export default function CompanyLogo({ companyName = "Company", logoUrl, size = 52 }) {
  const [imageFailed, setImageFailed] = useState(false);
  const brand = getBrandPreset(companyName);

  const containerStyle = {
    width: size,
    height: size,
    minWidth: size,
    minHeight: size,
    borderRadius: 12,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 2px 8px rgba(10,31,61,0.08)",
    position: "relative",
    overflow: "hidden",
    userSelect: "none",
    flexShrink: 0,
  };

  if (logoUrl && !imageFailed) {
    return (
      <div
        style={{
          ...containerStyle,
          background: "#FFFFFF",
          border: "1.5px solid #E2E8F0",
          padding: 3,
        }}
      >
        <img
          src={logoUrl}
          alt={companyName}
          onError={() => setImageFailed(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: 8,
          }}
        />
      </div>
    );
  }

  // Vector / branded badge display
  return (
    <div
      style={{
        ...containerStyle,
        background: brand.bg,
        border: "1.5px solid rgba(255,255,255,0.15)",
      }}
      title={companyName}
    >
      <div
        style={{
          fontFamily: "var(--font-display, sans-serif)",
          fontWeight: 900,
          fontSize: brand.short.length > 2 ? size * 0.28 : size * 0.38,
          color: brand.color,
          lineHeight: 1,
          letterSpacing: "-0.02em",
          textShadow: "0 1px 2px rgba(0,0,0,0.3)",
        }}
      >
        {brand.short}
      </div>
      {size >= 44 && (
        <span
          style={{
            fontSize: 7.5,
            fontWeight: 800,
            letterSpacing: "0.06em",
            color: brand.accent,
            textTransform: "uppercase",
            marginTop: 2,
            lineHeight: 1,
          }}
        >
          {brand.sub}
        </span>
      )}
    </div>
  );
}
