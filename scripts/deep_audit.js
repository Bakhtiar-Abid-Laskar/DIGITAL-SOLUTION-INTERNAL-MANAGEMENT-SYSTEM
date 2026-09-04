const fs = require('fs');
const path = require('path');

// Scan all components in admin-panel and RepairShopApp
function scanDir(dir, ext = ['.tsx', '.ts']) {
  let files = [];
  if (!fs.existsSync(dir)) return files;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (!['node_modules', '.git', '.next', '.expo', 'dist', 'build'].includes(e.name)) {
        files = files.concat(scanDir(full, ext));
      }
    } else if (ext.some(x => e.name.endsWith(x))) {
      files.push(full.replace(/\\\\/g, '/'));
    }
  }
  return files;
}

const adminComponents = scanDir('admin-panel/src/components');
const mobileComponents = scanDir('RepairShopApp/src/components');
const sharedSrc = scanDir('packages/shared/src');
const adminUtils = scanDir('admin-panel/src/utils').concat(scanDir('admin-panel/src/lib'));
const mobileUtils = scanDir('RepairShopApp/src/utils').concat(scanDir('RepairShopApp/src/lib'));

console.log({
  adminComponentsCount: adminComponents.length,
  mobileComponentsCount: mobileComponents.length,
  sharedSrcCount: sharedSrc.length,
  adminUtilsCount: adminUtils.length,
  mobileUtilsCount: mobileUtils.length
});

// Extract all RPC calls in frontend apps
const allAppFiles = scanDir('admin-panel/src').concat(scanDir('RepairShopApp/src')).concat(scanDir('packages/shared/src'));
const rpcCalls = new Set();
const envVars = new Set();
const todos = [];

allAppFiles.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  
  // RPC regex
  const rpcMatches = content.matchAll(/\.rpc\(\s*['"]([^'"]+)['"]/g);
  for (const m of rpcMatches) {
    rpcCalls.add({ rpc: m[1], file: f });
  }

  // Env vars
  const envMatches = content.matchAll(/process\.env\.([A-Z0-9_]+)|Constants\.expoConfig\?\.extra\?\.([A-Z0-9_]+)/g);
  for (const m of envMatches) {
    envVars.add(m[1] || m[2]);
  }

  // TODOs / FIXMEs
  lines.forEach((line, idx) => {
    if (line.includes('TODO') || line.includes('FIXME') || line.includes('HACK') || line.includes('XXX')) {
      todos.push({ file: f, line: idx + 1, text: line.trim() });
    }
  });
});

console.log('\n--- RPC CALLS IN APP CODE ---');
const rpcMap = {};
rpcCalls.forEach(r => {
  rpcMap[r.rpc] = (rpcMap[r.rpc] || []);
  rpcMap[r.rpc].push(r.file);
});
console.log(JSON.stringify(rpcMap, null, 2));

console.log('\n--- ENV VARS IN APP CODE ---');
console.log([...envVars]);

console.log('\n--- TODOS FOUND ---', todos.length);
console.log(todos.slice(0, 20));
