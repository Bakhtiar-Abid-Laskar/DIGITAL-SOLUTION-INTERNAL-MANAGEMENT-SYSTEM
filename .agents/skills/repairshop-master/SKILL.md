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

```
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

```
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

### 1. `NewJobScreen`

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

### 2. Print receipt

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

### 3. `JobListScreen`

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

### 4. `JobDetailScreen`

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

### 5. `DashboardScreen`

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

### 1. `MyJobsScreen`

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

### 2. `TechJobDetailScreen`

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

---

(End of SKILL.md excerpt)
