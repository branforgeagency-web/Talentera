const express = require("express");
const Candidate = require("../models/Candidate");
const Enquiry = require("../models/Enquiry");
const Notification = require("../models/Notification");
const { requireAuth } = require("../middleware/auth");

const router = express.Router();

const CATEGORIES = [
  "Account & Login",
  "Stages & Score",
  "Assessment / Video Pitch",
  "Documents & Resume",
  "Jobs & Applications",
  "Referrals & Rewards",
  "Other",
];

// Simple in-memory limiter: 5 new enquiries per hour per candidate
const hits = new Map();
function limited(id) {
  const now = Date.now();
  const arr = (hits.get(id) || []).filter((t) => now - t < 3600000);
  arr.push(now);
  hits.set(id, arr);
  return arr.length > 5;
}

// Candidate: submit a new enquiry
router.post("/enquiries", requireAuth, async (req, res) => {
  try {
    const subject = String(req.body?.subject || "").trim().slice(0, 150);
    const message = String(req.body?.message || "").trim().slice(0, 2000);
    const category = CATEGORIES.includes(req.body?.category) ? req.body.category : "Other";
    if (!subject || !message) return res.status(400).json({ message: "Please enter a subject and your question." });
    if (limited(String(req.candidateId))) {
      return res.status(429).json({ message: "You have sent several enquiries recently. Please wait for our reply before sending more." });
    }
    const candidate = await Candidate.findById(req.candidateId).select("fullName email mobile stage1").lean();
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const enquiry = await Enquiry.create({
      candidateId: req.candidateId,
      candidateName: candidate.fullName || candidate.stage1?.fullName || "",
      candidateEmail: candidate.email || "",
      candidateMobile: candidate.mobile || candidate.stage1?.mobile || "",
      category,
      subject,
      message,
    });

    try {
      await Notification.create({
        recipientType: "staff",
        recipientId: "staff",
        title: "New candidate enquiry",
        message: `${enquiry.candidateName || "A candidate"} asked: ${subject}`,
        type: "system",
        meta: { enquiryId: String(enquiry._id) },
      });
    } catch (_e) {
      // notification is best-effort
    }

    res.status(201).json({ enquiry });
  } catch (err) {
    console.error("Create enquiry error:", err.message);
    res.status(500).json({ message: "Could not send your enquiry. Please try again." });
  }
});

// Candidate: list my enquiries
router.get("/enquiries", requireAuth, async (req, res) => {
  try {
    const enquiries = await Enquiry.find({ candidateId: req.candidateId }).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ enquiries, unread: enquiries.filter((e) => e.unreadByCandidate).length });
  } catch (err) {
    console.error("List enquiries error:", err.message);
    res.status(500).json({ message: "Could not load your enquiries." });
  }
});

// Candidate: mark an enquiry's replies as seen
router.post("/enquiries/:id/seen", requireAuth, async (req, res) => {
  try {
    await Enquiry.updateOne({ _id: req.params.id, candidateId: req.candidateId }, { $set: { unreadByCandidate: false } });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: "Could not update enquiry." });
  }
});

module.exports = router;
