import { Link } from 'react-router-dom'
import { AppFooter } from '../components/layout/AppFooter.jsx'

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <p className="text-sm font-mono text-muted">404</p>
        <h1 className="text-2xl font-bold text-foreground mt-2">Page not found</h1>
        <p className="text-secondary mt-2">The page you are looking for does not exist.</p>
        <div className="flex gap-3 mt-6">
          <Link to="/" className="btn btn-primary">Go home</Link>
          <Link to="/projects" className="btn btn-secondary">Projects</Link>
        </div>
      </main>
      <AppFooter />
    </div>
  )
}

export default NotFoundPage
