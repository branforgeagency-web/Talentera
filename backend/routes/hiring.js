// Batch hiring flow for companies (poster: "100 applicants -> 50 batch hires").
//   1 Applicants -> 2 Allocate exam -> 3 Auto-scored exam + cutoff gate -> 4 Technical round (panels)
//   -> 5 HR round -> 6 Management batch approval -> 7 Offers in parallel (+ audit trail)
// Three routers live here:
//   companyRouter   - mounted at /api/company/hiring           (company login)
//   candidateRouter - mounted at /api/candidate/hiring         (candidate login)
//   publicRouter    - mounted at /api/hiring-public            (integration key / check-in token)
const express = require("express");
const mongoose = require("mongoose");
const Application = require("../models/Application");
const Candidate = require("../models/Candidate");
const Company = require("../models/Company");
const College = require("../models/College");
const Job = require("../models/Job");
const HiringExam = require("../models/HiringExam");
const HiringSetup = require("../models/HiringSetup");
const { requireCompanyAuth, requireAuth } = require("../middleware/auth");
const { upload, handleUpload } = require("../middleware/upload");
const { calculateVerificationScore } = require("../utils/verificationScore");
const { DEFAULT_ASSESSMENT_DOMAINS } = require("../data/defaultAssessmentQuestions");
const H = require("../utils/hiringFlow");
const Notification = require("../models/Notification");
const { sendTransactionalEmail, wrapEmailTemplate } = require("../utils/email");
const logger = require("../utils/logger");

const IN_FLOW = ["exam", "technical", "hr", "approval", "offered", "hold", "rejected"];

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------
async function getSetup(companyId) {
  let setup = await HiringSetup.findOne({ companyId });
  if (!setup) {
    setup = await HiringSetup.create({
      companyId,
      integrationKey: H.randomToken(16),
      panels: [{ name: "General Floater Panel", specialty: "General", keywords: "", isFloater: true, members: [] }],
    });
  } else if (!setup.integrationKey) {
    setup.integrationKey = H.randomToken(16);
    await setup.save();
  }
  return setup;
}

async function jobTitles(company, apps) {
  const titles = {};
  if (company?.jdPublished && company.jobId) titles[company.jobId] = company.stage9?.roletitle || "Untitled role";
  const ids = [...new Set(apps.map((a) => a.jobId).filter((id) => !titles[id]))];
  if (ids.length) {
    const jobs = await Job.find({ jobId: { $in: ids } }).select("jobId fields.roletitle").lean();
    jobs.forEach((j) => { titles[j.jobId] = j.fields?.roletitle || "Untitled role"; });
  }
  return titles;
}

function candidateSummary(c) {
  const s1 = c.stage1 || {};
  const scoring = calculateVerificationScore(c.completedStages || [], c);
  return {
    id: c._id,
    name: s1.fullName || (c.email || "").split("@")[0],
    city: s1.city || "",
    experience: s1.experience || "",
    specialty: c.stage2?.specialty || c.rcmDomainSelection?.primaryDomain || s1.currentRole || "",
    academyName: c.stage2?.academyName || "",
    batch: c.stage2?.batch || "",
    collegeId: c.collegeId ? String(c.collegeId) : "",
    talentScore: scoring.score,
    email: c.email || "",
  };
}

// Never leak the candidate's answers / raw proctor payload to the company list.
function shapeApp(app, titles) {
  const h = app.hiring || {};
  const c = app.candidateId && app.candidateId._id ? app.candidateId : null;
  const cs = c ? candidateSummary(c) : { id: app.candidateId, name: "Candidate", city: "", experience: "", specialty: "", talentScore: 0, email: "" };
  let exam = h.exam ? { ...h.exam, answers: undefined } : null;
  if (exam) {
    // If candidate was rejected in assessment or overall application is rejected
    if (app.status === "rejected" || h.stage === "rejected" || h.rejection?.round === "exam") {
      if (exam.score !== undefined && exam.cutoffPct) {
        exam.passed = exam.score >= Number(exam.cutoffPct);
      } else if (h.rejection?.round === "exam") {
        exam.passed = false;
      }
      if (!exam.completedAt && h.rejection?.at) {
        exam.completedAt = h.rejection.at;
      }
      if (!exam.status || exam.status === "pending") {
        exam.status = "completed";
      }
    }
  }
  return {
    id: app._id,
    jobId: app.jobId,
    jobTitle: titles[app.jobId] || "Untitled role",
    status: app.status,
    interviewOutcome: app.interviewOutcome || "",
    interviewOutcomeNote: app.interviewOutcomeNote || "",
    rescheduleCount: app.rescheduleCount || 0,
    stage: h.stage || "applied",
    appliedAt: app.createdAt,
    candidate: cs,
    exam,
    technical: h.technical || null,
    hr: h.hr || null,
    approval: h.approval || null,
    offer: h.offer || null,
    rejection: h.rejection || null,
    composite: H.compositeScore(app, cs.talentScore),
  };
}

function funnelOf(apps) {
  const f = { applied: apps.length, examAllocated: 0, examTaken: 0, examPassed: 0, techCleared: 0, hrCleared: 0, approved: 0, offered: 0 };
  apps.forEach((a) => {
    const h = a.hiring || {};
    if (h.exam?.allocatedAt) f.examAllocated += 1;
    if (h.exam?.completedAt) f.examTaken += 1;
    if (h.exam?.passed) f.examPassed += 1;
    if (h.technical?.decision === "pass") f.techCleared += 1;
    if (h.hr?.decision === "hire") f.hrCleared += 1;
    if (h.approval?.decision === "approve") f.approved += 1;
    if (h.offer?.sentAt) f.offered += 1;
  });
  return f;
}

async function loadApps(companyId, { jobId, ids } = {}) {
  const q = { companyId };
  if (jobId) q.jobId = jobId;
  if (ids) q._id = { $in: ids };
  return Application.find(q).populate("candidateId").sort({ createdAt: -1 });
}

const examLive = (apps) => {
  const out = { completed: 0, inProgress: 0, notStarted: 0 };
  apps.forEach((a) => {
    const e = a.hiring?.exam;
    if (!e || !e.allocatedAt) return;
    if (e.completedAt) out.completed += 1;
    else if (e.startedAt) out.inProgress += 1;
    else out.notStarted += 1;
  });
  return out;
};

// ---------------------------------------------------------------------------
// Question-bank helpers
// ---------------------------------------------------------------------------
function libraryCatalog() {
  return DEFAULT_ASSESSMENT_DOMAINS.map((d) => ({
    key: d.domain,
    title: `${d.domain} - Talentera Library`,
    questionCount: d.sections.reduce((n, s) => n + s.questions.length, 0),
    topics: d.sections.map((s) => s.name),
  }));
}

// Fisher-Yates shuffle (returns a new array)
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Per-attempt shuffle: the order of questions and of each question's options.
// answers coming back from the candidate are keyed by the shuffled positions.
function buildExamOrder(questions) {
  return shuffled(questions.map((_, i) => i)).map((q) => ({
    q,
    opts: shuffled((questions[q].options || []).map((_, i) => i)),
  }));
}

// Map answers given in shuffled positions back to the original question/option indexes.
function toOriginalAnswers(order, answers) {
  if (!Array.isArray(order) || !order.length) return answers || {};
  const out = {};
  Object.entries(answers || {}).forEach(([pos, opt]) => {
    const o = order[Number(pos)];
    if (!o) return;
    const oi = o.opts[Number(opt)];
    if (oi !== undefined) out[o.q] = oi;
  });
  return out;
}

function libraryQuestions(domain, count = 20) {
  const d = DEFAULT_ASSESSMENT_DOMAINS.find((x) => x.domain === domain);
  if (!d) return null;
  // Spread evenly across sections (random picks within each), then trim to `count`.
  const pools = d.sections.map((s) => shuffled(s.questions).map((q) => ({ topic: s.name, question: q.question, options: q.options, correct: q.correct })));
  const out = [];
  for (let i = 0; out.length < count && pools.some((p) => p[i]); i++) pools.forEach((p) => { if (p[i] && out.length < count) out.push(p[i]); });
  return out;
}

function parseCsv(text) {
  const rows = [];
  let row = [], cell = "", inQ = false;
  const s = String(text || "").replace(/^\uFEFF/, "");
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inQ) {
      if (ch === '"' && s[i + 1] === '"') { cell += '"'; i++; }
      else if (ch === '"') inQ = false;
      else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === ",") { row.push(cell); cell = ""; }
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && s[i + 1] === "\n") i++;
      row.push(cell); cell = "";
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== "")) rows.push(row);
  return rows;
}

// Expected columns: Question, Option A, Option B, Option C, Option D, Correct (A-D or 1-4), Topic (optional)
function questionsFromCsv(text) {
  const rows = parseCsv(text);
  if (rows.length < 2) return { error: "The file has no question rows." };
  const head = rows[0].map((h) => h.trim().toLowerCase());
  const find = (...names) => head.findIndex((h) => names.some((n) => h.includes(n)));
  const iQ = find("question");
  const iOpts = ["a", "b", "c", "d"].map((l) => head.findIndex((h) => h === `option ${l}` || h === `opt ${l}` || h === l || h === `option${l}`));
  const iAns = find("correct", "answer");
  const iTopic = find("topic", "section", "category");
  if (iQ < 0 || iOpts.some((i) => i < 0) || iAns < 0) {
    return { error: "Columns needed: Question, Option A, Option B, Option C, Option D, Correct (A-D). Topic is optional." };
  }
  const questions = [];
  const problems = [];
  rows.slice(1).forEach((r, idx) => {
    const question = (r[iQ] || "").trim();
    const options = iOpts.map((i) => (r[i] || "").trim());
    const raw = String(r[iAns] || "").trim().toUpperCase();
    const correct = /^[A-D]$/.test(raw) ? raw.charCodeAt(0) - 65 : /^[1-4]$/.test(raw) ? Number(raw) - 1 : -1;
    if (!question || options.filter(Boolean).length < 2 || correct < 0 || !options[correct]) {
      problems.push(`Row ${idx + 2}`);
      return;
    }
    questions.push({ question, options, correct, topic: iTopic >= 0 && (r[iTopic] || "").trim() ? r[iTopic].trim() : "General" });
  });
  if (questions.length === 0) return { error: `No valid questions found (check rows: ${problems.slice(0, 5).join(", ")}).` };
  return { questions, skipped: problems.length };
}

// ---------------------------------------------------------------------------
// Shared "exam finished" logic (candidate submit, manual score, integration score)
// ---------------------------------------------------------------------------
async function completeExam(app, { score, correct, total, topicBreakdown, source, by }) {
  const h = H.ensureHiring(app);
  const company = await Company.findById(app.companyId).select("companyName").lean();
  const companyName = company?.companyName || "the employer";
  const cutoff = Number(h.exam?.cutoffPct) || 65;
  h.exam = {
    ...h.exam,
    status: "completed",
    completedAt: new Date().toISOString(),
    score,
    correct: correct ?? null,
    total: total ?? null,
    topicBreakdown: topicBreakdown || [],
    source: source || h.exam?.source || "talentera",
    passed: score >= cutoff,
  };
  H.audit(app, by || "System", "Exam completed", `Score ${score}% (cutoff ${cutoff}%) - ${h.exam.passed ? "passed" : "below cutoff"}`);

  const cand = app.candidateId && app.candidateId._id ? app.candidateId : await Candidate.findById(app.candidateId).select("email stage1").lean();
  const email = cand?.email;
  const name = cand?.stage1?.fullName;
  const topicRows = (topicBreakdown || []).map((t) => `<tr><td style="padding:4px 10px;border-bottom:1px solid #E2E8F0;">${t.topic}</td><td style="padding:4px 10px;border-bottom:1px solid #E2E8F0;font-weight:700;">${t.correct}/${t.total}</td></tr>`).join("");
  const scoreHtml = `<p style="color:#475569;font-size:15px;line-height:1.5;">Hi ${name || "there"},</p>
    <p style="color:#475569;font-size:15px;line-height:1.5;">Your <strong>${companyName}</strong> assessment is complete. Your score: <strong>${score}%</strong> (pass mark ${cutoff}%).</p>
    ${topicRows ? `<table style="border-collapse:collapse;margin:12px 0;font-size:13px;"><tr><th align="left" style="padding:4px 10px;">Topic</th><th align="left" style="padding:4px 10px;">Correct</th></tr>${topicRows}</table>` : ""}
    <p style="color:#475569;font-size:15px;line-height:1.5;">${h.exam.passed ? "You cleared Round 1 - the technical interview is next." : "Thank you for your time. You did not reach the pass mark this time, and we will keep your profile in our future talent pool."}</p>`;

  if (h.exam.passed) {
    H.setStage(app, "technical");
    H.audit(app, "System", "Auto-decision", `Passed Round 1 cutoff - moved to Technical round`);
    await H.notifyCandidate(app, {
      title: `You cleared Round 1 at ${companyName}! 🎯`,
      message: `Your score was ${score}% (pass mark ${cutoff}%). The technical interview is next - we'll share the details soon.`,
      companyName, email, name, emailHtml: scoreHtml,
    });
  } else {
    H.setStage(app, "rejected");
    h.rejection = { at: new Date().toISOString(), round: "exam", reason: `Scored ${score}% - below the ${cutoff}% cutoff`, futurePool: true };
    H.audit(app, "System", "Auto-decision", `Below cutoff - polite auto-reject, kept in future pool`);
    await H.notifyCandidate(app, {
      title: `Your ${companyName} assessment result`,
      message: `You scored ${score}% (pass mark ${cutoff}%). You were not moved forward this time, but we'll keep your profile for future openings.`,
      companyName, email, name, emailHtml: scoreHtml,
    });
  }

  // Notify the company/recruiter in their company dashboard & email
  try {
    const candName = name || cand?.email || "Candidate";
    const job = app.jobId ? await Job.findOne({ jobId: app.jobId }).select("fields.roletitle").lean() : null;
    const roleTitle = job?.fields?.roletitle || "the role";
    const notifTitle = h.exam.passed
      ? `Assessment Cleared: ${candName} (${score}%)`
      : `Assessment Submitted: ${candName} (${score}%)`;
    const notifMsg = h.exam.passed
      ? `${candName} scored ${score}% (pass mark ${cutoff}%) on Round 1 assessment for ${roleTitle}. Passed and moved to Round 2 (Technical Interview). Verify results in Hiring Flow.`
      : `${candName} scored ${score}% on Round 1 assessment for ${roleTitle} (pass mark ${cutoff}%). Result recorded.`;

    await Notification.create({
      recipientType: "company",
      recipientId: String(app.companyId),
      title: notifTitle,
      message: notifMsg,
      type: "assessment_completed",
      category: "assessment",
      meta: {
        source: "candidate_assessment",
        applicationId: String(app._id),
        candidateId: String(cand?._id || app.candidateId),
        candidateName: candName,
        score,
        passed: h.exam.passed,
        jobId: app.jobId,
        actionUrl: "/companies/hiring?tab=exams",
      },
    });

    const companyUser = await Company.findById(app.companyId).select("email companyName").lean();
    if (companyUser?.email) {
      await sendTransactionalEmail({
        to: companyUser.email,
        subject: `[Candidate Assessment] ${candName} scored ${score}% - ${h.exam.passed ? "Cleared Round 1 (Ready for Technical Round)" : "Below Cutoff"}`,
        html: `<p style="color:#0F172A;font-size:15px;line-height:1.5;">Dear ${companyUser.companyName || "Hiring Team"},</p>
          <p style="color:#475569;font-size:14px;line-height:1.5;"><strong>${candName}</strong> has submitted the Round 1 assessment for <strong>${roleTitle}</strong>.</p>
          <div style="background:#F8FAFC;border:1px solid #E2E8F0;border-radius:8px;padding:12px 16px;margin:14px 0;">
            <p style="margin:0 0 6px;font-size:14px;"><strong>Score:</strong> ${score}% (Pass Mark: ${cutoff}%)</p>
            <p style="margin:0;font-size:14px;"><strong>Result:</strong> <span style="color:${h.exam.passed ? '#15803D' : '#B91C1C'};font-weight:700;">${h.exam.passed ? "PASSED - MOVED TO TECHNICAL ROUND" : "BELOW CUTOFF"}</span></p>
          </div>
          <p style="color:#475569;font-size:14px;line-height:1.5;">${h.exam.passed ? "You can verify the assessment results in your Hiring Flow dashboard and proceed with allocating interview panels for the technical round." : "The candidate did not meet the pass mark and has been recorded in your pipeline."}</p>
          <p style="margin-top:16px;"><a href="${process.env.APP_URL || "https://talentera.in"}/companies/hiring?tab=${h.exam.passed ? "technical" : "exams"}" style="display:inline-block;padding:10px 18px;background:#0A1F3D;color:#fff;text-decoration:none;border-radius:6px;font-weight:700;">Verify Results &amp; Proceed →</a></p>`,
      }).catch((emailErr) => logger.warn(`Recruiter assessment email failed: ${emailErr.message}`));
    }
  } catch (notifErr) {
    logger.warn(`Could not notify recruiter of assessment completion: ${notifErr.message}`);
  }
  app.markModified("hiring");
  await app.save();
  return h.exam;
}

// ===========================================================================
// COMPANY ROUTER
// ===========================================================================
const companyRouter = express.Router();
companyRouter.use(requireCompanyAuth);

// GET /overview?jobId=
companyRouter.get("/overview", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId).select("companyName jobId jdPublished stage9").lean();
    const [setup, exams, allApps] = await Promise.all([
      getSetup(req.companyId),
      HiringExam.find({ companyId: req.companyId }).sort({ createdAt: -1 }).lean(),
      loadApps(req.companyId),
    ]);
    const titles = await jobTitles(company, allApps);
    const jobId = req.query.jobId || "";
    const apps = jobId ? allApps.filter((a) => a.jobId === jobId) : allApps;

    const jobCounts = {};
    allApps.forEach((a) => { jobCounts[a.jobId] = (jobCounts[a.jobId] || 0) + 1; });
    // Where each candidate came from (Academy / College) so the company sees the link.
    const shaped = apps.map((a) => shapeApp(a, titles));
    const collegeIds = [...new Set(shaped.map((s) => s.candidate.collegeId).filter(Boolean))];
    if (collegeIds.length) {
      const colleges = await College.find({ _id: { $in: collegeIds } }).select("name").lean();
      const cn = {};
      colleges.forEach((c) => { cn[String(c._id)] = c.name; });
      shaped.forEach((s) => { if (s.candidate.collegeId) s.candidate.collegeName = cn[s.candidate.collegeId] || "College"; });
    }
    res.json({
      company: { name: company?.companyName || "" },
      jobs: Object.keys(jobCounts).map((id) => ({ jobId: id, title: titles[id] || "Untitled role", count: jobCounts[id] })),
      setup,
      exams: exams.map((e) => ({ _id: e._id, title: e.title, source: e.source, durationMin: e.durationMin, cutoffPct: e.cutoffPct, questionCount: (e.questions || []).length, createdAt: e.createdAt })),
      library: libraryCatalog(),
      applications: shaped,
      funnel: funnelOf(apps),
      examLive: examLive(apps),
    });
  } catch (err) {
    logger.error(`Hiring overview error: ${err.message}`);
    res.status(500).json({ message: "Could not load the hiring pipeline." });
  }
});

// PUT /setup - panels, HRs, cutoffs, office address
companyRouter.put("/setup", async (req, res) => {
  try {
    const setup = await getSetup(req.companyId);
    const { panels, hrs, examCutoffPct, technicalCutoffPct, scorecardCriteria, officeAddress } = req.body;
    if (Array.isArray(panels)) {
      setup.panels = panels.filter((p) => p && String(p.name || "").trim()).map((p) => ({
        _id: p._id && mongoose.Types.ObjectId.isValid(p._id) ? p._id : undefined,
        name: String(p.name).trim(),
        specialty: String(p.specialty || "").trim(),
        keywords: String(p.keywords || "").trim(),
        isFloater: !!p.isFloater,
        members: (Array.isArray(p.members) ? p.members : []).filter((m) => m && String(m.name || "").trim()).map((m) => ({ name: String(m.name).trim(), email: String(m.email || "").trim() })),
      }));
      if (setup.panels.length === 0) {
        setup.panels.push({ name: "General Floater Panel", specialty: "General", keywords: "", isFloater: true, members: [] });
      }
    }
    if (Array.isArray(hrs)) {
      setup.hrs = hrs.filter((h) => h && String(h.name || "").trim()).map((h) => ({
        _id: h._id && mongoose.Types.ObjectId.isValid(h._id) ? h._id : undefined,
        name: String(h.name).trim(), role: String(h.role || "").trim(), city: String(h.city || "").trim(),
        specialty: String(h.specialty || "").trim(), email: String(h.email || "").trim(),
      }));
    }
    const num = (v, lo, hi) => { const n = Number(v); return Number.isFinite(n) && n >= lo && n <= hi ? n : null; };
    if (examCutoffPct !== undefined) { const n = num(examCutoffPct, 1, 100); if (n === null) return res.status(400).json({ message: "Exam cutoff must be between 1 and 100." }); setup.examCutoffPct = n; }
    if (technicalCutoffPct !== undefined) { const n = num(technicalCutoffPct, 1, 100); if (n === null) return res.status(400).json({ message: "Technical cutoff must be between 1 and 100." }); setup.technicalCutoffPct = n; }
    if (Array.isArray(scorecardCriteria)) {
      const list = scorecardCriteria.map((x) => String(x).trim()).filter(Boolean).slice(0, 12);
      if (list.length) setup.scorecardCriteria = list;
    }
    if (officeAddress !== undefined) setup.officeAddress = String(officeAddress).slice(0, 300);
    const b = req.body;
    if (b.interviewMode !== undefined) setup.interviewMode = b.interviewMode === "offline" ? "offline" : "virtual";
    if (b.interviewScheduledAt !== undefined) {
      const raw = String(b.interviewScheduledAt || "").trim();
      const d = raw ? new Date(raw) : null;
      if (raw && Number.isNaN(d.getTime())) return res.status(400).json({ message: "Enter a valid interview date and time." });
      setup.interviewScheduledAt = d ? d.toISOString() : "";
    }
    if (b.meetingLink !== undefined) {
      const link = String(b.meetingLink || "").trim().slice(0, 400);
      if (link && !/^https?:\/\//i.test(link)) return res.status(400).json({ message: "The meeting link must start with http:// or https://" });
      setup.meetingLink = link;
    }
    if (b.documentsToCarry !== undefined) setup.documentsToCarry = String(b.documentsToCarry).slice(0, 600);
    if (b.interviewInstructions !== undefined) setup.interviewInstructions = String(b.interviewInstructions).slice(0, 1200);
    await setup.save();

    // Sync newly updated panel members to existing candidate applications currently waiting in the technical round
    try {
      const techApps = await Application.find({ companyId: req.companyId, "hiring.stage": "technical" });
      for (const app of techApps) {
        if (app.hiring?.technical) {
          const t = app.hiring.technical;
          const matchedPanel = setup.panels.find((p) => String(p._id) === String(t.panelId))
            || setup.panels.find((p) => p.name && p.name.toLowerCase() === (t.panelName || "").toLowerCase())
            || setup.panels.find((p) => p.isFloater)
            || setup.panels[0];
          if (matchedPanel && Array.isArray(matchedPanel.members) && matchedPanel.members.length > 0) {
            const currentMembers = new Set(t.members || []);
            matchedPanel.members.forEach((m) => {
              if (m.name) currentMembers.add(m.name);
            });
            t.members = Array.from(currentMembers);
            if (!t.panelId || t.panelId === "undefined") t.panelId = String(matchedPanel._id);
            if (!t.panelName) t.panelName = matchedPanel.name;
            app.markModified("hiring");
            await app.save();
          }
        }
      }
    } catch (syncErr) {
      logger.warn(`Could not sync tech apps after setup save: ${syncErr.message}`);
    }

    res.json({ setup });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save the hiring setup." });
  }
});

// POST /exams/library { domain, title?, durationMin?, cutoffPct? } - Option 1
companyRouter.post("/exams/library", async (req, res) => {
  try {
    const questions = libraryQuestions(req.body.domain, Number(req.body.count) || 20);
    if (!questions || questions.length === 0) return res.status(400).json({ message: "Pick a library assessment." });
    const setup = await getSetup(req.companyId);
    const exam = await HiringExam.create({
      companyId: req.companyId,
      title: String(req.body.title || `${req.body.domain} - Talentera Library`).slice(0, 120),
      source: "library",
      durationMin: Number(req.body.durationMin) || 30,
      cutoffPct: Number(req.body.cutoffPct) || setup.examCutoffPct || 65,
      questions,
    });
    res.json({ exam: { _id: exam._id, title: exam.title, source: exam.source, questionCount: questions.length } });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not add the library exam." });
  }
});

// POST /exams/upload (multipart: doc, fields: title, durationMin, cutoffPct) - Option 2: private Excel/CSV bank
companyRouter.post("/exams/upload", upload.single("doc"), async (req, res) => {
  try {
    if (!req.file || !req.file.buffer) return res.status(400).json({ message: "Attach an Excel or CSV file." });
    const parsed = questionsFromCsv(req.file.buffer.toString("utf-8"));
    if (parsed.error) return res.status(400).json({ message: parsed.error });
    const setup = await getSetup(req.companyId);
    const exam = await HiringExam.create({
      companyId: req.companyId,
      title: String(req.body.title || req.file.originalname || "Private exam").replace(/\.(csv|xlsx)$/i, "").slice(0, 120),
      source: "private",
      durationMin: Number(req.body.durationMin) || 30,
      cutoffPct: Number(req.body.cutoffPct) || setup.examCutoffPct || 65,
      questions: parsed.questions,
    });
    res.json({ exam: { _id: exam._id, title: exam.title, source: "private", questionCount: parsed.questions.length }, skipped: parsed.skipped });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not read that file." });
  }
});

// POST /exams/external { title, source: "integration"|"manual", cutoffPct } - Options 3 & 4 (scores come from outside)
companyRouter.post("/exams/external", async (req, res) => {
  try {
    const source = req.body.source === "manual" ? "manual" : "integration";
    const setup = await getSetup(req.companyId);
    const exam = await HiringExam.create({
      companyId: req.companyId,
      title: String(req.body.title || (source === "manual" ? "On-site written exam" : "External assessment")).slice(0, 120),
      source,
      durationMin: 0,
      cutoffPct: Number(req.body.cutoffPct) || setup.examCutoffPct || 65,
      questions: [],
    });
    res.json({ exam: { _id: exam._id, title: exam.title, source, questionCount: 0 } });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not create the exam." });
  }
});

companyRouter.delete("/exams/:id", async (req, res) => {
  await HiringExam.deleteOne({ _id: req.params.id, companyId: req.companyId });
  res.json({ ok: true });
});

// POST /exams/:id/allocate { applicationIds?: [], jobId?, all?: true, specialty? } - Step 2 (bulk or individual)
companyRouter.post("/exams/:id/allocate", async (req, res) => {
  try {
    const exam = await HiringExam.findOne({ _id: req.params.id, companyId: req.companyId });
    if (!exam) return res.status(404).json({ message: "Exam not found." });
    const company = await Company.findById(req.companyId).select("companyName").lean();
    let apps;
    if (Array.isArray(req.body.applicationIds) && req.body.applicationIds.length) {
      apps = await loadApps(req.companyId, { ids: req.body.applicationIds });
    } else if (req.body.all) {
      apps = (await loadApps(req.companyId, { jobId: req.body.jobId || undefined })).filter((a) => (a.hiring?.stage || "applied") === "applied");
    } else {
      return res.status(400).json({ message: "Choose candidates or use 'Allocate to all'." });
    }
    if (req.body.specialty) {
      const k = String(req.body.specialty).toLowerCase();
      apps = apps.filter((a) => H.candidateText(a.candidateId).includes(k));
    }
    const isReallocate = Boolean(req.body.reallocate || req.body.allowReallocate);
    if (!isReallocate) {
      apps = apps.filter((a) => ["applied", "exam"].includes(a.hiring?.stage || "applied") && !a.hiring?.exam?.completedAt);
    }
    if (apps.length === 0) return res.status(400).json({ message: "No eligible candidates (already examined or past this round)." });

    // The recruiter chooses the deadline - it is never defaulted or auto-generated.
    const deadline = req.body.deadline ? new Date(req.body.deadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) return res.status(400).json({ message: "Choose the exam deadline (date and time)." });
    if (deadline <= new Date()) return res.status(400).json({ message: "The exam deadline must be in the future." });
    const expiresAt = deadline.toISOString();
    const deadlineText = deadline.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" });
    await H.runParallel(apps, async (app) => {
      const h = H.ensureHiring(app);
      h.exam = {
        examId: String(exam._id), title: exam.title, source: exam.source === "library" ? "talentera" : exam.source,
        status: "allocated", allocatedAt: new Date().toISOString(), expiresAt,
        durationMin: exam.durationMin, cutoffPct: exam.cutoffPct,
      };
      H.setStage(app, "exam");
      H.audit(app, req.body.by || "Company HR", isReallocate ? "Exam re-allocated" : "Exam allocated", `${exam.title} (${exam.source})`);
      await app.save();
      const external = exam.source === "manual" || exam.source === "integration";
      await H.notifyCandidate(app, {
        title: `Exam from ${company?.companyName || "an employer"}: you need to take it`,
        message: external
          ? `${company?.companyName || "The employer"} will share how to take "${exam.title}". You'll see your result here.`
          : `Take "${exam.title}" before ${deadlineText} (${exam.durationMin} min, webcam on). Tap here to open Hiring Rounds and start.`,
        companyName: company?.companyName || "",
        email: app.candidateId?.email, name: app.candidateId?.stage1?.fullName,
      });
    });
    res.json({ allocated: apps.length });
  } catch (err) {
    logger.error(`Allocate exam error: ${err.message}`);
    res.status(500).json({ message: err.message || "Could not allocate the exam." });
  }
});

// POST /applications/:id/exam-score { score } - Option 4 manual bypass / typed-in scores from an external tool
companyRouter.post("/applications/:id/exam-score", async (req, res) => {
  try {
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ message: "Enter a score between 0 and 100." });
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app) return res.status(404).json({ message: "Application not found." });
    if (!app.hiring?.exam?.allocatedAt) return res.status(400).json({ message: "Allocate an exam to this candidate first." });
    if (app.hiring.exam.completedAt) return res.status(400).json({ message: "This exam already has a result." });
    const exam = await completeExam(app, { score: Math.round(score), source: req.body.source === "integration" ? "integration" : "manual", by: "Company HR" });
    res.json({ exam });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not record the score." });
  }
});

// POST /exam-gate { jobId? } - re-run the cutoff gate on finished exams that are still sitting in the exam round
companyRouter.post("/exam-gate", async (req, res) => {
  const apps = (await loadApps(req.companyId, { jobId: req.body.jobId || undefined })).filter((a) => a.hiring?.stage === "exam" && a.hiring?.exam?.completedAt);
  let moved = 0;
  await H.runParallel(apps, async (app) => { await completeExam(app, { ...app.hiring.exam, score: app.hiring.exam.score, source: app.hiring.exam.source, by: "Company HR (re-run)" }); moved += 1; });
  res.json({ processed: moved });
});

// POST /technical/allocate { applicationIds?, all?, jobId?, mode: "virtual"|"offline", scheduledAt? } - Step 4
companyRouter.post("/technical/allocate", async (req, res) => {
  try {
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const setup = await getSetup(req.companyId);
    const mode = (req.body.mode || setup.interviewMode) === "offline" ? "offline" : "virtual";
    if (!setup.panels.length) return res.status(400).json({ message: "Add at least one interview panel first." });
    let apps = await loadApps(req.companyId, Array.isArray(req.body.applicationIds) && req.body.applicationIds.length ? { ids: req.body.applicationIds } : { jobId: req.body.jobId || undefined });
    apps = apps.filter((a) => a.hiring?.stage === "technical" && !a.hiring?.technical?.panelId);
    if (!apps.length) return res.status(400).json({ message: "No candidates are waiting for the technical round." });

    // current panel load (already-assigned candidates count)
    const all = await loadApps(req.companyId);
    const load = {};
    all.forEach((a) => { const pid = a.hiring?.technical?.panelId; if (pid && a.hiring?.stage === "technical") load[pid] = (load[pid] || 0) + 1; });

    const whenRaw = req.body.scheduledAt || setup.interviewScheduledAt || "";
    const when = whenRaw ? new Date(whenRaw) : null;
    for (const app of apps) {
      const panel = H.pickPanel(app.candidateId, setup.panels, load);
      if (!panel) continue;
      load[String(panel._id)] = (load[String(panel._id)] || 0) + 1;
      const h = H.ensureHiring(app);
      h.technical = {
        mode, panelId: String(panel._id), panelName: panel.name, panelSpecialty: panel.specialty,
        members: (panel.members || []).map((m) => m.name),
        scheduledAt: when && !Number.isNaN(when.getTime()) ? when.toISOString() : null,
        meetingLink: mode === "virtual" ? (setup.meetingLink || H.buildMeetingLink(app)) : "",
        documentsToCarry: setup.documentsToCarry || "", instructions: setup.interviewInstructions || "",
        checkinToken: mode === "offline" ? H.randomToken(6) : "",
        office: mode === "offline" ? setup.officeAddress : "",
        scores: [], status: "scheduled",
      };
      app.interviewType = mode === "virtual" ? "Virtual (Talentera Meet)" : "In-office";
      app.interviewMeetingLink = h.technical.meetingLink;
      if (h.technical.scheduledAt) { app.interviewScheduledAt = new Date(h.technical.scheduledAt); app.interviewTimeText = h.technical.scheduledAt; }
      H.audit(app, "Company HR", "Technical round allocated", `${panel.name} - ${mode}`);
      app.markModified("hiring");
      await app.save();
    }
    // notify in parallel - in-app + an email confirmation with every detail the candidate needs
    await H.runParallel(apps, (app) => {
      const t = H.ensureHiring(app).technical;
      const name = app.candidateId?.stage1?.fullName;
      const whenText = t.scheduledAt ? new Date(t.scheduledAt).toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" }) : "To be confirmed - we will update you shortly";
      const row = (k, v) => (v ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B;font-size:13px;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${String(v).replace(/</g, "&lt;")}</td></tr>` : "");
      const details = `<table style="border-collapse:collapse;margin:12px 0;">${row("Interview", `Technical round - ${t.panelName}`)}${row("Date & time", whenText)}${row("Mode", mode === "virtual" ? "Virtual (video)" : "In person / walk-in")}${mode === "virtual" ? row("Meeting link", t.meetingLink) : row("Location", t.office || setup.officeAddress)}${mode === "offline" ? row("Check-in code", t.checkinToken) : ""}${row("Documents to carry", t.documentsToCarry)}${row("Instructions", t.instructions)}</table>`;
      return H.notifyCandidate(app, {
        title: `Technical interview scheduled - ${company?.companyName || "employer"} 📅`,
        message: mode === "virtual"
          ? `Your technical interview is set for ${whenText}. Join from Hiring Rounds in your dashboard.`
          : `Please walk in for your technical interview on ${whenText}${setup.officeAddress ? ` at ${setup.officeAddress}` : ""}. Use your check-in code at reception. Check Hiring Rounds for what to carry.`,
        type: "interview_scheduled", companyName: company?.companyName || "",
        email: app.candidateId?.email, name,
        emailHtml: `<p style="color:#475569;font-size:15px;line-height:1.5;">Hi ${name || "there"},</p><p style="color:#475569;font-size:15px;line-height:1.5;">Your technical interview with <strong>${company?.companyName || "the employer"}</strong> is confirmed. Here are the details:</p>${details}<p style="color:#475569;font-size:13px;">You can see all of this anytime under Hiring Rounds in your Talentera dashboard.</p>`,
      });
    });
    res.json({ allocated: apps.length });
  } catch (err) {
    logger.error(`Technical allocate error: ${err.message}`);
    res.status(500).json({ message: err.message || "Could not allocate panels." });
  }
});

// POST /applications/:id/checkin - reception marks an offline candidate as arrived
companyRouter.post("/applications/:id/checkin", async (req, res) => {
  const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
  if (!app || !app.hiring?.technical) return res.status(404).json({ message: "Not found." });
  app.hiring.technical.checkedInAt = new Date().toISOString();
  H.audit(app, "Reception", "Checked in", "");
  app.markModified("hiring");
  await app.save();
  res.json({ ok: true });
});

// A technical interview can only be scored once the candidate actually showed up: they joined the
// video room from their dashboard (joinedAt), checked in at reception (checkedInAt), or the recruiter
// recorded attendance (attendanceMarkedAt - audited). Scoring is also closed until the slot starts.
function technicalAttendanceError(t) {
  if (!t.joinedAt && !t.checkedInAt && !t.attendanceMarkedAt) {
    return "This candidate has not attended the interview yet. Scores can only be entered after they join (or check in) - or after you mark them as attended.";
  }
  if (!t.interviewCompletedAt) {
    return "Scores can only be entered once the technical interview is marked as completed. Click \"Mark interview completed\" when the interview has finished.";
  }
  const at = t.scheduledAt ? new Date(t.scheduledAt) : null;
  if (at && !Number.isNaN(at.getTime()) && at.getTime() - 15 * 60 * 1000 > Date.now()) {
    return `The interview is scheduled for ${at.toLocaleString("en-IN")}. Scoring opens when it starts.`;
  }
  return null;
}

// POST /applications/:id/interview-complete - the interview has taken place; this unlocks scoring
companyRouter.post("/applications/:id/interview-complete", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "technical" || !app.hiring.technical) return res.status(400).json({ message: "This candidate is not in the technical round." });
    const t = app.hiring.technical;
    if (!t.joinedAt && !t.checkedInAt && !t.attendanceMarkedAt) return res.status(400).json({ message: "The candidate has not attended yet - record their attendance first." });
    if (!t.interviewCompletedAt) {
      t.interviewCompletedAt = new Date().toISOString();
      t.status = "interview_completed";
      H.audit(app, "Recruiter", "Technical interview completed", "");
      app.markModified("hiring");
      await app.save();
    }
    res.json({ technical: t });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not mark the interview as completed." });
  }
});

// POST /applications/:id/mark-attended - recruiter records that the candidate attended (kept in the audit trail)
companyRouter.post("/applications/:id/mark-attended", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "technical" || !app.hiring.technical) return res.status(400).json({ message: "This candidate is not in the technical round." });
    const t = app.hiring.technical;
    if (!t.attendanceMarkedAt) {
      t.attendanceMarkedAt = new Date().toISOString();
      H.audit(app, "Recruiter", "Attendance recorded", "Recruiter marked the candidate as attended");
      app.markModified("hiring");
      await app.save();
    }
    res.json({ technical: t });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not record attendance." });
  }
});

// POST /applications/:id/technical-score { memberName, scores: {criterion: 0-10}, notes } - live panel scorecard
companyRouter.post("/applications/:id/technical-score", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "technical" || !app.hiring.technical) return res.status(400).json({ message: "This candidate is not in the technical round." });
    const member = String(req.body.memberName || "").trim();
    const attErr = technicalAttendanceError(app.hiring.technical);
    if (attErr) return res.status(400).json({ message: attErr });
    if (!member) return res.status(400).json({ message: "Choose or enter the panel member who is scoring." });
    const entries = Object.entries(req.body.scores || {}).map(([k, v]) => [k, Number(v)]);
    if (!entries.length || entries.some(([, v]) => !Number.isFinite(v) || v < 0 || v > 10)) return res.status(400).json({ message: "Score every criterion from 0 to 10." });
    const total = entries.reduce((s, [, v]) => s + v, 0);
    const pctScore = Math.round((total / (entries.length * 10)) * 100);
    const t = app.hiring.technical;
    t.scores = (t.scores || []).filter((s) => s.member !== member);
    t.scores.push({ member, criteria: Object.fromEntries(entries), pct: pctScore, notes: String(req.body.notes || "").slice(0, 600), at: new Date().toISOString() });
    t.avgScore = Math.round(t.scores.reduce((s, x) => s + x.pct, 0) / t.scores.length);
    t.status = "in_progress";

    // Keep candidate app members synced
    if (!Array.isArray(t.members)) t.members = [];
    if (!t.members.includes(member)) t.members.push(member);

    H.audit(app, member, "Technical score", `${pctScore}% (panel average ${t.avgScore}%)`);
    app.markModified("hiring");
    await app.save();

    // Persist this member to the panel in HiringSetup so future candidates have this member in dropdown
    try {
      const setup = await getSetup(req.companyId);
      let targetPanel = setup.panels.find((p) => String(p._id) === String(t.panelId))
        || setup.panels.find((p) => p.name && p.name.toLowerCase() === (t.panelName || "").toLowerCase())
        || setup.panels.find((p) => p.isFloater)
        || setup.panels[0];
      if (!targetPanel) {
        targetPanel = { name: t.panelName || "General Floater Panel", specialty: "General", keywords: "", isFloater: true, members: [] };
        setup.panels.push(targetPanel);
      }
      if (targetPanel && !targetPanel.members.some((m) => m.name && m.name.toLowerCase() === member.toLowerCase())) {
        targetPanel.members.push({ name: member });
        await setup.save();
      }
    } catch (saveSetupErr) {
      logger.warn(`Could not auto-add member to setup: ${saveSetupErr.message}`);
    }

    res.json({ technical: t });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save the score." });
  }
});

// POST /applications/:id/technical-complete { decision?: "pass"|"reject", notes } - "Save & Proceed to HR"
companyRouter.post("/applications/:id/technical-complete", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "technical" || !app.hiring.technical) return res.status(400).json({ message: "This candidate is not in the technical round." });
    const t = app.hiring.technical;
    const attErr = technicalAttendanceError(t);
    if (attErr) return res.status(400).json({ message: attErr });
    if (!t.scores || t.scores.length === 0) return res.status(400).json({ message: "Add at least one panel score first." });
    const setup = await getSetup(req.companyId);
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const cutoff = setup.technicalCutoffPct || 60;
    const decision = req.body.decision === "reject" ? "reject" : req.body.decision === "pass" ? "pass" : (t.avgScore >= cutoff ? "pass" : "reject");
    t.decision = decision;
    t.status = "completed";
    t.completedAt = new Date().toISOString();
    t.consensusNotes = String(req.body.notes || t.consensusNotes || "").slice(0, 800);
    H.audit(app, "Panel", "Technical decision", `${decision.toUpperCase()} - panel average ${t.avgScore}% (cutoff ${cutoff}%)`);
    const email = app.candidateId?.email, name = app.candidateId?.stage1?.fullName;
    if (decision === "pass") {
      H.setStage(app, "hr");
      // auto-assign HR by city / specialty
      const all = await loadApps(req.companyId);
      const load = {};
      all.forEach((a) => { const hid = a.hiring?.hr?.hrId; if (hid && a.hiring?.stage === "hr") load[hid] = (load[hid] || 0) + 1; });
      const hr = H.pickHr(app.candidateId, setup.hrs, load);
      app.hiring.hr = { hrId: hr ? String(hr._id) : "", hrName: hr ? hr.name : "", hrRole: hr ? hr.role : "", status: "pending" };
      if (hr) H.audit(app, "System", "HR assigned", hr.name);
      await H.notifyCandidate(app, { title: `Technical round complete - ${company?.companyName || "employer"}`, message: "You cleared the technical round. The HR round is next - we'll be in touch shortly.", companyName: company?.companyName || "", email, name });
    } else {
      H.setStage(app, "rejected");
      app.hiring.rejection = { at: new Date().toISOString(), round: "technical", reason: `Panel average ${t.avgScore}%`, futurePool: true };
      await H.notifyCandidate(app, { title: `Update on your ${company?.companyName || "employer"} application`, message: "Thank you for interviewing with us. You were not moved forward after the technical round, but we'll keep your profile for future openings.", companyName: company?.companyName || "", email, name });
    }
    app.markModified("hiring");
    await app.save();
    res.json({ stage: app.hiring.stage, technical: t });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not complete the technical round." });
  }
});

// POST /hr/allocate { applicationIds?, jobId? } - (re)assign HRs by city / specialty for candidates waiting at the HR round
companyRouter.post("/hr/allocate", async (req, res) => {
  const setup = await getSetup(req.companyId);
  if (!setup.hrs.length) return res.status(400).json({ message: "Add at least one HR first." });
  let apps = await loadApps(req.companyId, Array.isArray(req.body.applicationIds) && req.body.applicationIds.length ? { ids: req.body.applicationIds } : { jobId: req.body.jobId || undefined });
  apps = apps.filter((a) => a.hiring?.stage === "hr" && !a.hiring?.hr?.hrId);
  const all = await loadApps(req.companyId);
  const load = {};
  all.forEach((a) => { const hid = a.hiring?.hr?.hrId; if (hid && a.hiring?.stage === "hr") load[hid] = (load[hid] || 0) + 1; });
  for (const app of apps) {
    const hr = H.pickHr(app.candidateId, setup.hrs, load);
    if (!hr) continue;
    load[String(hr._id)] = (load[String(hr._id)] || 0) + 1;
    app.hiring.hr = { ...(app.hiring.hr || {}), hrId: String(hr._id), hrName: hr.name, hrRole: hr.role, status: "pending" };
    H.audit(app, "System", "HR assigned", hr.name);
    app.markModified("hiring");
    await app.save();
  }
  res.json({ assigned: apps.length });
});

// BGV is "cleared" when verified, or deferred to onboarding. Older records with no BGV info are not blocked.
const bgvCleared = (a) => { const b = a.hiring?.hr?.bgv; return !b || b.status === "verified" || b.status === "deferred"; };

// POST /applications/:id/bgv { status: "in_progress"|"verified"|"failed", note } - BGV step between HR and final approval
companyRouter.post("/applications/:id/bgv", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "approval" || !app.hiring.hr?.bgv) return res.status(400).json({ message: "This candidate has no BGV pending." });
    const status = ["in_progress", "verified", "failed"].includes(req.body.status) ? req.body.status : null;
    if (!status) return res.status(400).json({ message: "Choose a BGV status." });
    const b = app.hiring.hr.bgv;
    b.status = status;
    b.note = String(req.body.note || "").slice(0, 400);
    b.updatedAt = new Date().toISOString();
    H.audit(app, "Recruiter", "BGV " + status.replace("_", " "), `${b.label}${b.note ? ` - ${b.note}` : ""}`);
    app.markModified("hiring");
    await app.save();
    res.json({ bgv: b });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not update BGV." });
  }
});

// POST /applications/:id/exam-review { action: "open"|"confirm" } - results are only shown once the company asks to view them
companyRouter.post("/applications/:id/exam-review", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    const e = app?.hiring?.exam;
    if (!app || !e || !e.completedAt) return res.status(400).json({ message: "This assessment has not been submitted yet." });
    if (req.body.action === "confirm") {
      if (!e.evaluatedAt) { e.evaluatedAt = new Date().toISOString(); H.audit(app, "Recruiter", "Assessment evaluated", `${e.score}%`); }
      if (!e.reviewOpenedAt) e.reviewOpenedAt = e.evaluatedAt;
    } else if (!e.reviewOpenedAt) {
      e.reviewOpenedAt = new Date().toISOString();
      H.audit(app, "Recruiter", "Assessment results opened", "");
    }
    app.markModified("hiring");
    await app.save();
    res.json({ exam: { ...e, answers: undefined } });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not update the review." });
  }
});

// POST /applications/:id/hr-schedule { mode: telephonic|virtual|offline, type: standard|additional, scheduledAt, meetingLink?, phone? }
// Books the HR interview and tells the candidate (in-app + email) before the HR decision / offer step.
// Background verification (BGV) method the HR team picks when recommending a hire
const BGV_METHODS = {
  digital: { label: "Digital verification via Talentera", candidateNote: "your Talentera-verified profile (identity, certificates, assessments) is used, so no extra paperwork is needed." },
  in_person: { label: "In-person verification at the company", candidateNote: "please carry your original documents when the company asks you to visit." },
  onboarding: { label: "BGV during onboarding", candidateNote: "verification will be completed after you join, as part of onboarding." },
};
const HR_MODES = { telephonic: "Telephonic", virtual: "Virtual (camera on)", offline: "In person / walk-in" };
const HR_TYPES = { standard: "Standard HR round", additional: "Additional HR round" };
companyRouter.post("/applications/:id/hr-schedule", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "hr") return res.status(400).json({ message: "This candidate is not in the HR round." });
    const mode = HR_MODES[req.body.mode] ? req.body.mode : null;
    const type = HR_TYPES[req.body.type] ? req.body.type : "standard";
    if (!mode) return res.status(400).json({ message: "Choose the interview mode: Telephonic, Virtual or In person." });
    const at = req.body.scheduledAt ? new Date(req.body.scheduledAt) : null;
    if (!at || Number.isNaN(at.getTime())) return res.status(400).json({ message: "Enter the HR interview date and time." });
    const setup = await getSetup(req.companyId);
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const link = String(req.body.meetingLink || "").trim().slice(0, 400);
    if (link && !/^https?:\/\//i.test(link)) return res.status(400).json({ message: "The meeting link must start with http:// or https://" });
    const iv = {
      mode, modeLabel: HR_MODES[mode], type, typeLabel: HR_TYPES[type], scheduledAt: at.toISOString(),
      meetingLink: mode === "virtual" ? (link || setup.meetingLink || H.buildMeetingLink(app)) : "",
      phone: mode === "telephonic" ? String(req.body.phone || "").slice(0, 30) : "",
      office: mode === "offline" ? setup.officeAddress || "" : "",
      documentsToCarry: mode === "offline" ? setup.documentsToCarry || "" : "",
      scheduledBy: "Recruiter", scheduledOn: new Date().toISOString(),
    };
    app.hiring.hr = { ...(app.hiring.hr || {}), interview: iv };
    H.audit(app, "Recruiter", "HR interview scheduled", `${iv.typeLabel} - ${iv.modeLabel} - ${at.toISOString()}`);
    app.markModified("hiring");
    await app.save();
    const name = app.candidateId?.stage1?.fullName;
    const whenText = at.toLocaleString("en-IN", { dateStyle: "full", timeStyle: "short" });
    const row = (k, v) => (v ? `<tr><td style="padding:6px 12px 6px 0;color:#64748B;font-size:13px;vertical-align:top;white-space:nowrap;">${k}</td><td style="padding:6px 0;color:#0F172A;font-size:14px;font-weight:600;">${String(v).replace(/</g, "&lt;")}</td></tr>`: "");
    await H.notifyCandidate(app, {
      title: `HR interview scheduled - ${company?.companyName || "employer"}`,
      message: `Your ${iv.typeLabel.toLowerCase()} (${iv.modeLabel}) is on ${whenText}. See Hiring Rounds for details.`,
      type: "interview_scheduled", companyName: company?.companyName || "",
      email: app.candidateId?.email, name,
      emailHtml: `<p style="color:#475569;font-size:15px;line-height:1.5;">Hi ${name || "there"},</p><p style="color:#475569;font-size:15px;line-height:1.5;">Your HR interview with <strong>${company?.companyName || "the employer"}</strong> is confirmed.</p><table style="border-collapse:collapse;margin:12px 0;">${row("Interview", iv.typeLabel)}${row("Mode", iv.modeLabel)}${row("Date & time", whenText)}${row("Meeting link", iv.meetingLink)}${row("Phone", iv.phone)}${row("Location", iv.office)}${row("Documents to carry", iv.documentsToCarry)}${row("Interviewer", app.hiring.hr.hrName)}</table>`,
    });
    res.json({ hr: app.hiring.hr });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not schedule the HR interview." });
  }
});

// POST /applications/:id/hr-submit { culture, noticePeriod, currentCtc, expectedCtc, offeredCtc, shift, decision: hire|hold|reject, notes }
companyRouter.post("/applications/:id/hr-submit", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "hr") return res.status(400).json({ message: "This candidate is not in the HR round." });
    const decision = ["hire", "hold", "reject"].includes(req.body.decision) ? req.body.decision : null;
    if (!decision) return res.status(400).json({ message: "Choose Hire, Hold or Reject." });
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const money = (v) => (v === undefined || v === null || v === "" ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : NaN);
    const current = money(req.body.currentCtc), expected = money(req.body.expectedCtc), offered = money(req.body.offeredCtc);
    if ([current, expected, offered].some((x) => Number.isNaN(x))) return res.status(400).json({ message: "CTC values must be positive numbers (LPA)." });
    if (decision === "hire" && !offered) return res.status(400).json({ message: "Enter the CTC you will offer (LPA) before recommending a hire." });
    const bgvKey = BGV_METHODS[req.body.bgvMethod] ? req.body.bgvMethod : "";
    if (decision === "hire" && !bgvKey) return res.status(400).json({ message: "Select the BGV method (Digital via Talentera, In-person at company, or During onboarding) before recommending a hire." });
    const cultureFit = req.body.culture === undefined || req.body.culture === "" ? null : Math.min(10, Math.max(0, Number(req.body.culture)));
    const flags = [];
    if (current && expected && expected > current * 1.5) flags.push("Expected CTC is more than 50% above current");
    if (offered && expected && offered < expected * 0.85) flags.push("Offer is more than 15% below expectation");
    app.hiring.hr = {
      ...(app.hiring.hr || {}),
      cultureFit, noticePeriod: String(req.body.noticePeriod || "").slice(0, 60), currentCtc: current, expectedCtc: expected, offeredCtc: offered,
      shift: String(req.body.shift || "").slice(0, 60), notes: String(req.body.notes || "").slice(0, 800), flags,
      decision, status: "completed", completedAt: new Date().toISOString(),
      bgv: bgvKey
        ? { method: bgvKey, label: BGV_METHODS[bgvKey].label, at: new Date().toISOString(), status: bgvKey === "onboarding" ? "deferred" : (bgvKey === "digital" && app.candidateId?.isVerified ? "verified" : "pending") }
        : (app.hiring.hr?.bgv || null),
    };
    H.audit(app, app.hiring.hr.hrName || "HR", "HR decision", `${decision.toUpperCase()}${offered ? ` - offer ${offered} LPA` : ""}`);
    const email = app.candidateId?.email, name = app.candidateId?.stage1?.fullName;
    if (decision === "hire") {
      H.setStage(app, "approval");
      await H.notifyCandidate(app, { title: `HR round complete - ${company?.companyName || "employer"}`, message: `Your HR round is complete. Your profile is now with management for final approval. Background verification: ${BGV_METHODS[bgvKey].label} - ${BGV_METHODS[bgvKey].candidateNote}`, companyName: company?.companyName || "", email, name });
    } else if (decision === "hold") {
      H.setStage(app, "hold");
      await H.notifyCandidate(app, { title: `Update from ${company?.companyName || "employer"}`, message: "Your application is on hold for now. We'll update you as soon as there is movement.", companyName: company?.companyName || "", email, name });
    } else {
      H.setStage(app, "rejected");
      app.hiring.rejection = { at: new Date().toISOString(), round: "hr", reason: app.hiring.hr.notes || "Not recommended after HR round", futurePool: true };
      await H.notifyCandidate(app, { title: `Update on your ${company?.companyName || "employer"} application`, message: "Thank you for your time. You were not moved forward after the HR round, but we'll keep your profile for future openings.", companyName: company?.companyName || "", email, name });
    }
    app.markModified("hiring");
    await app.save();
    res.json({ stage: app.hiring.stage, hr: app.hiring.hr });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save the HR round." });
  }
});

// POST /applications/:id/reconsider { to: "hr"|"approval"|"rejected", note } - take a candidate OFF hold.
// Without this a held candidate had no way back into the pipeline.
companyRouter.post("/applications/:id/reconsider", async (req, res) => {
  try {
    const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
    if (!app || app.hiring?.stage !== "hold") return res.status(400).json({ message: "This candidate is not on hold." });
    const to = ["hr", "approval", "rejected"].includes(req.body.to) ? req.body.to : null;
    if (!to) return res.status(400).json({ message: "Choose where to move this candidate." });
    const note = String(req.body.note || "").trim().slice(0, 400);
    const company = await Company.findById(req.companyId).select("companyName").lean();
    const companyName = company?.companyName || "employer";
    const email = app.candidateId?.email, name = app.candidateId?.stage1?.fullName;
    if (to === "hr") {
      app.hiring.hr = { ...(app.hiring.hr || {}), status: "pending", decision: null, completedAt: null };
      H.setStage(app, "hr");
      H.audit(app, "Company HR", "Taken off hold", `Moved back to HR round${note ? ` - ${note}` : ""}`);
      await H.notifyCandidate(app, { title: `Update from ${companyName}`, message: `Your application is active again - the HR round continues.${note ? ` Note: ${note}` : ""}`, companyName, email, name });
    } else if (to === "approval") {
      H.setStage(app, "approval");
      H.audit(app, "Company HR", "Taken off hold", `Moved to management approval${note ? ` - ${note}` : ""}`);
      await H.notifyCandidate(app, { title: `Update from ${companyName}`, message: "Your application is active again and is with management for final approval.", companyName, email, name });
    } else {
      H.setStage(app, "rejected");
      app.hiring.rejection = { at: new Date().toISOString(), round: "hold", reason: note || "Not moved forward after hold", futurePool: true };
      H.audit(app, "Company HR", "Hold closed - rejected", note);
      await H.notifyCandidate(app, { title: `Update on your ${companyName} application`, message: "Thank you for your patience. You were not moved forward, but we'll keep your profile for future openings.", companyName, email, name });
    }
    app.markModified("hiring");
    await app.save();
    res.json({ stage: app.hiring.stage });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not update this candidate." });
  }
});

// POST /approval/bulk { applicationIds?, topN?, jobId?, action: "approve"|"hold"|"reject", offer: { role, joinDate, probationMonths, ctc? } } - Steps 6 & 7
companyRouter.post("/approval/bulk", async (req, res) => {
  try {
    const action = ["approve", "hold", "reject"].includes(req.body.action) ? req.body.action : null;
    if (!action) return res.status(400).json({ message: "Choose approve, hold or reject." });
    const company = await Company.findById(req.companyId).select("companyName stage9 jobId jdPublished").lean();
    let apps;
    if (Array.isArray(req.body.applicationIds) && req.body.applicationIds.length) apps = await loadApps(req.companyId, { ids: req.body.applicationIds });
    else {
      const pool = (await loadApps(req.companyId, { jobId: req.body.jobId || undefined })).filter((a) => a.hiring?.stage === "approval");
      const ranked = pool.map((a) => ({ a, c: H.compositeScore(a, candidateSummary(a.candidateId).talentScore) })).sort((x, y) => y.c - x.c);
      const n = Number(req.body.topN);
      apps = (Number.isFinite(n) && n > 0 ? ranked.slice(0, n) : ranked).map((x) => x.a);
    }
    apps = apps.filter((a) => a.hiring?.stage === "approval");
    if (!apps.length) return res.status(400).json({ message: "No candidates are waiting for final approval." });
    let bgvSkipped = 0;
    if (action === "approve") {
      const cleared = apps.filter(bgvCleared);
      bgvSkipped = apps.length - cleared.length;
      apps = cleared;
      if (!apps.length) return res.status(400).json({ message: "Background verification (BGV) is not complete for the selected candidates. Verify them in the BGV tab first." });
    }

    const offerIn = req.body.offer || {};
    if (action === "approve") {
      const join = offerIn.joinDate ? new Date(offerIn.joinDate) : null;
      if (!join || Number.isNaN(join.getTime())) return res.status(400).json({ message: "Pick the joining date for the offer letters." });
      if (apps.some((a) => !(Number(a.hiring?.hr?.offeredCtc) > 0) && !(Number(offerIn.ctc) > 0))) return res.status(400).json({ message: "Some candidates have no offered CTC from HR - enter a default CTC (LPA)." });
    }
    const titles = await jobTitles(company, apps);
    const joinDate = offerIn.joinDate ? new Date(offerIn.joinDate) : null;
    const probation = Number(offerIn.probationMonths) >= 0 && offerIn.probationMonths !== "" && offerIn.probationMonths !== undefined ? Number(offerIn.probationMonths) : 3;
    const companyName = company?.companyName || "the employer";
    const started = Date.now();

    const results = await H.runParallel(apps, async (app) => {
      const email = app.candidateId?.email, name = app.candidateId?.stage1?.fullName;
      if (action === "approve") {
        const role = String(offerIn.role || titles[app.jobId] || "the role").slice(0, 120);
        const ctc = Number(app.hiring.hr?.offeredCtc) > 0 ? Number(app.hiring.hr.offeredCtc) : Number(offerIn.ctc);
        app.hiring.approval = { decision: "approve", at: new Date().toISOString(), by: "Management" };
        app.hiring.offer = { role, ctc, joinDate: joinDate.toISOString(), probationMonths: probation, sentAt: new Date().toISOString(), status: "sent", channels: { email: email ? "sent" : "no email", dashboard: "sent", whatsapp: "not configured" } };
        H.setStage(app, "offered");
        H.audit(app, "Management", "Offer released", `${role} - ${ctc} LPA - joining ${joinDate.toDateString()}`);
        await app.save();
        const html = `<p style="color:#475569;font-size:15px;line-height:1.5;">Hi ${name || "there"},</p>
          <p style="color:#475569;font-size:15px;line-height:1.5;">Congratulations - <strong>${companyName}</strong> is delighted to offer you the role of <strong>${role}</strong>.</p>
          <table style="border-collapse:collapse;margin:12px 0;font-size:14px;"><tr><td style="padding:4px 12px 4px 0;color:#64748B;">CTC</td><td style="font-weight:700;">${ctc} LPA</td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748B;">Joining date</td><td style="font-weight:700;">${joinDate.toDateString()}</td></tr><tr><td style="padding:4px 12px 4px 0;color:#64748B;">Probation</td><td style="font-weight:700;">${probation} month${probation === 1 ? "" : "s"}</td></tr></table>
          <p style="color:#475569;font-size:15px;line-height:1.5;">Open Hiring Rounds in your Talentera dashboard to accept the offer.</p>`;
        await H.notifyCandidate(app, { title: `Job offer from ${companyName}! 🎉`, message: `Congratulations! ${companyName} has offered you ${role} at ${ctc} LPA, joining ${joinDate.toDateString()}.`, type: "offer_received", companyName, email, name, emailHtml: html });
      } else if (action === "hold") {
        app.hiring.approval = { decision: "hold", at: new Date().toISOString(), by: "Management" };
        H.setStage(app, "hold");
        H.audit(app, "Management", "Held at approval", "");
        await app.save();
        await H.notifyCandidate(app, { title: `Update from ${companyName}`, message: "You're shortlisted but your decision is on hold for now. We'll update you soon.", companyName, email, name });
      } else {
        app.hiring.approval = { decision: "reject", at: new Date().toISOString(), by: "Management" };
        H.setStage(app, "rejected");
        app.hiring.rejection = { at: new Date().toISOString(), round: "approval", reason: "Not selected at management approval", futurePool: true };
        H.audit(app, "Management", "Rejected at approval", "");
        await app.save();
        await H.notifyCandidate(app, { title: `Update on your ${companyName} application`, message: "Thank you for going through every round with us. You were not selected for this opening, but we'll keep your profile for future roles.", companyName, email, name });
      }
      return { id: app._id };
    }, 10);
    res.json({ action, bgvSkipped, processed: results.filter((r) => r && !r.error).length, failed: results.filter((r) => r && r.error).length, seconds: Math.round((Date.now() - started) / 100) / 10 });
  } catch (err) {
    logger.error(`Bulk approval error: ${err.message}`);
    res.status(500).json({ message: err.message || "Bulk action failed." });
  }
});

// GET /applications/:id/audit - full audit trail for one candidate (panel scores, HR notes, every decision)
companyRouter.get("/applications/:id/audit", async (req, res) => {
  const [app] = await loadApps(req.companyId, { ids: [req.params.id] });
  if (!app) return res.status(404).json({ message: "Not found." });
  const h = app.hiring || {};
  res.json({ audit: h.audit || [], technical: h.technical || null, hr: h.hr || null, exam: h.exam ? { ...h.exam, answers: undefined, order: undefined } : null });
});

// ===========================================================================
// CANDIDATE ROUTER
// ===========================================================================
const candidateRouter = express.Router();
candidateRouter.use(requireAuth);

// Technical pass mark for a company (cached per request burst)
const _techCutoffCache = new Map();
async function technicalCutoffFor(companyRef) {
  const id = String(companyRef?._id || companyRef || "");
  if (!id) return 60;
  const hit = _techCutoffCache.get(id);
  if (hit && Date.now() - hit.at < 60000) return hit.v;
  let v = 60;
  try { v = (await getSetup(id)).technicalCutoffPct || 60; } catch { /* default */ }
  _techCutoffCache.set(id, { v, at: Date.now() });
  return v;
}

// GET / - everything the candidate has going on in company hiring rounds
candidateRouter.get("/", async (req, res) => {
  try {
    const apps = await Application.find({ candidateId: req.candidateId, "hiring.stage": { $in: IN_FLOW } }).populate("companyId", "companyName stage9 jobId jdPublished logo companyLogo stage2.logo stage2.logosquare stage4.blogo").sort({ updatedAt: -1 });
    const out = [];
    for (const app of apps) {
      const h = app.hiring || {};
      const company = app.companyId;
      const titles = await jobTitles(company, [app]);
      const exam = h.exam ? { ...h.exam, answers: undefined, order: undefined, topicBreakdown: h.exam.topicBreakdown || [] } : null;
      out.push({
        id: app._id, company: company?.companyName || "Employer", companyLogo: (company && (company.companyLogo || company.logo || company.stage4?.blogo?.docUrl || company.stage2?.logo?.docUrl || company.stage2?.logosquare?.docUrl)) || null, role: titles[app.jobId] || "Role", stage: h.stage,
        exam,
        technical: h.technical ? { mode: h.technical.mode, panelName: h.technical.panelName, scheduledAt: h.technical.scheduledAt, meetingLink: h.technical.meetingLink, checkinToken: h.technical.checkinToken, office: h.technical.office, checkedInAt: h.technical.checkedInAt, joinedAt: h.technical.joinedAt || null, interviewCompletedAt: h.technical.interviewCompletedAt || null, documentsToCarry: h.technical.documentsToCarry || "", instructions: h.technical.instructions || "", status: h.technical.status, avgScore: h.technical.avgScore ?? null, decision: h.technical.decision || null, completedAt: h.technical.completedAt || null, cutoffPct: await technicalCutoffFor(app.companyId), scores: (h.technical.scores || []).map((x) => ({ member: x.member, pct: x.pct })) } : null,
        hrStatus: h.hr ? { hrName: h.hr.hrName, status: h.hr.status, interview: h.hr.interview || null, bgv: h.hr.bgv || null } : null,
        offer: h.offer || null,
        rejection: h.rejection ? { round: h.rejection.round, futurePool: !!h.rejection.futurePool } : null,
      });
    }
    res.json({ items: out });
  } catch (err) {
    res.status(500).json({ message: "Could not load your hiring rounds." });
  }
});

async function ownApp(req) {
  return Application.findOne({ _id: req.params.id, candidateId: req.candidateId }).populate("candidateId", "email stage1");
}

// POST /exams/:id/start - returns the questions (never the answers); one attempt, timer enforced server-side
candidateRouter.post("/exams/:id/start", async (req, res) => {
  try {
    const app = await ownApp(req);
    const e = app?.hiring?.exam;
    if (!app || !e || !e.allocatedAt) return res.status(404).json({ message: "No exam allocated." });
    if (e.completedAt) return res.status(400).json({ message: "You have already completed this exam." });
    if (e.source === "manual" || e.source === "integration") return res.status(400).json({ message: "This exam is taken outside Talentera - your result will appear here." });
    if (new Date(e.expiresAt) < new Date() && !e.startedAt) return res.status(400).json({ message: "This exam link has expired. Ask the employer to re-allocate it." });
    const exam = await HiringExam.findById(e.examId);
    if (!exam) return res.status(404).json({ message: "The exam is no longer available." });
    if (!e.startedAt) {
      e.startedAt = new Date().toISOString();
      e.status = "in_progress";
      e.proctorFlags = [];
      e.answers = {};
      e.order = buildExamOrder(exam.questions); // every candidate gets their own question + option order
      H.audit(app, "Candidate", "Exam started", "");
      app.markModified("hiring");
      await app.save();
    }
    const endsAt = new Date(new Date(e.startedAt).getTime() + (exam.durationMin || 30) * 60000);
    if (endsAt < new Date(Date.now() - 60000)) {
      // time is up before they came back - grade what was saved
      const g = H.gradeExam(exam.questions, toOriginalAnswers(e.order, e.answers || {}));
      await completeExam(app, { ...g, source: "talentera", by: "System (time expired)" });
      return res.status(400).json({ message: "Time is up - your saved answers were submitted." });
    }
    res.json({
      title: exam.title, durationMin: exam.durationMin, endsAt: endsAt.toISOString(), saved: e.answers || {},
      questions: Array.isArray(e.order) && e.order.length
        ? e.order.map((o) => { const q = exam.questions[o.q]; return { topic: q.topic, question: q.question, options: o.opts.map((i) => q.options[i]) }; })
        : exam.questions.map((q) => ({ topic: q.topic, question: q.question, options: q.options })),
    });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not start the exam." });
  }
});

candidateRouter.post("/exams/:id/save", async (req, res) => {
  const app = await ownApp(req);
  const e = app?.hiring?.exam;
  if (!app || !e || !e.startedAt || e.completedAt) return res.status(400).json({ message: "Exam is not in progress." });
  e.answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : e.answers;
  app.markModified("hiring");
  await app.save();
  res.json({ ok: true });
});

candidateRouter.post("/exams/:id/flag", async (req, res) => {
  const app = await ownApp(req);
  const e = app?.hiring?.exam;
  if (!app || !e || !e.startedAt || e.completedAt) return res.json({ ok: true });
  const type = ["tab_switch", "webcam_denied", "fullscreen_exit", "paste", "copy"].includes(req.body.type) ? req.body.type : "other";
  e.proctorFlags = [...(e.proctorFlags || []), { type, at: new Date().toISOString() }].slice(-200);
  app.markModified("hiring");
  await app.save();
  res.json({ ok: true });
});

candidateRouter.post("/exams/:id/submit", async (req, res) => {
  try {
    const app = await ownApp(req);
    const e = app?.hiring?.exam;
    if (!app || !e || !e.startedAt) return res.status(400).json({ message: "Exam has not been started." });
    if (e.completedAt) return res.status(400).json({ message: "You have already submitted this exam." });
    const exam = await HiringExam.findById(e.examId);
    if (!exam) return res.status(404).json({ message: "The exam is no longer available." });
    const answers = req.body.answers && typeof req.body.answers === "object" ? req.body.answers : (e.answers || {});
    const g = H.gradeExam(exam.questions, toOriginalAnswers(e.order, answers));
    const flags = e.proctorFlags || [];
    const result = await completeExam(app, { ...g, source: "talentera", by: "Candidate" });
    res.json({ score: result.score, passed: result.passed, correct: g.correct, total: g.total, topicBreakdown: g.topicBreakdown, cutoffPct: result.cutoffPct, flags: flags.length });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not submit the exam." });
  }
});

// POST /exams/:id/recording (multipart field "video") - the webcam recording of the assessment, kept for the recruiter
candidateRouter.post("/exams/:id/recording", upload.single("video"), handleUpload({ resourceType: "video", folder: "talentera/assessment-recordings" }), async (req, res) => {
  try {
    const app = await ownApp(req);
    const e = app?.hiring?.exam;
    if (!app || !e || !e.startedAt) return res.status(400).json({ message: "No assessment attempt found." });
    if (!req.file || !req.file.fileUrl) return res.status(400).json({ message: "No recording received." });
    const part = Math.max(1, Math.min(20, Number(req.query.part) || 1));
    const rec = { part, url: req.file.fileUrl, at: new Date().toISOString(), size: req.file.size || req.file.buffer?.length || 0 };
    e.recordings = [...(Array.isArray(e.recordings) ? e.recordings.filter((x) => x.part !== part) : []), rec].sort((a, b) => a.part - b.part);
    e.recordingUrl = e.recordings[0].url; // first segment doubles as the main link
    e.recordingAt = rec.at;
    H.audit(app, "Candidate", "Assessment recording saved", `part ${part}`);
    app.markModified("hiring");
    await app.save();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not save the recording." });
  }
});

// POST /technical/:id/join - candidate opened the video interview; this is what proves attendance
candidateRouter.post("/technical/:id/join", async (req, res) => {
  try {
    const app = await ownApp(req);
    const t = app?.hiring?.technical;
    if (!app || !t || app.hiring.stage !== "technical") return res.status(400).json({ message: "No open technical interview." });
    if (!t.joinedAt) {
      t.joinedAt = new Date().toISOString();
      H.audit(app, "Candidate", "Joined interview", "");
      app.markModified("hiring");
      await app.save();
    }
    res.json({ joinedAt: t.joinedAt });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not record your attendance." });
  }
});

// POST /offers/:id/respond { accept: boolean }
candidateRouter.post("/offers/:id/respond", async (req, res) => {
  const app = await ownApp(req);
  if (!app || !app.hiring?.offer || app.hiring.offer.status !== "sent") return res.status(400).json({ message: "No open offer to respond to." });
  const accept = !!req.body.accept;
  app.hiring.offer.status = accept ? "accepted" : "declined";
  app.hiring.offer.respondedAt = new Date().toISOString();
  H.audit(app, "Candidate", accept ? "Offer accepted" : "Offer declined", "");
  app.markModified("hiring");
  await app.save();

  // Tell the company (in-app + email) what the candidate decided - best effort, never blocks the response.
  try {
    const cand = app.candidateId && app.candidateId.stage1 ? app.candidateId : await Candidate.findById(app.candidateId).select("email stage1").lean();
    const candName = cand?.stage1?.fullName || cand?.email || "The candidate";
    const offer = app.hiring.offer;
    const roleText = offer.role ? ` for ${offer.role}` : "";
    const title = accept ? `Offer accepted - ${candName}` : `Offer declined - ${candName}`;
    const message = accept
      ? `${candName} accepted your offer${roleText}${offer.ctc ? ` (${offer.ctc} LPA)` : ""}${offer.joinDate ? `. Joining date: ${new Date(offer.joinDate).toLocaleDateString("en-IN")}` : ""}. Next step: share joining and onboarding details.`
      : `${candName} declined your offer${roleText}. You can reach out or move to another candidate.`;
    await Notification.create({
      recipientType: "company",
      recipientId: String(app.companyId),
      title,
      message,
      type: "offer_response",
      meta: { source: "candidate", applicationId: String(app._id), candidateId: String(cand?._id || app.candidateId), accepted: accept },
    });
    const company = await Company.findById(app.companyId).select("email companyName").lean();
    if (company?.email) {
      sendTransactionalEmail({
        to: company.email,
        toName: company.companyName || "there",
        subject: title,
        html: wrapEmailTemplate(title, `<p style="color:#475569;font-size:15px;line-height:1.5;">${message}</p>`),
      }).catch((e) => logger.warn(`Offer response email failed: ${e.message}`));
    }
  } catch (notifyErr) {
    logger.warn(`Offer response notification failed: ${notifyErr.message}`);
  }
  res.json({ status: app.hiring.offer.status });
});

// ===========================================================================
// PUBLIC ROUTER (no login)
// ===========================================================================
const publicRouter = express.Router();
publicRouter.use(require("express-rate-limit")({ windowMs: 15 * 60 * 1000, max: 600, standardHeaders: true, legacyHeaders: false, message: { message: "Too many requests - please slow down." } }));

// POST /integration-score  header x-api-key  body { applicationId | candidateEmail, score, tool }
// Option 3: Mettl / iMocha / HackerRank etc. push scores here and they land on the same scoreboard.
publicRouter.post("/integration-score", async (req, res) => {
  try {
    const key = String(req.headers["x-api-key"] || "");
    if (!key) return res.status(401).json({ message: "Missing x-api-key." });
    const setup = await HiringSetup.findOne({ integrationKey: key });
    if (!setup) return res.status(401).json({ message: "Invalid API key." });
    const score = Number(req.body.score);
    if (!Number.isFinite(score) || score < 0 || score > 100) return res.status(400).json({ message: "score must be 0-100." });
    let app = null;
    if (req.body.applicationId) app = await Application.findOne({ _id: req.body.applicationId, companyId: setup.companyId }).populate("candidateId", "email stage1");
    else if (req.body.candidateEmail) {
      const cand = await Candidate.findOne({ email: String(req.body.candidateEmail).toLowerCase().trim() }).select("_id");
      if (cand) app = await Application.findOne({ candidateId: cand._id, companyId: setup.companyId, ...(req.body.jobId ? { jobId: req.body.jobId } : {}) }).populate("candidateId", "email stage1");
    }
    if (!app) return res.status(404).json({ message: "Application not found for this company." });
    if (!app.hiring?.exam?.allocatedAt) return res.status(400).json({ message: "No exam is allocated to this candidate." });
    if (app.hiring.exam.completedAt) return res.status(400).json({ message: "This exam already has a result." });
    const exam = await completeExam(app, { score: Math.round(score), source: `integration${req.body.tool ? ` (${String(req.body.tool).slice(0, 40)})` : ""}`, by: `Integration${req.body.tool ? ` - ${String(req.body.tool).slice(0, 40)}` : ""}` });
    res.json({ ok: true, passed: exam.passed });
  } catch (err) {
    res.status(500).json({ message: err.message || "Could not record the score." });
  }
});

// POST /checkin/:token - candidate (or reception) scans the check-in code for an offline round
publicRouter.post("/checkin/:token", async (req, res) => {
  const token = String(req.params.token || "");
  if (token.length < 6) return res.status(400).json({ message: "Invalid check-in code." });
  const app = await Application.findOne({ "hiring.technical.checkinToken": token }).populate("candidateId", "stage1");
  if (!app) return res.status(404).json({ message: "Check-in code not found." });
  if (!app.hiring.technical.checkedInAt) {
    app.hiring.technical.checkedInAt = new Date().toISOString();
    H.audit(app, "Candidate", "Checked in at reception", "");
    app.markModified("hiring");
    await app.save();
  }
  res.json({ ok: true, name: app.candidateId?.stage1?.fullName || "Candidate", panel: app.hiring.technical.panelName, at: app.hiring.technical.checkedInAt });
});

module.exports = { companyRouter, candidateRouter, publicRouter };
