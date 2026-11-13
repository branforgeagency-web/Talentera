const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("./auth");

/**
 * Keeps Branch Placement Coordinators out of the parts of the Academy API that belong to the Academy Head:
 * KYC, academy settings, payments, referrals, MoUs, branches/coordinator management, cross-academy insights and
 * destructive / academy-wide actions. Coordinator tokens carry `coordinatorId` (see signAcademyCoordinatorToken).
 * This is enforced on the server - hiding the menu item in the dashboard is not enough.
 */
const HEAD_ONLY = [
  { re: /^\/kyc(\/|$)/ },
  { re: /^\/(payments|referrals|mous)(\/|$)/ },
  { re: /^\/insights(\/|$)/ },
  { re: /^\/settings(\/|$)/ },
  { re: /^\/clear-all(\/|$)/ },
  { re: /^\/batch\//, methods: ["DELETE"] },
  { re: /^\/branches(\/|$)/, methods: ["POST", "PUT", "PATCH", "DELETE"] },
  { re: /^\/activity\/simulate(\/|$)/ },
  { re: /^\/(gallery|courses|create-course|add-question|questions)(\/|$)/, methods: ["POST", "PUT", "PATCH", "DELETE"] },
];

function isHeadOnly(method, path) {
  const m = String(method || "GET").toUpperCase();
  return HEAD_ONLY.some((r) => r.re.test(path) && (!r.methods || r.methods.includes(m)));
}

function academyHeadOnlyGuard(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token || !isHeadOnly(req.method, req.path)) return next();
  let decoded;
  try {
    decoded = jwt.verify(token, JWT_SECRET);
  } catch (_e) {
    return next(); // bad/expired tokens are rejected by the normal auth middleware
  }
  if (decoded && decoded.role === "academy" && decoded.coordinatorId) {
    return res.status(403).json({ message: "This section is only available to the Academy Head." });
  }
  return next();
}

module.exports = { academyHeadOnlyGuard, isHeadOnly };
