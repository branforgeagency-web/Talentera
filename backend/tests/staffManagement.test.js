process.env.JWT_SECRET = "test_jwt_secret_key_1234567890123456";

const request = require("supertest");
const express = require("express");
const bcrypt = require("bcryptjs");

// Mock dependencies before requiring router
jest.mock("../models/Staff");
jest.mock("../models/AuditLog");
jest.mock("../models/Candidate");
jest.mock("../models/Company");
jest.mock("../models/Academy");
jest.mock("../models/AcademyBatch");
jest.mock("../models/Application");
jest.mock("../models/Job");
jest.mock("../models/Notification");
jest.mock("../models/InterviewQuestion");

const Staff = require("../models/Staff");
const AuditLog = require("../models/AuditLog");
const staffRoutes = require("../routes/staff");
const { signToken } = require("../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/staff", staffRoutes);

describe("Staff & Employee Account Management", () => {
  const mockStaffId = "60d0fe4f5311236168a109ca";
  const validToken = signToken(mockStaffId, "staff");

  beforeEach(() => {
    jest.clearAllMocks();
    AuditLog.create = jest.fn().mockResolvedValue({});
    Staff.findById = jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          _id: mockStaffId,
          name: "Admin Auditor",
          role: "Senior Operations Auditor",
          badge: "Gold Certified Lead",
        }),
      }),
    });
  });

  describe("POST /api/staff/employees", () => {
    test("rejects request if username is missing", async () => {
      const res = await request(app)
        .post("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          password: "Password123",
          email: "new.emp@talentera.in",
          name: "New Employee",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/username is required/i);
    });

    test("rejects request if password is less than 6 characters", async () => {
      const res = await request(app)
        .post("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          username: "new.emp",
          password: "123",
          email: "new.emp@talentera.in",
          name: "New Employee",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    test("rejects request if email format is invalid", async () => {
      const res = await request(app)
        .post("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          username: "new.emp",
          password: "Password123",
          email: "invalid-email-format",
          name: "New Employee",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/valid email/i);
    });

    test("rejects request if username is already taken", async () => {
      Staff.findOne = jest.fn().mockResolvedValue({
        username: "existing.user",
        email: "other@talentera.in",
      });

      const res = await request(app)
        .post("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          username: "existing.user",
          password: "Password123",
          email: "new.emp@talentera.in",
          name: "New Employee",
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/already taken/i);
    });

    test("successfully creates employee with hashed password and audit trail", async () => {
      Staff.findOne = jest.fn().mockResolvedValue(null);
      Staff.create = jest.fn().mockImplementation((data) => ({
        ...data,
        _id: "new_staff_id_123",
        toObject: function () {
          return { ...this };
        },
      }));

      const res = await request(app)
        .post("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`)
        .send({
          username: "priya.nair",
          password: "SecurePassword123",
          email: "priya.nair@talentera.in",
          name: "Priya Nair",
          role: "Candidate Verification Specialist",
          badge: "Gold Certified Lead",
        });

      expect(res.status).toBe(201);
      expect(res.body.message).toMatch(/created successfully/i);
      expect(res.body.employee).toBeDefined();
      expect(res.body.employee.username).toBe("priya.nair");
      expect(res.body.employee.email).toBe("priya.nair@talentera.in");
      expect(res.body.employee.passwordHash).toBeUndefined(); // never expose passwordHash

      // Verify password was hashed with bcrypt
      expect(Staff.create).toHaveBeenCalled();
      const callArgs = Staff.create.mock.calls[0][0];
      expect(callArgs.passwordHash).not.toBe("SecurePassword123");
      const isMatch = await bcrypt.compare("SecurePassword123", callArgs.passwordHash);
      expect(isMatch).toBe(true);
    });
  });

  describe("GET /api/staff/employees", () => {
    test("returns list of employees and statistics", async () => {
      Staff.find = jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            lean: jest.fn().mockResolvedValue([
              { _id: "1", username: "anita.reddy", name: "Anita Reddy", active: true },
              { _id: "2", username: "priya.nair", name: "Priya Nair", active: true },
            ]),
          }),
        }),
      });
      Staff.countDocuments = jest.fn()
        .mockResolvedValueOnce(2) // total
        .mockResolvedValueOnce(2); // active

      const res = await request(app)
        .get("/api/staff/employees")
        .set("Authorization", `Bearer ${validToken}`);

      expect(res.status).toBe(200);
      expect(res.body.employees).toHaveLength(2);
      expect(res.body.stats).toEqual({ total: 2, active: 2, inactive: 0 });
    });
  });

  describe("PUT /api/staff/employees/:id/status", () => {
    test("prevents an employee from deactivating their own active account", async () => {
      const res = await request(app)
        .put(`/api/staff/employees/${mockStaffId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ active: false });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot deactivate your own/i);
    });

    test("successfully updates active status of another employee", async () => {
      const otherStaffId = "60d0fe4f5311236168a109cb";
      const mockOtherStaff = {
        _id: otherStaffId,
        username: "other.staff",
        name: "Other Staff",
        active: true,
        save: jest.fn().mockResolvedValue({}),
        toObject: function () {
          return { ...this };
        },
      };
      Staff.findById = jest.fn().mockResolvedValue(mockOtherStaff);

      const res = await request(app)
        .put(`/api/staff/employees/${otherStaffId}/status`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ active: false });

      expect(res.status).toBe(200);
      expect(mockOtherStaff.active).toBe(false);
      expect(mockOtherStaff.save).toHaveBeenCalled();
    });
  });

  describe("PUT /api/staff/employees/:id/reset-password", () => {
    test("rejects password shorter than 6 characters", async () => {
      const res = await request(app)
        .put(`/api/staff/employees/${mockStaffId}/reset-password`)
        .set("Authorization", `Bearer ${validToken}`)
        .send({ newPassword: "123" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/at least 6 characters/i);
    });

    test("resets password successfully with bcrypt hash", async () => {
      const mockTarget = {
        _id: "target_id",
        username: "target.user",
        name: "Target User",
        passwordHash: "old_hash",
        save: jest.fn().mockResolvedValue({}),
      };
      Staff.findById = jest.fn().mockResolvedValue(mockTarget);

      const res = await request(app)
        .put("/api/staff/employees/target_id/reset-password")
        .set("Authorization", `Bearer ${validToken}`)
        .send({ newPassword: "NewSecretPassword123" });

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/reset successfully/i);
      expect(mockTarget.save).toHaveBeenCalled();
      const isMatch = await bcrypt.compare("NewSecretPassword123", mockTarget.passwordHash);
      expect(isMatch).toBe(true);
    });
  });
});
