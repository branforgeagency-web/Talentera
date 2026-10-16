// Connects the batch hiring flow (routes/hiring.js) to the Academy, College and Company dashboards.
// Every hiring stage change / offer response is mirrored (best effort - never throws) into:
//   * Academy: Live Activity feed (AcademyActivityEvent), notification bell, placement confirmation queue, student placement status
//   * College: student placementLifecycle (Shortlisted / Interview / Offer / Placed), notification bell
//   * Company: notification when a candidate accepts or declines an offer
// Triggered from Application's post-save hook (models/Application.js) so every code path is covered.
const mongoose = require("mongoose");
const logger = require("./logger");

const STAGE_META = {
  exam: { label: "Online exam", event: "shortlisted", college: "SHORTLISTED" },
  technical: { label: "Technical interview", event: "interview_scheduled", college: "INTERVIEW_SCHEDULED" },
  hr: { label: "HR round", event: "interview_scheduled", college: "INTERVIEW_SCHEDULED" },
  approval: { label: "Management approval", event: null, college: "INTERVIEW_SCHEDULED" },
  offered: { label: "Offer released", event: "offer_extended", college: "OFFER_EXTENDED" },
  hold: { label: "On hold", event: "on_hold", college: null },
  rejected: { label: "Not selected", event: "rejected", college: "REJECTED" },
};
const ACTIVE_STAGES = ["exam", "technical", "hr", "approval", "offered"];
const PRIORITY = ["offered", "approval", "hr", "technical", "exam", "hold", "rejected"];

function linkKey(h) {
  return `${h.stage || ""}|${h.offer?.status || ""}`;
}

function label(h) {
  if (h.stage === "offered" && h.offer?.status === "accepted") return "Offer accepted - placed";
  if (h.stage === "offered" && h.offer?.status === "declined") return "Offer declined";
  return STAGE_META[h.stage]?.label || "Applied";
}

async function notify(Notification, recipientType, recipientId, title, message, meta) {
  try {
    await Notification.create({ recipientType, recipientId: String(recipientId), title, message, type: "hiring_update", meta: { source: "hiring-flow", ...(meta || {}) } });
  } catch (err) {
    logger.warn(`Hiring link notification failed: ${err.message}`);
  }
}

// Runs after an Application is saved. Idempotent: a marker (hiring.linked) remembers what was already mirrored.
async function syncAfterSave(app, deps = {}) {
  try {
    const h = app && app.hiring;
    if (!h || !h.stage || h.stage === "applied") return;
    const key = linkKey(h);
    if (h.linked && h.linked.key === key) return;

    const Application = deps.Application || mongoose.model("Application");
    const Candidate = deps.Candidate || mongoose.model("Candidate");
    const Company = deps.Company || mongoose.model("Company");
    const Notification = deps.Notification || mongoose.model("Notification");
    const PlacementConfirmation = deps.PlacementConfirmation || require("../models/PlacementConfirmation");
    const emitAcademyEvent = deps.emitAcademyEvent || require("./academyEvents").emitAcademyEvent;

    // Mark first so a failure below can never cause a duplicate storm on the next save.
    h.linked = { key, at: new Date().toISOString() }; // also kept in memory so a later save of this same document keeps it
    await Application.updateOne({ _id: app._id }, { $set: { "hiring.linked": { key, at: new Date().toISOString() } } });

    const candidate = await Candidate.findById(app.candidateId);
    if (!candidate) return;
    const academyId = candidate.stage2?.academyId || null;
    const collegeId = candidate.collegeId || null;
    const company = await Company.findById(app.companyId).select("companyName").lean();
    const companyName = company?.companyName || "the employer";
    const name = candidate.stage1?.fullName || (candidate.email || "").split("@")[0] || "Candidate";
    const offer = h.offer || {};
    const role = offer.role || "";
    const stageLabel = label(h);
    const accepted = h.stage === "offered" && offer.status === "accepted";
    const declined = h.stage === "offered" && offer.status === "declined";
    const meta = STAGE_META[h.stage] || {};

    // ---------------- Academy ----------------
    if (academyId) {
      let eventType = meta.event;
      if (accepted) eventType = "offer_accepted";
      if (declined) eventType = "rejected";
      if (eventType) {
        await emitAcademyEvent({
          candidate,
          eventType,
          companyId: app.companyId,
          companyName,
          jobTitle: role || undefined,
          applicationId: app._id,
          eventMeta: {
            stage: h.stage,
            stageLabel,
            ...(offer.ctc ? { salary: `${offer.ctc} LPA` } : {}),
            ...(declined ? { reason: "Candidate declined the offer" } : {}),
            ...(h.stage === "rejected" && h.rejection?.reason ? { reason: h.rejection.reason } : {}),
          },
        });
      }
      await notify(
        Notification, "system", academyId,
        accepted ? `Placement confirmed: ${name} at ${companyName}` : `${name}: ${stageLabel} at ${companyName}`,
        accepted
          ? `${name} accepted the offer${role ? ` for ${role}` : ""}${offer.ctc ? ` (${offer.ctc} LPA)` : ""}. It is in your placement confirmations queue.`
          : `${name} is now at "${stageLabel}" in ${companyName}'s hiring process.`,
        { candidateId: String(candidate._id), companyName, stage: h.stage, actionType: "placements" }
      );

      if (accepted) {
        const existing = await PlacementConfirmation.findOne({ candidateId: candidate._id, companyId: app.companyId });
        if (!existing) {
          await PlacementConfirmation.create({
            academyId,
            candidateId: candidate._id,
            candidateName: name,
            candidateEmail: candidate.email || "",
            companyId: app.companyId,
            companyName,
            batchCode: candidate.stage2?.batch || "",
            courseTitle: candidate.stage2?.course || "",
            role: role || "Medical Coder",
            ctc: offer.ctc ? `${offer.ctc} LPA` : "To be confirmed",
            city: candidate.stage1?.city || "",
          });
        }
        candidate.stage8 = {
          ...(candidate.stage8 || {}),
          placementStatus: `Placed at ${companyName} — Pending Confirmation`,
          employer: companyName,
          role: role || candidate.stage8?.role || "",
          ctc: offer.ctc ? `${offer.ctc} LPA` : candidate.stage8?.ctc || "",
          placedAt: new Date(),
        };
        candidate.markModified("stage8");
      }
    }

    // ---------------- College ----------------
    if (collegeId) {
      const lc = { ...(candidate.placementLifecycle || {}) };
      let next = accepted ? "PLACED" : meta.college;
      if (declined) next = "AVAILABLE";
      if (next && lc.currentStatus !== "PLACED") {
        if (next === "REJECTED" || next === "AVAILABLE") {
          // Don't mark rejected/available while another company process is still active for this student.
          const others = await Application.countDocuments({ candidateId: candidate._id, _id: { $ne: app._id }, "hiring.stage": { $in: ACTIVE_STAGES } });
          if (others > 0) next = null;
        }
        if (next) {
          lc.previousStatus = lc.currentStatus || "AVAILABLE";
          lc.currentStatus = next;
          if (next === "PLACED") {
            lc.placedCompanyId = app.companyId;
            lc.placedCompanyName = companyName;
            lc.placedRole = role || lc.placedRole || "";
            lc.placedCtc = offer.ctc ? `${offer.ctc} LPA` : lc.placedCtc || "";
            lc.placedDate = lc.placedDate || new Date();
            if (offer.joinDate) lc.joiningDate = offer.joinDate;
          }
          candidate.placementLifecycle = lc;
          candidate.markModified("placementLifecycle");
        }
      }
      await notify(
        Notification, "college", collegeId,
        accepted ? `Student placed: ${name} at ${companyName}` : `${name}: ${stageLabel} at ${companyName}`,
        accepted
          ? `${name} accepted ${companyName}'s offer${role ? ` for ${role}` : ""}${offer.ctc ? ` (${offer.ctc} LPA)` : ""}. Placement record updated.`
          : `${name} is now at "${stageLabel}" in ${companyName}'s hiring process.`,
        { candidateId: String(candidate._id), companyName, stage: h.stage, actionType: "placements" }
      );
    }

    if (candidate.isModified && candidate.isModified()) await candidate.save();

    // ---------------- Company ----------------
    if (accepted || declined) {
      await notify(
        Notification, "company", app.companyId,
        accepted ? `${name} accepted your offer` : `${name} declined your offer`,
        accepted ? `${name} accepted the ${role || "offered role"} offer. Joining ${offer.joinDate ? new Date(offer.joinDate).toDateString() : "date as agreed"}.` : `${name} declined the ${role || "offered role"} offer.`,
        { candidateId: String(candidate._id), applicationId: String(app._id), actionType: "hiring" }
      );
    }
  } catch (err) {
    logger.warn(`Hiring dashboard sync failed: ${err.message}`);
  }
}

// One summary per candidate (their most advanced hiring process) for the Academy / College candidate lists.
async function hiringSummary(candidateIds, deps = {}) {
  const out = {};
  try {
    if (!candidateIds || candidateIds.length === 0) return out;
    const Application = deps.Application || mongoose.model("Application");
    const Company = deps.Company || mongoose.model("Company");
    const apps = await Application.find({ candidateId: { $in: candidateIds }, "hiring.stage": { $exists: true, $nin: ["applied", null] } })
      .select("candidateId companyId hiring updatedAt").lean();
    if (apps.length === 0) return out;
    const companies = await Company.find({ _id: { $in: [...new Set(apps.map((a) => String(a.companyId)))] } }).select("companyName").lean();
    const cname = {};
    companies.forEach((c) => { cname[String(c._id)] = c.companyName; });
    const score = (a) => {
      const h = a.hiring || {};
      const p = PRIORITY.indexOf(h.stage);
      const accepted = h.stage === "offered" && h.offer?.status === "accepted" ? 100 : 0;
      return accepted + (p === -1 ? 0 : PRIORITY.length - p);
    };
    apps.forEach((a) => {
      const id = String(a.candidateId);
      const cur = out[id];
      if (cur && cur._score >= score(a)) { cur.processes += 1; return; }
      const h = a.hiring || {};
      out[id] = {
        _score: score(a),
        processes: (cur ? cur.processes : 0) + 1,
        stage: h.stage,
        stageLabel: label(h),
        company: cname[String(a.companyId)] || "",
        role: h.offer?.role || "",
        offerStatus: h.offer?.status || "",
        updatedAt: a.updatedAt,
      };
    });
    Object.values(out).forEach((v) => { delete v._score; });
  } catch (err) {
    logger.warn(`hiringSummary failed: ${err.message}`);
  }
  return out;
}

module.exports = { syncAfterSave, hiringSummary, STAGE_META };
