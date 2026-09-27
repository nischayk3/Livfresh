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
  'services/premium_laundry.webp',
  'services/shoe_clean.webp',
];

async function uploadFile(localPath, storagePath) {
  const fileData = fs.readFileSync(localPath);
  const fileSize = (fileData.length / 1024).toFixed(1);
  console.log(`Uploading ${storagePath} (${fileSize}KB)...`);
  
  const storageRef = ref(storage, storagePath);
  await uploadBytes(storageRef, fileData, {
    contentType: 'image/webp',
    cacheControl: 'public, max-age=31536000',
  });

  const downloadURL = await getDownloadURL(storageRef);
  console.log(`✅ Uploaded: ${downloadURL}`);
  return { file: storagePath, url: downloadURL };
}

async function main() {
  console.log('🚀 Uploading new SKU assets to Firebase Storage...\n');
  const results = [];
  for (const file of FILES_TO_UPLOAD) {
    const localPath = path.join(ASSETS_DIR, file);
    const storagePath = `app_assets/${file}`;
    if (!fs.existsSync(localPath)) {
      console.error(`❌ Local file not found: ${localPath}`);
      process.exit(1);
    }
    const result = await uploadFile(localPath, storagePath);
    results.push(result);
  }
  console.log('\n=== ASSET URL REGISTRY ENTRIES ===\n');
  results.forEach(r => {
    const key = r.file
      .replace('app_assets/', '')
      .replace('.webp', '')
      .replace(/\//g, '_');
    console.log(`  ${key}: '${r.url}',`);
  });
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
