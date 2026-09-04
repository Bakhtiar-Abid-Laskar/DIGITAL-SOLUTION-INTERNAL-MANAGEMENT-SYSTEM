const fs = require('fs');
const path = require('path');

function extractSupabaseCalls(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    const calls = [];
    
    let capturing = false;
    let currentCall = '';
    let startLine = 0;
    let openBrackets = 0;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!capturing && (line.includes('supabase.from(') || line.includes('supabase.rpc(') || line.includes('supabase.storage.from('))) {
            capturing = true;
            currentCall = line + '\n';
            startLine = i + 1;
            openBrackets = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
            if (openBrackets <= 0 && !line.trim().endsWith(',')) {
                // simple one-liner, might not have chaining on next line if it ends with semicolon
                if (line.includes('await') || line.trim().endsWith(';')) {
                    calls.push({ line: startLine, code: currentCall.trim() });
                    capturing = false;
                    currentCall = '';
                }
            }
        } else if (capturing) {
            currentCall += line + '\n';
            openBrackets += (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
            
            // Heuristic to stop capturing: brackets balanced and line ends with semicolon or empty line
            if (openBrackets <= 0 && (line.trim().endsWith(';') || line.trim() === '' || line.trim().endsWith(')'))) {
                // check if next line is a chained call like .eq
                if (i + 1 < lines.length && (lines[i+1].trim().startsWith('.') || lines[i+1].trim().startsWith('}'))) {
                    // continue capturing
                } else {
                    calls.push({ line: startLine, code: currentCall.trim() });
                    capturing = false;
                    currentCall = '';
                }
            }
        }
    }
    // catch anything left open
    if (capturing) {
        calls.push({ line: startLine, code: currentCall.trim() });
    }
    return calls;
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

const adminPath = path.join(__dirname, 'RepairShopApp', 'src');
const files = walk(adminPath);

files.forEach(file => {
    const calls = extractSupabaseCalls(file);
    if (calls.length > 0) {
        console.log(`\n--- ${file.replace(adminPath, '')} ---`);
        calls.forEach(c => console.log(`[Line ${c.line}]:\n${c.code}\n`));
    }
});
