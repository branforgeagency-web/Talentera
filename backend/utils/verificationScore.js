/**
 * Talentera Score - the candidate's overall verification score (0-100).
 * Only Stages 1-6 are graded; Stage 7 (Resume) and Stage 8 (Career Passport)
 * are output/delivery stages - completing them packages and publishes what
 * was already earned, so they always contribute 0 points regardless of
 * completion status.
 *
 *   01 Identity (Basic + Aadhaar)        15
 *   02 Foundation (Academy & Training)   15
 *   03 Certification                     15
 *   04 Assessment (Flagship)             20
 *   05 Video Pitch (Portfolio Video)     15
 *   06 Live Chart (Co-Flagship)          20
 *   07 Resume (output only)               0
 *   08 Career Passport (output only)      0
 *
 * 75+ => "Talentera Verified" gold badge tier.
 *
 * This is the single source of truth for the Talentera Score across the
 * candidate's own dashboard, academy dashboards (routes/academy.js's
 * compute8Stages, via utils/talenteraScore.js), employer candidate
 * search/matching (routes/company.js, routes/public.js), and Aadhaar
 * verification (routes/aadhaar.js). Anywhere that needs the score should
 * call this function rather than compute its own version.
 */
const STAGE_POINTS = {
  1: 15,
  2: 15,
  3: 15,
  4: 20,
  5: 15,
  6: 20,
  7: 0,
  8: 0,
};

const GOLD_BADGE_THRESHOLD = 75;

// Live Chart (Stage 06) doesn't apply to AR Calling or Eligibility & Verification work, so it
// must never lower their profile. For these domains Stage 06 is left out of the score entirely
// and the remaining stages (worth 80) are rescaled to /100.
// Keep in sync with LIVE_CHART_EXEMPT_DOMAINS in routes/candidate.js and frontend/src/data/wizardStages.js.
const LIVE_CHART_EXEMPT_DOMAINS = ["Medical Billing", "AR Calling", "Accounts Receivable", "Eligibility & Verification"];
function isLiveChartExempt(candidate) {
  return LIVE_CHART_EXEMPT_DOMAINS.includes((candidate && candidate.stage2 && candidate.stage2.domain) || "");
}

// ---- Evidence checks -------------------------------------------------------------------
// Points are only earned for what the candidate has actually done. Being marked "completed"
// (or choosing a path) is not enough on its own - e.g. a Non-Certified candidate has no
// certification, and a candidate who never recorded the Video Pitch / AI interview has no
// Stage 5 evidence.
function hasRealCertification(s3 = {}) {
  const type = String(s3.certType || s3.status || "").toLowerCase();
  if (s3.nonCertified === true || s3.isCertified === false || s3.certStatus === "non-certified") return false;
  if (type.includes("non-cert") || type.includes("pursu")) return false;
  if (String(s3.certName || "").toLowerCase().startsWith("pursuing")) return false;
  const code = String(s3.certCode || "").toUpperCase();
  return (Array.isArray(s3.certifications) && s3.certifications.length > 0) || (!!code && code !== "NON-CERT");
}

function hasStage5Evidence(s5 = {}) {
  const num = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
  return !!(
    s5.videoUrl || s5.introVideoUrl || s5.proctoredInterviewVideoUrl || s5.mockInterviewVideoUrl ||
    num(s5.overallScore) || num(s5.aiScore) || num(s5.score) || s5.verified
  );
}

function calculateVerificationScore(completedStages = [], candidate = null) {
  let score = 0;
  const verifiedStages = [];
  const stageScores = {};
  const stage6Exempt = isLiveChartExempt(candidate);

  for (const stage of completedStages) {
    if (stage === 6 && stage6Exempt) {
      // Not required for this role - contributes nothing and is excluded from the maximum.
      continue;
    }
    if (stage === 1) {
      if (candidate && !(candidate.stage1?.aadhaarVerified === true || candidate.stage1?.aadhaarStatus === "VERIFIED")) {
        continue; // identity not actually verified yet
      }
      score += STAGE_POINTS[1];
      stageScores[1] = STAGE_POINTS[1];
      verifiedStages.push(1);
    } else if (stage === 2) {
      if (candidate && candidate.stage2?.verified !== true) {
        continue; // academy has not signed off on the training yet
      }
      if (!candidate) {
        score += STAGE_POINTS[2];
        stageScores[2] = STAGE_POINTS[2];
        verifiedStages.push(2);
      } else {
        const s2 = candidate.stage2 || {};
        const rawScore = s2.academyAssessmentScore !== undefined && s2.academyAssessmentScore !== null && s2.academyAssessmentScore !== "—"
          ? s2.academyAssessmentScore
          : (s2.assessmentScore !== undefined && s2.assessmentScore !== null ? s2.assessmentScore : s2.score);

        let step3Pts = 5;
        if (rawScore !== undefined && rawScore !== null && rawScore !== "—" && !isNaN(Number(String(rawScore).replace(/[^0-9.]/g, "")))) {
          const numScore = Number(String(rawScore).replace(/[^0-9.]/g, ""));
          if (numScore >= 80) {
            step3Pts = 5;
          } else if (numScore >= 60) {
            step3Pts = 4;
          } else {
            step3Pts = 3;
          }
        }
        const pts2 = (STAGE_POINTS[2] - 5) + step3Pts;
        score += pts2;
        stageScores[2] = pts2;
        verifiedStages.push(2);
      }
    } else if (stage === 3) {
      // Certification verification: only award full points if audit verified;
      // a submitted-but-not-yet-audited certification earns partial credit.
      if (candidate && !hasRealCertification(candidate.stage3 || {})) {
        continue; // non-certified / still pursuing: no certification, no points
      }
      if (!candidate || candidate.stage3?.certStatus === "verified" || candidate.stage3?.status === "verified" || candidate.stage3?.verified === true) {
        score += STAGE_POINTS[3];
        stageScores[3] = STAGE_POINTS[3];
        verifiedStages.push(3);
      } else {
        const pts3 = Math.round(STAGE_POINTS[3] * 0.75);
        score += pts3;
        stageScores[3] = pts3;
        verifiedStages.push(3);
      }
    } else if (stage === 4) {
      // Assessment (Flagship): points scale with the actual MCQ/proctored score,
      // not just binary completion.
      if (!candidate) {
        score += STAGE_POINTS[4];
        stageScores[4] = STAGE_POINTS[4];
        verifiedStages.push(4);
      } else {
        const fScore =
          candidate.stage4?.foundationScore !== undefined
            ? candidate.stage4.foundationScore
            : candidate.stage4?.score;
        if (candidate.stage4?.passed === true || (fScore !== undefined && fScore >= 70)) {
          score += STAGE_POINTS[4];
          stageScores[4] = STAGE_POINTS[4];
          verifiedStages.push(4);
        } else if (fScore !== undefined && fScore > 0) {
          const pts4 = Math.round((fScore / 100) * STAGE_POINTS[4]);
          score += pts4;
          stageScores[4] = pts4;
          verifiedStages.push(4);
        }
        // no recorded assessment score = nothing earned
      }
    } else if (stage === 5) {
      if (candidate && !hasStage5Evidence(candidate.stage5 || {})) {
        continue; // no video pitch / AI interview recorded
      }
      score += STAGE_POINTS[5];
      stageScores[5] = STAGE_POINTS[5];
      verifiedStages.push(5);
    } else if (stage === 6) {
      // Live Chart Practice (Co-Flagship): rescaled onto STAGE_POINTS[6] from
      // whatever raw scale Stage 6's own scoring (utils/stage6Score.js) or
      // evidence-path option produced.
      if (!candidate) {
        score += STAGE_POINTS[6];
        stageScores[6] = STAGE_POINTS[6];
        verifiedStages.push(6);
      } else {
        const s6 = candidate.stage6 || {};
        const opt = (s6.evidencePath || s6.option || "").toLowerCase();
        let pts = 0;
        if (s6.skipped) {
          continue;
        }
        if (typeof s6.verificationPoints === "number") {
          const rawMax = 10; // historical raw scale from utils/stage6Score.js
          pts = Math.min(STAGE_POINTS[6], Math.max(0, Math.round((s6.verificationPoints / rawMax) * STAGE_POINTS[6])));
          score += pts;
          stageScores[6] = pts;
          if (pts >= Math.round(STAGE_POINTS[6] * 0.3)) verifiedStages.push(6);
          continue;
        } else if (opt === "a" || opt.includes("api") || opt === "practicode") {
          pts = STAGE_POINTS[6];
        } else if (opt === "b" || opt.includes("academy") || opt === "upload") {
          pts = STAGE_POINTS[6];
        } else if (opt === "c" || opt.includes("self") || opt === "declare") {
          pts = Math.round(STAGE_POINTS[6] * 0.8);
        } else if (opt === "d" || opt.includes("none") || opt === "no_exposure") {
          pts = 0;
        } else if ((s6.totalCharts || 0) > 0) {
          pts = STAGE_POINTS[6];
        } else {
          pts = 0; // no charts logged = nothing earned
        }
        score += pts;
        stageScores[6] = pts;
        if (pts >= Math.round(STAGE_POINTS[6] * 0.8)) verifiedStages.push(6);
      }
    } else if (stage === 7) {
      // Output only (Resume) - tracked as completed, worth 0 points.
      stageScores[7] = 0;
      verifiedStages.push(7);
    } else if (stage === 8) {
      // Output only (Career Passport) - tracked as completed, worth 0 points.
      stageScores[8] = 0;
      verifiedStages.push(8);
    }
  }

  if (stage6Exempt) {
    score = Math.round((score / (100 - STAGE_POINTS[6])) * 100);
  }
  score = Math.min(100, Math.max(0, score));

  return {
    score,
    verificationScore: score,
    maxScore: 100,
    verifiedStages,
    stageScores,
    badgeTier: score >= GOLD_BADGE_THRESHOLD ? "Talentera Verified" : "In Progress",
    isGoldBadge: score >= GOLD_BADGE_THRESHOLD,
  };
}

module.exports = { calculateVerificationScore, STAGE_POINTS, GOLD_BADGE_THRESHOLD };
