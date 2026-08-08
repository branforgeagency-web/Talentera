const express = require("express");
const Candidate = require("../models/Candidate");
const { requireAuth } = require("../middleware/auth");
const upload = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");

const router = express.Router();
router.use(requireAuth); // every route below requires a valid JWT

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
// Stages the candidate is allowed to skip, per handoff doc section 4.5
const SKIPPABLE_STAGES = [2, 3, 7];

// GET /api/candidate/me - full profile
router.get("/me", async (req, res) => {
  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  const scoring = calculateVerificationScore(candidate.completedStages);
  res.json({ candidate, ...scoring });
});

// PUT /api/candidate/stage/:n - save-on-advance: persists one stage's form data
router.put("/stage/:n", async (req, res) => {
  const stageNum = Number(req.params.n);
  if (!VALID_STAGES.includes(stageNum)) {
    return res.status(400).json({ message: "Invalid stage number." });
  }

  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  candidate[`stage${stageNum}`] = req.body; // e.g. { fullName, mobile, city, ... }
  if (!candidate.completedStages.includes(stageNum)) {
    candidate.completedStages.push(stageNum);
  }
  await candidate.save();

  const scoring = calculateVerificationScore(candidate.completedStages);
  res.json({ candidate, ...scoring });
});

// POST /api/candidate/stage/:n/skip - skip-stage system (stages 2, 3, 7 only)
router.post("/stage/:n/skip", async (req, res) => {
  const stageNum = Number(req.params.n);
  if (!SKIPPABLE_STAGES.includes(stageNum)) {
    return res.status(400).json({ message: `Stage ${stageNum} cannot be skipped.` });
  }

  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  candidate[`stage${stageNum}`] = { skipped: true };
  if (!candidate.completedStages.includes(stageNum)) {
    candidate.completedStages.push(stageNum);
  }
  await candidate.save();

  const scoring = calculateVerificationScore(candidate.completedStages);
  res.json({ candidate, ...scoring });
});

// POST /api/candidate/upload/video - Stage 5 video introduction (replaces Firebase Storage)
router.post("/upload/video", upload.single("video"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file uploaded." });

  const candidate = await Candidate.findById(req.candidateId);
  const fileUrl = `/uploads/${req.candidateId}/${req.file.filename}`;

  candidate.stage5 = { ...(candidate.stage5 || {}), videoUrl: fileUrl };
  if (!candidate.completedStages.includes(5)) candidate.completedStages.push(5);
  await candidate.save();

  res.json({ videoUrl: fileUrl, candidate });
});

// GET /api/candidate/resume-data - locked, verified data the resume templates read from
// (Stage 7 does NOT accept uploads by design - see handoff doc section 5)
router.get("/resume-data", async (req, res) => {
  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  const scoring = calculateVerificationScore(candidate.completedStages);

  res.json({
    email: candidate.email,
    basicInfo: candidate.stage1 || {},
    training: candidate.stage2 || {},
    certification: candidate.stage3 || {},
    assessment: candidate.stage4 || {},
    videoIntro: candidate.stage5 || {},
    liveCharts: candidate.stage6 || {},
    employmentStatus: candidate.stage8 || {},
    template: candidate.resumeTemplate,
    ...scoring,
  });
});

// PUT /api/candidate/resume-template - switch between Classic / Modern / Minimal
router.put("/resume-template", async (req, res) => {
  const { template } = req.body;
  if (!["classic", "modern", "minimal"].includes(template)) {
    return res.status(400).json({ message: "Invalid template." });
  }
  const candidate = await Candidate.findByIdAndUpdate(
    req.candidateId,
    { resumeTemplate: template },
    { new: true }
  );
  res.json({ candidate });
});

module.exports = router;
