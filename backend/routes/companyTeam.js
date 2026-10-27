const express = require("express");
const bcrypt = require("bcryptjs");
const Company = require("../models/Company");
const CompanyUser = require("../models/CompanyUser");
const { requireCompanyAuth, requireCompanyHead } = require("../middleware/auth");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const { sendTransactionalSms } = require("../utils/sms");
const logger = require("../utils/logger");

const router = express.Router();

const MAX_LOGINS_PER_BRANCH = 5;
const MAX_LOGINS_TOTAL = 50;
const ROLES = ["branch_admin", "recruiter", "viewer"];
const ROLE_NAMES = {
  branch_admin: "Branch Admin",
  recruiter: "Recruiter",
  viewer: "Viewer (Read Only)",
};
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const APP_URL = process.env.APP_URL || "https://talentera.in";
const COMPANY_LOGIN_URL = `${APP_URL}/companies/login`;

/**
 * Dispatch credentials to newly added branch team member via Email & SMS.
 */
async function dispatchTeamCredentials({ name, email, mobile, password, branch, role, designation, companyName }) {
  const roleLabel = ROLE_NAMES[role] || role;
  const companyTitle = companyName || "Company";

  // 1. Transactional Email via Brevo
  const emailHtml = wrapEmailTemplate(
    `Welcome to ${companyTitle} on Talentera`,
    `
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-top: 0;">
        Hello <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        You have been added as a <strong>${roleLabel}</strong> for <strong>${companyTitle}</strong> (${branch} branch) on the Talentera Hiring Portal.
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Company:</strong> ${companyTitle}</p>
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Branch:</strong> ${branch}</p>
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Role:</strong> ${roleLabel}</p>
        ${designation ? `<p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Designation:</strong> ${designation}</p>` : ""}
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Login Email:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${email}</code></p>
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Temporary Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0A1F3D; font-size: 13px;">${password}</code></p>
        <p style="margin: 0; font-size: 13.5px; color: #0F172A;"><strong>Portal URL:</strong> <a href="${COMPANY_LOGIN_URL}" style="color: #1D4ED8; word-break: break-all;">${COMPANY_LOGIN_URL}</a></p>
      </div>
      <p style="margin: 22px 0 16px; text-align: center;">
        <a href="${COMPANY_LOGIN_URL}" style="display: inline-block; background-color: #0A1F3D; color: #ffffff; padding: 12px 24px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px;">Log In to Company Portal &rarr;</a>
      </p>
      <p style="color: #64748B; font-size: 12px; line-height: 1.5; margin-bottom: 0;">
        For security, we recommend changing your password after your first login.
      </p>
    `
  );

  try {
    await sendTransactionalEmail({
      to: email,
      toName: name,
      subject: `Your ${companyTitle} Talentera Portal Login Credentials`,
      html: emailHtml,
    });
    logger.info(`[TEAM LOGIN] Welcome email dispatched to ${email}`);
  } catch (err) {
    logger.warn(`[TEAM LOGIN] Welcome email failed for ${email}: ${err.message}`);
  }

  // 2. Transactional SMS via Brevo / MSG91
  if (mobile) {
    const smsText = `Hello ${name}, your ${companyTitle} (${branch}) Talentera portal login is ready. Email: ${email}, Password: ${password}, Role: ${roleLabel}. Login at: ${COMPANY_LOGIN_URL}`;
    try {
      await sendTransactionalSms({ mobile, content: smsText });
    } catch (err) {
      logger.warn(`[TEAM LOGIN] Welcome SMS failed for ${mobile}: ${err.message}`);
    }
  }
}

/**
 * Dispatch password reset notification via Email & SMS.
 */
async function dispatchPasswordReset({ name, email, mobile, newPassword, branch, companyName }) {
  const companyTitle = companyName || "Company";

  const emailHtml = wrapEmailTemplate(
    `Your ${companyTitle} Login Password Has Been Reset`,
    `
      <p style="color: #475569; font-size: 15px; line-height: 1.5; margin-top: 0;">
        Hello <strong>${name}</strong>,
      </p>
      <p style="color: #475569; font-size: 14px; line-height: 1.5;">
        Your password for the <strong>${companyTitle}</strong> (${branch} branch) Talentera Hiring Portal has been updated by the administrator.
      </p>
      <div style="background-color: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 16px 20px; margin: 18px 0;">
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>Login Email:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${email}</code></p>
        <p style="margin: 0 0 8px; font-size: 13.5px; color: #0F172A;"><strong>New Password:</strong> <code style="background: #E2E8F0; padding: 2px 6px; border-radius: 4px; font-weight: bold; color: #0A1F3D; font-size: 13px;">${newPassword}</code></p>
        <p style="margin: 0; font-size: 13.5px; color: #0F172A;"><strong>Portal URL:</strong> <a href="${COMPANY_LOGIN_URL}" style="color: #1D4ED8; word-break: break-all;">${COMPANY_LOGIN_URL}</a></p>
      </div>
      <p style="margin: 22px 0 16px; text-align: center;">
        <a href="${COMPANY_LOGIN_URL}" style="display: inline-block; background-color: #0A1F3D; color: #ffffff; padding: 12px 24px; font-weight: 700; font-size: 14px; text-decoration: none; border-radius: 8px;">Log In to Company Portal &rarr;</a>
      </p>
    `
  );

  try {
    await sendTransactionalEmail({
      to: email,
      toName: name,
      subject: `Your ${companyTitle} Talentera Portal Password Has Been Updated`,
      html: emailHtml,
    });
  } catch (err) {
    logger.warn(`[TEAM RESET] Password reset email failed for ${email}: ${err.message}`);
  }

  if (mobile) {
    const smsText = `Hello ${name}, your Talentera login password for ${companyTitle} (${branch}) has been updated. New Password: ${newPassword}. Login at: ${COMPANY_LOGIN_URL}`;
    try {
      await sendTransactionalSms({ mobile, content: smsText });
    } catch (err) {
      logger.warn(`[TEAM RESET] Password reset SMS failed for ${mobile}: ${err.message}`);
    }
  }
}

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
    const mobile = String(req.body.mobile || "").trim();
    const designation = String(req.body.designation || "").trim();

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
    const companyName = head?.companyName || "Company";

    const user = await CompanyUser.create({
      companyId: req.companyId,
      name,
      email,
      mobile,
      designation,
      branch,
      role,
      passwordHash: await bcrypt.hash(password, 10),
      createdByName: (head && (head.contactName || head.companyName)) || "Head admin",
    });

    // Send email and SMS notification to the added user
    dispatchTeamCredentials({
      name,
      email,
      mobile,
      password,
      branch,
      role,
      designation,
      companyName,
    }).catch((notifErr) => {
      logger.warn(`Failed to dispatch team login credentials: ${notifErr.message}`);
    });

    res.status(201).json({
      user,
      message: `Login created for ${name}. Welcome email and SMS with credentials have been dispatched.`,
    });
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

    let passwordChanged = false;
    let newPassword = "";
    if (req.body.password) {
      newPassword = String(req.body.password);
      if (newPassword.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters." });
      user.passwordHash = await bcrypt.hash(newPassword, 10);
      passwordChanged = true;
    }

    await user.save();

    if (passwordChanged) {
      const head = await Company.findById(req.companyId).select("companyName").lean();
      dispatchPasswordReset({
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        newPassword,
        branch: user.branch,
        companyName: head?.companyName || "Company",
      }).catch((notifErr) => {
        logger.warn(`Failed to dispatch password reset notifications: ${notifErr.message}`);
      });
    }

    res.json({
      user,
      message: passwordChanged
        ? "Password updated. Notification email and SMS dispatched to user."
        : "Login updated.",
    });
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
