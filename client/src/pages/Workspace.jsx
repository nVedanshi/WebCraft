import {
  useState, useEffect, useCallback, useRef, useMemo,
} from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import { clsx } from 'clsx'
import {
  Save, RefreshCw, Eye, Code2, Terminal, Search, File, Folder,
  FolderOpen, X, Plus, Settings, GitBranch, Download, Play, Square,
  Maximize2, Minimize2, PanelLeft, PanelRight, PanelBottom,
  MoreHorizontal, Pencil, Trash2, FilePlus, FolderPlus, ChevronRight,
  ChevronDown, Sparkles, Send, Bot, User, Copy, Check, AlertCircle,
  Loader2, Monitor, Tablet, Smartphone, ExternalLink, RotateCcw,
  Undo2, Redo2, LayoutList, FileText, Clock, GitCompare, ArrowRight,
  ArrowUp, ExternalLink as ExternalLinkIcon,
} from 'lucide-react'
import { useAuthStore } from '../store/auth.store.js'
import { Button } from '../components/ui/Button.jsx'
import { Input } from '../components/ui/Input.jsx'
import { Badge } from '../components/ui/Badge.jsx'
import { Dialog, ConfirmDialog } from '../components/ui/Dialog.jsx'
import { Progress } from '../components/ui/Progress.jsx'
import { api } from '../lib/api.js'
import { generationApi } from '../lib/generationApi.js'
import { deploymentApi } from '../lib/deploymentApi.js'

/**
 * WorkspacePage — the integrated developer environment for a project.
 *
 * Features:
 *   - Multi-file tabbed editor with Monaco (JS/JSX/TS/TSX + more)
 *   - File explorer with full CRUD (list, open, create, rename, delete, refresh)
 *   - Dirty-state tracking per file and save via PUT /files
 *   - AI chat panel that applies actual file modifications via POST /generation/modify
 *   - Live preview in an isolated iframe (/api/v1/preview/:projectId) with
 *     desktop/tablet/mobile viewports, build-error display, and rebuild
 *   - Generation progress (async job polling)
 *   - Build errors and diagnostics panel
 *   - Project settings (name/description)
 *   - GitHub connect / publish actions
 *   - Revision history (project versions)
 *   - Deploy/publish controls (publish, republish, unpublish, rollback)
 *   - Keyboard shortcuts: Ctrl+S save, Ctrl+P preview, Ctrl+/ AI focus,
 *     Ctrl+Tab next tab, Ctrl+W close tab
 *
 * All API calls go through the axios `api` client (centralized auth + token
 * refresh). Generated code never runs in the main Express process — preview
 * is built in a sandbox and served as static files.
 */
export function WorkspacePage() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { user } = useAuthStore()

  // ── Project state ──
  const [project, setProject] = useState(null)
  const [projectLoading, setProjectLoading] = useState(true)
  const [revisionId, setRevisionId] = useState(null)

  // ── Files ──
  const [files, setFiles] = useState([])
  const [openTabs, setOpenTabs] = useState([])
  const [activePath, setActivePath] = useState(null)
  const [fileContents, setFileContents] = useState({})
  const [dirtyFiles, setDirtyFiles] = useState(new Set())
  const [fileErrors, setFileErrors] = useState({})

  // ── UI state ──
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [revisionsOpen, setRevisionsOpen] = useState(false)
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(true)

  const [fileSearch, setFileSearch] = useState('')
  const [previewDevice, setPreviewDevice] = useState('desktop')
  const [previewBuildStatus, setPreviewBuildStatus] = useState(null)
  const [previewError, setPreviewError] = useState(null)

  // ── GitHub sync state ──
  const [githubLink, setGithubLink] = useState(null)
  const [githubLoading, setGithubLoading] = useState(false)
  const [syncStatus, setSyncStatus] = useState(null)
  const [syncProgress, setSyncProgress] = useState(0)
  const [conflicts, setConflicts] = useState([])
  const [conflictDialogOpen, setConflictDialogOpen] = useState(false)
  const [selectedConflictResolution, setSelectedConflictResolution] = useState('ours')

  // ── Deploy/publish state ──
  const [deployLink, setDeployLink] = useState(null)
  const [deployLoading, setDeployLoading] = useState(false)
  const [deployStatus, setDeployStatus] = useState(null)
  const [deployHistory, setDeployHistory] = useState([])
  const [publishDialogOpen, setPublishDialogOpen] = useState(false)
  const [publishMode, setPublishMode] = useState('publish')
  const [publishCommitMessage, setPublishCommitMessage] = useState('')
  const [rollbackDialogOpen, setRollbackDialogOpen] = useState(false)
  const [rollbackVersionId, setRollbackVersionId] = useState('')
  const [rollbackVersionLabel, setRollbackVersionLabel] = useState('')

  const editorRef = useRef(null)
  const chatEndRef = useRef(null)
  const tabContainerRef = useRef(null)

  // ── AI chat state ──
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)

  // ── Generation state ──
  const [generating, setGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState(0)
  const [generationStage, setGenerationStage] = useState('')

  // ── File operation dialogs ──
  const [showNewFileDialog, setShowNewFileDialog] = useState(false)
  const [showRenameDialog, setShowRenameDialog] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [fileOperationName, setFileOperationName] = useState('')
  const [fileOperationType, setFileOperationType] = useState('file')

  // ── Project settings dialog ──
  const [showSettingsDialog, setShowSettingsDialog] = useState(false)
  const [settingsName, setSettingsName] = useState('')
  const [settingsDescription, setSettingsDescription] = useState('')

  // ── Misc status ──
  const [busy, setBusy] = useState('')
  const [notice, setNotice] = useState(null)
  const [error, setError] = useState(null)

  // Mark a file dirty/clean
  const setModified = useCallback((path, modified) => {
    setDirtyFiles((prev) => {
      const next = new Set(prev)
      if (modified) next.add(path)
      else next.delete(path)
      return next
    })
  }, [])

  // Scroll an open tab into view (no-op if the tab bar isn't mounted yet)
  const scrollTabIntoView = useCallback((path) => {
    requestAnimationFrame(() => {
      const el = tabContainerRef.current?.querySelector(`[data-tab-path="${CSS.escape(path)}"]`)
      el?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
    })
  }, [])

  // Auto-dismiss notices
  useEffect(() => {
    if (!notice) return
    const t = setTimeout(() => setNotice(null), 4000)
    return () => clearTimeout(t)
  }, [notice])

  const activeFile = useMemo(() => {
    if (!activePath) return null
    return files.find((f) => f.path === activePath) || null
  }, [files, activePath])

  const activeContent = useMemo(() => {
    if (!activePath) return ''
    return fileContents[activePath] ?? activeFile?.content ?? ''
  }, [activePath, fileContents, activeFile])

  const isDirty = useCallback((path) => dirtyFiles.has(path), [dirtyFiles])

  // ── Lifecycle ──
  // Load everything once per project (NOT on every tab/panel change)
  useEffect(() => {
    loadProject()
    loadGitHubStatus()
    loadDeployStatus()
    loadDeployHistory()
  }, [projectId])

  // Start generation exactly once when arriving from "Create & generate"
  const generationStartedRef = useRef(false)
  useEffect(() => {
    const generateParam = searchParams.get('generate')
    if (!generateParam || generationStartedRef.current) return
    generationStartedRef.current = true
    // Remove the param so a refresh doesn't trigger (and bill) another generation
    setSearchParams({}, { replace: true })
    startGeneration(generateParam)
  }, [projectId])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 's':
            e.preventDefault()
            handleSaveActive()
            break
          case 'p':
            e.preventDefault()
            setPreviewOpen(!previewOpen)
            break
          case '/':
            e.preventDefault()
            setAiPanelOpen(!aiPanelOpen)
            break
          case 'w':
            e.preventDefault()
            if (activePath) closeTab(activePath)
            break
          case 'Tab':
            e.preventDefault()
            nextTab()
            break
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activePath, previewOpen, aiPanelOpen, openTabs])

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatMessages])

  // ── Project loading ──
  async function loadProject() {
    setProjectLoading(true)
    setLoading(true)
    try {
      const res = await api.get(`/projects/${projectId}`)
      const data = res.data.data
      setProject(data.project)
      setSettingsName(data.project.name || '')
      setSettingsDescription(data.project.description || '')
      setRevisionId(data.project.revisionId)
      setFiles(data.files || [])
      setFileContents({})
      setDirtyFiles(new Set())
      if (data.files?.length > 0) {
        const first = data.files[0]
        setActivePath(first.path)
        setFileContents((prev) => ({ ...prev, [first.path]: first.content || '' }))
        openTab(first.path, first.content || '')
      }
      checkPreviewStatus()
    } catch (err) {
      console.error('Failed to load project', err)
    } finally {
      setProjectLoading(false)
      setLoading(false)
    }
  }

  async function checkPreviewStatus() {
    try {
      const res = await api.get(`/preview/${projectId}/status`)
      setPreviewBuildStatus(res.data.data)
      setPreviewError(res.data.data.error || null)
    } catch (err) {
      setPreviewBuildStatus(null)
    }
  }

  async function rebuildPreview() {
    try {
      const res = await api.post(`/preview/${projectId}/rebuild`)
      setPreviewBuildStatus(res.data.data)
      setPreviewError(res.data.data.error || null)
    } catch (err) {
      console.error('Failed to rebuild preview', err)
    }
  }

  // ── Tab management ──
  function openTab(path, content = null) {
    if (openTabs.includes(path)) {
      setActivePath(path)
      return
    }
    setOpenTabs((prev) => [...prev, path])
    setActivePath(path)
    if (content !== null) {
      setFileContents((prev) => ({ ...prev, [path]: content }))
    } else {
      const file = files.find((f) => f.path === path)
      setFileContents((prev) => ({ ...prev, [path]: file?.content || '' }))
    }
    setModified(path, false)
    scrollTabIntoView(path)
  }

  function closeTab(path) {
    setOpenTabs((prev) => prev.filter((p) => p !== path))
    if (activePath === path) {
      const remaining = openTabs.filter((p) => p !== path)
      setActivePath(remaining.length > 0 ? remaining[0] : null)
    }
  }

  function closeOtherTabs(path) {
    setOpenTabs((prev) => prev.filter((p) => p === path))
    if (activePath !== path) setActivePath(path)
  }

  function closeTabsToRight(path) {
    const idx = openTabs.indexOf(path)
    if (idx === -1) return
    setOpenTabs((prev) => prev.slice(0, idx + 1))
  }

  function nextTab() {
    const idx = openTabs.indexOf(activePath || '')
    const next = (idx + 1) % openTabs.length
    if (openTabs[next]) setActivePath(openTabs[next])
  }

  // ── File CRUD ──
  async function handleFileClick(file) {
    openTab(file.path, file.content || '')
  }

  function handleContentChange(value) {
    if (!activePath) return
    setFileContents((prev) => ({ ...prev, [activePath]: value || '' }))
    setModified(activePath, true)
  }

  async function handleSaveActive() {
    if (!activePath || !isDirty(activePath)) return
    const content = fileContents[activePath]
    try {
      const res = await api.put(
        `/projects/${projectId}/files/${encodeURIComponent(activePath)}`,
        { content }
      )
      setModified(activePath, false)
      setFiles((prev) => prev.map((f) =>
        f.path === activePath ? { ...f, content, updatedAt: res.data.data.file?.updatedAt } : f
      ))
      setRevisionId(res.data.data.file?.revisionId || revisionId)
      checkPreviewStatus()
    } catch (err) {
      console.error('Failed to save', err)
    }
  }

  async function handleSaveAll() {
    const dirty = Array.from(dirtyFiles)
    for (const path of dirty) {
      setActivePath(path)
      await handleSaveActive()
    }
  }

  async function handleCreateFile() {
    if (!fileOperationName.trim()) return
    try {
      const res = await api.post(`/projects/${projectId}/files`, {
        path: fileOperationType === 'folder' ? `${fileOperationName}/` : fileOperationName,
        type: fileOperationType,
        content: '',
      })
      const newFile = res.data.data.file
      setFiles((prev) => [...prev, newFile])
      openTab(newFile.path, newFile.content || '')
      setShowNewFileDialog(false)
      setFileOperationName('')
      checkPreviewStatus()
    } catch (err) {
      console.error('Failed to create', err)
    }
  }

  async function handleRenameFile() {
    if (!activeFile || !fileOperationName.trim()) return
    try {
      await api.patch(
        `/projects/${projectId}/files/${encodeURIComponent(activeFile.path)}`,
        { newPath: fileOperationName }
      )
      setShowRenameDialog(false)
      setFileOperationName('')
      loadProject()
      checkPreviewStatus()
    } catch (err) {
      console.error('Failed to rename', err)
    }
  }

  async function handleDeleteFile() {
    if (!activeFile) return
    try {
      await api.delete(
        `/projects/${projectId}/files/${encodeURIComponent(activeFile.path)}`
      )
      setFiles((prev) => prev.filter((f) => f.id !== activeFile.id))
      closeTab(activeFile.path)
      setActivePath(null)
      setFileContents({})
      setDirtyFiles(new Set())
      setShowDeleteConfirm(false)
      checkPreviewStatus()
    } catch (err) {
      console.error('Failed to delete', err)
    }
  }

  async function handleRefreshFiles() {
    loadProject()
    checkPreviewStatus()
  }

  // ── Generation ──
  async function startGeneration(prompt) {
    setGenerating(true)
    setGenerationProgress(0)
    setGenerationStage('Initializing...')

    try {
      // projectId tells the server to fill THIS project instead of creating a new one
      const res = await generationApi.generateAsync({
        projectId,
        prompt,
      })

      if (res.data?.data?.jobId) {
        pollGeneration(res.data.data.jobId)
      } else {
        setGenerating(false)
        setError('Generation did not start (no job id returned).')
      }
    } catch (err) {
      console.error('Generation failed', err)
      setGenerating(false)
      setError(err?.response?.data?.error?.message || 'Generation failed to start')
    }
  }

  async function pollGeneration(jobId) {
    let failures = 0
    const interval = setInterval(async () => {
      try {
        const res = await generationApi.getJob(jobId)
        // Server shape: { jobId, status, progress, returnValue, failedReason }
        const job = res.data?.data
        failures = 0
        if (!job) return

        setGenerationProgress(typeof job.progress === 'number' ? job.progress : 0)
        setGenerationStage(
          job.status === 'waiting' || job.status === 'delayed' ? 'Queued...' : 'Generating your project...'
        )

        if (job.status === 'completed') {
          clearInterval(interval)
          setGenerating(false)
          setGenerationProgress(100)
          setNotice('Project generated.')
          await loadProject()
          setPreviewOpen(true)
          rebuildPreview()
        } else if (job.status === 'failed') {
          clearInterval(interval)
          setGenerating(false)
          setError(job.failedReason || 'Generation failed')
        }
      } catch (err) {
        console.error('Poll failed', err)
        failures += 1
        if (failures >= 5) {
          clearInterval(interval)
          setGenerating(false)
          setError('Lost connection while checking generation status.')
        }
      }
    }, 1500)

    return () => clearInterval(interval)
  }

  // ── AI Chat ──
  async function handleChatSubmit(e) {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = { role: 'user', content: chatInput }
    setChatMessages((prev) => [...prev, userMessage])
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await generationApi.modify({
        projectId,
        instruction: chatInput,
        expectedRevisionId: revisionId || undefined,
      })

      const data = res.data.data
      if (data) {
        const assistantMessage = {
          role: 'assistant',
          content: data.message || 'Changes applied successfully.',
        }
        setChatMessages((prev) => [...prev, assistantMessage])

        if (data.filesModified || data.filesCreated || data.filesDeleted) {
          loadProject()
          checkPreviewStatus()
          setTimeout(() => rebuildPreview(), 1000)
        }

        if (data.fileChanges) {
          for (const change of data.fileChanges) {
            setFileContents((prev) => ({ ...prev, [change.path]: change.content || '' }))
            if (change.path === activePath) {
              setModified(activePath, false)
            }
          }
        }
      }
    } catch (err) {
      const msg = err?.response?.data?.error?.message
      setChatMessages((prev) => [
        ...prev,
        { role: 'assistant', content: msg ? `Sorry: ${msg}` : 'Sorry, I encountered an error applying your changes. Please try again.' },
      ])
    } finally {
      setChatLoading(false)
    }
  }

  // ── Project settings ──
  async function handleSaveSettings() {
    try {
      await api.patch(`/projects/${projectId}`, {
        name: settingsName,
        description: settingsDescription,
      })
      setProject((prev) => ({ ...prev, name: settingsName, description: settingsDescription }))
      setShowSettingsDialog(false)
    } catch (err) {
      console.error('Failed to update settings', err)
    }
  }

  // ── GitHub / publishing ──
  async function loadGitHubStatus() {
    if (!projectId) return
    setGithubLoading(true)
    try {
      const res = await api.get(`/integrations/github/project/${projectId}`)
      setGithubLink(res.data.data.link || null)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to load GitHub status', err)
      }
      setGithubLink(null)
    } finally {
      setGithubLoading(false)
    }
  }

  async function handleConnectGitHub() {
    setBusy('github')
    try {
      const res = await api.post('/integrations/github/connect', { projectId })
      setGithubLink(res.data.data)
      await loadProject()
      setNotice('Project linked to GitHub repository.')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to connect GitHub')
    } finally {
      setBusy('')
    }
  }

  async function handleDisconnectGitHub() {
    setBusy('github')
    try {
      await api.delete('/integrations/github/project', { data: { projectId } })
      setGithubLink(null)
      await loadProject()
      setNotice('Project disconnected from GitHub.')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to disconnect')
    } finally {
      setBusy('')
    }
  }

  async function handlePushToGitHub() {
    setBusy('push')
    setSyncProgress(0)
    try {
      const res = await api.post('/integrations/github/publish', { projectId })
      const data = res.data.data
      setSyncProgress(100)
      setSyncStatus(data.status)
      await loadGitHubStatus()
      await loadProject()
      setNotice(`Pushed ${data.filesChanged} files to GitHub.`)
    } catch (err) {
      setSyncStatus('FAILED')
      setError(err?.response?.data?.error?.message || 'Push failed')
    } finally {
      setBusy('')
    }
  }

  async function handlePullFromGitHub() {
    setBusy('pull')
    setSyncProgress(0)
    try {
      const res = await api.post('/integrations/github/pull', { projectId })
      const data = res.data.data
      setSyncProgress(100)
      setSyncStatus(data.status)
      await loadGitHubStatus()
      await loadProject()
      setNotice(`Pulled ${data.filesChanged} files from GitHub.`)
    } catch (err) {
      setSyncStatus('FAILED')
      setError(err?.response?.data?.error?.message || 'Pull failed')
    } finally {
      setBusy('')
    }
  }

  async function handleSyncWithGitHub() {
    setBusy('sync')
    setSyncProgress(0)
    try {
      const res = await api.post('/integrations/github/sync', { projectId })
      const data = res.data.data
      setSyncProgress(100)
      setSyncStatus(data.status)
      setConflicts(data.conflicts || [])
      if (data.status === 'CONFLICT' && data.conflicts && data.conflicts.length > 0) {
        setConflictDialogOpen(true)
      } else {
        await loadGitHubStatus()
        await loadProject()
        setNotice(`Synced ${data.filesChanged} files with GitHub.`)
      }
    } catch (err) {
      setSyncStatus('FAILED')
      setError(err?.response?.data?.error?.message || 'Sync failed')
    } finally {
      setBusy('')
    }
  }

  async function handleResolveConflict(path, resolution) {
    setBusy('resolve')
    try {
      const res = await api.post('/integrations/github/sync/resolve', { projectId, path, resolution })
      const data = res.data.data
      setConflicts(data.conflicts || [])
      if (data.resolved) {
        setConflictDialogOpen(false)
        await loadGitHubStatus()
        await loadProject()
        setNotice('All conflicts resolved and synced.')
      } else {
        setNotice(`Resolved ${path}. ${data.remaining} conflict(s) remaining.`)
      }
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Failed to resolve conflict')
    } finally {
      setBusy('')
    }
  }

  // ── Deploy/publish handlers ──
  async function loadDeployStatus() {
    if (!projectId) return
    setDeployLoading(true)
    try {
      const res = await deploymentApi.getStatus(projectId)
      setDeployLink(res.data.data.deployment || null)
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error('Failed to load deploy status', err)
      }
      setDeployLink(null)
    } finally {
      setDeployLoading(false)
    }
  }

  async function loadDeployHistory() {
    if (!projectId) return
    try {
      const res = await deploymentApi.getHistory(projectId)
      setDeployHistory(res.data.data.deployments || [])
    } catch (err) {
      console.error('Failed to load deploy history', err)
    }
  }

  async function handlePublishProject() {
    setDeployLoading(true)
    try {
      const res = await deploymentApi.publish(projectId, {
        commitMessage: publishCommitMessage.trim() || undefined,
      })
      const data = res.data.data
      setDeployLink(data.deployment)
      setDeployStatus(data.deployment.status)
      await loadDeployHistory()
      await loadProject()
      setNotice(`Project published to ${data.deployment.url}`)
      setPublishDialogOpen(false)
      setPublishCommitMessage('')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Publish failed')
    } finally {
      setDeployLoading(false)
    }
  }

  async function handleRepublishProject() {
    setDeployLoading(true)
    try {
      const res = await deploymentApi.republish(projectId, {
        commitMessage: publishCommitMessage.trim() || undefined,
      })
      const data = res.data.data
      setDeployLink(data.deployment)
      setDeployStatus(data.deployment.status)
      await loadDeployHistory()
      await loadProject()
      setNotice(`Project republished to ${data.deployment.url}`)
      setPublishDialogOpen(false)
      setPublishCommitMessage('')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Republish failed')
    } finally {
      setDeployLoading(false)
    }
  }

  async function handleUnpublishProject() {
    setDeployLoading(true)
    try {
      await deploymentApi.unpublish(projectId)
      setDeployLink(null)
      setDeployStatus(null)
      await loadProject()
      setNotice('Project unpublished')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Unpublish failed')
    } finally {
      setDeployLoading(false)
    }
  }

  async function handleRollbackProject() {
    if (!rollbackVersionId) return
    setDeployLoading(true)
    try {
      const res = await deploymentApi.rollback(projectId, rollbackVersionId)
      const data = res.data.data
      setDeployLink(data.deployment)
      setDeployStatus(data.deployment.status)
      await loadDeployHistory()
      await loadProject()
      setNotice(`Rolled back to ${rollbackVersionLabel}`)
      setRollbackDialogOpen(false)
      setRollbackVersionId('')
      setRollbackVersionLabel('')
    } catch (err) {
      setError(err?.response?.data?.error?.message || 'Rollback failed')
    } finally {
      setDeployLoading(false)
    }
  }

  // ── Revisions ──
  async function loadRevisions() {
    try {
      const res = await api.get(`/projects/${projectId}/versions`)
      return res.data.data?.versions || []
    } catch (err) {
      console.error('Failed to load revisions', err)
      return []
    }
  }

  // ── Rendering ──
  const filteredFiles = useMemo(() =>
    files.filter((f) =>
      f.path.toLowerCase().includes(fileSearch.toLowerCase())
    )
  , [files, fileSearch])

  const hasDirty = dirtyFiles.size > 0

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-secondary mb-4">Project not found</p>
          <Button onClick={() => navigate('/projects')}>Back to projects</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top toolbar */}
      <div className="h-12 bg-surface border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1.5 text-muted hover:text-foreground rounded hover:bg-hover"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={clsx(
              'p-1.5 rounded hover:bg-hover',
              aiPanelOpen ? 'text-accent' : 'text-muted'
            )}
          >
            <Sparkles className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-foreground truncate max-w-xs">
            {project.name}
          </span>
          {hasDirty && <span className="text-xs text-amber-400 ml-1">● unsaved</span>}
          <button
            onClick={handleSaveAll}
            disabled={!hasDirty}
            className={clsx(
              'p-1.5 rounded hover:bg-hover',
              hasDirty ? 'text-accent' : 'text-muted'
            )}
            title="Save all"
          >
            <Save className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          {githubLink && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-success/10 border border-success/20">
                <GitBranch className="w-3 h-3 text-success" />
                <span className="text-xs font-medium text-success">{githubLink.owner}/{githubLink.repo}</span>
              </div>
              <span className="text-xs text-muted">{githubLink.branch}</span>
              {githubLink.lastSyncedAt && (
                <span className="text-xs text-muted">· synced {new Date(githubLink.lastSyncedAt).toLocaleString()}</span>
              )}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePullFromGitHub}
                  disabled={busy === 'pull' || githubLoading}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Pull
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handlePushToGitHub}
                  disabled={busy === 'push' || githubLoading}
                >
                  <ArrowRight className="w-3 h-3 mr-1" /> Push
                </Button>
                <Button
                  size="sm"
                  onClick={handleSyncWithGitHub}
                  disabled={busy === 'sync' || githubLoading}
                >
                  <RefreshCw className="w-3 h-3 mr-1" /> Sync
                </Button>
              </div>
            </div>
          )}
          {!githubLink && !githubLoading && (
            <Button size="sm" onClick={handleConnectGitHub} disabled={busy === 'github'}>
              <GitBranch className="w-3 h-3 mr-1" /> Connect GitHub
            </Button>
          )}
          {githubLoading && (
            <Button size="sm" disabled>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Connecting…
            </Button>
          )}
          {syncStatus === 'CONFLICT' && (
            <Badge variant="error" className="text-xs ml-2">
              <AlertCircle className="w-3 h-3 mr-1" /> Conflicts
            </Badge>
          )}
          {syncProgress > 0 && syncProgress < 100 && (
            <Progress value={syncProgress} size="sm" className="ml-2 h-1.5" />
          )}

          {/* Deploy section */}
          {deployLink && (
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded bg-success/10 border border-success/20">
                <ExternalLinkIcon className="w-3 h-3 text-success" />
                <span className="text-xs font-medium text-success">Live</span>
              </div>
              <span className="text-xs text-muted truncate max-w-xs">{deployLink.url}</span>
              <button
                onClick={() => window.open(deployLink.url, '_blank')}
                className="p-1 text-muted hover:text-foreground hover:bg-hover"
                title="Open deployed site"
              >
                <ExternalLinkIcon className="w-3 h-3" />
              </button>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setPublishMode('republish'); setPublishDialogOpen(true) }}
                  disabled={busy === 'deploy'}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Republish
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setRollbackDialogOpen(false)}
                  onMouseDown={() => setRollbackDialogOpen(true)}
                  disabled={busy === 'deploy'}
                >
                  <RotateCcw className="w-3 h-3 mr-1" /> Rollback
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleUnpublishProject}
                  disabled={busy === 'deploy'}
                >
                  <X className="w-3 h-3 mr-1" /> Unpublish
                </Button>
              </div>
            </div>
          )}
          {!deployLink && (
            <Button
              size="sm"
              onClick={() => { setPublishMode('publish'); setPublishDialogOpen(true) }}
              disabled={busy === 'deploy' || !files.length}
            >
              <Play className="w-3 h-3 mr-1" /> Publish
            </Button>
          )}
          {deployLoading && (
            <Button size="sm" disabled>
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Deploying…
            </Button>
          )}
          {deployStatus === 'FAILED' && (
            <Badge variant="error" className="text-xs ml-2">
              <AlertCircle className="w-3 h-3 mr-1" /> Deploy failed
            </Badge>
          )}
          <button
            onClick={() => setPreviewOpen(!previewOpen)}
            className={clsx(
              'p-1.5 rounded hover:bg-hover',
              previewOpen ? 'text-accent' : 'text-muted'
            )}
          >
            <Eye className="w-4 h-4" />
          </button>
          <button
            onClick={() => setTerminalOpen(!terminalOpen)}
            className={clsx(
              'p-1.5 rounded hover:bg-hover',
              terminalOpen ? 'text-accent' : 'text-muted'
            )}
          >
            <Terminal className="w-4 h-4" />
          </button>
          <button
            onClick={() => setDiagnosticsOpen(!diagnosticsOpen)}
            className={clsx(
              'p-1.5 rounded hover:bg-hover',
              diagnosticsOpen ? 'text-accent' : 'text-muted'
            )}
            title="Build errors"
          >
            <AlertCircle className="w-4 h-4" />
          </button>
          <button className="p-1.5 text-muted hover:text-foreground rounded hover:bg-hover">
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Generation progress */}
      {(notice || error) && (
        <div
          className={clsx(
            'px-4 py-2 text-xs flex items-center justify-between border-b',
            error ? 'bg-red-900/20 border-red-500/30 text-red-300' : 'bg-success/10 border-success/20 text-success'
          )}
        >
          <span>{error || notice}</span>
          <button onClick={() => { setError(null); setNotice(null) }} className="ml-4 opacity-70 hover:opacity-100">
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {generating && (
        <div className="bg-accent/10 border-b border-accent/20 px-4 py-2">
          <div className="flex items-center gap-3">
            <Loader2 className="w-4 h-4 text-accent animate-spin" />
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-accent">{generationStage}</span>
                <span className="text-xs text-accent">{generationProgress}%</span>
              </div>
              <Progress value={generationProgress} variant="default" size="sm" />
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* File explorer */}
        {sidebarOpen && (
          <div className="w-64 bg-surface border-r border-border flex flex-col">
            <div className="p-3 border-b border-border">
              <div className="flex items-center gap-2 mb-2">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted" />
                  <input
                    type="text"
                    value={fileSearch}
                    onChange={(e) => setFileSearch(e.target.value)}
                    placeholder="Search files..."
                    className="w-full pl-8 pr-2 py-1.5 text-xs bg-elevated border border-border rounded focus:outline-none focus:border-accent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    setFileOperationType('file')
                    setShowNewFileDialog(true)
                  }}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-hover rounded"
                  title="New file"
                >
                  <FilePlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => {
                    setFileOperationType('folder')
                    setShowNewFileDialog(true)
                  }}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-hover rounded"
                  title="New folder"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRefreshFiles}
                  className="p-1.5 text-muted hover:text-foreground hover:bg-hover rounded"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {filteredFiles.map((file) => {
                const isOpen = openTabs.includes(file.path)
                const isDirty = dirtyFiles.has(file.path)
                return (
                  <button
                    key={file.id}
                    onClick={() => handleFileClick(file)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded transition-colors group',
                      activePath === file.path
                        ? 'bg-accent/20 text-accent'
                        : 'text-secondary hover:text-foreground hover:bg-hover'
                    )}
                  >
                    {file.type === 'folder' ? (
                      <Folder className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : (
                      <File className="w-3.5 h-3.5 flex-shrink-0" />
                    )}
                    <span className="truncate flex-1 text-left">{file.path}</span>
                    {isDirty && (
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                    )}
                    {isOpen && (
                      <Check className="w-3 h-3 text-success flex-shrink-0" />
                    )}
                    <div className="hidden group-hover:flex items-center gap-0.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setFileOperationName(file.path)
                          setShowRenameDialog(true)
                        }}
                        className="p-0.5 text-muted hover:text-foreground"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setShowDeleteConfirm(true)
                        }}
                        className="p-0.5 text-muted hover:text-danger"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </button>
                )
              })}
              {filteredFiles.length === 0 && (
                <div className="text-center py-4 text-xs text-muted">
                  No files. Create your first file to get started.
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex-1 flex flex-col bg-background">
          {openTabs.length > 0 ? (
            <div ref={tabContainerRef} className="h-10 bg-surface border-b border-border flex overflow-x-auto px-2 py-1">
              {openTabs.map((path) => {
                const isActive = activePath === path
                const isDirty = dirtyFiles.has(path)
                const file = files.find((f) => f.path === path)
                return (
                  <div
                    key={path}
                    data-tab-path={path}
                    onClick={() => setActivePath(path)}
                    onContextMenu={(e) => {
                      e.preventDefault()
                    }}
                    className={clsx(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm transition-colors cursor-pointer',
                      isActive
                        ? 'bg-background border-b-2 border-accent'
                        : 'hover:bg-hover'
                    )}
                  >
                    <File className="w-3 h-3 flex-shrink-0" />
                    <span className={clsx('truncate', isActive ? 'text-foreground font-medium' : 'text-secondary')}>
                      {path.split('/').pop()}
                    </span>
                    {isDirty && <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        closeTab(path)
                      }}
                      className="ml-1 opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-foreground hover:bg-hover rounded"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )
              })}
              <button
                onClick={() => setShowSettingsDialog(true)}
                className="ml-2 p-1.5 text-muted hover:text-foreground hover:bg-hover rounded"
                title="Project settings"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          ) : null}

          {/* Editor */}
          <div className="flex-1 flex flex-col bg-background">
            {activeFile ? (
              <>
                <div className="flex-1 relative">
                  <Editor
                    height="100%"
                    defaultLanguage="javascript"
                    language={getLanguage(activeFile.path)}
                    value={activeContent}
                    onChange={handleContentChange}
                    theme="vs-dark"
                    options={{
                      minimap: { enabled: false },
                      fontSize: 13,
                      lineNumbers: 'on',
                      wordWrap: 'on',
                      automaticLayout: true,
                      scrollBeyondLastLine: false,
                      tabSize: 2,
                    }}
                  />
                  {fileErrors[activePath] && (
                    <div className="absolute bottom-0 left-0 right-0 p-2 bg-red-900/20 border border-red-500/30">
                      <div className="flex items-start gap-2 text-xs text-red-300">
                        <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="font-semibold text-red-200 mb-0.5">Build error</div>
                          <div className="text-red-400 break-all">{fileErrors[activePath]}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center text-muted">
                  <Code2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Select a file to start editing</p>
                </div>
              </div>
            )}
          </div>

          {/* AI panel */}
          {aiPanelOpen && (
            <div className="w-80 bg-surface border-l border-border flex flex-col">
              <div className="h-12 border-b border-border flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-accent" />
                  <span className="text-sm font-medium text-foreground">AI Assistant</span>
                </div>
                <button
                  onClick={() => setAiPanelOpen(false)}
                  className="text-muted hover:text-foreground"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 ? (
                  <div className="text-center text-muted py-12">
                    <Bot className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm mb-2">Ask AI to help with your code</p>
                    <p className="text-xs">Try: "Add a login page" or "Fix this error"</p>
                  </div>
                ) : (
                  <>
                    {chatMessages.map((msg, i) => (
                      <div
                        key={i}
                        className={clsx(
                          'flex gap-2',
                          msg.role === 'user' ? 'justify-end' : 'justify-start'
                        )}
                      >
                        {msg.role === 'assistant' && (
                          <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                            <Bot className="w-4 h-4 text-accent" />
                          </div>
                        )}
                        <div
                          className={clsx(
                            'max-w-[80%] rounded-lg px-3 py-2 text-sm break-words',
                            msg.role === 'user'
                              ? 'bg-accent text-white'
                              : 'bg-elevated border border-border text-foreground'
                          )}
                        >
                          {msg.content}
                        </div>
                        {msg.role === 'user' && (
                          <div className="w-7 h-7 rounded-full bg-elevated flex items-center justify-center flex-shrink-0">
                            <User className="w-4 h-4 text-secondary" />
                          </div>
                        )}
                      </div>
                    ))}
                    {chatLoading && (
                      <div className="flex gap-2">
                        <div className="w-7 h-7 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-4 h-4 text-accent" />
                        </div>
                        <div className="bg-elevated border border-border rounded-lg px-3 py-2">
                          <Loader2 className="w-4 h-4 text-accent animate-spin" />
                        </div>
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </>
                )}
              </div>

              <div className="p-3 border-t border-border">
                <form onSubmit={handleChatSubmit} className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Ask AI to modify code..."
                    className="flex-1 px-3 py-2 text-sm bg-elevated border border-border rounded-lg focus:outline-none focus:border-accent"
                    disabled={chatLoading || !chatInput.trim()}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatInput.trim()}
                    className="p-2 bg-accent text-white rounded-lg hover:bg-accent/90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Terminal panel */}
        {terminalOpen && (
          <div className="h-40 bg-surface border-t border-border">
            <div className="h-8 border-b border-border flex items-center px-4">
              <span className="text-xs font-medium text-foreground">Terminal</span>
              <button
                onClick={() => setTerminalOpen(false)}
                className="ml-auto text-muted hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="p-2 h-32 overflow-y-auto bg-black/30 font-mono text-xs text-green-400">
              <p>$ npm run dev</p>
              <p className="text-secondary">Server running on http://localhost:3000</p>
            </div>
          </div>
        )}

        {/* Preview panel */}
        {previewOpen && (
          <div className="h-96 bg-white border-t border-border flex flex-col">
            <div className="h-8 bg-surface border-b border-border flex items-center justify-between px-4">
              <div className="flex items-center gap-2">
                <Eye className="w-3.5 h-3.5 text-accent" />
                <span className="text-xs font-medium text-foreground">Preview</span>
                <Badge variant="success">Live</Badge>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setPreviewDevice('desktop')}
                  className={clsx(
                    'p-1 rounded',
                    previewDevice === 'desktop' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground'
                  )}
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('tablet')}
                  className={clsx(
                    'p-1 rounded',
                    previewDevice === 'tablet' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground'
                  )}
                >
                  <Tablet className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice('mobile')}
                  className={clsx(
                    'p-1 rounded',
                    previewDevice === 'mobile' ? 'bg-accent/20 text-accent' : 'text-muted hover:text-foreground'
                  )}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => rebuildPreview()}
                  className="p-1 text-muted hover:text-foreground"
                  title="Rebuild preview"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button className="p-1 text-muted hover:text-foreground">
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewOpen(false)}
                  className="p-1 text-muted hover:text-foreground"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-slate-100 relative overflow-hidden">
              {previewError && (
                <div className="absolute inset-0 bg-red-50 flex items-center justify-center p-4">
                  <div className="max-w-md text-center text-red-800">
                    <AlertCircle className="w-6 h-6 mx-auto mb-2 text-red-600" />
                    <h3 className="font-semibold mb-1">Preview build failed</h3>
                    <p className="text-xs text-red-600 mb-3">{previewError}</p>
                    <button
                      onClick={rebuildPreview}
                      className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded hover:bg-red-200"
                    >
                      Rebuild
                    </button>
                  </div>
                </div>
              )}
              <div
                className={clsx(
                  'bg-white shadow-lg transition-all',
                  previewDevice === 'desktop' && 'w-full h-full',
                  previewDevice === 'tablet' && 'w-[768px] h-full mx-auto',
                  previewDevice === 'mobile' && 'w-[375px] h-full mx-auto'
                )}
              >
                <iframe
                  src={`/api/v1/preview/${projectId}`}
                  className="w-full h-full border-0"
                  title="Project preview"
                  sandbox="allow-scripts allow-same-origin"
                />
              </div>
              {!previewError && previewBuildStatus?.error && (
                <div className="absolute bottom-4 left-4 right-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start gap-2 text-xs text-amber-800">
                    <AlertCircle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="font-semibold text-amber-900 mb-0.5">Build issue</div>
                      <div className="text-amber-700 break-all">{previewBuildStatus.error}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* New file dialog */}
      <Dialog
        open={showNewFileDialog}
        onClose={() => setShowNewFileDialog(false)}
        title={fileOperationType === 'folder' ? 'New folder' : 'New file'}
        description={`Enter the ${fileOperationType === 'folder' ? 'folder' : 'file'} path`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowNewFileDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateFile} disabled={!fileOperationName.trim()}>
              Create
            </Button>
          </>
        }
      >
        <Input
          value={fileOperationName}
          onChange={(e) => setFileOperationName(e.target.value)}
          placeholder={fileOperationType === 'folder' ? 'src/components' : 'src/index.js'}
          autoFocus
        />
      </Dialog>

      {/* Rename dialog */}
      <Dialog
        open={showRenameDialog}
        onClose={() => setShowRenameDialog(false)}
        title="Rename file"
        description="Enter the new path"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameFile} disabled={!fileOperationName.trim()}>
              Rename
            </Button>
          </>
        }
      >
        <Input
          value={fileOperationName}
          onChange={(e) => setFileOperationName(e.target.value)}
          placeholder="New path"
          autoFocus
        />
      </Dialog>

      {/* Delete confirm */}
      <ConfirmDialog
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleDeleteFile}
        title="Delete file?"
        description={`Are you sure you want to delete "${activeFile?.path}"? This cannot be undone.`}
        confirmLabel="Delete"
      />

      {/* Settings dialog */}
      <Dialog
        open={showSettingsDialog}
        onClose={() => setShowSettingsDialog(false)}
        title="Project settings"
        description="Update project name and description"
        footer={
          <>
            <Button variant="ghost" onClick={() => setShowSettingsDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings}>
              Save
            </Button>
          </>
        }
      >
        <Input
          label="Project name"
          value={settingsName}
          onChange={(e) => setSettingsName(e.target.value)}
          autoFocus
        />
        <Input
          label="Description"
          value={settingsDescription}
          onChange={(e) => setSettingsDescription(e.target.value)}
        />
      </Dialog>

      {/* Conflict resolution dialog */}
      <Dialog
        open={conflictDialogOpen}
        onClose={() => setConflictDialogOpen(false)}
        title="Resolve Sync Conflicts"
        description="Some files were changed both locally and on GitHub. Choose which version to keep for each file."
        size="lg"
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {conflicts.map((c) => (
            <div key={c.path} className="border border-border rounded-lg p-4 bg-surface">
              <div className="flex items-start gap-3 mb-2">
                <div className="flex-shrink-0">
                  <Code2 className="w-4 h-4 text-secondary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{c.path}</p>
                  <p className="text-xs text-muted">
                    Base: {c.base ? 'available' : 'none'} · Ours (local): {c.ours ? c.ours.length : 0} chars · Theirs (remote): {c.theirs ? c.theirs.length : 0} chars
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="border border-border rounded p-3">
                  <p className="text-xs font-semibold text-accent mb-2">Ours (local)</p>
                  <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap break-words">{c.ours}</pre>
                </div>
                <div className="border border-border rounded p-3">
                  <p className="text-xs font-semibold text-secondary mb-2">Theirs (remote)</p>
                  <pre className="text-[10px] font-mono text-foreground/70 whitespace-pre-wrap break-words">{c.theirs}</pre>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(c.path, 'ours')}
                  disabled={busy === 'resolve'}
                >
                  Keep local
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleResolveConflict(c.path, 'theirs')}
                  disabled={busy === 'resolve'}
                >
                  Keep remote
                </Button>
              </div>
            </div>
          ))}
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setConflictDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const allResolved = conflicts.every((c) => c.resolution !== null)
              if (!allResolved) {
                setError('Please resolve all conflicts before continuing.')
                return
              }
              const unresolved = conflicts.filter((c) => c.resolution === null)
              const next = unresolved[0]
              if (next) {
                handleResolveConflict(next.path, next.resolution || 'ours')
              } else {
                setConflictDialogOpen(false)
              }
            }}
            disabled={busy === 'resolve'}
          >
            {busy === 'resolve' ? 'Resolving…' : 'Resolve Selected'}
          </Button>
        </div>
      </Dialog>

      {/* Publish dialog */}
      <Dialog
        open={publishDialogOpen}
        onClose={() => { setPublishDialogOpen(false); setPublishMode('publish') }}
        title={publishMode === 'republish' ? 'Republish Project' : 'Publish Project'}
        description={publishMode === 'republish'
          ? 'Create a new snapshot from your current draft and redeploy it.'
          : 'Create an immutable snapshot and deploy it to a public URL.'}
        footer={
          <>
            <Button variant="ghost" onClick={() => { setPublishDialogOpen(false); setPublishMode('publish') }}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (publishMode === 'republish') {
                  handleRepublishProject()
                } else {
                  handlePublishProject()
                }
              }}
              disabled={deployLoading || !publishCommitMessage.trim()}
            >
              {deployLoading ? (publishMode === 'republish' ? 'Republishing…' : 'Publishing…') : (publishMode === 'republish' ? 'Republish' : 'Publish')}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="label">Commit message (optional)</label>
          <Input
            value={publishCommitMessage}
            onChange={(e) => setPublishCommitMessage(e.target.value)}
            placeholder="e.g. Release v1.0.0"
            autoFocus
          />
          <p className="text-xs text-muted">
            A snapshot of your current draft will be built and deployed. The
            draft remains editable after publishing.
          </p>
        </div>
      </Dialog>

      {/* Rollback dialog */}
      <Dialog
        open={rollbackDialogOpen}
        onClose={() => setRollbackDialogOpen(false)}
        title="Rollback Deployment"
        description="Restore a previous published version."
        footer={
          <>
            <Button variant="ghost" onClick={() => setRollbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRollbackProject}
              disabled={deployLoading || !rollbackVersionId}
            >
              {deployLoading ? 'Rolling back…' : 'Rollback'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <label className="label">Select version to restore</label>
          <select
            value={rollbackVersionId}
            onChange={(e) => {
              const ver = deployHistory.find((d) => d.versionId === e.target.value)
              setRollbackVersionId(e.target.value)
              setRollbackVersionLabel(ver?.version.label || '')
            }}
            className="input w-full text-sm"
          >
            <option value="">Select a version</option>
            {deployHistory.map((d) => (
              <option key={d.versionId} value={d.versionId}>
                {d.version.label || d.versionId.slice(0, 8)} — {new Date(d.createdAt).toLocaleDateString()}
              </option>
            ))}
          </select>
        </div>
      </Dialog>
    </div>
  )
}

function getLanguage(path) {
  const ext = path.split('.').pop()
  const langs = {
    js: 'javascript',
    jsx: 'javascript',
    ts: 'typescript',
    tsx: 'typescript',
    json: 'json',
    html: 'html',
    css: 'css',
    scss: 'scss',
    md: 'markdown',
    py: 'python',
    go: 'go',
    rs: 'rust',
    java: 'java',
    c: 'c',
    cpp: 'cpp',
    sh: 'shell',
    yml: 'yaml',
    yaml: 'yaml',
  }
  return langs[ext] || 'plaintext'
}

export default WorkspacePage