export interface AIModel {
  id: string
  name: string
  provider: string
  supportsVision: boolean
  isFree: boolean
  category: "fast" | "smart"
}

export class ModelSelector {
  private static fastModels: AIModel[] = [
    // Free fast models
    {
      id: "deepseek/deepseek-chat-v3.1:free",
      name: "DeepSeek Chat V3.1",
      provider: "deepseek",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "meta-llama/llama-3.3-8b-instruct:free",
      name: "Llama 3.3 8B",
      provider: "meta",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "google/gemma-3n-e2b-it:free",
      name: "Gemma 3 2B",
      provider: "google",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "google/gemma-3n-e4b-it:free",
      name: "Gemma 3 4B",
      provider: "google",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "qwen/qwen3-4b:free",
      name: "Qwen 3 4B",
      provider: "qwen",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "qwen/qwen3-8b:free",
      name: "Qwen 3 8B",
      provider: "qwen",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "mistralai/mistral-small-3.2-24b-instruct:free",
      name: "Mistral Small 24B",
      provider: "mistral",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "microsoft/mai-ds-r1:free",
      name: "Microsoft MAI DS R1",
      provider: "microsoft",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "openai/gpt-oss-20b:free",
      name: "GPT OSS 20B",
      provider: "openai",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
    {
      id: "tencent/hunyuan-a13b-instruct:free",
      name: "Hunyuan 13B",
      provider: "tencent",
      supportsVision: false,
      isFree: true,
      category: "fast",
    },
  ]

  private static smartModels: AIModel[] = [
    // Free smart models with vision support
    {
      id: "deepseek/deepseek-r1-0528:free",
      name: "DeepSeek R1",
      provider: "deepseek",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "deepseek/deepseek-r1-0528-qwen3-8b:free",
      name: "DeepSeek R1 Qwen 8B",
      provider: "deepseek",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "qwen/qwen3-235b-a22b:free",
      name: "Qwen 3 235B",
      provider: "qwen",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "qwen/qwen3-30b-a3b:free",
      name: "Qwen 3 30B",
      provider: "qwen",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "qwen/qwen3-14b:free",
      name: "Qwen 3 14B",
      provider: "qwen",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "qwen/qwen3-coder:free",
      name: "Qwen 3 Coder",
      provider: "qwen",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "moonshotai/kimi-dev-72b:free",
      name: "Kimi Dev 72B",
      provider: "moonshot",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "moonshotai/kimi-k2:free",
      name: "Kimi K2",
      provider: "moonshot",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "openai/gpt-oss-120b:free",
      name: "GPT OSS 120B",
      provider: "openai",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "z-ai/glm-4.5-air:free",
      name: "GLM 4.5 Air",
      provider: "zhipu",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "tngtech/deepseek-r1t-chimera:free",
      name: "DeepSeek R1T Chimera",
      provider: "tng",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },
    {
      id: "tngtech/deepseek-r1t2-chimera:free",
      name: "DeepSeek R1T2 Chimera",
      provider: "tng",
      supportsVision: true,
      isFree: true,
      category: "smart",
    },

    // Premium models (fallback)
    {
      id: "openai/gpt-4o-mini",
      name: "GPT-4o Mini",
      provider: "openai",
      supportsVision: true,
      isFree: false,
      category: "smart",
    },
    {
      id: "deepseek/deepseek-chat",
      name: "DeepSeek Chat",
      provider: "deepseek",
      supportsVision: true,
      isFree: false,
      category: "smart",
    },
    {
      id: "anthropic/claude-3-haiku",
      name: "Claude 3 Haiku",
      provider: "anthropic",
      supportsVision: true,
      isFree: false,
      category: "smart",
    },
  ]

  private static sessionModels = new Map<string, string>()

  static getRandomModel(category: "fast" | "smart", conversationId?: string, requiresVision = false): AIModel {
    // If conversation exists, return the same model for consistency
    if (conversationId && this.sessionModels.has(conversationId)) {
      const modelId = this.sessionModels.get(conversationId)!
      const allModels = [...this.fastModels, ...this.smartModels]
      const existingModel = allModels.find((m) => m.id === modelId)
      if (existingModel) {
        return existingModel
      }
    }

    let availableModels = category === "fast" ? this.fastModels : this.smartModels

    // Filter for vision support if required
    if (requiresVision) {
      availableModels = availableModels.filter((m) => m.supportsVision)
    }

    // Prioritize free models (80% chance for free, 20% for premium)
    const freeModels = availableModels.filter((m) => m.isFree)
    const premiumModels = availableModels.filter((m) => !m.isFree)

    const shouldUseFree = Math.random() < 0.8 && freeModels.length > 0
    const modelsToChooseFrom = shouldUseFree ? freeModels : premiumModels.length > 0 ? premiumModels : freeModels

    // Select random model
    const randomIndex = Math.floor(Math.random() * modelsToChooseFrom.length)
    const selectedModel = modelsToChooseFrom[randomIndex]

    // Store model for this conversation session
    if (conversationId) {
      this.sessionModels.set(conversationId, selectedModel.id)
    }

    console.log(
      `[v0] Selected ${category} model:`,
      selectedModel.name,
      `(Free: ${selectedModel.isFree}, Vision: ${selectedModel.supportsVision})`,
    )

    return selectedModel
  }

  static clearSessionModel(conversationId: string) {
    this.sessionModels.delete(conversationId)
  }

  static getModelDisplayName(model: AIModel): string {
    const visionBadge = model.supportsVision ? " 👁️" : ""
    const freeBadge = model.isFree ? " 🆓" : " ⭐"
    return `${model.name}${visionBadge}${freeBadge}`
  }
}
