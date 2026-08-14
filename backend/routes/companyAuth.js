const express = require("express");
const bcrypt = require("bcryptjs");
const { body, validationResult } = require("express-validator");
const Company = require("../models/Company");
const { signToken, requireCompanyAuth } = require("../middleware/auth");

const router = express.Router();

// POST /api/company/auth/register
router.post(
  "/register",
  [
    body("name").trim().isLength({ min: 2 }).withMessage("Your name is required."),
    body("companyName").trim().isLength({ min: 2 }).withMessage("Company name is required."),
    body("mobile")
      .matches(/^\d{10}$/)
      .withMessage("Enter a valid 10-digit mobile number."),
    body("email").isEmail().withMessage("Valid work email required").normalizeEmail(),
    body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg, errors: errors.array() });
    }

    const { name, companyName, mobile, email, password } = req.body;

    try {
      const existing = await Company.findOne({ email });
      if (existing) {
        return res.status(409).json({ message: "An account with this email already exists." });
      }

      const passwordHash = await bcrypt.hash(password, 10);
      const company = await Company.create({
        email,
        passwordHash,
        contactName: name,
        companyName,
        mobile,
        completedStages: [],
      });

      const token = signToken(company._id, "company");
      res.status(201).json({ token, company });
    } catch (err) {
      console.error("Company register error:", err);
      res.status(500).json({ message: "Server error during registration." });
    }
  }
);

// POST /api/company/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required").normalizeEmail(),
    body("password").notEmpty().withMessage("Password required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { email, password } = req.body;

    try {
      const company = await Company.findOne({ email });
      if (!company) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const match = await bcrypt.compare(password, company.passwordHash);
      if (!match) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(company._id, "company");
      res.json({ token, company });
    } catch (err) {
      console.error("Company login error:", err);
      res.status(500).json({ message: "Server error during login." });
    }
  }
);

// GET /api/company/auth/me - restores session on refresh
router.get("/me", requireCompanyAuth, async (req, res) => {
  try {
    const company = await Company.findById(req.companyId);
    if (!company) return res.status(404).json({ message: "Company not found." });
    res.json({ company });
  } catch (err) {
    res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
