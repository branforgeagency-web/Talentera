const express = require("express");
const Candidate = require("../models/Candidate");

const router = express.Router();

let staffTasks = [
  { id: "tsk_1", time: "10:30 AM", title: "Verify CPC Certificate for Sanjay Mehta", priority: "P1", category: "Audit" },
  { id: "tsk_2", time: "11:45 AM", title: "Review Assessment Test #849 (MedCode Inst.)", priority: "P2", category: "Assessment" },
  { id: "tsk_3", time: "02:15 PM", title: "Approve Academy Batch Batch 2025-A Upload", priority: "P1", category: "Batch" },
  { id: "tsk_4", time: "04:30 PM", title: "Publish Weekly Verified Talent Leaderboard", priority: "P3", category: "Report" }
];

// POST /api/staff/login - Staff login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ message: "Staff ID or Username required." });

  res.json({
    token: "demo_staff_token_op_99",
    staff: {
      username,
      role: "Senior Operations Auditor",
      name: "Ananya Sharma",
      badge: "Gold Certified Lead"
    }
  });
});

// GET /api/staff/dashboard - Staff Operations Hub metrics
router.get("/dashboard", async (req, res) => {
  try {
    const candidates = await Candidate.find().lean();
    const totalCandidates = candidates.length;

    // Filter pending vs fully verified
    const pendingCandidates = candidates.filter((c) => (c.completedStages || []).length < 8);
    const fullyVerified = candidates.filter((c) => (c.completedStages || []).length >= 8);

    const incomingBucket = pendingCandidates.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s4 = c.stage4 || {};
      return {
        id: c._id,
        studentName: s1.fullName || c.email,
        academy: s2.academyName || "Partner Academy",
        batch: s2.batch || "Batch 2026",
        course: s1.currentRole || "Medical Coding",
        score: s4.score || 85,
        status: "Pending Verification",
      };
    });

    const pipeline = [
      { stage: "Basic Info", count: candidates.filter((c) => c.completedStages?.includes(1)).length || totalCandidates },
      { stage: "Training Claim", count: candidates.filter((c) => c.completedStages?.includes(2)).length },
      { stage: "Certification", count: candidates.filter((c) => c.completedStages?.includes(3)).length },
      { stage: "Assessment", count: candidates.filter((c) => c.completedStages?.includes(4)).length },
      { stage: "Video Intro", count: candidates.filter((c) => c.completedStages?.includes(5)).length },
      { stage: "Live Charts", count: candidates.filter((c) => c.completedStages?.includes(6)).length },
      { stage: "Placed", count: fullyVerified.length, isPlaced: true }
    ];

    res.json({
      liveQueueCount: incomingBucket.length,
      stats: {
        pendingVerifications: incomingBucket.length,
        verifiedToday: 42 + fullyVerified.length,
        activeCandidates: totalCandidates,
        placedThisMonth: 86
      },
      pipeline,
      incomingBucket,
      tasks: staffTasks,
      leaderboard: [
        { rank: 1, name: "Vikram Malhotra", dept: "RCM Quality Audit", score: 98 },
        { rank: 2, name: "Neha Saxena", dept: "Coding Verification", score: 94 },
        { rank: 3, name: "Rohan Das", dept: "Video & Assessment QC", score: 91 }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error fetching staff dashboard." });
  }
});

// POST /api/staff/verify-candidate - Perform verification action
router.post("/verify-candidate", async (req, res) => {
  try {
    const { candidateId, action } = req.body;
    const candidate = await Candidate.findById(candidateId);
    if (candidate) {
      if (action === "verify") {
        candidate.completedStages = Array.from(new Set([...(candidate.completedStages || []), 1, 2, 3, 4, 5, 6, 7, 8]));
        await candidate.save();
      }
    }

    res.json({
      message: `Candidate successfully ${action === "verify" ? "Verified & Gold-Badged" : "Skipped"}.`,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Verification action failed." });
  }
});

module.exports = router;
