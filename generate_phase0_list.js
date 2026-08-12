const fs = require('fs');
const path = require('path');

const logFile = path.join(__dirname, 'react_doctor_output_utf8.txt');
const logContent = fs.readFileSync(logFile, 'utf8');

const lines = logContent.split('\n').map(l => l.trim().replace(/\u001b\[\d+m/g, '').replace(/[^\x00-\x7F]/g, ""));

let currentRule = null;
let rules = {}; // ruleId -> array of { app, file, line, originalPath }

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  
  if (line.includes('react-doctor/')) {
    currentRule = line.trim();
    if (!rules[currentRule]) {
      rules[currentRule] = [];
    }
  } else if (line.match(/^(RepairShopApp|admin-panel|supabase|src|packages)\/.*:\d+$/) || line.match(/^(RepairShopApp|admin-panel|supabase|src|packages)\/.*\.tsx?$/)) {
    if (currentRule) {
      let fileLine = line.trim();
      let parts = fileLine.split(':');
      let filePath = parts[0];
      let lineNum = parts[1] || '1';
      
      let app = 'unknown';
      let actualPath = filePath;
      
      if (filePath.startsWith('admin-panel/')) {
        app = 'admin-panel';
      } else if (filePath.startsWith('RepairShopApp/')) {
        app = 'RepairShopApp';
      } else if (filePath.startsWith('supabase/')) {
        app = 'supabase';
      } else if (filePath.startsWith('src/')) {
        // We have to guess based on the rule or existence.
        const isRNRule = currentRule.includes('rn-');
        
        let pathInAdmin = path.join(__dirname, 'admin-panel', filePath);
        let pathInApp = path.join(__dirname, 'RepairShopApp', filePath);
        
        let adminExists = fs.existsSync(pathInAdmin);
        let appExists = fs.existsSync(pathInApp);
        
        if (isRNRule) {
          app = 'RepairShopApp';
          actualPath = 'RepairShopApp/' + filePath;
        } else {
          // Priority logic based on existence. If it's a web rule and exists in admin-panel, use admin-panel.
          if (adminExists && !appExists) {
            app = 'admin-panel';
            actualPath = 'admin-panel/' + filePath;
          } else if (appExists && !adminExists) {
            app = 'RepairShopApp';
            actualPath = 'RepairShopApp/' + filePath;
          } else if (adminExists && appExists) {
             // exists in both. We guess admin-panel if it's not a React Native rule, but it could be both.
             // Actually React Doctor probably means it for whichever project. We'll default to admin-panel for non-RN rules and we'll check it manually if needed.
             // But wait, the report had `src/screens` which is clearly RepairShopApp.
             if (filePath.includes('screens/') || filePath.includes('navigation/')) {
               app = 'RepairShopApp';
               actualPath = 'RepairShopApp/' + filePath;
             } else {
               app = 'admin-panel';
               actualPath = 'admin-panel/' + filePath;
             }
          }
        }
      }
      
      // Prevent duplicates
      const entryId = `${actualPath}:${lineNum}`;
      if (!rules[currentRule].some(e => `${e.actualPath}:${e.lineNum}` === entryId)) {
        rules[currentRule].push({ app, actualPath, lineNum, originalPath: filePath });
      }
    }
  }
}

let md = `# Phase 0 — Corrected Occurrence List\n\n`;

for (const [ruleId, occurrences] of Object.entries(rules)) {
  if (occurrences.length === 0) continue;
  md += `### ${ruleId} (${occurrences.length})\n`;
  for (const occ of occurrences) {
    md += `- \`${occ.actualPath}:${occ.lineNum}\`\n`;
  }
  md += '\n';
}

fs.writeFileSync(path.join(__dirname, 'phase0_corrected_list.md'), md);
console.log("Done");
