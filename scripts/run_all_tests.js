const fs = require('fs');
const { execSync } = require('child_process');
const path = require('path');

// Verify parity between packages/shared/src and RepairShopApp/src/lib/shared/src (NEW-06)
function checkSharedDrift() {
  const sharedDir = path.resolve(__dirname, '../packages/shared/src');
  const mobileDir = path.resolve(__dirname, '../RepairShopApp/src/lib/shared/src');
  
  function getTsFiles(dir) {
    let files = [];
    if (!fs.existsSync(dir)) return files;
    fs.readdirSync(dir, { withFileTypes: true }).forEach(ent => {
      const full = path.join(dir, ent.name);
      if (ent.isDirectory()) {
        files = files.concat(getTsFiles(full));
      } else if (ent.isFile() && (ent.name.endsWith('.ts') || ent.name.endsWith('.tsx'))) {
        files.push(full);
      }
    });
    return files;
  }

  const sharedFiles = getTsFiles(sharedDir);
  let driftCount = 0;

  sharedFiles.forEach(sf => {
    const rel = path.relative(sharedDir, sf);
    const mf = path.join(mobileDir, rel);
    if (!fs.existsSync(mf)) {
      console.error(`❌ DRIFT: Missing file in mobile shared copy: ${rel}`);
      driftCount++;
    } else {
      const sContent = fs.readFileSync(sf, 'utf8');
      const mContent = fs.readFileSync(mf, 'utf8');
      if (sContent !== mContent) {
        console.error(`❌ DRIFT: Content mismatch between packages/shared/src/${rel} and mobile copy`);
        driftCount++;
      }
    }
  });

  if (driftCount > 0) {
    console.error(`❌ Shared package drift detected (${driftCount} files). Run sync before tests.`);
    process.exit(1);
  }
  console.log('✅ Shared package parity confirmed: 0 drift between packages/shared and RepairShopApp');
}

checkSharedDrift();

console.log('Running test verification suites...');


const suites = [
  'packages/shared/src/billing.test.ts',
  'packages/shared/src/incentive.test.ts',
  'packages/shared/src/payroll.test.ts',
  'packages/shared/src/formatCurrency.test.ts',
  'packages/shared/src/phone.test.ts',
  'packages/shared/src/date.test.ts',
  'packages/shared/src/badgeConfig.test.ts',
  'packages/shared/src/imageUtils.test.ts',
  'packages/shared/src/storageUrlCache.test.ts',
  'packages/shared/src/concurrencyStock.test.ts',
  'packages/shared/src/hooks/useDebounceValue.test.ts',
  'admin-panel/src/lib/permissionMatrix.test.ts',
  'admin-panel/src/lib/schemaValidation.test.ts',
  'admin-panel/src/lib/edgeFunctions.test.ts',
  'admin-panel/src/lib/purchaseIntakeFlow.test.ts',
  'admin-panel/src/lib/resendRateLimit.test.ts',
  'admin-panel/src/app/(admin)/jobs/[id]/reducer.test.ts',
  'admin-panel/src/app/(admin)/sales/new/salesFlow.test.ts',
  'admin-panel/src/utils/salary.test.ts'
];

const results = [];

suites.forEach(testFile => {
  try {
    const output = execSync(`npx jest ${testFile} --passWithNoTests --runInBand`, {
      cwd: 'admin-panel',
      encoding: 'utf8',
      timeout: 30000
    });
    console.log(`✅ PASS: ${testFile}`);
    results.push({ file: testFile, status: 'PASS', output: output.trim() });
  } catch (err) {
    console.log(`❌ FAIL: ${testFile}`);
    results.push({ file: testFile, status: 'FAIL', error: (err.stdout || '') + (err.stderr || err.message) });
  }
});

fs.writeFileSync('test_run_results.json', JSON.stringify(results, null, 2));
console.log('\nAll suites executed. Summary:', results.map(r => `${r.file}: ${r.status}`).join('\n'));
