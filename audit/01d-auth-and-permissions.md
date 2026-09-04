# Phase 1.7: Authentication & Permissions Architecture

This document maps the security boundaries, authorization flows, and Row Level Security (RLS) policies governing the RepairShop platform.

---

## 1. Authentication Lifecycle

1. **Sign-In:**
   - User submits email and password via `supabase.auth.signInWithPassword()`.
   - Supabase Auth returns a JWT token containing `sub` (`auth.uid()`) and role claims.
2. **Profile & Role Resolution:**
   - Client context (`AuthContext.tsx`) immediately queries `public.users` where `id = auth.uid()`.
   - Reads `role` (`admin`, `receptionist`, `technician`) and `is_active` (`boolean`).
   - If `is_active === false`, the client immediately routes to `InactiveUserScreen` and denies all operational access.
3. **Session Persistence & Timeout:**
   - Mobile: Session stored in `expo-secure-store`.
   - Web: Session stored in `localStorage` with automated 30-minute idle activity timeout.
4. **Push Notification Linkage:**
   - On active session establishment, mobile app retrieves Expo Push Token via `expo-notifications` and calls `update_my_push_token(token)` RPC to register with `public.users.expo_push_token`.

---

## 2. Role Boundaries & Authorization Matrix

| Domain / Resource | Admin | Receptionist | Technician | Unauthenticated / Public |
|---|---|---|---|---|
| **System Overview & KPI Charts** | Full Access | No Access (except daily intake counters) | Assigned metrics only | No Access |
| **Repair Jobs (`jobs`)** | Full CRUD | Full CRUD (Intake, Assign, Bill) | Read & Update Assigned Only | No Access |
| **Multi-Tech Assignment (`job_technicians`)** | Full CRUD | Full CRUD | Read Own Assignments | No Access |
| **Service Catalog (`job_types`, `sale_types`)** | Full CRUD | Read-only (`is_active = true`) | Read-only (`is_active = true`) | No Access |
| **Job Materials (`job_materials`)** | Full CRUD | Full CRUD | CRUD for Assigned Jobs | No Access |
| **Onsite Verification (`onsite_visits`)** | Full CRUD | Full CRUD | CRUD for Assigned Jobs | No Access |
| **Inventory & Stock Restocking** | Full CRUD | Read Stock, Auto-deduct | Read Stock, Auto-deduct | No Access |
| **POS Sales & Counter Invoicing** | Full CRUD | Full CRUD (POS Intake) | No Access | No Access |
| **Staff Directory & Activation (`users`)** | Full CRUD, Create/Block | Read Technicians/Staff | Read Own Profile | No Access |
| **Staff Rates & Salary Structure** | **Admin Only** | **No Access** (Blocked by RLS) | **No Access** (Blocked by RLS) | No Access |
| **Monthly Payroll Calculation (`salary`)** | **Admin Only** | **No Access** (Blocked by RLS) | Read Own Salary Record | No Access |
| **Expenditure & Cash Outflow (`payments`)** | **Admin Only** | **No Access** (Blocked by RLS) | **No Access** (Blocked by RLS) | No Access |
| **Staff Incentives Ledger** | Full CRUD | Read Own Accrued | Read Own Accrued | No Access |
| **Attendance Verification & Selfies** | Full CRUD, Review | Insert/Read Own Record | Insert/Read Own Record | No Access |
| **Leave Management (`employee_leave`)** | Full Approval | Insert/Read Own Requests | Insert/Read Own Requests | No Access |
| **Geofence Workshop Coordinates** | Full Edit | Read-only | Read-only | No Access |
| **Google Drive Backups (`export_jobs`)** | Full Access | No Access | No Access | No Access |

---

## 3. Database RLS Implementation Pattern

All policies strictly enforce non-recursive role checking using `SECURITY DEFINER` helpers:

```sql
-- Role predicates run once per statement using scalar subselects:
create policy "jobs_select_staff" on public.jobs for select to authenticated
using (
  (select public.is_admin())
  or (select public.is_receptionist())
  or ((select public.is_technician()) and technician_id = (select auth.uid()))
);
```

### Security Definer Helpers
- `public.is_admin()`: Verifies `role = 'admin'` and `is_active = true`.
- `public.is_receptionist()`: Verifies `role = 'receptionist'` and `is_active = true`.
- `public.is_technician()`: Verifies `role = 'technician'` and `is_active = true`.
- `public.is_staff()`: Verifies any active user row exists for `auth.uid()`.
- **Search Path:** Fixed to `set search_path = public, pg_temp` to prevent search path mutation vulnerabilities.

---

## 4. Storage Bucket Access Rules

1. `attendance-selfies`: Uploads require matching authenticated `user_id`; downloads permitted for the file owner and admins.
2. `onsite-visits`: Uploads require authenticated technician assigned to the job; downloads permitted for staff.
3. `invoices`: Uploads and downloads permitted for receptionist and admin roles.
4. `profile-pictures`: Write access restricted to the user's personal UUID folder (`(storage.foldername(name))[1] = auth.uid()::text`).
5. `avatars`: Direct image view via public CDN URL; folder directory listing restricted to authenticated users.
