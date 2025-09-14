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
    const limit = searchParams.get("limit")

    if (!firebaseUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase UID required",
        },
        { status: 400 },
      )
    }

    const supabase = await getSupabaseClient()

    let query = supabase
      .from("conversations")
      .select("*")
      .eq("firebase_uid", firebaseUid)
      .order("updated_at", { ascending: false })

    if (limit) {
      query = query.limit(Number.parseInt(limit))
    }

    const { data: conversations, error } = await query

    if (error) {
      console.error("[NATIVE API] Get conversations error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Database error",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: conversations || [],
      count: conversations?.length || 0,
    })
  } catch (error) {
    console.error("[NATIVE API] Get conversations error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 },
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json()
    const { title, firebaseUid } = requestBody

    if (!firebaseUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase UID required",
        },
        { status: 400 },
      )
    }

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
      console.error("[NATIVE API] Create conversation error:", error)
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create conversation",
          details: error.message,
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      success: true,
      data: conversation,
    })
  } catch (error) {
    console.error("[NATIVE API] Create conversation error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Server error",
      },
      { status: 500 },
    )
  }
}
