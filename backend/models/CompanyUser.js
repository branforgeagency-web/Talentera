const mongoose = require("mongoose");

/**
 * Extra logins for ONE company account. The company's original account is
 * the "head admin"; the head admin creates these sub-logins (per branch) from
 * the "Team Logins" tab of the company dashboard.
 *
 * A sub-login signs in at the normal company login page and works against
 * the same company data (jobs, applicants, shortlist...), limited by `role`.
 */
const CompanyUserSchema = new mongoose.Schema(
  {
    companyId: { type: mongoose.Schema.Types.ObjectId, ref: "Company", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, default: "", trim: true },
    designation: { type: String, default: "", trim: true },
    branch: { type: String, required: true, trim: true },
    // branch_admin: manages jobs + applicants for the company
    // recruiter:    posts jobs, handles applicants
    // viewer:       read-only
    role: { type: String, enum: ["branch_admin", "recruiter", "viewer"], default: "recruiter" },
    passwordHash: { type: String, required: true },
    active: { type: Boolean, default: true },
    lastLoginAt: { type: Date, default: null },
    createdByName: { type: String, default: "" },
  },
  { timestamps: true }
);

CompanyUserSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("CompanyUser", CompanyUserSchema);
