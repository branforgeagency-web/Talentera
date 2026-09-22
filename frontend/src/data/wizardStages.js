/**
 * Candidate verification wizard — stage metadata (single source of truth for
 * the sidebar nav, hero banner, rules card, trust chips, and per-stage theme).
 *
 * Field-level form content lives in each stage's own component under
 * components/wizard/ — these stages are bespoke enough (multi-step certs,
 * OTP flow, option cards) that a single generic field renderer would lose
 * fidelity to the source design. This file only carries the metadata that's
 * genuinely shared/list-shaped across all 8 stages.
 *
 * Point values match backend/utils/verificationScore.js exactly — do not
 * change pts here without updating STAGE_POINTS server-side too.
 */

// Matches backend/routes/candidate.js SKIPPABLE_STAGES exactly.
// Training (2) and Certification (3) were previously skippable but are now
// mandatory, same as every other stage except Build Resume (7) — a
// candidate's training and certification history must be verified before
// they're eligible for job search (see Jobs.jsx eligibility gate).
const SKIPPABLE_STAGE_NUMS = [7];

const RAW_WIZARD_STAGES = [
  {
    num: 1,
    short: "Basic Info",
    long: "Basic Info + Aadhaar OTP",
    pts: 5,
    mins: 3,
    icon: "user",
    intro:
      "Your verified identity is the gateway to everything in Talentera. Without this, no other stage counts. Aadhaar OTP via UIDAI gives us a one-tap, audit-quality identity confirmation.",
    rules: [
      {
        type: "why",
        title: "Why we verify identity first",
        body: "India's RCM industry has a real problem: fake profiles, duplicate consultancy submissions, identity mix-ups. Aadhaar OTP via UIDAI closes that gap. Without this stage verified, your downstream scores and badges are meaningless to companies. This is the gate.",
      },
      {
        type: "check",
        title: "What we capture",
        body: "Your name as on Aadhaar, your mobile (OTP-verified), your email (OTP-verified), and your locality extracted automatically from Aadhaar. We choose locality over full address to protect your privacy while still giving companies the commute signal they need.",
      },
      {
        type: "eye",
        title: "What companies see vs. what stays private",
        body: 'Companies see your name, city (not full address), and a "Aadhaar Verified" badge. They do not see your Aadhaar number, PAN, mobile, or email until they actively shortlist you. Your Aadhaar number is one-way hashed and never re-exposed.',
      },
    ],
    trustChips: [
      { num: "UIDAI", label: "Aadhaar gateway" },
      { num: "30 sec", label: "avg OTP delivery" },
      { num: "0 leaks", label: "industry record" },
      { num: "~3 min", label: "your time" },
    ],
    theme: { p1: "#4F8BFF", p2: "#6366F1" },
    context:
      "After OTP verification, you join candidates in the Verified Pool. Companies search this pool daily for matches in your specialty.",
  },
  {
    num: 2,
    short: "Foundation",
    long: "Stage 02 · Foundation",
    pts: 15,
    mins: 15,
    icon: "book",
    intro:
      "You tell us where you trained, what you specialized in, and how deeply. Your academy verifies it back from their Talentera dashboard — so your training pedigree carries real weight on every company shortlist.",
    rules: [
      {
        type: "why",
        title: "Why training pedigree matters",
        body: "RCM companies hire based on where you trained. A verified academy background carries a different weight than a self-taught candidate. Stage 02 lets you claim your training — and lets your academy sign it off, so companies know it's real.",
      },
      {
        type: "check",
        title: "What we verify with the academy",
        body: "Academy name, batch, course level, roll number, duration and — most importantly — your assessment score. Your academy sees your claim in their Talentera dashboard and confirms it directly. Your score field is read-only until they do.",
      },
      {
        type: "why",
        title: "What if you didn't go to an academy",
        body: "Self-trained is welcome. You'll take the Talentera Foundation Assessment instead — proctored, on-platform. Clear it and you unlock Stage 03 with a 'Self-Trained · Talentera Validated' badge. No academy dependency.",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "Companies see: academy name, level, specialty, duration, mode of training, and the verified badge if confirmed. Your score is visible only if verified. Un-verified academies appear as 'self-declared' and are filtered out first.",
      },
    ],
    trustChips: [
      { num: "400+", label: "RCM academies mapped" },
      { num: "Verified", label: "by your academy" },
      { num: "Live sign-off", label: "from academy dashboard" },
      { num: "~15 min", label: "your time" },
    ],
    theme: { p1: "#A855F7", p2: "#C026D3" },
    context:
      "Companies filter shortlists by academy. Verified partner academy alumni carry verified credential weight across the hiring pool.",
  },
  {
    num: 3,
    short: "Certification",
    long: "Stage 03 · Certification",
    pts: 20,
    mins: 4,
    icon: "award",
    intro:
      "Connect your global credentials. We verify directly against issuing body directories across USA, India, UK, UAE, Australia, Canada and EU — giving hiring companies tamper-proof confidence in your professional standing.",
    rules: [
      {
        type: "why",
        title: "Why we verify, not just accept uploads",
        body: "PDF and image uploads can be falsified in minutes. Talentera validates member records directly against the credentialing body's public directory or verification API. If the registry confirms active standing, your badge is issued instantly.",
      },
      {
        type: "check",
        title: "What we verify",
        body: "Member / License ID active status · Full name match with Stage 01 Identity · Expiration date · CEU / CPD compliance status · Credential type and issuing sub-board.",
      },
      {
        type: "globe",
        title: "Global means we surface you everywhere",
        body: "Adding your credential automatically indexes your profile in country-specific talent pools — opening hiring pipelines in the US, Middle East, UK, Australia, and GCC regions matching your licensing scope.",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "Issuing body, credential name, verified badge, verification date, and validity window. Your full member ID is partially masked (last 4 digits only) to protect your registry privacy.",
      },
    ],
    trustChips: [
      { num: "80+", label: "issuing bodies" },
      { num: "API-Verified", label: "or registry match" },
      { num: "Multi-cert", label: "stackable proof" },
      { num: "Global", label: "recruiter reach" },
    ],
    theme: { p1: "#00E599", p2: "#00B4D8" },
    context:
      "Cognizant, Optum, Omega Healthcare, and international health networks prioritize verified certified candidates across all operational markets.",
  },
  {
    num: 4,
    short: "Assessment",
    long: "Talentera Assessments",
    pts: 25,
    mins: 45,
    icon: "clip",
    intro:
      "Self-rated skills mean nothing to a hiring manager. A proctored, time-bound test is the only credible signal. Foundation covers core RCM knowledge; Specialty goes deep in your chosen area.",
    rules: [
      {
        type: "why",
        title: "Why a proctored test",
        body: "AAPC certification is a baseline — but it's an exam from years ago. Today's production work needs current proficiency. Talentera Assessments are proctored, time-bound, and recorded so companies see your performance under realistic conditions.",
      },
      {
        type: "check",
        title: "What's tested",
        body: "Foundation (15 Qs · 20 min): ICD-10-CM rules, CPT basics, HCPCS, modifiers, sequencing. Specialty (10 Qs · 25 min): deep dive in your specialty. Anti-cheat: browser lockdown, periodic webcam snapshots, IP fingerprint.",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "Per-topic scores: ICD 85 · CPT 70 · RAF 88. Overall percentile vs. your cohort. Companies filter shortlists by minimum topic-score. Your full answer log stays private; companies see numbers only.",
      },
    ],
    trustChips: [
      { num: "25 Qs", label: "foundation + specialty" },
      { num: "Locked", label: "browser + webcam" },
      { num: "Per-topic", label: "scoring" },
      { num: "45 min", label: "your time" },
    ],
    theme: { p1: "#10B981", p2: "#22C55E" },
    context:
      "Top employers filter by assessment score ≥75. A 78%+ score puts you in the top 22% of the entire pool.",
  },
  {
    num: 5,
    short: "Communication + Video",
    long: "Communication + Video Interview",
    pts: 10,
    mins: 10,
    icon: "video",
    intro:
      "Communication is the primary filter for top RCM roles. Conduct your live AI verbal communication and video interview so our AI can score your spoken English clarity, fluency, and professional delivery.",
    rules: [
      {
        type: "why",
        title: "Why communication & video interview matters",
        body: "For US-payer-facing work (HCC, AR calling, denial mgmt), spoken English clarity and professional delivery are essential. Companies rely on this AI-scored interview to assess communication skills upfront.",
      },
      {
        type: "check",
        title: "How it's scored",
        body: "Step 1: Live face liveness & camera check (camera only). Step 2: A short interactive AI interview with real-time speech transcription. Claude AI scores your clarity, fluency, vocabulary & grammar, and confidence/delivery - not whether your answers are 'correct', since the questions are conversational (tell us about yourself, your training, your background).",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "Recorded video interview session, your overall communication score, and a verified communication badge. The score is generated entirely by AI - no staff review needed.",
      },
    ],
    trustChips: [
      { num: "Live AI", label: "verbal Q&A" },
      { num: "5 Qs", label: "communication interview" },
      { num: "Claude AI", label: "evaluated" },
      { num: "~10 min", label: "your time" },
    ],
    theme: { p1: "#EC4899", p2: "#F43F5E" },
    context:
      "Verified communication & video interview scores raise candidate shortlist rates by 4.3× with US-payer employers.",
  },
  {
    num: 6,
    short: "Live Charts",
    long: "Live Chart Exposure",
    pts: 20,
    mins: 5,
    icon: "activity",
    intro:
      "Theory ≠ production-ready. Companies need to know you've coded real charts, not just sat in lectures. Practicode integration is the gold standard signal.",
    rules: [
      {
        type: "why",
        title: "Why chart exposure matters",
        body: "A fresher with 50 Practicode charts at 86% accuracy is dramatically different from one who only has classroom theory. Companies hiring for production roles consistently rank candidates by chart exposure first, certification second. This stage gives them that signal.",
      },
      {
        type: "check",
        title: "How to prove it",
        body: "Option A: Link your Practicode account — we pull chart count, accuracy %, specialty mix automatically (read-only). Option B: Upload academy log — PDF/Excel from your academy. Option C: Declare for later (partial credit; complete from dashboard).",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "Chart count (e.g., '50 charts'), accuracy band (e.g., '85-90%'), specialty mix (e.g., '70% HCC / 30% E&M'). They cannot see your individual chart submissions — only the rollup.",
      },
    ],
    trustChips: [
      { num: "Practicode", label: "live API" },
      { num: "Read-only", label: "sync access" },
      { num: "Specialty", label: "chart mix" },
      { num: "~5 min", label: "your time" },
    ],
    theme: { p1: "#06B6D4", p2: "#0EA5E9" },
    context:
      "67% of US-payer projects require proof of live-chart exposure. A Practicode link is the strongest signal in this pool.",
  },
  {
    num: 7,
    short: "Build Resume",
    long: "Your Verified Resume",
    pts: 10,
    mins: 5,
    icon: "clip",
    intro:
      "This is what makes Talentera different. You don't write a resume — Talentera builds it for you from everything you've already verified.",
    rules: [
      {
        type: "why",
        title: "Why we build it for you",
        body: "Self-written resumes are full of unverifiable claims. A Talentera Verified Resume only contains what you actually proved — your real assessment scores, your academy-confirmed training, your verified certification. Companies trust it because they know every field passed through our checks.",
      },
      {
        type: "check",
        title: "What goes on it",
        body: "Pulled automatically from Stages 1–6: your name and city, specialty, training, certification, assessment scores, and verification badges. Nothing is typed here — if a section looks empty, go back and complete that stage to fill it in.",
      },
      {
        type: "eye",
        title: "What companies see",
        body: "The exact resume below, always live and current. One standard format for every Talentera candidate — so a hiring manager reads 50 resumes in the time it used to take for 10, and trusts every one.",
      },
    ],
    trustChips: [
      { num: "Auto-built", label: "from your data" },
      { num: "1", label: "standard format" },
      { num: "Live", label: "always current" },
      { num: "~5 min", label: "your time" },
    ],
    theme: { p1: "#F97316", p2: "#EF4444" },
    context:
      "Companies trust the Talentera format because every line is backed by a completed, verified stage — not a self-written claim.",
  },
  {
    num: 8,
    short: "Track",
    long: "Live Interview Track",
    pts: 5,
    mins: 8,
    icon: "trend",
    intro:
      "Past interview performance predicts future. Companies that shortlist you see whether you've done 0 interviews or 10 — and what percentage you cleared. This stage activates that track.",
    rules: [
      {
        type: "why",
        title: "Why an interview track exists",
        body: "A candidate who has been through 8 real company interviews and cleared 5 is dramatically different from one who has zero history. Companies value this signal a lot. The track auto-captures every Talentera-routed interview so you build proof of interview-readiness over time.",
      },
      {
        type: "check",
        title: "What gets captured",
        body: "For each interview: round number, type (HR / tech / ops / final), date, result (selected / rejected / on-hold), and any anonymized feedback. You see the full track in your dashboard with company names; companies viewing your profile see anonymized summaries.",
      },
      {
        type: "lock",
        title: "Your privacy on this track",
        body: "Companies see only: \"3 interviews · 2 cleared\" — never the specific company or feedback. You can request anonymization or full deletion at any time. Right-to-be-forgotten honored. Consent is mandatory to enter the Verified Pool.",
      },
    ],
    trustChips: [
      { num: "Auto", label: "interview capture" },
      { num: "Anon", label: "company view" },
      { num: "Delete", label: "anytime" },
      { num: "~2 min", label: "your time" },
    ],
    theme: { p1: "#A855F7", p2: "#D946EF" },
    context:
      "Every interview Talentera routes you to from here on starts building your track record, boosting your shortlist visibility with top employers.",
  },
];

export const WIZARD_STAGES = RAW_WIZARD_STAGES.map((s) => ({
  ...s,
  mandatory: !SKIPPABLE_STAGE_NUMS.includes(s.num),
  skippable: SKIPPABLE_STAGE_NUMS.includes(s.num),
}));

export const STAGE_POINTS = WIZARD_STAGES.reduce((acc, s) => {
  acc[s.num] = s.pts;
  return acc;
}, {});

export const GOLD_BADGE_THRESHOLD = 75;

// A candidate counts as self-trained when Stage 2 says so in ANY of these ways: they chose the
// self-trained path, picked the "Non-Trained" level, or named a self-learning source instead of an academy.
const SELF_SOURCE_RE = /self[\s-]?(learning|study|taught|trained)|youtube|udemy|coursera|\bedx\b|online course|aapc official|ahima study|blogs?,? forums|on-the-job/i;

export function isSelfTrainedCandidate(candidate) {
  if (!candidate) return false;
  const s2 = candidate.stage2 || {};
  const level = String(s2.trainingLevel || s2.level || "");
  const source = String(s2.selfLearningSource || s2.academyName || s2.instituteName || "");
  return Boolean(
    s2.trainingPath === "self" ||
    s2.trainingPath === "non_trained" ||
    s2.trainingPath === "non-trained" ||
    s2.isNonTrained ||
    s2.isSelfTrained ||
    s2.trainingType === "self" ||
    candidate.trainingPath === "self" ||
    candidate.trainingPath === "non_trained" ||
    candidate.trainingPath === "non-trained" ||
    candidate.isNonTrained ||
    candidate.isSelfTrained ||
    s2.selfLearningSource ||
    /non[\s-]?trained/i.test(level) ||
    SELF_SOURCE_RE.test(source)
  );
}

// Live Chart (Stage 06) coding practice is a Medical Coding / Medical Billing concept - it
// doesn't apply to AR Calling or Eligibility & Verification work, which never touches a chart
// encoder. Keep this list in sync with DOMAINS_WITHOUT_SPECIALTIES in Stage2Training.jsx and
// with backend/routes/candidate.js's copy of this function.
const LIVE_CHART_EXEMPT_DOMAINS = ["Accounts Receivable", "Eligibility & Verification"];

export function isLiveChartExemptDomain(candidate) {
  const domain = candidate?.stage2?.domain || "";
  return LIVE_CHART_EXEMPT_DOMAINS.includes(domain);
}

// Stage 06 is optional/removed for a candidate who is either self-trained (no live employer
// system access yet) or whose domain never involves chart coding at all.
export function isStage6Optional(candidate) {
  return isSelfTrainedCandidate(candidate) || isLiveChartExemptDomain(candidate);
}

export function getWizardStages(candidate) {
  const stage6Optional = isStage6Optional(candidate);
  return RAW_WIZARD_STAGES.map((s) => {
    const isStage6Optional = s.num === 6 && stage6Optional;
    const isSkippable = SKIPPABLE_STAGE_NUMS.includes(s.num) || isStage6Optional;
    return {
      ...s,
      mandatory: !isSkippable,
      skippable: isSkippable,
      isOptional: isStage6Optional,
    };
  });
}

export function getStage(num, candidate) {
  const list = candidate ? getWizardStages(candidate) : WIZARD_STAGES;
  return list.find((s) => s.num === num);
}
