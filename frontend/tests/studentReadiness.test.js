import { describe, it, expect } from "vitest";
import {
  READINESS_LEVELS,
  getStudentComputedReadiness,
  getReadinessStageIndex,
} from "../src/utils/studentReadiness";

describe("Frontend candidate readiness calculation", () => {
  it("defaults to ENROLLED for empty student", () => {
    expect(getStudentComputedReadiness(null)).toBe("ENROLLED");
    expect(getStudentComputedReadiness({})).toBe("ENROLLED");
  });

  it("selects PROFILE_COMPLETED when stage 1 is completed", () => {
    const s = {
      completedStages: [1],
      stage1: { fullName: "Priya Patel", phone: "9876543210" },
    };
    expect(getStudentComputedReadiness(s)).toBe("PROFILE_COMPLETED");
  });

  it("selects TRAINING_IN_PROGRESS when modules are in progress", () => {
    const s = {
      completedStages: [1],
      collegeTrainingModules: { status: "IN_PROGRESS" },
    };
    expect(getStudentComputedReadiness(s)).toBe("TRAINING_IN_PROGRESS");
  });

  it("selects ASSESSMENT_PENDING when training finished but assessment pending", () => {
    const s = {
      completedStages: [1, 2],
      collegeTrainingModules: { status: "COMPLETED" },
    };
    expect(getStudentComputedReadiness(s)).toBe("ASSESSMENT_PENDING");
  });

  it("selects VERIFICATION_PENDING when video pitch uploaded", () => {
    const s = {
      completedStages: [1, 2, 4],
      stage5: { videoUrl: "https://video.mp4" },
    };
    expect(getStudentComputedReadiness(s)).toBe("VERIFICATION_PENDING");
  });

  it("selects VERIFIED when candidate is verified", () => {
    const s = {
      completedStages: [1, 2, 4],
      isVerified: true,
    };
    expect(getStudentComputedReadiness(s)).toBe("VERIFIED");
  });

  it("selects INTERVIEW_READY when placed or shortlisted", () => {
    const s = {
      completedStages: [1, 2, 4, 5],
      placementLifecycle: { currentStatus: "SHORTLISTED" },
    };
    expect(getStudentComputedReadiness(s)).toBe("INTERVIEW_READY");
  });

  it("returns correct stage indices", () => {
    expect(getReadinessStageIndex("ENROLLED")).toBe(0);
    expect(getReadinessStageIndex("PROFILE_COMPLETED")).toBe(1);
    expect(getReadinessStageIndex("TRAINING_IN_PROGRESS")).toBe(2);
    expect(getReadinessStageIndex("ASSESSMENT_PENDING")).toBe(3);
    expect(getReadinessStageIndex("VERIFICATION_PENDING")).toBe(4);
    expect(getReadinessStageIndex("VERIFIED")).toBe(5);
    expect(getReadinessStageIndex("INTERVIEW_READY")).toBe(6);
  });
});
