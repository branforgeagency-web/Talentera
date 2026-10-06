const mongoose = require("mongoose");

const ReplySchema = new mongoose.Schema(
  {
    staffId: { type: String, default: "" },
    staffName: { type: String, default: "Talentera Support" },
    text: { type: String, required: true, trim: true, maxlength: 4000 },
    createdAt: { type: Date, default: Date.now },
  },
  { _id: true }
);

const EnquirySchema = new mongoose.Schema(
  {
    candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true, index: true },
    candidateName: { type: String, default: "" },
    candidateEmail: { type: String, default: "", lowercase: true, trim: true },
    candidateMobile: { type: String, default: "" },
    category: { type: String, default: "Other", trim: true },
    subject: { type: String, required: true, trim: true, maxlength: 150 },
    message: { type: String, required: true, trim: true, maxlength: 2000 },
    status: { type: String, enum: ["OPEN", "REPLIED", "CLOSED"], default: "OPEN", index: true },
    replies: { type: [ReplySchema], default: [] },
    // true while the candidate has not yet opened the latest staff reply
    unreadByCandidate: { type: Boolean, default: false },
    repliedAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

EnquirySchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model("Enquiry", EnquirySchema);
