const axios = require("axios");

// Every question is worth a flat 10 marks - full marks if the answer is
// correct, 0 if it isn't. No partial credit and no separate "communication"
// rubric (clarity/tone/fluency) - just a straight per-question answer score,
// summed into totalMarks out of questionCount * POINTS_PER_QUESTION.
const POINTS_PER_QUESTION = 10;

/**
 * AI Assessment Evaluator for Candidate Video & Audio Interview Transcripts.
 *
 * Scoring is driven by conceptual correctness, judged the way a knowledgeable
 * AI (ChatGPT/Gemini/Claude-style reasoning) would grade a spoken answer: the
 * LLM path (scoreAgainstAnswerKeyLlm, used whenever OPENAI_API_KEY is set)
 * uses its own subject-matter knowledge to decide what a correct answer looks
 * like and checks the candidate's answer against that understanding. Each
 * question's staff-configured `expectedAnswer` (looked up server-side from
 * InterviewQuestion.correctAnswer in backend/routes/candidate.js and never
 * sent to the candidate) is passed along only as a scope guide - the
 * candidate does not need to match its exact wording. Only when no API key
 * is configured, or the LLM call fails, does grading fall back to a plain
 * keyword-overlap heuristic (computeHeuristicRubrics), which has no real
 * understanding and just checks for matching terms. Each question scores a
 * flat POINTS_PER_QUESTION (10) marks if correct, 0 if not - there is no
 * separate communication/clarity/tone rubric anymore, just the answer score.
 *
 * @param {Array} qaPairs Array of { question, transcript, expectedAnswer }
 * @param {Object} proctorLogs Object containing tabSwitches, focusLosses, livenessVerified
 * @returns {Object} Evaluated AI scores, feedback, and pass status
 */
function parseJsonResponse(rawText) {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

async function evaluateAiVideoAssessment(qaPairs = [], proctorLogs = {}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const hasLlmKey = Boolean(anthropicKey || openAiKey);

  // Best-effort translation pass first: candidates who answer in a language
  // other than English still get a readable English transcript in the
  // report/staff view, and grading below compares against the (English)
  // answer key in a consistent language instead of leaning on the grading
  // LLM to also silently translate. Falls back to the original transcript
  // untouched if there's no API key or the call fails - grading still works
  // either way, it just grades the original text as a second line of defense.
  let translations = null;
  if (hasLlmKey) {
    try {
      translations = await translateQaPairs(qaPairs);
    } catch (err) {
      console.warn("Transcript translation failed, grading/showing original transcripts:", err.message);
    }
  }
  const qaPairsWithTranslation = qaPairs.map((pair, idx) => ({
    ...pair,
    translatedTranscript: translations?.[idx]?.translatedTranscript || pair.transcript || "",
    detectedLanguage: translations?.[idx]?.detectedLanguage || "unknown",
  }));

  let questionScores;
  if (hasLlmKey) {
    try {
      questionScores = await scoreAgainstAnswerKeyLlm(qaPairsWithTranslation);
    } catch (err) {
      console.warn("LLM answer-key scoring failed or not configured, using keyword-match heuristic:", err.message);
      questionScores = computeHeuristicRubrics(qaPairsWithTranslation).questionScores;
    }
  } else {
    questionScores = computeHeuristicRubrics(qaPairsWithTranslation).questionScores;
  }

  // Raw answer marks: sum of each question's flat 10 (correct) or 0 (wrong)
  // out of questionCount * POINTS_PER_QUESTION - this is what the report
  // card shows now (e.g. "35/50"), not a communication/rubric percentage.
  const totalMarks = questionScores.reduce((sum, q) => sum + q.marks, 0);
  const maxMarks = questionScores.length * POINTS_PER_QUESTION;

  // overallScore stays a 0-100 percentage (totalMarks/maxMarks) purely for
  // backward compatibility with stage5.aiScore and existing status messages
  // elsewhere in the app - it is not shown to the candidate as a separate
  // "communication score" anymore, the marks above are the primary number.
  const rawPercent = maxMarks > 0 ? Math.round((totalMarks / maxMarks) * 100) : 0;

  // Deduct proctoring penalty if candidate switched tabs during recording
  const tabSwitches = proctorLogs.tabSwitches || 0;
  const penalty = Math.min(20, tabSwitches * 5);
  const overallScore = Math.max(0, rawPercent - penalty);

  const zeroCount = questionScores.filter((q) => q.marks === 0).length;
  let feedback = `Candidate scored ${totalMarks}/${maxMarks} marks across ${questionScores.length} interview questions, graded against the configured answer key.`;
  if (zeroCount > 0) {
    feedback += ` ${zeroCount} question(s) received 0 marks (missing, incorrect, or skipped because the interview was ended early).`;
  }

  return {
    overallScore,
    totalMarks,
    maxMarks,
    pointsPerQuestion: POINTS_PER_QUESTION,
    questionScores,
    // Original transcript + English translation + detected language per
    // question, aligned by index to the qaPairs the caller sent in. Routes
    // persist this (instead of the raw browser qaPairs) so the translation
    // survives page reloads/report re-views, not just this one response.
    qaPairs: qaPairsWithTranslation,
    proctoringDeductions: penalty,
    feedback,
    livenessVerified: Boolean(proctorLogs.livenessVerified),
    evaluatedAt: new Date(),
  };
}

/**
 * Translates each candidate transcript to English (returned unchanged if
 * it's already English) using Anthropic Claude or OpenAI API.
 * Very short/empty transcripts are skipped since there's nothing
 * meaningful to translate.
 *
 * @param {Array<{transcript: string}>} qaPairs
 * @returns {Promise<Array<{translatedTranscript: string, detectedLanguage: string}>>} Aligned by index to qaPairs
 */
async function translateQaPairs(qaPairs) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const withContent = qaPairs
    .map((pair, idx) => ({ idx, transcript: (pair.transcript || "").trim() }))
    .filter((p) => p.transcript.split(/\s+/).filter(Boolean).length >= 3);

  if (!withContent.length) {
    return qaPairs.map((pair) => ({
      translatedTranscript: pair.transcript || "",
      detectedLanguage: (pair.transcript || "").trim() ? "unknown" : "none",
    }));
  }

  const prompt = `For each numbered candidate interview answer below, detect its spoken language and provide an English translation. If an answer is already in English, return it unchanged as the translation (do not paraphrase or correct it).

${withContent.map((p) => `A${p.idx + 1}: ${p.transcript}`).join("\n\n")}

Return strictly JSON: {"translations": [{"index": <the A-number above, as an integer>, "language": "<language name, e.g. Hindi, Tagalog, English>", "translatedText": "<English translation>"}, ...]} with one entry per answer above.`;

  let parsed = {};

  if (anthropicKey) {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2000,
        system: "You are an interview language translator. Return strictly JSON.",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );
    const textContent = response.data?.content?.[0]?.text || "";
    parsed = parseJsonResponse(textContent);
  } else if (openAiKey) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );
    parsed = parseJsonResponse(response.data.choices[0].message.content);
  }

  const translationList = Array.isArray(parsed.translations) ? parsed.translations : [];
  const byIndex = new Map(translationList.map((t) => [Number(t.index) - 1, t]));

  return qaPairs.map((pair, idx) => {
    const original = (pair.transcript || "").trim();
    const match = byIndex.get(idx);
    if (!match || !match.translatedText) {
      return { translatedTranscript: original, detectedLanguage: original ? "unknown" : "none" };
    }
    return { translatedTranscript: match.translatedText, detectedLanguage: match.language || "unknown" };
  });
}

/**
 * LLM-based correctness grading - one call scores every Q&A pair at once.
 * Uses Anthropic Claude (if ANTHROPIC_API_KEY is configured) or OpenAI (if OPENAI_API_KEY is configured).
 */
async function scoreAgainstAnswerKeyLlm(qaPairs) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are a senior Healthcare RCM (Revenue Cycle Management) / Medical Coding subject-matter expert, acting as an interviewer grading a candidate's SPOKEN, transcribed answers. Grade the way a knowledgeable AI assistant (like ChatGPT, Gemini, or Claude) would when asked "is this answer correct?" - by reasoning from your own understanding of the subject, not by pattern-matching the candidate's wording against a script.

HOW TO GRADE EACH ANSWER:
1. First, silently work out for yourself what a correct, well-informed answer to the question would actually contain - draw on your own RCM/medical-coding expertise, not just the reference notes below.
2. A "Reference Answer Key" is provided per question purely as a scope guide showing what the staff who wrote the question had in mind. It is NOT a checklist and the candidate does NOT need to use its exact words, terms, or phrasing. Completely different wording that conveys the same correct meaning is fully correct. If the reference key looks thin, garbled, or incomplete, rely on your own domain knowledge instead of it.
3. Judge the candidate's answer on whether it is factually/conceptually correct and actually addresses what was asked - not on wording overlap, keyword count, tone, fluency, or filler words.
4. Assume the transcript may contain speech-to-text errors (garbled numbers, homophones, mis-heard technical terms, e.g. "E11.40" heard as "11.11.21", "insurance" heard as "influence"). Read past obvious transcription noise and judge the candidate's evident intended meaning - do not penalize an answer just because it was transcribed imperfectly, as long as the intended meaning is clearly correct.
5. Each question is worth a flat 10 marks - there is no partial credit. Score 0 ONLY if the answer is genuinely wrong, off-topic, irrelevant, incoherent, or shows no real understanding of the concept being asked - or if there is no spoken answer / fewer than 3 spoken words.
6. Score the full 10 marks for any answer that correctly and relevantly explains the core concept in the candidate's own words, even if it is loosely worded, informal, or not fully comprehensive - correct-but-imperfect understanding still earns the full 10, it does not need to be exhaustive or cover every point in the reference key.

QUESTIONS TO GRADE (reference answer key is a guide only, not a required wording):
${qaPairs
  .map(
    (pair, idx) =>
      `Q${idx + 1}: ${pair.question}
Reference Answer Key (scope guide, not required wording): ${pair.expectedAnswer || "(none provided - grade purely on RCM domain accuracy and relevance)"}
Candidate's Spoken Answer (translated to English where needed): ${pair.translatedTranscript || pair.transcript || "(no spoken response)"}
`
  )
  .join("\n")}

Return strictly JSON: {"scores": [{"marks": <integer, either 0 or 10>, "feedback": "<short sentence explaining why correct (what concept they got right) or why 0 marks (wrong/off-topic/no understanding shown)>"}, ...]} with exactly ${qaPairs.length} entries, in the same order as the questions above.`;

  let parsed = {};

  if (anthropicKey) {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system: "You are a senior Healthcare RCM expert evaluator. Output strictly JSON.",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.1,
      },
      {
        headers: {
          "x-api-key": anthropicKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        timeout: 25000,
      }
    );
    const textContent = response.data?.content?.[0]?.text || "";
    parsed = parseJsonResponse(textContent);
  } else if (openAiKey) {
    const response = await axios.post(
      "https://api.openai.com/v1/chat/completions",
      {
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        response_format: { type: "json_object" },
        temperature: 0.1,
      },
      {
        headers: {
          Authorization: `Bearer ${openAiKey}`,
          "Content-Type": "application/json",
        },
        timeout: 20000,
      }
    );
    parsed = parseJsonResponse(response.data.choices[0].message.content);
  }

  const scores = Array.isArray(parsed.scores) ? parsed.scores : [];

  return qaPairs.map((pair, idx) => {
    const words = (pair.transcript || "").trim().split(/\s+/).filter(Boolean);
    if (words.length < 3) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: false,
        feedback: "0 Marks: Question stopped early or no spoken response detected.",
        transcript: pair.transcript || "",
        translatedTranscript: pair.translatedTranscript || pair.transcript || "",
        detectedLanguage: pair.detectedLanguage || "none",
      };
    }
    const entry = scores[idx] || {};
    // Flat 10 (correct) or 0 (wrong) - clamp anything the model returns onto
    // that scale rather than trusting an arbitrary 0-100 number, in case it
    // ignores the instruction to only use 0 or 10.
    const marks = Number(entry.marks) >= POINTS_PER_QUESTION / 2 ? POINTS_PER_QUESTION : 0;
    return {
      questionId: idx + 1,
      question: pair.question,
      marks,
      answered: true,
      feedback: entry.feedback || (marks > 0 ? `Correct answer evaluated: ${marks}/${POINTS_PER_QUESTION} Marks.` : "0 Marks: Incorrect answer."),
      transcript: pair.transcript || "",
      translatedTranscript: pair.translatedTranscript || pair.transcript || "",
      detectedLanguage: pair.detectedLanguage || "unknown",
    };
  });
}

/**
 * Heuristic rubric scorer when LLM API key is not configured
 */
function computeHeuristicRubrics(qaPairs) {
  const defaultRcmKeywords = ["rcm", "coding", "icd", "cpt", "denial", "claim", "modifier", "hipaa", "billing", "authorization", "audit", "chart", "practicode", "patient"];
  const stopWords = new Set(["the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "been", "being", "have", "has", "had", "does", "did", "will", "would", "should", "could", "into", "through", "during", "before", "after", "about", "against", "between", "what", "how", "when", "where", "which", "who", "whom", "whose", "why", "can", "must", "may", "provider", "service", "process"]);

  const questionScores = qaPairs.map((pair, idx) => {
    const originalText = (pair.transcript || "").trim();
    const words = originalText.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: false,
        feedback: "0 Marks: Question stopped early or no spoken response detected.",
        transcript: pair.transcript || "",
        translatedTranscript: pair.translatedTranscript || originalText,
        detectedLanguage: pair.detectedLanguage || "none",
      };
    }

    // Match keywords against the English translation when available - the
    // expectedAnswer keyword list is written in English, so matching against
    // a non-English transcript directly would always miss.
    const text = (pair.translatedTranscript || originalText).trim();

    const expectedKey = (pair.expectedAnswer || "").toLowerCase();
    const targetKeywords = expectedKey
      ? expectedKey
          .split(/[\s,.;:-]+/)
          .map((w) => w.toLowerCase())
          .filter((w) => w.length >= 3 && !stopWords.has(w))
      : defaultRcmKeywords;

    const finalKeywords = targetKeywords.length > 0 ? targetKeywords : defaultRcmKeywords;

    const lowerText = text.toLowerCase();
    let matchCount = 0;
    finalKeywords.forEach((kw) => {
      if (lowerText.includes(kw)) matchCount++;
    });

    const requiredMatches = Math.min(2, finalKeywords.length || 1);
    if (matchCount < requiredMatches) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: true,
        feedback: "0 Marks: Incorrect answer. Spoken response did not match at least 2 expected key terms.",
        transcript: pair.transcript || "",
        translatedTranscript: text,
        detectedLanguage: pair.detectedLanguage || "unknown",
      };
    }

    // Flat marks: hitting the required keyword threshold earns the full 10,
    // there's no partial-credit scaling by match ratio anymore.
    return {
      questionId: idx + 1,
      question: pair.question,
      marks: POINTS_PER_QUESTION,
      answered: true,
      feedback: `Correct answer evaluated: ${POINTS_PER_QUESTION}/${POINTS_PER_QUESTION} Marks based on key term match (${matchCount} matched).`,
      transcript: pair.transcript || "",
      translatedTranscript: text,
      detectedLanguage: pair.detectedLanguage || "unknown",
    };
  });

  const totalMarks = questionScores.reduce((sum, q) => sum + q.marks, 0);
  const maxMarks = questionScores.length * POINTS_PER_QUESTION;

  const unansweredOrZeroCount = questionScores.filter((q) => q.marks === 0).length;
  let feedbackStr = `Candidate scored ${totalMarks}/${maxMarks} marks across ${questionScores.length} verbal assessment questions.`;
  if (unansweredOrZeroCount > 0) {
    feedbackStr += ` Note: ${unansweredOrZeroCount} question(s) received 0 marks due to missing or incorrect answers.`;
  }

  return {
    feedback: feedbackStr,
    questionScores,
  };
}

module.exports = { evaluateAiVideoAssessment };
