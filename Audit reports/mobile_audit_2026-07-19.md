# 🔍 RepairShop Mobile App — Current-State UI/UX Audit
Date: 2026-07-19
Auditor: Antigravity AI
Report Type: UI/UX Audit
Stack: Expo React Native, Supabase
Total Screens Audited: 13

## How to Read This Report
This report provides a forensic audit of the RepairShop mobile application, examining layout, token usage, real-time data integrations, and shared component compliance against established design decisions.

## Global Design System Reference
- **Canvas Colors**: `background: '#FFFFFF'`, `backgroundAlt: '#F9FAFB'`
- **Text Colors**: `textPrimary: '#111827'`, `textSecondary: '#6B7280'`, `textMuted: '#9CA3AF'`, `textInverse: '#FFFFFF'`
- **Accents**: `primary: '#5B4FE9'`, `accentBlue: '#3B5BFF'`, `accentGreen: '#2E9E52'`, `accentRed: '#E5484D'`, `accentOrange: '#F5A524'`
- **Status Backgrounds**: `statusReceivedBg`, `statusInProgressBg`, `statusCompletedBg`, `statusWaitingBg`, `statusAssignedBg`, `statusUrgentBg`, `statusHighBg`, `statusNormalBg`
- **Spacing**: `xs: 4`, `sm: 8`, `md: 12`, `lg: 16`, `xl: 20`, `xxl: 24`, `xxxl: 32`
- **Radius**: `sm: 8`, `md: 14`, `lg: 18`, `pill: 999`
- **Typography**: Shared definitions for `h1`, `h2`, `h3`, `body`, `bodyBold`, `caption`, `label`, `stat`
- **Animations**: `SPRING` (damping: 16, stiffness: 160) from `react-native-reanimated`.
- **Icons**: `lucide-react-native` only.
- **Actuals found**: `tokens.ts` is robust. However, `invoiceHtml.ts` bypasses tokens with hardcoded hex colors (`#666`, `#333`, `#f9f9f9`, `#dcfce7`, `#166534`, `#fee2e2`, `#991b1b`, etc.).

## Duplicate & Orphaned File Findings
- **Job Detail Screens**: `JobDetailScreen.tsx` (Receptionist) and `TechJobDetailScreen.tsx` (Technician) render highly similar content with different file entry points.
- **Job List Screens**: `JobListScreen.tsx` (Receptionist) and `MyJobsScreen.tsx` (Technician) share heavy structural similarity but are maintained independently.
- **Dashboards**: `DashboardScreen.tsx` (Receptionist) and `OverviewScreen.tsx` (Admin) both wrap the shared `RoleDashboard` component but exist as separate entry points.

## GLOBAL SHELL
- **Bottom Navigation**: Custom navigation tabs configured via `ReceptionistTabs`, `TechnicianTabs`, and `AdminTabs` utilizing a dark floating pill-shaped design (`CustomTabBar` / `AdminTabBar`). 
- **Header Pattern**: Headers are often built using the common `AppHeader` component.
- **Modals/Toasts**: `Alert.alert()` is heavily overused across the entire application for success/error feedback (e.g., login, attendance check-in, job updates, image capture). A designed modal/toast system is missing and needs implementation.

## PAGE 1: LoginScreen
Route: `Auth` / File: `screens/auth/LoginScreen.tsx`

### Layout Overview
Standard login form.
### Component-by-Component Breakdown
- Uses `react-native-reanimated` for form entrance animations.
- Safe-area handled using `useSafeAreaInsets`.
- Icons sourced correctly from `lucide-react-native`.
### State Variations
- Error states handled via standard state updates, but `Alert.alert` is missing designed UI.
### Data & Realtime Behavior
- Does not use real-time data.
### UX Observations
- Compliant with no dark mode branches.

## PAGE 2: AttendanceScreen
Route: `Attendance` / File: `screens/shared/AttendanceScreen.tsx`

### Layout Overview
Handles check-in/out and selfie/GPS capture.
### Component-by-Component Breakdown
- Uses `RNSafeAreaView` and `useSafeAreaInsets`.
- Leverages `SelfieCapture` component.
### State Variations
- Relies on `Alert.alert` extensively for success/error messages.
### Data & Realtime Behavior
- No real-time subscription for attendance logs, fetched on mount.
- **CRITICAL**: Missing `expo-image-manipulator` usage. Selfie images are uploaded raw without client-side compression.
### UX Observations
- Missing in-context toast/snackbar for action results.

## PAGE 3: DashboardScreen
Route: `Dashboard` / File: `screens/receptionist/DashboardScreen.tsx`

### Layout Overview
Receptionist dashboard leveraging `RoleDashboard`.
### Component-by-Component Breakdown
- Uses `useSafeAreaInsets`.
- Includes hardcoded quick action colors inline (e.g., `#E0ECFF`, `#3B5BFF`, `#FEE2E2`) bypassing the token variables slightly for configuration.
### State Variations
- `Alert.alert` used for "Coming soon" and Logout.
### Data & Realtime Behavior
- Incorporates real-time subscription (`postgres_changes`) for `jobs` table updates.
### UX Observations
- Well-integrated realtime behaviour.

## PAGE 4: JobListScreen
Route: `JobList` / File: `screens/receptionist/JobListScreen.tsx`

### Layout Overview
List view of all jobs.
### Component-by-Component Breakdown
- Uses `useSafeAreaInsets`.
- Leverages `JobCard` which correctly uses Reanimated.
### State Variations
- Relies on standard refresh controls.
### Data & Realtime Behavior
- Includes real-time subscription (`postgres_changes`) for the `jobs` table.
### UX Observations
- Consistent with design constraints. Duplicate logic with `MyJobsScreen`.

## PAGE 5: JobDetailScreen
Route: `JobDetail` / File: `screens/receptionist/JobDetailScreen.tsx`

### Layout Overview
Detail view for receptionist tasks.
### Component-by-Component Breakdown
- Uses `useSafeAreaInsets`.
### State Variations
- Error/success feedback mapped entirely to `Alert.alert`.
### Data & Realtime Behavior
- Fetches once on mount. Missing real-time subscription for live job status changes.
### UX Observations
- Missing real-time updates could lead to stale data if a technician updates the job concurrently.

## PAGE 6: NewJobScreen
Route: `NewJob` / File: `screens/receptionist/NewJobScreen.tsx`

### Layout Overview
Job creation form.
### Component-by-Component Breakdown
- Employs Reanimated springs for modal cards.
- Relies on `useSafeAreaInsets`.
### State Variations
- Error state: `Alert.alert('Error Creating Job', error.message)`
### Data & Realtime Behavior
- Standard database inserts.
### UX Observations
- Fully token-compliant.

## PAGE 7: BillingScreen
Route: `Billing` / File: `screens/receptionist/BillingScreen.tsx`

### Layout Overview
Billing processing for receptionist.
### Component-by-Component Breakdown
- Uses `useSafeAreaInsets`.
### State Variations
- Extensive `Alert.alert` usage for save, print, WhatsApp, and email failures.
### Data & Realtime Behavior
- No real-time updates.
### UX Observations
- Missing designed error/success boundaries.

## PAGE 8: MyJobsScreen
Route: `MyJobsList` / File: `screens/technician/MyJobsScreen.tsx`

### Layout Overview
Technician's assigned jobs list.
### Component-by-Component Breakdown
- Follows safe area guidelines.
### State Variations
- Logout triggers `Alert.alert`.
### Data & Realtime Behavior
- Queries are successfully scoped: `.eq('technician_id', user.id)`.
- **CRITICAL**: Missing Real-time subscription. The technician will not see new assigned jobs without a manual pull-to-refresh.
### UX Observations
- Realtime gap degrades user experience for dispatch workflows.

## PAGE 9: TechJobDetailScreen
Route: `TechJobDetail` / File: `screens/technician/TechJobDetailScreen.tsx`

### Layout Overview
Technician specific view for job updates and materials.
### Component-by-Component Breakdown
- Employs Reanimated (`FadeInUp`) and `useSafeAreaInsets`.
### State Variations
- `Alert.alert` used for all CRUD operation failures.
### Data & Realtime Behavior
- Scoped to technician successfully.
- **CRITICAL**: Lacks `postgres_changes` subscription. Concurrent material changes or re-assignments won't reflect live.
- **CRITICAL**: If photos are added to materials, `expo-image-manipulator` is missing, resulting in raw image uploads.
### UX Observations
- Heavy reliance on alert boxes for state feedback.

## PAGE 10: OverviewScreen
Route: `Overview` / File: `screens/admin/OverviewScreen.tsx`

### Layout Overview
Admin overview using `RoleDashboard`.
### Component-by-Component Breakdown
- Uses `RoleDashboard`. 
### State Variations
- `Alert.alert` for sign out.
### Data & Realtime Behavior
- Fetches static count on mount.
### UX Observations
- Lacks realtime admin metrics.

## PAGE 11: InventoryScreen
Route: `Inventory` / File: `screens/admin/InventoryScreen.tsx`

### Layout Overview
Inventory management.
### Component-by-Component Breakdown
- Employs `useSafeAreaInsets`.
### State Variations
- `Alert.alert` for validation, save, and delete confirmations.
### Data & Realtime Behavior
- **Includes** real-time subscription (`postgres_changes`) for `inventory` table.
### UX Observations
- Compliant and real-time aware.

## COMMON COMPONENTS REFERENCE
- **Button.tsx / SkeletonCard.tsx / BottomSheet.tsx / ModalShell.tsx / JobCard.tsx / MetricCard.tsx / StatusBadge.tsx / PriorityBadge.tsx**: Highly consistent utilization of `react-native-reanimated` (`withSpring`, `FadeInUp`, `FadeInDown`). 
- **SelfieCapture / OnsiteVisitCard / AddMaterialModal**: Uses `Alert.alert` heavily. Missing `expo-image-manipulator` integration.
- **AppHeader.tsx**: Centralized header management effectively standardizing the top bar layout.

## MASTER ISSUE SUMMARY TABLE

| ID  | Severity | Screen/Component           | Issue                                                                                                   |
| --- | -------- | -------------------------- | ------------------------------------------------------------------------------------------------------- |
| M-1 | Critical | MyJobsScreen               | Missing real-time subscription (`postgres_changes`) for technician job lists.                           |
| M-2 | Critical | TechJobDetailScreen        | Missing real-time subscription for live job/material changes.                                           |
| M-3 | Critical | JobDetailScreen            | Missing real-time subscription for live job tracking (Receptionist side).                               |
| M-4 | High     | SelfieCapture / Materials  | `expo-image-manipulator` absent; raw images uploaded to Supabase Storage, inflating costs and latency.  |
| M-5 | High     | Global (All Screens)       | Overuse of native `Alert.alert()` for all success, error, and confirmation dialogues.                   |
| M-6 | Medium   | JobDetail / TechJobDetail  | High structural duplication between Receptionist and Technician detail screens.                         |
| M-7 | Medium   | JobList / MyJobs           | Structural duplication of list UI.                                                                      |
| M-8 | Low      | utils/invoiceHtml.ts       | Hardcoded hex values used in HTML generation string instead of pulling from standard `tokens.ts`.       |

*End of Audit*
