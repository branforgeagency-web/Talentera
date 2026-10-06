const express = require("express");
const Candidate = require("../models/Candidate");
const { requireAuth } = require("../middleware/auth");
const { getSupportReply } = require("../utils/supportBot");

const router = express.Router();

// Simple in-memory limiter: 20 questions per minute per candidate
const hits = new Map();
function limited(id) {
  const now = Date.now();
  const arr = (hits.get(id) || []).filter((t) => now - t < 60000);
  arr.push(now);
  hits.set(id, arr);
  return arr.length > 20;
}

router.post("/chat", requireAuth, async (req, res) => {
  try {
    const id = String(req.candidateId);
    if (limited(id)) return res.status(429).json({ message: "You are sending messages too quickly. Please wait a moment." });
    const candidate = await Candidate.findById(req.candidateId).select("fullName completedStages primaryDomain stage2").lean();
    const out = await getSupportReply({ messages: req.body?.messages, candidate });
    res.json(out);
  } catch (err) {
    console.error("Support chat error:", err.message);
    res.status(500).json({ message: "Support assistant is unavailable right now." });
  }
});

module.exports = router;
