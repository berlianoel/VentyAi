-- Fix storage RLS policies to allow file uploads
-- This script fixes the "new row violates row-level security policy" error

-- Create storage bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- Disable RLS for development (you can enable specific policies later)
ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;
ALTER TABLE storage.buckets DISABLE ROW LEVEL SECURITY;

-- Or if you prefer specific policies, use these instead:
-- DROP POLICY IF EXISTS "Allow insert files" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow select files" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow update files" ON storage.objects;
-- DROP POLICY IF EXISTS "Allow delete files" ON storage.objects;

-- CREATE POLICY "Allow insert files" ON storage.objects
-- FOR INSERT WITH CHECK (bucket_id = 'files');

-- CREATE POLICY "Allow select files" ON storage.objects
-- FOR SELECT USING (bucket_id = 'files');

-- CREATE POLICY "Allow update files" ON storage.objects
-- FOR UPDATE USING (bucket_id = 'files');

-- CREATE POLICY "Allow delete files" ON storage.objects
-- FOR DELETE USING (bucket_id = 'files');

-- Ensure the bucket allows public access
UPDATE storage.buckets 
SET public = true 
WHERE id = 'files';
