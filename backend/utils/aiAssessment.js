const axios = require("axios");

/**
 * AI Assessment Evaluator for Candidate Video & Speech Transcripts.
 * Evaluates candidate responses against RCM communication rubrics:
 * 1. Communication Clarity (0-100)
 * 2. Technical RCM Accuracy (0-100)
 * 3. Professional Tone (0-100)
 * 4. Fluency & Articulation (0-100)
 *
 * @param {Array} qaPairs Array of { question, transcript, duration }
 * @param {Object} proctorLogs Object containing tabSwitches, focusLosses, livenessVerified
 * @returns {Object} Evaluated AI scores, feedback, and pass status
 */
async function evaluateAiVideoAssessment(qaPairs = [], proctorLogs = {}) {
  const apiKey = process.env.OPENAI_API_KEY;

  let clarity = 85;
  let technical = 82;
  let tone = 88;
  let fluency = 84;
  let feedback = "Candidate demonstrated clear communication, solid technical awareness of RCM workflows, and professional tone.";

  // If OpenAI API key is configured, call LLM for deep rubric evaluation
  if (apiKey) {
    try {
      const prompt = `You are an expert Healthcare RCM (Revenue Cycle Management) and Medical Coding interviewer evaluating a candidate's video interview.
Analyze the following candidate responses:

${qaPairs.map((pair, idx) => `Q${idx + 1}: ${pair.question}\nCandidate Answer: ${pair.transcript || "No speech recorded"}\n`).join("\n")}

Evaluate across 4 metrics (0 to 100 integer score):
1. communicationClarity
2. technicalAccuracy
3. professionalTone
4. fluency

Return strictly JSON with keys: communicationClarity, technicalAccuracy, professionalTone, fluency, feedback (2-3 sentences summary).`;

      const response = await axios.post(
        "https://api.openai.com/v1/chat/completions",
        {
          model: "gpt-4o-mini",
          messages: [{ role: "user", content: prompt }],
          response_format: { type: "json_object" },
          temperature: 0.3,
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
        }
      );

      const parsed = JSON.parse(response.data.choices[0].message.content);
      clarity = parsed.communicationClarity || clarity;
      technical = parsed.technicalAccuracy || technical;
      tone = parsed.professionalTone || tone;
      fluency = parsed.fluency || fluency;
      feedback = parsed.feedback || feedback;
    } catch (err) {
      console.warn("OpenAI API call failed or not configured, using heuristic rubric scorer:", err.message);
      const heuristic = computeHeuristicRubrics(qaPairs);
      clarity = heuristic.clarity;
      technical = heuristic.technical;
      tone = heuristic.tone;
      fluency = heuristic.fluency;
      feedback = heuristic.feedback;
    }
  } else {
    // Intelligent heuristic rubric scoring based on transcript length and key terms
    const heuristic = computeHeuristicRubrics(qaPairs);
    clarity = heuristic.clarity;
    technical = heuristic.technical;
    tone = heuristic.tone;
    fluency = heuristic.fluency;
    feedback = heuristic.feedback;
  }

  // Deduct proctoring penalty if candidate switched tabs during video recording
  const tabSwitches = proctorLogs.tabSwitches || 0;
  const penalty = Math.min(20, tabSwitches * 5);
  const overallScore = Math.max(0, Math.round((clarity * 0.3 + technical * 0.4 + tone * 0.15 + fluency * 0.15) - penalty));

  return {
    overallScore,
    rubricScores: {
      communicationClarity: clarity,
      technicalAccuracy: technical,
      professionalTone: tone,
      fluency,
    },
    questionScores: (apiKey ? null : computeHeuristicRubrics(qaPairs).questionScores) || computeHeuristicRubrics(qaPairs).questionScores,
    proctoringDeductions: penalty,
    feedback,
    livenessVerified: Boolean(proctorLogs.livenessVerified),
    evaluatedAt: new Date(),
  };
}

/**
 * Heuristic rubric scorer when LLM API key is not configured
 */
function computeHeuristicRubrics(qaPairs) {
  const rcmKeywords = ["rcm", "coding", "icd", "cpt", "denial", "claim", "modifier", "hipaa", "billing", "authorization", "audit", "chart", "practicode", "patient"];

  const questionScores = qaPairs.map((pair, idx) => {
    const text = (pair.transcript || "").trim();
    const words = text.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        questionId: idx + 1,
        question: pair.question,
        marks: 0,
        answered: false,
        feedback: "0 Marks: Candidate did not answer this question (No spoken response detected)."
      };
    }

    const lower = text.toLowerCase();
    let matchCount = 0;
    rcmKeywords.forEach((kw) => {
      if (lower.includes(kw)) matchCount++;
    });

    const questionMarks = Math.min(100, Math.max(50, 60 + matchCount * 10 + Math.floor(words.length / 2)));
    return {
      questionId: idx + 1,
      question: pair.question,
      marks: questionMarks,
      answered: true,
      feedback: `Answer evaluated: ${questionMarks}/100 Marks based on candidate's spoken response.`
    };
  });

  const totalMarks = questionScores.reduce((sum, q) => sum + q.marks, 0);
  const avgMarks = questionScores.length > 0 ? Math.round(totalMarks / questionScores.length) : 0;

  const unansweredCount = questionScores.filter((q) => !q.answered).length;
  let feedbackStr = `Candidate scored ${avgMarks}% overall across ${questionScores.length} verbal assessment questions.`;
  if (unansweredCount > 0) {
    feedbackStr += ` Note: ${unansweredCount} question(s) received 0 marks due to missing spoken answers.`;
  }

  return {
    clarity: avgMarks,
    technical: Math.min(100, avgMarks + 2),
    tone: avgMarks > 0 ? 88 : 0,
    fluency: avgMarks,
    feedback: feedbackStr,
    questionScores,
  };
}

module.exports = { evaluateAiVideoAssessment };
