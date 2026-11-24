/**
 * BYOK (Bring Your Own Key) service — resolves AI provider credentials per-user.
 *
 * When a user has connected their own provider API key with billingMode='byok',
 * generation uses their key and NO WebCraft credits are deducted. Otherwise the
 * centrally configured server-side key is used and WebCraft credits apply.
 *
 * Decrypted keys are NEVER returned to the frontend or logged. They live only
 * in server memory for the duration of a single generation request.
 */

import { prisma } from '../../lib/prisma.js'
import { decryptSecret } from '../../lib/crypto.js'

/**
 * Resolve the API key and billing mode for a given user + provider.
 *
 * Returns:
 *   { mode: 'byok', apiKey: string } — user's own key, no WebCraft credits
 *   { mode: 'system', apiKey: null } — server-side key, WebCraft credits apply
 *
 * The decrypted apiKey is only for server-side use during this request.
 * Never return it to the client or log it.
 *
 * @param {string} userId
 * @param {string} provider — 'openai' | 'anthropic' | 'gemini' | 'kilo'
 * @returns {Promise<{mode: 'byok' | 'system', apiKey?: string}>}
 */
export async function resolveProviderCredentials(userId, provider) {
  const c = await prisma.providerConfig.findFirst({
    where: { userId, provider },
    select: { id: true, billingMode: true, apiKeyEnc: true },
  })

  if (!c || c.billingMode !== 'byok') {
    return { mode: 'system', apiKey: null }
  }

  const apiKey = decryptSecret(c.apiKeyEnc)
  if (!apiKey) {
    throw new Error(`Failed to decrypt stored key for provider ${provider}`)
  }

  return { mode: 'byok', apiKey }
}

/**
 * Check if BYOK is active for a user+provider (credits should be skipped).
 *
 * @param {string} userId
 * @param {string} provider
 * @returns {Promise<boolean>}
 */
export async function isByokActive(userId, provider) {
  const creds = await resolveProviderCredentials(userId, provider)
  return creds.mode === 'byok'
}

export { resolveProviderCredentials as byokResolveCredentials }
export { isByokActive as byokIsActive }
