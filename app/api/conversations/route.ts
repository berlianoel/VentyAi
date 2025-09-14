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
    const firebaseUid = searchParams.get("firebaseUid")
    const page = Number.parseInt(searchParams.get("page") || "1")
    const limit = Number.parseInt(searchParams.get("limit") || "10")
    const offset = (page - 1) * limit

    if (!firebaseUid) {
      return NextResponse.json({ error: "Firebase UID required" }, { status: 400 })
    }

    console.log("[v0] Fetching conversations for user:", firebaseUid, "page:", page, "limit:", limit)

    const supabase = await getSupabaseClient()

    const { count } = await supabase
      .from("conversations")
      .select("*", { count: "exact", head: true })
      .eq("firebase_uid", firebaseUid)

    const { data: conversations, error } = await supabase
      .from("conversations")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .order("updated_at", { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error("[SERVER] Get conversations error:", error)
      return NextResponse.json({ error: "Database error", details: error.message }, { status: 500 })
    }

    console.log("[v0] Found conversations:", conversations?.length || 0, "total:", count)
    return NextResponse.json({
      conversations: conversations || [],
      total: count || 0,
      page,
      limit,
      hasMore: (count || 0) > offset + limit,
    })
  } catch (error) {
    console.error("[SERVER] Get conversations error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let requestBody
    try {
      requestBody = await request.json()
      console.log("[v0] Request body received:", requestBody)
    } catch (parseError) {
      console.error("[SERVER] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    const { id, title, firebaseUid } = requestBody

    if (!firebaseUid) {
      console.error("[v0] Missing firebaseUid in request")
      return NextResponse.json({ error: "Firebase UID required" }, { status: 400 })
    }

    console.log("[v0] Creating conversation for user:", firebaseUid, "with title:", title)

    const supabase = await getSupabaseClient()

    const conversationData = {
      firebase_uid: firebaseUid,
      title: title || "New Chat",
      ai_model: "fast",
      is_pinned: false,
      is_archived: false,
    }

    const { data: conversation, error } = await supabase
      .from("conversations")
      .insert(conversationData)
      .select()
      .single()

    if (error) {
      console.error("[SERVER] Create conversation error:", error)
      return NextResponse.json({ error: "Failed to create conversation", details: error.message }, { status: 500 })
    }

    console.log("[v0] Conversation created successfully:", conversation)
    return NextResponse.json({ conversation })
  } catch (error) {
    console.error("[SERVER] Create conversation error:", error)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
