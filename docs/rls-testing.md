# RLS Testing Guide

## Overview

This document explains how to test that Row Level Security policies and security triggers work correctly in the RepairShop system. RLS is the **critical security layer** — UI hiding is NOT security.

## Test Accounts

Create these test accounts in Supabase Auth and matching rows in `public.users`:

| Email | Role | is_active | Purpose |
|---|---|---|---|
| admin@repairshop.test | admin | true | Full access |
| receptionist@repairshop.test | receptionist | true | Job management, billing |
| tech1@repairshop.test | technician | true | Sees only assigned jobs |
| tech2@repairshop.test | technician | true | Should NOT see tech1's jobs |
| inactive@repairshop.test | technician | false | Should be blocked entirely |

## Testing Approach

**RLS cannot be tested from the Supabase SQL Editor** because it runs as a privileged role. You must test through the application or using the Supabase JS client authenticated as each user.

### Method 1: Test Through the App (Recommended)

1. Log in to the **mobile app** as each test user.
2. Navigate to different screens and observe what data loads.
3. Verify forbidden data does NOT appear.

### Method 2: Test via Supabase JS Client

Use the `scripts/rls-smoke-test.ts` script or a Node.js script that authenticates as each user:

```ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Sign in as technician 1
const { data: session } = await supabase.auth.signInWithPassword({
  email: 'tech1@repairshop.test',
  password: 'test-password',
});

// Try to read all jobs — should return ONLY tech1's assigned jobs
const { data: jobs, error } = await supabase.from('jobs').select('*');
console.log('Tech1 jobs:', jobs?.length, 'expected: only assigned ones');

// Try to read billing — should return EMPTY or error
const { data: billing } = await supabase.from('billing').select('*');
console.log('Tech1 billing:', billing?.length, 'expected: 0');

// Try to read salary — should return EMPTY
const { data: salary } = await supabase.from('salary').select('*');
console.log('Tech1 salary:', salary?.length, 'expected: 0');
```

## Test Matrix

### Technician SELECT Tests

| Query | Expected Result |
|---|---|
| `SELECT * FROM jobs` | Only jobs where `technician_id = auth.uid()` |
| `SELECT * FROM jobs WHERE technician_id != auth.uid()` | Empty |
| `SELECT * FROM billing` | Empty (denied) |
| `SELECT * FROM salary` | Empty (denied) |
| `SELECT * FROM staff_rates` | Empty (denied) |
| `SELECT * FROM payments` | Empty (denied) |
| `SELECT * FROM attendance` | Only own rows |
| `SELECT * FROM job_materials` | Only for assigned jobs |
| `SELECT * FROM inventory` | Empty (denied) |
| `SELECT * FROM notifications` | Only own notifications |

### Technician WRITE Tests

| Query | Expected Result |
|---|---|
| `INSERT INTO billing (...)` | Denied |
| `INSERT INTO payments (...)` | Denied |
| `INSERT INTO salary (...)` | Denied |
| `INSERT INTO staff_rates (...)` | Denied |
| `INSERT INTO inventory (...)` | Denied |
| `INSERT INTO job_materials (...)` for own job | Allowed |
| `INSERT INTO job_materials (...)` for other tech's job | Denied |
| `UPDATE jobs SET technician_id = ...` on own job | Silently reverted by trigger |
| `UPDATE jobs SET priority = ...` on own job | Silently reverted by trigger |
| `UPDATE jobs SET status = 'Completed'` on own job | Allowed |
| `UPDATE jobs SET work_notes = '...'` on own job | Allowed |

### Technician Storage Tests

| Action | Expected Result |
|---|---|
| Upload to `onsite-visits/{own_job_id}/...` | Allowed |
| Upload to `onsite-visits/{other_tech_job_id}/...` | Denied |
| Read from `onsite-visits/{own_job_id}/...` | Allowed |
| Read from `onsite-visits/{other_tech_job_id}/...` | Denied |
| Upload to `attendance-selfies/{own_uid}/...` | Allowed |
| Read from `attendance-selfies/{other_uid}/...` | Denied |

### Receptionist Tests

| Query | Expected Result |
|---|---|
| `SELECT * FROM jobs` | All jobs |
| `INSERT INTO jobs (...)` | Allowed |
| `UPDATE jobs SET ...` | Allowed |
| `SELECT * FROM billing` | All billing records |
| `INSERT INTO billing (...)` | Allowed |
| `UPDATE billing SET ...` | Allowed |
| `SELECT * FROM salary` | Empty (denied) |
| `SELECT * FROM staff_rates` | Empty (denied) |
| `SELECT * FROM payments` | Empty (denied) |
| `INSERT INTO salary (...)` | Denied |
| `INSERT INTO staff_rates (...)` | Denied |
| `INSERT INTO payments (...)` | Denied |
| `SELECT * FROM attendance` | Only own rows |
| `SELECT * FROM inventory` | All items (read-only) |
| `INSERT INTO inventory (...)` | Denied |
| `UPDATE inventory SET ...` | Denied |

### Receptionist Self-Escalation Tests

| Action | Expected Result |
|---|---|
| `UPDATE users SET role = 'admin' WHERE id = auth.uid()` | Silently reverted by trigger |
| `UPDATE users SET is_active = true WHERE id = auth.uid()` | Silently reverted by trigger |
| `UPDATE users SET expo_push_token = '...' WHERE id = auth.uid()` | Allowed |

### Admin Tests

| Query | Expected Result |
|---|---|
| `SELECT * FROM jobs` | All jobs |
| `SELECT * FROM billing` | All billing |
| `SELECT * FROM salary` | All salary records |
| `SELECT * FROM staff_rates` | All staff rates |
| `SELECT * FROM payments` | All payments |
| `SELECT * FROM attendance` | All attendance |
| `SELECT * FROM users` | All users |
| `UPDATE users SET is_active = ...` | Allowed |
| `UPDATE users SET role = ...` | Allowed |
| `DELETE FROM jobs WHERE ...` | Allowed |

### Inactive User Tests

| Action | Expected Result |
|---|---|
| Login and fetch profile | Profile loads but `is_active = false` |
| App navigation | Blocked at InactiveUserScreen |
| `SELECT * FROM jobs` | Empty (helper functions check is_active) |

## Cross-Technician Isolation Test

1. Assign Job A to tech1 and Job B to tech2.
2. Log in as tech1 → verify Job B is NOT visible.
3. Log in as tech2 → verify Job A is NOT visible.
4. Log in as tech1 → try to insert material for Job B → should be denied.
5. Log in as tech1 → try to update Job B status → should be denied (no row access).
6. Log in as receptionist → both jobs visible.
7. Log in as admin → both jobs visible.

## Storage Tests

1. Log in as tech1 → upload attendance selfie → verify stored under `attendance-selfies/{tech1_uid}/`.
2. Log in as tech2 → try to read tech1's selfie URL → should be denied.
3. Log in as tech1 → upload onsite photo for assigned job → should work.
4. Log in as tech2 → try to read tech1's onsite photos → should be denied.
5. Log in as admin → can read all selfies and onsite photos from all users.

## Edge Function Auth Tests

1. Log in as **technician** → call `calculate-monthly-salary` → should return "Access denied".
2. Log in as **receptionist** → call `calculate-monthly-salary` → should return "Access denied".
3. Log in as **admin** → call `calculate-monthly-salary` → should succeed.
4. Log in as **technician** → call `send-invoice-email` → should return "Access denied".
5. Log in as **receptionist** → call `send-invoice-email` → should succeed.
6. Log in as **admin** → call `send-invoice-email` → should succeed.

## Security Trigger Tests

### User Self-Escalation Prevention

1. Log in as receptionist.
2. Run: `supabase.from('users').update({ role: 'admin' }).eq('id', myId)`.
3. Verify: role should still be 'receptionist' (trigger reverted).
4. Run: `supabase.from('users').update({ expo_push_token: 'test' }).eq('id', myId)`.
5. Verify: push token updated successfully.

### Technician Job Field Restriction

1. Log in as tech1 with an assigned job.
2. Run: `supabase.from('jobs').update({ technician_id: otherTechId }).eq('id', jobId)`.
3. Verify: technician_id unchanged (trigger reverted).
4. Run: `supabase.from('jobs').update({ status: 'In Progress' }).eq('id', jobId)`.
5. Verify: status updated successfully.
6. Run: `supabase.from('jobs').update({ priority: 'Urgent' }).eq('id', jobId)`.
7. Verify: priority unchanged (trigger reverted).
