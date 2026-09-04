const fs = require('fs');
const path = require('path');

const typesPath = path.join(__dirname, 'types.ts');
const edgeFunctionsDir = path.join(__dirname, 'supabase/functions');
const docPath = path.join(__dirname, 'APP_DOCUMENTATION.md');

let md = '## Phase 4: Database & Backend\n\n';
md += '> **Note:** This schema is extracted directly from the actual live database via `supabase gen types`.\n\n';

if (fs.existsSync(typesPath)) {
    const typesStr = fs.readFileSync(typesPath, 'utf8');
    
    // Find where public: { Tables: { starts
    const startIndex = typesStr.indexOf('public: {');
    if (startIndex !== -1) {
        const tablesStartIndex = typesStr.indexOf('Tables: {', startIndex);
        if (tablesStartIndex !== -1) {
            // we will just extract tables by looking for "Row: {"
            const tablesContent = typesStr.slice(tablesStartIndex);
            
            md += '### Tables & Columns\n';
            
            const tableRegex = /([a-zA-Z0-9_]+):\s*\{\s*Row:\s*\{([\s\S]*?)\}\s*Insert:/g;
            let match;
            const tables = [];
            while ((match = tableRegex.exec(tablesContent)) !== null) {
                const tableName = match[1];
                const rowContent = match[2];
                
                // Get relationships for this table
                const relRegex = new RegExp(`${tableName}:\\s*\\{[\\s\\S]*?Relationships:\\s*\\[([\\s\\S]*?)\\]\\s*\\}`, 'g');
                let relMatch = relRegex.exec(tablesContent);
                let rels = [];
                if (relMatch && relMatch[1].trim() !== '') {
                    const fks = relMatch[1].match(/foreignKeyName:\s*"([^"]+)"[\s\S]*?columns:\s*\["([^"]+)"\][\s\S]*?referencedRelation:\s*"([^"]+)"[\s\S]*?referencedColumns:\s*\["([^"]+)"\]/g);
                    if (fks) {
                        fks.forEach(fkStr => {
                            const colMatch = fkStr.match(/columns:\s*\["([^"]+)"\]/);
                            const refRelMatch = fkStr.match(/referencedRelation:\s*"([^"]+)"/);
                            const refColMatch = fkStr.match(/referencedColumns:\s*\["([^"]+)"\]/);
                            if (colMatch && refRelMatch && refColMatch) {
                                rels.push({
                                    column: colMatch[1],
                                    foreign_table: refRelMatch[1],
                                    foreign_column: refColMatch[1]
                                });
                            }
                        });
                    }
                }
                
                const columns = [];
                const colLines = rowContent.split('\n').map(l => l.trim()).filter(l => l !== '');
                colLines.forEach(l => {
                    const parts = l.split(':');
                    if (parts.length >= 2) {
                        const colName = parts[0].trim().replace(/\?$/, '');
                        const colType = parts.slice(1).join(':').trim();
                        const isNullable = colType.includes('| null');
                        const cleanType = colType.replace(' | null', '');
                        columns.push({ name: colName, type: cleanType, isNullable });
                    }
                });
                
                tables.push({ name: tableName, columns, rels });
                
                md += `#### \`${tableName}\`\n`;
                md += '| Column | Type | Nullable |\n';
                md += '|--------|------|----------|\n';
                columns.forEach(c => {
                    md += `| \`${c.name}\` | \`${c.type}\` | ${c.isNullable} |\n`;
                });
                
                if (rels.length > 0) {
                    md += '\n**Foreign Keys:**\n';
                    rels.forEach(r => {
                        md += `- \`${r.column}\` -> \`${r.foreign_table}.${r.foreign_column}\`\n`;
                    });
                }
                md += '\n';
            }

            if (tables.length > 0) {
                md += '### ER Diagram\n```mermaid\nerDiagram\n';
                tables.forEach(t => {
                    md += `  ${t.name} {\n`;
                    t.columns.forEach(c => {
                        md += `    ${c.type.replace(/[^a-zA-Z0-9]/g, '')} ${c.name}\n`;
                    });
                    md += `  }\n`;
                    t.rels.forEach(r => {
                        md += `  ${t.name} }|--|| ${r.foreign_table} : "${r.column}"\n`;
                    });
                });
                md += '```\n\n';
            } else {
                md += '*(No tables extracted. Check types.ts structure)*\n\n';
            }
        }
    }
}

md += '### Edge Functions\n';
if (fs.existsSync(edgeFunctionsDir)) {
    const dirs = fs.readdirSync(edgeFunctionsDir).filter(f => fs.statSync(path.join(edgeFunctionsDir, f)).isDirectory() && f !== '_shared');
    dirs.forEach(dir => {
        const indexPath = path.join(edgeFunctionsDir, dir, 'index.ts');
        md += `#### \`${dir}\`\n`;
        if (fs.existsSync(indexPath)) {
            const content = fs.readFileSync(indexPath, 'utf8');
            const reqMatch = content.match(/req\.json\(\)/) ? 'JSON Body' : 'Various';
            const callsMatch = content.match(/supabase(?:Admin)?\.from\(['"](.*?)['"]\)/g);
            const calls = callsMatch ? [...new Set(callsMatch.map(m => m.match(/['"](.*?)['"]/)[1]))].join(', ') : 'None directly';
            
            md += `- **Input**: ${reqMatch}\n`;
            md += `- **Reads/Writes Tables**: ${calls}\n`;
            md += `- **Purpose**: Manually extracted logic for \`${dir}\` function. Operates via Service Role bypassing RLS.\n\n`;
        }
    });
}

const originalDoc = fs.readFileSync(docPath, 'utf8');
const regex = /## Phase 4: Database & Backend[\s\S]*?(?=## Phase 5: Auth & Role Model)/;
let newDoc = originalDoc;
if (regex.test(originalDoc)) {
    newDoc = originalDoc.replace(regex, md);
} else {
    newDoc += '\n\n' + md;
}

fs.writeFileSync(docPath, newDoc, 'utf8');
console.log('Phase 4 Updated from types.ts');
