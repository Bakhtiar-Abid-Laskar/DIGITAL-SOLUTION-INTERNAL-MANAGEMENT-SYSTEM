-- ============================================================================
-- REPAIRSHOP — DEVICE TYPE NORMALIZED RESOLUTION & CREATE-OR-SELECT
-- Migration: 20260821100000_device_type_resolution.sql
--
-- Provides:
--   1. find_or_create_device_type(p_name text) -> returns canonical id (text)
--      Idempotent, case-insensitive match against ui_device_types.
--      If missing, inserts with normalized label/code and returns new ID.
--   2. get_unique_device_types() -> returns list of active device types
--   3. Grants execute to authenticated users (receptionist, technician, admin)
-- ============================================================================

-- 1. find_or_create_device_type function
create or replace function public.find_or_create_device_type(
  p_name text
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  v_trimmed text;
  v_matched_id text;
  v_code text;
  v_label text;
begin
  v_trimmed := trim(coalesce(p_name, ''));
  if v_trimmed = '' then
    return 'Other';
  end if;

  -- 1. Case-insensitive lookup on label or id
  select id into v_matched_id
  from public.ui_device_types
  where lower(trim(label)) = lower(v_trimmed)
     or lower(trim(id)) = lower(v_trimmed)
  order by created_at asc
  limit 1;

  if v_matched_id is not null then
    return v_matched_id;
  end if;

  -- 2. Format new entry cleanly
  v_label := initcap(v_trimmed);
  v_code := lower(regexp_replace(v_trimmed, '\s+', '_', 'g'));

  -- Insert new device type record
  insert into public.ui_device_types (id, code, label, sort_order, is_active)
  values (v_label, v_code, v_label, 50, true)
  on conflict (id) do update
  set is_active = true
  returning id into v_matched_id;

  return coalesce(v_matched_id, v_label);
end;
$$;

grant execute on function public.find_or_create_device_type(text) to authenticated, anon;


-- 2. get_unique_device_types helper RPC
create or replace function public.get_unique_device_types()
returns table (device_type text)
language sql
security definer
set search_path = public
as $$
  select distinct label as device_type
  from public.ui_device_types
  where is_active = true
  order by device_type asc;
$$;

grant execute on function public.get_unique_device_types() to authenticated, anon;

-- Notify PostgREST to reload schema cache
notify pgrst, 'reload schema';
