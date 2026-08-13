ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS device_before_url text;
ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS device_after_url text;
