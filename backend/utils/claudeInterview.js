const axios = require("axios");

const ANTHROPIC_URL = "https://api.anthropic.com/v1/messages";
const MODEL = "claude-haiku-4-5-20251001";

function apiKey() {
  return process.env.CLAUDE_API_KEY || process.env.ANTHROPIC_API_KEY || "";
}

function authHeaders(key) {
  return {
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    "content-type": "application/json",
  };
}

const MESSI_SYSTEM_PROMPT = `You are Jessy, an expert medical coding and healthcare RCM technical interviewer conducting a mock interview for Talentera candidates.
You evaluate the candidate's spoken response by directly comparing it against the Reference Correct Answer stored in the question database.
Guidelines:
- Evaluate technical accuracy, concept coverage, and understanding relative to the Reference Correct Answer.
- The candidate's response is transcribed via speech-to-text and may have slight transcription artifacts; evaluate the substance of what was communicated.
- NEVER complain about microphone/audio issues.
- Return strictly valid JSON with no markdown formatting.`;

// ---------------------------------------------------------------------------
// Core Interview Question Banks partitioned by Primary Domain (Medical Coding, Billing, AR, Front Office)
// ---------------------------------------------------------------------------
const DOMAIN_INTERVIEW_BANKS = {
  "Medical Coding": [
    {
      domain: "Medical Coding",
      topic: "ICD-10-CM Diagnosis Coding",
      topicLabel: "1. ICD-10-CM Coding",
      question: "In simple terms, what is an ICD-10-CM code used for in medical coding?",
      correctAnswer: "An ICD-10-CM code is a standardized diagnostic classification code used by healthcare providers to classify and report patient diagnoses, diseases, symptoms, injuries, and reasons for encounter on medical claims for billing and reimbursement.",
      expectedConcepts: ["icd-10-cm", "diagnosis", "disease", "symptom", "condition", "patient encounter", "reimbursement", "billing", "classification"],
      keywords: ["ICD-10-CM", "Diagnosis", "Reimbursement/Billing"],
    },
    {
      domain: "Medical Coding",
      topic: "CPT Procedure Codes",
      topicLabel: "2. CPT Procedure Codes",
      question: "What is a CPT code used for, and how does it differ from an ICD-10 code?",
      correctAnswer: "A CPT (Current Procedural Terminology) code is used to report medical, surgical, and diagnostic procedures and healthcare services performed by physicians, whereas ICD-10-CM codes explain the diagnosis or medical reason why the service was necessary.",
      expectedConcepts: ["cpt", "procedure", "surgical", "service", "treatment", "physician service", "diagnostic", "icd-10", "diagnosis", "medical necessity"],
      keywords: ["CPT", "Procedures", "ICD-10-CM/Diagnosis"],
    },
    {
      domain: "Medical Coding",
      topic: "Evaluation & Management (E/M) Coding",
      topicLabel: "3. E/M Coding",
      question: "What does an Evaluation and Management (E/M) code describe, and how is its level determined?",
      correctAnswer: "An E/M code represents the provider-patient clinical encounter (office visits, consultations, hospital visits), with the code level determined primarily by the complexity of Medical Decision Making (MDM) or total time spent by the physician on the date of encounter.",
      expectedConcepts: ["e/m", "evaluation and management", "patient visit", "office visit", "medical decision making", "mdm", "time", "complexity", "encounter"],
      keywords: ["Evaluation and Management (E/M)", "Patient Encounter/Visit", "Medical Decision Making (MDM)"],
    },
    {
      domain: "Medical Coding",
      topic: "CPT Modifiers",
      topicLabel: "4. CPT Modifiers",
      question: "Explain the distinction between CPT Modifiers 25 and 59 in outpatient billing.",
      correctAnswer: "Modifier 25 designates a significant, separately identifiable E/M service by the same physician on the same day as a procedure, whereas Modifier 59 designates a distinct procedural service unrelated to other non-E/M procedures performed on the same day.",
      expectedConcepts: ["modifier 25", "modifier 59", "significant separately identifiable", "distinct procedural service", "e/m service", "unbundling", "same day"],
      keywords: ["Modifier 25", "Modifier 59", "Separately Identifiable Service"],
    },
    {
      domain: "Medical Coding",
      topic: "Risk Adjustment & HCC Coding",
      topicLabel: "5. HCC Coding",
      question: "Explain the M.E.A.T. criteria used to validate chronic condition diagnoses in Risk Adjustment / HCC coding.",
      correctAnswer: "M.E.A.T. stands for Monitor, Evaluate, Assess, and Treat. In HCC risk adjustment coding, medical record documentation must demonstrate at least one of these criteria to substantiate that a chronic condition is actively managed and valid for RAF scoring.",
      expectedConcepts: ["meat", "monitor", "evaluate", "assess", "treat", "hcc", "risk adjustment", "chronic condition", "raf score"],
      keywords: ["M.E.A.T. Criteria", "Chronic Condition", "Risk Adjustment/HCC"],
    },
    {
      domain: "Medical Coding",
      topic: "NCCI Edits & Unbundling",
      topicLabel: "6. NCCI Edits & Unbundling",
      question: "What are National Correct Coding Initiative (NCCI) edits and how do they prevent unbundling?",
      correctAnswer: "NCCI edits are CMS automated guidelines that identify pairs of CPT/HCPCS codes that should not normally be billed together for the same patient on the same day. They prevent unbundling by designating comprehensive-component code pairs that can only be separated with a valid modifier when clinically justified.",
      expectedConcepts: ["ncci edits", "cms", "unbundling", "procedure-to-procedure", "ptp", "comprehensive code", "modifier override", "same day"],
      keywords: ["NCCI Edits", "Unbundling", "Procedure-to-Procedure (PTP)"],
    },
  ],
  "Medical Billing": [
    {
      domain: "Medical Billing",
      topic: "Claim Rejections vs Denials",
      topicLabel: "1. Claim Rejections vs Denials",
      question: "What is the difference between a claim rejection and a claim denial in medical billing?",
      correctAnswer: "A claim rejection occurs before the claim is processed because it failed front-end payer or clearinghouse formatting, demographic, or syntax edits. A claim denial occurs after the claim was received and fully adjudicated by the payer with a formal Explanation of Benefits (EOB) and denial reason.",
      expectedConcepts: ["claim rejection", "claim denial", "clearinghouse", "front-end edits", "adjudication", "eob", "processed", "formal denial"],
      keywords: ["Claim Rejection", "Claim Denial", "Clearinghouse/Adjudication"],
    },
    {
      domain: "Medical Billing",
      topic: "Clearinghouse & EDI 837",
      topicLabel: "2. Clearinghouse & EDI 837",
      question: "What is the role of a clearinghouse in healthcare billing and what is an EDI 837 transaction?",
      correctAnswer: "A clearinghouse acts as an electronic intermediary that scrubs claims for errors and translates practice management data into the standard ANSI ASC X12 EDI 837 electronic claim format (837P for professional, 837I for institutional) for transmission to payers.",
      expectedConcepts: ["clearinghouse", "claim scrubbing", "edi 837", "837p", "837i", "intermediary", "payer transmission", "clean claim"],
      keywords: ["Clearinghouse", "EDI 837", "Claim Scrubbing"],
    },
    {
      domain: "Medical Billing",
      topic: "EOB vs ERA",
      topicLabel: "3. EOB vs ERA (835)",
      question: "What is the difference between an Explanation of Benefits (EOB) and an Electronic Remittance Advice (ERA / EDI 835)?",
      correctAnswer: "An EOB is a document sent to both the patient and provider explaining how a claim was adjudicated, including allowed amounts, coinsurance, and copays. An ERA (EDI 835) is the electronic, machine-readable remittance file sent directly to provider billing systems for automated payment posting.",
      expectedConcepts: ["eob", "era", "835", "electronic remittance", "explanation of benefits", "payment posting", "automated", "patient responsibility"],
      keywords: ["Explanation of Benefits (EOB)", "Electronic Remittance Advice (ERA)", "Payment Posting (835)"],
    },
    {
      domain: "Medical Billing",
      topic: "Patient Cost-Sharing",
      topicLabel: "4. Copay, Coinsurance & Deductible",
      question: "Can you explain the practical differences between a copayment, coinsurance, and a deductible for patient billing?",
      correctAnswer: "A copayment is a fixed dollar amount paid at the time of service (e.g. $25). A deductible is the annual dollar amount the patient must pay out-of-pocket before insurance benefits begin. Coinsurance is the percentage split (e.g. 80/20) paid by the patient after the deductible has been satisfied.",
      expectedConcepts: ["copay", "coinsurance", "deductible", "fixed fee", "percentage", "out of pocket", "annual threshold", "cost sharing"],
      keywords: ["Copayment", "Deductible", "Coinsurance (Percentage)"],
    },
    {
      domain: "Medical Billing",
      topic: "Claim Forms (CMS-1500 vs UB-04)",
      topicLabel: "5. Professional vs Institutional Billing",
      question: "When do you bill on a CMS-1500 form versus a UB-04 (CMS-1450) form?",
      correctAnswer: "The CMS-1500 is used for professional outpatient physician, supplier, and ambulance billing (EDI 837P). The UB-04 is used for institutional hospital, skilled nursing, ambulatory surgery center, and facility billing (EDI 837I).",
      expectedConcepts: ["cms-1500", "ub-04", "cms-1450", "professional billing", "institutional billing", "facility charges", "physician charges", "837p", "837i"],
      keywords: ["CMS-1500", "UB-04 (Institutional)", "Professional vs Facility"],
    },
    {
      domain: "Medical Billing",
      topic: "Contractual Write-Offs",
      topicLabel: "6. Contractual Adjustments",
      question: "What is a contractual adjustment or write-off in payment posting, and why cannot in-network providers balance bill it?",
      correctAnswer: "A contractual adjustment is the agreed-upon discount between the provider's billed charge and the insurance company's contracted allowed amount. Because the provider participates in-network, contracts strictly prohibit balance billing the discount to the patient.",
      expectedConcepts: ["contractual adjustment", "write-off", "allowed amount", "billed charge", "in-network", "balance billing prohibition", "discount"],
      keywords: ["Contractual Adjustment", "Allowed Amount", "Balance Billing Prohibition"],
    },
  ],
  "Accounts Receivable": [
    {
      domain: "Accounts Receivable",
      topic: "AR Aging & Buckets",
      topicLabel: "1. AR Aging Buckets",
      question: "What is Accounts Receivable (AR) in healthcare revenue cycle, and what are the standard AR aging buckets?",
      correctAnswer: "Accounts Receivable represents all unpaid claims and patient balances owed to the practice. Standard aging buckets categorize outstanding receivables into 0-30 days, 31-60 days, 61-90 days, 91-120 days, and 120+ days, with older buckets receiving highest follow-up priority to prevent write-offs.",
      expectedConcepts: ["accounts receivable", "ar aging", "aging buckets", "30 days", "60 days", "90 days", "120 days", "outstanding balances", "unpaid claims"],
      keywords: ["Accounts Receivable (AR)", "Aging Buckets", "Outstanding Balances"],
    },
    {
      domain: "Accounts Receivable",
      topic: "CARC and RARC Codes",
      topicLabel: "2. CARC & RARC Denial Analysis",
      question: "What is the difference between a Claim Adjustment Reason Code (CARC) and a Remittance Advice Remark Code (RARC)?",
      correctAnswer: "A CARC code explains WHY a claim or service line was paid differently than charged or denied entirely (e.g. CARC 16 for missing info). A RARC code provides additional explanatory detail or specifies what documentation or policy is needed to resolve the adjustment.",
      expectedConcepts: ["carc", "rarc", "claim adjustment reason code", "remark code", "denial reason", "remittance advice", "secondary explanation", "adjudication"],
      keywords: ["CARC Codes", "RARC Codes", "Denial Root Cause"],
    },
    {
      domain: "Accounts Receivable",
      topic: "Timely Filing Appeals",
      topicLabel: "3. Timely Filing & Appeals",
      question: "How do you handle a claim denied for 'Timely Filing Limit Exceeded' and what documentation is required to overturn it?",
      correctAnswer: "To overturn a timely filing denial, the AR specialist must submit a formal appeal package including clearinghouse electronic EDI acceptance reports (277/999/batch report) proving initial submission occurred within the payer's filing window (e.g. 90, 180, or 365 days).",
      expectedConcepts: ["timely filing", "denial appeal", "clearinghouse report", "277 report", "999 report", "proof of timely submission", "filing limit", "overturn"],
      keywords: ["Timely Filing", "EDI Acceptance Proof", "Denial Appeal"],
    },
    {
      domain: "Accounts Receivable",
      topic: "Aged Claim Follow-Up (60+ Days)",
      topicLabel: "4. Aged Claim Follow-Up Protocol",
      question: "How do you investigate and resolve a claim that has been pending with an insurance payer past 60 days?",
      correctAnswer: "First, verify claim receipt and status via the payer web portal or automated IVR. If pending for review or missing records, upload the requested chart notes immediately. If stalled without adjudication, call payer provider services, obtain a call reference number and representative name, and request claim escalation.",
      expectedConcepts: ["payer portal", "ivr", "call reference number", "claim escalation", "medical records request", "pending review", "adjudication turnaround"],
      keywords: ["Payer Portal / IVR", "Call Reference Number", "Claim Escalation"],
    },
    {
      domain: "Accounts Receivable",
      topic: "Days in AR (DAR) Metric",
      topicLabel: "5. Days in AR (DAR) Calculation",
      question: "How is Days in Accounts Receivable (Days in AR) calculated and what is considered an industry-healthy benchmark?",
      correctAnswer: "Days in AR equals Total Accounts Receivable divided by Average Daily Charges. A healthy benchmark for most medical specialties is between 30 to 40 days; exceeding 50 days signals severe revenue cycle bottlenecks or unworked denials.",
      expectedConcepts: ["days in ar", "dar", "total ar", "average daily charges", "benchmark", "30 to 40 days", "revenue cycle performance"],
      keywords: ["Days in AR (DAR)", "Average Daily Charges", "Benchmark (30-40 Days)"],
    },
    {
      domain: "Accounts Receivable",
      topic: "Medical Necessity Denial Appeals",
      topicLabel: "6. Medical Necessity Appeals",
      question: "What steps do you take to resolve an insurance denial citing 'Service not medically necessary'?",
      correctAnswer: "Review the payer's Local Coverage Determination (LCD) or National Coverage Determination (NCD), examine the clinical chart to verify whether documented ICD-10 codes support the CPT procedure, and submit a comprehensive appeal letter with physician progress notes and operative reports highlighted.",
      expectedConcepts: ["medical necessity", "lcd", "ncd", "clinical chart", "appeal letter", "physician notes", "supporting diagnosis", "peer to peer"],
      keywords: ["Medical Necessity", "LCD / NCD Coverage", "Appeal with Clinical Notes"],
    },
  ],
  "Front Office": [
    {
      domain: "Front Office",
      topic: "Insurance Eligibility Verification",
      topicLabel: "1. Real-Time Eligibility Verification",
      question: "What is the procedure for verifying a patient's insurance eligibility and benefits prior to their appointment?",
      correctAnswer: "Perform electronic 270/271 real-time eligibility inquiry through the practice management system or payer portal 48 hours prior to the visit. Verify policy active status, effective dates, primary vs secondary coverage, copay and deductible amounts, and whether the ordered service requires prior authorization.",
      expectedConcepts: ["eligibility verification", "270/271", "active status", "effective dates", "copay", "deductible", "prior authorization", "payer portal"],
      keywords: ["Eligibility Verification (270/271)", "Active Coverage Dates", "Copay & Deductible Check"],
    },
    {
      domain: "Front Office",
      topic: "Prior Authorization Workflows",
      topicLabel: "2. Prior Authorization Protocols",
      question: "What is Prior Authorization (Pre-certification), and what occurs if a specialist procedure requiring it is performed without approval?",
      correctAnswer: "Prior Authorization is formal approval required from an insurer before rendering specific procedures, diagnostics (like MRIs), or medications. If rendered without prior authorization, the insurer will deny the claim as unauthorized, and contractually the practice cannot bill the patient.",
      expectedConcepts: ["prior authorization", "pre-certification", "payer approval", "mri", "specialty procedure", "unauthorized denial", "non-reimbursable"],
      keywords: ["Prior Authorization", "Payer Pre-certification", "Unauthorized Claim Denial"],
    },
    {
      domain: "Front Office",
      topic: "Birthday Rule in Coordination of Benefits",
      topicLabel: "3. Coordination of Benefits & Birthday Rule",
      question: "Explain how the 'Birthday Rule' determines primary health insurance for a child covered under both parents' health plans.",
      correctAnswer: "Under the standard HIPAA Birthday Rule, the health insurance plan of the parent whose birthday (month and day, ignoring the year) falls earlier in the calendar year is designated as the primary payer, while the other parent's plan acts as secondary.",
      expectedConcepts: ["birthday rule", "coordination of benefits", "cob", "dependent child", "earlier in calendar year", "month and day", "primary insurance", "secondary"],
      keywords: ["Birthday Rule", "Earlier Month & Day", "Primary Insurance Determination"],
    },
    {
      domain: "Front Office",
      topic: "HIPAA Privacy at Front Desk",
      topicLabel: "4. Front-Desk HIPAA Safeguards",
      question: "How do you protect patient Protected Health Information (PHI) and maintain HIPAA compliance in a busy reception area?",
      correctAnswer: "Position computer screens facing away from patients or utilize privacy filters, speak in low confidential tones when discussing medical or billing details, keep paper intake charts face-down and out of reach, and have patients review and sign the Notice of Privacy Practices (NPP).",
      expectedConcepts: ["hipaa", "phi", "protected health information", "privacy screen", "notice of privacy practices", "npp", "confidentiality", "reception area"],
      keywords: ["HIPAA Compliance", "Privacy Screens / PHI Safeguards", "Notice of Privacy Practices"],
    },
    {
      domain: "Front Office",
      topic: "Point-of-Service Collections",
      topicLabel: "5. Point-of-Service Copay Collection",
      question: "Why is collecting patient copayments and deductibles at check-in (Point of Service) critical, and how should it be communicated?",
      correctAnswer: "Point-of-service collections maximize practice cash flow and reduce downstream patient billing costs by nearly 90%. Staff should communicate transparently: 'Mr. Smith, your verified insurance requires a $30 specialist copay today; will you be using credit or debit?' providing an immediate receipt.",
      expectedConcepts: ["point of service", "pos collections", "check-in", "copayment", "deductible", "cash flow", "receipt", "clear communication"],
      keywords: ["Point-of-Service Collections", "Check-in Copayment", "Transparent Communication"],
    },
    {
      domain: "Front Office",
      topic: "No-Show & Scheduling Management",
      topicLabel: "6. Scheduling & No-Show Reduction",
      question: "How should the front office handle patient appointment scheduling to optimize provider templates and minimize no-shows?",
      correctAnswer: "Implement automated multi-channel appointment reminders (SMS and email 24-48 hours ahead), distinguish between new (longer template) and established patients, maintain an active cancellation waitlist to backfill open slots, and follow up promptly with no-show patients to reschedule.",
      expectedConcepts: ["appointment reminders", "sms reminders", "provider template", "new vs established", "cancellation waitlist", "no-show reduction"],
      keywords: ["Appointment Reminders (SMS)", "Provider Template Slots", "Waitlist Backfill"],
    },
  ],
};

const FALLBACK_QUESTION_BANK = [
  ...DOMAIN_INTERVIEW_BANKS["Medical Coding"],
  ...DOMAIN_INTERVIEW_BANKS["Medical Billing"],
  ...DOMAIN_INTERVIEW_BANKS["Accounts Receivable"],
  ...DOMAIN_INTERVIEW_BANKS["Front Office"],
];

// A tiny synonym map so keyword matching is semantic rather than pure
// exact-text - e.g. a candidate who says "insurance" instead of "payer",
// or "notes" instead of "documentation", still gets credit. This is the
// heuristic (no-LLM-key) fallback path only; when an Anthropic API key is
// configured, getMessiTurn asks Claude to do real semantic/synonym
// matching directly (see MESSI_SYSTEM_PROMPT / the turn prompt below).
const KEYWORD_SYNONYMS = {
  "icd-10-cm": ["icd10", "icd 10", "icd-10", "diagnosis code", "diagnostic code"],
  diagnosis: ["diagnoses", "diagnostic", "condition", "disease", "symptom", "illness"],
  "reimbursement/billing": ["reimbursement", "billing", "bill", "payment", "pay", "revenue"],
  cpt: ["current procedural terminology", "procedure code"],
  procedures: ["procedure", "surgical", "surgery", "service", "treatment"],
  "icd-10-cm/diagnosis": ["icd-10", "icd10", "diagnosis", "diagnostic"],
  "evaluation and management (e/m)": ["e/m", "e and m", "evaluation and management", "em code", "em coding"],
  "patient encounter/visit": ["encounter", "visit", "office visit", "consultation", "consult"],
  "medical decision making (mdm)": ["mdm", "decision making", "complexity", "medical decision"],
  "medical claim": ["claim", "insurance claim", "itemized bill"],
  "claim denial": ["denial", "denied", "rejection", "rejected"],
  "appeal/eob-era": ["appeal", "eob", "era", "remittance", "explanation of benefits", "corrected claim"],
  hipaa: ["health insurance portability and accountability act"],
  "protected health information (phi)": ["phi", "protected health information", "patient data", "patient information"],
  "compliance/confidentiality": ["compliance", "confidentiality", "privacy", "security", "regulatory"],
};

const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "am", "an", "and", "any", "are", "aren't",
  "as", "at", "be", "because", "been", "before", "being", "below", "between", "both", "but", "by",
  "can", "can't", "cannot", "could", "couldn't", "did", "didn't", "do", "does", "doesn't", "doing",
  "don't", "down", "during", "each", "few", "for", "from", "further", "had", "hadn't", "has", "hasn't",
  "have", "haven't", "having", "he", "he'd", "he'll", "he's", "her", "here", "here's", "hers",
  "herself", "him", "himself", "his", "how", "how's", "i", "i'd", "i'll", "i'm", "i've", "if", "in",
  "into", "is", "isn't", "it", "it's", "its", "itself", "let's", "me", "more", "most", "mustn't", "my",
  "myself", "no", "nor", "not", "of", "off", "on", "once", "only", "or", "other", "ought", "our",
  "ours", "ourselves", "out", "over", "own", "same", "shan't", "she", "she'd", "she'll", "she's",
  "should", "shouldn't", "so", "some", "such", "than", "that", "that's", "the", "their", "theirs",
  "them", "themselves", "then", "there", "there's", "these", "they", "they'd", "they'll", "they're",
  "they've", "this", "those", "through", "to", "too", "under", "until", "up", "very", "was", "wasn't",
  "we", "we'd", "we'll", "we're", "we've", "were", "weren't", "what", "what's", "when", "when's",
  "where", "where's", "which", "while", "who", "who's", "whom", "why", "why's", "with", "won't",
  "would", "wouldn't", "you", "you'd", "you'll", "you're", "you've", "your", "yours", "yourself",
  "yourselves"
]);

function extractKeywords(text = "") {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOPWORDS.has(w));
}

// Resolve the exactly-3 keyword set for a question: prefer staff-configured
// `keywords`, then the fallback bank's curated 3, then (last resort) the
// first 3 of a broader `expectedConcepts` list so older/custom questions
// without a dedicated `keywords` field still get a usable 3.
function resolveKeywords(q, idx) {
  if (Array.isArray(q.keywords) && q.keywords.length === 3) {
    return q.keywords.map(String);
  }
  const fallbackKeywords = FALLBACK_QUESTION_BANK[idx]?.keywords;
  if (Array.isArray(fallbackKeywords) && fallbackKeywords.length === 3) {
    return fallbackKeywords;
  }
  const concepts = Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0
    ? q.expectedConcepts
    : extractKeywords(q.correctAnswer || "");
  if (concepts.length >= 3) return concepts.slice(0, 3).map(String);
  // Pad out with generic placeholders rather than shipping fewer than 3 -
  // every question must have exactly 3 keywords per the grading contract.
  const padded = concepts.map(String);
  while (padded.length < 3) padded.push(`concept-${padded.length + 1}`);
  return padded;
}

function normalizeQText(text = "") {
  return String(text || "").toLowerCase().replace(/[^a-z0-9]/g, "").trim();
}

function withIndices(list) {
  return list.slice(0, 5).map((q, idx) => ({
    index: idx,
    id: q.id || q._id || `q-${idx + 1}`,
    topic: q.topic || `Topic ${idx + 1}`,
    topicLabel: q.topicLabel || `Question ${idx + 1}`,
    question: (q.question || q.text || "").trim(),
    correctAnswer: q.correctAnswer || "",
    expectedConcepts: Array.isArray(q.expectedConcepts) && q.expectedConcepts.length > 0
      ? q.expectedConcepts.map(String)
      : extractKeywords(q.correctAnswer || ""),
    keywords: resolveKeywords(q, idx),
  }));
}

function pickRandomFallbackQuestions(count = 5, excludeTexts = [], domain = "Medical Coding") {
  if (typeof excludeTexts === "string") {
    domain = excludeTexts;
    excludeTexts = [];
  }
  const safeExclude = Array.isArray(excludeTexts) ? excludeTexts : [];
  const targetDomain = domain && DOMAIN_INTERVIEW_BANKS[domain] ? domain : "Medical Coding";
  const domainSpecificPool = DOMAIN_INTERVIEW_BANKS[targetDomain] || [];
  const fullPool = [
    ...domainSpecificPool,
    ...FALLBACK_QUESTION_BANK,
  ];

  const excludeSet = new Set(safeExclude.map(normalizeQText).filter(Boolean));
  const seen = new Set();
  const dedupedPool = [];
  for (const q of fullPool) {
    const key = normalizeQText(q.question);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    dedupedPool.push(q);
  }

  // Prioritize domain-specific questions first
  const domainFresh = domainSpecificPool.filter((q) => !excludeSet.has(normalizeQText(q.question)));
  const shuffledDomainFresh = [...domainFresh].sort(() => 0.5 - Math.random());
  const selected = shuffledDomainFresh.slice(0, count);

  // If candidate has seen some or bank is small, backfill from remaining domain pool or deduped pool
  if (selected.length < count) {
    const remainingPool = dedupedPool.filter(
      (q) => !selected.some((s) => normalizeQText(s.question) === normalizeQText(q.question))
    ).sort(() => 0.5 - Math.random());
    for (const q of remainingPool) {
      if (selected.length >= count) break;
      selected.push(q);
    }
  }

  return withIndices(selected);
}

const DOMAIN_PROMPT_TOPICS = {
  "Medical Coding": [
    "1. ICD-10-CM Diagnosis Coding (guidelines, combination codes, conventions)",
    "2. CPT Procedure Codes & Modifiers (modifier 25 vs 59, unbundling, sequencing)",
    "3. Evaluation & Management (E/M) MDM Leveling & Time-based coding",
    "4. Medical Billing & Denial Resolution (EOB/ERA, appeals, root cause)",
    "5. HIPAA, Compliance & Medical Necessity (PHI, NCCI edits, ABN)",
  ],
  "Medical Billing": [
    "1. Payer Types & Rules (Medicare, Medicaid, Commercial, Managed Care)",
    "2. Clean Claims Submission (CMS-1500 / UB-04, 837 EDI, clearinghouse scrubbing)",
    "3. Remittance Advice & Payment Posting (835 ERA, copay/coinsurance/deductibles)",
    "4. Denial Categorization & Re-billing (CO, PR, OA, timely filing)",
    "5. Compliance, Fraud vs Abuse, and Billing Regulations",
  ],
  "Accounts Receivable": [
    "1. AR Aging Analysis & Priority Workqueues (30-60-90-120+ buckets)",
    "2. CARC & RARC Denial Root Cause Analysis",
    "3. Payer Follow-Up, Timely Filing Overturns & Proof of Submission",
    "4. Days in AR (DAR) & Cash Acceleration Metrics",
    "5. Clinical Appeal Strategies & Medical Necessity Overturns",
  ],
  "Front Office": [
    "1. 270/271 Real-Time Eligibility Verification & Benefit Interpretation",
    "2. Prior Authorization & Pre-certification Protocols",
    "3. Coordination of Benefits (COB) & Birthday Rule",
    "4. Front-Desk HIPAA Safeguards & Notice of Privacy Practices (NPP)",
    "5. Point-of-Service (POS) Collections & Patient Scheduling Optimization",
  ],
};

/**
 * Generate or fetch structured interview questions tailored to candidate domain
 */
async function generateInterviewQuestions({ candidateName = "", role = "", experienceYears, excludeQuestions = [], domain = "Medical Coding" } = {}) {
  const key = apiKey();
  const targetDomain = domain && DOMAIN_INTERVIEW_BANKS[domain] ? domain : "Medical Coding";
  const roleLabel = role || targetDomain;
  const topics = DOMAIN_PROMPT_TOPICS[targetDomain] || DOMAIN_PROMPT_TOPICS["Medical Coding"];

  if (key) {
    try {
      const prompt = `Generate exactly 5 distinct, high-quality ${targetDomain} interview questions with model answers for a candidate applying for: "${roleLabel}".
Experience level: ${experienceYears ? `${experienceYears} years` : "Entry/Mid-level"}.
Specialty Domain: "${targetDomain}".
Topics should be 5 different areas selected from:
${topics.join("\n")}

IMPORTANT: Every question must be completely distinct from one another. No duplicate topics or questions.
${excludeQuestions.length ? `Do NOT repeat these questions already asked to candidate: ${JSON.stringify(excludeQuestions.slice(0, 10))}` : ""}

Return STRICT JSON only as an array of 5 objects:
[
  {
    "topic": string,
    "topicLabel": string,
    "question": string (concise single question),
    "correctAnswer": string (authoritative, clear correct answer),
    "expectedConcepts": string[] (5-8 key technical terms that must be in a good answer),
    "keywords": string[] (EXACTLY 3 - the 3 most essential ${targetDomain} keywords/concepts a correct answer must cover, used to score the candidate's answer as a Keyword Match out of 3)
  }
]`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 1800,
          system: `You are an experienced ${targetDomain} supervisor and technical interviewer. Return valid JSON only.`,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.7,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Deduplicate parsed questions by text
        const seen = new Set();
        const cleaned = [];
        for (const q of parsed) {
          if (!q || typeof (q.question || q.text) !== "string") continue;
          const qText = (q.question || q.text).trim();
          const norm = normalizeQText(qText);
          if (!norm || seen.has(norm)) continue;
          seen.add(norm);
          cleaned.push({
            topic: q.topic || `Topic ${cleaned.length + 1}`,
            topicLabel: q.topicLabel || `Question ${cleaned.length + 1}`,
            question: qText,
            correctAnswer: q.correctAnswer || "",
            expectedConcepts: Array.isArray(q.expectedConcepts) ? q.expectedConcepts : [],
            keywords: Array.isArray(q.keywords) && q.keywords.length === 3 ? q.keywords : undefined,
          });
        }
        if (cleaned.length >= 5) {
          return withIndices(cleaned.slice(0, 5));
        }
      }
    } catch (err) {
      console.warn("generateInterviewQuestions LLM notice, using diverse fallback question bank:", err.message);
    }
  }

  return pickRandomFallbackQuestions(5, excludeQuestions, targetDomain);
}

// ---------------------------------------------------------------------------
// Intent Detection & Heuristic Answer Comparison
// ---------------------------------------------------------------------------
const VALID_INTENTS = ["answer", "repeat", "skip", "hint", "clarify", "stop", "unclear"];
const VALID_EVALUATIONS = ["correct", "partial", "incorrect", "no_answer"];

function detectQuickIntent(utterance) {
  const t = String(utterance || "").trim().toLowerCase();
  if (!t) return "unclear";
  if (/\b(stop|end|quit|terminate)\b[\s\S]*\binterview\b/.test(t) || /^(stop|end)( it| this)?$/.test(t)) return "stop";
  if (/\brepeat\b|\bsay (that|it) again\b|didn't (catch|hear) that|come again/.test(t)) return "repeat";
  if (/\bskip\b|\bnext question\b|move on|pass on this one|\b(i )?(don't|do not|dont) know\b|\bno idea\b|\bnot sure\b/.test(t)) return "skip";
  if (/\bhint\b|\bclue\b|give me a hint|help me out/.test(t)) return "hint";
  if (/what do you mean|\bclarify\b|rephrase|explain the question/.test(t)) return "clarify";
  return "answer";
}

// A keyword "matches" a candidate's answer if it appears verbatim, as a
// stemmed/partial word, or via the small synonym map above - this is the
// semantic-ish matching used when no Claude API key is configured (the
// heuristic fallback path); with a key configured, getMessiTurn asks Claude
// to judge the same 3 keywords with real semantic/meaning understanding.
function keywordIsPresent(keyword, lowerCandidate, candidateKeywordSet) {
  const cLower = String(keyword || "").toLowerCase().trim();
  if (!cLower) return false;
  if (lowerCandidate.includes(cLower)) return true;

  const synonyms = KEYWORD_SYNONYMS[cLower] || [];
  if (synonyms.some((syn) => lowerCandidate.includes(syn))) return true;

  // Handle "X/Y" or "X, Y" compound keywords - a match on either side counts.
  const parts = cLower.split(/[/,]| and /).map((p) => p.trim()).filter(Boolean);
  const partsToCheck = parts.length > 1 ? parts : [cLower];

  return partsToCheck.some((part) => {
    if (lowerCandidate.includes(part)) return true;
    const words = part.split(/\s+/).filter(Boolean);
    return words.some(
      (w) => candidateKeywordSet.has(w) || (w.length > 4 && lowerCandidate.includes(w.slice(0, -1)))
    );
  });
}

/**
 * Score a candidate's answer as a Keyword Match out of 3 against a
 * question's exactly-3 predefined keywords (see InterviewQuestion.keywords /
 * FALLBACK_QUESTION_BANK[].keywords). This is the heuristic (no API key)
 * implementation of the "Answer Evaluation / Keyword Matching" requirement.
 */
function evaluateKeywordMatch(utterance, keywords = []) {
  const text = String(utterance || "").trim();
  const lowerCandidate = text.toLowerCase();
  const candidateKeywordSet = new Set(extractKeywords(text));
  const totalKeywords = Array.isArray(keywords) && keywords.length > 0 ? keywords.length : 3;

  const matchedKeywords = [];
  const missingKeywords = [];
  (keywords || []).forEach((kw) => {
    if (keywordIsPresent(kw, lowerCandidate, candidateKeywordSet)) {
      matchedKeywords.push(kw);
    } else {
      missingKeywords.push(kw);
    }
  });

  return {
    matchedKeywords,
    missingKeywords,
    keywordMatchCount: matchedKeywords.length,
    totalKeywords,
  };
}

/**
 * Compare candidate answer against the database's 3 predefined keywords
 * (primary signal, per the Keyword Match X/3 requirement) with the broader
 * expectedConcepts/correctAnswer comparison kept as a secondary signal for
 * nuanced feedback text.
 */
function computeHeuristicAnswerEvaluation(utterance, questionOrAnswer = {}, maybeConcepts = []) {
  const text = String(utterance || "").trim();
  const words = text.split(/\s+/).filter(Boolean);

  const modelAnswer = typeof questionOrAnswer === "string" ? questionOrAnswer : (questionOrAnswer?.correctAnswer || "");
  const keywords = Array.isArray(questionOrAnswer?.keywords) && questionOrAnswer.keywords.length > 0
    ? questionOrAnswer.keywords
    : (Array.isArray(maybeConcepts) && maybeConcepts.length > 0 ? maybeConcepts.slice(0, 3) : extractKeywords(modelAnswer).slice(0, 3));

  if (words.length < 3) {
    return {
      evaluation: "no_answer",
      score: 0,
      missingConcepts: keywords,
      matchedConcepts: [],
      matchedKeywords: [],
      missingKeywords: keywords,
      keywordMatchCount: 0,
      totalKeywords: keywords.length || 3,
      feedback: "No substantial answer recorded.",
    };
  }

  const { matchedKeywords, missingKeywords, keywordMatchCount, totalKeywords } = evaluateKeywordMatch(text, keywords);

  // Primary score: Keyword Match count out of however many keywords the
  // question has (normally 3), scaled to the existing 0-10 scale so the
  // rest of the pipeline (session.questionRecords, generateFinalReport)
  // keeps working unchanged.
  const matchRatio = totalKeywords > 0 ? keywordMatchCount / totalKeywords : 0;
  const score = Math.max(0, Math.min(10, Math.round(matchRatio * 10)));

  let evaluation;
  if (keywordMatchCount >= totalKeywords && totalKeywords > 0) {
    evaluation = "correct"; // 3/3
  } else if (keywordMatchCount >= Math.ceil(totalKeywords / 2)) {
    evaluation = "partial"; // e.g. 2/3
  } else {
    evaluation = "incorrect"; // 0/3 or 1/3, but an answer was given
  }

  return {
    evaluation,
    score,
    missingConcepts: missingKeywords,
    matchedConcepts: matchedKeywords,
    matchedKeywords,
    missingKeywords,
    keywordMatchCount,
    totalKeywords,
    feedback:
      evaluation === "correct"
        ? `Keyword Match: ${keywordMatchCount}/${totalKeywords} - covered ${matchedKeywords.join(", ")}.`
        : evaluation === "partial"
        ? `Keyword Match: ${keywordMatchCount}/${totalKeywords} - covered ${matchedKeywords.join(", ") || "some concepts"}; missed ${missingKeywords.join(", ")}.`
        : `Keyword Match: ${keywordMatchCount}/${totalKeywords} - missed core keywords (${missingKeywords.join(", ")}).`,
  };
}

const HEURISTIC_REPLIES = {
  correct: [
    "Excellent! That was accurate and directly addressed the core concepts.",
    "Very well explained! You captured the key technical points effectively.",
    "Great answer! That demonstrates clear knowledge of the workflow.",
  ],
  partial: [
    "Thank you. You covered some solid foundational points.",
    "Good start. Bringing in additional specific details makes it even stronger.",
    "Thanks for that response—you touched on relevant concepts.",
  ],
  incorrect: [
    "Thank you for sharing your thoughts on that question.",
    "Thanks for your response. Let's keep progressing through the interview.",
  ],
  no_answer: [
    "No worries at all, let's keep moving forward!",
    "That's completely fine—moving along to the next question.",
  ],
};

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function computeHeuristicTurn({ utterance, currentQuestion, quickIntent }) {
  const intent = quickIntent || detectQuickIntent(utterance);

  if (intent === "stop") {
    // Per the AI Mock Interview requirements, the candidate cannot manually
    // finish before all 5 questions are answered - "stop"/"end interview"
    // is acknowledged but does NOT end the session; Messi just re-asks the
    // current question instead of treating it as a hint/skip.
    return {
      intent: "stop",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `We need to finish all 5 questions before wrapping up - let's continue with this one: ${currentQuestion.question}`,
      askFollowUp: false,
    };
  }
  if (intent === "repeat") {
    return {
      intent: "repeat",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `Certainly! My question was: ${currentQuestion.question}`,
      askFollowUp: false,
    };
  }
  if (intent === "skip") {
    return {
      intent: "skip",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: currentQuestion.expectedConcepts || [],
      matchedKeywords: [],
      missingKeywords: currentQuestion.keywords || [],
      keywordMatchCount: 0,
      totalKeywords: (currentQuestion.keywords || []).length || 3,
      messiReply: "No problem at all, let's proceed to the next question.",
      askFollowUp: false,
    };
  }
  if (intent === "hint") {
    const hintTerm = (currentQuestion.keywords || currentQuestion.expectedConcepts || [])[0] || "the core definition";
    return {
      intent: "hint",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `Here's a clue: think about how ${hintTerm} relates to medical coding and healthcare billing.`,
      askFollowUp: false,
    };
  }
  if (intent === "clarify") {
    return {
      intent: "clarify",
      evaluation: "no_answer",
      score: 0,
      missingConcepts: [],
      messiReply: `To clarify: ${currentQuestion.question}`,
      askFollowUp: false,
    };
  }

  const evalResult = computeHeuristicAnswerEvaluation(utterance, currentQuestion);
  const messiReply = pick(HEURISTIC_REPLIES[evalResult.evaluation] || HEURISTIC_REPLIES.partial);
  return {
    intent: "answer",
    evaluation: evalResult.evaluation,
    score: evalResult.score,
    missingConcepts: evalResult.missingConcepts,
    matchedConcepts: evalResult.matchedConcepts,
    matchedKeywords: evalResult.matchedKeywords,
    missingKeywords: evalResult.missingKeywords,
    keywordMatchCount: evalResult.keywordMatchCount,
    totalKeywords: evalResult.totalKeywords,
    messiReply,
    askFollowUp: false,
  };
}

function cleanMessiReply(text) {
  let cleaned = String(text || "").trim();
  const AUDIO_COMPLAINT_RE =
    /audio|microphone|\bmic\b|inaudible|audible|cut(ting)? out|couldn'?t (hear|catch|understand)|can'?t (hear|catch|understand)|didn'?t (hear|catch|come through)|not able to hear|hear you|not connected|didn'?t connect|connect(ed|ing)? (correctly|properly)|connection (issue|problem|error|trouble)|check your (mic|audio|microphone|connection)|background noise|no sound|speak up/i;
  if (AUDIO_COMPLAINT_RE.test(cleaned)) {
    return "Thank you for sharing that! Let's continue to the next question.";
  }
  return cleaned;
}

function normalizeTurnResult(parsed, quickIntent, utterance, currentQuestion) {
  let intent = VALID_INTENTS.includes(parsed.intent) ? parsed.intent : "unclear";
  if (quickIntent === "stop") intent = "stop";

  const wordCount = String(utterance || "").trim().split(/\s+/).filter(Boolean).length;
  if (quickIntent === "answer" && wordCount >= 2 && (intent === "unclear" || intent === "skip")) {
    intent = "answer";
  }

  let evaluation = VALID_EVALUATIONS.includes(parsed.evaluation) ? parsed.evaluation : "no_answer";
  let score = Number.isFinite(Number(parsed.score)) ? Math.max(0, Math.min(10, Math.round(Number(parsed.score)))) : 0;
  let missingConcepts = Array.isArray(parsed.missingConcepts) ? parsed.missingConcepts.filter(Boolean).map(String) : [];
  let messiReply = typeof parsed.messiReply === "string" && parsed.messiReply.trim()
    ? cleanMessiReply(parsed.messiReply.trim())
    : "Thank you for sharing that response.";

  const totalKeywords = Array.isArray(currentQuestion.keywords) && currentQuestion.keywords.length > 0
    ? currentQuestion.keywords.length
    : 3;
  let matchedKeywords = Array.isArray(parsed.matchedKeywords) ? parsed.matchedKeywords.filter(Boolean).map(String) : [];
  let keywordMatchCount = Number.isFinite(Number(parsed.keywordMatchCount))
    ? Math.max(0, Math.min(totalKeywords, Math.round(Number(parsed.keywordMatchCount))))
    : matchedKeywords.length;
  let missingKeywords = Array.isArray(parsed.missingKeywords)
    ? parsed.missingKeywords.filter(Boolean).map(String)
    : (currentQuestion.keywords || []).filter((k) => !matchedKeywords.includes(k));

  // Safety fallback if LLM returned 0 for a non-trivial answer, or didn't
  // return keyword-match fields at all (older prompt cache / odd response).
  if (intent === "answer" && wordCount >= 3) {
    const heuristic = computeHeuristicAnswerEvaluation(utterance, currentQuestion);
    if (!parsed.keywordMatchCount && !Array.isArray(parsed.matchedKeywords)) {
      matchedKeywords = heuristic.matchedKeywords;
      missingKeywords = heuristic.missingKeywords;
      keywordMatchCount = heuristic.keywordMatchCount;
    }
    if (evaluation === "no_answer" || score === 0) {
      if (heuristic.score > score) {
        score = heuristic.score;
        evaluation = heuristic.evaluation;
        missingConcepts = heuristic.missingConcepts;
      }
    }
  }

  return {
    intent,
    evaluation,
    score,
    missingConcepts,
    matchedKeywords,
    missingKeywords,
    keywordMatchCount,
    totalKeywords,
    messiReply,
    askFollowUp: false,
  };
}

/**
 * Handle one candidate utterance: compare against database correctAnswer and return score & response
 */
async function getMessiTurn({ session, candidateUtterance }) {
  const utterance = String(candidateUtterance || "").trim();
  const currentQuestion = session.questions[session.currentQuestionIndex] || {};
  const quickIntent = detectQuickIntent(utterance);
  const key = apiKey();

  if (key) {
    try {
      const modelAnswerPart = currentQuestion.correctAnswer
        ? `\nReference / Correct Answer: "${currentQuestion.correctAnswer}"`
        : "";

      const expectedConceptsList = currentQuestion.expectedConcepts && currentQuestion.expectedConcepts.length > 0
        ? `\nExpected Key Concepts: ${JSON.stringify(currentQuestion.expectedConcepts)}`
        : "";
      const keywordsList = currentQuestion.keywords && currentQuestion.keywords.length > 0
        ? currentQuestion.keywords
        : ["", "", ""];

      const prompt = `You are evaluating a candidate's answer against the official Question & Reference Answer from the database.
Question (#${session.currentQuestionIndex + 1} of ${session.questions.length}, Topic: "${currentQuestion.topic || "Medical Coding"}"):
"${currentQuestion.question}"${modelAnswerPart}${expectedConceptsList}

The 3 predefined keywords/concepts for this question are: ${JSON.stringify(keywordsList)}

Candidate's Answer: "${utterance}"

Instructions:
1. For EACH of the 3 predefined keywords above, decide if the candidate's answer covers that keyword/concept - by MEANING, not exact wording (accept synonyms, paraphrases, and closely related terms as a match, e.g. "insurance company" for "payer", or "notes" for "documentation").
2. Set "matchedKeywords" to the subset of the 3 keywords the answer covers, "missingKeywords" to the rest, and "keywordMatchCount" to how many of the 3 were matched (0-3).
3. Rate "score" on a 0 to 10 scale, driven primarily by keywordMatchCount: 3/3 -> 8-10, 2/3 -> 5-7, 1/3 -> 2-4, 0/3 -> 0-1 (adjust slightly within each band for overall answer quality).
4. Set "evaluation" to "correct" (3/3 keywords), "partial" (2/3), "incorrect" (1/3 or 0/3 but an answer was attempted), or "no_answer" (blank/no real answer).
5. Also list any "missingConcepts" from the broader reference answer (for feedback only).
6. Provide a warm, brief 1-2 sentence conversational acknowledgment ("messiReply") that does NOT reveal the score or which keywords were missed.

Return STRICT JSON only:
{"intent": "answer|repeat|skip|hint|clarify|stop|unclear", "evaluation": "correct|partial|incorrect|no_answer", "score": 0-10, "matchedKeywords": string[], "missingKeywords": string[], "keywordMatchCount": 0-3, "missingConcepts": string[], "messiReply": string, "askFollowUp": false}`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 450,
          system: MESSI_SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.35,
        },
        { headers: authHeaders(key), timeout: 20000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return normalizeTurnResult(parsed, quickIntent, utterance, currentQuestion);
      }
    } catch (err) {
      console.warn("getMessiTurn LLM notice, using database answer comparison heuristic:", err.message);
    }
  }

  return computeHeuristicTurn({ utterance, currentQuestion, quickIntent });
}

// ---------------------------------------------------------------------------
// Final Report Generation from Evaluated Question Records
// ---------------------------------------------------------------------------
function clampPercent(n, fallback = 70) {
  const v = Number(n);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : fallback;
}

// Deterministic overall score per the "Calculate the overall score" /
// keyword-matching requirement: sum of Keyword Match counts across all
// questions, out of (numQuestions * 3) possible keyword matches. Falls back
// to the 0-10 `score` field for any record predating keyword tracking so
// old in-progress sessions still produce a sane score.
function computeOverallScoreFromKeywords(questionRecords = []) {
  if (!questionRecords.length) return 0;
  let totalMatched = 0;
  let totalPossible = 0;
  questionRecords.forEach((r) => {
    if (Number.isFinite(Number(r.keywordMatchCount)) && Number.isFinite(Number(r.totalKeywords)) && Number(r.totalKeywords) > 0) {
      totalMatched += Number(r.keywordMatchCount);
      totalPossible += Number(r.totalKeywords);
    } else {
      // Legacy record without keyword tracking - treat its 0-10 score as
      // an equivalent out-of-3 keyword match so the blend stays consistent.
      totalMatched += (Number(r.score) || 0) / (10 / 3);
      totalPossible += 3;
    }
  });
  return totalPossible > 0 ? Math.min(100, Math.max(0, Math.round((totalMatched / totalPossible) * 100))) : 0;
}

function computeHeuristicFinalReport({ candidateName, role, questionRecords = [] }) {
  const totalQuestions = Math.max(1, questionRecords.length);
  const overallScore = computeOverallScoreFromKeywords(questionRecords);

  const correctCount = questionRecords.filter((r) => r.evaluation === "correct").length;
  const partialCount = questionRecords.filter((r) => r.evaluation === "partial").length;
  const answeredCount = questionRecords.filter((r) => r.evaluation !== "no_answer").length;

  const technicalReadiness = overallScore;
  const clarity = clampPercent(50 + (correctCount / totalQuestions) * 40 + (partialCount / totalQuestions) * 10);
  const communication = clampPercent(50 + (answeredCount / totalQuestions) * 45);
  const confidence = clampPercent(Math.round((clarity + technicalReadiness) / 2));

  const questionAnalysis = questionRecords.map((r, idx) => {
    const totalKeywords = Number(r.totalKeywords) || 3;
    const keywordMatchCount = Number.isFinite(Number(r.keywordMatchCount)) ? Number(r.keywordMatchCount) : null;
    const keywordSummary = keywordMatchCount !== null ? `Keyword Match: ${keywordMatchCount}/${totalKeywords}. ` : "";
    return {
      questionNumber: idx + 1,
      topic: r.topic || `Question ${idx + 1}`,
      question: r.question,
      correctAnswer: r.correctAnswer || "",
      candidateAnswer: r.candidateAnswer || "(no answer)",
      evaluation: r.evaluation || "no_answer",
      score: Number(r.score) || 0,
      keywordMatchCount,
      totalKeywords,
      matchedKeywords: r.matchedKeywords || [],
      missingKeywords: r.missingKeywords || r.missingConcepts || [],
      feedback:
        keywordSummary +
        (r.evaluation === "correct"
          ? "Accurate answer covering all 3 core keywords/concepts."
          : r.evaluation === "partial"
          ? `Partially correct; missed key reference concepts (${(r.missingKeywords || r.missingConcepts || []).slice(0, 2).join(", ") || "details"}).`
          : r.evaluation === "no_answer"
          ? "No response was recorded for this question."
          : "Answer was inaccurate or did not align with the standard coding definition."),
    };
  });

  return {
    overallScore,
    breakdown: {
      technicalReadiness,
      communication,
      clarity,
      confidence,
      structuredThinking: clampPercent(Math.round((technicalReadiness + communication) / 2)),
    },
    questionAnalysis,
    finalFeedback: `${candidateName || "Candidate"} scored ${overallScore}% across ${totalQuestions} technical mock interview questions (${correctCount} strong, ${partialCount} partial). Demonstrates ${overallScore >= 75 ? "strong technical proficiency and ready for client placement" : "foundational awareness with room to reinforce standard coding guidelines"}.`,
    strengths: [
      correctCount >= 2 ? "Demonstrated clear understanding of core diagnostic and procedural coding definitions" : "Good communication cadence during the assessment",
      "Maintained professional composure throughout the interview session",
      answeredCount >= 4 ? "Attempted all assigned questions with active participation" : "Exhibited positive attitude towards technical evaluation",
    ],
    areasToImprove: [
      "Reinforce specific ICD-10-CM and CPT coding conventions and official guidelines",
      "Practice articulating E/M Medical Decision Making (MDM) criteria concisely",
      "Review denial management workflows (EOB/ERA resolution) and HIPAA compliance protocols",
    ],
    recommendedTopics: [
      "ICD-10-CM Coding Conventions & Guidelines",
      "CPT Modifiers & Procedure Sequencing",
      "E/M MDM Leveling Criteria",
      "Denial Management & Claim Appeals",
    ],
  };
}

/**
 * Generate final scored report from question records evaluated against the database key
 */
async function generateFinalReport({ candidateName = "", role = "", questionRecords = [] } = {}) {
  const key = apiKey();
  if (!questionRecords.length) {
    return computeHeuristicFinalReport({ candidateName, role, questionRecords: [] });
  }

  if (key) {
    try {
      const transcript = questionRecords
        .map(
          (r, idx) =>
            `Q${idx + 1} (${r.topic || "General"}): "${r.question}"\nReference Answer: "${r.correctAnswer || "N/A"}"\nCandidate Answer: "${r.candidateAnswer || "(no answer)"}"\nScore: ${r.score}/10 (Evaluation: ${r.evaluation})`
        )
        .join("\n\n");

      const prompt = `Here is the full transcript of a 5-question technical medical coding mock interview for ${candidateName || "the candidate"}:

${transcript}

Produce the final comprehensive evaluation report.
Calculate overallScore (0-100) strictly from the question scores: overallScore = round((sum of scores / (number of questions * 10)) * 100).
Return STRICT JSON only:
{
  "overallScore": number (0-100),
  "breakdown": {
    "technicalReadiness": number (0-100),
    "communication": number (0-100),
    "clarity": number (0-100),
    "confidence": number (0-100),
    "structuredThinking": number (0-100)
  },
  "questionAnalysis": [
    {
      "questionNumber": number,
      "topic": string,
      "question": string,
      "correctAnswer": string,
      "candidateAnswer": string,
      "evaluation": "correct|partial|incorrect|no_answer",
      "score": number (0-10),
      "feedback": string
    }
  ],
  "finalFeedback": string,
  "strengths": string[],
  "areasToImprove": string[],
  "recommendedTopics": string[]
}`;

      const response = await axios.post(
        ANTHROPIC_URL,
        {
          model: MODEL,
          max_tokens: 2200,
          system: "You are a senior healthcare RCM & Medical Coding director providing a rigorous, fair interview evaluation report. Return valid JSON only.",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
        },
        { headers: authHeaders(key), timeout: 25000 }
      );

      const text = response.data?.content?.[0]?.text || "";
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        if (parsed && typeof parsed.overallScore !== "undefined" && Array.isArray(parsed.questionAnalysis)) {
          // overallScore is always recomputed deterministically from the
          // stored per-question Keyword Match counts (not trusted from the
          // LLM) so the final score is reliable and reproducible - see the
          // "Calculate the overall score" requirement.
          const overallScore = computeOverallScoreFromKeywords(questionRecords);
          // Likewise, merge our own tracked keyword-match fields into each
          // question's analysis - the LLM's questionAnalysis has no reason
          // to know these, but the report needs to display them.
          const questionAnalysis = parsed.questionAnalysis.map((qa, idx) => {
            const record = questionRecords[idx] || {};
            const totalKeywords = Number(record.totalKeywords) || 3;
            const keywordMatchCount = Number.isFinite(Number(record.keywordMatchCount)) ? Number(record.keywordMatchCount) : null;
            return {
              ...qa,
              keywordMatchCount,
              totalKeywords,
              matchedKeywords: record.matchedKeywords || [],
              missingKeywords: record.missingKeywords || record.missingConcepts || [],
            };
          });
          return {
            overallScore,
            breakdown: {
              technicalReadiness: clampPercent(parsed.breakdown?.technicalReadiness),
              communication: clampPercent(parsed.breakdown?.communication),
              clarity: clampPercent(parsed.breakdown?.clarity),
              confidence: clampPercent(parsed.breakdown?.confidence),
              structuredThinking: clampPercent(parsed.breakdown?.structuredThinking),
            },
            questionAnalysis,
            finalFeedback: parsed.finalFeedback || "",
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
            areasToImprove: Array.isArray(parsed.areasToImprove) ? parsed.areasToImprove : [],
            recommendedTopics: Array.isArray(parsed.recommendedTopics) ? parsed.recommendedTopics : [],
          };
        }
      }
    } catch (err) {
      console.warn("generateFinalReport LLM notice, using database key calculator:", err.message);
    }
  }

  return computeHeuristicFinalReport({ candidateName, role, questionRecords });
}

module.exports = {
  generateInterviewQuestions,
  getMessiTurn,
  generateFinalReport,
  detectQuickIntent,
  computeHeuristicAnswerEvaluation,
  pickRandomFallbackQuestions,
  DOMAIN_INTERVIEW_BANKS,
  FALLBACK_QUESTION_BANK,
  normalizeQText,
};
