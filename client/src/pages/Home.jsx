import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  Plus,
  Zap,
  TrendingUp,
  FolderOpen,
  LayoutTemplate,
  GitBranch,
  ArrowRight,
  MoreHorizontal,
  Grid3X3,
  List,
  Search,
  SlidersHorizontal,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store.js'
import { billingApi } from '../lib/billingApi.js'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Progress } from '../components/ui/Progress.jsx'
import { EmptyState } from '../components/ui/EmptyState.jsx'
import { Skeleton, SkeletonCard } from '../components/ui/Spinner.jsx'

const quickActions = [
  { icon: Plus, label: 'New project', href: '/projects/new', variant: 'primary' },
  { icon: GitBranch, label: 'Import from GitBranch', href: '/integrations', variant: 'secondary' },
  { icon: LayoutTemplate, label: 'Browse templates', href: '/templates', variant: 'secondary' },
  { icon: Zap, label: 'View usage', href: '/usage', variant: 'secondary' },
]

const templateSuggestions = [
  { title: 'SaaS Dashboard', category: 'SaaS', icon: 'chart' },
  { title: 'E-commerce Store', category: 'E-commerce', icon: 'shop' },
  { title: 'Developer Portfolio', category: 'Portfolio', icon: 'code' },
]

export function HomePage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [balance, setBalance] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [viewMode, setViewMode] = useState('grid')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    try {
      setLoading(true)
      const [balanceRes, projectsRes] = await Promise.all([
        billingApi.getBalance(),
        fetch('/api/v1/projects').then((r) => r.json()),
      ])
      setBalance(balanceRes.data.data)
      setProjects(projectsRes.data?.projects || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  const firstName = user?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8">
      {/* Welcome section */}
      <div>
        <h1 className="text-3xl font-bold text-foreground mb-2">
          {greeting}, {firstName}.
        </h1>
        <p className="text-secondary">
          What are we building today?
        </p>
      </div>

      {/* Quick create */}
      <Card className="p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">
          Describe the application you want to build
        </h2>
        <div className="flex gap-3">
          <Input
            placeholder="e.g., A task management app with kanban boards and team collaboration..."
            className="flex-1"
          />
          <Button onClick={() => navigate('/projects/new')} icon={Zap}>
            Generate
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-muted">Try:</span>
          {['E-commerce store', 'SaaS dashboard', 'Developer portfolio'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => navigate(`/projects/new?prompt=${encodeURIComponent(suggestion)}`)}
              className="text-xs text-accent hover:text-accent/80 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </Card>

      {/* Credit overview */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Credits & Subscription</CardTitle>
              <CardDescription>Track your usage and manage your plan</CardDescription>
            </div>
            <Link to="/billing" className="text-sm text-accent hover:text-accent/80 flex items-center gap-1">
              Manage
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {balance ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-muted mb-1">Current Plan</p>
                <Badge variant={balance.tier === 'PRO' ? 'success' : 'neutral'}>
                  {balance.tier}
                </Badge>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Available Credits</p>
                <p className="text-2xl font-mono font-bold text-accent">{balance.credits ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Reserved Credits</p>
                <p className="text-2xl font-mono font-bold text-amber-400">{balance.reservedCredits ?? 0}</p>
              </div>
              <div>
                <p className="text-xs text-muted mb-1">Next Reset</p>
                <p className="text-sm text-secondary">00:00 UTC</p>
              </div>
            </div>
          ) : (
            <EmptyState
              title="Unable to load credits"
              description="Credit information is currently unavailable."
            />
          )}
        </CardContent>
      </Card>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Quick actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.href}
              className={clsx(
                'flex items-center gap-3 p-4 rounded-xl border transition-all',
                action.variant === 'primary'
                  ? 'bg-accent/10 border-accent/30 hover:bg-accent/20'
                  : 'bg-elevated border-border hover:border-border-active hover:bg-hover'
              )}
            >
              <action.icon className="w-5 h-5 text-accent" />
              <span className="text-sm font-medium text-foreground">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent projects */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-foreground">Recent projects</h2>
          <div className="flex items-center gap-2">
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
            <Input
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-64"
            />
          </div>
        </div>

        {filteredProjects.length === 0 ? (
          <Card>
            <EmptyState
              icon={FolderOpen}
              title={searchQuery ? 'No projects found' : 'No projects yet'}
              description={
                searchQuery
                  ? `No projects matching "${searchQuery}"`
                  : 'Create your first project to start building with AI.'
              }
              action={
                <Button onClick={() => navigate('/projects/new')} icon={Plus}>
                  New project
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
            {filteredProjects.slice(0, 6).map((project) => (
              <ProjectCard key={project.id} project={project} viewMode={viewMode} />
            ))}
          </div>
        )}
      </div>

      {/* Explore */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-4">Explore & get inspired</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {templateSuggestions.map((template) => (
            <Link
              key={template.title}
              to={`/templates?category=${template.category}`}
              className="card card-hover p-4 flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                <LayoutTemplate className="w-5 h-5 text-accent" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{template.title}</p>
                <p className="text-xs text-muted">{template.category}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

function ProjectCard({ project, viewMode }) {
  const statusColors = {
    draft: 'neutral',
    generating: 'info',
    ready: 'success',
    failed: 'danger',
    archived: 'neutral',
  }

  if (viewMode === 'list') {
    return (
      <Card className="p-4 flex items-center justify-between hover:bg-hover transition-colors">
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
          <button className="text-muted hover:text-foreground">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden hover:shadow-card-hover transition-shadow cursor-pointer">
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

export default HomePage


