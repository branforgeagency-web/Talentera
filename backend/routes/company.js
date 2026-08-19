const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const Notification = require("../models/Notification");
const Job = require("../models/Job");
const { requireCompanyAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");

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
    console.error(err);
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
    console.error(err);
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
      });
    }

    jobs.sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));

    res.json({
      jobs,
      // Gate for the "Post another job" UI - the wizard's 9-step KYC/profile
      // flow already establishes trust; kycStatus is the one signal every
      // other verified-only feature in this app (contact unmasking,
      // company badge, etc.) keys off, so multi-job posting uses the same
      // gate rather than re-deriving a separate "100% profile" check here.
      canPostMoreJobs: company.kycStatus === "verified",
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load your job posts." });
  }
});

// POST /api/company/jobs - post an additional job once the company is KYC
// verified, without re-running the onboarding wizard. Reuses the same
// required-field list and jobId format as /publish-jd.
router.post("/jobs", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Not found." });

    if (company.kycStatus !== "verified") {
      return res.status(403).json({ message: "Complete Account & KYC verification before posting additional jobs." });
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
      fields,
    });

    res.status(201).json({ message: "Job posted!", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message || "Failed to post job." });
  }
});

// PUT /api/company/jobs/:id - close or reopen a posted job (the legacy
// onboarding first-JD isn't covered here; it doesn't have a close toggle
// today, same as before this change).
router.put("/jobs/:id", async (req, res) => {
  try {
    const { published } = req.body;
    const job = await Job.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!job) return res.status(404).json({ message: "Job not found." });

    job.published = Boolean(published);
    job.closedAt = job.published ? null : new Date();
    await job.save();

    res.json({ message: job.published ? "Job reopened." : "Job closed.", job });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update job." });
  }
});

// GET /api/company/applications - ATS candidate review list for company
router.get("/applications", async (req, res) => {
  const company = await Company.findById(req.companyId);
  const isKycVerified = Boolean(company && company.kycStatus === "verified");

  const applications = await Application.find({ companyId: req.companyId })
    .populate("candidateId")
    .sort({ createdAt: -1 });

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

  res.json({ applications: formatted, isKycVerified });
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
  });

  if (!application) {
    return res.status(404).json({ message: "Application not found." });
  }

  application.status = status;
  await application.save();

  res.json({ message: "Application status updated.", application });
});

module.exports = router;
