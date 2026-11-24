import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store.js'
import { api } from '../lib/api.js'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()
  const setSession = useAuthStore((s) => s.setSession)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await api.post('/auth/register', { email, password, name })
      const { user, accessToken, refreshToken } = data.data
      localStorage.setItem('wc_access_token', accessToken)
      localStorage.setItem('wc_refresh_token', refreshToken)
      api.setToken(accessToken)
      setSession(user, accessToken)
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-100">WebCraft</h1>
          <p className="text-sm text-slate-500">Create your workspace</p>
        </div>
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label" htmlFor="register-name">Name</label>
              <input
                id="register-name"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="register-email">Email</label>
              <input
                id="register-email"
                className="input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="register-password">Password</label>
              <input
                id="register-password"
                className="input"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && (
              <div className="text-xs text-red-400 bg-red-500/10 px-3 py-2 rounded">{error}</div>
            )}
            <button className="btn w-full" disabled={loading} type="submit">
              {loading ? 'Creating...' : 'Create account'}
            </button>
          </form>
          <p className="mt-4 text-center text-xs text-slate-500">
            Already have an account?{' '}
            <a href="/login" className="text-accent-400 hover:underline">Sign in</a>
          </p>
        </div>
      </div>
    </div>
  )
}
