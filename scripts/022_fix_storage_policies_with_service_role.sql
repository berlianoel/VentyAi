-- Fix storage RLS policies using service role permissions
-- This script should be run with service role credentials

-- First, ensure the files bucket exists
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'files',
  'files',
  true,
  52428800, -- 50MB limit
  ARRAY['image/*', 'application/pdf', 'text/*', 'application/json']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY['image/*', 'application/pdf', 'text/*', 'application/json'];

-- Enable RLS on storage.objects (if not already enabled)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow authenticated users to upload files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own files" ON storage.objects;

-- Create policies for file operations
CREATE POLICY "Allow authenticated users to upload files"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'files' AND
  auth.role() = 'authenticated'
);

CREATE POLICY "Allow public access to files"
ON storage.objects
FOR SELECT
USING (bucket_id = 'files');

CREATE POLICY "Allow users to delete their own files"
ON storage.objects
FOR DELETE
USING (
  bucket_id = 'files' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT ALL ON storage.buckets TO authenticated;

-- Create a function to handle file uploads with proper permissions
CREATE OR REPLACE FUNCTION handle_file_upload()
RETURNS TRIGGER AS $$
BEGIN
  -- Allow file uploads for authenticated users
  IF auth.role() = 'authenticated' THEN
    RETURN NEW;
  END IF;
  
  -- Reject unauthorized uploads
  RAISE EXCEPTION 'Unauthorized file upload';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for file upload validation
DROP TRIGGER IF EXISTS validate_file_upload ON storage.objects;
CREATE TRIGGER validate_file_upload
  BEFORE INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION handle_file_upload();
