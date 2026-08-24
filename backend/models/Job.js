const mongoose = require("mongoose");

/**
 * A single job posting made by a company AFTER onboarding is complete.
 *
 * The "first JD" a company creates still lives on Company.stage9 /
 * Company.jobId / Company.jdPublished (see routes/company.js's
 * /publish-jd) - that flow is part of the onboarding wizard's completion
 * scoring (stageDoneFields / TOTAL_FIELDS in
 * frontend/src/data/companyOnboardingStages.js) and stays as-is.
 *
 * Once a company has filled every onboarding field (100% profile) and its
 * Account & KYC has been verified, it shouldn't have to re-open the 9-step
 * wizard just to post another role - this model backs that "Job Posts"
 * screen (frontend/src/pages/CompanyJobs.jsx) so a verified company can
 * publish any number of additional listings. `fields` reuses the exact
 * field vocabulary of onboarding Stage 9 ("First JD") so the two flows stay
 * compatible - job board (/api/public/jobs) and the apply/applications
 * endpoints treat a Job doc and the legacy Company-level first JD the same
 * way once resolved.
 */
const JobSchema = new mongoose.Schema(
  {
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },
    jobId: {
      type: String,
      required: true,
      unique: true,
    },
    // "published" is the COMPANY's own open/closed toggle (see PUT
    // /api/company/jobs/:id) - it says whether the company wants this role
    // live. It is deliberately separate from approvalStatus below: a
    // company can post/close/reopen freely, but the job only actually
    // shows to candidates once Talentera staff have approved it (see
    // routes/public.js GET /jobs, which requires published && approved).
    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },

    // Staff review gate - every new job post (and every resubmission after
    // a rejection) starts "pending" until a Talentera staff member approves
    // or rejects it from the Staff Hub Job Post Approval Queue (see
    // routes/staff.js POST /verify-job). Mirrors Company.kycStatus /
    // Candidate.stage3.certStatus, the same review-before-it-counts pattern
    // used elsewhere in the app.
    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    approvedAt: { type: Date, default: null },
    approvedBy: { type: String, default: "" }, // staff username, for the audit trail
    rejectionReason: { type: String, default: "" },

    // Same shape as a Stage 9 item set: roletitle, specialty, location,
    // compmin/compmax, etc. Kept as Mixed for the same reason
    // Company.stage9 is - the field list can evolve in
    // companyOnboardingStages.js without a schema migration here.
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

// Company's "my job posts" list (routes/company.js GET /jobs) and the
// multi-job-posting count gate both filter by companyId; the public job
// board (routes/public.js GET /jobs) filters by published (and now
// approvalStatus). Previously neither had an index, so both queries did a
// full collection scan.
JobSchema.index({ companyId: 1, createdAt: -1 });
JobSchema.index({ published: 1, approvalStatus: 1 });
JobSchema.index({ approvalStatus: 1 });

module.exports = mongoose.model("Job", JobSchema);
