const InterviewQuestion = require("../models/InterviewQuestion");
const { generateInterviewQuestions, generateFinalReport } = require("./claudeInterview");

// ---------------------------------------------------------------------------
// Shared AI Mock Interview session helpers - build/finalize a
// candidate.stage8.aiInterview session the exact same way regardless of
// which front door drove the turn: the original REST /ai-interview/* routes
// (backend/routes/candidate.js, browser Web Speech API voice) or the Vapi
// Custom LLM webhook (backend/routes/vapiInterview.js, Vapi-hosted voice).
// Both must produce byte-identical session/report shapes, so this logic
// lives in exactly one place rather than being duplicated per front door.
// ---------------------------------------------------------------------------

async function buildFreshAiInterviewSession(candidate) {
  const candidateName = candidate.stage1?.fullName || "Candidate";
  const role = candidate.stage1?.currentRole || "Medical Coder";
  const experienceYears = candidate.stage1?.experience ?? null;

  // Retrieve staff-configured active interview questions bank (capped to exactly 5 questions)
  const activeBankQuestions = await InterviewQuestion.find({ active: true })
    .sort({ order: 1, createdAt: 1 })
    .limit(5)
    .lean();

  let questions;
  if (activeBankQuestions && activeBankQuestions.length > 0) {
    questions = activeBankQuestions.slice(0, 5).map((q, idx) => {
      const expectedConcepts = q.correctAnswer
        ? q.correctAnswer
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 3)
        : [];
      // Exactly 3 keywords per the Answer Evaluation / Keyword Matching
      // requirement - prefer staff-configured InterviewQuestion.keywords,
      // otherwise derive 3 from the correct answer / expected concepts.
      const keywords =
        Array.isArray(q.keywords) && q.keywords.length === 3
          ? q.keywords
          : expectedConcepts.slice(0, 3).length === 3
          ? expectedConcepts.slice(0, 3)
          : [expectedConcepts[0], expectedConcepts[1], expectedConcepts[2]].filter(Boolean);
      return {
        index: idx,
        id: String(q._id),
        topic: q.mode === "both" ? "Core Assessment" : (q.mode === "video" ? "Video Technical" : "Audio Interview"),
        topicLabel: `Question ${idx + 1}`,
        question: q.text,
        correctAnswer: q.correctAnswer || "",
        expectedConcepts,
        keywords: keywords.length === 3 ? keywords : keywords.concat(["concept", "detail", "accuracy"]).slice(0, 3),
      };
    });
  } else {
    questions = await generateInterviewQuestions({ candidateName, role, experienceYears });
    if (Array.isArray(questions) && questions.length > 5) {
      questions = questions.slice(0, 5);
    }
  }

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
    mockScore: result.overallScore,
    mockInterviewCompleted: true,
  };
  candidate.stage5 = {
    ...(candidate.stage5 || {}),
    mockInterviewCompleted: true,
    mockScore: result.overallScore,
    status: status,
    endedEarly: status === "STOPPED",
    endedReason: status === "STOPPED" ? "USER_ENDED" : null,
  };
  candidate.markModified("stage8");
  candidate.markModified("stage5");
  return result;
}

module.exports = { buildFreshAiInterviewSession, finalizeAiInterviewSession };
