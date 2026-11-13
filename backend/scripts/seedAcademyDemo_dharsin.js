const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const crypto = require('crypto');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));
const bcrypt = require(path.join(baseDir, 'node_modules/bcryptjs'));

const Academy = require(path.join(baseDir, 'models/Academy'));
const AcademyBatch = require(path.join(baseDir, 'models/AcademyBatch'));
const AcademyCoordinator = require(path.join(baseDir, 'models/AcademyCoordinator'));
const Candidate = require(path.join(baseDir, 'models/Candidate'));
const StudentInvite = require(path.join(baseDir, 'models/StudentInvite'));
const PlacementConfirmation = require(path.join(baseDir, 'models/PlacementConfirmation'));
const AcademyActivityEvent = require(path.join(baseDir, 'models/AcademyActivityEvent'));
const Company = require(path.join(baseDir, 'models/Company'));
const Application = require(path.join(baseDir, 'models/Application'));
const AcademyMou = require(path.join(baseDir, 'models/AcademyMou'));
const AcademyReferral = require(path.join(baseDir, 'models/AcademyReferral'));
const AcademyPayment = require(path.join(baseDir, 'models/AcademyPayment'));
const AcademyAssessment = require(path.join(baseDir, 'models/AcademyAssessment'));
const AcademyAssessmentResult = require(path.join(baseDir, 'models/AcademyAssessmentResult'));

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for Academy Demo Seeding...');

  const email = 'dharsin0201@gmail.com';
  let academy = await Academy.findOne({ email });
  if (!academy) {
    console.error('Academy not found for ' + email);
    process.exit(1);
  }
  const academyId = academy._id;
  console.log('Found Academy ID:', academyId.toString());

  // 1. Clean previous demo records for this academy
  await AcademyBatch.deleteMany({ academyId });
  await StudentInvite.deleteMany({ academyId });
  await PlacementConfirmation.deleteMany({ academyId });
  await AcademyActivityEvent.deleteMany({ academyId });
  await AcademyMou.deleteMany({ academyId });
  await AcademyReferral.deleteMany({ academyId });
  await AcademyPayment.deleteMany({ academyId });
  await AcademyAssessment.deleteMany({ academyId });
  await AcademyAssessmentResult.deleteMany({ academyId });
  await Candidate.deleteMany({ email: { $regex: /^demo\.apex\./i } });

  // 2. CRITICAL: Remove the test branch coordinator and any coordinator registered with dharsin0201@gmail.com
  // so that dharsin0201@gmail.com logs in exclusively as the Academy Head Admin
  await AcademyCoordinator.deleteMany({
    $or: [
      { academyId },
      { email },
      { email: { $regex: /@apexmedicalacademy\.com$/i } }
    ]
  });
  console.log('Cleared existing demo sub-records and conflicting coordinators.');

  // 3. Update Academy Core & Institutional KYC (Verified Institutional Profile)
  academy.name = 'Apex Healthcare & Medical Coding Academy Pvt Ltd';
  academy.contactName = 'Dharshini R';
  academy.primaryAdmin = 'Dharshini R';
  academy.phone = '+91 98765 43210';
  academy.specialty = 'Medical Coding / Medical Billing / AR Calling';
  academy.headquarters = 'Chennai';
  academy.branches = ['Chennai Main Campus', 'Coimbatore Branch', 'Hyderabad Branch'];
  academy.tier = 'AAPC Approved Partner';
  academy.totalAlumni = '12,500+';
  academy.studentsUploaded = 20;
  academy.verifiedPct = 92;
  academy.isVerified = true;
  academy.kycStatus = 'verified';
  academy.kycVerifiedAt = new Date(Date.now() - 5 * 86400000);
  academy.kycSubmittedAt = new Date(Date.now() - 30 * 86400000);
  academy.kycNotes = 'Institutional documents, PAN/GST, signatory authorization, and AAPC Education Partner accreditation verified.';
  academy.kycRejectionReason = '';

  const branchConfigs = [
    {
      name: 'Chennai Main Campus',
      city: 'Chennai',
      state: 'Tamil Nadu',
      phone: '+91 44 2233 4455',
      address: 'Level 5, Anna Salai, Guindy, Chennai, Tamil Nadu - 600032',
      coordinatorName: 'Anand Venkatesh',
      coordinatorDesignation: 'Senior Placement Coordinator',
      coordinatorEmail: 'anand.placements@apexmedicalacademy.com',
      coordinatorMobile: '9876543150'
    },
    {
      name: 'Coimbatore Branch',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      phone: '+91 422 2345 678',
      address: 'Cross Cut Road, Gandhipuram, Coimbatore, Tamil Nadu - 641012',
      coordinatorName: 'Kavitha Senthil',
      coordinatorDesignation: 'Placement Officer',
      coordinatorEmail: 'kavitha.placements@apexmedicalacademy.com',
      coordinatorMobile: '9876543151'
    },
    {
      name: 'Hyderabad Branch',
      city: 'Hyderabad',
      state: 'Telangana',
      phone: '+91 40 4567 8901',
      address: 'Mindspace Road, Hitec City, Hyderabad, Telangana - 500081',
      coordinatorName: 'Rajesh Naidu',
      coordinatorDesignation: 'Regional Placement Lead',
      coordinatorEmail: 'rajesh.placements@apexmedicalacademy.com',
      coordinatorMobile: '9876543152'
    }
  ];

  academy.kycData = {
    legalEntityName: 'Apex Healthcare & Medical Coding Academy Pvt Ltd',
    registrationType: 'Private Limited',
    cinOrRegistrationNumber: 'U80903TN2018PTC123456',
    yearEstablished: '2018',
    website: 'https://apexmedicalacademy.com',
    panNumber: 'AABCA1234F',
    gstin: '33AABCA1234F1Z9',
    signatoryName: 'Dharshini R',
    signatoryDesignation: 'Managing Director & Chief Academic Officer',
    signatoryEmail: 'dharsin0201@gmail.com',
    signatoryMobile: '9876543210',
    registeredAddress: 'Level 5, Anna Salai, Guindy, Chennai, Tamil Nadu - 600032',
    city: 'Chennai',
    state: 'Tamil Nadu',
    pincode: '600032',
    primarySpecialty: 'Medical Coding',
    specialties: ['Medical Coding', 'Medical Billing', 'AR Calling'],
    branches: branchConfigs,
    accreditations: ['AAPC Approved Education Partner', 'AHIMA Academic Partner', 'ISO 9001:2015 Certified Institution'],
    certifiedTrainedCount: '12,500+',
    activeBatchesPerYear: '24',
    regCertificateUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/incorporation_certificate.pdf',
    gstCertificateUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/gst_certificate.pdf',
    panDocumentUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/pan_card.pdf',
    accreditationDocumentUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/aapc_partner_certificate.pdf',
    declarationAccepted: true,
    submittedByName: 'Dharshini R',
    submittedAt: new Date(Date.now() - 30 * 86400000)
  };

  // 4. Courses with complete syllabus and progress
  academy.courses = [
    {
      category: 'Medical Coding',
      duration: '3 Months (180 Hours)',
      title: 'Comprehensive Medical Coding Professional (CPC Preparation)',
      totalHrs: 180,
      batches: 8,
      enrolled: 120,
      status: 'active',
      fees: 35000,
      trainingMode: 'Hybrid',
      startDate: new Date('2026-01-10'),
      endDate: new Date('2026-04-10'),
      syllabus: [
        'Anatomy & Physiology Fundamentals',
        'Medical Terminology & Pathophysiology',
        'ICD-10-CM Coding Guidelines & Conventions',
        'CPT Procedure Coding (Surgery, E/M, Radiology, Pathology)',
        'HCPCS Level II National Codes',
        'AAPC CPC Mock Practice & Exam Strategy'
      ],
      completedTopics: [
        'Anatomy & Physiology Fundamentals',
        'Medical Terminology & Pathophysiology',
        'ICD-10-CM Coding Guidelines & Conventions'
      ]
    },
    {
      category: 'Medical Billing & AR',
      duration: '2 Months (120 Hours)',
      title: 'US Healthcare Revenue Cycle & AR Specialist',
      totalHrs: 120,
      batches: 5,
      enrolled: 65,
      status: 'active',
      fees: 25000,
      trainingMode: 'Online',
      startDate: new Date('2026-02-01'),
      endDate: new Date('2026-04-01'),
      syllabus: [
        'US Healthcare Ecosystem & Major Payers',
        'Patient Eligibility & Benefits Verification',
        'Charge Entry & EDI Claim Scrubbing',
        'Payment Posting & Variance Reconciliation',
        'Denial Management & Root Cause Appeals',
        'AR Calling Protocols & Payer Communications'
      ],
      completedTopics: [
        'US Healthcare Ecosystem & Major Payers',
        'Patient Eligibility & Benefits Verification'
      ]
    },
    {
      category: 'Specialty Coding',
      duration: '6 Weeks (80 Hours)',
      title: 'HCC & Risk Adjustment Coding Masterclass (CRC Preparation)',
      totalHrs: 80,
      batches: 3,
      enrolled: 40,
      status: 'active',
      fees: 28000,
      trainingMode: 'Offline',
      startDate: new Date('2026-02-15'),
      endDate: new Date('2026-03-31'),
      syllabus: [
        'Medicare Advantage & CMS-HCC Risk Adjustment Models',
        'Risk Adjustment Factor (RAF) Score Computation',
        'Chronic Condition Documentation Integrity',
        'RADV Audit Protocols & Provider Queries',
        'CRC Practice Examinations & Clinical Vignettes'
      ],
      completedTopics: [
        'Medicare Advantage & CMS-HCC Risk Adjustment Models'
      ]
    }
  ];

  // 5. Question Bank
  academy.questions = [
    {
      question: 'In ICD-10-CM, when a code requires a 7th character and has fewer than 6 characters, which placeholder character must be used?',
      topic: 'ICD-10',
      type: 'mcq',
      difficulty: 'Mid',
      marks: 2,
      status: 'Active',
      courseTitle: 'Comprehensive Medical Coding Professional (CPC Preparation)',
      options: ['X', '0', 'Z', '#'],
      answer: '0'
    },
    {
      question: 'Which element is NOT part of the Medical Decision Making (MDM) table updated for E/M coding guidelines?',
      topic: 'E/M Coding',
      type: 'mcq',
      difficulty: 'Hard',
      marks: 3,
      status: 'Active',
      courseTitle: 'Comprehensive Medical Coding Professional (CPC Preparation)',
      options: [
        'Number and complexity of problems addressed',
        'Amount and/or complexity of data to be reviewed and analyzed',
        'Comprehensive physical examination documentation',
        'Risk of complications and/or morbidity of patient management'
      ],
      answer: '2'
    },
    {
      question: 'What does the abbreviation MEAT stand for in risk adjustment documentation compliance?',
      topic: 'HCC',
      type: 'mcq',
      difficulty: 'Mid',
      marks: 2,
      status: 'Active',
      courseTitle: 'HCC & Risk Adjustment Coding Masterclass (CRC Preparation)',
      options: [
        'Manage, Evaluate, Assess, Treat',
        'Monitor, Examine, Analyze, Track',
        'Medical, Evaluation, Assessment, Treatment',
        'Measure, Evidence, Audit, Test'
      ],
      answer: '0'
    },
    {
      question: 'Which Claim Adjustment Reason Code (CARC) standardly represents "Claim lacks information or has submission/billing error(s)"?',
      topic: 'Billing / AR',
      type: 'mcq',
      difficulty: 'Easy',
      marks: 2,
      status: 'Active',
      courseTitle: 'US Healthcare Revenue Cycle & AR Specialist',
      options: ['CO-16', 'CO-45', 'PR-1', 'CO-97'],
      answer: '0'
    },
    {
      question: 'HCPCS Level II codes are alphanumeric and begin with a single letter from A through V, followed by how many digits?',
      topic: 'HCPCS',
      type: 'fill_blank',
      difficulty: 'Mid',
      marks: 2,
      status: 'Active',
      courseTitle: 'Comprehensive Medical Coding Professional (CPC Preparation)',
      options: [],
      answer: '4'
    },
    {
      question: 'The surgical removal of the gallbladder is medically coded as what procedure?',
      topic: 'Surgery Coding',
      type: 'mcq',
      difficulty: 'Easy',
      marks: 1,
      status: 'Active',
      courseTitle: 'Comprehensive Medical Coding Professional (CPC Preparation)',
      options: ['Cholecystectomy', 'Appendectomy', 'Colectomy', 'Gastrectomy'],
      answer: '0'
    }
  ];

  // 6. Placements on Academy
  academy.placements = [
    {
      studentName: 'Priya Raman',
      role: 'Medical Coder (CPC)',
      company: 'Omega Healthcare',
      city: 'Chennai',
      ctc: '₹5.2 LPA',
      placementSource: 'Talentera Platform',
      joiningStatus: 'Joined',
      joiningDate: new Date('2026-02-15'),
      offerLetterStatus: 'Received',
      date: 'Feb 2026'
    },
    {
      studentName: 'Karthik Subramanian',
      role: 'Risk Adjustment Coder (CRC)',
      company: 'Optum',
      city: 'Hyderabad',
      ctc: '₹5.5 LPA',
      placementSource: 'Talentera Platform',
      joiningStatus: 'Joined',
      joiningDate: new Date('2026-01-15'),
      offerLetterStatus: 'Received',
      date: 'Jan 2026'
    },
    {
      studentName: 'Divya Bharati',
      role: 'Revenue Cycle Specialist (CRCR)',
      company: 'Access Healthcare',
      city: 'Chennai',
      ctc: '₹4.8 LPA',
      placementSource: 'Campus Placement Drive',
      joiningStatus: 'Joined',
      joiningDate: new Date('2026-01-20'),
      offerLetterStatus: 'Received',
      date: 'Jan 2026'
    },
    {
      studentName: 'Gokulnath Selvam',
      role: 'Inpatient Coder (CIC / CCS)',
      company: 'AGS Health',
      city: 'Coimbatore',
      ctc: '₹5.8 LPA',
      placementSource: 'Talentera Platform',
      joiningStatus: 'Offer Accepted',
      joiningDate: new Date('2026-03-15'),
      offerLetterStatus: 'Received',
      date: 'Feb 2026'
    }
  ];

  // 7. Gallery
  academy.gallery = [
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=800&q=80',
      caption: 'AAPC CPC Classroom Training & Live Chart Auditing Lab (Chennai Campus)'
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=800&q=80',
      caption: 'Annual Convocation & Certified Professional Coder Felicitation Ceremony'
    },
    {
      type: 'image',
      url: 'https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=800&q=80',
      caption: 'Interactive US Healthcare Denial Management & Payer Calling Simulation'
    }
  ];

  await academy.save();
  console.log('Academy core & verified institutional KYC profile updated.');

  // 8. Create Branch Placement Coordinators
  const coordinatorPassword = await bcrypt.hash('Password123', 10);
  for (const b of branchConfigs) {
    await AcademyCoordinator.create({
      academyId,
      branchName: b.name,
      branchCity: b.city,
      branchState: b.state,
      branchPhone: b.phone,
      branchAddress: b.address,
      name: b.coordinatorName,
      designation: b.coordinatorDesignation,
      email: b.coordinatorEmail,
      mobile: b.coordinatorMobile,
      role: 'branch_coordinator',
      status: 'active',
      passwordHash: coordinatorPassword,
      activatedAt: new Date(Date.now() - 20 * 86400000),
      lastLoginAt: new Date(Date.now() - 2 * 3600000),
      createdByName: 'Dharshini R'
    });
  }
  console.log('3 Branch Placement Coordinators registered and activated.');

  // 9. Create Batches linked to Branches
  const batch1 = await AcademyBatch.create({
    academyId,
    code: 'APEX-CPC-2026-B1',
    course: 'Comprehensive Medical Coding Professional (CPC Preparation)',
    branch: 'Chennai Main Campus',
    studentsCount: 10,
    completionPct: 70,
    trainingMode: 'Hybrid',
    capacity: 25,
    startDate: new Date('2026-01-10'),
    endDate: new Date('2026-04-10'),
    status: 'Active'
  });

  const batch2 = await AcademyBatch.create({
    academyId,
    code: 'APEX-AR-2026-B2',
    course: 'US Healthcare Revenue Cycle & AR Specialist',
    branch: 'Coimbatore Branch',
    studentsCount: 6,
    completionPct: 85,
    trainingMode: 'Online',
    capacity: 20,
    startDate: new Date('2026-02-01'),
    endDate: new Date('2026-04-01'),
    status: 'Active'
  });

  const batch3 = await AcademyBatch.create({
    academyId,
    code: 'APEX-HCC-2026-B3',
    course: 'HCC & Risk Adjustment Coding Masterclass (CRC Preparation)',
    branch: 'Hyderabad Branch',
    studentsCount: 4,
    completionPct: 45,
    trainingMode: 'Offline',
    capacity: 15,
    startDate: new Date('2026-02-15'),
    endDate: new Date('2026-03-31'),
    status: 'Active'
  });
  console.log('3 Academy batches created with assigned branches.');

  // 10. Find or pick Company for applications and interviews
  const companies = await Company.find({}).limit(5);
  const optumCo = companies.find(c => /optum|omega|access|abc/i.test(c.companyName)) || companies[0];

  // 11. Seed 20 Realistic Students covering all 10 summary tabs
  const defaultPassword = await bcrypt.hash('Password123', 10);

  const studentDefinitions = [
    // 4 Placed
    { name: 'Priya Raman', batch: batch1, city: 'Chennai', phone: '9876543101', stage: 'placed', score: 94, role: 'Medical Coder', company: 'Omega Healthcare', ctc: '₹5.2 LPA' },
    { name: 'Karthik Subramanian', batch: batch3, city: 'Hyderabad', phone: '9876543102', stage: 'placed', score: 96, role: 'Risk Adjustment Coder', company: 'Optum', ctc: '₹5.5 LPA' },
    { name: 'Divya Bharati', batch: batch2, city: 'Coimbatore', phone: '9876543103', stage: 'placed', score: 90, role: 'Revenue Cycle Specialist', company: 'Access Healthcare', ctc: '₹4.8 LPA' },
    { name: 'Gokulnath Selvam', batch: batch1, city: 'Chennai', phone: '9876543104', stage: 'placed', score: 92, role: 'Inpatient Coder', company: 'AGS Health', ctc: '₹5.8 LPA' },

    // 3 Interviewing
    { name: 'Harini Venkat', batch: batch1, city: 'Chennai', phone: '9876543105', stage: 'interviewing', score: 88, role: 'Medical Coder', company: 'Omega Healthcare' },
    { name: 'Abhinav Sundar', batch: batch1, city: 'Chennai', phone: '9876543106', stage: 'interviewing', score: 91, role: 'Junior Coder', company: 'Optum' },
    { name: 'Swetha Balaji', batch: batch3, city: 'Hyderabad', phone: '9876543121', stage: 'interviewing', score: 89, role: 'CRC Coder', company: 'AGS Health' },

    // 2 Shortlisted
    { name: 'Bavani Shankar', batch: batch2, city: 'Coimbatore', phone: '9876543107', stage: 'shortlisted', score: 86, role: 'AR Specialist', company: 'Access Healthcare' },
    { name: 'Janani Raman', batch: batch2, city: 'Coimbatore', phone: '9876543108', stage: 'shortlisted', score: 84, role: 'Billing Specialist', company: 'AGS Health' },

    // 4 Profile Live (Ready for match)
    { name: 'Deepika Raj', batch: batch1, city: 'Chennai', phone: '9876543109', stage: 'live', score: 84 },
    { name: 'Jayakumar Ram', batch: batch1, city: 'Chennai', phone: '9876543110', stage: 'live', score: 82 },
    { name: 'Kavitha Sundaram', batch: batch3, city: 'Hyderabad', phone: '9876543111', stage: 'live', score: 86 },
    { name: 'Naveen Chander', batch: batch2, city: 'Coimbatore', phone: '9876543112', stage: 'live', score: 80 },

    // 3 In Progress
    { name: 'Ezhil Vannan', batch: batch1, city: 'Chennai', phone: '9876543114', stage: 'in_progress', score: 72 },
    { name: 'Iswarya Murugan', batch: batch2, city: 'Coimbatore', phone: '9876543115', stage: 'in_progress', score: 76 },
    { name: 'Pavithra Rajan', batch: batch1, city: 'Chennai', phone: '9876543113', stage: 'in_progress', score: 75 },

    // 1 Stuck (Needs academy nudge)
    { name: 'Kalyan Varma', batch: batch3, city: 'Hyderabad', phone: '9876543116', stage: 'stuck', score: 68 },

    // 3 Awaiting Approval (Pending Sign-Off in Verification Queue)
    { name: 'Siddharth Narayan', batch: batch1, city: 'Chennai', phone: '9876543118', stage: 'pending_approval' },
    { name: 'Trisha Krishnan', batch: batch2, city: 'Coimbatore', phone: '9876543119', stage: 'pending_approval' },
    { name: 'Venkatesh Prabhu', batch: batch3, city: 'Hyderabad', phone: '9876543120', stage: 'pending_approval' }
  ];

  const seededCandidates = [];

  for (let i = 0; i < studentDefinitions.length; i++) {
    const s = studentDefinitions[i];
    const sEmail = `demo.apex.student${i + 1}@talentera.in`;

    let completedStages = [1, 2, 3, 4, 5, 6, 7];
    let isVer = true;
    let stage2Ver = true;

    if (s.stage === 'in_progress' || s.stage === 'stuck') {
      completedStages = [1, 2, 3, 4];
      isVer = false;
    } else if (s.stage === 'pending_approval') {
      completedStages = [1];
      stage2Ver = false;
      isVer = false;
    }

    const cand = await Candidate.create({
      email: sEmail,
      passwordHash: defaultPassword,
      mobile: s.phone,
      candidateType: 'fresher',
      completedStages,
      isVerified: isVer,
      stage1: {
        fullName: s.name,
        mobile: s.phone,
        email: sEmail,
        city: s.city,
        state: s.city === 'Hyderabad' ? 'Telangana' : 'Tamil Nadu',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dob: '2002-05-14',
        experience: 'Fresher',
        currentRole: s.batch.course.includes('Coding') ? 'Medical Coder Trainee' : 'RCM Trainee',
        aadhaarVerified: true,
        aadhaarStatus: 'VERIFIED',
        verificationMethod: 'digilocker',
        verifiedAt: new Date(Date.now() - 25 * 86400000),
        maskedAadhaar: `XXXX XXXX ${1000 + i}`
      },
      stage2: {
        academyId: academyId.toString(),
        academyName: academy.name,
        batch: s.batch.code,
        branch: s.batch.branch,
        courseName: s.batch.course,
        trainingHours: s.batch.course.includes('CPC') ? 180 : s.batch.course.includes('AR') ? 120 : 80,
        trainingMode: s.batch.trainingMode,
        verified: stage2Ver,
        submittedAt: new Date(Date.now() - (s.stage === 'stuck' ? 72 : 12) * 3600000)
      },
      stage3: {
        certStatus: 'verified',
        isCertified: true,
        certCode: s.batch.course.includes('HCC') ? 'CRC' : 'CPC',
        certName: s.batch.course.includes('HCC') ? 'Certified Risk Adjustment Coder' : 'Certified Professional Coder',
        body: 'AAPC',
        memberId: `AAPC-${987000 + i}`
      },
      stage4: {
        score: s.score || 78,
        total: 100,
        passed: (s.score || 78) >= 75,
        completedAt: new Date(Date.now() - 10 * 86400000)
      },
      stage5: {
        videoUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/pitch_sample.mp4',
        approved: true
      },
      stage6: {
        chartsAudited: 50,
        accuracyScore: 98,
        speedScore: 94
      },
      stage7: {
        resumeUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/resume_sample.pdf'
      }
    });

    seededCandidates.push({ cand, def: s });

    // StudentInvite record
    await StudentInvite.create({
      academyId,
      batchId: s.batch._id,
      batchCode: s.batch.code,
      name: s.name,
      email: sEmail,
      mobile: s.phone,
      course: s.batch.course,
      type: 'fresher',
      candidateId: cand._id,
      emailSentAt: new Date(Date.now() - 15 * 86400000),
      emailOpenedAt: new Date(Date.now() - 14 * 86400000),
      smsSentAt: new Date(Date.now() - 15 * 86400000),
      smsDeliveredAt: new Date(Date.now() - 15 * 86400000),
      whatsappSentAt: new Date(Date.now() - 15 * 86400000),
      registeredAt: s.stage === 'pending_approval' ? null : new Date(Date.now() - 10 * 86400000)
    });

    // Placement Confirmation record for placed students
    if (s.stage === 'placed') {
      await PlacementConfirmation.create({
        academyId,
        candidateId: cand._id,
        candidateName: s.name,
        candidateEmail: sEmail,
        companyId: optumCo?._id || null,
        companyName: s.company,
        batchCode: s.batch.code,
        courseTitle: s.batch.course,
        role: s.role,
        ctc: s.ctc,
        city: s.city,
        placedDate: new Date(Date.now() - (i + 1) * 5 * 86400000),
        status: 'confirmed',
        studentConfirmed: true,
        companyConfirmed: true,
        academyConfirmed: true,
        retentionConfirmed: true
      });
    }

    // Application & Activity Event for interview / shortlisted / placed students
    if (['placed', 'interviewing', 'shortlisted'].includes(s.stage)) {
      const appStatus = s.stage === 'placed' ? 'hired' : s.stage === 'interviewing' ? 'interviewing' : 'shortlisted';
      const app = await Application.create({
        candidateId: cand._id,
        companyId: optumCo?._id || new mongoose.Types.ObjectId(),
        jobId: optumCo?.jobs?.[0]?.jobId || 'TLT-2026-1842',
        status: appStatus,
        coverNote: 'Academy verified profile application'
      });

      const eventType = s.stage === 'placed' ? 'offer_accepted' : s.stage === 'interviewing' ? 'interview_scheduled' : 'shortlisted';
      await AcademyActivityEvent.create({
        academyId,
        candidateId: cand._id,
        candidateName: s.name,
        companyId: optumCo?._id || null,
        companyName: s.company || (optumCo?.companyName || 'Omega Healthcare'),
        applicationId: app._id,
        jobTitle: s.role || 'Medical Coder',
        batchCode: s.batch.code,
        courseTitle: s.batch.course,
        eventType,
        createdAt: new Date(Date.now() - i * 86400000)
      });
    }
  }

  // 12. Create College MoUs
  await AcademyMou.create([
    {
      academyId,
      collegeName: 'PSG College of Arts and Science',
      city: 'Coimbatore',
      contactPerson: 'Dr. S. Radhakrishnan (Dean - Placements)',
      phone: '+91 422 430 3300',
      email: 'placements@psgcas.ac.in',
      status: 'Active',
      signedOn: new Date('2025-08-15'),
      validUntil: new Date('2027-08-14'),
      studentsCovered: 120,
      scope: 'Campus skill training & CPC certification bridge program for Life Science graduates.',
      documentUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/mou_psg_college.pdf',
      documentName: 'PSG_Talentera_MoU_Executed.pdf'
    },
    {
      academyId,
      collegeName: 'Sri Ramachandra Institute of Higher Education and Research',
      city: 'Chennai',
      contactPerson: 'Prof. K. Venkatesh (Director of Corporate Relations)',
      phone: '+91 44 2476 8027',
      email: 'corporate.relations@sriramachandra.edu.in',
      status: 'Signed',
      signedOn: new Date('2025-11-01'),
      validUntil: new Date('2026-10-31'),
      studentsCovered: 85,
      scope: 'Medical billing, ICD-10 coding labs, and direct placement drives for allied health graduates.',
      documentUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/mou_sri_ramachandra.pdf',
      documentName: 'SRIHER_Apex_Academy_MoU.pdf'
    }
  ]);
  console.log('2 College MoUs seeded.');

  // 13. Create Academy Referrals
  await AcademyReferral.create([
    {
      academyId,
      referredAcademyName: 'MedCode Pro Academy',
      contactPerson: 'Mr. Saravanan K (Founder)',
      phone: '+91 98401 23456',
      email: 'contact@medcodepro.in',
      city: 'Madurai',
      studentsPerYear: '250',
      notes: 'Premier coding academy in Madurai region looking for automated verification and campus drives.',
      status: 'onboarded'
    },
    {
      academyId,
      referredAcademyName: 'CareRCM Training Institute',
      contactPerson: 'Ms. Mythili R (Director)',
      phone: '+91 97890 65432',
      email: 'admin@carercm.edu.in',
      city: 'Tiruchirappalli',
      studentsPerYear: '180',
      notes: 'Specializes in US billing and denial management training.',
      status: 'contacted'
    }
  ]);
  console.log('2 Academy Referrals seeded.');

  // 14. Create Academy Payments
  await AcademyPayment.create([
    {
      academyId,
      amount: 35000,
      mode: 'Bank Transfer / NEFT',
      purpose: 'Annual AAPC Partner Accreditation & Institutional Verification Fee',
      paidOn: new Date(Date.now() - 20 * 86400000),
      reference: 'NEFT202602158912',
      detail: 'HDFC Bank - Guindy Branch',
      proofUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/payment_receipt_neft.pdf',
      notes: 'Paid via Corporate Net Banking for institutional partner badge.',
      status: 'verified'
    },
    {
      academyId,
      amount: 15000,
      mode: 'UPI',
      purpose: 'Batch Assessment Verification Credits (100 Student Credits)',
      paidOn: new Date(Date.now() - 5 * 86400000),
      reference: 'UPI/603412984123',
      detail: 'Google Pay Business',
      proofUrl: 'https://storage.googleapis.com/talentera-uploads-prod/demo/payment_receipt_upi.png',
      notes: 'Assessment platform verification credits.',
      status: 'verified'
    }
  ]);
  console.log('2 Academy Payments seeded.');

  // 15. Create Academy Assessment & Student Results
  const assessment = await AcademyAssessment.create({
    academyId,
    title: 'CPC Comprehensive Mock Examination - Term 1',
    course: 'Comprehensive Medical Coding Professional (CPC Preparation)',
    batchCodes: ['APEX-CPC-2026-B1'],
    instructions: 'Timed mock examination testing ICD-10-CM, CPT, and HCPCS guidelines. 70% passing threshold.',
    durationMins: 45,
    passPercentage: 70,
    status: 'published',
    questions: [
      {
        type: 'mcq',
        text: 'What is the correct sequencing rule when coding a manifestation condition and an underlying etiology in ICD-10-CM?',
        options: [
          'Etiology code first, followed by manifestation code',
          'Manifestation code first, followed by etiology code',
          'Either code can be sequenced first',
          'Only the manifestation code should be reported'
        ],
        answer: '0',
        marks: 2
      },
      {
        type: 'mcq',
        text: 'Which modifier is appended to indicate a significant, separately identifiable evaluation and management service by the same physician on the same day of a procedure?',
        options: ['Modifier 25', 'Modifier 59', 'Modifier 76', 'Modifier 91'],
        answer: '0',
        marks: 2
      },
      {
        type: 'mcq',
        text: 'Which CARC code standardly represents payment is denied because the service was not medically necessary?',
        options: ['CO-50', 'CO-16', 'PR-2', 'OA-23'],
        answer: '0',
        marks: 2
      },
      {
        type: 'fill_blank',
        text: 'In CPT coding, how many digits make up a Category I procedure code?',
        options: [],
        answer: '5',
        marks: 2
      },
      {
        type: 'qa',
        text: 'Briefly explain the documentation requirements for Medicare Annual Wellness Visits under Risk Adjustment.',
        options: [],
        answer: 'Must assess chronic conditions using MEAT criteria, review medications, update medical/family history, and formulate a personalized prevention plan.',
        marks: 2
      }
    ]
  });

  // Seed Assessment Results for top 5 candidates
  const topCandidates = seededCandidates.slice(0, 5);
  for (const item of topCandidates) {
    const sc = item.def.score || 90;
    await AcademyAssessmentResult.create({
      academyId,
      assessmentId: assessment._id,
      assessmentTitle: assessment.title,
      candidateId: item.cand._id,
      candidateEmail: item.cand.email,
      rawScore: Math.round((sc / 100) * 10),
      totalMarks: 10,
      scorePct: sc,
      source: 'platform',
      status: 'graded',
      conductedOn: new Date(Date.now() - 3 * 86400000)
    });
  }
  console.log('Assessment and 5 candidate results seeded.');

  console.log('\n===============================================================');
  console.log('SUCCESS: All Academy Dashboard steps and demo data seeded!');
  console.log('Academy Account: dharsin0201@gmail.com');
  console.log('Role: Academy Head / MD');
  console.log('Institutional KYC: Verified');
  console.log('Branches: 3 (Chennai Main Campus, Coimbatore Branch, Hyderabad Branch)');
  console.log('Batches: 3');
  console.log('Candidates: 20 across all 10 summary stages');
  console.log('Confirmed Placements: 4');
  console.log('College MoUs: 2');
  console.log('Referrals: 2');
  console.log('Payments: 2 (Verified)');
  console.log('Assessment & Results: 1 Published, 5 Graded');
  console.log('===============================================================\n');

  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
