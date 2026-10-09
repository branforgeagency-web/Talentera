const mongoose = require("mongoose");
const crypto = require("crypto");

const DepartmentSubSchema = new mongoose.Schema({
  name: { type: String, required: true },
  degrees: { type: [String], default: () => [] },
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
      default: "",
      trim: true,
    },
    yearEstablished: {
      type: Number,
      default: null,
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
    // City / state are filled in on the College Profile tab after sign-in
    city: {
      type: String,
      default: "",
      trim: true,
    },
    state: {
      type: String,
      default: "",
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
      default: "",
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
      default: "",
      trim: true,
    },
    // Placement panel members (name, designation, email, mobile) added on the College Profile tab
    placementPanel: {
      type: [mongoose.Schema.Types.Mixed],
      default: () => [],
    },
    // True once the college has completed the post-sign-in College Profile
    profileCompleted: {
      type: Boolean,
      default: false,
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

    // Departments & Capacity - no fabricated default list. A college's
    // participating departments and student counts are real data the
    // college itself enters at registration (see CollegeRegister.jsx's
    // department picker); an empty list here is honest until they do.
    departments: {
      type: [DepartmentSubSchema],
      default: () => [],
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
