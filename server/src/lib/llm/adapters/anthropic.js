import { LLMProvider } from '../provider.js'
import {
  LLMResponse,
  LLMStreamChunk,
  ModelConfig,
} from '../types.js'
import { normalizeError } from '../errors.js'

const ANTHROPIC_API_BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_API_VERSION = '2023-06-01'

/**
 * AnthropicAdapter — LLM provider adapter for Anthropic.
 *
 * Implemented using native `fetch` against the Anthropic Messages REST API
 * rather than an SDK, because no official Node SDK is available in this
 * environment. The adapter still conforms to the LLMProvider interface, so
 * the generation engine is unaffected by this implementation choice.
 *
 * Anthropic uses 'system' as a top-level parameter (not a message role),
 * so system messages are extracted and passed separately.
 */
export class AnthropicAdapter extends LLMProvider {
  constructor() {
    super()
  }

  getProviderName() {
    return 'anthropic'
  }

  isAvailable() {
    return Boolean(process.env.ANTHROPIC_API_KEY)
  }

  _headers(apiKey) {
    const key = apiKey || process.env.ANTHROPIC_API_KEY
    return {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': ANTHROPIC_API_VERSION,
    }
  }

  getModelConfig() {
    return new ModelConfig({
      provider: 'anthropic',
      model: 'claude-3-5-sonnet-20241022',
      maxTokens: 4096,
      temperature: 0.2,
      timeoutMs: 60000,
      maxRetries: 3,
      supportsStreaming: true,
      supportsToolUse: true,
      costPerInputToken: 3.00,
      costPerOutputToken: 15.00,
    })
  }

  /**
   * Separate system messages from conversation messages for Anthropic.
   */
  _splitSystem(messages) {
    const system = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n')
    const conversation = messages.filter((m) => m.role !== 'system')
    return { system, conversation }
  }

  async complete(messages, config, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const { system, conversation } = this._splitSystem(messages)

    const lastError = await this._retry(async (attempt) => {
      try {
        const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
          method: 'POST',
          headers: this._headers(apiKey),
          body: JSON.stringify({
            model: modelConfig.model,
            max_tokens: modelConfig.maxTokens,
            temperature: modelConfig.temperature,
            system: system || undefined,
            messages: conversation.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: false,
          }),
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const err = new Error(`Anthropic API error: ${response.status} ${body}`)
          err.status = response.status
          err.code = 'API_ERROR'
          throw err
        }

        const data = await response.json()
        return new LLMResponse({
          content: data.content
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join('') ?? '',
          inputTokens: data.usage?.input_tokens ?? 0,
          outputTokens: data.usage?.output_tokens ?? 0,
          model: data.model ?? modelConfig.model,
          provider: 'anthropic',
          finishReason: data.stop_reason ?? 'unknown',
          raw: data,
        })
      } catch (error) {
        throw normalizeError(error, 'anthropic')
      }
    }, modelConfig.maxRetries)

    throw lastError
  }

  async streamComplete(messages, config, onChunk, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const { system, conversation } = this._splitSystem(messages)

    const lastError = await this._retry(async (attempt) => {
      try {
        const response = await fetch(`${ANTHROPIC_API_BASE}/messages`, {
          method: 'POST',
          headers: this._headers(apiKey),
          body: JSON.stringify({
            model: modelConfig.model,
            max_tokens: modelConfig.maxTokens,
            temperature: modelConfig.temperature,
            system: system || undefined,
            messages: conversation.map((m) => ({
              role: m.role,
              content: m.content,
            })),
            stream: true,
          }),
          signal: this._timeoutSignal(modelConfig.timeoutMs),
        })

        if (!response.ok) {
          const body = await response.text().catch(() => '')
          const err = new Error(`Anthropic API error: ${response.status} ${body}`)
          err.status = response.status
          err.code = 'API_ERROR'
          throw err
        }

        if (!response.body) {
          throw new Error('Anthropic streaming response had no body')
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

          // Process complete SSE lines
          const lines = buffer.split('\n')
          buffer = lines.pop() || '' // keep incomplete line in buffer

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const dataStr = line.slice(6)
            if (dataStr === '[DONE]') continue
            try {
              const data = JSON.parse(dataStr)
              if (data.type === 'content_block_delta' && data.delta?.type === 'text_delta') {
                onChunk(new LLMStreamChunk({
                  content: data.delta.text ?? '',
                  done: false,
                  model: modelConfig.model,
                  provider: 'anthropic',
                }))
              }
              if (data.type === 'message_delta' && data.usage) {
                inputTokens = data.usage.input_tokens ?? 0
                outputTokens = data.usage.output_tokens ?? 0
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
          provider: 'anthropic',
          finishReason: 'stop',
        })
      } catch (error) {
        throw normalizeError(error, 'anthropic')
      }
    }, modelConfig.maxRetries)

    throw lastError
  }

  async _retry(fn, maxRetries) {
    let lastError
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn(attempt)
      } catch (error) {
        lastError = error
        if (attempt < maxRetries) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 10000)
          await new Promise((resolve) => setTimeout(resolve, delay))
        }
      }
    }
    throw lastError
  }

  _timeoutSignal(timeoutMs) {
    const controller = new AbortController()
    setTimeout(() => controller.abort(), timeoutMs)
    return controller.signal
  }
}

export const anthropicAdapter = new AnthropicAdapter()
export default AnthropicAdapter
