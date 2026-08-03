# SECURITY AUDIT

- **RLS**: `attendance` table has policies allowing INSERT/UPDATE only where `auth.uid() = user_id`.
- **Admin Isolation**: `salary` table restricts SELECT to Admins, or matching `user_id`.
- **Edge Function**: Service role key securely hidden in Supabase secrets, never exposed to client.
- **Risk**: Device spoofing (GPS mock locations). Mitigation: Hardware-level checks if needed, currently relies on OS permissions.
