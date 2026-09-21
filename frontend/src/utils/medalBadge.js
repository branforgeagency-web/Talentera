// Platinum / Gold / Silver / Bronze badges for resume scorecards (replaces raw /100 scores).
export const MEDAL_TIERS = {
  Platinum: { emoji: "💎", from: "#E8EEF9", to: "#8FA3D1", solid: "#B7C4E4", color: "#0F1B3D", border: "#8FA3D1" },
  Gold:     { emoji: "🥇", from: "#F8DC7A", to: "#DAA520", solid: "#F2C744", color: "#0F1B3D", border: "#C99A1B" },
  Silver:   { emoji: "🥈", from: "#E3E7EC", to: "#8B9199", solid: "#C0C4CA", color: "#0F1B3D", border: "#8B9199" },
  Bronze:   { emoji: "🥉", from: "#E8B37C", to: "#A9631F", solid: "#C7813A", color: "#FFFFFF", border: "#A9631F" },
  Unrated:  { emoji: "⏳", from: "#F1F5F9", to: "#E2E8F0", solid: "#E2E8F0", color: "#64748B", border: "#CBD5E1" },
};

// Uses the stored medal when it is one of the four tiers, otherwise derives it from the score.
export function getMedalTier(score, storedMedal) {
  if (storedMedal && ["Platinum", "Gold", "Silver", "Bronze"].includes(storedMedal)) return storedMedal;
  const n = Number(score);
  if (!Number.isFinite(n) || score === null || score === undefined) return "Unrated";
  if (n >= 90) return "Platinum";
  if (n >= 85) return "Gold";
  if (n >= 70) return "Silver";
  if (n >= 50) return "Bronze";
  return "Unrated";
}

export function medalLabel(tier) {
  const t = MEDAL_TIERS[tier] || MEDAL_TIERS.Unrated;
  return `${t.emoji} ${tier === "Unrated" ? "Not yet rated" : tier}`;
}

// React inline style for the badge pill.
export function medalBadgeStyle(tier, fontSize = 12) {
  const t = MEDAL_TIERS[tier] || MEDAL_TIERS.Unrated;
  return {
    display: "inline-flex", alignItems: "center", gap: 5,
    background: `linear-gradient(135deg, ${t.from}, ${t.to})`,
    color: t.color, border: `1px solid ${t.border}`,
    padding: "4px 12px", borderRadius: 999, fontSize, fontWeight: 800, letterSpacing: 0.3,
  };
}

// HTML string version for PDF/Word export (solid colour so Word renders it too).
export function medalBadgeHtml(tier) {
  const t = MEDAL_TIERS[tier] || MEDAL_TIERS.Unrated;
  return `<span style="display:inline-block; background-color:${t.solid}; color:${t.color}; border:1pt solid ${t.border}; padding:2pt 9pt; border-radius:10pt; font-size:10pt; font-weight:bold;">${medalLabel(tier)}</span>`;
}
