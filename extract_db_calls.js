const fs = require('fs');
const path = require('path');

function getDbCalls(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fromRegex = /from\(['"]([^'"]+)['"]\)/g;
    const rpcRegex = /rpc\(['"]([^'"]+)['"]\)/g;
    const storageRegex = /\.storage\.from\(['"]([^'"]+)['"]\)/g;
    
    const tables = new Set();
    const rpcs = new Set();
    const buckets = new Set();
    
    let match;
    while ((match = fromRegex.exec(content)) !== null) {
        tables.add(match[1]);
    }
    while ((match = rpcRegex.exec(content)) !== null) {
        rpcs.add(match[1]);
    }
    while ((match = storageRegex.exec(content)) !== null) {
        buckets.add(match[1]);
    }
    // Remove buckets from tables since .storage.from matches fromRegex too
    for (const b of buckets) {
        tables.delete(b);
    }
    
    return { tables: Array.from(tables), rpcs: Array.from(rpcs), buckets: Array.from(buckets) };
}

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.expo') && !file.includes('.next')) {
                results = results.concat(walk(fullPath));
            }
        } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
            results.push(fullPath);
        }
    });
    return results;
}

const adminPath = path.join(__dirname, 'admin-panel', 'src');
const mobilePath = path.join(__dirname, 'RepairShopApp', 'src');

const adminFiles = walk(adminPath);
const mobileFiles = walk(mobilePath);

const adminInventory = [];
adminFiles.forEach(file => {
    const calls = getDbCalls(file);
    if (calls.tables.length > 0 || calls.rpcs.length > 0 || calls.buckets.length > 0) {
        adminInventory.push({ file: file.replace(adminPath, ''), ...calls });
    }
});

const mobileInventory = [];
mobileFiles.forEach(file => {
    const calls = getDbCalls(file);
    if (calls.tables.length > 0 || calls.rpcs.length > 0 || calls.buckets.length > 0) {
        mobileInventory.push({ file: file.replace(mobilePath, ''), ...calls });
    }
});

console.log('--- ADMIN WEB APP ---');
adminInventory.forEach(item => {
    console.log(`File: ${item.file}`);
    console.log(`  Tables: ${item.tables.join(', ')}`);
    console.log(`  RPCs: ${item.rpcs.join(', ')}`);
    console.log(`  Buckets: ${item.buckets.join(', ')}`);
});

console.log('\n--- MOBILE APP ---');
mobileInventory.forEach(item => {
    console.log(`File: ${item.file}`);
    console.log(`  Tables: ${item.tables.join(', ')}`);
    console.log(`  RPCs: ${item.rpcs.join(', ')}`);
    console.log(`  Buckets: ${item.buckets.join(', ')}`);
});
