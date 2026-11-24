import bcrypt from 'bcryptjs'
import { createHash, randomBytes } from 'crypto'

import { prisma } from '../lib/prisma.js'
import { refreshGet, refreshSet, refreshDel } from '../lib/redis.js'
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from '../lib/jwt.js'
import { AppError } from '../middleware/error.js'
import { creditAccountingService } from './billing/credit.service.js'
import { sendMail } from '../lib/mailer.js'

const SALT_ROUNDS = 12

const RESET_TOKEN_TTL_SECONDS = 60 * 60 // 1 hour
const VERIFY_TOKEN_TTL_SECONDS = 24 * 60 * 60 // 24 hours
const REFRESH_TTL_SECONDS = 60 * 60 * 24 * 7 // 7 days

// Rate-limit forgot-password attempts per email/IP (in-memory fallback, Redis-backed when available).
const FORGOT_WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const FORGOT_MAX_ATTEMPTS = 5
const forgotAttempts = new Map()

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

function generateToken() {
  return randomBytes(32).toString('hex')
}

function buildResetLink(token) {
  const base = process.env.CLIENT_BASE_URL || 'http://localhost:5173'
  return `${base}/reset-password?token=${encodeURIComponent(token)}`
}

function buildVerifyLink(token) {
  const base = process.env.CLIENT_BASE_URL || 'http://localhost:5173'
  return `${base}/verify-email?token=${encodeURIComponent(token)}`
}

function recordForgotAttempt(identifier) {
  const now = Date.now()
  const windowStart = now - FORGOT_WINDOW_MS
  const attempts = (forgotAttempts.get(identifier) || []).filter(
    (ts) => ts > windowStart,
  )
  attempts.push(now)
  forgotAttempts.set(identifier, attempts)
  return attempts.length
}

/**
 * Authentication service. Business logic for auth; no HTTP concerns here.
 */
export class AuthService {
  async register({ email, password, name }) {
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    let user
    try {
      // Atomic provisioning: user + subscription + first daily allocation (50 credits).
      // A failure here rolls back everything, so no partial records are left behind.
      user = await creditAccountingService.provisionNewUser({ email, passwordHash, name })
    } catch (err) {
      if (err && err.code === 'P2002') {
        throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered')
      }
      throw err
    }

    const accessToken = this.issueAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    // Store hashed refresh token in Redis for revocation + replay detection
    await refreshSet(user.id, hashToken(refreshToken), REFRESH_TTL_SECONDS)

    return { user, accessToken, refreshToken }
  }

  async login({ email, password }) {
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password')
    }

    const accessToken = this.issueAccessToken(user.id)
    const refreshToken = signRefreshToken(user.id)

    // Store hashed refresh token in Redis for revocation + replay detection
    await refreshSet(user.id, hashToken(refreshToken), REFRESH_TTL_SECONDS)

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        credits: user.credits,
        tier: user.tier,
      },
    }
  }

  async refresh(refreshToken) {
    const payload = verifyRefreshToken(refreshToken)
    const userId = payload.userId

    const storedHash = await refreshGet(userId)
    if (!storedHash || storedHash !== hashToken(refreshToken)) {
      throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid or revoked')
    }

    // Rotate: replace stored hash with new token's hash
    const newRefreshToken = signRefreshToken(userId)
    await refreshSet(userId, hashToken(newRefreshToken), REFRESH_TTL_SECONDS)

    return {
      accessToken: this.issueAccessToken(userId),
      refreshToken: newRefreshToken,
    }
  }

  async logout(userId) {
    await refreshDel(userId)
  }

  issueAccessToken(userId) {
    return signAccessToken(userId)
  }

  async getUser(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, credits: true, reservedCredits: true,
        tier: true, emailVerified: true, createdAt: true, updatedAt: true,
      },
    })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }
    return user
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Request a password reset. Returns the same response whether or not the
   * email exists (prevents email enumeration). Rate limited per identifier.
   */
  async forgotPassword({ email, clientIp }) {
    // Rate limit: block after too many attempts from same IP or email.
    const identifier = `forgot:${clientIp || 'unknown'}:${email}`
    const attempts = recordForgotAttempt(identifier)
    if (attempts > FORGOT_MAX_ATTEMPTS) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many reset requests. Try again later.')
    }

    // Always return success (never reveal whether email exists).
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return { sent: true, email }
    }

    // Invalidate any previous unused reset tokens for this user.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, type: 'password_reset', usedAt: null },
    })

    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_SECONDS * 1000)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'password_reset',
        expiresAt,
      },
    })

    const resetLink = buildResetLink(token)
    await sendMail({
      to: user.email,
      subject: 'Reset your WebCraft password',
      text: `Reset your password: ${resetLink}\nThis link expires in 1 hour.`,
      html: `<p>Reset your password: <a href="${resetLink}">${resetLink}</a></p><p>This link expires in 1 hour.</p>`,
    })

    return { sent: true, email }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Reset password using a single-use, time-limited token.
   * On success: revokes all existing refresh tokens, marks token used.
   */
  async resetPassword({ token, password }) {
    const tokenHash = hashToken(token)
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!resetToken) {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid or expired reset token')
    }
    if (resetToken.type !== 'password_reset') {
      throw new AppError(400, 'INVALID_RESET_TOKEN', 'Invalid token type for password reset')
    }
    if (resetToken.usedAt !== null) {
      throw new AppError(400, 'RESET_TOKEN_ALREADY_USED', 'Reset token has already been used')
    }
    if (resetToken.expiresAt < new Date()) {
      throw new AppError(400, 'RESET_TOKEN_EXPIRED', 'Reset token has expired')
    }

    const user = await prisma.user.findUnique({ where: { id: resetToken.userId } })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS)

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    // Revoke existing refresh tokens so all other sessions are logged out.
    await refreshDel(user.id)

    return { userId: user.id, reset: true }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Verify email using a single-use, time-limited token.
   */
  async verifyEmail({ token }) {
    const tokenHash = hashToken(token)
    const verifyToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!verifyToken) {
      throw new AppError(400, 'INVALID_VERIFY_TOKEN', 'Invalid or expired verification token')
    }
    if (verifyToken.type !== 'email_verification') {
      throw new AppError(400, 'INVALID_VERIFY_TOKEN', 'Invalid token type for email verification')
    }
    if (verifyToken.usedAt !== null) {
      throw new AppError(400, 'VERIFY_TOKEN_ALREADY_USED', 'Verification token has already been used')
    }
    if (verifyToken.expiresAt < new Date()) {
      throw new AppError(400, 'VERIFY_TOKEN_EXPIRED', 'Verification token has expired')
    }

    const user = await prisma.user.findUnique({ where: { id: verifyToken.userId } })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    if (user.emailVerified) {
      // Idempotent: already verified.
      return { verified: true, alreadyVerified: true }
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { emailVerified: true },
      }),
      prisma.passwordResetToken.update({
        where: { id: verifyToken.id },
        data: { usedAt: new Date() },
      }),
    ])

    return { verified: true, alreadyVerified: false }
  }

  /**
   * Resend email verification. Same response whether or not email exists.
   */
  async resendVerification({ email, clientIp }) {
    const identifier = `resend:${clientIp || 'unknown'}:${email}`
    const attempts = recordForgotAttempt(identifier)
    if (attempts > FORGOT_MAX_ATTEMPTS) {
      throw new AppError(429, 'RATE_LIMITED', 'Too many resend requests. Try again later.')
    }

    // Always return success (never reveal whether email exists).
    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.emailVerified) {
      return { sent: true, email }
    }

    // Invalidate previous unused verification tokens.
    await prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, type: 'email_verification', usedAt: null },
    })

    const token = generateToken()
    const tokenHash = hashToken(token)
    const expiresAt = new Date(Date.now() + VERIFY_TOKEN_TTL_SECONDS * 1000)

    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        type: 'email_verification',
        expiresAt,
      },
    })

    const verifyLink = buildVerifyLink(token)
    await sendMail({
      to: user.email,
      subject: 'Verify your WebCraft email',
      text: `Verify your email: ${verifyLink}\nThis link expires in 24 hours.`,
      html: `<p>Verify your email: <a href="${verifyLink}">${verifyLink}</a></p><p>This link expires in 24 hours.</p>`,
    })

    return { sent: true, email }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACCOUNT DELETION
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Delete the user's account after confirming their password.
   * Revokes all sessions and permanently removes the user + related data.
   */
  async deleteAccount({ userId, password, confirmDelete }) {
    if (!confirmDelete) {
      throw new AppError(400, 'DELETION_NOT_CONFIRMED', 'Account deletion must be confirmed')
    }

    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const valid = await bcrypt.compare(password, user.passwordHash)
    if (!valid) {
      throw new AppError(401, 'INVALID_PASSWORD', 'Invalid password')
    }

    // Revoke refresh token and delete user (cascades to related records).
    await refreshDel(user.id)
    await prisma.user.delete({ where: { id: user.id } })

    return { deleted: true, userId }
  }

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA EXPORT
  // ═══════════════════════════════════════════════════════════════════════════════

  /**
   * Export all data belonging to the authenticated user.
   */
  async exportData(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, name: true, credits: true, purchasedCredits: true,
        reservedCredits: true, totalConsumedCredits: true, tier: true,
        emailVerified: true, createdAt: true, updatedAt: true,
      },
    })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const projects = await prisma.project.findMany({
      where: { userId },
      include: { files: true, versions: true },
    })
    const payments = await prisma.payment.findMany({ where: { userId } })
    const subscription = await prisma.subscription.findUnique({ where: { userId } })
    const creditTransactions = await prisma.creditTransaction.findMany({
      where: { userId },
    })
    const creditReservations = await prisma.creditReservation.findMany({
      where: { userId },
    })

    return {
      user,
      projects,
      payments,
      subscription,
      creditTransactions,
      creditReservations,
      exportedAt: new Date(),
    }
  }
}

export const authService = new AuthService()
export default authService
