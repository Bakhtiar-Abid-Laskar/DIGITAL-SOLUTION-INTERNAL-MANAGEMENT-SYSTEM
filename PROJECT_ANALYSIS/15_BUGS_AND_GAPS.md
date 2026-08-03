# RepairShop — Known Bugs, Gaps, and Issues

## Critical Issues (Must Fix Before Production)

---

### BUG-001: Push Notification Deep Linking Not Implemented

**Severity:** High  
**App:** Mobile  
**Location:** `RepairShopApp/src/hooks/usePushNotifications.ts`

**Description:**
When a user taps a push notification (e.g., "New Job Assigned — RS-2026-0001"), they are NOT navigated to the relevant screen. The notification response listener only logs the response to the console.

```typescript
responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
  console.log('Notification Response:', response)
  // ⚠️ Missing: navigation to the relevant screen
})
```

The notification payload DOES contain the necessary data:
```typescript
data: { screen: 'JobDetail', jobId: 'uuid-here' }
```

**Impact:** Technicians and receptionists tapping notifications land on whichever screen they were on last.

**Fix:**
```typescript
responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data
  if (data?.screen === 'JobDetail' && data?.jobId) {
    navigationRef.current?.navigate('UpdateWork', { jobId: data.jobId })
  }
})
```

---

### BUG-002: `completed_at` Set by Client Device Clock

**Severity:** Medium  
**App:** Mobile  
**Location:** `RepairShopApp/src/screens/technician/UpdateWorkScreen.tsx`

**Description:**
When a technician marks a job as Completed, the `completed_at` timestamp is set by the client device's local clock:

```typescript
if (selectedStatus === 'Completed' && job.status !== 'Completed') {
  updates.completed_at = new Date().toISOString()
}
```

**Problems:**
1. Device clock drift means `completed_at` may not accurately reflect actual completion time
2. A user with a manipulated device clock could set arbitrary completion times
3. The DB-side approach would be more reliable

**Fix Option A (Client-side, keep current approach):**
```typescript
updates.completed_at = new Date().toISOString()
// Acceptable for internal business tools where staff are trusted
```

**Fix Option B (Database-level):**
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

---

### BUG-003: AddStaffModal — Potential Service Role Key Exposure

**Severity:** Critical  
**App:** Admin Panel  
**Location:** `admin-panel/src/components/staff/AddStaffModal.tsx`

**Description:**
Creating Supabase Auth users requires the service role key (admin privilege). The `AddStaffModal` runs in the browser. If it's calling `supabase.auth.admin.createUser()`, it requires the service role key in the browser — a major security violation.

**Likely Scenarios:**
1. It creates the auth user with anon key + a permissive RLS policy (security risk)
2. It calls a Supabase Edge Function that uses the service role (correct approach)
3. It relies on a PostgreSQL trigger to create the `users` table row after auth signup

**Fix:** Move user creation to a Supabase Edge Function:
```typescript
// In AddStaffModal.tsx
await supabase.functions.invoke('admin-create-user', {
  body: { name, email, password, role }
})
```

```typescript
// In supabase/functions/admin-create-user/index.ts
const { data, error } = await supabaseAdmin.auth.admin.createUser({
  email, password,
  email_confirm: true,
  user_metadata: { name, role }
})
```

---

### BUG-004: Cross-Application File Import (Structural Risk)

**Severity:** High (Architectural)  
**App:** Mobile  
**Location:** `RepairShopApp/src/screens/receptionist/BillingScreen.tsx`

**Description:**
The mobile app imports a TypeScript module directly from the admin panel's source directory:

```typescript
import { generateDocumentHtml } from '../../../../admin-panel/src/shared/documents/DocumentRenderer'
```

**Problems:**
1. If the `admin-panel` directory is moved or renamed, the mobile app breaks at build time
2. If the admin panel is deployed to a different machine without the mobile app directory structure, Metro bundler fails
3. Any refactoring of `DocumentRenderer.ts` must maintain API compatibility for both consumers
4. The metro.config.js requires extra configuration to resolve this cross-app import

**Fix:**
Option A — Duplicate the function in the mobile app (simplest):
```typescript
// RepairShopApp/src/utils/DocumentRenderer.ts
// Copy of admin-panel/src/shared/documents/DocumentRenderer.ts
```

Option B — Create a shared npm workspace:
```
Project/
  packages/
    shared/
      src/
        DocumentRenderer.ts
  admin-panel/ → imports from 'shared'
  RepairShopApp/ → imports from 'shared'
```

---

## Medium Issues (Should Fix Before Scale)

---

### BUG-005: No Confirmation Before Technician Self-Reassignment

**Severity:** Medium  
**App:** Mobile  
**Location:** `ReceptionistJobsStack → JobDetailScreen`

**Description:**
When a receptionist reassigns a technician, the action takes place without a confirmation dialog. The technician assignment change also doesn't send any notification to the newly assigned technician (only `notify-on-job-created` handles initial assignment, not reassignment).

**Impact:**
- Receptionist may accidentally reassign a job
- New technician receives no notification of assignment

**Fix:**
1. Add confirmation dialog before reassignment
2. Add logic to `notify-on-status-change` OR create `notify-on-tech-reassigned` Edge Function

---

### BUG-006: Salary Calculation Doesn't Persist Until Explicitly Saved

**Severity:** Medium  
**App:** Admin Panel  
**Location:** `admin-panel/src/components/salary/SalaryCalculatorForm.tsx`

**Description:**
After calculating salary and reviewing the breakdown, the salary record may or may not be saved to the `salary` table automatically. It's unclear whether:
1. The calculate button saves the result
2. Or there's a separate "Save" action required

If salary calculations are lost on page refresh, an admin would need to recalculate monthly salary every time.

**Fix:** Ensure `UPSERT INTO salary` is called immediately after calculation, with clear UX feedback.

---

### BUG-007: Low Stock Threshold Default Mismatch

**Severity:** Low-Medium  
**App:** Admin Panel  
**Location:** `admin-panel/src/app/(admin)/page.tsx`

**Description:**
The overview page uses a hardcoded fallback threshold of `5`:
```typescript
const lowItems = allInventory.filter(item => item.quantity <= (item.low_stock_threshold || 5))
```

But the `inventory` table has `low_stock_threshold DEFAULT 5`. If an item has `low_stock_threshold = 0` (intentionally unconstrained), this filter would incorrectly flag it using the fallback value `5` instead of `0`.

**Fix:**
```typescript
// Use null check, not falsy check
const lowItems = allInventory.filter(
  item => item.quantity <= (item.low_stock_threshold ?? 5)
)
```

---

### BUG-008: Attendance History Missing OT/Early Hours Display

**Severity:** Low-Medium  
**App:** Mobile  
**Location:** `RepairShopApp/src/screens/shared/AttendanceScreen.tsx`

**Description:**
The attendance history list shows check-in/check-out times and status, but does NOT display:
- Overtime hours (`ot_hours`)
- Early departure hours (`early_hours`)

These fields are stored in the database and used for salary calculation, but staff cannot see them from the app to verify accuracy.

**Fix:** Add OT/early hours display to the `AttendanceHistoryCard` component.

---

## Low Issues (Nice to Fix)

---

### BUG-009: `job_code_seq` Does Not Reset Per Year

**Severity:** Low  
**App:** Backend (PostgreSQL)

**Description:**
The `job_code_seq` sequence never resets. After 9,999 jobs, codes become 5+ digits:
- `RS-2026-9999` → `RS-2026-10000` (automatic, not broken)

The `LPAD(..., 4, '0')` will simply produce longer codes. Not a bug per se, but may affect any external systems that parse job codes assuming 4-digit sequences.

**If annual reset is desired:**
```sql
-- Alternative: include year-based sequence reset
CREATE SEQUENCE job_code_seq_2026 START 1;  -- create new each year
-- Or: Use a year-aware function that manages sequences per year
```

---

### BUG-010: WhatsApp Message Opens Instead of Auto-Sends

**Severity:** Low (Intentional Design)  
**App:** Mobile  
**Location:** All WhatsApp send functions

**Description:**
WhatsApp messages are opened as pre-filled drafts in the WhatsApp app (via deep link). The user must manually tap "Send" in WhatsApp.

```typescript
Linking.openURL(`whatsapp://send?phone=...&text=...`)
```

This is intentional (safety — no accidental auto-sends) and documented in `GEMINI.md`. However, some users may expect WhatsApp messages to send automatically.

**No fix needed** — by design. Document in user guide.

---

### BUG-011: Invoice Email "From" Address Hardcoded

**Severity:** Low  
**App:** Backend  
**Location:** `supabase/functions/send-invoice-email/index.ts`

**Description:**
The email sender address is hardcoded in the Edge Function:
```typescript
from: 'RepairShop <billing@yourdomain.com>'
```

This requires the business to own and verify `yourdomain.com` with Resend. If this domain isn't configured, all invoice emails will fail.

**Fix:** Make the `from` address an environment variable:
```typescript
const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') || 'billing@yourdomain.com'
```

---

### BUG-012: Reports Page — No Date Range Filter for Revenue

**Severity:** Low  
**App:** Admin Panel  
**Location:** `admin-panel/src/app/(admin)/reports/page.tsx`

**Description:**
The Revenue tab shows "all time" revenue totals without any date filter. For a business in operation for multiple years, this becomes hard to interpret without monthly/yearly breakdowns.

**Fix:** Add a date range filter (from/to month pickers) to the Revenue tab.

---

### BUG-013: Admin Mobile — Limited Functionality

**Severity:** Low (Feature Gap)  
**App:** Mobile  
**Location:** `RepairShopApp/src/screens/admin/`

**Description:**
The admin mobile screens are significantly less capable than the web admin panel:
- `InventoryScreen` — appears to be read-only (no add/edit/delete on mobile)
- `ReportsScreen` — basic view with no charts
- `StaffScreen` — approve/block works, but no attendance modal
- `AdminJobsScreen` — possibly just redirects to the jobs tab

**Impact:** Admin users who primarily use the mobile app lose significant management capability.

---

### BUG-014: Customers Tab — Not Implemented

**Severity:** Low (Feature Gap)  
**App:** Mobile  
**Location:** `ComingSoonScreen.tsx`

**Description:**
The mobile app has a "Customers" tab planned but not implemented — it renders `ComingSoonScreen`. A customer history/search feature would be useful for receptionists to quickly look up past jobs.

---

### BUG-015: Realtime Subscription Recreated on Every Filter Change

**Severity:** Low (Performance)  
**App:** Admin Panel  
**Location:** `admin-panel/src/app/(admin)/jobs/page.tsx`

**Description:**
The Supabase Realtime channel is created and destroyed every time a filter changes, because the channel setup is inside the same `useEffect` as the data fetch:

```typescript
useEffect(() => {
  fetchJobs()  // re-runs when filter changes
  const channel = supabase.channel('admin-joblist-changes').subscribe()
  return () => supabase.removeChannel(channel)
}, [statusFilter, techFilter, priorityFilter, currentPage, ...])
```

This means constant subscription churn whenever the user is actively filtering.

**Fix:** Separate the realtime subscription into its own `useEffect` with an empty dependency array (or a stable dependency), and have it trigger a `fetchJobs()` call without being recreated.

---

## Feature Gaps Summary

| Feature | Status | Priority |
|---|---|---|
| Push notification deep links | 🔴 Missing | High |
| Staff creation via Edge Function | 🟡 Uncertain | Critical |
| Technician reassignment notification | 🔴 Missing | Medium |
| OT/early hours in attendance view | 🔴 Missing | Medium |
| Mobile admin full functionality | 🟡 Partial | Low |
| Customer search/history | 🔴 Not implemented | Low |
| Date-range filter for Revenue reports | 🔴 Missing | Low |
| Automated tests | 🔴 Missing | Critical |
| Error tracking (Sentry) | 🔴 Missing | High |
| Push notification analytics | 🔴 Missing | Low |
| CSV export for attendance | 🔴 Missing | Low |
| Bulk job status updates | 🔴 Missing | Low |
| Job archiving | 🔴 Missing | Low |
| Customer portal | 🔴 Out of scope | Future |
