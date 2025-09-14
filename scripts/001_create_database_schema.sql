-- Create users table for profiles
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  firebase_uid TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  subscription_type TEXT DEFAULT 'lite' CHECK (subscription_type IN ('lite', 'pro')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create conversations table
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Chat',
  ai_model TEXT NOT NULL DEFAULT 'openrouter',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  file_url TEXT,
  file_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create files table for uploaded files
CREATE TABLE IF NOT EXISTS public.files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users table
CREATE POLICY "Users can view their own profile" ON public.users
  FOR SELECT USING (firebase_uid = current_setting('app.current_user_firebase_uid', true));

CREATE POLICY "Users can update their own profile" ON public.users
  FOR UPDATE USING (firebase_uid = current_setting('app.current_user_firebase_uid', true));

CREATE POLICY "Users can insert their own profile" ON public.users
  FOR INSERT WITH CHECK (firebase_uid = current_setting('app.current_user_firebase_uid', true));

-- RLS Policies for conversations table
CREATE POLICY "Users can view their own conversations" ON public.conversations
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

CREATE POLICY "Users can create their own conversations" ON public.conversations
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

CREATE POLICY "Users can update their own conversations" ON public.conversations
  FOR UPDATE USING (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

CREATE POLICY "Users can delete their own conversations" ON public.conversations
  FOR DELETE USING (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

-- RLS Policies for messages table
CREATE POLICY "Users can view messages from their conversations" ON public.messages
  FOR SELECT USING (conversation_id IN (
    SELECT id FROM public.conversations WHERE user_id IN (
      SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)
    )
  ));

CREATE POLICY "Users can create messages in their conversations" ON public.messages
  FOR INSERT WITH CHECK (conversation_id IN (
    SELECT id FROM public.conversations WHERE user_id IN (
      SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)
    )
  ));

-- RLS Policies for files table
CREATE POLICY "Users can view their own files" ON public.files
  FOR SELECT USING (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

CREATE POLICY "Users can upload their own files" ON public.files
  FOR INSERT WITH CHECK (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

CREATE POLICY "Users can delete their own files" ON public.files
  FOR DELETE USING (user_id IN (SELECT id FROM public.users WHERE firebase_uid = current_setting('app.current_user_firebase_uid', true)));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON public.files(user_id);
CREATE INDEX IF NOT EXISTS idx_users_firebase_uid ON public.users(firebase_uid);
