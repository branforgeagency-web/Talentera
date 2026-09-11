const mongoose = require("mongoose");

const RetakeRequestSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    candidateEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    candidateName: {
      type: String,
      default: "",
    },
    candidateMobile: {
      type: String,
      default: "",
    },
    stage: {
      type: Number,
      default: 4, // Default to Stage 4 Talentera Proctored Assessment
    },
    assessmentType: {
      type: String,
      default: "Talentera AAPC / RCM Assessment (Stage 4)",
    },
    currentScore: {
      type: Number,
      default: null,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
    },
    videoUrl: {
      type: String,
      default: null,
    },
    proctorLogs: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    integrityScore: {
      type: Number,
      default: null,
    },
    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED"],
      default: "PENDING",
      index: true,
    },
    reviewedBy: {
      type: String,
      default: null,
    },
    reviewNotes: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("RetakeRequest", RetakeRequestSchema);
