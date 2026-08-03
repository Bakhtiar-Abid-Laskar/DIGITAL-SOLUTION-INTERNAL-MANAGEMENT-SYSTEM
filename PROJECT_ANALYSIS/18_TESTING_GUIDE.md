# RepairShop — Testing Guide

## Overview

RepairShop currently has **no automated tests**. This guide documents:
1. The manual testing checklist used for validation
2. Recommended automated tests to implement
3. How to test RLS policies
4. Edge Function testing procedures

---

## Part 1: Manual Testing Checklist

### Authentication & Role Routing

| Test | Steps | Expected Result |
|---|---|---|
| Admin login | Login with admin email | Redirected to AdminTabs/admin panel dashboard |
| Receptionist login | Login with receptionist email | Redirected to ReceptionistTabs |
| Technician login | Login with technician email | Redirected to TechnicianTabs |
| Invalid credentials | Enter wrong password | Toast/error message shown |
| Inactive user | Login with `is_active = false` user | InactiveUserScreen shown |
| Session persistence | Close and reopen app | User stays logged in |
| Logout | Tap Sign Out | Redirected to login, session cleared |
| Admin role guard (salary page) | Login as receptionist, visit /salary | Access Denied shown |

---

### Job Creation Flow (Receptionist)

| Test | Steps | Expected Result |
|---|---|---|
| Required field validation | Submit form with empty Customer Name | Error shown, no DB insert |
| Required field validation | Submit form with empty Contact | Error shown |
| Required field validation | Submit form with empty Device Type | Error shown |
| Successful job creation | Fill all fields, submit | Job created with RS-YYYY-NNNN code |
| Job code format | Create a job | Code matches format RS-2026-0001 |
| Concurrent job creation | Create two jobs simultaneously (2 devices) | Both get unique codes |
| With technician | Select technician before creating | Job created with `technician_id` set |
| Without technician | Don't select technician | Job created with `technician_id = null` |
| Print receipt | After job creation, tap Print | Print dialog opens with formatted receipt |
| Print receipt content | Review printed receipt | Contains: job code, customer name, device, date |
| Navigate to job detail | After creation, tap "View Job" | JobDetail opens with correct job |

---

### Attendance Flow (Receptionist & Technician)

| Test | Steps | Expected Result |
|---|---|---|
| Camera permission denied | Deny camera permission, attempt check-in | Error shown, process aborted |
| Location permission denied | Deny location permission, attempt check-in | Error shown, GPS not submitted |
| Successful check-in | Grant permissions, capture selfie | Check-in recorded with time + GPS |
| GPS required | Check-in without GPS signal | Error shown (GPS is mandatory) |
| Duplicate check-in | Attempt to check in twice same day | Second attempt updates existing record (UPSERT) |
| Check-out after check-in | Check out after checking in | Check-out time recorded |
| History display | View attendance history | Last 30 days shown |
| Selfie stored | Check-in with selfie | Selfie visible in history (signed URL loads) |
| OT hours | Set `ot_hours > 0` in DB | OT hours included in salary calculation |

---

### Technician Work Flow

| Test | Steps | Expected Result |
|---|---|---|
| Job list filtered | Login as technician | Only assigned jobs visible |
| Can't see others' jobs | Technician B's jobs | Not visible to Technician A |
| Add material | Open job, tap Add Material | Material added to `job_materials` |
| Material total | Add 2 materials | Total cost = sum of both |
| Delete material | Delete a material | Confirmation prompt, then removed |
| Save work notes | Type and save notes | Notes saved to `jobs.work_notes` |
| Update status | Change to "In Progress" | Status updated, push sent to staff |
| Mark completed | Change to "Completed" | `completed_at` set, push sent to staff |
| Locked when completed | Open completed job | All inputs disabled |
| Realtime sync | Admin changes job in web panel | Technician sees update without refresh |

---

### Billing Flow (Receptionist)

| Test | Steps | Expected Result |
|---|---|---|
| Parts total | Job with materials | Parts total = sum of job_materials |
| Grand total formula | Enter: parts=500, labour=300, tax=18, discount=50 | Grand total = 894 |
| Save invoice | Fill form and save | Billing record created in DB |
| Upsert invoice | Save again with different values | Billing record updated (not duplicated) |
| Mark as paid | Tap "Mark as Paid" | is_paid = true, badge changes |
| Print invoice | Tap Print | Print dialog opens with formatted invoice |
| Email invoice | Tap Email | Edge function called, email delivered |
| WhatsApp | Tap WhatsApp Ready | WhatsApp app opens with pre-filled message |
| Customer sees email | After email sent | Customer receives email at their address |

---

### Admin Panel Tests

| Test | Steps | Expected Result |
|---|---|---|
| Overview dashboard | Open admin panel | All KPI cards load with counts |
| Realtime on overview | Create job on mobile | Overview KPIs update automatically |
| Jobs list | Navigate to /jobs | All jobs listed with pagination |
| Status filter | Click "In Progress" tab | Only in-progress jobs shown |
| Search | Type job code in search | Matching job appears |
| Pagination | More than 20 jobs | Page navigation works |
| Job detail | Click a job | Full job detail loads |
| Edit job | Click Edit, change status, Save | Job updated in DB |
| Add material (admin) | Open materials tab, add | Material added |
| Delete material | Click delete, confirm | Material removed |
| Approve staff | Pending user, click Approve | User's `is_active = true` |
| Block staff | Active user, click Block | User's `is_active = false`, login fails |
| View attendance | Click calendar icon on staff | Attendance modal opens |
| Salary calculation | Select staff + month + calculate | Breakdown displays correctly |
| Salary slip print | Click Print Salary Slip | Browser print dialog opens |
| Inventory add | Click Add Item | New inventory item created |
| Inventory low stock | Set quantity below threshold | "Low Stock" badge shown |
| Reports - tech performance | Navigate to Reports | Bar chart loads |
| Reports - customer search | Search by name | Customer's jobs shown |
| Export CSV | Click Export on jobs page | CSV file downloaded |

---

### Push Notification Tests (Real Device Required)

| Test | Setup | Expected Result |
|---|---|---|
| Token registration | Login on real device | `expo_push_token` updated in DB |
| Job creation notification | Create job with technician assigned | Technician receives push |
| Notification content | Check notification | Title and body are correct |
| Status change notification | Update job status | Receptionist + admin receive push |
| WhatsApp creation notification | Create job (Twilio configured) | Customer WhatsApp message sent |
| WhatsApp completion notification | Mark job completed | Customer "ready for pickup" WhatsApp |
| Email notification | Mark job completed (email set) | Customer email delivered |

---

### Onsite Visit Tests (Real Device Required)

| Test | Steps | Expected Result |
|---|---|---|
| Arrival capture | Tap "I've Arrived", capture selfie | Visit created with arrival_at |
| GPS required | Block location permission | Error shown, arrival not recorded |
| Departure capture | Tap "Mark Departure" | Visit updated with departed_at |
| Visit history | View job with onsite visits | Visit record visible |

---

## Part 2: RLS Policy Testing

Test each policy using separate accounts:

### Setup: Required Accounts
- `admin@test.com` — admin role, is_active = true
- `receptionist@test.com` — receptionist role, is_active = true
- `technician_a@test.com` — technician role, is_active = true
- `technician_b@test.com` — technician role, is_active = true
- Create one job assigned to `technician_a`

### Test Queries (Run in Supabase SQL Editor or via client)

**Test: Technician A cannot see Technician B's jobs**
```sql
-- Run as technician_b's session
SET request.jwt.claims = '{"sub":"<technician_b_id>"}';
SELECT * FROM jobs WHERE technician_id = '<technician_a_id>';
-- Expected: 0 rows (RLS blocks)
```

**Test: Receptionist cannot see salary table**
```sql
-- Run as receptionist's session
SET request.jwt.claims = '{"sub":"<receptionist_id>"}';
SELECT * FROM salary;
-- Expected: 0 rows or permission denied error
```

**Test: Technician cannot access billing**
```sql
-- Run as technician's session
SET request.jwt.claims = '{"sub":"<technician_a_id>"}';
SELECT * FROM billing;
-- Expected: 0 rows or permission denied error
```

**Test: Admin sees all jobs**
```sql
-- Run as admin's session
SET request.jwt.claims = '{"sub":"<admin_id>"}';
SELECT COUNT(*) FROM jobs;
-- Expected: total count of all jobs
```

**Test: Technician cannot insert a job**
```sql
-- Run as technician's session
INSERT INTO jobs (job_code, customer_name, customer_contact, device_type, reported_issue)
VALUES ('RS-TEST-001', 'Test', '9999999999', 'Laptop', 'Test issue');
-- Expected: Permission denied error
```

---

## Part 3: Unit Tests to Implement

### `billing.test.ts`
```typescript
import { calculateGrandTotal, calculatePartsTotal, roundMoney } from '../utils/billing'

describe('calculateGrandTotal', () => {
  test('standard calculation', () => {
    // parts=500, labour=300, tax=18%, discount=50
    expect(calculateGrandTotal(500, 300, 18, 50)).toBe(894)
  })
  
  test('zero tax', () => {
    expect(calculateGrandTotal(500, 300, 0, 0)).toBe(800)
  })
  
  test('zero discount', () => {
    expect(calculateGrandTotal(500, 300, 18, 0)).toBe(944)
  })
  
  test('zero everything', () => {
    expect(calculateGrandTotal(0, 0, 0, 0)).toBe(0)
  })
  
  test('rounding precision', () => {
    // Ensure floating point is handled correctly
    expect(calculateGrandTotal(333, 333, 18, 33)).toBeCloseTo(751.48, 2)
  })
})

describe('calculatePartsTotal', () => {
  test('sums total_cost of materials', () => {
    const materials = [
      { total_cost: 500 },
      { total_cost: 300 },
      { total_cost: 200 },
    ]
    expect(calculatePartsTotal(materials)).toBe(1000)
  })
  
  test('empty materials', () => {
    expect(calculatePartsTotal([])).toBe(0)
  })
})
```

### `phone.test.ts`
```typescript
import { formatIndianPhoneForWhatsApp, createWhatsAppUrl } from '../utils/phone'

describe('formatIndianPhoneForWhatsApp', () => {
  test('10-digit number', () => {
    expect(formatIndianPhoneForWhatsApp('9876543210')).toBe('+919876543210')
  })
  
  test('number with leading 0', () => {
    expect(formatIndianPhoneForWhatsApp('09876543210')).toBe('+919876543210')
  })
  
  test('number with 91 prefix', () => {
    expect(formatIndianPhoneForWhatsApp('919876543210')).toBe('+919876543210')
  })
  
  test('number with +91 prefix', () => {
    expect(formatIndianPhoneForWhatsApp('+919876543210')).toBe('+919876543210')
  })
  
  test('number with spaces and dashes', () => {
    expect(formatIndianPhoneForWhatsApp('9876 543-210')).toBe('+919876543210')
  })
})
```

### `salary.test.ts`
```typescript
describe('salary calculation', () => {
  const rates = {
    base_daily_rate: 500,      // ₹500/day
    ot_rate_per_hour: 100,     // ₹100/hr OT
    early_deduction_per_hour: 50  // ₹50/hr early deduction
  }
  
  test('full month, no OT or early', () => {
    const attendance = { present_days: 26, halfday_count: 0, ot_hours: 0, early_hours: 0 }
    const advance = 0
    // present_pay = 26 × 500 = 13000
    // gross = 13000, advance = 0, net = 13000
    expect(calculateNetSalary(attendance, rates, advance)).toBe(13000)
  })
  
  test('with overtime', () => {
    const attendance = { present_days: 26, halfday_count: 0, ot_hours: 5, early_hours: 0 }
    const advance = 0
    // present_pay = 13000, ot_pay = 500, gross = 13500, net = 13500
    expect(calculateNetSalary(attendance, rates, advance)).toBe(13500)
  })
  
  test('with advance deduction', () => {
    const attendance = { present_days: 26, halfday_count: 0, ot_hours: 0, early_hours: 0 }
    const advance = 2000
    // gross = 13000, advance = 2000, net = 11000
    expect(calculateNetSalary(attendance, rates, advance)).toBe(11000)
  })
})
```

---

## Part 4: Edge Function Testing

### Local Testing with Supabase CLI
```bash
# Start local Supabase
supabase start

# Serve functions locally
supabase functions serve --no-verify-jwt
```

### Test `notify-on-job-created`
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/notify-on-job-created' \
  --header 'Authorization: Bearer <local-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "INSERT",
    "table": "jobs",
    "record": {
      "id": "test-uuid-1234",
      "job_code": "RS-2026-TEST",
      "customer_name": "John Test",
      "customer_contact": "9876543210",
      "device_type": "Laptop",
      "priority": "Normal",
      "technician_id": "<a-real-technician-uuid>"
    },
    "old_record": null
  }'

# Expected response:
# {"success":true,"message":"Job created notifications processed"}
```

### Test `notify-on-status-change`
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/notify-on-status-change' \
  --header 'Authorization: Bearer <local-anon-key>' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "UPDATE",
    "table": "jobs",
    "record": {
      "id": "test-uuid-1234",
      "job_code": "RS-2026-TEST",
      "status": "Completed",
      "customer_name": "John Test",
      "customer_contact": "9876543210",
      "device_type": "Laptop"
    },
    "old_record": {
      "status": "In Progress"
    }
  }'
```

### Test `send-invoice-email`
```bash
curl -i --location --request POST 'http://localhost:54321/functions/v1/send-invoice-email' \
  --header 'Authorization: Bearer <user-session-token>' \
  --header 'Content-Type: application/json' \
  --data '{
    "type": "MANUAL",
    "jobId": "<a-real-job-uuid-with-customer-email>"
  }'
```

---

## Part 5: Testing Setup Recommendations

### Install Jest for Admin Panel
```bash
cd admin-panel
npm install --save-dev jest @testing-library/react @testing-library/jest-dom ts-jest
```

### Install Jest for Mobile
```bash
cd RepairShopApp
npm install --save-dev jest jest-expo @testing-library/react-native
```

### Run Tests
```bash
# Admin panel
cd admin-panel && npm test

# Mobile
cd RepairShopApp && npm test
```

### Configure Jest (Admin Panel `jest.config.ts`)
```typescript
export default {
  testEnvironment: 'jsdom',
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
}
```

---

## Part 6: Pre-Deployment Testing Matrix

Run these tests before EVERY production deployment:

| # | Test | Critical | Platform |
|---|---|---|---|
| 1 | Admin login → dashboard loads | ✅ | Web |
| 2 | Receptionist creates a job with RS-XXXX code | ✅ | Mobile |
| 3 | Technician sees assigned job | ✅ | Mobile |
| 4 | Technician updates status | ✅ | Mobile |
| 5 | Push notification received by receptionist | ✅ | Mobile |
| 6 | Billing grand total matches formula (₹894 test case) | ✅ | Mobile + Web |
| 7 | Attendance check-in with selfie + GPS | ✅ | Mobile |
| 8 | Admin approves pending staff | ✅ | Web |
| 9 | Invoice PDF print renders correctly | ✅ | Mobile + Web |
| 10 | Salary calculation matches manual calculation | ✅ | Web |
| 11 | Inactive user cannot access app | ✅ | Mobile |
| 12 | Technician cannot see other technician's jobs | ✅ | Mobile |
