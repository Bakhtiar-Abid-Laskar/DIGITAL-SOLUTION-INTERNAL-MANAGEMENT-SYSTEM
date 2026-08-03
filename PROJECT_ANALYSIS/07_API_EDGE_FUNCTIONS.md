# RepairShop — API and Edge Functions Reference

## Overview

RepairShop has **no custom REST API server**. All API calls go directly to Supabase's auto-generated REST API (PostgREST) using the `@supabase/supabase-js` SDK. The only server-side custom logic lives in **Supabase Edge Functions** (Deno/TypeScript).

---

## Supabase API Calls Reference

### Authentication

```typescript
// Sign In
supabase.auth.signInWithPassword({ email, password })

// Sign Out
supabase.auth.signOut()

// Get Session (on mount)
supabase.auth.getSession()

// Auth State Listener
supabase.auth.onAuthStateChange((event, session) => { ... })
```

---

### Users Table

```typescript
// Fetch own user profile
supabase.from('users').select('*').eq('id', userId).single()

// Fetch all technicians (for assignment)
supabase.from('users').select('*').eq('role', 'technician').eq('is_active', true)

// Approve user
supabase.from('users').update({ is_active: true }).eq('id', userId)

// Block user
supabase.from('users').update({ is_active: false }).eq('id', userId)

// Update push token
supabase.from('users').update({ expo_push_token: token }).eq('id', userId)

// Fetch all staff with filters
supabase.from('users').select('*').order('created_at', { ascending: false })
  .eq('role', roleFilter)
  .eq('is_active', activeFilter)
```

---

### Jobs Table

```typescript
// Generate job code (PostgreSQL RPC)
supabase.rpc('generate_job_code')  // Returns 'RS-2026-0001'

// Create a new job
supabase.from('jobs').insert({
  job_code, customer_name, customer_contact, customer_email,
  device_type, reported_issue, remarks, job_type, priority,
  status: 'Received', receptionist_id, technician_id
}).select().single()

// Fetch jobs list (admin/receptionist — all)
supabase.from('jobs')
  .select('*, technician:users!jobs_technician_id_fkey(name)', { count: 'exact' })
  .order('created_at', { ascending: false })
  .eq('status', statusFilter)
  .range(from, to)

// Fetch technician's jobs (filtered by assignment)
supabase.from('jobs')
  .select('*')
  .eq('technician_id', userId)
  .order('created_at', { ascending: false })

// Fetch single job
supabase.from('jobs').select('*, technician:users!jobs_technician_id_fkey(name, phone)')
  .eq('id', jobId).single()

// Update job status + notes (technician)
supabase.from('jobs').update({
  work_notes, status, completed_at
}).eq('id', jobId).eq('technician_id', userId)

// Update job (admin/receptionist — full edit)
supabase.from('jobs').update({
  status, priority, technician_id, work_notes, ...
}).eq('id', jobId)

// Today's jobs count
supabase.from('jobs').select('*', { count: 'exact', head: true })
  .gte('created_at', todayISO)

// Jobs by status (for pie chart / tab counts)
supabase.from('jobs').select('status')
```

---

### Job Materials Table

```typescript
// Fetch materials for a job
supabase.from('job_materials').select('*').eq('job_id', jobId)

// Add material
supabase.from('job_materials').insert({
  job_id, material_name, quantity, unit_cost,
  total_cost: quantity * unit_cost
})

// Delete material
supabase.from('job_materials').delete().eq('id', materialId)
```

---

### Billing Table

```typescript
// Fetch billing for a job
supabase.from('billing').select('*').eq('job_id', jobId).single()

// Upsert billing (create or update)
supabase.from('billing').upsert({
  job_id, parts_total, labour_charge, tax_percent, discount, grand_total
}, { onConflict: 'job_id' })

// Mark as paid/unpaid
supabase.from('billing').update({ is_paid, paid_at }).eq('job_id', jobId)
```

---

### Attendance Table

```typescript
// Upsert attendance (check-in)
supabase.from('attendance').upsert({
  user_id, date, check_in_time, check_in_selfie_url, check_in_gps
}, { onConflict: 'user_id,date' })

// Upsert attendance (check-out)
supabase.from('attendance').upsert({
  user_id, date, check_out_time, check_out_selfie_url, check_out_gps
}, { onConflict: 'user_id,date' })

// Fetch own attendance history (last 30 days)
supabase.from('attendance').select('*')
  .eq('user_id', userId)
  .gte('date', thirtyDaysAgo)
  .order('date', { ascending: false })

// Admin: Fetch staff attendance
supabase.from('attendance').select('*')
  .eq('user_id', staffId)
  .gte('date', monthStart)
  .order('date', { ascending: false })
```

---

### Onsite Visits Table

```typescript
// Create onsite visit (arrival)
supabase.from('onsite_visits').insert({
  job_id, technician_id, arrived_at, arrival_selfie_url, arrival_gps
}).select().single()

// Update onsite visit (departure)
supabase.from('onsite_visits').update({
  departed_at, departure_selfie_url, departure_gps
}).eq('id', visitId)

// Fetch visit for a job
supabase.from('onsite_visits').select('*')
  .eq('job_id', jobId).eq('technician_id', userId).single()
```

---

### Inventory Table

```typescript
// Fetch all inventory
supabase.from('inventory').select('*').order('item_name')

// Add inventory item
supabase.from('inventory').insert({ item_name, quantity, unit, low_stock_threshold })

// Update inventory item
supabase.from('inventory').update({ item_name, quantity, unit, low_stock_threshold })
  .eq('id', itemId)

// Delete inventory item
supabase.from('inventory').delete().eq('id', itemId)
```

---

### Staff Rates Table

```typescript
// Fetch rate for a user
supabase.from('staff_rates').select('*').eq('user_id', userId).single()

// Upsert rate
supabase.from('staff_rates').upsert({
  user_id, base_daily_rate, ot_rate_per_hour, early_deduction_per_hour
}, { onConflict: 'user_id' })
```

---

### Salary Table

```typescript
// Fetch salary record
supabase.from('salary').select('*').eq('user_id', userId).eq('month', month).single()

// Upsert salary record
supabase.from('salary').upsert({
  user_id, month, working_days, present_days, halfday_count, leave_count,
  absent_count, ot_hours, early_hours, base_daily_rate, ot_rate_per_hour,
  early_deduction_per_hour, present_pay, halfday_pay, ot_pay, early_deduction,
  gross_salary, advance_deducted, net_salary, calculated_by
}, { onConflict: 'user_id,month' })
```

---

### Payments Table

```typescript
// Insert advance salary payment
supabase.from('payments').insert({
  user_id, created_by, type: 'advance_salary', amount, description, month
})

// Fetch advance payments for salary calculation
supabase.from('payments').select('amount')
  .eq('user_id', userId)
  .eq('type', 'advance_salary')
  .eq('month', month)

// Fetch all expenditure (admin)
supabase.from('payments').select('*, user:users!payments_user_id_fkey(name)')
  .order('created_at', { ascending: false })
```

---

### Notifications Table

```typescript
// Fetch notifications (admin/receptionist)
supabase.from('notifications').select('*')
  .order('sent_at', { ascending: false })
  .limit(20)
```

---

### Realtime Subscriptions

```typescript
// Subscribe to all job changes (admin dashboard)
const channel = supabase.channel('admin-overview-jobs')
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'jobs'
  }, () => { fetchData(); })
  .subscribe()

// Subscribe to specific job changes (technician update screen)
const channel = supabase.channel(`update-work-${jobId}`)
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'jobs',
    filter: `id=eq.${jobId}`
  }, () => { fetchJobData(); })
  .on('postgres_changes', {
    event: '*', schema: 'public', table: 'job_materials',
    filter: `job_id=eq.${jobId}`
  }, () => { fetchJobData(); })
  .subscribe()

// Cleanup
supabase.removeChannel(channel)
```

---

### Storage Operations

```typescript
// Upload attendance selfie
supabase.storage.from('attendance-selfies')
  .upload(path, fileBlob, { contentType: 'image/jpeg' })

// Upload onsite visit photo
supabase.storage.from('onsite-visits')
  .upload(path, fileBlob, { contentType: 'image/jpeg' })

// Get signed URL for display (private bucket)
supabase.storage.from('attendance-selfies')
  .createSignedUrl(path, 3600)  // 1 hour expiry
```

---

## Edge Functions Reference

### `POST /functions/v1/notify-on-job-created`

**Trigger:** Supabase Database Webhook on `jobs` INSERT event

**Input Payload:**
```json
{
  "type": "INSERT",
  "table": "jobs",
  "record": {
    "id": "uuid",
    "job_code": "RS-2026-0001",
    "customer_name": "John Doe",
    "customer_contact": "9876543210",
    "device_type": "Laptop",
    "priority": "Urgent",
    "technician_id": "uuid | null"
  },
  "old_record": null
}
```

**Processing:**
1. If `record.technician_id` exists:
   - Fetch technician's `expo_push_token` from `users` table (service role)
   - POST to `https://exp.host/--/api/v2/push/send`
   - Body: `{ to: token, title: "New Job Assigned", body: "Job RS-XXXX assigned..." }`
   - Log to `notifications` table
2. If `TWILIO_SID`, `TWILIO_TOKEN`, `TWILIO_WHATSAPP_FROM` env vars set AND `record.customer_contact`:
   - Format contact to E.164 (+91XXXXXXXXXX)
   - POST to Twilio Messages API
   - Body: WhatsApp message "Hello {name}, we received your {device}. Job code: {code}."
   - Log to `notifications` table

**Response:**
```json
{ "success": true, "message": "Job created notifications processed" }
```

**Environment Variables Required:**
- `SUPABASE_URL` ✓ (auto-injected)
- `SUPABASE_SERVICE_ROLE_KEY` ✓ (auto-injected)
- `TWILIO_SID` (optional)
- `TWILIO_TOKEN` (optional)
- `TWILIO_WHATSAPP_FROM` (optional)

---

### `POST /functions/v1/notify-on-status-change`

**Trigger:** Supabase Database Webhook on `jobs` UPDATE event

**Input Payload:**
```json
{
  "type": "UPDATE",
  "table": "jobs",
  "record": {
    "id": "uuid",
    "job_code": "RS-2026-0001",
    "status": "Completed",
    "customer_name": "John Doe",
    "customer_contact": "9876543210",
    "device_type": "Laptop"
  },
  "old_record": {
    "status": "In Progress"
  }
}
```

**Processing:**
1. Early return if `record.status === old_record.status` (no status change occurred)
2. Fetch all active receptionist + admin users with non-null `expo_push_token`
3. Send push notifications in parallel (Promise.all) to all staff:
   - Title: `"Job Status Update"`, Body: `"Job RS-XXXX is now {status}."`
   - Data: `{ screen: 'JobDetail', jobId: uuid }`
4. Log single notification row to `notifications` table
5. If `record.status === 'Completed'` AND Twilio configured:
   - Send WhatsApp to customer: "Your device is repaired and ready for pickup. Job: RS-XXXX"
   - Log to `notifications` table

**Response:**
```json
{ "success": true, "message": "Status notifications processed" }
```

---

### `POST /functions/v1/send-invoice-email`

**Trigger:** Called directly by mobile `BillingScreen` or by Database Webhook on `billing` INSERT

**Input Payload (when called directly):**
```json
{
  "type": "MANUAL",
  "jobId": "uuid"
}
```

**Input Payload (when triggered by DB webhook):**
```json
{
  "type": "INSERT",
  "table": "billing",
  "record": {
    "id": "uuid",
    "job_id": "uuid",
    "parts_total": 500,
    "labour_charge": 300,
    "tax_percent": 18,
    "discount": 50,
    "grand_total": 894
  }
}
```

**Processing:**
1. Fetch job info: `job_code`, `customer_name`, `customer_email`, `device_type`
2. If no `customer_email` → return 200 with `{ message: 'No customer email' }`
3. If no `RESEND_API_KEY` → return 200 with `{ message: 'No RESEND_API_KEY' }`
4. Build HTML email body with billing summary
5. POST to `https://api.resend.com/emails`:
   - From: `RepairShop <billing@yourdomain.com>` (requires domain configuration in Resend)
   - To: `[customer_email]`
   - Subject: `"Invoice for Repair Job RS-2026-0001"`
6. Log to `notifications` table

**Response:**
```json
{ "success": true, "message": "Invoice email processed" }
```

**Environment Variables Required:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `RESEND_API_KEY` (optional — skips if missing)

**Known Issue:** `from` email hardcoded as `billing@yourdomain.com` — requires user to configure their verified Resend domain.

---

## External Service APIs Used

### Expo Push Notification Service
```
POST https://exp.host/--/api/v2/push/send
Content-Type: application/json

{
  "to": "ExponentPushToken[xxxxx]",
  "sound": "default",
  "title": "New Job Assigned",
  "body": "Job RS-2026-0001 has been assigned to you.",
  "data": { "screen": "JobDetail", "jobId": "uuid" }
}
```
- No authentication required
- Free tier: up to 1,000 notifications/month (Expo's free tier)
- Batching supported (array of messages for status change notifications)

### Twilio WhatsApp API
```
POST https://api.twilio.com/2010-04-01/Accounts/{AccountSid}/Messages.json
Authorization: Basic {base64(SID:Token)}
Content-Type: application/x-www-form-urlencoded

To=whatsapp:+919876543210
From=whatsapp:+14155238886
Body=Hello John, we received your Laptop. Job code RS-2026-0001.
```
- Requires Twilio account + WhatsApp Sandbox approval
- Number prefix: `whatsapp:` required by Twilio
- Phone normalization: adds `+91` prefix if not present

### Resend Email API
```
POST https://api.resend.com/emails
Authorization: Bearer {RESEND_API_KEY}
Content-Type: application/json

{
  "from": "RepairShop <billing@yourdomain.com>",
  "to": ["customer@example.com"],
  "subject": "Invoice for Repair Job RS-2026-0001",
  "html": "<div>...invoice HTML...</div>"
}
```
- Requires Resend account + verified sending domain
- Free tier: 3,000 emails/month

---

## Error Handling Patterns

### Client-Side (Mobile + Admin)
```typescript
// Pattern used throughout the codebase
const { data, error } = await supabase.from('jobs').insert(payload).select().single()
if (error) throw new Error(error.message)
// or: showToast({ title: 'Error', message: error.message, type: 'error' })
```

### Edge Functions
```typescript
try {
  // ... main logic ...
  return new Response(JSON.stringify({ success: true }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 200,
  })
} catch (error) {
  console.error('Edge Function Error:', error)
  return new Response(JSON.stringify({ error: error.message }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 500,
  })
}
```

### CORS Handling (Edge Functions)
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Every Edge Function handles OPTIONS preflight:
if (req.method === 'OPTIONS') {
  return new Response('ok', { headers: corsHeaders })
}
```

**Note:** `Allow-Origin: '*'` is acceptable here because Edge Functions are webhook-triggered (not browser-called) for the job notifications. The `send-invoice-email` function IS called from the browser/mobile client, so wildcard CORS may need tightening in production.

---

## Query Patterns Reference

### Pagination
```typescript
const PAGE_SIZE = 20;
const from = (currentPage - 1) * PAGE_SIZE;
const to = from + PAGE_SIZE - 1;
query.range(from, to)  // Supabase's server-side pagination
```

### Multi-Filter Search
```typescript
// OR filter across multiple columns
query.or(`job_code.ilike.%${search}%,customer_name.ilike.%${search}%,customer_contact.ilike.%${search}%`)
```

### Join (Foreign Key)
```typescript
// Technician name join using named FK
supabase.from('jobs')
  .select('*, technician:users!jobs_technician_id_fkey(name)')
```

### Debounced Search
```typescript
// Inline debounce (admin jobs page)
function useDebounceValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(handler)
  }, [value, delay])
  return debouncedValue
}
const debouncedSearch = useDebounceValue(searchQuery, 300)
```

### Low-Stock Detection
```typescript
// Client-side calculation (no DB-side filter)
const { data: allInventory } = await supabase.from('inventory')
  .select('item_name, quantity, low_stock_threshold')
const lowItems = allInventory.filter(item => item.quantity <= (item.low_stock_threshold || 5))
```
