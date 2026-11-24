import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { ArrowLeft, AlertTriangle, Check, Sparkles, RefreshCw, Monitor, Smartphone, LogIn } from 'lucide-react'
import { templatesApi } from '../lib/templatesApi.js'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'
import { Skeleton } from '../components/ui/Spinner.jsx'
import { useAuthStore } from '../store/auth.store.js'
import { TemplatePreview } from '../components/TemplatePreview.jsx'

const PREVIEW_DEVICES = [
  { label: 'Desktop', icon: Monitor, value: 'desktop', className: 'w-[1024px]' },
  { label: 'Mobile', icon: Smartphone, value: 'mobile', className: 'w-[375px]' },
]

export function TemplateDetailPage() {
  const { templateId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [template, setTemplate] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [device, setDevice] = useState('desktop')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMode, setDialogMode] = useState(null)
  const [creating, setCreating] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await templatesApi.get(templateId)
      setTemplate(res.data.data.template)
    } catch (err) {
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [templateId])

  useEffect(() => {
    load()
  }, [load, templateId])

  if (loading) {
    return (
      <div className="p-6 space-y-6 max-w-6xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-64 w-full" />
          </div>
          <div className="lg:col-span-4">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-24 w-full" />
          </div>
        </div>
      </div>
    )
  }

  if (error || !template) {
    return (
      <div className="p-6 max-w-4xl">
        <Card>
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-error" />
            <p className="text-sm text-secondary">{error?.message ?? 'Template not found'}</p>
            <div className="flex gap-2">
              <Button variant="secondary" onClick={() => navigate('/templates')}>Back to templates</Button>
              <Button onClick={load}><RefreshCw className="h-4 w-4 mr-2" /> Retry</Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  const stack = template.stack ? Object.entries(template.stack) : []
  const files = template.files || []

  function handleUseTemplate() {
    if (!user) {
      setDialogMode('signin')
      setDialogOpen(true)
      return
    }
    setDialogMode('use')
    setDialogOpen(true)
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    const form = e.currentTarget
    const name = form.elements['project-name'].value.trim()
    if (!name) {
      alert('Project name is required')
      return
    }
    setCreating(true)
    try {
      const res = await templatesApi.use(templateId, { name, description: template.description })
      setDialogOpen(false)
      setCreating(false)
      navigate(`/projects/${res.data.data.project.id}`)
    } catch (err) {
      setCreating(false)
      alert(err?.response?.data?.error?.message || 'Failed to create project from template')
    }
  }

  const previewClass = PREVIEW_DEVICES.find((dd) => dd.value === device)?.className ?? 'w-full'

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <Link to="/templates" className="inline-flex items-center gap-2 text-sm text-secondary hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Templates
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Preview</CardTitle>
                <div className="flex gap-2">
                  {PREVIEW_DEVICES.map((d) => {
                    const Icon = d.icon
                    return (
                      <button
                        key={d.value}
                        onClick={() => setDevice(d.value)}
                        className={`p-1.5 rounded-md transition-colors ${device === d.value ? 'bg-accent text-white' : 'text-muted hover:bg-hover'}`}
                        aria-label={`Preview on ${d.label}`}
                      >
                        <Icon className="w-4 h-4" />
                      </button>
                    )
                  })}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className={`flex items-center justify-center min-h-[600px] bg-gray-100 rounded-xl border border-border overflow-hidden relative`}>
                <div className={previewClass}>
                  <TemplatePreview template={template} className="w-full h-full" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Source files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {files.slice(0, 15).map((f) => (
                  <div key={f.id} className="flex items-center justify-between px-3 py-2 text-sm rounded-lg hover:bg-hover transition-colors">
                    <span className="font-mono text-muted truncate">{f.path}</span>
                    <span className="text-xs font-medium text-accent">{f.type}</span>
                  </div>
                ))}
                {files.length > 15 && (
                  <div className="px-3 py-2 text-xs text-muted text-center italic">
                    +{files.length - 15} more files
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4 space-y-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="neutral">{template.category}</Badge>
            </div>
            <h1 className="text-2xl font-bold text-foreground">{template.name}</h1>
            <p className="text-secondary mt-1">{template.description}</p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Technology stack</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-3 text-sm">
                {stack.map(([key, value]) => (
                  <div key={key} className="flex justify-between border-b border-border pb-2 last:border-0">
                    <dt className="text-muted capitalize">{key}</dt>
                    <dd className="text-foreground font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>What&rsquo;s included</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                {files.slice(0, 8).map((f) => (
                  <li key={f.id} className="flex items-center gap-2 text-secondary">
                    <Check className="h-4 w-4 text-success flex-shrink-0" />
                    <span className="font-mono text-xs truncate">{f.path}</span>
                  </li>
                ))}
                {files.length > 8 && (
                  <li className="flex items-center gap-2 text-secondary">
                    <span className="text-xs italic">+{files.length - 8} more files</span>
                  </li>
                )}
              </ul>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <button
              onClick={handleUseTemplate}
              disabled={!user}
              className="w-full py-3 bg-accent text-white rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              {creating ? 'Creating project...' : 'Use this template'}
            </button>
            {!user && (
              <p className="text-xs text-secondary text-center">
                Sign in to use this template
              </p>
            )}
          </div>
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title={dialogMode === 'signin' ? 'Sign in required' : 'Create project from template'}
        description={dialogMode === 'signin' ? 'You need to be signed in to create a project from a template.' : undefined}
      >
        {dialogMode === 'signin' ? (
          <div className="space-y-4">
            <p className="text-secondary">You need to sign in before you can create a project from a template.</p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button onClick={() => { setDialogOpen(false); navigate('/login') }} icon={LogIn}>
                Sign in
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Project name</label>
              <input
                name="project-name"
                type="text"
                defaultValue={template.name}
                className="w-full px-3 py-2 rounded-lg border border-border bg-elevated text-foreground focus:ring-2 focus:ring-accent outline-none"
                placeholder="My project"
              />
            </div>
            <p className="text-xs text-secondary">
              A new project will be created with all template source files copied into it. Your edits won&rsquo;t affect the original template.
            </p>
            <div className="flex items-center justify-end gap-2">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit" loading={creating} icon={Sparkles}>
                Create project
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </div>
  )
}

export default TemplateDetailPage
