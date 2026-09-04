-- ════════════════════════════════════════════════════════════════════════════
-- MIGRATION: Profile Pictures & Storage Configuration
-- Adds avatar_url to users table and configures the 'avatars' storage bucket
-- with secure RLS policies for uploading and viewing profile photos.
-- ════════════════════════════════════════════════════════════════════════════

-- 1. Ensure avatar_url column exists on public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Configure public storage bucket for avatars
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars', 
  'avatars', 
  true, 
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET 
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp'];

-- 3. Storage RLS Policies for avatars bucket
DO $$
BEGIN
  -- A. Public Read Access for avatar images
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_public_read'
  ) THEN
    CREATE POLICY "avatars_public_read" ON storage.objects
      FOR SELECT USING (bucket_id = 'avatars');
  END IF;

  -- B. Authenticated Users can upload avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_insert'
  ) THEN
    CREATE POLICY "avatars_auth_insert" ON storage.objects
      FOR INSERT TO authenticated 
      WITH CHECK (bucket_id = 'avatars');
  END IF;

  -- C. Authenticated Users can update avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_update'
  ) THEN
    CREATE POLICY "avatars_auth_update" ON storage.objects
      FOR UPDATE TO authenticated 
      USING (bucket_id = 'avatars');
  END IF;

  -- D. Authenticated Users can delete avatars
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'avatars_auth_delete'
  ) THEN
    CREATE POLICY "avatars_auth_delete" ON storage.objects
      FOR DELETE TO authenticated 
      USING (bucket_id = 'avatars');
  END IF;
END $$;

-- 4. Ensure users table allows updating own avatar_url
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own_profile'
  ) THEN
    CREATE POLICY "users_update_own_profile" ON public.users
      FOR UPDATE TO authenticated
      USING ((select auth.uid()) = id)
      WITH CHECK ((select auth.uid()) = id);
  END IF;
END $$;
