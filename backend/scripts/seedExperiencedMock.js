/**
 * DEV ONLY: fills a complete, published Experienced Career Passport for one candidate account.
 *
 *   node scripts/seedExperiencedMock.js brandforgeagency@gmail.com
 *   node scripts/seedExperiencedMock.js dharsin0201@gmail.com   (existing Fresher account: adds the Experienced profile, keeps the Fresher one)
 *
 * - Uses MONGO_URI from backend/.env. Refuses to run when NODE_ENV=production.
 * - If the account doesn't exist it is created with password "Test@1234" (experienced type).
 * - Uploaded files are placeholder links (https://example.com/mock/...), not real documents.
 * - Overwrites that candidate's passport data. Run again any time to reset it.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Candidate = require("../models/Candidate");
const { fillExperiencedMock } = require("../utils/mockExperienced");

(async () => {
  if (process.env.NODE_ENV === "production") { console.error("Refusing to seed mock data in production."); process.exit(1); }
  const email = String(process.argv[2] || "brandforgeagency@gmail.com").toLowerCase().trim();
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  let c = await Candidate.findOne({ email });
  if (!c) {
    c = new Candidate({ email, passwordHash: await bcrypt.hash("Test@1234", 10), candidateType: "experienced", isVerified: true });
    console.log("Account not found - created with password Test@1234");
  }
  const sc = await fillExperiencedMock(c, email);
  await c.save();
  console.log(`Seeded ${email}: score ${sc.score}/100, stages ${c.completedStages.join(",")}. Log in and open /dashboard/experienced.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e.message); process.exit(1); });
