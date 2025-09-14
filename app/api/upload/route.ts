import { type NextRequest, NextResponse } from "next/server"
import { getSupabaseServiceClient } from "@/lib/supabase/config"

const convertToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File
    const firebaseUid = formData.get("firebaseUid") as string

    if (!file || !firebaseUid) {
      return NextResponse.json({ error: "File and Firebase UID required" }, { status: 400 })
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File size must be less than 10MB" }, { status: 400 })
    }

    // Check file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "text/markdown",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "File type not supported" }, { status: 400 })
    }

    try {
      const supabase = getSupabaseServiceClient()

      // Check if user exists
      const { data: users, error: userError } = await supabase.from("users").select("*").eq("firebase_uid", firebaseUid)

      if (userError || !users || users.length === 0) {
        console.error("[v0] User lookup error:", userError)
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      const fileExt = file.name.split(".").pop()
      const fileName = `${firebaseUid}/${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`

      console.log("[v0] Uploading to Supabase storage:", fileName)

      const { data: uploadData, error: uploadError } = await supabase.storage.from("files").upload(fileName, file, {
        cacheControl: "3600",
        upsert: false,
      })

      if (uploadError) {
        console.error("[v0] Supabase storage error:", uploadError.message)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      console.log("[v0] Supabase upload successful:", uploadData)

      const {
        data: { publicUrl },
      } = supabase.storage.from("files").getPublicUrl(fileName)

      const { data: fileRecord, error: dbError } = await supabase
        .from("file_uploads")
        .insert({
          firebase_uid: firebaseUid,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: publicUrl,
          storage_path: fileName,
        })
        .select()
        .single()

      if (dbError) {
        console.error("[v0] File record save error:", dbError)
        await supabase.storage.from("files").remove([fileName])
        throw new Error("Database save failed")
      }

      console.log("[v0] File record saved successfully")

      return NextResponse.json({
        file: {
          id: fileRecord.id,
          filename: fileRecord.filename,
          file_type: fileRecord.file_type,
          file_size: fileRecord.file_size,
          file_url: fileRecord.file_url,
          created_at: fileRecord.created_at,
        },
        url: fileRecord.file_url,
        storage_type: "supabase",
      })
    } catch (supabaseError) {
      console.error("[v0] Supabase upload failed, falling back to base64:", supabaseError)

      try {
        const base64Data = await convertToBase64(file)

        const fileRecord = {
          id: `base64_${Date.now()}_${Math.random().toString(36).substring(2)}`,
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          file_url: base64Data,
          created_at: new Date().toISOString(),
        }

        console.log("[v0] Upload successful: base64", file.name)

        return NextResponse.json({
          file: fileRecord,
          url: base64Data,
          storage_type: "base64",
          message: "File stored as base64 (Supabase unavailable)",
        })
      } catch (base64Error) {
        console.error("[v0] Base64 conversion failed:", base64Error)
        return NextResponse.json({ error: "File processing failed" }, { status: 500 })
      }
    }
  } catch (error) {
    console.error("[v0] Upload API error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
