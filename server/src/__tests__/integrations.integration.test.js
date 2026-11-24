import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'
import { encryptSecret, decryptSecret } from '../lib/crypto.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: `integrations-${Date.now()}@example.com`,
  password: 'Password123!',
  name: 'Integrations Test',
}
let token
let userId

describe('Templates & Integrations API', () => {
  beforeAll(async () => {
    const reg = await request
      .post('/api/v1/auth/register')
      .send(testUser)
    expect(reg.status).toBe(201)
    token = reg.body.data.accessToken
    userId = reg.body.data.user.id
  })

  afterAll(async () => {
    await prisma.providerConfig.deleteMany({ where: { userId } }).catch(() => {})
    await prisma.user.delete({ where: { id: userId } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('lists templates with categories', async () => {
    const res = await request.get('/api/v1/templates').expect(200)
    expect(res.body.success).toBe(true)
    expect(res.body.data.templates.length).toBeGreaterThan(0)
    expect(Array.isArray(res.body.data.categories)).toBe(true)
  })

  it('filters templates by search', async () => {
    const res = await request.get('/api/v1/templates?search=dashboard').expect(200)
    expect(res.body.data.templates.every((t) =>
      `${t.name} ${t.description} ${t.category}`.toLowerCase().includes('dashboard')
    )).toBe(true)
  })

  it('returns a template by id and 404 for unknown', async () => {
    const tpl = await prisma.template.upsert({
      where: { slug: 'integration-test-template' },
      update: {},
      create: {
        name: 'Integration Test Template',
        slug: 'integration-test-template',
        description: 'A template for integration tests',
        category: 'dashboard',
        stack: { framework: 'React' },
        isPublished: true,
      },
    })
    const ok = await request.get(`/api/v1/templates/${tpl.id}`).expect(200)
    expect(ok.body.data.template.id).toBe(tpl.id)
    const missing = await request.get('/api/v1/templates/c0f8abc123def456ghi789jkl01').expect(404)
    expect(missing.body.error.code).toBe('TEMPLATE_NOT_FOUND')
  })

  it('lists providers as disconnected by default', async () => {
    const res = await request
      .get('/api/v1/integrations/providers')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(res.body.data.supported).toEqual(['openai', 'anthropic', 'gemini', 'kilo'])
    expect(res.body.data.providers.every((p) => p.connected === false)).toBe(true)
  })

  it('reports GitHub as unconfigured and refuses authorize with 503', async () => {
    const status = await request
      .get('/api/v1/integrations/github/status')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
    expect(status.body.data.configured).toBe(false)

    const auth = await request
      .get('/api/v1/integrations/github/authorize')
      .set('Authorization', `Bearer ${token}`)
      .expect(503)
    expect(auth.body.error.code).toBe('GITHUB_NOT_CONFIGURED')
  })

  it('rejects an unsupported provider', async () => {
    const res = await request
      .post('/api/v1/integrations/providers/notreal/key')
      .set('Authorization', `Bearer ${token}`)
      .send({ apiKey: 'some-long-enough-key' })
      .expect(400)
    expect(res.body.error.code).toBe('UNSUPPORTED_PROVIDER')
  })

  it('rejects a too-short API key via validation', async () => {
    await request
      .post('/api/v1/integrations/providers/openai/key')
      .set('Authorization', `Bearer ${token}`)
      .send({ apiKey: 'short' })
      .expect(400)
  })

  it('refuses repo access when GitHub is not connected', async () => {
    const res = await request
      .get('/api/v1/integrations/github/repos')
      .set('Authorization', `Bearer ${token}`)
      .expect(404)
    expect(res.body.error.code).toBe('GITHUB_NOT_CONNECTED')
  })

  it('requires auth for integration endpoints', async () => {
    await request.get('/api/v1/integrations/providers').expect(401)
    await request.get('/api/v1/integrations/github/status').expect(401)
  })

  it('encrypts and decrypts secrets with authenticated encryption', () => {
    process.env.ENCRYPTION_KEY = 'unit-test-encryption-key-1234567890'
    const plain = 'secret-api-key-value'
    const enc = encryptSecret(plain)
    expect(enc).not.toContain(plain)
    expect(enc.startsWith('v1:')).toBe(true)
    expect(decryptSecret(enc)).toBe(plain)
  })
})
