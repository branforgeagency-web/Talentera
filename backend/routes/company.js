const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const { requireCompanyAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { getPlan, isUnderJobPostLimit, PLANS } = require("../config/plans");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const { cashfreeVerificationService } = require("../utils/cashfreeVerificationService");
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
  "compmin",
  "compmax",
  "workmode",
  "location",
  "shift",
  "languages",
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

// Helper to sanitize input strings
const toStr = (val, fallback = "") => (typeof val === "string" ? val.trim() : fallback);

// GET /api/company/me - Fetch logged-in company profile
router.get("/me", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });
    res.json({ company });
  } catch (err) {
    logger.error(`Fetch company error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch company profile." });
  }
});

// GET /api/company/billing - current plan + usage and available plan catalog
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
      planAssignedBy: company.planAssignedBy || "default",
      usage: {
        activeJobPosts: legacyJobActive + postedActiveCount,
        maxActiveJobPosts: plan.maxActiveJobPosts,
      },
      availablePlans: Object.values(PLANS),
    });
  } catch (err) {
    logger.error(`Company billing fetch error: ${err.message}`);
    res.status(500).json({ message: "Failed to load billing information." });
  }
});

// POST /api/company/billing/change-plan - self-serve plan tier change for companies
router.post("/billing/change-plan", async (req, res) => {
  try {
    const { plan: targetPlan } = req.body;
    if (!targetPlan || !PLANS[targetPlan]) {
      return res.status(400).json({ message: "Invalid plan. Must be one of: free, growth, enterprise." });
    }

    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    const previousPlan = company.plan || "free";
    if (previousPlan === targetPlan) {
      return res.status(400).json({ message: `Your company is already on the ${getPlan(targetPlan).label} plan.` });
    }

    const nextPlanConfig = getPlan(targetPlan);
    company.plan = targetPlan;
    company.planAssignedAt = new Date();
    company.planAssignedBy = "self-serve";
    await company.save();

    // Log notification for company
    try {
      await Notification.create({
        recipientType: "company",
        recipientId: String(company._id),
        title: `Plan Changed to ${nextPlanConfig.label}`,
        message: `Your subscription plan has been successfully updated from ${getPlan(previousPlan).label} to ${nextPlanConfig.label}.`,
      });
    } catch (notifErr) {
      logger.warn(`Could not create plan change notification: ${notifErr.message}`);
    }

    const legacyJobActive = company.jdPublished && company.jobId ? 1 : 0;
    const postedActiveCount = await Job.countDocuments({ companyId: req.companyId, published: true });

    res.json({
      message: `Your plan has been successfully updated to ${nextPlanConfig.label}!`,
      company,
      plan: nextPlanConfig,
      planAssignedAt: company.planAssignedAt,
      usage: {
        activeJobPosts: legacyJobActive + postedActiveCount,
        maxActiveJobPosts: nextPlanConfig.maxActiveJobPosts,
      },
      availablePlans: Object.values(PLANS),
    });
  } catch (err) {
    logger.error(`Company change plan error: ${err.message}`);
    res.status(500).json({ message: "Failed to update subscription plan." });
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

  const plan = getPlan(company.plan);

  // Plan feature gating:
  // Custom Question Banks (Stage 5 qcustom) is gated to Enterprise tier
  if (stageId === "5" && req.body && req.body.qcustom) {
    if (!plan.customQuestionBanks) {
      return res.status(403).json({
        message: "Custom interview question banks are only available on the Enterprise Tier. Please upgrade to unlock custom questions.",
        requiredPlan: "enterprise",
      });
    }
  }

  // Custom Screening Rubrics (Stage 6) is gated to Enterprise tier
  if (stageId === "6" && req.body && (req.body.rweights || req.body.rpolicy || req.body.rroles)) {
    if (!plan.customScreeningRubrics) {
      return res.status(403).json({
        message: "Custom screening rubrics and per-role weight calibrations are only available on the Enterprise Tier. Please upgrade to unlock.",
        requiredPlan: "enterprise",
      });
    }
  }

  // ATS / HRIS Integrations (Stage 8 sats, swebhook) is gated to Enterprise tier
  if (stageId === "8" && req.body && (req.body.sats || req.body.swebhook)) {
    const isConnectingAts = req.body.sats && req.body.sats !== "None";
    const isSettingWebhook = Boolean(req.body.swebhook);
    if ((isConnectingAts || isSettingWebhook) && !plan.integrationsAtsHris) {
      return res.status(403).json({
        message: "ATS and HRIS webhook / API integrations are only available on the Enterprise Tier. Please upgrade to unlock.",
        requiredPlan: "enterprise",
      });
    }
  }

  const key = `stage${stageId}`;
  company[key] = { ...(company[key] || {}), ...req.body };
  if (!company.completedStages.includes(stageId)) {
    company.completedStages.push(stageId);
  }
  await company.save();

  res.json({ company, plan: plan.id });
});

// POST /api/company/verify-pan - Real-time PAN validation via Cashfree
router.post("/verify-pan", async (req, res) => {
  try {
    const { pan, name } = req.body;
    if (!pan) return res.status(400).json({ message: "PAN number is required." });

    const result = await cashfreeVerificationService.verifyPan(pan, name);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Cashfree PAN verification error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to verify PAN with Cashfree." });
  }
});

// POST /api/company/verify-gstin - Real-time GSTIN validation via Cashfree
router.post("/verify-gstin", async (req, res) => {
  try {
    const { gstin, businessName } = req.body;
    if (!gstin) return res.status(400).json({ message: "GSTIN number is required." });

    const result = await cashfreeVerificationService.verifyGstin(gstin, businessName);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Cashfree GSTIN verification error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to verify GSTIN with Cashfree." });
  }
});

// POST /api/company/verify-bank - Real-time Bank Account Penny Drop validation via Cashfree
router.post("/verify-bank", async (req, res) => {
  try {
    const { bankAccount, ifsc, accountHolderName } = req.body;
    if (!bankAccount || !ifsc) {
      return res.status(400).json({ message: "Bank account number and IFSC code are required." });
    }

    const result = await cashfreeVerificationService.verifyBankAccount(bankAccount, ifsc, accountHolderName);
    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Cashfree Bank Account verification error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to verify Bank Account with Cashfree." });
  }
});

// POST /api/company/verify-kyc - Submit Account & KYC data with Cashfree verification audit
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

  // Execute Cashfree KYC Verifications in background/sync
  let panResult = null;
  let gstinResult = null;
  try {
    panResult = await cashfreeVerificationService.verifyPan(panClean, stage1a.signatory || stage1a.legalname);
    gstinResult = await cashfreeVerificationService.verifyGstin(gstinClean, stage1a.legalname);
  } catch (cfErr) {
    logger.warn(`Cashfree auto-verification note: ${cfErr.message}`);
  }

  company.kycStatus = "under_review";
  company.kycSubmittedAt = new Date();
  company.kycRejectionReason = "";
  company.docVerifications = {
    ...(company.docVerifications || {}),
    panVerification: panResult,
    gstinVerification: gstinResult,
    verifiedVia: "Cashfree Verification Suite",
    verifiedAt: new Date(),
  };

  if (!company.completedStages.includes("1a")) {
    company.completedStages.push("1a");
  }
  company.markModified("docVerifications");
  await company.save();

  res.json({
    message: "Account & KYC data successfully verified and submitted for audit via Cashfree Verification Suite.",
    company,
    panVerification: panResult,
    gstinVerification: gstinResult,
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

  const isVerified = company.kycStatus === "verified";
  if (!isVerified) {
    return res.status(403).json({
      message: "Account & KYC approval required. Only KYC-approved companies can post jobs on Talentera.",
      kycStatus: company.kycStatus || "pending",
    });
  }

  if (!company.jdPublished) {
    const jobId = `TLT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    company.jdPublished = true;
    company.jobId = jobId;
    company.jdPublishedAt = new Date();
    company.jdApprovalStatus = "approved";
    company.jdApprovedAt = new Date();
    company.jdApprovedBy = "Auto-Approved (KYC Verified)";
    company.jdRejectionReason = "";
    if (!company.completedStages.includes("9")) company.completedStages.push("9");
    await company.save();
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

    const isCompanyVerified = company.kycStatus === "verified";

    // Verified companies do not need employee approval — their jobs are auto-approved immediately
    if (isCompanyVerified) {
      if (company.jdPublished && company.jdApprovalStatus !== "rejected" && company.jdApprovalStatus !== "approved") {
        company.jdApprovalStatus = "approved";
        company.jdApprovedAt = company.jdApprovedAt || new Date();
        company.jdApprovedBy = company.jdApprovedBy || "Auto-Approved (KYC Verified)";
        await company.save();
      }
      await Job.updateMany(
        { companyId: req.companyId, approvalStatus: "pending" },
        { approvalStatus: "approved", approvedAt: new Date(), approvedBy: "Auto-Approved (KYC Verified)" }
      );
    } else {
      // If company is not KYC verified, ensure any previously auto-approved jobs are restored to pending
      if (company.jdPublished && company.jdApprovedBy === "Auto-Approved (KYC Verified)") {
        company.jdApprovalStatus = "pending";
        company.jdApprovedAt = null;
        company.jdApprovedBy = "";
        await company.save();
      }
      await Job.updateMany(
        { companyId: req.companyId, approvedBy: "Auto-Approved (KYC Verified)" },
        { approvalStatus: "pending", approvedAt: null, approvedBy: "" }
      );
    }

    const jobs = [];

    if (company.jdPublished && company.jobId) {
      const s9 = company.stage9 || {};
      const applicantsCount = await Application.countDocuments({ jobId: company.jobId });
      const approvalStatus = (isCompanyVerified && company.jdApprovalStatus !== "rejected") ? "approved" : (company.jdApprovalStatus || "pending");
      jobs.push({
        source: "onboarding",
        jobId: company.jobId,
        published: true,
        publishedAt: company.jdPublishedAt,
        closedAt: null,
        applicantsCount,
        fields: s9,
        approvalStatus,
        rejectionReason: company.jdRejectionReason || "",
      });
    }

    const postedJobs = await Job.find({ companyId: req.companyId }).sort({ createdAt: -1 }).lean();
    for (const job of postedJobs) {
      const applicantsCount = await Application.countDocuments({ jobId: job.jobId });
      const approvalStatus = (isCompanyVerified && job.approvalStatus !== "rejected") ? "approved" : (job.approvalStatus || "pending");
      jobs.push({
        source: "posted",
        id: job._id,
        jobId: job.jobId,
        published: job.published,
        publishedAt: job.publishedAt,
        closedAt: job.closedAt,
        applicantsCount,
        fields: job.fields || {},
        approvalStatus,
        rejectionReason: job.rejectionReason || "",
      });
    }

    jobs.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    const plan = getPlan(company.plan);
    const activeCount = jobs.filter((j) => j.published).length;

    res.json({
      jobs,
      canPostMoreJobs: isUnderJobPostLimit(plan, activeCount),
      plan: plan.id,
      activeJobPosts: activeCount,
      maxActiveJobPosts: plan.maxActiveJobPosts,
      isVerified: isCompanyVerified,
      kycStatus: company.kycStatus || "pending",
    });
  } catch (err) {
    logger.error(`Fetch company jobs error: ${err.message}`);
    res.status(500).json({ message: "Failed to load your job posts." });
  }
});

// POST /api/company/jobs - post a job when required from the Company Dashboard.
// Reuses the required-field list and jobId format. Automatically publishes live if
// company is KYC-verified; otherwise submits for review.
router.post("/jobs", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    const isVerified = company.kycStatus === "verified";
    if (!isVerified) {
      return res.status(403).json({
        message: "Account & KYC approval required. Only KYC-approved companies can post jobs on Talentera.",
        kycStatus: company.kycStatus || "pending",
      });
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
      approvalStatus: "approved",
      approvedAt: new Date(),
      approvedBy: "Auto-Approved (KYC Verified)",
      rejectionReason: "",
      fields,
    });

    res.status(201).json({
      message: "Job posted and published live! Candidates can discover and apply now.",
      job,
    });
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
  const plan = getPlan(company?.plan);

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
    const canViewScoresAndCerts = Boolean(plan.viewCandidateScoresAndCerts);

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
        certification: canViewScoresAndCerts ? (candidate.stage3 || {}) : { name: (candidate.stage3?.name || "Professional Certification"), masked: true },
        assessment: canViewScoresAndCerts ? (candidate.stage4 || {}) : { masked: true },
        videoIntro: candidate.stage5 || {},
        liveCharts: canViewScoresAndCerts ? (candidate.stage6 || {}) : { masked: true },
        summary: candidate.stage7 || {},
        employmentStatus: candidate.stage8 || {},
        completedStages: candidate.completedStages,
        score: canViewScoresAndCerts ? scoring.score : null,
        badge: canViewScoresAndCerts ? scoring.badge : null,
        verified: scoring.verified,
      },
    };
  });

  res.json({
    applications: formatted,
    isKycVerified,
    plan: plan.id,
    planFeatures: plan,
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
    const candidateId = candidate?._id || candidate;
    const candidateEmail = candidate?.email;
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const companyName = company?.companyName || "Employer";
    const roleTitle = application.jobTitle || "Role";

    // In-app Candidate Notification from Company
    try {
      if (candidateId) {
        let notifTitle = `Application Status: ${companyName}`;
        let notifMsg = `Your application for "${roleTitle}" at ${companyName} has been updated to "${status}".`;
        let notifType = "application_update";

        if (status === "shortlisted") {
          notifTitle = `Shortlisted by ${companyName}! 🎯`;
          notifMsg = `Great news! Your application for "${roleTitle}" has been shortlisted by ${companyName}.`;
          notifType = "application_shortlisted";
        } else if (status === "interviewing") {
          notifTitle = `Interview Scheduled with ${companyName} 📅`;
          notifMsg = `An interview has been scheduled with ${companyName} for "${roleTitle}". Check your Applications tab for details.`;
          notifType = "interview_scheduled";
        } else if (status === "hired") {
          notifTitle = `Job Offer from ${companyName}! 🎉`;
          notifMsg = `Congratulations! You have received a formal offer from ${companyName} for "${roleTitle}".`;
          notifType = "offer_received";
        } else if (status === "rejected") {
          notifTitle = `Application Status: ${companyName}`;
          notifMsg = `Your application for "${roleTitle}" at ${companyName} was not moved forward.`;
          notifType = "application_update";
        }

        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidateId),
          title: notifTitle,
          message: notifMsg,
          type: notifType,
          meta: {
            source: "company",
            companyId: String(req.companyId),
            companyName,
            applicationId: String(application._id),
            actionType: "applications",
            actionLabel: "View in Applications",
          },
        });
      }
    } catch (notifErr) {
      logger.warn(`Failed to create candidate in-app notification: ${notifErr.message}`);
    }

    if (candidateEmail) {
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
