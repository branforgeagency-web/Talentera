const mongoose = require("mongoose");

const AcademyBatchSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
    },
    code: {
      type: String,
      required: true,
      trim: true,
    },
    course: {
      type: String,
      required: true,
      trim: true,
    },
    studentsCount: {
      type: Number,
      default: 0,
    },
    completionPct: {
      type: Number,
      default: 100,
    },
    status: {
      type: String,
      enum: ["Draft", "Upcoming", "Active", "Completed", "Archived"],
      default: "Active",
    },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
    trainingMode: {
      type: String,
      enum: ["Online", "Offline", "Hybrid", ""],
      default: "",
    },
    capacity: { type: Number, default: null },
    branch: { type: String, default: "", trim: true },
  },
  { timestamps: true }
);

// routes/academy.js queries batches for the logged-in academy
AcademyBatchSchema.index({ academyId: 1 });
AcademyBatchSchema.index({ academyId: 1, branch: 1 });

module.exports = mongoose.model("AcademyBatch", AcademyBatchSchema);
