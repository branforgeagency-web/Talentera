const mongoose = require("mongoose");

// Another academy that an academy partner refers to Talentera. Talentera staff follow up and move the status.
const REFERRAL_STATUSES = ["submitted", "contacted", "onboarded", "declined"];

const AcademyReferralSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    referredAcademyName: { type: String, required: true, trim: true, maxlength: 150 },
    contactPerson: { type: String, required: true, trim: true, maxlength: 100 },
    phone: { type: String, required: true, trim: true, maxlength: 20 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
    city: { type: String, default: "", trim: true, maxlength: 80 },
    studentsPerYear: { type: String, default: "", trim: true, maxlength: 30 },
    notes: { type: String, default: "", maxlength: 300 },
    status: { type: String, enum: REFERRAL_STATUSES, default: "submitted" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademyReferral", AcademyReferralSchema);
module.exports.REFERRAL_STATUSES = REFERRAL_STATUSES;
