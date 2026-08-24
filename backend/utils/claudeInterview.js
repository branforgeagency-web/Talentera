const axios = require("axios");

/**
 * Compare Candidate Answer against Manually Uploaded Reference Answer using Claude API
 *
 * @param {Object} params { question, referenceAnswer, candidateAnswer }
 * @returns {Promise<Object>} Evaluated score, rating, feedback, and comparison
 */
async function evaluateAndCompareAnswerWithClaude({ question = "", referenceAnswer = "", candidateAnswer = "" }) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;

  if (apiKey && candidateAnswer.trim()) {
    try {
      console.log(`[CLAUDE COMPARISON] Comparing candidate answer against reference answer for: "${question.slice(0, 40)}..."`);
      const prompt = `You are an expert Senior Medical Coding & Healthcare RCM Technical Evaluator Bot.
Compare the Candidate's Answer against the Reference Answer for the following question:

Question: "${question}"
Reference Answer: "${referenceAnswer}"
Candidate's Answer: "${candidateAnswer}"

Evaluate the candidate's answer based on:
1. Accuracy & alignment with key concepts in the Reference Answer.
2. Inclusion of required medical coding terms (ICD-10, CPT, E/M, HIPAA, etc.).
3. Clarity and technical depth.

Return strictly JSON with keys:
- score (number 0-100)
- rating (number 1-10)
- feedback (2-3 sentences evaluation explaining what was answered well and any missing details)
- comparisonSummary (1 sentence summary comparing answer to reference answer)`;

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 500,
          system: "You evaluate candidate interview responses against reference model answers for Healthcare RCM & Medical Coding interviews. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          timeout: 20000,
        }
      );

      const contentText = response.data?.content?.[0]?.text || "";
      const jsonMatch = contentText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          success: true,
          score: Math.min(100, Math.max(0, Number(parsed.score) || 85)),
          rating: Number(parsed.rating) || 8.5,
          feedback: parsed.feedback || "Solid response covering key medical coding guidelines.",
          comparisonSummary: parsed.comparisonSummary || "Answer aligns well with reference answer.",
          provider: "anthropic-claude-evaluator",
        };
      }
    } catch (err) {
      console.warn("Claude API compare answer warning, using heuristic comparator:", err.message);
    }
  }

  // Heuristic Answer Comparison Fallback
  return computeHeuristicAnswerComparison(question, referenceAnswer, candidateAnswer);
}

/**
 * Heuristic Answer Comparator based on Term Overlap & Key Concept Matching
 */
function computeHeuristicAnswerComparison(question, referenceAnswer, candidateAnswer) {
  const cText = String(candidateAnswer || "").trim().toLowerCase();
  const rText = String(referenceAnswer || "").trim().toLowerCase();

  const cWords = cText.split(/\s+/).filter(Boolean);
  if (cWords.length < 3) {
    return {
      success: true,
      score: 0,
      rating: 0,
      feedback: "0 Marks: Candidate answer was empty or too brief.",
      comparisonSummary: "No meaningful response provided.",
      provider: "heuristic-comparator",
    };
  }

  // Extract key terms from reference answer
  const refTerms = rText.split(/[^a-z0-9]+/i).filter((w) => w.length > 3);
  let matchedCount = 0;
  refTerms.forEach((term) => {
    if (cText.includes(term)) matchedCount++;
  });

  const overlapRatio = refTerms.length > 0 ? matchedCount / refTerms.length : 0.5;
  const score = Math.min(100, Math.max(50, Math.round(60 + overlapRatio * 40 + Math.min(10, cWords.length))));
  const rating = Number((score / 10).toFixed(1));

  return {
    success: true,
    score,
    rating,
    feedback: `Evaluated Response: ${score}/100 Marks based on comparison with model answer key. Candidate covered core coding concepts.`,
    comparisonSummary: `Matched ${matchedCount}/${refTerms.length} key concept terms from reference answer.`,
    provider: "heuristic-comparator",
  };
}

/**
 * Claude AI Mock Interview Engine for multi-turn sessions
 */
async function getClaudeMockInterviewResponse(messages = [], candidateData = {}) {
  const apiKey = process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY;
  const candidateRole = candidateData.currentRole || candidateData.stage1?.currentRole || "Medical Coder & RCM Specialist";
  const candidateName = candidateData.fullName || candidateData.stage1?.fullName || "Candidate";

  const systemPrompt = `You are Claude, an expert Healthcare Revenue Cycle Management (RCM), Medical Coding, and Billing Senior Technical Interviewer Bot at Talentera.
You are conducting a live, interactive 1-on-1 mock interview with candidate ${candidateName} (Target Role: ${candidateRole}). Keep spoken answers concise and professional.`;

  if (apiKey) {
    try {
      const formattedMessages = messages.map((msg) => ({
        role: msg.role === "assistant" ? "assistant" : "user",
        content: String(msg.content || "").trim(),
      }));

      if (formattedMessages.length === 0 || formattedMessages[0].role !== "user") {
        formattedMessages.unshift({
          role: "user",
          content: "Hello Claude! Ready to start my mock interview.",
        });
      }

      const response = await axios.post(
        "https://api.anthropic.com/v1/messages",
        {
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 600,
          system: systemPrompt,
          messages: formattedMessages,
          temperature: 0.7,
        },
        {
          headers: {
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
            "content-type": "application/json",
          },
          timeout: 20000,
        }
      );

      return {
        success: true,
        reply: response.data?.content?.[0]?.text || "Thank you. Let's move to the next question.",
        provider: "anthropic-claude",
      };
    } catch (err) {
      console.warn("Claude API turn warning, using fallback:", err.message);
    }
  }

  return {
    success: true,
    reply: `Hello ${candidateName}! Welcome to your live Claude AI Mock Interview session for ${candidateRole}. Let's evaluate your technical coding knowledge!`,
    provider: "claude-fallback-engine",
  };
}

module.exports = {
  getClaudeMockInterviewResponse,
  evaluateAndCompareAnswerWithClaude,
};
