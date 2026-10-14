import { COMPANY_SPECIALTIES } from "./companySpecialties.js";

// Departments with the specialties / processes that belong under each one.
// Built from the flat company process list: every specialty goes to the first matching department.
const RULES = [
  ["HCC & Risk Adjustment", /hcc|risk/i],
  ["CDI & Documentation", /\bcdi\b|documentation|scrib|transcri|pre-charting/i],
  ["Training & Placement", /\btrain|placement|recruit|staffing|talent/i],
  ["Medical Coding", /cod(ing|er)|drg|e\/m|^ed$|radiology|surgery|surgical|oncology|pathology|cpc|cardio|gastro|inpatient|^op\b/i],
  ["Eligibility & Verification", /eligib|^ev\b|^ev\/|verification|authoriz|prior auth|patient access|insurance calling/i],
  ["Denial Management", /denial|appeal/i],
  ["AR Calling", /\bar\b|accounts receivable|follow-up|collections|calling|insurance follow/i],
  ["Quality & Compliance", /\bqa\b|audit|compliance|quality|contraindication/i],
  ["Analytics", /analy/i],
  ["Medical Billing", /billing|charge|claim|payment|cash-posting|revenue|rcm|practice management|provider|end-to-end/i],
];
const OTHER_DEPT = "Operations, IT & Support";

// Headline names that must always sit at the top of the department list (as in the old flat list).
const HEADLINE = ["Medical Coding", "Medical Billing", "AR Calling"];

const groups = new Map([...RULES.map(([n]) => [n, []]), [OTHER_DEPT, []]]);
COMPANY_SPECIALTIES.forEach((spec) => {
  if (groups.has(spec)) return; // the department itself, not a specialty
  const hit = RULES.find(([, re]) => re.test(spec));
  groups.get(hit ? hit[0] : OTHER_DEPT).push(spec);
});

const order = [...HEADLINE, ...[...groups.keys()].filter((n) => !HEADLINE.includes(n))];
export const COMPANY_DEPT_GROUPS = order.map((name) => ({ name, specialties: groups.get(name) }));
export const COMPANY_DEPT_NAMES = COMPANY_DEPT_GROUPS.map((g) => g.name);
