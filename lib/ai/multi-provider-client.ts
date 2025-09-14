export interface AIProvider {
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  visionModels?: string[]
  supportsVision: boolean
  isFree: boolean
  priority: number
}

export class MultiProviderClient {
  private providers: AIProvider[] = [
    {
      name: "NVIDIA-2",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      apiKey: "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",
      models: ["meta/llama-3.1-8b-instruct", "mistralai/mistral-7b-instruct-v0.3"],
      visionModels: ["meta/llama-3.2-11b-vision-instruct", "meta/llama-3.2-90b-vision-instruct"],
      supportsVision: true,
      isFree: true,
      priority: 1,
    },
    {
      name: "Cerebras",
      baseUrl: "https://api.cerebras.ai/v1",
      apiKey: "csk-xej6eym36m633t3tnvn5kfetnwk6pt9vm359ntvt3nwyttfj",
      models: ["llama3.3-70b", "llama3.1-70b", "llama3.1-8b", "llama3.2-3b", "llama3.2-1b"],
      supportsVision: false,
      isFree: true,
      priority: 1,
    },
    {
      name: "Gemini",
      baseUrl: "https://generativelanguage.googleapis.com/v1beta",
      apiKey: "AIzaSyDZHsgEnTuY9b-Jc2p5SUhX67HNkzuQP2o",
      models: ["gemini-1.5-flash", "gemini-1.5-flash-8b"],
      visionModels: ["gemini-1.5-flash", "gemini-1.5-pro"],
      supportsVision: true,
      isFree: true,
      priority: 2,
    },
    {
      name: "NVIDIA-1",
      baseUrl: "https://integrate.api.nvidia.com/v1",
      apiKey: "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",
      models: [
        "meta/llama-3.3-70b-instruct",
        "qwen/qwen2.5-coder-32b-instruct",
        "nvidia/llama-3.1-nemotron-70b-instruct",
        "meta/llama-3.1-405b-instruct",
      ],
      visionModels: ["meta/llama-3.2-90b-vision-instruct", "microsoft/phi-3-vision-128k-instruct"],
      supportsVision: true,
      isFree: true,
      priority: 3,
    },
    // {
    //   name: "NVIDIA-3",
    //   baseUrl: "https://integrate.api.nvidia.com/v1",
    //   apiKey: "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",
    //   models: [
    //     "microsoft/phi-3-medium-4k-instruct",
    //     "microsoft/phi-3-mini-4k-instruct",
    //     "google/gemma-2-9b-it",
    //     "google/gemma-2-2b-it",
    //   ],
    //   visionModels: ["microsoft/phi-3-vision-128k-instruct"],
    //   supportsVision: true,
    //   isFree: true,
    //   priority: 2,
    // },
    // {
    //   name: "Cerebras-Extra",
    //   baseUrl: "https://api.cerebras.ai/v1",
    //   apiKey: "csk-m9x4n7v2c8b5z1q6w3e0r9t8y7u4i1o5p2a6s3d7f0g8h5j2k9l6m3n0b4v7c1x8z5",
    //   models: ["llama-3.1-70b-instruct", "llama-3.1-8b-instruct", "llama-3.2-1b-instruct"],
    //   supportsVision: false,
    //   isFree: true,
    //   priority: 2,
    // },
    // {
    //   name: "Gemini-Extra",
    //   baseUrl: "https://generativelanguage.googleapis.com/v1beta",
    //   apiKey: "AIzaSyBvQScT8x1PiSwhzXvXAiYWTpAzHKzQVBo",
    //   models: ["gemini-1.5-flash-8b-001", "gemini-1.0-pro"],
    //   visionModels: ["gemini-1.5-flash-002"],
    //   supportsVision: true,
    //   isFree: true,
    //   priority: 10,
    // },
    // Paid fallbacks (lowest priority)
    {
      name: "Mistral-Platform",
      baseUrl: "https://api.mistral.ai/v1",
      apiKey: "FMfaETW1teLVXZU9kAu88TmBZRrSkcHq",
      models: ["mistral-large-latest", "mistral-medium-latest", "mistral-small-latest", "open-mistral-7b"],
      visionModels: ["pixtral-12b-2409", "pixtral-large-latest"],
      supportsVision: true,
      isFree: false,
      priority: 15,
    },
    {
      name: "Mistral-Codestral",
      baseUrl: "https://codestral.mistral.ai/v1",
      apiKey: "1krh64b9R9SgZeQdidobazbohCrHHKev",
      models: ["codestral-latest", "codestral-2405", "codestral-mamba-latest"],
      supportsVision: false,
      isFree: false,
      priority: 16,
    },
  ]

  private conversationProviders = new Map<string, string>()
  private providerFailures = new Map<string, { count: number; lastFailure: number }>()
  private providerModelIndex = new Map<string, number>()
  private imageContexts = new Map<string, string>()

  private systemMessage = {
    role: "system",
    content:
      "Kamu adalah VenTY AI – asisten serba-bisa yang ramah, cepat, dan selalu siap bantu. Skill-mu lengkap: baca gambar, buat gambar, terjemah, text-to-speech, jawab apa saja. Kalau user kirim gambar, deskripsikan secara detail. Kalau diminta buat gambar, buat prompt visual yang kreatif. Kalau diminta terjemah, terjemahkan langsung. Kalau diminta baca-teks, bacakan dengan jelas. Gunakan bahasa yang santai tapi tetap profesional.",
  }

  async createStreamCompletion(messages: any[], conversationId?: string, requiresVision = false, signal?: AbortSignal) {
    const hasFiles = messages.some((msg) => {
      if (msg.fileUrl || msg.fileType) return true
      if (msg.content && typeof msg.content === "string") {
        return msg.content.includes("data:image/") || msg.content.includes("![")
      }
      return false
    })
    const needsVision = requiresVision || hasFiles

    console.log(`[v0] Requires vision: ${needsVision}`)

    if (signal?.aborted) {
      console.log("[v0] Request cancelled before starting")
      throw new Error("Request cancelled")
    }

    if (conversationId && this.conversationProviders.has(conversationId)) {
      const providerName = this.conversationProviders.get(conversationId)!
      const provider = this.providers.find((p) => p.name === providerName)
      if (provider && !this.isProviderTemporarilyBlacklisted(provider.name)) {
        try {
          return await this.tryProviderStreamWithModelRotation(provider, messages, needsVision, conversationId, signal)
        } catch (error) {
          console.log(`[v0] Conversation provider ${providerName} failed, trying similar providers...`)
          this.recordProviderFailure(provider.name)

          const similarProviders = this.findSimilarProviders(provider, needsVision)
          for (const similarProvider of similarProviders) {
            if (signal?.aborted) {
              console.log("[v0] Request cancelled during similar provider attempts")
              throw new Error("Request cancelled")
            }

            try {
              const result = await this.tryProviderStreamWithModelRotation(
                similarProvider,
                messages,
                needsVision,
                conversationId,
                signal,
              )
              this.conversationProviders.set(conversationId, similarProvider.name)
              return result
            } catch (similarError) {
              console.log(`[v0] Similar provider ${similarProvider.name} also failed`)
              this.recordProviderFailure(similarProvider.name)
            }
          }
        }
      }
    }

    const availableProviders = this.getAvailableProviders(needsVision)
    console.log(
      `[v0] Available providers: ${availableProviders.length} (${availableProviders.filter((p) => p.isFree).length} free, ${availableProviders.filter((p) => !p.isFree).length} paid)`,
    )

    for (const provider of availableProviders) {
      if (signal?.aborted) {
        console.log("[v0] Request cancelled during provider iteration")
        throw new Error("Request cancelled")
      }

      if (this.isProviderTemporarilyBlacklisted(provider.name)) {
        console.log(`[v0] Skipping temporarily blacklisted provider: ${provider.name}`)
        continue
      }

      console.log(
        `[v0] Trying provider: ${provider.name} (Free: ${provider.isFree}, Vision: ${provider.supportsVision}, Models: ${provider.models.length})`,
      )

      try {
        const result = await this.tryProviderStreamWithModelRotation(
          provider,
          messages,
          needsVision,
          conversationId,
          signal,
        )
        if (conversationId) {
          this.conversationProviders.set(conversationId, provider.name)
        }
        return result
      } catch (error) {
        console.log(`[v0] Provider ${provider.name} failed: ${error}`)
        this.recordProviderFailure(provider.name)

        if (signal?.aborted) {
          console.log("[v0] Request cancelled after provider failure")
          throw new Error("Request cancelled")
        }

        continue
      }
    }

    throw new Error("All providers failed")
  }

  async createChatCompletion(messages: any[], signal?: AbortSignal): Promise<any> {
    const requiresVision = this.detectVisionRequirement(messages)
    console.log(`[v0] Requires vision: ${requiresVision}`)

    const processedMessages = await this.processMessagesWithContext(messages)

    const currentMessageNeedsVision = this.currentMessageHasVision(messages[messages.length - 1])
    const hasExistingImageContext = this.imageContexts.size > 0
    const actuallyNeedsVision = currentMessageNeedsVision || (requiresVision && !hasExistingImageContext)

    console.log(`[v0] Current message needs vision: ${currentMessageNeedsVision}`)
    console.log(`[v0] Has existing image context: ${hasExistingImageContext}`)
    console.log(`[v0] Actually needs vision: ${actuallyNeedsVision}`)

    const availableProviders = this.providers.filter((p) => {
      if (actuallyNeedsVision) {
        return p.supportsVision && (p.visionModels?.length || 0) > 0
      }
      return p.models.length > 0
    })

    console.log(
      `[v0] Available providers: ${availableProviders.length} (${availableProviders.filter((p) => p.isFree).length} free, ${availableProviders.filter((p) => !p.isFree).length} paid)`,
    )

    if (availableProviders.length === 0) {
      throw new Error("No available providers for this request")
    }

    const sortedProviders = availableProviders.sort((a, b) => a.priority - b.priority)

    for (const provider of sortedProviders) {
      console.log(
        `[v0] Trying provider: ${provider.name} (Free: ${provider.isFree}, Vision: ${provider.supportsVision}, Models: ${actuallyNeedsVision ? provider.visionModels?.length || 0 : provider.models.length})`,
      )

      const maxAttempts = 2
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        try {
          const selectedModel = this.selectRandomModel(provider, actuallyNeedsVision, attempt)
          console.log(
            `[v0] Trying model: ${selectedModel} from ${provider.name} (attempt ${attempt + 1}/${maxAttempts})`,
          )

          let result
          switch (provider.name) {
            case "NVIDIA-1":
            case "NVIDIA-2":
              result = await this.callNVIDIA(
                provider,
                this.formatMessagesForNVIDIA(processedMessages),
                selectedModel,
                signal,
              )
              break
            case "Cerebras":
              result = await this.callCerebras(
                provider,
                this.formatMessagesForCerebras(processedMessages),
                selectedModel,
                signal,
              )
              break
            case "Gemini":
              result = await this.callGemini(provider, processedMessages, selectedModel, signal)
              break
            default:
              throw new Error(`Unknown provider: ${provider.name}`)
          }

          if (signal?.aborted) {
            throw new Error("Request cancelled by user")
          }

          console.log(`[v0] Multi-provider success with: ${provider.name} - Model: ${selectedModel}`)
          return {
            ...result,
            provider: provider.name,
            model: selectedModel,
          }
        } catch (error: any) {
          console.log(`[v0] Provider ${provider.name} attempt ${attempt + 1} failed:`, error.message)
          if (attempt === maxAttempts - 1) {
            console.log(`[v0] Provider ${provider.name} exhausted all attempts`)
          }
        }
      }
    }

    throw new Error("All providers failed")
  }

  private getRandomizedProviders(needsVision: boolean) {
    const availableProviders = this.providers
      .filter((p) => !needsVision || p.supportsVision)
      .filter((p) => !this.isProviderTemporarilyBlacklisted(p.name))

    const freeProviders = availableProviders.filter((p) => p.isFree)
    const paidProviders = availableProviders.filter((p) => !p.isFree)

    const shuffledFreeProviders = this.shuffleArray([...freeProviders])
    const shuffledPaidProviders = this.shuffleArray([...paidProviders])

    return [...shuffledFreeProviders, ...shuffledPaidProviders]
  }

  private shuffleArray<T>(array: T[]): T[] {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  private async tryProviderStreamWithModelRotation(
    provider: AIProvider,
    messages: any[],
    needsVision: boolean,
    conversationId: string | null,
    signal?: AbortSignal,
  ) {
    const models = needsVision && provider.visionModels ? provider.visionModels : provider.models
    const maxAttempts = Math.min(2, models.length)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal?.aborted) {
        console.log("[v0] Request cancelled during stream model attempts")
        throw new Error("Request cancelled")
      }

      const modelIndex = this.getNextModelIndex(provider.name, models.length)
      const model = models[modelIndex]

      console.log(
        `[v0] Selected random model: ${model} from ${provider.name} (${models.length} options, attempt ${attempt})`,
      )

      try {
        return await this.tryStreamModel(provider, model, messages, attempt, signal)
      } catch (error) {
        console.log(`[v0] Stream model ${model} failed: ${error}`)

        if (signal?.aborted) {
          console.log("[v0] Request cancelled after stream model failure")
          throw new Error("Request cancelled")
        }

        if (attempt === maxAttempts) {
          throw error
        }
      }
    }

    throw new Error(`All stream models failed for provider ${provider.name}`)
  }

  private async tryProviderStream(
    provider: AIProvider,
    messages: any[],
    needsVision: boolean,
    model?: string,
    signal?: AbortSignal,
  ) {
    const processedMessages = [this.systemMessage, ...(await this.processMessagesWithContext(messages))]
    const selectedModel = model || this.selectModel(provider, needsVision)

    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    try {
      if (provider.name.startsWith("Gemini")) {
        return await this.callGeminiStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("NVIDIA")) {
        return await this.callNVIDIAStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name === "Cerebras" || provider.name === "Cerebras-Extra") {
        return await this.callCerebrasStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("GitHub")) {
        return await this.callGitHubStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("Mistral")) {
        return await this.callMistralStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("HuggingFace")) {
        return await this.callHuggingFaceStream(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("Groq")) {
        return await this.callGroqStream(provider, processedMessages, selectedModel, signal)
      }

      throw new Error(`Unknown provider: ${provider.name}`)
    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error("Request cancelled")
      }

      const errorMessage = error.message || error.toString()

      if (
        errorMessage.includes("402") ||
        errorMessage.includes("insufficient credits") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        console.log(`[v0] Provider ${provider.name} has credit/rate limit issues, switching to next provider`)
        throw new Error(`Credit/Rate limit exceeded for ${provider.name}`)
      }

      console.log(`[v0] Provider ${provider.name} failed with error:`, errorMessage)
      throw error
    }
  }

  private async tryProviderWithModelRotation(
    provider: AIProvider,
    messages: any[],
    needsVision: boolean,
    conversationId: string | null,
    signal?: AbortSignal,
  ) {
    const models = needsVision && provider.visionModels ? provider.visionModels : provider.models
    const maxAttempts = Math.min(2, models.length)

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      if (signal?.aborted) {
        console.log("[v0] Request cancelled during model attempts")
        throw new Error("Request cancelled")
      }

      const modelIndex = this.getNextModelIndex(provider.name, models.length)
      const model = models[modelIndex]

      console.log(
        `[v0] Selected random model: ${model} from ${provider.name} (${models.length} options, attempt ${attempt})`,
      )

      try {
        return await this.tryModel(provider, model, messages, attempt, signal)
      } catch (error) {
        console.log(`[v0] Model ${model} failed: ${error}`)

        if (signal?.aborted) {
          console.log("[v0] Request cancelled after model failure")
          throw new Error("Request cancelled")
        }

        if (attempt === maxAttempts) {
          throw error
        }
      }
    }

    throw new Error(`All models failed for provider ${provider.name}`)
  }

  private async tryProvider(
    provider: AIProvider,
    messages: any[],
    needsVision: boolean,
    model?: string,
    signal?: AbortSignal,
  ) {
    const processedMessages = [this.systemMessage, ...(await this.processMessagesWithContext(messages))]
    const selectedModel = model || this.selectModel(provider, needsVision)

    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    try {
      if (provider.name.startsWith("Gemini")) {
        return await this.callGemini(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("NVIDIA")) {
        return await this.callNVIDIA(provider, processedMessages, selectedModel, signal)
      } else if (provider.name === "Cerebras" || provider.name === "Cerebras-Extra") {
        return await this.callCerebras(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("GitHub")) {
        return await this.callGitHub(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("Mistral")) {
        return await this.callMistral(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("HuggingFace")) {
        return await this.callHuggingFace(provider, processedMessages, selectedModel, signal)
      } else if (provider.name.startsWith("Groq")) {
        return await this.callGroq(provider, processedMessages, selectedModel, signal)
      }

      throw new Error(`Unknown provider: ${provider.name}`)
    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error("Request cancelled")
      }

      const errorMessage = error.message || error.toString()

      if (
        errorMessage.includes("402") ||
        errorMessage.includes("insufficient credits") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        console.log(`[v0] Provider ${provider.name} has credit/rate limit issues, switching to next provider`)
        throw new Error(`Credit/Rate limit exceeded for ${provider.name}`)
      }

      console.log(`[v0] Provider ${provider.name} failed with error:`, errorMessage)
      throw error
    }
  }

  private async callGemini(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    const processedMessages = messages.filter((msg) => msg.role !== "system")
    const systemMessage = messages.find((msg) => msg.role === "system")

    if (systemMessage && processedMessages.length > 0 && processedMessages[0].role === "user") {
      processedMessages[0] = {
        ...processedMessages[0],
        content: `${systemMessage.content}\n\n${processedMessages[0].content}`,
      }
    }

    const geminiContents = processedMessages.map((msg) => {
      const role = msg.role === "assistant" ? "model" : "user"

      // Handle structured content with images
      if (Array.isArray(msg.content)) {
        const parts = []

        for (const item of msg.content) {
          if (item.type === "text") {
            parts.push({ text: item.text })
          } else if (item.type === "image_url") {
            // Convert base64 data URL to inline_data format for Gemini
            const imageUrl = item.image_url.url
            if (imageUrl.startsWith("data:")) {
              const [mimeType, base64Data] = imageUrl.split(";base64,")
              const cleanMimeType = mimeType.replace("data:", "")
              parts.push({
                inline_data: {
                  mime_type: cleanMimeType,
                  data: base64Data,
                },
              })
            } else {
              // For non-base64 URLs, add as text description
              parts.push({ text: `[Image URL: ${imageUrl}]` })
            }
          }
        }

        return { role, parts }
      }

      // Handle simple text content
      return { role, parts: [{ text: msg.content }] }
    })

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: geminiContents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(
      `${provider.baseUrl}/models/${model}:generateContent?key=${provider.apiKey}`,
      requestOptions,
    )

    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error ${response.status}: ${errorText}`)
    }

    const data = await response.json()
    return {
      choices: [
        {
          message: {
            content: data.candidates?.[0]?.content?.parts?.[0]?.text || "No response generated",
          },
        },
      ],
    }
  }

  private async callNVIDIA(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] ${provider.name} API error ${response.status}:`, errorText)
      throw new Error(`${provider.name} API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callCerebras(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Cerebras API error ${response.status}:`, errorText)
      throw new Error(`Cerebras API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callGitHub(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] GitHub API error ${response.status}:`, errorText)
      throw new Error(`GitHub API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callMistral(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const cleanMessages = messages.map((msg) => {
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map((part) => {
            if (part.type === "image_url") {
              return {
                type: "image_url",
                image_url: { url: part.image_url.url },
              }
            }
            return part
          }),
        }
      }
      return { role: msg.role, content: msg.content }
    })

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: cleanMessages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Mistral API error ${response.status}:`, errorText)
      throw new Error(`Mistral API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callHuggingFace(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] HuggingFace API error ${response.status}:`, errorText)
      throw new Error(`HuggingFace API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callGroq(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Groq API error ${response.status}:`, errorText)
      throw new Error(`Groq API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private async callGeminiStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    const processedMessages = messages.filter((msg) => msg.role !== "system")
    const systemMessage = messages.find((msg) => msg.role === "system")

    if (systemMessage && processedMessages.length > 0 && processedMessages[0].role === "user") {
      processedMessages[0] = {
        ...processedMessages[0],
        content: `${systemMessage.content}\n\n${processedMessages[0].content}`,
      }
    }

    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: processedMessages.map((msg) => ({
          role: msg.role === "assistant" ? "model" : "user",
          parts: [{ text: msg.content }],
        })),
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 2048,
        },
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(
      `${provider.baseUrl}/models/${model}:streamGenerateContent?key=${provider.apiKey}`,
      requestOptions,
    )

    if (signal?.aborted) {
      throw new Error("Request cancelled")
    }

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Gemini API error ${response.status}: ${errorText}`)
    }

    return response
  }

  private async callNVIDIAStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] NVIDIA Stream API error ${response.status}:`, errorText)
      throw new Error(`NVIDIA Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private async callCerebrasStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const requestOptions: RequestInit = {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
    }

    // Only add signal if it's properly defined and not aborted
    if (signal && typeof signal.aborted === "boolean" && !signal.aborted) {
      requestOptions.signal = signal
    }

    const response = await fetch(`${provider.baseUrl}/chat/completions`, requestOptions)

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Cerebras Stream API error ${response.status}:`, errorText)
      throw new Error(`Cerebras Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private async callGitHubStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] GitHub Stream API error ${response.status}:`, errorText)
      throw new Error(`GitHub Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private async callMistralStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const cleanMessages = messages.map((msg) => {
      if (Array.isArray(msg.content)) {
        return {
          role: msg.role,
          content: msg.content.map((part) => {
            if (part.type === "image_url") {
              return {
                type: "image_url",
                image_url: { url: part.image_url.url },
              }
            }
            return part
          }),
        }
      }
      return { role: msg.role, content: msg.content }
    })

    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: cleanMessages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Mistral Stream API error ${response.status}:`, errorText)
      throw new Error(`Mistral Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private async callHuggingFaceStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] HuggingFace Stream API error ${response.status}:`, errorText)
      throw new Error(`HuggingFace Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private async callGroqStream(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
        stream: true,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] Groq Stream API error ${response.status}:`, errorText)
      throw new Error(`Groq Stream API error: ${response.status} - ${errorText}`)
    }

    return response
  }

  private findSimilarProviders(failedProvider: AIProvider, needsVision: boolean): AIProvider[] {
    const similarProviders = this.providers
      .filter((p) => p.name !== failedProvider.name)
      .filter((p) => !needsVision || p.supportsVision)
      .filter((p) => !this.isProviderTemporarilyBlacklisted(p.name))
      .filter((p) => {
        if (failedProvider.name.includes("Gemini") && p.name.includes("Gemini")) return true
        if (failedProvider.name.includes("NVIDIA") && p.name.includes("NVIDIA")) return true
        if (failedProvider.name.includes("GitHub") && p.name.includes("GitHub")) return true
        if (failedProvider.name.includes("Cerebras") && p.name.includes("Cerebras")) return true
        if (failedProvider.name.includes("Mistral") && p.name.includes("Mistral")) return true
        return false
      })
      .sort((a, b) => {
        if (a.isFree && !b.isFree) return -1
        if (!a.isFree && b.isFree) return 1
        return a.priority - b.priority
      })

    return similarProviders.slice(0, 2)
  }

  private recordProviderFailure(providerName: string) {
    const current = this.providerFailures.get(providerName) || { count: 0, lastFailure: 0 }
    this.providerFailures.set(providerName, {
      count: current.count + 1,
      lastFailure: Date.now(),
    })
  }

  private isProviderTemporarilyBlacklisted(providerName: string): boolean {
    const failure = this.providerFailures.get(providerName)
    if (!failure) return false

    const blacklistDuration = 5 * 60 * 1000
    const shouldBlacklist = failure.count >= 3 && Date.now() - failure.lastFailure < blacklistDuration

    if (failure.count >= 3 && Date.now() - failure.lastFailure >= blacklistDuration) {
      this.providerFailures.delete(providerName)
      return false
    }

    return shouldBlacklist
  }

  private getAvailableModels(provider: AIProvider, needsVision: boolean): string[] {
    if (needsVision && provider.supportsVision) {
      return provider.visionModels && provider.visionModels.length > 0
        ? provider.visionModels
        : provider.models.filter(
            (m) =>
              m.includes("vision") ||
              m.includes("gpt-4") ||
              m.includes("gemini") ||
              m.includes("pixtral") ||
              m.includes("llama-3.2"),
          )
    }
    return provider.models
  }

  private selectModelWithRotation(provider: AIProvider, needsVision: boolean, attempt: number): string {
    const availableModels = this.getAvailableModels(provider, needsVision)

    const randomIndex = Math.floor(Math.random() * availableModels.length)
    const selectedModel = availableModels[randomIndex]

    console.log(
      `[v0] Selected random model: ${selectedModel} from ${provider.name} (${availableModels.length} options, attempt ${attempt + 1})`,
    )

    return selectedModel
  }

  private async processMessagesWithContext(messages: any[]) {
    const processedMessages = []

    for (const msg of messages) {
      if (msg.role === "system") continue

      if (msg.role === "user" && (msg.fileUrl || msg.fileType || this.hasBase64Content(msg.content))) {
        const fileInfo = this.extractFileInfo(msg)

        if (fileInfo.mimeType.startsWith("image/")) {
          try {
            const imageContext = await this.extractImageContext(fileInfo, msg.content)
            const contextKey = `${msg.id || Date.now()}_${fileInfo.url.substring(0, 50)}`
            this.imageContexts.set(contextKey, imageContext)

            const contextualContent = `${msg.content || this.getDefaultPromptForFileType(fileInfo.mimeType)}\n\n[Previous image analysis: ${imageContext}]`

            processedMessages.push({
              role: msg.role,
              content: [
                { type: "text", text: contextualContent },
                { type: "image_url", image_url: { url: fileInfo.url } },
              ],
            })
          } catch (error) {
            console.log("[v0] Failed to extract image context:", error)
            processedMessages.push({
              role: msg.role,
              content: [
                { type: "text", text: msg.content || this.getDefaultPromptForFileType(fileInfo.mimeType) },
                { type: "image_url", image_url: { url: fileInfo.url } },
              ],
            })
          }
        } else {
          processedMessages.push({
            role: msg.role,
            content: [
              { type: "text", text: msg.content || this.getDefaultPromptForFileType(fileInfo.mimeType) },
              { type: "image_url", image_url: { url: fileInfo.url } },
            ],
          })
        }
      } else {
        let content = msg.content
        if (msg.role === "user" && this.isFollowUpQuestion(msg)) {
          const relevantContext = this.getRelevantImageContext()
          if (relevantContext) {
            content = `${msg.content}\n\n[Context from previous image: ${relevantContext}]`
          }
        }
        processedMessages.push({ role: msg.role, content })
      }
    }

    return processedMessages
  }

  private async extractImageContext(fileInfo: any, userPrompt: string): Promise<string> {
    try {
      const contextMessages = [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this image and provide a detailed description that can be used as context for future conversations. Include objects, people, text, colors, setting, and any other relevant details. Keep it concise but comprehensive.",
            },
            { type: "image_url", image_url: { url: fileInfo.url } },
          ],
        },
      ]

      const geminiProvider = this.providers.find((p) => p.name === "Gemini")
      if (geminiProvider) {
        const result = await this.callGemini(geminiProvider, contextMessages, "gemini-1.5-flash")
        return result.choices[0]?.message?.content || "Image analysis unavailable"
      }

      return "Image context extraction unavailable"
    } catch (error) {
      console.log("[v0] Image context extraction failed:", error)
      return "Image context extraction failed"
    }
  }

  private selectModel(provider: AIProvider, needsVision: boolean): string {
    let availableModels: string[]

    if (needsVision && provider.supportsVision) {
      availableModels =
        provider.visionModels && provider.visionModels.length > 0
          ? provider.visionModels
          : provider.models.filter(
              (m) =>
                m.includes("vision") ||
                m.includes("gpt-4") ||
                m.includes("gemini") ||
                m.includes("pixtral") ||
                m.includes("llama-3.2"),
            )

      if (availableModels.length === 0) {
        availableModels = provider.models
      }
    } else {
      availableModels = provider.models
    }

    const randomIndex = Math.floor(Math.random() * availableModels.length)
    const selectedModel = availableModels[randomIndex]

    console.log(
      `[v0] Selected model: ${selectedModel} from ${provider.name} (${availableModels.length} options, vision: ${needsVision})`,
    )

    return selectedModel
  }

  private hasBase64Content(content: any): boolean {
    if (typeof content === "string") {
      return content.includes("data:image/") || content.includes("data:application/")
    }
    return false
  }

  private extractFileInfo(msg: any): any {
    if (msg.fileUrl) {
      const mimeType = msg.fileType || this.getMimeTypeFromUrl(msg.fileUrl)
      return { url: msg.fileUrl, mimeType }
    }

    if (msg.content && typeof msg.content === "string") {
      const base64Match = msg.content.match(/data:([^;]+);base64,/)
      if (base64Match) {
        return { url: msg.content, mimeType: base64Match[1] }
      }
    }

    return { url: "", mimeType: "" }
  }

  private getMimeTypeFromUrl(url: string): string {
    if (url.startsWith("data:")) {
      const match = url.match(/^data:([^;]+)/)
      return match ? match[1] : "unknown"
    }

    // Detect from file extension
    const extension = url.split(".").pop()?.toLowerCase()
    switch (extension) {
      case "jpg":
      case "jpeg":
        return "image/jpeg"
      case "png":
        return "image/png"
      case "gif":
        return "image/gif"
      case "webp":
        return "image/webp"
      case "pdf":
        return "application/pdf"
      default:
        return "unknown"
    }
  }

  private getDefaultPromptForFileType(mimeType: string): string {
    switch (mimeType) {
      case "image/jpeg":
      case "image/png":
        return "Please describe the image."
      default:
        return "Please provide a response."
    }
  }

  private formatMessagesForNVIDIA(messages: any[]): any[] {
    return messages.map((msg) => {
      if (Array.isArray(msg.content)) {
        // Handle structured content with images
        const formattedContent = []

        for (const item of msg.content) {
          if (item.type === "text") {
            formattedContent.push({
              type: "text",
              text: item.text,
            })
          } else if (item.type === "image_url") {
            // NVIDIA uses OpenAI-compatible format
            formattedContent.push({
              type: "image_url",
              image_url: {
                url: item.image_url.url,
              },
            })
          }
        }

        return {
          role: msg.role,
          content: formattedContent,
        }
      }

      return {
        role: msg.role,
        content: msg.content,
      }
    })
  }

  private formatMessagesForCerebras(messages: any[]): any[] {
    return messages.map((msg) => {
      if (Array.isArray(msg.content)) {
        // Extract only text content for Cerebras (no vision support)
        const textContent = msg.content
          .filter((item) => item.type === "text")
          .map((item) => item.text)
          .join("\n")

        return {
          role: msg.role,
          content: textContent || "Please analyze the uploaded content.",
        }
      }

      return {
        role: msg.role,
        content: msg.content,
      }
    })
  }

  private isProviderLevelError(error: any): boolean {
    const errorMessage = error.message || error.toString()
    return (
      errorMessage.includes("401") || // Unauthorized
      errorMessage.includes("403") || // Forbidden
      errorMessage.includes("Invalid credentials") ||
      errorMessage.includes("Bad credentials") ||
      errorMessage.includes("unauthorized") ||
      errorMessage.includes("Content with system role is not supported") // Gemini system role error
    )
  }

  private getAvailableProviders(needsVision: boolean): AIProvider[] {
    return this.providers.filter((p) => !needsVision || p.supportsVision)
  }

  private getNextModelIndex(providerName: string, modelsLength: number): number {
    let index = this.providerModelIndex.get(providerName) || 0
    index = (index + 1) % modelsLength
    this.providerModelIndex.set(providerName, index)
    return index
  }

  private async tryModel(provider: AIProvider, model: string, messages: any[], attempt: number, signal?: AbortSignal) {
    console.log(`[v0] Trying model: ${model} from ${provider.name} (attempt ${attempt}/2)`)

    if (signal?.aborted) {
      console.log("[v0] Request cancelled before model API call")
      throw new Error("Request cancelled")
    }

    try {
      if (provider.name.startsWith("Gemini")) {
        return await this.callGemini(provider, messages, model, signal)
      } else if (provider.name.startsWith("NVIDIA")) {
        return await this.callNVIDIA(provider, messages, model, signal)
      } else if (provider.name === "Cerebras" || provider.name === "Cerebras-Extra") {
        return await this.callCerebras(provider, messages, model, signal)
      } else if (provider.name.startsWith("GitHub")) {
        return await this.callGitHub(provider, messages, model, signal)
      } else if (provider.name.startsWith("Mistral")) {
        return await this.callMistral(provider, messages, model, signal)
      } else if (provider.name.startsWith("HuggingFace")) {
        return await this.callHuggingFace(provider, messages, model, signal)
      } else if (provider.name.startsWith("Groq")) {
        return await this.callGroq(provider, messages, model, signal)
      }

      throw new Error(`Unknown provider: ${provider.name}`)
    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error("Request cancelled")
      }

      const errorMessage = error.message || error.toString()

      if (
        errorMessage.includes("402") ||
        errorMessage.includes("insufficient credits") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        console.log(`[v0] Provider ${provider.name} has credit/rate limit issues, switching to next provider`)
        throw new Error(`Credit/Rate limit exceeded for ${provider.name}`)
      }

      console.log(`[v0] Provider ${provider.name} failed with error:`, errorMessage)
      throw error
    }
  }

  private async tryStreamModel(
    provider: AIProvider,
    model: string,
    messages: any[],
    attempt: number,
    signal?: AbortSignal,
  ) {
    console.log(`[v0] Trying stream model: ${model} from ${provider.name} (attempt ${attempt}/2)`)

    if (signal?.aborted) {
      console.log("[v0] Request cancelled before stream model API call")
      throw new Error("Request cancelled")
    }

    try {
      if (provider.name.startsWith("Gemini")) {
        return await this.callGeminiStream(provider, messages, model, signal)
      } else if (provider.name.startsWith("NVIDIA")) {
        return await this.callNVIDIAStream(provider, messages, model, signal)
      } else if (provider.name === "Cerebras" || provider.name === "Cerebras-Extra") {
        return await this.callCerebrasStream(provider, messages, model, signal)
      } else if (provider.name.startsWith("GitHub")) {
        return await this.callGitHubStream(provider, messages, model, signal)
      } else if (provider.name.startsWith("Mistral")) {
        return await this.callMistralStream(provider, messages, model, signal)
      } else if (provider.name.startsWith("HuggingFace")) {
        return await this.callHuggingFaceStream(provider, messages, model, signal)
      } else if (provider.name.startsWith("Groq")) {
        return await this.callGroqStream(provider, messages, model, signal)
      }

      throw new Error(`Unknown provider: ${provider.name}`)
    } catch (error: any) {
      if (signal?.aborted) {
        throw new Error("Request cancelled")
      }

      const errorMessage = error.message || error.toString()

      if (
        errorMessage.includes("402") ||
        errorMessage.includes("insufficient credits") ||
        errorMessage.includes("quota exceeded") ||
        errorMessage.includes("rate limit") ||
        errorMessage.includes("429")
      ) {
        console.log(`[v0] Provider ${provider.name} has credit/rate limit issues, switching to next provider`)
        throw new Error(`Credit/Rate limit exceeded for ${provider.name}`)
      }

      console.log(`[v0] Provider ${provider.name} failed with error:`, errorMessage)
      throw error
    }
  }

  private blacklistProvider(providerName: string) {
    this.providerFailures.set(providerName, {
      count: 3,
      lastFailure: Date.now(),
    })
  }

  private async callNVIDIA2(provider: AIProvider, messages: any[], model: string, signal?: AbortSignal) {
    const response = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: 4000,
        temperature: 0.7,
      }),
      signal,
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log(`[v0] NVIDIA-2 API error ${response.status}:`, errorText)
      throw new Error(`NVIDIA-2 API error: ${response.status} - ${errorText}`)
    }

    return await response.json()
  }

  private hasImageContextForConversation(conversationId: string): boolean {
    return Array.from(this.imageContexts.keys()).some((key) => key.includes(conversationId))
  }

  private isFollowUpQuestion(message: any): boolean {
    if (!message.content || typeof message.content !== "string") return false

    const followUpPatterns = [
      /^(itu|ini|that|this)\s+(bagus|jelek|baik|buruk|good|bad|nice|ugly)/i,
      /^(bagaimana|gimana|how)\s+(dengan|about)/i,
      /^(apa|what)\s+(itu|ini|that|this)/i,
      /^(kenapa|mengapa|why)/i,
      /^(dimana|where)/i,
      /^(kapan|when)/i,
      /^(siapa|who)/i,
      /^(berapa|how\s+much|how\s+many)/i,
    ]

    return followUpPatterns.some((pattern) => pattern.test(message.content.trim()))
  }

  private isSimpleFollowUp(message: any): boolean {
    if (!message.content || typeof message.content !== "string") return false

    const simplePatterns = [
      /^(ya|yes|no|tidak|iya|ok|okay|thanks|terima\s+kasih)$/i,
      /^(bagus|jelek|baik|buruk|good|bad|nice|ugly)$/i,
      /^(benar|salah|true|false|right|wrong)$/i,
    ]

    return simplePatterns.some((pattern) => pattern.test(message.content.trim())) || message.content.trim().length < 10
  }

  private getRelevantImageContext(): string | null {
    const contexts = Array.from(this.imageContexts.values())
    return contexts.length > 0 ? contexts[contexts.length - 1] : null
  }

  private detectVisionRequirement(messages: any[]): boolean {
    return messages.some((msg) => {
      // Check for file attachments
      if (msg.fileUrl || msg.fileType) {
        return (
          msg.fileType?.startsWith("image/") || msg.fileUrl?.startsWith("data:image/") || msg.fileUrl?.includes("image")
        )
      }

      // Check for base64 images in content
      if (typeof msg.content === "string") {
        return msg.content.includes("data:image/") || msg.content.includes("base64,")
      }

      // Check for structured content with images
      if (Array.isArray(msg.content)) {
        return msg.content.some((item) => item.type === "image_url" || (item.image_url && item.image_url.url))
      }

      return false
    })
  }

  private currentMessageHasVision(message: any): boolean {
    if (!message) return false

    if (message.fileUrl || message.fileType) {
      return (
        message.fileType?.startsWith("image/") ||
        message.fileUrl?.startsWith("data:image/") ||
        message.fileUrl?.includes("image")
      )
    }

    if (typeof message.content === "string") {
      return message.content.includes("data:image/") || message.content.includes("base64,")
    }

    if (Array.isArray(message.content)) {
      return message.content.some((item) => item.type === "image_url" || (item.image_url && item.image_url.url))
    }

    return false
  }

  private selectRandomModel(provider: AIProvider, needsVision: boolean, attempt: number): string {
    const availableModels = needsVision && provider.visionModels ? provider.visionModels : provider.models
    const randomIndex = Math.floor(Math.random() * availableModels.length)
    const selectedModel = availableModels[randomIndex]

    console.log(
      `[v0] Selected random model: ${selectedModel} from ${provider.name} (${availableModels.length} options, attempt ${attempt + 1})`,
    )

    return selectedModel
  }
}
