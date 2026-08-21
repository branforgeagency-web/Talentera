const mongoose = require("mongoose");

/**
 * Company account + 9-stage onboarding wizard state.
 *
 * Mirrors Candidate.js's shape/style: stage data is kept as loosely-typed
 * Mixed objects on purpose (each stage's field list is defined in
 * frontend/src/data/companyOnboardingStages.js and can evolve there without
 * a schema migration). Stage ids match the prototype's naming: "1A", "1B",
 * "2".."9" (see company_flow_spec.md section 4).
 */
const CompanySchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },
    contactName: { type: String, default: "" },
    companyName: { type: String, default: "" },
    mobile: { type: String, default: "" },

    // Ids of onboarding stages with at least one saved field, e.g. ["1A","1B","2"]
    completedStages: {
      type: [String],
      default: [],
    },

    // Stage 1A: Account & KYC (15 fields)
    stage1a: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 1B: Point of Contact (4 fields)
    stage1b: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 2: Company Profile (12 fields)
    stage2: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 3: Team Setup (6 fields)
    stage3: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 4: Branding (5 fields)
    stage4: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 5: Question Bank (2 fields)
    stage5: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 6: Custom Rubric (3 fields)
    stage6: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 7: Pre-Candidate Action (7 fields)
    stage7: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 8: Settings & Integrations (10 fields)
    stage8: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 9: First JD (23 fields) - the site's de-facto job-posting form
    stage9: { type: mongoose.Schema.Types.Mixed, default: null },

    jdPublished: { type: Boolean, default: false },
    jobId: { type: String, default: null },
    jdPublishedAt: { type: Date, default: null },

    // Raw answers from the "Post a Requirement" / "Post a Job" lead-gen
    // wizard (frontend/src/pages/CompanyRegister.jsx) that don't map
    // 1:1 onto a stage's field vocabulary (e.g. team size buckets, hiring
    // frequency). Previously this data was collected on screen and then
    // silently discarded at submit time. It's kept here, unstructured, so
    // ops/staff can see what the company originally asked for even though
    // only a subset of it gets pre-filled into the matching onboarding
    // stage fields (see companyAuth.js's /register handler).
    intakeNotes: { type: mongoose.Schema.Types.Mixed, default: null },

    // Account & KYC Verification fields
    kycStatus: {
      type: String,
      enum: ["pending", "under_review", "verified", "rejected"],
      default: "pending",
    },
    kycSubmittedAt: { type: Date, default: null },
    kycVerifiedAt: { type: Date, default: null },
    kycNotes: { type: String, default: "" },
    kycRejectionReason: { type: String, default: "" },
    docVerifications: { type: mongoose.Schema.Types.Mixed, default: {} },
    rejectedKycFields: { type: [String], default: [] },

    // Subscription plan - SCAFFOLDING ONLY, no payment gateway wired yet.
    // See backend/config/plans.js and IMPROVEMENT_ROADMAP.md "No plans,
    // seats, or billing." Every company defaults to "free" until staff (or,
    // later, a real checkout flow) assigns a paid plan.
    plan: {
      type: String,
      enum: ["free", "growth", "enterprise"],
      default: "free",
    },
    planAssignedAt: { type: Date, default: null },
    planAssignedBy: { type: String, default: "" }, // staff username, for the audit trail
  },
  { timestamps: true }
);

// Never leak passwordHash in JSON responses
CompanySchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

CompanySchema.index({ kycStatus: 1 });

module.exports = mongoose.model("Company", CompanySchema);
