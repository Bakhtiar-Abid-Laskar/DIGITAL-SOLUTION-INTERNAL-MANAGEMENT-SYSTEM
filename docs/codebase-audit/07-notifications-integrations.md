# Module 07: Notifications & External Cloud Integrations

**Module:** Push Alerts (Expo), Customer WhatsApp (Meta Cloud API), Transactional Emails (Resend), Cloud Storage (Google Drive), and Database Webhook Automation  
**Surfaces Covered:** Web Admin Panel (`admin-panel`), Mobile App (`RepairShopApp`), Shared Tier (`packages/shared`), Database & Edge Functions (`supabase`)  
**Status:** Audit Complete — Read-and-Document Only

---

## 1. Module Overview & Lifecycle Map

The **Notifications & External Integrations** module handles asynchronous communication between workshop staff, customers, and external cloud infrastructure. It coordinates internal staff alerts via Expo Push Notifications, automated customer updates via Meta WhatsApp Cloud API, customer invoice deliveries via Resend email API, and archival of selfies and HTML invoices into Google Drive using service account authentication.

```text
[Database Change Event] (INSERT / UPDATE on jobs, attendance, inventory, material_allotments, payments)
        │
        ▼
[Supabase Database Webhook Pipeline] (x-webhook-secret / Bearer Service Role)
        │
        ├── [notify-on-job-created]      ──► Push assigned technician + WhatsApp customer confirmation
        ├── [notify-on-status-change]     ──► Push receptionist/admin + WhatsApp customer status update
        ├── [notify-on-late-checkin]      ──► Push admins if check-in > 11:00 AM IST
        ├── [notify-on-inventory-change]  ──► Push admins if quantity <= low_stock_threshold
        ├── [notify-on-material-event]    ──► Push technician on part allotment / return reminder
        ├── [notify-on-finance-event]     ──► Push staff when advance salary / bonus is disbursed
        └── [notify-on-leave-event]       ──► Push staff on leave approval / rejection
        │
        ▼
[Delivery & Dispatch Engines]
        │
        ├── Expo Push Service ──────────► Dispatches to iOS/Android device APNs/FCM
        │                                 └── Auto-prunes expired/unregistered tokens
        ├── Meta WhatsApp Cloud API ────► Dispatches E.164-formatted messages with PDF invoices
        ├── Resend API ─────────────────► Emails HTML/PDF invoices (Enforces 60s rate limit)
        └── Google Drive Service Account► Authenticates via OAuth2 private key JWT
                                          ├── STAFF_ATTENDCE_IMG/YYYY/MM/
                                          ├── ONSITE_VISITS/YYYY/MM/
                                          └── Invoices/YYYY/MM/
        │
        ▼
[Immutable Notification Audit Logs]
        │
        ├── [public.notifications]        ──► In-app audit log for push & email
        ├── [public.whatsapp_messages]    ──► Sent WhatsApp message log
        └── [public.whatsapp_logs]        ──► Raw Meta webhook & API response log
```

---

## 2. Web Admin Panel (`admin-panel`)

### `admin-panel/src/components/layout/Header.tsx`
- **Purpose:** Navigation bar header component housing real-time notification popover, displaying system-wide operational alerts, unread counts, and quick links to relevant job or inventory screens.
- **Key Exports:**
  - `export function Header()`: Main top bar component.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/components/common/*`.
  - Database: Queries `public.notifications` filtered by `recipient_user_id = auth.uid()`.
- **Side Effects:**
  - Realtime subscription: Subscribes to `postgres_changes` on `public.notifications` for the logged-in administrator.
  - Updates `notifications.is_read = true` upon popover dismissal.

---

### `admin-panel/src/app/(admin)/settings/page.tsx`
- **Purpose:** System settings and integration console for configuring workshop metadata, WhatsApp message templates, Google Review URL, and geofence boundaries.
- **Key Exports:**
  - `default function SettingsPage()`: Settings management page.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/components/settings/GeofenceMap`.
  - Database: Queries and mutates `public.geofence_settings` and `public.company_settings`.

---

## 3. Mobile Application (`RepairShopApp`)

### `RepairShopApp/src/hooks/usePushNotifications.ts`
- **Purpose:** Mobile lifecycle hook managing device push token registration, OS permission requests, and deep-link routing when users tap notifications.
- **Key Exports:**
  - `export function usePushNotifications()`: Custom React hook.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/navigation/navigationRef`.
  - External: `expo-notifications`, `expo-device`, `react-native`.
  - Database: Updates `public.users.expo_push_token` for `auth.uid()`.
- **Side Effects:**
  - Prompts native iOS/Android push notification permission dialog.
  - Generates Expo Push Token (`ExpoPushToken[...]`).
  - Configures notification handler behavior (display banner, play sound, update badge).
  - Handles response listeners to navigate directly to target screens (`Attendance`, `JobDetail`, `AllottedMaterialsScreen`).
- **Callers:**
  - Invoked at the top level of `RootNavigator.tsx`.

---

### `RepairShopApp/src/screens/shared/NotificationsScreen.tsx`
- **Purpose:** Dedicated mobile notification inbox displaying historical notifications with filter tabs (`All`, `Unread`, `Important`), channel-specific icons (Push, WhatsApp, Email), relative time format, and pull-to-refresh.
- **Key Exports:**
  - `default function NotificationsScreen()`: In-app inbox screen.
- **Dependencies:**
  - Internal: `@/lib/supabase`, `@/context/AuthContext`, `@/tokens`, `@/components/common/*` (`AppHeader`, `EmptyState`, `SkeletonCard`).
  - External: `lucide-react-native`.
  - Database: Queries and updates `public.notifications`.
- **Callers:**
  - Header bell icon on Receptionist, Technician, and Admin dashboards.

---

## 4. Shared Utilities & Domain Tier (`packages/shared`)

### `packages/shared/src/phone.ts`
- **Purpose:** Validates and formats phone numbers for Meta WhatsApp Cloud API compatibility.
- **Key Exports:**
  - `export function formatPhoneForWhatsApp(input: string): string`: Produces clean digits without symbols (e.g., `919876543210`).
  - `export function createWhatsAppUrl(phone: string, text: string): string`: Generates direct universal wa.me deep links.

---

## 5. Database Schema, RPCs & Edge Functions (`supabase`)

### Database Tables (`public`)

| Table Name | Key Columns & Types | Referenced By | Permitted Operations |
|---|---|---|---|
| `public.notifications` | `id` (uuid, PK), `recipient_user_id` (uuid, FK users), `title` (text), `message` (text), `job_id` (uuid, FK jobs, nullable), `channel` (text: 'push'/'whatsapp'/'email'), `status` (text: 'pending'/'sent'/'failed'), `is_read` (boolean), `sent_at` (timestamptz). | `NotificationsScreen.tsx`, `Header.tsx`, `_shared/notifications.ts`. | SELECT, INSERT, UPDATE |
| `public.whatsapp_messages` | `id` (uuid, PK), `recipient_phone` (text), `customer_name` (text), `event_type` (text), `message_body` (text), `document_url` (text), `job_id` (uuid, FK), `sale_id` (uuid, FK), `whatsapp_message_id` (text), `status` (text: 'sent'/'delivered'/'read'/'failed'), `sent_at` (timestamptz). | `whatsappClient.ts`, `whatsapp-webhook`. | SELECT, INSERT, UPDATE |
| `public.whatsapp_logs` | `id` (uuid, PK), `event` (text), `payload` (jsonb), `response` (jsonb), `created_at` (timestamptz). | `whatsappClient.ts`. | SELECT, INSERT |

---

### Supabase Edge Functions

1. `supabase/functions/notify-on-job-created/index.ts`
   - **Trigger:** Webhook on `INSERT` to table `jobs`.
   - **Purpose:** Dispatches push notification to primary technician and any secondary technicians assigned via `job_technicians`. Sends WhatsApp confirmation message to the customer.

2. `supabase/functions/notify-on-status-change/index.ts`
   - **Trigger:** Webhook on `UPDATE` of `jobs.status`.
   - **Purpose:** Sends push notifications to receptionists and admins when a job status transitions. Sends WhatsApp progress update to the customer. When status reaches `Completed`, dispatches pickup reminder.

3. `supabase/functions/notify-on-late-checkin/index.ts`
   - **Trigger:** Webhook on `INSERT` to `attendance`.
   - **Purpose:** Notifies administrators via push when staff check in more than 30 minutes after target start time (10:30 AM IST).

4. `supabase/functions/notify-on-inventory-change/index.ts`
   - **Trigger:** Webhook on `UPDATE` of `inventory`.
   - **Purpose:** Alerts administrators when stock drops to or below `low_stock_threshold`.

5. `supabase/functions/notify-on-material-event/index.ts`
   - **Trigger:** Webhook on `INSERT` to `material_allotments` or direct call (`action = 'remind_return'`).
   - **Purpose:** Pushes notifications to technicians when materials are allotted or unreturned.

6. `supabase/functions/send-invoice-email/index.ts`
   - **Trigger:** HTTP POST request with `job_id` or `sale_id`.
   - **Purpose:** Dispatches HTML/PDF invoices via Resend email API with a 60-second rate-limiting guard.

7. `supabase/functions/test-drive-auth/index.ts`
   - **Trigger:** Administrative health-check request.
   - **Purpose:** Validates Google Service Account OAuth2 token exchange and verifies access to Google Drive backup folders.

---

## 6. Module Findings & Technical Debt Log (Notifications & Integrations)

| ID | File / Location | Severity | Category | Description |
|---|---|---|---|---|
| **F-NOT-01** | `supabase/functions/_shared/notifications.ts:44` | **MEDIUM** | Branding Default | Push notification fallback title is hardcoded as `title: title \|\| 'Digital Solution'`. It should fall back to project name `RepairShop` to conform with `GEMINI.md`. |
| **F-NOT-02** | `supabase/functions/notify-on-late-checkin/index.ts:40-42` | **MEDIUM** | Missing UPDATE Trigger | Late check-in webhook only triggers on `INSERT`. If morning cron initializes attendance records as `Absent` and staff update them to `Present` on arrival, late check-in push notifications will never fire. |
| **F-NOT-03** | `RepairShopApp/src/hooks/usePushNotifications.ts:35` | **LOW** | Simulator Warning Noise | In local simulator environments without valid push certificates, the hook outputs console warnings on every app launch. Should gracefully silence warnings when `Device.isDevice === false`. |
| **F-NOT-04** | `supabase/functions/_shared/notifications.ts:95-97` | **LOW** | Error Retry Mechanism | If Expo Push API returns a transient HTTP 500 or network timeout, the notification is marked `failed` in `public.notifications` without an automated exponential backoff retry queue. |
| **F-NOT-05** | `supabase/functions/_shared/whatsappClient.ts:83-85` | **LOW** | Landline Number Handling | WhatsApp client strictly rejects non-mobile numbers. When customer provides a landline, the failed send attempt is logged but cannot fallback to SMS. |
