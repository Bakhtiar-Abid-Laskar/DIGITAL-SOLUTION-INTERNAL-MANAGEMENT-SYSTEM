const fs = require('fs');
const lines = fs.readFileSync('react_doctor_exhaustive_audit.md', 'utf8').split('\n');
const results = {};
let currentRule = '';

lines.forEach(line => {
    const ruleMatch = line.match(/^#### react-doctor\/(.*)/);
    if (ruleMatch) {
        currentRule = ruleMatch[1].trim();
        if (!results[currentRule]) results[currentRule] = new Set();
    }
    const fileMatch = line.match(/^\*\*File:\*\* `([^:]+):/);
    if (fileMatch && currentRule) {
        results[currentRule].add(fileMatch[1].trim());
    }
});

Object.entries(results).forEach(([rule, files]) => {
    console.log(`${rule} (${files.size} components)`);
    files.forEach(f => console.log(`  ${f}`));
});
