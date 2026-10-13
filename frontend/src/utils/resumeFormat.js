// Small date helpers for the resume Work Experience section.
// Dates are stored as "YYYY-MM" strings (from <input type="month">).
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

function parseYM(ym) {
  const m = /^(\d{4})-(\d{2})$/.exec(String(ym || "").trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function formatMonthYear(ym) {
  const p = parseYM(ym);
  return p ? `${MONTH_NAMES[p.month - 1]} ${p.year}` : "";
}

// Exact duration between start and end ("YYYY-MM"); end omitted = today. e.g. "1 year 6 months"
export function durationBetween(startYM, endYM) {
  const s = parseYM(startYM);
  if (!s) return "";
  const now = new Date();
  const e = parseYM(endYM) || { year: now.getFullYear(), month: now.getMonth() + 1 };
  const months = (e.year - s.year) * 12 + (e.month - s.month);
  if (months < 0) return "";
  if (months < 1) return "Less than 1 month";
  const y = Math.floor(months / 12);
  const m = months % 12;
  const parts = [];
  if (y > 0) parts.push(`${y} year${y === 1 ? "" : "s"}`);
  if (m > 0) parts.push(`${m} month${m === 1 ? "" : "s"}`);
  return parts.join(" ");
}

// "April 2025 – Present" / "April 2025 – June 2026"
export function formatDateRange(startYM, endYM, isCurrent) {
  const s = formatMonthYear(startYM);
  if (!s) return "";
  const e = isCurrent || !formatMonthYear(endYM) ? "Present" : formatMonthYear(endYM);
  return `${s} – ${e}`;
}
