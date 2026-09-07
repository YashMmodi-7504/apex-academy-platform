-- ============================================================================
-- APEX ACADEMY — MIGRATION 00009: STORAGE BUCKETS CONFIGURATION
-- ============================================================================

-- Create private course-materials bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('course-materials', 'course-materials', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create private lesson-resources bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('lesson-resources', 'lesson-resources', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create private certificates bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('certificates', 'certificates', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Create public avatars bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Enable RLS on storage.objects to ensure safety
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Note: The backend uses the Supabase Service Role key, which inherently bypasses RLS.
-- This allows the Express server to upload and download from private buckets without explicit policies.
-- Public buckets like 'avatars' still require explicit SELECT policies for unauthenticated users.

-- 1. Policy for Public Avatars (Allows anyone to view them)
CREATE POLICY "Public Avatar Viewing"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'avatars');

-- 2. Policy for Authenticated users to upload/update their own avatars
CREATE POLICY "Users can upload their own avatars"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'avatars' 
    AND (auth.uid() = owner OR auth.uid()::text = (storage.foldername(name))[1])
  );

CREATE POLICY "Users can update their own avatars"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'avatars' 
    AND (auth.uid() = owner OR auth.uid()::text = (storage.foldername(name))[1])
  );
