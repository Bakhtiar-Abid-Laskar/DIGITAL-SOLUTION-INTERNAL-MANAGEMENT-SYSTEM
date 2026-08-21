-- Migration: 20260821700000_add_user_last_login_at.sql
-- Description: Adds last_login_at to public.users and provides secure RPC to record logins

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_login_at timestamptz DEFAULT null;

-- Function to safely record login timestamp for the calling user
CREATE OR REPLACE FUNCTION public.record_user_login()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
BEGIN
  UPDATE public.users
  SET last_login_at = v_now
  WHERE id = auth.uid();
  
  RETURN v_now;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_user_login() TO authenticated;
