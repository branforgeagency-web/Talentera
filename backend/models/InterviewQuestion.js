const mongoose = require("mongoose");

/**
 * Staff-managed question bank for the Stage 5 AI Video / AI Audio interviews
 * (frontend/src/components/AiVideoAssessment.jsx and AiAudioInterview.jsx).
 *
 * This stage grades COMMUNICATION quality (clarity, fluency, vocabulary &
 * grammar, confidence/delivery) - see backend/utils/aiAssessment.js - not
 * whether the answer is factually/technically "correct". Questions here are
 * meant to be conversational/biographical (tell me about yourself, your
 * training, your background) so there is no answer key to check against.
 *
 * `correctAnswer` is kept as an OPTIONAL free-text field for staff's own
 * reference (e.g. notes on what a strong answer should touch on) - it is
 * never sent to the candidate and, as of the communication-scoring redesign,
 * is no longer read by the grading step at all.
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
      required: false,
      default: "",
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
