const axios = require("axios");

/**
 * AI Assessment Evaluator for Candidate Video & Audio Interview Transcripts.
 *
 * Scoring is driven ENTIRELY by correctness against each question's
 * `expectedAnswer` (the staff-configured reference answer - looked up
 * server-side from InterviewQuestion.correctAnswer in
 * backend/routes/candidate.js and never sent to the candidate). A question
 * with no expectedAnswer configured (e.g. the built-in default questions
 * before staff add their own) falls back to a generic RCM-keyword check
 * instead of failing outright.
 *
 * @param {Array} qaPairs Array of { question, transcript, expectedAnswer }
 * @param {Object} proctorLogs Object containing tabSwitches, focusLosses, livenessVerified
 * @returns {Object} Evaluated AI scores, feedback, and pass status
 */
async function evaluateAiVideoAssessment(qaPairs = [], proctorLogs = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  // Best-effort translation pass first: candidates who answer in a language
  // other than English still get a readable English transcript in the
  // report/staff view, and grading below compares against the (English)
  // answer key in a consistent language instead of leaning on the grading
  // LLM to also silently translate. Falls back to the original transcript
  // untouched if there's no API key or the call fails - grading still works
  // either way, it just grades the original text as a second line of defense.
  let translations = null;
  if (apiKey) {
    try {
      translations = await translateQaPairs(apiKey, qaPairs);
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
  if (apiKey) {
    try {
      questionScores = await scoreAgainstAnswerKeyLlm(apiKey, qaPairsWithTranslation);
    } catch (err) {
      console.warn("OpenAI answer-key scoring failed or not configured, using keyword-match heuristic:", err.message);
      questionScores = computeHeuristicRubrics(qaPairsWithTranslation).questionScores;
    }
  } else {
    questionScores = computeHeuristicRubrics(qaPairsWithTranslation).questionScores;
  }

  const totalMarks = questionScores.reduce((sum, q) => sum + q.marks, 0);
  const avgMarks = questionScores.length > 0 ? Math.round(totalMarks / questionScores.length) : 0;

  // Deduct proctoring penalty if candidate switched tabs during recording
  const tabSwitches = proctorLogs.tabSwitches || 0;
  const penalty = Math.min(20, tabSwitches * 5);
  const overallScore = Math.max(0, avgMarks - penalty);

  const zeroCount = questionScores.filter((q) => q.marks === 0).length;
  let feedback = `Candidate scored ${overallScore}% overall across ${questionScores.length} interview questions, graded against the configured answer key.`;
  if (zeroCount > 0) {
    feedback += ` ${zeroCount} question(s) received 0 marks (missing, incorrect, or skipped because the interview was ended early).`;
  }

  return {
    overallScore,
    // These four tiles mirror the correctness score - correctness is the
    // ONLY thing that drives overallScore (and therefore stage completion /
    // the candidate's verification score). Kept as separate fields purely so
    // the existing report-card UI still has something to render per metric.
    rubricScores: {
      communicationClarity: overallScore,
      technicalAccuracy: overallScore,
      professionalTone: overallScore > 0 ? 88 : 0,
      fluency: overallScore,
    },
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
 * it's already English) using the same OpenAI key as the answer-key scorer
 * below - one batched call for the whole interview rather than one call per
 * question. Very short/empty transcripts are skipped since there's nothing
 * meaningful to translate.
 *
 * @param {string} apiKey
 * @param {Array<{transcript: string}>} qaPairs
 * @returns {Promise<Array<{translatedTranscript: string, detectedLanguage: string}>>} Aligned by index to qaPairs
 */
async function translateQaPairs(apiKey, qaPairs) {
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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
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
 * LLM-based correctness grading - one call scores every Q&A pair at once
 * against each question's expectedAnswer. A question with no expectedAnswer
 * is graded generically on RCM domain knowledge + communication, since
 * there's nothing to check correctness against.
 */
async function scoreAgainstAnswerKeyLlm(apiKey, qaPairs) {
  const prompt = `You are a strict technical evaluator grading a candidate's SPOKEN answers in a Healthcare RCM / Medical Coding interview.

CRITICAL MANDATORY RULES:
1. ONLY CORRECT ANSWERS EARN MARKS.
2. If the candidate's spoken response is WRONG, INCORRECT, OFF-TOPIC, IRRELEVANT, or does NOT answer the specific question according to the reference answer key, YOU MUST ASSIGN EXACTLY 0 MARKS.
3. Do NOT award marks for generic fluency, pleasant tone, or filler words if the candidate failed to answer the question correctly.
4. A question with no spoken answer or less than 3 spoken words MUST score 0 MARKS.
5. If and only if the candidate's response correctly answers the question matching the reference answer key, assign 75 to 100 marks based on accuracy and completeness.
6. Be reasonably lenient on completeness: if the candidate's answer correctly touches on at least 2-3 of the key concepts/terms present in the reference answer key, treat it as a correct answer (75-100 marks) even if it isn't fully comprehensive or perfectly worded - do not require an exhaustive, word-for-word match against the reference answer.

QUESTIONS AND REFERENCE ANSWER KEYS TO GRADE:
${qaPairs
  .map(
    (pair, idx) =>
      `Q${idx + 1}: ${pair.question}
Reference Correct Answer Key: ${pair.expectedAnswer || "Must be medically accurate and directly address the question"}
Candidate's Spoken Answer (translated to English where needed): ${pair.translatedTranscript || pair.transcript || "(no spoken response)"}
`
  )
  .join("\n")}

Return strictly JSON: {"scores": [{"marks": <integer 0-100>, "feedback": "<short sentence explaining why correct or 0 marks for wrong/off-topic answer>"}, ...]} with exactly ${qaPairs.length} entries, in the same order as the questions above.`;

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
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 20000,
    }
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
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
    const marks = Math.max(0, Math.min(100, Math.round(Number(entry.marks) || 0)));
    return {
      questionId: idx + 1,
      question: pair.question,
      marks,
      answered: true,
      feedback: entry.feedback || (marks > 0 ? `Correct answer evaluated: ${marks}/100 Marks.` : "0 Marks: Incorrect answer."),
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
      ? expectedKey.split(/[\s,.;:-]+/).filter((w) => w.length >= 3)
      : defaultRcmKeywords;

    const lowerText = text.toLowerCase();
    let matchCount = 0;
    targetKeywords.forEach((kw) => {
      if (lowerText.includes(kw)) matchCount++;
    });

    const matchRatio = targetKeywords.length > 0 ? matchCount / targetKeywords.length : 0;

    // Correct if the candidate's answer touches at least 2 of the reference
    // answer's key terms (or all of them, if there's only 1 to begin with) -
    // a straight ratio threshold was unfairly failing answers that hit 2-3
    // solid keywords but had a long expectedAnswer with many total terms.
    const requiredMatches = Math.min(2, targetKeywords.length || 1);
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

    const questionMarks = Math.min(100, Math.round(70 + matchRatio * 30));
    return {
      questionId: idx + 1,
      question: pair.question,
      marks: questionMarks,
      answered: true,
      feedback: `Correct answer evaluated: ${questionMarks}/100 Marks based on answer key match.`,
      transcript: pair.transcript || "",
      translatedTranscript: text,
      detectedLanguage: pair.detectedLanguage || "unknown",
    };
  });

  const totalMarks = questionScores.reduce((sum, q) => sum + q.marks, 0);
  const avgMarks = questionScores.length > 0 ? Math.round(totalMarks / questionScores.length) : 0;

  const unansweredOrZeroCount = questionScores.filter((q) => q.marks === 0).length;
  let feedbackStr = `Candidate scored ${avgMarks}% overall across ${questionScores.length} verbal assessment questions.`;
  if (unansweredOrZeroCount > 0) {
    feedbackStr += ` Note: ${unansweredOrZeroCount} question(s) received 0 marks due to missing or incorrect answers.`;
  }

  return {
    clarity: avgMarks,
    technical: Math.min(100, avgMarks > 0 ? avgMarks + 2 : 0),
    tone: avgMarks > 0 ? 88 : 0,
    fluency: avgMarks,
    feedback: feedbackStr,
    questionScores,
  };
}

module.exports = { evaluateAiVideoAssessment };
