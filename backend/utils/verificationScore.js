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

function calculateVerificationScore(completedStages = [], candidate = null) {
  let score = 0;
  const verifiedStages = [];

  for (const stage of completedStages) {
    if (stage === 1) {
      score += STAGE_POINTS[1];
      verifiedStages.push(1);
    } else if (stage === 2) {
      score += STAGE_POINTS[2];
      verifiedStages.push(2);
    } else if (stage === 3) {
      // Certification verification: only award full 20 pts if audit verified
      if (!candidate || candidate.stage3?.certStatus === "verified") {
        score += STAGE_POINTS[3];
        verifiedStages.push(3);
      }
    } else if (stage === 4) {
      // Assessment verification: only award points if passed or foundationScore >= 70
      if (!candidate) {
        score += STAGE_POINTS[4];
        verifiedStages.push(4);
      } else {
        const fScore =
          candidate.stage4?.foundationScore !== undefined
            ? candidate.stage4.foundationScore
            : candidate.stage4?.score;
        if (candidate.stage4?.passed === true || (fScore !== undefined && fScore >= 70)) {
          score += STAGE_POINTS[4];
          verifiedStages.push(4);
        } else if (fScore !== undefined && fScore > 0) {
          score += Math.round((fScore / 100) * STAGE_POINTS[4]);
        }
      }
    } else if (stage === 5) {
      score += STAGE_POINTS[5];
      verifiedStages.push(5);
    } else if (stage === 6) {
      if (!candidate) {
        score += STAGE_POINTS[6];
        verifiedStages.push(6);
      } else {
        const opt = candidate.stage6?.option;
        const pts = opt === "upload" ? 7 : opt === "declare" ? 3 : 10;
        score += pts;
        if (pts >= 7) verifiedStages.push(6);
      }
    } else if (stage === 7) {
      score += STAGE_POINTS[7];
      verifiedStages.push(7);
    } else if (stage === 8) {
      score += STAGE_POINTS[8];
      verifiedStages.push(8);
    }
  }

  return {
    score,
    maxScore: 100,
    verifiedStages,
    badgeTier: score >= GOLD_BADGE_THRESHOLD ? "Talentera Verified" : "In Progress",
    isGoldBadge: score >= GOLD_BADGE_THRESHOLD,
  };
}

module.exports = { calculateVerificationScore, STAGE_POINTS, GOLD_BADGE_THRESHOLD };
