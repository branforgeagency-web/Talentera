process.env.JWT_SECRET = "test_jwt_secret_key_1234567890123456";

const request = require("supertest");
const express = require("express");

jest.mock("../models/Application");
jest.mock("../models/Candidate");
jest.mock("../models/Company");
jest.mock("../models/College");
jest.mock("../models/Job");
jest.mock("../models/HiringExam");
jest.mock("../models/HiringSetup");
jest.mock("../models/Notification");
jest.mock("../utils/email", () => ({ sendTransactionalEmail: jest.fn().mockResolvedValue({}), wrapEmailTemplate: (t, b) => b }));
jest.mock("../utils/logger", () => ({ info: jest.fn(), warn: jest.fn(), error: jest.fn(), debug: jest.fn() }));

const Application = require("../models/Application");
const Company = require("../models/Company");
const Notification = require("../models/Notification");
const { sendTransactionalEmail } = require("../utils/email");
const { candidateRouter } = require("../routes/hiring");
const { signToken } = require("../middleware/auth");

const app = express();
app.use(express.json());
app.use("/api/candidate/hiring", candidateRouter);

const candId = "60d0fe4f5311236168a109dd";
const token = signToken(candId, "candidate");
const respond = (accept) => request(app).post("/api/candidate/hiring/offers/a1/respond").set("Authorization", `Bearer ${token}`).send({ accept });

const mkApp = (status = "sent") => ({
  _id: "a1", companyId: "c1", candidateId: { _id: candId, email: "x@y.in", stage1: { fullName: "Sruthi" } },
  hiring: { stage: "offered", audit: [], offer: { status, role: "Junior Coder", ctc: 3, joinDate: "2026-11-10" } },
  markModified: jest.fn(), save: jest.fn().mockResolvedValue(),
});

beforeEach(() => {
  jest.clearAllMocks();
  Notification.create = jest.fn().mockResolvedValue({});
  Company.findById = jest.fn().mockReturnValue({ select: () => ({ lean: async () => ({ email: "hr@acme.in", companyName: "Acme" }) }) });
});

test("accepting an offer saves it and notifies the company in-app and by email", async () => {
  const doc = mkApp();
  Application.findOne = jest.fn().mockReturnValue({ populate: async () => doc });
  const res = await respond(true);
  expect(res.status).toBe(200);
  expect(doc.hiring.offer.status).toBe("accepted");
  expect(Notification.create).toHaveBeenCalledWith(expect.objectContaining({ recipientType: "company", recipientId: "c1", type: "offer_response" }));
  expect(sendTransactionalEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "hr@acme.in" }));
});

test("cannot respond twice", async () => {
  Application.findOne = jest.fn().mockReturnValue({ populate: async () => mkApp("accepted") });
  const res = await respond(true);
  expect(res.status).toBe(400);
  expect(Notification.create).not.toHaveBeenCalled();
});
