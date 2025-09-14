import { type NextRequest, NextResponse } from "next/server"
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/config"

const getSupabaseClient = async () => {
  const { createClient } = await import("@supabase/supabase-js")
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase configuration missing")
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const conversationId = searchParams.get("conversationId")
    const firebaseUid = searchParams.get("firebaseUid")
    const limit = searchParams.get("limit")

    if (!conversationId || !firebaseUid) {
      return NextResponse.json({ error: "Conversation ID and Firebase UID required" }, { status: 400 })
    }

    console.log("[v0] Fetching messages for conversation:", conversationId, "user:", firebaseUid)

    const supabase = await getSupabaseClient()

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("[SERVER] Get messages error:", error)
      return NextResponse.json({ error: "Failed to load messages", details: error.message }, { status: 500 })
    }

    console.log("[v0] Found messages:", messages?.length || 0)
    return NextResponse.json({ messages: messages || [] })
  } catch (error) {
    console.error("[SERVER] Get messages error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let requestBody
    try {
      requestBody = await request.json()
      console.log("[v0] Message request received:", requestBody)
    } catch (parseError) {
      console.error("[SERVER] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { conversation_id, role, content, firebaseUid, file_type, file_url } = requestBody

    if (!conversation_id || !role || content === undefined || content === null || !firebaseUid) {
      console.error("[v0] Missing required fields:", { conversation_id, role, content, firebaseUid })
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await getSupabaseClient()

    const messageData = {
      conversation_id,
      role,
      content,
      file_url: file_url || null,
      file_type: file_type || null,
    }

    console.log("[v0] Inserting message:", messageData)

    const { data: message, error } = await supabase.from("messages").insert(messageData).select().single()

    if (error) {
      console.error("[SERVER] Create message error:", error)
      return NextResponse.json({ error: "Failed to save message", details: error.message }, { status: 500 })
    }

    console.log("[v0] Message saved successfully:", message.id)
    return NextResponse.json({ message })
  } catch (error) {
    console.error("[SERVER] Create message error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
