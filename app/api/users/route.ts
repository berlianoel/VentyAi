import { type NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  "https://tptoxfmfqpgzbijtsrll.supabase.co",
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRwdG94Zm1mcXBnemJpanRzcmxsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NjgxNTI0OCwiZXhwIjoyMDcyMzkxMjQ4fQ.WZqstoX3Ax99DCl3aUmykG5U90Cx20Bk6g2btItNoDI",
)

export async function POST(request: NextRequest) {
  try {
    const { email, displayName, firebaseUid } = await request.json()

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    console.log("[SERVER] Users API POST - Creating/finding user:", email)

    // Check if user already exists by email
    const { data: existingUsers, error: selectError } = await supabase.from("users").select("*").eq("email", email)

    if (selectError) {
      console.error("[SERVER] Users API POST - Select Error:", selectError.message)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (existingUsers && existingUsers.length > 0) {
      console.log("[SERVER] Users API POST - User exists:", existingUsers[0].id)
      return NextResponse.json({ user: existingUsers[0] })
    }

    const { data: newUsers, error: insertError } = await supabase
      .from("users")
      .insert({
        email: email,
        display_name: displayName || email.split("@")[0],
        firebase_uid: firebaseUid || `temp_${Date.now()}`,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()

    if (insertError) {
      console.error("[SERVER] Users API POST - Insert Error:", insertError.message)
      console.log("[SERVER] Failed to create user in database")
      return NextResponse.json({ error: "Failed to create user" }, { status: 500 })
    }

    console.log("[SERVER] Users API POST - User created:", newUsers[0].id)
    return NextResponse.json({ user: newUsers[0] })
  } catch (error) {
    console.error("[SERVER] Users API POST - Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }

    console.log("[SERVER] Users API GET - Looking up user:", email)

    const { data: users, error } = await supabase.from("users").select("*").eq("email", email)

    if (error) {
      console.error("[SERVER] Users API GET - Error:", error.message)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    if (!users || users.length === 0) {
      console.log("[SERVER] Users API GET - User not found")
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    console.log("[SERVER] Users API GET - User found:", users[0].id)
    return NextResponse.json({ user: users[0] })
  } catch (error) {
    console.error("[SERVER] Users API GET - Error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
