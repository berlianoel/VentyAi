import type { NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { MultiProviderClient } from "@/lib/ai/multi-provider-client"

export async function POST(request: NextRequest) {
  try {
    const { messages, conversationId, aiModel, firebaseUid, fileUrl, fileType } = await request.json()

    if (!messages || !conversationId) {
      return new Response("Missing required fields", { status: 400 })
    }

    const aiClient = new MultiProviderClient()
    const requiresVision = (aiModel === "fastest" && fileUrl && fileType) || (fileUrl && fileType)
    let modelName = "VenTY AI"

    console.log("[v0] Using multi-provider streaming, vision required:", requiresVision)

    const processedMessages = messages.map((msg: any) => ({
      ...msg,
      fileUrl: msg.fileUrl || fileUrl,
      fileType: msg.fileType || fileType,
    }))

    let response
    try {
      console.log("[v0] Attempting multi-provider streaming...")
      response = await aiClient.createStreamCompletion(
        processedMessages,
        conversationId,
        requiresVision,
        request.signal,
      )

      if (aiModel === "fastest") {
        modelName = requiresVision ? `VenTY Pro Vision (${response.provider})` : `VenTY Pro (${response.provider})`
      } else {
        modelName = `VenTY Standard (${response.provider})`
      }

      console.log("[v0] Streaming success with provider:", response.provider)
    } catch (error) {
      if (request.signal.aborted || (error as Error).message.includes("Request cancelled")) {
        console.log("[v0] Streaming request cancelled")
        return new Response("Request cancelled", { status: 499 })
      }
      console.log("[v0] All streaming providers failed:", error)
      return new Response("All AI providers failed", { status: 503 })
    }

    // Create a readable stream
    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader()
        let fullMessage = ""
        let cancelled = false

        if (!reader) {
          controller.close()
          return
        }

        const abortHandler = () => {
          console.log("[v0] Cancelling request...")
          cancelled = true
          reader.cancel()
          controller.enqueue(
            new TextEncoder().encode(
              `data: ${JSON.stringify({
                content: "\n\n*Cancelled by user*",
                cancelled: true,
              })}\n\n`,
            ),
          )
          controller.close()
        }

        request.signal.addEventListener("abort", abortHandler)

        try {
          while (!cancelled && !request.signal.aborted) {
            const { done, value } = await reader.read()

            if (done || cancelled || request.signal.aborted) {
              if (!cancelled && !request.signal.aborted && firebaseUid && conversationId) {
                try {
                  const supabase = await createClient()

                  const { data: user } = await supabase.from("users").select("id").eq("email", firebaseUid).single()

                  if (user) {
                    await supabase.from("messages").insert([
                      {
                        conversation_id: conversationId,
                        user_id: user.id,
                        role: "user",
                        content: messages[messages.length - 1].content.substring(0, 2000),
                      },
                      {
                        conversation_id: conversationId,
                        user_id: user.id,
                        role: "assistant",
                        content: fullMessage.substring(0, 2000),
                        model_used: modelName,
                      },
                    ])

                    await supabase
                      .from("conversations")
                      .update({ updated_at: new Date().toISOString() })
                      .eq("id", conversationId)
                  }
                } catch (dbError) {
                  console.error("Database save error:", dbError)
                }
              }

              controller.close()
              break
            }

            const chunk = new TextDecoder().decode(value)
            const lines = chunk.split("\n")

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6)
                if (data === "[DONE]") continue

                try {
                  const parsed = JSON.parse(data)
                  const content = parsed.choices?.[0]?.delta?.content
                  if (content) {
                    fullMessage += content
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ content })}\n\n`))
                  }
                } catch (e) {
                  // Skip invalid JSON
                }
              }
            }
          }
        } catch (error) {
          if (!cancelled && !request.signal.aborted) {
            console.error("Stream error:", error)
            controller.error(error)
          }
        } finally {
          request.signal.removeEventListener("abort", abortHandler)
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Stream API error:", error)
    return new Response("Internal server error", { status: 500 })
  }
}
