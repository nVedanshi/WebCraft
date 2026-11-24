import crypto from 'crypto'

/**
 * Symmetric encryption for secrets at rest (provider API keys, OAuth tokens).
 * AES-256-GCM. The key is derived from ENCRYPTION_KEY, falling back to the JWT
 * access secret only when ENCRYPTION_KEY is unset or a placeholder. Set a real
 * ENCRYPTION_KEY (32+ random bytes) in production.
 */
function resolveKeyMaterial() {
  const raw = process.env.ENCRYPTION_KEY || ''
  const isPlaceholder =
    !raw || raw.toLowerCase().startsWith('replace') || raw.toLowerCase().startsWith('your_')
  if (isPlaceholder) {
    throw new Error(
      'ENCRYPTION_KEY is not configured. Set a real 32-byte random key (TODO(owner): paste key here).',
    )
  }
  return raw
}

function key() {
  return crypto.createHash('sha256').update(resolveKeyMaterial()).digest()
}

export function encryptSecret(plaintext) {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv)
  const enc = Buffer.concat([cipher.update(String(plaintext), 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${enc.toString('base64')}`
}

export function decryptSecret(payload) {
  if (!payload || typeof payload !== 'string') throw new Error('No secret payload')
  const [version, ivB64, tagB64, dataB64] = payload.split(':')
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) throw new Error('Malformed secret')
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), Buffer.from(ivB64, 'base64'))
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'))
  const dec = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()])
  return dec.toString('utf8')
}

export function maskSecret(secret) {
  if (!secret) return '••••'
  const s = String(secret)
  if (s.length <= 4) return '••••'
  return `••••${s.slice(-4)}`
}

export function isEncryptionConfigured() {
  const raw = process.env.ENCRYPTION_KEY || ''
  return raw && !raw.toLowerCase().startsWith('replace') && !raw.toLowerCase().startsWith('your_')
}
