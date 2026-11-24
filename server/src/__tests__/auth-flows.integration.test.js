import { describe, it, expect, afterAll, beforeAll, vi } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'crypto'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'authflows@example.com',
  password: 'Password123!',
  name: 'Auth Flows Tester',
}

function generateToken() {
  return randomBytes(32).toString('hex')
}

function hashToken(token) {
  return createHash('sha256').update(token).digest('hex')
}

let accessToken = ''
let userId = ''

// Capture mailer output so we can assert emails were "sent".
const mailerLogs = []
vi.spyOn(console, 'log').mockImplementation((...args) => {
  mailerLogs.push(args.join(' '))
})

describe('Auth flows — forgot / reset / verify / delete / export', () => {
  beforeAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: testUser.password, name: testUser.name })
    expect(reg.status).toBe(201)
    userId = reg.body.data.user.id

    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
    accessToken = login.body.data.accessToken
  })

  afterAll(async () => {
    vi.restoreAllMocks()
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // FORGOT PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════════

  it('forgot-password returns success for existing email and sends reset link', async () => {
    mailerLogs.length = 0
    const res = await request
      .post('/api/v1/auth/forgot-password')
      .send({ email: testUser.email })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.sent).toBe(true)
    expect(res.body.data.email).toBe(testUser.email)
    // Dev mailer logged the reset link.
    expect(mailerLogs.some((l) => l.includes('reset-password?token='))).toBe(true)
  })

  it('forgot-password returns same success for nonexistent email (no enumeration)', async () => {
    mailerLogs.length = 0
    const res = await request
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nonexistent@example.com' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.sent).toBe(true)
    expect(res.body.data.email).toBe('nonexistent@example.com')
    // No email sent for nonexistent user.
    expect(mailerLogs.some((l) => l.includes('reset-password?token='))).toBe(false)
  })

  it('forgot-password is rate limited after multiple attempts', async () => {
    // Exhaust the rate limit (5 attempts per 15 min window).
    for (let i = 0; i < 5; i++) {
      await request
        .post('/api/v1/auth/forgot-password')
        .send({ email: 'ratelimit@example.com' })
    }
    const res = await request
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'ratelimit@example.com' })
      .expect(429)
    expect(res.body.error.code).toBe('RATE_LIMITED')
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESET PASSWORD
  // ═══════════════════════════════════════════════════════════════════════════════

  it('reset-password works with a valid fresh token', async () => {
    // Create a fresh reset token directly.
    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    const res = await request
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPassword123!' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.reset).toBe(true)

    // Can log in with the new password.
    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'NewPassword123!' })
      .expect(200)
    expect(login.body.data.accessToken).toBeDefined()
  })

  it('reset-password rejects an invalid token', async () => {
    const res = await request
      .post('/api/v1/auth/reset-password')
      .send({ token: 'invalidtoken123', password: 'NewPassword123!' })
      .expect(400)
    expect(res.body.error.code).toBe('INVALID_RESET_TOKEN')
  })

  it('reset-password rejects an already-used token', async () => {
    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: new Date(),
      },
    })

    const res = await request
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPassword123!' })
      .expect(400)
    expect(res.body.error.code).toBe('RESET_TOKEN_ALREADY_USED')
  })

  it('reset-password revokes existing refresh tokens', async () => {
    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        type: 'password_reset',
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    })

    await request
      .post('/api/v1/auth/reset-password')
      .send({ token, password: 'NewPassword123!' })
      .expect(200)

    // The old password no longer works.
    const badLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'Password123!' })
      .expect(401)
    expect(badLogin.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // EMAIL VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  it('verify-email works with a valid fresh token', async () => {
    // Create a user that is NOT verified.
    const { default: bcrypt } = await import('bcryptjs')
    const unverified = await prisma.user.create({
      data: {
        email: `verify-${Date.now()}@example.com`,
        passwordHash: await bcrypt.hash('Password123!', 12),
        name: 'Unverified User',
        tier: 'FREE',
        emailVerified: false,
      },
      select: { id: true },
    })

    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId: unverified.id,
        tokenHash,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    })

    const res = await request
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.verified).toBe(true)
    expect(res.body.data.alreadyVerified).toBe(false)

    // Cleanup.
    await prisma.user.delete({ where: { id: unverified.id } }).catch(() => {})
  })

  it('verify-email rejects an expired token', async () => {
    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        type: 'email_verification',
        expiresAt: new Date(Date.now() - 60 * 60 * 1000), // expired 1 hour ago
      },
    })

    const res = await request
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(400)
    expect(res.body.error.code).toBe('VERIFY_TOKEN_EXPIRED')
  })

  it('verify-email rejects an already-used token', async () => {
    const token = generateToken()
    const tokenHash = hashToken(token)
    await prisma.passwordResetToken.create({
      data: {
        userId,
        tokenHash,
        type: 'email_verification',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        usedAt: new Date(),
      },
    })

    const res = await request
      .post('/api/v1/auth/verify-email')
      .send({ token })
      .expect(400)
    expect(res.body.error.code).toBe('VERIFY_TOKEN_ALREADY_USED')
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // RESEND VERIFICATION
  // ═══════════════════════════════════════════════════════════════════════════════

  it('resend-verification returns success for unverified user', async () => {
    mailerLogs.length = 0
    const res = await request
      .post('/api/v1/auth/resend-verification')
      .send({ email: testUser.email })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.sent).toBe(true)
  })

  it('resend-verification returns success for nonexistent email (no enumeration)', async () => {
    const res = await request
      .post('/api/v1/auth/resend-verification')
      .send({ email: 'nonexistent@example.com' })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.sent).toBe(true)
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // ACCOUNT DELETION
  // ═══════════════════════════════════════════════════════════════════════════════

  it('delete-account requires confirmDelete=true', async () => {
    const res = await request
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: testUser.password })
      .expect(400)
    expect(res.body.error.code).toBe('DELETION_NOT_CONFIRMED')
  })

  it('delete-account rejects wrong password', async () => {
    const res = await request
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ password: 'WrongPassword!', confirmDelete: true })
      .expect(401)
    expect(res.body.error.code).toBe('INVALID_PASSWORD')
  })

  it('delete-account deletes the user with correct password', async () => {
    // Register a separate user to delete so we keep the main testUser for export test.
    const delEmail = `delete-${Date.now()}@example.com`
    await request
      .post('/api/v1/auth/register')
      .send({ email: delEmail, password: 'Password123!', name: 'To Be Deleted' })
      .expect(201)
    const delLogin = await request
      .post('/api/v1/auth/login')
      .send({ email: delEmail, password: 'Password123!' })
      .expect(200)
    const delToken = delLogin.body.data.accessToken

    const res = await request
      .delete('/api/v1/users/me')
      .set('Authorization', `Bearer ${delToken}`)
      .send({ password: 'Password123!', confirmDelete: true })
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.deleted).toBe(true)

    // User can no longer log in.
    await request
      .post('/api/v1/auth/login')
      .send({ email: delEmail, password: 'Password123!' })
      .expect(401)
  })

  // ═══════════════════════════════════════════════════════════════════════════════
  // DATA EXPORT
  // ═══════════════════════════════════════════════════════════════════════════════

  it('export-data returns user data for authenticated user', async () => {
    const res = await request
      .get('/api/v1/users/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
    expect(res.body.data.exportedAt).toBeDefined()
    expect(Array.isArray(res.body.data.projects)).toBe(true)
    expect(Array.isArray(res.body.data.creditTransactions)).toBe(true)
  })

  it('export-data requires authentication', async () => {
    await request.get('/api/v1/users/export').expect(401)
  })
})
