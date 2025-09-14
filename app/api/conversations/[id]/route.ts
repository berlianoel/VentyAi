import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { firebaseUid } = await request.json()
    const conversationId = params.id

    if (!firebaseUid || !conversationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    // Delete messages first
    await supabase.from("messages").delete().eq("conversation_id", conversationId)

    const { error } = await supabase
      .from("conversations")
      .delete()
      .eq("id", conversationId)
      .eq("firebase_uid", firebaseUid)

    if (error) {
      console.error("Delete conversation error:", error)
      return NextResponse.json({ error: "Failed to delete conversation" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { title, firebaseUid } = await request.json()
    const conversationId = params.id

    if (!title || !firebaseUid || !conversationId) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const supabase = await createClient()

    const { data, error } = await supabase
      .from("conversations")
      .update({
        title: title.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", conversationId)
      .eq("firebase_uid", firebaseUid)
      .select()
      .single()

    if (error) {
      console.error("Update conversation error:", error)
      return NextResponse.json({ error: "Failed to update conversation" }, { status: 500 })
    }

    return NextResponse.json({ conversation: data })
  } catch (error) {
    console.error("Update conversation error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
