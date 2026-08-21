-- M3. Drop RLS policies for the orphaned `avatars` storage bucket
-- The avatar feature was scrapped and no UI components reference this bucket.
-- NOTE: We cannot DROP the bucket itself here because Supabase triggers `storage.protect_delete()` 
-- to prevent orphaned S3 objects. The physical bucket must be deleted via the Supabase Dashboard.

-- 1. Remove RLS policies tied to the bucket
DROP POLICY IF EXISTS "Allow authenticated users access to avatars" ON storage.objects;
DROP POLICY IF EXISTS "Allow public view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users upload avatars" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users view avatars" ON storage.objects;
DROP POLICY IF EXISTS "Public view avatars" ON storage.objects;
