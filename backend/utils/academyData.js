/**
 * Helpers that keep demo/seed content out of what staff, candidates and
 * companies see for an academy. Older academy records were auto-filled with
 * six sample courses, six sample questions and a default branch list; only
 * what the academy itself entered (KYC form / Courses page) is real.
 */
const SEED_COURSES = {
  "HCC Coding Specialization": "ICD-10-CM Basics|RAF Score Calculation|Documentation Review|HCC Chart Audits|Capstone",
  "ED Coding Foundation": "ED Levels & E/M|Critical Care|Modifier 25 / 59|Trauma Cases|Capstone",
  "AR Calling Bootcamp": "Denial Codes|Payer Workflows|Communication|Compliance|Live Floor",
  "Surgery Coding Mastery": "CPT Surgery Sections|Modifiers (50/51/59)|Global Period|Multi-Procedure|Capstone",
  "OP / E&M Specialization": "E&M Levels|MDM Complexity|Time-Based Coding|2021 Guidelines|Capstone",
  "IP DRG Specialization": "MS-DRG vs APR-DRG|POA Indicators|CC/MCC Logic|Audit Scenarios|Capstone",
};
const SEED_QUESTION_PREFIXES = [
  "HCC Risk Adjustment Factor (RAF) score is primarily used to",
  "Which ICD-10-CM code captures Type 2 Diabetes with diabetic peripheral neuropathy",
  "Scenario: A 67-year-old patient is documented with CKD Stage 4",
  "CMS-HCC v24 risk model uses how many diagnosis groups",
  "Which of the following requires",
  "Documentation states",
];
const MOCK_BRANCHES = ["Coimbatore", "Chennai", "Hyderabad", "Vizag"];

const isSeedCourse = (c) =>
  !!c && SEED_COURSES[c.title] !== undefined && (c.syllabus || []).join("|") === SEED_COURSES[c.title];

const isSeedQuestion = (q) =>
  !!q && SEED_QUESTION_PREFIXES.some((p) => String(q.question || "").startsWith(p)) && q.courseTitle === "HCC Coding Specialization";

const stripSeedCourses = (courses) => (courses || []).filter((c) => !isSeedCourse(c));
const stripSeedQuestions = (questions) => (questions || []).filter((q) => !isSeedQuestion(q));

// Branch names the academy really entered (KYC form), never the old default list.
function realBranches(ac) {
  const kd = (ac && ac.kycData) || {};
  const fromKyc = (Array.isArray(kd.branches) ? kd.branches : [])
    .map((b) => [b && b.name, b && b.city].filter(Boolean).join(" · "))
    .filter(Boolean);
  if (fromKyc.length) return fromKyc;
  const stored = Array.isArray(ac && ac.branches) ? ac.branches : [];
  const isMock = stored.length === MOCK_BRANCHES.length && stored.every((b, i) => b === MOCK_BRANCHES[i]);
  return isMock ? [] : stored;
}

module.exports = { stripSeedCourses, stripSeedQuestions, isSeedCourse, isSeedQuestion, realBranches, MOCK_BRANCHES };
