import { describe, test, expect } from "vitest";
import { computeStage6Result } from "../src/utils/stage6Score.js";

const now = "2026-09-19";
const rows = [
  { name: "HCC", count: 100, accuracy: 88, timePerChart: 9, lastCodedDate: "2026-09-10" },
  { name: "E/M", count: 150, accuracy: 86, timePerChart: 7, lastCodedDate: "2026-09-01" },
];

describe("computeStage6Result", () => {
  test("no inputs scores 0 with no tier", () => {
    const r = computeStage6Result({ now, evidencePath: "C" });
    expect(r.stageScore).toBe(0);
    expect(r.tier).toBe("None");
  });

  test("path A: 250 charts at ~87% reaches Gold - full credit only once staff-verified", () => {
    const pending = computeStage6Result({ now, evidencePath: "A", specialtyCharts: rows, timePracticedHours: 60, practicePeriodDays: 90 });
    const verified = computeStage6Result({ now, evidencePath: "A", specialtyCharts: rows, timePracticedHours: 60, practicePeriodDays: 90, staffVerified: true });
    expect(pending.totalCharts).toBe(250);
    expect(pending.overallAccuracy).toBe(86.8);
    expect(pending.tier).toBe("Gold");
    // Unverified Path A (the default - no Talentera staff member has confirmed the
    // candidate's platform account details yet) is scaled to 60%, same as Path B
    // before a proof document is uploaded.
    expect(pending.multiplier).toBe(0.6);
    expect(pending.stageScore).toBe(42);
    // Once staff verify the platform accounts (POST /api/staff/verify-live-charts),
    // the same submission scores at full credit.
    expect(verified.multiplier).toBe(1);
    expect(verified.stageScore).toBe(70);
    expect(verified.points).toBe(7);
  });

  test("path B without proof is scaled to 60%, with proof to 100%", () => {
    const one = [rows[0]];
    const without = computeStage6Result({ now, evidencePath: "B", specialtyCharts: one });
    const withDoc = computeStage6Result({ now, evidencePath: "B", specialtyCharts: one, hasProofDoc: true });
    expect(withDoc.stageScore).toBeGreaterThan(without.stageScore);
    expect(without.multiplier).toBe(0.6);
  });

  test("path C is 70% and path D is always 0", () => {
    expect(computeStage6Result({ now, evidencePath: "C", specialtyCharts: rows }).multiplier).toBe(0.7);
    const d = computeStage6Result({ now, evidencePath: "D", specialtyCharts: rows });
    expect(d.stageScore).toBe(0);
    expect(d.totalCharts).toBe(0);
    expect(d.tier).toBe("None");
  });

  test("flags implausible volume for review", () => {
    const r = computeStage6Result({ now, evidencePath: "C", specialtyCharts: [{ name: "x", count: 600, accuracy: 90, timePerChart: 6 }], practicePeriodDays: 30 });
    expect(r.needsReview).toBe(true);
  });
});
