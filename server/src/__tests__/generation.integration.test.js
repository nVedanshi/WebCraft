import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'gen@example.com',
  password: 'Password123!',
  name: 'Generation Tester',
}

let accessToken = ''

describe('Generation API', () => {
  beforeAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: testUser.password, name: testUser.name })
    accessToken = reg.body.data.accessToken
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('requires authentication for /generate', async () => {
    const res = await request
      .post('/api/v1/generation/generate')
      .send({ prompt: 'Build a todo app', projectName: 'Test' })
      .expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('requires authentication for /generate/async', async () => {
    const res = await request
      .post('/api/v1/generation/generate/async')
      .send({ prompt: 'Build a todo app', projectName: 'Test' })
      .expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('requires authentication for /modify', async () => {
    const res = await request
      .post('/api/v1/generation/modify')
      .send({ projectId: 'dummy', instruction: 'Add a button' })
      .expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('validates generate request body', async () => {
    const res = await request
      .post('/api/v1/generation/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'short', projectName: 'Test' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('validates generate request missing projectName', async () => {
    const res = await request
      .post('/api/v1/generation/generate')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ prompt: 'Build a todo app with many features' })
      .expect(400)
    expect(res.body.error.code).toBe('VALIDATION_ERROR')
  })

  it('requires authentication for job status', async () => {
    const res = await request
      .get('/api/v1/generation/jobs/c000000000000000000000000')
      .expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })

  it('requires authentication for SSE stream', async () => {
    const res = await request
      .get('/api/v1/generation/stream/c000000000000000000000000')
      .expect(401)
    expect(res.body.error.code).toBe('UNAUTHENTICATED')
  })
})
