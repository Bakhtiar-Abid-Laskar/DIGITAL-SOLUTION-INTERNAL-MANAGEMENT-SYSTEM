const fs = require('fs');
const path = require('path');

const targets = ['admin-panel', 'RepairShopApp', 'packages', 'supabase', 'docs'];

let mojibakeMatches = [];
let bomFiles = [];
let rupeeLiterals = [];

function checkFile(fullPath) {
  const buf = fs.readFileSync(fullPath);
  // Check BOM
  if (buf[0] === 0xEF && buf[1] === 0xBB && buf[2] === 0xBF) {
    bomFiles.push(fullPath);
  }

  const content = buf.toString('utf8');
  const lines = content.split('\n');

  lines.forEach((line, idx) => {
    // Check mojibake
    if (/â‚¹|â€|ГўвЂљВ№|Ã¢â€љÂ¹|ÃƒÂ¢|Â₹|Ã‚/g.test(line)) {
      mojibakeMatches.push({ file: fullPath, line: idx + 1, text: line.trim() });
    }
    // Check raw rupee symbol occurrences
    if (/₹/g.test(line)) {
      rupeeLiterals.push({ file: fullPath, line: idx + 1, text: line.trim() });
    }
  });
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (['node_modules', '.next', '.git', 'dist', 'build', '.expo', 'android', 'ios'].includes(entry.name)) continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (/\.(tsx?|jsx?|mjs|json|sql|html|svg|md)$/i.test(entry.name)) {
      try {
        checkFile(fullPath);
      } catch (err) {}
    }
  }
}

targets.forEach(scanDir);

console.log(`BOM files found: ${bomFiles.length}`);
bomFiles.forEach(f => console.log(`  BOM: ${f}`));

console.log(`\nMojibake matches found: ${mojibakeMatches.length}`);
mojibakeMatches.forEach(m => console.log(`  ${m.file}:${m.line}: ${m.text}`));

console.log(`\nRaw ₹ literal occurrences: ${rupeeLiterals.length}`);
// Print first 20 raw rupee literals
rupeeLiterals.slice(0, 30).forEach(m => console.log(`  ${m.file}:${m.line}: ${m.text}`));
