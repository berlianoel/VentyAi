-- Final database schema fix to resolve all RLS and table issues
-- Drop existing tables to start fresh
DROP TABLE IF EXISTS public.messages CASCADE;
DROP TABLE IF EXISTS public.conversations CASCADE;
DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.file_uploads CASCADE;
DROP TABLE IF EXISTS public.users CASCADE;

-- Create users table that works with Firebase Auth
CREATE TABLE public.users (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid text UNIQUE NOT NULL,
  email text NOT NULL,
  display_name text,
  avatar_url text,
  subscription_type text DEFAULT 'lite' CHECK (subscription_type IN ('lite', 'pro')),
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create conversations table
CREATE TABLE public.conversations (
  id text PRIMARY KEY, -- Use text ID for compatibility
  firebase_uid text NOT NULL,
  title text NOT NULL DEFAULT 'New Chat',
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create messages table
CREATE TABLE public.messages (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id text NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content text NOT NULL,
  file_url text,
  file_type text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create file_uploads table for compatibility
CREATE TABLE public.file_uploads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  firebase_uid text NOT NULL,
  filename text NOT NULL,
  file_type text,
  file_size integer,
  file_url text,
  storage_path text,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.file_uploads ENABLE ROW LEVEL SECURITY;

-- Create permissive RLS policies for development
CREATE POLICY "Allow all operations on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on conversations" ON public.conversations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on messages" ON public.messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on file_uploads" ON public.file_uploads FOR ALL USING (true) WITH CHECK (true);

-- Create indexes
CREATE INDEX idx_conversations_firebase_uid ON public.conversations(firebase_uid);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_file_uploads_firebase_uid ON public.file_uploads(firebase_uid);
CREATE INDEX idx_users_firebase_uid ON public.users(firebase_uid);
