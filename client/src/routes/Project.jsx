import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { useProjectStore } from '../store/project.store.js'
import { useAuthStore } from '../store/auth.store.js'
import { generationApi } from '../lib/generationApi.js'
import { useState, useEffect } from 'react'

/**
 * ProjectPage — the IDE workspace for a single project.
 *
 * Shows the project name, a generation form to create files from a
 * natural-language prompt, and a file list. The editor, chat, and preview
 * panels are added in Phase 3.
 */
export default function ProjectPage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore((s) => ({ user: s.user }))
  const currentProject = useProjectStore((s) => s.currentProject)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)

  const [prompt, setPrompt] = useState('')
  const [generating, setGenerating] = useState(false)
  const [jobId, setJobId] = useState(null)
  const [progress, setProgress] = useState([])
  const [result, setResult] = useState(null)
  const [error, setError] = useState(null)

  // Auto-trigger generation from ?generate= URL param (set by ProjectCreate)
  const [searchParams] = useSearchParams()
  const generateParam = searchParams.get('generate')

  useEffect(() => {
    if (generateParam && !generating && !jobId && !result) {
      setPrompt(generateParam)
      handleGenerate()
    }
  }, [generateParam, generating, jobId, result])

  const handleGenerate = async (e) => {
    e.preventDefault()
    if (!prompt.trim()) return
    setError(null)
    setResult(null)
    setProgress([])
    setGenerating(true)

    try {
      const { data } = await generationApi.generateAsync({
        prompt,
        projectName: currentProject?.name || 'Untitled Project',
        model: currentProject?.settings?.model,
        provider: currentProject?.settings?.provider,
        framework: currentProject?.settings?.framework,
        database: currentProject?.settings?.database,
      })

      setJobId(data.data.jobId)

      const es = generationApi.stream(data.data.jobId, (event) => {
        if (event.type === 'connected') return
        setProgress((prev) => [...prev, event])
        if (event.type === 'completed') {
          setResult(event.result)
          setGenerating(false)
          es.close()
          // Refresh project to show new files
          setCurrentProject((prev) =>
            prev ? { ...prev, name: prev.name } : prev
          )
        }
        if (event.type === 'failed') {
          setError(event.error || 'Generation failed')
          setGenerating(false)
          es.close()
        }
      })
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Generation failed')
      setGenerating(false)
    }
  }

  if (!user) return null

  const projectName = currentProject?.id === projectId ? currentProject?.name : 'Loading...'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800">
          <span className="font-bold text-accent-400 text-lg">WebCraft</span>
          <button
            onClick={() => {
              useAuthStore.getState().clearSession()
              localStorage.clear()
              navigate('/login')
            }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <div className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Projects
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <ul className="px-2 space-y-1">
            {useProjectStore.getState().projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setCurrentProject(p)
                    navigate(`/projects/${p.id}`)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    p.id === projectId
                      ? 'bg-accent/20 text-accent-200 border border-accent/40'
                      : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                  }`}
                >
                  {p.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>

      {/* Main workspace */}
      <main className="flex-1 flex flex-col overflow-hidden bg-[#020617]">
        <header className="h-12 border-b border-slate-800 bg-slate-900/80 px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-medium text-slate-200">{projectName}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{user.email}</span>
          </div>
        </header>

        <div className="flex-1 overflow-auto p-6">
          {/* Generation panel */}
          <section className="mb-6">
            <h2 className="text-lg font-bold text-slate-100 mb-4">Generate from prompt</h2>
            <form onSubmit={handleGenerate} className="space-y-3 bg-slate-900 p-4 rounded-lg border border-slate-800">
              <div>
                <label className="block text-xs font-medium text-slate-400 mb-1">Describe what to build</label>
                <textarea
                  className="w-full bg-slate-950 border border-slate-700 rounded p-2 text-sm text-slate-200 focus:ring-2 focus:ring-accent-400 outline-none"
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Build a todo app with React, Node.js, and PostgreSQL"
                />
              </div>
              <button
                className="btn w-full bg-accent-400 text-slate-950 font-bold py-2 rounded hover:bg-accent-300 disabled:opacity-50"
                disabled={generating || !prompt.trim()}
              >
                {generating ? 'Generating...' : 'Generate Project'}
              </button>
            </form>
          </section>

          {/* Progress panel */}
          {jobId && (
            <section className="mb-6">
              <h2 className="text-lg font-bold text-slate-100 mb-4">Generation Progress</h2>
              <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                {progress.length === 0 && generating && (
                  <p className="text-sm text-slate-400">Waiting for generation to start...</p>
                )}
                {progress.map((event, idx) => (
                  <div key={idx} className="mb-2 text-xs p-2 rounded bg-slate-950 border border-slate-800/50">
                    <span className="font-bold text-accent-400">{event.stage || event.type}</span>{' '}
                    <span className="text-slate-400">{event.status || ''}</span>{' '}
                    <span className="text-slate-300">{event.message || ''}</span>
                  </div>
                ))}
                {result && (
                  <div className="mt-4 p-3 rounded bg-green-500/10 border border-green-500/20">
                    <h3 className="text-sm font-bold text-green-400 mb-1">Generation Complete</h3>
                    <ul className="text-xs text-slate-300 space-y-1">
                      <li>Project: {result.projectId}</li>
                      <li>Files created: {result.filesCreated}</li>
                      <li>Build: {result.buildResult?.success ? 'passed' : 'failed'}</li>
                      <li>Repair attempts: {result.repairAttempts}</li>
                    </ul>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Error panel */}
          {error && (
            <section className="mb-6">
              <div className="p-3 rounded bg-red-500/10 border border-red-500/20">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            </section>
          )}

          <p className="text-sm text-slate-500">
            File explorer, Monaco editor, and preview come in Phase 3.
          </p>
        </div>
      </main>
    </div>
  )
}
