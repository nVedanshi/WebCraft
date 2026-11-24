import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Code2 } from 'lucide-react'
import { TemplatePreview } from '../components/TemplatePreview.jsx'
import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { templatesApi } from '../lib/templatesApi.js'

const STEPS = [
  {
    number: 1,
    title: 'Describe your site',
    body: 'Type what you want in plain language—"a portfolio with projects and contact form" or "a landing page for my consulting business."',
  },
  {
    number: 2,
    title: 'Watch it build',
    body: 'WebCraft generates the files, installs dependencies, and runs a real build to catch errors before you see them.',
  },
  {
    number: 3,
    title: 'Publish your site',
    body: 'One click deploys your site to a live URL. Share it immediately or keep editing.',
  },
]

const EXAMPLES = [
  {
    title: 'Developer Portfolio',
    description: 'Projects, about page, and contact form. Built with React and Tailwind.',
    stack: ['React', 'Tailwind', 'Vite'],
  },
  {
    title: 'SaaS Dashboard',
    description: 'Analytics, user management, and billing screens. Full-stack with API routes.',
    stack: ['React', 'Node.js', 'PostgreSQL'],
  },
  {
    title: 'E-commerce Store',
    description: 'Product catalog, cart, and checkout. Integrated with Stripe payments.',
    stack: ['React', 'Express', 'Stripe'],
  },
]

export function WelcomePage() {
  const [previewTemplate, setPreviewTemplate] = useState(null)
  const [previewLoading, setPreviewLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    templatesApi
      .list({ take: 1 })
      .then((res) => {
        if (!cancelled) {
          const templates = res.data.data.templates || []
          setPreviewTemplate(templates.length > 0 ? templates[0] : null)
        }
      })
      .catch(() => {
        if (!cancelled) setPreviewTemplate(null)
      })
      .finally(() => {
        if (!cancelled) setPreviewLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center max-w-3xl mx-auto">
            <h1 className="text-5xl md:text-6xl font-bold text-foreground mb-6 leading-tight">
              Type what you want. Get a real website.
            </h1>
            <p className="text-lg md:text-xl text-secondary max-w-2xl mx-auto mb-10">
              Describe your site in plain language. WebCraft generates the code,
              builds it, and gives you a live URL—no editor setup required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register" className="btn-primary btn-lg">
                Start building
                <ArrowRight className="w-5 h-5 ml-2" />
              </Link>
              <Link to="/templates" className="btn-secondary btn-lg">
                Browse templates
              </Link>
            </div>
          </div>

          {/* Three-step strip + live preview */}
          <div className="mt-20 grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-5 space-y-6">
              {STEPS.map((step) => (
                <div key={step.title} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <span className="text-sm font-bold text-accent">{step.number}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground">{step.title}</h3>
                    <p className="text-sm text-secondary">{step.body}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="md:col-span-7">
              <Card variant="elevated" padding="none" className="overflow-hidden">
                <div className="h-80 flex items-center justify-center">
                  {previewLoading ? (
                    <div className="flex flex-col items-center gap-4">
                      <div className="h-6 w-24 bg-elevated rounded animate-pulse" />
                      <div className="h-6 w-48 bg-elevated rounded animate-pulse" />
                    </div>
                  ) : previewTemplate ? (
                    <TemplatePreview template={previewTemplate} className="w-full h-full" />
                  ) : (
                    <div className="text-secondary text-sm">No templates available</div>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Examples */}
      <section id="examples" className="py-20 bg-surface">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              Real templates
            </h2>
            <p className="text-secondary">
              Start from a template and customize it in WebCraft.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {EXAMPLES.map((example) => (
              <div key={example.title} className="card p-6">
                <div className="h-40 bg-elevated border-b border-border flex items-center justify-center mb-4">
                  <Code2 className="w-10 h-10 text-muted" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  {example.title}
                </h3>
                <p className="text-sm text-secondary mb-4">
                  {example.description}
                </p>
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {example.stack.map((tech) => (
                    <span key={tech} className="badge-neutral badge text-xs">
                      {tech}
                    </span>
                  ))}
                </div>
                <Link to="/templates" className="text-accent hover:text-accent-hover font-medium text-sm flex items-center gap-1">
                  View template
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-secondary">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Code2 className="w-5 h-5 text-accent" />
            <span className="font-semibold text-foreground">WebCraft</span>
          </div>
          <div className="flex gap-6 text-sm text-secondary">
            <a
              href="TODO(owner): paste github url here"
              className="hover:text-accent-hover transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              GitHub
            </a>
            <a
              href="TODO(owner): paste changelog url here"
              className="hover:text-accent-hover transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Changelog
            </a>
            <a
              href="TODO(owner): paste community url here"
              className="hover:text-accent-hover transition-colors"
              target="_blank"
              rel="noopener noreferrer"
            >
              Community
            </a>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default WelcomePage
