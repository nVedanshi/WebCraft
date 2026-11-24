/**
 * ProviderRegistry — manages registered LLM provider adapters.
 *
 * The registry maps provider names ('openai', 'gemini', 'anthropic') to
 * provider adapter instances. The generation engine asks the registry for
 * a provider by name; it never instantiates adapters directly.
 *
 * Providers register themselves at startup. The registry also tracks which
 * provider is the default for each task type (analysis, planning, code,
 * repair, chat).
 */
export class ProviderRegistry {
  constructor() {
    this._providers = new Map() // name -> LLMProvider instance
    this._taskDefaults = new Map() // taskType -> provider name
  }

  /**
   * Register a provider instance.
   */
  register(name, provider) {
    this._providers.set(name, provider)
  }

  /**
   * Get a provider by name. Throws if not registered.
   */
  get(name) {
    const provider = this._providers.get(name)
    if (!provider) {
      const available = Array.from(this._providers.keys()).join(', ')
      throw new Error(`LLM provider '${name}' is not registered. Available: ${available}`)
    }
    return provider
  }

  /**
   * Check if a provider name is registered.
   */
  has(name) {
    return this._providers.has(name)
  }

  /**
   * List all registered provider names.
   */
  list() {
    return Array.from(this._providers.keys())
  }

  /**
   * Set the default provider for a task type.
   * Task types: 'analysis', 'planning', 'code', 'repair', 'chat'
   */
  setDefaultForTask(taskType, providerName) {
    this._taskDefaults.set(taskType, providerName)
  }

  /**
   * Get the default provider for a task type, falling back to 'default'.
   */
  getDefaultForTask(taskType) {
    return this._taskDefaults.get(taskType) || this._taskDefaults.get('default') || null
  }

  /**
   * Get all providers that are currently available (configured).
   */
  available() {
    return Array.from(this._providers.entries()).filter(([, p]) => p.isAvailable())
  }
}

export const providerRegistry = new ProviderRegistry()
export default providerRegistry
