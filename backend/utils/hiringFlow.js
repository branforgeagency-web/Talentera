// Shared helpers for the batch hiring flow (routes/hiring.js).
const crypto = require("crypto");
const Notification = require("../models/Notification");
const { sendTransactionalEmail, wrapEmailTemplate } = require("./email");
const logger = require("./logger");

// Pipeline stage -> Application.status kept in sync so the older Applicants / candidate views still work.
const STAGE_TO_STATUS = {
  applied: "applied",
  exam: "shortlisted",
  technical: "interviewing",
  hr: "interviewing",
  approval: "interviewing",
  offered: "hired",
  hold: "on_hold",
  rejected: "rejected",
};

const STAGES = ["applied", "exam", "technical", "hr", "approval", "offered", "hold", "rejected"];

function ensureHiring(app) {
  if (!app.hiring || typeof app.hiring !== "object") app.hiring = {};
  if (!app.hiring.stage) app.hiring.stage = "applied";
  if (!Array.isArray(app.hiring.audit)) app.hiring.audit = [];
  return app.hiring;
}

function setStage(app, stage) {
  const h = ensureHiring(app);
  h.stage = stage;
  if (STAGE_TO_STATUS[stage]) app.status = STAGE_TO_STATUS[stage];
  app.markModified("hiring");
}

function audit(app, by, action, detail = "") {
  const h = ensureHiring(app);
  h.audit.push({ at: new Date().toISOString(), by: by || "System", action, detail: String(detail || "").slice(0, 400) });
  app.markModified("hiring");
}

function randomToken(bytes = 8) {
  return crypto.randomBytes(bytes).toString("hex");
}

// Free, working video room (Jitsi Meet) - no account or API key needed.
function buildMeetingLink(app) {
  return `https://meet.jit.si/Talentera-${String(app._id).slice(-8)}-${randomToken(3)}`;
}

function candidateText(candidate) {
  const c = candidate || {};
  return [
    c.stage2?.specialty, c.stage2?.domain, c.stage2?.courseName, c.stage1?.currentRole,
    c.rcmDomainSelection?.primaryDomain, (c.rcmDomainSelection?.secondaryDomains || []).join(" "),
    c.stage3?.certName, c.stage3?.certCode,
  ].filter(Boolean).join(" ").toLowerCase();
}

function candidateCity(candidate) {
  return String(candidate?.stage1?.city || candidate?.stage1?.currentCity || "").toLowerCase();
}

// Pick a specialty panel: keyword match first (least loaded wins), otherwise the floater / least loaded panel.
function pickPanel(candidate, panels, load) {
  if (!panels || panels.length === 0) return null;
  const text = candidateText(candidate);
  const kw = (p) => String(`${p.keywords || ""},${p.specialty || ""}`).toLowerCase().split(",").map((x) => x.trim()).filter(Boolean);
  const matches = panels.filter((p) => !p.isFloater && kw(p).some((k) => text.includes(k)));
  const pool = matches.length > 0 ? matches : (panels.filter((p) => p.isFloater).length ? panels.filter((p) => p.isFloater) : panels);
  return pool.slice().sort((a, b) => (load[String(a._id)] || 0) - (load[String(b._id)] || 0))[0];
}

function pickHr(candidate, hrs, load) {
  if (!hrs || hrs.length === 0) return null;
  const text = candidateText(candidate);
  const city = candidateCity(candidate);
  const score = (h) => {
    let s = 0;
    if (city && h.city && city.includes(String(h.city).toLowerCase())) s += 2;
    if (h.specialty && String(h.specialty).toLowerCase().split(",").some((k) => k.trim() && text.includes(k.trim()))) s += 1;
    return s;
  };
  const best = Math.max(...hrs.map(score));
  const pool = hrs.filter((h) => score(h) === best);
  return pool.slice().sort((a, b) => (load[String(a._id)] || 0) - (load[String(b._id)] || 0))[0];
}

function pct(n, d) {
  return d > 0 ? Math.round((n / d) * 100) : 0;
}

// Composite for ranking at management approval: exam 40% + technical 40% + verified Talentera score 20%.
function compositeScore(app, talenteraScore = 0) {
  const h = app.hiring || {};
  const exam = Number(h.exam?.score);
  const tech = Number(h.technical?.avgScore);
  const parts = [];
  if (Number.isFinite(exam)) parts.push([exam, 0.4]);
  if (Number.isFinite(tech)) parts.push([tech, 0.4]);
  parts.push([Number(talenteraScore) || 0, 0.2]);
  const w = parts.reduce((s, p) => s + p[1], 0);
  return Math.round(parts.reduce((s, p) => s + p[0] * p[1], 0) / w);
}

// In-app notification + (best-effort) email to a candidate.
async function notifyCandidate(app, { title, message, type = "hiring_update", companyName = "", email, name, emailHtml } ) {
  try {
    await Notification.create({
      recipientType: "candidate",
      recipientId: String(app.candidateId?._id || app.candidateId),
      title,
      message,
      type,
      meta: { source: "company", companyName, applicationId: String(app._id), actionType: "hiring", actionLabel: "Open Hiring Rounds" },
    });
  } catch (err) {
    logger.warn(`Hiring notification failed: ${err.message}`);
  }
  if (email) {
    sendTransactionalEmail({
      to: email,
      toName: name || "there",
      subject: title,
      html: wrapEmailTemplate(title, emailHtml || `<p style="color:#475569;font-size:15px;line-height:1.5;">Hi ${name || "there"},</p><p style="color:#475569;font-size:15px;line-height:1.5;">${message}</p>`),
    }).catch((err) => logger.warn(`Hiring email failed for ${email}: ${err.message}`));
  }
}

// Run `fn` over items with a small concurrency limit (offers fire "in parallel" without flooding Mongo / Brevo).
async function runParallel(items, fn, limit = 10) {
  const results = [];
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      try { results[idx] = await fn(items[idx], idx); } catch (err) { results[idx] = { error: err.message }; }
    }
  });
  await Promise.all(workers);
  return results;
}

function gradeExam(questions, answers) {
  const total = questions.length;
  let correct = 0;
  const topics = {};
  questions.forEach((q, i) => {
    const t = q.topic || "General";
    topics[t] = topics[t] || { topic: t, correct: 0, total: 0 };
    topics[t].total += 1;
    if (Number(answers?.[i]) === Number(q.correct)) {
      correct += 1;
      topics[t].correct += 1;
    }
  });
  return { total, correct, score: pct(correct, total), topicBreakdown: Object.values(topics) };
}

module.exports = {
  STAGES, STAGE_TO_STATUS, ensureHiring, setStage, audit, randomToken, buildMeetingLink,
  pickPanel, pickHr, compositeScore, notifyCandidate, runParallel, gradeExam, pct, candidateText,
};
