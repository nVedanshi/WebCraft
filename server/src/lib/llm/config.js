/**
 * ModelConfig — model configuration for each task type and provider.
 *
 * Different generation tasks need different models:
 *   - analysis:      cheap, fast model (requirements extraction)
 *   - planning:      capable model (architecture decisions)
 *   - code:          capable model (actual code generation)
 *   - repair:        capable model (debugging build errors)
 *   - chat:          conversational model (incremental modifications)
 *
 * Costs are in cents per 1M tokens. These are estimates and should be
 * updated from provider pricing pages before production use.
 */

import { ModelConfig } from './types.js'

const OPENAI_MODELS = {
  gpt4o: new ModelConfig({
    provider: 'openai',
    model: 'gpt-4o',
    maxTokens: 4096,
    temperature: 0.2,
    timeoutMs: 60000,
    maxRetries: 3,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 2.50,   // $2.50 per 1M input tokens
    costPerOutputToken: 10.00, // $10.00 per 1M output tokens
  }),
  gpt4oMini: new ModelConfig({
    provider: 'openai',
    model: 'gpt-4o-mini',
    maxTokens: 4096,
    temperature: 0.1,
    timeoutMs: 30000,
    maxRetries: 3,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 0.15,
    costPerOutputToken: 0.60,
  }),
}

const GEMINI_MODELS = {
  gemini15Flash: new ModelConfig({
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
  }),
  gemini15Pro: new ModelConfig({
    provider: 'gemini',
    model: 'gemini-1.5-pro',
    maxTokens: 4096,
    temperature: 0.2,
    timeoutMs: 60000,
    maxRetries: 3,
    supportsStreaming: true,
    supportsToolUse: false,
    costPerInputToken: 1.25,
    costPerOutputToken: 5.00,
  }),
}

const ANTHROPIC_MODELS = {
  claude35Sonnet: new ModelConfig({
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
  }),
  claude3Haiku: new ModelConfig({
    provider: 'anthropic',
    model: 'claude-3-haiku-20240307',
    maxTokens: 4096,
    temperature: 0.1,
    timeoutMs: 30000,
    maxRetries: 3,
    supportsStreaming: true,
    supportsToolUse: true,
    costPerInputToken: 0.25,
    costPerOutputToken: 1.25,
  }),
}

/**
 * Task-to-model mapping. Each task type specifies which provider/model to use.
 * The factory resolves these to actual ModelConfig instances.
 *
 * Model names must match the keys in the provider model maps above
 * (e.g. 'gpt4oMini', 'gpt4o', not 'gpt-4o-mini', 'gpt-4o').
 */
export const TASK_MODEL_MAP = {
  analysis: { provider: 'openai', model: 'gpt4oMini' },
  planning: { provider: 'openai', model: 'gpt4o' },
  code: { provider: 'openai', model: 'gpt4o' },
  repair: { provider: 'openai', model: 'gpt4o' },
  chat: { provider: 'openai', model: 'gpt4oMini' },
  default: { provider: 'openai', model: 'gpt4oMini' },
}

/**
 * Resolve a task type to a ModelConfig.
 * Falls back through provider-specific model maps.
 */
export function resolveModelConfig(providerName, modelName) {
  const modelMaps = {
    openai: OPENAI_MODELS,
    gemini: GEMINI_MODELS,
    anthropic: ANTHROPIC_MODELS,
  }

  const map = modelMaps[providerName]
  if (!map) {
    throw new Error(`Unknown provider: ${providerName}`)
  }

  const config = map[modelName]
  if (!config) {
    const available = Object.keys(map).join(', ')
    throw new Error(`Unknown model '${modelName}' for provider '${providerName}'. Available: ${available}`)
  }

  return config
}

/**
 * Resolve a task type to a ModelConfig using TASK_MODEL_MAP.
 */
export function resolveTaskModelConfig(taskType) {
  const mapping = TASK_MODEL_MAP[taskType] || TASK_MODEL_MAP.default
  return resolveModelConfig(mapping.provider, mapping.model)
}

export { OPENAI_MODELS, GEMINI_MODELS, ANTHROPIC_MODELS }
