const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const appDir = path.join(rootDir, 'RepairShopApp');
const androidDir = path.join(appDir, 'android');
const releasesDir = path.join(rootDir, 'releases');

// 1. Resolve version
let version = '1.0.0';
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(appDir, 'package.json'), 'utf8'));
  if (pkg.version) version = pkg.version;
} catch (e) {
  console.warn('Could not read package.json version, defaulting to 1.0.0');
}

// 2. Format dates
const now = new Date();
const year = now.getFullYear();
const month = String(now.getMonth() + 1).padStart(2, '0');
const day = String(now.getDate()).padStart(2, '0');

const dateCompact = `${year}${month}${day}`;
const dateHyphen = `${year}-${month}-${day}`;

const apkCompactName = `DS${dateCompact}v${version}.apk`;
const apkHyphenName = `DS${dateHyphen}v${version}.apk`;

console.log('====================================================');
console.log(`Building Release APK: DS(date)v(version)`);
console.log(`Version:    ${version}`);
console.log(`Date:       ${dateCompact} / ${dateHyphen}`);
console.log(`Output:     releases/${apkCompactName}`);
console.log('====================================================\n');

// 3. Ensure releases directory exists
if (!fs.existsSync(releasesDir)) {
  fs.mkdirSync(releasesDir, { recursive: true });
}

// 4. Run gradle assembleRelease
const gradlewCmd = process.platform === 'win32' ? '.\\gradlew assembleRelease' : './gradlew assembleRelease';
console.log(`Running Gradle release build in: ${androidDir}`);
execSync(gradlewCmd, {
  cwd: androidDir,
  stdio: 'inherit',
});

// 5. Copy built APK
const sourceApk = path.join(androidDir, 'app', 'build', 'outputs', 'apk', 'release', 'app-release.apk');
if (!fs.existsSync(sourceApk)) {
  console.error(`\nError: Built APK not found at ${sourceApk}`);
  process.exit(1);
}

const destCompact = path.join(releasesDir, apkCompactName);
const destHyphen = path.join(releasesDir, apkHyphenName);
const destRoot = path.join(rootDir, 'DigitalSolution-release.apk');

fs.copyFileSync(sourceApk, destCompact);
fs.copyFileSync(sourceApk, destHyphen);
fs.copyFileSync(sourceApk, destRoot);

const stats = fs.statSync(destCompact);
const sizeMb = (stats.size / (1024 * 1024)).toFixed(1);

console.log('\n====================================================');
console.log('APK Build & Copy Successful!');
console.log(`Size: ${sizeMb} MB (${stats.size} bytes)`);
console.log(`Stored in releases folder:`);
console.log(`  1. releases/${apkCompactName}`);
console.log(`  2. releases/${apkHyphenName}`);
console.log(`  3. DigitalSolution-release.apk (root shortcut)`);
console.log('====================================================\n');

