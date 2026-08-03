# MASTER PROMPT — RepairShop Mobile App: Complete Frontend UI/UX Regeneration

**Prepared for:** Antigravity coding agent
**Prepared from:** `mobile_audit_2026-07-19__Page-Wise_.md` (current-state codebase audit, 13 screens + global shell + common components) and the mobile design reference specification (14 target screens extracted from reference screenshots)
**Stack (unchanged):** Expo · React Native · TypeScript · Supabase (PostgreSQL, RLS, Realtime, Storage)
**Mode:** Gated, phase-by-phase, extreme detail, zero tolerance for leftover old UI. Do not skip ahead. Stop after every phase and wait for explicit approval.

---

## 0. HOW TO USE THIS PROMPT (Agent Operating Rules)

1. Read this entire document, plus both source documents in full, before writing a single line of code.
2. This is a **complete frontend regeneration**, not a patch pass. "Nothing of the old UI/UX remains" is the literal success bar — every screen's JSX, styling, and visual structure gets rewritten from the reference design, not adjusted incrementally. If a piece of old markup still renders after this prompt is executed, that is a failure condition, not an acceptable leftover.
3. Work through the Execution Phases (Section 10) strictly in order. At the end of every phase: list every file created, every file deleted, every file rewritten, and anything you flagged as needing confirmation. Wait for explicit approval before continuing.
4. **Business logic and data-fetching that already works correctly stays intact** unless a specific instruction below says to change it (e.g. Realtime wiring, image compression — both explicitly called out because the audit flagged them as broken, not because this is a backend rewrite). Do not touch Supabase schema, RLS policies, or table structures without flagging it and getting confirmation first.
5. Where the current audit found duplicate/near-duplicate screens, **do not just reskin both copies in parallel** — consolidate shared visual structure into one shared component first (Section 5), then have both role-specific screens consume it, so the duplication problem is actually solved, not just re-duplicated in the new visual language.
6. Where the reference design spec has no equivalent screen for something that currently exists in the app (e.g. `BillingScreen.tsx`), you must still fully redesign it — invent nothing structurally new about its *functionality*, but rebuild its *presentation* to match every token, spacing, radius, color, and component pattern established by the screens that do have a reference. Section 9 gives you a fully worked example of how to do this for `BillingScreen.tsx` specifically — follow that same method for any other gap you find.
7. Where the reference design spec has a screen that **does not exist yet** in the codebase at all (Notifications, Reports), build it as a new screen, wired into real navigation and real data — not a static mockup.

---

## 1. OBJECTIVE

Take the mobile app from its current, audit-confirmed state — inconsistent token usage, `Alert.alert()` overused everywhere instead of a designed feedback system, three sets of duplicated screens, missing Realtime subscriptions on live-data screens, raw uncompressed image uploads, and two screens/features (Notifications, Reports) that don't exist yet — to a single, complete, internally consistent implementation of the reference design language, with zero old-style markup, zero token bypasses, and zero native alert dialogs left anywhere in the codebase.

---

## 2. SOURCE MAPPING TABLE — READ THIS BEFORE TOUCHING ANY SCREEN

This table is the backbone of the whole rebuild. Every row tells you: what file exists today, which reference screen governs its new design, and exactly what structural action to take. Do not deviate from the "Action" column without flagging it first.

| # | Current File | Role(s) | Reference Screen | Action |
|---|---|---|---|---|
| 1 | `screens/auth/LoginScreen.tsx` | All | Screen 1 — Role Selection | **Full replace.** This becomes the 3-card role selector (Receptionist / Technician / Admin), not a plain email/password form. See Section 9.1. |
| 2 | `screens/shared/AttendanceScreen.tsx` | Receptionist + Technician (shared file) | Screen 3 — Attendance | **Full visual rebuild**, file stays shared. See Section 9.2. |
| 3 | `screens/receptionist/DashboardScreen.tsx` | Receptionist | Screen 2 — Receptionist Dashboard | **Full rebuild** as a themed variant of the shared `RoleDashboard`. See Section 9.3. |
| 4 | `screens/receptionist/JobListScreen.tsx` | Receptionist | Screen 6 — Job Tracking | **Extract + rebuild.** Becomes a thin role-specific wrapper around a new shared `components/job/JobList.tsx`. See Section 5.2 and Section 9.4. |
| 5 | `screens/receptionist/JobDetailScreen.tsx` | Receptionist | No direct reference — generate to theme | **Extract + rebuild.** Becomes a thin role-specific wrapper around a new shared `components/job/JobDetailShell.tsx`. See Section 5.1 and Section 9.5. |
| 6 | `screens/receptionist/NewJobScreen.tsx` | Receptionist | Screens 4 + 5 — Customer Intake + Job Assignment | **Split into two screens** and a wizard flow. See Section 9.6. |
| 7 | `screens/receptionist/BillingScreen.tsx` | Receptionist | No direct reference — generate to theme | **Full rebuild**, structure invented to match theme. See Section 9.7. |
| 8 | `screens/technician/MyJobsScreen.tsx` | Technician | Screen 9 — Assigned Jobs | **Extract + rebuild** on the same shared `JobList` component as row 4. See Section 9.8. |
| 9 | `screens/technician/TechJobDetailScreen.tsx` | Technician | Screens 10 + 11 — Onsite Visit + Update Work | **Split into two screens.** See Section 9.9. |
| 10 | `screens/admin/OverviewScreen.tsx` | Admin | Screen 12 — Admin Dashboard | **Full rebuild** as a themed variant of the shared `RoleDashboard`. See Section 9.10. |
| 11 | `screens/admin/InventoryScreen.tsx` | Admin (confirm if Technician also has read access per its own quick action) | Screen 13 — Inventory Management | **Full rebuild.** See Section 9.11. |
| 12 | *(new)* `screens/shared/NotificationsScreen.tsx` | All roles | Screen 7 — Notifications | **Build from scratch.** See Section 9.12. |
| 13 | *(new)* `screens/admin/ReportsScreen.tsx` | Admin | Screen 14 — Reports & Analytics | **Build from scratch.** See Section 9.13. |
| 14 | *(locate or build)* Admin "Users"/Staff screen | Admin | No screenshot reference — generate to theme | The Admin bottom nav in the reference design has a dedicated "Users" tab, but the audit's 13 audited screens don't include a staff-management screen. **First confirm whether this screen already exists somewhere in the codebase** (it may not have been in the audited set); if it exists, rebuild it per Section 9.14; if it does not exist, build it fresh per the same section, reusing whatever staff/user Supabase query already powers the web admin panel's Staff Management page if that table is shared. |

---

## 3. NON-NEGOTIABLE RULES

- **No dark mode, ever.** If any `useColorScheme` branch exists anywhere (the audit did not explicitly flag one, but re-verify during Phase 1), delete it. Pure white (`#FFFFFF`) canvas everywhere, no exceptions.
- **`tokens.ts` is the single source of truth for every color, spacing value, radius, and font size.** The audit found this file to already be "robust" — you are not replacing it wholesale, you are **enforcing it universally** and closing every bypass found (Section 4).
- **Icons: `lucide-react-native` only.** No emoji, anywhere, in any label or title string.
- **Animations: Reanimated spring only**, matching the existing `SPRING` config (`damping: 16, stiffness: 160`) already defined in tokens — reuse it, don't invent a second animation config.
- **No native `Alert.alert()` for success/error/confirmation feedback anywhere in the app**, full stop. Every one of the dozens of call sites found in the audit (Login, Attendance, Dashboard "Coming soon"/Logout, JobDetail, NewJob, Billing, MyJobs Logout, TechJobDetail, Overview Sign out, Inventory, SelfieCapture, OnsiteVisitCard, AddMaterialModal) gets routed through the new toast/modal system built in Phase 1 (Section 6). The only acceptable native-alert-like exception is a true OS-level destructive-action confirmation if you judge one is genuinely warranted (e.g. "Delete this account" style irreversible actions) — and even then, prefer the app's own `ConfirmationModal`/`BottomSheet` pattern first.
- **Every screen keeps its safe-area handling** (`useSafeAreaInsets` / `SafeAreaView`) — this was already consistently present per the audit; do not regress it while rewriting layouts.
- **Consolidate every duplicate screen pair flagged in the audit** (Section 5) before starting the individual page rebuilds in Section 9 — this is Phase 1/2 work, done once, so every subsequent page rebuild is working from the consolidated shared component, not re-duplicating the fix.

---

## 4. DESIGN TOKEN ENFORCEMENT (not a redesign — an audit-and-close-every-bypass pass)

Unlike a ground-up token redesign, the existing `tokens.ts` already matches the reference design closely — canvas white, primary purple (`#5B4FE9`), accent blue/green/red/orange, a full status-background token set (`statusReceivedBg`, `statusInProgressBg`, `statusCompletedBg`, `statusWaitingBg`, `statusAssignedBg`, `statusUrgentBg`, `statusHighBg`, `statusNormalBg`), spacing scale, radius scale, shared typography, and the `SPRING` animation config. **Keep this file as the foundation.** Your job in Phase 1 is to:

1. **Fix `utils/invoiceHtml.ts`** — every hardcoded hex (`#666`, `#333`, `#f9f9f9`, `#dcfce7`, `#166534`, `#fee2e2`, `#991b1b`, and any others found) must be replaced by importing the actual values from `tokens.ts` and interpolating them into the HTML template string, rather than duplicating new literals. Since this is a plain HTML string (used for print/PDF generation) and can't consume RN style objects directly, import the token's raw value constants and interpolate them (e.g. `` `color: ${tokens.colors.textSecondary}` `` ), so the printed invoice/receipt visually matches the in-app palette exactly and stays in sync if tokens ever change.
2. **Fix `DashboardScreen.tsx`'s inline hardcoded quick-action tile colors** (`#E0ECFF`, `#3B5BFF`, `#FEE2E2`, and any others in that file or its Technician equivalent). Introduce a small, explicit **quick-action tile color map** — either as a new exported const in `tokens.ts` or a dedicated `constants/quickActionColors.ts` — with named entries (e.g. `blueTile: { bg: tokens.colors.accentBlueDim, fg: tokens.colors.accentBlue }`, `redTile`, `purpleTile`, `orangeTile`, `greenTile`) so every quick-action grid across Receptionist and Technician dashboards pulls from the same named set instead of one-off literals. This is required infrastructure for Section 9.3 and 9.10 below, since both dashboards need 4–6 consistently colored pastel tiles.
3. **Grep the entire codebase for any other raw hex literal, raw numeric spacing/radius, or raw font-size** outside `tokens.ts` and this new quick-action-colors file, and fix every instance found — not just the two the audit already named. The audit's findings are a confirmed minimum, not an exhaustive list; do your own full pass.
4. **Add any new tokens the new screens require** that don't exist yet — for example, notification-category icon-tint colors for the new Notifications screen (Section 9.12), or chart series colors for the new Reports screen (Section 9.13) — and add them to `tokens.ts` in the same style as the existing entries, not as new one-off local constants.

---

## 5. DUPLICATE SCREEN CONSOLIDATION (Phase 1/2 — do this before individual page rebuilds)

The audit found three duplicate/near-duplicate screen pairs. Resolve all three properly — extract shared structure into a reusable component, don't just reskin both copies independently.

### 5.1 Job Detail duplication (`JobDetailScreen.tsx` vs `TechJobDetailScreen.tsx`)

Build a new shared presentational component, `components/job/JobDetailShell.tsx`, that owns: the job info header (Job ID, customer name, status/priority badges), the shared card/section layout, and the shared visual chrome (spacing, radius, typography) used by any job-detail-style screen. It should accept the role-specific *content* (e.g. Receptionist's billing/reassignment actions vs. Technician's materials/notes actions) as children or a render-prop/slot, not as an internal role-check branching the whole component's JSX. `screens/receptionist/JobDetailScreen.tsx` and the two new technician screens from row 9 of the mapping table (`OnsiteVisitScreen.tsx` and `UpdateWorkScreen.tsx`) all consume this shared shell, each supplying only their own role-specific action content.

### 5.2 Job List duplication (`JobListScreen.tsx` vs `MyJobsScreen.tsx`)

Build a new shared component, `components/job/JobList.tsx`, that owns: the status/filter tabs with live counts, the scrollable list, and the `JobCard` rendering (colored priority stripe, two stacked badges, tap-to-navigate). It should accept a Supabase query/filter function, a set of tab definitions (labels + counts + underlying filter), and role-specific header copy ("All Jobs" vs. "My Assigned Jobs") as props — not duplicate the list-rendering logic per role. `screens/receptionist/JobListScreen.tsx` and `screens/technician/MyJobsScreen.tsx` become thin wrappers supplying their respective query/props.

### 5.3 Dashboard duplication (`DashboardScreen.tsx` vs `OverviewScreen.tsss`)

Both already wrap a shared `RoleDashboard` component, which is the right pattern — the audit is flagging this as *worth reviewing for drift*, not necessarily broken. Verify during Phase 1 that both wrapper files delegate 100% of layout/styling to `RoleDashboard` with zero per-file style overrides, and that any visual difference between the Receptionist and Admin dashboards (greeting banner color, quick-actions grid vs. Alerts feed, KPI card set) is expressed as **props/config passed into `RoleDashboard`**, not as copy-pasted JSX forked between the two files. If you find any per-file override drift during the audit-and-verify pass, consolidate it back into `RoleDashboard`'s prop surface.

---

## 6. TOAST / MODAL FEEDBACK SYSTEM (replaces every `Alert.alert()` call)

Build once, in Phase 1, before any page rebuild touches a screen that currently uses `Alert.alert()`:

- A `useToast()` hook or context provider (mounted once at the app root) rendering a small, auto-dismissing (~3–4s) toast at the top or bottom of the screen, with `success` / `error` / `info` variants using the existing accent/status tokens, plus a manual dismiss affordance.
- Reuse the existing `ModalShell.tsx` / `BottomSheet.tsx` components (already present and already Reanimated-compliant per the audit's Common Components section) for anything that needs a blocking confirmation rather than a passive toast — e.g. Logout confirmation, delete confirmations, destructive actions.
- **Every single `Alert.alert()` call site named in the audit must be migrated**: `LoginScreen` (error feedback), `AttendanceScreen` (check-in/out success/error), `DashboardScreen` ("Coming soon", Logout), `JobDetailScreen` (all CRUD feedback), `NewJobScreen` (job creation error), `BillingScreen` (save/print/WhatsApp/email failures), `MyJobsScreen` (Logout), `TechJobDetailScreen`/its two successor screens (all CRUD feedback), `OverviewScreen` (Sign out), `InventoryScreen` (validation/save/delete confirmations), `SelfieCapture`, `OnsiteVisitCard`, `AddMaterialModal`. Grep for `Alert.alert(` project-wide at the end of this phase to confirm zero remaining call sites outside any single deliberate exception you've flagged and justified.

---

## 7. CRITICAL DATA-LAYER FIXES (in scope because they directly cause visibly broken UI/UX)

These three are CRITICAL findings in the audit and are included here because they are the direct cause of stale, non-live UI — which is a UI/UX defect, not a pure backend concern — but they are the *only* backend-adjacent changes this prompt authorizes. Do not use this section as license to touch anything else in the data layer.

1. **`MyJobsScreen.tsx`** — add a Supabase Realtime `postgres_changes` subscription scoped to the technician's own jobs (matching the existing correctly-scoped `.eq('technician_id', user.id)` query already used for the initial fetch), so newly assigned or updated jobs appear live without a manual pull-to-refresh.
2. **`TechJobDetailScreen.tsx`'s two successor screens** (`OnsiteVisitScreen.tsx`, `UpdateWorkScreen.tsx`) — add a `postgres_changes` subscription on the specific job row (and its materials, if materials are stored in a related table) so concurrent edits/reassignments reflect live.
3. **`JobDetailScreen.tsx`** — add the same live subscription on the specific job row, so a technician's concurrent update is reflected immediately on the receptionist's open detail view instead of only after a manual re-fetch.
4. **Image compression** — every screen/component that uploads a captured image to Supabase Storage (`AttendanceScreen`'s selfie capture, `SelfieCapture` component, and any material/job photo capture inside the new `UpdateWorkScreen.tsx`) must run the image through `expo-image-manipulator` (resize + compress) **before** upload. This is currently entirely missing per the audit and is flagged CRITICAL/HIGH — add a small shared utility (e.g. `utils/compressImage.ts`) used by all three call sites rather than inlining the compression logic three separate times.

---

## 8. GLOBAL SHELL REBUILD

- **Bottom Navigation:** the existing dark floating pill-shaped `CustomTabBar`/`AdminTabBar` pattern (via `ReceptionistTabs`, `TechnicianTabs`, `AdminTabs`) is already structurally correct per the reference design and the audit — **keep the pattern**, but verify/extend the tab sets to match the reference exactly:
  - Receptionist: Home, Jobs, *(FAB)*, Customers, More
  - Technician: Home, Jobs, *(FAB)*, Inventory, More
  - Admin: Home, Jobs, Users, Reports, More *(no FAB on Admin's tab bar, per the reference — confirm current `AdminTabBar` doesn't render one, remove it if it does)*
  Re-theme all active/inactive icon and label colors to the correct role accent color (purple / green / blue respectively) using tokens, not per-tab hardcoded colors.
- **Header (`AppHeader.tsx`):** already centralized per the audit — extend it (don't fork a second header component) to support: (a) a working notification bell with a live unread-count badge sourced from the new Notifications data, wired to navigate to the new `NotificationsScreen`, and (b) the Admin role's header variant using a 3-dot overflow icon instead of a bell, matching the reference design's distinction between roles.
- **FAB:** confirm it renders only on Receptionist and Technician tab bars (matching the reference), in each role's accent color, and routes to that role's primary quick action (New Job for Receptionist; confirm with product intent what it should do for Technician — likely a fast entry into "Update Work" for the technician's current active job, since Technicians don't create jobs).

---

## 9. PAGE-BY-PAGE REGENERATION SPEC

### 9.1 Login → Role Selection — `screens/auth/LoginScreen.tsx`

Full replace, not a re-theme of the existing form. New structure:
- White canvas, top-left-aligned "Welcome" (bold, large) + "Please select your role to continue" (gray, small) header block.
- Three vertically stacked, full-width, equal-height role cards, each with a colored icon tile on the left and a title + 2-line description on the right: Receptionist (purple tile, person-with-badge icon, "Manage customers, jobs and billing"), Technician (green tile, person-with-wrench icon, "View assigned jobs and update status"), Admin (blue tile, shield-check icon, "Manage users, jobs, inventory and reports").
- Each entire card is tappable and routes into that role's actual authentication (if per-role login credentials still apply) or directly into that role's tab navigator if a single shared login already authenticated the user and this is purely a role-context switch — **confirm which of these two behaviors is correct for this app before wiring navigation**, since the audit's `LoginScreen.tsx` was a single form, implying real auth happens here; if so, this screen may need to become "select role, then show the matching login form" as a two-step flow rather than instant navigation. Flag your chosen interpretation explicitly in your phase summary.
- Preserve the existing Reanimated entrance animation pattern already present in the current file, adapted to animate the three cards in with a staggered spring entrance instead of whatever it currently animates.
- Keep `useSafeAreaInsets` usage.
- Route all error feedback (auth failures) through the new toast system instead of the current `Alert.alert`.

### 9.2 Attendance — `screens/shared/AttendanceScreen.tsx`

Full visual rebuild, shared file stays shared (used by both Receptionist and Technician):
- Header: back arrow, "Attendance" title.
- Month selector row ("May 2025" + dropdown chevron).
- 7-day horizontal date strip, each day showing abbreviation, date number, and a small colored status dot below; the selected day rendered as a solid purple/accent-filled rounded square with white text, matching the app's established "selected = solid fill" convention.
- Green "Today, {date}" status banner with a right-aligned "Status" label + "Present" (or current status) in bold green.
- Large rectangular selfie/photo preview.
- Two-column Time / Location row below the photo, using GPS coordinates as currently implemented (no change to the underlying capture/geo logic).
- Full-width green "Take Selfie for Attendance" primary button, which now runs the captured image through the new `compressImage.ts` utility before upload (Section 7.4).
- "Attendance History" section header with a "View All →" link, followed by the existing history list, re-themed to current tokens.
- Replace every `Alert.alert` success/error call in this screen and in the `SelfieCapture` component with the new toast system.

### 9.3 Receptionist Dashboard — `screens/receptionist/DashboardScreen.tsx`

Rebuilt as a themed configuration passed into `RoleDashboard` (Section 5.3), not custom JSX in this file:
- Purple gradient greeting banner: "Good Morning, {name}" + "Have a productive day!" + a generic person-silhouette avatar badge (not a real photo, matching the reference).
- 6-tile Quick Actions grid (3×2): New Job (blue tile), Job List (orange tile), Customers (purple tile), Attendance (teal tile), Notifications (red tile), Print Receipt (light-purple tile) — using the new quick-action color map from Section 4.2, each tile routing to its respective screen (Notifications tile routes to the new `NotificationsScreen`).
- "Today's Summary" 2×2 grid: Jobs Received / In Progress / Completed / Urgent (Urgent's value in red), each card with a trailing chevron, sourced from the existing real-time `postgres_changes`-subscribed `jobs` query already correctly implemented per the audit — keep that data-fetching, only rebuild the presentation.
- Purple FAB routing to the New Job wizard (Section 9.6).
- Migrate the "Coming soon" and Logout `Alert.alert` calls to the toast/modal system.

### 9.4 Job Tracking (Receptionist) — `screens/receptionist/JobListScreen.tsx`

Thin wrapper around the new shared `components/job/JobList.tsx` (Section 5.2):
- Header: back arrow, "All Jobs" title, and a 3-icon utility cluster top-right (search, filter, overflow menu).
- Status tabs with live inline counts: All / Received / In Progress / Completed (add "Waiting" as a 5th tab if the underlying status enum includes a waiting-for-materials state, matching the reference's full tab set).
- Job cards: left-edge color stripe by priority, Job ID + customer + issue/device + technician (where assigned), two stacked badges (priority above status), each using the existing `statusXBg`/`accentX` tokens already defined.
- Keep the existing real-time `postgres_changes` subscription on the `jobs` table already correctly implemented here.

### 9.5 Job Detail (Receptionist) — `screens/receptionist/JobDetailScreen.tsx`

Thin wrapper around the new shared `components/job/JobDetailShell.tsx` (Section 5.1), supplying Receptionist-specific action content: reassign technician, print receipt, email invoice, WhatsApp update, navigate to Billing (Section 9.7). No direct reference screenshot exists for this screen — build its visual structure by extending the same card/section language used in Job Assignment (Screen 5) and Job Tracking's card patterns: a job info card (customer/device/issue), a status/priority summary card, and an actions row.
- **Add the Realtime subscription** required by Section 7.3.
- Replace all `Alert.alert` CRUD feedback with the toast system.

### 9.6 Create Job Wizard — split from `screens/receptionist/NewJobScreen.tsx`

Split into two screens forming a single wizard flow (state passed forward via navigation params or a short-lived form context):

**Step 1 — Customer Intake** (new file, e.g. `screens/receptionist/CustomerIntakeScreen.tsx`): Customer Name*, Contact Number* (with phone icon), Device Type* (dropdown, expand beyond the current option set to include Mobile Phone, Tablet, Printer, Smart TV in addition to Laptop/Desktop/Other), Reported Issue*, Remarks (optional, textarea), Job Type segmented control (In-house Job / Onsite Job, solid-purple-fill when selected), Priority segmented control (Normal / High / Urgent, Urgent shown as solid red when selected). Full-width purple "Next" button advancing to Step 2 with all entered data carried forward.

**Step 2 — Job Assignment** (new file, e.g. `screens/receptionist/JobAssignmentScreen.tsx`): auto-generated Job ID (read-only, plain text not an input box), required "Select Technician" dropdown (make this **optional** rather than required, allowing unassigned job creation, per the same UX improvement already applied on the desktop admin panel's equivalent flow), read-only echoed fields for Priority (color-coded text), Job Type, Customer, Device, Issue. Footer: outlined "Print Receipt" button (left) + solid purple "Create Job" button (right), which performs the actual database insert.
- Replace the current `Alert.alert('Error Creating Job', ...)` with the toast system.
- Delete the old single-file `NewJobScreen.tsx` entirely once both new screens are wired into navigation — do not leave it in the codebase as dead code.

### 9.7 Billing (Receptionist) — `screens/receptionist/BillingScreen.tsx`

No reference screenshot exists for this exact mobile screen; rebuild it fully in the established theme (this is the primary worked example for how to handle every other "generate to theme" row in the mapping table):
- Header: back arrow, "Billing" title, Job ID/customer subtext (reusing the same job-info-header pattern from `JobDetailShell`).
- An itemized line-item table (Item/Description, Qty, Amount) auto-populated from the job's materials plus a Labour Charges line — visually matching the card/table style already established (white card, subtle row dividers, right-aligned currency values in ₹).
- A totals block below: Sub Total → Tax → Discount → **Total**, each row right-aligned, Total shown bold and larger.
- An action row: Print, Email, WhatsApp — as outlined icon buttons matching the icon-button style already used elsewhere in the app (e.g. Print Receipt buttons).
- Full-width solid purple "Save Billing" (or equivalent) primary button.
- Replace every `Alert.alert` (save, print, WhatsApp, email failures) with the toast system.

### 9.8 Assigned Jobs (Technician) — `screens/technician/MyJobsScreen.tsx`

Thin wrapper around the same shared `JobList` component as Section 9.4, configured with: header title "My Assigned Jobs", tabs All / In Progress / Completed (technician's tab set differs slightly from the receptionist's — includes an "Assigned" status badge option in the card rendering, not a separate tab), and a query scoped to `.eq('technician_id', user.id)` (already correctly implemented per the audit — preserve it).
- **Add the Realtime subscription** required by Section 7.1.
- Migrate the Logout `Alert.alert` to the toast/modal system.

### 9.9 Onsite Visit + Update Work — split from `screens/technician/TechJobDetailScreen.tsx`

Split into two purpose-built screens, both consuming the shared `JobDetailShell` (Section 5.1) for their common chrome:

**`screens/technician/OnsiteVisitScreen.tsx`** (rendered only when `job.job_type === 'onsite'` and the visit isn't yet fully completed): green header card (Job ID + customer + a close/✕ icon), a "Start Visit" section (green filled-icon "Take selfie at location" instruction, captured selfie preview, GPS coordinates, solid green "Start Visit Selfie" button), a "Complete Visit" section (outlined/unfilled-icon "Take selfie after completing/leaving" instruction, an outlined — not solid — "Take Completion Selfie" button reflecting its pending/locked state), and a bottom "Update Status" button rendered in a muted/darker green to visually communicate it's not yet fully active until the Complete Visit step finishes. Reuses the existing `OnsiteVisitCard` common component — rebuild that component's internals to match this exact spec rather than building new one-off markup in the screen file.
- Every captured selfie here runs through `compressImage.ts` before upload (Section 7.4).

**`screens/technician/UpdateWorkScreen.tsx`** (reached either directly from a job card for in-house jobs, or after completing the Onsite Visit step for onsite jobs): job info header (Job ID + customer), "Materials / Parts Used" section with a "+ Add Item" link (reusing the existing `AddMaterialModal` component, migrated off `Alert.alert`), a table of Item/Qty/Cost rows with an auto-summed Total Cost, a "Work Notes" multi-line textarea, a "Status" dropdown, and a full-width solid green "Update & Notify" primary button.
- **Add the Realtime subscription** required by Section 7.2, on both the job row and its materials.
- If material photos are supported, route them through `compressImage.ts` as well.
- Delete `TechJobDetailScreen.tsx` entirely once both successor screens are built and wired into navigation — including updating whatever navigator config currently points at it.

### 9.10 Admin Dashboard — `screens/admin/OverviewScreen.tsx`

Rebuilt as a themed configuration passed into the same shared `RoleDashboard` used by Receptionist (Section 5.3), with a **structurally different content set**, not just a different color:
- Blue gradient greeting banner: "Welcome, Admin" + "Here's your system overview" + a bar-chart/analytics glyph avatar (not a person icon).
- Header uses a 3-dot overflow menu instead of a bell icon (Section 8).
- **No Quick Actions grid at all** for this role — go straight from the banner to an "Overview" 2×2 KPI grid (Total Jobs, Technicians, Customers, Revenue this month), rendered with **no chevrons** (these are read-only headline metrics, not tap-through cards, per the reference).
- An "Alerts" section below: a vertical list of severity-colored rows (green/orange/red icon + text), sourced from whatever combination of low-stock inventory checks, pending leave requests, and urgent-unstarted-job counts the app already has data for.
- Migrate the Sign out `Alert.alert` to the toast/modal system.
- The audit noted this screen currently "fetches static count on mount" with no realtime — this is acceptable to leave as-is for now since it wasn't flagged CRITICAL in the audit's issue table, but note it as a candidate for a future Realtime pass if the Admin needs live KPI updates; do not silently add scope here without flagging it first.

### 9.11 Inventory Management — `screens/admin/InventoryScreen.tsx`

Full visual rebuild, existing real-time subscription (already correctly implemented per the audit) stays untouched:
- Header: back arrow, "Inventory" title.
- Search bar ("Search items" placeholder, magnifying-glass icon inline).
- Tabs with live counts: All / Low Stock / Out of Stock.
- Simple list rows: category-specific icon (distinct per item type, not one generic icon repeated) + item name + right-aligned stock count, with the count rendered in red-bold specifically when that item is below its low-stock threshold (data-driven, not a static style).
- Corner-anchored (not nav-integrated) solid blue circular FAB, bottom-right, for Add Item.
- Migrate validation/save/delete `Alert.alert` calls to the toast/modal system — delete confirmations specifically should use the `ConfirmationModal`/`BottomSheet` pattern, not a passive toast, since deletion is destructive.
- **Confirm whether Technician's "Inventory" quick-action tile (Section 9.3's Technician equivalent) routes to this exact same screen with reduced/read-only permissions, or a separate view** — the audit filed this screen only under `screens/admin/`, but the reference design gives Technicians their own Inventory quick action too. Flag which is correct rather than assuming.

### 9.12 Notifications — *(new)* `screens/shared/NotificationsScreen.tsx`

Build from scratch, shared across all three roles (content scoped per-user via query):
- Title "Notifications", centered.
- Filter tabs with live counts: All / Unread / Important.
- Notification rows: a colored icon (category-based — blue bell for system, purple bell for staff/internal updates, green WhatsApp-style icon for customer comms, purple clock/parts icon for inventory/materials updates), 1–2 line description text, right-aligned relative timestamp.
- Footer: centered "Mark all as read" link/action.
- Wire this to real data — if no notifications table exists in Supabase yet, **stop and flag this explicitly** rather than inventing schema; this determines whether the Header's unread-count badge (Section 8) is real or must stay a stubbed placeholder for now.
- This screen is also the destination for the Header's notification bell (Receptionist/Technician) tap action.

### 9.13 Reports & Analytics — *(new)* `screens/admin/ReportsScreen.tsx`

Build from scratch:
- Header: back arrow, "Reports" title.
- Date-range control: a pill showing the current range (e.g. "01 May – 14 May 2025") with a chevron, plus a separate calendar icon button opening a full date picker.
- "Jobs Overview" grouped bar chart: Received / In Progress / Completed series across date buckets, with a legend. **Use the app's existing green-for-Completed convention** for this chart's legend and bars — do not introduce a red/orange "Completed" color even if an earlier static reference mockup showed it that way, since that would contradict the Completed=green convention used everywhere else in this app (Job Tracking badges, Assigned Jobs badges, Inventory In Stock, etc.). This is a deliberate correction versus the raw reference image, flagged here explicitly so you don't propagate that inconsistency.
- "Top Technicians" ranked leaderboard: rank badge (small colored circle) + name + jobs completed + revenue, per row, with a "View More →" link at the bottom.
- Route this screen from the Admin tab bar's "Reports" tab (Section 8).

### 9.14 Admin Users / Staff Management

Per row 14 of the mapping table: first confirm whether this screen exists anywhere in the current codebase outside the audited 13 screens. If it exists, rebuild its presentation to match the established theme (list/table pattern matching Inventory's row style, role/status badges matching the `Badge` component conventions already in use, action icons for approve/block matching the color-coded destructive/neutral hover-equivalent tap states already established elsewhere). If it does not exist, build it fresh, reusing the same staff/user Supabase query and RLS rules the desktop admin panel's Staff Management page already relies on if that table is shared between web and mobile — **flag this dependency explicitly rather than assuming the query layer transfers cleanly.**

---

## 10. EXECUTION PHASES (gated — stop after each and wait for approval)

1. **Phase 1 — Foundations:** token enforcement and bypass cleanup (Section 4), the new quick-action color map, the toast/modal feedback system (Section 6), the `compressImage.ts` utility (Section 7.4). No screen rebuilds yet.
2. **Phase 2 — Duplicate consolidation:** build `JobDetailShell.tsx` and `JobList.tsx` (Section 5), and verify the `RoleDashboard` drift check (Section 5.3). No individual page visual rebuilds yet — this phase produces the shared components the page phases will consume.
3. **Phase 3 — Global shell:** bottom nav tab-set verification/extension, `AppHeader` notification bell + overflow-menu variants (Section 8).
4. **Phase 4 — Entry & Receptionist core:** Login/Role Selection (9.1), Receptionist Dashboard (9.3), Job Tracking (9.4), Job Detail (9.5).
5. **Phase 5 — Receptionist remaining + shared Attendance:** Create Job wizard split (9.6), Billing (9.7), Attendance (9.2).
6. **Phase 6 — Technician:** Assigned Jobs (9.8), Onsite Visit + Update Work split (9.9), including the Realtime and image-compression fixes for these specific screens.
7. **Phase 7 — Admin:** Admin Dashboard (9.10), Inventory (9.11), Users/Staff (9.14).
8. **Phase 8 — New functionality:** Notifications (9.12), Reports (9.13).
9. **Phase 9 — Final sweep and QA:**
   - Grep the entire codebase for `Alert.alert(` — must return zero results outside any explicitly flagged/justified exception.
   - Grep for raw hex literals and raw numeric spacing/radius/font-size outside `tokens.ts` and the quick-action-colors file — must return zero results.
   - Grep for emoji characters in any `.tsx` source file — must return zero results.
   - Grep for `useColorScheme` — must return zero results.
   - Confirm `NewJobScreen.tsx` and `TechJobDetailScreen.tsx` no longer exist anywhere in the codebase or navigation config.
   - Confirm every screen listed in Section 2's mapping table has an active, correctly-wired navigation route — no orphaned old routes left pointing at deleted files.
   - Produce a final summary mapping every audit issue ID (M-1 through M-8) to "Fixed" / "Flagged — needs confirmation" / "Deliberately deferred, see note," matching the same closing format used for the web admin panel's redesign.

---

## 11. ACCEPTANCE CRITERIA / DEFINITION OF DONE

- Every screen in Section 2's mapping table is either fully rebuilt, fully split, or newly built — no screen is left in its pre-audit visual state.
- Zero `Alert.alert()` calls remain for success/error/confirmation feedback anywhere in the app.
- Zero hardcoded hex colors, spacing values, or font sizes remain outside `tokens.ts` and its companion quick-action-colors file.
- All three duplicate screen pairs from the audit are resolved via genuine shared-component consolidation, not parallel reskinning.
- All three CRITICAL Realtime gaps (M-1, M-2, M-3) and the image-compression gap (M-4) are fixed.
- Notifications and Reports exist as real, navigable, data-wired screens (or are explicitly flagged as data-stubbed pending a confirmed backend dependency).
- No new Supabase schema was created without being explicitly flagged and confirmed first.
- The Phase 9 grep sweep and audit-issue-mapping summary are included in the final response.

*End of master prompt.*
