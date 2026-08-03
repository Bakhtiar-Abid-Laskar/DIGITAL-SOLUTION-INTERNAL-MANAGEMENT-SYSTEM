# 🔍 RepairShop Admin Panel — Page-Wise Visual & UX Audit

**Date:** 2026-07-17  
**Auditor:** Antigravity AI (Claude Sonnet 4.6 Thinking)  
**Report Type:** Page-by-Page Visual Component Analysis  
**Stack:** Next.js 16 · TypeScript · TailwindCSS v4 · Supabase · Recharts · Lucide React  
**Total Pages Audited:** 11 pages + Global Shell (Sidebar, Topbar)  

---

## How to Read This Report

Each page section is broken down into:
- **Layout Overview** — spatial structure and page-level composition
- **Component-by-Component Breakdown** — every visible UI element with color, size, typography, and interaction details
- **State Variations** — loading, empty, and error states specific to the page
- **UX Observations** — specific problems, inconsistencies, and missing interactions found on that page
- **Improvement Recommendations** — concrete fixes for each issue

---

## Global Design System Reference

Before diving into pages, these shared visual values apply site-wide:

| Token | Color | Used For |
|---|---|---|
| `admin-bg-base` | `#F7F7F5` warm cream/off-white | Full page canvas background |
| `admin-bg-surface` | `#FFFFFF` pure white | Card interiors, topbar |
| `admin-bg-subtle` | `#F7F7F5` | Table headers, modal headers, input backgrounds |
| `admin-accent` | `#1E1B18` near-black warm ink | Primary buttons, active sidebar items |
| `admin-text-primary` | `#2A2521` dark warm brown | Main content text |
| `admin-text-secondary` | `#6B6259` medium warm brown | Labels, metadata, sub-headings |
| `admin-text-muted` | `#A69C8E` warm greige | Placeholders, disabled text, icons |
| `admin-border` | `#E8E6E1` warm light grey | Card borders, dividers, input outlines |
| `admin-sidebar-bg` | `#1E1B18` dark warm ink | Sidebar background |
| `admin-danger` | `#C0392B` deep red | Errors, destructive actions |
| `admin-success` | `#2E8B57` forest green | Completed states, positive badges |
| `admin-warning` | `#B8860B` dark goldenrod | Pending, warning badges |
| `admin-progress` | `#2563A8` medium blue | In-progress status, info badges |

**Typography:** Inter (Google Fonts) via `next/font`. Monospace: JetBrains Mono.  
**Border Radius:** `8px` (sm), `14px` (md), `20px` (lg), `24px` (xl)  
**Shadow:** Warm diffused `rgba(139, 115, 85, 0.08)` — never cold grey shadows.

---

---

# GLOBAL SHELL

## The Persistent Application Frame

Every authenticated page shares the same outer shell: a floating sidebar on the left and a topbar above the main content area. This shell is rendered by `AdminLayout.tsx`.

---

## Shell — Sidebar Navigation

**File:** `src/components/layout/Sidebar.tsx`  
**Layout:** Vertical column, fixed width `w-64` (256px), sits on the left edge of the viewport. Styled with outer `my-6 ml-6 mr-3` margins, giving it a floating, card-like appearance — it does not touch the screen edges.

### Visual Construction

**Outer Container:**  
A tall, dark rounded card. Background: `#1E1B18` (near-black warm ink). Border: `1px solid rgba(255,255,255,0.10)` (barely visible white border). Corner radius: `rounded-[24px]` — 24px, noticeably pill-like. Box shadow from `shadow-card` (warm diffused brown, not cold). The sidebar feels like a premium floating panel, separated from the page background.

**Brand Header Section:**  
A horizontal strip at the top, `h-20` (80px tall), with a bottom border `rgba(255,255,255,0.05)`. Contains two elements:
1. **Icon Block:** A small 32×32px square with `rounded` corners and `bg-white/10` (frosted glass white). Contains a `Wrench` icon from Lucide at 18px, colored `text-white`. This acts as the app logo mark.
2. **Brand Name:** Text `"RepairShop"` in `font-bold text-white tracking-wide text-lg` — white, bold, slightly spaced. Clean and readable against the dark sidebar.

**Navigation Menu:**  
A vertical stack of nav items in `flex-1 py-6 px-3 space-y-1`. Scrollable if items overflow. Contains 9 items:

| # | Label | Icon | Route |
|---|---|---|---|
| 1 | Overview | LayoutDashboard | `/` |
| 2 | Jobs | Briefcase | `/jobs` |
| 3 | Create Job | PlusCircle | `/jobs/new` |
| 4 | Staff | Users | `/staff` |
| 5 | Inventory | Package | `/inventory` |
| 6 | Reports | BarChart3 | `/reports` |
| 7 | Salary | Wallet | `/salary` |
| 8 | Expenditure | FileText | `/expenditure` |
| 9 | Settings | Settings gear | `/settings` |

**Nav Item — Inactive State:**  
Horizontal pill: `flex items-center gap-3 px-4 py-3 rounded-md`. Icon: `text-admin-sidebar-text` (`#A69C8E` warm greige). Label: same greige. On hover: background transitions to `bg-white/10`, text to `text-white`. Smooth 200ms transition. Height: ~44px per item.

**Nav Item — Active State:**  
Background: `bg-admin-sidebar-active-bg` = `rgba(255,255,255,0.08)` — a subtle frosted white highlight. Icon and text: `text-admin-sidebar-active` = `#FFFFFF` — pure white. No border, no underline, purely background fill to indicate current section. The subtlety is elegant but can be hard to distinguish at a glance compared to stronger active indicators.

### UX Observations — Sidebar

**Issue 1 — No Mobile Collapse [HIGH]:**  
The sidebar is permanently visible at full 256px width. There is no hamburger toggle, no responsive collapse, and no overlay for screens under ~900px. On a 768px iPad, the sidebar eats 256px leaving only ~512px for content — tables become cramped and filter bars wrap badly.

**Issue 2 — "Create Job" as Top-Level Item [MEDIUM]:**  
Standard UX places creation actions as CTA buttons within the parent page (e.g., an "Add Job" button on the Jobs page header), not as standalone sidebar items. Having both "Jobs" and "Create Job" as separate nav items increases visual noise. 9 items is approaching the cognitive load limit for sidebar navigation.

**Issue 3 — Active State Subtlety [LOW]:**  
The `rgba(255,255,255,0.08)` active background is only a 8% opacity white — very subtle on the dark `#1E1B18` background. In poor lighting or on lower-quality displays, distinguishing active vs. inactive items requires effort. A slightly higher opacity (12–15%) or a thin colored left border indicator would improve clarity.

**Issue 4 — No Sidebar Footer [LOW]:**  
The sidebar has no bottom section. Common patterns include a mini profile card at the bottom, a "Help" link, or version number. The sidebar currently feels unfinished at the bottom.

---

## Shell — Topbar

**File:** `src/components/layout/Topbar.tsx`  
**Layout:** A full-width horizontal bar at the top of the main content area. Styled with `h-20 mt-6 mr-6 ml-3` margins — it also floats like the sidebar, not touching screen edges. White background, `border border-admin-border`, `rounded-[20px]`, subtle `shadow-sm`.

### Visual Construction

**Overall Bar:**  
Height: 80px. Width: stretches to fill the remaining content area (after sidebar). Rounded 20px corners. Pure white background separated from the cream page canvas.

**Left Zone — Empty:**  
A `flex-1` div that occupies all available left space. Currently contains only a comment: `{/* Can be dynamic page title if needed */}`. This results in a large empty white area spanning roughly 60–70% of the topbar width. **This is wasted prime real estate.**

**Right Zone — User Controls:**  
A tight horizontal row of controls:

1. **Notification Bell Button:**  
   `p-2` padding square button. `Bell` icon at 20px, colored `text-admin-text-secondary` (warm brown). On hover: transitions to `text-admin-accent` (dark ink). Has a **static red dot indicator** — a 8×8px circle positioned `absolute top-1.5 right-1.5` with `bg-admin-danger` (red) and a `border border-white` ring to separate it from the button. This dot is **always visible, always red** — it is hardcoded and has no click handler.

2. **Vertical Divider:**  
   A thin `h-6 w-px bg-admin-border` line — 24px tall, 1px wide, warm grey. Visual separator between bell and user info.

3. **User Info Block:**  
   Two lines of text aligned right, visible above `sm` breakpoint only (`hidden sm:block`):
   - Line 1: `profile?.name || 'Admin User'` — `text-sm font-semibold text-admin-text-primary`. Bold, small (14px).
   - Line 2: `profile?.role || 'Admin'` — `text-xs text-admin-text-muted capitalize`. Tiny, muted. Shows the user's role in lowercase capitalized.

4. **Avatar Circle:**  
   32×36px circle (`w-9 h-9`), `rounded-full`. Background: `bg-admin-accent-dim` = `rgba(30,27,24,0.08)` — an almost transparent warm ink. Border: `border border-admin-accent/20`. Contains the user's first initial in uppercase, `font-bold`, colored `text-admin-accent`. No profile photo support.

5. **Logout Button:**  
   A ghost-variant icon button from the `Button` component. Contains a `LogOut` Lucide icon at 20px. Default color: `text-admin-text-secondary`. Hover: `text-admin-danger` (red). No label text, icon only.

### UX Observations — Topbar

**Issue 1 — Notification Bell is Non-Functional [HIGH]:**  
The always-on red dot implies there are unread notifications. Clicking the bell does nothing. Users will click it expecting a dropdown panel and get no feedback. This creates a trust-breaking false signal.

**Issue 2 — Empty Left Zone [MEDIUM]:**  
The large left area showing nothing is a missed opportunity. This space could display: the current page title with breadcrumb, a global search bar, or quick date/time context. Currently users must scroll to the main content area to understand what page they're on.

**Issue 3 — No Profile Photo [LOW]:**  
The avatar is an initial-based fallback with no photo upload capability. While functional, it feels unpolished compared to the premium design aesthetic.

**Issue 4 — Logout Button Has No Confirmation [LOW]:**  
Clicking logout immediately signs the user out. While not catastrophic (re-login is quick), a subtle "Are you sure?" tooltip or 1-second undo window would prevent accidental logouts.

---

---

# PAGE 1: LOGIN

**Route:** `/login`  
**File:** `src/app/login/page.tsx`

## Layout Overview

Full-viewport centered layout (`flex h-screen w-full items-center justify-center`). The entire screen is filled with the `admin-bg-base` cream background (#F7F7F5). A single white card is centered both horizontally and vertically.

## Component Breakdown

### Login Card Container

A centered white card: `w-full max-w-md` (maximum 448px wide), `bg-admin-bg-surface` pure white, `p-8` (32px padding all sides), `rounded-[20px]` (very rounded), `shadow-card` (warm diffused shadow), `border border-admin-border`. On a cream background, this card stands out clearly with its white color and soft shadow.

### Brand Title

`h1` element: `text-3xl font-bold text-center mb-2 text-admin-text-primary`. The text "RepairShop" displayed at 30px bold, centered, in the near-black warm ink color. No logo image, no color, just typography. Minimal but works.

### Sub-Caption

A `p` element below the title: `text-center text-admin-text-secondary mb-8`. Text: "Admin Panel Login". 8 characters, secondary warm brown color, small size. Provides context for the form. `mb-8` (32px margin below) creates breathing room before the form.

### Error Banner (Conditional)

Appears only when login fails. A `div` with:  
- Background: `bg-admin-urgent-bg` — a light red/salmon (#FDE2E1)  
- Border: `border border-admin-urgent-fg/20` — faint red border  
- Text: `text-admin-urgent-fg` — deep red (#C0392B)  
- Padding: `px-4 py-3`, rounded: `rounded-md`  
- Font: `text-sm`  
Displays the raw Supabase error message (e.g., "Invalid login credentials"). The error appears **above** the form, in-card, and is well-positioned for visibility.

### Form: Email Field

**Label:** `text-admin-text-secondary font-medium mb-1 text-sm` — "Email" in muted warm brown, 14px.  
**Input:** Uses the `Input` common component. Styled as: `h-12` (48px tall), `w-full`, `rounded-md`, white background, `border-admin-border`. Focus: `focus-visible:ring-2 focus-visible:ring-admin-accent` — a dark warm ink ring appears on focus. Placeholder text is inherited from browser default (no placeholder set). Type: `email` — enables browser email keyboard on mobile, triggers email validation.

### Form: Password Field

Same visual construction as Email field. Type: `password` — text is hidden with bullet characters. No "show password" toggle exists. Labels, sizing, and focus ring match Email exactly.

### Submit Button

Full-width primary button: `w-full mt-6`. Uses `Button` component with default `primary` variant.  
- **Normal state:** `bg-admin-accent` (#1E1B18 dark ink), `text-white`, `h-[52px]` (52px tall — slightly taller than the inputs at 48px), `rounded-md`, `shadow-sm`. Text: "Log In".  
- **Loading state (isLoading=true):** The `Loader2` icon spins on the left, text "Log In" remains. Button becomes `opacity-50 pointer-events-none`.  
- **Disabled state:** Same as loading.  
Height mismatch: button is 52px while inputs are 48px — not visible in isolation but creates a subtle inconsistency in vertical rhythm.

### UX Observations — Login

**Issue 1 — No Forgot Password [MEDIUM]:**  
No recovery mechanism exists. Below the submit button, there is zero supporting text or links. An admin who forgets their password has no self-service option.

**Issue 2 — No "Show Password" Toggle [LOW]:**  
Standard for 2026 — password inputs should offer a show/hide toggle. Currently users cannot verify their password before submitting.

**Issue 3 — Raw Error Message Displayed [LOW]:**  
Supabase returns `"Invalid login credentials"` — which is acceptable. But errors like connection timeouts or rate limits will show raw technical error strings that are not user-friendly. A message mapping layer would improve resilience.

**Issue 4 — No Auto-Focus [LOW]:**  
The Email input is not auto-focused on page load. Users must click the email field before typing. Adding `autoFocus` to the email input removes this friction step.

**Issue 5 — Brand is Typography-Only [LOW]:**  
The login page shows only the text "RepairShop" with no logo, icon, or visual brand mark. The sidebar uses a Wrench icon — this icon is absent from the login page, missing an opportunity for visual brand continuity.

---

---

# PAGE 2: OVERVIEW / DASHBOARD

**Route:** `/`  
**File:** `src/app/(admin)/page.tsx`

## Layout Overview

The dashboard is the first screen after login. It uses `space-y-6` vertical stacking of sections. The main content area sits to the right of the sidebar and below the topbar, filling `flex-1 overflow-y-auto p-6 md:p-8` — cream background, with internal white card components.

Top to bottom: PageHeader → 4 Stat Cards → Chart + Quick Stats → Recent Jobs Table

## Component Breakdown

### Page Header

A `PageHeader` component rendering:
- **Title (`h1`):** "Overview" in `text-2xl font-bold text-admin-text-primary tracking-tight` — 24px, bold, warm ink black. No border, no separator — clean.
- **Description:** "Here's what's happening in your shop today." in `text-admin-text-secondary text-sm mt-1` — 14px warm brown, below the title.
- **Actions (right side):** A `Refresh` button with `RefreshCw` 16px icon on its left. Variant: `outline` — transparent background, `border-admin-border`, dark text. When clicked, spins the icon and shows loading state via `isLoading` prop.

The header has `flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4` — at small screens, the button stacks below the title.

### Metric Stat Cards (4-card grid)

A `grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6` — 4 horizontal cards on large screens, 2 columns on medium, stacked on small.

Each card is a `StatCard` sub-component using the `Card` component with `noAccentLine` (no left border accent), `p-0`, and a hover effect: `hover:-translate-y-1 transition-transform duration-200` — card lifts 4px on hover for a floating feel.

**Internal Layout:** `CardContent flex items-center gap-4` — icon block on left, text on right.

**Icon Block:** A `p-4 rounded-lg border` square containing the Lucide icon at 24px. Color scheme varies by variant:

| Card | Title | Icon | Icon Block Background | Icon Block Text |
|---|---|---|---|---|
| 1 | Jobs Today | Briefcase | `bg-admin-pending-bg` (#FFF4D6 soft yellow) | `text-admin-pending-fg` (#B8860B goldenrod) |
| 2 | Completed This Week | CheckCircle | `bg-admin-completed-bg` (#DFF3E3 soft green) | `text-admin-completed-fg` (#2E8B57 forest green) |
| 3 | Active Technicians | Users | `bg-admin-progress-bg` (#DCEBFA soft blue) | `text-admin-progress-fg` (#2563A8 medium blue) |
| 4 | Pending Approvals | AlertCircle | `bg-admin-urgent-bg` (#FDE2E1 soft red) | `text-admin-urgent-fg` (#C0392B deep red) |

**Text Block:**
- Label: `text-sm text-admin-text-secondary font-medium mb-1` — 14px warm brown secondary label.
- Value: `text-2xl font-bold text-admin-text-primary` — 24px bold, main ink number. Shows live count from Supabase.

### Jobs Created Chart (2/3 width panel)

`Card` with standard left accent border. Header: "Jobs Created (Last 7 Days)" as `CardTitle` (h3, bold 18px). Content: a `div h-72` (288px height) hosting a `ResponsiveContainer` → `BarChart` from Recharts.

**Chart Details:**
- **X-Axis:** Day abbreviations (Mon, Tue, etc.) in `stroke="#94A3B8"` slate grey, 12px, no tick lines or axis line — clean.
- **Y-Axis:** Integer job counts in same slate grey, 12px, `allowDecimals={false}`.
- **Tooltip:** White rounded box with `border: '1px solid #E2E8F0'` and `boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'` — cool grey border that doesn't match the warm design system.
- **Bars:** `fill="var(--color-admin-accent)"` — dark warm ink bars. `radius={[4, 4, 0, 0]}` — rounded tops only. 
- **Hover cursor:** `cursor={{ fill: '#F1F3F7' }}` — cool blue-grey fill that also mismatches the warm color palette.

**Issue:** Tooltip and hover cursor use cool/blue-grey colors from a different palette. Should use warm design tokens (`admin-bg-hover` = `#EBE7DF`) for the hover cursor fill.

### Quick Stats Panel (1/3 width panel)

A `Card noAccentLine`. Header: "Quick Stats". Content: `flex flex-col items-center justify-center h-72 text-admin-text-secondary text-center` — centered placeholder:
- A large `CheckCircle` icon: `w-12 h-12 text-admin-success` — 48px green checkmark.
- Bold paragraph: "System is running normally." in `text-admin-text-primary`.
- Small paragraph: "Use the sidebar to navigate to specific sections." in `text-sm`.

**This is a placeholder.** The panel occupies 1/3 of a premium dashboard row (288px tall) to say "system is fine." It provides zero actionable information.

### Recent Jobs Table

A full-width `Card` (with left accent border). Header row: `flex flex-row justify-between items-center` — title "Recent Jobs" on left, nothing on right.

**Table Structure:** `w-full text-left text-sm whitespace-nowrap` inside `overflow-x-auto`.

**Table Header (`thead`):**  
`bg-admin-bg-subtle text-admin-text-secondary border-y border-admin-border` — cream/off-white background, warm brown secondary text, thin borders top and bottom.  
Columns: Job Code · Customer · Device · Technician · Status · Priority  
Font: `font-medium` — medium weight (not bold).

**Table Body (`tbody`):** `divide-y divide-admin-border` — thin horizontal dividers between rows.

**Row — Default State:**  
Background: white (inherited from card). On hover: `hover:bg-admin-bg-hover` = `#EBE7DF` (warm beige) — subtle color shift.  
But: **No `cursor-pointer` class, no `onClick` handler.** Rows visually hover but clicking does nothing. No navigation to job detail happens.

**Cell Styling:**
- Job Code: `px-6 py-4 font-medium text-admin-text-primary` — bold warm ink.
- Customer / Device / Technician: `text-admin-text-secondary` — secondary warm brown.
- Status: `StatusBadge` component (pill badge).
- Priority: `PriorityBadge` component (pill badge).

**Empty State:** A single centered cell spanning all 6 columns: `text-admin-text-muted` — shows "No recent jobs found."

**Loading State:** Uses `LoadingState` component (spinner + message).

### UX Observations — Dashboard

**Issue 1 — Recent Jobs Table Rows Not Clickable [HIGH]:**  
Rows show a hover state implying they are interactive, but clicking does nothing. On the Jobs list page, rows correctly navigate to detail. The inconsistency is confusing.

**Issue 2 — Quick Stats Card is a Static Placeholder [HIGH]:**  
Occupying 1/3 of a premium dashboard row with "System is running normally" is wasted. This space should show actionable operational KPIs.

**Issue 3 — Chart Tooltip Uses Wrong Color Palette [LOW]:**  
The Recharts tooltip uses `#E2E8F0` (cool blue-grey border) and the hover cursor uses `#F1F3F7` (cool grey) — both are out of place in the warm brown/cream palette.

**Issue 4 — "Pending Approvals" Counts Blocked Users [MEDIUM]:**  
The query `.eq('is_active', false)` returns ALL inactive users — both newly registered ones awaiting approval AND intentionally blocked ones. A blocked user should not appear as "pending."

**Issue 5 — No Date Context on Chart [LOW]:**  
The chart title says "Last 7 Days" but doesn't show actual dates (e.g., "Jul 11 – Jul 17"). The X-axis only shows weekday abbreviations, which repeat week-over-week. If two Mondays exist in memory, there's ambiguity.

---

---

# PAGE 3: JOBS LIST

**Route:** `/jobs`  
**File:** `src/app/(admin)/jobs/page.tsx`

## Layout Overview

Full-height flex column: `space-y-6 h-full flex flex-col`. From top to bottom: PageHeader → Filter Card → Data Card (table + pagination).

## Component Breakdown

### Page Header

- **Title:** "Jobs Management" — `h1`, 24px bold.
- **Description:** "View and manage all repair jobs."
- **Action:** `Export CSV` button with `Download` 16px icon. Variant: `outline`. Clicking triggers `exportJobsToCSV(filteredJobs)` — downloads a CSV of currently visible (filtered) jobs.

### Filter Bar Card

A `Card noAccentLine p-4 flex flex-wrap gap-4 items-end bg-admin-bg-surface`. This card has no left accent border and pure white background. Contains 4 filter controls + 1 refresh button in a horizontal row that wraps on smaller screens.

**Search Input:**  
`flex-1 min-w-[200px]` — grows to fill available space, minimum 200px. Has a label "Search" above it. Uses the `Input` component with a `Search` icon (16px, `text-admin-text-muted`) absolutely positioned inside on the left (`left-3 top-2.5`). Input has `pl-9` to make space for the icon. Placeholder: "Search by Code, Name, Phone...".  
**Filtering behavior:** Client-side only — filters the already-fetched array in JavaScript. Does NOT trigger a new Supabase query.

**Status Select:**  
`Select` component with label "Status". Options: All Statuses, Received, In Progress, Waiting for Materials, Completed. On change: triggers a new Supabase query (server-side filtering via `.eq('status', ...)`).  
Height: `h-12` (48px). White background, `border-admin-border`, focus ring.

**Technician Select:**  
`Select` component with label "Technician". Dynamically populated with active technicians fetched from the database. Options: All Technicians + each technician by name. Server-side filter.

**Priority Select:**  
`Select` component with label "Priority". Options: All Priorities, Normal, High, Urgent. Server-side filter.

**Refresh Button:**  
Ghost variant, text "Refresh". Classes: `text-admin-accent hover:text-admin-accent-dark hover:bg-admin-accent-dim` — dark ink text, slightly darker on hover, dim ink background on hover. 52px tall (matching `md` button size).

**Height Mismatch:** All four selects and the search input are 48px tall. The Refresh button is 52px (default `md` size). There is a 4px discrepancy making the refresh button fractionally taller in the filter row.

### Jobs Data Card

A `Card` (with left accent border) in `flex-1 flex flex-col overflow-hidden`. Stretches to fill remaining page height.

**Table Header (`thead`):**  
`bg-admin-bg-surface sticky top-0 z-10 border-b border-admin-border text-xs uppercase tracking-wider text-admin-text-secondary` — sticky header (stays at top during scroll), cream background, uppercase small text with letter spacing.  
Columns: JOB CODE · CUSTOMER · DEVICE · TECHNICIAN · STATUS · PRIORITY · ACTIONS

**Table Rows:**  
`hover:bg-admin-bg-hover cursor-pointer transition-colors` — rows are clickable, show warm beige on hover, pointer cursor. `onClick={() => openJobDetail(job)}` routes to `/jobs/${job.id}`.

**Job Code Cell:** `px-6 py-4 font-medium text-admin-text-primary` — bold warm ink.

**Customer Cell:** Two-line layout:
- Top line: `font-medium text-admin-text-primary` — customer name, bold.
- Bottom line: `text-admin-text-secondary text-xs` — contact number in small muted text.

**Device Cell:** `text-admin-text-secondary` — device type as plain secondary text.

**Technician Cell — Assigned State:**  
Technician name with an `Edit` (pencil) icon button inline: `text-admin-text-muted hover:text-admin-accent transition-colors`. Title attribute: "Reassign Technician". Clicking opens the `ReassignTechnicianModal`. `e.stopPropagation()` prevents row click from triggering.

**Technician Cell — Unassigned State:**  
A small pill button: `text-admin-accent hover:underline font-medium text-xs bg-admin-accent-dim px-2 py-1 rounded`. Text: "Assign Tech". Background: the dim warm ink. No border. Opens reassign modal on click.

**Status Cell:** `StatusBadge` component — a pill badge with variant-mapped colors:
- Received: grey `bg-admin-bg-subtle text-admin-text-secondary`
- In Progress: blue `bg-admin-progress-bg text-admin-progress-fg`
- Waiting for Materials: gold `bg-admin-pending-bg text-admin-pending-fg`
- Completed: green `bg-admin-completed-bg text-admin-completed-fg`
- Delivered: neutral grey

**Priority Cell:** `PriorityBadge` component:
- Normal: grey neutral
- High: gold warning
- Urgent: red danger

**Actions Cell:** `text-right` aligned. Contains a single eye icon button (`Eye` 18px) — `text-admin-text-muted hover:text-admin-accent`. This is the only explicit "view" action in the row, but clicking the entire row already navigates to detail — making this button redundant.

### Pagination Bar

Rendered by `Pagination` component at the card's bottom when `totalPages > 1`.  
`flex items-center justify-between px-6 py-3 border-t border-admin-border bg-admin-bg-base` — thin cream bar separated from the table.

**Left:** "Page X of Y" text in `text-sm text-admin-text-secondary` with bolded numbers.  
**Right:** Two `outline` variant, `sm` size buttons: `← Previous` and `Next →` with chevron icons. Disabled when at first/last page (`opacity-50`). 20 items per page (`PAGE_SIZE = 20`).

### Reassign Technician Modal

**Trigger:** Clicking the pencil icon or "Assign Tech" pill in the technician column.  
**Backdrop:** `fixed inset-0 bg-black/50 z-50` — full-screen 50% black overlay.  
**Modal Card:** White `bg-admin-bg-surface rounded-xl shadow-modal w-full max-w-md` (max 448px). No backdrop blur (unlike the Add Staff modal which uses `backdrop-blur-sm`).

**Modal Header:** `px-6 py-4 border-b border-admin-border bg-admin-bg-subtle` — cream background strip.  
Left: Title "Reassign Technician" in `font-bold text-admin-text-primary`.  
Right: `X` close button in muted color, no `aria-label`.

**Modal Body:**  
Info text: "Reassigning Job **RS-XXXX** (DeviceType)" — job code in `<strong>`.  
Error banner (if selection error): red background banner.  
Label "Select Technician" + `Select` dropdown populated with active technicians.

**Modal Footer:** `px-6 py-4 border-t border-admin-border bg-admin-bg-subtle flex justify-end gap-3` — cream footer.  
`Cancel` (outline variant) and `Save Assignment` (primary variant) buttons.  
Save shows spinner and disables during the Supabase update.

### UX Observations — Jobs List

**Issue 1 — Client-Side Search vs. Server-Side Filters [MEDIUM]:**  
The search field (by code, name, phone) filters the 20 already-loaded records in JavaScript. If a job is on page 3 and the admin searches for it by name, it won't appear because the search only sees the current page. Server-side search via Supabase's `.ilike()` is needed.

**Issue 2 — Eye Icon is Redundant [LOW]:**  
The eye icon in the Actions column navigates to job detail — but clicking the row itself does the same. Two triggers for the same action adds confusion without value.

**Issue 3 — Reassign Modal has Inconsistent Backdrop [LOW]:**  
The Reassign modal uses `bg-black/50` with no blur. The Add Staff modal uses `bg-admin-bg-dark/80 backdrop-blur-sm`. Inconsistency between modal backdrop treatments.

**Issue 4 — No Date Range Filter [MEDIUM]:**  
Jobs can only be filtered by status, technician, and priority. There is no way to filter by date created, which is essential for reviewing "jobs this week" or "jobs this month."

---

---

# PAGE 4: JOB DETAIL

**Route:** `/jobs/[id]`  
**File:** `src/app/(admin)/jobs/[id]/page.tsx`

## Layout Overview

Full-height flex column: PageHeader → Tab Navigation Bar → Tab Panel Content Area. This is the most complex page in the application with 4 tabs, inline editing, billing calculation, materials management, and action buttons.

## Component Breakdown

### Page Header

- **Title:** "Job RS-XXXX" — dynamic job code, 24px bold.
- **Description:** "Manage customer job details, assignment, and billing."
- **Actions:** Two buttons side by side:
  1. `Print Receipt` — outline variant, `Printer` 16px icon left. Opens a print window with receipt HTML.
  2. `Back to Jobs` — ghost variant, `ArrowLeft` 16px icon left. Routes back to `/jobs`.

### Tab Navigation Bar

A `div flex space-x-2 border-b border-admin-border bg-admin-bg-surface px-4 pt-4 rounded-t-xl overflow-x-auto`. White background, thin bottom border, rounded top corners (20px), horizontally scrollable.

4 tab buttons:

| Tab | Icon | Route Key |
|---|---|---|
| Overview | Briefcase | `overview` |
| Materials | Plus | `materials` |
| Billing | FileText | `billing` |
| Notes & Activity | MessageCircle | `notes` |

**Tab Button — Inactive:** `flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-admin-text-secondary hover:text-admin-text-primary hover:bg-admin-bg-hover whitespace-nowrap`. Bottom border invisible, secondary color text, warm beige on hover.

**Tab Button — Active:** `border-admin-accent text-admin-accent bg-admin-accent-dim`. Dark ink bottom border (2px), dark ink text, dim ink background. The active state uses the near-black ink color — it is visually very distinct.

### Tab 1: Overview

A `grid grid-cols-1 lg:grid-cols-2 gap-6`.

**Card 1 — Customer & Device Info:**  
Standard `Card` with left accent border. Header: title "Customer & Device Info" with an `Edit` ghost button on the right.

**View State (non-editing):**  
Two info grids inside the card body:

Grid 1 (3 fields — Customer):  
`grid grid-cols-2 gap-4 bg-admin-bg-subtle p-4 rounded-lg` — cream background rectangle.
- Customer Name (spans 1 col)
- Contact (spans 1 col)
- Email (spans 2 cols — full width)

Each field: label in `text-admin-text-muted text-xs uppercase tracking-wider` and value in `font-medium text-admin-text-primary`.

Grid 2 (3 fields — Device):  
Same cream rectangle layout.
- Device Type (1 col)
- Reported Issue (1 col)
- Remarks (2 cols — full width)

**Edit State (isEditing=true):**  
Replaces the view grid with a form using `Input`, `Select` components for all editable fields. Save/Cancel buttons appear at the bottom.

**Card 2 — Job Configuration:**  
Header: "Job Configuration". Two cream info grids:

Grid 1: Status (with `StatusBadge`) · Priority (with `PriorityBadge`) · Job Type · Technician Name  
Grid 2: Job Code · Created At · Completed At · Technician Phone

**Action Buttons Row:**  
Horizontal button strip at bottom of the right card:
- `WhatsApp` button — `MessageCircle` icon, outline style, opens `wa.me/` URL in new tab
- `Email Invoice` button — `Mail` icon, outline style, calls Edge Function to send invoice email
- `Print Invoice` — `Printer` icon, outline style
- `View on Map` — `MapPin` icon, ghost style (only if onsite job)

### Tab 2: Materials

Lists `job_materials` for the job. A Card with a full-width table:

| Column | Content |
|---|---|
| Material Name | Text, `font-medium` |
| Quantity | Number |
| Unit Cost | `₹X.XX` formatted |
| Total | `₹X.XX` (qty × unit cost) |
| Actions | Trash2 delete button |

**Add Material Row:**  
At the bottom of the card, an inline input form:
3 inputs side by side (name, quantity, unit cost) with `+` button to add a material.  
Uses raw `Input` components. No label for the inline row — relies on placeholder text.

**Parts Total Summary:**  
Below the table: `Parts Total: ₹X.XX` in `font-bold`.

### Tab 3: Billing

A billing summary and calculation panel.

**Billing Form:**  
4 labeled input fields:
- Labour Charge (₹) — numeric Input
- Tax % — numeric Input  
- Discount (₹) — numeric Input  
- Payment Status — checkbox: "Paid" / "Unpaid"

**Live Grand Total Preview:**  
`Grand Total: ₹X.XX` — calculated in real-time using `calculateGrandTotal()`. Updates as inputs change.  
Formula: `(parts_total + labour_charge) × (1 + tax_percent/100) − discount`

**Save Billing Button:** Primary variant, full width or end-aligned. On save: calls `alert('Billing saved successfully')`.

**Billing Summary Display (if billing exists):**  
Shows existing billing record: parts total, labour, tax, discount, grand total, and paid status.

### Tab 4: Notes & Activity

A full-width Card with a textarea:  
Raw `<textarea>` element (not the `Input` component). Styled with inline class string: `w-full bg-admin-bg-surface border rounded-md px-3 py-2 text-sm text-admin-text-primary focus:outline-none focus:ring-1 focus:ring-admin-accent focus:border-admin-accent` — matches design system visually but is not a reusable component.  
Rows: 8. Below: a "Save Notes" primary button. On save: calls `alert('Notes saved successfully')`.

### State Variations

**Loading State:** Renders `div p-10` containing `LoadingState`. A centered spinner with "Loading job details..." message.  
**Error State:** Renders `div p-10` containing `ErrorState`. Red circle icon, "Something went wrong" title, error message, "Try Again" outline button.

### UX Observations — Job Detail

**Issue 1 — alert() Used Extensively [CRITICAL]:**  
`alert()` is called for: notes saved, billing saved, email sent, email error, validation failures. Browser alert dialogs block the page, cannot be styled, and break the premium experience.

**Issue 2 — Tab Icon for "Materials" is `Plus` [LOW]:**  
The Materials tab uses a `Plus` icon. A more semantically appropriate icon would be `Package`, `Wrench`, or `Layers`.

**Issue 3 — Add Material Row Has No Labels [LOW]:**  
The inline add-material form relies on placeholder text ("Name", "Qty", "₹ Cost") instead of visible labels. When the input is filled, there is no visible label for the user to confirm they've entered the right value in the right field.

**Issue 4 — Billing Form Uses alert() for Success [CRITICAL]:**  
After saving billing, `alert('Billing saved successfully')` blocks the page. Should use a toast notification.

**Issue 5 — Notes Textarea is Not a Component [LOW]:**  
The textarea in the Notes tab is a raw element with inline class strings. A reusable `<Textarea>` component would allow consistent future styling.

**Issue 6 — WhatsApp Contact Not Clickable in View Mode [LOW]:**  
The customer contact number is displayed as plain text in the Overview tab. It could be rendered as a `tel:` link for one-tap calling on mobile, or a WhatsApp deep link.

---

---

# PAGE 5: CREATE JOB

**Route:** `/jobs/new`  
**File:** `src/app/(admin)/jobs/new/page.tsx`

## Layout Overview

Two states: **Form State** (job creation form) and **Success State** (post-creation confirmation).

**Form State:** `space-y-6 max-w-5xl mx-auto h-full flex flex-col pb-10`. Centered, max 1280px wide, vertically stacked.

**Success State:** `space-y-6 max-w-2xl mx-auto mt-10`. Narrower, centered, single card.

## Component Breakdown

### Page Header (Form State)

- **Title:** "Create New Job"
- **Description:** "Register a new repair job and assign it to a technician."
- **Action:** `Back to Jobs` ghost button with `ArrowLeft` icon.

### Form Layout

A `form` wrapping a `grid grid-cols-1 md:grid-cols-2 gap-6`. Two columns on medium+ screens, stacked on small.

### Card 1 — Customer Details (left column)

Card with accent border. Header title: "Customer Details" in `h3 text-lg font-semibold`.  
Body: `p-6 pt-0 space-y-4 mt-4`

**Customer Name field:**  
Label: "Customer Name *" (asterisk denotes required). Input with error border `border-admin-urgent-fg` when invalid (replaces normal `border-admin-border`). Error text: `text-xs text-admin-urgent-fg mt-1` below input.

**Contact Number field:**  
Label: "Contact Number *". Type: `tel`. Placeholder: "e.g. 9876543210". Same error pattern.

**Email Address field:**  
Label: "Email Address" (no asterisk — optional). Type: `email`. Placeholder standard email format.

### Card 2 — Device & Issue (right column)

**Device Type field:**  
Label: "Device Type". `Select` dropdown with 3 options only: Laptop, PC, Other. This is very limited for a repair shop.

**Reported Issue field:**  
Label: "Reported Issue *". Raw `<textarea>` (not a component) with `rows={3}`. Has error state via conditional class. Error text shown below if empty.

**Remarks field:**  
Label: "Remarks" (optional). Raw `<textarea>` with `rows={2}`. Placeholder: "Physical damages, included accessories..."

### Card 3 — Configuration & Assignment (full width — spans 2 columns)

`Card className="md:col-span-2"` — stretches the full row.  
Header: "Configuration & Assignment".  
Body: `grid grid-cols-1 md:grid-cols-3 gap-6` — 3 equal columns.

**Priority Select:** Options: Normal, High, Urgent.  
**Job Type Select:** Options: Inhouse, Onsite.  
**Assign Technician Select:** Dynamic list of active technicians, format: "Name (phone or email)". Has required validation.

**Footer Strip:**  
`bg-admin-bg-subtle border-t border-admin-border flex justify-end p-6` — cream strip inside the card at the bottom. Contains the `Create Job` primary button with `PlusCircle` icon.

### Success State

Triggered after successful job creation. Replaces the form entirely.

**Success Card:**  
`Card className="text-center py-10"` with accent border. Centered content.

**Success Icon:**  
`mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-6` — a 80×80px light green circle. Contains `CheckCircle2` at 40px in `text-green-600`. **Uses Tailwind defaults `green-100`/`green-600` instead of the design system's `admin-completed-bg`/`admin-completed-fg`.**

**Job Created Text:**  
`h2 text-3xl font-bold text-admin-text-primary` — "Job Created!"  

**Job Code Display:**  
`inline-block bg-admin-bg-subtle px-6 py-3 rounded-full text-2xl font-mono text-admin-text-secondary` — the generated job code (e.g., RS-2026-0042) displayed in JetBrains Mono (monospace) font in a rounded pill. Subtle cream background.

**Action Buttons Row:**  
`flex flex-col sm:flex-row gap-4 justify-center mt-8` — 3 buttons:
1. `Print Receipt` — primary variant, `Printer` 18px icon
2. `View Job` — outline variant, `Eye` 18px icon → navigates to job detail
3. `Create Another` — ghost variant → resets form to initial state

### UX Observations — Create Job

**Issue 1 — Technician is Required [MEDIUM]:**  
Validation requires a technician to be assigned before job creation. In a real shop, jobs are often received before an available technician is known. The field should be optional, allowing unassigned jobs.

**Issue 2 — Device Type Only 3 Options [LOW]:**  
Laptop / PC / Other is insufficient. Modern repair shops handle phones, tablets, printers, smart TVs, and more.

**Issue 3 — Hardcoded Green Color in Success State [LOW]:**  
`bg-green-100 text-green-600` should be `bg-admin-completed-bg text-admin-completed-fg` for design system consistency.

**Issue 4 — Textarea Components Are Raw Elements [LOW]:**  
Both "Reported Issue" and "Remarks" use inline-styled raw `<textarea>` elements instead of a shared `<Textarea>` component.

**Issue 5 — alert() on Failure [CRITICAL]:**  
If job creation fails, `alert(err.message || 'Failed to create job')` blocks the browser. Should be an inline error banner or toast.

---

---

# PAGE 6: STAFF MANAGEMENT

**Route:** `/staff`  
**File:** `src/app/(admin)/staff/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. From top: PageHeader → Filter Card → Staff Table Card → Modals (conditionally rendered).

## Component Breakdown

### Page Header

- **Title:** "Staff Management"
- **Description:** "Manage your team, their roles, and approve access."
- **Action:** `Add Staff` primary button with `Plus` 18px icon. Opens `AddStaffModal`.

### Filter Card

`Card noAccentLine p-4 flex flex-wrap gap-4 items-end`. Two Select dropdowns + Refresh button.

**Role Select:** `w-48` fixed width. Options: All Roles, Admin, Receptionist, Technician. Server-side filter.  
**Status Select:** `w-48` fixed width. Options: All Statuses, Active, Pending/Blocked. Server-side filter via `.eq('is_active', ...)`.  
**Refresh button:** Ghost variant, `text-admin-accent` ink color.

**Missing:** No search by name/email input. If a shop has 20+ staff, finding a specific person requires scrolling the full list.

### Staff Table Card

`Card flex-1 flex flex-col overflow-hidden`. Full-height card.

**Table Header:**  
`bg-admin-bg-subtle sticky top-0 z-10 border-b border-admin-border`. Cream sticky header.  
Columns: Name · Contact · Role · Status · Joined · Actions (right-aligned)

**Table Rows:** `hover:bg-admin-bg-hover transition-colors` — warm beige hover, no pointer cursor (rows are NOT clickable — no navigation).

**Name Cell:** `font-medium text-admin-text-primary`  
**Contact Cell:** Two-line — email on top (`text-admin-text-primary`), phone below in `text-xs`. If no phone: "No phone" in muted text.  
**Role Cell:** `capitalize text-admin-text-secondary` — role shown in title case.  
**Status Cell:** `Badge` component:
- Active: `variant="success"` — green pill
- Pending/Blocked: `variant="warning"` — gold pill

**Joined Cell:** `new Date(user.created_at).toLocaleDateString()` — locale date string.

**Actions Cell:** `text-right space-x-2`. Up to 2 icon buttons:

1. **View Attendance Button** (always shown):  
`p-2 rounded-md inline-flex`. Background: `bg-admin-accent-dim` (dim ink). Icon: `CalendarDays` 16px in `text-admin-accent`. On hover: `bg-admin-accent text-white` — full dark ink fill.  
Title attribute: "View Attendance" (no `aria-label`).

2. **Block User Button** (if active):  
`p-2 rounded-md inline-flex`. Background: `bg-admin-danger-dim` (light red). Icon: `Ban` 16px in `text-admin-danger`. On hover: `bg-admin-danger text-white` — full red fill.  
Title: "Block User" (no `aria-label`).

3. **Approve User Button** (if inactive):  
`p-2 rounded-md inline-flex`. Background: `bg-admin-accent/10`. Icon: `Check` 16px in `text-admin-accent`. On hover: `bg-admin-accent text-white`.  
Title: "Approve User" (no `aria-label`).

**Action buttons have color-coded hover states** — a nice detail that provides visual feedback about the action type (ink = neutral, red = destructive).

### Add Staff Modal

**Trigger:** "Add Staff" button in page header.  
**Backdrop:** `fixed inset-0 z-50 bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in` — blurred dark backdrop.  
**Modal Card:** `bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl max-w-md w-full animate-scale-in max-h-[90vh]` — standard white card, max 448px, scrollable body.

**Modal Header:**  
`flex justify-between items-center p-6 border-b border-admin-border`.  
Title: "Add New Staff" in `text-xl font-bold` (21px). Close: `X` icon 24px.

**Error Banner:** Uses hardcoded Tailwind classes `bg-red-50 text-red-600 rounded-md` — **does NOT use design system tokens** (`bg-admin-urgent-bg / text-admin-urgent-fg`). Inconsistency.

**Form Fields:** 5 fields: Full Name, Email Address, Phone Number, Role (select), Temporary Password.  
The inputs use raw `<input>` elements (not the `Input` component): `w-full rounded-md border border-admin-border p-2 bg-admin-bg-base text-admin-text-primary focus:ring-2 focus:ring-admin-accent focus:outline-none`. The styling is nearly identical to the `Input` component but not the same component — `p-2` instead of `py-2 px-3`, and no `h-12` height constraint. Input heights are therefore variable/auto.

**Password field:** Type is `text` (not `password`) — password is visible while typing! This is a security UX problem. The label says "Temporary Password" but the input reveals characters.

**Modal Footer:** `flex justify-end gap-2 pt-4`. Cancel (ghost) + Add Staff (primary) buttons.

### Attendance Modal

**Trigger:** Clicking the calendar icon in a staff row.  
**Backdrop:** `fixed inset-0 bg-black/50 z-50` — 50% black overlay (no blur — inconsistency with Add Staff modal's `backdrop-blur-sm`).  
**Modal Card:** `bg-admin-bg-surface rounded-xl shadow-modal w-full max-w-4xl max-h-[90vh]` — wider modal (max 896px).

**Modal Header:** `px-6 py-4 border-b bg-admin-bg-subtle flex justify-between`. Cream strip. Title: "Attendance: {name} (Last 30 Days)".

**Table:** Inside scrollable body. Columns: Date · Status · Check In · Check Out · Selfie · GPS

**Status Column:**  
Inline `span` with conditional classes (not using the `Badge` component): 
- Present: green
- Halfday: gold
- Absent: red
- Other: grey

**Selfie Column:** If a signed URL exists: `<a href={...} target="_blank">` with `ImageIcon` + "View" text. If none: "N/A" muted.  
**GPS Column:** If lat/lng exist: `<a href="https://maps.google.com/?q=...">Map</a>` link. If none: "--".

### Confirmation Modal (Block/Approve)

**Structure:**  
Full-screen backdrop: `fixed inset-0 z-50 flex items-center justify-center p-4 bg-admin-bg-dark/80 backdrop-blur-sm` — dark with blur.  
Card: `bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl max-w-sm w-full p-6` — white, 384px max, 24px padding.

**Header:** Icon block (circle with `AlertTriangle`) + title side-by-side. Color: red for destructive, dark ink for approve.  
**Body:** `text-admin-text-secondary text-sm mb-6` — descriptive message.  
**Footer:** `flex justify-end gap-3` — Cancel (ghost) + Confirm (danger or primary) buttons.

### UX Observations — Staff

**Issue 1 — No Error Handling [HIGH]:**  
`fetchStaff()` silently ignores Supabase errors. Network failure shows an empty table with "No staff found."

**Issue 2 — Temporary Password in Plaintext [HIGH]:**  
The AddStaffModal password field is `type="text"` — the password is visible as the admin types. This is a security UX failure.

**Issue 3 — No Name Search [MEDIUM]:**  
No text search for staff names. With 20+ staff, the only filtering options are role and status.

**Issue 4 — Action Buttons Missing aria-label [CRITICAL]:**  
All 3 icon-only action buttons use `title` but not `aria-label`. Screen readers cannot identify these buttons.

**Issue 5 — Error Banner in AddStaffModal Uses Wrong Tokens [LOW]:**  
`bg-red-50 text-red-600` instead of `bg-admin-urgent-bg text-admin-urgent-fg`.

**Issue 6 — Inconsistent Modal Backdrop Blur [LOW]:**  
AddStaffModal uses `backdrop-blur-sm`. AttendanceModal and ReassignModal use no blur.

**Issue 7 — Staff Rows Not Clickable [LOW]:**  
Clicking a staff row does nothing. There is no staff profile/detail page. All actions require the tiny icon buttons.

---

---

# PAGE 7: INVENTORY

**Route:** `/inventory`  
**File:** `src/app/(admin)/inventory/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. PageHeader → Search/Alert Card → Inventory Table Card → Modal (conditional).

## Component Breakdown

### Page Header

- **Title:** "Inventory"
- **Description:** "Manage your shop's parts and materials."
- **Action:** `Add Item` primary button with `Plus` 16px icon.

### Search & Alert Card

`Card noAccentLine p-4 flex flex-wrap gap-4 items-center justify-between`.

**Search Input:**  
`relative flex-1 min-w-[250px] max-w-sm`. Search icon inside, `Input` component with `pl-9`. Placeholder: "Search items...". Client-side filter.

**Low Stock Alert (conditional):**  
`flex items-center gap-2 text-admin-danger bg-admin-danger-dim px-4 py-2 rounded-lg font-medium text-sm border border-admin-danger/20` — a red-tinted alert pill. Contains `AlertTriangle` 16px icon and text: "X items are running low!". Appears dynamically when `inventory.filter(qty <= threshold).length > 0`.

### Inventory Table Card

`Card flex-1 flex flex-col overflow-hidden`.

**Table Header:** Cream sticky header.  
Columns: Item Name · Quantity · Unit · Threshold · Last Updated · Actions

**Table Rows — Normal Stock:**  
`transition-colors hover:bg-admin-bg-hover` — warm beige hover. No pointer cursor (not clickable).

**Table Rows — Low Stock:**  
Additional class: `bg-orange-50/50` — a very subtle orange-tinted row background. **This uses Tailwind default `orange-50` instead of a design system token.** The intent is correct (visual warning) but the implementation is inconsistent.

**Item Name Cell:** `px-6 py-4 font-medium text-admin-text-primary flex items-center gap-2`.  
If low stock: prepends a small `AlertTriangle` 14px in `text-admin-danger`. If normal: just the item name.

**Quantity Cell:**  
- Low stock: `font-bold text-admin-danger` — red bold number
- Normal: `font-bold text-admin-text-primary` — dark ink bold number

**Unit Cell:** `text-admin-text-secondary` — value or `-` if not set.  
**Threshold Cell:** `text-admin-text-secondary` — the numeric threshold.  
**Last Updated Cell:** `text-admin-text-secondary` — full locale date+time string.

**Actions Cell:** `text-right space-x-2`. Two icon buttons:

1. **Edit Button:** `p-2 rounded-md inline-flex bg-admin-accent-dim text-admin-accent hover:bg-admin-accent hover:text-white`. Icon: `Edit2` 16px.  
2. **Delete Button:** `p-2 rounded-md inline-flex bg-admin-danger-dim text-admin-danger hover:bg-admin-danger hover:text-white`. Icon: `Trash2` 16px.

Both use `title` attribute but no `aria-label`.

### Inventory Form Modal (Add/Edit)

**Backdrop:** `fixed inset-0 bg-black/50 z-50` — 50% black, no blur.  
**Card:** `bg-admin-bg-surface rounded-xl shadow-modal max-w-md` — 448px.

**Header:** Dynamic title: "Edit Item" or "Add Inventory Item". `X` close icon.

**Error Banner:** `p-3 bg-admin-urgent-bg text-admin-urgent-fg rounded border border-admin-urgent-fg/20` — correct design tokens (unlike AddStaffModal).

**Form Fields:**
1. **Item Name*** — full width `Input` component. Placeholder: "e.g. iPhone 13 Screen".
2. **Quantity** (grid col 1) + **Unit (optional)** (grid col 2) — `grid grid-cols-2 gap-4`. Both use `Input` component.
3. **Low Stock Threshold** — full width. Help text below: `text-xs text-admin-text-muted mt-1`.

**Footer:** Cream strip with Cancel (outline) + Save Item (primary with loader).

### UX Observations — Inventory

**Issue 1 — No Error Handling [HIGH]:**  
`fetchInventory()` ignores Supabase errors. Network failure shows empty table.

**Issue 2 — Native confirm() for Delete [HIGH]:**  
`window.confirm()` is used for delete confirmation — the only page that still uses this instead of `ConfirmationModal`.

**Issue 3 — Low Stock Row Uses Non-System Color [LOW]:**  
`bg-orange-50/50` is not a design token. Should be a warm variant of `admin-urgent-bg` or a custom token.

**Issue 4 — No Cost/Price Column [MEDIUM]:**  
Inventory table shows no price per unit or total stock value. This is a significant functional gap for a shop needing to estimate parts costs.

**Issue 5 — Action Buttons Missing aria-label [CRITICAL]:**  
Both edit and delete icon buttons lack `aria-label`.

**Issue 6 — Last Updated Shows Full Timestamp [LOW]:**  
`toLocaleString()` shows date AND time, e.g., "7/17/2026, 2:30:45 PM". For items that are updated frequently, only the date might be sufficient — the time clutter reduces scannability.

---

---

# PAGE 8: REPORTS

**Route:** `/reports`  
**File:** `src/app/(admin)/reports/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. PageHeader → Tab Navigation → Active Tab Content.

## Component Breakdown

### Page Header

- **Title:** "Reports"
- **Description:** "Analyze shop performance and history."
- **Actions:** None.

### Tab Navigation Bar

`div flex space-x-2 border-b border-admin-border bg-admin-bg-surface px-4 pt-4 rounded-t-xl`. **Note:** This div has `rounded-t-xl` but is rendered as a standalone element before the tab content. The tab content below uses its own card styling, causing a visual gap and rounding mismatch at the junction.

3 tabs:

| Tab | Icon | Key |
|---|---|---|
| Technician Performance | Users | `tech` |
| Customer History | History | `customer` |
| Revenue | DollarSign | `revenue` |

Tab styles match the Job Detail pattern exactly (same class strings, same active/inactive states). Active: dark ink bottom border, dim ink background. Inactive: transparent border, secondary text.

### Tab 1: Technician Performance

**Loading State:** Centered `LoadingState` with "Loading performance data..." message.  
**Empty State:** `EmptyState` with Users icon — "No data available / No jobs have been completed this month yet."

**Data State:** `grid grid-cols-1 xl:grid-cols-2 gap-6` — bar chart on left, breakdown table on right.

**Horizontal Bar Chart (left):**  
`Card h-96 flex flex-col`. Height: 384px. Title: "Jobs Completed (This Month)".  
`BarChart layout="vertical"` — horizontal bars, one per technician.
- X-Axis: job count (integer)
- Y-Axis: technician names as category
- Bars: dark ink fill, `radius={[0, 4, 4, 0]}` (rounded right end), `barSize={32}`
- Shows month-to-date completed jobs per technician

**Technician Breakdown Table (right):**  
A card with table. Columns: Technician · Completed Jobs.  
Rows: technician name (left) + count (right, `font-bold`). Hover: warm beige.

**Missing:** No date range selector. Data is always current month only. No way to see last month's performance.

### Tab 2: Customer History

A single full-height `Card`. Header: "Customer Job History".  
Search section: `flex items-center gap-4 max-w-xl`.  
- `Input` with `Search` icon inside (`pl-9`). Placeholder: "Search by Name or Phone..."  
- `onKeyDown`: pressing Enter triggers search. 
- `Search` primary button next to input. Shows loading state during query.

**Table:** Columns: Job Code · Customer · Device · Status · Created  
Rows: clickable hover (warm beige) but **no onClick** handler — rows appear interactive but do nothing.  
Status shown via `StatusBadge`.

**Initial Empty State:** "No jobs found / Search for a customer to view their history." — uses `History` icon.  
**Search Empty:** "No jobs found for this customer."

### Tab 3: Revenue

**Loading:** Centered spinner.  
**Data State:** 3 metric cards + recent invoices table.

**Revenue Metric Cards:**  
`grid grid-cols-1 md:grid-cols-3 gap-6` — 3 equal cards.

| Card | Label | Value Styling |
|---|---|---|
| Total Revenue (This Month) | `text-sm font-medium text-admin-text-secondary` | `text-3xl font-bold text-admin-text-primary` |
| Labour Revenue | Same label style | `text-3xl font-bold text-admin-accent` (ink color) |
| Parts Revenue | Same label style | `text-3xl font-bold text-admin-text-secondary` (muted-ish) |

Values rendered as `₹X.XX` with `.toFixed(2)`.

**Recent Invoices Table:**  
`Card flex flex-col`. Columns: Job Code · Customer · Date · Amount · Status  

Amount: `font-bold text-admin-text-primary text-right`  
Payment Status: An inline `span` (NOT using the `Badge` component): 
- Paid: `px-2 py-1 rounded-full text-xs font-medium bg-admin-completed-bg text-admin-completed-fg`  
- Unpaid: same structure but `bg-admin-urgent-bg text-admin-urgent-fg`  
This inline status pill is semantically a badge — it should use the `Badge` component for consistency.

**Missing:** No chart visualization on the Revenue tab. The Technician tab has a bar chart; the Revenue tab has only numbers and a table. A revenue-over-time chart would be valuable here.

### UX Observations — Reports

**Issue 1 — Customer History Table Rows Not Clickable [MEDIUM]:**  
Rows have hover styling but no `onClick` — clicking does nothing.

**Issue 2 — Tab Bar Rounding Mismatch [LOW]:**  
Tab bar has `rounded-t-xl` but connects to plain content below, creating visible corner misalignment.

**Issue 3 — No Date Range Filter on Tech Performance [MEDIUM]:**  
Always shows current month. No way to query historical months.

**Issue 4 — Revenue Tab Lacks Chart Visualization [MEDIUM]:**  
Revenue data is only presented as numbers and a table. A line/bar chart of revenue over days/weeks would dramatically improve analytical value.

**Issue 5 — Revenue Status Badge Uses Inline Styles [LOW]:**  
The PAID/UNPAID badge is not using the `Badge` component — a missed reuse opportunity.

---

---

# PAGE 9: SALARY MANAGEMENT

**Route:** `/salary`  
**File:** `src/app/(admin)/salary/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. PageHeader → Tab Navigation → Active Tab Content. Admin-only page with role guard.

## Component Breakdown

### Role Guard (Non-Admin State)

If `role !== 'admin'`: renders `EmptyState` with `Lock` icon (48px red) — "Access Denied / Salary management is restricted to administrators only." Centered on page, no card container.

### Page Header (Admin State)

- **Title:** "Salary Management"
- **Description:** "Calculate payroll, manage staff rates, and record advance salaries."
- **Actions:** None.

### Tab Navigation

`div flex space-x-2 border-b border-admin-border` — identical styling to the Reports tab but **without** `bg-admin-bg-surface px-4 pt-4 rounded-t-xl`. The salary tab bar has less visual framing — no white background, no top padding, no rounded corners. **Inconsistent with the Reports and Job Detail tab bars.**

3 tabs:

| Tab | Icon | Key |
|---|---|---|
| Calculate Salary | Calculator | `calculate` |
| Staff Rates | Settings | `rates` |
| Advance Salary | Wallet | `advance` |

### Tab Content Area

`div flex-1 overflow-y-auto` — scrollable inner area.

**Calculate Tab:** Shows `SalaryCalculatorForm` component (staff picker + date range inputs). On calculation result: shows `SalaryBreakdownCard` below the form.

**Rates Tab:** Shows `StaffRateForm` — a form to set base daily rate, OT rate, early deduction rate per staff member.

**Advance Tab:** Shows `AdvanceSalaryForm` — form to record advance salary payments.

(Sub-components not fully audited in this pass — they are self-contained and merit a separate focused review.)

### UX Observations — Salary

**Issue 1 — Tab Bar Styling Inconsistency [MEDIUM]:**  
Salary tabs lack the `bg-admin-bg-surface px-4 pt-4 rounded-t-xl` wrapper that Reports and Job Detail use. The tab bar sits directly on the cream page background with no visual container — looks bare compared to other tab bars.

**Issue 2 — Tab Pattern Duplicated 3x [LOW]:**  
Same tab button JSX is copy-pasted across Salary, Reports, and Job Detail pages. Extract to a `<Tabs>` common component.

---

---

# PAGE 10: EXPENDITURE TRACKING

**Route:** `/expenditure`  
**File:** `src/app/(admin)/expenditure/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. PageHeader → Summary Cards → Expenditure Form → Filters Card → Table. Admin-only.

## Component Breakdown

### Role Guard

Same `EmptyState` with `Lock` icon as Salary page.

### Page Header

- **Title:** "Expenditure Tracking"
- **Description:** "Record and monitor all business expenses for the selected month."
- **Actions:** None.

### Summary Cards

`ExpenditureSummaryCards` component. Renders a row of metric cards showing totals from the currently loaded payments (materials purchases, daily expenses, office development). Exact styling defined in the sub-component.

### Expenditure Form

`ExpenditureForm` component. A form card for adding a new expenditure record: type selection, description, amount input. Styled with Card wrapper.

### Filters Card

`Card noAccentLine`. Header: "📋 Expenditure History" — **emoji in CardTitle**. The `📋` clipboard emoji appears inline with the text. Inconsistent with all other card headers which use either no icon or a Lucide icon component.

**Filter Controls:** `flex flex-wrap gap-4 items-end`.
1. **Month Input:** `Input type="month"` — a native month picker. `flex-1 min-w-[200px] max-w-xs`.
2. **Type Select:** `Select` dropdown — All Types, Materials Purchase, Daily Expenditure, Office Development.
3. **Search Description:** `Input type="text"` placeholder "Search...". Client-side filter on `description` field.

### Expenditure Table

`ExpenditureTable` component wrapping the filtered `payments` array. Exact table styling in sub-component.

### Loading State

`div flex-1 overflow-hidden` → conditional `LoadingState`. The loading state does not use an error state — fetch errors go uncaught.

### UX Observations — Expenditure

**Issue 1 — Emoji in CardTitle [LOW]:**  
`"📋 Expenditure History"` — only page using emoji in a card header.

**Issue 2 — No Error Handling on Data Fetch [HIGH]:**  
`fetchPayments()` does not have explicit error handling for display. An error results in an empty table silently.

**Issue 3 — No Export for Expenditure [LOW]:**  
Jobs page has CSV export; Expenditure has none. Being able to export expenditure by month would be valuable for accounting.

---

---

# PAGE 11: SETTINGS

**Route:** `/settings`  
**File:** `src/app/(admin)/settings/page.tsx`

## Layout Overview

`space-y-6 h-full flex flex-col`. PageHeader → `grid grid-cols-1 lg:grid-cols-2 gap-6` with a left card (profile) and a right column (2 stacked cards).

## Component Breakdown

### Page Header

- **Title:** "System Settings"
- **Description:** "Manage your profile and application configuration."
- **Actions:** None.

### Card 1 — My Profile (left column)

`Card flex flex-col`. Header has `CardTitle` with a `User` icon (20px, `text-admin-accent`) + "My Profile" text.

**Content:** `grid grid-cols-2 gap-4` — 2 equal info tiles.

Each info tile: `bg-admin-bg-subtle p-4 rounded-lg border border-admin-border` — cream background, rounded, bordered.

| Field | Span | Content |
|---|---|---|
| Name | 1 col | `profile?.name` |
| Role | 1 col | `profile?.role` (capitalized) |
| Email Address | 2 cols (full width) | `profile?.email` |

Each tile has a label in `text-xs text-admin-text-muted uppercase font-semibold mb-1` and value in `font-medium text-admin-text-primary`.

**No edit capability.** No "Edit Profile" button. No password change option. The profile section is purely read-only.

### Card 2 — Environment Config (right column, top)

`Card`. Header: `Globe` icon (20px, `text-admin-accent`) + "Environment Config".

**Supabase URL field:**  
Label: `text-sm font-medium text-admin-text-secondary`.  
Value box: `px-4 py-2 bg-admin-bg-subtle border border-admin-border rounded text-sm text-admin-text-primary font-mono truncate` — uses `font-mono` (JetBrains Mono) for the URL. Displays: "https://abc123defgh456... (Connected)" if configured, "Not Configured" if not. The URL is truncated to 25 characters.

**Environment field:**  
Similar display box. Shows "Development" or "Production" based on `NODE_ENV`.

### Card 3 — Security Info (right column, bottom)

`Card`. Header: `Shield` icon (20px, **`text-purple-500`** — hardcoded Tailwind purple, not a design token!) + "Security Info".

**Content:** `text-sm text-admin-text-secondary leading-relaxed` paragraph:  
"This admin panel connects to the backend securely using Row Level Security (RLS) via your authenticated session. It does not expose service keys. **Final strict RLS enforcement will be implemented in Phase 9.**"

This developer note is visible to all admins in production.

### UX Observations — Settings

**Issue 1 — Read-Only Profile, No Edit [MEDIUM]:**  
Admins cannot change their name, email, or password from the UI. The settings page is purely informational.

**Issue 2 — Hardcoded Purple in Security Card Icon [LOW]:**  
`text-purple-500` instead of a design system token. The Shield icon's purple color is not part of the defined palette anywhere else.

**Issue 3 — Phase 9 Developer Note Visible [LOW]:**  
"Final strict RLS enforcement will be implemented in Phase 9" should be removed before production.

**Issue 4 — Supabase URL Partially Exposed [LOW]:**  
Displaying any part of the infrastructure URL in the UI is unnecessary. A simple "Connected ✓" badge suffices.

**Issue 5 — Page Feels Very Sparse [MEDIUM]:**  
The Settings page has 3 cards, all read-only, with minimal useful information. For an admin panel, users would expect: edit profile, change password, notification preferences, timezone setting, shop details (name, address for invoices), and perhaps system backup.

---

---

# COMMON COMPONENTS VISUAL REFERENCE

## Button Component

**File:** `src/components/common/Button.tsx`  
**Variants and Their Appearance:**

| Variant | Background | Text | Border | Hover |
|---|---|---|---|---|
| `primary` | `#1E1B18` dark ink | White | None | `#000000` darker |
| `secondary` | `#F7F7F5` cream | `#2A2521` ink | None | `#E8E6E1` border |
| `outline` | Transparent | `#2A2521` ink | `#E8E6E1` | cream fill |
| `ghost` | Transparent | `#2A2521` ink | None | cream fill |
| `danger` | `#FDE2E1` soft red | `#C0392B` red | faint red | dimmed red |

**Sizes:** `sm` = 36×auto, `md` = 52×auto, `lg` = 56×auto, `icon` = 52×52px square.

**Loading State:** Spinning `Loader2` icon prepended, disabled state applied.  
**Disabled State:** `opacity-50 pointer-events-none`.  
**Focus Ring:** `focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2`.

**Issue:** `md` button height (52px) mismatches Input/Select height (48px = h-12). Use `size="sm"` in filter bars to align.

---

## Input Component

**File:** `src/components/common/Input.tsx`  
Height: `h-12` (48px). Width: `w-full`. Radius: `rounded-md`. Background: `bg-white`. Text: `text-sm text-admin-text-primary`. Placeholder: `text-admin-text-muted`.  
Normal border: `border-admin-border`.  
Error border: `border-admin-danger`.  
Focus: `focus-visible:ring-2 focus-visible:ring-admin-accent focus-visible:ring-offset-2`.

---

## Select Component

**File:** `src/components/common/Select.tsx`  
Identical styling to `Input` — same height (48px), same border, same focus ring. Background: `bg-white`. Uses native `<select>` element — no custom dropdown arrow styling.  
Native dropdowns can appear inconsistent across browsers and OSes — Windows, Mac, and iOS render `<select>` differently.

---

## Badge Component

**File:** `src/components/common/Badge.tsx`  
A small pill: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium tracking-wide`.

| Variant | Background | Text | Border |
|---|---|---|---|
| `default` | cream `admin-bg-subtle` | secondary brown | `admin-border` |
| `accent` | blue `admin-progress-bg` | blue `admin-progress-fg` | faint blue |
| `success` | green `admin-completed-bg` | green `admin-completed-fg` | faint green |
| `warning` | gold `admin-pending-bg` | gold `admin-pending-fg` | faint gold |
| `danger` | red `admin-urgent-bg` | red `admin-urgent-fg` | faint red |
| `neutral` | cream `admin-bg-subtle` | secondary brown | `admin-border` |

Used by: `StatusBadge` (wraps Badge) and `PriorityBadge` (wraps Badge).

---

## LoadingState Component

**File:** `src/components/common/LoadingState.tsx`  
Centered flex column: `py-12 text-center`. Contains spinning `Loader2` icon (32px, `text-admin-accent` dark ink) + message text (14px, `text-admin-text-secondary`). Can optionally render inside a `Card noAccentLine` wrapper.

---

## EmptyState Component

**File:** `src/components/common/EmptyState.tsx`  
Centered flex column: `py-12 text-center`. Icon (custom, default: `Inbox` 48px muted) + `h3` heading (18px medium, primary text) + optional subtext (14px secondary, max-width 384px) + optional action button. Can render inside a `Card noAccentLine` wrapper.

---

## ErrorState Component

**File:** `src/components/common/ErrorState.tsx`  
Centered flex column. A 48×48px circle with `bg-admin-danger-dim` (light red) background containing `AlertCircle` 24px in red. `h3` heading "Something went wrong" (18px semi-bold). Message text. Optional "Try Again" outline button with `RefreshCw` icon.

---

## ConfirmationModal Component

**File:** `src/components/common/ConfirmationModal.tsx`  
Full-screen backdrop: `bg-admin-bg-dark/80 backdrop-blur-sm animate-fade-in` — dark blur.  
Card: `bg-admin-bg-surface border border-admin-border rounded-xl shadow-xl max-w-sm w-full p-6`. 384px max width. 24px padding.  
Header: Icon circle (red for destructive, dark for non-destructive) + `AlertTriangle` + title.  
Body: Description text.  
Footer: Cancel (ghost) + Confirm (danger or primary) buttons right-aligned.

**NOTE:** `animate-fade-in` and `animate-scale-in` are referenced but these animations are not defined in `globals.css` or any Tailwind config visible in this audit. They may be missing or stripped.

---

## PageHeader Component

**File:** `src/components/common/PageHeader.tsx`  
`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4`.  
Left: `h1` (`text-2xl font-bold text-admin-text-primary tracking-tight`) + optional `p` description (14px secondary).  
Right: `flex items-center gap-3` actions slot.  
No border, no background, no card — pure layout component sitting on the page canvas.

---

---

# MASTER ISSUE SUMMARY TABLE

| ID | Severity | Page / Component | Issue |
|---|---|---|---|
| C1 | CRITICAL | Job Detail, Create Job | `alert()` used for all success/error feedback |
| C2 | CRITICAL | Inventory | `confirm()` used for delete instead of ConfirmationModal |
| C3 | CRITICAL | Staff, Inventory, Jobs | Icon buttons missing `aria-label` |
| H1 | HIGH | Staff, Inventory, Expenditure | No error state on data fetch failure |
| H2 | HIGH | Topbar | Bell shows static red dot with no handler |
| H3 | HIGH | Global Shell | No responsive sidebar collapse |
| H4 | HIGH | All Modals | No focus management or Escape key close |
| H5 | HIGH | Dashboard | Recent Jobs rows not clickable |
| H6 | HIGH | Dashboard | Quick Stats card is empty placeholder |
| H7 | HIGH | Login | No Forgot Password |
| H8 | HIGH | Add Staff Modal | Password field is type="text" — visible |
| M1 | MEDIUM | Button + filter bars | Button height (52px) mismatches Input (48px) |
| M2 | MEDIUM | Job Detail, Create Job | No breadcrumbs — navigation context lost |
| M3 | MEDIUM | Sidebar | 9 items including Create Job as standalone |
| M4 | MEDIUM | Topbar | Empty left zone — no page title or search |
| M5 | MEDIUM | Dashboard | Pending Approvals includes blocked users |
| M6 | MEDIUM | Inventory | No unit cost column |
| M7 | MEDIUM | Jobs List | Search is client-side only (not across all pages) |
| M8 | MEDIUM | Reports | Customer History rows not clickable |
| M9 | MEDIUM | Reports | No date range on Tech Performance |
| M10 | MEDIUM | Reports | Revenue tab lacks chart visualization |
| M11 | MEDIUM | Staff | No name search |
| M12 | MEDIUM | Settings | Read-only profile, no edit or password change |
| M13 | MEDIUM | All Tables | `<th>` missing `scope="col"` |
| M14 | MEDIUM | Login | No auto-focus on email field |
| L1 | LOW | Dashboard | Chart tooltip uses cold color palette |
| L2 | LOW | Create Job | Hardcoded `green-100/green-600` success screen |
| L3 | LOW | Expenditure | Emoji `📋` in CardTitle |
| L4 | LOW | Add Staff Modal | Error banner uses `bg-red-50` not design tokens |
| L5 | LOW | Security Card | `text-purple-500` icon — not a design token |
| L6 | LOW | Settings | Phase 9 dev note visible to admins |
| L7 | LOW | Settings | Partial Supabase URL shown unnecessarily |
| L8 | LOW | All Modals | Inconsistent backdrop blur (some blur, some don't) |
| L9 | LOW | Reports | Revenue PAID/UNPAID uses inline spans not Badge |
| L10 | LOW | Salary | Tab bar missing surface background wrapper |
| L11 | LOW | Multiple Pages | Tab UI duplicated — extract to Tabs component |
| L12 | LOW | Login | No show/hide password toggle |
| L13 | LOW | Login | No logo/icon on login page (brand inconsistency) |
| L14 | LOW | package.json | framer-motion installed but unused |
| L15 | LOW | layout.module.css | Stale CSS file with old palette — dead code |

---

*End of Page-Wise Visual & UX Audit Report*  
*RepairShop Admin Panel — 2026-07-17*  
*Prepared by Antigravity AI*
