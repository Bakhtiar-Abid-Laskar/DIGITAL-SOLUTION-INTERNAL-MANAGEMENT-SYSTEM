# SUPABASE ANALYSIS

### Authentication
- Uses Supabase JWTs. Policies verify `auth.uid() = user_id`.

### Storage
- `attendance-selfies`: Private bucket. Signed URLs generated for admin viewing.

### Edge Functions
- `calculate-monthly-salary`: Deno runtime. Injected with `SUPABASE_SERVICE_ROLE_KEY` to bypass RLS and read all staff data securely.
