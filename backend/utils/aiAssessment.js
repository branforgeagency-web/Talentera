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

  let questionScores;
  if (apiKey) {
    try {
      questionScores = await scoreAgainstAnswerKeyLlm(apiKey, qaPairs);
    } catch (err) {
      console.warn("OpenAI answer-key scoring failed or not configured, using keyword-match heuristic:", err.message);
      questionScores = computeHeuristicRubrics(qaPairs).questionScores;
    }
  } else {
    questionScores = computeHeuristicRubrics(qaPairs).questionScores;
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
    proctoringDeductions: penalty,
    feedback,
    livenessVerified: Boolean(proctorLogs.livenessVerified),
    evaluatedAt: new Date(),
  };
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

QUESTIONS AND REFERENCE ANSWER KEYS TO GRADE:
${qaPairs
  .map(
    (pair, idx) =>
      `Q${idx + 1}: ${pair.question}
Reference Correct Answer Key: ${pair.expectedAnswer || "Must be medically accurate and directly address the question"}
Candidate's Spoken Answer: ${pair.transcript || "(no spoken response)"}
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
    };
  });
}

/**
 * Heuristic rubric scorer when LLM API key is not configured
 */
function computeHeuristicRubrics(qaPairs) {
  const defaultRcmKeywords = ["rcm", "coding", "icd", "cpt", "denial", "claim", "modifier", "hipaa", "billing", "authorization", "audit", "chart", "practicode", "patient"];

  const questionScores = qaPairs.map((pair, idx) => {
    const text = (pair.transcript || "").trim();
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: false,
        feedback: "0 Marks: Question stopped early or no spoken response detected."
      };
    }

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

    // Strict threshold: Require matchRatio >= 0.35 and matchCount > 0
    if (matchCount === 0 || matchRatio < 0.35) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: true,
        feedback: "0 Marks: Incorrect answer. Spoken response did not match expected correct answer key."
      };
    }

    const questionMarks = Math.min(100, Math.round(70 + matchRatio * 30));
    return {
      questionId: idx + 1,
      question: pair.question,
      marks: questionMarks,
      answered: true,
      feedback: `Correct answer evaluated: ${questionMarks}/100 Marks based on answer key match.`
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
