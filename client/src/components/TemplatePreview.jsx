import { useEffect, useState } from 'react'
import { clsx } from 'clsx'
import { templatesApi } from '../lib/templatesApi.js'
import { Skeleton } from './ui/Spinner.jsx'

function buildPreviewHtml(files) {
  const indexFile = files.find((f) => f.path === 'index.html') || files[0]
  const cssFiles = files.filter((f) => f.path.endsWith('.css'))
  const jsFiles = files.filter((f) => f.path.endsWith('.js') || f.path.endsWith('.jsx'))

  let html = indexFile.content || '<html><body></body></html>'

  // Relative script/link targets cannot resolve inside srcdoc; inline them instead.
  html = html.replace(/<script[^>]*src=[\s\S]*?<\/script>/gi, '')
  html = html.replace(/<link[^>]*>/gi, '')

  const cssInline = cssFiles.map((f) => f.content).join('\n')
  const jsInline = jsFiles.map((f) => f.content).join('\n')

  if (cssInline) {
    if (html.includes('</head>')) {
      html = html.replace('</head>', `<style>${cssInline}</style></head>`)
    } else {
      html = html.replace('<body>', `<head><style>${cssInline}</style></head><body>`)
    }
  }

  if (jsInline) {
    if (html.includes('</body>')) {
      html = html.replace('</body>', `<script>${jsInline}</script></body>`)
    } else {
      html += `<script>${jsInline}</script>`
    }
  }

  return html
}

export function TemplatePreview({ template, className = '' }) {
  const [files, setFiles] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!template) {
        setFiles(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setError(null)
      try {
        const res = await templatesApi.get(template.id)
        if (!cancelled) setFiles(res.data.data.template.files || [])
      } catch (err) {
        if (!cancelled) setError(err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [template?.id])

  if (loading) {
    return (
      <div className={clsx('flex items-center justify-center h-full w-full', className)}>
        <Skeleton className="h-8 w-32" />
      </div>
    )
  }

  if (error) {
    return (
      <div className={clsx('flex items-center justify-center h-full w-full text-secondary', className)}>
        Preview unavailable
      </div>
    )
  }

  if (!files || files.length === 0) {
    return (
      <div className={clsx('flex items-center justify-center h-full w-full text-secondary', className)}>
        No files to preview
      </div>
    )
  }

  const html = buildPreviewHtml(files)

  return (
    <iframe
      srcDoc={html}
      sandbox="allow-scripts"
      className={clsx('w-full h-full block', className)}
      title={`Preview: ${template.name}`}
    />
  )
}

export default TemplatePreview
