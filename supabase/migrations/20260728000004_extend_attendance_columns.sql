-- Migration: 20260728000004_extend_attendance_columns.sql
-- Description: Extend public.attendance table with check_in_selfie_url, check_out_selfie_url, check_out_gps_lat, and check_out_gps_lng.

alter table public.attendance
  add column if not exists check_in_selfie_url text,
  add column if not exists check_out_selfie_url text,
  add column if not exists check_out_gps_lat numeric,
  add column if not exists check_out_gps_lng numeric;
