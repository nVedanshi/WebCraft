import { verifyAccessToken } from '../lib/jwt.js'
import { AppError } from '../middleware/error.js'

/**
 * Authentication middleware.
 *
 * Reads the access token from the Authorization: Bearer header, verifies it,
 * and attaches the authenticated user (`req.user = { id, email }`) to the
 * request. Protected routes use this; public routes do not.
 *
 * Missing or invalid token -> 401. This is how we enforce authorization at the
 * route layer while keeping controllers free of auth concerns.
 */
export function protect(req, res, next) {
  const authHeader = req.headers.authorization || ''
  const parts = authHeader.split(' ')

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    throw new AppError(401, 'UNAUTHENTICATED', 'No valid access token provided')
  }

  try {
    const payload = verifyAccessToken(parts[1])
    req.user = { id: payload.userId, email: payload.email }
    next()
  } catch (err) {
    throw new AppError(401, 'UNAUTHENTICATED', 'Access token is invalid or expired')
  }
}

/**
 * Optional auth: attaches user if a valid token is present, but does not
 * require one. Used for endpoints that work both publicly and for members.
 */
export function optionalAuth(req, res, next) {
  try {
    protect(req, res, () => {})
  } catch {
    req.user = undefined
    next()
  }
}

export default { protect, optionalAuth }
