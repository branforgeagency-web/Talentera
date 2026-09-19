const express = require("express");
const jwt = require("jsonwebtoken");
const Candidate = require("../models/Candidate");
const logger = require("../utils/logger");
const { getMessiTurn } = require("../utils/claudeInterview");
const { buildFreshAiInterviewSession, finalizeAiInterviewSession } = require("../utils/aiInterviewSession");

const router = express.Router();

// ---------------------------------------------------------------------------
// Vapi Custom LLM webhook for the AI Mock Interview ("Messi").
//
// Why this file exists separately from routes/candidate.js: every route in
// candidate.js sits behind `router.use(requireAuth)` (a Bearer JWT from the
// candidate's own browser session). Vapi's servers call this endpoint
// directly, server-to-server, with no Authorization header the candidate's
// browser set - so it can't live behind that same middleware. Instead, the
// candidate's JWT is embedded directly in the assistant's system prompt via
// Vapi's `variableValues` (see frontend's vapi.start() call and
// scripts/setupVapiAssistant.js's system prompt template), and THIS route
// extracts + verifies it itself with the exact same secret/logic as
// middleware/auth.js. Anyone holding a valid candidate JWT can already do
// everything this route does via the normal REST endpoints, so this is not
// a wider attack surface - just a different transport for the same auth.
//
// Contract: Vapi POSTs an OpenAI-chat-completions-shaped body
// { model, messages: [{role, content}, ...], stream, call: {...} } every
// time it needs the assistant's next line, with the FULL conversation so
// far. We reuse the exact same session/grading logic
// (buildFreshAiInterviewSession / getMessiTurn / finalizeAiInterviewSession)
// that the browser-Web-Speech-API path in candidate.js's /ai-interview/*
// routes uses, so the report a candidate gets is identical either way - only
// the voice transport differs.
// ---------------------------------------------------------------------------

const JWT_SECRET = process.env.JWT_SECRET;
const AUTH_TOKEN_RE = /\[AUTH_TOKEN:([^\]]+)\]/;
// Exact natural-language closing phrase Messi says when the interview is
// over. The Vapi assistant is configured with this exact string in
// `endCallPhrases` (see scripts/setupVapiAssistant.js) - Vapi hangs up the
// call as soon as the assistant's spoken reply contains it, so this is both
// what the candidate hears AND the call-end signal, no separate marker
// needed. Must stay in sync with the assistant config if ever reworded.
const CLOSING_PHRASE = "This concludes your AI Mock Interview";

function extractAuthToken(messages) {
  const systemMsg = (messages || []).find((m) => m.role === "system");
  const match = AUTH_TOKEN_RE.exec(systemMsg?.content || "");
  return match ? match[1] : null;
}

function openAiChunk(content, { streaming }) {
  const base = {
    id: `chatcmpl-messi-${Date.now()}`,
    object: streaming ? "chat.completion.chunk" : "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model: "messi-talentera",
  };
  if (streaming) {
    return { ...base, choices: [{ index: 0, delta: { role: "assistant", content }, finish_reason: "stop" }] };
  }
  return { ...base, choices: [{ index: 0, message: { role: "assistant", content }, finish_reason: "stop" }] };
}

function sendAssistantReply(req, res, content) {
  const streaming = Boolean(req.body?.stream);
  if (!streaming) {
    return res.json(openAiChunk(content, { streaming: false }));
  }
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.write(`data: ${JSON.stringify(openAiChunk(content, { streaming: true }))}\n\n`);
  res.write("data: [DONE]\n\n");
  return res.end();
}

// Vapi's custom-llm integration talks to this URL through the OpenAI SDK
// internally, treating whatever `model.url` the assistant is configured
// with as an OpenAI-compatible "base URL" - it always POSTs to
// `${model.url}/chat/completions`, never to `model.url` itself. Our
// assistant's model.url is `.../api/vapi/llm` (see
// scripts/setupVapiAssistant.js's LLM_URL), so the real inbound path is
// `/llm/chat/completions`, not `/llm`. Confirmed via a Vapi call log
// showing "Cannot POST /api/vapi/llm/chat/completions" (404) as the exact
// cause of every "provider-fault-custom-llm-llm-failed" call ending after
// ~4-6s with no assistant message ever generated. Registering the handler
// at both paths means this keeps working even if a future assistant
// config ever points straight at this URL without the OpenAI-SDK
// convention appending the suffix.
router.post(["/llm", "/llm/chat/completions"], async (req, res) => {
  try {
    if (!JWT_SECRET) {
      logger.error("Vapi LLM webhook: JWT_SECRET not configured.");
      return sendAssistantReply(req, res, "I'm having a configuration issue on my end - please restart the interview in a moment.");
    }

    const messages = Array.isArray(req.body?.messages) ? req.body.messages : [];
    const token = extractAuthToken(messages);
    if (!token) {
      logger.warn("Vapi LLM webhook: no AUTH_TOKEN found in system prompt.");
      return sendAssistantReply(req, res, "I couldn't verify your session - please restart the interview.");
    }

    let candidateId;
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      if (decoded.role && decoded.role !== "candidate") throw new Error("wrong role");
      candidateId = decoded.id;
    } catch (err) {
      logger.warn(`Vapi LLM webhook: invalid auth token (${err.message}).`);
      return sendAssistantReply(req, res, "Your session has expired - please restart the interview.");
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return sendAssistantReply(req, res, "I couldn't find your candidate profile - please restart the interview.");
    }

    // The most recent thing the candidate actually said, if any. On the
    // very first webhook call for a fresh call, there is no user message
    // yet (Vapi is asking for the opening line) - that's the "start" path.
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user");
    const utterance = (lastUserMessage?.content || "").trim();

    let session = candidate.stage8?.aiInterview;
    const needsFreshSession = !session || session.status !== "IN_PROGRESS" || !lastUserMessage;

    if (needsFreshSession) {
      // Starting (or restarting) the interview - same rule as
      // POST /api/candidate/ai-interview/start: resume an in-progress
      // session as-is rather than regenerating it out from under the
      // candidate, unless there isn't one to resume.
      if (!session || session.status !== "IN_PROGRESS") {
        session = await buildFreshAiInterviewSession(candidate);
        candidate.stage8 = { ...(candidate.stage8 || {}), aiInterview: session };
        candidate.markModified("stage8");
        await candidate.save();
      }
      const firstQ = session.questions[session.currentQuestionIndex] || session.questions[0];
      const totalCount = session.questions.length;
      // The frontend now restarts the live call after every non-voice turn
      // (skip / 5s-inactivity timeout / typed answer) since those are
      // applied via REST rather than injected into the live call - so this
      // "opening line" path fires far more often than just once per
      // interview. Only greet + explain the format on a genuinely fresh
      // start (question 1, nothing answered yet); every later (re)connect
      // just picks the conversation back up at the current question.
      const isFreshStart = session.currentQuestionIndex === 0 && (!session.turns || session.turns.length === 0);
      const opening = isFreshStart
        ? `Hi ${session.candidateName}! I'm Messi, your AI interviewer today. I'll ask you ${totalCount} question${totalCount === 1 ? "" : "s"} about ${session.role}. Let's begin with question 1 of ${totalCount}: ${firstQ?.question || ""}`
        : `Let's continue - question ${session.currentQuestionIndex + 1} of ${totalCount}: ${firstQ?.question || ""}`;
      return sendAssistantReply(req, res, opening);
    }

    if (session.status === "COMPLETED") {
      const score = session.result?.overallScore ?? 80;
      return sendAssistantReply(req, res, `You have completed this interview. Your overall score is ${score} out of 100. ${CLOSING_PHRASE}.`);
    }

    // Idempotency check: if this user utterance was already processed for this question or session was already advanced,
    // prompt current question without double-advancing.
    const lastTurn = session.turns?.[session.turns.length - 1];
    if (
      lastTurn &&
      lastTurn.candidateAnswer === utterance &&
      (lastTurn.questionIndex === session.currentQuestionIndex || lastTurn.questionIndex === session.currentQuestionIndex - 1)
    ) {
      const currentQ = session.questions[session.currentQuestionIndex];
      const reply = currentQ
        ? `Question ${session.currentQuestionIndex + 1} of ${session.questions.length}: ${currentQ.question}`
        : `Thank you. ${CLOSING_PHRASE}.`;
      return sendAssistantReply(req, res, reply);
    }

    // A normal answered turn.
    const turnResult = await getMessiTurn({ session, candidateUtterance: utterance });
    const currentIndex = session.currentQuestionIndex;
    const currentQuestion = session.questions[currentIndex];

    session.turns.push({
      questionIndex: currentIndex,
      questionText: currentQuestion.question,
      candidateAnswer: utterance,
      intent: turnResult.intent,
      evaluation: turnResult.evaluation,
      score: turnResult.score,
      messiReply: turnResult.messiReply,
      isFollowUp: false,
      flags: turnResult.evaluation === "no_answer" && utterance ? ["very_short_answer"] : [],
      timestamp: new Date(),
    });

    let interviewEnded = false;
    let replyText = turnResult.messiReply;

    if (["hint", "repeat", "clarify", "stop"].includes(turnResult.intent)) {
      // Repeat/hint/clarify/stop current question - no advance, no end.
    } else {
      if (session.questionRecords?.some((r) => r.index === currentIndex)) {
        const currentQ = session.questions[session.currentQuestionIndex];
        const reply = currentQ
          ? `Question ${session.currentQuestionIndex + 1} of ${session.questions.length}: ${currentQ.question}`
          : `Thank you. ${CLOSING_PHRASE}.`;
        return sendAssistantReply(req, res, reply);
      }

      session.questionRecords.push({
        index: currentIndex,
        topic: currentQuestion.topic || `Topic ${currentIndex + 1}`,
        question: currentQuestion.question,
        correctAnswer: currentQuestion.correctAnswer || "",
        expectedConcepts: currentQuestion.expectedConcepts,
        keywords: currentQuestion.keywords || [],
        candidateAnswer: utterance,
        evaluation: turnResult.evaluation,
        score: turnResult.score,
        missingConcepts: turnResult.missingConcepts,
        matchedKeywords: turnResult.matchedKeywords || [],
        missingKeywords: turnResult.missingKeywords || [],
        keywordMatchCount: Number.isFinite(turnResult.keywordMatchCount) ? turnResult.keywordMatchCount : 0,
        totalKeywords: turnResult.totalKeywords || (currentQuestion.keywords || []).length || 3,
        followUp: null,
      });

      if (currentIndex >= session.questions.length - 1) {
        interviewEnded = true;
      } else {
        session.currentQuestionIndex = currentIndex + 1;
        session.followUpCountForCurrent = 0;
        const nextQ = session.questions[session.currentQuestionIndex];
        replyText = `${turnResult.messiReply} Question ${session.currentQuestionIndex + 1} of ${session.questions.length}: ${nextQ.question}`;
      }
    }

    if (interviewEnded) {
      const result = await finalizeAiInterviewSession(candidate, session, "COMPLETED");
      replyText = `${turnResult.messiReply} That was the last question. Your overall score is ${result.overallScore} out of 100 - great work today. ${CLOSING_PHRASE}.`;
    } else {
      candidate.stage8 = { ...(candidate.stage8 || {}), aiInterview: session };
      candidate.markModified("stage8");
    }
    await candidate.save();

    return sendAssistantReply(req, res, replyText);
  } catch (err) {
    logger.error(`Vapi LLM webhook error: ${err.message}`, { stack: err.stack });
    return sendAssistantReply(req, res, "I ran into a technical issue on my end - let's try that again.");
  }
});

module.exports = router;
