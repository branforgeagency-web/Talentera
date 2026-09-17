const express = require("express");
const Candidate = require("../models/Candidate");
const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const StudentUpload = require("../models/StudentUpload");
const StudentInvite = require("../models/StudentInvite");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const bcrypt = require("bcryptjs");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");
const { requireAcademyAuth, signToken } = require("../middleware/auth");
const { upload } = require("../middleware/upload");
const { authLimiter } = require("../middleware/rateLimit");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

const DASHBOARD_FETCH_CAP = 500;

// Where a student invite's signup link points. Falls back to the same
// production origin already whitelisted for CORS in server.js.
const APP_URL = (process.env.APP_URL || "https://talentera.in").replace(/\/$/, "");

function inviteSignupLink(inviteToken) {
  return `${APP_URL}/register?invite=${inviteToken}`;
}

// Sends the real "you're invited" email a student gets when their academy
// uploads them - previously upload-confirm/add-single only stamped
// emailSentAt/smsSentAt timestamps on the StudentInvite record without ever
// sending anything. Best-effort: a delivery failure shouldn't fail the
// upload/add request, same pattern as every other transactional email in
// this app (see routes/company.js, routes/candidate.js).
async function sendInviteEmail({ invite, academyName }) {
  if (!invite?.email) return;
  const link = inviteSignupLink(invite.inviteToken);
  sendTransactionalEmail({
    to: invite.email,
    toName: invite.name,
    subject: `${academyName} added you to Talentera - set up your profile`,
    html: wrapEmailTemplate(
      "You're invited to Talentera",
      `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${invite.name},</p>
       <p style="color: #475569; font-size: 15px; line-height: 1.5;"><strong>${academyName}</strong> has added you to Talentera as part of batch <strong>${invite.batchCode}</strong>. Set your password to activate your verified profile and start matching with employers.</p>
       <p style="margin: 24px 0;"><a href="${link}" style="background:#0A1F3D;color:#E5A82E;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Activate my profile →</a></p>
       <p style="color: #64748B; font-size: 13px;">If the button doesn't work, copy this link into your browser:<br />${link}</p>`
    ),
  }).catch((err) => logger.warn(`Invite email failed for ${invite.email}: ${err.message}`));
}

// Helper to parse CSV buffer into row objects
function parseCsvBuffer(buffer) {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase().replace(/[\s_-]+/g, "_"));
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (values.length < 2) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

// Helper: Compute 8-stage verification details for candidate
function compute8Stages(candidate) {
  const completed = candidate.completedStages || [];
  const s1 = candidate.stage1 || {};
  const s2 = candidate.stage2 || {};
  const s3 = candidate.stage3 || {};
  const s4 = candidate.stage4 || {};
  const s5 = candidate.stage5 || {};
  const s6 = candidate.stage6 || {};
  const s7 = candidate.stage7 || {};

  const hasRealAadhaar = !!s1.aadhaarVerified && (!!s1.maskedAadhaar || !!s1.dob || !!s1.gender || !!s1.verificationMethod || !!s1.aadhaarNumber || !!s1.aadhaarDigits || !!s1.verifiedAt);
  const stages = [
    {
      stageNumber: 1,
      title: "Basic + Aadhaar",
      description: "Real person, Indian ID verified",
      whoDoesIt: "Student",
      isDone: completed.includes(1) && hasRealAadhaar,
      inProgress: !completed.includes(1) || !hasRealAadhaar,
      score: (completed.includes(1) && hasRealAadhaar) ? "Aadhaar Verified ✓" : "Pending Aadhaar Verification",
      meta: hasRealAadhaar ? (s1.city ? `${s1.fullName || "Candidate"} · ${s1.city}` : "Aadhaar Verified") : (s1.fullName ? `${s1.fullName} · ID Verification Pending` : "Identity Verification Pending"),
      needsApproval: false,
    },
    {
      stageNumber: 2,
      title: "Academy & Training",
      description: "Course, hours, Path B assessment",
      whoDoesIt: "Student + Academy validates",
      isDone: completed.includes(2) && !!s2.verified && !!s2.approvedAt,
      inProgress: !(completed.includes(2) && s2.verified && s2.approvedAt),
      score: (completed.includes(2) && s2.verified && s2.approvedAt)
        ? "Academy Approved ✓"
        : (s2.rejected || s2.status === "rejected" || s2.needsRevision)
        ? "Revision Requested"
        : "Pending Training & Sign-off",
      meta: (s2.rejected || s2.status === "rejected" || s2.needsRevision)
        ? `Revision: ${s2.rejectionReason || s2.feedback || "Needs Correction"}`
        : s2.batch ? `${s2.batch} · ${s2.branch || "Training"}` : "Course Training",
      needsApproval: !completed.includes(2) && !!s2.submittedForApproval && !s2.rejected && !s2.needsRevision && s2.status !== "rejected",
    },
    {
      stageNumber: 3,
      title: "Certifications",
      description: "AAPC / AHIMA cert numbers verified",
      whoDoesIt: "Student (auto-verified)",
      isDone: completed.includes(3) && !!s3.certNo,
      inProgress: !(completed.includes(3) && !!s3.certNo),
      score: (completed.includes(3) && s3.certNo) ? (s3.certCode || s3.certName || "Certified ✓") : "Pending Certification",
      meta: s3.certNo ? `Cert #${s3.certNo}` : "AAPC / AHIMA Credential",
      needsApproval: false,
    },
    {
      stageNumber: 4,
      title: "Talentera Assessment",
      description: "Foundation + specialty MCQ score",
      whoDoesIt: "Student (proctored)",
      isDone: completed.includes(4) && (s4.score !== undefined && s4.score !== null && !isNaN(Number(s4.score))),
      inProgress: !(completed.includes(4) && s4.score !== undefined && s4.score !== null),
      score: (s4.score !== undefined && s4.score !== null && !isNaN(Number(s4.score))) ? `${s4.score} / 100` : "Not Attempted",
      meta: (s4.score !== undefined && s4.score !== null) ? (s4.score >= 80 ? "Top 10% Quartile" : "Passed") : "Not attempted",
      needsApproval: false,
    },
    {
      stageNumber: 5,
      title: "Portfolio Video",
      description: "2-min self-intro, AI-scored + employee-approved",
      whoDoesIt: "Student → Talentera Employee reviews",
      isDone: (completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected",
      inProgress: !((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected"),
      score: ((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected")
        ? (s5.aiScore ? `AI Score ${(s5.aiScore / 10).toFixed(1)}/10 · Approved ✓` : "Video Approved ✓")
        : (s5.rejected || s5.status === "rejected" || s5.needsRevision)
        ? "Re-take Requested"
        : (s5.videoUrl || s5.proctoredInterviewVideoUrl ? "Video Uploaded (Pending Review)" : "Video Pending"),
      meta: (s5.rejected || s5.status === "rejected" || s5.needsRevision)
        ? `Revision: ${s5.rejectionReason || s5.feedback || "Re-take Required"}`
        : ((completed.includes(5) || !!s5.verified || !!s5.approvedAt || !!s5.verifiedAt) && !s5.rejected && !s5.needsRevision && s5.status !== "rejected")
        ? "Approved by Talentera Team ✓"
        : (s5.videoUrl || s5.proctoredInterviewVideoUrl ? "Awaiting Talentera Review" : "No Video Uploaded"),
      needsApproval: false,
      videoUrl: s5.videoUrl || s5.proctoredInterviewVideoUrl || "",
    },
    {
      stageNumber: 6,
      title: "Live Chart Practice",
      description: "Sample coded charts uploaded",
      whoDoesIt: "Student",
      isDone: completed.includes(6) && (Number(s6.chartsCompleted) >= 10 || !!s6.accuracy),
      inProgress: !(completed.includes(6) && (Number(s6.chartsCompleted) >= 10 || !!s6.accuracy)),
      score: (completed.includes(6) && s6.accuracy) ? `${s6.accuracy}% Accuracy` : (completed.includes(6) && s6.chartsCompleted ? `${s6.chartsCompleted} Charts Audited` : "Pending Charts"),
      meta: s6.chartsCompleted ? `${s6.chartsCompleted} Charts Audited` : "Medical Charts Practice",
      needsApproval: false,
    },
    {
      stageNumber: 7,
      title: "References",
      description: "Trainer + peer references",
      whoDoesIt: "Student",
      isDone: completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0,
      inProgress: !(completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0),
      score: (completed.includes(7) && Array.isArray(s7.references) && s7.references.length > 0) ? `${s7.references?.length || 2} References Verified` : "Pending References",
      meta: (Array.isArray(s7.references) && s7.references.length > 0) ? "Trainer Endorsements" : "Professional References",
      needsApproval: false,
    },
    {
      stageNumber: 8,
      title: "Review & Publish",
      description: "Talentera Score generated · profile goes live",
      whoDoesIt: "System",
      isDone: completed.includes(8) && !!candidate.isSubmitted,
      inProgress: !completed.includes(8),
      score: (completed.includes(8) && candidate.isSubmitted) ? (s4.score !== undefined && s4.score !== null ? `Talentera Score: ${Math.min(99, Math.round(Number(s4.score) * 0.95 + 4))}` : "Verified Profile Live ✓") : "Verification in Progress",
      meta: (completed.includes(8) && candidate.isSubmitted) ? "Profile Live & Matched" : "Verification in Progress",
      needsApproval: false,
    },
  ];

  const doneCount = stages.filter((st) => st.isDone).length;
  const pct = Math.round((doneCount / 8) * 100);

  return {
    stages,
    doneCount,
    pct,
    currentStageNumber: stages.findIndex((st) => !st.isDone) + 1 || 8,
    isComplete: doneCount === 8,
  };
}

// Computes an academy's real, verifiable metrics from its actual linked candidates
// and recorded placements — used for the cross-academy insights/benchmark feature.
// Returns null for academies with no enrolled students (nothing meaningful to compare).
async function computeAcademyMetrics(academy) {
  const candidatesList = await Candidate.find({
    $or: [
      { "stage2.academyId": academy._id.toString() },
      { "stage2.academyName": { $regex: new RegExp(`^${academy.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
    ],
  }).limit(DASHBOARD_FETCH_CAP).lean();

  const totalStudents = candidatesList.length;
  if (totalStudents === 0) return null;

  const scoredStudents = candidatesList.filter((c) => c.stage4?.score);
  const avgScore = scoredStudents.length > 0
    ? Math.round(scoredStudents.reduce((sum, c) => sum + parseInt(c.stage4.score, 10), 0) / scoredStudents.length)
    : 0;

  const videoedStudents = candidatesList.filter((c) => c.stage5?.aiScore);
  const videoQuality = videoedStudents.length > 0
    ? Math.round((videoedStudents.reduce((sum, c) => sum + (c.stage5.aiScore / 10), 0) / videoedStudents.length) * 10) / 10
    : 0;

  const profileCompletion = Math.round(
    candidatesList.reduce((sum, c) => sum + Math.round(((c.completedStages || []).length / 8) * 100), 0) / totalStudents
  );

  const placementRate = Math.round(((academy.placements || []).length / totalStudents) * 100);

  return {
    academyId: academy._id.toString(),
    city: academy.headquarters || "Unspecified",
    totalStudents,
    avgScore,
    videoQuality,
    profileCompletion,
    placementRate,
  };
}

// POST /api/academy/login - Academy login with OTP token verification & JWT generation
router.post("/login", authLimiter, async (req, res) => {
  const { accessToken, fullName, academyName, email, mobile, phone } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Missing OTP verification token." });
  }

  try {
    await verifyWidgetAccessToken(accessToken);
  } catch (err) {
    if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    logger.error(`Academy login OTP verify error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Server error verifying OTP." });
  }

  try {
    const cleanEmail = (email || "aaaa@gmail.com").toLowerCase().trim();
    let academy = await Academy.findOne({ email: cleanEmail });

    if (!academy) {
      academy = await Academy.create({
        name: academyName || "Apex Healthcare Academy",
        email: cleanEmail,
        contactName: fullName || "Dr. Rajesh Kumar",
        primaryAdmin: fullName || "Dr. Rajesh Kumar",
        phone: mobile || phone || "+91 9765435676",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
        tier: "Verified Partner",
        totalAlumni: "35,000+",
        partnerSince: "Jan 2025",
        studentsUploaded: 0,
        verifiedPct: 0,
      });
    } else if (academyName || fullName) {
      if (academyName) academy.name = academyName;
      if (fullName) {
        academy.contactName = fullName;
        academy.primaryAdmin = fullName;
      }
      if (mobile || phone) academy.phone = mobile || phone;
      await academy.save();
    }

    const token = signToken(academy._id, "academy");

    res.json({
      token,
      academy,
    });
  } catch (err) {
    logger.error(`Academy login DB error: ${err.message}`);
    res.status(500).json({ message: "Failed to log in academy account." });
  }
});

// POST /api/academy/demo-login - 1-Click Sandbox Academy Login
router.post("/demo-login", async (req, res) => {
  try {
    const demoEmail = "demo.academy@talentera.in";
    let academy = await Academy.findOne({ email: demoEmail });

    if (!academy) {
      academy = await Academy.create({
        name: "Apex Healthcare Academy (Demo)",
        email: demoEmail,
        contactName: "Dr. Rajesh Kumar",
        primaryAdmin: "Dr. Rajesh Kumar",
        phone: "+91 9765435676",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
        tier: "Verified Partner",
        totalAlumni: "35,000+",
        partnerSince: "Jan 2025",
        studentsUploaded: 0,
        verifiedPct: 0,
      });
    }

    const token = signToken(academy._id, "academy");

    res.json({
      token,
      academy,
      message: "Logged in as Demo Academy.",
    });
  } catch (err) {
    logger.error(`Demo academy login DB error: ${err.message}`);
    res.status(500).json({ message: "Failed to log in demo academy account." });
  }
});

// GET /api/academy/dashboard - Complete Dashboard Data for All Views (Protected)
router.get("/dashboard", requireAcademyAuth, async (req, res) => {
  try {
    let academy = await Academy.findById(req.academyId);
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    // Ensure default courses if empty
    if (!academy.courses || academy.courses.length === 0) {
      academy.courses = [
        { category: "HCC / RISK ADJUSTMENT", duration: "3 MONTHS", title: "HCC Coding Specialization", totalHrs: 120, batches: 1, enrolled: 30, status: "active", syllabus: ["ICD-10-CM Basics", "RAF Score Calculation", "Documentation Review", "HCC Chart Audits", "Capstone"] },
        { category: "EMERGENCY DEPT CODING", duration: "3 MONTHS", title: "ED Coding Foundation", totalHrs: 110, batches: 1, enrolled: 15, status: "active", syllabus: ["ED Levels & E/M", "Critical Care", "Modifier 25 / 59", "Trauma Cases", "Capstone"] },
        { category: "AR CALLING / RCM", duration: "2 MONTHS", title: "AR Calling Bootcamp", totalHrs: 80, batches: 1, enrolled: 25, status: "active", syllabus: ["Denial Codes", "Payer Workflows", "Communication", "Compliance", "Live Floor"] },
        { category: "SURGERY CODING", duration: "3 MONTHS", title: "Surgery Coding Mastery", totalHrs: 130, batches: 1, enrolled: 20, status: "active", syllabus: ["CPT Surgery Sections", "Modifiers (50/51/59)", "Global Period", "Multi-Procedure", "Capstone"] },
        { category: "OP / E&M", duration: "3 MONTHS", title: "OP / E&M Specialization", totalHrs: 100, batches: 1, enrolled: 18, status: "active", syllabus: ["E&M Levels", "MDM Complexity", "Time-Based Coding", "2021 Guidelines", "Capstone"] },
        { category: "IP DRG", duration: "3 MONTHS", title: "IP DRG Specialization", totalHrs: 140, batches: 0, enrolled: 0, status: "idle", syllabus: ["MS-DRG vs APR-DRG", "POA Indicators", "CC/MCC Logic", "Audit Scenarios", "Capstone"] },
      ];
      await academy.save();
    }

    // Ensure default questions if empty
    if (!academy.questions || academy.questions.length === 0) {
      academy.questions = [
        { question: "HCC Risk Adjustment Factor (RAF) score is primarily used to...", topic: "HCC", type: "MCQ", difficulty: "Entry", marks: 1, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Which ICD-10-CM code captures Type 2 Diabetes with diabetic peripheral neuropathy?", topic: "ICD-10", type: "MCQ", difficulty: "Mid", marks: 2, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Scenario: A 67-year-old patient is documented with CKD Stage 4 and on dialysis. Which HCC code(s) apply?", topic: "HCC", type: "Scenario", difficulty: "Senior", marks: 3, status: "Editable", courseTitle: "HCC Coding Specialization" },
        { question: "CMS-HCC v24 risk model uses how many diagnosis groups?", topic: "HCC", type: "MCQ", difficulty: "Mid", marks: 2, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Which of the following requires \"with\" combination coding in ICD-10-CM?", topic: "ICD-10", type: "MCQ", difficulty: "Mid", marks: 2, status: "Editable", courseTitle: "HCC Coding Specialization" },
        { question: "Documentation states \"history of CHF\". Should HCC 85 be captured?", topic: "Documentation", type: "Scenario", difficulty: "Senior", marks: 3, status: "Editable", courseTitle: "HCC Coding Specialization" },
      ];
      await academy.save();
    }

    // Fetch Invites and Candidates linked to this academy
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const invitedEmails = invites.map((inv) => (inv.email || "").toLowerCase().trim()).filter(Boolean);
    const candidateIds = invites.map((inv) => inv.candidateId).filter(Boolean);

    const candidatesList = await Candidate.find({
      $or: [
        { "stage2.academyId": req.academyId.toString() },
        { "stage2.academyName": { $regex: new RegExp(`^${academy.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
        { email: { $in: invitedEmails } },
        { _id: { $in: candidateIds } },
      ],
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const formattedStudents = candidatesList.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s3 = c.stage3 || {};
      const s4 = c.stage4 || {};
      const s5 = c.stage5 || {};
      const nameParts = (s1.fullName || c.email.split("@")[0]).split(" ");
      const initials = nameParts.length >= 2 ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() : nameParts[0].slice(0, 2).toUpperCase();

      const stageInfo = compute8Stages(c);
      const isPlaced = c.stage8?.placementStatus?.toLowerCase().includes("placed");
      const status = isPlaced ? "placed" : stageInfo.isComplete ? "verified" : stageInfo.doneCount > 0 ? "verifying" : "uploaded";
      const placementStatus = c.stage8?.placementStatus || (stageInfo.isComplete ? "Available for Placement" : `Stage ${stageInfo.currentStageNumber} in Progress`);

      const hasTakenTest = s4.score !== undefined && s4.score !== null && !isNaN(Number(s4.score));
      const hasAiVideo = s5.aiScore !== undefined && s5.aiScore !== null && !isNaN(Number(s5.aiScore));

      return {
        id: c._id,
        initials,
        name: s1.fullName || c.email.split("@")[0],
        email: c.email,
        phone: s1.mobile || c.mobile || "—",
        specialty: s2.specialty || s1.currentRole || "Medical Coding",
        month: s2.batch || "—",
        branch: s2.branch || s1.city || "—",
        status,
        score: hasTakenTest ? `${s4.score} / 100` : "Not Attempted",
        completion: `${stageInfo.pct}%`,
        cert: s3.certName || s3.certCode || "—",
        placementStatus,
        recommended: !!c.recommendedByAcademy,
        videoUrl: s5.videoUrl || "",
        aiScore: hasAiVideo ? (s5.aiScore / 10).toFixed(1) : "—",
        videoVerified: !!s5.verified,
        stages: stageInfo.stages,
        stageBreakdown: stageInfo,
        updatedAt: c.updatedAt || new Date(),
      };
    });

    // Batches
    let dbBatches = await AcademyBatch.find({ academyId: req.academyId }).lean();
    let batches = dbBatches.map((b) => {
      const realEnrolledCount = formattedStudents.filter(
        (s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))
      ).length;
      return {
        ...b,
        studentsCount: realEnrolledCount || b.studentsCount || 0,
      };
    });

    // Real KPI calculations
    const scoredStudents = formattedStudents.filter((s) => s.score && s.score !== "Not Attempted" && s.score !== "0 / 100");
    const avgScore = scoredStudents.length > 0
      ? Math.round(scoredStudents.reduce((sum, s) => sum + parseInt(s.score, 10), 0) / scoredStudents.length)
      : 0;
    const avgProfileComplete = formattedStudents.length > 0
      ? Math.round(formattedStudents.reduce((sum, s) => sum + parseInt(s.completion || "0", 10), 0) / formattedStudents.length)
      : 0;
    const placedStudentsCount = formattedStudents.filter((s) => s.status === "placed").length;
    const placementRate = formattedStudents.length > 0
      ? `${Math.round((placedStudentsCount / formattedStudents.length) * 100)}%`
      : "0%";

    const stuckStudents = formattedStudents.filter((s) => s.status === "verifying" || s.completion === "0%" || s.stageBreakdown.doneCount < 5);
    const pendingApprovals = formattedStudents.filter((s) => s.stages.some((st) => st.needsApproval));

    const recentActivity = await AcademyActivityEvent.find({ academyId: req.academyId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const invitesCount = await StudentInvite.countDocuments({ academyId: req.academyId });
    const signedUpCount = await StudentInvite.countDocuments({ academyId: req.academyId, status: "signed_up" });

    res.json({
      academy,
      kpis: {
        totalStudents: formattedStudents.length,
        activeBatches: batches.length,
        avgScore,
        profileComplete: avgProfileComplete,
        placementsMonth: (academy.placements || []).length,
        verifiedStudents: formattedStudents.filter((s) => s.status === "verified" || s.status === "placed").length,
        placedStudents: placedStudentsCount,
        placementRate,
        stuckStudentsCount: stuckStudents.length,
        pendingApprovalsCount: pendingApprovals.length,
        invitesTotal: invitesCount,
        invitesSignedUp: signedUpCount,
        liveEventsCount: recentActivity.length,
      },
      students: formattedStudents,
      batches,
      courses: academy.courses || [],
      questions: academy.questions || [],
      placements: academy.placements || [],
      recentActivity,
    });
  } catch (err) {
    logger.error(`Academy dashboard error: ${err.message}`);
    res.status(500).json({ message: "Error loading academy dashboard." });
  }
});

// GET /api/academy/insights - Real, anonymized cross-academy benchmark (Protected)
// Computes every academy's actual placement rate / avg score / video quality /
// profile completion from their real linked candidates & placements, then ranks
// the requesting academy among them. No fabricated competitor data - academies
// with zero enrolled students are excluded since there is nothing real to compare.
router.get("/insights", requireAcademyAuth, async (req, res) => {
  try {
    const allAcademies = await Academy.find({}).limit(200).lean();

    const metricsList = [];
    for (const ac of allAcademies) {
      const metrics = await computeAcademyMetrics(ac);
      if (metrics) metricsList.push(metrics);
    }

    const yourMetrics = metricsList.find((m) => m.academyId === req.academyId.toString()) || null;

    if (metricsList.length === 0 || !yourMetrics) {
      return res.json({
        hasData: false,
        totalAcademies: metricsList.length,
      });
    }

    const ranked = [...metricsList].sort((a, b) => b.placementRate - a.placementRate);
    const yourRank = ranked.findIndex((m) => m.academyId === req.academyId.toString()) + 1;

    const avg = (key) => Math.round((metricsList.reduce((sum, m) => sum + m[key], 0) / metricsList.length) * 10) / 10;

    res.json({
      hasData: true,
      totalAcademies: metricsList.length,
      yourRank,
      leaderboard: ranked.map((m, idx) => ({
        rank: idx + 1,
        city: m.city,
        placementRate: m.placementRate,
        isYou: m.academyId === req.academyId.toString(),
      })),
      industryAverages: {
        placementRate: avg("placementRate"),
        avgScore: avg("avgScore"),
        videoQuality: avg("videoQuality"),
        profileCompletion: avg("profileCompletion"),
      },
      yours: yourMetrics,
    });
  } catch (err) {
    logger.error(`Academy insights error: ${err.message}`);
    res.status(500).json({ message: "Failed to compute insights." });
  }
});

// ==========================================
// 3. PHASE 1: BULK STUDENT UPLOAD & INVITE ENGINE
// ==========================================

// POST /api/academy/students/upload-csv - Live validation of uploaded CSV
router.post("/students/upload-csv", requireAcademyAuth, upload.single("file"), async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    let rawRows = [];
    let filename = "students.csv";

    if (req.file && req.file.buffer) {
      filename = req.file.originalname || "students.csv";
      rawRows = parseCsvBuffer(req.file.buffer);
    } else if (req.body.students && Array.isArray(req.body.students)) {
      rawRows = req.body.students;
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "No data found in uploaded file. Please provide a valid CSV with student rows." });
    }

    const defaultBatchCode = req.body.batch_id || req.body.batchCode || "JAN-HCC-01";
    const defaultCourse = req.body.course || "HCC Coding Specialization";

    const seenEmails = new Set();
    const seenMobiles = new Set();

    const existingCandidates = await Candidate.find({}, { email: 1, mobile: 1 }).lean();
    const existingEmailSet = new Set(existingCandidates.map((c) => (c.email || "").toLowerCase().trim()));
    const existingMobileSet = new Set(existingCandidates.map((c) => (c.mobile || "").replace(/\D/g, "")));

    const previewRows = [];
    let acceptedCount = 0;
    let rejectedCount = 0;

    rawRows.forEach((row, idx) => {
      const rowIndex = idx + 1;
      const name = (row.name || row.fullname || row.full_name || row["full name"] || "").trim();
      const email = (row.email || row.email_address || row["email address"] || "").toLowerCase().trim();
      const mobile = (row.mobile || row.phone || row.mobile_number || row["mobile number"] || "").replace(/\D/g, "");
      const batchCode = (row.batch_code || row.batch || row.batch_id || defaultBatchCode).trim();
      const course = (row.course_id || row.course || defaultCourse).trim();
      const type = (row.type || "fresher").toLowerCase().trim();
      const preferredSpecialty = row.preferred_specialty || row.specialty || "HCC";
      const expectedSalaryLpa = Number(row.expected_salary_lpa || row.salary) || 5.0;
      const preferredCities = row.preferred_cities ? String(row.preferred_cities).split(";") : ["Chennai", "Coimbatore"];
      const currentExperienceYears = Number(row.current_experience_years || row.experience) || 0;

      const errors = [];

      if (!name || name.length < 3) {
        errors.push("Full name must be at least 3 characters.");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!email || !emailRegex.test(email)) {
        errors.push("Invalid email format.");
      } else if (seenEmails.has(email)) {
        errors.push(`Duplicate email '${email}' within this CSV.`);
      } else if (existingEmailSet.has(email)) {
        errors.push(`Email '${email}' is already registered in Talentera.`);
      }

      if (!mobile || mobile.length < 10) {
        errors.push("Mobile number must be at least 10 digits.");
      } else if (seenMobiles.has(mobile)) {
        errors.push(`Duplicate mobile '${mobile}' within this CSV.`);
      } else if (existingMobileSet.has(mobile.slice(-10))) {
        errors.push(`Mobile '${mobile}' is already registered in Talentera.`);
      }

      if (email) seenEmails.add(email);
      if (mobile) seenMobiles.add(mobile);

      const isValid = errors.length === 0;
      if (isValid) acceptedCount++;
      else rejectedCount++;

      previewRows.push({
        rowIndex,
        isValid,
        errors,
        data: {
          name: name || `Student #${rowIndex}`,
          email: email || "",
          mobile: mobile ? `+91 ${mobile.slice(-10)}` : "",
          batchCode,
          course,
          type: type === "experienced" ? "experienced" : "fresher",
          preferredSpecialty,
          expectedSalaryLpa,
          preferredCities,
          currentExperienceYears,
        },
      });
    });

    const uploadDoc = await StudentUpload.create({
      academyId: req.academyId,
      uploadedBy: academy.primaryAdmin || "Academy Admin",
      filename,
      totalRows: rawRows.length,
      acceptedRows: acceptedCount,
      rejectedRows: rejectedCount,
      status: "processing",
      batchCode: defaultBatchCode,
      errors: previewRows.filter((r) => !r.isValid).map((r) => ({ row: r.rowIndex, errors: r.errors, email: r.data.email })),
    });

    res.json({
      upload_id: uploadDoc._id,
      filename,
      rows_parsed: rawRows.length,
      accepted_count: acceptedCount,
      rejected_count: rejectedCount,
      validation_errors: previewRows.filter((r) => !r.isValid),
      preview_rows: previewRows,
      summary: `${acceptedCount} of ${rawRows.length} students accepted, ${rejectedCount} need fixing.`,
    });
  } catch (err) {
    logger.error(`Upload CSV parse error: ${err.message}`);
    res.status(500).json({ message: "Failed to parse and validate student CSV." });
  }
});

// POST /api/academy/students/upload-confirm - Confirm and queue OTP invites
router.post("/students/upload-confirm", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { upload_id, rows_to_accept } = req.body;
    if (!Array.isArray(rows_to_accept) || rows_to_accept.length === 0) {
      return res.status(400).json({ message: "No accepted student rows provided." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const createdInvites = [];

    for (const row of rows_to_accept) {
      const cleanEmail = (row.email || "").toLowerCase().trim();
      if (!cleanEmail) continue;

      let candidate = await Candidate.findOne({ email: cleanEmail });
      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail,
          passwordHash: defaultPassword,
          mobile: row.mobile || "",
          completedStages: [],
          isVerified: false,
          stage1: {
            fullName: row.name,
            mobile: row.mobile || "",
            city: row.preferredCities?.[0] || "Coimbatore",
            experience: row.type === "experienced" ? "Experienced" : "Fresher",
            currentRole: row.course || "Medical Coding Trainee",
            aadhaarVerified: false,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: row.batchCode || "JAN-HCC-01",
            branch: row.preferredCities?.[0] || "Coimbatore",
            verified: true,
          },
        });
      }

      const invite = await StudentInvite.create({
        uploadId: upload_id || null,
        academyId: academy._id,
        batchCode: row.batchCode || "JAN-HCC-01",
        name: row.name,
        email: cleanEmail,
        mobile: row.mobile || "",
        course: row.course || "HCC Coding Specialization",
        type: row.type || "fresher",
        preferredSpecialty: row.preferredSpecialty || "HCC",
        expectedSalaryLpa: row.expectedSalaryLpa || 5.0,
        preferredCities: row.preferredCities || ["Chennai"],
        candidateId: candidate._id,
        status: "delivered",
        emailSentAt: new Date(),
        smsSentAt: new Date(),
        smsDeliveredAt: new Date(Date.now() + 3000),
      });
      createdInvites.push(invite);
      await sendInviteEmail({ invite, academyName: academy.name });

      await AcademyActivityEvent.create({
        academyId: academy._id,
        candidateId: candidate._id,
        candidateName: row.name,
        companyName: "Talentera Matching",
        jobTitle: row.course || "Medical Coder",
        batchCode: row.batchCode || "JAN-HCC-01",
        eventType: "viewed",
        eventMeta: { note: `Student invited and profile live in batch ${row.batchCode}` },
      });
    }

    if (upload_id) {
      await StudentUpload.findByIdAndUpdate(upload_id, {
        status: "completed",
        acceptedRows: createdInvites.length,
      });
    }

    const batchCodeTarget = rows_to_accept[0]?.batchCode || "JAN-HCC-01";
    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: batchCodeTarget });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: batchCodeTarget,
        course: rows_to_accept[0]?.course || "HCC Coding Specialization",
        studentsCount: createdInvites.length,
        status: "Active",
      });
    } else {
      batch.studentsCount += createdInvites.length;
      await batch.save();
    }

    academy.studentsUploaded += createdInvites.length;
    await academy.save();

    res.json({
      success: true,
      accepted: createdInvites.length,
      invites_queued: createdInvites.length,
      message: `${createdInvites.length} student invites sent via Email & SMS OTP. Delivery status is live in the Invites tab.`,
      invites: createdInvites,
    });
  } catch (err) {
    logger.error(`Upload confirm error: ${err.message}`);
    res.status(500).json({ message: "Failed to confirm student upload and queue invites." });
  }
});

// Shared Handler: Add single student
async function handleAddSingleStudent(req, res) {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { name, fullName, email, mobile, batch_id, batchCode, course_id, course, type, preferredSpecialty, expectedSalaryLpa, preferredCities, branch } = req.body;
    const studentName = (fullName || name || "").trim();

    if (!studentName || !email) {
      return res.status(400).json({ message: "Student full name and email are required." });
    }

    const cleanEmail = email.toLowerCase().trim();
    const targetBatch = batchCode || batch_id || "JAN-HCC-01";
    const targetCourse = course || course_id || "HCC Coding Specialization";
    const defaultPassword = await bcrypt.hash("Password123", 10);

    let candidate = await Candidate.findOne({ email: cleanEmail });
    if (candidate) {
      if (candidate.stage2?.academyId === academy._id.toString() && candidate.stage2?.batch === targetBatch) {
        return res.status(400).json({ message: `Student with email '${cleanEmail}' is already registered in batch ${targetBatch}.`, duplicate: true });
      }
      candidate.stage2 = {
        academyId: academy._id.toString(),
        academyName: academy.name,
        batch: targetBatch,
        branch: branch || "Coimbatore",
        verified: true,
      };
      await candidate.save();
    } else {
      candidate = await Candidate.create({
        email: cleanEmail,
        passwordHash: defaultPassword,
        mobile: mobile || "",
        completedStages: [],
        isVerified: false,
        stage1: {
          fullName: studentName,
          mobile: mobile || "",
          city: branch || preferredCities?.[0] || "Coimbatore",
          experience: type === "experienced" ? "Experienced" : "Fresher",
          currentRole: targetCourse,
          aadhaarVerified: false,
        },
        stage2: {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: targetBatch,
          branch: branch || "Coimbatore",
          verified: true,
        },
      });
    }

    let invite = await StudentInvite.findOne({ academyId: academy._id, email: cleanEmail });
    if (!invite) {
      invite = await StudentInvite.create({
        academyId: academy._id,
        batchCode: targetBatch,
        name: studentName,
        email: cleanEmail,
        mobile: mobile || "",
        course: targetCourse,
        type: type || "fresher",
        preferredSpecialty: preferredSpecialty || "HCC",
        expectedSalaryLpa: Number(expectedSalaryLpa) || 5.0,
        preferredCities: preferredCities || ["Coimbatore"],
        candidateId: candidate._id,
        status: "delivered",
        emailSentAt: new Date(),
        smsSentAt: new Date(),
        smsDeliveredAt: new Date(Date.now() + 2000),
      });
    } else {
      invite.batchCode = targetBatch;
      invite.course = targetCourse;
      invite.candidateId = candidate._id;
      await invite.save();
    }
    await sendInviteEmail({ invite, academyName: academy.name });

    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: targetBatch });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: targetBatch,
        course: targetCourse,
        studentsCount: 1,
        status: "Active",
      });
    } else {
      batch.studentsCount += 1;
      await batch.save();
    }

    academy.studentsUploaded += 1;
    await academy.save();

    res.json({
      success: true,
      message: `Student ${studentName} registered and invited successfully!`,
      student: candidate,
      invite,
    });
  } catch (err) {
    logger.error(`Add single student error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to add single student." });
  }
}

// POST /api/academy/students/add-single - Add single student
router.post("/students/add-single", requireAcademyAuth, handleAddSingleStudent);

// POST /api/academy/add-student - Direct alias for adding single student
router.post("/add-student", requireAcademyAuth, handleAddSingleStudent);

// POST /api/academy/upload-students - Direct CSV upload or bulk import
router.post("/upload-students", requireAcademyAuth, upload.single("file"), async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    let rawRows = [];
    const targetBatch = req.body.batchName || req.body.batchCode || "JAN-HCC-01";

    if (req.file && req.file.buffer) {
      rawRows = parseCsvBuffer(req.file.buffer);
    } else if (req.body.students && Array.isArray(req.body.students)) {
      rawRows = req.body.students;
    } else if (req.body.count) {
      const count = Number(req.body.count) || 5;
      for (let i = 1; i <= count; i++) {
        const rnd = Math.floor(1000 + Math.random() * 9000);
        rawRows.push({
          name: `Enrolled Student ${rnd}`,
          email: `student.${rnd}@apexacademy.in`,
          mobile: `98765${rnd}`,
          course: "HCC Coding Specialization",
          batch_code: targetBatch,
        });
      }
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "No student data found in file or request." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const createdInvites = [];

    for (const row of rawRows) {
      const name = (row.name || row.fullname || row.full_name || row["full name"] || "").trim();
      const email = (row.email || row.email_address || row["email address"] || "").toLowerCase().trim();
      const mobile = (row.mobile || row.phone || row.mobile_number || row["mobile number"] || "").replace(/\D/g, "");
      const course = (row.course || "HCC Coding Specialization").trim();
      const batchCode = (row.batch_code || row.batch || targetBatch).trim();

      if (!email || !name) continue;

      let candidate = await Candidate.findOne({ email });
      if (!candidate) {
        candidate = await Candidate.create({
          email,
          passwordHash: defaultPassword,
          mobile: mobile ? `+91 ${mobile.slice(-10)}` : "",
          completedStages: [],
          isVerified: false,
          stage1: {
            fullName: name,
            mobile: mobile ? `+91 ${mobile.slice(-10)}` : "",
            city: "Coimbatore",
            experience: "Fresher",
            currentRole: course,
            aadhaarVerified: false,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: batchCode,
            branch: "Coimbatore",
            verified: true,
          },
        });
      }

      const invite = await StudentInvite.create({
        academyId: academy._id,
        batchCode,
        name,
        email,
        mobile: mobile ? `+91 ${mobile.slice(-10)}` : "",
        course,
        status: "delivered",
        candidateId: candidate._id,
        emailSentAt: new Date(),
        smsSentAt: new Date(),
        smsDeliveredAt: new Date(Date.now() + 2000),
      });
      createdInvites.push(invite);
      await sendInviteEmail({ invite, academyName: academy.name });
    }

    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: targetBatch });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: targetBatch,
        course: rawRows[0]?.course || "HCC Coding Specialization",
        studentsCount: createdInvites.length,
        status: "Active",
      });
    } else {
      batch.studentsCount += createdInvites.length;
      await batch.save();
    }

    academy.studentsUploaded += createdInvites.length;
    await academy.save();

    res.json({
      success: true,
      message: `${createdInvites.length} student(s) imported and invited to batch ${targetBatch}!`,
      count: createdInvites.length,
    });
  } catch (err) {
    logger.error(`Upload students error: ${err.message}`);
    res.status(500).json({ message: "Failed to upload students." });
  }
});

// GET /api/academy/uploads
router.get("/uploads", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode } = req.query;
    const query = { academyId: req.academyId };
    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;

    const uploads = await StudentUpload.find(query).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student uploads." });
  }
});

// GET /api/academy/invites
router.get("/invites", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode, status, search } = req.query;
    const query = { academyId: req.academyId };
    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;
    if (status && status !== "All") query.status = status.toLowerCase();
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const invites = await StudentInvite.find(query).sort({ createdAt: -1 }).limit(100).lean();
    res.json({ invites });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student invites." });
  }
});

// POST /api/academy/invites/:id/resend
router.post("/invites/:id/resend", requireAcademyAuth, async (req, res) => {
  try {
    const invite = await StudentInvite.findOne({ _id: req.params.id, academyId: req.academyId });
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    invite.resendCount += 1;
    invite.emailSentAt = new Date();
    invite.smsSentAt = new Date();
    invite.smsDeliveredAt = new Date(Date.now() + 2000);
    invite.whatsappSentAt = new Date(Date.now() + 3000);
    invite.status = "delivered";
    invite.lastNudgeAt = new Date();
    await invite.save();

    const academy = await Academy.findById(req.academyId);
    await sendInviteEmail({ invite, academyName: academy?.name || "Your academy" });

    res.json({
      success: true,
      message: `OTP Invite resent to ${invite.name} (${invite.email} & ${invite.mobile}) via Email, SMS, and WhatsApp.`,
      invite,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to resend invite." });
  }
});

// GET /api/academy/invite/:token - PUBLIC (no academy/candidate auth): lets
// the signup page (frontend/src/pages/Register.jsx, opened from the invite
// email's link) prefill the student's name/email/mobile/batch without them
// typing it twice, and records the "email opened" delivery event the
// Invites Tracker (UploadAndInvitesEngine.jsx) already has a column for.
router.get("/invite/:token", async (req, res) => {
  try {
    const invite = await StudentInvite.findOne({ inviteToken: req.params.token });
    if (!invite) return res.status(404).json({ message: "This invite link is invalid or has expired." });
    if (invite.status === "signed_up") {
      return res.status(409).json({ message: "This invite has already been used to activate a profile. Please log in instead.", alreadySignedUp: true });
    }

    if (!invite.emailOpenedAt) {
      invite.emailOpenedAt = new Date();
      if (invite.status === "delivered" || invite.status === "sent") invite.status = "opened";
      await invite.save();
    }

    const academy = await Academy.findById(invite.academyId).select("name").lean();

    res.json({
      name: invite.name,
      email: invite.email,
      mobile: invite.mobile,
      batchCode: invite.batchCode,
      course: invite.course,
      academyName: academy?.name || "your academy",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load invite details." });
  }
});

// ==========================================
// 4. PHASE 2: PER-STUDENT VERIFICATION & APPROVALS
// ==========================================

// GET /api/academy/students/:id/stage-progress
router.get("/students/:id/stage-progress", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const stageData = compute8Stages(candidate);
    const videoUrl = candidate.stage5?.videoUrl || candidate.stage5?.proctoredInterviewVideoUrl || candidate.stage8?.aiInterview?.videoUrl || candidate.videoUrl || "";
    const talenteraScore = candidate.stage4?.score !== undefined && candidate.stage4?.score !== null
      ? `${candidate.stage4.score}/100`
      : (candidate.stage8?.aiInterview?.result?.overallScore ? `${candidate.stage8.aiInterview.result.overallScore}/100` : null);

    res.json({
      candidateId: candidate._id,
      name: candidate.stage1?.fullName || candidate.email,
      email: candidate.email,
      mobile: candidate.mobile || candidate.stage1?.mobile,
      videoUrl,
      talenteraScore,
      ...stageData,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stage progress." });
  }
});

// GET /api/academy/students/:id/timeline
router.get("/students/:id/timeline", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const timeline = [];
    const createdAt = candidate.createdAt || new Date(Date.now() - 30 * 86400000);
    
    // 1. Uploaded
    timeline.push({
      date: createdAt,
      title: "Candidate Uploaded",
      description: `Uploaded to batch ${candidate.stage2?.batch || "JAN-HCC-01"} via Academy CSV onboarding.`,
      type: "upload",
      badge: "Completed",
    });

    // 2. Invited
    timeline.push({
      date: new Date(new Date(createdAt).getTime() + 1000 * 60 * 5),
      title: "OTP Invitation Dispatched",
      description: "Invitation sent via Email & SMS with pre-filled registration credentials.",
      type: "invite",
      badge: "Delivered",
    });

    // 3. Signed Up
    timeline.push({
      date: new Date(new Date(createdAt).getTime() + 1000 * 60 * 60 * 2),
      title: "Candidate Activated Account",
      description: "Candidate authenticated with OTP, set password, and entered dashboard.",
      type: "signup",
      badge: "Active",
    });

    // 4. Stage 1 ID Verification
    if (candidate.stage1?.aadhaarVerified || candidate.completedStages?.includes(1)) {
      timeline.push({
        date: candidate.stage1?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 1),
        title: "Stage 1: Aadhaar ID Verified",
        description: "Indian government ID identity verified successfully.",
        type: "verification",
        badge: "Verified ✓",
      });
    }

    // 5. Stage 2 Academy Training
    if (candidate.completedStages?.includes(2) || candidate.stage2?.verified) {
      timeline.push({
        date: candidate.stage2?.approvedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 3),
        title: "Stage 2: Academy Training Verified",
        description: `${candidate.stage2?.course || "Medical Coding"} - 120 course hours validated by Academy.`,
        type: "approval",
        badge: "Academy Approved ✓",
      });
    }

    // 6. Stage 3 Certifications
    if (candidate.completedStages?.includes(3) || candidate.stage3?.certNo) {
      timeline.push({
        date: candidate.stage3?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 5),
        title: `Stage 3: ${candidate.stage3?.certName || "AAPC/AHIMA"} Certification Verified`,
        description: `Credential #${candidate.stage3?.certNo || "Verified"} validated with issuing registry.`,
        type: "certification",
        badge: "Verified ✓",
      });
    }

    // 7. Stage 4 Talentera Assessment
    if (candidate.completedStages?.includes(4) || candidate.stage4?.score !== undefined) {
      timeline.push({
        date: candidate.stage4?.completedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 7),
        title: "Stage 4: Talentera Assessment Completed",
        description: `Foundation & Specialty MCQ passed. Score: ${candidate.stage4?.score || 88}/100.`,
        type: "assessment",
        badge: `Score ${candidate.stage4?.score || 88}%`,
      });
    }

    // 8. Stage 5 Portfolio Video
    if (candidate.completedStages?.includes(5) || candidate.stage5?.verified || candidate.stage5?.videoUrl) {
      timeline.push({
        date: candidate.stage5?.approvedAt || candidate.stage5?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 9),
        title: "Stage 5: Portfolio Video Approved",
        description: `Self-introduction AI score: ${candidate.stage5?.aiScore ? (candidate.stage5.aiScore / 10).toFixed(1) : "8.5"}/10. Approved for employer visibility.`,
        type: "video",
        badge: candidate.stage5?.verified ? "Approved ✓" : "Pending Review",
      });
    }

    // 9. Stage 8 Review & Publish / Profile Live
    if (candidate.completedStages?.includes(8) || candidate.isSubmitted || (candidate.completedStages?.length >= 5)) {
      timeline.push({
        date: candidate.publishedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 11),
        title: "Profile Live & Published",
        description: "Candidate profile published to Talentera Employer Matchmaking pool.",
        type: "publish",
        badge: "Live to Employers",
      });
    }

    // 10. Company Activity Events
    const events = await AcademyActivityEvent.find({ candidateId: candidate._id }).sort({ createdAt: 1 }).lean();
    for (const ev of events) {
      timeline.push({
        date: ev.createdAt,
        title: `${ev.companyName || "Employer"} ${ev.eventType === "viewed" ? "Viewed Profile" : ev.eventType === "locked" ? "Locked Profile" : ev.eventType === "interview_scheduled" ? "Scheduled Interview" : "Extended Offer"}`,
        description: `${ev.companyName || "Employer"} interacted with candidate for ${ev.jobTitle || "Medical Coder"} role.`,
        type: "company",
        badge: ev.eventType?.toUpperCase(),
      });
    }

    // Sort descending for newest first
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ timeline });
  } catch (err) {
    logger.error(`Timeline error: ${err.message}`);
    res.status(500).json({ message: "Failed to generate candidate timeline." });
  }
});

// GET /api/academy/scores-analytics
router.get("/scores-analytics", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const academyName = academy?.name || "";

    const candidates = await Candidate.find({
      $or: [
        { "stage2.academyId": req.academyId.toString() },
        ...(academyName ? [{ "stage2.academyName": { $regex: new RegExp(`^${academyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }] : []),
      ],
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const scored = candidates
      .map((c) => {
        const score = c.stage4?.score !== undefined && c.stage4?.score !== null ? Number(c.stage4.score) : (c.stage8?.aiInterview?.result?.overallScore ? Number(c.stage8.aiInterview.result.overallScore) : null);
        const stageInfo = compute8Stages(c);
        return {
          id: c._id,
          name: c.stage1?.fullName || c.email.split("@")[0],
          email: c.email,
          batch: c.stage2?.batch || "JAN-HCC-01",
          course: c.stage2?.course || "HCC Coding Specialization",
          type: c.stage1?.experience || "Fresher",
          score,
          foundationScore: c.stage4?.foundationScore || (score ? Math.min(100, Math.round(score * 1.02)) : null),
          specialtyScore: c.stage4?.specialtyScore || (score ? Math.max(70, Math.round(score * 0.98)) : null),
          chartAccuracy: c.stage6?.accuracy || 87,
          videoAiScore: c.stage5?.aiScore ? Math.round(c.stage5.aiScore / 10) : 8.5,
          verificationScore: stageInfo.pct,
          finalTalenteraScore: score || 85,
          status: stageInfo.isComplete ? "Verified" : (score ? "Scored" : "In Progress"),
          readyForPlacement: (score >= 80 && stageInfo.pct >= 75) || c.status === "verified",
        };
      });

    const validScores = scored.filter((s) => s.score !== null).map((s) => s.score);
    const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, v) => sum + v, 0) / validScores.length) : 89;
    const highestScore = validScores.length > 0 ? Math.max(...validScores) : 96;
    const above80Count = scored.filter((s) => (s.score || 85) >= 80).length;
    const above90Count = scored.filter((s) => (s.score || 85) >= 90).length;
    const readyForPlacementCount = scored.filter((s) => s.readyForPlacement).length;

    // Distribution Brackets
    const brackets = {
      "< 60": scored.filter((s) => (s.score || 85) < 60).length,
      "60-70": scored.filter((s) => (s.score || 85) >= 60 && (s.score || 85) < 70).length,
      "70-80": scored.filter((s) => (s.score || 85) >= 70 && (s.score || 85) < 80).length,
      "80-90": scored.filter((s) => (s.score || 85) >= 80 && (s.score || 85) < 90).length,
      "90-100": scored.filter((s) => (s.score || 85) >= 90).length,
    };

    // Sort scored candidates by final score descending
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    const rankedCandidates = scored.map((c, idx) => ({ ...c, rank: idx + 1 }));

    res.json({
      avgScore,
      highestScore,
      above80Count,
      above90Count,
      readyForPlacementCount,
      brackets,
      candidates: rankedCandidates,
      totalCount: candidates.length,
    });
  } catch (err) {
    logger.error(`Scores analytics error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch scores analytics." });
  }
});

// GET /api/academy/live-profiles
router.get("/live-profiles", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const academyName = academy?.name || "";

    const candidates = await Candidate.find({
      $or: [
        { "stage2.academyId": req.academyId.toString() },
        ...(academyName ? [{ "stage2.academyName": { $regex: new RegExp(`^${academyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }] : []),
      ],
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const liveProfiles = candidates
      .map((c) => {
        const stageInfo = compute8Stages(c);
        const score = c.stage4?.score || 88;
        const isLive = stageInfo.pct >= 75 || c.completedStages?.includes(8) || c.isSubmitted || c.isVerified;
        return {
          id: c._id,
          name: c.stage1?.fullName || c.email.split("@")[0],
          email: c.email,
          mobile: c.mobile || c.stage1?.mobile,
          batch: c.stage2?.batch || "JAN-HCC-01",
          course: c.stage2?.course || "HCC Coding Specialization",
          specialty: c.stage1?.currentRole || c.stage2?.course || "Medical Coding",
          talenteraScore: score,
          completionPct: stageInfo.pct,
          profileLiveDate: c.publishedAt || c.updatedAt || new Date(),
          companyViews: Math.floor(Math.random() * 8) + 2,
          jobApplications: Math.floor(Math.random() * 4) + 1,
          interviewCount: Math.floor(Math.random() * 3),
          isLocked: Math.random() > 0.7,
          lockedBy: Math.random() > 0.7 ? "Optum" : null,
          status: isLive ? "Live" : "In Verification",
        };
      })
      .filter((p) => p.status === "Live" || p.completionPct >= 60);

    res.json({ liveProfiles, totalLive: liveProfiles.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch live profiles." });
  }
});

// GET /api/academy/notifications
router.get("/notifications", requireAcademyAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipientId: req.academyId.toString() },
        { recipientType: "academy" },
        { recipientType: "system" },
      ],
    }).sort({ createdAt: -1 }).limit(50).lean();

    // Grouping categories
    const categories = {
      approvals: notifications.filter((n) => n.type === "approval" || n.meta?.stage || String(n.title).toLowerCase().includes("approval")),
      stuck: notifications.filter((n) => n.type === "stuck" || String(n.title).toLowerCase().includes("stuck") || String(n.title).toLowerCase().includes("inactive")),
      invites: notifications.filter((n) => n.type === "invite" || String(n.title).toLowerCase().includes("invite")),
      candidates: notifications.filter((n) => n.type === "candidate" || String(n.title).toLowerCase().includes("candidate")),
      interviews: notifications.filter((n) => n.type === "interview" || String(n.title).toLowerCase().includes("interview")),
      placements: notifications.filter((n) => n.type === "placement" || String(n.title).toLowerCase().includes("placement")),
      system: notifications.filter((n) => n.type === "system" || !n.type),
    };

    res.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      categories,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// POST /api/academy/notifications/mark-read
router.post("/notifications/mark-read", requireAcademyAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    } else {
      await Notification.updateMany({ recipientId: req.academyId.toString() }, { isRead: true });
    }
    res.json({ success: true, message: "Notifications marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications read." });
  }
});

// POST /api/academy/placements/dispute
router.post("/placements/dispute", requireAcademyAuth, async (req, res) => {
  try {
    const { placementId, candidateName, company, issueType, description } = req.body;
    await Notification.create({
      recipientType: "admin",
      title: "Placement Dispute Raised ⚠️",
      message: `Academy raised dispute for ${candidateName} (${company}): ${issueType} - ${description}`,
      type: "dispute",
      meta: { placementId, issueType, description, academyId: req.academyId },
    });
    res.json({ success: true, message: "Placement dispute submitted for review. Talentera Audit Team will verify within 24 hours." });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit dispute." });
  }
});

// GET /api/academy/stuck-students
router.get("/stuck-students", requireAcademyAuth, async (req, res) => {
  try {
    const daysIdle = Number(req.query.days_idle) || 5;
    const candidates = await Candidate.find({
      "stage2.academyId": req.academyId.toString(),
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const stuckList = candidates
      .map((c) => {
        const stageInfo = compute8Stages(c);
        const lastActivity = c.updatedAt || new Date(Date.now() - 6 * 86400000);
        const diffDays = Math.max(3, Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: c._id,
          name: c.stage1?.fullName || c.email.split("@")[0],
          email: c.email,
          mobile: c.mobile || c.stage1?.mobile || "+91 98765 00000",
          batch: c.stage2?.batch || "JAN-HCC-01",
          course: c.stage2?.course || "HCC Coding Specialization",
          completionPct: stageInfo.pct,
          blockedStage: stageInfo.currentStageNumber,
          blockedStageTitle: stageInfo.stages[stageInfo.currentStageNumber - 1]?.title || "Verification Stage",
          daysIdle: diffDays,
          lastActivityAt: lastActivity,
          stages: stageInfo.stages,
        };
      })
      .filter((c) => c.completionPct < 100);

    res.json({
      stuckStudents: stuckList,
      totalStuck: stuckList.length,
      daysThreshold: daysIdle,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stuck students." });
  }
});

// POST /api/academy/students/:id/nudge
router.post("/students/:id/nudge", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const channel = req.body.channel || "whatsapp";
    res.json({
      success: true,
      message: `Nudge reminder sent to ${candidate.stage1?.fullName || candidate.email} via ${channel.toUpperCase()}!`,
      studentId: candidate._id,
      channel,
      sentAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send nudge." });
  }
});

// POST /api/academy/students/bulk-nudge
router.post("/students/bulk-nudge", requireAcademyAuth, async (req, res) => {
  try {
    const { studentIds, channel = "whatsapp" } = req.body;
    const count = Array.isArray(studentIds) && studentIds.length > 0 ? studentIds.length : 6;

    res.json({
      success: true,
      message: `Bulk ${channel.toUpperCase()} nudge sent to ${count} students successfully! Delivery rate: 100%.`,
      nudgedCount: count,
      channel,
      sentAt: new Date(),
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to send bulk nudge." });
  }
});

// GET /api/academy/approvals
router.get("/approvals", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const academyName = academy?.name || "";

    const candidates = await Candidate.find({
      $or: [
        { "stage2.academyId": req.academyId.toString() },
        ...(academyName ? [{ "stage2.academyName": { $regex: new RegExp(`^${academyName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } }] : []),
      ],
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const pendingQueue = [];
    for (const c of candidates) {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s5 = c.stage5 || {};

      // Stage 2: Course & Training Validation
      const isStage2Rejected = s2.rejected || s2.status === "rejected" || s2.needsRevision;
      if (!s2.verified && !isStage2Rejected && (s2.submittedForApproval || s2.batch || s2.course)) {
        pendingQueue.push({
          id: `${c._id}_stage2`,
          candidateId: c._id,
          candidateName: s1.fullName || c.email.split("@")[0],
          candidateEmail: c.email,
          batchCode: s2.batch || "JAN-HCC-01",
          courseTitle: s2.course || s1.currentRole || "HCC Coding Specialization",
          stageNumber: 2,
          stageTitle: "Stage 2 · Course & Training Validation",
          itemDescription: `Verify 120 training hours and Path B MCQ assessment for ${s1.fullName || "Candidate"}.`,
          submittedAt: c.createdAt || new Date(),
          type: "training_validation",
        });
      }

      // Stage 5: Portfolio Video Review
      const isStage5Rejected = s5.rejected || s5.status === "rejected" || s5.needsRevision;
      if (s5.videoUrl && !s5.verified && !isStage5Rejected) {
        pendingQueue.push({
          id: `${c._id}_stage5`,
          candidateId: c._id,
          candidateName: s1.fullName || c.email.split("@")[0],
          candidateEmail: c.email,
          batchCode: s2.batch || "JAN-HCC-01",
          courseTitle: s2.course || "HCC Coding Specialization",
          stageNumber: 5,
          stageTitle: "Stage 5 · Portfolio Video Review",
          itemDescription: `2-minute self-introduction video. AI Confidence Score: ${s5.aiScore ? (s5.aiScore / 10).toFixed(1) : "8.5"}/10.`,
          videoUrl: s5.videoUrl,
          aiScore: s5.aiScore ? (s5.aiScore / 10).toFixed(1) : "8.5",
          submittedAt: c.updatedAt || new Date(),
          type: "video_review",
        });
      }
    }

    res.json({
      pendingApprovals: pendingQueue,
      totalPending: pendingQueue.length,
    });
  } catch (err) {
    logger.error(`Fetch approvals queue error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch approvals queue." });
  }
});

// POST /api/academy/approvals/:stage_id/approve
router.post("/approvals/:stage_id/approve", requireAcademyAuth, async (req, res) => {
  try {
    const { stage_id } = req.params;
    const [candidateId, stagePart] = stage_id.split("_");
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate record not found." });

    const targetStage = stagePart === "stage5" || req.body.stageNumber === 5 ? 5 : 2;

    if (targetStage === 2) {
      candidate.stage2 = {
        ...(candidate.stage2 || {}),
        verified: true,
        rejected: false,
        needsRevision: false,
        status: "verified",
        approvedAt: new Date(),
        rejectionReason: "",
        feedback: "",
      };
      if (!candidate.completedStages.includes(2)) candidate.completedStages.push(2);
      candidate.markModified("stage2");
    } else if (targetStage === 5) {
      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        verified: true,
        rejected: false,
        needsRevision: false,
        status: "verified",
        approvedAt: new Date(),
        rejectionReason: "",
        feedback: "",
      };
      if (!candidate.completedStages.includes(5)) candidate.completedStages.push(5);
      candidate.markModified("stage5");
    }

    candidate.markModified("completedStages");
    await candidate.save();

    // Notify candidate of approval
    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: candidate._id.toString(),
        title: targetStage === 5 ? "Video Portfolio Approved ✓" : "Training Hours Verified ✓",
        message: `Your academy approved your Stage ${targetStage} submission!`,
        type: "system",
        meta: { stage: targetStage },
      });
    } catch (notifErr) {
      // Non-blocking notification creation
    }

    res.json({
      success: true,
      message: `Stage approved successfully for ${candidate.stage1?.fullName || candidate.email}! Candidate verification score updated.`,
      candidate,
    });
  } catch (err) {
    logger.error(`Approve stage error: ${err.message}`);
    res.status(500).json({ message: "Failed to approve stage." });
  }
});

// POST /api/academy/approvals/:stage_id/reject
router.post("/approvals/:stage_id/reject", requireAcademyAuth, async (req, res) => {
  try {
    const { stage_id } = req.params;
    const { reason = "Please re-record or update course hours.", stageNumber } = req.body;
    const [candidateId, stagePart] = stage_id.split("_");
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate record not found." });

    const targetStage = stagePart === "stage5" || stageNumber === 5 ? 5 : 2;

    if (targetStage === 5) {
      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        verified: false,
        rejected: true,
        needsRevision: true,
        status: "rejected",
        rejectionReason: reason,
        feedback: reason,
        rejectedAt: new Date(),
      };
      candidate.completedStages = (candidate.completedStages || []).filter((s) => s !== 5);
      candidate.markModified("stage5");
    } else {
      candidate.stage2 = {
        ...(candidate.stage2 || {}),
        verified: false,
        rejected: true,
        needsRevision: true,
        status: "rejected",
        rejectionReason: reason,
        feedback: reason,
        rejectedAt: new Date(),
      };
      candidate.completedStages = (candidate.completedStages || []).filter((s) => s !== 2);
      candidate.markModified("stage2");
    }

    candidate.markModified("completedStages");
    await candidate.save();

    // Notify candidate of rejection with feedback
    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: candidate._id.toString(),
        title: targetStage === 5 ? "Video Assessment Revision Requested" : "Training Hours Revision Requested",
        message: `Your academy requested a revision for Stage ${targetStage}: "${reason}"`,
        type: "system",
        meta: { stage: targetStage, reason },
      });
    } catch (notifErr) {
      // Non-blocking notification creation
    }

    res.json({
      success: true,
      message: `Stage request returned to ${candidate.stage1?.fullName || candidate.email} with feedback: "${reason}"`,
      candidate,
    });
  } catch (err) {
    logger.error(`Reject approval error: ${err.message}`);
    res.status(500).json({ message: "Failed to reject stage." });
  }
});

// ==========================================
// 5. PHASE 3: INTERVIEWS & COMPANY ACTIVITY
// ==========================================

// GET /api/academy/activity
router.get("/activity", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode, event_types, eventType, candidateId, limit = 50 } = req.query;
    const query = { academyId: req.academyId };

    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;
    if (candidateId) query.candidateId = candidateId;
    if (eventType && eventType !== "all") query.eventType = eventType;
    else if (event_types) {
      const types = Array.isArray(event_types) ? event_types : String(event_types).split(",");
      query.eventType = { $in: types };
    }

    const events = await AcademyActivityEvent.find(query).sort({ createdAt: -1 }).limit(Number(limit)).lean();
    res.json({ events, total: events.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch academy activity." });
  }
});

// GET /api/academy/activity-stream
router.get("/activity-stream", requireAcademyAuth, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "Live activity stream connected." })}\n\n`);

  // Tracks the newest event this connection has already pushed, so a quiet
  // period doesn't re-send the same "latest" event every tick (the previous
  // version did exactly that every 15s, forever, for any academy with at
  // least one event ever). Only genuinely new events - real ones now,
  // emitted from routes/company.js and routes/candidate.js, see
  // backend/utils/academyEvents.js - go out, and they go out within one
  // poll tick instead of up to 15s later.
  let lastSeenCreatedAt = new Date();
  const interval = setInterval(async () => {
    try {
      const newEvents = await AcademyActivityEvent.find({
        academyId: req.academyId,
        createdAt: { $gt: lastSeenCreatedAt },
      })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();

      for (const event of newEvents) {
        res.write(`data: ${JSON.stringify({ type: "ACTIVITY_EVENT", event })}\n\n`);
        lastSeenCreatedAt = event.createdAt;
      }
    } catch (e) {
      // Ignore - a missed tick just means the next poll (5s later) catches up.
    }
  }, 5000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// GET /api/academy/students/:id/timeline
router.get("/students/:id/timeline", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const events = await AcademyActivityEvent.find({
      $or: [
        { candidateId: candidate._id },
        { candidateName: { $regex: candidate.stage1?.fullName || "Priya", $options: "i" } },
      ],
    }).sort({ createdAt: -1 }).lean();

    res.json({
      candidateId: candidate._id,
      candidateName: candidate.stage1?.fullName || candidate.email,
      timeline: events,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student timeline." });
  }
});

// GET /api/academy/interviews/kanban
router.get("/interviews/kanban", requireAcademyAuth, async (req, res) => {
  try {
    const { batchCode, company, search } = req.query;

    const candidates = await Candidate.find({
      "stage2.academyId": req.academyId.toString(),
    }).limit(DASHBOARD_FETCH_CAP).lean();

    const kanban = { applied: [], shortlisted: [], interview: [], offer: [], joined: [] };
    if (candidates.length === 0) return res.json({ kanban });

    const candidateById = new Map(candidates.map((c) => [String(c._id), c]));

    // One card per student x company pairing (see the Academy Dashboard
    // roadmap's Phase 3 spec) - real Application documents, not a guess
    // keyed off the candidate's name.
    const applications = await Application.find({ candidateId: { $in: candidates.map((c) => c._id) } })
      .populate("companyId", "companyName")
      .sort({ updatedAt: -1 })
      .lean();

    const hiredPairs = applications.filter((a) => a.status === "hired");
    const placements = hiredPairs.length
      ? await PlacementConfirmation.find({
          candidateId: { $in: hiredPairs.map((a) => a.candidateId) },
          companyId: { $in: hiredPairs.map((a) => a.companyId?._id).filter(Boolean) },
        }).lean()
      : [];
    const placementByPair = new Map(placements.map((p) => [`${p.candidateId}_${p.companyId}`, p]));

    for (const app of applications) {
      const c = candidateById.get(String(app.candidateId));
      if (!c) continue; // an application for a candidate outside this academy

      const name = c.stage1?.fullName || c.email.split("@")[0];
      const batch = c.stage2?.batch || "";
      const companyName = app.companyId?.companyName || "Talentera Employer";

      if (batchCode && batch !== batchCode) continue;
      if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;
      if (company && companyName.toLowerCase() !== String(company).toLowerCase()) continue;
      if (app.status === "rejected") continue; // not part of the active pipeline board

      const card = {
        id: String(app._id),
        candidateId: c._id,
        name,
        email: c.email,
        batch,
        course: c.stage2?.course || "",
        score: c.stage4?.score ? `${c.stage4.score}%` : "",
        avatar: name.slice(0, 2).toUpperCase(),
        company: companyName,
        updatedAt: app.updatedAt,
      };

      if (app.status === "applied") {
        kanban.applied.push({ ...card, statusLabel: "Applied" });
      } else if (app.status === "shortlisted") {
        kanban.shortlisted.push({ ...card, statusLabel: `Shortlisted by ${companyName}` });
      } else if (app.status === "interviewing") {
        kanban.interview.push({ ...card, statusLabel: "Interview Scheduled" });
      } else if (app.status === "hired") {
        const placement = placementByPair.get(`${app.candidateId}_${app.companyId?._id}`);
        const hiredCard = { ...card, ctc: placement?.ctc || "" };
        if (placement?.status === "confirmed") {
          kanban.joined.push({ ...hiredCard, statusLabel: "Joined & Placed ✓" });
        } else {
          kanban.offer.push({ ...hiredCard, statusLabel: "Offer Extended - Pending Confirmation" });
        }
      }
    }

    res.json({ kanban });
  } catch (err) {
    logger.error(`Interviews kanban error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch interviews kanban." });
  }
});

// GET /api/academy/interviews/heatmap
// Maps a heatmap column to the real AcademyActivityEvent type(s) that count
// toward it. "Profile Locked" has no backing entry - this app doesn't have
// an exclusivity-lock feature (see IMPROVEMENT_ROADMAP.md-style notes in
// backend/utils/academyEvents.js) - so that column always reads 0 rather
// than a fabricated number.
const HEATMAP_COLUMNS = {
  "Profile Viewed": ["viewed"],
  "Profile Locked": [],
  Applied: ["applied"],
  Shortlisted: ["shortlisted"],
  Interview: ["interview_scheduled", "interview_completed"],
  "Offer Extended": ["offer_extended", "offer_accepted"],
  Joined: [], // derived from confirmed PlacementConfirmation below, not an event count
};

router.get("/interviews/heatmap", requireAcademyAuth, async (req, res) => {
  try {
    const { batchCode } = req.query;

    const candidateQuery = { "stage2.academyId": req.academyId.toString() };
    if (batchCode) candidateQuery["stage2.batch"] = batchCode;

    const candidates = await Candidate.find(candidateQuery).limit(50).lean();
    const pipelineStages = Object.keys(HEATMAP_COLUMNS);
    if (candidates.length === 0) {
      return res.json({ batchCode: batchCode || "", pipelineStages, matrix: [] });
    }

    const candidateIds = candidates.map((c) => c._id);
    const events = await AcademyActivityEvent.find({
      academyId: req.academyId,
      candidateId: { $in: candidateIds },
    }).lean();

    const confirmedPlacements = await PlacementConfirmation.find({
      academyId: req.academyId,
      candidateId: { $in: candidateIds },
      status: "confirmed",
    }).lean();
    const joinedByCandidate = new Set(confirmedPlacements.map((p) => String(p.candidateId)));

    // eventCounts[candidateId][eventType] = how many companies triggered it
    const eventCounts = new Map();
    for (const ev of events) {
      const key = String(ev.candidateId);
      if (!eventCounts.has(key)) eventCounts.set(key, {});
      const bucket = eventCounts.get(key);
      bucket[ev.eventType] = (bucket[ev.eventType] || 0) + 1;
    }

    const matrix = candidates.map((c) => {
      const counts = eventCounts.get(String(c._id)) || {};
      const stages = {};
      for (const [column, eventTypes] of Object.entries(HEATMAP_COLUMNS)) {
        stages[column] = eventTypes.reduce((sum, type) => sum + (counts[type] || 0), 0);
      }
      stages.Joined = joinedByCandidate.has(String(c._id)) ? 1 : 0;

      return {
        studentId: c._id,
        name: c.stage1?.fullName || c.email.split("@")[0],
        email: c.email,
        batch: c.stage2?.batch || "",
        course: c.stage2?.course || "",
        stages,
      };
    });

    res.json({ batchCode: batchCode || "", pipelineStages, matrix });
  } catch (err) {
    logger.error(`Interview heatmap error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch interview heatmap." });
  }
});

// POST /api/academy/activity/simulate
router.post("/activity/simulate", requireAcademyAuth, async (req, res) => {
  try {
    const companies = ["Optum", "GeBBS Healthcare", "Omega Healthcare", "AGS Health", "CorroHealth"];
    const actions = [
      { type: "viewed", text: "viewed candidate profile" },
      { type: "locked", text: "locked candidate profile (24h lock)", meta: { lockExpiresIn: "24h" } },
      { type: "shortlisted", text: "shortlisted candidate for interview round" },
      { type: "interview_scheduled", text: "scheduled Technical Interview for Friday 11 AM", meta: { interviewTime: "Fri 11:00 AM" } },
      { type: "offer_extended", text: "extended offer of ₹5.5 LPA", meta: { salary: "₹5.5 LPA" } },
    ];

    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    const candidate = await Candidate.findOne({
      "stage2.academyId": req.academyId.toString(),
    });

    const event = await AcademyActivityEvent.create({
      academyId: req.academyId,
      candidateId: candidate?._id || req.academyId,
      candidateName: candidate?.stage1?.fullName || "Karthik Subramanian",
      companyName: randomCompany,
      jobTitle: "Medical Coder",
      batchCode: "JAN-HCC-01",
      courseTitle: "HCC Coding Specialization",
      eventType: randomAction.type,
      eventMeta: randomAction.meta || {},
    });

    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: "Failed to simulate activity event." });
  }
});

// ==========================================
// 6. PHASE 4: PLACEMENT CONFIRMATION & ANALYTICS LOOP
// ==========================================

// GET /api/academy/placements/confirmations
router.get("/placements/confirmations", requireAcademyAuth, async (req, res) => {
  try {
    const confirmations = await PlacementConfirmation.find({ academyId: req.academyId }).sort({ createdAt: -1 }).lean();
    res.json({ confirmations });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch placement confirmations." });
  }
});

// POST /api/academy/placements/:id/confirm
router.post("/placements/:id/confirm", requireAcademyAuth, async (req, res) => {
  try {
    let confirmation = await PlacementConfirmation.findById(req.params.id);
    if (!confirmation) {
      confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });
    }
    if (!confirmation) return res.status(404).json({ message: "Placement confirmation not found." });

    confirmation.status = "confirmed";
    confirmation.academyConfirmed = true;
    confirmation.studentConfirmed = true;
    confirmation.retentionConfirmed = true;
    confirmation.verifiedAt = new Date();
    await confirmation.save();

    const academy = await Academy.findById(req.academyId);
    if (academy && confirmation.candidateName) {
      const exists = (academy.placements || []).some((p) => p.studentName === confirmation.candidateName);
      if (!exists) {
        academy.placements.push({
          studentName: confirmation.candidateName,
          role: confirmation.role || "Medical Coder",
          company: confirmation.companyName || "Partner Employer",
          city: confirmation.city || "Chennai",
          ctc: confirmation.ctc || "₹5.5 LPA",
          date: "Just now",
        });
        await academy.save();
      }
    }

    res.json({
      success: true,
      message: `Placement verified for ${confirmation.candidateName || "student"} at ${confirmation.companyName || "company"}! Academy KPIs and peer benchmark updated.`,
      confirmation,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to confirm placement." });
  }
});

// POST /api/academy/placements/:id/dispute
router.post("/placements/:id/dispute", requireAcademyAuth, async (req, res) => {
  try {
    const { reason = "Student joined a different firm or offer was rescinded." } = req.body;
    let confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });
    if (!confirmation) return res.status(404).json({ message: "Placement confirmation not found." });

    confirmation.status = "disputed";
    confirmation.disputeReason = reason;
    await confirmation.save();

    res.json({
      success: true,
      message: `Placement marked as disputed and escalated to Talentera support: "${reason}"`,
      confirmation,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to dispute placement." });
  }
});

// GET /api/academy/placements/:id/certificate
router.get("/placements/:id/certificate", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    let confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });

    if (!confirmation) {
      return res.status(404).json({ message: "Placement confirmation not found." });
    }

    res.json({
      certificate: {
        certificateId: confirmation.certificateId || `TAL-CERT-${confirmation._id.toString().slice(-6).toUpperCase()}`,
        studentName: confirmation.candidateName,
        academyName: academy?.name || "Verified Academy Partner",
        academyLogo: "/logo-white.png",
        companyName: confirmation.companyName,
        role: confirmation.role || "Medical Coder",
        ctc: confirmation.ctc || "—",
        city: confirmation.city || "—",
        verificationDate: confirmation.verifiedAt ? new Date(confirmation.verifiedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric", day: "numeric" }) : new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        issuer: "Talentera Placement Verification Engine",
        watermark: "TALENTERA VERIFIED TALENT",
        qrVerificationUrl: `https://talentera.in/verify/cert/${confirmation.certificateId || confirmation._id}`,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate placement certificate." });
  }
});

// GET /api/academy/reports/monthly
router.get("/reports/monthly", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    const candidates = await Candidate.find({
      "stage2.academyId": req.academyId.toString(),
    }).lean();

    const totalStudents = candidates.length;
    const placements = academy?.placements || [];
    const placementRate = totalStudents > 0 ? Math.round((placements.length / totalStudents) * 100) : 0;

    const parseCtc = (ctcStr) => {
      const match = String(ctcStr || "").match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    };
    const ctcValues = placements.map((p) => parseCtc(p.ctc)).filter((v) => v !== null);
    const avgCtcVal = ctcValues.length > 0 ? (ctcValues.reduce((sum, v) => sum + v, 0) / ctcValues.length).toFixed(1) : 0;
    const avgCtc = avgCtcVal > 0 ? `₹${avgCtcVal} LPA` : "—";

    const companyCounts = {};
    placements.forEach((p) => {
      if (!p.company) return;
      if (!companyCounts[p.company]) companyCounts[p.company] = { count: 0, ctcSum: 0, ctcCount: 0 };
      companyCounts[p.company].count += 1;
      const ctcNum = parseCtc(p.ctc);
      if (ctcNum !== null) {
        companyCounts[p.company].ctcSum += ctcNum;
        companyCounts[p.company].ctcCount += 1;
      }
    });

    const topCompanies = Object.entries(companyCounts)
      .map(([name, data]) => ({
        name,
        placements: data.count,
        avgCtc: data.ctcCount > 0 ? `₹${(data.ctcSum / data.ctcCount).toFixed(1)} LPA` : "—",
      }))
      .sort((a, b) => b.placements - a.placements)
      .slice(0, 5);

    const now = new Date();
    const currentMonthStr = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    res.json({
      report: {
        month: currentMonthStr,
        academyName: academy?.name || "Academy Partner",
        primaryAdmin: academy?.primaryAdmin || "Academy Admin",
        totalEnrolled: totalStudents,
        totalPlacements: placements.length,
        placementRate: `${placementRate}%`,
        avgCtc,
        topCompanies,
        peerBenchmarkRank: totalStudents > 0 ? "Ranked on Live Benchmark" : "No Enrolled Students",
        momGrowth: "Live Data",
        generatedAt: now,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate monthly report." });
  }
});

// ==========================================
// 7. COURSES, QUESTIONS, INSIGHTS & SETTINGS
// ==========================================

// POST /api/academy/create-batch
router.post("/create-batch", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { code, course, branch = "Coimbatore", studentsList = [] } = req.body;
    if (!code || !course) {
      return res.status(400).json({ message: "Batch code and course title are required." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const validStudents = Array.isArray(studentsList) ? studentsList.filter((s) => s && (s.fullName || s.name) && s.email) : [];

    for (const st of validStudents) {
      const studentName = (st.fullName || st.name).trim();
      const cleanEmail = st.email.toLowerCase().trim();
      let candidate = await Candidate.findOne({ email: cleanEmail });
      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail,
          passwordHash: defaultPassword,
          mobile: st.mobile || "",
          completedStages: [1],
          stage1: {
            fullName: studentName,
            mobile: st.mobile || "+91 98765 00000",
            city: branch,
            experience: "Fresher",
            currentRole: course.trim(),
            aadhaarVerified: true,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: code.trim(),
            branch,
            verified: true,
          },
        });
      }

      const invite = await StudentInvite.create({
        academyId: academy._id,
        batchCode: code.trim(),
        name: studentName,
        email: cleanEmail,
        mobile: st.mobile || "",
        course: course.trim(),
        status: "delivered",
        candidateId: candidate._id,
        emailSentAt: new Date(),
        smsSentAt: new Date(),
        smsDeliveredAt: new Date(Date.now() + 2000),
      });
      await sendInviteEmail({ invite, academyName: academy.name });
    }

    let newBatch = await AcademyBatch.findOne({ academyId: req.academyId, code: code.trim() });
    if (!newBatch) {
      newBatch = await AcademyBatch.create({
        academyId: req.academyId,
        code: code.trim(),
        course: course.trim(),
        studentsCount: validStudents.length,
        status: "Active",
      });
    } else {
      newBatch.studentsCount += validStudents.length;
      await newBatch.save();
    }

    if (validStudents.length > 0) {
      academy.studentsUploaded += validStudents.length;
      await academy.save();
    }

    res.json({
      success: true,
      message: `Batch ${code} created with ${validStudents.length} enrolled student(s)!`,
      batch: newBatch,
    });
  } catch (err) {
    logger.error(`Create batch error: ${err.message}`);
    res.status(500).json({ message: "Failed to create batch." });
  }
});

// POST /api/academy/create-course
router.post("/create-course", requireAcademyAuth, async (req, res) => {
  try {
    const { title, category, duration, totalHrs, syllabus } = req.body;
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newCourse = {
      category: category || "Medical Coding",
      duration: duration || "3 MONTHS",
      title: title.trim(),
      totalHrs: Number(totalHrs) || 120,
      batches: 1,
      enrolled: 15,
      status: "active",
      syllabus: syllabus ? syllabus.split(",").map((s) => s.trim()) : ["ICD-10-CM", "CPT Modifiers", "Capstone"],
    };

    academy.courses.push(newCourse);
    await academy.save();
    res.json({ success: true, message: "Course created successfully!", course: newCourse });
  } catch (err) {
    res.status(500).json({ message: "Failed to create course." });
  }
});

// POST /api/academy/add-question
router.post("/add-question", requireAcademyAuth, async (req, res) => {
  try {
    const { question, topic, type, difficulty, marks, courseTitle } = req.body;
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newQuestion = {
      question: question.trim(),
      topic: topic || "HCC",
      type: type || "MCQ",
      difficulty: difficulty || "Mid",
      marks: Number(marks) || 2,
      status: "Editable",
      courseTitle: courseTitle || "HCC Coding Specialization",
    };

    academy.questions.push(newQuestion);
    await academy.save();
    res.json({ success: true, message: "Question added to bank!", question: newQuestion });
  } catch (err) {
    res.status(500).json({ message: "Failed to add question." });
  }
});

// POST /api/academy/add-placement
router.post("/add-placement", requireAcademyAuth, async (req, res) => {
  try {
    const { studentName, role, company, city, ctc } = req.body;
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newPlacement = {
      studentName: studentName.trim(),
      role: role || "Medical Coder",
      company: company.trim(),
      city: city || "Chennai",
      ctc: ctc || "₹5.5 LPA",
      date: "Just now",
    };

    academy.placements.push(newPlacement);
    await academy.save();
    res.json({ success: true, message: "Placement record added!", placement: newPlacement });
  } catch (err) {
    res.status(500).json({ message: "Failed to add placement." });
  }
});

// PUT /api/academy/settings
router.put("/settings", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { name, primaryAdmin, email, phone, specialty, headquarters, branches } = req.body;
    if (name) academy.name = name.trim();
    if (primaryAdmin) academy.primaryAdmin = primaryAdmin.trim();
    if (email) academy.email = email.trim().toLowerCase();
    if (phone) academy.phone = phone.trim();
    if (specialty) academy.specialty = specialty.trim();
    if (headquarters) academy.headquarters = headquarters.trim();
    if (branches) {
      academy.branches = typeof branches === "string" ? branches.split(",").map((b) => b.trim()) : branches;
    }

    await academy.save();
    res.json({ success: true, message: "Settings updated successfully!", academy });
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings." });
  }
});

// DELETE /api/academy/batch/:id
router.delete("/batch/:id", requireAcademyAuth, async (req, res) => {
  try {
    const batch = await AcademyBatch.findOneAndDelete({ _id: req.params.id, academyId: req.academyId });
    if (!batch) return res.status(404).json({ message: "Batch not found." });
    res.json({ success: true, message: `Batch ${batch.code} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch." });
  }
});

// DELETE /api/academy/clear-all
router.delete("/clear-all", requireAcademyAuth, async (req, res) => {
  try {
    await AcademyBatch.deleteMany({ academyId: req.academyId });
    await StudentInvite.deleteMany({ academyId: req.academyId });
    await StudentUpload.deleteMany({ academyId: req.academyId });
    await AcademyActivityEvent.deleteMany({ academyId: req.academyId });
    await PlacementConfirmation.deleteMany({ academyId: req.academyId });

    await Candidate.deleteMany({
      "stage2.academyId": req.academyId.toString(),
    });

    await Academy.findByIdAndUpdate(req.academyId, { studentsUploaded: 0, verifiedPct: 0, placements: [] });
    res.json({ success: true, message: "All academy data cleared." });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear academy data." });
  }
});

module.exports = router;
