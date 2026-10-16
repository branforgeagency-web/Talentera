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
      enum: ["applied", "shortlisted", "interviewing", "hired", "on_hold", "rejected"],
      default: "applied",
    },
    coverNote: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    rejectionDetails: {
      type: String,
      default: "",
    },
    // Interview scheduling + candidate confirmation (Interview Invites tab)
    interviewScheduledAt: { type: Date, default: null },
    interviewTimeText: { type: String, default: "" },
    interviewType: { type: String, default: "" },
    interviewMeetingLink: { type: String, default: "" },
    interviewConfirmed: { type: Boolean, default: false },
    interviewConfirmedAt: { type: Date, default: null },
    // Interview outcome set by the company when a scheduled interview did not happen as planned.
    interviewOutcome: { type: String, enum: ["", "rescheduled", "cancelled", "candidate_no_show", "employer_no_show"], default: "" },
    interviewOutcomeNote: { type: String, default: "" },
    interviewOutcomeAt: { type: Date, default: null },
    rescheduleCount: { type: Number, default: 0 },
    // Batch-hiring flow (Exam -> Technical -> HR -> Management approval -> Offer). See routes/hiring.js.
    hiring: { type: mongoose.Schema.Types.Mixed, default: () => ({}) },
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

// Mirrors hiring-flow stage changes into the Academy / College / Company dashboards (see utils/hiringLinks.js).
ApplicationSchema.post("save", function (doc) {
  try {
    if (doc && doc.hiring && doc.hiring.stage && doc.hiring.stage !== "applied") {
      require("../utils/hiringLinks").syncAfterSave(doc).catch(() => {});
    }
  } catch (_) { /* never block a save */ }
});

module.exports = mongoose.model("Application", ApplicationSchema);
