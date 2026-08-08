const express = require("express");
const router = express.Router();

// Mock Academy Data
let academyStudents = [
  { id: "stu_1", name: "Rahul Verma", phone: "+91 98111 22334", course: "Medical Coding (CPC)", batch: "Batch 2025-A", status: "Verified", score: 92, placementStatus: "Placed at Access Healthcare (5.2 LPA)" },
  { id: "stu_2", name: "Sneha Patel", phone: "+91 98222 33445", course: "Healthcare RCM & AR", batch: "Batch 2025-A", status: "Interviewing", score: 88, placementStatus: "Shortlisted by Omega Healthcare" },
  { id: "stu_3", name: "Amit Kulkarni", phone: "+91 98333 44556", course: "Denials & Appeals", batch: "Batch 2025-B", status: "Verified", score: 95, placementStatus: "Placed at RCM Global (6.0 LPA)" },
  { id: "stu_4", name: "Meera Krishnan", phone: "+91 98444 55667", course: "Payment Posting", batch: "Batch 2025-B", status: "Uploaded", score: 78, placementStatus: "Verification in Progress" },
  { id: "stu_5", name: "Deepak Sharma", phone: "+91 98555 66778", course: "Medical Billing", batch: "Batch 2025-C", status: "Verified", score: 90, placementStatus: "Available for Placement" }
];

let academyBatches = [
  { code: "RCM-2025-A", course: "Healthcare RCM & AR Follow-up", studentsCount: 42, completionPct: 95, status: "Active" },
  { code: "CPC-2025-B", course: "CPC Certified Medical Coding", studentsCount: 38, completionPct: 88, status: "Active" },
  { code: "BIL-2024-D", course: "Payment Posting & Claims Entry", studentsCount: 30, completionPct: 100, status: "Completed" }
];

// POST /api/academy/login - Simulates Phone OTP Auth
router.post("/login", (req, res) => {
  const { phone, otp } = req.body;
  if (!phone) return res.status(400).json({ message: "Phone number required." });
  
  // For demo, accept OTP 123456 or any 6-digit OTP
  res.json({
    token: "demo_academy_token_apex_101",
    academy: {
      id: "acad_apex_01",
      name: "Apex Medical Coding Institute",
      tier: "Platinum Partner",
      partnerSince: "2023",
      studentsUploaded: academyStudents.length,
      verifiedPct: 94
    }
  });
});

// GET /api/academy/dashboard - Dashboard data
router.get("/dashboard", (req, res) => {
  res.json({
    kpis: {
      totalStudents: academyStudents.length + 140,
      verifiedStudents: Math.round((academyStudents.length + 140) * 0.92),
      placedStudents: 118,
      avgScore: 91,
      placementRate: "88%"
    },
    students: academyStudents,
    batches: academyBatches,
    placements: [
      { studentName: "Rahul Verma", company: "Access Healthcare", role: "AR Follow-up Executive", salary: "5.2 LPA", date: "Yesterday" },
      { studentName: "Amit Kulkarni", company: "RCM Global", role: "Denial Management Analyst", salary: "6.0 LPA", date: "3 days ago" },
      { studentName: "Divya Nair", company: "Coronis Health", role: "CPC Medical Coder", salary: "4.8 LPA", date: "1 week ago" }
    ]
  });
});

// POST /api/academy/upload-students - Bulk upload simulation
router.post("/upload-students", (req, res) => {
  const { batchName, count } = req.body;
  const newCount = count || 5;

  for (let i = 1; i <= newCount; i++) {
    academyStudents.push({
      id: `stu_${Date.now()}_${i}`,
      name: `Student Candidate #${academyStudents.length + 1}`,
      phone: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
      course: "Healthcare RCM Trainee",
      batch: batchName || "Batch 2025-Import",
      status: "Uploaded",
      score: 80 + Math.floor(Math.random() * 15),
      placementStatus: "Stage 1 Uploaded"
    });
  }

  res.json({
    message: `Successfully uploaded ${newCount} students to ${batchName || "Batch 2025-Import"}.`,
    totalStudents: academyStudents.length
  });
});

module.exports = router;
