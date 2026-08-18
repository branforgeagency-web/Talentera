const mongoose = require("mongoose");

const ApplicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobId: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["applied", "shortlisted", "interviewing", "hired", "rejected"],
      default: "applied",
    },
    coverNote: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

// Prevent candidate from applying to the same job multiple times
ApplicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });

module.exports = mongoose.model("Application", ApplicationSchema);
