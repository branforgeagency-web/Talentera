const mongoose = require("mongoose");
const crypto = require("crypto");

const DepartmentSubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  degrees: { type: [String], default: ["B.Sc", "B.Tech", "B.Com", "B.Pharm"] },
  studentCount: { type: Number, default: 0 },
});

const CollegeSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      default: () => "COL-" + crypto.randomBytes(3).toString("hex").toUpperCase(),
    },
    type: {
      type: String,
      enum: [
        "Arts & Science",
        "Engineering & Technology",
        "Pharmacy",
        "Allied Health Sciences",
        "Nursing",
        "Medical",
        "Management & Commerce",
        "Polytechnic",
        "Autonomous University",
        "Other",
      ],
      default: "Arts & Science",
    },
    affiliation: {
      type: String,
      default: "State University",
      trim: true,
    },
    yearEstablished: {
      type: Number,
      default: () => new Date().getFullYear() - 15,
    },
    website: {
      type: String,
      default: "",
      trim: true,
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      default: "",
      trim: true,
    },
    collegeContactPhone: {
      type: String,
      default: "",
    },

    // Placement Officer Details (Key Account Contact)
    placementOfficerName: {
      type: String,
      required: true,
      trim: true,
    },
    placementOfficerEmail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    placementOfficerMobile: {
      type: String,
      required: true,
      trim: true,
    },
    alternateContact: {
      type: String,
      default: "",
    },

    // Authentication
    passwordHash: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      default: "college",
    },
    isActive: {
      type: Boolean,
      default: true,
    },

    // Verification & Partnership Status
    verificationStatus: {
      type: String,
      enum: ["PENDING", "UNDER_REVIEW", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    tier: {
      type: String,
      enum: ["Standard Partner", "Silver Institutional Partner", "Gold RCM Center of Excellence", "Premier Academic Partner"],
      default: "Standard Partner",
    },
    mouSigned: {
      type: Boolean,
      default: false,
    },
    mouDocumentUrl: {
      type: String,
      default: null,
    },

    // Departments & Capacity
    departments: {
      type: [DepartmentSubSchema],
      default: () => [
        { name: "Life Sciences & Biotechnology", degrees: ["B.Sc Biotechnology", "M.Sc Biochemistry"], studentCount: 120 },
        { name: "Allied Health Sciences", degrees: ["B.Sc Allied Health", "BPT"], studentCount: 90 },
        { name: "Commerce & Management", degrees: ["B.Com", "BBA"], studentCount: 150 },
        { name: "Computer Science & IT", degrees: ["BCA", "B.Sc CS"], studentCount: 110 },
      ],
    },
    totalStudentsCount: {
      type: Number,
      default: 0,
    },

    // Live Aggregated KPI Caches
    stats: {
      totalEnrolled: { type: Number, default: 0 },
      profilesCompleted: { type: Number, default: 0 },
      medicalCodingCount: { type: Number, default: 0 },
      medicalBillingCount: { type: Number, default: 0 },
      arCallingCount: { type: Number, default: 0 },
      certifiedCount: { type: Number, default: 0 },
      assessmentCompletedCount: { type: Number, default: 0 },
      interviewReadyCount: { type: Number, default: 0 },
      shortlistedCount: { type: Number, default: 0 },
      selectedCount: { type: Number, default: 0 },
      joinedCount: { type: Number, default: 0 },
      pendingVerificationCount: { type: Number, default: 0 },
    },
  },
  { timestamps: true }
);

CollegeSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("College", CollegeSchema);
