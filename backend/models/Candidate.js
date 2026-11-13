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

    // Chosen at signup: decides which candidate dashboard opens after login
    // ("fresher" -> /dashboard/fresher, "experienced" -> /dashboard/experienced).
    // Accounts created before this field existed have null here; the toJSON
    // transform below derives it from stage1.experience so they still route
    // to the correct dashboard.
    candidateType: {
      type: String,
      enum: ["fresher", "experienced", null],
      default: null,
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

    // Set when a Fresher account later registers as Experienced with the same e-mail (utils/fresherToExperienced.js):
    // candidateTypes lists the profiles the account has; candidateType is the ACTIVE one and the top-level stage fields hold the active profile, while profiles[type] stashes the inactive one.
    candidateTypes: { type: [String], default: [] },
    profiles: { type: mongoose.Schema.Types.Mixed, default: null },

    // Experienced Career Passport (8 stages). See utils/experiencedPassport.js for the shape.
    experienced: { type: mongoose.Schema.Types.Mixed, default: null },

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

    // 🎓 College Placement Ecosystem Extension
    collegeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "College",
      default: null,
      index: true,
    },
    isCollegeStudent: {
      type: Boolean,
      default: false,
      index: true,
    },
    studentEnrollment: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        studentId: "",
        rollNumber: "",
        department: "",
        degree: "",
        yearOfStudy: "",
        graduationYear: "",
        cgpa: "",
        percentage: "",
        backlogsCount: 0,
        marksheetsVault: [],
      }),
    },
    rcmDomainSelection: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        primaryDomain: "Medical Coding",
        primarySubSpecialties: [],
        secondaryDomain: "",
        secondarySubSpecialties: [],
        workModePreference: "WFO",
        shiftPreference: "Day Shift",
        expectedSalary: "",
        availability: "Immediate",
      }),
    },
    collegeTrainingModules: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        domain: "Medical Coding",
        status: "NOT_STARTED", // NOT_STARTED, IN_PROGRESS, COMPLETED
        modules: [],
        startedAt: null,
        completedAt: null,
        trainerName: "",
        certificateUrl: null,
      }),
    },
    verificationReadiness: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        checklist: {
          mobile: false,
          email: true,
          college: false,
          academics: false,
          resume: false,
          training: false,
          certification: false,
          assessment: false,
          videoResume: false,
        },
        readinessStatus: "ENROLLED", // ENROLLED, PROFILE_COMPLETED, TRAINING_IN_PROGRESS, ASSESSMENT_PENDING, VERIFICATION_PENDING, VERIFIED, INTERVIEW_READY
        verifiedBy: null,
        verifiedAt: null,
      }),
    },
    videoResume: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        videoUrl: null,
        thumbnailUrl: null,
        duration: 0,
        status: "PENDING", // PENDING, COMPLETED
        recordedAt: null,
      }),
    },
    placementLifecycle: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        currentStatus: "AVAILABLE", // AVAILABLE, SHORTLISTED, INTERVIEW_SCHEDULED, OFFER_EXTENDED, PLACED
        activeInterviewsCount: 0,
        placedCompanyId: null,
        placedCompanyName: "",
        placedRole: "",
        placedCtc: "",
        placedDate: null,
        joiningDate: null,
        offerLetterUrl: null,
      }),
    },

    resumeUrl: { type: String, default: null },
    resumeFileName: { type: String, default: null },
    resumeTemplate: {
      type: String,
      default: "fresher_modern",
    },

    // Set when a staff member pushes this candidate into the verification
    // queue from the Staff Hub (Recent Uploads -> Push).
    staffVerification: {
      pushedAt: { type: Date, default: null },
      pushedBy: { type: String, default: "" },
    },

    isSubmitted: {
      type: Boolean,
      default: false,
    },
    submittedAt: {
      type: Date,
      default: null,
    },

    // Talentera Score (0-100), computed from Stages 1-6 only per the weighted
    // point table in backend/utils/talenteraScore.js (Stage 7/8 are output-only,
    // worth 0). Recomputed and persisted here whenever a stage is submitted or
    // approved, so any consumer reading the candidate record directly (not just
    // the academy dashboard routes that compute it live) sees the same number.
    talenteraScore: {
      type: Number,
      default: 0,
    },
    talenteraScoreBreakdown: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    // Set to false to stop "new job posted" emails (utils/jobAlerts.js). Default: on.
    jobAlertEmails: {
      type: Boolean,
      default: true,
    },
    // Twice-weekly career updates (utils/candidateEngagement.js). Default on; candidates can switch either off in Settings.
    updatesEmail: { type: Boolean, default: true },
    updatesWhatsapp: { type: Boolean, default: true },
    lastEngagementAt: { type: Date, default: null },
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
    delete ret.profiles; // inactive profile copies stay server-side
    if (!ret.candidateType) {
      ret.candidateType = /exp/i.test(String((ret.stage1 && ret.stage1.experience) || ""))
        ? "experienced"
        : "fresher";
    }
    return ret;
  },
});

module.exports = mongoose.model("Candidate", CandidateSchema);
