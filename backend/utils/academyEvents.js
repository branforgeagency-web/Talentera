const AcademyActivityEvent = require("../models/AcademyActivityEvent");
const logger = require("./logger");

/**
 * Bridges real actions taken elsewhere in the app (a company moving an
 * application forward, a candidate applying, etc.) into the academy's Live
 * Activity feed / Interviews Kanban / Batch Heatmap (routes/academy.js).
 *
 * Before this existed, those academy-side screens were reading from
 * AcademyActivityEvent documents that nothing in routes/company.js or
 * routes/candidate.js ever created — the only writer was the manual
 * POST /api/academy/activity/simulate demo button and the one "profile
 * live" event created at invite time. This is the other side of that pipe:
 * called from the real state-change call sites so the feed reflects what
 * actually happened, not a random simulated action.
 *
 * A candidate only has a resolvable academy when they came up through an
 * academy invite/upload flow and stage2.academyId got set (see
 * routes/academy.js's upload-confirm / add-single, and the inviteToken
 * branch in routes/auth.js's /register). An organic candidate who signed up
 * directly has no academy to notify — emitAcademyEvent silently no-ops for
 * them, same as it does for any other resolution failure. This must never
 * throw into its caller: it always runs after the real state change has
 * already been persisted and responded to the resolution rounder — nothing.
 */
async function emitAcademyEvent({ candidate, eventType, companyName, jobTitle, applicationId, companyId, eventMeta = {} }) {
  try {
    if (!candidate) return null;
    const academyId = candidate.stage2?.academyId;
    if (!academyId) return null; // not an academy-linked candidate — nothing to notify

    const candidateName = candidate.stage1?.fullName || candidate.email?.split("@")[0] || "Candidate";

    return await AcademyActivityEvent.create({
      academyId,
      candidateId: candidate._id,
      candidateName,
      companyId: companyId || null,
      companyName: companyName || "Talentera Employer",
      applicationId: applicationId || null,
      jobTitle: jobTitle || "Medical Coder",
      batchCode: candidate.stage2?.batch || "",
      courseTitle: candidate.stage2?.course || candidate.stage2?.currentRole || "",
      eventType,
      eventMeta,
    });
  } catch (err) {
    // Best-effort: a notification failure must never fail the real action
    // (an application status update, an apply, a view) that triggered it.
    logger.warn(`emitAcademyEvent(${eventType}) failed: ${err.message}`);
    return null;
  }
}

module.exports = { emitAcademyEvent };
