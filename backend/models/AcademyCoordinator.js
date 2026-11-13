const mongoose = require("mongoose");

/**
 * Branch Placement Coordinator login model for Academy accounts.
 *
 * Each branch registered by the Academy Head can have an assigned Placement
 * Coordinator. The workflow:
 * 1. Academy Head registers a branch with Placement Coordinator details.
 * 2. Talentera dispatches an invitation email with an account activation link.
 * 3. Coordinator opens the activation link, sets their password, and activates their account.
 * 4. Coordinator logs in at the Academy Login portal.
 * 5. Branch-specific dashboard opens, scoped exclusively to their branch data.
 */
const AcademyCoordinatorSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },
    branchName: {
      type: String,
      required: true,
      trim: true,
    },
    branchCity: {
      type: String,
      default: "",
      trim: true,
    },
    branchState: {
      type: String,
      default: "",
      trim: true,
    },
    branchPhone: {
      type: String,
      default: "",
      trim: true,
    },
    branchAddress: {
      type: String,
      default: "",
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    designation: {
      type: String,
      default: "Placement Coordinator",
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      default: "",
      trim: true,
    },
    role: {
      type: String,
      enum: ["branch_coordinator", "branch_placement_lead", "training_officer"],
      default: "branch_coordinator",
    },
    status: {
      type: String,
      enum: ["invited", "active", "suspended"],
      default: "invited",
    },
    passwordHash: {
      type: String,
      default: null,
    },
    inviteToken: {
      type: String,
      default: null,
      index: true,
    },
    inviteExpires: {
      type: Date,
      default: null,
    },
    activatedAt: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    createdByName: {
      type: String,
      default: "",
    },
  },
  { timestamps: true }
);

AcademyCoordinatorSchema.index({ academyId: 1, branchName: 1 });

AcademyCoordinatorSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.inviteToken;
    return ret;
  },
});

module.exports = mongoose.model("AcademyCoordinator", AcademyCoordinatorSchema);
