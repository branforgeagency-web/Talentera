const mongoose = require("mongoose");

// A payment an academy has made (or is reporting) to Talentera. Staff verify it against the
// bank / UPI / cash records before it is marked verified.
const PAYMENT_MODES = ["UPI", "Bank Transfer / NEFT", "Credit Card", "Debit Card", "Cash", "Cheque", "Other"];

const AcademyPaymentSchema = new mongoose.Schema(
  {
    academyId: { type: mongoose.Schema.Types.ObjectId, ref: "Academy", required: true, index: true },
    amount: { type: Number, required: true, min: 1 },
    mode: { type: String, enum: PAYMENT_MODES, required: true },
    purpose: { type: String, default: "", maxlength: 150 },
    paidOn: { type: Date, default: Date.now },
    // Mode-specific reference: UPI txn ID / UTR number / card txn ref / receipt no. / cheque no.
    reference: { type: String, default: "", maxlength: 80 },
    // Cheque: bank name; Other: description of the mode
    detail: { type: String, default: "", maxlength: 120 },
    proofUrl: { type: String, default: "" },
    notes: { type: String, default: "", maxlength: 300 },
    status: { type: String, enum: ["submitted", "verified", "rejected"], default: "submitted" },
  },
  { timestamps: true }
);

module.exports = mongoose.model("AcademyPayment", AcademyPaymentSchema);
module.exports.PAYMENT_MODES = PAYMENT_MODES;
