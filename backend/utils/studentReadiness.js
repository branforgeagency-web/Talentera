/**
 * Candidate Readiness Stage Auto-Calculation Engine
 *
 * Automatically evaluates candidate progression through the 7 readiness stages
 * based on real backend data:
 * 1. ENROLLED
 * 2. PROFILE_COMPLETED
 * 3. TRAINING_IN_PROGRESS
 * 4. ASSESSMENT_PENDING
 * 5. VERIFICATION_PENDING
 * 6. VERIFIED
 * 7. INTERVIEW_READY
 */

const READINESS_STAGES = [
  "ENROLLED",
  "PROFILE_COMPLETED",
  "TRAINING_IN_PROGRESS",
  "ASSESSMENT_PENDING",
  "VERIFICATION_PENDING",
  "VERIFIED",
  "INTERVIEW_READY",
];

const READINESS_DESCRIPTIONS = {
  ENROLLED: "Candidate is enrolled in the college roster. Awaiting student to log in and complete basic profile setup.",
  PROFILE_COMPLETED: "Candidate has completed Stage 1 profile and identity information. Ready to begin domain training.",
  TRAINING_IN_PROGRESS: "Candidate is actively undergoing domain training modules and coursework.",
  ASSESSMENT_PENDING: "Candidate has completed training modules. Scheduled to attempt the Talentera Benchmark Assessment.",
  VERIFICATION_PENDING: "Candidate completed assessment / submitted 60s video pitch. Awaiting credential verification review.",
  VERIFIED: "Candidate profile, training coursework, and credentials are fully verified. Complete video pitch for final placement readiness.",
  INTERVIEW_READY: "Candidate has passed all verification gates and is active in the corporate interview & placement pipeline.",
};

function computeCandidateReadiness(candidate) {
  if (!candidate) return "ENROLLED";

  const completedStages = Array.isArray(candidate.completedStages) ? candidate.completedStages : [];

  // Stage 7: INTERVIEW_READY
  // Check if candidate is actively in placement pipeline, placed, or explicitly approved for interviews
  const placementStatus = (candidate.placementLifecycle?.currentStatus || "").toUpperCase();
  const isInterviewOrPlaced = [
    "PLACED",
    "SHORTLISTED",
    "INTERVIEW_SCHEDULED",
    "OFFER_EXTENDED",
    "SELECTED",
    "JOINED",
    "INTERVIEW_READY",
  ].includes(placementStatus);

  const isExplicitInterviewReady =
    candidate.verificationReadiness?.readinessStatus === "INTERVIEW_READY" ||
    candidate.verificationReadiness?.checklist?.placementApproval === true;

  const assessmentScore =
    candidate.stage4?.score !== undefined
      ? candidate.stage4.score
      : candidate.stage4?.foundationScore !== undefined
      ? candidate.stage4.foundationScore
      : candidate.assessmentScore || 0;

  const assessmentPassed =
    candidate.stage4?.passed === true ||
    completedStages.includes(4) ||
    assessmentScore >= 50;

  const hasVideoPitch = Boolean(
    candidate.videoResume?.videoUrl ||
      candidate.stage5?.videoUrl ||
      candidate.stage5?.videoPitch ||
      completedStages.includes(5)
  );

  const isVerifiedCandidate =
    candidate.isVerified === true ||
    candidate.verificationReadiness?.readinessStatus === "VERIFIED" ||
    candidate.stage5?.verified === true ||
    completedStages.includes(8);

  if (
    isInterviewOrPlaced ||
    isExplicitInterviewReady ||
    (isVerifiedCandidate && assessmentPassed && hasVideoPitch)
  ) {
    return "INTERVIEW_READY";
  }

  // Stage 6: VERIFIED
  if (isVerifiedCandidate) {
    return "VERIFIED";
  }

  // Stage 5: VERIFICATION_PENDING
  const isVerificationPendingExplicit =
    candidate.verificationReadiness?.readinessStatus === "VERIFICATION_PENDING";

  if (
    isVerificationPendingExplicit ||
    hasVideoPitch ||
    (assessmentPassed && candidate.isSubmitted)
  ) {
    return "VERIFICATION_PENDING";
  }

  // Stage 4: ASSESSMENT_PENDING
  const trainingStatus = candidate.collegeTrainingModules?.status;
  const trainingDone =
    completedStages.includes(2) ||
    trainingStatus === "COMPLETED" ||
    (candidate.stage2?.completionPercentage || 0) >= 80 ||
    candidate.verificationReadiness?.checklist?.training === true;

  const isAssessmentPendingExplicit =
    candidate.verificationReadiness?.readinessStatus === "ASSESSMENT_PENDING";

  if (isAssessmentPendingExplicit || (trainingDone && !assessmentPassed)) {
    return "ASSESSMENT_PENDING";
  }

  // Stage 3: TRAINING_IN_PROGRESS
  const isTrainingActiveExplicit =
    candidate.verificationReadiness?.readinessStatus === "TRAINING_IN_PROGRESS";

  const trainingActive =
    trainingStatus === "IN_PROGRESS" ||
    Boolean(candidate.stage2?.batch) ||
    Boolean(candidate.stage2?.enrolled) ||
    candidate.stage2?.status === "in_progress" ||
    (Array.isArray(candidate.collegeTrainingModules?.modules) &&
      candidate.collegeTrainingModules.modules.length > 0);

  if (isTrainingActiveExplicit || trainingActive) {
    return "TRAINING_IN_PROGRESS";
  }

  // Stage 2: PROFILE_COMPLETED
  const isProfileCompletedExplicit =
    candidate.verificationReadiness?.readinessStatus === "PROFILE_COMPLETED";

  const profileDone =
    completedStages.includes(1) ||
    Boolean(
      candidate.stage1?.fullName &&
        (candidate.stage1?.gender ||
          candidate.stage1?.dob ||
          candidate.stage1?.phone ||
          candidate.studentEnrollment?.rollNumber ||
          candidate.studentEnrollment?.department)
    );

  if (isProfileCompletedExplicit || profileDone) {
    return "PROFILE_COMPLETED";
  }

  // Stage 1: ENROLLED
  return "ENROLLED";
}

module.exports = {
  READINESS_STAGES,
  READINESS_DESCRIPTIONS,
  computeCandidateReadiness,
};
