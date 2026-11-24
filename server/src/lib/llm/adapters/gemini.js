import { LLMProvider } from '../provider.js'
import {
  LLMResponse,
  LLMStreamChunk,
  ModelConfig,
} from '../types.js'
import { normalizeError } from '../errors.js'
import { GoogleGenerativeAI } from '@google/generative-ai'

/**
 * GeminiAdapter — LLM provider adapter for Google Gemini.
 *
 * Wraps the Google Generative AI SDK and exposes it through the LLMProvider
 * interface. The generation engine never imports the Gemini SDK directly.
 *
 * Gemini's content format uses 'user' and 'model' roles (no 'system' role
 * natively; system instructions are passed separately). We map 'system'
 * messages into the first user message with a prefix.
 */
export class GeminiAdapter extends LLMProvider {
  constructor() {
    super()
    this._genAI = null
  }

  getProviderName() {
    return 'gemini'
  }

  isAvailable() {
    return Boolean(process.env.GEMINI_API_KEY)
  }

  _getGenAI(apiKey) {
    const key = apiKey || process.env.GEMINI_API_KEY
    if (!key) {
      throw new Error('GEMINI_API_KEY is not configured')
    }
    return new GoogleGenerativeAI({ apiKey: key })
  }

  getModelConfig() {
    return new ModelConfig({
      provider: 'gemini',
      model: 'gemini-1.5-flash',
      maxTokens: 4096,
      temperature: 0.2,
      timeoutMs: 60000,
      maxRetries: 3,
      supportsStreaming: true,
      supportsToolUse: false,
      costPerInputToken: 0.075,
      costPerOutputToken: 0.30,
    })
  }

  /**
   * Convert LLMMessage[] to Gemini content format.
   * Gemini doesn't have a 'system' role; prepend system text to the first user message.
   */
  _toGeminiContents(messages) {
    const systemText = messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
      .join('\n')

    const contents = []
    let pendingText = systemText

    for (const m of messages) {
      if (m.role === 'system') continue

      const geminiRole = m.role === 'assistant' ? 'model' : 'user'
      const parts = pendingText
        ? [{ text: pendingText + '\n\n' + m.content }]
        : [{ text: m.content }]
      pendingText = null

      contents.push({ role: geminiRole, parts })
    }

    // If there was system text but no user message, create one
    if (pendingText && contents.length === 0) {
      contents.push({ role: 'user', parts: [{ text: pendingText }] })
    }

    return contents
  }

  async complete(messages, config, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const genAI = this._getGenAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelConfig.model,
      generationConfig: {
        maxOutputTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
      },
    })

    const lastError = await this._retry(async (attempt) => {
      try {
        const result = await model.generateContent(
          this._toGeminiContents(messages),
          { requestOptions: { timeout: modelConfig.timeoutMs } }
        )

        const response = result.response
        return new LLMResponse({
          content: response.text() ?? '',
          inputTokens: response.usageMetadata?.promptTokenCount ?? 0,
          outputTokens: response.usageMetadata?.candidatesTokenCount ?? 0,
          model: modelConfig.model,
          provider: 'gemini',
          finishReason: response.candidates?.[0]?.finishReason ?? 'unknown',
          raw: response,
        })
      } catch (error) {
        throw normalizeError(error, 'gemini')
      }
    }, modelConfig.maxRetries)

    throw lastError
  }

  async streamComplete(messages, config, onChunk, apiKey) {
    const modelConfig = config || this.getModelConfig()
    const genAI = this._getGenAI(apiKey)
    const model = genAI.getGenerativeModel({
      model: modelConfig.model,
      generationConfig: {
        maxOutputTokens: modelConfig.maxTokens,
        temperature: modelConfig.temperature,
        topP: modelConfig.topP,
      },
    })

    const lastError = await this._retry(async (attempt) => {
      try {
        const stream = await model.generateContentStream(
          this._toGeminiContents(messages),
          { requestOptions: { timeout: modelConfig.timeoutMs } }
        )

        let inputTokens = 0
        let outputTokens = 0

        for await (const chunk of stream) {
          const text = chunk.text()
          if (text) {
            onChunk(new LLMStreamChunk({
              content: text,
              done: false,
              model: modelConfig.model,
              provider: 'gemini',
            }))
          }
          if (chunk.usageMetadata) {
            inputTokens = chunk.usageMetadata.promptTokenCount ?? 0
            outputTokens = chunk.usageMetadata.candidatesTokenCount ?? 0
          }
        }

        return new LLMResponse({
          content: '',
          inputTokens,
          outputTokens,
          model: modelConfig.model,
          provider: 'gemini',
          finishReason: 'stop',
        })
      } catch (error) {
        throw normalizeError(error, 'gemini')
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
}

export const geminiAdapter = new GeminiAdapter()
export default GeminiAdapter
