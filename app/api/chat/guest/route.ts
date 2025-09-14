import { type NextRequest, NextResponse } from "next/server"
import { MultiProviderClient } from "@/lib/ai/multi-provider-client"

export async function POST(request: NextRequest) {
  try {
    const signal = request.signal
    const { messages, aiModel } = await request.json()
    console.log("[v0] Guest Chat API - Request data:", {
      messagesCount: messages?.length,
      aiModel,
    })

    if (signal.aborted) {
      console.log("[v0] Guest request was cancelled before processing")
      return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
    }

    if (!messages) {
      console.log("[v0] Guest Chat API - Missing messages")
      return NextResponse.json({ error: "Missing messages" }, { status: 400 })
    }

    if (aiModel === "fastest") {
      return NextResponse.json(
        {
          error: "Silakan login untuk menggunakan VenTY Pro (mode tercepat)",
        },
        { status: 401 },
      )
    }

    console.log("[v0] Guest Chat API - Using multi-provider system")
    const aiClient = new MultiProviderClient()

    const systemMessage = {
      role: "system",
      content:
        "Kamu adalah VenTY AI – asisten serba-bisa yang ramah, cepat, dan selalu siap bantu. Skill-mu lengkap: baca gambar, buat gambar, terjemah, text-to-speech, jawab apa saja. Kalau user kirim gambar, deskripsikan secara detail. Kalau diminta buat gambar, buat prompt visual yang kreatif. Kalau diminta terjemah, terjemahkan langsung. Kalau diminta baca-teks, bacakan dengan jelas. Gunakan bahasa yang santai tapi tetap profesional.",
    }

    const processedMessages = [systemMessage, ...messages.filter((msg: any) => msg.role !== "system")]

    try {
      console.log("[v0] Guest Chat API - Calling multi-provider system")

      const hasImageInMessages = messages.some(
        (msg: any) =>
          msg.fileUrl?.startsWith("data:image/") ||
          msg.fileType?.startsWith("image/") ||
          (typeof msg.content === "string" &&
            (msg.content.includes("data:image/") || msg.content.includes("base64,"))) ||
          (Array.isArray(msg.content) &&
            msg.content.some((item: any) => item.type === "image_url" || (item.image_url && item.image_url.url))),
      )

      const currentMessageHasImage =
        messages.length > 0 &&
        (messages[messages.length - 1].fileUrl?.startsWith("data:image/") ||
          messages[messages.length - 1].fileType?.startsWith("image/") ||
          (typeof messages[messages.length - 1].content === "string" &&
            (messages[messages.length - 1].content.includes("data:image/") ||
              messages[messages.length - 1].content.includes("base64,"))))

      const requiresVision =
        aiModel === "smart" ||
        aiModel === "smartest" ||
        currentMessageHasImage ||
        (hasImageInMessages && aiModel === "smartest")
      console.log("[v0] Requires vision:", requiresVision)

      const response = await aiClient.createChatCompletion(processedMessages, null, requiresVision, signal)

      if (signal.aborted) {
        console.log("[v0] Guest request cancelled after AI call")
        return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
      }

      if (!response || !response.choices || !response.choices[0]) {
        console.log("[v0] Guest Chat API - Invalid response from AI")
        throw new Error("Invalid AI response")
      }

      const assistantMessage = response.choices[0].message.content
      console.log("[v0] Guest Chat API - Success with provider:", response.provider)

      return NextResponse.json({
        message: assistantMessage,
        model: `VenTY ${aiModel === "smartest" ? "Pro" : "Standard"} (${response.provider})`,
      })
    } catch (aiError) {
      if (signal.aborted || (aiError as Error).message.includes("Request cancelled")) {
        console.log("[v0] Guest request cancelled during AI processing")
        return NextResponse.json({ error: "Request cancelled" }, { status: 499 })
      }

      console.error("[v0] Guest Chat API - All providers failed:", aiError)
      return NextResponse.json({
        message: "Maaf, semua AI provider sedang mengalami gangguan. Silakan coba lagi dalam beberapa saat.",
        model: "VenTY Standard (Guest)",
      })
    }
  } catch (error) {
    console.error("[v0] Guest Chat API - Error:", error)
    return NextResponse.json(
      {
        message: "Maaf, saya sedang mengalami gangguan. Silakan coba lagi.",
        model: "VenTY AI",
      },
      { status: 500 },
    )
  }
}
