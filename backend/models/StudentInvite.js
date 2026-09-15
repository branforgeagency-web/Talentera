const mongoose = require("mongoose");
const crypto = require("crypto");

const StudentInviteSchema = new mongoose.Schema(
  {
    uploadId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "StudentUpload",
      default: null,
      index: true,
    },
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "AcademyBatch",
      default: null,
    },
    batchCode: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: "",
      trim: true,
    },
    course: {
      type: String,
      default: "HCC Coding Specialization",
    },
    type: {
      type: String,
      enum: ["fresher", "experienced"],
      default: "fresher",
    },
    preferredSpecialty: {
      type: String,
      default: "HCC",
    },
    expectedSalaryLpa: {
      type: Number,
      default: 5.0,
    },
    preferredCities: {
      type: [String],
      default: ["Chennai", "Coimbatore"],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      default: null,
      index: true,
    },
    inviteToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(32).toString("hex"),
    },
    emailSentAt: {
      type: Date,
      default: () => new Date(),
    },
    emailOpenedAt: {
      type: Date,
      default: null,
    },
    smsSentAt: {
      type: Date,
      default: () => new Date(),
    },
    smsDeliveredAt: {
      type: Date,
      default: () => new Date(Date.now() + 5000),
    },
    whatsappSentAt: {
      type: Date,
      default: null,
    },
    signupCompletedAt: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: ["sent", "delivered", "opened", "signed_up", "stalled"],
      default: "delivered",
      index: true,
    },
    resendCount: {
      type: Number,
      default: 0,
    },
    lastNudgeAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudentInvite", StudentInviteSchema);
