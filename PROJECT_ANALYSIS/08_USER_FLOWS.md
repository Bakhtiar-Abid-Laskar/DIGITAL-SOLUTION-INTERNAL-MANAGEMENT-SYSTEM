# RepairShop — User Flows and Data Flows

## Overview

This document maps every major user interaction from the user's perspective through to the database.

---

## Flow 1: Staff Login

### Actors: Receptionist, Technician, Admin (Mobile)

```
User opens RepairShop app
    │
    ▼
LoadingScreen shown while AuthContext initializes
    │
    ▼
supabase.auth.getSession()
    │
    ├─ No session → LoginScreen
    │     │
    │     ▼
    │   User selects role card (visual only)
    │   User enters email + password
    │   Taps "Sign In"
    │     │
    │     ▼
    │   supabase.auth.signInWithPassword({ email, password })
    │     │
    │     ├─ Error → showToast('Invalid credentials', 'error')
    │     │
    │     └─ Success → onAuthStateChange fires
    │           │
    │           ▼
    │         fetchUserRow(session.user.id)
    │         SELECT * FROM users WHERE id = uid
    │           │
    │           ├─ is_active = false → InactiveUserScreen
    │           │
    │           └─ is_active = true
    │                 ├─ role = 'admin' → AdminTabs
    │                 ├─ role = 'receptionist' → ReceptionistTabs
    │                 └─ role = 'technician' → TechnicianTabs
    │
    └─ Session found → same fetchUserRow flow above (auto-login)
```

**DB Queries:** `auth.signInWithPassword`, `SELECT FROM users`

---

## Flow 2: Create New Job (Receptionist — 2-Step)

### Actor: Receptionist (Mobile)

```
Receptionist taps "New Job" on DashboardScreen
    │
    ▼
STEP 1: CustomerIntakeScreen
    │
    ├─ Form fields:
    │   Customer Name*, Contact*, Email?, Device Type*,
    │   Reported Issue*, Remarks?, Job Type (Inhouse/Onsite), Priority
    │
    ├─ Validation: required fields checked on submit
    │
    └─ Taps "Next" → navigation.navigate('Job Assignment', { formState })
    
    ▼
STEP 2: JobAssignmentScreen
    │
    ├─ Shows job summary (read-only review of form data)
    │
    ├─ [Optional] Tap "Select Technician"
    │   → TechnicianPicker modal opens
    │   → SELECT * FROM users WHERE role='technician' AND is_active=true
    │   → User selects technician → technicianId + techName set
    │
    └─ Taps "Create Job"
          │
          ▼
        Loading state shown
        supabase.rpc('generate_job_code')
        → PostgreSQL: SELECT 'RS-' || YEAR || '-' || nextval('job_code_seq')
        → Returns 'RS-2026-0001'
          │
          ▼
        supabase.from('jobs').insert({
          job_code, customer_name, customer_contact, customer_email,
          device_type, reported_issue, remarks, job_type, priority,
          status: 'Received', receptionist_id, technician_id
        }).select().single()
          │
          ├─ Error → showToast with error message
          │
          └─ Success → createdJob set → Success Modal shown
                │
                ├─ "Print Receipt" → generateDocumentHtml('receipt', job, [])
                │                 → Print.printAsync({ html })
                │                 → System print dialog
                │
                ├─ "View Job Details" → navigate to JobDetail
                │
                └─ "Create Another" → navigate back to CustomerIntake
```

**Supabase Webhook fires:** `notify-on-job-created`
- If technician assigned → Push notification to technician
- If Twilio configured → WhatsApp to customer: "We received your device"

**DB Queries:** `rpc('generate_job_code')`, `INSERT INTO jobs`, `SELECT FROM users`

---

## Flow 3: Attendance Check-In (Receptionist / Technician)

### Actors: Receptionist, Technician

```
User navigates to Attendance tab
    │
    ▼
AttendanceScreen mounts
    │
    ├─ SELECT * FROM attendance WHERE user_id = uid AND date = today
    │   → Shows today's status (check-in time if already done)
    │
    └─ SELECT * FROM attendance WHERE user_id = uid AND date >= 30 days ago
       → Shows history list

User taps "Check In"
    │
    ▼
Permission Check: Camera
    │
    ├─ Not granted → request permission
    │   ├─ Denied → show error toast, abort
    │   └─ Granted → continue
    │
    ▼
Permission Check: Location
    │
    ├─ Not granted → request permission
    │   ├─ Denied → show error toast, abort (MANDATORY — never submits without GPS)
    │   └─ Granted → continue
    │
    ▼
SelfieCapture component opens (full-screen camera)
    │
    ├─ User sees front camera preview
    ├─ Taps capture button
    └─ Photo captured as URI
    
    ▼
compressImage(uri)
→ expo-image-manipulator: resize to 1280px max, 70% JPEG quality
→ Returns compressed URI

    ▼
expo-location.getCurrentPositionAsync({ accuracy: HIGH })
→ Returns { latitude, longitude, accuracy }

    ▼
Upload to Supabase Storage
supabase.storage.from('attendance-selfies')
  .upload(getAttendanceStoragePath(userId, date, 'checkin'), imageBlob)

    ▼
supabase.from('attendance').upsert({
  user_id, date: today,
  check_in_time: NOW(),
  check_in_selfie_url: storagePath,
  check_in_gps: { latitude, longitude, accuracy }
}, { onConflict: 'user_id,date' })

    ▼
Success → refresh today's record + history list
```

**Check-Out Flow:** Same flow, updates `check_out_time`, `check_out_selfie_url`, `check_out_gps`

**DB Queries:** 2× `SELECT FROM attendance`, `Storage.upload`, `UPSERT INTO attendance`

---

## Flow 4: Technician Updates Job

### Actor: Technician

```
Technician navigates to My Jobs tab
    │
    ▼
MyJobsScreen
    │
    ├─ SELECT * FROM jobs WHERE technician_id = uid ORDER BY created_at DESC
    ├─ Realtime subscription: jobs channel filtered by technician_id
    └─ Job cards displayed (only assigned jobs visible)
    
User taps a job
    │
    ▼
UpdateWorkScreen loads
    │
    ├─ SELECT * FROM jobs WHERE id = jobId AND technician_id = uid (security filter)
    ├─ SELECT * FROM job_materials WHERE job_id = jobId
    ├─ Realtime: subscribes to job + job_materials changes for this jobId
    └─ Shows: JobDetailShell header + Materials section + Notes + Status

[Add Material]
    │
    ├─ Tap "+ Add Item" → AddMaterialModal opens
    ├─ Enter: material name, quantity, unit cost
    ├─ Tap "Add"
    ├─ INSERT INTO job_materials { job_id, material_name, quantity, unit_cost, total_cost }
    └─ onAdded() → fetchJobData() called → list refreshes

[Delete Material]
    │
    ├─ Tap delete icon on material
    ├─ Confirmation bottom sheet shown
    ├─ Tap "Delete"
    ├─ DELETE FROM job_materials WHERE id = materialId
    └─ fetchJobData() called → list refreshes

[Update Status]
    │
    ├─ Tap status dropdown → BottomSheet opens
    ├─ Options: "In Progress" | "Waiting for Materials" | "Completed"
    └─ Taps desired status → selectedStatus set

[Update & Notify]
    │
    ├─ Taps "Update & Notify" button
    ├─ UPDATE jobs SET {
    │    work_notes, status, completed_at (if Completed)
    │  } WHERE id = jobId AND technician_id = uid
    │
    └─ Success → showToast('Job updated successfully') + fetchJobData()
```

**Supabase Webhook fires:** `notify-on-status-change`
- Sends push to all receptionists + admins: "Job RS-XXXX is now {status}"
- If status = 'Completed' + Twilio → WhatsApp to customer: "Your device is ready"

**DB Queries:** `SELECT jobs`, `SELECT job_materials`, `INSERT job_materials`, `DELETE job_materials`, `UPDATE jobs`

---

## Flow 5: Generate Invoice (Receptionist)

### Actor: Receptionist

```
Receptionist opens a job's detail
    │
    ▼
Taps "Bill" or "Billing" button
    │
    ▼
BillingScreen loads
    │
    ├─ SELECT * FROM jobs WHERE id = jobId
    ├─ SELECT * FROM job_materials WHERE job_id = jobId
    └─ SELECT * FROM billing WHERE job_id = jobId (may return null if not billed yet)

User reviews materials (read-only)
User enters:
    ├─ Labour Charge (₹) — numeric input
    ├─ Tax Percent (%) — default 18%
    └─ Discount (₹)

Formula auto-calculates Grand Total:
    grand_total = (parts_total + labour_charge) × (1 + tax_percent/100) - discount

User taps "Save Invoice"
    │
    ▼
supabase.from('billing').upsert({
  job_id, parts_total, labour_charge, tax_percent,
  discount, grand_total
}, { onConflict: 'job_id' })
    │
    └─ Success → billing state updated

Actions available after saving:
    │
    ├─ "Print Invoice"
    │   → generateDocumentHtml('invoice', job, materials, billing)
    │   → Print.printAsync({ html })
    │   → System print dialog (Bluetooth printer on Android)
    │
    ├─ "Email Invoice"
    │   → supabase.functions.invoke('send-invoice-email', { body: { jobId } })
    │   → Edge Function fetches job, sends via Resend to customer_email
    │   → showToast on success/failure
    │
    ├─ "WhatsApp Ready"
    │   → formatIndianPhoneForWhatsApp(customer_contact)
    │   → createWhatsAppUrl(phone, 'Your device is ready for pickup...')
    │   → Linking.openURL(whatsappUrl)
    │   → Opens WhatsApp app with pre-filled message (does NOT auto-send)
    │
    └─ "Mark as Paid / Unpaid"
        → UPDATE billing SET is_paid = !current, paid_at = NOW()
        → Badge updates to "Paid" / "Unpaid"
```

**DB Queries:** `SELECT jobs`, `SELECT job_materials`, `SELECT billing`, `UPSERT billing`, `UPDATE billing`

---

## Flow 6: Onsite Visit (Technician)

### Actor: Technician

```
Technician is on an Onsite job
    │
    ▼
Technician navigates to OnsiteVisitScreen (from job detail)
    │
    ├─ SELECT FROM onsite_visits WHERE job_id = jobId AND technician_id = uid
    └─ Shows current phase: Idle → Arrived → Departed

[ARRIVAL]
    │
    ├─ Tap "I've Arrived"
    ├─ Request camera permission
    ├─ Request location permission
    ├─ SelfieCapture → capture → compress
    ├─ expo-location.getCurrentPositionAsync()
    ├─ Upload to 'onsite-visits' bucket
    └─ INSERT INTO onsite_visits {
         job_id, technician_id,
         arrived_at: NOW(),
         arrival_selfie_url: storagePath,
         arrival_gps: { lat, lng }
       }

[DEPARTURE]
    │
    ├─ Tap "Mark Departure"
    ├─ Request camera permission (re-request if expired)
    ├─ Request location permission
    ├─ SelfieCapture → capture → compress
    ├─ expo-location.getCurrentPositionAsync()
    ├─ Upload to 'onsite-visits' bucket
    └─ UPDATE onsite_visits SET {
         departed_at: NOW(),
         departure_selfie_url: storagePath,
         departure_gps: { lat, lng }
       } WHERE id = visitId
```

**DB Queries:** `SELECT onsite_visits`, `Storage.upload`, `INSERT/UPDATE onsite_visits`

---

## Flow 7: Admin Approves Staff

### Actor: Admin (Web or Mobile)

```
Admin navigates to Staff page
    │
    ├─ SELECT * FROM users ORDER BY created_at DESC
    └─ Staff list shown

Admin sees user with "Inactive" badge (is_active = false)
    │
    ▼
Admin clicks "Approve" button
    │
    ▼
ConfirmationModal opens:
    "Are you sure you want to approve this user? They will gain access."
    │
    ├─ Cancel → modal closes, nothing happens
    │
    └─ Confirm
          │
          ▼
        UPDATE users SET is_active = true WHERE id = userId
          │
          └─ Success → fetchStaff() → list refreshes
                     → User can now log in on mobile app
```

**DB Queries:** `SELECT users`, `UPDATE users`

---

## Flow 8: Calculate Salary (Admin)

### Actor: Admin (Web)

```
Admin navigates to Salary page
    │
    └─ Defaults to "Calculate Salary" tab

Admin selects:
    ├─ Staff member (dropdown — fetched from users table)
    ├─ Month (YYYY-MM input)
    └─ Working days in month (number input)

Admin taps "Calculate"
    │
    ▼
Fetch attendance records:
    SELECT * FROM attendance
      WHERE user_id = userId
      AND date >= monthStart
      AND date <= monthEnd

    ▼
Fetch staff rates:
    SELECT * FROM staff_rates WHERE user_id = userId

    ▼
Fetch advance payments:
    SELECT SUM(amount) FROM payments
      WHERE user_id = userId
      AND type = 'advance_salary'
      AND month = 'YYYY-MM'

    ▼
Calculate breakdown (client-side):
    present_days  = count(attendance WHERE status = 'Present')
    halfday_count = count(attendance WHERE status = 'Halfday')
    leave_count   = count(attendance WHERE status = 'Leave')
    absent_count  = working_days - present_days - halfday_count - leave_count
    ot_hours      = SUM(attendance.ot_hours)
    early_hours   = SUM(attendance.early_hours)
    
    present_pay      = present_days × base_daily_rate
    halfday_pay      = halfday_count × (base_daily_rate / 2)
    ot_pay           = ot_hours × ot_rate_per_hour
    early_deduction  = early_hours × early_deduction_per_hour
    gross_salary     = present_pay + halfday_pay + ot_pay - early_deduction
    advance_deducted = SUM(advance payments)
    net_salary       = gross_salary - advance_deducted

    ▼
UPSERT INTO salary { ...all breakdown fields, calculated_by }

    ▼
SalaryBreakdownCard shown with full breakdown + Print button

    ▼
[Print Salary Slip]
    → generateSalarySlipHtml(breakdown)
    → window.open('about:blank') → write HTML → window.print()
    → Printable salary slip with RepairShop branding
```

**DB Queries:** `SELECT attendance`, `SELECT staff_rates`, `SELECT payments (advance)`, `UPSERT salary`

---

## Flow 9: Push Notification Received

### Actor: Technician (Mobile)

```
Edge Function fires → POST to Expo Push API
    │
    ▼
Expo servers queue notification for device token
    │
    ▼
Device receives notification:
    ├─ App in foreground → Notification listener fires → setNotification(notification)
    └─ App in background → System notification shown
         │
         └─ User taps notification
               │
               ▼
             responseListener fires
             Logs: console.log('Notification Response:', response)
             [NOTE: Deep link navigation NOT implemented — only logged]
```

**Known Gap:** Tapping a push notification does NOT navigate to the specific job screen. The `data: { screen: 'JobDetail', jobId: uuid }` payload is received but not acted upon. This needs to be wired up.

---

## Flow 10: Admin Jobs Filter + Search

### Actor: Admin (Web)

```
Admin is on /jobs page
    │
    ├─ Status tabs: All / Received / In Progress / Completed / Waiting
    ├─ Search: job code, customer name, phone (debounced 300ms)
    ├─ Technician filter (dropdown)
    ├─ Priority filter (dropdown)
    └─ Date range (from / to date pickers)

User changes any filter
    │
    ├─ currentPage resets to 1 (useEffect dependency)
    │
    └─ fetchJobs() fires:
          │
          ▼
        SELECT *, technician(name) FROM jobs
          WHERE status = statusFilter   (if not 'All')
          AND technician_id = techFilter (if not 'All')
          AND priority = priorityFilter  (if not 'All')
          AND created_at >= dateFrom     (if set)
          AND created_at <= dateTo       (if set)
          AND (
            job_code ILIKE '%search%'
            OR customer_name ILIKE '%search%'
            OR customer_contact ILIKE '%search%'
          )
          ORDER BY created_at DESC
          RANGE (currentPage-1)*20 TO currentPage*20-1
          
          Returns: data + count (for pagination)

    ▼
Table renders with 20 results + Pagination controls
```

---

## Flow 11: Admin Reassigns Technician

### Actor: Admin (Web)

```
On /jobs page, admin clicks edit icon on a job's technician cell
(or clicks "Assign Tech" if unassigned)
    │
    ▼
ReassignTechnicianModal opens
    │
    ├─ Shows technician dropdown (already fetched from state)
    └─ Admin selects new technician

Admin clicks "Reassign"
    │
    ▼
UPDATE jobs SET technician_id = newTechId WHERE id = jobId
    │
    └─ onSuccess() → modal closes, fetchJobs() called
```

**Supabase Webhook fires:** `notify-on-status-change` (job UPDATE event)
- If only `technician_id` changed and not `status`, webhook fires but no notification sent (status unchanged condition)
- Push to new technician: NOT implemented automatically in the current Edge Function (only status changes trigger tech notification)

**Gap:** Technician does NOT get a push notification when reassigned — only when originally assigned on job creation.

---

## Flow 12: Expenditure Recording

### Actor: Admin (Web)

```
Admin navigates to /expenditure
    │
    ├─ ExpenditureSummaryCards: SUM of each payment type this month
    └─ ExpenditureTable: recent payments list

Admin clicks "Add Expenditure"
    │
    ▼
ExpenditureForm shown
    │
    ├─ Type: daily_expenditure | materials_purchase | office_development
    ├─ Amount (₹)
    └─ Description

Admin taps "Save"
    │
    ▼
INSERT INTO payments {
  user_id: null (or selected staff),
  created_by: adminId,
  type, amount, description
}
    │
    └─ Success → refresh table + summary cards
```

---

## Flow 13: Low-Stock Alert Display

### Actor: Admin (Web Dashboard)

```
Admin opens /  (Overview page)
    │
    ▼
fetchDashboardData() runs
    │
    ├─ SELECT item_name, quantity, low_stock_threshold FROM inventory
    └─ Client-side filter: items where quantity <= low_stock_threshold (default 5)

Alerts generated:
    { text: "Low stock: {item_name} ({qty} left).", type: 'info' }

Alerts rendered in "System Alerts" card
```

---

## Cross-Application Data Synchronization

Both the Mobile App and Admin Panel write/read from the same Supabase PostgreSQL instance. Changes made in one app are visible in the other in real-time via Supabase Realtime channels:

```
Mobile App (Receptionist creates job)
    │
    └─ INSERT INTO jobs
            │
            ├─ Admin Panel (subscribed to jobs channel) → fetchDashboardData()
            │   → Overview dashboard updates instantly
            │
            └─ Edge Function webhook fires
                → Push notification to assigned technician's mobile app
                → WhatsApp to customer

Mobile App (Technician updates status)
    │
    └─ UPDATE jobs SET status = 'Completed'
            │
            ├─ Mobile App (receptionist subscribed to job list) → list refreshes
            │
            ├─ Admin Panel (subscribed to jobs channel) → fetchJobs() / fetchDashboard()
            │
            └─ Edge Function webhook fires
                → Push to receptionist + admin mobile
                → WhatsApp "Ready for Pickup" to customer
```
