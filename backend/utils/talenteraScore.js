// Centralized 8-stage verification + Talentera Score calculation.
//
// The candidate verification pipeline has 8 stages, but only Stages 1-6 are
// graded - Stage 7 (References) and Stage 8 (Review & Publish) are
// output/delivery stages (they don't add anything to the score, they just
// package + publish what's already been earned). Stage 4 (Assessment) and
// Stage 6 (Live Chart Practice) are the flagship / co-flagship stages and
// carry the most weight. Points sum to exactly 100 across Stages 1-6:
//
//   01 Basic + Aadhaar (Identity)         15
//   02 Academy & Training (Foundation)    15
//   03 Certifications (Certification)     15
//   04 Talentera Assessment (Flagship)    20
//   05 Portfolio Video (Video Pitch)      15
//   06 Live Chart Practice (Co-Flagship)  20
//   07 References (output only)            0
//   08 Review & Publish (output only)      0
//
// This is the SINGLE source of truth for both the stage-completion
// breakdown (used by the 8-dot tracker, approvals queue, etc.) and the
// Talentera Score itself (used across every dashboard: candidates
// directory, scores analytics, live profiles, the candidate's own stage
// progress, and persisted onto the candidate record for anything that
// reads the DB directly). Anywhere else that needs either value should
// import from here rather than recompute its own version.
const STAGE_SCORE_WEIGHTS = {
  1: 15, // Basic + Aadhaar (Identity)
  2: 15, // Academy & Training (Foundation)
  3: 15, // Certifications (Certification)
  4: 20, // Talentera Assessment (Flagship)
  5: 15, // Portfolio Video (Video Pitch)
  6: 20, // Live Chart Practice (Co-Flagship)
  7: 0, // References (output only)
  8: 0, // Review & Publish (output only)
};

// Minimum Talentera Score (out of 100) a candidate needs to be eligible for
// employer matching / interviews. Below this, academies and staff can grant
// the candidate a retake (currently: re-unlock Stage 4, the highest-weighted
// gradable stage) instead of the candidate staying stuck. Keep this in sync
// with TALENTERA_PASS_PERCENTAGE in frontend/src/pages/AcademyPortal.jsx.
const TALENTERA_PASS_PERCENTAGE = 75;

/**
 * Computes the Talentera Score (0-100) from a stage-completion array (as
 * produced by compute8Stages below - each item needs only { stageNumber,
 * isDone }). Pure function, no DB access, so it's safe to call from a
 * read-only .lean() query result or a live Mongoose document either way.
 */
function calculateTalenteraScore(stages) {
  const breakdown = (stages || []).map((st) => {
    const maxPoints = STAGE_SCORE_WEIGHTS[st.stageNumber] || 0;
    const points = st.isDone ? maxPoints : 0;
    return { stageNumber: st.stageNumber, title: st.title, maxPoints, points, isDone: !!st.isDone };
  });
  const score = breakdown.reduce((sum, b) => sum + b.points, 0);
  return { score, breakdown };
}

// Helper: Compute 8-stage verification details + Talentera Score for a candidate
function compute8Stages(candidate) {
  const completed = candidate.completedStages || [];
  const s1 = candidate.stage1 || {};
  const s2 = candidate.stage2 || {};
  const s3 = candidate.stage3 || {};
  const s4 = candidate.stage4 || {};
  const s5 = candidate.stage5 || {};
  const s6 = candidate.stage6 || {};
  const s7 = candidate.stage7 || {};

  const hasRealAadhaar = !!s1.aadhaarVerified && (!!s1.maskedAadhaar || !!s1.dob || !!s1.gender || !!s1.verificationMethod || !!s1.aadhaarNumber || !!s1.aadhaarDigits || !!s1.verifiedAt);
  const stages = [
    {
      stageNumber: 1,
      title: "Basic + Aadhaar",
      description: "Real person, Indian ID verified",
      whoDoesIt: "Student",
      isDone: completed.includes(1) && hasRealAadhaar,
      inProgress: !completed.includes(1) || !hasRealAadhaar,
      score: (completed.includes(1) && hasRealAadhaar) ? "Aadhaar Verified ✓" : "Pending Aadhaar Verification",
      meta: hasRealAadhaar ? (s1.city ? `${s1.fullName || "Candidate"} · ${s1.city}` : "Aadhaar Verified") : (s1.fullName ? `${s1.fullName} · ID Verification Pending` : "Identity Verification Pending"),
      needsApproval: false,
    },
    {
      stageNumber: 2,
      title: "Academy & Training",
      description: "Course, hours, Path B assessment",
      whoDoesIt: "Student + Academy validates",
      isDone: completed.includes(2) && !!s2.verified && !!s2.approvedAt,
      inProgress: !(completed.includes(2) && s2.verified && s2.approvedAt),
      score: (completed.includes(2) && s2.verified && s2.approvedAt)
        ? "Academy Approved ✓"
        : (s2.rejected || s2.status === "rejected" || s2.needsRevision)
        ? "Revision Requested"
        : "Pending Training & Sign-off",
      meta: (s2.rejected || s2.status === "rejected" || s2.needsRevision)
        ? `Revision: ${s2.rejectionReason || s2.feedback || "Needs Correction"}`
        : s2.batch ? `${s2.batch} · ${s2.branch || "Training"}` : "Course Training",
      needsApproval: !completed.includes(2) && !!s2.submittedForApproval && !s2.rejected && !s2.needsRevision && s2.status !== "rejected",
    },
    {
      stageNumber: 3,
      title: "Certifications",
      description: "AAPC / AHIMA cert numbers verified",
      whoDoesIt: "Student (auto-verified)",
      isDone: completed.includes(3) && !!s3.certNo,
      inProgress: !(completed.includes(3) && !!s3.certNo),
      score: (completed.includes(3) && s3.certNo) ? (s3.certCode || s3.certName || "Certified ✓") : "Pending Certification",
      meta: s3.certNo ? `Cert #${s3.certNo}` : "AAPC / AHIMA Credential",
      needsApproval: false,
    },
    {
      stageNumber: 4,
      title: "Talentera Assessment",
      description: "Foundation + specialty MCQ score",
      whoDoesIt: "Student (proctored)",
      isDone: completed.includes(4) && (s4.score !== undefined && s4.score !== null && !isNaN(Number(s4.score))),
      inProgress: !(completed.includes(4) && s4.score !== undefined && s4.score !== null),
      score: (s4.score !== undefined && s4.score !== null && !isNaN(Number(s4.score))) ? `${s4.score} / 100` : "Not Attempted",
      meta: (s4.score !== undefined && s4.score !== null) ? (s4.score >= 80 ? "Top 10% Quartile" : "Passed") : "Not attempted",
      needsApproval: false,
    },
    {
      stageNumber: 5,
      title: "Portfolio Video",
      description: "2-min self-intro, AI-scored + employee-approved",
      whoDoesIt: "Student → Talentera Employee reviews",
      isDone: (completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected",
      inProgress: !((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected"),
      score: ((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected")
        ? (s5.aiScore ? `AI Score ${(s5.aiScore / 10).toFixed(1)}/10 · Approved ✓` : "Video Approved ✓")
        : (s5.rejected || s5.status === "rejected" || s5.needsRevision)
        ? "Re-take Requested"
        : (s5.videoUrl || s5.proctoredInterviewVideoUrl ? "Video Uploaded (Pending Review)" : "Video Pending"),
      meta: (s5.rejected || s5.status === "rejected" || s5.needsRevision)
        ? `Revision: ${s5.rejectionReason || s5.feedback || "Re-take Required"}`
        : ((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected")
        ? "Approved by Talentera Team ✓"
        : (s5.videoUrl || s5.proctoredInterviewVideoUrl ? "Awaiting Talentera Review" : "No Video Uploaded"),
      needsApproval: false,
      videoUrl: s5.videoUrl || s5.proctoredInterviewVideoUrl || "",
    },
    {
      stageNumber: 6,
      title: "Live Chart Practice",
      description: "Sample coded charts uploaded",
      whoDoesIt: "Student",
      isDone: completed.includes(6) && (Number(s6.chartsCompleted) >= 10 || !!s6.accuracy),
      inProgress: !(completed.includes(6) && (Number(s6.chartsCompleted) >= 10 || !!s6.accuracy)),
      score: (completed.includes(6) && s6.accuracy) ? `${s6.accuracy}% Accuracy` : (completed.includes(6) && s6.chartsCompleted ? `${s6.chartsCompleted} Charts Audited` : "Pending Charts"),
      meta: s6.chartsCompleted ? `${s6.chartsCompleted} Charts Audited` : "Medical Charts Practice",
      needsApproval: false,
    },
    {
      stageNumber: 7,
      title: "References",
      description: "Trainer + peer references",
      whoDoesIt: "Student",
      isDone: completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0,
      inProgress: !(completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0),
      score: (completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0) ? `${s7.references?.length || 2} References Verified` : "Pending References",
      meta: (Array.isArray(s7.references) && s7.references.length > 0) ? "Trainer Endorsements" : "Professional References",
      needsApproval: false,
    },
  ];

  // Talentera Score is derived from Stages 1-6 only (Stage 7/8 are output-only,
  // 0 points) - compute it now, before building Stage 8's own display text,
  // since Stage 8's "Review & Publish" summary shows this exact number.
  const { score: talenteraScore, breakdown: scoreBreakdown } = calculateTalenteraScore(stages);

  stages.push({
    stageNumber: 8,
    title: "Review & Publish",
    description: "Talentera Score generated · profile goes live",
    whoDoesIt: "System",
    isDone: completed.includes(8) && !!candidate.isSubmitted,
    inProgress: !completed.includes(8),
    score: (completed.includes(8) && candidate.isSubmitted) ? `Talentera Score: ${talenteraScore}` : "Verification in Progress",
    meta: (completed.includes(8) && candidate.isSubmitted) ? "Profile Live & Matched" : "Verification in Progress",
    needsApproval: false,
  });

  const doneCount = stages.filter((st) => st.isDone).length;
  const pct = Math.round((doneCount / 8) * 100);

  return {
    stages,
    doneCount,
    pct,
    talenteraScore,
    scoreBreakdown,
    currentStageNumber: stages.findIndex((st) => !st.isDone) + 1 || 8,
    isComplete: doneCount === 8,
  };
}

module.exports = { STAGE_SCORE_WEIGHTS, TALENTERA_PASS_PERCENTAGE, calculateTalenteraScore, compute8Stages };
