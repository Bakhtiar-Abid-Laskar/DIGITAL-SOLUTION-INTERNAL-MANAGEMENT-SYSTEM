-- ============================================================================
-- REPAIRSHOP - FIX NOTIFICATIONS RLS INSERT POLICY
-- Migration: 20260821500000_fix_notifications_rls_and_insert_policy.sql
--
-- The notifications table was missing an INSERT policy, which blocked:
-- 1. Edge Functions (even with service role key) from logging notifications
-- 2. Internal Postgres triggers from writing notifications
-- ============================================================================

-- Drop any conflicting old INSERT policies
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifications_insert_admin" on public.notifications;
drop policy if exists "notifications_insert_authenticated" on public.notifications;
drop policy if exists "notifications_insert_all" on public.notifications;
drop policy if exists "notifications_insert_anon" on public.notifications;

-- Allow any authenticated user to insert notifications (Edge Functions service role also hits this)
create policy "notifications_insert_authenticated"
  on public.notifications for insert to authenticated
  with check (true);

-- Allow anon role insert (needed for pg_net webhook triggered functions using anon JWT)
create policy "notifications_insert_anon"
  on public.notifications for insert to anon
  with check (true);

-- Realtime: ensure notifications table is in realtime publication
do $$
begin
  begin
    alter publication supabase_realtime add table public.notifications;
  exception when others then
    null;
  end;
end;
$$;

notify pgrst, 'reload schema';
