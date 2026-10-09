const mongoose = require("mongoose");

// A MoU an academy has with a college (campus tie-up for training / placements).
const MOU_STATUSES = ["Under Discussion", "Signed", "Active", "Expired"];

const AcademyMouSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    collegeName: { type: String, required: true, trim: true, maxlength: 150 },
    city: { type: String, default: "", trim: true, maxlength: 80 },
    contactPerson: { type: String, default: "", trim: true, maxlength: 100 },
    phone: { type: String, default: "", trim: true, maxlength: 20 },
    email: { type: String, default: "", trim: true, lowercase: true, maxlength: 120 },
    status: { type: String, enum: MOU_STATUSES, default: "Under Discussion" },
    signedOn: { type: Date, default: null },
    validUntil: { type: Date, default: null },
    studentsCovered: { type: Number, default: 0, min: 0 },
    scope: { type: String, default: "", maxlength: 300 },
    documentUrl: { type: String, default: "" },
    documentName: { type: String, default: "", maxlength: 150 },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademyMou", AcademyMouSchema);
module.exports.MOU_STATUSES = MOU_STATUSES;
