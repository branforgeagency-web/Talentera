require("dotenv").config();
const mongoose = require("mongoose");
const Academy = require("./models/Academy");
const AcademyBatch = require("./models/AcademyBatch");
const Candidate = require("./models/Candidate");

async function resetAcademyData() {
  try {
    const mongoUri = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/talentera";
    await mongoose.connect(mongoUri);
    console.log("✓ Connected to MongoDB for Academy Reset...");

    // Clear all Academy batches
    const deletedBatches = await AcademyBatch.deleteMany({});
    console.log(`✓ Deleted ${deletedBatches.deletedCount} batches.`);

    // Clear candidate students linked to academy
    const deletedStudents = await Candidate.deleteMany({
      $or: [
        { "stage2.academyId": { $exists: true } },
        { "stage2.academyName": { $exists: true } },
        { email: { $regex: /@academy\.com$/i } },
      ],
    });
    console.log(`✓ Deleted ${deletedStudents.deletedCount} candidate student profiles.`);

    // Reset studentsUploaded count on Academy profiles
    await Academy.updateMany({}, { studentsUploaded: 0, verifiedPct: 0 });
    console.log("✓ Reset Academy profile counters to 0.");

    await mongoose.disconnect();
    console.log("✓ ALL BATCHES AND STUDENT DATA REMOVED. DASHBOARD IS NOW CLEAN & EMPTY.");
  } catch (err) {
    console.error("Reset error:", err);
  }
}

resetAcademyData();
