import { useState, useEffect } from 'react'
import { clsx } from 'clsx'
import {
  User,
  Mail,
  Calendar,
  Trash2,
  Download,
  Shield,
  Key,
  Lock,
  Eye,
  EyeOff,
  Bell,
  Palette,
  Check,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store.js'
import { useThemeStore } from '../store/theme.store.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { ConfirmDialog } from '../components/ui/Dialog.jsx'
import { toast } from '../components/ui/Toast.jsx'

export function SettingsPage() {
  const { user, setSession } = useAuthStore()
  const { theme, setTheme } = useThemeStore()

  const [name, setName] = useState(user?.name || '')
  const [bio, setBio] = useState('')
  const [saving, setSaving] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  useEffect(() => {
    setName(user?.name || '')
  }, [user])

  const handleSaveProfile = async () => {
    setSaving(true)
    try {
      // Profile update requires backend endpoint
      toast.success('Profile updated (demo)')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleChangePassword = async (e) => {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const currentPassword = form.get('currentPassword')
    const newPassword = form.get('newPassword')

    try {
      await fetch('/api/v1/users/me/password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('wc_access_token')}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      })
      toast.success('Password changed successfully')
    } catch (err) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-secondary">Manage your account and preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-accent" />
            <CardTitle>Profile</CardTitle>
          </div>
          <CardDescription>Update your personal information</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-accent/20 flex items-center justify-center text-accent text-2xl font-bold">
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-medium text-foreground">{user?.name}</p>
              <p className="text-sm text-muted">{user?.email}</p>
            </div>
          </div>

          <div>
            <label className="label">Name</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="label">Email</label>
            <Input value={user?.email || ''} disabled />
            <p className="text-xs text-muted mt-1">Email cannot be changed</p>
          </div>

          <div>
            <label className="label">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="input resize-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          <Button onClick={handleSaveProfile} loading={saving}>
            Save changes
          </Button>
        </CardContent>
      </Card>

      {/* Account */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-accent" />
            <CardTitle>Account</CardTitle>
          </div>
          <CardDescription>Account information and status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Account created</span>
              <span className="text-sm text-foreground">
                {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Email verified</span>
              <Badge variant={user?.emailVerified ? 'success' : 'warning'}>
                {user?.emailVerified ? 'Verified' : 'Not verified'}
              </Badge>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-secondary">Account status</span>
              <Badge variant="success">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Security */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-accent" />
            <CardTitle>Security</CardTitle>
          </div>
          <CardDescription>Manage your password and security settings</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
            <div>
              <label className="label">Current password</label>
              <Input type="password" name="currentPassword" placeholder="••••••••" required />
            </div>
            <div>
              <label className="label">New password</label>
              <Input type="password" name="newPassword" placeholder="••••••••" required minLength={8} />
            </div>
            <Button type="submit">Change password</Button>
          </form>
        </CardContent>
      </Card>

      {/* Preferences */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Palette className="w-4 h-4 text-accent" />
            <CardTitle>Preferences</CardTitle>
          </div>
          <CardDescription>Customize your experience</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <label className="label mb-3">Theme</label>
              <div className="flex gap-3">
                {['dark', 'light'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setTheme(t)}
                    className={clsx(
                      'flex-1 p-3 rounded-lg border-2 transition-all',
                      theme === t
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-active'
                    )}
                  >
                    <div
                      className={clsx(
                        'w-full h-12 rounded mb-2',
t === 'dark' && 'bg-slate-950',
                        t === 'light' && 'bg-slate-100',
                      )}
                    />
                    <p className="text-xs font-medium text-foreground capitalize">{t}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-accent" />
            <CardTitle>Notifications</CardTitle>
          </div>
          <CardDescription>Manage your notification preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {['Generation completed', 'Credit warnings', 'Billing updates', 'Security alerts'].map((notif) => (
              <div key={notif} className="flex items-center justify-between">
                <span className="text-sm text-secondary">{notif}</span>
                <button className="w-10 h-5 rounded-full bg-elevated border border-border relative">
                  <span className="absolute left-0.5 top-0.5 w-4 h-4 rounded-full bg-muted" />
                </button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* API Keys */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-accent" />
            <CardTitle>API Keys</CardTitle>
          </div>
          <CardDescription>Manage your personal API keys</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
            <p className="text-sm text-info">
              API key management requires backend implementation.
              Your keys are stored encrypted and never exposed to the frontend.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border-danger/30">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-4 h-4 text-danger" />
            <CardTitle>Danger zone</CardTitle>
          </div>
          <CardDescription>Irreversible account actions</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Button variant="secondary" icon={Download}>
              Export data
            </Button>
            <Button variant="danger" icon={Trash2} onClick={() => setShowDeleteConfirm(true)}>
              Delete account
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={() => {
          setShowDeleteConfirm(false)
          toast.error('Account deletion requires backend implementation')
        }}
        title="Delete account?"
        description="This will permanently delete your account and all associated data. This cannot be undone."
        confirmLabel="Delete account"
      />
    </div>
  )
}

export default SettingsPage
