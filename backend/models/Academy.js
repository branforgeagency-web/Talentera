const mongoose = require("mongoose");
const crypto = require("crypto");

const CourseSubSchema = new mongoose.Schema({
  category: { type: String, default: "Medical Coding" },
  duration: { type: String, default: "3 MONTHS" },
  title: { type: String, required: true },
  totalHrs: { type: Number, default: 120 },
  batches: { type: Number, default: 1 },
  enrolled: { type: Number, default: 25 },
  status: { type: String, default: "active" },
  syllabus: { type: [String], default: ["ICD-10-CM Basics", "CPT Modifiers", "Documentation Review", "Capstone"] },
});

const QuestionSubSchema = new mongoose.Schema({
  question: { type: String, required: true },
  topic: { type: String, default: "HCC" },
  type: { type: String, default: "MCQ" },
  difficulty: { type: String, default: "Mid" },
  marks: { type: Number, default: 2 },
  status: { type: String, default: "Editable" },
  courseTitle: { type: String, default: "HCC Coding Specialization" },
});

const PlacementSubSchema = new mongoose.Schema({
  // Optional link to the real candidate record, when the academy picked one
  // from their roster instead of typing a name (lets us look up a genuine
  // platform-hire record to offer as an auto-fill suggestion).
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", default: null },
  studentName: { type: String, required: true },
  // No fabricated defaults here on purpose: every field below must be a
  // value the academy actually typed or selected (or that was pulled from a
  // real PlacementConfirmation record and clearly labeled as auto-filled on
  // the frontend) - never a silent placeholder like "Optum" / "₹5.5 LPA".
  role: { type: String, required: true },
  company: { type: String, required: true },
  city: { type: String, default: "" },
  ctc: { type: String, required: true },
  // How this placement came about - the academy explicitly selects one.
  placementSource: {
    type: String,
    enum: ["Talentera Platform", "Campus Placement Drive", "Academy Referral", "Direct Company Outreach", "Other"],
    required: true,
  },
  // Where the candidate stands on actually starting the job - explicitly
  // selected by the academy, not assumed "Verified" the moment it's logged.
  joiningStatus: {
    type: String,
    enum: ["Offer Accepted", "Joined", "Yet to Join", "Declined"],
    required: true,
  },
  date: { type: String, default: "Recently" },
});

const AcademySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contactName: {
      type: String,
      default: "Academy Partner",
    },
    primaryAdmin: {
      type: String,
      default: "sdfd",
    },
    phone: {
      type: String,
      default: "+91 9765435676",
    },
    specialty: {
      type: String,
      default: "Medical Coding",
    },
    headquarters: {
      type: String,
      default: "Coimbatore",
    },
    branches: {
      type: [String],
      default: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
    },
    tier: {
      type: String,
      default: "Verified Partner",
    },
    totalAlumni: {
      type: String,
      default: "35,000+",
    },
    badgeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
    partnerSince: {
      type: String,
      default: () => "Jan 2025",
    },
    studentsUploaded: {
      type: Number,
      default: 100,
    },
    verifiedPct: {
      type: Number,
      default: 94,
    },
    passwordHash: {
      type: String,
      default: null,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    // Account & Institutional KYC Verification fields
    kycStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    kycSubmittedAt: { type: Date, default: null },
    kycVerifiedAt: { type: Date, default: null },
    kycNotes: { type: String, default: "" },
    kycRejectionReason: { type: String, default: "" },
    kycData: { type: mongoose.Schema.Types.Mixed, default: {} },
    courses: [CourseSubSchema],
    questions: [QuestionSubSchema],
    placements: [PlacementSubSchema],
  },
  { timestamps: true }
);

AcademySchema.index({ kycStatus: 1 });

// Never leak passwordHash in JSON responses
AcademySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("Academy", AcademySchema);
