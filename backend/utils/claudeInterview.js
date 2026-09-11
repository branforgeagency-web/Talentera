const axios = require("axios");

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

const MESSI_SYSTEM_PROMPT = `You are Messi, an expert medical coding and healthcare RCM technical interviewer conducting a mock interview for Talentera candidates.
You evaluate the candidate's spoken response by directly comparing it against the Reference Correct Answer stored in the question database.
Guidelines:
- Evaluate technical accuracy, concept coverage, and understanding relative to the Reference Correct Answer.
- The candidate's response is transcribed via speech-to-text and may have slight transcription artifacts; evaluate the substance of what was communicated.
- NEVER complain about microphone/audio issues.
- Return strictly valid JSON with no markdown formatting.`;

// ---------------------------------------------------------------------------
// 5 Core Medical Coding Interview Questions with Authoritative Correct Answers
// ---------------------------------------------------------------------------
const FALLBACK_QUESTION_BANK = [
  {
    topic: "ICD-10-CM Diagnosis Coding",
    topicLabel: "1. ICD-10-CM Coding",
    question: "In simple terms, what is an ICD-10-CM code used for in medical coding?",
    correctAnswer: "An ICD-10-CM code is a standardized diagnostic classification code used by healthcare providers to classify and report patient diagnoses, diseases, symptoms, injuries, and reasons for encounter on medical claims for billing and reimbursement.",
    expectedConcepts: ["icd-10-cm", "diagnosis", "disease", "symptom", "condition", "patient encounter", "reimbursement", "billing", "classification"],
  },
  {
    topic: "CPT Procedure Codes",
    topicLabel: "2. CPT Procedure Codes",
    question: "What is a CPT code used for, and how does it differ from an ICD-10 code?",
    correctAnswer: "A CPT (Current Procedural Terminology) code is used to report medical, surgical, and diagnostic procedures and healthcare services performed by physicians, whereas ICD-10-CM codes explain the diagnosis or medical reason why the service was necessary.",
    expectedConcepts: ["cpt", "procedure", "surgical", "service", "treatment", "physician service", "diagnostic", "icd-10", "diagnosis", "medical necessity"],
  },
  {
    topic: "Evaluation & Management (E/M) Coding",
    topicLabel: "3. E/M Coding",
    question: "What does an Evaluation and Management (E/M) code describe, and how is its level determined?",
    correctAnswer: "An E/M code represents the provider-patient clinical encounter (office visits, consultations, hospital visits), with the code level determined primarily by the complexity of Medical Decision Making (MDM) or total time spent by the physician on the date of encounter.",
    expectedConcepts: ["e/m", "evaluation and management", "patient visit", "office visit", "medical decision making", "mdm", "time", "complexity", "encounter"],
  },
  {
    topic: "Medical Billing & Claims",
    topicLabel: "4. Billing & Claims",
    question: "What is a medical claim, and how should a medical coder or biller handle a claim denial?",
    correctAnswer: "A medical claim is an itemized bill submitted to an insurance payer for healthcare services. When a denial occurs, the coder reviews the denial reason code on the EOB/ERA, checks for coding or documentation errors, corrects the claim, and submits an appeal or corrected claim.",
    expectedConcepts: ["medical claim", "insurance claim", "denial", "claim denial", "eob", "era", "appeal", "corrected claim", "remittance", "investigate", "documentation"],
  },
  {
    topic: "HIPAA & Compliance",
    topicLabel: "5. HIPAA & Compliance",
    question: "What is HIPAA, and why is protecting patient health information crucial in medical coding?",
    correctAnswer: "HIPAA (Health Insurance Portability and Accountability Act) is a federal law that safeguards Protected Health Information (PHI) through privacy and security rules, ensuring patient confidentiality, data protection, and regulatory compliance across all medical records and billing workflows.",
    expectedConcepts: ["hipaa", "phi", "protected health information", "privacy rule", "security rule", "confidentiality", "compliance", "patient data", "security"],
  },
];

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
  "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
  "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs",
  "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
  "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves"
]);

function extractKeywords(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

function withIndices(list) {
  return list.slice(0, 5).map((q, idx) => ({
    index: idx,
    id: q.id || q._id || `q-${idx + 1}`,
    topic: q.topic || FALLBACK_QUESTION_BANK[idx]?.topic || `Topic ${idx + 1}`,
    topicLabel: q.topicLabel || FALLBACK_QUESTION_BANK[idx]?.topicLabel || `Question ${idx + 1}`,
    question: q.question || q.text,
    correctAnswer: q.correctAnswer || FALLBACK_QUESTION_BANK[idx]?.correctAnswer || "",
    expectedConcepts: Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0
      ? q.expectedConcepts.map(String)
      : extractKeywords(q.correctAnswer || FALLBACK_QUESTION_BANK[idx]?.correctAnswer || ""),
  }));
}

/**
 * Generate or fetch structured medical coding interview questions
 */
async function generateInterviewQuestions({ candidateName = "", role = "", experienceYears } = {}) {
  const key = apiKey();
  const roleLabel = role || "Medical Coder";

  if (key) {
    try {
      const prompt = `Generate exactly 5 medical coding interview questions with model answers for a candidate applying for: "${roleLabel}".
Topics:
1. ICD-10-CM Diagnosis Coding
2. CPT Procedure Codes
3. Evaluation & Management (E/M) Coding
4. Medical Billing & Claims
5. HIPAA & Compliance

Return STRICT JSON only as an array of 5 objects:
[
  {
    "topic": string,
    "topicLabel": string,
    "question": string (concise single question),
    "correctAnswer": string (authoritative, clear correct answer),
    "expectedConcepts": string[] (5-8 key technical terms that must be in a good answer)
  }
]`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 1800,
          system: "You are an experienced medical coding supervisor and technical interviewer. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.4,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        const cleaned = parsed
          .filter((q) => q && typeof (q.question || q.text) === "string")
          .map((q, idx) => ({
            topic: q.topic || FALLBACK_QUESTION_BANK[idx]?.topic,
            topicLabel: q.topicLabel || FALLBACK_QUESTION_BANK[idx]?.topicLabel,
            question: (q.question || q.text).trim(),
            correctAnswer: q.correctAnswer || FALLBACK_QUESTION_BANK[idx]?.correctAnswer,
            expectedConcepts: q.expectedConcepts || FALLBACK_QUESTION_BANK[idx]?.expectedConcepts,
          }));
        if (cleaned.length >= 5) {
          return withIndices(cleaned);
        }
      }
    } catch (err) {
      console.warn("generateInterviewQuestions LLM notice, using fallback question bank:", err.message);
    }
  }

  return withIndices(FALLBACK_QUESTION_BANK);
}

// ---------------------------------------------------------------------------
// Intent Detection & Heuristic Answer Comparison
// ---------------------------------------------------------------------------
const VALID_INTENTS = ["answer", "repeat", "skip", "hint", "clarify", "stop", "unclear"];
const VALID_EVALUATIONS = ["correct", "partial", "incorrect", "no_answer"];

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

/**
 * Compare candidate answer directly against the database's correctAnswer and expectedConcepts
 */
function computeHeuristicAnswerEvaluation(utterance, questionOrAnswer = {}, maybeConcepts = []) {
  const text = String(utterance || "").trim();
  const words = text.split(/\s+/).filter(Boolean);
  const lowerCandidate = text.toLowerCase();

  const modelAnswer = typeof questionOrAnswer === "string" ? questionOrAnswer : (questionOrAnswer?.correctAnswer || "");
  let concepts = Array.isArray(maybeConcepts) && maybeConcepts.length > 0
    ? maybeConcepts
    : (Array.isArray(questionOrAnswer?.expectedConcepts) && questionOrAnswer.expectedConcepts.length > 0
        ? questionOrAnswer.expectedConcepts
        : extractKeywords(modelAnswer));

  if (words.length < 3) {
    return {
      evaluation: "no_answer",
      score: 0,
      missingConcepts: concepts,
      matchedConcepts: [],
      feedback: "No substantial answer recorded.",
    };
  }

  // 1. Keyword & concept matching
  const candidateKeywords = new Set(extractKeywords(text));
  const matched = [];
  const missing = [];

  concepts.forEach((concept) => {
    const cLower = concept.toLowerCase().trim();
    if (!cLower) return;
    // Check exact substring or keyword presence
    if (lowerCandidate.includes(cLower)) {
      matched.push(concept);
    } else {
      // Check partial/stemmed word match
      const cWords = cLower.split(/\s+/);
      const isMatched = cWords.some((w) => candidateKeywords.has(w) || (w.length > 4 && lowerCandidate.includes(w.slice(0, -1))));
      if (isMatched) {
        matched.push(concept);
      } else {
        missing.push(concept);
      }
    }
  });

  // 2. Compute similarity ratio with correct answer
  const modelKeywords = extractKeywords(modelAnswer);
  let modelWordsMatched = 0;
  modelKeywords.forEach((w) => {
    if (candidateKeywords.has(w) || lowerCandidate.includes(w)) {
      modelWordsMatched++;
    }
  });

  const conceptCoverage = concepts.length > 0 ? matched.length / concepts.length : 0;
  const modelCoverage = modelKeywords.length > 0 ? modelWordsMatched / modelKeywords.length : 0;
  const blendedCoverage = Math.max(conceptCoverage, modelCoverage * 0.85 + conceptCoverage * 0.15);

  let score = 0;
  let evaluation = "incorrect";

  if (blendedCoverage >= 0.65 || (matched.length >= 4 && words.length >= 10)) {
    evaluation = "correct";
    score = Math.min(10, Math.max(8, Math.round(blendedCoverage * 10)));
  } else if (blendedCoverage >= 0.35 || (matched.length >= 2 && words.length >= 6)) {
    evaluation = "partial";
    score = Math.min(7, Math.max(5, Math.round(blendedCoverage * 10)));
  } else if (matched.length >= 1 || words.length >= 5) {
    evaluation = "incorrect";
    score = Math.min(4, Math.max(2, Math.round(blendedCoverage * 10) || 3));
  } else {
    evaluation = "incorrect";
    score = 1;
  }

  return {
    evaluation,
    score,
    missingConcepts: missing,
    matchedConcepts: matched,
    feedback:
      evaluation === "correct"
        ? `Accurately matched key concepts: ${matched.slice(0, 3).join(", ")}.`
        : evaluation === "partial"
        ? `Covered ${matched.join(", ")}; missed: ${missing.slice(0, 2).join(", ")}.`
        : `Answer missed core reference concepts (${missing.slice(0, 3).join(", ")}).`,
  };
}

const HEURISTIC_REPLIES = {
  correct: [
    "Excellent! That was accurate and directly addressed the core concepts.",
    "Very well explained! You captured the key technical points effectively.",
    "Great answer! That demonstrates clear knowledge of the workflow.",
  ],
  partial: [
    "Thank you. You covered some solid foundational points.",
    "Good start. Bringing in additional specific details makes it even stronger.",
    "Thanks for that response—you touched on relevant concepts.",
  ],
  incorrect: [
    "Thank you for sharing your thoughts on that question.",
    "Thanks for your response. Let's keep progressing through the interview.",
  ],
  no_answer: [
    "No worries at all, let's keep moving forward!",
    "That's completely fine—moving along to the next question.",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeHeuristicTurn({ utterance, currentQuestion, quickIntent }) {
  const intent = quickIntent || detectQuickIntent(utterance);

  if (intent === "stop") {
    return {
      intent: "stop",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: "Understood—concluding our interview here. Your responses are being finalized.",
      askFollowUp: false,
    };
  }
  if (intent === "repeat") {
    return {
      intent: "repeat",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `Certainly! My question was: ${currentQuestion.question}`,
      askFollowUp: false,
    };
  }
  if (intent === "skip") {
    return {
      intent: "skip",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: currentQuestion.expectedConcepts || [],
      messiReply: "No problem at all, let's proceed to the next question.",
      askFollowUp: false,
    };
  }
  if (intent === "hint") {
    const hintTerm = (currentQuestion.expectedConcepts || [])[0] || "the core definition";
    return {
      intent: "hint",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `Here's a clue: think about how ${hintTerm} relates to medical coding and healthcare billing.`,
      askFollowUp: false,
    };
  }
  if (intent === "clarify") {
    return {
      intent: "clarify",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `To clarify: ${currentQuestion.question}`,
      askFollowUp: false,
    };
  }

  const evalResult = computeHeuristicAnswerEvaluation(utterance, currentQuestion);
  const messiReply = pick(HEURISTIC_REPLIES[evalResult.evaluation] || HEURISTIC_REPLIES.partial);
  return {
    intent: "answer",
    evaluation: evalResult.evaluation,
    score: evalResult.score,
    missingConcepts: evalResult.missingConcepts,
    matchedConcepts: evalResult.matchedConcepts,
    messiReply,
    askFollowUp: false,
  };
}

function cleanMessiReply(text) {
  let cleaned = String(text || "").trim();
  const AUDIO_COMPLAINT_RE =
    /audio|microphone|\bmic\b|inaudible|audible|cut(ting)? out|couldn'?t (hear|catch|understand)|can'?t (hear|catch|understand)|didn'?t (hear|catch|come through)|not able to hear|hear you|not connected|didn'?t connect|connect(ed|ing)? (correctly|properly)|connection (issue|problem|error|trouble)|check your (mic|audio|microphone|connection)|background noise|no sound|speak up/i;
  if (AUDIO_COMPLAINT_RE.test(cleaned)) {
    return "Thank you for sharing that! Let's continue to the next question.";
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
  let score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(10, Math.round(Number(parsed.score)))) : 0;
  let missingConcepts = Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts.filter(Boolean).map(String) : [];
  let messiReply = typeof parsed.messiReply === "string" && parsed.messiReply.trim()
    ? cleanMessiReply(parsed.messiReply.trim())
    : "Thank you for sharing that response.";

  // Safety fallback if LLM returned 0 for a non-trivial answer
  if (intent === "answer" && (evaluation === "no_answer" || score === 0) && wordCount >= 3) {
    const heuristic = computeHeuristicAnswerEvaluation(utterance, currentQuestion);
    if (heuristic.score > score) {
      score = heuristic.score;
      evaluation = heuristic.evaluation;
      missingConcepts = heuristic.missingConcepts;
    }
  }

  return { intent, evaluation, score, missingConcepts, messiReply, askFollowUp: false };
}

/**
 * Handle one candidate utterance: compare against database correctAnswer and return score & response
 */
async function getMessiTurn({ session, candidateUtterance }) {
  const utterance = String(candidateUtterance || "").trim();
  const currentQuestion = session.questions[session.currentQuestionIndex] || {};
  const quickIntent = detectQuickIntent(utterance);
  const key = apiKey();

  if (key) {
    try {
      const modelAnswerPart = currentQuestion.correctAnswer
        ? `\nReference / Correct Answer: "${currentQuestion.correctAnswer}"`
        : "";

      const expectedConceptsList = currentQuestion.expectedConcepts && currentQuestion.expectedConcepts.length > 0
        ? `\nExpected Key Concepts: ${JSON.stringify(currentQuestion.expectedConcepts)}`
        : "";

      const prompt = `You are evaluating a candidate's answer against the official Question & Reference Answer from the database.
Question (#${session.currentQuestionIndex + 1} of ${session.questions.length}, Topic: "${currentQuestion.topic || "Medical Coding"}"):
"${currentQuestion.question}"${modelAnswerPart}${expectedConceptsList}

Candidate's Answer: "${utterance}"

Instructions:
1. Compare the Candidate's Answer against the Reference Correct Answer.
2. Rate "score" on a strict 0 to 10 scale:
   - 8 to 10: Accurate and comprehensive, covers main concepts of the reference answer.
   - 5 to 7: Partial answer, covers basic ideas but misses specific details or terminology.
   - 1 to 4: Inaccurate, very weak, or mostly off-topic compared to the reference answer.
   - 0: No response, blank, or completely irrelevant.
3. Set "evaluation" to "correct" (8-10), "partial" (5-7), "incorrect" (1-4), or "no_answer" (0).
4. Identify any "missingConcepts" from the reference answer.
5. Provide a warm, brief 1-2 sentence conversational acknowledgment ("messiReply").

Return STRICT JSON only:
{"intent": "answer|repeat|skip|hint|clarify|stop|unclear", "evaluation": "correct|partial|incorrect|no_answer", "score": 0-10, "missingConcepts": string[], "messiReply": string, "askFollowUp": false}`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 450,
          system: MESSI_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.35,
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
      console.warn("getMessiTurn LLM notice, using database answer comparison heuristic:", err.message);
    }
  }

  return computeHeuristicTurn({ utterance, currentQuestion, quickIntent });
}

// ---------------------------------------------------------------------------
// Final Report Generation from Evaluated Question Records
// ---------------------------------------------------------------------------
function clampPercent(n, fallback = 70) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
}

function computeHeuristicFinalReport({ candidateName, role, questionRecords = [] }) {
  const totalQuestions = Math.max(1, questionRecords.length);
  const totalPossiblePoints = totalQuestions * 10;
  const totalPoints = questionRecords.reduce((sum, r) => sum + (Number(r.score) || 0), 0);

  // Exact score calculation by comparing answers with correct answers
  const overallScore = Math.min(100, Math.max(0, Math.round((totalPoints / totalPossiblePoints) * 100)));

  const correctCount = questionRecords.filter((r) => r.evaluation === "correct").length;
  const partialCount = questionRecords.filter((r) => r.evaluation === "partial").length;
  const answeredCount = questionRecords.filter((r) => r.evaluation !== "no_answer").length;

  const technicalReadiness = overallScore;
  const clarity = clampPercent(50 + (correctCount / totalQuestions) * 40 + (partialCount / totalQuestions) * 10);
  const communication = clampPercent(50 + (answeredCount / totalQuestions) * 45);
  const confidence = clampPercent(Math.round((clarity + technicalReadiness) / 2));

  const questionAnalysis = questionRecords.map((r, idx) => ({
    questionNumber: idx + 1,
    topic: r.topic || `Question ${idx + 1}`,
    question: r.question,
    correctAnswer: r.correctAnswer || "",
    candidateAnswer: r.candidateAnswer || "(no answer)",
    evaluation: r.evaluation || "no_answer",
    score: Number(r.score) || 0,
    feedback:
      r.evaluation === "correct"
        ? "Accurate answer covering the core reference concepts."
        : r.evaluation === "partial"
        ? `Partially correct; missed key reference concepts (${(r.missingConcepts || []).slice(0, 2).join(", ") || "details"}).`
        : r.evaluation === "no_answer"
        ? "No response was recorded for this question."
        : "Answer was inaccurate or did not align with the standard coding definition.",
  }));

  return {
    overallScore,
    breakdown: {
      technicalReadiness,
      communication,
      clarity,
      confidence,
      structuredThinking: clampPercent(Math.round((technicalReadiness + communication) / 2)),
    },
    questionAnalysis,
    finalFeedback: `${candidateName || "Candidate"} scored ${overallScore}% across ${totalQuestions} technical mock interview questions (${correctCount} strong, ${partialCount} partial). Demonstrates ${overallScore >= 75 ? "strong technical proficiency and ready for client placement" : "foundational awareness with room to reinforce standard coding guidelines"}.`,
    strengths: [
      correctCount >= 2 ? "Demonstrated clear understanding of core diagnostic and procedural coding definitions" : "Good communication cadence during the assessment",
      "Maintained professional composure throughout the interview session",
      answeredCount >= 4 ? "Attempted all assigned questions with active participation" : "Exhibited positive attitude towards technical evaluation",
    ],
    areasToImprove: [
      "Reinforce specific ICD-10-CM and CPT coding conventions and official guidelines",
      "Practice articulating E/M Medical Decision Making (MDM) criteria concisely",
      "Review denial management workflows (EOB/ERA resolution) and HIPAA compliance protocols",
    ],
    recommendedTopics: [
      "ICD-10-CM Coding Conventions & Guidelines",
      "CPT Modifiers & Procedure Sequencing",
      "E/M MDM Leveling Criteria",
      "Denial Management & Claim Appeals",
    ],
  };
}

/**
 * Generate final scored report from question records evaluated against the database key
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
            `Q${idx + 1} (${r.topic || "General"}): "${r.question}"\nReference Answer: "${r.correctAnswer || "N/A"}"\nCandidate Answer: "${r.candidateAnswer || "(no answer)"}"\nScore: ${r.score}/10 (Evaluation: ${r.evaluation})`
        )
        .join("\n\n");

      const prompt = `Here is the full transcript of a 5-question technical medical coding mock interview for ${candidateName || "the candidate"}:

${transcript}

Produce the final comprehensive evaluation report.
Calculate overallScore (0-100) strictly from the question scores: overallScore = round((sum of scores / (number of questions * 10)) * 100).
Return STRICT JSON only:
{
  "overallScore": number (0-100),
  "breakdown": {
    "technicalReadiness": number (0-100),
    "communication": number (0-100),
    "clarity": number (0-100),
    "confidence": number (0-100),
    "structuredThinking": number (0-100)
  },
  "questionAnalysis": [
    {
      "questionNumber": number,
      "topic": string,
      "question": string,
      "correctAnswer": string,
      "candidateAnswer": string,
      "evaluation": "correct|partial|incorrect|no_answer",
      "score": number (0-10),
      "feedback": string
    }
  ],
  "finalFeedback": string,
  "strengths": string[],
  "areasToImprove": string[],
  "recommendedTopics": string[]
}`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 2200,
          system: "You are a senior healthcare RCM & Medical Coding director providing a rigorous, fair interview evaluation report. Return valid JSON only.",
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
              technicalReadiness: clampPercent(parsed.breakdown?.technicalReadiness),
              communication: clampPercent(parsed.breakdown?.communication),
              clarity: clampPercent(parsed.breakdown?.clarity),
              confidence: clampPercent(parsed.breakdown?.confidence),
              structuredThinking: clampPercent(parsed.breakdown?.structuredThinking),
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
      console.warn("generateFinalReport LLM notice, using database key calculator:", err.message);
    }
  }

  return computeHeuristicFinalReport({ candidateName, role, questionRecords });
}

module.exports = {
  generateInterviewQuestions,
  getMessiTurn,
  generateFinalReport,
  detectQuickIntent,
  computeHeuristicAnswerEvaluation,
};
