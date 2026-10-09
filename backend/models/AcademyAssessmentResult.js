const mongoose = require("mongoose");

// One student's result for an academy assessment - either taken inside Talentera
// (source "platform") or a score-only entry for an assessment the academy already
// conducted elsewhere (source "academy_score_upload").
const AcademyAssessmentResultSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    assessmentId: { type: mongoose.Schema.Types.ObjectId, ref: "AcademyAssessment", default: null, index: true },
    assessmentTitle: { type: String, default: "" },
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    candidateEmail: { type: String, default: "" },
    rawScore: { type: Number, default: 0 },
    totalMarks: { type: Number, default: 0 },
    scorePct: { type: Number, default: 0 },
    source: { type: String, enum: ["platform", "academy_score_upload"], default: "platform" },
    // pending_review = has Q&A answers the academy still has to mark
    status: { type: String, enum: ["graded", "pending_review"], default: "graded" },
    answers: { type: mongoose.Schema.Types.Mixed, default: [] },
    conductedOn: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademyAssessmentResult", AcademyAssessmentResultSchema);
