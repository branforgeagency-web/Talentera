const mongoose = require("mongoose");

const AcademyActivityEventSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    companyName: {
      type: String,
      required: true,
      default: "Optum",
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Application",
      default: null,
    },
    jobTitle: {
      type: String,
      default: "Medical Coder",
    },
    batchCode: {
      type: String,
      default: "",
    },
    courseTitle: {
      type: String,
      default: "",
    },
    eventType: {
      type: String,
      enum: [
        "viewed",
        "locked",
        "applied",
        "chatted",
        "shortlisted",
        "interview_scheduled",
        "interview_completed",
        "offer_extended",
        "offer_accepted",
        "rejected",
        "on_hold",
      ],
      required: true,
      index: true,
    },
    eventMeta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
      // Stores: interviewTime, salary, reason, notes, lockExpiresAt, etc.
    },
  },
  { timestamps: true }
);

AcademyActivityEventSchema.index({ academyId: 1, createdAt: -1 });
AcademyActivityEventSchema.index({ candidateId: 1, createdAt: -1 });

module.exports = mongoose.model("AcademyActivityEvent", AcademyActivityEventSchema);
