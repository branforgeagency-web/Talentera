require("dotenv").config({ path: __dirname + "/.env" });
const connectDB = require("./config/db");
const mongoose = require("mongoose");
const Candidate = require("./models/Candidate");
const Company = require("./models/Company");
const Job = require("./models/Job");
const Application = require("./models/Application");
const Notification = require("./models/Notification");
const P = require("./utils/experiencedPassport");
const { calculateVerificationScore, isExperiencedCandidate } = require("./utils/verificationScore");

async function seed() {
  await connectDB();
  console.log("Connected to MongoDB for experienced candidate seeding...");

  const email = "branforgeagency@gmail.com";
  let cand = await Candidate.findOne({ email });
  if (!cand) {
    console.error(`Candidate ${email} not found!`);
    process.exit(1);
  }

  const candId = cand._id;
  console.log("Seeding Experienced Candidate:", cand.email, candId);

  // Set candidateType
  cand.candidateType = "experienced";

  const now = new Date().toISOString();
  const mk = (name, docType) => ({
    id: `mock_${name}`,
    url: `https://storage.googleapis.com/talentera-uploads-prod/sample_${name}.pdf`,
    name: `${name}.pdf`,
    size: 154000,
    mimetype: "application/pdf",
    docType,
    uploadedAt: now,
  });

  const files = {
    photo: mk("profile-photo", "Profile Photo"),
    idDoc: mk("aadhaar-card", "Identity / Resume"),
    resume: mk("praveen-resume", "Resume"),
    offer: mk("offer-letter", "Offer Letter"),
    exp: mk("experience-letter", "Experience Letter"),
    relieving: mk("relieving-letter", "Relieving Letter"),
    payslip: mk("latest-payslip", "Latest Payslip"),
    cert1: mk("cpc-certificate", "Certificate Upload"),
    cert2: mk("ccs-certificate", "Certificate Upload"),
    empProof: mk("employment-proof", "Employment Proof"),
  };
  const ref = (f) => ({ url: f.url, name: f.name, uploadedAt: f.uploadedAt });
  const uploads = Object.values(files);

  // Passport Raw Stages 1 - 8
  const rawPassport = {
    1: {
      "upload-your-documents": {
        aadhaarNumber: "234567890009",
        panNumber: "ABCDE1234F",
        noPreviousCompany: "",
        documents: {
          aadhaarCard: ref(files.idDoc),
          panCard: ref(files.idDoc),
          updatedResume: ref(files.resume),
          currentOfferLetter: ref(files.offer),
          previousRelievingLetter: ref(files.relieving),
          experienceLetters: ref(files.exp),
          provisionalCertificate: ref(files.exp),
          trainingCertificate: ref(files.cert1),
        },
      },
      docs: [
        { ...ref(files.idDoc), docType: "Identity / Resume" },
        { ...ref(files.resume), docType: "Identity / Resume" },
      ],
      "personal-contact": {
        fullName: "Praveen Kumar R",
        dateOfBirth: "1997-08-22",
        gender: "Male",
        profilePhoto: ref(files.photo),
        mobileNumber: "9878787878",
        email,
        whatsappNumber: "9878787878",
        governmentIdType: "Aadhaar",
      },
      "current-career-status": {
        currentEmploymentStatus: "Serving Notice Period",
        currentCompany: "Omega Healthcare Management Services",
        currentDesignation: "Senior Medical Coder & Quality Lead",
        primaryCareerCategory: "Medical Coding",
        careerAvailability: "Available After Notice Period",
        noticePeriod: "15 Days",
        preferredWorkLocation: "Chennai, Bengaluru, Hyderabad",
        preferredWorkMode: "Hybrid",
      },
    },
    2: {
      education: {
        highestQualification: "UG",
        degreeCourse: "B.Sc Biotechnology",
        specialization: "Allied Health Sciences",
        collegeName: "Madras Medical College Allied Sciences",
        university: "The Tamil Nadu Dr. M.G.R. Medical University",
        yearOfPassing: "2019",
        percentageCgpa: "8.6 CGPA",
        educationMode: "Regular",
      },
      "training-academy-history": [
        {
          academyTrainingProvider: "Apex Academy of Medical Coding",
          branchLocation: "Chennai",
          courseName: "Advanced Medical Coding & Auditing Diploma",
          primaryDomain: "Medical Coding",
          secondaryDomain: "QA / Audit",
          trainingMode: "Classroom",
          courseStartDate: "2019-01-05",
          courseCompletionDate: "2019-05-30",
          trainingDuration: "5 months",
        },
      ],
    },
    3: {
      docs: [{ ...ref(files.empProof), docType: "Employment Proof" }],
      "current-previous-employment-entry": [
        {
          companyName: "Omega Healthcare Management Services",
          companyLocation: "Chennai, India",
          department: "Coding & Quality",
          designation: "Senior Medical Coder & Team Lead",
          domainProcessHandled: "Medical Coding (Inpatient DRG & Surgery)",
          employmentType: "Full-time",
          dateOfJoining: "2021-06-01",
          currentlyWorkingHere: "Yes",
          employmentDuration: "2 yrs 5 mos",
          rolesResponsibilities: "Leading high-complexity Inpatient DRG and outpatient surgical coding audits. Mentoring a squad of 12 junior coders and maintaining 98.4% team accuracy.",
          hasCareerGap: "No",
          careerGapDuration: "",
          careerGapReason: "",
        },
        {
          companyName: "Access Healthcare",
          companyLocation: "Chennai, India",
          department: "Coding",
          designation: "Medical Coder (Outpatient & ED)",
          domainProcessHandled: "Outpatient & ED Coding",
          employmentType: "Full-time",
          dateOfJoining: "2019-06-10",
          lastWorkingDate: "2021-05-25",
          currentlyWorkingHere: "No",
          employmentDuration: "1 yr 11 mos",
          rolesResponsibilities: "Handled ED chart coding, ambulatory surgery, and evaluation/management (E/M) cases using Epic and 3M Encoder with low turnaround time.",
          reasonForLeaving: "Career growth and promotion to Senior Auditor",
          hasCareerGap: "No",
          careerGapDuration: "",
          careerGapReason: "",
        },
      ],
    },
    4: {
      domains: ["Medical Coding", "QA / Audit", "Denial Management"],
      "technical-expertise": {
        primaryDomain: "Medical Coding",
        secondaryDomain: "QA / Audit",
        previousCurrentDomain: "Current: Medical Coding · Previous: Outpatient & ED Coding",
        specialtyHandled: "Inpatient DRG, Surgery, Cardiology, ED",
        usHealthcareExperience: "Yes",
        domesticInternationalProcess: "International",
        clientPayerProviderExposure: "Medicare, UnitedHealthcare, Humana, Blue Cross Blue Shield",
        softwareToolsUsed: "Epic, 3M Encoder, Optum CAC, Cerner",
        yearsInCurrentDomain: "5",
      },
    },
    5: {
      "performance-metrics": {
        dailyProductivity: "85 charts",
        monthlyTarget: "1800 charts",
        qualityScorePct: "98.4",
        accuracyPct: "98.2",
        auditScorePct: "98.4",
        errorRatePct: "1.2",
        clientFeedback: "Top ranked senior auditor across international delivery teams for Q3/Q4.",
        processImprovementContribution: "Engineered surgical modifier query rules reducing clinical claim denials by 22%.",
      },
      "leadership-achievements": {
        handledATeam: "Yes",
        teamSize: "12",
        leadershipRole: "Team Lead",
        yearsOfLeadershipExperience: "2.5",
        promotions: "Promoted from Medical Coder to Senior Coder, then to Quality Lead",
        awardsRecognition: "Apex Auditor of the Year 2023, Quality Star Award x4",
      },
    },
    6: {
      "add-certification": [
        {
          certificationCategory: "Medical Coding",
          certificationName: "CPC",
          issuingOrganization: "AAPC",
          certificationId: "01389452",
          issueDate: "2019-06-15",
          noExpiry: "No",
          expiryDate: "2027-06-15",
          certificationStatus: "Active",
          specialization: "Physician & Outpatient Coding",
          certificateUpload: ref(files.cert1),
          credentialUrl: "https://www.aapc.com/certification/credential-verification.aspx",
        },
        {
          certificationCategory: "Specialty Coding",
          certificationName: "COC",
          issuingOrganization: "AAPC",
          certificationId: "01389452",
          issueDate: "2021-03-20",
          noExpiry: "No",
          expiryDate: "2027-03-20",
          certificationStatus: "Active",
          specialization: "Hospital Outpatient & Ambulatory Surgery",
          certificateUpload: ref(files.cert1),
          credentialUrl: "https://www.aapc.com/certification/credential-verification.aspx",
        },
        {
          certificationCategory: "Auditing",
          certificationName: "CPMA",
          issuingOrganization: "AAPC",
          certificationId: "01389452",
          issueDate: "2022-11-10",
          noExpiry: "No",
          expiryDate: "2027-11-10",
          certificationStatus: "Active",
          specialization: "Medical Auditing & Compliance",
          certificateUpload: ref(files.cert1),
          credentialUrl: "https://www.aapc.com/certification/credential-verification.aspx",
        },
        {
          certificationCategory: "Inpatient Coding",
          certificationName: "CCS",
          issuingOrganization: "AHIMA",
          certificationId: "894215",
          issueDate: "2023-09-12",
          noExpiry: "No",
          expiryDate: "2027-09-12",
          certificationStatus: "Active",
          specialization: "Inpatient DRG Coding",
          certificateUpload: ref(files.cert2),
          credentialUrl: "https://my.ahima.org/credential-verification",
        },
      ],
      "ceu-continuing-education": {
        ceuRequired: "72",
        ceuCompleted: "72",
        cycleStartDate: "2025-01-01",
        cycleEndDate: "2027-06-30",
      },
    },
    7: {
      "career-documents": {
        latestResume: ref(files.resume),
        offerLetter: ref(files.offer),
        experienceLetter: ref(files.exp),
        relievingLetter: ref(files.relieving),
        latestPayslip: ref(files.payslip),
      },
      "future-career-preferences": {
        preferredNextDomain: "Medical Coding",
        preferredProcess: "Inpatient DRG / Quality Audits",
        preferredDesignation: "Team Lead - Coding Quality & Compliance",
        expectedSalaryCtc: "8.5 LPA",
        preferredLocation: "Chennai, Bengaluru, Hyderabad",
        preferredWorkMode: "Hybrid",
        availabilityToJoin: "15 Days",
        careerGoal: "Lead regional clinical coding quality operations across enterprise hospital accounts.",
      },
    },
    8: {
      "visibility-consent": {
        profileVisibility: "Visible to Recruiters",
        openToOpportunities: "Yes",
        allowCompaniesToRequestVerification: "Yes",
        consentToProcessProfessionalData: "Agree",
      },
    },
  };

  const stages = {};
  for (let n = 1; n <= 8; n++) {
    stages[n] = P.normalizeStage(n, rawPassport[n], uploads);
    const errs = P.validateStage(n, stages[n], uploads);
    if (errs.length) {
      console.error(`Passport stage ${n} validation error:`, errs);
    }
  }

  cand.experienced = {
    stages,
    completed: [1, 2, 3, 4, 5, 6, 7, 8],
    uploads,
    published: true,
    publishedAt: now,
  };
  cand.markModified("experienced");

  // Standard Pipeline Stages (1 through 8)
  cand.stage1 = {
    fullName: "Praveen Kumar R",
    mobile: "+91 98787 87878",
    city: "Chennai",
    state: "Tamil Nadu",
    preferredCities: "Chennai, Bengaluru, Hyderabad, Coimbatore",
    workShifts: ["Day Shift", "General Shift"],
    relocationPreference: "Yes — anywhere in India",
    experience: "5+",
    experienceLevel: "experienced",
    currentRole: "Senior Medical Coder & Quality Lead",
    gender: "Male",
    dob: "1997-08-22",
    aadhaarVerified: true,
    aadhaarStatus: "VERIFIED",
    aadhaarNumber: "XXXXXXXX4519",
    aadhaarMasked: "XXXX-XXXX-4519",
    aadhaarName: "PRAVEEN KUMAR R",
    aadhaarDob: "22/08/1997",
    aadhaarGender: "Male",
    aadhaarVerifiedAt: new Date("2026-07-15T09:00:00.000Z"),
  };

  cand.stage2 = {
    trainingPath: "experienced",
    totalExperience: "5+ Years",
    experience: "5+",
    experienceLevel: "experienced",
    currentRole: "Senior Medical Coder & Quality Lead",
    jobTitle: "Senior Medical Coder & Quality Lead",
    currentCompany: "Omega Healthcare Management Services",
    companyName: "Omega Healthcare Management Services",
    workStartDate: "2021-06-01",
    workEndDate: "",
    employmentStatus: "employed",
    domain: "Medical Coding",
    specialty: "Inpatient DRG & Surgical Auditing",
    specialties: [
      "Inpatient (IP) DRG Coding",
      "Same-Day Surgery (SDS)",
      "Cardiology & Interventional Radiology",
      "Denial Management & Auditing"
    ],
    workHistory: [
      {
        company: "Omega Healthcare Management Services",
        role: "Senior Medical Coder & Team Lead",
        startDate: "2021-06-01",
        endDate: "Present",
        duration: "3.5 Years",
        years: 3.5,
        description: "Supervised high-volume IP-DRG chart coding and weekly quality audits. Maintained 98%+ coding accuracy and resolved critical claim denials."
      },
      {
        company: "Access Healthcare",
        role: "Medical Coder (Outpatient & ED)",
        startDate: "2019-06-10",
        endDate: "2021-05-25",
        duration: "2 Years",
        years: 2.0,
        description: "Coded complex outpatient surgical records, ED visits, and E/M documentation using 3M Encoder and Epic EHR."
      }
    ],
    techSkills: [
      "ICD-10-CM/PCS",
      "CPT-4",
      "HCPCS Level II",
      "DRG Grouper",
      "3M Encoder",
      "Epic Systems",
      "Cerner",
      "Optum CAC"
    ],
    softSkills: [
      "Quality Auditing",
      "Team Leadership",
      "Physician Query Management",
      "Analytical Problem Solving",
      "CMS Compliance"
    ],
    proofDocUrl: "https://storage.googleapis.com/talentera-uploads-prod/sample_experience_letter.pdf",
    relievingLetterUrl: "https://storage.googleapis.com/talentera-uploads-prod/sample_relieving_letter.pdf",
    payslipUrl: "https://storage.googleapis.com/talentera-uploads-prod/sample_payslip.pdf",
    experienceDocUrl: "https://storage.googleapis.com/talentera-uploads-prod/sample_experience_letter.pdf",
    verified: true,
    trainingCompleted: true,
    trainingVerified: true,
  };

  cand.stage3 = {
    issuingBody: "AAPC",
    certName: "Certified Professional Coder",
    certCode: "CPC",
    memberId: "01389452",
    issueMonth: "06",
    issueYear: "2019",
    issueDate: "06/2019",
    expiryMonth: "06",
    expiryYear: "2027",
    expiryDate: "06/2027",
    certStatus: "verified",
    status: "verified",
    verified: true,
    certDocUrl: "https://storage.googleapis.com/talentera-uploads-prod/sample_cpc_cert.pdf",
    ceuCredits: 72,
    certifications: [
      {
        code: "CPC",
        name: "Certified Professional Coder",
        issuingBody: "AAPC",
        body: "AAPC",
        memberId: "01389452",
        issueMonth: "06",
        issueYear: "2019",
        issueDate: "06/2019",
        expiryMonth: "06",
        expiryYear: "2027",
        expiryDate: "06/2027",
        score: "92%",
        status: "verified",
        isReal: true,
        badgeClass: "green",
        logoClass: "blue",
      },
      {
        code: "COC",
        name: "Certified Outpatient Coder",
        issuingBody: "AAPC",
        body: "AAPC",
        memberId: "01389452",
        issueMonth: "03",
        issueYear: "2021",
        issueDate: "03/2021",
        expiryMonth: "03",
        expiryYear: "2027",
        expiryDate: "03/2027",
        score: "88%",
        status: "verified",
        isReal: true,
        badgeClass: "green",
        logoClass: "blue",
      },
      {
        code: "CPMA",
        name: "Certified Professional Medical Auditor",
        issuingBody: "AAPC",
        body: "AAPC",
        memberId: "01389452",
        issueMonth: "11",
        issueYear: "2022",
        issueDate: "11/2022",
        expiryMonth: "11",
        expiryYear: "2027",
        expiryDate: "11/2027",
        score: "90%",
        status: "verified",
        isReal: true,
        badgeClass: "green",
        logoClass: "gold",
      },
      {
        code: "CCS",
        name: "Certified Coding Specialist",
        issuingBody: "AHIMA",
        body: "AHIMA",
        memberId: "894215",
        issueMonth: "09",
        issueYear: "2023",
        issueDate: "09/2023",
        expiryMonth: "09",
        expiryYear: "2027",
        expiryDate: "09/2027",
        score: "340/400",
        status: "verified",
        isReal: true,
        badgeClass: "green",
        logoClass: "green",
      }
    ],
  };

  cand.stage4 = {
    exempt: true,
    passed: true,
    medal: "Exempt",
    score: 95,
    topic: "Experienced Candidate — Direct Verification Fast-Track",
    feedback: "Assessment exempt: Candidate has 5+ years of verified industry experience and dual AAPC/AHIMA certifications.",
    attempt: 1,
    attemptsUsed: 1,
    maxAttempts: 5,
    completedAt: new Date("2026-07-20T10:00:00.000Z"),
    retakes: 0,
  };

  cand.stage5 = {
    videoUrl: "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4",
    thumbnailUrl: "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80",
    duration: "2m 10s",
    verified: true,
    score: 96,
    communicationScore: 96,
    regionalLanguage: "Tamil",
    pitchTopic: "5.5 Years Senior RCM Journey, Inpatient DRG Mastery, and Team Quality Leadership",
    verifiedAt: new Date("2026-08-01T11:00:00.000Z"),
  };

  cand.stage6 = {
    totalCharts: 520,
    accuracyScore: 98.4,
    option: "practicode",
    evidencePath: "practicode",
    specialties: [
      { name: "Inpatient DRG / Complex Hospital Stays", count: 210 },
      { name: "Outpatient Surgical & Endoscopy", count: 180 },
      { name: "Cardiology & Interventional Procedures", count: 130 }
    ],
    verified: true,
    chartsLogged: 520,
    employeeVerifiedBy: "Talentera Senior Clinical Audit Panel",
    auditedAt: new Date("2026-08-15T16:00:00.000Z"),
  };

  cand.stage7 = {
    built: true,
    template: "classic",
    careerObjective: "Senior Medical Coder & Quality Auditor with 5.5+ years of extensive hands-on experience in Inpatient DRG, Ambulatory Surgery, and Interventional Coding. Quadruple certified (CPC, COC, CPMA - AAPC & CCS - AHIMA). Proven excellence in achieving 98.4% coding accuracy, conducting high-impact clinical documentation audits, mentoring junior coding cohorts, and eliminating medical necessity denial spikes across multi-hospital US healthcare systems.",
    summary: "5.5+ Years Experienced Senior Medical Coder & Auditor. Quadruple Certified (CPC, COC, CPMA, CCS). 520+ high-complexity charts audited with 98.4% accuracy. Seeking Team Lead / Senior Quality Auditor role.",
    liveResumeUrl: "talentera.io/praveen-kumar",
    verificationId: "TLR-2026-B8D730",
  };

  cand.stage8 = {
    employmentStatus: "Serving Notice Period",
    currentNoticePeriod: "15 Days Notice",
    expectedCtc: "8.5 LPA",
    currentCtc: "6.2 LPA",
    willingToRelocate: "Yes",
    preferredLocations: "Chennai, Bengaluru, Hyderabad",
    preferredWorkMode: "Hybrid",
    shiftPreference: "Day Shift",
    availability: "15 Days Notice",
    isLive: true,
    consent: true,
  };

  cand.completedStages = [1, 2, 3, 4, 5, 6, 7, 8];
  cand.documentVault = uploads.map((f) => ({
    id: f.id,
    title: f.docType,
    docType: f.docType,
    docUrl: f.url,
    docName: f.name,
    fileSize: f.size,
    mimetype: f.mimetype,
    uploadedAt: f.uploadedAt,
    status: "verified",
    verified: true,
  }));

  cand.isVerified = true;
  cand.verifiedAt = new Date("2026-08-20T10:00:00.000Z");
  cand.isSubmitted = true;
  cand.submittedAt = new Date("2026-08-20T10:00:00.000Z");

  cand.talenteraScore = 100;
  cand.pointsWallet = 500;
  cand.referralCode = "BRAN2026";
  cand.portalReferrals = [
    {
      name: "Dinesh K",
      email: "dinesh.k@gmail.com",
      status: "Joined & Enrolled",
      pointsEarned: 150,
      createdAt: new Date("2026-09-10T08:30:00.000Z"),
    },
    {
      name: "Sowmya N",
      email: "sowmya.n@gmail.com",
      status: "Completed Stage 4 Assessment",
      pointsEarned: 150,
      createdAt: new Date("2026-09-22T12:00:00.000Z"),
    },
    {
      name: "Vigneshwaran P",
      email: "vicky.p@gmail.com",
      status: "Verified Career Passport",
      pointsEarned: 200,
      createdAt: new Date("2026-10-05T14:15:00.000Z"),
    },
  ];

  cand.verificationReadiness = {
    checklist: {
      mobile: true,
      email: true,
      college: false,
      academics: true,
      resume: true,
      training: true,
      certification: true,
      assessment: true,
      videoResume: true,
    },
    readinessStatus: "INTERVIEW_READY",
    verifiedBy: "Talentera Chief Verification Officer",
    verifiedAt: new Date("2026-08-20T10:00:00.000Z"),
  };

  cand.placementLifecycle = {
    currentStatus: "SHORTLISTED",
    activeInterviewsCount: 1,
    placedCompanyId: null,
    placedCompanyName: "",
    placedRole: "",
    placedCtc: "",
    placedDate: null,
    joiningDate: null,
    offerLetterUrl: null,
  };

  cand.rcmDomainSelection = {
    primaryDomain: "Medical Coding",
    primarySubSpecialties: ["Inpatient DRG", "Outpatient Surgery", "Interventional Radiology"],
    secondaryDomain: "Quality Auditing",
    secondarySubSpecialties: ["Coding Quality Assurance", "Physician Queries"],
    workModePreference: "Hybrid",
    shiftPreference: "Day Shift",
    expectedSalary: "8.5 LPA",
    availability: "15 Days Notice",
  };

  await cand.save();
  console.log("Candidate saved with both Experienced Career Passport & Full Stage 1-8 Pipeline!");

  // Applications
  await Application.deleteMany({ candidateId: candId });
  const jobs = await Job.find().populate("companyId").lean();

  for (const job of jobs) {
    const compName = job.companyId?.companyName || "";
    let appStatus = "applied";
    let hiringStage = "applied";
    let interviewScheduledAt = null;
    let interviewTimeText = "";
    let interviewType = "";
    let interviewMeetingLink = "";
    let interviewConfirmed = false;
    let hiringBlob = {};

    if (compName.toLowerCase().includes("optum")) {
      appStatus = "interviewing";
      hiringStage = "technical";
      interviewScheduledAt = new Date("2026-11-18T14:00:00.000Z");
      interviewTimeText = "18-Nov-2026 at 02:00 PM IST";
      interviewType = "Technical Leadership Interview (MS Teams)";
      interviewMeetingLink = "https://teams.microsoft.com/l/meetup-join/talentera-optum-praveen-lead";
      interviewConfirmed = true;
      hiringBlob = {
        stage: "technical",
        exam: {
          score: 98,
          passed: true,
          completedAt: new Date("2026-11-02T11:00:00.000Z"),
        },
        technical: {
          avgScore: 96,
          scheduledAt: new Date("2026-11-18T14:00:00.000Z"),
        },
      };
    } else if (compName.toLowerCase().includes("omega")) {
      appStatus = "hired";
      hiringStage = "offered";
      hiringBlob = {
        stage: "offered",
        exam: {
          score: 98,
          passed: true,
          completedAt: new Date("2026-10-15T10:00:00.000Z"),
        },
        technical: {
          avgScore: 97,
          decision: "pass",
          completedAt: new Date("2026-10-22T14:00:00.000Z"),
        },
        hr: {
          status: "completed",
        },
        offer: {
          role: "Team Lead - Coding Quality & Audits",
          ctc: 8.2,
          joinDate: "2026-12-01",
          probationMonths: 3,
          status: "accepted",
        },
      };
    } else if (compName.toLowerCase().includes("access")) {
      appStatus = "shortlisted";
      hiringStage = "exam";
      hiringBlob = {
        stage: "exam",
        exam: {
          score: 95,
          passed: true,
          completedAt: new Date("2026-11-04T09:30:00.000Z"),
        },
      };
    } else {
      appStatus = "applied";
      hiringStage = "applied";
      hiringBlob = {
        stage: "applied",
      };
    }

    await Application.create({
      candidateId: candId,
      companyId: job.companyId._id,
      jobId: job.jobId,
      status: appStatus,
      coverNote: "5.5+ years of RCM Coding & Quality Auditing experience with quadruple AAPC/AHIMA certifications. Eager to drive accuracy and audit excellence.",
      interviewScheduledAt,
      interviewTimeText,
      interviewType,
      interviewMeetingLink,
      interviewConfirmed,
      interviewConfirmedAt: interviewConfirmed ? new Date() : null,
      hiring: hiringBlob,
    });
  }

  // Notifications
  await Notification.deleteMany({ recipientType: "candidate", recipientId: String(candId) });
  const notifications = [
    {
      recipientType: "candidate",
      recipientId: String(candId),
      title: "Leadership Interview Scheduled with Optum",
      message: "Optum has scheduled your Technical Leadership Interview for Senior Medical Coder / Auditor on Nov 18, 2026 at 02:00 PM IST.",
      type: "interview_scheduled",
      read: false,
      meta: {
        company: "Optum",
        role: "Senior Medical Coder / Auditor",
        source: "company",
      },
    },
    {
      recipientType: "candidate",
      recipientId: String(candId),
      title: "Official Job Offer from Omega Healthcare",
      message: "Congratulations Praveen! Omega Healthcare has extended an official offer for Team Lead - Coding Quality (8.2 LPA).",
      type: "offer_received",
      read: false,
      meta: {
        company: "Omega",
        role: "Team Lead - Coding Quality",
        ctc: "8.2 LPA",
        source: "company",
      },
    },
    {
      recipientType: "candidate",
      recipientId: String(candId),
      title: "Shortlisted by Access Healthcare",
      message: "Access Healthcare reviewed your 5.5+ years experience and shortlisted you for Medical Coding Specialist Lead opening.",
      type: "application_shortlisted",
      read: true,
      meta: {
        company: "Access Healthcare",
        source: "company",
      },
    },
    {
      recipientType: "candidate",
      recipientId: String(candId),
      title: "Experienced Verification Stamped",
      message: "Your 5+ years experience documents, Aadhaar identity, and AAPC/AHIMA credentials have been verified with cryptographic hash TLR-2026-B8D730.",
      type: "kyc_approved",
      read: true,
      meta: {
        source: "admin",
      },
    },
    {
      recipientType: "candidate",
      recipientId: String(candId),
      title: "500 Charts Club Badge Unlocked",
      message: "Congratulations! You logged over 500 live charts with 98.4% verified accuracy and unlocked the elite 500 Charts Club badge.",
      type: "assessment_passed",
      read: true,
      meta: {
        medal: "500 Charts",
        source: "admin",
      },
    },
  ];
  await Notification.insertMany(notifications);

  // Verification
  const verificationScore = calculateVerificationScore(cand.completedStages, cand);
  const passportScore = P.calculatePassportScore(cand);

  console.log("=== SEEDING SUMMARY ===");
  console.log("Candidate Verification Score:", verificationScore.score, "/ 100");
  console.log("Career Passport Score:", passportScore.score, "/ 100");
  console.log("Candidate Type:", cand.candidateType);
  console.log("Is Experienced Check:", isExperiencedCandidate(cand));
  console.log("Applications Count:", jobs.length);
  console.log("Notifications Count:", notifications.length);
  console.log("SUCCESS!");

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error("SEED_ERROR:", err);
  process.exit(1);
});
