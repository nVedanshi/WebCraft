import { Outlet, Link } from 'react-router-dom'
import { Command } from 'lucide-react'

/**
 * PublicLayout — layout for public pages (welcome, login, register, etc.).
 *
 * Minimal header with logo and nav, centered content.
 */
export function PublicLayout() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link to="/welcome" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
              <Command className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg text-foreground">WebCraft</span>
          </Link>

          <nav className="hidden md:flex items-center gap-8">
            <Link to="/welcome#features" className="text-sm text-secondary hover:text-foreground transition-colors">
              Features
            </Link>
            <Link to="/templates" className="text-sm text-secondary hover:text-foreground transition-colors">
              Templates
            </Link>
            <Link to="/welcome#pricing" className="text-sm text-secondary hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>

          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="text-sm text-secondary hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="btn-primary btn-sm"
            >
              Get started
            </Link>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="pt-16">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface border-t border-border mt-20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-accent flex items-center justify-center">
                  <Command className="w-5 h-5 text-white" />
                </div>
                <span className="font-bold text-lg text-foreground">WebCraft</span>
              </div>
              <p className="text-sm text-secondary">
                Imagine it. Build it. Ship it.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Product</h4>
              <ul className="space-y-2">
                <li><Link to="/welcome#features" className="text-sm text-secondary hover:text-foreground">Features</Link></li>
                <li><Link to="/templates" className="text-sm text-secondary hover:text-foreground">Templates</Link></li>
                <li><Link to="/welcome#pricing" className="text-sm text-secondary hover:text-foreground">Pricing</Link></li>
                <li><Link to="/changelog" className="text-sm text-secondary hover:text-foreground">Changelog</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Resources</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Documentation</Link></li>
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Tutorials</Link></li>
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Help center</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-4">Company</h4>
              <ul className="space-y-2">
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">About</Link></li>
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Contact</Link></li>
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Terms</Link></li>
                <li><Link to="/help" className="text-sm text-secondary hover:text-foreground">Privacy</Link></li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted">
              © {new Date().getFullYear()} WebCraft. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link to="/help" className="text-sm text-secondary hover:text-foreground">Terms</Link>
              <Link to="/help" className="text-sm text-secondary hover:text-foreground">Privacy</Link>
              <Link to="/help" className="text-sm text-secondary hover:text-foreground">Cookies</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default PublicLayout
