const express = require("express");
const Enquiry = require("../models/Enquiry");
const Notification = require("../models/Notification");
const { requireStaffAuth } = require("../middleware/auth");

const router = express.Router();

// Staff: list enquiries (optional ?status=OPEN|REPLIED|CLOSED)
router.get("/", requireStaffAuth, async (req, res) => {
  try {
    const q = {};
    const status = String(req.query.status || "").toUpperCase();
    if (["OPEN", "REPLIED", "CLOSED"].includes(status)) q.status = status;
    const [enquiries, open, replied, closed] = await Promise.all([
      Enquiry.find(q).sort({ createdAt: -1 }).limit(200).lean(),
      Enquiry.countDocuments({ status: "OPEN" }),
      Enquiry.countDocuments({ status: "REPLIED" }),
      Enquiry.countDocuments({ status: "CLOSED" }),
    ]);
    res.json({ enquiries, counts: { open, replied, closed, total: open + replied + closed } });
  } catch (err) {
    console.error("Staff list enquiries error:", err.message);
    res.status(500).json({ message: "Could not load enquiries." });
  }
});

// Staff: reply to an enquiry (candidate is notified in-app)
router.post("/:id/reply", requireStaffAuth, async (req, res) => {
  try {
    const text = String(req.body?.text || "").trim().slice(0, 4000);
    if (!text) return res.status(400).json({ message: "Please type a reply." });
    const enquiry = await Enquiry.findById(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });

    enquiry.replies.push({ staffId: String(req.staffId || ""), staffName: req.staffName || "Talentera Support", text });
    enquiry.status = "REPLIED";
    enquiry.unreadByCandidate = true;
    enquiry.repliedAt = new Date();
    enquiry.closedAt = null;
    await enquiry.save();

    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: String(enquiry.candidateId),
        title: "Reply to your enquiry",
        message: `Talentera support replied to: ${enquiry.subject}`,
        type: "system",
        meta: { enquiryId: String(enquiry._id) },
      });
    } catch (_e) {
      // notification is best-effort
    }

    res.json({ enquiry });
  } catch (err) {
    console.error("Staff reply enquiry error:", err.message);
    res.status(500).json({ message: "Could not send the reply." });
  }
});

// Staff: close an enquiry without further reply
router.post("/:id/close", requireStaffAuth, async (req, res) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(
      req.params.id,
      { $set: { status: "CLOSED", closedAt: new Date() } },
      { new: true }
    );
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found." });
    res.json({ enquiry });
  } catch (err) {
    res.status(500).json({ message: "Could not close the enquiry." });
  }
});

module.exports = router;
