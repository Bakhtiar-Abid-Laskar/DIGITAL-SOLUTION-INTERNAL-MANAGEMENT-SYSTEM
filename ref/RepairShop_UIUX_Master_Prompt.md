# MASTER PROMPT — RepairShop Mobile App: Full UI/UX Redesign Pass
**Target agent:** Antigravity (AI coding agent)
**Codebase:** React Native (Expo, TypeScript), Supabase backend, `tokens.ts` design system
**Scope:** Mobile app only (Receptionist, Technician, Admin-mobile-view roles). Admin web panel is out of scope for this pass — it is already at an acceptable baseline (7-8/10) and should not be touched.

---

## 0. CONTEXT FOR THE AGENT — READ FIRST

The current build is on a **dark theme** (`background: #121212`, `card: #1e1e1e`), built with pure React Native primitives, no UI kit, native `StyleSheet`. This was a deliberate earlier decision (battery saving, glare reduction in workshop lighting) but it has been **superseded**. We are moving to a new, finalized visual direction. Do not treat the current dark theme as something to "polish" — it is being replaced.

Two prior audits identified functional strengths (pull-to-refresh, loading/empty states, role-based filtering, semantic badges) that must be preserved. The redesign is visual and structural, not a rebuild of app logic. Do not change data-fetching, Supabase queries, navigation logic, or role-gating — only the presentation layer, unless a bug is explicitly called out below.

Screenshots of every current screen have been reviewed. Known current-state problems to fix are itemized per-screen in Section 4.

---

## 1. FINALIZED DESIGN DIRECTION

Replace the dark fintech aesthetic entirely with:

- **Canvas:** Pure white background (`#FFFFFF`) as the base. No dark mode anywhere in the app — no system dark mode detection, no dark theme toggle, no dark screens. Every screen, including modals and sheets, renders on the light/white canvas. The one intentional exception is the floating bottom nav bar itself (see "Navigation" below), which stays dark-toned as a deliberate accent component against the white canvas — that is a design choice for one element, not a dark mode.
- **Job status cards:** Pastel-tinted cards per status (soft yellow for pending, soft blue for in-progress, soft green for completed, soft red/coral for urgent) — tints, not saturated fills. Card backgrounds should feel like paper, not UI chrome.
- **Navigation:** A dark, floating pill-shaped bottom nav bar (rounded-full container, elevated with shadow, sitting above the content with margin on all sides — not edge-to-edge). Active tab gets a filled indicator or icon+label; inactive tabs are icon-only or muted.
- **Motion:** Spring-based animations (`react-native-reanimated` withSpring, not withTiming/linear) for screen transitions, modal presentation, tab switches, and card press states. Avoid linear/ease curves — everything should feel bouncy but controlled (damping ~15-20, stiffness ~150-180 as a starting point; agent should tune to feel natural, not cartoonish).
- **Typography:** Keep native system fonts (San Francisco / Roboto) for performance, but establish a clear type scale (see tokens below) — current app has inconsistent sizing between screens.
- **Elevation:** Replace flat dark cards with soft, neutral-toned shadows (not harsh black drop shadows) — think `shadowColor: '#8B7355'` at low opacity rather than pure black.
- **No emoji anywhere in the UI.** The current build uses emoji as icons in several places (camera emoji 📷 on the "Arrival Selfie" / "Device Before/After" buttons in the onsite visit flow, checkmark emoji ✅ in the Job Created confirmation modal, and any others found during the audit). Every one of these must be replaced with a proper icon from `lucide-react-native` (e.g. `Camera` for the photo-capture buttons, `CheckCircle2` for success confirmations). Do a full sweep of every screen and modal for emoji characters in JSX/strings — not just the two called out here — and replace all of them with icon components sized and colored per the token system.

### Design tokens (add/update `tokens.ts`)

```ts
export const colors = {
  // Canvas
  background: '#FFFFFF',
  backgroundAlt: '#F7F7F5',
  surface: '#FFFFFF',

  // Text
  textPrimary: '#2A2521',
  textSecondary: '#6B6259',
  textMuted: '#A69C8E',

  // Status pastels (card backgrounds)
  statusPendingBg: '#FFF4D6',
  statusPendingFg: '#B8860B',
  statusInProgressBg: '#DCEBFA',
  statusInProgressFg: '#2563A8',
  statusCompletedBg: '#DFF3E3',
  statusCompletedFg: '#2E8B57',
  statusUrgentBg: '#FDE2E1',
  statusUrgentFg: '#C0392B',

  // Nav
  navBackground: '#1E1B18',
  navActive: '#FFFFFF',
  navInactive: '#7A7369',

  // Borders / dividers
  border: '#E8E6E1',

  // Feedback
  success: '#2E8B57',
  error: '#C0392B',
  warning: '#B8860B',
};

export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };

export const radius = { sm: 8, md: 14, lg: 20, pill: 999 };

export const typography = {
  h1: { fontSize: 28, fontWeight: '700' },
  h2: { fontSize: 22, fontWeight: '700' },
  h3: { fontSize: 18, fontWeight: '600' },
  body: { fontSize: 15, fontWeight: '400' },
  bodyBold: { fontSize: 15, fontWeight: '600' },
  caption: { fontSize: 13, fontWeight: '400' },
  label: { fontSize: 12, fontWeight: '600', letterSpacing: 0.4, textTransform: 'uppercase' },
};

export const shadow = {
  card: {
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  nav: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
};
```

Do not hardcode colors/spacing/typography anywhere in components after this change — everything routes through `tokens.ts`. Audit and replace any inline hex values or magic numbers found in existing screens.

---

## 2. COMPONENT-LEVEL REQUIREMENTS

### 2.1 Bottom Navigation (new component: `FloatingTabBar.tsx`)
- Floating pill container, `position: absolute`, `bottom: 24, left: 20, right: 20`, `borderRadius: radius.pill`, `backgroundColor: colors.navBackground`, apply `shadow.nav`.
- Icons from `lucide-react-native` (already in use per admin panel — bring to mobile for consistency), size 22-24.
- Active tab: icon in `colors.navActive`, optional label beneath at `typography.caption`, subtle pill/dot indicator behind icon animated with spring on tab change.
- Inactive tabs: icon only, `colors.navInactive`.
- Respect safe area — add bottom inset padding so the pill never collides with home indicator on iOS or gesture bar on Android (see Section 3, safe-area issues).

### 2.2 Status Card / Job Card
- `borderRadius: radius.md`, background = pastel tint per status, no border, apply `shadow.card`.
- Status text as a small pill badge inside the card (`radius.pill`, `backgroundColor` = darker tint of same hue, `color` = status Fg token), not just colored text.
- Press state: scale to 0.97 with spring on `onPressIn`, back to 1 on release — use `Animated.View` + `Pressable`.

### 2.3 Buttons
- Primary: solid dark (`colors.navBackground`) background, white text, `radius.md`, spring scale-down on press.
- Secondary/outline: 1.5px border in `colors.border`, transparent background, dark text.
- Destructive: `colors.error` background or border, used sparingly (reject/delete actions only).

### 2.4 Empty States
- Current empty states are plain italic text only — upgrade to: centered simple line-art SVG icon (muted tone) + heading (`typography.h3`) + supporting caption (`typography.caption`, `colors.textMuted`). No stock illustrations, no emoji — keep them minimal/geometric, matching the light palette.

### 2.5 Loading States
- Replace/standardize the existing `<LoadingState />` to use skeleton shimmer blocks shaped like the content they're replacing (card-shaped skeletons for job lists, line-shaped skeletons for detail fields) rather than a generic spinner, for all list views. Spinner is acceptable only for full-screen initial loads and button-level pending states.

---

## 3. BUG FIXES TO ADDRESS IN THE SAME PASS

These are functional/layout defects, not purely visual, but should be fixed while touch is on these files:

1. **Silent RLS write failures** — every Supabase write (insert/update) must surface a visible error state (toast or inline banner) if the RLS policy rejects it, instead of failing silently. Add a shared `useSupabaseMutation` wrapper or equivalent that catches and surfaces `error` from every `.from().insert()/.update()` call.
2. **Realtime gaps** — verify all list screens (Dashboard, Job List, Admin Jobs) that display live job/status data are subscribed via Supabase Realtime channels, not just fetched once on mount. Add subscriptions where missing and clean up on unmount.
3. **Safe-area layout** — audit every screen for `SafeAreaView`/`useSafeAreaInsets` usage. With the new floating nav bar, all scrollable content needs bottom padding ≥ (nav bar height + bottom inset + 16) so the last list item / primary button is never obscured.
4. **GPS permission handling** — Attendance screen must handle all three permission states explicitly: not-yet-asked (show request prompt), denied (show a clear message with a button to open device settings), granted (proceed to fetch location). Currently only the happy path appears handled. Add a proper loading state for the location fetch itself (skeleton over the map/coordinate area, not a blank space).
5. **Invoice generation edge cases** — Billing screen: when discount and tax are both 0, the Grand Total row must still render clearly (not blank/confusing formatting). Make the final total visually dominant: larger bold font inside a colored panel (use `statusCompletedBg`/`Fg` tokens or a dedicated "total" treatment), separated from the line-item list by a divider.

---

## 4. SCREEN-BY-SCREEN PASS (from reviewed screenshots + audits)

Apply Section 1-2 tokens/components to every screen. Additional per-screen notes:

**Login/Auth screen** — currently dark, cramped form. Rebuild on white canvas, generous vertical spacing between fields, primary button in dark pill style, logo treatment consistent with brand.

**Dashboard (Receptionist/Technician)** — stat cards currently flat dark blocks; rebuild as pastel cards per Section 2.2, with icons (lucide-react-native) matching each stat's semantic meaning. Ensure `RefreshControl` tint color matches new theme (default RN spinner is black — set `tintColor` to a token color that reads on white).

**Job List** — apply new job cards, ensure status badges use the pastel token pairs (not the old flat red/etc.), keep the priority color-coding logic but re-skin colors to the pastel status set.

**Job Detail / Tech Job Detail** — the materials-add modal is called out as clunky for multiple items; keep functionality but restyle modal per new surface/radius/shadow tokens, and increase touch target size on add/remove row controls.

**New Job Screen** — already the highest-scoring screen (9/10) structurally; only needs re-skinning to new tokens, no structural changes. Re-verify KeyboardAvoidingView behavior on small screens (iPhone SE) once spacing changes.

**Attendance Screen** — re-skin camera preview container with proper aspect-ratio handling (`aspectRatio` prop, not fixed height) so it doesn't look stretched/cropped on different device sizes; add skeleton loader for location fetch (see bug fix #4).

**Billing/Invoice Screen** — re-skin line items as white surface cards, fix Grand Total treatment (see bug fix #5), ensure print/share button uses primary button style.

**Modals (materials add, confirmations, etc.)** — standardize a single modal shell component: rounded top corners (`radius.lg`), white/surface background, spring-based slide-up presentation, drag handle at top.

---

## 5. WHAT NOT TO CHANGE

- Do not alter navigation structure, route names, or role-based screen access.
- Do not touch the Admin web panel (Next.js/Tailwind) in this pass.
- Do not change Supabase schema, RLS policies themselves, or query logic beyond the error-surfacing wrapper in bug fix #1.
- Do not introduce a heavy UI kit (e.g., NativeBase, Paper) — continue with primitives + tokens + lucide-react-native icons only, to preserve performance.
- Do not implement or leave in place any dark mode / dark theme variant, `useColorScheme()`-driven theme switching, or dark-mode media query handling. Light mode is the only mode.
- Do not leave any emoji characters in JSX, strings, or button labels anywhere in the codebase — every emoji must be replaced with a `lucide-react-native` icon per Section 1.

## 6. DELIVERABLE FORMAT

For each screen touched, output:
1. Full updated file content (not a diff) for the screen component.
2. Any new shared components created, as separate files with a note on where to place them.
3. Updated `tokens.ts` in full.
4. A short changelog per file: what visual/structural change was made and why.

Do not skip a screen from Section 4 — treat this as a complete pass, not a sample.
