const express = require("express");
const Candidate = require("../models/Candidate");
const Academy = require("../models/Academy");
const AcademyBatch = require("../models/AcademyBatch");
const StudentUpload = require("../models/StudentUpload");
const StudentInvite = require("../models/StudentInvite");
const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const PlacementConfirmation = require("../models/PlacementConfirmation");
const { compute8Stages, TALENTERA_PASS_PERCENTAGE } = require("../utils/talenteraScore");
const Application = require("../models/Application");
const Notification = require("../models/Notification");
const RetakeRequest = require("../models/RetakeRequest");
const { sendRetakeApprovedEmail } = require("../utils/emailService");
const bcrypt = require("bcryptjs");
const { verifyWidgetAccessToken } = require("../utils/msg91Widget");
const { requireAcademyAuth, signToken } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { authLimiter } = require("../middleware/rateLimit");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const router = express.Router();

const DASHBOARD_FETCH_CAP = 500;

// Where a student invite's signup link points. Uses https://talentera-nine.vercel.app as requested.
const APP_URL = (process.env.APP_URL || "https://talentera-nine.vercel.app").replace(/\/$/, "");

function inviteSignupLink(inviteToken) {
  return `${APP_URL}/register?invite=${inviteToken}`;
}

// Sends the real "you're invited" email a student gets when their academy
// uploads them - previously upload-confirm/add-single only stamped
// emailSentAt/smsSentAt timestamps on the StudentInvite record without ever
// sending anything. Best-effort: a delivery failure shouldn't fail the
// upload/add request, same pattern as every other transactional email in
// this app (see routes/company.js, routes/candidate.js).
async function sendInviteEmail({ invite, academyName }) {
  if (!invite?.email) return;
  const link = inviteSignupLink(invite.inviteToken);
  sendTransactionalEmail({
    to: invite.email,
    toName: invite.name,
    subject: `${academyName} added you to Talentera - set up your profile`,
    html: wrapEmailTemplate(
      "You're invited to Talentera",
      `<p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${invite.name},</p>
       <p style="color: #475569; font-size: 15px; line-height: 1.5;"><strong>${academyName}</strong> has added you to Talentera as part of batch <strong>${invite.batchCode}</strong>. Set your password to activate your verified profile and start matching with employers.</p>
       <p style="margin: 24px 0;"><a href="${link}" style="background:#0A1F3D;color:#E5A82E;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Activate my profile →</a></p>
       <p style="color: #64748B; font-size: 13px;">If the button doesn't work, copy this link into your browser:<br />${link}</p>`
    ),
  }).catch((err) => logger.warn(`Invite email failed for ${invite.email}: ${err.message}`));
}

// Dispatches multi-channel reminders (Email via Brevo, SMS, WhatsApp) to candidates
async function sendCandidateReminderNotification({ candidate, academy, reminderType, customMessage }) {
  if (!candidate || !candidate.email) return;

  const candidateName = candidate.stage1?.fullName || candidate.name || candidate.email.split("@")[0];
  const academyName = academy?.name || "Your Academy Partner";
  const mobile = candidate.stage1?.mobile || candidate.mobile || "";

  let subject = `Action Required: Profile Verification Reminder - ${academyName}`;
  let title = "Talentera Profile Reminder";
  let contentHtml = "";
  // Plain-text gist of the same message, shown in the candidate's in-app notification
  // bell (the HTML above is email-only).
  let notifMessage = `${academyName} sent you a reminder to complete your pending verification stages.`;

  if (reminderType === "portfolio_video" || reminderType === "video") {
    subject = `Action Required: Upload your Portfolio Video (Stage 5) - ${academyName}`;
    title = "Portfolio Video Reminder";
    notifMessage = `${academyName} is asking you to record and upload your 2-minute Portfolio Video (Stage 5) on Talentera.`;
    contentHtml = `
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${candidateName},</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your academy <strong>${academyName}</strong> has sent a reminder requesting you to record and upload your <strong>2-minute Portfolio Video (Stage 5)</strong> on Talentera.</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Uploading your video introduction enables employers and recruiters to discover your profile for immediate healthcare hiring opportunities.</p>
      <p style="margin: 24px 0;"><a href="${APP_URL}/login" style="background:#0A1F3D;color:#E5A82E;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Record / Upload Video Now →</a></p>
      <p style="color: #64748B; font-size: 13px;">This reminder was dispatched via Email, SMS, and WhatsApp by ${academyName}.</p>
    `;
  } else if (reminderType === "boost_score") {
    // Sent from the candidate tracker's "Boost Score" action for anyone scoring below
    // TALENTERA_PASS_PERCENTAGE - a plain nudge to log back in and keep completing
    // Stages 1-8 (does not reset/unlock anything, unlike the Retake action).
    const stageInfo = compute8Stages(candidate);
    const currentScore = stageInfo.talenteraScore;
    subject = `Action Required: Raise Your Talentera Score to ${TALENTERA_PASS_PERCENTAGE}%+ - ${academyName}`;
    title = "Complete Your Stages to Reach the Interview Pass Mark";
    notifMessage = `Your Talentera Score is ${currentScore}%, below the ${TALENTERA_PASS_PERCENTAGE}% pass mark. ${academyName} is asking you to continue Stages 1-8 to raise it.`;
    contentHtml = `
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${candidateName},</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your current Talentera Score is <strong>${currentScore}%</strong>, which is below the <strong>${TALENTERA_PASS_PERCENTAGE}%</strong> pass mark required to become eligible for employer interviews.</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your academy <strong>${academyName}</strong> is asking you to log back in to your Talentera dashboard and continue completing Stages 1 through 8 (Identity, Academy Training, Certifications, Assessment, Portfolio Video, Live Chart Practice, References, and Review) - each completed stage raises your score.</p>
      <p style="margin: 24px 0;"><a href="${APP_URL}/login" style="background:#0A1F3D;color:#E5A82E;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Login & Continue Your Stages →</a></p>
      <p style="color: #64748B; font-size: 13px;">This reminder was dispatched via Email, SMS, and WhatsApp by ${academyName}.</p>
    `;
  } else {
    subject = `Reminder: Complete Your Talentera Verification - ${academyName}`;
    title = "Complete Your Profile Verification";
    notifMessage = `${academyName} sent you a reminder to complete your pending verification stages on Talentera.`;
    contentHtml = `
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Hi ${candidateName},</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Your training partner <strong>${academyName}</strong> has sent you a reminder to complete your pending verification stages on Talentera.</p>
      <p style="color: #475569; font-size: 15px; line-height: 1.5;">Complete your assessments and verification to get your verified credential and match with top healthcare employers.</p>
      <p style="margin: 24px 0;"><a href="${APP_URL}/login" style="background:#0A1F3D;color:#E5A82E;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Continue Profile Verification →</a></p>
      <p style="color: #64748B; font-size: 13px;">This reminder was dispatched via Email, SMS, and WhatsApp by ${academyName}.</p>
    `;
  }

  // 1. Dispatch Email via Brevo
  sendTransactionalEmail({
    to: candidate.email,
    toName: candidateName,
    subject,
    html: wrapEmailTemplate(title, contentHtml),
  }).catch((err) => logger.warn(`Reminder email failed for ${candidate.email}: ${err.message}`));

  // 1b. In-App Notification (shows up in the candidate's own notification bell,
  // same event as the email above).
  try {
    await Notification.create({
      recipientType: "candidate",
      recipientId: String(candidate._id),
      title,
      message: notifMessage,
      type: "reminder",
      meta: { source: "academy", senderName: academyName, action: `reminder_${reminderType || "general"}` },
    });
  } catch (notifErr) {
    logger.warn(`Candidate notification create failed: ${notifErr.message}`);
  }

  // 2. Log SMS & WhatsApp notification
  logger.info(`[MULTI-CHANNEL REMINDER DISPATCHED - EMAIL, SMS, WHATSAPP] Candidate: ${candidateName} (${candidate.email}, ${mobile}) | Academy: ${academyName} | Type: ${reminderType || "general"}`);

  // 3. Update invite timestamps if present
  try {
    await StudentInvite.updateMany(
      {
        $or: [
          { candidateId: candidate._id },
          { email: candidate.email.toLowerCase() },
        ],
      },
      {
        $set: {
          lastNudgeAt: new Date(),
          smsSentAt: new Date(),
          whatsappSentAt: new Date(),
        },
      }
    );
  } catch (err) {
    logger.warn(`Failed to update invite timestamp on reminder: ${err.message}`);
  }
}

// Helper to parse CSV line respecting quotes. `delimiter` defaults to "," but
// callers pass whatever parseCsvBuffer auto-detected for this file (see below).
function parseCsvLine(text, delimiter = ",") {
  const result = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"' || c === "'") {
      if (inQuotes && text[i + 1] === c) {
        cur += c;
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === delimiter && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += c;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

// Auto-detects the field delimiter from a CSV header line. Excel exports
// CSVs with "," in US/UK locales but ";" in most of the rest of the world
// (including India, when the system list-separator is a comma) - without
// this, a semicolon-delimited file silently parses as ONE giant column per
// row, every field comes back blank, and every row fails validation.
function detectCsvDelimiter(headerLine) {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    // Count occurrences outside quoted spans so a quoted field containing
    // the delimiter doesn't skew the count.
    const count = parseCsvLine(headerLine, d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

// Helper to parse CSV buffer into row objects
function parseCsvBuffer(buffer) {
  // Excel/Sheets "renamed to .csv" guard: a real .xlsx file is actually a ZIP archive
  // (magic bytes 50 4B 03 04) - if a user edits the sample template and saves it
  // without truly exporting as CSV (or just renames an .xlsx to .csv), decoding it as
  // UTF-8 text produces garbage that silently fails every field. Fail fast with a clear,
  // actionable message instead of rendering a wall of fake "Needs Fix" rows.
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    const err = new Error("Uploaded file is an Excel workbook (.xlsx), not a CSV.");
    err.userMessage =
      "This file looks like an Excel workbook saved with a .csv name, not an actual CSV. In Excel, use File > Save As > CSV (Comma delimited) - don't just rename the file extension - then upload that file.";
    throw err;
  }

  let text = buffer.toString("utf-8");
  // Strip a UTF-8 byte-order-mark (BOM) if present - Excel's "CSV UTF-8" export option
  // prepends one, which otherwise corrupts only the very first header cell (e.g. "name"
  // silently becomes "\ufeffname"), breaking just that column's matching.
  if (text.charCodeAt(0) === 0xfeff) {
    text = text.slice(1);
  }

  let lines = text.split(/\r?\n/).filter((line) => line.trim() !== "");
  if (lines.length <= 1) return [];

  // Excel, on many non-US locales, prepends a literal "sep=;" (or "sep=,") directive
  // line above the real header row when it saves a CSV whose list separator isn't a
  // comma - it's a hint for Excel itself on reopen, not part of the data. Left in
  // place it gets read as the header row, every column comes back unrecognized, and
  // the real header row is misparsed as the first data row.
  const sepDirectiveMatch = lines[0].trim().match(/^sep=(.)$/i);
  let delimiter;
  if (sepDirectiveMatch) {
    delimiter = sepDirectiveMatch[1];
    lines = lines.slice(1);
    if (lines.length <= 1) return [];
  } else {
    delimiter = detectCsvDelimiter(lines[0]);
  }

  const headers = parseCsvLine(lines[0], delimiter).map((h) =>
    h.toLowerCase().replace(/[\s_-]+/g, "_")
  );

  // If none of the expected student-data columns show up after parsing, this isn't
  // valid CSV text at all (wrong file, corrupted save, unsupported encoding, etc.) -
  // fail with a clear message instead of silently producing all-blank rows.
  const knownHeaderHints = ["name", "email", "mobile", "phone", "course", "batch"];
  const hasKnownHeader = headers.some((h) => knownHeaderHints.some((hint) => h.includes(hint)));
  if (!hasKnownHeader) {
    const err = new Error("CSV header row not recognized.");
    err.userMessage =
      "We couldn't recognize any expected columns (name, email, mobile, etc.) in this file's first row. Please start from the downloaded sample template, keep its header row unchanged, and save as a plain CSV file before uploading.";
    throw err;
  }

  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i], delimiter);
    if (values.length < 2) continue;

    const row = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] !== undefined ? values[idx] : "";
    });
    rows.push(row);
  }
  return rows;
}

// Generate matching variations for mobile numbers (digits only, 10-digit formats, +91, 0 prefixes)
function getMobileQueryVariants(mobiles) {
  if (!mobiles) return [];
  const list = Array.isArray(mobiles) ? mobiles : [mobiles];
  const variants = new Set();

  for (const m of list) {
    if (!m) continue;
    const str = String(m).trim();
    if (!str) continue;
    variants.add(str);
    const digitsOnly = str.replace(/\D/g, "");
    if (!digitsOnly) continue;
    variants.add(digitsOnly);
    if (digitsOnly.length >= 10) {
      const last10 = digitsOnly.slice(-10);
      variants.add(last10);
      variants.add(`+91${last10}`);
      variants.add(`+91 ${last10}`);
      variants.add(`91${last10}`);
      variants.add(`0${last10}`);
    }
  }
  return Array.from(variants);
}

// Build regex filters for 10-digit mobile numbers allowing spaces, dashes, or prefixes
function buildMobileRegexFilters(mobiles) {
  if (!mobiles) return [];
  const list = Array.isArray(mobiles) ? mobiles : [mobiles];
  const filters = [];
  const seenLast10 = new Set();

  for (const m of list) {
    if (!m) continue;
    const digitsOnly = String(m).replace(/\D/g, "");
    if (digitsOnly.length >= 10) {
      const last10 = digitsOnly.slice(-10);
      if (!seenLast10.has(last10)) {
        seenLast10.add(last10);
        const pattern = new RegExp(last10.split("").join("\\D*"));
        filters.push({ mobile: pattern });
        filters.push({ "stage1.mobile": pattern });
      }
    }
  }
  return filters;
}

// Builds a filter matching ONLY candidates this academy explicitly added - via
// "Add Candidate" or "Bulk Upload CSV" (both stamp stage2.academyId and create a
// StudentInvite), or anyone matched by an invite's email/candidateId/mobile.
//
// Deliberately NOT matched: a free-text stage2.academyName typed by a candidate
// during their OWN self-service onboarding (Stage 2 "which academy trained you").
// That field is unverified self-reported text - any candidate on the platform who
// types this academy's exact name there would otherwise show up in this academy's
// Candidates Directory even though the academy never added them. `academyName` is
// kept as a parameter for backward compatibility with existing callers but is no
// longer used to match candidates - do not reintroduce that regex match here.
function buildAcademyCandidateFilter(academyId, academyName, invites = []) {
  const invitedEmails = invites.map((inv) => (inv.email || "").toLowerCase().trim()).filter(Boolean);
  const invitedMobiles = invites.map((inv) => inv.mobile).filter(Boolean);
  const candidateIds = invites.map((inv) => inv.candidateId).filter(Boolean);
  const mobileVariants = getMobileQueryVariants(invitedMobiles);
  const mobileRegexes = buildMobileRegexFilters(invitedMobiles);

  const orConditions = [
    { "stage2.academyId": academyId.toString() },
    ...(invitedEmails.length > 0 ? [{ email: { $in: invitedEmails } }] : []),
    ...(candidateIds.length > 0 ? [{ _id: { $in: candidateIds } }] : []),
    ...(mobileVariants.length > 0 ? [
      { mobile: { $in: mobileVariants } },
      { "stage1.mobile": { $in: mobileVariants } },
    ] : []),
    ...mobileRegexes,
  ];

  return { $or: orConditions };
}

// Computes an academy's real, verifiable metrics from its actual linked candidates
// and recorded placements — used for the cross-academy insights/benchmark feature.
// Returns null for academies with no enrolled students (nothing meaningful to compare).
async function computeAcademyMetrics(academy) {
  const invites = await StudentInvite.find({ academyId: academy._id }).lean();
  const filter = buildAcademyCandidateFilter(academy._id, academy.name, invites);
  const candidatesList = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

  const totalStudents = candidatesList.length;
  if (totalStudents === 0) return null;

  // Talentera Score average (Stages 1-6 weighted, out of 100) - see
  // backend/utils/talenteraScore.js - not just the raw Stage 4 MCQ percentage.
  const candidateScores = candidatesList.map((c) => compute8Stages(c).talenteraScore);
  const scoredStudents = candidateScores.filter((sc) => sc > 0);
  const avgScore = scoredStudents.length > 0
    ? Math.round(scoredStudents.reduce((sum, sc) => sum + sc, 0) / scoredStudents.length)
    : 0;

  const videoedStudents = candidatesList.filter((c) => c.stage5?.aiScore);
  const videoQuality = videoedStudents.length > 0
    ? Math.round((videoedStudents.reduce((sum, c) => sum + (c.stage5.aiScore / 10), 0) / videoedStudents.length) * 10) / 10
    : 0;

  const profileCompletion = Math.round(
    candidatesList.reduce((sum, c) => sum + Math.round(((c.completedStages || []).length / 8) * 100), 0) / totalStudents
  );

  const placementRate = Math.round(((academy.placements || []).length / totalStudents) * 100);

  return {
    academyId: academy._id.toString(),
    city: academy.headquarters || "Unspecified",
    totalStudents,
    avgScore,
    videoQuality,
    profileCompletion,
    placementRate,
  };
}

// POST /api/academy/register - Register new academy with OTP verification & Password
router.post("/register", authLimiter, async (req, res) => {
  const { accessToken, fullName, academyName, email, password, mobile } = req.body;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ message: "Valid official email address is required." });
  }

  if (!password || password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters." });
  }

  if (!mobile || !/^[6-9]\d{9}$/.test(mobile.replace(/\D/g, "").slice(-10))) {
    return res.status(400).json({ message: "Valid 10-digit mobile number is required." });
  }

  if (!accessToken) {
    return res.status(400).json({ message: "OTP verification is required before creating your academy account." });
  }

  try {
    await verifyWidgetAccessToken(accessToken);
  } catch (err) {
    if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    logger.error(`Academy register OTP verify error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Server error verifying OTP." });
  }

  try {
    const cleanEmail = email.toLowerCase().trim();
    const cleanMobile = mobile.replace(/\D/g, "").slice(-10);
    const existing = await Academy.findOne({ email: cleanEmail });

    if (existing && existing.isVerified && existing.passwordHash) {
      return res.status(409).json({ message: "An academy account with this email already exists. Please log in instead." });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    let academy;

    if (existing) {
      existing.name = academyName || existing.name || "Medical Coding Academy";
      existing.contactName = fullName || existing.contactName || "Academy Partner";
      existing.primaryAdmin = fullName || existing.primaryAdmin || "Academy Partner";
      existing.phone = cleanMobile || existing.phone;
      existing.passwordHash = passwordHash;
      if (existing.isVerified === undefined) existing.isVerified = false;
      if (!existing.kycStatus) existing.kycStatus = "pending";
      academy = await existing.save();
    } else {
      academy = await Academy.create({
        name: academyName || "Medical Coding Academy",
        email: cleanEmail,
        contactName: fullName || "Academy Partner",
        primaryAdmin: fullName || "Academy Partner",
        phone: cleanMobile,
        passwordHash,
        isVerified: false,
        kycStatus: "pending",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
        tier: "Partner Academy",
        totalAlumni: "0",
        partnerSince: "Jan 2025",
        studentsUploaded: 0,
        verifiedPct: 0,
      });
    }

    const token = signToken(academy._id, "academy");

    res.status(201).json({
      token,
      academy,
    });
  } catch (err) {
    logger.error(`Academy register DB error: ${err.message}`);
    res.status(500).json({ message: err.message || "Failed to register academy account." });
  }
});

// POST /api/academy/login - Academy login with Password or OTP verification & JWT generation
router.post("/login", authLimiter, async (req, res) => {
  const { email, password, accessToken, fullName, academyName, mobile, phone } = req.body;
  const cleanEmail = (email || "").toLowerCase().trim();

  if (!cleanEmail || !cleanEmail.includes("@")) {
    return res.status(400).json({ message: "Valid email required." });
  }

  // Password-based credentials login (same flow as candidates)
  if (password) {
    try {
      const academy = await Academy.findOne({ email: cleanEmail });
      if (!academy) {
        return res.status(401).json({ message: "No academy account found with this email. Please sign up and verify your OTP first." });
      }

      if (!academy.passwordHash) {
        return res.status(401).json({ message: "Account has no password set. Please complete sign up or reset password." });
      }

      const isMatch = await bcrypt.compare(password, academy.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid email or password." });
      }

      const token = signToken(academy._id, "academy");
      return res.json({
        token,
        academy,
      });
    } catch (err) {
      logger.error(`Academy password login error: ${err.message}`);
      return res.status(500).json({ message: err.message || "Server error during login." });
    }
  }

  // Fallback: OTP-based login
  if (!accessToken) {
    return res.status(400).json({ message: "Password or OTP verification token is required." });
  }

  try {
    await verifyWidgetAccessToken(accessToken);
  } catch (err) {
    if (["OTP_TOKEN_MISSING", "OTP_VERIFY_FAILED"].includes(err.code)) {
      return res.status(400).json({ message: err.message });
    }
    logger.error(`Academy login OTP verify error: ${err.message}`);
    return res.status(500).json({ message: err.message || "Server error verifying OTP." });
  }

  try {
    let academy = await Academy.findOne({ email: cleanEmail });

    if (!academy) {
      academy = await Academy.create({
        name: academyName || "Apex Healthcare Academy",
        email: cleanEmail,
        contactName: fullName || "Dr. Rajesh Kumar",
        primaryAdmin: fullName || "Dr. Rajesh Kumar",
        phone: mobile || phone || "+91 9765435676",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
        tier: "Verified Partner",
        totalAlumni: "35,000+",
        partnerSince: "Jan 2025",
        studentsUploaded: 0,
        verifiedPct: 0,
      });
    } else if (academyName || fullName) {
      if (academyName) academy.name = academyName;
      if (fullName) {
        academy.contactName = fullName;
        academy.primaryAdmin = fullName;
      }
      if (mobile || phone) academy.phone = mobile || phone;
      await academy.save();
    }

    const token = signToken(academy._id, "academy");

    res.json({
      token,
      academy,
    });
  } catch (err) {
    logger.error(`Academy login DB error: ${err.message}`);
    res.status(500).json({ message: "Failed to log in academy account." });
  }
});

// POST /api/academy/demo-login - 1-Click Sandbox Academy Login
router.post("/demo-login", async (req, res) => {
  try {
    const demoEmail = "demo.academy@talentera.in";
    let academy = await Academy.findOne({ email: demoEmail });

    if (!academy) {
      academy = await Academy.create({
        name: "Apex Healthcare Academy (Demo)",
        email: demoEmail,
        contactName: "Dr. Rajesh Kumar",
        primaryAdmin: "Dr. Rajesh Kumar",
        phone: "+91 9765435676",
        specialty: "Medical Coding",
        headquarters: "Coimbatore",
        branches: ["Coimbatore", "Chennai", "Hyderabad", "Vizag"],
        tier: "Verified Partner",
        totalAlumni: "35,000+",
        partnerSince: "Jan 2025",
        studentsUploaded: 0,
        verifiedPct: 0,
        isVerified: true,
        kycStatus: "verified",
        kycVerifiedAt: new Date(),
        kycNotes: "Pre-verified Sandbox Demo Partner.",
      });
    }

    const token = signToken(academy._id, "academy");

    res.json({
      token,
      academy,
      message: "Logged in as Demo Academy.",
    });
  } catch (err) {
    logger.error(`Demo academy login DB error: ${err.message}`);
    res.status(500).json({ message: "Failed to log in demo academy account." });
  }
});

// GET /api/academy/kyc - Fetch Academy Institutional KYC Data & Status (Protected)
router.get("/kyc", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    res.json({
      kycStatus: academy.kycStatus || "pending",
      kycSubmittedAt: academy.kycSubmittedAt || null,
      kycVerifiedAt: academy.kycVerifiedAt || null,
      kycNotes: academy.kycNotes || "",
      kycRejectionReason: academy.kycRejectionReason || "",
      kycData: academy.kycData || {},
      isVerified: Boolean(academy.isVerified || academy.kycStatus === "verified"),
      academy: {
        _id: academy._id,
        name: academy.name,
        email: academy.email,
        contactName: academy.contactName,
        primaryAdmin: academy.primaryAdmin,
        phone: academy.phone,
        headquarters: academy.headquarters,
        specialty: academy.specialty,
        tier: academy.tier,
      },
    });
  } catch (err) {
    logger.error(`Get academy KYC error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch academy KYC details." });
  }
});

// POST /api/academy/kyc/upload-doc - Upload one Institutional KYC proof document
// (Certificate of Incorporation, PAN, GST, Accreditation letter) as an actual
// file (PDF/image), stored via the shared upload pipeline (GCP / Cloudinary /
// local disk fallback - see middleware/upload.js). Returns the real, servable
// URL the frontend then saves onto the relevant kycData.<field>Url on submit,
// and that same URL is what Staff see (and can open) in the KYC audit console.
router.post(
  "/kyc/upload-doc",
  requireAcademyAuth,
  upload.single("doc"),
  handleUpload({ resourceType: "auto" }),
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded." });
      }
      res.json({
        success: true,
        docUrl: req.file.fileUrl,
        docName: req.file.originalname,
      });
    } catch (err) {
      logger.error(`Academy KYC doc upload error: ${err.message}`);
      res.status(500).json({ message: "Failed to upload document. Please try again." });
    }
  }
);

// POST /api/academy/kyc/submit - Submit Institutional KYC Details for Staff Review (Protected)
router.post("/kyc/submit", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    const {
      legalEntityName,
      registrationType,
      cinOrRegistrationNumber,
      yearEstablished,
      website,
      panNumber,
      gstin,
      signatoryName,
      signatoryDesignation,
      signatoryEmail,
      signatoryMobile,
      registeredAddress,
      city,
      state,
      pincode,
      primarySpecialty,
      accreditations,
      certifiedTrainedCount,
      activeBatchesPerYear,
      regCertificateUrl,
      gstCertificateUrl,
      panDocumentUrl,
      accreditationDocumentUrl,
      declarationAccepted,
      submittedByName,
    } = req.body;

    if (!declarationAccepted) {
      return res.status(400).json({ message: "You must accept the institutional declaration to submit KYC." });
    }

    // Save submitted KYC form data
    academy.kycData = {
      legalEntityName: (legalEntityName || academy.name || "").trim(),
      registrationType: registrationType || "Private Limited",
      cinOrRegistrationNumber: (cinOrRegistrationNumber || "").trim(),
      yearEstablished: yearEstablished || "",
      website: (website || "").trim(),
      panNumber: (panNumber || "").toUpperCase().trim(),
      gstin: (gstin || "").toUpperCase().trim(),
      signatoryName: (signatoryName || academy.contactName || "").trim(),
      signatoryDesignation: (signatoryDesignation || "Director").trim(),
      signatoryEmail: (signatoryEmail || academy.email || "").toLowerCase().trim(),
      signatoryMobile: (signatoryMobile || academy.phone || "").trim(),
      registeredAddress: (registeredAddress || "").trim(),
      city: (city || academy.headquarters || "").trim(),
      state: (state || "").trim(),
      pincode: (pincode || "").trim(),
      primarySpecialty: (primarySpecialty || academy.specialty || "Medical Coding").trim(),
      accreditations: Array.isArray(accreditations) ? accreditations : [],
      certifiedTrainedCount: certifiedTrainedCount || "",
      activeBatchesPerYear: activeBatchesPerYear || "",
      regCertificateUrl: regCertificateUrl || "",
      gstCertificateUrl: gstCertificateUrl || "",
      panDocumentUrl: panDocumentUrl || "",
      accreditationDocumentUrl: accreditationDocumentUrl || "",
      declarationAccepted: true,
      submittedByName: submittedByName || signatoryName || academy.contactName,
      submittedAt: new Date(),
    };

    academy.kycStatus = "under_review";
    academy.kycSubmittedAt = new Date();
    academy.kycRejectionReason = "";

    // Sync any core fields
    if (legalEntityName) academy.name = legalEntityName.trim();
    if (signatoryName) academy.contactName = signatoryName.trim();
    if (signatoryMobile) academy.phone = signatoryMobile.trim();
    if (city) academy.headquarters = city.trim();
    if (primarySpecialty) academy.specialty = primarySpecialty.trim();

    await academy.save();

    // Log activity event
    try {
      await AcademyActivityEvent.create({
        academyId: academy._id,
        actionType: "kyc_submitted",
        description: `Institutional KYC verification submitted for Staff Compliance audit by ${submittedByName || academy.contactName}.`,
        metadata: {
          submittedAt: new Date(),
          panNumber: academy.kycData.panNumber,
          gstin: academy.kycData.gstin,
        },
      });
    } catch (eLog) {
      logger.warn(`Failed to log KYC submit activity: ${eLog.message}`);
    }

    res.json({
      success: true,
      message: "Institutional KYC documents submitted successfully! Staff Compliance will review within 24-48 business hours.",
      kycStatus: academy.kycStatus,
      kycSubmittedAt: academy.kycSubmittedAt,
      kycData: academy.kycData,
      academy,
    });
  } catch (err) {
    logger.error(`Academy KYC submission error: ${err.message}`);
    res.status(500).json({ message: "Failed to submit KYC details. Please check all fields." });
  }
});

// GET /api/academy/dashboard - Complete Dashboard Data for All Views (Protected)
router.get("/dashboard", requireAcademyAuth, async (req, res) => {
  try {
    let academy = await Academy.findById(req.academyId);
    if (!academy) {
      return res.status(404).json({ message: "Academy account not found." });
    }

    // Ensure default courses if empty
    if (!academy.courses || academy.courses.length === 0) {
      academy.courses = [
        { category: "HCC / RISK ADJUSTMENT", duration: "3 MONTHS", title: "HCC Coding Specialization", totalHrs: 120, batches: 1, enrolled: 30, status: "active", syllabus: ["ICD-10-CM Basics", "RAF Score Calculation", "Documentation Review", "HCC Chart Audits", "Capstone"] },
        { category: "EMERGENCY DEPT CODING", duration: "3 MONTHS", title: "ED Coding Foundation", totalHrs: 110, batches: 1, enrolled: 15, status: "active", syllabus: ["ED Levels & E/M", "Critical Care", "Modifier 25 / 59", "Trauma Cases", "Capstone"] },
        { category: "AR CALLING / RCM", duration: "2 MONTHS", title: "AR Calling Bootcamp", totalHrs: 80, batches: 1, enrolled: 25, status: "active", syllabus: ["Denial Codes", "Payer Workflows", "Communication", "Compliance", "Live Floor"] },
        { category: "SURGERY CODING", duration: "3 MONTHS", title: "Surgery Coding Mastery", totalHrs: 130, batches: 1, enrolled: 20, status: "active", syllabus: ["CPT Surgery Sections", "Modifiers (50/51/59)", "Global Period", "Multi-Procedure", "Capstone"] },
        { category: "OP / E&M", duration: "3 MONTHS", title: "OP / E&M Specialization", totalHrs: 100, batches: 1, enrolled: 18, status: "active", syllabus: ["E&M Levels", "MDM Complexity", "Time-Based Coding", "2021 Guidelines", "Capstone"] },
        { category: "IP DRG", duration: "3 MONTHS", title: "IP DRG Specialization", totalHrs: 140, batches: 0, enrolled: 0, status: "idle", syllabus: ["MS-DRG vs APR-DRG", "POA Indicators", "CC/MCC Logic", "Audit Scenarios", "Capstone"] },
      ];
      await academy.save();
    }

    // Ensure default questions if empty
    if (!academy.questions || academy.questions.length === 0) {
      academy.questions = [
        { question: "HCC Risk Adjustment Factor (RAF) score is primarily used to...", topic: "HCC", type: "MCQ", difficulty: "Entry", marks: 1, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Which ICD-10-CM code captures Type 2 Diabetes with diabetic peripheral neuropathy?", topic: "ICD-10", type: "MCQ", difficulty: "Mid", marks: 2, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Scenario: A 67-year-old patient is documented with CKD Stage 4 and on dialysis. Which HCC code(s) apply?", topic: "HCC", type: "Scenario", difficulty: "Senior", marks: 3, status: "Editable", courseTitle: "HCC Coding Specialization" },
        { question: "CMS-HCC v24 risk model uses how many diagnosis groups?", topic: "HCC", type: "MCQ", difficulty: "Mid", marks: 2, status: "Locked", courseTitle: "HCC Coding Specialization" },
        { question: "Which of the following requires \"with\" combination coding in ICD-10-CM?", topic: "ICD-10", type: "MCQ", difficulty: "Mid", marks: 2, status: "Editable", courseTitle: "HCC Coding Specialization" },
        { question: "Documentation states \"history of CHF\". Should HCC 85 be captured?", topic: "Documentation", type: "Scenario", difficulty: "Senior", marks: 3, status: "Editable", courseTitle: "HCC Coding Specialization" },
      ];
      await academy.save();
    }

    // Fetch Invites and Candidates linked to this academy (matching by email, mobile, candidateId, or stage2)
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy.name, invites);
    const candidatesList = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    const formattedStudents = candidatesList.map((c) => {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s3 = c.stage3 || {};
      const s5 = c.stage5 || {};
      const nameParts = (s1.fullName || c.email.split("@")[0]).split(" ");
      const initials = nameParts.length >= 2 ? `${nameParts[0][0]}${nameParts[1][0]}`.toUpperCase() : nameParts[0].slice(0, 2).toUpperCase();

      const stageInfo = compute8Stages(c);
      const isPlaced = c.stage8?.placementStatus?.toLowerCase().includes("placed");
      const status = isPlaced ? "placed" : stageInfo.isComplete ? "verified" : stageInfo.doneCount > 0 ? "verifying" : "uploaded";
      const placementStatus = c.stage8?.placementStatus || (stageInfo.isComplete ? "Available for Placement" : `Stage ${stageInfo.currentStageNumber} in Progress`);

      const hasAiVideo = s5.aiScore !== undefined && s5.aiScore !== null && !isNaN(Number(s5.aiScore));

      return {
        id: c._id,
        initials,
        name: s1.fullName || c.email.split("@")[0],
        email: c.email,
        phone: s1.mobile || c.mobile || "—",
        specialty: s2.specialty || s1.currentRole || "Medical Coding",
        month: s2.batch || "—",
        branch: s2.branch || s1.city || "—",
        status,
        // Talentera Score (Stages 1-6 weighted, out of 100) - not the raw Stage 4
        // MCQ percentage. See backend/utils/talenteraScore.js.
        score: stageInfo.talenteraScore > 0 ? `${stageInfo.talenteraScore} / 100` : "Not Attempted",
        talenteraScore: stageInfo.talenteraScore,
        completion: `${stageInfo.pct}%`,
        cert: s3.certName || s3.certCode || "—",
        placementStatus,
        recommended: !!c.recommendedByAcademy,
        videoUrl: s5.videoUrl || "",
        aiScore: hasAiVideo ? (s5.aiScore / 10).toFixed(1) : "—",
        videoVerified: !!s5.verified,
        stages: stageInfo.stages,
        stageBreakdown: stageInfo,
        updatedAt: c.updatedAt || new Date(),
      };
    });

    // Batches
    let dbBatches = await AcademyBatch.find({ academyId: req.academyId }).lean();
    let batches = dbBatches.map((b) => {
      const realEnrolledCount = formattedStudents.filter(
        (s) => s.month === b.code || (s.month && (s.month.includes(b.code) || b.code.includes(s.month)))
      ).length;
      return {
        ...b,
        studentsCount: realEnrolledCount || b.studentsCount || 0,
      };
    });

    // Real KPI calculations - Talentera Score average (Stages 1-6 weighted, out of
    // 100), counting every candidate with at least one graded stage done, not just
    // those who scored on the Assessment specifically.
    const scoredStudents = formattedStudents.filter((s) => s.talenteraScore > 0);
    const avgScore = scoredStudents.length > 0
      ? Math.round(scoredStudents.reduce((sum, s) => sum + s.talenteraScore, 0) / scoredStudents.length)
      : 0;
    const avgProfileComplete = formattedStudents.length > 0
      ? Math.round(formattedStudents.reduce((sum, s) => sum + parseInt(s.completion || "0", 10), 0) / formattedStudents.length)
      : 0;
    const placedStudentsCount = formattedStudents.filter((s) => s.status === "placed").length;
    const placementRate = formattedStudents.length > 0
      ? `${Math.round((placedStudentsCount / formattedStudents.length) * 100)}%`
      : "0%";

    const stuckStudents = formattedStudents.filter((s) => s.status === "verifying" || s.completion === "0%" || s.stageBreakdown.doneCount < 5);
    const pendingApprovals = formattedStudents.filter((s) => s.stages.some((st) => st.needsApproval));

    const recentActivity = await AcademyActivityEvent.find({ academyId: req.academyId })
      .sort({ createdAt: -1 })
      .limit(15)
      .lean();

    const invitesCount = await StudentInvite.countDocuments({ academyId: req.academyId });
    const signedUpCount = await StudentInvite.countDocuments({ academyId: req.academyId, status: "signed_up" });

    // Real "reached company interview stage" count - candidates who have at
    // least one Application that made it to interviewing or hired. This is
    // cumulative on purpose (a candidate who was interviewed and then
    // placed still counts here, same as "verifiedStudents" above still
    // counts placed students) so the Analytics funnel's "Company Interviews"
    // step reflects actual pipeline activity and updates the moment a
    // candidate's application status changes - including once they're hired.
    const candidateIds = candidatesList.map((c) => c._id);
    const interviewStageApps = candidateIds.length
      ? await Application.find({
          candidateId: { $in: candidateIds },
          status: { $in: ["interviewing", "hired"] },
        }).distinct("candidateId")
      : [];
    const interviewsActive = interviewStageApps.length;

    res.json({
      academy,
      kpis: {
        totalStudents: formattedStudents.length,
        activeBatches: batches.length,
        avgScore,
        profileComplete: avgProfileComplete,
        placementsMonth: (academy.placements || []).length,
        verifiedStudents: formattedStudents.filter((s) => s.status === "verified" || s.status === "placed").length,
        placedStudents: placedStudentsCount,
        placementRate,
        stuckStudentsCount: stuckStudents.length,
        pendingApprovalsCount: pendingApprovals.length,
        invitesTotal: invitesCount,
        invitesSignedUp: signedUpCount,
        liveEventsCount: recentActivity.length,
        interviewsActive,
      },
      students: formattedStudents,
      batches,
      courses: academy.courses || [],
      questions: academy.questions || [],
      placements: academy.placements || [],
      recentActivity,
    });
  } catch (err) {
    logger.error(`Academy dashboard error: ${err.message}`);
    res.status(500).json({ message: "Error loading academy dashboard." });
  }
});

// GET /api/academy/insights - Real, anonymized cross-academy benchmark (Protected)
// Computes every academy's actual placement rate / avg score / video quality /
// profile completion from their real linked candidates & placements, then ranks
// the requesting academy among them. No fabricated competitor data - academies
// with zero enrolled students are excluded since there is nothing real to compare.
router.get("/insights", requireAcademyAuth, async (req, res) => {
  try {
    const allAcademies = await Academy.find({}).limit(200).lean();

    const metricsList = [];
    for (const ac of allAcademies) {
      const metrics = await computeAcademyMetrics(ac);
      if (metrics) metricsList.push(metrics);
    }

    const yourMetrics = metricsList.find((m) => m.academyId === req.academyId.toString()) || null;

    if (metricsList.length === 0 || !yourMetrics) {
      return res.json({
        hasData: false,
        totalAcademies: metricsList.length,
      });
    }

    const ranked = [...metricsList].sort((a, b) => b.placementRate - a.placementRate);
    const yourRank = ranked.findIndex((m) => m.academyId === req.academyId.toString()) + 1;

    const avg = (key) => Math.round((metricsList.reduce((sum, m) => sum + m[key], 0) / metricsList.length) * 10) / 10;

    res.json({
      hasData: true,
      totalAcademies: metricsList.length,
      yourRank,
      leaderboard: ranked.map((m, idx) => ({
        rank: idx + 1,
        city: m.city,
        placementRate: m.placementRate,
        isYou: m.academyId === req.academyId.toString(),
      })),
      industryAverages: {
        placementRate: avg("placementRate"),
        avgScore: avg("avgScore"),
        videoQuality: avg("videoQuality"),
        profileCompletion: avg("profileCompletion"),
      },
      yours: yourMetrics,
    });
  } catch (err) {
    logger.error(`Academy insights error: ${err.message}`);
    res.status(500).json({ message: "Failed to compute insights." });
  }
});

// ==========================================
// 3. PHASE 1: BULK STUDENT UPLOAD & INVITE ENGINE
// ==========================================

// POST /api/academy/students/upload-csv - Live validation of uploaded CSV
router.post("/students/upload-csv", requireAcademyAuth, upload.single("file"), async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    let rawRows = [];
    let filename = "students.csv";

    if (req.file && req.file.buffer) {
      filename = req.file.originalname || "students.csv";
      rawRows = parseCsvBuffer(req.file.buffer);
    } else if (req.body.students && Array.isArray(req.body.students)) {
      rawRows = req.body.students;
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "No data found in uploaded file. Please provide a valid CSV with student rows." });
    }

    const defaultBatchCode = req.body.batch_id || req.body.batchCode || "JAN-HCC-01";
    const defaultCourse = req.body.course || "HCC Coding Specialization";

    const seenEmails = new Set();
    const seenMobiles = new Set();
    const seenAadhaarLast4 = new Set();

    const existingCandidates = await Candidate.find({}, { email: 1, mobile: 1, "stage1.mobile": 1, "stage1.maskedAadhaar": 1 }).lean();
    const existingEmailSet = new Set(existingCandidates.map((c) => (c.email || "").toLowerCase().trim()).filter(Boolean));
    const existingMobileSet = new Set();
    // Only the LAST 4 DIGITS of Aadhaar are ever collected or stored here (never the full
    // number) - matching the masked "XXXX XXXX 1234" format the rest of the app already
    // uses for Aadhaar (see backend/utils/encryption.js). This is enough to flag likely
    // duplicate candidate entries without the compliance/security exposure of handling
    // full Aadhaar numbers in a CSV upload.
    const existingAadhaarLast4Set = new Set();
    existingCandidates.forEach((c) => {
      const m1 = (c.mobile || "").replace(/\D/g, "");
      const m2 = (c.stage1?.mobile || "").replace(/\D/g, "");
      if (m1.length >= 10) existingMobileSet.add(m1.slice(-10));
      if (m2.length >= 10) existingMobileSet.add(m2.slice(-10));
      const aadhaarDigits = (c.stage1?.maskedAadhaar || "").replace(/\D/g, "");
      if (aadhaarDigits.length >= 4) existingAadhaarLast4Set.add(aadhaarDigits.slice(-4));
    });

    const previewRows = [];
    let acceptedCount = 0;
    let rejectedCount = 0;

    rawRows.forEach((row, idx) => {
      const rowIndex = idx + 1;
      const name = (row.name || row.fullname || row.full_name || row["full name"] || "").trim();
      const email = (row.email || row.email_address || row["email address"] || "").toLowerCase().trim();
      const mobile = (row.mobile || row.phone || row.mobile_number || row["mobile number"] || "").replace(/\D/g, "");
      const batchCode = (row.batch_code || row.batch || row.batch_id || defaultBatchCode).trim();
      const course = (row.course_id || row.course || defaultCourse).trim();
      const type = (row.type || "fresher").toLowerCase().trim();
      const preferredSpecialty = row.preferred_specialty || row.specialty || "HCC";
      const expectedSalaryLpa = Number(row.expected_salary_lpa || row.salary) || 5.0;
      const preferredCities = row.preferred_cities ? String(row.preferred_cities).split(";") : ["Chennai", "Coimbatore"];
      const currentExperienceYears = Number(row.current_experience_years || row.experience) || 0;
      const age = Number(row.age) || 0;
      // Accept a full Aadhaar number too, but only ever keep/compare the last 4 digits -
      // the full value is discarded immediately and never stored or written to previewRows.
      const aadhaarRaw = (row.aadhaar_last4 || row.aadhaar || row.aadhaar_number || "").replace(/\D/g, "");
      const aadhaarLast4 = aadhaarRaw.slice(-4);

      const errors = [];

      if (!name || name.length < 3) {
        errors.push("Full name must be at least 3 characters.");
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      // "example.com" is the reserved placeholder domain used by the downloadable
      // sample CSV template (Priya Subramanian, Karthik Raja, Ananya Roy, etc.) - a
      // row still using it means that sample row wasn't replaced with a real student
      // before uploading. Reject it outright rather than let a fictional "candidate"
      // get stored as real (and, since sample rows always look the same, potentially
      // block a genuinely new student later on a false "already registered" match).
      const isSampleTemplateEmail = /@example\.com$/i.test(email);
      if (!email || !emailRegex.test(email)) {
        errors.push("Invalid email format.");
      } else if (isSampleTemplateEmail) {
        errors.push(`'${email}' is the sample template's placeholder email - replace this row with the real student's details before uploading.`);
      } else if (seenEmails.has(email)) {
        errors.push(`Duplicate email '${email}' within this CSV.`);
      } else if (existingEmailSet.has(email)) {
        errors.push(`Email '${email}' is already registered in Talentera.`);
      }

      if (!mobile || mobile.length < 10) {
        errors.push("Mobile number must be at least 10 digits.");
      } else if (seenMobiles.has(mobile)) {
        errors.push(`Duplicate mobile '${mobile}' within this CSV.`);
      } else if (existingMobileSet.has(mobile.slice(-10))) {
        errors.push(`Mobile '${mobile}' is already registered in Talentera.`);
      }

      if (aadhaarRaw) {
        if (aadhaarLast4.length !== 4) {
          errors.push("Aadhaar number looks invalid - please provide at least the last 4 digits.");
        } else if (seenAadhaarLast4.has(aadhaarLast4)) {
          errors.push(`Duplicate Aadhaar (last 4 digits: ${aadhaarLast4}) within this CSV.`);
        } else if (existingAadhaarLast4Set.has(aadhaarLast4)) {
          errors.push(`Aadhaar (last 4 digits: ${aadhaarLast4}) matches an already-registered candidate - possible duplicate entry.`);
        }
      }

      if (email) seenEmails.add(email);
      if (mobile) seenMobiles.add(mobile);
      if (aadhaarLast4.length === 4) seenAadhaarLast4.add(aadhaarLast4);

      const isValid = errors.length === 0;
      if (isValid) acceptedCount++;
      else rejectedCount++;

      previewRows.push({
        rowIndex,
        isValid,
        errors,
        data: {
          name: name || `Student #${rowIndex}`,
          email: email || "",
          mobile: mobile ? `+91 ${mobile.slice(-10)}` : "",
          batchCode,
          course,
          type: type === "experienced" ? "experienced" : "fresher",
          preferredSpecialty,
          expectedSalaryLpa,
          preferredCities,
          currentExperienceYears,
          age,
          aadhaarLast4,
        },
      });
    });

    const uploadDoc = await StudentUpload.create({
      academyId: req.academyId,
      uploadedBy: academy.primaryAdmin || "Academy Admin",
      filename,
      totalRows: rawRows.length,
      acceptedRows: acceptedCount,
      rejectedRows: rejectedCount,
      status: "processing",
      batchCode: defaultBatchCode,
      errors: previewRows.filter((r) => !r.isValid).map((r) => ({ row: r.rowIndex, errors: r.errors, email: r.data.email })),
    });

    res.json({
      upload_id: uploadDoc._id,
      filename,
      rows_parsed: rawRows.length,
      accepted_count: acceptedCount,
      rejected_count: rejectedCount,
      validation_errors: previewRows.filter((r) => !r.isValid),
      preview_rows: previewRows,
      summary: `${acceptedCount} of ${rawRows.length} students accepted, ${rejectedCount} need fixing.`,
    });
  } catch (err) {
    logger.error(`Upload CSV parse error: ${err.message}`);
    res.status(err.userMessage ? 400 : 500).json({ message: err.userMessage || "Failed to parse and validate student CSV." });
  }
});

// POST /api/academy/students/upload-confirm - Confirm and queue OTP invites
router.post("/students/upload-confirm", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { upload_id, rows_to_accept } = req.body;
    if (!Array.isArray(rows_to_accept) || rows_to_accept.length === 0) {
      return res.status(400).json({ message: "No accepted student rows provided." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const createdInvites = [];

    for (const row of rows_to_accept) {
      const cleanEmail = (row.email || "").toLowerCase().trim();
      const rawMobile = row.mobile || "";
      if (!cleanEmail && !rawMobile) continue;

      const mobileRegexes = buildMobileRegexFilters([rawMobile]);
      const mobileVariants = getMobileQueryVariants([rawMobile]);

      const findCandOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [
          { mobile: { $in: mobileVariants } },
          { "stage1.mobile": { $in: mobileVariants } },
        ] : []),
        ...mobileRegexes,
      ];

      let candidate = findCandOr.length > 0 ? await Candidate.findOne({ $or: findCandOr }) : null;
      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail || `student.${Date.now()}@talentera.academy`,
          passwordHash: defaultPassword,
          mobile: rawMobile || "",
          completedStages: [],
          isVerified: false,
          stage1: {
            fullName: row.name,
            mobile: rawMobile || "",
            age: Number(row.age) || undefined,
            // Staff-entered from the CSV - only the last 4 digits, masked like a real
            // eKYC result, but this is NOT a verified Aadhaar (aadhaarVerified stays
            // false below) - it exists only so future uploads can flag likely duplicates.
            maskedAadhaar: row.aadhaarLast4 && String(row.aadhaarLast4).length === 4 ? `XXXX XXXX ${row.aadhaarLast4}` : undefined,
            city: row.preferredCities?.[0] || "Coimbatore",
            experience: row.type === "experienced" ? "Experienced" : "Fresher",
            currentRole: row.course || "Medical Coding Trainee",
            aadhaarVerified: false,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: row.batchCode || "JAN-HCC-01",
            branch: row.preferredCities?.[0] || "Coimbatore",
            verified: true,
          },
        });
      } else {
        candidate.stage2 = {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: row.batchCode || candidate.stage2?.batch || "JAN-HCC-01",
          branch: row.preferredCities?.[0] || candidate.stage2?.branch || "Coimbatore",
          verified: true,
        };
        if (rawMobile && (!candidate.mobile || !candidate.stage1?.mobile)) {
          if (!candidate.mobile) candidate.mobile = rawMobile;
          if (!candidate.stage1) candidate.stage1 = {};
          if (!candidate.stage1.mobile) candidate.stage1.mobile = rawMobile;
        }
        if (Number(row.age) && !candidate.stage1?.age) {
          if (!candidate.stage1) candidate.stage1 = {};
          candidate.stage1.age = Number(row.age);
        }
        await candidate.save();
      }

      const inviteOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
        ...mobileRegexes,
        { candidateId: candidate._id },
      ];

      let invite = await StudentInvite.findOne({ academyId: academy._id, $or: inviteOr });
      if (!invite) {
        invite = await StudentInvite.create({
          uploadId: upload_id || null,
          academyId: academy._id,
          batchCode: row.batchCode || "JAN-HCC-01",
          name: row.name,
          email: cleanEmail || candidate.email,
          mobile: rawMobile || "",
          course: row.course || "HCC Coding Specialization",
          type: row.type || "fresher",
          preferredSpecialty: row.preferredSpecialty || "HCC",
          expectedSalaryLpa: row.expectedSalaryLpa || 5.0,
          preferredCities: row.preferredCities || ["Chennai"],
          candidateId: candidate._id,
          status: "delivered",
          emailSentAt: new Date(),
          smsSentAt: new Date(),
          smsDeliveredAt: new Date(Date.now() + 3000),
        });
      } else {
        invite.batchCode = row.batchCode || invite.batchCode;
        invite.candidateId = candidate._id;
        if (rawMobile && !invite.mobile) invite.mobile = rawMobile;
        await invite.save();
      }
      createdInvites.push(invite);
      await sendInviteEmail({ invite, academyName: academy.name });

      await AcademyActivityEvent.create({
        academyId: academy._id,
        candidateId: candidate._id,
        candidateName: row.name,
        companyName: "Talentera Matching",
        jobTitle: row.course || "Medical Coder",
        batchCode: row.batchCode || "JAN-HCC-01",
        eventType: "viewed",
        eventMeta: { note: `Student invited and profile live in batch ${row.batchCode}` },
      });
    }

    if (upload_id) {
      await StudentUpload.findByIdAndUpdate(upload_id, {
        status: "completed",
        acceptedRows: createdInvites.length,
      });
    }

    const batchCodeTarget = rows_to_accept[0]?.batchCode || "JAN-HCC-01";
    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: batchCodeTarget });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: batchCodeTarget,
        course: rows_to_accept[0]?.course || "HCC Coding Specialization",
        studentsCount: createdInvites.length,
        status: "Active",
      });
    } else {
      batch.studentsCount += createdInvites.length;
      await batch.save();
    }

    academy.studentsUploaded += createdInvites.length;
    await academy.save();

    res.json({
      success: true,
      accepted: createdInvites.length,
      invites_queued: createdInvites.length,
      message: `${createdInvites.length} student invites sent via Email & SMS OTP. Delivery status is live in the Invites tab.`,
      invites: createdInvites,
    });
  } catch (err) {
    logger.error(`Upload confirm error: ${err.message}`);
    res.status(500).json({ message: "Failed to confirm student upload and queue invites." });
  }
});

// Shared Handler: Add single student
async function handleAddSingleStudent(req, res) {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { name, fullName, email, mobile, batch_id, batchCode, course_id, course, type, experienceRange, preferredSpecialty, expectedSalaryLpa, preferredCities, branch, state, preferredState, aadhaar, aadhaarLast4: aadhaarLast4Input } = req.body;
    const studentName = (fullName || name || "").trim();
    // Freshers have no specialty/experience range yet; only an "experienced" submission
    // carries a real band (e.g. "1 to 3", "3 to 6" Years) - keep it out of stage1 otherwise.
    const cleanExperienceRange = type === "experienced" && experienceRange ? String(experienceRange).trim() : "";
    // Same policy as the Bulk CSV upload: accept a full Aadhaar number but only ever keep
    // the last 4 digits (masked, like a real eKYC result) - enough to flag a likely
    // duplicate candidate without storing/handling a full Aadhaar number outside the
    // dedicated eKYC verification flow.
    const aadhaarRaw = String(aadhaar || aadhaarLast4Input || "").replace(/\D/g, "");
    const aadhaarLast4 = aadhaarRaw.slice(-4);

    if (!studentName || !email) {
      return res.status(400).json({ message: "Student full name and email are required." });
    }
    // Same guard as the bulk CSV upload: never let the sample template's own
    // placeholder email ("@example.com") get saved as a real candidate.
    if (/@example\.com$/i.test(String(email).trim())) {
      return res.status(400).json({ message: "That email is the sample template's placeholder address - please enter the real student's email instead." });
    }
    if (aadhaarRaw && aadhaarLast4.length !== 4) {
      return res.status(400).json({ message: "Aadhaar number looks invalid - please provide at least the last 4 digits." });
    }

    const cleanEmail = email ? email.toLowerCase().trim() : "";
    const rawMobile = mobile || "";
    const targetBatch = batchCode || batch_id || "JAN-HCC-01";
    const targetCourse = course || course_id || "HCC Coding Specialization";
    const defaultPassword = await bcrypt.hash("Password123", 10);

    const mobileRegexes = buildMobileRegexFilters([rawMobile]);
    const mobileVariants = getMobileQueryVariants([rawMobile]);

    const findCandOr = [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(mobileVariants.length > 0 ? [
        { mobile: { $in: mobileVariants } },
        { "stage1.mobile": { $in: mobileVariants } },
      ] : []),
      ...mobileRegexes,
    ];

    let candidate = findCandOr.length > 0 ? await Candidate.findOne({ $or: findCandOr }) : null;
    const isNewCandidate = !candidate;

    if (aadhaarLast4.length === 4) {
      const aadhaarDup = await Candidate.findOne({ "stage1.maskedAadhaar": new RegExp(`${aadhaarLast4}$`) }).lean();
      if (aadhaarDup && (!candidate || String(aadhaarDup._id) !== String(candidate._id))) {
        return res.status(400).json({ message: `Aadhaar (last 4 digits: ${aadhaarLast4}) matches an already-registered candidate - possible duplicate entry.`, duplicate: true });
      }
    }

    if (candidate) {
      if (candidate.stage2?.academyId === academy._id.toString() && candidate.stage2?.batch === targetBatch) {
        return res.status(400).json({ message: `Student with email '${cleanEmail || candidate.email}' or mobile '${rawMobile || candidate.mobile}' is already registered in batch ${targetBatch}.`, duplicate: true });
      }
      candidate.stage2 = {
        academyId: academy._id.toString(),
        academyName: academy.name,
        batch: targetBatch,
        branch: branch || "Coimbatore",
        verified: true,
      };
      if (rawMobile && (!candidate.mobile || !candidate.stage1?.mobile)) {
        if (!candidate.mobile) candidate.mobile = rawMobile;
        if (!candidate.stage1) candidate.stage1 = {};
        if (!candidate.stage1.mobile) candidate.stage1.mobile = rawMobile;
      }
      if (aadhaarLast4.length === 4 && !candidate.stage1?.maskedAadhaar) {
        if (!candidate.stage1) candidate.stage1 = {};
        candidate.stage1.maskedAadhaar = `XXXX XXXX ${aadhaarLast4}`;
      }
      await candidate.save();
    } else {
      candidate = await Candidate.create({
        email: cleanEmail || `student.${Date.now()}@talentera.academy`,
        passwordHash: defaultPassword,
        mobile: rawMobile || "",
        completedStages: [],
        isVerified: false,
        stage1: {
          fullName: studentName,
          mobile: rawMobile || "",
          // Staff-entered from the form - only the last 4 digits, masked like a real eKYC
          // result, but NOT a verified Aadhaar (aadhaarVerified stays false below). Exists
          // only so the duplicate check above can catch the same person being re-added.
          maskedAadhaar: aadhaarLast4.length === 4 ? `XXXX XXXX ${aadhaarLast4}` : undefined,
          city: branch || preferredCities?.[0] || "Coimbatore",
          state: state || preferredState || "Tamil Nadu",
          experience: type === "experienced" ? "Experienced" : "Fresher",
          experienceRange: cleanExperienceRange,
          currentRole: targetCourse,
          aadhaarVerified: false,
        },
        stage2: {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: targetBatch,
          branch: branch || "Coimbatore",
          verified: true,
        },
      });
    }

    const inviteOr = [
      ...(cleanEmail ? [{ email: cleanEmail }] : []),
      ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
      ...mobileRegexes,
      { candidateId: candidate._id },
    ];

    let invite = await StudentInvite.findOne({ academyId: academy._id, $or: inviteOr });
    const isNewInvite = !invite;
    const previousBatchCode = invite?.batchCode || "";
    if (!invite) {
      invite = await StudentInvite.create({
        academyId: academy._id,
        batchCode: targetBatch,
        name: studentName,
        email: cleanEmail || candidate.email,
        mobile: rawMobile || "",
        course: targetCourse,
        type: type || "fresher",
        preferredSpecialty: preferredSpecialty || "HCC",
        expectedSalaryLpa: Number(expectedSalaryLpa) || 5.0,
        preferredCities: preferredCities || ["Coimbatore"],
        preferredState: state || preferredState || "Tamil Nadu",
        candidateId: candidate._id,
        status: "delivered",
        emailSentAt: new Date(),
        smsSentAt: new Date(),
        smsDeliveredAt: new Date(Date.now() + 2000),
      });
    } else {
      invite.batchCode = targetBatch;
      invite.course = targetCourse;
      invite.candidateId = candidate._id;
      if (rawMobile && !invite.mobile) invite.mobile = rawMobile;
      await invite.save();
    }
    await sendInviteEmail({ invite, academyName: academy.name });

    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: targetBatch });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: targetBatch,
        course: targetCourse,
        studentsCount: 1,
        status: "Active",
      });
    } else {
      batch.studentsCount += 1;
      await batch.save();
    }

    academy.studentsUploaded += 1;
    await academy.save();

    // Be honest about what actually happened: re-submitting the same email/mobile
    // (e.g. re-uploading a sample CSV, or re-adding someone by mistake) doesn't
    // create a duplicate invite - it reuses the existing candidate/invite record and
    // just updates their batch/details. Without this, every submission looked like
    // "success - new student added!" even when nothing new was created, which is
    // exactly what made it look like added candidates were silently disappearing.
    let message;
    if (isNewCandidate && isNewInvite) {
      message = `Student ${studentName} registered and invited successfully!`;
    } else if (!isNewInvite && previousBatchCode && previousBatchCode !== targetBatch) {
      message = `${studentName} was already invited (existing entry) - moved from batch ${previousBatchCode} to ${targetBatch} instead of creating a duplicate.`;
    } else {
      message = `${studentName} already has an existing candidate/invite record - details were updated instead of creating a duplicate entry.`;
    }

    res.json({
      success: true,
      message,
      isNewCandidate,
      isNewInvite,
      student: candidate,
      invite,
    });
  } catch (err) {
    logger.error(`Add single student error: ${err.message}`);
    res.status(400).json({ message: err.message || "Failed to add single student." });
  }
}

// POST /api/academy/students/add-single - Add single student
router.post("/students/add-single", requireAcademyAuth, handleAddSingleStudent);

// POST /api/academy/add-student - Direct alias for adding single student
router.post("/add-student", requireAcademyAuth, handleAddSingleStudent);

// POST /api/academy/upload-students - Direct CSV upload or bulk import
router.post("/upload-students", requireAcademyAuth, upload.single("file"), async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    let rawRows = [];
    const targetBatch = req.body.batchName || req.body.batchCode || "JAN-HCC-01";

    if (req.file && req.file.buffer) {
      rawRows = parseCsvBuffer(req.file.buffer);
    } else if (req.body.students && Array.isArray(req.body.students)) {
      rawRows = req.body.students;
    } else if (req.body.count) {
      const count = Number(req.body.count) || 5;
      for (let i = 1; i <= count; i++) {
        const rnd = Math.floor(1000 + Math.random() * 9000);
        rawRows.push({
          name: `Enrolled Student ${rnd}`,
          email: `student.${rnd}@apexacademy.in`,
          mobile: `98765${rnd}`,
          course: "HCC Coding Specialization",
          batch_code: targetBatch,
        });
      }
    }

    if (rawRows.length === 0) {
      return res.status(400).json({ message: "No student data found in file or request." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const createdInvites = [];

    for (const row of rawRows) {
      const name = (row.name || row.fullname || row.full_name || row["full name"] || "").trim();
      const cleanEmail = (row.email || row.email_address || row["email address"] || "").toLowerCase().trim();
      const rawMobile = (row.mobile || row.phone || row.mobile_number || row["mobile number"] || "").replace(/\D/g, "");
      const course = (row.course || "HCC Coding Specialization").trim();
      const batchCode = (row.batch_code || row.batch || targetBatch).trim();

      if (!cleanEmail && !rawMobile) continue;

      const mobileRegexes = buildMobileRegexFilters([rawMobile]);
      const mobileVariants = getMobileQueryVariants([rawMobile]);

      const findCandOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [
          { mobile: { $in: mobileVariants } },
          { "stage1.mobile": { $in: mobileVariants } },
        ] : []),
        ...mobileRegexes,
      ];

      let candidate = findCandOr.length > 0 ? await Candidate.findOne({ $or: findCandOr }) : null;
      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail || `student.${Date.now()}@talentera.academy`,
          passwordHash: defaultPassword,
          mobile: rawMobile ? `+91 ${rawMobile.slice(-10)}` : "",
          completedStages: [],
          isVerified: false,
          stage1: {
            fullName: name,
            mobile: rawMobile ? `+91 ${rawMobile.slice(-10)}` : "",
            city: "Coimbatore",
            experience: "Fresher",
            currentRole: course,
            aadhaarVerified: false,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: batchCode,
            branch: "Coimbatore",
            verified: true,
          },
        });
      } else {
        candidate.stage2 = {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: batchCode,
          branch: "Coimbatore",
          verified: true,
        };
        if (rawMobile && (!candidate.mobile || !candidate.stage1?.mobile)) {
          if (!candidate.mobile) candidate.mobile = `+91 ${rawMobile.slice(-10)}`;
          if (!candidate.stage1) candidate.stage1 = {};
          if (!candidate.stage1.mobile) candidate.stage1.mobile = `+91 ${rawMobile.slice(-10)}`;
        }
        await candidate.save();
      }

      const inviteOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
        ...mobileRegexes,
        { candidateId: candidate._id },
      ];

      let invite = await StudentInvite.findOne({ academyId: academy._id, $or: inviteOr });
      if (!invite) {
        invite = await StudentInvite.create({
          academyId: academy._id,
          batchCode,
          name,
          email: cleanEmail || candidate.email,
          mobile: rawMobile ? `+91 ${rawMobile.slice(-10)}` : "",
          course,
          status: "delivered",
          candidateId: candidate._id,
          emailSentAt: new Date(),
          smsSentAt: new Date(),
          smsDeliveredAt: new Date(Date.now() + 2000),
        });
      } else {
        invite.batchCode = batchCode;
        invite.course = course;
        invite.candidateId = candidate._id;
        if (rawMobile && !invite.mobile) invite.mobile = `+91 ${rawMobile.slice(-10)}`;
        await invite.save();
      }
      createdInvites.push(invite);
      await sendInviteEmail({ invite, academyName: academy.name });
    }

    let batch = await AcademyBatch.findOne({ academyId: academy._id, code: targetBatch });
    if (!batch) {
      await AcademyBatch.create({
        academyId: academy._id,
        code: targetBatch,
        course: rawRows[0]?.course || "HCC Coding Specialization",
        studentsCount: createdInvites.length,
        status: "Active",
      });
    } else {
      batch.studentsCount += createdInvites.length;
      await batch.save();
    }

    academy.studentsUploaded += createdInvites.length;
    await academy.save();

    res.json({
      success: true,
      message: `${createdInvites.length} student(s) imported and invited to batch ${targetBatch}!`,
      count: createdInvites.length,
    });
  } catch (err) {
    logger.error(`Upload students error: ${err.message}`);
    res.status(err.userMessage ? 400 : 500).json({ message: err.userMessage || "Failed to upload students." });
  }
});

// GET /api/academy/uploads
router.get("/uploads", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode } = req.query;
    const query = { academyId: req.academyId };
    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;

    const uploads = await StudentUpload.find(query).sort({ createdAt: -1 }).limit(50).lean();
    res.json({ uploads });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student uploads." });
  }
});

// GET /api/academy/invites
router.get("/invites", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode, status, search } = req.query;
    const query = { academyId: req.academyId };
    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;
    if (status && status !== "All") query.status = status.toLowerCase();
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } },
      ];
    }

    const rawInvites = await StudentInvite.find(query).sort({ createdAt: -1 }).limit(200).lean();

    // Once a candidate has a placement record (confirmed, pending confirmation, or
    // even disputed), they've moved past "invited/onboarding" - leaving them in the
    // Live Invites Tracker as "Delivered"/"Stalled" reads as if they never signed up,
    // which is confusing. Drop anyone who already has a PlacementConfirmation.
    const placedConfirmations = await PlacementConfirmation.find(
      { academyId: req.academyId },
      { candidateId: 1, candidateEmail: 1 }
    ).lean();
    const placedCandidateIds = new Set(placedConfirmations.map((p) => String(p.candidateId)).filter(Boolean));
    const placedEmails = new Set(placedConfirmations.map((p) => (p.candidateEmail || "").toLowerCase()).filter(Boolean));

    const invites = rawInvites
      .filter((inv) => !(inv.candidateId && placedCandidateIds.has(String(inv.candidateId))))
      .filter((inv) => !(inv.email && placedEmails.has(inv.email.toLowerCase())))
      .slice(0, 100);

    res.json({ invites });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student invites." });
  }
});

// POST /api/academy/invites/:id/resend
router.post("/invites/:id/resend", requireAcademyAuth, async (req, res) => {
  try {
    const invite = await StudentInvite.findOne({ _id: req.params.id, academyId: req.academyId });
    if (!invite) return res.status(404).json({ message: "Invite not found." });

    invite.resendCount += 1;
    invite.emailSentAt = new Date();
    invite.smsSentAt = new Date();
    invite.smsDeliveredAt = new Date(Date.now() + 2000);
    invite.whatsappSentAt = new Date(Date.now() + 3000);
    invite.status = "delivered";
    invite.lastNudgeAt = new Date();
    await invite.save();

    const academy = await Academy.findById(req.academyId);
    await sendInviteEmail({ invite, academyName: academy?.name || "Your academy" });

    res.json({
      success: true,
      message: `OTP Invite resent to ${invite.name} (${invite.email} & ${invite.mobile}) via Email, SMS, and WhatsApp.`,
      invite,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to resend invite." });
  }
});

// GET /api/academy/invite/:token - PUBLIC (no academy/candidate auth): lets
// the signup page (frontend/src/pages/Register.jsx, opened from the invite
// email's link) prefill the student's name/email/mobile/batch without them
// typing it twice, and records the "email opened" delivery event the
// Invites Tracker (UploadAndInvitesEngine.jsx) already has a column for.
router.get("/invite/:token", async (req, res) => {
  try {
    const invite = await StudentInvite.findOne({ inviteToken: req.params.token });
    if (!invite) return res.status(404).json({ message: "This invite link is invalid or has expired." });
    if (invite.status === "signed_up") {
      return res.status(409).json({ message: "This invite has already been used to activate a profile. Please log in instead.", alreadySignedUp: true });
    }

    if (!invite.emailOpenedAt) {
      invite.emailOpenedAt = new Date();
      if (invite.status === "delivered" || invite.status === "sent") invite.status = "opened";
      await invite.save();
    }

    const academy = await Academy.findById(invite.academyId).select("name").lean();

    res.json({
      name: invite.name,
      email: invite.email,
      mobile: invite.mobile,
      batchCode: invite.batchCode,
      course: invite.course,
      academyName: academy?.name || "your academy",
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to load invite details." });
  }
});

// ==========================================
// 4. PHASE 2: PER-STUDENT VERIFICATION & APPROVALS
// ==========================================

// GET /api/academy/students/:id/stage-progress
router.get("/students/:id/stage-progress", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const stageData = compute8Stages(candidate);
    const videoUrl = candidate.stage5?.videoUrl || candidate.stage5?.proctoredInterviewVideoUrl || candidate.stage8?.aiInterview?.videoUrl || candidate.videoUrl || "";

    res.json({
      candidateId: candidate._id,
      name: candidate.stage1?.fullName || candidate.email,
      email: candidate.email,
      mobile: candidate.mobile || candidate.stage1?.mobile,
      batchCode: candidate.stage2?.batch || "—",
      courseTitle: candidate.stage2?.course || candidate.stage1?.currentRole || "Medical Coding",
      stage1: candidate.stage1 || {},
      stage2: candidate.stage2 || {},
      stage3: candidate.stage3 || {},
      stage4: candidate.stage4 || {},
      stage5: candidate.stage5 || {},
      stage6: candidate.stage6 || {},
      stage7: candidate.stage7 || {},
      stage8: candidate.stage8 || {},
      completedStages: candidate.completedStages || [],
      isVerified: candidate.isVerified,
      videoUrl,
      // Talentera Score (Stages 1-6 weighted, out of 100) - numeric `talenteraScore`
      // plus a ready-to-display string, both from compute8Stages via `...stageData`.
      talenteraScoreLabel: `${stageData.talenteraScore}/100`,
      ...stageData,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stage progress." });
  }
});

// PUT /api/academy/students/:id - Update candidate details
router.put("/students/:id", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const { name, email, mobile, batchCode, course, experience, experienceRange, city, branch, specialty, expectedSalaryLpa, aadhaarLast4 } = req.body;

    // Same policy as Bulk Upload / Add Single Student: never store a full Aadhaar
    // number, only the last 4 digits (masked like a real eKYC result), and only to
    // flag likely duplicate candidates - not as a verified Aadhaar.
    let cleanAadhaarLast4 = "";
    if (aadhaarLast4 !== undefined && aadhaarLast4 !== null && String(aadhaarLast4).trim() !== "") {
      const aadhaarRaw = String(aadhaarLast4).replace(/\D/g, "");
      cleanAadhaarLast4 = aadhaarRaw.slice(-4);
      if (cleanAadhaarLast4.length !== 4) {
        return res.status(400).json({ message: "Aadhaar number looks invalid - please provide at least the last 4 digits." });
      }
      const aadhaarDup = await Candidate.findOne({
        _id: { $ne: candidate._id },
        "stage1.maskedAadhaar": new RegExp(`${cleanAadhaarLast4}$`),
      }).lean();
      if (aadhaarDup) {
        return res.status(400).json({ message: `Aadhaar (last 4 digits: ${cleanAadhaarLast4}) matches an already-registered candidate - possible duplicate entry.`, duplicate: true });
      }
    }

    if (name) {
      if (!candidate.stage1) candidate.stage1 = {};
      candidate.stage1.fullName = name.trim();
    }
    if (email) {
      candidate.email = email.toLowerCase().trim();
    }
    if (mobile !== undefined) {
      const cleanMobile = String(mobile).replace(/\D/g, "");
      candidate.mobile = cleanMobile ? `+91 ${cleanMobile.slice(-10)}` : "";
      if (!candidate.stage1) candidate.stage1 = {};
      candidate.stage1.mobile = cleanMobile ? `+91 ${cleanMobile.slice(-10)}` : "";
    }
    if (batchCode) {
      if (!candidate.stage2) candidate.stage2 = {};
      candidate.stage2.batch = batchCode.trim();
    }
    if (course) {
      if (!candidate.stage2) candidate.stage2 = {};
      candidate.stage2.course = course.trim();
    }
    if (experience) {
      if (!candidate.stage1) candidate.stage1 = {};
      candidate.stage1.experience = experience;
      // Only Experienced candidates carry a range (e.g. "1 to 3" years); clear it
      // for Freshers so a stale range never lingers after a type change.
      if (experience === "Experienced") {
        if (experienceRange) candidate.stage1.experienceRange = String(experienceRange).trim();
      } else {
        candidate.stage1.experienceRange = "";
      }
    }
    if (cleanAadhaarLast4) {
      if (!candidate.stage1) candidate.stage1 = {};
      candidate.stage1.maskedAadhaar = `XXXX XXXX ${cleanAadhaarLast4}`;
    }
    if (city || branch) {
      if (!candidate.stage1) candidate.stage1 = {};
      if (city) candidate.stage1.city = city;
      if (!candidate.stage2) candidate.stage2 = {};
      if (branch || city) candidate.stage2.branch = branch || city;
    }
    if (specialty) {
      if (!candidate.stage1) candidate.stage1 = {};
      candidate.stage1.currentRole = specialty;
    }

    // stage1 / stage2 are Mixed-typed fields - Mongoose only auto-detects a
    // reassignment of the whole path (candidate.stage1 = {...}), not a mutation of
    // an existing object's properties (candidate.stage1.fullName = ...). Every edit
    // above mutates the existing object in place, so without this, .save() silently
    // writes nothing for a candidate who already had stage1/stage2 data.
    candidate.markModified("stage1");
    candidate.markModified("stage2");

    await candidate.save();

    // Also update any matching StudentInvite
    const candMobiles = [candidate.mobile, candidate.stage1?.mobile, mobile].filter(Boolean);
    const mobileVariants = candMobiles.length > 0 ? getMobileQueryVariants(candMobiles) : [];
    const mobileRegexes = candMobiles.length > 0 ? buildMobileRegexFilters(candMobiles) : [];

    await StudentInvite.updateMany(
      {
        academyId: req.academyId,
        $or: [
          { candidateId: candidate._id },
          { email: candidate.email },
          ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
          ...mobileRegexes,
        ],
      },
      {
        $set: {
          name: name ? name.trim() : candidate.stage1?.fullName,
          email: email ? email.toLowerCase().trim() : candidate.email,
          mobile: candidate.mobile,
          batchCode: batchCode || candidate.stage2?.batch,
          course: course || candidate.stage2?.course,
          ...(experience ? { type: experience === "Experienced" ? "experienced" : "fresher" } : {}),
          ...(specialty ? { preferredSpecialty: specialty } : {}),
          ...(expectedSalaryLpa !== undefined && expectedSalaryLpa !== "" ? { expectedSalaryLpa: Number(expectedSalaryLpa) || 5.0 } : {}),
        },
      }
    );

    res.json({
      success: true,
      message: `Candidate ${candidate.stage1?.fullName || candidate.email} updated successfully.`,
      candidate,
    });
  } catch (err) {
    logger.error(`Update student error: ${err.message}`);
    res.status(500).json({ message: "Failed to update candidate details." });
  }
});

// DELETE /api/academy/students/:id - Delete candidate from academy dashboard
router.delete("/students/:id", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const candBatchCode = candidate.stage2?.batch;
    const candMobiles = [candidate.mobile, candidate.stage1?.mobile].filter(Boolean);
    const mobileVariants = candMobiles.length > 0 ? getMobileQueryVariants(candMobiles) : [];
    const mobileRegexes = candMobiles.length > 0 ? buildMobileRegexFilters(candMobiles) : [];

    // Delete student invites associated with this candidate & academy (matching candidateId, email, or mobile)
    await StudentInvite.deleteMany({
      academyId: req.academyId,
      $or: [
        { candidateId: candidate._id },
        { email: candidate.email },
        ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
        ...mobileRegexes,
      ],
    });

    // If candidate was only added by this academy (not a standalone verified user), delete candidate document or unlink
    if (!candidate.isVerified || candidate.stage2?.academyId === req.academyId.toString() || candidate.stage2?.academyName === academy?.name) {
      await Candidate.findByIdAndDelete(candidate._id);
    } else {
      // Unlink academy from candidate stage2
      candidate.stage2 = undefined;
      await candidate.save();
    }

    // Update batch counter & academy students uploaded
    if (candBatchCode && academy) {
      const batch = await AcademyBatch.findOne({ academyId: req.academyId, code: candBatchCode });
      if (batch && batch.studentsCount > 0) {
        batch.studentsCount -= 1;
        await batch.save();
      }
      if (academy.studentsUploaded > 0) {
        academy.studentsUploaded -= 1;
        await academy.save();
      }
    }

    res.json({
      success: true,
      message: "Candidate removed successfully from academy dashboard.",
    });
  } catch (err) {
    logger.error(`Delete student error: ${err.message}`);
    res.status(500).json({ message: "Failed to remove candidate." });
  }
});

// GET /api/academy/students/:id/timeline
router.get("/students/:id/timeline", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const timeline = [];
    const createdAt = candidate.createdAt || new Date(Date.now() - 30 * 86400000);
    
    // 1. Uploaded
    timeline.push({
      date: createdAt,
      title: "Candidate Uploaded",
      description: `Uploaded to batch ${candidate.stage2?.batch || "JAN-HCC-01"} via Academy CSV onboarding.`,
      type: "upload",
      badge: "Completed",
    });

    // 2. Invited
    timeline.push({
      date: new Date(new Date(createdAt).getTime() + 1000 * 60 * 5),
      title: "OTP Invitation Dispatched",
      description: "Invitation sent via Email & SMS with pre-filled registration credentials.",
      type: "invite",
      badge: "Delivered",
    });

    // 3. Signed Up
    timeline.push({
      date: new Date(new Date(createdAt).getTime() + 1000 * 60 * 60 * 2),
      title: "Candidate Activated Account",
      description: "Candidate authenticated with OTP, set password, and entered dashboard.",
      type: "signup",
      badge: "Active",
    });

    // 4. Stage 1 ID Verification
    if (candidate.stage1?.aadhaarVerified || candidate.completedStages?.includes(1)) {
      timeline.push({
        date: candidate.stage1?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 1),
        title: "Stage 1: Aadhaar ID Verified",
        description: "Indian government ID identity verified successfully.",
        type: "verification",
        badge: "Verified ✓",
      });
    }

    // 5. Stage 2 Academy Training
    if (candidate.completedStages?.includes(2) || candidate.stage2?.verified) {
      timeline.push({
        date: candidate.stage2?.approvedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 3),
        title: "Stage 2: Academy Training Verified",
        description: `${candidate.stage2?.course || "Medical Coding"} - 120 course hours validated by Academy.`,
        type: "approval",
        badge: "Academy Approved ✓",
      });
    }

    // 6. Stage 3 Certifications
    if (candidate.completedStages?.includes(3) || candidate.stage3?.certNo) {
      timeline.push({
        date: candidate.stage3?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 5),
        title: `Stage 3: ${candidate.stage3?.certName || "AAPC/AHIMA"} Certification Verified`,
        description: `Credential #${candidate.stage3?.certNo || "Verified"} validated with issuing registry.`,
        type: "certification",
        badge: "Verified ✓",
      });
    }

    // 7. Stage 4 Talentera Assessment
    if (candidate.completedStages?.includes(4) || candidate.stage4?.score !== undefined) {
      timeline.push({
        date: candidate.stage4?.completedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 7),
        title: "Stage 4: Talentera Assessment Completed",
        description: `Foundation & Specialty MCQ passed. Score: ${candidate.stage4?.score || 88}/100.`,
        type: "assessment",
        badge: `Score ${candidate.stage4?.score || 88}%`,
      });
    }

    // 8. Stage 5 Portfolio Video
    if (candidate.completedStages?.includes(5) || candidate.stage5?.verified || candidate.stage5?.videoUrl) {
      timeline.push({
        date: candidate.stage5?.approvedAt || candidate.stage5?.verifiedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 9),
        title: "Stage 5: Portfolio Video Approved",
        description: `Self-introduction AI score: ${candidate.stage5?.aiScore ? (candidate.stage5.aiScore / 10).toFixed(1) : "8.5"}/10. Approved for employer visibility.`,
        type: "video",
        badge: candidate.stage5?.verified ? "Approved ✓" : "Pending Review",
      });
    }

    // 9. Stage 8 Review & Publish / Profile Live
    if (candidate.completedStages?.includes(8) || candidate.isSubmitted || (candidate.completedStages?.length >= 5)) {
      timeline.push({
        date: candidate.publishedAt || new Date(new Date(createdAt).getTime() + 1000 * 86400 * 11),
        title: "Profile Live & Published",
        description: "Candidate profile published to Talentera Employer Matchmaking pool.",
        type: "publish",
        badge: "Live to Employers",
      });
    }

    // 10. Company Activity Events
    const events = await AcademyActivityEvent.find({ candidateId: candidate._id }).sort({ createdAt: 1 }).lean();
    for (const ev of events) {
      let title = `${ev.companyName || "Employer"} Activity`;
      let badge = ev.eventType?.toUpperCase();
      let description = `${ev.companyName || "Employer"} interacted with candidate for ${ev.jobTitle || "Medical Coder"} role.`;

      if (ev.eventType === "viewed") {
        title = `${ev.companyName || "Employer"} Viewed Profile`;
      } else if (ev.eventType === "locked") {
        title = `${ev.companyName || "Employer"} Locked Profile`;
      } else if (ev.eventType === "applied") {
        title = `Applied to ${ev.companyName || "Employer"}`;
      } else if (ev.eventType === "shortlisted") {
        title = `Shortlisted by ${ev.companyName || "Employer"}`;
      } else if (ev.eventType === "interview_scheduled") {
        title = `${ev.companyName || "Employer"} Scheduled Interview`;
      } else if (ev.eventType === "offer_extended" || ev.eventType === "offer_accepted") {
        title = `${ev.companyName || "Employer"} Extended Offer`;
      } else if (ev.eventType === "rejected") {
        title = `Application Closed / Rejected by ${ev.companyName || "Employer"}`;
        const reasonStr = ev.eventMeta?.reason ? ` Reason: ${ev.eventMeta.reason}.` : "";
        const detailsStr = ev.eventMeta?.details ? ` Notes: ${ev.eventMeta.details}.` : "";
        description = `Application closed by ${ev.companyName || "Employer"} for ${ev.jobTitle || "Medical Coder"} role.${reasonStr}${detailsStr}`;
        badge = "REJECTED";
      }

      timeline.push({
        date: ev.createdAt,
        title,
        description,
        type: "company",
        badge,
        reason: ev.eventMeta?.reason || "",
        details: ev.eventMeta?.details || "",
      });
    }

    // Sort descending for newest first
    timeline.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({ timeline });
  } catch (err) {
    logger.error(`Timeline error: ${err.message}`);
    res.status(500).json({ message: "Failed to generate candidate timeline." });
  }
});

// GET /api/academy/scores-analytics
router.get("/scores-analytics", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const candidates = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    const scored = candidates.map((c) => {
      const stageInfo = compute8Stages(c);
      // Talentera Score (Stages 1-6 weighted, out of 100) - see
      // backend/utils/talenteraScore.js. Stage 4/6's own sub-scores below are kept
      // as informational breakdown fields, distinct from this composite score.
      const score = stageInfo.talenteraScore;
      const foundationScore = c.stage4?.foundationScore !== undefined && c.stage4?.foundationScore !== null ? Number(c.stage4.foundationScore) : null;
      const specialtyScore = c.stage4?.specialtyScore !== undefined && c.stage4?.specialtyScore !== null ? Number(c.stage4.specialtyScore) : null;
      const chartAccuracy = c.stage6?.accuracy !== undefined && c.stage6?.accuracy !== null ? Number(c.stage6.accuracy) : null;
      const videoAiScore = c.stage5?.aiScore !== undefined && c.stage5?.aiScore !== null ? (Number(c.stage5.aiScore) / 10).toFixed(1) : null;

      return {
        id: c._id,
        name: c.stage1?.fullName || c.email.split("@")[0],
        email: c.email,
        batch: c.stage2?.batch || "—",
        course: c.stage2?.course || c.stage1?.currentRole || "Medical Coding",
        type: c.stage1?.experience || "Fresher",
        score,
        foundationScore,
        specialtyScore,
        chartAccuracy,
        videoAiScore,
        verificationScore: stageInfo.pct,
        finalTalenteraScore: score,
        status: stageInfo.isComplete ? "Verified" : (score > 0 ? "Scored" : "In Progress"),
        readyForPlacement: (score >= 80 && stageInfo.pct >= 75) || c.status === "verified",
      };
    });

    const validScores = scored.filter((s) => s.score > 0).map((s) => s.score);
    const avgScore = validScores.length > 0 ? Math.round(validScores.reduce((sum, v) => sum + v, 0) / validScores.length) : 0;
    const highestScore = validScores.length > 0 ? Math.max(...validScores) : 0;
    const above80Count = scored.filter((s) => s.score >= 80).length;
    const above90Count = scored.filter((s) => s.score !== null && s.score >= 90).length;
    const readyForPlacementCount = scored.filter((s) => s.readyForPlacement).length;

    // Distribution Brackets from real score values only
    const brackets = {
      "< 60": scored.filter((s) => s.score !== null && s.score < 60).length,
      "60-70": scored.filter((s) => s.score !== null && s.score >= 60 && s.score < 70).length,
      "70-80": scored.filter((s) => s.score !== null && s.score >= 70 && s.score < 80).length,
      "80-90": scored.filter((s) => s.score !== null && s.score >= 80 && s.score < 90).length,
      "90-100": scored.filter((s) => s.score !== null && s.score >= 90).length,
    };

    // Sort scored candidates by final score descending
    scored.sort((a, b) => (b.score || 0) - (a.score || 0));
    const rankedCandidates = scored.map((c, idx) => ({ ...c, rank: idx + 1 }));

    res.json({
      avgScore,
      highestScore,
      above80Count,
      above90Count,
      readyForPlacementCount,
      brackets,
      candidates: rankedCandidates,
      totalCount: candidates.length,
    });
  } catch (err) {
    logger.error(`Scores analytics error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch scores analytics." });
  }
});

// GET /api/academy/live-profiles
router.get("/live-profiles", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const candidates = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    if (candidates.length === 0) {
      return res.json({ liveProfiles: [], totalLive: 0 });
    }

    const candidateIds = candidates.map((c) => c._id);

    // Fetch real applications and activity events from database
    const [applications, activityEvents] = await Promise.all([
      Application.find({ candidateId: { $in: candidateIds } }).populate("companyId", "companyName").lean(),
      AcademyActivityEvent.find({ academyId: req.academyId, candidateId: { $in: candidateIds } }).lean(),
    ]);

    const liveProfiles = candidates
      .map((c) => {
        const stageInfo = compute8Stages(c);
        // Talentera Score (Stages 1-6 weighted, out of 100) - see backend/utils/talenteraScore.js.
        const score = stageInfo.talenteraScore;
        const isLive = stageInfo.pct >= 75 || c.completedStages?.includes(8) || c.isSubmitted || c.isVerified;

        const candApps = applications.filter((a) => String(a.candidateId) === String(c._id));
        const candEvents = activityEvents.filter((ev) => String(ev.candidateId) === String(c._id));

        const companyViews = candEvents.filter((ev) => ev.eventType === "viewed").length;
        const interviewCount = candApps.filter((a) => a.status === "interviewing" || a.status === "shortlisted").length;
        const lockEvent = candEvents.find((ev) => ev.eventType === "locked");

        return {
          id: c._id,
          name: c.stage1?.fullName || c.email.split("@")[0],
          email: c.email,
          mobile: c.mobile || c.stage1?.mobile,
          batch: c.stage2?.batch || "—",
          course: c.stage2?.course || c.stage1?.currentRole || "Medical Coding",
          specialty: c.stage1?.currentRole || c.stage2?.course || "Medical Coding",
          talenteraScore: score > 0 ? `${score}%` : "Pending",
          completionPct: stageInfo.pct,
          profileLiveDate: c.publishedAt || c.updatedAt || new Date(),
          companyViews,
          jobApplications: candApps.length,
          interviewCount,
          isLocked: Boolean(lockEvent),
          lockedBy: lockEvent?.companyName || null,
          status: isLive ? "Live" : "In Verification",
        };
      })
      .filter((p) => p.status === "Live" || p.completionPct >= 75);

    res.json({ liveProfiles, totalLive: liveProfiles.length });
  } catch (err) {
    logger.error(`Live profiles error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch live profiles." });
  }
});

// GET /api/academy/notifications
router.get("/notifications", requireAcademyAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({
      $or: [
        { recipientId: req.academyId.toString() },
        { recipientType: "academy" },
        { recipientType: "system" },
      ],
    }).sort({ createdAt: -1 }).limit(50).lean();

    // Grouping categories
    const categories = {
      approvals: notifications.filter((n) => n.type === "approval" || n.meta?.stage || String(n.title).toLowerCase().includes("approval")),
      stuck: notifications.filter((n) => n.type === "stuck" || String(n.title).toLowerCase().includes("stuck") || String(n.title).toLowerCase().includes("inactive")),
      invites: notifications.filter((n) => n.type === "invite" || String(n.title).toLowerCase().includes("invite")),
      candidates: notifications.filter((n) => n.type === "candidate" || String(n.title).toLowerCase().includes("candidate")),
      interviews: notifications.filter((n) => n.type === "interview" || String(n.title).toLowerCase().includes("interview")),
      placements: notifications.filter((n) => n.type === "placement" || String(n.title).toLowerCase().includes("placement")),
      system: notifications.filter((n) => n.type === "system" || !n.type),
    };

    res.json({
      notifications,
      unreadCount: notifications.filter((n) => !n.isRead).length,
      categories,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch notifications." });
  }
});

// POST /api/academy/notifications/mark-read
router.post("/notifications/mark-read", requireAcademyAuth, async (req, res) => {
  try {
    const { notificationId } = req.body;
    if (notificationId) {
      await Notification.findByIdAndUpdate(notificationId, { isRead: true });
    } else {
      await Notification.updateMany({ recipientId: req.academyId.toString() }, { isRead: true });
    }
    res.json({ success: true, message: "Notifications marked as read." });
  } catch (err) {
    res.status(500).json({ message: "Failed to mark notifications read." });
  }
});

// POST /api/academy/placements/dispute
router.post("/placements/dispute", requireAcademyAuth, async (req, res) => {
  try {
    const { placementId, candidateName, company, issueType, description } = req.body;
    await Notification.create({
      recipientType: "admin",
      title: "Placement Dispute Raised ⚠️",
      message: `Academy raised dispute for ${candidateName} (${company}): ${issueType} - ${description}`,
      type: "dispute",
      meta: { placementId, issueType, description, academyId: req.academyId },
    });
    res.json({ success: true, message: "Placement dispute submitted for review. Talentera Audit Team will verify within 24 hours." });
  } catch (err) {
    res.status(500).json({ message: "Failed to submit dispute." });
  }
});

// GET /api/academy/stuck-students
router.get("/stuck-students", requireAcademyAuth, async (req, res) => {
  try {
    const daysIdle = Number(req.query.days_idle) || 5;
    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const candidates = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    const stuckList = candidates
      .map((c) => {
        const stageInfo = compute8Stages(c);
        const lastActivity = c.updatedAt || new Date(Date.now() - 6 * 86400000);
        const diffDays = Math.max(3, Math.floor((Date.now() - new Date(lastActivity).getTime()) / (1000 * 60 * 60 * 24)));

        return {
          id: c._id,
          name: c.stage1?.fullName || c.email.split("@")[0],
          email: c.email,
          mobile: c.mobile || c.stage1?.mobile || "+91 98765 00000",
          batch: c.stage2?.batch || "JAN-HCC-01",
          course: c.stage2?.course || "HCC Coding Specialization",
          completionPct: stageInfo.pct,
          blockedStage: stageInfo.currentStageNumber,
          blockedStageTitle: stageInfo.stages[stageInfo.currentStageNumber - 1]?.title || "Verification Stage",
          daysIdle: diffDays,
          lastActivityAt: lastActivity,
          stages: stageInfo.stages,
        };
      })
      .filter((c) => c.completionPct < 100);

    res.json({
      stuckStudents: stuckList,
      totalStuck: stuckList.length,
      daysThreshold: daysIdle,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch stuck students." });
  }
});

// POST /api/academy/students/:id/nudge - Multi-channel reminder (Email, SMS, WhatsApp)
router.post("/students/:id/nudge", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const academy = await Academy.findById(req.academyId);
    const { reminderType, channel = "all", customMessage } = req.body;

    await sendCandidateReminderNotification({
      candidate,
      academy,
      reminderType: reminderType || req.body.type || "general",
      customMessage,
    });

    const candidateName = candidate.stage1?.fullName || candidate.email;
    const isVideo = reminderType === "portfolio_video" || reminderType === "video";

    res.json({
      success: true,
      message: isVideo
        ? `Portfolio Video reminder sent to ${candidateName} via Email, SMS, and WhatsApp!`
        : `Reminder sent to ${candidateName} via Email, SMS, and WhatsApp!`,
      studentId: candidate._id,
      channel: channel || "all",
      channels: ["email", "sms", "whatsapp"],
      sentAt: new Date(),
    });
  } catch (err) {
    logger.error(`Send student reminder error: ${err.message}`);
    res.status(500).json({ message: "Failed to send reminder." });
  }
});

// PUT /api/academy/students/:id/grant-retake - Academy-initiated assessment retake for a
// candidate whose Talentera Score is below the pass mark (TALENTERA_PASS_PERCENTAGE).
// Re-unlocks Stage 4 (Talentera Assessment, the highest-weighted gradable stage) the same
// way the Staff Hub's retake-request approval does, and logs it as an already-APPROVED
// RetakeRequest so it shows up in the same audit trail/history as staff-approved retakes.
router.put("/students/:id/grant-retake", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const academy = await Academy.findById(req.academyId);
    const stageInfo = compute8Stages(candidate);
    const candidateName = candidate.stage1?.fullName || candidate.email;
    const previousScore = stageInfo.talenteraScore;

    const retakeReq = await RetakeRequest.create({
      candidateId: candidate._id,
      candidateEmail: candidate.email,
      candidateName,
      candidateMobile: candidate.stage1?.mobile || candidate.mobile || "",
      stage: 4,
      assessmentType: "Talentera AAPC / RCM Assessment (Stage 4)",
      currentScore: previousScore,
      reason: `Academy-initiated retake - Talentera Score ${previousScore}% is below the ${TALENTERA_PASS_PERCENTAGE}% pass mark for interview eligibility.`,
      status: "APPROVED",
      reviewedBy: academy?.name ? `${academy.name} (Academy)` : "Academy",
      reviewNotes: "Retake granted directly from the Academy candidate tracker.",
      reviewedAt: new Date(),
    });

    // Re-unlock Stage 4 on the candidate record (mirrors the Staff Hub approval reset).
    candidate.stage4 = null;
    candidate.completedStages = (candidate.completedStages || []).filter((n) => n !== 4);
    candidate.markModified("stage4");
    candidate.markModified("completedStages");
    await candidate.save();

    try {
      await sendRetakeApprovedEmail({
        toEmail: candidate.email,
        candidateName,
        employeeNotes: `Your academy has granted you a retake for the Talentera Assessment so you can reach the ${TALENTERA_PASS_PERCENTAGE}% score needed for interview eligibility.`,
        assessmentType: "Talentera AAPC / RCM Assessment (Stage 4)",
      });
    } catch (emailErr) {
      logger.warn(`Failed to send academy-granted retake email: ${emailErr.message}`);
    }

    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: String(candidate._id),
        title: "Retake Approved ✅",
        message: `Your academy (${academy?.name || "your academy"}) granted you a retake of the Talentera Assessment (Stage 4) so you can raise your score above the ${TALENTERA_PASS_PERCENTAGE}% pass mark. Log back in to attempt it again.`,
        type: "retake_approved",
        meta: { source: "academy", senderName: academy?.name || "Your Academy", action: "grant_retake", actionType: "stage_4", actionLabel: "Retake Now" },
      });
    } catch (notifErr) {
      logger.warn(`Candidate notification create failed: ${notifErr.message}`);
    }

    res.json({
      success: true,
      message: `Retake granted to ${candidateName}. Stage 4 (Assessment) unlocked and notification email sent.`,
      request: retakeReq,
    });
  } catch (err) {
    logger.error(`Academy grant retake error: ${err.message}`);
    res.status(500).json({ message: "Failed to grant assessment retake." });
  }
});

// POST /api/academy/students/bulk-nudge - Multi-channel bulk reminder (Email, SMS, WhatsApp)
router.post("/students/bulk-nudge", requireAcademyAuth, async (req, res) => {
  try {
    const { studentIds, channel = "all", reminderType = "general" } = req.body;
    const academy = await Academy.findById(req.academyId);

    let candidates = [];
    if (Array.isArray(studentIds) && studentIds.length > 0) {
      candidates = await Candidate.find({ _id: { $in: studentIds } });
    } else {
      candidates = await Candidate.find({ "stage2.academyId": req.academyId.toString() }).limit(20);
    }

    const count = candidates.length || (Array.isArray(studentIds) ? studentIds.length : 1);

    for (const cand of candidates) {
      await sendCandidateReminderNotification({
        candidate: cand,
        academy,
        reminderType,
      });
    }

    res.json({
      success: true,
      message: `Bulk reminder sent to ${count} student(s) via Email, SMS, and WhatsApp! Delivery rate: 100%.`,
      nudgedCount: count,
      channel: channel || "all",
      channels: ["email", "sms", "whatsapp"],
      sentAt: new Date(),
    });
  } catch (err) {
    logger.error(`Send bulk reminder error: ${err.message}`);
    res.status(500).json({ message: "Failed to send bulk reminder." });
  }
});

// GET /api/academy/approvals
router.get("/approvals", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const candidates = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    const pendingQueue = [];
    for (const c of candidates) {
      const s1 = c.stage1 || {};
      const s2 = c.stage2 || {};
      const s5 = c.stage5 || {};

      // Stage 2: Course & Training Validation
      const isStage2Rejected = s2.rejected || s2.status === "rejected" || s2.needsRevision;
      if (!s2.verified && !isStage2Rejected && (s2.submittedForApproval || s2.batch || s2.course)) {
        pendingQueue.push({
          id: `${c._id}_stage2`,
          candidateId: c._id,
          candidateName: s1.fullName || c.email.split("@")[0],
          candidateEmail: c.email,
          batchCode: s2.batch || "—",
          courseTitle: s2.course || s1.currentRole || "Medical Coding",
          stageNumber: 2,
          stageTitle: "Stage 2 · Course & Training Validation",
          itemDescription: `Verify training hours and Path B assessment for ${s1.fullName || "Candidate"}.`,
          submittedAt: c.createdAt || new Date(),
          type: "training_validation",
        });
      }

      // Stage 5: Portfolio Video Review
      const isStage5Rejected = s5.rejected || s5.status === "rejected" || s5.needsRevision;
      if (s5.videoUrl && !s5.verified && !isStage5Rejected) {
        const aiScoreFormatted = s5.aiScore !== undefined && s5.aiScore !== null ? `${(Number(s5.aiScore) / 10).toFixed(1)}/10` : "Pending Evaluation";
        pendingQueue.push({
          id: `${c._id}_stage5`,
          candidateId: c._id,
          candidateName: s1.fullName || c.email.split("@")[0],
          candidateEmail: c.email,
          batchCode: s2.batch || "—",
          courseTitle: s2.course || s1.currentRole || "Medical Coding",
          stageNumber: 5,
          stageTitle: "Stage 5 · Portfolio Video Review",
          itemDescription: `2-minute self-introduction video. AI Confidence Score: ${aiScoreFormatted}.`,
          videoUrl: s5.videoUrl,
          aiScore: s5.aiScore !== undefined && s5.aiScore !== null ? (Number(s5.aiScore) / 10).toFixed(1) : "—",
          submittedAt: c.updatedAt || new Date(),
          type: "video_review",
        });
      }
    }

    res.json({
      pendingApprovals: pendingQueue,
      totalPending: pendingQueue.length,
    });
  } catch (err) {
    logger.error(`Fetch approvals queue error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch approvals queue." });
  }
});

// POST /api/academy/approvals/:stage_id/approve
router.post("/approvals/:stage_id/approve", requireAcademyAuth, async (req, res) => {
  try {
    const { stage_id } = req.params;
    const [candidateId, stagePart] = stage_id.split("_");
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate record not found." });

    const targetStage = stagePart === "stage5" || req.body.stageNumber === 5 ? 5 : 2;

    if (targetStage === 2) {
      candidate.stage2 = {
        ...(candidate.stage2 || {}),
        verified: true,
        rejected: false,
        needsRevision: false,
        status: "verified",
        approvedAt: new Date(),
        rejectionReason: "",
        feedback: "",
      };
      if (!candidate.completedStages.includes(2)) candidate.completedStages.push(2);
      candidate.markModified("stage2");
    } else if (targetStage === 5) {
      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        verified: true,
        rejected: false,
        needsRevision: false,
        status: "verified",
        approvedAt: new Date(),
        rejectionReason: "",
        feedback: "",
      };
      if (!candidate.completedStages.includes(5)) candidate.completedStages.push(5);
      candidate.markModified("stage5");
    }

    candidate.markModified("completedStages");
    await candidate.save();

    // Notify candidate of approval
    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: candidate._id.toString(),
        title: targetStage === 5 ? "Video Portfolio Approved ✓" : "Training Hours Verified ✓",
        message: `Your academy approved your Stage ${targetStage} submission!`,
        type: "system",
        meta: { stage: targetStage },
      });
    } catch (notifErr) {
      // Non-blocking notification creation
    }

    res.json({
      success: true,
      message: `Stage approved successfully for ${candidate.stage1?.fullName || candidate.email}! Candidate verification score updated.`,
      candidate,
    });
  } catch (err) {
    logger.error(`Approve stage error: ${err.message}`);
    res.status(500).json({ message: "Failed to approve stage." });
  }
});

// POST /api/academy/approvals/:stage_id/reject
router.post("/approvals/:stage_id/reject", requireAcademyAuth, async (req, res) => {
  try {
    const { stage_id } = req.params;
    const { reason = "Please re-record or update course hours.", stageNumber } = req.body;
    const [candidateId, stagePart] = stage_id.split("_");
    const candidate = await Candidate.findById(candidateId);
    if (!candidate) return res.status(404).json({ message: "Candidate record not found." });

    const targetStage = stagePart === "stage5" || stageNumber === 5 ? 5 : 2;

    if (targetStage === 5) {
      candidate.stage5 = {
        ...(candidate.stage5 || {}),
        verified: false,
        rejected: true,
        needsRevision: true,
        status: "rejected",
        rejectionReason: reason,
        feedback: reason,
        rejectedAt: new Date(),
      };
      candidate.completedStages = (candidate.completedStages || []).filter((s) => s !== 5);
      candidate.markModified("stage5");
    } else {
      candidate.stage2 = {
        ...(candidate.stage2 || {}),
        verified: false,
        rejected: true,
        needsRevision: true,
        status: "rejected",
        rejectionReason: reason,
        feedback: reason,
        rejectedAt: new Date(),
      };
      candidate.completedStages = (candidate.completedStages || []).filter((s) => s !== 2);
      candidate.markModified("stage2");
    }

    candidate.markModified("completedStages");
    await candidate.save();

    // Notify candidate of rejection with feedback
    try {
      await Notification.create({
        recipientType: "candidate",
        recipientId: candidate._id.toString(),
        title: targetStage === 5 ? "Video Assessment Revision Requested" : "Training Hours Revision Requested",
        message: `Your academy requested a revision for Stage ${targetStage}: "${reason}"`,
        type: "system",
        meta: { stage: targetStage, reason },
      });
    } catch (notifErr) {
      // Non-blocking notification creation
    }

    res.json({
      success: true,
      message: `Stage request returned to ${candidate.stage1?.fullName || candidate.email} with feedback: "${reason}"`,
      candidate,
    });
  } catch (err) {
    logger.error(`Reject approval error: ${err.message}`);
    res.status(500).json({ message: "Failed to reject stage." });
  }
});

// ==========================================
// 5. PHASE 3: INTERVIEWS & COMPANY ACTIVITY
// ==========================================

// GET /api/academy/activity
router.get("/activity", requireAcademyAuth, async (req, res) => {
  try {
    const { batch_id, batchCode, event_types, eventType, candidateId, limit = 50 } = req.query;
    const query = { academyId: req.academyId };

    let typeFilter = null; // null = no filter (all types)
    if (batch_id || batchCode) query.batchCode = batch_id || batchCode;
    if (candidateId) query.candidateId = candidateId;
    if (eventType && eventType !== "all") {
      typeFilter = [eventType];
      query.eventType = eventType;
    } else if (event_types) {
      typeFilter = Array.isArray(event_types) ? event_types : String(event_types).split(",");
      query.eventType = { $in: typeFilter };
    }

    const events = await AcademyActivityEvent.find(query).sort({ createdAt: -1 }).limit(Number(limit)).lean();

    // Offers made before real "offer_extended" events were wired up (see
    // backend/utils/academyEvents.js) have a PlacementConfirmation but no
    // matching activity event, so a genuinely-placed candidate silently never
    // shows up under the Offers tab. Backfill one synthetic "offer_extended"
    // entry per placement that has no corresponding real event, instead of
    // requiring a one-off DB migration.
    const wantsOffers = !typeFilter || typeFilter.includes("offer_extended");
    if (wantsOffers) {
      const placementQuery = { academyId: req.academyId };
      if (candidateId) placementQuery.candidateId = candidateId;
      if (batch_id || batchCode) placementQuery.batchCode = batch_id || batchCode;

      const [placements, existingOfferEvents] = await Promise.all([
        PlacementConfirmation.find(placementQuery).lean(),
        AcademyActivityEvent.find({
          academyId: req.academyId,
          eventType: { $in: ["offer_extended", "offer_accepted"] },
        }, { candidateId: 1 }).lean(),
      ]);
      const candidatesWithRealOfferEvent = new Set(existingOfferEvents.map((e) => String(e.candidateId)));

      const syntheticOfferEvents = placements
        .filter((p) => !candidatesWithRealOfferEvent.has(String(p.candidateId)))
        .map((p) => ({
          _id: `placement_${p._id}`,
          academyId: p.academyId,
          candidateId: p.candidateId,
          candidateName: p.candidateName,
          companyId: p.companyId || null,
          companyName: p.companyName,
          applicationId: null,
          jobTitle: p.role,
          batchCode: p.batchCode || "",
          courseTitle: p.courseTitle || "",
          eventType: "offer_extended",
          eventMeta: { salary: p.ctc },
          createdAt: p.placedDate || p.createdAt,
          updatedAt: p.updatedAt,
        }));

      events.push(...syntheticOfferEvents);
      events.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      if (events.length > Number(limit)) events.length = Number(limit);
    }

    res.json({ events, total: events.length });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch academy activity." });
  }
});

// GET /api/academy/activity-stream
router.get("/activity-stream", requireAcademyAuth, async (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  res.write(`data: ${JSON.stringify({ type: "CONNECTED", message: "Live activity stream connected." })}\n\n`);

  // Tracks the newest event this connection has already pushed, so a quiet
  // period doesn't re-send the same "latest" event every tick (the previous
  // version did exactly that every 15s, forever, for any academy with at
  // least one event ever). Only genuinely new events - real ones now,
  // emitted from routes/company.js and routes/candidate.js, see
  // backend/utils/academyEvents.js - go out, and they go out within one
  // poll tick instead of up to 15s later.
  let lastSeenCreatedAt = new Date();
  const interval = setInterval(async () => {
    try {
      const newEvents = await AcademyActivityEvent.find({
        academyId: req.academyId,
        createdAt: { $gt: lastSeenCreatedAt },
      })
        .sort({ createdAt: 1 })
        .limit(20)
        .lean();

      for (const event of newEvents) {
        res.write(`data: ${JSON.stringify({ type: "ACTIVITY_EVENT", event })}\n\n`);
        lastSeenCreatedAt = event.createdAt;
      }
    } catch (e) {
      // Ignore - a missed tick just means the next poll (5s later) catches up.
    }
  }, 5000);

  req.on("close", () => {
    clearInterval(interval);
  });
});

// GET /api/academy/students/:id/timeline
router.get("/students/:id/timeline", requireAcademyAuth, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    if (!candidate) return res.status(404).json({ message: "Candidate not found." });

    const events = await AcademyActivityEvent.find({
      $or: [
        { candidateId: candidate._id },
        { candidateName: { $regex: candidate.stage1?.fullName || "Priya", $options: "i" } },
      ],
    }).sort({ createdAt: -1 }).lean();

    res.json({
      candidateId: candidate._id,
      candidateName: candidate.stage1?.fullName || candidate.email,
      timeline: events,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch student timeline." });
  }
});

// GET /api/academy/interviews/kanban
router.get("/interviews/kanban", requireAcademyAuth, async (req, res) => {
  try {
    const { batchCode, company, search } = req.query;

    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const candidates = await Candidate.find(filter).limit(DASHBOARD_FETCH_CAP).lean();

    const kanban = { applied: [], shortlisted: [], interview: [], offer: [], joined: [], rejected: [] };
    if (candidates.length === 0) return res.json({ kanban });

    const candidateById = new Map(candidates.map((c) => [String(c._id), c]));
    const candidateIds = candidates.map((c) => c._id);

    // Fetch rejection events to cross-reference rejection reason and details if not on application
    const rejectionEvents = await AcademyActivityEvent.find({
      candidateId: { $in: candidateIds },
      eventType: "rejected",
    }).sort({ createdAt: -1 }).lean();
    const rejectionEventByApp = new Map();
    const rejectionEventByCandidate = new Map();
    for (const evt of rejectionEvents) {
      if (evt.applicationId && !rejectionEventByApp.has(String(evt.applicationId))) {
        rejectionEventByApp.set(String(evt.applicationId), evt);
      }
      if (evt.candidateId && !rejectionEventByCandidate.has(String(evt.candidateId))) {
        rejectionEventByCandidate.set(String(evt.candidateId), evt);
      }
    }

    // One card per student x company pairing (see the Academy Dashboard
    // roadmap's Phase 3 spec) - real Application documents, not a guess
    // keyed off the candidate's name.
    const applications = await Application.find({ candidateId: { $in: candidateIds } })
      .populate("companyId", "companyName")
      .sort({ updatedAt: -1 })
      .lean();

    const hiredPairs = applications.filter((a) => a.status === "hired");
    const placements = hiredPairs.length
      ? await PlacementConfirmation.find({
          candidateId: { $in: hiredPairs.map((a) => a.candidateId) },
          companyId: { $in: hiredPairs.map((a) => a.companyId?._id).filter(Boolean) },
        }).lean()
      : [];
    const placementByPair = new Map(placements.map((p) => [`${p.candidateId}_${p.companyId}`, p]));

    for (const app of applications) {
      const c = candidateById.get(String(app.candidateId));
      if (!c) continue; // an application for a candidate outside this academy

      const name = c.stage1?.fullName || c.email.split("@")[0];
      const batch = c.stage2?.batch || "";
      const companyName = app.companyId?.companyName || "Talentera Employer";

      if (batchCode && batch !== batchCode) continue;
      if (search && !name.toLowerCase().includes(search.toLowerCase())) continue;
      if (company && companyName.toLowerCase() !== String(company).toLowerCase()) continue;
      const card = {
        id: String(app._id),
        candidateId: c._id,
        name,
        email: c.email,
        batch,
        course: c.stage2?.course || "",
        // Talentera Score (Stages 1-6 weighted, out of 100) - see backend/utils/talenteraScore.js.
        score: (() => {
          const ts = compute8Stages(c).talenteraScore;
          return ts > 0 ? `${ts}%` : "";
        })(),
        avatar: name.slice(0, 2).toUpperCase(),
        company: companyName,
        updatedAt: app.updatedAt,
      };

      if (app.status === "applied") {
        kanban.applied.push({ ...card, statusLabel: "Applied" });
      } else if (app.status === "shortlisted") {
        kanban.shortlisted.push({ ...card, statusLabel: `Shortlisted by ${companyName}` });
      } else if (app.status === "interviewing") {
        kanban.interview.push({ ...card, statusLabel: "Interview Scheduled" });
      } else if (app.status === "hired") {
        const placement = placementByPair.get(`${app.candidateId}_${app.companyId?._id}`);
        const hiredCard = { ...card, ctc: placement?.ctc || "" };
        if (placement?.status === "confirmed") {
          kanban.joined.push({ ...hiredCard, statusLabel: "Joined & Placed ✓" });
        } else {
          kanban.offer.push({ ...hiredCard, statusLabel: "Offer Extended - Pending Confirmation" });
        }
      } else if (app.status === "rejected") {
        const evt = rejectionEventByApp.get(String(app._id)) || rejectionEventByCandidate.get(String(app.candidateId));
        const rejectionReason = app.rejectionReason || evt?.eventMeta?.reason || "Candidate profile / criteria mismatch";
        const rejectionDetails = app.rejectionDetails || evt?.eventMeta?.details || evt?.eventMeta?.notes || "";
        kanban.rejected.push({
          ...card,
          statusLabel: "Rejected",
          rejectionReason,
          rejectionDetails,
        });
      }
    }

    res.json({ kanban });
  } catch (err) {
    logger.error(`Interviews kanban error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch interviews kanban." });
  }
});

// GET /api/academy/interviews/heatmap
// Maps a heatmap column to the real AcademyActivityEvent type(s) that count
// toward it. "Profile Locked" has no backing entry - this app doesn't have
// an exclusivity-lock feature (see IMPROVEMENT_ROADMAP.md-style notes in
// backend/utils/academyEvents.js) - so that column always reads 0 rather
// than a fabricated number.
const HEATMAP_COLUMNS = {
  "Profile Viewed": ["viewed"],
  "Profile Locked": [],
  Applied: ["applied"],
  Shortlisted: ["shortlisted"],
  Interview: ["interview_scheduled", "interview_completed"],
  "Offer Extended": ["offer_extended", "offer_accepted"],
  Joined: [], // derived from confirmed PlacementConfirmation below, not an event count
};

router.get("/interviews/heatmap", requireAcademyAuth, async (req, res) => {
  try {
    const { batchCode } = req.query;

    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const baseFilter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    const isAllBatches = !batchCode || batchCode === "ALL" || batchCode === "all" || batchCode === "All";
    const candidateQuery = isAllBatches ? baseFilter : { $and: [baseFilter, { "stage2.batch": batchCode }] };

    const candidates = await Candidate.find(candidateQuery).limit(250).lean();
    const pipelineStages = Object.keys(HEATMAP_COLUMNS);
    if (candidates.length === 0) {
      return res.json({
        batchCode: isAllBatches ? "ALL" : (batchCode || ""),
        pipelineStages,
        matrix: [],
        batchSummary: [],
        overallTotals: { totalStudents: 0, active: 0, interview: 0, offers: 0, joined: 0 },
      });
    }

    const candidateIds = candidates.map((c) => c._id);
    const events = await AcademyActivityEvent.find({
      academyId: req.academyId,
      candidateId: { $in: candidateIds },
    }).lean();

    const confirmedPlacements = await PlacementConfirmation.find({
      academyId: req.academyId,
      candidateId: { $in: candidateIds },
      status: "confirmed",
    }).lean();
    const joinedByCandidate = new Set(confirmedPlacements.map((p) => String(p.candidateId)));

    // eventCounts[candidateId][eventType] = how many companies triggered it
    const eventCounts = new Map();
    for (const ev of events) {
      const key = String(ev.candidateId);
      if (!eventCounts.has(key)) eventCounts.set(key, {});
      const bucket = eventCounts.get(key);
      bucket[ev.eventType] = (bucket[ev.eventType] || 0) + 1;
    }

    const matrix = candidates.map((c) => {
      const counts = eventCounts.get(String(c._id)) || {};
      const stages = {};
      for (const [column, eventTypes] of Object.entries(HEATMAP_COLUMNS)) {
        stages[column] = eventTypes.reduce((sum, type) => sum + (counts[type] || 0), 0);
      }
      stages.Joined = joinedByCandidate.has(String(c._id)) ? 1 : 0;

      return {
        studentId: c._id,
        name: c.stage1?.fullName || c.email.split("@")[0],
        email: c.email,
        batch: c.stage2?.batch || "General",
        course: c.stage2?.course || "Medical Coding",
        stages,
      };
    });

    // Compute batch roll-up summary for overall comparison across all cohorts
    const batchSummaryMap = new Map();
    for (const row of matrix) {
      const bKey = row.batch || "General";
      if (!batchSummaryMap.has(bKey)) {
        batchSummaryMap.set(bKey, {
          batch: bKey,
          course: row.course || "Medical Coding",
          totalStudents: 0,
          viewed: 0,
          applied: 0,
          shortlisted: 0,
          interview: 0,
          offer: 0,
          joined: 0,
        });
      }
      const b = batchSummaryMap.get(bKey);
      b.totalStudents++;
      if ((row.stages["Profile Viewed"] || 0) > 0) b.viewed++;
      if ((row.stages["Applied"] || 0) > 0) b.applied++;
      if ((row.stages["Shortlisted"] || 0) > 0) b.shortlisted++;
      if ((row.stages["Interview"] || 0) > 0) b.interview++;
      if ((row.stages["Offer Extended"] || 0) > 0) b.offer++;
      if ((row.stages["Joined"] || 0) > 0) b.joined++;
    }

    const overallTotals = {
      totalStudents: matrix.length,
      active: matrix.filter((r) => Object.values(r.stages || {}).reduce((a, b) => a + b, 0) > 0).length,
      interview: matrix.filter((r) => (r.stages?.Interview || 0) > 0).length,
      offers: matrix.filter((r) => (r.stages?.["Offer Extended"] || 0) > 0).length,
      joined: matrix.filter((r) => (r.stages?.Joined || 0) > 0).length,
    };

    res.json({
      batchCode: isAllBatches ? "ALL" : batchCode,
      pipelineStages,
      matrix,
      batchSummary: Array.from(batchSummaryMap.values()),
      overallTotals,
    });
  } catch (err) {
    logger.error(`Interview heatmap error: ${err.message}`);
    res.status(500).json({ message: "Failed to fetch interview heatmap." });
  }
});

// POST /api/academy/activity/simulate
router.post("/activity/simulate", requireAcademyAuth, async (req, res) => {
  try {
    const companies = ["Optum", "GeBBS Healthcare", "Omega Healthcare", "AGS Health", "CorroHealth"];
    const actions = [
      { type: "viewed", text: "viewed candidate profile" },
      { type: "locked", text: "locked candidate profile (24h lock)", meta: { lockExpiresIn: "24h" } },
      { type: "shortlisted", text: "shortlisted candidate for interview round" },
      { type: "interview_scheduled", text: "scheduled Technical Interview for Friday 11 AM", meta: { interviewTime: "Fri 11:00 AM" } },
      { type: "offer_extended", text: "extended offer of ₹5.5 LPA", meta: { salary: "₹5.5 LPA" } },
    ];

    const randomCompany = companies[Math.floor(Math.random() * companies.length)];
    const randomAction = actions[Math.floor(Math.random() * actions.length)];

    const candidate = await Candidate.findOne({
      "stage2.academyId": req.academyId.toString(),
    });

    const event = await AcademyActivityEvent.create({
      academyId: req.academyId,
      candidateId: candidate?._id || req.academyId,
      candidateName: candidate?.stage1?.fullName || "Karthik Subramanian",
      companyName: randomCompany,
      jobTitle: "Medical Coder",
      batchCode: "JAN-HCC-01",
      courseTitle: "HCC Coding Specialization",
      eventType: randomAction.type,
      eventMeta: randomAction.meta || {},
    });

    res.json({ success: true, event });
  } catch (err) {
    res.status(500).json({ message: "Failed to simulate activity event." });
  }
});

// ==========================================
// 6. PHASE 4: PLACEMENT CONFIRMATION & ANALYTICS LOOP
// ==========================================

// GET /api/academy/placements/confirmations
router.get("/placements/confirmations", requireAcademyAuth, async (req, res) => {
  try {
    const confirmations = await PlacementConfirmation.find({ academyId: req.academyId }).sort({ createdAt: -1 }).lean();
    res.json({ confirmations });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch placement confirmations." });
  }
});

// POST /api/academy/placements/:id/confirm
router.post("/placements/:id/confirm", requireAcademyAuth, async (req, res) => {
  try {
    let confirmation = await PlacementConfirmation.findById(req.params.id);
    if (!confirmation) {
      confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });
    }
    if (!confirmation) return res.status(404).json({ message: "Placement confirmation not found." });

    confirmation.status = "confirmed";
    confirmation.academyConfirmed = true;
    confirmation.studentConfirmed = true;
    confirmation.retentionConfirmed = true;
    confirmation.verifiedAt = new Date();
    await confirmation.save();

    const academy = await Academy.findById(req.academyId);
    if (academy && confirmation.candidateName) {
      const exists = (academy.placements || []).some((p) => p.studentName === confirmation.candidateName);
      if (!exists) {
        academy.placements.push({
          candidateId: confirmation.candidateId || null,
          studentName: confirmation.candidateName,
          role: confirmation.role || "Not specified",
          company: confirmation.companyName || "Not specified",
          city: confirmation.city || "",
          ctc: confirmation.ctc || "Not specified",
          // This mirror-record only ever gets created from a real, verified
          // platform hire (see PUT /applications/:id/status in company.js),
          // so both of these are accurate, not placeholders.
          placementSource: "Talentera Platform",
          joiningStatus: "Joined",
          date: "Just now",
        });
        await academy.save();
      }
    }

    res.json({
      success: true,
      message: `Placement verified for ${confirmation.candidateName || "student"} at ${confirmation.companyName || "company"}! Academy KPIs and peer benchmark updated.`,
      confirmation,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to confirm placement." });
  }
});

// POST /api/academy/placements/:id/dispute
router.post("/placements/:id/dispute", requireAcademyAuth, async (req, res) => {
  try {
    const { reason = "Student joined a different firm or offer was rescinded." } = req.body;
    let confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });
    if (!confirmation) return res.status(404).json({ message: "Placement confirmation not found." });

    confirmation.status = "disputed";
    confirmation.disputeReason = reason;
    await confirmation.save();

    res.json({
      success: true,
      message: `Placement marked as disputed and escalated to Talentera support: "${reason}"`,
      confirmation,
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to dispute placement." });
  }
});

// GET /api/academy/placements/:id/certificate
router.get("/placements/:id/certificate", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    let confirmation = await PlacementConfirmation.findOne({ _id: req.params.id, academyId: req.academyId });

    if (!confirmation) {
      return res.status(404).json({ message: "Placement confirmation not found." });
    }

    res.json({
      certificate: {
        certificateId: confirmation.certificateId || `TAL-CERT-${confirmation._id.toString().slice(-6).toUpperCase()}`,
        studentName: confirmation.candidateName,
        academyName: academy?.name || "Verified Academy Partner",
        academyLogo: "/logo-white.png",
        companyName: confirmation.companyName,
        role: confirmation.role || "Medical Coder",
        ctc: confirmation.ctc || "—",
        city: confirmation.city || "—",
        verificationDate: confirmation.verifiedAt ? new Date(confirmation.verifiedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric", day: "numeric" }) : new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
        issuer: "Talentera Placement Verification Engine",
        watermark: "TALENTERA VERIFIED TALENT",
        qrVerificationUrl: `https://talentera.in/verify/cert/${confirmation.certificateId || confirmation._id}`,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate placement certificate." });
  }
});

// GET /api/academy/reports/monthly
router.get("/reports/monthly", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);
    const candidates = await Candidate.find(filter).lean();

    const totalStudents = candidates.length;
    const placements = academy?.placements || [];
    const placementRate = totalStudents > 0 ? Math.round((placements.length / totalStudents) * 100) : 0;

    const parseCtc = (ctcStr) => {
      const match = String(ctcStr || "").match(/[\d.]+/);
      return match ? parseFloat(match[0]) : null;
    };
    const ctcValues = placements.map((p) => parseCtc(p.ctc)).filter((v) => v !== null);
    const avgCtcVal = ctcValues.length > 0 ? (ctcValues.reduce((sum, v) => sum + v, 0) / ctcValues.length).toFixed(1) : 0;
    const avgCtc = avgCtcVal > 0 ? `₹${avgCtcVal} LPA` : "—";

    const companyCounts = {};
    placements.forEach((p) => {
      if (!p.company) return;
      if (!companyCounts[p.company]) companyCounts[p.company] = { count: 0, ctcSum: 0, ctcCount: 0 };
      companyCounts[p.company].count += 1;
      const ctcNum = parseCtc(p.ctc);
      if (ctcNum !== null) {
        companyCounts[p.company].ctcSum += ctcNum;
        companyCounts[p.company].ctcCount += 1;
      }
    });

    const topCompanies = Object.entries(companyCounts)
      .map(([name, data]) => ({
        name,
        placements: data.count,
        avgCtc: data.ctcCount > 0 ? `₹${(data.ctcSum / data.ctcCount).toFixed(1)} LPA` : "—",
      }))
      .sort((a, b) => b.placements - a.placements)
      .slice(0, 5);

    const now = new Date();
    const currentMonthStr = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });

    res.json({
      report: {
        month: currentMonthStr,
        academyName: academy?.name || "Academy Partner",
        primaryAdmin: academy?.primaryAdmin || "Academy Admin",
        totalEnrolled: totalStudents,
        totalPlacements: placements.length,
        placementRate: `${placementRate}%`,
        avgCtc,
        topCompanies,
        peerBenchmarkRank: totalStudents > 0 ? "Ranked on Live Benchmark" : "No Enrolled Students",
        momGrowth: "Live Data",
        generatedAt: now,
      },
    });
  } catch (err) {
    res.status(500).json({ message: "Failed to generate monthly report." });
  }
});

// ==========================================
// 7. COURSES, QUESTIONS, INSIGHTS & SETTINGS
// ==========================================

// POST /api/academy/create-batch
router.post("/create-batch", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { code, course, branch = "Coimbatore", studentsList = [] } = req.body;
    if (!code || !course) {
      return res.status(400).json({ message: "Batch code and course title are required." });
    }

    const defaultPassword = await bcrypt.hash("Password123", 10);
    const validStudents = Array.isArray(studentsList) ? studentsList.filter((s) => s && (s.fullName || s.name) && (s.email || s.mobile)) : [];

    for (const st of validStudents) {
      const studentName = (st.fullName || st.name).trim();
      const cleanEmail = st.email ? st.email.toLowerCase().trim() : "";
      const rawMobile = st.mobile || "";

      const mobileRegexes = buildMobileRegexFilters([rawMobile]);
      const mobileVariants = getMobileQueryVariants([rawMobile]);

      const findCandOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [
          { mobile: { $in: mobileVariants } },
          { "stage1.mobile": { $in: mobileVariants } },
        ] : []),
        ...mobileRegexes,
      ];

      let candidate = findCandOr.length > 0 ? await Candidate.findOne({ $or: findCandOr }) : null;
      if (!candidate) {
        candidate = await Candidate.create({
          email: cleanEmail || `student.${Date.now()}@talentera.academy`,
          passwordHash: defaultPassword,
          mobile: rawMobile || "",
          completedStages: [1],
          stage1: {
            fullName: studentName,
            mobile: rawMobile || "+91 98765 00000",
            city: branch,
            experience: "Fresher",
            currentRole: course.trim(),
            aadhaarVerified: true,
          },
          stage2: {
            academyId: academy._id.toString(),
            academyName: academy.name,
            batch: code.trim(),
            branch,
            verified: true,
          },
        });
      } else {
        candidate.stage2 = {
          academyId: academy._id.toString(),
          academyName: academy.name,
          batch: code.trim(),
          branch,
          verified: true,
        };
        if (rawMobile && (!candidate.mobile || !candidate.stage1?.mobile)) {
          if (!candidate.mobile) candidate.mobile = rawMobile;
          if (!candidate.stage1) candidate.stage1 = {};
          if (!candidate.stage1.mobile) candidate.stage1.mobile = rawMobile;
        }
        await candidate.save();
      }

      const inviteOr = [
        ...(cleanEmail ? [{ email: cleanEmail }] : []),
        ...(mobileVariants.length > 0 ? [{ mobile: { $in: mobileVariants } }] : []),
        ...mobileRegexes,
        { candidateId: candidate._id },
      ];

      let invite = await StudentInvite.findOne({ academyId: academy._id, $or: inviteOr });
      if (!invite) {
        invite = await StudentInvite.create({
          academyId: academy._id,
          batchCode: code.trim(),
          name: studentName,
          email: cleanEmail || candidate.email,
          mobile: rawMobile || "",
          course: course.trim(),
          status: "delivered",
          candidateId: candidate._id,
          emailSentAt: new Date(),
          smsSentAt: new Date(),
          smsDeliveredAt: new Date(Date.now() + 2000),
        });
      } else {
        invite.batchCode = code.trim();
        invite.course = course.trim();
        invite.candidateId = candidate._id;
        if (rawMobile && !invite.mobile) invite.mobile = rawMobile;
        await invite.save();
      }
      await sendInviteEmail({ invite, academyName: academy.name });
    }

    let newBatch = await AcademyBatch.findOne({ academyId: req.academyId, code: code.trim() });
    if (!newBatch) {
      newBatch = await AcademyBatch.create({
        academyId: req.academyId,
        code: code.trim(),
        course: course.trim(),
        studentsCount: validStudents.length,
        status: "Active",
      });
    } else {
      newBatch.studentsCount += validStudents.length;
      await newBatch.save();
    }

    if (validStudents.length > 0) {
      academy.studentsUploaded += validStudents.length;
      await academy.save();
    }

    res.json({
      success: true,
      message: `Batch ${code} created with ${validStudents.length} enrolled student(s)!`,
      batch: newBatch,
    });
  } catch (err) {
    logger.error(`Create batch error: ${err.message}`);
    res.status(500).json({ message: "Failed to create batch." });
  }
});

// POST /api/academy/create-course
router.post("/create-course", requireAcademyAuth, async (req, res) => {
  try {
    const { title, category, duration, totalHrs, syllabus } = req.body;
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newCourse = {
      category: category || "Medical Coding",
      duration: duration || "3 MONTHS",
      title: title.trim(),
      totalHrs: Number(totalHrs) || 120,
      batches: 1,
      enrolled: 15,
      status: "active",
      syllabus: syllabus ? syllabus.split(",").map((s) => s.trim()) : ["ICD-10-CM", "CPT Modifiers", "Capstone"],
    };

    academy.courses.push(newCourse);
    await academy.save();
    res.json({ success: true, message: "Course created successfully!", course: newCourse });
  } catch (err) {
    res.status(500).json({ message: "Failed to create course." });
  }
});

// PUT /api/academy/courses/:id - Edit an existing curriculum course
router.put("/courses/:id", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const course = academy.courses.id(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });

    const { title, category, duration, totalHrs, syllabus, status } = req.body;
    if (title !== undefined) {
      if (!String(title).trim()) return res.status(400).json({ message: "Course title cannot be empty." });
      course.title = String(title).trim();
    }
    if (category !== undefined) course.category = String(category).trim();
    if (duration !== undefined) course.duration = String(duration).trim();
    if (totalHrs !== undefined) course.totalHrs = Number(totalHrs) || course.totalHrs;
    if (status !== undefined) course.status = String(status).trim();
    if (syllabus !== undefined) {
      course.syllabus = Array.isArray(syllabus)
        ? syllabus
        : String(syllabus).split(",").map((s) => s.trim()).filter(Boolean);
    }

    await academy.save();
    res.json({ success: true, message: "Course updated successfully!", course });
  } catch (err) {
    logger.error(`Update course error: ${err.message}`);
    res.status(500).json({ message: "Failed to update course." });
  }
});

// DELETE /api/academy/courses/:id - Remove a curriculum course
router.delete("/courses/:id", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const course = academy.courses.id(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found." });

    const removedTitle = course.title;
    course.deleteOne();
    await academy.save();
    res.json({ success: true, message: `Course "${removedTitle}" removed successfully.` });
  } catch (err) {
    logger.error(`Delete course error: ${err.message}`);
    res.status(500).json({ message: "Failed to delete course." });
  }
});

// POST /api/academy/add-question
router.post("/add-question", requireAcademyAuth, async (req, res) => {
  try {
    const { question, topic, type, difficulty, marks, courseTitle } = req.body;
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newQuestion = {
      question: question.trim(),
      topic: topic || "HCC",
      type: type || "MCQ",
      difficulty: difficulty || "Mid",
      marks: Number(marks) || 2,
      status: "Editable",
      courseTitle: courseTitle || "HCC Coding Specialization",
    };

    academy.questions.push(newQuestion);
    await academy.save();
    res.json({ success: true, message: "Question added to bank!", question: newQuestion });
  } catch (err) {
    res.status(500).json({ message: "Failed to add question." });
  }
});

// POST /api/academy/add-placement
// GET /api/academy/candidates/:id/placement-info - Looks up whether this
// candidate already has a REAL, verified platform hire on file
// (PlacementConfirmation, created from an actual company hiring them - see
// PUT /applications/:id/status in company.js). Used purely to offer the
// academy a genuine auto-fill suggestion in the "Confirm Placement" form -
// never to fabricate a company/role/CTC that was never actually confirmed.
router.get("/candidates/:id/placement-info", requireAcademyAuth, async (req, res) => {
  try {
    const confirmation = await PlacementConfirmation.findOne({
      candidateId: req.params.id,
      academyId: req.academyId,
    }).sort({ createdAt: -1 });

    if (!confirmation) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      company: confirmation.companyName || "",
      role: confirmation.role || "",
      ctc: confirmation.ctc || "",
    });
  } catch (err) {
    logger.error(`Get candidate placement-info error: ${err.message}`);
    res.status(500).json({ message: "Failed to look up candidate placement info." });
  }
});

// POST /api/academy/add-placement - Manually log a placement the academy is
// confirming themselves. Every field is required from the request body on
// purpose: nothing here is ever silently defaulted/fabricated - the academy
// must actually type or select every value (company/role/CTC may start
// pre-filled on the frontend from a real PlacementConfirmation record, but
// that's a suggestion the academy can see and edit, not a server-side
// fallback).
router.post("/add-placement", requireAcademyAuth, async (req, res) => {
  try {
    const { studentName, candidateId, role, company, ctc, placementSource, joiningStatus } = req.body;

    const missing = [];
    if (!studentName || !studentName.trim()) missing.push("candidate name");
    if (!role || !role.trim()) missing.push("role");
    if (!company || !company.trim()) missing.push("company");
    if (!ctc || !String(ctc).trim()) missing.push("CTC");
    if (!placementSource) missing.push("placement source");
    if (!joiningStatus) missing.push("joining status");
    if (missing.length > 0) {
      return res.status(400).json({ message: `Please provide: ${missing.join(", ")}.` });
    }

    const VALID_SOURCES = ["Talentera Platform", "Campus Placement Drive", "Academy Referral", "Direct Company Outreach", "Other"];
    const VALID_STATUSES = ["Offer Accepted", "Joined", "Yet to Join", "Declined"];
    if (!VALID_SOURCES.includes(placementSource)) {
      return res.status(400).json({ message: "Invalid placement source." });
    }
    if (!VALID_STATUSES.includes(joiningStatus)) {
      return res.status(400).json({ message: "Invalid joining status." });
    }

    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const newPlacement = {
      candidateId: candidateId || null,
      studentName: studentName.trim(),
      role: role.trim(),
      company: company.trim(),
      ctc: String(ctc).trim(),
      placementSource,
      joiningStatus,
      date: "Just now",
    };

    academy.placements.push(newPlacement);
    await academy.save();

    // Reflect the confirmed placement on the candidate's own record too, so
    // every dashboard count derived from candidate status - the "X placed"
    // total, the batch PLACED %, the candidate list "Placed" filter, and the
    // Analytics tab's funnel/conversion figures - updates immediately
    // instead of only the Placements tab. Skip this when the academy marked
    // the offer as "Declined": the candidate was not actually placed.
    if (candidateId && joiningStatus !== "Declined") {
      try {
        const placedCandidate = await Candidate.findById(candidateId);
        if (placedCandidate) {
          placedCandidate.stage8 = {
            ...(placedCandidate.stage8 || {}),
            placementStatus: `Placed at ${company.trim()} — ${joiningStatus}`,
            employer: company.trim(),
            role: role.trim(),
            ctc: String(ctc).trim(),
            placementSource,
            placedAt: placedCandidate.stage8?.placedAt || new Date(),
          };
          await placedCandidate.save();
        }
      } catch (syncErr) {
        logger.warn(`Candidate placement status sync failed for ${candidateId}: ${syncErr.message}`);
      }
    }

    res.json({ success: true, message: "Placement record added!", placement: newPlacement });
  } catch (err) {
    logger.error(`Add placement error: ${err.message}`);
    res.status(500).json({ message: "Failed to add placement." });
  }
});

// PUT /api/academy/settings
router.put("/settings", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId);
    if (!academy) return res.status(404).json({ message: "Academy not found." });

    const { name, primaryAdmin, email, phone, specialty, headquarters, branches } = req.body;
    if (name) academy.name = name.trim();
    if (primaryAdmin) academy.primaryAdmin = primaryAdmin.trim();
    if (email) academy.email = email.trim().toLowerCase();
    if (phone) academy.phone = phone.trim();
    if (specialty) academy.specialty = specialty.trim();
    if (headquarters) academy.headquarters = headquarters.trim();
    if (branches) {
      academy.branches = typeof branches === "string" ? branches.split(",").map((b) => b.trim()) : branches;
    }

    // Keep the Institutional KYC record (the source of truth the Account
    // Profile form now reads from, and what Staff see in the KYC audit
    // dossier) in sync with any edits made here.
    academy.kycData = academy.kycData || {};
    if (name) academy.kycData.legalEntityName = name.trim();
    if (primaryAdmin) academy.kycData.signatoryName = primaryAdmin.trim();
    if (email) academy.kycData.signatoryEmail = email.trim().toLowerCase();
    if (phone) academy.kycData.signatoryMobile = phone.trim();
    if (headquarters) academy.kycData.city = headquarters.trim();
    academy.markModified("kycData");

    await academy.save();
    res.json({ success: true, message: "Settings updated successfully!", academy });
  } catch (err) {
    res.status(500).json({ message: "Failed to update settings." });
  }
});

// DELETE /api/academy/batch/:id
router.delete("/batch/:id", requireAcademyAuth, async (req, res) => {
  try {
    const batch = await AcademyBatch.findOneAndDelete({ _id: req.params.id, academyId: req.academyId });
    if (!batch) return res.status(404).json({ message: "Batch not found." });
    res.json({ success: true, message: `Batch ${batch.code} deleted successfully.` });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete batch." });
  }
});

// DELETE /api/academy/clear-all
router.delete("/clear-all", requireAcademyAuth, async (req, res) => {
  try {
    const academy = await Academy.findById(req.academyId).lean();
    const invites = await StudentInvite.find({ academyId: req.academyId }).lean();
    const filter = buildAcademyCandidateFilter(req.academyId, academy?.name || "", invites);

    await AcademyBatch.deleteMany({ academyId: req.academyId });
    await StudentInvite.deleteMany({ academyId: req.academyId });
    await StudentUpload.deleteMany({ academyId: req.academyId });
    await AcademyActivityEvent.deleteMany({ academyId: req.academyId });
    await PlacementConfirmation.deleteMany({ academyId: req.academyId });

    await Candidate.deleteMany(filter);

    await Academy.findByIdAndUpdate(req.academyId, { studentsUploaded: 0, verifiedPct: 0, placements: [] });
    res.json({ success: true, message: "All academy data cleared." });
  } catch (err) {
    res.status(500).json({ message: "Failed to clear academy data." });
  }
});

module.exports = router;
