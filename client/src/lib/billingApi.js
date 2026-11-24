/**
 * Billing API client for WebCraft.
 *
 * Wraps the axios-based `api` client with billing-specific endpoints:
 *   - GET  /billing/balance         - credit balance & tier
 *   - GET  /billing/subscription    - subscription details
 *   - GET  /billing/pricing-tiers   - available subscription tiers
 *   - GET  /billing/pricing         - active pricing models
 *   - GET  /billing/transactions    - credit transaction history
 *   - GET  /billing/usage           - LLM usage history
 *   - GET  /billing/reservations  - credit reservation history
 *   - GET  /billing/spending-limit  - current spending limits
 *   - POST /billing/spending-limit  - set spending limits (Business)
 *   - POST /billing/purchase        - create credit purchase order
 *   - POST /billing/verify-payment  - verify payment & allocate credits
 *   - POST /billing/webhook         - payment webhook (no auth)
 */
import { api } from './api.js'

export const billingApi = {
  getBalance: () => api.get('/billing/balance'),
  getSubscription: () => api.get('/billing/subscription'),
  getPricingTiers: () => api.get('/billing/pricing-tiers'),
  getPricing: () => api.get('/billing/pricing'),
  getTransactions: (params) => api.get('/billing/transactions', { params }),
  getUsage: (params) => api.get('/billing/usage', { params }),
  getReservations: (params) => api.get('/billing/reservations', { params }),
  getSpendingLimit: () => api.get('/billing/spending-limit'),
  setSpendingLimit: (payload) => api.post('/billing/spending-limit', payload),
  getPaymentsConfig: () => api.get('/billing/payments-config'),
  createPurchaseOrder: (payload) => api.post('/billing/purchase', payload),
  verifyPayment: (payload) => api.post('/billing/verify-payment', payload),
  createSubscriptionOrder: () => api.post('/billing/subscription'),
  verifySubscriptionPayment: (payload) => api.post('/billing/verify-subscription', payload),
  cancelSubscription: () => api.post('/billing/cancel-subscription'),
  getPaymentHistory: (params) => api.get('/billing/payment-history', { params }),
  refundPayment: (payload) => api.post('/billing/refund', payload),
}

export default billingApi
