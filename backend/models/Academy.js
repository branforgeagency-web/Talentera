const mongoose = require("mongoose");
const crypto = require("crypto");

const CourseSubSchema = new mongoose.Schema({
  category: { type: String, default: "" },
  duration: { type: String, default: "" },
  title: { type: String, required: true },
  totalHrs: { type: Number, default: 0 },
  batches: { type: Number, default: 0 },
  enrolled: { type: Number, default: 0 },
  status: { type: String, default: "active" },
  syllabus: { type: [String], default: [] },
  fees: { type: Number, default: null, min: 0 }, // optional course fee (INR)
});

const QuestionSubSchema = new mongoose.Schema({
  question: { type: String, required: true },
  topic: { type: String, default: "HCC" },
  type: { type: String, default: "mcq" }, // mcq | fill_blank | qa (legacy rows may hold "MCQ")
  difficulty: { type: String, default: "Mid" },
  marks: { type: Number, default: 2 },
  status: { type: String, default: "Editable" },
  courseTitle: { type: String, default: "HCC Coding Specialization" },
  // MCQ answer choices, and the correct answer (MCQ: index "0"-"3" of the correct option;
  // fill in the blank: the expected text; Q&A: model answer for the trainer's reference)
  options: { type: [String], default: [] },
  answer: { type: String, default: "" },
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
      default: "",
    },
    phone: {
      type: String,
      default: "",
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
      default: [],
    },
    tier: {
      type: String,
      default: "Verified Partner",
    },
    totalAlumni: {
      type: String,
      default: "0",
    },
    badgeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
    partnerSince: {
      type: String,
      default: () => new Date().toLocaleDateString("en-IN", { month: "short", year: "numeric" }),
    },
    studentsUploaded: {
      type: Number,
      default: 0,
    },
    verifiedPct: {
      type: Number,
      default: 0,
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
    // Pictures / videos the academy shows candidates and companies on its public profile
    gallery: [
      {
        type: { type: String, enum: ["image", "video"], default: "image" },
        url: { type: String, required: true },
        caption: { type: String, default: "", maxlength: 160 },
        createdAt: { type: Date, default: Date.now },
      },
    ],
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
