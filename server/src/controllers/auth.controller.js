import { authService } from '../services/auth.service.js'
import { AppError, catchAsync } from '../middleware/error.js'

/**
 * Auth controller. Handles HTTP request/response only; delegates business
 * logic to AuthService. Knows nothing about Prisma or Redis directly.
 */
export const authController = {
  register: catchAsync(async (req, res) => {
    const { email, password, name } = req.validatedBody || req.body
    const { user, accessToken, refreshToken } = await authService.register({
      email,
      password,
      name,
    })
    setRefreshTokenCookie(res, refreshToken)
    res.status(201).json({
      success: true,
      data: { user, accessToken, refreshToken },
    })
  }),

  login: catchAsync(async (req, res) => {
    const { email, password } = req.validatedBody || req.body
    const { accessToken, refreshToken, user } = await authService.login({
      email,
      password,
    })
    setRefreshTokenCookie(res, refreshToken)
    res.json({
      success: true,
      data: { user, accessToken, refreshToken },
    })
  }),

  refresh: catchAsync(async (req, res) => {
    const { refreshToken } = req.validatedBody || req.body
    if (!refreshToken) {
      throw new AppError(400, 'MISSING_REFRESH_TOKEN', 'Refresh token is required')
    }
    const tokens = await authService.refresh(refreshToken)
    setRefreshTokenCookie(res, tokens.refreshToken)
    res.json({
      success: true,
      data: tokens,
    })
  }),

  logout: catchAsync(async (req, res) => {
    const userId = req.user.id
    await authService.logout(userId)
    clearRefreshTokenCookie(res)
    res.json({ success: true, data: { loggedOut: true } })
  }),

  me: catchAsync(async (req, res) => {
    const user = await authService.getUser(req.user.id)
    res.json({ success: true, data: { user } })
  }),

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORGOT / RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════════

  forgotPassword: catchAsync(async (req, res) => {
    const { email } = req.validatedBody || req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
    const result = await authService.forgotPassword({ email, clientIp })
    // Always 200 with the same shape whether or not the email exists.
    res.json({ success: true, data: { sent: result.sent, email: result.email } })
  }),

  resetPassword: catchAsync(async (req, res) => {
    const { token, password } = req.validatedBody || req.body
    const result = await authService.resetPassword({ token, password })
    res.json({ success: true, data: result })
  }),

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  verifyEmail: catchAsync(async (req, res) => {
    const { token } = req.validatedBody || req.body
    const result = await authService.verifyEmail({ token })
    res.json({ success: true, data: result })
  }),

  resendVerification: catchAsync(async (req, res) => {
    const { email } = req.validatedBody || req.body
    const clientIp = req.ip || req.connection.remoteAddress || 'unknown'
    const result = await authService.resendVerification({ email, clientIp })
    res.json({ success: true, data: { sent: result.sent, email: result.email } })
  }),
}

/**
 * Set refresh token as an HttpOnly cookie so it is not accessible via
 * document.cookie (mitigates XSS token theft). The token is still echoed
 * in the response body for backward compatibility with existing clients.
 */
function setRefreshTokenCookie(res, token) {
  const isSecure = process.env.NODE_ENV === 'production'
  res.cookie('refreshToken', token, {
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  })
}

/**
 * Clear the refresh token cookie on logout.
 */
function clearRefreshTokenCookie(res) {
  res.clearCookie('refreshToken', { path: '/', httpOnly: true, sameSite: 'lax' })
}

export default authController
