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
jest.mock("../utils/email", () => ({
  sendTransactionalEmail: jest.fn().mockResolvedValue({}),
  wrapEmailTemplate: jest.fn((t, h) => h),
}));
jest.mock("../utils/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const Candidate = require("../models/Candidate");
const StudentInvite = require("../models/StudentInvite");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const Application = require("../models/Application");
const academyRoutes = require("../routes/academy");
const { signToken } = require("../middleware/auth");

function chain(data) {
  const c = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    distinct: jest.fn().mockResolvedValue([]),
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

beforeEach(() => {
  jest.clearAllMocks();
  StudentInvite.find = jest.fn().mockReturnValue(chain([]));
  StudentInvite.findOne = jest.fn().mockResolvedValue(null);
  StudentInvite.create = jest.fn().mockImplementation(async (d) => ({ ...d, inviteToken: "tok", save: jest.fn() }));
  StudentInvite.countDocuments = jest.fn().mockResolvedValue(0);
  StudentInvite.updateMany = jest.fn().mockResolvedValue({});
  AcademyActivityEvent.find = jest.fn().mockReturnValue(chain([]));
  PlacementConfirmation.find = jest.fn().mockReturnValue(chain([]));
  Application.find = jest.fn().mockReturnValue(chain([]));
  AcademyBatch.find = jest.fn().mockReturnValue(chain([]));
  Candidate.updateMany = jest.fn().mockResolvedValue({});
});

describe("Create New Batch - students are not pre-registered", () => {
  test("a student added by the academy has no stages done, no Aadhaar verification and no placeholder phone", async () => {
    const academyDoc = { _id: academyId, name: "Thoughtflows", studentsUploaded: 0, save: jest.fn().mockResolvedValue(true) };
    Academy.findById = jest.fn().mockResolvedValue(academyDoc);
    Candidate.findOne = jest.fn().mockResolvedValue(null);
    Candidate.create = jest.fn().mockImplementation(async (d) => ({ _id: "cand1", ...d }));
    AcademyBatch.findOne = jest.fn().mockResolvedValue(null);
    AcademyBatch.create = jest.fn().mockImplementation(async (d) => d);

    const res = await auth(request(app).post("/api/academy/create-batch")).send({
      code: "1122CC", course: "Medical Billing", branch: "Coimbatore",
      studentsList: [{ fullName: "Tejaswini", email: "teja@example.com" }],
    });
    expect(res.status).toBe(200);
    const created = Candidate.create.mock.calls[0][0];
    expect(created.completedStages).toEqual([]);
    expect(created.stage1.aadhaarVerified).toBe(false);
    expect(created.stage1.mobile).toBe("");
    expect(JSON.stringify(created)).not.toMatch(/98765/);
  });
});

describe("Academy dashboard - real data only", () => {
  const academyDoc = { _id: academyId, name: "Thoughtflows", courses: [], placements: [], questions: [], kycStatus: "verified", toObject() { return this; }, save: jest.fn() };

  test("repairs fake 'registered' records and keeps unregistered students out of averages", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain(academyDoc));
    // What a repaired fake record looks like: academy-added, never registered.
    const unregistered = {
      _id: "u1", email: "u1@x.com",
      stage1: { fullName: "Unregistered One", aadhaarVerified: false },
      stage2: { academyId, batch: "1122CC", verified: true },
      completedStages: [],
    };
    Candidate.find = jest.fn().mockReturnValue(chain([unregistered]));
    Candidate.countDocuments = jest.fn().mockResolvedValue(1);

    const res = await auth(request(app).get("/api/academy/dashboard"));
    expect(res.status).toBe(200);

    // The repair targets only records with "verified" Aadhaar but no real eKYC trace and only Stage 1 done.
    const repairCall = Candidate.updateMany.mock.calls.find(([q]) => q["stage1.aadhaarVerified"] === true);
    expect(repairCall).toBeTruthy();
    expect(repairCall[0]["stage1.verificationMethod"]).toEqual({ $exists: false });
    expect(repairCall[0]["stage1.verifiedAt"]).toEqual({ $exists: false });
    expect(repairCall[0].completedStages).toEqual([1]);
    expect(repairCall[1]).toEqual({ $set: { "stage1.aadhaarVerified": false, completedStages: [] } });

    const student = res.body.students[0];
    expect(student.registrationPending).toBe(true);
    expect(student.talenteraScore).toBe(0);
    expect(res.body.kpis.avgScore).toBe(0);
    expect(res.body.kpis.profileComplete).toBe(0);
    expect(res.body.kpis.totalStudents).toBe(1);
  });

  test("a genuinely registered student (real eKYC) is still counted", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain(academyDoc));
    const registered = {
      _id: "r1", email: "r1@x.com",
      stage1: { fullName: "Real Student", aadhaarVerified: true, verificationMethod: "ekyc", verifiedAt: new Date(), maskedAadhaar: "XXXX XXXX 1234", mobile: "+91 90000 11111" },
      stage2: { academyId, batch: "1122CC", verified: true, approvedAt: new Date() },
      completedStages: [1, 2],
    };
    Candidate.find = jest.fn().mockReturnValue(chain([registered]));
    const res = await auth(request(app).get("/api/academy/dashboard"));
    expect(res.status).toBe(200);
    expect(res.body.students[0].registrationPending).toBe(false);
    expect(res.body.kpis.avgScore).toBeGreaterThan(0);
  });
});

describe("Candidates Directory - Interviewing / Rejected / Disputed tabs use real data", () => {
  const academyDoc = { _id: academyId, name: "Thoughtflows", courses: [], placements: [], questions: [], kycStatus: "verified", toObject() { return this; }, save: jest.fn() };
  const reg = (id, name) => ({
    _id: id, email: `${id}@x.com`,
    stage1: { fullName: name, aadhaarVerified: true, verificationMethod: "ekyc", verifiedAt: new Date(), maskedAadhaar: "XXXX XXXX 1234" },
    stage2: { academyId, batch: "1122CC", verified: true, approvedAt: new Date() },
    completedStages: [1, 2],
  });

  test("flags interviewing, rejected-after-interview and disputed students", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain(academyDoc));
    Candidate.find = jest.fn().mockReturnValue(chain([reg("a", "Interviewing A"), reg("b", "Rejected B"), reg("c", "ScreenReject C"), reg("d", "Disputed D"), reg("e", "Plain E")]));
    const co = { _id: "co1", companyName: "Acme" };
    Application.find = jest.fn().mockReturnValue(chain([
      { candidateId: "a", companyId: co, status: "interviewing", updatedAt: new Date() },
      { candidateId: "b", companyId: co, status: "rejected", rejectionReason: "Communication gaps", interviewScheduledAt: new Date(), updatedAt: new Date() },
      { candidateId: "c", companyId: co, status: "rejected", rejectionReason: "Profile mismatch", updatedAt: new Date() },
    ]));
    PlacementConfirmation.find = jest.fn().mockReturnValue(chain([{ candidateId: "d", companyName: "Globex", disputeReason: "Never joined" }]));

    const res = await auth(request(app).get("/api/academy/dashboard"));
    expect(res.status).toBe(200);
    const by = Object.fromEntries(res.body.students.map((x) => [x.id, x]));
    expect(by.a.inInterview).toBe(true);
    expect(by.a.rejection).toBeNull();
    expect(by.b.rejection).toMatchObject({ company: "Acme", reason: "Communication gaps" });
    expect(by.b.inInterview).toBe(false);
    // rejected before any interview is a screening reject, not part of the post-interview Rejected tab
    expect(by.c.rejection).toBeNull();
    expect(by.d.placementDisputed).toBe(true);
    expect(by.d.disputeCompany).toBe("Globex");
    expect(by.e.inInterview).toBe(false);
    expect(by.e.placementDisputed).toBe(false);
  });

  test("a rejection from the hiring flow's technical round counts as rejected after interview", async () => {
    Academy.findById = jest.fn().mockReturnValue(chain(academyDoc));
    Candidate.find = jest.fn().mockReturnValue(chain([reg("f", "Tech Reject F")]));
    Application.find = jest.fn().mockReturnValue(chain([
      { candidateId: "f", companyId: { _id: "co1", companyName: "Acme" }, status: "rejected", hiring: { stage: "rejected", rejection: { round: "technical", reason: "Failed panel" } }, updatedAt: new Date() },
    ]));
    PlacementConfirmation.find = jest.fn().mockReturnValue(chain([]));
    const res = await auth(request(app).get("/api/academy/dashboard"));
    expect(res.body.students[0].rejection).toMatchObject({ company: "Acme", reason: "Failed panel" });
  });
});

