const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const Application = require("../models/Application");
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
    const academies = await Academy.find().limit(DASHBOARD_FETCH_CAP).lean();
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

    // Video Introductions Queue - strictly candidates who provided a genuine self-introduction video
    const videoIntrosQueue = candidates
      .filter((c) => {
        const s5 = c.stage5 || {};
        const videoUrl = s5.videoUrl || s5.url || s5.fileUrl || s5.videoFileName || "";
        if (!videoUrl || s5.skipped) return false;
        if (c.email && c.email.includes("test.candidate.")) return false;
        if (videoUrl.includes("/samples/") || videoUrl.includes("sample.mp4")) return false;
        return true;
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

    // Performance & Audit Metrics Report Data. monthlyVerifications comes
    // from AuditLog - the real record of every verify action staff have
    // taken - grouped by calendar month, rather than a fabricated trend.
    const verifyActions = ["verify_candidate", "verify_video_intro", "verify_certification"];
    const monthlyVerifyLogs = await AuditLog.find({
      action: { $in: verifyActions },
      createdAt: { $gte: new Date(new Date().getFullYear(), new Date().getMonth() - 4, 1) },
    }).select("createdAt").lean();
    const monthLabels = [];
    const now = new Date();
    for (let i = 4; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      monthLabels.push({ key: `${d.getFullYear()}-${d.getMonth()}`, month: d.toLocaleString("en-US", { month: "short" }) });
    }
    const monthlyVerifications = monthLabels.map(({ key, month }) => {
      const count = monthlyVerifyLogs.filter((log) => {
        const d = new Date(log.createdAt);
        return `${d.getFullYear()}-${d.getMonth()}` === key;
      }).length;
      return { month, count };
    });

    const reportsData = {
      totalCandidates,
      totalCompanies: companies.length,
      totalAcademies: academies.length,
      verifiedCompanies: companies.filter((c) => c.kycStatus === "verified").length,
      pendingCompanies: companies.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
      verifiedCandidates: fullyVerified.length,
      pendingCandidatesCount: pendingCandidates.length,
      placementRate: totalCandidates > 0 ? `${Math.round((fullyVerified.length / totalCandidates) * 100)}%` : "0%",
      monthlyVerifications,
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

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const verifiedTodayCount = await AuditLog.countDocuments({
      action: { $in: verifyActions },
      createdAt: { $gte: todayStart },
    });
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const placedThisMonthCount = candidates.filter(
      (c) => (c.completedStages || []).length >= 8 && c.updatedAt && new Date(c.updatedAt) >= thisMonthStart
    ).length;

    res.json({
      liveQueueCount:
        incomingBucket.length +
        companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length +
        certificationQueue.filter((c) => c.certStatus === "pending").length,
      stats: {
        pendingVerifications: incomingBucket.length + companyKycQueue.filter((c) => c.kycStatus === "under_review").length,
        verifiedToday: verifiedTodayCount,
        activeCandidates: totalCandidates,
        totalAcademies: academies.length,
        placedThisMonth: placedThisMonthCount,
        pendingCompanyKycs: companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
        verifiedCompanies: companyKycQueue.filter((c) => c.kycStatus === "verified").length,
        pendingCertifications: certificationQueue.filter((c) => c.certStatus === "pending").length,
        pendingJobApprovals: 0,
      },
      pipeline,
      incomingBucket,
      companyKycQueue,
      videoIntrosQueue,
      textAssessmentQueue,
      certificationQueue,
      jobApprovalQueue,
      reportsData,
      // Real logged-in staff identity (from requireStaffAuth's Staff
      // lookup) - the sidebar used to show a hardcoded "Anita Reddy" for
      // every staff member regardless of who was actually logged in.
      staffProfile: { name: req.staffName || "", role: req.staffRole || "", badge: req.staffBadge || "" },
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

        try {
          await Notification.create({
            recipientType: "candidate",
            recipientId: String(candidateId),
            title: "Profile Verified & Gold Trust Badge Awarded! 🛡️",
            message: "Talentera Admin has audited and verified your candidate profile. Your Gold Trust Badge is active and visible to employers.",
            type: "kyc_verified",
            meta: { source: "admin", action: "verify_candidate", actionType: "profile", actionLabel: "View Profile" },
          });
        } catch (notifErr) {
          logger.warn(`Candidate notification create failed: ${notifErr.message}`);
        }
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
      // Verified companies do not need separate job approvals
      if (company.jdPublished) {
        company.jdApprovalStatus = "approved";
        company.jdApprovedAt = new Date();
        company.jdApprovedBy = req.staffName || "Auto-Approved (KYC Verified)";
      }
      await Job.updateMany(
        { companyId: company._id },
        { approvalStatus: "approved", approvedAt: new Date(), approvedBy: req.staffName || "Auto-Approved (KYC Verified)" }
      );
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

    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: String(candidateId),
        title: "Assessment Audited by Admin ✅",
        message: note
          ? `Talentera Admin has reviewed and verified your assessment: ${note}`
          : "Talentera Admin has reviewed and verified your clinical assessment.",
        type: "assessment_passed",
        meta: { source: "admin", action: "verify_assessment", actionType: "stage_4", actionLabel: "View Scorecard" },
      });
    } catch (notifErr) {
      logger.warn(`Candidate notification create failed: ${notifErr.message}`);
    }

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

    try {
      if (action === "verify") {
        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidateId),
          title: "Credential Audited & Approved 📜",
          message: `Your ${candidate.stage3?.body?.toUpperCase() || "AAPC"} certification has been audited and approved by the Talentera Admin team.`,
          type: "kyc_verified",
          meta: { source: "admin", action: "verify_certification", actionType: "stage_3", actionLabel: "View Certificate" },
        });
      } else {
        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidateId),
          title: "Credential Revision Requested ⚠️",
          message: `Talentera Admin audit team requested revision for your certification: ${candidate.stage3.certRejectionReason}`,
          type: "kyc_revision",
          meta: { source: "admin", action: "reject_certification", actionType: "stage_3", actionLabel: "Update Certificate" },
        });
      }
    } catch (notifErr) {
      logger.warn(`Candidate notification create failed: ${notifErr.message}`);
    }

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

// POST /api/staff/verify-video - Approve (or send back) a candidate's Stage
// 5 self-introduction video after a staff member actually watches it. This
// is the real gate behind the "Assessment + Video" department view: a
// candidate's video/aiScore is never marked verified just because it was
// uploaded (see candidate.js stage5 save routes), only when staff confirms
// it here. Deliberately scoped to stage5 only - does NOT touch other
// stages or grant a full gold badge (that's the separate, broader
// /verify-candidate action).
router.post("/verify-video", requireStaffAuth, async (req, res) => {
  try {
    const { candidateId, action, notes } = req.body;
    if (!["verify", "reject"].includes(action)) {
      return res.status(400).json({ message: "Action must be \"verify\" or \"reject\"." });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    const s5 = candidate.stage5 || {};
    if (!s5.videoUrl && !s5.url && !s5.fileUrl && !s5.videoFileName) {
      return res.status(400).json({ message: "This candidate has no video introduction to review." });
    }

    if (action === "verify") {
      candidate.stage5 = { ...s5, verified: true, verifiedAt: new Date(), verifiedBy: req.staffName || "" };
    } else {
      candidate.stage5 = { ...s5, verified: false, verifiedAt: null, verifiedBy: "" };
    }
    candidate.markModified("stage5");
    await candidate.save();

    try {
      if (action === "verify") {
        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidateId),
          title: "Video Introduction Approved 🎥",
          message: "Talentera Admin has audited and approved your Stage 5 video introduction.",
          type: "kyc_verified",
          meta: { source: "admin", action: "verify_video", actionType: "stage_5", actionLabel: "View Profile" },
        });
      } else {
        await Notification.create({
          recipientType: "candidate",
          recipientId: String(candidateId),
          title: "Video Introduction Revision Requested ⚠️",
          message: notes
            ? `Talentera Admin requested re-recording of your video: ${notes}`
            : "Your Stage 5 video introduction was sent back for re-recording by Talentera Admin.",
          type: "kyc_revision",
          meta: { source: "admin", action: "reject_video", actionType: "stage_5", actionLabel: "Re-record Video" },
        });
      }
    } catch (notifErr) {
      logger.warn(`Candidate notification create failed: ${notifErr.message}`);
    }

    await recordAudit(req, {
      action: action === "verify" ? "verify_video_intro" : "reject_video_intro",
      targetType: "candidate",
      targetId: candidateId,
      summary: `Stage 5 video introduction for ${candidate.email} ${action === "verify" ? "verified" : "sent back for re-record"} by staff.` + (notes ? ` — ${notes}` : ""),
    });

    res.json({
      message: `Video introduction ${action === "verify" ? "verified" : "sent back for re-record"}.`,
    });
  } catch (err) {
    logger.error(`Verify video error: ${err.message}`);
    res.status(500).json({ message: "Failed to update video verification status." });
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

// ---------------------------------------------------------------------------
// Master Data Directories: Candidates, Companies, and Academies (Full Data)
// ---------------------------------------------------------------------------

// GET /api/staff/candidates - Full Candidate Directory with filter & search
router.get("/candidates", requireStaffAuth, async (req, res) => {
  try {
    const { search, status, academy, limit = 500, page = 1 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      query.$or = [
        { email: regex },
        { mobile: regex },
        { "stage1.fullName": regex },
        { "stage1.mobile": regex },
        { "stage1.city": regex },
        { "stage1.currentRole": regex },
        { "stage2.academyName": regex },
        { "stage2.batch": regex },
        { "stage3.certName": regex },
        { "stage3.name": regex },
      ];
    }

    if (academy && academy.trim()) {
      query["stage2.academyName"] = new RegExp(academy.trim(), "i");
    }

    if (status === "verified") {
      query.completedStages = { $all: [1, 2, 3, 4, 5, 6, 7, 8] };
    } else if (status === "pending") {
      query.$or = [
        { completedStages: { $size: 0 } },
        { completedStages: { $not: { $all: [1, 2, 3, 4, 5, 6, 7, 8] } } },
      ];
    } else if (status === "assessment") {
      query.completedStages = { $in: [4] };
    }

    const maxLimit = Math.min(1000, Math.max(1, Number(limit) || 100));
    const skip = (Math.max(1, Number(page)) - 1) * maxLimit;

    const [rawCandidates, total, applications] = await Promise.all([
      Candidate.find(query)
        .select("-passwordHash")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(maxLimit)
        .lean(),
      Candidate.countDocuments(query),
      Application.find().select("candidateId jobId status createdAt").lean(),
    ]);

    const appsByCand = new Map();
    for (const app of applications) {
      const cid = String(app.candidateId);
      if (!appsByCand.has(cid)) appsByCand.set(cid, []);
      appsByCand.get(cid).push(app);
    }

    const candidates = rawCandidates.map((c) => {
      const cid = String(c._id);
      const candApps = appsByCand.get(cid) || [];
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s3 = c.stage3 || {};
      const s4 = c.stage4 || {};
      const s5 = c.stage5 || {};
      const s6 = c.stage6 || {};
      const s7 = c.stage7 || {};
      const s8 = c.stage8 || {};
      const stages = c.completedStages || [];
      const fullName = toStr(s1.fullName || (c.email ? c.email.split("@")[0] : "Candidate"), "Candidate");

      const applicationMetrics = {
        total: candApps.length,
        applied: candApps.filter((a) => a.status === "applied").length,
        shortlisted: candApps.filter((a) => a.status === "shortlisted").length,
        interviewing: candApps.filter((a) => a.status === "interviewing").length,
        offered: candApps.filter((a) => a.status === "offered" || a.status === "offer_extended").length,
        hired: candApps.filter((a) => a.status === "hired").length,
        rejected: candApps.filter((a) => a.status === "rejected").length,
      };

      return {
        _id: c._id,
        id: c._id,
        email: c.email,
        mobile: c.mobile || s1.mobile || "",
        fullName,
        city: s1.city || "",
        experience: s1.experience || "",
        currentRole: s1.currentRole || s2.domain || "Medical Coder",
        aadhaarVerified: Boolean(s1.aadhaarVerified),
        completedStages: stages,
        isVerified: stages.length >= 8,
        stageProgressPct: Math.round((stages.length / 8) * 100),
        stage1: s1,
        stage2: s2,
        stage3: s3,
        stage4: s4,
        stage5: s5,
        stage6: s6,
        stage7: s7,
        stage8: s8,
        manualResume: c.manualResume || null,
        resumeUrl: c.resumeUrl || null,
        resumeFileName: c.resumeFileName || null,
        resumeTemplate: c.resumeTemplate || "executive",
        applicationsCount: candApps.length,
        applicationMetrics,
        applications: candApps,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      };
    });

    res.json({
      candidates,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / maxLimit),
      verifiedCount: candidates.filter((c) => c.isVerified).length,
      pendingCount: candidates.filter((c) => !c.isVerified).length,
    });
  } catch (err) {
    logger.error(`List candidates error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch candidate directory." });
  }
});

// GET /api/staff/candidates/:id - Get single candidate full top-to-bottom detail & application history
router.get("/candidates/:id", requireStaffAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id).select("-passwordHash").lean();
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const rawApplications = await Application.find({ candidateId: candidate._id })
      .populate("companyId", "companyName email mobile stage1a.legalname stage9 jobId")
      .sort({ createdAt: -1 })
      .lean();

    // Resolve job titles from Job collection or company stage9
    const jobIds = [...new Set(rawApplications.map((a) => a.jobId).filter(Boolean))];
    const postedJobs = jobIds.length > 0 ? await Job.find({ jobId: { $in: jobIds } }).lean() : [];
    const jobTitleMap = new Map();
    for (const pj of postedJobs) {
      jobTitleMap.set(pj.jobId, pj.fields?.roletitle || pj.fields?.roleTitle || pj.fields?.specialty || "Specialist Role");
    }

    const applications = rawApplications.map((app) => {
      const comp = app.companyId || {};
      const resolvedTitle =
        jobTitleMap.get(app.jobId) ||
        (comp.jobId === app.jobId ? comp.stage9?.roletitle : null) ||
        `Role #${app.jobId}`;

      return {
        ...app,
        companyName: comp.companyName || comp.stage1a?.legalname || "Employer",
        companyEmail: comp.email || "",
        companyMobile: comp.mobile || "",
        jobTitle: resolvedTitle,
      };
    });

    const metrics = {
      total: applications.length,
      applied: applications.filter((a) => a.status === "applied").length,
      shortlisted: applications.filter((a) => a.status === "shortlisted").length,
      interviewing: applications.filter((a) => a.status === "interviewing").length,
      offered: applications.filter((a) => a.status === "offered" || a.status === "offer_extended").length,
      hired: applications.filter((a) => a.status === "hired").length,
      rejected: applications.filter((a) => a.status === "rejected").length,
    };

    res.json({
      candidate: {
        ...candidate,
        fullName: candidate.stage1?.fullName || candidate.fullName || (candidate.email ? candidate.email.split("@")[0] : "Candidate"),
        applicationMetrics: metrics,
        applicationsCount: applications.length,
      },
      applications,
      applicationMetrics: metrics,
    });
  } catch (err) {
    logger.error(`Get candidate detail error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch candidate details." });
  }
});

// GET /api/staff/companies - Full Company Directory with plan, KYC & job post details
router.get("/companies", requireStaffAuth, async (req, res) => {
  try {
    const { search, kycStatus, plan, limit = 500, page = 1 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      query.$or = [
        { companyName: regex },
        { email: regex },
        { contactName: regex },
        { mobile: regex },
        { "stage1a.legalname": regex },
        { "stage1a.gstin": regex },
        { "stage1a.pan": regex },
        { "stage1a.regaddress": regex },
        { "stage1b.pocname": regex },
        { "stage1b.pocemail": regex },
      ];
    }

    if (kycStatus && kycStatus.trim()) {
      query.kycStatus = kycStatus.trim();
    }

    if (plan && plan.trim()) {
      query.plan = plan.trim();
    }

    const maxLimit = Math.min(1000, Math.max(1, Number(limit) || 100));
    const skip = (Math.max(1, Number(page)) - 1) * maxLimit;

    const [rawCompanies, total, jobs, applications] = await Promise.all([
      Company.find(query)
        .select("-passwordHash")
        .sort({ updatedAt: -1, createdAt: -1 })
        .skip(skip)
        .limit(maxLimit)
        .lean(),
      Company.countDocuments(query),
      Job.find().lean(),
      Application.find()
        .populate("candidateId", "email mobile stage1 stage4 stage7 resumeUrl resumeFileName completedStages manualResume")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const jobsByComp = new Map();
    for (const job of jobs) {
      const cid = String(job.companyId);
      if (!jobsByComp.has(cid)) jobsByComp.set(cid, []);
      jobsByComp.get(cid).push(job);
    }

    const appsByComp = new Map();
    for (const app of applications) {
      const cid = String(app.companyId);
      if (!appsByComp.has(cid)) appsByComp.set(cid, []);
      appsByComp.get(cid).push(app);
    }

    const companies = rawCompanies.map((comp) => {
      const cid = String(comp._id);
      const compJobs = jobsByComp.get(cid) || [];
      const compApps = appsByComp.get(cid) || [];
      const s1a = comp.stage1a || {};
      const s1b = comp.stage1b || {};
      const s2 = comp.stage2 || {};
      const s9 = comp.stage9 || {};

      const jobTitleByJobId = {};
      if (comp.jdPublished && comp.jobId) {
        jobTitleByJobId[comp.jobId] = s9.roletitle || "Onboarding Job Requisition";
      }
      for (const j of compJobs) {
        jobTitleByJobId[j.jobId] = (j.fields || {}).roletitle || (j.fields || {}).jobTitle || "Job Requisition";
      }

      const formattedApps = compApps.map((app) => {
        const cand = app.candidateId || null;
        const s1 = cand?.stage1 || {};
        const s4 = cand?.stage4 || {};
        const s7 = cand?.stage7 || {};
        const mr = cand?.manualResume || {};
        const fullName = s1.fullName || mr.fullName || (cand ? `Candidate #${String(cand._id || cand.id).slice(-4)}` : `Applicant #${String(app._id || app.id).slice(-4)}`);
        const email = cand?.email || "N/A";
        const mobile = s1.mobile || mr.mobile || cand?.mobile || "N/A";
        const city = s1.city || mr.location || "India";
        const experience = s1.experience || mr.experience || "N/A";
        const currentRole = s1.currentRole || mr.currentRole || "Medical Coding";
        const jobTitle = jobTitleByJobId[app.jobId] || s9.roletitle || `Role #${app.jobId}`;
        const mcqScore = s4.score !== undefined ? `${s4.score}%` : null;
        const resumeUrl = cand?.resumeUrl || s7.resumeUrl || null;

        return {
          _id: app._id,
          id: app._id,
          jobId: app.jobId,
          jobTitle,
          status: app.status || "applied",
          coverNote: app.coverNote || "",
          createdAt: app.createdAt,
          updatedAt: app.updatedAt,
          candidate: {
            _id: cand?._id || app.candidateId,
            id: cand?._id || app.candidateId,
            email,
            fullName,
            mobile,
            city,
            experience,
            currentRole,
            completedStages: cand?.completedStages || [],
            mcqScore,
            resumeUrl,
            rawCandidate: cand,
          },
        };
      });

      return {
        _id: comp._id,
        id: comp._id,
        companyName: comp.companyName || s1a.legalname || "Unnamed Company",
        legalName: s1a.legalname || "Not provided",
        contactName: comp.contactName || s1b.pocname || "N/A",
        email: comp.email,
        mobile: comp.mobile || s1b.pocmobile || "N/A",
        plan: comp.plan || "free",
        planAssignedAt: comp.planAssignedAt || null,
        planAssignedBy: comp.planAssignedBy || "",
        kycStatus: comp.kycStatus || "pending",
        kycSubmittedAt: comp.kycSubmittedAt || null,
        kycVerifiedAt: comp.kycVerifiedAt || null,
        kycNotes: comp.kycNotes || "",
        kycRejectionReason: comp.kycRejectionReason || "",
        docVerifications: comp.docVerifications || {},
        rejectedKycFields: comp.rejectedKycFields || [],
        completedStages: comp.completedStages || [],
        stage1a: s1a,
        stage1b: s1b,
        stage2: s2,
        stage3: comp.stage3 || {},
        stage4: comp.stage4 || {},
        stage5: comp.stage5 || {},
        stage6: comp.stage6 || {},
        stage7: comp.stage7 || {},
        stage8: comp.stage8 || {},
        stage9: s9,
        intakeNotes: comp.intakeNotes || null,
        jdPublished: Boolean(comp.jdPublished),
        jobId: comp.jobId || null,
        jdPublishedAt: comp.jdPublishedAt || null,
        jdApprovalStatus: comp.jdApprovalStatus || "pending",
        jdApprovedAt: comp.jdApprovedAt || null,
        jdApprovedBy: comp.jdApprovedBy || "",
        jdRejectionReason: comp.jdRejectionReason || "",
        jobs: compJobs,
        jobsCount: compJobs.length + (comp.jdPublished ? 1 : 0),
        applications: formattedApps,
        applicationsCount: formattedApps.length,
        createdAt: comp.createdAt,
        updatedAt: comp.updatedAt,
      };
    });

    res.json({
      companies,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / maxLimit),
      verifiedCount: companies.filter((c) => c.kycStatus === "verified").length,
      pendingKycCount: companies.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
    });
  } catch (err) {
    logger.error(`List companies error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch company directory." });
  }
});

// GET /api/staff/companies/:id - Get single company full detail with all posted jobs and applicants
router.get("/companies/:id", requireStaffAuth, async (req, res) => {
  try {
    const company = await Company.findById(req.params.id).select("-passwordHash").lean();
    if (!company) return res.status(404).json({ message: "Company not found." });

    const [jobs, applications] = await Promise.all([
      Job.find({ companyId: company._id }).sort({ createdAt: -1 }).lean(),
      Application.find({ companyId: company._id })
        .populate("candidateId", "email mobile stage1 stage2 stage3 stage4 stage5 stage6 stage7 stage8 resumeUrl resumeFileName completedStages manualResume")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    const jobTitleByJobId = {};
    if (company && company.jdPublished && company.jobId) {
      jobTitleByJobId[company.jobId] = (company.stage9 || {}).roletitle || "Onboarding Job Requisition";
    }
    for (const job of jobs) {
      jobTitleByJobId[job.jobId] = (job.fields || {}).roletitle || (job.fields || {}).jobTitle || "Job Requisition";
    }

    const formattedApplications = applications.map((app) => {
      const candidate = app.candidateId || null;
      const s1 = candidate?.stage1 || {};
      const s4 = candidate?.stage4 || {};
      const s7 = candidate?.stage7 || {};
      const mr = candidate?.manualResume || {};
      const fullName = s1.fullName || mr.fullName || (candidate ? `Candidate #${String(candidate._id || candidate.id).slice(-4)}` : `Applicant #${String(app._id || app.id).slice(-4)}`);
      const email = candidate?.email || "N/A";
      const mobile = s1.mobile || mr.mobile || candidate?.mobile || "N/A";
      const city = s1.city || mr.location || "India";
      const experience = s1.experience || mr.experience || "N/A";
      const currentRole = s1.currentRole || mr.currentRole || "Medical Coding";
      const jobTitle = jobTitleByJobId[app.jobId] || (company.stage9 || {}).roletitle || `Role #${app.jobId}`;
      const mcqScore = s4.score !== undefined ? `${s4.score}%` : null;
      const resumeUrl = candidate?.resumeUrl || s7.resumeUrl || null;

      return {
        _id: app._id,
        id: app._id,
        jobId: app.jobId,
        jobTitle,
        status: app.status || "applied",
        coverNote: app.coverNote || "",
        createdAt: app.createdAt,
        updatedAt: app.updatedAt,
        candidate: {
          _id: candidate?._id || app.candidateId,
          id: candidate?._id || app.candidateId,
          email,
          fullName,
          mobile,
          city,
          experience,
          currentRole,
          completedStages: candidate?.completedStages || [],
          mcqScore,
          resumeUrl,
          rawCandidate: candidate,
        },
      };
    });

    res.json({
      company,
      jobs,
      applications: formattedApplications,
      applicationsCount: formattedApplications.length,
    });
  } catch (err) {
    logger.error(`Get company detail error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch company details." });
  }
});

// PUT /api/staff/applications/:id/status - Staff update candidate application status
router.put("/applications/:id/status", requireStaffAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ["applied", "shortlisted", "interviewing", "hired", "rejected"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ message: "Invalid application status." });
    }
    const app = await Application.findById(req.params.id).populate("companyId", "companyName");
    if (!app) return res.status(404).json({ message: "Application not found." });
    app.status = status;
    await app.save();

    try {
      const companyName = app.companyId?.companyName || "Employer";
      const roleTitle = app.jobTitle || "Role";
      let notifTitle = `Application Status: ${companyName}`;
      let notifMsg = `Your application for "${roleTitle}" at ${companyName} has been updated to "${status}".`;
      let notifType = "application_update";

      if (status === "shortlisted") {
        notifTitle = `Shortlisted by ${companyName}! 🎯`;
        notifMsg = `Great news! Your application for "${roleTitle}" has been shortlisted.`;
        notifType = "application_shortlisted";
      } else if (status === "interviewing") {
        notifTitle = `Interview Scheduled with ${companyName} 📅`;
        notifMsg = `An interview has been scheduled with ${companyName} for "${roleTitle}".`;
        notifType = "interview_scheduled";
      } else if (status === "hired") {
        notifTitle = `Job Offer from ${companyName}! 🎉`;
        notifMsg = `Congratulations! You have received a formal offer from ${companyName} for "${roleTitle}".`;
        notifType = "offer_received";
      }

      await Notification.create({
        recipientType: "candidate",
        recipientId: String(app.candidateId),
        title: notifTitle,
        message: notifMsg,
        type: notifType,
        meta: {
          source: "company",
          companyName,
          applicationId: String(app._id),
          actionType: "applications",
          actionLabel: "View in Applications",
        },
      });
    } catch (notifErr) {
      logger.warn(`Candidate notification create failed: ${notifErr.message}`);
    }

    res.json({ message: `Application status updated to ${status}.`, application: app });
  } catch (err) {
    logger.error(`Update application status error: ${err.message}`);
    res.status(500).json({ message: "Failed to update application status." });
  }
});

// GET /api/staff/academies - Full Academy Directory with courses, batches, and candidate enrollments
router.get("/academies", requireStaffAuth, async (req, res) => {
  try {
    const { search, limit = 500, page = 1 } = req.query;
    const query = {};

    if (search && search.trim()) {
      const q = search.trim();
      const regex = new RegExp(q, "i");
      query.$or = [
        { name: regex },
        { email: regex },
        { contactName: regex },
        { primaryAdmin: regex },
        { phone: regex },
        { specialty: regex },
        { headquarters: regex },
        { branches: regex },
      ];
    }

    const maxLimit = Math.min(1000, Math.max(1, Number(limit) || 100));
    const skip = (Math.max(1, Number(page)) - 1) * maxLimit;

    const [rawAcademies, total, batches, candidates] = await Promise.all([
      Academy.find(query).sort({ updatedAt: -1, createdAt: -1 }).skip(skip).limit(maxLimit).lean(),
      Academy.countDocuments(query),
      AcademyBatch.find().sort({ createdAt: -1 }).lean(),
      Candidate.find({ "stage2.academyName": { $exists: true } })
        .select("_id email stage1 stage2 completedStages createdAt")
        .lean(),
    ]);

    const batchesByAcademy = new Map();
    for (const b of batches) {
      const aid = String(b.academyId);
      if (!batchesByAcademy.has(aid)) batchesByAcademy.set(aid, []);
      batchesByAcademy.get(aid).push(b);
    }

    const studentsByAcademy = new Map();
    for (const cand of candidates) {
      const s2 = cand.stage2 || {};
      const aid = s2.academyId ? String(s2.academyId) : null;
      const aname = s2.academyName ? String(s2.academyName).trim().toLowerCase() : null;

      if (aid) {
        if (!studentsByAcademy.has(aid)) studentsByAcademy.set(aid, []);
        studentsByAcademy.get(aid).push(cand);
      }
      if (aname) {
        if (!studentsByAcademy.has(aname)) studentsByAcademy.set(aname, []);
        studentsByAcademy.get(aname).push(cand);
      }
    }

    const academies = rawAcademies.map((ac) => {
      const aid = String(ac._id);
      const acBatches = batchesByAcademy.get(aid) || [];
      const acCandidates = studentsByAcademy.get(aid) || studentsByAcademy.get(ac.name.trim().toLowerCase()) || [];

      return {
        _id: ac._id,
        id: ac._id,
        name: ac.name,
        email: ac.email,
        contactName: ac.contactName || "Academy Partner",
        primaryAdmin: ac.primaryAdmin || "N/A",
        phone: ac.phone || "+91 9765435676",
        specialty: ac.specialty || "Medical Coding",
        headquarters: ac.headquarters || "Coimbatore",
        branches: ac.branches || [],
        tier: ac.tier || "Verified Partner",
        totalAlumni: ac.totalAlumni || "35,000+",
        partnerSince: ac.partnerSince || "Jan 2025",
        studentsUploaded: ac.studentsUploaded || acCandidates.length,
        verifiedPct: ac.verifiedPct || 94,
        courses: ac.courses || [],
        coursesCount: (ac.courses || []).length,
        questions: ac.questions || [],
        questionsCount: (ac.questions || []).length,
        placements: ac.placements || [],
        placementsCount: (ac.placements || []).length,
        batches: acBatches,
        batchesCount: acBatches.length,
        enrolledCandidatesCount: acCandidates.length,
        candidates: acCandidates,
        createdAt: ac.createdAt,
        updatedAt: ac.updatedAt,
      };
    });

    res.json({
      academies,
      total,
      page: Number(page),
      totalPages: Math.ceil(total / maxLimit),
      totalBatches: batches.length,
    });
  } catch (err) {
    logger.error(`List academies error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch academy directory." });
  }
});

// GET /api/staff/academies/:id - Get single academy full detail with all batches and registered candidates
router.get("/academies/:id", requireStaffAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.params.id).lean();
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const [batches, students] = await Promise.all([
      AcademyBatch.find({ academyId: academy._id }).sort({ createdAt: -1 }).lean(),
      Candidate.find({
        $or: [
          { "stage2.academyId": String(academy._id) },
          { "stage2.academyName": academy.name },
        ],
      })
        .select("-passwordHash")
        .sort({ createdAt: -1 })
        .lean(),
    ]);

    res.json({
      academy,
      batches,
      students,
    });
  } catch (err) {
    logger.error(`Get academy detail error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch academy details." });
  }
});

module.exports = router;
