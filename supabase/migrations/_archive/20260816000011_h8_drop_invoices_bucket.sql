-- H8. Drop RLS policies for the obsolete `invoices` storage bucket
-- Invoices are generated dynamically and saved to Google Drive, rendering this bucket obsolete.
-- NOTE: We cannot DROP the bucket itself here because Supabase triggers `storage.protect_delete()` 
-- to prevent orphaned S3 objects. The physical bucket must be deleted via the Supabase Dashboard.

-- 1. Remove RLS policies tied to the bucket
DROP POLICY IF EXISTS "Allow authenticated users access to invoices" ON storage.objects;
