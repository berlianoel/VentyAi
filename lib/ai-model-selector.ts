export interface ModelConfig {
  name: string
  provider: "openrouter" | "openai" | "anthropic"
  supportsVision: boolean
  costTier: "low" | "medium" | "high"
  contextWindow: number
}

export const AI_MODELS: Record<string, ModelConfig> = {
  // Text models - try cheaper ones first
  "gpt-4o-mini": {
    name: "gpt-4o-mini",
    provider: "openrouter",
    supportsVision: false,
    costTier: "low",
    contextWindow: 128000,
  },
  "gpt-3.5-turbo": {
    name: "gpt-3.5-turbo",
    provider: "openrouter",
    supportsVision: false,
    costTier: "low",
    contextWindow: 16000,
  },
  "gpt-4o": {
    name: "gpt-4o",
    provider: "openrouter",
    supportsVision: true,
    costTier: "medium",
    contextWindow: 128000,
  },
  "claude-3-haiku": {
    name: "anthropic/claude-3-haiku",
    provider: "openrouter",
    supportsVision: false,
    costTier: "low",
    contextWindow: 200000,
  },
  "claude-3-sonnet": {
    name: "anthropic/claude-3.5-sonnet",
    provider: "openrouter",
    supportsVision: true,
    costTier: "high",
    contextWindow: 200000,
  },
}

export function selectBestModel(hasImages: boolean, fallbackCount = 0): string {
  const availableModels = Object.entries(AI_MODELS)
    .filter(([_, config]) => (hasImages ? config.supportsVision : true))
    .sort((a, b) => {
      // Sort by cost tier: low -> medium -> high
      const costOrder = { low: 0, medium: 1, high: 2 }
      return costOrder[a[1].costTier] - costOrder[b[1].costTier]
    })

  if (fallbackCount >= availableModels.length) {
    // If all models failed, return the last one
    return availableModels[availableModels.length - 1]?.[1].name || "gpt-4o-mini"
  }

  return availableModels[fallbackCount]?.[1].name || "gpt-4o-mini"
}
