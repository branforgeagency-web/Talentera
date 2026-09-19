/**
 * Joins the resume subtitle parts ("Role · Experience · Location") and drops repeats,
 * so a fresher whose role is also "Fresher" shows "Fresher · Indore" instead of "Fresher · Fresher · Indore".
 */
export function joinUnique(...parts) {
  const seen = new Set();
  const out = [];
  for (const p of parts) {
    const text = String(p ?? "").trim();
    if (!text) continue;
    const key = text.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(text);
  }
  return out.join(" · ");
}
