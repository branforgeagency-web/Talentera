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
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role && decoded.role !== "candidate") {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.candidateId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

// Same idea as requireAuth, but for Company accounts - attaches req.companyId.
function requireCompanyAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
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
function requireAcademyAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
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
function requireStaffAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== "staff") {
      return res.status(401).json({ message: "Invalid or expired staff token." });
    }
    req.staffId = decoded.id;
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
