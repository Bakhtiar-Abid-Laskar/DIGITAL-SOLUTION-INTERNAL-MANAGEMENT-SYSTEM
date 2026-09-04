const { execSync } = require('child_process');
const fs = require('fs');

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
