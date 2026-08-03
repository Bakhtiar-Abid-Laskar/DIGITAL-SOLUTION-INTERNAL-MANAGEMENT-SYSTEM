-- Migration: 20260728000002_add_created_at_to_notifications.sql
-- Description: Add created_at column to notifications table for sorting and timestamps.

alter table public.notifications
  add column if not exists created_at timestamptz default now();
