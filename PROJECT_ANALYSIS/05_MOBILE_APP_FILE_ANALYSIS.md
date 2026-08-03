# RepairShop — Mobile App File Analysis

## Configuration Files

---

### `RepairShopApp/package.json`
- **Category:** Package Configuration
- **Purpose:** Defines the Expo React Native app's dependencies, scripts, and Expo SDK config.
- **Scripts:**
  - `start` → `expo start` — starts Expo dev server
  - `android` → `expo start --android` — starts on Android
  - `ios` → `expo start --ios` — starts on iOS
  - `build:preview` → `eas build --platform android --profile preview`
  - `build:production` → `eas build --platform all --profile production`
- **Key Runtime Dependencies:**
  - `expo ~54.0.14` — Expo SDK (pinned minor)
  - `react-native 0.81.5` — React Native (pinned exact)
  - `react 19.0.0` — React
  - `@supabase/supabase-js ^2.45.4` — Supabase client
  - `@react-navigation/native ^7.1.9` — Navigation core
  - `@react-navigation/bottom-tabs ^7.3.12` — Bottom tab navigator
  - `@react-navigation/stack ^7.2.11` — Stack navigator
  - `expo-camera ^17.0.5` — Camera module
  - `expo-location ^18.0.6` — GPS location
  - `expo-print ^14.0.0` — Print to PDF
  - `expo-sharing ^13.0.0` — Share files/content
  - `expo-notifications ^0.30.6` — Push notifications
  - `expo-secure-store ^14.0.1` — Secure keychain storage
  - `expo-image-manipulator ^13.0.1` — Image resize/compress
  - `expo-file-system ^18.0.11` — File system access
  - `react-native-reanimated ^4.6.0` — Hardware-accelerated animations
  - `react-native-gesture-handler ^2.24.0` — Touch gestures
  - `react-native-safe-area-context ^5.3.0` — Safe area insets
  - `react-native-screens ^4.5.0` — Native screen optimization
  - `lucide-react-native ^0.515.0` — Icon library
  - `expo-device ^7.1.2` — Device info (for push notifications)
  - `expo-constants ^17.0.8` — Expo constants (EAS project ID)

---

### `RepairShopApp/app.json`
- **Category:** Expo Configuration
- **Size:** 2,099 bytes | **Lines:** 74
- **Purpose:** Expo app manifest — defines platform metadata, permissions, plugins, and EAS config.
- **Key Settings:**
  - `name: "RepairShop"`, `slug: "RepairShopApp"`, `scheme: "repairshop"`
  - `version: "1.0.0"`, `orientation: "portrait"`, `userInterfaceStyle: "light"`
  - `bundleIdentifier: "com.repairshop.app"` (iOS)
  - `package: "com.repairshop.app"` (Android)
  - `googleServicesFile: "./google-services.json"` (required for push notifications on Android)
- **iOS Permissions (infoPlist):**
  - Camera: `NSCameraUsageDescription`
  - Location: `NSLocationWhenInUseUsageDescription`
- **Android Permissions:**
  - `CAMERA`, `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `POST_NOTIFICATIONS`
- **Expo Plugins:** `expo-secure-store`, `expo-camera`, `expo-location`, `expo-notifications`
- **EAS projectId:** `9406caf9-490a-4041-b397-5cd0c9a62c8a`

---

### `RepairShopApp/eas.json`
- **Category:** EAS Build Configuration
- **Purpose:** Defines EAS build profiles for different environments.
- **Profiles:**
  - `development` — development client, internal distribution
  - `preview` — Android APK, internal distribution (for testing)
  - `production` — Android App Bundle (.aab), iOS App Store

---

### `RepairShopApp/tsconfig.json`
- **Category:** TypeScript Configuration
- **Purpose:** TypeScript compiler options + path aliases for Expo (tsconfigPaths experiment enabled in `app.json`).

---

### `RepairShopApp/metro.config.js`
- **Category:** Bundler Configuration
- **Purpose:** Metro bundler config — configures path to shared `admin-panel/src/shared` modules.
- **Key Setting:** Adds the project root and parent directory to the resolver watchFolders/extraNodeModules so that the cross-app import `../../../../admin-panel/src/shared/documents/DocumentRenderer` can resolve.

---

## Source Files — Entry Point

---

### `RepairShopApp/index.ts`
- **Category:** Entry Point
- **Purpose:** Registers the root component with Expo's AppRegistry.
- **Code:** `registerRootComponent(App)` — wraps App in necessary Expo providers.

---

### `RepairShopApp/App.tsx`
- **Category:** Root Component | **Size:** 2,241 bytes | **Lines:** ~60
- **Purpose:** Root component wrapping all providers and the RootNavigator.
- **Provider Tree:**
  ```
  GestureHandlerRootView
    └─ SafeAreaProvider
         └─ AuthProvider
              └─ ToastProvider
                   └─ NavigationContainer
                        └─ RootNavigator
  ```
- **Why GestureHandlerRootView is outermost:** Required by `react-native-gesture-handler` for all swipe/gesture features.
- **Why SafeAreaProvider is inside GestureHandler:** Safe area context is needed for notch/navigation bar awareness.

---

## Source Files — Design Tokens

---

### `RepairShopApp/src/tokens.ts`
- **Category:** Design System | **Size:** 7,500+ bytes | **Lines:** 200+
- **Purpose:** Master design token file — single source of truth for all visual styling in the mobile app.
- **Exports:** `colors`, `spacing`, `radius`, `typography`, `shadow`, `animation`

- **`colors` object:**
  - Canvas: `background (#FAFAF9)`, `backgroundAlt (#F5F4F2)`, `surface (#FFFFFF)`, `border (#E5E2DC)`, `borderStrong (#C8C4BC)`
  - Brand: `primary (#5B5BD6 — Indigo)`, `primaryDark (#4747B8)`, `primaryDim (rgba(91,91,214,0.10))`
  - Text: `textPrimary (#1C1917)`, `textSecondary (#78716C)`, `textMuted (#A8A29E)`, `textInverse (#FFFFFF)`
  - Status: `statusReceivedBg/Fg (amber)`, `statusInProgressBg/Fg (blue)`, `statusCompletedBg/Fg (green)`, `statusUrgentBg/Fg (red)`, `statusPendingBg/Fg (amber)`
  - Priority: `priorityNormalBg/Fg (gray)`, `priorityHighBg/Fg (orange)`, `priorityUrgentBg/Fg (red)`
  - Semantic: `success (#22C55E)`, `accentRed (#EF4444)`, `warning (#F59E0B)`
  - Nav: `navBackground (#1C1917)`, `navText (#9CA3AF)`, `navActiveText (#FFFFFF)`, `navActiveBg (rgba(255,255,255,0.08))`, `navActiveBorder (#5B5BD6)`

- **`spacing` object:** `xs (4)`, `sm (8)`, `md (12)`, `lg (16)`, `xl (24)`, `xxl (32)` — in React Native density-independent pixels

- **`radius` object:** `sm (8)`, `md (12)`, `lg (20)`, `xl (28)`, `pill (100)`

- **`typography` object:** Font size + weight + line height combinations:
  - `h1`: 32px, bold (700), lineHeight 40
  - `h2`: 22px, bold (700), lineHeight 30
  - `body`: 16px, regular (400), lineHeight 24
  - `bodyBold`: 16px, semibold (600), lineHeight 24
  - `label`: 13px, semibold (600), lineHeight 18, letterSpacing 0.3
  - `caption`: 12px, regular (400), lineHeight 16
  - `captionBold`: 12px, semibold (600), lineHeight 16

- **`shadow` object:** React Native `shadowColor`, `shadowOffset`, `shadowOpacity`, `shadowRadius` — iOS shadows
  - `card`: light diffused shadow for cards
  - `nav`: stronger shadow for navigation bar
  - `modal`: elevated shadow for modals

- **`animation` object:** `spring` config for `react-native-reanimated` `withSpring()`:
  - `spring.default`: `{ damping: 18, stiffness: 200 }`
  - `spring.bouncy`: `{ damping: 12, stiffness: 250 }`

---

## Source Files — Context

---

### `RepairShopApp/src/context/AuthContext.tsx`
- **Category:** State / Auth | **Size:** 3,243 bytes | **Lines:** 108
- **Purpose:** Provides authentication state to the mobile app via React Context.
- **Exports:** `AuthProvider` (component), `useAuth` (hook)
- **State:** `user` (User from DB), `session`, `isLoading`
- **Derived Values:** `isActive = user?.is_active`, `role = user?.role`
- **Key Behaviors:**
  1. On mount: calls `supabase.auth.getSession()` → if session, calls `fetchUserRow(session.user.id)`
  2. `fetchUserRow`: SELECT from `users` where `id = uid` — returns full profile
  3. Listens to `onAuthStateChange` — re-fetches user row on every auth event
  4. Passes `pushNotifications` state (from `usePushNotifications(user?.id)`) through to provider
  5. `signOut()` calls `supabase.auth.signOut()`
- **Context Value:** `{ user, session, isLoading, isActive, role, pushState, signOut }`

---

### `RepairShopApp/src/context/ToastContext.tsx`
- **Category:** State / UI | **Size:** 1,734 bytes | **Lines:** 56
- **Purpose:** Provides toast notification state and `showToast()` function.
- **Exports:** `ToastProvider`, `useToast`
- **Interface:** `showToast({ title: string, message: string, type: 'success' | 'error' | 'info' | 'warning' })`
- **State:** Single `toast` object that shows briefly then clears
- **Rendering:** `Toast` component rendered as an overlay at the bottom of the provider tree

---

## Source Files — Navigation

---

### `RepairShopApp/src/navigation/RootNavigator.tsx`
- **Category:** Navigation | **Size:** 2,400+ bytes | **Lines:** ~70
- **Purpose:** Top-level navigation decision tree — renders the right stack based on auth state.
- **Logic:**
  ```
  isLoading → <LoadingScreen />
  !session → <LoginScreen />
  !isActive → <InactiveUserScreen />
  role === 'admin' → <AdminTabs />
  role === 'receptionist' → <ReceptionistTabs />
  role === 'technician' → <TechnicianTabs />
  default → <LoginScreen />
  ```
- **Navigator Type:** Bare conditional rendering (not a Stack navigator at root)

---

### `RepairShopApp/src/navigation/CustomTabBar.tsx`
- **Category:** Navigation Component | **Size:** 6,107 bytes | **Lines:** ~160
- **Purpose:** Replaces the default React Navigation bottom tab bar with a custom floating pill design.
- **Key Visual:** Dark (`navBackground #1C1917`) rounded pill bar floating above content
- **Active Indicator:** Animated white tab label + purple left border + subtle white bg tint
- **Animation:** `withSpring(tabBarPosition, spring.default)` — smooth spring-based transition of the active pill indicator
- **Layout:** Fixed 64px height, 16px horizontal margin, `borderRadius: radius.xl`, `shadow.nav`
- **Tab Configuration:** Icon (Lucide) + label text + active/inactive color switching

---

### `RepairShopApp/src/navigation/ReceptionistTabs.tsx`
- **Category:** Navigation | **Size:** 2,456 bytes | **Lines:** ~65
- **Purpose:** Bottom tab navigator for receptionist role.
- **Tabs:** Dashboard, Jobs (ReceptionistJobsStack), Attendance, Notifications
- **Tab Icons:** Home, Briefcase, CalendarClock, Bell
- **Tab Bar:** `tabBar` prop renders `<CustomTabBar />`

---

### `RepairShopApp/src/navigation/ReceptionistJobsStack.tsx`
- **Category:** Navigation | **Size:** 2,115 bytes | **Lines:** ~55
- **Purpose:** Stack navigator within the Jobs tab for receptionist.
- **Screens:** JobList → JobDetail | New Job → Job Assignment
- **Stack Configuration:** `headerShown: false` (AppHeader components handle their own headers)

---

### `RepairShopApp/src/navigation/TechnicianTabs.tsx`
- **Category:** Navigation | **Size:** 2,296 bytes | **Lines:** ~60
- **Purpose:** Bottom tab navigator for technician role.
- **Tabs:** Dashboard, My Jobs (TechnicianJobsStack), Attendance, Notifications
- **Icons:** Home, Wrench, CalendarClock, Bell

---

### `RepairShopApp/src/navigation/TechnicianJobsStack.tsx`
- **Category:** Navigation | **Size:** 1,989 bytes | **Lines:** ~50
- **Purpose:** Stack navigator within the My Jobs tab for technician.
- **Screens:** MyJobs → UpdateWork, OnsiteVisit

---

### `RepairShopApp/src/navigation/AdminTabs.tsx`
- **Category:** Navigation | **Size:** 2,400 bytes | **Lines:** ~65
- **Purpose:** Bottom tab navigator for admin role.
- **Tabs:** Overview, Jobs, Staff, Inventory, Reports
- **Note:** Admin mobile is primarily a view/approval interface, not full management

---

## Source Files — Screens

---

### `RepairShopApp/src/screens/auth/LoginScreen.tsx`
- **Category:** Screen | **Size:** 8,500+ bytes | **Lines:** ~220
- **Purpose:** Authentication screen with role selection cards and email/password login form.
- **Flow:**
  1. Three role cards shown: Receptionist, Technician, Admin
  2. User taps a role card (selection is visual only — actual role comes from DB)
  3. Email and password fields appear
  4. Submit → `supabase.auth.signInWithPassword()` → Auth context handles role routing
- **Visual:** Animated fade-in, logo mark, indigo primary button
- **Error Handling:** Shows toast for invalid credentials

---

### `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`
- **Category:** Screen (Shared) | **Size:** 20,500+ bytes | **Lines:** ~500
- **Purpose:** Most complex screen in the mobile app — handles full attendance check-in/check-out flow with selfie + GPS.
- **State:** `attendance` (today's record), `history` (30 days), `camera permissions`, `location permissions`, `selfie URI`, `GPS coords`, `uploading`
- **Check-In Flow:**
  1. Request camera permission
  2. Request location permission
  3. Open `SelfieCapture` component (camera overlay)
  4. Capture photo → compress via `expo-image-manipulator`
  5. Get GPS via `expo-location.getCurrentPositionAsync({ accuracy: HIGH })`
  6. Upload photo to `attendance-selfies` storage bucket
  7. Upsert into `attendance` table with selfie URL + GPS + timestamp
  8. Refresh today's record and history
- **Check-Out Flow:** Same steps but updates `check_out_time`, `check_out_selfie_url`, `check_out_gps`
- **History:** Last 30 days of attendance rendered as a `FlatList` with `AttendanceCard` items
- **Status Logic:** Determines `AttendanceStatus` from check-in/check-out times vs. shift hours
- **Security:** Never submits without GPS (throws error if location is null)

---

### `RepairShopApp/src/screens/shared/NotificationsScreen.tsx`
- **Category:** Screen (Shared) | **Size:** 4,800+ bytes | **Lines:** ~120
- **Purpose:** Displays the notification log from the `notifications` table.
- **Data:** Fetches notifications filtered by current user's jobs (if technician) or all (if admin/receptionist)
- **Display:** List of notifications with channel icon + message + timestamp

---

### `RepairShopApp/src/screens/shared/InactiveUserScreen.tsx`
- **Category:** Screen (Shared) | **Size:** 2,400 bytes | **Lines:** ~60
- **Purpose:** Shown when user's `is_active = false` (pending approval).
- **Content:** Illustration/icon, "Awaiting Approval" message, Sign Out button
- **Sign Out:** Calls `signOut()` from `AuthContext`

---

### `RepairShopApp/src/screens/receptionist/DashboardScreen.tsx`
- **Category:** Screen | **Size:** 8,900+ bytes | **Lines:** ~225
- **Purpose:** Receptionist home screen with KPI cards and quick action buttons.
- **KPI Cards:**
  - Total Jobs Today
  - Pending/Received count
  - In Progress count
  - Completed Today count
- **Quick Actions:** "New Job" button → navigates to CustomerIntakeScreen
- **Recent Jobs:** Last 5 jobs as a compact list
- **Realtime:** Subscribes to `jobs` table channel for live updates

---

### `RepairShopApp/src/screens/receptionist/CustomerIntakeScreen.tsx`
- **Category:** Screen | **Size:** 12,000+ bytes | **Lines:** ~300
- **Purpose:** Step 1 of 2 in job creation — collects customer and device information.
- **Fields:**
  - Customer Name (required)
  - Contact Number (required, numeric keyboard, validated)
  - Customer Email (optional)
  - Device Type (required — Dropdown: Laptop, Desktop, Phone, Tablet, Printer, Other)
  - Reported Issue (required, multiline)
  - Remarks (optional, multiline)
  - Job Type (Inhouse / Onsite) — segmented control
  - Priority (Normal / High / Urgent) — segmented control
- **Validation:** Required field checks before navigation
- **On Submit:** Navigates to `JobAssignmentScreen` passing `formState` as route params

---

### `RepairShopApp/src/screens/receptionist/JobAssignmentScreen.tsx`
- **Category:** Screen | **Size:** 12,095 bytes | **Lines:** 366
- **Purpose:** Step 2 of 2 in job creation — reviews job summary, optionally assigns a technician, and submits to DB.
- **State:** `technicianId`, `techName`, `loading`, `showTechPicker`, `successModalVisible`, `createdJob`
- **Submit Flow (`submitJob`):**
  1. `supabase.rpc('generate_job_code')` — gets unique RS-YYYY-NNNN code from PostgreSQL
  2. `supabase.from('jobs').insert({...})` — creates job with all form data
  3. On success → sets `createdJob` state → shows `successModalVisible`
- **Success Modal Actions:**
  1. Print Receipt → `generateDocumentHtml('receipt', createdJob, [])` → `Print.printAsync({ html })`
  2. View Job Details → navigate to `JobDetail`
  3. Create Another → reset flow, navigate to `New Job`
- **Technician Picker:** `TechnicianPicker` modal — lists all active technicians
- **Print Receipt:** Disabled until job is created; enabled after success

---

### `RepairShopApp/src/screens/receptionist/JobListScreen.tsx`
- **Category:** Screen | **Size:** 9,200+ bytes | **Lines:** ~230
- **Purpose:** Shows all jobs visible to receptionist with filter tabs and search.
- **Filters:** Status tabs (All/Received/In Progress/Waiting/Completed), search query
- **Data:** Joins with technician name via `users!jobs_technician_id_fkey(name)`
- **Realtime:** Subscribes to `jobs` table channel
- **Navigation:** Tap job → `JobDetail`

---

### `RepairShopApp/src/screens/receptionist/JobDetailScreen.tsx`
- **Category:** Screen | **Size:** 10,400+ bytes | **Lines:** ~260
- **Purpose:** Receptionist view of a job — shows all details, allows status change and technician reassignment.
- **Actions:**
  - Open billing → navigate to `BillingScreen` passing jobId
  - Reassign technician → opens technician picker bottom sheet
  - WhatsApp customer → `createWhatsAppUrl()` + `Linking.openURL()`
  - Change status → bottom sheet status selector

---

### `RepairShopApp/src/screens/receptionist/BillingScreen.tsx`
- **Category:** Screen | **Size:** 20,000+ bytes | **Lines:** ~480
- **Purpose:** Full billing/invoice management screen for receptionist.
- **Data:** Fetches job + job_materials + existing billing record
- **Billing Form:**
  - Labour Charge (₹) — numeric input
  - Tax Percent (%) — numeric input (default 18%)
  - Discount (₹) — numeric input
  - Grand Total — automatically calculated (display only)
- **Materials Display:** Read-only `MaterialList` showing parts added by technician
- **Actions:**
  1. **Save Invoice** → upsert into `billing` table with calculated totals
  2. **Print Invoice** → `generateDocumentHtml('invoice', job, materials, billing)` → `Print.printAsync()`
  3. **Email Invoice** → `supabase.functions.invoke('send-invoice-email', { body: { type: 'MANUAL', jobId } })`
  4. **WhatsApp Ready** → `createWhatsAppUrl()` + `Linking.openURL()` with "ready for pickup" message
  5. **Mark as Paid / Unpaid** → toggle `billing.is_paid`
- **Cross-App Import:** `generateDocumentHtml` imported from `../../../../admin-panel/src/shared/documents/DocumentRenderer`
- **Calculation:** Uses `calculatePartsTotal()` and `calculateGrandTotal()` from `utils/billing.ts`

---

### `RepairShopApp/src/screens/technician/TechnicianDashboardScreen.tsx`
- **Category:** Screen | **Size:** 6,800+ bytes | **Lines:** ~170
- **Purpose:** Technician home — shows assigned job counts and quick navigation.
- **KPIs:** Total assigned jobs, In Progress count, Completed count
- **Quick Actions:** Navigate to "My Jobs"

---

### `RepairShopApp/src/screens/technician/MyJobsScreen.tsx`
- **Category:** Screen | **Size:** 7,200+ bytes | **Lines:** ~180
- **Purpose:** Lists all jobs assigned to the current technician (filtered by `technician_id`).
- **Security:** Query always filters `technician_id = user.id` — cannot see other technicians' jobs
- **Realtime:** Subscribes to `jobs` channel filtered by `technician_id=eq.${user.id}`
- **Navigation:** Tap job → `UpdateWork`

---

### `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx`
- **Category:** Screen | **Size:** 11,726 bytes | **Lines:** 359
- **Purpose:** Technician's primary work screen — update status, log materials, write notes.
- **Data Fetching:** On `useFocusEffect` — fetches job (filtered by `technician_id`) + materials
- **Realtime:** Subscribes to `jobs` and `job_materials` channels filtered by `jobId`
- **Materials Section:**
  - `MaterialList` component — shows all logged materials, allows delete (with confirmation)
  - `AddMaterialModal` — form to add a new material
  - Total cost calculated via `useMemo`
- **Work Notes:** Multiline `TextInput` — saved to `jobs.work_notes`
- **Status Update:**
  - Status dropdown (BottomSheet): `In Progress | Waiting for Materials | Completed`
  - Selecting `Completed` → sets `completed_at = new Date().toISOString()`
- **"Update & Notify" Button:** Updates `jobs` table → triggers Supabase webhook → `notify-on-status-change` Edge Function fires
- **Locked when Completed:** All inputs disabled, no update button shown when status is `Completed`

---

### `RepairShopApp/src/screens/technician/OnsiteVisitScreen.tsx`
- **Category:** Screen | **Size:** 14,800+ bytes | **Lines:** ~370
- **Purpose:** Handles the onsite visit flow — arrival selfie + GPS, and departure selfie + GPS.
- **State:** `visit` (current OnsiteVisit record), `phase` (idle/arrived/departed), `captureMode`
- **Arrival Flow:**
  1. `SelfieCapture` — front camera selfie
  2. GPS capture
  3. Upload selfie to `onsite-visits` bucket
  4. Insert into `onsite_visits` table with `arrived_at`, `arrival_selfie_url`, `arrival_gps`
- **Departure Flow:**
  1. `SelfieCapture` — front camera selfie
  2. GPS capture
  3. Upload selfie
  4. Update `onsite_visits` row with `departed_at`, `departure_selfie_url`, `departure_gps`

---

### `RepairShopApp/src/screens/admin/OverviewScreen.tsx`
- **Category:** Screen (Admin Mobile) | **Size:** 8,200+ bytes | **Lines:** ~205
- **Purpose:** Mobile admin overview — KPI cards + system summary.
- **Note:** Simpler than the web admin dashboard but functionally similar — intended for admin on-the-go use.

---

### `RepairShopApp/src/screens/admin/StaffScreen.tsx`
- **Category:** Screen (Admin Mobile) | **Size:** 7,400+ bytes | **Lines:** ~185
- **Purpose:** View staff list, approve/block users on mobile.
- **Actions:** Approve (is_active = true), Block (is_active = false) — both with confirmation via `Alert`

---

### `RepairShopApp/src/screens/admin/InventoryScreen.tsx`
- **Category:** Screen (Admin Mobile) | **Size:** 6,800+ bytes | **Lines:** ~170
- **Purpose:** View and manage inventory on mobile.
- **Read-only on mobile** — view mode with low-stock highlighting. Edit capability may be limited.

---

### `RepairShopApp/src/screens/admin/ReportsScreen.tsx`
- **Category:** Screen (Admin Mobile) | **Size:** 5,400+ bytes | **Lines:** ~135
- **Purpose:** View-only reports screen on mobile.

---

### `RepairShopApp/src/screens/shared/ComingSoonScreen.tsx`
- **Category:** Screen | **Size:** 1,480 bytes | **Lines:** ~40
- **Purpose:** Placeholder screen with clock icon + "Coming Soon" message.
- **Used for:** Customers tab (not yet implemented)

---

## Source Files — Components

---

### `RepairShopApp/src/components/common/AppHeader.tsx`
- **Category:** UI Component | **Size:** 2,300+ bytes | **Lines:** ~60
- **Purpose:** Screen-level header bar with title and optional back button.
- **Props:** `title`, `showBack` (boolean), `rightElement` (optional)
- **Safe Area:** Accounts for status bar height using `useSafeAreaInsets()`
- **Back Navigation:** `navigation.goBack()` on back press

---

### `RepairShopApp/src/components/common/BottomSheet.tsx`
- **Category:** UI Component | **Size:** 2,100+ bytes | **Lines:** ~55
- **Purpose:** A modal that slides up from the bottom of the screen.
- **Props:** `visible` (boolean), `onClose` (function), `children`
- **Animation:** Uses React Native `Modal` with `transparent` and `animationType="slide"`
- **Backdrop:** Semi-transparent dark overlay that dismisses on press

---

### `RepairShopApp/src/components/common/Button.tsx`
- **Category:** UI Component | **Size:** 1,900+ bytes | **Lines:** ~50
- **Purpose:** Reusable touchable button component.
- **Props:** `label`, `onPress`, `variant` (primary/secondary), `loading`, `disabled`, `style`
- **Loading State:** Shows `ActivityIndicator` replacing label text

---

### `RepairShopApp/src/components/common/SectionLabel.tsx`
- **Category:** UI Component | **Size:** 847 bytes | **Lines:** ~25
- **Purpose:** Uppercase section title with optional right element.
- **Props:** `title`, `rightElement`
- **Visual:** Small caps, muted color, `caption` typography, `textTransform: 'uppercase'`, `letterSpacing: 0.8`

---

### `RepairShopApp/src/components/jobs/JobCard.tsx`
- **Category:** UI Component | **Size:** 4,200+ bytes | **Lines:** ~105
- **Purpose:** Compact job list item card showing key job info.
- **Displays:** Job code, customer name, device type, status badge, priority badge, created time
- **Optional:** Technician name (when visible in receptionist context)
- **Animation:** `Animated.View` with `FadeInUp` on mount

---

### `RepairShopApp/src/components/jobs/JobDetailShell.tsx`
- **Category:** UI Component | **Size:** 4,800+ bytes | **Lines:** ~120
- **Purpose:** Reusable scrollable shell for job detail screens — header card with job summary + slot for children.
- **Header Card:** Job code, customer name, device, status badge, priority badge, job type
- **Children Slot:** Below the header card, any content can be inserted (materials, notes, etc.)
- **Used by:** `UpdateWorkScreen` (technician)

---

### `RepairShopApp/src/components/jobs/TechnicianPicker.tsx`
- **Category:** Business Component | **Size:** 3,400+ bytes | **Lines:** ~85
- **Purpose:** Modal to select a technician from a list.
- **Data:** Fetches all active technicians from `users` table
- **Props:** `visible`, `onClose`, `onSelect(id, name)`
- **Rendering:** List of technician names with radio-style selection

---

### `RepairShopApp/src/components/materials/AddMaterialModal.tsx`
- **Category:** Business Component | **Size:** 4,100+ bytes | **Lines:** ~100
- **Purpose:** Bottom sheet form to add a material/part to a job.
- **Fields:** Material name, quantity, unit cost
- **Calculation:** `total_cost = quantity × unit_cost`
- **Action:** Inserts into `job_materials` table → calls `onAdded()` prop

---

### `RepairShopApp/src/components/materials/MaterialList.tsx`
- **Category:** UI Component | **Size:** 2,800+ bytes | **Lines:** ~70
- **Purpose:** Renders a list of `JobMaterial` objects.
- **Props:** `materials`, `onDelete(id)`, `canEdit` (boolean — shows delete button only if true)
- **Per Item:** Material name, quantity × unit cost = total cost
- **Empty State:** "No materials logged yet" message

---

### `RepairShopApp/src/components/shared/SelfieCapture.tsx`
- **Category:** Business Component | **Size:** 7,800+ bytes | **Lines:** ~195
- **Purpose:** In-app camera overlay for taking selfies.
- **Flow:** Open camera → preview → capture → compress → return `{ uri }` to parent
- **Camera Type:** Front-facing (`CameraType.front`) by default
- **Compression:** Uses `expo-image-manipulator` to resize (max 1280px) and compress (0.7 quality)
- **Props:** `onCapture(uri: string)`, `onCancel()`
- **Styling:** Full-screen overlay with capture button and cancel button

---

### `RepairShopApp/src/components/shared/SegmentedControl.tsx`
- **Category:** UI Component | **Size:** 2,400+ bytes | **Lines:** ~60
- **Purpose:** Segmented button control for selecting one of a few options.
- **Props:** `options: string[]`, `selectedIndex`, `onChange(index)`
- **Visual:** Pill container with animated sliding indicator (white background on dark) — hardware-accelerated via `react-native-reanimated`
- **Used for:** Job Type (Inhouse/Onsite), Priority (Normal/High/Urgent)

---

### `RepairShopApp/src/components/shared/RoleDashboard.tsx`
- **Category:** UI Component | **Size:** 3,600+ bytes | **Lines:** ~90
- **Purpose:** Shared dashboard template for both receptionist and technician home screens.
- **Slots:** KPI card grid + quick action buttons + recent items list
- **Props:** `kpiCards`, `quickActions`, `recentItems`

---

## Source Files — Hooks

---

### `RepairShopApp/src/hooks/usePushNotifications.ts`
- **Category:** Custom Hook | **Size:** 4,846 bytes | **Lines:** 153
- **Purpose:** Registers device for Expo push notifications and syncs the token to the DB.
- **Key Logic:**
  1. Checks `Constants.appOwnership === 'expo'` — skips in Expo Go (SDK 53+ incompatibility)
  2. Sets `Notifications.setNotificationHandler` — controls banner/sound/badge behavior
  3. On Android: creates notification channel `default` with MAX importance
  4. Requests notification permissions
  5. Gets `Notifications.getExpoPushTokenAsync({ projectId })` — uses EAS project ID from `app.json`
  6. Syncs token to `users.expo_push_token` — with 3-retry exponential backoff
  7. Sets up `addNotificationReceivedListener` + `addNotificationResponseReceivedListener`
- **Returns:** `{ expoPushToken, notification }`

---

### `RepairShopApp/src/hooks/useBottomInsetPadding.ts`
- **Category:** Custom Hook | **Size:** 632 bytes | **Lines:** ~20
- **Purpose:** Returns appropriate bottom padding accounting for safe area and tab bar height.
- **Parameter:** `context: 'nav' | 'none'`
- **Returns:** `number` — bottom padding value in DIP
- **Used by:** Screens to add padding so content isn't hidden behind the tab bar

---

### `RepairShopApp/src/hooks/useCameraPermission.ts`
- **Category:** Custom Hook | **Size:** 800+ bytes | **Lines:** ~25
- **Purpose:** Abstracts camera permission request logic.
- **Returns:** `{ permission, requestPermission }` from `expo-camera`

---

### `RepairShopApp/src/hooks/useLocationPermission.ts`
- **Category:** Custom Hook | **Size:** 800+ bytes | **Lines:** ~25
- **Purpose:** Abstracts location permission request logic.
- **Returns:** `{ granted, requestPermission }` from `expo-location`

---

## Source Files — Types

---

### `RepairShopApp/src/types/job.ts`
- **Category:** Types
- **Exports:** `JobStatus`, `JobPriority`, `JobType`, `Job`, `JobMaterial`, `NewJobFormValues`
- **`Job` interface includes:** All DB columns + optional join `technician: { name: string } | null`
- **`NewJobFormValues`:** The form data passed between `CustomerIntakeScreen` and `JobAssignmentScreen`

---

### `RepairShopApp/src/types/user.ts`
- **Category:** Types
- **Exports:** `UserRole`, `User`, `TechnicianSummary`
- **`User`:** Full DB row shape including `expo_push_token`, `is_active`, `role`

---

### `RepairShopApp/src/types/attendance.ts`
- **Category:** Types
- **Exports:** `AttendanceStatus`, `AttendanceRecord`

---

### `RepairShopApp/src/types/billing.ts`
- **Category:** Types
- **Exports:** `Billing` — matches the `billing` DB table schema

---

### `RepairShopApp/src/types/onsiteVisit.ts`
- **Category:** Types
- **Exports:** `OnsiteVisit` — matches the `onsite_visits` DB table schema

---

## Source Files — Utilities

---

### `RepairShopApp/src/utils/billing.ts`
- **Category:** Utility
- **Exports:** `calculatePartsTotal()`, `calculateTaxAmount()`, `calculateGrandTotal()`, `roundMoney()`
- **Formula:** `(parts + labour) × (1 + tax/100) - discount`
- **Note:** Duplicate of `admin-panel/src/utils/billing.ts`

---

### `RepairShopApp/src/utils/phone.ts`
- **Category:** Utility
- **Exports:** `cleanPhoneNumber()`, `formatIndianPhoneForWhatsApp()`, `createWhatsAppUrl()`
- **`formatIndianPhoneForWhatsApp`:** Normalizes Indian numbers to +91XXXXXXXXXX format
  - Handles: `+91XXXXXXXXXX`, `91XXXXXXXXXX`, `0XXXXXXXXXX`, `XXXXXXXXXX` (10 digits)
- **`createWhatsAppUrl`:** Creates `whatsapp://send?phone=91XXXXXXXXXX&text=encoded_message`

---

### `RepairShopApp/src/utils/compressImage.ts`
- **Category:** Utility
- **Exports:** `compressImage(uri: string): Promise<string>`
- **Algorithm:** `ImageManipulator.manipulateAsync(uri, [{ resize: { width: 1280 } }], { compress: 0.7, format: 'jpeg' })`
- **Used by:** `SelfieCapture`, `OnsiteVisitScreen` before uploading photos

---

### `RepairShopApp/src/utils/date.ts`
- **Category:** Utility
- **Exports:** `getTodayDateString()` → `"2026-01-15"`, `formatTime(dateStr)` → `"14:30"`, `formatDate(dateStr)` → `"Jan 15"`

---

### `RepairShopApp/src/utils/formatCurrency.ts`
- **Category:** Utility
- **Exports:** `formatCurrency(n: number): string` → `"₹1,234.56"`
- **Note:** Duplicate of `admin-panel/src/utils/formatCurrency.ts`

---

### `RepairShopApp/src/utils/storagePaths.ts`
- **Category:** Utility
- **Exports:** `getAttendanceStoragePath(userId, date, type: 'checkin' | 'checkout'): string`
- **Output:** `"attendance-selfies/{userId}/{date}/{type}.jpg"`

---

## Source Files — Library

---

### `RepairShopApp/src/lib/supabase.ts`
- **Category:** Infrastructure | **Size:** 1,140 bytes | **Lines:** ~35
- **Purpose:** Creates and exports the Supabase client instance for the mobile app.
- **Key Difference from Admin:** Uses `ExpoSecureStoreAdapter` for session storage instead of localStorage.
- **`ExpoSecureStoreAdapter` Implementation:**
  ```typescript
  const ExpoSecureStoreAdapter = {
    getItem: (key) => SecureStore.getItemAsync(key),
    setItem: (key, value) => SecureStore.setItemAsync(key, value),
    removeItem: (key) => SecureStore.deleteItemAsync(key),
  };
  ```
- **Client Config:**
  ```typescript
  createClient(url, anonKey, {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  })
  ```
- **`detectSessionInUrl: false`** — disables OAuth URL detection (not needed for native apps)

---

### `RepairShopApp/src/lib/auth.ts`
- **Category:** Infrastructure | **Size:** 700+ bytes | **Lines:** ~20
- **Purpose:** Provides `fetchUserRow(userId: string)` helper.
- **Algorithm:** `SELECT * FROM users WHERE id = userId SINGLE()`
- **Returns:** `User | null`
- **Used by:** `AuthContext` on auth state changes
