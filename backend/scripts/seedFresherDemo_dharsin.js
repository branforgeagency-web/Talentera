const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));
const bcrypt = require(path.join(baseDir, 'node_modules/bcryptjs'));

const Candidate = require(path.join(baseDir, 'models/Candidate'));
const { calculateVerificationScore } = require(path.join(baseDir, 'utils/verificationScore'));

async function seedFresherDemo() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected to MongoDB...');

  const email = 'dharsin0201@gmail.com';
  let candidate = await Candidate.findOne({ email });

  if (!candidate) {
    console.log('Candidate not found, creating new...');
    candidate = new Candidate({
      email,
      passwordHash: await bcrypt.hash('Password@123', 10),
      mobile: '9876543210',
    });
  }

  // Ensure Fresher type
  candidate.candidateType = 'fresher';
  if (!Array.isArray(candidate.candidateTypes)) candidate.candidateTypes = [];
  if (!candidate.candidateTypes.includes('fresher')) candidate.candidateTypes.push('fresher');

  const now = new Date();

  // STAGE 1: Basic Info & Identity
  candidate.stage1 = {
    fullName: 'Dharshini K',
    fullname: 'Dharshini K',
    email: email,
    mobile: candidate.mobile || '9876543210',
    whatsapp: '9876543210',
    dob: '2003-05-18',
    gender: 'Female',
    city: 'Chennai',
    locality: 'Guindy',
    state: 'Tamil Nadu',
    pincode: '600032',
    address: 'Anna Salai, Guindy, Chennai, Tamil Nadu',
    degree: 'B.Sc Biotechnology',
    collegeName: 'Madras Christian College (MCC), Chennai',
    graduationYear: '2025',
    cgpa: '8.7',
    experience: 'Fresher',
    experienceLevel: 'fresher',
    targetRole: 'Medical Coder',
    currentRole: 'Certified Medical Coder Trainee',
    aadhaarVerified: true,
    aadhaarStatus: 'VERIFIED',
    maskedAadhaar: 'XXXX-XXXX-4819',
    verificationMethod: 'DigiLocker UIDAI OTP',
    verifiedAt: now,
  };

  // STAGE 2: Academy & Foundation Training
  candidate.stage2 = {
    domain: 'Medical Coding',
    specialty: 'CPC / Outpatient & Inpatient Coding',
    academyName: 'Apex Healthcare & Medical Coding Academy',
    academyState: 'Tamil Nadu',
    branch: 'Chennai Main Campus',
    course: 'Comprehensive Medical Coding & Billing Program (CPC Intensive)',
    batch: 'CPC-2026-A1',
    rollNo: 'APEX-2026-089',
    duration: '6 Months (500 Hours)',
    trainingMode: 'Classroom & Practical Lab',
    trainerName: 'Dr. K. Senthil Nathan, CPC, CPMA',
    assessmentScore: 94,
    verified: true,
    approvedAt: now,
    status: 'verified',
    proofDocUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/academy_training_certificate.pdf',
    proofDocName: 'Apex_Academy_Certificate_Dharshini.pdf',
  };

  // STAGE 3: Certification
  candidate.stage3 = {
    certStatus: 'certified',
    certName: 'Certified Professional Coder (CPC)',
    certCode: 'CPC',
    issuingBody: 'AAPC',
    certNo: 'AAPC-01984210',
    memberId: '01984210',
    issueDate: '2026-02-10',
    expiryDate: '2028-02-10',
    score: 88,
    verified: true,
    verifiedAt: now,
    certProofUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/aapc_cpc_certificate.pdf',
    certProofName: 'AAPC_CPC_Dharshini_K.pdf',
    certifications: [
      {
        id: 'cert_1',
        name: 'Certified Professional Coder (CPC)',
        certCode: 'CPC',
        issuingBody: 'AAPC',
        certNo: 'AAPC-01984210',
        memberId: '01984210',
        issueDate: '2026-02-10',
        expiryDate: '2028-02-10',
        score: 88,
        verified: true,
        status: 'active',
        proofUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/aapc_cpc_certificate.pdf',
        proofName: 'AAPC_CPC_Dharshini_K.pdf',
      }
    ],
  };

  // STAGE 4: Flagship Domain Assessment
  candidate.stage4 = {
    score: 92,
    foundationScore: 92,
    total: 100,
    topic: 'Medical Coding (ICD-10-CM, CPT, HCPCS & Medical Terminology)',
    domain: 'Medical Coding',
    passed: true,
    medal: 'Gold Assessment Medal',
    proctored: true,
    attemptedAt: now,
    passedAt: now,
    timeTakenMinutes: 38,
    breakdown: {
      'ICD-10-CM Diagnosis Coding': 96,
      'CPT Procedure & Modifiers': 90,
      'HCPCS Level II Coding': 92,
      'Human Anatomy & Medical Terminology': 95,
      'HIPAA & Compliance Guidelines': 90,
    },
  };

  // STAGE 5: Video Pitch & AI Communication Interview
  candidate.stage5 = {
    videoUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/fresher_pitch_video.mp4',
    introVideoUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/fresher_pitch_video.mp4',
    proctoredInterviewVideoUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/fresher_pitch_video.mp4',
    duration: '2m 15s',
    aiScore: 94,
    overallScore: 94,
    score: 94,
    clarity: 95,
    fluency: 94,
    vocabulary: 92,
    confidence: 96,
    verified: true,
    approvedAt: now,
    feedback: 'Excellent vocal clarity, professional posture, fluent explanation of ICD-10 and CPT coding logic with accurate anatomy terminology.',
  };

  // STAGE 6: Live Chart Practice / Auditing
  candidate.stage6 = {
    evidencePath: 'A',
    option: 'practicode',
    primaryPlatform: 'Practicode',
    selectedPlatforms: ['Practicode', '3M 360 Encompass'],
    totalCharts: 320,
    liveChartsAudited: 320,
    accuracy: 94.5,
    overallAccuracy: 94.5,
    accuracyScore: 94.5,
    tier: 'Gold',
    verificationPoints: 9,
    stageScore: 90,
    timePracticedHours: 80,
    practicePeriodDays: 60,
    chartsPerHour: 4,
    chartsPerDay: 5.3,
    verified: true,
    employeeVerified: true,
    completedAt: now,
    specialtyCharts: [
      { id: 1, name: 'HCC (Risk Adjustment)', count: 120, accuracy: 96, timePerChart: 7, lastCodedDate: '2026-11-18', active: true },
      { id: 2, name: 'E/M (Evaluation & Management)', count: 100, accuracy: 94, timePerChart: 8, lastCodedDate: '2026-11-15', active: true },
      { id: 3, name: 'ED (Emergency Department)', count: 60, accuracy: 93, timePerChart: 9, lastCodedDate: '2026-11-10', active: true },
      { id: 4, name: 'Surgery', count: 40, accuracy: 95, timePerChart: 11, lastCodedDate: '2026-11-05', active: true },
    ],
    platformAccounts: [
      {
        platform: 'Practicode',
        url: 'https://practicode.aapc.com/profile/dharshini_k',
        username: 'dharshini.k.coder',
        profileId: 'PRAC-89210-DK',
      }
    ],
  };

  // STAGE 7: Verified Resume
  candidate.stage7 = {
    template: 'fresher_modern',
    objective: 'Certified Professional Coder (AAPC CPC) with a strong educational foundation in Biotechnology and comprehensive training in ICD-10-CM, CPT, and HCPCS coding. Successfully completed 320+ live chart audits with 94.5% accuracy across HCC, E/M, and Outpatient Surgery. Seeking a challenging role as a Medical Coder Trainee / Junior Medical Coder to optimize coding accuracy and claims compliance.',
    summary: 'AAPC CPC Certified Fresher Medical Coder with 320+ audited charts (94.5% accuracy) and proctored assessment score of 92/100. Trained on Practicode and 3M 360 Encompass.',
    skills: [
      'ICD-10-CM Coding',
      'CPT-4 Coding & Modifiers',
      'HCPCS Level II',
      'HCC Risk Adjustment',
      'Anatomy & Physiology',
      'Medical Terminology',
      'Practicode System',
      '3M 360 Encompass',
      'HIPAA & Compliance',
    ],
    projects: [
      {
        title: '320+ Live Outpatient & Inpatient Charts Audit',
        description: 'Coded and audited high-complexity charts in HCC and E/M specialties maintaining 94.5% QA compliance on Practicode.',
      }
    ],
    versionHistory: [
      {
        version: 'v1.0',
        timestamp: '24 Nov 2026',
        title: 'Talentera Verified Resume Generated',
        current: true,
      }
    ],
    updatedAt: now,
  };
  candidate.resumeTemplate = 'fresher_modern';

  // STAGE 8: Placement Preferences & Live for Hiring
  candidate.stage8 = {
    liveForHiring: true,
    isLive: true,
    employmentStatus: 'Actively Looking',
    status: 'Immediate Joiner',
    role: 'Certified Medical Coder (CPC Trainee)',
    expectedCtc: '₹3.6 - ₹4.2 LPA',
    ctc: '₹3.8 LPA',
    preferredCities: ['Chennai', 'Bengaluru', 'Coimbatore', 'Hyderabad'],
    workModePreference: 'Hybrid / WFO',
    shiftPreference: 'Day Shift / Rotational',
    availabilityToJoin: 'Immediate (0-7 days)',
    consent: true,
    profileVisibility: 'Public to Employers',
    openToOpportunities: true,
  };

  // DOCUMENT VAULT
  candidate.documentVault = [
    {
      id: 'doc_aadhaar_01',
      title: 'Aadhaar Identity Verification',
      docType: 'Aadhaar Card',
      docUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/aadhaar_verified_proof.pdf',
      docName: 'Aadhaar_UIDAI_Verified.pdf',
      uploadedAt: now,
      verified: true,
      status: 'verified',
    },
    {
      id: 'doc_academy_02',
      title: 'Apex Academy Training Certificate',
      docType: 'Training Certificate',
      docUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/academy_training_certificate.pdf',
      docName: 'Apex_Academy_Certificate.pdf',
      uploadedAt: now,
      verified: true,
      status: 'verified',
    },
    {
      id: 'doc_cpc_03',
      title: 'AAPC CPC Credential Certificate',
      docType: 'Certified Professional Coder',
      docUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/aapc_cpc_certificate.pdf',
      docName: 'AAPC_CPC_Official_Certificate.pdf',
      uploadedAt: now,
      verified: true,
      status: 'verified',
    },
    {
      id: 'live_chart_proof_stage6',
      title: 'Live Chart Proof — Gold Tier (320 Charts)',
      docType: 'Live Chart Proof',
      docUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/practicode_chart_log.pdf',
      docName: 'Practicode_Audit_Log_320_Charts.pdf',
      uploadedAt: now,
      verified: true,
      tier: 'Gold',
      totalCharts: 320,
      overallAccuracy: 94.5,
    },
    {
      id: 'doc_resume_05',
      title: 'Talentera Verified Resume',
      docType: 'Verified Resume',
      docUrl: 'https://storage.googleapis.com/talentera-uploads-prod/sample/dharshini_verified_resume.pdf',
      docName: 'Dharshini_K_Verified_Resume.pdf',
      uploadedAt: now,
      verified: true,
      status: 'verified',
    }
  ];

  // Core Completion & Verification Flags
  candidate.completedStages = [1, 2, 3, 4, 5, 6, 7, 8];
  candidate.isSubmitted = true;
  candidate.submittedAt = now;
  candidate.isVerified = true;
  candidate.verifiedAt = now;

  // Calculate Verification Score via canonical scoring function
  const scoring = calculateVerificationScore(candidate.completedStages, candidate);
  candidate.talenteraScore = scoring.score || 94;
  candidate.score = candidate.talenteraScore;
  candidate.verificationScore = candidate.talenteraScore;
  candidate.talenteraScoreBreakdown = scoring.stageScores;

  // Verification Readiness
  candidate.verificationReadiness = {
    checklist: {
      mobile: true,
      email: true,
      college: true,
      academics: true,
      resume: true,
      training: true,
      certification: true,
      assessment: true,
      videoResume: true,
    },
    readinessStatus: 'VERIFIED',
    verifiedAt: now,
  };

  candidate.rcmDomainSelection = {
    primaryDomain: 'Medical Coding',
    primarySubSpecialties: ['HCC (Risk Adjustment)', 'E/M', 'Surgery'],
    workModePreference: 'Hybrid',
    shiftPreference: 'Day Shift',
    expectedSalary: '₹3.8 LPA',
    availability: 'Immediate',
  };

  candidate.placementLifecycle = {
    currentStatus: 'AVAILABLE',
    activeInterviewsCount: 1,
    placedCompanyId: null,
    placedCompanyName: '',
    placedRole: '',
    placedCtc: '',
  };

  // Mark all modified fields for Mongoose
  ['stage1', 'stage2', 'stage3', 'stage4', 'stage5', 'stage6', 'stage7', 'stage8', 'documentVault', 'completedStages', 'verificationReadiness'].forEach(k => {
    candidate.markModified(k);
  });

  await candidate.save();
  console.log(`\nCandidate [${email}] successfully populated with demo Fresher data!`);
  console.log(`- Candidate ID: ${candidate._id}`);
  console.log(`- Full Name: ${candidate.stage1.fullName}`);
  console.log(`- Candidate Type: ${candidate.candidateType}`);
  console.log(`- Completed Stages: [${candidate.completedStages.join(', ')}]`);
  console.log(`- Talentera Score: ${candidate.talenteraScore} / 100 (${candidate.talenteraScore >= 75 ? 'Gold Verified Badge' : 'Standard'})`);
  console.log(`- Aadhaar Verified: ${candidate.stage1.aadhaarVerified}`);
  console.log(`- Academy: ${candidate.stage2.academyName}`);
  console.log(`- Certification: ${candidate.stage3.certName}`);
  console.log(`- Assessment Score: ${candidate.stage4.score}/100`);
  console.log(`- Live Charts: ${candidate.stage6.totalCharts} charts (${candidate.stage6.tier} tier, ${candidate.stage6.accuracy}%)`);
  console.log(`- Document Vault Items: ${candidate.documentVault.length}`);

  await mongoose.disconnect();
}

seedFresherDemo().catch(err => {
  console.error('Error seeding fresher demo:', err);
  process.exit(1);
});
