process.env.JWT_SECRET = "test_jwt_secret_key_1234567890123456";

const request = require("supertest");
const express = require("express");

jest.mock("../models/Company");
jest.mock("../models/Application");
jest.mock("../models/Notification");
jest.mock("../models/Job");
jest.mock("../models/Candidate");
jest.mock("../models/AcademyActivityEvent");
jest.mock("../models/PlacementConfirmation");
jest.mock("../utils/academyEvents", () => ({ emitAcademyEvent: jest.fn().mockResolvedValue({}) }));
jest.mock("../utils/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const { emitAcademyEvent } = require("../utils/academyEvents");
const companyRoutes = require("../routes/company");
const { signToken } = require("../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/company", companyRoutes);

const companyId = "60d0fe4f5311236168a109cb";
const token = signToken(companyId, "company");
const put = (id, body) => request(app).put(`/api/company/applications/${id}/interview-outcome`).set("Authorization", `Bearer ${token}`).send(body);

function mkApp(over = {}) {
  const doc = {
    _id: "app1",
    status: "interviewing",
    interviewOutcome: "",
    rescheduleCount: 0,
    candidateId: { _id: "cand1", stage1: { fullName: "Swetha" }, stage2: { academyId: "ac1" }, collegeId: "col1" },
    save: jest.fn().mockResolvedValue(true),
    ...over,
  };
  Application.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(doc) });
  return doc;
}

beforeEach(() => {
  jest.clearAllMocks();
  Company.findById = jest.fn().mockReturnValue({ select: () => ({ lean: async () => ({ companyName: "Acme" }) }) });
  Notification.create = jest.fn().mockResolvedValue({});
});

describe("PUT /applications/:id/interview-outcome", () => {
  test("reschedule needs a new time, increments count, notifies candidate + academy + college", async () => {
    const doc = mkApp();
    let res = await put("app1", { outcome: "rescheduled" });
    expect(res.status).toBe(400);
    res = await put("app1", { outcome: "rescheduled", newTime: "2026-11-20T10:00", note: "Panel busy" });
    expect(res.status).toBe(200);
    expect(doc.interviewOutcome).toBe("rescheduled");
    expect(doc.rescheduleCount).toBe(1);
    expect(doc.interviewConfirmed).toBe(false);
    expect(doc.save).toHaveBeenCalled();
    expect(emitAcademyEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: "interview_rescheduled" }));
    const recipients = Notification.create.mock.calls.map((c) => c[0].recipientType);
    expect(recipients).toEqual(expect.arrayContaining(["candidate", "college"]));
  });

  test.each([
    ["cancelled", "interview_cancelled"],
    ["candidate_no_show", "candidate_no_show"],
    ["employer_no_show", "employer_no_show"],
  ])("%s emits %s", async (outcome, event) => {
    const doc = mkApp();
    const res = await put("app1", { outcome, note: "n" });
    expect(res.status).toBe(200);
    expect(doc.interviewOutcome).toBe(outcome);
    expect(emitAcademyEvent).toHaveBeenCalledWith(expect.objectContaining({ eventType: event }));
  });

  test("rejects unknown outcome and wrong stage; clear resets", async () => {
    mkApp();
    expect((await put("app1", { outcome: "ghosted" })).status).toBe(400);
    mkApp({ status: "applied" });
    expect((await put("app1", { outcome: "cancelled" })).status).toBe(400);
    const doc = mkApp({ interviewOutcome: "cancelled", interviewOutcomeNote: "x" });
    const res = await put("app1", { outcome: "clear" });
    expect(res.status).toBe(200);
    expect(doc.interviewOutcome).toBe("");
    expect(emitAcademyEvent).not.toHaveBeenCalled();
  });

  test("404 for another company's application", async () => {
    Application.findOne = jest.fn().mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });
    expect((await put("nope", { outcome: "cancelled" })).status).toBe(404);
  });
});
