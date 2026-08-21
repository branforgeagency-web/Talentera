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

// routes/company.js GET /applications filters by companyId on every ATS
// page load; routes/academy.js GET /dashboard filters by candidateId (via
// $in). Neither had a supporting index before this.
ApplicationSchema.index({ companyId: 1, createdAt: -1 });
ApplicationSchema.index({ candidateId: 1 });

module.exports = mongoose.model("Application", ApplicationSchema);
