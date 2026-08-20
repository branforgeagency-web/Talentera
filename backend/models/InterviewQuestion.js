const mongoose = require("mongoose");

/**
 * Staff-managed question bank for the Stage 5 AI Video / AI Audio interviews
 * (frontend/src/components/AiVideoAssessment.jsx and AiAudioInterview.jsx).
 *
 * `correctAnswer` is the reference/model answer used server-side to grade the
 * candidate's transcribed spoken response - it is NEVER sent to the candidate
 * (see the GET /api/candidate/interview-questions route in
 * backend/routes/candidate.js, which strips it before responding). Only the
 * grading step, which runs entirely server-side, reads it.
 */
const InterviewQuestionSchema = new mongoose.Schema(
  {
    text: {
      type: String,
      required: true,
      trim: true,
    },
    correctAnswer: {
      type: String,
      required: true,
      trim: true,
    },
    // Which interview mode this question is asked in. "both" means it's
    // used by the video assessment AND the audio interview.
    mode: {
      type: String,
      enum: ["video", "audio", "both"],
      default: "both",
    },
    // Lower order asked first.
    order: {
      type: Number,
      default: 0,
    },
    // Soft-disable instead of deleting, so historical interview transcripts
    // that reference a question by id still make sense to re-read later.
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewQuestion", InterviewQuestionSchema);
