const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');

const serviceAccountPath = path.resolve(__dirname, '../spin-it-a135a-firebase-adminsdk-fbsvc-bff41b4927.json');

if (fs.existsSync(serviceAccountPath)) {
  const serviceAccount = require(serviceAccountPath);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    projectId: 'spin-it-a135a',
  });
} else {
  admin.initializeApp({
    projectId: 'spin-it-a135a',
  });
}

const db = admin.firestore();

function generateCode(name) {
  const cleanName = (name || '')
    .toUpperCase()
    .replace(/[^A-Z]/g, '')
    .slice(0, 4);

  const prefix = cleanName.length >= 3 ? cleanName.padEnd(4, 'X') : 'SPIN';
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `${prefix}${suffix}`;
}

async function backfill() {
  console.log('🚀 Starting Referral Code Backfill for SpinZo...');
  const usersSnap = await db.collection('users').get();
  console.log(`📊 Found ${usersSnap.docs.length} total users in Firestore.`);

  let updatedCount = 0;
  let alreadyHaveCount = 0;

  for (const doc of usersSnap.docs) {
    const data = doc.data();
    const userId = doc.id;
    const name = data.name || 'Customer';

    // If already has a valid 8-char referral code registered in referral_codes
    if (data.referralCode && data.referralCode.length >= 6) {
      const codeRef = db.collection('referral_codes').doc(data.referralCode);
      const codeSnap = await codeRef.get();
      if (!codeSnap.exists) {
        await codeRef.set({
          code: data.referralCode,
          uid: userId,
          name,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      alreadyHaveCount++;
      continue;
    }

    // Generate unique code
    let uniqueCode = '';
    let isUnique = false;
    let attempts = 0;

    while (!isUnique && attempts < 10) {
      attempts++;
      const candidate = generateCode(name);
      const codeSnap = await db.collection('referral_codes').doc(candidate).get();
      if (!codeSnap.exists) {
        uniqueCode = candidate;
        isUnique = true;
      }
    }

    if (!uniqueCode) {
      uniqueCode = `SPIN${userId.substring(0, 4).toUpperCase()}`;
    }

    // Write to referral_codes and update user
    const batch = db.batch();
    batch.set(db.collection('referral_codes').doc(uniqueCode), {
      code: uniqueCode,
      uid: userId,
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    batch.update(doc.ref, {
      referralCode: uniqueCode,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    await batch.commit();
    updatedCount++;
    console.log(`✅ [${updatedCount}] Assigned code ${uniqueCode} to ${name} (${userId})`);
  }

  console.log('\n======================================');
  console.log(`🎉 Backfill completed!`);
  console.log(`   - Already had codes: ${alreadyHaveCount}`);
  console.log(`   - Newly assigned:    ${updatedCount}`);
  console.log('======================================');
}

backfill()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('❌ Backfill failed:', err);
    process.exit(1);
  });
