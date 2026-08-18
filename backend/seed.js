require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Candidate = require("./models/Candidate");
const Company = require("./models/Company");

const REAL_CANDIDATES = [
  {
    email: "ananya.sharma@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: {
      fullName: "Ananya Sharma",
      mobile: "+91 98765 43210",
      city: "Bengaluru",
      experience: "3-5",
      currentRole: "Senior AR Caller",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "Apex Medical Coding Institute",
      batch: "RCM Batch 2025-A",
      verified: true,
    },
    stage3: {
      name: "CPC Certified (AAPC)",
      certId: "CPC-884920",
      verified: true,
    },
    stage4: {
      score: 92,
      total: 100,
      topic: "Healthcare RCM & AR Follow-up",
      passed: true,
    },
    stage5: {
      videoUrl: "/uploads/sample_video.mp4",
      duration: "1m 45s",
      verified: true,
    },
    stage6: {
      liveChartsAudited: 45,
      accuracyScore: 98,
      verified: true,
    },
    stage7: {
      summary: "3.5 years of experience in US Healthcare RCM, specializing in AR follow-up, denial resolution, and claim appeals for multi-specialty practices.",
    },
    stage8: {
      status: "Immediate Joiner",
      expectedCtc: "5.5 LPA",
    },
    resumeTemplate: "classic",
  },
  {
    email: "rajesh.kumar@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 4, 5, 6, 7, 8],
    stage1: {
      fullName: "Rajesh Kumar",
      mobile: "+91 98123 45678",
      city: "Hyderabad",
      experience: "1-3",
      currentRole: "Medical Coder",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "MedCode Academy",
      batch: "Batch 2025-B",
      verified: true,
    },
    stage3: { skipped: true },
    stage4: {
      score: 85,
      total: 100,
      topic: "ICD-10-CM & CPT Outpatient Coding",
      passed: true,
    },
    stage5: {
      videoUrl: "/uploads/sample_video2.mp4",
      duration: "1m 20s",
      verified: true,
    },
    stage6: {
      liveChartsAudited: 30,
      accuracyScore: 94,
      verified: true,
    },
    stage7: {
      summary: "2 years in outpatient medical coding and chart auditing with high compliance and low error rates.",
    },
    stage8: {
      status: "15 Days Notice",
      expectedCtc: "4.5 LPA",
    },
    resumeTemplate: "modern",
  },
  {
    email: "priya.nair@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: {
      fullName: "Priya Nair",
      mobile: "+91 97654 32109",
      city: "Chennai",
      experience: "5+",
      currentRole: "Denial Management Lead",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "National Health Training Inst.",
      batch: "Senior RCM 2024",
      verified: true,
    },
    stage3: {
      name: "CCS-P Certified (AHIMA)",
      certId: "CCS-339102",
      verified: true,
    },
    stage4: {
      score: 96,
      total: 100,
      topic: "Denials & Appeals Mastery",
      passed: true,
    },
    stage5: {
      videoUrl: "/uploads/sample_video3.mp4",
      duration: "2m 00s",
      verified: true,
    },
    stage6: {
      liveChartsAudited: 60,
      accuracyScore: 99,
      verified: true,
    },
    stage7: {
      summary: "5+ years resolving complex medical claim denial trends and leading high-volume AR recovery teams.",
    },
    stage8: {
      status: "Immediate Joiner",
      expectedCtc: "7.5 LPA",
    },
    resumeTemplate: "classic",
  },
  {
    email: "vikram.singh@talentera.com",
    password: "Password123",
    completedStages: [1, 4, 5, 6, 7, 8],
    stage1: {
      fullName: "Vikram Singh",
      mobile: "+91 99887 76655",
      city: "Delhi NCR",
      experience: "Fresher",
      currentRole: "Trainee AR Executive",
      aadhaarVerified: true,
    },
    stage2: { skipped: true },
    stage3: { skipped: true },
    stage4: {
      score: 78,
      total: 100,
      topic: "Basic RCM & Billing Fundamentals",
      passed: true,
    },
    stage5: {
      videoUrl: "/uploads/sample_video4.mp4",
      duration: "1m 10s",
      verified: true,
    },
    stage6: {
      liveChartsAudited: 20,
      accuracyScore: 90,
      verified: true,
    },
    stage7: {
      summary: "Enthusiastic RCM fresher trained in healthcare billing terms and entry-level claims processing.",
    },
    stage8: {
      status: "Immediate Joiner",
      expectedCtc: "3.2 LPA",
    },
    resumeTemplate: "minimal",
  },
  {
    email: "kavita.reddy@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 3, 4, 5, 6, 7, 8],
    stage1: {
      fullName: "Kavita Reddy",
      mobile: "+91 98440 11223",
      city: "Bengaluru",
      experience: "3-5",
      currentRole: "Payment Posting Specialist",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "Apex Medical Coding Institute",
      batch: "RCM Batch 2025-A",
      verified: true,
    },
    stage3: {
      name: "CRCS Certified (AAHAM)",
      certId: "CRCS-55102",
      verified: true,
    },
    stage4: {
      score: 88,
      total: 100,
      topic: "EOB & Electronic Payment Posting",
      passed: true,
    },
    stage5: {
      videoUrl: "/uploads/sample_video5.mp4",
      duration: "1m 30s",
      verified: true,
    },
    stage6: {
      liveChartsAudited: 50,
      accuracyScore: 96,
      verified: true,
    },
    stage7: {
      summary: "4 years of hands-on experience handling manual and electronic ERA/EOB payment posting and reconciliation.",
    },
    stage8: {
      status: "1 Month Notice",
      expectedCtc: "5.2 LPA",
    },
    resumeTemplate: "modern",
  },
  {
    email: "sanjay.mehta@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 3, 4],
    stage1: {
      fullName: "Sanjay Mehta",
      mobile: "+91 98111 22334",
      city: "Hyderabad",
      experience: "1-3",
      currentRole: "Junior Medical Coder",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "Apex Medical Coding Institute",
      batch: "Batch 2025-A",
      verified: true,
    },
    stage3: {
      name: "CPC Certified (AAPC)",
      certId: "CPC-992104",
      verified: true,
    },
    stage4: {
      score: 94,
      total: 100,
      topic: "Evaluation & Management Coding",
      passed: true,
    },
    stage5: null,
    stage6: null,
    stage7: {
      summary: "Certified junior coder seeking opportunities in E/M and Surgery specialty coding.",
    },
    stage8: {
      status: "Immediate Joiner",
      expectedCtc: "4.0 LPA",
    },
    resumeTemplate: "classic",
  },
  {
    email: "pooja.hegde@talentera.com",
    password: "Password123",
    completedStages: [1, 2, 4],
    stage1: {
      fullName: "Pooja Hegde",
      mobile: "+91 98222 33445",
      city: "Mumbai",
      experience: "1-3",
      currentRole: "RCM Billing Executive",
      aadhaarVerified: true,
    },
    stage2: {
      academyName: "MedCode Academy",
      batch: "Batch 2025-B",
      verified: true,
    },
    stage3: { skipped: true },
    stage4: {
      score: 88,
      total: 100,
      topic: "Medical Billing & Claims",
      passed: true,
    },
    stage5: null,
    stage6: null,
    stage7: {
      summary: "Medical billing executive skilled in claim submissions and eligibility verification.",
    },
    stage8: {
      status: "15 Days Notice",
      expectedCtc: "4.2 LPA",
    },
    resumeTemplate: "modern",
  }
];

const REAL_COMPANIES = [
  {
    email: "hiring@optum.co.in",
    password: "Password123",
    contactName: "Siddharth Rao",
    companyName: "Optum India",
    mobile: "+91 98765 00111",
    completedStages: ["1a", "1b", "2", "3", "9"],
    stage1a: { companyLegalName: "Optum Health India Pvt Ltd", city: "Hyderabad" },
    stage1b: { contactPerson: "Siddharth Rao", email: "hiring@optum.co.in" },
    stage2: { companySize: "10000+", industry: "Healthcare RCM & Analytics" },
    stage9: {
      roletitle: "Senior AR Follow-up Specialist",
      specialty: "AR Calling / Denial Management",
      level: "Mid-Senior",
      expmin: 3,
      expmax: 5,
      shift: "US Shift (Night)",
      languages: ["English"],
      location: "Hyderabad",
      workmode: "Onsite",
      compmin: 5.5,
      compmax: 7.5,
      openings: 12,
      urgency: "Immediate",
      hiringmanager: "Siddharth Rao",
    },
    jdPublished: true,
    jobId: "TLT-2026-9012",
    jdPublishedAt: new Date(),
  },
  {
    email: "careers@accesshealthcare.com",
    password: "Password123",
    contactName: "Deepika Raman",
    companyName: "Access Healthcare",
    mobile: "+91 98888 11223",
    completedStages: ["1a", "1b", "2", "9"],
    stage1a: { companyLegalName: "Access Healthcare Services", city: "Chennai" },
    stage1b: { contactPerson: "Deepika Raman", email: "careers@accesshealthcare.com" },
    stage2: { companySize: "5000-10000", industry: "Medical Coding & Revenue Cycle" },
    stage9: {
      roletitle: "Certified Medical Coder (CPC)",
      specialty: "Outpatient / ED Coding",
      level: "Junior-Mid",
      expmin: 1,
      expmax: 3,
      shift: "General / Rotational",
      languages: ["English"],
      location: "Chennai",
      workmode: "Hybrid",
      compmin: 4.8,
      compmax: 6.5,
      openings: 8,
      urgency: "Urgent",
      hiringmanager: "Deepika Raman",
    },
    jdPublished: true,
    jobId: "TLT-2026-4410",
    jdPublishedAt: new Date(),
  }
];

async function seedDB() {
  try {
    const mongoUri = process.env.MONGO_URI || "mongodb://localhost:27017/talentera";
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB for seeding...");

    // Seed Candidates
    let seededCandidatesCount = 0;
    for (const candData of REAL_CANDIDATES) {
      const existing = await Candidate.findOne({ email: candData.email });
      if (!existing) {
        const passwordHash = await bcrypt.hash(candData.password, 10);
        const { password, ...cProps } = candData;
        await Candidate.create({
          ...cProps,
          passwordHash,
        });
        seededCandidatesCount++;
      }
    }
    console.log(`Seeded ${seededCandidatesCount} new Candidate records.`);

    // Seed Companies
    let seededCompaniesCount = 0;
    for (const compData of REAL_COMPANIES) {
      const existing = await Company.findOne({ email: compData.email });
      if (!existing) {
        const passwordHash = await bcrypt.hash(compData.password, 10);
        const { password, ...coProps } = compData;
        await Company.create({
          ...coProps,
          passwordHash,
        });
        seededCompaniesCount++;
      }
    }
    console.log(`Seeded ${seededCompaniesCount} new Company records.`);

    console.log("Seeding completed successfully!");
  } catch (err) {
    console.error("Seeding error:", err);
  } finally {
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

seedDB();
