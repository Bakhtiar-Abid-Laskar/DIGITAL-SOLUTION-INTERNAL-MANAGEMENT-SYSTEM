-- Migration: 20260803000003_attendance_drive_links.sql
-- Description: Add Google Drive photo link columns to the attendance table.
--              Also adds Drive link column to onsite_visits.

-- Attendance table: Drive links for check-in and check-out selfies
alter table public.attendance
  add column if not exists checkin_photo_drive_link  text,
  add column if not exists checkout_photo_drive_link text;

-- Onsite visits table: Drive links for arrival and departure selfies
alter table public.onsite_visits
  add column if not exists arrival_photo_drive_link   text,
  add column if not exists departure_photo_drive_link text;

-- Comment for clarity
comment on column public.attendance.checkin_photo_drive_link  is 'Google Drive webViewLink for the check-in selfie WebP';
comment on column public.attendance.checkout_photo_drive_link is 'Google Drive webViewLink for the check-out selfie WebP';
comment on column public.onsite_visits.arrival_photo_drive_link   is 'Google Drive webViewLink for the onsite arrival selfie WebP';
comment on column public.onsite_visits.departure_photo_drive_link is 'Google Drive webViewLink for the onsite departure selfie WebP';
