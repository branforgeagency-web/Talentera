const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const { requireCompanyAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { getPlan, isUnderJobPostLimit } = require("../config/plans");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();
router.use(requireCompanyAuth); // every route below requires a valid company JWT

const VALID_STAGE_IDS = ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"];

const JD_REQUIRED_FIELDS = [
  "roletitle",
  "specialty",
  "level",
  "expmin",
  "expmax",
  "shift",
  "languages",
  "location",
  "workmode",
  "compmin",
  "compmax",
  "openings",
  "urgency",
  "hiringmanager",
];

const APPLICATION_STATUS_LABELS = {
  shortlisted: "Shortlisted",
  interviewing: "moved to the interview stage",
  hired: "Hired / Offered",
  rejected: "not selected for this role",
};

function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

// GET /api/company/me - full onboarding profile
router.get("/me", async (req, res) => {
  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  let modified = false;
  const stage1a = company.stage1a || {};
  if (!stage1a.legalname && company.companyName) {
    stage1a.legalname = company.companyName;
    company.stage1a = stage1a;
    company.markModified("stage1a");
    modified = true;
  }

  const stage1b = company.stage1b || {};
  if (!stage1b.pocname && company.contactName) {
    stage1b.pocname = company.contactName;
    modified = true;
  }
  if (!stage1b.pocemail && company.email) {
    stage1b.pocemail = company.email;
    modified = true;
  }
  if (!stage1b.pocmobile && company.mobile) {
    stage1b.pocmobile = company.mobile;
    modified = true;
  }
  if (modified) {
    company.stage1b = stage1b;
    company.markModified("stage1b");
    await company.save();
  }

  res.json({ company });
});

// GET /api/company/billing - current plan + usage, for a "Plan & Billing"
// screen. SCAFFOLDING ONLY - no payment gateway wired, see
// backend/config/plans.js and IMPROVEMENT_ROADMAP.md "No plans, seats, or
// billing."
router.get("/billing", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId).lean();
    if (!company) return res.status(404).json({ message: "Not found." });

    const plan = getPlan(company.plan);
    const legacyJobActive = company.jdPublished && company.jobId ? 1 : 0;
    const postedActiveCount = await Job.countDocuments({ companyId: req.companyId, published: true });

    res.json({
      plan,
      planAssignedAt: company.planAssignedAt || null,
      usage: {
        activeJobPosts: legacyJobActive + postedActiveCount,
        maxActiveJobPosts: plan.maxActiveJobPosts,
      },
    });
  } catch (err) {
    logger.error(`Company billing fetch error: ${err.message}`);
    res.status(500).json({ message: "Failed to load billing information." });
  }
});

// GET /api/company/notifications - Fetch company notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find({
      recipientType: "company",
      recipientId: String(req.companyId),
    })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error(`Fetch company notifications error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// POST /api/company/notifications/mark-read - Mark company notifications as read
router.post("/notifications/mark-read", async (req, res) => {
  try {
    await Notification.updateMany(
      { recipientType: "company", recipientId: String(req.companyId), read: false },
      { $set: { read: true } }
    );
    res.json({ message: "Notifications marked as read." });
  } catch (err) {
    logger.error(`Mark company notifications read error: ${err.message}`);
    res.status(500).json({ message: "Failed to mark notifications as read." });
  }
});

// PUT /api/company/stage/:id - save-on-blur: persists one stage's field values
router.put("/stage/:id", async (req, res) => {
  const stageId = String(req.params.id).toLowerCase();
  if (!VALID_STAGE_IDS.includes(stageId)) {
    return res.status(400).json({ message: "Invalid onboarding stage." });
  }

  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  const key = `stage${stageId}`;
  company[key] = { ...(company[key] || {}), ...req.body };
  if (!company.completedStages.includes(stageId)) {
    company.completedStages.push(stageId);
  }
  await company.save();

  res.json({ company });
});

// POST /api/company/verify-kyc - Submit Account & KYC data for verification audit
router.post("/verify-kyc", async (req, res) => {
  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  const stage1a = company.stage1a || {};
  const missing = [];
  if (isEmptyValue(stage1a.legalname)) missing.push("Company Legal Name");
  if (isEmptyValue(stage1a.gstin)) missing.push("GSTIN");
  if (isEmptyValue(stage1a.pan)) missing.push("PAN");
  if (isEmptyValue(stage1a.entity)) missing.push("Type of Entity");
  if (isEmptyValue(stage1a.signatory)) missing.push("Authorized Signatory");

  if (missing.length > 0) {
    return res.status(400).json({
      message: `Account & KYC verification requires missing fields: ${missing.join(", ")}`,
      missing,
    });
  }

  // Format validation for GSTIN and PAN
  const gstinClean = String(stage1a.gstin || "").trim().toUpperCase();
  const panClean = String(stage1a.pan || "").trim().toUpperCase();

  const gstinRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;

  const isValidGstin = gstinRegex.test(gstinClean) || gstinClean.length === 15;
  const isValidPan = panRegex.test(panClean) || panClean.length === 10;

  if (!isValidGstin) {
    return res.status(400).json({ message: "Invalid GSTIN format. GSTIN must be a 15-character registered ID." });
  }
  if (!isValidPan) {
    return res.status(400).json({ message: "Invalid PAN format. PAN must be a 10-character code." });
  }

  company.kycStatus = "under_review";
  company.kycSubmittedAt = new Date();
  company.kycRejectionReason = "";
  if (!company.completedStages.includes("1a")) {
    company.completedStages.push("1a");
  }
  await company.save();

  res.json({
    message: "Account & KYC data successfully submitted for verification audit.",
    company,
  });
});

// POST /api/company/upload/doc/:id - generic per-stage document upload (Cloudinary / Local disk)
router.post(
  "/upload/doc/:id",
  upload.single("doc"),
  handleUpload({ resourceType: "auto" }),
  async (req, res) => {
    const stageId = String(req.params.id).toLowerCase();
    if (!VALID_STAGE_IDS.includes(stageId)) {
      return res.status(400).json({ message: "Invalid onboarding stage." });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    const fileUrl = req.file.fileUrl;
    res.json({ docUrl: fileUrl, docName: req.file.originalname });
  }
);

// POST /api/company/publish-jd - Stage 9's "Preview & Publish" flow
router.post("/publish-jd", async (req, res) => {
  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  const stage9 = company.stage9 || {};
  const missing = JD_REQUIRED_FIELDS.filter((f) => isEmptyValue(stage9[f]));
  if (missing.length > 0) {
    return res.status(400).json({ message: "Some required JD fields are missing.", missing });
  }

  if (!company.jdPublished) {
    const jobId = `TLT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    company.jdPublished = true;
    company.jobId = jobId;
    company.jdPublishedAt = new Date();
    company.jdApprovalStatus = "pending";
    company.jdApprovedAt = null;
    company.jdRejectionReason = "";
    if (!company.completedStages.includes("9")) company.completedStages.push("9");
    await company.save();

    // Notify staff there's a new job post waiting in the approval queue -
    // see routes/staff.js GET /dashboard's jobApprovalQueue and
    // POST /verify-job. Every job (onboarding first-JD or a later posting
    // via /company/jobs below) is pending until a staff member reviews it.
    await Notification.create({
      recipientType: "staff",
      recipientId: "staff",
      title: "New Job Post Awaiting Approval",
      message: `${company.companyName || company.email} submitted a job post ("${stage9.roletitle || "Untitled role"}", ${jobId}) for review.`,
      type: "job_submitted",
      meta: { source: "onboarding", companyId: String(company._id), jobId },
    });
  }

  res.json({ company });
});

// GET /api/company/jobs - every job this company has live or has closed,
// merging the legacy single "first JD" (Company.stage9/jobId/jdPublished,
// set by /publish-jd during onboarding) with any additional postings made
// from the Job Posts screen after onboarding. Kept as one list so the
// frontend doesn't need to know which source a given job came from.
router.get("/jobs", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    const jobs = [];

    if (company.jdPublished && company.jobId) {
      const s9 = company.stage9 || {};
      const applicantsCount = await Application.countDocuments({ jobId: company.jobId });
      jobs.push({
        source: "onboarding",
        jobId: company.jobId,
        published: true,
        publishedAt: company.jdPublishedAt,
        closedAt: null,
        applicantsCount,
        fields: s9,
        // Staff approval status - a job only reaches the public board once
        // this is "approved" (see routes/public.js GET /jobs).
        approvalStatus: company.jdApprovalStatus || "pending",
        rejectionReason: company.jdRejectionReason || "",
      });
    }

    const postedJobs = await Job.find({ companyId: req.companyId }).sort({ createdAt: -1 }).lean();
    for (const job of postedJobs) {
      const applicantsCount = await Application.countDocuments({ jobId: job.jobId });
      jobs.push({
        source: "posted",
        id: job._id,
        jobId: job.jobId,
        published: job.published,
        publishedAt: job.publishedAt,
        closedAt: job.closedAt,
        applicantsCount,
        fields: job.fields || {},
        approvalStatus: job.approvalStatus || "pending",
        rejectionReason: job.rejectionReason || "",
      });
    }

    jobs.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const plan = getPlan(company.plan);
    const activeCount = jobs.filter((j) => j.published).length;

    res.json({
      jobs,
      // Gate for the "Post another job" UI - the wizard's 9-step KYC/profile
      // flow already establishes trust; kycStatus is the one signal every
      // other verified-only feature in this app (contact unmasking,
      // company badge, etc.) keys off, so multi-job posting uses the same
      // gate rather than re-deriving a separate "100% profile" check here.
      canPostMoreJobs: company.kycStatus === "verified" && isUnderJobPostLimit(plan, activeCount),
      plan: plan.id,
      activeJobPosts: activeCount,
      maxActiveJobPosts: plan.maxActiveJobPosts,
    });
  } catch (err) {
    logger.error(`Fetch company jobs error: ${err.message}`);
    res.status(500).json({ message: "Failed to load your job posts." });
  }
});

// POST /api/company/jobs - post an additional job once the company is KYC
// verified, without re-running the onboarding wizard. Reuses the same
// required-field list and jobId format as /publish-jd. Also enforces the
// company's plan's active-job-post limit (billing scaffolding - see
// backend/config/plans.js).
router.post("/jobs", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    if (company.kycStatus !== "verified") {
      return res.status(403).json({ message: "Complete Account & KYC verification before posting additional jobs." });
    }

    const plan = getPlan(company.plan);
    const legacyActive = company.jdPublished && company.jobId ? 1 : 0;
    const postedActiveCount = await Job.countDocuments({ companyId: req.companyId, published: true });
    const activeCount = legacyActive + postedActiveCount;

    if (!isUnderJobPostLimit(plan, activeCount)) {
      return res.status(403).json({
        message: `Your "${plan.label}" plan allows up to ${plan.maxActiveJobPosts} active job post(s). Close an existing job or ask Talentera staff to upgrade your plan to post more.`,
        plan: plan.id,
        activeJobPosts: activeCount,
        maxActiveJobPosts: plan.maxActiveJobPosts,
      });
    }

    const fields = req.body || {};
    const missing = JD_REQUIRED_FIELDS.filter((f) => isEmptyValue(fields[f]));
    if (missing.length > 0) {
      return res.status(400).json({ message: "Some required job fields are missing.", missing });
    }

    const jobId = `TLT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const job = await Job.create({
      companyId: req.companyId,
      jobId,
      published: true,
      publishedAt: new Date(),
      approvalStatus: "pending",
      fields,
    });

    // Notify staff there's a new job post waiting in the approval queue -
    // same event as /publish-jd above, see routes/staff.js POST /verify-job.
    await Notification.create({
      recipientType: "staff",
      recipientId: "staff",
      title: "New Job Post Awaiting Approval",
      message: `${company.companyName || company.email} submitted a job post ("${fields.roletitle || "Untitled role"}", ${jobId}) for review.`,
      type: "job_submitted",
      meta: { source: "posted", companyId: String(company._id), jobId, jobDocId: String(job._id) },
    });

    res.status(201).json({ message: "Job submitted for Talentera's approval — it'll go live on the board once a staff member reviews it.", job });
  } catch (err) {
    logger.error(`Post job error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to post job." });
  }
});

// PUT /api/company/jobs/:id - close or reopen a posted job (the legacy
// onboarding first-JD isn't covered here; it doesn't have a close toggle
// today, same as before this change). Reopening a job staff had rejected
// puts it back into the approval queue as "pending" - there's no separate
// edit form here, so this is also how a company resubmits after fixing
// whatever staff flagged (e.g. talking to their POC, updating the listing
// on their end) - see routes/staff.js POST /verify-job for the review side.
router.put("/jobs/:id", async (req, res) => {
  try {
    const { published } = req.body;
    const job = await Job.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!job) return res.status(404).json({ message: "Job not found." });

    job.published = Boolean(published);
    job.closedAt = job.published ? null : new Date();

    let resubmitted = false;
    if (job.published && job.approvalStatus === "rejected") {
      job.approvalStatus = "pending";
      job.rejectionReason = "";
      resubmitted = true;

      const company = await Company.findById(req.companyId).lean();
      await Notification.create({
        recipientType: "staff",
        recipientId: "staff",
        title: "Job Post Resubmitted for Approval",
        message: `${company?.companyName || company?.email || "A company"} resubmitted a previously rejected job post (${job.jobId}) for review.`,
        type: "job_submitted",
        meta: { source: "posted", companyId: String(req.companyId), jobId: job.jobId, jobDocId: String(job._id) },
      });
    }
    await job.save();

    res.json({
      message: resubmitted ? "Job reopened and resubmitted for approval." : job.published ? "Job reopened." : "Job closed.",
      job,
    });
  } catch (err) {
    logger.error(`Update job error: ${err.message}`);
    res.status(500).json({ message: "Failed to update job." });
  }
});

// GET /api/company/applications - ATS candidate review list for company.
// Supports optional ?page=&limit= pagination (added on top of the existing
// behavior, which is preserved when those params are omitted, to avoid
// breaking the current frontend) - see IMPROVEMENT_ROADMAP.md "No
// pagination on list endpoints."
router.get("/applications", async (req, res) => {
  const company = await Company.findById(req.companyId);
  const isKycVerified = Boolean(company && company.kycStatus === "verified");

  const hasPaging = req.query.page !== undefined || req.query.limit !== undefined;
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(200, Math.max(1, Number(req.query.limit) || 50));

  let query = Application.find({ companyId: req.companyId })
    .populate("candidateId")
    .sort({ createdAt: -1 });

  if (hasPaging) {
    query = query.skip((page - 1) * limit).limit(limit);
  }

  const [applications, total] = await Promise.all([
    query,
    Application.countDocuments({ companyId: req.companyId }),
  ]);

  // With multiple jobs per company now possible (see /jobs above), each
  // application needs to say which role it's for - previously there was
  // only ever one job per company so this wasn't tracked at all.
  const jobTitleByJobId = {};
  if (company && company.jdPublished && company.jobId) {
    jobTitleByJobId[company.jobId] = (company.stage9 || {}).roletitle || "Untitled role";
  }
  const jobIds = [...new Set(applications.map((a) => a.jobId).filter((id) => !jobTitleByJobId[id]))];
  if (jobIds.length > 0) {
    const postedJobs = await Job.find({ jobId: { $in: jobIds } }).lean();
    for (const job of postedJobs) {
      jobTitleByJobId[job.jobId] = (job.fields || {}).roletitle || "Untitled role";
    }
  }

  const formatted = applications.map((app) => {
    const candidate = app.candidateId;
    if (!candidate) return app;

    const rawMobile = candidate.stage1?.mobile || candidate.mobile || "";
    const rawEmail = candidate.email || "";

    const maskedMobile = isKycVerified
      ? rawMobile
      : rawMobile
      ? `${rawMobile.substring(0, 3)}****${rawMobile.slice(-2)} 🔒`
      : "🔒 Contact Locked";

    const maskedEmail = isKycVerified
      ? rawEmail
      : rawEmail
      ? `${rawEmail.substring(0, 2)}***@${rawEmail.split("@")[1] || "domain.com"} 🔒`
      : "🔒 Contact Locked";

    const scoring = calculateVerificationScore(candidate.completedStages || []);
    return {
      _id: app._id,
      status: app.status,
      jobId: app.jobId,
      jobTitle: jobTitleByJobId[app.jobId] || "Untitled role",
      coverNote: app.coverNote,
      createdAt: app.createdAt,
      isKycVerified,
      candidate: {
        _id: candidate._id,
        email: maskedEmail,
        mobile: maskedMobile,
        basicInfo: {
          ...(candidate.stage1 || {}),
          mobile: maskedMobile,
          phone: maskedMobile,
          email: maskedEmail,
        },
        training: candidate.stage2 || {},
        certification: candidate.stage3 || {},
        assessment: candidate.stage4 || {},
        videoIntro: candidate.stage5 || {},
        liveCharts: candidate.stage6 || {},
        // Previously missing from this response, so the applicant detail
        // view had no summary or employment-status data to show even
        // though the candidate had filled it in - stage7/stage8 exist on
        // every candidate, same as the other stages above.
        summary: candidate.stage7 || {},
        employmentStatus: candidate.stage8 || {},
        completedStages: candidate.completedStages,
        score: scoring.score,
        badge: scoring.badge,
        verified: scoring.verified,
      },
    };
  });

  res.json({
    applications: formatted,
    isKycVerified,
    total,
    ...(hasPaging ? { page, limit, totalPages: Math.ceil(total / limit) } : {}),
  });
});

// PUT /api/company/applications/:id/status - Recruiter status update (shortlisted/interviewing/hired/rejected)
router.put("/applications/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["applied", "shortlisted", "interviewing", "hired", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid application status." });
  }

  const application = await Application.findOne({
    _id: req.params.id,
    companyId: req.companyId,
  }).populate("candidateId", "email stage1");

  if (!application) {
    return res.status(404).json({ message: "Application not found." });
  }

  const previousStatus = application.status;
  application.status = status;
  await application.save();

  // Candidate lifecycle email - previously the only email this app ever
  // sent was OTP mail; a candidate whose application moved forward (or was
  // rejected) had no way to find out except by checking the dashboard
  // themselves. See IMPROVEMENT_ROADMAP.md "No candidate-facing email
  // notifications." Best-effort: a delivery failure shouldn't fail the
  // status-update request itself.
  if (previousStatus !== status && APPLICATION_STATUS_LABELS[status]) {
    const candidate = application.candidateId;
    const candidateEmail = candidate?.email;
    if (candidateEmail) {
      const company = await Company.findById(req.companyId).select("companyName").lean();
      const companyName = company?.companyName || "the employer";
      const candidateName = candidate?.stage1?.fullName || "there";
      sendTransactionalEmail({
        to: candidateEmail,
        toName: candidateName,
        subject: `Your Talentera application status: ${APPLICATION_STATUS_LABELS[status]}`,
        html: wrapEmailTemplate(
          "Your application status has changed",
          `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${candidateName},</p>
           <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your application to <strong>${companyName}</strong> has been updated to: <strong>${APPLICATION_STATUS_LABELS[status]}</strong>.</p>
           <p style="color: #64748B; font-size: 13px;">Log in to your Talentera candidate portal to see the full details.</p>`
        ),
      }).catch((err) => logger.warn(`Lifecycle email failed for application ${application._id}: ${err.message}`));
    }
  }

  res.json({ message: "Application status updated.", application });
});

module.exports = router;
