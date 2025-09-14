import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"

export async function POST(request: NextRequest) {
  try {
    const { userId, subscriptionType, firebaseUid } = await request.json()

    if (!userId || !subscriptionType || !firebaseUid) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    if (!["lite", "pro"].includes(subscriptionType)) {
      return NextResponse.json({ error: "Invalid subscription type" }, { status: 400 })
    }

    const supabase = await createClient()

    // Update user subscription
    const { data, error } = await supabase
      .from("users")
      .update({
        subscription_type: subscriptionType,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ user: data })
  } catch (error) {
    console.error("Update subscription error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
