const { computeCandidateReadiness, READINESS_STAGES } = require("../utils/studentReadiness");

describe("Candidate Readiness Auto-Calculation", () => {
  test("returns ENROLLED for freshly registered candidate with no completed stages", () => {
    const candidate = {
      completedStages: [],
      stage1: null,
      verificationReadiness: { readinessStatus: "ENROLLED" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("ENROLLED");
  });

  test("returns PROFILE_COMPLETED when candidate has completed stage 1", () => {
    const candidate = {
      completedStages: [1],
      stage1: { fullName: "Aarav Sharma", phone: "9876543210" },
      studentEnrollment: { rollNumber: "ROLL001" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("PROFILE_COMPLETED");
  });

  test("returns TRAINING_IN_PROGRESS when training modules are in progress", () => {
    const candidate = {
      completedStages: [1],
      stage1: { fullName: "Aarav Sharma" },
      collegeTrainingModules: { status: "IN_PROGRESS", modules: [{ title: "Module 1" }] },
    };
    expect(computeCandidateReadiness(candidate)).toBe("TRAINING_IN_PROGRESS");
  });

  test("returns ASSESSMENT_PENDING when training is complete but assessment not yet passed", () => {
    const candidate = {
      completedStages: [1, 2],
      stage1: { fullName: "Aarav Sharma" },
      collegeTrainingModules: { status: "COMPLETED" },
      stage4: { passed: false, score: 30 },
    };
    expect(computeCandidateReadiness(candidate)).toBe("ASSESSMENT_PENDING");
  });

  test("returns VERIFICATION_PENDING when candidate uploaded video pitch", () => {
    const candidate = {
      completedStages: [1, 2, 4],
      stage1: { fullName: "Aarav Sharma" },
      stage4: { passed: true, score: 85 },
      stage5: { videoUrl: "https://example.com/pitch.mp4" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("VERIFICATION_PENDING");
  });

  test("returns VERIFIED when candidate is marked verified but video pitch pending", () => {
    const candidate = {
      completedStages: [1, 2, 4],
      stage1: { fullName: "Aarav Sharma" },
      stage4: { passed: true, score: 85 },
      isVerified: true,
    };
    expect(computeCandidateReadiness(candidate)).toBe("VERIFIED");
  });

  test("returns INTERVIEW_READY when candidate has placement lifecycle active or placed", () => {
    const candidate = {
      completedStages: [1, 2, 4, 5],
      stage1: { fullName: "Aarav Sharma" },
      placementLifecycle: { currentStatus: "PLACED", placedCompanyName: "Optum" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("INTERVIEW_READY");
  });

  test("returns INTERVIEW_READY when candidate is shortlisted or interview scheduled", () => {
    const candidate = {
      completedStages: [1, 2, 4, 5],
      stage1: { fullName: "Aarav Sharma" },
      placementLifecycle: { currentStatus: "SHORTLISTED" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("INTERVIEW_READY");
  });

  test("returns INTERVIEW_READY when candidate is verified with assessment passed and video pitch", () => {
    const candidate = {
      completedStages: [1, 2, 4, 5],
      stage1: { fullName: "Aarav Sharma" },
      stage4: { passed: true, score: 85 },
      videoResume: { videoUrl: "https://example.com/pitch.mp4" },
      isVerified: true,
      placementLifecycle: { currentStatus: "AVAILABLE" },
    };
    expect(computeCandidateReadiness(candidate)).toBe("INTERVIEW_READY");
  });
});
