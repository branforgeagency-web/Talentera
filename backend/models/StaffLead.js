const mongoose = require("mongoose");

/**
 * Candidates / leads captured by staff through the "Quick Add" form on the
 * Staff Hub (walk-ins, academy visits, referrals) before the person has
 * registered on the portal themselves.
 *
 * The Aadhaar number is never stored in clear: only a salted SHA-256 hash
 * (used purely to detect duplicate entries) and the last 4 digits (for
 * display and for matching against the masked Aadhaar already kept on
 * registered candidates).
 */
const StaffLeadSchema = new mongoose.Schema(
  {
    kind: { type: String, enum: ["quick_add", "upload", "lead", "visit"], default: "quick_add" },
    name: { type: String, required: true, trim: true },
    email: { type: String, default: "", lowercase: true, trim: true },
    phone: { type: String, default: "", trim: true },
    phoneKey: { type: String, default: "" }, // last 10 digits, for duplicate matching
    aadhaarHash: { type: String, default: "" },
    aadhaarLast4: { type: String, default: "" },
    institute: { type: String, default: "", trim: true },
    notes: { type: String, default: "", trim: true },
    status: { type: String, enum: ["new", "converted"], default: "new" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "Staff" },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

StaffLeadSchema.index({ email: 1 });
StaffLeadSchema.index({ aadhaarHash: 1 });
StaffLeadSchema.index({ phoneKey: 1 });
StaffLeadSchema.index({ createdAt: -1 });

module.exports = mongoose.model("StaffLead", StaffLeadSchema);
