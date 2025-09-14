import { createClient } from "@/lib/supabase/client"

export class FileService {
  private supabase = createClient()

  async uploadFile(
    file: File,
    userId: string,
    conversationId?: string,
  ): Promise<{ url: string; type: string; name: string; id: string } | null> {
    try {
      console.log("[v0] Starting file upload:", file.name, file.size, "bytes")

      // First try Supabase storage
      const supabaseResult = await this.uploadToSupabase(file, userId, conversationId)
      if (supabaseResult) {
        console.log("[v0] Supabase upload successful")
        return supabaseResult
      }

      // Fallback to base64 storage
      console.log("[v0] Supabase upload failed, falling back to base64")
      return await this.uploadAsBase64(file, userId, conversationId)
    } catch (error) {
      console.error("[v0] Upload error:", error)
      throw error // Throw error instead of returning null to provide better error handling
    }
  }

  private async uploadToSupabase(
    file: File,
    userId: string,
    conversationId?: string,
  ): Promise<{ url: string; type: string; name: string; id: string } | null> {
    try {
      // Generate unique file path
      const fileExt = file.name.split(".").pop() || "bin"
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`
      const filePath = `${userId}/${fileName}`

      console.log("[v0] Uploading to Supabase storage:", filePath)

      const uploadPromise = this.supabase.storage.from("chat-files").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
      })

      // Add 10 second timeout for Supabase upload
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Supabase upload timeout")), 10000)
      })

      const { data: uploadData, error: uploadError } = (await Promise.race([uploadPromise, timeoutPromise])) as any

      if (uploadError) {
        console.log("[v0] Supabase storage error:", uploadError.message)
        throw new Error(`Storage upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage.from("chat-files").getPublicUrl(filePath)

      if (!urlData.publicUrl) {
        throw new Error("Failed to get public URL")
      }

      let userRecord = null
      try {
        const { data: user, error: userError } = await this.supabase
          .from("users")
          .select("id")
          .eq("email", userId)
          .single()

        if (!userError && user) {
          userRecord = user
        }
      } catch (userLookupError) {
        console.log("[v0] User lookup failed, will use temporary ID")
      }

      if (!userRecord) {
        // Return file without database record for immediate use
        const tempId = `supabase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        return {
          url: urlData.publicUrl,
          type: file.type,
          name: file.name,
          id: tempId,
        }
      }

      // Save file record to database
      const { data: fileRecord, error: dbError } = await this.supabase
        .from("chat_files")
        .insert({
          user_id: userRecord.id,
          message_id: null, // Will be set when message is created
          filename: file.name,
          file_type: file.type,
          file_size: file.size,
          storage_path: filePath,
          storage_type: "supabase",
        })
        .select()
        .single()

      if (dbError) {
        console.error("[v0] Database error:", dbError)
        // Don't clean up file, just return with temp ID
        const tempId = `supabase_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        return {
          url: urlData.publicUrl,
          type: file.type,
          name: file.name,
          id: tempId,
        }
      }

      return {
        url: urlData.publicUrl,
        type: file.type,
        name: file.name,
        id: fileRecord.id,
      }
    } catch (error) {
      console.error("[v0] Supabase upload error:", error)
      return null
    }
  }

  private async uploadAsBase64(
    file: File,
    userId: string,
    conversationId?: string,
  ): Promise<{ url: string; type: string; name: string; id: string } | null> {
    try {
      console.log("[v0] Converting to base64...")

      const base64Promise = this.fileToBase64(file)
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Base64 conversion timeout")), 15000)
      })

      const base64Data = (await Promise.race([base64Promise, timeoutPromise])) as string

      let userRecord = null
      try {
        const { data: user, error: userError } = await this.supabase
          .from("users")
          .select("id")
          .eq("email", userId)
          .single()

        if (!userError && user) {
          userRecord = user
        }
      } catch (userLookupError) {
        console.log("[v0] User lookup failed for base64 upload")
      }

      if (!userRecord) {
        // Create a temporary ID for base64 uploads
        const tempId = `base64_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        return {
          url: base64Data,
          type: file.type,
          name: file.name,
          id: tempId,
        }
      }

      try {
        const { data: fileRecord, error: dbError } = await this.supabase
          .from("chat_files")
          .insert({
            user_id: userRecord.id,
            message_id: null,
            filename: file.name,
            file_type: file.type,
            file_size: file.size,
            storage_path: `base64/${Date.now()}-${file.name}`,
            base64_data: base64Data,
            storage_type: "base64",
          })
          .select()
          .single()

        if (!dbError && fileRecord) {
          return {
            url: base64Data,
            type: file.type,
            name: file.name,
            id: fileRecord.id,
          }
        }
      } catch (dbError) {
        console.log("[v0] Base64 database save failed, using temp ID")
      }

      // Return with temp ID if database save fails
      const tempId = `base64_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      return {
        url: base64Data,
        type: file.type,
        name: file.name,
        id: tempId,
      }
    } catch (error) {
      console.error("[v0] Base64 upload error:", error)
      throw error // Throw error instead of returning null
    }
  }

  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
          if (reader.result) {
            resolve(reader.result as string)
          } else {
            reject(new Error("Failed to read file"))
          }
        }
        reader.onerror = (error) => {
          console.error("[v0] FileReader error:", error)
          reject(new Error("FileReader failed"))
        }
        reader.onabort = () => {
          reject(new Error("FileReader aborted"))
        }
      } catch (error) {
        reject(error)
      }
    })
  }

  async getFile(fileId: string): Promise<any | null> {
    try {
      const { data, error } = await this.supabase.from("chat_files").select("*").eq("id", fileId).single()

      if (error) {
        console.error("[v0] Error fetching file:", error)
        return null
      }

      return data
    } catch (error) {
      console.error("[v0] Get file error:", error)
      return null
    }
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    try {
      // Handle temporary IDs
      if (fileId.startsWith("base64_") || fileId.startsWith("supabase_")) {
        return true // No need to delete temporary files
      }

      // Get file record first
      const file = await this.getFile(fileId)
      if (!file) {
        return false
      }

      // Get user by email to verify ownership
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("id")
        .eq("email", userId)
        .single()

      if (userError || !user || file.user_id !== user.id) {
        return false
      }

      // Delete from storage if it's a Supabase file
      if (file.storage_type === "supabase" && file.storage_path) {
        await this.supabase.storage.from("chat-files").remove([file.storage_path])
      }

      // Delete from database
      const { error } = await this.supabase.from("chat_files").delete().eq("id", fileId).eq("user_id", user.id)

      if (error) {
        console.error("[v0] Error deleting file:", error)
        return false
      }

      return true
    } catch (error) {
      console.error("[v0] Delete file error:", error)
      return false
    }
  }

  async getUserFiles(userId: string, limit = 50): Promise<any[]> {
    try {
      const { data: user, error: userError } = await this.supabase
        .from("users")
        .select("id")
        .eq("email", userId)
        .single()

      if (userError || !user) {
        return []
      }

      const { data, error } = await this.supabase
        .from("chat_files")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(limit)

      if (error) {
        console.error("[v0] Error fetching user files:", error)
        return []
      }

      return data || []
    } catch (error) {
      console.error("[v0] Get user files error:", error)
      return []
    }
  }
}

export const fileService = new FileService()
