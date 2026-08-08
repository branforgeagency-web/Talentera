const express = require("express");
const router = express.Router();

let incomingQueue = [
  { id: "inc_01", studentName: "Sanjay Mehta", academy: "Apex Medical Coding Institute", batch: "Batch 2025-A", course: "Medical Coding", score: 94, status: "Pending Verification" },
  { id: "inc_02", studentName: "Pooja Hegde", academy: "MedCode Academy", batch: "Batch 2025-B", course: "RCM Billing", score: 88, status: "Pending Verification" },
  { id: "inc_03", studentName: "Manish Reddy", academy: "National Health Training Inst.", batch: "Batch 2024-D", course: "Denial Management", score: 91, status: "Pending Verification" }
];

let staffTasks = [
  { id: "tsk_1", time: "10:30 AM", title: "Verify CPC Certificate for Sanjay Mehta", priority: "P1", category: "Audit" },
  { id: "tsk_2", time: "11:15 AM", title: "Review Video Introduction (Sneha Patel)", priority: "P2", category: "Video Review" },
  { id: "tsk_3", time: "02:00 PM", title: "Approve Apex Institute Batch Upload (42 Students)", priority: "P1", category: "Batch Approval" },
  { id: "tsk_4", time: "04:30 PM", title: "Publish Weekly Verified Talent Leaderboard", priority: "P3", category: "Report" }
];

// POST /api/staff/login - Staff login
router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (!username) return res.status(400).json({ message: "Staff ID or Username required." });

  res.json({
    token: "demo_staff_token_op_99",
    staff: {
      id: "staff_01",
      name: "Vikram Malhotra",
      role: "Lead Verification Officer",
      department: "Operations & Quality Control",
      verificationsToday: 24,
      accuracyRate: "99.4%"
    }
  });
});

// GET /api/staff/dashboard - Staff Operations Hub metrics
router.get("/dashboard", (req, res) => {
  res.json({
    liveQueueCount: incomingQueue.length + 18,
    stats: {
      pendingVerifications: incomingQueue.length + 18,
      verifiedToday: 42,
      activeCandidates: 340,
      placedThisMonth: 86
    },
    pipeline: [
      { stage: "Basic Info", count: 120 },
      { stage: "Training Claim", count: 85 },
      { stage: "Certification", count: 64 },
      { stage: "Assessment", count: 48 },
      { stage: "Video Intro", count: 32 },
      { stage: "Live Charts", count: 28 },
      { stage: "Placed", count: 86, isPlaced: true }
    ],
    incomingBucket: incomingQueue,
    tasks: staffTasks,
    leaderboard: [
      { rank: 1, name: "Vikram Malhotra", dept: "RCM Quality Audit", score: 98 },
      { rank: 2, name: "Neha Saxena", dept: "Coding Verification", score: 94 },
      { rank: 3, name: "Rohan Das", dept: "Video & Assessment QC", score: 91 }
    ]
  });
});

// POST /api/staff/verify-candidate - Perform verification action
router.post("/verify-candidate", (req, res) => {
  const { candidateId, action } = req.body;
  incomingQueue = incomingQueue.filter((item) => item.id !== candidateId);

  res.json({
    message: `Candidate ${candidateId} successfully ${action === "verify" ? "Verified & Gold-Badged" : "Skipped"}.`,
    remainingCount: incomingQueue.length
  });
});

module.exports = router;
