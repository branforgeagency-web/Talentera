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
jest.mock("../utils/logger", () => ({
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
}));

const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const Candidate = require("../models/Candidate");
const StudentUpload = require("../models/StudentUpload");
const StudentInvite = require("../models/StudentInvite");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const Application = require("../models/Application");
const academyRoutes = require("../routes/academy");
const { signToken } = require("../middleware/auth");

function mockChain(data) {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    populate: jest.fn().mockReturnThis(),
    lean: jest.fn().mockResolvedValue(data),
    then: (resolve) => resolve(data),
  };
  return chain;
}

const app = express();
app.use(express.json());
app.use("/api/academy", academyRoutes);

describe("Academy OS Endpoints Suite (Phases 1-4)", () => {
  const mockAcademyId = "60d0fe4f5311236168a109ca";
  const validToken = signToken(mockAcademyId, "academy");

  beforeEach(() => {
    jest.clearAllMocks();
    Candidate.countDocuments = jest.fn().mockResolvedValue(20);
    StudentInvite.findOne = jest.fn().mockResolvedValue(null);
    Academy.findById = jest.fn().mockResolvedValue({
      _id: mockAcademyId,
      name: "Apex Healthcare Academy",
      email: "admin@apexacademy.in",
      primaryAdmin: "Dr. Rajesh Kumar",
      placements: [],
      save: jest.fn().mockResolvedValue(true),
    });
  });

  describe("Phase 1: Student Upload and Invites", () => {
    test("GET /api/academy/invites returns invite list", async () => {
      StudentInvite.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "inv1",
            fullName: "Rahul Sharma",
            email: "rahul@example.com",
            mobileNumber: "+919876543210",
            status: "delivered",
            sentAt: new Date(),
          },
        ])
      );

      const res = await request(app)
        .get("/api/academy/invites")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.invites)).toBe(true);
      expect(res.body.invites.length).toBe(1);
    });

    test("POST /api/academy/invites/:id/resend triggers re-delivery", async () => {
      const mockInvite = {
        _id: "inv1",
        name: "Rahul Sharma",
        email: "rahul@example.com",
        mobile: "+919876543210",
        academyId: mockAcademyId,
        resendCount: 0,
        status: "sent",
        save: jest.fn().mockResolvedValue(true),
      };
      StudentInvite.findOne = jest.fn().mockResolvedValue(mockInvite);

      const res = await request(app)
        .post("/api/academy/invites/inv1/resend")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ channel: "whatsapp" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockInvite.save).toHaveBeenCalled();
    });

    test("POST /api/academy/add-student registers single student and sends invite", async () => {
      Candidate.findOne = jest.fn().mockResolvedValue(null);
      Candidate.create = jest.fn().mockResolvedValue({
        _id: "cand_new_1",
        email: "newstudent@example.com",
        stage1: { fullName: "New Student" },
      });
      StudentInvite.create = jest.fn().mockResolvedValue({
        _id: "inv_new_1",
        email: "newstudent@example.com",
        name: "New Student",
        status: "delivered",
      });
      AcademyBatch.findOne = jest.fn().mockResolvedValue({
        code: "JAN-HCC-01",
        studentsCount: 5,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post("/api/academy/add-student")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          fullName: "New Student",
          email: "newstudent@example.com",
          mobile: "9876543210",
          course: "HCC Coding Specialization",
          batchCode: "JAN-HCC-01",
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.student).toBeDefined();
    });

    test("POST /api/academy/upload-students imports roster and invites students", async () => {
      Candidate.findOne = jest.fn().mockResolvedValue(null);
      Candidate.create = jest.fn().mockResolvedValue({
        _id: "cand_batch_1",
        email: "bulk1@example.com",
      });
      StudentInvite.create = jest.fn().mockResolvedValue({
        _id: "inv_batch_1",
        email: "bulk1@example.com",
      });
      AcademyBatch.findOne = jest.fn().mockResolvedValue({
        code: "JAN-HCC-01",
        studentsCount: 10,
        save: jest.fn().mockResolvedValue(true),
      });

      const res = await request(app)
        .post("/api/academy/upload-students")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          batchName: "JAN-HCC-01",
          students: [
            { name: "Bulk Student 1", email: "bulk1@example.com", mobile: "9876543211", course: "HCC Coding Specialization" },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(1);
    });
  });

  describe("Phase 2: Verification Progress and Approvals", () => {
    test("GET /api/academy/stuck-students returns students stalled over 48h", async () => {
      Candidate.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "c1",
            email: "ananya@example.com",
            mobile: "+919811223344",
            stage1: { fullName: "Ananya Iyer", mobile: "+919811223344" },
            stage2: { batch: "Batch 2026-A", verified: false },
            completedStages: [1],
            updatedAt: new Date(Date.now() - 3 * 86400000),
          },
        ])
      );

      const res = await request(app)
        .get("/api/academy/stuck-students")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.stuckStudents.length).toBe(1);
    });

    test("POST /api/academy/students/bulk-nudge triggers notification to all stuck candidates", async () => {
      const res = await request(app)
        .post("/api/academy/students/bulk-nudge")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ studentIds: ["c1"], channel: "whatsapp" });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.nudgedCount).toBe(1);
    });

    test("GET /api/academy/approvals returns pending review items", async () => {
      Candidate.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "c1",
            email: "vikram@example.com",
            stage1: { fullName: "Vikram Das" },
            stage2: { verified: false, batch: "JAN-HCC-01", course: "HCC Coding" },
            stage5: { videoUrl: "https://example.com/video.mp4", verified: false },
          },
        ])
      );

      const res = await request(app)
        .get("/api/academy/approvals")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.pendingApprovals)).toBe(true);
      expect(res.body.pendingApprovals.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Phase 3: Interview and Company Activity Tracking", () => {
    test("GET /api/academy/activity returns event stream log", async () => {
      AcademyActivityEvent.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "ev1",
            eventType: "interview_scheduled",
            candidateName: "Kavita Reddy",
            companyName: "Apollo Health",
            jobTitle: "Medical Billing Executive",
            createdAt: new Date(),
          },
        ])
      );

      const res = await request(app)
        .get("/api/academy/activity")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.events)).toBe(true);
      expect(res.body.events.length).toBe(1);
    });

    test("GET /api/academy/interviews/kanban returns 5-column pipeline data", async () => {
      Candidate.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "c1",
            email: "priya@example.com",
            stage1: { fullName: "Priya Subramanian" },
            stage2: { batch: "JAN-HCC-01" },
            completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
          },
        ])
      );
      Application.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "app1",
            candidateId: "c1",
            companyId: { _id: "comp1", companyName: "Optum" },
            status: "hired",
            updatedAt: new Date(),
          },
        ])
      );
      PlacementConfirmation.find = jest.fn().mockReturnValue(
        mockChain([{ candidateId: "c1", companyId: "comp1", status: "confirmed", ctc: "₹5.5 LPA" }])
      );

      const res = await request(app)
        .get("/api/academy/interviews/kanban")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.kanban).toBeDefined();
      expect(res.body.kanban.joined).toBeDefined();
    });

    test("POST /api/academy/activity/simulate generates live demo event", async () => {
      Candidate.findOne = jest.fn().mockResolvedValue({
        _id: "c1",
        stage1: { fullName: "Karthik Subramanian" },
      });

      AcademyActivityEvent.create = jest.fn().mockResolvedValue({
        _id: "ev_sim",
        academyId: mockAcademyId,
        eventType: "interview_scheduled",
        candidateName: "Karthik Subramanian",
        companyName: "Optum",
        jobTitle: "Medical Coder",
      });

      const res = await request(app)
        .post("/api/academy/activity/simulate")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.event).toBeDefined();
    });
  });

  describe("Phase 4: Placement Confirmation and Analytics Loop", () => {
    test("GET /api/academy/placements/confirmations returns 30-day tracking queue", async () => {
      PlacementConfirmation.find = jest.fn().mockReturnValue(
        mockChain([
          {
            _id: "plc1",
            studentName: "Rahul Sharma",
            companyName: "Apollo Hospitals",
            joinedDate: new Date(),
            status: "pending_30d_check",
          },
        ])
      );

      const res = await request(app)
        .get("/api/academy/placements/confirmations")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.confirmations)).toBe(true);
      expect(res.body.confirmations.length).toBe(1);
    });

    test("POST /api/academy/placements/:id/confirm sets retentionConfirmed to true", async () => {
      const mockPlc = {
        _id: "plc1",
        candidateName: "Priya Subramanian",
        companyName: "Optum",
        academyId: mockAcademyId,
        status: "pending",
        save: jest.fn().mockResolvedValue(true),
      };
      PlacementConfirmation.findOne = jest.fn().mockResolvedValue(mockPlc);

      const res = await request(app)
        .post("/api/academy/placements/plc1/confirm")
        .set("Authorization", `Bearer ${validToken}`)
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockPlc.status).toBe("confirmed");
    });

    test("GET /api/academy/reports/monthly returns metrics and peer benchmark", async () => {
      Candidate.find = jest.fn().mockReturnValue(mockChain([]));
      PlacementConfirmation.find = jest.fn().mockReturnValue(mockChain([]));

      const res = await request(app)
        .get("/api/academy/reports/monthly")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.report).toBeDefined();
      expect(res.body.report.topCompanies).toBeDefined();
    });
  });
});