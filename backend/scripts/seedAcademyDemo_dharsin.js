const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));
const bcrypt = require(path.join(baseDir, 'node_modules/bcryptjs'));

const Academy = require(path.join(baseDir, 'models/Academy'));
const AcademyBatch = require(path.join(baseDir, 'models/AcademyBatch'));
const Candidate = require(path.join(baseDir, 'models/Candidate'));
const StudentInvite = require(path.join(baseDir, 'models/StudentInvite'));
const PlacementConfirmation = require(path.join(baseDir, 'models/PlacementConfirmation'));
const AcademyActivityEvent = require(path.join(baseDir, 'models/AcademyActivityEvent'));
const Company = require(path.join(baseDir, 'models/Company'));
const Application = require(path.join(baseDir, 'models/Application'));

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  const email = 'dharsin0201@gmail.com';
  let academy = await Academy.findOne({ email });
  if (!academy) {
    console.error('Academy not found for ' + email);
    process.exit(1);
  }
  const academyId = academy._id;
  console.log('Found Academy:', academyId.toString());

  // 1. Clean previous demo records for this academy
  await AcademyBatch.deleteMany({ academyId });
  await StudentInvite.deleteMany({ academyId });
  await PlacementConfirmation.deleteMany({ academyId });
  await AcademyActivityEvent.deleteMany({ academyId });
  await Candidate.deleteMany({ email: { $regex: /^demo\.apex\./i } });
  console.log('Cleared existing demo sub-records.');

  // 2. Update Academy Core & Institutional KYC
  academy.name = 'Apex Medical Coding & RCM Academy';
  academy.contactName = 'Dharshini R';
  academy.primaryAdmin = 'Dharshini R';
  academy.phone = '+91 98765 43210';
  academy.specialty = 'Medical Coding & Billing';
  academy.headquarters = 'Chennai';
  academy.branches = ['Chennai - Guindy', 'Coimbatore - Gandhipuram', 'Hyderabad - Hitec City', 'Bangalore - Indiranagar'];
  academy.tier = 'AAPC Approved Partner';
  academy.totalAlumni = '12,500+';
  academy.studentsUploaded = 20;
  academy.verifiedPct = 90;
  academy.isVerified = true;
  academy.kycStatus = 'verified';
  academy.kycVerifiedAt = new Date();
  academy.kycSubmittedAt = new Date(Date.now() - 30 * 86400000);
  academy.kycNotes = 'Institutional documents and AAPC accreditation verified successfully.';
  academy.kycRejectionReason = '';

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
    specialties: ['Medical Coding', 'Medical Billing', 'AR Calling', 'Risk Adjustment / HCC', 'Inpatient DRG'],
    branches: ['Chennai - Guindy', 'Coimbatore - Gandhipuram', 'Hyderabad - Hitec City'],
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

  // 3. Courses
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

  // 4. Question Bank
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

  // 5. Placements on Academy
  academy.placements = [
    {
      studentName: 'Priya Raman',
      role: 'Medical Coder (CPC)',
      company: 'Omega Healthcare',
      city: 'Chennai',
      ctc: '₹5.2 LPA',
      placementSource: 'Talentera Platform',
      joiningStatus: 'Offer Accepted',
      joiningDate: new Date('2026-03-01'),
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

  // 6. Gallery
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
  console.log('Academy core profile updated.');

  // 7. Create Batches
  const batch1 = await AcademyBatch.create({
    academyId,
    code: 'APEX-CPC-2026-B1',
    course: 'Comprehensive Medical Coding Professional (CPC Preparation)',
    studentsCount: 10,
    completionPct: 70,
    status: 'Active'
  });

  const batch2 = await AcademyBatch.create({
    academyId,
    code: 'APEX-AR-2026-B2',
    course: 'US Healthcare Revenue Cycle & AR Specialist',
    studentsCount: 6,
    completionPct: 85,
    status: 'Active'
  });

  const batch3 = await AcademyBatch.create({
    academyId,
    code: 'APEX-HCC-2026-B3',
    course: 'HCC & Risk Adjustment Coding Masterclass (CRC Preparation)',
    studentsCount: 4,
    completionPct: 45,
    status: 'Active'
  });
  console.log('3 Academy batches created.');

  // 8. Find or pick Company for applications and interviews
  const companies = await Company.find({}).limit(5);
  const optumCo = companies.find(c => /optum|omega|access|abc/i.test(c.companyName)) || companies[0];

  // 9. Seed 20 Realistic Students
  const defaultPassword = await bcrypt.hash('Password123', 10);

  const studentDefinitions = [
    // 4 Placed
    { name: 'Priya Raman', batch: batch1, city: 'Chennai', phone: '9876543101', stage: 'placed', score: 94, role: 'Medical Coder', company: 'Omega Healthcare', ctc: '₹5.2 LPA' },
    { name: 'Karthik Subramanian', batch: batch3, city: 'Hyderabad', phone: '9876543102', stage: 'placed', score: 96, role: 'Risk Adjustment Coder', company: 'Optum', ctc: '₹5.5 LPA' },
    { name: 'Divya Bharati', batch: batch2, city: 'Chennai', phone: '9876543103', stage: 'placed', score: 90, role: 'Revenue Cycle Specialist', company: 'Access Healthcare', ctc: '₹4.8 LPA' },
    { name: 'Gokulnath Selvam', batch: batch1, city: 'Coimbatore', phone: '9876543104', stage: 'placed', score: 92, role: 'Inpatient Coder', company: 'AGS Health', ctc: '₹5.8 LPA' },

    // 4 In Interview Pipeline
    { name: 'Harini Venkat', batch: batch1, city: 'Chennai', phone: '9876543105', stage: 'interviewing', score: 88, role: 'Medical Coder', company: 'Omega Healthcare' },
    { name: 'Abhinav Sundar', batch: batch1, city: 'Bangalore', phone: '9876543106', stage: 'interviewing', score: 91, role: 'Junior Coder', company: 'Optum' },
    { name: 'Bavani Shankar', batch: batch2, city: 'Coimbatore', phone: '9876543107', stage: 'shortlisted', score: 86, role: 'AR Specialist', company: 'Access Healthcare' },
    { name: 'Janani Raman', batch: batch2, city: 'Chennai', phone: '9876543108', stage: 'shortlisted', score: 84, role: 'Billing Specialist', company: 'AGS Health' },

    // 5 Live on Platform (Ready for match)
    { name: 'Deepika Raj', batch: batch1, city: 'Chennai', phone: '9876543109', stage: 'live', score: 84 },
    { name: 'Jayakumar Ram', batch: batch1, city: 'Coimbatore', phone: '9876543110', stage: 'live', score: 82 },
    { name: 'Kavitha Sundaram', batch: batch3, city: 'Hyderabad', phone: '9876543111', stage: 'live', score: 86 },
    { name: 'Naveen Chander', batch: batch2, city: 'Bangalore', phone: '9876543112', stage: 'live', score: 80 },
    { name: 'Pavithra Rajan', batch: batch1, city: 'Chennai', phone: '9876543113', stage: 'live', score: 85 },

    // 4 In Progress (taking assessment/practice)
    { name: 'Ezhil Vannan', batch: batch1, city: 'Chennai', phone: '9876543114', stage: 'in_progress', score: 72 },
    { name: 'Iswarya Murugan', batch: batch2, city: 'Coimbatore', phone: '9876543115', stage: 'in_progress', score: 76 },
    { name: 'Kalyan Varma', batch: batch3, city: 'Hyderabad', phone: '9876543116', stage: 'stuck', score: 68 },
    { name: 'Meenakshi Sundaram', batch: batch2, city: 'Chennai', phone: '9876543117', stage: 'stuck', score: 70 },

    // 3 Pending Academy Sign-Off (In Approvals Queue!)
    { name: 'Siddharth Narayan', batch: batch1, city: 'Chennai', phone: '9876543118', stage: 'pending_approval' },
    { name: 'Trisha Krishnan', batch: batch2, city: 'Coimbatore', phone: '9876543119', stage: 'pending_approval' },
    { name: 'Venkatesh Prabhu', batch: batch3, city: 'Hyderabad', phone: '9876543120', stage: 'pending_approval' },
  ];

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
        state: 'Tamil Nadu',
        gender: i % 2 === 0 ? 'Female' : 'Male',
        dob: '2002-05-14',
        experience: 'Fresher',
        currentRole: s.batch.course.includes('Coding') ? 'Medical Coder Trainee' : 'RCM Trainee',
        aadhaarVerified: true,
        aadhaarStatus: 'VERIFIED',
        verificationMethod: 'digilocker',
        verifiedAt: new Date(),
        maskedAadhaar: `XXXX XXXX ${1000 + i}`
      },
      stage2: {
        academyId: academyId.toString(),
        academyName: academy.name,
        batch: s.batch.code,
        branch: s.city,
        courseName: s.batch.course,
        trainingHours: 140,
        trainingMode: 'Hybrid',
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
        completedAt: new Date()
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

  console.log('Seeded 20 Students, Invites, Placements, and Activity Events.');
  await mongoose.disconnect();
  console.log('Done!');
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
