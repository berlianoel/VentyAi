import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { content, conversationId, firebaseUid } = await request.json()

    if (!content || !conversationId || !firebaseUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Generate a smart title from the content
    let title = "New Chat"

    // Simple title generation logic
    const cleanContent = content
      .trim()
      .replace(/[^\w\s]/g, "")
      .substring(0, 50)

    // Common question patterns
    if (cleanContent.toLowerCase().startsWith("what")) {
      title = cleanContent.substring(0, 30) + (cleanContent.length > 30 ? "..." : "")
    } else if (cleanContent.toLowerCase().startsWith("how")) {
      title = cleanContent.substring(0, 30) + (cleanContent.length > 30 ? "..." : "")
    } else if (cleanContent.toLowerCase().startsWith("why")) {
      title = cleanContent.substring(0, 30) + (cleanContent.length > 30 ? "..." : "")
    } else if (cleanContent.toLowerCase().includes("explain")) {
      title = "Explain " + cleanContent.split("explain")[1]?.trim().substring(0, 20) + "..."
    } else {
      // For other content, take first meaningful words
      const words = cleanContent.split(" ").slice(0, 5)
      title = words.join(" ") + (cleanContent.split(" ").length > 5 ? "..." : "")
    }

    // Update the conversation title in database
    try {
      const { createClient } = await import("@/lib/supabase/server")
      const supabase = await createClient()

      const { error } = await supabase
        .from("conversations")
        .update({ title })
        .eq("id", conversationId)
        .eq("firebase_uid", firebaseUid)

      if (error) {
        console.log("[v0] Title update error:", error)
      }
    } catch (dbError) {
      console.log("[v0] Database error:", dbError)
    }

    return NextResponse.json({ title })
  } catch (error) {
    console.error("[v0] Generate title error:", error)
    return NextResponse.json({ error: "Failed to generate title" }, { status: 500 })
  }
}
