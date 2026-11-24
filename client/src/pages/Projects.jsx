import { useState, useEffect } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Plus,
  FolderOpen,
  Grid3X3,
  List,
  Search,
  MoreHorizontal,
  ArrowLeft,
  Settings,
  GitBranch,
  ExternalLink,
  Save,
  File,
  Folder,
  ChevronRight,
  Code2,
  Eye,
  Terminal,
  RefreshCw,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Card } from '../components/ui/Card.jsx'

export function ProjectsPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    loadProjects()
  }, [])

  async function loadProjects() {
    try {
      setLoading(true)
      const res = await fetch('/api/v1/projects')
      const data = await res.json()
      setProjects(data.data?.projects || [])
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }

  const filteredProjects = projects.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesFilter = filter === 'all' || p.status === filter
    return matchesSearch && matchesFilter
  })

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-secondary">Manage your applications</p>
        </div>
        <Button onClick={() => navigate('/projects/new')} icon={Plus}>
          New project
        </Button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <Input
          placeholder="Search projects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 max-w-md"
        />
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="input w-auto"
        >
          <option value="all">All statuses</option>
          <option value="draft">Draft</option>
          <option value="generating">Generating</option>
          <option value="ready">Ready</option>
          <option value="failed">Failed</option>
          <option value="archived">Archived</option>
        </select>
        <div className="flex rounded-lg border border-border overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={clsx(
              'p-2 transition-colors',
              viewMode === 'grid' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-secondary'
            )}
          >
            <Grid3X3 className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={clsx(
              'p-2 transition-colors',
              viewMode === 'list' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-secondary'
            )}
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Projects */}
      {filteredProjects.length === 0 ? (
        <Card>
          <EmptyState
            icon={FolderOpen}
            title="No projects yet"
            description="Create your first project to start building with AI."
            action={
              <Button onClick={() => navigate('/projects/new')} icon={Plus}>
                Create project
              </Button>
            }
          />
        </Card>
      ) : (
        <div
          className={clsx(
            viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-3 gap-4' : 'space-y-2'
          )}
        >
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} viewMode={viewMode} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({ project, viewMode }) {
  const navigate = useNavigate()
  const statusColors = {
    draft: 'neutral',
    generating: 'info',
    ready: 'success',
    failed: 'danger',
    archived: 'neutral',
  }

  if (viewMode === 'list') {
    return (
      <Card
        className="p-4 flex items-center justify-between hover:bg-hover transition-colors cursor-pointer"
        onClick={() => navigate(`/projects/${project.id}`)}
      >
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
            <FolderOpen className="w-5 h-5 text-accent" />
          </div>
          <div>
            <h3 className="text-sm font-medium text-foreground">{project.name}</h3>
            <p className="text-xs text-muted">{project.description || 'No description'}</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant={statusColors[project.status] || 'neutral'}>{project.status}</Badge>
          {project.GitBranchConnected && (
            <GitBranch className="w-4 h-4 text-muted" />
          )}
          <span className="text-xs text-muted">
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </Card>
    )
  }

  return (
    <Card
      className="overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer"
      onClick={() => navigate(`/projects/${project.id}`)}
    >
      <div className="h-32 bg-gradient-to-br from-accent/20 to-accent-cyan/20 flex items-center justify-center">
        <FolderOpen className="w-12 h-12 text-accent/50" />
      </div>
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-foreground truncate">{project.name}</h3>
          <button className="text-muted hover:text-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm text-secondary mb-3 line-clamp-2">
          {project.description || 'No description'}
        </p>
        <div className="flex items-center justify-between">
          <Badge variant={statusColors[project.status] || 'neutral'}>{project.status}</Badge>
          <span className="text-xs text-muted">
            {new Date(project.updatedAt).toLocaleDateString()}
          </span>
        </div>
      </div>
    </Card>
  )
}

export default ProjectsPage

