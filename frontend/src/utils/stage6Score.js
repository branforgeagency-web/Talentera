/**
 * Stage 6 (Live Chart) scoring.
 *
 * Every input here comes from Stage 6 itself - nothing is read from Stages 1-5.
 * The same logic lives in backend/utils/stage6Score.js (the server recomputes on save,
 * so the client value is only a live preview). Keep the two files identical.
 *
 * Live Chart Score (0-100), before the evidence-trust multiplier:
 *   Volume    40  total charts coded          (500+ charts = full marks)
 *   Accuracy  30  weighted avg accuracy       (50% = 0, 95%+ = full marks)
 *   Breadth   10  specialties with charts     (4+ specialties = full marks)
 *   Speed     10  weighted avg minutes/chart  (<= 8 min = full, >= 15 min = 0)
 *   Recency   10  most recent "last coded"    (<=30d 10, <=90d 6, <=180d 3, else 0)
 * Evidence trust multiplier:
 *   A platform figures 1.0 | B academy log 1.0 (0.6 until proof file uploaded)
 *   C self-declared 0.7    | D no exposure 0
 * Verification points (max 10, matches STAGE_POINTS[6]) = round(score / 10).
 */

export const STAGE6_MAX_POINTS = 10;
export const STAGE6_VERIFIED_MIN_POINTS = 3;

export const EVIDENCE_LABELS = {
  A: "Platform-Reported",
  B: "Academy Log",
  C: "Self-Declared",
  D: "No Exposure",
};

const DAY_MS = 24 * 60 * 60 * 1000;

const num = (v) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
};
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round1 = (v) => Math.round(v * 10) / 10;

export function getTier(totalCharts, overallAccuracy, evidencePath) {
  if (evidencePath === "D" || totalCharts <= 0) return "None";
  if (totalCharts >= 500 && overallAccuracy >= 90) return "Platinum";
  if (totalCharts >= 201 && overallAccuracy >= 85) return "Gold";
  if (totalCharts >= 51 && overallAccuracy >= 75) return "Silver";
  return "Bronze";
}

export function evidenceMultiplier(evidencePath, hasProofDoc) {
  if (evidencePath === "A") return 1;
  if (evidencePath === "B") return hasProofDoc ? 1 : 0.6;
  if (evidencePath === "C") return 0.7;
  return 0;
}

/**
 * @param {object} input  Stage 6 inputs only:
 *   evidencePath, specialtyCharts[{name,count,accuracy,timePerChart,lastCodedDate}],
 *   timePracticedHours, practicePeriodDays, hasProofDoc, now (optional, for tests)
 */
export function computeStage6Result(input = {}) {
  const evidencePath = ["A", "B", "C", "D"].includes(input.evidencePath) ? input.evidencePath : "C";
  const now = input.now ? new Date(input.now) : new Date();
  const rows = Array.isArray(input.specialtyCharts) ? input.specialtyCharts : [];
  const active = evidencePath === "D" ? [] : rows.filter((r) => num(r.count) > 0);

  const totalCharts = active.reduce((s, r) => s + Math.floor(num(r.count)), 0);
  const overallAccuracy = totalCharts
    ? round1(active.reduce((s, r) => s + Math.floor(num(r.count)) * clamp(num(r.accuracy), 0, 100), 0) / totalCharts)
    : 0;
  const avgTimePerChart = totalCharts
    ? round1(active.reduce((s, r) => s + Math.floor(num(r.count)) * (num(r.timePerChart) || 0), 0) / totalCharts)
    : 0;
  const timedCharts = active.filter((r) => num(r.timePerChart) > 0).reduce((s, r) => s + Math.floor(num(r.count)), 0);

  // Most recent coded date across specialties that actually have charts
  let lastCodedDate = null;
  for (const r of active) {
    const d = r.lastCodedDate ? new Date(r.lastCodedDate) : null;
    if (d && !isNaN(d) && (!lastCodedDate || d > lastCodedDate)) lastCodedDate = d;
  }
  const daysSinceLast = lastCodedDate ? Math.max(0, Math.floor((now - lastCodedDate) / DAY_MS)) : null;

  const hours = Math.max(0, num(input.timePracticedHours));
  const periodDays = Math.max(0, Math.floor(num(input.practicePeriodDays)));
  const chartsPerHour = hours > 0 ? round1(totalCharts / hours) : 0;
  const chartsPerDay = periodDays > 0 ? round1(totalCharts / periodDays) : 0;
  // Anti-fraud rule from the "How Stage 06 works" card: 500 charts in 30 days => auto-review
  const needsReview = periodDays > 0 && totalCharts / periodDays > 500 / 30;

  const volume = round1(Math.min(totalCharts / 500, 1) * 40);
  const accuracy = totalCharts ? round1(clamp((overallAccuracy - 50) / 45, 0, 1) * 30) : 0;
  const breadth = round1(Math.min(active.filter((r) => String(r.name || "").trim()).length / 4, 1) * 10);
  const speed = timedCharts ? round1(clamp((15 - avgTimePerChart) / 7, 0, 1) * 10) : 0;
  let recency = 0;
  if (daysSinceLast !== null) recency = daysSinceLast <= 30 ? 10 : daysSinceLast <= 90 ? 6 : daysSinceLast <= 180 ? 3 : 0;

  const rawScore = round1(volume + accuracy + breadth + speed + recency);
  const multiplier = evidenceMultiplier(evidencePath, !!input.hasProofDoc);
  const score = Math.round(rawScore * multiplier);
  const points = Math.round(score / 10);
  const tier = getTier(totalCharts, overallAccuracy, evidencePath);

  return {
    evidencePath,
    totalCharts,
    overallAccuracy,
    avgTimePerChart,
    activeSpecialties: active.length,
    lastCodedDate: lastCodedDate ? lastCodedDate.toISOString() : null,
    daysSinceLast,
    chartsPerHour,
    chartsPerDay,
    needsReview,
    breakdown: {
      volume: { score: volume, max: 40 },
      accuracy: { score: accuracy, max: 30 },
      breadth: { score: breadth, max: 10 },
      speed: { score: speed, max: 10 },
      recency: { score: recency, max: 10 },
    },
    rawScore,
    multiplier,
    stageScore: score,
    points,
    maxPoints: STAGE6_MAX_POINTS,
    tier,
    isVerifiedStage: evidencePath !== "D" && points >= STAGE6_VERIFIED_MIN_POINTS,
  };
}
