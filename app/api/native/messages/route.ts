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
    const offset = searchParams.get("offset")

    if (!conversationId || !firebaseUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Conversation ID and Firebase UID required",
        },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseClient()

    let query = supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    if (offset) {
      query = query.range(Number.parseInt(offset), Number.parseInt(offset) + (Number.parseInt(limit) || 50) - 1)
    }

    const { data: messages, error } = await query

    if (error) {
      console.error("[NATIVE API] Get messages error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to load messages",
          details: error.message,
        },
        { status: 500 },
      )
    }

    // Process messages for native app (replace expired image URLs)
    const processedMessages = (messages || []).map((msg) => ({
      ...msg,
      file_url:
        msg.file_url && (msg.file_url.includes("blob.v0.dev") || msg.file_url.includes("supabase"))
          ? null // Remove expired URLs for native app
          : msg.file_url,
      is_image_expired: msg.file_url && (msg.file_url.includes("blob.v0.dev") || msg.file_url.includes("supabase")),
    }))

    return NextResponse.json({
      success: true,
      data: processedMessages,
      count: processedMessages.length,
    })
  } catch (error) {
    console.error("[NATIVE API] Get messages error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { conversation_id, role, content, firebaseUid, file_type, file_url } = requestBody

    if (!conversation_id || !role || !content || !firebaseUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseClient()

    const messageData = {
      conversation_id,
      role,
      content,
      file_url: file_url || null,
      file_type: file_type || null,
    }

    const { data: message, error } = await supabase.from("messages").insert(messageData).select().single()

    if (error) {
      console.error("[NATIVE API] Create message error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to save message",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: message,
    })
  } catch (error) {
    console.error("[NATIVE API] Create message error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
      },
      { status: 500 },
    )
  }
}
