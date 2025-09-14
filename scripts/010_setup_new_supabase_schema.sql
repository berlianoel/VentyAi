-- Create comprehensive database schema for enhanced chat functionality
-- Drop existing tables if they exist to start fresh
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;
DROP TABLE IF EXISTS public.chat_files CASCADE;

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create users table for profile management
CREATE TABLE public.users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firebase_uid TEXT UNIQUE NOT NULL,
    email TEXT,
    display_name TEXT,
    avatar_url TEXT,
    subscription_type TEXT DEFAULT 'free' CHECK (subscription_type IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table with enhanced features
CREATE TABLE public.conversations (
    id TEXT PRIMARY KEY,
    firebase_uid TEXT NOT NULL REFERENCES public.users(firebase_uid) ON DELETE CASCADE,
    title TEXT NOT NULL DEFAULT 'New Chat',
    ai_model TEXT DEFAULT 'fast',
    is_pinned BOOLEAN DEFAULT FALSE,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table with file support
CREATE TABLE public.messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id TEXT NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
    content TEXT NOT NULL,
    file_url TEXT,
    file_type TEXT,
    file_name TEXT,
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create chat_files table for file management
CREATE TABLE public.chat_files (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    firebase_uid TEXT NOT NULL REFERENCES public.users(firebase_uid) ON DELETE CASCADE,
    conversation_id TEXT REFERENCES public.conversations(id) ON DELETE CASCADE,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL,
    public_url TEXT,
    base64_data TEXT, -- For base64 storage option
    upload_method TEXT DEFAULT 'supabase' CHECK (upload_method IN ('supabase', 'base64', 'url')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_conversations_firebase_uid ON public.conversations(firebase_uid);
CREATE INDEX idx_conversations_updated_at ON public.conversations(updated_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at DESC);
CREATE INDEX idx_chat_files_firebase_uid ON public.chat_files(firebase_uid);
CREATE INDEX idx_chat_files_conversation_id ON public.chat_files(conversation_id);

-- Enable Row Level Security (RLS)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for users table
CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (firebase_uid = auth.uid()::text);

-- Create RLS policies for conversations table
CREATE POLICY "Users can view own conversations" ON public.conversations
    FOR SELECT USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create own conversations" ON public.conversations
    FOR INSERT WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update own conversations" ON public.conversations
    FOR UPDATE USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can delete own conversations" ON public.conversations
    FOR DELETE USING (firebase_uid = auth.uid()::text);

-- Create RLS policies for messages table
CREATE POLICY "Users can view messages in own conversations" ON public.messages
    FOR SELECT USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE firebase_uid = auth.uid()::text
        )
    );

CREATE POLICY "Users can create messages in own conversations" ON public.messages
    FOR INSERT WITH CHECK (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE firebase_uid = auth.uid()::text
        )
    );

CREATE POLICY "Users can update messages in own conversations" ON public.messages
    FOR UPDATE USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE firebase_uid = auth.uid()::text
        )
    );

CREATE POLICY "Users can delete messages in own conversations" ON public.messages
    FOR DELETE USING (
        conversation_id IN (
            SELECT id FROM public.conversations WHERE firebase_uid = auth.uid()::text
        )
    );

-- Create RLS policies for chat_files table
CREATE POLICY "Users can view own files" ON public.chat_files
    FOR SELECT USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can create own files" ON public.chat_files
    FOR INSERT WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can update own files" ON public.chat_files
    FOR UPDATE USING (firebase_uid = auth.uid()::text);

CREATE POLICY "Users can delete own files" ON public.chat_files
    FOR DELETE USING (firebase_uid = auth.uid()::text);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_messages_updated_at BEFORE UPDATE ON public.messages
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
