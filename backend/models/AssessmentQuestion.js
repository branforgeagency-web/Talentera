const mongoose = require("mongoose");

/**
 * AssessmentQuestion Schema
 *
 * Multiple-choice question bank for Stage 4 Proctored Assessment.
 * Partitioned by Candidate Primary Domain (from Stage 2):
 * - "Medical Coding"
 * - "Medical Billing"
 * - "Accounts Receivable"
 * - "Front Office"
 *
 * Each domain has 5 syllabus sections with questions, options, correct index, and explanations.
 */
const AssessmentQuestionSchema = new mongoose.Schema(
  {
    domain: {
      type: String,
      required: true,
      enum: ["Medical Coding", "Medical Billing", "Accounts Receivable", "Front Office"],
      default: "Medical Coding",
      index: true,
    },
    sectionKey: {
      type: String,
      required: true,
      trim: true,
    },
    sectionName: {
      type: String,
      required: true,
      trim: true,
    },
    sectionIcon: {
      type: String,
      default: "🎯",
    },
    sectionSub: {
      type: String,
      default: "",
    },
    sectionOrder: {
      type: Number,
      default: 1,
    },
    topic: {
      type: String,
      default: "",
      trim: true,
    },
    question: {
      type: String,
      required: true,
      trim: true,
    },
    options: {
      type: [String],
      required: true,
      validate: {
        validator: (arr) => Array.isArray(arr) && arr.length >= 2,
        message: "Question must have at least 2 options.",
      },
    },
    correct: {
      type: Number,
      required: true,
      default: 0,
    },
    explanation: {
      type: String,
      default: "",
      trim: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AssessmentQuestionSchema.index({ domain: 1, active: 1, sectionOrder: 1, order: 1 });

module.exports = mongoose.model("AssessmentQuestion", AssessmentQuestionSchema);
