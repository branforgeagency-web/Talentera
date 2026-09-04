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

const MESSI_SYSTEM_PROMPT = `You are Messi, a friendly, warm, encouraging, and human-like AI interviewer conducting a 1-on-1 mock interview for a student/fresher candidate at Talentera.
You ask 5 simple, conversational questions, one at a time, covering: Introduction, Education, Skills, Projects, and Career Goals.
After the candidate answers, you briefly and warmly acknowledge their response (in 1-2 conversational sentences) before transitioning to the next question.
You never sound robotic, blunt, or overly formal. You interact like a supportive senior mentor or real human interviewer.
IMPORTANT GUIDELINES:
- The candidate's response is captured via live browser speech-to-text transcription. It may contain slight transcription artifacts, colloquial speech, or missing punctuation. Always treat the transcribed text as the candidate's actual spoken answer.
- CRITICAL: NEVER claim or complain that the audio was inaudible, that there was a connection or microphone issue, or that you could not hear the candidate. Always evaluate the substance and concepts of whatever transcribed words were provided.
- You are never robotic or scripted, and you never bluntly say "Correct!" or "Wrong!" - you respond the way a real, warm interviewer would, briefly acknowledging what was said.
- You understand natural conversational commands (repeat the question, I don't know, skip this, give me a hint, what do you mean, stop the interview) and respond to them naturally.
Always return the exact JSON shape requested, and nothing else - no markdown fences, no commentary outside the JSON.`;

// ---------------------------------------------------------------------------
// 5 Core Student/Fresher Interview Questions
// Designed specifically for freshers and students across 5 foundational topics:
// 1. Introduction, 2. Education, 3. Skills, 4. Projects, 5. Career Goals
// ---------------------------------------------------------------------------
const FALLBACK_QUESTION_BANK = [
  {
    topic: "Introduction",
    topicLabel: "Introduction & Background",
    question: "To start off, could you please introduce yourself and tell me a bit about your background and what inspired you to pursue this career path?",
    expectedConcepts: ["introduction", "background", "education", "passion", "interests", "motivation"],
  },
  {
    topic: "Education",
    topicLabel: "Education & Coursework",
    question: "Could you tell me about your educational background, and any specific subjects, coursework, or certifications you found most engaging?",
    expectedConcepts: ["degree", "college", "coursework", "academic", "learning", "subjects", "training"],
  },
  {
    topic: "Skills",
    topicLabel: "Key Skills & Strengths",
    question: "What key skills—both technical and soft skills—have you developed, and which one are you most confident in using?",
    expectedConcepts: ["technical skills", "soft skills", "communication", "problem solving", "tools", "strengths"],
  },
  {
    topic: "Projects",
    topicLabel: "Projects & Practical Work",
    question: "Can you tell me about a project, academic assignment, or practical case study you worked on, along with your role and what you learned from it?",
    expectedConcepts: ["project", "assignment", "role", "challenges", "implementation", "outcome", "teamwork"],
  },
  {
    topic: "Career Goals",
    topicLabel: "Career Aspirations & Goals",
    question: "Looking ahead, what are your short-term and long-term career goals, and what kind of work environment excites you most?",
    expectedConcepts: ["career goals", "short term", "long term", "growth", "learning", "contribution", "future plans"],
  },
];

function withIndices(list) {
  const defaultTopics = [
    { topic: "Introduction", topicLabel: "Introduction & Background" },
    { topic: "Education", topicLabel: "Education & Coursework" },
    { topic: "Skills", topicLabel: "Key Skills & Strengths" },
    { topic: "Projects", topicLabel: "Projects & Practical Work" },
    { topic: "Career Goals", topicLabel: "Career Aspirations & Goals" },
  ];

  return list.slice(0, 5).map((q, idx) => ({
    index: idx,
    topic: q.topic || defaultTopics[idx]?.topic || `Topic ${idx + 1}`,
    topicLabel: q.topicLabel || defaultTopics[idx]?.topicLabel || `Question ${idx + 1}`,
    question: q.question,
    expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts.filter(Boolean).map(String) : [],
  }));
}

/**
 * Generate exactly 5 simple interview questions for a student/fresher,
 * covering Introduction, Education, Skills, Projects, and Career Goals.
 */
async function generateInterviewQuestions({ candidateName = "", role = "", experienceYears } = {}) {
  const key = apiKey();
  const roleLabel = role || "Entry-Level Candidate";

  if (key) {
    try {
      const prompt = `Generate exactly 5 simple interview questions for a student / fresher candidate.
Candidate: ${candidateName || "the candidate"}, applying for / pursuing: "${roleLabel}".

The 5 questions MUST follow this exact sequential order and topics:
1. Introduction: Ask the candidate to introduce themselves, their background, and what inspired them.
2. Education: Ask about their educational background, college/degree, or favorite subjects/coursework.
3. Skills: Ask about their key technical and soft skills, and which they feel most confident in.
4. Projects: Ask about an academic project, assignment, or practical case study they worked on and their role.
5. Career Goals: Ask about their short-term and long-term career aspirations and growth plans.

Keep questions clear, simple, conversational, and suitable for a student/fresher.
Return STRICT JSON only: an array of exactly 5 objects, each shaped:
{ "topic": string, "topicLabel": string, "question": string, "expectedConcepts": string[] }
where expectedConcepts is 3-5 short key terms/concepts a good answer would touch on. No prose outside the JSON array, no markdown fences.`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 1800,
          system: "You are a friendly, encouraging senior interviewer designing a simple mock interview for students and freshers. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.5,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const cleaned = parsed
          .filter((q) => q && typeof q.question === "string" && q.question.trim())
          .map((q, idx) => ({
            topic: q.topic || FALLBACK_QUESTION_BANK[idx]?.topic,
            topicLabel: q.topicLabel || FALLBACK_QUESTION_BANK[idx]?.topicLabel,
            question: q.question.trim(),
            expectedConcepts: q.expectedConcepts || FALLBACK_QUESTION_BANK[idx]?.expectedConcepts,
          }));
        if (cleaned.length >= 5) {
          return withIndices(cleaned);
        }
      }
    } catch (err) {
      console.warn("Messi generateInterviewQuestions warning, using student fallback bank:", err.message);
    }
  }

  // Use the standard student/fresher question sequence
  return withIndices(FALLBACK_QUESTION_BANK);
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
  correct: [
    "Thank you for sharing that! That was very clear and gives great insight into your experience.",
    "That's fantastic—you explained that well and highlighted some great points.",
    "Excellent! I really appreciate the detail and enthusiasm you brought to that answer.",
  ],
  partial: [
    "Thank you for sharing! That gives a helpful overview of your background.",
    "Thanks for that response—it's great to hear your thoughts on this.",
    "I appreciate you sharing that; having that foundation is a wonderful starting point.",
  ],
  incorrect: [
    "Thank you for sharing your thoughts on that with me.",
    "Thanks for that response! Every experience is a great learning milestone.",
  ],
  no_answer: [
    "No worries at all, let's keep moving forward!",
    "That's completely fine—let's move right along to the next question.",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeHeuristicTurn({ utterance, currentQuestion, quickIntent }) {
  const intent = quickIntent || detectQuickIntent(utterance);
  const concepts = currentQuestion.expectedConcepts || [];

  if (intent === "stop") {
    return { intent: "stop", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: "Sure—I'll end our interview here. Your responses have been recorded for your final evaluation.", askFollowUp: false };
  }
  if (intent === "repeat") {
    return { intent: "repeat", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: `Of course! My question was: ${currentQuestion.question}`, askFollowUp: false };
  }
  if (intent === "skip") {
    return { intent: "skip", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: "No problem at all, let's move right along to the next question.", askFollowUp: false };
  }
  if (intent === "hint") {
    const hintTerm = concepts[0];
    return {
      intent: "hint",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: hintTerm ? `Here's a quick thought—think about ${hintTerm} and how you approached it.` : "Think about your personal experience and what you learned from it.",
      askFollowUp: false,
    };
  }
  if (intent === "clarify") {
    return { intent: "clarify", evaluation: "no_answer", score: 0, missingConcepts: [], messiReply: `Sure, let me rephrase that: ${currentQuestion.question}`, askFollowUp: false };
  }

  const { evaluation, score, missingConcepts } = computeHeuristicAnswerEvaluation(utterance, concepts);
  const messiReply = pick(HEURISTIC_REPLIES[evaluation] || HEURISTIC_REPLIES.partial);
  // Never ask follow-ups on the same question; maintain sequential 1-at-a-time 5 questions
  return { intent: "answer", evaluation, score, missingConcepts, messiReply, askFollowUp: false };
}

function cleanMessiReply(text) {
  let cleaned = String(text || "").trim();
  // Filter out any LLM hallucinations about audio dropouts, mic issues, or inaudibility
  if (/audio|connection|audible|couldn't hear|can't hear|microphone|cut out|hear you/i.test(cleaned)) {
    cleaned = cleaned
      .replace(/i (think|believe|guess|assume) (your|the) (audio|connection|voice) (was|is) (not|wasn't) (audible|clear|working|good)[^.]*\.?/gi, "")
      .replace(/i couldn't hear (you|your response|anything)[^.]*\.?/gi, "")
      .replace(/(there seems to be|due to|seems like) an? (audio|connection|microphone) (issue|problem)[^.]*\.?/gi, "")
      .replace(/your (audio|voice) (was|is) (inaudible|unclear|cut out)[^.]*\.?/gi, "")
      .trim();
    if (!cleaned) {
      cleaned = "Thank you for sharing that! Let's continue to the next question.";
    }
  }
  return cleaned;
}

function normalizeTurnResult(parsed, quickIntent, utterance, currentQuestion) {
  let intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : "unclear";
  if (quickIntent === "stop") intent = "stop";

  const wordCount = String(utterance || "").trim().split(/\s+/).filter(Boolean).length;
  if (quickIntent === "answer" && wordCount >= 2 && (intent === "unclear" || intent === "skip")) {
    intent = "answer";
  }

  let evaluation = VALID_EVALUATIONS.includes(parsed.evaluation) ? parsed.evaluation : "no_answer";
  let score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(10, Number(parsed.score))) : 0;
  let missingConcepts = Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts.filter(Boolean).map(String) : [];
  let messiReply = typeof parsed.messiReply === "string" && parsed.messiReply.trim() ? cleanMessiReply(parsed.messiReply.trim()) : "Thank you for sharing that—let's move on.";
  let askFollowUp = false; // Always false to ensure clean progression across 5 questions

  if (intent === "answer" && (evaluation === "no_answer" || score === 0) && wordCount >= 3) {
    const heuristic = computeHeuristicAnswerEvaluation(utterance, currentQuestion?.expectedConcepts || []);
    if (heuristic.score > score) {
      score = heuristic.score;
      evaluation = heuristic.evaluation;
      missingConcepts = heuristic.missingConcepts;
    }
  }

  if (quickIntent === "unclear") {
    intent = "skip";
    evaluation = "no_answer";
    score = 0;
    missingConcepts = [];
    askFollowUp = false;
    messiReply = "No worries at all, let's move right along to the next question.";
  }

  return { intent, evaluation, score, missingConcepts, messiReply, askFollowUp };
}

/**
 * Handle one candidate utterance in the live interview: classify intent,
 * evaluate the student answer, and produce Messi's brief natural-language acknowledgment.
 */
async function getMessiTurn({ session, candidateUtterance }) {
  const utterance = String(candidateUtterance || "").trim();
  const currentQuestion = session.questions[session.currentQuestionIndex];
  const quickIntent = detectQuickIntent(utterance);
  const key = apiKey();

  if (key) {
    try {
      const prompt = `Current question (#${session.currentQuestionIndex + 1} of ${session.questions.length}, Topic: "${currentQuestion.topic || "General"}"):
"${currentQuestion.question}"
Candidate's response: "${utterance}"

Classify intent, evaluate the response, and generate Messi's brief acknowledgment. Return STRICT JSON only:
{"intent": "answer|repeat|skip|hint|clarify|stop|unclear", "evaluation": "correct|partial|incorrect|no_answer", "score": 0-10, "missingConcepts": string[], "messiReply": string, "askFollowUp": false}

Guidelines:
- You are a warm, encouraging, human-like interviewer speaking with a student/fresher.
- If the candidate gave an answer (intent = "answer"), messiReply MUST be a brief, natural acknowledgment in 1-2 warm sentences acknowledging what they shared (e.g., "Thank you for that introduction! It's inspiring to hear what drives you.", or "That sounds like a great practical project—tackling those challenges shows solid initiative!").
- Do NOT repeat the next question in messiReply; the UI and speaker flow will introduce the next question.
- Do NOT sound robotic or formal. Never say blunt phrases like "Your answer is correct" or "Wrong".
- askFollowUp must ALWAYS be false. We ask 5 questions, one at a time, moving sequentially.
- If intent is "repeat", naturally re-ask the current question.
- If intent is "skip" or no answer (inactivity), messiReply should be a friendly reassurance like "No problem at all, let's move right along to the next question."`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 450,
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
        return normalizeTurnResult(parsed, quickIntent, utterance, currentQuestion);
      }
    } catch (err) {
      console.warn("Messi getMessiTurn warning, using heuristic evaluator:", err.message);
    }
  }

  return computeHeuristicTurn({ utterance, currentQuestion, quickIntent });
}

// ---------------------------------------------------------------------------
// Final report
// ---------------------------------------------------------------------------

function clampPercent(n, fallback = 70) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
}

function computeHeuristicFinalReport({ candidateName, role, questionRecords }) {
  const scored = questionRecords.map((r) => {
    const best = r.followUp ? Math.max(r.score, r.followUp.score) : r.score;
    return { ...r, effectiveScore: best };
  });
  const totalPossible = Math.max(1, scored.length * 10);
  const totalScore = scored.reduce((sum, r) => sum + (r.effectiveScore || 0), 0);
  const overallScore = Math.max(50, Math.min(95, Math.round((totalScore / totalPossible) * 100) || 72));

  const answeredCount = scored.filter((r) => r.evaluation !== "no_answer").length;
  const correctCount = scored.filter((r) => r.evaluation === "correct").length;
  const communication = clampPercent(65 + (answeredCount / Math.max(1, scored.length)) * 25);
  const clarity = clampPercent(60 + (correctCount / Math.max(1, scored.length)) * 30);
  const confidence = clampPercent(overallScore >= 70 ? overallScore + 5 : overallScore);

  const questionAnalysis = scored.map((r, idx) => ({
    questionNumber: idx + 1,
    topic: r.topic || ["Introduction", "Education", "Skills", "Projects", "Career Goals"][idx] || `Topic ${idx + 1}`,
    question: r.question,
    candidateAnswer: r.candidateAnswer || "(no answer)",
    evaluation: r.evaluation,
    score: r.effectiveScore || (r.candidateAnswer && r.candidateAnswer !== "(no answer)" ? 6 : 0),
    feedback:
      r.evaluation === "correct"
        ? "Articulated clearly with relevant details and strong enthusiasm."
        : r.evaluation === "partial"
        ? "Provided a good foundation; adding specific examples or metrics will make it even stronger."
        : r.evaluation === "no_answer"
        ? "No answer was recorded within the response window."
        : "Good attempt; could be structured more clearly with concrete details.",
  }));

  return {
    overallScore,
    breakdown: {
      communication,
      clarity,
      confidence,
      structuredThinking: clampPercent(overallScore - 3),
      technicalReadiness: clampPercent(overallScore + 2),
    },
    questionAnalysis,
    finalFeedback: `${candidateName || "Candidate"} completed the 5-question mock interview, answering ${answeredCount} of 5 questions with good conversational flow. Demonstrates promising foundational knowledge and a positive, coachable attitude suitable for entry-level opportunities.`,
    strengths: [
      "Clear, conversational tone and polite demeanor during the interview",
      "Good foundational awareness of personal skills and academic background",
      "Demonstrated enthusiasm and positive attitude toward career development",
    ],
    areasToImprove: [
      "Use the STAR method (Situation, Task, Action, Result) when describing practical projects",
      "Highlight specific tools, software, or technologies used during coursework",
      "Elaborate with concrete examples to showcase depth of practical skills",
    ],
    recommendedTopics: [
      "STAR Interview Technique",
      "Effective Project Presentation",
      "Resume & Portfolio Highlights",
      "Professional Spoken Communication",
    ],
  };
}

/**
 * Produce the final scored report from the recorded per-question results of a completed session.
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
            `Q${idx + 1} (${r.topic || "General"}): ${r.question}\nCandidate Answer: ${r.candidateAnswer || "(no answer)"}\nEvaluation: ${r.evaluation}`
        )
        .join("\n\n");

      const prompt = `You just finished conducting a live 5-question mock interview with ${candidateName || "a student"} for a fresher/entry-level position in "${role || "Professional Track"}".
Here is the transcript of the 5 questions (Introduction, Education, Skills, Projects, Career Goals):

${transcript}

Produce a constructive, student-friendly interview summary report. Return STRICT JSON only:
{
  "overallScore": 0-100,
  "breakdown": {"communication": 0-100, "clarity": 0-100, "confidence": 0-100, "structuredThinking": 0-100, "technicalReadiness": 0-100},
  "questionAnalysis": [{"questionNumber": number, "topic": string, "question": string, "candidateAnswer": string, "evaluation": "correct|partial|incorrect|no_answer", "score": 0-10, "feedback": string}],
  "finalFeedback": string (2-3 encouraging, constructive sentences summarizing performance for a student/fresher),
  "strengths": string[] (3-4 clear bullet points),
  "areasToImprove": string[] (3-4 constructive, actionable advice points for a fresher),
  "recommendedTopics": string[] (3-4 topics to practice)
}`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 2200,
          system: "You are Messi, an encouraging senior mentor providing a helpful, constructive interview evaluation report for a student/fresher. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.35,
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
              communication: clampPercent(parsed.breakdown?.communication),
              clarity: clampPercent(parsed.breakdown?.clarity),
              confidence: clampPercent(parsed.breakdown?.confidence),
              structuredThinking: clampPercent(parsed.breakdown?.structuredThinking),
              technicalReadiness: clampPercent(parsed.breakdown?.technicalReadiness),
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
