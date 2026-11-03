// Assessment Retake Policy & Cooldown Engine
// Policy Rules:
// - Attempt 1: Initial assessment (Free)
// - 1st Retake (Attempt 2): 24 hours cooldown from Attempt 1 completion (Free)
// - 2nd Retake (Attempt 3): 48 hours cooldown from Attempt 2 completion (Free)
// - 3rd Retake (Attempt 4): 7 days cooldown from Attempt 3 completion (Free)
// - 4th Retake & beyond (Attempt 5+): Paid retakes (₹500 / Paid Unlock) that can be taken anytime (0 cooldown)

const RETAKE_COOLDOWN_HOURS = {
  1: 24,       // 1st retake: 24 hours
  2: 48,       // 2nd retake: 48 hours
  3: 7 * 24,   // 3rd retake: 7 days (168 hours)
};

const RETAKE_COOLDOWN_MS = {
  1: 24 * 60 * 60 * 1000,
  2: 48 * 60 * 60 * 1000,
  3: 7 * 24 * 60 * 60 * 1000,
};

function formatRetakeType(attemptNumber) {
  if (attemptNumber <= 1) return "Initial Attempt";
  if (attemptNumber === 2) return "1st Retake (24h cooldown)";
  if (attemptNumber === 3) return "2nd Retake (48h cooldown)";
  if (attemptNumber === 4) return "3rd Retake (7d cooldown)";
  return `Paid Retake #${attemptNumber - 4}`;
}

function getAssessmentRetakeStatus(stage4 = {}) {
  const attempts = Array.isArray(stage4.attempts) && stage4.attempts.length > 0
    ? stage4.attempts
    : (stage4.score !== undefined || stage4.foundationScore !== undefined ? [{
        attemptNumber: 1,
        score: stage4.foundationScore ?? stage4.score,
        medal: stage4.medal && !String(stage4.medal).toLowerCase().includes("practice") ? stage4.medal : (stage4.score >= 85 ? "Gold" : stage4.score >= 70 ? "Silver" : "Bronze"),
        percentile: stage4.percentile || 68,
        passed: stage4.passed ?? (stage4.score >= 70),
        completedAt: stage4.completedAt || new Date(),
        sectionScores: stage4.sectionScores || [],
        type: "Initial Attempt",
        isPaid: false,
      }] : []);

  const totalCompletedAttempts = attempts.length;

  // Case 0: Never attempted yet
  if (totalCompletedAttempts === 0) {
    return {
      attemptNumber: 1,
      retakeNumber: 0,
      isInitial: true,
      isPaid: false,
      price: 0,
      cooldownHours: 0,
      cooldownMs: 0,
      unlocksAt: null,
      remainingMs: 0,
      isCooldownOver: true,
      isUnlocked: true,
      attempts: [],
      retakeCount: 0,
      totalAttempts: 0,
      highestScore: null,
    };
  }

  const nextAttemptNumber = totalCompletedAttempts + 1;
  const nextRetakeNumber = totalCompletedAttempts; // e.g. 1st retake is after 1 attempt
  const lastAttempt = attempts[attempts.length - 1];
  const lastCompletedAt = new Date(stage4.lastAttemptAt || lastAttempt.completedAt || stage4.completedAt || Date.now());

  // Policy: 4th retake and beyond (Attempt 5+) is paid and has 0 cooldown (take anytime)
  const isPaid = nextRetakeNumber >= 4;
  const cooldownHours = isPaid ? 0 : (RETAKE_COOLDOWN_HOURS[nextRetakeNumber] || 0);
  const cooldownMs = isPaid ? 0 : (RETAKE_COOLDOWN_MS[nextRetakeNumber] || 0);

  const now = Date.now();
  const unlocksAt = isPaid ? new Date(now) : new Date(lastCompletedAt.getTime() + cooldownMs);
  const remainingMs = isPaid ? 0 : Math.max(0, unlocksAt.getTime() - now);
  const isCooldownOver = remainingMs === 0;

  // An attempt is unlocked if cooldown is over, or staff explicitly approved, or candidate paid
  const isUnlocked = isCooldownOver || Boolean(stage4.isRetakeApproved) || Boolean(stage4.unlockedForRetake);

  const highestScore = attempts.reduce((max, a) => Math.max(max, Number(a.score) || 0), 0);

  return {
    attemptNumber: nextAttemptNumber,
    retakeNumber: nextRetakeNumber,
    isInitial: false,
    isPaid,
    price: isPaid ? 500 : 0,
    cooldownHours,
    cooldownMs,
    unlocksAt,
    remainingMs,
    isCooldownOver,
    isUnlocked,
    lastAttemptAt: lastCompletedAt,
    attempts,
    retakeCount: Math.max(0, totalCompletedAttempts - 1),
    totalAttempts: totalCompletedAttempts,
    highestScore,
    typeLabel: formatRetakeType(nextAttemptNumber),
  };
}

module.exports = {
  RETAKE_COOLDOWN_HOURS,
  RETAKE_COOLDOWN_MS,
  formatRetakeType,
  getAssessmentRetakeStatus,
};
