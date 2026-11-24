import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  GitBranch as Github,
  Zap,
  Brain,
  CreditCard,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Star,
  Trash2,
  Plus,
  Folder,
  Code,
  X,
  ArrowRight,
} from 'lucide-react'
import { integrationsApi } from '../lib/integrationsApi.js'
import { billingApi } from '../lib/billingApi.js'
import { api } from '../lib/api.js'
import { Card, CardContent } from '../components/ui/Card.jsx'
import { Button } from '../components/ui/Button.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Dialog } from '../components/ui/Dialog.jsx'
import { ConfirmDialog } from '../components/ui/Dialog.jsx'

const PROVIDER_META = {
  openai: { name: 'OpenAI', icon: Brain, description: 'Use GPT models for AI code generation.' },
  anthropic: { name: 'Anthropic', icon: Brain, description: 'Use Claude models for AI code generation.' },
  gemini: { name: 'Google Gemini', icon: Zap, description: 'Use Gemini models for AI code generation.' },
  kilo: { name: 'Kilo AI Gateway', icon: Zap, description: 'Access multiple AI providers through one gateway.' },
}

const BILLING_MODE_LABELS = {
  system: 'WebCraft credits',
  byok: 'Your own API key (BYOK)',
}

const BILLING_MODE_DESC = {
  system: 'Uses server-side provider key. WebCraft credits are deducted per generation.',
  byok: 'Uses your own API key. The provider bills you directly. No WebCraft credits deducted.',
}

export function IntegrationsPage() {
  const [searchParams] = useSearchParams()
  const [providers, setProviders] = useState([])
  const [github, setGithub] = useState({ configured: false, connected: false })
  const [repos, setRepos] = useState([])
  const [branches, setBranches] = useState([])
  const [selectedRepo, setSelectedRepo] = useState(null)
  const [selectedBranch, setSelectedBranch] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [projectGitHubLink, setProjectGitHubLink] = useState(null)
  const [payments, setPayments] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [notice, setNotice] = useState(null)
  const [busy, setBusy] = useState('')

  const [keyDialog, setKeyDialog] = useState(null)
  const [apiKey, setApiKey] = useState('')
  const [billingModeDialog, setBillingModeDialog] = useState(null)
  const [billingMode, setBillingModeState] = useState('system')

  const [repoDialog, setRepoDialog] = useState(null)
  const [repoName, setRepoName] = useState('')
  const [repoDescription, setRepoDescription] = useState('')
  const [repoPrivate, setRepoPrivate] = useState(false)

  const [connectDialog, setConnectDialog] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [pRes, gRes, payRes] = await Promise.allSettled([
        integrationsApi.getProviders(),
        integrationsApi.githubStatus(),
        billingApi.getPaymentsConfig(),
      ])
      if (pRes.status === 'fulfilled') setProviders(pRes.value.data.data.providers)
      if (gRes.status === 'fulfilled') setGithub(gRes.value.data.data)
      if (payRes.status === 'fulfilled') setPayments(payRes.value.data.data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadRepos = useCallback(async () => {
    try {
      const res = await integrationsApi.githubRepos()
      setRepos(res.data.data.repos || [])
    } catch (err) {
      console.error('Failed to load repos', err)
    }
  }, [])

  const loadProjects = useCallback(async () => {
    setProjectsLoading(true)
    try {
      const { data } = await api.get('/projects')
      setProjects(data.data.projects || [])
    } catch (err) {
      console.error('Failed to load projects', err)
      setProjects([])
    } finally {
      setProjectsLoading(false)
    }
  }, [])

  const loadProjectLink = useCallback(async (projectId) => {
    if (!projectId) {
      setProjectGitHubLink(null)
      return
    }
    try {
      const res = await integrationsApi.githubProjectInfo(projectId)
      setProjectGitHubLink(res.data.data.link || null)
    } catch (err) {
      // No existing link yet; that is a normal first-time state.
      setProjectGitHubLink(null)
    }
  }, [])

  useEffect(() => {
    load()
    loadRepos()
    const projectParam = searchParams.get('projectId')
    if (projectParam) {
      setSelectedProjectId(projectParam)
      loadProjectLink(projectParam)
    } else {
      loadProjects()
    }
    const gh = searchParams.get('github')
    if (gh === 'connected') setNotice('GitHub connected.')
    if (gh === 'error') setError('GitHub connection failed. Please try again.')
  }, [load, loadRepos, loadProjects, loadProjectLink, searchParams])

  async function saveKey() {
    if (!keyDialog) return
    setBusy(keyDialog)
    setError(null)
    setNotice(null)
    try {
      await integrationsApi.saveKey(keyDialog, apiKey.trim())
      setNotice(`${PROVIDER_META[keyDialog].name} connected and verified.`)
      setKeyDialog(null)
      setApiKey('')
      await load()
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Key validation failed')
    } finally {
      setBusy('')
    }
  }

  async function testProvider(provider) {
    setBusy(provider)
    setError(null)
    setNotice(null)
    try {
      await integrationsApi.testProvider(provider)
      setNotice(`${PROVIDER_META[provider].name} connection is healthy.`)
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Connection test failed')
    } finally {
      setBusy('')
    }
  }

  async function makeDefault(provider) {
    setBusy(provider)
    try {
      await integrationsApi.setDefault(provider)
      await load()
      setNotice(`${PROVIDER_META[provider].name} is now the default provider.`)
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to set default')
    } finally {
      setBusy('')
    }
  }

  async function disconnectProvider(provider) {
    setBusy(provider)
    try {
      await integrationsApi.disconnectProvider(provider)
      await load()
      setNotice(`${PROVIDER_META[provider].name} disconnected.`)
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to disconnect')
    } finally {
      setBusy('')
    }
  }

  async function setBillingMode(provider, mode) {
    setBusy(provider)
    try {
      await integrationsApi.setBillingMode(provider, mode)
      await load()
      setNotice(`${PROVIDER_META[provider].name} billing mode set to ${BILLING_MODE_LABELS[mode]}.`)
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to set billing mode')
    } finally {
      setBusy('')
    }
  }

  async function connectGithub() {
    setError(null)
    if (!github.configured) {
      setError('GitHub OAuth is not configured on this deployment.')
      return
    }
    setBusy('github')
    try {
      const res = await integrationsApi.githubAuthorize()
      window.location.href = res.data.data.url
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to start GitHub OAuth')
      setBusy('')
    }
  }

  async function disconnectGithub() {
    setBusy('github')
    try {
      await integrationsApi.githubDisconnect()
      await load()
      setRepos([])
      setSelectedRepo(null)
      setSelectedBranch(null)
      setProjectGitHubLink(null)
      setNotice('GitHub disconnected.')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to disconnect')
    } finally {
      setBusy('')
    }
  }

  async function handleProjectSelect(projectId) {
    setSelectedProjectId(projectId)
    setSelectedRepo(null)
    setSelectedBranch(null)
    setBranches([])
    setProjectGitHubLink(null)
    loadProjectLink(projectId)
  }

  async function handleRepoSelect(repo) {
    setSelectedRepo(repo)
    setSelectedBranch(repo.defaultBranch)
    try {
      const res = await integrationsApi.githubBranches(repo.owner, repo.name)
      setBranches(res.data.data.branches || [])
    } catch (err) {
      console.error('Failed to load branches', err)
    }
  }

  async function handleCreateRepo() {
    if (!repoName.trim()) return
    setBusy('create-repo')
    try {
      const res = await integrationsApi.githubCreateRepo({
        name: repoName.trim(),
        description: repoDescription.trim() || undefined,
        private: repoPrivate,
      })
      const newRepo = {
        id: res.data.data.id,
        name: res.data.data.name,
        owner: res.data.data.fullName.split('/')[0],
        fullName: res.data.data.fullName,
        private: res.data.data.private,
        defaultBranch: res.data.data.defaultBranch,
        url: res.data.data.url,
      }
      setRepos([newRepo, ...repos])
      setSelectedRepo(newRepo)
      setSelectedBranch(newRepo.defaultBranch)
      setRepoDialog(null)
      setRepoName('')
      setRepoDescription('')
      setRepoPrivate(false)
      setNotice(`Repository ${newRepo.fullName} created.`)
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to create repository')
    } finally {
      setBusy('')
    }
  }

  async function handleConnectProject() {
    if (!selectedProjectId) {
      setError('Select a WebCraft project to link to GitHub.')
      return
    }
    if (!selectedRepo || !selectedBranch) return
    setBusy('connect')
    try {
      const res = await integrationsApi.githubConnectProject(selectedProjectId, {
        owner: selectedRepo.owner,
        repo: selectedRepo.name,
        branch: selectedBranch,
      })
      setProjectGitHubLink(res.data.data)
      setConnectDialog(null)
      setNotice(`Connected to ${selectedRepo.fullName} (${selectedBranch}).`)
    } catch (err) {
      const serverMsg = err?.response?.data?.error?.message || ''
      const code = err?.response?.data?.error?.code || ''
      if (code === 'GITHUB_NOT_CONFIGURED' || serverMsg.includes('not configured')) {
        setError('GitHub OAuth is not configured on this deployment. Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET on the server.')
      } else {
        setError(serverMsg || 'Failed to connect project')
      }
    } finally {
      setBusy('')
    }
  }

  async function handleDisconnectProject() {
    if (!selectedProjectId || !projectGitHubLink) return
    setBusy('disconnect-project')
    try {
      await integrationsApi.githubDisconnectProject(selectedProjectId)
      setProjectGitHubLink(null)
      setSelectedRepo(null)
      setSelectedBranch(null)
      setNotice('Project disconnected from GitHub.')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to disconnect')
    } finally {
      setBusy('')
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-8 w-48 bg-elevated rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-44 bg-elevated rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Integrations</h1>
          <p className="text-secondary">Connect your tools and AI providers</p>
        </div>
        <Button variant="secondary" onClick={load}>
          <RefreshCw className="h-4 w-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && (
        <div className="p-3 bg-error/10 border border-error/30 rounded-lg text-error text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}
      {notice && (
        <div className="p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm flex items-center gap-2">
          <CheckCircle className="h-4 w-4" /> {notice}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* GitHub */}
        <IntegrationCard
          icon={Github}
          name="GitHub"
          description="Connect your GitHub account, select a repository, and link WebCraft projects."
          connected={github.connected}
          statusLabel={github.connected ? 'Connected' : github.configured ? 'Not connected' : 'Configuration Required'}
          actions={
            <div className="space-y-2">
              {github.connected ? (
                <>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={loadRepos} disabled={busy === 'github'}>
                      <RefreshCw className="w-4 h-4 mr-1" /> Repos
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={disconnectGithub} disabled={busy === 'github'}>
                      <Trash2 className="w-4 h-4 mr-1" /> Disconnect
                    </Button>
                  </div>

                  {/* Project selector */}
                  <div className="mt-3">
                    <label className="label text-xs">WebCraft project</label>
                    {selectedProjectId ? (
                      <div className="flex items-center gap-2 text-xs text-secondary mb-1">
                        <span>Selected:</span>
                        <span className="font-medium truncate">
                          {projects.find((p) => p.id === selectedProjectId)?.name ||
                            selectedProjectId}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedProjectId(null)}
                          disabled={busy === 'connect'}
                        >
                          <X className="w-3 h-3" /> Clear
                        </Button>
                      </div>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted mb-1">
                          Select a WebCraft project to link to GitHub.
                        </p>
                        {projectsLoading ? (
                          <div className="h-8 w-32 bg-elevated rounded animate-pulse" />
                        ) : (
                          <select
                            className="input w-full text-xs"
                            onChange={(e) => {
                              const id = e.target.value
                              if (id) handleProjectSelect(id)
                            }}
                            disabled={projectsLoading || busy === 'github'}
                          >
                            <option value="">Select a project</option>
                            {projects.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        )}
                      </>
                    )}
                  </div>
                  {repos.length > 0 && selectedProjectId && (
                    <>
                      <div className="mt-3">
                        <label className="label text-xs">Repository</label>
                        <select
                          value={selectedRepo?.fullName || ''}
                          onChange={(e) => {
                            const repo = repos.find((r) => r.fullName === e.target.value)
                            if (repo) handleRepoSelect(repo)
                          }}
                          className="input w-full text-xs"
                          disabled={busy === 'github'}
                        >
                          <option value="">Select a repository</option>
                          {repos.map((r) => (
                            <option key={r.fullName} value={r.fullName}>
                              {r.fullName} {r.private ? '(private)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                      {selectedRepo && (
                        <>
                          <div className="mt-2">
                            <label className="label text-xs">Branch</label>
                            <select
                              value={selectedBranch || ''}
                              onChange={(e) => setSelectedBranch(e.target.value)}
                              className="input w-full text-xs"
                              disabled={busy === 'github'}
                            >
                              {branches.map((b) => (
                                <option key={b.name} value={b.name}>
                                  {b.name}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="mt-2 flex gap-2">
                            <Button size="sm" className="flex-1" onClick={() => setRepoDialog(true)}>
                              <Plus className="w-4 h-4 mr-1" /> New repo
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={() => setConnectDialog(true)}
                              disabled={!selectedBranch || busy === 'github'}
                            >
                              <ArrowRight className="w-4 h-4 mr-1" /> Link project
                            </Button>
                          </div>
                          {projectGitHubLink && selectedProjectId && (
                            <div className="mt-2 p-2 rounded-lg bg-elevated border border-border text-xs">
                              <div className="flex items-center gap-2 mb-1">
                                <Github className="w-4 h-4 text-accent" />
                                <span className="font-medium">{projectGitHubLink.owner}/{projectGitHubLink.repo}</span>
                              </div>
                              <p className="text-[10px] text-muted">
                                Branch: {projectGitHubLink.branch}{projectGitHubLink.lastSyncedAt ? ` · Last synced: ${new Date(projectGitHubLink.lastSyncedAt).toLocaleString()}` : ''}
                              </p>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full mt-1 text-error"
                                onClick={handleDisconnectProject}
                                disabled={busy === 'disconnect-project'}
                              >
                                <Trash2 className="w-3 h-3 mr-1" /> Disconnect project
                              </Button>
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </>
              ) : (
                <Button size="sm" className="w-full" onClick={connectGithub} disabled={!github.configured || busy === 'github'}>
                  {github.configured ? 'Connect GitHub' : 'Configuration Required'}
                </Button>
              )}
            </div>
          }
        />

        {/* AI providers */}
        {providers.map((p) => {
          const meta = PROVIDER_META[p.provider]
          if (!meta) return null
          return (
            <IntegrationCard
              key={p.provider}
              icon={meta.icon}
              name={meta.name}
              description={meta.description}
              connected={p.connected}
              badge={p.isDefault ? 'Default' : null}
              statusLabel={p.connected ? 'Connected' : 'Configuration Required'}
              actions={
                <div className="space-y-2">
              {p.connected ? (
                <>
                  <div className="flex gap-2">
                    <Button variant="secondary" size="sm" className="flex-1" onClick={() => testProvider(p.provider)} disabled={busy === p.provider}>
                      Test
                    </Button>
                    <Button variant="ghost" size="sm" className="flex-1" onClick={() => disconnectProvider(p.provider)} disabled={busy === p.provider}>
                      Remove
                    </Button>
                  </div>
                  <div className="mt-2">
                    <label className="label text-xs">Billing mode</label>
                    <select
                      value={p.billingMode || 'system'}
                      onChange={(e) => setBillingMode(p.provider, e.target.value)}
                      className="input w-full text-xs"
                      disabled={busy === p.provider}
                    >
                      <option value="system">{BILLING_MODE_LABELS.system}</option>
                      <option value="byok">{BILLING_MODE_LABELS.byok}</option>
                    </select>
                    <p className="text-[10px] text-muted mt-1">{BILLING_MODE_DESC[p.billingMode || 'system']}</p>
                  </div>
                  {!p.isDefault && (
                    <Button variant="ghost" size="sm" className="w-full" onClick={() => makeDefault(p.provider)} disabled={busy === p.provider}>
                      <Star className="w-4 h-4 mr-2" /> Set default
                    </Button>
                  )}
                </>
              ) : (
                    <Button size="sm" className="w-full" onClick={() => { setKeyDialog(p.provider); setApiKey('') }}>
                      Add API key
                    </Button>
                  )}
                </div>
              }
            />
          )
        })}

        {/* Razorpay */}
        <IntegrationCard
          icon={CreditCard}
          name="Razorpay"
          description="Process payments for credit purchases and subscriptions."
          connected={payments?.configured}
          statusLabel={payments?.configured ? 'Connected' : 'Configuration Required'}
          actions={
            <p className="text-xs text-muted">
              {payments?.configured
                ? `Configured (${payments.currency})`
                : 'Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET on the server.'}
            </p>
          }
        />
      </div>

      <div className="p-4 bg-info/10 border border-info/30 rounded-lg">
        <p className="text-sm text-info">
          API keys are validated against the provider, encrypted at rest with AES-256-GCM, and never sent to the browser.
        </p>
      </div>

      <Dialog
        open={Boolean(keyDialog)}
        onClose={() => setKeyDialog(null)}
        title={keyDialog ? `Connect ${PROVIDER_META[keyDialog].name}` : ''}
        description="The key is verified against the provider before it is stored."
        footer={
          <>
            <Button variant="ghost" onClick={() => setKeyDialog(null)}>Cancel</Button>
            <Button onClick={saveKey} disabled={!apiKey.trim() || busy === keyDialog}>
              {busy === keyDialog ? 'Verifying…' : 'Verify & save'}
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="provider-api-key">API key</label>
        <Input
          id="provider-api-key"
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="sk-..."
          autoComplete="off"
        />
      </Dialog>

      <Dialog
        open={Boolean(repoDialog)}
        onClose={() => setRepoDialog(null)}
        title="Create GitHub Repository"
        description="Create a new repository under your GitHub account."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRepoDialog(null)}>Cancel</Button>
            <Button onClick={handleCreateRepo} disabled={!repoName.trim() || busy === 'create-repo'}>
              {busy === 'create-repo' ? 'Creating…' : 'Create repository'}
            </Button>
          </>
        }
      >
        <label className="label" htmlFor="repo-name">Repository name</label>
        <Input
          id="repo-name"
          value={repoName}
          onChange={(e) => setRepoName(e.target.value)}
          placeholder="my-webcraft-project"
          autoFocus
        />
        <label className="label mt-3" htmlFor="repo-description">Description (optional)</label>
        <Input
          id="repo-description"
          value={repoDescription}
          onChange={(e) => setRepoDescription(e.target.value)}
          placeholder="My WebCraft project"
        />
        <div className="mt-3 flex items-center gap-2">
          <input
            id="repo-private"
            type="checkbox"
            checked={repoPrivate}
            onChange={(e) => setRepoPrivate(e.target.checked)}
          />
          <label className="text-sm text-secondary" htmlFor="repo-private">Private repository</label>
        </div>
      </Dialog>

      <Dialog
        open={Boolean(connectDialog)}
        onClose={() => setConnectDialog(null)}
        title="Link Project to GitHub"
        description="Connect the current WebCraft project to the selected repository and branch."
        footer={
          <>
            <Button variant="ghost" onClick={() => setConnectDialog(null)}>Cancel</Button>
            <Button onClick={handleConnectProject} disabled={!selectedBranch || busy === 'connect'}>
              {busy === 'connect' ? 'Connecting…' : 'Link project'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Folder className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">{selectedRepo?.fullName}</span>
          </div>
          <div className="flex items-center gap-2">
            <Github className="w-4 h-4 text-secondary" />
            <span className="text-sm font-medium">{selectedBranch}</span>
          </div>
          <p className="text-xs text-muted">
            Once linked, you can push, pull, and sync project files from the Workspace.
          </p>
        </div>
      </Dialog>
    </div>
  )
}

function IntegrationCard({ icon: Icon, name, description, connected, statusLabel, actions, badge }) {
  return (
    <Card className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="w-12 h-12 rounded-lg bg-elevated flex items-center justify-center">
          <Icon className="w-6 h-6 text-accent" />
        </div>
        <div className="flex items-center gap-2">
          {badge && <Badge variant="success">{badge}</Badge>}
          {connected ? (
            <Badge variant="success"><CheckCircle className="w-3 h-3 mr-1" /> Connected</Badge>
          ) : (
            <Badge variant="neutral"><AlertCircle className="w-3 h-3 mr-1" /> {statusLabel}</Badge>
          )}
        </div>
      </div>
      <h3 className="font-semibold text-foreground mb-1">{name}</h3>
      <p className="text-sm text-secondary mb-4">{description}</p>
      {actions}
    </Card>
  )
}

export default IntegrationsPage
