# RepairShop — Technical Audit Checklist

## 1. Core Platform (Supabase)
- [x] **Working**: Database schema perfectly matches `SKILL.md`.
- [x] **Working**: RLS policies properly isolate Technician, Receptionist, and Admin.
- [x] **Working**: Security triggers prevent role tampering and job field abuse.
- [x] **Working**: Storage buckets (`attendance-selfies`, `onsite-visits`) are private and path-protected.
- [x] **Working**: Edge Functions require JWT or Webhook Secret.
- [ ] **Needs Runtime Testing**: Verify Webhook secret delivery from Supabase Dashboard.

## 2. Mobile App (Expo)
- [x] **Working**: Role-based routing successfully isolates UI.
- [x] **Working**: Expo Camera and Location permissions correctly configured in `app.json`.
- [x] **Working**: Receptionist Job Creation uses DB sequence `RS-` job codes.
- [x] **Working**: Technician screen filters out unassigned jobs.
- [x] **Working**: Push Notification hooks capture tokens.
- [x] **Unnecessary**: `BillingPlaceholderScreen.tsx` (Can be safely deleted).
- [ ] **Needs Runtime Testing**: Actual physical device push notification delivery.
- [ ] **Needs Runtime Testing**: Real-device camera orientation for onsite photos.

## 3. Admin Panel (Next.js)
- [x] **Working**: Zero TypeScript build errors.
- [x] **Working**: Admin-only authentication enforcement.
- [x] **Working**: Dynamic charts and metrics.
- [x] **Working**: Salary calculation and advance deductions.
- [ ] **Needs Runtime Testing**: CSV export memory usage for massive datasets (low risk).

## 4. Workflows & Features
- [x] **Working**: Billing formula: `(parts + labour) * (1 + tax) - discount`.
- [x] **Working**: Salary formula accounts for half-days, early deductions, and OT.
- [x] **Working**: Attendance prevents duplicate daily check-ins.
- [ ] **Needs Runtime Testing**: Twilio WhatsApp sandbox limits/formatting.
- [ ] **Needs Runtime Testing**: Resend invoice email delivery blocking (spam filters).

## 5. Security & Deployment
- [x] **Working**: No `service_role` keys leaked in frontend.
- [x] **Working**: EAS Build `app.json` and `eas.json` are clean.
- [x] **Working**: RLS completely blocks non-admins from financial tables.
- [x] **Working**: Comprehensive manual smoke tests documented.
