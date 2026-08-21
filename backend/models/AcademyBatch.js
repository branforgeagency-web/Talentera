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
      enum: ["Active", "Completed"],
      default: "Active",
    },
  },
  { timestamps: true }
);

// routes/academy.js queries every batch for the logged-in academy on every
// dashboard load.
AcademyBatchSchema.index({ academyId: 1 });

module.exports = mongoose.model("AcademyBatch", AcademyBatchSchema);
