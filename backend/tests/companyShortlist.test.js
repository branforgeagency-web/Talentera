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
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const companyRoutes = require("../routes/company");
const { signToken } = require("../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/company", companyRoutes);

const companyId = "60d0fe4f5311236168a109cb";
const candId = "60d0fe4f5311236168a109dd";
const token = signToken(companyId, "company");
const post = (body) => request(app).post("/api/company/matched-candidates/application").set("Authorization", `Bearer ${token}`).send(body);
const leanOf = (v) => ({ select: () => ({ lean: async () => v }) });

beforeEach(() => {
  jest.clearAllMocks();
  Company.findById = jest.fn().mockReturnValue(leanOf({ jobId: "JOB-1" }));
  Job.findOne = jest.fn().mockReturnValue(leanOf(null));
  Candidate.findById = jest.fn().mockReturnValue(leanOf({ _id: candId }));
});

describe("POST /matched-candidates/application", () => {
  test("creates an application for a matched candidate who has not applied", async () => {
    Application.findOne = jest.fn().mockResolvedValue(null);
    Application.create = jest.fn().mockImplementation(async (d) => ({ _id: "app1", ...d }));
    const res = await post({ jobId: "JOB-1", candidateId: candId });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(true);
    expect(res.body.applicationId).toBe("app1");
    expect(Application.create.mock.calls[0][0]).toMatchObject({ candidateId: candId, jobId: "JOB-1", status: "applied" });
  });

  test("reuses the existing application when the candidate already applied", async () => {
    Application.findOne = jest.fn().mockResolvedValue({ _id: "app9", companyId, status: "applied" });
    Application.create = jest.fn();
    const res = await post({ jobId: "JOB-1", candidateId: candId });
    expect(res.status).toBe(200);
    expect(res.body.created).toBe(false);
    expect(res.body.applicationId).toBe("app9");
    expect(Application.create).not.toHaveBeenCalled();
  });

  test("rejects a job that is not this company's, and bad input", async () => {
    Company.findById = jest.fn().mockReturnValue(leanOf({ jobId: "OTHER" }));
    expect((await post({ jobId: "JOB-1", candidateId: candId })).status).toBe(404);
    expect((await post({ jobId: "", candidateId: "x" })).status).toBe(400);
  });
});
