/**
 * Default Stage 4 Assessment Questions across the 4 Core Healthcare Domains:
 * 1. Medical Coding
 * 2. Medical Billing
 * 3. Accounts Receivable (AR)
 * 4. Front Office
 *
 * Each domain provides 5 distinct syllabus sections × 2 questions = 10 questions total.
 * Used for initial database seeding and baseline fallback.
 */

const DEFAULT_ASSESSMENT_DOMAINS = [
  {
    domain: "Medical Coding",
    sections: [
      {
        key: "anatomy",
        name: "Anatomy & Physiology",
        icon: "🫀",
        sub: "Body systems, organ location, common clinical anatomy",
        order: 1,
        questions: [
          {
            topic: "Cardiovascular System",
            question: "Which chamber of the human heart is responsible for pumping oxygenated blood into the systemic circulation via the aorta?",
            options: ["Right atrium", "Right ventricle", "Left ventricle", "Left atrium"],
            correct: 2,
            explanation: "The left ventricle possesses the thickest muscular myocardium to pump oxygenated blood through the aortic valve into systemic circulation.",
          },
          {
            topic: "Endocrine System",
            question: "Which endocrine glands are situated superiorly on the upper pole of each kidney?",
            options: ["Thyroid glands", "Adrenal (Suprarenal) glands", "Parathyroid glands", "Pituitary gland"],
            correct: 1,
            explanation: "The adrenal glands sit directly atop the kidneys and secrete vital hormones including aldosterone, cortisol, and adrenaline.",
          },
        ],
      },
      {
        key: "medterm",
        name: "Medical Terminology",
        icon: "📖",
        sub: "Prefixes, suffixes, root words, common abbreviations",
        order: 2,
        questions: [
          {
            topic: "Word Roots",
            question: "What anatomical structure is referred to by the combining root form 'Chondr/o'?",
            options: ["Bone marrow", "Cartilage", "Joint cavity", "Tendon sheath"],
            correct: 1,
            explanation: "'Chondr/o' is the Greek combining form for cartilage (e.g., chondroma, chondromalacia).",
          },
          {
            topic: "Surgical Suffixes",
            question: "Which surgical suffix indicates the surgical excision or complete removal of an organ or tissue?",
            options: ["-otomy (incision into)", "-ostomy (creation of an opening)", "-ectomy (surgical removal)", "-plasty (surgical repair)"],
            correct: 2,
            explanation: "'-ectomy' denotes surgical removal or excision (e.g., appendectomy, cholecystectomy).",
          },
        ],
      },
      {
        key: "aptitude",
        name: "General Aptitude & Logic",
        icon: "🧠",
        sub: "Logic, reasoning, English comprehension, auditing math",
        order: 3,
        questions: [
          {
            topic: "Auditing Math",
            question: "A quality auditor reviews 120 medical charts during an 8-hour shift and identifies a 5% coding error rate. Exactly how many charts were coded accurately?",
            options: ["112 charts", "114 charts", "116 charts", "110 charts"],
            correct: 1,
            explanation: "5% of 120 charts = 6 erroneous charts. 120 - 6 = 114 completely accurate charts (95% accuracy).",
          },
          {
            topic: "Sequential Logic",
            question: "In a billing queue: Claim P is adjudicated before Claim Q. Claim R is adjudicated after Claim Q but before Claim S. Which claim is adjudicated FIRST?",
            options: ["Claim Q", "Claim R", "Claim P", "Claim S"],
            correct: 2,
            explanation: "Sequence: P -> Q -> R -> S. Therefore, Claim P is processed first.",
          },
        ],
      },
      {
        key: "basicicd",
        name: "Basic ICD-10-CM",
        icon: "📊",
        sub: "ICD-10-CM structure, conventions, guidelines, sequencing",
        order: 4,
        questions: [
          {
            topic: "Sequencing Guidelines",
            question: "According to ICD-10-CM Official Coding Guidelines, when an underlying condition (etiology) produces a secondary manifestation, how must the codes be sequenced?",
            options: [
              "The manifestation code is always sequenced first",
              "The underlying etiology code is sequenced first, followed by the manifestation code",
              "Either code may be sequenced in any random order",
              "Only the manifestation code is reported",
            ],
            correct: 1,
            explanation: "ICD-10-CM guidelines mandate 'Code First underlying disease' sequencing: etiology followed by manifestation code.",
          },
          {
            topic: "7th Character Extenders",
            question: "In ICD-10-CM Chapter 19 (Injury and Poisoning), what does the 7th character 'A' designate?",
            options: [
              "Subsequent encounter for fracture with routine healing",
              "Initial encounter for active treatment of the injury",
              "Sequela or late effect of previous trauma",
              "Adverse effect of therapeutic drug",
            ],
            correct: 1,
            explanation: "Character 'A' indicates the initial encounter while the patient is receiving active treatment for the condition.",
          },
        ],
      },
      {
        key: "cpt_specialty",
        name: "CPT / HCPCS & Modifiers",
        icon: "🎯",
        sub: "CPT procedural coding, modifiers -25 and -59, global periods",
        order: 5,
        questions: [
          {
            topic: "CPT Modifiers",
            question: "Which modifier is appropriately appended to an E/M service code to indicate a significant, separately identifiable E/M service performed on the same day as a minor surgical procedure?",
            options: [
              "Modifier -59 (Distinct procedural service)",
              "Modifier -25 (Significant, separately identifiable E/M)",
              "Modifier -51 (Multiple procedures)",
              "Modifier -22 (Increased procedural services)",
            ],
            correct: 1,
            explanation: "Modifier -25 allows reimbursement for a significant, separately identifiable E/M service performed on the same calendar day as a minor procedure.",
          },
          {
            topic: "Global Surgical Package",
            question: "Under standard CMS Global Surgical Package rules, routine uncomplicated postoperative follow-up visits within a 90-day major global surgery period are:",
            options: [
              "Separately billable with modifier -25",
              "Included in the global surgical fee and not separately billable",
              "Billed under CPT 99214 to the patient directly",
              "Billed to the secondary insurance carrier",
            ],
            correct: 1,
            explanation: "Routine postoperative care related to surgical recovery within the global period is included in the global surgical reimbursement package.",
          },
        ],
      },
    ],
  },
  {
    domain: "Medical Billing",
    sections: [
      {
        key: "insurance_payers",
        name: "Insurance Types & Payers",
        icon: "🏥",
        sub: "Medicare Part A/B/C/D, Medicaid, Commercial HMO/PPO plans",
        order: 1,
        questions: [
          {
            topic: "Medicare Programs",
            question: "Which part of the US Medicare program covers inpatient hospital stays, skilled nursing facility care, and hospice care?",
            options: ["Medicare Part A", "Medicare Part B", "Medicare Part C (Medicare Advantage)", "Medicare Part D"],
            correct: 0,
            explanation: "Medicare Part A is Hospital Insurance covering inpatient hospital stays, skilled nursing, home health, and hospice services.",
          },
          {
            topic: "Commercial Plan Types",
            question: "In a Health Maintenance Organization (HMO) plan, what is generally required before a patient can see an in-network specialist?",
            options: [
              "A direct cash deposit paid to the hospital",
              "A Primary Care Physician (PCP) referral",
              "Filing an insurance appeal form",
              "Submitting an ABN waiver directly to CMS",
            ],
            correct: 1,
            explanation: "HMO plans enforce gatekeeping where the designated Primary Care Physician (PCP) must authorize and submit a referral before visiting a specialist.",
          },
        ],
      },
      {
        key: "billing_identifiers",
        name: "Billing Terminology & Identifiers",
        icon: "📖",
        sub: "NPI, Taxonomy, Place of Service (POS) codes, clearinghouse",
        order: 2,
        questions: [
          {
            topic: "National Provider Identifier",
            question: "How many digits does a National Provider Identifier (NPI) contain under HIPAA standards?",
            options: ["8 digits", "9 digits", "10 digits", "12 digits"],
            correct: 2,
            explanation: "The NPI is an intelligence-free, 10-digit numerical identifier mandated by HIPAA for covered healthcare providers.",
          },
          {
            topic: "Place of Service Codes",
            question: "Which Place of Service (POS) code is designated on a professional CMS-1500 claim for an encounter occurring in an Office setting?",
            options: ["POS 11", "POS 21", "POS 22", "POS 12"],
            correct: 0,
            explanation: "POS 11 denotes a Physician Office location, while POS 21 is Inpatient Hospital and POS 22 is On-Campus Outpatient Hospital.",
          },
        ],
      },
      {
        key: "claim_submission",
        name: "Claims Submission & RCM",
        icon: "📝",
        sub: "CMS-1500, UB-04, EDI 837P/837I, clean claim scrubbing",
        order: 3,
        questions: [
          {
            topic: "Standard Claim Forms",
            question: "Which claim form is used for billing professional outpatient physician services versus institutional facility hospital charges?",
            options: [
              "CMS-1500 for professional claims; UB-04 (CMS-1450) for institutional claims",
              "UB-04 for professional claims; CMS-1500 for institutional claims",
              "ADA Dental form for both hospital and physician claims",
              "CMS-R-131 for all outpatient claims",
            ],
            correct: 0,
            explanation: "The CMS-1500 form (electronic 837P) is for professional physician billing; UB-04 (electronic 837I) is for institutional facility billing.",
          },
          {
            topic: "Clearinghouse Operations",
            question: "What is the primary function of an electronic healthcare clearinghouse prior to transmitting claims to insurance payers?",
            options: [
              "Auditing clinical surgical operative notes for malpractice",
              "Scrubbing claims for formatting, syntax, and coding edits to ensure clean submission",
              "Collecting patient copayments over the phone",
              "Providing direct medical diagnosis advice to providers",
            ],
            correct: 1,
            explanation: "Clearinghouses perform claim scrubbing (checking ANSI syntax, NPI, ICD/CPT validity) to maximize clean claim acceptance rates.",
          },
        ],
      },
      {
        key: "payment_posting",
        name: "Payment Posting & Remittance",
        icon: "💵",
        sub: "ERA 835, EOB reconciliation, contractual write-offs, copays",
        order: 4,
        questions: [
          {
            topic: "Electronic Remittance Advice",
            question: "Which ANSI ASC X12 electronic transaction standard represents the Electronic Remittance Advice (ERA) received from payers?",
            options: ["EDI 837", "EDI 835", "EDI 270", "EDI 276"],
            correct: 1,
            explanation: "EDI 835 is the standard Electronic Remittance Advice (ERA) containing payment details, allowances, write-offs, and patient responsibility.",
          },
          {
            topic: "Contractual Adjustments",
            question: "When a participating in-network provider bills $200 for a service and the payer's contracted allowed amount is $120, what is the $80 difference classified as?",
            options: [
              "Patient balance due to bill to the patient",
              "Contractual adjustment / contractual write-off",
              "Fraudulent overcharge penalty",
              "Bad debt allowance",
            ],
            correct: 1,
            explanation: "In-network providers agree to accept the contracted allowed fee; the difference between billed charge and allowed amount is written off as a contractual adjustment.",
          },
        ],
      },
      {
        key: "billing_math",
        name: "Billing Math & Compliance",
        icon: "⚖️",
        sub: "Deductible, co-insurance, out-of-pocket maximum, HIPAA rules",
        order: 5,
        questions: [
          {
            topic: "Cost-Sharing Calculations",
            question: "A patient has a $500 annual deductible (none met yet) and an 80/20 coinsurance. If their first allowed medical claim is $800, how much does the patient owe in total?",
            options: ["$500", "$560", "$600", "$160"],
            correct: 1,
            explanation: "Patient pays $500 deductible first, leaving $300 balance. 20% coinsurance on $300 = $60. Total patient liability = $500 + $60 = $560.",
          },
          {
            topic: "Billing Regulatory Compliance",
            question: "Submitting claims for higher-paying service codes than the documentation supports is illegal under federal healthcare fraud statutes and is known as:",
            options: ["Upcoding", "Unbundling", "Balance billing", "Underbilling"],
            correct: 0,
            explanation: "Upcoding is the fraudulent practice of billing a higher code level than medically indicated or documented to artificially increase reimbursement.",
          },
        ],
      },
    ],
  },
  {
    domain: "Accounts Receivable",
    sections: [
      {
        key: "ar_fundamentals",
        name: "AR Fundamentals & Aging",
        icon: "⏳",
        sub: "30/60/90/120+ aging buckets, Days in AR (DAR), RCM KPIs",
        order: 1,
        questions: [
          {
            topic: "Days in AR Metric",
            question: "How is the industry-standard KPI 'Days in Accounts Receivable' (Days in AR) calculated?",
            options: [
              "Total AR divided by Average Daily Charges",
              "Total Billed Charges multiplied by 30 days",
              "Total Denials divided by Total Payments",
              "Total Net Collections minus Total Write-offs",
            ],
            correct: 0,
            explanation: "Days in AR = Total Current Accounts Receivable / (Total Gross Charges billed over period / Number of days in period).",
          },
          {
            topic: "Aging Bucket Priority",
            question: "In hospital and clinic AR workflows, which aging bucket represents the highest risk of write-off due to timely filing expirations?",
            options: ["0–30 Days", "31–60 Days", "61–90 Days", "120+ Days"],
            correct: 3,
            explanation: "Claims exceeding 120+ days carry severe risk of payer timely filing limits expiring and require urgent escalation or appeal.",
          },
        ],
      },
      {
        key: "denial_management",
        name: "Denial Management & Codes",
        icon: "🚫",
        sub: "CARC and RARC codes, Claim Adjustment Reason Code analysis",
        order: 2,
        questions: [
          {
            topic: "CARC Group Codes",
            question: "On an 835 Remittance Advice, which Group Code denotes a Contractual Obligation that the provider must write off and cannot balance bill to the patient?",
            options: ["PR (Patient Responsibility)", "CO (Contractual Obligation)", "OA (Other Adjustment)", "CR (Correction and Reversal)"],
            correct: 1,
            explanation: "CO (Contractual Obligation) indicates adjustments mandated by provider contract with the payer which cannot be billed to the patient.",
          },
          {
            topic: "Common Denial Codes",
            question: "CARC Code 16 ('Claim/service lacks information or has submission/billing error') is best classified as which type of denial?",
            options: [
              "Technical / Missing Information denial (correctable with additional details)",
              "Hard medical necessity denial requiring physician peer-to-peer review",
              "Non-covered benefit denial payable only by patient cash",
              "Duplicate claim submission error requiring immediate write-off",
            ],
            correct: 0,
            explanation: "CARC 16 is a soft demographic or missing field denial (e.g. missing NPI, incorrect policy number) that can be corrected and rebilled immediately.",
          },
        ],
      },
      {
        key: "payer_followup",
        name: "Payer Follow-Up & Appeals",
        icon: "📞",
        sub: "IVR calling protocols, web portal follow-up, timely filing",
        order: 3,
        questions: [
          {
            topic: "AR Calling Protocol",
            question: "When calling a commercial insurance representative regarding a 60-day unpaid claim, what essential information must the AR caller document in the billing note?",
            options: [
              "Representative name, call reference number, claim status, and expected adjudication date",
              "Only the provider's tax ID and time of call",
              "The patient's personal home address and mobile number only",
              "The representative's personal opinion of the doctor",
            ],
            correct: 0,
            explanation: "Standard AR documentation requires: Representative name/ID, Call Reference Number, Claim Status/Reason, Next action, and Expected turnaround time.",
          },
          {
            topic: "Timely Filing Proof",
            question: "When appealing a claim denied for 'Timely Filing Exceeded', which document serves as acceptable proof of timely electronic submission?",
            options: [
              "The internal clinic appointment schedule calendar",
              "Clearinghouse 999 or 277 electronic claim acceptance report showing EDI transmission date",
              "A copy of the patient's driver's license",
              "The physician's prescription pad",
            ],
            correct: 1,
            explanation: "Clearinghouse EDI batch acceptance confirmation reports (277/999/Level 2 report) prove the exact timestamp the claim was accepted into the payer gateway.",
          },
        ],
      },
      {
        key: "patient_ar",
        name: "Patient AR & Collections",
        icon: "💳",
        sub: "Patient statements, balance billing, financial hardship, bad debt",
        order: 4,
        questions: [
          {
            topic: "Patient Billing Process",
            question: "When is it appropriate to send a billing statement to a patient for their portion of the medical bill?",
            options: [
              "Immediately before the patient sees the physician",
              "Only after the primary (and secondary, if applicable) insurance has adjudicated and returned the EOB/ERA",
              "Whenever clinic cash flow is low, regardless of claim status",
              "Before submitting the claim to the insurance company",
            ],
            correct: 1,
            explanation: "Patient statements must only be generated after insurance has adjudicated the claim to verify the exact patient responsibility (deductible/coinsurance).",
          },
          {
            topic: "Balance Billing Restrictions",
            question: "Under the federal 'No Surprises Act', out-of-network balance billing is prohibited for:",
            options: [
              "Elective cosmetic surgical procedures booked 6 months in advance",
              "Emergency services and non-emergency services by out-of-network providers at in-network facilities",
              "Routine adult dental cleanings",
              "Over-the-counter wellness pharmacy purchases",
            ],
            correct: 1,
            explanation: "The No Surprises Act protects patients from unexpected balance bills for emergency services and out-of-network care at in-network hospitals.",
          },
        ],
      },
      {
        key: "recovery_math",
        name: "Recovery Math & Root-Cause",
        icon: "📈",
        sub: "Net collection percentage, clean claim rate, appeal overturns",
        order: 5,
        questions: [
          {
            topic: "Net Collection Rate",
            question: "If a medical practice collects $95,000 from payers and patients against an allowed amount of $100,000, what is the Net Collection Rate?",
            options: ["85%", "90%", "95%", "99%"],
            correct: 2,
            explanation: "Net Collection Rate = (Total Payments / Allowed Amount) × 100 = ($95,000 / $100,000) × 100 = 95%. (Target benchmark is ≥ 95%).",
          },
          {
            topic: "Root-Cause Analysis",
            question: "An AR team identifies that 40% of their recent denials are CARC 27 ('Expenses incurred after coverage terminated'). What front-end fix prevents this denial?",
            options: [
              "Hiring more coding auditors to review surgical notes",
              "Performing real-time electronic insurance eligibility verification (270/271) prior to or at date of service",
              "Changing the CPT modifiers from -25 to -59",
              "Writing off all claims automatically after 30 days",
            ],
            correct: 1,
            explanation: "Verifying active eligibility via real-time EDI 270/271 transaction before rendering service prevents terminated coverage denials at the front end.",
          },
        ],
      },
    ],
  },
  {
    domain: "Front Office",
    sections: [
      {
        key: "patient_scheduling",
        name: "Patient Scheduling & Intake",
        icon: "🗓️",
        sub: "Appointment triage, new vs established, provider template setup",
        order: 1,
        questions: [
          {
            topic: "Patient Scheduling Triage",
            question: "Under standard CPT guidelines, how is an 'Established Patient' distinguished from a 'New Patient'?",
            options: [
              "A patient who has received professional services from the physician or same-specialty group practice within the past 3 years",
              "A patient who has visited the clinic within the last 10 years",
              "Any patient with active commercial health insurance",
              "A patient whose immediate family member was treated previously",
            ],
            correct: 0,
            explanation: "An established patient has received professional services from the physician or another physician of the same specialty in the same group practice within 3 years.",
          },
          {
            topic: "No-Show Management",
            question: "What is an effective front-office administrative protocol to minimize clinic appointment no-shows?",
            options: [
              "Automated multi-channel appointment reminders (SMS/email/call) 24–48 hours in advance",
              "Charging the patient's credit card before scheduling without consent",
              "Double-booking every single calendar time slot",
              "Canceling patient appointments without notice",
            ],
            correct: 0,
            explanation: "Automated SMS, email, and phone appointment confirmation reminders 24-48 hours prior to service consistently reduce clinic no-show rates.",
          },
        ],
      },
      {
        key: "eligibility_preauth",
        name: "Eligibility & Prior Authorization",
        icon: "🛡️",
        sub: "Real-time 270/271 verification, precertification, referrals",
        order: 2,
        questions: [
          {
            topic: "EDI Eligibility Transactions",
            question: "Which HIPAA electronic EDI transaction standard is used by the front office to query an insurance payer for real-time patient benefit eligibility?",
            options: ["EDI 837", "EDI 270", "EDI 835", "EDI 277"],
            correct: 1,
            explanation: "EDI 270 is the Eligibility Inquiry transaction sent to the payer; EDI 271 is the Eligibility Response returned with coverage details.",
          },
          {
            topic: "Prior Authorization Protocol",
            question: "If a specialist orders an outpatient MRI that requires Prior Authorization, when must authorization be secured from the payer?",
            options: [
              "Within 30 days after the procedure is completed",
              "Before the diagnostic MRI procedure is rendered",
              "When the patient receives the final bill in the mail",
              "Prior authorization is never required for MRI scans",
            ],
            correct: 1,
            explanation: "Prior authorization must be approved by the payer prior to rendering non-emergent elective diagnostic scans to guarantee coverage.",
          },
        ],
      },
      {
        key: "demographics_hipaa",
        name: "Patient Demographics & HIPAA",
        icon: "📋",
        sub: "Registration accuracy, Notice of Privacy Practices, PHI privacy",
        order: 3,
        questions: [
          {
            topic: "Registration Data Accuracy",
            question: "Why is entering the patient's full legal name exactly as it appears on their insurance card critical at front-desk registration?",
            options: [
              "To prevent automated claim rejections due to payer demographic mismatch",
              "It is required by the local post office for delivery",
              "To print patient labels with decorative formatting",
              "Payer cards only contain nicknames",
            ],
            correct: 0,
            explanation: "Payer claims engines match subscriber name, DOB, and policy ID. Mismatches cause immediate 277 clearinghouse rejections.",
          },
          {
            topic: "HIPAA Physical Safeguards",
            question: "Which practice complies with HIPAA Privacy Rules in a busy outpatient front-office reception waiting area?",
            options: [
              "Shouting patient medical diagnoses across the waiting room",
              "Positioning computer monitor screens facing away from the public counter or using privacy filters",
              "Leaving paper patient intake charts unattended on the counter",
              "Sharing patient record passwords on sticky notes",
            ],
            correct: 1,
            explanation: "HIPAA mandates physical safeguards including privacy filters, angled monitors, and secure chart storage to prevent unauthorized disclosure of PHI.",
          },
        ],
      },
      {
        key: "frontdesk_collections",
        name: "Front-Desk Collections & Service",
        icon: "🤝",
        sub: "Point-of-service copay collections, receipts, empathetic service",
        order: 4,
        questions: [
          {
            topic: "Point-of-Service Collections",
            question: "When is the most effective and standard time for front desk staff to collect a patient's insurance copayment?",
            options: [
              "At patient check-in prior to seeing the physician",
              "Mailing a paper bill 6 months later",
              "While the patient is on the operating table",
              "Copayments are optional and never collected",
            ],
            correct: 0,
            explanation: "Collecting copayments at check-in (Point of Service) achieves near 100% collection rate and eliminates costly back-end patient billing.",
          },
          {
            topic: "Financial Communication",
            question: "If a patient is surprised by an upfront coinsurance amount, how should professional front desk staff respond?",
            options: [
              "Refuse to answer questions and threaten legal action",
              "Review the verified benefits breakdown calmly, explain insurer cost-sharing terms, and discuss clinic payment plan options",
              "Advise the patient to skip their medical appointment",
              "Waive all insurance copayments without payer authorization",
            ],
            correct: 1,
            explanation: "Professional front office staff explain benefit breakdown with transparency and offer clinic payment arrangements while adhering to contractual obligations.",
          },
        ],
      },
      {
        key: "coordination_benefits",
        name: "Coordination of Benefits & Referrals",
        icon: "🔄",
        sub: "Birthday rule for dependents, primary vs secondary, referrals",
        order: 5,
        questions: [
          {
            topic: "Birthday Rule",
            question: "Under the standard insurance 'Birthday Rule' for a dependent child covered under both parents' health plans, which plan is primary?",
            options: [
              "The plan of the parent whose birthday (month and day) falls earlier in the calendar year",
              "The plan of the older parent by age",
              "The plan with the higher annual deductible",
              "The father's insurance plan is always primary by default",
            ],
            correct: 0,
            explanation: "The Birthday Rule specifies that the plan of the parent whose birth date (month and day, regardless of year) falls earliest in the calendar year is primary.",
          },
          {
            topic: "Referral Tracking",
            question: "If a patient arrives at a specialty clinic with an expired or missing HMO referral, what action must the front office take?",
            options: [
              "Immediately send the patient to emergency surgery",
              "Contact the patient's PCP office to obtain the valid referral before the specialist visit, or inform the patient of financial liability",
              "Bill the claim directly to Medicare Part A",
              "Alter the physician NPI on the claim",
            ],
            correct: 1,
            explanation: "Without a valid HMO referral on file prior to service, the claim will be denied by the payer as non-covered without authorization.",
          },
        ],
      },
    ],
  },
];

const DEFAULT_ASSESSMENT_QUESTIONS = [];
DEFAULT_ASSESSMENT_DOMAINS.forEach((domainItem) => {
  domainItem.sections.forEach((sec, sIdx) => {
    sec.questions.forEach((q, qIdx) => {
      DEFAULT_ASSESSMENT_QUESTIONS.push({
        domain: domainItem.domain,
        sectionKey: sec.key,
        sectionName: sec.name,
        sectionIcon: sec.icon,
        sectionSub: sec.sub || "",
        sectionOrder: sec.order || sIdx + 1,
        topic: q.topic || "",
        question: q.question,
        options: q.options,
        correct: q.correct,
        explanation: q.explanation || "",
        order: (sIdx + 1) * 10 + (qIdx + 1),
        active: true,
      });
    });
  });
});

module.exports = { DEFAULT_ASSESSMENT_DOMAINS, DEFAULT_ASSESSMENT_QUESTIONS };

