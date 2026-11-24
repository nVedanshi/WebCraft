/**
 * LLM Provider Types
 *
 * Defines the shared data structures used across all LLM provider adapters.
 * Keeping these in a single module ensures the generation engine never
 * depends on provider-specific types.
 */

/**
 * Represents a message in a conversation.
 * role: 'system' | 'user' | 'assistant'
 */
export class LLMMessage {
  constructor(role, content) {
    this.role = role
    this.content = content
  }
}

/**
 * Represents a tool call request from the model.
 */
export class LLMToolCall {
  constructor(id, name, args) {
    this.id = id
    this.name = name
    this.args = args
  }
}

/**
 * A single response from an LLM provider.
 */
export class LLMResponse {
  constructor({ content, toolCalls, inputTokens, outputTokens, model, provider, finishReason, raw }) {
    this.content = content ?? ''
    this.toolCalls = toolCalls ?? []
    this.inputTokens = inputTokens ?? 0
    this.outputTokens = outputTokens ?? 0
    this.totalTokens = inputTokens + outputTokens
    this.model = model
    this.provider = provider
    this.finishReason = finishReason
    this.raw = raw
  }
}

/**
 * A chunk from a streaming response.
 */
export class LLMStreamChunk {
  constructor({ content, done, model, provider }) {
    this.content = content ?? ''
    this.done = done ?? false
    this.model = model
    this.provider = provider
  }
}

/**
 * Configuration for a specific model used by a provider.
 */
export class ModelConfig {
  constructor({
    provider,
    model,
    maxTokens = 4096,
    temperature = 0.2,
    topP = 1,
    timeoutMs = 60000,
    maxRetries = 3,
    supportsStreaming = true,
    supportsToolUse = false,
    costPerInputToken = 0,
    costPerOutputToken = 0,
  }) {
    this.provider = provider
    this.model = model
    this.maxTokens = maxTokens
    this.temperature = temperature
    this.topP = topP
    this.timeoutMs = timeoutMs
    this.maxRetries = maxRetries
    this.supportsStreaming = supportsStreaming
    this.supportsToolUse = supportsToolUse
    this.costPerInputToken = costPerInputToken
    this.costPerOutputToken = costPerOutputToken
  }

  /**
   * Estimate the cost in cents for a given token count.
   */
  estimateCost(inputTokens, outputTokens) {
    return (
      (inputTokens * this.costPerInputToken) +
      (outputTokens * this.costPerOutputToken)
    )
  }
}

/**
 * Normalized error from any provider.
 */
export class LLMProviderError extends Error {
  constructor(message, { code, provider, statusCode, retryable = false, original } = {}) {
    super(message)
    this.name = 'LLMProviderError'
    this.code = code
    this.provider = provider
    this.statusCode = statusCode
    this.retryable = retryable
    this.original = original
  }
}
