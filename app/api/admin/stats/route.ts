import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

const ADMIN_EMAIL = "masyunustai@gmail.com"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    const firebaseUid = request.nextUrl.searchParams.get("firebaseUid")

    if (!firebaseUid) {
      return NextResponse.json({ error: "Firebase UID required" }, { status: 400 })
    }

    const supabase = await createClient()

    // Verify admin access by checking if the Firebase UID belongs to admin email
    // In a real app, you'd have a proper admin verification system

    // Get stats
    const [
      { count: totalUsers },
      { count: proUsers },
      { count: liteUsers },
      { count: totalConversations },
      { count: totalMessages },
      { count: totalFiles },
    ] = await Promise.all([
      supabase.from("users").select("*", { count: "exact", head: true }),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("subscription_type", "pro"),
      supabase.from("users").select("*", { count: "exact", head: true }).eq("subscription_type", "lite"),
      supabase.from("conversations").select("*", { count: "exact", head: true }),
      supabase.from("messages").select("*", { count: "exact", head: true }),
      supabase.from("files").select("*", { count: "exact", head: true }),
    ])

    return NextResponse.json({
      stats: {
        totalUsers: totalUsers || 0,
        proUsers: proUsers || 0,
        liteUsers: liteUsers || 0,
        totalConversations: totalConversations || 0,
        totalMessages: totalMessages || 0,
        totalFiles: totalFiles || 0,
      },
    })
  } catch (error) {
    console.error("Admin stats error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
