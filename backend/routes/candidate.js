const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Job = require("../models/Job");
const { requireAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { parseAadhaarQr } = require("../utils/aadhaarQrDecoder");
const { processAadhaarFile, processOfflineEkyc } = require("../utils/ekyc");
const { evaluateAiVideoAssessment } = require("../utils/aiAssessment");

const router = express.Router();
router.use(requireAuth); // every route below requires a valid JWT

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
// Stages the candidate is allowed to skip, per handoff doc section 4.5
const SKIPPABLE_STAGES = [2, 3, 7];

// POST /api/candidate/ekyc/verify - Parses UIDAI e-Aadhaar PDF or Offline e-KYC ZIP package
router.post(
  "/ekyc/verify",
  upload.single("ekycZip"),
  async (req, res) => {
    try {
      const { shareCode, password, mobile, experience, currentRole } = req.body;
      if (!req.file) {
        return res.status(400).json({ message: "Please upload your e-Aadhaar PDF or Offline e-KYC .zip file." });
      }

      // Buffer from memory or disk
      let zipBuffer;
      if (req.file.buffer) {
        zipBuffer = req.file.buffer;
      } else if (req.file.path) {
        const fs = require("fs");
        zipBuffer = fs.readFileSync(req.file.path);
      }

      const pass = shareCode || password || "";
      const decoded = await processAadhaarFile(zipBuffer, req.file.originalname, pass);

      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

      candidate.stage1 = {
        ...(candidate.stage1 || {}),
        fullName: decoded.fullName,
        city: decoded.city,
        mobile: mobile || candidate.stage1?.mobile || "+91 98765 43210",
        experience: experience || candidate.stage1?.experience || "fresher",
        currentRole: currentRole || candidate.stage1?.currentRole || "Medical Coder",
        dob: decoded.dob,
        gender: decoded.gender,
        address: decoded.address,
        maskedAadhaar: decoded.maskedAadhaar,
        photoBase64: decoded.photoBase64,
        aadhaarVerified: true,
        verificationMethod: decoded.verificationMethod,
        verifiedAt: decoded.verifiedAt,
      };

      if (!candidate.completedStages.includes(1)) {
        candidate.completedStages.push(1);
      }

      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);
      res.json({
        success: true,
        message: "Offline e-KYC ZIP verified successfully!",
        decoded,
        candidate,
        ...scoring,
      });
    } catch (err) {
      console.error("Offline e-KYC verification error:", err);
      res.status(400).json({ message: err.message || "Failed to process e-KYC ZIP file." });
    }
  }
);

// POST /api/candidate/qr/verify - Decodes scanned/uploaded Aadhaar QR code & verifies Stage 1 identity
router.post("/qr/verify", async (req, res) => {
  try {
    const { qrData, mobile, experience, currentRole } = req.body;
    if (!qrData) {
      return res.status(400).json({ message: "No QR code data provided." });
    }

    const decoded = parseAadhaarQr(qrData);

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    candidate.stage1 = {
      ...(candidate.stage1 || {}),
      fullName: decoded.fullName,
      city: decoded.city,
      mobile: mobile || candidate.stage1?.mobile || "+91 98765 43210",
      experience: experience || candidate.stage1?.experience || "fresher",
      currentRole: currentRole || candidate.stage1?.currentRole || "Medical Coder",
      dob: decoded.dob,
      gender: decoded.gender,
      address: decoded.address,
      maskedAadhaar: decoded.maskedAadhaar,
      photoBase64: decoded.photoBase64,
      aadhaarVerified: true,
      verificationMethod: decoded.verificationMethod,
      verifiedAt: decoded.verifiedAt,
    };

    if (!candidate.completedStages.includes(1)) {
      candidate.completedStages.push(1);
    }

    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);
    res.json({
      success: true,
      message: `Aadhaar QR Code verified successfully (${decoded.format})`,
      decoded,
      candidate,
      ...scoring,
    });
  } catch (err) {
    console.error("Aadhaar QR verification error:", err);
    res.status(400).json({ message: err.message || "Failed to parse or verify Aadhaar QR code." });
  }
});

// GET /api/candidate/me - full profile
router.get("/me", async (req, res) => {
  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  const applications = await Application.find({ candidateId: req.candidateId })
    .populate("companyId", "companyName stage9 jobId")
    .sort({ createdAt: -1 });

  const scoring = calculateVerificationScore(candidate.completedStages);
  res.json({ candidate, applications, ...scoring });
});

// PUT /api/candidate/stage/:n - save-on-advance: persists one stage's form data
router.put("/stage/:n", async (req, res) => {
  try {
    const stageNum = Number(req.params.n);
    if (!VALID_STAGES.includes(stageNum)) {
      return res.status(400).json({ message: "Invalid stage number." });
    }

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    if (stageNum > 1 && !candidate.completedStages.includes(1)) {
      return res.status(400).json({ message: "You must complete and save Stage 1 (Identity & Basics) before filling higher stages." });
    }

    // Strict Per-Stage Field Validation: Block completion if required fields are missing
    if (stageNum === 1) {
      const { fullName, mobile, email, state, city } = req.body;
      if (!fullName || String(fullName).trim().length < 2) {
        return res.status(400).json({ message: "Stage 1 incomplete: Full legal name is required." });
      }
      const cleanMobile = String(mobile || "").replace(/\D/g, "");
      if (!/^[6-9]\d{9}$/.test(cleanMobile)) {
        return res.status(400).json({ message: "Stage 1 incomplete: Valid 10-digit Indian mobile number starting with 6, 7, 8, or 9 is required." });
      }
      if (!email || !String(email).includes("@")) {
        return res.status(400).json({ message: "Stage 1 incomplete: Valid email address is required." });
      }
      if (!state || String(state).trim() === "") {
        return res.status(400).json({ message: "Stage 1 incomplete: State selection is required." });
      }
      if (!city || String(city).trim() === "") {
        return res.status(400).json({ message: "Stage 1 incomplete: City / Locality is required." });
      }
    } else if (stageNum === 2 && !req.body.skipped) {
      const { academyName, specialty, domain, courseName } = req.body;
      const courseOrSpec = courseName || specialty || domain;
      if (!academyName || !courseOrSpec) {
        return res.status(400).json({ message: "Stage 2 incomplete: Academy / Institute name and Specialty / Domain are required." });
      }
    } else if (stageNum === 3 && !req.body.skipped) {
      const { certName, certificationName, certCode, memberId } = req.body;
      const cName = certName || certificationName || certCode;
      if (!cName || !memberId) {
        return res.status(400).json({ message: "Stage 3 incomplete: Certification name and Member / Cert ID are required." });
      }
    } else if (stageNum === 4) {
      if (candidate.stage4 && candidate.stage4.foundationScore !== undefined && !req.body.foundationScore) {
        return res.status(400).json({ message: "Single-attempt policy: Stage 4 Assessment has already been completed and locked. Retakes are not permitted." });
      }
      if (req.body.foundationScore === undefined && !candidate.stage4?.foundationScore) {
        return res.status(400).json({ message: "Stage 4 incomplete: Proctored assessment test must be completed before saving." });
      }
    } else if (stageNum === 5) {
      if (!req.body.aiScore && !req.body.videoUrl && !candidate.stage5?.videoUrl) {
        return res.status(400).json({ message: "Stage 5 incomplete: AI Video Assessment or video file must be submitted." });
      }
    } else if (stageNum === 8) {
      if (req.body.consent !== true) {
        return res.status(400).json({ message: "Stage 8 incomplete: Consent to interview-track auto-capture is required." });
      }
    }

    const key = `stage${stageNum}`;
    candidate[key] = {
      ...(candidate[key] || {}),
      ...req.body,
    };
    candidate.markModified(key);

    if (!candidate.completedStages.includes(stageNum)) {
      candidate.completedStages.push(stageNum);
    }
    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);
    res.json({ candidate, ...scoring });
  } catch (err) {
    console.error(`Error saving stage ${req.params.n}:`, err);
    res.status(500).json({ message: err.message || `Failed to save Stage ${req.params.n}.` });
  }
});

// POST /api/candidate/stage/:n/skip - skip-stage system (stages 2, 3, 7 only)
router.post("/stage/:n/skip", async (req, res) => {
  const stageNum = Number(req.params.n);
  if (!SKIPPABLE_STAGES.includes(stageNum)) {
    return res.status(400).json({ message: `Stage ${stageNum} cannot be skipped.` });
  }

  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  if (stageNum > 1 && !candidate.completedStages.includes(1)) {
    return res.status(400).json({ message: "You must complete and save Stage 1 (Identity & Basics) before skipping higher stages." });
  }

  candidate[`stage${stageNum}`] = { skipped: true };
  if (!candidate.completedStages.includes(stageNum)) {
    candidate.completedStages.push(stageNum);
  }
  await candidate.save();

  const scoring = calculateVerificationScore(candidate.completedStages);
  res.json({ candidate, ...scoring });
});

// POST /api/candidate/video-platform/sync - Sync Ready-Made Assessment Platform Results (Talview, HireVue, InCruiter, iMocha, HackerEarth)
router.post("/video-platform/sync", async (req, res) => {
  try {
    const { platformName, platformId, inviteLink, inviteCode, aiScore, proctoringFlags, videoUrl, transcript, livenessVerified } = req.body;

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    if (!candidate.completedStages.includes(1)) {
      return res.status(400).json({ message: "You must complete Stage 1 before syncing Stage 5 Video Assessment." });
    }

    const stage5Data = {
      ...(candidate.stage5 || {}),
      platform: platformName || "Talview AI",
      platformId: platformId || "talview",
      inviteLink: inviteLink || "",
      inviteCode: inviteCode || "",
      aiScore: aiScore || 88,
      proctoringFlags: proctoringFlags || "0 Flags · Passed",
      videoUrl: videoUrl || candidate.stage5?.videoUrl || "https://res.cloudinary.com/demo/video/upload/sample.mp4",
      transcript: transcript || "Candidate completed video Q&A assessment session.",
      livenessVerified: Boolean(livenessVerified),
      syncedAt: new Date(),
    };

    candidate.stage5 = stage5Data;
    candidate.markModified("stage5");

    if (!candidate.completedStages.includes(5)) {
      candidate.completedStages.push(5);
    }

    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);
    res.json({
      success: true,
      message: `Assessment results synced successfully from ${platformName || "Talview"}!`,
      stage5Data,
      candidate,
      ...scoring,
    });
  } catch (err) {
    console.error("Video platform sync error:", err);
    res.status(500).json({ message: err.message || "Failed to sync platform results." });
  }
});

// POST /api/candidate/ai-video/assess - Live AI Video Verification & Q&A Communication Rubric Assessment
router.post(
  "/ai-video/assess",
  upload.single("video"),
  handleUpload({ resourceType: "video" }),
  async (req, res) => {
    try {
      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

      if (!candidate.completedStages.includes(1)) {
        return res.status(400).json({ message: "You must complete Stage 1 before taking Stage 5 Video Assessment." });
      }

      let qaPairs = [];
      let proctorLogs = {};

      if (req.body.qaPairs) {
        try {
          qaPairs = JSON.parse(req.body.qaPairs);
        } catch (e) {}
      }
      if (req.body.proctorLogs) {
        try {
          proctorLogs = JSON.parse(req.body.proctorLogs);
        } catch (e) {}
      }

      const fileUrl = req.file?.fileUrl || candidate.stage5?.videoUrl || "https://res.cloudinary.com/demo/video/upload/sample.mp4";

      const evaluation = await evaluateAiVideoAssessment(qaPairs, proctorLogs);

      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        videoUrl: fileUrl,
        aiScore: evaluation.overallScore,
        rubricScores: evaluation.rubricScores,
        feedback: evaluation.feedback,
        livenessVerified: evaluation.livenessVerified,
        proctoringDeductions: evaluation.proctoringDeductions,
        completedAt: new Date(),
      };

      if (!candidate.completedStages.includes(5)) {
        candidate.completedStages.push(5);
      }

      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);
      res.json({
        success: true,
        message: `AI Video Verification & Communication Assessment Completed! Score: ${evaluation.overallScore}%`,
        evaluation,
        videoUrl: fileUrl,
        candidate,
        ...scoring,
      });
    } catch (err) {
      console.error("AI Video Assessment error:", err);
      res.status(500).json({ message: err.message || "Failed to process AI Video Assessment." });
    }
  }
);

// POST /api/candidate/upload/video - Stage 5 video introduction (Cloudinary / Local disk)
router.post(
  "/upload/video",
  upload.single("video"),
  handleUpload({ resourceType: "video" }),
  async (req, res) => {
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const candidate = await Candidate.findById(req.candidateId);
    if (candidate && !candidate.completedStages.includes(1)) {
      return res.status(400).json({ message: "You must complete Stage 1 before uploading Stage 5 video." });
    }

    const fileUrl = req.file.fileUrl;

    candidate.stage5 = { ...(candidate.stage5 || {}), videoUrl: fileUrl };
    if (!candidate.completedStages.includes(5)) candidate.completedStages.push(5);
    await candidate.save();

    res.json({ videoUrl: fileUrl, candidate });
  }
);

// POST /api/candidate/upload/doc/:n - generic per-stage document upload (Cloudinary / Local disk)
router.post(
  "/upload/doc/:n",
  upload.single("doc"),
  handleUpload({ resourceType: "auto" }),
  async (req, res) => {
    const stageNum = Number(req.params.n);
    if (!VALID_STAGES.includes(stageNum)) {
      return res.status(400).json({ message: "Invalid stage number." });
    }
    if (!req.file) return res.status(400).json({ message: "No file uploaded." });

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Not found." });

    if (stageNum > 1 && !candidate.completedStages.includes(1)) {
      return res.status(400).json({ message: "You must complete Stage 1 before uploading documents for higher stages." });
    }

    const fileUrl = req.file.fileUrl;
    const key = `stage${stageNum}`;
    candidate[key] = { ...(candidate[key] || {}), docUrl: fileUrl, docName: req.file.originalname };
    await candidate.save();

    res.json({ docUrl: fileUrl, docName: req.file.originalname, candidate });
  }
);

// GET /api/candidate/resume-data - locked, verified data the resume templates read from
router.get("/resume-data", async (req, res) => {
  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  const scoring = calculateVerificationScore(candidate.completedStages);

  res.json({
    id: candidate._id,
    email: candidate.email,
    basicInfo: candidate.stage1 || {},
    training: candidate.stage2 || {},
    certification: candidate.stage3 || {},
    assessment: candidate.stage4 || {},
    videoIntro: candidate.stage5 || {},
    liveCharts: candidate.stage6 || {},
    employmentStatus: candidate.stage8 || {},
    manualResume: candidate.manualResume || null,
    template: candidate.resumeTemplate,
    ...scoring,
  });
});

// PUT /api/candidate/manual-resume - save custom candidate-edited manual resume data
router.put("/manual-resume", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    candidate.manualResume = req.body;
    candidate.markModified("manualResume");

    if (!candidate.completedStages.includes(7)) {
      candidate.completedStages.push(7);
    }

    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);
    res.json({ success: true, candidate, ...scoring });
  } catch (err) {
    console.error("Save manual resume error:", err);
    res.status(500).json({ message: err.message || "Failed to save manual resume." });
  }
});

// PUT /api/candidate/resume-template - switch between Classic / Modern / Minimal / Executive
router.put("/resume-template", async (req, res) => {
  const { template } = req.body;
  if (!["classic", "modern", "minimal", "executive"].includes(template)) {
    return res.status(400).json({ message: "Invalid template." });
  }
  const candidate = await Candidate.findByIdAndUpdate(
    req.candidateId,
    { resumeTemplate: template },
    { new: true }
  );
  res.json({ candidate });
});

// POST /api/candidate/apply/:jobId - candidate applies to a published company job
router.post("/apply/:jobId", async (req, res) => {
  const { jobId } = req.params;
  const { coverNote } = req.body;

  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Candidate not found." });

  // A jobId now resolves against two possible sources: the legacy "first
  // JD" published straight off Company (jdPublished/jobId, from onboarding
  // Stage 9), or a Job document posted afterwards from the Job Posts screen
  // (see routes/company.js POST /jobs). Check the newer source first since
  // it's the one companies use once they're fully onboarded.
  let companyId = null;
  const postedJob = await Job.findOne({ jobId, published: true });
  if (postedJob) {
    companyId = postedJob.companyId;
  } else {
    const company = await Company.findOne({ jobId, jdPublished: true });
    if (company) companyId = company._id;
  }
  if (!companyId) {
    return res.status(404).json({ message: "Job posting not found or no longer active." });
  }

  try {
    const existing = await Application.findOne({ candidateId: candidate._id, jobId });
    if (existing) {
      return res.status(400).json({ message: "You have already applied for this job." });
    }

    const application = await Application.create({
      candidateId: candidate._id,
      companyId,
      jobId,
      coverNote: coverNote || "",
    });

    res.json({ message: "Application submitted successfully!", application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET /api/candidate/applications - retrieve candidate's applications
router.get("/applications", async (req, res) => {
  const applications = await Application.find({ candidateId: req.candidateId })
    .populate("companyId", "companyName stage9 jobId")
    .sort({ createdAt: -1 });

  res.json({ applications });
});

module.exports = router;
