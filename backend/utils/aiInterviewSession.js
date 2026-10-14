const InterviewQuestion = require("../models/InterviewQuestion");
const { generateFinalReport, DOMAIN_INTERVIEW_BANKS } = require("./claudeInterview");
const { NEW_DEFAULT_INTERVIEW_QUESTIONS } = require("../data/defaultInterviewQuestions");

// ---------------------------------------------------------------------------
// Shared AI Mock Interview session helpers - build/finalize a
// candidate.stage8.aiInterview session the exact same way regardless of
// which front door drove the turn: the original REST /ai-interview/* routes
// (backend/routes/candidate.js, browser Web Speech API voice) or the Vapi
// Custom LLM webhook (backend/routes/vapiInterview.js, Vapi-hosted voice).
// Both must produce byte-identical session/report shapes, so this logic
// lives in exactly one place rather than being duplicated per front door.
// ---------------------------------------------------------------------------

function normalizeQText(text = "") {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

// Candidates pick their Stage 2 training domain from Stage2Training.jsx
// using these exact labels. The InterviewQuestion bank historically used
// "Front Office" for what candidates see as "Eligibility & Verification" -
// this maps a candidate's selected domain to every InterviewQuestion.domain
// value that should count as a match, so a candidate is never silently
// matched to zero domain-specific questions just because staff tagged a
// question under the older label (or vice versa).
const DOMAIN_QUERY_ALIASES = {
  "Eligibility & Verification": ["Eligibility & Verification", "Front Office"],
  "Front Office": ["Front Office", "Eligibility & Verification"],
  "AR Calling": ["AR Calling", "Accounts Receivable"],
  "Accounts Receivable": ["Accounts Receivable", "AR Calling"],
};

function getDomainQueryAliases(domain) {
  if (!domain) return [];
  return DOMAIN_QUERY_ALIASES[domain] || [domain];
}

function shuffleArray(array) {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function formatQuestionItem(q, idx) {
  const questionText = (q.text || q.question || "").trim();
  const correctAnswer = (q.correctAnswer || "").trim();
  const expectedConcepts = Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0
    ? q.expectedConcepts.map(String)
    : correctAnswer
        ? correctAnswer
            .replace(/[^\w\s]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length > 3)
        : [];

  let keywords = [];
  if (Array.isArray(q.keywords) && q.keywords.length === 3) {
    keywords = q.keywords.map(String);
  } else if (expectedConcepts.length >= 3) {
    keywords = expectedConcepts.slice(0, 3).map(String);
  } else {
    keywords = [...expectedConcepts, "concept", "detail", "accuracy"].slice(0, 3).map(String);
  }

  return {
    index: idx,
    id: String(q._id || q.id || `q-${idx + 1}`),
    topic: q.topic || (q.mode === "video" ? "Video Technical" : (q.mode === "audio" ? "Audio Interview" : "Technical Medical Coding")),
    topicLabel: `Question ${idx + 1}`,
    question: questionText,
    correctAnswer,
    expectedConcepts,
    keywords,
  };
}

// ---------------------------------------------------------------------------
// Comprehensive Question Bank seeding. The AI Mock Interview asks ONLY questions from the staff-managed
// InterviewQuestion bank. Each domain is topped up with built-in questions so it always has 10+ to shuffle.
// ---------------------------------------------------------------------------
const BANK_DOMAINS = ["Medical Coding", "Medical Billing", "Accounts Receivable", "Eligibility & Verification"];
const MIN_QUESTIONS_PER_DOMAIN = 10;

function getDefaultInterviewSeed() {
  const fromBuiltIn = [];
  for (const domain of BANK_DOMAINS) {
    const bankKey = domain === "Eligibility & Verification" ? "Front Office" : domain;
    for (const q of DOMAIN_INTERVIEW_BANKS[bankKey] || []) {
      fromBuiltIn.push({
        domain,
        text: q.question,
        correctAnswer: q.correctAnswer || "",
        keywords: Array.isArray(q.keywords) && q.keywords.length >= 3 ? q.keywords.slice(0, 3).map(String) : [],
        mode: "both",
        active: true,
      });
    }
  }
  return [...fromBuiltIn, ...NEW_DEFAULT_INTERVIEW_QUESTIONS];
}

let interviewBankEnsured = false;
async function ensureDefaultInterviewBank(force = false) {
  if (interviewBankEnsured && !force) return;
  try {
    const seed = getDefaultInterviewSeed();
    for (const domain of BANK_DOMAINS) {
      const aliases = getDomainQueryAliases(domain);
      const existing = await InterviewQuestion.find({ domain: { $in: aliases } }).select("text active").lean();
      const activeCount = existing.filter((q) => q.active !== false).length;
      if (activeCount >= MIN_QUESTIONS_PER_DOMAIN) continue;
      const have = new Set(existing.map((q) => normalizeQText(q.text)));
      const missing = seed.filter((q) => q.domain === domain && !have.has(normalizeQText(q.text)));
      if (missing.length) await InterviewQuestion.insertMany(missing, { ordered: false });
    }
    interviewBankEnsured = true;
  } catch (e) {
    console.warn("ensureDefaultInterviewBank notice:", e.message);
  }
}

async function buildFreshAiInterviewSession(candidate) {
  await ensureDefaultInterviewBank();
  const candidateName = candidate.stage1?.fullName || "Candidate";
  const candidateDomain = candidate.stage2?.domain || "Medical Coding";
  const domainQueryAliases = getDomainQueryAliases(candidateDomain);
  const role = candidate.stage1?.currentRole || candidateDomain;
  const experienceYears = candidate.stage1?.experience ?? null;

  // Retrieve active interview questions from database bank matching domain (or general)
  const allActiveBankQuestions = await InterviewQuestion.find({
    active: true,
    $or: [
      { domain: { $in: domainQueryAliases } },
      { domain: "General" },
      { domain: { $exists: false } },
      { domain: null },
    ],
  }).lean();

  // Deduplicate active bank questions by normalized question text
  const seenNorms = new Set();
  const dedupedBank = [];
  for (const q of allActiveBankQuestions) {
    const norm = normalizeQText(q.text);
    if (!norm || seenNorms.has(norm)) continue;
    seenNorms.add(norm);
    dedupedBank.push(q);
  }

  // Prioritize domain-matched questions over generic ones
  dedupedBank.sort((a, b) => {
    const aMatch = domainQueryAliases.includes(a.domain) ? 1 : 0;
    const bMatch = domainQueryAliases.includes(b.domain) ? 1 : 0;
    return bMatch - aMatch;
  });

  // Identify questions this candidate has previously answered (if retaking)
  const priorNorms = new Set(
    [
      ...(candidate.stage8?.aiInterview?.questions || []),
      ...(candidate.stage8?.aiInterview?.questionRecords || []),
    ]
      .map((q) => normalizeQText(q.question || q.text))
      .filter(Boolean)
  );

  // Split into fresh (unseen by this candidate) and already-seen pools
  const unseenPool = dedupedBank.filter((q) => !priorNorms.has(normalizeQText(q.text)));
  const seenPool = dedupedBank.filter((q) => priorNorms.has(normalizeQText(q.text)));

  // Randomly sample from unseen pool first
  const chosenQuestions = shuffleArray(unseenPool).slice(0, 5);

  // If fewer than 5 unseen questions in bank, backfill from seen pool without duplicates
  if (chosenQuestions.length < 5 && seenPool.length > 0) {
    const shuffledSeen = shuffleArray(seenPool);
    for (const q of shuffledSeen) {
      if (chosenQuestions.length >= 5) break;
      const qNorm = normalizeQText(q.text);
      if (!chosenQuestions.some((c) => normalizeQText(c.text) === qNorm)) {
        chosenQuestions.push(q);
      }
    }
  }

  let finalRawQuestions = [...chosenQuestions];

  // Bank-only: if staff have deactivated so many questions that fewer than 5 remain, top up from the
  // built-in default bank copies of this domain's questions (never from AI-generated questions).
  if (finalRawQuestions.length < 5) {
    const defaults = shuffleArray(
      getDefaultInterviewSeed().filter((q) => domainQueryAliases.includes(q.domain))
    );
    for (const q of defaults) {
      if (finalRawQuestions.length >= 5) break;
      if (!finalRawQuestions.some((c) => normalizeQText(c.text) === normalizeQText(q.text))) {
        finalRawQuestions.push(q);
      }
    }
  }

  // Format exactly 5 distinct questions
  const questions = finalRawQuestions.slice(0, 5).map((q, idx) => formatQuestionItem(q, idx));

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
    // Count of candidate ("user") transcript messages the Vapi webhook has already
    // turned into a recorded answer - see routes/vapiInterview.js. Used to tell a
    // genuinely new spoken answer apart from Vapi re-delivering (retrying) the same
    // webhook call, which can carry a slightly re-transcribed (not byte-identical)
    // copy of an answer already processed and would otherwise be treated as a new
    // one - silently skipping the next question.
    lastProcessedUserCount: 0,
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
  const mockFinalScore = result.overallScore;
  const hasRealSelfIntro = Boolean(
    candidate.stage5?.selfIntroCompleted && typeof candidate.stage5?.aiScore === "number"
  );
  const selfIntroScore = hasRealSelfIntro ? candidate.stage5.aiScore : null;
  const isBothCompleted = hasRealSelfIntro && selfIntroScore !== null;
  const combinedScore = isBothCompleted ? Math.round((selfIntroScore + mockFinalScore) / 2) : null;

  candidate.stage5 = {
    ...(candidate.stage5 || {}),
    mockInterviewCompleted: true,
    mockScore: mockFinalScore,
    score: combinedScore,
    overallScore: combinedScore,
    medal: combinedScore ? (combinedScore >= 85 ? "Gold" : combinedScore >= 70 ? "Silver" : combinedScore >= 50 ? "Bronze" : "Verified") : null,
    status: isBothCompleted ? "completed" : "in_progress",
    endedEarly: status === "STOPPED",
    endedReason: status === "STOPPED" ? "USER_ENDED" : null,
    completedAt: isBothCompleted ? new Date() : (candidate.stage5?.completedAt || null),
  };

  if (isBothCompleted) {
    if (!candidate.completedStages.includes(5)) {
      candidate.completedStages.push(5);
    }
  }

  candidate.markModified("stage8");
  candidate.markModified("stage5");
  return result;
}

module.exports = { buildFreshAiInterviewSession, finalizeAiInterviewSession, getDomainQueryAliases, ensureDefaultInterviewBank };
