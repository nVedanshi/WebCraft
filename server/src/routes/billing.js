import { Router } from 'express'
import { billingController } from '../controllers/billing.controller.js'
import { protect } from '../middleware/auth.js'
import { validate } from '../middleware/validation.js'
import { z } from 'zod'

const router = Router()

// All billing routes require authentication
router.get('/balance', protect, billingController.getBalance)
router.get('/subscription', protect, billingController.getSubscription)
router.get('/pricing-tiers', protect, billingController.getPricingTiers)
router.get('/pricing', protect, billingController.getActivePricing)
router.get('/transactions', protect, billingController.getTransactions)
router.get('/payment-history', protect, billingController.getPaymentHistory)
router.get('/usage', protect, billingController.getUsage)
router.get('/reservations', protect, billingController.getReservations)
router.get('/spending-limit', protect, billingController.getSpendingLimit)
router.get('/payments-config', protect, billingController.getPaymentsConfig)

const spendingLimitSchema = z.object({
  dailyLimitCents: z.number().int().nonnegative().optional(),
  monthlyLimitCents: z.number().int().nonnegative().optional(),
  alertThresholdCents: z.number().int().nonnegative().optional(),
})
router.post(
  '/spending-limit',
  protect,
  validate({ body: spendingLimitSchema }),
  billingController.setSpendingLimit
)

const purchaseSchema = z.object({
  credits: z.number().int().positive('Credits must be positive'),
})
router.post(
  '/purchase',
  protect,
  validate({ body: purchaseSchema }),
  billingController.createPurchaseOrder
)

const subscriptionOrderSchema = z.object({})
router.post(
  '/subscription',
  protect,
  validate({ body: subscriptionOrderSchema }),
  billingController.createSubscriptionOrder
)

const verifySubscriptionSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})
router.post(
  '/verify-subscription',
  protect,
  validate({ body: verifySubscriptionSchema }),
  billingController.verifySubscriptionPayment
)

router.post(
  '/cancel-subscription',
  protect,
  validate({ body: subscriptionOrderSchema }),
  billingController.cancelSubscription
)

const refundSchema = z.object({
  paymentId: z.string().min(1),
})
router.post(
  '/refund',
  protect,
  validate({ body: refundSchema }),
  billingController.refundPayment
)

const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
})
router.post(
  '/verify-payment',
  protect,
  validate({ body: verifyPaymentSchema }),
  billingController.verifyPayment
)

// Webhook uses the raw body (mounted in app.js) and verifies the Razorpay
// signature itself. No zod body validation here because req.body is a Buffer.
router.post('/webhook', billingController.handleWebhook)

export default router
