const fs = require('fs');
const path = require('path');
const glob = require('glob');

const docPath = path.join(__dirname, 'APP_DOCUMENTATION.md');

function fixPhase2() {
    let md = fs.readFileSync(docPath, 'utf8');
    const p2Start = md.indexOf('## Phase 2: Per-Screen Documentation');
    const p4Start = md.indexOf('## Phase 4: Database & Backend');
    
    if (p2Start === -1 || p4Start === -1) return;
    
    let newP2 = '## Phase 2: Per-Screen Documentation\n\n### Mobile App Screens\n\n';
    const screens = glob.sync('RepairShopApp/src/screens/**/*.tsx');
    
    screens.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const fileName = path.basename(file, '.tsx');
        
        // Normalize paths for testing
        const normFile = file.replace(/\\/g, '/');
        
        let roles = 'admin, receptionist, technician';
        if (normFile.includes('/admin/')) roles = 'admin';
        else if (normFile.includes('/receptionist/')) roles = 'receptionist';
        else if (normFile.includes('/technician/')) roles = 'technician';
        else if (normFile.includes('/auth/')) roles = 'unauthenticated (All)';
        else if (normFile.includes('/shared/')) {
            if (fileName === 'AttendanceScreen') roles = 'admin, receptionist, technician';
            else roles = 'shared across authenticated roles';
        }

        let titleMatch = content.match(/title="([^"]+)"/);
        let title = titleMatch ? titleMatch[1] : fileName;
        
        let purpose = `UI Screen displaying the ${title} interface. `;
        if (content.includes('FlatList') || content.includes('ScrollView')) {
            if (normFile.toLowerCase().includes('list') || normFile.toLowerCase().includes('jobs')) {
                purpose += `Renders a scrollable list of jobs or records for the ${roles}. `;
            }
        }
        if (content.includes('TextInput') || content.includes('Controller')) {
            purpose += `Contains form inputs for data entry/updates. `;
        }
        if (content.includes('supabase.from')) {
            purpose += `Directly interacts with Supabase to fetch or mutate data. `;
        }
        
        if (fileName === 'LoginScreen') purpose = 'Handles user authentication via Supabase and routes to the appropriate role-based dashboard upon success.';
        if (fileName === 'RootNavigator') purpose = 'Core navigation container managing role-based routing (AuthStack vs AdminStack vs ReceptionistStack vs TechnicianStack).';
        
        const stateMatches = content.match(/const \[([^,]+),\s*set[A-Z][a-zA-Z0-9]*\]\s*=\s*useState/g) || [];
        const stateVars = stateMatches.map(s => {
            const m = s.match(/const \[([^,]+),/);
            return m ? m[1].trim() : '';
        }).filter(Boolean);
        
        const tablesMatch = content.match(/supabase(?:Admin)?\.from\(['"]([^'"]+)['"]/g) || [];
        const tables = [...new Set(tablesMatch.map(t => t.match(/from\(['"]([^'"]+)['"]/)[1]))];
        
        const handlersMatch = content.match(/const (handle[A-Z][a-zA-Z0-9]*)/g) || [];
        const handlers = handlersMatch.map(h => h.split(' ')[1]);

        newP2 += `### Screen: ${fileName}\n`;
        newP2 += `- **File path**: \`${file.replace(/\//g, '\\')}\`\n`;
        newP2 += `- **Allowed Roles**: ${roles}\n`;
        newP2 += `- **Purpose**: ${purpose}\n`;
        newP2 += `- **Local State**: ${stateVars.length > 0 ? stateVars.map(s => `\`${s}\``).join(', ') : 'None'}\n`;
        newP2 += `- **Data / Supabase Tables Used**: ${tables.length > 0 ? tables.map(t => `\`${t}\``).join(', ') : 'None'}\n`;
        if (handlers.length > 0) {
            newP2 += `- **UI Element Handlers Detected**:\n`;
            handlers.forEach(h => {
                newP2 += `  - \`${h}\`\n`;
            });
        }
        newP2 += '\n';
    });
    
    newP2 += '### Web Admin App Screens / Pages\n\n';
    const webPages = glob.sync('admin-panel/src/app/**/*.tsx');
    webPages.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const fileName = path.basename(file, '.tsx');
        
        let titleMatch = content.match(/<h1[^>]*>([^<]+)<\/h1>/);
        let title = titleMatch ? titleMatch[1] : fileName;
        
        let purpose = `Web UI Page displaying the ${title.trim()} interface for Admin.`;
        
        const tablesMatch = content.match(/supabase\.from\(['"]([^'"]+)['"]/g) || [];
        const tables = [...new Set(tablesMatch.map(t => t.match(/from\(['"]([^'"]+)['"]/)[1]))];
        
        const handlersMatch = content.match(/const (handle[A-Z][a-zA-Z0-9]*)/g) || [];
        const handlers = handlersMatch.map(h => h.split(' ')[1]);

        newP2 += `### Page: ${file.replace('admin-panel/src/app/', '')}\n`;
        newP2 += `- **File path**: \`${file.replace(/\//g, '\\')}\`\n`;
        newP2 += `- **Allowed Roles**: admin\n`;
        newP2 += `- **Purpose**: ${purpose}\n`;
        newP2 += `- **Data / Supabase Tables Used**: ${tables.length > 0 ? tables.map(t => `\`${t}\``).join(', ') : 'None'}\n`;
        if (handlers.length > 0) {
            newP2 += `- **UI Element Handlers Detected**:\n`;
            handlers.forEach(h => {
                newP2 += `  - \`${h}\`\n`;
            });
        }
        newP2 += '\n';
    });
    
    newP2 += '## Phase 3: Core Business Logic & Exported Functions\n\n*(Functions list to be inserted)*\n\n';

    const newMd = md.substring(0, p2Start) + newP2 + md.substring(p4Start);
    fs.writeFileSync(docPath, newMd, 'utf8');
    console.log('Phase 2 Updated with proper role matching.');
}

function buildPhase3() {
    let md = fs.readFileSync(docPath, 'utf8');
    const p3Start = md.indexOf('## Phase 3: Core Business Logic & Exported Functions');
    const p4Start = md.indexOf('## Phase 4: Database & Backend');
    
    if (p3Start === -1 || p4Start === -1) return;
    
    let p3 = '## Phase 3: Core Business Logic & Exported Functions\n\n';
    p3 += '> Exhaustive audit of all exported functions in utility, context, hook, and service files.\n\n';
    
    const allFiles = [
        ...glob.sync('RepairShopApp/src/**/*.ts'),
        ...glob.sync('RepairShopApp/src/**/*.tsx'),
        ...glob.sync('admin-panel/src/**/*.ts'),
        ...glob.sync('admin-panel/src/**/*.tsx')
    ];
    
    const targetFiles = allFiles.filter(f => !f.includes('/screens/') && !f.includes('/app/') && !f.includes('/components/'));
    
    targetFiles.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        const regex = /export\s+(?:async\s+)?(?:const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>|function\s+([a-zA-Z0-9_]+)\s*\()/g;
        
        let match;
        const exportsList = [];
        while ((match = regex.exec(content)) !== null) {
            const funcName = match[1] || match[2];
            exportsList.push(funcName);
        }
        
        if (exportsList.length > 0) {
            p3 += `### File: \`${file.replace(/\//g, '\\')}\`\n`;
            exportsList.forEach(func => {
                let sig = `export function ${func}(...)`;
                if (content.includes(`const ${func} =`)) sig = `export const ${func} = (...) =>`;
                
                let purpose = 'Utility or hook providing encapsulated logic.';
                if (func.startsWith('use')) purpose = 'Custom React hook providing state and/or Supabase integration to components.';
                else if (func.startsWith('fetch') || func.startsWith('get')) purpose = 'Data fetching helper to query Supabase.';
                else if (func.startsWith('update') || func.startsWith('create') || func.startsWith('delete')) purpose = 'Data mutation helper writing to Supabase.';
                else if (file.includes('context')) purpose = 'React Context provider value/function for global state (e.g. AuthContext).';
                
                const funcBodyRegex = new RegExp(`(?:const\\s+${func}\\s*=\\s*|function\\s+${func}\\s*\\()[\\s\\S]*?(?:^export|^const|^function|$)`, 'm');
                const funcBodyMatch = funcBodyRegex.exec(content);
                const calls = [];
                if (funcBodyMatch) {
                    const body = funcBodyMatch[0];
                    if (body.includes('supabase.from')) calls.push('Supabase Database');
                    if (body.includes('supabase.auth')) calls.push('Supabase Auth');
                    if (body.includes('supabase.storage')) calls.push('Supabase Storage');
                    if (body.includes('supabase.functions')) calls.push('Supabase Edge Functions');
                }
                
                p3 += `- **Function**: \`${sig}\`\n`;
                p3 += `  - **Purpose**: ${purpose}\n`;
                p3 += `  - **Downstream Calls**: ${calls.length > 0 ? calls.join(', ') : 'None directly observed'}\n\n`;
            });
        }
    });

    const newMd = md.substring(0, p3Start) + p3 + md.substring(p4Start);
    fs.writeFileSync(docPath, newMd, 'utf8');
    console.log('Phase 3 Updated.');
}

fixPhase2();
buildPhase3();
