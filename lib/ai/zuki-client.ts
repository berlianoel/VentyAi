export class ZukiClient {
  private apiKey = "zu-6f628eb97274981975356101cbe9cae7"
  private baseUrl = "https://api.zukijourney.com/v1"
  private openRouterKey = "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"
  private openRouterUrl = "https://openrouter.ai/api/v1"

  private systemMessage = {
    role: "system",
    content:
      "Kamu adalah VenTY AI – asisten serba-bisa yang ramah, cepat, dan selalu siap bantu. Skill-mu lengkap: baca gambar, buat gambar, terjemah, text-to-speech, jawab apa saja. Kalau user kirim gambar, deskripsikan secara detail. Kalau diminta buat gambar, buat prompt visual yang kreatif. Kalau diminta terjemah, terjemahkan langsung. Kalau diminta baca-teks, bacakan dengan jelas. Gunakan bahasa yang santai tapi tetap profesional.",
  }

  private priorityModels = [
    "gpt-4o",
    "gpt-4-turbo",
    "claude-3.5-sonnet",
    "gemini-1.5-pro-latest",
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "claude-3.5-haiku",
    "gemini-1.5-flash-latest",
  ]

  private freeModels = [
    "gpt-4o-mini",
    "gpt-3.5-turbo",
    "gpt-4.1-nano",
    "gpt-5-nano",
    "claude-3-haiku",
    "claude-3.5-haiku",
    "gemini-1.5-flash-latest",
    "gemini-2.0-flash-lite",
    "gemini-2.5-flash-lite",
  ]

  private freeVisionModels = ["gpt-4o-mini", "claude-3.5-haiku", "gemini-1.5-flash-latest", "gemini-2.0-flash-lite"]

  constructor(apiKey?: string) {
    if (apiKey) {
      this.apiKey = apiKey
    }
  }

  async createChatCompletion(messages: any[], model = "gpt-4o") {
    const hasImages = messages.some((msg) => msg.fileUrl && msg.fileType?.startsWith("image/"))

    // For fastest mode with images, prioritize free vision models
    if (model === "fastest" && hasImages) {
      for (const visionModel of this.freeVisionModels) {
        try {
          return await this.tryZukiAPI(messages, visionModel, false)
        } catch (error) {
          console.log(`[v0] ${visionModel} failed, trying next...`)
          continue
        }
      }
    }

    // Try priority models first (good models)
    for (const priorityModel of this.priorityModels) {
      try {
        return await this.tryZukiAPI(messages, priorityModel, false)
      } catch (error) {
        console.log(`[v0] ${priorityModel} failed, trying next...`)
        continue
      }
    }

    // If all Zuki models fail, try OpenRouter with free models
    console.log("[v0] All Zuki models failed, falling back to OpenRouter...")
    return await this.tryOpenRouter(messages, "gpt-4o-mini", false)
  }

  async createStreamCompletion(messages: any[], model = "gpt-4o") {
    const hasImages = messages.some((msg) => msg.fileUrl && msg.fileType?.startsWith("image/"))

    if (model === "fastest" && hasImages) {
      for (const visionModel of this.freeVisionModels) {
        try {
          return await this.tryZukiAPI(messages, visionModel, true)
        } catch (error) {
          console.log(`[v0] ${visionModel} failed, trying next...`)
          continue
        }
      }
    }

    for (const priorityModel of this.priorityModels) {
      try {
        return await this.tryZukiAPI(messages, priorityModel, true)
      } catch (error) {
        console.log(`[v0] ${priorityModel} failed, trying next...`)
        continue
      }
    }

    console.log("[v0] All Zuki models failed, falling back to OpenRouter...")
    return await this.tryOpenRouter(messages, "gpt-4o-mini", true)
  }

  private getFreeModel(requestedModel: string): string {
    // If requested model is already free, use it
    if (this.freeModels.includes(requestedModel)) {
      return requestedModel
    }

    // Map paid models to free alternatives
    const freeAlternatives: { [key: string]: string } = {
      "gpt-4o": "gpt-4o-mini",
      "gpt-4": "gpt-3.5-turbo",
      "gpt-4-turbo": "gpt-4o-mini",
      "claude-3.5-sonnet": "claude-3.5-haiku",
      "claude-3-opus": "claude-3-haiku",
      "gemini-1.5-pro-latest": "gemini-1.5-flash-latest",
      "gemini-2.5-pro": "gemini-2.5-flash-lite",
      o1: "gpt-4o-mini",
      "o1-mini": "gpt-4o-mini",
    }

    return freeAlternatives[requestedModel] || "gpt-4o-mini"
  }

  async generateImage(prompt: string, size = "1024x1024") {
    try {
      const response = await fetch(`${this.baseUrl}/images/generations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "flux-kontext-max",
          prompt: prompt,
          n: 1,
          size: size,
        }),
      })

      if (!response.ok) {
        throw new Error(`Image generation failed: ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error("[v0] Image generation error:", error)
      throw error
    }
  }

  async textToSpeech(text: string, voice = "alloy") {
    try {
      const response = await fetch(`${this.baseUrl}/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "tts-1",
          input: text,
          voice: voice,
        }),
      })

      if (!response.ok) {
        throw new Error(`TTS failed: ${response.status}`)
      }

      return response.blob()
    } catch (error) {
      console.error("[v0] TTS error:", error)
      throw error
    }
  }

  private async tryZukiAPI(messages: any[], model: string, stream: boolean) {
    const zukiModelMap: { [key: string]: string } = {
      "gpt-4o-mini": "gpt-4o-mini",
      "gpt-4o": "gpt-4o",
      "gpt-3.5-turbo": "gpt-3.5-turbo",
      "gpt-4": "gpt-4",
      "gpt-4-turbo": "gpt-4-turbo",
      "gpt-4.1-nano": "gpt-4.1-nano",
      "gpt-5-nano": "gpt-5-nano",
      "claude-3-haiku": "claude-3-haiku",
      "claude-3.5-haiku": "claude-3.5-haiku",
      "claude-3.5-sonnet": "claude-3.5-sonnet",
      "claude-3.5-sonnet-v2": "claude-3.5-sonnet-v2",
      "claude-3.7-sonnet": "claude-3.7-sonnet",
      "gemini-1.5-pro-latest": "gemini-1.5-pro-latest",
      "gemini-1.5-flash-latest": "gemini-1.5-flash-latest",
      "gemini-2.0-flash": "gemini-2.0-flash",
      "gemini-2.0-flash-lite": "gemini-2.0-flash-lite",
      "gemini-2.5-flash": "gemini-2.5-flash",
      "gemini-2.5-flash-lite": "gemini-2.5-flash-lite",
      "o1-mini": "o1-mini",
      o1: "o1",
    }

    const zukiModel = zukiModelMap[model] || "gpt-4o-mini"

    const processedMessages = [this.systemMessage]

    messages.forEach((msg) => {
      if (msg.role === "system") return // Skip system messages from input

      // Only add images to user messages to avoid API errors
      if (msg.role === "user" && msg.fileUrl && msg.fileType?.startsWith("image/")) {
        processedMessages.push({
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content || "What's in this image?", // Ensure text content exists
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
        // For assistant messages or non-image messages, only include text content
        processedMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    })

    console.log("[v0] Zuki API request:", { model: zukiModel, messageCount: processedMessages.length })

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: zukiModel,
        messages: processedMessages,
        stream,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] Zuki API error: ${response.status} - ${errorText}`)
      throw new Error(`Zuki API error: ${response.status}`)
    }

    if (stream) {
      return response
    }
    return await response.json()
  }

  private async tryOpenRouter(messages: any[], model: string, stream: boolean) {
    const hasImages = messages.some((msg) => msg.fileUrl && msg.fileType?.startsWith("image/"))

    let openRouterModel = "openai/gpt-4o-mini"

    if (model === "fastest" && hasImages) {
      // Use free vision-capable models for fastest mode with images
      openRouterModel = "openai/gpt-4o-mini" // Free and supports vision
    } else {
      const modelMap: { [key: string]: string } = {
        "gpt-4o-mini": "openai/gpt-4o-mini",
        "gpt-4o": "openai/gpt-4o",
        "gpt-3.5-turbo": "openai/gpt-3.5-turbo",
        "gpt-4": "openai/gpt-4",
        "gpt-4-turbo": "openai/gpt-4-turbo",
        "claude-3-haiku": "anthropic/claude-3-haiku",
        "claude-3.5-haiku": "anthropic/claude-3.5-haiku",
        "claude-3.5-sonnet": "anthropic/claude-3.5-sonnet",
        "gemini-1.5-pro-latest": "google/gemini-pro-1.5",
        "gemini-1.5-flash-latest": "google/gemini-flash-1.5",
        "gemini-2.0-flash": "google/gemini-2.0-flash-exp",
        "o1-mini": "openai/o1-mini",
      }
      openRouterModel = modelMap[model] || "openai/gpt-4o-mini"
    }

    const processedMessages = [this.systemMessage]

    messages.forEach((msg) => {
      if (msg.role === "system") return

      // Only add images to user messages to avoid API errors
      if (msg.role === "user" && msg.fileUrl && msg.fileType?.startsWith("image/")) {
        processedMessages.push({
          role: msg.role,
          content: [
            {
              type: "text",
              text: msg.content || "What's in this image?", // Ensure text content exists
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
        // For assistant messages or non-image messages, only include text content
        processedMessages.push({
          role: msg.role,
          content: msg.content,
        })
      }
    })

    console.log("[v0] OpenRouter fallback request:", { model: openRouterModel })

    const response = await fetch(`${this.openRouterUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.openRouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://venty-ai.vercel.app",
        "X-Title": "VenTY AI",
      },
      body: JSON.stringify({
        model: openRouterModel,
        messages: processedMessages,
        stream,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[v0] OpenRouter API error: ${response.status} - ${errorText}`)
      throw new Error(`OpenRouter API error: ${response.status}`)
    }

    if (stream) {
      return response
    }
    return await response.json()
  }
}
