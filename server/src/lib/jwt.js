import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'

/**
 * JWT signing and verification for WebCraft authentication.
 *
 * Two token types:
 *   - access  : short-lived (15m), sent in Authorization: Bearer header,
 *               proves identity on each API call.
 *   - refresh : long-lived (7d), HttpOnly cookie, used only to obtain new
 *               access tokens. Stored (hashed) in Redis for revocation.
 *
 * All tokens carry the userId. Refresh tokens additionally carry `type: 'refresh'`.
 */
export function signAccessToken(userId) {
  return jwt.sign({ userId }, config.jwtAccessSecret, {
    expiresIn: config.jwtAccessTtl,
    subject: userId,
    issuer: 'webcraft',
    audience: 'webcraft-api',
  })
}

export function signRefreshToken(userId) {
  return jwt.sign({ userId, type: 'refresh' }, config.jwtRefreshSecret, {
    expiresIn: config.jwtRefreshTtl,
    subject: userId,
    issuer: 'webcraft',
    audience: 'webcraft-api',
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, config.jwtAccessSecret, {
    issuer: 'webcraft',
    audience: 'webcraft-api',
  })
}

export function verifyRefreshToken(token) {
  const payload = jwt.verify(token, config.jwtRefreshSecret, {
    issuer: 'webcraft',
    audience: 'webcraft-api',
  })
  if (payload.type !== 'refresh') {
    throw new Object.assign(new Error('Invalid token type'), { code: 'INVALID_TOKEN_TYPE' })
  }
  return payload
}

export function decodeTokenWithoutVerification(token) {
  // Best-effort decode for logging/inspection; never trust for authorization.
  try {
    return jwt.verify(token, config.jwtAccessSecret, {
      issuer: 'webcraft',
      audience: 'webcraft-api',
    })
  } catch {
    return null
  }
}

export default { signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken }
