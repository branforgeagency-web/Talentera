const axios = require("axios");

/**
 * Drives the "live" part of the Stage 5 AI Audio Interview: given the
 * conversation so far, decide the next spoken question (or signal that the
 * interview is over). Final scoring of the finished transcript still goes
 * through evaluateAiVideoAssessment() in aiAssessment.js - that function only
 * looks at { question, transcript } pairs and proctor logs, so it's shared
 * unchanged between the video and audio assessment flows.
 *
 * Same fallback shape as aiAssessment.js: if OPENAI_API_KEY is configured we
 * ask the LLM to react to the candidate's last answer with a real follow-up;
 * otherwise we step through a fixed interview question bank so the feature
 * still works end-to-end without an API key.
 */

const MAX_TURNS = 4;

const FALLBACK_QUESTION_BANK = [
  "Let's start with you - walk me through your RCM or medical coding background, and the specialty you're strongest in.",
  "Tell me about a time you handled a difficult claim denial. What was the denial reason and how did you resolve it?",
  "How do you stay compliant with HIPAA and protect PHI when working remotely on US healthcare accounts?",
  "Where do you see gaps in your current RCM knowledge, and what are you doing to close them?",
];

/**
 * @param {Array<{question: string, transcript: string}>} conversationHistory Turns completed so far
 * @returns {Promise<{question: string|null, done: boolean, turnIndex: number}>}
 */
async function getNextInterviewQuestion(conversationHistory = []) {
  const turnIndex = conversationHistory.length;

  if (turnIndex >= MAX_TURNS) {
    return { question: null, done: true, turnIndex };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    try {
      const question = await askLlmForNextQuestion(apiKey, conversationHistory, turnIndex);
      if (question) {
        return { question, done: false, turnIndex };
      }
    } catch (err) {
      console.warn("OpenAI next-question call failed, falling back to fixed interview bank:", err.message);
    }
  }

  const fallbackQuestion = FALLBACK_QUESTION_BANK[turnIndex] || FALLBACK_QUESTION_BANK[FALLBACK_QUESTION_BANK.length - 1];
  return { question: fallbackQuestion, done: false, turnIndex };
}

async function askLlmForNextQuestion(apiKey, conversationHistory, turnIndex) {
  const transcriptSoFar = conversationHistory
    .map((turn, idx) => `Q${idx + 1}: ${turn.question}\nCandidate: ${turn.transcript || "(no spoken response)"}`)
    .join("\n\n");

  const systemPrompt = `You are a warm but sharp AI interviewer conducting a LIVE, spoken, one-question-at-a-time voice interview with a Healthcare RCM (Revenue Cycle Management) / Medical Coding candidate for Talentera, an Indian RCM staffing platform. This is turn ${turnIndex + 1} of ${MAX_TURNS}.

Rules:
- Ask exactly ONE short, natural, spoken-style question - no lists, no multi-part questions. It will be read aloud by text-to-speech, so keep it under 2 sentences.
- If there is no conversation history yet, ask the candidate to introduce themselves and their RCM/medical coding background.
- On later turns, react to something specific in the candidate's last answer when there's a natural thread to pull - otherwise probe a core RCM competency not yet covered (denial management, ICD-10-CM/CPT coding accuracy, HIPAA/PHI compliance, communicating with US payers, handling a difficult claim).
- Sound like a real interviewer, not a form.
- Return strictly JSON: {"question": "..."}`;

  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: transcriptSoFar || "(Interview is just starting - no answers yet.)" },
      ],
      response_format: { type: "json_object" },
      temperature: 0.6,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      timeout: 15000,
    }
  );

  const parsed = JSON.parse(response.data.choices[0].message.content);
  const question = (parsed.question || "").trim();
  return question || null;
}

module.exports = { getNextInterviewQuestion, MAX_TURNS };
