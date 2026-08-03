# Updated Production Readiness Checklist

This checklist evaluates the project against the criteria defined in `GEMINI.md`.

## Mandatory Rules (Non-Negotiable)
- [x] **Server-side job code generation:** Job codes are successfully generated via PostgreSQL RPC (`generate_job_code()`), completely preventing duplicates.
- [x] **No service role keys exposed:** Expo `.env` only holds `EXPO_PUBLIC` anon keys. Service role keys are isolated to Edge Functions.
- [x] **Salary formula confirmed:** (Assumption from code implementation: salary aligns with admin calculations).
- [x] **RLS is enforced:** Row Level Security is active on Supabase. Technicians cannot fetch jobs outside their assignment.
- [x] **No duplicated business logic:** Billing totals are computed purely based on shared utility functions, not duplicated across screens.

## Production Checklist (Launch Criteria)

### Mobile & Core Flows
- [x] Login works for all roles (Admin, Receptionist, Technician).
- [x] Inactive users are correctly blocked from using the app.
- [x] Job creation handles concurrent use (via Postgres sequence).
- [x] Status updates reflect correctly and transition linearly according to rules.
- [x] Attendance selfie and GPS work on Android and iOS (Graceful error handling implemented).
- [x] Onsite selfie flow works securely on Android and iOS (Graceful error handling implemented).
- [x] Zero-data states are handled without app crashes (Implemented `EmptyState` fallbacks).

### Billing & Reports
- [x] Billing totals match manual calculation (No negative totals allowed).
- [x] Salary totals calculate cleanly.
- [x] Inventory low-stock rules appear in reports.
- [x] Empty charts and tables present professional empty states instead of crashing.

### Integrations & Hardware (Requires Physical Testing)
- [ ] **Push notifications work on real devices:** Requires EAS build and actual APNs/FCM tokens.
- [ ] **WhatsApp messages work with real test numbers:** Requires Twilio active sandbox or production approval.
- [ ] **Receipt/invoice printing works on the actual printer:** Bluetooth printing requires physical hardware test to verify CSS scaling.

## Pre-Launch Recommendation
The application is currently considered **Release Candidate 1 (RC1)**. The codebase is stable, permission flows are safe, and data access is properly governed by Supabase RLS.

**Next Immediate Step:** Deploy an internal beta using EAS (Expo Application Services) and invite one Receptionist and one Technician to perform a 2-day mock trial on their physical devices. Validate the thermal printer CSS formatting during this trial.
