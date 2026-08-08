/**
 * Verification score, per DEVELOPER_HANDOFF.md section 4.7:
 * Stage 1=5, 2=15, 3=20, 4=25, 5=10, 6=10, 7=10, 8=5  -> 100 total
 * 75+ => "Talentera Verified" gold badge tier
 */
const STAGE_POINTS = {
  1: 5,
  2: 15,
  3: 20,
  4: 25,
  5: 10,
  6: 10,
  7: 10,
  8: 5,
};

const GOLD_BADGE_THRESHOLD = 75;

function calculateVerificationScore(completedStages = []) {
  const score = completedStages.reduce(
    (sum, stage) => sum + (STAGE_POINTS[stage] || 0),
    0
  );
  return {
    score,
    maxScore: 100,
    badgeTier: score >= GOLD_BADGE_THRESHOLD ? "Talentera Verified" : "In Progress",
    isGoldBadge: score >= GOLD_BADGE_THRESHOLD,
  };
}

module.exports = { calculateVerificationScore, STAGE_POINTS, GOLD_BADGE_THRESHOLD };
