const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Job = require("../models/Job");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { requireCompanyAuth, JWT_SECRET } = require("../middleware/auth");

const router = express.Router();

// Server-side masking - mirrors the display-only helpers that used to live
// in frontend/src/pages/CompanyPortal.jsx. Moved here because masking on
// the client only hides the value visually: the real email/mobile were
// still sitting in the API response for anyone to read from the network
// tab, regardless of whether their company account was verified.
function maskEmail(email) {
  if (!email) return "••••••••@••••.com";
  const parts = email.split("@");
  if (parts.length !== 2) return "••••••••@••••.com";
  const [name, domain] = parts;
  const maskedName = name.length > 2 ? name.substring(0, 2) + "••••" : name + "••••";
  return `${maskedName}@${domain}`;
}

function maskMobile(mobile) {
  if (!mobile) return "+91 98765 XXXXX";
  return mobile.replace(/(\+?\d{2,4}\s?\d{2,5})\d{4,5}/, "$1 XXXXX");
}

// Best-effort read of an optional company JWT. Unlike requireCompanyAuth,
// a missing/invalid token is not an error here - /candidates is browsable
// by anonymous visitors too, they just get masked contact info. Attaches
// req.isVerifiedCompany so the route handler can decide what to send.
async function attachVerifiedCompanyStatus(req, _res, next) {
  req.isVerifiedCompany = false;
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "company") return next();
    const company = await Company.findById(decoded.id).lean();
    req.isVerifiedCompany = !!company && company.kycStatus === "verified";
  } catch (err) {
    // Invalid/expired token on a route that doesn't require auth - just
    // treat the requester as anonymous rather than failing the request.
  }
  next();
}

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

// GET /api/public/candidates - browse verified profiles for companies.
// Anonymous visitors and companies that haven't completed KYC get masked
// contact info; only companies with kycStatus "verified" get the real
// email/mobile. This check happens here, not just in the UI, so the raw
// values never leave the server for a requester who isn't entitled to them.
router.get("/candidates", attachVerifiedCompanyStatus, async (req, res) => {
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

      const email = c.email;
      const mobile = stage1.mobile || "+91 98765 43210";

      return {
        id: c._id,
        name: stage1.fullName || c.name || "Verified Candidate",
        email: req.isVerifiedCompany ? email : maskEmail(email),
        mobile: req.isVerifiedCompany ? mobile : maskMobile(mobile),
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
        badge: scoring.isGoldBadge,
        badgeLabel: scoring.badgeTier,
        completedStages: c.completedStages || [1, 2, 4, 5, 6, 7]
      };
    });

    res.json({ candidates: formatted, total: formatted.length, isVerifiedCompany: req.isVerifiedCompany });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load candidates." });
  }
});

// GET /api/public/jobs - browse published JDs for the candidate-facing job
// board (frontend/src/pages/Jobs.jsx). This is the other half of the loop
// company onboarding Stage 9 ("First JD") publishes into: without this
// route (and the frontend page that calls it) a published JD was reachable
// by jobId only, with no way for a candidate to ever discover it.
function formatCompanyJob(c) {
  const s2 = c.stage2 || {};
  const s9 = c.stage9 || {};
  return {
    jobId: c.jobId,
    companyId: c._id,
    companyName: c.companyName || (c.stage1a && c.stage1a.legalname) || "Talentera Employer",
    companyLogo: (s2.logosquare && (s2.logosquare.docUrl || s2.logosquare.url)) || null,
    verifiedEmployer: c.kycStatus === "verified",
    publishedAt: c.jdPublishedAt,
    roleTitle: s9.roletitle || "Untitled role",
    department: s9.department || "",
    specialty: s9.specialty || "",
    level: s9.level || "",
    expMin: s9.expmin ?? null,
    expMax: s9.expmax ?? null,
    shift: s9.shift || "",
    location: s9.location || "",
    workMode: s9.workmode || "",
    compMin: s9.compmin ?? null,
    compMax: s9.compmax ?? null,
    openings: s9.openings ?? null,
    urgency: s9.urgency || "",
    languages: s9.languages || [],
    certsRequired: s9.certs || [],
    mustHaves: s9.musthaves || "",
  };
}

function formatPostedJob(job, companiesById) {
  const c = companiesById.get(String(job.companyId)) || {};
  const s2 = c.stage2 || {};
  const f = job.fields || {};
  return {
    jobId: job.jobId,
    companyId: job.companyId,
    companyName: c.companyName || (c.stage1a && c.stage1a.legalname) || "Talentera Employer",
    companyLogo: (s2.logosquare && (s2.logosquare.docUrl || s2.logosquare.url)) || null,
    verifiedEmployer: c.kycStatus === "verified",
    publishedAt: job.publishedAt,
    roleTitle: f.roletitle || "Untitled role",
    department: f.department || "",
    specialty: f.specialty || "",
    level: f.level || "",
    expMin: f.expmin ?? null,
    expMax: f.expmax ?? null,
    shift: f.shift || "",
    location: f.location || "",
    workMode: f.workmode || "",
    compMin: f.compmin ?? null,
    compMax: f.compmax ?? null,
    openings: f.openings ?? null,
    urgency: f.urgency || "",
    languages: f.languages || [],
    certsRequired: f.certs || [],
    mustHaves: f.musthaves || "",
  };
}

// GET /api/public/jobs - browse published JDs for the candidate-facing job
// board (frontend/src/pages/Jobs.jsx). Merges two sources: the legacy
// single "first JD" set directly on Company during onboarding
// (jdPublished/jobId/stage9), and any additional postings a KYC-verified
// company has made afterwards via POST /api/company/jobs (stored in the
// Job collection) - see that route's comment for why the split exists.
router.get("/jobs", async (req, res) => {
  try {
    const companies = await Company.find({ jdPublished: true }).lean();
    const fromOnboarding = companies.filter((c) => c.jobId).map(formatCompanyJob);

    const postedJobs = await Job.find({ published: true }).lean();
    let fromPosted = [];
    if (postedJobs.length > 0) {
      const companyIds = [...new Set(postedJobs.map((j) => String(j.companyId)))];
      const postedCompanies = await Company.find({ _id: { $in: companyIds } }).lean();
      const companiesById = new Map(postedCompanies.map((c) => [String(c._id), c]));
      fromPosted = postedJobs.map((job) => formatPostedJob(job, companiesById));
    }

    const jobs = [...fromOnboarding, ...fromPosted].sort(
      (a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0)
    );

    res.json({ jobs, total: jobs.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to load open jobs." });
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
    email: maskEmail(candidate.email),
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

// POST /api/public/candidate - add a candidate record, submitted by a
// logged-in company from the directory page.
//
// Two things were wrong here before: (1) the route had no auth check at
// all, so anyone on the internet could write directly into the production
// candidates collection; (2) every submission was stamped as if it had
// passed the full 8-stage verification pipeline (aadhaarVerified: true,
// assessment "passed", chart audit "verified", etc.) even though none of
// that actually happened - which meant this page could mint fake
// "Talentera Verified" badges on demand, undermining the one thing the
// directory is supposed to guarantee. Now: requires a company session, and
// only stage 1 (the contact info actually supplied) counts toward the
// verification score - everything else is stored but marked unverified
// until the candidate genuinely completes those stages themselves.
router.post("/candidate", requireCompanyAuth, async (req, res) => {
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
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ message: "Enter a valid email address." });
    }

    const existing = await Candidate.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ message: "A candidate with this email already exists." });
    }

    // Random, never-shared password - this account wasn't created by the
    // candidate signing up themselves, so nobody should be able to log
    // into it. (Previously every candidate added this way got the same
    // hard-coded password, which meant anyone who knew a candidate's email
    // could log in as them.)
    const passwordHash = await bcrypt.hash(crypto.randomBytes(24).toString("hex"), 10);

    const newCandidate = await Candidate.create({
      email,
      passwordHash,
      // Only the contact-info stage is "completed" - the rest is
      // self-reported by the submitting company, not independently
      // verified, so it shouldn't count toward the verification score or
      // unlock the verified badge.
      completedStages: [1],
      stage1: {
        fullName,
        mobile: mobile || "",
        city: city || "Bengaluru",
        experience: experience || "1-3",
        currentRole: currentRole || "RCM Specialist",
        aadhaarVerified: false,
      },
      stage2: academyName ? { academyName, batch: "Self-reported", verified: false } : { skipped: true },
      stage3: certificationName ? { name: certificationName, verified: false } : { skipped: true },
      stage4: assessmentScore ? { score: Number(assessmentScore) || 0, total: 100, topic: "RCM Knowledge Test", passed: false, selfReported: true } : null,
      stage5: null,
      stage6: accuracyScore ? { liveChartsAudited: 0, accuracyScore: Number(accuracyScore) || 0, verified: false, selfReported: true } : null,
      stage7: { summary: summary || "" },
      stage8: { status: noticePeriod || "Immediate Joiner", expectedCtc: expectedCtc || "" },
      resumeTemplate: "classic",
    });

    res.status(201).json({ message: "Candidate profile added. It will show as unverified until they complete Talentera's own verification steps.", candidate: newCandidate });
  } catch (err) {
    console.error("Create candidate error:", err);
    res.status(500).json({ message: err.message || "Failed to create candidate." });
  }
});

module.exports = router;
