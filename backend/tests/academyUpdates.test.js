process.env.JWT_SECRET = "test_jwt_secret_key_1234567890123456";

const request = require("supertest");
const express = require("express");

jest.mock("../models/Academy");
jest.mock("../models/AcademyBatch");
jest.mock("../models/Candidate");
jest.mock("../models/StudentUpload");
jest.mock("../models/StudentInvite");
jest.mock("../models/AcademyActivityEvent");
jest.mock("../models/PlacementConfirmation");
jest.mock("../models/Application");
jest.mock("../models/Notification");
jest.mock("../models/RetakeRequest");
jest.mock("../utils/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const Academy = require("../models/Academy");
const Candidate = require("../models/Candidate");
const StudentInvite = require("../models/StudentInvite");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const Application = require("../models/Application");
const RetakeRequest = require("../models/RetakeRequest");
const academyRoutes = require("../routes/academy");
const { signToken } = require("../middleware/auth");

function chain(data) {
  const c = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(data),
    then: (resolve) => resolve(data),
  };
  return c;
}

const app = express();
app.use(express.json());
app.use("/api/academy", academyRoutes);

const academyId = "60d0fe4f5311236168a109ca";
const token = signToken(academyId, "academy");
const auth = (r) => r.set("Authorization", `Bearer ${token}`);

const cand = (id, extra = {}) => ({
  _id: id,
  email: `${id}@x.com`,
  stage1: { fullName: `Student ${id}` },
  stage2: { batch: "1122CC", course: "Medical Coding", academyId },
  completedStages: [],
  ...extra,
});

beforeEach(() => {
  jest.clearAllMocks();
  StudentInvite.find = jest.fn().mockReturnValue(chain([]));
  AcademyActivityEvent.find = jest.fn().mockReturnValue(chain([]));
  PlacementConfirmation.find = jest.fn().mockReturnValue(chain([]));
  RetakeRequest.find = jest.fn().mockReturnValue(chain([]));
});

describe("Interviews kanban - new outcomes", () => {
  test("puts every outcome in its own stage", async () => {
    const ids = ["c1", "c2", "c3", "c4", "c5", "c6", "c7", "c8"];
    Academy.findById = jest.fn().mockReturnValue(chain({ _id: academyId, name: "A" }));
    Candidate.find = jest.fn().mockReturnValue(chain(ids.map((i) => cand(i))));
    const co = { _id: "co1", companyName: "Acme" };
    const a = (id, cid, status, extra = {}) => ({ _id: id, candidateId: cid, companyId: co, status, updatedAt: new Date(), ...extra });
    Application.find = jest.fn().mockReturnValue(chain([
      a("a1", "c1", "interviewing"),
      a("a2", "c2", "interviewing", { interviewOutcome: "rescheduled", rescheduleCount: 2, interviewOutcomeNote: "Panel busy" }),
      a("a3", "c3", "interviewing", { interviewOutcome: "cancelled" }),
      a("a4", "c4", "interviewing", { interviewOutcome: "candidate_no_show" }),
      a("a5", "c5", "interviewing", { interviewOutcome: "employer_no_show" }),
      a("a6", "c6", "on_hold"),
      a("a7", "c7", "hired", { hiring: { offer: { status: "declined", ctc: 4, role: "Coder" } } }),
      a("a8", "c8", "hired", { hiring: { offer: { status: "sent", ctc: 4.5, role: "Coder", joinDate: "2026-11-01" } } }),
    ]));
    const res = await auth(request(app).get("/api/academy/interviews/kanban"));
    expect(res.status).toBe(200);
    const k = res.body.kanban;
    expect(k.interview.map((x) => x.id)).toEqual(["a1"]);
    expect(k.rescheduled.map((x) => x.id)).toEqual(["a2"]);
    expect(k.rescheduled[0].rescheduleCount).toBe(2);
    expect(k.rescheduled[0].outcomeNote).toBe("Panel busy");
    expect(k.cancelled.map((x) => x.id)).toEqual(["a3"]);
    expect(k.candidateNoShow.map((x) => x.id)).toEqual(["a4"]);
    expect(k.employerNoShow.map((x) => x.id)).toEqual(["a5"]);
    expect(k.onHold.map((x) => x.id)).toEqual(["a6"]);
    expect(k.offerDeclined.map((x) => x.id)).toEqual(["a7"]);
    expect(k.offer.map((x) => x.id)).toEqual(["a8"]);
    expect(k.offer[0].ctc).toBe("4.5 LPA");
    expect(k.offer[0].joiningDate).toBe("2026-11-01");
  });
});

describe("Offer tracker", () => {
  test("labels letter pending / joining / joined / denied / on hold", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain({ _id: academyId, name: "A" }));
    Candidate.find = jest.fn().mockReturnValue(chain(["c1", "c2", "c3", "c4", "c5"].map((i) => cand(i))));
    const co = { _id: "co1", companyName: "Acme" };
    const a = (id, cid, status, hiring) => ({ _id: id, candidateId: cid, companyId: co, status, hiring, updatedAt: new Date() });
    Application.find = jest.fn().mockReturnValue(chain([
      a("a1", "c1", "hired", { offer: { status: "sent", ctc: 4, role: "R" } }),
      a("a2", "c2", "hired", { offer: { status: "accepted", ctc: 5, joinDate: "2026-12-01" } }),
      a("a3", "c3", "hired", { offer: { status: "accepted", ctc: 6 } }),
      a("a4", "c4", "hired", { offer: { status: "declined" } }),
      a("a5", "c5", "on_hold", { approval: { decision: "hold" } }),
    ]));
    PlacementConfirmation.find = jest.fn().mockReturnValue(chain([{ candidateId: "c3", companyId: "co1", status: "confirmed" }]));
    const res = await auth(request(app).get("/api/academy/placements/offer-tracker"));
    expect(res.status).toBe(200);
    const by = Object.fromEntries(res.body.rows.map((r) => [r.candidateId, r]));
    expect(by.c1.status).toBe("offer_letter_pending");
    expect(by.c1.offerLetter).toBe("Pending");
    expect(by.c2.status).toBe("joining");
    expect(by.c2.joiningDate).toBe("2026-12-01");
    expect(by.c3.status).toBe("joined");
    expect(by.c4.status).toBe("offer_denied");
    expect(by.c5.status).toBe("offer_on_hold");
    expect(by.c5.note).toMatch(/management approval/);
    expect(res.body.summary).toMatchObject({ offer_letter_pending: 1, joining: 1, joined: 1, offer_denied: 1, offer_on_hold: 1 });
  });
});

describe("Scores analytics", () => {
  test("unregistered student gets no score; registered one gets per-assessment type/score/attempts", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain({ _id: academyId, name: "A" }));
    const unregistered = cand("u1", { stage2: { batch: "Batch 1", academyId, academyAssessmentScore: 30 } });
    const registered = cand("r1", {
      completedStages: [1, 4],
      isVerified: true,
      stage1: { fullName: "Registered R", aadhaarVerified: true },
      stage4: { foundationScore: 80, specialtyScore: 70 },
      stage5: { interviewMode: "video", aiScore: 70, mockScore: 60 },
    });
    Candidate.find = jest.fn().mockReturnValue(chain([unregistered, registered]));
    RetakeRequest.find = jest.fn().mockReturnValue(chain([{ candidateId: "r1", stage: 4 }]));
    const res = await auth(request(app).get("/api/academy/scores-analytics"));
    expect(res.status).toBe(200);
    const u = res.body.candidates.find((c) => c.id === "u1");
    const r = res.body.candidates.find((c) => c.id === "r1");
    expect(u.registrationPending).toBe(true);
    expect(u.score).toBe(0);
    expect(u.rank).toBeNull();
    expect(u.assessments).toEqual([]);
    expect(r.registrationPending).toBe(false);
    expect(r.rank).toBe(1);
    const byName = Object.fromEntries(r.assessments.map((x) => [x.name, x]));
    expect(byName["Foundation MCQ"]).toMatchObject({ type: "MCQ", score: 80, attempts: 2 });
    expect(byName["Self-introduction"]).toMatchObject({ type: "Video", attempts: 1 });
    expect(byName["AI mock interview"].type).toBe("Audio");
    expect(res.body.avgScore).not.toBe(15);
    expect(u.rank).toBeNull();
    // unregistered students sort after registered ones
    expect(res.body.candidates[res.body.candidates.length - 1].id).toBe("u1");
  });
});

describe("Courses", () => {
  const mkAcademy = (courses = []) => {
    const doc = { _id: academyId, courses, save: jest.fn().mockResolvedValue(true) };
    courses.id = (id) => courses.find((c) => String(c._id) === String(id)) || null;
    return doc;
  };

  test("create with schedule + training mode", async () => {
    const doc = mkAcademy([]);
    Academy.findById = jest.fn().mockResolvedValue(doc);
    const res = await auth(request(app).post("/api/academy/create-course")).send({
      title: "Medical Billing", duration: "3 months", startDate: "2026-10-05", endDate: "2026-12-15", trainingMode: "Hybrid", syllabus: ["A", "B"],
    });
    expect(res.status).toBe(200);
    const saved = doc.courses[0];
    expect(saved.trainingMode).toBe("Hybrid");
    expect(new Date(saved.startDate).toISOString().slice(0, 10)).toBe("2026-10-05");
    expect(new Date(saved.endDate).toISOString().slice(0, 10)).toBe("2026-12-15");
  });

  test("rejects end before start and bad mode", async () => {
    Academy.findById = jest.fn().mockResolvedValue(mkAcademy([]));
    let res = await auth(request(app).post("/api/academy/create-course")).send({ title: "X", duration: "1", startDate: "2026-12-15", endDate: "2026-10-05" });
    expect(res.status).toBe(400);
    res = await auth(request(app).post("/api/academy/create-course")).send({ title: "X", duration: "1", trainingMode: "Telepathy" });
    expect(res.status).toBe(400);
  });

  test("syllabus progress ticks and unticks topics", async () => {
    const course = { _id: "k1", title: "T", syllabus: ["A", "B", "C", "D"], completedTopics: [] };
    const doc = mkAcademy([course]);
    Academy.findById = jest.fn().mockResolvedValue(doc);
    let res = await auth(request(app).post("/api/academy/courses/k1/progress")).send({ topic: "A", done: true });
    expect(res.status).toBe(200);
    expect(res.body.completionPct).toBe(25);
    res = await auth(request(app).post("/api/academy/courses/k1/progress")).send({ topic: "B", done: true });
    expect(res.body.completionPct).toBe(50);
    res = await auth(request(app).post("/api/academy/courses/k1/progress")).send({ topic: "A", done: false });
    expect(res.body.completionPct).toBe(25);
    res = await auth(request(app).post("/api/academy/courses/k1/progress")).send({ topic: "Z", done: true });
    expect(res.status).toBe(400);
  });
});

describe("Placement with new statuses", () => {
  test("accepts Offer On Hold with joining date and offer letter", async () => {
    const doc = { _id: academyId, placements: [], save: jest.fn().mockResolvedValue(true) };
    Academy.findById = jest.fn().mockResolvedValue(doc);
    Candidate.findById = jest.fn().mockResolvedValue(null);
    const res = await auth(request(app).post("/api/academy/add-placement")).send({
      studentName: "S", role: "Coder", company: "Acme", ctc: "4 LPA", placementSource: "Talentera Platform",
      joiningStatus: "Offer On Hold", joiningDate: "2026-11-15", offerLetterStatus: "Pending",
    });
    expect(res.status).toBe(200);
    expect(doc.placements[0].joiningStatus).toBe("Offer On Hold");
    expect(new Date(doc.placements[0].joiningDate).toISOString().slice(0, 10)).toBe("2026-11-15");
    expect(doc.placements[0].offerLetterStatus).toBe("Pending");
  });

  test("rejects an unknown joining status and bad letter status", async () => {
    Academy.findById = jest.fn().mockResolvedValue({ _id: academyId, placements: [], save: jest.fn() });
    let res = await auth(request(app).post("/api/academy/add-placement")).send({ studentName: "S", role: "R", company: "C", ctc: "1", placementSource: "Other", joiningStatus: "Nope" });
    expect(res.status).toBe(400);
    res = await auth(request(app).post("/api/academy/add-placement")).send({ studentName: "S", role: "R", company: "C", ctc: "1", placementSource: "Other", joiningStatus: "Joined", offerLetterStatus: "Maybe" });
    expect(res.status).toBe(400);
  });
});
