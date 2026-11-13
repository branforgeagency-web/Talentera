/**
 * DEV ONLY: fills every onboarding stage (1A, 1B, 2-9), KYC and a published first JD for one company account.
 *
 *   node scripts/seedCompanyMock.js dharsin0201@gmail.com
 *
 * - Uses MONGO_URI from backend/.env. Refuses to run when NODE_ENV=production.
 * - If the account doesn't exist it is created with password "Test@1234".
 * - Uploaded files are placeholder links (https://example.com/mock/...), not real documents.
 * - Overwrites that company's onboarding data. Run again any time to reset it.
 */
require("dotenv").config({ path: require("path").join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const Company = require("../models/Company");

const file = (name) => ({ docName: `${name}.pdf`, docUrl: `https://example.com/mock/${name}.pdf` });
const img = (name) => ({ docName: `${name}.png`, docUrl: `https://example.com/mock/${name}.png` });

(async () => {
  if (process.env.NODE_ENV === "production") { console.error("Refusing to seed mock data in production."); process.exit(1); }
  const email = String(process.argv[2] || "dharsin0201@gmail.com").toLowerCase().trim();
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });

  let c = await Company.findOne({ email });
  if (!c) {
    c = new Company({ email, passwordHash: await bcrypt.hash("Test@1234", 10) });
    console.log("Account not found - created with password Test@1234");
  }
  const now = new Date();
  c.contactName = c.contactName || "Dharsin";
  c.companyName = "MedAxis Healthcare Solutions Pvt Ltd";
  c.mobile = c.mobile || "9876543210";
  c.isVerified = true;
  c.verifiedAt = now;

  c.stage1a = {
    legalname: "MedAxis Healthcare Solutions Pvt Ltd",
    gstin: "33ABCDE1234F1Z5",
    pan: "ABCDE1234F",
    entity: "Private Limited",
    cosize: "201–500",
    regaddress: "No. 24, Anna Salai, Teynampet, Chennai, Tamil Nadu 600018",
    opaddress: [
      { branch: "Chennai (HQ)", address: "No. 24, Anna Salai, Teynampet, Chennai, Tamil Nadu 600018" },
      { branch: "Coimbatore", address: "3rd Floor, Tidel Park, Avinashi Road, Coimbatore, Tamil Nadu 641014" },
      { branch: "Hyderabad", address: "Plot 18, HITEC City, Madhapur, Hyderabad, Telangana 500081" },
    ],
    website: "https://medaxis.example.com",
    signatory: { name: "Ramesh Kumar", email: "ramesh.kumar@medaxis.example.com" },
    kycgst: file("gst-certificate"),
    kycpan: file("company-pan-card"),
    kycincorp: file("certificate-of-incorporation"),
  };
  c.stage1b = {
    pocname: "Dharsin S",
    pocdesig: "Head of Talent Acquisition",
    pocemail: email,
    pocmobile: "9876543210",
    poc2name: "Meena R",
    poc2desig: "HR Executive",
    poc2email: "meena.r@medaxis.example.com",
    poc2mobile: "9876512345",
  };
  c.stage2 = {
    yearest: "2014",
    hq: "Chennai, Tamil Nadu",
    about: "MedAxis Healthcare Solutions is a Chennai-based revenue cycle management company providing medical coding, billing and AR follow-up services to US healthcare providers. We run structured training and a people-first culture with clear growth paths for coders and billers.",
    mission: "Our mission is to make healthcare revenue cycles accurate and stress-free. Our vision is to be India's most trusted RCM partner by 2030.",
    departments: ["Medical Coding", "AR Calling", "Denial Management", "Quality & Compliance", "Training & Placement"],
    branches: ["Chennai", "Coimbatore", "Hyderabad"],
    policies: ["Night shift meal", "Cab / transport facility", "Health insurance", "Provident Fund (PF)", "Performance incentives", "Paid leave policy", "Training & certification support"],
    projects: [
      "Medical Coding - Evaluation & Management (E/M) Coding",
      "Medical Coding - ICD-10-CM Diagnosis Coding",
      "AR Caller - Denial Follow-up & Resolution",
      "Medical Billing - Medical Claims Submission",
    ].join("\n"),
  };
  c.stage3 = {
    tadmin: { name: "Dharsin S", email },
    trecruiters: [
      "Priya Nair (Senior Recruiter) | priya.nair@medaxis.example.com | 9876501234",
      "Karthik Raja (Recruiter) | karthik.raja@medaxis.example.com | 9876505678",
    ],
    thiringmanagers: [
      "Anitha Subramanian (Coding Operations Manager) | anitha.s@medaxis.example.com | 9876509012",
      "Vignesh M (AR Team Lead) | vignesh.m@medaxis.example.com | 9876503456",
    ],
  };
  c.stage4 = {
    blogo: img("company-logo"),
    officialemail: "careers@medaxis.example.com",
    bsignature: "Best regards,\nTalent Acquisition Team\nMedAxis Healthcare Solutions Pvt Ltd\nChennai | careers@medaxis.example.com",
    bsignaturelogo: img("signature-logo"),
  };
  c.stage5 = { qdefault: "Mix", qcustom: { docName: "custom-questions.xlsx", docUrl: "https://example.com/mock/custom-questions.xlsx" } };
  c.stage6 = {
    rroles: ["Junior Coder", "Senior Coder", "AR Caller"],
    rweights: {
      "All roles (default)": { "Communication": 20, "Aptitude / logic": 20, "Education & training": 20, "Typing speed & accuracy": 20, "Resume quality": 20 },
      "Junior Coder": { "ICD-10 coding": 30, "CPT / HCPCS coding": 20, "Communication": 15, "Aptitude / logic": 20, "Education & training": 15 },
      "Senior Coder": { "ICD-10 coding": 25, "CPT / HCPCS coding": 25, "Specialty knowledge": 20, "Certifications": 15, "Experience / internships": 15 },
      "AR Caller": { "Communication": 35, "Behaviour & attitude": 20, "Typing speed & accuracy": 15, "Aptitude / logic": 15, "AI video interview": 15 },
    },
    rprofile: ["Education & academy", "Certifications (CPC, CCS, etc.)", "Aptitude test score", "Communication score", "Experience / internships", "Preferred location"],
    rcutoff: "60",
    rexperience: "Both",
    rpolicy: "HR Head",
  };
  c.stage7 = {
    pcpreview: "Looks good — ready to go",
    pcchannels: ["Email", "SMS", "WhatsApp"],
    pcduration: "45 min",
    pccooling: "30",
    pcautoreject: ["Missing mandatory keywords (CPC / ICD-10 / CPT / HCPCS)", "Below min experience", "Notice period exceeds limit"],
    pctemplate: "Hi {{candidate_first_name}}, we'd love to talk about the {{role_title}} role at {{company_name}}. {{recruiter_name}} will reach out within {{sla_hours}} hours.",
    pcgolive: "Yes — open up",
  };
  c.stage8 = {
    scalendar: "Google Calendar",
    sslack: "https://hooks.slack.com/services/T000/B000/MOCKWEBHOOK",
    sats: "Zoho Recruit",
    swebhook: "https://hooks.medaxis.example.com/talentera",
    spaymethod: "NEFT",
    sinvemail: "accounts@medaxis.example.com",
    scostctr: "TA-2026-01",
    spo: "Yes",
    sapproval: "POC + Finance",
  };
  const interview = new Date(Date.now() + 7 * 864e5);
  const pad = (n) => String(n).padStart(2, "0");
  c.stage9 = {
    roletitle: "Medical Coder (Experienced)",
    department: "Coding",
    specialties: ["E/M", "HCC / Risk Adjustment", "ED Coding"],
    level: "Open to both",
    expmin: "1",
    expmax: "5",
    edumin: ["Bachelor's (life sciences)", "Bachelor's (nursing/paramedical)"],
    shift: "Rotational",
    certs: ["CPC", "CPC-A", "COC"],
    reqtools: ["Epic", "Cerner", "3M"],
    languages: ["English", "Tamil", "Hindi"],
    location: "Chennai",
    workmode: "Hybrid",
    compensation: "Freshers 3.2 LPA · Experienced 5–7 LPA",
    joiningbonus: "₹10,000",
    probation: "3",
    notice: "30 days",
    openings: "15",
    elgage: "21–32 yrs",
    elgpassout: "2023, 2024, 2025",
    elgbacklogs: "No backlogs allowed",
    interviewmode: ["Online", "Offline (walk-in)"],
    urgency: "Standard (≤30 days)",
    interviewdates: `${interview.getFullYear()}-${pad(interview.getMonth() + 1)}-${pad(interview.getDate())}T10:30`,
    serviceproof: file("service-agreement"),
    hiringmanager: "Anitha Subramanian",
    panel: ["Anitha Subramanian", "Priya Nair"],
    musthaves: "1+ yr ICD-10 coding, CPC certified, good communication",
    autoreject: ["Missing mandatory keywords (CPC / ICD-10 / CPT / HCPCS)", "Below min experience"],
    nicetohaves: "Experience with Epic, HCC risk adjustment exposure",
    recruiternote: "Walk-ins welcome on weekdays after 2 PM",
    specialty: "E/M, HCC / Risk Adjustment, ED Coding",
  };

  ["stage1a", "stage1b", "stage2", "stage3", "stage4", "stage5", "stage6", "stage7", "stage8", "stage9"].forEach((k) => c.markModified(k));
  c.completedStages = ["1a", "1b", "2", "3", "4", "5", "6", "7", "8", "9"];

  c.kycStatus = "verified";
  c.kycSubmittedAt = now;
  c.kycVerifiedAt = now;
  c.kycApprovedBy = "Mock seed";
  c.kycRejectedReason = undefined;
  c.rejectedKycFields = [];

  if (!c.jdPublished) {
    c.jobId = `TLT-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    c.jdPublished = true;
    c.jdPublishedAt = now;
  }
  c.jdApprovalStatus = "approved";
  c.jdApprovedAt = now;
  c.jdApprovedBy = "Mock seed";

  await c.save();
  console.log(`Seeded all 10 company stages for ${email} (company id ${c._id}, jobId ${c.jobId}). KYC verified, JD published.`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
