/**
 * ProviderFactory — creates LLM provider adapter instances.
 *
 * The factory is responsible for instantiating provider-specific adapters
 * and wiring them with their API keys. The generation engine asks the
 * factory for a provider by name; it never imports adapter modules directly.
 *
 * Adapters are lazy-initialized: an adapter is created only when first
 * requested, and cached for reuse.
 */

import { OpenAIAdapter } from '../llm/adapters/openai.js'
import { GeminiAdapter } from '../llm/adapters/gemini.js'
import { AnthropicAdapter } from '../llm/adapters/anthropic.js'
import { KiloAdapter } from '../llm/adapters/kilo.js'
import { providerRegistry } from '../llm/registry.js'

export class ProviderFactory {
  constructor() {
    this._cache = new Map() // provider name -> adapter instance
    this._registered = false
  }

  /**
   * Register all supported providers with the global registry and set
   * task-type defaults. Call once at application startup.
   */
  registerAll() {
    if (this._registered) return

    const adapters = {
      openai: new OpenAIAdapter(),
      gemini: new GeminiAdapter(),
      anthropic: new AnthropicAdapter(),
      kilo: new KiloAdapter(),
    }

    for (const [name, adapter] of Object.entries(adapters)) {
      this._cache.set(name, adapter)
      providerRegistry.register(name, adapter)
    }

    // Task-type defaults: route each task to the most cost-effective
    // capable provider. OpenAI is the default for all tasks; Gemini and
    // Anthropic are available as fallbacks/alternatives.
    providerRegistry.setDefaultForTask('analysis', 'openai')
    providerRegistry.setDefaultForTask('planning', 'openai')
    providerRegistry.setDefaultForTask('code', 'openai')
    providerRegistry.setDefaultForTask('repair', 'openai')
    providerRegistry.setDefaultForTask('chat', 'openai')
    providerRegistry.setDefaultForTask('default', 'openai')

    this._registered = true
  }

  /**
   * Create (or retrieve cached) a provider adapter by name.
   */
  create(name) {
    this.registerAll() // ensure registration on first use
    if (this._cache.has(name)) {
      return this._cache.get(name)
    }

    let adapter
    switch (name) {
      case 'openai':
        adapter = new OpenAIAdapter()
        break
      case 'gemini':
        adapter = new GeminiAdapter()
        break
      case 'anthropic':
        adapter = new AnthropicAdapter()
        break
      case 'kilo':
        adapter = new KiloAdapter()
        break
      default:
        throw new Error(`Unknown provider: ${name}`)
    }

    this._cache.set(name, adapter)
    return adapter
  }

  /**
   * Check if a provider name is supported by the factory.
   */
  supports(name) {
    return ['openai', 'gemini', 'anthropic', 'kilo'].includes(name)
  }

  /**
   * List all supported provider names.
   */
  list() {
    return ['openai', 'gemini', 'anthropic', 'kilo']
  }
}

export const providerFactory = new ProviderFactory()
export default providerFactory
