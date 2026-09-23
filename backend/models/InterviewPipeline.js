const mongoose = require("mongoose");

const InterviewPipelineSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null,
      index: true,
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
      index: true,
    },
    companyName: {
      type: String,
      required: true,
    },
    jobId: {
      type: String,
      default: "",
    },
    jobRole: {
      type: String,
      default: "Medical Coder Trainee",
    },
    domain: {
      type: String,
      enum: ["Medical Coding", "Medical Billing", "AR Calling", "Cross-Domain RCM"],
      default: "Medical Coding",
    },
    roundNumber: {
      type: Number,
      default: 1,
    },
    roundName: {
      type: String,
      default: "Technical Round", // HR Screening, Technical Assessment, Managerial Round, Voice / Accent Evaluation, Client Round
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    mode: {
      type: String,
      enum: ["Online Video", "On-Campus Drive", "In-Office / Client Facility", "Telephonic"],
      default: "Online Video",
    },
    meetingLinkOrLocation: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["SHORTLISTED", "SCHEDULED", "COMPLETED", "SELECTED", "REJECTED", "ON_HOLD", "OFFER_RELEASED", "JOINED"],
      default: "SHORTLISTED",
      index: true,
    },
    resultFeedback: {
      type: String,
      default: "",
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    offerDetails: {
      designation: { type: String, default: "" },
      ctc: { type: String, default: "" },
      location: { type: String, default: "" },
      shift: { type: String, default: "Day Shift" },
      workMode: { type: String, default: "WFO" },
      offerDate: { type: Date, default: null },
      joiningDate: { type: Date, default: null },
      offerLetterUrl: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("InterviewPipeline", InterviewPipelineSchema);
