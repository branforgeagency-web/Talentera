const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));

const Academy = require(path.join(baseDir, 'models/Academy'));
const AcademyBatch = require(path.join(baseDir, 'models/AcademyBatch'));
const Candidate = require(path.join(baseDir, 'models/Candidate'));
const StudentInvite = require(path.join(baseDir, 'models/StudentInvite'));
const PlacementConfirmation = require(path.join(baseDir, 'models/PlacementConfirmation'));
const AcademyActivityEvent = require(path.join(baseDir, 'models/AcademyActivityEvent'));
const Application = require(path.join(baseDir, 'models/Application'));

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

  // 1. Delete candidates created with demo email pattern
  const demoCands = await Candidate.find({ email: { $regex: /^demo\.apex\./i } });
  const candIds = demoCands.map(c => c._id);
  await Application.deleteMany({ candidateId: { $in: candIds } });
  const candDel = await Candidate.deleteMany({ _id: { $in: candIds } });
  console.log(`Deleted ${candDel.deletedCount} demo candidates & their applications.`);

  // 2. Delete batches, invites, placements, activity events
  const batchDel = await AcademyBatch.deleteMany({ academyId });
  const inviteDel = await StudentInvite.deleteMany({ academyId });
  const placeDel = await PlacementConfirmation.deleteMany({ academyId });
  const eventDel = await AcademyActivityEvent.deleteMany({ academyId });
  console.log(`Deleted ${batchDel.deletedCount} batches, ${inviteDel.deletedCount} invites, ${placeDel.deletedCount} placement confirmations, ${eventDel.deletedCount} activity events.`);

  // 3. Reset Academy fields to clean state
  academy.courses = [];
  academy.questions = [];
  academy.placements = [];
  academy.gallery = [];
  academy.studentsUploaded = 0;
  academy.verifiedPct = 0;
  academy.kycStatus = 'pending';
  await academy.save();
  console.log('Reset academy courses, questions, placements, and gallery.');

  await mongoose.disconnect();
  console.log('Demo cleanup completed successfully.');
}

cleanDemo().catch(err => {
  console.error('Cleanup error:', err);
  process.exit(1);
});
