const express = require("express");
const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const CompanyUser = require("../models/CompanyUser");
const { requireCompanyAuth, requireCompanyHead } = require("../middleware/auth");
const logger = require("../utils/logger");

const router = express.Router();

const MAX_LOGINS_PER_BRANCH = 5;
const MAX_LOGINS_TOTAL = 50;
const ROLES = ["branch_admin", "recruiter", "viewer"];
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Everything here is for the head admin only.
router.use(requireCompanyAuth, requireCompanyHead);

// GET /api/company/team - all sub-logins + limits
router.get("/", async (req, res) => {
  try {
    const users = await CompanyUser.find({ companyId: req.companyId }).sort({ branch: 1, createdAt: 1 }).lean();
    res.json({
      users: users.map(({ passwordHash, ...u }) => u),
      limits: { perBranch: MAX_LOGINS_PER_BRANCH, total: MAX_LOGINS_TOTAL },
    });
  } catch (err) {
    logger.error(`List company team error: ${err.message}`);
    res.status(500).json({ message: "Failed to load team logins." });
  }
});

// POST /api/company/team - create a sub-login
router.post("/", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const branch = String(req.body.branch || "").trim();
    const role = ROLES.includes(req.body.role) ? req.body.role : "recruiter";
    const password = String(req.body.password || "");

    if (!name) return res.status(400).json({ message: "Enter the person's name." });
    if (!emailRe.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (!branch) return res.status(400).json({ message: "Enter the branch / location for this login." });
    if (password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });

    const [companyTaken, userTaken, branchCount, totalCount] = await Promise.all([
      Company.exists({ email }),
      CompanyUser.exists({ email }),
      CompanyUser.countDocuments({ companyId: req.companyId, branch: new RegExp(`^${branch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") }),
      CompanyUser.countDocuments({ companyId: req.companyId }),
    ]);
    if (companyTaken || userTaken) return res.status(409).json({ message: "This email already has a login. Use a different email." });
    if (branchCount >= MAX_LOGINS_PER_BRANCH) {
      return res.status(400).json({ message: `Branch "${branch}" already has ${MAX_LOGINS_PER_BRANCH} logins (the maximum). Remove one first.` });
    }
    if (totalCount >= MAX_LOGINS_TOTAL) return res.status(400).json({ message: `Maximum ${MAX_LOGINS_TOTAL} team logins reached.` });

    const head = await Company.findById(req.companyId).select("contactName companyName").lean();
    const user = await CompanyUser.create({
      companyId: req.companyId,
      name,
      email,
      mobile: String(req.body.mobile || "").trim(),
      designation: String(req.body.designation || "").trim(),
      branch,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      createdByName: (head && (head.contactName || head.companyName)) || "Head admin",
    });
    res.status(201).json({ user, message: "Login created. Share the email and password with this person." });
  } catch (err) {
    logger.error(`Create company team login error: ${err.message}`);
    res.status(500).json({ message: "Failed to create the login." });
  }
});

// PUT /api/company/team/:id - edit details / role / branch / active, optionally reset password
router.put("/:id", async (req, res) => {
  try {
    const user = await CompanyUser.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!user) return res.status(404).json({ message: "Login not found." });

    if (req.body.name !== undefined) {
      const n = String(req.body.name).trim();
      if (!n) return res.status(400).json({ message: "Name cannot be empty." });
      user.name = n;
    }
    if (req.body.mobile !== undefined) user.mobile = String(req.body.mobile).trim();
    if (req.body.designation !== undefined) user.designation = String(req.body.designation).trim();
    if (req.body.role !== undefined) {
      if (!ROLES.includes(req.body.role)) return res.status(400).json({ message: "Invalid role." });
      user.role = req.body.role;
    }
    if (req.body.branch !== undefined) {
      const b = String(req.body.branch).trim();
      if (!b) return res.status(400).json({ message: "Branch cannot be empty." });
      if (b.toLowerCase() !== String(user.branch).toLowerCase()) {
        const count = await CompanyUser.countDocuments({
          companyId: req.companyId,
          _id: { $ne: user._id },
          branch: new RegExp(`^${b.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i"),
        });
        if (count >= MAX_LOGINS_PER_BRANCH) return res.status(400).json({ message: `Branch "${b}" already has ${MAX_LOGINS_PER_BRANCH} logins.` });
      }
      user.branch = b;
    }
    if (req.body.active !== undefined) user.active = !!req.body.active;
    if (req.body.password) {
      if (String(req.body.password).length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      user.passwordHash = await bcrypt.hash(String(req.body.password), 10);
    }
    await user.save();
    res.json({ user, message: "Login updated." });
  } catch (err) {
    logger.error(`Update company team login error: ${err.message}`);
    res.status(500).json({ message: "Failed to update the login." });
  }
});

// DELETE /api/company/team/:id - remove a login (access ends immediately)
router.delete("/:id", async (req, res) => {
  try {
    const result = await CompanyUser.deleteOne({ _id: req.params.id, companyId: req.companyId });
    if (!result.deletedCount) return res.status(404).json({ message: "Login not found." });
    res.json({ message: "Login removed." });
  } catch (err) {
    logger.error(`Delete company team login error: ${err.message}`);
    res.status(500).json({ message: "Failed to remove the login." });
  }
});

module.exports = router;
