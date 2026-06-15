/**
 * Upload WebP assets to Firebase Storage using Firebase JS SDK
 * Storage rules allow unauthenticated writes to app_assets/ temporarily
 * 
 * Run: node scripts/upload_assets.cjs
 */
const { initializeApp } = require('firebase/app');
const { getStorage, ref, uploadBytes, getDownloadURL } = require('firebase/storage');
const path = require('path');
const fs = require('fs');

const firebaseConfig = {
  apiKey: "AIzaSyBnwzJVax1qx2oN3nf7INqpXLF8rVrUWqw",
  authDomain: "spin-it-a135a.firebaseapp.com",
  projectId: "spin-it-a135a",
  storageBucket: "spin-it-a135a.firebasestorage.app",
  messagingSenderId: "597897149776",
  appId: "1:597897149776:web:c9a7d4b5c2291f8b35c055",
};

const app = initializeApp(firebaseConfig);
const storage = getStorage(app);

const ASSETS_DIR = path.resolve(__dirname, '../assets/webp_upload');

const FILES_TO_UPLOAD = [
  'onboarding_screen_1.webp',
  'onboarding_screen_2.webp',
  'onboarding_pickup_v2.webp',
  'banner_offer_3d.webp',
  'banner_delivery_3d.webp',
  'banner_relax_3d.webp',
  'services/wash_fold.webp',
  'services/ironing.webp',
  'services/blanket_wash.webp',
  'services/wash_iron.webp',
  'subscription_illustration.webp',
  'location_illustration.webp',
  'process_video.mp4',
];

async function uploadFile(localPath, storagePath) {
  const contentType = storagePath.endsWith('.mp4') ? 'video/mp4' : 'image/webp';
  const fileData = fs.readFileSync(localPath);
  const fileSize = (fileData.length / 1024).toFixed(1);
  
  console.log(`  Uploading ${storagePath} (${fileSize}KB)...`);
  
  const storageRef = ref(storage, storagePath);
  
  await uploadBytes(storageRef, fileData, {
    contentType,
    cacheControl: 'public, max-age=31536000',
  });

  const downloadURL = await getDownloadURL(storageRef);
  console.log(`    ✅ Done`);
  return { file: storagePath, url: downloadURL };
}

async function main() {
  console.log('🚀 Uploading assets to Firebase Storage...\n');
  console.log(`   Source: ${ASSETS_DIR}`);
  console.log(`   Bucket: spin-it-a135a.firebasestorage.app`);
  console.log(`   NOTE: Storage rules must allow writes to app_assets/ path\n`);
  
  const results = [];
  let failed = 0;
  
  for (const file of FILES_TO_UPLOAD) {
    const localPath = path.join(ASSETS_DIR, file);
    const storagePath = `app_assets/${file}`;
    
    if (!fs.existsSync(localPath)) {
      console.error(`  ❌ Not found: ${localPath}`);
      failed++;
      continue;
    }
    
    try {
      const result = await uploadFile(localPath, storagePath);
      results.push(result);
    } catch (err) {
      console.error(`  ❌ Failed ${file}: ${err.code || err.message || err}`);
      failed++;
    }
  }
  
  console.log(`\n✅ Uploaded: ${results.length} | ❌ Failed: ${failed}\n`);
  
  // Output URL registry
  console.log('=== ASSET URL REGISTRY (copy to src/utils/assetUrls.ts) ===\n');
  results.forEach(r => {
    const key = r.file
      .replace('app_assets/', '')
      .replace('.webp', '')
      .replace('.mp4', '')
      .replace(/\//g, '_');
    console.log(`  ${key}: '${r.url}',`);
  });
  
  process.exit(0);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
