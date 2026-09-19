/**
 * Career-objective generator for the resume.
 *
 * The wording changes with two things from the candidate's profile:
 *   level  - fresher | experienced           (Stage 1 experience)
 *   status - certified | pursuing | non-certified   (Stage 3 certification status)
 * giving six distinct sets of objectives, each with 3 tones (options) and 3 alternates
 * (used by the "regenerate" button). Only facts the candidate actually has are mentioned.
 */

const clean = (s) => String(s || "").replace(/\s+/g, " ").replace(/\s+([.,;])/g, "$1").trim();

export function getCertStatus(stage3 = {}, certificationsList = []) {
  if (certificationsList.length > 0) return "certified";
  const raw = String(stage3.status || stage3.certType || "").toLowerCase();
  if (raw === "pursuing" || stage3.pursuing === true || stage3.pursuingDetails) return "pursuing";
  if (raw === "certified") return "certified";
  return "non-certified";
}

export function getExperienceLevel(stage1 = {}, candidate = {}) {
  const raw = stage1.experience ?? candidate.experience ?? "";
  const years = parseFloat(String(raw).replace(/[^0-9.]/g, ""));
  const experienced = Number.isFinite(years) && years > 0;
  return { level: experienced ? "experienced" : "fresher", years: experienced ? years : 0 };
}

function buildContext(p) {
  const years = p.years || 0;
  const yearsText = years ? `${years}-year` : "";
  const certs = (p.certCodes || []).filter(Boolean).join(" + ");
  const charts = p.totalCharts > 0 ? `${p.totalCharts} live charts${p.accuracy ? ` at ${Math.round(p.accuracy)}% accuracy` : ""}` : "";
  const specialty = p.specialties || "medical coding";
  const role = p.roleTitle && !/^fresher$/i.test(p.roleTitle) ? p.roleTitle : "medical coder";
  const score = p.assessmentScore >= 70 ? Math.round(p.assessmentScore) : 0;
  const foundation = score ? `a foundation score of ${score}%` : "";
  const academy = p.academyName || "my training academy";
  const exam = p.pursuingCert ? `${p.pursuingCert}${p.expectedExam ? ` exam (${p.expectedExam})` : " exam"}` : "certification exam";
  return { years, yearsText, certs, charts, specialty, role, foundation, score, academy, exam, pursuingCert: p.pursuingCert || "a coding certification" };
}

const TEMPLATES = {
  "fresher_certified": {
    options: [
      { tag: "Data-forward · US-facing tone", text: (c) => `${c.certs || "Certified"}-credentialed fresher with ${c.charts || `hands-on training in ${c.specialty}`} — seeking an entry-level RCM coder role where a validated credential and measured accuracy turn into day-one production on US healthcare accounts.` },
      { tag: "Passion-first · story tone", text: (c) => `Newly certified ${c.certs || "medical"} coder trained at ${c.academy}, eager to turn my credential${c.charts ? ` and ${c.charts}` : ""} into precise, compliant coding as I start my career in ${c.specialty}.` },
      { tag: "Concise · outcome-focused", text: (c) => `${c.certs || "Certified"} fresher available immediately for an entry-level ${c.specialty} coding role${c.foundation ? `, backed by ${c.foundation}` : ""} and ready for production targets, QA audits and shift flexibility.` },
    ],
    alternates: [
      (c) => `Credentialed ${c.certs || "coding"} graduate with a strong ${c.specialty} foundation${c.charts ? `, ${c.charts}` : ""}, looking to join a coding team that rewards accuracy and steady productivity growth.`,
      (c) => `Fresh ${c.certs || "certified"} coder from ${c.academy} aiming to contribute clean, first-pass-accurate coding in ${c.specialty} while growing into higher-complexity charts.`,
      (c) => `Detail-oriented ${c.certs || "certified"} fresher seeking an associate coder position to apply ${c.specialty} knowledge${c.foundation ? ` and ${c.foundation}` : ""} in a high-volume RCM environment.`,
    ],
  },
  "fresher_pursuing": {
    options: [
      { tag: "Progress-forward · honest tone", text: (c) => `Medical coding fresher preparing for the ${c.exam}${c.charts ? `, already practising with ${c.charts}` : `, trained in ${c.specialty}`} — seeking a trainee or associate coder role with structured QA where I can code under guidance while I complete certification.` },
      { tag: "Growth-first · story tone", text: (c) => `${c.academy}-trained coder working towards ${c.pursuingCert}, driven to learn fast${c.score ? ` (${c.score}% foundation score)` : ""} and earn my credential while contributing to real ${c.specialty} coding work.` },
      { tag: "Concise · outcome-focused", text: (c) => `Certification-track fresher (${c.pursuingCert} in progress) available immediately for an entry-level ${c.specialty} coding position with mentoring and audit feedback.` },
    ],
    alternates: [
      (c) => `Aspiring ${c.pursuingCert} coder with a solid ${c.specialty} foundation${c.charts ? ` and ${c.charts}` : ""}, seeking a team that supports certification while building production experience.`,
      (c) => `Motivated fresher currently completing ${c.pursuingCert} preparation, looking to grow into a certified, audit-ready coder in a supportive RCM team.`,
      (c) => `Coding trainee from ${c.academy} on the road to ${c.pursuingCert}, ready to learn on live ${c.specialty} charts and meet quality benchmarks from the start.`,
    ],
  },
  "fresher_non-certified": {
    options: [
      { tag: "Skills-first · proof-led tone", text: (c) => `Skills-first medical coding fresher${c.charts ? ` with ${c.charts}` : ` trained in ${c.specialty}`}${c.foundation ? ` and ${c.foundation}` : ""} — seeking a trainee coder role where my practical accuracy counts, with the goal of earning certification on the job.` },
      { tag: "Learner-first · story tone", text: (c) => `Coder-in-training from ${c.academy} who learns by doing — comfortable with ${c.specialty} and keen to prove myself through quality work and continuous upskilling.` },
      { tag: "Concise · outcome-focused", text: (c) => `Trained ${c.specialty} fresher (not yet certified) available immediately for a trainee coder position; open to certification sponsorship and structured onboarding.` },
    ],
    alternates: [
      (c) => `Hands-on ${c.specialty} trainee${c.charts ? ` with ${c.charts}` : ""}, seeking an opportunity to start as a junior coder and work towards a professional certification.`,
      (c) => `Enthusiastic fresher with practical ${c.specialty} training${c.foundation ? ` and ${c.foundation}` : ""}, looking for a company that invests in coder development and certification.`,
      (c) => `Practice-driven medical coding graduate of ${c.academy} ready to begin as a trainee coder and grow through audits, feedback and certification.`,
    ],
  },
  "experienced_certified": {
    options: [
      { tag: "Impact-forward · US-facing tone", text: (c) => `${c.yearsText} ${c.certs || "certified"} ${c.role} experienced in ${c.specialty}${c.charts ? `, with ${c.charts} on record` : ""} — seeking a production or senior coder role handling higher-complexity charts against demanding accuracy and turnaround targets.` },
      { tag: "Leadership-first · story tone", text: (c) => `Credentialed ${c.certs || "coding"} professional with ${c.years || "several"} years in ${c.specialty}, looking to bring proven accuracy and audit discipline to a team where I can also mentor newer coders.` },
      { tag: "Concise · outcome-focused", text: (c) => `${c.certs || "Certified"} coder with ${c.years || "several"} years' experience in ${c.specialty}; available to move into a quality-focused role on a US payer account at short notice.` },
    ],
    alternates: [
      (c) => `Experienced ${c.certs || "certified"} coder (${c.years || "multi"} yrs) with a track record in ${c.specialty}, seeking a role with greater ownership of quality, denials prevention and coding accuracy.`,
      (c) => `${c.yearsText} ${c.role} holding ${c.certs || "professional certification"}, aiming to lead complex ${c.specialty} coding work and contribute to team QA.`,
      (c) => `Results-driven ${c.certs || "certified"} coder with ${c.years || "several"} years of ${c.specialty} experience${c.foundation ? ` and ${c.foundation}` : ""}, ready for a step up in scope and responsibility.`,
    ],
  },
  "experienced_pursuing": {
    options: [
      { tag: "Experience-forward · honest tone", text: (c) => `${c.yearsText} ${c.role} in ${c.specialty}, currently preparing for the ${c.exam} to formalise my experience — seeking a role that values hands-on accuracy${c.charts ? ` (${c.charts})` : ""} and supports my certification.` },
      { tag: "Growth-first · story tone", text: (c) => `Coder with ${c.years || "several"} years of ${c.specialty} experience now working towards ${c.pursuingCert}, looking to combine real-world production skills with a recognised credential.` },
      { tag: "Concise · outcome-focused", text: (c) => `Experienced ${c.specialty} coder (${c.years || "multi"} yrs), ${c.pursuingCert} in progress — available for a production role with a clear path to certified status.` },
    ],
    alternates: [
      (c) => `${c.yearsText} coding professional finishing ${c.pursuingCert} preparation, seeking a position where experience and upcoming certification move me into higher-complexity ${c.specialty} work.`,
      (c) => `Practising ${c.role} with ${c.years || "several"} years in ${c.specialty}, on track for ${c.pursuingCert}, aiming to join a team that recognises both experience and continued learning.`,
      (c) => `Production-ready ${c.specialty} coder with ${c.years || "several"} years' experience and ${c.pursuingCert} underway, keen to take on quality-critical coding accounts.`,
    ],
  },
  "experienced_non-certified": {
    options: [
      { tag: "Experience-forward · proof-led tone", text: (c) => `${c.yearsText} ${c.role} with hands-on ${c.specialty} experience${c.charts ? ` and ${c.charts}` : ""}${c.foundation ? `, ${c.foundation}` : ""} — seeking a production role where proven accuracy matters, with support to earn a formal certification.` },
      { tag: "Practical-first · story tone", text: (c) => `Coder who learned on live ${c.specialty} work over ${c.years || "several"} years, now looking for an employer that recognises practical skill and sponsors my move to a professional credential.` },
      { tag: "Concise · outcome-focused", text: (c) => `Experienced ${c.specialty} coder (${c.years || "multi"} yrs, non-certified) available for immediate joining; open to certification sponsorship and performance-based evaluation.` },
    ],
    alternates: [
      (c) => `${c.yearsText} ${c.specialty} professional with real-world coding experience${c.charts ? `, ${c.charts}` : ""}, seeking a role that evaluates on accuracy and offers a path to certification.`,
      (c) => `Hands-on coder with ${c.years || "several"} years in ${c.specialty}, ready to prove quality through audits and to pursue certification with company support.`,
      (c) => `Practice-proven ${c.role} looking to convert ${c.years || "several"} years of ${c.specialty} experience into a certified, higher-responsibility coding position.`,
    ],
  },
};

/**
 * @param {object} profile
 *   level, status, years, certCodes[], pursuingCert, expectedExam, totalCharts, accuracy,
 *   specialties (string), roleTitle, academyName, assessmentScore
 * @returns {{ level, status, options: {tag,text}[], alternates: string[] }}
 */
export function buildCareerObjectives(profile = {}) {
  const level = profile.level === "experienced" ? "experienced" : "fresher";
  const status = ["certified", "pursuing", "non-certified"].includes(profile.status) ? profile.status : "non-certified";
  const set = TEMPLATES[`${level}_${status}`];
  const c = buildContext(profile);
  return {
    level,
    status,
    options: set.options.map((o) => ({ tag: o.tag, text: clean(o.text(c)) })),
    alternates: set.alternates.map((fn) => clean(fn(c))),
  };
}

// Objectives written by the earlier one-size-fits-all generator. If a saved objective still
// matches one of these it was never hand-edited, so it is safe to replace with the tailored one.
const LEGACY_AUTO_PATTERNS = [
  /seeking an entry-level healthcare RCM coder role at a growth-stage firm serving US healthcare accounts/i,
  /coder with demonstrated proficiency in .* targeting an entry-level position on a US payer account/i,
  /seeking to apply my .* skillset in a production RCM setting where precision and continuous learning are valued/i,
  /aiming to contribute precision medical coding expertise to high-volume healthcare operations/i,
  /seeking an impactful role with immediate availability/i,
  /eager to join a clinical documentation team/i,
];

export function isLegacyAutoObjective(text) {
  const t = String(text || "");
  return LEGACY_AUTO_PATTERNS.some((re) => re.test(t));
}
