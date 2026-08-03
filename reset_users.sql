-- WARNING: This script deletes ALL existing users, jobs, attendance, and billing data. 
-- Do not run this in a production environment if you need to keep existing data!

-- 1. Delete all existing data from public tables that depend on users
DELETE FROM public.salary;
DELETE FROM public.staff_rates;
DELETE FROM public.payments;
DELETE FROM public.billing;
DELETE FROM public.onsite_visits;
DELETE FROM public.attendance;
DELETE FROM public.job_materials;
DELETE FROM public.notifications;
DELETE FROM public.jobs;
DELETE FROM public.users;

-- 2. Delete all users from auth.users (cascades to auth.identities)
DELETE FROM auth.users;

-- 3. Create the standard users in auth.users
-- The password for all 3 users is set to: password123
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password, 
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, 
  created_at, updated_at, is_super_admin, is_sso_user,
  confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES 
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-1111-1111-111111111111', 'authenticated', 'authenticated', 'admin@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-2222-2222-222222222222', 'authenticated', 'authenticated', 'reception@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false, '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-3333-3333-333333333333', 'authenticated', 'authenticated', 'tech@test.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{}', now(), now(), false, false, '', '', '', '');

-- 4. Create the auth.identities for these users
INSERT INTO auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
VALUES
  (gen_random_uuid(), '11111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', format('{"sub":"%s","email":"%s","email_verified":true}', '11111111-1111-1111-1111-111111111111', 'admin@test.com')::jsonb, 'email', now(), now(), now()),
  (gen_random_uuid(), '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', format('{"sub":"%s","email":"%s","email_verified":true}', '22222222-2222-2222-2222-222222222222', 'reception@test.com')::jsonb, 'email', now(), now(), now()),
  (gen_random_uuid(), '33333333-3333-3333-3333-333333333333', '33333333-3333-3333-3333-333333333333', format('{"sub":"%s","email":"%s","email_verified":true}', '33333333-3333-3333-3333-333333333333', 'tech@test.com')::jsonb, 'email', now(), now(), now());

-- 5. Insert corresponding users into public.users with their active roles
INSERT INTO public.users (id, name, email, phone, role, is_active, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'System Admin', 'admin@test.com', '1234567890', 'admin', true, now()),
  ('22222222-2222-2222-2222-222222222222', 'Front Desk', 'reception@test.com', '1234567891', 'receptionist', true, now()),
  ('33333333-3333-3333-3333-333333333333', 'Lead Technician', 'tech@test.com', '1234567892', 'technician', true, now());
