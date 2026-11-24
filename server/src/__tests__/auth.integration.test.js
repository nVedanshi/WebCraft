import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'integration@example.com',
  password: 'Password123!',
  name: 'Integration Tester',
}

describe('Auth API', () => {
  beforeAll(async () => {
    // Ensure clean state
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('registers a new user', async () => {
    const res = await request
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(201)

    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.user.passwordHash).toBeUndefined() // password not leaked
  })

  it('rejects duplicate registration', async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await request.post('/api/v1/auth/register').send(testUser).expect(201)
    const res = await request
      .post('/api/v1/auth/register')
      .send(testUser)
      .expect(409)
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS')
  })

  it('logs in and issues tokens', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.accessToken).toBeDefined()
    expect(res.body.data.refreshToken).toBeDefined()
    expect(res.body.data.user.id).toBeDefined()
  })

  it('rejects wrong password', async () => {
    const res = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: 'WrongPassword!' })
      .expect(401)
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS')
  })

  it('requires authentication for /me', async () => {
    const res = await request.get('/api/v1/auth/me').expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('returns current user with valid token', async () => {
    const login = await request
      .post('/api/v1/auth/login')
      .send({ email: testUser.email, password: testUser.password })
    const token = login.body.data.accessToken

    const res = await request
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.user.email).toBe(testUser.email)
  })
})
