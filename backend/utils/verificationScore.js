/**
 * Talentera Score - the candidate's overall verification score (0-100).
 * Only Stages 1-6 are graded; Stage 7 (Resume) and Stage 8 (Career Passport)
 * are output/delivery stages - completing them packages and publishes what
 * was already earned, so they always contribute 0 points regardless of
 * completion status.
 *
 * Fresher Candidate Points (Unchanged):
 *   01 Identity (Basic + Aadhaar)        15
 *   02 Foundation (Academy & Training)   15
 *   03 Certification                     15 (up to 20 when verified)
 *   04 Assessment (Flagship)             20
 *   05 Video Pitch (Portfolio Video)     15
 *   06 Live Chart (Co-Flagship)          20
 *   07 Resume (output only)               0
 *   08 Career Passport (output only)      0
 *   Total = 100
 *
 * Experienced Candidate Points (Option A):
 *   01 Identity (Basic + Aadhaar)        15
 *   02 Experience Level & Proof          25 (Experience tier up to 20 pts + proof 5 pts)
 *   03 Certification (5 pts per cert)    20 (up to 4 certs × 5 pts = 20 pts)
 *   04 Assessment (Exempt)                0 (Exempt — skipped for experienced)
 *   05 Video Pitch & Communication       15
 *   06 Live Charts / Production          25
 *   07 Resume (output only)               0
 *   08 Career Passport (output only)      0
 *   Total = 100
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

const EXPERIENCED_STAGE_POINTS = {
  1: 15,
  2: 25,
  3: 20,
  4: 0,
  5: 15,
  6: 25,
  7: 0,
  8: 0,
};

const GOLD_BADGE_THRESHOLD = 75;

// Experienced candidates skip Stage 04 Assessment and follow the experienced points model.
function isExperiencedCandidate(candidate) {
  if (!candidate) return false;
  const s1Exp = String(candidate.stage1?.experience || candidate.stage1?.experienceLevel || "");
  const rootExp = String(candidate.experience || candidate.experienceLevel || "");
  return /exp/i.test(s1Exp) || /exp/i.test(rootExp);
}

// Fixed credit for the two "no evidence" cases the business rules give 15 points for (Freshers):
//  - a Non-Trained (self-trained) candidate who skips Live Charts / has no chart exposure
//  - a candidate who chose Non-Certified in Stage 3
const SKIP_CREDIT_POINTS = 15;

// Keep in sync with isSelfTrainedCandidate() in routes/candidate.js and frontend/src/data/wizardStages.js.
const SELF_SOURCE_RE = /self[\s-]?(learning|study|taught|trained)|youtube|udemy|coursera|\bedx\b|online course|aapc official|ahima study|blogs?,? forums|on-the-job/i;
function isSelfTrainedCandidate(candidate) {
  const s2 = (candidate && candidate.stage2) || {};
  const level = String(s2.trainingLevel || s2.level || "");
  const source = String(s2.selfLearningSource || s2.academyName || s2.instituteName || "");
  return Boolean(
    s2.trainingPath === "self" || s2.trainingPath === "non_trained" || s2.trainingPath === "non-trained" ||
    s2.isNonTrained || s2.isSelfTrained || s2.trainingType === "self" ||
    (candidate && (candidate.trainingPath === "self" || candidate.trainingPath === "non_trained" || candidate.trainingPath === "non-trained" || candidate.isSelfTrained || candidate.isNonTrained)) ||
    s2.selfLearningSource || /non[\s-]?trained/i.test(level) || SELF_SOURCE_RE.test(source)
  );
}

function isNonCertified(s3 = {}) {
  const type = String(s3.certType || s3.status || "").toLowerCase();
  return s3.nonCertified === true || s3.isCertified === false || s3.certStatus === "non-certified" || type.includes("non-cert");
}

// ---- Evidence checks -------------------------------------------------------------------
function hasRealCertification(s3 = {}) {
  const type = String(s3.certType || s3.status || "").toLowerCase();
  if (s3.nonCertified === true || s3.isCertified === false || s3.certStatus === "non-certified") return false;
  if (type.includes("non-cert") || type.includes("pursu")) return false;
  if (String(s3.certName || "").toLowerCase().startsWith("pursuing")) return false;
  const code = String(s3.certCode || "").toUpperCase();
  return (Array.isArray(s3.certifications) && s3.certifications.length > 0) || (!!code && code !== "NON-CERT");
}

// Number of certifications the candidate has listed.
function countCertifications(s3 = {}) {
  if (isNonCertified(s3)) return 0;
  const arr = Array.isArray(s3.certifications) ? s3.certifications.filter((c) => c && (c.certName || c.name || c.certCode || c.code || c.memberId)) : [];
  if (arr.length > 0) return arr.length;
  return hasRealCertification(s3) ? 1 : 0;
}

// A certificate counts as verified when staff audited it OR the AAPC / issuing-body authenticity
// validation passed (isReal === true). A staff rejection always wins.
function isCertVerified(s3 = {}) {
  if (s3.certStatus === "rejected") return false;
  if (s3.certStatus === "verified" || s3.status === "verified" || s3.verified === true) return true;
  if (s3.isReal === true) return true;
  return Array.isArray(s3.certifications) && s3.certifications.some((c) => c && c.isReal === true);
}

function hasStage5Evidence(s5 = {}) {
  const num = (v) => v !== undefined && v !== null && v !== "" && !isNaN(Number(v));
  return !!(
    s5.videoUrl || s5.introVideoUrl || s5.proctoredInterviewVideoUrl || s5.mockInterviewVideoUrl ||
    num(s5.overallScore) || num(s5.aiScore) || num(s5.score) || s5.verified
  );
}

/**
 * Experienced Candidate - Stage 2: Experience Level & Proof points (Max 25 pts)
 * - Years of experience tier: up to 20 pts
 *   - Less than 1 yr: 8 pts
 *   - 1 – 2 yrs: 12 pts
 *   - 2 – 3 yrs: 15 pts
 *   - 3 – 5 yrs: 18 pts
 *   - 5+ yrs (5–8 yrs, 8+ yrs): 20 pts
 * - Proof document (relieving letter, payslip, certDocUrl, etc.): +5 pts
 */
function getExperiencedStage2Points(s2 = {}) {
  let expPts = 10; // Baseline for experienced
  const expStr = String(s2.totalExperience || s2.experience || "").toLowerCase().trim();

  if (expStr.includes("less") || expStr.includes("< 1") || expStr.includes("0.") || expStr.includes("month")) {
    expPts = 8;
  } else if (expStr.includes("1 – 2") || expStr.includes("1-2") || expStr.includes("1 to 2") || expStr === "1" || expStr.startsWith("1 ")) {
    expPts = 12;
  } else if (expStr.includes("2 – 3") || expStr.includes("2-3") || expStr.includes("2 to 3") || expStr === "2" || expStr.startsWith("2 ")) {
    expPts = 15;
  } else if (expStr.includes("3 – 5") || expStr.includes("3-5") || expStr.includes("3 to 5") || expStr === "3" || expStr === "4") {
    expPts = 18;
  } else if (
    expStr.includes("5 – 8") || expStr.includes("5-8") || expStr.includes("8+") || expStr.includes("5+") ||
    expStr.includes("5 to 8") || expStr.includes("8 plus") || expStr.includes("10") || expStr.includes("7") || expStr.includes("6")
  ) {
    expPts = 20;
  } else {
    const match = expStr.match(/(\d+(\.\d+)?)/);
    if (match) {
      const yrs = parseFloat(match[1]);
      if (yrs < 1) expPts = 8;
      else if (yrs < 2) expPts = 12;
      else if (yrs < 3) expPts = 15;
      else if (yrs < 5) expPts = 18;
      else expPts = 20;
    } else if (Array.isArray(s2.workHistory) && s2.workHistory.length > 0) {
      const totalYrs = s2.workHistory.reduce((sum, w) => sum + (parseFloat(w.experienceYears || w.years || w.duration) || 0), 0);
      if (totalYrs < 1 && totalYrs > 0) expPts = 8;
      else if (totalYrs < 2 && totalYrs >= 1) expPts = 12;
      else if (totalYrs < 3 && totalYrs >= 2) expPts = 15;
      else if (totalYrs < 5 && totalYrs >= 3) expPts = 18;
      else if (totalYrs >= 5) expPts = 20;
    }
  }

  // Document proof: +5 pts
  const hasProof = Boolean(
    s2.proofDocUrl || s2.certDocUrl || s2.relievingLetterUrl || s2.payslipUrl || s2.experienceDocUrl || s2.docUrl || s2.employmentStatus === "working"
  );
  if (hasProof) {
    expPts += 5;
  }

  return Math.min(25, expPts);
}

/**
 * Experienced Candidate - Stage 3: Per-Certificate Points (Max 20 pts)
 * 5 points for each certificate added (up to 4 certificates = 20 pts).
 */
function getExperiencedStage3Points(s3 = {}) {
  if (isNonCertified(s3) || s3.certStatus === "rejected") {
    return 0;
  }
  const certCount = countCertifications(s3);
  const validCount = Math.min(4, Math.max(0, certCount));
  return validCount * 5;
}

/**
 * Experienced Candidate - Stage 6: Live Charts & Production Exposure (Max 25 pts)
 */
function getExperiencedStage6Points(s6 = {}) {
  if (s6.skipped) return 0;
  if (typeof s6.verificationPoints === "number") {
    const rawMax = 10;
    return Math.min(25, Math.max(0, Math.round((s6.verificationPoints / rawMax) * 25)));
  }
  const opt = (s6.evidencePath || s6.option || "").toLowerCase();
  if (opt === "a" || opt.includes("api") || opt === "practicode") {
    return 25;
  }
  if (opt === "b" || opt.includes("academy") || opt === "upload") {
    return 25;
  }
  if (opt === "c" || opt.includes("self") || opt === "declare") {
    return 20;
  }
  if ((s6.totalCharts || 0) > 0) {
    return 25;
  }
  if (opt === "d" || opt.includes("none") || opt === "no_exposure") {
    return 0;
  }
  return 0;
}

function calculateVerificationScore(completedStages = [], candidate = null) {
  let score = 0;
  const verifiedStages = [];
  const stageScores = {};
  const experienced = isExperiencedCandidate(candidate);

  for (const stage of completedStages) {
    if (stage === 1) {
      if (candidate && !(candidate.stage1?.aadhaarVerified === true || candidate.stage1?.aadhaarStatus === "VERIFIED")) {
        continue; // identity not actually verified yet
      }
      score += STAGE_POINTS[1]; // 15 pts
      stageScores[1] = STAGE_POINTS[1];
      verifiedStages.push(1);
    } else if (stage === 2) {
      if (experienced) {
        const pts2 = getExperiencedStage2Points(candidate?.stage2 || {});
        score += pts2;
        stageScores[2] = pts2;
        verifiedStages.push(2);
      } else {
        score += STAGE_POINTS[2]; // 15 pts
        stageScores[2] = STAGE_POINTS[2];
        verifiedStages.push(2);
      }
    } else if (stage === 3) {
      if (experienced) {
        // Option A: 5 points per certificate added (up to 4 certs = 20 pts)
        const pts3 = getExperiencedStage3Points(candidate?.stage3 || {});
        score += pts3;
        stageScores[3] = pts3;
        if (pts3 > 0 || isNonCertified(candidate?.stage3 || {})) {
          verifiedStages.push(3);
        }
      } else {
        // Fresher Stage 3 logic unchanged
        if (candidate && !hasRealCertification(candidate.stage3 || {})) {
          if (isNonCertified(candidate.stage3 || {})) {
            score += SKIP_CREDIT_POINTS; // 15 pts
            stageScores[3] = SKIP_CREDIT_POINTS;
            verifiedStages.push(3);
          }
          continue;
        }
        if (!candidate || isCertVerified(candidate.stage3 || {})) {
          const pts3 = STAGE_POINTS[3] + 5; // 20 pts (15 + 5 bonus)
          score += pts3;
          stageScores[3] = pts3;
          verifiedStages.push(3);
        } else {
          score += SKIP_CREDIT_POINTS; // 15 pts
          stageScores[3] = SKIP_CREDIT_POINTS;
          verifiedStages.push(3);
        }
      }
    } else if (stage === 4) {
      if (experienced) {
        // Option A: Exempt for experienced candidates — 0 points
        stageScores[4] = 0;
        verifiedStages.push(4);
      } else {
        // Fresher Stage 4 logic unchanged (20 pts)
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
        }
      }
    } else if (stage === 5) {
      if (candidate && !hasStage5Evidence(candidate.stage5 || {})) {
        continue; // no video pitch recorded
      }
      const pts5 = STAGE_POINTS[5]; // 15 pts
      score += pts5;
      stageScores[5] = pts5;
      verifiedStages.push(5);
    } else if (stage === 6) {
      if (experienced) {
        // Option A: Live Charts & Production Exposure — max 25 pts
        const pts6 = getExperiencedStage6Points(candidate?.stage6 || {});
        score += pts6;
        stageScores[6] = pts6;
        if (pts6 >= 15) verifiedStages.push(6);
      } else {
        // Fresher Stage 6 logic unchanged (max 20 pts)
        if (!candidate) {
          score += STAGE_POINTS[6];
          stageScores[6] = STAGE_POINTS[6];
          verifiedStages.push(6);
        } else {
          const s6 = candidate.stage6 || {};
          const opt = (s6.evidencePath || s6.option || "").toLowerCase();
          let pts = 0;
          if (s6.skipped) {
            if (isSelfTrainedCandidate(candidate)) {
              score += SKIP_CREDIT_POINTS;
              stageScores[6] = SKIP_CREDIT_POINTS;
            }
            continue;
          }
          if (typeof s6.verificationPoints === "number") {
            const rawMax = 10;
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
            pts = isSelfTrainedCandidate(candidate) ? SKIP_CREDIT_POINTS : 0;
          } else if ((s6.totalCharts || 0) > 0) {
            pts = STAGE_POINTS[6];
          } else {
            pts = isSelfTrainedCandidate(candidate) ? SKIP_CREDIT_POINTS : 0;
          }
          score += pts;
          stageScores[6] = pts;
          if (pts >= Math.round(STAGE_POINTS[6] * 0.8)) verifiedStages.push(6);
        }
      }
    } else if (stage === 7) {
      stageScores[7] = 0;
      verifiedStages.push(7);
    } else if (stage === 8) {
      stageScores[8] = 0;
      verifiedStages.push(8);
    }
  }

  // Ensure any completed or skipped stage has an explicit score entry (defaults to 0 if skipped)
  completedStages.forEach((st) => {
    if (stageScores[st] === undefined) {
      stageScores[st] = 0;
    }
  });

  // Experienced candidates: Stage 2 work history auto-credits once identity is verified (if not already processed)
  // Only when the stage was deliberately skipped - finishing Stage 1 alone must show 15, not 30.
  if (candidate && experienced && verifiedStages.includes(1) && stageScores[2] === undefined && candidate.stage2?.skipped === true) {
    const pts2 = getExperiencedStage2Points(candidate.stage2 || {});
    score += pts2;
    stageScores[2] = pts2;
    verifiedStages.push(2);
  }

  // Experienced candidates: Stage 4 is always marked exempt (0 pts, in verifiedStages) once identity is verified
  if (candidate && experienced && verifiedStages.includes(1) && stageScores[4] === undefined) {
    stageScores[4] = 0;
    verifiedStages.push(4);
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

module.exports = {
  calculateVerificationScore,
  isExperiencedCandidate,
  isNonCertified,
  hasRealCertification,
  countCertifications,
  getExperiencedStage2Points,
  getExperiencedStage3Points,
  getExperiencedStage6Points,
  STAGE_POINTS,
  EXPERIENCED_STAGE_POINTS,
  GOLD_BADGE_THRESHOLD,
};
