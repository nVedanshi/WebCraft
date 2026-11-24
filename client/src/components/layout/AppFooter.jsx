import { Link } from 'react-router-dom'

/**
 * AppFooter — shared footer for public and authenticated layouts.
 * Copyright year is computed dynamically. Links resolve to real routes.
 */
export function AppFooter({ compact = false }) {
  const year = new Date().getFullYear()
  return (
    <footer className="border-t border-border bg-surface mt-auto">
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <p className="text-sm font-semibold text-foreground">WebCraft</p>
            <p className="text-xs text-muted mt-1">
              AI-powered full-stack application generation.
            </p>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm" aria-label="Footer">
            <Link to="/legal/terms" className="text-secondary hover:text-foreground">Terms</Link>
            <Link to="/legal/privacy" className="text-secondary hover:text-foreground">Privacy</Link>
            <Link to="/legal/security" className="text-secondary hover:text-foreground">Security</Link>
            <Link to="/docs" className="text-secondary hover:text-foreground">Documentation</Link>
            <Link to="/help" className="text-secondary hover:text-foreground">Help</Link>
            <Link to="/changelog" className="text-secondary hover:text-foreground">Changelog</Link>
          </nav>
        </div>
        {!compact && (
          <p className="text-xs text-muted mt-6">
            © {year} WebCraft. All rights reserved.
          </p>
        )}
      </div>
    </footer>
  )
}

export default AppFooter
