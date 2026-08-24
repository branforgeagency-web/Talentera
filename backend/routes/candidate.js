const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Job = require("../models/Job");
const InterviewQuestion = require("../models/InterviewQuestion");
const { requireAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { parseAadhaarQr } = require("../utils/aadhaarQrDecoder");
const { processAadhaarFile } = require("../utils/ekyc");
const { evaluateAiVideoAssessment } = require("../utils/aiAssessment");
const { generateInterviewQuestions, getMessiTurn, generateFinalReport } = require("../utils/claudeInterview");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();
router.use(requireAuth); // every route below requires a valid JWT

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
// Stages the candidate is allowed to skip. Training (2) and Certification (3)
// used to be skippable but are now mandatory, same as every other stage
// except Build Resume (7) — matches frontend/src/data/wizardStages.js
// SKIPPABLE_STAGE_NUMS exactly.
const SKIPPABLE_STAGES = [7];

// A candidate must have completed every stage AND hold a verification score
// above this threshold before they're allowed to search or apply for jobs —
// enforced again below in POST /apply/:jobId (the frontend Jobs.jsx page
// enforces the same rule, but that's a UI convenience, not security).
const JOB_SEARCH_MIN_SCORE = 90;

// Built-in questions used only when staff haven't configured any interview
// questions yet in the Staff Hub (Interview Questions screen). These are
// deliberately conversational/biographical, not technical recall - Stage 5
// grades COMMUNICATION quality (clarity, fluency, confidence/delivery), not
// answer correctness, so there's no "right answer" to check for. See
// evaluateAiVideoAssessment() in backend/utils/aiAssessment.js.
const DEFAULT_INTERVIEW_QUESTIONS = {
  video: [
    "Tell me about yourself - your background, education, and what led you into Medical Coding / RCM.",
    "Tell me about the course or training program you completed - what did you study, and what did you take away from it?",
    "Tell me a bit about your family background and where you're from.",
    "What would you say are your biggest strengths, and where do you see yourself professionally in the next few years?",
    "Why did you choose a career in Medical Coding / Healthcare RCM specifically?",
  ],
  audio: [
    "Let's start with you - tell me about yourself, your background, and what led you into RCM or medical coding.",
    "Tell me about your training or course - what did you study, and what did you learn from it?",
    "Tell me about a challenge you've faced (personal or professional) and how you handled it.",
    "What are your strengths, and where do you see yourself professionally a few years from now?",
  ],
};

// Looks up each { questionId, transcript } pair's real question text from
// the staff-managed InterviewQuestion bank, so grading always uses the
// actual configured question rather than trusting whatever text the
// candidate's browser sent (anti-tamper). questionId can be a Mongo id
// (staff-configured question) or a "default-N" id (built-in fallback
// question). Communication scoring (evaluateAiVideoAssessment) doesn't grade
// against an answer key, so correctAnswer is no longer resolved/used here.
async function enrichQaPairsWithAnswerKey(qaPairs = []) {
  const mongoIds = qaPairs.map((p) => p.questionId).filter((id) => id && /^[a-f0-9]{24}$/i.test(String(id)));
  const dbQuestions = mongoIds.length ? await InterviewQuestion.find({ _id: { $in: mongoIds } }).lean() : [];
  const byId = new Map(dbQuestions.map((q) => [String(q._id), q]));

  // Also query all active InterviewQuestions if questions were matched by text/questionId
  const allDbQuestions = dbQuestions.length === 0 ? await InterviewQuestion.find({ active: true }).lean() : dbQuestions;
  const byTextMap = new Map(allDbQuestions.map((q) => [(q.text || "").trim().toLowerCase(), q]));

  return qaPairs.map((pair) => {
    const dbQuestion = pair.questionId ? byId.get(String(pair.questionId)) : null;
    const textMatchedQuestion = byTextMap.get((pair.question || "").trim().toLowerCase());
    const finalQuestion = dbQuestion || textMatchedQuestion;

    return {
      questionId: pair.questionId,
      question: finalQuestion?.text || pair.question || "",
      transcript: pair.transcript || "",
    };
  });
}

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
      logger.error(`Offline e-KYC verification error: ${err.message}`);
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
    logger.error(`Aadhaar QR verification error: ${err.message}`);
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
    } else if (stageNum === 2) {
      // Training is now mandatory (see SKIPPABLE_STAGES above) — validation
      // no longer has a "&& !req.body.skipped" escape hatch, since that let
      // a direct API call bypass required fields by setting skipped:true on
      // this route even though the dedicated /stage/2/skip route (below)
      // already rejects stage 2.
      const { academyName, specialty, domain, courseName } = req.body;
      const courseOrSpec = courseName || specialty || domain;
      if (!academyName || !courseOrSpec) {
        return res.status(400).json({ message: "Stage 2 incomplete: Academy / Institute name and Specialty / Domain are required." });
      }
    } else if (stageNum === 3) {
      // Certification is now mandatory — same reasoning as Stage 2 above.
      // Also now requires the certificate document itself (docName, set by
      // POST /upload/doc/3 before this save) — a self-typed member ID with
      // nothing to show a human reviewer isn't verifiable at all, and this
      // is what staff actually review in the new Certification Documents
      // queue (see certStatus handling below and routes/staff.js
      // /verify-certification).
      const { certName, certificationName, certCode, memberId, docName } = req.body;
      const cName = certName || certificationName || certCode;
      if (!cName || !memberId) {
        return res.status(400).json({ message: "Stage 3 incomplete: Certification name and Member / Cert ID are required." });
      }
      if (!docName && !candidate.stage3?.docName) {
        return res.status(400).json({ message: "Stage 3 incomplete: Please upload your certificate document — this is what our staff review to confirm it's genuine." });
      }
    } else if (stageNum === 4) {
      // Single-attempt policy: once a foundationScore has been recorded,
      // block ANY further save to stage 4 - including one that carries a
      // new score. BUG FIX (2026-08-21): this used to only block a
      // resubmission that OMITTED foundationScore, which let a direct API
      // call (bypassing AssessmentRunner.jsx's client-side lock) retake the
      // test and silently overwrite an already-locked score - exactly the
      // case "single attempt" is supposed to prevent.
      if (candidate.stage4 && candidate.stage4.foundationScore !== undefined) {
        return res.status(400).json({ message: "Single-attempt policy: Stage 4 Assessment has already been completed and locked. Retakes are not permitted." });
      }
      if (req.body.foundationScore === undefined) {
        return res.status(400).json({ message: "Stage 4 incomplete: Proctored assessment test must be completed before saving." });
      }
    } else if (stageNum === 5) {
      if (!req.body.aiScore && !req.body.videoUrl && !candidate.stage5?.videoUrl) {
        return res.status(400).json({ message: "Stage 5 incomplete: AI Video Assessment, AI Audio Interview, or video file must be submitted." });
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

    // Certification authenticity is decided by staff, never by the
    // candidate's own request — force certStatus to "pending" on every
    // stage 3 save server-side (ignoring anything the client sent for it)
    // so a direct API call can't self-mark a certificate verified. A
    // resubmission after a rejection also goes back to "pending" here,
    // which is what re-queues it for staff review. See
    // routes/staff.js certificationQueue / POST /verify-certification.
    if (stageNum === 3) {
      candidate.stage3.certStatus = "pending";
      candidate.stage3.certVerifiedAt = null;
      candidate.stage3.certVerifiedBy = null;
      candidate.stage3.certRejectionReason = "";
    }

    candidate.markModified(key);

    if (stageNum === 1) {
      candidate.manualResume = {
        ...(candidate.manualResume || {}),
        fullName: req.body.fullName || candidate.stage1?.fullName,
        jobTitle: req.body.currentRole || candidate.stage1?.currentRole,
        mobile: req.body.mobile || candidate.stage1?.mobile,
        email: req.body.email || candidate.stage1?.email,
        city: req.body.city || candidate.stage1?.city,
        state: req.body.state || candidate.stage1?.state,
        country: req.body.country || candidate.stage1?.country,
        linkedin: req.body.linkedin || candidate.stage1?.linkedin,
        summary: req.body.summary || candidate.stage1?.summary,

        certName: candidate.stage3?.certName || candidate.stage3?.certificationName || "AAPC Certified Professional Coder (CPC)",
        issuingBody: candidate.stage3?.issuingBody || "AAPC",
        memberId: candidate.stage3?.memberId || "AAPC-987654",
        issueDate: candidate.stage3?.issueDate || "2021",

        codeSets: req.body.codeSets || candidate.stage1?.codeSets,
        specializedKnowledge: req.body.specializedKnowledge || candidate.stage1?.specializedKnowledge,
        ehrSoftware: req.body.ehrSoftware || candidate.stage1?.ehrSoftware,
        coreCompetencies: req.body.coreCompetencies || candidate.stage1?.coreCompetencies,

        skills: req.body.skills || candidate.stage1?.skills,
        workHistory: req.body.workHistory || candidate.stage1?.workHistory || [],
        education: req.body.education || candidate.stage1?.education || [],
      };
      candidate.markModified("manualResume");
    }

    if (!candidate.completedStages.includes(stageNum)) {
      candidate.completedStages.push(stageNum);
    }
    await candidate.save();

    const scoring = calculateVerificationScore(candidate.completedStages);
    res.json({ candidate, ...scoring });
  } catch (err) {
    logger.error(`Error saving stage ${req.params.n}: ${err.message}`);
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
    logger.error(`Video platform sync error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to sync platform results." });
  }
});

// GET /api/candidate/interview-questions?mode=video|audio - Ordered question
// list for the Stage 5 AI Video Assessment / AI Audio Interview, as configured
// by staff in the Staff Hub. Answer keys are NEVER included here - grading
// happens entirely server-side in /ai-video/assess and /ai-audio/assess.
router.get("/interview-questions", async (req, res) => {
  try {
    const mode = req.query.mode === "video" ? "video" : "audio";
    let questions = await InterviewQuestion.find({ active: true, mode: { $in: [mode, "both"] } })
      .sort({ order: 1, createdAt: 1 })
      .select("_id text")
      .lean();

    if (!questions.length) {
      // No staff-configured questions yet for this mode - fall back to a
      // small built-in set so the interview still works end-to-end.
      questions = DEFAULT_INTERVIEW_QUESTIONS[mode].map((text, idx) => ({ _id: `default-${idx + 1}`, text }));
    }

    res.json({ questions: questions.map((q) => ({ id: String(q._id), question: q.text })) });
  } catch (err) {
    logger.error(`Fetch interview questions error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to load interview questions." });
  }
});

// POST /api/candidate/ai-video/assess - Live AI Video Verification & Spoken
// Communication Assessment. Scored entirely by AI on communication quality
// (clarity, fluency, vocabulary/grammar, confidence & delivery) - not
// answer correctness, and not staff-reviewed before the score is final.
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

      let qaPairs = []; // [{ questionId, question, transcript }] from the browser
      let proctorLogs = {};

      if (req.body.qaPairs) {
        try {
          qaPairs = JSON.parse(req.body.qaPairs);
        } catch (e) {
          // Malformed JSON from the client - leave the field at its default
          // ([] / {}) rather than failing the whole request over it.
        }
      }
      if (req.body.proctorLogs) {
        try {
          proctorLogs = JSON.parse(req.body.proctorLogs);
        } catch (e) {
          // Malformed JSON from the client - leave the field at its default
          // ([] / {}) rather than failing the whole request over it.
        }
      }

      const fileUrl = req.file?.fileUrl || candidate.stage5?.videoUrl || "https://res.cloudinary.com/demo/video/upload/sample.mp4";

      const enrichedPairs = await enrichQaPairsWithAnswerKey(qaPairs);
      const evaluation = await evaluateAiVideoAssessment(enrichedPairs, proctorLogs);

      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        interviewMode: "video",
        videoUrl: fileUrl,
        // evaluation.qaPairs carries the original transcript PLUS
        // translatedTranscript/detectedLanguage per question (see
        // evaluateAiVideoAssessment) - persisting that instead of the raw
        // browser qaPairs is what makes the translation survive page
        // reloads/report re-views, not just this one response.
        qaPairs: evaluation.qaPairs || qaPairs,
        // aiScore is now a communication score (clarity/fluency/vocabulary &
        // grammar/confidence, averaged) - not an answer-correctness score.
        aiScore: evaluation.overallScore,
        rubric: evaluation.rubric,
        answerNotes: evaluation.answerNotes,
        feedback: evaluation.feedback,
        livenessVerified: evaluation.livenessVerified,
        proctoringDeductions: evaluation.proctoringDeductions,
        completedAt: new Date(),
      };
      candidate.markModified("stage5");

      if (!candidate.completedStages.includes(5)) {
        candidate.completedStages.push(5);
      }

      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);
      res.json({
        success: true,
        message: `AI Video Interview submitted! Communication Score: ${evaluation.overallScore}%`,
        evaluation,
        videoUrl: fileUrl,
        candidate,
        ...scoring,
      });
    } catch (err) {
      logger.error(`AI Video Assessment error: ${err.message}`);
      res.status(500).json({ message: err.message || "Failed to process AI Video Assessment." });
    }
  }
);

// POST /api/candidate/ai-audio/assess - Live AI Audio Interview (voice-led,
// camera on for proctoring only from interview-start to interview-end).
// Uploads under the "video" field since the recording now carries both
// tracks; graded the same way as the video assessment, against the
// staff-configured answer key.
router.post(
  "/ai-audio/assess",
  upload.single("video"),
  handleUpload({ resourceType: "video" }),
  async (req, res) => {
    try {
      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

      if (!candidate.completedStages.includes(1)) {
        return res.status(400).json({ message: "You must complete Stage 1 before taking the Stage 5 Audio Interview." });
      }

      let qaPairs = []; // [{ questionId, question, transcript }] from the browser
      let proctorLogs = {};

      if (req.body.qaPairs) {
        try {
          qaPairs = JSON.parse(req.body.qaPairs);
        } catch (e) {
          // Malformed JSON from the client - leave the field at its default
          // ([] / {}) rather than failing the whole request over it.
        }
      }
      if (req.body.proctorLogs) {
        try {
          proctorLogs = JSON.parse(req.body.proctorLogs);
        } catch (e) {
          // Malformed JSON from the client - leave the field at its default
          // ([] / {}) rather than failing the whole request over it.
        }
      }

      const fileUrl = req.file?.fileUrl || candidate.stage5?.videoUrl || "";

      const enrichedPairs = await enrichQaPairsWithAnswerKey(qaPairs);
      const evaluation = await evaluateAiVideoAssessment(enrichedPairs, proctorLogs);

      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        interviewMode: "audio",
        videoUrl: fileUrl,
        // See the matching comment in /ai-video/assess above - this carries
        // translatedTranscript/detectedLanguage per question so it survives
        // page reloads, not just this one response.
        qaPairs: evaluation.qaPairs || qaPairs,
        // aiScore is now a communication score (clarity/fluency/vocabulary &
        // grammar/confidence, averaged) - not an answer-correctness score.
        aiScore: evaluation.overallScore,
        rubric: evaluation.rubric,
        answerNotes: evaluation.answerNotes,
        feedback: evaluation.feedback,
        livenessVerified: evaluation.livenessVerified,
        proctoringDeductions: evaluation.proctoringDeductions,
        completedAt: new Date(),
      };
      candidate.markModified("stage5");

      if (!candidate.completedStages.includes(5)) {
        candidate.completedStages.push(5);
      }

      await candidate.save();

      const scoring = calculateVerificationScore(candidate.completedStages);
      res.json({
        success: true,
        message: `AI Audio Interview submitted! Communication Score: ${evaluation.overallScore}%`,
        evaluation,
        videoUrl: fileUrl,
        candidate,
        ...scoring,
      });
    } catch (err) {
      logger.error(`AI Audio Interview assessment error: ${err.message}`);
      res.status(500).json({ message: err.message || "Failed to process AI Audio Interview." });
    }
  }
);

// ---------------------------------------------------------------------------
// Live AI Technical Mock Interview ("Messi") - Stage 8 Track's optional
// practice tool (frontend/src/components/ClaudeMockInterviewBot.jsx). A full
// live, voice-led, dynamically-generated 10-question interview with natural
// follow-ups - replaces the old shuffle-and-compare bot that used to live at
// /claude-mock-interview and /claude-compare-answer above.
//
// Session state is persisted at candidate.stage8.aiInterview (same
// loosely-typed-Mixed convention every other stage already uses) so a
// browser refresh recovers mid-interview instead of losing progress, and so
// Stage8Track's "Interview Completed / View Result / Retake" card has
// something to read on load. mockScore/mockInterviewCompleted on stage8
// itself are still set on completion, unchanged, so Stage8Track.jsx's
// existing submit payload keeps working exactly as it does today.
// ---------------------------------------------------------------------------

async function buildFreshAiInterviewSession(candidate) {
  const candidateName = candidate.stage1?.fullName || "Candidate";
  const role = candidate.stage1?.currentRole || "Medical Coder";
  const experienceYears = candidate.stage1?.experience ?? null;

  const questions = await generateInterviewQuestions({ candidateName, role, experienceYears });

  return {
    status: "IN_PROGRESS",
    candidateName,
    role,
    experienceYears,
    questions,
    turns: [],
    questionRecords: [],
    currentQuestionIndex: 0,
    followUpCountForCurrent: 0,
    proctorLogs: { tabSwitches: 0, focusLosses: 0 },
    startedAt: new Date(),
    endedAt: null,
    result: null,
  };
}

// Shared by the natural end-of-interview path (last question answered, or
// the candidate says "stop the interview") and the explicit End Interview
// button - both need the exact same finalize behavior.
async function finalizeAiInterviewSession(candidate, session, status) {
  const result = await generateFinalReport({
    candidateName: session.candidateName,
    role: session.role,
    questionRecords: session.questionRecords,
  });
  session.status = status; // "COMPLETED" | "STOPPED"
  session.endedAt = new Date();
  session.result = result;

  candidate.stage8 = {
    ...(candidate.stage8 || {}),
    aiInterview: session,
    // Kept in sync with the pre-existing Stage8Track.jsx contract - it reads
    // these two fields off `existingData` regardless of how the session
    // that produced them was built.
    mockScore: result.overallScore,
    mockInterviewCompleted: true,
  };
  candidate.markModified("stage8");
  return result;
}

// GET /api/candidate/ai-interview/state - current/last AI Interview session,
// for resume-on-refresh and for the Stage 8 "Interview Completed" card.
router.get("/ai-interview/state", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    res.json({ session: candidate.stage8?.aiInterview || { status: "NOT_STARTED" } });
  } catch (err) {
    logger.error(`AI Interview state fetch error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to load AI Interview session." });
  }
});

// POST /api/candidate/ai-interview/start - generates (or resumes) a session.
// body: { retake?: boolean } - retake explicitly discards a COMPLETED/STOPPED
// session and starts a fresh one; otherwise an IN_PROGRESS session is simply
// handed back rather than regenerated out from under the candidate.
router.post("/ai-interview/start", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });
    if (!candidate.completedStages.includes(1)) {
      return res.status(400).json({ message: "You must complete Stage 1 before starting the AI Interview." });
    }

    const existing = candidate.stage8?.aiInterview;
    const retake = Boolean(req.body?.retake);

    if (existing && existing.status === "IN_PROGRESS" && !retake) {
      const currentQ = existing.questions[existing.currentQuestionIndex];
      return res.json({
        session: existing,
        messiReply: `Welcome back - let's pick up where we left off. Question ${existing.currentQuestionIndex + 1} of ${existing.questions.length}: ${currentQ?.question || ""}`,
      });
    }

    const session = await buildFreshAiInterviewSession(candidate);
    candidate.stage8 = { ...(candidate.stage8 || {}), aiInterview: session };
    candidate.markModified("stage8");
    await candidate.save();

    const firstQ = session.questions[0];
    const messiReply = `Hi ${session.candidateName}! I'm Messi, and I'll be conducting your technical mock interview today for the ${session.role} track. I'll ask you ${session.questions.length} questions based on your role and experience - take your time with your answers. Let's begin.\n\n${firstQ.question}`;

    res.json({ session, messiReply });
  } catch (err) {
    logger.error(`AI Interview start error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to start AI Interview." });
  }
});

// POST /api/candidate/ai-interview/turn - body: { candidateUtterance, proctorLogs? }
// Processes one candidate utterance (typed or transcribed) and returns
// Messi's reply plus the updated interview state.
router.post("/ai-interview/turn", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    const session = candidate.stage8?.aiInterview;
    if (!session || session.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "No active AI Interview session. Start a new one first." });
    }

    if (req.body?.proctorLogs && typeof req.body.proctorLogs === "object") {
      session.proctorLogs = {
        tabSwitches: Number(req.body.proctorLogs.tabSwitches) || session.proctorLogs?.tabSwitches || 0,
        focusLosses: Number(req.body.proctorLogs.focusLosses) || session.proctorLogs?.focusLosses || 0,
      };
    }

    const utterance = String(req.body?.candidateUtterance || "").trim();
    const currentIndex = session.currentQuestionIndex;
    const currentQuestion = session.questions[currentIndex];

    const turnResult = await getMessiTurn({ session, candidateUtterance: utterance });

    session.turns.push({
      questionIndex: currentIndex,
      questionText: currentQuestion.question,
      candidateAnswer: utterance,
      intent: turnResult.intent,
      evaluation: turnResult.evaluation,
      score: turnResult.score,
      messiReply: turnResult.messiReply,
      isFollowUp: session.followUpCountForCurrent > 0,
      flags: turnResult.evaluation === "no_answer" && utterance ? ["very_short_answer"] : [],
      timestamp: new Date(),
    });

    let interviewEnded = false;

    if (turnResult.intent === "stop") {
      interviewEnded = true;
    } else if (["hint", "repeat", "clarify", "unclear"].includes(turnResult.intent)) {
      // Same question (or pending follow-up) again - no record change, no advance.
    } else {
      // "answer" or "skip" - record this question's (or follow-up's) result,
      // then decide whether to open a follow-up or advance.
      const isFollowUpAnswer = session.followUpCountForCurrent > 0;
      const existingRecord = session.questionRecords.find((r) => r.index === currentIndex);

      if (isFollowUpAnswer && existingRecord) {
        existingRecord.followUp = {
          question: existingRecord.followUp?.question || "",
          candidateAnswer: utterance,
          evaluation: turnResult.evaluation,
          score: turnResult.score,
          missingConcepts: turnResult.missingConcepts,
        };
      } else {
        session.questionRecords.push({
          index: currentIndex,
          question: currentQuestion.question,
          expectedConcepts: currentQuestion.expectedConcepts,
          candidateAnswer: utterance,
          evaluation: turnResult.evaluation,
          score: turnResult.score,
          missingConcepts: turnResult.missingConcepts,
          followUp: turnResult.askFollowUp
            ? { question: turnResult.messiReply, candidateAnswer: "", evaluation: "no_answer", score: 0, missingConcepts: [] }
            : null,
        });
      }

      if (turnResult.askFollowUp && !isFollowUpAnswer) {
        session.followUpCountForCurrent = 1; // still the same question - awaiting the follow-up answer
      } else if (currentIndex >= session.questions.length - 1) {
        interviewEnded = true;
      } else {
        session.currentQuestionIndex = currentIndex + 1;
        session.followUpCountForCurrent = 0;
      }
    }

    let result = null;
    if (interviewEnded) {
      result = await finalizeAiInterviewSession(candidate, session, turnResult.intent === "stop" ? "STOPPED" : "COMPLETED");
    } else {
      candidate.stage8 = { ...(candidate.stage8 || {}), aiInterview: session };
      candidate.markModified("stage8");
    }
    await candidate.save();

    res.json({
      messiReply: turnResult.messiReply,
      nextQuestion: interviewEnded ? null : session.questions[session.currentQuestionIndex],
      progress: { index: session.currentQuestionIndex, total: session.questions.length },
      interviewEnded,
      result,
      session,
    });
  } catch (err) {
    logger.error(`AI Interview turn error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to process AI Interview turn." });
  }
});

// POST /api/candidate/ai-interview/end - explicit "End Interview" button path.
// body: { proctorLogs? }
router.post("/ai-interview/end", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    const session = candidate.stage8?.aiInterview;
    if (!session || session.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "No active AI Interview session to end." });
    }

    if (req.body?.proctorLogs && typeof req.body.proctorLogs === "object") {
      session.proctorLogs = {
        tabSwitches: Number(req.body.proctorLogs.tabSwitches) || session.proctorLogs?.tabSwitches || 0,
        focusLosses: Number(req.body.proctorLogs.focusLosses) || session.proctorLogs?.focusLosses || 0,
      };
    }

    const result = await finalizeAiInterviewSession(candidate, session, "STOPPED");
    await candidate.save();

    res.json({ session, result });
  } catch (err) {
    logger.error(`AI Interview end error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to end AI Interview." });
  }
});

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
    logger.error(`Save manual resume error: ${err.message}`);
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

  // Job search / apply eligibility gate: every stage must be verified
  // (all 8, now including Training and Certification since they're no
  // longer skippable) AND the overall score must be above 90%. Mirrors the
  // check in frontend/src/pages/Jobs.jsx, but enforced here too since the
  // frontend gate is only a UI convenience — this is the real one.
  const eligibility = calculateVerificationScore(candidate.completedStages);
  const isFullyVerified = VALID_STAGES.every((n) => candidate.completedStages.includes(n));
  if (!isFullyVerified || eligibility.score <= JOB_SEARCH_MIN_SCORE) {
    return res.status(403).json({
      message: `Job applications are only open to fully verified candidates with a score above ${JOB_SEARCH_MIN_SCORE}%. Your current score is ${eligibility.score}/100 — complete the remaining verification stages to unlock job search.`,
    });
  }

  // A jobId now resolves against two possible sources: the legacy "first
  // JD" published straight off Company (jdPublished/jobId, from onboarding
  // Stage 9), or a Job document posted afterwards from the Job Posts screen
  // (see routes/company.js POST /jobs). Check the newer source first since
  // it's the one companies use once they're fully onboarded.
  let companyId = null;
  let roleTitle = "the role";
  const postedJob = await Job.findOne({ jobId, published: true });
  if (postedJob) {
    companyId = postedJob.companyId;
    roleTitle = postedJob.fields?.roletitle || roleTitle;
  } else {
    const company = await Company.findOne({ jobId, jdPublished: true });
    if (company) {
      companyId = company._id;
      roleTitle = company.stage9?.roletitle || roleTitle;
    }
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

    // Confirmation email - previously an applicant had no proof their
    // application actually went through beyond the in-page toast. See
    // IMPROVEMENT_ROADMAP.md "No candidate-facing email notifications."
    // Best-effort: never blocks the response.
    if (candidate.email) {
      const company = await Company.findById(companyId).select("companyName").lean();
      sendTransactionalEmail({
        to: candidate.email,
        toName: candidate.stage1?.fullName,
        subject: `Application received: ${roleTitle}`,
        html: wrapEmailTemplate(
          "We've received your application",
          `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Your application for <strong>${roleTitle}</strong> at <strong>${company?.companyName || "the employer"}</strong> has been submitted.</p>
           <p style="color: #64748B; font-size: 13px;">We'll email you again as soon as the employer updates your application status. You can also check progress any time from the "My Applications" tab on the Jobs page.</p>`
        ),
      }).catch((err) => logger.warn(`Application-received email failed for ${candidate.email}: ${err.message}`));
    }

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
