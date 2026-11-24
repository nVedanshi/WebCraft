import { useState, useEffect, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart3,
  ArrowUpRight,
  Calendar,
  RefreshCw,
  AlertTriangle,
  Wallet,
  Lock,
  Sparkles,
  FileText,
  Clock,
} from 'lucide-react'
import { billingApi } from '../lib/billingApi.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton } from '../components/ui/Spinner.jsx'

export function UsagePage() {
  const [balance, setBalance] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [usage, setUsage] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [dateRange, setDateRange] = useState('30d')

  const RANGE_DAYS = { '7d': 7, '30d': 30, '90d': 90 }

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [bRes, tRes, uRes] = await Promise.all([
        billingApi.getBalance(),
        billingApi.getTransactions({ take: 200 }),
        billingApi.getUsage({ take: 200 }),
      ])
      setBalance(bRes.data.data)
      setTransactions(tRes.data.data.transactions || [])
      setUsage(uRes.data.data.usage || [])
    } catch (err) {
      setError(
        err?.response?.data?.error?.message ||
          err?.message ||
          'Unable to load usage data'
      )
      setBalance(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const cutoff = useMemo(() => {
    const d = new Date()
    d.setUTCDate(d.getUTCDate() - (RANGE_DAYS[dateRange] || 30))
    return d
  }, [dateRange])

  const filteredTx = useMemo(
    () => transactions.filter((tx) => new Date(tx.createdAt) >= cutoff),
    [transactions, cutoff]
  )
  const filteredUsage = useMemo(
    () => usage.filter((u) => new Date(u.createdAt) >= cutoff),
    [usage, cutoff]
  )

  const byProvider = useMemo(() => {
    const map = new Map()
    for (const u of filteredUsage) {
      const key = `${u.provider}::${u.model}`
      const cur = map.get(key) || {
        provider: u.provider,
        model: u.model,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        costCents: 0,
        calls: 0,
      }
      cur.inputTokens += u.inputTokens || 0
      cur.outputTokens += u.outputTokens || 0
      cur.totalTokens += u.totalTokens || 0
      cur.costCents += u.costCents || 0
      cur.calls += 1
      map.set(key, cur)
    }
    return Array.from(map.values()).sort((a, b) => b.totalTokens - a.totalTokens)
  }, [filteredUsage])

  const available = balance?.availableCredits ?? 0
  const total = balance?.credits ?? 0
  const reserved = balance?.reservedCredits ?? 0
  const purchased = balance?.purchasedCredits ?? 0
  const consumed = balance?.totalConsumedCredits ?? 0
  const tier = balance?.tier ?? 'FREE'
  const signupGranted = balance?.signupCreditsGranted ?? false

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
          <Skeleton className="h-32" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-error" />
            <div>
              <p className="text-lg font-semibold text-foreground">Could not load usage</p>
              <p className="text-sm text-secondary mt-1">{error}</p>
            </div>
            <Button onClick={loadData} variant="secondary">
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const isFree = tier === 'FREE'
  const isPro = tier === 'PRO'

  return (
    <div className="p-6 space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Usage &amp; Credits</h1>
          <p className="text-secondary">Track your spendable credits, holds and provider usage</p>
        </div>
        <Button variant="secondary" onClick={loadData}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <Wallet className="h-3.5 w-3.5" /> Available Credits
            </div>
            <p className="text-3xl font-mono font-bold text-accent">{available}</p>
            <p className="text-xs text-muted mt-1">Spendable now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <Lock className="h-3.5 w-3.5" /> Reserved
            </div>
            <p className="text-2xl font-mono text-warning">{reserved}</p>
            <p className="text-xs text-muted mt-1">Held for running jobs</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              <FileText className="h-3.5 w-3.5" /> Consumed (Lifetime)
            </div>
            <p className="text-3xl font-mono font-bold text-foreground">{consumed}</p>
            <p className="text-xs text-muted mt-1">Total credits used</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-muted text-xs mb-1">
              {isFree ? (
                <div className="flex items-center gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  <span className="text-xs">{signupGranted ? 'Granted' : 'Not Granted'}</span>
                </div>
              ) : (
                <Calendar className="h-3.5 w-3.5" />
              )}
              {isFree ? 'Signup Grant' : tier}
            </div>
            {isFree ? (
              <p className={signupGranted ? 'text-sm font-medium text-success' : 'text-sm font-medium text-muted'}>
                {signupGranted ? '50 credits applied' : 'No signup grant'}
              </p>
            ) : (
              <p className="text-2xl font-bold text-foreground">{tier}</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted mb-1">Consumed in period</p>
            <p className="text-2xl font-mono text-foreground">
              {filteredTx
                .filter((t) => t.type === 'CONSUME')
                .reduce((sum, t) => sum + Math.abs(t.amount), 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs text-muted mb-1">Provider tokens in period</p>
            <p className="text-2xl font-mono text-foreground">
              {byProvider.reduce((s, p) => s + p.totalTokens, 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>
      </div>

      {available === 0 && total === 0 && (
        <Card>
          <CardContent className="py-6 text-center">
            <p className="text-sm text-secondary">
              You have no credits right now.{' '}
              <Link to="/billing" className="text-accent hover:underline">Get credits</Link>.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Usage by provider */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Usage by Provider</CardTitle>
              <CardDescription>AI token usage grouped by provider and model</CardDescription>
            </div>
            <Link to="/billing" className="text-sm text-accent hover:text-accent/80 inline-flex items-center gap-1">
              View billing <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {byProvider.length === 0 ? (
            <EmptyState
              icon={BarChart3}
              title="No usage in this period"
              description="AI usage will appear here once you generate projects."
            />
          ) : (
            <div className="space-y-4">
              {byProvider.map((item) => (
                <div key={`${item.provider}-${item.model}`} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">{item.provider}</p>
                    <p className="text-xs text-muted">{item.model} · {item.calls} calls</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-foreground">{item.totalTokens.toLocaleString()} tokens</p>
                    <p className="text-xs text-muted">
                      in {item.inputTokens.toLocaleString()} / out {item.outputTokens.toLocaleString()} · {item.costCents}¢
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Transaction history */}
      <div>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <h2 className="text-lg font-semibold text-foreground">Transaction History</h2>
          <label className="flex items-center gap-2 text-sm text-secondary">
            Period
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="input w-auto"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
            </select>
          </label>
        </div>

        {filteredTx.length === 0 ? (
          <Card>
            <EmptyState title="No transactions" description="Credit activity in this period will appear here." />
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
                  {filteredTx.map((tx) => (
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

export default UsagePage
