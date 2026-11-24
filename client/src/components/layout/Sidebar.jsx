import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Home,
  FolderOpen,
  LayoutTemplate,
  Plug,
  BarChart3,
  CreditCard,
  Settings,
  HelpCircle,
  BookOpen,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Command,
  Bell,
  Moon,
  Sun,
  Monitor,
} from 'lucide-react'
import { useAuthStore } from '../../store/auth.store.js'
import { useThemeStore } from '../../store/theme.store.js'

const navItems = [
  { label: 'Home', href: '/', icon: Home },
  { label: 'Projects', href: '/projects', icon: FolderOpen },
  { label: 'Templates', href: '/templates', icon: LayoutTemplate },
  { label: 'Integrations', href: '/integrations', icon: Plug },
  { label: 'Usage', href: '/usage', icon: BarChart3 },
  { label: 'Billing', href: '/billing', icon: CreditCard },
  { label: 'Settings', href: '/settings/profile', icon: Settings },
]

export function Sidebar({ collapsed, onToggle }) {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, clearSession } = useAuthStore()
  const { theme, setTheme } = useThemeStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = () => {
    clearSession()
    localStorage.clear()
    navigate('/login')
  }

  const cycleTheme = () => {
    const themes = ['dark', 'light']
    const next = themes[(themes.indexOf(theme) + 1) % themes.length]
    setTheme(next)
  }

  return (
    <>
      <aside
        className={clsx(
          'fixed left-0 top-0 h-screen bg-surface border-r border-border flex flex-col z-30 transition-all duration-300',
          collapsed ? 'w-16' : 'w-64'
        )}
      >
        {/* Logo */}
        <div className={clsx('h-16 flex items-center border-b border-border', collapsed ? 'justify-center px-2' : 'px-4')}>
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center flex-shrink-0">
              <Command className="w-5 h-5 text-white" />
            </div>
            {!collapsed && <span className="font-bold text-lg text-foreground">WebCraft</span>}
          </Link>
        </div>

        {/* Navigation */}
        <nav className={clsx('flex-1 overflow-y-auto py-4', collapsed ? 'px-2' : 'px-3')}>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = location.pathname === item.href ||
                (item.href !== '/' && location.pathname.startsWith(item.href))
              return (
                <li key={item.href}>
                  <Link
                    to={item.href}
                    className={clsx(
                      'flex items-center gap-3 rounded-lg transition-colors',
                      collapsed ? 'justify-center px-2 py-2.5' : 'px-3 py-2.5',
                      isActive
                        ? 'bg-accent/10 text-accent border border-accent/20'
                        : 'text-secondary hover:text-foreground hover:bg-hover'
                    )}
                    title={collapsed ? item.label : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!collapsed && <span className="text-sm font-medium">{item.label}</span>}
                  </Link>
                </li>
              )
            })}
          </ul>

          {/* Bottom nav */}
          {!collapsed && (
            <div className="mt-auto pt-4 border-t border-border">
              <ul className="space-y-1">
                <li>
                  <Link
                    to="/help"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-foreground hover:bg-hover transition-colors"
                  >
                    <HelpCircle className="w-5 h-5" />
                    <span className="text-sm font-medium">Help</span>
                  </Link>
                </li>
                <li>
                  <Link
                    to="/changelog"
                    className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:text-foreground hover:bg-hover transition-colors"
                  >
                    <BookOpen className="w-5 h-5" />
                    <span className="text-sm font-medium">Changelog</span>
                  </Link>
                </li>
              </ul>
            </div>
          )}
        </nav>

        {/* User section */}
        <div className={clsx('border-t border-border', collapsed ? 'px-2 py-4' : 'p-4')}>
          {collapsed ? (
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-medium"
            >
              {user?.name?.charAt(0)?.toUpperCase() || 'U'}
            </button>
          ) : (
            <>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-hover transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center text-accent font-medium">
                  {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-foreground truncate">{user?.name || 'User'}</p>
                  <p className="text-xs text-muted truncate">{user?.email}</p>
                </div>
              </button>
            </>
          )}

          {showUserMenu && (
            <div className={clsx('absolute bg-elevated border border-border rounded-lg shadow-lg mt-2 overflow-hidden', collapsed ? 'left-16 bottom-4 w-48' : 'w-full')}>
              <div className="p-3 border-b border-border">
                <p className="text-sm font-medium text-foreground">{user?.name}</p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
              <div className="p-1">
                <button
                  onClick={cycleTheme}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-hover transition-colors text-sm text-secondary"
                >
                  {theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                  <span className="capitalize">{theme}</span>
                </button>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-hover transition-colors text-sm text-danger"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign out</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Collapse toggle */}
        <div className={clsx('border-t border-border', collapsed ? 'px-2 py-2' : 'p-3')}>
          <button
            onClick={onToggle}
            className={clsx(
              'flex items-center gap-2 text-muted hover:text-foreground transition-colors',
              collapsed ? 'justify-center w-full' : ''
            )}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            {!collapsed && <span className="text-xs">Collapse</span>}
          </button>
        </div>
      </aside>
    </>
  )
}

export default Sidebar
