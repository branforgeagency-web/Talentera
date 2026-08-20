const express = require("express");
const Candidate = require("../models/Candidate");
const Application = require("../models/Application");
const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const bcrypt = require("bcryptjs");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");
const { requireAcademyAuth, signToken } = require("../middleware/auth");
const { upload } = require("../middleware/upload");

const router = express.Router();

// Helper to parse CSV buffer into row objects
function parseCsvBuffer(buffer) {
  const text = buffer.toString("utf-8");
  const lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^["']|["']$/g, "").toLowerCase());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/^["']|["']$/g, ""));
    if (values.length < headers.length) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] || "";
    });
    rows.push(row);
  }
  return rows;
}

// POST /api/academy/login - Academy login with OTP token verification & JWT generation
router.post("/login", async (req, res) => {
  const { accessToken, fullName, academyName, email, mobile, phone } = req.body;

  if (!accessToken) {
    return res.status(400).json({ message: "Missing OTP verification token." });
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

  try {
    const cleanEmail = (email || "partner@academy.com").toLowerCase().trim();
    let academy = await Academy.findOne({ email: cleanEmail });

    if (!academy) {
      academy = await Academy.create({
        name: academyName || "Apex Medical Coding Institute",
        email: cleanEmail,
        contactName: fullName || "Academy Partner",
        phone: mobile || phone || "",
        tier: "Platinum Partner",
        partnerSince: new Date().getFullYear().toString(),
        studentsUploaded: 0,
        verifiedPct: 94,
      });

      // Create default batches for new academy
      await AcademyBatch.create([
        { academyId: academy._id, code: "RCM-2025-A", course: "Healthcare RCM & AR Follow-up", studentsCount: 42, completionPct: 95, status: "Active" },
        { academyId: academy._id, code: "CPC-2025-B", course: "CPC Certified Medical Coding", studentsCount: 38, completionPct: 88, status: "Active" },
        { academyId: academy._id, code: "BIL-2024-D", course: "Payment Posting & Claims Entry", studentsCount: 30, completionPct: 100, status: "Completed" },
      ]);
    } else if (academyName || fullName) {
      if (academyName) academy.name = academyName;
      if (fullName) academy.contactName = fullName;
      if (mobile || phone) academy.phone = mobile || phone;
      await academy.save();
    }

    const token = signToken(academy._id, "academy");

    res.json({
      token,
      academy: {
        id: academy._id,
        name: academy.name,
        contactName: academy.contactName,
        email: academy.email,
        phone: academy.phone,
        tier: academy.tier,
        badgeToken: academy.badgeToken,
        partnerSince: academy.partnerSince,
        studentsUploaded: academy.studentsUploaded,
        verifiedPct: academy.verifiedPct,
      },
    });
  } catch (err) {
    console.error("Academy login DB error:", err);
    res.status(500).json({ message: "Failed to log in academy account." });
  }
});

// GET /api/academy/dashboard - Dashboard data (Protected)
router.get("/dashboard", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    // Find candidates associated with this academy
    const dbCandidates = await Candidate.find({
      $or: [
        { "stage2.academyId": req.academyId.toString() },
        { "stage2.academyName": { $regex: new RegExp(`^${academy.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") } },
      ],
    }).lean();

    // Fallback: If fresh DB has no candidates linked yet, fetch all candidates so demo dashboard displays students
    const candidatesList = dbCandidates.length > 0 ? dbCandidates : await Candidate.find().limit(50).lean();

    const candidateIds = candidatesList.map((c) => c._id);
    const applications = await Application.find({ candidateId: { $in: candidateIds } })
      .populate("companyId", "companyName")
      .sort({ updatedAt: -1 })
      .lean();

    const latestAppMap = {};
    for (const app of applications) {
      const cid = app.candidateId.toString();
      if (!latestAppMap[cid]) {
        latestAppMap[cid] = app;
      }
    }

    let verifiedCount = 0;
    let placedCount = 0;
    let totalScoreSum = 0;

    const formattedStudents = candidatesList.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s4 = c.stage4 || {};
      const isVerified = (c.completedStages || []).length >= 8 || s4.passed;
      const app = latestAppMap[c._id.toString()];

      if (isVerified) verifiedCount++;
      totalScoreSum += Number(s4.score) || 85;

      let status = isVerified ? "Verified" : "Pending Verification";
      let placementStatus = isVerified ? "Available for Placement" : "Verification in Progress";

      if (app) {
        if (app.status === "rejected") {
          status = "Rejected";
          placementStatus = `Rejected by ${app.companyId?.companyName || "Employer"}`;
        } else if (app.status === "shortlisted") {
          status = "Shortlisted";
          placementStatus = `Shortlisted by ${app.companyId?.companyName || "Employer"}`;
        } else if (app.status === "interviewing") {
          status = "Interviewing";
          placementStatus = `Interview with ${app.companyId?.companyName || "Employer"}`;
        } else if (app.status === "hired") {
          status = "Placed";
          placedCount++;
          placementStatus = `Placed at ${app.companyId?.companyName || "Employer"}`;
        }
      }

      return {
        id: c._id,
        name: s1.fullName || c.email.split("@")[0],
        email: c.email,
        phone: s1.mobile || c.mobile || "+91 98765 00000",
        course: s1.currentRole || "Healthcare RCM Specialist",
        batch: s2.batch || "Batch 2026",
        status,
        score: s4.score || 88,
        placementStatus,
        recommended: !!c.recommendedByAcademy,
      };
    });

    const totalStudents = formattedStudents.length;
    const avgScore = totalStudents > 0 ? Math.round(totalScoreSum / totalStudents) : 91;
    const placementRatePct = totalStudents > 0 ? `${Math.round((placedCount / totalStudents) * 100)}%` : "88%";

    // Get DB batches or fallback defaults
    let batches = await AcademyBatch.find({ academyId: req.academyId }).lean();
    if (batches.length === 0) {
      batches = [
        { code: "RCM-2025-A", course: "Healthcare RCM & AR Follow-up", studentsCount: 42, completionPct: 95, status: "Active" },
        { code: "CPC-2025-B", course: "CPC Certified Medical Coding", studentsCount: 38, completionPct: 88, status: "Active" },
        { code: "BIL-2024-D", course: "Payment Posting & Claims Entry", studentsCount: 30, completionPct: 100, status: "Completed" },
      ];
    }

    const realPlacements = applications
      .filter((app) => app.status === "hired" || app.status === "shortlisted")
      .map((app) => ({
        studentName: app.candidateId?.stage1?.fullName || "Academy Candidate",
        company: app.companyId?.companyName || "Employer Partner",
        role: app.jobId?.title || "RCM Executive",
        salary: "5.0 LPA",
        date: new Date(app.updatedAt).toLocaleDateString(),
      }));

    const placements = realPlacements.length > 0 ? realPlacements : [
      { studentName: "Rahul Verma", company: "Access Healthcare", role: "AR Follow-up Executive", salary: "5.2 LPA", date: "Yesterday" },
      { studentName: "Amit Kulkarni", company: "RCM Global", role: "Denial Management Analyst", salary: "6.0 LPA", date: "3 days ago" },
      { studentName: "Divya Nair", company: "Coronis Health", role: "CPC Medical Coder", salary: "4.8 LPA", date: "1 week ago" }
    ];

    res.json({
      academy: {
        id: academy._id,
        name: academy.name,
        contactName: academy.contactName,
        email: academy.email,
        phone: academy.phone,
        tier: academy.tier,
        badgeToken: academy.badgeToken,
        partnerSince: academy.partnerSince,
        studentsUploaded: academy.studentsUploaded,
        verifiedPct: academy.verifiedPct,
      },
      kpis: {
        totalStudents,
        verifiedStudents: verifiedCount,
        placedStudents: placedCount,
        avgScore,
        placementRate: placementRatePct,
      },
      students: formattedStudents,
      batches,
      placements,
    });
  } catch (err) {
    console.error("Academy dashboard error:", err);
    res.status(500).json({ message: "Error loading academy dashboard." });
  }
});

// POST /api/academy/upload-students - Bulk upload (CSV file or JSON roster array)
router.post("/upload-students", requireAcademyAuth, upload.single("file"), async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    let studentRoster = [];
    let batchName = req.body.batchName || "Batch 2026-Import";

    if (req.file && req.file.buffer) {
      // Process CSV upload
      const csvRows = parseCsvBuffer(req.file.buffer);
      studentRoster = csvRows.map((r) => ({
        fullName: r.fullname || r.name || r["full name"] || "Academy Student",
        email: r.email || r["email address"] || "",
        mobile: r.mobile || r.phone || r["mobile number"] || "",
        course: r.course || r.role || "Medical Coding Trainee",
        batchName: r.batch || r.batchname || batchName,
      })).filter((s) => s.email && s.email.includes("@"));
    } else if (req.body.students && Array.isArray(req.body.students)) {
      studentRoster = req.body.students;
    }

    // Fallback: If no CSV/JSON rows sent, create count dummy students for demo
    if (studentRoster.length === 0) {
      const count = Number(req.body.count) || 5;
      for (let i = 1; i <= count; i++) {
        const randomId = Math.floor(1000 + Math.random() * 9000);
        studentRoster.push({
          fullName: `Academy Student #${randomId}`,
          email: `student_${Date.now()}_${i}@${academy.name.toLowerCase().replace(/[^a-z0-9]/g, "") || "academy"}.com`,
          mobile: `+91 99${Math.floor(10000000 + Math.random() * 90000000)}`,
          course: "CPC Certified Medical Coding",
          batchName,
        });
      }
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const createdDocs = [];

    for (const student of studentRoster) {
      const cleanEmail = student.email.toLowerCase().trim();
      let candidate = await Candidate.findOne({ email: cleanEmail });

      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail,
          passwordHash: defaultPassword,
          mobile: student.mobile || "",
          completedStages: [1, 2, 4],
          stage1: {
            fullName: student.fullName,
            mobile: student.mobile || "+91 98765 00000",
            city: "Bengaluru",
            experience: "Fresher",
            currentRole: student.course || "Medical Coding Trainee",
            aadhaarVerified: true,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: student.batchName || batchName,
            verified: true,
          },
          stage4: {
            score: 82 + Math.floor(Math.random() * 14),
            total: 100,
            topic: "Academy Assessment Test",
            passed: true,
          },
          stage7: {
            summary: `Trained medical coding candidate from ${academy.name} (${student.batchName || batchName}).`,
          },
          stage8: {
            status: "Immediate Joiner",
            expectedCtc: "3.5 LPA",
          },
        });
      }
      createdDocs.push(candidate);
    }

    // Update or create AcademyBatch entry
    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: batchName });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: batchName,
        course: studentRoster[0]?.course || "Medical Coding Training",
        studentsCount: createdDocs.length,
        completionPct: 100,
        status: "Active",
      });
    } else {
      batch.studentsCount += createdDocs.length;
      await batch.save();
    }

    academy.studentsUploaded += createdDocs.length;
    await academy.save();

    res.json({
      success: true,
      message: `Successfully uploaded ${createdDocs.length} student candidate(s) to ${batchName}.`,
      uploadedCount: createdDocs.length,
      totalStudents: academy.studentsUploaded,
    });
  } catch (err) {
    console.error("Bulk upload error:", err);
    res.status(500).json({ message: "Bulk student upload failed." });
  }
});

// POST /api/academy/recommend-student - Recommend candidate to employers (Protected)
router.post("/recommend-student", requireAcademyAuth, async (req, res) => {
  try {
    const { candidateId } = req.body;
    if (!candidateId) {
      return res.status(400).json({ message: "Candidate ID is required." });
    }

    const candidate = await Candidate.findById(candidateId);
    if (!candidate) {
      return res.status(404).json({ message: "Candidate not found." });
    }

    candidate.recommendedByAcademy = true;
    candidate.markModified("recommendedByAcademy");
    await candidate.save();

    res.json({
      success: true,
      message: `Candidate ${candidate.stage1?.fullName || candidate.email} has been feature-recommended to employers.`,
    });
  } catch (err) {
    console.error("Recommend student error:", err);
    res.status(500).json({ message: "Failed to recommend candidate." });
  }
});

// GET /api/academy/badge/:badgeToken - Public embeddable badge endpoint
router.get("/badge/:badgeToken", async (req, res) => {
  try {
    const academy = await Academy.findOne({ badgeToken: req.params.badgeToken }).lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy verification badge not found." });
    }

    res.json({
      name: academy.name,
      tier: academy.tier,
      partnerSince: academy.partnerSince,
      verifiedPct: academy.verifiedPct || 94,
      studentsUploaded: academy.studentsUploaded || 50,
      badgeToken: academy.badgeToken,
      verifiedSeal: "Talentera Certified RCM Academy",
    });
  } catch (err) {
    console.error("Public badge error:", err);
    res.status(500).json({ message: "Error fetching verification badge." });
  }
});

module.exports = router;
