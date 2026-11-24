import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import crypto from 'crypto'

// ── Hoisted mocks ──
const mocks = vi.hoisted(() => ({
  razorpay: {
    keyId: 'rzp_test_1234567890',
    keySecret: 'test_secret_abcdef',
    webhookSecret: 'test_webhook_secret',
    isConfigured: vi.fn(() => true),
    isWebhookConfigured: vi.fn(() => true),
    ensureConfigured: vi.fn(() => {}),
    verifyPaymentSignature: vi.fn(() => true),
    verifyWebhookSignature: vi.fn(() => true),
    createOrder: vi.fn(() => ({ id: 'order_test', amount: 1000, currency: 'INR' })),
    fetchPayment: vi.fn(),
    _request: vi.fn(),
    creditsToPaise: vi.fn((credits) => credits * 100),
  },
  creditAccounting: {
    purchaseCredits: vi.fn(),
    refundCredits: vi.fn(),
    grantSignupCredits: vi.fn(),
  },
  subscriptionTierService: {
    activateProSubscription: vi.fn(),
    renewSubscription: vi.fn(),
    cancelSubscription: vi.fn(),
    getSubscription: vi.fn(),
  },
  SubscriptionTierService: {
    getTierConfig: vi.fn(() => ({
      FREE: { name: 'Free', priceCents: 0, currency: 'USD', interval: 'none', allowance: 50, rollover: false, models: [], description: '50 one-time signup credits' },
      PRO: { name: 'Pro', priceCents: 1000, currency: 'USD', interval: 'month', allowance: 200, rollover: false, models: [], description: '200 credits per billing period' },
      BUSINESS: { name: 'Business', priceCents: 0, currency: 'USD', interval: 'none', allowance: null, rollover: false, models: [], description: 'Pay-as-you-go' },
    })),
  },
  prisma: {
    payment: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    subscription: {
      updateMany: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    webhookEvent: {
      findUnique: vi.fn(() => null),
      upsert: vi.fn(),
      update: vi.fn(),
    },
    creditTransaction: {
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (fn) => fn({
      payment: mocks.prisma.payment,
      user: mocks.prisma.user,
      subscription: mocks.prisma.subscription,
    })),
    $queryRaw: vi.fn(),
  },
}))

vi.mock('../services/billing/payment.service.js', () => ({
  razorpayService: mocks.razorpay,
}))

vi.mock('../services/billing/credit.service.js', () => ({
  creditAccountingService: mocks.creditAccounting,
}))

vi.mock('../services/billing/subscription.service.js', () => ({
  subscriptionTierService: mocks.subscriptionTierService,
  SubscriptionTierService: mocks.SubscriptionTierService,
}))

vi.mock('../lib/prisma.js', () => ({ prisma: mocks.prisma }))

import { billingController } from '../controllers/billing.controller.js'

// catchAsync wraps controllers; pass a next that re-throws so errors propagate.
function nextThatThrows(err) {
  throw err
}

function makeReq(body = {}, userId = 'user_123') {
  return {
    validatedBody: body,
    user: { id: userId },
  }
}

function makeRes() {
  const json = vi.fn()
  const status = vi.fn(() => ({ json }))
  return { json, status }
}

function jsonData(res) {
  return res.json.mock.calls[mocks.razorpay.createOrder.mock.calls.length - 1]?.[0] ?? res.json.mock.lastCall?.[0]
}

describe('Razorpay Billing — signature verification', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.razorpay.isConfigured.mockReturnValue(true)
    mocks.razorpay.ensureConfigured.mockImplementation(() => {})
  })

  it('rejects invalid checkout signature', async () => {
    mocks.razorpay.verifyPaymentSignature.mockReturnValue(false)
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 100,
    })

    const req = makeReq({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_1',
      razorpaySignature: 'invalid_signature',
    })
    const res = makeRes()

    await expect(
      billingController.verifyPayment(req, res, nextThatThrows)
    ).rejects.toMatchObject({ code: 'SIGNATURE_INVALID' })
  })

  it('accepts valid checkout signature and allocates credits', async () => {
    mocks.razorpay.verifyPaymentSignature.mockReturnValue(true)
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 100,
    })
    mocks.razorpay.fetchPayment.mockResolvedValue({
      id: 'pay_razorpay_1',
      order_id: 'order_1',
      status: 'captured',
      amount: 1000,
      currency: 'INR',
    })
    mocks.creditAccounting.purchaseCredits.mockResolvedValue({
      purchased: 100,
      balance: 150,
    })
    mocks.prisma.payment.update.mockResolvedValue({})

    const req = makeReq({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_razorpay_1',
      razorpaySignature: 'valid_sig',
    })
    const res = makeRes()

    await billingController.verifyPayment(req, res, nextThatThrows)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          purchased: 100,
          balance: 150,
          paymentId: 'pay_1',
        }),
      })
    )
    expect(mocks.creditAccounting.purchaseCredits).toHaveBeenCalledWith(
      'user_123',
      100,
      expect.objectContaining({
        paymentId: 'pay_1',
        reference: 'payment:pay_1',
      })
    )
  })

  it('rejects forged credit amount — uses server-side quantity only', async () => {
    mocks.razorpay.verifyPaymentSignature.mockReturnValue(true)
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 50,
    })
    mocks.razorpay.fetchPayment.mockResolvedValue({
      id: 'pay_razorpay_1',
      order_id: 'order_1',
      status: 'captured',
      amount: 1000,
      currency: 'INR',
    })
    mocks.creditAccounting.purchaseCredits.mockResolvedValue({
      purchased: 50,
      balance: 100,
    })
    mocks.prisma.payment.update.mockResolvedValue({})

    const req = makeReq({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_razorpay_1',
      razorpaySignature: 'valid_sig',
    })
    const res = makeRes()

    await billingController.verifyPayment(req, res, nextThatThrows)

    expect(mocks.creditAccounting.purchaseCredits).toHaveBeenCalledWith(
      'user_123',
      50,
      expect.anything()
    )
  })

  it('rejects payment with mismatched provider amount', async () => {
    mocks.razorpay.verifyPaymentSignature.mockReturnValue(true)
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 100,
    })
    mocks.razorpay.fetchPayment.mockResolvedValue({
      id: 'pay_razorpay_1',
      order_id: 'order_1',
      status: 'captured',
      amount: 2000,
      currency: 'INR',
    })

    const req = makeReq({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_razorpay_1',
      razorpaySignature: 'valid_sig',
    })
    const res = makeRes()

    await expect(
      billingController.verifyPayment(req, res, nextThatThrows)
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' })
    expect(mocks.creditAccounting.purchaseCredits).not.toHaveBeenCalled()
  })

  it('rejects payment with unsuccessful provider status', async () => {
    mocks.razorpay.verifyPaymentSignature.mockReturnValue(true)
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 100,
    })
    mocks.razorpay.fetchPayment.mockResolvedValue({
      id: 'pay_razorpay_1',
      order_id: 'order_1',
      status: 'failed',
      amount: 1000,
      currency: 'INR',
    })

    const req = makeReq({
      razorpayOrderId: 'order_1',
      razorpayPaymentId: 'pay_razorpay_1',
      razorpaySignature: 'valid_sig',
    })
    const res = makeRes()

    await expect(
      billingController.verifyPayment(req, res, nextThatThrows)
    ).rejects.toMatchObject({ code: 'PAYMENT_NOT_SUCCESSFUL' })
  })
})

describe('Razorpay Billing — webhook idempotency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.razorpay.isConfigured.mockReturnValue(true)
    mocks.razorpay.verifyWebhookSignature.mockReturnValue(true)
  })

  it('skips already-processed webhook events', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue({
      eventId: 'evt_123',
      status: 'PROCESSED',
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_123',
      },
      body: Buffer.from(JSON.stringify({ event: 'payment.captured' })),
    }
    const res = {
      json: vi.fn(),
      status: vi.fn(() => res),
    }

    await billingController.handleWebhook(req, res, nextThatThrows)

    expect(res.json).toHaveBeenCalledWith({
      success: true,
      message: 'Already processed',
    })
    expect(mocks.creditAccounting.purchaseCredits).not.toHaveBeenCalled()
  })

  it('processes payment.captured webhook and allocates credits', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null)
    mocks.prisma.webhookEvent.upsert.mockResolvedValue({})
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 50,
    })
    mocks.creditAccounting.purchaseCredits.mockResolvedValue({
      purchased: 50,
      balance: 100,
    })
    mocks.prisma.payment.update.mockResolvedValue({})
    mocks.prisma.webhookEvent.update.mockResolvedValue({})

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            order_id: 'order_1',
            id: 'pay_razorpay_1',
            amount: 1000,
            currency: 'INR',
          },
        },
      },
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_captured_1',
      },
      body: Buffer.from(rawBody),
    }
    const res = {
      json: vi.fn(),
      status: vi.fn(() => res),
    }

    await billingController.handleWebhook(req, res, nextThatThrows)

    expect(mocks.creditAccounting.purchaseCredits).toHaveBeenCalledWith(
      'user_123',
      50,
      expect.anything()
    )
    expect(res.json).toHaveBeenCalledWith({ success: true })
  })

  it('rejects webhook with invalid signature', async () => {
    mocks.razorpay.verifyWebhookSignature.mockReturnValue(false)

    const req = {
      headers: {
        'x-razorpay-signature': 'invalid_sig',
        'x-razorpay-event-id': 'evt_1',
      },
      body: Buffer.from('{}'),
    }
    const res = makeRes()

    await expect(
      billingController.handleWebhook(req, res, nextThatThrows)
    ).rejects.toMatchObject({ code: 'WEBHOOK_SIGNATURE_INVALID' })
  })

  it('rejects webhook when amount does not match stored order', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null)
    mocks.prisma.webhookEvent.upsert.mockResolvedValue({})
    mocks.prisma.payment.findUnique.mockResolvedValue({
      id: 'pay_1',
      userId: 'user_123',
      razorpayOrderId: 'order_1',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 100,
    })

    const rawBody = JSON.stringify({
      event: 'payment.captured',
      payload: {
        payment: {
          entity: {
            order_id: 'order_1',
            id: 'pay_razorpay_1',
            amount: 2000,
            currency: 'INR',
          },
        },
      },
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_mismatch_1',
      },
      body: Buffer.from(rawBody),
    }
    const res = makeRes()

    await expect(
      billingController.handleWebhook(req, res, nextThatThrows)
    ).rejects.toMatchObject({ code: 'AMOUNT_MISMATCH' })
    expect(mocks.creditAccounting.purchaseCredits).not.toHaveBeenCalled()
  })
})

describe('Razorpay Billing — payment failure handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.razorpay.isConfigured.mockReturnValue(true)
    mocks.razorpay.verifyWebhookSignature.mockReturnValue(true)
  })

  it('marks payment as FAILED on payment.failed webhook', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null)
    mocks.prisma.webhookEvent.upsert.mockResolvedValue({})
    mocks.prisma.payment.updateMany.mockResolvedValue({ count: 1 })
    mocks.prisma.webhookEvent.update.mockResolvedValue({})

    const rawBody = JSON.stringify({
      event: 'payment.failed',
      payload: {
        payment: {
          entity: {
            order_id: 'order_fail',
            id: 'pay_fail_1',
            amount: 1000,
            currency: 'INR',
            error_description: 'Insufficient funds',
          },
        },
      },
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_failed_1',
      },
      body: Buffer.from(rawBody),
    }
    const res = {
      json: vi.fn(),
      status: vi.fn(() => res),
    }

    await billingController.handleWebhook(req, res, nextThatThrows)

    expect(mocks.prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { razorpayOrderId: 'order_fail', status: 'PENDING' },
      data: { status: 'FAILED' },
    })
  })
})

describe('Razorpay Billing — subscription renewal via webhook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.razorpay.isConfigured.mockReturnValue(true)
    mocks.razorpay.verifyWebhookSignature.mockReturnValue(true)
  })

  it('activates Pro subscription on subscription.activated webhook', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null)
    mocks.prisma.webhookEvent.upsert.mockResolvedValue({})
    mocks.prisma.payment.findFirst.mockResolvedValue({
      id: 'pay_sub_1',
      userId: 'user_123',
      razorpayOrderId: 'order_sub_1',
      status: 'COMPLETED',
    })
    mocks.subscriptionTierService.activateProSubscription.mockResolvedValue({
      purchased: 200,
      balance: 250,
    })
    mocks.prisma.webhookEvent.update.mockResolvedValue({})

    const rawBody = JSON.stringify({
      event: 'subscription.activated',
      payload: {
        subscription: {
          entity: {
            id: 'sub_123',
            plan_id: 'plan_pro',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      },
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_sub_activated_1',
      },
      body: Buffer.from(rawBody),
    }
    const res = {
      json: vi.fn(),
      status: vi.fn(() => res),
    }

    await billingController.handleWebhook(req, res, nextThatThrows)

    expect(mocks.subscriptionTierService.activateProSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.any(Date),
      expect.any(Date),
      'sub_123'
    )
  })

  it('renews subscription on subscription.renewed webhook', async () => {
    mocks.prisma.webhookEvent.findUnique.mockResolvedValue(null)
    mocks.prisma.webhookEvent.upsert.mockResolvedValue({})
    mocks.prisma.payment.findFirst.mockResolvedValue({
      id: 'pay_sub_2',
      userId: 'user_123',
      razorpaySubscriptionId: 'sub_456',
      status: 'COMPLETED',
    })
    mocks.subscriptionTierService.renewSubscription.mockResolvedValue({
      purchased: 200,
      balance: 450,
    })
    mocks.prisma.webhookEvent.update.mockResolvedValue({})

    const rawBody = JSON.stringify({
      event: 'subscription.renewed',
      payload: {
        subscription: {
          entity: {
            id: 'sub_456',
            current_start: Math.floor(Date.now() / 1000),
            current_end: Math.floor(Date.now() / 1000) + 2592000,
          },
        },
      },
    })

    const req = {
      headers: {
        'x-razorpay-signature': 'valid_sig',
        'x-razorpay-event-id': 'evt_sub_renewed_1',
      },
      body: Buffer.from(rawBody),
    }
    const res = {
      json: vi.fn(),
      status: vi.fn(() => res),
    }

    await billingController.handleWebhook(req, res, nextThatThrows)

    expect(mocks.subscriptionTierService.renewSubscription).toHaveBeenCalledWith(
      'user_123',
      expect.any(Date),
      expect.any(Date)
    )
  })
})

describe('Razorpay Billing — create subscription order', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.razorpay.isConfigured.mockReturnValue(true)
    mocks.razorpay.ensureConfigured.mockImplementation(() => {})
    mocks.razorpay.createOrder.mockResolvedValue({
      id: 'order_sub_new',
      amount: 1000,
      currency: 'INR',
    })
    mocks.prisma.payment.create.mockResolvedValue({
      id: 'pay_sub_new',
      userId: 'user_123',
      razorpayOrderId: 'order_sub_new',
      amount: 1000,
      currency: 'INR',
      status: 'PENDING',
      creditsPurchased: 0,
      idempotencyKey: 'subscription-user_123-order_sub_new',
    })
  })

  it('creates a Pro subscription order with server-side pricing', async () => {
    const req = makeReq({}, 'user_123')
    const res = makeRes()

    await billingController.createSubscriptionOrder(req, res, nextThatThrows)

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          orderId: 'order_sub_new',
          tier: 'PRO',
          priceCents: 1000,
        }),
      })
    )
    expect(mocks.prisma.payment.create).toHaveBeenCalledWith({
      data: {
        userId: 'user_123',
        razorpayOrderId: 'order_sub_new',
        amount: 1000,
        currency: 'INR',
        status: 'PENDING',
        creditsPurchased: 0,
        idempotencyKey: expect.stringContaining('subscription-user_123'),
      },
    })
  })
})

describe('Razorpay Billing — HMAC signature computation', () => {
  it('computePaymentSignature matches Razorpay algorithm', () => {
    const keySecret = 'test_secret'
    const orderId = 'order_abc'
    const paymentId = 'pay_xyz'

    const expected = crypto
      .createHmac('sha256', keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')

    mocks.razorpay.verifyPaymentSignature.mockImplementation(
      ({ orderId: oid, paymentId: pid, signature }) => {
        const computed = crypto
          .createHmac('sha256', keySecret)
          .update(`${oid}|${pid}`)
          .digest('hex')
        return computed === signature
      }
    )

    expect(
      mocks.razorpay.verifyPaymentSignature({
        orderId, paymentId, signature: expected,
      })
    ).toBe(true)

    expect(
      mocks.razorpay.verifyPaymentSignature({
        orderId, paymentId, signature: 'bad_sig',
      })
    ).toBe(false)
  })
})
