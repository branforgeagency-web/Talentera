require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Academy = require("./models/Academy");
const AcademyBatch = require("./models/AcademyBatch");
const Candidate = require("./models/Candidate");

const COIMBATORE_NAMES = [
  "Aravind Swamy", "Bavani Shankar", "Chandran Pillai", "Deepika Raj", "Ezhil Vannan",
  "Gokulnath Selvam", "Harini Venkat", "Iswarya Murugan", "Jayakumar Ram", "Karthik Subramanian",
  "Kavitha Sundaram", "Loganathan Palani", "Manikandan Sethu", "Nithya Shree", "Oviya Kandan",
  "Pradeep Kumar", "Ramya Krishnan", "Sangeetha Mani", "Tamil Selvan", "Uma Maheswari"
];

const CHENNAI_NAMES = [
  "Abhinav Sundar", "Bhavana Menon", "Charan Teja", "Divya Bharati", "Gautham Vasudev",
  "Hema Malini", "Indrajith Roy", "Janani Raman", "Kalyan Varma", "Lakshmi Pillai",
  "Meenakshi Sundaram", "Naveen Chander", "Pavithra Rajan", "Raghava Lawrence", "Sharanya Devi",
  "Siddharth Narayan", "Trisha Krishnan", "Venkatesh Prabhu", "Vijay Sethupathi", "Yashodha Devi"
];

async function seedAcademyBranches() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/talentera";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB for Academy 2-Branch Seeding...");

    // Find or create Academy
    let academy = await Academy.findOne({ $or: [{ email: "aaaa@gmail.com" }, { email: "demo.academy@talentera.in" }] });
    if (!academy) {
      academy = await Academy.create({
        name: "sdfds",
        email: "aaaa@gmail.com",
        contactName: "sdfd",
        primaryAdmin: "sdfd",
        phone: "+91 9765435676",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai"],
        tier: "Verified Partner",
        totalAlumni: "35,000+",
        partnerSince: "Jan 2025",
        studentsUploaded: 40,
        verifiedPct: 94,
      });
    } else {
      academy.branches = ["Coimbatore", "Chennai"];
      academy.studentsUploaded = 40;
      await academy.save();
    }

    // Clean existing test batches & students for this academy to start fresh with 0% progress
    await AcademyBatch.deleteMany({ academyId: academy._id });

    const passwordHash = await bcrypt.hash("Password123", 10);

    // Create Branch 1: Coimbatore Batch (20 Students, 0% Progress)
    await AcademyBatch.create({
      academyId: academy._id,
      code: "COIM-HCC-2026",
      course: "HCC Coding Specialization",
      studentsCount: 20,
      completionPct: 0,
      status: "Active",
    });

    // Create Branch 2: Chennai Batch (20 Students, 0% Progress)
    await AcademyBatch.create({
      academyId: academy._id,
      code: "CHEN-ED-2026",
      course: "ED Coding Foundation",
      studentsCount: 20,
      completionPct: 0,
      status: "Active",
    });

    let totalCreated = 0;

    // Seed 20 Students for Coimbatore (0% progress, completedStages: [])
    for (let i = 0; i < COIMBATORE_NAMES.length; i++) {
      const name = COIMBATORE_NAMES[i];
      const email = `student.coim.${i + 1}@academy.com`;
      await Candidate.deleteOne({ email });

      await Candidate.create({
        email,
        passwordHash,
        mobile: `+91 97654 ${10000 + i}`,
        completedStages: [], // 0% initial progress!
        stage1: {
          fullName: name,
          mobile: `+91 97654 ${10000 + i}`,
          city: "Coimbatore",
          experience: "Fresher",
          currentRole: "HCC Coding Trainee",
          aadhaarVerified: false,
        },
        stage2: {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: "COIM-HCC-2026",
          branch: "Coimbatore",
          verified: false,
        },
        stage4: {
          score: 0,
          total: 100,
          passed: false,
        },
      });
      totalCreated++;
    }

    // Seed 20 Students for Chennai (0% progress, completedStages: [])
    for (let i = 0; i < CHENNAI_NAMES.length; i++) {
      const name = CHENNAI_NAMES[i];
      const email = `student.chen.${i + 1}@academy.com`;
      await Candidate.deleteOne({ email });

      await Candidate.create({
        email,
        passwordHash,
        mobile: `+91 98765 ${20000 + i}`,
        completedStages: [], // 0% initial progress!
        stage1: {
          fullName: name,
          mobile: `+91 98765 ${20000 + i}`,
          city: "Chennai",
          experience: "Fresher",
          currentRole: "ED Coding Trainee",
          aadhaarVerified: false,
        },
        stage2: {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: "CHEN-ED-2026",
          branch: "Chennai",
          verified: false,
        },
        stage4: {
          score: 0,
          total: 100,
          passed: false,
        },
      });
      totalCreated++;
    }

    console.log(`✓ SEEDING COMPLETE! Created 2 Branches (Coimbatore & Chennai) with ${totalCreated} Students at 0% Progress.`);
    await mongoose.disconnect();
  } catch (err) {
    console.error("Seeding Error:", err);
  }
}

seedAcademyBranches();
