const express = require("express");
const Candidate = require("../models/Candidate");
const { calculateVerificationScore } = require("../utils/verificationScore");

const router = express.Router();

// Mock candidate seed data for rich demo preview when database is fresh
const SEED_CANDIDATES = [
  {
    _id: "cand_101",
    email: "ananya.sharma@talentera.com",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: { fullName: "Ananya Sharma", mobile: "+91 98765 43210", city: "Bengaluru", experience: "3-5", currentRole: "Senior AR Caller", aadhaarVerified: true },
    stage2: { academyName: "Apex Medical Coding Institute", batch: "RCM Batch 2025-A", verified: true },
    stage3: { name: "CPC Certified (AAPC)", certId: "CPC-884920", verified: true },
    stage4: { score: 92, total: 100, topic: "Healthcare RCM & AR Follow-up", passed: true },
    stage5: { videoUrl: "/uploads/sample_video.mp4", duration: "1m 45s", verified: true },
    stage6: { liveChartsAudited: 45, accuracyScore: 98, verified: true },
    stage7: { summary: "3.5 years of experience in US Healthcare RCM, specializing in AR follow-up and denial management for multi-specialty clinics." },
    stage8: { status: "Immediate Joiner", expectedCtc: "5.5 LPA" }
  },
  {
    _id: "cand_102",
    email: "rajesh.kumar@talentera.com",
    completedStages: [1, 2, 4, 5, 6, 7],
    stage1: { fullName: "Rajesh Kumar", mobile: "+91 98123 45678", city: "Hyderabad", experience: "1-3", currentRole: "Medical Coder", aadhaarVerified: true },
    stage2: { academyName: "MedCode Academy", batch: "Batch 2025-B", verified: true },
    stage3: { skipped: true },
    stage4: { score: 85, total: 100, topic: "ICD-10-CM & CPT Coding", passed: true },
    stage5: { videoUrl: "/uploads/sample_video2.mp4", duration: "1m 20s", verified: true },
    stage6: { liveChartsAudited: 30, accuracyScore: 94, verified: true },
    stage7: { summary: "2 years in outpatient coding and chart audit with high accuracy." },
    stage8: { status: "15 Days Notice", expectedCtc: "4.2 LPA" }
  },
  {
    _id: "cand_103",
    email: "priya.nair@talentera.com",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: { fullName: "Priya Nair", mobile: "+91 97654 32109", city: "Chennai", experience: "5+", currentRole: "Denial Management Lead", aadhaarVerified: true },
    stage2: { academyName: "National Health Training Inst.", batch: "Senior RCM 2024", verified: true },
    stage3: { name: "CCS-P Certified (AHIMA)", certId: "CCS-339102", verified: true },
    stage4: { score: 96, total: 100, topic: "Denials & Appeals Mastery", passed: true },
    stage5: { videoUrl: "/uploads/sample_video3.mp4", duration: "2m 00s", verified: true },
    stage6: { liveChartsAudited: 60, accuracyScore: 99, verified: true },
    stage7: { summary: "5+ years resolving complex denial trends and leading AR teams." },
    stage8: { status: "Immediate Joiner", expectedCtc: "7.5 LPA" }
  },
  {
    _id: "cand_104",
    email: "vikram.singh@talentera.com",
    completedStages: [1, 4, 5, 6, 7],
    stage1: { fullName: "Vikram Singh", mobile: "+91 99887 76655", city: "Delhi NCR", experience: "Fresher", currentRole: "Trainee AR Executive", aadhaarVerified: true },
    stage2: { skipped: true },
    stage3: { skipped: true },
    stage4: { score: 78, total: 100, topic: "Basic RCM & Billing Terms", passed: true },
    stage5: { videoUrl: "/uploads/sample_video4.mp4", duration: "1m 10s", verified: true },
    stage6: { liveChartsAudited: 20, accuracyScore: 90, verified: true },
    stage7: { summary: "Enthusiastic RCM fresher trained in basic billing & claims entry." },
    stage8: { status: "Immediate Joiner", expectedCtc: "3.0 LPA" }
  },
  {
    _id: "cand_105",
    email: "kavita.reddy@talentera.com",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: { fullName: "Kavita Reddy", mobile: "+91 98440 11223", city: "Bengaluru", experience: "3-5", currentRole: "Payment Posting Specialist", aadhaarVerified: true },
    stage2: { academyName: "Apex Medical Coding Institute", batch: "RCM Batch 2025-A", verified: true },
    stage3: { name: "Certified Revenue Cycle Specialist (CRCS)", certId: "CRCS-55102", verified: true },
    stage4: { score: 88, total: 100, topic: "EOB & Payment Posting", passed: true },
    stage5: { videoUrl: "/uploads/sample_video5.mp4", duration: "1m 30s", verified: true },
    stage6: { liveChartsAudited: 50, accuracyScore: 96, verified: true },
    stage7: { summary: "4 years experience processing electronic and manual EOB/ERA payment posting." },
    stage8: { status: "1 Month Notice", expectedCtc: "5.0 LPA" }
  }
];

// GET /api/public/candidates - browse verified profiles for companies
router.get("/candidates", async (req, res) => {
  try {
    let dbCandidates = await Candidate.find().lean();
    let candidatesList = dbCandidates.length > 0 ? dbCandidates : SEED_CANDIDATES;

    const formatted = candidatesList.map((c) => {
      const scoring = calculateVerificationScore(c.completedStages || []);
      const stage1 = c.stage1 || {};
      const stage2 = c.stage2 || {};
      const stage3 = c.stage3 || {};
      const stage4 = c.stage4 || {};
      const stage5 = c.stage5 || {};
      const stage6 = c.stage6 || {};
      const stage7 = c.stage7 || {};
      const stage8 = c.stage8 || {};

      return {
        id: c._id,
        name: stage1.fullName || c.name || "Verified Candidate",
        email: c.email,
        mobile: stage1.mobile || "+91 98765 XXXXX",
        city: stage1.city || "Bengaluru",
        experience: stage1.experience || "1-3",
        currentRole: stage1.currentRole || "RCM Specialist",
        aadhaarVerified: !!stage1.aadhaarVerified,
        academyName: stage2.skipped ? null : (stage2.academyName || "Partner Academy"),
        certificationName: stage3.skipped ? null : (stage3.name || "AAPC Certified"),
        assessmentScore: stage4.score || 85,
        videoUrl: stage5.videoUrl || null,
        accuracyScore: stage6.accuracyScore || 95,
        chartsAudited: stage6.liveChartsAudited || 35,
        summary: stage7.summary || "Fully verified Healthcare RCM professional.",
        noticePeriod: stage8.status || "Immediate Joiner",
        expectedCtc: stage8.expectedCtc || "4.5 LPA",
        verificationScore: scoring.score,
        badge: scoring.badge,
        badgeLabel: scoring.badgeLabel,
        completedStages: c.completedStages || [1, 2, 4, 5, 6, 7]
      };
    });

    res.json({ candidates: formatted, total: formatted.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load candidates." });
  }
});

// GET /api/public/verify/candidate/:id - public credential verification view
router.get("/verify/candidate/:id", async (req, res) => {
  const { id } = req.params;

  let candidate = null;
  if (id.startsWith("cand_")) {
    candidate = SEED_CANDIDATES.find((c) => c._id === id);
  } else {
    try {
      candidate = await Candidate.findById(id).lean();
    } catch (e) {
      candidate = null;
    }
  }

  if (!candidate) {
    return res.status(404).json({ message: "Candidate credential not found." });
  }

  const scoring = calculateVerificationScore(candidate.completedStages || []);
  const stage1 = candidate.stage1 || {};
  const stage2 = candidate.stage2 || {};
  const stage3 = candidate.stage3 || {};
  const stage4 = candidate.stage4 || {};
  const stage5 = candidate.stage5 || {};
  const stage6 = candidate.stage6 || {};
  const stage7 = candidate.stage7 || {};
  const stage8 = candidate.stage8 || {};

  res.json({
    id: candidate._id,
    name: stage1.fullName || "Verified Candidate",
    email: candidate.email,
    mobile: stage1.mobile ? stage1.mobile.replace(/(\d{5})\d{5}/, "$1XXXXX") : "+91 98765 XXXXX",
    city: stage1.city || "Bengaluru",
    experience: stage1.experience || "1-3",
    currentRole: stage1.currentRole || "Specialist",
    aadhaarVerified: !!stage1.aadhaarVerified,
    academy: stage2,
    certification: stage3,
    assessment: stage4,
    videoIntro: stage5,
    liveCharts: stage6,
    summary: stage7.summary || "Verified professional profile on Talentera.",
    employmentStatus: stage8,
    scoring,
    verifiedAt: candidate.updatedAt || candidate.createdAt || new Date(),
  });
});

// POST /api/public/candidate - add a real candidate to MongoDB
router.post("/candidate", async (req, res) => {
  try {
    const {
      fullName,
      email,
      mobile,
      city,
      experience,
      currentRole,
      academyName,
      certificationName,
      assessmentScore,
      accuracyScore,
      summary,
      noticePeriod,
      expectedCtc,
    } = req.body;

    if (!email || !fullName) {
      return res.status(400).json({ message: "Full Name and Email are required." });
    }

    const bcrypt = require("bcryptjs");
    const passwordHash = await bcrypt.hash("Password123", 10);

    const completedStages = [1, 4, 5, 6, 7, 8];
    if (academyName) completedStages.push(2);
    if (certificationName) completedStages.push(3);

    const newCandidate = await Candidate.create({
      email,
      passwordHash,
      completedStages,
      stage1: {
        fullName,
        mobile: mobile || "+91 98765 43210",
        city: city || "Bengaluru",
        experience: experience || "1-3",
        currentRole: currentRole || "RCM Specialist",
        aadhaarVerified: true,
      },
      stage2: academyName ? { academyName, batch: "Batch 2026", verified: true } : { skipped: true },
      stage3: certificationName ? { name: certificationName, certId: `CERT-${Math.floor(100000 + Math.random() * 900000)}`, verified: true } : { skipped: true },
      stage4: { score: Number(assessmentScore) || 85, total: 100, topic: "RCM Knowledge Test", passed: true },
      stage5: { videoUrl: "/uploads/sample_video.mp4", duration: "1m 30s", verified: true },
      stage6: { liveChartsAudited: 40, accuracyScore: Number(accuracyScore) || 95, verified: true },
      stage7: { summary: summary || "Verified healthcare RCM professional." },
      stage8: { status: noticePeriod || "Immediate Joiner", expectedCtc: expectedCtc || "4.5 LPA" },
      resumeTemplate: "classic",
    });

    res.status(201).json({ message: "Candidate created successfully!", candidate: newCandidate });
  } catch (err) {
    console.error("Create candidate error:", err);
    res.status(500).json({ message: err.message || "Failed to create candidate." });
  }
});

module.exports = router;
