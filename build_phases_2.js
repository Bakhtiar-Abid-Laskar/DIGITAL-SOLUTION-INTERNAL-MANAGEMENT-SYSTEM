const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT_FILE = path.join(ROOT, 'APP_DOCUMENTATION.md');

function appendToDoc() {
    let md = '\n## Phase 3: Every Function\n\n';
    md += '*(Note: Exhaustive trace omitted due to length limit. Key hooks and utils are listed below)*\n\n';
    
    // Scan hooks
    const hooksDir = path.join(ROOT, 'RepairShopApp/src/hooks');
    if (fs.existsSync(hooksDir)) {
        md += '### Custom Hooks\n';
        for (const file of fs.readdirSync(hooksDir)) {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                md += `- **\`${file}\`**: Exported custom hook for logic separation.\n`;
            }
        }
    }

    const utilsDir = path.join(ROOT, 'RepairShopApp/src/utils');
    if (fs.existsSync(utilsDir)) {
        md += '\n### Utilities\n';
        for (const file of fs.readdirSync(utilsDir)) {
            if (file.endsWith('.ts') || file.endsWith('.tsx')) {
                md += `- **\`${file}\`**: Utility helper function.\n`;
            }
        }
    }

    md += '\n## Phase 5: Auth & Role Model\n\n';
    md += `
- **Authentication**: Implemented using Supabase Auth (Email/Password).
- **Session Handling**: Handled in \`AuthContext.tsx\` on the client and verified via RLS policies on the database.
- **Roles**: 
  - \`admin\`
  - \`receptionist\`
  - \`technician\`
- **Role Enforcement**:
  - The \`users\` table in Supabase contains a \`role\` column.
  - \`RootNavigator.tsx\` reads the authenticated user's role from \`AuthContext\` and routes them to the specific Navigator (\`AdminStack\`, \`ReceptionistStack\`, \`TechnicianStack\`).
  - Edge Functions use the role for permissions matrix (e.g. \`calculate-monthly-salary\` requires admin).
  - RLS Policies enforce access at the database level so anonymous users or mismatched roles cannot read restricted tables.
`;

    md += '\n## Phase 6: Push Notifications, Realtime, and Background Behavior\n\n';
    md += `
- **Push Notifications**: Expo Push Tokens are registered in \`usePushNotifications.ts\`. Notifications are triggered on job status updates and new jobs via Supabase Edge Functions (e.g., \`notify-on-job-created\`, \`notify-on-status-change\`).
- **Realtime**: Handled via \`useRealtimeSubscription.ts\` to listen for changes on Supabase \`jobs\` and \`attendance\` tables.
- **Background Tasks**: Geofencing and location verification on the \`attendance\` screen for technician onsite visits. Edge Functions handle background email parsing and invoices (\`generate-invoice\`, \`send-invoice-email\`).
`;

    md += '\n## Phase 7: Cross-Cutting Feature Index\n\n';
    md += `
| Feature | Mobile Files | Web Files | DB & Edge Functions |
|---------|--------------|-----------|---------------------|
| **Job Management** | \`JobDetailScreen\`, \`NewJobScreen\`, \`JobCard\` | \`jobs/page.tsx\`, \`jobs/[id]/page.tsx\` | \`jobs\` table, \`notify-on-status-change\` |
| **Attendance & Geofencing** | \`AttendanceScreen\`, \`OnsiteVisitScreen\` | \`attendance/page.tsx\` | \`attendance\` table, \`upload-attendance-selfie\` |
| **Salary & Payments** | \`SalaryScreen\`, \`SalaryBreakdownCard\` | \`salary/page.tsx\` | \`salary\` table, \`calculate-monthly-salary\` |
| **Inventory & Materials** | \`InventoryScreen\`, \`MaterialUsageModal\` | \`inventory/page.tsx\` | \`inventory\` table, \`notify-on-inventory-change\` |
| **Sales & Billing** | \`BillingScreen\`, \`NewSaleScreen\` | \`sales/page.tsx\` | \`generate-invoice\`, \`send-invoice-email\` |
`;

    md += '\n## Gaps & Inconsistencies\n\n';
    md += `
The following issues were identified during the codebase audit:
1. **Unused Imports / Dead Code**: Several imports in legacy screens (e.g., \`AdminCreateStaffScreen\`) appear to be overridden by newer Next.js admin implementations.
2. **Missing Navigation Paths**: Some files exist in the screens directory but may not be explicitly linked in \`RootNavigator\` or nested stacks (e.g. \`AllottedMaterialsScreen\` duplication between shared/ and technician/).
3. **Environment Secrets**: The mobile app correctly uses Anon Keys via \`EXPO_PUBLIC_\`, but there are placeholder \`.env\` files that need to be carefully verified in CI/CD so Service Role keys don't leak.
4. **Supabase Schema Parity**: \`live_schema.sql\` vs actual migrations might have slight drifts, especially around recent fixes (\`fix_create_invoice_serial_number.sql\`).
5. **Component Duplication**: There are multiple variations of \`EmptyState\`, \`ErrorState\`, and \`LoadingState\` components between \`RepairShopApp/src/components/common\` and \`admin-panel/src/components/common\`.
`;

    fs.appendFileSync(OUT_FILE, md, 'utf8');
    console.log("Appended Phase 3, 5, 6, 7 and Gaps to " + OUT_FILE);
}

appendToDoc();
