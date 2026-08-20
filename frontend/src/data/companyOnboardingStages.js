/**
 * Company onboarding wizard — 9 stages, ported field-for-field from the
 * prototype (see /home/claude/work/company_flow_spec.md section 4.2).
 *
 * Each stage: { id, name, sub, color, items: [ {id, name, desc?, tag, input, placeholder?, options?, maxlength?} ] }
 * `tag`: "must" | "opt" | "cond" (cond = conditionally required, shown as COND)
 * `input`: text | gstin | pan | email | url | number | phone | date | select
 *          | textarea | multi | file | name-email
 *
 * Field ids are stored as keys on the company's `stage{id}` Mixed object in
 * the backend (see backend/routes/company.js) — keep them stable once used.
 */

const CITY_OPTIONS = [
  "Chennai", "Hyderabad", "Bangalore", "Coimbatore", "Pune", "Mumbai", "Noida",
  "Trichy", "Kerala", "Vizag", "Ahmedabad", "Jaipur", "Delhi NCR", "Kolkata", "Other",
];

const CODING_SPECIALTIES = [
  "E/M", "HCC / Risk Adjustment", "ED Coding", "IP-DRG", "OP", "Surgery",
  "Anesthesia", "Radiology", "Pathology", "Cardiology", "Home Health / HHC", "Wound Care",
];

const BILLING_SPECIALTIES = [
  "Charge Entry", "Payment Posting", "Claims Submission", "Denial Management",
  "AR Calling", "Pre-Authorization", "Credentialing", "Eligibility & Benefits",
];

const EHR_TOOLS = [
  "Epic", "Cerner", "3M", "AthenaHealth", "NextGen", "Allscripts",
  "eClinicalWorks", "Optum", "McKesson", "Other",
];

const ROLE_TITLES = [
  "Junior Coder", "Senior Coder", "QA Auditor", "AR Caller", "Team Lead",
  "Trainer", "Denial Specialist", "Manager",
];

export const ONBOARDING_STAGES = [
  {
    id: "1a",
    key: "1A",
    name: "Account & KYC",
    sub: "Legal, compliance & financial documents",
    items: [
      { id: "legalname", name: "Company legal name", desc: "Exact registered name as on GST", tag: "must", input: "text", placeholder: "e.g. Acme Healthcare Pvt Ltd" },
      { id: "gstin", name: "GSTIN", desc: "15-char GST registration number", tag: "must", input: "gstin", placeholder: "33AAAAA0000A1Z5" },
      { id: "pan", name: "PAN", desc: "10-char company PAN", tag: "must", input: "pan", placeholder: "AAAAA0000A" },
      { id: "entity", name: "Type of entity", tag: "must", input: "select", options: ["Private Limited", "LLP", "Public Limited", "Sole Proprietorship", "Partnership Firm", "OPC"] },
      { id: "doi", name: "Date of incorporation", tag: "must", input: "date" },
      { id: "cosize", name: "Company size", tag: "must", input: "select", options: ["1–50", "51–200", "201–500", "501–1,000", "1,001–5,000", "5,000+"] },
      { id: "regaddress", name: "Registered address", desc: "Address as on GST certificate", tag: "must", input: "textarea" },
      { id: "opaddress", name: "Operating address", desc: "Leave blank if same as registered", tag: "opt", input: "textarea" },
      { id: "website", name: "Company website URL", tag: "opt", input: "url", placeholder: "https://acme.com" },
      { id: "signatory", name: "Authorized signatory", desc: "Person who signs MOU + invoices", tag: "must", input: "name-email" },
      { id: "kycgst", name: "KYC: GST certificate", desc: "PDF/JPG ≤ 2MB", tag: "must", input: "file" },
      { id: "kycpan", name: "KYC: PAN card", desc: "PDF/JPG ≤ 2MB", tag: "must", input: "file" },
      { id: "kycincorp", name: "KYC: Certificate of Incorporation", desc: "Pvt Ltd / LLP only", tag: "cond", input: "file" },
      { id: "kyccheque", name: "KYC: Cancelled cheque", desc: "For direct bank transfers", tag: "cond", input: "file" },
      { id: "msme", name: "MSME / Startup India certificate", desc: "Optional — unlocks pricing benefits", tag: "opt", input: "file" },
    ],
  },
  {
    id: "1b",
    key: "1B",
    name: "Point of Contact",
    sub: "Person we engage with daily",
    items: [
      { id: "pocname", name: "POC name", tag: "must", input: "text" },
      { id: "pocdesig", name: "POC designation", tag: "must", input: "text", placeholder: "e.g. Head of TA" },
      { id: "pocemail", name: "POC email", desc: "OTP-verified", tag: "must", input: "email" },
      { id: "pocmobile", name: "POC mobile", desc: "OTP-verified · +91", tag: "must", input: "phone" },
    ],
  },
  {
    id: "2",
    key: "2",
    name: "Company Profile",
    sub: "Visible to candidates on your hiring page",
    items: [
      { id: "logosquare", name: "Company logo (square)", desc: "PNG ≥ 512×512 ≤ 1MB", tag: "must", input: "file" },
      { id: "logohoriz", name: "Logo (horizontal)", tag: "opt", input: "file" },
      { id: "banner", name: "Banner image", desc: "1920×400", tag: "opt", input: "file" },
      { id: "tagline", name: "Tagline", tag: "must", input: "text", maxlength: 100 },
      { id: "hq", name: "Headquarters", tag: "must", input: "text" },
      { id: "hiringvolume", name: "Hiring volume / quarter", tag: "opt", input: "number" },
      { id: "about", name: "About — long description", tag: "must", input: "textarea", maxlength: 2000 },
      { id: "otherlocations", name: "Other office locations", tag: "opt", input: "multi", options: CITY_OPTIONS },
      { id: "speccoding", name: "Specialties — coding", tag: "must", input: "multi", options: CODING_SPECIALTIES },
      { id: "specbilling", name: "Specialties — billing", tag: "opt", input: "multi", options: BILLING_SPECIALTIES },
      { id: "tools", name: "EHR / tools used", tag: "opt", input: "multi", options: EHR_TOOLS },
      { id: "geographies", name: "Client geographies", tag: "opt", input: "multi", options: ["US", "UK", "Middle East", "Australia", "Canada", "Europe", "APAC"] },
      { id: "roleshired", name: "Roles typically hired", tag: "opt", input: "multi", options: ROLE_TITLES },
    ],
  },
  {
    id: "3",
    key: "3",
    name: "Team Setup",
    sub: "Add the people who will hire alongside you",
    items: [
      { id: "tadmin", name: "Admin user details", tag: "must", input: "name-email" },
      { id: "trecruiters", name: "Recruiters list (CSV)", tag: "opt", input: "file" },
      { id: "tinterviewers", name: "Interviewers list (CSV)", tag: "opt", input: "file" },
      { id: "thiringmanagers", name: "Hiring managers list (CSV)", tag: "opt", input: "file" },
      { id: "tstakeholders", name: "View-only stakeholders", tag: "opt", input: "file" },
      { id: "tcalendar", name: "Calendar provider preference", tag: "opt", input: "select", options: ["Google", "Outlook", "Skip"] },
    ],
  },
  {
    id: "4",
    key: "4",
    name: "Branding",
    sub: "For candidate-facing emails & invitations",
    items: [
      { id: "bfromname", name: "Outbound \"from\" name", tag: "must", input: "text" },
      { id: "bcolor", name: "Primary brand colour", tag: "opt", input: "text", placeholder: "#0A1F3D" },
      { id: "bdomain", name: "Custom email domain", tag: "opt", input: "text", placeholder: "careers.acme.com" },
      { id: "bsignature", name: "Email signature block", tag: "opt", input: "textarea", maxlength: 500 },
      { id: "bprivacy", name: "Privacy policy URL", tag: "opt", input: "url" },
    ],
  },
  {
    id: "5",
    key: "5",
    name: "Question Bank",
    sub: "Optional — defaults work for 80% of roles",
    items: [
      { id: "qdefault", name: "Use Talentera default bank", tag: "opt", input: "select", options: ["Yes", "No", "Mix"] },
      { id: "qcustom", name: "Upload custom interview questions", desc: "Excel/CSV", tag: "opt", input: "file" },
    ],
  },
  {
    id: "6",
    key: "6",
    name: "Custom Rubric",
    sub: "Optional — only if default scoring weights don't fit your role",
    items: [
      { id: "rroles", name: "Roles needing custom weights", tag: "opt", input: "multi", options: ROLE_TITLES },
      { id: "rweights", name: "Per-role weight breakdown", tag: "opt", input: "textarea", maxlength: 800, placeholder: "Distribute 100 points across ICD / CPT / Specialty / Communication / Behaviour" },
      { id: "rpolicy", name: "Override approval policy", tag: "opt", input: "select", options: ["Auto-any", "HR Head", "Hiring Manager", "Both"] },
    ],
  },
  {
    id: "7",
    key: "7",
    name: "Pre-Candidate Action",
    sub: "Final pre-flight before candidates start landing in your inbox",
    items: [
      { id: "pcpreview", name: "Preview hiring page", tag: "must", input: "select", options: ["Yes, ready", "Changes pending", "Send link first"] },
      { id: "pcchannels", name: "Notification channels", tag: "must", input: "multi", options: ["Email", "SMS", "WhatsApp", "Slack", "In-app"] },
      { id: "pcduration", name: "Default interview duration", tag: "must", input: "select", options: ["30 min", "45 min", "60 min", "90 min"] },
      { id: "pccooling", name: "Cooling-off period (days)", tag: "opt", input: "number" },
      { id: "pcautoreject", name: "Auto-reject filters", tag: "opt", input: "multi", options: ["Below min experience", "Missing certification", "Wrong location", "Notice period exceeds limit", "Below compensation floor", "Already rejected in last 6mo"] },
      { id: "pctemplate", name: "First-touch email template", tag: "opt", input: "textarea", maxlength: 1000, placeholder: "Hi {{candidate_first_name}}, we'd love to talk about the {{role_title}} role at {{company_name}}. {{recruiter_name}} will reach out within {{sla_hours}} hours." },
      { id: "pcgolive", name: "Go-live confirmation", tag: "must", input: "select", options: ["Yes — open up", "Hold", "Pause"] },
    ],
  },
  {
    id: "8",
    key: "8",
    name: "Settings & Integrations",
    sub: "Plug Talentera into your existing stack · all optional except billing",
    items: [
      { id: "scalendar", name: "Calendar integration", tag: "opt", input: "select", options: ["Google Calendar", "Outlook", "None"] },
      { id: "steams", name: "Microsoft Teams", tag: "opt", input: "select", options: ["Connect", "Skip"] },
      { id: "sslack", name: "Slack webhook URL", tag: "opt", input: "url" },
      { id: "sats", name: "ATS connection", tag: "opt", input: "select", options: ["Workday", "Greenhouse", "SAP SuccessFactors", "Lever", "Zoho Recruit", "Other", "None"] },
      { id: "swebhook", name: "Custom webhook URL", tag: "opt", input: "url" },
      { id: "spaymethod", name: "Default payment method", tag: "must", input: "select", options: ["NEFT", "IMPS", "RTGS", "Cheque", "UPI", "Credit card"] },
      { id: "sinvemail", name: "Invoice email", tag: "must", input: "email" },
      { id: "scostctr", name: "Cost centre / budget code", tag: "opt", input: "text" },
      { id: "spo", name: "PO required for invoices", tag: "opt", input: "select", options: ["Yes", "No"] },
      { id: "sapproval", name: "Invoice approval workflow", tag: "opt", input: "select", options: ["POC-only", "POC + Finance", "Multi-approver"] },
    ],
  },
  {
    id: "9",
    key: "9",
    name: "First JD",
    sub: "Gather these details for the first role you'll post live",
    items: [
      { id: "roletitle", name: "Role title", tag: "must", input: "text" },
      { id: "department", name: "Department", tag: "opt", input: "select", options: ["Coding", "Billing", "Quality / QA", "AR & Denials", "Operations", "Training", "Other"] },
      { id: "specialty", name: "Primary specialty", tag: "must", input: "select", options: [...CODING_SPECIALTIES.slice(0, 6), ...BILLING_SPECIALTIES.slice(0, 4)] },
      { id: "level", name: "Hiring level", tag: "must", input: "select", options: ["Fresher only", "Experienced only", "Open to both"] },
      { id: "expmin", name: "Experience — minimum (yrs)", tag: "must", input: "number" },
      { id: "expmax", name: "Experience — maximum (yrs)", tag: "must", input: "number" },
      { id: "edumin", name: "Education minimum", tag: "opt", input: "select", options: ["Any", "12th pass", "Diploma", "Bachelor's (any)", "Bachelor's (life sciences)", "Bachelor's (nursing/paramedical)", "Master's"] },
      { id: "shift", name: "Shift", tag: "must", input: "select", options: ["Day", "Night", "Rotational", "Flexible"] },
      { id: "certs", name: "Certifications required", tag: "opt", input: "multi", options: ["CPC", "CPC-A", "COC", "CRC", "CCS", "CCA", "CIC", "CDIP", "CCDS", "CCS-P"] },
      { id: "reqtools", name: "Tools / EHR required", tag: "opt", input: "multi", options: EHR_TOOLS },
      { id: "languages", name: "Languages required", tag: "must", input: "multi", options: ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali"] },
      { id: "location", name: "Location", tag: "must", input: "text" },
      { id: "workmode", name: "Work mode", tag: "must", input: "select", options: ["Onsite", "Hybrid", "Remote"] },
      { id: "compmin", name: "Compensation — minimum (LPA)", tag: "must", input: "number" },
      { id: "compmax", name: "Compensation — maximum (LPA)", tag: "must", input: "number" },
      { id: "joiningbonus", name: "Joining bonus (₹)", tag: "opt", input: "number" },
      { id: "probation", name: "Probation (months)", tag: "opt", input: "number", placeholder: "3" },
      { id: "notice", name: "Notice period accepted", tag: "opt", input: "select", options: ["Immediate", "15 days", "30 days", "60 days", "90 days", "Negotiable"] },
      { id: "openings", name: "Number of openings", tag: "must", input: "number" },
      { id: "urgency", name: "Hiring urgency", tag: "must", input: "select", options: ["Critical (≤7 days)", "Standard (≤30 days)", "Flex"] },
      { id: "hiringmanager", name: "Hiring manager", tag: "must", input: "text" },
      { id: "panel", name: "Interview panel members", tag: "opt", input: "multi", options: ["Anita Reddy (HR)", "Karthik R (Tech Lead)", "Priya Nair (Ops Manager)", "Vikram Singh (QA Lead)", "Divya M (Team Lead)"] },
      { id: "musthaves", name: "Mandatory must-haves", tag: "opt", input: "textarea", maxlength: 400, placeholder: "Comma-separated, e.g. 2+ yrs ICD-10 coding, CPC certified" },
      { id: "nicetohaves", name: "Nice-to-haves", tag: "opt", input: "textarea", maxlength: 400 },
    ],
  },
];

export const STAGE_ORDER = ONBOARDING_STAGES.map((s) => s.id);

export const STAGE_COLORS = {
  "1a": "#4F8BFF", "1b": "#22C55E", "2": "#E5A82E", "3": "#8B5CF6",
  "4": "#F43F5E", "5": "#F97316", "6": "#14B8A6", "7": "#06B6D4",
  "8": "#94A3B8", "9": "#DC2626",
};

export const STAGE_BANNERS = {
  "1a": { icon: "fa-solid fa-shield-halved", title: "Verify your business once. Get trusted forever.", desc: "Companies with verified KYC get a permanent trust badge. Candidates apply 3× more often to verified profiles.", unlocks: ["Permanent trust badge", "Fraud protection guaranteed", "Save drafts & multi-user access", "Pay-on-hire pricing locked"] },
  "1b": { icon: "fa-solid fa-phone", title: "We notify you the moment shortlists land.", desc: "Your point of contact gets real-time alerts the second a verified candidate matches.", unlocks: ["Real-time SMS + email alerts", "Direct candidate phone numbers", "Two-way candidate chat", "WhatsApp Business integration"] },
  "2": { icon: "fa-solid fa-building", title: "Stand out to top candidates. 3× more applications.", desc: "A complete company profile is what candidates see before they apply — make it count.", unlocks: ["Public branded hiring page", "Custom URL talentera.in/co/your-name", "Higher candidate match scores", "Featured listings"] },
  "3": { icon: "fa-solid fa-users", title: "Hire as a team. Move 5× faster.", desc: "Bring recruiters, interviewers and hiring managers in so nothing waits on one inbox.", unlocks: ["Multi-user collaboration", "Role-based permissions (Admin/Recruiter/HM)", "Activity audit log", "Per-user calendar sync"] },
  "4": { icon: "fa-solid fa-palette", title: "Branded candidate emails get 2.4× more replies.", desc: "Candidate-facing emails and invitations carry your brand, not a generic template.", unlocks: ["Custom email branding", "careers.yourname.com domain", "Branded interview invites", "Auto-signed emails"] },
  "5": { icon: "fa-solid fa-circle-question", title: "1,500 questions ready. Or upload your own.", desc: "Defaults work for 80% of roles — customize only if you need to.", unlocks: ["1,500-question default bank", "Specialty-tagged questions", "Difficulty-calibrated rotation", "Anti-leak shuffling"] },
  "6": { icon: "fa-solid fa-scale-balanced", title: "Score by what matters most to you.", desc: "Only needed if the default scoring weights don't fit a particular role.", unlocks: ["Per-role rubric weights", "Override approval workflow", "Calibration reports", "Bias detection alerts"] },
  "7": { icon: "fa-solid fa-sliders", title: "Going live in minutes — let's tighten the bolts.", desc: "Final settings before candidates start landing in your inbox.", unlocks: ["Live preview link", "SLA-tracked alerts", "Auto-reject filter chain", "Cooling-off enforcement"] },
  "8": { icon: "fa-solid fa-plug", title: "Plug into your existing stack.", desc: "All optional except billing — connect calendars, chat and your ATS whenever you're ready.", unlocks: ["Auto calendar holds", "Slack hire alerts", "ATS bidirectional sync", "PO + invoicing automation"] },
  "9": { icon: "fa-solid fa-clipboard-list", title: "First JD live → 5 candidates in 24 hours.", desc: "This is the requisition Talentera's matching engine runs against the verified pool.", unlocks: ["Auto-match <24hrs", "Verified-only shortlists", "Specialty-deep filter stack", "First-click candidate exclusivity"] },
};

export function getStage(id) {
  return ONBOARDING_STAGES.find((s) => s.id === String(id).toLowerCase());
}

export function stageTotalFields(id) {
  const stage = getStage(id);
  return stage ? stage.items.length : 0;
}

export function stageDoneFields(id, savedData) {
  const stage = getStage(id);
  if (!stage || !savedData) return 0;
  return stage.items.filter((item) => {
    const v = savedData[item.id];
    if (v === undefined || v === null) return false;
    if (typeof v === "string") return v.trim() !== "";
    if (Array.isArray(v)) return v.length > 0;
    if (typeof v === "object") {
      if (item.input === "name-email") return !!(v.name && String(v.name).trim() && v.email && String(v.email).trim());
      if (item.input === "file") return !!(v.docName || v.docUrl || v.url || v.fileUrl || v.name);
      return !!(v.docName || v.docUrl || v.url || v.fileUrl || v.name || v.email || Object.keys(v).length > 0);
    }
    return true;
  }).length;
}

export const TOTAL_FIELDS = ONBOARDING_STAGES.reduce((sum, s) => sum + s.items.length, 0);

// A company that has filled every one of the TOTAL_FIELDS onboarding
// fields AND been KYC-verified shouldn't have to see the 9-section wizard
// every time it opens the dashboard - CompanyLogin/ForCompanies route it
// straight to the Job Posts screen (/companies/jobs) instead, and
// CompanyDashboardSetup shows a banner pointing there rather than defaulting
// back into the wizard. Centralized here since it's the same "done" math
// stageDoneFields/TOTAL_FIELDS already do per-stage.
export function isFullyOnboarded(company) {
  if (!company || company.kycStatus !== "verified") return false;
  const totalDone = ONBOARDING_STAGES.reduce((sum, s) => sum + stageDoneFields(s.id, company[`stage${s.id}`]), 0);
  return totalDone >= TOTAL_FIELDS;
}
