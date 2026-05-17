const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '../dist');
const nodeModulesAssetsDir = path.join(distDir, 'assets/node_modules');
const targetFontsDir = path.join(distDir, 'assets/fonts');

if (!fs.existsSync(nodeModulesAssetsDir)) {
  console.log('No dist/assets/node_modules folder found. Skipping web font fix.');
  process.exit(0);
}

if (!fs.existsSync(targetFontsDir)) {
  fs.mkdirSync(targetFontsDir, { recursive: true });
}

// Function to find all files recursively in a directory
function getFilesRecursively(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      getFilesRecursively(filePath, fileList);
    } else {
      fileList.push(filePath);
    }
  }
  return fileList;
}

// Function to replace content in all files in a directory recursively
function replaceInFiles(dir, searchStr, replaceStr) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      replaceInFiles(filePath, searchStr, replaceStr);
    } else if (file.endsWith('.js') || file.endsWith('.html') || file.endsWith('.css') || file.endsWith('.json')) {
      let content = fs.readFileSync(filePath, 'utf8');
      if (content.includes(searchStr)) {
        console.log(`Replacing in: ${path.relative(distDir, filePath)}`);
        content = content.split(searchStr).join(replaceStr);
        fs.writeFileSync(filePath, content, 'utf8');
      }
    }
  }
}

console.log('Scanning for font assets in dist/assets/node_modules...');
const fontFiles = getFilesRecursively(nodeModulesAssetsDir);

console.log(`Found ${fontFiles.length} files to relocate.`);

const replacements = [];

for (const oldPath of fontFiles) {
  const fileName = path.basename(oldPath);
  const newPath = path.join(targetFontsDir, fileName);

  // Move the file
  fs.renameSync(oldPath, newPath);
  console.log(`Relocated: ${fileName}`);

  // Calculate the relative URL path in dist
  const oldUrlPath = path.relative(distDir, oldPath).replace(/\\/g, '/');
  const newUrlPath = path.relative(distDir, newPath).replace(/\\/g, '/');

  // We want to replace both "/assets/node_modules/..." and "assets/node_modules/..."
  replacements.push({
    search: '/' + oldUrlPath,
    replace: '/' + newUrlPath
  });
  replacements.push({
    search: oldUrlPath,
    replace: newUrlPath
  });
}

console.log('Updating references in JS/CSS/HTML bundles...');
for (const rep of replacements) {
  replaceInFiles(distDir, rep.search, rep.replace);
}

// Clean up nodeModulesAssetsDir
console.log('Cleaning up empty directories in dist/assets/node_modules...');
function cleanEmptyDirs(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  if (files.length > 0) {
    for (const file of files) {
      const filePath = path.join(dir, file);
      if (fs.statSync(filePath).isDirectory()) {
        cleanEmptyDirs(filePath);
      }
    }
  }
  // Check again in case it's now empty
  const filesNow = fs.readdirSync(dir);
  if (filesNow.length === 0) {
    fs.rmdirSync(dir);
  }
}

cleanEmptyDirs(nodeModulesAssetsDir);
if (fs.existsSync(nodeModulesAssetsDir)) {
  fs.rmSync(nodeModulesAssetsDir, { recursive: true, force: true });
}

console.log('Successfully fixed web font paths!');
