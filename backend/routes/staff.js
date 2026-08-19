const express = require("express");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Notification = require("../models/Notification");

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
    const companies = await Company.find().lean();
    const totalCandidates = candidates.length;

    // Filter candidate pending vs fully verified
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

    // Company Account & KYC queue
    const companyKycQueue = companies.map((comp) => {
      const s1a = comp.stage1a || {};
      const s1b = comp.stage1b || {};
      const s2 = comp.stage2 || {};

      const rawDocs = [
        { id: "kycgst", label: "GST Certificate", val: s1a.kycgst },
        { id: "kycpan", label: "PAN Card", val: s1a.kycpan },
        { id: "kycincorp", label: "Certificate of Incorporation", val: s1a.kycincorp },
        { id: "kyccheque", label: "Cancelled Cheque", val: s1a.kyccheque },
        { id: "msme", label: "MSME Certificate", val: s1a.msme },
        { id: "logosquare", label: "Company Logo", val: s2.logosquare },
      ];

      const docVerifications = comp.docVerifications || {};

      const docs = rawDocs.map((d) => {
        let docUrl = null;
        let docName = null;
        if (d.val) {
          if (typeof d.val === "string") {
            docUrl = d.val;
            docName = d.label;
          } else if (typeof d.val === "object") {
            docUrl = d.val.docUrl || d.val.url || d.val.fileUrl || null;
            docName = d.val.docName || d.val.name || d.label;
          }
        }
        const vState = docVerifications[d.id] || null;
        return {
          id: d.id,
          label: d.label,
          docUrl,
          docName,
          uploaded: Boolean(docUrl),
          isValid: vState ? Boolean(vState.isValid) : null,
          verificationNote: vState ? vState.note : "",
        };
      });

      return {
        id: comp._id,
        companyName: comp.companyName || s1a.legalname || "Unnamed Company",
        contactName: comp.contactName || s1b.pocname || "N/A",
        email: comp.email,
        mobile: comp.mobile || s1b.pocmobile || "N/A",
        legalName: s1a.legalname || "Not provided",
        gstin: s1a.gstin || "Not provided",
        pan: s1a.pan || "Not provided",
        entity: s1a.entity || "Not specified",
        signatory: s1a.signatory || "Not specified",
        docs,
        kycGst: s1a.kycgst || null,
        kycPan: s1a.kycpan || null,
        kycIncorp: s1a.kycincorp || null,
        kycStatus: comp.kycStatus || "pending",
        kycSubmittedAt: comp.kycSubmittedAt || null,
        kycRejectionReason: comp.kycRejectionReason || "",
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
      liveQueueCount: incomingBucket.length + companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
      stats: {
        pendingVerifications: incomingBucket.length + companyKycQueue.filter((c) => c.kycStatus === "under_review").length,
        verifiedToday: 42 + fullyVerified.length + companyKycQueue.filter((c) => c.kycStatus === "verified").length,
        activeCandidates: totalCandidates,
        placedThisMonth: 86,
        pendingCompanyKycs: companyKycQueue.filter((c) => c.kycStatus === "under_review" || c.kycStatus === "pending").length,
        verifiedCompanies: companyKycQueue.filter((c) => c.kycStatus === "verified").length,
      },
      pipeline,
      incomingBucket,
      companyKycQueue,
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

// Helper to dispatch audit result email to company POC
async function sendKycAuditEmail({ to, companyName, action, notes, rejectionReason, rejectedFields }) {
  console.log("==================================================================");
  console.log(`📧 [AUDIT EMAIL DISPATCHED TO: ${to}]`);
  if (action === "verify") {
    console.log(`SUBJECT: [Talentera] Account & KYC Verification Approved — Gold Trust Badge Active! 🟢`);
    console.log(
      `BODY:\nDear ${companyName} Hiring Team,\n\nWe are pleased to inform you that your Account & KYC Verification details have been audited and APPROVED by Talentera Staff.\n\nAudit Notes: ${notes || "Verified by Staff Auditor"}\nStatus: VERIFIED ✓ (Gold Trust Badge Active)\n\nYou can now post live JDs and contact verified candidates directly.\n\nBest regards,\nTalentera Verification Audit Team`
    );
  } else {
    console.log(`SUBJECT: [Talentera] Action Required: Account & KYC Verification Revision Requested 🔴`);
    console.log(
      `BODY:\nDear ${companyName} Hiring Team,\n\nOur Staff Auditors reviewed your Account & KYC submission and noted that revision is required before approval.\n\nReason / Audit Notes: ${rejectionReason || notes || "Document revision required"}\nAffected Document(s): ${rejectedFields ? rejectedFields.join(", ") : "KYC Certificates"}\n\nPlease log in to your Company Dashboard to re-upload the requested documents.\n\nBest regards,\nTalentera Verification Audit Team`
    );
  }
  console.log("==================================================================");
}

// POST /api/staff/verify-company - Perform company Account & KYC verification action
router.post("/verify-company", async (req, res) => {
  try {
    const { companyId, action, notes, rejectionReason } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    if (action === "verify") {
      company.kycStatus = "verified";
      company.kycVerifiedAt = new Date();
      company.kycNotes = notes || "Account & KYC documents audited and verified by Staff Auditor.";
      company.kycRejectionReason = "";
      company.rejectedKycFields = [];
      if (!company.completedStages.includes("1a")) {
        company.completedStages.push("1a");
      }
    } else if (action === "reject") {
      company.kycStatus = "rejected";
      company.kycRejectionReason = rejectionReason || "Account & KYC documents require revision. Please verify GSTIN/PAN details.";
      company.kycNotes = notes || "";

      // Gather invalid doc keys
      const dVer = company.docVerifications || {};
      const invalidKeys = Object.keys(dVer).filter((key) => dVer[key] && dVer[key].isValid === false);
      company.rejectedKycFields = invalidKeys.length > 0 ? invalidKeys : ["kycgst", "kycpan"];
    }

    await company.save();

    // Dispatch email notification to company email POC
    await sendKycAuditEmail({
      to: company.email,
      companyName: company.companyName || "Employer",
      action,
      notes: company.kycNotes,
      rejectionReason: company.kycRejectionReason,
      rejectedFields: company.rejectedKycFields,
    });

    // Create In-App Notification for Company
    await Notification.create({
      recipientType: "company",
      recipientId: String(company._id),
      title: action === "verify" ? "Account & KYC Verification Approved 🟢" : "KYC Verification Revision Requested 🔴",
      message:
        action === "verify"
          ? "Your Account & KYC details have been verified by Staff Auditor. Gold Trust Badge is now active!"
          : `Revision required for your KYC submission: ${company.kycRejectionReason}`,
      type: action === "verify" ? "kyc_approved" : "kyc_revision",
      meta: { action, companyId: String(company._id) },
    });

    res.json({
      message: `Company ${company.companyName || "account"} successfully ${action === "verify" ? "Verified & KYC Approved" : "Marked for Revision"}. Notification email sent to ${company.email}.`,
      company,
      emailSent: true,
      emailRecipient: company.email,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Company verification action failed." });
  }
});

// GET /api/staff/notifications - Fetch staff notifications
router.get("/notifications", async (req, res) => {
  try {
    const notifications = await Notification.find({ recipientType: "staff" })
      .sort({ createdAt: -1 })
      .limit(30);

    const unreadCount = notifications.filter((n) => !n.read).length;
    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to fetch staff notifications." });
  }
});

// POST /api/staff/notifications/mark-read - Mark staff notifications as read
router.post("/notifications/mark-read", async (req, res) => {
  try {
    await Notification.updateMany({ recipientType: "staff", read: false }, { $set: { read: true } });
    res.json({ message: "Staff notifications marked as read." });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to mark staff notifications as read." });
  }
});

// POST /api/staff/verify-document - Mark individual document image as valid or invalid by employee auditor
router.post("/verify-document", async (req, res) => {
  try {
    const { companyId, docId, isValid, note } = req.body;
    const company = await Company.findById(companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });

    const current = company.docVerifications || {};
    current[docId] = {
      isValid: Boolean(isValid),
      verifiedAt: new Date(),
      note: note || (isValid ? "Uploaded document image verified as valid." : "Uploaded document image is invalid or unreadable."),
    };

    const rejectedList = new Set(company.rejectedKycFields || []);
    if (!isValid) {
      rejectedList.add(docId);
    } else {
      rejectedList.delete(docId);
    }
    company.rejectedKycFields = Array.from(rejectedList);

    company.docVerifications = current;
    company.markModified("docVerifications");
    await company.save();

    res.json({
      message: `Document (${docId}) image marked as ${isValid ? "VALID ✓" : "INVALID ❌"}.`,
      company,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Document image verification failed." });
  }
});

module.exports = router;
