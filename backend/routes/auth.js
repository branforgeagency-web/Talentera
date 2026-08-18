const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Candidate = require("../models/Candidate");
const { signToken, requireAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/auth/register
router.post(
  "/register",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    body("mobile")
      .optional({ checkFalsy: true })
      .matches(/^\d{10}$/)
      .withMessage("Mobile number must be 10 digits."),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password, mobile } = req.body;

    try {
      const existing = await Candidate.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const candidate = await Candidate.create({
        email,
        passwordHash,
        mobile: mobile || "",
        completedStages: [],
      });

      const token = signToken(candidate._id);
      res.status(201).json({ token, candidate });
    } catch (err) {
      console.error("Register error:", err);
      res.status(500).json({ message: "Server error during registration." });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").exists().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { email, password } = req.body;

    try {
      const candidate = await Candidate.findOne({ email });
      if (!candidate) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const isMatch = await bcrypt.compare(password, candidate.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(candidate._id);
      res.json({ token, candidate });
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ message: "Server error during login." });
    }
  }
);

// GET /api/auth/me  - restores session on refresh (replaces Firebase's persistent session)
router.get("/me", requireAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });
    res.json({ candidate });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
