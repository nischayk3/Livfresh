// Script to seed vendors to Firestore
// Run this script once to populate your Firebase database with vendor data
// Usage: npx ts-node scripts/seedVendors.ts

import { seedVendors } from '../src/services/vendorSeed';

const runSeed = async () => {
  try {
    console.log('🚀 Starting vendor seed process...');
    const result = await seedVendors();
    console.log(`✅ Successfully seeded ${result.count} vendors!`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding vendors:', error);
    process.exit(1);
  }
};

runSeed();








