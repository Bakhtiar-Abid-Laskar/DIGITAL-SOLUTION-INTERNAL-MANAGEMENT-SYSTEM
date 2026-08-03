# Mobile App Deployment Guide

## Prerequisites

- Node.js 18+
- EAS CLI: `npm install -g eas-cli`
- Expo account: https://expo.dev
- For iOS: Apple Developer account + Xcode on macOS

## Setup

```bash
cd RepairShopApp
npm install
```

## Environment Variables

Create `.env` file:
```env
EXPO_PUBLIC_SUPABASE_URL=https://pjlqluyghnmiiyrkkwgl.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### For EAS Cloud Builds

Option 1: Use the `.env` file (automatically loaded during builds).

Option 2: Set EAS Secrets (recommended for CI/CD):
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value https://pjlqluyghnmiiyrkkwgl.supabase.co
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value your-anon-key
```

⚠️ **NEVER** set `SUPABASE_SERVICE_ROLE_KEY` as an EAS Secret or in `.env`. It belongs ONLY in Supabase Edge Functions.

## Local Development

```bash
npx expo start
```

Scan QR code with Expo Go app on your phone, or use a development client build.

## Notifications Setup

Push notifications require:
1. `expo-notifications` package (already installed)
2. The `expo-notifications` plugin in `app.json` (already configured)
3. A physical device (simulators cannot receive push tokens)
4. EAS project ID configured in `app.json` → `extra.eas.projectId`

The app saves the push token to `users.expo_push_token` on login.

## EAS Build

### Login
```bash
eas login
```

### Configure (first time only)
```bash
eas build:configure
```

### Preview APK (for internal testing)
```bash
eas build --profile preview --platform android
```

Download the APK from the EAS dashboard and install on test devices.

### Production Build
```bash
# Android App Bundle (for Play Store)
eas build --profile production --platform android

# iOS (requires Apple Developer account)
eas build --profile production --platform ios
```

### Build Profiles

| Profile | Output | Distribution | Use Case |
|---|---|---|---|
| `development` | Dev client | Internal | Local dev with native modules |
| `preview` | APK | Internal | Team testing on Android devices |
| `production` | AAB (Android) / IPA (iOS) | Store | Play Store / App Store submission |

## Required Permissions

| Permission | Platform | Why |
|---|---|---|
| Camera | iOS + Android | Attendance selfies, onsite visit photos |
| Location (When In Use) | iOS + Android | GPS verification for attendance + onsite visits |
| Push Notifications | iOS + Android | Job assignment alerts, status updates |
| POST_NOTIFICATIONS | Android 13+ | Required for Android notification permission |

### Permission Texts (configured in app.json)

- **Camera**: "RepairShop uses the camera to capture attendance selfies and onsite visit photos."
- **Location**: "RepairShop uses your location to verify attendance check-in/check-out and onsite visit locations."

Background location is **disabled** — only foreground location is used.

## Physical Device Testing Required

These features **MUST** be tested on real hardware before production:

- Camera capture (selfies)
- GPS accuracy
- Push notifications
- Receipt/invoice printing
- WhatsApp deep links
- Bluetooth printer (if used)
- iOS permission prompts
- Android permission prompts
- App behavior on slow/intermittent network
- Permission denial handling

## Troubleshooting

### Build Fails
- Run `npx expo-doctor` to check for config issues
- Ensure `app.json` has valid `android.package` and `ios.bundleIdentifier`
- Check EAS build logs on https://expo.dev

### Push Notifications Not Working
- Verify physical device (not simulator)
- Check `expo_push_token` is saved in `users` table
- Verify EAS project ID in `app.json`
- Check Edge Function deployment and secrets

### Environment Variables Not Loading
- Ensure `.env` is in the `RepairShopApp/` root directory
- Variable names must start with `EXPO_PUBLIC_` to be accessible in client code
- Restart the dev server after changing `.env`
