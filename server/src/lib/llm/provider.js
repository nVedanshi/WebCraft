import {
  LLMResponse,
  LLMStreamChunk,
  LLMProviderError,
  ModelConfig,
} from './types.js'

/**
 * LLMProvider — abstract interface for all LLM provider adapters.
 *
 * The generation engine depends on this interface, never on a specific
 * provider SDK. This keeps provider-specific logic isolated and makes the
 * engine testable with mock adapters.
 *
 * Every adapter must implement:
 *   - complete(messages, config) -> LLMResponse
 *   - streamComplete(messages, config, onChunk) -> AsyncGenerator<LLMStreamChunk>
 *   - getModelConfig() -> ModelConfig
 *   - getProviderName() -> string
 *   - isAvailable() -> boolean
 *
 * Adapters normalize provider-specific errors into LLMProviderError.
 */
export class LLMProvider {
  /**
   * Generate a single (non-streaming) completion.
   * @param {Array} messages - LLM messages
   * @param {Object} config - Model config
   * @param {string} [apiKey] - Optional per-call API key (BYOK). When provided,
   *   overrides the server-side configured key for this request only.
   */
  async complete(messages, config, apiKey) {
    throw new LLMProviderError('complete() not implemented', {
      code: 'NOT_IMPLEMENTED',
      provider: this.getProviderName(),
    })
  }

  /**
   * Generate a streaming completion, yielding chunks via callback.
   * @param {Array} messages - LLM messages
   * @param {Object} config - Model config
   * @param {Function} onChunk - Callback for each stream chunk
   * @param {string} [apiKey] - Optional per-call API key (BYOK).
   */
  async streamComplete(messages, config, onChunk, apiKey) {
    throw new LLMProviderError('streamComplete() not implemented', {
      code: 'NOT_IMPLEMENTED',
      provider: this.getProviderName(),
    })
  }

  /**
   * Return the model configuration for this provider.
   */
  getModelConfig() {
    throw new LLMProviderError('getModelConfig() not implemented', {
      code: 'NOT_IMPLEMENTED',
      provider: this.getProviderName(),
    })
  }

  /**
   * Return the provider name (e.g. 'openai', 'gemini', 'anthropic').
   */
  getProviderName() {
    throw new LLMProviderError('getProviderName() not implemented', {
      code: 'NOT_IMPLEMENTED',
    })
  }

  /**
   * Return true if the provider is configured and ready to use.
   */
  isAvailable() {
    return false
  }
}

export default LLMProvider
