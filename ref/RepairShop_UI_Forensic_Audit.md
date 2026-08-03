# RepairShop — Forensic UI/UX Reverse-Engineering Documentation
### Reference: 16-screen mockup set (Role Selection → Customer WhatsApp Update)
### Prepared for: AI coding agent implementation (React Native / Expo + TypeScript, Next.js/Tailwind admin web)

> Methodology note: measurements below are **estimated from a compressed reference mockup**, not a live device inspection. Anywhere a pixel value is given, treat it as a starting point to be tuned against Figma/real device testing, not a locked spec. Where something genuinely cannot be read off the image (e.g. exact hex values, font family name, real touch-target padding), this is flagged explicitly rather than invented.

---

## 0. GLOBAL DESIGN SYSTEM (applies to all 16 screens)

This app already has an established design language per prior work: **pure white canvas (#FFFFFF), no dark mode, pastel job-status cards, dark floating pill-shaped bottom nav.** This audit confirms and formalizes that system from the mockups.

### 0.1 Color Palette (estimated)

| Token | Hex (estimated) | Usage | Confidence |
|---|---|---|---|
| `background.canvas` | `#FFFFFF` | Page background, all screens | High |
| `surface.card` | `#FFFFFF` | Card backgrounds | High |
| `border.subtle` | `#F1F1F4` / `#ECECEF` | Card borders, dividers | Medium |
| `primary.violet` | `#5B4FE9` (range `#5B4FE9`–`#6C5CE7`) | Primary CTAs (Next, Create Job, Update & Notify pill on some, Technician role icon, active state, "Urgent" priority chip selected) | Medium |
| `accent.blue` | `#3B5BFF`–`#4C6EF5` | Admin welcome banner, "In Progress" chips, active bottom-nav icon halo | Medium |
| `accent.green` | `#2E9E52`–`#34A853` | Success CTAs — "Take Selfie for Attendance", "Start Visit Selfie", "Update Status", "Send via WhatsApp"; also "Completed"/"Normal" status | Medium |
| `accent.red` | `#E5484D`–`#FF3B30` | Urgent priority badge/chip, low-stock/critical alerts | High |
| `accent.orange` | `#F5A524`–`#FF9500` | High priority badge, warning alerts | High |
| `accent.gray` | `#9CA3AF` | "Waiting for Materials" / neutral chip, placeholder text | Medium |
| `text.primary` | `#111827`–`#1A1A1A` | Headings, primary labels | High |
| `text.secondary` | `#6B7280`–`#8A8A8E` | Subtext, timestamps, helper text | High |
| `text.inverse` | `#FFFFFF` | Text on dark nav / colored banners | High |
| `nav.pillBackground` | `#1C1C1E`–`#222225` (near-black) | Floating bottom nav pill | High |
| `nav.activeIcon` | `#3B5BFF` (blue circle highlight) | Active tab indicator | Medium |
| `pastel.lavender` | `#EDE9FE`/`#E6E1FB` | Quick-action tile bg (New Job icon) | Medium |
| `pastel.peach` | `#FFEDD5`/`#FFE9D6` | Quick-action tile bg (Job List / Notifications icon) | Medium |
| `pastel.mint` | `#DCFCE7`/`#D9F5E3` | Quick-action tile bg (Attendance / stat "Completed" card) | Medium |
| `pastel.sky` | `#E0ECFF`/`#DCEBFF` | Stat card bg (In Progress) | Medium |
| `pastel.rose` | `#FEE2E2`/`#FBDCDC` | Stat card bg (Urgent) | Medium |

**Cannot be determined from the provided image:** exact hex values (screenshot is a rendered mock, not a color-picked source), any brand-specific color variable names already in the Nilakshith design system.

### 0.2 Typography

- **Estimated font family:** a geometric/humanist sans — visually consistent with **Inter**, **SF Pro**, or **Poppins** (rounded terminals, tall x-height). Cannot confirm exact family from image; recommend **Inter** as the safe Expo-friendly default (already common in this project's stack per prior sessions) or confirm with design lead.
- **Scale (estimated):**
  | Style | Size | Weight | Usage |
  |---|---|---|---|
  | Screen title (H1) | 20–22px | 600–700 | "Welcome", "Attendance", "Notifications" |
  | Section header | 15–16px | 600 | "Quick Actions", "Today's Summary" |
  | Card title | 14–15px | 600 | Job ID, customer name |
  | Body | 13–14px | 400–500 | descriptions, field values |
  | Caption/meta | 11–12px | 400–500 | timestamps, helper text |
  | Stat number (large) | 22–26px | 700 | "12", "8", "5", "2,45,000" |
  | Button label | 14–15px | 600 | all CTA buttons |
- Letter spacing: default/tight (no visible tracking increases). Line height: standard ~1.3–1.4×.

### 0.3 Spacing Scale
Estimated 4-pt/8-pt hybrid grid: **4, 8, 12, 16, 20, 24, 32**. Screen horizontal margin is consistently ~16–20px. Card internal padding ~14–16px. Vertical rhythm between stacked cards ~10–12px.

### 0.4 Radius System
| Token | Value (est.) | Usage |
|---|---|---|
| `radius.sm` | 8px | input fields, chips |
| `radius.md` | 12–14px | cards |
| `radius.lg` | 16–18px | large hero cards (welcome banners, photo cards) |
| `radius.pill` | 999px | bottom nav pill, FAB, status chips, priority buttons |

### 0.5 Shadow / Elevation
- Cards: soft, low-opacity drop shadow, short blur radius — reads as `elevation 2–3` on Android / `shadowOpacity 0.06, shadowRadius 6` on iOS.
- Bottom nav pill: stronger shadow (elevation 8–10) since it floats above content.
- FAB: elevation 6–8, circular, consistently violet/blue fill with white "+" icon.
No visible gradients except the Admin welcome banner (subtle blue gradient) and possibly the role-selection icon tiles (flat, not gradient — **cannot fully confirm gradient vs flat fill from compression artifacts**).

### 0.6 Iconography
- Style: **outlined/rounded stroke icons**, consistent stroke width (~1.5–2px), rounded line caps — strongly consistent with **lucide-react-native** (already confirmed in use per project history).
- Sizes: nav icons ~22–24px, quick-action icons ~20px inside 44px tiles, inline meta icons (location pin, clock) ~14px.

### 0.7 Bottom Navigation (shared across role-scoped screens: Receptionist, Technician; Admin uses a different set)
- Floating pill, dark background, horizontally centered, ~64–70% of screen width, fixed to bottom with safe-area inset.
- 4 icon tabs + 1 raised center FAB ("+") that overlaps the pill (breaks out of top edge), OR FAB is separate and floats just above the pill (ambiguous at this resolution — **treat as elevated FAB positioned above/overlapping nav, confirm exact overlap in Figma**).
- Active tab: circular blue highlight behind the icon.
- Labels below icons in small caption text (Home, Jobs, Customers/Inventory, More).
- Consistent across Receptionist and Technician role home screens; Admin dashboard uses a 5-icon flat bar (Home, Jobs, Users, Reports, More) without the raised FAB — **implementation note: Admin is the web/app hybrid surface per screen title "ADMIN DASHBOARD (WEB/APP)", so likely renders as a sidebar on desktop web and this bottom bar on mobile.**

### 0.8 Status/Priority Chip System (used everywhere: job cards, notifications, badges)
| Label | Color | Usage |
|---|---|---|
| Urgent | Red fill/text | Priority + job list badge |
| High | Orange fill/text | Priority + job list badge |
| Normal | Gray/neutral outline | Priority |
| Received | Blue/light chip | Job status |
| In Progress | Blue/indigo chip | Job status |
| Completed | Green chip | Job status |
| Assigned | Gray chip | Job status |
| Waiting for Materials | Amber/gray chip | Job status |

Job cards additionally use a **colored left-edge accent bar** (4px) matching the priority color — this is the fastest-scanning visual cue in the list screens (screens 6, 9).

---

## 1. Screen-by-Screen Audit

Each entry below covers: Purpose · Layout · Key Components · Colors/Typography specific to the screen · Interactions · RN Implementation Notes · States · Accessibility · Confidence flags. Global tokens above are not repeated per screen except where a screen deviates.

---

### Screen 1 — Role Selection (Login)
**Purpose:** Entry point; user selects their operating role before any auth-scoped UI loads. Likely gates which stack/navigator mounts next.
**Layout:** Single column, generous top whitespace, greeting title + subtitle, then 3 stacked selectable role cards.
**Components:**
- `H1 "Welcome"` + subtitle "Please select your role to continue" (secondary gray text).
- 3× **Role Card**: full-width, white surface, `radius.md`, subtle border, left-aligned icon tile (colored pastel square, `radius.sm`, ~44×44px) + title (Receptionist/Technician/Admin, 15–16px semibold) + description line (12–13px gray). Icon tiles are color-coded: lavender (Receptionist), mint/green (Technician), sky blue (Admin) — reinforcing a per-role color identity that should be reused elsewhere (it already appears in the Admin welcome banner being blue, and Technician's green accent CTA buttons on screens 8–11).
**Interactions:** Tap anywhere on card → navigate to that role's home/dashboard. No visible selection/radio state — likely direct-navigate cards, not a form with a "Continue" button (no such button visible).
**RN mapping:** `SafeAreaView` → `View` (title block) → `Pressable` × 3 (role cards) mapped to `TouchableOpacity`/`Pressable` with `onPress` navigating via React Navigation to role-specific stack.
**States:** No loading/empty/error state applicable — this is a static selector. Consider a brief press-scale animation (Reanimated `withSpring` scale to 0.98) for tactile feedback, consistent with "spring-based animations" already established in this app.
**Accessibility:** Each role card needs `accessibilityRole="button"` and a label like "Receptionist. Manage customers, jobs and billing." Touch target height looks ~72–80px — comfortably above the 44px minimum.
**Confidence:** Layout/copy — High. Exact icon tile hex — Medium (estimated from pastel family above).

---

### Screen 2 — Receptionist Dashboard
**Purpose:** Role home screen; daily overview + shortcuts.
**Layout:** Header → colored greeting banner → Quick Actions grid (4-up) → "Today's Summary" 2×2 stat grid → floating bottom nav.
**Components:**
- **Top bar:** left-aligned "Receptionist" title, right-aligned bell/notification icon (no badge dot visible, or too small to confirm — flag as **needs unread-badge treatment**).
- **Greeting banner:** full-width violet/indigo rounded card, white text "Good Morning, Anjali" (semibold) + "Have a productive day!" (regular, slightly lower opacity), circular avatar/user icon on the right in a translucent white circle.
- **Quick Actions:** section label + 4 equal-width tiles (New Job, Job List, Customers — top row implied 3, plus Attendance, Notifications, Print Receipt as a second row of 3 based on the 6 icons visible) — each tile: pastel square icon container (~44px, `radius.sm`) + caption label below (11–12px, centered).
- **Today's Summary:** 2×2 grid of stat cards: "Jobs Received: 12", "In Progress: 8", "Completed: 5", "Urgent: 2" — each card white surface with border, label (gray, small) + large bold number + chevron affordance ("›") suggesting tap-through to filtered list.
- **Bottom nav:** Home (active/blue), Jobs, [FAB +], Customers, More.
**Interactions:** Tap stat card → navigate to Jobs list pre-filtered by that status. Tap quick-action tile → navigate to respective flow. Tap FAB → New Job flow (likely same as "New Job" quick action, a shortcut duplication — intentional for fast access).
**RN mapping:** `ScrollView` (in case content overflows on small devices) containing `View` sections; stat grid as `FlatList` (numColumns=2) or plain `View` with flex-wrap since only 4 static items — flex-wrap is simpler and avoids FlatList overhead for a fixed small set.
**States:** Empty state needed if `Jobs Received === 0` etc. — show "0" not blank (already implied by numeric design). Loading: skeleton shimmer on stat numbers while fetching from Supabase.
**Accessibility:** Greeting banner text contrast (white on violet) — verify ≥4.5:1; likely fine given violet is dark enough. Stat cards should announce as buttons with full label e.g. "Jobs Received, 12, view list."
**Confidence:** High for structure; Medium for whether Quick Actions is 3+3 vs single row of 6 (image shows what reads as 2 rows of 3 icons based on visual grouping).

---

### Screen 3 — Attendance (Receptionist)
**Purpose:** Daily attendance check-in via selfie + location, plus calendar history.
**Layout:** Back-button header → month selector → horizontal week/day strip (Mon–Sun) → "Today" status card → large selfie/photo preview → time + location metadata → primary CTA → "Attendance History" link → bottom nav.
**Components:**
- **Header:** back chevron + "Attendance" title, centered or left-aligned.
- **Month selector:** "May 2025" with dropdown chevron.
- **Day strip:** 7 day-cells (abbreviated weekday + date number), current/selected day (Wed 14) highlighted with a filled violet circle; today also separately confirmed by the "Today, 14 May 2025 — Present" green-bordered/green-tinted status strip beneath it with a "Status: Present" label in top-right of that strip.
- **Photo card:** large rounded-rect image (captured selfie), roughly 1:1 to 4:3 aspect, centered, `radius.md`, subtle border/shadow.
- **Metadata row:** two columns — "Time 09:15 AM" (clock icon) and "Location 12.9716°N, 77.5946°E" (pin icon), gray caption text.
- **Primary CTA:** full-width green button "Take Selfie for Attendance" — implies camera launch.
- **History link:** "Attendance History" label + "View All ›" right-aligned, violet link-style text.
**Interactions:** Tap day cell → view that day's attendance record. Tap CTA → open camera (Expo Camera / ImagePicker) → capture → geotag via `expo-location` → upload.
**RN mapping:** Day strip as horizontal `FlatList` or fixed 7-`View` row (fixed set, no need for FlatList). Photo via `expo-image` component. Location via `expo-location` `getCurrentPositionAsync`. Camera capture via `expo-camera` or `expo-image-picker` with camera source, then the app's established **image compression step before Supabase Storage upload** (already implemented pattern per project history) must run before this photo is persisted.
**States:** If no selfie taken yet today, CTA should be prominent/primary (as shown); once taken, this screen likely shows the captured photo + a disabled/secondary "Attendance marked" state — **not shown in this mock, needs a second variant designed.**
**Accessibility:** Ensure the day-strip's current-day circle isn't the *only* signal of "today" (color alone) — the mock already reinforces this with the text label "Today, 14 May 2025," which is good practice; keep it.
**Confidence:** High on structure; Medium on whether the week strip scrolls to show a full month or is a fixed 7-day view.

---

### Screen 4 — Customer Intake Form
**Purpose:** Receptionist creates a new job/customer record.
**Layout:** Back header → form fields (label above input) → segmented Job Type toggle → Priority segmented control (3 options) → sticky/full-width primary CTA.
**Components:**
- Header: back chevron + "New Job / Customer Intake."
- **Text inputs** (Customer Name*, Contact Number* with phone icon trailing, Reported Issue*, Remarks (optional)): white bg, thin gray border, `radius.sm`, label above in small gray bold-ish text with red asterisk for required.
- **Dropdown** (Device Type*): same input style + chevron-down icon, currently showing "Laptop."
- **Segmented control (Job Type):** two pill/rounded-rect buttons "In-house Job" (selected, filled violet) vs "Onsite Job" (unselected, outlined/gray) — single-select toggle group.
- **Priority segmented control:** 3 buttons "Normal / High / Urgent" — Urgent shown selected/filled red, others outlined — same single-select pattern, but note the *selected color changes based on which option* (red for Urgent, presumably orange for High, gray/violet for Normal) rather than one fixed "selected" color — **important implementation detail: this isn't a generic segmented control, each option carries its own semantic color when active.**
- **Primary CTA:** full-width violet "Next" button — this is a multi-step form (implies a step 2 not captured in this screenshot set).
**Interactions:** Standard form fill → validation on required fields → Next.
**RN mapping:** `KeyboardAvoidingView` wrapping a `ScrollView` of `TextInput`s; dropdown via a bottom-sheet or native picker (`@react-native-picker/picker` or custom modal); segmented controls as custom `Pressable` groups (not native `SegmentedControl` since colors vary per option).
**States:** Field-level error state not shown — needs a red border + helper text pattern for validation (e.g., invalid phone number). Multi-step progress indicator ("Step 1 of 2") is not visible but recommended given "Next" implies more steps.
**Accessibility:** Required fields marked only with a red asterisk — should also carry `accessibilityLabel` including "required" for screen readers, not rely on the asterisk glyph alone.
**Confidence:** High on fields/layout; **cannot determine from image** what step 2 of this form contains.

---

### Screen 5 — Job Assignment
**Purpose:** Assign a newly created job to a technician.
**Layout:** Back header "Assign Job" → read-only Job ID → Select Technician dropdown → Priority segmented control (pre-filled from intake) → read-only summary fields (Job Type, Customer, Device, Issue) → dual footer buttons.
**Components:** Same input/dropdown styling as Screen 4. Read-only fields appear visually identical to editable ones in this mock — **flag: no visual distinction between editable and read-only fields is a potential UX gap**, since Job ID/Customer/Device/Issue here are likely non-editable carry-over data from intake. Recommend muting read-only fields (gray bg, no border) to disambiguate from the technician-select field which is the actual actionable input.
**Footer:** two buttons side by side — "🖶 Print Receipt" (outlined/secondary, violet text/icon) and "Create Job" (filled primary violet) — a dual-action footer pattern that recurs conceptually elsewhere (e.g., Bill Generation footer).
**Interactions:** Select technician from dropdown (likely searchable list given many technicians per Admin's "12 technicians" stat) → tap "Create Job" to finalize, or "Print Receipt" to generate a physical/PDF receipt via the app's Bluetooth thermal printing integration (per project history).
**RN mapping:** Same form patterns as Screen 4. Dual footer buttons as a `View` with `flexDirection: 'row'`, `gap: 12`, each button `flex: 1` except perhaps Print being icon+text narrower and Create Job wider — image suggests roughly 40/60 width split.
**States:** Disable "Create Job" until technician is selected. Loading spinner on button during Supabase write.
**Accessibility:** Ensure disabled state of "Create Job" has sufficient contrast reduction (not just opacity 1 gray-on-gray) so it's clearly non-interactive but still readable.
**Confidence:** High on structure; Medium on read-only vs. editable field distinction (inferred from context, not visually differentiated in the mock).

---

### Screen 6 — Job Tracking (Receptionist) / "All Jobs"
**Purpose:** Master job list with filters, for receptionist oversight.
**Layout:** Header with title + search icon + filter icon + overflow menu → horizontal status tab bar (All 25 / Received 6 / In Progress 9 / Completed 7) → vertical scrollable job card list → bottom nav.
**Components:**
- **Tab bar:** underline-indicator style (active tab "All" has a violet underline/bold text), counts shown inline in parentheses-less format directly after label.
- **Job Card** (repeats — this is the most important reusable component in the whole app): left 4px colored accent bar (matches priority) → Job ID (bold, small, top-left) + priority badge chip (top-right, colored per Section 0.8) → customer name (semibold, larger) → issue/description (gray, one line, truncated) → assigned technician name (small, gray, bottom) → status chip (bottom-right, e.g. "In Progress," "Received," "Completed," "Waiting for Materials").
**Interactions:** Tap card → Job Detail screen (not in this screenshot set — **missing screen, flag for the agent to design/confirm**). Tap search icon → inline search bar or navigate to search screen. Tap filter icon → bottom sheet with filter options (technician, date range, priority).
**RN mapping:** `FlatList` (virtualized — this list can grow to hundreds of jobs per Admin's "128 total jobs" stat, so **FlatList with `windowSize`/`getItemLayout` tuning is mandatory here**, not a plain ScrollView+map). Card component as a memoized `JobCard` (`React.memo`) to avoid re-render cost across a long list — ties into the project's existing Realtime subscription work, since job status can change live and the whole list shouldn't re-render on every socket event, only the affected row.
**States:** Empty state ("No jobs match this filter" + illustration) not shown — needed. Loading: skeleton cards (3–4 gray placeholder cards) while fetching. Pull-to-refresh recommended given Realtime + manual refresh expectation.
**Accessibility:** Color-only priority signaling (the left bar + chip color) should always be paired with the text label ("Urgent," "High") as already done here — good, keep this pairing, don't let a future redesign drop the text label in favor of color alone.
**Confidence:** High.

---

### Screen 7 — Notifications
**Purpose:** Central activity/notification feed.
**Layout:** Header "Notifications" → tab row (All / Unread 3 / Important) → vertical list of notification rows → "Mark all as read" footer link.
**Components:**
- **Notification row:** leading circular icon (colored per notification type — blue bell for new job, green check for status update, orange/peach for customer update, gray for parts-added, gray for completed) + two-line text (bold first line: what happened + job ID; gray second/inline line: relative timestamp, e.g. "Just now," "10 min ago," "1 hr ago," "2 hr ago," "3 hr ago") + likely a small unread-dot indicator on the left edge for unread ones (not fully confirmable at this resolution — **flag: verify unread visual treatment, e.g. bold text or dot, in Figma**).
**Interactions:** Tap row → deep-link to the referenced job/entity. Tap "Mark all as read" → bulk update, clears unread badge/count in tab bar and bottom-nav bell icon.
**RN mapping:** `FlatList` with `SectionList` alternative if notifications need date-grouping (e.g. "Today," "Yesterday") later — not shown in this mock but common for this pattern; keep as `FlatList` for now, don't over-engineer.
**States:** Empty ("No notifications yet"). This screen is also a strong candidate for the **Realtime subscription gaps** the project has been fixing — new notifications should push into this list live via Supabase Realtime, not require manual refresh.
**Accessibility:** Icon-only type indicators need `accessibilityLabel` (e.g., "New job notification") since color/icon alone doesn't convey type to screen reader users.
**Confidence:** High on structure; Medium on unread visual treatment.

---

### Screen 8 — Technician Dashboard
**Purpose:** Role home for Technician — mirrors Receptionist Dashboard pattern for consistency.
**Layout:** Identical structural pattern to Screen 2 (Receptionist Dashboard), with a **green** greeting banner instead of violet, and stats labeled "Assigned / In Progress / Completed / Urgent" instead of "Received / In Progress / Completed / Urgent."
**Components:** Greeting banner now green-toned ("Good Morning, Rahul — You have 5 assigned jobs"), with a circular **photo avatar** (real headshot) instead of the generic icon avatar used in the Receptionist version — **implementation note: Technician dashboard should pull actual profile photo from Supabase Storage; Receptionist version may use the same but the mock happens to show a placeholder icon there.** Quick actions: My Jobs, Attendance, Notifications, Inventory (Inventory replaces "Print Receipt" — role-appropriate swap, confirming this dashboard pattern is a shared component with role-conditional quick-action arrays, not two hand-built screens).
**RN mapping:** Strongly recommend building **one shared `RoleDashboard` component** parameterized by: banner color, greeting text, quick-action list, stat labels/values, and bottom-nav config — rather than duplicating this screen per role. This single decision will cut implementation time significantly and is the single highest-leverage refactor opportunity in this whole set.
**Confidence:** High — the structural identity between Screens 2 and 8 is unmistakable.

---

### Screen 9 — Assigned Jobs (Technician)
**Purpose:** Technician's personal job list (their equivalent of Screen 6, but pre-scoped to "my jobs").
**Layout:** Header "My Jobs" → tab row (All 5 / In Progress 3 / Completed 2) → job card list (same `JobCard` component as Screen 6) → bottom nav.
**Components:** Identical `JobCard` component reused. This confirms the JobCard should be built once and shared between the Receptionist's "All Jobs" and Technician's "My Jobs" — differing only in the query/filter, not the visual component.
**Interactions:** Tap card → navigate to Onsite Job Visit (Screen 10) or Update Job (Screen 11) depending on current status.
**Confidence:** High — near-identical to Screen 6, reinforcing the shared-component recommendation.

---

### Screen 10 — Onsite Job Visit (Technician)
**Purpose:** Check-in/check-out flow for an onsite (at customer location) repair visit, with selfie verification at both start and completion — mirrors the Attendance selfie pattern (Screen 3) but scoped to a job visit rather than daily attendance.
**Layout:** Header: green pill "JOB-250514-0006 Sneha Patel" with a close "✕" icon (this reads as a persistent context chip, not a nav title — i.e. it stays visible/sticky as you scroll so the technician always knows which job this visit belongs to) → "Start Visit" section with photo preview + location metadata + green "Start Visit Selfie" button → "Complete Visit" section with a secondary "Take selfie after completing/leaving" prompt + gray/outlined "Take Completion Selfie" button → bottom sticky primary "Update Status" button.
**Components:** Reuses the same photo-card + metadata-row pattern from Screen 3 (Attendance) — again, strong case for a shared `SelfieCapture` component (photo preview, location fetch, timestamp, single CTA) parameterized by context (attendance vs. job-visit-start vs. job-visit-complete).
**Interactions:** Two sequential selfie captures gate the visible primary action — likely "Update Status" is disabled/grayed until at least the Start selfie exists, and job can't move to "Completed" until the Completion selfie exists too.
**RN mapping:** State machine for visit progress: `not_started → in_progress (start selfie done) → completed (completion selfie done)`. Both selfies go through the same compression pipeline before Supabase Storage upload as established elsewhere.
**States:** Needs a variant showing "Completion Selfie ✓ taken" confirmation state — not shown in mock.
**Accessibility:** The green context-chip with "✕" needs a clear accessible action label — "Close job visit, JOB-250514-0006" — since "✕" alone is ambiguous (close the visit? cancel? dismiss the chip?).
**Confidence:** High on layout; Medium on exact gating logic between the two selfie steps (inferred from UX convention, not explicit in mock).

---

### Screen 11 — Update Job (Technician)
**Purpose:** Log parts used, cost, work notes, and update status for an in-progress job.
**Layout:** Header (Job ID pill, sticky) → "Materials / Parts Used" section with an "+ Add Item" action and a small line-item table (Qty/Cost columns) → computed "Total Cost" row → "Work Notes" multiline text area → "Status" dropdown → sticky primary "Update & Notify" button.
**Components:**
- **Line-item table:** 3 columns (Item name, Qty, Cost), right-aligned numeric columns, each row deletable presumably via swipe or an edit icon (not visible — **flag: no visible per-row edit/delete affordance in the mock; needs to be designed**).
- **Total Cost row:** bold, separated by a divider from the line items — this is a live-computed sum.
- **Work Notes:** plain multiline `TextInput`, placeholder-free (pre-filled with sample text in the mock), no visible character counter.
- **Status dropdown:** shows "In Progress" currently selected — this is the field that, combined with the button label "Update & Notify," implies **changing status here also triggers the customer WhatsApp notification flow** (Screen 16), i.e. this action is the trigger point for that downstream automation.
**Interactions:** "+ Add Item" opens an inline row or modal for item name/qty/cost entry. Changing Status + tapping "Update & Notify" writes to Supabase and fires notification (push + possibly WhatsApp per project's existing integrations).
**RN mapping:** Parts list as local component state (array) synced to a `job_parts` table on submit, not on every keystroke. Status dropdown reuses the same dropdown component as Screens 4/5.
**Accessibility:** Numeric inputs for Qty/Cost need `keyboardType="numeric"`.
**Confidence:** High on structure; Medium on the implicit "Update & Notify → triggers WhatsApp" link (reasonable inference from button copy + adjacent Screen 16, not explicitly wired in the mock).

---

### Screen 12 — Admin Dashboard (Web/App)
**Purpose:** Executive/ops overview for the Admin role — the only screen explicitly labeled as a hybrid web/app surface.
**Layout:** Header "Admin" + overflow menu (⋮, likely settings/logout) → blue gradient welcome banner ("Welcome, Admin — Here's your system overview") → "Overview" 2×2 stat grid (Total Jobs 128, Technicians 12, Customers 532, Revenue (May) ₹2,45,000) → "Alerts" list (3 rows, each with a colored severity icon: red "Low stock," orange "leave requests pending," orange "urgent jobs not started") → bottom nav (5 flat icons: Home, Jobs, Users, Reports, More — no raised FAB here, unlike Receptionist/Technician).
**Components:** Stat cards visually similar to Screen 2's but without the chevron/tap affordance shown as prominently — still likely tappable through to detail views (Jobs list, Technician roster, Customer list, Revenue/Reports).
**Interactions:** Tap alert row → navigate to the relevant filtered list (e.g., tap "Low stock: SSD 256GB (5 left)" → Inventory screen filtered to low-stock items).
**RN/Web mapping:** Given "(WEB/APP)" in the title, this is the one screen that must be built responsively for the **Next.js/Tailwind admin web surface** as well as mobile — recommend a shared design-token layer (colors/spacing/radius as Tailwind config values mirroring the RN theme file) so this screen's Tailwind implementation and the RN implementation stay visually identical, per the project's dual-surface architecture.
**States:** Real-time alert count should update via Supabase Realtime as new low-stock/leave/urgent-job events occur — same Realtime gap-fixing pattern applies here.
**Accessibility:** Alert severity again color-coded (red/orange) but paired with icon + text — good, consistent with the rest of the app's approach to not rely on color alone.
**Confidence:** High on structure; **cannot determine from image** the exact web breakpoint/grid behavior since only a mobile-width rendering is shown.

---

### Screen 13 — Inventory Management
**Purpose:** Stock list for repair parts/consumables.
**Layout:** Back header "Inventory" → search bar → filter tab row (All 5 / Low Stock 3 / Out of Stock 1) → vertical list of inventory rows → floating "+" FAB (add new item).
**Components:** Each row: leading small icon or thumbnail (generic part icon, colored square), item name, and a right-aligned stock badge — color-coded: green-ish neutral for healthy stock count ("12 left," "15 left," "18 left," "8 left") and presumably red/orange for low ("5 left" shown in orange/amber here, implying a stock-level threshold color rule) — **flag: need the exact threshold rule, e.g. "≤5 = low stock orange, 0 = out of stock red," confirmed with the Admin's own "Low stock: SSD 256GB (5 left)" alert on Screen 12, which corroborates 5 as at least one real threshold example.**
**Interactions:** Tap FAB → Add Item form (not shown — missing screen). Tap row → item detail/edit.
**RN mapping:** `FlatList` with search-as-you-type filtering (client-side for small catalogs, or debounced server-side query if catalog is large).
**States:** Empty search results, empty "Out of Stock" tab (ideally rare/good state), loading skeleton rows.
**Confidence:** High on layout; Medium on the exact stock-color threshold logic (inferred, not explicit).

---

### Screen 14 — Reports & Analytics
**Purpose:** Business intelligence view — job volume over time + technician leaderboard.
**Layout:** Back header "Reports" → date-range selector ("01 May – 14 May 2025" with calendar icon) → "Jobs Overview" bar chart (grouped bars: Received/In Progress/Completed, color-legend below chart) with day labels on x-axis → "Top Technicians" ranked list (rank number, name, job count, revenue) → "View More ›" footer link.
**Components:**
- **Bar chart:** grouped/clustered bars per day, 3 series colored per the same status-color system (blue=Received, indigo/violet=In Progress, green=Completed) — reusing the same semantic color tokens as job status chips elsewhere, which is good consistency and should be enforced via a shared chart-color constant, not a separate palette.
- **Top Technicians row:** numbered badge (1/2/3, plain text not colored medal icons) + name + "32 jobs" + "₹78,000" right-aligned.
**RN mapping:** Chart via `react-native-svg` + a charting lib (e.g. `victory-native` or hand-rolled SVG bars, consistent with the project's stack) — avoid heavy chart libraries if only simple grouped bars are needed; a hand-rolled SVG bar chart is lighter weight and easier to theme exactly to this app's tokens.
**States:** Loading shimmer over chart area, empty state if date range has zero jobs.
**Confidence:** High on structure; Medium on exact chart library recommendation (a stack choice, not something visible in the image).

---

### Screen 15 — Bill Generation
**Purpose:** Generate/preview an itemized invoice for a completed job before sending to customer.
**Layout:** Back header "Generate Bill" → Job ID + customer name + "+ Add Discount" action → itemized table (Item / Qty / Amount columns) → computed summary block (Sub Total, Tax (18%), Discount, Total — Total bold and visually separated) → 3-button footer row (Print / Email / WhatsApp, each icon+label, outlined/ghost style, equal width).
**Components:** Line-item table nearly identical in structure to Screen 11's parts table — again reinforcing a shared `LineItemTable` component used for both "parts used" entry and "bill" display (read-only mode vs. editable mode of the same component).
**Interactions:** Tap "+ Add Discount" → inline discount input (amount or %). Tap Print → Bluetooth thermal printer flow (per project history). Tap Email/WhatsApp → send digital copy.
**RN mapping:** GST/tax calc as pure function (`subtotal * 0.18`), kept out of the render path — compute in a `useMemo` or on the data layer, not inline in JSX repeatedly.
**States:** Loading spinner on whichever send/print action is in flight; success toast per channel.
**Confidence:** High on structure; **cannot determine from image** whether tax rate (18%) is configurable or hardcoded — recommend making it a configurable business setting, not hardcoded, since GST rates and applicability can vary by service type.

---

### Screen 16 — Customer Update (WhatsApp)
**Purpose:** Send a templated status-update message to the customer via WhatsApp.
**Layout:** Back header "Send WhatsApp Update" → "Select Template" dropdown (currently "Job Ready for Pickup") → "Message Preview" section rendering the resolved template inside a **chat-bubble mockup** (green WhatsApp-style bubble, right-aligned like a sent message, with a timestamp + double-checkmark read-receipt icon for realism) → full-width green "Send via WhatsApp" CTA.
**Components:** The message-preview bubble is a nice authentic touch — mimicking WhatsApp's own bubble styling (light green bg, small tail, gray timestamp+checkmarks bottom-right) to set correct expectations before sending.
**Interactions:** Changing the template dropdown live-updates the preview bubble (variable interpolation: customer name, job ID, etc. already shown resolved as "Ramesh Kumar" and "JOB-250514-0007" in the preview, confirming this is a merge-tag template system, not free text).
**RN mapping:** Template resolution as a pure function taking a template string with `{{customer_name}}`-style placeholders + a job-data object, returning resolved text — keep this logic testable/decoupled from the UI.
**States:** Loading state while the WhatsApp Business API call is in flight; success/failure toast after send.
**Accessibility:** The chat-bubble mimicry is purely visual — ensure the actual accessible text content read by screen readers is just the message text, not decorative chrome like the fake checkmarks.
**Confidence:** High.

---

## 2. Cross-Screen Component Reuse Map

| Component | Appears in Screens | Recommendation |
|---|---|---|
| `RoleDashboard` (banner + quick actions + stat grid) | 2, 8 (and likely 12 with variation) | Build once, parameterize by role config |
| `JobCard` | 6, 9 | Single shared component, differ only by data query |
| `SelfieCapture` (photo + location + timestamp + CTA) | 3, 10 (×2 instances) | Single shared component, parameterized by context label + upload target |
| `LineItemTable` | 11, 15 | Single shared component with `editable` prop |
| `StatusChip` / `PriorityChip` | 4, 5, 6, 7, 9, 11 | Single shared component driven by a status→color lookup table (Section 0.8) |
| `SegmentedControl` (semantic-colored) | 4 (Job Type, Priority) | Shared, but must support per-option color override, not a single "selected" color |
| `Dropdown/Select` | 4, 5, 11, 16 | Single shared component |
| Bottom nav pill (with FAB) | 2, 3, 6, 8, 9 | Shared `AppBottomNav`, role-configurable icon set |
| Bottom nav flat (Admin) | 12 | Separate `AdminBottomNav` (or web sidebar equivalent) |

---

## 3. Recommended File Structure (Expo)

```
/src
  /components
    /shared
      JobCard.tsx
      StatusChip.tsx
      PriorityChip.tsx
      SelfieCapture.tsx
      LineItemTable.tsx
      Dropdown.tsx
      SegmentedControl.tsx
      RoleDashboard.tsx
      AppBottomNav.tsx
  /theme
    colors.ts
    spacing.ts
    radius.ts
    typography.ts
    shadow.ts
  /screens
    /auth        RoleSelectionScreen.tsx
    /receptionist Dashboard.tsx, Attendance.tsx, CustomerIntake.tsx, JobAssignment.tsx, JobTracking.tsx
    /technician   Dashboard.tsx, AssignedJobs.tsx, OnsiteVisit.tsx, UpdateJob.tsx
    /admin        AdminDashboard.tsx, Inventory.tsx, Reports.tsx, BillGeneration.tsx
    /shared       Notifications.tsx, CustomerWhatsAppUpdate.tsx
```

---

## 4. Global Implementation Checklist

- [ ] `theme/` tokens file (colors, spacing, radius, typography, shadow) established once, imported everywhere — no inline hex values in screens.
- [ ] `JobCard`, `StatusChip`, `SelfieCapture`, `LineItemTable` built as shared components before any screen work begins.
- [ ] `RoleDashboard` built as one parameterized component covering Screens 2, 8 (and evaluated for 12).
- [ ] FlatList virtualization + `React.memo` on `JobCard` for all job-list screens (6, 9) — required given 128+ jobs at scale.
- [ ] Image compression pipeline reused for every selfie/photo capture point (Screens 3, 10×2) before Supabase Storage upload.
- [ ] Realtime subscriptions wired for: Notifications (7), Job lists (6, 9), Admin alerts (12), Inventory low-stock (13).
- [ ] Missing screens flagged for design: Job Detail (from tapping a JobCard), Add Inventory Item, Customer Intake step 2, "attendance already marked" / "selfie already captured" confirmation states.
- [ ] Empty/loading/error states designed for every list screen (currently only "happy path" is mocked).
- [ ] Accessibility labels for all icon-only buttons and color-coded chips (color must never be the only signal — current design already does this correctly for status chips; maintain it).
- [ ] Admin dashboard (12) built with a shared token layer so the Next.js/Tailwind web version stays visually identical to the RN mobile version.

---

## 5. Known Gaps / Cannot Be Determined From Provided Image

- Exact hex color values (screenshot compression means picked colors are approximations).
- Exact font family name (visually consistent with Inter/SF Pro/Poppins — confirm with design source).
- Screen 4's form step 2 content (form is clearly multi-step given "Next" button, but step 2 isn't in this set).
- Job Detail screen (referenced by tapping any JobCard, not included in this 16-screen set).
- Add Inventory Item screen (referenced by the Inventory FAB, not included).
- Exact overlap/positioning of the FAB relative to the bottom nav pill (appears to float above/on top, precise offset not measurable at this resolution).
- Whether Admin's bottom nav is used on the actual desktop web surface or is mobile-only with a sidebar substituted on web.
- Low-stock/out-of-stock exact threshold values (inferred from the "5 left" example being flagged, not stated as a rule).

---

**Visual Audit Complete** — all 16 screens reviewed, cross-referenced, and mapped to a shared-component strategy consistent with the existing white-canvas / pastel-card / dark-pill-nav design system already established for RepairShop.
