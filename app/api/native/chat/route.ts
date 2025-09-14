import { type NextRequest, NextResponse } from "next/server"
import { MultiProviderClient } from "@/lib/ai/multi-provider-client"
import { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } from "@/lib/supabase/config"

export async function POST(request: NextRequest) {
  try {
    const requestData = await request.json()
    const { messages, conversationId, aiModel, firebaseUid, fileUrl, fileType } = requestData

    if (!messages || !firebaseUid) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing required fields",
        },
        { status: 400 },
      )
    }

    const aiClient = new MultiProviderClient()
    const requiresVision = (aiModel === "fastest" && fileUrl && fileType) || (fileUrl && fileType)

    console.log("[NATIVE API] Using multi-provider system, vision required:", requiresVision)

    const processedMessages = messages.map((msg: any) => ({
      ...msg,
      fileUrl: msg.fileUrl || fileUrl,
      fileType: msg.fileType || fileType,
    }))

    let response
    let assistantMessage
    let modelName

    try {
      response = await aiClient.createChatCompletion(processedMessages, conversationId, requiresVision)
      assistantMessage = response.choices[0].message.content

      if (aiModel === "fastest") {
        modelName = requiresVision ? `VenTY Pro Vision (${response.provider})` : `VenTY Pro (${response.provider})`
      } else {
        modelName = `VenTY Standard (${response.provider})`
      }

      console.log("[NATIVE API] Success with provider:", response.provider)
    } catch (error) {
      console.error("[NATIVE API] All providers failed:", error)
      return NextResponse.json(
        {
          success: false,
          error: "AI service temporarily unavailable",
          message: "Maaf, semua AI provider sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.",
        },
        { status: 503 },
      )
    }

    // Store messages if conversation ID provided
    if (conversationId) {
      try {
        const { createClient } = await import("@supabase/supabase-js")
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!)

        // Store user message
        const userMessage = {
          conversation_id: conversationId,
          role: "user",
          content: messages[messages.length - 1].content.substring(0, 2000),
          file_url: fileUrl || null,
          file_type: fileType || null,
        }

        await supabase.from("messages").insert(userMessage)

        // Store assistant message
        const assistantMessageData = {
          conversation_id: conversationId,
          role: "assistant",
          content: assistantMessage.substring(0, 2000),
          metadata: { model_used: modelName },
        }

        await supabase.from("messages").insert(assistantMessageData)

        // Update conversation timestamp
        await supabase.from("conversations").update({ updated_at: new Date().toISOString() }).eq("id", conversationId)
      } catch (dbError) {
        console.error("[NATIVE API] Database error:", dbError)
        // Continue without failing the request
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        message: assistantMessage,
        model: modelName,
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error) {
    console.error("[NATIVE API] Chat error:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: "Maaf, terjadi kesalahan sistem. Silakan coba lagi.",
      },
      { status: 500 },
    )
  }
}
