import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, AlertTriangle, RefreshCw } from 'lucide-react'
import { templatesApi } from '../lib/templatesApi.js'
import { Card } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Skeleton } from '../components/ui/Spinner.jsx'
import { TemplatePreview } from '../components/TemplatePreview.jsx'

export function TemplatesPage() {
  const navigate = useNavigate()
  const [templates, setTemplates] = useState([])
  const [filesByTemplate, setFilesByTemplate] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await templatesApi.list({ take: 100 })
      const data = res.data.data
      const list = data.templates || []
      setTemplates(list)

      // Fetch file paths for each template so we can list the pages it includes.
      const fileResults = await Promise.all(
        list.map((t) =>
          templatesApi
            .get(t.id)
            .then((r) => ({
              id: t.id,
              files: (r.data.data.template.files || []).map((f) => f.path),
            }))
            .catch(() => ({ id: t.id, files: [] }))
        )
      )
      const map = {}
      fileResults.forEach((fr) => {
        map[fr.id] = fr.files
      })
      setFilesByTemplate(map)
    } catch (err) {
      console.error('Failed to load templates:', err)
      setError(err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  if (loading && templates.length === 0) {
    return (
      <div className="p-6 space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-8 w-56" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-80" data-testid="skeleton-row" />
          <Skeleton className="h-80" data-testid="skeleton-row" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-error" />
            <p className="text-sm text-secondary">
              Failed to load templates. {error.message ?? 'Please try again.'}
            </p>
            <Button variant="secondary" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  if (templates.length === 0) {
    return (
      <div className="p-6 max-w-6xl mx-auto">
        <Card variant="elevated" padding="lg">
          <div className="flex flex-col items-center gap-4 py-16 text-center">
            <AlertTriangle className="h-10 w-10 text-error" />
            <p className="text-sm text-secondary">No templates available.</p>
            <Button variant="secondary" onClick={load}>
              <RefreshCw className="h-4 w-4 mr-2" /> Retry
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Templates</h1>
        <p className="text-secondary">
          Start with a real template and make it yours.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {templates.map((template) => (
          <TemplateRow
            key={template.id}
            template={template}
            files={filesByTemplate[template.id] || []}
            onStart={() => navigate(`/templates/${template.id}`)}
          />
        ))}
      </div>
    </div>
  )
}

function TemplateRow({ template, files, onStart }) {
  return (
    <Card variant="elevated" padding="none" className="border border-border overflow-hidden" data-testid="template-row">
      <div className="h-64 bg-elevated relative overflow-hidden">
        <TemplatePreview template={template} className="absolute inset-0 w-full h-full" />
      </div>
      <div className="p-4 flex flex-col">
        <div className="flex items-center gap-2 mb-2">
          <Badge variant="neutral">{template.category}</Badge>
        </div>
        <h2 className="text-lg font-bold text-foreground mb-2">
          {template.name}
        </h2>
        <p className="text-secondary mb-4 line-clamp-2">
          {template.description}
        </p>
        <div className="mb-4 flex-grow">
          <h3 className="text-xs font-semibold text-muted uppercase tracking-wider mb-2">
            Pages included
          </h3>
          <ul className="space-y-1 text-sm text-secondary font-mono">
            {files.map((path) => (
              <li key={path}>{path}</li>
            ))}
            {files.length === 0 && (
              <li className="text-xs text-muted italic">No files listed</li>
            )}
          </ul>
        </div>
        <Button onClick={onStart} className="w-full">
          Start from this template{' '}
          <ArrowRight className="w-4 h-4 ml-1" />
        </Button>
      </div>
    </Card>
  )
}

export default TemplatesPage
