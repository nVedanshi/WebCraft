import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store.js'
import { billingApi } from '../lib/billingApi.js'

const TIERS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '$0',
    period: '/month',
    credits: 50,
    description: '50 credits per day, reset at 00:00 UTC. No rollover.',
    features: ['50 daily credits', 'AI code generation', 'Project management'],
    recommended: false,
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '$10',
    period: '/month',
    credits: 200,
    description: '200 credits per billing period plus pay-as-you-go.',
    features: ['200 monthly credits', 'AI code generation', 'Project management', 'Priority support'],
    recommended: true,
  },
  {
    id: 'BUSINESS',
    name: 'Business',
    price: 'Pay-as-you-go',
    period: '',
    credits: 'Custom',
    description: 'Spending limits and custom credit packages.',
    features: ['Spending limits', 'Custom credit packages', 'Priority support', 'Team billing'],
    recommended: false,
  },
]

export default function BillingPage() {
  const { user } = useAuthStore((s) => ({ user: s.user }))
  const navigate = useNavigate()
  const [balance, setBalance] = useState(null)
  const [subscription, setSubscription] = useState(null)
const [pricingTiers, setPricingTiers] = useState(null)
const [activePricing, setActivePricing] = useState([])
const [transactions, setTransactions] = useState([])
const [spendingLimit, setSpendingLimit] = useState(null)
const [purchaseCredits, setPurchaseCredits] = useState(100)
const [loading, setLoading] = useState(true)
const [error, setError] = useState(null)
const [activeTab, setActiveTab] = useState('dashboard')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [bRes, sRes, pRes, tRes] = await Promise.all([
        billingApi.getBalance(),
        billingApi.getSubscription(),
        billingApi.getPricingTiers(),
        billingApi.getTransactions({ take: 20 }),
      ])
      setBalance(bRes.data.data)
      setSubscription(sRes.data.data)
      setPricingTiers(pRes.data.data)
      setTransactions(tRes.data.data.transactions || [])

      if (balance?.tier === 'BUSINESS') {
        const slRes = await billingApi.getSpendingLimit()
        setSpendingLimit(slRes.data.data)
      }
    } catch (err) {
      setError(err.message || 'Failed to load billing data')
    } finally {
      setLoading(false)
    }
  }

  async function handlePurchase(e) {
    e.preventDefault()
    try {
      const { data } = await billingApi.createPurchaseOrder({ credits: purchaseCredits })
      setError(null)
      // In production, redirect to Razorpay checkout with data.data.orderId
      // For MVP, show order details and let user verify manually
      window.alert(
        `Purchase order created: ${data.data.credits} credits for $${(data.data.amount / 100).toFixed(2)}\nOrder ID: ${data.data.paymentId}\n\nIn production, this would redirect to Razorpay checkout.`
      )
      loadData()
    } catch (err) {
      setError(err.message || 'Purchase failed')
    }
  }

  async function handleSetSpendingLimit(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const daily = form.get('dailyLimitCents')
    const monthly = form.get('monthlyLimitCents')
    const alert = form.get('alertThresholdCents')
    try {
      await billingApi.setSpendingLimit({
        dailyLimitCents: daily ? parseInt(daily, 10) : 0,
        monthlyLimitCents: monthly ? parseInt(monthly, 10) : 0,
        alertThresholdCents: alert ? parseInt(alert, 10) : 0,
      })
      loadData()
    } catch (err) {
      setError(err.message || 'Failed to set spending limit')
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#020617]">
        <div className="text-slate-400 text-sm">Loading billing...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-md text-red-400 text-sm">
        {error}
        <button
          onClick={() => { setError(null); loadData() }}
          className="mt-2 text-xs underline"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200">
      <nav className="border-b border-slate-800 bg-slate-900/80 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center gap-8">
          <Link to="/" className="font-bold text-accent-400 text-lg">WebCraft</Link>
          <div className="flex items-center gap-2 px-3 py-1 rounded-md bg-slate-800 text-xs text-slate-400">
            <span className={`w-2 h-2 rounded-full ${balance?.tier === 'PRO' ? 'bg-green-500' : 'bg-slate-500'}`}></span>
            {balance?.tier}
          </div>
          <Link to="/" className="text-xs text-slate-400 hover:text-slate-200">Back to projects</Link>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto p-6">
        {balance && (
          <div className="mb-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
              <div>
                <h1 className="text-2xl font-bold text-white">Billing</h1>
                <p className="text-slate-400">Manage your credits, subscription, and spending.</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-xs text-slate-400 uppercase">Credits</div>
                  <div className="text-2xl font-mono text-accent-400">{balance?.credits ?? 0}</div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-xs text-slate-400 uppercase">Available</div>
                  <div className="text-2xl font-mono text-green-400">{balance?.availableCredits ?? 0}</div>
                </div>
                <div className="px-4 py-3 rounded-lg bg-slate-800 border border-slate-700">
                  <div className="text-xs text-slate-400 uppercase">Reserved</div>
                  <div className="text-2xl font-mono text-amber-400">{balance?.reservedCredits ?? 0}</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="font-semibold text-white mb-2">Current Plan</h3>
                <p className="text-lg font-mono text-accent-400">{balance?.tier}</p>
                <p className="mt-2 text-sm text-slate-400">
                  {balance?.tier === 'FREE'
                    ? '50 credits reset daily at 00:00 UTC. Unused credits do not roll over.'
                    : balance?.tier === 'PRO'
                    ? '200 credits per billing period plus pay-as-you-go.'
                    : 'Custom credit packages with spending limits.'}
                </p>
              </div>

              <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                <h3 className="font-semibold text-white mb-2">Next Reset</h3>
                <p className="text-lg font-mono text-slate-300">00:00 UTC daily</p>
                <p className="mt-2 text-sm text-slate-400">Free tier credits reset every day at midnight UTC.</p>
              </div>

              {balance?.tier === 'BUSINESS' && spendingLimit && (
                <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
                  <h3 className="font-semibold text-white mb-2">Spending Limits</h3>
                  <p className="text-sm text-slate-400">
                    Daily: ${(spendingLimit.dailyLimitCents / 100).toFixed(2)}<br />
                    Monthly: ${(spendingLimit.monthlyLimitCents / 100).toFixed(2)}<br />
                    Alert at: ${(spendingLimit.alertThresholdCents / 100).toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="flex gap-4 mb-6 border-b border-slate-800 pb-2">
          {['dashboard', 'pricing', 'transactions', 'spending'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2 text-sm font-medium transition ${
                activeTab === tab
                  ? 'text-accent-400 border-b-2 border-accent-400'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Recent Activity</h2>
            {transactions.length === 0 ? (
              <p className="text-slate-400">No transactions yet.</p>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Type</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 text-sm text-slate-300">
                        {new Date(tx.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            tx.amount > 0
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-mono">
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount} credits
                      </td>
                      <td className="py-3 text-sm text-slate-400">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'pricing' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-white">Subscription Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {TIERS.map((tier) => (
                <div
                  key={tier.id}
                  className={`p-6 rounded-xl border transition ${
                    tier.recommended
                      ? 'bg-accent/10 border-accent-500/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
                      : 'bg-slate-900 border-slate-800'
                  }`}
                >
                  {tier.recommended && (
                    <div className="mb-2 inline-block px-2 py-0.5 rounded text-xs font-bold text-accent-400 bg-accent/20">Popular</div>
                  )}
                  <h3 className="font-bold text-white text-lg">{tier.name}</h3>
                  <div className="my-2">
                    <span className="text-3xl font-mono font-bold text-white">{tier.price}</span>
                    <span className="text-slate-500">{tier.period}</span>
                  </div>
                  <p className="text-sm text-slate-400 mb-4">{tier.description}</p>
                  <ul className="space-y-2 mb-6">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-sm text-slate-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-600"></span>
                        {f}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => navigate('/login')}
                    className={`w-full py-2 rounded-lg font-medium transition ${
                      tier.recommended
                        ? 'bg-accent-600 text-white hover:bg-accent-500'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {tier.recommended ? 'Upgrade to Pro' : 'Select Plan'}
                  </button>
                </div>
              ))}
            </div>

            <div className="p-6 rounded-xl bg-slate-900 border border-slate-800">
              <h3 className="font-semibold text-white mb-4">Purchase Credits</h3>
              <p className="text-sm text-slate-400 mb-4">Buy additional credits on top of your plan allowance.</p>
              <form onSubmit={handlePurchase} className="flex flex-col sm:flex-row gap-4 max-w-md">
                <input
                  type="number"
                  min="1"
                  value={purchaseCredits}
                  onChange={(e) => setPurchaseCredits(parseInt(e.target.value, 10) || 1)}
                  className="input flex-1"
                  placeholder="Credits to purchase"
                />
                <button type="submit" className="btn bg-accent-600 text-white hover:bg-accent-500">
                  Purchase
                </button>
              </form>
              <p className="mt-2 text-xs text-slate-500">
                10 credits per $1 USD. Payment processed via Razorpay.
              </p>
            </div>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div>
            <h2 className="text-xl font-bold text-white">Transaction History</h2>
            {transactions.length === 0 ? (
              <p className="text-slate-400">No transactions yet.</p>
            ) : (
              <table className="w-full text-left border-collapse mt-4">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Date</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Type</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Amount</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Balance After</th>
                    <th className="py-3 text-xs font-semibold text-slate-400 uppercase">Description</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-800 hover:bg-slate-800/50">
                      <td className="py-3 text-sm text-slate-300">
                        {new Date(tx.createdAt).toLocaleString()}
                      </td>
                      <td className="py-3 text-sm">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            tx.amount > 0
                              ? 'bg-green-900/30 text-green-400'
                              : 'bg-red-900/30 text-red-400'
                          }`}
                        >
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 text-sm font-mono">
                        {tx.amount > 0 ? `+${tx.amount}` : tx.amount}
                      </td>
                      <td className="py-3 text-sm font-mono text-slate-400">{tx.balanceAfter}</td>
                      <td className="py-3 text-sm text-slate-400">{tx.description || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'spending' && balance?.tier !== 'BUSINESS' && (
          <div className="p-8 rounded-xl bg-slate-900/50 border border-slate-800/50 text-center">
            <h3 className="font-bold text-white mb-2">Spending Limits</h3>
            <p className="text-slate-400">Spending limits are available for Business tier users.</p>
            <button
              onClick={() => navigate('/login')}
              className="mt-4 px-4 py-2 bg-accent-600 text-white rounded hover:bg-accent-500"
            >
              Upgrade to Business
            </button>
          </div>
        )}

        {activeTab === 'spending' && balance?.tier === 'BUSINESS' && spendingLimit && (
          <div>
            <h2 className="text-xl font-bold text-white">Spending Limits</h2>
            <form onSubmit={handleSetSpendingLimit} className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4 max-w-lg">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Daily Limit (cents)</label>
                <input
                  type="number"
                  name="dailyLimitCents"
                  defaultValue={spendingLimit.dailyLimitCents}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Monthly Limit (cents)</label>
                <input
                  type="number"
                  name="monthlyLimitCents"
                  defaultValue={spendingLimit.monthlyLimitCents}
                  className="input"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Alert Threshold (cents)</label>
                <input
                  type="number"
                  name="alertThresholdCents"
                  defaultValue={spendingLimit.alertThresholdCents}
                  className="input"
                />
              </div>
              <button
                type="submit"
                className="col-span-1 md:col-span-3 btn bg-accent-600 text-white hover:bg-accent-500"
              >
                Save Limits
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
