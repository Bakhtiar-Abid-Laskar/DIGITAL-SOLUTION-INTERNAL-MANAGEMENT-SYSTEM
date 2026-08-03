# RepairShop — Production Checklist

## Authentication
- [ ] Admin login works → routes to admin panel
- [ ] Receptionist login works → routes to receptionist stack
- [ ] Technician login works → routes to technician stack
- [ ] Inactive user is blocked from entering the app
- [ ] Missing profile shows clear error (not blank screen)
- [ ] Wrong role cannot access wrong app section
- [ ] Session persists after app restart

## Receptionist
- [ ] Create job with all required fields
- [ ] Job code generated server-side (RS-YYYY-NNNN format)
- [ ] Assign technician from dropdown
- [ ] Print receipt works on real device
- [ ] Job list search and filter tabs work
- [ ] Job detail shows all info
- [ ] Reassign technician works
- [ ] WhatsApp ready-for-pickup opens draft (does not auto-send)
- [ ] Generate Bill screen loads materials and calculates correctly
- [ ] Save bill stores to billing table
- [ ] Print invoice works
- [ ] Email invoice sends to customer

## Technician
- [ ] Sees ONLY assigned jobs (not other technicians' jobs)
- [ ] Cannot access billing screen or billing data
- [ ] Cannot access salary data
- [ ] Cannot access staff_rates data
- [ ] Cannot access payments data
- [ ] Status update works (In Progress, Waiting, Completed)
- [ ] Work notes save correctly
- [ ] Materials add/delete works
- [ ] Materials appear only for assigned jobs
- [ ] Onsite arrival selfie + GPS works (real device)
- [ ] Onsite departure selfie + GPS works (real device)
- [ ] Completed jobs set completed_at timestamp
- [ ] Cannot reassign technician_id on own job
- [ ] Cannot modify customer details on assigned job

## Attendance
- [ ] Check-in: selfie capture works (real device)
- [ ] Check-in: GPS coordinates captured
- [ ] Check-in: photo uploaded to Supabase Storage
- [ ] Check-out works
- [ ] Leave marking works
- [ ] Halfday marking works
- [ ] 30-day history displays correctly
- [ ] Users see only their own attendance
- [ ] One user cannot view another user's attendance selfies

## Notifications
- [ ] Push token saved on login
- [ ] Job-created push reaches assigned technician
- [ ] Job-created WhatsApp reaches customer (test with real Twilio number)
- [ ] Status-change push reaches receptionist
- [ ] Status-change push reaches admin
- [ ] Completed WhatsApp reaches customer
- [ ] Notification logs saved to notifications table with correct status
- [ ] Edge Function rejects unauthorized callers (calculate-monthly-salary)
- [ ] Edge Function rejects unauthorized callers (send-invoice-email)

## Admin Panel
- [ ] Admin-only access enforced (non-admin sees "Access Denied" or redirect)
- [ ] Overview dashboard metrics work with real data
- [ ] Jobs page shows all jobs with filters
- [ ] Staff page: approve/block users
- [ ] Attendance page: view all staff attendance
- [ ] Inventory CRUD works
- [ ] Reports page with charts works
- [ ] CSV export works

## Billing (Phase 7)
- [ ] Grand total formula: `(parts + labour) × (1 + tax%) − discount`
- [ ] Test case: parts=500, labour=300, tax=18%, discount=50 → expected 894
- [ ] Invoice branding shows "RepairShop"
- [ ] Currency is INR, 2 decimal places

## Salary (Phase 8)
- [ ] Staff rates save (base_daily_rate, ot_rate, early_deduction)
- [ ] Salary calculation via Edge Function works (admin-only)
- [ ] Confirmed formula: `gross = present_pay + halfday_pay + ot_pay − early_deduction`
- [ ] Net salary = `gross − advance_deducted` (same month only)
- [ ] Test case: present=22×500, halfday=2×250, ot=5×100, early=3×50, advance=2000 → net=9850
- [ ] Salary slip prints from browser
- [ ] Advance salary recording works
- [ ] Advance receipt prints
- [ ] Non-admin CANNOT access salary, staff_rates, or payments

## Expenditure (Phase 8)
- [ ] Materials purchase recording works
- [ ] Daily expenditure recording works
- [ ] Office development recording works
- [ ] Monthly summary cards update correctly
- [ ] Filters (type, month, search) work

## RLS Security (Phase 9)
- [ ] RLS is enabled on all 11 tables
- [ ] Security triggers are active on users and jobs tables
- [ ] Technician CANNOT select other technicians' jobs
- [ ] Technician CANNOT select billing table
- [ ] Technician CANNOT select salary table
- [ ] Technician CANNOT select staff_rates table
- [ ] Technician CANNOT select payments table
- [ ] Technician CANNOT change technician_id on assigned job
- [ ] Technician CANNOT change priority on assigned job
- [ ] Receptionist CANNOT select salary table
- [ ] Receptionist CANNOT select staff_rates table
- [ ] Receptionist CANNOT select payments table
- [ ] Receptionist CANNOT change own role to admin
- [ ] Receptionist CANNOT set own is_active to true
- [ ] Admin CAN access all operational tables
- [ ] Storage bucket access respects folder ownership
- [ ] Technician cannot view other technician's onsite photos
- [ ] Technician cannot view other user's attendance selfies

## Physical Device Testing
- [ ] Camera permission prompt appears and works (Android)
- [ ] Camera permission prompt appears and works (iOS)
- [ ] GPS permission prompt appears and works
- [ ] Push notification permission works
- [ ] Printing works on real printer
- [ ] WhatsApp deep links open WhatsApp
- [ ] App works on slow/intermittent network
- [ ] App does not crash on permission denial

## Deployment
- [ ] Preview Android APK builds via EAS
- [ ] Production Android AAB builds via EAS
- [ ] iOS build config ready (requires Apple Developer account)
- [ ] Admin panel `npm run build` passes with zero errors
- [ ] Admin panel Vercel deployment succeeds
- [ ] Vercel env variables configured (NEXT_PUBLIC_ keys only)
- [ ] All Edge Functions deployed to Supabase
- [ ] All Supabase secrets configured (including WEBHOOK_SECRET)
- [ ] RLS migration (010) applied to production database
- [ ] Security triggers migration (011) applied to production database
- [ ] No service_role key in any frontend code
- [ ] No service_role key in console.log output
- [ ] No secrets committed to Git
