# RepairShop — Developer Setup Guide

## Prerequisites

Before starting, ensure the following are installed on your development machine:

| Tool | Minimum Version | Installation |
|---|---|---|
| Node.js | 18.x LTS | https://nodejs.org |
| npm | 9.x | Bundled with Node |
| Git | 2.x | https://git-scm.com |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Supabase CLI | Latest | `npm install -g supabase` |
| Android Studio | Latest | For Android emulator |
| Xcode | 15+ (macOS only) | Mac App Store |

---

## Step 1: Clone the Repository

```bash
git clone <repository-url>
cd Project
```

---

## Step 2: Set Up Supabase

### 2a. Create a Supabase Project
1. Go to https://supabase.com
2. Create a new organization (or use existing)
3. Create a new project named "RepairShop"
4. Choose a region close to your users (e.g., ap-south-1 for India)
5. Set a strong database password — save it securely

### 2b. Run Database Migrations
1. Get your Supabase project URL and anon key from Settings → API
2. Get your service role key from Settings → API (keep this SECRET)

Run the schema migration (from `SKILL.md` or the migrations folder):
```bash
# Connect to your Supabase DB
psql "postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres"

# Or use Supabase Dashboard → SQL Editor
```

Execute the following SQL (from SKILL.md schema section):
```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Job Code Sequence
CREATE SEQUENCE IF NOT EXISTS job_code_seq START 1;

-- Users table
CREATE TABLE public.users (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('admin', 'receptionist', 'technician')),
  is_active BOOLEAN NOT NULL DEFAULT false,
  expo_push_token TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Jobs table
CREATE TABLE public.jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_code TEXT NOT NULL UNIQUE,
  customer_name TEXT NOT NULL,
  customer_contact TEXT NOT NULL,
  customer_email TEXT,
  device_type TEXT NOT NULL,
  reported_issue TEXT NOT NULL,
  remarks TEXT,
  job_type TEXT NOT NULL DEFAULT 'Inhouse' CHECK (job_type IN ('Inhouse', 'Onsite')),
  priority TEXT NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Normal', 'High', 'Urgent')),
  status TEXT NOT NULL DEFAULT 'Received'
    CHECK (status IN ('Received', 'In Progress', 'Waiting for Materials', 'Completed')),
  receptionist_id UUID REFERENCES public.users(id),
  technician_id UUID REFERENCES public.users(id),
  work_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

-- Continue with all other tables from 06_DATABASE_SCHEMA.md...
```

### 2c. Create the Job Code Function
```sql
CREATE OR REPLACE FUNCTION public.generate_job_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
BEGIN
  code := 'RS-' || TO_CHAR(NOW(), 'YYYY') || '-' || LPAD(nextval('job_code_seq')::TEXT, 4, '0');
  RETURN code;
END;
$$;
```

### 2d. Set Up Row Level Security
Enable RLS on all tables and add policies (refer to SKILL.md for policy definitions):
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Example: Admin can see all users
CREATE POLICY "Admin can view all users" ON public.users
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.users u 
      WHERE u.id = auth.uid() AND u.role = 'admin' AND u.is_active = true
    )
  );
```

### 2e. Create Storage Buckets
In Supabase Dashboard → Storage:
1. Create bucket `attendance-selfies` → Set to **Private**
2. Create bucket `onsite-visits` → Set to **Private**

### 2f. Create Your Admin User
```sql
-- After creating via Supabase Auth (sign up in admin panel):
UPDATE public.users 
SET role = 'admin', is_active = true 
WHERE email = 'your-admin@email.com';
```

Or use the `confirm_admin.js` script in the admin-panel directory:
```bash
cd admin-panel
# Edit confirm_admin.js with your email and supabase credentials
node confirm_admin.js
```

---

## Step 3: Set Up Admin Panel (Next.js)

### 3a. Install Dependencies
```bash
cd admin-panel
npm install
```

### 3b. Configure Environment Variables
```bash
cp .env.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get these values from: Supabase Dashboard → Settings → API

### 3c. Start Development Server
```bash
npm run dev
```

The admin panel will be available at: http://localhost:3000

### 3d. Login
1. Open http://localhost:3000
2. You'll be redirected to /login
3. Use the admin account you created in Step 2f

---

## Step 4: Set Up Mobile App (Expo)

### 4a. Install Dependencies
```bash
cd RepairShopApp
npm install
```

### 4b. Configure Environment Variables
```bash
cp .env.example .env
```

Edit `.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 4c. Set Up Android Credentials (for Push Notifications)
1. Go to Firebase Console → Add project → Android app
2. Package name: `com.repairshop.app`
3. Download `google-services.json`
4. Place in: `RepairShopApp/google-services.json`
5. **⚠️ Do NOT commit this file to git**

### 4d. Start Development Server

**Option A: Expo Go (for basic testing only)**
```bash
npx expo start
```
> ⚠️ Push notifications do NOT work in Expo Go (SDK 53+ limitation)

**Option B: Development Build (recommended for full testing)**
```bash
# Build development client
eas build --platform android --profile development

# Install APK on device/emulator
# Then start the dev server
npx expo start --dev-client
```

**For Android Emulator:**
```bash
npx expo start --android
```

**For iOS Simulator (macOS only):**
```bash
npx expo start --ios
```

---

## Step 5: Set Up Edge Functions (Optional for Full Features)

Edge Functions are required for:
- Push notifications on job creation
- Push notifications on status change
- Invoice email sending

### 5a. Deploy Edge Functions
```bash
cd Project
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy notify-on-job-created
supabase functions deploy notify-on-status-change
supabase functions deploy send-invoice-email
```

### 5b. Set Edge Function Secrets
```bash
# Required for push notifications
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Required for WhatsApp (optional)
supabase secrets set TWILIO_SID=<your-twilio-account-sid>
supabase secrets set TWILIO_TOKEN=<your-twilio-auth-token>
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+14155238886

# Required for email invoices (optional)
supabase secrets set RESEND_API_KEY=<your-resend-api-key>
supabase secrets set RESEND_FROM_EMAIL=billing@yourdomain.com
```

> Get Twilio credentials at https://console.twilio.com
> Get Resend API key at https://resend.com/api-keys

### 5c. Set Up Database Webhooks
In Supabase Dashboard → Database → Webhooks:

1. **Webhook: notify-on-job-created**
   - Event: `INSERT` on `jobs` table
   - URL: `https://<project-ref>.supabase.co/functions/v1/notify-on-job-created`
   - HTTP method: `POST`
   - Headers: `Authorization: Bearer <service-role-key>`

2. **Webhook: notify-on-status-change**
   - Event: `UPDATE` on `jobs` table
   - URL: `https://<project-ref>.supabase.co/functions/v1/notify-on-status-change`
   - HTTP method: `POST`
   - Headers: `Authorization: Bearer <service-role-key>`

---

## Step 6: Create Test Accounts

Use the admin panel to create test accounts:
1. Login as admin
2. Navigate to /staff
3. Click "Add Staff"
4. Create:
   - One `receptionist` account
   - One `technician` account
5. Approve both accounts (set `is_active = true`)

Or create directly via Supabase Dashboard → Authentication → Users → Add User, then insert into `users` table.

---

## Step 7: Verify Setup

### Admin Panel Checklist
- [ ] Can log in as admin
- [ ] Overview dashboard loads with stats
- [ ] Jobs list is accessible
- [ ] Can create a new job (via /jobs/new)
- [ ] Staff list shows all accounts
- [ ] Salary page shows (admin only)

### Mobile App Checklist
- [ ] Can log in as receptionist
- [ ] Can log in as technician
- [ ] Receptionist dashboard loads
- [ ] Can create a new job (2-step flow)
- [ ] Can check in with selfie + GPS
- [ ] Technician sees assigned jobs only
- [ ] Status updates sync to admin panel

### Notification Checklist (requires real device + Edge Functions)
- [ ] Create a job with technician assigned
- [ ] Technician receives push notification
- [ ] Update job status
- [ ] Admin/receptionist receive push notification

---

## Development Tips

### Watching Multiple Apps Simultaneously
Open 3 terminals:
```bash
# Terminal 1: Mobile app
cd RepairShopApp && npx expo start

# Terminal 2: Admin panel
cd admin-panel && npm run dev

# Terminal 3: Supabase Edge Functions (local)
cd Project && supabase functions serve
```

### Debugging Supabase Queries
```typescript
// Add to any query for verbose logging:
const { data, error } = await supabase
  .from('jobs')
  .select('*')
console.log('Query result:', { data, error })
```

Or use Supabase Dashboard → Logs → API Logs for server-side logging.

### Testing Edge Functions Locally
```bash
# Start local Edge Function server
supabase functions serve notify-on-job-created --no-verify-jwt

# Test with curl
curl -i --location --request POST 'http://localhost:54321/functions/v1/notify-on-job-created' \
  --header 'Content-Type: application/json' \
  --data '{"type":"INSERT","table":"jobs","record":{"id":"test-uuid","job_code":"RS-2026-0001","customer_name":"Test Customer","customer_contact":"9876543210","technician_id":null}}'
```

### Resetting the Sequence (Development)
```sql
-- Reset job code sequence for fresh testing
SELECT setval('job_code_seq', 1, false);
```

### Viewing Realtime Logs
In Supabase Dashboard → Realtime → Logs — you can see active channel subscriptions.

### Checking RLS Policies
```sql
-- View all RLS policies on a table
SELECT * FROM pg_policies WHERE tablename = 'jobs';

-- Test a query as a specific user role
SET ROLE authenticated;
SET request.jwt.claims = '{"sub":"user-uuid","role":"authenticated"}';
SELECT * FROM jobs;
RESET ROLE;
```

---

## Environment Summary

| Environment | Mobile | Admin | Notes |
|---|---|---|---|
| Development | `expo start` | `next dev` | Local servers |
| Preview | EAS Build preview APK | Vercel Preview URL | For testing |
| Production | EAS Build production APK/AAB | Vercel Production | For real users |

---

## Common Errors & Solutions

### Error: `EXPO_PUBLIC_SUPABASE_URL is not defined`
- Check `.env` file exists in `RepairShopApp/`
- Variable must start with `EXPO_PUBLIC_`
- Restart the Expo dev server after changing `.env`

### Error: `Unable to resolve module ../../../../admin-panel/...`
- Metro bundler can't find the cross-app import
- Verify `metro.config.js` has the correct `watchFolders` and `extraNodeModules` config
- Ensure the `admin-panel` folder is at the same level as `RepairShopApp`

### Error: `Permission denied for table jobs`
- Check RLS policies are correctly defined
- Verify the user's `role` in the `users` table matches the RLS policy conditions
- Run: `SELECT current_user, auth.uid(), auth.role();` in Supabase SQL editor

### Error: `Job code is null`
- The `generate_job_code()` function doesn't exist
- Run the function creation SQL from Step 2c
- Verify: `SELECT public.generate_job_code();` in SQL editor

### Error: Push notifications not working in Expo Go
- This is expected — push notifications don't work in Expo Go on SDK 53+
- Use a development build: `eas build --platform android --profile development`

### Error: Camera/GPS permission denied on Android emulator
- GPS doesn't work on most emulators — test on a real device
- Camera works on emulators with webcam support
- Verify permissions in emulator settings: Apps → RepairShop → Permissions

### Error: `supabase.functions.invoke` returns 500
- Check Edge Function logs in Supabase Dashboard → Functions → Logs
- Verify all required secrets are set: `supabase secrets list`
- Test the function directly with `curl` (see Testing Edge Functions section)
