# AUDIT REPORT — Digital Solution (RepairShop)
**Generated**: 2026-11-01  
**Scope**: Full Stack Project Audit (Android App, Next.js Admin Panel, Supabase Backend, Web/PWA, Edge Functions)

---

## Executive Summary

A comprehensive, read-only audit of the entire codebase was conducted across:
1. **Mobile App (`RepairShopApp`)**: Expo SDK 54 / React Native 0.81.6
2. **Admin Web Panel (`admin-panel`)**: Next.js 16.2.12 (Turbopack) / React 19.1.0
3. **Supabase Backend**: Database migrations, RLS policies, PostgreSQL triggers (`pg_net`), and Edge Functions (`Deno`)
4. **Push Notification Infrastructure**: Android native (FCM v1 / Expo), iOS Web/PWA (Safari standalone), and Desktop Web.

### Key Finding
The push notification failure on Android and web is **not a client-side display glitch**, but the result of two compounding backend architectural failures:
1. **Fatal Webhook 401 Unauthorized**: PostgreSQL database triggers (`invoke_edge_webhook`) invoke notification Edge Functions using the public `anon` key in `Authorization: Bearer <anonKey>`. The Edge Functions' shared security middleware (`authorizeEdgeRequest`) explicitly rejects the public anon key with `HTTP 401 Unauthorized`. Therefore, **every database-triggered push notification is rejected at the API gateway**.
2. **Missing Expo Receipts & FCM v1 Validation**: Edge Functions treat initial Expo Push Tickets (`status: "ok"`) as final delivery and mark DB notifications as `'sent'`. They never poll `getReceipts`. When Expo attempts delivery to Google FCM, if credentials or project IDs mismatch, Google FCM drops the message silently.

---

## Section A: Structure & Health

| Component | Framework / Version | Type Check (`tsc`) | Lint Status | Build Status |
|---|---|---|---|---|
| `RepairShopApp` | Expo SDK 54 (~54.0.0), RN 0.81.6, React 19.1.4 | **PASS** (0 errors) | **PASS** (0 errors, 32 hook warnings) | **PASS** (`expo export --platform web` bundled 3,297 modules in 29.9s) |
| `admin-panel` | Next.js 16.2.12, React 19.1.0, Tailwind | **PASS** (0 errors) | **FAIL** (301 errors, 127 warnings — `@typescript-eslint/no-explicit-any` & React 19 hook rules) | **PASS** (26 static routes built, client bundle 1.07 MB gzip within 1.5 MB budget) |
| `supabase/functions` | Deno, `@supabase/supabase-js` 2.45.4 | N/A (Deno runtime) | N/A | Edge Functions active |

### Findings

#### [HIGH] Admin Panel ESLint Violations (301 errors, 127 warnings)
- **File**: `admin-panel/src/**/*`
- **Impact**: Strict CI/CD pipelines will fail. Errors are dominated by `@typescript-eslint/no-explicit-any` and React 19 `react-hooks/set-state-in-effect` (e.g. `src/app/(admin)/attendance/page.tsx:132`).
- **Proposed Fix**: Modernize effect patterns in admin-panel pages to avoid synchronous `setState` in effects, and refine TypeScript interfaces to replace `any`.

#### [MEDIUM] Expo Project ID Mismatch in Root Configuration
- **File**: `app.json` (root) vs `RepairShopApp/app.json`
  - Root `app.json:5`: `projectId: "7e33115f-5b88-4cf1-9b16-8fdbde6e562b"`, `package: "com.bakhtiarabid02.repairshopworkspace"`
  - `RepairShopApp/app.json:77`: `projectId: "9e74d61a-0e68-4312-a3ce-4114cf44a72d"`, `package: "com.repairshop.app"`
- **Impact**: If EAS CLI commands are executed from the repo root instead of inside `RepairShopApp`, credentials and builds target the wrong Expo project.
- **Proposed Fix**: Harmonize root `app.json` with `RepairShopApp/app.json`.

---

## Section B: Security & Configuration

#### [CRITICAL] Database Webhooks Pass Anon Key & Trigger 401 Rejections
- **File**: `supabase/migrations/20260821200000_push_notifications_webhook_pipeline.sql` (lines 57–59)
- **Code**:
  ```sql
  'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
  'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
  ```
- **Middleware**: `supabase/functions/_shared/notifications.ts` (lines 198–205):
  ```typescript
  if (anonKey && token === anonKey) {
    return {
      isAuthorized: false,
      error: 'Unauthorized: Public anon key is not permitted to trigger this function',
      status: 401,
    };
  }
  ```
- **Impact**: All database triggers (`trigger_notify_job_created`, `trigger_notify_job_status`, etc.) fail with HTTP 401. No push notifications are ever dispatched by the database.
- **Proposed Fix**: Update `invoke_edge_webhook` to authenticate with `x-webhook-secret: <APP_WEBHOOK_SECRET>` or `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY>`.

#### [HIGH] Data Exposure via `public.users` SELECT Policy
- **File**: `supabase/migrations/20260819000000_baseline_schema.sql` (lines 851–853)
- **Code**:
  ```sql
  create policy "users_select_authenticated"
    on public.users for select to authenticated
    using ((select auth.role()) = 'authenticated');
  ```
- **Impact**: Any authenticated employee (e.g. technician or receptionist) querying `public.users` receives all columns for all staff members, including `expo_push_token`, phone numbers, and operational metadata.
- **Proposed Fix**: Restrict sensitive columns or move device tokens out of `users` into a dedicated `device_tokens` table governed by strict `user_id = auth.uid()` RLS.

---

## Section C: Data & Backend Architecture

#### [CRITICAL] Single-Token Architecture & Lack of Multi-Platform Support
- **File**: `public.users.expo_push_token`
- **Impact**:
  1. A user can only have ONE token. If an employee logs in on their Android phone and then on a web dashboard or second tablet, the first device is overwritten and stops receiving notifications.
  2. Web Push (PWA on Safari/Chrome) requires an endpoint, `p256dh` key, and `auth` secret (JSON object). This cannot fit into `expo_push_token`.
- **Proposed Fix**: Create `device_tokens` table:
  - `id (UUID)`
  - `user_id (UUID references users.id ON DELETE CASCADE)`
  - `platform ('android' | 'ios' | 'web')`
  - `token_or_endpoint (TEXT NOT NULL)`
  - `keys (JSONB, for web push p256dh and auth)`
  - `device_info (JSONB)`
  - `last_seen_at (TIMESTAMPTZ)`
  - `is_active (BOOLEAN)`
  - Unique constraint on `(user_id, token_or_endpoint)`

#### [HIGH] Expo Push Receipts Are Never Polled
- **File**: `supabase/functions/_shared/notifications.ts` (lines 105–110)
- **Impact**: `sendPushNotification` logs `"Successfully delivered to Expo"` upon receiving an initial Ticket. If Google FCM v1 rejects the delivery (due to missing service account, sender ID mismatch, or revoked token), the failure only appears in the Expo Receipt. Because receipts are never queried, the system falsely reports success while devices receive nothing.
- **Proposed Fix**: Implement an asynchronous or scheduled receipt check against `https://exp.host/--/api/v2/push/getReceipts`.

---

## Section D: App Quality & Client Lifecycle

#### [HIGH] No Token Invalidation on Logout
- **File**: `RepairShopApp/src/context/AuthContext.tsx` (lines 194–207)
- **Code**: `signOut()` calls `supabase.auth.signOut()` and resets React state, but leaves the push token in the database.
- **Impact**: When a technician logs out, notifications meant for that account continue arriving on the physical device.
- **Proposed Fix**: Invalidate or deactivate the current device token in `device_tokens` during `signOut()`.

#### [MEDIUM] Denied Notification Permission Has No Recovery UX
- **File**: `RepairShopApp/src/hooks/usePushNotifications.ts` (lines 68–71)
- **Code**:
  ```typescript
  if (finalStatus !== 'granted') {
    console.log('Push notification permission not granted.');
    return undefined;
  }
  ```
- **Impact**: On Android 13+, if a user taps "Don't allow", the app never prompts again and fails silently.
- **Proposed Fix**: Provide a clear UI prompt guiding the user to open app settings via `Linking.openSettings()`.

#### [MEDIUM] Notification Channel Created After Token Request
- **File**: `RepairShopApp/src/hooks/usePushNotifications.ts` (lines 51–58 vs line 78)
- **Impact**: Android notification channels should be initialized before requesting tokens or receiving foreground/background payloads to prevent default sound/vibration drops.
- **Proposed Fix**: Ensure channel configuration executes before `getExpoPushTokenAsync`.

#### [HIGH] Complete Absence of Web Push / Safari PWA Push
- **File**: `RepairShopApp/src/hooks/usePushNotifications.ts` (line 44)
  ```typescript
  if (Platform.OS === 'web') return undefined;
  ```
- **Impact**: On iPhone (Safari PWA), staff receive notifications only if the tab is actively focused and connected to Supabase Realtime. If Safari is minimized, locked, or closed, zero notifications are received.
- **Proposed Fix**: Register a Service Worker with Push API support, generate VAPID keys, implement `PushManager.subscribe()`, and add Web Push fan-out in Edge Functions.

---

## Severity Summary

| Severity | Count | Summary |
|---|---|---|
| **CRITICAL** | 2 | Webhook 401 security rejection on all DB triggers; Single-token architecture blocking multi-device and Web Push |
| **HIGH** | 4 | No Expo receipt checks; `public.users` RLS exposes tokens; Tokens retained on logout; Zero PWA push support |
| **MEDIUM** | 3 | Admin panel ESLint errors; Denied permission recovery UX; Root `app.json` project ID mismatch |
| **LOW** | 1 | Unused variables and React hook dependency warnings |

