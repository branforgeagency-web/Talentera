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
  studentName: { type: String, required: true },
  role: { type: String, default: "Sr Medical Coder" },
  company: { type: String, default: "Optum" },
  city: { type: String, default: "Chennai" },
  ctc: { type: String, default: "₹5.5 LPA" },
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
    courses: [CourseSubSchema],
    questions: [QuestionSubSchema],
    placements: [PlacementSubSchema],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Academy", AcademySchema);
