import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

import { creditAccountingService, FREE_DAILY_CREDITS } from '../services/billing/credit.service.js'

const prisma = new PrismaClient()

let userIdA
let userIdB
let userIdC

describe('Credit accounting — daily credit allocation', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await creditAccountingService.provisionNewUser({
      email: `credit-a-${Date.now()}@example.com`,
      passwordHash,
      name: 'User A',
    })
    userIdA = user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userIdA } }).catch(() => {})
  })

  it('registration starts with 0 credits (daily allocation is lazy)', async () => {
    const user = await prisma.user.findUnique({ where: { id: userIdA } })
    expect(user.credits).toBe(0)
    expect(user.signupCreditsGranted).toBe(false)
    expect(user.purchasedCredits).toBe(0)
    expect(user.totalConsumedCredits).toBe(0)
  })

  it('getBalance allocates daily credits for FREE tier', async () => {
    const balance = await creditAccountingService.getBalance(userIdA)
    expect(balance.availableCredits).toBe(FREE_DAILY_CREDITS)
    expect(balance.credits).toBe(FREE_DAILY_CREDITS)
    expect(balance.signupCreditsGranted).toBe(false)

    const txs = await prisma.creditTransaction.findMany({ where: { userId: userIdA } })
    expect(txs.length).toBe(1)
    expect(txs[0].type).toBe('ALLOCATE')
    expect(txs[0].amount).toBe(FREE_DAILY_CREDITS)
    expect(txs[0].balanceAfter).toBe(FREE_DAILY_CREDITS)
    expect(txs[0].description).toContain('Daily credit allocation')
  })

  it('daily allocation is idempotent — cannot allocate twice same day', async () => {
    const res1 = await creditAccountingService.allocateDailyCredits(userIdA, 'FREE')
    expect(res1.alreadyAllocated).toBe(true)
    expect(res1.allocated).toBe(0)

    const user = await prisma.user.findUnique({ where: { id: userIdA } })
    expect(user.credits).toBe(FREE_DAILY_CREDITS) // unchanged, not doubled

    const txs = await prisma.creditTransaction.findMany({
      where: { userId: userIdA, type: 'ALLOCATE' },
    })
    expect(txs.length).toBe(1) // only one ALLOCATE transaction today
  })

  it('grantSignupCredits delegates to daily allocation', async () => {
    const res = await creditAccountingService.grantSignupCredits(userIdA)
    expect(res.alreadyAllocated).toBe(true)
    expect(res.allocated).toBe(0)
  })
})

describe('Credit accounting — reservations and concurrent safety', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await creditAccountingService.provisionNewUser({
      email: `credit-b-${Date.now()}@example.com`,
      passwordHash,
      name: 'User B',
    })
    userIdB = user.id
    // Allocate daily credits so the user has a balance to work with
    await creditAccountingService.allocateDailyCredits(userIdB, 'FREE')
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userIdB } }).catch(() => {})
  })

  it('reserveCredits holds credits without consuming them', async () => {
    const res = await creditAccountingService.reserveCredits(userIdB, 20, {
      reason: 'Test reservation',
    })
    expect(res.reservationId).toBeDefined()
    expect(res.amount).toBe(20)
    expect(res.availableAfter).toBe(FREE_DAILY_CREDITS - 20)
    expect(res.reservedCredits).toBe(20)

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.reservedCredits).toBe(20)
    expect(user.credits).toBe(FREE_DAILY_CREDITS) // credits unchanged, only reserved
  })

  it('prevents overspending under concurrent reservations', async () => {
    // Reset balance: 50 credits, no reservations
    await prisma.user.update({
      where: { id: userIdB },
      data: { credits: FREE_DAILY_CREDITS, purchasedCredits: 0, reservedCredits: 0 },
    })

    const results = await Promise.allSettled([
      creditAccountingService.reserveCredits(userIdB, 40, { reason: 'concurrent-a' }),
      creditAccountingService.reserveCredits(userIdB, 40, { reason: 'concurrent-b' }),
    ])
    const fulfilled = results.filter((r) => r.status === 'fulfilled')
    const rejected = results.filter((r) => r.status === 'rejected')
    expect(fulfilled.length).toBe(1)
    expect(rejected.length).toBe(1)

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.reservedCredits).toBe(40)
    expect(user.credits).toBe(FREE_DAILY_CREDITS)
  })

  it('consumeCredits consumes reserved credits and updates totalConsumedCredits', async () => {
    // Reset: FREE_DAILY_CREDITS credits, no reservations
    await prisma.user.update({
      where: { id: userIdB },
      data: { credits: FREE_DAILY_CREDITS, purchasedCredits: 0, reservedCredits: 0, totalConsumedCredits: 0 },
    })

    // Create a fresh reservation
    const res = await creditAccountingService.reserveCredits(userIdB, 15, {
      reason: 'Test consume',
    })

    const consumed = await creditAccountingService.consumeCredits(res.reservationId, 10)
    expect(consumed.consumed).toBe(10)
    expect(consumed.released).toBe(5) // 15 reserved - 10 consumed = 5 released
    expect(consumed.balance).toBe(FREE_DAILY_CREDITS - 10)

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.totalConsumedCredits).toBe(10)

    const txs = await prisma.creditTransaction.findMany({
      where: { userId: userIdB, type: 'CONSUME' },
    })
    expect(txs.length).toBe(1)
    expect(txs[0].amount).toBe(-10)
  })

  it('releaseCredits releases unused reservation back to available', async () => {
    // Reset: FREE_DAILY_CREDITS credits
    await prisma.user.update({
      where: { id: userIdB },
      data: { credits: FREE_DAILY_CREDITS, reservedCredits: 0 },
    })

    const res = await creditAccountingService.reserveCredits(userIdB, 30, {
      reason: 'Test release',
    })

    const released = await creditAccountingService.releaseCredits(res.reservationId, {
      reason: 'Generation cancelled',
    })
    expect(released.released).toBe(30)

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.reservedCredits).toBe(0)
    expect(user.credits).toBe(FREE_DAILY_CREDITS)
  })

  it('refundCredits subtracts persistent purchased credits', async () => {
    // First purchase 200 credits so we have something to refund
    await creditAccountingService.purchaseCredits(userIdB, 200, {
      paymentId: 'pay_refund_test',
      reference: 'payment:pay_refund_test',
      description: 'Credits to refund',
    })

    const userBefore = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(userBefore.purchasedCredits).toBe(200)
    expect(userBefore.credits).toBe(FREE_DAILY_CREDITS + 200)

    // Now refund 100 of those purchased credits
    const res = await creditAccountingService.refundCredits(userIdB, 100, {
      reference: 'test_refund',
      description: 'Test refund',
    })
    expect(res.refunded).toBe(100)
    expect(res.balance).toBe(FREE_DAILY_CREDITS + 100) // 50 + 200 - 100

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.purchasedCredits).toBe(100) // 200 - 100

    const txs = await prisma.creditTransaction.findMany({
      where: { userId: userIdB, type: 'REFUND' },
    })
    expect(txs.length).toBe(1)
    expect(txs[0].amount).toBe(-100)
  })

  it('refundCredits prevents negative balance', async () => {
    // Reset to only daily free credits, no purchased
    await prisma.user.update({
      where: { id: userIdB },
      data: { credits: FREE_DAILY_CREDITS, purchasedCredits: 0, reservedCredits: 0 },
    })

    // Cannot refund more than available
    await expect(
      creditAccountingService.refundCredits(userIdB, 100, {
        reference: 'test_over_refund',
        description: 'Over-refund test',
      })
    ).rejects.toMatchObject({ code: 'INSUFFICIENT_CREDITS' })
  })

  it('purchaseCredits is idempotent via reference', async () => {
    const res1 = await creditAccountingService.purchaseCredits(userIdB, 200, {
      paymentId: 'pay_test_123',
      reference: 'payment:pay_test_123',
      description: 'Test purchase',
    })
    expect(res1.purchased).toBe(200)
    expect(res1.alreadyProcessed).toBe(false)

    const res2 = await creditAccountingService.purchaseCredits(userIdB, 200, {
      paymentId: 'pay_test_123',
      reference: 'payment:pay_test_123',
      description: 'Test purchase duplicate',
    })
    expect(res2.purchased).toBe(0)
    expect(res2.alreadyProcessed).toBe(true)

    const user = await prisma.user.findUnique({ where: { id: userIdB } })
    expect(user.purchasedCredits).toBe(200) // just this purchase, not doubled
  })
})

describe('Credit accounting — failed generation flow', () => {
  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await creditAccountingService.provisionNewUser({
      email: `credit-c-${Date.now()}@example.com`,
      passwordHash,
      name: 'User C',
    })
    userIdC = user.id
    // Allocate daily credits
    await creditAccountingService.allocateDailyCredits(userIdC, 'FREE')
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userIdC } }).catch(() => {})
  })

  it('reserve → release on failure returns credits', async () => {
    // Reset: FREE_DAILY_CREDITS credits
    await prisma.user.update({
      where: { id: userIdC },
      data: { credits: FREE_DAILY_CREDITS, reservedCredits: 0 },
    })

    // Reserve 25 credits for a generation job
    const reservation = await creditAccountingService.reserveCredits(userIdC, 25, {
      reason: 'Generation that will fail',
    })
    expect(reservation.amount).toBe(25)

    // Simulate generation failure: release the reservation
    const released = await creditAccountingService.releaseCredits(reservation.reservationId, {
      reason: 'Generation failed — releasing reservation',
    })
    expect(released.released).toBe(25)

    const user = await prisma.user.findUnique({ where: { id: userIdC } })
    expect(user.reservedCredits).toBe(0)
    expect(user.credits).toBe(FREE_DAILY_CREDITS) // back to full

    // Verify transaction history shows reserve then release
    const txs = await prisma.creditTransaction.findMany({
      where: { userId: userIdC },
      orderBy: { createdAt: 'asc' },
    })
    const reserveTx = txs.find((t) => t.type === 'RESERVE')
    const releaseTx = txs.find((t) => t.type === 'RELEASE')
    expect(reserveTx).toBeDefined()
    expect(releaseTx).toBeDefined()
    expect(releaseTx.amount).toBe(25)
  })

  it('consumeCredits rejects amount exceeding reservation', async () => {
    // Reset: FREE_DAILY_CREDITS credits
    await prisma.user.update({
      where: { id: userIdC },
      data: { credits: FREE_DAILY_CREDITS, reservedCredits: 0 },
    })

    const reservation = await creditAccountingService.reserveCredits(userIdC, 10, {
      reason: 'Test over-consume',
    })

    await expect(
      creditAccountingService.consumeCredits(reservation.reservationId, 15)
    ).rejects.toThrow('Actual amount 15 exceeds reserved 10')
  })
})

describe('Credit accounting — transaction and reservation history', () => {
  let histUserId

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('Password123!', 4)
    const user = await creditAccountingService.provisionNewUser({
      email: `credit-hist-${Date.now()}@example.com`,
      passwordHash,
      name: 'History User',
    })
    histUserId = user.id
    // Allocate daily credits so there's at least one transaction
    await creditAccountingService.allocateDailyCredits(histUserId, 'FREE')
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: histUserId } }).catch(() => {})
  })

  it('getTransactionHistory returns ordered transactions', async () => {
    const txs = await creditAccountingService.getTransactionHistory(histUserId, { take: 50 })
    expect(Array.isArray(txs)).toBe(true)
    expect(txs.length).toBeGreaterThan(0)

    // Verify ordering (descending by createdAt)
    for (let i = 1; i < txs.length; i++) {
      expect(new Date(txs[i - 1].createdAt).getTime()).toBeGreaterThanOrEqual(
        new Date(txs[i].createdAt).getTime()
      )
    }
  })

  it('getReservationHistory returns reservations', async () => {
    const reservations = await creditAccountingService.getReservationHistory(histUserId, {
      take: 50,
    })
    expect(Array.isArray(reservations)).toBe(true)
  })

  it('prevents negative balance on adjust', async () => {
    // Set user to 0 credits
    await prisma.user.update({
      where: { id: histUserId },
      data: { credits: 0, reservedCredits: 0 },
    })

    await expect(
      creditAccountingService.adjustCredits(histUserId, -5, { reason: 'Test negative' })
    ).rejects.toThrow('Adjustment would result in negative balance')
  })
})
