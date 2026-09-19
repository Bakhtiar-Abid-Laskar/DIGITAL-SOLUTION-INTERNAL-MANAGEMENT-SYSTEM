# Module 02: Staff Attendance & Geofencing Management

**Module:** Staff Attendance Intake, Selfie Verification, GPS Geofencing, Daily Monitoring, Review Workflow & Historical Reporting  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Attendance** module enforces proof-of-presence for workshop staff (Technicians, Receptionists, and Admins). It binds hardware-level camera capture, real-time device geolocation, geofence radius boundary checking, on-device image compression, automated Google Drive backup, late check-in push alerting, and administrative review approvals.

```text
[Staff Mobile Device]
       │
       ▼
[Hardware Permissions] ──Camera Permission Check──► [Expo Camera (Front Facing)]
       │                ──GPS Permission Check─────► [Expo Location (High Accuracy)]
       ▼
[Selfie Capture] ───────► On-Device WebP Compression (Width 1280px, Quality 78%)
       │
       ▼
[Geofence Evaluation] ──Distance Calculation──────► Compared with [public.geofence_settings]
       │                │                               (center_lat, center_lng, radius_meters)
       │                ├── In Bounds (distance <= radius) ──► at_location = true, review_status = 'approved'
       │                └── Out of Bounds / Weak GPS ────────► at_location = false, review_status = 'pending'
       ▼
[Drive Upload] ─────────► Supabase Edge Function: [upload-attendance-selfie]
                                │ (Authenticates User JWT)
                                ▼ (Google Service Account)
                        Uploads to Google Drive: STAFF_ATTENDCE_IMG/YYYY/MM/
                        Returns: driveFileId & webViewLink
       │
       ▼
[Database Upsert] ──────► [public.attendance]
                                │ (Primary Key: user_id + date [IST])
                                ├── Webhook on INSERT ──► Edge Function: [notify-on-late-checkin]
                                │                         (Check-in > 10:30 AM + 30m -> Push Admin)
                                └── Realtime Broadcast ──► Web Admin Attendance Table & Mobile Monitors
       │
       ▼
[Admin Oversight] ──────► Web Admin: [AttendancePage] (/attendance)
                                ├── Review Approval/Rejection (review_status: 'approved' | 'rejected')
                                ├── Google Drive Image Previews & Zoom
                                ├── Staff Attendance Drawer (Monthly breakdown & calendar)
                                └── CSV & Monthly Excel Generation [export-attendance-reports]
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/app/(admin)/attendance/page.tsx`
- **Purpose:** Primary administrative dashboard for monitoring daily staff attendance, verifying check-in/out selfies, inspecting GPS geofence compliance, approving/rejecting weak-GPS or out-of-bounds submissions, and exporting attendance audit logs.
- **Key Exports:**
  - `default function AttendancePage()`: Main page component rendering the attendance monitoring dashboard.
- **Inputs & Outputs:**
  - Props: None (Next.js App Router Page).
  - Output: Full-screen table of attendance logs with search bar, review status dropdown (`All`, `Pending`, `Approved`, `Rejected`), attendance status filter (`All`, `Present`, `Halfday`, `Leave`, `Absent`), pagination, thumbnail preview popups, and export buttons.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`PageHeader`, `SearchFilterBar`, `Card`, `Select`, `Badge`, `Button`, `DataTableSkeleton`, `EmptyState`, `Pagination`), `@/components/attendance/StaffAttendanceDrawer`, `@/utils/csv` (`exportAttendanceToCSV`), `@/utils/formatDate`.
  - External: `@repairshop/shared` (`Attendance`, `getSignedUrlCached`, `useDebounceValue`), `lucide-react`, `next/image`, `next/dynamic`.
  - Database: Queries `attendance` (joined with `users!attendance_user_id_fkey` on `name, role, id`), updates `attendance.review_status`.
- **Side Effects:**
  - Executes mutations on `attendance.review_status` (`'approved' | 'rejected' | 'pending'`).
  - Downloads client-side CSV files (`repairshop_attendance_page.csv` and `repairshop_attendance_all_YYYY-MM-DD.csv`).
  - Dynamically renders image preview modals linking directly to Google Drive thumbnail endpoints (`https://drive.google.com/thumbnail?id=...&sz=w400`).
- **Callers:**
  - Next.js App Router route: `/attendance`.
  - Linked from sidebar navigation (`Sidebar.tsx`) and admin dashboard attendance widgets.
- **Observations / Debt:**
  - When filtering by staff name (`debouncedSearchQuery`), it executes a preliminary query against `users.name` via `ilike`, then performs an `in('user_id', ids)` filter. If more than 50 staff members match, the SQL query string length scales linearly.
  - Review actions (`handleReviewAction`) update `attendance.review_status` directly, but as revealed by the forensic audit, this review status is decoupled from the automated salary deduction engine (`calculate-monthly-salary`), meaning a rejected check-in still counts toward working days unless manually deleted or updated to `Absent`.

---

### `admin-panel/src/components/attendance/StaffAttendanceDrawer.tsx`
- **Purpose:** Slide-over drawer detailing a single staff member's historical monthly attendance, providing monthly aggregate counters (`Present`, `Halfday`, `Leave`, `Absent`), date navigation, and high-resolution selfie inspections.
- **Key Exports:**
  - `export function StaffAttendanceDrawer({ staff, onClose }: StaffAttendanceDrawerProps)`: Slide-over drawer component.
- **Inputs & Outputs:**
  - Props:
    - `staff: { id: string; name: string; role: string } | null`: Selected staff member.
    - `onClose: () => void`: Callback when drawer is dismissed.
  - Output: Slide-over modal containing month selector, summary counters, and reverse-chronological list of daily attendance rows with check-in/out timestamps, coordinates, and photo links.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/common/*` (`Button`, `Badge`, `EmptyState`), `@/utils/csv` (`exportAttendanceToCSV`).
  - External: `lucide-react`, `next/image`.
  - Database: Queries `attendance` filtered by `user_id = staff.id` and date range bounded between the 1st and last day of `currentMonth`.
- **Side Effects:**
  - Exports monthly CSV for the individual staff member.
  - Binds escape key event listener on `window`.
- **Callers:**
  - Invoked from `admin-panel/src/app/(admin)/attendance/page.tsx` when an administrator clicks a staff member's name.
- **Observations / Debt:**
  - Uses `new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)` for boundary calculations without explicit IST timezone locking, which can cause date skew between 11:30 PM and 12:00 AM UTC.

---

### `admin-panel/src/components/settings/GeofenceMap.tsx`
- **Purpose:** Map-based administrative configuration tool for defining the workshop's geographic coordinates (`center_lat`, `center_lng`) and allowed radial check-in boundary (`radius_meters`).
- **Key Exports:**
  - `default function GeofenceMap({ initialSetting, onSave, radius = 100 }: GeofenceMapProps)`: Interactive Leaflet map.
- **Inputs & Outputs:**
  - Props:
    - `initialSetting: GeofenceSettings | null`: Existing database record.
    - `onSave: (lat: number, lng: number) => Promise<void>`: Save handler.
    - `radius?: number`: Geofence boundary radius in meters (defaults to 100m).
  - Output: Interactive Leaflet map view with draggable/clickable pin, circle overlay representing the radius, OpenStreetMap Nominatim search input, and GPS coordinate fields.
- **Dependencies:**
  - External: `react-leaflet` (`MapContainer`, `TileLayer`, `Marker`, `Circle`, `useMap`), `leaflet`, `lucide-react`, `@repairshop/shared` (`GeofenceSettings`).
- **Side Effects:**
  - Performs external HTTP requests to OpenStreetMap Nominatim API (`https://nominatim.openstreetmap.org/search`) for address geocoding.
  - Uses browser `navigator.geolocation.getCurrentPosition` for "Locate Me" functionality.
- **Callers:**
  - Embedded inside `admin-panel/src/app/(admin)/settings/page.tsx`.
- **Observations / Debt:**
  - Handles legacy column aliases gracefully (`initialSetting.center_lat ?? initialSetting.lat`), mitigating historical schema discrepancies between `center_lat` and `lat`.

---

### `admin-panel/src/components/salary/HolidayCalendarForm.tsx`
- **Purpose:** Official holiday management console allowing administrators to configure company holidays, ensuring that public holidays are not penalized as unexcused absences during monthly payroll and attendance audits.
- **Key Exports:**
  - `default function HolidayCalendarForm()`: Form and list component for holiday administration.
- **Inputs & Outputs:**
  - Props: None.
  - Output: Form card to register new holiday (Date, Name, Recurring flag) and a table of configured holidays with deletion triggers.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/styles/salary.module.css`.
  - External: `@repairshop/shared` (`Holiday`), `lucide-react`.
  - Database: Queries and mutates `public.holidays` (`date`, `name`, `is_recurring`).
- **Side Effects:**
  - Upserts into `holidays` table with `onConflict: 'date'`.
- **Callers:**
  - Embedded inside `admin-panel/src/app/(admin)/salary/page.tsx`.
- **Observations / Debt:**
  - Uses `confirm()` native browser popup instead of standard `ConfirmationModal`.
  - Table targeted is `public.holidays`. Historical migrations also contain references to `public.company_holidays`, creating dual-table legacy ambiguity.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`
- **Purpose:** Central staff-facing attendance portal shared across Technicians, Receptionists, and Admins. Handles daily check-in and check-out, live camera selfie capture, GPS distance verification against geofence coordinates, approved leave conflict detection, and reverse-chronological 30-day attendance history.
- **Key Exports:**
  - `default function AttendanceScreen()`: Primary mobile screen for attendance workflows.
  - `SelfieCard`: Sub-component rendering check-in/out preview card, time badges, and zoom triggers.
  - `AttendanceHistoryRow`: Sub-component rendering historical daily attendance items.
- **Inputs & Outputs:**
  - Props: None (React Navigation screen).
  - Output: Scrollable screen with top IST date ribbon, today status card, check-in/out action buttons triggering camera modals, and past 15-30 days attendance history.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/context/ToastContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `AppPressable`, `Button`, `SectionLabel`, `LoadingState`, `BottomSheet`), `@/components/shared/SelfieCapture`, `@/hooks/useRealtimeSubscription`, `@/utils/distance` (`getDistanceInMeters`), `@/utils/errorMessages`.
  - External: `@repairshop/shared` (`getAttendanceDateIST`, `getDateIST`, `formatTime`, `formatDate`, `GeofenceSettings`, `getImageThumbnailUrl`, `getFullImageUrl`), `expo-image`, `lucide-react-native`, `react-native-safe-area-context`.
  - Database: Queries `attendance`, `geofence_settings`. Calls RPC `check_leave_conflict`. Performs `upsert` and `update` on `attendance`.
- **Side Effects:**
  - Realtime subscription: Subscribes to table `attendance` filtered by `user_id = eq.${user.id}`.
  - Hardware: Prompts for device Camera and Location permissions.
- **Callers:**
  - Shared tab navigator: Accessible by Technicians, Receptionists, and Admins via the bottom tab bar.
- **Observations / Debt:**
  - Single-Screen Reusability: Strictly adheres to `GEMINI.md` rule: "Build one reusable attendance screen for receptionist and technician... Do not fork separate role-specific attendance screens."
  - Leave Conflict Safeguard: Blocks check-in if `check_leave_conflict` RPC detects an approved leave on today's IST date, preventing accidental invalidation of approved leaves.

---

### `RepairShopApp/src/components/shared/SelfieCapture.tsx`
- **Purpose:** Hardware capture modal encapsulating front-facing camera viewfinder, high-accuracy GPS acquisition, on-device WebP compression, geofence distance verification, and multipart upload to Supabase Edge Functions.
- **Key Exports:**
  - `default function SelfieCapture(props: SelfieCaptureProps)`: Modal viewfinder and upload coordinator.
  - `interface SelfieCaptureProps`: Contract specifying endpoint, payload, location validation handler, and completion callback.
- **Inputs & Outputs:**
  - Props:
    - `label: string`: Capture title (e.g., "Check-in Selfie").
    - `uploadEndpoint: string`: Supabase Edge function name (`upload-attendance-selfie`).
    - `uploadPayload: Record<string, string>`: Metadata including `staffName`, `timestamp`, `type`.
    - `onCaptureComplete`: Callback returning `{ uri, driveFileId, driveLink, gpsLat, gpsLng, lowAccuracy, atLocation }`.
    - `validateLocation`: Async callback verifying coordinates against geofence.
  - Output: Full-screen modal housing `CameraView` with face guide oval, capture trigger, and progress spinner overlays.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/hooks/useCameraPermission`, `@/hooks/useLocationPermission`, `@/utils/compressImage`, `@/context/ToastContext`, `@/tokens`.
  - External: `expo-camera` (`CameraView`), `expo-location`, `expo-image-manipulator`, `lucide-react-native`.
- **Side Effects:**
  - Native camera capture: Captures raw picture buffer from device sensor.
  - Image manipulation: Scales image to max width of 1280px, converts to `.webp`, and compresses with quality 0.78.
  - Geolocation query: Calls `Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })`. Falls back to `Balanced` accuracy with `lowAccuracy: true` if GPS signal times out.
  - HTTP POST: Sends multipart `FormData` containing compressed image bytes and metadata to `/functions/v1/upload-attendance-selfie`.
- **Callers:**
  - `AttendanceScreen.tsx` (for check-in and check-out selfies).
  - `OnsiteVisitScreen.tsx` (for technician onsite arrival and departure verification).
- **Observations / Debt:**
  - Robust Failover: If GPS acquisition fails under strict mode, it falls back to balanced accuracy and flags `lowAccuracy = true`, ensuring staff in shielded indoor environments are not completely locked out of recording attendance.

---

### `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx`
- **Purpose:** Mobile administrative overview screen displaying today's real-time attendance across the entire workforce, segmented by status tabs (`All`, `Present`, `Late`, `Absent`).
- **Key Exports:**
  - `default function StaffAttendanceOverviewScreen()`: Screen component.
- **Inputs & Outputs:**
  - Props: None (Admin stack navigation).
  - Output: Segmented staff list with avatar/selfie thumbnails, role badges, check-in timestamps, GPS location coordinates, and quick phone call triggers.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/tokens`, `@/components/common/*` (`AppHeader`, `AppPressable`, `EmptyState`, `SkeletonCard`).
  - External: `@repairshop/shared` (`getAttendanceDateIST`, `formatTime`, `formatDate`, `getImageThumbnailUrl`, `getFullImageUrl`), `expo-image`, `lucide-react-native`.
  - Database: Queries `users` (`role != 'admin'`, `is_active = true`) and joins with today's records in `attendance`.
- **Side Effects:**
  - Initiates phone calls via `Linking.openURL('tel:...')`.
- **Callers:**
  - Admin Mobile Stack: Linked from Admin Overview / Dashboard.
- **Observations / Debt:**
  - Realtime Hook Missing: Relies on manual pull-to-refresh (`RefreshControl`) rather than `useRealtimeSubscription`, requiring manual refreshes to see new check-ins as staff arrive.

---

### `RepairShopApp/src/types/attendance.ts`
- **Purpose:** Client-side TypeScript definitions for attendance data models, status enumerations, and geofence specifications.
- **Key Exports:**
  - `export type AttendanceStatus = 'Present' | 'Halfday' | 'Leave' | 'Absent'`: Status union.
  - `export interface AttendanceRecord`: Comprehensive attendance database row representation including drive file IDs, timestamps, GPS coordinates, and review states.
- **Callers:**
  - Imported across `AttendanceScreen.tsx`, `StaffAttendanceOverviewScreen.tsx`, and mobile profile components.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### `packages/shared/src/date.ts`
- **Purpose:** Centralized time zone normalization engine enforcing Indian Standard Time (`Asia/Kolkata`, UTC+5:30) across all platforms.
- **Key Exports:**
  - `export function getAttendanceDateIST(): string`: Returns current IST date as `YYYY-MM-DD`. Prevents staff checking in between 12:00 AM UTC and 05:30 AM UTC from having their attendance recorded on the previous calendar day.
  - `export function getDateIST(date?: Date): string`: Formats arbitrary date into IST date string.
  - `export function formatTime(isoString: string | null | undefined): string`: Formats ISO timestamp to `hh:mm A` format in IST.
  - `export function formatDate(dateString: string): string`: Formats date to `DD MMM YYYY`.
- **Observations / Debt:**
  - Critical correctness anchor: All database queries querying `attendance.date` rely on `getAttendanceDateIST()`. Client device system clocks set to non-IST time zones do not alter the recorded attendance date.

---

### `packages/shared/src/imageUtils.ts`
- **Purpose:** URL resolver for Google Drive image thumbnails and high-resolution previews.
- **Key Exports:**
  - `export function getImageThumbnailUrl(fileIdOrUrl: string, size = 400): string`: Resolves drive file ID or URL to a fast Google Drive thumbnail (`https://drive.google.com/thumbnail?id=${fileId}&sz=w${size}`).
  - `export function getFullImageUrl(fileIdOrUrl: string): string`: Resolves full-sized image view URL (`https://lh3.googleusercontent.com/d/${fileId}`).
  - `export function extractDriveFileId(urlOrId: string): string | null`: Regex parser matching `/d/{id}`, `id={id}`, or bare file IDs.
- **Callers:**
  - Used in Web `AttendancePage.tsx`, `StaffAttendanceDrawer.tsx`, Mobile `AttendanceScreen.tsx`, and `StaffAttendanceOverviewScreen.tsx`.

---

### `packages/shared/src/storageUrlCache.ts`
- **Purpose:** In-memory LRU cache with TTL expiration for Supabase Storage signed URLs, preventing duplicate signed URL network roundtrips during table re-renders.
- **Key Exports:**
  - `export function getSignedUrlCached(bucket, path, client)`: Cached URL fetcher.
  - `export function clearSignedUrlCache()`: Cache eviction helper.

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.attendance` | `id` (uuid, PK), `user_id` (uuid, FK users), `date` (date, UNIQUE with user_id), `status` (text: 'Present'/'Halfday'/'Leave'/'Absent'), `check_in_time` (timestamptz), `check_out_time` (timestamptz), `gps_lat` (numeric), `gps_lng` (numeric), `check_out_gps_lat` (numeric), `check_out_gps_lng` (numeric), `check_in_drive_file_id` (text), `check_out_drive_file_id` (text), `at_location` (boolean), `low_accuracy` (boolean), `review_status` (text: 'pending'/'approved'/'rejected'), `ot_hours` (numeric). | `AttendanceScreen.tsx`, `AttendancePage.tsx`, `StaffAttendanceDrawer.tsx`, `calculate-monthly-salary`, `notify-on-late-checkin`. | SELECT, INSERT, UPDATE, DELETE |
| `public.geofence_settings` | `id` (uuid, PK), `center_lat` (numeric), `center_lng` (numeric), `radius_meters` (numeric), `created_at` (timestamptz), `updated_at` (timestamptz). | `GeofenceMap.tsx`, `AttendanceScreen.tsx`. | SELECT (All authenticated), UPDATE (Admin only) |
| `public.holidays` | `id` (uuid, PK), `date` (date, UNIQUE), `name` (text), `is_recurring` (boolean), `created_at` (timestamptz). | `HolidayCalendarForm.tsx`, `calculate-monthly-salary`. | SELECT (All authenticated), INSERT, UPDATE, DELETE (Admin only) |
| `public.employee_leave` | `id` (uuid, PK), `user_id` (uuid, FK), `leave_date` (date), `reason` (text), `status` (text: 'pending'/'approved'/'rejected'), `approved_by` (uuid, FK). | `LeaveManagement.tsx`, `AttendanceScreen.tsx`, `calculate-monthly-salary`. | SELECT, INSERT, UPDATE |

---

### Stored Database Functions (RPCs)

1. `public.check_leave_conflict(p_user_id uuid, p_date date)`
   - **Language:** PL/pgSQL, `SECURITY DEFINER`.
   - **Returns:** `boolean`.
   - **Logic:** Queries `employee_leave` where `user_id = p_user_id`, `leave_date = p_date`, and `status = 'approved'`. If a row exists, returns `true`.
   - **Callers:** Mobile `AttendanceScreen.tsx:263`.

---

### Supabase Edge Functions

1. `supabase/functions/upload-attendance-selfie/index.ts`
   - **Trigger:** Direct authenticated HTTP POST from Mobile `SelfieCapture.tsx`.
   - **Purpose:** Securely authenticates caller JWT, receives multipart `.webp` selfie data, acquires Google Drive OAuth2 access token via service account credentials (`GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`), ensures directory folder structure exists (`STAFF_ATTENDCE_IMG/YYYY/MM/`), and uploads file.
   - **Authentication:** Verifies `Authorization: Bearer <JWT>` against Supabase Auth.
   - **Side Effects:** Stores image in Google Drive; returns `{ success: true, fileId, link }`.

2. `supabase/functions/notify-on-late-checkin/index.ts`
   - **Trigger:** Database webhook on `INSERT` to table `attendance`.
   - **Purpose:** Computes check-in minute of the day in IST (`(UTC minutes + 330) % 1440`). Compares against target start time of 10:30 AM IST (`630 mins`). If arrival exceeds 30 minutes of grace time (i.e. past 11:00 AM IST), queries all active admins and dispatches Expo Push Notifications (`Late Check-in Alert: [Name] checked in X minutes late today`).
   - **Authentication:** Webhook signature verification (`APP_WEBHOOK_SECRET`) or service role key.
   - **Side Effects:** Dispatches push notifications via Expo Push API; logs to `public.notifications`.

3. `supabase/functions/export-attendance-reports/index.ts`
   - **Trigger:** Administrative manual trigger or automated `pg_cron` schedule on the 1st of every month.
   - **Purpose:** Generates one comprehensive Excel `.xlsx` workbook per active staff member detailing daily check-in times, check-out times, hours worked, OT hours, and absence classifications. Uploads workbooks to Google Drive under `Attendance Report/<year>/<month>/`.
   - **Authentication:** Admin role required (`users.role = 'admin'`).

---

## 6. Module Findings & Technical Debt Log (Attendance)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-ATT-01** | `supabase/functions/calculate-monthly-salary/index.ts:213-220` vs `admin-panel/src/app/(admin)/attendance/page.tsx:141-154` | **HIGH** | Business Logic Decoupling | Web Admin allows admins to approve or reject attendance (`review_status = 'rejected'`) for off-site or suspicious check-ins. However, the payroll engine `calculate-monthly-salary` selects all rows with `status = 'Present'` without filtering by `review_status = 'approved'`. Rejected check-ins still count as full working days. |
| **F-ATT-02** | `admin-panel/src/components/settings/GeofenceMap.tsx:75-76` vs `RepairShopApp/src/screens/shared/AttendanceScreen.tsx:244-245` | **MEDIUM** | Schema Drift / Column Aliasing | Inconsistent column names for geofence coordinates: Database migration and TypeScript models oscillate between `center_lat` / `center_lng` and `lat` / `lng`. Components are forced to employ defensive coalescing (`data.center_lat ?? data.lat`). |
| **F-ATT-03** | `RepairShopApp/src/screens/admin/StaffAttendanceOverviewScreen.tsx` | **LOW** | Missing Realtime Sync | While the staff-facing `AttendanceScreen` uses `useRealtimeSubscription('attendance')`, the admin mobile overview screen lacks real-time subscription bindings and requires manual pull-to-refresh to observe staff arrivals. |
| **F-ATT-04** | `supabase/functions/notify-on-late-checkin/index.ts:40-42` | **MEDIUM** | Event Trigger Gap | Late check-in webhook only listens for `INSERT` events on `attendance`. If an employee's attendance is initialized as `Absent` by a morning cron, and later updated to `Present` upon late arrival via `UPDATE`, the late alert trigger never fires. |
| **F-ATT-05** | `admin-panel/src/components/salary/HolidayCalendarForm.tsx:25` vs `20260819000000_baseline_schema.sql` | **MEDIUM** | Table Redundancy | Baseline schema defines `public.company_holidays`, whereas `HolidayCalendarForm` and payroll functions interact with `public.holidays`. The unused `company_holidays` table remains as dead database artifact. |
| **F-ATT-06** | `admin-panel/src/app/(admin)/attendance/page.tsx:88-100` | **LOW** | Query Scalability | Staff search performs a two-step query (`users` name match followed by `attendance.in('user_id', ids)`). For large user lists, this generates oversized SQL query parameters instead of a direct foreign key join filter. |
| **F-ATT-07** | `RepairShopApp/src/components/shared/SelfieCapture.tsx:80` | **LOW** | Hardcoded Folder Path | Google Drive root folder path is hardcoded as `STAFF_ATTENDCE_IMG` (containing a typo in "ATTENDCE"). Moving or renaming this folder in Google Drive breaks future uploads without code change. |
