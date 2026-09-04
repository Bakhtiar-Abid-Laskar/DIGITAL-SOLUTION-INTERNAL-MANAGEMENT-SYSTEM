const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const MOBILE_SCREENS = path.join(ROOT, 'RepairShopApp/src/screens');
const WEB_SCREENS = path.join(ROOT, 'admin-panel/src/app/(admin)');
const OUT_FILE = path.join(ROOT, 'APP_DOCUMENTATION.md');

function walk(dir, fileList = []) {
  if (!fs.existsSync(dir)) return fileList;
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.endsWith('.test.ts') || file.endsWith('.test.tsx')) continue;
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath, fileList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

function extractScreenDetails(filePath, isMobile) {
  const content = fs.readFileSync(filePath, 'utf8');
  const relativePath = path.relative(ROOT, filePath);
  
  // Extract route name from filename
  const fileName = path.basename(filePath, '.tsx');
  let routeName = fileName;
  if (!isMobile) {
      routeName = path.relative(WEB_SCREENS, filePath).replace(/\\/g, '/');
  }

  // Guess role based on path
  let roles = ['admin', 'receptionist', 'technician'];
  if (relativePath.includes('/admin/')) roles = ['admin'];
  if (relativePath.includes('/receptionist/')) roles = ['receptionist'];
  if (relativePath.includes('/technician/')) roles = ['technician'];
  
  // Extract elements
  const elements = [];
  const pressRegex = /(?:onPress|onClick)=\{(.*?)\}/g;
  let match;
  while ((match = pressRegex.exec(content)) !== null) {
      elements.push(`Action Handler: \`${match[1]}\``);
  }

  const queries = [];
  const queryRegex = /supabase\.from\(['"](.*?)['"]\)/g;
  while ((match = queryRegex.exec(content)) !== null) {
      if (!queries.includes(match[1])) queries.push(match[1]);
  }

  const stateVars = [];
  const stateRegex = /const \[([^,]+),.*?\] = useState/g;
  while ((match = stateRegex.exec(content)) !== null) {
      stateVars.push(match[1].trim());
  }
  const reducerRegex = /useReducer/g;
  if (reducerRegex.test(content)) stateVars.push("Custom Reducer State");

  return `
### Screen: ${routeName}
- **File path**: \`${relativePath}\`
- **Route / Navigation**: Navigated via \`${routeName}\`.
- **Allowed Roles**: ${roles.join(', ')}
- **Purpose**: UI Screen for ${routeName}. (Auto-extracted)
- **Local State**: ${stateVars.length > 0 ? stateVars.map(s => `\`${s}\``).join(', ') : 'None'}
- **Data / Supabase Tables Used**: ${queries.length > 0 ? queries.map(q => `\`${q}\``).join(', ') : 'None'}
- **UI Element Handlers Detected**:
  ${elements.length > 0 ? elements.map(e => '- ' + e).join('\n  ') : '- None detected'}
`;
}

function generatePhase2() {
  let md = '\n## Phase 2: Per-Screen Documentation\n\n';
  
  md += '### Mobile App Screens\n';
  const mobileScreens = walk(MOBILE_SCREENS);
  for (const s of mobileScreens) {
      md += extractScreenDetails(s, true);
  }

  md += '\n### Admin Web App Pages\n';
  const webScreens = walk(WEB_SCREENS);
  for (const s of webScreens) {
      if (s.endsWith('page.tsx')) {
         md += extractScreenDetails(s, false);
      }
  }
  return md;
}

function generatePhase4() {
    let md = '\n## Phase 4: Database & Backend\n\n';
    
    // Read live schema if exists
    const schemaPath = path.join(ROOT, 'supabase/live_schema.sql');
    if (fs.existsSync(schemaPath)) {
        md += '### Database Schema & RLS\n';
        md += 'Extracted from `live_schema.sql` (summarized due to length):\n';
        const content = fs.readFileSync(schemaPath, 'utf8');
        
        // Extract tables
        const tableRegex = /CREATE TABLE (public\.[^\s\(]+)/gi;
        let match;
        const tables = [];
        while ((match = tableRegex.exec(content)) !== null) {
            tables.push(match[1]);
        }
        md += `\n**Tables Detected**: ${tables.join(', ')}\n\n`;

        // Extract functions
        const funcRegex = /CREATE OR REPLACE FUNCTION (public\.[^\s\(]+)/gi;
        const funcs = [];
        while ((match = funcRegex.exec(content)) !== null) {
            funcs.push(match[1]);
        }
        md += `**Functions Detected**: ${funcs.join(', ')}\n\n`;
    }
    
    // Read edge functions
    md += '### Edge Functions\n';
    const funcDir = path.join(ROOT, 'supabase/functions');
    if (fs.existsSync(funcDir)) {
        const dirs = fs.readdirSync(funcDir).filter(f => fs.statSync(path.join(funcDir, f)).isDirectory() && f !== '_shared');
        for (const dir of dirs) {
            md += `- **\`${dir}\`**: Edge function handling ${dir.replace(/-/g, ' ')}.\n`;
        }
    }

    return md;
}

function appendToDoc() {
    let phase2 = generatePhase2();
    let phase4 = generatePhase4();
    fs.appendFileSync(OUT_FILE, phase2 + phase4, 'utf8');
    console.log("Appended Phase 2 and 4 to " + OUT_FILE);
}

appendToDoc();
