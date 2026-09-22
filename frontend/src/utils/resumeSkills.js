/**
 * Resume "Skills" chip list and "Declaration" text.
 *
 * Both are generated, not hand-typed by the candidate: Skills is built from the domain and
 * specialties they chose in Stage 2 (plus whether they hold a certification), and Declaration
 * is a fixed, standard resume declaration filled in with the candidate's own name and city.
 * Keep DOMAIN_BASE_SKILLS' keys in sync with the domain ids in Stage2Training.jsx's DOMAINS,
 * and SPECIALTY_SKILLS' keys in sync with its ALL_SPECIALTIES list.
 */

// Skills every candidate in a domain is expected to bring, before any specialty-specific ones.
const DOMAIN_BASE_SKILLS = {
  "Medical Coding": ["ICD-10-CM / CPT / HCPCS Coding", "Medical Terminology & Anatomy", "Chart Audit & Coding Compliance", "EHR/EMR Navigation"],
  "Medical Billing": ["Charge Entry & Claims Submission", "Payment Posting & Reconciliation", "Denial Management", "EOB / ERA Review"],
  "Accounts Receivable": ["Insurance Follow-Up (A/R Calling)", "Denial & Appeals Handling", "Aging Bucket Management", "Payer Communication"],
  "Eligibility & Verification": ["Insurance Eligibility Verification", "Pre-Authorization Processing", "Benefits Verification", "Patient & Payer Communication"],
};

// Extra skill added per Medical Coding specialty the candidate picked in Stage 2.
const SPECIALTY_SKILLS = {
  "E/M": "E/M Level Selection",
  "HCC": "HCC Risk Adjustment Coding",
  "ED": "Emergency Department (ED) Coding",
  "Surgery": "Surgical Procedure Coding",
  "IP-DRG": "Inpatient DRG Coding",
  "Home Health": "Home Health Coding (OASIS)",
  "ObGyn": "OB/GYN Coding",
  "Radiology": "Radiology & Imaging Coding",
  "Pediatrics": "Pediatric Coding",
  "Anesthesia": "Anesthesia Coding",
  "Pathology": "Pathology & Lab Coding",
  "Cardiology": "Cardiology / Cath Lab Coding",
  "Inpatient Coding": "Inpatient Facility Coding",
  "Outpatient Coding": "Outpatient / Pro-Fee Coding",
};

// Filler skills used only to round a short list out to a minimum length - safe to claim for
// any candidate regardless of domain, so they never crowd out the domain-specific ones above.
const GENERIC_SKILLS = [
  "HIPAA Compliance & Data Confidentiality",
  "Attention to Detail & Accuracy",
  "Analytical & Problem-Solving Skills",
  "Verbal & Written Communication",
  "MS Office (Excel, Word)",
  "Time Management",
];

const MIN_SKILLS = 6;
const MAX_SKILLS = 9;

/**
 * @param {object} p
 *   domain (string)         - Stage 2 domain id, e.g. "Accounts Receivable"
 *   specialties (string[])  - Stage 2 specialties array (Medical Coding only)
 *   certified (boolean)     - candidate holds a Stage 3 certification
 * @returns {string[]} skill chips, most relevant first
 */
export function buildResumeSkills({ domain, specialties = [], certified = false } = {}) {
  const base = DOMAIN_BASE_SKILLS[domain] || DOMAIN_BASE_SKILLS["Medical Coding"];
  const specSkills = (Array.isArray(specialties) ? specialties : [])
    .map((s) => SPECIALTY_SKILLS[s])
    .filter(Boolean);

  const ordered = [...base, ...specSkills];
  if (certified) ordered.push("Certified Coding Proficiency");

  const seen = new Set();
  let skills = ordered.filter((s) => {
    if (seen.has(s)) return false;
    seen.add(s);
    return true;
  });

  for (const g of GENERIC_SKILLS) {
    if (skills.length >= MIN_SKILLS) break;
    if (!skills.includes(g)) skills.push(g);
  }

  return skills.slice(0, MAX_SKILLS);
}

/**
 * Standard resume declaration paragraph, filled in with the candidate's own name and city.
 * @param {object} p  fullName (string), city (string, optional)
 */
export function buildDeclarationText({ fullName, city } = {}) {
  const name = (fullName || "the undersigned").trim();
  return `I, ${name}, hereby declare that the information furnished above is true, complete, and accurate to the best of my knowledge and belief. I understand that any discrepancy found at any stage of the verification or hiring process may lead to disqualification.`;
}
