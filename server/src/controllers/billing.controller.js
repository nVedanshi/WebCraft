import { prisma } from '../lib/prisma.js'
import { AppError, catchAsync } from '../middleware/error.js'
import { creditAccountingService, FREE_DAILY_CREDITS } from '../services/billing/credit.service.js'
import { subscriptionTierService, SubscriptionTierService } from '../services/billing/subscription.service.js'
import { pricingEngine } from '../services/billing/pricing.service.js'
import { razorpayService } from '../services/billing/payment.service.js'

/**
 * Billing controller — HTTP handlers for credit and subscription management.
 *
 * All endpoints require authentication. Users can only access their own
 * billing data. Admin operations (pricing changes) are not exposed here
 * in this version; they are available via the PricingEngine service directly.
 *
 * Frontend-reported usage or payment status is never trusted. All credit
 * operations are server-side and validated against the database.
 */
export const billingController = {
  /**
   * Get the user's current credit balance and tier information.
   */
  getBalance: catchAsync(async (req, res) => {
    const userId = req.user.id
    let balance
    try {
      balance = await creditAccountingService.getBalance(userId)
    } catch (err) {
      throw new AppError(500, 'BALANCE_LOAD_FAILED', 'Failed to load credit balance')
    }

    // Add daily grant status for FREE tier
    let signupGrant = null
    if (balance.tier === 'FREE') {
      signupGrant = {
        granted: balance.signupCreditsGranted ? FREE_DAILY_CREDITS : 0,
        signupCreditsGranted: balance.signupCreditsGranted,
        dailyCredits: FREE_DAILY_CREDITS,
      }
    }

    // Add spending info for Business tier
    let spending = null
    if (balance.tier === 'BUSINESS') {
      spending = await subscriptionTierService.getSpendingInfo(userId)
    }

    res.json({
      success: true,
      data: {
        ...balance,
        signupGrant,
        spending,
      },
    })
  }),

  /**
   * Get the user's subscription details and tier configuration.
   */
  getSubscription: catchAsync(async (req, res) => {
    const userId = req.user.id
    const subscription = await subscriptionTierService.getSubscription(userId)
    res.json({
      success: true,
      data: subscription,
    })
  }),

  /**
   * Get available pricing tiers and their configurations.
   * No sensitive data - safe for public display but requires auth.
   */
  getPricingTiers: catchAsync(async (_req, res) => {
    const tiers = SubscriptionTierService.getTierConfig()
    res.json({
      success: true,
      data: { tiers },
    })
  }),

  /**
   * Get active pricing records (provider/model costs).
   */
  getActivePricing: catchAsync(async (_req, res) => {
    const pricing = await pricingEngine.getActivePricing()
    res.json({
      success: true,
      data: { pricing },
    })
  }),

  /**
   * Get credit transaction history for the user.
   */
  getTransactions: catchAsync(async (req, res) => {
    const userId = req.user.id
    const take = parseInt(req.query.take || '50', 10)
    const cursor = req.query.cursor || undefined
    const transactions = await creditAccountingService.getTransactionHistory(
      userId,
      { take, cursor }
    )
    res.json({
      success: true,
      data: { transactions },
    })
  }),

  /**
   * Get LLM usage history for the user.
   */
  getUsage: catchAsync(async (req, res) => {
    const userId = req.user.id
    const take = parseInt(req.query.take || '50', 10)
    const usage = await prisma.lLMUsage.findMany({
      where: { userId },
      take,
      orderBy: { createdAt: 'desc' },
    })
    res.json({
      success: true,
      data: { usage },
    })
  }),

  /**
   * Get credit reservation history.
   */
  getReservations: catchAsync(async (req, res) => {
    const userId = req.user.id
    const take = parseInt(req.query.take || '50', 10)
    const reservations = await creditAccountingService.getReservationHistory(
      userId,
      { take }
    )
    res.json({
      success: true,
      data: { reservations },
    })
  }),

  /**
   * Get spending limits (Business tier only).
   */
  getSpendingLimit: catchAsync(async (req, res) => {
    const userId = req.user.id
    const spending = await subscriptionTierService.getSpendingInfo(userId)
    res.json({
      success: true,
      data: spending,
    })
  }),

  /**
   * Set spending limits (Business tier only).
   */
  setSpendingLimit: catchAsync(async (req, res) => {
    const userId = req.user.id
    const { dailyLimitCents, monthlyLimitCents, alertThresholdCents } =
      req.validatedBody || req.body

    const subscription = await subscriptionTierService.getSubscription(userId)
    if (subscription.tier !== 'BUSINESS') {
      throw new AppError(
        403,
        'INVALID_TIER',
        'Spending limits are only available for Business tier'
      )
    }

    const limit = await subscriptionTierService.setSpendingLimit(userId, {
      dailyLimitCents,
      monthlyLimitCents,
      alertThresholdCents,
    })

    res.json({
      success: true,
      data: limit,
    })
  }),

  /**
   * Report whether payments are configured. Exposes only the public key id,
   * never the secret. Used by the client to show honest "Configuration
   * Required" instead of a fake checkout.
   */
  getPaymentsConfig: catchAsync(async (_req, res) => {
    res.json({
      success: true,
      data: {
        configured: razorpayService.isConfigured(),
        currency: razorpayService.currency,
        keyId: razorpayService.isConfigured() ? razorpayService.keyId : null,
      },
    })
  }),

  /**
   * Create a real Razorpay order for purchasing credits.
   * The amount is derived server-side from the requested credit quantity using
   * the configured INR-per-credit rate. Razorpay processes INR (amount in paise).
   * Credits are allocated only after a verified payment.
   */
  createPurchaseOrder: catchAsync(async (req, res) => {
    const userId = req.user.id
    const { credits } = req.validatedBody || req.body

    if (!credits || credits <= 0) {
      throw new AppError(400, 'INVALID_AMOUNT', 'Credit amount must be positive')
    }

    razorpayService.ensureConfigured()

    const amountPaise = razorpayService.creditsToPaise(credits)
    const receipt = `rcpt_${userId.slice(-10)}_${Date.now()}`

    const order = await razorpayService.createOrder({
      amountPaise,
      receipt,
      notes: { userId, credits: String(credits) },
    })

    const payment = await prisma.payment.create({
      data: {
        userId,
        razorpayOrderId: order.id,
        amount: amountPaise,
        currency: order.currency || razorpayService.currency,
        status: 'PENDING',
        creditsPurchased: credits,
        idempotencyKey: `purchase-${userId}-${order.id}`,
      },
    })

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: amountPaise,
        currency: order.currency || razorpayService.currency,
        keyId: razorpayService.keyId,
        credits,
      },
    })
  }),

  /**
   * Finalize a checkout payment: verify the Razorpay signature, re-check the
   * provider payment against the stored order (amount + currency + status), and
   * allocate credits idempotently from the server-side purchase record.
   */
  verifyPayment: catchAsync(async (req, res) => {
    const userId = req.user.id
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.validatedBody || req.body

    razorpayService.ensureConfigured()

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
    })
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')
    if (payment.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Payment does not belong to this user')
    }

    // Already processed → idempotent success, never allocate twice.
    if (payment.status === 'COMPLETED') {
      const balance = await creditAccountingService.getBalance(userId)
      return res.json({ success: true, data: { ...balance, alreadyProcessed: true } })
    }

    // 1) Verify checkout signature (HMAC-SHA256, constant-time).
    const signatureValid = razorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
    if (!signatureValid) {
      throw new AppError(400, 'SIGNATURE_INVALID', 'Payment signature verification failed')
    }

    // 2) Verify against the provider: amount, currency and status must match.
    const providerPayment = await razorpayService.fetchPayment(razorpayPaymentId)
    if (providerPayment.order_id !== razorpayOrderId) {
      throw new AppError(400, 'ORDER_MISMATCH', 'Payment does not belong to this order')
    }
    if (!['authorized', 'captured'].includes(providerPayment.status)) {
      throw new AppError(400, 'PAYMENT_NOT_SUCCESSFUL', `Payment status is ${providerPayment.status}`)
    }
    if (providerPayment.amount !== payment.amount || (providerPayment.currency || '').toUpperCase() !== payment.currency.toUpperCase()) {
      throw new AppError(400, 'AMOUNT_MISMATCH', 'Payment amount or currency does not match the order')
    }

    // 3) Allocate from the stored server-side credit quantity (never client input).
    const result = await creditAccountingService.purchaseCredits(
      userId,
      payment.creditsPurchased,
      {
        paymentId: payment.id,
        reference: `payment:${payment.id}`,
        description: `Credit purchase: ${payment.creditsPurchased} credits (Razorpay ${razorpayPaymentId})`,
      }
    )

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', razorpayPaymentId, razorpaySignature },
    })

    res.json({ success: true, data: { ...result, paymentId: payment.id } })
  }),

  /**
   * Create a Razorpay order for a Pro subscription purchase.
   * The amount is derived server-side from the configured Pro monthly price.
   * Credits are allocated via webhook after verified payment.
   */
  createSubscriptionOrder: catchAsync(async (req, res) => {
    const userId = req.user.id

    razorpayService.ensureConfigured()

    const tierConfig = SubscriptionTierService.getTierConfig()
    const proConfig = tierConfig.PRO
    if (!proConfig || proConfig.priceCents <= 0) {
      throw new AppError(400, 'INVALID_PRICING', 'Pro subscription pricing is not configured')
    }

    const amountPaise = proConfig.priceCents
    const receipt = `sub_${userId.slice(-10)}_${Date.now()}`

    const order = await razorpayService.createOrder({
      amountPaise,
      receipt,
      notes: { userId, tier: 'PRO', type: 'subscription' },
    })

    const payment = await prisma.payment.create({
      data: {
        userId,
        razorpayOrderId: order.id,
        amount: amountPaise,
        currency: order.currency || razorpayService.currency,
        status: 'PENDING',
        creditsPurchased: 0, // subscription credits allocated via webhook
        idempotencyKey: `subscription-${userId}-${order.id}`,
      },
    })

    res.json({
      success: true,
      data: {
        paymentId: payment.id,
        orderId: order.id,
        amount: amountPaise,
        currency: order.currency || razorpayService.currency,
        keyId: razorpayService.keyId,
        tier: 'PRO',
        priceCents: proConfig.priceCents,
      },
    })
  }),

  /**
   * Verify a subscription payment: verify signature, re-check provider payment.
   */
  verifySubscriptionPayment: catchAsync(async (req, res) => {
    const userId = req.user.id
    const { razorpayOrderId, razorpayPaymentId, razorpaySignature } =
      req.validatedBody || req.body

    razorpayService.ensureConfigured()

    const payment = await prisma.payment.findUnique({
      where: { razorpayOrderId },
    })
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')
    if (payment.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Payment does not belong to this user')
    }

    if (payment.status === 'COMPLETED') {
      const subscription = await subscriptionTierService.getSubscription(userId)
      return res.json({ success: true, data: { ...subscription, alreadyProcessed: true } })
    }

    // Verify checkout signature
    const signatureValid = razorpayService.verifyPaymentSignature({
      orderId: razorpayOrderId,
      paymentId: razorpayPaymentId,
      signature: razorpaySignature,
    })
    if (!signatureValid) {
      throw new AppError(400, 'SIGNATURE_INVALID', 'Payment signature verification failed')
    }

    // Verify against provider
    const providerPayment = await razorpayService.fetchPayment(razorpayPaymentId)
    if (providerPayment.order_id !== razorpayOrderId) {
      throw new AppError(400, 'ORDER_MISMATCH', 'Payment does not belong to this order')
    }
    if (!['authorized', 'captured'].includes(providerPayment.status)) {
      throw new AppError(400, 'PAYMENT_NOT_SUCCESSFUL', `Payment status is ${providerPayment.status}`)
    }
    if (providerPayment.amount !== payment.amount || (providerPayment.currency || '').toUpperCase() !== payment.currency.toUpperCase()) {
      throw new AppError(400, 'AMOUNT_MISMATCH', 'Payment amount or currency does not match the order')
    }

    // Update payment as completed; webhook will handle subscription activation
    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'COMPLETED', razorpayPaymentId, razorpaySignature },
    })

    res.json({ success: true, data: { paymentId: payment.id, status: 'completed' } })
  }),

  /**
   * Cancel subscription at period end.
   */
  cancelSubscription: catchAsync(async (req, res) => {
    const userId = req.user.id

    const result = await subscriptionTierService.cancelSubscription(userId)
    res.json({ success: true, data: result })
  }),

  /**
   * Get payment history for the user.
   */
  getPaymentHistory: catchAsync(async (req, res) => {
    const userId = req.user.id
    const take = parseInt(req.query.take || '50', 10)
    const cursor = req.query.cursor || undefined

    const payments = await prisma.payment.findMany({
      where: { userId },
      take,
      cursor: cursor ? { id: cursor } : undefined,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        razorpayOrderId: true,
        razorpayPaymentId: true,
        amount: true,
        currency: true,
        status: true,
        creditsPurchased: true,
        idempotencyKey: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    res.json({
      success: true,
      data: { payments, take, cursor },
    })
  }),

  /**
   * Refund a completed payment (Razorpay refund API).
   * Refunds are recorded as credit adjustments.
   */
  refundPayment: catchAsync(async (req, res) => {
    const userId = req.user.id
    const { paymentId } = req.validatedBody || req.body

    razorpayService.ensureConfigured()

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
    })
    if (!payment) throw new AppError(404, 'PAYMENT_NOT_FOUND', 'Payment not found')
    if (payment.userId !== userId) {
      throw new AppError(403, 'FORBIDDEN', 'Payment does not belong to this user')
    }
    if (payment.status !== 'COMPLETED') {
      throw new AppError(400, 'PAYMENT_NOT_COMPLETED', 'Only completed payments can be refunded')
    }
    if (!payment.razorpayPaymentId) {
      throw new AppError(400, 'NO_PAYMENT_ID', 'No Razorpay payment ID on record')
    }

    const refund = await razorpayService._request('POST', '/refunds', {
      payment_id: payment.razorpayPaymentId,
      amount: payment.amount,
      currency: payment.currency,
      receipt: `refund_${userId.slice(-10)}_${Date.now()}`,
      notes: { paymentId: payment.id, userId },
    })

    // Record refund as a credit adjustment
    await creditAccountingService.refundCredits(userId, payment.creditsPurchased, {
      reference: `refund:${refund.id}`,
      description: `Refund for payment ${payment.id} (${payment.creditsPurchased} credits)`,
    })

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: 'REFUNDED', razorpaySignature: payment.razorpaySignature },
    })

    res.json({
      success: true,
      data: {
        refundId: refund.id,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        creditsRefunded: payment.creditsPurchased,
      },
    })
  }),

  /**
   * Payment webhook handler (raw body, signature verified).
   * Deduplicated via the x-razorpay-event-id header. Credits are only allocated
   * when the webhook payload matches a stored order (amount + currency).
   */
  handleWebhook: catchAsync(async (req, res) => {
    const signature = req.headers['x-razorpay-signature']
    const eventId = req.headers['x-razorpay-event-id']

    // req.body is a Buffer here (raw body middleware mounted in app.js).
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '')
    if (!rawBody.length) {
      throw new AppError(400, 'EMPTY_WEBHOOK', 'Empty webhook body')
    }
    if (!razorpayService.verifyWebhookSignature(rawBody, signature)) {
      throw new AppError(401, 'WEBHOOK_SIGNATURE_INVALID', 'Invalid webhook signature')
    }

    let payload
    try {
      payload = JSON.parse(rawBody.toString('utf8'))
    } catch {
      throw new AppError(400, 'INVALID_JSON', 'Webhook body is not valid JSON')
    }

    const dedupeId = eventId || payload?.event_id || null
    if (dedupeId) {
      const existing = await prisma.webhookEvent.findUnique({ where: { eventId: dedupeId } })
      if (existing?.status === 'PROCESSED') {
        return res.json({ success: true, message: 'Already processed' })
      }
      await prisma.webhookEvent.upsert({
        where: { eventId: dedupeId },
        update: { status: 'PROCESSING' },
        create: { provider: 'razorpay', eventId: dedupeId, status: 'PROCESSING', payload },
      })
    }

    try {
      const event = payload?.event

      if (event === 'payment.captured' || event === 'order.paid') {
        const entity = payload?.payload?.payment?.entity
        const orderId = entity?.order_id
        const razorpayPaymentId = entity?.id
        const amount = entity?.amount
        const currency = (entity?.currency || '').toUpperCase()

        const payment = orderId
          ? await prisma.payment.findUnique({ where: { razorpayOrderId: orderId } })
          : null

        if (payment) {
          if (amount !== payment.amount || currency !== payment.currency.toUpperCase()) {
            throw new AppError(400, 'AMOUNT_MISMATCH', 'Webhook amount/currency does not match order')
          }
          await creditAccountingService.purchaseCredits(
            payment.userId,
            payment.creditsPurchased,
            {
              paymentId: payment.id,
              reference: `payment:${payment.id}`,
              description: `Credit purchase via webhook: ${payment.creditsPurchased} credits`,
            }
          )
          await prisma.payment.update({
            where: { id: payment.id },
            data: { status: 'COMPLETED', razorpayPaymentId },
          })
        }
      } else if (event === 'payment.failed') {
        const entity = payload?.payload?.payment?.entity
        if (entity?.order_id) {
          await prisma.payment.updateMany({
            where: { razorpayOrderId: entity.order_id, status: 'PENDING' },
            data: { status: 'FAILED' },
          })
        }
      } else if (event === 'subscription.activated') {
        const entity = payload?.payload?.subscription?.entity
        const subscriptionId = entity?.id
        const planId = entity?.plan_id
        const currentStart = entity?.current_start
        const currentEnd = entity?.current_end

        // Subscription activation webhook does not include an order_id, so we
        // locate the pending subscription payment by its stored order reference.
        // This is a one-time lookup per subscription; after activation we store
        // razorpaySubscriptionId on the payment so renewed/cancelled webhooks
        // are fully user-scoped.
        const payment = await prisma.payment.findFirst({
          where: {
            userId: { not: null },
            razorpayOrderId: { not: null },
            status: 'COMPLETED',
            notes: { path: ['type'], equals: 'subscription' },
            razorpaySubscriptionId: null,
          },
          orderBy: { createdAt: 'desc' },
        })

        // Map subscription to user via payment record
        if (payment && currentStart && currentEnd) {
          await subscriptionTierService.activateProSubscription(
            payment.userId,
            new Date(currentStart * 1000),
            new Date(currentEnd * 1000),
            subscriptionId
          )
          await prisma.payment.update({
            where: { id: payment.id },
            data: { razorpaySubscriptionId: subscriptionId },
          })
        }
      } else if (event === 'subscription.renewed') {
        const entity = payload?.payload?.subscription?.entity
        const currentStart = entity?.current_start
        const currentEnd = entity?.current_end

        const payment = await prisma.payment.findFirst({
          where: {
            razorpaySubscriptionId: entity?.id,
            status: 'COMPLETED',
          },
          orderBy: { createdAt: 'desc' },
        })

        if (payment && currentStart && currentEnd) {
          await subscriptionTierService.renewSubscription(
            payment.userId,
            new Date(currentStart * 1000),
            new Date(currentEnd * 1000)
          )
        }
      } else if (event === 'subscription.cancelled') {
        const entity = payload?.payload?.subscription?.entity
        const subscriptionId = entity?.id
        const cancelAtPeriodEnd = entity?.cancel_at_period_end

        await prisma.subscription.updateMany({
          where: { razorpaySubscriptionId: subscriptionId },
          data: {
            cancelAtPeriodEnd: cancelAtPeriodEnd ?? true,
            status: cancelAtPeriodEnd ? 'cancelling' : 'cancelled',
          },
        })
      }

      if (dedupeId) {
        await prisma.webhookEvent.update({
          where: { eventId: dedupeId },
          data: { status: 'PROCESSED', processedAt: new Date() },
        })
      }
      res.json({ success: true })
    } catch (error) {
      if (dedupeId) {
        await prisma.webhookEvent
          .update({ where: { eventId: dedupeId }, data: { status: 'FAILED', error: error.message } })
          .catch(() => {})
      }
      throw error
    }
  }),
}

export default billingController
