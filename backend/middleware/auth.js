const jwt = require("jsonwebtoken");

/**
 * Replaces Firebase Auth's client-side session persistence.
 * Expects: Authorization: Bearer <token>
 * On success attaches req.candidateId for downstream routes.
 */
function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: "No auth token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.candidateId = decoded.id;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

function signToken(candidateId) {
  return jwt.sign({ id: candidateId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "30d",
  });
}

module.exports = { requireAuth, signToken };
