---
name: repairshop-master
version: 1.0.0
description: >
  Use this skill when building the service
  management system. It covers Supabase schema setup, Expo React Native mobile
  apps for receptionist and technician roles, React/Next.js web admin panel,
  attendance with selfie + GPS, job intake and tracking, billing, salary,
  notifications, RLS, deployment, and production readiness.
---

# RepairShop — Master Agent Skill

## What this skill is for

Use this skill as the single source of truth for building the full RepairShop service management system.

The system has:

- **Mobile app:** Expo React Native + TypeScript.
- **Backend:** Supabase PostgreSQL, Supabase Auth, Supabase Storage, Supabase Edge Functions, Supabase Realtime.
- **Web admin:** React TypeScript or Next.js, deployed to Vercel.
- **Roles:** `admin`, `receptionist`, `technician`.
- **Core workflows:** customer job intake, technician assignment, job tracking, attendance, onsite selfie visit logging, billing, salary, expenditure, inventory, reporting, push/WhatsApp/email notifications.

Antigravity should use this as a complete project instruction file. Do not split logic across conflicting files unless the user explicitly asks for separate skills.

---

## Global build order

Build in this order. Do not jump ahead unless the user specifically asks for one isolated module.

1. **Database Schema & Project Setup**
2. **Attendance Module**
3. **Receptionist Dashboard**
4. **Technician Dashboard**
5. **Notifications System**
6. **Admin Panel**
7. **Billing & Invoice Generation**
8. **Salary & Money Management**
9. **Deployment, RLS & Production Readiness**

Every later phase depends on the earlier phases. When the database schema changes, update the schema first, then propagate the change to screens, Edge Functions, RLS policies, and tests.

---

## Non-negotiable hard rules

1. **Job code generation must happen server-side.**
   - Use the `job_code_seq` sequence and `generate_job_code()` Postgres function.
   - Never generate job codes in React Native, React, JavaScript, or TypeScript.
   - Never replace job codes with UUID-only display IDs.

2. **Never expose Supabase `service_role` key to any client.**
   - It may be used only inside Supabase Edge Functions via environment secrets.
   - Mobile app and web admin must use only anon keys and RLS.

3. **Salary formula must be confirmed before implementation.**
   - Before generating salary calculation code, restate the salary formula and ask for explicit confirmation.
   - Do not implement salary logic based on assumption.

4. **Role boundaries must be enforced in RLS, not only UI.**
   - Hiding a screen is not security.
   - Queries, RLS policies, and Edge Functions must enforce access.

5. **Do not duplicate business logic randomly across screens.**
   - Notification sending belongs in Edge Functions.
   - Job code generation belongs in PostgreSQL.
   - Billing formula must stay identical wherever implemented.
   - Salary formula must live in the calculation function after confirmation.

6. **Physical-device testing is mandatory for camera, GPS, notifications, printing, and Bluetooth printer flows.**

---

## Role boundaries

### Admin

Admin can access:

- Overview metrics
- All jobs
- All staff and approval/blocking
- All attendance
- Inventory
- Reports
- Salary
- Expenditure
- Billing oversight
- Notifications logs

Admin-only tables:

- `salary`
- `staff_rates`
- `payments`

### Receptionist

Receptionist can access:

- Create jobs
- Assign/reassign technicians
- Print job receipts
- View/search/filter jobs
- View job detail
- Generate billing/invoice
- Mark/send ready-for-pickup WhatsApp link
- Own attendance
- Inventory read access, if needed

Receptionist must **not** access:

- Salary
- Staff rates
- Payments/expenditure
- Other private staff financial information

### Technician

Technician can access:

- Only jobs assigned to them
- Update job status
- Add/delete materials for their jobs
- Save work notes
- Onsite arrival/departure selfie + GPS
- Own attendance

Technician must **not** access:

- Other technicians' jobs
- Billing
- Salary
- Staff rates
- Payments
- Admin reports

---

# Phase 1 — Database Schema & Project Setup

## When to use

Use this phase when setting up the Supabase project for the first time, creating or modifying the PostgreSQL schema, setting up Supabase Auth, scaffolding the Expo project, building navigation, or implementing role-based routing.

Trigger phrases include:

- “set up the database”
- “create the schema”
- “set up auth”
- “scaffold the app”
- “create navigation structure”

## Goal

Create a working Expo React Native project with Supabase wired up, three role-based navigation stacks, and the complete database schema created in Supabase.

## Master schema

This schema is the source of truth. Copy it into every Supabase migration. Keep dependent code aligned with it.

```sql
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text unique not null,
  phone text,
  role text check (role in ('admin','receptionist','technician')) not null,
  is_active boolean default false,
  expo_push_token text,
  created_at timestamptz default now()
);

create table jobs (
  id uuid primary key default gen_random_uuid(),
  job_code text unique not null,
  customer_name text not null,
  customer_contact text not null,
  customer_email text,
  device_type text check (device_type in ('Laptop','PC','Other')) not null,
  reported_issue text not null,
  remarks text,
  work_notes text,
  job_type text check (job_type in ('Inhouse','Onsite')) default 'Inhouse',
  priority text check (priority in ('Normal','High','Urgent')) default 'Normal',
  status text check (status in ('Received','In Progress','Waiting for Materials','Completed')) default 'Received',
  receptionist_id uuid references users(id),
  technician_id uuid references users(id),
  created_at timestamptz default now(),
  completed_at timestamptz
);

create sequence job_code_seq start 1;

create or replace function generate_job_code()
returns text as $$
declare
  next_val int;
  yr text := to_char(now(), 'YYYY');
begin
  next_val := nextval('job_code_seq');
  return 'RS-' || yr || '-' || lpad(next_val::text, 4, '0');
end;
$$ language plpgsql;

create table job_materials (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id) on delete cascade,
  material_name text not null,
  quantity numeric not null,
  unit_cost numeric not null,
  total_cost numeric generated always as (quantity * unit_cost) stored
);

create table attendance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  date date not null,
  check_in_time timestamptz,
  check_out_time timestamptz,
  selfie_url text,
  gps_lat numeric,
  gps_lng numeric,
  ot_hours numeric default 0,
  early_hours numeric default 0,
  status text check (status in ('Present','Halfday','Leave','Absent')) default 'Present',
  approved_by uuid references users(id),
  unique(user_id, date)
);

create table onsite_visits (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  technician_id uuid references users(id),
  arrival_selfie_url text,
  arrival_time timestamptz,
  arrival_gps_lat numeric,
  arrival_gps_lng numeric,
  departure_selfie_url text,
  departure_time timestamptz,
  departure_gps_lat numeric,
  departure_gps_lng numeric
);

create table inventory (
  id uuid primary key default gen_random_uuid(),
  item_name text not null,
  quantity numeric default 0,
  unit text,
  low_stock_threshold numeric default 5,
  last_updated timestamptz default now()
);

create table billing (
  id uuid primary key default gen_random_uuid(),
  job_id uuid unique references jobs(id),
  parts_total numeric default 0,
  labour_charge numeric default 0,
  tax_percent numeric default 0,
  discount numeric default 0,
  grand_total numeric,
  is_paid boolean default false,
  invoice_url text,
  created_at timestamptz default now()
);

create table payments (
  id uuid primary key default gen_random_uuid(),
  type text check (type in ('advance_salary','materials_purchase','daily_expenditure','office_development')) not null,
  amount numeric not null,
  description text,
  user_id uuid references users(id),
  created_by uuid references users(id),
  created_at timestamptz default now()
);

create table staff_rates (
  user_id uuid primary key references users(id),
  base_daily_rate numeric not null,
  ot_rate_per_hour numeric default 0,
  early_deduction_per_hour numeric default 0
);

create table salary (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id),
  month date not null,
  base_daily_rate numeric not null,
  working_days integer not null,
  present_days integer default 0,
  halfday_count integer default 0,
  leave_count integer default 0,
  ot_hours numeric default 0,
  ot_rate_per_hour numeric default 0,
  early_hours numeric default 0,
  early_deduction_per_hour numeric default 0,
  advance_deducted numeric default 0,
  gross_salary numeric,
  net_salary numeric,
  unique(user_id, month)
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references jobs(id),
  recipient_user_id uuid references users(id),
  channel text check (channel in ('push','whatsapp','email')) not null,
  message text not null,
  sent_at timestamptz,
  status text check (status in ('pending','sent','failed')) default 'pending'
);
```

## Build steps

1. Create a free Supabase project.
2. Run the schema SQL in Supabase SQL Editor.
3. Enable RLS on every table immediately, but do not write policies until Phase 9 unless the user asks.
4. Scaffold Expo:

```bash
npx create-expo-app RepairShopApp --template blank-typescript
```

5. Install dependencies:

```bash
npx expo install @supabase/supabase-js expo-secure-store @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs react-native-screens react-native-safe-area-context
```

6. Create `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=...
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

7. Build `lib/supabase.ts`:
   - Supabase client.
   - Session persistence using `expo-secure-store`.

8. Build `context/AuthContext.tsx` exposing:
   - `user`
   - `role`
   - `signIn()`
   - `signOut()`

9. After sign-in, fetch the current user's row from `users` where `id = auth.uid()` to get their role and active status.

10. Build `navigation/RootNavigator.tsx`:
    - Loading screen while session restores.
    - `AuthStack` if no session.
    - `AdminStack`, `ReceptionistStack`, or `TechnicianStack` based on role.
    - Block inactive users from entering role screens.

11. Build placeholder bottom-tab screens:
    - Receptionist: Dashboard, New Job, Job List, Attendance.
    - Technician: My Jobs, Attendance.
    - Admin: Overview, Jobs, Staff, Inventory, Reports.

## Test gate

Before moving to Phase 2:

- Create a test user in Supabase Auth.
- Manually insert a matching row in `users` using the same UUID as `auth.users.id`.
- Confirm login routes correctly for admin, receptionist, and technician.
- Confirm inactive users cannot enter the app.
- Confirm session persists after closing and reopening the app.

## Guardrails

- `users.id` must equal Supabase `auth.uid()` for that person.
- Never generate a separate internal staff ID.
- Never skip the `job_code_seq` sequence approach.
- Concurrent job creation must not produce duplicate job codes.

---

# Phase 2 — Attendance Module: Selfie + GPS

## When to use

Use this phase when building or modifying attendance for receptionist or technician:

- Selfie check-in/check-out
- GPS capture
- Attendance history
- Leave marking
- Halfday marking

Trigger phrases include:

- “build attendance”
- “add check-in”
- “selfie attendance”
- “GPS attendance”
- “leave marking”
- “view attendance history”

## Goal

Build one reusable `AttendanceScreen` component shared by receptionist and technician roles.

Check-in should:

1. Open the front camera.
2. Capture a selfie.
3. Capture GPS.
4. Upload the selfie to Supabase Storage.
5. Write/upsert a row in `attendance`.

History should show the last 30 days with thumbnails.

Leave and halfday can be marked without a selfie.

## Dependencies

```bash
npx expo install expo-camera expo-location
```

Supabase Storage bucket:

- `attendance-selfies`
- Private bucket

RLS later:

- Users insert/select only their own rows.
- Admin can select all and update status/approval.

## Build steps

### 1. Permissions

Request camera and location permission before opening capture flow.

Use:

- `expo-camera`
- `expo-location`

If permission is denied, show a clear message explaining why permission is needed. Do not silently fail.

### 2. Check-in flow

1. Open front camera using `CameraView` from `expo-camera`.
2. Capture selfie.
3. Get GPS:

```ts
Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High })
```

4. Upload selfie to:

```text
attendance-selfies/{user_id}/{date}-checkin.jpg
```

5. Upsert row:

```ts
{
  user_id,
  date,
  check_in_time,
  selfie_url,
  gps_lat,
  gps_lng,
  status: 'Present'
}
```

### 3. Check-out flow

Use the same pattern, but upload to:

```text
attendance-selfies/{user_id}/{date}-checkout.jpg
```

Update today’s existing attendance row with `check_out_time`.

### 4. History list

Use a `FlatList` showing the last 30 days for the current user, sorted newest first.

Each row must show:

- Date
- Status badge
- Check-in time
- Check-out time
- Selfie thumbnail

Tapping a thumbnail opens a full-size selfie modal.

### 5. Leave / Halfday

Buttons should upsert today’s row with:

```ts
{ status: 'Leave' }
```

or

```ts
{ status: 'Halfday' }
```

No selfie is required for leave or halfday.

## Test gate

Before moving to Phase 3:

- Test on a real physical device.
- Verify uploaded photo appears in Supabase Storage.
- Verify `attendance` row has correct `user_id`, `date`, and non-null GPS values.
- Verify the unique constraint `(user_id, date)` upserts instead of creating duplicates.

## Guardrails

- iOS requires `NSCameraUsageDescription` and `NSLocationWhenInUseUsageDescription` in `app.json` under `expo.ios.infoPlist`.
- Never allow GPS fields to be silently null on check-in/check-out.
- If location fails, show an error and let the user retry.
- Do not fork separate attendance components for receptionist and technician unless a real role-specific requirement exists.

---

# Phase 3 — Receptionist Dashboard

## When to use

Use this phase when building or modifying receptionist-facing screens:

- Customer intake form
- Job creation
- Technician assignment
- Job list/tracking
- Job detail view
- Receipt printing
- Receptionist home dashboard

Trigger phrases include:

- “build intake form”
- “create new job screen”
- “job list for receptionist”
- “assign technician”
- “print receipt”
- “receptionist dashboard”

## Goal

Receptionist can:

- Create a job with full intake details.
- Assign a technician.
- Get an auto-generated job code.
- Print a receipt.
- Browse/search/filter jobs.
- View job details.
- Reassign a technician.
- Trigger a WhatsApp “ready for pickup” message.

## Dependencies

```bash
npx expo install expo-print expo-sharing
```

Also required:

- At least one row in `users` where `role='technician'` and `is_active=true`.
- `generate_job_code()` Postgres function from Phase 1.

## Screens to build, in order

## 1. `NewJobScreen`

Fields:

- Customer name
- Contact number with numeric keyboard
- Customer email, optional
- Device type: `Laptop`, `PC`, `Other`
- Reported issue, multiline
- Remarks, optional multiline
- Job type: `Inhouse`, `Onsite`
- Priority: `Normal`, `High`, `Urgent`
- Assign technician dropdown from active technicians

Technician dropdown query:

```sql
select id, name
from users
where role = 'technician'
and is_active = true;
```

On submit:

1. Validate required fields.
2. Call `generate_job_code()` via Supabase RPC.
3. Insert into `jobs`.
4. Show success modal with the generated job code.
5. Provide a “Print Receipt” button.

Important: job code must be produced by the database function only.

## 2. Print receipt

Use `expo-print` to render and print an HTML receipt.

Receipt must include:

- Company name: RepairShop
- Job code
- Date
- Customer name
- Contact
- Device type
- Issue
- Priority
- Assigned technician
- Thank-you footer

## 3. `JobListScreen`

Must include:

- Status filter tabs:
  - All
  - Received
  - In Progress
  - Waiting for Materials
  - Completed
- Search by customer name or job code.
- Job cards showing:
  - `job_code`
  - Customer name
  - Device type
  - Status badge
  - Priority badge
  - Red border for Urgent jobs
  - Technician name
  - `created_at`
- Pull-to-refresh.
- Tap card to open `JobDetailScreen`.

## 4. `JobDetailScreen`

Must include:

- Customer info
- Job info
- Assigned technician
- Reassign button using a bottom sheet picker over active technicians
- Materials list from `job_materials`
- Running materials total
- Generate Bill button that navigates to Billing Screen from Phase 7
- Send Ready for Pickup button using `wa.me` deep link

WhatsApp ready-for-pickup link:

- Opens WhatsApp with a pre-filled message.
- Does not send automatically.
- UI text must not claim automatic sending.

## 5. `DashboardScreen`

Receptionist home should include summary cards:

- Total Jobs Today
- Jobs In Progress
- Jobs Completed Today
- Urgent Jobs Pending

Each card should be tappable and open `JobListScreen` with the relevant filter pre-applied.

Below the cards, show the 5 most recent jobs.

## Test gate

Before moving to Phase 4:

- Create several jobs.
- Confirm `job_code` values are sequential and unique even when created quickly.
- Reassign a technician and confirm `technician_id` updates.
- Test receipt printing on a real device.
- Confirm search and status filters narrow the job list correctly.

## Guardrails

- Never assemble `job_code` in React Native code.
- Receptionist must never query or display salary, staff rates, or payments.
- WhatsApp link opens only a draft message.

---

# Phase 4 — Technician Dashboard

## When to use

Use this phase when building or modifying technician-facing screens:

- Assigned jobs list
- Job status updates
- Materials/parts logging
- Work notes
- Onsite visit selfie flow
- Arrival/departure GPS

Trigger phrases include:

- “build technician jobs screen”
- “update job status”
- “log materials used”
- “onsite visit selfie”
- “technician dashboard”

## Goal

Technician can:

- See only their own assigned jobs in real time.
- View full job detail.
- Update status.
- Log materials and costs.
- Write work notes.
- Complete before/after selfie flow for onsite jobs.

## Dependencies

- Receptionist dashboard working.
- Supabase Realtime enabled on the `jobs` table.
- `expo-camera` and `expo-location` installed from Phase 2.
- Supabase Storage bucket:
  - `onsite-visits`
  - Private bucket

## Screens to build

## 1. `MyJobsScreen`

Query jobs filtered by:

```sql
technician_id = current_user_id
```

Filter tabs:

- All
- Received
- In Progress
- Waiting
- Completed

Sort cards by:

1. Urgent
2. High
3. Normal
4. Newest first within each priority group

Subscribe to Supabase Realtime on `jobs`, filtered by `technician_id`, so new assignments and status changes appear instantly.

Do not subscribe to the whole jobs table and filter only in JavaScript. That leaks other technicians’ data into client memory.

## 2. `TechJobDetailScreen`

Read-only job info:

- `job_code`
- Customer name
- Tappable contact number
- Device type
- Reported issue
- Remarks
- Job type
- Priority

Status update:

- Show only actions relevant to current status.
- Example: from `Received`, show “Mark In Progress”.
- When moving to `Completed`, set `completed_at = now()`.

Work notes:

- Multiline input.
- “Save Notes” updates `jobs.work_notes`.

Materials used:

- List materials from `job_materials` for this job.
- Delete action per row.
- Add Material bottom sheet:
  - Material name
  - Quantity
  - Unit cost
- Show running total.

Onsite visit, only when `job_type = 'Onsite'`:

1. Take Arrival Selfie.
2. Capture GPS.
3. Upload to:

```text
onsite-visits/{job_id}/arrival.jpg
```

4. Insert `onsite_visits` row with arrival fields.
5. After arrival is logged, show Take Departure Selfie.
6. Upload departure selfie to:

```text
onsite-visits/{job_id}/departure.jpg
```

7. Update same visit row with departure fields and GPS.
8. Show total time on site.

## Test gate

Before moving to Phase 5:

- Update status from technician screen and confirm receptionist list updates in real time.
- Add and delete materials and confirm `job_materials` rows update.
- Test onsite selfie flow on a real device.
- Confirm `completed_at` is set only when status moves to `Completed`.

## Guardrails

- Technician must never view or edit a job where `technician_id != current user id`.
- Enforce this in both query and RLS.
- Technician screens must never show billing, salary, or other technicians’ data.

---

# Phase 5 — Notifications System

## When to use

Use this phase when implementing or modifying:

- Push notifications
- WhatsApp messages
- Email notifications
- Expo push token registration
- Supabase Edge Functions triggered by job events
- Twilio / WATI / Resend integration

Trigger phrases include:

- “send push notification”
- “WhatsApp the customer”
- “notify technician”
- “email invoice”
- “set up notifications”

## Goal

Three channels should work automatically:

1. Push notifications to staff devices.
2. WhatsApp messages to customers.
3. Email where applicable.

Notifications must be triggered by database events, not manual client-side calls scattered across screens.

## Dependencies

```bash
npx expo install expo-notifications
```

External services:

- Twilio WhatsApp Sandbox or WATI account.
- Resend account with verified sending domain.

Supabase Edge Function secrets:

```text
TWILIO_SID
TWILIO_TOKEN
TWILIO_WHATSAPP_FROM
RESEND_API_KEY
```

Existing schema column:

- `users.expo_push_token`

## Build steps

## 1. Push token registration: `hooks/usePushNotifications.ts`

On app launch after auth:

1. Request notification permission.
2. Get Expo push token using `Notifications.getExpoPushTokenAsync()`.
3. Upsert token into `users.expo_push_token` for the current user.
4. Set up foreground notification listener.
5. Call this hook once in the authenticated root of the app.

## 2. Edge Function: `notify-on-job-created`

Triggered on `jobs INSERT`.

Function should:

1. Fetch assigned technician’s Expo push token.
2. Send push via Expo Push API:

```text
https://exp.host/--/api/v2/push/send
```

Push content:

- Title: `New Job Assigned`
- Body: `Job {job_code} — {device_type} — {priority}`

3. Send WhatsApp message to customer confirming job registration with job code.
4. Insert every send attempt into `notifications` with `sent` or `failed` status.

## 3. Edge Function: `notify-on-status-change`

Triggered on `jobs UPDATE` where `status` changed.

Function should:

1. Push to receptionist: `Job {job_code} is now {new_status}`.
2. If new status is `Completed`, WhatsApp the customer that device is ready for pickup.
3. Push to all active admin users.
4. Log all send attempts in `notifications`.

## 4. Webhook setup

Document exact Supabase dashboard steps or a `pg_net`/Postgres trigger approach for free-tier compatibility.

Database Webhooks may require a paid plan, so do not assume they are available on every Supabase project.

## Test gate

Before moving to Phase 6:

- Create a job and confirm technician receives push notification.
- Confirm customer receives WhatsApp registration message.
- Check `notifications` table for `sent`/`failed` rows.
- Update job status and confirm receptionist receives push.
- If Twilio sandbox fails, verify the customer number has joined the sandbox using the required join keyword.

## Guardrails

- Always prefix Indian phone numbers with `+91` before sending to Twilio.
- Strip leading `0` from `customer_contact` if present.
- Use service role key only inside Edge Functions.
- Do not duplicate notification-sending logic inside React Native screens.

---

# Phase 6 — Admin Panel Web App

## When to use

Use this phase when building or modifying React web admin pages:

- Overview dashboard
- Job oversight table
- Staff/user management
- Staff approval
- Inventory management
- Technician performance reports
- Customer history
- Revenue reports

Trigger phrases include:

- “build admin dashboard”
- “admin job table”
- “approve technician”
- “inventory page”
- “performance report”
- “revenue chart”

## Goal

Build a React TypeScript web admin dashboard deployed to Vercel.

Sidebar:

- Overview
- Jobs
- Staff
- Inventory
- Reports
- Salary
- Expenditure
- Settings

Salary and Expenditure pages are built in Phase 8. Do not duplicate them here.

## Dependencies

Either Create React App:

```bash
npx create-react-app admin-panel --template typescript
```

or Next.js if preferred.

Install:

```bash
npm install @supabase/supabase-js recharts
```

Environment variables:

```env
REACT_APP_SUPABASE_URL=...
REACT_APP_SUPABASE_ANON_KEY=...
```

or for Next.js:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

UI rule:

- No UI component library.
- Use plain CSS modules or inline styles unless the user explicitly changes this rule.

## Pages to build

## 1. Overview

Show:

- 2x2 metric cards:
  - Total Jobs Today
  - Jobs Completed This Week
  - Active Technicians
  - Pending Approvals
- 7-day jobs bar chart using Recharts.
- 10 most recent jobs.

## 2. Jobs

Full table columns:

- Job code
- Customer
- Device
- Technician
- Status
- Priority
- Created at

Filters:

- Status
- Technician
- Date range
- Priority

Additional features:

- Search by job code or customer.
- Slide-out detail panel.
- Reassign technician modal.
- CSV export.

## 3. Staff

Table columns:

- Name
- Email
- Phone
- Role
- Active status

Actions:

- Approve sets `is_active = true`.
- Block sets `is_active = false`.
- View Attendance opens a modal showing that user's last 30 attendance days with selfie thumbnails.

## 4. Inventory

Table columns:

- Item name
- Quantity
- Unit
- Low-stock threshold
- Last updated

Features:

- Highlight rows red where `quantity <= low_stock_threshold`.
- Show low-stock count at top.
- Inline quantity edit.
- Add item modal.
- Delete item action with confirmation.

## 5. Reports

Three tabs:

### Technician Performance

Show:

- Jobs completed this month per technician.
- Total parts cost.
- Total labour from billing.
- Bar chart.

### Customer History

Show:

- Search by name or phone.
- All past jobs for that customer.

### Revenue

Show:

- Monthly revenue bar chart from `billing.grand_total`.
- This month’s total revenue.
- Paid amount.
- Unpaid amount.

## Test gate

Before moving to Phase 7:

- Run locally and confirm every page uses real Supabase data, not mock data.
- Approve a pending technician and confirm they can log in on mobile.
- Confirm low-stock highlighting triggers correctly at the threshold boundary.
- Deploy to Vercel and confirm environment variables are set in Vercel settings, not committed.

## Guardrails

- Never use Supabase `service_role` key in the web admin app.
- Destructive actions require confirmation.
- Do not allow silent deletion of jobs or users.
- Deleting inventory items is allowed with confirmation.
- Salary and Expenditure logic belongs in Phase 8.

---

# Phase 7 — Billing & Invoice Generation

## When to use

Use this phase when building or modifying:

- Billing screen
- Invoice generation
- Pulling materials and labour into bill
- Tax/discount calculation
- Printing invoice
- Email invoice
- WhatsApp bill summary

Trigger phrases include:

- “generate bill”
- “create invoice”
- “print invoice”
- “email invoice”
- “billing screen”

## Goal

Receptionist opens a job’s billing screen, sees itemized materials, enters labour/tax/discount, gets a correct grand total, and can save, print, WhatsApp-share, or email the invoice.

## Dependencies

```bash
npx expo install expo-print expo-sharing
```

Already installed if Phase 3 is complete.

Required schema:

- `jobs.customer_email`
- `billing`
- `job_materials`

Required Edge Function secret:

- `RESEND_API_KEY`

## Grand total formula

Do not alter without explicit confirmation.

```text
grand_total = (parts_total + labour_charge) * (1 + tax_percent / 100) - discount
```

Where:

```text
parts_total = SUM(job_materials.total_cost) for the job
```

Sample verification:

```text
parts = 500
labour = 300
tax = 18%
discount = 50
expected = (500 + 300) * 1.18 - 50 = 894
```

## Build steps

## 1. `BillingScreen` in React Native

Receives `job_id` as navigation param.

On load:

1. Fetch job and customer info.
2. Fetch `job_materials` for the job.
3. Fetch existing `billing` row if present.

Display:

- Itemized materials table.
- Parts subtotal.
- Editable labour charge.
- Editable tax percent.
- Editable discount.
- Auto-calculated grand total.
- Is Paid toggle.

Actions:

- Save Bill: upsert `billing`.
- Print Invoice: use `expo-print`.
- Share via WhatsApp: open `wa.me` link with bill summary.
- Email Invoice: call `send-invoice-email` Edge Function.

## 2. Invoice HTML template

Invoice must include:

- Header: RepairShop.
- Invoice number: job code.
- Date.
- Customer name and contact.
- Itemized table:
  - Material
  - Qty
  - Unit Price
  - Total
- Subtotal.
- Labour charge.
- Tax percent and tax amount.
- Discount.
- Grand Total, large and bold.
- Footer with thank-you line and support contact.

Style:

- Clean black-and-white layout.
- Suitable for thermal printing.
- INR formatting.

## 3. Edge Function: `send-invoice-email`

Input:

```json
{ "job_id": "...", "customer_email": "optional override" }
```

Function should:

1. Fetch billing, job, and materials.
2. Build the same invoice HTML.
3. Send through Resend.
4. Return success/failure.

## Test gate

Before moving to Phase 8:

- Manually verify formula with sample above.
- Test print on Android and iOS physical devices.
- Trigger email function from Supabase dashboard test runner and confirm delivery.
- Confirm saved `billing.grand_total` exactly matches what was shown on screen.
- Confirm no rounding drift.

## Guardrails

- Technician role must never access billing screen or `billing` table.
- Money is INR, not USD.
- Keep formula identical in screen preview and Edge Function.
- Round consistently to 2 decimal places.

---

# Phase 8 — Salary & Money Management

## When to use

Use this phase when implementing or modifying:

- Salary calculation
- Advance salary
- Salary slip
- Payroll
- OT pay
- Early leaving deductions
- Daily expenditure tracking
- Staff pay rates

Trigger phrases include:

- “calculate salary”
- “advance salary”
- “salary slip”
- “payroll”
- “OT pay”
- “expenditure tracking”
- “staff_rates”

## Critical first step

Before generating salary calculation code or salary screens, restate the formula below and ask the user to confirm it.

Do not assume the formula is correct. It is only a sensible default until the business owner confirms it.

## Default salary formula, confirm before implementing

```text
present_pay      = present_days * base_daily_rate
halfday_pay      = halfday_count * (base_daily_rate / 2)
leave_pay        = 0
ot_pay           = ot_hours * ot_rate_per_hour
early_deduction  = early_hours * early_deduction_per_hour
gross_salary     = present_pay + halfday_pay + ot_pay - early_deduction
advance_deducted = SUM(payments.amount)
                   WHERE type = 'advance_salary'
                   AND user_id = X
                   AND month = Y
net_salary       = gross_salary - advance_deducted
```

Also confirm whether advance salary deducts only from the same month or can carry forward across months.

## Dependencies

- `staff_rates` table populated per staff member.
- Attendance data for a full month.
- `attendance.ot_hours` and `attendance.early_hours` columns.
- `payments` table.

## Build steps

## 1. Edge Function: `calculate-monthly-salary`

Input:

```json
{ "user_id": "...", "month": "YYYY-MM" }
```

Function should:

1. Fetch all attendance rows for that user/month.
2. Count:
   - Present days
   - Halfday count
   - Leave count
3. Sum:
   - OT hours
   - Early hours
4. Fetch staff rates for the user.
5. Apply confirmed formula.
6. Fetch advance deductions from `payments`.
7. Upsert into `salary` table.
8. Return full breakdown.

## 2. `SalaryScreen`, admin only

Features:

- Select staff.
- Select month.
- Calculate Salary button.
- Call Edge Function.
- Display full breakdown:
  - Present days
  - Halfday count
  - OT hours
  - Gross salary
  - Advance deducted
  - Net salary
- Approve & Print Salary Slip.

Salary slip should include:

- RepairShop header.
- Employee name.
- Role.
- Month.
- Earnings table:
  - Component
  - Days or hours
  - Rate
  - Amount
- Advance deduction line.
- Net salary, large.
- Employee signature line.
- Manager signature line.

## 3. `AdvanceSalaryScreen`, admin only

Form:

- Staff
- Amount
- Description
- Date

Action:

- Insert into `payments` with `type='advance_salary'`.
- Send push notification to staff confirming credited amount.
- Print receipt.

Receipt includes:

- Staff name
- Amount
- Date
- Description
- Manager signature line

## 4. `ExpenditureScreen`, admin only

Form:

- Type:
  - `materials_purchase`
  - `daily_expenditure`
  - `office_development`
- Amount
- Description
- Date

Below form:

- Filterable list of recent payments.
- Group by type.
- Monthly totals.

## Test gate

Before moving to Phase 9:

- Calculate salary for a test employee with known attendance.
- Verify by hand against confirmed formula.
- Confirm advance payments deduct from correct month only, unless a carry-forward policy was confirmed.
- Print salary slip and advance receipt on a real device.
- Business owner must review one full calculation end-to-end before real payroll use.

## Guardrails

- Never change salary formula based on assumption.
- Entire phase is admin-only.
- Receptionist and technician must never query `salary`, `staff_rates`, or `payments`.
- Enforce with RLS.
- Round money values consistently to 2 decimal places.

---

# Phase 9 — Deployment, RLS & Production Readiness

## When to use

Use this final phase when writing:

- Supabase RLS policies
- EAS Build setup
- Admin panel Vercel deployment
- Production checklist
- Store submission preparation

Trigger phrases include:

- “write RLS policies”
- “set up EAS build”
- “deploy to Vercel”
- “prepare for launch”
- “production checklist”

## Goal

Make the system production-ready:

- Every table has correct Row Level Security.
- Mobile apps are configured for EAS Build.
- Admin panel is deployed to Vercel.
- Pre-launch checklist is complete.

## RLS policy requirements

Write policies as explicit `CREATE POLICY` SQL, table by table.

Use helper functions if appropriate, but keep them simple and auditable.

### `users`

- Any authenticated user can select their own row where `id = auth.uid()`.
- Admin can select all rows.
- Admin can update any row.
- A new user can insert their own row on signup.

### `jobs`

- Receptionist can select all jobs.
- Receptionist can insert jobs.
- Receptionist can update any job.
- Technician can select/update only rows where `technician_id = auth.uid()`.
- Admin can select/insert/update/delete all jobs.

### `job_materials`

- Technician can insert/update/delete only materials for jobs where `jobs.technician_id = auth.uid()`.
- Receptionist can select all.
- Admin can select all.

### `attendance`

- Any user can insert/select only their own rows where `user_id = auth.uid()`.
- Admin can select all.
- Admin can update any row for approval/status correction.

### `onsite_visits`

- Technician can insert/update only their own visits where `technician_id = auth.uid()`.
- Admin can select all.

### `billing`

- Receptionist can insert/update.
- Admin can select/update all.
- Technician has no access.

### `inventory`

- Receptionist and admin can select.
- Admin can insert/update/delete.

### `salary`, `staff_rates`, `payments`

- Admin only for every operation.
- No exceptions.

### `notifications`

- Admin can select all.
- Each user can select only rows where `recipient_user_id = auth.uid()`.

## Recommended RLS helper function pattern

Use a security-definer helper to avoid repeating role checks everywhere.

```sql
create or replace function public.current_user_role()
returns text
language sql
security definer
set search_path = public
as $$
  select role
  from public.users
  where id = auth.uid()
  limit 1;
$$;
```

Then policies can use:

```sql
public.current_user_role() = 'admin'
```

or:

```sql
public.current_user_role() in ('admin', 'receptionist')
```

Keep policies readable. Do not hide complex business logic in opaque SQL functions unless required.

## EAS Build configuration

Create `eas.json` with three profiles:

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      },
      "ios": {
        "simulator": false
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

## `app.json` permissions

Configure:

- Camera permissions.
- Location permissions.
- Notification permissions.
- Bluetooth permissions if thermal receipt printer is used.

For iOS:

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSCameraUsageDescription": "This app uses the camera for attendance and onsite visit selfies.",
        "NSLocationWhenInUseUsageDescription": "This app uses location to verify attendance and onsite visit locations.",
        "NSLocationAlwaysUsageDescription": "This app may use location for technician visit verification if enabled."
      }
    }
  }
}
```

Do not request background GPS unless the actual app requires it.

## Vercel deployment

Deploy admin panel:

```bash
cd admin-panel
vercel --prod
```

Set environment variables in Vercel project settings:

```text
REACT_APP_SUPABASE_URL
REACT_APP_SUPABASE_ANON_KEY
```

or:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Never commit environment variables to the repository.

## Pre-launch checklist

Run all checks before real staff use the system:

- Login flow works correctly for admin, receptionist, and technician.
- Inactive users cannot access role screens.
- Job creation works.
- Technician assignment works.
- `job_code` generation works under concurrent use.
- Status updates sync in real time between technician and receptionist screens.
- Push notifications arrive on real devices for job-created and status-changed events.
- WhatsApp messages deliver to a real test customer number.
- Email invoice delivery works via Resend.
- Attendance selfie + GPS capture works on Android and iOS physical devices.
- Onsite arrival/departure selfie flow works with GPS.
- Billing grand total matches manual verification.
- Salary calculation matches manual verification for at least 2 test cases.
- RLS: technician test account cannot see another technician’s jobs.
- RLS: receptionist test account cannot read salary or staff rates.
- RLS: technician test account cannot read billing.
- Inventory low-stock highlighting triggers at correct threshold.
- Receipt and invoice printing work on the actual printer hardware.
- Admin can approve pending user and that user can immediately log in.
- Admin can block user and that user is immediately denied access.
- Advance salary payment correctly reduces salary according to confirmed policy.
- CSV export from admin job table creates a correctly formatted file.
- App works reasonably under intermittent/slow network conditions typical of Barak Valley, Assam.

## Production guardrails

- Do not consider RLS complete until tested by querying as each role.
- Soft-launch with one receptionist and one technician for about a week before rolling out to all staff.
- Monitor Supabase logs, Edge Function logs, notification failures, and auth issues during soft launch.
- Apple App Store review can take 1–3 days.
- Google Play review can take 1–3 days for newer developer accounts.
- Submit with enough lead time before launch.

---

# Agent execution checklist

Before making changes, Antigravity should identify:

1. Which phase the user is asking about.
2. Which role boundaries apply.
3. Which tables are affected.
4. Whether schema changes are needed.
5. Whether RLS changes are needed.
6. Whether Edge Functions are involved.
7. Whether the feature needs real-device testing.
8. Whether any formula or business rule requires confirmation.

For every implementation task:

- Prefer small, testable commits.
- Do not create unrelated files.
- Do not replace the chosen stack without explicit permission.
- Do not introduce paid services where a free-tier-compatible approach exists unless the user asks.
- Keep code TypeScript-first.
- Keep secrets in environment variables.
- Keep database logic server-side when concurrency or security matters.
- Add comments only where they clarify non-obvious business rules.

---

# File placement for Antigravity

Recommended folder structure:

```text
repairshop-master/
  SKILL.md
```

Place this file as `SKILL.md` inside the skill folder. The skill name is defined in the YAML frontmatter at the top.
