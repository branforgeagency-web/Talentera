const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const Candidate = require("../models/Candidate");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const { requireCompanyAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore, isExperiencedCandidate } = require("../utils/verificationScore");
const { scoreMatch } = require("../utils/matchScore");
const { getPlan, isUnderJobPostLimit, PLANS } = require("../config/plans");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const { cashfreeVerificationService } = require("../utils/cashfreeVerificationService");
const { emitAcademyEvent } = require("../utils/academyEvents");
const logger = require("../utils/logger");
const { announcePostedJob, announceOnboardingJd } = require("../utils/jobAlerts");

const router = express.Router();
router.use(requireCompanyAuth); // every route below requires a valid company JWT

const VALID_STAGE_IDS = ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"];

const JD_REQUIRED_FIELDS = [
  "roletitle",
  "specialties",
  "level",
  "compensation",
  "workmode",
  "location",
  "shift",
  "languages",
  "openings",
  "urgency",
  "hiringmanager",
];

// Numeric JD fields must never be negative
const NON_NEGATIVE_JD_FIELDS = ["expmin", "expmax", "compmin", "compmax", "joiningbonus", "probation", "openings"];
const findNegativeJdField = (data = {}) =>
  NON_NEGATIVE_JD_FIELDS.find((f) => data[f] !== undefined && data[f] !== null && data[f] !== "" && Number(data[f]) < 0);

const APPLICATION_STATUS_LABELS = {
  shortlisted: "Shortlisted",
  interviewing: "moved to the interview stage",
  hired: "Hired / Offered",
  on_hold: "Selected - On Hold (offer letter awaited)",
  rejected: "not selected for this role",
};

// Maps a real ATS status transition onto the academy activity event types
// consumed by routes/academy.js (Live Activity feed, Interviews Kanban,
// Batch Heatmap). "applied" is deliberately absent - that event fires from
// routes/candidate.js's apply endpoint, at the moment the candidate acts,
// not here.
const ACADEMY_EVENT_TYPE_BY_STATUS = {
  shortlisted: "shortlisted",
  interviewing: "interview_scheduled",
  hired: "offer_extended",
  rejected: "rejected",
};

// Resolves a job's display title from wherever it actually lives: the
// legacy "first JD" published straight from onboarding Stage 9, or a
// standalone Job document posted afterward from the Job Posts screen (see
// routes/company.js's own GET /jobs for the same two-source merge).
async function resolveJobTitle(jobId, companyDoc) {
  if (companyDoc?.jdPublished && companyDoc.jobId === jobId) {
    return companyDoc.stage9?.roletitle || "Medical Coder";
  }
  const job = await Job.findOne({ jobId }).select("fields.roletitle").lean();
  return job?.fields?.roletitle || "Medical Coder";
}

// Same resolution pattern as resolveJobTitle above (legacy Company-level
// "first JD" vs. a real Job doc) but for the job's Location field, so a
// hire can carry along WHERE the role is based - see the College Portal's
// "Placed Students & Confirmed Offer Letters" table, which had Company Name
// but no Location, and routes/college.js's placementLifecycle.placedLocation.
async function resolveJobLocation(jobId, companyDoc) {
  if (companyDoc?.jdPublished && companyDoc.jobId === jobId) {
    return companyDoc.stage9?.location || "";
  }
  const job = await Job.findOne({ jobId }).select("fields.location").lean();
  return job?.fields?.location || "";
}

// Companies can now pick MULTIPLE specialties for a single requisition (Primary specialty is a
// multi-select "specialties" array). `specialty` (singular) is kept as a derived, joined display
// string so the many existing places that read it as plain text - job search/filter, job alerts,
// tag generation, listings - never need to change.
function syncSpecialtyString(data) {
  if (data && Array.isArray(data.specialties)) {
    data.specialty = data.specialties.filter(Boolean).join(" / ");
  }
  // Compensation is typed in free text (freshers / experienced). Numbers in LPA scale are also
  // mirrored into compmin/compmax so salary filters, matching and job alerts keep working.
  if (data && typeof data.compensation === "string") {
    const nums = (data.compensation.replace(/,/g, "").match(/\d+(?:\.\d+)?/g) || []).map(Number).filter((n) => n < 1000);
    data.compmin = nums.length ? Math.min(...nums) : "";
    data.compmax = nums.length ? Math.max(...nums) : "";
  }
  return data;
}

function isEmptyValue(v) {
  if (v === undefined || v === null) return true;
  if (typeof v === "string") return v.trim() === "";
  if (Array.isArray(v)) return v.length === 0;
  return false;
}

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

  if (stageId === "9") {
    const negative = findNegativeJdField(req.body || {});
    if (negative) return res.status(400).json({ message: `${negative} cannot be negative.` });
  }

  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  const plan = getPlan(company.plan);

  // Plan feature gating:
  // (Custom question banks - Stage 5 qcustom - are open to every plan.)

  // (Custom rubrics and ATS / webhook integrations are open to every plan.)

  const key = `stage${stageId}`;
  company[key] = { ...(company[key] || {}), ...req.body };
  if (stageId === "9") {
    syncSpecialtyString(company[key]);
  }
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

  // If company is already KYC-verified, never revert to under_review automatically
  if (company.kycStatus === "verified" || company.kycVerifiedAt) {
    if (company.kycStatus !== "verified") {
      company.kycStatus = "verified";
      company.isVerified = true;
      await company.save();
    }
    return res.json({
      message: "Account & KYC details are already verified by Staff Auditor ✓",
      company,
      panVerification: company.docVerifications?.panVerification || null,
      gstinVerification: company.docVerifications?.gstinVerification || null,
    });
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

  const isVerified = company.kycStatus === "verified" || Boolean(company.kycVerifiedAt);
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
    // Job is now live in candidates' Browse Jobs - email them (once, in the background)
    announceOnboardingJd(company._id);
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

    const isCompanyVerified = company.kycStatus === "verified" || Boolean(company.kycVerifiedAt);

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
        isDraft: Boolean(job.isDraft),
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

// Shared by POST /jobs and the edit flow (PUT /jobs/:id): normalise + validate the
// job-description fields. Returns { fields } or { error: { status, body } }.
function prepareJobFields(raw, { draft = false } = {}) {
  const fields = syncSpecialtyString(raw || {});
  const isFresherJobReq = String(fields.level || "").toLowerCase().includes("fresher") || (fields.expmin !== undefined && fields.expmin !== null && fields.expmin !== "" && Number(fields.expmin) === 0 && Number(fields.expmax || 0) <= 1);
  if (isFresherJobReq) {
    fields.notice = "";
    fields.expmin = "";
    fields.expmax = "";
  }
  const negativeField = findNegativeJdField(fields);
  if (negativeField) {
    return { error: { status: 400, body: { message: `${negativeField} cannot be negative.` } } };
  }
  const missing = draft ? (isEmptyValue(fields.roletitle) ? ["roletitle"] : []) : JD_REQUIRED_FIELDS.filter((f) => isEmptyValue(fields[f]));
  if (missing.length > 0) {
    return { error: { status: 400, body: { message: "Some required job fields are missing.", missing } } };
  }
  return { fields };
}

// POST /api/company/jobs - post a job when required from the Company Dashboard.
// Reuses the required-field list and jobId format. Automatically publishes live if
// company is KYC-verified; otherwise submits for review.
router.post("/jobs", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    const isVerified = company.kycStatus === "verified" || Boolean(company.kycVerifiedAt);
    if (!isVerified) {
      return res.status(403).json({
        message: "Account & KYC approval required. Only KYC-approved companies can post jobs on Talentera.",
        kycStatus: company.kycStatus || "pending",
      });
    }

    // "Save draft" (?draft=1): store the form as-is (only a role title is needed); nothing goes live
    const isDraft = req.query.draft === "1";
    if (isDraft) {
      const preparedDraft = prepareJobFields(req.body, { draft: true });
      if (preparedDraft.error) return res.status(preparedDraft.error.status).json(preparedDraft.error.body);
      const draftJob = await Job.create({
        companyId: req.companyId,
        jobId: `TLT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
        published: false, isDraft: true, closedAt: null,
        approvalStatus: "approved", approvedAt: new Date(), approvedBy: "Draft",
        fields: preparedDraft.fields,
      });
      return res.status(201).json({ message: "Draft saved. Publish it whenever you are ready.", job: draftJob });
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

    const prepared = prepareJobFields(req.body);
    if (prepared.error) return res.status(prepared.error.status).json(prepared.error.body);
    const fields = prepared.fields;

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

    // Job is now live in candidates' Browse Jobs - email them (once, in the background)
    announcePostedJob(job);

    res.status(201).json({
      message: "Job posted and published live! Candidates can discover and apply now.",
      job,
    });
  } catch (err) {
    logger.error(`Post job error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to post job." });
  }
});

// PUT /api/company/jobs/:id - close/reopen a posted job, and/or edit its details.
// Send { published } to toggle, { fields } to edit (same validation as posting).
// :id is the job's _id, or the literal "onboarding" for the first JD created during
// onboarding (stored on Company.stage9). Reopening/editing a job staff had rejected
// puts it back into the approval queue as "pending" (see routes/staff.js POST /verify-job).
router.put("/jobs/:id", async (req, res) => {
  try {
    const { published, fields: incomingFields, publishDraft } = req.body || {};
    const hasFields = incomingFields && typeof incomingFields === "object" && !Array.isArray(incomingFields);

    // Edit details of the onboarding first-JD
    if (req.params.id === "onboarding") {
      if (!hasFields) return res.status(400).json({ message: "Nothing to update." });
      const company = await Company.findById(req.companyId);
      if (!company || !company.jdPublished || !company.jobId) return res.status(404).json({ message: "Job not found." });
      const prepared = prepareJobFields({ ...(company.stage9 || {}), ...incomingFields });
      if (prepared.error) return res.status(prepared.error.status).json(prepared.error.body);
      company.stage9 = prepared.fields;
      company.markModified("stage9");
      await company.save();
      return res.json({ message: "Job details updated.", fields: prepared.fields });
    }

    const job = await Job.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!job) return res.status(404).json({ message: "Job not found." });

    // Drafts: "Save draft" keeps it private (relaxed validation); "Publish" validates fully and makes it live
    if (job.isDraft) {
      if (publishDraft) {
        const company = await Company.findById(req.companyId);
        const isVerified = company && (company.kycStatus === "verified" || Boolean(company.kycVerifiedAt));
        if (!isVerified) return res.status(403).json({ message: "Account & KYC approval required. Only KYC-approved companies can post jobs on Talentera." });
        const plan = getPlan(company.plan);
        const legacyActive = company.jdPublished && company.jobId ? 1 : 0;
        const activeCount = legacyActive + (await Job.countDocuments({ companyId: req.companyId, published: true }));
        if (!isUnderJobPostLimit(plan, activeCount)) {
          return res.status(403).json({ message: `Your "${plan.label}" plan allows up to ${plan.maxActiveJobPosts} active job post(s). Close an existing job or ask Talentera staff to upgrade your plan to post more.` });
        }
        const preparedPub = prepareJobFields({ ...(job.fields || {}), ...(hasFields ? incomingFields : {}) });
        if (preparedPub.error) return res.status(preparedPub.error.status).json(preparedPub.error.body);
        job.fields = preparedPub.fields;
        if (typeof job.markModified === "function") job.markModified("fields");
        job.isDraft = false; job.published = true; job.publishedAt = new Date(); job.closedAt = null;
        job.approvalStatus = "approved"; job.approvedAt = new Date(); job.approvedBy = "Auto-Approved (KYC Verified)";
        await job.save();
        announcePostedJob(job);
        return res.json({ message: "Job published live! Candidates can discover and apply now.", job });
      }
      if (hasFields) {
        const preparedDraft = prepareJobFields({ ...(job.fields || {}), ...incomingFields }, { draft: true });
        if (preparedDraft.error) return res.status(preparedDraft.error.status).json(preparedDraft.error.body);
        job.fields = preparedDraft.fields;
        if (typeof job.markModified === "function") job.markModified("fields");
        await job.save();
      }
      return res.json({ message: "Draft saved.", job });
    }

    let edited = false;
    if (hasFields) {
      const prepared = prepareJobFields({ ...(job.fields || {}), ...incomingFields });
      if (prepared.error) return res.status(prepared.error.status).json(prepared.error.body);
      job.fields = prepared.fields;
      if (typeof job.markModified === "function") job.markModified("fields");
      edited = true;
    }

    if (published !== undefined) {
      job.published = Boolean(published);
      job.closedAt = job.published ? null : new Date();
    }

    let resubmitted = false;
    if (job.published && job.approvalStatus === "rejected" && (published !== undefined || edited)) {
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

    let message = "Job closed.";
    if (resubmitted) message = "Job updated and resubmitted for approval.";
    else if (edited && published === undefined) message = "Job details updated.";
    else if (job.published) message = "Job reopened.";
    res.json({ message, job });
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
// What a company is allowed to see about one candidate (contact masking by KYC, scores and
// certificates by plan). Shared by the applicants list and the JD-matched candidate pull.
function formatCandidateForCompany(candidate, isKycVerified, plan) {
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

    const scoring = calculateVerificationScore(candidate.completedStages || [], candidate);
    const canViewScoresAndCerts = Boolean(plan.viewCandidateScoresAndCerts);

    // Real live-chart exposure straight from Stage 6 (0 when the candidate has none / chose "no charts")
    const s6 = candidate.stage6 || {};
    const s6Rows = Array.isArray(s6.specialtyCharts) ? s6.specialtyCharts : [];
    const realChartCount =
      s6.evidencePath === "D"
        ? 0
        : Number.isFinite(Number(s6.totalCharts))
        ? Number(s6.totalCharts)
        : Number.isFinite(Number(s6.liveChartsAudited))
        ? Number(s6.liveChartsAudited)
        : s6Rows.reduce((sum, r) => sum + (Number(r.count) || 0), 0);

    // The saved career summary can quote chart numbers from before the candidate changed Stage 6.
    // Never show a chart claim that doesn't match what is on record now.
    let stage7ForCompany = candidate.stage7 || {};
    const quotedCharts = /(\d[\d,]*)\s+(?:verified\s+)?(?:live\s+)?charts?\b/i.exec(String(stage7ForCompany.summary || ""));
    if (quotedCharts && Number(quotedCharts[1].replace(/,/g, "")) !== realChartCount) {
      stage7ForCompany = { ...stage7ForCompany, summary: "" };
    }

  return {
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
      videoIntro: {
        ...(candidate.stage5 || {}),
        videoUrl: candidate.stage5?.selfIntroVideoUrl || candidate.stage5?.videoUrl || candidate.stage5?.proctoredInterviewVideoUrl || candidate.stage5?.url || candidate.stage5?.fileUrl || candidate.stage5?.videoFileName || candidate.stage8?.aiInterview?.videoUrl || candidate.videoUrl || null,
      },
      videoUrl: candidate.stage5?.selfIntroVideoUrl || candidate.stage5?.videoUrl || candidate.stage5?.proctoredInterviewVideoUrl || candidate.stage5?.url || candidate.stage5?.fileUrl || candidate.stage5?.videoFileName || candidate.stage8?.aiInterview?.videoUrl || candidate.videoUrl || null,
      liveCharts: canViewScoresAndCerts ? { ...s6, realChartCount } : { masked: true },
      summary: stage7ForCompany,
      employmentStatus: candidate.stage8 || {},
      documentVault: canViewScoresAndCerts ? (candidate.documentVault || []) : [],
      // Education (Stage 1) and the candidate's resume file / live resume for the applicant detail popup
      education: {
        degree: candidate.stage1?.degree || candidate.stage1?.degreeName || "",
        collegeName: candidate.stage1?.collegeName || candidate.stage1?.university || "",
        graduationYear: candidate.stage1?.graduationYear || "",
        cgpa: candidate.stage1?.cgpa || "",
        percentage: candidate.stage1?.percentage || "",
        specialization: candidate.stage1?.specialization || candidate.stage1?.branch || "",
        degreeCertUrl: isKycVerified && canViewScoresAndCerts ? (candidate.stage1?.degreeCertUrl || "") : "",
        list: Array.isArray(candidate.stage1?.education) ? candidate.stage1.education : [],
      },
      resume: {
        url: isKycVerified ? (candidate.resumeUrl || candidate.stage7?.resumeUrl || "") : "",
        fileName: candidate.resumeFileName || candidate.stage7?.resumeFileName || "",
        verifyPath: `/verify/${candidate._id}`,
      },
      completedStages: candidate.completedStages,
      score: canViewScoresAndCerts ? scoring.score : null,
      badge: canViewScoresAndCerts ? scoring.badge : null,
      verified: scoring.verified,
    };
}

router.get("/applications", async (req, res) => {
  const company = await Company.findById(req.companyId);
  const isKycVerified = Boolean(company && (company.kycStatus === "verified" || company.kycVerifiedAt));
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

    return {
      _id: app._id,
      status: app.status,
      jobId: app.jobId,
      jobTitle: jobTitleByJobId[app.jobId] || "Untitled role",
      coverNote: app.coverNote,
      rejectionReason: app.rejectionReason || "",
      rejectionDetails: app.rejectionDetails || "",
      createdAt: app.createdAt,
      isKycVerified,
      candidate: formatCandidateForCompany(candidate, isKycVerified, plan),
    };
  });

  // Real "Profile Viewed" activity for the academy's Live Activity feed /
  // heatmap (see backend/utils/academyEvents.js) - fired the first time this
  // company loads an academy-linked candidate's application, deduped so
  // paging back through the same list doesn't re-fire it every load.
  try {
    const academyLinked = applications.filter((app) => app.candidateId && app.candidateId.stage2?.academyId);
    if (academyLinked.length > 0) {
      const candidateIds = academyLinked.map((app) => app.candidateId._id);
      const alreadyViewed = await AcademyActivityEvent.find({
        eventType: "viewed",
        companyId: req.companyId,
        candidateId: { $in: candidateIds },
      })
        .distinct("candidateId");
      const alreadyViewedSet = new Set(alreadyViewed.map(String));

      const toNotify = academyLinked.filter((app) => !alreadyViewedSet.has(String(app.candidateId._id)));
      for (const app of toNotify) {
        await emitAcademyEvent({
          candidate: app.candidateId,
          eventType: "viewed",
          companyId: req.companyId,
          companyName: company?.companyName || "Talentera Employer",
          jobTitle: jobTitleByJobId[app.jobId],
          applicationId: app._id,
        });
      }
    }
  } catch (viewErr) {
    logger.warn(`Academy "viewed" event emission failed: ${viewErr.message}`);
  }

  res.json({
    applications: formatted,
    isKycVerified,
    plan: plan.id,
    planFeatures: plan,
    total,
    ...(hasPaging ? { page, limit, totalPages: Math.ceil(total / limit) } : {}),
  });
});

// GET /api/company/matched-candidates?jobId=... - auto-pulls verified candidates from the pool
// who fit a job's JD. Hard rules (so a company only ever sees people who fit what it asked for):
//   - Hiring level: "Fresher only" -> freshers, "Experienced only" -> experienced ("Open to both" = all)
//   - Certifications: unless the JD lists "Non-Certified", the candidate must hold a certification
// Everything else (specific cert, city, specialty/domain, verification score) only ranks the list.
router.get("/matched-candidates", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });
    const isKycVerified = Boolean(company.kycStatus === "verified" || company.kycVerifiedAt);
    const plan = getPlan(company.plan);

    let jobId = String(req.query.jobId || "");
    let jd = null;
    if (jobId && company.jobId === jobId) jd = company.stage9 || {};
    else if (jobId) jd = (await Job.findOne({ jobId, companyId: req.companyId }).lean())?.fields || null;
    if (!jd) return res.status(404).json({ message: "Job not found." });

    const level = String(jd.level || "").toLowerCase();
    const wantFresher = level.includes("fresher");
    const wantExperienced = level.includes("experienced");
    const certList = (Array.isArray(jd.certs) ? jd.certs : []).filter(Boolean);
    const allowNonCertified = certList.includes("Non-Certified");

    const pool = await Candidate.find({ stage1: { $ne: null } }).limit(1000).lean();
    const alreadyApplied = new Set(
      (await Application.find({ companyId: req.companyId, jobId }).select("candidateId").lean()).map((a) => String(a.candidateId))
    );

    const matches = [];
    for (const c of pool) {
      const s1 = c.stage1 || {};
      if (s1.skipped) continue;
      // Only candidates who have really registered AND finished their assessment are listed -
      // academy-uploaded students who never signed up (or haven't taken the assessment) are not shown.
      const completedList = Array.isArray(c.completedStages) ? c.completedStages : [];
      const registered = s1.aadhaarVerified === true || s1.aadhaarStatus === "VERIFIED" || completedList.includes(1);
      if (!registered) continue;
      if (isExperiencedCandidate(c)) {
        // Experienced candidates skip the Assessment - their evaluation is the Certification stage
        if (!completedList.includes(3)) continue;
      } else {
        const s4 = c.stage4 || {};
        const s4Score = s4.foundationScore !== undefined && s4.foundationScore !== null ? s4.foundationScore : s4.score;
        const assessed = completedList.includes(4) && s4Score !== undefined && s4Score !== null && s4Score !== "" && !isNaN(Number(s4Score));
        if (!assessed) continue;
      }
      const exp = String(s1.experience || "").toLowerCase();
      if (wantFresher && !wantExperienced && exp !== "fresher") continue;
      if (wantExperienced && !wantFresher && exp !== "experienced") continue;

      const s3 = c.stage3 || {};
      const certName = !s3.skipped ? String(s3.certName || s3.name || "").trim() : "";
      const isCertified = Boolean(certName);
      if (!allowNonCertified && certList.length > 0 && !isCertified) continue;

      const vscore = calculateVerificationScore(c.completedStages || [], c).score || 0;
      const scored = scoreMatch({ jd, candidate: c, verificationScore: vscore, experiencedCandidate: isExperiencedCandidate(c) });
      matches.push({ c, score: scored.score, reasons: scored.reasons, breakdown: scored.breakdown, applied: alreadyApplied.has(String(c._id)) });
    }

    matches.sort((a, b) => b.score - a.score);
    const top = matches.slice(0, 100);

    // The recruiter's "Minimum overall score to shortlist (%)" from the Custom Rubric stage
    const rcutoff = Number(String(company.stage7?.rcutoff ?? "").replace(/[^0-9.]/g, ""));
    const defaultMinScore = Number.isFinite(rcutoff) && rcutoff > 0 ? Math.min(100, rcutoff) : 0;

    res.json({
      jobId,
      defaultMinScore,
      total: matches.length,
      isKycVerified,
      plan: plan.id,
      candidates: top.map((m) => ({
        _id: `match-${m.c._id}`,
        status: "matched",
        jobId,
        jobTitle: jd.roletitle || "Untitled role",
        matchScore: m.score,
        matchReasons: m.reasons,
        matchBreakdown: m.breakdown,
        alreadyApplied: m.applied,
        isKycVerified,
        candidate: formatCandidateForCompany(m.c, isKycVerified, plan),
      })),
    });
  } catch (err) {
    logger.error(`Matched candidates error: ${err.message}`);
    res.status(500).json({ message: "Failed to load matched candidates." });
  }
});

// POST /api/company/matched-candidates/application { jobId, candidateId }
// "Shortlist for interview" from the Matched-by-JD profile: makes sure an application record exists for this
// candidate + job (a matched candidate who has not applied yet has none) and returns it, so the normal status
// route (PUT /applications/:id/status) can then shortlist it - one code path for notifications, emails and academy events.
router.post("/matched-candidates/application", async (req, res) => {
  try {
    const jobId = String(req.body.jobId || "").trim();
    const candidateId = String(req.body.candidateId || "").trim();
    if (!jobId || !/^[a-f\d]{24}$/i.test(candidateId)) return res.status(400).json({ message: "Job and candidate are required." });

    const company = await Company.findById(req.companyId).select("jobId").lean();
    const ownsJob = (company && company.jobId === jobId) || (await Job.findOne({ jobId, companyId: req.companyId }).select("_id").lean());
    if (!ownsJob) return res.status(404).json({ message: "Job not found." });

    const candidate = await Candidate.findById(candidateId).select("_id").lean();
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    let application = await Application.findOne({ candidateId, companyId: req.companyId, jobId });
    let created = false;
    if (!application) {
      try {
        application = await Application.create({
          candidateId,
          companyId: req.companyId,
          jobId,
          status: "applied",
          coverNote: "Added by the recruiter from Matched by JD.",
        });
        created = true;
      } catch (e) {
        if (e && e.code === 11000) application = await Application.findOne({ candidateId, jobId });
        else throw e;
      }
    }
    if (!application || String(application.companyId) !== String(req.companyId)) return res.status(409).json({ message: "This candidate already has an application for this job." });
    res.json({ success: true, created, applicationId: String(application._id), status: application.status });
  } catch (err) {
    logger.error(`Matched candidate application error: ${err.message}`);
    res.status(500).json({ message: "Could not prepare this candidate for shortlisting." });
  }
});

// PUT /api/company/applications/:id/status - Recruiter status update (shortlisted/interviewing/hired/rejected)
router.put("/applications/:id/status", async (req, res) => {
  const { status } = req.body;
  const validStatuses = ["applied", "shortlisted", "interviewing", "hired", "on_hold", "rejected"];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: "Invalid application status." });
  }

  const application = await Application.findOne({
    _id: req.params.id,
    companyId: req.companyId,
  }).populate("candidateId", "email stage1 stage2");

  if (!application) {
    return res.status(404).json({ message: "Application not found." });
  }

  const previousStatus = application.status;
  application.status = status;
  // Keep the batch hiring pipeline (routes/hiring.js) in step when a recruiter closes someone out by hand.
  if (application.hiring && application.hiring.stage && ["rejected", "on_hold"].includes(status)) {
    application.hiring.stage = status === "rejected" ? "rejected" : "hold";
    if (status === "rejected") application.hiring.rejection = { at: new Date().toISOString(), round: "manual", reason: req.body.reason || req.body.rejectionReason || "Rejected by recruiter", futurePool: true };
    if (Array.isArray(application.hiring.audit)) application.hiring.audit.push({ at: new Date().toISOString(), by: "Company HR", action: `Status set to ${status}`, detail: "" });
    // Already handled by this route's own academy/college wiring below - tell the hiring-flow sync to skip it.
    application.hiring.linked = { key: `${application.hiring.stage}|${application.hiring.offer?.status || ""}`, at: new Date().toISOString() };
    application.markModified("hiring");
  }
  if (status === "interviewing") {
    // Capture the interview slot the recruiter picked so the candidate's
    // Interview Invites tab can show it. A new slot resets confirmation.
    const rawWhen = req.body.interviewTime || req.body.interviewScheduledAt || req.body.scheduledAt;
    if (rawWhen) {
      const d = new Date(rawWhen);
      if (!Number.isNaN(d.getTime())) application.interviewScheduledAt = d;
      application.interviewTimeText = String(rawWhen).slice(0, 120);
      application.interviewConfirmed = false;
      application.interviewConfirmedAt = null;
    }
    if (req.body.interviewType) application.interviewType = String(req.body.interviewType).slice(0, 80);
    if (req.body.meetingLink || req.body.interviewMeetingLink) {
      application.interviewMeetingLink = String(req.body.meetingLink || req.body.interviewMeetingLink).slice(0, 500);
    }
  }
  if (status === "rejected") {
    application.rejectionReason = req.body.reason || req.body.rejectionReason || application.rejectionReason || "";
    application.rejectionDetails = req.body.details || req.body.rejectionDetails || application.rejectionDetails || "";
  }
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
    const company = await Company.findById(req.companyId).select("companyName stage9 jobId jdPublished").lean();
    const companyName = company?.companyName || "Employer";
    const roleTitle = await resolveJobTitle(application.jobId, company);
    const jobLocation = await resolveJobLocation(application.jobId, company);

    // In-app Candidate Notification from Company
    try {
      if (candidateId) {
        let notifTitle = `Application Status: ${companyName}`;
        let notifMsg = `Your application for "${roleTitle}" at ${companyName} has been updated to "${status}".`;
        let notifType = "application_update";

        if (status === "shortlisted") {
          notifTitle = `Shortlisted by ${companyName}! 🎯`;
          notifMsg = `Great news! Your application for "${roleTitle}" has been shortlisted by ${companyName}. Your assessment and interview rounds will appear under Hiring Rounds as the company schedules them.`;
          notifType = "application_shortlisted";
        } else if (status === "interviewing") {
          notifTitle = `Interview Scheduled with ${companyName} 📅`;
          notifMsg = `An interview has been scheduled with ${companyName} for "${roleTitle}". Check your Applications tab for details.`;
          notifType = "interview_scheduled";
        } else if (status === "hired") {
          notifTitle = `Job Offer from ${companyName}! 🎉`;
          notifMsg = `Congratulations! You have received a formal offer from ${companyName} for "${roleTitle}".`;
          notifType = "offer_received";
        } else if (status === "on_hold") {
          notifTitle = `You're selected by ${companyName} - On Hold`;
          notifMsg = `Good news! ${companyName} has selected you for "${roleTitle}". Your offer letter is still being prepared - we'll notify you as soon as it's released.`;
          notifType = "application_update";
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

    // Company-side notification: tells the recruiter the next step after a shortlist (allocate the assessment)
    if (status === "shortlisted") {
      try {
        const candName = candidate?.stage1?.fullName || "The candidate";
        await Notification.create({
          recipientType: "company",
          recipientId: String(req.companyId),
          title: `${candName} shortlisted - next step`,
          message: `${candName} is shortlisted for "${roleTitle}". Open Hiring Flow > Applicants to allocate the assessment and move them to the next round.`,
          type: "hiring_update",
          meta: {
            source: "shortlist",
            applicationId: String(application._id),
            candidateId: String(candidateId || ""),
            candidateName: candName,
            actionUrl: "/companies/hiring?tab=applicants",
            actionLabel: "Open Hiring Flow",
          },
        });
      } catch (notifErr) {
        logger.warn(`Failed to create company shortlist notification: ${notifErr.message}`);
      }
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

    // Real academy activity event - bridges this status change into the
    // linked academy's Live Activity feed / Interviews Kanban / Batch
    // Heatmap (see backend/utils/academyEvents.js). No-ops silently for a
    // candidate who didn't come through an academy invite/upload.
    const academyEventType = ACADEMY_EVENT_TYPE_BY_STATUS[status];
    if (academyEventType && candidate) {
      const eventMeta = {};
      if (status === "interviewing" && req.body.interviewTime) eventMeta.interviewTime = req.body.interviewTime;
      if (status === "hired" && req.body.ctc) eventMeta.salary = req.body.ctc;
      if (status === "rejected") {
        if (req.body.reason || req.body.rejectionReason) eventMeta.reason = req.body.reason || req.body.rejectionReason;
        if (req.body.details || req.body.rejectionDetails) eventMeta.details = req.body.details || req.body.rejectionDetails;
      }

      await emitAcademyEvent({
        candidate,
        eventType: academyEventType,
        companyId: req.companyId,
        companyName,
        jobTitle: roleTitle,
        applicationId: application._id,
        eventMeta,
      });

      // Hiring also opens the Phase 4 placement-confirmation loop: a real
      // PlacementConfirmation record (instead of the academy's manual "add
      // placement" form) so it shows up in the academy's
      // /placements/confirmations queue for them to verify.
      if (status === "hired" && candidate.stage2?.academyId) {
        try {
          const existingPlacement = await PlacementConfirmation.findOne({
            candidateId: candidate._id,
            companyId: req.companyId,
          });
          if (!existingPlacement) {
            await PlacementConfirmation.create({
              academyId: candidate.stage2.academyId,
              candidateId: candidate._id,
              candidateName: candidate.stage1?.fullName || candidateEmail,
              candidateEmail: candidateEmail || "",
              companyId: req.companyId,
              companyName,
              batchCode: candidate.stage2?.batch || "",
              courseTitle: candidate.stage2?.course || "",
              role: roleTitle,
              ctc: req.body.ctc || "To be confirmed",
              city: req.body.city || candidate.stage1?.city || "",
            });
          }

          // Reflect the hire on the candidate's own record too, so
          // GET /api/academy/dashboard's placement KPIs and the Interviews
          // Kanban's "joined" heuristics see it without a second lookup.
          const fullCandidate = await Candidate.findById(candidate._id);
          if (fullCandidate) {
            fullCandidate.stage8 = {
              ...(fullCandidate.stage8 || {}),
              placementStatus: `Placed at ${companyName} — Pending Confirmation`,
              employer: companyName,
              role: roleTitle,
              ctc: req.body.ctc || fullCandidate.stage8?.ctc || "",
              placedAt: new Date(),
            };
            await fullCandidate.save();
          }
        } catch (placementErr) {
          logger.warn(`Placement confirmation wiring failed for application ${application._id}: ${placementErr.message}`);
        }
      }
    }

    // Same real-hire wiring for a COLLEGE-sourced candidate: reflect the
    // hire on their own placementLifecycle so the College Portal's
    // "Placements & Offer Letters" table (routes/college.js's students
    // list, filtered on placementLifecycle.currentStatus === "PLACED")
    // picks it up automatically - no placement officer has to manually
    // re-type what the company already entered. Only real, company-entered
    // values are ever written here; a CTC the company didn't provide is
    // left blank rather than guessed, same as the academy-side wiring above.
    if (status === "hired" && candidate && candidate.collegeId) {
      try {
        const collegeCandidate = await Candidate.findById(candidate._id);
        if (collegeCandidate) {
          collegeCandidate.placementLifecycle = {
            ...(collegeCandidate.placementLifecycle || {}),
            currentStatus: "PLACED",
            placedCompanyId: req.companyId,
            placedCompanyName: companyName,
            placedRole: roleTitle,
            placedCtc: req.body.ctc || collegeCandidate.placementLifecycle?.placedCtc || "",
            placedLocation: jobLocation || collegeCandidate.placementLifecycle?.placedLocation || "",
            placedDate: collegeCandidate.placementLifecycle?.placedDate || new Date(),
          };
          collegeCandidate.markModified("placementLifecycle");
          await collegeCandidate.save();
        }
      } catch (collegePlacementErr) {
        logger.warn(`College placement lifecycle sync failed for application ${application._id}: ${collegePlacementErr.message}`);
      }
    }
  }

  res.json({ message: "Application status updated.", application });
});

// PUT /api/company/applications/:id/interview-outcome
// { outcome: rescheduled | cancelled | candidate_no_show | employer_no_show | clear, note?, newTime? }
// Records that a scheduled interview did not go ahead as planned. Shows on the candidate's, academy's
// and college's dashboards. "rescheduled" keeps the candidate in the interview stage with the new time.
const INTERVIEW_OUTCOME_LABELS = {
  rescheduled: "Interview rescheduled",
  cancelled: "Interview cancelled",
  candidate_no_show: "Candidate did not attend the interview",
  employer_no_show: "Employer did not attend the interview",
};
const INTERVIEW_OUTCOME_EVENT = {
  rescheduled: "interview_rescheduled",
  cancelled: "interview_cancelled",
  candidate_no_show: "candidate_no_show",
  employer_no_show: "employer_no_show",
};
router.put("/applications/:id/interview-outcome", async (req, res) => {
  try {
    const outcome = String(req.body.outcome || "");
    const note = String(req.body.note || "").slice(0, 400);
    if (outcome !== "clear" && !INTERVIEW_OUTCOME_LABELS[outcome]) {
      return res.status(400).json({ message: "Choose rescheduled, cancelled, candidate no-show or employer no-show." });
    }
    const application = await Application.findOne({ _id: req.params.id, companyId: req.companyId }).populate("candidateId", "email stage1 stage2 collegeId");
    if (!application) return res.status(404).json({ message: "Application not found." });
    if (!["interviewing", "shortlisted"].includes(application.status) && outcome !== "clear") {
      return res.status(400).json({ message: "Interview outcomes can only be set for candidates who are in the interview stage." });
    }

    if (outcome === "clear") {
      application.interviewOutcome = "";
      application.interviewOutcomeNote = "";
      application.interviewOutcomeAt = null;
      await application.save();
      return res.json({ message: "Interview outcome cleared.", application });
    }

    if (outcome === "rescheduled") {
      const rawWhen = req.body.newTime;
      if (!rawWhen) return res.status(400).json({ message: "Enter the new interview date and time." });
      const d = new Date(rawWhen);
      if (Number.isNaN(d.getTime())) return res.status(400).json({ message: "Enter a valid new interview date and time." });
      application.interviewScheduledAt = d;
      application.interviewTimeText = d.toLocaleString("en-IN");
      application.interviewConfirmed = false;
      application.interviewConfirmedAt = null;
      application.rescheduleCount = (application.rescheduleCount || 0) + 1;
    }
    application.interviewOutcome = outcome;
    application.interviewOutcomeNote = note;
    application.interviewOutcomeAt = new Date();
    await application.save();

    const candidate = application.candidateId;
    const companyDoc = await Company.findById(req.companyId).select("companyName").lean();
    const companyName = companyDoc?.companyName || "the employer";
    if (candidate) {
      try {
        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidate._id),
          title: `${INTERVIEW_OUTCOME_LABELS[outcome]} - ${companyName}`,
          message: outcome === "rescheduled"
            ? `${companyName} has moved your interview to ${application.interviewTimeText}.${note ? ` Note: ${note}` : ""}`
            : `${INTERVIEW_OUTCOME_LABELS[outcome]} (${companyName}).${note ? ` Note: ${note}` : ""}`,
          type: "interview_scheduled",
          meta: { source: "company", companyId: String(req.companyId), companyName, applicationId: String(application._id), actionType: "applications", actionLabel: "View in Applications" },
        });
      } catch (e) {
        logger.warn(`Interview outcome notification failed: ${e.message}`);
      }
      await emitAcademyEvent({
        candidate,
        eventType: INTERVIEW_OUTCOME_EVENT[outcome],
        companyId: req.companyId,
        companyName,
        applicationId: application._id,
        eventMeta: { reason: note, ...(outcome === "rescheduled" ? { interviewTime: application.interviewTimeText } : {}) },
      });
      if (candidate.collegeId) {
        try {
          await Notification.create({
            recipientType: "college",
            recipientId: String(candidate.collegeId),
            title: `${candidate.stage1?.fullName || "Student"}: ${INTERVIEW_OUTCOME_LABELS[outcome]}`,
            message: `${companyName} - ${INTERVIEW_OUTCOME_LABELS[outcome]}.${note ? ` Note: ${note}` : ""}`,
            type: "hiring_update",
            meta: { source: "company", companyName, applicationId: String(application._id) },
          });
        } catch (e) {
          logger.warn(`College interview outcome notification failed: ${e.message}`);
        }
      }
    }
    res.json({ message: `${INTERVIEW_OUTCOME_LABELS[outcome]}.`, application });
  } catch (err) {
    logger.error(`Interview outcome error: ${err.message}`);
    res.status(500).json({ message: "Could not record the interview outcome." });
  }
});

module.exports = router;
