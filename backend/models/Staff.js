const mongoose = require("mongoose");

const StaffSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
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
    name: {
      type: String,
      required: true,
      default: "Staff Auditor",
    },
    role: {
      type: String,
      default: "Senior Operations Auditor",
    },
    badge: {
      type: String,
      default: "Gold Certified Lead",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Hide passwordHash in JSON responses
StaffSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    return ret;
  },
});

module.exports = mongoose.model("Staff", StaffSchema);
