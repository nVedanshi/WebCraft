import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Zap, Check, AlertTriangle, RefreshCw, Lock, CreditCard,
  Repeat, Trash2, ChevronRight, Clock, Wallet, FileText,
} from 'lucide-react'
import { billingApi } from '../lib/billingApi.js'
import { integrationsApi } from '../lib/integrationsApi.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Spinner.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'
import { ConfirmDialog } from '../components/ui/Dialog.jsx'

function loadRazorpayScript() {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export function BillingPage() {
  const [balance, setBalance] = useState(null)
  const [subscription, setSubscription] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [payments, setPayments] = useState([])
  const [tiers, setTiers] = useState(null)
  const [paymentsConfig, setPaymentsConfig] = useState(null)
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [purchaseCredits, setPurchaseCredits] = useState(100)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState(false)
  const [refundPaymentId, setRefundPaymentId] = useState(null)
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false)
  const [refundDialogOpen, setRefundDialogOpen] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bRes, sRes, tRes, pRes, tierRes, cfgRes, provRes] = await Promise.allSettled([
        billingApi.getBalance(),
        billingApi.getSubscription(),
        billingApi.getTransactions({ take: 20 }),
        billingApi.getPaymentHistory({ take: 20 }),
        billingApi.getPricingTiers(),
        billingApi.getPaymentsConfig(),
        integrationsApi.getProviders(),
      ])
      if (bRes.status === 'fulfilled') {
        setBalance(bRes.value.data.data)
      } else {
        const msg = bRes.reason?.response?.data?.error?.message
          || bRes.reason?.message
          || 'Unable to load balance'
        setError(msg)
        console.error('[Billing] getBalance failed:', bRes.reason)
      }
      if (sRes.status === 'fulfilled') setSubscription(sRes.value.data.data)
      if (tRes.status === 'fulfilled') setTransactions(tRes.value.data.data.transactions || [])
      if (pRes.status === 'fulfilled') setPayments(pRes.value.data.data.payments || [])
      if (tierRes.status === 'fulfilled') setTiers(tierRes.value.data.data.tiers)
      if (cfgRes.status === 'fulfilled') setPaymentsConfig(cfgRes.value.data.data)
      if (provRes.status === 'fulfilled') {
        const provs = provRes.value.data.data.providers
        setProviders(provs)
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message || err?.message || 'Unable to load balance'
      setError(msg)
      console.error('[Billing] loadData error:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function handlePurchaseCredits(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!paymentsConfig?.configured) {
      setError('Payments are not configured on this deployment.')
      return
    }
    setBusy(true)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('Unable to load Razorpay checkout.')

      const orderRes = await billingApi.createPurchaseOrder({ credits: purchaseCredits })
      const order = orderRes.data.data

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'WebCraft',
        description: `${purchaseCredits} credits`,
        handler: async (response) => {
          try {
            await billingApi.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setNotice('Payment verified. Credits added to your balance.')
            await loadData()
          } catch (err) {
            setError(err?.response?.data?.error?.message || 'Payment verification failed')
          }
        },
      })
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Payment failed')
      })
      rzp.open()
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleSubscribePro(e) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (!paymentsConfig?.configured) {
      setError('Payments are not configured on this deployment.')
      return
    }
    setBusy(true)
    try {
      const ok = await loadRazorpayScript()
      if (!ok) throw new Error('Unable to load Razorpay checkout.')

      const orderRes = await billingApi.createSubscriptionOrder()
      const order = orderRes.data.data

      const rzp = new window.Razorpay({
        key: order.keyId,
        order_id: order.orderId,
        amount: order.amount,
        currency: order.currency,
        name: 'WebCraft',
        description: 'Pro Subscription',
        handler: async (response) => {
          try {
            await billingApi.verifySubscriptionPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            setNotice('Pro subscription activated.')
            await loadData()
          } catch (err) {
            setError(err?.response?.data?.error?.message || 'Subscription verification failed')
          }
        },
      })
      rzp.on('payment.failed', (resp) => {
        setError(resp?.error?.description || 'Subscription payment failed')
      })
      rzp.open()
    } catch (err) {
      setError(err?.response?.data?.error?.message || err.message)
    } finally {
      setBusy(false)
    }
  }

  async function handleCancelSubscription() {
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await billingApi.cancelSubscription()
      setNotice('Subscription will cancel at period end.')
      await loadData()
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Cancellation failed')
    } finally {
      setBusy(false)
    }
    setCancelDialogOpen(false)
  }

  async function handleRefundPayment() {
    if (!refundPaymentId) return
    setError(null)
    setNotice(null)
    setBusy(true)
    try {
      await billingApi.refundPayment({ paymentId: refundPaymentId })
      setNotice('Refund issued. Credits adjusted.')
      await loadData()
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Refund failed')
    } finally {
      setBusy(false)
    }
    setRefundDialogOpen(false)
    setRefundPaymentId(null)
  }

  const tierConfig = useMemo(() => {
    if (!tiers) return null
    return tiers
  }, [tiers])

  const proTier = tierConfig?.PRO
  const freeTier = tierConfig?.FREE

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  const isPro = subscription?.tier === 'PRO'
  const isFree = subscription?.tier === 'FREE'
  const signupGrant = balance?.signupGrant ?? null
  const availableCredits = balance?.availableCredits ?? 0
  const reservedCredits = balance?.reservedCredits ?? 0
  const totalCredits = balance?.credits ?? 0
  const consumedCredits = balance?.totalConsumedCredits ?? 0
  const purchasedCredits = balance?.purchasedCredits ?? 0

  const hasByok = providers.some(
    (p) => p.connected && p.billingMode === 'byok'
  )

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Billing</h1>
          <p className="text-secondary">Manage your credits, subscription, and payments</p>
        </div>
        <Button variant="secondary" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-4 bg-error/10 border border-error/30 rounded-lg text-error text-sm flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 flex-shrink-0" /> {error}
        </div>
      )}
      {notice && (
        <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
          {notice}
        </div>
      )}

      {/* Current plan & balance */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Current Plan</CardTitle>
              <CardDescription>Your subscription and credit balance</CardDescription>
            </div>
            <Badge variant={isPro ? 'success' : 'neutral'}>{subscription?.tier ?? 'FREE'}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <p className="text-xs text-muted mb-1">Available Credits</p>
              <p className="text-3xl font-mono font-bold text-accent">{availableCredits}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Reserved</p>
              <p className="text-2xl font-mono text-warning">{reservedCredits}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Total Balance</p>
              <p className="text-2xl font-mono text-foreground">{totalCredits}</p>
            </div>
            <div>
              <p className="text-xs text-muted mb-1">Consumed (Lifetime)</p>
              <p className="text-2xl font-mono text-foreground">{consumedCredits}</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-border">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Wallet className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">
                  {isFree
                    ? 'Free Tier — 50 credits per UTC day'
                    : isPro
                    ? 'Pro Tier — $10/month, 200 credits per UTC day'
                    : 'Business Tier — Pay-as-you-go'}
                </p>
                {isFree && (
                  <p className="text-xs text-muted mt-1">
                    Daily credits reset at 00:00 UTC. Unused credits do not roll over.
                  </p>
                )}
                {isPro && (
                  <p className="text-xs text-muted mt-1">
                    Daily credits reset at 00:00 UTC. Subscription renews monthly.
                  </p>
                )}
                )}
                {!paymentsConfig?.configured && (
                  <p className="text-xs text-warning mt-1">
                    Payments not configured on this deployment.
                  </p>
                )}
              </div>
            </div>
          </div>

          {isPro && subscription?.cancelAtPeriodEnd && (
            <div className="mt-4 p-4 rounded-lg bg-error/10 border border-error/20">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-error">
                    Subscription is scheduled to cancel at period end.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* BYOK section */}
      {balance && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Bring Your Own Key (BYOK)</CardTitle>
                <CardDescription>
                  Connect your own AI provider key to generate without using WebCraft credits.
                </CardDescription>
              </div>
              <Badge variant={hasByok ? 'success' : 'neutral'}>
                {hasByok ? 'Connected' : 'Not connected'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            {!hasByok && availableCredits === 0 && (
              <div className="p-4 rounded-lg bg-amber-50 border border-amber-200 mb-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      Credits exhausted — add your own API key to keep generating
                    </p>
                    <p className="text-xs text-amber-700 mt-1">
                      You have no WebCraft credits remaining. Connect your own provider API key
                      to continue generating. The provider bills you directly; no WebCraft credits
                      are deducted.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {!hasByok && availableCredits > 0 && (
              <div className="p-3 rounded-lg bg-elevated border border-border mb-4 text-xs text-secondary">
                  <p>
                    You have {availableCredits} WebCraft credit{availableCredits !== 1 ? 's' : ''}
                    remaining. Connect your own API key to generate without using them.
                  </p>
              </div>
            )}
            {hasByok && (
              <div className="p-3 rounded-lg bg-success/10 border border-success/20 mb-4">
                <div className="flex items-start gap-2">
                  <CheckCircle className="w-4 h-4 text-success flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm text-foreground">
                      BYOK is active — generation uses your own API key. No WebCraft credits deducted.
                    </p>
                  </div>
                </div>
              </div>
            )}
              <p className="text-xs text-muted">
                Set up BYOK on the{' '}
                <Link to="/integrations" className="text-accent hover:underline">
                  Integrations
                </Link>{' '}
                page. Once connected, switch the billing mode to "Your own API key (BYOK)".
              </p>
          </CardContent>
        </Card>
      )}

      {/* Plans */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Plans</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Free */}
          <Card key="FREE" className={clsx('p-6', isFree && 'border-accent')}>
            {isFree && <Badge variant="success" className="mb-4">Current Plan</Badge>}
            <h3 className="text-xl font-bold text-foreground">Free</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-foreground">$0</span>
              <span className="text-secondary">one-time</span>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-elevated border border-border">
              <p className="text-xl font-mono font-bold text-accent">{freeTier?.allowance ?? 50}</p>
              <p className="text-xs text-muted">credits per UTC day</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                {freeTier?.allowance} credits per UTC day
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                AI code generation
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                Project management
              </li>
            </ul>
            <Button
              variant="ghost"
              className="w-full"
              disabled={isFree}
              title="You are already on the Free plan"
            >
              Current plan
            </Button>
          </Card>

          {/* Pro */}
          <Card key="PRO" className={clsx('p-6', isPro && 'border-accent')}>
            {isPro && <Badge variant="success" className="mb-4">Current Plan</Badge>}
            <h3 className="text-xl font-bold text-foreground">Pro</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-foreground">${(proTier?.priceCents ?? 1000) / 100}</span>
              <span className="text-secondary">/month</span>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-elevated border border-border">
              <p className="text-xl font-mono font-bold text-accent">{proTier?.allowance ?? 200}</p>
              <p className="text-xs text-muted">credits per UTC day</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                {proTier?.allowance} credits per UTC day
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                All Free features
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                Priority AI models
              </li>
            </ul>
            {isPro ? (
              <Button variant="secondary" className="w-full" onClick={() => setCancelDialogOpen(true)}>
                Cancel Subscription
              </Button>
            ) : (
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSubscribePro}
                disabled={busy || !paymentsConfig?.configured}
              >
                Upgrade to Pro
              </Button>
            )}
            {!paymentsConfig?.configured && (
              <p className="mt-2 text-xs text-warning text-center">
                Configure Razorpay to subscribe
              </p>
            )}
          </Card>

          {/* Business */}
          <Card key="BUSINESS" className="p-6">
            <h3 className="text-xl font-bold text-foreground">Business</h3>
            <div className="my-4">
              <span className="text-3xl font-bold text-foreground">Pay-as-you-go</span>
            </div>
            <div className="mb-4 p-3 rounded-lg bg-elevated border border-border">
              <p className="text-xl font-mono font-bold text-accent">Custom</p>
              <p className="text-xs text-muted">measured usage</p>
            </div>
            <ul className="space-y-2 mb-6">
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                No fixed allowance
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                Daily &amp; monthly spending limits
              </li>
              <li className="flex items-center gap-2 text-sm text-secondary">
                <Check className="w-4 h-4 text-success flex-shrink-0" />
                Detailed cost breakdowns
              </li>
            </ul>
            <Button variant="secondary" className="w-full">
              Contact sales
            </Button>
          </Card>
        </div>
      </div>

      {/* Purchase credits */}
      <Card>
        <CardHeader>
          <CardTitle>Purchase Credits</CardTitle>
          <CardDescription>
            Buy additional credits on top of your plan (Razorpay, INR)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {paymentsConfig && !paymentsConfig.configured ? (
            <div className="flex items-start gap-3 p-4 rounded-lg bg-elevated border border-border">
              <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-foreground">Configuration Required</p>
                <p className="text-xs text-muted mt-1">
                  Payments are disabled because Razorpay credentials are not set on the server.
                  Credit purchases cannot be completed until an administrator configures Razorpay.
                </p>
              </div>
            </div>
          ) : (
            <>
              <form onSubmit={handlePurchaseCredits} className="flex gap-3 max-w-md">
                <input
                  type="number"
                  min="1"
                  value={purchaseCredits}
                  onChange={(e) => setPurchaseCredits(parseInt(e.target.value, 10) || 1)}
                  className="input flex-1"
                />
                <Button type="submit" icon={Zap} disabled={busy}>
                  {busy ? 'Starting…' : 'Purchase'}
                </Button>
              </form>
              <p className="mt-2 text-xs text-muted">
                Amount is calculated server-side in INR and verified with a cryptographic signature.
                Credits are only added after a verified payment.
              </p>
            </>
          )}
        </CardContent>
      </Card>

      {/* Refund dialog */}
      <Dialog
        open={refundDialogOpen}
        onClose={() => setRefundDialogOpen(false)}
        title="Refund Payment"
        description="Refund the selected payment. Credits will be adjusted accordingly."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRefundDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleRefundPayment} disabled={busy}>
              Refund
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          The refund will be processed through Razorpay. Credits purchased with this payment will
          be removed from your balance.
        </p>
      </Dialog>

      {/* Cancel subscription dialog */}
      <ConfirmDialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription?"
        description="Your Pro subscription will continue until the end of the current billing period, then downgrade to Free."
        confirmLabel="Cancel"
      />

      {/* Payment history */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">Payment History</h2>
          <Link to="/usage" className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1">
            Full usage <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {payments.length === 0 ? (
          <Card>
            <EmptyState title="No payments yet" description="Your payment history will appear here." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Credits</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p) => {
                    const canRefund = p.status === 'COMPLETED' && !!p.razorpayPaymentId && paymentsConfig?.configured
                    return (
                      <tr key={p.id}>
                        <td>{new Date(p.createdAt).toLocaleDateString()}</td>
                        <td>
                          <Badge variant="neutral">{p.creditsPurchased > 0 ? 'Credits' : 'Subscription'}</Badge>
                        </td>
                        <td className="font-mono">
                          {(p.amount / 100).toFixed(2)} {p.currency}
                        </td>
                        <td>
                          <Badge
                            variant={
                              p.status === 'COMPLETED'
                                ? 'success'
                                : p.status === 'FAILED'
                                ? 'danger'
                                : p.status === 'REFUNDED'
                                ? 'muted'
                                : 'neutral'
                            }
                          >
                            {p.status}
                          </Badge>
                        </td>
                        <td className="font-mono text-muted">{p.creditsPurchased}</td>
                        <td>
                          {canRefund && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setRefundPaymentId(p.id)
                                setRefundDialogOpen(true)
                              }}
                            >
                              Refund
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent Transactions</h2>
          <Link to="/usage" className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1">
            Full history <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {transactions.length === 0 ? (
          <Card>
            <EmptyState title="No transactions" description="Credit activity will appear here." />
          </Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Balance After</th>
                    <th>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id}>
                      <td>{new Date(tx.createdAt).toLocaleDateString()}</td>
                      <td>
                        <Badge variant={tx.amount > 0 ? 'success' : 'danger'}>{tx.type}</Badge>
                      </td>
                      <td className="font-mono">{tx.amount > 0 ? `+${tx.amount}` : tx.amount}</td>
                      <td className="font-mono text-muted">{tx.balanceAfter}</td>
                      <td className="text-muted">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>
    </div>
  )
}

export default BillingPage
