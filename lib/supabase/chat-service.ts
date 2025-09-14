import { createClient } from "@/lib/supabase/client"
import type { Database } from "@/lib/supabase/types"
import { v4 as uuidv4 } from "uuid"

type Conversation = Database["public"]["Tables"]["conversations"]["Row"]
type Message = Database["public"]["Tables"]["messages"]["Row"]

export class ChatService {
  private supabase = createClient()

  private generateConversationId(): string {
    try {
      // Use uuid library for proper UUID generation
      return uuidv4()
    } catch (error) {
      console.error("UUID generation error:", error)
      // Fallback to crypto.randomUUID() if available
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID()
      }

      // Final fallback to timestamp-based ID
      const timestamp = Date.now()
      const randomPart = Math.random().toString(36).substring(2, 11)
      return `conv_${timestamp}_${randomPart}`
    }
  }

  async getConversations(firebaseUid: string) {
    const { data, error } = await this.supabase
      .from("conversations")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .order("updated_at", { ascending: false })

    if (error) {
      console.error("Error fetching conversations:", error)
      return []
    }

    return data || []
  }

  async createConversation(firebaseUid: string, title = "New Chat") {
    const conversationId = this.generateConversationId()

    console.log("[v0] Creating conversation with ID:", conversationId)

    const conversationData = {
      id: conversationId,
      firebase_uid: firebaseUid,
      title,
      ai_model: "fast",
      is_pinned: false,
      is_archived: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await this.supabase.from("conversations").insert(conversationData).select().single()

    if (error) {
      console.error("Error creating conversation:", error)
      return conversationData
    }

    console.log("[v0] Conversation created successfully:", data)
    return data
  }

  async updateConversation(conversationId: string, updates: Partial<Conversation>) {
    const { data, error } = await this.supabase
      .from("conversations")
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .select()
      .single()

    if (error) {
      console.error("Error updating conversation:", error)
      return null
    }

    return data
  }

  async deleteConversation(conversationId: string) {
    // First delete all messages in the conversation
    const { error: messagesError } = await this.supabase.from("messages").delete().eq("conversation_id", conversationId)

    if (messagesError) {
      console.error("Error deleting messages:", messagesError)
    }

    // Then delete the conversation
    const { error } = await this.supabase.from("conversations").delete().eq("id", conversationId)

    if (error) {
      console.error("Error deleting conversation:", error)
      return false
    }

    return true
  }

  async getMessages(conversationId: string, limit?: number) {
    let query = this.supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (limit) {
      query = query.limit(limit)
    }

    const { data, error } = await query

    if (error) {
      console.error("Error fetching messages:", error)
      return []
    }

    return data || []
  }

  async generateSmartTitle(content: string): Promise<string> {
    try {
      // Simple smart title generation based on content
      const cleanContent = content.trim()

      // Remove common question words and get the core topic
      const words = cleanContent
        .replace(/^(what|how|why|when|where|who|can|could|would|should|is|are|do|does|did)\s+/i, "")
        .split(" ")
        .slice(0, 6)
        .join(" ")

      // Capitalize first letter and limit length
      const title = words.charAt(0).toUpperCase() + words.slice(1)
      return title.length > 50 ? title.substring(0, 47) + "..." : title
    } catch (error) {
      console.error("Error generating title:", error)
      return "New Chat"
    }
  }

  async getConversationWithPreview(conversationId: string) {
    const conversation = await this.supabase.from("conversations").select("*").eq("id", conversationId).single()

    if (conversation.error) {
      return null
    }

    const messages = await this.getMessages(conversationId, 2)

    let messagePreview = "No messages yet"
    if (messages.length > 0) {
      const lastMessage = messages[messages.length - 1]
      const previewText = lastMessage.content?.substring(0, 60) || ""
      const rolePrefix = lastMessage.role === "user" ? "You: " : "AI: "
      messagePreview = rolePrefix + previewText + (lastMessage.content?.length > 60 ? "..." : "")
    }

    return {
      ...conversation.data,
      message_preview: messagePreview,
    }
  }
}

export const chatService = new ChatService()
