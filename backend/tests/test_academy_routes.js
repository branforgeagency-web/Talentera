const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const http = require("http");

async function testAcademyFlow() {
  console.log("--- Testing Academy OS Backend Routes ---");
  await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/talentera");
  
  const Academy = mongoose.models.Academy || mongoose.model("Academy", new mongoose.Schema({ name: String, email: String, primaryAdmin: String }));
  let academy = await Academy.findOne({ email: "admin@apexacademy.in" });
  if (!academy) {
    academy = await Academy.create({ name: "Apex Healthcare Academy", email: "admin@apexacademy.in", primaryAdmin: "Dr. Rajesh Kumar" });
  }

  const token = jwt.sign({ academyId: academy._id }, process.env.JWT_SECRET || "talentera_jwt_secret_dev_key_2026", { expiresIn: "1d" });

  const makeReq = (path, method = "GET", body = null) => new Promise((resolve, reject) => {
    const req = http.request({
      hostname: "localhost",
      port: 5000,
      path: "/api/academy" + path,
      method,
      headers: {
        "Authorization": "Bearer " + token,
        "Content-Type": "application/json",
      },
    }, (res) => {
      let data = "";
      res.on("data", chunk => data += chunk);
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(data || "{}") });
        } catch(e) {
          resolve({ status: res.statusCode, raw: data });
        }
      });
    });
    req.on("error", reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });

  const endpoints = [
    { name: "Dashboard Data", path: "/dashboard", method: "GET" },
    { name: "Stuck Students Queue", path: "/stuck-students", method: "GET" },
    { name: "Approvals Queue", path: "/approvals", method: "GET" },
    { name: "Invites List", path: "/invites", method: "GET" },
    { name: "Activity Log", path: "/activity", method: "GET" },
    { name: "Interviews Kanban", path: "/interviews/kanban", method: "GET" },
    { name: "Interview Heatmap", path: "/interviews/heatmap", method: "GET" },
    { name: "Placements Confirmations", path: "/placements/confirmations", method: "GET" },
    { name: "Monthly Report", path: "/reports/monthly", method: "GET" },
    { name: "Simulate Activity Event", path: "/activity/simulate", method: "POST", body: {} },
    { name: "Bulk Nudge Students", path: "/students/bulk-nudge", method: "POST", body: { channel: "whatsapp" } },
  ];

  let successCount = 0;
  for (const ep of endpoints) {
    try {
      const res = await makeReq(ep.path, ep.method, ep.body);
      if (res.status >= 200 && res.status < 300) {
        console.log(`[PASS] ${ep.name} (${ep.method} ${ep.path}): Status ${res.status}`);
        successCount++;
      } else {
        console.log(`[FAIL] ${ep.name} (${ep.method} ${ep.path}): Status ${res.status}`);
      }
    } catch (e) {
      console.log(`[ERR] ${ep.name} (${ep.method} ${ep.path}): ${e.message}`);
    }
  }

  await mongoose.disconnect();
  console.log(`--- Academy Endpoints Verification: ${successCount} of ${endpoints.length} PASSED ---`);
}

testAcademyFlow().catch(console.error);
