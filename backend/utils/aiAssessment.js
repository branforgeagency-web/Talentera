const axios = require("axios");

/**
 * AI Communication & Delivery Evaluator for the Stage 5 "Communication +
 * Video Interview" (frontend/src/components/AiVideoAssessment.jsx).
 *
 * IMPORTANT - what this stage is and isn't:
 * This is NOT a knowledge test. It does not check whether a spoken answer
 * is factually/technically "correct" against a reference answer key, and
 * results are not staff-reviewed for correctness - the AI's judgment is
 * final and automatic, the same way it would be for a human interviewer
 * assessing "can this person hold a clear, professional conversation in
 * English?" Questions asked at this stage are deliberately conversational /
 * biographical ("tell me about yourself", "tell me about your course",
 * background, motivation) rather than technical recall - there is nothing
 * to get right or wrong, only how well it was communicated.
 *
 * Output is a single overall 0-100 Communication Score plus a four-part
 * rubric breakdown:
 *   - clarity            Clarity & pronunciation (is the speech easy to
 *                         follow / did it transcribe cleanly, or is it full
 *                         of garbled, incoherent fragments?)
 *   - fluency             Fluency & pace (natural sentence flow, minimal
 *                         filler words / false starts / repetition)
 *   - vocabularyGrammar   Range and correctness of spoken English
 *   - confidenceDelivery  Structured, complete, on-topic, professional tone
 *
 * Scored by an LLM (scoreCommunicationLlm, used whenever ANTHROPIC_API_KEY
 * or OPENAI_API_KEY is configured), reasoning over the transcripts the way
 * a fluent-English interview coach would. Falls back to a rule-based
 * heuristic (computeHeuristicCommunicationScore - word count, filler-word
 * ratio, vocabulary variety, sentence structure) only when no API key is
 * configured or the LLM call fails.
 *
 * @param {Array} qaPairs Array of { question, transcript, questionId }
 * @param {Object} proctorLogs Object containing tabSwitches, focusLosses, livenessVerified
 * @returns {Object} Evaluated communication score, rubric breakdown, feedback
 */
function parseJsonResponse(rawText) {
  if (!rawText) return {};
  let cleaned = rawText.trim();
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  }
  return JSON.parse(cleaned.trim());
}

function clampScore(n, fallback = 0) {
  const num = Number(n);
  if (!Number.isFinite(num)) return fallback;
  return Math.max(0, Math.min(100, Math.round(num)));
}

async function evaluateAiVideoAssessment(qaPairs = [], proctorLogs = {}) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;
  const hasLlmKey = Boolean(anthropicKey || openAiKey);

  // Best-effort translation pass first: candidates who answer in a language
  // other than English still get a readable English transcript in the
  // report/staff view, and it lets the grader judge WHAT was said (topic
  // relevance, completeness) separately from HOW clearly it was said in
  // English. Falls back to the original transcript untouched if there's no
  // API key or the call fails - grading still works either way.
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

  let communication;
  if (hasLlmKey) {
    try {
      communication = await scoreCommunicationLlm(qaPairsWithTranslation);
    } catch (err) {
      console.warn("LLM communication scoring failed or not configured, using heuristic scorer:", err.message);
      communication = computeHeuristicCommunicationScore(qaPairsWithTranslation);
    }
  } else {
    communication = computeHeuristicCommunicationScore(qaPairsWithTranslation);
  }

  const rawOverall = clampScore(
    (communication.rubric.clarity + communication.rubric.fluency + communication.rubric.vocabularyGrammar + communication.rubric.confidenceDelivery) / 4
  );

  // Deduct proctoring penalty if candidate switched tabs during recording
  const tabSwitches = proctorLogs.tabSwitches || 0;
  const penalty = Math.min(20, tabSwitches * 5);
  const overallScore = Math.max(0, rawOverall - penalty);

  return {
    overallScore,
    rubric: communication.rubric,
    // Per-answer notes on communication quality - no marks, no
    // correct/incorrect verdict, this stage doesn't grade correctness.
    answerNotes: communication.answerNotes,
    qaPairs: qaPairsWithTranslation,
    proctoringDeductions: penalty,
    feedback: communication.feedback,
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
 * LLM-based communication scoring - one call scores the whole interview at
 * once so the grader can weigh consistency across answers, not just each
 * one in isolation. Uses Anthropic Claude (if ANTHROPIC_API_KEY is
 * configured) or OpenAI (if OPENAI_API_KEY is configured).
 */
async function scoreCommunicationLlm(qaPairs) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openAiKey = process.env.OPENAI_API_KEY;

  const prompt = `You are a senior corporate communication coach evaluating a candidate's SPOKEN ENGLISH for a US-payer-facing Healthcare RCM (Revenue Cycle Management) role such as HCC coding, AR calling, or denial management. These roles live or die on being clearly understood on a phone call with a US-based payer or provider.

DO NOT grade whether the content of an answer is factually or technically correct - these are open conversational/biographical questions (introduce yourself, your training, your background) and there is no "right answer" to check against. Your ONLY job is to judge HOW WELL each answer was communicated, based on the transcript of what was spoken.

Score these four dimensions, each 0-100, for the interview as a whole (weigh all answered questions together, and let unanswered/near-empty answers pull the relevant scores down since they show nothing to evaluate):

1. clarity - Clarity & pronunciation. Judge this from how clean and coherent the transcript reads: a clear, well-enunciated speaker produces a transcript that reads as coherent sentences; heavy mumbling or unclear speech tends to produce garbled, fragmented, or nonsensical transcript text. Do not penalize normal speech-to-text quirks (missing punctuation, occasional misheard word) - look for genuine incoherence.
2. fluency - Fluency & pace. Judge natural flow: minimal filler words ("um", "uh", "like", "you know"), minimal false starts/self-corrections/repetition, complete sentences rather than fragmented ones.
3. vocabularyGrammar - Range and correctness of spoken English: sentence construction, tense agreement, word choice, grammatical correctness.
4. confidenceDelivery - Structured, complete, on-topic, professional-sounding responses vs. very short, rambling, evasive, or off-topic ones. A candidate who answers fully and directly, in a organized way, scores high here regardless of whether the content happens to be interesting.

Handling non-English answers: if a candidate answered in a language other than English (see "Detected language" per answer below), score clarity/fluency/vocabularyGrammar conservatively for THIS role's spoken-English requirement (they cannot be judged as fluent English communicators from a non-English answer) - but you may still credit confidenceDelivery based on the English translation if the answer was clearly well-structured and complete in their own language.

Handling missing answers: if the transcript is empty or fewer than 3 words, treat that question as unanswered - it should pull the interview's scores down but do not let a single unanswered question zero out an otherwise reasonable score across ${qaPairs.length} questions.

INTERVIEW TRANSCRIPT (${qaPairs.length} questions):
${qaPairs
  .map(
    (pair, idx) =>
      `Q${idx + 1}: ${pair.question}
Detected language: ${pair.detectedLanguage || "unknown"}
Original spoken transcript: ${pair.transcript || "(no spoken response)"}
English translation (meaning reference only - do not use this text to judge English fluency/clarity/grammar, only to understand what was said): ${pair.translatedTranscript || pair.transcript || "(none)"}
`
  )
  .join("\n")}

Return strictly JSON: {"clarity": <0-100 integer>, "fluency": <0-100 integer>, "vocabularyGrammar": <0-100 integer>, "confidenceDelivery": <0-100 integer>, "overallFeedback": "<2-3 sentence summary of the candidate's communication strengths/weaknesses>", "answerNotes": [{"note": "<one short sentence on this specific answer's delivery, not its content correctness>"}, ...]} with exactly ${qaPairs.length} entries in "answerNotes", in the same order as the questions above.`;

  let parsed = {};

  if (anthropicKey) {
    const response = await axios.post(
      "https://api.anthropic.com/v1/messages",
      {
        model: "claude-haiku-4-5-20251001",
        max_tokens: 2500,
        system: "You are a senior corporate communication coach and interview evaluator. Output strictly JSON.",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
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
        temperature: 0.2,
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

  const rubric = {
    clarity: clampScore(parsed.clarity, 50),
    fluency: clampScore(parsed.fluency, 50),
    vocabularyGrammar: clampScore(parsed.vocabularyGrammar, 50),
    confidenceDelivery: clampScore(parsed.confidenceDelivery, 50),
  };

  const notes = Array.isArray(parsed.answerNotes) ? parsed.answerNotes : [];

  const answerNotes = qaPairs.map((pair, idx) => {
    const words = (pair.transcript || "").trim().split(/\s+/).filter(Boolean);
    const answered = words.length >= 3;
    const note = notes[idx]?.note || (answered ? "Evaluated as part of the overall communication assessment." : "No spoken response detected for this question.");
    return {
      questionId: pair.questionId,
      question: pair.question,
      answered,
      note,
      transcript: pair.transcript || "",
      translatedTranscript: pair.translatedTranscript || pair.transcript || "",
      detectedLanguage: pair.detectedLanguage || "unknown",
    };
  });

  const answeredCount = answerNotes.filter((q) => q.answered).length;
  let feedback =
    parsed.overallFeedback ||
    `Candidate's spoken communication was evaluated across ${qaPairs.length} interview questions (${answeredCount} answered).`;
  if (answeredCount < qaPairs.length) {
    feedback += ` ${qaPairs.length - answeredCount} question(s) had no usable spoken response.`;
  }

  return { rubric, feedback, answerNotes };
}

/**
 * Heuristic communication scorer used when no LLM API key is configured (or
 * the LLM call fails). Has no real language understanding - it approximates
 * the same four dimensions from surface transcript statistics: how much was
 * said, how varied the vocabulary was, and how filler-heavy the speech was.
 * This is deliberately conservative and exists only as a fallback so the
 * stage still produces a usable score offline - the LLM path above is the
 * primary grader whenever a key is configured.
 */
function computeHeuristicCommunicationScore(qaPairs) {
  const fillerWords = ["um", "uh", "umm", "uhh", "like", "you know", "i mean", "basically", "actually", "sort of", "kind of", "so yeah"];

  const perAnswer = qaPairs.map((pair, idx) => {
    const originalText = (pair.transcript || "").trim();
    const words = originalText.split(/\s+/).filter(Boolean);

    if (words.length < 3) {
      return {
        answered: false,
        questionId: pair.questionId,
        question: pair.question,
        note: "No spoken response detected for this question.",
        transcript: originalText,
        translatedTranscript: pair.translatedTranscript || originalText,
        detectedLanguage: pair.detectedLanguage || "none",
        scores: { clarity: 0, fluency: 0, vocabularyGrammar: 0, confidenceDelivery: 0 },
      };
    }

    const lower = originalText.toLowerCase();
    const wordCount = words.length;
    let fillerCount = 0;
    fillerWords.forEach((fw) => {
      const matches = lower.split(fw).length - 1;
      fillerCount += matches;
    });
    const fillerRatio = fillerCount / wordCount;

    const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9']/g, ""))).size;
    const vocabDiversity = uniqueWords / wordCount;

    const sentenceCount = Math.max(1, originalText.split(/[.!?]+/).filter((s) => s.trim().length > 0).length);
    const avgSentenceLen = wordCount / sentenceCount;

    // Clarity: penalize heavy filler/fragmentation, reward a substantial,
    // coherent-length response.
    let clarity = 75 - fillerRatio * 200;
    clarity += Math.min(15, Math.max(0, wordCount - 15) * 0.3);
    clarity = clampScore(clarity);

    // Fluency: reward sentence lengths in a natural conversational range
    // (roughly 8-22 words/sentence), penalize filler and very choppy or
    // extremely run-on speech.
    let fluency = 80 - fillerRatio * 220;
    if (avgSentenceLen < 5) fluency -= (5 - avgSentenceLen) * 4;
    if (avgSentenceLen > 28) fluency -= (avgSentenceLen - 28) * 2;
    fluency = clampScore(fluency);

    // Vocabulary & grammar: reward lexical variety, with a small bonus for
    // longer answers (harder to sustain variety in a longer response).
    let vocabularyGrammar = 40 + vocabDiversity * 90;
    vocabularyGrammar += Math.min(10, wordCount * 0.1);
    vocabularyGrammar = clampScore(vocabularyGrammar);

    // Confidence & delivery: reward complete, substantial answers; heavily
    // penalize very short, thin responses that dodge the question.
    let confidenceDelivery = Math.min(90, 30 + wordCount * 1.5);
    confidenceDelivery -= fillerRatio * 100;
    confidenceDelivery = clampScore(confidenceDelivery);

    return {
      answered: true,
      questionId: pair.questionId,
      question: pair.question,
      note: `Approximate offline scoring based on response length (${wordCount} words) and speech pattern.`,
      transcript: originalText,
      translatedTranscript: pair.translatedTranscript || originalText,
      detectedLanguage: pair.detectedLanguage || "unknown",
      scores: { clarity, fluency, vocabularyGrammar, confidenceDelivery },
    };
  });

  const answered = perAnswer.filter((a) => a.answered);
  const avg = (key) => (answered.length ? Math.round(answered.reduce((sum, a) => sum + a.scores[key], 0) / perAnswer.length) : 0);

  const rubric = {
    clarity: clampScore(avg("clarity")),
    fluency: clampScore(avg("fluency")),
    vocabularyGrammar: clampScore(avg("vocabularyGrammar")),
    confidenceDelivery: clampScore(avg("confidenceDelivery")),
  };

  const answerNotes = perAnswer.map(({ scores, ...rest }) => rest);

  let feedback = `Candidate's spoken communication was evaluated (offline heuristic scoring) across ${qaPairs.length} interview questions (${answered.length} answered).`;
  if (answered.length < qaPairs.length) {
    feedback += ` ${qaPairs.length - answered.length} question(s) had no usable spoken response.`;
  }

  return { rubric, feedback, answerNotes };
}

module.exports = { evaluateAiVideoAssessment };
