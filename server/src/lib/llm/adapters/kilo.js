import { LLMProvider } from '../provider.js'
import {
  LLMResponse,
  LLMStreamChunk,
  ModelConfig,
} from '../types.js'
import { normalizeError } from '../errors.js'

const KILO_API_BASE = 'https://ai-gateway.kilo.ai/api/v1'

/**
 * KiloAdapter — LLM provider adapter for Kilo AI Gateway.
 *
 * The Kilo AI Gateway provides an OpenAI-compatible API at
 * https://ai-gateway.kilo.ai/api/v1. This adapter uses native `fetch`
 * against the gateway's REST endpoints, keeping the generation engine
 * independent of any provider SDK.
 *
 * Features:
 *   - OpenAI-compatible chat completions (non-streaming and streaming)
 *   - Model selection via gateway model IDs (e.g. "anthropic/claude-sonnet-4.5")
 *   - Token usage reporting from gateway response
 *   - SSE streaming with time-to-first-token support
 *   - Automatic retry on retryable errors (429, 5xx, network)
 *   - Request timeout via AbortController
 *   - Error normalization into LLMProviderError
 *   - Dynamic model discovery from /models endpoint
 *   - Task-aware model routing through the provider registry
 *
 * Credentials are kept exclusively on the backend via KILO_API_KEY.
 * The API key is never exposed to the frontend.
 */
export class KiloAdapter extends LLMProvider {
  constructor() {
    super()
    this._modelsCache = null
    this._modelsCacheTime = 0
  }

  getProviderName() {
    return 'kilo'
  }

  isAvailable() {
    return Boolean(process.env.KILO_API_KEY)
  }

  _headers(apiKey) {
    const key = apiKey || process.env.KILO_API_KEY
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    }
  }

  /**
   * Return a default model config. Actual model selection is driven by
   * the task-type mapping in the pricing/config layer and can be
   * overridden per-call via the config parameter.
   */
  getModelConfig() {
    return new ModelConfig({
      provider: 'kilo',
      model: 'anthropic/claude-3-haiku',
      maxTokens: 4096,
      temperature: 0.2,
      timeoutMs: 60000,
      maxRetries: 3,
      supportsStreaming: true,
      supportsToolUse: true,
      costPerInputToken: 0.25,
      costPerOutputToken: 1.25,
    })
  }

  /**
   * Fetch available models from the gateway's /models endpoint.
   * Results are cached for 5 minutes to avoid repeated network calls.
   */
  async fetchAvailableModels() {
    const now = Date.now()
    if (
      this._modelsCache &&
      now - this._modelsCacheTime < 5 * 60 * 1000
    ) {
      return this._modelsCache
    }

    try {
      const response = await fetch(`${KILO_API_BASE}/models`, {
        headers: { Accept: 'application/json' },
        signal: this._timeoutSignal(15000),
      })

      if (!response.ok) {
        throw new Error(`Kilo models endpoint returned ${response.status}`)
      }

      const data = await response.json()
      this._modelsCache = data.data || []
      this._modelsCacheTime = now
      return this._modelsCache
    } catch (error) {
      throw normalizeError(error, 'kilo')
    }
  }

  /**
   * Check whether a specific model ID is available on the gateway.
   */
  async isModelAvailable(modelId) {
    const models = await this.fetchAvailableModels()
    return models.some((m) => m.id === modelId)
  }

  /**
   * Generate a single (non-streaming) completion.
   */
  async complete(messages, config, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const lastError = await this._retry(async (attempt) => {
      try {
        const response = await fetch(`${KILO_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: this._headers(apiKey),
          body: JSON.stringify({
            model: modelConfig.model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            max_tokens: modelConfig.maxTokens,
            temperature: modelConfig.temperature,
            top_p: modelConfig.topP,
            stream: false,
            user: undefined, // end-user identifier for safety (optional)
          }),
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const err = new Error(
            `Kilo API error: ${response.status} ${body}`
          )
          err.status = response.status
          err.code = 'API_ERROR'
          err.retryable = this._isRetryableStatus(response.status)
          throw err
        }

        const data = await response.json()
        const choice = data.choices?.[0]
        return new LLMResponse({
          content: choice?.message?.content ?? '',
          inputTokens: data.usage?.prompt_tokens ?? 0,
          outputTokens: data.usage?.completion_tokens ?? 0,
          model: data.model ?? modelConfig.model,
          provider: 'kilo',
          finishReason: choice?.finish_reason ?? 'unknown',
          raw: data,
        })
      } catch (error) {
        throw normalizeError(error, 'kilo')
      }
    }, modelConfig.maxRetries)

    throw lastError
  }

  /**
   * Generate a streaming completion, yielding chunks via callback.
   */
  async streamComplete(messages, config, onChunk, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const lastError = await this._retry(async (attempt) => {
      try {
        const response = await fetch(`${KILO_API_BASE}/chat/completions`, {
          method: 'POST',
          headers: this._headers(apiKey),
          body: JSON.stringify({
            model: modelConfig.model,
            messages: messages.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            max_tokens: modelConfig.maxTokens,
            temperature: modelConfig.temperature,
            top_p: modelConfig.topP,
            stream: true,
          }),
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const err = new Error(
            `Kilo API error: ${response.status} ${body}`
          )
          err.status = response.status
          err.code = 'API_ERROR'
          err.retryable = this._isRetryableStatus(response.status)
          throw err
        }

        if (!response.body) {
          throw new Error('Kilo streaming response had no body')
        }

        let inputTokens = 0
        let outputTokens = 0

        const reader = response.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          const lines = buffer.split('\n')
          buffer = lines.pop() || ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') continue
            try {
              const data = JSON.parse(dataStr)
              const choice = data.choices?.[0]
              const delta = choice?.delta || {}
              const content = delta.content ?? ''
              if (content) {
                onChunk(
                  new LLMStreamChunk({
                    content,
                    done: false,
                    model: data.model ?? modelConfig.model,
                    provider: 'kilo',
                  })
                )
              }
              if (data.usage) {
                inputTokens = data.usage.prompt_tokens ?? 0
                outputTokens = data.usage.completion_tokens ?? 0
              }
            } catch {
              // Ignore unparseable SSE lines
            }
          }
        }

        return new LLMResponse({
          content: '',
          inputTokens,
          outputTokens,
          model: modelConfig.model,
          provider: 'kilo',
          finishReason: 'stop',
        })
      } catch (error) {
        throw normalizeError(error, 'kilo')
      }
    }, modelConfig.maxRetries)

    throw lastError
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
        if (
          !(error instanceof Error && error.retryable) &&
          attempt > 0
        ) {
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
   * Determine whether an HTTP status code is retryable.
   */
  _isRetryableStatus(status) {
    const retryable = [429, 500, 502, 503, 504]
    return retryable.includes(status)
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

export const kiloAdapter = new KiloAdapter()
export default KiloAdapter
