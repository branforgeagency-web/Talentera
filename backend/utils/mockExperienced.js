/**
 * DEV ONLY: fills a complete, published Experienced Career Passport on a candidate document (not saved here - the
 * caller saves). Used by scripts/seedExperiencedMock.js and the dev-only "Fill demo data" action in the passport form.
 * An existing Fresher profile is kept as a second profile; real name / mobile / email are kept from it.
 */
const P = require("./experiencedPassport");
const F = require("./fresherToExperienced");
const { calculateVerificationScore } = require("./verificationScore");

async function fillExperiencedMock(c, email) {
  // Existing Fresher account: keep it as a second profile (stashed, untouched) and fill the Experienced one.
  // A brand-new account is simply created as experienced.
  const isNew = c.isNew;
  if (isNew) { c.candidateType = "experienced"; c.candidateTypes = ["experienced"]; }
  else if (!F.typesOf(c).includes("experienced")) {
    const r = await F.addProfile(c, "experienced");
    console.log(`Added an Experienced profile to the existing account (pre-filled ${r.prefilledFields} fields from the fresher data). Fresher profile kept.`);
  } else if (F.activeType(c) !== "experienced") {
    F.switchProfile(c, "experienced");
    console.log("Account already had both profiles - switched to Experienced.");
  }
  const pre = c.experienced?.stages?.[1]?.["personal-contact"] || {}; // real identity from the fresher profile, if any

  const now = new Date().toISOString();
  const mk = (name, docType) => ({ id: `mock_${name}`, url: `https://example.com/mock/${name}.pdf`, name: `${name}.pdf`, size: 120000, mimetype: "application/pdf", docType, uploadedAt: now });
  const files = {
    photo: mk("profile-photo", "Profile Photo"), idDoc: mk("aadhaar-card", "Identity / Resume"), resume: mk("priya-resume", "Resume"),
    offer: mk("offer-letter", "Offer Letter"), exp: mk("experience-letter", "Experience Letter"), relieving: mk("relieving-letter", "Relieving Letter"),
    payslip: mk("latest-payslip", "Latest Payslip"), cert1: mk("cpc-certificate", "Certificate Upload"), cert2: mk("ccs-certificate", "Certificate Upload"),
    empProof: mk("employment-proof", "Employment Proof"),
    pan: mk("pan-card", "PAN Card"), prov: mk("provisional-certificate", "Provisional Certificate"), train: mk("training-certificate", "Training Certificate"),
  };
  const ref = (f) => ({ url: f.url, name: f.name, uploadedAt: f.uploadedAt });
  const uploads = Object.values(files);

  const raw = {
    1: {
      "upload-your-documents": { aadhaarNumber: "234567890009", panNumber: "ABCDE1234F", noPreviousCompany: "",
        documents: { updatedResume: ref(files.resume), experienceLetters: ref(files.exp), aadhaarCard: ref(files.idDoc), panCard: ref(files.pan), provisionalCertificate: ref(files.prov), trainingCertificate: ref(files.train), currentOfferLetter: ref(files.offer), previousRelievingLetter: ref(files.relieving) } },
      "personal-contact": { fullName: "Priya Raman", dateOfBirth: "1994-06-15", gender: "Female", profilePhoto: ref(files.photo), mobileNumber: "9876543210", email, whatsappNumber: "9876543210", governmentIdType: "Aadhaar", governmentIdNumber: "XXXX XXXX 0009", idRegisteredMobile: "XXXXXX3210", isGovtIdVerified: "Yes", maskedGovtId: "XXXX XXXX 0009" },
      "current-career-status": { currentEmploymentStatus: "Currently Employed", currentCompany: "Omega Healthcare", currentDesignation: "Senior Medical Coder", primaryCareerCategory: "Medical Coding", careerAvailability: "Open to Opportunities", noticePeriod: "Yes", noticePeriodDays: "30", preferredWorkLocation: "Chennai, Bengaluru, Hyderabad", preferredWorkMode: "Hybrid" },
    },
    2: {
      education: { highestQualification: "UG", degreeCourse: "B.Pharm", specialization: "Pharmacy", collegeName: "SRM Institute of Science and Technology", university: "SRM University", yearOfPassing: "2016", percentageCgpa: "8.2 CGPA", educationMode: "Regular" },
      "training-academy-history": [{ academyTrainingProvider: "ThoughtFlows Medical Coding Academy", branchLocation: "Chennai", courseName: "Certified Professional Coder Training", primaryDomain: "Medical Coding", secondaryDomain: "Medical Auditing", trainingMode: "Classroom", courseStartDate: "2016-08-01", courseCompletionDate: "2017-01-31" }],
    },
    3: {
      docs: [{ ...ref(files.empProof), docType: "Employment Proof" }],
      "current-previous-employment-entry": [
        { companyName: "Omega Healthcare", companyLocation: "Chennai, India", department: "Coding", designation: "Senior Medical Coder", employmentType: "Full-time", dateOfJoining: "2021-03-01", currentlyWorkingHere: "Yes", rolesResponsibilities: "Surgery and E/M coding for US healthcare clients, audits of junior coders, denial analysis." },
        { companyName: "Access Healthcare", companyLocation: "Chennai, India", department: "Coding", designation: "Medical Coder", employmentType: "Full-time", dateOfJoining: "2017-04-10", lastWorkingDate: "2021-02-20", currentlyWorkingHere: "No", rolesResponsibilities: "Outpatient and E/M coding, 95+ charts per day, 98% accuracy.", reasonForLeaving: "Career growth" },
      ],
    },
    4: {
      domains: ["Medical Coding", "QA / Audit", "Denial Management"],
      "technical-expertise": { primaryDomain: "Medical Coding", secondaryDomain: "QA / Audit", specialtyHandled: "Surgery, E/M, Radiology", usHealthcareExperience: "Yes", domesticInternationalProcess: "International", clientPayerProviderExposure: "Medicare, BCBS, Aetna, multi-specialty hospitals", softwareToolsUsed: "Epic, 3M Encoder, Optum EncoderPro", yearsInCurrentDomain: "9" },
    },
    5: {
      "performance-metrics": { dailyProductivity: "95 charts", monthlyTarget: "2000 charts", qualityScorePct: "98", accuracyPct: "97.5", auditScorePct: "96", errorRatePct: "1.5", clientFeedback: "Consistently rated 'Exceeds expectations' by the client.", processImprovementContribution: "Built a coding checklist that cut rework by 18%." },
      "leadership-achievements": { handledATeam: "Yes", teamSize: "8", leadershipRole: "SME", yearsOfLeadershipExperience: "3", promotions: "Medical Coder to Senior Medical Coder (2021)", awardsRecognition: "Quality Champion 2022, Employee of the Month x3" },
    },
    6: {
      "add-certification": [
        { certificationCategory: "Medical Coding", certificationName: "CPC", issuingOrganization: "AAPC", certificationId: "AAPC-1234567", issueDate: "2017-03-20", noExpiry: "Yes", certificationStatus: "Active", specialization: "Outpatient coding", certificateUpload: ref(files.cert1), credentialUrl: "https://example.com/verify/cpc" },
        { certificationCategory: "Specialty Coding", certificationName: "CCS", issuingOrganization: "AHIMA", certificationId: "AHIMA-7654321", issueDate: "2020-09-10", expiryDate: "2027-09-10", noExpiry: "No", certificationStatus: "Active", specialization: "Inpatient coding", certificateUpload: ref(files.cert2) },
      ],
      "ceu-continuing-education": { ceuRequired: "36", ceuCompleted: "24", cycleStartDate: "2025-01-01", cycleEndDate: "2026-12-31" },
    },
    7: {
      "career-documents": { latestResume: ref(files.resume), offerLetter: ref(files.offer), experienceLetter: ref(files.exp), relievingLetter: ref(files.relieving), latestPayslip: ref(files.payslip) },
      "future-career-preferences": { preferredNextDomain: "Medical Coding", preferredProcess: "Inpatient / Surgery coding", preferredDesignation: "Coding Team Lead", expectedSalaryCtc: "9 LPA", preferredLocation: "Chennai, Bengaluru", preferredWorkMode: "Hybrid", availabilityToJoin: "30 Days", careerGoal: "Move into a coding audit lead role within 24 months." },
    },
    8: { "visibility-consent": { profileVisibility: "Visible to Recruiters", openToOpportunities: "Yes", allowCompaniesToRequestVerification: "Yes", consentToProcessProfessionalData: "Agree" } },
  };

  const pc = raw[1]["personal-contact"];
  ["fullName", "gender", "mobileNumber", "email", "whatsappNumber"].forEach((k) => { if (pre[k]) pc[k] = pre[k]; });
  pc.email = pc.email || email;

  const stages = {};
  for (let n = 1; n <= 8; n++) {
    stages[n] = P.normalizeStage(n, raw[n], uploads);
    const errs = P.validateStage(n, stages[n], uploads);
    if (errs.length) { throw new Error(`Mock data invalid for stage ${n}: ${errs[0]}`); }
    P.maskSensitive(n, stages[n]);
  }
  c.experienced = { stages, completed: [1, 2, 3, 4, 5, 6, 7, 8], uploads, published: true, publishedAt: now };
  c.markModified("experienced");
  c.stage1 = { ...(c.stage1 || {}), aadhaarVerified: true, aadhaarStatus: "VERIFIED", verificationMethod: "Mock (dev seed)" };
  P.syncLegacy(c);
  c.documentVault = uploads.map((f) => ({ id: f.id, title: f.docType, docType: f.docType, docUrl: f.url, docName: f.name, fileSize: f.size, mimetype: f.mimetype, uploadedAt: f.uploadedAt, status: "uploaded", verified: false }));
  c.markModified("documentVault");
  c.isSubmitted = true;
  c.submittedAt = new Date();
  const sc = calculateVerificationScore(c.completedStages, c);
  c.isVerified = true;
  c.verificationReadiness = { ...(c.verificationReadiness || {}), readinessStatus: "VERIFIED", verifiedAt: new Date() };
  return calculateVerificationScore(c.completedStages, c);
}

module.exports = { fillExperiencedMock };
