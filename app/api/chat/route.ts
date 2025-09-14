import { type NextRequest, NextResponse } from "next/server"
import { MultiProviderClient } from "@/lib/ai/multi-provider-client"
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/config"

export async function POST(request: NextRequest) {
  try {
    const signal = request.signal

    let requestData
    try {
      requestData = await request.json()
      console.log("[v0] Chat request received for conversation:", requestData.conversationId)
    } catch (parseError) {
      console.error("[SERVER] JSON parse error:", parseError)
      return NextResponse.json({ error: "Invalid JSON in request body" }, { status: 400 })
    }

    if (signal?.aborted) {
      console.log("[v0] Request was cancelled before processing")
      return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
    }

    const { messages, conversationId, aiModel, firebaseUid, fileUrl, fileType, skipResponse } = requestData

    if (!messages) {
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    if (skipResponse && firebaseUid && conversationId) {
      try {
        const { createClient } = await import("@supabase/supabase-js")

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error("Supabase configuration missing")
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        console.log("[v0] Storing user message only for conversation:", conversationId)

        const userMessage = {
          conversation_id: conversationId,
          role: "user",
          content: messages[messages.length - 1].content.substring(0, 2000),
          file_url: fileUrl || null,
          file_type: fileType || null,
        }

        const { error: userMsgError } = await supabase.from("messages").insert(userMessage)

        if (userMsgError) {
          console.log("[v0] User message insert error:", userMsgError)
          return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
        }

        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)

        return NextResponse.json({ success: true, message: "Message saved" })
      } catch (dbError) {
        console.error("[v0] Database storage error:", dbError)
        return NextResponse.json({ error: "Database error" }, { status: 500 })
      }
    }

    const hasFile = fileUrl && fileType
    const hasImageInMessages = messages.some(
      (msg: any) =>
        msg.fileUrl?.startsWith("data:image/") ||
        msg.fileType?.startsWith("image/") ||
        (typeof msg.content === "string" && msg.content.includes("data:image/")),
    )

    const currentMessageHasImage =
      hasFile ||
      (messages.length > 0 &&
        (messages[messages.length - 1].fileUrl?.startsWith("data:image/") ||
          messages[messages.length - 1].fileType?.startsWith("image/") ||
          (typeof messages[messages.length - 1].content === "string" &&
            messages[messages.length - 1].content.includes("data:image/"))))

    const requiresVision =
      aiModel === "smart" || currentMessageHasImage || (hasImageInMessages && aiModel === "smartest")
    console.log("[v0] Requires vision:", requiresVision)

    const aiClient = new MultiProviderClient()

    console.log("[v0] Using multi-provider system for", aiModel, "mode with", messages.length, "messages")

    const processedMessages = messages.map((msg: any) => ({
      ...msg,
      fileUrl: msg.fileUrl || fileUrl,
      fileType: msg.fileType || fileType,
    }))

    let response
    let assistantMessage
    let modelName = "VenTY AI"

    try {
      if (signal?.aborted) {
        console.log("[v0] Request cancelled before AI call")
        return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
      }

      console.log("[v0] Attempting AI completion with signal status:", signal?.aborted)
      response = await aiClient.createChatCompletion(processedMessages, conversationId, requiresVision, signal)

      if (signal?.aborted) {
        console.log("[v0] Request cancelled after AI call")
        return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
      }

      assistantMessage = response.choices[0].message.content
      modelName = response.modelName || "VenTY AI"

      console.log("[v0] Multi-provider success with:", response.provider, "- Model:", modelName)
    } catch (error) {
      console.error("[v0] AI Provider Error Details:", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
        signal_aborted: signal?.aborted,
        conversation_id: conversationId,
        firebase_uid: firebaseUid,
      })

      if (signal?.aborted || (error as Error).message.includes("Request cancelled")) {
        console.log("[v0] Request cancelled during AI processing")
        return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
      }

      console.error("[v0] All AI providers failed:", error)
      return NextResponse.json({
        message: "Maaf, semua AI provider sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.",
        model: modelName,
      })
    }

    if (firebaseUid && conversationId) {
      try {
        const { createClient } = await import("@supabase/supabase-js")

        if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
          throw new Error("Supabase configuration missing")
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

        console.log("[v0] Storing messages for user:", firebaseUid, "conversation:", conversationId)

        if (!skipResponse) {
          const userMessage = {
            conversation_id: conversationId,
            role: "user",
            content: messages[messages.length - 1].content.substring(0, 2000),
            file_url: fileUrl || null,
            file_type: fileType || null,
          }

          const { error: userMsgError } = await supabase.from("messages").insert(userMessage)

          if (userMsgError) {
            console.log("[v0] User message insert error:", userMsgError)
          }
        }

        const assistantMessageData = {
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage.substring(0, 2000),
          metadata: { model_used: modelName, provider: response.provider },
        }

        const { error: assistantMsgError } = await supabase.from("messages").insert(assistantMessageData)

        if (assistantMsgError) {
          console.log("[v0] Assistant message insert error:", assistantMsgError)
        } else {
          console.log("[v0] Messages stored successfully")
        }

        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
      } catch (dbError) {
        console.error("[v0] Database storage error:", dbError)
      }
    }

    return NextResponse.json({
      message: assistantMessage,
      model: modelName,
    })
  } catch (error) {
    console.error("[v0] Chat API Error Details:", {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    return NextResponse.json(
      {
        message: "Maaf, saya sedang mengalami gangguan. Silakan coba lagi.",
        model: "VenTY AI",
      },
      { status: 500 },
    )
  }
}
