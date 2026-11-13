const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);
const path = require('path');
const baseDir = 'C:/office websires/Talentera/backend';
require(path.join(baseDir, 'node_modules/dotenv')).config({ path: path.join(baseDir, '.env') });
const mongoose = require(path.join(baseDir, 'node_modules/mongoose'));

async function inspect() {
  await mongoose.connect(process.env.MONGO_URI);
  const Academy = require(path.join(baseDir, 'models/Academy'));
  const AcademyCoordinator = require(path.join(baseDir, 'models/AcademyCoordinator'));

  const acad = await Academy.findOne({ email: 'dharsin0201@gmail.com' });
  console.log('Academy found:');
  if (acad) {
    console.log('ID:', acad._id.toString());
    console.log('Name:', acad.name);
    console.log('Email:', acad.email);
    console.log('KYC Status:', acad.kycStatus);
    console.log('Branches:', JSON.stringify(acad.branches, null, 2));
    console.log('KYC Branches:', JSON.stringify(acad.kycData?.branches, null, 2));
    console.log('Courses count:', acad.courses?.length);
    console.log('Questions count:', acad.questions?.length);
    console.log('Placements count:', acad.placements?.length);
  } else {
    console.log('None');
  }

  const coords = await AcademyCoordinator.find({
    $or: [{ email: 'dharsin0201@gmail.com' }, { academyId: acad?._id }]
  });
  console.log('Coordinators:', coords.map(c => ({
    id: c._id.toString(),
    academyId: c.academyId?.toString(),
    name: c.name,
    email: c.email,
    branchName: c.branchName
  })));

  await mongoose.disconnect();
}

inspect().catch(err => {
  console.error(err);
  process.exit(1);
});
