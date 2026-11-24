import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/error.js'

/**
 * CreditAccountingService — auditable credit ledger for WebCraft.
 *
 * Balance model
 * -------------
 * `user.credits`              = total remaining spendable credits
 * `user.purchasedCredits`     = subset that is persistent (purchases, refunds,
 *                               positive admin adjustments).
 * `user.reservedCredits`      = held credits (still part of `credits`, not spendable)
 * `user.totalConsumedCredits` = lifetime consumed credits (usage reporting)
 * `user.signupCreditsGranted` = whether daily credits have been granted at least once (legacy field).
 *
 * Credit model
 * ------------
 *   FREE:   50 credits per UTC day (granted daily, no rollover).
 *   PRO:    $10/month, 200 credits per UTC day (granted daily, no rollover).
 *   BUSINESS: Pay-as-you-go, configurable prepaid credit packs.
 *
 * Concurrency
 * -----------
 * Every mutating operation runs inside a transaction and takes a PostgreSQL
 * row lock (`SELECT ... FOR UPDATE`) on the user balance row before reading it.
 * This serialises concurrent reserve/consume/allocate operations and prevents
 * overspending or double-granting.
 *
 * Credits are WebCraft's internal units and are NOT LLM tokens.
 */

const FREE_DAILY_CREDITS = parseInt(process.env.FREE_DAILY_CREDITS || '50', 10)
const PRO_DAILY_CREDITS = parseInt(process.env.PRO_DAILY_CREDITS || '200', 10)

function utcDayStart(date = new Date()) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}
function nextUtcDayStart(date = new Date()) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + 1)
  )
}

async function lockUser(tx, userId) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
}

export class CreditAccountingService {
  // ══════════════════════════════════════════════════════════════════════════════
  // BALANCE QUERIES
  // ══════════════════════════════════════════════════════════════════════════════

  async getBalance(userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tier: true },
    })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

    // Allocate daily credits if not already allocated today (lazy allocation).
    await this.allocateDailyCredits(userId, user.tier)

    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true, credits: true, purchasedCredits: true, reservedCredits: true,
        totalConsumedCredits: true, signupCreditsGranted: true, tier: true,
      },
    })
    if (!updated) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    return {
      userId: updated.id,
      tier: updated.tier,
      credits: updated.credits,
      purchasedCredits: updated.purchasedCredits,
      allowanceCredits: Math.max(0, updated.credits - updated.purchasedCredits),
      availableCredits: updated.credits - updated.reservedCredits,
      reservedCredits: updated.reservedCredits,
      totalConsumedCredits: updated.totalConsumedCredits,
      signupCreditsGranted: updated.signupCreditsGranted,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // DAILY CREDIT ALLOCATION
  //
  // Every UTC day, FREE users get FREE_DAILY_CREDITS (50) and PRO users get
  // PRO_DAILY_CREDITS (200). Unused credits do NOT roll over.

  /**
   * Allocate daily credits for a user if not already allocated for today.
   * Idempotent per (user, utcDay).
   */
  async allocateDailyCredits(userId, tier) {
    const dailyAmount = tier === 'PRO' ? PRO_DAILY_CREDITS : FREE_DAILY_CREDITS
    const today = utcDayStart()
    const resetAt = nextUtcDayStart(today)

    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId)
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

      const existing = await tx.dailyCreditAllocation.findUnique({
        where: { userId_allocationDate: { userId, allocationDate: today } },
      })
      if (existing) {
        return { allocated: 0, alreadyAllocated: true, balance: user.credits, tier }
      }

      const newBalance = user.credits + dailyAmount
      await tx.user.update({ where: { id: userId }, data: { credits: newBalance } })

      await tx.dailyCreditAllocation.create({
        data: {
          userId,
          allocationDate: today,
          creditsGranted: dailyAmount,
          creditsConsumed: 0,
          resetAt,
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'ALLOCATE',
          amount: dailyAmount,
          balanceAfter: newBalance,
          description: `Daily credit allocation (${dailyAmount} credits for ${new Date(today).toISOString().split('T')[0]})`,
        },
      })

      return { allocated: dailyAmount, alreadyAllocated: false, balance: newBalance, tier }
    })
  }

  /**
   * Grant daily credits (legacy wrapper for registration flow).
   */
  async grantSignupCredits(userId) {
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    return this.allocateDailyCredits(userId, user.tier)
  }

  // ONE-TIME SIGNUP GRANT (legacy — now delegates to daily allocation)

  // ══════════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION CREDIT ALLOCATION (PRO TIER)
  // ══════════════════════════════════════════════════════════════════════════════

  /**
   * Allocate daily subscription credits for PRO tier.
   * Idempotent per (user, utcDay). Only call after a verified subscription payment.
   */
  async allocateSubscriptionCredits(userId, periodStart, periodEnd, credits = PRO_DAILY_CREDITS) {
    return this.allocateDailyCredits(userId, 'PRO')
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RESERVE
  // ══════════════════════════════════════════════════════════════════════════════

  async reserveCredits(userId, amount, { jobId, reason } = {}) {
    if (amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'Reservation amount must be positive')

    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId)
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

      const available = user.credits - user.reservedCredits
      if (available < amount) {
        throw new AppError(
          402,
          'INSUFFICIENT_CREDITS',
          `Insufficient credits: ${available} available, ${amount} required`
        )
      }
      if (user.tier === 'BUSINESS') {
        await this._checkSpendingLimit(tx, userId, 0) // reservation itself costs nothing
      }

      const newReserved = user.reservedCredits + amount
      await tx.user.update({ where: { id: userId }, data: { reservedCredits: newReserved } })

      const reservation = await tx.creditReservation.create({
        data: {
          userId,
          jobId,
          amount,
          status: 'pending',
          reason: reason || 'Generation credit reservation',
        },
      })

      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'RESERVE',
          amount,
          balanceAfter: user.credits,
          reference: jobId,
          description: `Credit reservation: ${amount} credits${reason ? ` (${reason})` : ''}`,
        },
      })

      return {
        reservationId: reservation.id,
        amount,
        availableAfter: user.credits - newReserved,
        totalCredits: user.credits,
        reservedCredits: newReserved,
      }
    })
  }

  async _checkSpendingLimit(tx, userId, estimatedCostCents) {
    let limit = await tx.spendingLimit.findUnique({ where: { userId } })
    if (!limit) {
      limit = await tx.spendingLimit.create({
        data: { userId, currentDailySpendCents: 0, currentMonthlySpendCents: 0 },
      })
    }
    const now = new Date()
    if (
      !limit.dailySpendResetAt ||
      limit.dailySpendResetAt < utcDayStart(now)
    ) {
      await tx.spendingLimit.update({
        where: { userId },
        data: { currentDailySpendCents: 0, dailySpendResetAt: nextUtcDayStart(now) },
      })
      limit.currentDailySpendCents = 0
    }
    if (
      !limit.monthlySpendResetAt ||
      limit.monthlySpendResetAt < new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1))
    ) {
      await tx.spendingLimit.update({
        where: { userId },
        data: {
          currentMonthlySpendCents: 0,
          monthlySpendResetAt: new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)),
        },
      })
      limit.currentMonthlySpendCents = 0
    }
    if (limit.dailyLimitCents > 0 && limit.currentDailySpendCents + estimatedCostCents > limit.dailyLimitCents) {
      throw new AppError(402, 'DAILY_SPEND_LIMIT_EXCEEDED', 'Daily spending limit would be exceeded')
    }
    if (limit.monthlyLimitCents > 0 && limit.currentMonthlySpendCents + estimatedCostCents > limit.monthlyLimitCents) {
      throw new AppError(402, 'MONTHLY_SPEND_LIMIT_EXCEEDED', 'Monthly spending limit would be exceeded')
    }
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // CONSUME
  // ══════════════════════════════════════════════════════════════════════════════

  async consumeCredits(reservationId, actualAmount, { jobId } = {}) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({ where: { id: reservationId } })
      if (!reservation) throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Credit reservation not found')
      if (reservation.status !== 'pending') {
        throw new AppError(400, 'RESERVATION_ALREADY_PROCESSED', `Reservation already ${reservation.status}`)
      }
      if (actualAmount > reservation.amount) {
        throw new AppError(400, 'INVALID_AMOUNT', `Actual amount ${actualAmount} exceeds reserved ${reservation.amount}`)
      }

      await lockUser(tx, reservation.userId)
      const user = await tx.user.findUnique({ where: { id: reservation.userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

      const free = Math.max(0, user.credits - user.purchasedCredits)
      const fromFree = Math.min(actualAmount, free)
      const fromPurchased = actualAmount - fromFree
      const newReserved = Math.max(0, user.reservedCredits - reservation.amount)

      const updatedUser = await tx.user.update({
        where: { id: reservation.userId },
        data: {
          credits: user.credits - actualAmount,
          purchasedCredits: user.purchasedCredits - fromPurchased,
          reservedCredits: newReserved,
          totalConsumedCredits: user.totalConsumedCredits + actualAmount,
        },
      })

      // Conditional update prevents double-processing under races.
      const processed = await tx.creditReservation.updateMany({
        where: { id: reservationId, status: 'pending' },
        data: { status: 'consumed', consumedAt: new Date() },
      })
      if (processed.count !== 1) {
        throw new AppError(400, 'RESERVATION_ALREADY_PROCESSED', 'Reservation already processed')
      }

      await tx.creditTransaction.create({
        data: {
          userId: reservation.userId,
          type: 'CONSUME',
          amount: -actualAmount,
          balanceAfter: updatedUser.credits,
          reference: jobId || reservation.jobId,
          description: `Credit consumption: ${actualAmount} credits for generation`,
        },
      })

      if (user.tier === 'PRO') {
        await tx.subscription.updateMany({
          where: { userId: reservation.userId },
          data: { creditsConsumed: { increment: actualAmount } },
        })
      }

      return {
        consumed: actualAmount,
        released: reservation.amount - actualAmount,
        balance: updatedUser.credits,
        reservedCredits: updatedUser.reservedCredits,
        totalConsumedCredits: updatedUser.totalConsumedCredits,
      }
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // RELEASE
  // ══════════════════════════════════════════════════════════════════════════════

  async releaseCredits(reservationId, { reason, jobId } = {}) {
    return prisma.$transaction(async (tx) => {
      const reservation = await tx.creditReservation.findUnique({ where: { id: reservationId } })
      if (!reservation) throw new AppError(404, 'RESERVATION_NOT_FOUND', 'Credit reservation not found')
      if (reservation.status !== 'pending') {
        throw new AppError(400, 'RESERVATION_ALREADY_PROCESSED', `Reservation already ${reservation.status}`)
      }

      await lockUser(tx, reservation.userId)
      const user = await tx.user.findUnique({ where: { id: reservation.userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

      const newReserved = Math.max(0, user.reservedCredits - reservation.amount)
      const updatedUser = await tx.user.update({
        where: { id: reservation.userId },
        data: { reservedCredits: newReserved },
      })

      const processed = await tx.creditReservation.updateMany({
        where: { id: reservationId, status: 'pending' },
        data: { status: 'released', releasedAt: new Date(), reason: reason || reservation.reason || 'Generation cancelled' },
      })
      if (processed.count !== 1) {
        throw new AppError(400, 'RESERVATION_ALREADY_PROCESSED', 'Reservation already processed')
      }

      await tx.creditTransaction.create({
        data: {
          userId: reservation.userId,
          type: 'RELEASE',
          amount: reservation.amount,
          balanceAfter: user.credits,
          reference: jobId || reservation.jobId,
          description: `Credit release: ${reservation.amount} credits${reason ? ` (${reason})` : ''}`,
        },
      })

      return { released: reservation.amount, balance: user.credits, reservedCredits: updatedUser.reservedCredits }
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // REFUND / PURCHASE / ADJUST
  // ══════════════════════════════════════════════════════════════════════════════

  async refundCredits(userId, amount, { reference, description } = {}) {
    if (amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'Refund amount must be positive')
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId)
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
      const newBalance = user.credits - amount
      if (newBalance < 0) throw new AppError(400, 'INSUFFICIENT_CREDITS', 'Refund would result in negative balance')
      // Subtract from purchased credits first, then from free/allowance credits
      const freeCredits = Math.max(0, user.credits - user.purchasedCredits)
      const fromPurchased = Math.min(amount, user.purchasedCredits)
      const fromFree = amount - fromPurchased
      await tx.user.update({
        where: { id: userId },
        data: {
          credits: newBalance,
          purchasedCredits: user.purchasedCredits - fromPurchased,
        },
      })
      await tx.creditTransaction.create({
        data: { userId, type: 'REFUND', amount: -amount, balanceAfter: newBalance, reference, description: description || `Credit refund: ${amount} credits removed` },
      })
      return { refunded: amount, balance: newBalance }
    })
  }

  /**
   * Purchase credits (after verified payment only). Idempotent via `reference`.
   * Credits are persisted as purchased (never reset).
   */
  async purchaseCredits(userId, amount, { paymentId, description, reference } = {}) {
    if (amount <= 0) throw new AppError(400, 'INVALID_AMOUNT', 'Purchase amount must be positive')
    const idempotencyRef = reference || (paymentId ? `payment:${paymentId}` : null)
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId)
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')

      // Idempotency: never credit the same payment reference twice.
      if (idempotencyRef) {
        const prior = await tx.creditTransaction.findFirst({
          where: { userId, type: 'PURCHASE', reference: idempotencyRef },
        })
        if (prior) {
          return { purchased: 0, alreadyProcessed: true, balance: user.credits }
        }
      }

      const newBalance = user.credits + amount
      await tx.user.update({
        where: { id: userId },
        data: { credits: newBalance, purchasedCredits: user.purchasedCredits + amount },
      })
      await tx.creditTransaction.create({
        data: {
          userId,
          type: 'PURCHASE',
          amount,
          balanceAfter: newBalance,
          paymentId,
          reference: idempotencyRef,
          description: description || `Credit purchase: ${amount} credits`,
        },
      })
      return { purchased: amount, alreadyProcessed: false, balance: newBalance }
    })
  }

  async adjustCredits(userId, amount, { reason, reference } = {}) {
    return prisma.$transaction(async (tx) => {
      await lockUser(tx, userId)
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
      const newBalance = user.credits + amount
      if (newBalance < 0) throw new AppError(400, 'NEGATIVE_BALANCE', 'Adjustment would result in negative balance')

      let purchased = user.purchasedCredits
      if (amount >= 0) {
        purchased += amount
      } else {
        const free = Math.max(0, user.credits - user.purchasedCredits)
        const fromFree = Math.min(-amount, free)
        purchased = Math.max(0, user.purchasedCredits - (-amount - fromFree))
      }

      await tx.user.update({ where: { id: userId }, data: { credits: newBalance, purchasedCredits: purchased } })
      await tx.creditTransaction.create({
        data: { userId, type: 'ADJUST', amount, balanceAfter: newBalance, reference, description: reason || `Credit adjustment: ${amount} credits` },
      })
      return { adjusted: amount, balance: newBalance }
    })
  }

  // ══════════════════════════════════════════════════════════════════════════════
  // HISTORY
  // ══════════════════════════════════════════════════════════════════════════════

  async getTransactionHistory(userId, { take = 50, cursor } = {}) {
    return prisma.creditTransaction.findMany({
      where: { userId },
      take,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
    })
  }

  async getReservationHistory(userId, { take = 50 } = {}) {
    return prisma.creditReservation.findMany({
      where: { userId },
      take,
      orderBy: { createdAt: 'desc' },
    })
  }

  /**
   * Provision a brand-new FREE user atomically: user + subscription, all in one
   * transaction. Daily credits are allocated lazily on first balance check or
   * generation attempt (see allocateDailyCredits).
   */
  async provisionNewUser({ email, passwordHash, name }) {
    return prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          name,
          credits: 0,
          purchasedCredits: 0,
          reservedCredits: 0,
          totalConsumedCredits: 0,
          signupCreditsGranted: false,
          tier: 'FREE',
        },
        select: { id: true, email: true, name: true, credits: true, tier: true, createdAt: true },
      })
      await tx.subscription.create({ data: { userId: user.id, tier: 'FREE', status: 'active' } })

      return { ...user, credits: 0, signupCreditsGranted: false }
    })
  }
}

export { FREE_DAILY_CREDITS, PRO_DAILY_CREDITS }
export const creditAccountingService = new CreditAccountingService()
export default CreditAccountingService
