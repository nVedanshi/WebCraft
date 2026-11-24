import { prisma } from '../../lib/prisma.js'
import { AppError } from '../../middleware/error.js'
import { creditAccountingService, FREE_DAILY_CREDITS, PRO_DAILY_CREDITS } from './credit.service.js'

/**
 * SubscriptionTierService — manages the three pricing tiers and their
 * credit allocation policies.
 *
 * Tier rules:
 *   FREE:   $0/month, 50 credits/day (UTC reset, no rollover)
 *   PRO:    $10/month, 200 credits/billing period (configurable interval)
 *   BUSINESS: Pay-as-you-go, no fixed allowance, spending limits
 *
 * Subscription state transitions are driven by payment webhooks,
 * never by frontend-reported status.
 */

const PRO_MONTHLY_PRICE_CENTS = parseInt(
  process.env.PRO_MONTHLY_PRICE_CENTS || '1000',
  10
) // $10.00
const PRO_BILLING_INTERVAL_MONTHS = parseInt(
  process.env.PRO_BILLING_INTERVAL_MONTHS || '1',
  10
)

export class SubscriptionTierService {
  // ══════════════════════════════════════════════════════════════════════════
  // TIER INFORMATION
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Get tier configuration and pricing information.
   */
  static getTierConfig() {
    return {
      FREE: {
        name: 'Free',
        priceCents: 0,
        currency: 'USD',
        interval: 'none',
        allowance: FREE_DAILY_CREDITS,
        rollover: false,
        models: ['kilo/google/gemini-1.5-flash', 'kilo/openai/gpt-4o-mini'],
        description: `${FREE_DAILY_CREDITS} credits per UTC day (no rollover)`,
      },
      PRO: {
        name: 'Pro',
        priceCents: PRO_MONTHLY_PRICE_CENTS,
        currency: 'USD',
        interval: 'month',
        allowance: PRO_DAILY_CREDITS,
        rollover: false,
        models: [
          'kilo/anthropic/claude-3-haiku',
          'kilo/openai/gpt-4o-mini',
          'kilo/google/gemini-1.5-flash',
          'kilo/google/gemini-1.5-pro',
          'kilo/anthropic/claude-sonnet-4.5',
        ],
        description: `${PRO_DAILY_CREDITS} credits per UTC day (no rollover)`,
      },
      BUSINESS: {
        name: 'Business',
        priceCents: 0, // pay-as-you-go
        currency: 'USD',
        interval: 'none',
        allowance: null, // no fixed allowance
        rollover: false,
        models: [
          'kilo/anthropic/claude-sonnet-4.5',
          'kilo/openai/gpt-4o',
          'kilo/anthropic/claude-3-haiku',
          'kilo/openai/gpt-4o-mini',
          'kilo/google/gemini-1.5-flash',
          'kilo/google/gemini-1.5-pro',
        ],
        description: 'Pay-as-you-go, spending limits, detailed cost breakdowns',
      },
    }
  }

  /**
   * Get the models available for a given tier.
   */
  static getAvailableModels(tier) {
    const config = this.getTierConfig()[tier]
    return config ? config.models : []
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SUBSCRIPTION QUERIES
  // ══════════════════════════════════════════════════════════════════════════

  async getSubscription(userId) {
    const subscription = await prisma.subscription.findUnique({
      where: { userId },
    })
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, tier: true, credits: true, reservedCredits: true },
    })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const tierConfig = SubscriptionTierService.getTierConfig()[user.tier]

    return {
      userId,
      tier: user.tier,
      status: subscription?.status || 'inactive',
      currentPeriodStart: subscription?.currentPeriodStart || null,
      currentPeriodEnd: subscription?.currentPeriodEnd || null,
      creditsAllocated: subscription?.creditsAllocated || 0,
      creditsConsumed: subscription?.creditsConsumed || 0,
      availableCredits: user.credits - user.reservedCredits,
      reservedCredits: user.reservedCredits,
      totalCredits: user.credits,
      tierConfig,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TIER CHANGE (UPGRADE/DOWNGRADE)
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Change a user's subscription tier.
   * This records the intent; actual activation happens via payment webhook
   * for paid tiers, or immediately for FREE.
   *
   * @param userId - authenticated user
   * @param newTier - 'FREE' | 'PRO' | 'BUSINESS'
   * @param razorpaySubscriptionId - optional, for PRO/BUSINESS subscriptions
   */
  async changeTier(userId, newTier, { razorpaySubscriptionId } = {}) {
    const validTiers = ['FREE', 'PRO', 'BUSINESS']
    if (!validTiers.includes(newTier)) {
      throw new AppError(400, 'INVALID_TIER', `Invalid tier: ${newTier}`)
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM "User" WHERE id = ${userId} FOR UPDATE`
      const user = await tx.user.findUnique({ where: { id: userId } })
      if (!user) {
        throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
      }

      if (user.tier === newTier) {
        throw new AppError(
          400,
          'SAME_TIER',
          `User is already on ${newTier} tier`
        )
      }

      const now = new Date()
      let periodStart = now
      let periodEnd = null

      if (newTier === 'PRO') {
        periodEnd = this._addMonths(now, PRO_BILLING_INTERVAL_MONTHS)
      }

      await tx.user.update({
        where: { id: userId },
        data: { tier: newTier },
      })

      const subscription = await tx.subscription.upsert({
        where: { userId },
        update: {
          tier: newTier,
          status: newTier === 'FREE' ? 'active' : 'pending',
          razorpaySubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          creditsConsumed: 0, // reset on tier change
        },
        create: {
          userId,
          tier: newTier,
          status: newTier === 'FREE' ? 'active' : 'pending',
          razorpaySubscriptionId,
          currentPeriodStart: periodStart,
          currentPeriodEnd: periodEnd,
          creditsAllocated: 0,
          creditsConsumed: 0,
        },
      })

      return { subscription, periodStart, periodEnd }
    })

    // Daily allocation no longer applies: FREE tier gets a one-time signup
    // grant (handled in provisionNewUser / grantSignupCredits).
    // No recurring credits are allocated on tier change.

    return {
      userId,
      tier: newTier,
      status: result.subscription.status,
      currentPeriodStart: result.subscription.currentPeriodStart,
      currentPeriodEnd: result.subscription.currentPeriodEnd,
    }
  }

  /**
   * Activate a PRO subscription after successful payment webhook.
   * Allocates daily credits (200 per UTC day).
   * Idempotent: uses period start to prevent duplicate activation.
   */
  async activateProSubscription(userId, periodStart, periodEnd, razorpaySubscriptionId) {
    await creditAccountingService.allocateDailyCredits(userId, 'PRO')

    // Update subscription status
    await prisma.subscription.update({
      where: { userId },
      data: {
        status: 'active',
        razorpaySubscriptionId,
        currentPeriodStart: new Date(periodStart),
        currentPeriodEnd: new Date(periodEnd),
      },
    })

    return {
      userId,
      tier: 'PRO',
      status: 'active',
      currentPeriodStart: new Date(periodStart),
      currentPeriodEnd: new Date(periodEnd),
    }
  }

  /**
   * Handle subscription renewal (webhook).
   * Allocates daily credits for the new billing period.
   */
  async renewSubscription(userId, periodStart, periodEnd) {
    return creditAccountingService.allocateDailyCredits(userId, 'PRO')
  }

  /**
   * Cancel subscription at period end.
   */
  async cancelSubscription(userId) {
    const subscription = await prisma.subscription.update({
      where: { userId },
      data: {
        cancelAtPeriodEnd: true,
        status: 'cancelling',
      },
    })
    return {
      userId,
      tier: subscription.tier,
      status: subscription.status,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: subscription.currentPeriodEnd,
    }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // USAGE CHECKS
  // ══════════════════════════════════════════════════════════════════════════

  /**
   * Check if a user can generate based on their tier and available credits.
   * Returns { allowed: boolean, reason?: string, creditsNeeded?: number }
   */
  async canGenerate(userId, creditsNeeded) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tier: true,
        credits: true,
        reservedCredits: true,
      },
    })
    if (!user) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    // Allocate daily credits if not already allocated today (lazy allocation).
    await creditAccountingService.allocateDailyCredits(userId, user.tier)

    // Re-read balance after allocation.
    const updated = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tier: true,
        credits: true,
        reservedCredits: true,
      },
    })
    if (!updated) {
      throw new AppError(404, 'USER_NOT_FOUND', 'User not found')
    }

    const available = updated.credits - updated.reservedCredits

    if (available < creditsNeeded) {
      if (updated.tier === 'FREE') {
        return {
          allowed: false,
          reason: `Daily credits exhausted (${FREE_DAILY_CREDITS} credits per UTC day). Purchase more credits or upgrade to Pro.`,
          creditsNeeded,
          available,
        }
      }
      return {
        allowed: false,
        reason: 'Insufficient credits. Please purchase more credits or upgrade your plan.',
        creditsNeeded,
        available,
      }
    }

    return {
      allowed: true,
      available,
      creditsNeeded,
    }
  }

  /**
   * Get Business-tier spending information.
   */
  async getSpendingInfo(userId) {
    const limit = await prisma.spendingLimit.findUnique({
      where: { userId },
    })
    if (!limit) {
      return {
        dailyLimitCents: 0,
        monthlyLimitCents: 0,
        currentDailySpendCents: 0,
        currentMonthlySpendCents: 0,
        dailyLimitReached: false,
        monthlyLimitReached: false,
      }
    }

    const now = new Date()

    // Check if daily reset is needed
    if (
      !limit.dailySpendResetAt ||
      limit.dailySpendResetAt <
        new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
    ) {
      return {
        dailyLimitCents: limit.dailyLimitCents,
        monthlyLimitCents: limit.monthlyLimitCents,
        currentDailySpendCents: 0,
        currentMonthlySpendCents: limit.currentMonthlySpendCents,
        dailyLimitReached: false,
        monthlyLimitReached:
          limit.monthlyLimitCents > 0 &&
          limit.currentMonthlySpendCents >= limit.monthlyLimitCents,
      }
    }

    const dailyLimitReached =
      limit.dailyLimitCents > 0 &&
      limit.currentDailySpendCents >= limit.dailyLimitCents
    const monthlyLimitReached =
      limit.monthlyLimitCents > 0 &&
      limit.currentMonthlySpendCents >= limit.monthlyLimitCents

    return {
      dailyLimitCents: limit.dailyLimitCents,
      monthlyLimitCents: limit.monthlyLimitCents,
      currentDailySpendCents: limit.currentDailySpendCents,
      currentMonthlySpendCents: limit.currentMonthlySpendCents,
      dailyLimitReached,
      monthlyLimitReached,
    }
  }

  /**
   * Set spending limits for Business tier.
   */
  async setSpendingLimit(userId, { dailyLimitCents, monthlyLimitCents, alertThresholdCents }) {
    return prisma.spendingLimit.upsert({
      where: { userId },
      update: {
        dailyLimitCents,
        monthlyLimitCents,
        alertThresholdCents,
      },
      create: {
        userId,
        dailyLimitCents,
        monthlyLimitCents,
        alertThresholdCents,
      },
    })
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PRIVATE HELPERS
  // ══════════════════════════════════════════════════════════════════════════

  _addMonths(date, months) {
    const result = new Date(date)
    result.setMonth(result.getMonth() + months)
    return result
  }
}

export const subscriptionTierService = new SubscriptionTierService()
export default SubscriptionTierService
