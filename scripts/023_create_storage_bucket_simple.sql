-- Create storage bucket for chat files (simple approach)
-- This only creates the bucket, no RLS modifications needed

-- Create 'files' bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', true)
ON CONFLICT (id) DO NOTHING;

-- The bucket is public for reading files via URL
-- Upload/download operations will use service_role key from backend
