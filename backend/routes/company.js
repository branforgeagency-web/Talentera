const express = require("express");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
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
  res.json({ company });
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

// GET /api/company/applications - ATS candidate review list for company
router.get("/applications", async (req, res) => {
  const applications = await Application.find({ companyId: req.companyId })
    .populate("candidateId")
    .sort({ createdAt: -1 });

  const formatted = applications.map((app) => {
    const candidate = app.candidateId;
    if (!candidate) return app;

    const scoring = calculateVerificationScore(candidate.completedStages || []);
    return {
      _id: app._id,
      status: app.status,
      jobId: app.jobId,
      coverNote: app.coverNote,
      createdAt: app.createdAt,
      candidate: {
        _id: candidate._id,
        email: candidate.email,
        basicInfo: candidate.stage1 || {},
        training: candidate.stage2 || {},
        certification: candidate.stage3 || {},
        assessment: candidate.stage4 || {},
        videoIntro: candidate.stage5 || {},
        liveCharts: candidate.stage6 || {},
        completedStages: candidate.completedStages,
        score: scoring.score,
        badge: scoring.badge,
        verified: scoring.verified,
      },
    };
  });

  res.json({ applications: formatted });
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
