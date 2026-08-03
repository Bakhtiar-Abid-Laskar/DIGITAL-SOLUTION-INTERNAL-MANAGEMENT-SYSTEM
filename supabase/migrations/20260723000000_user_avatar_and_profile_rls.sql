-- Migration: Add avatar_url column to users, add self-service UPDATE policy, and create profile-pictures bucket
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Policy allowing users to update their own profile row (phone, email, avatar_url)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'users' AND policyname = 'Users can update their own profile'
  ) THEN
    CREATE POLICY "Users can update their own profile" ON public.users
      FOR UPDATE TO authenticated
      USING (id = auth.uid())
      WITH CHECK (id = auth.uid());
  END IF;
END $$;

-- Create private storage bucket 'profile-pictures' if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-pictures', 'profile-pictures', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for profile-pictures bucket
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Users can upload their own profile picture'
  ) THEN
    CREATE POLICY "Users can upload their own profile picture"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (
      bucket_id = 'profile-pictures' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Users can update their own profile picture'
  ) THEN
    CREATE POLICY "Users can update their own profile picture"
    ON storage.objects FOR UPDATE TO authenticated
    USING (
      bucket_id = 'profile-pictures' AND
      (storage.foldername(name))[1] = auth.uid()::text
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' AND policyname = 'Authenticated users can read profile pictures'
  ) THEN
    CREATE POLICY "Authenticated users can read profile pictures"
    ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'profile-pictures');
  END IF;
END $$;
