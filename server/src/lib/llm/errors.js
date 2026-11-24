import { LLMProviderError } from './types.js'

/**
 * LLM Error Normalization
 *
 * Converts provider-specific errors into a consistent LLMProviderError shape
 * so the generation engine can make retry/abort decisions without knowing
 * which provider produced the error.
 */

/**
 * Normalize any error into an LLMProviderError.
 */
function normalizeError(error, providerName) {
  // Already normalized
  if (error instanceof LLMProviderError) {
    return error
  }

  const message = error.message || 'Unknown LLM provider error'
  const statusCode = error.status ?? error.statusCode
  const code = error.code || error.type || 'UNKNOWN_ERROR'

  // Determine retryability based on HTTP status and provider hints
  const retryable = isRetryable(statusCode, code, error)

  return new LLMProviderError(message, {
    code,
    provider: providerName,
    statusCode,
    retryable,
    original: error,
  })
}

/**
 * Heuristic: decide whether an error is safe to retry.
 * Retry on: 429 (rate limit), 502/503/504 (upstream), 500 (transient),
 * network timeouts, ECONNRESET, ETIMEDOUT.
 */
function isRetryable(statusCode, code, error) {
  if (statusCode) {
    const retryableStatuses = [429, 500, 502, 503, 504]
    if (retryableStatuses.includes(statusCode)) return true
  }

  const retryableCodes = ['rate_limit', 'insufficient_quota', 'ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND']
  if (retryableCodes.includes(code)) return true

  // Common provider error messages
  const msg = String(error.message || '').toLowerCase()
  if (msg.includes('rate limit') || msg.includes('overloaded') || msg.includes('timeout')) {
    return true
  }

  return false
}

export { normalizeError }
export { LLMProviderError }
