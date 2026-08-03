# Bugs and Fix Plan

## Critical Priority
No critical data leaks, security bypasses, or broken login workflows were found in the static audit. The RLS policies correctly isolate the data (especially financial data and technician job assignments). 

*Needs runtime verification*: Verifying that `expo-push-token` delivery and Twilio webhook secrets are properly set in the production environment.

## High Priority
### 1. Attendance & Onsite GPS Fallbacks
- Issue: If GPS is disabled by the user on their device, the check-in might fail silently or block the user.
- Module: Mobile (Attendance)
- File path: `src/screens/shared/AttendanceScreen.tsx`
- Why it matters: Core workflow for payroll.
- Suggested fix: Add robust error states asking users to enable location permissions, with explicit manual fallbacks if approved by admin.
- Estimated effort: 2 hours.

## Medium Priority
### 2. Admin Panel Responsive Tables
- Issue: The Jobs and Reports tables overflow on small mobile screens.
- Module: Admin Panel
- File path: `src/app/(admin)/jobs/page.tsx`
- Why it matters: Owners might want to check the admin panel from their phones.
- Suggested fix: Implement card-based responsive designs for tables on mobile breakpoints (`md:hidden`).
- Estimated effort: 3 hours.

### 3. Billing Empty States
- Issue: A zero-value invoice can be generated if a job has no materials and 0 labour.
- Module: Mobile (Billing)
- File path: `src/screens/receptionist/BillingScreen.tsx`
- Why it matters: Can look unprofessional.
- Suggested fix: Prevent invoice generation if Total is 0, or prompt for a minimum labour charge.
- Estimated effort: 1 hour.

## Low Priority
### 4. Technician Live Tracking
- Issue: Live background tracking of technicians is missing.
- Module: Admin/Mobile
- Why it matters: Listed as "Optional/If possible" in PDF.
- Suggested fix: Implement `expo-location` background tracking. This is highly complex and drains battery. Advise skipping unless strictly required.
- Estimated effort: 15+ hours.

## Recommended Fix Order
1. Ensure Twilio/Expo keys are injected into Supabase Edge Functions.
2. Fix Attendance GPS error handling.
3. Fix Admin panel responsive layouts.
4. Polish UI/UX of empty states.
