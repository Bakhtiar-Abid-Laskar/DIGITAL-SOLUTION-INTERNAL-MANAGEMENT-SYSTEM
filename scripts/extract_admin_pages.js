const fs = require('fs');
const path = require('path');

const adminPages = [
  'admin-panel/src/app/layout.tsx',
  'admin-panel/src/app/login/page.tsx',
  'admin-panel/src/app/(admin)/layout.tsx',
  'admin-panel/src/app/(admin)/page.tsx',
  'admin-panel/src/app/(admin)/jobs/page.tsx',
  'admin-panel/src/app/(admin)/jobs/new/page.tsx',
  'admin-panel/src/app/(admin)/jobs/[id]/page.tsx',
  'admin-panel/src/app/(admin)/sales/page.tsx',
  'admin-panel/src/app/(admin)/sales/new/page.tsx',
  'admin-panel/src/app/(admin)/sales/[id]/page.tsx',
  'admin-panel/src/app/(admin)/inventory/page.tsx',
  'admin-panel/src/app/(admin)/materials/page.tsx',
  'admin-panel/src/app/(admin)/job-types/page.tsx',
  'admin-panel/src/app/(admin)/customers/page.tsx',
  'admin-panel/src/app/(admin)/staff/page.tsx',
  'admin-panel/src/app/(admin)/staff/leaves/page.tsx',
  'admin-panel/src/app/(admin)/attendance/page.tsx',
  'admin-panel/src/app/(admin)/salary/page.tsx',
  'admin-panel/src/app/(admin)/expenditure/page.tsx',
  'admin-panel/src/app/(admin)/pending-payments/page.tsx',
  'admin-panel/src/app/(admin)/reports/page.tsx',
  'admin-panel/src/app/(admin)/settings/page.tsx',
  'admin-panel/src/app/(admin)/settings/geofence/page.tsx',
  'admin-panel/src/app/(admin)/settings/whatsapp/page.tsx',
  'admin-panel/src/app/api/test/route.ts'
];

const pageDetails = [];

adminPages.forEach(filePath => {
  if (!fs.existsSync(filePath)) return;
  const code = fs.readFileSync(filePath, 'utf8');
  const lines = code.split('\n');
  
  const queries = lines.filter(l => l.includes('supabase.from(') || l.includes('supabase.rpc(') || l.includes('supabase.functions.invoke('));
  const stateHooks = lines.filter(l => l.includes('useState(') || l.includes('useReducer('));
  
  pageDetails.push({
    file: filePath,
    lineCount: lines.length,
    queries: queries.map(q => q.trim()),
    stateCount: stateHooks.length
  });
});

fs.writeFileSync('admin_pages_summary.json', JSON.stringify(pageDetails, null, 2));
console.log('Admin pages summary written. Total:', pageDetails.length);
