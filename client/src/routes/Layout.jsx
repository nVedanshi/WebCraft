import { useEffect } from 'react'
import { Outlet, useNavigate, useParams, Link } from 'react-router-dom'
import { useAuthStore } from '../store/auth.store.js'
import { useProjectStore } from '../store/project.store.js'
import { api } from '../lib/api.js'

/**
 * Layout — the main workspace shell.
 *
 * When unauthenticated, redirects to /login. When authenticated, loads the
 * user's projects and renders the project list / workspace. Child routes
 * (project detail) render inside {Outlet}.
 *
 * This is the IDE-like shell; the file explorer, editor, chat and preview
 * panels are added in Phase 3.
 */
export default function Layout() {
  const { user, accessToken, clearSession } = useAuthStore((s) => ({
    user: s.user,
    accessToken: s.accessToken,
    clearSession: s.clearSession,
  }))
  const setProjects = useProjectStore((s) => s.setProjects)
  const setCurrentProject = useProjectStore((s) => s.setCurrentProject)
  const navigate = useNavigate()

  // Mirror token into axios client
  useEffect(() => {
    if (accessToken) api.setToken(accessToken)
  }, [accessToken])

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadProjects()
  }, [user, navigate])

  async function loadProjects() {
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data.projects || [])
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Failed to load projects', err)
    }
  }

  async function handleCreateProject(e) {
    e.preventDefault()
    const form = new FormData(e.currentTarget)
    const name = form.get('name')
    if (!name) return
    try {
      const { data } = await api.post('/projects', { name, description: '' })
      setProjects((prev) => [data.data.project, ...prev])
      e.currentTarget.reset()
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Create project failed', err)
    }
  }

  if (!user) return null

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900 flex flex-col">
        <div className="h-12 flex items-center justify-between px-4 border-b border-slate-800">
          <span className="font-bold text-accent-400 text-lg">WebCraft</span>
          <button
            onClick={() => { clearSession(); localStorage.clear(); navigate('/login') }}
            className="text-xs text-slate-400 hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <div className="px-3 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          Projects
        </div>
        <div className="flex-1 overflow-y-auto py-2">
          <form onSubmit={handleCreateProject} className="px-3 mb-2 space-y-2">
            <input
              className="input"
              name="name"
              placeholder="New project name"
              required
            />
            <button className="btn w-full text-xs">Create project</button>
          </form>
          <ul className="px-2 space-y-1">
            {useProjectStore.getState().projects.map((p) => (
              <li key={p.id}>
                <button
                  onClick={() => {
                    setCurrentProject(p)
                    navigate(`/projects/${p.id}`)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition ${
                    p.id === useProjectStore.getState().currentProject?.id
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
            <span className="font-medium text-slate-200">
              {useProjectStore.getState().currentProject?.name || 'No project'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{user.email}</span>
            <Link to="/billing" className="text-xs text-accent-400 hover:text-accent-300 underline underline-offset-4">Billing</Link>
          </div>
        </header>
        <div className="flex-1 overflow-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
