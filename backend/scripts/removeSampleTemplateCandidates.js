/**
 * One-time cleanup script: removes the downloadable CSV template's own sample rows
 * (Priya Subramanian, Karthik Raja, Ananya Roy - all @example.com) from the live
 * database, in case any of them were ever uploaded and confirmed as if they were
 * real students. Left in place, those rows sit in the system as if they were real
 * candidates, and any future upload of the exact same sample data will be flagged
 * as "already registered" instead of the actual duplicate-detection this is meant
 * for.
 *
 * Why this runs from your machine and not something Claude ran for you: Claude's
 * cloud sandbox (and this device's own shell) can't reach your MongoDB Atlas
 * cluster - it's not in either environment's network allowlist. This has to run
 * from wherever your backend itself normally connects from (your dev machine, or
 * your server).
 *
 * Usage (from the backend/ folder):
 *   node scripts/removeSampleTemplateCandidates.js            # dry run - lists what it would remove
 *   node scripts/removeSampleTemplateCandidates.js --confirm  # actually deletes
 *
 * Requires MONGO_URI to already be set in backend/.env (same as the running server).
 * Safe to re-run - if nothing matches, it just reports 0 found and exits.
 */
require("dotenv").config();
const mongoose = require("mongoose");
const Candidate = require("../models/Candidate");
const StudentInvite = require("../models/StudentInvite");
const RetakeRequest = require("../models/RetakeRequest");

// The exact placeholder rows baked into the sample template
// (frontend/src/components/academy/UploadAndInvitesEngine.jsx, downloadCsvTemplate).
const SAMPLE_EMAILS = ["priya.s@example.com", "karthik.r@example.com", "ananya.r@example.com"];
// Broader net: catches any other row that still used the reserved "example.com"
// placeholder domain, even if it's not one of the three named sample rows above.
const SAMPLE_EMAIL_PATTERN = /@example\.com$/i;

const CONFIRM = process.argv.includes("--confirm");

async function main() {
  if (!process.env.MONGO_URI) {
    console.error("MONGO_URI is not set in backend/.env - can't connect.");
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log(`Connected. Mode: ${CONFIRM ? "DELETE (--confirm passed)" : "DRY RUN (pass --confirm to actually delete)"}\n`);

  const emailQuery = { $or: [{ email: { $in: SAMPLE_EMAILS } }, { email: SAMPLE_EMAIL_PATTERN }] };

  const candidates = await Candidate.find(emailQuery, { email: 1, "stage1.fullName": 1, createdAt: 1 }).lean();
  console.log(`Candidate records matching sample template data: ${candidates.length}`);
  candidates.forEach((c) => console.log(`  - ${c.email}  (${c.stage1?.fullName || "no name"})  created ${c.createdAt}`));

  const inviteQuery = { $or: [{ email: { $in: SAMPLE_EMAILS } }, { email: SAMPLE_EMAIL_PATTERN }] };
  const invites = await StudentInvite.find(inviteQuery, { email: 1, name: 1, createdAt: 1 }).lean();
  console.log(`\nStudentInvite records matching sample template data: ${invites.length}`);
  invites.forEach((i) => console.log(`  - ${i.email}  (${i.name || "no name"})  created ${i.createdAt}`));

  const retakeQuery = { $or: [{ candidateEmail: { $in: SAMPLE_EMAILS } }, { candidateEmail: SAMPLE_EMAIL_PATTERN }] };
  const retakes = await RetakeRequest.find(retakeQuery, { candidateEmail: 1, candidateName: 1 }).lean();
  console.log(`\nRetakeRequest records matching sample template data: ${retakes.length}`);
  retakes.forEach((r) => console.log(`  - ${r.candidateEmail}  (${r.candidateName || "no name"})`));

  if (CONFIRM) {
    const candIds = candidates.map((c) => c._id);
    const candResult = await Candidate.deleteMany(emailQuery);
    const inviteResult = await StudentInvite.deleteMany(inviteQuery);
    const retakeResult = await RetakeRequest.deleteMany(retakeQuery);
    console.log(`\nDeleted: ${candResult.deletedCount} candidates, ${inviteResult.deletedCount} invites, ${retakeResult.deletedCount} retake requests.`);
    void candIds; // (kept for reference if you want to extend this to cascade-clean other collections keyed by candidateId)
  } else {
    console.log("\nNothing deleted (dry run). Re-run with --confirm to remove the rows listed above.");
  }

  await mongoose.disconnect();
}

main().catch((err) => {
  console.error("Cleanup script failed:", err.message);
  process.exit(1);
});
