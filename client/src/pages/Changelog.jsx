import { Link } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Sparkles,
  Bug,
  Zap,
  Shield,
  Code2,
  ArrowRight,
  Calendar,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const releases = [
  {
    version: '2.0.0',
    date: '2026-11-16',
    title: 'WebCraft 2.0 — Complete Frontend Redesign',
    changes: [
      { type: 'feature', text: 'Complete design system with dark/light/system themes' },
      { type: 'feature', text: 'New home dashboard with credit overview and quick actions' },
      { type: 'feature', text: 'Full IDE workspace with Monaco editor, file explorer, and AI chat' },
      { type: 'feature', text: 'Project creation wizard with stack and model selection' },
      { type: 'feature', text: 'Billing and usage pages with real backend integration' },
      { type: 'feature', text: 'Templates gallery with categories and search' },
      { type: 'feature', text: 'Integrations page for GitHub, AI providers, and Razorpay' },
      { type: 'feature', text: 'Settings pages for profile, security, preferences' },
      { type: 'improvement', text: 'Responsive layouts across desktop, tablet, and mobile' },
      { type: 'improvement', text: 'Accessible focus states and keyboard navigation' },
      { type: 'improvement', text: 'Loading skeletons, empty states, and error handling' },
    ],
  },
  {
    version: '1.0.0',
    date: '2026-11-12',
    title: 'Initial Release',
    changes: [
      { type: 'feature', text: 'Authentication system (register, login, logout)' },
      { type: 'feature', text: 'Project and file management' },
      { type: 'feature', text: 'AI code generation pipeline' },
      { type: 'feature', text: 'Credit and billing system' },
    ],
  },
]

const typeConfig = {
  feature: { icon: Sparkles, color: 'text-success', bg: 'bg-success/10', label: 'Feature' },
  improvement: { icon: Zap, color: 'text-info', bg: 'bg-info/10', label: 'Improvement' },
  bugfix: { icon: Bug, color: 'text-warning', bg: 'bg-warning/10', label: 'Bug Fix' },
  security: { icon: Shield, color: 'text-danger', bg: 'bg-danger/10', label: 'Security' },
}

export function ChangelogPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Changelog</h1>
        <p className="text-secondary">Track what's new and improved in WebCraft</p>
      </div>

      <div className="space-y-8">
        {releases.map((release) => (
          <Card key={release.version}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <h2 className="text-xl font-bold text-foreground">{release.version}</h2>
                    <Badge variant="neutral">{release.date}</Badge>
                  </div>
                  <CardTitle>{release.title}</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {release.changes.map((change, i) => {
                  const config = typeConfig[change.type]
                  const Icon = config.icon
                  return (
                    <li key={i} className="flex items-start gap-3">
                      <div className={clsx('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', config.bg)}>
                        <Icon className={clsx('w-4 h-4', config.color)} />
                      </div>
                      <div>
                        <span className="text-sm text-secondary">{change.text}</span>
                        <span className={clsx('ml-2 text-xs px-1.5 py-0.5 rounded', config.bg, config.color)}>
                          {config.label}
                        </span>
                      </div>
                    </li>
                  )
                })}
              </ul>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-6 text-center">
          <p className="text-secondary mb-4">
            Want to stay updated on new features?
          </p>
          <Link to="/register" className="btn-primary">
            Get started
            <ArrowRight className="w-4 h-4 ml-2" />
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChangelogPage
