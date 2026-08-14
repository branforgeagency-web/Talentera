const express = require("express");
const Company = require("../models/Company");
const { requireCompanyAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");

const router = express.Router();
router.use(requireCompanyAuth); // every route below requires a valid company JWT

// Stage ids as used in the URL / schema field suffix (lowercase, matches
// frontend/src/data/companyOnboardingStages.js STAGE_ORDER).
const VALID_STAGE_IDS = ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"];

// Stage 9 ("First JD") must-tagged field ids - validated again server-side
// before a JD can be published. Keep in sync with the `must` tags on the
// stage-9 items in frontend/src/data/companyOnboardingStages.js.
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

// POST /api/company/upload/doc/:id - generic per-stage document upload
// (KYC docs on 1A, team/recruiter CSVs on 3, logos on 2, custom question
// banks on 5, etc). Reuses the same multer/disk-storage pattern as the
// candidate side's /candidate/upload/doc/:n.
router.post("/upload/doc/:id", upload.single("doc"), async (req, res) => {
  const stageId = String(req.params.id).toLowerCase();
  if (!VALID_STAGE_IDS.includes(stageId)) {
    return res.status(400).json({ message: "Invalid onboarding stage." });
  }
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  const company = await Company.findById(req.companyId);
  if (!company) return res.status(404).json({ message: "Not found." });

  const fileUrl = `/uploads/${req.companyId}/${req.file.filename}`;
  res.json({ docUrl: fileUrl, docName: req.file.originalname });
});

// POST /api/company/publish-jd - Stage 9's "Preview & Publish" flow.
// Re-validates the must-tagged Stage 9 fields server-side (the frontend
// gates this too, but the backend shouldn't trust that alone), then
// generates a stable-looking job id and marks the JD live.
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

module.exports = router;
