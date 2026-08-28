const axios = require("axios");

/**
 * "Messi" - the Live AI Technical Mock Interviewer engine (Stage 8 Track,
 * optional practice tool - see frontend/src/components/ClaudeMockInterviewBot.jsx
 * and backend/routes/candidate.js's /ai-interview/* routes).
 *
 * This file used to hold a much simpler pair of helpers
 * (getClaudeMockInterviewResponse / evaluateAndCompareAnswerWithClaude) that
 * powered a shuffle-and-compare bot against a manually-typed reference
 * answer. It's been rebuilt around three calls that drive a full live
 * interview: generating a tailored 5-question set, judging + replying to
 * each candidate utterance in natural language, and producing a final
 * scored report. Every call degrades to a heuristic fallback when
 * CLAUDE_API_KEY/ANTHROPIC_API_KEY is missing or the API call fails, so the
 * practice tool never hard-breaks - it just gets a little less rich.
 *
 * Model id: keep this in sync with the other Claude call sites in this
 * codebase (backend/utils/aiAssessment.js) - "claude-haiku-4-5-20251001" is
 * the verified-live id as of Aug 2026. Don't leave a dated snapshot id
 * hardcoded indefinitely; that's exactly how a previous bug here happened
 * (see project memory on the Aug 2026 model-retirement fix).
 */

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

function apiKey() {
  return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
}

function authHeaders(key) {
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
}

const MESSI_SYSTEM_PROMPT = `You are Messi, a professional, friendly, patient, and encouraging technical interviewer at Talentera, conducting a live 1-on-1 mock interview for a Healthcare Medical Coding / Revenue Cycle Management (RCM) candidate.
You ask one question at a time, remember the conversation so far, and evaluate answers on technical meaning - never on exact wording, accent, grammar, or phrasing. You are never robotic or scripted, and you never bluntly say "Correct!" or "Wrong!" - you respond the way a real, warm but professional interviewer would, briefly acknowledging what was said before moving the conversation forward.
You understand natural conversational commands (repeat the question, I don't know, skip this, give me a hint, what do you mean, stop the interview) and respond to them naturally rather than treating them as technical answers.
Always return the exact JSON shape requested, and nothing else - no markdown fences, no commentary outside the JSON.`;

// ---------------------------------------------------------------------------
// Fallback question bank - used when there's no API key or the question-
// generation call fails. Domain-matched to this platform's actual
// candidates (Medical Coding / Healthcare RCM), not a generic tech stack.
// Each entry's expectedConcepts are short key terms/concepts a strong answer
// should touch on - used for the heuristic (offline) answer evaluator.
// ---------------------------------------------------------------------------
const FALLBACK_QUESTION_BANK = [
  {
    question: "How do you determine the appropriate Medical Decision Making (MDM) level for an E/M encounter under current CMS guidelines?",
    expectedConcepts: ["number and complexity of problems", "amount of data reviewed", "risk of complications", "2 of 3 elements", "MDM"],
  },
  {
    question: "A claim comes back denied with ANSI code CO-197, pre-authorization missing. Walk me through your audit process.",
    expectedConcepts: ["prior authorization", "retro-authorization", "appeal", "clinical documentation", "medical necessity"],
  },
  {
    question: "When would you append Modifier 25 to an E/M code versus Modifier 59 to a procedure code?",
    expectedConcepts: ["modifier 25", "significant separately identifiable", "modifier 59", "distinct procedural service", "same date of service"],
  },
  {
    question: "What protocols do you follow to keep PHI secure and stay HIPAA compliant while coding remotely?",
    expectedConcepts: ["encrypted VPN", "multi-factor authentication", "privacy screen", "no local PHI storage", "clean desk policy"],
  },
  {
    question: "Why does ICD-10-CM specificity matter, and what happens when a coder assigns an unspecified code where a specific one was documented?",
    expectedConcepts: ["specificity", "medical necessity", "reimbursement", "denials", "documentation"],
  },
  {
    question: "What are NCCI edits, and how do they affect whether two CPT codes can be billed together on the same claim?",
    expectedConcepts: ["NCCI", "bundling", "column 1 column 2", "mutually exclusive", "modifier override"],
  },
  {
    question: "How do you prioritize your accounts receivable follow-up work across 30, 60, 90, and 120+ day aging buckets?",
    expectedConcepts: ["aging buckets", "timely filing", "highest dollar value", "payer response time", "write-off risk"],
  },
  {
    question: "A payer requires prior authorization for a procedure but the visit already happened. What are your options?",
    expectedConcepts: ["retro-authorization", "peer-to-peer review", "appeal", "medical necessity documentation", "timely filing limits"],
  },
  {
    question: "What's the difference between upcoding and appropriate specificity, and why does it matter for compliance?",
    expectedConcepts: ["upcoding", "fraud and abuse", "compliance", "documentation supports code", "OIG"],
  },
  {
    question: "You're coding an encounter where the physician's documentation conflicts with the nurse's notes on the diagnosis. What do you do before finalizing the code?",
    expectedConcepts: ["query the physician", "documentation clarification", "coding compliance", "do not assume", "physician query process"],
  },
];

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function withIndices(list) {
  return list.slice(0, 5).map((q, idx) => ({
    index: idx,
    question: q.question,
    expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts.filter(Boolean).map(String) : [],
  }));
}

/**
 * Generate exactly 5 interview questions tailored to the candidate's role
 * and experience level, in the Medical Coding / RCM domain.
 */
async function generateInterviewQuestions({ candidateName = "", role = "", experienceYears } = {}) {
  const key = apiKey();
  const roleLabel = role || "Medical Coder";
  const expLabel = Number.isFinite(Number(experienceYears)) && Number(experienceYears) >= 0 ? `${experienceYears} years of experience` : "an unspecified amount of experience";

  if (key) {
    try {
      const prompt = `Generate exactly 5 technical interview questions for a Healthcare Medical Coding / Revenue Cycle Management (RCM) candidate.
Candidate: ${candidateName || "the candidate"}, target role "${roleLabel}", ${expLabel}.
Cover a realistic mix across: ICD-10/CPT coding guidelines, E/M leveling & modifiers, denial management & appeals, HIPAA/PHI compliance, RCM workflow (eligibility, charge capture, AR follow-up), payer policy, coding compliance/fraud awareness, and at least one real-world scenario/problem-solving question. Scale difficulty to the stated experience (junior = foundational recall, senior = judgment/edge cases).
Return STRICT JSON only: an array of exactly 5 objects, each shaped { "question": string, "expectedConcepts": string[] } where expectedConcepts is 3-6 short key terms/concepts a strong answer should mention. No prose outside the JSON array, no markdown fences.`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 2200,
          system: "You are a senior Healthcare RCM / Medical Coding technical interview designer. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.6,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const cleaned = parsed
          .filter((q) => q && typeof q.question === "string" && q.question.trim())
          .map((q) => ({ question: q.question.trim(), expectedConcepts: q.expectedConcepts }));
        if (cleaned.length >= 5) {
          // Target is 5 questions and cleaned already has at least 5, so no
          // padding from the fallback bank is needed (unlike when the
          // target used to be 10 and a shorter LLM response needed topping
          // up) - just take the first 5.
          return withIndices(cleaned);
        }
      }
    } catch (err) {
      console.warn("Messi generateInterviewQuestions warning, using fallback bank:", err.message);
    }
  }

  // Shuffle so a fallback (no API key / API call failed) session doesn't
  // always ask the same first 5 of the 10-question bank.
  return withIndices(shuffleArray(FALLBACK_QUESTION_BANK));
}

// ---------------------------------------------------------------------------
// Per-turn conversation handling
// ---------------------------------------------------------------------------

const VALID_INTENTS = ["answer", "repeat", "skip", "hint", "clarify", "stop", "unclear"];
const VALID_EVALUATIONS = ["correct", "partial", "incorrect", "no_answer"];

// A fast local classifier that runs BEFORE (and as a safety net around) any
// LLM call. Two jobs: (1) let "stop the interview" always work even with no
// API key / a slow or failed API call - this is safety-critical per the
// product spec, so it must never depend on a network round-trip succeeding;
// (2) power the fully-offline heuristic fallback path.
function detectQuickIntent(utterance) {
  const t = String(utterance || "").trim().toLowerCase();
  if (!t) return "unclear";
  if (/\b(stop|end|quit|terminate)\b[\s\S]*\binterview\b/.test(t) || /^(stop|end)( it| this)?$/.test(t)) return "stop";
  if (/\brepeat\b|\bsay (that|it) again\b|didn't (catch|hear) that|come again/.test(t)) return "repeat";
  if (/\bskip\b|\bnext question\b|move on|pass on this one|\b(i )?(don't|do not|dont) know\b|\bno idea\b|\bnot sure\b/.test(t)) return "skip";
  if (/\bhint\b|\bclue\b|give me a hint|help me out/.test(t)) return "hint";
  if (/what do you mean|\bclarify\b|rephrase|explain the question/.test(t)) return "clarify";
  return "answer";
}

function computeHeuristicAnswerEvaluation(utterance, expectedConcepts) {
  const text = String(utterance || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const concepts = (expectedConcepts || []).map((c) => String(c).toLowerCase());

  if (words.length < 3) {
    return { evaluation: "no_answer", score: 0, missingConcepts: concepts };
  }

  const lower = text.toLowerCase();
  const matched = concepts.filter((c) => lower.includes(c));
  const missingConcepts = concepts.filter((c) => !matched.includes(c));

  if (!concepts.length) {
    // No concept list to compare against (shouldn't normally happen) - fall
    // back to a weak length-based proxy so the interview still progresses.
    return words.length >= 15 ? { evaluation: "partial", score: 6, missingConcepts: [] } : { evaluation: "incorrect", score: 3, missingConcepts: [] };
  }

  const ratio = matched.length / concepts.length;
  if (ratio >= 0.6) return { evaluation: "correct", score: 9, missingConcepts };
  if (matched.length >= Math.min(2, concepts.length)) return { evaluation: "partial", score: 6, missingConcepts };
  if (matched.length >= 1) return { evaluation: "partial", score: 4, missingConcepts };
  return { evaluation: "incorrect", score: 2, missingConcepts };
}

const HEURISTIC_REPLIES = {
  correct: ["Good, that covers what I was looking for.", "That's a solid answer - you hit the key points.", "Nice, that's exactly the kind of detail I wanted to hear."],
  partial: ["You've covered part of it - there's more to unpack here.", "That's on the right track, though a piece of it is missing."],
  incorrect: ["I see your reasoning, though let's look at this from another angle.", "That's not quite the direction I was expecting, but let's continue."],
  no_answer: ["No worries, let's move on to the next question.", "That's alright - we'll come back to topics like this later."],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeHeuristicTurn({ utterance, currentQuestion, quickIntent, followUpCount }) {
  const intent = quickIntent || detectQuickIntent(utterance);
  const concepts = currentQuestion.expectedConcepts || [];

  if (intent === "stop") {
    return { intent: "stop", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: "Sure - I'll end the interview here. Your responses have been submitted for evaluation.", askFollowUp: false };
  }
  if (intent === "repeat") {
    return { intent: "repeat", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: `Of course. My question was: ${currentQuestion.question}`, askFollowUp: false };
  }
  if (intent === "skip") {
    return { intent: "skip", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: "No problem, let's move on to the next question.", askFollowUp: false };
  }
  if (intent === "hint") {
    const hintTerm = concepts[0];
    return {
      intent: "hint",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: hintTerm ? `Here's a hint - think about ${hintTerm}.` : "Think through the process step by step, and consider who's involved at each stage.",
      askFollowUp: false,
    };
  }
  if (intent === "clarify") {
    return { intent: "clarify", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: `Sure, let me rephrase that: ${currentQuestion.question}`, askFollowUp: false };
  }

  const { evaluation, score, missingConcepts } = computeHeuristicAnswerEvaluation(utterance, concepts);
  const askFollowUp = evaluation === "partial" && followUpCount === 0;
  let messiReply = pick(HEURISTIC_REPLIES[evaluation] || HEURISTIC_REPLIES.incorrect);
  if (askFollowUp) {
    messiReply += missingConcepts.length ? ` Can you also tell me a bit about ${missingConcepts[0]}?` : " Can you expand on that a little more?";
  }
  return { intent: "answer", evaluation, score, missingConcepts, messiReply, askFollowUp };
}

function normalizeTurnResult(parsed, quickIntent) {
  let intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : "unclear";
  // Safety net: if our fast local classifier is confident the candidate said
  // to stop, honor that even if the LLM classified it differently - ending
  // the interview on command is safety-critical and must not depend on the
  // model getting it right.
  if (quickIntent === "stop") intent = "stop";

  let evaluation = VALID_EVALUATIONS.includes(parsed.evaluation) ? parsed.evaluation : "no_answer";
  let score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(10, Number(parsed.score))) : 0;
  let missingConcepts = Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts.filter(Boolean).map(String) : [];
  let messiReply = typeof parsed.messiReply === "string" && parsed.messiReply.trim() ? parsed.messiReply.trim() : "Thank you - let's continue.";
  let askFollowUp = Boolean(parsed.askFollowUp) && intent === "answer";

  // detectQuickIntent() only ever returns "unclear" for a candidateUtterance
  // that is genuinely empty (silence-timeout auto-submit, or nothing was
  // typed/heard) - see detectQuickIntent above. That specifically means "no
  // answer was given", not "the LLM was confused by real words". Always
  // treat it as a skip and advance to the next question, regardless of what
  // the LLM guessed - otherwise a candidate who stays silent gets stuck
  // repeating the same question forever (this must not depend on the model
  // getting it right, same rationale as the "stop" override above).
  if (quickIntent === "unclear") {
    intent = "skip";
    evaluation = "no_answer";
    score = 0;
    missingConcepts = [];
    askFollowUp = false;
    messiReply = "No worries, let's move on to the next question.";
  }

  return { intent, evaluation, score, missingConcepts, messiReply, askFollowUp };
}

/**
 * Handle one candidate utterance in the live interview: classify intent,
 * evaluate the answer if it is one, and produce Messi's natural-language
 * reply (which, when askFollowUp is true, itself contains the follow-up
 * question - matching the "Good, you mentioned X - what about Y?" style
 * from the product spec, rather than a separate field).
 */
async function getMessiTurn({ session, candidateUtterance }) {
  const utterance = String(candidateUtterance || "").trim();
  const currentQuestion = session.questions[session.currentQuestionIndex];
  const followUpCount = session.followUpCountForCurrent || 0;
  const isLastQuestion = session.currentQuestionIndex === session.questions.length - 1;
  const quickIntent = detectQuickIntent(utterance);
  const key = apiKey();

  if (key) {
    try {
      const recentRecords = (session.questionRecords || []).slice(-3);
      const recentContext = recentRecords
        .map((r) => `Q: ${r.question}\nCandidate: ${r.candidateAnswer || "(no answer)"}\nAssessed as: ${r.evaluation}`)
        .join("\n---\n");

      const prompt = `Current question (#${session.currentQuestionIndex + 1} of ${session.questions.length}, ${isLastQuestion ? "this is the LAST question" : "not the last question"}):
"${currentQuestion.question}"
Key concepts a strong answer should touch: ${(currentQuestion.expectedConcepts || []).join(", ") || "(none specified)"}
Follow-ups already asked on this question: ${followUpCount}
${recentContext ? `Recent conversation for context:\n${recentContext}\n` : ""}
Candidate just said: "${utterance}"

Classify and respond. Return STRICT JSON only, shaped exactly like:
{"intent": "answer|repeat|skip|hint|clarify|stop|unclear", "evaluation": "correct|partial|incorrect|no_answer", "score": 0-10, "missingConcepts": string[], "messiReply": string, "askFollowUp": boolean}

Rules:
- evaluation/score/missingConcepts only matter when intent is "answer" - judge technical meaning and completeness, not exact wording; accent, grammar, and phrasing never count against the candidate.
- If intent is "repeat", messiReply must naturally re-ask the exact question above.
- If intent is "hint", messiReply gives a small nudge toward one key concept WITHOUT giving the answer away, and askFollowUp must be false.
- If intent is "clarify", messiReply rephrases the question in different words.
- If intent is "skip" or "stop", set evaluation to "no_answer" and score 0.
- Never say "correct"/"wrong" bluntly, never sound robotic. Respond like a warm but professional interviewer (e.g. "Good, you mentioned X - can you also explain when you'd use Y instead?" or "I see what you're getting at - there's one distinction worth clarifying..."). Keep messiReply to 1-3 sentences.
- Set askFollowUp to true only if intent is "answer", evaluation is "partial" (or occasionally a strong "correct" worth probing deeper), and follow-ups already asked on this question is 0. When askFollowUp is true, messiReply MUST end with the natural follow-up question itself, not just an acknowledgement.`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 500,
          system: MESSI_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.55,
        },
        { headers: authHeaders(key), timeout: 20000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return normalizeTurnResult(parsed, quickIntent);
      }
    } catch (err) {
      console.warn("Messi getMessiTurn warning, using heuristic evaluator:", err.message);
    }
  }

  return computeHeuristicTurn({ utterance, currentQuestion, quickIntent, followUpCount });
}

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------

function clampPercent(n, fallback = 60) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
}

function computeHeuristicFinalReport({ candidateName, role, questionRecords }) {
  const scored = questionRecords.map((r) => {
    const best = r.followUp ? Math.max(r.score, r.followUp.score) : r.score;
    return { ...r, effectiveScore: best };
  });
  const totalPossible = scored.length * 10;
  const totalScore = scored.reduce((sum, r) => sum + r.effectiveScore, 0);
  const overallScore = totalPossible > 0 ? Math.round((totalScore / totalPossible) * 100) : 0;

  const answeredCount = scored.filter((r) => r.evaluation !== "no_answer").length;
  const correctCount = scored.filter((r) => r.evaluation === "correct").length;
  const communication = clampPercent(60 + (answeredCount / Math.max(1, scored.length)) * 30);
  const accuracy = clampPercent((correctCount / Math.max(1, scored.length)) * 100);

  const questionAnalysis = scored.map((r, idx) => ({
    questionNumber: idx + 1,
    question: r.question,
    candidateAnswer: r.followUp ? `${r.candidateAnswer || "(no answer)"} | Follow-up: ${r.followUp.candidateAnswer || "(no answer)"}` : r.candidateAnswer || "(no answer)",
    evaluation: r.evaluation,
    expectedConcepts: r.expectedConcepts || [],
    missingConcepts: r.missingConcepts || [],
    score: r.effectiveScore,
    feedback:
      r.evaluation === "correct"
        ? "Covered the key concepts clearly."
        : r.evaluation === "partial"
        ? `Touched on part of the expected answer; missing: ${(r.missingConcepts || []).join(", ") || "some supporting detail"}.`
        : r.evaluation === "no_answer"
        ? "No substantive answer was given."
        : "Missed the core concepts expected for this question.",
  }));

  const weakTopics = scored.filter((r) => r.evaluation === "incorrect" || r.evaluation === "no_answer").map((r) => r.expectedConcepts?.[0]).filter(Boolean);
  const strongTopics = scored.filter((r) => r.evaluation === "correct").map((r) => r.expectedConcepts?.[0]).filter(Boolean);

  return {
    overallScore,
    breakdown: {
      technicalKnowledge: accuracy,
      problemSolving: clampPercent(overallScore - 5),
      communication,
      accuracy,
      confidence: clampPercent(overallScore),
    },
    questionAnalysis,
    finalFeedback: `${candidateName || "You"} answered ${answeredCount} of ${scored.length} questions with a substantive response, ${correctCount} of which were strong. Overall this practice interview scored ${overallScore}/100 for the ${role || "role"} track.`,
    strengths: strongTopics.length ? [...new Set(strongTopics)].slice(0, 3) : ["Willingness to work through unfamiliar questions"],
    areasToImprove: weakTopics.length ? [...new Set(weakTopics)].slice(0, 3) : ["Keep practicing to build consistency across topics"],
    recommendedTopics: [...new Set([...weakTopics, ...(scored.length ? scored[scored.length - 1].expectedConcepts || [] : [])])].slice(0, 4),
  };
}

/**
 * Produce the final scored report (Section 13/14 of the product spec) from
 * the recorded per-question results of a completed session.
 */
async function generateFinalReport({ candidateName = "", role = "", questionRecords = [] } = {}) {
  const key = apiKey();
  if (!questionRecords.length) {
    return computeHeuristicFinalReport({ candidateName, role, questionRecords: [] });
  }

  if (key) {
    try {
      const transcript = questionRecords
        .map(
          (r, idx) =>
            `Q${idx + 1}: ${r.question}\nExpected concepts: ${(r.expectedConcepts || []).join(", ")}\nCandidate answer: ${r.candidateAnswer || "(no answer)"}${
              r.followUp ? `\nFollow-up question: ${r.followUp.question}\nFollow-up answer: ${r.followUp.candidateAnswer || "(no answer)"}` : ""
            }\nAssessed as: ${r.evaluation} (heuristic score ${r.score}/10)`
        )
        .join("\n\n");

      const prompt = `You just finished conducting a live technical mock interview with ${candidateName || "a candidate"} for the "${role || "Medical Coder"}" role. Here is the full transcript with your own in-the-moment assessments:

${transcript}

Produce a final evaluation report. Return STRICT JSON only, shaped exactly like:
{
  "overallScore": 0-100,
  "breakdown": {"technicalKnowledge": 0-100, "problemSolving": 0-100, "communication": 0-100, "accuracy": 0-100, "confidence": 0-100},
  "questionAnalysis": [{"questionNumber": number, "question": string, "candidateAnswer": string, "evaluation": "correct|partial|incorrect|no_answer", "expectedConcepts": string[], "missingConcepts": string[], "score": 0-10, "feedback": string}],
  "finalFeedback": string (2-4 sentence personalized paragraph, encouraging but honest),
  "strengths": string[] (2-4 items),
  "areasToImprove": string[] (2-4 items),
  "recommendedTopics": string[] (2-5 items)
}
Base every number on the actual answers above - do not inflate scores for answers that were incorrect or missing.`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 2500,
          system: "You are Messi, wrapping up a live technical mock interview with a final, fair, evidence-based evaluation report. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed.overallScore !== "undefined" && Array.isArray(parsed.questionAnalysis)) {
          return {
            overallScore: clampPercent(parsed.overallScore),
            breakdown: {
              technicalKnowledge: clampPercent(parsed.breakdown?.technicalKnowledge),
              problemSolving: clampPercent(parsed.breakdown?.problemSolving),
              communication: clampPercent(parsed.breakdown?.communication),
              accuracy: clampPercent(parsed.breakdown?.accuracy),
              confidence: clampPercent(parsed.breakdown?.confidence),
            },
            questionAnalysis: parsed.questionAnalysis,
            finalFeedback: parsed.finalFeedback || "",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            areasToImprove: Array.isArray(parsed.areasToImprove) ? parsed.areasToImprove : [],
            recommendedTopics: Array.isArray(parsed.recommendedTopics) ? parsed.recommendedTopics : [],
          };
        }
      }
    } catch (err) {
      console.warn("Messi generateFinalReport warning, using heuristic report:", err.message);
    }
  }

  return computeHeuristicFinalReport({ candidateName, role, questionRecords });
}

module.exports = {
  generateInterviewQuestions,
  getMessiTurn,
  generateFinalReport,
  detectQuickIntent,
};
