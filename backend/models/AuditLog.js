const mongoose = require("mongoose");

/**
 * Records every consequential staff action (KYC verification/rejection,
 * document verification, assessment sign-off, interview-question bank
 * edits, manual candidate verification). Previously none of this was
 * logged anywhere - staff could override scores or edit the interview
 * answer key with no record of who did it or when. See
 * IMPROVEMENT_ROADMAP.md "No audit trail on staff actions."
 *
 * Kept as its own collection (not appended onto Candidate/Company) so it
 * can be queried and retained independently of the records it describes,
 * and so writing an audit entry can never fail a save() on that document.
 */
const AuditLogSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    staffName: { type: String, default: "" },
    action: {
      type: String,
      required: true,
      // e.g. "verify_candidate", "verify_company", "reject_company",
      // "verify_document", "verify_assessment", "create_interview_question",
      // "update_interview_question", "delete_interview_question",
      // "assign_plan"
    },
    targetType: {
      type: String,
      enum: ["candidate", "company", "job", "interview_question", "application", "other"],
      default: "other",
    },
    targetId: { type: String, default: "" },
    // Free-form summary of what changed, safe to show in a staff-facing
    // audit list (never includes candidate/company secrets like passwords).
    summary: { type: String, default: "" },
    meta: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ targetType: 1, targetId: 1 });

module.exports = mongoose.model("AuditLog", AuditLogSchema);
