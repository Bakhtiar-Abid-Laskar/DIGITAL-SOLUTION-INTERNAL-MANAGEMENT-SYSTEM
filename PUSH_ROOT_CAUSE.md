# PUSH NOTIFICATION ROOT-CAUSE ANALYSIS (ANDROID & WEB)
**Document**: `PUSH_ROOT_CAUSE.md`  
**Date**: 2026-11-01  
**Project**: RepairShop / Digital Solution  

---

## 1. 18-Point Root-Cause Checklist (Android Native)

| # | Item | Status | Evidence & Code References |
|---|---|---|---|
| **1** | **Expo Go vs Native Build** | **PASS (Production APK)** / **FAIL (if tested in Expo Go)** | Production release APK is generated (`releases/DS20261101v1.0.2.apk`). `expo-dev-client` (~6.0.21) and standalone build scripts are in place. **Warning**: On Expo SDK 54, remote push notifications do NOT work in standard Expo Go; testing must only be done using the installed APK on physical hardware. |
| **2** | **`google-services.json` Presence & Package Match** | **PASS** | `RepairShopApp/google-services.json` exists. In `RepairShopApp/app.json`: line 32 `"package": "com.repairshop.app"`, line 33 `"googleServicesFile": "./google-services.json"`. In `google-services.json`: line 12 `"package_name": "com.repairshop.app"`. In `RepairShopApp/android/app/build.gradle`: line 184 `apply plugin: 'com.google.gms.google-services'`. |
| **3** | **FCM v1 Service Account Uploaded to EAS** | **CRITICAL ACTION REQUIRED** | Google deprecated legacy FCM server keys in June 2024. Expo Push Service requires an FCM v1 Service Account JSON file uploaded to EAS via `eas credentials` under project `9e74d61a-0e68-4312-a3ce-4114cf44a72d`. If this has not been uploaded, Expo accepts push tickets but Google FCM silently drops delivery with `InvalidCredentials` / `MismatchSenderId` at the receipt stage. |
| **4** | **`expo-notifications` Plugin in `app.json`** | **PASS** | In `RepairShopApp/app.json` lines 67–72: `["expo-notifications", { "icon": "./assets/icon.png", "color": "#2563EB" }]`. In `RepairShopApp/android/app/src/main/AndroidManifest.xml` lines 21–24: `expo.modules.notifications` meta-data tags are compiled into the native manifest. |
| **5** | **`extra.eas.projectId` Consistency** | **FAIL (Root vs App Mismatch)** | `RepairShopApp/app.json:77` has `projectId: "9e74d61a-0e68-4312-a3ce-4114cf44a72d"`. Root `app.json:5` has `projectId: "7e33115f-5b88-4cf1-9b16-8fdbde6e562b"` with a different package name (`com.bakhtiarabid02.repairshopworkspace`). If CLI builds or EAS credentials run from root, they configure the wrong project. |
| **6** | **Android 13+ `POST_NOTIFICATIONS` Permission Handling** | **PARTIAL / FAIL** | `RepairShopApp/src/hooks/usePushNotifications.ts` lines 61–67 requests permission via `Notifications.requestPermissionsAsync()`. However, on denial (lines 68–71), it only writes `console.log('Push notification permission not granted.')`. It does **not** guide the user to system settings with `Linking.openSettings()`. Once denied, Android 13+ will never prompt again automatically. |
| **7** | **Notification Channel Creation (`setNotificationChannelAsync`)** | **PARTIAL** | `RepairShopApp/src/hooks/usePushNotifications.ts` line 51 creates channel `'default'` with `AndroidImportance.MAX`. However, it is invoked during token registration rather than before, and there is no guarantee it is created before push receipt on cold start. |
| **8** | **Foreground Notification Presentation Handler** | **PASS** | `RepairShopApp/src/hooks/usePushNotifications.ts` lines 17–29 and `App.tsx` configure `Notifications.setNotificationHandler` with `shouldPlaySound: true, shouldSetBadge: true, shouldShowBanner: true, shouldShowList: true`. |
| **9** | **Physical Device Token Acquisition** | **PASS** | `usePushNotifications.ts` line 60 checks `if (Device.isDevice)` before calling `Notifications.getExpoPushTokenAsync({ projectId })`. |
| **10** | **Token Persistence & Multi-Device Lifecycle** | **FAIL (Architectural Defect)** | Tokens are written exclusively to `public.users.expo_push_token` (`usePushNotifications.ts:114`). There is no multi-device tracking, no `platform` column, no `updated_at`, and `AuthContext.tsx:194` never clears or deactivates the token on `signOut()`. Users continue receiving notifications after logout, and logging in on another device overwrites the previous token. |
| **11** | **Token Refresh Listener (`addPushTokenListener`)** | **FAIL** | `usePushNotifications.ts` does **not** register `Notifications.addPushTokenListener`. When Expo/FCM rotates the device push token, the backend never receives the updated token. |
| **12** | **Row Level Security on Token Storage** | **FAIL** | `public.users` SELECT policy in `20260819000000_baseline_schema.sql:851` allows any authenticated user to view all staff members' `expo_push_token` values. |
| **13** | **Webhook Dispatch Invocation & Authorization** | **FATAL FAILURE (Root Cause #1)** | In `supabase/migrations/20260821200000_push_notifications_webhook_pipeline.sql` lines 57–59, `invoke_edge_webhook` calls notification Edge Functions using `Authorization: Bearer <anonKey>`. In `supabase/functions/_shared/notifications.ts` lines 198–205, `authorizeEdgeRequest` explicitly blocks the anon key: `if (anonKey && token === anonKey) return { isAuthorized: false, status: 401 }`. **All database triggers fail with HTTP 401 Unauthorized.** |
| **14** | **Payload Validity** | **PASS** | In `supabase/functions/_shared/notifications.ts` lines 79–86, payload includes `to`, `sound: 'default'`, `priority: 'high'`, `title`, `body`, `data`, `channelId: 'default'`. |
| **15** | **Expo Push Receipts Handling** | **FAIL (Root Cause #2)** | In `supabase/functions/_shared/notifications.ts` lines 105–109, the backend checks only the initial ticket response. It **never** queries `https://exp.host/--/api/v2/push/getReceipts`. Consequently, FCM v1 rejections (`DeviceNotRegistered`, `InvalidCredentials`, `MismatchSenderId`) are completely hidden. |
| **16** | **Detailed Error & Provider Logging** | **PARTIAL** | DB records are inserted into `notifications` table, but there is no dedicated `notification_logs` table tracking raw provider HTTP responses, device platforms, or delivery receipts. |
| **17** | **OEM Battery Optimization & Background Execution** | **FAIL (Documentation & Guidance)** | Devices running MIUI/HyperOS (Xiaomi), ColorOS (Oppo/Realme), and FuntouchOS (Vivo) aggressively kill background services and freeze push notifications unless "Autostart" and "No restrictions" battery modes are enabled. Staff must be provided clear in-app setup instructions. |
| **18** | **Cold Start & Killed State Notification Tap Handling** | **FAIL** | `usePushNotifications.ts` attaches `addNotificationResponseReceivedListener` (line 221) for background taps, but does **not** call `Notifications.getLastNotificationResponseAsync()` on cold boot when the app was launched from a killed state. |

---

## 2. Ranked List of Confirmed Root Causes

### 1. FATAL: Database Webhook 401 Unauthorized Rejection
- **Mechanism**: PostgreSQL triggers (`trigger_notify_job_created`, `trigger_notify_job_status`, etc.) dispatch HTTP POST requests via `pg_net` to Edge Functions using the public Supabase `anon` key.
- **Breakage**: The Edge Functions' authentication guard (`authorizeEdgeRequest` in `_shared/notifications.ts:199`) explicitly checks `if (anonKey && token === anonKey)` and returns `HTTP 401 Unauthorized`.
- **Result**: Notification Edge Functions **never execute** from database events. Zero push notifications are sent to Expo.

### 2. FATAL: Missing Expo Push Receipts Check & Unverified FCM v1 Credentials
- **Mechanism**: `sendPushNotification` only evaluates the synchronous response from `https://exp.host/--/api/v2/push/send` (the ticket).
- **Breakage**: When Expo receives a message, it always issues a ticket with `status: "ok"`. The actual delivery to Google's FCM v1 server happens asynchronously. If the FCM v1 Service Account is missing or mismatched in EAS credentials, Expo's delivery to Google fails. Because the backend never checks `https://exp.host/--/api/v2/push/getReceipts`, the system logs "Delivered successfully" while the device receives nothing.

### 3. ARCHITECTURAL: Single-Column Token Storage & Lack of Invalidation
- **Mechanism**: Device tokens are stored in a single column (`public.users.expo_push_token`).
- **Breakage**:
  1. No support for multiple devices per user.
  2. No storage for Web Push subscription keys (`p256dh`, `auth`).
  3. `signOut()` in `AuthContext.tsx` never deletes the token.
  4. No `addPushTokenListener` to capture token rotation.

### 4. ARCHITECTURAL: Complete Absence of Web Push / Safari PWA Infrastructure
- **Mechanism**: `usePushNotifications.ts:44` explicitly exits on web (`Platform.OS === 'web'`).
- **Breakage**: iOS Safari PWA (Home Screen standalone mode) requires a Web Push Service Worker, VAPID subscription keys, and server-side Web Push dispatch (`web-push`). None of these exist in the codebase. Web sessions rely solely on Supabase Realtime when the tab is actively focused.

### 5. CLIENT UX: Android 13+ Permission Rejection Recovery Missing
- **Mechanism**: When a user denies notification permissions, `usePushNotifications.ts` fails silently without an alert or link to system settings (`Linking.openSettings()`).

---

## 3. Plan of Action (Phases 3–5)

1. **Database & Security Migration**:
   - Create `device_tokens` table with strict RLS (users own their tokens; admin oversight).
   - Create `notification_logs` table.
   - Update `invoke_edge_webhook` to authenticate with an internal webhook secret (`APP_WEBHOOK_SECRET`) or Service Role token.
2. **Unified Dispatcher Edge Function (`send-notification`)**:
   - Accept `{ user_ids, roles, title, body, data, channel }`.
   - Query active tokens from `device_tokens`.
   - Dispatch to Expo Push (Android/iOS native) with receipts verification.
   - Dispatch to Web Push (Safari PWA / desktop web) using VAPID.
   - Prune dead tokens on `DeviceNotRegistered` (Expo) or `404/410` (Web Push).
3. **Client-Side Android & PWA Updates**:
   - Update `usePushNotifications.ts` to register to `device_tokens` with platform and device info.
   - Add `addPushTokenListener` and cold-start tap handling (`getLastNotificationResponseAsync`).
   - Add permission recovery dialog (`Linking.openSettings()`).
   - Implement token cleanup on `signOut()`.
   - Add PWA Service Worker (`sw.js`) and Web Push subscription flow for iPhone Safari PWA.
4. **Admin Test & Debug Interface**:
   - Add "Send Test Push" button in Admin panel to test native and web endpoints with live diagnostic output.
5. **Documentation**:
   - Write `PUSH_SETUP.md` with explicit FCM v1, EAS, VAPID, and Safari PWA configuration guides.

