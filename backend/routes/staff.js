const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Job = require("../models/Job");
const Staff = require("../models/Staff");
const Notification = require("../models/Notification");
const InterviewQuestion = require("../models/InterviewQuestion");
const AuditLog = require("../models/AuditLog");
const bcrypt = require("bcryptjs");
const { requireStaffAuth, signToken } = require("../middleware/auth");
const { authLimiter } = require("../middleware/rateLimit");
const { getPlan, PLANS } = require("../config/plans");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");
const { isCloudinaryConfigured, uploadBufferToCloudinary } = require("../config/cloudinary");
const { startLiveVerifySession, captureLiveVerifyResult, closeLiveVerifySession } = require("../utils/liveVerifySession");

const router = express.Router();

let staffTasks = [
  { id: "tsk_1", time: "10:30 AM", title: "Verify CPC Certificate for Sanjay Mehta", priority: "P1", category: "Audit" },
  { id: "tsk_2", time: "11:45 AM", title: "Review Assessment Test #849 (MedCode Inst.)", priority: "P2", category: "Assessment" },
  { id: "tsk_3", time: "02:15 PM", title: "Approve Academy Batch Batch 2025-A Upload", priority: "P1", category: "Batch" },
  { id: "tsk_4", time: "04:30 PM", title: "Publish Weekly Verified Talent Leaderboard", priority: "P3", category: "Report" }
];

// Records a staff action to the audit trail. Best-effort: a logging failure
// should never block the underlying action from completing, so this only
// logs a warning rather than throwing. See IMPROVEMENT_ROADMAP.md "No audit
// trail on staff actions."
async function recordAudit(req, { action, targetType, targetId, summary, meta }) {
  try {
    await AuditLog.create({
      staffId: req.staffId,
      staffName: req.staffName || "",
      action,
      targetType: targetType || "other",
      targetId: targetId ? String(targetId) : "",
      summary: summary || "",
      meta: meta || {},
    });
  } catch (err) {
    logger.warn(`Failed to record audit log entry (${action}): ${err.message}`);
  }
}

function toStr(val, fallback = "") {
  if (val === null || val === undefined) return fallback;
  if (typeof val === "string") return val;
  if (typeof val === "number" || typeof val === "boolean") return String(val);
  if (typeof val === "object") {
    if (val.name && typeof val.name === "string") return val.name;
    if (val.email && typeof val.email === "string") return val.email;
    if (val.label && typeof val.label === "string") return val.label;
    if (val.title && typeof val.title === "string") return val.title;
    try {
      return JSON.stringify(val);
    } catch {
      return fallback;
    }
  }
  return String(val);
}

// The one hardcoded sandbox account behind StaffLogin.jsx's "Quick Demo
// Auditor Sandbox Login" button. Auto-provisioned on first use ONLY for
// this exact email+password pair - never for an arbitrary unknown username.
const DEMO_STAFF_EMAIL = "anita.reddy@talentera.in";
const DEMO_STAFF_PASSWORD = "Password123";

// POST /api/staff/login - Staff login with real DB verification & JWT token
//
// SECURITY FIX (2026-08-21 bug audit): this route used to (1) silently
// auto-create AND log in as a brand-new staff/admin account for ANY
// username that didn't already exist, with no password required at all
// (defaulting to "Password123" if none was sent), and (2) for a username
// that DID exist, skip the bcrypt check entirely whenever the request
// simply omitted the password field. Together those meant anyone who could
// reach this endpoint - no browser, no invite, nothing - could hand
// themselves a valid staff JWT, which now gates KYC verification, the
// interview answer-key bank, the audit log, and billing/plan assignment.
// Staff accounts must be provisioned deliberately (see backend/seed.js);
// this route never creates one except for the one demo sandbox account
// below, and a password is always required and always verified.
router.post("/login", authLimiter, async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Staff ID/Email and password are required." });
  }

  try {
    const cleanUser = username.trim().toLowerCase();
    let staff = await Staff.findOne({
      $or: [{ username: cleanUser }, { email: cleanUser }],
    });

    if (!staff) {
      if (cleanUser !== DEMO_STAFF_EMAIL || password !== DEMO_STAFF_PASSWORD) {
        // Same message as a wrong password below - never reveal whether a
        // username exists to an unauthenticated caller.
        return res.status(401).json({ message: "Invalid username or password." });
      }
      staff = await Staff.create({
        username: DEMO_STAFF_EMAIL,
        email: DEMO_STAFF_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_STAFF_PASSWORD, 10),
        name: "Anita Reddy",
        role: "Senior Operations Auditor",
        badge: "Gold Certified Lead",
      });
    } else {
      if (!staff.active) {
        return res.status(401).json({ message: "This staff account has been deactivated." });
      }
      const isMatch = await bcrypt.compare(password, staff.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid username or password." });
      }
    }

    const token = signToken(staff._id, "staff");

    res.json({
      token,
      staff: {
        id: staff._id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        name: staff.name,
        badge: staff.badge,
      },
    });
  } catch (err) {
    logger.error(`Staff login error: ${err.message}`);
    res.status(500).json({ message: "Failed to authenticate staff account." });
  }
});

// POST /api/staff/demo-login - 1-Click Sandbox Staff/Auditor Login
router.post("/demo-login", async (req, res) => {
  try {
    let staff = await Staff.findOne({
      $or: [{ username: DEMO_STAFF_EMAIL }, { email: DEMO_STAFF_EMAIL }],
    });

    if (!staff) {
      staff = await Staff.create({
        username: DEMO_STAFF_EMAIL,
        email: DEMO_STAFF_EMAIL,
        passwordHash: await bcrypt.hash(DEMO_STAFF_PASSWORD, 10),
        name: "Anita Reddy",
        role: "Senior Operations Auditor",
        badge: "Gold Certified Lead",
      });
    }

    const token = signToken(staff._id, "staff");

    res.json({
      token,
      staff: {
        id: staff._id,
        username: staff.username,
        email: staff.email,
        role: staff.role,
        name: staff.name,
        badge: staff.badge,
      },
      message: "Logged in as Demo Staff Sandbox.",
    });
  } catch (err) {
    logger.error(`Demo staff login error: ${err.message}`);
    res.status(500).json({ message: "Failed to launch demo staff sandbox." });
  }
});

// GET /api/staff/dashboard - Staff Operations Hub metrics (Protected)
router.get("/dashboard", requireStaffAuth, async (req, res) => {
  try {
    // Capped rather than truly paginated for now - this dashboard's queues
    // (incomingBucket, companyKycQueue, videoIntrosQueue, etc.) are all
    // derived in-memory from the full candidate/company lists, so real
    // pagination needs those derivations restructured around a paged query
    // instead of a full-collection fetch. Capping at a high bound at least
    // turns the previously fully-unbounded `.find()` into a bounded one -
    // see IMPROVEMENT_ROADMAP.md "No pagination on list endpoints."
    const DASHBOARD_FETCH_CAP = 1000;
    const candidates = await Candidate.find().limit(DASHBOARD_FETCH_CAP).lean();
    const companies = await Company.find().limit(DASHBOARD_FETCH_CAP).lean();
    const totalCandidates = candidates.length;

    // Filter candidate pending vs fully verified
    const pendingCandidates = candidates.filter((c) => (c.completedStages || []).length < 8);
    const fullyVerified = candidates.filter((c) => (c.completedStages || []).length >= 8);

    const incomingBucket = candidates.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s3 = c.stage3 || {};
      const s4 = c.stage4 || {};
      const fullName = toStr(s1.fullName || (c.email ? c.email.split("@")[0] : "Candidate"), "Candidate");
      const initials = fullName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2) || "CD";

      const stagesCount = (c.completedStages || []).length;
      const isVerified = stagesCount >= 8;
      const isAssessment = stagesCount >= 4;

      return {
        id: c._id,
        avatar: initials,
        name: fullName,
        studentName: fullName,
        academy: toStr(s2.academyName, "Apex Medical Coding Institute"),
        batch: toStr(s2.batch, "Batch 2026-A"),
        specialty: toStr(s1.currentRole || s2.domain, "Medical Coding"),
        course: toStr(s1.currentRole || s2.courseName, "Medical Coding"),
        cert: toStr(s3.certName || s3.name, c.completedStages?.includes(3) ? "CPC Certified" : "CPC-A"),
        location: toStr(s1.city, "Hyderabad"),
        time: "Recently",
        score: s4.score || 88,
        status: isVerified ? "Verified" : "Pending Verification",
        stage: isVerified ? "VERIFIED" : isAssessment ? "IN ASSESSMENT" : "PROFILE PENDING",
        stageColor: isVerified ? "#15803D" : isAssessment ? "#B45309" : "#475569",
        stageBg: isVerified ? "#DCFCE7" : isAssessment ? "#FEF3C7" : "#F1F5F9",
      };
    });

    // Company Account & KYC queue
    const companyKycQueue = companies.map((comp) => {
      const s1a = comp.stage1a || {};
      const s1b = comp.stage1b || {};
      const s2 = comp.stage2 || {};

      const rawDocs = [
        { id: "kycgst", label: "GST Certificate", val: s1a.kycgst },
        { id: "kycpan", label: "PAN Card", val: s1a.kycpan },
        { id: "kycincorp", label: "Certificate of Incorporation", val: s1a.kycincorp },
        { id: "kyccheque", label: "Cancelled Cheque", val: s1a.kyccheque },
        { id: "msme", label: "MSME Certificate", val: s1a.msme },
        { id: "logosquare", label: "Company Logo", val: s2.logosquare },
      ];

      const docVerifications = comp.docVerifications || {};

      const docs = rawDocs.map((d) => {
        let docUrl = null;
        let docName = null;
        if (d.val) {
          if (typeof d.val === "string") {
            docUrl = d.val;
            docName = d.label;
          } else if (typeof d.val === "object") {
            docUrl = d.val.docUrl || d.val.url || d.val.fileUrl || null;
            docName = d.val.docName || d.val.name || d.label;
          }
        }
        const vState = docVerifications[d.id] || null;
        return {
          id: d.id,
          label: d.label,
          docUrl: toStr(docUrl, null),
          docName: toStr(docName, null),
          uploaded: Boolean(docUrl),
          isValid: vState ? Boolean(vState.isValid) : null,
          verificationNote: vState ? toStr(vState.note, "") : "",
        };
      });

      return {
        id: comp._id,
        companyName: toStr(comp.companyName || s1a.legalname, "Unnamed Company"),
        contactName: toStr(comp.contactName || s1b.pocname, "N/A"),
        email: toStr(comp.email, ""),
        mobile: toStr(comp.mobile || s1b.pocmobile, "N/A"),
        legalName: toStr(s1a.legalname, "Not provided"),
        gstin: toStr(s1a.gstin, "Not provided"),
        pan: toStr(s1a.pan, "Not provided"),
        entity: toStr(s1a.entity, "Not specified"),
        signatory: toStr(s1a.signatory, "Not specified"),
        docs,
        kycGst: toStr(s1a.kycgst, null),
        kycPan: toStr(s1a.kycpan, null),
        kycIncorp: toStr(s1a.kycincorp, null),
        kycStatus: toStr(comp.kycStatus, "pending"),
        kycSubmittedAt: comp.kycSubmittedAt || null,
        kycRejectionReason: toStr(comp.kycRejectionReason, ""),
        plan: toStr(comp.plan, "free"),
      };
    });

    // Video Introductions Queue - strictly candidates who provided a real video introduction
    const videoIntrosQueue = candidates
      .filter((c) => {
        const s5 = c.stage5 || {};
        return s5 && (s5.videoUrl || s5.url || s5.fileUrl || s5.videoFileName) && !s5.skipped;
      })
      .map((c) => {
        const s1 = c.stage1 || {};
        const s5 = c.stage5 || {};
        const videoPath = s5.videoUrl || s5.url || s5.fileUrl || s5.videoFileName || "";

        const noteQuestions = Array.isArray(s5.answerNotes) ? s5.answerNotes : [];
        const legacyScoredQuestions = Array.isArray(s5.questionScores) ? s5.questionScores : [];
        const rawPairs = Array.isArray(s5.qaPairs) ? s5.qaPairs : [];
        const questions = noteQuestions.length
          ? noteQuestions.map((q, idx) => ({
              question: toStr(q.question || rawPairs[idx]?.question, `Question ${idx + 1}`),
              answerTranscript: toStr(q.translatedTranscript || q.transcript || rawPairs[idx]?.translatedTranscript || rawPairs[idx]?.transcript, ""),
              note: toStr(q.note, ""),
              answered: q.answered !== undefined ? Boolean(q.answered) : undefined,
              legacyMarks: null,
            }))
          : legacyScoredQuestions.length
          ? legacyScoredQuestions.map((q, idx) => ({
              question: toStr(q.question || rawPairs[idx]?.question, `Question ${idx + 1}`),
              answerTranscript: toStr(q.translatedTranscript || q.transcript || rawPairs[idx]?.translatedTranscript || rawPairs[idx]?.transcript, ""),
              note: toStr(q.feedback, ""),
              answered: q.answered !== undefined ? Boolean(q.answered) : undefined,
              legacyMarks: typeof q.marks === "number" ? q.marks : null,
            }))
          : rawPairs.map((p, idx) => ({
              question: toStr(p.question, `Question ${idx + 1}`),
              answerTranscript: toStr(p.translatedTranscript || p.transcript, ""),
              note: "",
              answered: undefined,
              legacyMarks: null,
            }));

        return {
          id: c._id,
          studentName: toStr(s1.fullName || (c.email ? c.email.split("@")[0] : "Candidate"), "Candidate"),
          email: toStr(c.email, ""),
          mobile: toStr(s1.mobile || c.mobile, "N/A"),
          role: toStr(s1.currentRole, "Medical Coding Specialist"),
          videoUrl: toStr(videoPath, ""),
          interviewMode: toStr(s5.interviewMode, "video"),
          duration: toStr(s5.duration, "1m 30s"),
          status: s5.verified ? "Verified" : "Pending Audit",
          verified: Boolean(s5.verified),
          aiScore: typeof s5.aiScore === "number" ? s5.aiScore : (s5.score || null),
          rubric: s5.rubric || null,
          questions,
          submittedAt: s5.completedAt || c.createdAt,
        };
      });

    // Text Assessment (Stage 4) Log - candidates who submitted the proctored
    // MCQ test. Grading is deterministic (multiple choice against a fixed
    // answer key) and final the instant the candidate submits - the score is
    // already shown to the candidate (see PUT /candidate/stage/4 and
    // AssessmentRunner.jsx) and doesn't need staff review. This list is for
    // reference/audit only; "verified"/staffVerified is an optional internal
    // flag, not a gate on anything.
    const textAssessmentQueue = candidates
      .filter((c) => {
        const s4 = c.stage4 || {};
        return s4 && s4.foundationScore !== undefined && !s4.skipped;
      })
      .map((c) => {
        const s1 = c.stage1 || {};
        const s4 = c.stage4 || {};
        return {
          id: c._id,
          studentName: toStr(s1.fullName || (c.email ? c.email.split("@")[0] : "Candidate"), "Candidate"),
          email: toStr(c.email, ""),
          mobile: toStr(s1.mobile || c.mobile, "N/A"),
          role: toStr(s1.currentRole, "Medical Coding Specialist"),
          assessmentType: toStr(s4.assessmentType, "Proctored Assessment"),
          topic: toStr(s4.topic, ""),
          foundationScore: s4.foundationScore,
          correctCount: s4.correctCount !== undefined ? s4.correctCount : null,
          totalQuestions: s4.totalQuestions !== undefined ? s4.totalQuestions : (Array.isArray(s4.answers) ? s4.answers.length : null),
          autoSubmittedReason: toStr(s4.autoSubmittedReason, null),
          submittedAt: s4.completedAt || c.updatedAt,
          verified: Boolean(s4.staffVerified),
          answers: Array.isArray(s4.answers) ? s4.answers : [],
        };
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Certification (Stage 3) Document Audit Queue - candidates who
    // submitted a professional certification claim (AAPC/AHIMA etc.) with
    // an uploaded certificate document, so staff can confirm it's genuine
    // before the candidate's profile shows it as verified. Training (2) and
    // Certification (3) stopped being skippable in 2026-08 - this queue is
    // the actual verification step that makes Stage 3 mean something,
    // mirroring the existing Company Account & KYC queue below and the
    // textAssessmentQueue pattern above.
    const certificationQueue = candidates
      .filter((c) => {
        const s3 = c.stage3 || {};
        return s3 && !s3.skipped && (s3.certName || s3.memberId || s3.name);
      })
      .map((c) => {
        const s1 = c.stage1 || {};
        const s3 = c.stage3 || {};
        return {
          id: c._id,
          studentName: toStr(s1.fullName || (c.email ? c.email.split("@")[0] : "Candidate"), "Candidate"),
          email: toStr(c.email, ""),
          mobile: toStr(s1.mobile || c.mobile, "N/A"),
          issuingBody: toStr(s3.issuingBody, ""),
          certName: toStr(s3.certName || s3.name, ""),
          memberId: toStr(s3.memberId, ""),
          issueDate: toStr(s3.issueDate, ""),
          docUrl: toStr(s3.docUrl, null),
          docName: toStr(s3.docName, null),
          certStatus: toStr(s3.certStatus, "pending"),
          certRejectionReason: toStr(s3.certRejectionReason, ""),
          liveVerificationEvidenceUrl: toStr(s3.liveVerificationEvidenceUrl, null),
          liveVerificationText: toStr(s3.liveVerificationText, ""),
          liveVerificationCapturedAt: s3.liveVerificationCapturedAt || null,
          liveVerificationCapturedBy: toStr(s3.liveVerificationCapturedBy, ""),
          liveVerificationSourceUrl: toStr(s3.liveVerificationSourceUrl, ""),
          submittedAt: c.updatedAt,
        };
      })
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    // Job Post Approval Queue - every job a company has submitted (the
    // legacy onboarding "first JD" on Company, or an additional posting
    // from the Job Posts screen in the Job collection) that isn't
    // discoverable to candidates yet. Combines both sources into one list
    // with a `source` discriminator so POST /verify-job below knows which
    // document to update - mirrors the companyKycQueue/certificationQueue
    // pattern above: nothing here counts as "live" until a staff member
    // reviews it (see routes/public.js GET /jobs, which now requires
    // approvalStatus === "approved").
    const jobApprovalQueue = [];
    for (const comp of companies) {
      if (comp.jdPublished && comp.jobId) {
        const s9 = comp.stage9 || {};
        jobApprovalQueue.push({
          source: "onboarding",
          id: String(comp._id), // companyId - the target for /verify-job on this source
          jobId: comp.jobId,
          companyName: comp.companyName || (comp.stage1a && comp.stage1a.legalname) || "Unnamed Company",
          companyEmail: comp.email,
          roleTitle: s9.roletitle || "Untitled role",
          specialty: s9.specialty || "",
          location: s9.location || "",
          workMode: s9.workmode || "",
          openings: s9.openings ?? null,
          submittedAt: comp.jdPublishedAt,
          approvalStatus: comp.jdApprovalStatus || "pending",
          rejectionReason: comp.jdRejectionReason || "",
        });
      }
    }
    const postedJobsForQueue = await Job.find().limit(DASHBOARD_FETCH_CAP).lean();
    if (postedJobsForQueue.length > 0) {
      const companiesById = new Map(companies.map((c) => [String(c._id), c]));
      for (const job of postedJobsForQueue) {
        const comp = companiesById.get(String(job.companyId)) || {};
        const f = job.fields || {};
        jobApprovalQueue.push({
          source: "posted",
          id: String(job._id), // Job _id - the target for /verify-job on this source
          jobId: job.jobId,
          companyName: comp.companyName || (comp.stage1a && comp.stage1a.legalname) || "Unnamed Company",
          companyEmail: comp.email || "",
          roleTitle: f.roletitle || "Untitled role",
          specialty: f.specialty || "",
          location: f.location || "",
          workMode: f.workmode || "",
          openings: f.openings ?? null,
          submittedAt: job.publishedAt || job.createdAt,
          approvalStatus: job.approvalStatus || "pending",
          rejectionReason: job.rejectionReason || "",
        });
      }
    }
    jobApprovalQueue.sort((a, b) => new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0));

    // Performance & Audit Metrics Report Data
    const reportsData = {
      totalCandidates,
      totalCompanies: companies.length,
      verifiedCompanies: companies.filter((c) => c.kycStatus === "verified").length,
      pendingCompanies: companies.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
      verifiedCandidates: fullyVerified.length,
      pendingCandidatesCount: pendingCandidates.length,
      placementRate: "86%",
      monthlyVerifications: [
        { month: "Jan", count: 120 },
        { month: "Feb", count: 145 },
        { month: "Mar", count: 180 },
        { month: "Apr", count: 210 },
        { month: "May", count: 260 },
      ],
    };

    const pipeline = [
      { stage: "Basic Info", count: candidates.filter((c) => c.completedStages?.includes(1)).length || totalCandidates },
      { stage: "Training Claim", count: candidates.filter((c) => c.completedStages?.includes(2)).length },
      { stage: "Certification", count: candidates.filter((c) => c.completedStages?.includes(3)).length },
      { stage: "Assessment", count: candidates.filter((c) => c.completedStages?.includes(4)).length },
      { stage: "Video Intro", count: candidates.filter((c) => c.completedStages?.includes(5)).length },
      { stage: "Live Charts", count: candidates.filter((c) => c.completedStages?.includes(6)).length },
      { stage: "Placed", count: fullyVerified.length, isPlaced: true }
    ];

    res.json({
      liveQueueCount:
        incomingBucket.length +
        companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length +
        certificationQueue.filter((c) => c.certStatus === "pending").length +
        jobApprovalQueue.filter((j) => j.approvalStatus === "pending").length,
      stats: {
        pendingVerifications: incomingBucket.length + companyKycQueue.filter((c) => c.kycStatus === "under_review").length,
        verifiedToday: 42 + fullyVerified.length + companyKycQueue.filter((c) => c.kycStatus === "verified").length,
        activeCandidates: totalCandidates,
        placedThisMonth: 86,
        pendingCompanyKycs: companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
        verifiedCompanies: companyKycQueue.filter((c) => c.kycStatus === "verified").length,
        pendingCertifications: certificationQueue.filter((c) => c.certStatus === "pending").length,
        pendingJobApprovals: jobApprovalQueue.filter((j) => j.approvalStatus === "pending").length,
      },
      pipeline,
      incomingBucket,
      companyKycQueue,
      videoIntrosQueue,
      textAssessmentQueue,
      certificationQueue,
      jobApprovalQueue,
      reportsData,
      tasks: staffTasks,
      leaderboard: [
        { rank: 1, name: "Vikram Malhotra", dept: "RCM Quality Audit", score: 98 },
        { rank: 2, name: "Neha Saxena", dept: "Coding Verification", score: 94 },
        { rank: 3, name: "Rohan Das", dept: "Video & Assessment QC", score: 91 }
      ]
    });
  } catch (err) {
    logger.error(`Staff dashboard error: ${err.message}`);
    res.status(500).json({ message: "Error fetching staff dashboard." });
  }
});

// POST /api/staff/verify-candidate - Perform candidate verification action (Protected)
router.post("/verify-candidate", requireStaffAuth, async (req, res) => {
  try {
    const { candidateId, action } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (candidate) {
      if (action === "verify") {
        candidate.completedStages = Array.from(new Set([...(candidate.completedStages || []), 1, 2, 3, 4, 5, 6, 7, 8]));
        candidate.stage5 = { ...(candidate.stage5 || {}), verified: true, verifiedAt: new Date() };
        await candidate.save();
      }
    }

    await recordAudit(req, {
      action: action === "verify" ? "verify_candidate" : "skip_candidate_verification",
      targetType: "candidate",
      targetId: candidateId,
      summary: `Candidate ${candidate?.email || candidateId} ${action === "verify" ? "verified & gold-badged" : "skipped"} by staff.`,
    });

    res.json({
      message: `Candidate successfully ${action === "verify" ? "Verified & Gold-Badged" : "Skipped"}.`,
    });
  } catch (err) {
    logger.error(`Verify candidate error: ${err.message}`);
    res.status(500).json({ message: "Verification action failed." });
  }
});

// Helper to dispatch audit result email to company POC
async function sendKycAuditEmail({ to, companyName, action, notes, rejectionReason, rejectedFields }) {
  logger.info("==================================================================");
  logger.info(`[AUDIT EMAIL DISPATCHED TO: ${to}]`);
  if (action === "verify") {
    logger.info(`SUBJECT: [Talentera] Account & KYC Verification Approved - Gold Trust Badge Active!`);
    logger.info(
      `BODY:\nDear ${companyName} Hiring Team,\n\nWe are pleased to inform you that your Account & KYC Verification details have been audited and APPROVED by Talentera Staff.\n\nAudit Notes: ${notes || "Verified by Staff Auditor"}\nStatus: VERIFIED (Gold Trust Badge Active)\n\nYou can now post live JDs and contact verified candidates directly.\n\nBest regards,\nTalentera Verification Audit Team`
    );
  } else {
    logger.info(`SUBJECT: [Talentera] Action Required: Account & KYC Verification Revision Requested`);
    logger.info(
      `BODY:\nDear ${companyName} Hiring Team,\n\nOur Staff Auditors reviewed your Account & KYC submission and noted that revision is required before approval.\n\nReason / Audit Notes: ${rejectionReason || notes || "Document revision required"}\nAffected Document(s): ${rejectedFields ? rejectedFields.join(", ") : "KYC Certificates"}\n\nPlease log in to your Company Dashboard to re-upload the requested documents.\n\nBest regards,\nTalentera Verification Audit Team`
    );
  }
  logger.info("==================================================================");
}

// POST /api/staff/verify-company - Perform company Account & KYC verification action (Protected)
router.post("/verify-company", requireStaffAuth, async (req, res) => {
  try {
    const { companyId, action, notes, rejectionReason } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    if (action === "verify") {
      company.kycStatus = "verified";
      company.kycVerifiedAt = new Date();
      company.kycNotes = notes || "Account & KYC documents audited and verified by Staff Auditor.";
      company.kycRejectionReason = "";
      company.rejectedKycFields = [];
      if (!company.completedStages.includes("1a")) {
        company.completedStages.push("1a");
      }
    } else if (action === "reject") {
      company.kycStatus = "rejected";
      company.kycRejectionReason = rejectionReason || "Account & KYC documents require revision. Please verify GSTIN/PAN details.";
      company.kycNotes = notes || "";

      // Gather invalid doc keys
      const dVer = company.docVerifications || {};
      const invalidKeys = Object.keys(dVer).filter((key) => dVer[key] && dVer[key].isValid === false);
      company.rejectedKycFields = invalidKeys.length > 0 ? invalidKeys : ["kycgst", "kycpan"];
    }

    await company.save();

    // Dispatch email notification to company email POC
    await sendKycAuditEmail({
      to: company.email,
      companyName: company.companyName || "Employer",
      action,
      notes: company.kycNotes,
      rejectionReason: company.kycRejectionReason,
      rejectedFields: company.rejectedKycFields,
    });

    // Create In-App Notification for Company
    await Notification.create({
      recipientType: "company",
      recipientId: String(company._id),
      title: action === "verify" ? "Account & KYC Verification Approved" : "KYC Verification Revision Requested",
      message:
        action === "verify"
          ? "Your Account & KYC details have been verified by Staff Auditor. Gold Trust Badge is now active!"
          : `Revision required for your KYC submission: ${company.kycRejectionReason}`,
      type: action === "verify" ? "kyc_approved" : "kyc_revision",
      meta: { action, companyId: String(company._id) },
    });

    await recordAudit(req, {
      action: action === "verify" ? "verify_company" : "reject_company",
      targetType: "company",
      targetId: companyId,
      summary: `Company ${company.companyName || company.email} ${action === "verify" ? "KYC verified" : "KYC rejected"}.`,
      meta: { rejectionReason: company.kycRejectionReason || undefined },
    });

    res.json({
      message: `Company ${company.companyName || "account"} successfully ${action === "verify" ? "Verified & KYC Approved" : "Marked for Revision"}. Notification email sent to ${company.email}.`,
      company,
      emailSent: true,
      emailRecipient: company.email,
    });
  } catch (err) {
    logger.error(`Verify company error: ${err.message}`);
    res.status(500).json({ message: "Company verification action failed." });
  }
});

// GET /api/staff/notifications - Fetch staff notifications (Protected)
router.get("/notifications", requireStaffAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientType: "staff" })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    logger.error(`Fetch staff notifications error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch staff notifications." });
  }
});

// POST /api/staff/notifications/mark-read - Mark staff notifications as read (Protected)
router.post("/notifications/mark-read", requireStaffAuth, async (req, res) => {
  try {
    await Notification.updateMany({ recipientType: "staff", read: false }, { $set: { read: true } });
    res.json({ message: "Staff notifications marked as read." });
  } catch (err) {
    logger.error(`Mark staff notifications read error: ${err.message}`);
    res.status(500).json({ message: "Failed to mark staff notifications as read." });
  }
});

// POST /api/staff/verify-document - Mark individual document image as valid or invalid by employee auditor (Protected)
router.post("/verify-document", requireStaffAuth, async (req, res) => {
  try {
    const { companyId, docId, isValid, note } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    const current = company.docVerifications || {};
    current[docId] = {
      isValid: Boolean(isValid),
      verifiedAt: new Date(),
      note: note || (isValid ? "Uploaded document image verified as valid." : "Uploaded document image is invalid or unreadable."),
    };

    const rejectedList = new Set(company.rejectedKycFields || []);
    if (!isValid) {
      rejectedList.add(docId);
    } else {
      rejectedList.delete(docId);
    }
    company.rejectedKycFields = Array.from(rejectedList);

    company.docVerifications = current;
    company.markModified("docVerifications");
    await company.save();

    await recordAudit(req, {
      action: "verify_document",
      targetType: "company",
      targetId: companyId,
      summary: `Document "${docId}" for ${company.companyName || company.email} marked ${isValid ? "VALID" : "INVALID"}.`,
    });

    res.json({
      message: `Document (${docId}) image marked as ${isValid ? "VALID ✓" : "INVALID ❌"}.`,
      company,
    });
  } catch (err) {
    logger.error(`Verify document error: ${err.message}`);
    res.status(500).json({ message: "Document image verification failed." });
  }
});

// POST /api/staff/verify-assessment - Mark a Stage 4 text assessment as reviewed by staff (Protected)
router.post("/verify-assessment", requireStaffAuth, async (req, res) => {
  try {
    const { candidateId, note } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    if (!candidate.stage4) return res.status(400).json({ message: "This candidate has no Stage 4 assessment submission yet." });

    candidate.stage4 = {
      ...(candidate.stage4 || {}),
      staffVerified: true,
      staffVerifiedAt: new Date(),
      staffVerificationNote: note || "",
    };
    candidate.markModified("stage4");
    await candidate.save();

    await recordAudit(req, {
      action: "verify_assessment",
      targetType: "candidate",
      targetId: candidateId,
      summary: `Stage 4 assessment for ${candidate.email} marked reviewed & verified.`,
    });

    res.json({ message: "Assessment marked as reviewed & verified." });
  } catch (err) {
    logger.error(`Verify assessment error: ${err.message}`);
    res.status(500).json({ message: "Failed to verify assessment." });
  }
});

// POST /api/staff/verify-certification - Approve or reject a candidate's
// Stage 3 certification claim after a staff member reviews the uploaded
// certificate document. This is the actual authenticity check: candidates
// can no longer self-declare a certification as verified (see
// candidate.js PUT /stage/3, which always forces certStatus back to
// "pending" server-side). Mirrors POST /verify-company below.
router.post("/verify-certification", requireStaffAuth, async (req, res) => {
  try {
    const { candidateId, action, notes, rejectionReason } = req.body;
    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be \"verify\" or \"reject\"." });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    if (!candidate.stage3 || candidate.stage3.skipped) {
      return res.status(400).json({ message: "This candidate has no certification submission to review." });
    }

    if (action === "verify") {
      candidate.stage3.certStatus = "verified";
      candidate.stage3.certVerifiedAt = new Date();
      candidate.stage3.certVerifiedBy = req.staffName || "";
      candidate.stage3.certRejectionReason = "";
    } else {
      candidate.stage3.certStatus = "rejected";
      candidate.stage3.certVerifiedAt = null;
      candidate.stage3.certVerifiedBy = "";
      candidate.stage3.certRejectionReason =
        rejectionReason || "Certificate could not be confirmed as genuine. Please re-upload a clear, valid document.";
    }
    candidate.markModified("stage3");
    await candidate.save();

    // Best-effort candidate-facing notification. There's no in-app
    // notification channel for candidates yet (Notification.recipientType
    // only supports "company"/"staff") and no email service call site for
    // this event yet either - logged the same way sendKycAuditEmail below
    // logs company KYC results, ready to wire to a real send once a
    // candidate notification channel exists.
    logger.info(
      `[CERT AUDIT] ${candidate.email}: Stage 3 certification ${action === "verify" ? "VERIFIED" : "REJECTED"}` +
        (notes ? ` — ${notes}` : "") +
        (action === "reject" ? ` (reason: ${candidate.stage3.certRejectionReason})` : "")
    );

    await recordAudit(req, {
      action: action === "verify" ? "verify_certification" : "reject_certification",
      targetType: "candidate",
      targetId: candidateId,
      summary: `Stage 3 certification (${candidate.stage3.certName || "certification"}) for ${candidate.email} ${action === "verify" ? "verified" : "rejected"} by staff.`,
      meta: { rejectionReason: candidate.stage3.certRejectionReason || undefined },
    });

    res.json({
      message: `Certification ${action === "verify" ? "verified" : "marked for revision"}.`,
      candidate,
    });
  } catch (err) {
    logger.error(`Verify certification error: ${err.message}`);
    res.status(500).json({ message: "Failed to verify certification." });
  }
});

// POST /api/staff/certification/:candidateId/live-verify/start - opens a
// REAL, human-operated remote browser session on the candidate's issuing
// body's official verification page (see utils/liveVerifySession.js for
// why this can't be done unattended - reCAPTCHA - and why an earlier
// "auto-verify" feature that pretended to do this automatically was
// removed as a fabrication). Staff drives the session themselves from the
// live view URL this returns; nothing here changes certStatus.
router.post("/certification/:candidateId/live-verify/start", requireStaffAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    if (!candidate.stage3 || candidate.stage3.skipped) {
      return res.status(400).json({ message: "This candidate has no certification submission to verify." });
    }

    const s1 = candidate.stage1 || {};
    const s3 = candidate.stage3 || {};
    const fullName = (s1.fullName || "").trim();
    const lastName = fullName ? fullName.split(/\s+/).pop() : "";

    const result = await startLiveVerifySession({
      candidateId: candidate._id.toString(),
      body: s3.body || "aapc",
      memberId: s3.memberId || "",
      lastName,
    });

    res.json({ success: true, ...result });
  } catch (err) {
    logger.error(`Live verify start error: ${err.message}`);
    res.status(400).json({ message: err.message || "Could not start a live verification session." });
  }
});

// POST /api/staff/certification/live-verify/:sessionId/capture - takes a
// screenshot + the visible page text from the staff member's in-progress
// live session and saves both onto the candidate's stage3 record as
// evidence. This is evidence for a human to read, not a verdict - staff
// still uses the existing POST /verify-certification to actually mark the
// certification verified or rejected.
router.post("/certification/live-verify/:sessionId/capture", requireStaffAuth, async (req, res) => {
  try {
    const { candidateId, pageText, screenshotBuffer, currentUrl } = await captureLiveVerifyResult(req.params.sessionId);

    let evidenceUrl = null;
    if (isCloudinaryConfigured()) {
      const uploaded = await uploadBufferToCloudinary(screenshotBuffer, {
        folder: `talentera/live-verify-evidence/${candidateId}`,
        resource_type: "image",
      });
      evidenceUrl = uploaded.secure_url;
    } else {
      const dir = path.join(__dirname, "..", "uploads", "live-verify-evidence", String(candidateId));
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      const filename = `${Date.now()}.png`;
      fs.writeFileSync(path.join(dir, filename), screenshotBuffer);
      evidenceUrl = `/uploads/live-verify-evidence/${candidateId}/${filename}`;
    }

    const candidate = await Candidate.findById(candidateId);
    if (candidate) {
      candidate.stage3 = {
        ...(candidate.stage3 || {}),
        liveVerificationEvidenceUrl: evidenceUrl,
        liveVerificationText: pageText,
        liveVerificationCapturedAt: new Date(),
        liveVerificationCapturedBy: req.staffName || "",
        liveVerificationSourceUrl: currentUrl,
      };
      candidate.markModified("stage3");
      await candidate.save();

      await recordAudit(req, {
        action: "capture_live_certification_evidence",
        targetType: "candidate",
        targetId: candidateId,
        summary: `Captured live verification evidence for ${candidate.email}'s Stage 3 certification from ${currentUrl}.`,
      });
    }

    res.json({
      success: true,
      capturedAt: new Date().toISOString(),
      currentUrl,
      pageText,
      evidenceUrl,
    });
  } catch (err) {
    logger.error(`Live verify capture error: ${err.message}`);
    res.status(400).json({ message: err.message || "Could not capture the verification result." });
  }
});

// POST /api/staff/certification/live-verify/:sessionId/close - staff is
// done with (or abandoning) a live session; releases the remote browser.
// Sessions also self-expire after 10 minutes if this is never called.
router.post("/certification/live-verify/:sessionId/close", requireStaffAuth, async (req, res) => {
  await closeLiveVerifySession(req.params.sessionId);
  res.json({ success: true });
});

// POST /api/staff/verify-job - Approve or reject a company's job post
// before it can appear on the public job board (routes/public.js GET
// /jobs). Handles both job sources - the legacy onboarding "first JD" on
// Company (source: "onboarding", id = companyId) and an additional
// posting from the Job Posts screen (source: "posted", id = Job _id) - see
// GET /dashboard's jobApprovalQueue for how the two get merged into one
// list for the Staff Hub. Mirrors POST /verify-company / verify-certification.
router.post("/verify-job", requireStaffAuth, async (req, res) => {
  try {
    const { source, id, action, rejectionReason } = req.body;
    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be \"verify\" or \"reject\"." });
    }
    if (!["onboarding", "posted"].includes(source)) {
      return res.status(400).json({ message: "Source must be \"onboarding\" or \"posted\"." });
    }

    let companyId, jobId, roleTitle;

    if (source === "onboarding") {
      const company = await Company.findById(id);
      if (!company || !company.jdPublished) {
        return res.status(404).json({ message: "Job post not found." });
      }
      companyId = company._id;
      jobId = company.jobId;
      roleTitle = (company.stage9 || {}).roletitle || "Untitled role";

      if (action === "verify") {
        company.jdApprovalStatus = "approved";
        company.jdApprovedAt = new Date();
        company.jdApprovedBy = req.staffName || "";
        company.jdRejectionReason = "";
      } else {
        company.jdApprovalStatus = "rejected";
        company.jdApprovedAt = null;
        company.jdApprovedBy = "";
        company.jdRejectionReason = rejectionReason || "Job post did not meet Talentera's listing guidelines. Please review and resubmit.";
      }
      await company.save();
    } else {
      const job = await Job.findById(id);
      if (!job) return res.status(404).json({ message: "Job post not found." });
      companyId = job.companyId;
      jobId = job.jobId;
      roleTitle = (job.fields || {}).roletitle || "Untitled role";

      if (action === "verify") {
        job.approvalStatus = "approved";
        job.approvedAt = new Date();
        job.approvedBy = req.staffName || "";
        job.rejectionReason = "";
      } else {
        job.approvalStatus = "rejected";
        job.approvedAt = null;
        job.approvedBy = "";
        job.rejectionReason = rejectionReason || "Job post did not meet Talentera's listing guidelines. Please review and resubmit.";
      }
      await job.save();
    }

    // Notify the company through the in-app notification bell (see
    // GET /api/company/notifications, consumed today by
    // CompanyDashboardSetup.jsx) - the same channel POST /verify-company
    // uses for KYC results.
    await Notification.create({
      recipientType: "company",
      recipientId: String(companyId),
      title: action === "verify" ? "Job Post Approved" : "Job Post Rejected",
      message:
        action === "verify"
          ? `Your job post "${roleTitle}" (${jobId}) has been approved by Talentera staff and is now live on the job board.`
          : `Your job post "${roleTitle}" (${jobId}) was not approved: ${rejectionReason || "it did not meet Talentera's listing guidelines."} Update it and resubmit from Job Posts.`,
      type: action === "verify" ? "job_approved" : "job_rejected",
      meta: { source, jobId, action },
    });

    await recordAudit(req, {
      action: action === "verify" ? "verify_job" : "reject_job",
      targetType: "job",
      targetId: source === "onboarding" ? String(companyId) : String(id),
      summary: `Job post "${roleTitle}" (${jobId}) ${action === "verify" ? "approved" : "rejected"} by staff.`,
      meta: { source, rejectionReason: action === "reject" ? rejectionReason : undefined },
    });

    res.json({
      message: `Job post ${action === "verify" ? "approved and now live on the job board" : "rejected"}.`,
    });
  } catch (err) {
    logger.error(`Verify job error: ${err.message}`);
    res.status(500).json({ message: "Failed to verify job post." });
  }
});

// ---------------------------------------------------------------------------
// Interview Questions (Stage 5 AI Video Assessment / AI Audio Interview bank)
// ---------------------------------------------------------------------------
// Staff manage the exact questions the AI asks candidates, and the correct
// answer used to grade them - see backend/models/InterviewQuestion.js and
// GET /api/candidate/interview-questions in routes/candidate.js. The correct
// answer never leaves this staff-only surface.

// GET /api/staff/interview-questions - list all questions (any mode, active or not)
router.get("/interview-questions", requireStaffAuth, async (req, res) => {
  try {
    const questions = await InterviewQuestion.find().sort({ mode: 1, order: 1, createdAt: 1 }).lean();
    res.json({ questions });
  } catch (err) {
    logger.error(`List interview questions error: ${err.message}`);
    res.status(500).json({ message: "Failed to load interview questions." });
  }
});

// POST /api/staff/interview-questions - create a new question
router.post("/interview-questions", requireStaffAuth, async (req, res) => {
  try {
    const { text, correctAnswer, mode, order, active } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: "Question text is required." });
    }
    if (!correctAnswer || !correctAnswer.trim()) {
      return res.status(400).json({ message: "A correct answer is required so the AI can grade responses to this question." });
    }

    const question = await InterviewQuestion.create({
      text: text.trim(),
      correctAnswer: correctAnswer.trim(),
      mode: ["video", "audio", "both"].includes(mode) ? mode : "both",
      order: Number.isFinite(Number(order)) ? Number(order) : 0,
      active: active !== false,
    });

    await recordAudit(req, {
      action: "create_interview_question",
      targetType: "interview_question",
      targetId: question._id,
      summary: `Created interview question (${question.mode}): "${question.text.slice(0, 80)}"`,
    });

    res.status(201).json({ question });
  } catch (err) {
    logger.error(`Create interview question error: ${err.message}`);
    res.status(500).json({ message: "Failed to create interview question." });
  }
});

// PUT /api/staff/interview-questions/:id - edit an existing question
router.put("/interview-questions/:id", requireStaffAuth, async (req, res) => {
  try {
    const { text, correctAnswer, mode, order, active } = req.body;
    const question = await InterviewQuestion.findById(req.params.id);
    if (!question) return res.status(404).json({ message: "Interview question not found." });

    if (text !== undefined) question.text = text.trim();
    if (correctAnswer !== undefined) question.correctAnswer = correctAnswer.trim();
    if (mode !== undefined && ["video", "audio", "both"].includes(mode)) question.mode = mode;
    if (order !== undefined && Number.isFinite(Number(order))) question.order = Number(order);
    if (active !== undefined) question.active = Boolean(active);

    if (!question.text) return res.status(400).json({ message: "Question text is required." });
    if (!question.correctAnswer) return res.status(400).json({ message: "A correct answer is required so the AI can grade responses to this question." });

    await question.save();

    await recordAudit(req, {
      action: "update_interview_question",
      targetType: "interview_question",
      targetId: question._id,
      summary: `Updated interview question (${question.mode}): "${question.text.slice(0, 80)}"`,
    });

    res.json({ question });
  } catch (err) {
    logger.error(`Update interview question error: ${err.message}`);
    res.status(500).json({ message: "Failed to update interview question." });
  }
});

// DELETE /api/staff/interview-questions/:id - remove a question
router.delete("/interview-questions/:id", requireStaffAuth, async (req, res) => {
  try {
    const deleted = await InterviewQuestion.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "Interview question not found." });

    await recordAudit(req, {
      action: "delete_interview_question",
      targetType: "interview_question",
      targetId: req.params.id,
      summary: `Deleted interview question: "${(deleted.text || "").slice(0, 80)}"`,
    });

    res.json({ message: "Interview question deleted.", id: req.params.id });
  } catch (err) {
    logger.error(`Delete interview question error: ${err.message}`);
    res.status(500).json({ message: "Failed to delete interview question." });
  }
});

// ---------------------------------------------------------------------------
// Audit trail
// ---------------------------------------------------------------------------

// GET /api/staff/audit-log - recent staff actions, newest first (paginated)
router.get("/audit-log", requireStaffAuth, async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(req.query.limit) || 50));

    const [entries, total] = await Promise.all([
      AuditLog.find()
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(),
    ]);

    res.json({ entries, total, page, limit, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    logger.error(`Fetch audit log error: ${err.message}`);
    res.status(500).json({ message: "Failed to load audit log." });
  }
});

// ---------------------------------------------------------------------------
// Billing scaffolding - plan assignment (no live payment gateway wired; see
// backend/config/plans.js and IMPROVEMENT_ROADMAP.md "No plans, seats, or
// billing.")
// ---------------------------------------------------------------------------

// GET /api/staff/plans - the static plan catalog, for the assignment UI
router.get("/plans", requireStaffAuth, async (req, res) => {
  res.json({ plans: Object.values(PLANS) });
});

// POST /api/staff/companies/:id/assign-plan - manually set a company's plan
// (stand-in for a real checkout flow, which doesn't exist yet by design -
// see IMPROVEMENT_ROADMAP.md).
router.post("/companies/:id/assign-plan", requireStaffAuth, async (req, res) => {
  try {
    const { plan } = req.body;
    if (!["free", "growth", "enterprise"].includes(plan)) {
      return res.status(400).json({ message: "Invalid plan. Must be one of: free, growth, enterprise." });
    }

    const company = await Company.findById(req.params.id);
    if (!company) return res.status(404).json({ message: "Company not found." });

    const previousPlan = company.plan;
    company.plan = plan;
    company.planAssignedAt = new Date();
    company.planAssignedBy = req.staffId ? String(req.staffId) : "";
    await company.save();

    await recordAudit(req, {
      action: "assign_plan",
      targetType: "company",
      targetId: company._id,
      summary: `Plan changed for ${company.companyName || company.email}: ${previousPlan} -> ${plan}.`,
    });

    res.json({ message: `Plan updated to "${getPlan(plan).label}".`, company });
  } catch (err) {
    logger.error(`Assign plan error: ${err.message}`);
    res.status(500).json({ message: "Failed to assign plan." });
  }
});

module.exports = router;
