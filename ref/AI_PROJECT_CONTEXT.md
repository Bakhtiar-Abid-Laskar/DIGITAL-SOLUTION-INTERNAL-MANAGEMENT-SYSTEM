# RepairShop AI Project Context

## 1. Purpose of This File

- This file stores the latest project context for AI agents working on the RepairShop project.
- It **must** be read before starting any new task.
- It reduces token usage by avoiding repeated full-project analysis across different sessions.
- It must be updated after every major change or completed feature.
- **Note:** It is *not* a substitute for checking source code when making risky or core architectural changes.

## 2. Project Overview

- **Project Name:** RepairShop
- **Type:** Repair service management system
- **Main Users:**
  - Admin
  - Receptionist
  - Technician
- **Platforms:**
  - Mobile app: Expo React Native
  - Admin panel: Web app (Next.js)
  - Backend: Supabase
- **Main Modules:**
  - Authentication
  - Receptionist dashboard
  - Technician dashboard
  - Attendance
  - Job management
  - Notifications
  - Billing
  - Admin panel
  - Inventory
  - Reports
  - Salary
  - Expenditure
  - RLS and deployment readiness

## 3. Current Project Status

- Overall feature completion from latest audit: approximately 93%.
- Mobile app exists and includes receptionist and technician workflows.
- Admin panel exists and includes job management, staff, inventory, reports, salary, expenditure, and settings.
- Supabase backend exists with migrations, RLS policies, Edge Functions, and integrations.
- Core integrations include Twilio WhatsApp, Expo Push Notifications, Expo Print, and invoice email through Edge Functions.
- App is not fully production-ready until physical-device testing is completed.
- Camera, GPS, push notifications, WhatsApp, and print flows require real-device/runtime testing.

## 4. Latest Audit Summary

Latest analysis covered:
- **Mobile App**: Expo React Native screens, routes, components, and contexts.
- **Admin Panel**: Next.js/admin web pages, components, and layouts.
- **Backend**: Supabase migrations, triggers, RLS policies, and Edge Functions.
- **Core Integrations**: Twilio, Expo Push Notifications, and Expo Print.

Reports created:
- `FULL_PROJECT_FEATURE_AUDIT.md`
- `FEATURE_WORKING_STATUS_MATRIX.md`
- `UI_UX_DETAILED_AUDIT.md`
- `ROUTE_AND_SCREEN_MAP.md`
- `DATABASE_AND_BACKEND_AUDIT.md`
- `BUGS_AND_FIX_PLAN.md`

Latest summary:
- Overall feature completion: approximately 93%.
- Overall UI/UX score: 7.5/10.
- Mobile app UI/UX score: 8/10.
- Admin panel UI/UX score: 7/10.
- Working features: 14.
- Partially working features: 2.
- Missing features: 1.
- Broken core features: 0.
- Critical issues: 0.

Important issues found:
1. Attendance GPS error handling needs improvement. *(Addressed in last fix)*
2. Onsite GPS/camera permission failure handling needs improvement. *(Addressed in last fix)*
3. Missing empty states in some screens. *(Addressed in last fix)*
4. Admin Jobs and Staff tables need better responsiveness. *(Addressed in last fix)*
5. Admin destructive actions need confirmation modals. *(Addressed in last fix)*
6. Reports and charts need empty/error/loading state verification. *(Addressed in last fix)*
7. Physical device testing is still required.
8. Live technician background tracking is not implemented and should remain optional.

## 5. Latest User Requests and Decisions

- Jobs in Admin Panel should open in a full page, not a side drawer.
- Admin Panel should have Create Job in the sidebar.
- Admin should be able to create new jobs with all required fields.
- Admin should be able to edit jobs.
- Admin should be able to reassign technicians.
- Admin should be able to generate, edit, print, WhatsApp, and email bills.
- Admin should be able to access job functions similar to the mobile app where appropriate.
- Job details drawer should no longer be the main job view.
- UI should be professional, polished, responsive, and industry standard.
- Emojis should be removed and replaced with proper icons.
- Empty spaces, misaligned text, white footer boxes, and bad spacing should be fixed.
- Optional true live technician tracking should not be implemented unless explicitly requested.

## 6. Important Files and Folders

### Project root:
- `GEMINI.md`
- `.agents/skills/repairshop-master/SKILL.md`
- `AI_PROJECT_CONTEXT.md`
- `FULL_PROJECT_FEATURE_AUDIT.md`
- `FEATURE_WORKING_STATUS_MATRIX.md`
- `UI_UX_DETAILED_AUDIT.md`
- `ROUTE_AND_SCREEN_MAP.md`
- `DATABASE_AND_BACKEND_AUDIT.md`
- `BUGS_AND_FIX_PLAN.md`

### Mobile app:
- `RepairShopApp/`
- `src/lib/supabase.ts`
- `src/context/AuthContext.tsx`
- `src/navigation/`
- `src/screens/receptionist/`
- `src/screens/technician/`
- `src/screens/shared/AttendanceScreen.tsx`
- `src/components/ui/`
- `src/theme/` (or `src/tokens.ts`)

### Admin panel:
- `admin-panel/`
- `admin-panel/app/`
- `admin-panel/components/`
- `admin-panel/lib/`
- `admin-panel/types/`
- `admin-panel/app/jobs/page.tsx`
- `admin-panel/app/jobs/new/page.tsx`
- `admin-panel/app/jobs/[id]/page.tsx` (if implemented)

### Supabase:
- `supabase/migrations/`
- `supabase/functions/`
- `supabase/functions/notify-on-job-created/`
- `supabase/functions/notify-on-status-change/`
- `supabase/functions/send-invoice-email/`
- `supabase/functions/calculate-monthly-salary/`

## 7. Database and Backend Summary

### Expected Supabase tables:
- `users`
- `jobs`
- `job_materials`
- `attendance`
- `onsite_visits`
- `inventory`
- `billing`
- `payments`
- `staff_rates`
- `salary`
- `notifications`

### Important backend rules:
- Job code must be generated server-side.
- Job code prefix must be `RS`.
- `service_role` key must never be used in frontend.
- RLS must not be disabled.
- Technician must only access assigned jobs.
- Technician must not access billing, salary, staff_rates, or payments.
- Receptionist must not access salary, staff_rates, or payments.
- Admin-only financial data must remain admin-only.
- Edge Functions may use `service_role` through Supabase secrets only.

## 8. Current Feature Map

### Receptionist mobile:
- Attendance
- Create job
- Assign technician
- Print receipt
- View jobs
- Reassign technician
- Ready-for-pickup WhatsApp draft
- Generate bill
- Print/WhatsApp/email invoice

### Technician mobile:
- Attendance
- View assigned jobs
- Update status
- Add materials
- Add work notes
- Onsite arrival selfie + GPS
- Onsite departure selfie + GPS

### Admin web:
- Overview
- Jobs
- Create Job
- Full Job Details page, desired
- Staff management
- Inventory
- Reports
- Salary
- Expenditure
- Settings
- Billing/job lifecycle management, desired in full-page job view

### Backend:
- Supabase Auth
- Supabase Database
- RLS
- Storage
- Edge Functions
- WhatsApp integration
- Expo push notifications
- Email invoice
- Salary calculation

## 9. Current Known Issues

### High priority:
- Attendance GPS permission denial must show proper error/retry. *(Addressed)*
- Onsite GPS/camera permission denial must show proper error/retry. *(Addressed)*
- Admin Jobs and Staff tables need responsive improvements. *(Addressed)*
- Destructive admin actions need confirmation modals. *(Addressed)*
- Admin job details should open full page instead of drawer.
- Admin create job page needs full required workflow if not already implemented.

### Medium priority:
- Empty states need improvement. *(Addressed)*
- Reports/charts need better no-data states. *(Addressed)*
- UI polish is needed in edge cases.
- Bottom navigation/content overlap should be checked. *(Addressed)*
- White footer boxes should match cream background.
- Section headers should align with cards.
- Excess empty spacing should be reduced.

### Low/optional:
- True live technician background tracking is missing but should remain optional.
- Warranty tracking may be optional.
- Multi-device jobs may be optional.

## 10. UI/UX Standards to Follow

- Professional, polished, industry-standard design.
- No emojis in UI labels.
- Use proper icons.
- Consistent spacing.
- Consistent cards.
- Clear section headers.
- Proper loading states.
- Proper empty states.
- Proper error states.
- Bottom navigation must not overlap content.
- Admin pages must be responsive.
- Tables should not overflow on smaller screens.
- Forms must work on small screens.
- White cards are acceptable, but large background strips should match the app background.
- Cream/off-white background should be consistent where already used.

## 11. Admin Job Management Target State

- Jobs page should list jobs.
- Clicking a job should open a full page, not a drawer.
- Add sidebar item: Create Job.
- Create Job page should include all required intake fields.
- Job Details page should include:
  - Customer info
  - Device info
  - Reported issue
  - Remarks
  - Status
  - Priority
  - Assigned technician
  - Reassign technician
  - Edit job
  - Materials
  - Work notes
  - Onsite details if applicable
  - Billing
  - Print receipt
  - Generate/edit bill
  - Print bill
  - WhatsApp invoice
  - Email invoice

## 12. Commands and Testing

### Mobile:
- `npm install`
- `npm run typecheck` (if available)
- `npm run lint` (if available)
- `npx expo start`

### Admin panel:
- `npm install`
- `npm run typecheck` (if available)
- `npm run lint` (if available)
- `npm run build`
- `npm run dev`

### Supabase:
- `supabase functions deploy notify-on-job-created`
- `supabase functions deploy notify-on-status-change`
- `supabase functions deploy send-invoice-email`
- `supabase functions deploy calculate-monthly-salary`

### Testing still required:
- Physical Android camera test
- Physical Android GPS test
- Expo push notification test
- Twilio WhatsApp test
- Invoice print test
- Admin responsive test
- RLS role isolation test

## 13. How Future Agents Should Use This File

**Before starting any future task:**
1. Read `AI_PROJECT_CONTEXT.md` first.
2. Read `GEMINI.md` and `SKILL.md` only if the task affects architecture, database, security, or phase rules.
3. Read the specific relevant source files for the task.
4. Do not scan the entire project unless necessary.
5. Use the reports listed above for deeper reference only when needed.
6. Update `AI_PROJECT_CONTEXT.md` after completing work.

**When updating this file:**
- Add a new entry under "Latest Updates".
- Update current status.
- Update known issues.
- Update completed changes.
- Update remaining tasks.
- Do not remove important historical context unless it is clearly outdated.
- Keep the file concise but useful.

## 14. Latest Updates Log

### Update 1 — Initial Context File Created
Date: 2026-07-03
Summary:
- Created AI_PROJECT_CONTEXT.md to reduce repeated project scanning.
- Added latest audit summary.
- Added known project status.
- Added current priorities.
- Added admin job management target state.
- Added usage rules for future AI agents.

## 15. Next Recommended Task

**Recommended next task:**
Implement the Admin Panel full-page job management upgrade:
- Replace job drawer with full page.
- Add Create Job sidebar route.
- Add full Create Job page.
- Add full Job Details page.
- Add edit/reassign/materials/billing/print/WhatsApp/email features.
- Keep security rules unchanged.
