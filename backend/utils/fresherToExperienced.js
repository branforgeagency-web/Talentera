/**
 * One account, two profiles (Fresher + Experienced) under the same e-mail.
 *
 * A candidate who registered (and maybe got hired) as a Fresher can later register again with the same
 * e-mail as Experienced. We keep ONE Candidate record: the fresher data is archived untouched in
 * `fresherArchive`, the account switches to the Experienced dashboard, and every Career Passport field we can
 * work out from the fresher data is pre-filled as a DRAFT (nothing is marked complete, the person reviews
 * and saves each stage). Existing experienced answers are never overwritten.
 *
 * Deliberately NOT copied: ID verification flags / masked Aadhaar (must be re-verified server-side) and uploaded
 * files (passport uploads must be server-issued references).
 */
const PlacementConfirmation = require("../models/PlacementConfirmation");

const s = (v) => (v === undefined || v === null ? "" : String(v).trim());
const MONTHS = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const pad = (n) => String(n).padStart(2, "0");

function toIsoDate(v) {
  const t = s(v);
  if (!t) return "";
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(t); // dd/mm/yyyy (Aadhaar style)
  if (m) return `${m[3]}-${pad(m[2])}-${pad(m[1])}`;
  m = /^(\d{1,2})[/-](\d{4})$/.exec(t); // mm/yyyy
  if (m) return `${m[2]}-${pad(m[1])}-01`;
  m = /^(\d{4})$/.exec(t);
  if (m) return `${m[1]}-01-01`;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}
function monthYearToIso(month, year) {
  const y = s(year);
  if (!/^\d{4}$/.test(y)) return "";
  let mm = s(month);
  if (/^[a-z]{3}/i.test(mm)) mm = String(MONTHS[mm.slice(0, 3).toLowerCase()] || "");
  const mn = Number(mm);
  return `${y}-${pad(mn >= 1 && mn <= 12 ? mn : 1)}-01`;
}
const pick = (v, options) => options.find((o) => o.toLowerCase() === s(v).toLowerCase()) || "";
const digits10 = (v) => s(v).replace(/\D/g, "").slice(-10);

function qualificationLevel(...texts) {
  const t = texts.map(s).join(" ").toLowerCase();
  if (!t.trim()) return "";
  if (/ph\.?d|doctor/.test(t)) return "Doctorate";
  if (/diploma/.test(t)) return "Diploma";
  if (/\bm\.?\s?(sc|pharm|tech|com|a|b\.?a|ba|ca)\b|master|post\s?grad|\bpg\b/.test(t)) return "PG";
  if (/\bb\.?\s?(sc|pharm|tech|e|com|a|ba|ds|ca|ed)\b|bachelor|under\s?grad|\bug\b|\bbds\b|\bmbbs\b|nursing|degree/.test(t)) return "UG";
  return "";
}

const CAREER_CATEGORIES = ["Medical Coding", "Medical Billing", "AR", "Denial Management", "Payment Posting", "Charge Entry", "HCC / Risk Adjustment", "Prior Authorization", "Eligibility Verification", "Credentialing", "QA / Audit", "Training"];
function careerCategory(...texts) {
  const t = texts.map(s).join(" ").toLowerCase();
  if (!t.trim()) return "";
  const hit = CAREER_CATEGORIES.find((c) => t.includes(c.toLowerCase()));
  if (hit) return hit;
  if (/\bar\b|accounts receivable|ar cal/.test(t)) return "AR";
  if (/cod(ing|er)/.test(t)) return "Medical Coding";
  if (/billing/.test(t)) return "Medical Billing";
  return "";
}
function trainingMode(v) {
  const t = s(v).toLowerCase();
  if (!t) return "";
  if (/hybrid|blend/.test(t)) return "Hybrid";
  if (/online|virtual|live/.test(t)) return "Online";
  if (/class|offline|on-?site|campus|in-?person/.test(t)) return "Classroom";
  if (/self/.test(t)) return "Self-learning";
  return "";
}
function certStatus(expiryIso, hasIssue) {
  if (!hasIssue) return "";
  if (expiryIso && new Date(expiryIso) < new Date()) return "Expired";
  return "Active";
}

/** Merge `src` into `target` without overwriting anything already filled; drops empty values. */
function fill(target, src) {
  const out = { ...(target || {}) };
  Object.entries(src).forEach(([k, v]) => {
    const empty = out[k] === undefined || out[k] === null || out[k] === "" || (Array.isArray(out[k]) && !out[k].length);
    if (empty && v !== undefined && v !== null && v !== "" && !(Array.isArray(v) && !v.length)) out[k] = v;
  });
  return out;
}
const countFilled = (o) => Object.values(o || {}).filter((v) => v !== "" && v !== undefined && v !== null && !(Array.isArray(v) && !v.length)).length;

/** Builds the draft passport stages from a candidate's fresher data (+ confirmed placements). */
function buildPrefill(candidate, placements = []) {
  const f1 = candidate.stage1 || {};
  const f2 = candidate.stage2 || {};
  const f3 = candidate.stage3 || {};
  const out = { 1: {}, 2: {}, 3: {}, 6: {}, 7: {} };

  // ---- Stage 1: identity + career status
  const personal = {
    fullName: s(f1.fullName),
    dateOfBirth: toIsoDate(f1.dob),
    gender: pick(f1.gender, ["Male", "Female", "Prefer not to say", "Other"]),
    mobileNumber: digits10(f1.mobile || candidate.mobile),
    email: s(f1.email || candidate.email),
    whatsappNumber: f1.isWhatsAppSame ? "" : digits10(f1.whatsappNumber),
  };
  const placed = placements.find((p) => p.status === "confirmed") || placements[0] || null;
  const cities = (Array.isArray(f1.preferredCities) ? f1.preferredCities : []).map(s).filter(Boolean);
  const career = {
    currentEmploymentStatus: placed ? "Currently Employed" : "",
    currentCompany: s(placed?.companyName),
    currentDesignation: s(placed?.role),
    primaryCareerCategory: careerCategory(f2.course, f2.courseName, f1.currentRole, placed?.role),
    preferredWorkLocation: cities.join(", "),
  };
  out[1]["personal-contact"] = personal;
  out[1]["current-career-status"] = career;

  // ---- Stage 2: education + academy training
  const education = {
    highestQualification: qualificationLevel(f1.qualification, f1.degree, f1.educationStream),
    degreeCourse: s(f1.degree),
    specialization: s(f1.educationStream),
    collegeName: s(f1.collegeName),
    yearOfPassing: /^\d{4}$/.test(s(f1.graduationYear)) ? s(f1.graduationYear) : "",
    percentageCgpa: s(f1.cgpa || f1.percentage),
  };
  out[2].education = education;
  const academy = s(f2.academyName);
  if (f2.isNonTrained) {
    out[2]["training-applicability"] = { attendedAcademyTraining: "Not Applicable" };
  } else if (academy) {
    out[2]["training-applicability"] = { attendedAcademyTraining: "Yes" };
    out[2]["training-academy-history"] = [{
      academyTrainingProvider: academy,
      branchLocation: s(f2.academyBranch || f2.academyLocation),
      courseName: s(f2.courseName),
      primaryDomain: s(f2.course),
      trainingMode: trainingMode(f2.modeOfTraining || f2.trainingPath),
      courseStartDate: monthYearToIso(f2.startMonth, f2.startYear) || toIsoDate(f2.startDate),
      courseCompletionDate: monthYearToIso(f2.endMonth, f2.endYear) || toIsoDate(f2.endDate),
      trainingDuration: s(f2.totalHours || f2.duration),
    }];
  }

  // ---- Stage 3: employment (hired through Talentera / academy placement)
  const timeline = placements.filter((p) => p.status === "confirmed").map((p) => ({
    companyName: s(p.companyName),
    companyLocation: s(p.city),
    designation: s(p.role),
    employmentType: "Full-time",
    dateOfJoining: toIsoDate(p.placedDate),
    currentlyWorkingHere: "Yes",
  })).filter((e) => e.companyName);
  if (timeline.length) out[3]["current-previous-employment-entry"] = timeline;

  // ---- Stage 6: certifications
  const certs = (Array.isArray(f3.certifications) ? f3.certifications : [])
    .filter((c) => s(c.name || c.certName || c.code))
    .map((c) => {
      const issue = monthYearToIso(c.issueMonth, c.issueYear) || toIsoDate(c.issueDate);
      const expiry = monthYearToIso(c.expiryMonth, c.expiryYear) || toIsoDate(c.expiryDate);
      return {
        certificationCode: s(c.code),
        certificationName: s(c.name || c.certName),
        issuingOrganization: pick(c.body, ["AAPC", "AHIMA", "HIMAA", "Specialty", "HFMA", "AAHAM", "NHA", "AMBA", "NAHAM", "NAMSS", "IACMC", "AAPC (KSA specific)"]),
        certificationId: s(c.memberId || c.certId),
        issueDate: issue,
        expiryDate: expiry,
        noExpiry: issue && !expiry ? "Yes" : "",
        certificationStatus: certStatus(expiry, Boolean(issue)),
        credentialUrl: s(c.certUrl),
      };
    });
  if (certs.length) out[6]["add-certification"] = certs;

  // ---- Stage 7: what next
  out[7]["future-career-preferences"] = {
    preferredLocation: cities.join(", "),
  };

  return out;
}

/** Applies buildPrefill to candidate.experienced as drafts. Returns how many fields were filled. */
function applyFresherPrefill(candidate, placements = []) {
  const px = candidate.experienced || { stages: {}, completed: [], uploads: [] };
  const built = buildPrefill(candidate, placements);
  const stages = { ...(px.stages || {}) };
  let filled = 0;
  Object.entries(built).forEach(([n, sections]) => {
    const cur = { ...(stages[n] || {}) };
    Object.entries(sections).forEach(([sec, val]) => {
      if (Array.isArray(val)) {
        if (!(Array.isArray(cur[sec]) && cur[sec].length)) { cur[sec] = val; filled += val.reduce((a, r) => a + countFilled(r), 0); }
      } else {
        const merged = fill(cur[sec], val);
        filled += countFilled(merged) - countFilled(cur[sec]);
        cur[sec] = merged;
      }
    });
    if (Object.keys(cur).length) stages[n] = cur;
  });
  candidate.experienced = { ...px, stages, completed: px.completed || [], uploads: px.uploads || [], prefilledFromFresher: true, prefilledAt: new Date().toISOString() };
  candidate.markModified("experienced");
  return filled;
}

async function loadPlacements(candidate) {
  try {
    return await PlacementConfirmation.find({ candidateId: candidate._id }).sort({ placedDate: -1 }).lean();
  } catch (_e) {
    return [];
  }
}

const LIVE_KEYS = ["stage1", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7", "stage8", "manualResume", "documentVault", "completedStages"];
const EMPTY_LIVE = { documentVault: [], completedStages: [] };

const activeType = (candidate) => (candidate.toJSON ? candidate.toJSON().candidateType : candidate.candidateType) || "fresher";
const typesOf = (candidate) => {
  const t = Array.isArray(candidate.candidateTypes) ? candidate.candidateTypes.filter(Boolean) : [];
  return t.length ? t : [activeType(candidate)];
};

/** Copy of the profile data the rest of the system reads from the top-level candidate fields. */
function snapshotLive(candidate) {
  const snap = { snapshotAt: new Date().toISOString() };
  LIVE_KEYS.forEach((k) => { snap[k] = candidate[k] === undefined ? (EMPTY_LIVE[k] ?? null) : candidate[k]; });
  return JSON.parse(JSON.stringify(snap));
}
function loadLive(candidate, snap) {
  LIVE_KEYS.forEach((k) => {
    candidate[k] = snap && snap[k] !== undefined ? snap[k] : (EMPTY_LIVE[k] ?? null);
    candidate.markModified(k);
  });
}
function stash(candidate, type) {
  candidate.profiles = { ...(candidate.profiles || {}), [type]: snapshotLive(candidate) };
  candidate.markModified("profiles");
}

/**
 * Adds a second profile (fresher <-> experienced) to the SAME account. The profile being left is stashed in
 * `profiles[type]`, the new one becomes active. Adding Experienced to a Fresher is pre-filled from the fresher data.
 * Returns { added, prefilledFields }.
 */
async function addProfile(candidate, type) {
  if (!["fresher", "experienced"].includes(type)) throw new Error("Invalid profile type.");
  const types = typesOf(candidate);
  if (types.includes(type)) return { added: false, prefilledFields: 0 };
  const current = activeType(candidate);
  let prefilledFields = 0;
  if (type === "experienced") prefilledFields = applyFresherPrefill(candidate, await loadPlacements(candidate)); // reads live fresher data
  stash(candidate, current);
  candidate.candidateTypes = [...types, type];
  candidate.candidateType = type;
  loadLive(candidate, null);
  if (type === "experienced") require("./experiencedPassport").syncLegacy(candidate); // mirror the pre-filled draft into the live fields
  return { added: true, prefilledFields };
}

/** Makes an existing profile the active one (live fields are swapped with the stashed copy). */
function switchProfile(candidate, type) {
  const types = typesOf(candidate);
  if (!types.includes(type)) throw new Error("This account does not have that profile.");
  const current = activeType(candidate);
  if (current === type) return false;
  stash(candidate, current);
  loadLive(candidate, (candidate.profiles || {})[type]);
  candidate.candidateType = type;
  if (!Array.isArray(candidate.candidateTypes) || !candidate.candidateTypes.length) candidate.candidateTypes = types;
  return true;
}

module.exports = { buildPrefill, applyFresherPrefill, addProfile, switchProfile, loadPlacements, toIsoDate, activeType, typesOf };
