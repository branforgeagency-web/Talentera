const mongoose = require("mongoose");

// An exam a company runs in its hiring flow (Round 1).
// source: library (cloned from Talentera's bank) | private (company's own Excel/CSV bank)
//         | integration (scores pushed from Mettl / iMocha / etc.) | manual (paper exam, scores typed in)
const HiringExamSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    title: { type: String, required: true, trim: true },
    source: { type: String, enum: ["library", "private", "integration", "manual"], default: "private" },
    description: { type: String, default: "" },
    durationMin: { type: Number, default: 30 },
    cutoffPct: { type: Number, default: 65 },
    questions: [
      {
        topic: { type: String, default: "General" },
        question: { type: String, required: true },
        options: { type: [String], default: [] },
        correct: { type: Number, required: true },
      },
    ],
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("HiringExam", HiringExamSchema);
