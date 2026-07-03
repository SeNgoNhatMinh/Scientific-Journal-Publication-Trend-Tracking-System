require('dotenv').config();
const mongoose = require('mongoose');
const WorkspaceMember = require('./src/models/WorkspaceMember');
const envConfig = require('./src/config/env');

async function migrate() {
  try {
    await mongoose.connect(envConfig.MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Find all members that don't have a status explicitly set to 'pending' 
    // or members created before this update.
    // The safest way is to update members that don't have a status field
    const result = await WorkspaceMember.updateMany(
      { status: { $exists: false } },
      { $set: { status: 'active' } }
    );
    
    // Also, owner should always be active just in case
    const ownerResult = await WorkspaceMember.updateMany(
      { role: 'owner' },
      { $set: { status: 'active' } }
    );

    console.log(`Updated ${result.modifiedCount} old members without status`);
    console.log(`Updated ${ownerResult.modifiedCount} owners`);
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

migrate();
