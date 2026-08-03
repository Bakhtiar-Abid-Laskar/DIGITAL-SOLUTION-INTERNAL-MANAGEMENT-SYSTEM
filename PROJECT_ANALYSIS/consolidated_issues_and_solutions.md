# RepairShop — Consolidated Issues & Solutions Reference

**Compiled from:** `01_PROJECT_OVERVIEW.md`, `02_ARCHITECTURE.md`, `11_SECURITY_AUDIT.md`, `12_PERFORMANCE_ANALYSIS.md`, `13_DEPENDENCY_AUDIT.md`, `14_CODE_QUALITY_AUDIT.md`, `15_BUGS_AND_GAPS.md`, `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`

> **Note on scope:** Nine of the seventeen uploaded documents were provided as full text and are fully reflected below. The other eight (`03_DIRECTORY_STRUCTURE.md`, `04_WEBSITE_FILE_ANALYSIS.md`, `05_MOBILE_APP_FILE_ANALYSIS.md`, `06_DATABASE_SCHEMA.md`, `07_API_EDGE_FUNCTIONS.md`, `08_USER_FLOWS.md`, `09_UI_UX_DESIGN_SYSTEM.md`, `10_COMPONENT_HIERARCHY.md`) were listed as uploaded but their content wasn't included in this pass, so any issues unique to those documents aren't captured here. If you want them folded in too, share their content and this doc can be extended.

---

## How to Read This Document

- Every issue has a unique ID, a severity, the source document(s) it came from, a plain description, and a concrete fix.
- Where the same underlying problem was flagged in more than one source document (this happens a lot — e.g. the cross-app import, or `completed_at` timing), it's merged into a single entry with all source references, not duplicated.
- Severity follows the security/bugs docs' convention: **Critical** (block production) → **High** (fix before scale) → **Medium** (fix within first month/before scale) → **Low** (nice to have).
- A separate section at the end covers **Feature Gaps** (things that don't exist yet, not bugs) and **Technical Debt** (structural issues with no single "bug," more of an ongoing cost).

---

## 🔴 CRITICAL — Fix Before Production Launch

### ISSUE-001: `AddStaffModal` may expose or misuse the Supabase service role key
**Source:** `11_SECURITY_AUDIT.md` (Issue 4, §2), `15_BUGS_AND_GAPS.md` (BUG-003), `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** Creating a Supabase Auth user requires admin/service-role privilege. `AddStaffModal.tsx` runs entirely in the browser. It's unverified whether it (a) improperly uses the service role key client-side, (b) relies on an overly permissive RLS policy + anon key, or (c) already correctly delegates to an Edge Function.
**Fix:** Move user creation into a dedicated Supabase Edge Function that uses the service role key server-side, and have `AddStaffModal` call it via `supabase.functions.invoke('admin-create-user', { body: { name, email, password, role } })`. Verify no service role key ever appears in the admin panel bundle.

### ISSUE-002: RLS policies exist by convention but were never verified in the repository
**Source:** `11_SECURITY_AUDIT.md` (Issue 1, §2), `20_ROADMAP.md`
**Problem:** No `supabase/migrations/` folder with actual RLS policy SQL was found. Code patterns imply correct policies (e.g. technician row isolation), but the real policy definitions haven't been confirmed to exist or be correct.
**Fix:** Run `supabase inspect db rls` against the live project and manually verify every table (`users`, `jobs`, `job_materials`, `attendance`, `billing`, `salary`, `staff_rates`, `payments`, `inventory`) has the intended SELECT/INSERT/UPDATE/DELETE policies before go-live.

### ISSUE-003: No webhook signature verification on Edge Functions
**Source:** `11_SECURITY_AUDIT.md` (Issue 2, §6), `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** `notify-on-job-created` and `notify-on-status-change` accept any HTTP POST with the right JSON shape — there's no verification the request actually came from Supabase's own webhook system.
**Fix:** Add signature verification using a shared `SUPABASE_WEBHOOK_SECRET`, checked at the top of each Edge Function before any processing occurs.

### ISSUE-004: No automated tests anywhere in the codebase
**Source:** `14_CODE_QUALITY_AUDIT.md` (§9), `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** Zero test files exist for a system handling customer data, financial calculations (billing, salary), and staff attendance records. This is the single largest quality gap in the project.
**Fix (priority order):**
1. Unit test `calculateGrandTotal()` — e.g. `calculateGrandTotal(500, 300, 18, 50)` must equal `894`
2. Unit test the salary formula (present/halfday/OT/early/advance → net)
3. Unit test phone number normalization (`formatIndianPhoneForWhatsApp`)
4. Integration test the job creation flow
5. E2E test the auth guard / role routing
6. Verify RLS policies with a dedicated Supabase policy test suite

### ISSUE-005: Cross-application file import between mobile and admin panel
**Source:** `01_PROJECT_OVERVIEW.md` (§12), `14_CODE_QUALITY_AUDIT.md` (§7), `15_BUGS_AND_GAPS.md` (BUG-004), `21_MASTER_REFERENCE.md` — flagged as **the #1 architectural concern** in the master reference
**Problem:**
```typescript
// RepairShopApp/src/screens/receptionist/BillingScreen.tsx
import { generateDocumentHtml } from '../../../../admin-panel/src/shared/documents/DocumentRenderer'
```
The mobile app imports source code directly from the admin panel's directory, requiring `metro.config.js` `watchFolders` configuration to even resolve. If the admin panel is moved, renamed, or deployed without the mobile app's directory structure present, **the mobile app breaks at build time.**
**Fix:** Either (a) duplicate `DocumentRenderer` into the mobile app as a standalone copy (fastest), or (b) extract it into a shared workspace package (`packages/shared/`) that both apps import from — the more correct long-term fix, also recommended for `billing.ts`, `formatCurrency.ts`, `StatusBadge`, and `PriorityBadge`, all of which have the same duplication problem (see ISSUE-013).

---

## 🟠 HIGH — Fix Before Significant Scale

### ISSUE-006: Push notification tap does nothing (deep linking not implemented)
**Source:** `11_SECURITY_AUDIT.md` (§7), `15_BUGS_AND_GAPS.md` (BUG-001), `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** Tapping a push notification (e.g. "New Job Assigned — RS-2026-0001") only logs the response to console — the user isn't navigated anywhere, even though the payload already contains `{ screen: 'JobDetail', jobId: '...' }`.
**Fix:**
```typescript
responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data
  if (data?.screen === 'JobDetail' && data?.jobId) {
    navigationRef.current?.navigate('UpdateWork', { jobId: data.jobId })
  }
})
```

### ISSUE-007: No brute-force protection on admin panel login
**Source:** `11_SECURITY_AUDIT.md` (Issue 3, §1)
**Problem:** Supabase Auth allows unlimited login attempts by default; nothing in the admin panel adds rate limiting.
**Fix:** Enable Supabase Auth rate limiting in the project's auth settings.

### ISSUE-008: CORS `Allow-Origin: *` on Edge Functions
**Source:** `11_SECURITY_AUDIT.md` (Issue 1, §6)
**Problem:** All three Edge Functions allow any origin. This is unnecessary for the two webhook-triggered functions (webhooks don't go through browser CORS at all) and unnecessarily permissive for the browser-callable one.
**Fix:** Restrict `Access-Control-Allow-Origin` to the specific admin panel domain for any function callable from a browser context.

### ISSUE-009: No rate limiting on `send-invoice-email`
**Source:** `11_SECURITY_AUDIT.md` (Issue 3, §6)
**Problem:** A malicious or buggy client could spam invoice emails with no throttling, risking Resend account abuse/billing.
**Fix:** Add rate limiting (client-side debounce as a stopgap, server-side throttling as the real fix).

### ISSUE-010: Admin dashboard runs 7 Supabase queries sequentially instead of in parallel
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§3, §6) — flagged as **highest impact / lowest effort fix in the entire performance audit**
**Problem:**
```typescript
const { count: jobsTodayCount } = await supabase.from('jobs')...
const { count: completedWeekCount } = await supabase.from('jobs')...
// ...5 more, all sequential
```
Total sequential time ≈700–1900ms vs. an estimated ≈150–350ms if parallelized — roughly a 70% reduction available for near-zero effort.
**Fix:**
```typescript
const [todayCount, weekCount, techCount, pendingCount, inventory, recent, statusData] =
  await Promise.all([query1, query2, query3, query4, query5, query6, query7])
```

### ISSUE-011: No caching layer anywhere (no TanStack Query / SWR)
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§2, §6), `13_DEPENDENCY_AUDIT.md`, `20_ROADMAP.md`
**Problem:** Every screen/page navigation refetches from scratch, even if the same data was just fetched seconds ago. Navigating job list → job detail → back to job list triggers two full fetches every time.
**Fix:** Add `@tanstack/react-query` to both apps for stale-while-revalidate caching and automatic background refetch.

### ISSUE-012: Recharts loaded eagerly, dominates admin panel bundle size
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§3), `13_DEPENDENCY_AUDIT.md`
**Problem:** `recharts` (~300KB) is used on only 2 of ~10 admin pages but is bundled for all of them.
**Fix:**
```typescript
import dynamic from 'next/dynamic'
const PieChart = dynamic(() => import('recharts').then(m => m.PieChart), { ssr: false })
```

### ISSUE-013: Duplicated business-logic utilities and components across both apps
**Source:** `14_CODE_QUALITY_AUDIT.md` (§5, §10), `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** The following exist as separate, independently-maintained copies in both `admin-panel` and `RepairShopApp` — they will silently drift out of sync as one gets updated without the other:
| Utility/Component | Risk if it drifts |
|---|---|
| `calculateGrandTotal()` / `calculatePartsTotal()` (billing.ts) | Invoice totals could disagree between mobile and web |
| `formatCurrency()` | Inconsistent number formatting between apps |
| `StatusBadge` / `PriorityBadge` components | Visual inconsistency between mobile and web |
| Job type definitions | Type drift between apps for the same domain object |
**Fix:** Extract all of the above into a shared `/packages/shared` directory, referenced by both apps via workspace symlinks/path aliasing (same fix category as ISSUE-005).

### ISSUE-014: Version mismatch between client Supabase SDK and Edge Function Supabase SDK
**Source:** `13_DEPENDENCY_AUDIT.md`
**Problem:** Edge Functions pin `@supabase/supabase-js@2.39.0` while clients use `^2.45.4` (mobile) and `^2.110.0` (admin) — a significant version gap that risks API drift.
**Fix:** Unify all three to the same (or a deliberately-chosen compatible) version, and re-test Edge Function behavior after the bump.

### ISSUE-015: No error tracking in production (no Sentry/Bugsnag)
**Source:** `13_DEPENDENCY_AUDIT.md`, `20_ROADMAP.md`, `21_MASTER_REFERENCE.md`
**Problem:** No visibility into production crashes or errors on either app.
**Fix:**
```bash
npx expo install @sentry/react-native   # Mobile
npm install @sentry/nextjs              # Admin
```

---

## 🟡 MEDIUM — Fix Within the First Month / Before Scale

### ISSUE-016: `completed_at` timestamp is set by the client device's clock
**Source:** `14_CODE_QUALITY_AUDIT.md` (§5), `15_BUGS_AND_GAPS.md` (BUG-002)
**Problem:** `UpdateWorkScreen.tsx` sets `updates.completed_at = new Date().toISOString()` client-side — vulnerable to device clock drift or a manipulated device clock recording an inaccurate completion time.
**Fix (recommended — DB-level):**
```sql
CREATE OR REPLACE FUNCTION set_completed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'Completed' AND OLD.status != 'Completed' THEN
    NEW.completed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```
(Client-side is explicitly noted as "acceptable" if the team decides staff can be trusted and prefers to leave it as-is — but the DB trigger is the more correct fix.)

### ISSUE-017: Realtime subscription torn down and recreated on every filter change (admin Jobs page)
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§3), `14_CODE_QUALITY_AUDIT.md` (§6), `15_BUGS_AND_GAPS.md` (BUG-015)
**Problem:**
```typescript
useEffect(() => {
  fetchJobs()
  const channel = supabase.channel('admin-joblist-changes').subscribe()
  return () => supabase.removeChannel(channel)
}, [statusFilter, techFilter, priorityFilter, currentPage, debouncedSearchQuery, dateFrom, dateTo])
```
Every filter tweak while the user is actively filtering unsubscribes and resubscribes the realtime channel.
**Fix:** Separate the realtime subscription into its own `useEffect` with a stable/empty dependency array, decoupled from the data-fetch effect that legitimately needs to re-run on filter change.

### ISSUE-018: No confirmation dialog or notification on technician reassignment
**Source:** `15_BUGS_AND_GAPS.md` (BUG-005), `20_ROADMAP.md`
**Problem:** A receptionist can reassign a job's technician with no confirmation step, and the newly-assigned technician receives no notification (only initial assignment triggers `notify-on-job-created`).
**Fix:** Add a confirmation dialog before reassignment, and either extend `notify-on-status-change` or add a new `notify-on-tech-reassigned` Edge Function.

### ISSUE-019: Unclear whether salary calculations persist without an explicit save
**Source:** `15_BUGS_AND_GAPS.md` (BUG-006)
**Problem:** It's ambiguous whether calculating a salary breakdown automatically saves it to the `salary` table, or whether a separate save action is required — risking silent data loss on page refresh.
**Fix:** Ensure an explicit `UPSERT INTO salary` runs immediately after calculation, with clear UX feedback (toast/confirmation) that the record was saved.

### ISSUE-020: Low stock threshold filter uses a falsy check instead of a null check
**Source:** `15_BUGS_AND_GAPS.md` (BUG-007)
**Problem:**
```typescript
const lowItems = allInventory.filter(item => item.quantity <= (item.low_stock_threshold || 5))
```
An item with an intentional `low_stock_threshold = 0` gets incorrectly treated as if its threshold were `5`, because `0` is falsy.
**Fix:**
```typescript
const lowItems = allInventory.filter(item => item.quantity <= (item.low_stock_threshold ?? 5))
```

### ISSUE-021: Attendance history doesn't show OT/early-departure hours to staff
**Source:** `15_BUGS_AND_GAPS.md` (BUG-008)
**Problem:** `ot_hours` and `early_hours` are stored and used for salary calculation, but staff have no way to see or verify them in the app.
**Fix:** Add OT/early hours fields to the `AttendanceHistoryCard` component's display.

### ISSUE-022: No server-side input validation in Edge Functions
**Source:** `11_SECURITY_AUDIT.md` (Issue 1, §5)
**Problem:** Edge Functions only do basic type checks on incoming payloads; malformed data is caught by try/catch and returns a generic 500, but nothing validates payload *shape* up front.
**Fix:** Add explicit schema validation (e.g. Zod or manual shape checks) at the top of every Edge Function handler.

### ISSUE-023: Loose phone number validation
**Source:** `11_SECURITY_AUDIT.md` (Issue 3, §5)
**Problem:** `cleanPhoneNumber()` only strips spaces/dashes/brackets — no length or format validation before DB storage. Only the WhatsApp-send path does E.164 normalization.
**Fix:** Add min/max digit-length validation (10/12/13 digits as appropriate) directly on the intake form, not just at WhatsApp-send time.

### ISSUE-024: No Next.js `middleware.ts` for server-side route protection
**Source:** `11_SECURITY_AUDIT.md` (Issue 2, §1)
**Problem:** All auth guarding in the admin panel is client-side (`AuthContext` redirect). If JS fails to load or loads slowly, an unauthenticated page flash is theoretically possible (though RLS still protects the actual data).
**Fix:** Add `middleware.ts` to enforce route protection at the server/edge level, in addition to the existing client-side guard.

### ISSUE-025: Excessive `any` usage throughout both codebases
**Source:** `14_CODE_QUALITY_AUDIT.md` (§2)
**Problem:** ~15–20 instances of `useNavigation<any>()`, `useState<any>(null)`, etc., defeating the purpose of TypeScript's type safety in exactly the places (job, billing) where it matters most.
**Fix:** Replace with proper generics/interfaces, e.g. `useState<Job | null>(null)`, `useNavigation<NativeStackNavigationProp<RootStackParamList>>()`.

### ISSUE-026: Large monolithic screen/page files
**Source:** `14_CODE_QUALITY_AUDIT.md` (§4)
**Problem:** `AttendanceScreen.tsx` (500+ lines), `BillingScreen.tsx` (480+ lines), and `admin/jobs/[id]/page.tsx` (805 lines, 4 tabs in one file) each mix multiple concerns (camera, GPS, upload, display / billing form + actions + document generation / 4 separate tabs) in a single file.
**Fix:** Decompose each into focused sub-components — e.g. split the job detail page's 4 tabs into 4 separate tab components with a shared shell.

### ISSUE-027: No retry logic for failed image/selfie uploads
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§2), `14_CODE_QUALITY_AUDIT.md` (§3)
**Problem:** A network blip during `supabase.storage.from('attendance-selfies').upload(...)` fails the entire check-in with no automatic retry.
**Fix:** Add a retry-with-backoff wrapper around storage upload calls (2–3 attempts), and surface a clear "Upload failed, tap to retry" state to the user if all retries fail.

### ISSUE-028: Storage growth approaching free-tier limits
**Source:** `12_PERFORMANCE_ANALYSIS.md` (§5)
**Problem:** ~520 attendance photos/month × ~150KB ≈ 78MB/month ≈ 940MB/year — Supabase's free 1GB storage tier will be exceeded around month 13.
**Fix:** Plan the Supabase Pro upgrade ($25/month, 8GB storage) ahead of that timeline rather than reactively.

### ISSUE-029: Caught errors typed as `any` lose type safety
**Source:** `14_CODE_QUALITY_AUDIT.md` (§3)
**Problem:**
```typescript
catch (err: any) {
  showToast({ message: err.message })
}
```
**Fix:**
```typescript
catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error occurred'
  showToast({ message })
}
```

---

## 🟢 LOW — Nice to Have

| ID | Issue | Source | Fix |
|---|---|---|---|
| ISSUE-030 | `job_code_seq` never resets per year — codes become 5+ digits after job #9999 | `12_PERFORMANCE_ANALYSIS.md`, `15_BUGS_AND_GAPS.md` (BUG-009) | Not functionally broken; if annual reset is desired, use a year-aware sequence/function. Extremely unlikely to matter for a single shop. |
| ISSUE-031 | Invoice email "from" address hardcoded to `billing@yourdomain.com` | `15_BUGS_AND_GAPS.md` (BUG-011) | Make it an env var: `Deno.env.get('RESEND_FROM_EMAIL') \|\| 'billing@yourdomain.com'` |
| ISSUE-032 | Reports page has no date-range filter for Revenue (all-time only) | `15_BUGS_AND_GAPS.md` (BUG-012), `20_ROADMAP.md` | Add from/to month pickers to the Revenue tab |
| ISSUE-033 | Admin mobile screens are far less capable than the web admin panel (read-only inventory, no charts in reports, no attendance modal in staff) | `15_BUGS_AND_GAPS.md` (BUG-013) | Feature-parity backlog item, not a bug |
| ISSUE-034 | Customers tab (mobile) not implemented — shows `ComingSoonScreen` | `01_PROJECT_OVERVIEW.md`, `15_BUGS_AND_GAPS.md` (BUG-014), `20_ROADMAP.md` | Build customer search/history screen (planned Phase 2) |
| ISSUE-035 | No certificate pinning on mobile HTTPS connections | `11_SECURITY_AUDIT.md` | Very low priority for this class of internal business app |
| ISSUE-036 | No admin panel session timeout beyond Supabase's default | `11_SECURITY_AUDIT.md` | Add explicit session timeout if desired |
| ISSUE-037 | No JSDoc on business-critical utility functions (`calculateGrandTotal`, etc.) | `14_CODE_QUALITY_AUDIT.md` (§8) | Add JSDoc blocks documenting formula, params, and return value |
| ISSUE-038 | Dead/commented-out code revealing an abandoned refactor in `UpdateWorkScreen.tsx` | `14_CODE_QUALITY_AUDIT.md` (§8) | Delete the commented-out block |
| ISSUE-039 | Dev/test scripts committed to repo root (`confirm_admin.js`, `test_edge.js`, `test_fetch.js`, `test_insert.js`, `replaceAlerts.js`, `test_login.js`) | `14_CODE_QUALITY_AUDIT.md` (§7) | Move into a `scripts/` folder or gitignore them |
| ISSUE-040 | Named magic values not extracted as constants (`.lte('quantity', 5)`, `setTimeout(..., 2000)`, `height: 64`) | `14_CODE_QUALITY_AUDIT.md` (§11) | Extract as `DEFAULT_LOW_STOCK_THRESHOLD`, `PUSH_TOKEN_RETRY_DELAY_MS`, `TAB_BAR_HEIGHT` |
| ISSUE-041 | No upload progress indicator during selfie upload | `12_PERFORMANCE_ANALYSIS.md` (§6) | Add a progress UI during storage upload |
| ISSUE-042 | Inconsistent skeleton-loading usage across mobile screens | `12_PERFORMANCE_ANALYSIS.md` (§6) | Audit for consistent `SkeletonCard` usage everywhere data loads |
| ISSUE-043 | No `getItemLayout`/tuning on `FlatList` instances | `12_PERFORMANCE_ANALYSIS.md` (§2) | Add `getItemLayout`, `initialNumToRender={10}`, `maxToRenderPerBatch={5}`, `windowSize={10}` |
| ISSUE-044 | No image caching (`react-native-fast-image` or `expo-image`) | `12_PERFORMANCE_ANALYSIS.md`, `13_DEPENDENCY_AUDIT.md` | `npx expo install expo-image` and migrate from the default `Image` component |
| ISSUE-045 | Signed Storage URLs regenerated on every render instead of cached | `12_PERFORMANCE_ANALYSIS.md` (§6) | Cache signed URLs for ~55 minutes (they expire at 60) |
| ISSUE-046 | `lucide-react` version listed as `^1.22.0` — unusually high for this package | `13_DEPENDENCY_AUDIT.md` | Verify this version number is actually correct and not a typo/mismatch |
| ISSUE-047 | No lint/test npm scripts in the mobile app's `package.json` | `13_DEPENDENCY_AUDIT.md` | Add `"lint"` and `"test"` scripts once tests exist |

---

## 🧱 ARCHITECTURAL / STRUCTURAL TECHNICAL DEBT (not single bugs — ongoing costs)

| ID | Debt Item | Source | Why It Matters |
|---|---|---|---|
| DEBT-001 | No shared code package between mobile and admin — duplication is the default, not the exception | `14_CODE_QUALITY_AUDIT.md`, `20_ROADMAP.md`, `21_MASTER_REFERENCE.md` | Directly causes ISSUE-005 and ISSUE-013; the long-term fix is a `packages/shared` workspace (Nx/Turborepo), planned as a 6–12 month item |
| DEBT-002 | No state-management/caching library (no Redux, Zustand, TanStack Query, SWR) | `02_ARCHITECTURE.md`, `12_PERFORMANCE_ANALYSIS.md` | Acceptable at current scale (1–5 concurrent users); becomes a real cost as usage grows — see ISSUE-011 |
| DEBT-003 | No offline support of any kind (no service worker, no local SQLite, no optimistic UI/sync queue) | `02_ARCHITECTURE.md` (§15) | This is a fully online-only system by design; poor connectivity produces hard failures with `ErrorState`, not degraded functionality |
| DEBT-004 | Full-table Realtime subscriptions on the admin panel (no server-side filter) | `02_ARCHITECTURE.md` (§6), `11_SECURITY_AUDIT.md`, `12_PERFORMANCE_ANALYSIS.md` | Fine at current scale since RLS still governs actual data access; becomes a DB-load concern at 100+ concurrent users |
| DEBT-005 | No Supabase-generated TypeScript types (`supabase gen types typescript`) | `20_ROADMAP.md` | Types are hand-maintained and can silently drift from the actual DB schema |
| DEBT-006 | No Server Components used in the admin panel — 100% client-rendered | `12_PERFORMANCE_ANALYSIS.md` (§3), `20_ROADMAP.md` | Every page pays a full client-side waterfall (HTML → JS → session check → data fetch) that Server Components could shortcut |
| DEBT-007 | No monorepo tooling (Nx/Turborepo) despite being a de facto multi-app monorepo | `20_ROADMAP.md` | Long-term (6–12 month) item, prerequisite for DEBT-001's clean resolution |
| DEBT-008 | No accessibility audit performed on the admin panel | `20_ROADMAP.md` | WCAG 2.1 AA compliance not yet assessed |

---

## 📋 FEATURE GAPS (not bugs — things that don't exist yet)

| ID | Missing Feature | Priority (per roadmap) |
|---|---|---|
| GAP-001 | Customer search/history tab (mobile) | Phase 2 |
| GAP-002 | Job history date-range filtering (mobile job list) | Phase 2 |
| GAP-003 | Offline graceful degradation | Phase 2 |
| GAP-004 | Bulk job status updates (admin) | Phase 2 |
| GAP-005 | Attendance CSV export for payroll (admin) | Phase 2 |
| GAP-006 | Job analytics — average repair time per device type | Phase 2 |
| GAP-007 | Customer CRM with lifetime job history/revenue | Phase 2 |
| GAP-008 | Job-aging alerts (flag stale jobs by age) | Phase 2 |
| GAP-009 | SLA tracking by priority | Phase 2 |
| GAP-010 | Auto-escalation for stalled Urgent jobs | Phase 2 |
| GAP-011 | Multi-location support | Phase 3 |
| GAP-012 | Customer-facing portal (track job, pay online, ratings) | Phase 3 |
| GAP-013 | In-shop UPI/Razorpay/PayU payment integration | Phase 3 |
| GAP-014 | Auto-deduct inventory on material use, supplier management, PO generation, barcode scanning | Phase 3 |
| GAP-015 | Leave management, shift scheduling, auto OT/early calculation, salary advance approval workflow | Phase 3 |
| GAP-016 | AI-assisted diagnosis suggestions, repair-time estimation, parts price suggestion | Phase 4 |
| GAP-017 | Process automation (auto-assign technician, reminders, follow-ups, reorder alerts) | Phase 4 |

---

## Suggested Execution Order

This mirrors the priority ordering already established across the security audit, bugs doc, and roadmap — it's the single most consistent recommendation across all nine source documents:

1. **Immediate / pre-launch:** ISSUE-001, ISSUE-002, ISSUE-003, ISSUE-004, ISSUE-005 (all Critical)
2. **Before meaningful scale:** ISSUE-006 through ISSUE-015 (High)
3. **First month after launch:** ISSUE-016 through ISSUE-029 (Medium)
4. **Ongoing / opportunistic:** ISSUE-030 through ISSUE-047 (Low) and the DEBT-* items, tackled alongside regular feature work rather than as a dedicated sprint
5. **Feature roadmap:** GAP-* items, sequenced per the existing Phase 2 → 3 → 4 roadmap structure

---

## Master Severity Summary

| Severity | Count |
|---|---|
| 🔴 Critical | 5 |
| 🟠 High | 10 |
| 🟡 Medium | 14 |
| 🟢 Low | 18 |
| 🧱 Architectural Debt | 8 |
| 📋 Feature Gaps | 17 |
| **Total items tracked** | **72** |

*End of consolidated reference.*
