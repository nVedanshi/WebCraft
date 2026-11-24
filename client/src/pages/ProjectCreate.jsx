import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  ArrowLeft,
  Sparkles,
  Code2,
  Database,
  Server,
  Cpu,
  GitBranch,
  Settings,
  Zap,
  Check,
  ChevronDown,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Badge } from '../components/ui/Badge.jsx'

const frameworks = [
  { id: 'react-vite', name: 'React + Vite', description: 'Fast, modern React setup', icon: Code2 },
  { id: 'nextjs', name: 'Next.js', description: 'Full-stack React framework', icon: Code2 },
  { id: 'vue', name: 'Vue 3', description: 'Progressive JavaScript framework', icon: Code2 },
  { id: 'svelte', name: 'Svelte', description: 'Compile-time framework', icon: Code2 },
]

const databases = [
  { id: 'postgresql', name: 'PostgreSQL', description: 'Robust relational database', icon: Database },
  { id: 'mysql', name: 'MySQL', description: 'Popular relational database', icon: Database },
  { id: 'mongodb', name: 'MongoDB', description: 'NoSQL document database', icon: Database },
  { id: 'sqlite', name: 'SQLite', description: 'Lightweight file database', icon: Database },
  { id: 'none', name: 'None', description: 'No database', icon: Database },
]

const models = [
  { id: 'kilo-default', name: 'Kilo Default', provider: 'Kilo', description: 'Balanced performance' },
  { id: 'openai-gpt4o', name: 'GPT-4o', provider: 'OpenAI', description: 'Most capable' },
  { id: 'anthropic-claude', name: 'Claude 3.5 Sonnet', provider: 'Anthropic', description: 'Best for coding' },
  { id: 'gemini-pro', name: 'Gemini Pro', provider: 'Google', description: 'Fast and efficient' },
]

const examples = [
  'A task management app with kanban boards and team collaboration',
  'An e-commerce store with product catalog and shopping cart',
  'A SaaS analytics dashboard with charts and user management',
  'A developer portfolio with projects and blog',
]

export function ProjectCreatePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user } = useAuthStore()

  const [name, setName] = useState(searchParams.get('name') || '')
  const [description, setDescription] = useState('')
  const [prompt, setPrompt] = useState(searchParams.get('prompt') || '')
  const [framework, setFramework] = useState('react-vite')
  const [database, setDatabase] = useState('postgresql')
  const [model, setModel] = useState('kilo-default')
  const [githubRepo, setGithubRepo] = useState('')
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState(null)

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!name.trim() || !prompt.trim()) {
      setError('Project name and description are required')
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('wc_access_token')}`,
        },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim(),
          settings: {
            framework,
            database,
            model,
            githubRepo: githubRepo || undefined,
          },
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error?.message || 'Failed to create project')
      }

      // Navigate to workspace with generation prompt
      navigate(`/projects/${data.data.project.id}?generate=${encodeURIComponent(prompt)}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={() => navigate('/projects')}
          className="p-2 text-muted hover:text-foreground rounded-lg hover:bg-hover transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Create new project</h1>
          <p className="text-secondary">Describe what you want to build and we'll generate it for you</p>
        </div>
      </div>

      <form onSubmit={handleCreate} className="space-y-6">
        {error && (
          <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {/* Project details */}
        <Card>
          <CardHeader>
            <CardTitle>Project details</CardTitle>
            <CardDescription>Give your project a name and describe what you want to build</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="label">Project name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="My awesome project"
                required
              />
            </div>
            <div>
              <label className="label">Description (optional)</label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A brief description of your project"
              />
            </div>
            <div>
              <label className="label">
                What do you want to build?
                <span className="text-danger ml-1">*</span>
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={5}
                className="input resize-none"
                placeholder="Describe your application in detail. Include features, pages, and any specific requirements..."
                required
              />
              <div className="flex flex-wrap gap-2 mt-2">
                {examples.map((example) => (
                  <button
                    key={example}
                    type="button"
                    onClick={() => setPrompt(example)}
                    className="text-xs text-accent hover:text-accent/80 transition-colors px-2 py-1 rounded bg-accent/10 hover:bg-accent/20"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tech stack */}
        <Card>
          <CardHeader>
            <CardTitle>Technology stack</CardTitle>
            <CardDescription>Choose your preferred technologies</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <label className="label mb-3">Frontend framework</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {frameworks.map((fw) => (
                  <button
                    key={fw.id}
                    type="button"
                    onClick={() => setFramework(fw.id)}
                    className={clsx(
                      'p-4 rounded-lg border-2 text-left transition-all',
                      framework === fw.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-active'
                    )}
                  >
                    <fw.icon className={clsx('w-5 h-5 mb-2', framework === fw.id ? 'text-accent' : 'text-muted')} />
                    <p className="font-medium text-foreground text-sm">{fw.name}</p>
                    <p className="text-xs text-muted mt-1">{fw.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="label mb-3">Database</label>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {databases.map((db) => (
                  <button
                    key={db.id}
                    type="button"
                    onClick={() => setDatabase(db.id)}
                    className={clsx(
                      'p-3 rounded-lg border-2 text-left transition-all',
                      database === db.id
                        ? 'border-accent bg-accent/10'
                        : 'border-border hover:border-border-active'
                    )}
                  >
                    <db.icon className={clsx('w-4 h-4 mb-2', database === db.id ? 'text-accent' : 'text-muted')} />
                    <p className="font-medium text-foreground text-xs">{db.name}</p>
                  </button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI model */}
        <Card>
          <CardHeader>
            <CardTitle>AI model</CardTitle>
            <CardDescription>Select the AI model for code generation</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {models.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setModel(m.id)}
                  className={clsx(
                    'p-4 rounded-lg border-2 text-left transition-all flex items-center gap-3',
                    model === m.id
                      ? 'border-accent bg-accent/10'
                      : 'border-border hover:border-border-active'
                  )}
                >
                  <div className={clsx(
                    'w-10 h-10 rounded-lg flex items-center justify-center',
                    model === m.id ? 'bg-accent/20' : 'bg-elevated'
                  )}>
                    <Cpu className={clsx('w-5 h-5', model === m.id ? 'text-accent' : 'text-muted')} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-foreground">{m.name}</p>
                    <p className="text-xs text-muted">{m.provider} · {m.description}</p>
                  </div>
                  {model === m.id && <Check className="w-5 h-5 text-accent" />}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Advanced settings */}
        <Card>
          <button
            type="button"
            onClick={() => setAdvancedOpen(!advancedOpen)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Settings className="w-4 h-4 text-muted" />
              <span className="font-medium text-foreground">Advanced settings</span>
            </div>
            <ChevronDown className={clsx('w-4 h-4 text-muted transition-transform', advancedOpen && 'rotate-180')} />
          </button>

          {advancedOpen && (
            <CardContent className="space-y-4 mt-4 pt-4 border-t border-border">
              <div>
                <label className="label">GitHub repository (optional)</label>
                <Input
                  value={githubRepo}
                  onChange={(e) => setGithubRepo(e.target.value)}
                  placeholder="https://github.com/username/repo"
                />
                <p className="text-xs text-muted mt-1">
                  Connect a GitHub repository to sync your project
                </p>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/projects')}
          >
            Cancel
          </Button>
          <Button type="submit" loading={creating} icon={Sparkles}>
            Create & generate
          </Button>
        </div>

        {/* Info */}
        <div className="flex items-center gap-2 text-xs text-muted">
          <Zap className="w-4 h-4 text-warning" />
          <span>
            Generation will use your available credits. Estimated cost: ~5-15 credits based on complexity.
          </span>
        </div>
      </form>
    </div>
  )
}

export default ProjectCreatePage
