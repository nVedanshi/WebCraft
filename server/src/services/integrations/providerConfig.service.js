import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/error.js'
import { encryptSecret, decryptSecret } from '../../lib/crypto.js'

/**
 * ProviderConfigService — real, server-side AI provider integrations.
 *
 * Keys are validated against the provider before being stored, encrypted at
 * rest with AES-256-GCM, and never returned to the client (only a masked
 * suffix). "Connected" is only reported after a successful backend check.
 */

export const SUPPORTED_PROVIDERS = ['openai', 'anthropic', 'gemini', 'kilo']

const KEYS_URLS = {
  openai: 'https://api.openai.com/v1/models',
  anthropic: 'https://api.anthropic.com/v1/models',
  gemini: 'https://generativelanguage.googleapis.com/v1beta/models',
  kilo: 'https://ai-gateway.kilo.ai/api/v1/models',
}

async function validateKey(provider, apiKey) {
  if (!apiKey || typeof apiKey !== 'string' || apiKey.length < 8) {
    return { ok: false, reason: 'API key is too short' }
  }
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 10000)
  try {
    let url = KEYS_URLS[provider]
    const headers = {}
    if (provider === 'openai' || provider === 'kilo') {
      headers.Authorization = `Bearer ${apiKey}`
    } else if (provider === 'anthropic') {
      headers['x-api-key'] = apiKey
      headers['anthropic-version'] = '2023-06-01'
    } else if (provider === 'gemini') {
      url = `${url}?key=${encodeURIComponent(apiKey)}`
    }
    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal })
    if (res.ok) return { ok: true }
    if (res.status === 401 || res.status === 403) return { ok: false, reason: 'Key rejected by provider' }
    return { ok: false, reason: `Provider responded ${res.status}` }
  } catch (err) {
    if (err.name === 'AbortError') return { ok: false, reason: 'Provider request timed out' }
    return { ok: false, reason: 'Could not reach provider to validate the key' }
  } finally {
    clearTimeout(timeout)
  }
}

export class ProviderConfigService {
  async list(userId) {
    const configs = await prisma.providerConfig.findMany({ where: { userId } })
    const byProvider = new Map(configs.map((c) => [c.provider, c]))
    return SUPPORTED_PROVIDERS.map((provider) => {
      const c = byProvider.get(provider)
      return {
        provider,
        connected: Boolean(c),
        isDefault: Boolean(c?.isDefault),
        billingMode: c?.billingMode || 'system',
        maskedKey: c ? '••••••••' : null,
        updatedAt: c?.updatedAt || null,
      }
    })
  }

  async setBillingMode(userId, provider, billingMode) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new AppError(400, 'UNSUPPORTED_PROVIDER', `Unsupported provider: ${provider}`)
    }
    if (billingMode !== 'system' && billingMode !== 'byok') {
      throw new AppError(400, 'INVALID_BILLING_MODE', 'billingMode must be "system" or "byok"')
    }
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider } })
    if (!c) throw new AppError(404, 'NOT_CONNECTED', 'Connect the provider before setting billing mode')
    await prisma.providerConfig.update({ where: { id: c.id }, data: { billingMode } })
    return { provider, billingMode }
  }

  async saveKey(userId, provider, apiKey) {
    if (!SUPPORTED_PROVIDERS.includes(provider)) {
      throw new AppError(400, 'UNSUPPORTED_PROVIDER', `Unsupported provider: ${provider}`)
    }
    const check = await validateKey(provider, apiKey)
    if (!check.ok) {
      // Do not store an unverified key; surface an honest failure.
      throw new AppError(400, 'PROVIDER_KEY_INVALID', check.reason || 'Provider key validation failed')
    }
    const apiKeyEnc = encryptSecret(apiKey)
    const existing = await prisma.providerConfig.findFirst({ where: { userId, provider } })
    if (existing) {
      await prisma.providerConfig.update({ where: { id: existing.id }, data: { apiKeyEnc } })
    } else {
      await prisma.providerConfig.create({ data: { userId, provider, apiKeyEnc } })
    }
    return { provider, connected: true }
  }

  async test(userId, provider) {
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider } })
    if (!c) throw new AppError(404, 'NOT_CONNECTED', 'Provider is not connected')
    const apiKey = decryptSecret(c.apiKeyEnc)
    const check = await validateKey(provider, apiKey)
    if (!check.ok) throw new AppError(400, 'PROVIDER_KEY_INVALID', check.reason)
    return { ok: true }
  }

  async setDefault(userId, provider) {
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider } })
    if (!c) throw new AppError(404, 'NOT_CONNECTED', 'Connect the provider before making it default')
    await prisma.$transaction([
      prisma.providerConfig.updateMany({ where: { userId }, data: { isDefault: false } }),
      prisma.providerConfig.update({ where: { id: c.id }, data: { isDefault: true } }),
    ])
    return { provider, isDefault: true }
  }

  async disconnect(userId, provider) {
    await prisma.providerConfig.deleteMany({ where: { userId, provider } })
    return { provider, connected: false }
  }

  async getDecryptedKey(userId, provider) {
    const c = await prisma.providerConfig.findFirst({ where: { userId, provider } })
    return c ? decryptSecret(c.apiKeyEnc) : null
  }
}

export const providerConfigService = new ProviderConfigService()
export default ProviderConfigService
