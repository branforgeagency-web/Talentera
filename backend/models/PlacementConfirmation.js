const mongoose = require("mongoose");
const crypto = require("crypto");

const PlacementConfirmationSchema = new mongoose.Schema(
  {
    academyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Academy",
      required: true,
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Candidate",
      required: true,
      index: true,
    },
    candidateName: {
      type: String,
      required: true,
    },
    candidateEmail: {
      type: String,
      default: "",
    },
    companyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Company",
      default: null,
    },
    companyName: {
      type: String,
      required: true,
    },
    batchCode: {
      type: String,
      default: "",
    },
    courseTitle: {
      type: String,
      default: "",
    },
    role: {
      type: String,
      default: "Medical Coder",
    },
    ctc: {
      type: String,
      default: "₹5.5 LPA",
    },
    city: {
      type: String,
      default: "Chennai",
    },
    placedDate: {
      type: Date,
      default: () => new Date(),
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "disputed"],
      default: "pending",
      index: true,
    },
    studentConfirmed: {
      type: Boolean,
      default: false,
    },
    companyConfirmed: {
      type: Boolean,
      default: true,
    },
    academyConfirmed: {
      type: Boolean,
      default: false,
    },
    disputeReason: {
      type: String,
      default: "",
    },
    verifiedAt: {
      type: Date,
      default: null,
    },
    certificateId: {
      type: String,
      default: () => `TAL-CERT-${crypto.randomBytes(4).toString("hex").toUpperCase()}`,
    },
  },
  { timestamps: true }
);

PlacementConfirmationSchema.index({ academyId: 1, createdAt: -1 });

module.exports = mongoose.model("PlacementConfirmation", PlacementConfirmationSchema);
