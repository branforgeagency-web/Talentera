// One Aadhaar = one Talentera account.
//
// We only ever store the masked number (last 4 digits), and last-4 alone
// collides between unrelated people, so a duplicate is declared only when an
// ALREADY-VERIFIED account has the same last-4 AND the same date of birth
// (and the same name, when both sides have one). That is what UIDAI returns
// for the same person, whatever mobile / email the second account used.
const Candidate = require("../models/Candidate");

const digits = (v) => String(v || "").replace(/\D/g, "");
const normName = (v) => String(v || "").toLowerCase().replace(/[^a-z]/g, "");

async function findDuplicateAadhaarAccount(candidateId, { maskedAadhaar, dob, fullName } = {}) {
  const last4 = digits(maskedAadhaar).slice(-4);
  const dobKey = digits(dob);
  if (last4.length !== 4 || dobKey.length < 6) return null; // not enough data to match safely

  const others = await Candidate.find({
    _id: { $ne: candidateId },
    "stage1.aadhaarVerified": true,
    "stage1.maskedAadhaar": new RegExp(`${last4}$`),
  })
    .select("email stage1.dob stage1.fullName")
    .lean();

  const nameKey = normName(fullName);
  return (
    others.find((o) => {
      if (digits(o.stage1?.dob) !== dobKey) return false;
      const otherName = normName(o.stage1?.fullName);
      return !nameKey || !otherName || nameKey === otherName;
    }) || null
  );
}

function maskEmail(email) {
  const [u = "", d = ""] = String(email || "").split("@");
  if (!d) return "";
  return `${u.slice(0, 2)}${"*".repeat(Math.max(1, u.length - 2))}@${d}`;
}

function duplicateAadhaarResponse(existing) {
  const hint = maskEmail(existing?.email);
  return {
    code: "AADHAAR_ALREADY_REGISTERED",
    message: `This Aadhaar is already verified on another Talentera account${hint ? ` (${hint})` : ""}. One Aadhaar can be used for only one account - please log in with that account instead.`,
  };
}

module.exports = { findDuplicateAadhaarAccount, duplicateAadhaarResponse };
