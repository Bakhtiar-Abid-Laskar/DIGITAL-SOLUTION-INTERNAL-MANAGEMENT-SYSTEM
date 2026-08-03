# RepairShop — UI/UX Complete Overhaul Master Prompt

**Project:** RepairShop Service Management System — Nilakshith Enterprise  
**Scope:** Full visual and interaction overhaul of both the Expo React Native mobile app  
and the Next.js admin panel.  
**Audit baseline:** UI/UX Audit Report (July 2026) + Technical Audit Report (July 2026)  

Paste this entire document into Cursor (or your AI IDE) as a single prompt.  
It is a complete, self-contained specification — the agent must not invent
anything outside what is described here unless explicitly told to fill a gap.

---

## 0. Prime Directive

You are a senior product designer and senior React / React Native engineer working
together. You are doing a complete visual and interaction overhaul of an existing,
working codebase. **Do not alter any business logic, data fetching, Supabase queries,
navigation structure, or RLS policies.** You are only changing:

- Colors, typography, spacing, shadows, border radii
- Component layout and visual hierarchy
- Loading states, empty states, error states
- Animations and micro-interactions
- Icon choices and placement
- Bottom sheets, modals, and overlay design

If you find yourself touching a Supabase query, an Edge Function, an auth flow, a
database schema, or a route definition — stop. That is out of scope.

Work file by file. After each file, briefly state what changed and why, in one sentence.

---

## 1. Design System (apply globally to every file in both apps)

### 1.1 Design Philosophy

The aesthetic is **"precision workshop"** — the visual language of professional
tooling: clean, purposeful, tactile. Think a high-end multimeter or a premium
diagnostic interface. It is dark-first on mobile (field use in bright workshops,
OLED screens) and light-first on web (data-dense admin work on desktop). Nothing
decorative that does not carry information. Every visual choice earns its place.

The single signature element across both apps: **a fine 1px accent line at the top
of every card and primary surface in the brand color** — like a thread of circuit
board trace. On mobile, it is `#00C896` (teal). On web admin, it is `#3B6FF0` (blue).
This is the single most-remembered visual detail. Use it consistently and sparingly
— only on cards, modals, and the active tab indicator.

---

### 1.2 Color Tokens

Define these as constants in a shared `tokens.ts` file:

```typescript
// ── MOBILE (dark theme) ────────────────────────────────────────────────────
export const MOBILE = {
  // Backgrounds
  bg_base:       '#0D0D0D',   // true black-ish base — OLED efficient
  bg_surface:    '#161616',   // cards, inputs, bottom sheets
  bg_elevated:   '#1F1F1F',   // modals, dropdowns, pressed states
  bg_subtle:     '#252525',   // dividers, skeleton loaders

  // Brand / Accent
  accent:        '#00C896',   // primary teal — CTAs, active states, accent lines
  accent_dim:    '#00C89620', // teal at 12% opacity — badge backgrounds, highlights
  accent_dark:   '#009970',   // pressed state for teal buttons

  // Semantic status colors
  status_received:  '#6B7280', // neutral gray — Received
  status_progress:  '#3B82F6', // blue — In Progress
  status_waiting:   '#F59E0B', // amber — Waiting for Materials
  status_complete:  '#10B981', // green — Completed

  // Priority colors
  priority_normal:  '#6B7280',
  priority_high:    '#F59E0B',
  priority_urgent:  '#EF4444',

  // Typography
  text_primary:   '#F4F4F4',
  text_secondary: '#9CA3AF',
  text_muted:     '#4B5563',
  text_inverse:   '#0D0D0D',

  // UI elements
  border:         '#2A2A2A',
  border_focus:   '#00C896',
  divider:        '#1E1E1E',

  // Destructive
  danger:         '#EF4444',
  danger_dim:     '#EF444420',
} as const;

// ── ADMIN PANEL (light theme) ──────────────────────────────────────────────
export const ADMIN = {
  // Backgrounds
  bg_base:        '#F8F9FB',   // off-white base — not pure white, easier on eyes
  bg_surface:     '#FFFFFF',   // cards, panels
  bg_subtle:      '#F1F3F7',   // sidebar, table alternating rows
  bg_hover:       '#EEF2FF',   // row hover states

  // Brand / Accent
  accent:         '#3B6FF0',   // royal blue — admin authority color
  accent_dim:     '#3B6FF012', // blue at 7% — badge backgrounds
  accent_dark:    '#2D5FD4',   // pressed state

  // Semantic status (same meaning, lighter on white background)
  status_received:  { bg: '#F3F4F6', text: '#374151' },
  status_progress:  { bg: '#DBEAFE', text: '#1D4ED8' },
  status_waiting:   { bg: '#FEF3C7', text: '#92400E' },
  status_complete:  { bg: '#D1FAE5', text: '#065F46' },

  // Priority (pill styles)
  priority_normal: { bg: '#F3F4F6', text: '#374151' },
  priority_high:   { bg: '#FEF3C7', text: '#92400E' },
  priority_urgent: { bg: '#FEE2E2', text: '#991B1B' },

  // Typography
  text_primary:   '#0F172A',
  text_secondary: '#475569',
  text_muted:     '#94A3B8',

  // UI elements
  border:         '#E2E8F0',
  border_strong:  '#CBD5E1',
  sidebar_bg:     '#0F172A',   // dark sidebar on light body — deliberate contrast
  sidebar_text:   '#94A3B8',
  sidebar_active: '#FFFFFF',
  sidebar_active_bg: '#3B6FF020',

  // Destructive
  danger:         '#DC2626',
  danger_dim:     '#FEE2E2',
} as const;
```

---

### 1.3 Typography

**Mobile (React Native StyleSheet):**
```typescript
export const TYPE = {
  // Display — job codes, large numbers, hero labels
  display: { fontFamily: 'System', fontWeight: '800', fontSize: 28, letterSpacing: -0.5 },
  // Heading
  h1:      { fontFamily: 'System', fontWeight: '700', fontSize: 20, letterSpacing: -0.3 },
  h2:      { fontFamily: 'System', fontWeight: '600', fontSize: 16, letterSpacing: -0.2 },
  h3:      { fontFamily: 'System', fontWeight: '600', fontSize: 14 },
  // Body
  body:    { fontFamily: 'System', fontWeight: '400', fontSize: 14, lineHeight: 22 },
  bodyMd:  { fontFamily: 'System', fontWeight: '500', fontSize: 14 },
  // Small / Labels
  small:   { fontFamily: 'System', fontWeight: '400', fontSize: 12, lineHeight: 18 },
  label:   { fontFamily: 'System', fontWeight: '600', fontSize: 11, letterSpacing: 0.8, textTransform: 'uppercase' },
  // Monospace — job codes specifically
  mono:    { fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace', fontWeight: '700', fontSize: 13, letterSpacing: 1 },
};
```

**Admin Panel (Tailwind classes — configure in `tailwind.config.ts`):**
```javascript
fontFamily: {
  sans: ['Inter', 'system-ui', 'sans-serif'],  // load via next/font
  mono: ['JetBrains Mono', 'Courier New', 'monospace'],  // for job codes only
}
// Use next/font/google to load Inter (weights: 400,500,600,700) and JetBrains Mono (weight: 600)
```

---

### 1.4 Spacing Scale (mobile)
```typescript
export const SPACE = {
  xs:  4,
  sm:  8,
  md:  12,
  base: 16,
  lg:  20,
  xl:  24,
  xxl: 32,
  xxxl: 48,
};
```

### 1.5 Border Radius
```typescript
export const RADIUS = {
  sm:   6,
  md:   10,
  lg:   14,
  xl:   20,
  full: 9999,
};
```

### 1.6 Shadows (mobile — cross-platform)
```typescript
export const SHADOW = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 16,
  },
};
```

---

### 1.7 Animation Specification

Use `react-native-reanimated` (v3) for all mobile animations.
Use CSS transitions and `framer-motion` for the admin panel.

**Do not add animations to every element.** Only animate where listed below.
Gratuitous animation makes the app feel toy-like and slow in field use.

**Mobile animation rules:**
```typescript
// Standard enter (use for modals, bottom sheets, cards on first mount)
const ANIM = {
  duration_fast:    150,  // ms — press feedback, badge appear
  duration_standard: 250, // ms — card enter, modal open
  duration_slow:    400,  // ms — bottom sheet, page transition
  easing_enter:  Easing.out(Easing.cubic),
  easing_exit:   Easing.in(Easing.cubic),
  easing_spring: { damping: 20, stiffness: 300 }, // useSpring config
};
```

**Specific animations to implement (mobile):**

1. **Tab bar active indicator** — a `2px` teal underline that slides horizontally
   between tabs using `useSharedValue` + `useAnimatedStyle`. Duration: 200ms, spring.
2. **Job card entrance on list load** — cards stagger-fade in with `FadeInDown`
   from `react-native-reanimated` entering animation. Stagger: 40ms per card,
   translateY 12px → 0, opacity 0 → 1. Only on initial load, not on pull-to-refresh.
3. **Status badge color transition** — when a job status updates via Realtime, the
   badge background/text color cross-fades over 300ms using `useAnimatedStyle`.
4. **Bottom sheet** — slides up from off-screen with spring physics
   `{ damping: 26, stiffness: 400 }`. Backdrop fades in simultaneously at 40% opacity.
5. **Button press feedback** — all `TouchableOpacity`-based buttons use `useAnimatedStyle`
   to scale to `0.96` on press with 80ms duration. Replace `activeOpacity` entirely.
6. **Success checkmark after form submit** — a circular `#00C896` background with a
   checkmark icon scales from `0` to `1` with a spring bounce
   `{ damping: 14, stiffness: 350 }` before the success modal content fades in.
7. **Skeleton loaders** — use `LinearGradient` shimmer sweeping left to right
   over `bg_subtle` placeholders. Duration: 1200ms loop. Use this instead of a
   spinner wherever a list is loading for the first time.
8. **Pull-to-refresh indicator** — custom: a rotating `#00C896` arc instead of the
   default system indicator. Use `Animated.Value` with `rotate` transform.

**Admin panel animations (framer-motion + CSS):**

1. **Page transitions** — `AnimatePresence` wrapper with `opacity: 0→1`,
   `translateY: 8px→0` over `200ms ease-out`. Apply to the main content area only.
2. **Metric card count-up** — on page load, numbers animate from `0` to their
   actual value over `800ms` using a custom `useCountUp` hook with `easeOut` curve.
3. **Table row hover** — `background-color: transition 120ms` to `bg_hover`.
4. **Sidebar nav active item** — a `3px` blue left border animates in with
   `scaleY: 0→1` from center, `150ms ease-out`.
5. **Toast notifications** — slide in from top-right: `translateX: 120%→0`, spring.
   Auto-dismiss after `4s` with a shrinking progress bar underneath.
6. **Modal open** — backdrop fade `200ms` + content `scale: 0.96→1` + `opacity: 0→1`,
   `200ms ease-out`.
7. **Chart bar entrance** — bars grow from bottom on first render using recharts'
   built-in `isAnimationActive={true}` with `animationDuration={600}`.

---

## 2. Mobile App — Screen-by-Screen Specification

### 2.1 Global Mobile Components

#### `AppHeader` component
```
┌─────────────────────────────────────────────┐
│  [←]    Screen Title              [icon]    │
│  ─────────────────────────────────────────  │ ← 1px border-bottom in bg_subtle
└─────────────────────────────────────────────┘
```
- Background: `bg_surface` (#161616)
- Height: 56px + safe area top
- Title: `h2` weight, `text_primary`
- Back arrow: `ChevronLeft` from lucide-react-native, size 22, color `text_secondary`
- Right action icon: size 20, color `text_secondary`
- Bottom border: `1px solid bg_subtle` — the signature accent line in `accent` color
  appears only on the Dashboard header, nowhere else (restraint)

#### `JobCard` component (used in all job list screens)
```
┌──────────────────────────────────────────────┐
│ ▌  RS-2025-0042              [● In Progress] │  ← 3px left border = priority color
│    Rajib Ahmed · Laptop                      │
│    "Overheating, shuts down randomly"        │
│    ─────────────────────────────────────────  │
│    Suresh Kumar          2h ago  [Urgent 🔴] │
└──────────────────────────────────────────────┘
```
- Background: `bg_surface`
- Border radius: `RADIUS.md` (10px)
- Left border: `3px solid` — urgent=`#EF4444`, high=`#F59E0B`, normal=`#2A2A2A`
- Top accent line: `1px solid accent` (the signature element)
- `job_code`: `TYPE.mono` — monospace, teal color, all-caps feel
- Customer + device: `TYPE.bodyMd`, `text_primary`
- Issue text: `TYPE.body`, `text_secondary`, 2-line `numberOfLines={2}` ellipsis
- Divider: `1px` in `bg_elevated`
- Technician name (receptionist view) or time-ago + priority badge in bottom row
- Shadow: `SHADOW.card`
- Press animation: scale to `0.98`, `100ms`
- Entrance: `FadeInDown` stagger

#### `StatusBadge` component
```typescript
// Pill badge — 6px vertical padding, 10px horizontal, RADIUS.full
// Background from status color at 15% opacity, text at 100% opacity
// Dot: 6px circle to the left of the label text
// Labels: 'Received' | 'In Progress' | 'Waiting' | 'Completed'
// Icon (lucide-react-native) to the left of dot:
//   Received:  Clock (size 11)
//   In Progress: Wrench (size 11)
//   Waiting:   Package (size 11)
//   Completed: CheckCircle2 (size 11)
```

#### `PriorityBadge` component
```typescript
// Same pill structure as StatusBadge
// Normal: text_muted bg, text_muted text — deliberately quiet
// High:   amber_dim bg, amber text, Flame icon (size 11)
// Urgent: danger_dim bg, danger text, Zap icon (size 11), slight pulse animation
//         (Urgent only: scale 1→1.05→1, 1.5s loop, subtle)
```

#### `SectionLabel` component
```
 ASSIGNED JOBS  ← TYPE.label style, text_muted color, 32px margin-top
 ─────────────  ← 1px rule in bg_subtle, 8px below label
```

#### `EmptyState` component
```
       [Icon — 48px, color text_muted]
       
         No jobs assigned yet.
    [icon: Inbox, text: text_muted, TYPE.h3]
    
    New jobs will appear here once the
    receptionist assigns them to you.
    [TYPE.body, text_muted, centered, max-width 260px]
```
- Never show a generic "No data found." — always write role-specific, action-oriented copy.
- Full list of empty state copy is in Section 4 of this document.

#### `SkeletonCard` component
```
┌──────────────────────────────────────────────┐
│ ▌  ████████████          ██████████████     │
│    ██████████████                            │
│    ████████████████████████                  │
│    ─────────────────────────────────────────  │
│    ████████████        ████████              │
└──────────────────────────────────────────────┘
```
- Same structure as `JobCard` but every text element replaced with shimmer rects
- Shimmer: animated `LinearGradient` sweeping left→right
- Show 4 skeleton cards on initial load; remove once data arrives

---

### 2.2 Navigation & Tab Bar

#### Bottom Tab Bar (all roles)
```
┌────────────────────────────────────────┐
│                                        │
│  [🏠]      [📋]      [📅]     [👤]   │
│  Home      Jobs     Attend   Profile  │
│  ────                                  │  ← 2px accent line under active tab only
│                                        │
└────────────────────────────────────────┘
```
- Background: `bg_surface` with `SHADOW.modal` — elevated above content
- Height: 60px + safe area bottom
- Active icon: `accent` (#00C896)
- Inactive icon: `text_muted`
- Active label: `TYPE.label` (11px, 600 weight), `accent` color
- Inactive label: `TYPE.label`, `text_muted`
- Active indicator: sliding 2px teal underline (animated, see Section 1.7 item 1)
- Top border: `1px solid bg_subtle`
- **No icon fill** on active state — use stroke icons consistently. The accent line
  is the only active indicator.

**Icon assignments:**
```
Receptionist tabs:
  Dashboard   → LayoutDashboard (lucide-react-native, size 22)
  Jobs        → ClipboardList   (size 22)
  Attendance  → CalendarCheck   (size 22)

Technician tabs:
  My Jobs     → Wrench          (size 22)
  Attendance  → CalendarCheck   (size 22)
```

---

### 2.3 Login Screen

```
┌──────────────────────────────────────────────┐
│                                              │
│                                              │
│         ⚙  RepairShop                       │  ← Settings2 icon, 36px, accent color
│         Service Management                  │    large h1, text_primary below icon
│                                              │
│  ────────────────────────────────────────    │  ← thin divider
│                                              │
│  Email                                       │
│  ┌────────────────────────────────────────┐  │
│  │  [Mail icon]  you@example.com          │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Password                                    │
│  ┌────────────────────────────────────────┐  │
│  │  [Lock icon]  ••••••••    [Eye icon]   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │           Sign In                      │  │  ← accent bg, text_inverse text
│  └────────────────────────────────────────┘  │
│                                              │
│        Trouble signing in? Contact admin     │  ← text_muted, TYPE.small
│                                              │
└──────────────────────────────────────────────┘
```
- Background: `bg_base` — full dark
- Logo area: vertically centered at 35% of screen height
- Icon: `Settings2` from lucide-react-native, size 40, `accent` color
- App name: `TYPE.display` (28px, 800 weight), `text_primary`
- Subtitle: `TYPE.body`, `text_muted`
- Input fields:
  - Background: `bg_surface`
  - Border: `1px solid border` at rest, `1px solid accent` on focus (animated, 150ms)
  - Border radius: `RADIUS.md` (10px)
  - Height: 52px
  - Icon: left-padded, `text_muted`, size 18 (`Mail`, `Lock`)
  - Password toggle: `Eye` / `EyeOff`, right-padded, `text_muted`
  - Text: `TYPE.body`, `text_primary`
  - Placeholder: `text_muted`
- Sign In button:
  - Background: `accent`
  - Height: 52px, full width, `RADIUS.md`
  - Text: `TYPE.h3`, `text_inverse` (#0D0D0D)
  - Loading state: replace text with `ActivityIndicator` (color: `text_inverse`)
  - Press animation: scale 0.97 + background darkens to `accent_dark`
- Error state: a `1px solid danger` border below the input fields with a row:
  `AlertCircle` icon (size 14, danger color) + error message in `TYPE.small`, `danger`
- Keyboard: pushes form up via `KeyboardAvoidingView`, behavior `'padding'` on iOS,
  `'height'` on Android

---

### 2.4 Receptionist — Dashboard Screen

```
┌──────────────────────────────────────────────┐
│  RepairShop              [Bell]  [Settings]  │  ← header, accent line at very top
├──────────────────────────────────────────────┤
│                                              │
│  Good morning, Priya ☀                      │  ← TYPE.h2, text_primary. Greeting
│  Wednesday, 2 July 2025                      │    changes by time of day (Morning/
│                                              │    Afternoon/Evening). Date below.
│  ┌──────────┐  ┌──────────┐                  │
│  │  12      │  │   4      │                  │  ← 2-col stat cards
│  │ Total    │  │ In       │                  │
│  │ Today    │  │ Progress │                  │
│  └──────────┘  └──────────┘                  │
│  ┌──────────┐  ┌──────────┐                  │
│  │   2      │  │   1      │                  │
│  │ Completed│  │ URGENT   │                  │  ← Urgent card: danger_dim bg,
│  │ Today    │  │ Pending  │                  │    danger text on the number
│  └──────────┘  └──────────┘                  │
│                                              │
│  RECENT JOBS                [View All →]     │  ← SectionLabel + text link right
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [JobCard]                              │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ [JobCard]                              │  │
│  └────────────────────────────────────────┘  │
│  [+ 3 more]                                  │  ← teal text link
│                                              │
│  ┌──────────────────────────────────────────┐ │
│  │  [Plus icon]  Create New Job           →│  │  ← CTA card, accent bg, full width
│  └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

**Stat cards:**
- Background: `bg_surface`
- Top accent line: `1px solid accent` (the signature element)
- Border: `1px solid border`
- Border radius: `RADIUS.lg` (14px)
- Number: `TYPE.display` (28px, 800 weight), color varies by card
- Label: `TYPE.small`, `text_secondary`
- Cards are tappable — navigate to Jobs list with filter pre-applied
- Count-up animation on mount: 0 → actual value, 600ms, `easeOut`
- Icon top-right corner of each card (size 18, `text_muted`):
  - Total Today: `ClipboardList`
  - In Progress: `Wrench`
  - Completed: `CheckCircle2`
  - Urgent Pending: `Zap`

**CTA card:**
- Background: `accent`
- Border radius: `RADIUS.lg`
- `Plus` icon (size 20, `text_inverse`) left, "Create New Job" `TYPE.h3` `text_inverse` center, `ChevronRight` right
- Press animation: darken to `accent_dark`, scale 0.98

---

### 2.5 Receptionist — New Job Screen

```
┌──────────────────────────────────────────────┐
│  [←]  New Job                                │
├──────────────────────────────────────────────┤
│                                              │
│  CUSTOMER INFORMATION                        │  ← SectionLabel
│                                              │
│  Customer Name *                             │
│  ┌────────────────────────────────────────┐  │
│  │  [User icon]  Full name                │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Contact Number *                            │
│  ┌────────────────────────────────────────┐  │
│  │  [Phone icon]  +91                     │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  Device Type *                               │
│  ┌─────────────┐ ┌──────────┐ ┌──────────┐  │
│  │ [Laptop] 💻 │ │ [PC] 🖥  │ │ Other ⚙ │  │  ← segmented pill selector
│  └─────────────┘ └──────────┘ └──────────┘  │
│                                              │
│  Reported Issue *                            │
│  ┌────────────────────────────────────────┐  │
│  │                                        │  │
│  │  Describe the problem...              │  │  ← 4-line min height
│  └────────────────────────────────────────┘  │
│                                              │
│  Remarks (optional)                          │
│  [same text area style]                      │
│                                              │
│  JOB DETAILS                                 │  ← SectionLabel
│                                              │
│  Job Type                                    │
│  ┌───────────────────┐ ┌───────────────────┐ │
│  │  [Home] Inhouse   │ │  [MapPin] Onsite  │ │  ← toggle pill pair
│  └───────────────────┘ └───────────────────┘ │
│                                              │
│  Priority                                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────────┐  │
│  │  Normal  │ │  ⚡ High  │ │  🔴 Urgent  │  │
│  └──────────┘ └──────────┘ └──────────────┘  │
│                                              │
│  Assign Technician *                         │
│  ┌────────────────────────────────────────┐  │
│  │  [Users icon]  Select technician  [↓]  │  │  ← opens bottom sheet picker
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  [Plus]  Create Job                    │  │  ← accent CTA
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Device type / priority segmented selector:**
- Container: `bg_surface` with `1px solid border`, `RADIUS.full`, padding 3px
- Inactive pill: transparent bg, `text_secondary`
- Active pill: `accent` bg (for Inhouse/Normal), or priority color bg, `text_inverse`
- Transition: background color `150ms`, spring scale `1→1.02→1` on selection

**Technician picker bottom sheet:**
```
┌──────────────────────────────────────────────┐
│  ────  (drag handle)                         │
│  Select Technician                           │  ← TYPE.h2
│  ─────────────────────────────────────────   │
│  ┌────────────────────────────────────────┐  │
│  │  [Search icon]  Search technicians...  │  │  ← search input
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │  [Avatar initials]  Suresh Kumar       │  │  ← each technician row
│  │                     3 active jobs  →   │  │    chevron right
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │  [Avatar initials]  Manish Das         │  │
│  │                     1 active job   →   │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```
- Bottom sheet: `bg_surface`, top corners `RADIUS.xl` (20px)
- Drag handle: `40px × 4px` rounded rect, `bg_subtle`, centered at top
- Avatar: 36px circle, `accent_dim` bg, initials in `accent` color, `TYPE.label`
- Selected technician: `accent` checkmark appears right of name
- Active job count: `TYPE.small`, `text_muted` — helps receptionist load-balance

**Success modal (after job creation):**
```
┌──────────────────────────────────────────────┐
│                                              │
│         ✓                                    │  ← CheckCircle, accent, 64px
│                                              │    spring-in animation
│       Job Created                            │  ← TYPE.h1
│                                              │
│    RS-2025-0048                              │  ← TYPE.mono, accent color, 24px
│    Suresh Kumar  ·  Laptop  ·  Urgent       │  ← TYPE.body, text_secondary
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │  [Printer]  Print Receipt            │    │  ← accent button
│  └──────────────────────────────────────┘    │
│  ┌──────────────────────────────────────┐    │
│  │  [Plus]     New Job                  │    │  ← secondary (outlined) button
│  └──────────────────────────────────────┘    │
│                                              │
└──────────────────────────────────────────────┘
```

---

### 2.6 Receptionist — Job List Screen

```
┌──────────────────────────────────────────────┐
│  [←]  All Jobs                 [Filter] [🔍] │
├──────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────┐ │
│ │ 🔍  Search by name or job code...       │ │  ← search bar (appears on 🔍 tap)
│ └──────────────────────────────────────────┘ │
│                                              │
│ [All] [Received] [In Progress] [Waiting] [✓] │  ← horizontal scroll tabs
│  ────                                        │    accent underline on active
│                                              │
│  ┌────────────────────────────────────────┐  │
│  │ [SkeletonCard or JobCard]              │  │
│  └────────────────────────────────────────┘  │
│  ┌────────────────────────────────────────┐  │
│  │ [JobCard]                              │  │
│  └────────────────────────────────────────┘  │
│  ...                                         │
└──────────────────────────────────────────────┘
```

**Filter tabs (horizontal ScrollView):**
- Each tab: pill shape, `RADIUS.full`
- Inactive: `bg_subtle` bg, `text_secondary` text
- Active: `accent_dim` bg, `accent` text, with accent underline below
- Count badge on each tab (e.g. "In Progress · 4")
- Transition: background 150ms

**Search bar:**
- Hidden by default, revealed by tapping the `Search` icon in the header (animated
  height: `0→52px`, `200ms ease-out`)
- `bg_surface` background, `1px solid accent` border when active
- `X` button to clear and collapse

---

### 2.7 Job Detail Screen (Receptionist)

```
┌──────────────────────────────────────────────┐
│  [←]  RS-2025-0048         [Reassign] [···]  │  ← mono job code in header
├──────────────────────────────────────────────┤
│  [● In Progress]  [⚡ High]                   │  ← status + priority badges
│                                              │
│  CUSTOMER                                    │  ← SectionLabel
│  ┌────────────────────────────────────────┐  │
│  │ Rajib Ahmed                            │  │
│  │ [Phone] +91 94356 78901    [Call] [WA] │  │  ← Phone + WhatsApp icon buttons
│  │ Laptop · Overheating issue             │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ASSIGNED TO                                 │  ← SectionLabel
│  ┌────────────────────────────────────────┐  │
│  │ [Avatar]  Suresh Kumar                 │  │
│  │           Assigned 2h ago              │  │
│  │                           [Reassign→]  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  MATERIALS USED                              │  ← SectionLabel
│  ┌────────────────────────────────────────┐  │
│  │ Thermal Paste          × 1   ₹ 120     │  │
│  │ RAM DDR4 8GB           × 1   ₹ 2,400   │  │
│  │ ─────────────────────── Total ₹ 2,520  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌───────────────────┐ ┌───────────────────┐ │
│  │ [Receipt] Bill    │ │ [WA] Ready Pickup │ │  ← 2-col action buttons
│  └───────────────────┘ └───────────────────┘ │
└──────────────────────────────────────────────┘
```

**Action buttons:**
- "Generate Bill": `accent` background, `Receipt` icon (lucide)
- "Ready for Pickup": `#25D366` (WhatsApp green) background, `MessageCircle` icon
- Both: full flex-1, `RADIUS.md`, height 48px

**Inline call/WhatsApp buttons (in customer card):**
- Small pill buttons: `Phone` icon button (teal tint), `MessageCircle` icon button (WA green)
- Size: 32×32, `RADIUS.full`, dim background

---

### 2.8 Technician — My Jobs Screen

Same `JobCard` and filter tabs as receptionist job list, with these differences:
- No "Receptionist" or "Assigned to" information shown
- Urgent jobs: `danger` left border + a subtle `danger_dim` card background wash (not
  just a border — the entire card is slightly red-tinted)
- Active Realtime subscription indicator: a `2px` green pulsing dot in the header right:
  `●` in `accent` color with a scale pulse `1→1.3→1`, 2s loop — confirms live updates active
- Empty state: `Wrench` icon (48px), "No jobs assigned", copy per Section 4

---

### 2.9 Technician — Job Detail Screen

```
┌──────────────────────────────────────────────┐
│  [←]  RS-2025-0048              [⚡ Urgent]  │
├──────────────────────────────────────────────┤
│  [● In Progress]  ·  Laptop  ·  Inhouse      │
│                                              │
│  CUSTOMER                                    │
│  Rajib Ahmed                                 │
│  [Phone] +91 94356 78901  ← tappable to call │
│                                              │
│  REPORTED ISSUE                              │
│  "Overheating, shuts down after 10 minutes"  │  ← italic, text_secondary
│                                              │
│  STATUS                                      │  ← SectionLabel
│  ┌────────────────────────────────────────┐  │
│  │  ┌──────────────┐ ┌────────────────┐   │  │
│  │  │  ⟳ In Prog. │ │ ◎ Waiting      │   │  │  ← current active status highlighted
│  │  └──────────────┘ └────────────────┘   │  │
│  │  ┌──────────────────────────────────┐   │  │
│  │  │  ✓  Mark as Completed            │   │  │  ← accent background
│  │  └──────────────────────────────────┘   │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  WORK NOTES                                  │
│  ┌────────────────────────────────────────┐  │
│  │  Cleaned cooling fan, replaced thermal │  │
│  │  paste. RAM tested fine.               │  │
│  │                                        │  │
│  └────────────────────────────────────────┘  │
│                                  [Save Notes]│
│                                              │
│  MATERIALS USED                              │
│  ┌────────────────────────────────────────┐  │
│  │ Thermal Paste    × 1    ₹ 120  [🗑]   │  │
│  │ ────────────────────────────────────   │  │
│  │ [+ Add Material]                       │  │  ← accent text + Plus icon
│  │ ─────────────────── Total  ₹ 120       │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ONSITE VISIT  (shown if job_type=Onsite)    │
│  ┌────────────────────────────────────────┐  │
│  │  [Camera]  Take Arrival Selfie         │  │  ← if not yet taken
│  │  ─ or ─                                │  │
│  │  [✓ photo thumb]  Arrived 10:23 AM     │  │  ← if taken
│  │  [MapPin] 24.8356, 92.7789             │  │
│  │  [Camera]  Take Departure Selfie       │  │
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Status button row:**
- Non-active status options: `bg_elevated`, `text_secondary`, `RADIUS.md`
- Completed button: full-width, `accent` bg, `CheckCircle2` icon left
- Icon for In Progress: `RotateCw` (lucide)
- Icon for Waiting: `Package` (lucide)

**Add Material bottom sheet:**
```
  Material Name    [TextInput full-width]
  Quantity         [TextInput numeric, half width]
  Unit Cost (₹)   [TextInput numeric, half width]
  ─────────────────────────────────────────────
  [Cancel (outlined)]  [Add Material (accent filled)]
```

---

### 2.10 Attendance Screen (both roles)

```
┌──────────────────────────────────────────────┐
│  Attendance                                  │
├──────────────────────────────────────────────┤
│                                              │
│  TODAY  ·  Wednesday, 2 July 2025            │  ← SectionLabel + date right-aligned
│  ┌────────────────────────────────────────┐  │
│  │  [photo selfie thumb, 56×56, rounded]  │  │
│  │  Checked in at 9:14 AM                 │  │  ← CheckCircle icon, accent
│  │  GPS: 24.8356° N, 92.7789° E          │  │  ← MapPin icon, text_muted
│  │                                        │  │
│  │  ┌──────────────────────────────────┐  │  │
│  │  │  [Camera]  Check Out             │  │  │  ← if checked in, not out yet
│  │  └──────────────────────────────────┘  │  │
│  └────────────────────────────────────────┘  │
│                                              │
│  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Mark Leave  │  │  Mark Half Day       │  │  ← secondary outlined buttons
│  └──────────────┘  └──────────────────────┘  │
│                                              │
│  HISTORY  ·  Last 30 days                   │  ← SectionLabel
│  ┌────────────────────────────────────────┐  │
│  │  1 Jul  [Present ✓]  9:12 – 6:45 PM   │  │  ← row per day
│  │  [tiny thumb]                     [→]  │  │    tap to see full selfie
│  ├────────────────────────────────────────┤  │
│  │  30 Jun [Present ✓]  9:08 – 6:30 PM   │  │
│  ├────────────────────────────────────────┤  │
│  │  29 Jun [Leave]                        │  │  ← amber badge
│  └────────────────────────────────────────┘  │
└──────────────────────────────────────────────┘
```

**Status badge per history row:**
- Present: `status_complete` green pill, `CheckCircle2` icon
- Halfday: amber pill, `Clock` icon
- Leave: amber pill, `CalendarX` icon
- Absent: `danger_dim` pill, `XCircle` icon

**Camera capture modal:**
- Full-screen camera view
- Large circular shutter button (72px), white background, `accent` border 3px
- `X` close button top-left
- Instruction text bottom center: `TYPE.small`, white, "Look into the camera and tap to capture"

---

## 3. Admin Panel — Page-by-Page Specification

### 3.1 Global Admin Components

#### Sidebar
```
┌────────────────────────────┐
│  ⚙  RepairShop             │  ← Settings2 icon, accent, brand name
│  ─────────────────────     │
│  ● Overview                │  ← active: white text + blue left border + bg_hover
│    Jobs                    │  ← inactive: sidebar_text color
│    Staff                   │
│    Inventory               │
│    Reports                 │
│    Salary                  │
│    Expenditure             │
│    Settings                │
│  ─────────────────────     │
│  [Avatar] Admin User       │  ← bottom of sidebar
│           Sign Out  [→]   │
└────────────────────────────┘
```
- Width: 240px, fixed
- Background: `#0F172A` (dark navy — deliberate contrast with white body)
- Brand: `Settings2` icon 22px, `accent` color (#3B6FF0), name `TYPE.h2` white
- Nav items: 44px height, 12px horizontal padding, `RADIUS.md` on hover background
- Active item: left border `3px solid accent`, `bg_hover` background, white text
- Active left border animation: `scaleY: 0→1` from center, `150ms ease-out`
- Icon (each nav item, size 18, lucide):
  - Overview:     `LayoutDashboard`
  - Jobs:         `ClipboardList`
  - Staff:        `Users`
  - Inventory:    `Package`
  - Reports:      `BarChart2`
  - Salary:       `BadgeDollarSign`
  - Expenditure:  `Receipt`
  - Settings:     `Settings`
- Bottom user row: avatar circle (initials), name, `LogOut` icon button

#### Data Table (shared component across Jobs, Staff, Inventory)
- Header row: `bg_subtle`, `text_secondary` labels, `TYPE.label` (11px, 600, uppercase)
- Body rows: alternating `bg_surface` / `bg_subtle`
- Row hover: `bg_hover` + cursor pointer, `120ms transition`
- Borders: `1px solid border` around table, `1px solid border` between rows (no
  vertical column lines)
- Border radius: `RADIUS.md` on the table container
- Top accent line: `1px solid accent` on the top of the table container (signature element)
- Action buttons in rows: ghost pill buttons that appear only on row hover
- Pagination: bottom of table, `ChevronLeft` / `ChevronRight` arrows, current page
  indicator, `TYPE.small`, `text_secondary`

#### Metric Card (Overview page)
```
┌────────────────────────────────┐
│ ─ (1px accent top line)        │
│                                │
│  [Icon 20px, accent]           │
│                                │
│  12                            │  ← TYPE.display or very large, count-up animation
│  Total Jobs Today              │  ← TYPE.small, text_secondary
└────────────────────────────────┘
```
- Background: `bg_surface`
- Border: `1px solid border`
- Border radius: `RADIUS.lg`
- Shadow: `0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06)`
- Top accent line: `3px solid accent` (stronger on web — signature element more prominent)

#### Status Pill (table cells)
```css
/* Tailwind — applied as className */
.pill-received  { @apply bg-gray-100 text-gray-700 }
.pill-progress  { @apply bg-blue-100 text-blue-700 }
.pill-waiting   { @apply bg-yellow-100 text-yellow-800 }
.pill-completed { @apply bg-green-100 text-green-800 }
/* All pills: rounded-full, px-2.5, py-0.5, text-xs, font-medium */
```

#### Toast notification (global)
- Position: top-right, `z-index: 9999`
- Width: 320px
- Background: `bg_surface` (white)
- Left border: `4px solid` — success=green, error=danger, info=accent
- Shadow: `0 10px 25px rgba(0,0,0,0.12)`
- Border radius: `RADIUS.md`
- Content: icon + title + optional body text + auto-dismiss progress bar
- Animation: slide in from right, spring. Auto-dismiss: 4s.
- Icons: `CheckCircle2` (success), `AlertCircle` (error), `Info` (info)

---

### 3.2 Overview Page

**Layout:**
```
4-column metric cards row:
[Total Jobs Today] [In Progress] [Active Techs] [Pending Approvals]

2/3 + 1/3 row:
[7-day bar chart (recharts)]  |  [Top technicians list]

Full width:
[Recent Jobs table — last 10]
```

**7-day bar chart:**
- Bar color: `accent` (#3B6FF0)
- Bar hover: darken 10%
- Grid lines: `border` color, very subtle
- Tooltip: `bg_surface` white card with shadow, `border` border, job count + date
- X axis: day abbreviations, `TYPE.small`, `text_muted`
- Y axis: hidden — rely on tooltip
- `animationDuration={700}`, `animationEasing="ease-out"`

**Top technicians panel:**
```
TECHNICIANS THIS WEEK
─────────────────────────────
[Avatar]  Suresh Kumar       8 jobs  ██████████░░
[Avatar]  Manish Das         5 jobs  ██████░░░░░░
[Avatar]  Priya Singh        3 jobs  ███░░░░░░░░░
```
- Progress bar: `accent_dim` track, `accent` fill, `RADIUS.full`, 6px height

---

### 3.3 Jobs Page

**Filter bar:**
```
[Search input — flex grow]  [Status ▼]  [Technician ▼]  [Date Range ▼]  [Export CSV]
```
- Search: `MagnifyingGlass` icon left, clear button appears when text entered
- Dropdowns: `ChevronDown` icon right, open as dropdown menus with checkbox options
- Export CSV: outlined button, `Download` icon left

**Table columns:**
Job Code | Customer | Device | Issue (truncated) | Technician | Status | Priority | Date | Actions

**Actions column (visible on row hover):**
- `Eye` icon button — opens slide-out detail panel (right side, 400px wide)
- `UserCheck` icon button — opens reassign modal
- `Printer` icon button — opens print dialog

**Slide-out detail panel:**
- Slides in from right edge: `translateX: 400px→0`, `250ms ease-out`
- Backdrop: semi-transparent overlay, clicking it closes the panel
- Inside: full job detail in the same sections as the mobile JobDetailScreen but
  in a web layout (no mobile constraints)

---

### 3.4 Staff Page

**Layout:**
Pending Approvals banner (if any pending users) at top:
```
┌──────────────────────────────────────────────────────────┐
│ ⚠  3 new accounts are waiting for approval.   [Review→] │  ← amber left border, bg yellow-50
└──────────────────────────────────────────────────────────┘
```

Below: full staff table.

**Table columns:**
Avatar + Name | Email | Phone | Role (pill) | Status (Active/Pending/Blocked) | Actions

**Actions:** `UserCheck` Approve, `Ban` Block, `CalendarDays` View Attendance, `Eye` View

**Attendance modal:**
- `X` to close, `CalendarDays` icon header
- Last 30 days in a grid: each day a colored square (like GitHub contributions)
  - Present: `accent` (#3B6FF0)
  - Halfday: `#93C5FD` (lighter blue)
  - Leave: `#FCD34D` (amber)
  - Absent: `bg_subtle` (empty)
- Below grid: a table of the last 10 records with selfie thumbnails

---

### 3.5 Inventory Page

**Layout:**
```
[Low Stock Alert banner — if items below threshold]
[Add Item button — top right]
[Search input]
[Inventory table]
```

**Table columns:**
Item Name | Qty | Unit | Threshold | Status | Last Updated | Actions

**Status column:**
- OK: `bg-green-100 text-green-700` pill, `CheckCircle2` icon
- Low Stock: `bg-red-100 text-red-700` pill, `AlertTriangle` icon (pulse animation)
- Out of Stock: `bg-gray-100 text-gray-700` pill, `XCircle` icon

**Inline edit:** clicking the qty cell turns it into a `<input type="number">` with
Save / Cancel micro-buttons appearing. Saves on blur or Enter key.

---

### 3.6 Reports Page

**Three tabs:** Technician Performance | Customer History | Revenue

**Technician Performance:**
- Horizontal bar chart (recharts `BarChart` with `layout="vertical"`)
  - Y axis: technician names
  - X axis: jobs completed count
  - Bar color: `accent`
- Summary table below chart

**Customer History:**
- Search by name or phone — `TYPE.body` placeholder "Search customer by name or phone..."
- Results appear as cards below, each showing all past jobs in a nested table

**Revenue:**
- Monthly bar chart — 6 months of data, accent bars
- Three KPI cards below: Total Revenue, Paid, Outstanding (in danger color)
- Outstanding: `AlertCircle` icon, `danger` color — visually distinct

---

## 4. Empty State Copy (complete list)

Every empty state must use the exact copy below and the specified lucide icon.

| Screen | Icon (lucide) | Heading | Subtext |
|---|---|---|---|
| Receptionist Job List | `ClipboardList` | No jobs yet | Create the first job using the button below. |
| Technician My Jobs | `Wrench` | No jobs assigned | New assignments will appear here in real time. |
| Job Detail — Materials | `Package` | No materials logged | Tap Add Material to record parts used for this job. |
| Admin Jobs Table | `ClipboardList` | No jobs found | Try adjusting your filters or search term. |
| Admin Staff Table | `Users` | No staff members | Invite team members to get started. |
| Admin Inventory | `Package` | Inventory is empty | Add your first item using the button above. |
| Customer History (no search) | `Search` | Search for a customer | Enter a name or phone number to see their repair history. |
| Customer History (no result) | `UserX` | No customer found | No records match that name or number. |
| Reports (no data) | `BarChart2` | No data yet | Data will appear here once jobs are completed. |
| Attendance History | `CalendarDays` | No attendance yet | Check-in records will appear here each day. |

---

## 5. Icon Reference (complete list — lucide-react-native / lucide-react)

Use **only** lucide icons. No emoji in production UI (only in empty state illustrations
if absolutely necessary). Sizes: 18px body, 22px tab bar, 20px headers, 16px inside
pills/badges. Stroke width: 1.75 throughout.

| Element | Icon | Notes |
|---|---|---|
| Tab: Dashboard | `LayoutDashboard` | |
| Tab: Jobs (receptionist) | `ClipboardList` | |
| Tab: Attendance | `CalendarCheck` | |
| Tab: My Jobs (technician) | `Wrench` | |
| App logo / header | `Settings2` | Both apps |
| Notifications bell | `Bell` | Receptionist header |
| Overflow menu | `MoreHorizontal` | Job detail header |
| Back arrow | `ChevronLeft` | |
| Forward arrow | `ChevronRight` | |
| Create / Add | `Plus` | |
| Search | `Search` | |
| Filter | `SlidersHorizontal` | |
| Customer name field | `User` | |
| Phone field | `Phone` | |
| Call action | `PhoneCall` | |
| WhatsApp action | `MessageCircle` | With WA green (#25D366) |
| Email field | `Mail` | |
| Password field | `Lock` | |
| Password show/hide | `Eye` / `EyeOff` | |
| Job type Inhouse | `Home` | |
| Job type Onsite | `MapPin` | |
| Priority Normal | `Minus` | |
| Priority High | `Flame` | |
| Priority Urgent | `Zap` | |
| Status Received | `Clock` | |
| Status In Progress | `RotateCw` | |
| Status Waiting | `Package` | |
| Status Completed | `CheckCircle2` | |
| Attendance check-in | `LogIn` | |
| Attendance check-out | `LogOut` (small) | |
| Camera (attendance/onsite) | `Camera` | |
| GPS / location | `MapPin` | |
| Materials / parts | `Package` | |
| Delete material | `Trash2` | danger color |
| Save | `Save` | |
| Print receipt/invoice | `Printer` | |
| Bill / invoice | `Receipt` | |
| Technician assign | `UserCheck` | |
| Technician reassign | `RefreshCw` | |
| Realtime live indicator | `Radio` | pulsing dot |
| Admin: Overview | `LayoutDashboard` | Sidebar |
| Admin: Staff | `Users` | Sidebar |
| Admin: Inventory | `Package` | Sidebar |
| Admin: Reports | `BarChart2` | Sidebar |
| Admin: Salary | `BadgeDollarSign` | Sidebar |
| Admin: Expenditure | `Receipt` | Sidebar |
| Admin: Settings | `Settings` | Sidebar |
| Admin: Sign out | `LogOut` | Sidebar bottom |
| Admin: View details | `Eye` | Table row action |
| Admin: Block user | `Ban` | Table row action |
| Admin: Export CSV | `Download` | |
| Admin: Alert / warning | `AlertTriangle` | Amber, warning states |
| Admin: Error | `AlertCircle` | Danger, error states |
| Admin: Info | `Info` | Blue, info toasts |
| Admin: Approve | `CheckCircle2` | Green |
| Admin: Date range | `CalendarDays` | |
| Admin: Revenue | `TrendingUp` | |
| Admin: Pending | `Clock` | |
| Admin: Outstanding | `AlertCircle` | Danger color |

---

## 6. Accessibility Requirements

Apply to both apps. These are not optional.

**Mobile:**
- Every `TouchableOpacity` must have `accessible={true}` and a descriptive
  `accessibilityLabel` (e.g. `"Create new job"`, `"Check in for attendance today"`)
- Every `TouchableOpacity` that is only an icon (no text label) must have
  `accessibilityLabel` and `accessibilityRole="button"`
- Status badges: `accessibilityLabel` must spell out the full meaning:
  `"Status: In Progress"` not just the text content
- `accessibilityHint` on form fields: briefly describe what the input expects
- Honor `useColorScheme()` — do not force dark mode; respect system setting,
  though dark is the default

**Admin panel:**
- Every interactive element has a visible `:focus-visible` ring: `outline: 2px solid accent`, `outline-offset: 2px`
- Color is never the only differentiator — always pair color with icon or text label
- Tables: use `<th scope="col">` for headers, `role="grid"` on table container
- Modals: focus trap, `Escape` key to close, `aria-modal="true"`, `aria-labelledby`
  pointing to the modal heading
- Toast notifications: `role="status"` or `role="alert"` depending on urgency
- Keyboard navigation: all actions reachable without mouse

---

## 7. Responsive Breakpoints (Admin Panel only)

```css
/* Tailwind breakpoints already configured — use these classes */
sm:  640px  — not the target (admin is desktop-first)
md:  768px  — tablet: sidebar collapses to icon-only (48px wide), content expands
lg:  1024px — primary target: full sidebar + main content
xl:  1280px — wide desktop: metric cards go 4-col, charts get more width
2xl: 1536px — ultra-wide: max-width container 1400px, centered
```

**Mobile view of admin panel (md and below):**
- Sidebar: hidden, replaced by bottom nav bar (3 icons: Overview, Jobs, Staff)
- Full-width content, single column
- Tables: horizontal scroll with sticky first column (job code / staff name)

---

## 8. Files to Create / Modify (implementation map)

### Mobile App (`RepairShopApp/src/`)

**New files to create:**
```
src/tokens.ts                            ← color, type, spacing, radius, shadow tokens
src/components/JobCard.tsx               ← reusable job card
src/components/StatusBadge.tsx           ← status pill
src/components/PriorityBadge.tsx         ← priority pill
src/components/SectionLabel.tsx          ← section heading + rule
src/components/EmptyState.tsx            ← empty state with icon + copy
src/components/SkeletonCard.tsx          ← shimmer skeleton for job cards
src/components/AppHeader.tsx             ← shared screen header
src/components/BottomSheet.tsx           ← reusable bottom sheet with drag handle
src/components/AvatarInitials.tsx        ← initials avatar circle
src/hooks/useCountUp.ts                  ← count-up animation hook
```

**Files to restyle (do not touch logic/queries):**
```
src/screens/LoginScreen.tsx
src/screens/receptionist/DashboardScreen.tsx
src/screens/receptionist/NewJobScreen.tsx
src/screens/receptionist/JobListScreen.tsx
src/screens/receptionist/JobDetailScreen.tsx
src/screens/technician/MyJobsScreen.tsx
src/screens/technician/TechJobDetailScreen.tsx
src/screens/shared/AttendanceScreen.tsx
src/navigation/BottomTabNavigator.tsx    ← custom tab bar component
```

**Delete:**
```
src/screens/BillingPlaceholderScreen.tsx  ← confirmed dead code per audit
```

### Admin Panel (`admin-panel/`)

**New files to create:**
```
app/globals.css                          ← Inter + JetBrains Mono font imports, base reset
components/ui/MetricCard.tsx
components/ui/StatusPill.tsx
components/ui/DataTable.tsx
components/ui/Toast.tsx + useToast hook
components/ui/Modal.tsx
components/ui/SlideOutPanel.tsx
components/ui/BottomSheetPicker.tsx      (for mobile admin view)
components/layout/Sidebar.tsx
components/layout/TopBar.tsx
components/charts/JobsBarChart.tsx       ← Recharts wrapper
components/charts/TechnicianBars.tsx
components/charts/RevenueChart.tsx
hooks/useCountUp.ts
lib/tokens.ts                            ← admin color tokens (mirrored from ADMIN object above)
```

**Files to restyle (do not touch Supabase queries or API routes):**
```
app/page.tsx                             ← Overview
app/jobs/page.tsx
app/staff/page.tsx
app/inventory/page.tsx
app/reports/page.tsx
app/salary/page.tsx
app/expenditure/page.tsx
tailwind.config.ts                       ← add Inter, JetBrains Mono, extend color tokens
```

---

## 9. What NOT to Change (hard constraints)

- Do not touch any file in `supabase/functions/` — Edge Functions are security-sensitive.
- Do not modify `lib/supabase.ts` or any auth context file.
- Do not alter navigation route names or navigator structure.
- Do not change any Supabase query, filter, `.eq()`, `.select()`, or `.insert()` call.
- Do not alter `eas.json`, `app.json` (except font asset registration if needed).
- Do not change the `generate_job_code()` function or any database references.
- Do not add any new npm package that is not listed in this document without flagging
  it to the user first and explaining why it is necessary.
- Do not change any RLS-related code, policy SQL, or security trigger.
- `BillingPlaceholderScreen.tsx` — delete only, do not replace with anything.

---

## 10. Execution Order

Follow this exact sequence to avoid breaking the running app:

1. Create `src/tokens.ts` and `lib/tokens.ts` first — all other files depend on them.
2. Create all shared components (JobCard, StatusBadge, etc.) before touching screens.
3. Restyle `LoginScreen.tsx` — isolated, safe starting point.
4. Restyle the Bottom Tab Navigator — affects both roles.
5. Restyle `AttendanceScreen.tsx` — shared, tests the new component library.
6. Restyle Receptionist screens in order: Dashboard → JobList → NewJob → JobDetail.
7. Restyle Technician screens: MyJobs → TechJobDetail.
8. Admin panel: `tailwind.config.ts` → `globals.css` → `Sidebar` → `MetricCard` →
   `DataTable` → `StatusPill` → `Toast` → page by page.
9. Final pass: add animations (reanimated on mobile, framer-motion on web).
10. Accessibility pass: add all `accessibilityLabel` props and ARIA attributes.

---

*End of UI/UX Overhaul Master Prompt.*
*Generated for RepairShop — Nilakshith Enterprise, July 2026.*
