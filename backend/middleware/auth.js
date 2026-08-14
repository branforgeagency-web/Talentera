const jwt = require("jsonwebtoken");

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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
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
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.role !== "company") {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.companyId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function signToken(id, role = "candidate") {
  return jwt.sign({ id, role }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

module.exports = { requireAuth, requireCompanyAuth, signToken };
