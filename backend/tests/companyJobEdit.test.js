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
const Job = require("../models/Job");
const Notification = require("../models/Notification");
const companyRoutes = require("../routes/company");
const { signToken } = require("../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/company", companyRoutes);

const companyId = "60d0fe4f5311236168a109cb";
const token = signToken(companyId, "company");
const put = (id, body) => request(app).put(`/api/company/jobs/${id}`).set("Authorization", `Bearer ${token}`).send(body);

const goodFields = {
  roletitle: "Medical Coder", specialties: ["Surgery"], level: "Experienced only", compensation: "Fixed",
  workmode: "Onsite", location: "Hyderabad", shift: "Day", languages: ["English"], openings: 3,
  urgency: "Immediate", hiringmanager: "Asha", expmin: 2, expmax: 5,
};

beforeEach(() => {
  jest.clearAllMocks();
  Notification.create = jest.fn().mockResolvedValue({});
});

describe("PUT /company/jobs/:id - edit details", () => {
  test("updates fields of a posted job without closing it", async () => {
    const job = { _id: "j1", jobId: "TLT-1", published: true, approvalStatus: "approved", fields: { ...goodFields }, markModified: jest.fn(), save: jest.fn().mockResolvedValue() };
    Job.findOne = jest.fn().mockResolvedValue(job);
    const res = await put("j1", { fields: { location: "Chennai", openings: 5 } });
    expect(res.status).toBe(200);
    expect(res.body.message).toBe("Job details updated.");
    expect(job.fields.location).toBe("Chennai");
    expect(job.fields.openings).toBe(5);
    expect(job.fields.roletitle).toBe("Medical Coder"); // untouched fields survive
    expect(job.published).toBe(true); // an edit must not close the listing
    expect(job.save).toHaveBeenCalled();
  });

  test("rejects an edit that blanks a required field", async () => {
    const job = { _id: "j1", published: true, fields: { ...goodFields }, markModified: jest.fn(), save: jest.fn() };
    Job.findOne = jest.fn().mockResolvedValue(job);
    const res = await put("j1", { fields: { roletitle: "" } });
    expect(res.status).toBe(400);
    expect(res.body.missing).toContain("roletitle");
    expect(job.save).not.toHaveBeenCalled();
  });

  test("editing a rejected job resubmits it for approval", async () => {
    const job = { _id: "j1", jobId: "TLT-1", published: true, approvalStatus: "rejected", rejectionReason: "bad", fields: { ...goodFields }, markModified: jest.fn(), save: jest.fn().mockResolvedValue() };
    Job.findOne = jest.fn().mockResolvedValue(job);
    Company.findById = jest.fn().mockReturnValue({ lean: async () => ({ companyName: "Acme" }) });
    const res = await put("j1", { fields: { location: "Pune" } });
    expect(res.status).toBe(200);
    expect(job.approvalStatus).toBe("pending");
    expect(Notification.create).toHaveBeenCalled();
  });

  test("close/reopen still works with only { published }", async () => {
    const job = { _id: "j1", published: true, approvalStatus: "approved", fields: {}, save: jest.fn().mockResolvedValue() };
    Job.findOne = jest.fn().mockResolvedValue(job);
    const res = await put("j1", { published: false });
    expect(res.status).toBe(200);
    expect(job.published).toBe(false);
    expect(res.body.message).toBe("Job closed.");
  });

  test("edits the onboarding first-JD stored on the company", async () => {
    const company = { jdPublished: true, jobId: "TLT-9", stage9: { ...goodFields }, markModified: jest.fn(), save: jest.fn().mockResolvedValue() };
    Company.findById = jest.fn().mockResolvedValue(company);
    const res = await put("onboarding", { fields: { location: "Mumbai" } });
    expect(res.status).toBe(200);
    expect(company.stage9.location).toBe("Mumbai");
    expect(company.stage9.roletitle).toBe("Medical Coder");
    expect(company.save).toHaveBeenCalled();
    expect(Job.findOne).not.toHaveBeenCalled();
  });
});
