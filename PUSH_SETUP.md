# PUSH NOTIFICATION SETUP & DEPLOYMENT GUIDE
**Document**: `PUSH_SETUP.md`  
**Applicability**: Android Native APK (Expo / FCM v1), iOS iPhone Web/PWA (Safari 16.4+), and Desktop Web.

---

## 1. Firebase & Google Services Setup (Android)

### A. Firebase Project Configuration
1. Open the [Firebase Console](https://console.firebase.google.com/).
2. Confirm or select project: `digitalsolution-76a79` (Project Number: `942617918361`).
3. Ensure an Android App exists with Package Name: `com.repairshop.app`.
4. Download the latest `google-services.json` from **Project Settings > General > Your apps**.
5. Save `google-services.json` to both:
   - `RepairShopApp/google-services.json`
   - `google-services.json` (root)

### B. Generate FCM v1 Service Account Key
> **Important**: Google permanently deprecated legacy FCM server keys in June 2024. Expo Push Service requires an FCM v1 private key.

1. In Firebase Console, open **Project Settings > Service accounts**.
2. Select **Firebase Admin SDK**.
3. Click **Generate new private key** and confirm.
4. Save the downloaded JSON file securely (e.g. `service-account-fcm.json`). **Never commit this file to Git.**

---

## 2. Uploading FCM v1 Credentials to Expo (EAS)

Link the Firebase Service Account to your Expo project ID (`9e74d61a-0e68-4312-a3ce-4114cf44a72d`):

```bash
# Navigate to the mobile app directory
cd "RepairShopApp"

# Run EAS Credentials configuration
npx eas-cli credentials
```

1. Select **Android**.
2. Select build profile: **production** (or **preview**).
3. Select **Google Service Account: Manage your Google Service Account Key for FCM**.
4. Choose **Upload a new service account key**.
5. Provide the file path to `service-account-fcm.json`.
6. EAS will upload and link the key to project `9e74d61a-0e68-4312-a3ce-4114cf44a72d`.

---

## 3. VAPID Keys Configuration (iPhone Safari PWA & Web Push)

The following cryptographic NIST P-256 key pair has been generated for Digital Solution:

- **Public Key (Client & Web)**:
  ```text
  BJti9LStmps1ap93J9kfIs4l-_IHMFo51ZawFtUdvFBCvTngCuM8x3lESXu3Au7yRD-8_BDl8GL4p3SAqIPglbg
  ```
- **Private Key (Supabase Edge Function Secret only)**:
  ```text
  mUPw0SbviYaLDysEsrxYaaTkVA8WW0FUiwAQZjvpbJc
  ```
- **Subject / Contact Email**:
  ```text
  mailto:support@digitalsolution.cc
  ```

---

## 4. Supabase Secrets Configuration

Set the required environment secrets in Supabase Edge Functions:

```bash
# Set secrets via Supabase CLI
npx supabase secrets set \
  APP_WEBHOOK_SECRET=ds-repairshop-internal-webhook-secret-v1 \
  VAPID_PUBLIC_KEY=BJti9LStmps1ap93J9kfIs4l-_IHMFo51ZawFtUdvFBCvTngCuM8x3lESXu3Au7yRD-8_BDl8GL4p3SAqIPglbg \
  VAPID_PRIVATE_KEY=mUPw0SbviYaLDysEsrxYaaTkVA8WW0FUiwAQZjvpbJc \
  VAPID_SUBJECT=mailto:support@digitalsolution.cc
```

---

## 5. Applying Database Migrations

Apply the unified device tokens migration to your Supabase PostgreSQL instance:

```bash
# Push migrations to active project
npx supabase db push
```
Or execute the SQL file directly in the Supabase SQL Editor:
- `supabase/migrations/20261101040000_unified_push_and_device_tokens.sql`

---

## 6. iPhone Safari PWA Installation Instructions for Staff

iOS (iOS/iPadOS 16.4+) only enables Web Push for websites that are installed to the device's Home Screen. Standard mobile browser tabs in Safari block background push.

Provide these instructions to shop technicians and receptionists using iPhones:

1. **Open Safari**: Navigate to `https://internalmanagement.digitalsolution.cc` (or your staging/production web URL).
2. **Add to Home Screen**:
   - Tap the **Share** button (the square icon with an upward arrow at the bottom of Safari).
   - Scroll down and tap **Add to Home Screen**.
   - Tap **Add** in the top-right corner.
3. **Open Installed App**: Close Safari and launch **Digital Solution** from the new icon on your iPhone Home Screen.
4. **Log In & Enable Push**:
   - Log in with your staff account.
   - Go to **Settings** (or tap the prompt).
   - Click **Enable Web Push**.
   - Tap **Allow** when iOS displays the notification prompt.
5. Push notifications will now be delivered with sound and lock-screen banners even when the app is completely closed.

---

## 7. Android OEM Battery Optimization Instructions (Xiaomi / Oppo / Vivo)

Aggressive background task killers on Chinese OEM Android skins may delay or suppress push delivery when the app is killed.

Instruct staff with Xiaomi, Realme, Oppo, or Vivo devices to:
1. Long-press the **Digital Solution** app icon > tap **App Info**.
2. Tap **Battery Saver** (or Battery usage) > select **No restrictions** (Unrestricted).
3. Tap **Autostart** (on MIUI / ColorOS) > toggle **Allow autostart** to **ON**.
4. Tap **Notifications** > ensure all channels including **RepairShop** are set to **Urgent / Allow sound and vibration**.

