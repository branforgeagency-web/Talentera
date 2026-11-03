import React, { useState } from "react";

// Official badge logos live in /badges/ (*.svg with fallback support)
export function badgeLogoSrc(key, { certBody, certCode, academyLogoUrl } = {}) {
  const k = String(key || "").toLowerCase();
  if (k === "aadhaar") return "/badges/aadhaar.svg";
  if (k === "academy") return academyLogoUrl || "/badges/academy.svg";
  if (k === "cpc") return "/badges/cpc.svg";
  if (k === "ahima") return "/badges/ahima.svg";
  if (k === "aapc") return "/badges/aapc.svg";
  if (k.startsWith("cert")) {
    const code = String(certCode || "").toLowerCase();
    if (code.includes("cpc")) return "/badges/cpc.svg";
    const b = String(certBody || "AAPC").toLowerCase();
    if (b.includes("ahima")) return "/badges/ahima.svg";
    return "/badges/aapc.svg";
  }
  if (k === "assessment") return "/badges/assessment.svg";
  if (k === "video") return "/badges/video.svg";
  if (k === "charts") return "/badges/charts.svg";
  if (k === "resume") return "/badges/resume.svg";
  if (k === "track") return "/badges/track.svg";
  if (k === "charts-100") return "/badges/charts-100.svg";
  if (k === "charts-500") return "/badges/charts-500.svg";
  if (k === "multilingual") return "/badges/multilingual.svg";
  if (k === "gold-assessment") return "/badges/gold-assessment.svg";
  return "/badges/assessment.svg";
}

// Shows the logo image; if the file is missing/broken it shows `fallback` (the old icon) instead.
export default function BadgeLogo({ src, alt, size = 46, fallback = null, style = {} }) {
  const [failed, setFailed] = useState(false);
  if (!src || failed) return fallback;
  return (
    <img
      src={src}
      alt={alt || ""}
      onError={() => setFailed(true)}
      style={{
        width: size,
        height: size,
        objectFit: "contain",
        display: "block",
        borderRadius: size <= 32 ? "6px" : "12px",
        filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.10))",
        ...style,
      }}
    />
  );
}
