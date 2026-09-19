/**
 * "New job on Talentera" email alerts.
 *
 * When a job becomes visible in the candidate dashboard's Browse Jobs (published AND approved),
 * every candidate who has job alerts on gets one email. Each job is announced exactly once:
 * the announce* functions atomically "claim" the job (candidateAlertSentAt) before sending, so
 * calling them from several places (company publish, staff approval, KYC approval) is safe.
 *
 * Sending happens in the background - callers never wait on it and it never throws.
 */
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const Job = require("../models/Job");
const logger = require("./logger");
const { sendTransactionalEmail, wrapEmailTemplate, isBrevoConfigured } = require("./email");

const APP_URL = (process.env.APP_URL || "https://talentera-nine.vercel.app").replace(/\/$/, "");
const BATCH_SIZE = 10;
const BATCH_DELAY_MS = 400;

const esc = (v) =>
  String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function describeJob(fields = {}, company = {}) {
  const f = fields || {};
  const companyName = company.companyName || company.stage1a?.legalname || "a Talentera hiring partner";
  const compMin = f.compmin, compMax = f.compmax;
  const salary = compMin && compMax ? `₹${compMin} – ₹${compMax} LPA` : compMin ? `From ₹${compMin} LPA` : "";
  const hasExp = (v) => v !== undefined && v !== null && v !== "";
  const experience = hasExp(f.expmin) && hasExp(f.expmax) ? `${f.expmin}–${f.expmax} yrs` : "";
  return {
    title: f.roletitle || "New role",
    companyName,
    location: f.location || "",
    workMode: f.workmode || "",
    specialty: f.specialty || "",
    salary,
    experience,
    openings: f.openings || "",
    urgency: f.urgency || "",
  };
}

function buildEmail(job, candidate) {
  const name = candidate.stage1?.fullName || "there";
  const preferred = Array.isArray(candidate.stage1?.preferredCities) ? candidate.stage1.preferredCities : [];
  const cityMatch = job.location && preferred.some((c) => String(job.location).toLowerCase().includes(String(c).toLowerCase()));

  const rows = [
    ["Company", job.companyName],
    ["Location", [job.location, job.workMode].filter(Boolean).join(" · ")],
    ["Specialty", job.specialty],
    ["Salary", job.salary],
    ["Experience", job.experience],
    ["Openings", job.openings],
  ]
    .filter(([, v]) => v)
    .map(([k, v]) => `<tr><td style="padding:6px 0;color:#64748B;font-size:13px;width:110px;">${k}</td><td style="padding:6px 0;color:#0F172A;font-size:13px;font-weight:600;">${esc(v)}</td></tr>`)
    .join("");

  const body = `
    <p style="color:#334155;font-size:14px;line-height:1.6;">Hi ${esc(name)},</p>
    <p style="color:#334155;font-size:14px;line-height:1.6;">A new role just went live in <strong>Browse Jobs</strong> on your Talentera dashboard.</p>
    ${cityMatch ? `<p style="background:#F0FDF4;border:1px solid #BBF7D0;color:#166534;font-size:12.5px;padding:8px 12px;border-radius:8px;">📍 This matches one of your preferred cities.</p>` : ""}
    <div style="border:1px solid #E2E8F0;border-radius:10px;padding:14px 16px;margin:14px 0;">
      <div style="font-size:16px;font-weight:800;color:#0A1F3D;margin-bottom:6px;">${esc(job.title)}${job.urgency ? ` <span style="background:#FEF3C7;color:#92400E;font-size:11px;padding:2px 8px;border-radius:999px;">${esc(job.urgency)}</span>` : ""}</div>
      <table style="border-collapse:collapse;width:100%;">${rows}</table>
    </div>
    <a href="${APP_URL}/jobs" style="display:inline-block;background:#F5B41A;color:#0F172A;text-decoration:none;font-weight:800;font-size:14px;padding:11px 22px;border-radius:10px;">View &amp; Apply →</a>
    <p style="color:#94A3B8;font-size:11px;margin-top:18px;">You're receiving this because job alerts are on for your Talentera account.</p>`;

  return {
    subject: `New job on Talentera: ${job.title} at ${job.companyName}${job.location ? ` — ${job.location}` : ""}`,
    html: wrapEmailTemplate("New job posted for you 🎯", body),
  };
}

async function sendToCandidates(jobInfo, label) {
  try {
    if (!isBrevoConfigured()) {
      logger.info(`[JOB ALERT SKIPPED - Brevo not configured] ${label}`);
      return;
    }
    const candidates = await Candidate.find({ jobAlertEmails: { $ne: false }, email: { $exists: true, $ne: "" } })
      .select("email stage1.fullName stage1.preferredCities")
      .lean();

    let sent = 0;
    let failed = 0;
    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
      const batch = candidates.slice(i, i + BATCH_SIZE);
      const results = await Promise.all(
        batch.map((c) => {
          const { subject, html } = buildEmail(jobInfo, c);
          return sendTransactionalEmail({ to: c.email, toName: c.stage1?.fullName, subject, html });
        })
      );
      results.forEach((r) => (r.sent ? sent++ : failed++));
      if (i + BATCH_SIZE < candidates.length) await new Promise((r) => setTimeout(r, BATCH_DELAY_MS));
    }
    logger.info(`Job alert "${label}": ${sent} sent, ${failed} failed, ${candidates.length} candidates`);
  } catch (err) {
    logger.error(`Job alert failed (${label}): ${err.message}`);
  }
}

/** A job from the Job collection (posted after onboarding). Accepts a doc or an _id. */
async function announcePostedJob(jobOrId) {
  try {
    const id = jobOrId?._id || jobOrId;
    const claimed = await Job.findOneAndUpdate(
      { _id: id, published: true, approvalStatus: "approved", candidateAlertSentAt: null },
      { $set: { candidateAlertSentAt: new Date() } },
      { new: true }
    ).lean();
    if (!claimed) return false;
    const company = await Company.findById(claimed.companyId).select("companyName stage1a").lean();
    const info = describeJob(claimed.fields, company || {});
    setImmediate(() => sendToCandidates(info, `${claimed.jobId} ${info.title}`));
    return true;
  } catch (err) {
    logger.error(`announcePostedJob error: ${err.message}`);
    return false;
  }
}

/** The onboarding "first JD" that lives on the Company document. Accepts a doc or an _id. */
async function announceOnboardingJd(companyOrId) {
  try {
    const id = companyOrId?._id || companyOrId;
    const claimed = await Company.findOneAndUpdate(
      { _id: id, jdPublished: true, jdApprovalStatus: "approved", jdCandidateAlertSentAt: null },
      { $set: { jdCandidateAlertSentAt: new Date() } },
      { new: true }
    )
      .select("companyName stage1a stage9 jobId")
      .lean();
    if (!claimed) return false;
    const info = describeJob(claimed.stage9, claimed);
    setImmediate(() => sendToCandidates(info, `${claimed.jobId} ${info.title}`));
    return true;
  } catch (err) {
    logger.error(`announceOnboardingJd error: ${err.message}`);
    return false;
  }
}

module.exports = { announcePostedJob, announceOnboardingJd, describeJob, buildEmail };
