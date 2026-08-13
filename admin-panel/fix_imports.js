const fs = require('fs');
const files = [
  'admin-panel/src/app/(admin)/inventory/page.tsx',
  'admin-panel/src/app/(admin)/jobs/[id]/page.tsx',
  'admin-panel/src/app/(admin)/jobs/page.tsx',
  'admin-panel/src/app/(admin)/reports/page.tsx',
  'admin-panel/src/app/(admin)/sales/page.tsx',
  'admin-panel/src/app/(admin)/staff/page.tsx',
  'admin-panel/src/components/layout/Topbar.tsx'
];
for(const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  if(!content.includes('useCallback')) {
    if(content.match(/import\s+{([^}]*)}\s+from\s+['"]react['"]/)) {
       content = content.replace(/(import\s+{)([^}]*)(\}\s+from\s+['"]react['"])/, (m, p1, p2, p3) => {
         return p1 + p2 + ', useCallback' + p3;
       });
    } else {
       content = 'import { useCallback } from "react";\n' + content;
    }
    fs.writeFileSync(file, content);
    console.log('Fixed imports in ' + file);
  }
}
