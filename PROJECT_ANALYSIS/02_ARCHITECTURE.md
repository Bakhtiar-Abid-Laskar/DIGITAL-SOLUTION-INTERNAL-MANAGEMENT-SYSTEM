# RepairShop — System Architecture

## 1. Overall Architecture Pattern

RepairShop follows a **Three-Tier Architecture** with a **Backend-as-a-Service (BaaS)** pattern:

```
Tier 1 (Presentation): Mobile App (Expo RN) + Admin Panel (Next.js)
Tier 2 (Logic):        Supabase Edge Functions (Deno/TypeScript)
Tier 3 (Data):         Supabase PostgreSQL + Supabase Storage
```

Both client apps are **stateful client-rendered applications** that communicate directly with Supabase using the `@supabase/supabase-js` SDK. There is no custom REST API server.

---

## 2. Application Rendering Flow

### Mobile App (Expo React Native)
```
index.ts
  └─ App.tsx
       └─ AuthProvider (wraps entire app)
            └─ ToastProvider
                 └─ SafeAreaProvider / GestureHandler / ReanimatedRoot
                      └─ RootNavigator
                           ├─ LoadingScreen          (isLoading = true)
                           ├─ LoginScreen            (!session)
                           ├─ InactiveUserScreen     (session && !isActive)
                           ├─ AdminTabs              (role === 'admin')
                           ├─ ReceptionistTabs       (role === 'receptionist')
                           └─ TechnicianTabs         (role === 'technician')
```

### Admin Panel (Next.js App Router)
```
layout.tsx (root)
  └─ <html> <body>
       └─ ToastProvider
            └─ AuthProvider
                 └─ (admin)/layout.tsx
                      └─ AdminLayout
                           ├─ Sidebar
                           ├─ Topbar
                           └─ <main>{children}</main>
                               ├─ page.tsx          → /  (Overview Dashboard)
                               ├─ jobs/page.tsx     → /jobs
                               ├─ jobs/[id]/page.tsx → /jobs/:id
                               ├─ jobs/new/page.tsx  → /jobs/new
                               ├─ staff/page.tsx    → /staff
                               ├─ salary/page.tsx   → /salary
                               ├─ inventory/page.tsx → /inventory
                               ├─ reports/page.tsx  → /reports
                               ├─ expenditure/page.tsx → /expenditure
                               └─ settings/page.tsx → /settings
```

---

## 3. Authentication Flow

```
User Opens App/Website
        │
        ▼
AuthContext mounts → supabase.auth.getSession()
        │
        ├─ No session → Redirect to Login
        │
        └─ Session found
               │
               ▼
         fetchUserRow(user.id)
         → SELECT id, name, email, role, is_active FROM users
               │
               ├─ User not found → role = null, isActive = false → Login
               │
               ├─ is_active = false → InactiveUserScreen
               │
               └─ is_active = true
                      │
                      ├─ role = 'admin'        → AdminTabs / Admin Panel
                      ├─ role = 'receptionist' → ReceptionistTabs
                      └─ role = 'technician'   → TechnicianTabs
```

### Session Persistence
- **Mobile:** Expo SecureStore (native device keychain) — session persists across app restarts
- **Admin Panel:** Supabase default localStorage — session persists across browser sessions
- Both apps subscribe to `supabase.auth.onAuthStateChange()` to react to login/logout in real time

### Role Re-validation
Both apps fetch the `users` table (not the JWT claims) to get the current role. This means:
- A blocked user (`is_active = false`) is immediately locked out on next auth state change
- Role cannot be spoofed via token manipulation (roles are in DB, not JWT)

---

## 4. Authorization Flow

```
Database Level:
  PostgreSQL RLS Policies
    ├─ users: own row access, admin sees all
    ├─ jobs: technician sees only assigned, receptionist/admin sees all
    ├─ job_materials: follows job access
    ├─ attendance: own records, admin sees all
    ├─ billing: receptionist + admin
    ├─ salary: admin only
    ├─ staff_rates: admin only
    └─ payments: admin only

UI Level (Navigation Guards):
  Mobile: RootNavigator role-based screen selection
  Admin: AuthContext redirects non-authenticated to /login

Edge Function Level:
  Service role key → bypasses RLS for notification sending/salary calc
```

---

## 5. State Management Architecture

### Mobile App
| State Type | Mechanism | Location |
|---|---|---|
| Auth state (user, session, role) | React Context | `AuthContext.tsx` |
| Toast notifications | React Context | `ToastContext.tsx` |
| Screen data (jobs, materials, etc.) | Local `useState` per screen | Each screen file |
| Real-time updates | Supabase channel subscriptions | Within `useFocusEffect` per screen |
| Push notification state | Custom hook | `usePushNotifications.ts` |

### Admin Panel
| State Type | Mechanism | Location |
|---|---|---|
| Auth state | React Context | `AuthContext.tsx` |
| Toast notifications | React Context | `ToastProvider.tsx` |
| Page data (jobs, staff, etc.) | Local `useState` per page | Each page file |
| Real-time updates | Supabase channel subscriptions | Within `useEffect` per page |

**No Redux, no Zustand, no TanStack Query.** All data management is done with local state + direct Supabase calls.

---

## 6. Networking Architecture

### Client-to-Supabase
- All queries use the `@supabase/supabase-js` SDK
- Authentication via JWT Bearer token (anon key + session token)
- Row Level Security enforced at database level
- No custom API server exists

### Realtime Architecture
```
Supabase Realtime Channel (WebSocket)
  ├─ Admin Overview: subscribes to 'jobs' + 'users' tables (all changes)
  ├─ Admin Jobs List: subscribes to 'jobs' table (all changes)
  ├─ Technician UpdateWork: subscribes to 'jobs' + 'job_materials' filtered by jobId
  └─ Admin Reports: subscribes to 'jobs' + 'billing' tables
```

> **Security Note:** The admin panel subscribes to entire tables (no filter). The technician mobile screen correctly filters realtime by `id=eq.${jobId}`. This is acceptable since RLS policies control what data is returned.

### Edge Function Calls (Client → Supabase Edge → External Service)
```
Mobile BillingScreen.handleEmail()
  → POST /functions/v1/send-invoice-email
      (Bearer: session token)
      → Edge Function reads RESEND_API_KEY
      → POST api.resend.com/emails
      → Logs to notifications table
```

### External API Calls (Edge Functions only)
```
Expo Push Notification Service: https://exp.host/--/api/v2/push/send
Twilio WhatsApp API: https://api.twilio.com/2010-04-01/Accounts/{SID}/Messages.json
Resend Email API: https://api.resend.com/emails
```

---

## 7. Database Architecture

### Schema Overview
```
auth.users (Supabase built-in)
    │
    └─ public.users (1:1, id = auth.uid)
           │
           ├─ jobs (receptionist_id FK → users, technician_id FK → users)
           │     │
           │     ├─ job_materials (job_id FK → jobs)
           │     ├─ billing (job_id FK → jobs, unique)
           │     ├─ onsite_visits (job_id + technician_id FK)
           │     └─ notifications (job_id FK → jobs)
           │
           ├─ attendance (user_id FK → users, unique on user_id+date)
           ├─ staff_rates (user_id FK → users, unique on user_id, 1:1)
           ├─ salary (user_id FK → users, unique on user_id+month)
           └─ payments (user_id FK → users nullable, created_by FK → users)

inventory (standalone, no FK to users)
```

### Job Code Generation
```sql
-- PostgreSQL sequence
CREATE SEQUENCE IF NOT EXISTS job_code_seq START 1;

-- RPC function called by client
CREATE OR REPLACE FUNCTION generate_job_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'RS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('job_code_seq')::TEXT, 4, '0');
  RETURN code;
END;
$$ LANGUAGE plpgsql;
```

---

## 8. Storage Architecture

### Supabase Storage Buckets
| Bucket | Access | Contents |
|---|---|---|
| `attendance-selfies` | Private | Check-in/check-out selfie photos |
| `onsite-visits` | Private | Onsite arrival/departure photos + device before/after photos |

### File Naming Convention
```
attendance-selfies/{userId}/{date}/{checkin|checkout}.jpg
onsite-visits/{jobId}/{userId}/{timestamp}.jpg
```

### Image Display
Private buckets require signed URLs:
```typescript
const { data } = await supabase.storage
  .from('attendance-selfies')
  .createSignedUrl(path, 60 * 60); // 1 hour expiry
```

### Image Compression
The mobile app uses `expo-image-manipulator` to compress selfies before upload (`compressImage.ts`), reducing storage costs and upload times.

---

## 9. Notification Architecture

```
Job Created (INSERT on jobs)
    │
    ├─ Webhook → notify-on-job-created Edge Function
    │     ├─ If job.technician_id → Push to technician
    │     │     └─ POST exp.host/api/v2/push/send
    │     ├─ If Twilio configured → WhatsApp to customer
    │     │     └─ "We received your device, Job code: RS-XXXX"
    │     └─ Logs to notifications table
    │
Job Updated (UPDATE on jobs)
    │
    └─ Webhook → notify-on-status-change Edge Function
          ├─ If status changed → Push to all receptionists + admins
          ├─ If status = 'Completed' + Twilio → WhatsApp to customer
          │     └─ "Your device is ready for pickup"
          └─ Logs to notifications table

Invoice Email (triggered manually by receptionist)
    │
    └─ POST /functions/v1/send-invoice-email
          └─ Resend API → customer email
```

### Push Token Flow
```
On app start (authenticated user):
  usePushNotifications(userId) hook fires
    → registerForPushNotificationsAsync()
    → Gets Expo push token
    → Compares with DB users.expo_push_token
    → Updates DB if different (with 3 retry logic)
```

---

## 10. Billing Calculation Architecture

The billing formula is implemented consistently in both apps (shared via `DocumentRenderer`):

```
parts_total  = SUM(job_materials.total_cost)
labour_charge = user input (₹)
tax_percent   = user input (%)
discount      = user input (₹)

subtotal      = parts_total + labour_charge
tax_amount    = subtotal × (tax_percent / 100)
grand_total   = (subtotal × (1 + tax_percent/100)) - discount

// Rounded to 2 decimal places via Math.round(value * 100) / 100
```

### Verification
```
parts = ₹500, labour = ₹300, tax = 18%, discount = ₹50
subtotal = 800
taxed    = 800 × 1.18 = 944
grand    = 944 - 50 = 894 ✓
```

---

## 11. Salary Calculation Architecture

```
present_pay      = present_days × base_daily_rate
halfday_pay      = halfday_count × (base_daily_rate / 2)
leave_pay        = 0
ot_pay           = ot_hours × ot_rate_per_hour
early_deduction  = early_hours × early_deduction_per_hour
gross_salary     = present_pay + halfday_pay + ot_pay - early_deduction
advance_deducted = SUM(payments.amount WHERE type='advance_salary' AND user_id=X AND month=Y)
net_salary       = gross_salary - advance_deducted
```

This formula is applied in:
- `admin-panel/src/utils/salarySlipHtml.ts` (display comments)
- `admin-panel/src/components/salary/SalaryBreakdownCard.tsx` (display)
- `admin-panel/src/components/salary/SalaryCalculatorForm.tsx` (calculation)

---

## 12. Print Architecture

### Mobile (expo-print)
```
BillingScreen.handlePrint()
  → generateDocumentHtml('invoice', job, materials, billing)
  → Returns HTML string
  → expo-print.printAsync({ html })
  → System print dialog (iOS: AirPrint, Android: Google Cloud Print)

JobAssignmentScreen.printReceipt()
  → generateDocumentHtml('receipt', job, [])
  → Returns HTML string
  → expo-print.printAsync({ html })
```

### Admin Panel (browser window.print)
```
Admin job detail page "Print Invoice" button
  → Opens /jobs/:id/print route
  → Full-screen print-optimized page
  → window.print() triggered
```

---

## 13. Performance Architecture

### Mobile
- `useFocusEffect` + `useCallback` — re-fetches data only when screen is focused
- `useMemo` — used in `UpdateWorkScreen` for materials cost total
- `FlatList` (not ScrollView) — virtualized rendering for attendance history
- `Animated.View` with `FadeInUp` — hardware-accelerated entrance animations
- `react-native-reanimated` with `withSpring` — smooth tab indicator animation
- Image compression via `expo-image-manipulator` before upload

### Admin Panel
- `useDebounceValue` (inline implementation) — 300ms debounce on search queries
- Supabase pagination — 20 items per page with range queries
- Realtime channels — avoids polling; React state updates on DB change
- Next.js App Router — automatic code splitting per route

---

## 14. Security Architecture

### Layer 1: Authentication
- Supabase Auth issues JWT tokens
- Tokens stored securely (SecureStore on mobile, Supabase session on web)
- `is_active` flag blocks inactive users even with valid JWT

### Layer 2: Row Level Security (RLS)
- Applied at PostgreSQL level — cannot be bypassed by client
- All tables have RLS enabled
- Role-based policies control SELECT/INSERT/UPDATE/DELETE per table

### Layer 3: Secrets Management
- Twilio, Resend, and Service Role keys stored only in Supabase Vault
- Never in `.env` files committed to git
- Never in mobile or web client code
- Edge Functions access secrets via `Deno.env.get()`

### Layer 4: UI Guards
- Navigation-level role checks in `RootNavigator`
- Page-level role check in `SalaryPage` (`role !== 'admin'` → Access Denied)
- Technician queries always filter by `technician_id = user.id`

---

## 15. Offline Support

**Neither app has explicit offline support.** All screens require active internet connectivity. Error states are shown when Supabase queries fail. There is no:
- Service Worker caching
- SQLite local database
- Optimistic UI updates with sync-back
- Queue for pending operations

This is an **online-only system**. Poor connectivity will cause loading failures with `ErrorState` components shown to the user.
