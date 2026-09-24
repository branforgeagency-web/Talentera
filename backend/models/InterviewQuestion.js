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
    // Exactly 3 staff-configured medical-coding keywords/concepts for this
    // question, used by the AI Mock Interview ("Messi", see
    // backend/utils/claudeInterview.js) to score each candidate answer as a
    // Keyword Match out of 3 (semantic/synonym matching, not just exact
    // text). If a staff member leaves this empty, claudeInterview.js derives
    // a best-effort set of 3 keywords from correctAnswer instead.
    keywords: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => !Array.isArray(arr) || arr.length === 0 || arr.length === 3,
        message: "keywords must be either empty or contain exactly 3 entries.",
      },
    },
    // Healthcare domain this interview question belongs to
    domain: {
      type: String,
      // "Front Office" is kept only for backward compatibility with
      // questions staff already tagged under that older internal label -
      // new questions should use "Eligibility & Verification", the exact
      // label candidates see and pick in Stage 2 Training. Both are treated
      // as the same domain when matching questions to a candidate - see
      // getDomainQueryAliases() in utils/aiInterviewSession.js.
      enum: ["Medical Coding", "Medical Billing", "Accounts Receivable", "Front Office", "Eligibility & Verification", "General"],
      default: "Medical Coding",
      index: true,
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
