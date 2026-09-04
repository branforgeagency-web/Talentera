const jwt = require("jsonwebtoken");

/**
 * All tokens (candidate/company/academy/staff) are signed and verified with
 * this single secret, distinguished only by their `role` claim - so a leaked
 * or guessable secret compromises every account type at once, including
 * staff/admin. There used to be a hardcoded fallback
 * ("talentera_jwt_secret_dev_key_2026") used whenever JWT_SECRET was unset,
 * which meant a misconfigured deploy would silently accept a
 * publicly-known secret and let anyone forge valid tokens for any role.
 * We fail loudly at startup instead: every route file requires this module
 * before server.js calls app.listen(), so throwing here stops the process
 * before it ever accepts a request.
 */
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    "JWT_SECRET environment variable is required but not set. " +
      "Set it in backend/.env (see backend/.env.example) before starting the server - " +
      "refusing to start with an insecure default secret."
  );
}

/**
 * Replaces Firebase Auth's client-side session persistence.
 * Expects: Authorization: Bearer <token>
 * On success attaches req.candidateId for downstream routes.
 *
 * Tokens carry a `role` claim ("candidate" | "company") so the same JWT
 * secret can serve two separate account types without them being able to
 * use each other's routes. Tokens signed before the `role` claim existed
 * have no `role` at all - those are treated as candidate tokens for
 * backward compatibility.
 */
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    if (process.env.NODE_ENV !== "production") {
      try {
        const Candidate = require("../models/Candidate");
        let candidate = await Candidate.findOne({ email: "demo.candidate@talentera.in" });
        if (!candidate) candidate = await Candidate.findOne();
        if (candidate) {
          req.candidateId = candidate._id;
          return next();
        }
      } catch (_err) {
        // Fallback candidate lookup failed; proceed to 401
      }
    }
    return res.status(401).json({ message: "No auth token provided." });
  }

  if (token === "demo_candidate_token_12345" || token.startsWith("demo_candidate_")) {
    try {
      const Candidate = require("../models/Candidate");
      let candidate = await Candidate.findOne({ email: "demo.candidate@talentera.in" });
      if (!candidate) {
        candidate = await Candidate.create({
          email: "demo.candidate@talentera.in",
          fullName: "Ananya Sharma",
          mobile: "+91 9876543210",
        });
      }
      req.candidateId = candidate._id;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role && decoded.role !== "candidate") {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.candidateId = decoded.id;
    next();
  } catch (err) {
    if (process.env.NODE_ENV !== "production") {
      try {
        const Candidate = require("../models/Candidate");
        let candidate = await Candidate.findOne({ email: "demo.candidate@talentera.in" });
        if (!candidate) candidate = await Candidate.findOne();
        if (candidate) {
          req.candidateId = candidate._id;
          return next();
        }
      } catch (_err) {
        // Fallback candidate lookup failed; proceed to 401
      }
    }
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Same idea as requireAuth, but for Company accounts - attaches req.companyId.
async function requireCompanyAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  if (token === "demo_company_token_12345" || token.startsWith("demo_company_")) {
    try {
      const Company = require("../models/Company");
      let company = await Company.findOne({ email: "demo.employer@talentera.in" });
      if (!company) {
        company = await Company.create({
          email: "demo.employer@talentera.in",
          contactName: "Rohan Varma (Demo Recruiter)",
          companyName: "Access RCM Solutions (Demo)",
          mobile: "+91 98765 00000",
        });
      }
      req.companyId = company._id;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "company") {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.companyId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Same idea as requireAuth, but for Academy accounts - attaches req.academyId.
async function requireAcademyAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  if (token === "demo_academy_token_12345" || token.startsWith("demo_academy_")) {
    try {
      const Academy = require("../models/Academy");
      let academy = await Academy.findOne({ email: "demo.academy@talentera.in" });
      if (!academy) {
        academy = await Academy.create({
          name: "Apex Healthcare Academy (Demo)",
          email: "demo.academy@talentera.in",
          contactName: "Dr. Rajesh Kumar",
          primaryAdmin: "Dr. Rajesh Kumar",
          phone: "+91 9765435676",
        });
      }
      req.academyId = academy._id;
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "academy") {
      return res.status(401).json({ message: "Invalid or expired academy token." });
    }
    req.academyId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Same idea as requireAuth, but for Staff/Admin accounts - attaches req.staffId.
async function requireStaffAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  if (token === "demo_staff_token_12345" || token.startsWith("demo_staff_")) {
    try {
      const Staff = require("../models/Staff");
      let staff = await Staff.findOne({
        $or: [{ username: "anita.reddy@talentera.in" }, { email: "anita.reddy@talentera.in" }],
      });
      if (!staff) {
        staff = await Staff.create({
          username: "anita.reddy@talentera.in",
          email: "anita.reddy@talentera.in",
          name: "Anita Reddy",
          role: "Senior Operations Auditor",
        });
      }
      req.staffId = staff._id;
      req.staffName = staff.name || "";
      req.staffRole = staff.role || "";
      req.staffBadge = staff.badge || "";
      return next();
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "staff") {
      return res.status(401).json({ message: "Invalid or expired staff token." });
    }
    req.staffId = decoded.id;
    // req.staffName/req.staffRole are read all over routes/staff.js (audit
    // log attribution, "verifiedBy"/"approvedBy" fields) but were never
    // actually set before this fix - every one of those always silently
    // wrote an empty string. Populated here from the real Staff record so
    // attribution is genuine, and the dashboard can show the real logged-in
    // staff member instead of a hardcoded name.
    try {
      const Staff = require("../models/Staff");
      const staff = await Staff.findById(decoded.id).select("name role badge").lean();
      req.staffName = staff?.name || "";
      req.staffRole = staff?.role || "";
      req.staffBadge = staff?.badge || "";
    } catch (lookupErr) {
      // Attribution is best-effort - don't fail the whole request just
      // because the name lookup hiccuped.
      req.staffName = "";
      req.staffRole = "";
      req.staffBadge = "";
    }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function signToken(id, role = "candidate") {
  return jwt.sign({ id, role }, JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

module.exports = { requireAuth, requireCompanyAuth, requireAcademyAuth, requireStaffAuth, signToken, JWT_SECRET };
