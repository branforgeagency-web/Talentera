const mongoose = require("mongoose");

// An assessment an academy builds itself (MCQ / fill-in-the-blank / question & answer)
// and conducts on its own students inside Talentera.
const QuestionSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["mcq", "fill_blank", "qa"], required: true },
    text: { type: String, required: true, trim: true },
    // MCQ only
    options: { type: [String], default: [] },
    // mcq: zero-based index of the right option (stored as string, e.g. "2")
    // fill_blank: accepted answers separated by "|" (case-insensitive match)
    // qa: model answer / key points - NOT auto-graded, the academy grades these by hand
    answer: { type: String, default: "" },
    marks: { type: Number, default: 1, min: 0 },
  },
  { _id: true }
);

const AcademyAssessmentSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    title: { type: String, required: true, trim: true },
    course: { type: String, default: "" },
    // Empty = every student of the academy; otherwise only students in these batches.
    batchCodes: { type: [String], default: [] },
    instructions: { type: String, default: "" },
    durationMins: { type: Number, default: 30 },
    passPercentage: { type: Number, default: 50 },
    questions: { type: [QuestionSchema], default: [] },
    status: { type: String, enum: ["draft", "published", "closed"], default: "draft" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademyAssessment", AcademyAssessmentSchema);
