/**
 * Finds an account by email in EVERY database on the cluster (candidates + companies).
 *   node scripts/findCandidate.js dharsin0201@gmail.com
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
(async () => {
  const email = String(process.argv[2] || "").toLowerCase().trim();
  if (!email) { console.error("Usage: node scripts/findCandidate.js <email>"); process.exit(1); }
  const conn = await mongoose.createConnection(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 }).asPromise();
  console.log("Connected using database:", conn.name);
  const { databases } = await conn.getClient().db().admin().listDatabases();
  let found = 0;
  for (const d of databases) {
    if (["admin", "local", "config"].includes(d.name)) continue;
    const db = conn.getClient().db(d.name);
    for (const col of ["candidates", "companies"]) {
      const doc = await db.collection(col).findOne({ email: new RegExp(`^${email.replace(/[.+]/g, "\\$&")}$`, "i") }, { projection: { email: 1, candidateType: 1, candidateTypes: 1, completedStages: 1, createdAt: 1, updatedAt: 1 } });
      if (doc) { found++; console.log(`FOUND in database "${d.name}", collection "${col}":`, JSON.stringify(doc)); }
    }
  }
  if (!found) console.log("Not found in any database on this cluster. The live site is probably connected to a different cluster.");
  await conn.close();
})().catch((e) => { console.error(e.message); process.exit(1); });
