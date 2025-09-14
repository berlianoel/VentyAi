export interface User {
  id: string
  firebase_uid: string
  email?: string
  display_name?: string
  avatar_url?: string
  subscription_type: "free" | "pro"
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  firebase_uid: string
  title: string
  ai_model: string
  is_pinned: boolean
  is_archived: boolean
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  conversation_id: string
  role: "user" | "assistant" | "system"
  content: string
  file_url?: string
  file_type?: string
  file_name?: string
  file_size?: number
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export interface ChatFile {
  id: string
  firebase_uid: string
  conversation_id?: string
  filename: string
  file_type: string
  file_size: number
  storage_path: string
  public_url?: string
  base64_data?: string
  upload_method: "supabase" | "base64" | "url"
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      users: {
        Row: User
        Insert: Omit<User, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<User, "id" | "firebase_uid" | "created_at">>
      }
      conversations: {
        Row: Conversation
        Insert: Omit<Conversation, "created_at" | "updated_at">
        Update: Partial<Omit<Conversation, "id" | "firebase_uid" | "created_at">>
      }
      messages: {
        Row: Message
        Insert: Omit<Message, "id" | "created_at" | "updated_at">
        Update: Partial<Omit<Message, "id" | "conversation_id" | "created_at">>
      }
      chat_files: {
        Row: ChatFile
        Insert: Omit<ChatFile, "id" | "created_at">
        Update: Partial<Omit<ChatFile, "id" | "firebase_uid" | "created_at">>
      }
    }
  }
}
