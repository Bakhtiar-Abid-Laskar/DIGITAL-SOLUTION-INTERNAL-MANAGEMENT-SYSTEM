# RepairShop — Deployment Guide

## Overview

| Component | Platform | Method |
|---|---|---|
| Admin Panel (Next.js) | Vercel | Git-based auto-deploy |
| Mobile App (Expo) | Android Play Store / iOS App Store | EAS Build |
| Supabase Backend | Supabase Cloud | Supabase CLI / Dashboard |
| Edge Functions | Supabase Cloud | Supabase CLI |

---

## 1. Backend Deployment (Supabase)

The Supabase backend is already cloud-hosted — no server deployment needed. The steps below cover configuration for production.

### 1a. Production Database Setup
```bash
# Link CLI to your Supabase project
supabase login
supabase link --project-ref <your-project-ref>

# Push any migrations
supabase db push
```

### 1b. Production RLS Policies
Verify all RLS policies are enabled for production. In Supabase Dashboard:
1. Go to Database → Tables
2. For each table: verify "Row Level Security Enabled" is ON
3. Check policies exist for all CRUD operations per role

### 1c. Deploy Edge Functions
```bash
# Deploy all three Edge Functions
supabase functions deploy notify-on-job-created
supabase functions deploy notify-on-status-change
supabase functions deploy send-invoice-email
```

### 1d. Set Production Secrets
```bash
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<production-service-role-key>
supabase secrets set TWILIO_SID=<production-twilio-sid>
supabase secrets set TWILIO_TOKEN=<production-twilio-token>
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+<your-twilio-number>
supabase secrets set RESEND_API_KEY=<production-resend-key>
supabase secrets set RESEND_FROM_EMAIL=billing@yourdomain.com
```

### 1e. Configure Database Webhooks (Production)
In Supabase Dashboard → Database → Webhooks:

**Webhook 1: notify-on-job-created**
```
Name: notify-on-job-created
Table: jobs
Events: INSERT
URL: https://<project-ref>.supabase.co/functions/v1/notify-on-job-created
Method: POST
Header: Authorization: Bearer <service-role-key>
```

**Webhook 2: notify-on-status-change**
```
Name: notify-on-status-change
Table: jobs
Events: UPDATE
URL: https://<project-ref>.supabase.co/functions/v1/notify-on-status-change
Method: POST
Header: Authorization: Bearer <service-role-key>
```

---

## 2. Admin Panel Deployment (Vercel)

### 2a. Connect to Vercel
1. Go to https://vercel.com → New Project
2. Import from Git (GitHub/GitLab/Bitbucket)
3. Select the repository
4. Set root directory to `admin-panel`

### 2b. Configure Build Settings
```
Framework: Next.js (auto-detected)
Root Directory: admin-panel
Build Command: npm run build
Output Directory: .next (auto)
Install Command: npm install
```

### 2c. Set Environment Variables in Vercel
In Vercel → Project → Settings → Environment Variables:
```
NEXT_PUBLIC_SUPABASE_URL = https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Set these for:
- ✅ Production
- ✅ Preview
- ✅ Development

> ⚠️ Never add `SUPABASE_SERVICE_ROLE_KEY` as a Vercel environment variable — the admin panel should never have access to it.

### 2d. Deploy
```bash
# Push to your main branch → auto-deploys
git push origin main

# Or deploy manually via Vercel CLI
npx vercel --prod
```

### 2e. Custom Domain (Optional)
In Vercel → Project → Settings → Domains:
1. Add your domain: `admin.repairshop.yourcompany.com`
2. Update DNS records at your domain registrar
3. Vercel auto-provisions SSL certificate

### 2f. Verify Deployment
After deployment, check:
- [ ] Login page accessible at your Vercel URL
- [ ] Login works with admin credentials
- [ ] Supabase queries return data
- [ ] No console errors in browser DevTools

---

## 3. Mobile App Deployment (EAS Build)

### 3a. Configure EAS Project
```bash
cd RepairShopApp

# Login to Expo
eas login

# Configure EAS (first time only)
eas build:configure
```

Verify `app.json` has correct EAS project ID:
```json
{
  "expo": {
    "extra": {
      "eas": {
        "projectId": "9406caf9-490a-4041-b397-5cd0c9a62c8a"
      }
    }
  }
}
```

### 3b. Android Keystore (First-Time Setup)
EAS Build can generate and manage your Android keystore automatically:
```bash
# EAS will prompt to generate or upload a keystore
eas build --platform android --profile production
```

**⚠️ IMPORTANT:** If EAS generates your keystore, download and save it:
```bash
eas credentials
# Select: Android → Production → Download keystore
```
Losing the keystore means you cannot update your Play Store app.

### 3c. iOS Certificates (First-Time Setup, macOS only)
```bash
# EAS can manage Apple credentials automatically
eas build --platform ios --profile production
# Choose: "Let EAS handle this"
# You'll need an Apple Developer account ($99/year)
```

### 3d. Environment Variables for EAS Builds
EAS reads from `.env` file during build OR from EAS secrets:

**Option A: EAS Secrets (Recommended for production)**
```bash
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_URL --value "https://..."
eas secret:create --scope project --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJ..."
```

**Option B: .env file** (ensure `.env` exists before building)
The `.env` file must exist in `RepairShopApp/` with the correct values.

### 3e. Build Preview APK (for testing)
```bash
cd RepairShopApp
eas build --platform android --profile preview
```
- Downloads as `.apk` — can be installed on any Android device for testing
- No Play Store required

### 3f. Build Production APK/AAB
```bash
# Android App Bundle (recommended for Play Store)
eas build --platform android --profile production

# iOS App Store build (requires Apple Developer account)
eas build --platform ios --profile production

# Both platforms simultaneously
eas build --platform all --profile production
```

Build time: 10-30 minutes. You'll receive an email when done.

### 3g. Submit to Google Play Store
```bash
# First time: create app in Play Console (https://play.google.com/console)
# Then submit via EAS:
eas submit --platform android --latest
```

Prerequisites:
- Google Play Developer account ($25 one-time fee)
- App created in Play Console
- `.aab` file built with production profile

### 3h. Submit to Apple App Store
```bash
# Submit via EAS:
eas submit --platform ios --latest
```

Prerequisites:
- Apple Developer account ($99/year)
- App created in App Store Connect
- TestFlight for beta distribution

### 3i. OTA Updates (Without App Store Review)
For JavaScript code changes (no native module changes):
```bash
# Publish an over-the-air update
eas update --branch production --message "Fix billing calculation"
```

OTA updates are received by users automatically on next app launch.

> ⚠️ OTA updates cannot change native modules, app permissions, or app icons. These require a full rebuild.

---

## 4. Production Readiness Checklist

### Security
- [ ] All RLS policies enabled and tested
- [ ] Service role key only in Edge Function secrets
- [ ] Admin panel deployed on HTTPS (Vercel does this automatically)
- [ ] `.env` files not committed to git
- [ ] `google-services.json` not committed to git
- [ ] Supabase project password is strong (randomly generated)
- [ ] Supabase dashboard access limited to team members only

### Performance
- [ ] Admin panel loads in < 3 seconds on a typical connection
- [ ] Mobile app cold-starts in < 2 seconds on target devices
- [ ] Images compressed before upload (code in place ✅)
- [ ] Supabase region selected close to users (ap-south-1 for India)

### Functionality
- [ ] Login works for all three roles on real devices
- [ ] Inactive user block works (test with manually blocked account)
- [ ] Job creation works end-to-end with correct job code
- [ ] Job code generated server-side: `generate_job_code()` returns `RS-2026-0001`
- [ ] Attendance selfie + GPS works on real Android/iOS devices
- [ ] Push notification received on real device (not emulator)
- [ ] WhatsApp deep link opens WhatsApp with pre-filled message
- [ ] Invoice email delivered to real email address
- [ ] Print receipt opens system print dialog

### Data
- [ ] All production users created and set `is_active = true`
- [ ] Staff rates set for all staff members (`staff_rates` table populated)
- [ ] Inventory items seeded if starting with existing stock
- [ ] All tech contacts normalized to 10-digit format in DB

### Monitoring (Recommended)
- [ ] Sentry configured for error tracking (mobile + admin)
- [ ] Supabase Logs configured for Edge Function monitoring
- [ ] Vercel Analytics enabled for admin panel usage

---

## 5. Rollback Procedures

### Admin Panel Rollback
Vercel maintains deployment history:
1. Go to Vercel → Project → Deployments
2. Find the last working deployment
3. Click "..." → "Promote to Production"

### Mobile App Rollback
```bash
# Via OTA update — force a specific update channel
eas update --branch production --message "Rollback to stable" \
  --update <previous-update-id>
```

Or users can clear app data and re-download from the store.

### Edge Function Rollback
```bash
# Redeploy previous version of an Edge Function
# (Keep previous function code in git history)
git checkout <previous-commit-hash> supabase/functions/notify-on-job-created/
supabase functions deploy notify-on-job-created
```

### Database Rollback
```bash
# For migration rollbacks (if destructive changes were made)
# Restore from Supabase daily backup (available in Supabase Pro plan)
# Or run reverse migration SQL manually
```

---

## 6. Soft-Launch Procedure (Recommended)

Before full staff rollout:

### Week 1: Internal Testing
1. Deploy to production with 1 admin + 1 test receptionist + 1 test technician
2. Create 10 test jobs through full lifecycle: intake → assign → update → bill → complete
3. Verify attendance check-in/check-out with actual phones
4. Verify push notifications on real devices
5. Verify print flow (receipt + invoice on actual printer)
6. Verify WhatsApp messages open correctly

### Week 2: Limited Pilot
1. Add 2-3 real staff members
2. Run actual repairs through the system in parallel with paper process
3. Verify billing calculations match expected amounts
4. Test salary calculation for 1 pay period
5. Collect feedback and fix critical issues

### Week 3: Full Rollout
1. Add all staff members
2. Decommission paper/spreadsheet process
3. Set up monitoring (Sentry, Supabase Logs)
4. Provide training session with all staff

---

## 7. EAS Build Profile Reference

```json
// eas.json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": { "gradleCommand": ":app:assembleDebug" }
    },
    "preview": {
      "distribution": "internal",
      "android": { "buildType": "apk" }
    },
    "production": {
      "distribution": "store",
      "android": { "buildType": "app-bundle" },
      "ios": { "simulator": false }
    }
  }
}
```

| Profile | Output | Use For |
|---|---|---|
| development | APK (debug) | Dev testing with Expo dev client |
| preview | APK (release) | Internal team testing |
| production | AAB + IPA | App store submission |

---

## 8. Monitoring & Maintenance

### Daily
- Check Supabase Logs → Functions → Errors for failed notifications
- Monitor Vercel → Analytics for admin panel error rates

### Weekly
- Review Supabase Storage usage (attendance selfies accumulate)
- Check for failed email deliveries in Resend dashboard
- Monitor Supabase DB connection count (should be < 50 for a small shop)

### Monthly
- Update dependencies (check for security advisories)
- Rotate Twilio/Resend API keys if needed
- Archive old job records (optional — DB storage management)
- Calculate and save salary records for all staff

### Quarterly
- Review Supabase plan limits (storage, bandwidth, realtime connections)
- EAS Build updates (ensure Expo SDK stays current)
- Review and test backup restore procedure
