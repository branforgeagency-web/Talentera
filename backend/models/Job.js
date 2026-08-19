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
    published: { type: Boolean, default: true },
    publishedAt: { type: Date, default: Date.now },
    closedAt: { type: Date, default: null },

    // Same shape as a Stage 9 item set: roletitle, specialty, location,
    // compmin/compmax, etc. Kept as Mixed for the same reason
    // Company.stage9 is - the field list can evolve in
    // companyOnboardingStages.js without a schema migration here.
    fields: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Job", JobSchema);
