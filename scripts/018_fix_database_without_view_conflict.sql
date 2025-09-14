-- Create new script to fix UUID issues without altering existing view-dependent columns
-- Drop the problematic view first, then recreate it after changes
DROP VIEW IF EXISTS conversation_with_last_message;

-- Add uuid extension if not exists
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create a new conversations table with proper UUID
CREATE TABLE IF NOT EXISTS conversations_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT NOT NULL,
    title TEXT DEFAULT 'New Chat',
    ai_model TEXT DEFAULT 'fast',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy data from old table if it exists
INSERT INTO conversations_new (firebase_uid, title, ai_model, is_pinned, is_archived, created_at, updated_at)
SELECT firebase_uid, title, ai_model, is_pinned, is_archived, created_at, updated_at
FROM conversations
ON CONFLICT DO NOTHING;

-- Drop old table and rename new one
DROP TABLE IF EXISTS conversations CASCADE;
ALTER TABLE conversations_new RENAME TO conversations;

-- Create messages table with proper UUID foreign key
CREATE TABLE IF NOT EXISTS messages_new (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Copy messages data if old table exists
INSERT INTO messages_new (conversation_id, role, content, file_url, file_type, created_at)
SELECT 
    (SELECT c.id FROM conversations c WHERE c.firebase_uid = m.conversation_id LIMIT 1),
    role, content, file_url, file_type, created_at
FROM messages m
WHERE EXISTS (SELECT 1 FROM conversations c WHERE c.firebase_uid = m.conversation_id)
ON CONFLICT DO NOTHING;

-- Drop old messages table and rename new one
DROP TABLE IF EXISTS messages CASCADE;
ALTER TABLE messages_new RENAME TO messages;

-- Recreate the view with proper UUID support
CREATE VIEW conversation_with_last_message AS
SELECT 
    c.*,
    m.content as last_message_content,
    m.created_at as last_message_time
FROM conversations c
LEFT JOIN LATERAL (
    SELECT content, created_at
    FROM messages
    WHERE conversation_id = c.id
    ORDER BY created_at DESC
    LIMIT 1
) m ON true;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_firebase_uid ON conversations(firebase_uid);
CREATE INDEX IF NOT EXISTS idx_conversations_updated_at ON conversations(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);

-- Update RLS policies for conversations
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can insert own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can update own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can delete own conversations" ON conversations;

CREATE POLICY "Users can view own conversations" ON conversations
    FOR SELECT USING (firebase_uid = current_setting('app.current_user_id', true));

CREATE POLICY "Users can insert own conversations" ON conversations
    FOR INSERT WITH CHECK (firebase_uid = current_setting('app.current_user_id', true));

CREATE POLICY "Users can update own conversations" ON conversations
    FOR UPDATE USING (firebase_uid = current_setting('app.current_user_id', true));

CREATE POLICY "Users can delete own conversations" ON conversations
    FOR DELETE USING (firebase_uid = current_setting('app.current_user_id', true));

-- Update RLS policies for messages
DROP POLICY IF EXISTS "Users can view messages from own conversations" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to own conversations" ON messages;
DROP POLICY IF EXISTS "Users can update messages in own conversations" ON messages;
DROP POLICY IF EXISTS "Users can delete messages from own conversations" ON messages;

CREATE POLICY "Users can view messages from own conversations" ON messages
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND firebase_uid = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can insert messages to own conversations" ON messages
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND firebase_uid = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can update messages in own conversations" ON messages
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND firebase_uid = current_setting('app.current_user_id', true)
        )
    );

CREATE POLICY "Users can delete messages from own conversations" ON messages
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM conversations 
            WHERE id = messages.conversation_id 
            AND firebase_uid = current_setting('app.current_user_id', true)
        )
    );

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Fix storage policies for file uploads
INSERT INTO storage.buckets (id, name, public) 
VALUES ('chat-files', 'chat-files', false)
ON CONFLICT (id) DO NOTHING;

-- Drop existing storage policies
DROP POLICY IF EXISTS "Users can upload files" ON storage.objects;
DROP POLICY IF EXISTS "Users can view own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own files" ON storage.objects;

-- Create comprehensive storage policies
CREATE POLICY "Users can upload files" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'chat-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can view own files" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'chat-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );

CREATE POLICY "Users can delete own files" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'chat-files' AND
        auth.uid()::text = (storage.foldername(name))[1]
    );
