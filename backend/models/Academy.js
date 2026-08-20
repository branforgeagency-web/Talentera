const mongoose = require("mongoose");
const crypto = require("crypto");

const AcademySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    contactName: {
      type: String,
      default: "Academy Partner",
    },
    phone: {
      type: String,
      default: "",
    },
    tier: {
      type: String,
      default: "Platinum Partner",
    },
    badgeToken: {
      type: String,
      unique: true,
      default: () => crypto.randomBytes(16).toString("hex"),
    },
    partnerSince: {
      type: String,
      default: () => new Date().getFullYear().toString(),
    },
    studentsUploaded: {
      type: Number,
      default: 0,
    },
    verifiedPct: {
      type: Number,
      default: 94,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Academy", AcademySchema);
