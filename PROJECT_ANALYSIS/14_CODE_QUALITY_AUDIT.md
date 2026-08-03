# RepairShop — Code Quality Audit

## 1. Overall Code Quality Assessment

RepairShop demonstrates **above-average code quality** for a business application of this scope. The codebase is well-organized, consistently structured, and follows React/React Native best practices in most areas. TypeScript is used throughout (no raw JavaScript in source files).

**Overall Score: 7.5/10**

---

## 2. TypeScript Usage

### ✅ Strengths

**Type Definitions:**
- All domain objects have explicit interfaces in `types/` folders
- Role types are narrow unions: `'admin' | 'receptionist' | 'technician'`
- Status types are narrow unions: `'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed'`
- Both apps share the same conceptual type shapes (even if defined separately)

**Type Safety:**
```typescript
// Good — narrow types prevent invalid values
type JobStatus = 'Received' | 'In Progress' | 'Waiting for Materials' | 'Completed'
type UserRole = 'admin' | 'receptionist' | 'technician'
type PaymentType = 'advance_salary' | 'materials_purchase' | 'daily_expenditure' | 'office_development'
```

### ⚠️ Issues

**Excessive `any` Usage:**
```typescript
// Found in multiple files:
const navigation = useNavigation<any>()
const route = useRoute<any>()
const [createdJob, setCreatedJob] = useState<any>(null)
const [job, setJob] = useState<any>(null)  // admin job detail
const [billing, setBilling] = useState<any>(null)
const [confirmModal, setConfirmModal] = useState<any>(null)
```

These should use proper generic types. Examples of better alternatives:
```typescript
const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>()
const [createdJob, setCreatedJob] = useState<Job | null>(null)
const [billing, setBilling] = useState<Billing | null>(null)
```

**Count of `any` usages:** Approximately 15-20 instances across the codebase.

**Partial<T> Overuse:**
```typescript
const [editForm, setEditForm] = useState<Partial<Job>>({})
```
This can mask missing required fields. Better to use explicit optional fields.

---

## 3. Error Handling Patterns

### ✅ Strengths

**Consistent Error Pattern:**
```typescript
try {
  setLoading(true);
  const { data, error } = await supabase.from(...).select(...)
  if (error) throw error;
  setData(data);
} catch (err: any) {
  showToast({ title: 'Error', message: err.message, type: 'error' });
  // or: setError(err.message)
} finally {
  setLoading(false);
}
```

This pattern is consistently applied across all screens.

**User-Facing Error States:**
- `ErrorState` component shown in place of content when fetch fails
- `onRetry` prop available for user-triggered retry
- Toast messages for action errors (non-blocking)

**Loading States:**
- Every async operation has a loading state
- Buttons show `ActivityIndicator` (mobile) or `isLoading` spinner during submission

### ⚠️ Issues

**Silent Catch in usePushNotifications:**
```typescript
try {
  // ... setup notifications
} catch (e) {
  console.log('Failed to add notification listeners', e);
  // ⚠️ Silent failure — user not informed
}
```

**No Retry Logic for Uploads:**
```typescript
supabase.storage.from('attendance-selfies').upload(path, blob)
// If this fails (network blip), the entire check-in fails
// No retry mechanism
```

**`err.message` on Unknown Error Type:**
```typescript
catch (err: any) {
  showToast({ message: err.message })
```
Using `any` for caught errors is a common TypeScript pattern but loses type safety. Better:
```typescript
catch (err) {
  const message = err instanceof Error ? err.message : 'Unknown error occurred'
  showToast({ message })
}
```

---

## 4. Component Design

### ✅ Strengths

**Component Decomposition:**
- Reusable primitives (`Button`, `Card`, `Input`, etc.) separate from business components
- Business components (`MaterialList`, `TechnicianPicker`) in dedicated folders
- Screen components contain orchestration logic, delegate display to child components

**Single Responsibility:**
- Most components have clear, single purposes
- `SelfieCapture` handles the camera, not the GPS — separation maintained
- `SectionLabel` is purely presentational

**Shared Layout Components:**
- `JobDetailShell` (mobile) — reusable scrollable layout for job screens
- `AdminLayout` (admin) — shell for all admin pages
- `RoleDashboard` (mobile) — shared dashboard template

### ⚠️ Issues

**Large Screen Files:**
- `AttendanceScreen.tsx` — 500+ lines, handles camera, GPS, upload, and display
- `BillingScreen.tsx` — 480+ lines, mixes billing form, actions, and document generation
- `admin/jobs/[id]/page.tsx` — 805 lines, 4 tabs in one file
- These should be broken into smaller focused components

**Inline Utility Functions in Pages:**
```typescript
// admin jobs page — useDebounceValue defined inline instead of as a shared hook
function useDebounceValue<T>(value: T, delay: number): T { ... }
```
This creates code duplication risk if the same hook is needed elsewhere.

**Styles at Bottom of File (Mobile):**
All mobile screens define `StyleSheet.create` at the bottom of the same file. This is the React Native convention but makes very long files (500+ lines) harder to navigate.

---

## 5. Business Logic Separation

### ✅ Strengths

**Server-Side Job Code Generation:**
- Job codes ONLY generated via PostgreSQL RPC — never in client code
- This rule is enforced by convention and documented in `GEMINI.md`

**Billing Formula Consistency:**
- Formula documented in comments:
  ```typescript
  // Formula: (parts_total + labour_charge) * (1 + tax_percent / 100) - discount
  ```
- `calculateGrandTotal()` utility function used consistently
- Same formula in `salarySlipHtml.ts` comments for reference

**Notification Logic in Edge Functions:**
- All push/WhatsApp/email sending in Edge Functions, not client code
- Client only calls functions; it doesn't directly call Twilio/Resend

### ⚠️ Issues

**Duplicated Logic Between Apps:**
```
admin-panel/src/utils/billing.ts
RepairShopApp/src/utils/billing.ts
```
Same functions, different files. These diverge over time as one gets updated without the other.

```
admin-panel/src/utils/formatCurrency.ts
RepairShopApp/src/utils/formatCurrency.ts
```
Same formatter, two implementations. At least the formula should be a shared module.

**Client-Side `completed_at` Setting:**
```typescript
// UpdateWorkScreen.tsx
if (selectedStatus === 'Completed' && job.status !== 'Completed') {
  updates.completed_at = new Date().toISOString()
}
```
Setting `completed_at` from the client means:
1. Clock drift on device could cause inaccurate timestamps
2. A malicious client could set arbitrary completion times
*Recommendation: Use a PostgreSQL trigger or Edge Function to set `completed_at` server-side.*

---

## 6. React Patterns

### ✅ Strengths

**useFocusEffect for Data Fetching (Mobile):**
```typescript
useFocusEffect(useCallback(() => {
  fetchData();
  const channel = supabase.channel(...).subscribe();
  return () => supabase.removeChannel(channel);
}, [jobId]));
```
Correct pattern — fetches fresh data on screen focus and cleans up.

**useEffect Dependency Arrays:**
- Generally well-specified throughout the codebase
- Some intentional empty arrays `[]` for one-time effects

**State Organization:**
- Loading/error state always co-located with the data it protects
- Modal state (visible/data) cleanly tracked

### ⚠️ Issues

**Missing useCallback in Some Handlers:**
```typescript
// In several screens:
const fetchData = async () => { ... }
// Should be: const fetchData = useCallback(async () => { ... }, [dependencies])
```
Without `useCallback`, these functions are recreated on every render, potentially causing `useFocusEffect` to re-run unnecessarily.

**Realtime Subscription in useEffect (Admin):**
```typescript
useEffect(() => {
  fetchJobs();
  const channel = supabase.channel(...).subscribe();
  return () => supabase.removeChannel(channel);
}, [statusFilter, techFilter, priorityFilter, currentPage, debouncedSearchQuery, dateFrom, dateTo]);
```
Every filter change unsubscribes and resubscribes the realtime channel. This is correct behavior but could be optimized by separating the channel subscription from the data fetch effect.

**State Updates After Unmount:**
No unmount guard pattern used:
```typescript
// Should have:
let mounted = true;
fetchData().then((data) => {
  if (mounted) setData(data);
});
return () => { mounted = false; };
```
However, React 18's strict mode and Supabase's async patterns make this less critical in practice.

---

## 7. Code Organization

### ✅ Strengths

**Consistent File Structure:**
- `screens/role/ScreenName.tsx` — clear role organization
- `components/domain/ComponentName.tsx` — domain-driven component folders
- `utils/functionName.ts` — pure utility functions
- `types/domain.ts` — co-located type definitions

**Design Token Centralization:**
- Mobile: single `tokens.ts` file — all design values in one place
- Admin: `globals.css` `@theme` block — all CSS variables in one place

**Path Aliases:**
- Mobile: `tsconfigPaths` experimental feature
- Admin: `@/*` and `@shared/*` path aliases
- Both prevent deep relative import chains

### ⚠️ Issues

**Cross-Application Import:**
```typescript
// RepairShopApp/src/screens/receptionist/BillingScreen.tsx
import { generateDocumentHtml } from '../../../../admin-panel/src/shared/documents/DocumentRenderer'
```
This is a significant architectural smell:
- Tight coupling between two separate applications
- Moving or restructuring the admin panel breaks the mobile app
- Metro bundler must be configured with extra `watchFolders` to resolve this
*Recommendation: Move `DocumentRenderer` to a shared package or duplicate the function.*

**Dev Script Files in Project Root:**
```
admin-panel/confirm_admin.js
admin-panel/test_edge.js
admin-panel/test_fetch.js
admin-panel/test_insert.js
admin-panel/replaceAlerts.js (mobile)
admin-panel/test_login.js (mobile)
```
Development utility scripts committed to the repository. These should either be in a `scripts/` folder or gitignored.

---

## 8. Comments and Documentation

### ✅ Strengths

**Business Logic Comments:**
```typescript
// billing.ts
// Formula: (parts_total + labour_charge) * (1 + tax_percent / 100) - discount

// salarySlipHtml.ts
// CONFIRMED FORMULA (Phase 8):
// present_pay = present_days × base_daily_rate
// ...
```
Critical business formulas are documented in code.

**Inline Comments for Non-Obvious Logic:**
```typescript
// usePushNotifications.ts
// Check if this is an Expo Go build — push notifications are not supported
// in Expo Go on SDK 53+
if (isExpoGo) return undefined;
```

### ⚠️ Issues

**Missing JSDoc on Utility Functions:**
```typescript
// billing.ts — no JSDoc
export function calculateGrandTotal(partsTotal, labourCharge, taxPercent, discount) { ... }

// Better:
/**
 * Calculates the invoice grand total.
 * Formula: (parts + labour) × (1 + tax/100) - discount
 * @param partsTotal - Sum of all job_materials.total_cost
 * @param labourCharge - Manual labour charge in INR
 * @param taxPercent - Tax rate as percentage (e.g., 18 for 18%)
 * @param discount - Discount amount in INR
 * @returns Grand total rounded to 2 decimal places
 */
```

**Commented-Out Code:**
```typescript
// UpdateWorkScreen.tsx lines 121-127
// Status logic
if (selectedStatus === 'Completed') {
  // Defer to confirmation
  setStatusSelectorVisible(false); // Make sure it's closed
  // We can use the actual update logic inside a confirmation if we wanted, 
  // but for now let's just do it directly if selectedStatus is Completed.
  // Actually, let's just do it directly, we can add a confirmation later if needed.
}
```
This dead code comment reveals an abandoned refactoring intention. Should be cleaned up.

---

## 9. Testing Coverage

### ⚠️ Critical Gap — No Tests

**No test files found in either application.** This is a significant quality gap for a production system handling:
- Customer data
- Financial calculations (billing, salary)
- Staff attendance records

**What Should Be Tested (Priority Order):**

1. **Billing Formula** (Unit Test)
   ```typescript
   test('calculateGrandTotal', () => {
     expect(calculateGrandTotal(500, 300, 18, 50)).toBe(894)
   })
   ```

2. **Salary Formula** (Unit Test)
   ```typescript
   test('salary calculation', () => {
     // present_pay + halfday + OT - early - advance = net
   })
   ```

3. **Phone Number Normalization** (Unit Test)
   ```typescript
   test('formatIndianPhoneForWhatsApp', () => {
     expect(formatIndianPhoneForWhatsApp('9876543210')).toBe('+919876543210')
     expect(formatIndianPhoneForWhatsApp('09876543210')).toBe('+919876543210')
     expect(formatIndianPhoneForWhatsApp('+919876543210')).toBe('+919876543210')
   })
   ```

4. **Job Creation Flow** (Integration Test)
5. **Auth Guard** (E2E Test)
6. **RLS Policies** (Supabase Test)

---

## 10. Code Duplication

### Identified Duplications

| Code | Location 1 | Location 2 |
|---|---|---|
| `calculateGrandTotal()` | `admin-panel/src/utils/billing.ts` | `RepairShopApp/src/utils/billing.ts` |
| `calculatePartsTotal()` | `admin-panel/src/utils/billing.ts` | `RepairShopApp/src/utils/billing.ts` |
| `formatCurrency()` | `admin-panel/src/utils/formatCurrency.ts` | `RepairShopApp/src/utils/formatCurrency.ts` |
| `StatusBadge` component | `admin-panel/src/components/common/StatusBadge.tsx` | `RepairShopApp/src/components/jobs/StatusBadge.tsx` |
| `PriorityBadge` component | `admin-panel/src/components/common/PriorityBadge.tsx` | `RepairShopApp/src/components/jobs/PriorityBadge.tsx` |
| `useDebounceValue` hook | Inline in `admin-panel/src/app/(admin)/jobs/page.tsx` | — |
| Job type definitions | `admin-panel/src/types/index.ts` | `RepairShopApp/src/types/job.ts` |

### Recommendation
Extract truly shared utilities into a `/packages/shared` directory and use workspace symlinks or path aliasing to reference them from both apps.

---

## 11. Named Magic Values

### Found Magic Numbers/Strings

```typescript
// admin-panel jobs page
const PAGE_SIZE = 20;  ✅ Named constant

// admin-panel overview
.lte('quantity', 5)  ⚠️ Magic number — should be named constant DEFAULT_LOW_STOCK_THRESHOLD

// usePushNotifications.ts
if (attempts > 1) setTimeout(() => syncToken(attempts - 1), 2000)
// ⚠️ 2000ms hardcoded — should be named PUSH_TOKEN_RETRY_DELAY_MS

// BillingScreen
const defaultTax = 18  ✅ Likely extracted as a constant, but verify

// CustomTabBar
height: 64  ⚠️ Should be: const TAB_BAR_HEIGHT = 64
```

---

## 12. Code Quality Score

| Category | Score | Notes |
|---|---|---|
| TypeScript usage | 6/10 | `any` overuse; good type definitions |
| Error handling | 8/10 | Consistent pattern; missing retry |
| Component design | 7/10 | Good decomposition; some large files |
| Business logic | 7/10 | Duplicated utilities; good separation |
| React patterns | 7/10 | Good patterns; missing useCallback |
| Code organization | 7/10 | Clear structure; cross-app import concern |
| Documentation | 6/10 | Business logic documented; missing JSDoc |
| Testing | 1/10 | No tests at all |
| Code duplication | 6/10 | Utility functions duplicated across apps |
| **Overall** | **6.8/10** | **Good foundation; needs tests and cleanup** |
