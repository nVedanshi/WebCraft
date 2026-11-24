import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Search,
  Bell,
  Moon,
  Sun,
  Menu,
  X,
  Plus,
  FolderOpen,
  LayoutTemplate,
  CreditCard,
  Settings,
  HelpCircle,
  ArrowRight,
  LogOut,
} from 'lucide-react'
import { useThemeStore } from '../../store/theme.store.js'
import { useAuthStore } from '../../store/auth.store.js'

export function Header({ onMenuToggle, sidebarCollapsed }) {
  const navigate = useNavigate()
  const { theme, setTheme } = useThemeStore()
  const { clearSession } = useAuthStore()
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSignOut = () => {
    clearSession()
    navigate('/login')
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      navigate(`/projects?search=${encodeURIComponent(searchQuery)}`)
      setSearchQuery('')
    }
  }

  const cycleTheme = () => {
    const themes = ['dark', 'light']
    const next = themes[(themes.indexOf(theme) + 1) % themes.length]
    setTheme(next)
  }

  return (
    <header className="h-16 bg-surface border-b border-border flex items-center justify-between px-6 z-20">
      {/* Left side - Menu */}
      <div className="flex items-center gap-4">
        <button
          onClick={onMenuToggle}
          className="lg:hidden text-secondary hover:text-foreground transition-colors"
        >
          <Menu className="w-6 h-6" />
        </button>
        <form onSubmit={handleSearch} className="hidden sm:flex items-center">
          <div className="relative w-full max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch(e)}
              placeholder="Search projects..."
              className="pl-9 pr-3 py-2 bg-elevated border border-border rounded-lg text-sm text-foreground placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
            />
          </div>
        </form>
      </div>

      {/* Right side - Actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <div className="relative">
          <button
            onClick={() => setNotificationsOpen(!notificationsOpen)}
            className="p-2 text-muted hover:text-secondary hover:bg-hover rounded-lg transition-colors relative"
          >
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full" />
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-elevated border border-border rounded-lg shadow-lg z-50 animate-slide-up">
              <div className="p-4 border-b border-border">
                <h3 className="font-semibold text-foreground">Notifications</h3>
              </div>
              <div className="p-4">
                <p className="text-sm text-muted text-center py-8">No new notifications</p>
              </div>
            </div>
          )}
        </div>

        {/* Theme toggle */}
        <button
          onClick={cycleTheme}
          className="p-2 text-muted hover:text-secondary hover:bg-hover rounded-lg transition-colors"
          title={`Current theme: ${theme}`}
        >
          {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </button>

        {/* Sign out */}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-danger font-medium text-sm hover:bg-danger/10 border border-danger/20 transition-colors"
          title="Sign out"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </header>
  )
}

export default Header
