// OpenRouter API client for VenTY AI
export class OpenRouterClient {
  private apiKey: string
  private baseUrl = "https://openrouter.ai/api/v1"

  constructor(apiKey?: string) {
    this.apiKey =
      apiKey ||
      process.env.OPENROUTER_API_KEY ||
      "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"
  }

  async createChatCompletion(messages: any[], model = "deepseek/deepseek-chat") {
    try {
      let workingModel = model
      const hasImages = messages.some((msg) => msg.fileUrl && msg.fileType?.startsWith("image/"))

      if (hasImages && model === "deepseek/deepseek-chat") {
        // Switch to vision-capable model for images
        workingModel = "openai/gpt-4o-mini"
      }

      const systemMessage = {
        role: "system",
        content:
          "Kamu adalah VenTY AI – asisten serba-bisa yang ramah, cepat, dan selalu siap bantu. Skill-mu lengkap: baca gambar, buat gambar, terjemah, text-to-speech, jawab apa saja. Kalau user kirim gambar, deskripsikan secara detail. Kalau diminta buat gambar, buat prompt visual yang kreatif. Kalau diminta terjemah, terjemahkan langsung. Kalau diminta baca-teks, bacakan dengan jelas. Gunakan bahasa yang santai tapi tetap profesional.",
      }

      const processedMessages = [systemMessage]

      messages.forEach((msg) => {
        if (msg.role === "system") return

        if (msg.role === "user" && msg.fileUrl && msg.fileType?.startsWith("image/")) {
          processedMessages.push({
            role: msg.role,
            content: [
              {
                type: "text",
                text: msg.content || "What's in this image?",
              },
              {
                type: "image_url",
                image_url: {
                  url: msg.fileUrl,
                },
              },
            ],
          })
        } else {
          processedMessages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      })

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "VenTY AI Chat",
        },
        body: JSON.stringify({
          model: workingModel,
          messages: processedMessages,
          stream: false,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("OpenRouter API error:", error)
      throw error
    }
  }

  async createStreamCompletion(messages: any[], model = "deepseek/deepseek-chat") {
    try {
      let workingModel = model
      const hasImages = messages.some((msg) => msg.fileUrl && msg.fileType?.startsWith("image/"))

      if (hasImages && model === "deepseek/deepseek-chat") {
        workingModel = "openai/gpt-4o-mini"
      }

      const systemMessage = {
        role: "system",
        content:
          "Kamu adalah VenTY AI – asisten serba-bisa yang ramah, cepat, dan selalu siap bantu. Skill-mu lengkap: baca gambar, buat gambar, terjemah, text-to-speech, jawab apa saja. Kalau user kirim gambar, deskripsikan secara detail. Kalau diminta buat gambar, buat prompt visual yang kreatif. Kalau diminta terjemah, terjemahkan langsung. Kalau diminta baca-teks, bacakan dengan jelas. Gunakan bahasa yang santai tapi tetap profesional.",
      }

      const processedMessages = [systemMessage]

      messages.forEach((msg) => {
        if (msg.role === "system") return

        if (msg.role === "user" && msg.fileUrl && msg.fileType?.startsWith("image/")) {
          processedMessages.push({
            role: msg.role,
            content: [
              {
                type: "text",
                text: msg.content || "What's in this image?",
              },
              {
                type: "image_url",
                image_url: {
                  url: msg.fileUrl,
                },
              },
            ],
          })
        } else {
          processedMessages.push({
            role: msg.role,
            content: msg.content,
          })
        }
      })

      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
          "X-Title": "VenTY AI Chat",
        },
        body: JSON.stringify({
          model: workingModel,
          messages: processedMessages,
          stream: true,
          max_tokens: 4000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`OpenRouter API error: ${response.status} - ${errorText}`)
        throw new Error(`OpenRouter API error: ${response.status}`)
      }

      return response
    } catch (error) {
      console.error("OpenRouter API stream error:", error)
      throw error
    }
  }
}
