/**
 * Twice-weekly career updates for every candidate (Email + WhatsApp):
 *   - new job openings (preferred-city jobs first)
 *   - new hiring companies on Talentera
 *   - training: the next unfinished stage of their profile
 *   - reminders: applications in progress, pending invites
 *
 * Runs from an hourly timer; a digest goes out on Tuesday and Friday after 10:00 IST. Each candidate is
 * claimed atomically (lastEngagementAt) before sending, so restarts / multiple instances never double-send.
 * Candidates can opt out of email and/or WhatsApp in Settings (updatesEmail / updatesWhatsapp).
 *
 * Env: CANDIDATE_DIGEST_ENABLED=false turns it off. CANDIDATE_DIGEST_MAX_PER_TICK (default 300) caps one hourly run.
 */
const Candidate = require("../models/Candidate");
const Job = require("../models/Job");
const Company = require("../models/Company");
const Application = require("../models/Application");
const logger = require("./logger");
const { sendTransactionalEmail, wrapEmailTemplate, isBrevoConfigured } = require("./email");
const { sendWhatsAppMessage } = require("./whatsapp");
const { describeJob } = require("./jobAlerts");

const APP_URL = (process.env.APP_URL || "https://talentera-nine.vercel.app").replace(/\/$/, "");
const DIGEST_DAYS = [2, 5]; // Tuesday, Friday (IST)
const DIGEST_FROM_HOUR_IST = 10;
const MIN_GAP_MS = 2.5 * 24 * 60 * 60 * 1000; // never more than one digest per ~2.5 days
const LOOKBACK_MS = 14 * 24 * 60 * 60 * 1000;
const BATCH = 10;

const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const STAGE_NAMES = {
  1: "Basic Info & Aadhaar", 2: "Training & Foundation", 3: "Certification", 4: "Skill Assessment",
  5: "Video Pitch", 6: "Live Chart Practice", 7: "Resume", 8: "Career Passport",
};

function istNow(ref = new Date()) {
  const d = new Date(ref.getTime() + 5.5 * 60 * 60 * 1000);
  return { day: d.getUTCDay(), hour: d.getUTCHours() };
}
function isDigestWindow(ref = new Date()) {
  const { day, hour } = istNow(ref);
  return DIGEST_DAYS.includes(day) && hour >= DIGEST_FROM_HOUR_IST;
}

/** Everything that is the same for all candidates in one run. */
async function loadShared() {
  const since = new Date(Date.now() - LOOKBACK_MS);
  const [jobs, jdCompanies, newCompanies] = await Promise.all([
    Job.find({ published: true, approvalStatus: "approved", createdAt: { $gte: since } })
      .populate("companyId", "companyName stage1a")
      .sort({ createdAt: -1 }).limit(60).lean(),
    Company.find({ jdPublished: true, jdApprovalStatus: "approved", jdPublishedAt: { $gte: since } })
      .select("companyName stage1a stage9 jobId").limit(60).lean(),
    Company.find({ kycStatus: "verified", createdAt: { $gte: since } }).select("companyName stage1a").limit(10).lean(),
  ]);
  const openings = [
    ...jobs.map((j) => describeJob(j.fields, j.companyId || {})),
    ...jdCompanies.map((c) => describeJob(c.stage9, c)),
  ].filter((j) => j.title);
  const companyNames = Array.from(new Set(newCompanies.map((c) => c.companyName || c.stage1a?.legalname).filter(Boolean))).slice(0, 5);
  return { openings, companyNames };
}

/** Pick up to 5 openings for this candidate - preferred cities in priority order first. */
function pickOpenings(openings, candidate) {
  const prefs = (Array.isArray(candidate.stage1?.preferredCities) ? candidate.stage1.preferredCities : [])
    .map((c) => String(c).toLowerCase().trim()).filter(Boolean);
  const home = String(candidate.stage1?.city || "").toLowerCase().trim();
  const experienced = /exp/i.test(String(candidate.stage1?.experience || ""));
  const rank = (j) => {
    const loc = String(j.location || "").toLowerCase();
    const i = prefs.findIndex((c) => loc.includes(c));
    if (i >= 0) return i;
    if (home && loc.includes(home)) return prefs.length;
    if (/remote|global/.test(`${loc} ${String(j.workMode || "").toLowerCase()}`)) return prefs.length + 1;
    return prefs.length + 2;
  };
  return openings
    .filter((j) => !(experienced && /fresher/i.test(String(j.experience || "")) && !/yrs/.test(String(j.experience || ""))))
    .map((j, i) => ({ j, i, r: rank(j) }))
    .sort((a, b) => a.r - b.r || a.i - b.i)
    .slice(0, 5)
    .map((o) => ({ ...o.j, preferred: o.r < prefs.length }));
}

async function buildContent(candidate, shared) {
  const name = (candidate.stage1?.fullName || "").split(" ")[0] || "there";
  const jobs = pickOpenings(shared.openings, candidate);
  const done = Array.isArray(candidate.completedStages) ? candidate.completedStages : [];
  const experienced = /exp/i.test(String(candidate.stage1?.experience || ""));
  const nextStage = [1, 2, 3, 4, 5, 6, 7, 8].find((n) => !done.includes(n) && !(experienced && n === 4));
  const [inProgress, pendingInvites] = await Promise.all([
    Application.countDocuments({ candidateId: candidate._id, status: { $in: ["shortlisted", "interviewing", "on_hold"] } }),
    Application.countDocuments({ candidateId: candidate._id, status: "invited" }).catch(() => 0),
  ]);
  const reminders = [];
  if (inProgress > 0) reminders.push(`You have ${inProgress} application${inProgress === 1 ? "" : "s"} in progress - check your hiring rounds.`);
  if (pendingInvites > 0) reminders.push(`${pendingInvites} company invite${pendingInvites === 1 ? "" : "s"} waiting for your reply.`);
  const training = nextStage
    ? `Next step for your profile: complete ${STAGE_NAMES[nextStage]} (Stage ${nextStage}) - verified profiles get seen first by companies.`
    : "Your profile is fully verified. Keep practising live charts and mock interviews to stay interview-ready.";
  return { name, jobs, companyNames: shared.companyNames, training, reminders };
}

function buildEmail(c) {
  const jobRows = c.jobs.map((j) => `
    <div style="border:1px solid #E2E8F0;border-radius:10px;padding:10px 14px;margin:8px 0;">
      <div style="font-size:14px;font-weight:800;color:#0A1F3D;">${esc(j.title)}${j.preferred ? ' <span style="background:#EEF2FF;color:#4338CA;font-size:10.5px;padding:2px 7px;border-radius:999px;">📍 your city</span>' : ""}</div>
      <div style="font-size:12.5px;color:#475569;margin-top:3px;">${esc([j.companyName, j.location, j.workMode, j.salary].filter(Boolean).join(" · "))}</div>
    </div>`).join("");
  const body = `
    <p style="color:#334155;font-size:14px;line-height:1.6;">Hi ${esc(c.name)}, here is your Talentera update.</p>
    ${c.jobs.length ? `<h3 style="font-size:15px;color:#0A1F3D;margin:16px 0 4px;">💼 New job openings for you</h3>${jobRows}
      <a href="${APP_URL}/jobs" style="display:inline-block;background:#F5B41A;color:#0F172A;text-decoration:none;font-weight:800;font-size:13px;padding:9px 18px;border-radius:10px;margin-top:6px;">Browse all jobs →</a>` : ""}
    ${c.companyNames.length ? `<h3 style="font-size:15px;color:#0A1F3D;margin:18px 0 4px;">🏢 New hiring companies</h3><p style="color:#334155;font-size:13.5px;">${esc(c.companyNames.join(", "))} joined Talentera recently.</p>` : ""}
    <h3 style="font-size:15px;color:#0A1F3D;margin:18px 0 4px;">🎓 Training &amp; profile</h3><p style="color:#334155;font-size:13.5px;line-height:1.55;">${esc(c.training)}</p>
    ${c.reminders.length ? `<h3 style="font-size:15px;color:#0A1F3D;margin:18px 0 4px;">⏰ Reminders</h3>${c.reminders.map((r) => `<p style="color:#334155;font-size:13.5px;margin:4px 0;">• ${esc(r)}</p>`).join("")}` : ""}
    <p style="color:#94A3B8;font-size:11px;margin-top:20px;">You get these updates twice a week. Turn them off any time in Dashboard → Settings → Notifications.</p>`;
  return { subject: c.jobs.length ? `${c.jobs.length} new job${c.jobs.length === 1 ? "" : "s"} for you on Talentera` : "Your Talentera update", html: wrapEmailTemplate("Your Talentera update", body) };
}

function buildWhatsApp(c) {
  const lines = [`Hi ${c.name}, your Talentera update:`];
  if (c.jobs.length) {
    lines.push("", "New jobs:");
    c.jobs.slice(0, 3).forEach((j) => lines.push(`- ${j.title}, ${j.companyName}${j.location ? ` (${j.location})` : ""}`));
  }
  if (c.companyNames.length) lines.push("", `New hiring companies: ${c.companyNames.slice(0, 3).join(", ")}`);
  lines.push("", c.training);
  c.reminders.forEach((r) => lines.push(r));
  lines.push("", `Open: ${APP_URL}/jobs`, "Switch these updates off any time in Dashboard > Settings > Notifications.");
  return lines.join("\n");
}

async function sendOne(candidate, shared) {
  const content = await buildContent(candidate, shared);
  // Nothing useful to say -> skip quietly
  if (!content.jobs.length && !content.companyNames.length && !content.reminders.length && !content.training) return { skipped: true };
  const out = { email: false, whatsapp: false };
  if (candidate.updatesEmail !== false && candidate.email && isBrevoConfigured()) {
    const { subject, html } = buildEmail(content);
    const r = await sendTransactionalEmail({ to: candidate.email, toName: candidate.stage1?.fullName, subject, html });
    out.email = Boolean(r && r.sent);
  }
  const mobile = candidate.stage1?.mobile || candidate.mobile || "";
  if (candidate.updatesWhatsapp !== false && mobile) {
    const r = await sendWhatsAppMessage({ mobile, message: buildWhatsApp(content), candidateName: content.name, smsFallback: false });
    out.whatsapp = Boolean(r && r.sent);
  }
  return out;
}

async function runCandidateDigest({ force = false } = {}) {
  if (process.env.CANDIDATE_DIGEST_ENABLED === "false") return { skipped: "disabled" };
  if (!force && !isDigestWindow()) return { skipped: "outside_window" };
  const max = Math.max(1, Number(process.env.CANDIDATE_DIGEST_MAX_PER_TICK) || 300);
  const shared = await loadShared();
  const cutoff = new Date(Date.now() - MIN_GAP_MS);
  let sentEmail = 0, sentWa = 0, processed = 0;

  while (processed < max) {
    // Claim a batch atomically so another instance / restart can't send the same digest twice
    const batch = [];
    for (let i = 0; i < BATCH && processed + batch.length < max; i++) {
      const c = await Candidate.findOneAndUpdate(
        { stage1: { $ne: null }, $or: [{ lastEngagementAt: null }, { lastEngagementAt: { $lt: cutoff } }], $and: [{ $or: [{ updatesEmail: { $ne: false } }, { updatesWhatsapp: { $ne: false } }] }] },
        { $set: { lastEngagementAt: new Date() } },
        { new: true }
      ).select("email mobile stage1 completedStages updatesEmail updatesWhatsapp").lean();
      if (!c) break;
      batch.push(c);
    }
    if (!batch.length) break;
    const results = await Promise.all(batch.map((c) => sendOne(c, shared).catch((err) => { logger.warn(`Digest failed for ${c._id}: ${err.message}`); return {}; })));
    results.forEach((r) => { if (r.email) sentEmail++; if (r.whatsapp) sentWa++; });
    processed += batch.length;
    await new Promise((r) => setTimeout(r, 400));
  }
  if (processed) logger.info(`[CANDIDATE DIGEST] processed ${processed}: ${sentEmail} emails, ${sentWa} WhatsApp`);
  return { processed, sentEmail, sentWa };
}

function initCandidateEngagementScheduler() {
  const HOUR = 60 * 60 * 1000;
  setTimeout(() => runCandidateDigest().catch((e) => logger.warn(`Digest run failed: ${e.message}`)), 60 * 1000);
  setInterval(() => runCandidateDigest().catch((e) => logger.warn(`Digest run failed: ${e.message}`)), HOUR).unref();
  logger.info("[CANDIDATE DIGEST] Twice-weekly (Tue & Fri) email + WhatsApp updates scheduler initialized.");
}

module.exports = { initCandidateEngagementScheduler, runCandidateDigest, buildContent, buildEmail, buildWhatsApp, isDigestWindow };
