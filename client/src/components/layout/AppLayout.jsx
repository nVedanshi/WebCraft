import { useState } from 'react'
import { Outlet, Navigate } from 'react-router-dom'
import { clsx } from 'clsx'
import { Sidebar } from './Sidebar.jsx'
import { Header } from './Header.jsx'
import { AppFooter } from './AppFooter.jsx'
import { ToastContainer } from '../ui/Toast.jsx'
import { useAuthStore } from '../../store/auth.store.js'

/**
 * AppLayout — main authenticated application shell.
 *
 * Combines Sidebar + Header + content area.
 * Protects routes: redirects to /login if not authenticated.
 */
export function AppLayout() {
  const { user } = useAuthStore()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <div className={sidebarCollapsed ? 'hidden lg:block' : 'hidden lg:block'}>
        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        />
      </div>

      {/* Mobile sidebar overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 h-full">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main content */}
      <div
        className={clsx(
          'min-h-screen flex flex-col transition-all duration-300',
          sidebarCollapsed ? 'lg:ml-16' : 'lg:ml-64'
        )}
      >
        <Header
          onMenuToggle={() => setMobileMenuOpen(true)}
          sidebarCollapsed={sidebarCollapsed}
        />
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
        <AppFooter />
      </div>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  )
}

export default AppLayout
