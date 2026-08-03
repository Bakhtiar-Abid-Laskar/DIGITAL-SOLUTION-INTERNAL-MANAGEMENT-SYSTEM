# RepairShop — Master Reference (Senior Engineer Briefing)

## Purpose of This Document

This is the final executive summary document. If you had to onboard a senior engineer in 30 minutes, hand them this document. Everything needed to immediately contribute to the RepairShop codebase without any external briefing.

---

## The One-Sentence Description

RepairShop is a **service repair management system** built as two applications — a **Next.js admin web panel** (for owners) and an **Expo React Native mobile app** (for receptionists and technicians) — both sharing the same **Supabase** backend (PostgreSQL + Auth + Storage + Edge Functions).

---

## System Map: Where Everything Lives

```
Project/                          ← Root directory
├── admin-panel/                  ← Next.js 16, React 19, Tailwind v4
│   └── src/
│       ├── app/(admin)/          ← All admin pages (App Router)
│       ├── components/           ← Reusable UI components
│       ├── context/AuthContext   ← Auth state provider
│       ├── lib/supabase.ts       ← Supabase client (standard)
│       ├── shared/documents/     ← Shared DocumentRenderer (imported by mobile too)
│       ├── types/                ← TypeScript interfaces
│       └── utils/                ← Billing, CSV, formatting, salary slip
│
├── RepairShopApp/                ← Expo SDK 54, RN 0.81.5
│   └── src/
│       ├── navigation/           ← Role-based tab stacks, custom tab bar
│       ├── screens/              ← Organized by role: auth/receptionist/technician/admin/shared
│       ├── components/           ← Reusable UI components (mobile)
│       ├── context/              ← AuthContext + ToastContext
│       ├── hooks/                ← usePushNotifications, useCameraPermission, useLocationPermission
│       ├── lib/supabase.ts       ← Supabase client (with SecureStore adapter)
│       ├── tokens.ts             ← *** Master design system file ***
│       ├── types/                ← TypeScript interfaces
│       └── utils/                ← Billing, phone, image compression, date, storage paths
│
└── supabase/functions/           ← 3 Edge Functions (Deno/TypeScript)
    ├── notify-on-job-created/    ← Webhook: job INSERT → push + WhatsApp
    ├── notify-on-status-change/  ← Webhook: job UPDATE → push + WhatsApp
    └── send-invoice-email/       ← HTTP endpoint: email via Resend
```

---

## The 3 Most Important Files

### 1. `RepairShopApp/src/tokens.ts`
The mobile app's master design system. Colors, spacing, typography, shadows, and animation configs. Changing ANY visual aspect of the mobile app starts here.

### 2. `admin-panel/src/app/globals.css`
The admin panel's master CSS. The `@theme` block contains all Tailwind v4 CSS variables. Changing any visual aspect of the admin panel starts here.

### 3. `GEMINI.md` (project root)
Non-negotiable architectural rules. Job codes server-side only. Service role key never in client. Salary formula must be confirmed. Read this before making any structural changes.

---

## The 3 Most Complex Screens

### 1. `RepairShopApp/src/screens/shared/AttendanceScreen.tsx` (~500 lines)
Camera permissions → location permissions → selfie capture → image compression → GPS capture → Storage upload → UPSERT to attendance table → 30-day history display. The most complex flow in the app.

### 2. `admin-panel/src/app/(admin)/jobs/[id]/page.tsx` (~805 lines)
4-tab job detail (overview / materials / billing / notes), inline editing, realtime, confirmation modals. The "monolith" page of the admin panel.

### 3. `RepairShopApp/src/screens/receptionist/BillingScreen.tsx` (~480 lines)
Multi-action billing screen: load job + materials + billing, calculate grand total live, save invoice, print, email (via Edge Function), WhatsApp, mark paid. Also contains the cross-app import to `DocumentRenderer`.

---

## The #1 Architectural Concern

```typescript
// RepairShopApp/src/screens/receptionist/BillingScreen.tsx line 1 (approximately)
import { generateDocumentHtml } from '../../../../admin-panel/src/shared/documents/DocumentRenderer'
```

The mobile app directly imports source code from the admin panel. This works via `metro.config.js` watchFolders configuration. **If the admin panel directory is moved, the mobile app breaks at build time.** This is the biggest structural risk in the codebase. The fix is to extract `DocumentRenderer` to a shared package.

---

## Critical Business Rules (NEVER VIOLATE)

| Rule | Why |
|---|---|
| Job codes via `supabase.rpc('generate_job_code')` only | Prevents duplicate codes in concurrent creation |
| Service role key only in Edge Functions | Prevents credential exposure to clients |
| Billing formula: `(parts + labour) × (1 + tax/100) - discount` | Financial accuracy; confirmed by business owner |
| Salary formula: as documented in GEMINI.md and confirmed by owner | Payroll integrity |
| Attendance selfie + GPS: never submit without both | Legal/compliance requirement |
| Technician queries: always filter by `technician_id = auth.uid()` | Data isolation/security |

---

## Quick Command Reference

```bash
# Start admin panel dev server
cd admin-panel && npm run dev                    → http://localhost:3000

# Start mobile app
cd RepairShopApp && npx expo start              → Scan QR or press A/I

# Build mobile for testing (Android APK)
cd RepairShopApp && eas build --platform android --profile preview

# Deploy Edge Functions
cd Project && supabase functions deploy notify-on-job-created

# Check DB RLS policies
supabase inspect db rls

# Test Edge Function locally
supabase functions serve --no-verify-jwt
```

---

## Environment Variables: Where Each Goes

| Variable | Admin Panel | Mobile App | Edge Function |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ✅ `.env.local` | ❌ | ❌ |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | ✅ `.env.local` | ❌ | ❌ |
| `EXPO_PUBLIC_SUPABASE_URL` | ❌ | ✅ `.env` | ❌ |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | ❌ | ✅ `.env` | ❌ |
| `SUPABASE_SERVICE_ROLE_KEY` | ⛔ NEVER | ⛔ NEVER | ✅ Supabase secret |
| `TWILIO_SID` | ⛔ NEVER | ⛔ NEVER | ✅ Supabase secret |
| `TWILIO_TOKEN` | ⛔ NEVER | ⛔ NEVER | ✅ Supabase secret |
| `RESEND_API_KEY` | ⛔ NEVER | ⛔ NEVER | ✅ Supabase secret |

---

## Data Flow Summary

```
RECEPTIONIST creates job (mobile)
  → supabase.rpc('generate_job_code') → RS-2026-0001
  → INSERT INTO jobs → DB
  → DB Webhook fires → notify-on-job-created Edge Function
    → Push to technician's device
    → WhatsApp to customer: "We received your device"

TECHNICIAN updates job (mobile)
  → UPDATE jobs SET status = 'Completed' → DB
  → DB Webhook fires → notify-on-status-change Edge Function
    → Push to ALL receptionists + admins
    → WhatsApp to customer: "Ready for pickup"

RECEPTIONIST sends invoice email (mobile)
  → supabase.functions.invoke('send-invoice-email', { jobId })
  → Edge Function fetches job + billing from DB
  → Resend API sends email to customer_email

ADMIN views dashboard (web)
  → Parallel Supabase queries for KPIs
  → Supabase Realtime channel subscription
    → Any job INSERT/UPDATE → fetchDashboardData() called again
```

---

## File Count Summary

| Location | Files | Total Lines (est.) |
|---|---|---|
| `admin-panel/src/` | ~55 files | ~8,000 lines |
| `RepairShopApp/src/` | ~65 files | ~10,000 lines |
| `supabase/functions/` | 3 files | ~600 lines |
| **Total** | **~123 files** | **~18,600 lines** |

---

## Technology Decision Log

| Decision | Chosen | Rejected | Reason |
|---|---|---|---|
| Mobile framework | Expo RN | Flutter, Ionic | Team familiarity, ecosystem |
| State management | Local useState | Redux, Zustand | Simplicity for current scale |
| Admin styling | Tailwind v4 | CSS-in-JS, Material UI | Team preference, file colocation |
| Auth storage (mobile) | Expo SecureStore | AsyncStorage | Security — native keychain |
| Notifications | Expo Push | Firebase FCM direct | Expo manages certificates |
| Database | Supabase | Firebase, PlanetScale | PostgreSQL required for RLS + SQL |
| Email | Resend | SendGrid, SES | Developer-friendly, free tier |
| WhatsApp | Twilio | WATI, direct API | Industry standard, reliable |
| Admin deployment | Vercel | AWS Amplify, Netlify | Next.js optimal platform |
| Document rendering | HTML string | PDFKit, react-pdf | Simplest cross-platform approach |

---

## What Needs Work (Summary)

### Before Production Launch
1. ❌ Push notification deep links not wired up
2. ❓ `AddStaffModal` needs verification (service role risk)
3. ❌ No automated tests for billing/salary formulas
4. ❌ No webhook signature verification on Edge Functions
5. ❌ No error tracking (Sentry not configured)

### Architectural Technical Debt
6. ⚠️ Cross-app import (`BillingScreen` → `admin-panel/src/shared`)
7. ⚠️ Duplicated utilities across both apps (billing.ts, formatCurrency.ts)
8. ⚠️ `any` types used in ~15-20 places
9. ⚠️ Dashboard queries are sequential (should be parallel with `Promise.all`)
10. ⚠️ Realtime subscriptions recreated on every filter change (admin jobs page)

### Missing Features
11. ❌ Customer tab (mobile) — not implemented (Coming Soon screen)
12. ❌ Technician reassignment doesn't notify new technician
13. ❌ Mobile admin has significantly fewer features than web admin

---

## Quick Reference: Status Badges Color Logic

```
Received          → Amber background,  Amber text
In Progress       → Blue background,   Blue text
Waiting Materials → Yellow background, Orange text
Completed         → Green background,  Green text

Normal Priority   → Gray background,   Gray text
High Priority     → Orange background, Orange text
Urgent Priority   → Red background,    Red text
```

---

## Quick Reference: Supabase Table Access Patterns

```typescript
// Always used patterns:
supabase.from('jobs').select('*')                    // All jobs
supabase.from('jobs').select('*, technician:users!jobs_technician_id_fkey(name)') // With join
supabase.from('jobs').eq('technician_id', userId)   // Technician filter (security critical)
supabase.rpc('generate_job_code')                   // Job code generation (never client-side)
supabase.storage.from('attendance-selfies').upload() // Selfie upload
supabase.storage.from('attendance-selfies').createSignedUrl() // Display selfies
supabase.functions.invoke('send-invoice-email')     // Email via Edge Function
supabase.channel('name').on('postgres_changes', ...).subscribe() // Realtime
```

---

## If You're Debugging...

### "Jobs not loading for technician"
→ Check `technician_id` in the job row matches the logged-in user's ID
→ Check RLS policy on `jobs` for SELECT by technician role
→ Verify `is_active = true` for the user

### "Job code is null after creation"
→ `generate_job_code()` function doesn't exist in DB
→ Run the function creation SQL in Supabase Dashboard → SQL Editor

### "Push notifications not received"
→ Check `users.expo_push_token` is populated for the target user
→ Check `usePushNotifications` hook ran (app was opened before testing)
→ Push notifications DON'T work in Expo Go — use a dev build
→ Check Edge Function logs in Supabase Dashboard → Functions → Logs

### "Metro bundler can't find DocumentRenderer"
→ Verify `metro.config.js` includes the parent directory in `watchFolders`
→ Ensure `admin-panel/` directory exists at `../admin-panel/` relative to `RepairShopApp/`

### "Billing calculation is wrong"
→ Check the formula: `(parts + labour) × (1 + tax/100) - discount`
→ Test case: parts=500, labour=300, tax=18, discount=50 → should be 894
→ Verify `parts_total` is correctly calculated from `job_materials.total_cost` sum

### "User can't login — wrong role/access"
→ Check the `role` field in `public.users` table (not the JWT)
→ Check `is_active = true`
→ The auth context fetches role from DB, not JWT claims

### "Attendance selfie upload fails"
→ Check Storage bucket exists: `attendance-selfies` (Private)
→ Check RLS on storage bucket allows user to upload to their own path
→ Check image compression doesn't fail (`expo-image-manipulator` permissions)

---

## Document Index

| # | Document | Purpose |
|---|---|---|
| 01 | `01_PROJECT_OVERVIEW.md` | Executive summary, business context, system identity |
| 02 | `02_ARCHITECTURE.md` | Technical architecture, patterns, cross-cutting concerns |
| 03 | `03_DIRECTORY_STRUCTURE.md` | Complete file tree for both applications |
| 04 | `04_WEBSITE_FILE_ANALYSIS.md` | Every admin panel file analyzed |
| 05 | `05_MOBILE_APP_FILE_ANALYSIS.md` | Every mobile app file analyzed |
| 06 | `06_DATABASE_SCHEMA.md` | Complete database schema with DDL and ERD |
| 07 | `07_API_EDGE_FUNCTIONS.md` | All Supabase API calls and Edge Function contracts |
| 08 | `08_USER_FLOWS.md` | 13 user flows mapped end-to-end |
| 09 | `09_UI_UX_DESIGN_SYSTEM.md` | Design tokens, screen analyses, component library |
| 10 | `10_COMPONENT_HIERARCHY.md` | Full React component tree for both apps |
| 11 | `11_SECURITY_AUDIT.md` | Security analysis with scoring and recommendations |
| 12 | `12_PERFORMANCE_ANALYSIS.md` | Performance analysis with optimization recommendations |
| 13 | `13_DEPENDENCY_AUDIT.md` | All dependencies analyzed with risk assessment |
| 14 | `14_CODE_QUALITY_AUDIT.md` | Code quality review with specific issues |
| 15 | `15_BUGS_AND_GAPS.md` | All known bugs and feature gaps documented |
| 16 | `16_DEVELOPER_SETUP_GUIDE.md` | Step-by-step setup from zero to running |
| 17 | `17_DEPLOYMENT_GUIDE.md` | Production deployment for all components |
| 18 | `18_TESTING_GUIDE.md` | Manual test checklists + automated test recommendations |
| 19 | `19_BUSINESS_LOGIC.md` | All business rules, formulas, and domain logic |
| 20 | `20_ROADMAP.md` | Future features, technical debt, and scaling plan |
| 21 | `21_MASTER_REFERENCE.md` | This file — senior engineer quick reference |
