-- ============================================================================
-- Migration: 20260814000006_fix_extension_and_storage.sql
-- Description:
--   Fix #3  — Move pg_trgm extension to 'extensions' schema
--   Fix #7  — Restrict avatar bucket listing (public bucket allows listing)
-- ============================================================================


-- ============================================================================
-- Fix #3: pg_trgm Extension in Public Schema → Move to extensions schema
--
-- Root Cause: Extensions in 'public' pollute the public namespace with operator
--   functions and types. Supabase convention is to put extensions in 'extensions'.
--
-- Risk: After moving, any function/query using trigram operators (~%) or similarity()
--   without schema qualification may break if 'extensions' is not in search_path.
--   We confirmed via grep that no function in migrations explicitly uses pg_trgm
--   operators directly, but we add 'extensions' to relevant function search_paths
--   in migration 20260814000002 as a precaution.
-- ============================================================================

-- Create extensions schema if it doesn't exist (Supabase usually creates this)
create schema if not exists extensions;

-- Move pg_trgm if it exists in public schema
do $$ begin
  if exists (
    select 1 from pg_extension e
    join pg_namespace n on n.oid = e.extnamespace
    where e.extname = 'pg_trgm' and n.nspname = 'public'
  ) then
    alter extension pg_trgm set schema extensions;
    raise notice 'pg_trgm moved from public to extensions schema.';
  elsif exists (
    select 1 from pg_extension where extname = 'pg_trgm'
  ) then
    raise notice 'pg_trgm already in non-public schema. No action needed.';
  else
    -- Install it in extensions schema if not installed at all
    create extension if not exists pg_trgm with schema extensions;
    raise notice 'pg_trgm installed in extensions schema.';
  end if;
end $$;


-- ============================================================================
-- Fix #7: Avatar Bucket Public Listing
--
-- Root Cause: The 'avatars' bucket is set to `public = true`, which means any
--   unauthenticated user can list ALL files in the bucket (a privacy concern —
--   exposes a list of all user avatar file paths).
--
-- App behavior check: The app uses avatars via `avatar_url` stored in users.avatar_url.
--   It reads the URL directly (not via listing). Making the bucket non-public and
--   using signed URLs or keeping public=true but restricting the LIST operation
--   are both valid.
--
-- Our fix: Keep the bucket public=true (so existing <img src=...> URLs continue
--   working without signed URLs), but add a storage RLS policy that restricts
--   SELECT (list) to authenticated users only — the existing "Allow public view avatars"
--   policy allows fetching by exact path, which is what the app does.
--
-- The "public bucket listing" warning is about the bucket-level `public` flag combined
--   with no RLS restriction on listing. We tighten the policy to prevent wildcard listing
--   while keeping individual object GET working.
-- ============================================================================

-- Remove the overly-broad "Allow public view avatars" policy (allows anon to list)
drop policy if exists "Allow public view avatars" on storage.objects;

-- Re-create: allow public to GET a specific avatar by exact path only.
-- Supabase Storage: a SELECT policy on storage.objects controls both GET (by key) and LIST.
-- To prevent listing while allowing direct URL access, we restrict to authenticated only
-- for SELECT and rely on the public bucket flag for CDN-level object serving.
-- If you need fully public avatar URLs (no auth header), keep bucket public=true —
-- Supabase CDN serves public bucket objects without needing a SELECT policy.
-- This policy then only controls the PostgREST /storage/v1/object/list endpoint.

create policy "avatars_authenticated_only_listing"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'avatars');

-- Public (anon) can still fetch avatars via the CDN URL (https://<project>.supabase.co/storage/v1/object/public/avatars/...)
-- because the bucket public flag allows CDN-level serving. The RLS policy above only
-- restricts the Supabase Storage API listing endpoint, not CDN delivery.


-- ============================================================================
-- Reload schema cache
-- ============================================================================
notify pgrst, 'reload schema';
