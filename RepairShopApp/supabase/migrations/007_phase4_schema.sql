-- Update onsite_visits to support 2 arrival photos
ALTER TABLE onsite_visits ADD COLUMN IF NOT EXISTS arrival_selfie_2_url text;

-- Update job_materials to support optional material photo
ALTER TABLE job_materials ADD COLUMN IF NOT EXISTS photo_url text;
