import { LLMProvider } from '../provider.js'
import {
  LLMResponse,
  LLMStreamChunk,
  ModelConfig,
} from '../types.js'
import { normalizeError } from '../errors.js'
import OpenAI from 'openai'

/**
 * OpenAIAdapter — LLM provider adapter for OpenAI.
 *
 * Wraps the OpenAI SDK and exposes it through the LLMProvider interface.
 * The generation engine never imports the OpenAI SDK directly; all
 * provider-specific logic lives here.
 *
 * Features:
 *   - Non-streaming and streaming completions
 *   - Automatic retry on retryable errors (429, 5xx, network)
 *   - Token usage tracking from SDK response
 *   - Error normalization into LLMProviderError
 *   - Request timeout via AbortController
 */
export class OpenAIAdapter extends LLMProvider {
  constructor() {
    super()
    this._client = null
  }

  getProviderName() {
    return 'openai'
  }

  isAvailable() {
    return Boolean(process.env.OPENAI_API_KEY)
  }

  _getClient(apiKey) {
    const key = apiKey || process.env.OPENAI_API_KEY
    if (!key) {
      throw new Error('OPENAI_API_KEY is not configured')
    }
    // Create a new client per call when a BYOK key is provided, so different
    // users' keys are never mixed in a shared singleton.
    return new OpenAI({ apiKey: key })
  }

  getModelConfig() {
    return new ModelConfig({
      provider: 'openai',
      model: 'gpt-4o-mini',
      maxTokens: 4096,
      temperature: 0.2,
      timeoutMs: 60000,
      maxRetries: 3,
      supportsStreaming: true,
      supportsToolUse: true,
      costPerInputToken: 0.15,
      costPerOutputToken: 0.60,
    })
  }

  /**
   * Generate a single completion with retry logic.
   */
  async complete(messages, config, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const client = this._getClient(apiKey)

    return await this._retry(async (attempt) => {
      try {
        const response = await client.chat.completions.create({
          model: modelConfig.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          top_p: modelConfig.topP,
          stream: false,
        }, {
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        const choice = response.choices[0]
        return new LLMResponse({
          content: choice?.message?.content ?? '',
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
          model: response.model ?? modelConfig.model,
          provider: 'openai',
          finishReason: choice?.finish_reason ?? 'unknown',
          raw: response,
        })
      } catch (error) {
        throw normalizeError(error, 'openai')
      }
    }, modelConfig.maxRetries)
  }

  /**
   * Generate a streaming completion, yielding chunks via callback.
   */
  async streamComplete(messages, config, onChunk, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const client = this._getClient(apiKey)

    return await this._retry(async (attempt) => {
      try {
        const stream = await client.chat.completions.create({
          model: modelConfig.model,
          messages: messages.map((m) => ({ role: m.role, content: m.content })),
          max_tokens: modelConfig.maxTokens,
          temperature: modelConfig.temperature,
          top_p: modelConfig.topP,
          stream: true,
        }, {
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        let inputTokens = 0
        let outputTokens = 0

        for await (const chunk of stream) {
          const choice = chunk.choices[0]
          const content = choice?.delta?.content ?? ''
          if (content) {
            onChunk(new LLMStreamChunk({
              content,
              done: false,
              model: chunk.model ?? modelConfig.model,
              provider: 'openai',
            }))
          }
          // Track usage if provided in the final chunk
          if (chunk.usage) {
            inputTokens = chunk.usage.prompt_tokens ?? 0
            outputTokens = chunk.usage.completion_tokens ?? 0
          }
        }

        return new LLMResponse({
          content: '', // content delivered via chunks
          inputTokens,
          outputTokens,
          model: modelConfig.model,
          provider: 'openai',
          finishReason: 'stop',
        })
      } catch (error) {
        throw normalizeError(error, 'openai')
      }
    }, modelConfig.maxRetries)
  }

  /**
   * Retry helper with exponential backoff for retryable errors.
   */
  async _retry(fn, maxRetries) {
    let lastError
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt)
      } catch (error) {
        lastError = error
        if (!(error instanceof Error && error.retryable) && attempt > 0) {
          // Non-retryable error after first attempt, don't retry
          throw error
        }
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }

  /**
   * Create an AbortController signal that aborts after timeoutMs.
   */
  _timeoutSignal(timeoutMs) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller.signal
  }
}

export const openaiAdapter = new OpenAIAdapter()
export default OpenAIAdapter
