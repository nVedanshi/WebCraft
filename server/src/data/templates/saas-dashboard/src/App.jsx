import { BrowserRouter, Routes, Route, useNavigate, Link, useLocation } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, Settings, LogOut, Plus, Search, Bell, Menu, X, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from './components/ui.jsx'

const pages = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Customers', path: '/customers', icon: Users },
  { name: 'Billing', path: '/billing', icon: CreditCard },
  { name: 'Settings', path: '/settings', icon: Settings },
]

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-50">
        <Sidebar />
        <main className="flex-1 p-6">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/customers" element={<Customers />} />
            <Route path="/billing" element={<Billing />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}

function Sidebar() {
  const { pathname } = useLocation()
  return (
    <aside className="fixed h-full w-64 bg-white border-r border-gray-200">
      <div className="p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
            S
          </div>
          <span className="font-bold text-lg text-gray-900">SaaS</span>
        </div>
        <nav className="space-y-1">
          {pages.map((p) => {
            const Icon = p.icon
            const active = pathname === p.path
            return (
              <Link
                key={p.name}
                to={p.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  active
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-5 h-5" />
                {p.name}
              </Link>
            )
          })}
        </nav>
        <div className="mt-auto pt-6 border-t border-gray-200">
          <button className="flex items-center gap-3 px-3 py-2.5 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
            <LogOut className="w-4 h-4" /> Sign out
          </button>
        </div>
      </div>
    </aside>
  )
}

function Dashboard() {
  const stats = [
    { label: 'Total Revenue', value: '$45,230', change: '+12%' },
    { label: 'Active Users', value: '12,840', change: '+8%' },
    { label: 'Conversions', value:'3.4%', change: '+2.1%' },
    { label: 'Churn Rate', value:'2.1%', change: '-5%' },
  ]
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500">Overview of your business metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <input type="text" placeholder="Search..." className="pl-10 pr-4 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none w-64" />
          <button className="p-2.5 bg-gray-100 rounded-lg text-gray-600 hover:bg-gray-200">
            <Bell className="w-5 h-5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-gray-500">{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-bold text-gray-900">{s.value}</span>
                <span className="text-xs font-medium text-green-600">{s.change}</span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent className="h-64">
            <div className="flex h-full items-end gap-1 p-4">
              {[30, 45, 35, 50, 40, 60, 55, 70, 65, 80, 75, 90].map((h, i) => (
                <div key={i} className="w-full bg-blue-600/60 rounded-t-sm" style={{ height: `${h}%` }} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <button className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-700">Create new project</span>
                <Plus className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-700">Invite team member</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              <button className="w-full flex items-center justify-between px-4 py-3 text-left rounded-lg border border-gray-200 bg-white hover:bg-gray-50 transition-colors">
                <span className="text-sm text-gray-700">View analytics</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Customers() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500">Manage your customer relationships</p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add customer
        </button>
      </div>
      <Card>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Name</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Email</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Plan</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Status</th>
                  <th className="pb-3 text-left text-xs font-medium text-gray-500">Value</th>
                </tr>
              </thead>
              <tbody>
                {[
                  { name: 'Alice Johnson', email: 'alice@example.com', plan: 'Pro', status: 'Active', value: '$99/mo' },
                  { name: 'Bob Smith', email: 'bob@example.com', plan: 'Starter', status: 'Active', value: '$49/mo' },
                  { name: 'Carol Davis', email: 'carol@example.com', plan: 'Enterprise', status: 'Active', value: '$299/mo' },
                  { name: 'David Wilson', email: 'david@example.com', plan: 'Pro', status: 'Inactive', value: '$99/mo' },
                ].map((c) => (
                  <tr key={c.email} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
                    <td className="py-4 text-sm text-gray-900">{c.name}</td>
                    <td className="py-4 text-sm text-gray-500">{c.email}</td>
                    <td className="py-4 text-sm text-gray-500">{c.plan}</td>
                    <td className="py-4 text-sm">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                        {c.status}
                      </span>
                    </td>
                    <td className="py-4 text-sm text-gray-500">{c.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Billing() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-gray-500">Manage your subscription and payments</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { name: 'Starter', price: '$49', desc: 'Perfect for small projects', features: ['Up to 3 projects', 'Basic analytics', 'Community support'] },
          { name: 'Pro', price: '$99', desc: 'For growing teams', features: ['Unlimited projects', 'Advanced analytics', 'Priority support', 'Custom domains'] },
          { name: 'Enterprise', price: '$299', desc: 'For large organizations', features: ['Everything in Pro', 'SSO & SAML', 'Dedicated support', 'SLA guarantees'] },
        ].map((p) => (
          <Card key={p.name}>
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">{p.name}</CardTitle>
              <p className="text-sm text-gray-500">{p.desc}</p>
            </CardHeader>
            <CardContent>
              <div className="mb-6">
                <span className="text-3xl font-bold text-gray-900">{p.price}</span>
                <span className="text-sm text-gray-500">/month</span>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                {p.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-green-600 w-5 h-5">✓</span> {f}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Configure your account preferences</p>
      </div>
      <Card>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500">Full name</label>
                  <input type="text" defaultValue="Demo User" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500">Email</label>
                  <input type="email" defaultValue="demo@example.com" className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
