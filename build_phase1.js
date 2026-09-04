const fs = require('fs');
const mobile = fs.readFileSync('mobile_tree.txt', 'utf8');
const admin = fs.readFileSync('admin_tree.txt', 'utf8');
const supabase = fs.readFileSync('supabase_tree.txt', 'utf8');

const md = `# APP_DOCUMENTATION

## Table of Contents
- [Phase 1: Repository Inventory](#phase-1-repository-inventory)
- [Phase 2: Per-Screen Documentation (mobile) and Per-Page Documentation (web)](#phase-2-per-screen-documentation-mobile-and-per-page-documentation-web)
- [Phase 3: Every Function](#phase-3-every-function)
- [Phase 4: Database & Backend](#phase-4-database--backend)
- [Phase 5: Auth & Role Model](#phase-5-auth--role-model)
- [Phase 6: Push Notifications, Realtime, and Background Behavior](#phase-6-push-notifications-realtime-and-background-behavior)
- [Phase 7: Cross-Cutting Feature Index](#phase-7-cross-cutting-feature-index)
- [Gaps & Inconsistencies](#gaps--inconsistencies)

## Phase 1: Repository Inventory

### Mobile App (\`RepairShopApp/src\`)
\`\`\`
${mobile}
\`\`\`

### Admin Web App (\`admin-panel/src\`)
\`\`\`
${admin}
\`\`\`

### Supabase Backend (\`supabase\`)
\`\`\`
${supabase}
\`\`\`

### Navigation Structure & Routing Config
**Mobile App (Expo/React Navigation)**
- \`RootNavigator.tsx\`: Handles auth state. Unauthenticated goes to \`LoginScreen\`. Authenticated goes to \`AdminStack\`, \`ReceptionistStack\`, or \`TechnicianStack\` based on user role.
- \`AdminTabs.tsx\`, \`ReceptionistTabs.tsx\`, \`TechnicianTabs.tsx\`: Tab navigators for each role.
- \`AdminStack.tsx\`, \`ReceptionistStack.tsx\`, \`TechnicianStack.tsx\`: Stack navigators for drill-down screens.

**Admin Web App (Next.js App Router)**
- \`app/login/page.tsx\`: Login page.
- \`app/(admin)/layout.tsx\`: Admin layout, likely containing navigation (Sidebar/Topbar) and role checks.
- \`app/(admin)/*\`: Various admin pages (attendance, jobs, sales, salary, inventory, reports, etc.).
`;

fs.writeFileSync('APP_DOCUMENTATION.md', md, 'utf8');
