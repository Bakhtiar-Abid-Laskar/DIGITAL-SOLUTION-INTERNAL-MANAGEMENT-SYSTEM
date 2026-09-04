# Phase 0: Environment & Stack Discovery

**Project Name:** RepairShop Service Management System (Digital Solution)  
**Date:** August 14, 2026  
**Auditor:** Senior QA Engineer & Software Architect  

---

## 1. Languages, Frameworks & Package Managers

The codebase is organized as an **npm / monorepo workspace**:

```
repairshop-workspace/
├── RepairShopApp/       # Mobile application (Expo React Native)
├── admin-panel/         # Web Admin Dashboard (Next.js 16 App Router)
├── packages/shared/     # Shared business logic, types, utilities
├── supabase/            # PostgreSQL database, migrations, and Deno Edge Functions
├── scripts/             # Internal maintenance, token generation, RLS smoke testing
```

| Component | Framework / Environment | Language | Package Manager / Runtime | Key Libraries |
|---|---|---|---|---|
| **Mobile App** (`RepairShopApp`) | Expo SDK 54 / React Native 0.81.6 | TypeScript 5.9 | npm (workspace) | React Navigation 7, Supabase JS 2.45, TanStack Query 5, Expo Camera 17, Expo Location 19, Expo Print 15, Expo Notifications 0.32 |
| **Web Admin Panel** (`admin-panel`) | Next.js 16.2.9 (App Router) / React 19.1 | TypeScript 5.0 | npm (workspace) | Tailwind CSS 4, Recharts 3.9, React Leaflet 5, DOMPurify 3.4, es-toolkit 1.5 |
| **Shared Core** (`packages/shared`) | Shared TypeScript Module | TypeScript 5.0 | npm (workspace) | `@repairshop/shared` (types, billing math, phone formatting, date helpers) |
| **Backend & Database** (`supabase`) | Supabase / PostgreSQL 15+ | PL/pgSQL / SQL | Supabase CLI 2.109.1 | Row Level Security (RLS), Triggers, Sequences, pg_cron, pg_net |
| **Serverless Functions** (`supabase/functions`) | Supabase Edge Functions (Deno 1.30+) | TypeScript / Deno | Deno URL imports | Resend API, Google Drive API v3 (JWT/OAuth2), Expo Push API |

---

## 2. Architecture & Application Type

1. **Mobile Application (Expo React Native):**
   - Cross-platform Android/iOS application with role-based UI switching at root.
   - Distinct navigation stacks and dashboards for **Admin**, **Receptionist**, and **Technician**.
   - Offline-tolerant and device-hardware integrated: Camera (attendance/onsite selfies), Geolocation (GPS geofencing), Local Storage (SecureStore), Push Notifications.

2. **Web Admin Panel (Next.js App Router):**
   - Single-page application / Server & Client Component hybrid targeting desktop browsers for management staff.
   - Comprehensive operations: Jobs, Inventory, Sales, Attendance matrix, GPS Geofencing, Payroll / Salary calculation, Expenditure, Reporting, WhatsApp/Drive integrations.

3. **Backend-as-a-Service (Supabase):**
   - **PostgreSQL Database:** Enforces relational integrity, sequences (`RS-YYYY-XXXX`, `SALE-YYYY-XXXX`), trigger-based stock management, incentive accrual, and database-level Row Level Security.
   - **Supabase Auth:** JWT-based user authentication linking `auth.users` to `public.users`.
   - **Supabase Storage:** S3-compatible private buckets (`attendance-selfies`, `onsite-visits`, `invoices`, `profile-pictures`, `avatars`).
   - **Edge Functions:** 14 Deno functions handling background processing, email dispatch (Resend), Google Drive export/backup, monthly payroll batch computation, and push notification triggers.

---

## 3. Database & ORM / Query Layer

- **Database Engine:** PostgreSQL 15+ hosted on Supabase (`jywydhtiorslayghcycf.supabase.co`).
- **Query Layer:** Direct `@supabase/supabase-js` client queries using typed RPC and PostgREST table queries. No heavy ORM (e.g. Prisma or TypeORM) is used; database schema and RLS policies serve as the single source of truth.
- **Migrations:** SQL migrations located in `supabase/migrations/` managed via Supabase CLI (`supabase db push` / SQL Editor).
- **Security:** Strict PostgreSQL Row Level Security (RLS) on all 30+ tables with `SECURITY DEFINER` role resolution functions (`public.is_admin()`, `public.is_receptionist()`, `public.is_technician()`, `public.is_staff()`).

---

## 4. Local Execution & Development Setup

### Mobile App (`RepairShopApp`)
```bash
cd RepairShopApp
npm run start          # Start Expo dev server
npm run android        # Run on Android emulator / device
npm run web            # Run on web (Metro)
npm run lint           # TypeScript typecheck (tsc --noEmit)
```

### Admin Panel (`admin-panel`)
```bash
cd admin-panel
npm run dev            # Start Next.js dev server on http://localhost:3000
npm run build          # Production Next.js build
npm run lint           # ESLint validation
```

### Shared Package
```bash
cd packages/shared
npm test               # Run unit tests via Jest / ts-jest
```

---

## 5. Existing Test Tooling & Infrastructure

- **Unit Testing Framework:** `jest` 30.4.2 + `ts-jest` 29.4.11 configured in `admin-panel/jest.config.js` and `packages/shared`.
- **E2E Testing Framework:** `@playwright/test` 1.62.1 installed in `admin-panel`.
- **Static Analysis & Type Checking:**
  - TypeScript 5.x compiler (`tsc --noEmit`) in all subprojects.
  - ESLint 9 with `eslint-config-next` in `admin-panel`.
- **Existing Tests:**
  - `packages/shared/src/billing.test.ts` (Billing calculation unit tests).
  - `packages/shared/src/phone.test.ts` (Indian phone number WhatsApp normalization tests).
  - `scripts/rls-smoke-test.ts` (Interactive CLI smoke test for Supabase RLS policies across roles).

---

## 6. Environment Variables Inventory

| Variable Name | Project / Scope | Purpose | Required in Production | Current Status |
|---|---|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | `RepairShopApp` (.env) | Supabase project URL | Yes | Set (`https://jywydhtiorslayghcycf.supabase.co`) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | `RepairShopApp` (.env) | Supabase Anon Public Key | Yes | Set |
| `NEXT_PUBLIC_SUPABASE_URL` | `admin-panel` (.env.local) | Supabase project URL | Yes | Documented in `.env.example` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `admin-panel` (.env.local) | Supabase Anon Public Key | Yes | Documented in `.env.example` |
| `SUPABASE_URL` | `supabase/functions` (Secrets) | Server-side Supabase URL | Yes | Configured via Supabase Secrets |
| `SUPABASE_SERVICE_ROLE_KEY` | `supabase/functions` (Secrets) | Bypass RLS for admin operations | Yes | Configured via Supabase Secrets |
| `SUPABASE_ANON_KEY` | `supabase/functions` (Secrets) | Client verification key | Yes | Configured via Supabase Secrets |
| `RESEND_API_KEY` | `supabase/functions` (Secrets) | Transactional email provider | Yes | Required for `send-invoice-email` |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | `supabase/functions` (Secrets) | Google Drive integration | Optional | Required for Google Drive backup |
| `GOOGLE_PRIVATE_KEY` | `supabase/functions` (Secrets) | Google Drive RSA private key | Optional | Required for Google Drive backup |
| `GOOGLE_DRIVE_FOLDER_ID` | `supabase/functions` (Secrets) | Root target folder in Drive | Optional | Required for Google Drive backup |
| `APP_WEBHOOK_SECRET` | `supabase/functions` (Secrets) | Webhook signature protection | Yes | Required for internal webhooks |
| `ADMIN_URL` | `supabase/functions` (Secrets) | Allowed CORS origin for email | Yes | Default: `http://localhost:3000` |
