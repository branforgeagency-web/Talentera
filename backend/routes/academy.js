const express = require("express");
const Candidate = require("../models/Candidate");
const bcrypt = require("bcryptjs");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");

const router = express.Router();

let academyBatches = [
  { code: "RCM-2025-A", course: "Healthcare RCM & AR Follow-up", studentsCount: 42, completionPct: 95, status: "Active" },
  { code: "CPC-2025-B", course: "CPC Certified Medical Coding", studentsCount: 38, completionPct: 88, status: "Active" },
  { code: "BIL-2024-D", course: "Payment Posting & Claims Entry", studentsCount: 30, completionPct: 100, status: "Completed" }
];

// POST /api/academy/login - Academy login with MSG91 OTP access token verification
router.post("/login", async (req, res) => {
  const { accessToken, fullName, academyName, email, mobile, phone } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Missing MSG91 OTP verification token." });
  }

  try {
    await verifyWidgetAccessToken(accessToken);
  } catch (err) {
    if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    console.error("Academy login OTP verify error:", err);
    return res.status(500).json({ message: err.message || "Server error verifying OTP." });
  }

  res.json({
    token: `demo_academy_token_${Date.now()}`,
    academy: {
      id: `acad_${Date.now()}`,
      name: academyName || "Apex Medical Coding Institute",
      contactName: fullName || "Academy Partner",
      email: email || "partner@academy.com",
      phone: mobile || phone || "",
      tier: "Platinum Partner",
      partnerSince: "2024",
      studentsUploaded: 52,
      verifiedPct: 94
    }
  });
});

// GET /api/academy/dashboard - Dashboard data
router.get("/dashboard", async (req, res) => {
  try {
    const dbCandidates = await Candidate.find().lean();

    const formattedStudents = dbCandidates.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s4 = c.stage4 || {};
      const isVerified = (c.completedStages || []).length >= 8;

      return {
        id: c._id,
        name: s1.fullName || c.email,
        phone: s1.mobile || "+91 98765 00000",
        course: s1.currentRole || "Healthcare RCM Specialist",
        batch: s2.batch || "Batch 2026",
        status: isVerified ? "Verified" : "Pending Verification",
        score: s4.score || 88,
        placementStatus: isVerified ? "Available for Placement" : "Verification in Progress",
      };
    });

    res.json({
      kpis: {
        totalStudents: formattedStudents.length + 140,
        verifiedStudents: Math.round((formattedStudents.length + 140) * 0.92),
        placedStudents: 118,
        avgScore: 91,
        placementRate: "88%"
      },
      students: formattedStudents,
      batches: academyBatches,
      placements: [
        { studentName: "Rahul Verma", company: "Access Healthcare", role: "AR Follow-up Executive", salary: "5.2 LPA", date: "Yesterday" },
        { studentName: "Amit Kulkarni", company: "RCM Global", role: "Denial Management Analyst", salary: "6.0 LPA", date: "3 days ago" },
        { studentName: "Divya Nair", company: "Coronis Health", role: "CPC Medical Coder", salary: "4.8 LPA", date: "1 week ago" }
      ]
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error loading academy dashboard." });
  }
});

// POST /api/academy/upload-students - Bulk upload into MongoDB Candidate collection
router.post("/upload-students", async (req, res) => {
  try {
    const { batchName, count } = req.body;
    const newCount = Number(count) || 5;
    const defaultPassword = await bcrypt.hash("Password123", 10);

    const createdDocs = [];
    for (let i = 1; i <= newCount; i++) {
      const randomId = Math.floor(1000 + Math.random() * 9000);
      const email = `student_${Date.now()}_${i}@apexacademy.com`;

      const candidate = await Candidate.create({
        email,
        passwordHash: defaultPassword,
        completedStages: [1, 2, 4],
        stage1: {
          fullName: `Academy Student #${randomId}`,
          mobile: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
          city: "Bengaluru",
          experience: "Fresher",
          currentRole: "Medical Coding Trainee",
          aadhaarVerified: true,
        },
        stage2: {
          academyName: "Apex Medical Coding Institute",
          batch: batchName || "Batch 2026-Import",
          verified: true,
        },
        stage4: {
          score: 80 + Math.floor(Math.random() * 15),
          total: 100,
          topic: "Academy Assessment Test",
          passed: true,
        },
        stage7: {
          summary: `Trained medical coding candidate from ${batchName || "Batch 2026-Import"}.`,
        },
        stage8: {
          status: "Immediate Joiner",
          expectedCtc: "3.5 LPA",
        },
      });
      createdDocs.push(candidate);
    }

    const totalStudents = await Candidate.countDocuments();

    res.json({
      message: `Successfully uploaded ${newCount} student candidates to ${batchName || "Batch 2026-Import"}.`,
      totalStudents,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ message: "Bulk upload failed." });
  }
});

module.exports = router;
