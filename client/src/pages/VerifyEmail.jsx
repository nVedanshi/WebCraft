import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Command, CheckCircle } from 'lucide-react'
import { Button } from '../components/ui/Button.jsx'
import { api } from '../lib/api.js'

export function VerifyEmailPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    if (!token) {
      setError('No verification token provided')
      return
    }
    setLoading(true)
    api
      .post('/auth/verify-email', { token })
      .then(() => {
        setSubmitted(true)
      })
      .catch((err) => {
        setError(
          err.response?.data?.error?.message ||
            'Email verification failed. Please request a new verification email.'
        )
      })
      .finally(() => {
        setLoading(false)
      })
  }, [token])

  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
        <div className="w-full max-w-md">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-2xl font-bold text-slate-100">Email verified</h1>
            <p className="text-sm text-slate-500">
              Your email address has been verified. You can now sign in.
            </p>
          </div>
          <div className="card">
            <button
              onClick={() => navigate('/login')}
              className="btn w-full"
            >
              Go to sign in
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-slate-100">Verify email</h1>
          <p className="text-sm text-slate-500">
            Verifying your email address...
          </p>
        </div>
        {error && (
          <div className="card mb-6">
            <div className="p-4 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
            <div className="p-4 text-center">
              <Button
                onClick={() => navigate('/settings/profile')}
                variant="ghost"
              >
                Request new verification email
              </Button>
            </div>
          </div>
        )}
        {!error && !submitted && (
          <div className="card p-6 text-center">
            <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center mx-auto mb-4">
              <Command className="w-6 h-6 text-accent" />
            </div>
            <p className="text-sm text-slate-500">{loading ? 'Verifying...' : 'Ready'}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyEmailPage
