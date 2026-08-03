# Database and Backend Audit

## Supabase Tables

### 1. `users`
- Exists: Yes
- Required columns: `id`, `name`, `email`, `role`, `is_active`, `expo_push_token` (Present)
- RLS Policies: Defined. Only admin can modify roles. Users can read own data.
- Security risks: None.

### 2. `jobs`
- Exists: Yes
- Required columns: `job_code`, `customer_name`, `device_type`, `status`, etc. (Present)
- RLS Policies: Admin sees all. Receptionist sees all. Technician sees only `technician_id = auth.uid()`.
- Security risks: None.

### 3. `job_materials`
- Exists: Yes
- Required columns: `job_id`, `material_name`, `quantity`, `unit_cost`, `total_cost` (Present)
- RLS Policies: Enforced via `job_id`.

### 4. `attendance`
- Exists: Yes
- Required columns: `user_id`, `check_in_time`, `check_out_time`, `selfie_url`, `gps_lat/lng` (Present)
- RLS Policies: Admin sees all, users see own.

### 5. `onsite_visits`
- Exists: Yes
- Required columns: Arrival/Departure selfies & GPS (Present)
- RLS Policies: Technician restricted to own visits.

### 6. `inventory`
- Exists: Yes
- Required columns: `item_name`, `quantity`, `low_stock_threshold` (Present)
- RLS Policies: Admin manageable.

### 7. `billing`, `payments`, `staff_rates`, `salary`
- Exists: Yes
- RLS Policies: Strictly limited to Admin (and Receptionist for billing). Technicians cannot view these.
- Security risks: None identified. Good isolation.

### 8. `notifications`
- Exists: Yes
- Purpose: Audit log for webhooks.

## Edge Functions

### `notify-on-job-created`
- Exists: Yes
- Trigger: Webhook on `jobs` insert.
- Action: Sends Expo Push to tech, WhatsApp to customer.
- Security: Uses `verifyWebhookSecret`.
- Status: Working.

### `notify-on-status-change`
- Exists: Yes
- Trigger: Webhook on `jobs` update (status change).
- Action: Push notification to admin/receptionist.
- Status: Working.

### `send-invoice-email`
- Exists: Yes
- Trigger: Manual via HTTP call from Billing module.
- Action: Sends email (Resend/SendGrid).
- Status: Working.

### `calculate-monthly-salary`
- Exists: Yes
- Trigger: Manual via Admin panel.
- Action: Aggregates attendance and computes salary using `staff_rates`.
- Status: Working.

## Storage Buckets
- `attendance-selfies`: Exists. Private. Signed URL usage.
- `onsite-visits`: Exists. Private.
- `invoices`: Recommended but billing uses PDF generation on client-side mostly.
