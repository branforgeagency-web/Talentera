const mongoose = require("mongoose");

/**
 * Mirrors the original Firestore shape documented in DEVELOPER_HANDOFF.md:
 *
 * candidates/{uid}
 *   email, createdAt/updatedAt, completedStages: [1,2,4,...]
 *   stage1..stage8: { ...fields }  OR  { skipped: true }
 *   resumeUrl, resumeFileName
 *
 * Firebase Auth UID is replaced by Mongo's own _id + a hashed password field.
 * Stages are kept as loosely-typed Mixed objects on purpose: each stage's
 * form fields evolve independently, and the resume generator reads them by
 * key name (see backend/utils/resumeScore.js and stage field-mapping notes
 * in the handoff doc, section 5 "Field-mapping cleanup").
 */
const CandidateSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: {
      type: String,
      required: true,
    },

    // Top-level mobile, distinct from stage1.mobile: collected at signup (or
    // added later) so login-time OTP can be sent by SMS as well as email.
    // Optional - candidates who registered before this field existed, or who
    // skip it, simply get an email-only OTP at login.
    mobile: {
      type: String,
      default: "",
      trim: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
      default: null,
    },

    completedStages: {
      type: [Number],
      default: [],
    },

    // Stage 1: Basic Info (identity)
    stage1: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
      // Expected shape when not skipped:
      // { fullName, mobile, city, experience, currentRole, aadhaarVerified }
    },
    // Stage 2: Training (academy) - skippable -> { skipped: true }
    stage2: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 3: Certification - skippable -> { skipped: true }
    stage3: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 4: Assessment (mandatory, key verification gate)
    stage4: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 5: Video introduction (mandatory)
    stage5: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 6: Live Charts (mandatory)
    stage6: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 7: Build Resume - skippable -> { skipped: true }
    stage7: { type: mongoose.Schema.Types.Mixed, default: null },
    manualResume: { type: mongoose.Schema.Types.Mixed, default: null },
    // Stage 8: Track (employment status)
    stage8: { type: mongoose.Schema.Types.Mixed, default: null },

    // Academic & Professional Document Vault
    documentVault: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },

    resumeUrl: { type: String, default: null },
    resumeFileName: { type: String, default: null },
    resumeTemplate: {
      type: String,
      default: "fresher_modern",
    },

    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    // Set to false to stop "new job posted" emails (utils/jobAlerts.js). Default: on.
    jobAlertEmails: {
      type: Boolean,
      default: true,
    },
    notificationsLastReadAt: {
      type: Date,
      default: null,
    },
    readNotificationIds: {
      type: [String],
      default: [],
    },

    // 🎁 Referral & 3 Earning Engines
    referralCode: {
      type: String,
      default: null,
      trim: true,
    },
    pointsWallet: {
      type: Number,
      default: 50,
    },
    portalReferrals: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    academyReferrals: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    employerReferrals: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    redemptions: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
    },
    payoutSettings: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        payoutMethod: "upi",
        upiId: "",
        accountHolder: "",
        accountNumber: "",
        ifsc: "",
        bankName: "",
        panNumber: "",
      }),
    },
  },
  { timestamps: true } // gives createdAt / updatedAt automatically
);

// Never leak passwordHash in JSON responses
CandidateSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("Candidate", CandidateSchema);
