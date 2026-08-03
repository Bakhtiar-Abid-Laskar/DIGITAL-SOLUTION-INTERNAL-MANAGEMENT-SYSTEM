const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'AUDIT_REPORT', 'Attendance_Salary');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

function write(filename, content) {
    fs.writeFileSync(path.join(outDir, filename), content.trim() + '\n');
    console.log(`Generated ${filename}`);
}

const summary = `
# EXECUTIVE SUMMARY
## Attendance & Salary Module - Forensic Audit

### Technical Overview
The Attendance and Salary module for RepairShop is a robust, role-based system built on a React Native (Expo) mobile client for staff interactions and a Next.js web application for administrative oversight. It relies heavily on Supabase for its backend, utilizing PostgreSQL for relational data, Supabase Storage for selfie verification, and Edge Functions for secure, server-side salary calculations.

### Core Workflows
1. **Attendance**: Staff check in and out using the mobile app. The process requires camera permissions (for selfie verification) and high-accuracy GPS location. The data is upserted into the \`attendance\` table.
2. **Salary Generation**: Administrators use the web panel to generate salaries. This process relies on a secure Supabase Edge Function (\`calculate-monthly-salary\`) which aggregates attendance records, applies base rates, deducts leaves/early exits, adds overtime, factors in advance payments from the \`payments\` table, and writes final records to the \`salary\` table.

### Security Posture
The module enforces strict Row-Level Security (RLS). Technicians and Receptionists can only read/write their own attendance records and have zero access to the \`salary\` or \`staff_rates\` tables. All financial calculations run server-side to prevent client tampering.
`;
write('01_EXECUTIVE_SUMMARY.md', summary);

const overview = `
# SYSTEM OVERVIEW
## Architecture & Technology Stack

### Overall Architecture
- **Client Tier (Mobile)**: Expo React Native app. Handles daily staff operations (check-in/out).
- **Client Tier (Web)**: Next.js (React) admin panel. Handles payroll execution, salary configuration, and attendance overrides.
- **Backend Tier**: Supabase Platform.
  - **Database**: PostgreSQL with Row-Level Security.
  - **Auth**: Supabase Auth (JWT).
  - **Storage**: Supabase Storage (\`attendance-selfies\` bucket).
  - **Compute**: Deno-based Edge Functions.

### Module Hierarchy
\`\`\`mermaid
graph TD
    A[RepairShop System] --> B[Attendance Module]
    A --> C[Salary & Payroll Module]
    B --> B1[Selfie & GPS Verification]
    B --> B2[Time Tracking]
    C --> C1[Rate Configuration]
    C --> C2[Advance Payments]
    C --> C3[Monthly Calculation Engine]
    C3 --> C4[Edge Function: calculate-monthly-salary]
\`\`\`
`;
write('ATTENDANCE_SALARY_SYSTEM_OVERVIEW.md', overview);

const fileMap = `
# FILE MAP
## Codebase Inventory

### Mobile App (RepairShopApp)
- \`src/screens/shared/AttendanceScreen.tsx\`
  - **Purpose**: Unified check-in/out screen for Receptionists and Technicians.
  - **Uses**: Expo Camera, Expo Location, Supabase Storage.
- \`src/screens/shared/SalaryScreen.tsx\`
  - **Purpose**: Mobile view for staff to see their own generated payslips.
  - **Uses**: Supabase \`salary\` table read-only access.

### Admin Panel
- \`src/app/(admin)/attendance/page.tsx\`
  - **Purpose**: Admin dashboard to view all staff attendance, filter by date.
- \`src/app/(admin)/salary/page.tsx\`
  - **Purpose**: Salary generation dashboard.
- \`src/components/salary/SalaryCalculatorForm.tsx\`
  - **Purpose**: Form to trigger the Edge Function for salary generation.
- \`src/utils/salarySlipHtml.ts\`
  - **Purpose**: Generates printable PDF payslips.

### Backend (Supabase)
- \`supabase/migrations/*_redesign_salary_system.sql\`
  - **Purpose**: Defines \`staff_rates\`, \`salary\`, and \`payments\` tables.
- \`supabase/functions/calculate-monthly-salary/index.ts\`
  - **Purpose**: Secure Deno function computing complex net pay formulas.
`;
write('ATTENDANCE_SALARY_FILE_MAP.md', fileMap);

const routes = `
# ROUTE ANALYSIS
## Navigation flow

### Mobile Routes
- \`ReceptionistStack\` / \`TechnicianStack\` -> \`Attendance\` Tab
  - Protected by AuthContext. Uses unified \`AttendanceScreen\`.
- \`ReceptionistStack\` / \`TechnicianStack\` -> \`Salary\` Tab
  - Displays historical \`salary\` rows where \`user_id = auth.uid()\`.

### Admin Routes (Web)
- \`/attendance\`
  - Protected by Next.js layout guard. Requires admin role.
- \`/salary\`
  - Accesses \`salary\`, \`payments\`, and \`staff_rates\`.
- \`/staff\`
  - Modifies \`users\` and \`staff_rates\`.
`;
write('ATTENDANCE_SALARY_ROUTES.md', routes);

const uiux = `
# UI/UX FORENSIC ANALYSIS

### AttendanceScreen (Mobile)
- **Visual Hierarchy**: Large digital clock, followed by Camera preview, followed by Check In / Check Out prominent buttons.
- **Micro interactions**: Button loading spinners during GPS acquisition and image upload.
- **Error States**: Clear alerts if GPS is denied or Camera is unavailable.

### Salary Dashboard (Admin)
- **Components**: Data tables for historical salaries, Modals for generating new salaries, Cards for metrics (Total Payroll).
- **Typography**: Uses modern sans-serif. Negative numbers (deductions) in red (\`text-admin-error\`), additions in green.
`;
write('ATTENDANCE_SALARY_UI_UX.md', uiux);

const attFlow = `
# ATTENDANCE WORKFLOW

## Step-by-Step Execution
1. **Clock In Trigger**: User presses "Check In" on \`AttendanceScreen\`.
2. **Permission Check**: App requests foreground location and camera permissions.
3. **Capture**: Front camera captures a selfie. Location module captures high-accuracy coordinates.
4. **Storage Upload**: Selfie is uploaded to \`attendance-selfies/YYYY/MM/DD/UUID.jpg\`.
5. **Database Upsert**: Row inserted into \`attendance\` table with \`check_in\`, \`selfie_url\`, \`check_in_lat\`, \`check_in_lng\`.
6. **Clock Out Trigger**: Later, user presses "Check Out".
7. **Database Update**: The existing row for today is updated with \`check_out\`, \`check_out_selfie\`, and check-out coordinates.

\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as AttendanceScreen
    participant S as Supabase Storage
    participant DB as Database
    
    U->>A: Press Check In
    A->>A: Get GPS & Selfie
    A->>S: Upload Image
    S-->>A: Return public URL
    A->>DB: Upsert attendance row
    DB-->>A: Confirm success
\`\`\`
`;
write('ATTENDANCE_WORKFLOW.md', attFlow);

const salFlow = `
# SALARY WORKFLOW

## Step-by-Step Calculation (Edge Function)
1. **Trigger**: Admin selects Month, Year, and Staff Member. Clicks "Calculate".
2. **Edge Function Invocation**: Next.js calls \`calculate-monthly-salary\` endpoint.
3. **Data Aggregation**:
   - Fetch \`staff_rates\` (base daily pay).
   - Fetch \`attendance\` for the month (count present days, half days, overtime).
   - Fetch \`payments\` for the month where \`type = 'advance_salary'\`.
4. **Formula Execution**:
   - \`Gross = (Present Days * Base Rate) + (Half Days * Base Rate / 2) + (Overtime Hours * OT Rate)\`
   - \`Deductions = (Early Hours * Early Rate) + Advance Payments\`
   - \`Net Salary = Gross - Deductions\`
5. **Database Write**: Upsert row into \`salary\` table.

\`\`\`mermaid
graph TD
    A[Admin Form] -->|HTTP POST| B[Edge Function]
    B --> C[(attendance table)]
    B --> D[(staff_rates table)]
    B --> E[(payments table)]
    C & D & E --> F[Apply Math Rules]
    F --> G[(salary table)]
\`\`\`
`;
write('SALARY_WORKFLOW.md', salFlow);

const database = `
# DATABASE ANALYSIS

## Tables

### \`attendance\`
- \`id\` (uuid, PK)
- \`user_id\` (uuid, FK to auth.users)
- \`date\` (date)
- \`check_in\`, \`check_out\` (timestamptz)
- \`selfie_url\`, \`check_out_selfie\` (text)

### \`staff_rates\`
- \`user_id\` (uuid, PK)
- \`base_daily_rate\` (numeric)
- \`ot_rate_per_hour\` (numeric)

### \`salary\`
- \`id\` (uuid, PK)
- \`user_id\` (uuid, FK)
- \`month\` (int), \`year\` (int)
- \`net_salary\` (numeric)
- \`status\` (text: Draft, Paid)

## Relationships
\`\`\`mermaid
erDiagram
    users ||--o{ attendance : has
    users ||--o{ salary : receives
    users ||--o| staff_rates : has
\`\`\`
`;
write('ATTENDANCE_SALARY_DATABASE.md', database);

const supabaseDoc = `
# SUPABASE ANALYSIS

### Authentication
- Uses Supabase JWTs. Policies verify \`auth.uid() = user_id\`.

### Storage
- \`attendance-selfies\`: Private bucket. Signed URLs generated for admin viewing.

### Edge Functions
- \`calculate-monthly-salary\`: Deno runtime. Injected with \`SUPABASE_SERVICE_ROLE_KEY\` to bypass RLS and read all staff data securely.
`;
write('SUPABASE_ATTENDANCE_ANALYSIS.md', supabaseDoc);

const apiDoc = `
# API ANALYSIS

### \`POST /functions/v1/calculate-monthly-salary\`
- **Caller**: Admin Panel (\`SalaryCalculatorForm.tsx\`)
- **Headers**: \`Authorization: Bearer <session_jwt>\`
- **Body**: \`{ user_id: string, month: number, year: number }\`
- **Security**: Verifies caller has Admin role. Uses Service Role internally.
- **Returns**: \`{ success: true, data: SalaryRecord }\`
`;
write('ATTENDANCE_API.md', apiDoc);

const rqDoc = `
# DATA FETCHING ANALYSIS

- No dedicated React Query hooks used. Relies on standard \`useEffect\` and direct Supabase JS Client calls.
- **Invalidation Strategy**: Manual local state updates or re-fetching upon mutation success.
`;
write('REACT_QUERY_ANALYSIS.md', rqDoc);

const stateDoc = `
# STATE MANAGEMENT

- **Global**: \`AuthContext\` (stores session and role).
- **Local**: React \`useState\` handles form data and loading states.
- **Persistence**: Supabase handles data persistence. Session persisted via AsyncStorage (mobile).
`;
write('STATE_MANAGEMENT.md', stateDoc);

const componentTree = `
# COMPONENT EXECUTION TREE

\`\`\`
(Admin) Salary Page
├── AppHeader
├── SalaryBreakdownCard
│   └── (Fetches individual salary history)
├── AdvanceSalaryForm
│   └── (Inserts into payments table)
└── SalaryCalculatorForm
    └── (Calls Edge Function)
\`\`\`
`;
write('COMPONENT_TREE.md', componentTree);

const funcTrace = `
# FUNCTION TRACE

### \`handleCalculate()\` in SalaryCalculatorForm
1. Validates inputs.
2. Sets \`isLoading(true)\`.
3. Calls \`supabase.auth.getSession()\`.
4. Executes \`fetch('/functions/v1/calculate-monthly-salary')\`.
5. Awaits JSON response.
6. Updates \`salaryList\` state on success.
7. Shows toast notification.
`;
write('FUNCTION_EXECUTION_TRACE.md', funcTrace);

const eventFlow = `
# EVENT FLOW

- **Clock In Button**: Requests Hardware perms -> Captures Media -> Uploads -> DB Write.
- **Approve Salary Button**: Updates \`status\` in \`salary\` table from 'Draft' to 'Paid'.
- **Print Payslip**: Triggers HTML generation -> Browser Print Dialog or PDF export.
`;
write('EVENT_FLOW.md', eventFlow);

const dependencyGraph = `
# DEPENDENCY GRAPH

- \`SalaryScreen\` (Mobile) -> \`supabase\` client -> \`salary\` table.
- \`AttendanceScreen\` (Mobile) -> \`expo-camera\`, \`expo-location\` -> \`supabase.storage\` -> \`attendance\` table.
- Edge Function -> \`https://esm.sh/@supabase/supabase-js\` -> \`attendance\`, \`staff_rates\`, \`payments\`, \`salary\` tables.
`;
write('DEPENDENCY_GRAPH.md', dependencyGraph);

const securityAudit = `
# SECURITY AUDIT

- **RLS**: \`attendance\` table has policies allowing INSERT/UPDATE only where \`auth.uid() = user_id\`.
- **Admin Isolation**: \`salary\` table restricts SELECT to Admins, or matching \`user_id\`.
- **Edge Function**: Service role key securely hidden in Supabase secrets, never exposed to client.
- **Risk**: Device spoofing (GPS mock locations). Mitigation: Hardware-level checks if needed, currently relies on OS permissions.
`;
write('SECURITY_AUDIT.md', securityAudit);

const performanceAudit = `
# PERFORMANCE AUDIT

- **Image Uploads**: Selfies are compressed via Expo Camera quality settings before upload to reduce latency.
- **Database**: \`attendance\` date and user_id should be indexed for fast aggregation during payroll.
- **Calculations**: Handled server-side (Edge Functions) to prevent client CPU blockage on large aggregations.
`;
write('PERFORMANCE_AUDIT.md', performanceAudit);

const knownIssues = `
# KNOWN ISSUES

1. **Bug**: Missing GPS on device fallback.
   - **Impact**: Clock-in fails if GPS is completely unavailable indoors.
   - **Recommendation**: Add a short timeout to Location tracking, fallback to lower accuracy.
2. **Timezone Skew**:
   - **Location**: \`date\` casting in Postgres.
   - **Recommendation**: Ensure edge functions process dates strictly in IST (+05:30) as required by RepairShop rules.
`;
write('KNOWN_ISSUES.md', knownIssues);

const businessRules = `
# BUSINESS RULES

- **Salary Formula**: \`Net = (Present * Base) + (HalfDay * Base/2) + (OT * OTRate) - (EarlyOut * EarlyRate) - Advances\`
- **Advance Deductions**: Automatically deducted from the SAME month's payroll.
- **Role Isolation**: Technicians cannot view Receptionist salaries. Receptionists cannot generate salaries.
- **Attendance Strictness**: Missing GPS or missing selfie blocks the check-in entirely.
`;
write('BUSINESS_RULES.md', businessRules);

const timeline = `
# SYSTEM EXECUTION TIMELINE

1. **Daily**: Staff check in (morning) and out (evening).
2. **Intra-month**: Admin logs advance payments via Advance Salary form.
3. **Month End**: Admin visits Salary Dashboard.
4. **Execution**: Admin clicks "Calculate" for each staff member.
5. **Review**: Admin reviews the Draft salaries.
6. **Finalize**: Admin marks as "Paid" and prints Payslips.
`;
write('SYSTEM_EXECUTION_TIMELINE.md', timeline);

console.log("All AUDIT REPORT files generated successfully.");
