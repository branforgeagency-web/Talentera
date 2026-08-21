const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipientType: {
      type: String,
      enum: ["company", "staff"],
      required: true,
    },
    recipientId: {
      type: String, // Company ID for company, or "staff" for staff officers
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ["kyc_approved", "kyc_revision", "kyc_submitted", "doc_updated", "system"],
      default: "system",
    },
    read: {
      type: Boolean,
      default: false,
    },
    meta: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  { timestamps: true }
);

// Both routes/company.js and routes/staff.js query by
// { recipientType, recipientId } sorted by createdAt on every notification
// bell load - this was previously unindexed.
NotificationSchema.index({ recipientType: 1, recipientId: 1, createdAt: -1 });

module.exports = mongoose.model("Notification", NotificationSchema);
