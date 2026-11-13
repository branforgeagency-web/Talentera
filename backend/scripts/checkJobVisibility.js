/**
 * Read-only check: which live jobs can a given candidate see in Browse Jobs, and why not?
 *
 *   node scripts/checkJobVisibility.js "Srujana"
 *
 * Uses MONGO_URI from backend/.env. It only reads (no writes) and prints no passwords or emails.
 * Rules mirror routes/candidate.js GET /jobs and the "only my role" narrowing in BrowseJobsSection.jsx.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");

const ROLE_FAMILIES = {
  billing: /billing|biller|charge (entry|capture)|payment posting|claims? (submission|processing)|denial/i,
  ar: /\bar\b|a\/r|accounts? receivable|ar calling|ar follow/i,
  coding: /\bcod(er|ers|ing)\b|hcc|cpc|ccs|icd|cpt|drg|risk adjustment|auditor|e\/m|surgery coding/i,
  eligibility: /eligibility|verification|prior auth|benefits/i,
};
const familiesOf = (t) => Object.keys(ROLE_FAMILIES).filter((k) => ROLE_FAMILIES[k].test(String(t || "")));

(async () => {
  const name = process.argv[2];
  if (!name) { console.log('Usage: node scripts/checkJobVisibility.js "<candidate name>"'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const db = mongoose.connection.db;
  const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const c = await db.collection("candidates").findOne({ "stage1.fullName": new RegExp(esc, "i") });
  if (!c) { console.log("No candidate found for", name); process.exit(1); }
  const experienced = c.candidateType === "experienced" || (!c.candidateType && /exp/i.test(String(c.stage1?.experience || "")));
  const candFams = familiesOf(`${c.stage2?.domain || ""} ${c.stage2?.jobTitle || ""} ${c.stage1?.currentRole || ""}`);
  console.log(`Candidate: ${c.stage1?.fullName} | ${experienced ? "EXPERIENCED" : "FRESHER"} | domain: ${c.stage2?.domain || "-"} | role families: ${candFams.join(",") || "-"} | alerts on: ${c.jobAlertEmails !== false}\n`);

  const posted = await db.collection("jobs").find({ published: true, approvalStatus: { $ne: "rejected" } }).toArray();
  const onboard = await db.collection("companies").find({ jdPublished: true, jobId: { $exists: true, $ne: null }, jdApprovalStatus: { $ne: "rejected" } }).toArray();
  const all = [
    ...posted.map((j) => ({ id: j.jobId, f: j.fields || {}, approval: j.approvalStatus })),
    ...onboard.map((x) => ({ id: x.jobId, f: x.stage9 || {}, approval: x.jdApprovalStatus })),
  ];
  for (const j of all) {
    const lvl = String(j.f.level || "").toLowerCase();
    const expMin = Number(j.f.expmin || 0);
    let serverOk;
    if (experienced) serverOk = lvl.includes("experienced only") || (!lvl && expMin > 0);
    else serverOk = true; // freshers: server keeps everything, the page drops "Experienced only" below
    let pageOk = serverOk;
    let why = "";
    if (!serverOk) why = `server hides it: hiring level is "${j.f.level || "(not set)"}" and the candidate is experienced`;
    if (!experienced && (lvl.includes("experienced only") || (!lvl.includes("fresher") && !lvl.includes("both") && expMin > 0))) { pageOk = false; why = "page hides it: experienced-level job, candidate is a fresher"; }
    if (pageOk && experienced && candFams.length) {
      const jf = familiesOf(`${j.f.roletitle || ""} ${j.f.specialty || ""} ${j.f.department || ""}`);
      if (jf.length && !jf.some((x) => candFams.includes(x))) why = `hidden by "only my role" (job is ${jf.join("/")}); shows after "Show all jobs" / "All openings"`;
    }
    console.log(`${j.id} | ${j.f.roletitle || "(no title)"} | level: ${j.f.level || "(not set)"} | approval: ${j.approval}\n   -> ${pageOk && !why ? "VISIBLE" : why || "VISIBLE"}`);
  }
  await mongoose.disconnect();
})().catch((e) => { console.log("ERR", e.message); process.exit(1); });
