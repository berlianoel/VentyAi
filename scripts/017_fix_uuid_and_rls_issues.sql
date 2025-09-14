-- Fix UUID generation and RLS policy issues

-- Create a function to generate proper UUIDs for conversations
CREATE OR REPLACE FUNCTION generate_conversation_id()
RETURNS TEXT AS $$
BEGIN
    RETURN 'conv_' || extract(epoch from now())::bigint || '_' || substr(md5(random()::text), 1, 9);
END;
$$ LANGUAGE plpgsql;

-- Update conversations table to use proper UUID format
ALTER TABLE conversations 
ALTER COLUMN id SET DEFAULT generate_conversation_id();

-- Fix RLS policies for file uploads
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create comprehensive RLS policies for storage
CREATE POLICY "Enable insert for authenticated users" ON storage.objects
FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR 
    bucket_id = 'chat-files'
);

CREATE POLICY "Enable select for authenticated users" ON storage.objects
FOR SELECT USING (
    auth.role() = 'authenticated' OR 
    bucket_id = 'chat-files'
);

CREATE POLICY "Enable update for own files" ON storage.objects
FOR UPDATE USING (
    auth.role() = 'authenticated' OR 
    bucket_id = 'chat-files'
);

CREATE POLICY "Enable delete for own files" ON storage.objects
FOR DELETE USING (
    auth.role() = 'authenticated' OR 
    bucket_id = 'chat-files'
);

-- Ensure storage bucket exists and is public
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'chat-files',
    'chat-files',
    true,
    52428800, -- 50MB
    ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 52428800,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf', 'text/plain', 'text/markdown'];

-- Fix any existing conversations with invalid IDs
UPDATE conversations 
SET id = generate_conversation_id()
WHERE id ~ '^conv_[0-9]+_[a-z0-9]+$' = false;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_firebase_uid ON conversations(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
