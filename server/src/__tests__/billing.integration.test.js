import { describe, it, expect, afterAll, beforeAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import supertest from 'supertest'

import { createApp } from '../app.js'

const prisma = new PrismaClient()
const app = createApp()
const request = supertest(app)

const testUser = {
  email: 'billing-test@example.com',
  password: 'Password123!',
  name: 'Billing Test User',
}

let accessToken = ''
let userId = ''

describe('Billing API', () => {
  beforeAll(async () => {
    // Clean up any existing test user
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})

    // Register and login
    const reg = await request
      .post('/api/v1/auth/register')
      .send({ email: testUser.email, password: testUser.password, name: testUser.name })
    expect(reg.status).toBe(201)
    accessToken = reg.body.data.accessToken
    userId = reg.body.data.user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { email: testUser.email } }).catch(() => {})
    await prisma.$disconnect()
  })

  it('gets balance for FREE tier user', async () => {
    const res = await request
      .get('/api/v1/billing/balance')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.tier).toBe('FREE')
    expect(res.body.data.credits).toBe(50)
    expect(res.body.data.availableCredits).toBe(50)
    expect(res.body.data.reservedCredits).toBe(0)
    expect(res.body.data.purchasedCredits).toBe(0)
  })

  it('gets subscription info for FREE tier user', async () => {
    const res = await request
      .get('/api/v1/billing/subscription')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.tier).toBe('FREE')
  })

  it('gets pricing tiers', async () => {
    const res = await request
      .get('/api/v1/billing/pricing-tiers')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.tiers).toBeDefined()
    expect(res.body.data.tiers.FREE).toBeDefined()
    expect(res.body.data.tiers.PRO).toBeDefined()
    expect(res.body.data.tiers.BUSINESS).toBeDefined()
  })

  it('gets active pricing models', async () => {
    const res = await request
      .get('/api/v1/billing/pricing')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.pricing).toBeDefined()
    expect(Array.isArray(res.body.data.pricing)).toBe(true)
  })

  it('records the welcome daily allocation in the ledger', async () => {
    const res = await request
      .get('/api/v1/billing/transactions')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.transactions.length).toBe(1)
    expect(res.body.data.transactions[0].type).toBe('ALLOCATE')
    expect(res.body.data.transactions[0].amount).toBe(50)
    expect(res.body.data.transactions[0].balanceAfter).toBe(50)
  })

  it('gets empty reservation history', async () => {
    const res = await request
      .get('/api/v1/billing/reservations')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.reservations).toEqual([])
  })

  it('refuses to create a real order when Razorpay is not configured', async () => {
    // The test environment has placeholder Razorpay credentials, so the
    // server must refuse rather than fabricate an order id.
    const res = await request
      .post('/api/v1/billing/purchase')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ credits: 100 })
      .expect(503)

    expect(res.body.success).toBe(false)
    expect(res.body.error.code).toBe('PAYMENTS_NOT_CONFIGURED')
  })

  it('reports payments as unconfigured without leaking secrets', async () => {
    const res = await request
      .get('/api/v1/billing/payments-config')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.data.configured).toBe(false)
    expect(res.body.data.keyId).toBeNull()
  })

  it('rejects invalid credit amount for purchase', async () => {
    await request
      .post('/api/v1/billing/purchase')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ credits: 0 })
      .expect(400)

    await request
      .post('/api/v1/billing/purchase')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ credits: -10 })
      .expect(400)
  })

  it('rejects purchase without credits', async () => {
    await request
      .post('/api/v1/billing/purchase')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({})
      .expect(400)
  })

  it('gets empty usage history', async () => {
    const res = await request
      .get('/api/v1/billing/usage')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.usage).toEqual([])
  })

  it('gets spending limit (default 0)', async () => {
    const res = await request
      .get('/api/v1/billing/spending-limit')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data).toBeDefined()
  })

  it('sets spending limit for BUSINESS tier user', async () => {
    // First change user to BUSINESS tier
    await prisma.user.update({
      where: { id: userId },
      data: { tier: 'BUSINESS' },
    })
    await prisma.subscription.upsert({
      where: { userId },
      update: { tier: 'BUSINESS' },
      create: { userId, tier: 'BUSINESS' },
    })

    const res = await request
      .post('/api/v1/billing/spending-limit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({
        dailyLimitCents: 5000,
        monthlyLimitCents: 100000,
        alertThresholdCents: 4000,
      })
      .expect(200)

    expect(res.body.success).toBe(true)
    expect(res.body.data.dailyLimitCents).toBe(5000)
    expect(res.body.data.monthlyLimitCents).toBe(100000)
    expect(res.body.data.alertThresholdCents).toBe(4000)
  })

  it('rejects spending limit for non-BUSINESS tier', async () => {
    // Change back to FREE tier
    await prisma.user.update({
      where: { id: userId },
      data: { tier: 'FREE' },
    })
    await prisma.subscription.upsert({
      where: { userId },
      update: { tier: 'FREE' },
      create: { userId, tier: 'FREE' },
    })

    await request
      .post('/api/v1/billing/spending-limit')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ dailyLimitCents: 100 })
      .expect(403)
  })

  it('requires authentication for all billing endpoints', async () => {
    await request.get('/api/v1/billing/balance').expect(401)
    await request.get('/api/v1/billing/subscription').expect(401)
    await request.get('/api/v1/billing/pricing-tiers').expect(401)
    await request.get('/api/v1/billing/pricing').expect(401)
    await request.get('/api/v1/billing/transactions').expect(401)
    await request.get('/api/v1/billing/usage').expect(401)
    await request.get('/api/v1/billing/reservations').expect(401)
    await request.get('/api/v1/billing/spending-limit').expect(401)
  })
})
