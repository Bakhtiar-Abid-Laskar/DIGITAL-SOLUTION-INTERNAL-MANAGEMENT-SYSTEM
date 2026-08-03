# RepairShop Mobile App — Complete Page-Wise UI/UX Specification

**Source:** 14 reference screenshots (iPhone mockup frames, status bar `9:41`)
**Purpose:** Exhaustive extraction of every visible UI/UX element, per screen, for use as an implementation reference by design or engineering.
**Platform:** iOS-style mobile app (React Native / Expo, per project context) — three roles: Receptionist, Technician, Admin.

---

## Global Patterns (apply across all screens unless noted)

- **Status bar:** standard iOS mock — time `9:41`, signal/wifi/battery icons, black on white.
- **Device frame:** rounded-corner black bezel, consistent across every screen.
- **Base canvas:** pure white / near-white background throughout — no cream, no dark mode.
- **Bottom navigation bar:** present on all "home" level screens (Dashboards, Job lists via tab switch), absent on drill-down/detail screens (Attendance detail, Forms, Job Assignment, Onsite Job, Update Work, Notifications, Inventory, Reports) which instead use a top-left back arrow.
- **Floating Action Button (FAB):** a solid circular button with a white "+" icon, centered and overlapping the bottom nav bar, present on Receptionist and Technician dashboards/list screens. Its color always matches that role's primary accent (purple for Receptionist, green for Technician).
- **Active/selected state convention:** the active tab, filter, or toggle is always shown as a solid-filled pill/segment in the screen's accent color with white text; inactive options are outlined or plain text in gray/black.
- **Status color coding (consistent site-wide):**
  - Red → Urgent / Out of Stock / Low stock warning
  - Orange/Amber → High priority / In Progress / Leave requests pending
  - Green → Normal priority / Completed / Present / In Stock
  - Blue → Received / Assigned / informational
  - Purple/Indigo → Receptionist role accent, Waiting-for-Materials status, primary buttons
- **Card style:** rounded corners (~12–16px), white or very-pale-tinted background, minimal or no border, subtle drop shadow, generous internal padding.
- **Iconography:** simple line/duotone icons throughout, each wrapped in a small rounded-square colored tile when used as an action or category marker (never a bare icon on a stat card).

---

## SCREEN 1 — ROLE SELECTION (LOGIN)

**Screen type:** App entry point, no back navigation, no bottom nav (pre-authentication).

### Layout Overview
Full-screen white canvas. Content is top-aligned with generous top margin, single column, no scrolling needed for 3 items.

### Component Breakdown
- **Header block (top-left aligned, not centered):**
  - "Welcome" — large, bold, black, ~28–32px, the dominant visual anchor of the page.
  - "Please select your role to continue" — directly below, smaller (~14px), gray, single line.
- **Role cards (3, vertically stacked, equal height, full-width minus side margins, spaced with visible gaps between each):**
  Each card shares an identical internal layout: `[colored icon tile] [title (bold black) + description (2-line gray subtext)]`, left-to-right, vertically centered within the card.

  | # | Role | Icon Tile Color | Icon | Title | Description |
  |---|---|---|---|---|---|
  | 1 | Receptionist | Light purple/lavender rounded square | Person with headset/badge, purple line icon | **Receptionist** (bold) | "Manage customers, jobs and billing" |
  | 2 | Technician | Light green/mint rounded square | Person with wrench/pencil, green line icon | **Technician** (bold) | "View assigned jobs and update status" |
  | 3 | Admin | Light blue rounded square | Shield with checkmark, blue filled icon | **Admin** (bold) | "Manage users, jobs, inventory and reports" |

- Each card is fully tappable (the whole row, not just the icon or text) and routes to that role's dashboard/login.
- No visible chevron arrow in this specific screenshot crop, but the card's tappable affordance is implied by its button-like elevation/shadow.
- No footer, no "forgot role" link, no branding/logo visible on this screen beyond the text itself.

### UX Notes
- This is the single fork point for the entire app — there is no persistent role-switcher visible elsewhere, so this screen is likely revisited only on logout.
- The 3 icon-tile colors (purple/green/blue) become that role's accent color for every subsequent screen — establishing color-as-role-identity from the very first interaction.

---

## SCREEN 2 — RECEPTIONIST DASHBOARD

**Screen type:** Home tab, bottom nav present, FAB present.

### Layout Overview
Scrollable single column: Header → Greeting banner → Quick Actions grid → Today's Summary grid → (bottom nav + FAB overlay, fixed).

### Component Breakdown
- **Header row:** "Receptionist" bold black, left-aligned, large (~20px). Bell/notification icon, plain outline, top-right, no unread-count badge visible in this state.
- **Greeting banner card:** full-width, rounded corners, solid purple/indigo gradient fill.
  - Line 1: "Good Morning, Anjali" — bold, white, larger text.
  - Line 2: "Have a productive day!" — regular weight, lighter/semi-transparent white, smaller.
  - Right side: a circular avatar badge (person-silhouette icon inside a translucent white circle, not a real photo) — decorative/generic, not the user's actual photo.
- **"Quick Actions" section label:** bold black, left-aligned, sits directly above the grid with modest spacing.
- **Quick Actions grid — 3 columns × 2 rows, 6 tiles total:**
  Each tile: white/near-white rounded-square card, a smaller colored rounded-square icon tile centered inside it, and a label below the icon in small gray/black text.

  | Tile | Icon Tile Color | Icon | Label |
  |---|---|---|---|
  | 1 | Blue-tinted | Calendar/plus | New Job |
  | 2 | Orange/amber-tinted | Folder/document | Job List |
  | 3 | Purple-tinted | Two people | Customers |
  | 4 | Teal/cyan-tinted | Clock | Attendance |
  | 5 | Red-tinted | Bell | Notifications |
  | 6 | Light purple-tinted | Printer | Print Receipt |

- **"Today's Summary" section label:** bold black.
- **Summary grid — 2×2 cards, each with a right-pointing chevron indicating it's tappable/expandable:**

  | Metric | Value | Value Styling | Card Background Tint |
  |---|---|---|---|
  | Jobs Received | 12 | Standard black bold | Neutral/white |
  | In Progress | 8 | Standard black bold | Light gray |
  | Completed | 5 | Standard black bold | Pale cream/yellow |
  | Urgent | 2 | **Red bold** (only colored value on the page) | Pale red/peach |

- **Floating Action Button:** solid purple/indigo circle with white "+", positioned centered, overlapping the boundary between scrollable content and the bottom nav bar.
- **Bottom navigation bar:** 4 items plus the FAB gap in the middle: Home (house icon, purple/active, label colored to match), Jobs (folder icon, gray/inactive), *(FAB sits here)*, Customers (people icon, gray/inactive), More (grid-of-dots icon, gray/inactive).

### UX Notes
- The FAB likely opens the same "New Job" flow as the Quick Actions tile — a deliberate redundant entry point for the single highest-frequency action, which is a reasonable and common mobile pattern (not a duplication issue the way it would be on desktop).
- Chevrons on summary cards but not on quick-action tiles signals two different affordances: summary cards navigate to a filtered list, quick-action tiles launch an action/flow.

---

## SCREEN 3 — ATTENDANCE (RECEPTIONIST)

**Screen type:** Drill-down from Attendance quick action. Back arrow present, bottom nav still present (this screen sits within the tab stack rather than as a full-screen modal).

### Layout Overview
Header → Month selector → Weekly date strip → Today status banner → Selfie/photo module → Time & Location row → CTA button → Attendance History teaser (list begins below, cut off by scroll).

### Component Breakdown
- **Header:** back arrow (`←`) top-left, "Attendance" title centered, bold.
- **Month selector:** "May 2025" with a small dropdown chevron (`⌄`) beside it, left-aligned, tappable to change month.
- **Weekly date strip:** 7 day-columns (Mon 12 → Sun 18), each showing:
  - Day abbreviation (small, gray)
  - Date number (larger)
  - A small colored dot beneath each date indicating that day's attendance status (color-coded: e.g. blue = future/no data, green = present, orange = half-day, red = absent)
  - The **currently selected day (Wed 14)** is highlighted with a solid purple/indigo rounded-square background and white text — the same accent-fill selection pattern used elsewhere in the app.
- **Today status banner:** a full-width green bar/card: "Today, 14 May 2025" in white text on the left, "Status" label (gray) + "Present" (bold green) stacked on the right side of the same banner.
- **Selfie/photo module:** a large rectangular photo preview (portrait orientation employee photo) — this is the captured/live-camera attendance selfie, prominently centered, taking up significant vertical space.
- **Time & Location row:** two-column layout directly below the photo:
  - Left: "Time" label (gray, small) + "09:15 AM" (bold, black)
  - Right: "Location" label (gray, small) + "12.9716° N, 77.5946° E" (bold, black) — raw GPS coordinates, not a reverse-geocoded address.
- **Primary CTA:** full-width solid green button, "Take Selfie for Attendance" — this is the main action of the screen, triggering camera capture.
- **"Attendance History" section header:** bold black label, with "View All →" as a green, right-aligned link in the same row — implies a scrollable list of past entries begins directly below (not visible in the provided crop, but signaled by the section header + link pattern established elsewhere).
- **Bottom navigation:** same 4-item + FAB bar as the Dashboard, still visible on this screen.

### UX Notes
- The dot-per-day color coding on the week strip gives an at-a-glance attendance history without needing to open each day individually.
- Green is used specifically as the "attendance/presence" action color throughout this screen (banner, button), distinct from purple which is reserved for navigation/selection state (the selected day pill) — a clear separation between "current selection" and "positive/present status" colors.

---

## SCREEN 4 — CUSTOMER INTAKE FORM

**Screen type:** Step 1 of job creation flow. Back arrow, no bottom nav (full-screen form/modal context).

### Layout Overview
Single-column, top-to-bottom form — unlike the desktop two-column version, every field stacks vertically to suit mobile width. Ends in a single full-width primary button.

### Component Breakdown
- **Header:** back arrow (`←`) top-left, "New Job / Customer Intake" title, bold, centered.
- **Customer Name * :** label (small, gray, red asterisk for required) above a bordered input box. Example value shown: "Ramesh Kumar".
- **Contact Number * :** same label/input pattern, with a small phone-handset icon anchored inside the input on the right edge. Value: "9876543210".
- **Device Type * :** styled as a dropdown/select — value "Laptop" with a chevron (`⌄`) on the right indicating it opens a picker.
- **Reported Issue * :** single-line text input. Value: "Laptop not turning on".
- **Remarks (optional):** visually distinguished as a taller, multi-line textarea (no red asterisk — clearly optional). Value: "Customer says power light blinks."
- **Job Type toggle — segmented, two options, full width, side-by-side:**
  - "In-house Job" — **selected state**: solid purple/indigo fill, white bold text.
  - "Onsite Job" — unselected: white background, gray outline/border, gray text.
  - This is visually a segmented control, not classic radio buttons with circles — selection is communicated purely through fill color.
- **Priority * :** label above a 3-way segmented control:
  - "Normal" — outlined/white, unselected.
  - "High" — outlined/white, unselected.
  - "Urgent" — **selected state**: solid red fill, white bold text.
- **"Next" button:** full-width, solid purple/indigo, anchors the bottom of the form. Advances to Screen 5 (Job Assignment) carrying this form's data forward.

### UX Notes
- Required fields are marked with a red asterisk consistently; optional fields explicitly say "(optional)" in the label rather than relying on the absence of an asterisk alone — a small but effective redundant-signal accessibility choice.
- The Priority and Job Type controls use the exact same segmented/fill pattern, reinforcing one consistent "choose one" interaction model across the whole form rather than mixing radio buttons, checkboxes, and toggles.

---

## SCREEN 5 — JOB ASSIGNMENT

**Screen type:** Step 2 of job creation flow (post Customer Intake). Back arrow, no bottom nav.

### Layout Overview
Single column of label/value field blocks — mostly read-only/summary data echoed from Screen 4, plus one new required input, ending in a two-button footer.

### Component Breakdown
- **Header:** back arrow, "Assign Job" title, bold, centered.
- **Job ID (Auto):** label (gray) + auto-generated value "JOB-250S14-0007" (bold black) — presented as plain text, not inside an input box, signaling it is system-generated and non-editable.
- **Select Technician * :** the one interactive/editable field on this screen — styled as a dropdown with a chevron, current value "Rahul Technician" shown pre-filled/selected.
- **Priority:** label + value shown inside a bordered read-only box, with the value text itself colored to match its priority ("Urgent" rendered in red) — carrying the color-coding convention into a read-only summary field, not just live badges.
- **Job Type:** read-only bordered box, value "In-house Job" — plain black text (no color coding needed since Job Type isn't a status).
- **Customer:** read-only bordered box, value "Ramesh Kumar".
- **Device:** read-only bordered box, value "Laptop".
- **Issue:** read-only bordered box, value "Laptop not turning on".
- **Footer — two-button row:**
  - **"Print Receipt"** — left, smaller width (~40%), outline/ghost style with a small printer icon, secondary action.
  - **"Create Job"** — right, larger width (~55–60%), solid purple/indigo, primary action, finalizes and submits the job.

### UX Notes
- This screen functions as a confirmation/review step before commit — every field from the previous screen is echoed back (read-only) alongside the one remaining required decision (technician assignment), which is a strong "review before you submit" pattern that reduces data-entry errors.
- Placing "Print Receipt" before the job is even created (i.e., available on the assignment/confirmation screen already) suggests the receipt can be pre-generated or that this print action is queued to fire immediately after creation — worth clarifying with the product owner exactly what data goes on that receipt at this stage.

---

## SCREEN 6 — JOB TRACKING (RECEPTIONIST)

**Screen type:** Full job list. Back arrow, no bottom nav visible in this crop (likely a drill-in from the "Job List" quick action or "Jobs" tab).

### Layout Overview
Header with utility icons → horizontal status tabs with counts → scrollable list of job cards.

### Component Breakdown
- **Header:** back arrow, "All Jobs" title (bold, left-of-center), and a **3-icon utility cluster** top-right: search (magnifying glass), filter (funnel), and an overflow menu (vertical three-dot "⋮") — three distinct actions rather than one combined control.
- **Status tabs (horizontal, scrollable if needed):** "All 25" (active — purple text/underline), "Received 6", "In Progress 9", "Completed 7" — each tab carries its live count inline as part of the label, not as a separate badge.
- **Job list — each row is a card with:**
  - A **thick vertical color stripe** on the far left edge of the card, color-coded to the job's priority (red = urgent, orange = high, green = normal, and a distinct blue/purple tone appears for at least one status-driven case).
  - Job ID — bold black, top line.
  - Customer name — medium weight, second line.
  - Issue/device description — gray, smaller, third line.
  - Technician name (where assigned) — gray, smallest, fourth line (only shown on some cards; omitted where not yet assigned).
  - Two badge pills, right-aligned/stacked: a **priority badge** (Urgent/High/Normal, colored per the global convention) sitting above a **status badge** (In Progress/Received/Completed/Waiting for Materials, colored per its own convention: orange for In Progress, blue for Received, green for Completed, purple/lavender for Waiting for Materials).

  | Card | Stripe Color | Job ID | Customer | Detail | Priority Badge | Status Badge |
  |---|---|---|---|---|---|---|
  | 1 | Red | JOB-250S14-0007 | Ramesh Kumar | Laptop not turning on / Rahul Technician | Urgent (red) | In Progress (orange) |
  | 2 | Red | JOB-250S14-0006 | Sneha Patel | Slow performance | High (orange) | Received (blue) |
  | 3 | Green | JOB-250S14-0005 | Arjun Mehta | Keyboard not working | Normal (green) | Completed (green) |
  | 4 | Blue/Purple | JOB-250S14-0004 | Vikram Singh | Motherboard issue | *(not shown on this card)* | Waiting for Materials (purple) |

### UX Notes
- Priority is communicated **three separate ways at once** on every row (stripe color, badge color, badge label text) — a deliberately high-redundancy visual system, which is good for fast scanning but worth confirming isn't overkill/visually noisy once real data (25+ rows) is scrolling.
- The overflow "⋮" menu top-right likely holds secondary actions (export, bulk actions, sort) not surfaced as their own icons — its exact contents aren't visible in this screenshot and should be confirmed.

---

## SCREEN 7 — NOTIFICATIONS

**Screen type:** Full-screen notification center, reachable via any dashboard's bell icon. No back arrow visible in this crop; likely swipe-down or an edge-tap to dismiss, or scrolled past a header row.

### Layout Overview
Title → 3-way filter tabs → vertical list of notification rows → footer link.

### Component Breakdown
- **Title:** "Notifications", centered, bold, large.
- **Filter tabs:** "All" (active — purple underline), "Unread 3" (count inline, same pattern as Job Tracking's status tabs), "Important".
- **Notification row — repeating pattern:** `[colored icon] [2-line text: bold/primary line implied by job code + description] [relative timestamp, right-aligned, gray]`.

  | Row | Icon | Icon Color | Text | Timestamp |
  |---|---|---|---|---|
  | 1 | Bell | Blue | "New job JOB-250S14-0007 created by Anjali" | Just now |
  | 2 | Bell | Purple | "Rahul updated job JOB-250S14-0006 status" | 10 min ago |
  | 3 | WhatsApp-style speech bubble | Green | "Customer update sent for JOB-250S14-0005" | 1 hr ago |
  | 4 | Clock/parts icon | Purple | "Parts added in job JOB-250S14-0004" | 2 hr ago |
  | 5 | WhatsApp-style speech bubble | Green | "Job JOB-250S14-0003 completed" | 3 hr ago |

- **Footer:** "Mark all as read" — centered, blue/purple hyperlink-style text, sits at the very bottom of the visible list.

### UX Notes
- Icon color here maps to *notification category* (blue = system, purple = staff/internal activity, green = customer-facing/WhatsApp communication) rather than to priority — a **different semantic use of the same color palette** than the Job Tracking screen, where color meant priority/status. This dual-meaning use of color (category here vs. priority/status elsewhere) is intentional and fine within each screen's own context, but should be documented clearly so implementers don't try to unify it into one universal legend.
- No individual "mark as read" affordance is visible per-row (e.g. a swipe action or a small dot) — only the global "Mark all as read" — worth confirming whether per-item read/unread toggling exists via a gesture not visible in a static screenshot.

---

## SCREEN 8 — TECHNICIAN DASHBOARD

**Screen type:** Home tab for Technician role. Bottom nav + FAB present, both re-themed to green.

### Layout Overview
Identical structural skeleton to the Receptionist Dashboard (Screen 2), re-themed to green and re-scoped to technician-relevant actions/metrics.

### Component Breakdown
- **Header:** "Technician" bold black, left; bell icon, top-right, no badge.
- **Greeting banner:** solid **green** gradient card. "Good Morning, Rahul" (bold white) / "You have 5 assigned jobs" (lighter white). Right side avatar: unlike the Receptionist's generic silhouette icon, this shows an **actual circular photo** of the technician — a notable inconsistency/upgrade worth confirming is intentional (real photo for Technician, generic icon for Receptionist) rather than an oversight.
- **"Quick Actions" — 4 tiles this time (not 6), single row:**

  | Tile | Icon Tile Color | Icon | Label |
  |---|---|---|---|
  | 1 | Purple-tinted | Two people | My Jobs |
  | 2 | Blue-tinted | Clipboard/calendar | Attendance |
  | 3 | Red-tinted | Bell | Notifications |
  | 4 | Purple-tinted | Archive/box | Inventory |

- **"My Jobs Summary" — 2×2 grid, chevrons on each:**

  | Metric | Value | Styling |
  |---|---|---|
  | Assigned | 5 | Black bold |
  | In Progress | 3 | Black bold |
  | Completed | 8 | Black bold |
  | Urgent | 2 | Red bold |

- **FAB:** solid green circle, white "+", same position/behavior as Receptionist's purple FAB (likely opens a quick status-update or job-action flow rather than "create job", since technicians don't create jobs).
- **Bottom nav:** Home (green/active), Jobs, *(FAB)*, Inventory, More — note **Inventory replaces Customers** in this role's nav, and there is no dedicated "Customers" access for technicians, which is an appropriate scope restriction for the role.

### UX Notes
- The Receptionist has 6 quick actions vs. the Technician's 4 — a sensible reduction reflecting the narrower scope of the technician's daily tasks, not an inconsistency.
- Confirm whether the FAB here duplicates the "My Jobs" tile or opens something distinct (e.g. a fast "Update Work" shortcut) since its target isn't obvious from a static screenshot the way "New Job" was for the Receptionist.

---

## SCREEN 9 — ASSIGNED JOBS (TECHNICIAN)

**Screen type:** Technician's personal job queue.

### Layout Overview
Title → 3-way tab filter with counts → scrollable list of job cards, same visual card language as Screen 6 but scoped to only this technician's jobs.

### Component Breakdown
- **Title:** "My Assigned Jobs", bold.
- **Tabs:** "All 5" (active, purple underline), "In Progress 3", "Completed 2".
- **Job cards** — same stripe + two-badge pattern as the Receptionist's Job Tracking screen, but the **status badge vocabulary differs slightly** for the technician's own view — it includes an "Assigned" state (blue/purple pill) not present in the Receptionist's status tab set, representing jobs handed to this technician but not yet started.

  | Card | Stripe | Job ID | Customer | Detail | Priority Badge | Status Badge |
  |---|---|---|---|---|---|---|
  | 1 | Red | JOB-250S14-0007 | Ramesh Kumar | Laptop not turning on | Urgent (red) | In Progress (orange) |
  | 2 | Orange | JOB-250S14-0006 | Sneha Patel | Slow performance | High (orange) | In Progress (orange) |
  | 3 | Orange | JOB-250S14-0003 | Vikram Singh | Motherboard issue | Normal (green) | Assigned (blue/purple) |
  | 4 | Orange | JOB-250S14-0002 | Arjun Mehta | Keyboard not working | Normal (green) | Completed (green) |
  | 5 | Orange | JOB-250S14-0001 | Karan Joshi | Display flickering | High (orange) | Assigned (blue/purple) |

### UX Notes
- Tapping a card presumably routes to either the Onsite Job screen (Screen 10, for onsite jobs) or the Update Work screen (Screen 11, for in-house jobs) depending on the job's `Job Type` — this branching isn't visible in the screenshots but is the logical connective tissue between this list and the two detail screens that follow.

---

## SCREEN 10 — ONSITE JOB (TECHNICIAN)

**Screen type:** Field-service detail/action screen for a specific onsite job. Reached from tapping an onsite job card in Screen 9.

### Layout Overview
Green header card → Start Visit module → Complete Visit module → final status action, all in one scrollable column, no bottom nav (focused single-task screen).

### Component Breakdown
- **Header card:** solid green banner containing a small person icon + Job ID ("JOB-250S14-0006") bold white on the first line, customer name ("Sneha Patel") lighter white on the second line, and an "✕" close icon top-right to exit back to the job list.
- **"Start Visit" section:**
  - Small instruction row: a green circular icon + "Take selfie at location" text — the icon here signals a **completed/available** step (green = done or ready).
  - A large photo preview showing the technician's already-captured selfie at the job site (outdoor background visible).
  - "Location" label + live GPS coordinates ("12.9342° N, 77.6100° E") below the photo.
  - Full-width solid green button: **"Start Visit Selfie"** — labeled as if to (re)initiate the capture, suggesting this button remains actionable/re-triggerable even after a photo is already shown above it (or the photo shown is a preview of what was just captured and the button confirms/submits it).
- **"Complete Visit" section:**
  - Instruction row: an **outlined/unfilled circular icon** (visually distinct from the green-filled one above) + "Take selfie after completing/leaving" — the unfilled icon signals this step is **not yet done**.
  - An **outlined (not solid-filled) button**: "Take Completion Selfie" — its ghost/outline styling (rather than solid fill) visually communicates this action is not yet available/relevant until the visit is further along, a state-dependent button treatment.
- **Bottom CTA:** a full-width "Update Status" button, rendered in a **darker, more muted green** than the "Start Visit Selfie" button above it — this muted treatment reads as a disabled or lower-emphasis state, implying it only becomes fully active once the Complete Visit step is finished.

### UX Notes
- This screen demonstrates a clear **two-stage visual state system**: filled icon + solid button = active/available or completed step; outlined icon + outline button = pending/locked step. This pattern is worth carrying consistently into any other multi-step in-app flow.
- There is no visible "Materials" or "Notes" entry point on this specific screen — that functionality lives separately in Screen 11 (Update Work), implying Onsite Job handles only the visit/location/selfie verification lifecycle, while Update Work handles the actual repair documentation and billing-relevant data, even for onsite jobs. Worth confirming the exact navigation link between the two for onsite jobs specifically.

---

## SCREEN 11 — UPDATE WORK (TECHNICIAN)

**Screen type:** Repair documentation and materials-logging screen, likely reached from an in-house job card (Screen 9) or as a follow-on step from Onsite Job (Screen 10).

### Layout Overview
Job info bar → Materials/Parts table with running total → Work Notes textarea → Status dropdown → final submit button.

### Component Breakdown
- **Header:** "Update Job" title, small purple person/customer icon to the left of the job info line.
- **Job info bar:** Job ID ("JOB-250S14-0007") bold black, customer name ("Ramesh Kumar") gray subtext directly below it.
- **"Materials / Parts Used" section:**
  - Section label (bold) with a **"+ Add Item"** link (blue/purple, right-aligned) in the same row — the entry point for adding a new part/material line.
  - A simple table with implicit columns Item (left, unlabeled header) · Qty · Cost:
    - RAM 8GB DDR4 — Qty 1 — ₹2,000
    - SSD 512GB — Qty 1 — ₹3,200
    - Screw Set — Qty 1 — ₹100
  - **Total Cost row:** right-aligned, bold, "₹5,300" — auto-summed from the line items above.
- **"Work Notes" section:** label + a multi-line textarea, pre-filled with: "Diagnosed issue in power IC. Replaced RAM and SSD. System running perfectly now." — a free-text diagnosis/resolution log.
- **"Status" section:** label + a dropdown select showing "In Progress" with a chevron, allowing the technician to change the job's lifecycle stage directly from this screen.
- **Primary CTA:** full-width solid green button, **"Update & Notify"** — the wording explicitly signals that saving here also triggers a notification (very likely to the receptionist and/or customer, tying directly into the Notifications screen's "Parts added" and status-update entries seen in Screen 7).

### UX Notes
- This screen is the direct source of at least two of the five notification entries seen in Screen 7 ("Rahul updated job ... status" and "Parts added in job ...") — confirming the Materials table and Status dropdown on this screen are the triggers for those specific notification types.
- There's no visible per-line delete/edit affordance on the materials rows in this screenshot (no trash icon) — worth confirming whether tapping a row opens edit/delete options, or whether a swipe gesture handles it, since the desktop equivalent has an explicit delete icon per row.

---

## SCREEN 12 — ADMIN DASHBOARD (WEB/APP)

**Screen type:** Home tab for Admin role — despite the "(WEB/APP)" label in the reference title, this specific screenshot is rendered in the same mobile phone frame as every other screen, i.e. this is the Admin role's **mobile** dashboard (a separate, wider desktop admin panel exists elsewhere in the project and is a different surface entirely).

### Layout Overview
Same skeleton as Receptionist/Technician dashboards, re-themed to **blue**, with Quick Actions replaced entirely by an Alerts feed (no quick-action tile grid on this screen at all).

### Component Breakdown
- **Header:** "Admin" bold black, left; a **3-dot overflow menu** icon top-right (not a bell) — a deliberate difference from the other two dashboards, which use a bell. This suggests Admin's notification access is folded into a broader overflow/settings menu rather than getting its own dedicated icon.
- **Greeting banner:** solid **blue** gradient card. "Welcome, Admin" (bold white) / "Here's your system overview" (lighter white). Right side: a circular icon avatar containing a bar-chart/analytics glyph (not a person), reinforcing the "overview/analytics" framing of this role rather than a personal greeting photo.
- **"Overview" section label**, followed directly by a **2×2 KPI grid** (no chevrons — these are pure metrics, not tappable drill-in cards, unlike the other two roles' summary cards):

  | KPI | Value |
  |---|---|
  | Total Jobs | 128 |
  | Technicians | 12 |
  | Customers | 532 |
  | Revenue (May) | ₹2,45,000 |

- **"Alerts" section label**, followed by a vertical list of 3 alert rows, each with a small colored triangle/circle severity icon on the left and plain text beside it:
  - 🟢 Green icon — "Low stock: SSD 256GB (5 left)"
  - 🟠 Orange icon — "3 leave requests pending"
  - 🔴 Red icon — "2 urgent jobs not started"
- **Bottom navigation:** Home (blue/active), Jobs, Users, Reports, More — a **5-item nav distinct from both other roles** (neither Customers nor Inventory nor Attendance appear directly; "Users" replaces "Customers/Staff" and "Reports" gets its own dedicated tab, reflecting the Admin's broader, cross-cutting scope).

### UX Notes
- Unlike Receptionist/Technician, the Admin dashboard has **no Quick Actions grid at all** — the entire screen is metrics + alerts, reinforcing that this role is oriented around monitoring/oversight rather than performing frontline actions.
- The absence of chevrons on the KPI cards (present on the other two roles' summary cards) is a meaningful, consistent signal: these 4 numbers are read-only headline metrics, not filtered list entry points — confirm this is intentional before adding tap-through behavior later.

---

## SCREEN 13 — INVENTORY MANAGEMENT

**Screen type:** Full inventory list, reachable from either the Receptionist's or Technician's "Inventory"/parts-related quick actions, or the Admin's nav.

### Layout Overview
Back arrow + title → search bar → 3-way stock-status tabs with counts → simple list rows → FAB.

### Component Breakdown
- **Header:** back arrow, "Inventory" title, centered/bold.
- **Search bar:** full-width rounded input, placeholder "Search items", magnifying-glass icon anchored inside on the left.
- **Tabs:** "All 5" (active, purple underline), "Low Stock 3", "Out of Stock 1" — same live-count-inline pattern as every other tab row in the app.
- **List rows — simpler than the Job cards, no stripe/badges, just:**
  `[small category icon] [item name] .......... [stock count, right-aligned]`

  | Item | Icon | Stock Count | Count Styling |
  |---|---|---|---|
  | SSD 256GB | Storage/drive icon | 5 left | **Red bold** (only colored value — flags this as the low-stock item) |
  | RAM 8GB DDR4 | Memory-stick icon | 12 left | Black |
  | Laptop Charger Dell | Charger/plug icon | 8 left | Black |
  | Keyboard USB | Keyboard icon | 15 left | Black |
  | Thermal Paste | Tube/consumable icon | 18 left | Black |

- **FAB:** solid **blue** circular button with white "+", positioned bottom-right corner of the screen (not centered like the dashboard FABs) — a deliberate positional difference, likely because this screen has no bottom-nav-integrated FAB slot and instead uses a classic Android/Material-style corner FAB for "Add Item".

### UX Notes
- Each item gets a distinct, item-specific icon (not a single generic "box" icon repeated) — a nice touch for fast visual scanning of a parts list, worth preserving in implementation rather than falling back to one shared placeholder icon.
- Only the genuinely low-stock item (SSD, 5 left) gets red-colored count text — the threshold-based coloring is per-row/data-driven, not a static style.

---

## SCREEN 14 — REPORTS & ANALYTICS

**Screen type:** Analytics/reporting screen, likely reached from Admin's "Reports" nav tab.

### Layout Overview
Back arrow + title → date-range control → bar chart with legend → ranked technician leaderboard → footer link.

### Component Breakdown
- **Header:** back arrow, "Reports" title, centered/bold.
- **Date range control:** a pill-shaped control showing "01 May – 14 May 2025" with a small chevron/arrow indicating it's tappable to change, plus a separate calendar icon button to its right for opening a full date picker.
- **"Jobs Overview" section label**, followed by a **grouped bar chart**:
  - Y-axis: numeric volume scale (appears as 0 up to the mid-30s/40s range based on bar heights).
  - X-axis: 3 date groupings (abbreviated/truncated in this crop, consistent with the desktop version's "1 May / 8 May / 14 May" date buckets).
  - Legend (right side, stacked): Received (blue swatch), In Progress (green swatch), Completed (red/orange swatch) — **note:** this is a different color assignment for "Completed" (red/orange here) than used elsewhere in the app where Completed is consistently green — worth double-checking this against the actual chart rendering, since it would be an inconsistency if so.
- **"Top Technicians" section label**, followed by a ranked list:

  | Rank | Name | Jobs Completed | Revenue |
  |---|---|---|---|
  | 1 | Rahul | 32 jobs | ₹78,000 |
  | 2 | Imran | 28 jobs | ₹62,000 |
  | 3 | Amit | 18 jobs | ₹38,000 |

  Each row: rank number in a small colored circle/badge (blue) on the left, technician name bold beside it, job count and revenue right-aligned in the same row.
- **Footer:** "View More →" centered link, blue/purple text, presumably expanding the leaderboard beyond the top 3.

### UX Notes
- This screen is visually the most data-dense of the set (chart + ranked table in a single scroll), and is the mobile equivalent of the desktop admin panel's combined "Jobs Overview chart + Top Technicians" reports layout — the two should be kept in sync if the underlying data queries are shared between mobile and web.
- Flag the "Completed" chart-legend color for verification against actual rendered output before implementation, since red is used everywhere else in the app to mean "urgent/danger," not "completed."

---

## CROSS-SCREEN CONSISTENCY SUMMARY

| Pattern | Consistent across app? | Notes |
|---|---|---|
| Role accent colors (purple/green/blue) | ✅ Yes | Receptionist=purple, Technician=green, Admin=blue — carried through greeting banners, FABs, active nav states |
| Priority colors (red/orange/green) | ✅ Yes | Urgent=red, High=orange, Normal=green, everywhere |
| Status colors (blue/orange/green/purple) | ✅ Yes | Received=blue, In Progress=orange, Completed=green, Waiting/Assigned=purple — consistent between Job Tracking and Assigned Jobs |
| Tab-with-inline-count pattern | ✅ Yes | Used identically in Job Tracking, Assigned Jobs, Notifications, Inventory |
| Segmented fill-to-select control | ✅ Yes | Job Type and Priority pickers in Customer Intake use the same visual language |
| Chevron = tappable drill-in | ⚠️ Mostly | Present on Receptionist/Technician summary cards, absent on Admin's KPI cards — confirm intentional |
| Bell icon = notifications | ⚠️ Mostly | Present on Receptionist/Technician headers, replaced by a 3-dot overflow menu on Admin — confirm intentional |
| FAB position | ⚠️ Varies | Centered/nav-integrated on dashboards, corner-anchored on Inventory — likely a deliberate context-based difference (primary create action vs. secondary add action) |
| Notification icon color meaning | ⚠️ Context-dependent | Means *category* on the Notifications screen but *priority/status* everywhere else — same palette, different semantics per screen; document clearly for implementers |
| "Completed" legend color in Reports chart | ❗ Needs verification | Appears red/orange in Screen 14's legend vs. green everywhere else in the app |

---

*End of specification. Derived entirely from visual inspection of the 14 supplied reference screenshots — any data-layer or navigation logic not visibly present in a screenshot is marked above as needing confirmation rather than assumed.*
