-- Add missing columns to fix schema errors
-- This script adds firebase_uid to conversations and file_type to messages

-- Add firebase_uid column to conversations table
ALTER TABLE public.conversations 
ADD COLUMN IF NOT EXISTS firebase_uid text;

-- Add file_type column to messages table  
ALTER TABLE public.messages 
ADD COLUMN IF NOT EXISTS file_type text;

-- Add index for better performance on firebase_uid lookups
CREATE INDEX IF NOT EXISTS idx_conversations_firebase_uid 
ON public.conversations(firebase_uid);

-- Add index for file_type filtering
CREATE INDEX IF NOT EXISTS idx_messages_file_type 
ON public.messages(file_type);

-- Update RLS policies to include firebase_uid
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations" 
ON public.conversations FOR SELECT 
USING (
  auth.uid()::text = user_id OR 
  auth.uid()::text = firebase_uid
);

DROP POLICY IF EXISTS "Users can insert own conversations" ON public.conversations;
CREATE POLICY "Users can insert own conversations" 
ON public.conversations FOR INSERT 
WITH CHECK (
  auth.uid()::text = user_id OR 
  auth.uid()::text = firebase_uid
);

DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations" 
ON public.conversations FOR UPDATE 
USING (
  auth.uid()::text = user_id OR 
  auth.uid()::text = firebase_uid
);
