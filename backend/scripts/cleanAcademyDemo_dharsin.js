const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));

const Academy = require(path.join(baseDir, 'models/Academy'));
const AcademyBatch = require(path.join(baseDir, 'models/AcademyBatch'));
const AcademyCoordinator = require(path.join(baseDir, 'models/AcademyCoordinator'));
const Candidate = require(path.join(baseDir, 'models/Candidate'));
const StudentInvite = require(path.join(baseDir, 'models/StudentInvite'));
const PlacementConfirmation = require(path.join(baseDir, 'models/PlacementConfirmation'));
const AcademyActivityEvent = require(path.join(baseDir, 'models/AcademyActivityEvent'));
const Application = require(path.join(baseDir, 'models/Application'));
const AcademyMou = require(path.join(baseDir, 'models/AcademyMou'));
const AcademyReferral = require(path.join(baseDir, 'models/AcademyReferral'));
const AcademyPayment = require(path.join(baseDir, 'models/AcademyPayment'));
const AcademyAssessment = require(path.join(baseDir, 'models/AcademyAssessment'));
const AcademyAssessmentResult = require(path.join(baseDir, 'models/AcademyAssessmentResult'));
const Company = require(path.join(baseDir, 'models/Company'));

async function cleanDemo() {
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 20000 });
  console.log('Connected to MongoDB for Demo Cleanup...');

  const targetEmail = 'dharsin0201@gmail.com';
  const academy = await Academy.findOne({ email: targetEmail });
  let academyId = null;
  if (academy) {
    academyId = academy._id;
  } else {
    console.log('Academy not found for ' + targetEmail);
  }

  // 1. Delete all demo candidates created with demo email patterns & their applications
  const demoCands = await Candidate.find({
    $or: [
      { email: { $regex: /^demo\.apex\./i } },
      { email: { $regex: /@talentera\.test$/i } },
      { email: { $regex: /@example\.com$/i } }
    ]
  });
  const candIds = demoCands.map(c => c._id);
  const appDel = await Application.deleteMany({ candidateId: { $in: candIds } });
  const candDel = await Candidate.deleteMany({ _id: { $in: candIds } });
  console.log(`Deleted ${candDel.deletedCount} demo candidates & ${appDel.deletedCount} applications.`);

  // 2. Delete batches, invites, placements, activity events for this academy
  if (academyId) {
    const batchDel = await AcademyBatch.deleteMany({ academyId });
    const inviteDel = await StudentInvite.deleteMany({ academyId });
    const placeDel = await PlacementConfirmation.deleteMany({ academyId });
    const eventDel = await AcademyActivityEvent.deleteMany({ academyId });
    console.log(`Deleted ${batchDel.deletedCount} batches, ${inviteDel.deletedCount} invites, ${placeDel.deletedCount} placements, ${eventDel.deletedCount} events.`);

    // 3. Delete MoUs, Referrals, Payments, Assessments & Results
    const mouDel = await AcademyMou.deleteMany({ academyId });
    const refDel = await AcademyReferral.deleteMany({ academyId });
    const payDel = await AcademyPayment.deleteMany({ academyId });
    const assDel = await AcademyAssessment.deleteMany({ academyId });
    const resDel = await AcademyAssessmentResult.deleteMany({ academyId });
    console.log(`Deleted ${mouDel.deletedCount} MoUs, ${refDel.deletedCount} referrals, ${payDel.deletedCount} payments, ${assDel.deletedCount} assessments, ${resDel.deletedCount} results.`);
  }

  // 4. Delete coordinators associated with this academy, apex, or talentera test domains
  const coordDel = await AcademyCoordinator.deleteMany({
    $or: [
      ...(academyId ? [{ academyId }] : []),
      { email: targetEmail },
      { email: { $regex: /@apexmedicalacademy\.com$/i } },
      { email: { $regex: /@talentera\.test$/i } }
    ]
  });
  console.log(`Deleted ${coordDel.deletedCount} coordinator records.`);

  // 5. Delete demo academy head.demo@talentera.test if present
  const headDemoDel = await Academy.deleteMany({ email: 'head.demo@talentera.test' });
  if (headDemoDel.deletedCount > 0) {
    console.log('Deleted head.demo@talentera.test academy.');
  }

  // 6. Reset dharsin0201@gmail.com Academy fields to clean fresh state
  if (academy) {
    academy.courses = [];
    academy.questions = [];
    academy.placements = [];
    academy.gallery = [];
    academy.branches = [];
    academy.branchList = [];
    academy.studentsUploaded = 0;
    academy.verifiedPct = 0;
    academy.isVerified = false;
    academy.kycStatus = 'pending';
    academy.kycData = {};
    academy.kycNotes = '';
    academy.kycVerifiedAt = null;
    academy.kycSubmittedAt = null;
    academy.kycRejectionReason = '';
    academy.totalAlumni = '0';
    academy.specialty = '';
    academy.tier = '';
    await academy.save();
    console.log('Reset academy dharsin0201@gmail.com fields, branches, and KYC to clean state.');
  }

  await mongoose.disconnect();
  console.log('Demo cleanup completed successfully.');
}

cleanDemo().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
