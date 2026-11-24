import crypto from 'crypto'
import { AppError } from '../../middleware/error.js'

/**
 * RazorpayService — real Razorpay server-side integration.
 *
 * Security model (do not weaken):
 *   - Orders are created on the server with the amount derived from the
 *     server-side credit quantity. The client never supplies an authoritative
 *     amount or credit quantity.
 *   - Payment signatures are verified with HMAC-SHA256 over
 *     `${orderId}|${paymentId}` using the key secret, compared in constant time.
 *   - Webhooks are verified against the raw request body using the webhook
 *     secret.
 *   - Credit allocation only happens from a verified, server-stored Payment
 *     record whose amount/currency/status are re-checked.
 *
 * Currency model: Razorpay processes INR. All amounts are in paise (INR * 100).
 * There is no implicit INR→USD relabelling anywhere.
 */

const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1'

function env(key) {
  return process.env[key] || ''
}

/** Treat empty or obvious placeholder values as "not configured". */
function isRealSecret(value) {
  if (!value) return false
  const v = String(value).trim().toLowerCase()
  if (!v) return false
  if (v.startsWith('your_') || v.includes('replace') || v.includes('placeholder') || v === 'changeme') {
    return false
  }
  return true
}

export class RazorpayService {
  get keyId() {
    return env('RAZORPAY_KEY_ID')
  }
  get keySecret() {
    return env('RAZORPAY_KEY_SECRET')
  }
  get webhookSecret() {
    return env('RAZORPAY_WEBHOOK_SECRET')
  }
  get currency() {
    return env('RAZORPAY_CURRENCY') || 'INR'
  }

  /** Credits → paise using the configured INR-per-credit rate. */
  creditsToPaise(credits) {
    const inrPerCredit = parseFloat(env('INR_PER_CREDIT') || '1')
    if (!Number.isFinite(inrPerCredit) || inrPerCredit <= 0) {
      throw new AppError(500, 'PRICING_MISCONFIGURED', 'INR_PER_CREDIT is invalid')
    }
    return Math.round(credits * inrPerCredit * 100)
  }

  isConfigured() {
    return isRealSecret(this.keyId) && isRealSecret(this.keySecret)
  }
  isWebhookConfigured() {
    return isRealSecret(this.webhookSecret)
  }

  ensureConfigured() {
    if (!this.isConfigured()) {
      throw new AppError(
        503,
        'PAYMENTS_NOT_CONFIGURED',
        'Razorpay is not configured. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET to enable payments.'
      )
    }
  }

  _authHeader() {
    return (
      'Basic ' +
      Buffer.from(`${this.keyId}:${this.keySecret}`).toString('base64')
    )
  }

  async _request(method, path, body) {
    const res = await fetch(`${RAZORPAY_API_BASE}${path}`, {
      method,
      headers: {
        Authorization: this._authHeader(),
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await res.text()
    let data
    try {
      data = text ? JSON.parse(text) : {}
    } catch {
      data = { raw: text }
    }
    if (!res.ok) {
      const message =
        data?.error?.description || data?.error?.reason || `Razorpay ${res.status}`
      throw new AppError(502, 'PAYMENT_PROVIDER_ERROR', `Razorpay error: ${message}`)
    }
    return data
  }

  /**
   * Create a real Razorpay order (INR/paise). Returns the provider order object.
   */
  async createOrder({ amountPaise, receipt, notes }) {
    this.ensureConfigured()
    return this._request('POST', '/orders', {
      amount: amountPaise,
      currency: this.currency,
      receipt,
      notes,
      payment_capture: 1,
    })
  }

  async fetchPayment(paymentId) {
    this.ensureConfigured()
    return this._request('GET', `/payments/${encodeURIComponent(paymentId)}`)
  }

  /**
   * Verify checkout signature: HMAC_SHA256(`${orderId}|${paymentId}`, keySecret).
   */
  verifyPaymentSignature({ orderId, paymentId, signature }) {
    this.ensureConfigured()
    if (!orderId || !paymentId || !signature) return false
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex')
    return safeEqualHex(expected, signature)
  }

  /**
   * Verify a webhook signature against the RAW body.
   */
  verifyWebhookSignature(rawBody, signature) {
    if (!this.webhookSecret) return false
    if (!rawBody || !signature) return false
    const expected = crypto
      .createHmac('sha256', this.webhookSecret)
      .update(rawBody)
      .digest('hex')
    return safeEqualHex(expected, signature)
  }
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return crypto.timingSafeEqual(bufA, bufB)
}

export const razorpayService = new RazorpayService()
export default RazorpayService
