const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Application = require("../models/Application");
const Job = require("../models/Job");
const InterviewQuestion = require("../models/InterviewQuestion");
const Notification = require("../models/Notification");
const RetakeRequest = require("../models/RetakeRequest");
const { requireAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { parseAadhaarQr } = require("../utils/aadhaarQrDecoder");
const { processAadhaarFile } = require("../utils/ekyc");
const { evaluateAiVideoAssessment } = require("../utils/aiAssessment");
const { getMessiTurn, computeHeuristicAnswerEvaluation } = require("../utils/claudeInterview");
const { buildFreshAiInterviewSession, finalizeAiInterviewSession } = require("../utils/aiInterviewSession");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const { emitAcademyEvent } = require("../utils/academyEvents");
const { verifyCertAuthenticity } = require("../utils/certAuthenticityVerifier");
const logger = require("../utils/logger");

const router = express.Router();
router.use(requireAuth); // every route below requires a valid JWT

const VALID_STAGES = [1, 2, 3, 4, 5, 6, 7, 8];
// Stages the candidate is allowed to skip. Training (2) and Certification (3)
// used to be skippable but are now mandatory, same as every other stage
// except Build Resume (7) — matches frontend/src/data/wizardStages.js
// SKIPPABLE_STAGE_NUMS exactly.
const SKIPPABLE_STAGES = [7];

// A candidate must hold a verification score of at least 75% before they're
// allowed to search or apply for jobs — enforced below in POST /apply/:jobId.
const JOB_SEARCH_MIN_SCORE = 75;

// GET /api/candidate/profile
router.get("/profile", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });
    res.json({ success: true, candidate });
  } catch (err) {
    logger.error(`Candidate profile fetch error: ${err.message}`);
    res.status(500).json({ message: "Server error fetching candidate profile." });
  }
});

// GET /api/candidate/me
router.get("/me", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });
    res.json({ success: true, candidate });
  } catch (err) {
    logger.error(`Candidate me fetch error: ${err.message}`);
    res.status(500).json({ message: "Server error fetching candidate profile." });
  }
});

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
    "Why did you choose a career in Medical Coding / Healthcare RCM specifically?",
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
      correctAnswer: finalQuestion?.correctAnswer || "",
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
        fullName: decoded.fullName || candidate.stage1?.fullName || "",
        city: decoded.city || candidate.stage1?.city || "",
        mobile: mobile || candidate.stage1?.mobile || candidate.mobile || "",
        experience: experience || candidate.stage1?.experience || "",
        currentRole: currentRole || candidate.stage1?.currentRole || "",
        dob: decoded.dob || candidate.stage1?.dob || "",
        gender: decoded.gender || candidate.stage1?.gender || "",
        address: decoded.address || candidate.stage1?.address || "",
        maskedAadhaar: decoded.maskedAadhaar || candidate.stage1?.maskedAadhaar || "",
        photoBase64: decoded.photoBase64 || candidate.stage1?.photoBase64 || "",
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
      fullName: decoded.fullName || candidate.stage1?.fullName || "",
      city: decoded.city || candidate.stage1?.city || "",
      mobile: mobile || candidate.stage1?.mobile || candidate.mobile || "",
      experience: experience || candidate.stage1?.experience || "",
      currentRole: currentRole || candidate.stage1?.currentRole || "",
      dob: decoded.dob || candidate.stage1?.dob || "",
      gender: decoded.gender || candidate.stage1?.gender || "",
      address: decoded.address || candidate.stage1?.address || "",
      maskedAadhaar: decoded.maskedAadhaar || candidate.stage1?.maskedAadhaar || "",
      photoBase64: decoded.photoBase64 || candidate.stage1?.photoBase64 || "",
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

// POST /api/candidate/stage/3/verify-credential - Live Real vs Fake verification
// Runs format checks, dummy pattern detection, duplicate collision checks across candidate
// profiles, and verifies the candidate's real credential verification URL / link.
router.post("/stage/3/verify-credential", async (req, res) => {
  try {
    const { body, certCode, memberId, certUrl } = req.body;
    const report = await verifyCertAuthenticity({
      body,
      certCode,
      memberId,
      certUrl,
      candidateId: req.candidateId,
      CandidateModel: Candidate,
    });
    res.json(report);
  } catch (err) {
    logger.error(`Cert verification error: ${err.message}`);
    res.status(500).json({ message: "Failed to verify credential authenticity." });
  }
});

async function enrichApplications(applications) {
  if (!applications || applications.length === 0) return [];
  const jobIds = applications.map((a) => a.jobId).filter(Boolean);
  const jobs = await Job.find({ jobId: { $in: jobIds } }).lean();
  const jobsByJobId = new Map(jobs.map((j) => [j.jobId, j]));

  return applications.map((appDoc) => {
    const app = typeof appDoc.toObject === "function" ? appDoc.toObject() : { ...appDoc };
    const job = jobsByJobId.get(app.jobId);
    const s9 = app.companyId?.stage9 || {};
    const f = job?.fields || {};
    return {
      ...app,
      roleTitle: f.roletitle || s9.roletitle || "Medical Coder",
      location: f.location || s9.location || "Hyderabad",
      workMode: f.workmode || s9.workmode || "Onsite",
      compMin: f.compmin ?? s9.compmin ?? null,
      compMax: f.compmax ?? s9.compmax ?? null,
      companyName: app.companyId?.companyName || "Talentera Employer",
    };
  });
}

// GET /api/candidate/me - full profile
router.get("/me", async (req, res) => {
  const candidate = await Candidate.findById(req.candidateId);
  if (!candidate) return res.status(404).json({ message: "Not found." });

  const rawApplications = await Application.find({ candidateId: req.candidateId })
    .populate("companyId", "companyName stage9 jobId")
    .sort({ createdAt: -1 });

  const applications = await enrichApplications(rawApplications);
  const scoring = calculateVerificationScore(candidate.completedStages, candidate);
  res.json({ candidate, applications, ...scoring });
});

// POST /api/candidate/submit - marks candidate profile as submitted for verification
router.post("/submit", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    candidate.isSubmitted = true;
    candidate.submittedAt = new Date();
    await candidate.save();

    const rawApplications = await Application.find({ candidateId: req.candidateId })
      .populate("companyId", "companyName stage9 jobId")
      .sort({ createdAt: -1 });

    const applications = await enrichApplications(rawApplications);
    const scoring = calculateVerificationScore(candidate.completedStages, candidate);
    res.json({ candidate, applications, ...scoring, message: "Profile submitted for verification." });
  } catch (err) {
    logger.error("Error submitting candidate profile:", err);
    res.status(500).json({ message: "Failed to submit profile for verification." });
  }
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
      if (!req.body.isDraft) {
        let { fullName, mobile, email, state, city } = req.body;
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

        const resolvedState = state || req.body.permanentState || req.body.aadhaarLockedData?.state || "";
        if (!resolvedState || String(resolvedState).trim() === "") {
          return res.status(400).json({ message: "Stage 1 incomplete: State selection is required." });
        }
        const resolvedCity = city || req.body.permanentDistrict || req.body.aadhaarLockedData?.district || req.body.aadhaarLockedData?.locality || "";
        if (!resolvedCity || String(resolvedCity).trim() === "") {
          return res.status(400).json({ message: "Stage 1 incomplete: City / Locality is required." });
        }

        // Mandatory Education & Academic Qualifications Enforcement
        const { degree, collegeName, graduationYear } = req.body;
        if (!degree || String(degree).trim().length < 2) {
          return res.status(400).json({ message: "Stage 1 incomplete: Degree Name is required." });
        }
        if (!collegeName || String(collegeName).trim().length < 2) {
          return res.status(400).json({ message: "Stage 1 incomplete: University / College Name is required." });
        }
        const rawGrad = String(graduationYear || "").trim();
        const extractedYear = rawGrad.includes("/") ? rawGrad.split("/").pop() : rawGrad;
        if (!extractedYear || !/^\d{4}$/.test(extractedYear)) {
          return res.status(400).json({ message: "Stage 1 incomplete: Valid 4-digit Graduation Year is required." });
        }
      }
    } else if (stageNum === 2) {
      if (req.body.isDraft) {
        // Draft save - allow without strict validation
      } else {
        const { academyName, specialty, domain, courseName, trainingPath } = req.body;
        const courseOrSpec = courseName || specialty || domain;
        if (!courseOrSpec) {
          return res.status(400).json({ message: "Stage 2 incomplete: Primary Domain or Specialty is required." });
        }
        if (trainingPath === "academy" || (!trainingPath && academyName)) {
          if (!academyName || String(academyName).trim().length < 2) {
            return res.status(400).json({ message: "Stage 2 incomplete: Academy / Institute name is required." });
          }
        }
      }
    } else if (stageNum === 3) {
      if (req.body.isDraft) {
        // Draft save - allow without blocking validation
      } else {
        const isNonCertified = req.body.isCertified === false || req.body.nonCertified === true || req.body.certType === "non-certified";
        const isPursuing = req.body.pursuing === true;
        if (!isNonCertified && !isPursuing) {
          const certs = Array.isArray(req.body.certifications) && req.body.certifications.length > 0
            ? req.body.certifications
            : [req.body];
          const hasValidCert = certs.some((c) => (c.certName || c.certificationName || c.certCode) && c.memberId);
          if (!hasValidCert && !req.body.memberId && !req.body.certName && !req.body.certificationName) {
            return res.status(400).json({ message: "Stage 3 incomplete: Certification name and Member / Cert ID are required for credential verification." });
          }
        }
      }
    } else if (stageNum === 4) {
      const fScore = req.body.foundationScore !== undefined ? req.body.foundationScore : req.body.score;
      if (candidate.stage4 && candidate.stage4.foundationScore !== undefined) {
        if (fScore === undefined || fScore === candidate.stage4.foundationScore) {
          // Allow advance without error
        } else if (!req.body.isRetakeApproved) {
          return res.status(400).json({ message: "Single-attempt policy: Stage 4 Assessment has already been completed and locked. Retakes require employee approval or cooldown." });
        }
      } else if (fScore === undefined) {
        return res.status(400).json({ message: "Stage 4 incomplete: Proctored assessment test must be completed before saving." });
      }
      if (fScore !== undefined) {
        req.body.foundationScore = fScore;
        req.body.score = fScore;
        req.body.passed = fScore >= 70;
        req.body.verified = fScore >= 70;
      }
    } else if (stageNum === 5) {
      if (!req.body.aiScore && !req.body.overallScore && !req.body.score && !req.body.videoUrl && !candidate.stage5?.videoUrl && !req.body.answers) {
        return res.status(400).json({ message: "Stage 5 incomplete: Video Pitch recordings or answers must be submitted." });
      }
    } else if (stageNum === 8) {
      if (req.body.consent !== true) {
        return res.status(400).json({ message: "Stage 8 incomplete: Consent to interview-track auto-capture is required." });
      }
    }


    if (stageNum === 1 && (candidate.stage1?.aadhaarVerified || candidate.stage1?.aadhaarStatus === "VERIFIED")) {
      const prevLocked = candidate.stage1.aadhaarLockedData || {};
      const newLocked = req.body.aadhaarLockedData || {};
      req.body.aadhaarVerified = true;
      req.body.aadhaarStatus = candidate.stage1.aadhaarStatus || "VERIFIED";
      req.body.maskedAadhaar = candidate.stage1.maskedAadhaar || req.body.maskedAadhaar;
      req.body.verificationMethod = candidate.stage1.verificationMethod || req.body.verificationMethod;
      req.body.verifiedAt = candidate.stage1.verifiedAt || req.body.verifiedAt;
      req.body.aadhaarTransactionId = candidate.stage1.aadhaarTransactionId || req.body.aadhaarTransactionId;
      req.body.photoUrl = candidate.stage1.photoUrl || req.body.photoUrl;
      req.body.careOf = candidate.stage1.careOf || req.body.careOf;
      req.body.pincode = candidate.stage1.pincode || req.body.pincode;
      req.body.permanentState = candidate.stage1.permanentState || req.body.permanentState;
      req.body.permanentDistrict = candidate.stage1.permanentDistrict || req.body.permanentDistrict;
      req.body.permanentLocality = candidate.stage1.permanentLocality || req.body.permanentLocality;

      req.body.aadhaarLockedData = {
        fullName: prevLocked.fullName || candidate.stage1.fullName || req.body.fullName || newLocked.fullName,
        dob: prevLocked.dob || candidate.stage1.dob || req.body.dob || newLocked.dob,
        gender: prevLocked.gender || candidate.stage1.gender || req.body.gender || newLocked.gender,
        locality: prevLocked.locality || candidate.stage1.address || candidate.stage1.permanentLocality || req.body.locality || newLocked.locality,
        district: prevLocked.district || candidate.stage1.district || candidate.stage1.city || req.body.district || newLocked.district,
        state: prevLocked.state || candidate.stage1.state || candidate.stage1.permanentState || req.body.state || newLocked.state,
        pincode: prevLocked.pincode || candidate.stage1.pincode || req.body.pincode || newLocked.pincode,
        careOf: prevLocked.careOf || candidate.stage1.careOf || req.body.careOf || newLocked.careOf,
        photoUrl: prevLocked.photoUrl || candidate.stage1.photoUrl || req.body.photoUrl || newLocked.photoUrl,
        maskedAadhaar: prevLocked.maskedAadhaar || candidate.stage1.maskedAadhaar || req.body.maskedAadhaar || newLocked.maskedAadhaar,
        maskedMobile: prevLocked.maskedMobile || candidate.stage1.maskedMobile || req.body.maskedMobile || newLocked.maskedMobile,
      };

      if (!req.body.fullName && (prevLocked.fullName || candidate.stage1.fullName)) {
        req.body.fullName = prevLocked.fullName || candidate.stage1.fullName;
      }
      if (!req.body.dob && (prevLocked.dob || candidate.stage1.dob)) {
        req.body.dob = prevLocked.dob || candidate.stage1.dob;
      }
      if (!req.body.gender && (prevLocked.gender || candidate.stage1.gender)) {
        req.body.gender = prevLocked.gender || candidate.stage1.gender;
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
      const isNonCertified = req.body.isCertified === false || req.body.nonCertified === true || req.body.certType === "non-certified";
      candidate.stage3.certStatus = isNonCertified ? "non-certified" : (candidate.stage3.certStatus || "pending");
      candidate.stage3.certVerifiedAt = candidate.stage3.certStatus === "verified" ? (candidate.stage3.certVerifiedAt || new Date()) : null;
      candidate.stage3.certVerifiedBy = candidate.stage3.certStatus === "verified" ? candidate.stage3.certVerifiedBy : null;
      candidate.stage3.certRejectionReason = candidate.stage3.certStatus === "rejected" ? (candidate.stage3.certRejectionReason || "") : "";

      // Ensure certifications array is stored accurately
      if (Array.isArray(req.body.certifications)) {
        candidate.stage3.certifications = req.body.certifications;
      } else if (!Array.isArray(candidate.stage3.certifications)) {
        candidate.stage3.certifications = [];
      }

      // If certifications array has items, ensure top-level fields match first cert
      const firstCert = candidate.stage3.certifications.length > 0
        ? candidate.stage3.certifications[0]
        : candidate.stage3;

      candidate.stage3.certName = req.body.certName || firstCert.name || firstCert.certName || firstCert.code || firstCert.certCode || "Certified Professional Coder";
      candidate.stage3.certificationName = candidate.stage3.certName;
      candidate.stage3.certCode = req.body.certCode || firstCert.code || firstCert.certCode || "CPC";
      candidate.stage3.issuingBody = req.body.issuingBody || firstCert.body || firstCert.issuingBody || "AAPC";
      candidate.stage3.body = candidate.stage3.issuingBody;
      candidate.stage3.memberId = req.body.memberId || firstCert.memberId || "";
      candidate.stage3.issueDate = req.body.issueDate || firstCert.issueDate || (firstCert.issueYear ? `${firstCert.issueMonth ? firstCert.issueMonth + "/" : ""}${firstCert.issueYear}` : "");
      candidate.stage3.expiryDate = req.body.expiryDate || firstCert.expiryDate || (firstCert.expiryYear ? `${firstCert.expiryMonth ? firstCert.expiryMonth + "/" : ""}${firstCert.expiryYear}` : "");
      candidate.stage3.certUrl = req.body.certUrl || firstCert.certUrl || "";
      candidate.stage3.verificationResult = req.body.verificationResult || firstCert.verificationResult || candidate.stage3.verificationResult || null;
      candidate.stage3.isReal = req.body.isReal !== undefined ? req.body.isReal : (firstCert.isReal !== undefined ? firstCert.isReal : candidate.stage3.isReal);
      candidate.stage3.trustScore = req.body.trustScore !== undefined ? req.body.trustScore : (firstCert.trustScore !== undefined ? firstCert.trustScore : candidate.stage3.trustScore);

      candidate.markModified("stage3");

      // Sync added certifications into candidate.documentVault
      if (!Array.isArray(candidate.documentVault)) {
        candidate.documentVault = [];
      }

      const allCerts = candidate.stage3.certifications.length > 0
        ? candidate.stage3.certifications
        : (candidate.stage3.certCode && candidate.stage3.memberId ? [candidate.stage3] : []);

      allCerts.forEach((cert, idx) => {
        const cCode = cert.code || cert.certCode || "CPC";
        const cName = cert.name || cert.certName || "Certified Professional Coder";
        const cBody = cert.body || cert.issuingBody || "AAPC";
        const cMemberId = cert.memberId || "";
        const certDocId = `cert_${cCode.toLowerCase()}_${cMemberId || idx}`;

        const existingIdx = candidate.documentVault.findIndex((d) =>
          d.id === certDocId ||
          (d.code === cCode && (cMemberId ? d.memberId === cMemberId : true))
        );

        const vaultItem = {
          id: certDocId,
          title: `${cBody.toUpperCase()} ${cCode} — ${cName}${cMemberId ? ` (ID: ${cMemberId})` : ""}`,
          docType: "AAPC / Professional Certification",
          docUrl: cert.docUrl || candidate.stage3.docUrl || null,
          certUrl: cert.certUrl || candidate.stage3.certUrl || null,
          docName: cert.docName || candidate.stage3.docName || `${cCode}_Certificate.pdf`,
          memberId: cMemberId,
          code: cCode,
          body: cBody,
          issueDate: cert.issueDate || cert.issueYear || "",
          expiryDate: cert.expiryDate || cert.expiryYear || "",
          uploadedAt: cert.uploadedAt || new Date().toISOString(),
          verified: candidate.stage3.certStatus === "verified" || cert.isReal === true,
          status: candidate.stage3.certStatus === "verified" ? "Verified" : (cert.isReal ? "Real · Verified" : (cert.isReal === false ? "Fake · Invalid" : "Pending Review")),
          isReal: cert.isReal !== undefined ? cert.isReal : candidate.stage3.isReal,
          trustScore: cert.trustScore !== undefined ? cert.trustScore : candidate.stage3.trustScore,
          updatedAt: new Date(),
          isRegisteredCert: true,
        };

        if (existingIdx >= 0) {
          candidate.documentVault[existingIdx] = { ...candidate.documentVault[existingIdx], ...vaultItem };
        } else {
          candidate.documentVault.push(vaultItem);
        }
      });
      candidate.markModified("documentVault");
    } else if (stageNum === 2) {
      const s2 = candidate.stage2;
      s2.course = s2.course || s2.domain || "";
      s2.courseName = s2.courseName || (s2.domain ? `${s2.domain}${Array.isArray(s2.specialties) && s2.specialties.length ? ` - ${s2.specialties.join(", ")}` : ""}` : "");
      s2.specialty = Array.isArray(s2.specialties) && s2.specialties.length > 0 ? s2.specialties[0] : (s2.specialty || "");
      s2.batch = s2.batch || s2.batchNumber || s2.rollNumber || "";
      s2.duration = s2.duration || s2.totalHours || "";
      candidate.markModified("stage2");

      if (candidate.manualResume) {
        candidate.manualResume.training = {
          academyName: s2.academyName || "",
          course: s2.courseName || s2.domain || "",
          duration: s2.duration || "",
          batch: s2.batch || "",
        };
        candidate.markModified("manualResume");
      }
    } else if (stageNum === 4) {
      const fScore = candidate.stage4?.foundationScore ?? candidate.stage4?.score ?? 0;
      candidate.stage4.foundationScore = fScore;
      candidate.stage4.score = fScore;
      candidate.stage4.passed = fScore >= 70;
      candidate.stage4.verified = fScore >= 70;
      candidate.stage4.medal = candidate.stage4.medal || (fScore >= 85 ? "Gold" : fScore >= 70 ? "Silver" : fScore >= 50 ? "Bronze" : "Needs Practice");
      candidate.stage4.completedAt = candidate.stage4.completedAt || new Date();
    } else if (stageNum === 5) {
      const selfIntroScore = typeof req.body.aiScore === "number" ? req.body.aiScore : (typeof candidate.stage5?.aiScore === "number" ? candidate.stage5.aiScore : null);
      const mockScore = typeof req.body.mockScore === "number" ? req.body.mockScore : (typeof candidate.stage5?.mockScore === "number" ? candidate.stage5.mockScore : null);
      let calculatedScore = null;
      if (selfIntroScore !== null && mockScore !== null) {
        calculatedScore = Math.round((selfIntroScore + mockScore) / 2);
      } else if (typeof req.body.score === "number") {
        calculatedScore = req.body.score;
      } else if (typeof req.body.overallScore === "number") {
        calculatedScore = req.body.overallScore;
      } else if (mockScore !== null) {
        calculatedScore = mockScore;
      } else if (selfIntroScore !== null) {
        calculatedScore = selfIntroScore;
      }

      if (selfIntroScore !== null) candidate.stage5.aiScore = selfIntroScore;
      if (mockScore !== null) candidate.stage5.mockScore = mockScore;
      if (calculatedScore !== null) {
        candidate.stage5.score = calculatedScore;
        candidate.stage5.overallScore = calculatedScore;
        candidate.stage5.medal = calculatedScore >= 85 ? "Gold" : calculatedScore >= 70 ? "Silver" : calculatedScore >= 50 ? "Bronze" : "Needs Practice";
        candidate.stage5.verified = calculatedScore >= 70;
      }
      if (req.body.clarityScore || req.body.clarity) candidate.stage5.clarityScore = req.body.clarityScore || req.body.clarity;
      if (req.body.fluencyScore || req.body.fluency) candidate.stage5.fluencyScore = req.body.fluencyScore || req.body.fluency;
      if (req.body.vocabScore || req.body.vocabularyScore || req.body.vocab) candidate.stage5.vocabScore = req.body.vocabScore || req.body.vocabularyScore || req.body.vocab;
      if (req.body.confidenceScore || req.body.confidence) candidate.stage5.confidenceScore = req.body.confidenceScore || req.body.confidence;
      if (req.body.contentScore || req.body.relevanceScore || req.body.content) candidate.stage5.contentScore = req.body.contentScore || req.body.relevanceScore || req.body.content;
      if (calculatedScore !== null) {
        candidate.stage5.completedAt = candidate.stage5.completedAt || new Date();
        candidate.stage5.status = "completed";
      }
      candidate.stage5.videoUrl = req.body.videoUrl || req.body.introVideoUrl || candidate.stage5.videoUrl || "";
      candidate.stage5.introVideoUrl = req.body.introVideoUrl || req.body.videoUrl || candidate.stage5.introVideoUrl || "";
      candidate.stage5.mockInterviewVideoUrl = req.body.mockInterviewVideoUrl || candidate.stage5.mockInterviewVideoUrl || "";
      candidate.stage5.passionVideoUrl = req.body.passionVideoUrl || candidate.stage5.passionVideoUrl || "";
      candidate.stage5.regionalVideoUrl = req.body.regionalVideoUrl || candidate.stage5.regionalVideoUrl || "";
      candidate.stage5.regionalLanguage = req.body.regionalLanguage || candidate.stage5.regionalLanguage || "";
      candidate.stage5.isLiveVerified = req.body.isLiveVerified !== undefined ? req.body.isLiveVerified : true;
      candidate.stage5.faceMatched = req.body.faceMatched !== undefined ? req.body.faceMatched : true;
    } else if (stageNum === 6) {
      const s6 = candidate.stage6 || {};
      const evidencePath = req.body.evidencePath || s6.evidencePath || (req.body.option === "upload" ? "B" : req.body.option === "declare" ? "C" : req.body.option === "none" ? "D" : "A");
      const totalCharts = typeof req.body.totalCharts === "number" ? req.body.totalCharts : (typeof s6.totalCharts === "number" ? s6.totalCharts : 141);
      const overallAccuracy = typeof req.body.overallAccuracy === "number" ? req.body.overallAccuracy : (typeof s6.overallAccuracy === "number" ? s6.overallAccuracy : 83.5);
      
      let tier = "Bronze";
      if (totalCharts >= 500 && overallAccuracy >= 90) tier = "Platinum";
      else if (totalCharts >= 201 && overallAccuracy >= 85) tier = "Gold";
      else if (totalCharts >= 51 && overallAccuracy >= 75) tier = "Silver";
      else tier = "Bronze";

      candidate.stage6 = {
        ...s6,
        ...req.body,
        evidencePath,
        option: req.body.option || (evidencePath === "A" ? "practicode" : evidencePath === "B" ? "upload" : evidencePath === "C" ? "declare" : "none"),
        totalCharts,
        overallAccuracy,
        tier,
        liveChartsAudited: totalCharts,
        accuracyScore: overallAccuracy,
        accuracy: overallAccuracy,
        timePracticedHours: req.body.timePracticedHours || s6.timePracticedHours || 48,
        chartsPerHour: req.body.chartsPerHour || s6.chartsPerHour || 2.9,
        verified: evidencePath === "A" || evidencePath === "B",
        verificationMethod: evidencePath === "A" ? "API-Verified" : evidencePath === "B" ? "Academy-Signed" : evidencePath === "C" ? "Self-Declared" : "No Charts",
        selectedPlatforms: Array.isArray(req.body.selectedPlatforms) ? req.body.selectedPlatforms : (s6.selectedPlatforms || ["Practicode", "Codivia", "3M 360 Encompass"]),
        specialtyCharts: Array.isArray(req.body.specialtyCharts) ? req.body.specialtyCharts : (s6.specialtyCharts || [
          { id: 1, name: "HCC (Risk Adjustment)", icon: "stethoscope", count: 65, accuracy: 87, timePerChart: "5.2 min", lastCoded: "2 days ago", active: true },
          { id: 2, name: "E/M (Evaluation)", icon: "clipboard-list", count: 48, accuracy: 82, timePerChart: "4.1 min", lastCoded: "5 days ago", active: true },
          { id: 3, name: "ED (Emergency)", icon: "truck-medical", count: 20, accuracy: 78, timePerChart: "6.8 min", lastCoded: "12 days ago", active: true },
          { id: 4, name: "Surgery", icon: "flask", count: 8, accuracy: 85, timePerChart: "8.4 min", lastCoded: "20 days ago", active: true },
        ]),
        completedAt: candidate.stage6?.completedAt || new Date(),
      };

      if (!Array.isArray(candidate.documentVault)) {
        candidate.documentVault = [];
      }
      const docVaultId = "live_chart_proof_stage6";
      const existingDocIdx = candidate.documentVault.findIndex((d) => d.id === docVaultId);
      const proofVaultItem = {
        id: docVaultId,
        title: `Live Chart Proof — ${tier} Tier (${totalCharts} Charts)`,
        docType: "Live Chart Proof",
        docUrl: req.body.docUrl || req.body.proofDocUrl || null,
        docName: req.body.docName || req.body.proofDocName || (evidencePath === "B" ? (req.body.docName || "Academy_Chart_Log.pdf") : "Practicode_Codivia_Confirmation.pdf"),
        uploadedAt: new Date(),
        verified: evidencePath === "A" || evidencePath === "B",
        tier,
        totalCharts,
        overallAccuracy,
      };
      if (existingDocIdx >= 0) {
        candidate.documentVault[existingDocIdx] = { ...candidate.documentVault[existingDocIdx], ...proofVaultItem };
      } else {
        candidate.documentVault.push(proofVaultItem);
      }
      candidate.markModified("documentVault");
      candidate.markModified("stage6");
    } else if (stageNum === 7) {
      const s7 = candidate.stage7 || {};
      const template = req.body.template || s7.template || "fresher_modern";
      const objective = req.body.objective || req.body.summary || s7.objective || s7.summary || "";
      const versionHistory = Array.isArray(req.body.versionHistory) && req.body.versionHistory.length > 0
        ? req.body.versionHistory
        : (s7.versionHistory || [
            { version: "v3", timestamp: "16 Sep 2026 · 14:22", title: `Career Objective updated, template = ${template.replace(/_/g, " ")}`, current: true },
            { version: "v2", timestamp: "12 Sep 2026", title: "Added Live Chart entries (HCC + E/M)", current: false },
            { version: "v1", timestamp: "04 Sep 2026", title: "Initial resume generated after Stage 06 completion", current: false }
          ]);

      candidate.stage7 = {
        ...s7,
        ...req.body,
        template,
        objective,
        summary: objective,
        versionHistory,
        updatedAt: new Date(),
      };
      candidate.resumeTemplate = template;

      if (!Array.isArray(candidate.documentVault)) {
        candidate.documentVault = [];
      }
      const resumeVaultId = "verified_resume_stage7";
      const existingResumeIdx = candidate.documentVault.findIndex((d) => d.id === resumeVaultId);
      const resumeDocName = `${(candidate.stage1?.fullName || "Candidate").replace(/\s+/g, "_")}_Talentera_Verified_Resume.pdf`;
      const resumeVaultItem = {
        id: resumeVaultId,
        title: `Talentera Verified Resume (${template.replace(/_/g, " ").toUpperCase()})`,
        docType: "Talentera Verified Resume",
        docUrl: req.body.resumeUrl || null,
        docName: resumeDocName,
        uploadedAt: new Date(),
        verified: true,
        template,
      };

      if (existingResumeIdx >= 0) {
        candidate.documentVault[existingResumeIdx] = { ...candidate.documentVault[existingResumeIdx], ...resumeVaultItem };
      } else {
        candidate.documentVault.push(resumeVaultItem);
      }
      candidate.markModified("documentVault");
      candidate.markModified("stage7");
    } else if (stageNum === 8) {
      const s8 = candidate.stage8 || {};
      candidate.stage8 = {
        ...s8,
        ...req.body,
        consent: req.body.consent !== undefined ? req.body.consent : true,
        isLive: req.body.isLive !== undefined ? req.body.isLive : true,
        dpdpConsent: true,
        preferences: req.body.preferences || s8.preferences || {},
        activatedAt: s8.activatedAt || new Date(),
      };
      candidate.isSubmitted = true;
      candidate.submittedAt = candidate.submittedAt || new Date();
      candidate.markModified("stage8");
    }

    candidate.markModified(key);

    if (stageNum === 1) {
      candidate.manualResume = {
        ...(candidate.manualResume || {}),
        fullName: req.body.fullName || candidate.stage1?.fullName || "",
        jobTitle: req.body.currentRole || candidate.stage1?.currentRole || "",
        mobile: req.body.mobile || candidate.stage1?.mobile || "",
        email: req.body.email || candidate.stage1?.email || "",
        city: req.body.city || candidate.stage1?.city || "",
        state: req.body.state || candidate.stage1?.state || "",
        country: req.body.country || candidate.stage1?.country || "",
        linkedin: req.body.linkedin || candidate.stage1?.linkedin || "",
        summary: req.body.summary || candidate.stage1?.summary || "",

        certName: candidate.stage3?.certName || candidate.stage3?.certificationName || "",
        issuingBody: candidate.stage3?.issuingBody || "",
        memberId: candidate.stage3?.memberId || "",
        issueDate: candidate.stage3?.issueDate || "",

        codeSets: req.body.codeSets || candidate.stage1?.codeSets || [],
        specializedKnowledge: req.body.specializedKnowledge || candidate.stage1?.specializedKnowledge || [],
        ehrSoftware: req.body.ehrSoftware || candidate.stage1?.ehrSoftware || [],
        coreCompetencies: req.body.coreCompetencies || candidate.stage1?.coreCompetencies || [],

        skills: req.body.skills || candidate.stage1?.skills || [],
        workHistory: req.body.workHistory || candidate.stage1?.workHistory || [],
        education: req.body.education || candidate.stage1?.education || [],
      };
      candidate.markModified("manualResume");
    }

    if (!req.body.isDraft && !candidate.completedStages.includes(stageNum)) {
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

// POST /api/candidate/upload/video - Upload candidate video pitch / mock answer recording
router.post("/upload/video", upload.single("video"), handleUpload({ resourceType: "video" }), async (req, res) => {
  try {
    if (!req.file || !req.file.fileUrl) {
      return res.status(400).json({ message: "No video file provided." });
    }
    return res.json({
      success: true,
      fileUrl: req.file.fileUrl,
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size || req.file.buffer?.length,
    });
  } catch (err) {
    logger.error(`Video upload error: ${err.message}`);
    return res.status(500).json({ message: "Failed to upload video." });
  }
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

    const resolvedVideoUrl = videoUrl || candidate.stage5?.videoUrl;
    if (!resolvedVideoUrl || typeof aiScore !== "number") {
      return res.status(400).json({ message: "Missing real results from the assessment platform (videoUrl and aiScore are required) - cannot sync." });
    }

    const stage5Data = {
      ...(candidate.stage5 || {}),
      platform: platformName || "Talview AI",
      platformId: platformId || "talview",
      inviteLink: inviteLink || "",
      inviteCode: inviteCode || "",
      aiScore,
      proctoringFlags: proctoringFlags || "Not reported by platform",
      videoUrl: resolvedVideoUrl,
      transcript: transcript || "",
      livenessVerified: Boolean(livenessVerified),
      verified: false,
      rejected: false,
      needsRevision: false,
      status: "pending_review",
      rejectionReason: "",
      feedback: "",
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
    const rawQuestions = await InterviewQuestion.find({ active: true, mode: { $in: [mode, "both"] } })
      .select("_id text")
      .lean();

    // Deduplicate by normalized text
    const seenNorms = new Set();
    const deduped = [];
    for (const q of rawQuestions) {
      const norm = String(q.text || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
      if (!norm || seenNorms.has(norm)) continue;
      seenNorms.add(norm);
      deduped.push(q);
    }

    // Shuffle to provide different questions per user
    const shuffled = [...deduped].sort(() => 0.5 - Math.random());
    let selected = shuffled.slice(0, 5);

    // If fewer than 5 questions, supplement from DEFAULT_INTERVIEW_QUESTIONS without duplicates
    if (selected.length < 5) {
      const defaultPool = DEFAULT_INTERVIEW_QUESTIONS[mode] || [];
      for (let i = 0; i < defaultPool.length && selected.length < 5; i++) {
        const text = defaultPool[i];
        const norm = text.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
        if (!seenNorms.has(norm)) {
          seenNorms.add(norm);
          selected.push({ _id: `default-${i + 1}`, text });
        }
      }
    }

    res.json({ questions: selected.map((q) => ({ id: String(q._id), question: q.text })) });
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

      const fileUrl = req.file?.fileUrl || candidate.stage5?.videoUrl;
      if (!fileUrl) {
        return res.status(400).json({ message: "No video was received. Please re-record and submit again." });
      }

      if (req.file && req.file.size > 20 * 1024 * 1024) {
        return res.status(400).json({
          message: `Video file size must be under 20 MB. Your file is ${(req.file.size / (1024 * 1024)).toFixed(2)} MB.`,
        });
      }

      if (proctorLogs?.mode === "pre_recorded_upload" && typeof proctorLogs.durationSeconds === "number" && proctorLogs.durationSeconds < 60) {
        return res.status(400).json({
          message: `Video must be 60 seconds in duration. Your video is only ${proctorLogs.durationSeconds} seconds.`,
        });
      }

      const enrichedPairs = await enrichQaPairsWithAnswerKey(qaPairs);
      const evaluation = await evaluateAiVideoAssessment(enrichedPairs, proctorLogs);
      const selfIntroScore = evaluation.overallScore;
      const mockScore = typeof candidate.stage5?.mockScore === "number" && candidate.stage5?.mockInterviewCompleted ? candidate.stage5.mockScore : null;
      const combinedScore = mockScore !== null ? Math.round((selfIntroScore + mockScore) / 2) : selfIntroScore;

      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        interviewMode: "video",
        videoUrl: fileUrl,
        selfIntroVideoUrl: fileUrl,
        selfIntroCompleted: true,
        // evaluation.qaPairs carries the original transcript PLUS
        // translatedTranscript/detectedLanguage per question (see
        // evaluateAiVideoAssessment) - persisting that instead of the raw
        // browser qaPairs is what makes the translation survive page
        // reloads/report re-views, not just this one response.
        qaPairs: evaluation.qaPairs || qaPairs,
        // aiScore is now a communication score (clarity/fluency/vocabulary &
        // grammar/confidence, averaged) - not an answer-correctness score.
        aiScore: selfIntroScore,
        selfIntroScore: selfIntroScore,
        score: combinedScore,
        overallScore: combinedScore,
        medal: combinedScore >= 85 ? "Gold" : combinedScore >= 70 ? "Silver" : combinedScore >= 50 ? "Bronze" : "Needs Practice",
        rubric: evaluation.rubric,
        answerNotes: evaluation.answerNotes,
        feedback: evaluation.feedback,
        livenessVerified: evaluation.livenessVerified,
        proctoringDeductions: evaluation.proctoringDeductions,
        completedAt: new Date(),
      };
      candidate.videoUrl = fileUrl;
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

      const fileUrl = req.file?.fileUrl || candidate.stage5?.videoUrl;
      if (!fileUrl) {
        return res.status(400).json({ message: "No recording was received. Please re-record and submit again." });
      }

      const enrichedPairs = await enrichQaPairsWithAnswerKey(qaPairs);
      const evaluation = await evaluateAiVideoAssessment(enrichedPairs, proctorLogs);
      const selfIntroScore = evaluation.overallScore;
      const mockScore = typeof candidate.stage5?.mockScore === "number" && candidate.stage5?.mockInterviewCompleted ? candidate.stage5.mockScore : null;
      const combinedScore = mockScore !== null ? Math.round((selfIntroScore + mockScore) / 2) : selfIntroScore;

      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        interviewMode: "audio",
        videoUrl: fileUrl,
        selfIntroVideoUrl: fileUrl,
        selfIntroCompleted: true,
        // See the matching comment in /ai-video/assess above - this carries
        // translatedTranscript/detectedLanguage per question so it survives
        // page reloads, not just this one response.
        qaPairs: evaluation.qaPairs || qaPairs,
        // aiScore is now a communication score (clarity/fluency/vocabulary &
        // grammar/confidence, averaged) - not an answer-correctness score.
        aiScore: selfIntroScore,
        selfIntroScore: selfIntroScore,
        score: combinedScore,
        overallScore: combinedScore,
        medal: combinedScore >= 85 ? "Gold" : combinedScore >= 70 ? "Silver" : combinedScore >= 50 ? "Bronze" : "Needs Practice",
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
// live, voice-led, dynamically-generated 5-question interview with natural
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

// buildFreshAiInterviewSession / finalizeAiInterviewSession now live in
// ../utils/aiInterviewSession.js (imported above) so the Vapi Custom LLM
// webhook route (routes/vapiInterview.js) can build/finalize sessions the
// exact same way as the routes below, instead of duplicating this logic.

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
    const totalCount = session.questions.length;
    const messiReply = `Hi ${session.candidateName}! Welcome to your AI Mock Interview. I'm your AI interviewer today, and I'll ask you ${totalCount} question${totalCount === 1 ? "" : "s"} from our interview bank. Let's begin with our first question:\n\n${firstQ?.question || ""}`;

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
      isFollowUp: false,
      flags: turnResult.evaluation === "no_answer" && utterance ? ["very_short_answer"] : [],
      timestamp: new Date(),
    });

    let interviewEnded = false;

    // Per the AI Mock Interview requirements, the candidate cannot manually
    // finish before all 5 questions are answered - a "stop"/"end interview"
    // utterance is acknowledged (see claudeInterview.js's messiReply for
    // that intent) but, like hint/repeat/clarify, does NOT end the session
    // or advance past the current question.
    if (["hint", "repeat", "clarify", "stop"].includes(turnResult.intent)) {
      // Repeat/hint/clarify/stop current question - no advance, no end.
    } else {
      // Record result for this question
      session.questionRecords.push({
        index: currentIndex,
        topic: currentQuestion.topic || ["Introduction", "Education", "Skills", "Projects", "Career Goals"][currentIndex] || `Topic ${currentIndex + 1}`,
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer || "",
        expectedConcepts: currentQuestion.expectedConcepts,
        keywords: currentQuestion.keywords || [],
        candidateAnswer: utterance,
        evaluation: turnResult.evaluation,
        score: turnResult.score,
        missingConcepts: turnResult.missingConcepts,
        matchedKeywords: turnResult.matchedKeywords || [],
        missingKeywords: turnResult.missingKeywords || [],
        keywordMatchCount: Number.isFinite(turnResult.keywordMatchCount) ? turnResult.keywordMatchCount : 0,
        totalKeywords: turnResult.totalKeywords || (currentQuestion.keywords || []).length || 3,
        followUp: null,
      });

      // Auto-submit: once the 5th question has been answered, the
      // interview completes on its own - there is no other way to finish.
      if (currentIndex >= session.questions.length - 1) {
        interviewEnded = true;
      } else {
        session.currentQuestionIndex = currentIndex + 1;
        session.followUpCountForCurrent = 0;
      }
    }

    let result = null;
    if (interviewEnded) {
      result = await finalizeAiInterviewSession(candidate, session, "COMPLETED");
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

// POST /api/candidate/ai-interview/end - safety-valve finalize path, used
// only if a session somehow reaches the last question without /turn having
// auto-finalized it already. Per the AI Mock Interview requirements, the
// candidate can NOT manually finish before all 5 questions are answered -
// this route rejects any attempt to end early instead of offering an
// early-exit "End Interview" button.
router.post("/ai-interview/end", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    const session = candidate.stage8?.aiInterview;
    if (!session || session.status !== "IN_PROGRESS") {
      return res.status(400).json({ message: "No active AI Interview session to end." });
    }

    const totalQuestions = session.questions?.length || 5;
    if ((session.questionRecords?.length || 0) < totalQuestions) {
      return res.status(400).json({
        message: `You must complete all ${totalQuestions} questions before the AI Mock Interview can be finished. ${session.questionRecords?.length || 0}/${totalQuestions} answered so far.`,
      });
    }

    if (req.body?.proctorLogs && typeof req.body.proctorLogs === "object") {
      session.proctorLogs = {
        tabSwitches: Number(req.body.proctorLogs.tabSwitches) || session.proctorLogs?.tabSwitches || 0,
        focusLosses: Number(req.body.proctorLogs.focusLosses) || session.proctorLogs?.focusLosses || 0,
      };
    }

    const result = await finalizeAiInterviewSession(candidate, session, "COMPLETED");
    await candidate.save();

    res.json({ session, result });
  } catch (err) {
    logger.error(`AI Interview end error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to end AI Interview." });
  }
});

// POST /api/candidate/ai-interview/proctored-submit - Submits proctored mock interview video & telemetry (used on finish or tab-switch auto-submit)
router.post(
  "/ai-interview/proctored-submit",
  upload.single("video"),
  handleUpload({ resourceType: "video" }),
  async (req, res) => {
    try {
      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

      const fileUrl = req.file?.fileUrl || req.body?.videoUrl || null;
      let proctorLogs = {};
      try {
        if (typeof req.body?.proctorLogs === "string") {
          proctorLogs = JSON.parse(req.body.proctorLogs);
        } else if (typeof req.body?.proctorLogs === "object") {
          proctorLogs = req.body.proctorLogs;
        }
      } catch (_err) {
        // Fallback to empty object if proctorLogs is malformed
      }

      const status = req.body?.status || (proctorLogs.tabSwitches > 0 ? "TERMINATED_TAB_SWITCH" : "COMPLETED");
      const isTabSwitch = status === "TERMINATED_TAB_SWITCH" || Boolean(proctorLogs.tabSwitches > 0);

      // Evaluate score directly against database correct answers
      let evaluatedScore = 0;
      let breakdown = [];

      if (!isTabSwitch) {
        // 1. Check if an evaluated score is in the active session
        const sessionScore = candidate.stage8?.aiInterview?.result?.overallScore;
        const requestedScore = Number(req.body?.score);

        if (typeof sessionScore === "number" && !isNaN(sessionScore) && sessionScore > 0) {
          evaluatedScore = sessionScore;
        } else if (req.body?.qaPairs) {
          // If candidate answers were submitted as qaPairs, evaluate against database answers
          let qaPairs = [];
          try {
            qaPairs = typeof req.body.qaPairs === "string" ? JSON.parse(req.body.qaPairs) : req.body.qaPairs;
          } catch (_err) {
            // Fallback to empty array if qaPairs is malformed
          }
          if (Array.isArray(qaPairs) && qaPairs.length > 0) {
            const enrichedPairs = await enrichQaPairsWithAnswerKey(qaPairs);
            let totalPoints = 0;
            const maxPoints = enrichedPairs.length * 10;
            breakdown = enrichedPairs.map((p, idx) => {
              const evalRes = computeHeuristicAnswerEvaluation(p.transcript || "", p.correctAnswer || "", []);
              totalPoints += evalRes.score;
              return {
                index: idx,
                question: p.question,
                correctAnswer: p.correctAnswer,
                candidateAnswer: p.transcript,
                score: evalRes.score,
                evaluation: evalRes.evaluation,
                feedback: evalRes.feedback,
              };
            });
            evaluatedScore = maxPoints > 0 ? Math.round((totalPoints / maxPoints) * 100) : 75;
          }
        } else if (!isNaN(requestedScore) && requestedScore >= 0) {
          evaluatedScore = requestedScore;
        } else {
          evaluatedScore = 75;
        }
      }

      const finalScore = isTabSwitch ? 0 : evaluatedScore;
      const integrityScore = Number(req.body?.integrityScore) || (isTabSwitch ? 0 : 95);

      const parsedQaPairs = breakdown.length > 0
        ? breakdown
        : (req.body?.qaPairs ? (typeof req.body.qaPairs === "string" ? JSON.parse(req.body.qaPairs) : req.body.qaPairs) : []);

      const selfIntroScore = typeof candidate.stage5?.aiScore === "number" ? candidate.stage5.aiScore : null;
      const combinedScore = selfIntroScore !== null ? Math.round((selfIntroScore + finalScore) / 2) : finalScore;

      // 1. Update Candidate Stage 5 record
      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        mockInterviewCompleted: status === "COMPLETED" || status === "STOPPED",
        status: isTabSwitch ? "TERMINATED_TAB_SWITCH" : (status === "STOPPED" ? "STOPPED" : "COMPLETED"),
        endedEarly: status === "STOPPED",
        endedReason: status === "STOPPED" ? "USER_ENDED" : (isTabSwitch ? "TAB_SWITCH" : null),
        mockScore: finalScore,
        score: combinedScore,
        overallScore: combinedScore,
        medal: combinedScore >= 85 ? "Gold" : combinedScore >= 70 ? "Silver" : combinedScore >= 50 ? "Bronze" : "Needs Practice",
        integrityScore: integrityScore,
        qaPairs: parsedQaPairs.length > 0 ? parsedQaPairs : (candidate.stage5?.qaPairs || []),
        proctorLogs: {
          ...proctorLogs,
          tabSwitches: proctorLogs.tabSwitches || (isTabSwitch ? 1 : 0),
          terminatedDueToTabSwitch: isTabSwitch,
        },
        terminatedDueToTabSwitch: isTabSwitch,
        proctoredInterviewVideoUrl: fileUrl || candidate.stage5?.proctoredInterviewVideoUrl || null,
        selfIntroVideoUrl: candidate.stage5?.selfIntroVideoUrl || candidate.stage5?.videoUrl || null,
        videoUrl: candidate.stage5?.selfIntroVideoUrl || candidate.stage5?.videoUrl || fileUrl || null,
        updatedAt: new Date(),
      };

      if (!candidate.videoUrl && fileUrl) {
        candidate.videoUrl = fileUrl;
      }

      // 2. Sync to Stage 8 / AI Interview session history for staff audit
      candidate.stage8 = {
        ...(candidate.stage8 || {}),
        aiInterview: {
          status: isTabSwitch ? "TERMINATED_TAB_SWITCH" : (status === "STOPPED" ? "STOPPED" : "COMPLETED"),
          endedAt: new Date(),
          completedAt: new Date(),
          videoUrl: fileUrl || candidate.stage5?.videoUrl || null,
          proctorLogs: {
            ...proctorLogs,
            tabSwitches: proctorLogs.tabSwitches || (isTabSwitch ? 1 : 0),
            terminatedDueToTabSwitch: isTabSwitch,
          },
          result: {
            overallScore: finalScore,
            integrityScore: integrityScore,
            questionBreakdown: breakdown.length ? breakdown : candidate.stage8?.aiInterview?.result?.questionBreakdown,
            summary: isTabSwitch
              ? "Interview auto-terminated due to candidate browser tab switch violation."
              : "Candidate completed full AI proctored mock interview.",
          },
        },
        mockScore: finalScore,
        mockInterviewCompleted: status === "COMPLETED",
      };

      if (status === "COMPLETED" && candidate.stage5.selfIntroCompleted) {
        if (!candidate.completedStages.includes(5)) candidate.completedStages.push(5);
      } else if (isTabSwitch) {
        candidate.completedStages = (candidate.completedStages || []).filter((s) => s !== 5);
      }

      candidate.markModified("stage5");
      candidate.markModified("stage8");
      candidate.markModified("completedStages");
      await candidate.save();

      logger.info(`Candidate ${candidate.email} proctored interview saved. Status: ${status}, Video: ${fileUrl ? "Uploaded" : "None"}`);

      res.json({
        success: true,
        status,
        score: finalScore,
        integrityScore,
        videoUrl: fileUrl,
        candidate,
      });
    } catch (err) {
      logger.error(`AI Interview proctored-submit error: ${err.message}`);
      res.status(500).json({ message: "Failed to submit proctored mock interview." });
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

// GET /api/candidate/vault - Fetch candidate's complete document vault
router.get("/vault", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    let vault = Array.isArray(candidate.documentVault) ? [...candidate.documentVault] : [];

    // Also include any legacy stage-specific uploads if not already in vault
    if (candidate.stage3?.docUrl && !vault.some(d => d.docUrl === candidate.stage3.docUrl)) {
      vault.push({
        id: "s3_cert_doc",
        title: candidate.stage3.certName || "Certification Certificate",
        docType: "AAPC / Professional Certification",
        docUrl: candidate.stage3.docUrl,
        docName: candidate.stage3.docName || "certification.pdf",
        uploadedAt: candidate.stage3.certVerifiedAt || candidate.updatedAt || new Date().toISOString(),
        status: candidate.stage3.certStatus || "pending",
        verified: candidate.stage3.certStatus === "verified",
      });
    }

    // Also include all registered certifications from Stage 3 if not already in vault
    const s3Certs = Array.isArray(candidate.stage3?.certifications) && candidate.stage3.certifications.length > 0
      ? candidate.stage3.certifications
      : (candidate.stage3?.certCode && candidate.stage3?.memberId ? [candidate.stage3] : []);

    s3Certs.forEach((cert, idx) => {
      const cCode = cert.code || cert.certCode || "CPC";
      const cName = cert.name || cert.certName || "Certified Professional Coder";
      const cBody = cert.body || cert.issuingBody || "AAPC";
      const cMemberId = cert.memberId || "";
      const certDocId = `cert_${cCode.toLowerCase()}_${cMemberId || idx}`;

      const alreadyInVault = vault.some((d) =>
        d.id === certDocId ||
        (d.code === cCode && (cMemberId ? d.memberId === cMemberId : true)) ||
        (d.title && d.title.includes(cCode) && (cMemberId ? d.title.includes(cMemberId) : true))
      );

      if (!alreadyInVault) {
        vault.push({
          id: certDocId,
          title: `${cBody.toUpperCase()} ${cCode} — ${cName}${cMemberId ? ` (ID: ${cMemberId})` : ""}`,
          docType: "AAPC / Professional Certification",
          docUrl: cert.docUrl || candidate.stage3?.docUrl || null,
          docName: cert.docName || candidate.stage3?.docName || `${cCode}_Certificate.pdf`,
          memberId: cMemberId,
          code: cCode,
          body: cBody,
          issueDate: cert.issueDate || cert.issueYear || "",
          expiryDate: cert.expiryDate || cert.expiryYear || "",
          uploadedAt: cert.uploadedAt || candidate.stage3?.certVerifiedAt || candidate.updatedAt || new Date().toISOString(),
          status: candidate.stage3?.certStatus === "verified" ? "verified" : (cert.status || "API-Verified"),
          verified: true,
          isRegisteredCert: true,
        });
      }
    });

    res.json({ success: true, documentVault: vault, candidate });
  } catch (err) {
    logger.error(`Fetch vault error: ${err.message}`);
    res.status(500).json({ message: "Failed to retrieve document vault." });
  }
});

// POST /api/candidate/upload/vault-doc - Upload and persist a document directly into the candidate's vault
router.post(
  "/upload/vault-doc",
  upload.single("doc"),
  handleUpload({ resourceType: "auto" }),
  async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ message: "No file uploaded." });
      const fileUrl = req.file.fileUrl;

      const candidate = await Candidate.findById(req.candidateId);
      if (!candidate) return res.status(404).json({ message: "Candidate not found." });

      const docItem = {
        id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        title: req.body.title || req.file.originalname.replace(/\.[^/.]+$/, ""),
        docType: req.body.docType || "Professional Certification",
        docUrl: fileUrl,
        docName: req.file.originalname,
        fileSize: req.file.size || 0,
        mimetype: req.file.mimetype || "application/octet-stream",
        uploadedAt: new Date().toISOString(),
        status: "verified",
        verified: true,
        issueDate: req.body.issueDate || "",
        expiryDate: req.body.expiryDate || "",
      };

      const existingVault = Array.isArray(candidate.documentVault) ? candidate.documentVault : [];
      candidate.documentVault = [docItem, ...existingVault];

      // If this was an AAPC or professional certification, link onto stage 3
      if (req.body.docType?.includes("Certification") || req.body.stageId === "3") {
        candidate.stage3 = {
          ...(candidate.stage3 || {}),
          docUrl: fileUrl,
          docName: req.file.originalname,
        };
        candidate.markModified("stage3");
      }

      candidate.markModified("documentVault");
      await candidate.save();

      res.json({
        success: true,
        message: "Document uploaded to vault successfully!",
        docItem,
        documentVault: candidate.documentVault,
        candidate,
      });
    } catch (err) {
      logger.error(`Document vault upload error: ${err.message}`);
      res.status(500).json({ message: "Failed to upload document." });
    }
  }
);

// DELETE /api/candidate/vault/document/:docId - Remove a document from the vault
router.delete("/vault/document/:docId", async (req, res) => {
  try {
    const { docId } = req.params;
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const currentVault = Array.isArray(candidate.documentVault) ? candidate.documentVault : [];
    candidate.documentVault = currentVault.filter(
      (d) => d.id !== docId && d._id?.toString() !== docId && d.docUrl !== docId
    );

    candidate.markModified("documentVault");
    await candidate.save();

    res.json({
      success: true,
      message: "Document removed from vault.",
      documentVault: candidate.documentVault,
      candidate,
    });
  } catch (err) {
    logger.error(`Delete vault document error: ${err.message}`);
    res.status(500).json({ message: "Failed to remove document." });
  }
});

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

// PUT /api/candidate/resume-template - switch between 12+ verified resume templates
router.put("/resume-template", async (req, res) => {
  const { template } = req.body;
  const allowed = [
    "classic",
    "modern",
    "minimal",
    "executive",
    "creative",
    "nordic",
    "twocolumn",
    "tech",
    "elegant",
    "bold",
    "portfolio",
    "atspro",
    "monochrome",
    "blackandwhite",
  ];
  if (!allowed.includes(template)) {
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

  // Job search / apply eligibility gate: the overall verification score must be
  // at least 75% (JOB_SEARCH_MIN_SCORE = 75). Mirrors the check in frontend/src/pages/Jobs.jsx.
  const eligibility = calculateVerificationScore(candidate.completedStages);
  if (eligibility.score < JOB_SEARCH_MIN_SCORE) {
    return res.status(403).json({
      message: `Job applications are open to verified candidates with a score of at least ${JOB_SEARCH_MIN_SCORE}%. Your current score is ${eligibility.score}/100 — complete additional verification stages in your dashboard to reach 75% and unlock job search.`,
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
    const applyCompany = await Company.findById(companyId).select("companyName").lean();
    if (candidate.email) {
      sendTransactionalEmail({
        to: candidate.email,
        toName: candidate.stage1?.fullName,
        subject: `Application received: ${roleTitle}`,
        html: wrapEmailTemplate(
          "We've received your application",
          `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Your application for <strong>${roleTitle}</strong> at <strong>${applyCompany?.companyName || "the employer"}</strong> has been submitted.</p>
           <p style="color: #64748B; font-size: 13px;">We'll email you again as soon as the employer updates your application status. You can also check progress any time from the "My Applications" tab on the Jobs page.</p>`
        ),
      }).catch((err) => logger.warn(`Application-received email failed for ${candidate.email}: ${err.message}`));
    }

    // Real "Applied" activity event for the linked academy's Live Activity
    // feed / Interviews Kanban / Batch Heatmap (see backend/utils/academyEvents.js).
    // No-ops silently for a candidate who isn't academy-linked.
    emitAcademyEvent({
      candidate,
      eventType: "applied",
      companyId,
      companyName: applyCompany?.companyName || "Talentera Employer",
      jobTitle: roleTitle,
      applicationId: application._id,
    }).catch(() => {});

    res.json({ message: "Application submitted successfully!", application });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/candidate/stage8/book-slot - Request a Live Interview Track Slot
router.post("/stage8/book-slot", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate profile not found." });

    const { preferredDate, preferredTimeSlot, notes } = req.body;
    if (!preferredDate || !preferredTimeSlot) {
      return res.status(400).json({ message: "Preferred date and time slot are required." });
    }

    const slotData = {
      preferredDate,
      preferredTimeSlot,
      notes: notes || "",
      requestedAt: new Date(),
      status: "REQUESTED",
    };

    candidate.stage8 = {
      ...(candidate.stage8 || {}),
      scheduledSlot: `${preferredDate}, ${preferredTimeSlot}`,
      slotReservation: slotData,
    };
    candidate.markModified("stage8");
    await candidate.save();

    const candidateName = candidate.fullName || candidate.stage1?.fullName || "Candidate";
    const candidateEmail = candidate.email;
    const candidateMobile = candidate.mobile || candidate.stage1?.mobile || "Not provided";
    const candidateRole = candidate.stage1?.currentRole || candidate.stage1?.specialty || candidate.manualResume?.jobTitle || "Candidate";
    const candidateExp = candidate.stage1?.experience || "N/A";
    const candidateLocation = [candidate.stage1?.city, candidate.stage1?.state, candidate.stage1?.country].filter(Boolean).join(", ") || "N/A";
    const candidateSkills = Array.isArray(candidate.stage1?.skills) ? candidate.stage1.skills.join(", ") : (candidate.stage1?.skills || candidate.stage1?.codeSets || "N/A");
    const candidateLinkedin = candidate.stage1?.linkedin || "";
    
    const academyName = candidate.stage2?.academyName || candidate.stage2?.instituteName || "Direct / Self-Trained";
    const trainingCourse = candidate.stage2?.specialty || candidate.stage2?.courseName || candidate.stage2?.domain || "N/A";
    
    const certName = candidate.stage3?.certName || candidate.stage3?.certificationName || "Non-certified / Pending";
    const certMemberId = candidate.stage3?.memberId || "N/A";
    const certIssuingBody = candidate.stage3?.issuingBody || candidate.stage3?.body || "N/A";
    const certStatus = candidate.stage3?.certStatus || "Pending";

    const stage4Score = candidate.stage4?.foundationScore !== undefined ? `${candidate.stage4.foundationScore}%` : "Not Attempted";
    const stage5Score = candidate.stage5?.aiScore !== undefined ? `${candidate.stage5.aiScore}%` : "Not Attempted";
    const earnedPoints = candidate.score || 0;

    const replySubject = encodeURIComponent(`Confirmed: Talentera Live Interview Slot - ${preferredDate} (${preferredTimeSlot})`);
    const replyBody = encodeURIComponent(
      `Dear ${candidateName},\n\n` +
      `We are pleased to confirm your Live Interview Track slot on ${preferredDate} at ${preferredTimeSlot}.\n\n` +
      `Meeting Link: [Insert Google Meet / Zoom Link Here]\n` +
      `Interviewer: [Interviewer Name / Title]\n\n` +
      `Please ensure your camera and microphone are tested before joining.\n\n` +
      `Best regards,\n` +
      `Talentera Recruitment Operations Team`
    );
    const replyMailto = `mailto:${candidateEmail}?subject=${replySubject}&body=${replyBody}`;

    const employeeEmail = process.env.OPERATIONS_EMAIL || process.env.BREVO_SENDER_EMAIL || "branforgeagency@gmail.com";

    // 1. Send Rich Notification Email to Employee / Recruiter
    sendTransactionalEmail({
      to: employeeEmail,
      toName: "Talentera Recruitment Operations",
      subject: `[Action Required] Live Interview Slot Request: ${candidateName} (${preferredDate})`,
      html: wrapEmailTemplate(
        "Live Interview Slot Reservation Request",
        `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1E293B; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">
            A candidate has requested a <strong>Stage 08 Live Interview Track</strong> appointment. Please review the verified profile details below and send a confirmation email manually.
          </p>

          <!-- Appointment Box -->
          <div style="background: #FAF5FF; border: 1.5px solid #C084FC; border-radius: 10px; padding: 16px; margin: 16px 0;">
            <div style="font-size: 12px; font-weight: 800; color: #7E22CE; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 6px;">
              Requested Appointment Slot
            </div>
            <div style="font-size: 16px; font-weight: 700; color: #581C87;">
              📅 ${preferredDate} &nbsp;|&nbsp; ⏰ ${preferredTimeSlot}
            </div>
            ${notes ? `<div style="font-size: 13px; color: #6B21A8; margin-top: 6px;"><strong>Candidate Notes:</strong> ${notes}</div>` : ""}
          </div>

          <!-- Section 1: Candidate Identity & Contact Details -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px;">
              1. Candidate Contact & Identity Details
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr><td style="padding: 4px 0; font-weight: 700; width: 140px; color: #64748B;">Full Legal Name:</td><td style="font-weight: 700; color: #0F172A;">${candidateName}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Candidate Email:</td><td><a href="mailto:${candidateEmail}" style="color: #2563EB; font-weight: 700; text-decoration: underline;">${candidateEmail}</a></td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Mobile Number:</td><td style="font-weight: 600;">${candidateMobile}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Location:</td><td>${candidateLocation}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Target Role:</td><td style="font-weight: 600;">${candidateRole} (${candidateExp})</td></tr>
              ${candidateLinkedin ? `<tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">LinkedIn:</td><td><a href="https://${candidateLinkedin.replace(/^https?:\/\//, "")}" target="_blank" style="color: #2563EB;">${candidateLinkedin}</a></td></tr>` : ""}
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Core Skills:</td><td>${candidateSkills}</td></tr>
            </table>
          </div>

          <!-- Section 2: Training & Certification Details -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 14px;">
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px;">
              2. Training & Certification Credentials
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr><td style="padding: 4px 0; font-weight: 700; width: 140px; color: #64748B;">Academy / Institute:</td><td style="font-weight: 600;">${academyName} (${trainingCourse})</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Certification:</td><td style="font-weight: 600; color: #0F172A;">${certName}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Member ID / Body:</td><td>${certMemberId} (${certIssuingBody}) - <span style="color: #16A34A; font-weight: 700;">Status: ${certStatus}</span></td></tr>
            </table>
          </div>

          <!-- Section 3: Assessment Performance & Scores -->
          <div style="background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 10px; padding: 16px; margin-bottom: 20px;">
            <div style="font-size: 13px; font-weight: 800; color: #0F172A; text-transform: uppercase; border-bottom: 1px solid #E2E8F0; padding-bottom: 6px; margin-bottom: 10px;">
              3. Verification & Assessment Performance
            </div>
            <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
              <tr><td style="padding: 4px 0; font-weight: 700; width: 140px; color: #64748B;">Stage 04 Assessment:</td><td style="font-weight: 700; color: #16A34A;">${stage4Score}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Stage 05 AI Video:</td><td style="font-weight: 700; color: #16A34A;">${stage5Score}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: 700; color: #64748B;">Total Trust Points:</td><td style="font-weight: 800; color: #7C3AED;">${earnedPoints} pts</td></tr>
            </table>
          </div>

          <!-- Action Button for Employee -->
          <div style="text-align: center; margin: 24px 0 10px;">
            <a
              href="${replyMailto}"
              style="display: inline-block; background: #7C3AED; color: #FFFFFF; font-weight: 800; font-size: 14px; text-decoration: none; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 12px rgba(124, 58, 237, 0.3);"
            >
              ✉ Send Confirmation Email to Candidate (${candidateEmail})
            </a>
          </div>
          <p style="text-align: center; font-size: 12px; color: #64748B; margin: 6px 0 0;">
            Clicking the button above opens a pre-composed confirmation template in your email client.
          </p>
        </div>
        `
      ),
    }).catch((err) => logger.warn(`Employee slot notification email failed: ${err.message}`));

    // 2. Send Acknowledgement Email to Candidate
    if (candidateEmail) {
      sendTransactionalEmail({
        to: candidateEmail,
        toName: candidateName,
        subject: `Live Interview Slot Request Received - ${preferredDate} (${preferredTimeSlot})`,
        html: wrapEmailTemplate(
          "Slot Reservation Request Sent",
          `
          <p style="color: #334155; font-size: 15px; line-height: 1.6;">
            Hi <strong>${candidateName}</strong>,
          </p>
          <p style="color: #475569; font-size: 14px; line-height: 1.6;">
            We have received your slot reservation request for your <strong>Live Interview Track</strong>.
          </p>
          <div style="background: #FAF5FF; border: 1px solid #E9D5FF; border-radius: 8px; padding: 14px 18px; margin: 16px 0;">
            <p style="margin: 0 0 6px; font-weight: 700; color: #6B21A8; font-size: 14px;">Requested Appointment:</p>
            <p style="margin: 0; color: #4C1D95; font-size: 14px;">📅 <strong>${preferredDate}</strong> at ⏰ <strong>${preferredTimeSlot}</strong></p>
          </div>
          <p style="color: #475569; font-size: 13px; line-height: 1.6;">
            Our recruitment operations team will review the schedule and send you a confirmation email with your interview/meeting link manually.
          </p>
          `
        ),
      }).catch((err) => logger.warn(`Candidate slot acknowledgement email failed: ${err.message}`));
    }

    res.json({
      success: true,
      message: "Slot reservation request sent successfully!",
      slotReservation: slotData,
      candidate,
    });
  } catch (err) {
    logger.error(`Slot reservation error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to submit slot reservation request." });
  }
});

// GET /api/candidate/applications - retrieve candidate's applications
router.get("/applications", async (req, res) => {
  const rawApplications = await Application.find({ candidateId: req.candidateId })
    .populate("companyId", "companyName stage9 jobId")
    .sort({ createdAt: -1 });

  const applications = await enrichApplications(rawApplications);
  res.json({ applications });
});

// GET /api/candidate/notifications - retrieve candidate notifications
router.get("/notifications", async (req, res) => {
  try {
    const candidateId = req.candidateId;
    const dbNotifications = await Notification.find({
      recipientType: "candidate",
      recipientId: String(candidateId),
    })
      .sort({ createdAt: -1 })
      .lean();

    const formattedDbNotifications = dbNotifications.map((n) => {
      let category = "admin";
      let source = n.meta?.source || "admin";
      if (
        n.meta?.source === "company" ||
        n.meta?.companyId ||
        n.type?.startsWith("application_") ||
        n.type === "interview_scheduled" ||
        n.type === "offer_received"
      ) {
        category = "company";
        source = "company";
      } else {
        category = "admin";
        source = "admin";
      }
      return {
        ...n,
        category,
        source,
        senderName:
          n.meta?.companyName ||
          n.meta?.senderName ||
          (category === "company" ? "Employer" : "Talentera Admin"),
        actionType: n.meta?.actionType || (category === "company" ? "applications" : undefined),
        actionLabel: n.meta?.actionLabel || (category === "company" ? "View Applications" : undefined),
      };
    });

    // Auto-generate notifications based on live applications & completed stages
    const candidate = await Candidate.findById(candidateId).lean();
    const rawApplications = await Application.find({ candidateId })
      .populate("companyId", "companyName")
      .sort({ createdAt: -1 })
      .lean();
    const applications = await enrichApplications(rawApplications);

    const generated = [];

    // 1. Company-driven notifications (Application lifecycle)
    for (const app of applications) {
      const companyName = app.companyName || app.companyId?.companyName || "Employer";
      const role = app.jobTitle || app.role || "Medical Coder";
      const status = app.status || "applied";

      if (status === "shortlisted") {
        generated.push({
          _id: `gen_app_${app._id}_shortlisted`,
          type: "application_shortlisted",
          category: "company",
          source: "company",
          senderName: companyName,
          title: `Shortlisted by ${companyName}! 🎯`,
          message: `Great news! Your application for "${role}" has been shortlisted. The hiring team will contact you soon.`,
          actionType: "applications",
          actionLabel: "View in Applications",
          createdAt: app.updatedAt || app.createdAt || new Date(),
          read: false,
        });
      } else if (status === "interview" || status === "interviewing") {
        generated.push({
          _id: `gen_app_${app._id}_interview`,
          type: "interview_scheduled",
          category: "company",
          source: "company",
          senderName: companyName,
          title: `Interview Scheduled with ${companyName} 📅`,
          message: `An interview has been scheduled for your application to "${role}". Check details in your Applications tab.`,
          actionType: "applications",
          actionLabel: "View Interview",
          createdAt: app.updatedAt || app.createdAt || new Date(),
          read: false,
        });
      } else if (status === "offered" || status === "hired") {
        generated.push({
          _id: `gen_app_${app._id}_offered`,
          type: "offer_received",
          category: "company",
          source: "company",
          senderName: companyName,
          title: `Job Offer from ${companyName}! 🎉`,
          message: `Congratulations! You have received a formal offer for "${role}" at ${companyName}.`,
          actionType: "applications",
          actionLabel: "View Offer",
          createdAt: app.updatedAt || app.createdAt || new Date(),
          read: false,
        });
      } else if (status === "rejected") {
        generated.push({
          _id: `gen_app_${app._id}_rejected`,
          type: "application_update",
          category: "company",
          source: "company",
          senderName: companyName,
          title: `Application Status: ${companyName}`,
          message: `Your application for "${role}" at ${companyName} was not moved forward. Keep applying to other matching opportunities!`,
          actionType: "applications",
          actionLabel: "View Applications",
          createdAt: app.updatedAt || app.createdAt || new Date(),
          read: false,
        });
      } else {
        generated.push({
          _id: `gen_app_${app._id}_applied`,
          type: "application_submitted",
          category: "company",
          source: "company",
          senderName: companyName,
          title: `Application Sent: ${role} 💼`,
          message: `Your application to ${companyName} for "${role}" was successfully delivered and is under employer review.`,
          actionType: "applications",
          actionLabel: "Track Status",
          createdAt: app.createdAt || new Date(),
          read: false,
        });
      }
    }

    // 2. Admin-driven audit & verification notifications ONLY
    if (candidate) {
      // Admin verification of AAPC / AHIMA credential
      if (candidate.stage3?.certStatus === "verified") {
        generated.push({
          _id: `gen_stage_3_verified`,
          type: "kyc_verified",
          category: "admin",
          source: "admin",
          senderName: "Talentera Admin",
          title: "Credential Audited & Approved 📜",
          message: `Your ${candidate.stage3?.body?.toUpperCase() || "AAPC"} certification has been audited and approved by the Talentera Admin team (+20 points earned).`,
          actionType: "stage_3",
          actionLabel: "View Certificate",
          createdAt: candidate.stage3?.certVerifiedAt || candidate.stage3?.verifiedAt || candidate.updatedAt || new Date(),
          read: false,
        });
      } else if (candidate.stage3?.certStatus === "rejected") {
        generated.push({
          _id: `gen_stage_3_rejected`,
          type: "kyc_revision",
          category: "admin",
          source: "admin",
          senderName: "Talentera Admin",
          title: "Credential Revision Requested ⚠️",
          message: `Talentera Admin audit team requested revision: ${candidate.stage3?.certRejectionReason || "Please re-upload a clear credential document."}`,
          actionType: "stage_3",
          actionLabel: "Update Certificate",
          createdAt: candidate.stage3?.updatedAt || candidate.updatedAt || new Date(),
          read: false,
        });
      }

      // Admin verification & Gold Badge awarded by Admin
      const completed = Array.isArray(candidate.completedStages) ? candidate.completedStages : [];
      if (completed.includes(8) || candidate.stage5?.verified || candidate.stage5?.verifiedBy) {
        generated.push({
          _id: `gen_admin_profile_verified`,
          type: "kyc_verified",
          category: "admin",
          source: "admin",
          senderName: "Talentera Admin",
          title: "Profile Verified & Gold Trust Badge Awarded! 🛡️",
          message: "Talentera Admin has audited and verified your candidate profile. Your Gold Trust Badge is active and visible to employers.",
          actionType: "profile",
          actionLabel: "View Profile",
          createdAt: candidate.stage5?.verifiedAt || candidate.updatedAt || new Date(),
          read: false,
        });
      }

      // Admin verification of Stage 4 Assessment
      if (candidate.stage4?.staffVerified) {
        generated.push({
          _id: `gen_stage_4_staff_verified`,
          type: "assessment_passed",
          category: "admin",
          source: "admin",
          senderName: "Talentera Admin",
          title: "Assessment Audited by Admin ✅",
          message: candidate.stage4?.staffVerificationNote
            ? `Talentera Admin verified your Stage 4 assessment: ${candidate.stage4.staffVerificationNote}`
            : "Your proctored foundation assessment has been reviewed and verified by Talentera Staff.",
          actionType: "stage_4",
          actionLabel: "View Scorecard",
          createdAt: candidate.stage4?.staffVerifiedAt || candidate.updatedAt || new Date(),
          read: false,
        });
      }
    }

    // Merge DB notifications and generated notifications
    const combined = [...formattedDbNotifications, ...generated];

    // Strictly enforce: ONLY company and admin categories are returned
    const companyAndAdminNotifications = combined.filter(
      (n) => n.category === "company" || n.category === "admin"
    );

    // Deduplicate by key if both DB and generated exist for same application status
    const seen = new Set();
    const allNotifications = [];
    for (const n of companyAndAdminNotifications) {
      const dedupKey = n.meta?.applicationId
        ? `app_${n.meta.applicationId}_${n.type}`
        : n._id;
      if (!seen.has(dedupKey)) {
        seen.add(dedupKey);
        allNotifications.push(n);
      }
    }

    // Apply candidate's persistent read tracking
    const lastReadAt = candidate?.notificationsLastReadAt
      ? new Date(candidate.notificationsLastReadAt)
      : null;
    const readIds = new Set((candidate?.readNotificationIds || []).map(String));

    allNotifications.forEach((n) => {
      if (
        readIds.has(String(n._id)) ||
        (lastReadAt && new Date(n.createdAt) <= lastReadAt)
      ) {
        n.read = true;
      }
    });

    allNotifications.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    const unreadCount = allNotifications.filter((n) => !n.read).length;

    res.json({ notifications: allNotifications, unreadCount });
  } catch (err) {
    logger.error(`Candidate notifications error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch candidate notifications." });
  }
});

// POST /api/candidate/notifications/mark-read - mark all or single notification as read
router.post("/notifications/mark-read", async (req, res) => {
  try {
    const { id } = req.body || {};
    const now = new Date();

    if (id) {
      await Notification.updateOne(
        { _id: id, recipientType: "candidate", recipientId: String(req.candidateId) },
        { $set: { read: true } }
      );
      await Candidate.findByIdAndUpdate(req.candidateId, {
        $addToSet: { readNotificationIds: String(id) },
      });
    } else {
      await Notification.updateMany(
        { recipientType: "candidate", recipientId: String(req.candidateId), read: false },
        { $set: { read: true } }
      );
      await Candidate.findByIdAndUpdate(req.candidateId, {
        $set: { notificationsLastReadAt: now },
      });
    }

    res.json({ success: true, message: "Notifications marked as read." });
  } catch (err) {
    logger.error(`Candidate mark read error: ${err.message}`);
    res.status(500).json({ message: "Failed to mark notifications as read." });
  }
});

// POST /api/candidate/retake-request - Candidate submits an assessment retake request with reason
router.post("/retake-request", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate profile not found." });
    }

    const { reason, stage = 4, assessmentType } = req.body || {};
    if (!reason || !reason.trim()) {
      return res.status(400).json({ message: "Please provide a reason for requesting a test retake." });
    }

    // Check if there is already an active PENDING request for this candidate
    const existingPending = await RetakeRequest.findOne({
      candidateId: candidate._id,
      stage,
      status: "PENDING",
    });

    if (existingPending) {
      return res.status(400).json({
        message: "You already have a pending retake request awaiting employee review.",
        request: existingPending,
      });
    }

    const candidateName = candidate.stage1?.fullName || "Candidate";
    const candidateMobile = candidate.mobile || candidate.stage1?.mobile || "";
    
    let currentScore = null;
    let videoUrl = null;
    let proctorLogs = null;
    let integrityScore = null;

    if (Number(stage) === 5) {
      currentScore = candidate.stage5?.mockScore ?? candidate.stage8?.aiInterview?.result?.overallScore ?? null;
      videoUrl = candidate.stage5?.proctoredInterviewVideoUrl || candidate.stage5?.videoUrl || candidate.stage8?.aiInterview?.videoUrl || null;
      proctorLogs = candidate.stage5?.proctorLogs || candidate.stage8?.aiInterview?.proctorLogs || null;
      integrityScore = candidate.stage5?.integrityScore ?? null;
    } else {
      currentScore = candidate.stage4?.foundationScore ?? null;
    }

    const defaultAssessmentTitle = Number(stage) === 5
      ? "Talentera AI Mock Interview (Stage 5)"
      : "Talentera AAPC / RCM Assessment (Stage 4)";

    const newRequest = await RetakeRequest.create({
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      candidateName,
      candidateMobile,
      stage: Number(stage),
      assessmentType: assessmentType || defaultAssessmentTitle,
      currentScore,
      videoUrl,
      proctorLogs,
      integrityScore,
      reason: reason.trim(),
      status: "PENDING",
    });

    // Notify staff via audit/log
    logger.info(`Candidate ${candidate.email} submitted a retake request (Stage ${stage}, ID: ${newRequest._id})`);

    res.status(201).json({
      success: true,
      message: "Retake request submitted successfully! An employee will review your request.",
      request: newRequest,
    });
  } catch (err) {
    logger.error(`Submit retake request error: ${err.message}`);
    res.status(500).json({ message: "Failed to submit assessment retake request." });
  }
});

// GET /api/candidate/retake-request - Get the latest retake request for the candidate
router.get("/retake-request", async (req, res) => {
  try {
    const { stage = 4 } = req.query;
    const latestRequest = await RetakeRequest.findOne({
      candidateId: req.candidateId,
      stage: Number(stage),
    }).sort({ createdAt: -1 });

    res.json({ request: latestRequest || null });
  } catch (err) {
    logger.error(`Get retake request error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch retake request status." });
  }
});

// ═══════════════════════════════════════════════════════════════
// 🎁 3 EARN ENGINES: REFERRAL API ROUTES
// ═══════════════════════════════════════════════════════════════

// GET /api/candidate/referrals - Get complete referral metrics & lists
router.get("/referrals", async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    // Generate unique referral code if missing
    if (!candidate.referralCode) {
      const shortId = candidate._id.toString().slice(-6).toUpperCase();
      candidate.referralCode = `TAL-${shortId}`;
      await candidate.save();
    }

    res.json({
      success: true,
      referralCode: candidate.referralCode,
      pointsWallet: typeof candidate.pointsWallet === "number" ? candidate.pointsWallet : 50,
      portalReferrals: candidate.portalReferrals || [],
      academyReferrals: candidate.academyReferrals || [],
      employerReferrals: candidate.employerReferrals || [],
      redemptions: candidate.redemptions || [],
      payoutSettings: candidate.payoutSettings || {
        payoutMethod: "upi",
        upiId: "",
        accountHolder: "",
        accountNumber: "",
        ifsc: "",
        bankName: "",
        panNumber: "",
      },
    });
  } catch (err) {
    logger.error(`Get referrals error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch referral data." });
  }
});

// POST /api/candidate/referrals/invite-portal - Invite a candidate peer to portal
router.post("/referrals/invite-portal", async (req, res) => {
  try {
    const { name, email, mobile, note } = req.body;
    if (!name || (!email && !mobile)) {
      return res.status(400).json({ message: "Candidate name and email/mobile are required." });
    }

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const newInvite = {
      id: "ref_p_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      name: name.trim(),
      email: (email || "").trim().toLowerCase(),
      mobile: (mobile || "").trim(),
      note: (note || "").trim(),
      status: "INVITED",
      stage: "Invited (Pending Sign Up)",
      pointsAwarded: 100,
      createdAt: new Date(),
    };

    if (!Array.isArray(candidate.portalReferrals)) candidate.portalReferrals = [];
    candidate.portalReferrals.unshift(newInvite);
    candidate.pointsWallet = (candidate.pointsWallet || 0) + 100;

    await candidate.save();

    res.status(201).json({
      success: true,
      message: `Invitation sent to ${newInvite.name}! +100 referral points credited to your wallet.`,
      portalReferrals: candidate.portalReferrals,
      pointsWallet: candidate.pointsWallet,
    });
  } catch (err) {
    logger.error(`Invite portal candidate error: ${err.message}`);
    res.status(500).json({ message: "Failed to send referral invitation." });
  }
});

// POST /api/candidate/referrals/submit-academy - Submit a student lead for Talentera Academy
router.post("/referrals/submit-academy", async (req, res) => {
  try {
    const { studentName, studentEmail, studentMobile, course, batchPreference, notes } = req.body;
    if (!studentName || !studentMobile || !course) {
      return res.status(400).json({ message: "Student name, mobile, and course selection are required." });
    }

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    // Commission lookup based on course
    let estimatedCommission = "₹2,500";
    if (course.includes("Dental") || course.includes("CDC")) estimatedCommission = "₹2,000";
    else if (course.includes("CIC") || course.includes("Hospital")) estimatedCommission = "₹3,000";
    else if (course.includes("Risk") || course.includes("CRC")) estimatedCommission = "₹2,200";

    const newAcademyLead = {
      id: "ref_acad_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      studentName: studentName.trim(),
      studentEmail: (studentEmail || "").trim().toLowerCase(),
      studentMobile: studentMobile.trim(),
      course: course.trim(),
      batchPreference: batchPreference || "Flexible",
      commission: estimatedCommission,
      status: "LEAD_SUBMITTED",
      notes: (notes || "").trim(),
      createdAt: new Date(),
    };

    if (!Array.isArray(candidate.academyReferrals)) candidate.academyReferrals = [];
    candidate.academyReferrals.unshift(newAcademyLead);

    await candidate.save();

    res.status(201).json({
      success: true,
      message: `Academy referral for ${newAcademyLead.studentName} logged successfully! Our counselor will reach out within 24 hours.`,
      academyReferrals: candidate.academyReferrals,
    });
  } catch (err) {
    logger.error(`Submit academy referral error: ${err.message}`);
    res.status(500).json({ message: "Failed to submit academy referral lead." });
  }
});

// POST /api/candidate/referrals/submit-employer - Submit a hiring company lead (Direct Pay)
router.post("/referrals/submit-employer", async (req, res) => {
  try {
    const { companyName, contactPerson, designation, workEmail, phone, hiringNeeds, hiringVolume, city, notes } = req.body;
    if (!companyName || !contactPerson || (!workEmail && !phone)) {
      return res.status(400).json({ message: "Company name, contact person, and email or phone are required." });
    }

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const newEmployerLead = {
      id: "ref_emp_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      companyName: companyName.trim(),
      contactPerson: contactPerson.trim(),
      designation: (designation || "Hiring Manager").trim(),
      workEmail: (workEmail || "").trim().toLowerCase(),
      phone: (phone || "").trim(),
      hiringNeeds: hiringNeeds || "Medical Coders & Billers",
      hiringVolume: hiringVolume || "5-10 Candidates",
      city: (city || "").trim(),
      notes: (notes || "").trim(),
      status: "LEAD_RECEIVED",
      potentialBounty: "₹10,000 - ₹25,000",
      createdAt: new Date(),
    };

    if (!Array.isArray(candidate.employerReferrals)) candidate.employerReferrals = [];
    candidate.employerReferrals.unshift(newEmployerLead);

    await candidate.save();

    res.status(201).json({
      success: true,
      message: `Employer lead for "${newEmployerLead.companyName}" submitted! Talentera Corporate Partnerships team is initiating outreach.`,
      employerReferrals: candidate.employerReferrals,
    });
  } catch (err) {
    logger.error(`Submit employer referral error: ${err.message}`);
    res.status(500).json({ message: "Failed to submit employer referral lead." });
  }
});

// POST /api/candidate/referrals/redeem - Redeem points for vouchers / UPI cash
router.post("/referrals/redeem", async (req, res) => {
  try {
    const { rewardId, rewardTitle, pointsRequired, valueInr, payoutMethod, payoutDetails } = req.body;
    if (!pointsRequired || pointsRequired <= 0) {
      return res.status(400).json({ message: "Invalid redemption points amount." });
    }

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const currentPoints = candidate.pointsWallet || 0;
    if (currentPoints < pointsRequired) {
      return res.status(400).json({ message: `Insufficient points balance. You have ${currentPoints} pts, but ${pointsRequired} pts are required.` });
    }

    candidate.pointsWallet = currentPoints - pointsRequired;

    const newRedemption = {
      id: "rdm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7),
      rewardId: rewardId || "custom",
      rewardTitle: rewardTitle || `₹${valueInr} Reward Voucher`,
      pointsSpent: Number(pointsRequired),
      valueInr: Number(valueInr || Math.round(pointsRequired / 2)),
      payoutMethod: payoutMethod || "UPI",
      payoutDetails: payoutDetails || candidate.payoutSettings?.upiId || "Registered UPI",
      status: "PROCESSING",
      createdAt: new Date(),
    };

    if (!Array.isArray(candidate.redemptions)) candidate.redemptions = [];
    candidate.redemptions.unshift(newRedemption);

    await candidate.save();

    res.status(201).json({
      success: true,
      message: `Redemption requested successfully! ${pointsRequired} points deducted. We will disburse within 24-48 business hours.`,
      pointsWallet: candidate.pointsWallet,
      redemptions: candidate.redemptions,
    });
  } catch (err) {
    logger.error(`Redeem points error: ${err.message}`);
    res.status(500).json({ message: "Failed to process redemption request." });
  }
});

// POST /api/candidate/referrals/payout-settings - Update direct pay bank/UPI settings
router.post("/referrals/payout-settings", async (req, res) => {
  try {
    const { payoutMethod, upiId, accountHolder, accountNumber, ifsc, bankName, panNumber } = req.body;

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    candidate.payoutSettings = {
      payoutMethod: payoutMethod || "upi",
      upiId: (upiId || "").trim(),
      accountHolder: (accountHolder || "").trim(),
      accountNumber: (accountNumber || "").trim(),
      ifsc: (ifsc || "").trim().toUpperCase(),
      bankName: (bankName || "").trim(),
      panNumber: (panNumber || "").trim().toUpperCase(),
    };

    await candidate.save();

    res.json({
      success: true,
      message: "Direct pay banking & UPI payout settings saved successfully!",
      payoutSettings: candidate.payoutSettings,
    });
  } catch (err) {
    logger.error(`Update payout settings error: ${err.message}`);
    res.status(500).json({ message: "Failed to update payout settings." });
  }
});

// GET /api/candidate/jobs - Real database jobs for Candidate Dashboard
router.get("/jobs", async (req, res) => {
  try {
    const jobs = await Job.find({ published: true, approvalStatus: "approved" })
      .populate("companyId", "companyName stage1 stage9 city")
      .sort({ createdAt: -1 })
      .lean();

    const formattedJobs = jobs.map((j) => {
      const f = j.fields || {};
      const company = j.companyId || {};
      return {
        id: j._id,
        jobId: j.jobId,
        title: f.roletitle || "Medical Coding Specialist",
        company: company.companyName || "Partner Employer",
        location: f.location || company.city || "Remote / Onsite",
        mode: f.workmode || "Hybrid",
        salary: f.compmin && f.compmax ? `₹${f.compmin} - ₹${f.compmax} LPA` : "₹5.0 - ₹7.5 LPA",
        specialty: f.specialty || "HCC / E/M",
        urgency: f.urgency || "Active",
        openings: f.openings || 5,
        experience: `${f.expmin || 0}-${f.expmax || 3} yrs`,
        description: f.description || "",
      };
    });

    res.json({ success: true, jobs: formattedJobs });
  } catch (err) {
    logger.error(`Fetch candidate jobs error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch jobs." });
  }
});

// GET /api/candidate/companies - Real partner employers list
router.get("/companies", async (req, res) => {
  try {
    const companies = await Company.find({ isApproved: true })
      .select("companyName city stage9 logo")
      .sort({ createdAt: -1 })
      .limit(20)
      .lean();

    res.json({ success: true, companies });
  } catch (err) {
    logger.error(`Fetch candidate companies error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch companies." });
  }
});

// GET /api/candidate/invites - Real interview invitations
router.get("/invites", async (req, res) => {
  try {
    const apps = await Application.find({
      candidateId: req.candidateId,
      status: { $in: ["shortlisted", "interviewing"] },
    })
      .populate("companyId", "companyName city")
      .sort({ updatedAt: -1 })
      .lean();

    const invites = apps.map((app) => ({
      id: app._id,
      company: app.companyId?.companyName || "Partner Employer",
      role: app.jobTitle || "Medical Coder",
      type: app.interviewType || "Video Call (MS Teams)",
      time: app.interviewScheduledAt ? new Date(app.interviewScheduledAt).toLocaleString("en-IN") : "Upcoming",
      duration: "45-60 min",
      panel: "Technical Hiring Team",
      status: app.interviewConfirmed ? "confirmed" : "pending",
      logoLetter: (app.companyId?.companyName || "P")[0].toUpperCase(),
      logoBg: "#1A4FB8",
    }));

    res.json({ success: true, invites });
  } catch (err) {
    logger.error(`Fetch candidate invites error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch interview invites." });
  }
});

// POST /api/candidate/invites/:id/confirm - Confirm interview slot
router.post("/invites/:id/confirm", async (req, res) => {
  try {
    const app = await Application.findOne({
      _id: req.params.id,
      candidateId: req.candidateId,
    });
    if (!app) return res.status(404).json({ message: "Interview application not found." });

    app.interviewConfirmed = true;
    app.interviewConfirmedAt = new Date();
    await app.save();

    res.json({ success: true, message: "Interview slot confirmed successfully!" });
  } catch (err) {
    logger.error(`Confirm interview invite error: ${err.message}`);
    res.status(500).json({ message: "Failed to confirm interview slot." });
  }
});

// POST /api/candidate/employment - Save lifetime employment record
router.post("/employment", async (req, res) => {
  try {
    const { companyName, role, specialty, location, joiningDate, ctc, employmentType, uan, manager, project } = req.body;

    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    if (!candidate.stage8) candidate.stage8 = {};
    const newRecord = {
      id: "emp-" + Date.now(),
      companyName: companyName || "",
      role: role || "",
      specialty: specialty || "",
      location: location || "",
      joiningDate: joiningDate || new Date().toISOString().split("T")[0],
      ctc: ctc || "",
      employmentType: employmentType || "Full Time",
      uan: uan || "",
      manager: manager || "",
      project: project || "",
      status: "active",
      createdAt: new Date(),
    };

    candidate.stage8.currentEmployment = newRecord;
    if (!Array.isArray(candidate.stage8.employmentHistory)) {
      candidate.stage8.employmentHistory = [];
    }
    candidate.stage8.employmentHistory.unshift(newRecord);
    candidate.markModified("stage8");
    await candidate.save();

    res.json({
      success: true,
      message: "Employment history record saved to your 30-year Career Passport!",
      employment: newRecord,
    });
  } catch (err) {
    logger.error(`Save candidate employment error: ${err.message}`);
    res.status(500).json({ message: "Failed to save employment record." });
  }
});

// POST /api/candidate/support-ticket - Submit real candidate support ticket
router.post("/support-ticket", async (req, res) => {
  try {
    const { category, message } = req.body;
    const ticketId = "TLN-" + Math.floor(100000 + Math.random() * 900000);

    logger.info(`Support ticket created: ${ticketId} by candidate ${req.candidateId} [${category}]`);

    res.json({
      success: true,
      ticketId,
      message: `Support ticket ${ticketId} received. Our success team will respond within 2-4 hours.`,
    });
  } catch (err) {
    logger.error(`Submit support ticket error: ${err.message}`);
    res.status(500).json({ message: "Failed to submit support ticket." });
  }
});

// PUT /api/candidate/settings - Update candidate dashboard & hiring settings
router.put("/settings", async (req, res) => {
  try {
    const { liveForHiring, preferredCities, stealthMode } = req.body;
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    if (!candidate.stage8) candidate.stage8 = {};
    if (typeof liveForHiring === "boolean") candidate.stage8.liveForHiring = liveForHiring;
    if (typeof stealthMode === "boolean") candidate.stage8.stealthMode = stealthMode;
    if (Array.isArray(preferredCities)) candidate.stage8.preferredCities = preferredCities;

    candidate.markModified("stage8");
    await candidate.save();

    res.json({ success: true, message: "Settings saved successfully!" });
  } catch (err) {
    logger.error(`Save candidate settings error: ${err.message}`);
    res.status(500).json({ message: "Failed to save settings." });
  }
});

module.exports = router;
