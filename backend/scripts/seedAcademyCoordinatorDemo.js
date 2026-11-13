/**
 * DEV ONLY: demo data for the Branch Placement Coordinator workflow.
 *
 *   node scripts/seedAcademyCoordinatorDemo.js
 *
 * Creates (or resets):
 *   Academy Head   head.demo@talentera.test        / Head@1234
 *   Hyderabad coordinator (active)  coord.hyd@talentera.test / Coord@1234
 *   Warangal  coordinator (active)  coord.wgl@talentera.test / Coord@1234
 *   Warangal  coordinator (INVITED, not activated) coord.new@talentera.test  -> prints its activation link
 *   4 demo candidates in Hyderabad, 3 in Warangal.
 * Log in as each coordinator and confirm: no KYC section, only that branch's candidates.
 * Uses MONGO_URI from backend/.env. Refuses to run when NODE_ENV=production.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const AcademyCoordinator = require("../models/AcademyCoordinator");
const Candidate = require("../models/Candidate");

(async () => {
  if (process.env.NODE_ENV === "production") { console.error("Refusing to seed demo data in production."); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  const hash = (p) => bcrypt.hash(p, 10);

  const branches = [
    { name: "Dilsukhnagar Branch", city: "Hyderabad", state: "Telangana", phone: "9000000001", address: "Flat 109, C.B. Eastern Homes, Dilsukhnagar", coordinatorName: "Ravi Kumar", coordinatorDesignation: "Placement Coordinator", coordinatorEmail: "coord.hyd@talentera.test", coordinatorMobile: "9876500001" },
    { name: "Warangal Branch", city: "Warangal", state: "Telangana", phone: "9000000002", address: "Hanamkonda, Warangal", coordinatorName: "Sneha Reddy", coordinatorDesignation: "Placement Coordinator", coordinatorEmail: "coord.wgl@talentera.test", coordinatorMobile: "9876500002" },
  ];

  let academy = await Academy.findOne({ email: "head.demo@talentera.test" });
  if (!academy) academy = new Academy({ email: "head.demo@talentera.test", name: "Demo Medical Coding Academy" });
  academy.name = "Demo Medical Coding Academy";
  academy.contactName = "Academy Head Demo";
  academy.passwordHash = await hash("Head@1234");
  academy.isVerified = true;
  academy.kycStatus = "verified"; // Head has finished registration + KYC
  academy.kycSubmittedAt = academy.kycSubmittedAt || new Date();
  academy.kycData = { ...(academy.kycData || {}), branches };
  academy.markModified("kycData");
  await academy.save();

  const mk = async (b, email, status) => {
    let c = await AcademyCoordinator.findOne({ email });
    if (!c) c = new AcademyCoordinator({ email, academyId: academy._id });
    Object.assign(c, {
      academyId: academy._id, branchName: b.name, branchCity: b.city, branchState: b.state, branchPhone: b.phone, branchAddress: b.address,
      name: b.coordinatorName, designation: b.coordinatorDesignation, mobile: b.coordinatorMobile, role: "branch_coordinator", status,
    });
    if (status === "active") { c.passwordHash = await hash("Coord@1234"); c.activatedAt = new Date(); c.inviteToken = null; c.inviteExpires = null; }
    else { c.passwordHash = null; c.inviteToken = crypto.randomBytes(24).toString("hex"); c.inviteExpires = new Date(Date.now() + 7 * 864e5); }
    await c.save();
    return c;
  };
  const pendingHyd = await mk(branches[0], "coord.hyd@talentera.test", "invited"); // tester activates this one
  await mk(branches[1], "coord.wgl@talentera.test", "active");
  const pendingNew = await mk({ ...branches[1], coordinatorName: "Arun Teja", coordinatorMobile: "9876500003" }, "coord.new@talentera.test", "invited");

  for (const [code, branch] of [["HYD-DEMO-01", "Dilsukhnagar Branch"], ["WGL-DEMO-01", "Warangal Branch"]]) {
    await AcademyBatch.findOneAndUpdate(
      { academyId: academy._id, code },
      { academyId: academy._id, code, course: "Medical Coding", branch, status: "Active", studentsCount: 4 },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const people = [
    ["hyd1", "Anil Sharma", "Hyderabad", "Dilsukhnagar Branch", "HYD-DEMO-01"], ["hyd2", "Priya Nair", "Hyderabad", "Dilsukhnagar Branch", "HYD-DEMO-01"],
    ["hyd3", "Kiran Rao", "Hyderabad", "Dilsukhnagar Branch", "HYD-DEMO-01"], ["hyd4", "Meena Iyer", "Hyderabad", "Dilsukhnagar Branch", "HYD-DEMO-01"],
    ["wgl1", "Suresh Babu", "Warangal", "Warangal Branch", "WGL-DEMO-01"], ["wgl2", "Lavanya K", "Warangal", "Warangal Branch", "WGL-DEMO-01"],
    ["wgl3", "Naveen P", "Warangal", "Warangal Branch", "WGL-DEMO-01"],
  ];
  const pw = await hash("Test@1234");
  for (const [key, name, city, branch, batch] of people) {
    const email = `demo.${key}@talentera.test`;
    await Candidate.findOneAndUpdate(
      { email },
      { $set: { email, passwordHash: pw, isVerified: true, candidateType: "fresher", stage1: { fullName: name, city, mobile: "98000" + key.slice(-1).padStart(5, "0") }, stage2: { academyId: String(academy._id), branch, batch, course: "Medical Coding" } } },
      { upsert: true, setDefaultsOnInsert: true }
    );
  }

  const base = process.env.FRONTEND_URL || "http://localhost:5173";
  console.log("\nDemo ready (Academy KYC already verified, 2 branches, 7 candidates).");
  console.log("  Head:  head.demo@talentera.test / Head@1234  (sees all 7 + KYC)");
  console.log("  Warangal coordinator (already active): coord.wgl@talentera.test / Coord@1234  (should see 3, no KYC)");
  console.log("  Hyderabad coordinator is INVITED - activate it with this link, set a password, then log in (should see 4, no KYC):");
  console.log(`  ${base}/academy/coordinator/activate?token=${pendingHyd.inviteToken}`);
  console.log("  Extra pending invite (Warangal): " + `${base}/academy/coordinator/activate?token=${pendingNew.inviteToken}\n`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
