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

async function cleanDemo() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB for Demo Cleanup...');

  const targetEmail = 'dharsin0201@gmail.com';
  const academy = await Academy.findOne({ email: targetEmail });
  if (!academy) {
    console.log('Academy not found for ' + targetEmail);
    await mongoose.disconnect();
    return;
  }
  const academyId = academy._id;

  // 1. Delete candidates created with demo email pattern & their applications
  const demoCands = await Candidate.find({ email: { $regex: /^demo\.apex\./i } });
  const candIds = demoCands.map(c => c._id);
  const appDel = await Application.deleteMany({ candidateId: { $in: candIds } });
  const candDel = await Candidate.deleteMany({ _id: { $in: candIds } });
  console.log(`Deleted ${candDel.deletedCount} demo candidates & ${appDel.deletedCount} applications.`);

  // 2. Delete batches, invites, placements, activity events
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

  // 4. Delete coordinators associated with this academy or dharsin0201@gmail.com
  const coordDel = await AcademyCoordinator.deleteMany({
    $or: [
      { academyId },
      { email: targetEmail },
      { email: { $regex: /@apexmedicalacademy\.com$/i } }
    ]
  });
  console.log(`Deleted ${coordDel.deletedCount} coordinator records.`);

  // 5. Reset Academy fields to clean state
  academy.courses = [];
  academy.questions = [];
  academy.placements = [];
  academy.gallery = [];
  academy.branches = [];
  academy.studentsUploaded = 0;
  academy.verifiedPct = 0;
  academy.kycStatus = 'pending';
  academy.kycData = {};
  await academy.save();
  console.log('Reset academy courses, questions, placements, gallery, and KYC data.');

  await mongoose.disconnect();
  console.log('Demo cleanup completed successfully.');
}

cleanDemo().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
