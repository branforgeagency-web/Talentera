/**
 * Career-objective generator for the resume.
 *
 * Objectives are unique across TWO dimensions:
 *   1. Experience level  — fresher | experienced         (from Stage 1)
 *   2. Certification     — certified | pursuing | non-certified  (from Stage 3)
 *   3. Domain / specialty — AR Caller, HCC, CPC, Dental, etc.  (from Stage 2) ← NEW
 *
 * Architecture:
 *  - DOMAIN_PROFILES maps normalized domain keys → { roleTitle, specialty, focusPhrase, softSkill }
 *  - detectDomainProfile() normalizes any raw domain string (Stage 2) to a domain key
 *  - buildContext() merges candidate facts + domain profile into a single context object
 *  - TEMPLATES hold 6 template slots (level × status). Each template function receives `c`
 *    which now includes domain-aware fields so the output is unique per domain.
 */

const clean = (s) => String(s || "").replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").trim();

// ─── Domain Profiles ─────────────────────────────────────────────────────────

/**
 * Each domain profile defines how its role is described in a career objective.
 *
 * roleTitle    — the job title phrase (e.g. "AR Caller", "HCC Coder")
 * specialty    — the coding/billing specialty phrase (e.g. "AR & denial management")
 * focusPhrase  — a domain-specific value proposition used in objective text
 * softSkill    — the key domain skill employers look for
 * industryArea — the broader practice area label
 */
const DOMAIN_PROFILES = {
  ar_caller: {
    roleTitle: "AR Caller",
    specialty: "AR & denial management",
    focusPhrase: "denial-free claim resolution and insurance follow-up",
    softSkill: "payor follow-up and aging bucket management",
    industryArea: "Revenue Cycle Management",
  },
  hcc: {
    roleTitle: "HCC Coder",
    specialty: "HCC risk adjustment coding",
    focusPhrase: "accurate chronic-condition HCC capture for Medicare Advantage risk scores",
    softSkill: "hierarchical condition category mapping and RAF score optimization",
    industryArea: "Risk Adjustment & Value-Based Care",
  },
  cpc: {
    roleTitle: "Outpatient Medical Coder",
    specialty: "outpatient coding (ICD-10-CM / CPT / HCPCS)",
    focusPhrase: "first-pass-accurate outpatient claim coding and compliance",
    softSkill: "CPT/ICD-10 assignment and modifier application",
    industryArea: "Physician Billing & Outpatient RCM",
  },
  inpatient: {
    roleTitle: "Inpatient Coder",
    specialty: "inpatient DRG and facility coding",
    focusPhrase: "precise DRG assignment and UB-04 inpatient facility billing",
    softSkill: "ICD-10-PCS, DRG grouping and CC/MCC optimization",
    industryArea: "Hospital Billing & Inpatient RCM",
  },
  emergency: {
    roleTitle: "Emergency Medicine Coder",
    specialty: "emergency department (ED) coding",
    focusPhrase: "high-volume ED chart coding and E/M level selection accuracy",
    softSkill: "ED E/M leveling and critical care coding",
    industryArea: "Emergency Medicine RCM",
  },
  dental: {
    roleTitle: "Dental Billing Specialist",
    specialty: "dental coding and CDT billing",
    focusPhrase: "accurate CDT code assignment and dental insurance claim submission",
    softSkill: "CDT procedure coding, dental pre-authorization and EOB reconciliation",
    industryArea: "Dental Practice Revenue Cycle",
  },
  radiology: {
    roleTitle: "Radiology Coder",
    specialty: "radiology and diagnostic imaging coding",
    focusPhrase: "precise radiology CPT coding and imaging claim accuracy",
    softSkill: "radiology CPT/ICD-10 assignment and technical vs professional component billing",
    industryArea: "Radiology & Imaging RCM",
  },
  cardiology: {
    roleTitle: "Cardiology Coder",
    specialty: "cardiology and interventional procedure coding",
    focusPhrase: "interventional cardiology CPT coding and cardiac catheterization billing accuracy",
    softSkill: "cardiology CPT coding, device implant billing and bundling rules",
    industryArea: "Cardiology & Interventional RCM",
  },
  oncology: {
    roleTitle: "Oncology Coder",
    specialty: "oncology and chemotherapy administration coding",
    focusPhrase: "accurate chemotherapy administration coding and oncology claim compliance",
    softSkill: "oncology ICD-10/HCPCS coding, drug administration sequencing and revenue code accuracy",
    industryArea: "Oncology & Infusion RCM",
  },
  billing: {
    roleTitle: "Medical Billing Executive",
    specialty: "medical billing (charge entry, payment posting and claims)",
    focusPhrase: "clean-claim submission, accurate charge entry and timely payment posting",
    softSkill: "charge entry, claim scrubbing and payment reconciliation",
    industryArea: "Medical Billing & Revenue Cycle",
  },
  eligibility_verification: {
    roleTitle: "Eligibility & Verification Specialist",
    specialty: "insurance eligibility verification, benefits checks and pre-authorization",
    focusPhrase: "accurate insurance eligibility checks, prior-authorization and benefits verification",
    softSkill: "270/271 transaction processing, payer-specific eligibility portals and pre-auth workflows",
    industryArea: "Eligibility, Verification & Patient Access RCM",
  },
  general: {
    roleTitle: "Medical Coder",
    specialty: "medical coding and healthcare revenue cycle",
    focusPhrase: "accurate ICD-10 / CPT coding and claim compliance",
    softSkill: "medical terminology, anatomy and coding guidelines",
    industryArea: "Healthcare Revenue Cycle Management",
  },
};

/**
 * Normalize any raw domain / course / specialty string from Stage 2 into one of the
 * DOMAIN_PROFILES keys. Falls back to "general" for unrecognised values.
 */
export function detectDomainProfile(rawDomain = "", rawSpecialties = "") {
  const dom = String(rawDomain).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  // The Stage 2 domain the candidate picked decides the role family first.
  if (/accounts?\s*receivable|\bar\b/.test(dom)) return DOMAIN_PROFILES.ar_caller;
  if (/billing/.test(dom)) return DOMAIN_PROFILES.billing;
  if (/front\s*office|patient\s*(access|services)|eligib|verif|pre.?auth|270|271/.test(dom)) return DOMAIN_PROFILES.eligibility_verification;

  // Medical Coding (or anything else) is refined by the specialties they picked.
  return detectBySpecialty(rawSpecialties || rawDomain);
}

function detectBySpecialty(rawDomain = "") {
  const d = String(rawDomain).toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

  if (!d || d === "medical coding") return DOMAIN_PROFILES.general;

  if (/\bar[\s-]?caller\b|account.*receivable|denial|insurance.*follow|insurance.*call/i.test(d))
    return DOMAIN_PROFILES.ar_caller;

  if (/\bhcc\b|risk.?adj|hierarchical.?condition|raf.?score|medicare.?advantage|chronic.?condition/i.test(d))
    return DOMAIN_PROFILES.hcc;

  if (/\bcpc\b|outpatient|physician.?billing|profee|cpcs?\/hcpcs|cpt.*icd|physician.*coder/i.test(d))
    return DOMAIN_PROFILES.cpc;

  if (/inpatient|drg|hospital.?billing|facility.?coding|icd.?10.?pcs|ccs\b|cic\b|ub.?04/i.test(d))
    return DOMAIN_PROFILES.inpatient;

  if (/emergency|emerg.*med|\bem\b|emergency.?dept|\bed\s*coder|\bed\s*coding/i.test(d))
    return DOMAIN_PROFILES.emergency;

  if (/dental|cdt\b|dent.*billing|dent.*cod|oral.?health/i.test(d))
    return DOMAIN_PROFILES.dental;

  if (/radiolog|imaging|diagnostic.?imag|x.?ray|radiology.?cod/i.test(d))
    return DOMAIN_PROFILES.radiology;

  if (/cardiolog|cardiac|cath.?lab|interventional|electrophysiol/i.test(d))
    return DOMAIN_PROFILES.cardiology;

  if (/oncolog|chemoth|infusion|cancer.?cod|hematolog/i.test(d))
    return DOMAIN_PROFILES.oncology;

  return DOMAIN_PROFILES.general;
}

// ─── Cert & experience helpers ────────────────────────────────────────────────

export function getCertStatus(stage3 = {}, certificationsList = []) {
  if (certificationsList.length > 0) return "certified";
  const raw = String(stage3.status || stage3.certType || "").toLowerCase();
  if (raw === "pursuing" || stage3.pursuing === true || stage3.pursuingDetails) return "pursuing";
  if (raw === "certified") return "certified";
  return "non-certified";
}

export function getExperienceLevel(stage1 = {}, candidate = {}) {
  // stage1.experience is the literal "Fresher" / "Experienced" choice from Stage 1 (not a numeric
  // years value), so it must be detected by keyword, not parsed as a number - the same robust,
  // default-to-fresher pattern used elsewhere (Stage2Training.jsx, CandidateResumeSection.jsx).
  const raw = String(stage1.experience ?? candidate.experience ?? "");
  const experienced = /exp/i.test(raw);

  if (!experienced) return { level: "fresher", years: 0 };

  // For experienced candidates, prefer the explicit Stage 2 "Total Experience" range
  // (e.g. "3 – 5 years", "8+ years") collected on the Work Experience section - it's the
  // authoritative, candidate-entered figure. Fall back to parsing stage1.experience itself
  // in case it ever carries a numeric years value.
  // Extract only the FIRST number in the string (not every digit stripped and concatenated) -
  // "3 – 5 years" must read as 3, not "35".
  const firstNumber = (str) => {
    const m = String(str || "").match(/[0-9]+(\.[0-9]+)?/);
    return m ? parseFloat(m[0]) : NaN;
  };
  const stage2 = candidate.stage2 || {};
  const totalExpRaw = String(stage2.totalExperience || "");
  const fromStage2 = firstNumber(totalExpRaw);
  const fromStage1 = firstNumber(raw);
  const years = Number.isFinite(fromStage2) && fromStage2 > 0
    ? fromStage2
    : (Number.isFinite(fromStage1) && fromStage1 > 0 ? fromStage1 : 0);

  return { level: "experienced", years };
}

// ─── Training level (Stage 2) ─────────────────────────────────────────────────

const a = (w) => (/^[aeiou]/i.test(w) ? `an ${w}` : `a ${w}`);
const cap = (w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : w);

/**
 * Maps the Stage 2 training level (Non-Trained / Basic / Intermediate / Advanced / Auditor-QA)
 * to the wording used in the objective.
 */
function levelWording(rawLevel = "", role = "") {
  const l = String(rawLevel).toLowerCase();
  if (/auditor|\bqa\b|quality/.test(l))
    return { key: "qa", adj: "QA-level", trainedIn: "trained for QA and audit in", entry: `${role} / QA associate` };
  if (/advanced/.test(l))
    return { key: "advanced", adj: "advanced-level", trainedIn: "trained at advanced level in", entry: `associate ${role}` };
  if (/intermediate/.test(l))
    return { key: "intermediate", adj: "intermediate-level", trainedIn: "trained at intermediate level in", entry: `junior ${role}` };
  if (/basic/.test(l))
    return { key: "basic", adj: "basic-level", trainedIn: "trained at basic level in", entry: `trainee ${role}` };
  // Non-Trained, blank or unknown
  return { key: "non_trained", adj: "self-taught", trainedIn: "self-taught in", entry: `trainee ${role}` };
}

// ─── Experience tier helper ───────────────────────────────────────────────────

function experienceTierLabel(years) {
  if (!years || years <= 0) return "";
  if (years < 2) return "1-year";
  if (years < 5) return `${Math.floor(years)}-year`;
  return `${Math.floor(years)}+ year`;
}

// ─── Context builder ──────────────────────────────────────────────────────────

function buildContext(p, domainProfile) {
  const dp = domainProfile || DOMAIN_PROFILES.general;
  const years = p.years || 0;
  const yearsText = experienceTierLabel(years);
  const certs = (p.certCodes || []).filter(Boolean).join(" + ");
  const charts = p.totalCharts > 0
    ? `${p.totalCharts} live ${dp.specialty.includes("dental") ? "dental" : ""} charts${p.accuracy ? ` at ${Math.round(p.accuracy)}% accuracy` : ""}`
    : "";
  const nrm = (x) => String(x || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const spNorm = nrm(p.specialties);
  const repeatsRole = !spNorm || spNorm === nrm(p.domain) || nrm(dp.roleTitle).includes(spNorm) || spNorm.includes(nrm(dp.roleTitle));
  const specialty = repeatsRole ? dp.specialty : p.specialties;
  // Freshers are described by the domain they picked; a typed current role is only trusted for experienced candidates.
  const genericRole = /^\s*(fresher|(medical\s*)?(coding|billing)|accounts?\s*receivable|front\s*office)(\s*(professional|specialist))?\s*$/i;
  const role = p.level === "experienced" && p.roleTitle && !genericRole.test(p.roleTitle) ? p.roleTitle : dp.roleTitle;
  const lv = levelWording(p.trainingLevel, role);
  const selfTaught = lv.key === "non_trained";
  const academy0 = p.academyName || "my training academy";
  const score = p.assessmentScore >= 70 ? Math.round(p.assessmentScore) : 0;
  const foundation = score ? `a foundation score of ${score}%` : "";
  const academy = selfTaught ? "self-learning" : academy0;
  const exam = p.pursuingCert ? `${p.pursuingCert}${p.expectedExam ? ` exam (${p.expectedExam})` : " exam"}` : "certification exam";
  const focusPhrase = dp.focusPhrase;
  const softSkill = dp.softSkill;
  const industryArea = dp.industryArea;

  // Experienced-candidate specifics captured on Stage 2's "Your Work Experience" section -
  // used to make the professional summary read as unique/candidate-specific rather than generic.
  const company = clean(p.currentCompany || "");
  const companyClause = company ? ` at ${company}` : "";
  const commaCompanyClause = company ? `, most recently at ${company},` : "";
  const projectDetail = clean(p.projectDetails || "");
  const projectClause = projectDetail ? ` including ${projectDetail}` : "";

  return {
    years,
    yearsText,
    certs,
    charts,
    specialty,
    role,
    lvlRole: `${lv.adj} ${role}`,
    LvlRole: cap(`${lv.adj} ${role}`),
    entryRole: lv.entry,
    aEntry: a(lv.entry),
    trainedIn: lv.trainedIn,
    levelKey: lv.key,
    viaClause: selfTaught ? "" : ` trained at ${academy0}`,
    commaVia: selfTaught ? "" : `, trained at ${academy0}`,
    fromClause: selfTaught ? "" : ` from ${academy0}`,
    learnClause: selfTaught ? " who learns by doing" : ` trained at ${academy0}`,
    foundation,
    score,
    academy,
    exam,
    pursuingCert: p.pursuingCert || "a coding certification",
    focusPhrase,
    softSkill,
    industryArea,
    company,
    companyClause,
    commaCompanyClause,
    projectDetail,
    projectClause,
  };
}

// ─── Templates ────────────────────────────────────────────────────────────────
// 6 slots = 2 levels × 3 cert statuses. Each has 3 primary options + 3 alternates.
// Every template function receives `c` which now includes domain-aware fields.

const TEMPLATES = {
  "fresher_certified": {
    options: [
      {
        tag: "Credential-first · data-forward tone",
        text: (c) => `${c.certs || "Certified"} ${c.role} fresher ${c.trainedIn} ${c.specialty} — seeking an entry-level ${c.industryArea} position where a validated credential and ${c.focusPhrase} translate into day-one production on US healthcare accounts.`,
      },
      {
        tag: "Domain-passion · story tone",
        text: (c) => `Newly ${c.certs || "certified"} ${c.role}${c.viaClause}, eager to turn my credential${c.charts ? ` and ${c.charts}` : ""} into precise, compliant ${c.specialty} as I begin my career in ${c.industryArea}.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `${c.certs || "Certified"} ${c.role} fresher available immediately for ${a("entry-level")} ${c.specialty} role${c.foundation ? `, backed by ${c.foundation}` : ""}, ready for production targets, QA audits and ${c.softSkill}.`,
      },
    ],
    alternates: [
      (c) => `Credentialed ${c.certs || c.role} graduate with a strong ${c.specialty} foundation${c.charts ? `, ${c.charts}` : ""}, looking to join a ${c.industryArea} team that rewards accuracy and steady productivity growth.`,
      (c) => `Fresh ${c.certs || "certified"} ${c.role}${c.fromClause} aiming to contribute ${c.focusPhrase} while growing into higher-complexity work.`,
      (c) => `Detail-oriented ${c.certs || "certified"} ${c.role} fresher seeking an associate position to apply ${c.specialty} knowledge${c.foundation ? ` and ${c.foundation}` : ""} in a high-volume ${c.industryArea} environment.`,
    ],
  },

  "fresher_pursuing": {
    options: [
      {
        tag: "Progress-forward · honest tone",
        text: (c) => `${c.charts ? c.LvlRole : cap(c.role)} fresher preparing for the ${c.exam}${c.charts ? `, already practising with ${c.charts}` : `, ${c.trainedIn} ${c.specialty}`} — seeking ${c.aEntry} role in ${c.industryArea} with structured QA where I can contribute to ${c.focusPhrase} while completing my certification.`,
      },
      {
        tag: "Growth-first · story tone",
        text: (c) => `${c.LvlRole}${c.viaClause}${c.viaClause ? " and" : ""} working towards ${c.pursuingCert}, driven to learn fast${c.score ? ` (${c.score}% foundation score)` : ""} and earn my credential while contributing to real ${c.specialty} work.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `Certification-track ${c.lvlRole} fresher (${c.pursuingCert} in progress) available immediately for ${c.aEntry} position with mentoring, audit feedback and a clear path to ${c.softSkill}.`,
      },
    ],
    alternates: [
      (c) => `Aspiring ${c.pursuingCert} ${c.role} with ${a(c.lvlRole.split(" ")[0])} ${c.specialty} foundation${c.charts ? ` and ${c.charts}` : ""}, seeking a ${c.industryArea} team that supports certification while building production experience.`,
      (c) => `Motivated ${c.lvlRole} fresher currently completing ${c.pursuingCert} preparation, looking to grow into a certified, audit-ready specialist in a ${c.industryArea} environment.`,
      (c) => `${cap(c.entryRole)} on the road to ${c.pursuingCert}${c.commaVia}, ready to learn on live ${c.specialty} work and meet quality benchmarks from day one.`,
    ],
  },

  "fresher_non-certified": {
    options: [
      {
        tag: "Skills-first · proof-led tone",
        text: (c) => `Skills-first ${c.charts ? c.lvlRole : c.role} fresher${c.charts ? ` with ${c.charts}` : `, ${c.trainedIn} ${c.specialty}`}${c.foundation ? ` and ${c.foundation}` : ""} — seeking ${c.aEntry} position where ${c.focusPhrase} and practical accuracy count, with the goal of earning certification on the job.`,
      },
      {
        tag: "Learner-first · story tone",
        text: (c) => `${c.LvlRole}${c.learnClause} — comfortable with ${c.specialty} and ${c.softSkill}, keen to prove value through quality work and continuous upskilling.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `${c.LvlRole} fresher (not yet certified) available immediately for ${c.aEntry} position in ${c.industryArea}; open to certification sponsorship and structured onboarding focused on ${c.softSkill}.`,
      },
    ],
    alternates: [
      (c) => `Hands-on ${c.specialty} ${c.levelKey === "non_trained" ? "learner" : "trainee"}${c.charts ? ` with ${c.charts}` : ""}, seeking an opportunity to start as ${c.aEntry} and work towards a professional certification while contributing to ${c.focusPhrase}.`,
      (c) => `Enthusiastic ${c.lvlRole} fresher${c.foundation ? ` with ${c.foundation}` : ""}, looking for a ${c.industryArea} company that invests in team development and certification sponsorship.`,
      (c) => `Practice-driven ${c.lvlRole}${c.fromClause}, ready to begin as ${c.aEntry} and grow through audits, feedback and mastery of ${c.softSkill}.`,
    ],
  },

  "experienced_certified": {
    options: [
      {
        tag: "Impact-forward · domain-specific tone",
        text: (c) => `${c.yearsText ? `${c.yearsText} experienced ` : "Experienced "}${c.certs || "certified"} ${c.role}${c.companyClause}, with a track record in ${c.specialty}${c.projectClause}${c.charts ? `, ${c.charts} on record` : ""} — seeking a production or senior ${c.role} position where ${c.focusPhrase} and demanding accuracy targets are the norm.`,
      },
      {
        tag: "Leadership-first · story tone",
        text: (c) => `Credentialed ${c.certs || c.role} professional with ${c.years || "several"} years in ${c.specialty}, looking to bring proven ${c.softSkill} expertise to a ${c.industryArea} team where I can also mentor newer coders and drive QA improvements.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `${c.certs || "Certified"} ${c.role} with ${c.years || "several"} years' experience in ${c.specialty}${c.companyClause}; available at short notice for a quality-focused ${c.industryArea} role with increased responsibility and production targets.`,
      },
    ],
    alternates: [
      (c) => `Experienced ${c.certs || "certified"} ${c.role} (${c.years || "multi"} yrs)${c.companyClause}, with a track record in ${c.specialty}${c.projectClause}, seeking a role with greater ownership of ${c.focusPhrase} and audit quality.`,
      (c) => `${c.yearsText || "Seasoned"} ${c.role} holding ${c.certs || "professional certification"}, aiming to lead complex ${c.specialty} work and contribute to ${c.industryArea} team QA and coding accuracy benchmarks.`,
      (c) => `Results-driven ${c.certs || "certified"} ${c.role} with ${c.years || "several"} years of ${c.specialty} experience${c.foundation ? ` and ${c.foundation}` : ""}, ready for a step up in scope, responsibility and ${c.softSkill} leadership.`,
    ],
  },

  "experienced_pursuing": {
    options: [
      {
        tag: "Experience-forward · honest tone",
        text: (c) => `${c.yearsText ? `${c.yearsText} ` : ""}${c.role}${c.companyClause} in ${c.specialty}${c.projectClause}, currently preparing for the ${c.exam} to formalise my experience — seeking a ${c.industryArea} role that values hands-on ${c.focusPhrase}${c.charts ? ` (${c.charts})` : ""} and supports my certification journey.`,
      },
      {
        tag: "Growth-first · story tone",
        text: (c) => `${c.role} with ${c.years || "several"} years of ${c.specialty} experience now working towards ${c.pursuingCert}, looking to combine real-world ${c.softSkill} skills with a recognised credential in ${c.industryArea}.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `Experienced ${c.role} in ${c.specialty} (${c.years || "multi"} yrs), ${c.pursuingCert} in progress — available for a production role in ${c.industryArea} with a clear path to certified status.`,
      },
    ],
    alternates: [
      (c) => `${c.yearsText || "Seasoned"} ${c.specialty} professional finishing ${c.pursuingCert} preparation, seeking a position where experience and an upcoming credential move me into higher-complexity ${c.role} responsibilities.`,
      (c) => `Practising ${c.role} with ${c.years || "several"} years in ${c.specialty}${c.companyClause}, on track for ${c.pursuingCert}, aiming to join a ${c.industryArea} team that values both experience and continued learning.`,
      (c) => `Production-ready ${c.role} with ${c.years || "several"} years of ${c.specialty} expertise and ${c.pursuingCert} underway, keen to take on quality-critical ${c.industryArea} accounts.`,
    ],
  },

  "experienced_non-certified": {
    options: [
      {
        tag: "Experience-forward · proof-led tone",
        text: (c) => `${c.yearsText ? `${c.yearsText} ` : ""}${c.role}${c.companyClause} with hands-on ${c.specialty} experience${c.projectClause}${c.charts ? ` and ${c.charts}` : ""}${c.foundation ? `, ${c.foundation}` : ""} — seeking a production role in ${c.industryArea} where ${c.focusPhrase} matters most, with support to earn a formal certification.`,
      },
      {
        tag: "Practical-first · story tone",
        text: (c) => `${c.role} who learned ${c.specialty} on real accounts over ${c.years || "several"} years, now looking for a ${c.industryArea} employer that recognises practical ${c.softSkill} skill and sponsors a move to a professional credential.`,
      },
      {
        tag: "Concise · outcome-focused",
        text: (c) => `Experienced ${c.role} in ${c.specialty} (${c.years || "multi"} yrs, non-certified) available for immediate joining in ${c.industryArea}; open to certification sponsorship and performance-based evaluation.`,
      },
    ],
    alternates: [
      (c) => `${c.yearsText || "Seasoned"} ${c.specialty} professional with real-world ${c.role} experience${c.charts ? `, ${c.charts}` : ""}, seeking a ${c.industryArea} role that evaluates on ${c.focusPhrase} and offers a path to certification.`,
      (c) => `Hands-on ${c.role} with ${c.years || "several"} years in ${c.specialty}${c.companyClause}, ready to prove quality through audits and to pursue certification with company support in ${c.industryArea}.`,
      (c) => `Practice-proven ${c.role} looking to convert ${c.years || "several"} years of ${c.specialty} experience into a certified, higher-responsibility position in ${c.industryArea}.`,
    ],
  },
};


// ─── AR Caller fresher — fixed, house-approved objective text ─────────────────
// The generic template system above builds AR Caller fresher objectives from live
// candidate fields, but that can surface mismatched or noisy data straight into the
// sentence (e.g. a Medical Coding specialty like "Surgery" or a raw live-chart
// accuracy figure leaking into what is meant to be an A/R Caller objective). For
// AR Caller freshers specifically, use this fixed, reviewed copy instead - clean,
// domain-accurate wording that doesn't depend on any per-candidate field.
const AR_CALLER_FRESHER_OPTIONS = [
  {
    tag: "Skills-First",
    text: "Motivated fresher seeking an entry-level A/R Caller position in the healthcare RCM industry, looking to apply my communication, analytical, and problem-solving skills while developing expertise in insurance follow-up and accounts receivable processes.",
  },
  {
    tag: "Career-Interest First",
    text: "Enthusiastic fresher seeking to begin a career in healthcare RCM as an A/R Caller, with a strong interest in insurance claims, payer communication, and account follow-up, and a willingness to learn and grow within the organization.",
  },
  {
    tag: "Concise, Outcome-Focused",
    text: "Dedicated fresher seeking an entry-level A/R Caller role to build expertise in claim follow-up, payer communication, and accounts receivable management while contributing to the organization's revenue cycle operations.",
  },
];

// A few more in the same plain, jargon-free voice for the "Regenerate" button.
const AR_CALLER_FRESHER_ALTERNATES = [
  "Entry-level A/R Caller candidate eager to apply strong communication and analytical skills to insurance follow-up, denial resolution, and accounts receivable management in a fast-paced RCM environment.",
  "Fresher with a keen interest in medical billing and A/R calling, seeking an opportunity to grow as an insurance follow-up specialist while supporting accurate, timely accounts receivable resolution.",
  "Detail-oriented fresher pursuing an A/R Caller role, ready to contribute strong problem-solving and communication skills to payer follow-up, claims resolution, and revenue cycle support.",
];

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Build career objective options for the resume.
 *
 * @param {object} profile
 *   level, status, years, certCodes[], pursuingCert, expectedExam, totalCharts, accuracy,
 *   specialties (string), roleTitle, academyName, assessmentScore,
 *   domain (string — Stage 2 domain: Medical Coding / Medical Billing / Accounts Receivable / Eligibility & Verification)
 *   trainingLevel (string — Stage 2 level: Non-Trained / Basic / Intermediate / Advanced / Auditor-QA)
 * @returns {{ level, status, domainKey, options: {tag,text}[], alternates: string[] }}
 */
export function buildCareerObjectives(profile = {}) {
  const level = profile.level === "experienced" ? "experienced" : "fresher";
  const status = ["certified", "pursuing", "non-certified"].includes(profile.status)
    ? profile.status
    : "non-certified";

  const domainProfile = detectDomainProfile(profile.domain || "", profile.specialties || "");
  const set = TEMPLATES[`${level}_${status}`];
  const c = buildContext(profile, domainProfile);

  const domainKey = Object.keys(DOMAIN_PROFILES).find((k) => DOMAIN_PROFILES[k] === domainProfile) || "general";

  if (level === "fresher" && domainKey === "ar_caller") {
    return {
      level,
      status,
      domainKey,
      options: AR_CALLER_FRESHER_OPTIONS,
      alternates: AR_CALLER_FRESHER_ALTERNATES,
    };
  }

  return {
    level,
    status,
    domainKey,
    options: set.options.map((o) => ({ tag: o.tag, text: clean(o.text(c)) })),
    alternates: set.alternates.map((fn) => clean(fn(c))),
  };
}

// ─── Legacy detection ─────────────────────────────────────────────────────────

// Objectives written by the earlier one-size-fits-all generator. If a saved objective still
// matches one of these it was never hand-edited, so it is safe to replace with the tailored one.
const LEGACY_AUTO_PATTERNS = [
  /seeking an entry-level healthcare RCM coder role at a growth-stage firm serving US healthcare accounts/i,
  /coder with demonstrated proficiency in .* targeting an entry-level position on a US payer account/i,
  /seeking to apply my .* skillset in a production RCM setting where precision and continuous learning are valued/i,
  /aiming to contribute precision medical coding expertise to high-volume healthcare operations/i,
  /seeking an impactful role with immediate availability/i,
  /eager to join a clinical documentation team/i,
  // Old generic patterns that no longer mention domain
  /entry-level RCM coder role where a validated credential and measured accuracy turn into day-one production/i,
  /Skills-first medical coding fresher.*seeking a trainee coder role where my practical accuracy counts/i,
];

export function isLegacyAutoObjective(text) {
  const t = String(text || "");
  return LEGACY_AUTO_PATTERNS.some((re) => re.test(t));
}
